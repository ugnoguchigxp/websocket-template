import path from "path";
import { config } from "dotenv";
import { inject, injectable } from "tsyringe";
import type { IEnvironmentService } from "../interfaces/IAppService.js";
import { logger } from "../modules/logger/core/logger.js";

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

		const requiredEnv: Record<string, string | undefined> = {
			OIDC_ISSUER: process.env.OIDC_ISSUER,
			OIDC_CLIENT_ID: process.env.OIDC_CLIENT_ID,
			OIDC_REDIRECT_URI: process.env.OIDC_REDIRECT_URI,
			OIDC_CLIENT_SECRET: process.env.OIDC_CLIENT_SECRET,
			ALLOWED_WS_ORIGIN: process.env.ALLOWED_WS_ORIGIN,
		};

		for (const [key, value] of Object.entries(requiredEnv)) {
			if (!value || value.trim().length === 0) {
				throw new Error(`${key} must be set. See .env.example`);
			}
		}

		if (!process.env.ALLOWED_HTTP_ORIGIN && NODE_ENV !== "production") {
			logger.warn(
				"ALLOWED_HTTP_ORIGIN is not set; falling back to ALLOWED_WS_ORIGIN for /auth endpoints"
			);
			process.env.ALLOWED_HTTP_ORIGIN = process.env.ALLOWED_WS_ORIGIN;
		}

		if (NODE_ENV === "development") {
			logger.debug("Environment variables loaded", {
				hasIssuer: !!process.env.OIDC_ISSUER,
				hasAudience: !!process.env.OIDC_AUDIENCE,
				hasHttpOrigin: !!process.env.ALLOWED_HTTP_ORIGIN,
			});
		}

		if (NODE_ENV === "production") {
			if (!process.env.ALLOWED_HTTP_ORIGIN) {
				throw new Error("ALLOWED_HTTP_ORIGIN must be set in production");
			}
			if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes("dev.db")) {
				throw new Error("Production DATABASE_URL must not use dev.db");
			}
		}
	}

	getPort(): number {
		return Number(process.env.PORT || 3001);
	}
}
