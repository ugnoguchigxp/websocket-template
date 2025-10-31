/**
 * AuthContext
 * 認証状態とログアウト機能を提供
 */

import React, { createContext, useContext, ReactNode } from 'react';

interface AuthContextType {
	logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
	const context = useContext(AuthContext);
	if (!context) {
		throw new Error('useAuth must be used within AuthProvider');
	}
	return context;
}

interface AuthProviderProps {
	children: ReactNode;
	onLogout: () => void;
}

export function AuthProvider({ children, onLogout }: AuthProviderProps) {
	return (
		<AuthContext.Provider value={{ logout: onLogout }}>
			{children}
		</AuthContext.Provider>
	);
}
