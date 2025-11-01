import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { TRPCClientError } from "@trpc/client"
import React, { useCallback, useEffect, useMemo, useState } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter } from "react-router-dom"
import { createContextLogger } from "@logger"
import { App } from "./App"
import { createTrpcClientWithToken, type TrpcClientConnection } from "./client"
import { NotificationContainer } from "./components/notifications/NotificationContainer"
import { AuthProvider } from "./contexts/AuthContext"
import { NotificationProvider } from "./contexts/NotificationContext"
import { clearStoredToken, getStoredToken, storeToken, type StoredToken } from "./lib/tokenStorage"
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

// Create QueryClient as a singleton outside the component
const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 5 * 60 * 1000, // 5 minutes
			refetchOnWindowFocus: false,
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

	const connection = useMemo<TrpcClientConnection | null>(() => {
		if (!tokenState) {
			return null
		}
		return createTrpcClientWithToken(tokenState.token)
	}, [tokenState?.token])

	useEffect(() => {
		if (!connection) {
			return
		}
		return () => {
			connection.close()
		}
	}, [connection])

	const clearSession = useCallback(() => {
		log.info("Clearing authentication session")
		clearStoredToken()
		setTokenState(null)
		setUser(null)
		queryClient.clear()
	}, [])

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
					const isConnectionIssue = connectionIndicators.some(indicator => message.includes(indicator))
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

	const handleLoginSuccess = useCallback(
		(newToken: string) => {
			const stored = storeToken(newToken)
			if (!stored) {
				log.warn("Received invalid token after login, clearing session")
				clearSession()
				return
			}
			setTokenState(stored)
			setUser(null)
		},
		[clearSession],
	)

	const handleLogout = useCallback(() => {
		log.info("Logging out")
		clearSession()
	}, [clearSession])

	log.info("AppRoot initialized", { hasToken: !!tokenState })

	if (!connection) {
		return (
			<BrowserRouter>
				<NotificationProvider>
					<Login onLoggedIn={handleLoginSuccess} />
					<NotificationContainer />
				</NotificationProvider>
			</BrowserRouter>
		)
	}

	return (
		<BrowserRouter>
			<AuthProvider onLogout={handleLogout} user={user}>
				<NotificationProvider>
					<api.Provider client={connection.client} queryClient={queryClient}>
						<QueryClientProvider client={queryClient}>
							<App />
						</QueryClientProvider>
					</api.Provider>
					<NotificationContainer />
				</NotificationProvider>
			</AuthProvider>
		</BrowserRouter>
	)
}

const rootEl = document.getElementById("root")!
const root = createRoot(rootEl)
root.render(<AppRoot />)

log.info("Application started")
