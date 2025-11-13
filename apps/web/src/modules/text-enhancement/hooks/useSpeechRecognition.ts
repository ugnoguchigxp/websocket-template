/**
 * 音声認識の管理を担当するカスタムフック
 */

import { useCallback, useEffect, useRef, useState } from "react"

import { createContextLogger } from "@/modules/logger"

const log = createContextLogger("useSpeechRecognition")

interface SpeechRecognitionHookOptions {
	onTextChange: (text: string) => void
	onQuickFix?: (text: string, theme?: string, startPos?: number, endPos?: number) => void
	selectedTheme?: string
}

interface SpeechRecognitionHookResult {
	isRecording: boolean
	speechSupported: boolean
	voiceInputText: string
	isFinal: boolean
	toggleSpeechRecognition: () => void
	forceStopRecognition: () => void
}

// Web Speech API型定義（簡略化）
declare global {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	var SpeechRecognition: any
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	var webkitSpeechRecognition: any
}

export const useSpeechRecognition = ({
	onTextChange,
	onQuickFix,
	selectedTheme = "general",
}: SpeechRecognitionHookOptions): SpeechRecognitionHookResult => {
	const [isRecording, setIsRecording] = useState(false)
	const [speechSupported, setSpeechSupported] = useState(false)
	const [voiceInputText, setVoiceInputText] = useState<string>("")
	const [voiceStartPosition, setVoiceStartPosition] = useState<number>(0)
	const [lastQuickFixPosition, setLastQuickFixPosition] = useState<number>(0)
	const [baselineText, setBaselineText] = useState<string>("")

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const recognitionRef = useRef<any>(null)
	const silenceTimerRef = useRef<NodeJS.Timeout | null>(null)

	// Web Speech API対応チェック
	useEffect(() => {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const SpeechRecognition =
			(window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
		setSpeechSupported(!!SpeechRecognition)

		return () => {
			if (recognitionRef.current) {
				try {
					recognitionRef.current.stop()
					recognitionRef.current.abort()
				} catch (e) {
					log.warn("Error stopping recognition:", e)
				}
			}
			if (silenceTimerRef.current) {
				clearTimeout(silenceTimerRef.current)
			}
		}
	}, [])

	const forceStopRecognition = useCallback(() => {
		log.debug("[SpeechRecognition] Force stopping voice recognition")
		setIsRecording(false)

		if (recognitionRef.current) {
			try {
				recognitionRef.current.stop()
				recognitionRef.current.abort()
			} catch (error) {
				log.warn("Error in force stop:", error)
			}
		}

		if (silenceTimerRef.current) {
			clearTimeout(silenceTimerRef.current)
			silenceTimerRef.current = null
		}

		// 音声認識停止時：音声入力をbaselineTextに統合して確定
		if (voiceInputText) {
			const finalText = baselineText + voiceInputText
			setBaselineText(finalText)
			setVoiceInputText("")
			onTextChange(finalText)
			log.debug("[SpeechRecognition] Stopped - merged voice input to baseline", {
				voiceInputLength: voiceInputText.length,
			})
		}
	}, [baselineText, voiceInputText, onTextChange])

	const toggleSpeechRecognition = useCallback(() => {
		if (!speechSupported) return

		if (isRecording) {
			forceStopRecognition()
		} else {
			try {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				const SpeechRecognition =
					(window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
				if (!SpeechRecognition) return

				// 既存のインスタンスがあれば停止
				if (recognitionRef.current) {
					try {
						recognitionRef.current.stop()
						recognitionRef.current.abort()
					} catch (e) {
						log.warn("Error stopping existing recognition:", e)
					}
				}

				// 音声入力の初期化
				const currentPosition = baselineText.length
				setVoiceInputText("")
				setVoiceStartPosition(currentPosition)
				setLastQuickFixPosition(currentPosition)

				log.debug("[SpeechRecognition] Started - baseline text", {
					baselineLength: baselineText.length,
					position: currentPosition,
				})

				// 新しいインスタンスを作成
				const recognition = new SpeechRecognition()
				recognition.continuous = true
				recognition.interimResults = true
				recognition.lang = "ja-JP"

				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				recognition.onresult = (event: any) => {
					let interimTranscript = ""
					let finalTranscript = ""

					for (let i = event.resultIndex; i < event.results.length; i++) {
						const transcript = event.results[i][0].transcript

						if (event.results[i].isFinal) {
							finalTranscript += transcript
						} else {
							interimTranscript += transcript
						}
					}

					// 中間結果をリアルタイム表示
					if (interimTranscript) {
						const displayText =
							baselineText +
							voiceInputText +
							(voiceInputText && !voiceInputText.endsWith(" ") ? " " : "") +
							interimTranscript
						onTextChange(displayText)
					}

					// 確定された結果を永続的に追加
					if (finalTranscript) {
						log.debug("[SpeechRecognition] Final transcript:", finalTranscript)

						const newVoiceText = voiceInputText + (voiceInputText ? " " : "") + finalTranscript
						setVoiceInputText(newVoiceText)

						const finalText = baselineText + newVoiceText
						onTextChange(finalText)

						// Quick-Fix処理（音声入力専用：10文字ごとに実行）
						const newVoiceLength = newVoiceText.length
						const processedLength = lastQuickFixPosition - voiceStartPosition
						const unprocessedLength = newVoiceLength - processedLength

						if (unprocessedLength >= 10 && onQuickFix) {
							const chunkSize = Math.min(unprocessedLength, 20)
							const textToFix = newVoiceText.slice(processedLength, processedLength + chunkSize)

							const chunkStartPos = voiceStartPosition + processedLength
							const chunkEndPos = voiceStartPosition + processedLength + chunkSize

							onQuickFix(textToFix, selectedTheme, chunkStartPos, chunkEndPos)
							setLastQuickFixPosition(chunkEndPos)
						}
					}
				}

				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				recognition.onerror = (event: any) => {
					log.error("[SpeechRecognition] Error:", event.error)
					forceStopRecognition()
				}

				recognition.onstart = () => {
					log.debug("[SpeechRecognition] Started successfully")
				}

				recognition.onend = () => {
					log.debug("[SpeechRecognition] Ended")
					setIsRecording(false)
				}

				recognitionRef.current = recognition

				// マイクアクセス許可を確認
				if (navigator.mediaDevices?.getUserMedia) {
					navigator.mediaDevices
						.getUserMedia({ audio: true })
						.then(() => {
							log.debug("[SpeechRecognition] Microphone access granted")
							try {
								recognition.start()
								setIsRecording(true)
							} catch (startError) {
								log.error("[SpeechRecognition] Failed to start:", startError)
								setIsRecording(false)
							}
						})
						.catch(error => {
							log.error("[SpeechRecognition] Microphone access denied:", error)
							alert(
								"マイクへのアクセスが拒否されました。ブラウザの設定でマイクアクセスを許可してください。"
							)
							setIsRecording(false)
						})
				} else {
					// フォールバック: 直接開始を試行
					try {
						recognition.start()
						setIsRecording(true)
					} catch (startError) {
						log.error("[SpeechRecognition] Failed to start (fallback):", startError)
						setIsRecording(false)
					}
				}
			} catch (error) {
				log.error("[SpeechRecognition] Initialization error:", error)
				setIsRecording(false)
			}
		}
	}, [
		isRecording,
		speechSupported,
		baselineText,
		voiceInputText,
		voiceStartPosition,
		lastQuickFixPosition,
		forceStopRecognition,
		onTextChange,
		onQuickFix,
		selectedTheme,
	])

	// baselineTextを外部から更新するメソッドも公開

	return {
		isRecording,
		speechSupported,
		voiceInputText,
		isFinal: false,
		toggleSpeechRecognition,
		forceStopRecognition,
	}
}
