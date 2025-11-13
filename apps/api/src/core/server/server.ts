import "reflect-metadata";
import { randomBytes, randomUUID } from "crypto";
import * as fs from "fs";
import type { IncomingMessage, ServerResponse } from "http";
import * as http from "http";
import * as https from "https";
import { URL } from "url";
import type { Prisma, PrismaClient, RefreshToken, User } from "@prisma/client";
import { applyWSSHandler } from "@trpc/server/adapters/ws";
import argon2 from "argon2";
import { inject, injectable } from "tsyringe";
import type { WebSocket } from "ws";
import { WebSocketServer } from "ws";
import { z } from "zod";
import { ChatDispatcher } from "../../modules/chat/dispatcher.js";
import { logger } from "../../modules/logger/core/logger.js";
import type { Context, ContextUser } from "../../routers/index.js";
import { monitoring } from "../../utils/monitoring.js";
import { RateLimitPresets } from "../../utils/rateLimiter.js";
import { sanitizeText } from "../../utils/sanitize.js";
import type { AccessTokenClaims, IdTokenClaims } from "../auth/index.js";
import { JwtService } from "../auth/index.js";

// Extend WebSocket type to include isAlive property
interface ExtendedWebSocket extends WebSocket {
	isAlive?: boolean;
}

// WebSocket configuration constants
const _IDLE_TIMEOUT_AUTHENTICATED_MS = 30 * 60 * 1000; // 30 minutes
const _IDLE_TIMEOUT_UNAUTHENTICATED_MS = 5 * 60 * 1000; // 5 minutes
const HEARTBEAT_INTERVAL_MS = 30_000; // 30 seconds

@injectable()
export class ServerApp {
	private readonly refreshCookieName = process.env.OIDC_REFRESH_COOKIE_NAME || "refresh_session";
	private readonly refreshCookiePath = process.env.OIDC_REFRESH_COOKIE_PATH || "/";
	private readonly refreshCookieDomain = process.env.OIDC_REFRESH_COOKIE_DOMAIN;
	private readonly refreshCookieSecure: boolean;
	private readonly refreshCookieSameSite: "Strict" | "Lax" | "None";
	private chatDispatcher: ChatDispatcher;
	private readonly maxAuthBodyBytes = Number.parseInt(
		process.env.OIDC_MAX_AUTH_BODY_BYTES || "1048576",
		10
	);

	constructor(
		@inject("PrismaClient") private prisma: PrismaClient,
		@inject(JwtService) private jwtService: JwtService
	) {
		this.chatDispatcher = new ChatDispatcher();

		// Register services for monitoring
		monitoring.registerService("websocket_server");
		monitoring.registerService("chat_dispatcher");
		monitoring.registerService("trpc_handler");

		logger.info("[ServerApp] Monitoring initialized with services registered");

		this.refreshCookieSecure =
			process.env.OIDC_REFRESH_COOKIE_SECURE?.toLowerCase() !== "false"
				? true
				: process.env.NODE_ENV === "production";

		this.refreshCookieSameSite = this.resolveSameSite(process.env.OIDC_REFRESH_COOKIE_SAMESITE);

		if (this.refreshCookieSameSite === "None" && !this.refreshCookieSecure) {
			logger.warn(
				"SameSite=None requires Secure cookies; enabling Secure flag automatically for refresh cookie"
			);
			this.refreshCookieSecure = true;
		}
	}

	/**
	 * Extract JWT token from WebSocket request headers or URL query parameter
	 */
	private extractToken(req: IncomingMessage): string {
		// Extract from Authorization header (standard method)
		const authHeader = req.headers.authorization;
		if (authHeader) {
			const match = /^Bearer\s+(.+)$/i.exec(authHeader);
			if (match?.[1]) {
				return match[1];
			}
		}

		// Extract from subprotocol header (WebSocket-specific)
		const protocols = req.headers["sec-websocket-protocol"];
		if (protocols) {
			const parts = protocols.split(",").map((p: string) => p.trim());
			if (parts[0] === "bearer" && parts[1]) {
				return parts[1];
			}
		}

		// Extract from URL query parameter (WebSocket upgrade request)
		try {
			const host = req.headers.host ?? "localhost";
			const url = new URL(req.url || "", `http://${host}`);
			const authParam = url.searchParams.get("authorization");
			if (authParam) {
				const match = /^Bearer\s+(.+)$/i.exec(authParam);
				if (match?.[1]) {
					// すぐに削除してログに残らないようにする
					return match[1];
				}
			}
			// 後方互換性のため、tokenパラメータもチェック
			return url.searchParams.get("token") ?? "";
		} catch {
			return "";
		}
	}

	private resolveSameSite(value?: string | null): "Strict" | "Lax" | "None" {
		const normalized = (value ?? "").toLowerCase();
		switch (normalized) {
			case "strict":
				return "Strict";
			case "none":
				return "None";
			default:
				return "Lax";
		}
	}

