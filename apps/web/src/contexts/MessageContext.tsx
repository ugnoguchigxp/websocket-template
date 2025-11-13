import React, { createContext, useContext, useMemo, useState, type ReactNode } from "react"

export type ToastMessage = {
	id: string
	message: React.ReactNode
	type?: "info" | "success" | "error"
	duration?: number
}

export type MessageContextValue = {
	toasts: ToastMessage[]
	showToast: (toast: ToastMessage) => void
	removeToast: (id: string) => void
}

const MessageContext = createContext<MessageContextValue | null>(null)

export const useMessage = (): MessageContextValue => {
	const context = useContext(MessageContext)
	if (!context) {
		throw new Error("useMessage must be used within MessageProvider")
	}
	return context
}

export const MessageProvider = ({ children }: { children: ReactNode }) => {
	const [toasts, setToasts] = useState<ToastMessage[]>([])

	const showToast = React.useCallback((toast: ToastMessage) => {
		setToasts(prev => [...prev, toast].slice(-20))
	}, [])

	const removeToast = React.useCallback((id: string) => {
		setToasts(prev => prev.filter(t => t.id !== id))
	}, [])

	const value = useMemo(
		() => ({ toasts, showToast, removeToast }),
		[toasts, showToast, removeToast]
	)

	return <MessageContext.Provider value={value}>{children}</MessageContext.Provider>
}
