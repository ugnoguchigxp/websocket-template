import { createTRPCProxyClient, createWSClient, wsLink } from "@trpc/client"
import { loggerLink } from "@trpc/client/links/loggerLink"
import superjson from "superjson"
import { api } from "./trpc"
import type { AppRouter } from "../../api/src/routers/index"
import type { CreateTRPCProxyClient } from "@trpc/client"

function redact(path: string, input: any) {
	if (path === "auth.login" && input && typeof input === "object" && "username" in input) {
		const { username } = input
		return { username, password: "***" }
	}
	return input
}

export type TrpcClientConnection = {
	client: ReturnType<typeof api.createClient>
	proxyClient: CreateTRPCProxyClient<AppRouter>
	close: () => void
}

export function createTrpcClientWithToken(token: string): TrpcClientConnection {
	const protocol = location.protocol === "https:" ? "wss:" : "ws:"
	const url = `${protocol}//${location.hostname}:3001`
	const wsClient = createWSClient({
		url,
		retryDelayMs: attempt => Math.min(1000 * 2 ** attempt, 10_000),
		WebSocket: class extends WebSocket {
			constructor(url: string | URL, protocols?: string | string[]) {
				// Enforce bearer token subprotocol for authentication
				super(url, ["bearer", token])
			}
		},
		onOpen: () => {
			console.log("WebSocket connection established successfully")
		},
		onClose: (cause) => {
			console.warn("WebSocket connection closed", { cause })
		},
	})
	const client = api.createClient({
		links: [loggerLink({ enabled: () => true }), wsLink({ client: wsClient })],
		transformer: superjson,
	})
	const proxyClient = createTRPCProxyClient<AppRouter>({
		links: [loggerLink({ enabled: () => true }), wsLink({ client: wsClient })],
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
	}
}

export function createUnauthedTrpcClient() {
	const protocol = location.protocol === "https:" ? "wss:" : "ws:"
	const url = `${protocol}//${location.hostname}:3001`

	// Create a promise that resolves when connection is established
	let connectionReady: ((value: void | PromiseLike<void>) => void) | null = null
	const connectionReadyPromise = new Promise<void>((resolve) => {
		connectionReady = resolve
	})

	const wsClient = createWSClient({
		url,
		onOpen: () => {
			console.log("Unauthenticated WebSocket connection established")
			if (connectionReady) {
				connectionReady()
			}
		},
		onClose: () => {
			console.warn("Unauthenticated WebSocket connection closed")
		},
	})
	const client = api.createClient({
		transformer: superjson,
		links: [loggerLink({ enabled: () => true }), wsLink({ client: wsClient })],
	})
	const proxyClient = createTRPCProxyClient<AppRouter>({
		transformer: superjson,
		links: [loggerLink({ enabled: () => true }), wsLink({ client: wsClient })],
	})
	return {
		client,
		proxyClient,
		close: () => {
			try {
				wsClient.close()
			} catch (error) {
				console.debug("Failed to close unauthenticated WebSocket cleanly", {
					error: error instanceof Error ? error.message : String(error),
				})
			}
		},
		ready: connectionReadyPromise,
	}
}
