/**
 * Custom Error Classes for Chat Services
 * Provides better error categorization and handling
 */

export abstract class ChatServiceError extends Error {
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

export class ChatSessionNotFoundError extends ChatServiceError {
	readonly code = "CHAT_SESSION_NOT_FOUND";
	readonly statusCode = 404;

	constructor(sessionId: string, cause?: Error) {
		super(`Chat session not found: ${sessionId}`, cause);
	}
}

export class ChatAuthenticationError extends ChatServiceError {
	readonly code = "CHAT_AUTHENTICATION_ERROR";
	readonly statusCode = 401;

	constructor(message = "Chat authentication failed", cause?: Error) {
		super(message, cause);
	}
}

export class ChatMessageValidationError extends ChatServiceError {
	readonly code = "CHAT_MESSAGE_VALIDATION_ERROR";
	readonly statusCode = 400;

	constructor(message: string, cause?: Error) {
		super(`Message validation failed: ${message}`, cause);
	}
}

export class ChatConnectionError extends ChatServiceError {
	readonly code = "CHAT_CONNECTION_ERROR";
	readonly statusCode = 500;

	constructor(message: string, cause?: Error) {
		super(`Chat connection error: ${message}`, cause);
	}
}

export class ChatRateLimitError extends ChatServiceError {
	readonly code = "CHAT_RATE_LIMIT_ERROR";
	readonly statusCode = 429;

	constructor(message = "Chat rate limit exceeded", cause?: Error) {
		super(message, cause);
	}
}

export class ChatSessionExpiredError extends ChatServiceError {
	readonly code = "CHAT_SESSION_EXPIRED";
	readonly statusCode = 401;

	constructor(sessionId: string, cause?: Error) {
		super(`Chat session expired: ${sessionId}`, cause);
	}
}
