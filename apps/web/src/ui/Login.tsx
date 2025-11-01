import { createContextLogger } from "@logger"
import { TRPCClientError } from "@trpc/client"
import React, { useState } from "react"
import { createUnauthedTrpcClient } from "../client"
import { Button } from "../components/ui/Button"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card"
import { Input } from "../components/ui/Input"
import { Label } from "../components/ui/Label"
import { useNotificationContext } from "../contexts/NotificationContext"
const log = createContextLogger("Login")
export function Login({ onLoggedIn }) {
	const [username, setUsername] = useState("")
	const [password, setPassword] = useState("")
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState(null)
	const { showSuccess, showError } = useNotificationContext()
	const submit = async e => {
		e.preventDefault()
		log.debug("Login submit started", { username })
		setLoading(true)
		setError(null)
		const { client, proxyClient, close, ready } = createUnauthedTrpcClient()
		try {
			// Wait for WebSocket connection to be established
			log.debug("Waiting for WebSocket connection...")
			await ready
			log.debug("WebSocket connection ready, sending login request", { username })
			const res = await proxyClient.auth.login.mutate({ username, password })
			log.info("Login successful", { username })
			close()
			onLoggedIn(res.token)
			showSuccess("Signed in", `Welcome, ${username}`)
		} catch (err) {
			log.error("Login failed", err instanceof Error ? err : new Error(String(err)))
			close()
			const message = err instanceof TRPCClientError ? err.message : "Login failed"
			setError(message)
			showError("Login failed", message)
		} finally {
			setLoading(false)
		}
	}
	return (
		<div className="min-h-screen flex items-center justify-center bg-background p-4">
			<Card className="w-full max-w-sm">
				<CardHeader>
					<CardTitle>Sign in</CardTitle>
				</CardHeader>
				<CardContent>
					<form onSubmit={submit} className="space-y-4">
						<div className="space-y-1">
							<Label htmlFor="username">Username</Label>
							<Input
								id="username"
								name="username"
								autoComplete="username"
								value={username}
								onChange={e => setUsername(e.target.value)}
								data-testid="username-input"
							/>
						</div>
						<div className="space-y-1">
							<Label htmlFor="password">Password</Label>
							<Input
								id="password"
								name="password"
								type="password"
								autoComplete="current-password"
								value={password}
								onChange={e => setPassword(e.target.value)}
								data-testid="password-input"
							/>
						</div>
						<Button className="w-full" type="submit" disabled={loading} data-testid="login-button">
							{loading ? "Signing in..." : "Sign in"}
						</Button>
						{error && <p className="text-sm text-destructive">{error}</p>}
					</form>
				</CardContent>
			</Card>
		</div>
	)
}
