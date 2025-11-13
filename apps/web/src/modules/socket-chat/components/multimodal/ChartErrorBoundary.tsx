/**
 * Chart Error Boundary Component
 * Catches and handles chart rendering errors gracefully
 */

import { Component, type ErrorInfo, type ReactNode } from "react"

import { FiAlertTriangle, FiRefreshCw } from "react-icons/fi"

import { createContextLogger } from "@/modules/logger"

const log = createContextLogger("ChartErrorBoundary")

interface ChartErrorBoundaryState {
	hasError: boolean
	error?: Error
	errorInfo?: ErrorInfo
}

interface ChartErrorBoundaryProps {
	children: ReactNode
	fallback?: ReactNode
	onError?: (error: Error, errorInfo: ErrorInfo) => void
}

/**
 * Error boundary specifically for chart components
 * Provides graceful fallback UI when chart rendering fails
 */
export class ChartErrorBoundary extends Component<
	ChartErrorBoundaryProps,
	ChartErrorBoundaryState
> {
	constructor(props: ChartErrorBoundaryProps) {
		super(props)
		this.state = { hasError: false }
	}

	static getDerivedStateFromError(error: Error): ChartErrorBoundaryState {
		return { hasError: true, error }
	}

	componentDidCatch(error: Error, errorInfo: ErrorInfo) {
		log.error("Chart rendering error", { error, errorInfo })

		this.setState({
			error,
			errorInfo,
		})

		// Call error callback if provided
		this.props.onError?.(error, errorInfo)

		// Send error to monitoring service (if available)
		if (process.env.NODE_ENV === "production") {
			// Example: Send to error tracking service
			// errorTrackingService.captureError(error, errorInfo);
		}
	}

	handleRetry = () => {
		this.setState({ hasError: false, error: undefined, errorInfo: undefined })
	}

	render() {
		if (this.state.hasError) {
			// Use custom fallback if provided
			if (this.props.fallback) {
				return this.props.fallback
			}

			// Default error UI
			return (
				<div className="chart-error-fallback bg-red-50 border border-red-200 rounded-lg p-6 text-center">
					<div className="flex flex-col items-center space-y-4">
						<FiAlertTriangle className="w-12 h-12 text-red-500" />

						<div>
							<h3 className="text-lg font-semibold text-red-800 mb-2">チャートの表示エラー</h3>
							<p className="text-red-600 mb-4">
								チャートの表示中にエラーが発生しました。データの形式や内容に問題がある可能性があります。
							</p>
						</div>

						{process.env.NODE_ENV === "development" && this.state.error && (
							<details className="w-full text-left bg-red-100 p-3 rounded border">
								<summary className="cursor-pointer font-medium text-red-800">
									エラー詳細 (開発環境)
								</summary>
								<div className="mt-2 text-sm text-red-700">
									<div className="font-mono bg-red-200 p-2 rounded overflow-auto">
										<div>
											<strong>Error:</strong> {this.state.error.message}
										</div>
										{this.state.error.stack && (
											<div className="mt-2">
												<strong>Stack:</strong>
												<pre className="whitespace-pre-wrap text-xs mt-1">
													{this.state.error.stack}
												</pre>
											</div>
										)}
									</div>
								</div>
							</details>
						)}

						<div className="flex space-x-3">
							<button
								onClick={this.handleRetry}
								className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
							>
								<FiRefreshCw className="w-4 h-4" />
								<span>再試行</span>
							</button>

							<button
								onClick={() => window.location.reload()}
								className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
							>
								ページを更新
							</button>
						</div>

						<div className="text-sm text-red-600">
							問題が継続する場合は、データの形式を確認するか、管理者にお問い合わせください。
						</div>
					</div>
				</div>
			)
		}

		return this.props.children
	}
}
