/**
 * Chat Repository - Database persistence for chat sessions and messages
 */

import type { PrismaClient } from "@prisma/client";
import { injectable } from "tsyringe";
import { logger } from "../../modules/logger/core/logger.js";

// Create concrete error classes to avoid abstract instantiation
class ConcreteChatServiceError extends Error {
	constructor(message: string, cause?: Error) {
		super(message);
		this.name = "ChatServiceError";
		if (cause) {
			this.cause = cause;
		}
	}
}

class ConcreteChatSessionNotFoundError extends Error {
	constructor(sessionId: string) {
		super(`Chat session not found: ${sessionId}`);
		this.name = "ChatSessionNotFoundError";
	}
}

export interface ChatSessionData {
	id: string;
	userId: number;
	sessionId: string;
	ipAddress?: string;
	userAgent?: string;
	status: "active" | "inactive" | "expired";
	messageCount: number;
	createdAt: Date;
	updatedAt: Date;
	lastActivityAt: Date;
}

export interface ChatMessageData {
	id: string;
	sessionId: string;
	type: "user_message" | "response_chunk" | "response_complete" | "error" | "ping" | "pong";
	content?: string;
	metadata: any;
	messageId?: string;
	timestamp: Date;
}

export interface CreateSessionOptions {
	ipAddress?: string;
	userAgent?: string;
	status?: ChatSessionData["status"];
}

@injectable()
export class ChatRepository {
	constructor(private prisma: PrismaClient) {}

	/**
	 * Create a new chat session
	 */
	async createSession(
		userId: number,
		sessionId: string,
		options: CreateSessionOptions = {}
	): Promise<ChatSessionData> {
		try {
			const session = await this.prisma.chatSession.create({
				data: {
					userId,
					sessionId,
					ipAddress: options.ipAddress,
					userAgent: options.userAgent,
					status: options.status || "active",
				},
			});

			logger.info(`[ChatRepository] Created session ${sessionId} for user ${userId}`, {
				ipAddress: options.ipAddress,
				userAgent: options.userAgent?.substring(0, 100),
			});

			return this.mapPrismaSessionToSessionData(session);
		} catch (error) {
			logger.error(`[ChatRepository] Failed to create session ${sessionId}:`, error);
			throw new ConcreteChatServiceError("Failed to create chat session", error as Error);
		}
	}

	/**
	 * Get session by ID
	 */
	async getSession(sessionId: string): Promise<ChatSessionData | null> {
		try {
			const session = await this.prisma.chatSession.findUnique({
				where: { sessionId },
			});

			return session ? this.mapPrismaSessionToSessionData(session) : null;
		} catch (error) {
			logger.error(`[ChatRepository] Failed to get session ${sessionId}:`, error);
			throw new ConcreteChatServiceError("Failed to get chat session", error as Error);
		}
	}

	/**
	 * Update session
	 */
	async updateSession(
		sessionId: string,
		updates: Partial<{
			status: ChatSessionData["status"];
			lastActivityAt: Date;
			messageCount: number;
		}>
	): Promise<ChatSessionData> {
		try {
			const session = await this.prisma.chatSession.update({
				where: { sessionId },
				data: {
					...updates,
					updatedAt: new Date(),
				},
			});

			logger.debug(`[ChatRepository] Updated session ${sessionId}`, {
				status: updates.status,
				messageCount: updates.messageCount,
			});

			return this.mapPrismaSessionToSessionData(session);
		} catch (error) {
			logger.error(`[ChatRepository] Failed to update session ${sessionId}:`, error);
			throw new ConcreteChatServiceError("Failed to update chat session", error as Error);
		}
	}

	/**
	 * Delete session
	 */
	async deleteSession(sessionId: string): Promise<boolean> {
		try {
			await this.prisma.chatSession.delete({
				where: { sessionId },
			});

			logger.info(`[ChatRepository] Deleted session ${sessionId}`);
			return true;
		} catch (error) {
			logger.error(`[ChatRepository] Failed to delete session ${sessionId}:`, error);
			return false;
		}
	}