	private applyCors(
		res: ServerResponse,
		origin: string | undefined,
		allowedOrigin: string
	): boolean {
		res.setHeader("Vary", "Origin");
		res.setHeader("Access-Control-Allow-Credentials", "true");
		res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
		res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");

		if (allowedOrigin === "*") {
			res.setHeader("Access-Control-Allow-Origin", origin ?? "*");
			return true;
		}

		if (origin && origin !== allowedOrigin) {
			this.sendJson(res, 403, { error: "Origin not allowed" });
			return false;
		}

		res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
		return true;
	}

	private handleOptions(res: ServerResponse) {
		res.statusCode = 204;
		res.end();
	}

	private sendJson(res: ServerResponse, status: number, payload: unknown) {
		if (!res.headersSent) {
			res.statusCode = status;
			res.setHeader("Content-Type", "application/json");
		}
		res.end(JSON.stringify(payload));
	}

	private parseCookies(req: IncomingMessage): Record<string, string> {
		const header = req.headers.cookie;
		if (!header) {
			return {};
		}
		const out: Record<string, string> = {};
		const cookies = header.split(";");
		for (const cookie of cookies) {
			const [rawName, ...rest] = cookie.trim().split("=");
			if (!rawName) continue;
			const value = rest.join("=") ?? "";
			out[rawName] = decodeURIComponent(value);
		}
		return out;
	}

	private appendSetCookie(res: ServerResponse, value: string) {
		const existing = res.getHeader("Set-Cookie");
		if (!existing) {
			res.setHeader("Set-Cookie", value);
		} else if (Array.isArray(existing)) {
			res.setHeader("Set-Cookie", [...existing, value]);
		} else {
			res.setHeader("Set-Cookie", [existing.toString(), value]);
		}
	}

	private setRefreshCookie(res: ServerResponse, sessionId: string, expiresAt: Date) {
		const maxAgeSeconds = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
		const parts = [
			`${this.refreshCookieName}=${encodeURIComponent(sessionId)}`,
			`Path=${this.refreshCookiePath}`,
			`Max-Age=${maxAgeSeconds}`,
			`Expires=${expiresAt.toUTCString()}`,
			`SameSite=${this.refreshCookieSameSite}`,
			"HttpOnly",
		];
		if (this.refreshCookieSecure) {
			parts.push("Secure");
		}
		if (this.refreshCookieDomain) {
			parts.push(`Domain=${this.refreshCookieDomain}`);
		}
		this.appendSetCookie(res, parts.join("; "));
	}

	private clearRefreshCookie(res: ServerResponse) {
		const expires = new Date(0);
		const parts = [
			`${this.refreshCookieName}=`,
			`Path=${this.refreshCookiePath}`,
			"Max-Age=0",
			`Expires=${expires.toUTCString()}`,
			`SameSite=${this.refreshCookieSameSite}`,
			"HttpOnly",
		];
		if (this.refreshCookieSecure) {
			parts.push("Secure");
		}
		if (this.refreshCookieDomain) {
			parts.push(`Domain=${this.refreshCookieDomain}`);
		}
		this.appendSetCookie(res, parts.join("; "));
	}

	private async readJsonBody<T>(req: IncomingMessage): Promise<T> {
		const chunks: Uint8Array[] = [];
		let received = 0;

		for await (const chunk of req) {
			const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
			received += buffer.length;
			if (received > this.maxAuthBodyBytes) {
				throw new Error("Request body too large");
			}
			chunks.push(buffer);
		}

		const raw = Buffer.concat(chunks).toString("utf8").trim();
		if (!raw) {
			return {} as T;
		}
		try {
			return JSON.parse(raw) as T;
		} catch (_error) {
			throw new Error("Invalid JSON payload");
		}
	}

	private sanitizeUsernameCandidate(candidate: string | undefined | null): string | null {
		if (!candidate) {
			return null;
		}
		const sanitized = candidate
			.trim()
			.replace(/[^A-Za-z0-9._-]/g, "_")
			.replace(/_+/g, "_")
			.replace(/\._+/g, ".")
			.replace(/_+\./g, ".")
			.replace(/_{2,}/g, "_")
			.slice(0, 50);

		const cleaned = sanitized.replace(/^[_\.]+|[_\.]+$/g, "");
		return cleaned.length > 2 ? cleaned : null;
	}

	private async ensureUniqueUsername(base: string): Promise<string> {
		let candidate = base;
		let attempt = 1;
		while (true) {
			const existing = await this.prisma.user.findUnique({ where: { username: candidate } });
			if (!existing) {
				return candidate;
			}
			const suffix = `-${attempt}`;
			const trimmed = base.slice(0, Math.max(1, 50 - suffix.length));
			candidate = `${trimmed}${suffix}`;
			attempt += 1;
			if (attempt > 1000) {
				const fallback = `user-${randomUUID().replace(/-/g, "").slice(0, 8)}`;
				return fallback;
			}
		}
	}

