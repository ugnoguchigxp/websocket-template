/**
 * Browser Frame Component
 * Iframe-based browser emulation with security sandboxing
 */

import type React from "react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import {
	FiAlertTriangle,
	FiCamera,
	FiClock,
	FiExternalLink,
	FiMonitor,
	FiPlay,
	FiRefreshCw,
	FiShield,
	FiSmartphone,
	FiTablet,
} from "react-icons/fi"

import { createContextLogger } from "@/modules/logger"

import type { BrowserFrameData } from "../../types/mcpChat"

const log = createContextLogger("BrowserFrame")

interface BrowserFrameProps {
	/** Browser frame data */
	frameData: BrowserFrameData | undefined
	/** Callback when URL changes */
	onUrlChange?: (url: string) => void
	/** Callback when screenshot is taken */
	onScreenshot?: (imageData: string) => void
	/** Callback when frame encounters an error */
	onError?: (error: Error) => void
	/** Whether to show advanced controls */
	showAdvancedControls?: boolean
	/** Maximum loading timeout in milliseconds */
	loadTimeout?: number
	/** Additional CSS classes */
	className?: string
	/** Callback for Playwright-like script execution */
	onPlaywrightScript?: (script: string, frameId: string) => void
	/** Unique ID for this frame instance */
	frameId?: string
}

/**
 * Security levels and their corresponding sandbox options
 */
const SANDBOX_LEVELS = {
	strict: ["allow-scripts"],
	medium: ["allow-scripts", "allow-forms", "allow-popups"],
	relaxed: [
		"allow-same-origin",
		"allow-scripts",
		"allow-forms",
		"allow-popups",
		"allow-presentation",
		"allow-downloads",
	],
} as const

/**
 * Content Security Policy templates for different security levels
 */
const CSP_TEMPLATES = {
	strict:
		"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self';",
	medium:
		"default-src 'self' https:; script-src 'self' 'unsafe-inline' https:; style-src 'self' 'unsafe-inline' https:; img-src * data:; connect-src 'self' https:;",
	relaxed:
		"default-src * data: blob:; script-src * 'unsafe-inline' 'unsafe-eval'; style-src * 'unsafe-inline';",
} as const

/**
 * Default sandbox options for security
 */
// Default sandbox options for security (handled in securityInfo)

/**
 * Blocked domains for security
 */
const BLOCKED_DOMAINS = [
	"localhost",
	"127.0.0.1",
	"0.0.0.0",
	"::1",
	"local",
	".local",
	"internal",
	"test",
	"dev",
	"staging",
	"admin",
]

/**
 * Allowed protocols
 */
const ALLOWED_PROTOCOLS = ["http:", "https:"] as const

/**
 * Whitelisted domains that are considered safe
 */
const WHITELISTED_DOMAINS = [
	"github.com",
	"stackoverflow.com",
	"developer.mozilla.org",
	"w3.org",
	"example.com",
	"wikipedia.org",
	"google.com",
	"microsoft.com",
	"apple.com",
] as const

/**
 * BrowserFrame component
 * Provides secure iframe-based browser emulation
 */
