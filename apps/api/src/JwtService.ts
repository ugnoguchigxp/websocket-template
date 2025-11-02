import { createPublicKey, type KeyObject, type JsonWebKey as NodeJsonWebKey } from "crypto";
import jwt, { type JwtHeader, type JwtPayload } from "jsonwebtoken";
import { logger } from "./modules/logger/core/logger.js";

type DiscoveryDocument = {
	issuer: string;
	jwks_uri: string;
	token_endpoint: string;
	userinfo_endpoint?: string;
	revocation_endpoint?: string;
};

export type AccessTokenClaims = JwtPayload & {
	sub: string;
};

export type IdTokenClaims = JwtPayload & {
	sub: string;
	email?: string;
	email_verified?: boolean;
	preferred_username?: string;
	name?: string;
	given_name?: string;
	family_name?: string;
	picture?: string;
};

export type TokenExchangeResult = {
	accessToken: string;
	accessTokenExpiresAt: Date;
	refreshToken?: string;
	refreshTokenExpiresAt?: Date;
	scope?: string;
	tokenType: string;
	accessTokenClaims: AccessTokenClaims;
	idToken?: string;
	idTokenClaims?: IdTokenClaims;
};

export type TokenRefreshResult = {
	accessToken: string;
	accessTokenExpiresAt: Date;
	refreshToken?: string;
	refreshTokenExpiresAt?: Date;
	scope?: string;
	tokenType: string;
	accessTokenClaims: AccessTokenClaims;
	idToken?: string;
	idTokenClaims?: IdTokenClaims;
};

type JwkCacheEntry = {
	key: KeyObject;
	expiresAt: number;
};

type DiscoveryCacheEntry = {
	document: DiscoveryDocument;
	expiresAt: number;
};

export type JwtServiceOptions = {
	issuer: string;
	clientId: string;
	redirectUri: string;
	audience?: string;
	clientSecret?: string;
	jwksUriOverride?: string;
	tokenEndpointOverride?: string;
	userinfoEndpointOverride?: string;
	revocationEndpointOverride?: string;
	defaultRefreshTokenTtlSeconds?: number;
	jwksTtlSeconds?: number;
	discoveryTtlSeconds?: number;
};

function isJwtPayload(payload: string | JwtPayload): payload is JwtPayload {
	return typeof payload === "object" && payload !== null;
}

function toDate(secondsFromNow: number | undefined, defaultSeconds: number): Date {
	const seconds = typeof secondsFromNow === "number" && Number.isFinite(secondsFromNow)
		? secondsFromNow
		: defaultSeconds;
	return new Date(Date.now() + seconds * 1000);
}

async function parseJson<T>(response: Response): Promise<T> {
	const text = await response.text();
	try {
		return JSON.parse(text) as T;
	} catch (error) {
		logger.error("Failed to parse JSON response from OIDC provider", {
			status: response.status,
			body: text,
		});
		throw new Error("Failed to parse response from OIDC provider");
	}
}

export class JwtService {
	private readonly tokenEndpointOverride?: string;
	private readonly jwksUriOverride?: string;
	private readonly userinfoEndpointOverride?: string;
	private readonly revocationEndpointOverride?: string;
	private readonly defaultRefreshTokenTtlSeconds: number;
	private readonly jwksTtlMs: number;
	private readonly discoveryTtlMs: number;
	private readonly jwtSecret: string;

	private discoveryCache: DiscoveryCacheEntry | null = null;
	private jwksCache = new Map<string, JwkCacheEntry>();

	constructor(private readonly options: JwtServiceOptions) {
		if (!options.issuer) {
			throw new Error("OIDC issuer must be provided");
		}
		if (!options.clientId) {
			throw new Error("OIDC client ID must be provided");
		}
		if (!options.redirectUri) {
			throw new Error("OIDC redirect URI must be provided");
		}

		// Validate and cache JWT_SECRET for local authentication
		const secret = process.env.JWT_SECRET;
		if (!secret) {
			throw new Error("JWT_SECRET environment variable is not set");
		}
		this.jwtSecret = secret;

		this.tokenEndpointOverride = options.tokenEndpointOverride;
		this.jwksUriOverride = options.jwksUriOverride;
		this.userinfoEndpointOverride = options.userinfoEndpointOverride;
		this.revocationEndpointOverride = options.revocationEndpointOverride;
		this.defaultRefreshTokenTtlSeconds = options.defaultRefreshTokenTtlSeconds ?? 86400; // 1 day
		this.jwksTtlMs = (options.jwksTtlSeconds ?? 600) * 1000;
		this.discoveryTtlMs = (options.discoveryTtlSeconds ?? 600) * 1000;
	}

