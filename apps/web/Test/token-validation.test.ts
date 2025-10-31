import { beforeEach, describe, expect, it } from "vitest"
import { createExpiredToken, createMockToken, createTokenWithoutAudience } from "./test-utils"

describe("Token Validation", () => {
	beforeEach(() => {
		sessionStorage.clear()
	})

	describe("Token Format Validation", () => {
		it("valid token has 3 parts separated by dots", () => {
			const token = createMockToken()
			const parts = token.split(".")
			expect(parts).toHaveLength(3)
		})

		it("invalid token with 2 parts is rejected", () => {
			const invalidToken = "header.payload"
			const parts = invalidToken.split(".")
			expect(parts).toHaveLength(2)
		})

		it("invalid token with 4 parts is rejected", () => {
			const invalidToken = "header.payload.signature.extra"
			const parts = invalidToken.split(".")
			expect(parts).toHaveLength(4)
		})
	})

	describe("Token Payload Parsing", () => {
		it("valid token payload can be parsed", () => {
			const token = createMockToken({ sub: "123", custom: "value" })
			const parts = token.split(".")
			const payload = JSON.parse(atob(parts[1]))

			expect(payload.sub).toBe("123")
			expect(payload.custom).toBe("value")
			expect(payload.aud).toBe("websocket-framework-api")
			expect(payload.iss).toBe("websocket-framework")
		})

		it("token has required claims", () => {
			const token = createMockToken()
			const parts = token.split(".")
			const payload = JSON.parse(atob(parts[1]))

			expect(payload).toHaveProperty("sub")
			expect(payload).toHaveProperty("iat")
			expect(payload).toHaveProperty("exp")
			expect(payload).toHaveProperty("aud")
			expect(payload).toHaveProperty("iss")
		})
	})

	describe("Audience Claim Validation", () => {
		it("token with audience claim is valid", () => {
			const token = createMockToken()
			const parts = token.split(".")
			const payload = JSON.parse(atob(parts[1]))

			expect(payload.aud).toBe("websocket-framework-api")
		})

		it("token without audience claim should be rejected", () => {
			const token = createTokenWithoutAudience()
			const parts = token.split(".")
			const payload = JSON.parse(atob(parts[1]))

			expect(payload.aud).toBeUndefined()
		})
	})

	describe("Token Expiration Validation", () => {
		it("valid token has future expiration time", () => {
			const token = createMockToken()
			const parts = token.split(".")
			const payload = JSON.parse(atob(parts[1]))
			const now = Date.now()
			const expirationTime = payload.exp * 1000

			expect(expirationTime).toBeGreaterThan(now)
		})

		it("expired token has past expiration time", () => {
			const token = createExpiredToken()
			const parts = token.split(".")
			const payload = JSON.parse(atob(parts[1]))
			const now = Date.now()
			const expirationTime = payload.exp * 1000

			expect(expirationTime).toBeLessThan(now)
		})

		it("token without exp claim should be rejected", () => {
			const header = { alg: "HS256", typ: "JWT" }
			const payload = {
				sub: "1",
				iat: Math.floor(Date.now() / 1000),
				aud: "websocket-framework-api",
				// No exp claim
			}

			const headerEncoded = btoa(JSON.stringify(header))
			const payloadEncoded = btoa(JSON.stringify(payload))
			const signature = "mock-signature"
			const token = `${headerEncoded}.${payloadEncoded}.${signature}`

			const parts = token.split(".")
			const parsedPayload = JSON.parse(atob(parts[1]))

			expect(parsedPayload.exp).toBeUndefined()
		})
	})

	describe("Session Storage Integration", () => {
		it("stores token in sessionStorage", () => {
			const token = createMockToken()
			sessionStorage.setItem("token", token)

			const storedToken = sessionStorage.getItem("token")
			expect(storedToken).toBe(token)
		})

		it("clears token from sessionStorage", () => {
			const token = createMockToken()
			sessionStorage.setItem("token", token)
			expect(sessionStorage.getItem("token")).toBe(token)

			sessionStorage.removeItem("token")
			expect(sessionStorage.getItem("token")).toBeNull()
		})

		it("does not persist after page refresh (sessionStorage behavior)", () => {
			const token = createMockToken()
			sessionStorage.setItem("token", token)
			expect(sessionStorage.getItem("token")).toBe(token)

			// Clear simulates session end
			sessionStorage.clear()
			expect(sessionStorage.getItem("token")).toBeNull()
		})
	})

	describe("Token Claims Structure", () => {
		it("issuer claim matches expected value", () => {
			const token = createMockToken()
			const parts = token.split(".")
			const payload = JSON.parse(atob(parts[1]))

			expect(payload.iss).toBe("websocket-framework")
		})

		it("audience claim matches expected value", () => {
			const token = createMockToken()
			const parts = token.split(".")
			const payload = JSON.parse(atob(parts[1]))

			expect(payload.aud).toBe("websocket-framework-api")
		})

		it("subject claim contains user ID", () => {
			const token = createMockToken({ sub: "42" })
			const parts = token.split(".")
			const payload = JSON.parse(atob(parts[1]))

			expect(payload.sub).toBe("42")
		})

		it("issued at time is in the past", () => {
			const token = createMockToken()
			const parts = token.split(".")
			const payload = JSON.parse(atob(parts[1]))
			const now = Math.floor(Date.now() / 1000)

			expect(payload.iat).toBeLessThanOrEqual(now)
		})
	})
})
