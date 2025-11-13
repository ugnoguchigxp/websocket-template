/**
 * Flow Error Boundary Component
 * Catches and handles flow rendering errors gracefully
 */

import { Component, type ErrorInfo, type ReactNode } from "react"

import { FiAlertTriangle, FiInfo, FiRefreshCw } from "react-icons/fi"

import { createContextLogger } from "@/modules/logger"

const log = createContextLogger("FlowErrorBoundary")

interface FlowErrorBoundaryState {
	hasError: boolean
	error?: Error
	errorInfo?: ErrorInfo
	errorType?: "render" | "data" | "network" | "unknown"
}

interface FlowErrorBoundaryProps {
	children: ReactNode
	fallback?: ReactNode
	onError?: (error: Error, errorInfo: ErrorInfo) => void
	onRetry?: () => void
}

/**
 * Error boundary specifically for flow components
 * Provides graceful fallback UI when flow rendering fails
 */
export class FlowErrorBoundary extends Component<FlowErrorBoundaryProps, FlowErrorBoundaryState> {
	constructor(props: FlowErrorBoundaryProps) {
		super(props)
		this.state = { hasError: false }
	}

	static getDerivedStateFromError(error: Error): FlowErrorBoundaryState {
		// Analyze error type
		let errorType: "render" | "data" | "network" | "unknown" = "unknown"

		if (
			error.message.includes("React Flow") ||
			error.message.includes("node") ||
			error.message.includes("edge")
		) {
			errorType = "render"
		} else if (error.message.includes("data") || error.message.includes("format")) {
			errorType = "data"
		} else if (error.message.includes("network") || error.message.includes("fetch")) {
			errorType = "network"
		}

		return { hasError: true, error, errorType }
	}

	componentDidCatch(error: Error, errorInfo: ErrorInfo) {
		log.error("Flow rendering error", { error, errorInfo })

		this.setState({
			error,
			errorInfo,
		})

		// Call error callback if provided
		this.props.onError?.(error, errorInfo)

		// Send error to monitoring service (if available)
		if (process.env.NODE_ENV === "production") {
			// Example: Send to error tracking service
			// errorTrackingService.captureError(error, {
			//   context: 'flow-rendering',
			//   component: 'FlowRenderer',
			//   errorInfo
			// });
		}
	}

	handleRetry = () => {
		this.setState({
			hasError: false,
			error: undefined,
			errorInfo: undefined,
			errorType: undefined,
		})
		this.props.onRetry?.()
	}

	private getErrorMessage(errorType: string): string {
		switch (errorType) {
			case "render":
				return "フローの描画中にエラーが発生しました。ノードやエッジの設定に問題がある可能性があります。"
			case "data":
				return "フローデータの形式に問題があります。データ構造を確認してください。"
			case "network":
				return "ネットワークエラーが発生しました。接続を確認して再試行してください。"
			default:
				return "フローの表示中に予期しないエラーが発生しました。"
		}
	}

	private getErrorSuggestions(errorType: string): string[] {
		switch (errorType) {
			case "render":
				return [
					"ノードのIDが重複していないか確認してください",
					"エッジのsourceとtargetが有効なノードIDか確認してください",
					"ノードの位置が数値として正しく設定されているか確認してください",
				]
			case "data":
				return [
					"FlowDataの構造が正しいか確認してください",
					"ノードとエッジの必須フィールドが設定されているか確認してください",
					"データ型が期待される形式と一致しているか確認してください",
				]
			case "network":
				return [
					"インターネット接続を確認してください",
					"フローデータの読み込み元が利用可能か確認してください",
					"しばらく待ってから再試行してください",
				]
			default:
				return [
					"ページを更新して再試行してください",
					"ブラウザのコンソールでエラー詳細を確認してください",
					"問題が継続する場合は管理者にお問い合わせください",
				]
		}
	}

	render() {
		if (this.state.hasError) {
			// Use custom fallback if provided
			if (this.props.fallback) {
				return this.props.fallback
			}

			const { error, errorType = "unknown" } = this.state

			// Default error UI
			return (
				<div className="flow-error-fallback bg-red-50 border border-red-200 rounded-lg p-6 text-center">
					<div className="flex flex-col items-center space-y-4">
						<FiAlertTriangle className="w-12 h-12 text-red-500" />

						<div>
							<h3 className="text-lg font-semibold text-red-800 mb-2">フローの表示エラー</h3>
							<p className="text-red-600 mb-4">{this.getErrorMessage(errorType)}</p>
						</div>

						{/* Error Suggestions */}
						<div className="w-full max-w-md text-left">
							<div className="bg-red-100 border border-red-200 rounded p-3">
								<div className="flex items-center mb-2">
									<FiInfo className="w-4 h-4 text-red-600 mr-2" />
									<span className="text-sm font-medium text-red-800">解決方法:</span>
								</div>
								<ul className="text-sm text-red-700 space-y-1">
									{this.getErrorSuggestions(errorType).map((suggestion, index) => (
										<li key={index} className="flex items-start">
											<span className="mr-2">•</span>
											<span>{suggestion}</span>
										</li>
									))}
								</ul>
							</div>
						</div>

						{/* Development Error Details */}
						{process.env.NODE_ENV === "development" && error && (
							<details className="w-full text-left bg-red-100 p-3 rounded border">
								<summary className="cursor-pointer font-medium text-red-800">
									エラー詳細 (開発環境)
								</summary>
								<div className="mt-2 text-sm text-red-700">
									<div className="font-mono bg-red-200 p-2 rounded overflow-auto">
										<div>
											<strong>Error:</strong> {error.message}
										</div>
										<div>
											<strong>Type:</strong> {errorType}
										</div>
										{error.stack && (
											<div className="mt-2">
												<strong>Stack:</strong>
												<pre className="whitespace-pre-wrap text-xs mt-1">{error.stack}</pre>
											</div>
										)}
										{this.state.errorInfo && (
											<div className="mt-2">
												<strong>Component Stack:</strong>
												<pre className="whitespace-pre-wrap text-xs mt-1">
													{this.state.errorInfo.componentStack}
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

						<div className="text-sm text-red-600 max-w-md">
							<p className="mb-2">
								<strong>エラータイプ:</strong> {errorType}
							</p>
							<p>
								問題が継続する場合は、フローデータの形式や設定を確認するか、管理者にお問い合わせください。
							</p>
						</div>
					</div>
				</div>
			)
		}

		return this.props.children
	}
}
