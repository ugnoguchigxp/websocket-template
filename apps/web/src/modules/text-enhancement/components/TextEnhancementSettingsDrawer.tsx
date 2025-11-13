/**
 * TextEnhancementSettingsDrawer - AI文章校正機能の設定Drawer
 *
 * AI文章校正の設定項目を管理するためのDrawerコンポーネント
 */

import type React from "react"
import { useEffect, useState } from "react"

import { createContextLogger } from "@/modules/logger"

import {
	ENHANCEMENT_TYPES,
	type EnhancementOptions,
	FORMATS,
	type EnhancementType as PageEnhancementType,
	SUMMARY_LENGTHS,
	TARGET_AUDIENCES,
} from "../"
import { getFromStorage, setToStorage } from "../../../utils/localStorage"
import { useAIProofreadingSettings } from "../hooks"

const log = createContextLogger("TextEnhancementSettingsDrawer")

interface TextEnhancementSettingsDrawerProps {
	open: boolean
	onClose: () => void
	onSummarize?: (enhancementType: PageEnhancementType, options: EnhancementOptions) => Promise<void>
	inputText?: string
}

export const TextEnhancementSettingsDrawer: React.FC<TextEnhancementSettingsDrawerProps> = ({
	open,
	onClose,
	onSummarize,
	inputText = "",
}) => {
	// AI文章校正設定フック
	const {
		settings: aiSettings,
		isLoading: aiIsLoading,
		updateSetting: updateAISetting,
	} = useAIProofreadingSettings()

	// ローカル設定状態（AI設定から初期化）
	const [localOptions, setLocalOptions] = useState<EnhancementOptions>({
		summaryLength: SUMMARY_LENGTHS.MEDIUM,
		format: FORMATS.MARKDOWN,
		targetAudience: TARGET_AUDIENCES.GENERAL,
		addSupplements: true,
		addAnalysis: true,
		language: "ja",
	})

	// AI設定が読み込まれたらローカル設定を更新
	useEffect(() => {
		if (!aiIsLoading && aiSettings) {
			setLocalOptions(aiSettings)

			// スライダーの値も更新（保存された値があればそれを使用、なければデフォルト）
			let sliderValue = 75 // デフォルト
			if (aiSettings.summaryLength === SUMMARY_LENGTHS.SHORT) sliderValue = 20
			else if (aiSettings.summaryLength === SUMMARY_LENGTHS.MEDIUM) sliderValue = 50
			else if (aiSettings.summaryLength === SUMMARY_LENGTHS.LONG) sliderValue = 80

			// もしlocalStorageに具体的なスライダー値が保存されていればそれを使用
			const savedSliderValue = getFromStorage("ai-text-proofreading-slider-value", sliderValue)
			setSummaryLengthValue(savedSliderValue)
		}
	}, [aiSettings, aiIsLoading])

	// 設定変更とlocalStorage保存を行う関数
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const handleSettingChange = (key: keyof EnhancementOptions, value: any) => {
		log.debug("Setting change", { key, value })
		const newOptions = { ...localOptions, [key]: value }
		log.debug("New localOptions", { newOptions })
		setLocalOptions(newOptions)
		updateAISetting(key, value)
	}

	// 校正後文章の長さ（1-100のスライダー値）
	const [summaryLengthValue, setSummaryLengthValue] = useState(75)

	const [isProcessing, setIsProcessing] = useState(false)

	// AI文章校正実行ハンドラー
	const handleSummarize = async () => {
		if (!onSummarize || !inputText.trim()) {
			return
		}

		setIsProcessing(true)
		try {
			// サマリー固定
			const pageEnhancementType = ENHANCEMENT_TYPES.SUMMARY

			// システム定数を含めた完全なオプションを構築
			const completeOptions: EnhancementOptions = {
				...localOptions,
				// システム定数を追加
				maxAgents: 3,
				enableParallelProcessing: true,
				language: "ja", // Layout言語セレクターから取得するのが理想
			}

			log.debug("Sending enhancement options", {
				localOptions,
				pageEnhancementType,
				completeOptions,
				addAnalysis: completeOptions.addAnalysis,
				addSupplements: completeOptions.addSupplements,
			})

			await onSummarize(pageEnhancementType, completeOptions)
		} catch (error) {
			log.error("Summary processing error", { error })
			alert("サマリー処理でエラーが発生しました。")
		} finally {
			setIsProcessing(false)
		}
	}

	if (!open) {
		return null
	}

	if (aiIsLoading) {
		return (
			<div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
				<div className="bg-white rounded-lg p-6">
					<div className="flex items-center space-x-3">
						<div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
						<span className="text-gray-700">設定を読み込み中...</span>
					</div>
				</div>
			</div>
		)
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
									d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
								/>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
								/>
							</svg>
							<h2 className="text-lg font-semibold text-gray-900">AI文章校正設定</h2>
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
						{/* AI文章校正実行ボタン */}
						<div className="pb-2">
							<button
								onClick={handleSummarize}
								disabled={isProcessing || !inputText.trim()}
								className="w-full py-3 px-6 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
							>
								{isProcessing ? (
									<div className="flex items-center justify-center space-x-2">
										<div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
										<span>AI処理中...</span>
									</div>
								) : (
									"AI文章校正実行"
								)}
							</button>
						</div>

						{/* 変換オプション */}
						<div className="bg-gray-50 rounded-lg p-3 space-y-3">
							<h3 className="text-base font-semibold text-gray-900">AI文章校正オプション</h3>

							{/* 校正後文章の長さ（スライダー） */}
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									校正後文章の長さ: {summaryLengthValue}%
								</label>
								<input
									type="range"
									min="1"
									max="100"
									step="1"
									value={summaryLengthValue}
									onChange={e => {
										const value = Number.parseInt(e.target.value)
										setSummaryLengthValue(value)

										// スライダー値をlocalStorageに保存
										setToStorage("ai-text-proofreading-slider-value", value)

										// スライダー値に基づいて要約長を設定
										let summaryLength
										if (value <= 33) summaryLength = SUMMARY_LENGTHS.SHORT
										else if (value <= 66) summaryLength = SUMMARY_LENGTHS.MEDIUM
										else summaryLength = SUMMARY_LENGTHS.LONG
										handleSettingChange("summaryLength", summaryLength)
									}}
									className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
								/>
								<div className="flex justify-between text-xs text-gray-500 mt-1">
									<span>短め</span>
									<span>中程度</span>
									<span>長め</span>
								</div>
							</div>

							{/* 対象読者（ボタンセレクター） */}
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">対象読者</label>
								<div className="grid grid-cols-3 gap-2">
									<button
										type="button"
										onClick={() => handleSettingChange("targetAudience", TARGET_AUDIENCES.GENERAL)}
										className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
											localOptions.targetAudience === TARGET_AUDIENCES.GENERAL
												? "bg-blue-600 text-white border-blue-600"
												: "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
										}`}
									>
										一般
									</button>
									<button
										type="button"
										onClick={() =>
											handleSettingChange("targetAudience", TARGET_AUDIENCES.TECHNICAL)
										}
										className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
											localOptions.targetAudience === TARGET_AUDIENCES.TECHNICAL
												? "bg-blue-600 text-white border-blue-600"
												: "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
										}`}
									>
										技術者
									</button>
									<button
										type="button"
										onClick={() =>
											handleSettingChange("targetAudience", TARGET_AUDIENCES.EXECUTIVE)
										}
										className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
											localOptions.targetAudience === TARGET_AUDIENCES.EXECUTIVE
												? "bg-blue-600 text-white border-blue-600"
												: "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
										}`}
									>
										経営層
									</button>
								</div>
							</div>

							{/* 分析セクション追加 */}
							<div className="flex items-center justify-between">
								<div>
									<label className="block text-sm font-medium text-gray-700">
										分析セクションを追加
									</label>
									<p className="text-xs text-gray-500">データ分析・洞察・傾向分析を含める</p>
								</div>
								<label className="relative inline-flex items-center cursor-pointer">
									<input
										type="checkbox"
										checked={localOptions.addAnalysis}
										onChange={e => handleSettingChange("addAnalysis", e.target.checked)}
										className="sr-only peer"
									/>
									<div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
								</label>
							</div>

							{/* 補足情報追加 */}
							<div className="flex items-center justify-between">
								<div>
									<label className="block text-sm font-medium text-gray-700">補足情報を追加</label>
									<p className="text-xs text-gray-500">専門用語の説明や背景情報を含める</p>
								</div>
								<label className="relative inline-flex items-center cursor-pointer">
									<input
										type="checkbox"
										checked={localOptions.addSupplements}
										onChange={e => handleSettingChange("addSupplements", e.target.checked)}
										className="sr-only peer"
									/>
									<div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
								</label>
							</div>
						</div>

						{/* 基本設定 */}
						<div className="bg-gray-50 rounded-lg p-3 space-y-3">
							<h3 className="text-base font-semibold text-gray-900">基本設定</h3>

							{/* 出力フォーマット */}
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									出力フォーマット
								</label>
								<select
									value={localOptions.format}
									onChange={e => handleSettingChange("format", e.target.value)}
									className="w-full p-2 border border-gray-300 rounded-lg text-sm"
								>
									<option value="plain_text">プレーンテキスト</option>
									<option value="markdown">Markdown</option>
								</select>
								<p className="text-xs text-gray-500 mt-1">出力形式を選択してください</p>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}
