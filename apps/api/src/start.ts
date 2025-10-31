import "reflect-metadata";
import path from "path";
import { fileURLToPath } from "url";
import { container } from "tsyringe";
import { loadEnv } from "vite";

// Set up ES module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment
loadEnv("", path.resolve(__dirname, "../../../"), "");

// Validate JWT_SECRET
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
	throw new Error("JWT_SECRET must be set and at least 32 characters long");
}

// Import and setup dependencies dynamically
async function setupDependencies() {
	const { logger } = await import("@logger");
	const { prisma } = await import("./prisma.js");
	const { db, DbInitializer } = await import("./db.js");
	const { EnvironmentService } = await import("./services/EnvironmentService.js");
	const { AppService } = await import("./services/AppService.js");
	const { DbService } = await import("./services/DbService.js");
	const { JwtServiceImpl } = await import("./services/JwtServiceImpl.js");
	const { PasswordServiceImpl } = await import("./services/PasswordServiceImpl.js");
	const { AuthService } = await import("./services/AuthService.js");

	// Register all dependencies
	container.register("Logger", { useValue: logger });
	container.register("Prisma", { useValue: prisma });
	container.register("Database", { useValue: db });
	container.register("JWT_SECRET", { useValue: JWT_SECRET });
	container.register("AppPath", { useValue: __dirname });

	container.register("EnvironmentService", { useClass: EnvironmentService });
	container.register("DbService", { useClass: DbService });
	container.register("UserRepository", { useFactory: (c) => c.resolve("DbService") });
	container.register("DbInitializer", { useClass: DbInitializer });
	container.register("JwtService", { useClass: JwtServiceImpl });
	container.register("PasswordService", { useClass: PasswordServiceImpl });
	container.register("AuthService", { useClass: AuthService });
	container.register("AppService", { useClass: AppService });

	return { AppService, logger };
}

// Start the application
async function main() {
	try {
		const { AppService, logger } = await setupDependencies();
		logger.info("Starting application with DI container");
		const appService = container.resolve(AppService);
		await appService.start();
	} catch (e) {
		console.error("Fatal error during startup", e);
		process.exit(1);
	}
}

main();
