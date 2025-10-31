import "reflect-metadata";
import * as path from "path";
import { container } from "tsyringe";
import { loadEnv } from "vite";

// Load environment variables
loadEnv("", path.resolve(__dirname, "../../"), "");

// Validate JWT_SECRET
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
	throw new Error("JWT_SECRET must be set and at least 32 characters long");
}

// Import dependencies with require for better compatibility
const { logger } = require("@logger");
const { prisma } = require("./prisma.js");
const { db, DbInitializer } = require("./db.js");
const { EnvironmentService } = require("./services/EnvironmentService.js");
const { AppService } = require("./services/AppService.js");
const { DbService } = require("./services/DbService.js");
const { JwtServiceImpl } = require("./services/JwtServiceImpl.js");
const { PasswordServiceImpl } = require("./services/PasswordServiceImpl.js");
const { AuthService } = require("./services/AuthService.js");

// Register all dependencies in container
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

// Start the application
async function main() {
	try {
		logger.info("Starting application with DI container");
		const appService = container.resolve(AppService);
		await appService.start();
	} catch (e) {
		logger.error("Fatal error during startup", e);
		process.exit(1);
	}
}

main();
