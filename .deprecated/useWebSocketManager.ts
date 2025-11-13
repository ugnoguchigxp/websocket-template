import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { createContextLogger } from "@/modules/logger"

import { useAuth } from "../../../contexts/AuthContext"
import { SecureWebSocketClient } from "../../../lib/websocket/client"
import type {
	WebSocketClientCallbacks,
	WebSocketConfig,
	WebSocketMessage,
} from "../../../lib/websocket/client"

const log = createContextLogger("WebSocketManager")

/**
 * WebSocket接続の状態
 */
export type WebSocketConnectionState =
	| "disconnected"
	| "connecting"
	| "authenticating"
	| "connected"
	| "error"

/**
 * WebSocketマネージャーのオプション
 */
export interface WebSocketManagerOptions {
	/** WebSocket接続URL（省略時はデフォルトURL） */
	url?: string
	/** 自動接続するかどうか（デフォルト: false） */
	autoConnect?: boolean
	/** 最大再接続試行回数（デフォルト: 3） */
	maxReconnectAttempts?: number
	/** 再接続間隔（ミリ秒、デフォルト: 3000） */
	reconnectInterval?: number
	/** 接続タイムアウト（ミリ秒、デフォルト: 10000） */
	connectionTimeout?: number
	/** メッセージ受信時のコールバック */
	onMessage?: (message: any) => void // eslint-disable-line @typescript-eslint/no-explicit-any
	/** 接続状態変更時のコールバック */
	onConnectionStateChange?: (state: WebSocketConnectionState) => void
	/** エラー発生時のコールバック */
	onError?: (error: Event | Error) => void
}

/**
 * WebSocketマネージャーの戻り値
 */
export interface WebSocketManagerReturn {
	/** 接続状態 */
	connectionState: WebSocketConnectionState
	/** 接続中かどうか */
	isConnecting: boolean
	/** 接続済みかどうか */
	isConnected: boolean
	/** エラーメッセージ */
	error: string | null
	/** 最後に受信したメッセージ */
	lastMessage: WebSocketMessage | null
	/** 手動接続 */
	connect: () => Promise<void>
	/** 切断 */
	disconnect: () => void
	/** 再接続 */
	reconnect: () => Promise<void>
	/** メッセージ送信 */
	send: (message: Omit<WebSocketMessage, "timestamp">) => boolean
	/** 接続統計情報 */
	stats: {
		isConnected: boolean
		reconnectAttempt: number
		queuedMessages: number
		readyState: number
	}
}

/**
 * WebSocket接続の初期化、認証、接続管理を行う共通Hook
 *
 * 使用例:
 * ```tsx
 * const {
 *   connectionState,
 *   isConnected,
 *   connect,
 *   disconnect,
 *   send
 * } = useWebSocketManager({
 *   autoConnect: false,
 *   onMessage: (msg) => console.log('Received:', msg),
 *   onConnectionStateChange: (state) => console.log('State:', state)
 * });
 *
 * // ページロード時などに手動接続
 * useEffect(() => {
 *   connect();
 * }, []);
 * ```
 */
