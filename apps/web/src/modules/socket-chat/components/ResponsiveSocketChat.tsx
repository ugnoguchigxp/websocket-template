/**
 * Responsive Socket Chat Component
 * レスポンシブ対応の基本チャットコンポーネント
 */

import type React from "react"
import { useEffect, useRef, useState } from "react"

import { FiMaximize2, FiMinimize2, FiPlus, FiSettings, FiVolumeX, FiX } from "react-icons/fi"

import { createContextLogger } from "@/modules/logger"

import { MultimodalErrorBoundary } from "../../../components/common/MultimodalErrorBoundary"
import Drawer from "../../../components/ui/Drawer"
import { MultimodalProvider } from "../../../contexts/MultimodalContext"
import { useIsMobile } from "../../../hooks/useIsMobile"
import { useTrpcChat } from "../hooks/useTrpcChat"
import type { MCPChatSettings } from "../types/mcpChat"

// import { useConversation } from '../../../contexts/ConversationProvider';

// Legacy components imported for potential use

import { SocketChatInput } from "./SocketChatInput"
import { SocketChatLayout } from "./SocketChatLayout"
import { SocketChatSettings } from "./SocketChatSettings"

const log = createContextLogger("ResponsiveSocketChat")

export interface ResponsiveSocketChatProps {
	/** 初期セッションID */
	initialSessionId?: string
	/** チャットの高さ */
	height?: string | number
	/** 設定パネルの表示制御 */
	showSettings?: boolean
	/** ヘッダー表示制御 */
	showHeader?: boolean
	/** タイトル */
	title?: string
	/** クローズボタン表示 */
	showCloseButton?: boolean
	/** 最小化ボタン表示 */
	showMinimizeButton?: boolean
	/** クローズ時のコールバック */
	onClose?: () => void
	/** 最小化時のコールバック */
	onMinimize?: () => void
	/** カスタムクラス名 */
	className?: string
	/** コンパクトモード */
	compact?: boolean
}

