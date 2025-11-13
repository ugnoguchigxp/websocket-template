import type { PrismaClient } from "@prisma/client";
/**
 * Queue Service - Enhanced job queue management with database persistence
 * Production-ready with proper error handling and monitoring
 */
import { inject, injectable } from "tsyringe";
import { logger } from "../../modules/logger/core/logger.js";
import type {
	QueueBatchRequest,
	QueueBatchStatus,
	QueueJobStatus,
	QueueStats,
} from "../../types/ai.js";
import {
	BatchNotFoundError,
	InvalidJobDataError,
	JobNotFoundError,
	JobTimeoutError,
	QueueProcessingError,
} from "./errors.js";
import { type QueueBatchData, type QueueJobData, QueueRepository } from "./repository.js";

// Helper function to safely cast unknown error to Error
function toError(error: unknown): Error {
	return error instanceof Error ? error : new Error(String(error));
}

@injectable()
export class QueueService {
	private readonly maxConcurrentJobs: number;
	private readonly jobTimeoutMs: number;
	private readonly cleanupIntervalMs: number;
	private processingJobs = new Map<string, AbortController>();
	private cleanupTimer?: NodeJS.Timeout;

	constructor(
		@inject(QueueRepository) private repository: QueueRepository,
		@inject("PrismaClient") private prisma: PrismaClient
	) {
		this.maxConcurrentJobs = Number.parseInt(process.env.QUEUE_MAX_CONCURRENT_JOBS || "10", 10);
		this.jobTimeoutMs = Number.parseInt(process.env.QUEUE_JOB_TIMEOUT_MS || "300000", 10); // 5 minutes
		this.cleanupIntervalMs = Number.parseInt(process.env.QUEUE_CLEANUP_INTERVAL_MS || "300000", 10); // 5 minutes

		// Start cleanup timer
		this.startCleanupTimer();

		logger.info("[QueueService] Initialized with database persistence", {
			maxConcurrentJobs: this.maxConcurrentJobs,
			jobTimeoutMs: this.jobTimeoutMs,
			cleanupIntervalMs: this.cleanupIntervalMs,
		});
	}

	/**
	 * Add a job to the queue
	 */
	async addJob<T>(data: T, priority = 5, userId = 0): Promise<string> {
		// Validate job data
		if (!data || typeof data !== "object") {
			throw new InvalidJobDataError("Job data must be a valid object");
		}

		try {
			// Create job in database
			const jobData = await this.repository.createJob(
				userId,
				data,
				Math.max(1, Math.min(10, priority)), // Clamp between 1-10
				3, // maxRetries
				this.jobTimeoutMs
			);

			logger.info(`[QueueService] Job added: ${jobData.id}`, {
				priority: jobData.priority,
				userId,
			});

			return jobData.id;
		} catch (error) {
			logger.error("[QueueService] Failed to add job:", toError(error));
			throw new QueueProcessingError("Failed to add job", toError(error));
		}
	}

	/**
	 * Get job status
	 */
	async getJobStatus(jobId: string): Promise<QueueJobStatus> {
		try {
			const job = await this.repository.getJob(jobId);
			if (!job) {
				throw new JobNotFoundError(jobId);
			}

			return {
				jobId: job.id,
				status: job.status,
				result: job.result,
				error: job.error,
				createdAt: job.createdAt,
				startedAt: job.startedAt,
				completedAt: job.completedAt,
			};
		} catch (error) {
			if (error instanceof JobNotFoundError) {
				throw error;
			}
			logger.error(`[QueueService] Failed to get job status ${jobId}:`, toError(error));
			throw new QueueProcessingError("Failed to get job status", toError(error));
		}
	}

