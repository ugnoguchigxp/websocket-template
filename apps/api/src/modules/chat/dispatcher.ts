/**
 * Enhanced WebSocket Chat Dispatcher
 * Production-ready with rate limiting, security, and monitoring
 */
import { injectable } from "tsyringe";
import { WebSocket } from "ws";
import { logger } from "../../modules/logger/core/logger.js";
import type { ContextUser } from "../../routers/index.js";
import { RateLimiter, type RateLimitResult } from "../../utils/rateLimiter.js";
import {
	ChatAuthenticationError,
	ChatConnectionError,
	ChatMessageValidationError,
	ChatRateLimitError,
	ChatServiceError,
	ChatSessionExpiredError,
} from "./errors.js";

interface ChatSession {
	id: string;
	user: ContextUser;
	ws: WebSocket;
	createdAt: Date;
	lastActivity: Date;
	messageCount: number;
	ipAddress?: string;
	userAgent?: string;
}

interface ChatMessageMetadata {
	[key: string]: unknown;
}

interface ChatMessage {
	type: "user_message" | "response_chunk" | "response_complete" | "error" | "ping" | "pong";
	sessionId: string;
	content?: string;
	metadata?: ChatMessageMetadata;
	timestamp: Date;
	messageId?: string;
}

interface ChatMetrics {
	totalSessions: number;
	activeSessions: number;
	totalMessages: number;
	errorsCount: number;
	averageSessionDuration: number;
}

@injectable()
export class ChatDispatcher {
	private sessions = new Map<string, ChatSession>();
	private messageHandlers = new Map<string, (message: ChatMessage) => void>();
	private metrics: ChatMetrics = {
		totalSessions: 0,
		activeSessions: 0,
		totalMessages: 0,
		errorsCount: 0,
		averageSessionDuration: 0,
	};

	// Rate limiting
	private messageRateLimiter = new RateLimiter({
		windowMs: 60 * 1000, // 1 minute
		maxRequests: 30, // 30 messages per minute
	});

	private connectionRateLimiter = new RateLimiter({
		windowMs: 60 * 1000, // 1 minute
		maxRequests: 5, // 5 connections per minute
		keyGenerator: (identifier: string) => `conn:${identifier}`,
	});

	// Configuration
	private readonly maxSessionDuration = 2 * 60 * 60 * 1000; // 2 hours
	private readonly maxMessageSize = 10 * 1024; // 10KB
	private readonly cleanupIntervalMs = 5 * 60 * 1000; // 5 minutes
	private cleanupInterval?: NodeJS.Timeout;

	constructor() {
		logger.info("[ChatDispatcher] Enhanced dispatcher initialized");
		this.startPeriodicCleanup();
	}

	/**
	 * Register a new WebSocket connection
	 */
	registerConnection(
		ws: WebSocket,
		user: ContextUser,
		metadata?: { ipAddress?: string; userAgent?: string } | undefined
	): string {
		try {
			// Rate limit connections
			const rateLimitResult = this.connectionRateLimiter.checkLimit(user.sub);
			if (!rateLimitResult.allowed) {
				throw new ChatRateLimitError("Connection rate limit exceeded");
			}

			const sessionId = this.generateSessionId();

			const session: ChatSession = {
				id: sessionId,
				user,
				ws,
				createdAt: new Date(),
				lastActivity: new Date(),
				messageCount: 0,
				ipAddress: metadata?.ipAddress,
				userAgent: metadata?.userAgent,
			};

			this.sessions.set(sessionId, session);
			this.metrics.totalSessions++;
			this.metrics.activeSessions++;

			// Set up WebSocket message handler
			ws.on("message", (data) => {
				this.handleWebSocketMessage(sessionId, data);
			});

			ws.on("close", (code, reason) => {
				this.unregisterConnection(sessionId, code, reason?.toString());
			});

			ws.on("error", (error) => {
				logger.error(`[ChatDispatcher] WebSocket error for session ${sessionId}:`, error as Error);
				this.unregisterConnection(sessionId, 1006, "WebSocket error");
			});

			// Send welcome message
			this.sendMessage(sessionId, {
				type: "response_complete",
				sessionId,
				content: `Welcome to Socket Chat! Connected as ${user.preferredUsername || user.name || user.sub}`,
				timestamp: new Date(),
				messageId: this.generateMessageId(),
			});

			logger.info(`[ChatDispatcher] Connection registered: ${sessionId} for user ${user.sub}`, {
				ipAddress: metadata?.ipAddress,
				userAgent: metadata?.userAgent,
				totalSessions: this.metrics.totalSessions,
				activeSessions: this.metrics.activeSessions,
			});

			return sessionId;
		} catch (error) {
			logger.error("[ChatDispatcher] Failed to register connection:", error as Error);
			if (error instanceof ChatServiceError) {
				throw error;
			}
			throw new ChatConnectionError("Failed to register connection", error as Error);
		}
	}

