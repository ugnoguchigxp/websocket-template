/**
 * EnhancementOptionsForm - 変換オプション設定フォーム
 *
 * ユーザーが変換の詳細設定を行うコンポーネント
 */

import type React from "react"

import {
	type EnhancementOptions,
	FORMATS,
	SUMMARY_LENGTHS,
	TARGET_AUDIENCES,
} from "../types/textEnhancement"

interface EnhancementOptionsFormProps {
	options: EnhancementOptions
	onChange: (options: EnhancementOptions) => void
	disabled?: boolean
}

export const EnhancementOptionsForm: React.FC<EnhancementOptionsFormProps> = ({
	options,
	onChange,
	disabled = false,
}) => {
	const updateOption = <K extends keyof EnhancementOptions>(
		key: K,
		value: EnhancementOptions[K]
	) => {
		onChange({
			...options,
			[key]: value,
		})
	}

	return (
		<div className="space-y-4">
			<h3 className="text-lg font-medium text-gray-900 mb-3">変換オプション</h3>

			{/* 要約の長さ */}
			<div>
				<label className="block text-sm font-medium text-gray-700 mb-2">要約の長さ</label>
				<select
					value={options.summaryLength}
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					onChange={e => updateOption("summaryLength", e.target.value as any)}
					className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
					disabled={disabled}
				>
					<option value={SUMMARY_LENGTHS.SHORT}>短い（50-100文字、キーポイントのみ）</option>
					<option value={SUMMARY_LENGTHS.MEDIUM}>標準（150-300文字、主要内容を網羅）</option>
					<option value={SUMMARY_LENGTHS.LONG}>詳細（400-600文字、背景情報含む）</option>
				</select>
			</div>

			{/* 出力形式 */}
			<div>
				<label className="block text-sm font-medium text-gray-700 mb-2">出力形式</label>
				<div className="grid grid-cols-2 gap-3">
					<label className="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
						<input
							type="radio"
							name="format"
							value={FORMATS.PLAIN_TEXT}
							checked={options.format === FORMATS.PLAIN_TEXT}
							// eslint-disable-next-line @typescript-eslint/no-explicit-any
							onChange={e => updateOption("format", e.target.value as any)}
							className="sr-only"
							disabled={disabled}
						/>
						<div
							className={`w-4 h-4 rounded-full border-2 mr-3 flex items-center justify-center ${
								options.format === FORMATS.PLAIN_TEXT
									? "border-blue-600 bg-blue-600"
									: "border-gray-300"
							}`}
						>
							{options.format === FORMATS.PLAIN_TEXT && (
								<div className="w-2 h-2 rounded-full bg-white" />
							)}
						</div>
						<div>
							<div className="font-medium text-gray-900">プレーンテキスト</div>
							<div className="text-sm text-gray-600">【】セクション形式</div>
						</div>
					</label>

					<label className="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
						<input
							type="radio"
							name="format"
							value={FORMATS.MARKDOWN}
							checked={options.format === FORMATS.MARKDOWN}
							// eslint-disable-next-line @typescript-eslint/no-explicit-any
							onChange={e => updateOption("format", e.target.value as any)}
							className="sr-only"
							disabled={disabled}
						/>
						<div
							className={`w-4 h-4 rounded-full border-2 mr-3 flex items-center justify-center ${
								options.format === FORMATS.MARKDOWN
									? "border-blue-600 bg-blue-600"
									: "border-gray-300"
							}`}
						>
							{options.format === FORMATS.MARKDOWN && (
								<div className="w-2 h-2 rounded-full bg-white" />
							)}
						</div>
						<div>
							<div className="font-medium text-gray-900">Markdown</div>
							<div className="text-sm text-gray-600">## 見出し形式</div>
						</div>
					</label>
				</div>
			</div>

			{/* 対象読者 */}
			<div>
				<label className="block text-sm font-medium text-gray-700 mb-2">対象読者</label>
				<select
					value={options.targetAudience}
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					onChange={e => updateOption("targetAudience", e.target.value as any)}
					className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
					disabled={disabled}
				>
					<option value={TARGET_AUDIENCES.GENERAL}>一般向け（平易な表現、専門用語には説明）</option>
					<option value={TARGET_AUDIENCES.TECHNICAL}>
						技術者向け（技術用語そのまま、詳細情報）
					</option>
					<option value={TARGET_AUDIENCES.EXECUTIVE}>
						役員向け（簡潔で要点明確、ビジネス価値重視）
					</option>
				</select>
			</div>

			{/* 補足情報 */}
			<div>
				<label className="flex items-center space-x-3">
					<input
						type="checkbox"
						checked={options.addSupplements}
						onChange={e => updateOption("addSupplements", e.target.checked)}
						className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
						disabled={disabled}
					/>
					<div>
						<div className="font-medium text-gray-900">補足情報を追加</div>
						<div className="text-sm text-gray-600">
							専門用語の説明や背景情報を含める（Phase 2 で実装予定）
						</div>
					</div>
				</label>
			</div>

			{/* 言語設定 */}
			<div>
				<label className="block text-sm font-medium text-gray-700 mb-2">言語</label>
				<select
					value={options.language}
					onChange={e => updateOption("language", e.target.value)}
					className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
					disabled={disabled}
				>
					<option value="ja">日本語</option>
					<option value="en">English</option>
				</select>
			</div>

			{/* 設定プリセット */}
			<div className="pt-4 border-t border-gray-200">
				<div className="flex items-center justify-between mb-3">
					<span className="text-sm font-medium text-gray-700">クイック設定</span>
				</div>
				<div className="grid grid-cols-3 gap-2">
					<button
						onClick={() =>
							onChange({
								summaryLength: SUMMARY_LENGTHS.SHORT,
								format: FORMATS.PLAIN_TEXT,
								targetAudience: TARGET_AUDIENCES.EXECUTIVE,
								addSupplements: false,
								addAnalysis: false,
								language: "ja",
							})
						}
						className="p-2 text-xs border border-gray-300 rounded hover:bg-gray-50 transition-colors"
						disabled={disabled}
					>
						役員向け
						<br />
						<span className="text-gray-500">短い・テキスト</span>
					</button>
					<button
						onClick={() =>
							onChange({
								summaryLength: SUMMARY_LENGTHS.MEDIUM,
								format: FORMATS.MARKDOWN,
								targetAudience: TARGET_AUDIENCES.GENERAL,
								addSupplements: true,
								addAnalysis: true,
								language: "ja",
							})
						}
						className="p-2 text-xs border border-gray-300 rounded hover:bg-gray-50 transition-colors"
						disabled={disabled}
					>
						一般向け
						<br />
						<span className="text-gray-500">標準・Markdown</span>
					</button>
					<button
						onClick={() =>
							onChange({
								summaryLength: SUMMARY_LENGTHS.LONG,
								format: FORMATS.PLAIN_TEXT,
								targetAudience: TARGET_AUDIENCES.TECHNICAL,
								addSupplements: true,
								addAnalysis: true,
								language: "ja",
							})
						}
						className="p-2 text-xs border border-gray-300 rounded hover:bg-gray-50 transition-colors"
						disabled={disabled}
					>
						技術者向け
						<br />
						<span className="text-gray-500">詳細・テキスト</span>
					</button>
				</div>
			</div>
		</div>
	)
}
