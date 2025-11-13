/**
 * Multi-Agent Activity Display Component
 * Shows conductor and executor interactions and activities
 */

import type React from "react"
import { useState } from "react"

import { FiActivity, FiChevronDown, FiChevronUp, FiClock, FiCpu, FiUser } from "react-icons/fi"

import type { MCPChatMessage } from "../types/mcpChat"

interface AgentActivityProps {
	message: MCPChatMessage
	className?: string
}

export const AgentActivity: React.FC<AgentActivityProps> = ({ message, className = "" }) => {
	const [isExpanded, setIsExpanded] = useState(false)

	// If no multi-agent data, don't render anything
	if (!message.isMultiAgentUsed || !message.agentInteractions?.length) {
		return null
	}

	const {
		agentInteractions,
		totalExchanges,
		conductorDecisions,
		executorProposals,
		performanceMetrics,
	} = message

	const getInteractionIcon = (type: string) => {
		switch (type) {
			case "proposal":
				return <FiCpu className="w-3 h-3 text-blue-500" />
			case "evaluation":
				return <FiUser className="w-3 h-3 text-purple-500" />
			case "feedback":
				return <FiActivity className="w-3 h-3 text-orange-500" />
			case "approved":
				return <FiUser className="w-3 h-3 text-green-500" />
			case "rejected":
				return <FiUser className="w-3 h-3 text-red-500" />
			default:
				return <FiActivity className="w-3 h-3 text-gray-500" />
		}
	}

	const getInteractionTypeLabel = (type: string) => {
		switch (type) {
			case "proposal":
				return "提案"
			case "evaluation":
				return "評価"
			case "feedback":
				return "フィードバック"
			case "approved":
				return "承認"
			case "rejected":
				return "却下"
			default:
				return type
		}
	}

	return (
		<div className={`bg-gray-50 border border-gray-200 rounded-lg p-3 mt-2 ${className}`}>
			{/* Header with toggle */}
			<div
				className="flex items-center justify-between cursor-pointer hover:bg-gray-100 rounded p-1 -m-1"
				onClick={() => setIsExpanded(!isExpanded)}
			>
				<div className="flex items-center space-x-2">
					<FiActivity className="w-4 h-4 text-blue-600" />
					<span className="text-sm font-medium text-gray-700">マルチエージェント活動</span>
					{totalExchanges && (
						<span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
							{totalExchanges}回の交換
						</span>
					)}
				</div>
				{isExpanded ? (
					<FiChevronUp className="w-4 h-4 text-gray-500" />
				) : (
					<FiChevronDown className="w-4 h-4 text-gray-500" />
				)}
			</div>

			{/* Expanded content */}
			{isExpanded && (
				<div className="mt-3 space-y-3">
					{/* Performance metrics */}
					{performanceMetrics && (
						<div className="bg-white rounded border p-2">
							<h4 className="text-xs font-medium text-gray-600 mb-2 flex items-center">
								<FiClock className="w-3 h-3 mr-1" />
								パフォーマンス情報
							</h4>
							<div className="grid grid-cols-2 gap-2 text-xs">
								<div>
									<span className="text-gray-500">処理時間:</span>
									<span className="ml-1 font-mono">
										{(performanceMetrics.totalDuration / 1000).toFixed(1)}秒
									</span>
								</div>
								<div>
									<span className="text-gray-500">平均交換時間:</span>
									<span className="ml-1 font-mono">
										{(performanceMetrics.averageExchangeDuration / 1000).toFixed(1)}秒
									</span>
								</div>
								<div>
									<span className="text-gray-500">指揮者トークン:</span>
									<span className="ml-1 font-mono">
										{performanceMetrics.tokensUsedByConductor.toLocaleString()}
									</span>
								</div>
								<div>
									<span className="text-gray-500">実行者トークン:</span>
									<span className="ml-1 font-mono">
										{performanceMetrics.tokensUsedByExecutor.toLocaleString()}
									</span>
								</div>
							</div>
						</div>
					)}

					{/* Interactions timeline */}
					<div className="bg-white rounded border p-2">
						<h4 className="text-xs font-medium text-gray-600 mb-2">交換履歴</h4>
						<div className="space-y-2 max-h-40 overflow-y-auto">
							{agentInteractions.map(interaction => (
								<div key={interaction.id} className="border-l-2 border-gray-200 pl-2">
									<div className="flex items-start space-x-2">
										{getInteractionIcon(interaction.interactionType)}
										<div className="flex-1 min-w-0">
											<div className="flex items-center space-x-2">
												<span className="text-xs font-medium text-gray-700">
													{getInteractionTypeLabel(interaction.interactionType)}
												</span>
												<span className="text-xs text-gray-400">
													{new Date(interaction.timestamp).toLocaleTimeString()}
												</span>
											</div>

											{/* Conductor message */}
											{interaction.conductorMessage && (
												<div className="mt-1">
													<div className="flex items-center space-x-1">
														<FiUser className="w-2 h-2 text-purple-500" />
														<span className="text-xs text-purple-600 font-medium">指揮者:</span>
													</div>
													<p className="text-xs text-gray-600 mt-0.5 pl-3 border-l border-purple-200">
														{interaction.conductorMessage}
													</p>
												</div>
											)}

											{/* Executor message */}
											{interaction.executorMessage && (
												<div className="mt-1">
													<div className="flex items-center space-x-1">
														<FiCpu className="w-2 h-2 text-blue-500" />
														<span className="text-xs text-blue-600 font-medium">実行者:</span>
													</div>
													<p className="text-xs text-gray-600 mt-0.5 pl-3 border-l border-blue-200">
														{interaction.executorMessage}
													</p>
												</div>
											)}
										</div>
									</div>
								</div>
							))}
						</div>
					</div>

					{/* Decision and proposal history */}
					<div className="grid grid-cols-1 md:grid-cols-2 gap-2">
						{/* Conductor decisions */}
						{conductorDecisions && conductorDecisions.length > 0 && (
							<div className="bg-white rounded border p-2">
								<h4 className="text-xs font-medium text-purple-600 mb-2 flex items-center">
									<FiUser className="w-3 h-3 mr-1" />
									指揮者の決定履歴
								</h4>
								<div className="space-y-1 max-h-24 overflow-y-auto">
									{conductorDecisions.map((decision, index) => (
										<p key={index} className="text-xs text-gray-600 p-1 bg-purple-50 rounded">
											{decision}
										</p>
									))}
								</div>
							</div>
						)}

						{/* Executor proposals */}
						{executorProposals && executorProposals.length > 0 && (
							<div className="bg-white rounded border p-2">
								<h4 className="text-xs font-medium text-blue-600 mb-2 flex items-center">
									<FiCpu className="w-3 h-3 mr-1" />
									実行者の提案履歴
								</h4>
								<div className="space-y-1 max-h-24 overflow-y-auto">
									{executorProposals.map((proposal, index) => (
										<p key={index} className="text-xs text-gray-600 p-1 bg-blue-50 rounded">
											{proposal}
										</p>
									))}
								</div>
							</div>
						)}
					</div>
				</div>
			)}
		</div>
	)
}
