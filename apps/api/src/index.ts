import "reflect-metadata";
import path from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";
import { container } from "tsyringe";

// Load environment
const __filename = fileURLToPath(import.meta.url);
config({ path: path.resolve(path.dirname(__filename), "../../../.env") });

// Validate JWT_SECRET
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
	throw new Error("JWT_SECRET must be set and at least 32 characters long");
}

import { JwtService } from "./JwtService.js";
import { DbInitializer } from "./db.js";
// Import and start the application
import { logger } from "./modules/logger/core/logger.js";
import { prisma } from "./prisma.js";
import { ServerApp } from "./server.js";

async function main() {
	try {
		logger.info("🚀 Starting application...");

		// Register dependencies
		container.register("Prisma", { useValue: prisma });
		container.register("JWT_SECRET", { useValue: process.env.JWT_SECRET as string });
		container.register(JwtService, {
			useFactory: () => new JwtService(process.env.JWT_SECRET as string),
		});
		container.register(DbInitializer, { useFactory: () => new DbInitializer(prisma) });
		container.register(ServerApp, {
			useFactory: () => {
				const jwtService = container.resolve(JwtService);
				return new ServerApp(prisma, process.env.JWT_SECRET as string, jwtService);
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
