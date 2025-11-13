/**
 * AI Service Types
 * Type definitions for AI generation and queue operations
 */

export interface AIGenerationRequest {
	mindmapId: string;
	nodeId: string;
	customQuery?: string;
}

export interface AIGenerationResponse {
	generatedContent: string;
	searchQuery: string;
	sources: Array<{ title: string; url: string }>;
	mcpToolsUsed: string[];
}

export interface QueueJobRequest<T = any> {
	data: T;
	priority?: number;
	timeout?: number;
}

export interface QueueJobStatus {
	jobId: string;
	status: "pending" | "processing" | "completed" | "failed" | "cancelled";
	result?: any;
	error?: string;
	createdAt: Date;
	startedAt?: Date;
	completedAt?: Date;
}

export interface QueueBatchRequest<T = any> {
	items: T[];
	options?: {
		priority?: number;
		timeout?: number;
	};
}

export interface QueueBatchStatus {
	batchId: string;
	status: "queued" | "processing" | "completed" | "failed";
	progress: {
		completed: number;
		total: number;
		failed: number;
		currentJob?: string;
	};
	results: Array<{
		jobId: string;
		status: string;
		result?: any;
		error?: string;
	}>;
}

export interface QueueStats {
	pending: number;
	processing: number;
	completed: number;
	failed: number;
	total: number;
}