	/**
	 * Get sessions by user ID
	 */
	async getSessionsByUser(
		userId: number,
		status?: ChatSessionData["status"],
		limit = 50,
		offset = 0
	): Promise<ChatSessionData[]> {
		try {
			const sessions = await this.prisma.chatSession.findMany({
				where: {
					userId,
					...(status && { status }),
				},
				orderBy: { lastActivityAt: "desc" },
				take: limit,
				skip: offset,
			});

			return sessions.map((session) => this.mapPrismaSessionToSessionData(session));
		} catch (error) {
			logger.error(`[ChatRepository] Failed to get sessions for user ${userId}:`, error);
			throw new ConcreteChatServiceError("Failed to get chat sessions", error as Error);
		}
	}

	/**
	 * Add message to session
	 */
	async addMessage(
		sessionId: string,
		type: ChatMessageData["type"],
		content?: string,
		metadata: any = {},
		messageId?: string
	): Promise<ChatMessageData> {
		try {
			const message = await this.prisma.chatMessage.create({
				data: {
					sessionId,
					type,
					content,
					metadata: JSON.stringify(metadata),
					messageId,
				},
			});

			// Update session message count and last activity
			await this.prisma.chatSession.update({
				where: { sessionId },
				data: {
					messageCount: { increment: 1 },
					lastActivityAt: new Date(),
					updatedAt: new Date(),
				},
			});

			logger.debug(`[ChatRepository] Added message to session ${sessionId}`, {
				type,
				hasContent: !!content,
				messageId,
			});

			return this.mapPrismaMessageToMessageData(message);
		} catch (error) {
			logger.error(`[ChatRepository] Failed to add message to session ${sessionId}:`, error);
			throw new ConcreteChatServiceError("Failed to add chat message", error as Error);
		}
	}

	/**
	 * Get messages for a session
	 */
	async getMessagesBySession(
		sessionId: string,
		type?: ChatMessageData["type"],
		limit = 100,
		offset = 0
	): Promise<ChatMessageData[]> {
		try {
			const messages = await this.prisma.chatMessage.findMany({
				where: {
					sessionId,
					...(type && { type }),
				},
				orderBy: { timestamp: "asc" },
				take: limit,
				skip: offset,
			});

			return messages.map((message) => this.mapPrismaMessageToMessageData(message));
		} catch (error) {
			logger.error(`[ChatRepository] Failed to get messages for session ${sessionId}:`, error);
			throw new ConcreteChatServiceError("Failed to get chat messages", error as Error);
		}
	}

	/**
	 * Get recent messages across all sessions
	 */
	async getRecentMessages(userId?: number, limit = 50): Promise<ChatMessageData[]> {
		try {
			const messages = await this.prisma.chatMessage.findMany({
				where: userId
					? {
							session: {
								userId,
							},
						}
					: {},
				orderBy: { timestamp: "desc" },
				take: limit,
				include: {
					session: true,
				},
			});

			return messages.map((message) => this.mapPrismaMessageToMessageData(message));
		} catch (error) {
			logger.error("[ChatRepository] Failed to get recent messages:", error);
			throw new ConcreteChatServiceError("Failed to get recent messages", error as Error);
		}
	}

	/**
	 * Delete messages for a session
	 */
	async deleteMessagesBySession(sessionId: string): Promise<number> {
		try {
			const result = await this.prisma.chatMessage.deleteMany({
				where: { sessionId },
			});

			logger.info(`[ChatRepository] Deleted ${result.count} messages from session ${sessionId}`);
			return result.count;
		} catch (error) {
			logger.error(`[ChatRepository] Failed to delete messages from session ${sessionId}:`, error);
			throw new ConcreteChatServiceError("Failed to delete chat messages", error as Error);
		}
	}

