import { createContextLogger } from "@logger"

const TOKEN_STORAGE_KEY = "token"

const log = createContextLogger("tokenStorage")

type TokenPayload = {
	exp?: number
	aud?: string
	sub?: string
	[key: string]: unknown
}

export type StoredToken = {
	token: string
	payload: TokenPayload & { exp: number }
}

const isBrowser = typeof window !== "undefined"

function getSessionStorage(): Storage | null {
	if (!isBrowser) {
		return null
	}
	try {
		return window.sessionStorage
	} catch (error) {
		log.warn("Unable to access sessionStorage", {
			error: error instanceof Error ? error.message : String(error),
		})
		return null
	}
}

export function decodeToken(token: string): TokenPayload | null {
	const parts = token.split(".")
	if (parts.length !== 3) {
		log.warn("Invalid token format detected during decode", { parts: parts.length })
		return null
	}
	try {
		const payloadJson = atob(parts[1])
		const payload = JSON.parse(payloadJson)
		return typeof payload === "object" && payload !== null ? (payload as TokenPayload) : null
	} catch (error) {
		log.warn("Failed to decode token payload", {
			error: error instanceof Error ? error.message : String(error),
		})
		return null
	}
}

export function validateToken(token: string): StoredToken | null {
	const payload = decodeToken(token)
	if (!payload) {
		return null
	}

	if (typeof payload.exp !== "number") {
		log.warn("Token missing expiration claim", { hasExp: typeof payload.exp })
		return null
	}

	if (payload.exp * 1000 <= Date.now()) {
		log.warn("Token has expired", { expiresAt: new Date(payload.exp * 1000).toISOString() })
		return null
	}

	if (!payload.aud) {
		log.warn("Token missing audience claim; accepting token due to fallback mode")
	}

	return { token, payload: payload as TokenPayload & { exp: number } }
}

export function getStoredToken(): StoredToken | null {
	const storage = getSessionStorage()
	if (!storage) {
		return null
	}
	try {
		const rawToken = storage.getItem(TOKEN_STORAGE_KEY)
		if (!rawToken) {
			return null
		}
		const validated = validateToken(rawToken)
		if (!validated) {
			storage.removeItem(TOKEN_STORAGE_KEY)
		}
		return validated
	} catch (error) {
		log.warn("Failed to read token from storage", {
			error: error instanceof Error ? error.message : String(error),
		})
		return null
	}
}

export function storeToken(token: string): StoredToken | null {
	const storage = getSessionStorage()
	if (!storage) {
		return null
	}
	const validated = validateToken(token)
	if (!validated) {
		storage.removeItem(TOKEN_STORAGE_KEY)
		return null
	}
	try {
		storage.setItem(TOKEN_STORAGE_KEY, token)
		return validated
	} catch (error) {
		log.warn("Failed to store token", {
			error: error instanceof Error ? error.message : String(error),
		})
		return null
	}
}

export function clearStoredToken() {
	const storage = getSessionStorage()
	if (!storage) {
		return
	}
	try {
		storage.removeItem(TOKEN_STORAGE_KEY)
	} catch (error) {
		log.warn("Failed to clear token from storage", {
			error: error instanceof Error ? error.message : String(error),
		})
	}
}

export function hasStoredToken() {
	return getStoredToken() !== null
}
