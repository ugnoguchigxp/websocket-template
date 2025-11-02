import { describe, expect, it, beforeEach } from "vitest";
import { EnvironmentService } from "../src/services/EnvironmentService.js";

describe("EnvironmentService", () => {
	const service = new EnvironmentService(process.cwd());

	beforeEach(() => {
		delete process.env.OIDC_ISSUER;
		delete process.env.OIDC_CLIENT_ID;
		delete process.env.OIDC_CLIENT_SECRET;
		delete process.env.OIDC_REDIRECT_URI;
		delete process.env.ALLOWED_WS_ORIGIN;
		delete process.env.ALLOWED_HTTP_ORIGIN;
		delete process.env.DATABASE_URL;
		process.env.NODE_ENV = "test";
	});

	const setRequired = () => {
		process.env.OIDC_ISSUER = "https://tenant.example.com/";
		process.env.OIDC_CLIENT_ID = "client-id";
		process.env.OIDC_CLIENT_SECRET = "client-secret";
		process.env.OIDC_REDIRECT_URI = "http://localhost:8000/callback";
		process.env.ALLOWED_WS_ORIGIN = "http://localhost:8000";
		process.env.DATABASE_URL = "file:./prod.db";
	};

	it("throws when required OIDC variables are missing", () => {
		expect(() => service.validateEnvironment()).toThrow("OIDC_ISSUER must be set. See .env.example");
	});

	it("allows configuration when all required variables are set", () => {
		setRequired();
		expect(() => service.validateEnvironment()).not.toThrow();
	});

	it("falls back to ALLOWED_WS_ORIGIN when ALLOWED_HTTP_ORIGIN is absent in development", () => {
		setRequired();
		process.env.NODE_ENV = "development";
		expect(() => service.validateEnvironment()).not.toThrow();
		expect(process.env.ALLOWED_HTTP_ORIGIN).toBe("http://localhost:8000");
	});

	it("requires ALLOWED_HTTP_ORIGIN in production", () => {
		setRequired();
		process.env.NODE_ENV = "production";
		process.env.ALLOWED_HTTP_ORIGIN = "";
		expect(() => service.validateEnvironment()).toThrow(
			"ALLOWED_HTTP_ORIGIN must be set in production"
		);
	});

	it("requires production database URL different from dev.db", () => {
		setRequired();
		process.env.NODE_ENV = "production";
		process.env.ALLOWED_HTTP_ORIGIN = "https://app.example.com";
		process.env.DATABASE_URL = "file:dev.db";
		expect(() => service.validateEnvironment()).toThrow(
			"Production DATABASE_URL must not use dev.db"
		);
	});

	it("returns default port when PORT env is unset", () => {
		delete process.env.PORT;
		expect(service.getPort()).toBe(3001);
	});

	it("returns configured port when PORT env is set", () => {
		process.env.PORT = "8080";
		expect(service.getPort()).toBe(8080);
	});
});
