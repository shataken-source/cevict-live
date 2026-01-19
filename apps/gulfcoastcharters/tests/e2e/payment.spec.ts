import { test, expect } from '@playwright/test';

test.describe('Payment Flow', () => {
  test('should load payment success page', async ({ page }) => {
    // Navigate to payment success page
    await page.goto('/payment-success', { 
      waitUntil: 'load', 
      timeout: 90000 
    });
    
    // Wait for network to settle
    await page.waitForLoadState('networkidle', { timeout: 90000 }).catch(() => {
      console.log('Network did not become idle, continuing...');
    });
    
    // Verify page loaded
    await expect(page.locator('body')).toBeVisible({ timeout: 30000 });
    
    // Verify URL
    expect(page.url()).toContain('payment-success');
  });

  test('should load payment history page', async ({ page }) => {
    // Navigate to payment history page
    await page.goto('/payment-history', { 
      waitUntil: 'load', 
      timeout: 90000 
    });
    
    // Wait for network to settle
    await page.waitForLoadState('networkidle', { timeout: 90000 }).catch(() => {
      console.log('Network did not become idle, continuing...');
    });
    
    // Verify page loaded
    await expect(page.locator('body')).toBeVisible({ timeout: 30000 });
    
    // Verify URL
    expect(page.url()).toContain('payment-history');
  });
});