	/**
	 * Wait for job completion
	 */
	async waitForJob<T>(jobId: string, timeout = this.jobTimeoutMs): Promise<T> {
		const startTime = Date.now();

		while (Date.now() - startTime < timeout) {
			try {
				const job = await this.repository.getJob(jobId);
				if (!job) {
					throw new JobNotFoundError(jobId);
				}

				if (job.status === "completed") {
					return job.result;
				}

				if (job.status === "failed") {
					throw new QueueProcessingError(job.error || "Job failed");
				}

				// Check if job has been processing too long
				if (job.startedAt && Date.now() - job.startedAt.getTime() > this.jobTimeoutMs) {
					await this.repository.updateJob(jobId, {
						status: "failed",
						error: "Job timed out",
						completedAt: new Date(),
					});
					throw new JobTimeoutError(jobId, this.jobTimeoutMs);
				}

				// Wait 100ms before checking again
				await new Promise((resolve) => setTimeout(resolve, 100));
			} catch (error) {
				if (
					error instanceof JobNotFoundError ||
					error instanceof JobTimeoutError ||
					error instanceof QueueProcessingError
				) {
					throw error;
				}
				logger.error(`[QueueService] Error waiting for job ${jobId}:`, toError(error));
				throw new QueueProcessingError("Error waiting for job", toError(error));
			}
		}

		throw new JobTimeoutError(jobId, timeout);
	}

	/**
	 * Add job and wait for completion (convenience method)
	 */
	async processJob<T>(data: T, priority = 5, timeout = this.jobTimeoutMs, userId = 0): Promise<T> {
		const jobId = await this.addJob(data, priority, userId);
		return await this.waitForJob(jobId, timeout);
	}

	/**
	 * Process batch of jobs
	 */
	async processBatch<T>(
		items: T[],
		options?: QueueBatchRequest<T>["options"],
		userId = 0
	): Promise<QueueBatchStatus> {
		if (!items || items.length === 0) {
			throw new InvalidJobDataError("Batch items cannot be empty");
		}

		if (items.length > 50) {
			throw new InvalidJobDataError("Batch size too large (max 50 items)");
		}

		logger.info(`[QueueService] Starting batch with ${items.length} items`);

		try {
			// Create batch in database
			const batchData = await this.repository.createBatch(userId, items.length, options || {});

			// Add all jobs to queue with batch ID
			const jobIds: string[] = [];
			for (const item of items) {
				const job = await this.repository.createJob(
					userId,
					item,
					options?.priority || 5,
					3, // maxRetries
					this.jobTimeoutMs,
					batchData.id // batchId
				);
				jobIds.push(job.id);
			}

			logger.info(`[QueueService] Created batch ${batchData.id} with ${jobIds.length} jobs`);

			return {
				batchId: batchData.id,
				status: "queued",
				progress: {
					completed: 0,
					total: items.length,
					failed: 0,
				},
				results: jobIds.map((jobId) => ({
					jobId,
					status: "pending",
				})),
			};
		} catch (error) {
			logger.error("[QueueService] Failed to create batch:", toError(error));
			throw new QueueProcessingError("Failed to create batch", toError(error));
		}
	}

	/**
	 * Get batch status
	 */
	async getBatchStatus(batchId: string): Promise<QueueBatchStatus> {
		try {
			const batch = await this.repository.getBatch(batchId);
			if (!batch) {
				throw new BatchNotFoundError(batchId);
			}

			// Get all jobs for this batch
			const jobs = await this.repository.getJobsByUser(batch.userId, undefined, 100, 0);
			const batchJobs = jobs.filter((job) => job.batchId === batchId);

			const results = batchJobs.map((job) => ({
				jobId: job.id,
				status: job.status,
				result: job.result,
				error: job.error,
			}));

			const completed = results.filter((r) => r.status === "completed").length;
			const failed = results.filter((r) => r.status === "failed").length;
			const processing = results.filter((r) => r.status === "processing").length;

			let batchStatus: "queued" | "processing" | "completed" | "failed";
			if (completed + failed === batch.totalItems) {
				batchStatus = failed > 0 ? "failed" : "completed";
			} else if (processing > 0 || completed > 0) {
				batchStatus = "processing";
			} else {
				batchStatus = "queued";
			}

			return {
				batchId: batch.id,
				status: batchStatus,
				progress: {
					completed,
					total: batch.totalItems,
					failed,
				},
				results,
			};
		} catch (error) {
			if (error instanceof BatchNotFoundError) {
				throw error;
			}
			logger.error(`[QueueService] Failed to get batch status ${batchId}:`, toError(error));
			throw new QueueProcessingError("Failed to get batch status", toError(error));
		}
	}

