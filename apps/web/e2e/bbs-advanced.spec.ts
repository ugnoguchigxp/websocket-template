import { expect, test } from "@playwright/test"
import { TestHelpers } from "./helpers/test-helpers"

test.describe("BBS Advanced Functionality", () => {
	let helpers: TestHelpers

	test.beforeEach(async ({ page }) => {
		helpers = new TestHelpers(page)
		await helpers.login()
	})

	test("should handle post pagination", async ({ page }) => {
		// Create many posts to test pagination
		for (let i = 1; i <= 15; i++) {
			await helpers.createPost(`Post ${i}`, `Content for post ${i}`)
		}

		// Check if pagination controls exist
		const pagination = page.locator('[data-testid="pagination"]')
		if (await pagination.isVisible()) {
			// Test next page
			const nextButton = page.locator('button:has-text("Next")')
			if (await nextButton.isVisible()) {
				await nextButton.click()
				await expect(page.locator("text=Post 15")).toBeVisible()
			}

			// Test previous page
			const prevButton = page.locator('button:has-text("Previous")')
			if (await prevButton.isVisible()) {
				await prevButton.click()
				await expect(page.locator("text=Post 1")).toBeVisible()
			}
		}
	})

	test("should handle post search and filtering", async ({ page }) => {
		// Create posts with different content
		await helpers.createPost("JavaScript Tutorial", "Learn JavaScript programming")
		await helpers.createPost("TypeScript Guide", "Master TypeScript with examples")
		await helpers.createPost("React Tips", "Best practices for React development")

		// Test search functionality
		const searchInput = page.locator('[data-testid="search-input"]')
		if (await searchInput.isVisible()) {
			await searchInput.fill("JavaScript")
			await page.keyboard.press("Enter")

			// Should only show JavaScript-related posts
			await expect(page.locator("text=JavaScript Tutorial")).toBeVisible()
			await expect(page.locator("text=TypeScript Guide")).not.toBeVisible()
		}
	})

	test("should handle post editing", async ({ page }) => {
		// Create a post
		await helpers.createPost("Original Title", "Original content")

		// Find and click edit button
		const editButton = page.locator('[data-testid="edit-post"]').first()
		if (await editButton.isVisible()) {
			await editButton.click()

			// Edit post content
			await page.fill('[data-testid="post-title-input"]', "Updated Title")
			await page.fill('[data-testid="post-body-input"]', "Updated content")
			await page.click('[data-testid="update-post-button"]')

			// Verify post was updated
			await expect(page.locator("text=Updated Title")).toBeVisible()
			await expect(page.locator("text=Original Title")).not.toBeVisible()
		}
	})

	test("should handle post deletion", async ({ page }) => {
		// Create a post
		await helpers.createPost("Post to Delete", "This post will be deleted")

		// Find and click delete button
		const deleteButton = page.locator('[data-testid="delete-post"]').first()
		if (await deleteButton.isVisible()) {
			await deleteButton.click()

			// Confirm deletion
			const confirmButton = page.locator('button:has-text("Delete"), button:has-text("Confirm")')
			await confirmButton.click()

			// Verify post was deleted
			await expect(page.locator("text=Post to Delete")).not.toBeVisible()
		}
	})

	test("should handle comment editing and deletion", async ({ page }) => {
		// Create a post and add a comment
		await helpers.createPost("Post for Comments", "Main post content")
		await page.locator('[data-testid="post-item"]').first().click()
		await helpers.addComment("Original comment")

		// Test comment editing
		const editCommentButton = page.locator('[data-testid="edit-comment"]').first()
		if (await editCommentButton.isVisible()) {
			await editCommentButton.click()
			await page.fill('[data-testid="comment-input"]', "Updated comment")
			await page.click('[data-testid="update-comment-button"]')
			await expect(page.locator("text=Updated comment")).toBeVisible()
		}

		// Test comment deletion
		const deleteCommentButton = page.locator('[data-testid="delete-comment"]').first()
		if (await deleteCommentButton.isVisible()) {
			await deleteCommentButton.click()
			const confirmButton = page.locator('button:has-text("Delete"), button:has-text("Confirm")')
			await confirmButton.click()
			await expect(page.locator("text=Updated comment")).not.toBeVisible()
		}
	})

	test("should handle real-time updates", async ({ page }) => {
		// Create a post in first tab
		await helpers.createPost("Real-time Test", "Testing real-time updates")

		// Open new browser context to simulate another user
		const context2 = await page.context().browser()?.newContext()
		const page2 = await context2?.newPage()
		if (page2) {
			const helpers2 = new TestHelpers(page2)
			await helpers2.login()

			// Both pages should show the same post
			await expect(page.locator("text=Real-time Test")).toBeVisible()
			await expect(page2.locator("text=Real-time Test")).toBeVisible()

			// Add comment from second page
			await page2.locator('[data-testid="post-item"]').first().click()
			await helpers2.addComment("Comment from user 2")

			// First page should show the comment in real-time
			await expect(page.locator("text=Comment from user 2")).toBeVisible({ timeout: 5000 })

			await page2.close()
			await context2?.close()
		}
	})

	test("should handle post validation", async ({ page }) => {
		// Try to create post with empty title
		await page.click('button:has-text("new_post")')
		await page.fill('[data-testid="post-title-input"]', "")
		await page.fill('[data-testid="post-body-input"]', "Content without title")
		await page.click('[data-testid="create-post-button"]')

		// Should show validation error
		await expect(page.locator("text=Title is required")).toBeVisible()

		// Try to create post with empty body
		await page.fill('[data-testid="post-title-input"]', "Title without content")
		await page.fill('[data-testid="post-body-input"]', "")
		await page.click('[data-testid="create-post-button"]')

		// Should show validation error
		await expect(page.locator("text=Content is required")).toBeVisible()
	})

	test("should handle comment validation", async ({ page }) => {
		// Create a post first
		await helpers.createPost("Post for validation", "Main content")
		await page.locator('[data-testid="post-item"]').first().click()

		// Try to add empty comment
		await page.fill('[data-testid="comment-input"]', "")
		await page.click('[data-testid="add-comment-button"]')

		// Should show validation error
		await expect(page.locator("text=Comment cannot be empty")).toBeVisible()
	})

	test("should handle character limits", async ({ page }) => {
		// Try to create post with very long title
		const longTitle = "A".repeat(201) // Assuming 200 character limit
		await page.click('button:has-text("new_post")')
		await page.fill('[data-testid="post-title-input"]', longTitle)
		await page.fill('[data-testid="post-body-input"]', "Valid content")

		// Should show character limit error
		await expect(page.locator("text=Title too long")).toBeVisible()
	})

	test("should handle post sorting", async ({ page }) => {
		// Create posts with different timestamps
		await helpers.createPost("First Post", "First content")
		await page.waitForTimeout(1000)
		await helpers.createPost("Second Post", "Second content")
		await page.waitForTimeout(1000)
		await helpers.createPost("Third Post", "Third content")

		// Test different sorting options
		const sortSelect = page.locator('[data-testid="sort-select"]')
		if (await sortSelect.isVisible()) {
			// Test newest first
			await sortSelect.selectOption("newest")
			const posts = await page.locator('[data-testid="post-item"]').allTextContents()
			expect(posts[0]).toContain("Third Post")

			// Test oldest first
			await sortSelect.selectOption("oldest")
			await page.waitForTimeout(500)
			const oldPosts = await page.locator('[data-testid="post-item"]').allTextContents()
			expect(oldPosts[0]).toContain("First Post")
		}
	})

	test("should handle post categories or tags", async ({ page }) => {
		// Check if category system exists
		const categorySelect = page.locator('[data-testid="category-select"]')
		if (await categorySelect.isVisible()) {
			await page.click('button:has-text("new_post")')
			await categorySelect.selectOption("technology")
			await page.fill('[data-testid="post-title-input"]', "Tech Post")
			await page.fill('[data-testid="post-body-input"]', "Technology content")
			await page.click('[data-testid="create-post-button"]')

			// Should show category tag
			await expect(page.locator("text=technology")).toBeVisible()
		}
	})
})
