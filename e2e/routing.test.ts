import { test, expect } from '@playwright/test';

test.describe('SPA Routing', () => {
  test('loads the index page successfully', async ({ page }) => {
    // Navigate to the root
    await page.goto('/');

    // Wait for network to be idle
    await page.waitForLoadState('networkidle');

    // Make sure we didn't get a 404
    const content = await page.content();
    expect(content.toLowerCase()).not.toContain('404');
    
    // Check if the page title or basic rendering worked
    // (Assuming there is an element with an id like #root or standard Expo layout)
    await expect(page.locator('body')).toBeVisible();
  });

  test('loads a subpage (e.g. /login) without 404 via direct navigation', async ({ page }) => {
    // Navigate to a specific route directly to test static server SPA fallback
    await page.goto('/login');

    // Wait for network to be idle
    await page.waitForLoadState('networkidle');

    // Make sure we didn't get a 404
    const content = await page.content();
    expect(content.toLowerCase()).not.toContain('404');
    expect(content.toLowerCase()).not.toContain('not found');

    await expect(page.locator('body')).toBeVisible();
  });
});
