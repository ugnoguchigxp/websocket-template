import { createTRPCProxyClient, createWSClient, wsLink } from "@trpc/client"
import { loggerLink } from "@trpc/client/links/loggerLink"
import superjson from "superjson"
import { api } from "./trpc"
function redact(path, input) {
	if (path === "auth.login" && input && typeof input === "object" && "username" in input) {
		const { username } = input
		return { username, password: "***" }
	}
	return input
}
// Track reconnection attempts to prevent infinite loops
let reconnectAttempts = 0
const MAX_RECONNECT_ATTEMPTS = 3
const RECONNECT_DELAY = 2000

export function createTrpcClientWithToken(token) {
	const protocol = location.protocol === "https:" ? "wss:" : "ws:"
	const url = `${protocol}//${location.hostname}:3001`
	const wsClient = createWSClient({
		url,
		WebSocket: class extends WebSocket {
			constructor(url) {
				super(url, ["bearer", token])
			}
		},
		onOpen: () => {
			console.log("WebSocket connection established successfully")
			// Reset reconnection counter on successful connection
			reconnectAttempts = 0
		},
		onClose: (cause) => {
			console.warn("WebSocket connection closed", { cause })

			// Check if this is an authentication failure (close code 1008 = policy violation)
			// or if we've exceeded max reconnection attempts
			if (cause?.code === 1008 || reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
				console.error("Authentication failed or max reconnection attempts reached. Clearing token and redirecting to login.")
				// Clear the invalid token
				sessionStorage.removeItem("token")
				// Reload the page to show login screen
				window.location.reload()
				return
			}

			// Increment reconnection counter
			reconnectAttempts++
			console.warn(`Attempting to reconnect (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`)

			// Attempt to reconnect after delay
			setTimeout(() => {
				window.location.reload()
			}, RECONNECT_DELAY)
		},
		onError: (err) => {
			console.error("WebSocket connection error:", err)
		},
	})
	return api.createClient({
		transformer: superjson,
		links: [loggerLink({ enabled: () => true }), wsLink({ client: wsClient })],
	})
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
		onError: (err) => {
			console.error("Unauthenticated WebSocket connection error:", err)
		},
	})
	const client = createTRPCProxyClient({
		transformer: superjson,
		links: [loggerLink({ enabled: () => true }), wsLink({ client: wsClient })],
	})
	return {
		client,
		close: () => wsClient.close(),
		ready: connectionReadyPromise,
	}
}
