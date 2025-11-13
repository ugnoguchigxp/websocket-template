/**
 * Socket Chat Component
 * WebSocket-based chat interface for multi-agent system communication
 */

import React, { useState, useEffect, useRef, useMemo } from "react"

import { FiEye, FiEyeOff, FiPlay, FiPlus, FiSettings } from "react-icons/fi"

import { createContextLogger } from "@/modules/logger"

import { MultimodalErrorBoundary } from "../../../components/common/MultimodalErrorBoundary"
import Drawer from "../../../components/ui/Drawer"
import { useAuth } from "../../../contexts/AuthContext"
import { MultimodalProvider, useMultimodal } from "../../../contexts/MultimodalContext"
import { useIsMobile } from "../../../hooks/useIsMobile"
import { useTrpcChat } from "../hooks/useTrpcChat"
import type { MCPChatSettings } from "../types/mcpChat"

import { AgentInteractionMessage } from "./AgentInteractionMessage"
import { SocketChatInput } from "./SocketChatInput"
import { SocketChatLayout } from "./SocketChatLayout"
import { SocketChatMessage } from "./SocketChatMessage"
import { SocketChatSettings } from "./SocketChatSettings"

const log = createContextLogger("SocketChatComponent")

interface SocketChatComponentProps {
	/** 初期セッションID（オプション） */
	initialSessionId?: string
	/** チャットの高さ */
	height?: string
	/** 設定パネルの表示制御 */
	showSettings?: boolean
	/** 表示モード (fullpage | modal | drawer | embed) */
	displayMode?: "fullpage" | "modal" | "drawer" | "embed"
	/** レスポンシブモード（自動でモバイル最適化） */
	responsive?: boolean
	/** コンパクト表示（ドロワーやモーダル用） */
	compact?: boolean
	/** マルチモーダル機能の制御 */
	enableMultimodal?: boolean
	/** 小サイズモーダル用の超コンパクト表示 */
	extraCompact?: boolean
}