	/**
	 * Get queue statistics
	 */
	async getQueueStats(userId?: number): Promise<QueueStats> {
		try {
			const stats = await this.repository.getBatchStats(userId);

			return {
				pending: stats.pending,
				processing: stats.processing,
				completed: stats.completed,
				failed: stats.failed,
				total: stats.total,
			};
		} catch (error) {
			logger.error("[QueueService] Failed to get queue stats:", toError(error));
			throw new QueueProcessingError("Failed to get queue stats", toError(error));
		}
	}

	/**
	 * Cancel a job
	 */
	async cancelJob(jobId: string): Promise<boolean> {
		try {
			const job = await this.repository.getJob(jobId);
			if (!job || job.status !== "pending") {
				return false;
			}

			await this.repository.updateJob(jobId, {
				status: "cancelled",
				error: "Job cancelled",
				completedAt: new Date(),
			});

			logger.info(`[QueueService] Job cancelled: ${jobId}`);
			return true;
		} catch (error) {
			logger.error(`[QueueService] Failed to cancel job ${jobId}:`, error);
			return false;
		}
	}

	/**
	 * Get jobs by user
	 */
	async getJobsByUser(
		userId: number,
		status?: QueueJobData["status"],
		limit = 50,
		offset = 0
	): Promise<QueueJobStatus[]> {
		try {
			const jobs = await this.repository.getJobsByUser(userId, status, limit, offset);

			return jobs.map((job) => ({
				jobId: job.id,
				status: job.status,
				result: job.result,
				error: job.error,
				createdAt: job.createdAt,
				startedAt: job.startedAt,
				completedAt: job.completedAt,
			}));
		} catch (error) {
			logger.error(`[QueueService] Failed to get jobs for user ${userId}:`, error);
			throw new QueueProcessingError("Failed to get jobs", toError(error));
		}
	}

	/**
	 * Get batches by user
	 */
	async getBatchesByUser(
		userId: number,
		_status?: QueueBatchData["status"],
		_limit = 50,
		_offset = 0
	): Promise<QueueBatchStatus[]> {
		try {
			const _batches = await this.repository.getBatchStats(userId);

			// For now, return basic batch info
			// In a real implementation, we'd fetch detailed batch data
			return [];
		} catch (error) {
			logger.error(`[QueueService] Failed to get batches for user ${userId}:`, error);
			throw new QueueProcessingError("Failed to get batches", toError(error));
		}
	}

	/**
	 * Get health status
	 */
	async getHealthStatus(): Promise<{
		status: "healthy" | "degraded" | "unhealthy";
		activeJobs: number;
		processingJobs: number;
		completedJobs: number;
		failedJobs: number;
		uptime: number;
	}> {
		try {
			const stats = await this.getQueueStats();
			const activeJobs = stats.pending + stats.processing;

			let status: "healthy" | "degraded" | "unhealthy" = "healthy";
			if (activeJobs > this.maxConcurrentJobs * 0.8) {
				status = "degraded";
			}
			if (activeJobs > this.maxConcurrentJobs) {
				status = "unhealthy";
			}

			return {
				status,
				activeJobs,
				processingJobs: stats.processing,
				completedJobs: stats.completed,
				failedJobs: stats.failed,
				uptime: process.uptime(),
			};
		} catch (error) {
			logger.error("[QueueService] Failed to get health status:", toError(error));
			return {
				status: "unhealthy",
				activeJobs: 0,
				processingJobs: 0,
				completedJobs: 0,
				failedJobs: 0,
				uptime: process.uptime(),
			};
		}
	}

	/**
	 * Shutdown the queue service
	 */
	async shutdown(): Promise<void> {
		logger.info("[QueueService] Shutting down queue service");

		// Cancel all processing jobs
		for (const [jobId, controller] of this.processingJobs) {
			controller.abort();
			await this.cancelJob(jobId);
		}

		// Clear cleanup timer
		if (this.cleanupTimer) {
			clearInterval(this.cleanupTimer);
		}

		// Cleanup old data
		await this.repository.cleanupOldJobs();

		logger.info("[QueueService] Queue service shutdown complete");
	}

	/**
	 * Start cleanup timer
	 */
	private startCleanupTimer(): void {
		this.cleanupTimer = setInterval(async () => {
			try {
				await this.repository.cleanupOldJobs();
				logger.debug("[QueueService] Periodic cleanup completed");
			} catch (error) {
				logger.error("[QueueService] Periodic cleanup failed:", toError(error));
			}
		}, this.cleanupIntervalMs);
	}
}
