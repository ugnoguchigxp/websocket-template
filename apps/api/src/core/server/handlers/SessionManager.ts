import { randomUUID } from "crypto";
import type { PrismaClient, RefreshToken } from "@prisma/client";

/**
 * リフレッシュトークンのセッション管理を担当するクラス
 */
export class SessionManager {
	constructor(private readonly prisma: PrismaClient) {}

	/**
	 * リフレッシュセッションを永続化する
	 */
	async persistRefreshSession(
		userId: number,
		refreshToken: string,
		expiresAt: Date,
		tokenType: "local" | "oidc" = "local"
	): Promise<{ sessionId: string; expiresAt: Date }> {
		const sessionId = randomUUID();
		await this.prisma.refreshToken.create({
			data: {
				userId,
				token: refreshToken,
				expiresAt,
				jti: sessionId,
				tokenType,
			},
		});
		return { sessionId, expiresAt };
	}

	/**
	 * セッションIDからリフレッシュセッションを取得する
	 */
	async findRefreshSession(sessionId: string): Promise<RefreshToken | null> {
		return this.prisma.refreshToken.findUnique({
			where: { jti: sessionId },
		});
	}

	/**
	 * リフレッシュセッションを削除する
	 */
	async deleteRefreshSession(sessionId: string): Promise<void> {
		await this.prisma.refreshToken.deleteMany({
			where: { jti: sessionId },
		});
	}

	/**
	 * リフレッシュトークンを更新する
	 */
	async updateRefreshToken(sessionId: string, newToken: string, expiresAt: Date): Promise<void> {
		await this.prisma.refreshToken.updateMany({
			where: { jti: sessionId },
			data: {
				token: newToken,
				expiresAt,
			},
		});
	}
}
