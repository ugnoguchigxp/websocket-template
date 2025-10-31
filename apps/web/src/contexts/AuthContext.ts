/**
 * AuthContext
 * 認証状態とログアウト機能を提供
 */
import React, { createContext, useContext } from "react"
import type { ReactNode } from "react"

interface AuthContextType {
	logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function useAuth(): AuthContextType {
	const context = useContext(AuthContext)
	if (!context) {
		throw new Error("useAuth must be used within AuthProvider")
	}
	return context
}

interface AuthProviderProps {
	children: ReactNode
	onLogout: () => void
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children, onLogout }) => {
	return React.createElement(AuthContext.Provider, { value: { logout: onLogout } }, children)
}
