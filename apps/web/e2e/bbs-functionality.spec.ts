import { test, expect } from '@playwright/test';

test.describe('BBS Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for app to be ready (already logged in via global setup)
    await expect(page.locator('h1:has-text("BBS"), button:has-text("new_post")')).toBeVisible({ timeout: 10000 });
  });

  test('should create a new post', async ({ page }) => {
    // Click new post button
    await page.click('button:has-text("new_post")');

    // Fill post form
    await page.fill('[data-testid="post-title-input"]', 'Test Post Title');
    await page.fill('[data-testid="post-body-input"]', 'This is a test post content for E2E testing.');

    // Submit post
    await page.click('[data-testid="create-post-button"]');

    // Should close dialog and show new post in list
    await expect(page.locator('text=Test Post Title')).toBeVisible();
  });

  test('should add a comment to a post', async ({ page }) => {
    // First create a post if none exists
    const postList = page.locator('[data-testid="post-list"]');
    const existingPosts = await postList.locator('[data-testid="post-item"]').count();
    
    if (existingPosts === 0) {
      await page.click('button:has-text("new_post")');
      await page.fill('[data-testid="post-title-input"]', 'Post for Comment Test');
      await page.fill('[data-testid="post-body-input"]', 'This post will receive a comment.');
      await page.click('[data-testid="create-post-button"]');
      await expect(page.locator('text=Post for Comment Test')).toBeVisible();
    }

    // Click on the first post
    await postList.locator('[data-testid="post-item"]').first().click();

    // Add a comment
    await page.fill('[data-testid="comment-input"]', 'This is a test comment.');
    await page.click('[data-testid="add-comment-button"]');

    // Should show the comment
    await expect(page.locator('text=This is a test comment')).toBeVisible();
  });

  test('should display posts in descending order', async ({ page }) => {
    // Create multiple posts
    const posts = [
      { title: 'First Post', body: 'First content' },
      { title: 'Second Post', body: 'Second content' },
      { title: 'Third Post', body: 'Third content' }
    ];

    for (const post of posts) {
      await page.click('button:has-text("new_post")');
      await page.fill('[data-testid="post-title-input"]', post.title);
      await page.fill('[data-testid="post-body-input"]', post.body);
      await page.click('[data-testid="create-post-button"]');
      await page.waitForTimeout(500); // Small delay between posts
    }

    // Check that posts are displayed in descending order (newest first)
    const postTitles = await page.locator('[data-testid="post-item"] [data-testid="post-title"]').allTextContents();
    expect(postTitles[0]).toBe('Third Post');
    expect(postTitles[1]).toBe('Second Post');
    expect(postTitles[2]).toBe('First Post');
  });

  test('should handle WebSocket connection errors gracefully', async ({ page }) => {
    // Simulate network disconnection
    await page.context().setOffline(true);

    // Try to perform an action that requires WebSocket
    await page.click('button:has-text("new_post")');
    await page.fill('[data-testid="post-title-input"]', 'Offline Test');
    await page.fill('[data-testid="post-body-input"]', 'Testing offline behavior.');
    await page.click('[data-testid="create-post-button"]');

    // Should show connection error message
    await expect(page.locator('text=Connection error')).toBeVisible({ timeout: 5000 });

    // Restore connection
    await page.context().setOffline(false);

    // Should be able to reconnect and try again
    await page.reload();
    await expect(page.locator('text=new_post')).toBeVisible();
  });
});