export function useWebSocketManager(options: WebSocketManagerOptions = {}): WebSocketManagerReturn {
	const { getAccessToken, isAuthenticated } = useAuth()
	const {
		autoConnect = false,
		maxReconnectAttempts = 3,
		reconnectInterval = 3000,
		connectionTimeout = 10000,
		onMessage,
		onConnectionStateChange,
		onError,
	} = options

	// 状態管理
	const [connectionState, setConnectionState] = useState<WebSocketConnectionState>("disconnected")
	const [error, setError] = useState<string | null>(null)
	const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null)
	const [reconnectAttempt, setReconnectAttempt] = useState(0)

	// WebSocketクライアントの参照
	const clientRef = useRef<SecureWebSocketClient | null>(null)
	const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null)
	const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
	const isConnectingRef = useRef<boolean>(false)
	const isInitializedRef = useRef<boolean>(false)

	// 派生状態
	const isConnecting = connectionState === "connecting" || connectionState === "authenticating"
	const isConnected = connectionState === "connected"

	/**
	 * 接続状態を更新
	 */
	const updateConnectionState = useCallback(
		(newState: WebSocketConnectionState) => {
			setConnectionState(prevState => {
				log.debug("Connection state changed", { from: prevState, to: newState })
				onConnectionStateChange?.(newState)
				return newState
			})
		},
		[onConnectionStateChange]
	)

	/**
	 * エラーを設定
	 */
	const setErrorState = useCallback(
		(errorMessage: string, errorEvent?: Event | Error) => {
			log.error("WebSocket error", { error: errorMessage, event: errorEvent })
			setError(errorMessage)
			updateConnectionState("error")
			onError?.(errorEvent || new Error(errorMessage))
		},
		[updateConnectionState, onError]
	)

	// scheduleReconnect関数は削除 - WebSocketクライアントから外部制御に変更

	/**
	 * WebSocketクライアントのコールバック
	 */
	const callbacks: WebSocketClientCallbacks = useMemo(
		() => ({
			onOpen: () => {
				log.info("WebSocket connection opened")
				// 接続タイムアウトをクリア
				if (connectionTimeoutRef.current) {
					clearTimeout(connectionTimeoutRef.current)
					connectionTimeoutRef.current = null
				}

				setError(null)
				setReconnectAttempt(0)
				updateConnectionState("connected")
			},

			onMessage: (message: WebSocketMessage) => {
				log.debug("WebSocket message received", { type: message.type })
				setLastMessage(message)
				onMessage?.(message)
			},

			onClose: () => {
				log.info("WebSocket connection closed")
				if (connectionTimeoutRef.current) {
					clearTimeout(connectionTimeoutRef.current)
					connectionTimeoutRef.current = null
				}

				// 切断状態に更新（再接続はonReconnectコールバックで処理される）
				setConnectionState(currentState => {
					log.debug("WebSocket closed, updating state", {
						previousState: currentState,
					})
					return "disconnected"
				})
			},

			onError: (event: Event) => {
				setErrorState("WebSocket connection error", event)
				if (connectionTimeoutRef.current) {
					clearTimeout(connectionTimeoutRef.current)
					connectionTimeoutRef.current = null
				}
			},

			onReconnect: (attempt: number) => {
				log.warn(
					"🔄 WebSocket client requested RECONNECTION - this may indicate unexpected disconnection",
					{
						attempt,
						currentState: connectionState,
						isConnectingRef: isConnectingRef.current,
						timestamp: new Date().toISOString(),
					}
				)
				setReconnectAttempt(attempt)

				// 最大試行回数をチェック
				if (attempt >= maxReconnectAttempts) {
					setErrorState("Maximum reconnection attempts exceeded")
					return
				}

				// 再接続は無効化（無限ループ防止）
				log.warn("⚠️ Reconnection disabled to prevent infinite loops", {
					attempt,
					maxAttempts: maxReconnectAttempts,
				})
			},
		}),
		[maxReconnectAttempts, reconnectInterval, onMessage, setErrorState, updateConnectionState]
	)

	// scheduleReconnect関数は上で定義済み

	/**
	 * WebSocketクライアントを初期化
	 */
	const initializeClient = useCallback(() => {
		if (clientRef.current || isInitializedRef.current) {
			log.debug("WebSocket client already initialized, skipping")
			return
		}

		const wsUrl =
			options.url ||
			`${import.meta.env.VITE_WS_URL || `ws://${import.meta.env.VITE_API_HOST || "localhost"}:${import.meta.env.VITE_API_PORT || "3000"}`}/chat`

		const config: WebSocketConfig = {
			url: wsUrl,
			protocols: ["chat"],
			reconnectAttempts: maxReconnectAttempts,
			reconnectDelay: reconnectInterval,
		}

		log.info("Initializing WebSocket client", config)
		clientRef.current = new SecureWebSocketClient(config, callbacks)
		isInitializedRef.current = true

		// 認証トークン取得関数を設定
		if (getAccessToken) {
			clientRef.current.setTokenGetter(getAccessToken)
		}
	}, [options.url, maxReconnectAttempts, reconnectInterval, callbacks, getAccessToken])

	/**
	 * 接続を開始
	 */
	const connect = useCallback(async () => {
		// 詳細な認証チェック
		const authStatus = isAuthenticated
		log.info("🔐 WebSocket connection attempt - Authentication status check", {
			isAuthenticated: authStatus,
			hasGetAccessToken: !!getAccessToken,
			timestamp: new Date().toISOString(),
		})

		if (!authStatus) {
			log.error("🚨 WebSocket connection failed: Authentication required", {
				hasGetAccessToken: !!getAccessToken,
				authFunctionType: typeof isAuthenticated,
			})
			setErrorState("Authentication required")
			return
		}

		// トークンの取得テスト
		if (getAccessToken) {
			try {
				const token = await getAccessToken()
				log.info("🎫 Access token acquisition result", {
					hasToken: !!token,
					tokenLength: token ? token.length : 0,
					tokenStart: token ? `${token.substring(0, 10)}...` : "null",
				})

				if (!token) {
					log.error("🚨 WebSocket connection failed: No access token available")
					setErrorState("No access token available")
					return
				}
			} catch (tokenError) {
				log.error("🚨 Failed to acquire access token for WebSocket", {
					error: tokenError instanceof Error ? tokenError.message : String(tokenError),
				})
				setErrorState("Failed to acquire access token")
				return
			}
		} else {
			log.error("🚨 No getAccessToken function available")
			setErrorState("Authentication system not initialized")
			return
		}

		// 既に接続中または接続済みの場合は何もしない
		if (
			connectionState === "connecting" ||
			connectionState === "connected" ||
			isConnectingRef.current
		) {
			log.debug("Connection already in progress or established")
			return
		}

		isConnectingRef.current = true

		try {
			// クライアント初期化
			initializeClient()

			if (!clientRef.current) {
				throw new Error("Failed to initialize WebSocket client")
			}

			log.info("🚀 Starting WebSocket connection with authentication")
			updateConnectionState("connecting")

			// 接続タイムアウト設定
			connectionTimeoutRef.current = setTimeout(() => {
				log.error("⏰ WebSocket connection timeout")
				setErrorState("Connection timeout")
				// disconnect関数を直接呼ばずにクライアント切断のみ行う
				if (clientRef.current) {
					clientRef.current.disconnect()
				}
				isConnectingRef.current = false
				updateConnectionState("disconnected")
			}, connectionTimeout)

			// 認証状態に更新
			updateConnectionState("authenticating")

			// 接続実行
			await clientRef.current.connect()
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : "Connection failed"
			log.error("💥 WebSocket connection failed", {
				error: errorMessage,
				errorType: err instanceof Error ? err.constructor.name : typeof err,
			})
			setErrorState(errorMessage, err as Error)
		} finally {
			isConnectingRef.current = false
		}
	}, [
		isAuthenticated,
		getAccessToken,
		connectionTimeout,
		initializeClient,
		updateConnectionState,
		setErrorState,
	])

	/**
	 * 接続を切断
	 */
	const disconnect = useCallback(() => {
		log.debug("Disconnecting WebSocket")

		// 重複切断を防止
		if (connectionState === "disconnected") {
			log.debug("Already disconnected")
			return
		}

		isConnectingRef.current = false

		// タイムアウトをクリア
		if (connectionTimeoutRef.current) {
			clearTimeout(connectionTimeoutRef.current)
			connectionTimeoutRef.current = null
		}

		if (reconnectTimeoutRef.current) {
			clearTimeout(reconnectTimeoutRef.current)
			reconnectTimeoutRef.current = null
		}

		// クライアント切断
		if (clientRef.current) {
			clientRef.current.disconnect()
		}

		setError(null)
		setReconnectAttempt(0)
		updateConnectionState("disconnected")
	}, [connectionState, updateConnectionState])

	/**
	 * 再接続
	 */
	const reconnect = useCallback(async () => {
		log.info("Manual reconnect requested")

		// 直接切断処理を実行（disconnect関数呼び出しによる循環参照を避ける）
		isConnectingRef.current = false

		if (connectionTimeoutRef.current) {
			clearTimeout(connectionTimeoutRef.current)
			connectionTimeoutRef.current = null
		}

		if (reconnectTimeoutRef.current) {
			clearTimeout(reconnectTimeoutRef.current)
			reconnectTimeoutRef.current = null
		}

		if (clientRef.current) {
			clientRef.current.disconnect()
		}

		setError(null)
		setReconnectAttempt(0)
		updateConnectionState("disconnected")

		// 少し待ってから再接続
		await new Promise(resolve => setTimeout(resolve, 1000))

		// 直接connect処理を実行（connect関数呼び出しによる循環参照を避ける）
		if (!isAuthenticated) {
			setErrorState("Authentication required")
			return
		}

		isConnectingRef.current = true

		try {
			initializeClient()

			if (!clientRef.current) {
				throw new Error("Failed to initialize WebSocket client")
			}

			updateConnectionState("connecting")
			await clientRef.current.connect()
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : "Reconnection failed"
			setErrorState(errorMessage, err as Error)
		} finally {
			isConnectingRef.current = false
		}
	}, [isAuthenticated, initializeClient, updateConnectionState, setErrorState])

	/**
	 * メッセージ送信
	 */
	const send = useCallback(
		(message: any) => {
			// eslint-disable-line @typescript-eslint/no-explicit-any
			if (!clientRef.current) {
				log.warn("WebSocket client not initialized")
				return false
			}

			if (connectionState !== "connected") {
				log.warn("WebSocket not connected")
				return false
			}

			return clientRef.current.send(message)
		},
		[connectionState]
	)

	/**
	 * 統計情報取得
	 */
	const stats = clientRef.current?.getStats() || {
		isConnected: false,
		reconnectAttempt: 0,
		queuedMessages: 0,
		readyState: WebSocket.CLOSED,
	}

	// 自動接続処理 - connectの依存配列から独立
	useEffect(() => {
		if (autoConnect && isAuthenticated && connectionState === "disconnected") {
			log.debug("Auto-connecting WebSocket")
			connect()
		}
	}, [autoConnect, connectionState]) // connect関数を依存配列から除外

	// 再接続処理は削除 - 自動接続で十分
	// useEffect(() => {
	//   if (connectionState === 'connecting' && !isConnectingRef.current) {
	//     log.debug('Reconnect triggered');
	//     connect();
	//   }
	// }, [connectionState]); // connect関数を依存配列から除外

	// 認証状態変更の監視
	useEffect(() => {
		if (!isAuthenticated && isConnected) {
			log.info("Authentication lost, disconnecting WebSocket")
			disconnect()
		}
	}, [isConnected]) // disconnect関数を依存配列から除外（関数は常に安定）

	// クリーンアップ
	useEffect(() => {
		return () => {
			log.debug("WebSocketManager cleanup triggered")
			if (connectionTimeoutRef.current) {
				clearTimeout(connectionTimeoutRef.current)
			}
			if (reconnectTimeoutRef.current) {
				clearTimeout(reconnectTimeoutRef.current)
			}
			if (clientRef.current) {
				clientRef.current.disconnect()
				clientRef.current = null
			}
			isInitializedRef.current = false
			isConnectingRef.current = false
		}
	}, [])

	return {
		connectionState,
		isConnecting,
		isConnected,
		error,
		lastMessage,
		connect,
		disconnect,
		reconnect,
		send,
		stats: {
			...stats,
			reconnectAttempt,
		},
	}
}
