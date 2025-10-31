import "reflect-metadata";
import path from "path";
import { fileURLToPath } from "url";
import { container } from "tsyringe";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Set environment variables
process.env.JWT_SECRET =
	process.env.JWT_SECRET || "test-secret-key-that-is-long-enough-for-testing";
process.env.NODE_ENV = process.env.NODE_ENV || "development";

// Dynamic imports to handle ES modules properly
async function initializeApp() {
	try {
		// Import all dependencies
		const [
			{ logger },
			{ prisma },
			{ db, DbInitializer },
			{ EnvironmentService },
			{ AppService },
			{ DbService },
			{ JwtServiceImpl },
			{ PasswordServiceImpl },
			{ AuthService },
		] = await Promise.all([
			import("@logger"),
			import("./prisma.js"),
			import("./db.js"),
			import("./services/EnvironmentService.js"),
			import("./services/AppService.js"),
			import("./services/DbService.js"),
			import("./services/JwtServiceImpl.js"),
			import("./services/PasswordServiceImpl.js"),
			import("./services/AuthService.js"),
		]);

		// Register all dependencies
		container.register("Logger", { useValue: logger });
		container.register("Prisma", { useValue: prisma });
		container.register("Database", { useValue: db });
		container.register("JWT_SECRET", { useValue: process.env.JWT_SECRET });
		container.register("AppPath", { useValue: __dirname });

		container.register("EnvironmentService", { useClass: EnvironmentService });
		container.register("DbService", { useClass: DbService });
		container.register("UserRepository", { useFactory: (c) => c.resolve("DbService") });
		container.register("DbInitializer", { useClass: DbInitializer });
		container.register("JwtService", { useClass: JwtServiceImpl });
		container.register("PasswordService", { useClass: PasswordServiceImpl });
		container.register("AuthService", { useClass: AuthService });
		container.register("AppService", { useClass: AppService });

		// Start the application
		logger.info("Starting application with optimized DI container");
		const appService = container.resolve(AppService);
		await appService.start();
	} catch (error) {
		console.error("Failed to start application:", error);
		process.exit(1);
	}
}

// Start the application
initializeApp();
