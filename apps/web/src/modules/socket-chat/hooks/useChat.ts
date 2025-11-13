// ✅ 新しい統合API通信ライブラリを使用
import { createContextLogger } from "@/modules/logger"

import { API_TIMEOUTS, CHAT_API_ENDPOINTS } from "../../../constants/api"
import { apiClient, useApiMutation } from "../../../lib/api"
import type { IChatSendRequest, IChatSendResponse } from "../../../types/chat"

/**
 * Custom hook for chat functionality using integrated API library
 * ✅ MSAL認証統合、自動トークンリフレッシュ、エラーハンドリング統合
 */
export const useChat = () => {
	const log = createContextLogger("useChat")

	// ✅ 新しいAPIライブラリを使用（MSAL認証自動統合）
	const sendMessage = useApiMutation<IChatSendResponse, IChatSendRequest>(
		async (request: IChatSendRequest) => {
			const response = await apiClient.post<{ success: boolean; data: IChatSendResponse }>(
				CHAT_API_ENDPOINTS.SEND,
				request,
				{
					timeout: API_TIMEOUTS.CHAT_REQUEST,
				}
			)
			return response.data
		},
		{
			onError: error => {
				log.error("Chat send error", error)
			},
		}
	)

	// ヘルスチェックは認証不要の場合が多いため、skipAuthオプションを使用
	const healthCheck = useApiMutation<{ status: string; service: string; timestamp: string }, void>(
		async () => {
			const response = await apiClient.get<{
				success: boolean
				data: { status: string; service: string; timestamp: string }
			}>(CHAT_API_ENDPOINTS.HEALTH, undefined, {
				skipAuth: true, // ヘルスチェックは通常認証不要
				timeout: 5000,
			})
			return response.data
		}
	)

	return {
		// ✅ 統一されたインターフェース（エラーハンドリング、ローディング状態統合）
		sendMessage: sendMessage.mutate,
		sendMessageAsync: sendMessage.mutateAsync,
		isLoading: sendMessage.isPending,
		error: sendMessage.error,
		data: sendMessage.data,
		isSuccess: sendMessage.isSuccess,
		healthCheck: healthCheck.mutate,
		isHealthy: healthCheck.data?.status === "healthy",
		healthError: healthCheck.error,
		reset: sendMessage.reset,

		// ✅ セキュリティ強化：認証状態とエラー詳細
		isAuthenticated:
			!sendMessage.error || !("status" in sendMessage.error) || sendMessage.error.status !== 401,
		connectionStatus: sendMessage.isPending
			? "connecting"
			: sendMessage.isSuccess
				? "connected"
				: sendMessage.error
					? "error"
					: "idle",
	}
}
