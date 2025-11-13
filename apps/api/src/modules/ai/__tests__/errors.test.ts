/**
 * AI Service Errors Tests
 */

import { describe, expect, it } from "vitest";
import {
	AIConfigurationError,
	AIContentValidationError,
	AIGenerationError,
	AIMindMapNotFoundError,
	AINodeNotFoundError,
	AIQuotaExceededError,
	AIServiceError,
} from "../errors.js";

describe("AI Service Errors", () => {
	it("should create AIServiceError with proper properties", () => {
		class TestAIServiceError extends AIServiceError {
			readonly code = "TEST_AI_SERVICE_ERROR";
			readonly statusCode = 500;
		}

		const error = new TestAIServiceError("Test error");

		expect(error).toBeInstanceOf(Error);
		expect(error).toBeInstanceOf(AIServiceError);
		expect(error.name).toBe("TestAIServiceError");
		expect(error.message).toBe("Test error");
		expect(error.code).toBe("TEST_AI_SERVICE_ERROR");
		expect(error.statusCode).toBe(500);
	});

	it("should serialize to JSON correctly", () => {
		const cause = new Error("Original error");
		const error = new AIGenerationError("Generation failed", cause);

		const json = error.toJSON();
		expect(json.name).toBe("AIGenerationError");
		expect(json.code).toBe("AI_GENERATION_ERROR");
		expect(json.message).toBe("AI Generation failed: Generation failed");
		expect(json.statusCode).toBe(500);
		expect(json.cause).toBe("Original error");
	});

	it("should create AIGenerationError with correct properties", () => {
		const error = new AIGenerationError("Failed to generate");

		expect(error.code).toBe("AI_GENERATION_ERROR");
		expect(error.statusCode).toBe(500);
		expect(error.message).toBe("AI Generation failed: Failed to generate");
	});

	it("should create AIQuotaExceededError with correct properties", () => {
		const error = new AIQuotaExceededError("Quota exceeded");

		expect(error.code).toBe("AI_QUOTA_EXCEEDED");
		expect(error.statusCode).toBe(429);
		expect(error.message).toBe("Quota exceeded");
	});

	it("should create AIContentValidationError with correct properties", () => {
		const error = new AIContentValidationError("Invalid content");

		expect(error.code).toBe("AI_CONTENT_VALIDATION_ERROR");
		expect(error.statusCode).toBe(400);
		expect(error.message).toBe("Content validation failed: Invalid content");
	});

	it("should create AIMindMapNotFoundError with correct properties", () => {
		const error = new AIMindMapNotFoundError("mindmap-123");

		expect(error.code).toBe("AI_MINDMAP_NOT_FOUND");
		expect(error.statusCode).toBe(404);
		expect(error.message).toBe("MindMap not found: mindmap-123");
	});

	it("should create AINodeNotFoundError with correct properties", () => {
		const error = new AINodeNotFoundError("node-456");

		expect(error.code).toBe("AI_NODE_NOT_FOUND");
		expect(error.statusCode).toBe(404);
		expect(error.message).toBe("Node not found: node-456");
	});

	it("should create AIConfigurationError with correct properties", () => {
		const error = new AIConfigurationError("Config missing");

		expect(error.code).toBe("AI_CONFIGURATION_ERROR");
		expect(error.statusCode).toBe(500);
		expect(error.message).toBe("AI Configuration error: Config missing");
	});

	it("should preserve stack trace", () => {
		const error = new AIGenerationError("Test error");

		expect(error.stack).toBeDefined();
		expect(error.stack).toContain("AIGenerationError");
	});

	it("should handle cause errors", () => {
		const originalError = new Error("Root cause");
		const error = new AIGenerationError("Wrapped error", originalError);

		expect(error.cause).toBe(originalError);
		expect(error.toJSON().cause).toBe("Root cause");
	});
});