	private async generateUsername(
		claims: AccessTokenClaims,
		idTokenClaims?: IdTokenClaims | null
	): Promise<string> {
		const candidates: Array<string | undefined | null> = [
			idTokenClaims?.preferred_username ?? null,
			(claims as Record<string, unknown>).preferred_username as string | undefined,
			idTokenClaims?.email ? idTokenClaims.email.split("@")[0] : null,
			typeof (claims as Record<string, unknown>).email === "string"
				? ((claims as Record<string, string>).email ?? "").split("@")[0]
				: null,
			claims.sub.replace(/[^A-Za-z0-9]/g, ""),
		];

		for (const candidate of candidates) {
			const sanitized = this.sanitizeUsernameCandidate(candidate ?? undefined);
			if (!sanitized) continue;
			return this.ensureUniqueUsername(sanitized);
		}

		return this.ensureUniqueUsername(`user-${randomUUID().slice(0, 8)}`);
	}

	private extractEmail(
		claims: AccessTokenClaims,
		idTokenClaims?: IdTokenClaims | null
	): string | null {
		const claimEmail =
			typeof (claims as Record<string, unknown>).email === "string"
				? ((claims as Record<string, string>).email as string)
				: null;
		const idEmail = idTokenClaims?.email ?? null;
		return idEmail ?? claimEmail;
	}

	private extractDisplayName(
		claims: AccessTokenClaims,
		idTokenClaims?: IdTokenClaims | null
	): string | null {
		const nameField =
			typeof (claims as Record<string, unknown>).name === "string"
				? ((claims as Record<string, string>).name as string)
				: null;
		return idTokenClaims?.name ?? nameField;
	}

	private async provisionUser(
		claims: AccessTokenClaims,
		idTokenClaims?: IdTokenClaims | null
	): Promise<User> {
		const existing = await this.prisma.user.findFirst({
			where: { externalId: claims.sub },
		});

		const email = this.extractEmail(claims, idTokenClaims);
		const displayName = this.extractDisplayName(claims, idTokenClaims);

		if (existing) {
			return this.updateUserProfile(existing, email, displayName);
		}

		const username = await this.generateUsername(claims, idTokenClaims);
		const passwordHash = await argon2.hash(randomBytes(32).toString("hex"));

		return this.prisma.user.create({
			data: {
				externalId: claims.sub,
				username,
				passwordHash,
				email: email ?? undefined,
				displayName: displayName ?? undefined,
			},
		});
	}

	private async updateUserProfile(
		user: User,
		email: string | null,
		displayName: string | null
	): Promise<User> {
		const data: Prisma.UserUpdateInput = {};
		if (email !== null && email !== user.email) {
			data.email = email;
		}
		if (displayName !== null && displayName !== user.displayName) {
			data.displayName = displayName;
		}
		if (Object.keys(data).length === 0) {
			return user;
		}
		return this.prisma.user.update({
			where: { id: user.id },
			data,
		});
	}

	private extractRoles(claims: AccessTokenClaims, idTokenClaims?: IdTokenClaims | null): string[] {
		const roles = new Set<string>();

		const collect = (value: unknown) => {
			if (!value) return;
			if (Array.isArray(value)) {
				for (const item of value) {
					if (typeof item === "string" && item) roles.add(item);
				}
			} else if (typeof value === "string" && value) {
				for (const item of value.split(" ")) {
					if (item) roles.add(item);
				}
			}
		};

		collect((claims as Record<string, unknown>).roles);
		const realmAccess = (claims as Record<string, unknown>).realm_access as
			| { roles?: string[] }
			| undefined;
		if (realmAccess && Array.isArray(realmAccess.roles)) {
			collect(realmAccess.roles);
		}
		collect((claims as Record<string, unknown>)["cognito:groups"]);
		collect(idTokenClaims?.roles);

		return Array.from(roles);
	}

	private buildContextUser(
		user: User,
		claims: AccessTokenClaims,
		idTokenClaims?: IdTokenClaims | null
	): ContextUser {
		const email = this.extractEmail(claims, idTokenClaims) ?? user.email ?? null;
		const preferredUsername =
			idTokenClaims?.preferred_username ??
			((claims as Record<string, unknown>).preferred_username as string | undefined) ??
			null;
		const name = this.extractDisplayName(claims, idTokenClaims) ?? user.displayName ?? null;

		return {
			sub: claims.sub,
			localUserId: user.id,
			roles: this.extractRoles(claims, idTokenClaims),
			email,
			preferredUsername,
			name,
			claims,
		};
	}

	private async persistRefreshSession(
		userId: number,
		refreshToken: string,
		expiresAt: Date,
		tokenType: "local" | "oidc" = "local"
	): Promise<{ sessionId: string; expiresAt: Date }> {
		const sessionId = randomUUID();
		await this.prisma.refreshToken.create({
			data: {
				userId,
				token: refreshToken,
				expiresAt,
				jti: sessionId,
				tokenType,
			},
		});
		return { sessionId, expiresAt };
	}

