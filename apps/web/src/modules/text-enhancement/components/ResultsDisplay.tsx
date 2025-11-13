/**
 * ResultsDisplay - 処理結果表示コンポーネント
 *
 * AI処理の結果を表示し、ユーザーが選択・採用できるインターフェース
 */

import type React from "react"

import type { AgentResult, BestResult } from "../types/textEnhancement"

interface ResultsDisplayProps {
	results: AgentResult[]
	bestResult: BestResult | null
	onAcceptResult: (agentId: string) => void
	isLoading: boolean
}

export const ResultsDisplay: React.FC<ResultsDisplayProps> = ({
	results,
	bestResult,
	onAcceptResult,
	isLoading,
}) => {
	if (isLoading || results.length === 0) {
		return null
	}

	return (
		<div className="space-y-6">
			{/* ベスト結果 */}
			{bestResult && (
				<div className="bg-green-50 border border-green-200 rounded-lg p-6">
					<div className="flex items-center justify-between mb-4">
						<div className="flex items-center space-x-3">
							<div className="w-3 h-3 bg-green-500 rounded-full" />
							<h3 className="text-lg font-semibold text-green-900">推奨結果</h3>
							<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
								スコア: {(bestResult.combinedScore * 100).toFixed(1)}%
							</span>
						</div>
						<button
							onClick={() => onAcceptResult(bestResult.agentId)}
							className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
						>
							この結果を採用
						</button>
					</div>

					<div className="bg-white rounded-lg p-4 border border-green-100">
						{bestResult.finalOutput.summary && (
							<div className="mb-4">
								<div className="text-sm font-medium text-gray-700 mb-2 flex items-center">
									<svg
										className="w-4 h-4 mr-1 text-green-600"
										fill="currentColor"
										viewBox="0 0 20 20"
									>
										<path
											fillRule="evenodd"
											d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1z"
											clipRule="evenodd"
										/>
									</svg>
									要約:
								</div>
								<div className="text-gray-900 whitespace-pre-line leading-relaxed">
									{bestResult.finalOutput.summary}
								</div>
							</div>
						)}

						{bestResult.finalOutput.enhancedText && (
							<div className="mb-4">
								<div className="text-sm font-medium text-gray-700 mb-2 flex items-center">
									<svg
										className="w-4 h-4 mr-1 text-green-600"
										fill="currentColor"
										viewBox="0 0 20 20"
									>
										<path
											fillRule="evenodd"
											d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 0h8v12H6V4z"
											clipRule="evenodd"
										/>
									</svg>
									改善文:
								</div>
								<div className="text-gray-900 leading-relaxed">
									{bestResult.finalOutput.enhancedText}
								</div>
							</div>
						)}

						{bestResult.finalOutput.supplements &&
							bestResult.finalOutput.supplements.length > 0 && (
								<div>
									<div className="text-sm font-medium text-gray-700 mb-2 flex items-center">
										<svg
											className="w-4 h-4 mr-1 text-green-600"
											fill="currentColor"
											viewBox="0 0 20 20"
										>
											<path
												fillRule="evenodd"
												d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
												clipRule="evenodd"
											/>
										</svg>
										補足情報:
									</div>
									<div className="space-y-1">
										{bestResult.finalOutput.supplements.map((supplement, index) => (
											<div key={index} className="text-sm text-gray-600 flex items-start">
												<span className="text-gray-400 mr-2">•</span>
												<span>{supplement}</span>
											</div>
										))}
									</div>
								</div>
							)}
					</div>
				</div>
			)}

			{/* その他の候補結果 */}
			{results.filter(r => r.agentId !== bestResult?.agentId).length > 0 && (
				<div>
					<h3 className="text-lg font-semibold text-gray-900 mb-4">その他の候補</h3>
					<div className="space-y-4">
						{results
							.filter(r => r.agentId !== bestResult?.agentId)
							.map(result => (
								<AlternativeResultCard
									key={result.agentId}
									result={result}
									onAccept={() => onAcceptResult(result.agentId)}
								/>
							))}
					</div>
				</div>
			)}

			{/* 統計情報 */}
			<div className="bg-gray-50 rounded-lg p-4">
				<h4 className="text-sm font-medium text-gray-700 mb-3">処理統計</h4>
				<div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
					<div>
						<div className="text-gray-500">処理エージェント数</div>
						<div className="font-medium text-gray-900">{results.length}</div>
					</div>
					<div>
						<div className="text-gray-500">平均スコア</div>
						<div className="font-medium text-gray-900">
							{results.length > 0
								? `${((results.reduce((sum, r) => sum + r.score, 0) / results.length) * 100).toFixed(1)}%`
								: "-"}
						</div>
					</div>
					<div>
						<div className="text-gray-500">総処理時間</div>
						<div className="font-medium text-gray-900">
							{results.length > 0
								? `${results.reduce((sum, r) => sum + (r.processingTime || 0), 0).toFixed(1)}秒`
								: "-"}
						</div>
					</div>
					<div>
						<div className="text-gray-500">最高スコア</div>
						<div className="font-medium text-gray-900">
							{results.length > 0
								? `${(Math.max(...results.map(r => r.score)) * 100).toFixed(1)}%`
								: "-"}
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}

interface AlternativeResultCardProps {
	result: AgentResult
	onAccept: () => void
}

const AlternativeResultCard: React.FC<AlternativeResultCardProps> = ({ result, onAccept }) => {
	return (
		<div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
			<div className="flex items-center justify-between mb-3">
				<div className="flex items-center space-x-3">
					<div className="w-2 h-2 bg-gray-400 rounded-full" />
					<span className="text-sm font-medium text-gray-700">
						{getAgentDisplayName(result.agentType)}
					</span>
					<span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
						スコア: {(result.score * 100).toFixed(1)}%
					</span>
					{result.processingTime && (
						<span className="text-xs text-gray-500">{result.processingTime.toFixed(1)}秒</span>
					)}
				</div>
				<button
					onClick={onAccept}
					className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors text-sm"
				>
					採用
				</button>
			</div>

			<div className="bg-white rounded p-3 border border-gray-100">{renderAgentOutput(result)}</div>
		</div>
	)
}

// ヘルパー関数
const getAgentDisplayName = (agentType: string): string => {
	switch (agentType) {
		case "summary":
			return "要約エージェント"
		case "enhancement":
			return "改善エージェント"
		case "supplement":
			return "補足エージェント"
		case "evaluation":
			return "評価エージェント"
		default:
			return agentType
	}
}

const renderAgentOutput = (result: AgentResult): React.ReactNode => {
	const { output } = result

	return (
		<div className="space-y-3">
			{output.summary && (
				<div>
					<div className="text-xs font-medium text-gray-600 mb-1">要約:</div>
					<div className="text-sm text-gray-900 whitespace-pre-line">{output.summary}</div>
					{output.wordCount && (
						<div className="text-xs text-gray-500 mt-1">文字数: {output.wordCount}</div>
					)}
				</div>
			)}

			{output.enhancedText && (
				<div>
					<div className="text-xs font-medium text-gray-600 mb-1">改善文:</div>
					<div className="text-sm text-gray-900">{output.enhancedText}</div>
				</div>
			)}

			{output.improvements && output.improvements.length > 0 && (
				<div>
					<div className="text-xs font-medium text-gray-600 mb-1">改善項目:</div>
					<div className="flex flex-wrap gap-1">
						{output.improvements.map((improvement, index) => (
							<span
								key={index}
								className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-800"
							>
								{getImprovementTypeName(improvement.type)}: {improvement.count}件
							</span>
						))}
					</div>
				</div>
			)}

			{output.supplements && output.supplements.length > 0 && (
				<div>
					<div className="text-xs font-medium text-gray-600 mb-1">補足:</div>
					<div className="space-y-1">
						{output.supplements.slice(0, 3).map((supplement, index) => (
							<div key={index} className="text-xs text-gray-600">
								<span className="font-medium">{supplement.term}:</span> {supplement.explanation}
							</div>
						))}
						{output.supplements.length > 3 && (
							<div className="text-xs text-gray-500">他{output.supplements.length - 3}件...</div>
						)}
					</div>
				</div>
			)}
		</div>
	)
}

const getImprovementTypeName = (type: string): string => {
	switch (type) {
		case "grammar":
			return "文法"
		case "clarity":
			return "明確性"
		case "structure":
			return "構造"
		case "conciseness":
			return "簡潔性"
		case "terminology":
			return "用語"
		default:
			return type
	}
}
