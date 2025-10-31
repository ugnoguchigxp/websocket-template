import "reflect-metadata";
import path from "path";
import { config } from "dotenv";
import { fileURLToPath } from "url";

// Load environment
const __filename = fileURLToPath(import.meta.url);
config({ path: path.resolve(path.dirname(__filename), "../../.env") });

// Validate JWT_SECRET
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
	throw new Error('JWT_SECRET must be set and at least 32 characters long');
}

// Import and start the application
import { logger } from "./modules/logger/core/logger.js";
import { db, DbInitializer } from "./db.js";
import { ServerApp } from "./server.js";
import { prisma } from "./prisma.js";
import { JwtService } from "./JwtService.js";

async function main() {
	try {
		logger.info('🚀 Starting application...');

		// Initialize database
		const dbInitializer = new DbInitializer(db);
		await dbInitializer.initialize();

		// Start server
		const jwtService = new JwtService(process.env.JWT_SECRET!);
		const app = new ServerApp(prisma, process.env.JWT_SECRET!, jwtService);
		await app.start(Number(process.env.PORT) || 3001);

		logger.info('✅ Application started successfully');
	} catch (e) {
		logger.error('❌ Fatal error during startup', e as Error);
		process.exit(1);
	}
}

main();
