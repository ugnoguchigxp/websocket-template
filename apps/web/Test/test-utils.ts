import { QueryClient, type QueryClientProvider } from "@tanstack/react-query"
import { render } from "@testing-library/react"
import React from "react"
import type { BrowserRouter } from "react-router-dom"
import type { NotificationProvider } from "../src/contexts/NotificationContext"
/**
 * Create a fresh QueryClient for each test to avoid state pollution
 */
export function createTestQueryClient() {
	return new QueryClient({
		defaultOptions: {
			queries: {
				retry: false,
				cacheTime: 0,
			},
			mutations: {
				retry: false,
			},
		},
		logger: {
			log: () => {},
			warn: () => {},
			error: () => {},
		},
	})
}
/**
 * Wrapper component with all necessary providers for testing
 */
export function AllTheProviders({ children }) {
	const queryClient = createTestQueryClient()
	return (
		<BrowserRouter>
			<QueryClientProvider client={queryClient}>
				<NotificationProvider>{children}</NotificationProvider>
			</QueryClientProvider>
		</BrowserRouter>
	)
}
/**
 * Custom render function that wraps components with providers
 */
export function renderWithProviders(ui, options) {
	return render(ui, { wrapper: AllTheProviders, ...options })
}
/**
 * Helper to create a mock JWT token
 */
export function createMockToken(payload = {}) {
	const header = { alg: "HS256", typ: "JWT" }
	const defaultPayload = {
		sub: "1",
		iat: Math.floor(Date.now() / 1000),
		exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7 days
		aud: "websocket-framework-api",
		iss: "websocket-framework",
		...payload,
	}
	const headerEncoded = btoa(JSON.stringify(header))
	const payloadEncoded = btoa(JSON.stringify(defaultPayload))
	const signature = "mock-signature"
	return `${headerEncoded}.${payloadEncoded}.${signature}`
}
/**
 * Helper to create an expired JWT token
 */
export function createExpiredToken() {
	return createMockToken({
		exp: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
	})
}
/**
 * Helper to create a token without audience claim
 */
export function createTokenWithoutAudience() {
	const header = { alg: "HS256", typ: "JWT" }
	const payload = {
		sub: "1",
		iat: Math.floor(Date.now() / 1000),
		exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
		// No aud claim
	}
	const headerEncoded = btoa(JSON.stringify(header))
	const payloadEncoded = btoa(JSON.stringify(payload))
	const signature = "mock-signature"
	return `${headerEncoded}.${payloadEncoded}.${signature}`
}
// Re-export everything from @testing-library/react
export * from "@testing-library/react"
export { default as userEvent } from "@testing-library/user-event"
