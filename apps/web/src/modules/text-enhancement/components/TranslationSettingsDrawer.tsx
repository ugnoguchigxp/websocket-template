/**
 * TranslationSettingsDrawer - AI翻訳機能の設定Drawer
 *
 * AI翻訳の設定項目を管理するためのDrawerコンポーネント
 */

import type React from "react"
import { useEffect, useState } from "react"

import { createContextLogger } from "@/modules/logger"

const log = createContextLogger("TranslationSettingsDrawer")

import {
	LANGUAGES,
	LANGUAGE_INFO,
	type Language,
	OUTPUT_FORMATS,
	type OutputFormat,
	TRANSLATION_MODES,
	type TranslationMode,
	type TranslationOptions,
} from "../types/translation"

interface TranslationSettingsDrawerProps {
	open: boolean
	onClose: () => void
	onTranslate?: (options: TranslationOptions) => Promise<void>
	inputText?: string
}

export const TranslationSettingsDrawer: React.FC<TranslationSettingsDrawerProps> = ({
	open,
	onClose,
	onTranslate,
	inputText = "",
}) => {
	// ローカル設定状態
	const [localOptions, setLocalOptions] = useState<TranslationOptions>({
		targetLanguage: LANGUAGES.EN,
		sourceLanguage: undefined, // 自動検出
		mode: TRANSLATION_MODES.NATURAL,
		outputFormat: OUTPUT_FORMATS.PLAIN_TEXT,
		preserveFormatting: false,
		includeAlternatives: false,
	})

	const [isProcessing, setIsProcessing] = useState(false)

	// localStorage から設定を読み込み（初回のみ）
	useEffect(() => {
		const savedSettings = localStorage.getItem("translation-settings")
		if (savedSettings) {
			try {
				const parsed = JSON.parse(savedSettings)
				setLocalOptions(prev => ({ ...prev, ...parsed }))
			} catch (error) {
				log.warn("翻訳設定の読み込みに失敗しました:", error)
			}
		}
	}, [])

	// 設定変更とlocalStorage保存を行う関数
	const handleSettingChange = <K extends keyof TranslationOptions>(
		key: K,
		value: TranslationOptions[K]
	) => {
		log.debug(`[TranslationDrawer] Setting change: ${key} = ${value}`)
		const newOptions = { ...localOptions, [key]: value }
		log.debug("[TranslationDrawer] New localOptions:", newOptions)
		setLocalOptions(newOptions)

		// localStorage に保存
		try {
			localStorage.setItem("translation-settings", JSON.stringify(newOptions))
		} catch (error) {
			log.error("Failed to save translation settings to localStorage:", error)
			// エラーを無視して続行（graceful handling）
		}
	}

	// AI翻訳実行ハンドラー
	const handleTranslate = async () => {
		if (!onTranslate || !inputText.trim()) {
			return
		}

		setIsProcessing(true)
		try {
			log.debug("Translation Drawer sending options:", localOptions)
			await onTranslate(localOptions)
		} catch (error) {
			log.error("翻訳処理エラー:", error)
			alert("翻訳処理でエラーが発生しました。")
		} finally {
			setIsProcessing(false)
		}
	}

	// 対象言語選択肢（ソース言語と同じ言語は除外）
	const getTargetLanguageOptions = () => {
		return Object.values(LANGUAGES).filter(lang => lang !== localOptions.sourceLanguage)
	}

	// ソース言語選択肢（対象言語と同じ言語は除外）
	const getSourceLanguageOptions = () => {
		return Object.values(LANGUAGES).filter(lang => lang !== localOptions.targetLanguage)
	}

	if (!open) {
		return null
	}

	return (
		<div className="fixed inset-0 z-50 overflow-hidden">
			{/* オーバーレイ */}
			<div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />

			{/* Drawer */}
			<div className="absolute right-0 top-0 h-full w-96 bg-white shadow-xl transform transition-transform duration-300 ease-in-out">
				<div className="flex flex-col h-full">
					{/* ヘッダー */}
					<div className="flex items-center justify-between p-6 border-b border-gray-200">
						<div className="flex items-center space-x-2">
							<svg
								className="w-5 h-5 text-gray-600"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
								/>
							</svg>
							<h2 className="text-lg font-semibold text-gray-900">AI翻訳設定</h2>
						</div>

						<button
							onClick={onClose}
							className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
						>
							<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M6 18L18 6M6 6l12 12"
								/>
							</svg>
						</button>
					</div>

					{/* コンテンツ */}
					<div className="flex-1 overflow-y-auto p-4 space-y-4">
						{/* AI翻訳実行ボタン */}
						<div className="pb-2">
							<button
								onClick={handleTranslate}
								disabled={isProcessing || !inputText.trim()}
								className="w-full py-3 px-6 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
							>
								{isProcessing ? (
									<div className="flex items-center justify-center space-x-2">
										<div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
										<span>翻訳中...</span>
									</div>
								) : (
									"AI翻訳実行"
								)}
							</button>
						</div>

						{/* 翻訳オプション */}
						<div className="bg-gray-50 rounded-lg p-3 space-y-4">
							<h3 className="text-base font-semibold text-gray-900">翻訳オプション</h3>

							{/* 対象言語選択 */}
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									翻訳先言語 <span className="text-red-500">*</span>
								</label>
								<select
									value={localOptions.targetLanguage}
									onChange={e => handleSettingChange("targetLanguage", e.target.value as Language)}
									className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
								>
									{getTargetLanguageOptions().map(lang => (
										<option key={lang} value={lang}>
											{LANGUAGE_INFO[lang].nativeName} ({LANGUAGE_INFO[lang].name})
										</option>
									))}
								</select>
							</div>

							{/* ソース言語選択 */}
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">翻訳元言語</label>
								<select
									value={localOptions.sourceLanguage || ""}
									onChange={e =>
										handleSettingChange(
											"sourceLanguage",
											e.target.value ? (e.target.value as Language) : undefined
										)
									}
									className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
								>
									<option value="">自動検出</option>
									{getSourceLanguageOptions().map(lang => (
										<option key={lang} value={lang}>
											{LANGUAGE_INFO[lang].nativeName} ({LANGUAGE_INFO[lang].name})
										</option>
									))}
								</select>
							</div>

							{/* 翻訳モード */}
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">翻訳モード</label>
								<select
									value={localOptions.mode}
									onChange={e => handleSettingChange("mode", e.target.value as TranslationMode)}
									className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
								>
									<option value={TRANSLATION_MODES.NATURAL}>自然な翻訳</option>
									<option value={TRANSLATION_MODES.LITERAL}>直訳</option>
									<option value={TRANSLATION_MODES.FORMAL}>敬語・丁寧語</option>
									<option value={TRANSLATION_MODES.CASUAL}>カジュアル</option>
									<option value={TRANSLATION_MODES.TECHNICAL}>技術文書</option>
									<option value={TRANSLATION_MODES.BUSINESS}>ビジネス文書</option>
								</select>
							</div>

							{/* 出力形式 */}
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">出力形式</label>
								<select
									value={localOptions.outputFormat}
									onChange={e =>
										handleSettingChange("outputFormat", e.target.value as OutputFormat)
									}
									className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
								>
									<option value={OUTPUT_FORMATS.PLAIN_TEXT}>プレーンテキスト</option>
									<option value={OUTPUT_FORMATS.MARKDOWN}>Markdown</option>
								</select>
							</div>

							{/* 書式保持 */}
							<div className="flex items-center space-x-3">
								<input
									type="checkbox"
									id="preserveFormatting"
									checked={localOptions.preserveFormatting}
									onChange={e => handleSettingChange("preserveFormatting", e.target.checked)}
									className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
								/>
								<label htmlFor="preserveFormatting" className="text-sm font-medium text-gray-700">
									書式を保持する
								</label>
							</div>

							{/* 代替翻訳 */}
							<div className="flex items-center space-x-3">
								<input
									type="checkbox"
									id="includeAlternatives"
									checked={localOptions.includeAlternatives}
									onChange={e => handleSettingChange("includeAlternatives", e.target.checked)}
									className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
								/>
								<label htmlFor="includeAlternatives" className="text-sm font-medium text-gray-700">
									代替翻訳を含める
								</label>
							</div>
						</div>

						{/* 入力テキスト情報 */}
						<div className="bg-blue-50 rounded-lg p-3">
							<h4 className="text-sm font-medium text-blue-900 mb-2">入力テキスト情報</h4>
							<div className="text-sm text-blue-800">
								<div>文字数: {inputText.length.toLocaleString()}文字</div>
								<div>推定処理時間: {Math.max(2, Math.ceil(inputText.length / 200))}秒</div>
							</div>
						</div>

						{/* 注意事項 */}
						<div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
							<h4 className="text-sm font-medium text-yellow-800 mb-1">注意事項</h4>
							<ul className="text-xs text-yellow-700 space-y-1">
								<li>• 最大10,000文字まで翻訳可能です</li>
								<li>• 1分間に最大30回までの翻訳が可能です</li>
								<li>• 専門用語は文脈に応じて翻訳されます</li>
								<li>• 代替翻訳は最大3つまで提供されます</li>
							</ul>
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}

export default TranslationSettingsDrawer
