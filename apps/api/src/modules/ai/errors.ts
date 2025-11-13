/**
 * Custom Error Classes for AI Services
 * Provides better error categorization and handling
 */

export abstract class AIServiceError extends Error {
	abstract readonly code: string;
	abstract readonly statusCode: number;

	constructor(
		message: string,
		public readonly cause?: Error
	) {
		super(message);
		this.name = this.constructor.name;

		// Maintains proper stack trace for where our error was thrown (only available on V8)
		if (Error.captureStackTrace) {
			Error.captureStackTrace(this, this.constructor);
		}
	}

	toJSON() {
		return {
			name: this.name,
			code: this.code,
			message: this.message,
			statusCode: this.statusCode,
			cause: this.cause?.message,
		};
	}
}

export class AIGenerationError extends AIServiceError {
	readonly code = "AI_GENERATION_ERROR";
	readonly statusCode = 500;

	constructor(message: string, cause?: Error) {
		super(`AI Generation failed: ${message}`, cause);
	}
}

export class AIQuotaExceededError extends AIServiceError {
	readonly code = "AI_QUOTA_EXCEEDED";
	readonly statusCode = 429;

	constructor(message = "AI quota exceeded", cause?: Error) {
		super(message, cause);
	}
}

export class AIContentValidationError extends AIServiceError {
	readonly code = "AI_CONTENT_VALIDATION_ERROR";
	readonly statusCode = 400;

	constructor(message: string, cause?: Error) {
		super(`Content validation failed: ${message}`, cause);
	}
}

export class AIMindMapNotFoundError extends AIServiceError {
	readonly code = "AI_MINDMAP_NOT_FOUND";
	readonly statusCode = 404;

	constructor(mindmapId: string, cause?: Error) {
		super(`MindMap not found: ${mindmapId}`, cause);
	}
}

export class AINodeNotFoundError extends AIServiceError {
	readonly code = "AI_NODE_NOT_FOUND";
	readonly statusCode = 404;

	constructor(nodeId: string, cause?: Error) {
		super(`Node not found: ${nodeId}`, cause);
	}
}

export class AIConfigurationError extends AIServiceError {
	readonly code = "AI_CONFIGURATION_ERROR";
	readonly statusCode = 500;

	constructor(message: string, cause?: Error) {
		super(`AI Configuration error: ${message}`, cause);
	}
}
