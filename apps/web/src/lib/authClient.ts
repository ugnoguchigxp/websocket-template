import { createContextLogger } from "@logger"
import { createTRPCProxyClient, createWSClient, wsLink } from "@trpc/client"
import superjson from "superjson"
import type { AppRouter } from "../../../api/src/routers/index"

const log = createContextLogger("authClient")

export type AuthUserResponse = {
	id: number
	username: string
	role: string
	email: string | null
	displayName: string | null
	sub: string
	preferredUsername: string | null
	name: string | null
	roles: string[]
}

export type ExchangeResponse = {
	accessToken: string
	accessTokenExpiresAt: string
	scope?: string | null
	refreshSessionId?: string
	refreshToken?: string
	refreshTokenExpiresAt?: string | null
	user?: AuthUserResponse
}

type AuthTrpcClient = ReturnType<typeof createTRPCProxyClient<AppRouter>>

function createWsUrl(token?: string): string {
	const protocol = location.protocol === "https:" ? "wss:" : "ws:"
	const url = new URL(`${protocol}//${location.hostname}:3000`)
	if (token) {
		url.searchParams.set("authorization", `Bearer ${token}`)
	}
	return url.toString()
}

function createAuthTrpcClient(token?: string) {
	const wsClient = createWSClient({
		url: createWsUrl(token),
		retryDelayMs: attempt => Math.min(1000 * 2 ** attempt, 10_000),
		WebSocket:
			token === undefined
				? WebSocket
				: class extends WebSocket {
						constructor(url: string | URL) {
							const urlObj = new URL(url.toString())
							urlObj.searchParams.set("authorization", `Bearer ${token}`)
							super(urlObj.toString())
						}
					},
	})

	const proxyClient = createTRPCProxyClient<AppRouter>({
		links: [wsLink({ client: wsClient })],
		transformer: superjson,
	})

	return {
		client: proxyClient,
		close: () => {
			try {
				wsClient.close()
			} catch (error) {
				log.warn("Failed to close auth WebSocket client cleanly", {
					error: error instanceof Error ? error.message : String(error),
				})
			}
		},
	}
}

async function parseJson<T>(response: Response): Promise<T> {
	const text = await response.text()
	try {
		return JSON.parse(text) as T
	} catch (error) {
		log.error("Failed to parse JSON response", {
			status: response.status,
			body: text,
			error: error instanceof Error ? error.message : String(error),
		})
		throw new Error("Invalid response from server")
	}
}

async function withAuthTrpcClient<T>(
	task: (client: AuthTrpcClient) => Promise<T>,
	options?: { token?: string }
): Promise<T> {
	const connection = createAuthTrpcClient(options?.token)
	try {
		return await task(connection.client)
	} finally {
		connection.close()
	}
}

async function establishRefreshSession(sessionId?: string, refreshToken?: string) {
	if (!sessionId || !refreshToken) {
		return
	}

	const response = await fetch("/auth/session", {
		method: "POST",
		credentials: "include",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({ sessionId, refreshToken }),
	})

	if (!(response.status === 204 || response.ok)) {
		const body = await response.text().catch(() => "")
		log.warn("Failed to establish refresh session cookie", {
			status: response.status,
			body,
		})
		throw new Error("Failed to establish login session")
	}
}

export async function loginWithPassword(params: {
	username: string
	password: string
}): Promise<ExchangeResponse> {
	const response = await withAuthTrpcClient(client =>
		client.auth.login.mutate({
			username: params.username,
			password: params.password,
			ipAddress: undefined,
		})
	)

	await establishRefreshSession(response.refreshSessionId, response.refreshToken)
	return response
}

export async function exchangeAuthorizationCode(params: {
	code: string
	codeVerifier: string
	state?: string | null
	redirectUri: string
}): Promise<ExchangeResponse> {
	const response = await fetch("/auth/exchange", {
		method: "POST",
		credentials: "include",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			code: params.code,
			codeVerifier: params.codeVerifier,
			state: params.state,
			redirectUri: params.redirectUri,
		}),
	})

	if (!response.ok) {
		const details = await response.text()
		log.warn("Authorization code exchange failed", {
			status: response.status,
			body: details,
		})
		throw new Error("Failed to exchange authorization code")
	}

	return parseJson<ExchangeResponse>(response)
}

export async function refreshAccessToken(): Promise<ExchangeResponse> {
	const response = await fetch("/auth/refresh", {
		method: "POST",
		credentials: "include",
		headers: {
			"Content-Type": "application/json",
		},
	})

	if (!response.ok) {
		const details = await response.text()
		log.warn("Access token refresh failed", { status: response.status, body: details })
		throw new Error("Failed to refresh access token")
	}

	return parseJson<ExchangeResponse>(response)
}

export async function logoutFromServer(): Promise<void> {
	const response = await fetch("/auth/logout", {
		method: "POST",
		credentials: "include",
	})

	if (!response.ok && response.status !== 204) {
		const body = await response.text().catch(() => "")
		log.warn("Server logout returned non-success status", {
			status: response.status,
			body,
		})
		throw new Error("Failed to log out")
	}
}
