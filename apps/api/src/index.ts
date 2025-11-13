import "reflect-metadata";
import path from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";
import { container } from "tsyringe";
import { JwtService } from "./core/auth/index.js";
import { DbInitializer, prisma } from "./core/database/index.js";
import { ServerApp } from "./core/server/index.js";
import { logger } from "./modules/logger/core/logger.js";
import "./modules/mindmap/di.js";
import "./modules/ai/di.js";

// Load environment
const __filename = fileURLToPath(import.meta.url);
config({ path: path.resolve(path.dirname(__filename), "../../../.env") });

// OIDC settings are optional now - only required if using external OIDC provider
const optionalOidcVars = ["OIDC_ISSUER", "OIDC_CLIENT_ID", "OIDC_REDIRECT_URI"] as const;
const hasOidcConfig = optionalOidcVars.every((key) => !!process.env[key]);

if (!hasOidcConfig) {
	logger.info("OIDC configuration not found - using local authentication only");
}

// Validate JWT_SECRET for local authentication
if (!process.env.JWT_SECRET) {
	throw new Error(
		"JWT_SECRET environment variable must be set. " +
			"Generate a secure random string (minimum 32 characters)."
	);
}

const parseOptionalInt = (value: string | undefined): number | undefined => {
	if (!value) return undefined;
	const parsed = Number.parseInt(value, 10);
	return Number.isFinite(parsed) ? parsed : undefined;
};

async function main() {
	try {
		logger.info("🚀 Starting application...");

		// Register dependencies
		container.register("Prisma", { useValue: prisma });
		container.register(JwtService, {
			useFactory: () =>
				new JwtService({
					issuer: process.env.OIDC_ISSUER || "local",
					clientId: process.env.OIDC_CLIENT_ID || "local-client",
					redirectUri: process.env.OIDC_REDIRECT_URI || "http://localhost:5173/",
					audience: process.env.OIDC_AUDIENCE,
					clientSecret: process.env.OIDC_CLIENT_SECRET,
					jwksUriOverride: process.env.OIDC_JWKS_URI,
					tokenEndpointOverride: process.env.OIDC_TOKEN_ENDPOINT,
					userinfoEndpointOverride: process.env.OIDC_USERINFO_ENDPOINT,
					revocationEndpointOverride: process.env.OIDC_REVOCATION_ENDPOINT,
					defaultRefreshTokenTtlSeconds: parseOptionalInt(
						process.env.OIDC_REFRESH_TOKEN_TTL_SECONDS
					),
					jwksTtlSeconds: parseOptionalInt(process.env.OIDC_JWKS_TTL_SECONDS),
					discoveryTtlSeconds: parseOptionalInt(process.env.OIDC_DISCOVERY_TTL_SECONDS),
				}),
		});
		container.register(DbInitializer, { useFactory: () => new DbInitializer(prisma) });
		container.register(ServerApp, {
			useFactory: () => {
				const jwtService = container.resolve(JwtService);
				return new ServerApp(prisma, jwtService);
			},
		});

		// Initialize database
		const dbInitializer = container.resolve(DbInitializer);
		await dbInitializer.initialize();

		// Start server
		const app = container.resolve(ServerApp);
		await app.start(Number(process.env.PORT) || 3001);

		// Start cleanup interval for expired refresh tokens (every hour)
		const CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
		setInterval(async () => {
			try {
				const now = new Date();
				const result = await prisma.refreshToken.deleteMany({
					where: {
						expiresAt: {
							lt: now,
						},
					},
				});

				if (result.count > 0) {
					logger.info("Cleaned up expired refresh tokens", {
						count: result.count,
						timestamp: now.toISOString(),
					});
				} else {
					logger.debug("No expired refresh tokens to clean up");
				}
			} catch (error) {
				logger.error("Failed to clean up expired refresh tokens", error as Error);
			}
		}, CLEANUP_INTERVAL_MS);

		// Note: Graceful shutdown is handled by ServerApp (server.ts:214-260)
		// which includes WebSocket server, HTTP server, and Prisma disconnect

		logger.info("✅ Application started successfully");
	} catch (e) {
		logger.error("❌ Fatal error during startup", e as Error);
		process.exit(1);
	}
}

main();
