import { initTRPC } from "@trpc/server";
import { container } from "tsyringe";
/**
 * AI Router - Enhanced tRPC procedures with rate limiting and comprehensive error handling
 */
import { z } from "zod";
import { logger } from "../../modules/logger/core/logger.js";
import { RateLimitPresets } from "../../utils/rateLimiter.js";
import { JobNotFoundError, QueueServiceError } from "../queue/errors.js";
import { QueueService } from "../queue/service.js";
import { AIQuotaExceededError, AIServiceError } from "./errors.js";
import { AIService } from "./service.js";

const t = initTRPC.create();

// Define context type with optional user
interface RateLimitStatus {
	messageLimit: { allowed: boolean; remaining: number; resetTime: Date } | null;
	connectionLimit: { allowed: boolean; remaining: number; resetTime: Date } | null;
}

interface AuthenticatedContext {
	user?: {
		sub: string;
		name?: string;
		preferredUsername?: string;
	};
	rateLimit?: RateLimitStatus;
}

/**
 * Input Schemas
 */
const GenerateAIContentSchema = z.object({
	mindmapId: z.string().min(1, "MindMap ID is required"),
	nodeId: z.string().min(1, "Node ID is required"),
	customQuery: z.string().max(1000, "Custom query too long").optional(),
});

const BatchGenerateAIContentSchema = z.object({
	requests: z.array(GenerateAIContentSchema).max(10, "Batch size too large (max 10)"),
});

const AddQueueJobSchema = z.object({
	data: z.any(),
	priority: z.number().min(1).max(10).optional().default(5),
});

const ProcessQueueJobSchema = z.object({
	data: z.any(),
	priority: z.number().min(1).max(10).optional().default(5),
	timeout: z.number().min(1000).max(300000).optional().default(30000),
});

const ProcessQueueBatchSchema = z.object({
	items: z.array(z.any()).min(1, "Items cannot be empty").max(50, "Batch size too large (max 50)"),
	options: z
		.object({
			priority: z.number().min(1).max(10).optional().default(5),
		})
		.optional(),
});

const GetQueueJobStatusSchema = z.object({
	jobId: z.string().min(1, "Job ID is required"),
});

const GetQueueBatchStatusSchema = z.object({
	batchId: z.string().min(1, "Batch ID is required"),
});

const CancelQueueJobSchema = z.object({
	jobId: z.string().min(1, "Job ID is required"),
});

/**
 * Rate limiting middleware
 */
const withAIRateLimit = t.middleware(async ({ next, ctx }: { next: () => Promise<unknown>; ctx: AuthenticatedContext }) => {
	const identifier = ctx.user?.sub || "anonymous";
	const rateLimitResult = RateLimitPresets.aiGeneration.checkLimit(identifier);

	if (!rateLimitResult.allowed) {
		throw new AIQuotaExceededError("AI generation rate limit exceeded");
	}

	// biome-ignore lint/suspicious/noExplicitAny: tRPC middleware integration
	return next() as any;
});

const withQueueRateLimit = t.middleware(async ({ next, ctx }: { next: () => Promise<unknown>; ctx: AuthenticatedContext }) => {
	const identifier = ctx.user?.sub || "anonymous";
	const rateLimitResult = RateLimitPresets.queueOperations.checkLimit(identifier);

	if (!rateLimitResult.allowed) {
		throw new Error("Queue operations rate limit exceeded");
	}

	// biome-ignore lint/suspicious/noExplicitAny: tRPC middleware integration
	return next() as any;
});

/**
 * Error handling middleware
 */
const withErrorHandling = t.middleware(async ({ next }: { next: () => Promise<unknown> }) => {
	try {
		return (await next()) as any;
	} catch (error) {
		if (error instanceof AIServiceError || error instanceof QueueServiceError) {
			// Re-throw our custom errors with proper status codes
			throw error;
		}

		// Handle unexpected errors
		console.error("Unexpected error in AI router:", error);
		throw new Error("Internal server error");
	}
});

/**
 * Create router with middleware
 */
