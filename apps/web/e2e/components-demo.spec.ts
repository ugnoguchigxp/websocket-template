import { expect, test } from "@playwright/test"
import { TestHelpers } from "./helpers/test-helpers"

test.describe("Components Demo Page", () => {
	let helpers: TestHelpers

	test.beforeEach(async ({ page }) => {
		helpers = new TestHelpers(page)
		await page.goto("/")
		await helpers.waitForAppReady()
		await page.click('a:has-text("Components")')
		await expect(page.locator("h1")).toContainText("Component Demo")
	})

	test("should test button components", async ({ page }) => {
		// Test basic buttons
		await expect(page.locator('button:has-text("Primary Button")')).toBeVisible()
		await expect(page.locator('button:has-text("Secondary Button")')).toBeVisible()
		await expect(page.locator('button:has-text("Danger Button")')).toBeVisible()

		// Test loading button
		await page.click('button:has-text("Loading Button")')
		await expect(page.locator('button:has-text("Loading...")')).toBeVisible()

		// Test disabled button
		const disabledButton = page.locator('button:has-text("Disabled Button")')
		await expect(disabledButton).toBeDisabled()
	})

	test("should test input components", async ({ page }) => {
		// Test text input
		const textInput = page.locator('input[placeholder="Enter text..."]')
		await textInput.fill("Test input value")
		await expect(textInput).toHaveValue("Test input value")

		// Test textarea
		const textarea = page.locator('textarea[placeholder="Enter multiline text..."]')
		await textarea.fill("Line 1\nLine 2\nLine 3")
		await expect(textarea).toHaveValue("Line 1\nLine 2\nLine 3")

		// Test number input
		const numberInput = page.locator('input[placeholder="Enter number..."]')
		await numberInput.fill("123.45")
		await expect(numberInput).toHaveValue("123.45")

		// Test price input
		const priceInput = page.locator('input[placeholder="0.00"]')
		await priceInput.fill("99.99")
		await expect(priceInput).toHaveValue("99.99")
	})

	test("should test date picker components", async ({ page }) => {
		// Test single date picker
		await page.click('input[placeholder="Select date"]')
		await expect(page.locator("text=Today")).toBeVisible()
		await page.keyboard.press("Escape") // Close calendar

		// Test date range picker
		await page.click('button:has-text("Select Date Range")')
		await expect(page.locator("text=Start Date")).toBeVisible()
		await expect(page.locator("text=End Date")).toBeVisible()
		await page.keyboard.press("Escape")
	})

	test("should test time input components", async ({ page }) => {
		// Test time input
		const timeInput = page.locator('input[placeholder="Select time"]')
		await timeInput.fill("14:30")
		await expect(timeInput).toHaveValue("14:30")

		// Test time number input
		const timeNumberInput = page.locator('input[placeholder="HH:MM"]')
		await timeNumberInput.fill("09:45")
		await expect(timeNumberInput).toHaveValue("09:45")
	})

	test("should test dialog component", async ({ page }) => {
		// Open dialog
		await page.click('button:has-text("Open Dialog")')

		// Verify dialog content
		await expect(page.locator("text=Dialog Title")).toBeVisible()
		await expect(page.locator("text=This is a dialog content area")).toBeVisible()

		// Close dialog
		await page.click('button:has-text("Close")')
		await expect(page.locator("text=Dialog Title")).not.toBeVisible()
	})

	test("should test drawer component", async ({ page }) => {
		// Open drawer
		await page.click('button:has-text("Open Drawer")')

		// Verify drawer content
		await expect(page.locator("text=Drawer Title")).toBeVisible()
		await expect(page.locator("text=This is a drawer content area")).toBeVisible()

		// Close drawer
		await page.click('button:has-text("Close Drawer")')
		await expect(page.locator("text=Drawer Title")).not.toBeVisible()
	})

	test("should test tooltip component", async ({ page }) => {
		// Hover over tooltip trigger
		await page.hover('button:has-text("Hover me")')
		await expect(page.locator("text=This is a tooltip message")).toBeVisible()

		// Move mouse away
		await page.hover("h1") // Move to different element
		await expect(page.locator("text=This is a tooltip message")).not.toBeVisible()
	})

	test("should test notification buttons", async ({ page }) => {
		// Test success notification
		await page.click('button:has-text("Show Success")')
		await expect(page.locator("text=Success notification")).toBeVisible()

		// Test error notification
		await page.click('button:has-text("Show Error")')
		await expect(page.locator("text=Error notification")).toBeVisible()

		// Test warning notification
		await page.click('button:has-text("Show Warning")')
		await expect(page.locator("text=Warning notification")).toBeVisible()

		// Test info notification
		await page.click('button:has-text("Show Info")')
		await expect(page.locator("text=Info notification")).toBeVisible()
	})

	test("should test form validation", async ({ page }) => {
		// Test required field validation
		await page.click('button:has-text("Submit Form")')
		await expect(page.locator("text=This field is required")).toBeVisible()

		// Fill required field and submit
		const requiredInput = page.locator("input[required]")
		await requiredInput.fill("Valid input")
		await page.click('button:has-text("Submit Form")')
		await expect(page.locator("text=Form submitted successfully")).toBeVisible()
	})
})
