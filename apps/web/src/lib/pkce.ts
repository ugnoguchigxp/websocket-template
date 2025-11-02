import { createContextLogger } from "@logger"

const log = createContextLogger("pkce")

function ensureCrypto(): Crypto {
	if (typeof globalThis !== "undefined" && globalThis.crypto && globalThis.crypto.getRandomValues) {
		return globalThis.crypto
	}
	throw new Error("Web Crypto API is not available; PKCE cannot be generated")
}

function base64UrlEncode(buffer: ArrayBuffer): string {
	const bytes = new Uint8Array(buffer)
	let binary = ""
	for (const byte of bytes) {
		binary += String.fromCharCode(byte)
	}
	return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

function randomString(length: number): string {
	const crypto = ensureCrypto()
	const array = new Uint8Array(length)
	crypto.getRandomValues(array)
	return Array.from(array, (byte) => ("0" + byte.toString(16)).slice(-2)).join("")
}

export async function generatePkcePair(): Promise<{ codeVerifier: string; codeChallenge: string }> {
	const crypto = ensureCrypto()
	const randomBytes = crypto.getRandomValues(new Uint8Array(64))
	const codeVerifier = base64UrlEncode(randomBytes.buffer)
	const data = new TextEncoder().encode(codeVerifier)
	const digest = await crypto.subtle.digest("SHA-256", data)
	const codeChallenge = base64UrlEncode(digest)
	log.debug("Generated PKCE pair", { hasVerifier: !!codeVerifier, hasChallenge: !!codeChallenge })
	return { codeVerifier, codeChallenge }
}

export function generateState(length = 32): string {
	return randomString(length)
}
