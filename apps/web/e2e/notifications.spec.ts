import { test, expect } from '@playwright/test';
import { TestHelpers } from './helpers/test-helpers';

test.describe('Notification System', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    await helpers.login();
    await page.click('a:has-text("Notifications")');
    await expect(page.locator('h1')).toContainText('Notification Demo');
  });

  test('should display demo notification options', async ({ page }) => {
    // Check demo notification buttons
    await expect(page.locator('button:has-text("システム情報")')).toBeVisible();
    await expect(page.locator('button:has-text("ファイルアップロード完了")')).toBeVisible();
    await expect(page.locator('button:has-text("ストレージ容量警告")')).toBeVisible();
    await expect(page.locator('button:has-text("API接続エラー")')).toBeVisible();
  });

  test('should show different types of notifications', async ({ page }) => {
    // Test info notification
    await page.click('button:has-text("システム情報")');
    await expect(page.locator('text=定期メンテナンスが予定されています')).toBeVisible();
    
    // Test success notification
    await page.click('button:has-text("ファイルアップロード完了")');
    await expect(page.locator('text=document.pdf のアップロードが完了しました')).toBeVisible();
    
    // Test warning notification
    await page.click('button:has-text("ストレージ容量警告")');
    await expect(page.locator('text=ストレージ使用量が90%を超過しています')).toBeVisible();
    
    // Test error notification
    await page.click('button:has-text("API接続エラー")');
    await expect(page.locator('text=サーバーとの接続に失敗しました')).toBeVisible();
  });

  test('should create custom notifications', async ({ page }) => {
    // Fill custom notification form
    await page.selectOption('select#notification-type', 'success');
    await page.fill('input#custom-title', 'Custom Success Title');
    await page.fill('textarea#custom-message', 'This is a custom success message');
    
    // Send custom notification
    await page.click('button:has-text("通知を送信")');
    
    // Verify custom notification appears
    await expect(page.locator('text=Custom Success Title')).toBeVisible();
    await expect(page.locator('text=This is a custom success message')).toBeVisible();
  });

  test('should clear all notifications', async ({ page }) => {
    // Add multiple notifications
    await page.click('button:has-text("システム情報")');
    await page.click('button:has-text("ファイルアップロード完了")');
    await page.click('button:has-text("ストレージ容量警告")');
    
    // Verify notifications are visible
    await expect(page.locator('[data-testid="notification-item"]')).toHaveCount(3);
    
    // Clear all notifications
    await page.click('button:has-text("全てクリア")');
    
    // Verify all notifications are cleared
    await expect(page.locator('[data-testid="notification-item"]')).toHaveCount(0);
  });

  test('should dismiss individual notifications', async ({ page }) => {
    // Add a notification
    await page.click('button:has-text("システム情報")');
    
    // Verify notification appears
    await expect(page.locator('text=定期メンテナンスが予定されています')).toBeVisible();
    
    // Dismiss the notification
    await page.click('[data-testid="notification-dismiss"]');
    
    // Verify notification is dismissed
    await expect(page.locator('text=定期メンテナンスが予定されています')).not.toBeVisible();
  });

  test('should respect notification limits', async ({ page }) => {
    // Add notifications rapidly to test limits
    for (let i = 0; i < 10; i++) {
      await page.click('button:has-text("システム情報")');
      await page.waitForTimeout(100);
    }
    
    // Verify notification limit is respected (should not exceed maximum)
    const notificationCount = await page.locator('[data-testid="notification-item"]').count();
    expect(notificationCount).toBeLessThanOrEqual(5); // Assuming max 5 notifications
  });

  test('should auto-dismiss notifications based on duration', async ({ page }) => {
    // Add an info notification (typically shorter duration)
    await page.click('button:has-text("システム情報")');
    
    // Verify notification appears
    await expect(page.locator('text=定期メンテナンスが予定されています')).toBeVisible();
    
    // Wait for auto-dismiss (info notifications typically disappear after a few seconds)
    await page.waitForTimeout(5000);
    
    // Verify notification is auto-dismissed
    await expect(page.locator('text=定期メンテナンスが予定されています')).not.toBeVisible();
  });

  test('should show notification count badge', async ({ page }) => {
    // Add notifications
    await page.click('button:has-text("システム情報")');
    await page.click('button:has-text("ファイルアップロード完了")');
    await page.click('button:has-text("ストレージ容量警告")');
    
    // Verify notification count badge
    const badge = page.locator('[data-testid="notification-count"]');
    await expect(badge).toBeVisible();
    await expect(badge).toContainText('3');
  });

  test('should handle notification panel toggle', async ({ page }) => {
    // Verify notification panel is initially visible
    await expect(page.locator('[data-testid="notification-panel"]')).toBeVisible();
    
    // Toggle panel closed
    await page.click('button:has-text("通知パネルを非表示")');
    await expect(page.locator('[data-testid="notification-panel"]')).not.toBeVisible();
    
    // Toggle panel open
    await page.click('button:has-text("通知パネルを表示")');
    await expect(page.locator('[data-testid="notification-panel"]')).toBeVisible();
  });
});
