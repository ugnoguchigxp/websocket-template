/**
 * @fileoverview テキスト補正Hook
 * @description 音声認識エラーの高速テーマベース補正フック
 */

import { useCallback, useEffect, useRef, useState } from "react"

import { useMutation } from "@tanstack/react-query"

import { createContextLogger } from "@/modules/logger"

const log = createContextLogger("useTextCorrection")

/**
 * テーマタイプ
 */
export type ThemeType =
	| "medical"
	| "business"
	| "technical"
	| "science_fiction"
	| "literature"
	| "historical"

/**
 * テキスト補正結果
 */
export interface TextCorrectionResult {
	correctedText: string
	hasCorrections: boolean
	confidence: number
	processedChunks: number
}

/**
 * バッチ補正結果
 */
export interface BatchCorrectionResult {
	results: Array<TextCorrectionResult & { cached: boolean }>
	summary: {
		totalChunks: number
		totalCorrections: number
		cachedResults: number
		avgConfidence: number
	}
	responseTimeMs: number
}

/**
 * テーマ分析結果
 */
export interface ThemeAnalysisResult {
	text: string
	recommendedTheme: ThemeType
	confidence: number
	allScores: Record<string, number>
}

/**
 * 補正設定
 */
export interface CorrectionSettings {
	/** キャッシュ使用フラグ */
	useCache: boolean
	/** デバウンス遅延（ミリ秒） */
	debounceMs: number
	/** 自動テーマ判定 */
	autoThemeDetection: boolean
	/** 最小信頼度しきい値 */
	minConfidenceThreshold: number
}

/**
 * Hook状態
 */
export interface UseTextCorrectionState {
	/** 処理中フラグ */
	isProcessing: boolean
	/** エラー状態 */
	error: string | null
	/** 最後の補正結果 */
	lastResult: TextCorrectionResult | null
	/** 統計情報 */
	stats: {
		totalRequests: number
		successfulRequests: number
		cachedRequests: number
		avgResponseTime: number
	}
}

/**
 * デフォルト設定
 */
const DEFAULT_SETTINGS: CorrectionSettings = {
	useCache: true,
	debounceMs: 300,
	autoThemeDetection: false,
	minConfidenceThreshold: 0.5,
}

/**
 * APIベースURL
 */
const API_BASE_URL = import.meta.env.VITE_API_URL
	? `${import.meta.env.VITE_API_URL}/api/quick-fix`
	: "/api/quick-fix"

/**
 * テキスト補正カスタムフック
 */