// Internal component that uses the multimodal context
const SocketChatInner: React.FC<SocketChatComponentProps> = ({
	height = "600px",
	showSettings = true,
	displayMode = "fullpage",
	responsive = true,
	compact = false,
	enableMultimodal = true,
	extraCompact = false,
}) => {
	const isMobile = useIsMobile()
	const {
		messages,
		sessionId,
		connectionState,
		sendMessage,
		clearSession,
		isLoading,
		error,
		setError,
	} = useTrpcChat()

	// Speech functionality removed

	// マルチモーダル機能の有効性を判定
	// モーダル・ドロワーモードでは自動的にOFF、フルページ・埋め込みでは設定に従う
	const isMultimodalEnabled =
		enableMultimodal && (displayMode === "fullpage" || displayMode === "embed")

	const [settings, setSettings] = useState<MCPChatSettings>({
		selectedTools: ["execute_sql", "web_search", "analyze_crud"],
		selectedResources: [],
		temperature: 0.7,
		maxTokens: 2000,
		enableMarkdown: true,
		// Multimodal feature settings - 初期値、後でuseEffectで更新
		enableCharts: true,
		enableBrowserFrame: true,
		enablePlaywright: true,
		enableMarkdownDocument: true,
		// Default configurations
		chartDefaults: {
			width: 800,
			height: 400,
			theme: "light",
		},
		browserDefaults: {
			width: 1200,
			height: 800,
			viewport: "desktop",
			allowInteraction: true,
		},
		playwrightDefaults: {
			headless: true,
			timeout: 30000,
			viewport: { width: 1280, height: 720 },
		},
	})

	const [isSettingsOpen, setIsSettingsOpen] = useState(false)
	const [showAgentInteractions, setShowAgentInteractions] = useState(true)
	const {
		isOpen: isMultimodalOpen,
		content: multimodalContent,
		closeMultimodal,
		openMultimodal,
		contentType,
	} = useMultimodal()

	// tRPC chat automatically connects - no manual initialization needed
	// WebSocket connection is already established via tRPC

	// Cleanup on unmount - simplified for tRPC
	useEffect(() => {
		return () => {
			if (sessionId || connectionState === "connected") {
				log.debug("SocketChatComponent unmounting", {
					sessionId: sessionId?.substring(0, 8),
					connectionState,
				})
			}
		}
	}, []) // Run only on mount/unmount

	// マルチモーダル設定の動的更新
	useEffect(() => {
		setSettings(prev => ({
			...prev,
			enableCharts: isMultimodalEnabled,
			enableBrowserFrame: isMultimodalEnabled,
			enablePlaywright: isMultimodalEnabled,
			enableMarkdownDocument: isMultimodalEnabled,
		}))
	}, [isMultimodalEnabled])

	// モーダル・ドロワーモードでは設定Drawerを強制的に閉じる
	useEffect(() => {
		if (displayMode === "modal" || displayMode === "drawer") {
			setIsSettingsOpen(false)
		}
	}, [displayMode])

	// レスポンシブスタイルの計算（メモ化）
	const responsiveClasses = useMemo(() => {
		const baseClasses = "flex flex-col h-full bg-white"

		// モーダル・ドロワー表示時はborderとshadowを削除
		if (displayMode === "modal" || displayMode === "drawer") {
			return baseClasses
		}

		const styledClasses = `${baseClasses} border border-gray-300 rounded-lg shadow-lg`

		if (!responsive) return styledClasses

		if (compact) {
			return `${styledClasses} ${isMobile ? "text-sm" : "text-base"}`
		}

		return `${styledClasses} ${isMobile ? "rounded-none border-0" : "rounded-lg border border-gray-300"}`
	}, [displayMode, responsive, compact, isMobile])

	const headerClasses = useMemo(() => {
		const baseClasses = "flex items-center justify-between border-b border-gray-200 bg-gray-50"

		if (extraCompact) {
			return `${baseClasses} p-1 px-2`
		}

		if (compact) {
			return `${baseClasses} p-2 ${isMobile ? "px-1" : "px-3"}`
		}

		return `${baseClasses} p-4 ${isMobile ? "px-2" : "px-4"}`
	}, [extraCompact, compact, isMobile])

	// 接続状態のモニタリング（デバッグ用）
	useEffect(() => {
		log.info("Connection state changed", {
			connectionState,
			sessionId: `${sessionId?.substring(0, 8)}...`,
			timestamp: new Date().toISOString(),
		})
	}, [connectionState, sessionId])

	// マルチモーダル状態のモニタリング（プロダクション環境では削除推奨）
	useEffect(() => {
		if (process.env.NODE_ENV === "development") {
			log.debug("[SocketChatComponent] Multimodal state:", {
				isMultimodalOpen,
				hasMultimodalContent: !!multimodalContent,
				contentType,
				timestamp: new Date().toISOString(),
			})
		}
	}, [isMultimodalOpen, multimodalContent, contentType])

	const messagesEndRef = useRef<HTMLDivElement>(null)

	// Auto-scroll to bottom when new messages arrive (only enabled for fullpage mode)
	useEffect(() => {
		// フルページモード以外では自動スクロールを無効化（モーダル、ドロワー、埋め込み時）
		if (displayMode !== "fullpage") return
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
	}, [messages, displayMode])

	// Speech monitoring removed

	const handleSendMessage = async (message: string) => {
		try {
			await sendMessage(message, false) // Speech disabled
			log.info("Message sent successfully", { message })
		} catch (error) {
			log.error("Failed to send message", { error, message })
		}
	}

	const handleNewSession = async () => {
		try {
			await clearSession()
			log.info("New session started")
		} catch (error) {
			log.error("Failed to start new session", { error })
		}
	}

	// Conversation mode handler removed

	// エージェント間交換メッセージの件数を計算（メモ化）
	const agentInteractionCount = useMemo(
		() => messages.filter(message => message.isInteractionMessage).length,
		[messages]
	)

	// フィルタリングされたメッセージ（メモ化）
	const filteredMessages = useMemo(
		() =>
			messages.filter(message => {
				if (!showAgentInteractions && message.isInteractionMessage) {
					return false
				}
				if (!showAgentInteractions && message.isTemporary) {
					return false
				}
				return true
			}),
		[messages, showAgentInteractions]
	)

	const getConnectionStatusColor = (state: string) => {
		switch (state) {
			case "connected":
				return "bg-green-500"
			case "connecting":
			case "handshaking":
				return "bg-yellow-500"
			case "error":
				return "bg-red-500"
			default:
				return "bg-gray-500"
		}
	}

	return (
		<SocketChatLayout
			isMultimodalOpen={isMultimodalEnabled && isMultimodalOpen}
			multimodalContent={
				isMultimodalEnabled && multimodalContent ? (
					<MultimodalErrorBoundary>{multimodalContent}</MultimodalErrorBoundary>
				) : null
			}
			onMultimodalClose={closeMultimodal}
		>
			<div className={responsiveClasses} style={{ height }}>
				{/* Header */}
				<div className={headerClasses}>
					<div
						className={`flex items-center ${extraCompact ? "space-x-1" : compact ? "space-x-1" : "space-x-3"}`}
					>
						<h2
							className={`font-semibold text-gray-800 ${extraCompact ? "text-xs" : compact ? "text-sm" : isMobile ? "text-base" : "text-lg"}`}
						>
							{extraCompact ? "Chat" : compact ? "Chat" : "Socket Chat"}
						</h2>
						<div
							className={`flex items-center ${extraCompact ? "space-x-1" : compact ? "space-x-1" : "space-x-2"}`}
						>
							<div
								className={`${extraCompact ? "w-1 h-1" : compact ? "w-1.5 h-1.5" : "w-2 h-2"} rounded-full ${getConnectionStatusColor(connectionState)}`}
							/>
							<span
								className={`text-gray-600 ${extraCompact ? "text-xs" : compact ? "text-xs" : "text-sm"}`}
							>
								{connectionState === "connected"
									? extraCompact || compact
										? "●"
										: "Connected"
									: connectionState}
							</span>
						</div>
						{sessionId && !compact && !extraCompact && (
							<span className={`text-gray-500 font-mono ${isMobile ? "text-xs" : "text-xs"}`}>
								{isMobile
									? `#${sessionId.slice(-6)}`
									: `Session: ${sessionId.length > 32 ? `${sessionId.substring(0, 32)}...` : sessionId}`}
							</span>
						)}
					</div>

					<div
						className={`flex items-center ${extraCompact ? "space-x-0.5" : compact ? "space-x-1" : "space-x-2"}`}
					>
						{/* Speech functionality removed */}

						{/* Multimodal Test Button - for testing the split screen functionality */}
						{(displayMode === "fullpage" || displayMode === "embed") && (
							<button
								onClick={() => {
									// Create a test chart for multimodal display
									const testContent = React.createElement(
										"div",
										{
											className: "p-4",
										},
										React.createElement(
											"h3",
											{
												className: "text-lg font-bold mb-2",
											},
											"マルチモーダル テスト"
										),
										React.createElement(
											"p",
											null,
											"マルチモーダル機能が正常に動作しています。右側のパネルにコンテンツが表示されています。"
										)
									)

									openMultimodal(testContent, "chart")
								}}
								className={`${extraCompact ? "p-0.5" : compact ? "p-1" : "p-2"} rounded-md border transition-colors bg-purple-100 text-purple-700 border-purple-300 hover:bg-purple-200`}
								title="マルチモーダル機能をテスト"
							>
								<FiPlay
									className={extraCompact ? "w-2.5 h-2.5" : compact ? "w-3 h-3" : "w-4 h-4"}
								/>
							</button>
						)}

						{/* Agent Interactions Toggle Button */}
						<div className="relative">
							<button
								onClick={() => setShowAgentInteractions(!showAgentInteractions)}
								className={`${extraCompact ? "p-0.5" : compact ? "p-1" : "p-2"} rounded-md border transition-colors ${
									showAgentInteractions
										? "bg-green-100 text-green-700 border-green-300 hover:bg-green-200"
										: "bg-red-100 text-red-700 border-red-300 hover:bg-red-200"
								}`}
								title={
									showAgentInteractions
										? "エージェント・ツール実行ログを非表示"
										: "エージェント・ツール実行ログを表示"
								}
							>
								{showAgentInteractions ? (
									<FiEye
										className={extraCompact ? "w-2.5 h-2.5" : compact ? "w-3 h-3" : "w-4 h-4"}
									/>
								) : (
									<FiEyeOff
										className={extraCompact ? "w-2.5 h-2.5" : compact ? "w-3 h-3" : "w-4 h-4"}
									/>
								)}
							</button>
							{agentInteractionCount > 0 && (
								<span
									className={`absolute -top-1 -right-1 bg-purple-600 text-white rounded-full flex items-center justify-center px-1 ${
										extraCompact
											? "text-xs min-w-[12px] h-[12px]"
											: compact
												? "text-xs min-w-[14px] h-[14px]"
												: "text-xs min-w-[18px] h-[18px]"
									}`}
								>
									{agentInteractionCount}
								</span>
							)}
						</div>

						{/* New Session Button */}
						<button
							onClick={handleNewSession}
							disabled={connectionState !== "connected"}
							className={`${extraCompact ? "p-0.5" : compact ? "p-1" : "p-2"} rounded-md border transition-colors ${
								connectionState === "connected"
									? "bg-white-900 text-gray-700 border-gray-600 hover:bg-gray-200"
									: "bg-white-900 text-gray-400 border-gray-600 cursor-not-allowed"
							}`}
							title="新しいセッションを開始"
						>
							<FiPlus className={extraCompact ? "w-2.5 h-2.5" : compact ? "w-3 h-3" : "w-4 h-4"} />
						</button>

						{/* Settings Toggle - フルページ・埋め込みモードでのみ表示 */}
						{showSettings && (displayMode === "fullpage" || displayMode === "embed") && (
							<button
								onClick={() => setIsSettingsOpen(!isSettingsOpen)}
								className={`${extraCompact ? "p-0.5" : compact ? "p-1" : "p-2"} rounded-md border transition-colors ${
									isSettingsOpen
										? "bg-blue-100 text-blue-700 border-gray-600"
										: "bg-gray-100 text-gray-700 border-gray-600 hover:bg-gray-200"
								}`}
								title="設定"
							>
								<FiSettings
									className={extraCompact ? "w-2.5 h-2.5" : compact ? "w-3 h-3" : "w-4 h-4"}
								/>
							</button>
						)}
					</div>
				</div>

				{/* Messages Area */}
				<div
					className={`flex-1 overflow-y-auto relative ${extraCompact ? "p-1 space-y-1" : compact ? "p-2 space-y-2" : "p-4 space-y-4"}`}
				>
					{/* Authentication Error Display */}
					{error?.message.includes("認証") && (
						<div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
							<div className="flex items-center">
								<div className="w-4 h-4 bg-red-500 rounded-full mr-3" />
								<div>
									<h3 className="text-red-800 font-medium">認証エラー</h3>
									<p className="text-red-700 text-sm mt-1">{error.message}</p>
									<button
										onClick={() => {
											// 認証エラーをクリアして再試行
											if (setError) setError(null)
											// 認証状態を再確認してWebSocket接続を試行
											const retryConnection = async () => {
												try {
													if (!isAuthenticated) {
														log.warn("Still not authenticated after retry attempt")
														return
													}
													const token = await getAccessToken()
													if (token) {
														await connect()
													}
												} catch (retryError) {
													log.error("Retry connection failed", { error: retryError })
												}
											}
											retryConnection()
										}}
										className="mt-2 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
									>
										再接続を試行
									</button>
								</div>
							</div>
						</div>
					)}

					{/* Speech recognition button removed */}
					{messages.length === 0 ? (
						<div
							className={`text-center text-gray-500 ${extraCompact ? "mt-2" : compact ? "mt-4" : "mt-8"}`}
						>
							<p className={extraCompact ? "text-xs" : compact ? "text-sm" : "text-base"}>
								{extraCompact || compact ? "チャット開始" : "WebSocketチャットへようこそ！"}
							</p>
							{!compact && !extraCompact && (
								<p className="text-sm mt-2">メッセージを送信して会話を開始してください。</p>
							)}
						</div>
					) : (
						filteredMessages.map(message =>
							message.isInteractionMessage &&
							message.agentInteractions &&
							message.agentInteractions[0] ? (
								<AgentInteractionMessage
									key={message.id}
									interaction={message.agentInteractions[0]}
									agentInfo={message.agentInfo}
								/>
							) : (
								<SocketChatMessage
									key={message.id}
									message={message}
									enableMarkdown={settings.enableMarkdown}
									showAgentInfo={true}
									showAgentDetails={showAgentInteractions}
									showJsonDetails={showAgentInteractions}
								/>
							)
						)
					)}

					{/* AI思考中プレースホルダー */}
					{isLoading && (
						<div className="flex items-center space-x-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
							<div className="flex items-center space-x-2 text-blue-600">
								{/* 回転するアイコン */}
								<div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
								<span className="text-sm font-medium">AIが思考中...</span>
							</div>
							{/* 点滅するドット */}
							<div className="flex space-x-1">
								<div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
								<div
									className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse"
									style={{ animationDelay: "0.2s" }}
								/>
								<div
									className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse"
									style={{ animationDelay: "0.4s" }}
								/>
							</div>
						</div>
					)}

					<div ref={messagesEndRef} />
				</div>

				{/* Input Area */}
				<div
					className={`border-t border-gray-200 bg-gray-50 ${extraCompact ? "p-0.5" : compact ? "p-1" : "p-2"}`}
				>
					<SocketChatInput
						onSendMessage={handleSendMessage}
						disabled={connectionState !== "connected" || isLoading}
						placeholder={
							connectionState === "connected" && !isLoading
								? "メッセージを入力してください..."
								: `接続中... (${connectionState})`
						}
						compact={compact}
						extraCompact={extraCompact}
					/>
				</div>
			</div>

			{/* Settings Drawer - フルページ・埋め込みモードでのみ表示 */}
			{(displayMode === "fullpage" || displayMode === "embed") && (
				<Drawer isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)}>
					<SocketChatSettings
						settings={settings}
						onSettingsChange={setSettings}
						onClose={() => setIsSettingsOpen(false)}
					/>
				</Drawer>
			)}
		</SocketChatLayout>
	)
}

// Main exported component wrapped with providers
export const SocketChatComponent: React.FC<SocketChatComponentProps> = props => {
	return (
		<MultimodalProvider>
			<MultimodalErrorBoundary>
				<SocketChatInner {...props} />
			</MultimodalErrorBoundary>
		</MultimodalProvider>
	)
}