	private async fetchDiscoveryDocument(): Promise<DiscoveryDocument> {
		if (this.discoveryCache && this.discoveryCache.expiresAt > Date.now()) {
			return this.discoveryCache.document;
		}

		const discoveryUrl = new URL(
			".well-known/openid-configuration",
			this.options.issuer.endsWith("/") ? this.options.issuer : `${this.options.issuer}/`
		).toString();

		logger.debug("Fetching OIDC discovery document", { discoveryUrl });

		const response = await fetch(discoveryUrl);
		if (!response.ok) {
			logger.error("Failed to fetch OIDC discovery document", {
				status: response.status,
				statusText: response.statusText,
			});
			throw new Error("Failed to fetch OIDC discovery document");
		}

		const document = await parseJson<DiscoveryDocument>(response);

		this.discoveryCache = {
			document,
			expiresAt: Date.now() + this.discoveryTtlMs,
		};

		return document;
	}

	private async resolveTokenEndpoint(): Promise<string> {
		if (this.tokenEndpointOverride) {
			return this.tokenEndpointOverride;
		}
		const discovery = await this.fetchDiscoveryDocument();
		if (!discovery.token_endpoint) {
			throw new Error("OIDC discovery document is missing token_endpoint");
		}
		return discovery.token_endpoint;
	}

	private async resolveRevocationEndpoint(): Promise<string | null> {
		if (this.revocationEndpointOverride) {
			return this.revocationEndpointOverride;
		}
		const discovery = await this.fetchDiscoveryDocument();
		return discovery.revocation_endpoint ?? null;
	}

	private async resolveUserinfoEndpoint(): Promise<string | null> {
		if (this.userinfoEndpointOverride) {
			return this.userinfoEndpointOverride;
		}
		const discovery = await this.fetchDiscoveryDocument();
		return discovery.userinfo_endpoint ?? null;
	}

	private async resolveJwksUri(): Promise<string> {
		if (this.jwksUriOverride) {
			return this.jwksUriOverride;
		}
		const discovery = await this.fetchDiscoveryDocument();
		if (!discovery.jwks_uri) {
			throw new Error("OIDC discovery document is missing jwks_uri");
		}
		return discovery.jwks_uri;
	}

	private async fetchJwks(): Promise<Map<string, JwkCacheEntry>> {
		// Purge expired cache entries
		const now = Date.now();
		for (const [kid, entry] of this.jwksCache.entries()) {
			if (entry.expiresAt <= now) {
				this.jwksCache.delete(kid);
			}
		}

		if (this.jwksCache.size > 0) {
			return this.jwksCache;
		}

		const jwksUri = await this.resolveJwksUri();
		logger.debug("Fetching JWKS", { jwksUri });

		const response = await fetch(jwksUri);
		if (!response.ok) {
			logger.error("Failed to fetch JWKS", {
				status: response.status,
				statusText: response.statusText,
			});
			throw new Error("Failed to fetch JWKS");
		}

		const { keys } = await parseJson<{ keys: JwkWithKid[] }>(response);
		if (!Array.isArray(keys)) {
			throw new Error("Invalid JWKS payload");
		}

		const expiresAt = Date.now() + this.jwksTtlMs;
		for (const jwk of keys) {
			const kid = jwk.kid;
			if (!kid) {
				continue;
			}
			try {
				const key = createPublicKey({ format: "jwk", key: jwk as NodeJsonWebKey });
				this.jwksCache.set(kid, { key, expiresAt });
			} catch (error) {
				logger.warn("Failed to convert JWK to public key", {
					kid,
					error: error instanceof Error ? error.message : String(error),
				});
			}
		}

		return this.jwksCache;
	}

	private async getSigningKey(kid: string): Promise<KeyObject> {
		const cache = await this.fetchJwks();
		const cachedKey = cache.get(kid);
		if (cachedKey) {
			return cachedKey.key;
		}

		// Cache miss: force refetch once
		this.jwksCache.clear();
		const refreshed = await this.fetchJwks();
		const refreshedKey = refreshed.get(kid);
		if (!refreshedKey) {
			throw new Error(`No JWKS key found for kid=${kid}`);
		}
		return refreshedKey.key;
	}

