import "reflect-metadata";
import { container } from "tsyringe";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppService } from "../src/services/AppService.js";
import { EnvironmentService } from "../src/services/EnvironmentService.js";

// Mock external dependencies
vi.mock("vite", () => ({
	loadEnv: vi.fn(),
}));

vi.mock("path", async (importOriginal) => {
	const actual = await importOriginal();
	return {
		...actual,
		resolve: vi.fn((...args) => args.join("/")),
		dirname: vi.fn((path) => path.split("/").slice(0, -1).join("/")),
	};
});

vi.mock("url", () => ({
	fileURLToPath: vi.fn((url) => url.replace("file://", "")),
}));

describe("Index DI Tests", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		container.clearInstances();

		// Set up environment variables
		process.env.JWT_SECRET = "test-secret-key-that-is-long-enough-for-testing";
		process.env.NODE_ENV = "development";
		process.env.PORT = "3001";
	});

	it("should register and resolve EnvironmentService", () => {
		const envService = new EnvironmentService("/test/path");
		expect(envService).toBeInstanceOf(EnvironmentService);
	});

	it("should load environment variables", () => {
		// Set up required environment for loadEnvironment
		process.env.NODE_ENV = "development";
		const envService = new EnvironmentService("/test/path");

		expect(() => envService.loadEnvironment()).not.toThrow();
	});

	it("should validate environment in development", () => {
		const envService = new EnvironmentService("/test/path");

		expect(() => envService.validateEnvironment()).not.toThrow();
	});

	it("should validate JWT_SECRET length", () => {
		process.env.JWT_SECRET = "short";

		const envService = new EnvironmentService("/test/path");

		expect(() => envService.validateEnvironment()).toThrow(
			"JWT_SECRET must be set and at least 32 characters"
		);
	});

	it("should validate JWT_SECRET presence", () => {
		delete process.env.JWT_SECRET;

		const envService = new EnvironmentService("/test/path");

		expect(() => envService.validateEnvironment()).toThrow(
			"JWT_SECRET must be set and at least 32 characters"
		);
	});

	it("should get port from environment", () => {
		process.env.PORT = "8080";

		const envService = new EnvironmentService("/test/path");
		const port = envService.getPort();

		expect(port).toBe(8080);
	});

	it("should use default port", () => {
		delete process.env.PORT;

		const envService = new EnvironmentService("/test/path");
		const port = envService.getPort();

		expect(port).toBe(3001);
	});

	it("should get JWT secret", () => {
		const envService = new EnvironmentService("/test/path");
		const secret = envService.getJwtSecret();

		expect(secret).toBe("test-secret-key-that-is-long-enough-for-testing");
	});

	it("should validate production environment", () => {
		process.env.NODE_ENV = "production";
		process.env.ALLOWED_WS_ORIGIN = "https://localhost:3000";
		process.env.DATABASE_URL = "file:./production.db";

		const envService = new EnvironmentService("/test/path");

		expect(() => envService.validateEnvironment()).not.toThrow();
	});

	it("should reject dev.db in production", () => {
		process.env.NODE_ENV = "production";
		process.env.DATABASE_URL = "file:dev.db";

		const envService = new EnvironmentService("/test/path");
		expect(() => envService.validateEnvironment()).toThrow(
			"Production DATABASE_URL must not use dev.db"
		);
	});

	it("should require ALLOWED_WS_ORIGIN in production", () => {
		process.env.NODE_ENV = "production";
		delete process.env.ALLOWED_WS_ORIGIN;

		const envService = new EnvironmentService("/test/path");
		expect(() => envService.validateEnvironment()).toThrow(
			"ALLOWED_WS_ORIGIN must be set in production"
		);
	});

	it("should register and resolve AppService", () => {
		// Mock dependencies for AppService
		const envService = new EnvironmentService("/test/path");
		const mockDbInitializer = { initialize: vi.fn() };

		const appService = new AppService(envService, mockDbInitializer);
		expect(appService).toBeInstanceOf(AppService);
	});
});