export function useTextCorrection(
	initialTheme: ThemeType = "medical",
	initialSettings: Partial<CorrectionSettings> = {}
) {
	const [theme, setTheme] = useState<ThemeType>(initialTheme)
	const [settings, setSettings] = useState<CorrectionSettings>({
		...DEFAULT_SETTINGS,
		...initialSettings,
	})

	const [stats, setStats] = useState({
		totalRequests: 0,
		successfulRequests: 0,
		cachedRequests: 0,
		avgResponseTime: 0,
	})

	const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

	// Text correction mutation
	const correctionMutation = useMutation({
		mutationFn: async ({
			text,
			targetTheme,
			chunkId,
		}: {
			text: string
			targetTheme?: ThemeType
			chunkId?: string
		}) => {
			if (!text.trim()) {
				throw new Error("Text is required")
			}

			const currentTheme = targetTheme || theme

			log.debug("[QuickFix] Processing", { textLength: text.length, theme: currentTheme })

			log.debug("Text correction request", {
				textLength: text.length,
				theme: currentTheme,
				chunkId,
				useCache: settings.useCache,
			})

			const response = await fetch(`${API_BASE_URL}/correct`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					text,
					theme: currentTheme,
					chunkId,
					useCache: settings.useCache,
					forceRefresh: false,
				}),
			})

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}))
				throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`)
			}

			const data = await response.json()

			if (!data.success) {
				throw new Error("Correction failed")
			}

			// 信頼度チェック
			if (data.result.confidence < settings.minConfidenceThreshold) {
				log.warn("Low confidence correction result", {
					confidence: data.result.confidence,
					threshold: settings.minConfidenceThreshold,
				})
			}

			log.info("Text correction completed", {
				theme: currentTheme,
				hasCorrections: data.result.hasCorrections,
				confidence: data.result.confidence,
				cached: data.cached,
			})

			return data.result
		},
		retry: 2,
		onSuccess: () => {
			setStats(prev => ({
				totalRequests: prev.totalRequests + 1,
				successfulRequests: prev.successfulRequests + 1,
				cachedRequests: prev.cachedRequests,
				avgResponseTime: prev.avgResponseTime,
			}))
		},
		onError: (error: Error) => {
			setStats(prev => ({
				...prev,
				totalRequests: prev.totalRequests + 1,
			}))
			log.error("Text correction failed", {
				error: error.message,
			})
		},
	})

	// Batch correction mutation
	const batchCorrectionMutation = useMutation({
		mutationFn: async ({
			textChunks,
			targetTheme,
		}: {
			textChunks: string[]
			targetTheme?: ThemeType
		}) => {
			if (!textChunks.length) {
				throw new Error("Text chunks array is required")
			}

			const currentTheme = targetTheme || theme

			log.debug("Batch correction request", {
				chunkCount: textChunks.length,
				theme: currentTheme,
				totalLength: textChunks.reduce((sum, chunk) => sum + chunk.length, 0),
			})

			const response = await fetch(`${API_BASE_URL}/correct-batch`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					textChunks,
					theme: currentTheme,
					useCache: settings.useCache,
				}),
			})

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}))
				throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`)
			}

			const data = await response.json()

			if (!data.success) {
				throw new Error("Batch correction failed")
			}

			const result: BatchCorrectionResult = {
				results: data.results,
				summary: data.summary,
				responseTimeMs: data.responseTimeMs,
			}

			log.info("Batch correction completed", {
				theme: currentTheme,
				totalChunks: data.summary.totalChunks,
				totalCorrections: data.summary.totalCorrections,
				avgConfidence: data.summary.avgConfidence,
			})

			return result
		},
		onError: (error: Error) => {
			log.error("Batch correction failed", {
				error: error.message,
			})
		},
	})

	// Theme analysis mutation
	const themeAnalysisMutation = useMutation({
		mutationFn: async ({
			text,
			themes,
		}: {
			text: string
			themes?: ThemeType[]
		}) => {
			if (!text.trim()) {
				throw new Error("Text is required for theme analysis")
			}

			const response = await fetch(`${API_BASE_URL}/analyze-theme`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					text,
					themes,
				}),
			})

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}))
				throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`)
			}

			const data = await response.json()

			if (!data.success) {
				throw new Error("Theme analysis failed")
			}

			// 自動テーマ設定が有効な場合
			if (settings.autoThemeDetection && data.confidence > 0.7) {
				setTheme(data.recommendedTheme)
				log.info("Theme auto-detected and updated", {
					newTheme: data.recommendedTheme,
					confidence: data.confidence,
				})
			}

			return {
				text: data.text,
				recommendedTheme: data.recommendedTheme,
				confidence: data.confidence,
				allScores: data.allScores,
			}
		},
		onError: (error: Error) => {
			log.error("Theme analysis failed", {
				error: error.message,
			})
		},
	})

	/**
	 * 単一テキスト補正
	 */
	const correctText = useCallback(
		async (
			text: string,
			targetTheme?: ThemeType,
			chunkId?: string
		): Promise<TextCorrectionResult> => {
			const result = await correctionMutation.mutateAsync({
				text,
				targetTheme,
				chunkId,
			})
			return result
		},
		[correctionMutation]
	)

	/**
	 * デバウンス付きテキスト補正
	 */
	const correctTextDebounced = useCallback(
		(text: string, targetTheme?: ThemeType, chunkId?: string): Promise<TextCorrectionResult> => {
			return new Promise((resolve, reject) => {
				if (debounceTimerRef.current) {
					clearTimeout(debounceTimerRef.current)
				}

				debounceTimerRef.current = setTimeout(async () => {
					try {
						const result = await correctText(text, targetTheme, chunkId)
						resolve(result)
					} catch (error) {
						reject(error)
					}
				}, settings.debounceMs)
			})
		},
		[correctText, settings.debounceMs]
	)

	/**
	 * バッチテキスト補正
	 */
	const correctTextBatch = useCallback(
		async (textChunks: string[], targetTheme?: ThemeType): Promise<BatchCorrectionResult> => {
			const result = await batchCorrectionMutation.mutateAsync({
				textChunks,
				targetTheme,
			})
			return result
		},
		[batchCorrectionMutation]
	)

	/**
	 * テーマ分析
	 */
	const analyzeTheme = useCallback(
		async (text: string, themes?: ThemeType[]): Promise<ThemeAnalysisResult> => {
			const result = await themeAnalysisMutation.mutateAsync({
				text,
				themes,
			})
			return result
		},
		[themeAnalysisMutation]
	)

	/**
	 * 設定更新
	 */
	const updateSettings = useCallback((newSettings: Partial<CorrectionSettings>) => {
		setSettings(prev => ({ ...prev, ...newSettings }))
		log.debug("Settings updated", newSettings)
	}, [])

	/**
	 * 統計リセット
	 */
	const resetStats = useCallback(() => {
		setStats({
			totalRequests: 0,
			successfulRequests: 0,
			cachedRequests: 0,
			avgResponseTime: 0,
		})
	}, [])

	/**
	 * クリーンアップ
	 */
	useEffect(() => {
		return () => {
			if (debounceTimerRef.current) {
				clearTimeout(debounceTimerRef.current)
			}
		}
	}, [])

	return {
		// 状態
		theme,
		settings,
		isProcessing:
			correctionMutation.isPending ||
			batchCorrectionMutation.isPending ||
			themeAnalysisMutation.isPending,
		error:
			correctionMutation.error?.message ||
			batchCorrectionMutation.error?.message ||
			themeAnalysisMutation.error?.message ||
			null,
		lastResult: correctionMutation.data || null,
		stats,

		// アクション
		correctText,
		correctTextDebounced,
		correctTextBatch,
		analyzeTheme,
		setTheme,
		updateSettings,
		resetStats,
	}
}
