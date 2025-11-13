/**
 * useTranslation - AI翻訳機能用カスタムフック
 *
 * API通信、状態管理、エラーハンドリングを担当
 */

import { useCallback } from "react"

import { useMutation, useQuery } from "@tanstack/react-query"

import { createContextLogger } from "@/modules/logger"

import { useAuth } from "../../../contexts/AuthContext"
import { useApiClient } from "../../../lib/api/client"
import type {
	Language,
	LanguageDetectionResponse,
	SupportedLanguagesResponse,
	TranslationOptions,
	TranslationRequest,
	TranslationResponse,
	UseTranslationReturn,
} from "../types/translation"

const log = createContextLogger("useTranslation")

export const useTranslation = (): UseTranslationReturn => {
	const apiClient = useApiClient()
	const { user } = useAuth()

	// TanStack Query mutation for translation
	const translationMutation = useMutation({
		mutationFn: async ({
			text,
			options,
		}: {
			text: string
			options: TranslationOptions
		}) => {
			// リクエストデータ構築
			const requestData: TranslationRequest = {
				text,
				options,
				userId: user?.id || "anonymous", // 統合認証システムから取得
			}

			// API呼び出し（統合APIクライアントを使用）
			const data: TranslationResponse = await apiClient.post("/api/translation-fix", requestData)

			if (!data.success) {
				throw new Error(data.error || "翻訳処理に失敗しました")
			}

			if (!data.result) {
				throw new Error("翻訳結果が返されませんでした")
			}

			log.debug("Translation completed:", {
				requestId: data.requestId,
				processingTime: data.totalProcessingTime,
				confidence: data.result.confidence,
				wordCount: data.result.wordCount,
				detectedLanguage: data.result.detectedSourceLanguage,
				hasAlternatives: !!data.result.alternatives?.length,
			})

			return data.result
		},
		retry: 2,
		retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 3000),
		onError: (err: Error) => {
			log.error("Translation error:", err)
		},
	})

	// Language detection mutation
	const languageDetectionMutation = useMutation({
		mutationFn: async (text: string) => {
			const data: LanguageDetectionResponse = await apiClient.post(
				"/api/translation-fix/detect-language",
				{ text }
			)

			if (!data.success) {
				throw new Error(data.error || "言語検出に失敗しました")
			}

			return data.detectedLanguage
		},
		onError: (err: Error) => {
			log.error("Language detection error:", err)
		},
	})

	// Supported languages query
	const supportedLanguagesQuery = useQuery({
		queryKey: ["supported-languages"],
		queryFn: async () => {
			const data = await apiClient.get("/api/translation-fix/languages", undefined, {
				skipAuth: true,
			})

			if (!data.success) {
				throw new Error(data.error || "サポート言語の取得に失敗しました")
			}

			return data
		},
		staleTime: 24 * 60 * 60 * 1000, // 24時間キャッシュ
		retry: 3,
		enabled: false, // 手動でクエリを実行する
	})

	// メイン翻訳処理
	const translate = useCallback(
		async (text: string, options: TranslationOptions) => {
			translationMutation.mutate({
				text,
				options,
			})
		},
		[translationMutation]
	)

	// サポート言語取得
	const getSupportedLanguages =
		useCallback(async (): Promise<SupportedLanguagesResponse | null> => {
			try {
				supportedLanguagesQuery.refetch()
				return supportedLanguagesQuery.data || null
			} catch (err) {
				log.error("Get supported languages error:", err)
				return null
			}
		}, [supportedLanguagesQuery])

	// 言語自動検出
	const detectLanguage = useCallback(
		async (text: string): Promise<Language | null> => {
			try {
				const result = await languageDetectionMutation.mutateAsync(text)
				return result
			} catch {
				return null
			}
		},
		[languageDetectionMutation]
	)

	// 結果クリア
	const clearResults = useCallback(() => {
		translationMutation.reset()
	}, [translationMutation])

	return {
		translate,
		result: translationMutation.data || null,
		isLoading: translationMutation.isPending,
		error: translationMutation.error?.message || null,
		clearResults,
		getSupportedLanguages,
		detectLanguage,
	}
}

// ヘルパー関数