const createRouter = () => {
	const baseRouter = t.router;
	const authed = t.procedure.use(withErrorHandling);

	return baseRouter({
		/**
		 * AI Content Generation
		 */
		generateContent: authed
			.input(GenerateAIContentSchema)
			.use(withAIRateLimit)
			.mutation(async ({ input, ctx }: { input: any; ctx: AuthenticatedContext }) => {
				const { mindmapId, nodeId, customQuery } = input;
				const userId = Number.parseInt(ctx.user?.sub || "0");

				const aiService = container.resolve(AIService);

				logger.info(`[AI Router] Generating content for user ${userId}`, {
					mindmapId,
					nodeId,
					hasCustomQuery: !!customQuery,
				});

				return await aiService.generateAIContent(input, userId);
			}),

		/**
		 * Batch AI Content Generation
		 */
		batchGenerateContent: authed
			.input(BatchGenerateAIContentSchema)
			.use(withAIRateLimit)
			.mutation(async ({ input, ctx }: { input: any; ctx: AuthenticatedContext }) => {
				const { requests } = input;
				const userId = Number.parseInt(ctx.user?.sub || "0");

				const aiService = container.resolve(AIService);

				logger.info(`[AI Router] Batch generating content for user ${userId}`, {
					requestCount: requests.length,
				});

				return await aiService.batchGenerateAIContent(requests, userId);
			}),

		/**
		 * Get AI Service Status
		 */
		getStatus: authed.query(async () => {
			const aiService = container.resolve(AIService);
			return aiService.getStatus();
		}),

		/**
		 * Queue Operations
		 */
		addQueueJob: authed
			.input(AddQueueJobSchema)
			.use(withQueueRateLimit)
			.mutation(async ({ input, ctx }: { input: any; ctx: AuthenticatedContext }) => {
				const { data, priority } = input;
				const userId = Number.parseInt(ctx.user?.sub || "0");

				const queueService = container.resolve(QueueService);

				logger.info(`[AI Router] Adding job for user ${userId}`, {
					priority,
					dataType: typeof data,
				});

				const jobId = await queueService.addJob(data, priority, userId);

				return {
					jobId,
					status: "queued",
					message: "Job added to queue successfully",
				};
			}),

		getQueueJobStatus: authed
			.input(GetQueueJobStatusSchema)
			.use(withQueueRateLimit)
			.query(async ({ input }) => {
				const { jobId } = input;

				const queueService = container.resolve(QueueService);

				logger.debug(`[AI Router] Getting job status: ${jobId}`);

				return queueService.getJobStatus(jobId);
			}),

		waitForQueueJob: authed
			.input(
				GetQueueJobStatusSchema.extend({
					timeout: z.number().min(1000).max(300000).optional().default(30000),
				})
			)
			.use(withQueueRateLimit)
			.mutation(async ({ input }) => {
				const { jobId, timeout } = input;

				const queueService = container.resolve(QueueService);

				logger.info(`[AI Router] Waiting for job: ${jobId}`, { timeout });

				const result = await queueService.waitForJob(jobId, timeout);

				return {
					jobId,
					status: "completed",
					result,
					message: "Job completed successfully",
				};
			}),

		processQueueJob: authed
			.input(ProcessQueueJobSchema)
			.use(withQueueRateLimit)
			.mutation(async ({ input, ctx }: { input: any; ctx: AuthenticatedContext }) => {
				const { data, priority, timeout } = input;
				const userId = Number.parseInt(ctx.user?.sub || "0");

				const queueService = container.resolve(QueueService);

				logger.info(`[AI Router] Processing job for user ${userId}`, {
					priority,
					timeout,
				});

				const result = await queueService.processJob(data, priority, timeout, userId);

				return {
					status: "completed",
					result,
					message: "Job processed successfully",
				};
			}),

		processQueueBatch: authed
			.input(ProcessQueueBatchSchema)
			.use(withQueueRateLimit)
			.mutation(async ({ input, ctx }: { input: any; ctx: AuthenticatedContext }) => {
				const { items, options } = input;
				const userId = Number.parseInt(ctx.user?.sub || "0");

				const queueService = container.resolve(QueueService);

				logger.info(`[AI Router] Processing batch for user ${userId}`, {
					itemCount: items.length,
					priority: options?.priority,
				});

				const batchResult = await queueService.processBatch(items, options, userId);

				return {
					...batchResult,
					message: "Batch processing started successfully",
				};
			}),

		getQueueBatchStatus: authed
			.input(GetQueueBatchStatusSchema)
			.use(withQueueRateLimit)
			.query(async ({ input }) => {
				const { batchId } = input;

				const queueService = container.resolve(QueueService);

				logger.debug(`[AI Router] Getting batch status: ${batchId}`);

				return await queueService.getBatchStatus(batchId);
			}),

		getQueueStats: authed.use(withQueueRateLimit).query(async () => {
			const queueService = container.resolve(QueueService);

			logger.debug("[AI Router] Getting queue statistics");

			return queueService.getQueueStats();
		}),

		cancelQueueJob: authed
			.input(CancelQueueJobSchema)
			.use(withQueueRateLimit)
			.mutation(async ({ input }) => {
				const { jobId } = input;

				const queueService = container.resolve(QueueService);

				logger.info(`[AI Router] Cancelling job: ${jobId}`);

				const cancelled = queueService.cancelJob(jobId);

				if (!cancelled) {
					throw new JobNotFoundError(jobId);
				}

				return {
					jobId,
					status: "cancelled",
					message: "Job cancelled successfully",
				};
			}),

		/**
		 * Health and Monitoring
		 */
		getHealthStatus: authed.query(async () => {
			const queueService = container.resolve(QueueService);

			return {
				ai: container.resolve(AIService).getStatus(),
				queue: queueService.getHealthStatus(),
				timestamp: new Date().toISOString(),
				uptime: process.uptime(),
			};
		}),
	});
};

export const aiRouter = createRouter();
