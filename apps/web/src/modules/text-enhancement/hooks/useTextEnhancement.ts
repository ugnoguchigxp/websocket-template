/**
 * useTextEnhancement - 文章変換機能用カスタムフック
 *
 * API通信、状態管理、エラーハンドリングを担当
 */

import { useCallback } from "react"

import { useMutation } from "@tanstack/react-query"

import { createContextLogger } from "@/modules/logger"

import { useAuth } from "../../../contexts/AuthContext"
import { useApiClient } from "../../../lib/api/client"
import type { FeedbackData } from "../../../types/feedback"
import type {
	EnhancementOptions,
	EnhancementType,
	TextEnhancementRequest,
	TextEnhancementResponse,
	UseTextEnhancementReturn,
} from "../types/textEnhancement"

const log = createContextLogger("useTextEnhancement")

export const useTextEnhancement = (): UseTextEnhancementReturn => {
	const apiClient = useApiClient()
	const { user } = useAuth()

	// TanStack Query mutation
	const enhancementMutation = useMutation({
		mutationFn: async ({
			text,
			enhancementType,
			options,
		}: {
			text: string
			enhancementType: EnhancementType
			options: EnhancementOptions
		}) => {
			// リクエストデータ構築
			const requestData: TextEnhancementRequest = {
				text,
				enhancementType,
				options,
				userId: user?.id || "anonymous", // 統合認証システムから取得
			}

			// API呼び出し（統合APIクライアントを使用）
			const data: TextEnhancementResponse = await apiClient.post(
				"/api/text-enhancement",
				requestData
			)

			if (!data.success) {
				throw new Error(data.error || "処理に失敗しました")
			}

			log.debug("Enhancement completed:", {
				requestId: data.requestId,
				resultsCount: data.results.length,
				processingTime: data.totalProcessingTime,
				bestResult: data.bestResult,
				summary: data.bestResult?.finalOutput.summary,
				enhancedText: data.bestResult?.finalOutput.enhancedText,
			})

			// デバッグ：bestResultの構造を詳細にログ出力
			if (data.bestResult) {
				log.debug("Best result details:", {
					agentId: data.bestResult.agentId,
					finalOutput: data.bestResult.finalOutput,
					combinedScore: data.bestResult.combinedScore,
					summary: data.bestResult.finalOutput.summary,
					enhancedText: data.bestResult.finalOutput.enhancedText,
					supplements: data.bestResult.finalOutput.supplements,
				})
			}

			// デバッグ：すべてのエージェント結果を詳細表示
			if (data.results && data.results.length > 0) {
				log.debug(
					"全エージェント結果:",
					data.results.map(result => ({
						agentType: result.agentType,
						score: result.score,
						output: result.output,
					}))
				)
			}

			return data
		},
		retry: 2,
		retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 3000),
		onError: (err: Error) => {
			log.error("Enhancement error:", err)
		},
	})

	// メイン変換処理
	const enhance = useCallback(
		async (text: string, enhancementType: EnhancementType, options: EnhancementOptions) => {
			enhancementMutation.mutate({
				text,
				enhancementType,
				options,
			})
		},
		[enhancementMutation]
	)

	// 結果クリア
	const clearResults = useCallback(() => {
		enhancementMutation.reset()
	}, [enhancementMutation])

	return {
		enhance,
		results: enhancementMutation.data?.results || [],
		bestResult: enhancementMutation.data?.bestResult || null,
		isLoading: enhancementMutation.isPending,
		progress: enhancementMutation.isPending ? 50 : enhancementMutation.isSuccess ? 100 : 0,
		error: enhancementMutation.error?.message || null,
		clearResults,
	}
}

// ヘルパー関数

/**
 * フィードバック送信用カスタムフック
 */
export const useTextEnhancementFeedback = () => {
	const apiClient = useApiClient()

	const feedbackMutation = useMutation({
		mutationFn: async (feedback: FeedbackData) => {
			const data = await apiClient.post("/api/text-enhancement/feedback", feedback)

			if (!data.success) {
				throw new Error(data.error || "フィードバック送信に失敗しました")
			}

			return data
		},
		retry: 1,
		onError: (error: Error) => {
			log.error("Feedback submission error:", error)
		},
	})

	return {
		submitFeedback: feedbackMutation.mutate,
		submitFeedbackAsync: feedbackMutation.mutateAsync,
		isSubmitting: feedbackMutation.isPending,
		error: feedbackMutation.error,
		isSuccess: feedbackMutation.isSuccess,
	}
}
