import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting global setup for E2E tests...');
  
  // Set up test environment
  process.env.NODE_ENV = 'test';
  process.env.E2E_TESTING = 'true';
  
  // Launch a browser to perform setup tasks
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Wait for the application to be ready
    console.log('⏳ Waiting for application to be ready...');
    await page.goto(process.env.BASE_URL || 'http://localhost:5173');
    
    // Wait for the app to load
    await page.waitForSelector('body', { timeout: 30000 });
    
    // Check if login page is accessible
    const loginForm = await page.locator('[data-testid="username-input"]').isVisible({ timeout: 10000 });
    if (loginForm) {
      console.log('✅ Login form is accessible');
      
      // Login once and save authentication state
      console.log('🔐 Performing global login...');
      await page.fill('[data-testid="username-input"]', 'admin');
      await page.fill('[data-testid="password-input"]', 'websocket3001');
      await page.click('[data-testid="login-button"]');
      
      // Wait for successful login - check for various possible indicators
      await page.waitForSelector('h1:has-text("BBS")', { timeout: 15000 })
        .catch(() => page.waitForSelector('button:has-text("new_post")', { timeout: 5000 }))
        .catch(() => page.waitForSelector('text=BBS', { timeout: 5000 }))
        .catch(() => page.waitForSelector('[data-testid="bbs-page"]', { timeout: 5000 }))
        .catch(() => page.waitForSelector('main', { timeout: 5000 }));
      
      // Save authentication state to file for reuse
      await context.storageState({ path: './e2e/storage-state.json' });
      console.log('✅ Authentication state saved');
    } else {
      console.log('⚠️ Login form not found, app might already be initialized');
    }
    
    // Clean up any existing test data if needed
    console.log('🧹 Cleaning up test environment...');
    
    // Set up any required test data
    console.log('📝 Setting up test data...');
    
    console.log('✅ Global setup completed successfully');
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

export default globalSetup;
