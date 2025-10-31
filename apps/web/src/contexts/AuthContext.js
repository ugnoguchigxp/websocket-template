/**
 * AuthContext
 * 認証状態とログアウト機能を提供
 */
import React, { createContext, useContext } from 'react';
const AuthContext = createContext(null);
export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
}
export function AuthProvider({ children, onLogout }) {
    return (<AuthContext.Provider value={{ logout: onLogout }}>
			{children}
		</AuthContext.Provider>);
}
