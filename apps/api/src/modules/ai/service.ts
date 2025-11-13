import type { PrismaClient } from "@prisma/client";
import OpenAI from "openai";
import { inject, injectable } from "tsyringe";
import { logger } from "../../modules/logger/core/logger.js";
import type { AIGenerationRequest, AIGenerationResponse } from "../../types/ai.js";
import type { KnowledgeNodeResponse } from "../../types/mindmap.js";
import { MindMapService } from "../mindmap/service.js";
import {
	AIConfigurationError,
	AIContentValidationError,
	AIGenerationError,
	AIMindMapNotFoundError,
	AINodeNotFoundError,
	AIQuotaExceededError,
	AIServiceError,
} from "./errors.js";

@injectable()
export class AIService {
	private openai: OpenAI | null = null;
	private readonly maxRetries = 3;
	private readonly timeout = 30000; // 30 seconds

	constructor(
		@inject("PrismaClient") private prisma: PrismaClient,
		@inject(MindMapService) private mindMapService: MindMapService
	) {
		this.initializeOpenAI();
	}

	/**
	 * Initialize OpenAI client
	 */
	private initializeOpenAI(): void {
		try {
			const apiKey = process.env.OPENAI_API_KEY;
			const baseURL = process.env.OPENAI_BASE_URL;

			if (!apiKey) {
				logger.warn("[AI Service] OpenAI API key not configured, using mock mode");
				return;
			}

			this.openai = new OpenAI({
				apiKey,
				baseURL: baseURL || undefined,
				timeout: this.timeout,
			});

			logger.info("[AI Service] OpenAI client initialized successfully");
		} catch (error) {
			logger.error("[AI Service] Failed to initialize OpenAI client", error);
		}
	}

	/**
	 * Generate AI content for a single request
	 */
	async generateAIContent(
		request: AIGenerationRequest,
		userId?: number
	): Promise<AIGenerationResponse> {
		try {
			const { mindmapId, nodeId, customQuery } = request;

			logger.debug("[AI Service] Starting AI generation", { mindmapId, nodeId, customQuery });

			// Validate mindmap and node exist
			const mindmapStructure = await this.mindMapService.getMindMapById(mindmapId, userId);
			if (!mindmapStructure) {
				throw new AIMindMapNotFoundError(mindmapId);
			}

			// Get the full structure with nodes
			const fullStructure = await this.mindMapService.getMindMapStructure(mindmapId, userId);
			if (!fullStructure) {
				throw new AIMindMapNotFoundError(mindmapId);
			}

			const node = fullStructure.nodes.find((n: KnowledgeNodeResponse) => n.id === nodeId);
			if (!node) {
				throw new AINodeNotFoundError(nodeId);
			}

			// Generate content using AI
			const result = this.openai
				? await this.generateWithOpenAI(mindmapStructure.title, node.title, customQuery)
				: await this.generateWithMockAI(mindmapStructure.title, node.title, customQuery);

			// Store generated content using storage provider
			await this.storeGeneratedContent(node, result.generatedContent);

			// Update AI flag on node
			await this.mindMapService.updateKnowledgeNode(nodeId, {
				aiGenerated: true,
			});

			logger.info(`[AI Service] AI generation completed for node: ${nodeId}`);

			return result;
		} catch (error) {
			if (error instanceof AIServiceError) {
				throw error;
			}

			throw new AIGenerationError(`Failed to generate AI content: ${String(error)}`);
		}
	}

	/**
	 * Batch generate AI content for multiple requests
	 */
	async batchGenerateAIContent(
		requests: AIGenerationRequest[],
		userId?: number
	): Promise<AIGenerationResponse[]> {
		const results: AIGenerationResponse[] = [];

		for (const request of requests) {
			try {
				const result = await this.generateAIContent(request, userId);
				results.push(result);
			} catch (error) {
				logger.error("[AI Service] Error in batch generation", error);
				// Continue with next request
			}
		}

		return results;
	}

	/**
	 * Generate content using OpenAI
	 */
	private async generateWithOpenAI(
		mindmapTitle: string,
		nodeTitle: string,
		customQuery?: string
	): Promise<AIGenerationResponse> {
		if (!this.openai) {
			throw new AIConfigurationError("OpenAI client not configured");
		}

		const prompt = `Generate comprehensive content for a node in a knowledge map.

Mind Map: ${mindmapTitle}
Node: ${nodeTitle}
${customQuery ? `Custom Query: ${customQuery}` : ""}

Please provide:
1. A brief summary (2-3 sentences)
2. Key points (3-5 bullet points)
3. Related concepts
4. References or further reading suggestions

Format the response in markdown.`;

		try {
			const response = await this.openai.chat.completions.create({
				model: "gpt-3.5-turbo",
				messages: [
					{
						role: "user",
						content: prompt,
					},
				],
				temperature: 0.7,
				max_tokens: 2000,
			});

			const generatedContent = response.choices[0]?.message?.content;
			if (!generatedContent) {
				throw new AIContentValidationError("OpenAI returned empty content");
			}

			return {
				generatedContent,
				searchQuery: nodeTitle,
				sources: [],
				mcpToolsUsed: ["openai"],
			};
		} catch (error) {
			logger.error("[AI Service] OpenAI generation failed", error);
			throw new AIGenerationError(`OpenAI generation failed: ${String(error)}`);
		}
	}

	/**
	 * Generate content using mock AI
	 */
	private async generateWithMockAI(
		mindmapTitle: string,
		nodeTitle: string,
		customQuery?: string
	): Promise<AIGenerationResponse> {
		logger.info("[AI Service] Using mock AI generation (no OpenAI configured)");

		const mockContent = `# ${nodeTitle}

## Summary
This is a mock-generated summary for "${nodeTitle}" in the "${mindmapTitle}" knowledge map.
${customQuery ? `User requested: ${customQuery}` : ""}

## Key Points
- Point 1: ${nodeTitle} is an important concept
- Point 2: It relates to the overall structure of ${mindmapTitle}
- Point 3: Consider multiple perspectives when studying this topic

## Related Concepts
- Concept A
- Concept B
- Concept C

## Further Reading
- Resource 1
- Resource 2
- Resource 3`;

		return {
			generatedContent: mockContent,
			searchQuery: nodeTitle,
			sources: [],
			mcpToolsUsed: ["mock"],
		};
	}

	/**
	 * Store generated content using the storage provider
	 */
	private async storeGeneratedContent(
		node: KnowledgeNodeResponse,
		content: string
	): Promise<void> {
		try {
			// Store content as markdown file for the node
			logger.debug("[AI Service] Storing generated content", { nodeId: node.id });

			// In a real implementation, this would save to S3, local filesystem, or database
			// For now, we're updating the node's markdown content
			if (typeof content === "string") {
				await this.mindMapService.updateKnowledgeNode(node.id, {
					markdownContent: content,
				});
			}

			logger.info("[AI Service] Content stored successfully", { nodeId: node.id });
		} catch (error) {
			logger.warn("[AI Service] Failed to store generated content", {
			error: error instanceof Error ? error.message : String(error),
		});
			// Don't throw here - generation was successful, storage is secondary
		}
	}

	/**
	 * Get AI service status
	 */
	getStatus(): {
		isConfigured: boolean;
		mode: "openai" | "mock";
	} {
		return {
			isConfigured: !!this.openai,
			mode: this.openai ? "openai" : "mock",
		};
	}
}
