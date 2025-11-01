import type { Page, TestInfo } from "@playwright/test"

export class TestHelpers {
	constructor(private page: Page) {}

	// Login is no longer needed here - handled by global setup
	async waitForAppReady() {
		// Wait for BBS interface to be ready (indicates successful login)
		await this.page
			.waitForSelector('h1:has-text("BBS")', { timeout: 10000 })
			.catch(() => this.page.waitForSelector('button:has-text("new_post")', { timeout: 5000 }))
			.catch(() => this.page.waitForSelector("text=BBS", { timeout: 5000 }))
			.catch(() => this.page.waitForSelector('[data-testid="bbs-page"]', { timeout: 5000 }))
			.catch(() => this.page.waitForSelector("main", { timeout: 5000 }))
	}

	async createPost(title: string, body: string) {
		await this.page.click('button:has-text("new_post")')
		await this.page.fill('[data-testid="post-title-input"]', title)
		await this.page.fill('[data-testid="post-body-input"]', body)
		await this.page.click('[data-testid="create-post-button"]')

		// Wait for dialog to close and post to appear
		await this.page.waitForSelector(`text=${title}`, { timeout: 5000 })
	}

	async addComment(comment: string) {
		await this.page.fill('[data-testid="comment-input"]', comment)
		await this.page.click('[data-testid="add-comment-button"]')

		// Wait for comment to appear
		await this.page.waitForSelector(`text=${comment}`, { timeout: 5000 })
	}

	async waitForWebSocketConnection() {
		// Wait for WebSocket to be established
		await this.page.waitForFunction(
			() => {
				return window.trpcClient && window.trpcClient.wsConnection?.readyState === 1
			},
			{ timeout: 10000 }
		)
	}

	async takeScreenshot(testInfo: TestInfo, name: string) {
		const screenshot = await this.page.screenshot({
			fullPage: true,
			path: `test-results/${testInfo.title}-${name}.png`,
		})
		await testInfo.attach(name, { body: screenshot, contentType: "image/png" })
	}

	async logout() {
		const logoutButton = this.page.locator('button:has-text("Logout"), [aria-label="Logout"]')
		if (await logoutButton.isVisible()) {
			await logoutButton.click()
		}
		await this.page.waitForSelector('[data-testid="username-input"]', { timeout: 5000 })
	}

	async navigateToPage(pageName: string) {
		await this.page.click(`a:has-text("${pageName}")`)

		// Wait for page to load based on page name
		switch (pageName) {
			case "Top":
				await this.page.waitForSelector("text=WebSocket Framework", { timeout: 5000 })
				break
			case "BBS":
				await this.page.waitForSelector("text=new_post", { timeout: 5000 })
				break
			case "Components":
				await this.page.waitForSelector("text=Component Demo", { timeout: 5000 })
				break
			case "Tetris":
				await this.page.waitForSelector('[data-testid="game-board"]', { timeout: 5000 })
				break
			case "Notifications":
				await this.page.waitForSelector("text=Notification Demo", { timeout: 5000 })
				break
		}
	}

	async waitForElement(selector: string, timeout = 5000) {
		await this.page.waitForSelector(selector, { timeout })
	}

	async waitForElementToDisappear(selector: string, timeout = 5000) {
		await this.page.waitForSelector(selector, { state: "hidden", timeout })
	}

	async clickElement(selector: string) {
		await this.page.click(selector)
	}

	async fillInput(selector: string, value: string) {
		await this.page.fill(selector, value)
	}

	async selectOption(selector: string, value: string) {
		await this.page.selectOption(selector, value)
	}

	async getText(selector: string) {
		return await this.page.textContent(selector)
	}

	async getAttribute(selector: string, attribute: string) {
		return await this.page.getAttribute(selector, attribute)
	}

	async isElementVisible(selector: string) {
		return await this.page.isVisible(selector)
	}

	async isElementEnabled(selector: string) {
		return await this.page.isEnabled(selector)
	}

	async hoverElement(selector: string) {
		await this.page.hover(selector)
	}

	async pressKey(key: string) {
		await this.page.keyboard.press(key)
	}

	async typeText(selector: string, text: string) {
		await this.page.type(selector, text)
	}

	async scrollToElement(selector: string) {
		await this.page.locator(selector).scrollIntoViewIfNeeded()
	}

	async waitForNetworkIdle(timeout = 5000) {
		await this.page.waitForLoadState("networkidle", { timeout })
	}

