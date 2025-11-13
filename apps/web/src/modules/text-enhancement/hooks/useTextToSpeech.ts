/**
 * テキスト読み上げ機能を管理するカスタムフック
 */

import { useCallback } from "react"

import { useMutation } from "@tanstack/react-query"

import { createContextLogger } from "@/modules/logger"

import { useApiClient } from "../../../lib/api/client"
import { useAutoSpeech } from "../../speech/hooks/useAutoSpeech"

const log = createContextLogger("useTextToSpeech")

interface TextToSpeechHookOptions {
	stripMarkdown?: boolean
	maxLength?: number
}

interface TextToSpeechHookResult {
	isPlaying: boolean
	playText: (text: string) => Promise<void>
	stopSpeech: () => void
}

export const useTextToSpeech = (options: TextToSpeechHookOptions = {}): TextToSpeechHookResult => {
	const { stripMarkdown = true, maxLength = 900 } = options
	const { isAutoPlaying, playAutoSpeech, stopAutoSpeech } = useAutoSpeech()
	const apiClient = useApiClient()

	// TanStack Query mutation for text-to-speech
	const speechMutation = useMutation({
		mutationFn: async (textToSpeak: string) => {
			const savedVoice = localStorage.getItem("speechCharacter") || "ja-JP-NanamiNeural-Misato"

			const requestBody = {
				text: textToSpeak,
				sessionId: `text-editor-${Date.now()}`,
				voiceName: savedVoice,
			}

			log.debug("[TextToSpeech] API request:", {
				textLength: textToSpeak.length,
				savedVoice,
			})

			// API呼び出し（統合APIクライアントを使用）
			const speechData = await apiClient.post("/api/speech/generate", requestBody, {
				skipAuth: true,
			})
			return speechData
		},
		onSuccess: async speechData => {
			await playAutoSpeech(speechData)
		},
		onError: (error: Error) => {
			log.error("[TextToSpeech] Error:", error)
		},
	})

	// Markdownテキストをプレーンテキストに変換
	const stripMarkdownText = useCallback((text: string): string => {
		return (
			text
				// 見出し記号を削除 (# ## ### など)
				.replace(/^#{1,6}\s+/gm, "")
				// 太字・斜体記号を削除 (**text**, *text*, __text__, _text_)
				.replace(/(\*\*|__)(.*?)\1/g, "$2")
				.replace(/(\*|_)(.*?)\1/g, "$2")
				// 取り消し線を削除 (~~text~~)
				.replace(/~~(.*?)~~/g, "$1")
				// インラインコードを削除 (`code`)
				.replace(/`([^`]*)`/g, "$1")
				// コードブロックを削除 (```code```)
				.replace(/```[\s\S]*?```/g, "")
				// リンクを削除 ([text](url) -> text)
				.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
				// 画像を削除 (![alt](url))
				.replace(/!\[[^\]]*\]\([^)]*\)/g, "")
				// 引用記号を削除 (> text)
				.replace(/^>\s+/gm, "")
				// リスト記号を削除 (- item, * item, + item, 1. item)
				.replace(/^[\s]*[-*+]\s+/gm, "")
				.replace(/^[\s]*\d+\.\s+/gm, "")
				// 水平線を削除 (--- or ***)
				.replace(/^[\s]*[-*]{3,}[\s]*$/gm, "")
				// テーブル記号を削除
				.replace(/\|/g, " ")
				// 連続する空白を1つにまとめる
				.replace(/\s+/g, " ")
				// 前後の空白を削除
				.trim()
		)
	}, [])

	const playText = useCallback(
		async (text: string) => {
			if (!text?.trim()) {
				log.warn("[TextToSpeech] Empty text provided")
				return
			}

			if (isAutoPlaying) {
				stopAutoSpeech()
				return
			}

			// Markdownを除去してプレーンテキストに変換
			const processedText = stripMarkdown ? stripMarkdownText(text) : text

			// テキストを指定された長さに制限（冒頭部分）
			const textToSpeak =
				processedText.length > maxLength
					? `${processedText.substring(0, maxLength)}...`
					: processedText

			log.debug("[TextToSpeech] Request details:", {
				originalTextLength: text.length,
				processedTextLength: processedText.length,
				finalTextLength: textToSpeak.length,
				isMarkdownStripped: stripMarkdown && text !== processedText,
				isTruncated: processedText.length > maxLength,
			})

			speechMutation.mutate(textToSpeak)
		},
		[isAutoPlaying, stopAutoSpeech, stripMarkdown, stripMarkdownText, maxLength, speechMutation]
	)

	const stopSpeech = useCallback(() => {
		if (isAutoPlaying) {
			stopAutoSpeech()
		}
	}, [isAutoPlaying, stopAutoSpeech])

	return {
		isPlaying: isAutoPlaying || speechMutation.isPending,
		playText,
		stopSpeech,
	}
}
