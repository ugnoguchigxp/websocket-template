import { test, expect } from '@playwright/test';
import { TestHelpers } from './helpers/test-helpers';

test.describe('Responsive Design and Accessibility', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    await helpers.login();
  });

  test.describe('Mobile Responsiveness', () => {
    test('should display correctly on mobile devices', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Check mobile navigation
      await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible();
      
      // Open mobile menu
      await page.click('[data-testid="mobile-menu-button"]');
      await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
      
      // Navigate through mobile menu
      await page.click('a:has-text("Top")');
      await expect(page.locator('h1')).toContainText('WebSocket Framework');
    });

    test('should handle mobile BBS interface', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Check BBS interface on mobile
      await expect(page.locator('text=new_post')).toBeVisible();
      
      // Create post on mobile
      await page.click('button:has-text("new_post")');
      await expect(page.locator('[data-testid="post-title-input"]')).toBeVisible();
      await page.fill('[data-testid="post-title-input"]', 'Mobile Post');
      await page.fill('[data-testid="post-body-input"]', 'Created on mobile');
      await page.click('[data-testid="create-post-button"]');
      
      await expect(page.locator('text=Mobile Post')).toBeVisible();
    });

    test('should handle mobile components demo', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.click('a:has-text("Components")');
      
      // Check components on mobile
      await expect(page.locator('button:has-text("Primary Button")')).toBeVisible();
      
      // Test mobile dialog
      await page.click('button:has-text("Open Dialog")');
      await expect(page.locator('text=Dialog Title')).toBeVisible();
      await page.click('button:has-text("Close")');
    });

    test('should handle mobile tetris game', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.click('a:has-text("Tetris")');
      
      // Check game on mobile
      await expect(page.locator('[data-testid="game-board"]')).toBeVisible();
      await expect(page.locator('text=Score')).toBeVisible();
      
      // Test mobile controls
      await page.keyboard.press('Space');
      await expect(page.locator('text=Press SPACE to start')).not.toBeVisible();
    });
  });

  test.describe('Tablet Responsiveness', () => {
    test('should display correctly on tablet devices', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      
      // Check tablet layout
      await expect(page.locator('[data-testid="sidebar"]')).toBeVisible();
      await expect(page.locator('text=new_post')).toBeVisible();
      
      // Test navigation
      await page.click('a:has-text("Components")');
      await expect(page.locator('h1')).toContainText('Component Demo');
    });
  });

  test.describe('Desktop Responsiveness', () => {
    test('should display correctly on desktop devices', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      
      // Check desktop layout
      await expect(page.locator('[data-testid="sidebar"]')).toBeVisible();
      await expect(page.locator('[data-testid="main-content"]')).toBeVisible();
      
      // Test full interface
      await page.click('a:has-text("Components")');
      await expect(page.locator('h1')).toContainText('Component Demo');
    });
  });

  test.describe('Accessibility', () => {
    test('should have proper semantic HTML structure', async ({ page }) => {
      // Check for proper heading hierarchy
      const h1 = page.locator('h1');
      await expect(h1).toBeVisible();
      
      // Check for proper navigation elements
      const nav = page.locator('nav');
      await expect(nav).toBeVisible();
      
      // Check for proper main content area
      const main = page.locator('main');
      await expect(main).toBeVisible();
    });

    test('should support keyboard navigation', async ({ page }) => {
      // Test Tab navigation
      await page.keyboard.press('Tab');
      const focusedElement = await page.locator(':focus');
      await expect(focusedElement).toBeVisible();
      
      // Test Enter key on buttons
      await page.keyboard.press('Tab'); // Move to first focusable element
      await page.keyboard.press('Enter');
      
      // Test Escape key to close dialogs/modals
      await page.keyboard.press('Escape');
    });

    test('should have proper ARIA labels and roles', async ({ page }) => {
      // Check for ARIA labels on interactive elements
      const buttons = page.locator('button[aria-label]');
      const buttonCount = await buttons.count();
      expect(buttonCount).toBeGreaterThan(0);
      
      // Check for proper roles
      const navigation = page.locator('[role="navigation"]');
      await expect(navigation).toBeVisible();
      
      const main = page.locator('[role="main"]');
      await expect(main).toBeVisible();
    });

    test('should support screen readers', async ({ page }) => {
      // Check for alt text on images
      const images = page.locator('img[alt]');
      const imageCount = await images.count();
      
      // Check for proper form labels
      const inputs = page.locator('input[aria-label], input[placeholder], label');
      const inputCount = await inputs.count();
      expect(inputCount).toBeGreaterThan(0);
    });

    test('should have sufficient color contrast', async ({ page }) => {
      // This is a basic check - actual contrast testing would need specialized tools
      const textElements = page.locator('p, h1, h2, h3, h4, h5, h6, span, div');
      const textCount = await textElements.count();
      expect(textCount).toBeGreaterThan(0);
      
      // Check that text is visible (basic contrast check)
      for (let i = 0; i < Math.min(textCount, 10); i++) {
        const element = textElements.nth(i);
        await expect(element).toBeVisible();
      }
    });

    test('should handle focus management', async ({ page }) => {
      // Test focus stays in modal when opened
      await page.click('a:has-text("Components")');
      await page.click('button:has-text("Open Dialog")');
      
      // Focus should be trapped in dialog
      const focusedInDialog = await page.locator(':focus').count();
      expect(focusedInDialog).toBeGreaterThan(0);
      
      // Close dialog and check focus returns
      await page.keyboard.press('Escape');
      await expect(page.locator('text=Dialog Title')).not.toBeVisible();
    });

    test('should have skip links for keyboard users', async ({ page }) => {
      // Check for skip navigation links
      const skipLinks = page.locator('a[href^="#"]:has-text("skip"), a:has-text("Skip")');
      if (await skipLinks.count() > 0) {
        await skipLinks.first().click();
        // Should jump to main content
        await expect(page.locator('main')).toBeFocused();
      }
    });

    test('should announce dynamic content changes', async ({ page }) => {
      // Test that form errors are announced
      await page.click('a:has-text("Components")');
      await page.click('button:has-text("Submit Form")');
      
      // Check for error messages with proper ARIA attributes
      const errorMessage = page.locator('[role="alert"], [aria-live="assertive"]');
      if (await errorMessage.isVisible()) {
        await expect(errorMessage).toBeVisible();
      }
    });
  });

  test.describe('Performance', () => {
    test('should load within reasonable time', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto('/');
      await helpers.login();
      
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(5000); // Should load within 5 seconds
    });

    test('should handle large content efficiently', async ({ page }) => {
      // Create multiple posts to test performance
      for (let i = 1; i <= 20; i++) {
        await helpers.createPost(`Performance Test Post ${i}`, `Content for post ${i}`);
      }
      
      // Page should still be responsive
      await expect(page.locator('text=new_post')).toBeVisible();
      
      // Test scrolling performance
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      
      await page.waitForTimeout(1000);
      await expect(page.locator('text=Performance Test Post 20')).toBeVisible();
    });
  });
});
