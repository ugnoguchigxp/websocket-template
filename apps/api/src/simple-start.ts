import "reflect-metadata";
import path from "path";
import { fileURLToPath } from "url";
import { container } from "tsyringe";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simple environment loading
process.env.JWT_SECRET =
	process.env.JWT_SECRET || "test-secret-key-that-is-long-enough-for-testing";
process.env.NODE_ENV = process.env.NODE_ENV || "development";

// Import dependencies after environment is set
const { logger } = await import("@logger");
const { prisma } = await import("./prisma.js");
const { db, DbInitializer } = await import("./db.js");
const { EnvironmentService } = await import("./services/EnvironmentService.js");
const { AppService } = await import("./services/AppService.js");
const { DbService } = await import("./services/DbService.js");
const { JwtServiceImpl } = await import("./services/JwtServiceImpl.js");
const { PasswordServiceImpl } = await import("./services/PasswordServiceImpl.js");
const { AuthService } = await import("./services/AuthService.js");

// Register dependencies
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

// Start application
try {
	logger.info("Starting application with DI container");
	const appService = container.resolve(AppService);
	await appService.start();
} catch (e) {
	console.error("Fatal error during startup", e);
	process.exit(1);
}
