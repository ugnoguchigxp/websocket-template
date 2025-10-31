import path from "path";
import { fileURLToPath } from "url";
import { loadEnv } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment
loadEnv("", path.resolve(__dirname, "../../../"), "");

// Validate JWT_SECRET
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
	throw new Error("JWT_SECRET must be set and at least 32 characters long");
}

// Simple server startup without DI complexity
async function main() {
	try {
		console.log("🚀 Starting application...");

		// Import dependencies dynamically
		const { logger } = await import("@logger");
		const { prisma } = await import("./prisma.js");
		const { db, DbInitializer } = await import("./db.js");
		const { ServerApp } = await import("./server.js");

		logger.info("Initializing database...");
		const dbInitializer = new DbInitializer(db);
		await dbInitializer.initialize();

		logger.info("Starting server...");
		const app = new ServerApp();
		await app.start(Number(process.env.PORT) || 3001);

		logger.info("✅ Application started successfully");
	} catch (e) {
		console.error("❌ Fatal error during startup:", e);
		process.exit(1);
	}
}

main();