	/**
	 * Unregister a WebSocket connection
	 */
	unregisterConnection(sessionId: string, code?: number, reason?: string): void {
		const session = this.sessions.get(sessionId);
		if (session) {
			const sessionDuration = Date.now() - session.createdAt.getTime();

			this.sessions.delete(sessionId);
			this.metrics.activeSessions--;

			// Update average session duration
			this.updateAverageSessionDuration(sessionDuration);

			// Clean up message handlers
			this.messageHandlers.delete(sessionId);

			logger.info(`[ChatDispatcher] Connection unregistered: ${sessionId}`, {
				code,
				reason,
				sessionDuration: Math.round(sessionDuration / 1000),
				messageCount: session.messageCount,
				activeSessions: this.metrics.activeSessions,
			});
		}
	}

	/**
	 * Handle incoming WebSocket message
	 */
	private handleWebSocketMessage(sessionId: string, data: Buffer | string | ArrayBuffer | Buffer[]): void {
		try {
			// Validate message size
			const dataSize = Buffer.isBuffer(data)
				? data.length
				: Array.isArray(data)
					? data.length
					: data instanceof ArrayBuffer
						? data.byteLength
						: String(data).length;

			if (dataSize > this.maxMessageSize) {
				throw new ChatMessageValidationError(
					`Message too large (max ${this.maxMessageSize} bytes)`
				);
			}

			const message = this.parseMessage(data);

			// Validate message structure
			this.validateMessage(message);

			// Update session activity
			const session = this.sessions.get(sessionId);
			if (session) {
				session.lastActivity = new Date();
				session.messageCount++;
				this.metrics.totalMessages++;
			}

			// Check session expiration
			if (session && Date.now() - session.createdAt.getTime() > this.maxSessionDuration) {
				throw new ChatSessionExpiredError(sessionId);
			}

			// Rate limit messages
			const rateLimitResult = this.messageRateLimiter.checkLimit(sessionId);
			if (!rateLimitResult.allowed) {
				throw new ChatRateLimitError("Message rate limit exceeded");
			}

			logger.debug(`[ChatDispatcher] Received message from ${sessionId}:`, {
				type: message.type,
				contentLength: message.content?.length || 0,
				messageCount: session?.messageCount,
			});

			// Process message based on type
			this.processMessage(sessionId, message);
		} catch (error) {
			this.metrics.errorsCount++;

			if (error instanceof ChatServiceError) {
				logger.error(`[ChatDispatcher] Chat error for session ${sessionId}:`, error);
				this.sendError(sessionId, error.message, error.code);

				// Close connection for certain error types
				if (error instanceof ChatSessionExpiredError || error instanceof ChatAuthenticationError) {
					this.closeSession(sessionId, 4001, error.message);
				}
			} else {
				logger.error(`[ChatDispatcher] Error handling message from ${sessionId}:`, error as Error);
				this.sendError(sessionId, "Internal server error", "INTERNAL_ERROR");
			}
		}
	}

	/**
	 * Parse and validate message
	 */
	private parseMessage(data: Buffer | string | ArrayBuffer | Buffer[]): ChatMessage {
		// biome-ignore lint/suspicious/noExplicitAny: JSON.parse returns unknown type
		let message: any;

		try {
			let dataStr: string;
			if (typeof data === "string") {
				dataStr = data;
			} else if (data instanceof ArrayBuffer) {
				dataStr = new TextDecoder().decode(data);
			} else if (Array.isArray(data)) {
				dataStr = Buffer.concat(data).toString();
			} else {
				dataStr = data.toString();
			}
			message = JSON.parse(dataStr);
		} catch (_error) {
			throw new ChatMessageValidationError("Invalid JSON format");
		}

		return {
			type: message.type,
			sessionId: message.sessionId,
			content: message.content,
			metadata: message.metadata,
			timestamp: new Date(),
			messageId: message.messageId || this.generateMessageId(),
		};
	}

	/**
	 * Validate message structure
	 */
	private validateMessage(message: ChatMessage): void {
		if (!message.type || typeof message.type !== "string") {
			throw new ChatMessageValidationError("Message type is required");
		}

		const validTypes = [
			"user_message",
			"response_chunk",
			"response_complete",
			"error",
			"ping",
			"pong",
		];
		if (!validTypes.includes(message.type)) {
			throw new ChatMessageValidationError(`Invalid message type: ${message.type}`);
		}

		if (message.content && typeof message.content !== "string") {
			throw new ChatMessageValidationError("Message content must be a string");
		}

		if (message.content && message.content.length > 5000) {
			throw new ChatMessageValidationError("Message content too long (max 5000 characters)");
		}
	}

