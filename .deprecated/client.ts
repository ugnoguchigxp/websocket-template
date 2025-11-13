/**
 * Secure WebSocket Client
 * MSAL認証統合WebSocketクライアント
 */

import React from "react"

import { createContextLogger } from "@/modules/logger"

import { useAuth } from "@/contexts/AuthContext"

const log = createContextLogger("WebSocketClient")

export interface WebSocketConfig {
	url: string
	protocols?: string | string[]
	reconnectAttempts?: number
	reconnectDelay?: number
	heartbeatInterval?: number
	maxMessageSize?: number
}

export interface WebSocketMessage {
	type: string
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	data?: any
	id?: string
	timestamp?: number
}

export interface WebSocketClientCallbacks {
	onOpen?: (event: Event) => void
	onMessage?: (message: WebSocketMessage) => void
	onClose?: (event: CloseEvent) => void
	onError?: (event: Event) => void
	onReconnect?: (attempt: number) => void
}

export class SecureWebSocketClient {
	private ws: WebSocket | null = null
	private config: Required<WebSocketConfig>
	private callbacks: WebSocketClientCallbacks = {}
	private reconnectTimeout: NodeJS.Timeout | null = null
	private heartbeatInterval: NodeJS.Timeout | null = null
	private currentReconnectAttempt = 0
	private isManualClose = false
	private getAccessToken: (() => Promise<string | null>) | null = null
	private messageQueue: WebSocketMessage[] = []
	private isConnected = false

	constructor(config: WebSocketConfig, callbacks?: WebSocketClientCallbacks) {
		this.config = {
			url: config.url,
			protocols: config.protocols || [],
			reconnectAttempts: config.reconnectAttempts || 5,
			reconnectDelay: config.reconnectDelay || 1000,
			heartbeatInterval: config.heartbeatInterval || 30000,
			maxMessageSize: config.maxMessageSize || 1024 * 1024, // 1MB
		}
		this.callbacks = callbacks || {}
	}

	// 認証トークン取得関数を設定
	setTokenGetter(tokenGetter: () => Promise<string | null>) {
		this.getAccessToken = tokenGetter
	}

	// WebSocket URL に認証トークンを追加
	private async buildAuthenticatedUrl(): Promise<string> {
		let url = this.config.url

		if (this.getAccessToken) {
			try {
				const token = await this.getAccessToken()
				if (token) {
					const separator = url.includes("?") ? "&" : "?"
					// WebSocket.mdのベストプラクティスに準拠してtokenパラメータを使用
					url += `${separator}token=${encodeURIComponent(token)}`
				}
			} catch (error) {
				log.warn("Failed to get access token for WebSocket connection", { error })
			}
		}

		return url
	}

	// WebSocket接続
	async connect(): Promise<void> {
		if (this.ws?.readyState === WebSocket.OPEN || this.ws?.readyState === WebSocket.CONNECTING) {
			log.debug("WebSocket already connected or connecting", {
				readyState: this.ws?.readyState,
			})
			return
		}

		this.isManualClose = false

		try {
			const authenticatedUrl = await this.buildAuthenticatedUrl()
			log.info("Establishing WebSocket connection", { url: this.config.url })

			this.ws = new WebSocket(authenticatedUrl, this.config.protocols)

			this.ws.onopen = this.handleOpen.bind(this)
			this.ws.onmessage = this.handleMessage.bind(this)
			this.ws.onclose = this.handleClose.bind(this)
			this.ws.onerror = this.handleError.bind(this)
		} catch (error) {
			log.error("Failed to create WebSocket connection", { error })
			// 接続エラー時は外部のエラーハンドラーに委譲
			this.callbacks.onError?.(
				new ErrorEvent("connection_failed", {
					error: error instanceof Error ? error : new Error(String(error)),
				})
			)
		}
	}

	// WebSocket切断
	disconnect(): void {
		log.debug("Disconnecting WebSocket")
		this.isManualClose = true
		this.clearTimeouts()

		if (this.ws) {
			this.ws.close(1000, "Manual disconnect")
			this.ws = null
		}

		this.isConnected = false
		this.currentReconnectAttempt = 0
	}

	// メッセージ送信
	send(message: WebSocketMessage): boolean {
		// isReady()を使用して、接続状態とWebSocket.OPEN状態の両方をチェック
		if (!this.isReady()) {
			log.warn("WebSocket not connected, queueing message", {
				message,
				isConnected: this.isConnected,
				readyState: this.ws?.readyState,
				expectedReadyState: WebSocket.OPEN,
			})
			this.messageQueue.push(message)
			return false
		}

		try {
			const messageStr = JSON.stringify({
				...message,
				timestamp: new Date().toISOString(),
			})

			// メッセージサイズチェック
			if (messageStr.length > this.config.maxMessageSize) {
				log.error("Message too large", {
					size: messageStr.length,
					max: this.config.maxMessageSize,
				})
				return false
			}

			this.ws!.send(messageStr)
			log.info("📤 WebSocket message sent successfully", {
				type: message.type,
				id: message.id,
				messageSize: messageStr.length,
				connectionState: this.isConnected,
				readyState: this.ws?.readyState,
				timestamp: new Date().toISOString(),
			})
			return true
		} catch (error) {
			log.error("Failed to send WebSocket message", { error, message })
			return false
		}
	}

	// 接続状態確認
	isReady(): boolean {
		return this.isConnected && this.ws?.readyState === WebSocket.OPEN
	}

