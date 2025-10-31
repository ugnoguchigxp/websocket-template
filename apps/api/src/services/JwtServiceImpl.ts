import jwt from "jsonwebtoken";
import { inject, injectable } from "tsyringe";
import type { IJwtService } from "../interfaces/IAuthService.js";

export interface JwtClaims {
	userId: number;
}

@injectable()
export class JwtServiceImpl implements IJwtService {
	constructor(@inject("JWT_SECRET") private jwtSecret: string) {}

	sign(userId: number): string {
		return jwt.sign({ userId }, this.jwtSecret, {
			expiresIn: "7d",
			issuer: "websocket-framework",
			audience: "websocket-framework-clients",
		});
	}

	verify(token: string): { userId: string } | null {
		try {
			const decoded = jwt.verify(token, this.jwtSecret, {
				issuer: "websocket-framework",
				audience: "websocket-framework-clients",
			}) as any;

			return { userId: decoded.userId };
		} catch (_error) {
			return null;
		}
	}
}