	private getVerifyOptions(): jwt.VerifyOptions {
		const options: jwt.VerifyOptions = {
			algorithms: ["RS256", "RS384", "RS512", "PS256", "PS384", "PS512", "ES256", "ES384", "ES512"],
			clockTolerance: 5,
			issuer: this.options.issuer,
		};
		if (this.options.audience) {
			options.audience = this.options.audience;
		}
		return options;
	}

	private decodeHeader(token: string): JwtHeader {
		const decoded = jwt.decode(token, { complete: true });
		if (!decoded || typeof decoded === "string") {
			throw new Error("Invalid JWT: missing header");
		}
		return decoded.header;
	}

	private async verifyWithKey<T extends JwtPayload>(token: string): Promise<T> {
		const header = this.decodeHeader(token);
		
		// Check if this is a local token (HS256) or OIDC token (RS256, etc.)
		if (header.alg === "HS256") {
			// Local authentication token - verify with JWT_SECRET (cached)
			const payload = jwt.verify(token, this.jwtSecret, {
				algorithms: ["HS256"],
				clockTolerance: 5,
			});
			
			if (!isJwtPayload(payload)) {
				throw new Error("JWT payload is not an object");
			}
			return payload as T;
		}
		
		// OIDC token - verify with JWKS
		if (!header.kid) {
			throw new Error("JWT header missing kid");
		}
		const key = await this.getSigningKey(header.kid);
		const payload = jwt.verify(token, key, this.getVerifyOptions());
		if (!isJwtPayload(payload)) {
			throw new Error("JWT payload is not an object");
		}
		return payload as T;
	}

	async verifyAccessToken(token: string): Promise<AccessTokenClaims | null> {
		try {
			const payload = await this.verifyWithKey<AccessTokenClaims>(token);
			if (!payload.sub) {
				throw new Error("Access token payload missing sub");
			}
			return payload;
		} catch (error) {
			logger.warn("Access token verification failed", {
				error: error instanceof Error ? error.message : String(error),
			});
			return null;
		}
	}

	signAccessToken(claims: AccessTokenClaims): string {
		return jwt.sign(claims, this.jwtSecret, {
			algorithm: "HS256",
		});
	}

	async verifyIdToken(token: string): Promise<IdTokenClaims | null> {
		try {
			const payload = await this.verifyWithKey<IdTokenClaims>(token);
			if (!payload.sub) {
				throw new Error("ID token payload missing sub");
			}
			return payload;
		} catch (error) {
			logger.warn("ID token verification failed", {
				error: error instanceof Error ? error.message : String(error),
			});
			return null;
		}
	}

	private buildTokenRequestBody(
		params: Record<string, string | undefined>
	): URLSearchParams {
		const body = new URLSearchParams();
		for (const [key, value] of Object.entries(params)) {
			if (value === undefined) {
				continue;
			}
			body.set(key, value);
		}
		return body;
	}

	private async fetchTokenEndpoint(
		body: URLSearchParams
	): Promise<{
		access_token: string;
		token_type: string;
		expires_in?: number;
		scope?: string;
		refresh_token?: string;
		refresh_token_expires_in?: number;
		ext_expires_in?: number;
		id_token?: string;
	}> {
		const tokenEndpoint = await this.resolveTokenEndpoint();
		const response = await fetch(tokenEndpoint, {
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
			},
			body,
		});

		if (!response.ok) {
			const errorBody = await response.text();
			logger.error("OIDC token endpoint request failed", {
				status: response.status,
				statusText: response.statusText,
				body: errorBody,
			});
			throw new Error("OIDC token endpoint request failed");
		}

