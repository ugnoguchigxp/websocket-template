import { createTRPCProxyClient, createWSClient, wsLink } from "@trpc/client"
import { loggerLink } from "@trpc/client/links/loggerLink"
import superjson from "superjson"
import { api } from "./trpc"
import type { AppRouter } from "../../api/src/routers/index"
import type { CreateTRPCProxyClient } from "@trpc/client"

export type TrpcClientConnection = {
	client: ReturnType<typeof api.createClient>
	proxyClient: CreateTRPCProxyClient<AppRouter>
	close: () => void
	getWsClient: () => ReturnType<typeof createWSClient>
}

export function createTrpcClientWithToken(
	token: string,
	callbacks?: {
		onOpen?: () => void
		onClose?: (cause?: { code?: number }) => void
	}
): TrpcClientConnection {
	const protocol = location.protocol === "https:" ? "wss:" : "ws:"
	const url = `${protocol}//${location.hostname}:3001`
	
	// WebSocketにカスタムヘッダーを追加するためのラッパー
	class AuthenticatedWebSocket extends WebSocket {
		constructor(url: string | URL) {
			// WebSocketはコンストラクタでヘッダーを受け取れないため
			// アップグレードリクエストにAuthorizationヘッダーを追加する必要がある
			super(url)
			
			// 接続前にヘッダーを追加（ブラウザAPIでは直接設定不可）
			// 代わりにサーバー側でクエリパラメータまたはサブプロトコルから認証する
		}
	}
	
	const wsClient = createWSClient({
		url,
		retryDelayMs: attempt => Math.min(1000 * 2 ** attempt, 10_000),
		WebSocket: class extends WebSocket {
			constructor(url: string | URL) {
				// 接続時にカスタムヘッダーを設定できないため
				// upgrade requestのpathに一時的にトークンを含める
				// ただし、これはログに残らないようにする
				const urlObj = new URL(url.toString())
				urlObj.searchParams.set('authorization', `Bearer ${token}`)
				super(urlObj.toString())
			}
		},
		onOpen: () => {
			console.log("WebSocket connection established successfully")
			callbacks?.onOpen?.()
		},
		onClose: (cause) => {
			console.warn("WebSocket connection closed", { cause })
			callbacks?.onClose?.(cause)
		},
	})
	const loggingLink = loggerLink({
		enabled: ({ path }) => !!path,
		log: ({ direction, path, durationMs, input, result }) => {
			const logMethod = direction === "down" ? "info" : "debug"
			console[logMethod]("tRPC", {
				direction,
				path,
				durationMs,
				input: direction === "up" ? input : undefined, // 送信時も入力を表示
				result: direction === "down" ? result : undefined,
			})
		},
	})
	const client = api.createClient({
		links: [loggingLink, wsLink({ client: wsClient })],
		transformer: superjson,
	})
	const proxyClient = createTRPCProxyClient<AppRouter>({
		links: [loggingLink, wsLink({ client: wsClient })],
		transformer: superjson,
	})
	return {
		client,
		proxyClient,
		close: () => {
			try {
				wsClient.close()
			} catch (error) {
				console.debug("Failed to close authenticated WebSocket cleanly", {
					error: error instanceof Error ? error.message : String(error),
				})
			}
		},
		getWsClient: () => wsClient,
	}
}