export const BrowserFrame: React.FC<BrowserFrameProps> = ({
	frameData,
	onUrlChange,
	onScreenshot,
	onError,
	showAdvancedControls = false,
	loadTimeout = 10000,
	className = "",
	onPlaywrightScript,
	frameId: propFrameId,
}) => {
	const [isLoading, setIsLoading] = useState(true)
	const [hasError, setHasError] = useState(false)
	const [errorMessage, setErrorMessage] = useState<string | null>(null)
	const [errorType, setErrorType] = useState<"timeout" | "network" | "security" | "unknown" | null>(
		null
	)
	const [retryCount, setRetryCount] = useState(0)
	const [currentUrl, setCurrentUrl] = useState(frameData?.url || "")
	const [viewport, setViewport] = useState(frameData?.viewport || "desktop")
	const [loadStartTime, setLoadStartTime] = useState<number | null>(null)
	const [securityLevel, setSecurityLevel] = useState<keyof typeof SANDBOX_LEVELS>("medium")

	const iframeRef = useRef<HTMLIFrameElement>(null)
	const timeoutRef = useRef<NodeJS.Timeout | null>(null)
	const frameId = frameData?.url
		? `frame_${btoa(frameData.url).replace(/[^a-zA-Z0-9]/g, "")}`
		: propFrameId || "default_frame"

	if (!frameData) {
		return (
			<div className={`flex items-center justify-center h-64 bg-gray-100 rounded-lg ${className}`}>
				<div className="text-center">
					<FiAlertTriangle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
					<span className="text-gray-500">ブラウザフレームデータがありません</span>
				</div>
			</div>
		)
	}

	const { url, title, width, height, allowInteraction = true, sandbox } = frameData

	// Enhanced URL validation with security checks
	const validateUrl = useMemo(() => {
		return (
			urlString: string
		): {
			isValid: boolean
			error?: string
			isWhitelisted?: boolean
			trustLevel?: "high" | "medium"
		} => {
			if (!urlString || typeof urlString !== "string") {
				return { isValid: false, error: "URLが指定されていません" }
			}

			try {
				const urlObj = new URL(urlString)

				// Check protocol
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				if (!ALLOWED_PROTOCOLS.includes(urlObj.protocol as any)) {
					return { isValid: false, error: `許可されていないプロトコルです: ${urlObj.protocol}` }
				}

				// Check for blocked domains
				const hostname = urlObj.hostname.toLowerCase()
				if (BLOCKED_DOMAINS.some(blocked => hostname.includes(blocked))) {
					return { isValid: false, error: `ブロックされたドメインです: ${hostname}` }
				}

				// Check for private IP ranges and reserved addresses
				if (
					hostname.match(/^(10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.|169\.254\.|224\.|240\.)/)
				) {
					return { isValid: false, error: "プライベートIPアドレスは許可されていません" }
				}

				// Check for suspicious ports
				if (
					urlObj.port &&
					["22", "23", "25", "53", "135", "139", "445", "1433", "3389", "5432"].includes(
						urlObj.port
					)
				) {
					return { isValid: false, error: "危険なポートは許可されていません" }
				}

				// Check for data URLs and other potentially dangerous schemes
				if (
					urlString.toLowerCase().includes("data:") ||
					urlString.toLowerCase().includes("javascript:")
				) {
					return { isValid: false, error: "データURLまたはJavaScriptスキームは許可されていません" }
				}

				// Check for suspicious URL patterns
				const suspiciousPatterns = [
					/[<>'"]/, // HTML injection attempts
					/\.\./, // Directory traversal
					/script/i, // Script injection
					/\s/, // Whitespace in URL
					/%[0-9a-f][0-9a-f]/i, // URL encoding (could hide malicious content)
				]

				if (suspiciousPatterns.some(pattern => pattern.test(urlString))) {
					return { isValid: false, error: "疑わしいURL形式が検出されました" }
				}

				// Check URL length (prevent extremely long URLs)
				if (urlString.length > 2048) {
					return { isValid: false, error: "URLが長すぎます（最大2048文字）" }
				}

				// Check for IDN homograph attacks (basic check)
				if (hostname !== hostname.toLowerCase() || /[^\x00-\x7F]/.test(hostname)) {
					return { isValid: false, error: "国際化ドメイン名は安全性の観点から制限されています" }
				}

				// Check if domain is whitelisted
				const isWhitelisted = WHITELISTED_DOMAINS.some(
					domain => hostname === domain || hostname.endsWith(`.${domain}`)
				)

				return {
					isValid: true,
					isWhitelisted,
					trustLevel: isWhitelisted ? "high" : "medium",
				}
			} catch {
				return { isValid: false, error: "無効なURL形式です" }
			}
		}
	}, [])

	// Memoized security calculations
	const securityInfo = useMemo(() => {
		const urlValidation = validateUrl(url)
		const activeSandbox = sandbox || SANDBOX_LEVELS[securityLevel]
		const cspPolicy = CSP_TEMPLATES[securityLevel]

		return {
			urlValidation,
			sandboxOptions: activeSandbox.join(" "),
			cspPolicy,
			isSecure: urlValidation.isValid && activeSandbox.length > 0,
			riskLevel:
				securityLevel === "strict" ? "low" : securityLevel === "medium" ? "medium" : "high",
			securityScore: calculateSecurityScore(
				securityLevel,
				urlValidation.isValid,
				activeSandbox.length,
				urlValidation
			),
		}
	}, [url, sandbox, securityLevel, validateUrl])

	// Security score calculation function
	const calculateSecurityScore = useCallback(
		(
			level: keyof typeof SANDBOX_LEVELS,
			urlValid: boolean,
			sandboxCount: number,
			urlValidation: ReturnType<typeof validateUrl>
		): number => {
			let score = 0

			// Base URL validation score
			if (urlValid) score += 25

			// Whitelist bonus
			if (urlValidation.isWhitelisted) score += 15
			else if (urlValidation.trustLevel === "medium") score += 5

			// Security level score
			if (level === "strict") score += 35
			else if (level === "medium") score += 20
			else score += 5

			// Sandbox feature score
			score += Math.min(sandboxCount * 4, 25)

			return Math.min(score, 100)
		},
		[]
	)

	// Cleanup timeout on unmount
	useEffect(() => {
		return () => {
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current)
			}
		}
	}, [])

	// Set up loading timeout
	useEffect(() => {
		if (isLoading && loadStartTime) {
			timeoutRef.current = setTimeout(() => {
				setIsLoading(false)
				setHasError(true)
				setErrorType("timeout")
				setErrorMessage(`読み込みがタイムアウトしました（${loadTimeout / 1000}秒）`)
				onError?.(new Error("Loading timeout"))
			}, loadTimeout)

			return () => {
				if (timeoutRef.current) {
					clearTimeout(timeoutRef.current)
				}
			}
		}
		return undefined
	}, [isLoading, loadStartTime, loadTimeout, onError])

	const handleLoad = useCallback(() => {
		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current)
		}
		setIsLoading(false)
		setHasError(false)
		setErrorMessage(null)
		setErrorType(null)
		setRetryCount(0)
		setLoadStartTime(null)
	}, [])

	const handleError = useCallback(
		(event?: Event | string) => {
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current)
			}
			setIsLoading(false)
			setHasError(true)

			// Determine error type based on the event or context
			let errorType: "timeout" | "network" | "security" | "unknown" = "unknown"
			let message = "ページの読み込みに失敗しました"

			if (typeof event === "string") {
				if (event.includes("security") || event.includes("cors")) {
					errorType = "security"
					message = "セキュリティポリシーにより読み込みが制限されました"
				} else if (event.includes("network") || event.includes("dns")) {
					errorType = "network"
					message = "ネットワークエラーが発生しました"
				}
			} else if (event && "type" in event) {
				if (event.type === "error") {
					errorType = "network"
					message = "ネットワークまたはサーバーエラーが発生しました"
				}
			}

			setErrorType(errorType)
			setErrorMessage(message)
			setLoadStartTime(null)
			onError?.(new Error(message))
		},
		[onError]
	)

	const handleRefresh = useCallback((isRetry = false) => {
		if (isRetry) {
			setRetryCount(prev => prev + 1)
		} else {
			setRetryCount(0)
		}

		setIsLoading(true)
		setHasError(false)
		setErrorMessage(null)
		setErrorType(null)
		setLoadStartTime(Date.now())

		// Force iframe reload
		if (iframeRef.current) {
			// Add cache-busting parameter to avoid cached errors
			const originalSrc = iframeRef.current.getAttribute("data-url") || iframeRef.current.src
			const separator = originalSrc.includes("?") ? "&" : "?"
			const cacheBuster = `${separator}_cb=${Date.now()}`
			iframeRef.current.src = originalSrc + cacheBuster
		}
	}, [])

	// Auto-retry logic for certain error types
	useEffect(() => {
		if (hasError && retryCount < 3 && (errorType === "network" || errorType === "timeout")) {
			const retryTimeout = setTimeout(
				() => {
					handleRefresh(true)
				},
				Math.min(1000 * 2 ** retryCount, 10000)
			) // Exponential backoff, max 10s

			return () => clearTimeout(retryTimeout)
		}
		return undefined
	}, [hasError, errorType, retryCount, handleRefresh])

	const handleUrlSubmit = useCallback(
		(newUrl: string) => {
			const validation = validateUrl(newUrl)

			if (validation.isValid) {
				setCurrentUrl(newUrl)
				setIsLoading(true)
				setHasError(false)
				setErrorMessage(null)
				setErrorType(null)
				setRetryCount(0)
				setLoadStartTime(Date.now())
				onUrlChange?.(newUrl)
			} else {
				setErrorMessage(validation.error || "無効なURLです")
				setErrorType("security")
				setHasError(true)
			}
		},
		[validateUrl, onUrlChange]
	)

	// Memoized viewport dimensions
	const dimensions = useMemo(() => {
		const baseWidth = width || 1200
		const baseHeight = height || 800

		switch (viewport) {
			case "mobile":
				return {
					width: 375,
					height: 667,
					scale: Math.min(baseWidth / 375, baseHeight / 667),
				}
			case "tablet":
				return {
					width: 768,
					height: 1024,
					scale: Math.min(baseWidth / 768, baseHeight / 1024),
				}
			default:
				return {
					width: baseWidth,
					height: baseHeight,
					scale: 1,
				}
		}
	}, [viewport, width, height])

	const [screenshotStatus, setScreenshotStatus] = useState<
		"idle" | "capturing" | "success" | "failed"
	>("idle")
	const [playwrightScript, setPlaywrightScript] = useState<string>("")
	const [showPlaywrightPanel, setShowPlaywrightPanel] = useState<boolean>(false)
	const [playwrightExecution, setPlaywrightExecution] = useState<{
		isRunning: boolean
		currentStep: string
		logs: string[]
	}>({ isRunning: false, currentStep: "", logs: [] })

	const handleScreenshot = useCallback(async () => {
		try {
			if (!onScreenshot) return

			setScreenshotStatus("capturing")

			// Try multiple screenshot approaches
			if (iframeRef.current) {
				try {
					// Method 1: Try html2canvas if available (would need to be installed)
					// This is a placeholder for a more sophisticated implementation

					// Method 2: Use Canvas API (limited by CORS)
					const iframe = iframeRef.current
					const canvas = document.createElement("canvas")
					const ctx = canvas.getContext("2d")

					if (ctx) {
						canvas.width = iframe.offsetWidth
						canvas.height = iframe.offsetHeight

						// Create a placeholder screenshot when cross-origin
						ctx.fillStyle = "#f8f9fa"
						ctx.fillRect(0, 0, canvas.width, canvas.height)
						ctx.fillStyle = "#6c757d"
						ctx.font = "16px Arial"
						ctx.textAlign = "center"
						ctx.fillText(
							"Screenshot blocked by CORS policy",
							canvas.width / 2,
							canvas.height / 2 - 20
						)
						ctx.fillText(`URL: ${url}`, canvas.width / 2, canvas.height / 2 + 10)
						ctx.fillText(
							"Use browser screenshot tools instead",
							canvas.width / 2,
							canvas.height / 2 + 40
						)

						// Convert to data URL
						const dataUrl = canvas.toDataURL("image/png")
						onScreenshot(dataUrl)
						setScreenshotStatus("success")

						// Auto-reset status after 2 seconds
						setTimeout(() => setScreenshotStatus("idle"), 2000)
					}
				} catch (corsError) {
					log.warn("Canvas screenshot failed due to CORS:", corsError)

					// Fallback: Provide helpful information
					const fallbackData = {
						type: "screenshot-metadata",
						url: url,
						timestamp: new Date().toISOString(),
						dimensions: {
							width: dimensions.width,
							height: dimensions.height,
						},
						viewport: viewport,
						message:
							"Screenshot blocked by CORS policy. Use browser screenshot tools for cross-origin content.",
					}

					onScreenshot(JSON.stringify(fallbackData, null, 2))
					setScreenshotStatus("failed")

					// Auto-reset status after 3 seconds
					setTimeout(() => setScreenshotStatus("idle"), 3000)
				}
			}
		} catch (error) {
			log.error("Screenshot failed:", error)
			setScreenshotStatus("failed")
			setTimeout(() => setScreenshotStatus("idle"), 3000)
			onError?.(error as Error)
		}
	}, [onScreenshot, onError, url, dimensions, viewport])

	// Execute Playwright script
	const executePlaywrightScript = useCallback(async () => {
		if (!playwrightScript.trim()) return

		setPlaywrightExecution(prev => ({
			...prev,
			isRunning: true,
			logs: ["Starting script execution..."],
		}))

		try {
			// Send script to backend for execution
			if (onPlaywrightScript) {
				onPlaywrightScript(playwrightScript, frameId)
			}

			setPlaywrightExecution(prev => ({
				...prev,
				logs: [...prev.logs, "Script sent to backend for execution"],
			}))
		} catch (error) {
			setPlaywrightExecution(prev => ({
				...prev,
				isRunning: false,
				logs: [...prev.logs, `Error: ${error instanceof Error ? error.message : "Unknown error"}`],
			}))
		}
	}, [playwrightScript, onPlaywrightScript, frameId])

	// Security level color coding
	const getSecurityColor = useCallback((level: string) => {
		switch (level) {
			case "high":
				return "text-red-600 bg-red-50"
			case "medium":
				return "text-yellow-600 bg-yellow-50"
			case "low":
				return "text-green-600 bg-green-50"
			default:
				return "text-gray-600 bg-gray-50"
		}
	}, [])

	return (
		<div className={`bg-white rounded-lg shadow-lg ${className}`}>
			{/* Browser Header */}
			<div className="flex flex-col border-b border-gray-200 bg-gray-50">
				{/* Main Control Bar */}
				<div className="flex items-center justify-between p-4">
					<div className="flex items-center space-x-3 flex-1">
						{/* Security Indicator */}
						<div
							className={`px-2 py-1 rounded-full text-xs font-medium ${getSecurityColor(securityInfo.riskLevel)}`}
						>
							<FiShield className="w-3 h-3 inline mr-1" />
							{securityInfo.riskLevel === "high"
								? "高リスク"
								: securityInfo.riskLevel === "medium"
									? "中リスク"
									: "低リスク"}
						</div>

						{/* Trust Indicator */}
						{securityInfo.urlValidation.isWhitelisted && (
							<div className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
								✓ 信頼済みドメイン
							</div>
						)}

						{/* URL Input */}
						<div className="flex-1 flex items-center space-x-2">
							<input
								type="url"
								value={currentUrl}
								onChange={e => setCurrentUrl(e.target.value)}
								onKeyPress={e => {
									if (e.key === "Enter") {
										handleUrlSubmit(currentUrl)
									}
								}}
								placeholder="URLを入力してください"
								className={`flex-1 px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 ${
									securityInfo.urlValidation.isValid
										? "border-gray-300 focus:ring-blue-500"
										: "border-red-300 focus:ring-red-500 bg-red-50"
								}`}
								disabled={!allowInteraction}
							/>
							<button
								onClick={() => handleUrlSubmit(currentUrl)}
								disabled={!allowInteraction || !securityInfo.urlValidation.isValid}
								className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
							>
								移動
							</button>
						</div>
					</div>

					{/* Controls */}
					<div className="flex items-center space-x-2">
						{/* Viewport Selector */}
						<div className="flex items-center space-x-1 border border-gray-300 rounded-md">
							<button
								onClick={() => setViewport("desktop")}
								className={`p-2 transition-colors ${viewport === "desktop" ? "bg-blue-100 text-blue-600" : "text-gray-600 hover:bg-gray-100"}`}
								title="デスクトップ表示"
							>
								<FiMonitor className="w-4 h-4" />
							</button>
							<button
								onClick={() => setViewport("tablet")}
								className={`p-2 transition-colors ${viewport === "tablet" ? "bg-blue-100 text-blue-600" : "text-gray-600 hover:bg-gray-100"}`}
								title="タブレット表示"
							>
								<FiTablet className="w-4 h-4" />
							</button>
							<button
								onClick={() => setViewport("mobile")}
								className={`p-2 transition-colors ${viewport === "mobile" ? "bg-blue-100 text-blue-600" : "text-gray-600 hover:bg-gray-100"}`}
								title="モバイル表示"
							>
								<FiSmartphone className="w-4 h-4" />
							</button>
						</div>

						{/* Action Buttons */}
						<button
							onClick={() => handleRefresh(false)}
							className="p-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
							title="リロード"
							disabled={isLoading}
						>
							<FiRefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
						</button>

						{onScreenshot && (
							<button
								onClick={handleScreenshot}
								className={`p-2 rounded-md transition-colors ${
									screenshotStatus === "capturing"
										? "text-blue-600 bg-blue-50"
										: screenshotStatus === "success"
											? "text-green-600 bg-green-50"
											: screenshotStatus === "failed"
												? "text-red-600 bg-red-50"
												: "text-gray-600 hover:bg-gray-100"
								}`}
								title={
									screenshotStatus === "capturing"
										? "スクリーンショット撮影中..."
										: screenshotStatus === "success"
											? "スクリーンショット完了"
											: screenshotStatus === "failed"
												? "スクリーンショット失敗（CORS制限）"
												: "スクリーンショット（CORS制限あり）"
								}
								disabled={isLoading || hasError || screenshotStatus === "capturing"}
							>
								<FiCamera
									className={`w-4 h-4 ${screenshotStatus === "capturing" ? "animate-pulse" : ""}`}
								/>
							</button>
						)}

						{/* Playwright Control Button */}
						<button
							onClick={() => setShowPlaywrightPanel(!showPlaywrightPanel)}
							className={`p-2 rounded-md transition-colors ${
								showPlaywrightPanel
									? "text-purple-600 bg-purple-50"
									: "text-gray-600 hover:bg-gray-100"
							}`}
							title="Playwright制御パネル"
							disabled={isLoading || hasError}
						>
							<FiPlay className="w-4 h-4" />
						</button>

						{securityInfo.urlValidation.isValid && (
							<a
								href={url}
								target="_blank"
								rel="noopener noreferrer"
								className="p-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
								title="新しいタブで開く"
							>
								<FiExternalLink className="w-4 h-4" />
							</a>
						)}

						{/* Loading Timer */}
						{isLoading && loadStartTime && (
							<div className="flex items-center space-x-1 text-xs text-gray-500">
								<FiClock className="w-3 h-3" />
								<span>{Math.floor((Date.now() - loadStartTime) / 1000)}s</span>
							</div>
						)}
					</div>
				</div>

				{/* Advanced Controls */}
				{showAdvancedControls && (
					<div className="px-4 pb-4 border-t border-gray-200 bg-gray-100">
						<div className="flex items-center justify-between pt-3">
							<div className="flex items-center space-x-4">
								{/* Security Level Selector */}
								<div className="flex items-center space-x-2">
									<label className="text-xs font-medium text-gray-700">セキュリティレベル:</label>
									<select
										value={securityLevel}
										onChange={e => setSecurityLevel(e.target.value as keyof typeof SANDBOX_LEVELS)}
										className="text-xs border border-gray-300 rounded px-2 py-1"
									>
										<option value="strict">厳格</option>
										<option value="medium">標準</option>
										<option value="relaxed">緩和</option>
									</select>
								</div>

								{/* Security Score */}
								<div className="text-xs text-gray-600">
									<span className="font-medium">セキュリティスコア:</span>
									<span
										className={`ml-1 px-2 py-1 rounded ${
											securityInfo.securityScore >= 80
												? "bg-green-100 text-green-800"
												: securityInfo.securityScore >= 60
													? "bg-yellow-100 text-yellow-800"
													: "bg-red-100 text-red-800"
										}`}
									>
										{securityInfo.securityScore}/100
									</span>
								</div>

								{/* Sandbox Info */}
								<div className="text-xs text-gray-600">
									<span className="font-medium">サンドボックス:</span> {securityInfo.sandboxOptions}
								</div>
							</div>

							{/* Error Display */}
							{!securityInfo.urlValidation.isValid && (
								<div className="text-xs text-red-600 flex items-center space-x-1">
									<FiAlertTriangle className="w-3 h-3" />
									<span>{securityInfo.urlValidation.error}</span>
								</div>
							)}
						</div>

						{/* CSP Information */}
						<div className="mt-3 pt-3 border-t border-gray-300">
							<div className="text-xs text-gray-700">
								<span className="font-medium">Content Security Policy:</span>
								<div className="mt-1 p-2 bg-gray-200 rounded text-xs font-mono break-all">
									{securityInfo.cspPolicy}
								</div>
							</div>
						</div>

						{/* Error Tracking Information */}
						{(hasError || retryCount > 0) && (
							<div className="mt-3 pt-3 border-t border-gray-300">
								<div className="text-xs text-gray-700">
									<span className="font-medium">エラー情報:</span>
									<div className="mt-1 text-xs text-gray-600 space-y-1">
										{hasError && <p>• エラータイプ: {errorType || "不明"}</p>}
										<p>• 再試行回数: {retryCount}/3</p>
										{loadStartTime && (
											<p>• 最後の試行: {new Date(loadStartTime).toLocaleTimeString()}</p>
										)}
									</div>
								</div>
							</div>
						)}

						{/* Screenshot Information */}
						{onScreenshot && (
							<div className="mt-3 pt-3 border-t border-gray-300">
								<div className="text-xs text-gray-700">
									<span className="font-medium">スクリーンショット制限:</span>
									<div className="mt-1 text-xs text-gray-600">
										<p>• クロスオリジンコンテンツは CORS ポリシーにより制限されます</p>
										<p>• 同一オリジンコンテンツのみ直接キャプチャが可能です</p>
										<p>• 代替手段: ブラウザの標準スクリーンショット機能をご利用ください</p>
									</div>
								</div>
							</div>
						)}
					</div>
				)}

				{/* Playwright Control Panel */}
				{showPlaywrightPanel && (
					<div className="px-4 pb-4 border-t border-gray-200 bg-purple-50">
						<div className="pt-3">
							<h4 className="text-sm font-medium text-gray-800 mb-3">Playwright制御スクリプト</h4>

							<div className="space-y-3">
								{/* Script Input */}
								<textarea
									value={playwrightScript}
									onChange={e => setPlaywrightScript(e.target.value)}
									placeholder={`// Playwright風の制御スクリプトを入力
// 例:
// await page.click('#button');
// await page.type('#input', 'Hello World');
// await page.waitForSelector('.result');`}
									className="w-full h-32 p-3 text-sm border border-gray-300 rounded-md font-mono resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
									disabled={playwrightExecution.isRunning}
								/>

								{/* Control Buttons */}
								<div className="flex items-center justify-between">
									<div className="flex space-x-2">
										<button
											onClick={executePlaywrightScript}
											disabled={playwrightExecution.isRunning || !playwrightScript.trim()}
											className="px-3 py-1 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
										>
											{playwrightExecution.isRunning ? "実行中..." : "スクリプト実行"}
										</button>

										<button
											onClick={() => setPlaywrightScript("")}
											disabled={playwrightExecution.isRunning}
											className="px-3 py-1 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
										>
											クリア
										</button>
									</div>

									<div className="text-xs text-gray-600">Frame ID: {frameId}</div>
								</div>

								{/* Execution Logs */}
								{playwrightExecution.logs.length > 0 && (
									<div className="mt-3">
										<h5 className="text-xs font-medium text-gray-700 mb-2">実行ログ:</h5>
										<div className="bg-gray-900 text-green-400 p-2 rounded text-xs font-mono max-h-32 overflow-y-auto">
											{playwrightExecution.logs.map((log, index) => (
												<div key={index} className="mb-1">
													{log}
												</div>
											))}
										</div>
									</div>
								)}

								{/* Current Step */}
								{playwrightExecution.isRunning && playwrightExecution.currentStep && (
									<div className="text-xs text-purple-600">
										現在のステップ: {playwrightExecution.currentStep}
									</div>
								)}
							</div>
						</div>
					</div>
				)}
			</div>

			{/* Browser Content */}
			<div className="relative">
				{/* Loading Indicator */}
				{isLoading && (
					<div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
						<div className="text-center">
							<FiRefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-2" />
							<p className="text-sm text-gray-600">読み込み中...</p>
						</div>
					</div>
				)}

				{/* Error State */}
				{hasError && (
					<div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
						<div className="text-center max-w-md p-6">
							<FiAlertTriangle
								className={`w-8 h-8 mx-auto mb-3 ${
									errorType === "security"
										? "text-orange-500"
										: errorType === "network"
											? "text-red-500"
											: errorType === "timeout"
												? "text-yellow-500"
												: "text-gray-500"
								}`}
							/>

							<h3 className="font-medium text-gray-900 mb-2">
								{errorType === "security"
									? "セキュリティエラー"
									: errorType === "network"
										? "ネットワークエラー"
										: errorType === "timeout"
											? "タイムアウトエラー"
											: "読み込みエラー"}
							</h3>

							<p className="text-sm text-gray-600 mb-4">
								{errorMessage || "ページの読み込みに失敗しました"}
							</p>

							{/* Retry Information */}
							{retryCount > 0 &&
								retryCount < 3 &&
								(errorType === "network" || errorType === "timeout") && (
									<p className="text-xs text-blue-600 mb-3">自動再試行中... ({retryCount}/3)</p>
								)}

							{retryCount >= 3 && (
								<p className="text-xs text-red-600 mb-3">自動再試行が制限に達しました</p>
							)}

							<div className="flex gap-3 justify-center">
								<button
									onClick={() => handleRefresh(false)}
									className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
									disabled={isLoading}
								>
									手動で再試行
								</button>

								{errorType === "security" && (
									<button
										onClick={() => {
											setHasError(false)
											setErrorMessage(null)
											setErrorType(null)
										}}
										className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm"
									>
										閉じる
									</button>
								)}
							</div>

							{/* Error Suggestions */}
							<div className="mt-4 text-xs text-gray-500">
								{errorType === "security" && (
									<p>
										• URLが正しいか確認してください
										<br />• セキュリティレベルを調整してみてください
									</p>
								)}
								{errorType === "network" && (
									<p>
										• インターネット接続を確認してください
										<br />• サイトが正常に動作しているか確認してください
									</p>
								)}
								{errorType === "timeout" && (
									<p>
										• ページの読み込みに時間がかかっています
										<br />• しばらく待ってから再試行してください
									</p>
								)}
							</div>
						</div>
					</div>
				)}

				{/* Iframe Container */}
				<div
					className="overflow-auto bg-white"
					style={{
						width: "100%",
						height: dimensions.height,
						maxHeight: "80vh",
					}}
				>
					{securityInfo.urlValidation.isValid ? (
						<iframe
							data-url={url}
							src={url}
							title={title || "Browser Frame"}
							width={dimensions.width}
							height={dimensions.height}
							sandbox={securityInfo.sandboxOptions}
							onLoad={handleLoad}
							onError={() => handleError()}
							className="border-0 w-full h-full"
							style={{
								minWidth: dimensions.width,
								minHeight: dimensions.height,
							}}
						/>
					) : (
						<div className="flex items-center justify-center h-64 text-gray-500">
							<div className="text-center">
								<FiAlertTriangle className="w-8 h-8 mx-auto mb-2" />
								<p>無効なURLです: {url}</p>
							</div>
						</div>
					)}
				</div>
			</div>

			{/* Footer Info */}
			<div className="px-4 py-2 border-t border-gray-200 bg-gray-50 text-xs text-gray-500">
				<div className="flex justify-between items-center">
					<span>
						表示サイズ: {dimensions.width} × {dimensions.height}
					</span>
					<span>セキュリティ: サンドボックス有効</span>
				</div>
			</div>
		</div>
	)
}
