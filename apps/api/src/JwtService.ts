import jwt from "jsonwebtoken";
import { inject, injectable } from "tsyringe";
import { logger } from "./modules/logger/core/logger.js";

/**
 * JWT token service for signing and verifying tokens
 * Centralizes JWT operations to avoid code duplication
 */
@injectable()
export class JwtService {
	private readonly issuer: string | undefined;
	private readonly audience: string | undefined;

	constructor(@inject("JWT_SECRET") private readonly secret: string) {
		this.issuer = process.env.JWT_ISSUER;
		this.audience = process.env.JWT_AUDIENCE;
	}

	/**
	 * Sign a new JWT token for the given user ID
	 * @param userId User ID to include in the token
	 * @returns Signed JWT token string
	 */
	sign(userId: string): string {
		const signOptions: jwt.SignOptions = {
			expiresIn: "7d",
			algorithm: "HS256",
		};

		if (this.issuer) signOptions.issuer = this.issuer;
		if (this.audience) signOptions.audience = this.audience;

		logger.debug("Generating JWT token", {
			userId,
			hasIssuer: !!this.issuer,
			hasAudience: !!this.audience,
			issuer: this.issuer,
			audience: this.audience,
		});

		return jwt.sign({ sub: userId }, this.secret, signOptions);
	}

	/**
	 * Verify and decode a JWT token
	 * @param token JWT token string to verify
	 * @returns User ID from token, or null if verification fails
	 */
	verify(token: string): string | null {
		try {
			const verifyOptions: jwt.VerifyOptions = {
				algorithms: ["HS256"],
				clockTolerance: 5,
			};

			// Only require issuer/audience if set in environment
			if (this.issuer) verifyOptions.issuer = this.issuer;
			if (this.audience) verifyOptions.audience = this.audience;

			logger.debug("Verifying JWT token", {
				hasIssuer: !!this.issuer,
				hasAudience: !!this.audience,
			});

			const payload = jwt.verify(token, this.secret, verifyOptions) as { sub?: string };
			const userId = payload.sub ?? null;

			logger.debug("JWT token verified successfully", { userId });
			return userId;
		} catch (err) {
			logger.warn("JWT token verification failed", {
				error: err instanceof Error ? err.message : String(err),
			});
			return null;
		}
	}
}
