import path from "path";
import { logger } from "../modules/logger/core/logger.js";
import { inject, injectable } from "tsyringe";
import { config } from "dotenv";
import type { IEnvironmentService } from "../interfaces/IAppService.js";

@injectable()
export class EnvironmentService implements IEnvironmentService {
	constructor(@inject("AppPath") private appPath: string) {}

	loadEnvironment(): Record<string, string> {
		const envPath = path.resolve(this.appPath, "../../../", ".env");
		const result = config({ path: envPath });
		if (result.error) {
			logger.warn("No .env file found, using system environment variables");
		}
		return process.env as Record<string, string>;
	}

	validateEnvironment(): void {
		const NODE_ENV = process.env.NODE_ENV || "development";
		const JWT_SECRET = process.env.JWT_SECRET;

		if (!JWT_SECRET || JWT_SECRET.length < 32) {
			throw new Error("JWT_SECRET must be set and at least 32 characters. See .env.example");
		}

		if (NODE_ENV === "development") {
			logger.debug("Environment variables loaded", {
				hasIssuer: !!process.env.JWT_ISSUER,
				hasAudience: !!process.env.JWT_AUDIENCE,
			});
		}

		if (NODE_ENV === "production") {
			if (!process.env.ALLOWED_WS_ORIGIN) {
				throw new Error("ALLOWED_WS_ORIGIN must be set in production");
			}
			if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes("dev.db")) {
				throw new Error("Production DATABASE_URL must not use dev.db");
			}
		}
	}

	getPort(): number {
		return Number(process.env.PORT || 3001);
	}

	getJwtSecret(): string {
		const secret = process.env.JWT_SECRET;
		if (!secret || secret.length < 32) {
			throw new Error("JWT_SECRET must be set and at least 32 characters. See .env.example");
		}
		return secret;
	}
}
