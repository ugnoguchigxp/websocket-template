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
	const loggingLink = loggerLink({
		enabled: ({ path }) => !!path,
		log: ({ direction, path, durationMs, input, result }) => {
			console[direction === "down" ? "info" : "debug"]("tRPC", {
				direction,
				path,
				durationMs,
				input: direction === "up" ? undefined : input,
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
	}
}
