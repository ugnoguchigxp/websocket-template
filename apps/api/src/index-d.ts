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

// Simple DI setup without complex imports
class SimpleDI {
	private container = container;

	constructor() {
		this.registerServices();
	}

	private registerServices() {
		// Register basic values
		this.container.register("JWT_SECRET", { useValue: process.env.JWT_SECRET });
		this.container.register("NODE_ENV", { useValue: process.env.NODE_ENV });
		this.container.register("AppPath", { useValue: __dirname });
	}

	async resolveAppService() {
		// Dynamic import and registration
		const { logger } = await import("@logger");
		const { prisma } = await import("./prisma.js");
		const { db, DbInitializer } = await import("./db.js");
		const { EnvironmentService } = await import("./services/EnvironmentService.js");
		const { AppService } = await import("./services/AppService.js");
		const { DbService } = await import("./services/DbService.js");
		const { JwtServiceImpl } = await import("./services/JwtServiceImpl.js");
		const { PasswordServiceImpl } = await import("./services/PasswordServiceImpl.js");
		const { AuthService } = await import("./services/AuthService.js");

		// Register all services
		this.container.register("Logger", { useValue: logger });
		this.container.register("Prisma", { useValue: prisma });
		this.container.register("Database", { useValue: db });

		this.container.register("EnvironmentService", { useClass: EnvironmentService });
		this.container.register("DbService", { useClass: DbService });
		this.container.register("UserRepository", { useFactory: (c) => c.resolve("DbService") });
		this.container.register("DbInitializer", { useClass: DbInitializer });
		this.container.register("JwtService", { useClass: JwtServiceImpl });
		this.container.register("PasswordService", { useClass: PasswordServiceImpl });
		this.container.register("AuthService", { useClass: AuthService });
		this.container.register("AppService", { useClass: AppService });

		return this.container.resolve(AppService);
	}
}

// Start application
async function main() {
	try {
		console.log("🚀 Starting with optimized DI...");
		const di = new SimpleDI();
		const appService = await di.resolveAppService();
		await appService.start();
		console.log("✅ Application started successfully!");
	} catch (error) {
		console.error("❌ Startup failed:", error);
		process.exit(1);
	}
}

main();
