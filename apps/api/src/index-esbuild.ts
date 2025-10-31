import "reflect-metadata";
import path from "path";
import { fileURLToPath } from "url";
import { container } from "tsyringe";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Environment setup
process.env.JWT_SECRET =
	process.env.JWT_SECRET || "test-secret-key-that-is-long-enough-for-testing";
process.env.NODE_ENV = process.env.NODE_ENV || "development";

// Import everything synchronously after environment is set
import { logger } from "@logger";
import { DbInitializer, db } from "./db.js";
import { prisma } from "./prisma.js";
import { AppService } from "./services/AppService.js";
import { AuthService } from "./services/AuthService.js";
import { DbService } from "./services/DbService.js";
import { EnvironmentService } from "./services/EnvironmentService.js";
import { JwtServiceImpl } from "./services/JwtServiceImpl.js";
import { PasswordServiceImpl } from "./services/PasswordServiceImpl.js";

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
async function main() {
	try {
		logger.info("🚀 Starting application with DI container...");
		const appService = container.resolve(AppService);
		await appService.start();
		logger.info("✅ Application started successfully!");
	} catch (e) {
		logger.error("❌ Fatal error during startup", e);
		process.exit(1);
	}
}

main();
