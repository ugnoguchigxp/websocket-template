/**
 * Queue Repository - Database persistence for queue operations
 */

import type { PrismaClient } from "@prisma/client";
import { injectable } from "tsyringe";
import { logger } from "../../modules/logger/core/logger.js";

// Create concrete error classes to avoid abstract instantiation
class ConcreteQueueServiceError extends Error {
	constructor(message: string, cause?: Error) {
		super(message);
		this.name = "QueueServiceError";
		if (cause) {
			this.cause = cause;
		}
	}
}

class ConcreteJobNotFoundError extends Error {
	constructor(jobId: string) {
		super(`Job not found: ${jobId}`);
		this.name = "JobNotFoundError";
	}
}

class ConcreteBatchNotFoundError extends Error {
	constructor(batchId: string) {
		super(`Batch not found: ${batchId}`);
		this.name = "BatchNotFoundError";
	}
}

export interface QueueJobData {
	id: string;
	userId: number;
	data: any;
	status: "pending" | "processing" | "completed" | "failed" | "cancelled";
	priority: number;
	retryCount: number;
	maxRetries: number;
	timeoutMs: number;
	result?: any;
	error?: string;
	createdAt: Date;
	updatedAt: Date;
	startedAt?: Date;
	completedAt?: Date;
	batchId?: string;
}

export interface QueueBatchData {
	id: string;
	userId: number;
	status: "pending" | "processing" | "completed" | "failed";
	totalItems: number;
	completedItems: number;
	failedItems: number;
	options: any;
	createdAt: Date;
	updatedAt: Date;
	startedAt?: Date;
	completedAt?: Date;
}

@injectable()
export class QueueRepository {
	constructor(private prisma: PrismaClient) {}

	/**
	 * Create a new queue job
	 */
	async createJob(
		userId: number,
		data: any,
		priority = 5,
		maxRetries = 3,
		timeoutMs = 30000,
		batchId?: string
	): Promise<QueueJobData> {
		try {
			const job = await this.prisma.queueJob.create({
				data: {
					userId,
					data: JSON.stringify(data),
					priority,
					maxRetries,
					timeoutMs,
					batchId,
				},
			});

			logger.info(`[QueueRepository] Created job ${job.id} for user ${userId}`, {
				priority,
				batchId,
				dataType: typeof data,
			});

			return this.mapPrismaJobToJobData(job);
		} catch (error) {
			logger.error("[QueueRepository] Failed to create job:", error);
			throw new ConcreteQueueServiceError("Failed to create job", error as Error);
		}
	}

	/**
	 * Get job by ID
	 */
	async getJob(jobId: string): Promise<QueueJobData | null> {
		try {
			const job = await this.prisma.queueJob.findUnique({
				where: { id: jobId },
			});

			return job ? this.mapPrismaJobToJobData(job) : null;
		} catch (error) {
			logger.error(`[QueueRepository] Failed to get job ${jobId}:`, error);
			throw new ConcreteQueueServiceError("Failed to get job", error as Error);
		}
	}

	/**
	 * Update job status and metadata
	 */
	async updateJob(
		jobId: string,
		updates: Partial<{
			status: QueueJobData["status"];
			result: any;
			error: string;
			startedAt: Date;
			completedAt: Date;
			retryCount: number;
		}>
	): Promise<QueueJobData> {
		try {
			const updateData: any = {
				...updates,
				updatedAt: new Date(),
			};

			if (updates.result !== undefined) {
				updateData.result = JSON.stringify(updates.result);
			}

			const job = await this.prisma.queueJob.update({
				where: { id: jobId },
				data: updateData,
			});

			logger.debug(`[QueueRepository] Updated job ${jobId}`, {
				status: updates.status,
				hasResult: updates.result !== undefined,
				hasError: updates.error !== undefined,
			});

			return this.mapPrismaJobToJobData(job);
		} catch (error) {
			logger.error(`[QueueRepository] Failed to update job ${jobId}:`, error);
			throw new ConcreteQueueServiceError("Failed to update job", error as Error);
		}
	}

	/**
	 * Get jobs by user ID
	 */
	async getJobsByUser(
		userId: number,
		status?: QueueJobData["status"],
		limit = 50,
		offset = 0
	): Promise<QueueJobData[]> {
		try {
			const jobs = await this.prisma.queueJob.findMany({
				where: {
					userId,
					...(status && { status }),
				},
				orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
				take: limit,
				skip: offset,
			});

			return jobs.map((job) => this.mapPrismaJobToJobData(job));
		} catch (error) {
			logger.error(`[QueueRepository] Failed to get jobs for user ${userId}:`, error);
			throw new ConcreteQueueServiceError("Failed to get jobs", error as Error);
		}
	}

	/**
	 * Get pending jobs for processing
	 */
	async getPendingJobs(limit = 10): Promise<QueueJobData[]> {
		try {
			const jobs = await this.prisma.queueJob.findMany({
				where: {
					status: "pending",
				},
				orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
				take: limit,
			});

			return jobs.map((job) => this.mapPrismaJobToJobData(job));
		} catch (error) {
			logger.error("[QueueRepository] Failed to get pending jobs:", error);
			throw new ConcreteQueueServiceError("Failed to get pending jobs", error as Error);
		}
	}

