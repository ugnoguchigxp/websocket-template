import { createContextLogger } from "@logger"

const TOKEN_STORAGE_KEY = "oidc_access_token"

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
	expiresAt: number
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

function parseExpiresAt(value: string | number | Date | undefined): number | undefined {
	if (value === undefined) {
		return undefined
	}
	if (typeof value === "number" && Number.isFinite(value)) {
		return value
	}
	if (value instanceof Date) {
		return value.getTime()
	}
	const parsed = Date.parse(value)
	return Number.isNaN(parsed) ? undefined : parsed
}

export function validateToken(token: string, overrideExpiresAt?: number): StoredToken | null {
	const payload = decodeToken(token)
	if (!payload) {
		return null
	}

	const tokenExpMs = typeof payload.exp === "number" ? payload.exp * 1000 : undefined
	const effectiveExpiresAt = overrideExpiresAt ?? tokenExpMs

	if (typeof effectiveExpiresAt !== "number") {
		log.warn("Token missing expiration data", { hasOverride: !!overrideExpiresAt, hasExp: typeof payload.exp })
		return null
	}

	if (effectiveExpiresAt <= Date.now()) {
		log.warn("Token has expired", { expiresAt: new Date(effectiveExpiresAt).toISOString() })
		return null
	}

	if (!payload.aud) {
		log.warn("Token missing audience claim; accepting token due to fallback mode")
	}

	const payloadWithExp = {
		...payload,
		exp:
			typeof payload.exp === "number"
				? payload.exp
				: Math.floor(effectiveExpiresAt / 1000),
	} as TokenPayload & { exp: number }

	return {
		token,
		payload: payloadWithExp,
		expiresAt: effectiveExpiresAt,
	}
}

export function getStoredToken(): StoredToken | null {
	const storage = getSessionStorage()
	if (!storage) {
		return null
	}
	try {
		const raw = storage.getItem(TOKEN_STORAGE_KEY)
		if (!raw) {
			return null
		}

		let parsed: { token: string; expiresAt?: number } | null = null
		try {
			parsed = JSON.parse(raw) as { token: string; expiresAt?: number }
		} catch {
			parsed = { token: raw }
		}

		if (!parsed?.token) {
			storage.removeItem(TOKEN_STORAGE_KEY)
			return null
		}

		const validated = validateToken(parsed.token, parsed.expiresAt)
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

export function storeToken(
	token: string,
	expiresAt?: string | number | Date,
): StoredToken | null {
	const storage = getSessionStorage()
	if (!storage) {
		return null
	}
	const overrideExpiresAt = parseExpiresAt(expiresAt)
	const validated = validateToken(token, overrideExpiresAt)
	if (!validated) {
		storage.removeItem(TOKEN_STORAGE_KEY)
		return null
	}
	try {
		const payload = JSON.stringify({
			token,
			expiresAt: validated.expiresAt,
		})
		storage.setItem(TOKEN_STORAGE_KEY, payload)
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