		return parseJson(response);
	}

	async exchangeAuthorizationCode(input: {
		code: string;
		codeVerifier: string;
		redirectUri?: string;
	}): Promise<TokenExchangeResult> {
		const redirectUri = input.redirectUri ?? this.options.redirectUri;
		const body = this.buildTokenRequestBody({
			grant_type: "authorization_code",
			client_id: this.options.clientId,
			code: input.code,
			redirect_uri: redirectUri,
			code_verifier: input.codeVerifier,
			client_secret: this.options.clientSecret,
		});

		const tokenResponse = await this.fetchTokenEndpoint(body);

		if (!tokenResponse.access_token || !tokenResponse.token_type) {
			throw new Error("OIDC token endpoint returned an invalid payload");
		}

		const accessTokenClaims =
			(await this.verifyAccessToken(tokenResponse.access_token)) ??
			(() => {
				throw new Error("Received invalid access token from IdP");
			})();

		const accessTokenExpiresAt = toDate(tokenResponse.expires_in, 900);
		const refreshTokenExpiresAt = tokenResponse.refresh_token
			? toDate(
					tokenResponse.refresh_token_expires_in ?? tokenResponse.ext_expires_in,
					this.defaultRefreshTokenTtlSeconds
				)
			: undefined;

		let idTokenClaims: IdTokenClaims | undefined;
		if (tokenResponse.id_token) {
			idTokenClaims = await this.verifyIdToken(tokenResponse.id_token) ?? undefined;
		}

		return {
			accessToken: tokenResponse.access_token,
			accessTokenExpiresAt,
			refreshToken: tokenResponse.refresh_token,
			refreshTokenExpiresAt,
			scope: tokenResponse.scope,
			tokenType: tokenResponse.token_type,
			accessTokenClaims,
			idToken: tokenResponse.id_token,
			idTokenClaims,
		};
	}

	async refreshAccessToken(refreshToken: string): Promise<TokenRefreshResult> {
		const body = this.buildTokenRequestBody({
			grant_type: "refresh_token",
			client_id: this.options.clientId,
			refresh_token: refreshToken,
			client_secret: this.options.clientSecret,
		});

		const tokenResponse = await this.fetchTokenEndpoint(body);

		if (!tokenResponse.access_token || !tokenResponse.token_type) {
			throw new Error("OIDC refresh response missing access token");
		}

		const accessTokenClaims =
			(await this.verifyAccessToken(tokenResponse.access_token)) ??
			(() => {
				throw new Error("Received invalid access token from IdP");
			})();

		const accessTokenExpiresAt = toDate(tokenResponse.expires_in, 900);
		const refreshTokenExpiresAt = tokenResponse.refresh_token
			? toDate(
					tokenResponse.refresh_token_expires_in ?? tokenResponse.ext_expires_in,
					this.defaultRefreshTokenTtlSeconds
				)
			: undefined;

		let idTokenClaims: IdTokenClaims | undefined;
		if (tokenResponse.id_token) {
			idTokenClaims = await this.verifyIdToken(tokenResponse.id_token) ?? undefined;
		}

		return {
			accessToken: tokenResponse.access_token,
			accessTokenExpiresAt,
			refreshToken: tokenResponse.refresh_token,
			refreshTokenExpiresAt,
			scope: tokenResponse.scope,
			tokenType: tokenResponse.token_type,
			accessTokenClaims,
			idToken: tokenResponse.id_token,
			idTokenClaims,
		};
	}

	async revokeRefreshToken(refreshToken: string): Promise<void> {
		const revocationEndpoint = await this.resolveRevocationEndpoint();
		if (!revocationEndpoint) {
			logger.debug("OIDC revocation endpoint not available; skipping revocation");
			return;
		}

		const body = this.buildTokenRequestBody({
			token: refreshToken,
			token_type_hint: "refresh_token",
			client_id: this.options.clientId,
			client_secret: this.options.clientSecret,
		});

		const response = await fetch(revocationEndpoint, {
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
			},
			body,
		});

		if (!response.ok) {
			logger.warn("OIDC revocation endpoint request failed", {
				status: response.status,
				statusText: response.statusText,
			});
		}
	}

	async fetchUserInfo(accessToken: string): Promise<Record<string, unknown> | null> {
		const userinfoEndpoint = await this.resolveUserinfoEndpoint();
		if (!userinfoEndpoint) {
			return null;
		}

		const response = await fetch(userinfoEndpoint, {
			method: "GET",
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
		});

		if (!response.ok) {
			logger.warn("Failed to fetch userinfo from OIDC provider", {
				status: response.status,
				statusText: response.statusText,
			});
			return null;
		}

		return parseJson<Record<string, unknown>>(response);
	}
}
type JwkWithKid = NodeJsonWebKey & { kid?: string };