	private async findRefreshSession(sessionId: string): Promise<RefreshToken | null> {
		return this.prisma.refreshToken.findUnique({
			where: { jti: sessionId },
		});
	}

	private async deleteRefreshSession(sessionId: string): Promise<void> {
		await this.prisma.refreshToken.deleteMany({
			where: { jti: sessionId },
		});
	}

	private async handleAuthExchange(req: IncomingMessage, res: ServerResponse) {
		try {
			const body = await this.readJsonBody<unknown>(req);
			const schema = z.object({
				code: z.string().min(1),
				codeVerifier: z.string().min(1),
				redirectUri: z.string().url().optional(),
				state: z.string().optional(),
			});
			const input = schema.parse(body);

			const tokens = await this.jwtService.exchangeAuthorizationCode({
				code: input.code,
				codeVerifier: input.codeVerifier,
				redirectUri: input.redirectUri,
			});

			if (!tokens.refreshToken || !tokens.refreshTokenExpiresAt) {
				logger.error("OIDC exchange response missing refresh token");
				this.sendJson(res, 502, { error: "Identity provider did not return a refresh token" });
				return;
			}

			const user = await this.provisionUser(tokens.accessTokenClaims, tokens.idTokenClaims);
			const contextUser = this.buildContextUser(
				user,
				tokens.accessTokenClaims,
				tokens.idTokenClaims
			);
			const { sessionId, expiresAt } = await this.persistRefreshSession(
				user.id,
				tokens.refreshToken,
				tokens.refreshTokenExpiresAt,
				"oidc"
			);

			this.setRefreshCookie(res, sessionId, expiresAt);

			this.sendJson(res, 200, {
				accessToken: tokens.accessToken,
				accessTokenExpiresAt: tokens.accessTokenExpiresAt.toISOString(),
				scope: tokens.scope ?? null,
				user: {
					id: user.id,
					username: user.username,
					role: user.role,
					email: user.email ?? null,
					displayName: user.displayName ?? null,
					sub: contextUser.sub,
					preferredUsername: contextUser.preferredUsername ?? null,
					name: contextUser.name ?? null,
					roles: contextUser.roles,
				},
			});
		} catch (error) {
			if (error instanceof z.ZodError) {
				this.sendJson(res, 400, { error: "Invalid request", details: error.errors });
				return;
			}
			logger.error("Authorization code exchange failed", {
				error: error instanceof Error ? error.message : String(error),
			});
			this.sendJson(res, 502, { error: "Failed to exchange authorization code" });
		}
	}

	private async handleAuthRefresh(req: IncomingMessage, res: ServerResponse) {
		const cookies = this.parseCookies(req);
		const sessionId = cookies[this.refreshCookieName];

		if (!sessionId) {
			this.clearRefreshCookie(res);
			this.sendJson(res, 401, { error: "Refresh session not found" });
			return;
		}

		let session: RefreshToken | null = null;
		try {
			session = await this.findRefreshSession(sessionId);
		} catch (error) {
			logger.error("Failed to look up refresh session", {
				error: error instanceof Error ? error.message : String(error),
			});
		}

		if (!session) {
			this.clearRefreshCookie(res);
			this.sendJson(res, 401, { error: "Refresh session not found" });
			return;
		}

		if (session.expiresAt.getTime() <= Date.now()) {
			await this.deleteRefreshSession(sessionId);
			this.clearRefreshCookie(res);
			this.sendJson(res, 401, { error: "Refresh session expired" });
			return;
		}

		let user = await this.prisma.user.findUnique({ where: { id: session.userId } });
		if (!user) {
			await this.deleteRefreshSession(sessionId);
			this.clearRefreshCookie(res);
			this.sendJson(res, 401, { error: "User not found" });
			return;
		}

		try {
			// Check token type to determine authentication flow
			const isLocalSession = session.tokenType === "local";

			if (isLocalSession) {
				// Local authentication - issue new access token
				const accessTokenClaims: AccessTokenClaims = {
					sub: user.externalId || `local:${user.id}`,
					aud: process.env.OIDC_AUDIENCE || "api://default",
					iss: process.env.OIDC_ISSUER || "local",
					exp: Math.floor(Date.now() / 1000) + 3600,
					iat: Math.floor(Date.now() / 1000),
					scope: "openid profile email",
				};

				const accessToken = this.jwtService.signAccessToken(accessTokenClaims);
				const accessTokenExpiresAt = new Date((accessTokenClaims.exp ?? 0) * 1000);

				this.setRefreshCookie(res, sessionId, session.expiresAt);

				this.sendJson(res, 200, {
					accessToken,
					accessTokenExpiresAt: accessTokenExpiresAt.toISOString(),
					scope: accessTokenClaims.scope,
					user: {
						id: user.id,
						username: user.username,
						role: user.role,
						email: user.email ?? null,
						displayName: user.displayName ?? null,
						sub: accessTokenClaims.sub,
						preferredUsername: user.username,
						name: user.displayName ?? null,
						roles: [user.role],
					},
				});
			} else {
				// OIDC authentication - refresh with IdP
				const tokens = await this.jwtService.refreshAccessToken(session.token);

				const newRefreshToken = tokens.refreshToken ?? session.token;
				const newExpiresAt = tokens.refreshTokenExpiresAt ?? session.expiresAt;

				await this.prisma.refreshToken.updateMany({
					where: { jti: sessionId },
					data: {
						token: newRefreshToken,
						expiresAt: newExpiresAt,
					},
				});

				const email = this.extractEmail(tokens.accessTokenClaims, tokens.idTokenClaims);
				const displayName = this.extractDisplayName(tokens.accessTokenClaims, tokens.idTokenClaims);
				user = await this.updateUserProfile(user, email, displayName);

				const contextUser = this.buildContextUser(
					user,
					tokens.accessTokenClaims,
					tokens.idTokenClaims
				);

				this.setRefreshCookie(res, sessionId, newExpiresAt);

				this.sendJson(res, 200, {
					accessToken: tokens.accessToken,
					accessTokenExpiresAt: tokens.accessTokenExpiresAt.toISOString(),
					scope: tokens.scope ?? null,
					refreshSessionId: sessionId,
					refreshToken: newRefreshToken,
					refreshTokenExpiresAt: newExpiresAt.toISOString(),
					user: {
						id: user.id,
						username: user.username,
						role: user.role,
						email: user.email ?? null,
						displayName: user.displayName ?? null,
						sub: contextUser.sub,
						preferredUsername: contextUser.preferredUsername ?? null,
						name: contextUser.name ?? null,
						roles: contextUser.roles,
					},
				});
			}
		} catch (error) {
			logger.warn("Refresh token rotation failed", {
				error: error instanceof Error ? error.message : String(error),
			});
			await this.deleteRefreshSession(sessionId);
			this.clearRefreshCookie(res);
			this.sendJson(res, 401, { error: "Unable to refresh session" });
		}
	}

