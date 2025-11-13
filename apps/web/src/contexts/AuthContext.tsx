/**
 * AuthContext
 * 認証状態とログアウト機能を提供
 */

import { getStoredToken } from "@lib/tokenStorage"
import React, { createContext, useContext, type ReactNode } from "react"

interface User {
	id: number
	username: string
	role: string
}

interface AuthContextType {
	logout: () => void
	user: User | null
	isAdmin: boolean
	isAuthenticated: boolean
	getAccessToken: () => string | null
}

const AuthContext = createContext<AuthContextType | null>(null)

export function useAuth() {
	const context = useContext(AuthContext)
	if (!context) {
		throw new Error("useAuth must be used within AuthProvider")
	}
	return context
}

interface AuthProviderProps {
	children: ReactNode
	onLogout: () => void
	user: User | null
}

export function AuthProvider({ children, onLogout, user }: AuthProviderProps) {
	const isAdmin = user?.role === "ADMIN"
	const isAuthenticated = !!user

	const contextValue = {
		logout: onLogout,
		user: user,
		isAdmin: isAdmin,
		isAuthenticated: isAuthenticated,
		getAccessToken: () => getStoredToken()?.token ?? null,
	}

	return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
}
