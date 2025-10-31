// Simple server startup without complex tooling
process.env.JWT_SECRET =
	process.env.JWT_SECRET || "test-secret-key-that-is-long-enough-for-testing";
process.env.NODE_ENV = process.env.NODE_ENV || "development";

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
	throw new Error("JWT_SECRET must be set and at least 32 characters long");
}

async function main() {
	try {
		console.log("🚀 Starting application...");

		// Import dependencies
		const { logger } = await import("@logger");
		const { prisma } = await import("./prisma.js");
		const { db, DbInitializer } = await import("./db.js");
		const { ServerApp } = await import("./server.js");

		// Initialize database
		logger.info("Initializing database...");
		const dbInitializer = new DbInitializer(db);
		await dbInitializer.initialize();

		// Start server
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
