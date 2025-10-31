import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import React, { useEffect, useMemo, useState } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter } from "react-router-dom"
import { App } from "./App"
import { createTrpcClientWithToken } from "./client"
import { api } from "./trpc"
import { Login } from "./ui/Login"
import "./index.css"
import "./i18n"
import { createContextLogger } from "@logger"
import { NotificationContainer } from "./components/notifications/NotificationContainer"
import { AuthProvider } from "./contexts/AuthContext"
import { NotificationProvider } from "./contexts/NotificationContext"
const log = createContextLogger("main")
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
	const [token, setToken] = useState(null)
	useEffect(() => {
		const storedToken = sessionStorage.getItem("token")
		if (storedToken) {
			// Validate token format (JWT should have 3 parts)
			const parts = storedToken.split(".")
			if (parts.length !== 3) {
				log.warn("Invalid token format detected, clearing sessionStorage")
				sessionStorage.removeItem("token")
				setToken(null)
				return
			}
			// Check token claims and expiration
			try {
				const payload = JSON.parse(atob(parts[1]))
				// Check for required claims
				if (!payload.aud) {
					log.warn("Token missing audience claim, clearing old token")
					sessionStorage.removeItem("token")
					setToken(null)
					return
				}
				// Check expiration
				if (!payload.exp) {
					log.warn("Token missing expiration claim, clearing token")
					sessionStorage.removeItem("token")
					setToken(null)
					return
				}
				// Check if token is expired (exp is in seconds, Date.now() is in milliseconds)
				const now = Date.now()
				const expirationTime = payload.exp * 1000
				if (expirationTime < now) {
					log.warn("Token expired, clearing token", {
						expiresAt: new Date(expirationTime).toISOString(),
						now: new Date(now).toISOString(),
					})
					sessionStorage.removeItem("token")
					setToken(null)
					return
				}
				log.debug("Token validated successfully", {
					expiresAt: new Date(expirationTime).toISOString(),
					userId: payload.sub,
				})
			} catch (err) {
				log.warn("Failed to parse token payload, clearing token", {
					error: err instanceof Error ? err.message : String(err),
				})
				sessionStorage.removeItem("token")
				setToken(null)
				return
			}
		}
		setToken(storedToken)
	}, [])
	const trpcClient = useMemo(() => (token ? createTrpcClientWithToken(token) : null), [token])
	log.info("AppRoot initialized", { hasToken: !!token })
	const handleLogout = () => {
		log.info("Logging out")
		sessionStorage.removeItem("token")
		setToken(null)
		// Force page reload to clear any cached state
		window.location.reload()
	}
	if (!trpcClient) {
		return (
			<BrowserRouter>
				<NotificationProvider>
					<Login
						onLoggedIn={t => {
							sessionStorage.setItem("token", t)
							setToken(t)
						}}
					/>
					<NotificationContainer />
				</NotificationProvider>
			</BrowserRouter>
		)
	}
	return (
		<BrowserRouter>
			<AuthProvider onLogout={handleLogout}>
				<NotificationProvider>
					<api.Provider client={trpcClient} queryClient={queryClient}>
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
const rootEl = document.getElementById("root")
const root = createRoot(rootEl)
root.render(<AppRoot />)
log.info("Application started")
