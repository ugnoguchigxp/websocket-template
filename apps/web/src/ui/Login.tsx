import React, { useState } from "react"
import { Button } from "../components/ui/Button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/Card"
import { Input } from "../components/ui/Input"
import { Label } from "../components/ui/Label"
import { useNotificationContext } from "../contexts/NotificationContext"

type LoginProps = {
	onLocalLogin: (username: string, password: string) => Promise<void> | void
	onSsoLogin: () => Promise<void> | void
	isProcessing?: boolean
	errorMessage?: string | null
	hasSsoConfig?: boolean
}

export function Login({ onLocalLogin, onSsoLogin, isProcessing = false, errorMessage, hasSsoConfig = false }: LoginProps) {
	const { showError } = useNotificationContext()
	const [username, setUsername] = useState("")
	const [password, setPassword] = useState("")
	const [loginMethod, setLoginMethod] = useState<"local" | "sso">("local")

	const handleLocalLogin = async (e: React.FormEvent) => {
		e.preventDefault()
		if (!username || !password) {
			showError("Validation error", "Please enter both username and password")
			return
		}
		try {
			await onLocalLogin(username, password)
		} catch (error) {
			const message = error instanceof Error ? error.message : "Failed to login"
			showError("Sign-in failed", message)
		}
	}

	const handleSsoLogin = async () => {
		try {
			await onSsoLogin()
		} catch (error) {
			const message = error instanceof Error ? error.message : "Failed to start SSO flow"
			showError("Sign-in failed", message)
		}
	}

	return (
		<div className="flex min-h-screen items-center justify-center bg-background p-4">
			<Card className="w-full max-w-md">
				<CardHeader>
					<CardTitle>Sign in</CardTitle>
					<CardDescription>
						{loginMethod === "local" 
							? "Enter your username and password to continue."
							: "Authenticate with your identity provider to continue."
						}
					</CardDescription>
				</CardHeader>
				<CardContent>
					{hasSsoConfig && (
						<div className="flex gap-2 mb-4 border-b pb-4">
							<Button
								variant={loginMethod === "local" ? "default" : "outline"}
								size="sm"
								onClick={() => setLoginMethod("local")}
								type="button"
								className="flex-1"
							>
								Local Login
							</Button>
							<Button
								variant={loginMethod === "sso" ? "default" : "outline"}
								size="sm"
								onClick={() => setLoginMethod("sso")}
								type="button"
								className="flex-1"
							>
								SSO Login
							</Button>
						</div>
					)}

					{loginMethod === "local" ? (
						<form onSubmit={handleLocalLogin} className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="username">Username</Label>
								<Input
									id="username"
									type="text"
									placeholder="Enter your username"
									value={username}
									onChange={(e) => setUsername(e.target.value)}
									disabled={isProcessing}
									autoComplete="username"
									required
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="password">Password</Label>
								<Input
									id="password"
									type="password"
									placeholder="Enter your password"
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									disabled={isProcessing}
									autoComplete="current-password"
									required
								/>
							</div>
							<Button
								className="w-full"
								type="submit"
								disabled={isProcessing}
								data-testid="login-button"
							>
								{isProcessing ? "Signing in..." : "Sign in"}
							</Button>
						</form>
					) : (
						<div className="space-y-4">
							<div className="space-y-1">
								<Label>OIDC Provider</Label>
								<p className="text-sm text-muted-foreground">
									You will be redirected to the identity provider. After completing authentication you
									will return here automatically.
								</p>
							</div>
							<Button
								className="w-full"
								type="button"
								disabled={isProcessing}
								data-testid="sso-login-button"
								onClick={handleSsoLogin}
							>
								{isProcessing ? "Redirecting..." : "Continue with Single Sign-On"}
							</Button>
						</div>
					)}
					{errorMessage && <p className="text-sm text-destructive mt-4">{errorMessage}</p>}
				</CardContent>
			</Card>
		</div>
	)
}
