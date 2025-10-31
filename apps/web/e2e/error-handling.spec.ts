import { test, expect } from '@playwright/test';
import { TestHelpers } from './helpers/test-helpers';

test.describe('Error Handling and Edge Cases', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
  });

  test('should handle network connectivity issues', async ({ page }) => {
    await helpers.login();
    
    // Simulate network disconnection
    await page.context().setOffline(true);
    
    // Try to create post while offline
    await page.click('button:has-text("new_post")');
    await page.fill('[data-testid="post-title-input"]', 'Offline Post');
    await page.fill('[data-testid="post-body-input"]', 'This should fail offline');
    await page.click('[data-testid="create-post-button"]');
    
    // Should show network error message
    await expect(page.locator('text=Network error, Connection error, Offline')).toBeVisible({ timeout: 5000 });
    
    // Restore connection
    await page.context().setOffline(false);
    
    // Should be able to retry
    await page.reload();
    await helpers.login();
    await expect(page.locator('text=new_post')).toBeVisible();
  });

  test('should handle server errors gracefully', async ({ page }) => {
    await helpers.login();
    
    // Mock server error response
    await page.route('**/api/posts/create', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' })
      });
    });
    
    // Try to create post
    await page.click('button:has-text("new_post")');
    await page.fill('[data-testid="post-title-input"]', 'Server Error Test');
    await page.fill('[data-testid="post-body-input"]', 'This should trigger server error');
    await page.click('[data-testid="create-post-button"]');
    
    // Should show server error message
    await expect(page.locator('text=Server error, Internal server error')).toBeVisible({ timeout: 5000 });
  });

  test('should handle timeout errors', async ({ page }) => {
    await helpers.login();
    
    // Mock slow response
    await page.route('**/api/posts/list', route => {
      // Don't respond to trigger timeout
      setTimeout(() => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ posts: [] })
        });
      }, 10000);
    });
    
    // Should show timeout or loading error
    await expect(page.locator('text=Loading, Timeout, Connection error')).toBeVisible({ timeout: 15000 });
  });

  test('should handle invalid API responses', async ({ page }) => {
    await helpers.login();
    
    // Mock invalid JSON response
    await page.route('**/api/posts/create', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: 'invalid json response'
      });
    });
    
    // Try to create post
    await page.click('button:has-text("new_post")');
    await page.fill('[data-testid="post-title-input"]', 'Invalid Response Test');
    await page.fill('[data-testid="post-body-input"]', 'This should trigger invalid response');
    await page.click('[data-testid="create-post-button"]');
    
    // Should show parsing error
    await expect(page.locator('text=Invalid response, Parsing error')).toBeVisible({ timeout: 5000 });
  });

  test('should handle authentication token expiration', async ({ page }) => {
    await helpers.login();
    
    // Mock expired token response
    await page.route('**/api/**', route => {
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Token expired' })
      });
    });
    
    // Try to access protected resource
    await page.click('button:has-text("new_post")');
    
    // Should redirect to login or show auth error
    await expect(page.locator('[data-testid="username-input"], text=Unauthorized, text=Token expired')).toBeVisible({ timeout: 5000 });
  });

  test('should handle concurrent requests', async ({ page }) => {
    await helpers.login();
    
    // Make multiple simultaneous requests
    const promises = [];
    for (let i = 0; i < 5; i++) {
      promises.push(
        page.click('button:has-text("new_post")').then(() => {
          return page.fill('[data-testid="post-title-input"]', `Concurrent Post ${i}`);
        }).then(() => {
          return page.fill('[data-testid="post-body-input"]', `Content ${i}`);
        }).then(() => {
          return page.click('[data-testid="create-post-button"]');
        })
      );
    }
    
    // Should handle concurrent requests without crashing
    await Promise.all(promises);
    
    // Should still be functional
    await expect(page.locator('text=new_post')).toBeVisible();
  });

  test('should handle malformed input data', async ({ page }) => {
    await helpers.login();
    
    // Test with special characters
    await page.click('button:has-text("new_post")');
    await page.fill('[data-testid="post-title-input"]', '<script>alert("xss")</script>');
    await page.fill('[data-testid="post-body-input"]', '"; DROP TABLE posts; --');
    await page.click('[data-testid="create-post-button"]');
    
    // Should sanitize input or show validation error
    await expect(page.locator('text=Invalid characters, Sanitized, Validation error')).toBeVisible({ timeout: 5000 });
  });

  test('should handle extremely large input', async ({ page }) => {
    await helpers.login();
    
    // Test with very large content
    const largeContent = 'A'.repeat(1000000); // 1MB of text
    await page.click('button:has-text("new_post")');
    await page.fill('[data-testid="post-title-input"]', 'Large Content Test');
    await page.fill('[data-testid="post-body-input"]', largeContent);
    await page.click('[data-testid="create-post-button"]');
    
    // Should show size limit error or handle gracefully
    await expect(page.locator('text=Too large, Size limit, File too big')).toBeVisible({ timeout: 10000 });
  });

  test('should handle browser storage limitations', async ({ page }) => {
    await helpers.login();
    
    // Fill localStorage to capacity
    await page.evaluate(() => {
      try {
        for (let i = 0; i < 1000; i++) {
          localStorage.setItem(`test${i}`, 'A'.repeat(1000));
        }
      } catch (e) {
        // Storage full
      }
    });
    
    // Try to use application features
    await page.click('button:has-text("new_post")');
    await page.fill('[data-testid="post-title-input"]', 'Storage Test');
    await page.fill('[data-testid="post-body-input"]', 'Testing with full storage');
    await page.click('[data-testid="create-post-button"]');
    
    // Should handle storage issues gracefully
    await expect(page.locator('text=new_post')).toBeVisible();
  });

  test('should handle memory pressure', async ({ page }) => {
    await helpers.login();
    
    // Create many posts to test memory usage
    for (let i = 0; i < 50; i++) {
      await helpers.createPost(`Memory Test ${i}`, `Content for memory test ${i}`);
    }
    
    // Application should still be responsive
    await expect(page.locator('text=new_post')).toBeVisible();
    
    // Test navigation still works
    await page.click('a:has-text("Components")');
    await expect(page.locator('h1')).toContainText('Component Demo');
  });

  test('should handle browser back button with unsaved changes', async ({ page }) => {
    await helpers.login();
    
    // Start creating a post but don't save
    await page.click('button:has-text("new_post")');
    await page.fill('[data-testid="post-title-input"]', 'Unsaved Post');
    await page.fill('[data-testid="post-body-input"]', 'Unsaved content');
    
    // Try to navigate away
    await page.click('a:has-text("Top")');
    
    // Should show confirmation dialog or handle gracefully
    const confirmDialog = page.locator('text=Are you sure, Unsaved changes, Leave page');
    if (await confirmDialog.isVisible()) {
      await page.click('button:has-text("Stay"), button:has-text("Cancel")');
      await expect(page.locator('[data-testid="post-title-input"]')).toHaveValue('Unsaved Post');
    }
  });

  test('should handle rapid clicking and double submissions', async ({ page }) => {
    await helpers.login();
    
    // Rapid click submit button
    await page.click('button:has-text("new_post")');
    await page.fill('[data-testid="post-title-input"]', 'Rapid Click Test');
    await page.fill('[data-testid="post-body-input"]', 'Testing rapid clicks');
    
    // Click submit multiple times rapidly
    for (let i = 0; i < 5; i++) {
      await page.click('[data-testid="create-post-button"]');
    }
    
    // Should only create one post
    await expect(page.locator('text=Rapid Click Test')).toBeVisible({ timeout: 5000 });
    
    // Count posts with this title
    const postCount = await page.locator('text=Rapid Click Test').count();
    expect(postCount).toBeLessThanOrEqual(1);
  });

  test('should handle corrupted session data', async ({ page }) => {
    // Corrupt session/localStorage
    await page.evaluate(() => {
      localStorage.setItem('auth-token', 'corrupted-token-data');
      localStorage.setItem('user-session', '{"invalid":json}');
    });
    
    await page.goto('/');
    
    // Should handle corrupted data and redirect to login
    await expect(page.locator('[data-testid="username-input"]')).toBeVisible({ timeout: 5000 });
  });

  test('should handle WebSocket connection failures', async ({ page }) => {
    await helpers.login();
    
    // Block WebSocket connections
    await page.route('**/ws', route => {
      route.abort();
    });
    
    // Try real-time features
    await helpers.createPost('WebSocket Test', 'Testing WebSocket failure');
    
    // Should show connection error or fallback to HTTP
    await expect(page.locator('text=WebSocket error, Connection failed, Using fallback')).toBeVisible({ timeout: 5000 });
  });

  test('should handle browser tab management', async ({ page }) => {
    await helpers.login();
    
    // Open new tab
    const newPage = await page.context().newPage();
    await newPage.goto(page.url());
    
    // Should maintain session across tabs
    await expect(newPage.locator('text=new_post')).toBeVisible({ timeout: 5000 });
    
    // Logout from one tab
    await helpers.logout();
    
    // Other tab should handle logout gracefully
    await newPage.reload();
    await expect(newPage.locator('[data-testid="username-input"]')).toBeVisible({ timeout: 5000 });
    
    await newPage.close();
  });
});
