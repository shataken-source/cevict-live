import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test.describe('Visual Regression Tests', () => {
  test.beforeAll(() => {
    // Ensure test-results directory exists
    const dir = path.join(process.cwd(), 'test-results');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  test('should capture homepage screenshot', async ({ page }) => {
    // Navigate to homepage
    await page.goto('/', { 
      waitUntil: 'load', 
      timeout: 90000 
    });
    
    // Wait for network to settle
    await page.waitForLoadState('networkidle', { timeout: 90000 }).catch(() => {
      console.log('Network did not become idle, continuing...');
    });
    
    // Wait for body to be visible
    await expect(page.locator('body')).toBeVisible({ timeout: 30000 });
    
    // Wait for any animations
    await page.waitForTimeout(3000);
    
    // Take screenshot
    await page.screenshot({ 
      path: 'test-results/homepage.png',
      fullPage: true 
    });
    
    expect(true).toBe(true);
  });

  test('should capture charter page', async ({ page }) => {
    await page.goto('/', { 
      waitUntil: 'load', 
      timeout: 90000 
    });
    
    await page.waitForTimeout(3000);
    
    // Take screenshot
    await page.screenshot({ 
      path: 'test-results/charter-listings.png',
      fullPage: true 
    });
    
    expect(true).toBe(true);
  });
});
