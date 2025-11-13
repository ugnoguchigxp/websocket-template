/**
 * Playwright Results Component
 * Displays Playwright script execution results with step-by-step visualization
 */

import type React from "react"
import { useState } from "react"

import {
	FiAlertCircle,
	FiCheckCircle,
	FiChevronDown,
	FiChevronRight,
	FiClock,
	FiDownload,
	FiImage,
	FiLoader,
	FiMaximize2,
	FiPause,
	FiSquare,
} from "react-icons/fi"

import type { PlaywrightResult } from "../../../../types/multimodal"

interface PlaywrightResultsProps {
	/** Playwright execution result data */
	result: PlaywrightResult
	/** Callback for rerunning the script */
	onRerun?: () => void
	/** Additional CSS classes */
	className?: string
}

/**
 * PlaywrightResults component
 * Renders execution results with step visualization and screenshots
 */
export const PlaywrightResults: React.FC<PlaywrightResultsProps> = ({
	result,
	onRerun,
	className = "",
}) => {
	const [expandedStep, setExpandedStep] = useState<number | null>(null)
	const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null)

	const getStatusIcon = (status: PlaywrightResult["status"]) => {
		switch (status) {
			case "running":
				return <FiLoader className="w-5 h-5 text-blue-600 animate-spin" />
			case "completed":
				return <FiCheckCircle className="w-5 h-5 text-green-600" />
			case "failed":
				return <FiAlertCircle className="w-5 h-5 text-red-600" />
			default:
				return <FiPause className="w-5 h-5 text-gray-600" />
		}
	}

	const getStatusColor = (status: PlaywrightResult["status"]) => {
		switch (status) {
			case "running":
				return "text-blue-600 bg-blue-50 border-blue-200"
			case "completed":
				return "text-green-600 bg-green-50 border-green-200"
			case "failed":
				return "text-red-600 bg-red-50 border-red-200"
			default:
				return "text-gray-600 bg-gray-50 border-gray-200"
		}
	}

	const formatDuration = (duration: number) => {
		if (duration < 1000) {
			return `${duration}ms`
		}
		return `${(duration / 1000).toFixed(1)}s`
	}

	const totalDuration = result.steps.reduce((total, step) => total + step.duration, 0)

	return (
		<div className={`${className}`}>
			{/* Header */}
			<div className="mb-6">
				<div className="flex items-center justify-between mb-3">
					<div className="flex items-center space-x-3">
						{getStatusIcon(result.status)}
						<h3 className="text-lg font-semibold text-gray-800">Playwright実行結果</h3>
					</div>
					{onRerun && result.status !== "running" && (
						<button
							onClick={onRerun}
							className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
						>
							再実行
						</button>
					)}
				</div>

				{/* Status Badge */}
				<div
					className={`inline-flex items-center px-3 py-1 rounded-full border text-sm font-medium ${getStatusColor(result.status)}`}
				>
					<span className="capitalize">{result.status}</span>
					{result.status === "completed" && (
						<span className="ml-2">• {formatDuration(totalDuration)}</span>
					)}
				</div>
			</div>

			{/* Error Display */}
			{result.error && (
				<div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
					<div className="flex items-center space-x-2 mb-2">
						<FiAlertCircle className="w-4 h-4 text-red-600" />
						<span className="font-medium text-red-800">実行エラー</span>
					</div>
					<pre className="text-sm text-red-700 whitespace-pre-wrap">{result.error}</pre>
				</div>
			)}

			{/* Steps */}
			<div className="space-y-3">
				<h4 className="font-medium text-gray-800 mb-3">実行ステップ ({result.steps.length})</h4>

				{result.steps.map((step, index) => (
					<div key={step.step} className="border border-gray-200 rounded-lg overflow-hidden">
						{/* Step Header */}
						<div
							className="p-4 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
							onClick={() => setExpandedStep(expandedStep === index ? null : index)}
						>
							<div className="flex items-center justify-between">
								<div className="flex items-center space-x-3">
									<div className="flex items-center space-x-2">
										{expandedStep === index ? (
											<FiChevronDown className="w-4 h-4 text-gray-600" />
										) : (
											<FiChevronRight className="w-4 h-4 text-gray-600" />
										)}
										<span className="text-sm font-medium text-gray-800">Step {step.step}</span>
									</div>
									<span className="text-sm text-gray-600">{step.action}</span>
								</div>

								<div className="flex items-center space-x-3 text-xs text-gray-500">
									{step.screenshot && <FiImage className="w-4 h-4" />}
									<div className="flex items-center space-x-1">
										<FiClock className="w-3 h-3" />
										<span>{formatDuration(step.duration)}</span>
									</div>
									<span>{new Date(step.timestamp).toLocaleTimeString("ja-JP")}</span>
								</div>
							</div>
						</div>

						{/* Step Details */}
						{expandedStep === index && (
							<div className="p-4 border-t border-gray-200 bg-white">
								<div className="space-y-4">
									{/* Action Details */}
									<div>
										<h5 className="text-sm font-medium text-gray-800 mb-2">アクション詳細</h5>
										<p className="text-sm text-gray-600">{step.action}</p>
									</div>

									{/* Screenshot */}
									{step.screenshot && (
										<div>
											<h5 className="text-sm font-medium text-gray-800 mb-2">スクリーンショット</h5>
											<div
												className="relative border border-gray-200 rounded-lg overflow-hidden cursor-pointer hover:border-gray-300 transition-colors"
												onClick={() => setSelectedScreenshot(step.screenshot!)}
											>
												<img
													src={`data:image/png;base64,${step.screenshot}`}
													alt={`Step ${step.step} screenshot`}
													className="w-full h-48 object-cover object-top"
												/>
												<div className="absolute top-2 right-2 p-1 bg-black bg-opacity-50 rounded text-white">
													<FiMaximize2 className="w-4 h-4" />
												</div>
											</div>
										</div>
									)}
								</div>
							</div>
						)}
					</div>
				))}
			</div>

			{/* Final Screenshot */}
			{result.finalScreenshot && (
				<div className="mt-6">
					<h4 className="font-medium text-gray-800 mb-3">最終結果</h4>
					<div
						className="relative border border-gray-200 rounded-lg overflow-hidden cursor-pointer hover:border-gray-300 transition-colors"
						onClick={() => setSelectedScreenshot(result.finalScreenshot!)}
					>
						<img
							src={`data:image/png;base64,${result.finalScreenshot}`}
							alt="Final result screenshot"
							className="w-full h-64 object-cover object-top"
						/>
						<div className="absolute top-2 right-2 p-1 bg-black bg-opacity-50 rounded text-white">
							<FiMaximize2 className="w-4 h-4" />
						</div>
					</div>
				</div>
			)}

			{/* Execution Logs */}
			{result.logs.length > 0 && (
				<div className="mt-6">
					<h4 className="font-medium text-gray-800 mb-3">実行ログ</h4>
					<div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm max-h-64 overflow-y-auto">
						{result.logs.map((log, index) => (
							<div key={index} className="mb-1">
								{log}
							</div>
						))}
					</div>
				</div>
			)}

			{/* Screenshot Modal */}
			{selectedScreenshot && (
				<div
					className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
					onClick={() => setSelectedScreenshot(null)}
				>
					<div className="max-w-4xl max-h-full overflow-auto">
						<div className="relative">
							<img
								src={`data:image/png;base64,${selectedScreenshot}`}
								alt="Screenshot"
								className="w-full h-auto"
							/>
							<button
								onClick={() => setSelectedScreenshot(null)}
								className="absolute top-4 right-4 p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-75 transition-colors"
							>
								<FiSquare className="w-6 h-6" />
							</button>
							<a
								href={`data:image/png;base64,${selectedScreenshot}`}
								download="playwright-screenshot.png"
								className="absolute top-4 left-4 p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-75 transition-colors"
							>
								<FiDownload className="w-6 h-6" />
							</a>
						</div>
					</div>
				</div>
			)}

			{/* Summary Stats */}
			<div className="mt-6 grid grid-cols-3 gap-4 text-center">
				<div className="p-3 bg-gray-50 rounded-lg">
					<div className="text-lg font-semibold text-gray-800">{result.steps.length}</div>
					<div className="text-sm text-gray-600">ステップ数</div>
				</div>
				<div className="p-3 bg-gray-50 rounded-lg">
					<div className="text-lg font-semibold text-gray-800">{formatDuration(totalDuration)}</div>
					<div className="text-sm text-gray-600">実行時間</div>
				</div>
				<div className="p-3 bg-gray-50 rounded-lg">
					<div className="text-lg font-semibold text-gray-800">
						{result.steps.filter(step => step.screenshot).length}
					</div>
					<div className="text-sm text-gray-600">スクリーンショット</div>
				</div>
			</div>
		</div>
	)
}