	/**
	 * Get session statistics
	 */
	async getSessionStats(userId?: number): Promise<{
		total: number;
		active: number;
		inactive: number;
		expired: number;
		totalMessages: number;
	}> {
		try {
			const sessionWhere = userId ? { userId } : {};

			const [sessionStats, messageCount] = await Promise.all([
				this.prisma.chatSession.groupBy({
					by: ["status"],
					where: sessionWhere,
					_count: {
						status: true,
					},
				}),
				this.prisma.chatMessage.count({
					where: userId
						? {
								session: {
									userId,
								},
							}
						: {},
				}),
			]);

			const result = {
				total: 0,
				active: 0,
				inactive: 0,
				expired: 0,
				totalMessages: messageCount,
			};

			sessionStats.forEach((stat) => {
				result.total += stat._count.status;
				result[stat.status as keyof Omit<typeof result, "total" | "totalMessages">] +=
					stat._count.status;
			});

			return result;
		} catch (error) {
			logger.error("[ChatRepository] Failed to get session stats:", error);
			throw new ConcreteChatServiceError("Failed to get session stats", error as Error);
		}
	}

	/**
	 * Cleanup old inactive sessions
	 */
	async cleanupOldSessions(olderThanDays = 30): Promise<number> {
		try {
			const cutoffDate = new Date();
			cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

			const result = await this.prisma.chatSession.deleteMany({
				where: {
					lastActivityAt: {
						lt: cutoffDate,
					},
					status: {
						in: ["inactive", "expired"],
					},
				},
			});

			logger.info(`[ChatRepository] Cleaned up ${result.count} old sessions`);
			return result.count;
		} catch (error) {
			logger.error("[ChatRepository] Failed to cleanup old sessions:", error);
			throw new ConcreteChatServiceError("Failed to cleanup old sessions", error as Error);
		}
	}

	/**
	 * Cleanup old messages
	 */
	async cleanupOldMessages(olderThanDays = 7): Promise<number> {
		try {
			const cutoffDate = new Date();
			cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

			const result = await this.prisma.chatMessage.deleteMany({
				where: {
					timestamp: {
						lt: cutoffDate,
					},
				},
			});

			logger.info(`[ChatRepository] Cleaned up ${result.count} old messages`);
			return result.count;
		} catch (error) {
			logger.error("[ChatRepository] Failed to cleanup old messages:", error);
			throw new ConcreteChatServiceError("Failed to cleanup old messages", error as Error);
		}
	}

	/**
	 * Get active sessions count
	 */
	async getActiveSessionsCount(userId?: number): Promise<number> {
		try {
			return await this.prisma.chatSession.count({
				where: {
					status: "active",
					...(userId && { userId }),
				},
			});
		} catch (error) {
			logger.error("[ChatRepository] Failed to get active sessions count:", error);
			throw new ConcreteChatServiceError("Failed to get active sessions count", error as Error);
		}
	}

	/**
	 * Map Prisma session to session data
	 */
	private mapPrismaSessionToSessionData(session: any): ChatSessionData {
		return {
			id: session.id,
			userId: session.userId,
			sessionId: session.sessionId,
			ipAddress: session.ipAddress,
			userAgent: session.userAgent,
			status: session.status as ChatSessionData["status"],
			messageCount: session.messageCount,
			createdAt: session.createdAt,
			updatedAt: session.updatedAt,
			lastActivityAt: session.lastActivityAt,
		};
	}

	/**
	 * Map Prisma message to message data
	 */
	private mapPrismaMessageToMessageData(message: any): ChatMessageData {
		return {
			id: message.id,
			sessionId: message.sessionId,
			type: message.type as ChatMessageData["type"],
			content: message.content,
			metadata: JSON.parse(message.metadata),
			messageId: message.messageId,
			timestamp: message.timestamp,
		};
	}
}
