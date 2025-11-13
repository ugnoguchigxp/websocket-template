import { createContextLogger } from "@logger"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { TRPCClientError } from "@trpc/client"
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter } from "react-router-dom"
import { App } from "./App"
import { type TrpcClientConnection, createTrpcClientWithToken } from "./client"
import ToastArea from "./components/legacy-ui/ToastArea"
import { NotificationContainer } from "./components/notifications/NotificationContainer"
import { oidcConfig } from "./config/oidc"
import { AuthProvider } from "./contexts/AuthContext"
import { MessageProvider } from "./contexts/MessageContext"
import { NotificationProvider } from "./contexts/NotificationContext"
import {
	exchangeAuthorizationCode,
	loginWithPassword,
	logoutFromServer,
	refreshAccessToken,
} from "./lib/authClient"
import { generatePkcePair, generateState } from "./lib/pkce"
import { type StoredToken, clearStoredToken, getStoredToken, storeToken } from "./lib/tokenStorage"
import "./i18n"
import "./index.css"
import { api } from "./trpc"
import { Login } from "./ui/Login"

const log = createContextLogger("main")

type AuthenticatedUser = {
	id: number
	username: string
	role: string
}

const PKCE_VERIFIER_KEY = "oidc:code_verifier"
const PKCE_STATE_KEY = "oidc:state"
const REFRESH_GRACE_PERIOD_MS = 60_000
const MIN_REFRESH_DELAY_MS = 15_000

// Check if OIDC configuration is available
const hasSsoConfig = !!(
	import.meta.env.VITE_OIDC_AUTHORIZATION_URL &&
	import.meta.env.VITE_OIDC_CLIENT_ID &&
	import.meta.env.VITE_OIDC_REDIRECT_URI
)

// Create QueryClient as a singleton outside the component
const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 5 * 60 * 1000, // 5 minutes
			refetchOnWindowFocus: false,
			refetchOnMount: true, // マウント時に再取得
			refetchOnReconnect: true, // WebSocket再接続時に再取得
		},
	},
})

