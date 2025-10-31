const path = require("path");
const { loadEnv } = require("vite");

// Load environment
loadEnv("", path.resolve(__dirname, "../../"), "");

// Validate JWT_SECRET
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
	throw new Error("JWT_SECRET must be set and at least 32 characters long");
}

// Import dependencies with require
const { logger } = require("@logger");
const { prisma } = require("./prisma.js");
const { db, DbInitializer } = require("./db.js");
const { ServerApp } = require("./server.js");

async function main() {
	try {
		logger.info("🚀 Starting application...");

		// Initialize database
		const dbInitializer = new DbInitializer(db);
		await dbInitializer.initialize();

		// Start server
		const app = new ServerApp();
		await app.start(Number(process.env.PORT) || 3001);

		logger.info("✅ Application started successfully");
	} catch (e) {
		logger.error("❌ Fatal error during startup", e);
		process.exit(1);
	}
}

main();