	private async handleAuthLogin(req: IncomingMessage, res: ServerResponse) {
		try {
			const body = await this.readJsonBody<unknown>(req);
			const schema = z.object({
				username: z.string().min(1),
				password: z.string().min(1),
			});
			const input = schema.parse(body);

			const user = await this.prisma.user.findUnique({
				where: { username: input.username },
			});

			if (!user) {
				logger.warn("Login failed: user not found", {
					username: input.username,
					ip: req.socket.remoteAddress,
					method: "local",
				});
				this.sendJson(res, 401, { error: "Invalid credentials" });
				return;
			}

			const isValidPassword = await argon2.verify(user.passwordHash || "", input.password);
			if (!isValidPassword) {
				logger.warn("Login failed: invalid password", {
					username: input.username,
					userId: user.id,
					ip: req.socket.remoteAddress,
					method: "local",
				});
				this.sendJson(res, 401, { error: "Invalid credentials" });
				return;
			}

			logger.info("Login successful", {
				username: input.username,
				userId: user.id,
				ip: req.socket.remoteAddress,
				method: "local",
			});

			const accessTokenClaims: AccessTokenClaims = {
				sub: user.externalId || `local:${user.id}`,
				aud: process.env.OIDC_AUDIENCE || "api://default",
				iss: process.env.OIDC_ISSUER || "local",
				exp: Math.floor(Date.now() / 1000) + 3600,
				iat: Math.floor(Date.now() / 1000),
				scope: "openid profile email",
			};

			const accessToken = this.jwtService.signAccessToken(accessTokenClaims);
			const accessTokenExpiresAt = new Date((accessTokenClaims.exp ?? 0) * 1000);

			const refreshTokenValue = randomBytes(32).toString("hex");
			const refreshTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

			const { sessionId, expiresAt } = await this.persistRefreshSession(
				user.id,
				refreshTokenValue,
				refreshTokenExpiresAt,
				"local"
			);

			this.setRefreshCookie(res, sessionId, expiresAt);

			const contextUser: ContextUser = {
				sub: accessTokenClaims.sub,
				localUserId: user.id,
				roles: [user.role],
				email: user.email,
				preferredUsername: user.username,
				name: user.displayName,
				claims: accessTokenClaims,
			};

			this.sendJson(res, 200, {
				accessToken,
				accessTokenExpiresAt: accessTokenExpiresAt.toISOString(),
				scope: accessTokenClaims.scope,
				refreshSessionId: sessionId,
				refreshToken: refreshTokenValue,
				refreshTokenExpiresAt: refreshTokenExpiresAt.toISOString(),
				user: {
					id: user.id,
					username: user.username,
					role: user.role,
					email: user.email ?? null,
					displayName: user.displayName ?? null,
					sub: contextUser.sub,
					preferredUsername: user.username,
					name: user.displayName ?? null,
					roles: [user.role],
				},
			});
		} catch (error) {
			if (error instanceof z.ZodError) {
				this.sendJson(res, 400, { error: "Invalid request", details: error.errors });
				return;
			}
			logger.error("Login failed", {
				error: error instanceof Error ? error.message : String(error),
			});
			this.sendJson(res, 500, { error: "Failed to process login" });
		}
	}

