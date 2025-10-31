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

// Import dependencies with error handling
async function importDependencies() {
	const imports = {
		logger: null,
		prisma: null,
		db: null,
		DbInitializer: null,
		EnvironmentService: null,
		AppService: null,
		DbService: null,
		JwtServiceImpl: null,
		PasswordServiceImpl: null,
		AuthService: null,
	};

	try {
		// Try to import each dependency individually
		imports.logger = (await import("@logger")).logger;
		imports.prisma = (await import("./prisma.js")).prisma;
		const dbModule = await import("./db.js");
		imports.db = dbModule.db;
		imports.DbInitializer = dbModule.DbInitializer;
		imports.EnvironmentService = (
			await import("./services/EnvironmentService.js")
		).EnvironmentService;
		imports.AppService = (await import("./services/AppService.js")).AppService;
		imports.DbService = (await import("./services/DbService.js")).DbService;
		imports.JwtServiceImpl = (await import("./services/JwtServiceImpl.js")).JwtServiceImpl;
		imports.PasswordServiceImpl = (
			await import("./services/PasswordServiceImpl.js")
		).PasswordServiceImpl;
		imports.AuthService = (await import("./services/AuthService.js")).AuthService;
	} catch (error) {
		console.error("Failed to import dependencies:", error);
		throw error;
	}

	return imports;
}

// Register dependencies in container
function registerDependencies(imports) {
	container.register("Logger", { useValue: imports.logger });
	container.register("Prisma", { useValue: imports.prisma });
	container.register("Database", { useValue: imports.db });
	container.register("JWT_SECRET", { useValue: process.env.JWT_SECRET });
	container.register("AppPath", { useValue: __dirname });

	container.register("EnvironmentService", { useClass: imports.EnvironmentService });
	container.register("DbService", { useClass: imports.DbService });
	container.register("UserRepository", { useFactory: (c) => c.resolve("DbService") });
	container.register("DbInitializer", { useClass: imports.DbInitializer });
	container.register("JwtService", { useClass: imports.JwtServiceImpl });
	container.register("PasswordService", { useClass: imports.PasswordServiceImpl });
	container.register("AuthService", { useClass: imports.AuthService });
	container.register("AppService", { useClass: imports.AppService });
}

// Application bootstrap
async function bootstrap() {
	try {
		console.log("🚀 Starting application with DI container...");

		const imports = await importDependencies();
		registerDependencies(imports);

		console.log("✅ Dependencies registered successfully");

		const appService = container.resolve(imports.AppService);
		await appService.start();

		console.log("🎉 Application started successfully!");
	} catch (error) {
		console.error("💥 Failed to start application:", error);
		process.exit(1);
	}
}

// Start the application
bootstrap();