function AppRoot() {
	const [tokenState, setTokenState] = useState<StoredToken | null>(() => {
		const stored = getStoredToken()
		if (stored) {
			log.debug("Restored token from storage", { userId: stored.payload.sub })
		} else {
			log.debug("No stored token found at startup")
		}
		return stored
	})
	const [user, setUser] = useState<AuthenticatedUser | null>(null)
	const [authError, setAuthError] = useState<string | null>(null)
	const [isAuthorizing, setIsAuthorizing] = useState(false)

	const refreshTimeoutRef = useRef<number | null>(null)
	const isRefreshingRef = useRef(false)
	const processingCallbackRef = useRef(false)

	const clearRefreshTimer = useCallback(() => {
		if (refreshTimeoutRef.current !== null) {
			window.clearTimeout(refreshTimeoutRef.current)
			refreshTimeoutRef.current = null
		}
	}, [])

	const clearPkceArtifacts = useCallback(() => {
		try {
			sessionStorage.removeItem(PKCE_VERIFIER_KEY)
			sessionStorage.removeItem(PKCE_STATE_KEY)
		} catch {
			// Best effort; ignore storage access errors
		}
	}, [])

	const clearSession = useCallback(() => {
		log.info("Clearing authentication session")
		clearRefreshTimer()
		clearStoredToken()
		setTokenState(null)
		setUser(null)
		setAuthError(null)
		setIsAuthorizing(false)
		queryClient.clear()
	}, [clearRefreshTimer])

	const performRefresh = useCallback(async () => {
		if (isRefreshingRef.current) {
			log.debug("Refresh already in progress; skipping additional request")
			return
		}
		isRefreshingRef.current = true
		try {
			const response = await refreshAccessToken()
			const stored = storeToken(response.accessToken, response.accessTokenExpiresAt)
			if (!stored) {
				throw new Error("Received invalid access token during refresh")
			}
			setTokenState(stored)
			if (response.user) {
				setUser(response.user)
			}
			setAuthError(null)
			log.debug("Access token refreshed successfully", {
				expiresAt: new Date(stored.expiresAt).toISOString(),
			})
		} catch (error) {
			const message = error instanceof Error ? error.message : "Unknown refresh error"
			log.warn("Failed to refresh access token", { message })
			clearSession()
		} finally {
			isRefreshingRef.current = false
		}
	}, [clearSession])

	const scheduleRefresh = useCallback(
		(stored: StoredToken) => {
			clearRefreshTimer()
			const now = Date.now()
			const refreshAt = stored.expiresAt - REFRESH_GRACE_PERIOD_MS
			const delay = Math.max(MIN_REFRESH_DELAY_MS, refreshAt - now)
			refreshTimeoutRef.current = window.setTimeout(() => {
				void performRefresh()
			}, delay)
			log.debug("Scheduled token refresh", { delayMs: delay })
		},
		[clearRefreshTimer, performRefresh]
	)

	const isInitialConnectionRef = React.useRef(true)

	const connection = useMemo<TrpcClientConnection | null>(() => {
		if (!tokenState) {
			return null
		}
		return createTrpcClientWithToken(tokenState.token, {
			onOpen: () => {
				// 初回接続時はスキップ（まだクエリが実行されていない）
				if (isInitialConnectionRef.current) {
					log.debug("Initial WebSocket connection established")
					isInitialConnectionRef.current = false
					return
				}
				// WebSocket再接続時に全てのクエリを無効化して再取得を促す
				log.info("WebSocket reconnected, invalidating queries")
				queryClient.invalidateQueries()
			},
		})
	}, [tokenState?.token])

	useEffect(() => {
		if (!connection) {
			return
		}
		return () => {
			connection.close()
		}
	}, [connection])

	useEffect(() => {
		if (!tokenState) {
			clearRefreshTimer()
			return
		}
		scheduleRefresh(tokenState)
		return () => {
			clearRefreshTimer()
		}
	}, [tokenState, scheduleRefresh, clearRefreshTimer])

	const processAuthorizationResponse = useCallback(async () => {
		if (processingCallbackRef.current) {
			return
		}

		if (tokenState) {
			return
		}

		const currentUrl = new URL(window.location.href)
		const code = currentUrl.searchParams.get("code")
		const stateParam = currentUrl.searchParams.get("state")
		const errorParam = currentUrl.searchParams.get("error")
		const errorDescription = currentUrl.searchParams.get("error_description")

		if (!code && !errorParam) {
			return
		}

		processingCallbackRef.current = true
		setIsAuthorizing(true)

		const finalizeUrl = () => {
			currentUrl.searchParams.delete("code")
			currentUrl.searchParams.delete("state")
			currentUrl.searchParams.delete("error")
			currentUrl.searchParams.delete("error_description")
			window.history.replaceState({}, document.title, currentUrl.toString())
		}

		try {
			if (errorParam) {
				const description = decodeURIComponent(errorDescription ?? errorParam)
				setAuthError(description)
				log.warn("OIDC authorization error returned", { error: errorParam, description })
				return
			}

			let storedVerifier: string | null = null
			let storedState: string | null = null
			try {
				storedVerifier = sessionStorage.getItem(PKCE_VERIFIER_KEY)
				storedState = sessionStorage.getItem(PKCE_STATE_KEY)
			} catch (error) {
				log.warn("Unable to access PKCE data in sessionStorage", {
					error: error instanceof Error ? error.message : String(error),
				})
			}

			if (!storedVerifier || !storedState || storedState !== stateParam) {
				setAuthError("Invalid or expired login session. Please try again.")
				log.warn("State or verifier mismatch during authorization callback", {
					hasVerifier: !!storedVerifier,
					hasState: !!storedState,
					stateParam,
				})
				clearSession()
				return
			}

			const response = await exchangeAuthorizationCode({
				code,
				codeVerifier: storedVerifier,
				state: stateParam,
				redirectUri: oidcConfig.redirectUri,
			})

			const stored = storeToken(response.accessToken, response.accessTokenExpiresAt)
			if (!stored) {
				throw new Error("Received invalid access token from server")
			}

			setTokenState(stored)
			setUser(response.user ?? null)
			setAuthError(null)
			log.info("Authorization code exchange completed", {
				expiresAt: new Date(stored.expiresAt).toISOString(),
			})
		} catch (error) {
			const message = error instanceof Error ? error.message : "Failed to complete login"
			setAuthError(message)
			log.error("Authorization response processing failed", { message })
			clearSession()
		} finally {
			clearPkceArtifacts()
			finalizeUrl()
			setIsAuthorizing(false)
			processingCallbackRef.current = false
		}
	}, [tokenState, clearSession, clearPkceArtifacts])

	useEffect(() => {
		void processAuthorizationResponse()
	}, [processAuthorizationResponse])

	useEffect(() => {
		if (!connection || user) {
			return
		}
		let cancelled = false
		const fetchUser = async () => {
			try {
				const userData = await connection.proxyClient.auth.me.query()
				if (cancelled) {
					return
				}
				setUser(userData)
				log.info("User data fetched", { username: userData.username, role: userData.role })
			} catch (error) {
				if (cancelled) {
					return
				}
				if (error instanceof TRPCClientError) {
					if (error.data?.code === "UNAUTHORIZED") {
						log.warn("Token rejected by server, clearing session")
						clearSession()
						return
					}
					const message = error.message.toLowerCase()
					const connectionIndicators = [
						"websocket closed",
						"websocket connection failed",
						"retrying in",
						"network error",
					]
					const isConnectionIssue = connectionIndicators.some(indicator =>
						message.includes(indicator)
					)
					if (!isConnectionIssue) {
						log.warn("auth.me responded with application error; clearing session", {
							message: error.message,
							code: error.data?.code,
						})
						clearSession()
						return
					}
				}
				log.error("Failed to fetch user data", error)
			}
		}
		fetchUser()
		return () => {
			cancelled = true
		}
	}, [connection, clearSession, user])

	const startOidcLogin = useCallback(async () => {
		if (!hasSsoConfig) {
			setAuthError("SSO is not configured")
			return
		}
		try {
			setAuthError(null)
			setIsAuthorizing(true)
			const { codeVerifier, codeChallenge } = await generatePkcePair()
			const state = generateState()

			sessionStorage.setItem(PKCE_VERIFIER_KEY, codeVerifier)
			sessionStorage.setItem(PKCE_STATE_KEY, state)

			const authorizationUrl = new URL(oidcConfig.authorizationEndpoint)
			authorizationUrl.searchParams.set("response_type", "code")
			authorizationUrl.searchParams.set("client_id", oidcConfig.clientId)
			authorizationUrl.searchParams.set("redirect_uri", oidcConfig.redirectUri)
			authorizationUrl.searchParams.set("scope", oidcConfig.scope)
			authorizationUrl.searchParams.set("code_challenge", codeChallenge)
			authorizationUrl.searchParams.set("code_challenge_method", "S256")
			authorizationUrl.searchParams.set("state", state)
			if (oidcConfig.audience) {
				authorizationUrl.searchParams.set("audience", oidcConfig.audience)
			}

			log.info("Redirecting to OIDC authorization endpoint", {
				url: authorizationUrl.origin,
			})
			window.location.assign(authorizationUrl.toString())
		} catch (error) {
			const message = error instanceof Error ? error.message : "Unable to start sign-in"
			log.error("Failed to initiate authorization request", { message })
			setAuthError(message)
			setIsAuthorizing(false)
		}
	}, [])

	const handleLocalLogin = useCallback(async (username: string, password: string) => {
		try {
			setAuthError(null)
			setIsAuthorizing(true)
			const response = await loginWithPassword({ username, password })
			const stored = storeToken(response.accessToken, response.accessTokenExpiresAt)
			if (!stored) {
				throw new Error("Received invalid access token from server")
			}
			setTokenState(stored)
			setUser(response.user ?? null)
			setAuthError(null)
			log.info("Local login completed", {
				username,
				expiresAt: new Date(stored.expiresAt).toISOString(),
			})
		} catch (error) {
			const message = error instanceof Error ? error.message : "Failed to login"
			log.error("Local login failed", { message })
			setAuthError(message)
		} finally {
			setIsAuthorizing(false)
		}
	}, [])

	const handleLogout = useCallback(async () => {
		log.info("Logging out")
		try {
			await logoutFromServer()
		} catch (error) {
			const message = error instanceof Error ? error.message : "Unknown logout error"
			log.warn("Server logout request failed", { message })
		} finally {
			clearSession()
		}
	}, [clearSession])

	log.info("AppRoot initialized", { hasToken: !!tokenState, hasSsoConfig })

	if (!connection && tokenState) {
		return (
			<MessageProvider>
				<BrowserRouter>
					<div className="flex items-center justify-center min-h-screen">
						<div className="text-center">
							<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4" />
							<p>Connecting...</p>
						</div>
					</div>
					<ToastArea />
				</BrowserRouter>
			</MessageProvider>
		)
	}

	if (!connection) {
		return (
			<MessageProvider>
				<BrowserRouter>
					<NotificationProvider>
						<Login
							onLocalLogin={handleLocalLogin}
							onSsoLogin={startOidcLogin}
							isProcessing={isAuthorizing}
							errorMessage={authError}
							hasSsoConfig={hasSsoConfig}
						/>
						<NotificationContainer />
					</NotificationProvider>
					<ToastArea />
				</BrowserRouter>
			</MessageProvider>
		)
	}

	return (
		<MessageProvider>
			<BrowserRouter>
				<AuthProvider onLogout={handleLogout} user={user}>
					<NotificationProvider>
						<QueryClientProvider client={queryClient}>
							<api.Provider client={connection.client} queryClient={queryClient}>
								<App />
							</api.Provider>
						</QueryClientProvider>
						<NotificationContainer />
					</NotificationProvider>
				</AuthProvider>
				<ToastArea />
			</BrowserRouter>
		</MessageProvider>
	)
}

const rootEl = document.getElementById("root")!
const root = createRoot(rootEl)
root.render(<AppRoot />)

log.info("Application started")