	private async handleAuthLogout(_req: IncomingMessage, res: ServerResponse) {
		const cookies = this.parseCookies(_req);
		const sessionId = cookies[this.refreshCookieName];
		if (sessionId) {
			const session = await this.findRefreshSession(sessionId);
			if (session) {
				try {
					await this.jwtService.revokeRefreshToken(session.token);
				} catch (error) {
					logger.warn("Failed to revoke refresh token", {
						error: error instanceof Error ? error.message : String(error),
					});
				}
				await this.deleteRefreshSession(sessionId);
			}
		}

		this.clearRefreshCookie(res);
		res.statusCode = 204;
		res.end();
	}

	private async handleAuthSessionEstablish(req: IncomingMessage, res: ServerResponse) {
		try {
			const body = await this.readJsonBody<unknown>(req);
			const schema = z.object({
				sessionId: z.string().min(1),
				refreshToken: z.string().min(1),
			});
			const input = schema.parse(body);

			const session = await this.findRefreshSession(input.sessionId);
			if (!session || session.token !== input.refreshToken) {
				logger.warn("Refresh session establishment failed: session mismatch", {
					sessionId: sanitizeText(input.sessionId),
				});
				this.sendJson(res, 401, { error: "Invalid session" });
				return;
			}

			if (session.expiresAt.getTime() <= Date.now()) {
				await this.deleteRefreshSession(input.sessionId);
				this.sendJson(res, 401, { error: "Session expired" });
				return;
			}

			this.setRefreshCookie(res, input.sessionId, session.expiresAt);
			res.statusCode = 204;
			res.end();
		} catch (error) {
			if (error instanceof z.ZodError) {
				this.sendJson(res, 400, { error: "Invalid request payload", details: error.errors });
				return;
			}
			logger.error("Failed to establish refresh session cookie", {
				error: error instanceof Error ? error.message : String(error),
			});
			this.sendJson(res, 500, { error: "Failed to establish session" });
		}
	}

	private async handleHttpRequest(
		req: IncomingMessage,
		res: ServerResponse,
		allowedOrigin: string
	) {
		try {
			const upgrade = req.headers.upgrade;
			if (typeof upgrade === "string" && upgrade.toLowerCase() === "websocket") {
				// Let WebSocket upgrade handling proceed without interfering
				return;
			}

			const method = req.method ?? "GET";
			const host = req.headers.host ?? "localhost";
			const url = new URL(req.url || "/", `http://${host}`);
			const origin = req.headers.origin as string | undefined;
			const isAuthEndpoint = url.pathname.startsWith("/auth/");

			if (method === "OPTIONS" && isAuthEndpoint) {
				this.applyCors(res, origin, allowedOrigin);
				this.handleOptions(res);
				return;
			}

			if (isAuthEndpoint && !this.applyCors(res, origin, allowedOrigin)) {
				return;
			}

			if (url.pathname === "/api/health" || url.pathname === "/health") {
				this.sendJson(res, 200, { status: "ok", timestamp: new Date().toISOString() });
				return;
			}

			// Allow only the refresh-session cookie establishment endpoint
			if (method === "POST" && url.pathname === "/auth/session") {
				await this.handleAuthSessionEstablish(req, res);
				return;
			}

			// WS+tRPC only: disable other REST auth endpoints
			if (url.pathname.startsWith("/auth/") && url.pathname !== "/auth/session") {
				this.sendJson(res, 404, { error: "REST auth disabled. Use tRPC over WebSocket." });
				return;
			}

			res.statusCode = 404;
			res.end();
		} catch (error) {
			logger.error("HTTP request handling failed", {
				error: error instanceof Error ? error.message : String(error),
			});
			if (!res.headersSent) {
				this.sendJson(res, 500, { error: "Internal server error" });
			} else {
				res.end();
			}
		}
	}

