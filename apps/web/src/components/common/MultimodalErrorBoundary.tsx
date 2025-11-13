/**
 * Multimodal Error Boundary Component
 * Catches and handles errors in multimodal content rendering
 */

import React, { Component, type ErrorInfo, type ReactNode } from "react"

import { FiAlertTriangle, FiRefreshCw } from "react-icons/fi"

import { createContextLogger } from "@logger"

const log = createContextLogger("MultimodalErrorBoundary")

interface Props {
	children: ReactNode
	fallback?: ReactNode
	onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
	hasError: boolean
	error: Error | null
	errorInfo: ErrorInfo | null
}

/**
 * MultimodalErrorBoundary class component
 * Provides error boundary functionality for multimodal content
 */
export class MultimodalErrorBoundary extends Component<Props, State> {
	constructor(props: Props) {
		super(props)
		this.state = {
			hasError: false,
			error: null,
			errorInfo: null,
		}
	}

	static getDerivedStateFromError(error: Error): State {
		return {
			hasError: true,
			error,
			errorInfo: null,
		}
	}

	componentDidCatch(error: Error, errorInfo: ErrorInfo) {
		log.error("Multimodal content error", { error, errorInfo })

		this.setState({
			error,
			errorInfo,
		})

		// Call optional error handler
		if (this.props.onError) {
			this.props.onError(error, errorInfo)
		}
	}

	handleRetry = () => {
		this.setState({
			hasError: false,
			error: null,
			errorInfo: null,
		})
	}

	render() {
		if (this.state.hasError) {
			// Custom fallback UI
			if (this.props.fallback) {
				return this.props.fallback
			}

			// Default error UI
			return (
				<div className="flex flex-col items-center justify-center h-64 p-6 bg-red-50 border border-red-200 rounded-lg">
					<div className="text-center">
						<FiAlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
						<h3 className="text-lg font-semibold text-red-800 mb-2">
							マルチモーダルコンテンツの表示エラー
						</h3>
						<p className="text-red-600 mb-4">コンテンツの読み込み中にエラーが発生しました</p>

						{/* Error details in development */}
						{process.env.NODE_ENV === "development" && this.state.error && (
							<details className="mb-4 text-left">
								<summary className="cursor-pointer text-sm text-red-700 hover:text-red-800">
									エラー詳細を表示
								</summary>
								<div className="mt-2 p-3 bg-red-100 rounded text-xs font-mono text-red-800 whitespace-pre-wrap">
									{this.state.error.toString()}
									{this.state.errorInfo?.componentStack}
								</div>
							</details>
						)}

						<button
							onClick={this.handleRetry}
							className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
						>
							<FiRefreshCw className="w-4 h-4 mr-2" />
							再試行
						</button>
					</div>
				</div>
			)
		}

		return this.props.children
	}
}

/**
 * Hook-based error boundary for functional components
 */
export const useMultimodalErrorHandler = () => {
	const handleError = React.useCallback((error: Error, errorInfo: ErrorInfo) => {
		log.error("Multimodal error", { error, errorInfo })

		// You can send error reports to your error tracking service here
		// Example: Sentry.captureException(error, { contexts: { errorInfo } });
	}, [])

	return { handleError }
}

/**
 * Higher-order component for wrapping components with error boundary
 */
export const withMultimodalErrorBoundary = <P extends object>(
	Component: React.ComponentType<P>,
	fallback?: ReactNode
) => {
	const WrappedComponent = (props: P) => (
		<MultimodalErrorBoundary fallback={fallback}>
			<Component {...props} />
		</MultimodalErrorBoundary>
	)

	WrappedComponent.displayName = `withMultimodalErrorBoundary(${Component.displayName || Component.name})`

	return WrappedComponent
}
