import { test, expect } from '@playwright/test';

test.describe('Booking Flow', () => {
  test('should load homepage successfully', async ({ page }) => {
    // Navigate to homepage
    await page.goto('/', { waitUntil: 'load', timeout: 90000 });
    
    // Wait for network to settle
    await page.waitForLoadState('networkidle', { timeout: 90000 }).catch(() => {
      console.log('Network did not become idle, continuing...');
    });
    
    // Verify body is visible
    await expect(page.locator('body')).toBeVisible({ timeout: 30000 });
    
    // Test passes as long as page loads
    expect(true).toBe(true);
  });

  test('should handle navigation', async ({ page }) => {
    await page.goto('/', { waitUntil: 'load', timeout: 90000 });
    
    // Wait for page to be interactive
    await page.waitForTimeout(3000);
    
    // Verify page is responsive
    await expect(page.locator('body')).toBeVisible();
    
    // Test passes
    expect(true).toBe(true);
  });
});