	/**
	 * Process message based on type
	 */
	private processMessage(sessionId: string, message: ChatMessage): void {
		switch (message.type) {
			case "user_message":
				this.handleUserMessage(sessionId, message);
				break;

			case "ping":
				this.sendMessage(sessionId, {
					type: "pong",
					sessionId,
					timestamp: new Date(),
					messageId: this.generateMessageId(),
				});
				break;

			case "pong":
				// Handle pong response (keep-alive)
				break;

			default:
				logger.warn(`[ChatDispatcher] Unhandled message type: ${message.type}`);
		}
	}

	/**
	 * Handle user message and generate AI response
	 */
	private async handleUserMessage(sessionId: string, message: ChatMessage): Promise<void> {
		const userMessage = message.content || "";

		logger.info(`[ChatDispatcher] Processing user message from ${sessionId}:`, {
			contentLength: userMessage.length,
			preview: userMessage.substring(0, 100),
		});

		try {
			// Simulate thinking time
			await new Promise((resolve) => setTimeout(resolve, 300));

			// Generate response
			const response = this.generateResponse(userMessage);

			// Send response in chunks for better UX
			await this.sendChunkedResponse(sessionId, response);
		} catch (error) {
			logger.error("[ChatDispatcher] Failed to process user message:", error as Error);
			this.sendError(sessionId, "Failed to process message", "PROCESSING_ERROR");
		}
	}

	/**
	 * Generate AI response (enhanced mock)
	 */
	private generateResponse(userMessage: string): string {
		const responses = [
			`I understand you said: "${userMessage}". This is an enhanced response from the Socket Chat system with improved error handling and rate limiting.`,
			`That's interesting! You mentioned: "${userMessage}". Let me help you with that. Our chat system now includes better security and monitoring.`,
			`Thank you for your message: "${userMessage}". Here's what I think about it... This response is generated with rate limiting and session management.`,
			`I received your message: "${userMessage}". This is a demonstration of the enhanced WebSocket chat functionality with comprehensive error handling.`,
		];

		return responses[Math.floor(Math.random() * responses.length)];
	}

	/**
	 * Send response in chunks
	 */
	private async sendChunkedResponse(sessionId: string, response: string): Promise<void> {
		const words = response.split(" ");
		const chunkSize = 5;

		for (let i = 0; i < words.length; i += chunkSize) {
			const chunk = words.slice(i, i + chunkSize).join(" ");

			this.sendMessage(sessionId, {
				type: "response_chunk",
				sessionId,
				content: chunk,
				timestamp: new Date(),
				messageId: this.generateMessageId(),
			});

			// Small delay between chunks
			if (i + chunkSize < words.length) {
				await new Promise((resolve) => setTimeout(resolve, 80));
			}
		}

		// Send completion message
		this.sendMessage(sessionId, {
			type: "response_complete",
			sessionId,
			content: "Response completed",
			metadata: { totalWords: words.length },
			timestamp: new Date(),
			messageId: this.generateMessageId(),
		});
	}

	/**
	 * Send error message
	 */
	private sendError(sessionId: string, message: string, code: string): void {
		this.sendMessage(sessionId, {
			type: "error",
			sessionId,
			content: message,
			metadata: { code },
			timestamp: new Date(),
			messageId: this.generateMessageId(),
		});
	}

	/**
	 * Send message to specific WebSocket session
	 */
	sendMessage(sessionId: string, message: ChatMessage): boolean {
		const session = this.sessions.get(sessionId);
		if (!session || session.ws.readyState !== WebSocket.OPEN) {
			logger.warn(`[ChatDispatcher] Cannot send message to session ${sessionId}: not connected`);
			return false;
		}

		try {
			const messageData = JSON.stringify(message);
			session.ws.send(messageData);

			logger.debug(`[ChatDispatcher] Message sent to ${sessionId}:`, {
				type: message.type,
				size: messageData.length,
			});
			return true;
		} catch (error) {
			logger.error(`[ChatDispatcher] Error sending message to ${sessionId}:`, {
				error: error instanceof Error ? error.message : String(error),
			});
			return false;
		}
	}

	/**
	 * Close session
	 */
	private closeSession(sessionId: string, code: number, reason: string): void {
		const session = this.sessions.get(sessionId);
		if (session && session.ws.readyState === WebSocket.OPEN) {
			try {
				session.ws.close(code, reason);
			} catch (error) {
				logger.warn(`[ChatDispatcher] Error closing session ${sessionId}:`, {
					error: error instanceof Error ? error.message : String(error),
				});
			}
		}
	}

	/**
	 * Broadcast message to all active sessions
	 */
	broadcast(message: Omit<ChatMessage, "sessionId">): number {
		let sentCount = 0;

		for (const sessionId of this.sessions.keys()) {
			if (this.sendMessage(sessionId, { ...message, sessionId })) {
				sentCount++;
			}
		}

		logger.info(`[ChatDispatcher] Broadcast sent to ${sentCount}/${this.sessions.size} sessions`);
		return sentCount;
	}

