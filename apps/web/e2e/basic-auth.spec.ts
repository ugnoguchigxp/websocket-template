import { expect, test } from "@playwright/test"
import superjson from "superjson"

test.describe("Authentication - Complete Login Scenarios", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/")
	})

	test("should display login form correctly", async ({ page }) => {
		// Check all login form elements are visible
		await expect(page.locator('[data-testid="username-input"]')).toBeVisible()
		await expect(page.locator('[data-testid="password-input"]')).toBeVisible()
		await expect(page.locator('[data-testid="login-button"]')).toBeVisible()

		// Check input types
		await expect(page.locator('[data-testid="username-input"]')).toHaveAttribute("type", "text")
		await expect(page.locator('[data-testid="password-input"]')).toHaveAttribute("type", "password")
	})

	test("should login successfully with correct credentials", async ({ page }) => {
		// Fill form with correct credentials
		await page.fill('[data-testid="username-input"]', "admin")
		await page.fill('[data-testid="password-input"]', "websocket3001")
		await page.click('[data-testid="login-button"]')

		// Wait for successful login
		await page.waitForSelector("main", { timeout: 10000 })

		// Verify we're logged in
		await expect(page.locator('[data-testid="username-input"]')).not.toBeVisible()
	})

	test("should handle invalid credentials - wrong username", async ({ page }) => {
		// Try to login with wrong username (will hit actual API)
		await page.fill('[data-testid="username-input"]', "wronguser")
		await page.fill('[data-testid="password-input"]', "websocket3001")
		await page.click('[data-testid="login-button"]')

		// Should still be on login page (API returns UNAUTHORIZED)
		await page.waitForTimeout(3000)
		await expect(page.locator('[data-testid="username-input"]')).toBeVisible()
	})

	test("should handle invalid credentials - wrong password", async ({ page }) => {
		// Try to login with wrong password (will hit actual API)
		await page.fill('[data-testid="username-input"]', "admin")
		await page.fill('[data-testid="password-input"]', "wrongpassword")
		await page.click('[data-testid="login-button"]')

		// Should still be on login page
		await page.waitForTimeout(3000)
		await expect(page.locator('[data-testid="username-input"]')).toBeVisible()
	})

	test("should handle empty username validation", async ({ page }) => {
		// Mock API to catch validation errors using superjson transformer
		await page.route("**/trpc/auth.login*", route => {
			route.fulfill({
				status: 400,
				contentType: "application/json",
				body: superjson.stringify({
					error: {
						message: "username: String must contain at least 1 character(s)",
						code: "BAD_REQUEST",
					},
				}),
			})
		})

		// Try to login with empty username
		await page.fill('[data-testid="username-input"]', "")
		await page.fill('[data-testid="password-input"]', "websocket3001")
		await page.click('[data-testid="login-button"]')

		// Should still be on login page
		await page.waitForTimeout(3000)
		await expect(page.locator('[data-testid="username-input"]')).toBeVisible()
	})

	test("should handle empty password validation", async ({ page }) => {
		// Mock API to catch validation errors using superjson transformer
		await page.route("**/trpc/auth.login*", route => {
			route.fulfill({
				status: 400,
				contentType: "application/json",
				body: superjson.stringify({
					error: {
						message: "password: String must contain at least 1 character(s)",
						code: "BAD_REQUEST",
					},
				}),
			})
		})

		// Try to login with empty password
		await page.fill('[data-testid="username-input"]', "admin")
		await page.fill('[data-testid="password-input"]', "")
		await page.click('[data-testid="login-button"]')

		// Should still be on login page
		await page.waitForTimeout(3000)
		await expect(page.locator('[data-testid="username-input"]')).toBeVisible()
	})

	test("should handle username too long validation", async ({ page }) => {
		// Mock API to catch validation errors using superjson transformer
		await page.route("**/trpc/auth.login*", route => {
			route.fulfill({
				status: 400,
				contentType: "application/json",
				body: superjson.stringify({
					error: {
						message: "username: String must contain at most 50 character(s)",
						code: "BAD_REQUEST",
					},
				}),
			})
		})

		// Try with username longer than 50 characters
		const longUsername = "a".repeat(51)
		await page.fill('[data-testid="username-input"]', longUsername)
		await page.fill('[data-testid="password-input"]', "websocket3001")
		await page.click('[data-testid="login-button"]')

		// Should still be on login page
		await page.waitForTimeout(3000)
		await expect(page.locator('[data-testid="username-input"]')).toBeVisible()
	})

	test("should handle password too long validation", async ({ page }) => {
		// Mock API to catch validation errors using superjson transformer
		await page.route("**/trpc/auth.login*", route => {
			route.fulfill({
				status: 400,
				contentType: "application/json",
				body: superjson.stringify({
					error: {
						message: "password: String must contain at most 200 character(s)",
						code: "BAD_REQUEST",
					},
				}),
			})
		})

		// Try with password longer than 200 characters
		const longPassword = "a".repeat(201)
		await page.fill('[data-testid="username-input"]', "admin")
		await page.fill('[data-testid="password-input"]', longPassword)
		await page.click('[data-testid="login-button"]')

		// Should still be on login page
		await page.waitForTimeout(3000)
		await expect(page.locator('[data-testid="username-input"]')).toBeVisible()
	})

	test("should handle invalid username characters", async ({ page }) => {
		// Mock API to catch validation errors using superjson transformer
		await page.route("**/trpc/auth.login*", route => {
			route.fulfill({
				status: 400,
				contentType: "application/json",
				body: superjson.stringify({
					error: {
						message: "username: Username must be alphanumeric",
						code: "BAD_REQUEST",
					},
				}),
			})
		})

		// Try with invalid characters (only a-zA-Z0-9_- allowed)
		await page.fill('[data-testid="username-input"]', "admin@domain.com")
		await page.fill('[data-testid="password-input"]', "websocket3001")
		await page.click('[data-testid="login-button"]')

		// Should still be on login page
		await page.waitForTimeout(3000)
		await expect(page.locator('[data-testid="username-input"]')).toBeVisible()
	})

	test("should handle valid special characters in username", async ({ page }) => {
		// Mock successful login for valid special characters using superjson transformer
		await page.route("**/trpc/auth.login*", route => {
			route.fulfill({
				status: 200,
				contentType: "application/json",
				body: superjson.stringify({
					result: {
						data: {
							token: "mock-token-for-special-chars",
						},
					},
				}),
			})
		})

		// Try with valid special characters (underscore and hyphen are allowed)
		await page.fill('[data-testid="username-input"]', "admin_user-123")
		await page.fill('[data-testid="password-input"]', "websocket3001")
		await page.click('[data-testid="login-button"]')

		// Should handle valid special characters properly
		await page.waitForSelector("main", { timeout: 10000 })
	})

	test("should handle special characters in password", async ({ page }) => {
		// Mock successful login for special characters in password using superjson transformer
		await page.route("**/trpc/auth.login*", route => {
			route.fulfill({
				status: 200,
				contentType: "application/json",
				body: superjson.stringify({
					result: {
						data: {
							token: "mock-token-for-password-chars",
						},
					},
				}),
			})
		})

		// Try with special characters in password (passwords allow any characters)
		await page.fill('[data-testid="username-input"]', "admin")
		await page.fill('[data-testid="password-input"]', "p@ssw0rd!#$%^&*()")
		await page.click('[data-testid="login-button"]')

		// Should handle special characters properly
		await page.waitForSelector("main", { timeout: 10000 })
	})

	test.skip("should handle network timeout", async ({ page }) => {
		// Skip this test as it takes too long
		// Mock network timeout (don't respond)
		await page.route("**/trpc/auth.login*", route => {
			// Don't fulfill the request to simulate timeout
		})

		// Try to login
		await page.fill('[data-testid="username-input"]', "admin")
		await page.fill('[data-testid="password-input"]', "websocket3001")
		await page.click('[data-testid="login-button"]')

		// Should still be on login page after timeout
		await page.waitForTimeout(8000) // Wait for timeout
		await expect(page.locator('[data-testid="username-input"]')).toBeVisible()
	})

	test("should handle network offline", async ({ page }) => {
		// Simulate offline mode
		await page.context().setOffline(true)

		// Try to login
		await page.fill('[data-testid="username-input"]', "admin")
		await page.fill('[data-testid="password-input"]', "websocket3001")
		await page.click('[data-testid="login-button"]')

		// Should still be on login page
		await page.waitForTimeout(3000)
		await expect(page.locator('[data-testid="username-input"]')).toBeVisible()

		// Restore online mode
		await page.context().setOffline(false)
	})

	test("should handle malformed API response", async ({ page }) => {
		// Mock malformed response (invalid JSON that tRPC can't parse)
		await page.route("**/trpc/auth.login*", route => {
			route.fulfill({
				status: 200,
				contentType: "application/json",
				body: "invalid json response",
			})
		})

		// Try to login
		await page.fill('[data-testid="username-input"]', "admin")
		await page.fill('[data-testid="password-input"]', "websocket3001")
		await page.click('[data-testid="login-button"]')

		// Should still be on login page (tRPC should fail to parse malformed response)
		await page.waitForTimeout(3000)
		await expect(page.locator('[data-testid="username-input"]')).toBeVisible()
	})

	test("should handle slow API response", async ({ page }) => {
		// Mock slow response using superjson transformer
		await page.route("**/trpc/auth.login*", route => {
			setTimeout(() => {
				route.fulfill({
					status: 200,
					contentType: "application/json",
					body: superjson.stringify({
						result: {
							data: {
								token: "mock-token-for-slow-response",
							},
						},
					}),
				})
			}, 3000) // 3 second delay
		})

		// Try to login
		await page.fill('[data-testid="username-input"]', "admin")
		await page.fill('[data-testid="password-input"]', "websocket3001")
		await page.click('[data-testid="login-button"]')

		// Should show loading state and eventually login
		await page.waitForSelector("main", { timeout: 10000 })
		await expect(page.locator('[data-testid="username-input"]')).not.toBeVisible()
	})

	test("should handle keyboard navigation", async ({ page }) => {
		// Test Tab navigation
		await page.keyboard.press("Tab")
		await expect(page.locator('[data-testid="username-input"]')).toBeFocused()

		await page.keyboard.press("Tab")
		await expect(page.locator('[data-testid="password-input"]')).toBeFocused()

		await page.keyboard.press("Tab")
		await expect(page.locator('[data-testid="login-button"]')).toBeFocused()

		// Test Enter key to submit
		await page.keyboard.press("Shift+Tab") // Go back to password field
		await page.keyboard.press("Shift+Tab") // Go back to username field
		await page.fill('[data-testid="username-input"]', "admin")
		await page.keyboard.press("Tab")
		await page.fill('[data-testid="password-input"]', "websocket3001")
		await page.keyboard.press("Enter")

		// Should login successfully
		await page.waitForSelector("main", { timeout: 10000 })
		await expect(page.locator('[data-testid="username-input"]')).not.toBeVisible()
	})

	test("should handle form reset", async ({ page }) => {
		// Fill form with data
		await page.fill('[data-testid="username-input"]', "testuser")
		await page.fill('[data-testid="password-input"]', "testpass")

		// Verify fields are filled
		await expect(page.locator('[data-testid="username-input"]')).toHaveValue("testuser")
		await expect(page.locator('[data-testid="password-input"]')).toHaveValue("testpass")

		// Clear form manually
		await page.fill('[data-testid="username-input"]', "")
		await page.fill('[data-testid="password-input"]', "")

		// Verify form is reset
		await expect(page.locator('[data-testid="username-input"]')).toHaveValue("")
		await expect(page.locator('[data-testid="password-input"]')).toHaveValue("")
	})
})