	public async start(port: number) {
		const allowedWsOrigin = process.env.ALLOWED_WS_ORIGIN;
		if (!allowedWsOrigin) {
			throw new Error("ALLOWED_WS_ORIGIN must be set. See .env.example");
		}
		const allowedHttpOrigin = process.env.ALLOWED_HTTP_ORIGIN || allowedWsOrigin;
		const MAX_CONNECTIONS = Number.parseInt(process.env.MAX_WS_CONNECTIONS || "1000", 10);

		// Import appRouter dynamically to ensure environment variables are loaded first
		logger.debug("Importing routers module");
		const { appRouter } = await import("../../routers/index.js");
		logger.debug("Routers module imported successfully");

		// Check if SSL certificates are available
		const sslCertPath = process.env.SSL_CERT_PATH || "/app/ssl/server.crt";
		const sslKeyPath = process.env.SSL_KEY_PATH || "/app/ssl/server.key";
		const useSSL = fs.existsSync(sslCertPath) && fs.existsSync(sslKeyPath);

		let server: http.Server | https.Server;

		if (useSSL) {
			logger.info("SSL certificates found. Starting HTTPS server...");
			const sslOptions = {
				cert: fs.readFileSync(sslCertPath),
				key: fs.readFileSync(sslKeyPath),
			};
			server = https.createServer(sslOptions);
		} else {
			logger.warn(
				"SSL certificates not found. Starting HTTP server (NOT recommended for production)"
			);
			server = http.createServer();
		}

		// Handle HTTP requests (health check + auth endpoints)
		server.on("request", (req, res) => {
			void this.handleHttpRequest(req, res, allowedHttpOrigin);
		});

		const wss = new WebSocketServer({
			server,
			maxPayload: 1_000_000, // 1MB max message size
			perMessageDeflate: false, // Disable compression to prevent DoS
			clientTracking: true,
			verifyClient: (info: { origin?: string; req: IncomingMessage }) => {
				const origin = info.origin || info.req.headers.origin;
				logger.debug("WebSocket connection attempt", { origin, allowedOrigin: allowedWsOrigin });

				if (!origin) {
					logger.warn("WebSocket connection rejected: no origin header");
					return false;
				}

				const allowed = origin === allowedWsOrigin || allowedWsOrigin === "*";
				if (!allowed) {
					logger.warn("WebSocket connection rejected: origin not allowed", {
						origin,
						allowedOrigin: allowedWsOrigin,
					});
				}
				return allowed;
			},
		});
		const handler = applyWSSHandler({
			wss: wss as any,
			router: appRouter,
			createContext: async ({ req }) => this.createContextFromReq(req),
		});

		wss.on("connection", (socket, req) => {
			const ws = socket as ExtendedWebSocket;
			// Mark connection alive at start and refresh on pong
			ws.isAlive = true;
			ws.on("pong", () => {
				ws.isAlive = true;
			});
			logger.debug("WebSocket connection established", {
				url: req.url,
				origin: req.headers.origin,
			});

			// Limit total connections
			if (wss.clients.size > MAX_CONNECTIONS) {
				logger.warn("Server at capacity, closing connection");
				try {
					socket.close(1008, "Server at capacity");
				} catch (error) {
					logger.warn("Failed to close socket at capacity", {
						error: error instanceof Error ? error.message : String(error),
					});
				}
				return;
			}

			// Check if this is a chat connection
			const isChatConnection = req.url?.includes("/chat") || false;

			if (isChatConnection) {
				// Handle chat connection with dispatcher
				this.handleChatConnection(socket, req);
			} else {
				// Handle tRPC connection
				this.handleTrpcConnection(socket, req);
			}
		});

		// Periodic ping to detect broken connections
		const interval = setInterval(() => {
			for (const client of wss.clients) {
				const ws = client as ExtendedWebSocket;
				if (ws.isAlive === false) {
					try {
						ws.terminate();
					} catch (error) {
						logger.debug("Failed to terminate dead connection", {
							error: error instanceof Error ? error.message : String(error),
						});
					}
					continue;
				}
				ws.isAlive = false;
				try {
					ws.ping();
				} catch (error) {
					logger.debug("Failed to ping connection", {
						error: error instanceof Error ? error.message : String(error),
					});
				}
			}
		}, HEARTBEAT_INTERVAL_MS);

		wss.on("close", () => clearInterval(interval));

		// Start the server
		server.listen(port, "0.0.0.0", () => {
			const protocol = useSSL ? "HTTPS" : "HTTP";
			logger.info(`${protocol} server listening`, { port, host: "0.0.0.0" });
			logger.info("WebSocket server ready", { port, protocol: useSSL ? "WSS" : "WS" });
		});
		const gracefulShutdown = async (signal: string) => {
			logger.info(`Received ${signal}, starting graceful shutdown...`);

			try {
				// Broadcast reconnection notification to clients
				handler.broadcastReconnectNotification();

				// Close all WebSocket connections
				await new Promise<void>((resolve, reject) => {
					wss.close((err) => {
						if (err) {
							logger.error("Error closing WebSocket server", err);
							reject(err);
						} else {
							logger.info("WebSocket server closed successfully");
							resolve();
						}
					});
				});

				// Close HTTP/HTTPS server
				await new Promise<void>((resolve, reject) => {
					server.close((err) => {
						if (err) {
							logger.error("Error closing HTTP server", err);
							reject(err);
						} else {
							logger.info("HTTP server closed successfully");
							resolve();
						}
					});
				});

				// Close database connections
				await this.prisma.$disconnect();
				logger.info("Database connections closed");

				logger.info("Graceful shutdown completed");
				process.exit(0);
			} catch (error) {
				logger.error("Error during graceful shutdown", error as Error);
				process.exit(1);
			}
		};

		process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
		process.on("SIGINT", () => gracefulShutdown("SIGINT"));
	}