	/**
	 * Get active sessions count
	 */
	getActiveSessionsCount(): number {
		return this.sessions.size;
	}

	/**
	 * Get session info
	 */
	getSessionInfo(sessionId: string): Omit<ChatSession, "ws"> | null {
		const session = this.sessions.get(sessionId);
		if (!session) return null;

		const { ws, ...sessionInfo } = session;
		return sessionInfo;
	}

	/**
	 * Get metrics
	 */
	getMetrics(): ChatMetrics {
		return { ...this.metrics };
	}

	/**
	 * Get rate limit status
	 */
	getRateLimitStatus(sessionId: string): {
		messageLimit: RateLimitResult | null;
		connectionLimit: RateLimitResult | null;
	} | null {
		const session = this.sessions.get(sessionId);
		if (!session) return null;

		return {
			messageLimit: this.messageRateLimiter.getStatus(sessionId),
			connectionLimit: this.connectionRateLimiter.getStatus(session.user.sub),
		};
	}

	/**
	 * Clean up inactive sessions
	 */
	cleanupInactiveSessions(maxInactiveMinutes = 30): number {
		const cutoff = new Date(Date.now() - maxInactiveMinutes * 60 * 1000);
		let cleanedCount = 0;

		for (const [sessionId, session] of this.sessions.entries()) {
			if (
				session.lastActivity < cutoff ||
				Date.now() - session.createdAt.getTime() > this.maxSessionDuration
			) {
				this.closeSession(sessionId, 4000, "Session inactive or expired");
				this.unregisterConnection(sessionId, 4000, "Session inactive or expired");
				cleanedCount++;
			}
		}

		if (cleanedCount > 0) {
			logger.info(`[ChatDispatcher] Cleaned up ${cleanedCount} inactive sessions`);
		}

		return cleanedCount;
	}

	/**
	 * Start periodic cleanup
	 */
	private startPeriodicCleanup(): void {
		this.cleanupInterval = setInterval(() => {
			this.cleanupInactiveSessions();
		}, this.cleanupIntervalMs);
	}

	/**
	 * Update average session duration
	 */
	private updateAverageSessionDuration(newDuration: number): void {
		if (this.metrics.totalSessions === 1) {
			this.metrics.averageSessionDuration = newDuration;
		} else {
			this.metrics.averageSessionDuration =
				(this.metrics.averageSessionDuration * (this.metrics.totalSessions - 1) + newDuration) /
				this.metrics.totalSessions;
		}
	}

	/**
	 * Generate unique session ID
	 */
	private generateSessionId(): string {
		return `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	}

	/**
	 * Generate unique message ID
	 */
	private generateMessageId(): string {
		return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	}

	/**
	 * Get health status
	 */
	getHealthStatus(): {
		status: "healthy" | "degraded" | "unhealthy";
		activeSessions: number;
		totalMessages: number;
		errorsCount: number;
		averageSessionDuration: number;
		memoryUsage: number;
	} {
		const memoryUsage = this.sessions.size * 1000; // Approximate bytes per session
		const errorRate =
			this.metrics.totalMessages > 0 ? this.metrics.errorsCount / this.metrics.totalMessages : 0;

		let status: "healthy" | "degraded" | "unhealthy" = "healthy";
		if (errorRate > 0.1) status = "unhealthy";
		else if (errorRate > 0.05 || this.sessions.size > 100) status = "degraded";

		return {
			status,
			activeSessions: this.sessions.size,
			totalMessages: this.metrics.totalMessages,
			errorsCount: this.metrics.errorsCount,
			averageSessionDuration: Math.round(this.metrics.averageSessionDuration / 1000),
			memoryUsage,
		};
	}

	/**
	 * Shutdown dispatcher
	 */
	shutdown(): void {
		logger.info("[ChatDispatcher] Enhanced dispatcher shutting down...");

		// Stop cleanup interval
		if (this.cleanupInterval) {
			clearInterval(this.cleanupInterval);
		}

		// Close all WebSocket connections
		for (const [sessionId, session] of this.sessions.entries()) {
			try {
				session.ws.close(1001, "Server shutdown");
			} catch (error) {
				logger.warn(`[ChatDispatcher] Error closing session ${sessionId}:`, {
					error: error instanceof Error ? error.message : String(error),
				});
			}
		}

		// Cleanup
		this.sessions.clear();
		this.messageHandlers.clear();

		// Shutdown rate limiters
		this.messageRateLimiter.shutdown();
		this.connectionRateLimiter.shutdown();

		logger.info("[ChatDispatcher] Enhanced dispatcher shutdown complete");
	}
}