	/**
	 * Delete job
	 */
	async deleteJob(jobId: string): Promise<boolean> {
		try {
			const _deleted = await this.prisma.queueJob.delete({
				where: { id: jobId },
			});

			logger.info(`[QueueRepository] Deleted job ${jobId}`);
			return true;
		} catch (error) {
			logger.error(`[QueueRepository] Failed to delete job ${jobId}:`, error);
			return false;
		}
	}

	/**
	 * Create a new batch
	 */
	async createBatch(
		userId: number,
		totalItems: number,
		options: any = {}
	): Promise<QueueBatchData> {
		try {
			const batch = await this.prisma.queueBatch.create({
				data: {
					userId,
					totalItems,
					options: JSON.stringify(options),
				},
			});

			logger.info(`[QueueRepository] Created batch ${batch.id} for user ${userId}`, {
				totalItems,
				hasOptions: Object.keys(options).length > 0,
			});

			return this.mapPrismaBatchToBatchData(batch);
		} catch (error) {
			logger.error("[QueueRepository] Failed to create batch:", error);
			throw new ConcreteQueueServiceError("Failed to create batch", error as Error);
		}
	}

	/**
	 * Get batch by ID
	 */
	async getBatch(batchId: string): Promise<QueueBatchData | null> {
		try {
			const batch = await this.prisma.queueBatch.findUnique({
				where: { id: batchId },
				include: {
					jobs: {
						orderBy: { createdAt: "asc" },
					},
				},
			});

			return batch ? this.mapPrismaBatchToBatchData(batch) : null;
		} catch (error) {
			logger.error(`[QueueRepository] Failed to get batch ${batchId}:`, error);
			throw new ConcreteQueueServiceError("Failed to get batch", error as Error);
		}
	}

	/**
	 * Update batch status and counters
	 */
	async updateBatch(
		batchId: string,
		updates: Partial<{
			status: QueueBatchData["status"];
			completedItems: number;
			failedItems: number;
			startedAt: Date;
			completedAt: Date;
		}>
	): Promise<QueueBatchData> {
		try {
			const batch = await this.prisma.queueBatch.update({
				where: { id: batchId },
				data: {
					...updates,
					updatedAt: new Date(),
				},
			});

			logger.debug(`[QueueRepository] Updated batch ${batchId}`, {
				status: updates.status,
				completedItems: updates.completedItems,
				failedItems: updates.failedItems,
			});

			return this.mapPrismaBatchToBatchData(batch);
		} catch (error) {
			logger.error(`[QueueRepository] Failed to update batch ${batchId}:`, error);
			throw new ConcreteQueueServiceError("Failed to update batch", error as Error);
		}
	}

	/**
	 * Get batch statistics
	 */
	async getBatchStats(userId?: number): Promise<{
		total: number;
		pending: number;
		processing: number;
		completed: number;
		failed: number;
	}> {
		try {
			const where = userId ? { userId } : {};

			const stats = await this.prisma.queueBatch.groupBy({
				by: ["status"],
				where,
				_count: {
					status: true,
				},
			});

			const result = {
				total: 0,
				pending: 0,
				processing: 0,
				completed: 0,
				failed: 0,
			};

			stats.forEach((stat) => {
				result.total += stat._count.status;
				result[stat.status as keyof typeof result] += stat._count.status;
			});

			return result;
		} catch (error) {
			logger.error("[QueueRepository] Failed to get batch stats:", error);
			throw new ConcreteQueueServiceError("Failed to get batch stats", error as Error);
		}
	}

	/**
	 * Cleanup old completed/failed jobs
	 */
	async cleanupOldJobs(olderThanDays = 7): Promise<number> {
		try {
			const cutoffDate = new Date();
			cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

			const result = await this.prisma.queueJob.deleteMany({
				where: {
					status: {
						in: ["completed", "failed", "cancelled"],
					},
					completedAt: {
						lt: cutoffDate,
					},
				},
			});

			logger.info(`[QueueRepository] Cleaned up ${result.count} old jobs`);
			return result.count;
		} catch (error) {
			logger.error("[QueueRepository] Failed to cleanup old jobs:", error);
			throw new ConcreteQueueServiceError("Failed to cleanup old jobs", error as Error);
		}
	}

	/**
	 * Map Prisma job to job data
	 */
	private mapPrismaJobToJobData(job: any): QueueJobData {
		return {
			id: job.id,
			userId: job.userId,
			data: JSON.parse(job.data),
			status: job.status as QueueJobData["status"],
			priority: job.priority,
			retryCount: job.retryCount,
			maxRetries: job.maxRetries,
			timeoutMs: job.timeoutMs,
			result: job.result ? JSON.parse(job.result) : undefined,
			error: job.error,
			createdAt: job.createdAt,
			updatedAt: job.updatedAt,
			startedAt: job.startedAt,
			completedAt: job.completedAt,
			batchId: job.batchId,
		};
	}

	/**
	 * Map Prisma batch to batch data
	 */
	private mapPrismaBatchToBatchData(batch: any): QueueBatchData {
		return {
			id: batch.id,
			userId: batch.userId,
			status: batch.status as QueueBatchData["status"],
			totalItems: batch.totalItems,
			completedItems: batch.completedItems,
			failedItems: batch.failedItems,
			options: JSON.parse(batch.options),
			createdAt: batch.createdAt,
			updatedAt: batch.updatedAt,
			startedAt: batch.startedAt,
			completedAt: batch.completedAt,
		};
	}
}
