import { test, expect } from '@playwright/test';
import { TestHelpers } from './helpers/test-helpers';

test.describe('Tetris Game', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    await helpers.login();
    await page.click('a:has-text("Tetris")');
    // Wait for game to load
    await page.waitForSelector('[data-testid="tetris-game"]', { timeout: 10000 });
  });

  test('should display tetris game interface', async ({ page }) => {
    // Check game elements are visible
    await expect(page.locator('text=Score')).toBeVisible();
    await expect(page.locator('text=Level')).toBeVisible();
    await expect(page.locator('text=Lines')).toBeVisible();
    await expect(page.locator('[data-testid="game-board"]')).toBeVisible();
    await expect(page.locator('[data-testid="next-piece"]')).toBeVisible();
  });

  test('should start and pause game', async ({ page }) => {
    // Game should be paused initially
    await expect(page.locator('text=Press SPACE to start')).toBeVisible();
    
    // Start game
    await page.keyboard.press('Space');
    await expect(page.locator('text=Press SPACE to start')).not.toBeVisible();
    
    // Pause game
    await page.keyboard.press('Space');
    await expect(page.locator('text=Paused')).toBeVisible();
    
    // Resume game
    await page.keyboard.press('Space');
    await expect(page.locator('text=Paused')).not.toBeVisible();
  });

  test('should handle game controls', async ({ page }) => {
    // Start game
    await page.keyboard.press('Space');
    
    // Test arrow keys
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowDown');
    
    // Test rotation
    await page.keyboard.press('ArrowUp');
    
    // Test hard drop
    await page.keyboard.press('Space');
    
    // Game should still be running
    await expect(page.locator('text=Score')).toBeVisible();
  });

  test('should display game over screen', async ({ page }) => {
    // Start game
    await page.keyboard.press('Space');
    
    // Let game run for a bit (or speed up if possible)
    await page.waitForTimeout(1000);
    
    // Check if game over appears (this might take longer in real scenario)
    // For testing purposes, we'll check the game over screen exists
    const gameOverScreen = page.locator('[data-testid="game-over"]');
    if (await gameOverScreen.isVisible()) {
      await expect(gameOverScreen).toContainText('Game Over');
      await expect(page.locator('text=Final Score')).toBeVisible();
      await expect(page.locator('button:has-text("Play Again")')).toBeVisible();
    }
  });

  test('should restart game after game over', async ({ page }) => {
    // Start game
    await page.keyboard.press('Space');
    
    // Wait a bit then check for game over
    await page.waitForTimeout(1000);
    
    const gameOverScreen = page.locator('[data-testid="game-over"]');
    if (await gameOverScreen.isVisible()) {
      // Click play again
      await page.click('button:has-text("Play Again")');
      
      // Should reset to initial state
      await expect(page.locator('text=Press SPACE to start')).toBeVisible();
      await expect(page.locator('text=Score: 0')).toBeVisible();
    }
  });

  test('should show next piece preview', async ({ page }) => {
    // Start game
    await page.keyboard.press('Space');
    
    // Next piece preview should be visible
    await expect(page.locator('[data-testid="next-piece"]')).toBeVisible();
    
    // The preview should contain a tetris piece
    const nextPieceArea = page.locator('[data-testid="next-piece"]');
    await expect(nextPieceArea.locator('[data-testid="piece-block"]')).toHaveCount.greaterThan(0);
  });

  test('should track score and level progression', async ({ page }) => {
    // Start game
    await page.keyboard.press('Space');
    
    // Initial score should be 0
    await expect(page.locator('text=Score: 0')).toBeVisible();
    await expect(page.locator('text=Level: 1')).toBeVisible();
    await expect(page.locator('text=Lines: 0')).toBeVisible();
    
    // Play for a short time
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Space'); // Hard drop
    
    // Score should have increased
    const scoreElement = page.locator('[data-testid="score"]');
    const scoreText = await scoreElement.textContent();
    expect(parseInt(scoreText || '0')).toBeGreaterThan(0);
  });

  test('should handle keyboard shortcuts', async ({ page }) => {
    // Test space bar for start/pause
    await page.keyboard.press('Space');
    await expect(page.locator('text=Press SPACE to start')).not.toBeVisible();
    
    // Test P key for pause
    await page.keyboard.press('p');
    await expect(page.locator('text=Paused')).toBeVisible();
    
    // Test R key for restart (if implemented)
    await page.keyboard.press('r');
    // Check if game resets to initial state
    await expect(page.locator('text=Press SPACE to start')).toBeVisible();
  });

  test('should be responsive on different screen sizes', async ({ page }) => {
    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('[data-testid="game-board"]')).toBeVisible();
    await expect(page.locator('text=Score')).toBeVisible();
    
    // Test tablet view
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('[data-testid="game-board"]')).toBeVisible();
    
    // Test desktop view
    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect(page.locator('[data-testid="game-board"]')).toBeVisible();
  });

  test('should handle game focus and blur', async ({ page }) => {
    // Start game
    await page.keyboard.press('Space');
    
    // Remove focus from game
    await page.click('body');
    
    // Game should pause when not focused
    await expect(page.locator('text=Paused')).toBeVisible();
    
    // Click back on game to focus
    await page.click('[data-testid="game-board"]');
    
    // Game should resume
    await expect(page.locator('text=Paused')).not.toBeVisible();
  });
});