// Internal component that uses the multimodal context
const ResponsiveSocketChatInner: React.FC<ResponsiveSocketChatProps> = ({
	initialSessionId,
	height = "600px",
	showSettings = true,
	showHeader = true,
	title = "AI Chat",
	showCloseButton = false,
	showMinimizeButton = false,
	onClose,
	onMinimize,
	className = "",
	compact = false,
}) => {
	const isMobile = useIsMobile()
	const {
		messages,
		sessionId,
		connectionState,
		sendMessage,

		clearSession,
		updateSettings,
		isAutoPlaying,
		stopAutoSpeech,
	} = useTrpcChat()

	// Multimodal context available if needed
	// const multimodal = useMultimodal();

	// Conversation context available if needed
	// const { restartConversation } = useConversation();

	const [settings, setSettings] = useState<MCPChatSettings>({
		selectedTools: [],
		selectedResources: [],
		temperature: 1.0,
		maxTokens: 4000,
		enableMarkdown: true,
		enableCharts: true,
		enableBrowserFrame: true,
		enablePlaywright: true,
		enableMarkdownDocument: true,
		chartDefaults: {
			width: 800,
			height: 400,
			theme: "light" as const,
		},
		browserDefaults: {
			width: 1024,
			height: 768,
			viewport: "desktop" as const,
			allowInteraction: true,
		},
		playwrightDefaults: {
			headless: true,
			timeout: 30000,
			viewport: { width: 1024, height: 768 },
		},
	})

	const [isSettingsOpen, setIsSettingsOpen] = useState(false)
	const [isMinimized, setIsMinimized] = useState(false)
	const messagesEndRef = useRef<HTMLDivElement>(null)

	// セッション初期化
	useEffect(() => {
		if (initialSessionId) {
			log.info("初期セッションIDを設定:", initialSessionId)
		}
	}, [initialSessionId])

	// 設定変更ハンドラー
	const handleSettingsChange = (newSettings: MCPChatSettings) => {
		setSettings(newSettings)
		// updateSettings expects settings object with speakEnabled
		updateSettings({ speakEnabled: newSettings.enableMarkdown })
	}

	// メッセージ送信ハンドラー
	const handleSendMessage = async (message: string) => {
		await sendMessage(message, settings.enableMarkdown)
	}

	// 新しい会話を開始
	const handleNewConversation = () => {
		clearSession()
		// restartConversation(); // Function not available in current context
	}

	// メッセージを最下部にスクロール
	const scrollToBottom = () => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
	}

	useEffect(() => {
		scrollToBottom()
	}, [messages])

	// 高さの処理
	const heightStyle = typeof height === "number" ? `${height}px` : height

	// レスポンシブクラス
	const containerClasses = `
    relative bg-white
    ${isMobile ? "rounded-none" : "rounded-lg shadow-lg"}
    ${compact ? "border" : "shadow-lg"}
    ${className}
  `.trim()

	// ヘッダークラス
	const headerClasses = `
    flex items-center justify-between p-3
    ${isMobile ? "px-2" : "px-4"}
    border-b border-gray-200 bg-gray-50
    ${isMobile ? "rounded-none" : "rounded-t-lg"}
  `.trim()

	// チャットエリアクラス
	const chatAreaClasses = `
    flex flex-col
    ${isMinimized ? "h-0 overflow-hidden" : ""}
  `.trim()

	return (
		<div
			className={containerClasses}
			style={{
				height: isMinimized ? "auto" : heightStyle,
				minHeight: isMinimized ? "auto" : isMobile ? "400px" : "500px",
			}}
		>
			{/* ヘッダー */}
			{showHeader && (
				<div className={headerClasses}>
					<div className="flex items-center space-x-2">
						<div className="flex items-center space-x-2">
							<div
								className={`w-2 h-2 rounded-full ${connectionState === "connected" ? "bg-green-500" : "bg-red-500"}`}
							/>
							<h3 className={`font-semibold text-gray-900 ${isMobile ? "text-sm" : "text-base"}`}>
								{title}
							</h3>
						</div>

						{sessionId && (
							<span className={`text-gray-500 ${isMobile ? "text-xs" : "text-sm"}`}>
								{isMobile ? `#${sessionId.slice(-6)}` : `Session: ${sessionId.slice(-8)}`}
							</span>
						)}
					</div>

					<div className="flex items-center space-x-1">
						{/* 音声停止ボタン */}
						{isAutoPlaying && (
							<button
								onClick={stopAutoSpeech}
								className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
								title="音声停止"
							>
								<FiVolumeX className={isMobile ? "w-3 h-3" : "w-4 h-4"} />
							</button>
						)}

						{/* Multimodal controls available when context is properly implemented */}

						{/* 新しい会話ボタン */}
						<button
							onClick={handleNewConversation}
							className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
							title="新しい会話"
						>
							<FiPlus className={isMobile ? "w-3 h-3" : "w-4 h-4"} />
						</button>

						{/* 設定ボタン */}
						{showSettings && (
							<button
								onClick={() => setIsSettingsOpen(true)}
								className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
								title="設定"
							>
								<FiSettings className={isMobile ? "w-3 h-3" : "w-4 h-4"} />
							</button>
						)}

						{/* 最小化ボタン */}
						{showMinimizeButton && (
							<button
								onClick={() => {
									setIsMinimized(!isMinimized)
									onMinimize?.()
								}}
								className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
								title={isMinimized ? "展開" : "最小化"}
							>
								{isMinimized ? (
									<FiMaximize2 className={isMobile ? "w-3 h-3" : "w-4 h-4"} />
								) : (
									<FiMinimize2 className={isMobile ? "w-3 h-3" : "w-4 h-4"} />
								)}
							</button>
						)}

						{/* クローズボタン */}
						{showCloseButton && (
							<button
								onClick={onClose}
								className="p-1.5 text-gray-600 hover:bg-red-100 hover:text-red-600 rounded-md transition-colors"
								title="閉じる"
							>
								<FiX className={isMobile ? "w-3 h-3" : "w-4 h-4"} />
							</button>
						)}
					</div>
				</div>
			)}

			{/* チャットエリア */}
			<div className={chatAreaClasses}>
				<SocketChatLayout isMultimodalOpen={false} onMultimodalClose={() => {}}>
					<div className="flex flex-col h-full">
						<div className="flex-1 overflow-y-auto p-4 space-y-4">
							{messages.map((message, index) => (
								<div key={index} className="mb-4">
									<div className="text-sm text-gray-500 mb-1">
										{message.role === "user" ? "You" : "AI"}
									</div>
									<div
										className={`p-3 rounded-lg ${
											message.role === "user" ? "bg-blue-100 ml-8" : "bg-gray-100 mr-8"
										}`}
									>
										{message.content}
									</div>
								</div>
							))}
							<div ref={messagesEndRef} />
						</div>
					</div>
				</SocketChatLayout>

				{/* 入力エリア */}
				<div className={`border-t border-gray-200 ${isMobile ? "p-2" : "p-4"}`}>
					<SocketChatInput
						onSendMessage={handleSendMessage}
						disabled={connectionState !== "connected"}
						placeholder={
							connectionState === "connected" ? "メッセージを入力..." : "接続を待機中..."
						}
					/>
				</div>
			</div>

			{/* 設定ドロワー */}
			<Drawer isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} position="right">
				<SocketChatSettings
					settings={settings}
					onSettingsChange={handleSettingsChange}
					onClose={() => setIsSettingsOpen(false)}
				/>
			</Drawer>
		</div>
	)
}

// Main component with MultimodalProvider
export const ResponsiveSocketChat: React.FC<ResponsiveSocketChatProps> = props => {
	return (
		<MultimodalErrorBoundary>
			<MultimodalProvider>
				<ResponsiveSocketChatInner {...props} />
			</MultimodalProvider>
		</MultimodalErrorBoundary>
	)
}