	private async createContextFromReq(req: IncomingMessage): Promise<Context> {
		const token = this.extractToken(req);
		if (!token) {
			logger.debug("No access token provided");
			return { user: null, prisma: this.prisma, accessToken: null, jwtService: this.jwtService };
		}

		const claims = await this.jwtService.verifyAccessToken(token);
		if (!claims) {
			return { user: null, prisma: this.prisma, accessToken: null, jwtService: this.jwtService };
		}

		try {
			const user = await this.provisionUser(claims);
			const contextUser = this.buildContextUser(user, claims);
			return {
				user: contextUser,
				prisma: this.prisma,
				accessToken: token,
				jwtService: this.jwtService,
			};
		} catch (error) {
			logger.error("Failed to prepare context user from access token", {
				error: error instanceof Error ? error.message : String(error),
			});
			return { user: null, prisma: this.prisma, accessToken: null, jwtService: this.jwtService };
		}
	}

	/**
	 * Handle chat WebSocket connections
	 */
	private handleChatConnection(socket: WebSocket, req: any): void {
		logger.info("[Chat] Handling chat connection", { url: req.url });

		// Extract metadata from request
		const metadata = {
			ipAddress: this.extractClientIP(req),
			userAgent: req.headers["user-agent"],
		};

		// Extract token from query or subprotocol
		const token = this.extractTokenFromRequest(req);

		if (!token) {
			logger.warn("[Chat] Chat connection rejected: no token", { metadata });
			socket.close(4001, "Authentication required");
			return;
		}

		// Rate limit WebSocket connections
		const rateLimitResult = RateLimitPresets.websocketConnections.checkLimit(
			metadata.ipAddress || "unknown"
		);
		if (!rateLimitResult.allowed) {
			logger.warn("[Chat] Chat connection rejected: rate limit exceeded", { metadata });
			socket.close(429, "Too many connections");
			return;
		}

		// Verify token and get user
		this.jwtService
			.verifyAccessToken(token)
			.then(async (claims) => {
				if (!claims) {
					throw new Error("Invalid claims");
				}
				const user = await this.provisionUser(claims);
				const contextUser = this.buildContextUser(user, claims);

				// Register with enhanced metadata
				const sessionId = this.chatDispatcher.registerConnection(socket, contextUser, metadata);

				logger.info(`[Chat] Chat session established: ${sessionId} for user ${contextUser.sub}`, {
					sessionId,
					userId: contextUser.sub,
					ipAddress: metadata.ipAddress,
					userAgent: metadata.userAgent,
				});

				// Record monitoring metrics
				monitoring.recordRequest("chat_connection", 0);
			})
			.catch((error) => {
				logger.error("[Chat] Chat connection authentication failed:", error);
				socket.close(4001, "Authentication failed");

				// Record error metrics
				monitoring.recordRequest("chat_connection", 0, error);
			});
	}

	/**
	 * Handle tRPC WebSocket connections
	 */
	private handleTrpcConnection(socket: WebSocket, _req: any): void {
		socket.on("message", (data) => {
			const dataLength = Buffer.isBuffer(data)
				? data.length
				: Array.isArray(data)
					? data.length
					: data instanceof ArrayBuffer
						? data.byteLength
						: 0;

			logger.debug("WebSocket message received", {
				dataLength,
				dataPreview: data.toString().substring(0, 100),
			});
		});

		socket.on("error", (error) => {
			logger.error("WebSocket error", { error: error.message });
		});

		socket.on("close", (code, reason) => {
			logger.debug("WebSocket connection closed", { code, reason: reason.toString() });
		});
	}

	/**
	 * Extract client IP address from request
	 */
	private extractClientIP(req: any): string {
		// Try various headers for client IP
		const forwardedFor = req.headers["x-forwarded-for"];
		if (forwardedFor) {
			return forwardedFor.split(",")[0].trim();
		}

		const realIP = req.headers["x-real-ip"];
		if (realIP) {
			return realIP;
		}

		const cfConnectingIP = req.headers["cf-connecting-ip"];
		if (cfConnectingIP) {
			return cfConnectingIP;
		}

		// Fallback to connection remote address
		return req.socket?.remoteAddress || "unknown";
	}

	/**
	 * Extract token from WebSocket request
	 */
	private extractTokenFromRequest(req: any): string | null {
		// Try query parameter first
		const url = new URL(req.url || "", "http://localhost");
		const token = url.searchParams.get("token");
		if (token) return token;

		// Try subprotocol
		const protocols = req.headers["sec-websocket-protocol"];
		if (protocols && typeof protocols === "string") {
			const tokenProtocol = protocols.split(",").find((p) => p.trim().startsWith("Bearer."));
			if (tokenProtocol) {
				return tokenProtocol.trim().substring(7); // Remove 'Bearer.' prefix
			}
		}

		return null;
	}
}
