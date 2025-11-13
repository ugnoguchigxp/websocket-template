/**
 * ProgressDisplay - 処理進行状況表示コンポーネント
 *
 * AI処理の進行状況をリアルタイムで表示
 */

import type React from "react"

interface ProgressDisplayProps {
	isLoading: boolean
	progress: number
	message?: string
	currentAgent?: string
}

export const ProgressDisplay: React.FC<ProgressDisplayProps> = ({
	isLoading,
	progress,
	message = "AI処理中...",
	currentAgent,
}) => {
	if (!isLoading) {
		return null
	}

	return (
		<div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
			{/* ヘッダー */}
			<div className="flex items-center space-x-3 mb-4">
				<div className="flex-shrink-0">
					<div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
				</div>
				<div>
					<div className="font-medium text-blue-900">AI処理中</div>
					<div className="text-sm text-blue-700">{message}</div>
				</div>
			</div>

			{/* 進行状況バー */}
			<div className="mb-4">
				<div className="flex items-center justify-between text-sm text-blue-700 mb-2">
					<span>進行状況</span>
					<span>{Math.round(progress)}%</span>
				</div>
				<div className="w-full bg-blue-200 rounded-full h-3">
					<div
						className="bg-blue-600 h-3 rounded-full transition-all duration-500 ease-out"
						style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
					/>
				</div>
			</div>

			{/* 現在実行中のエージェント */}
			{currentAgent && (
				<div className="text-sm text-blue-700">
					<span className="font-medium">実行中:</span> {getAgentDisplayName(currentAgent)}
				</div>
			)}

			{/* 処理ステップ表示 */}
			<div className="mt-4 space-y-2">
				<ProcessingStep
					label="入力テキスト解析"
					isActive={progress > 0}
					isCompleted={progress > 20}
				/>
				<ProcessingStep
					label="SummaryAgent 実行"
					isActive={progress > 20}
					isCompleted={progress > 60}
				/>
				<ProcessingStep
					label="品質評価・最適化"
					isActive={progress > 60}
					isCompleted={progress > 90}
				/>
				<ProcessingStep
					label="結果生成完了"
					isActive={progress > 90}
					isCompleted={progress >= 100}
				/>
			</div>

			{/* 予想残り時間 */}
			{progress > 0 && progress < 100 && (
				<div className="mt-4 text-xs text-blue-600">
					予想残り時間: {getEstimatedTimeRemaining(progress)}
				</div>
			)}
		</div>
	)
}

interface ProcessingStepProps {
	label: string
	isActive: boolean
	isCompleted: boolean
}

const ProcessingStep: React.FC<ProcessingStepProps> = ({ label, isActive, isCompleted }) => {
	return (
		<div
			className={`flex items-center space-x-3 text-sm ${
				isCompleted ? "text-green-700" : isActive ? "text-blue-700" : "text-gray-500"
			}`}
		>
			<div
				className={`w-4 h-4 rounded-full flex items-center justify-center ${
					isCompleted ? "bg-green-600" : isActive ? "bg-blue-600" : "bg-gray-300"
				}`}
			>
				{isCompleted ? (
					<svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
						<path
							fillRule="evenodd"
							d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
							clipRule="evenodd"
						/>
					</svg>
				) : isActive ? (
					<div className="w-2 h-2 bg-white rounded-full animate-pulse" />
				) : (
					<div className="w-2 h-2 bg-gray-500 rounded-full" />
				)}
			</div>
			<span className={isActive ? "font-medium" : ""}>{label}</span>
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

const getEstimatedTimeRemaining = (progress: number): string => {
	// 簡単な推定計算（実際の処理時間に基づいて調整が必要）
	const estimatedTotalTime = 15 // 秒
	const elapsed = (progress / 100) * estimatedTotalTime
	const remaining = Math.max(0, estimatedTotalTime - elapsed)

	if (remaining < 1) {
		return "完了間近"
	}
	if (remaining < 60) {
		return `約${Math.round(remaining)}秒`
	}
	return `約${Math.round(remaining / 60)}分`
}