	async waitForResponse(urlPattern: string | RegExp, timeout = 5000) {
		return await this.page.waitForResponse(urlPattern, { timeout })
	}

	async mockApiResponse(urlPattern: string | RegExp, response: any, status = 200) {
		await this.page.route(urlPattern, route => {
			route.fulfill({
				status,
				contentType: "application/json",
				body: JSON.stringify(response),
			})
		})
	}

	async blockRequest(urlPattern: string | RegExp) {
		await this.page.route(urlPattern, route => {
			route.abort()
		})
	}

	async waitForToast(message: string, timeout = 5000) {
		await this.page.waitForSelector(`text=${message}`, { timeout })
	}

	async waitForToastToDisappear(timeout = 5000) {
		await this.page.waitForSelector('[data-testid="toast"]', { state: "hidden", timeout })
	}

	async getToastCount() {
		return await this.page.locator('[data-testid="toast"]').count()
	}

	async dismissToast(index = 0) {
		const toast = this.page.locator('[data-testid="toast"]').nth(index)
		const dismissButton = toast.locator('[data-testid="toast-dismiss"]')
		if (await dismissButton.isVisible()) {
			await dismissButton.click()
		}
	}

	async setViewportSize(width: number, height: number) {
		await this.page.setViewportSize({ width, height })
	}

	async reload() {
		await this.page.reload()
	}

	async goBack() {
		await this.page.goBack()
	}

	async goForward() {
		await this.page.goForward()
	}

	async executeScript(script: string) {
		return await this.page.evaluate(script)
	}

	async getLocalStorageItem(key: string) {
		return await this.page.evaluate(k => localStorage.getItem(k), key)
	}

	async setLocalStorageItem(key: string, value: string) {
		await this.page.evaluate((k, v) => localStorage.setItem(k, v), key, value)
	}

	async clearLocalStorage() {
		await this.page.evaluate(() => localStorage.clear())
	}

	async getSessionStorageItem(key: string) {
		return await this.page.evaluate(k => sessionStorage.getItem(k), key)
	}

	async setSessionStorageItem(key: string, value: string) {
		await this.page.evaluate((k, v) => sessionStorage.setItem(k, v), key, value)
	}

	async clearSessionStorage() {
		await this.page.evaluate(() => sessionStorage.clear())
	}

	async waitForElementToBeEnabled(selector: string, timeout = 5000) {
		await this.page.waitForFunction(
			sel => {
				const el = document.querySelector(sel)
				return el && !el.disabled
			},
			selector,
			{ timeout }
		)
	}

	async waitForElementToBeDisabled(selector: string, timeout = 5000) {
		await this.page.waitForFunction(
			sel => {
				const el = document.querySelector(sel)
				return el && el.disabled
			},
			selector,
			{ timeout }
		)
	}

	async waitForTextContent(selector: string, text: string, timeout = 5000) {
		await this.page.waitForFunction(
			(sel, txt) => {
				const el = document.querySelector(sel)
				return el && el.textContent?.includes(txt)
			},
			selector,
			text,
			{ timeout }
		)
	}

	async countElements(selector: string) {
		return await this.page.locator(selector).count()
	}

	async getElementsText(selector: string) {
		return await this.page.locator(selector).allTextContents()
	}

	async waitForElementCount(selector: string, count: number, timeout = 5000) {
		await this.page.waitForFunction(
			(sel, cnt) => document.querySelectorAll(sel).length === cnt,
			selector,
			count,
			{ timeout }
		)
	}
}

export const expectToast = async (page: Page, message: string) => {
	await expect(page.locator(`[data-testid="toast"]`)).toContainText(message)
}

export const waitForToastToDisappear = async (page: Page) => {
	await page.waitForSelector('[data-testid="toast"]', { state: "hidden", timeout: 5000 })
}

export const takeScreenshot = async (page: Page, filename: string) => {
	await page.screenshot({
		fullPage: true,
		path: `test-results/${filename}.png`,
	})
}

export const waitForElement = async (page: Page, selector: string, timeout = 5000) => {
	await page.waitForSelector(selector, { timeout })
}

export const clickElement = async (page: Page, selector: string) => {
	await page.click(selector)
}

export const fillInput = async (page: Page, selector: string, value: string) => {
	await page.fill(selector, value)
}

export const isElementVisible = async (page: Page, selector: string) => {
	return await page.isVisible(selector)
}

export const getText = async (page: Page, selector: string) => {
	return await page.textContent(selector)
}
