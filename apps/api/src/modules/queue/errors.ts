/**
 * Custom Error Classes for Queue Services
 * Provides better error categorization and handling
 */

export abstract class QueueServiceError extends Error {
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

export class JobNotFoundError extends QueueServiceError {
	readonly code = "JOB_NOT_FOUND";
	readonly statusCode = 404;

	constructor(jobId: string, cause?: Error) {
		super(`Job not found: ${jobId}`, cause);
	}
}

export class JobTimeoutError extends QueueServiceError {
	readonly code = "JOB_TIMEOUT";
	readonly statusCode = 408;

	constructor(jobId: string, timeout: number, cause?: Error) {
		super(`Job ${jobId} timed out after ${timeout}ms`, cause);
	}
}

export class JobAlreadyCompletedError extends QueueServiceError {
	readonly code = "JOB_ALREADY_COMPLETED";
	readonly statusCode = 409;

	constructor(jobId: string, cause?: Error) {
		super(`Job ${jobId} is already completed`, cause);
	}
}

export class QueueCapacityError extends QueueServiceError {
	readonly code = "QUEUE_CAPACITY_EXCEEDED";
	readonly statusCode = 503;

	constructor(message = "Queue capacity exceeded", cause?: Error) {
		super(message, cause);
	}
}

export class BatchNotFoundError extends QueueServiceError {
	readonly code = "BATCH_NOT_FOUND";
	readonly statusCode = 404;

	constructor(batchId: string, cause?: Error) {
		super(`Batch not found: ${batchId}`, cause);
	}
}

export class InvalidJobDataError extends QueueServiceError {
	readonly code = "INVALID_JOB_DATA";
	readonly statusCode = 400;

	constructor(message: string, cause?: Error) {
		super(`Invalid job data: ${message}`, cause);
	}
}

export class QueueProcessingError extends QueueServiceError {
	readonly code = "QUEUE_PROCESSING_ERROR";
	readonly statusCode = 500;

	constructor(message: string, cause?: Error) {
		super(`Queue processing error: ${message}`, cause);
	}
}
