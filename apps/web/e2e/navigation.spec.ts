import { test, expect } from '@playwright/test';
import { TestHelpers } from './helpers/test-helpers';

test.describe('Navigation and Page Transitions', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    await page.goto('/');
    await helpers.waitForAppReady();
  });

  test('should navigate between all pages successfully', async ({ page }) => {
    // Start at BBS page (default after login)
    await expect(page.locator('h1')).toContainText('BBS');
    
    // Navigate to Top page
    await page.click('a:has-text("Top")');
    await expect(page.locator('h1')).toContainText('WebSocket Framework');
    await expect(page.locator('text=Welcome to the WebSocket Framework demo application')).toBeVisible();
    
    // Navigate back to BBS
    await page.click('a:has-text("BBS")');
    await expect(page.locator('text=new_post')).toBeVisible();
    
    // Navigate to Components Demo
    await page.click('a:has-text("Components")');
    await expect(page.locator('h1')).toContainText('Component Demo');
    await expect(page.locator('text=WebSocket Frameworkで使用可能なUIコンポーネント一覧')).toBeVisible();
    
    // Navigate to Tetris Game
    await page.click('a:has-text("Tetris")');
    await expect(page.locator('text=Score')).toBeVisible();
    await expect(page.locator('text=Level')).toBeVisible();
    
    // Navigate to Notification Demo
    await page.click('a:has-text("Notifications")');
    await expect(page.locator('h1')).toContainText('Notification Demo');
    await expect(page.locator('text=通知システムのデモ')).toBeVisible();
  });

  test('should maintain authentication state during navigation', async ({ page }) => {
    // Navigate to different pages
    await page.click('a:has-text("Top")');
    await expect(page.locator('a:has-text("BBS")')).toBeVisible();
    
    await page.click('a:has-text("Components")');
    await expect(page.locator('a:has-text("BBS")')).toBeVisible();
    
    await page.click('a:has-text("BBS")');
    // Should still be logged in (able to see BBS interface)
    await expect(page.locator('text=new_post')).toBeVisible();
  });

  test('should handle browser back and forward navigation', async ({ page }) => {
    // Navigate to Top page
    await page.click('a:has-text("Top")');
    await expect(page.locator('h1')).toContainText('WebSocket Framework');
    
    // Navigate to Components
    await page.click('a:has-text("Components")');
    await expect(page.locator('h1')).toContainText('Component Demo');
    
    // Use browser back button
    await page.goBack();
    await expect(page.locator('h1')).toContainText('WebSocket Framework');
    
    // Use browser forward button
    await page.goForward();
    await expect(page.locator('h1')).toContainText('Component Demo');
  });

  test('should handle page refresh gracefully', async ({ page }) => {
    // Navigate to Components page
    await page.click('a:has-text("Components")');
    await expect(page.locator('h1')).toContainText('Component Demo');
    
    // Refresh the page
    await page.reload();
    
    // Should still be on the same page and logged in
    await expect(page.locator('h1')).toContainText('Component Demo');
    await expect(page.locator('text=Button')).toBeVisible();
    
    // Navigate back to BBS to verify authentication
    await page.click('a:has-text("BBS")');
    await expect(page.locator('text=new_post')).toBeVisible();
  });
});
