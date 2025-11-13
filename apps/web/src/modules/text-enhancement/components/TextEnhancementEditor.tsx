/**
 * TextEnhancementEditor - AI文章校正エディタコンポーネント
 *
 * TextEnhancementPageから例文選択セクションを除いた部分を抽出
 * 再利用可能なAI文章校正機能付きエディタ
 */

import type React from "react"
import { useCallback, useEffect, useState } from "react"

import { FaGlobe } from "react-icons/fa"
import { MdAutoFixHigh, MdError } from "react-icons/md"

import { createContextLogger } from "@/modules/logger"

import type { EnhancementOptions, EnhancementType, TranslationOptions } from "../"
import { useTextEnhancement } from "../hooks"
import { useTranslation } from "../hooks/useTranslation"

import { TextEnhancementSettingsDrawer } from "./TextEnhancementSettingsDrawer"
import { TranslationSettingsDrawer } from "./TranslationSettingsDrawer"
import { MarkdownAdvanceEditor } from "./markdownEditor/components/MarkdownAdvanceEditor"

const log = createContextLogger("TextEnhancementEditor")

interface TextEnhancementEditorProps {
	value: string
	onChange: (value: string) => void
	placeholder?: string
	title?: string
	description?: string
	maxLength?: number
	selectedTheme?: string
	className?: string
	defaultPreviewMode?: boolean
	showAICorrection?: boolean
	showTranslate?: boolean
	showMarkdownToolbar?: boolean
	showTitle?: boolean
	isLoading?: boolean
	isTranslating?: boolean
	height?: string
	minHeight?: string
	autoHeight?: boolean // コンテンツに合わせて高さを自動調整
	disableAICorrection?: boolean
	disableTranslate?: boolean
	showDownloadButton?: boolean // ダウンロードボタン表示フラグ
	downloadFilename?: string // ダウンロードファイル名
}