	// ハートビート送信（一時的に無効化中）

	// @ts-ignore - 一時的に無効化中のため未使用警告を抑制
	private sendHeartbeat(): void {
		// 無限リクエスト調査のため一時的にコメントアウト
		// if (this.isReady()) {
		//   this.send({ type: 'heartbeat' });
		// }
	}

	// 接続ハンドラー
	private handleOpen(event: Event): void {
		log.info("WebSocket connection established")
		this.isConnected = true
		this.currentReconnectAttempt = 0

		// ハートビート開始（一時的に無効化して無限リクエスト問題を調査）
		// this.startHeartbeat();

		// キューに溜まったメッセージを送信
		this.flushMessageQueue()

		this.callbacks.onOpen?.(event)
	}

	// メッセージハンドラー
	private handleMessage(event: MessageEvent): void {
		try {
			const message: WebSocketMessage = JSON.parse(event.data)

			// ログレベルを調整：頻繁なメッセージは debug レベルに
			if (["agent_thinking", "tool_executing", "tool_result"].includes(message.type)) {
				log.debug("WebSocket message received at client level", {
					type: message.type,
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					sessionId: `${(message as any).sessionId?.substring(0, 8)}...`,
				})
			} else if (message.type !== "heartbeat") {
				log.debug("WebSocket message received at client level", {
					type: message.type,
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					sessionId: `${(message as any).sessionId?.substring(0, 8)}...`,
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					dataKeys: Object.keys((message as any).data || {}),
					rawDataLength: event.data.length,
				})
			}

			// ハートビートレスポンスの処理
			if (message.type === "heartbeat") {
				return // ハートビートは特別な処理不要
			}

			this.callbacks.onMessage?.(message)
		} catch (error) {
			log.error("Failed to parse WebSocket message", { error, data: event.data })
		}
	}

	// 切断ハンドラー
	private handleClose(event: CloseEvent): void {
		log.warn("🔌 WebSocket connection CLOSED", {
			code: event.code,
			reason: event.reason,
			wasClean: event.wasClean,
			isManualClose: this.isManualClose,
			willReconnect: !this.isManualClose && event.code !== 1000,
			timestamp: new Date().toISOString(),
		})

		this.isConnected = false
		this.clearTimeouts()

		this.callbacks.onClose?.(event)

		// 手動切断でない場合は再接続を試行
		if (!this.isManualClose && event.code !== 1000) {
			log.warn("🔄 WebSocket was closed unexpectedly - scheduling reconnect", {
				closeCode: event.code,
				reason: event.reason,
			})
			this.scheduleReconnect()
		}
	}

	// エラーハンドラー
	private handleError(event: Event): void {
		log.error("WebSocket error occurred", { event })
		this.callbacks.onError?.(event)
	}

	// 再接続スケジュール - 外部管理に委譲
	private scheduleReconnect(): void {
		if (this.isManualClose || this.currentReconnectAttempt >= this.config.reconnectAttempts) {
			log.warn("Max reconnection attempts reached or manual close")
			return
		}

		this.currentReconnectAttempt++

		log.info("WebSocket connection lost, notifying external reconnect handler", {
			attempt: this.currentReconnectAttempt,
		})

		// 外部の再接続管理に委譲（無限再接続を防止）
		this.callbacks.onReconnect?.(this.currentReconnectAttempt)

		// 自動再接続はしない - 外部で管理
	}

	// ハートビート開始（一時的に無効化中）

	// @ts-ignore - 一時的に無効化中のため未使用警告を抑制
	private startHeartbeat(): void {
		this.clearHeartbeat()
		// 無限リクエスト調査のため一時的にコメントアウト
		// this.heartbeatInterval = setInterval(() => {
		//   this.sendHeartbeat();
		// }, this.config.heartbeatInterval);
	}

	// タイムアウトクリア
	private clearTimeouts(): void {
		this.clearHeartbeat()
		if (this.reconnectTimeout) {
			clearTimeout(this.reconnectTimeout)
			this.reconnectTimeout = null
		}
	}

	// ハートビートクリア
	private clearHeartbeat(): void {
		if (this.heartbeatInterval) {
			clearInterval(this.heartbeatInterval)
			this.heartbeatInterval = null
		}
	}

	// メッセージキューフラッシュ
	private flushMessageQueue(): void {
		while (this.messageQueue.length > 0 && this.isReady()) {
			const message = this.messageQueue.shift()
			if (message) {
				this.send(message)
			}
		}
	}

	// 接続状態取得
	getReadyState(): number {
		return this.ws?.readyState ?? WebSocket.CLOSED
	}

	// 統計情報取得
	getStats() {
		return {
			isConnected: this.isConnected,
			reconnectAttempt: this.currentReconnectAttempt,
			queuedMessages: this.messageQueue.length,
			readyState: this.getReadyState(),
		}
	}
}

// React Hook for WebSocket Client
export const useWebSocketClient = (
	config: WebSocketConfig,
	callbacks?: WebSocketClientCallbacks
) => {
	const { getAccessToken } = useAuth()
	const [client] = React.useState(() => {
		const wsClient = new SecureWebSocketClient(config, callbacks)
		if (getAccessToken) {
			wsClient.setTokenGetter(getAccessToken)
		}
		return wsClient
	})

	React.useEffect(() => {
		return () => {
			client.disconnect()
		}
	}, [client])

	return client
}