export const TextEnhancementEditor: React.FC<TextEnhancementEditorProps> = ({
	value,
	onChange,
	placeholder = "テキストを入力してください...",
	title = "",
	description = "",
	maxLength: _maxLength = 30000, // Currently unused after TextEditor bypass
	selectedTheme: _selectedTheme = "medical_business",
	className = "",
	defaultPreviewMode: _defaultPreviewMode = false,
	showAICorrection = true,
	showTranslate = true,
	showMarkdownToolbar = true,
	showTitle = false,
	isLoading: externalIsLoading = false,
	isTranslating: externalIsTranslating = false,
	height: _height,
	minHeight: _minHeight,
	autoHeight = false,
	disableAICorrection = false,
	disableTranslate = false,
	showDownloadButton = true,
	downloadFilename = "document.md",
}) => {
	// 設定Drawer状態
	const [showSettingsDrawer, setShowSettingsDrawer] = useState(false)
	const [showTranslationDrawer, setShowTranslationDrawer] = useState(false)

	// カスタムフック
	const { enhance, bestResult, isLoading, error, clearResults } = useTextEnhancement()

	// 翻訳機能フック
	const {
		translate,
		result: translationResult,
		isLoading: isTranslating,
		error: translationError,
		clearResults: clearTranslationResults,
	} = useTranslation()

	// サマリー実行ハンドラー（Drawer内で実行）
	const handleSummarize = useCallback(
		async (enhancementType: EnhancementType, options: EnhancementOptions) => {
			if (!value?.trim()) {
				alert("テキストを入力してください")
				return
			}

			try {
				log.debug("[AI] Starting enhancement:", {
					type: enhancementType,
					addAnalysis: options.addAnalysis,
					addSupplements: options.addSupplements,
				})

				// 既存の結果をクリア
				clearResults()

				await enhance(value, enhancementType, options)

				// Drawerを閉じる
				setShowSettingsDrawer(false)
			} catch (error) {
				log.error("[AI] Enhancement failed:", error)
				alert(
					`要約処理でエラーが発生しました: ${error instanceof Error ? error.message : "不明なエラー"}`
				)
			}
		},
		[value, enhance, clearResults]
	)

	// 翻訳実行ハンドラー（Drawer内で実行）
	const handleTranslate = useCallback(
		async (options: TranslationOptions) => {
			if (!value?.trim()) {
				alert("翻訳するテキストを入力してください")
				return
			}

			try {
				log.debug("[Translation] Starting:", options.targetLanguage)

				// 既存の結果をクリア
				clearTranslationResults()

				await translate(value, options)

				// Drawerを閉じる
				setShowTranslationDrawer(false)
			} catch (error) {
				log.error("[Translation] Failed:", error)
				alert(
					`翻訳処理でエラーが発生しました: ${error instanceof Error ? error.message : "不明なエラー"}`
				)
			}
		},
		[value, translate, clearTranslationResults]
	)

	// AI翻訳結果をテキストエリアに反映
	useEffect(() => {
		if (translationResult) {
			log.debug("[Translation] Result received, applying to text area")
			onChange(translationResult.translatedText)
		}
	}, [translationResult, onChange])

	// AI校正結果をテキストエリアに反映
	useEffect(() => {
		if (bestResult) {
			log.debug("[AI] Result received - sections:", {
				summary: !!bestResult.finalOutput.summary,
				analysis: !!bestResult.finalOutput.analysisText,
				supplements: !!bestResult.finalOutput.supplements,
				enhanced: !!bestResult.finalOutput.enhancedText,
			})

			// AI校正機能（summary-fix）の結果はテキストエリアに反映
			if (bestResult.finalOutput.summary) {
				// 分析と補足を含む完全な結果を構築
				let fullResult = bestResult.finalOutput.summary

				// 分析セクションを追加
				if (bestResult.finalOutput.analysisText) {
					log.debug("[AI] Adding analysis section")
					fullResult += `\n\n${bestResult.finalOutput.analysisText}`
				}

				// 補足セクションを追加
				if (
					bestResult.finalOutput.supplements &&
					Array.isArray(bestResult.finalOutput.supplements) &&
					bestResult.finalOutput.supplements.length > 0
				) {
					log.debug("[AI] Adding supplements section", {
						supplementsCount: bestResult.finalOutput.supplements.length,
					})
					fullResult += `\n\n## 補足情報\n\n${bestResult.finalOutput.supplements.map(s => `- ${s}`).join("\n")}`
				}

				onChange(fullResult)
			} else if (bestResult.finalOutput.enhancedText) {
				onChange(bestResult.finalOutput.enhancedText)
			}
		}
	}, [bestResult, onChange])

	// 文字数カウント (Currently unused after TextEditor bypass)
	// const _characterCount = value?.length || 0; // Commented out to avoid TypeScript warning

	return (
		<div className={`w-full bg-white rounded-xl shadow-lg p-0 ${className}`}>
			{/* タイトル */}
			{showTitle && title && (
				<div className="border-b border-gray-200 px-6 py-4">
					<h3 className="text-xl font-semibold text-gray-900">{title}</h3>
				</div>
			)}

			{/* テキストエディタ */}
			<div className="mb-6">
				<MarkdownAdvanceEditor
					initialContent={value}
					onMarkdownChange={onChange}
					placeholder={placeholder}
					editable={true}
					showToolbar={showMarkdownToolbar}
					autoHeight={autoHeight}
					showDownloadButton={showDownloadButton}
					downloadFilename={downloadFilename}
					className={`min-h-[${_minHeight}] ${_height ? `h-[${_height}]` : ""}`}
				/>
			</div>

			{/* AI機能ボタン - TextEditor外に移動 */}
			{(showAICorrection || showTranslate) && (
				<div className="flex items-center justify-center space-x-3 mb-6">
					{showAICorrection && !disableAICorrection && (
						<button
							type="button"
							onClick={() => setShowSettingsDrawer(true)}
							disabled={externalIsLoading || isLoading || externalIsTranslating || isTranslating}
							className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors flex items-center space-x-2"
						>
							<MdAutoFixHigh className="w-4 h-4" />
							<span>AI校正</span>
						</button>
					)}

					{showTranslate && !disableTranslate && (
						<button
							type="button"
							onClick={() => setShowTranslationDrawer(true)}
							disabled={externalIsLoading || isLoading || externalIsTranslating || isTranslating}
							className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors flex items-center space-x-2"
						>
							<FaGlobe className="w-4 h-4" />
							<span>AI翻訳</span>
						</button>
					)}
				</div>
			)}

			{/* エラー表示 */}
			{error && (
				<div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3">
					<MdError className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
					<div>
						<h4 className="text-red-800 font-semibold mb-1">エラーが発生しました</h4>
						<p className="text-red-700 text-sm">{error}</p>
					</div>
				</div>
			)}

			{translationError && (
				<div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3">
					<MdError className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
					<div>
						<h4 className="text-red-800 font-semibold mb-1">翻訳エラーが発生しました</h4>
						<p className="text-red-700 text-sm">{translationError}</p>
					</div>
				</div>
			)}

			{/* 設定Drawer */}
			<TextEnhancementSettingsDrawer
				open={showSettingsDrawer}
				onClose={() => setShowSettingsDrawer(false)}
				onSummarize={handleSummarize}
				inputText={value}
			/>

			<TranslationSettingsDrawer
				open={showTranslationDrawer}
				onClose={() => setShowTranslationDrawer(false)}
				onTranslate={handleTranslate}
				inputText={value}
			/>

			{/* 下部の説明文 */}
			{description && (
				<div className="border-t border-gray-200 px-4 py-3">
					<div className="text-sm text-gray-500">
						<span>{description}</span>
					</div>
				</div>
			)}
		</div>
	)
}
