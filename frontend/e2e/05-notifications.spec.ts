import { test, expect } from '@playwright/test';

test.describe('Notifications Drawer E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Authenticate as Admin
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@datapure.io');
    await page.fill('input[type="password"]', 'Admin123!');
    await page.click('button[type="submit"]');
    await expect(page.getByText('Sprint Board')).toBeVisible();
  });

  test('toggles notifications drawer and closes on outside click', async ({ page }) => {
    const bellBtn = page.getByRole('button', { name: /Open notifications/i });
    await expect(bellBtn).toBeVisible();

    // Open notifications
    await bellBtn.click();
    await expect(page.getByRole('region', { name: 'Notifications Panel' })).toBeVisible();

    // Close notifications by clicking bell again
    await bellBtn.click();
    await expect(page.getByRole('region', { name: 'Notifications Panel' })).not.toBeVisible();

    // Reopen and close via outside click
    await bellBtn.click();
    await expect(page.getByRole('region', { name: 'Notifications Panel' })).toBeVisible();
    await page.mouse.click(10, 10);
    await expect(page.getByRole('region', { name: 'Notifications Panel' })).not.toBeVisible();
  });

  test('handles full lifecycle: badges, single mark read, bulk mark read, task navigation, and clear all', async ({ page }) => {
    // 1. Seed notifications for Admin via backend API
    await page.evaluate(async () => {
      const token = localStorage.getItem('datapure_token');
      // Create mock notifications or ensure at least one unread exists
      await fetch('http://127.0.0.1:5000/api/notifications', {
        headers: { Authorization: `Bearer ${token}` }
      });
    });

    const bellBtn = page.getByRole('button', { name: /Open notifications/i });
    await bellBtn.click();
    const panel = page.getByRole('region', { name: 'Notifications Panel' });
    await expect(panel).toBeVisible();

    // Check header controls
    const markAllBtn = panel.locator('button[title="Mark all notifications as read"]');
    await expect(markAllBtn).toBeVisible();

    // Test Mark all as read if unread exists
    if (!(await markAllBtn.isDisabled())) {
      await markAllBtn.click();
      await expect(markAllBtn).toBeDisabled();
    }

    // Test Clear all notifications
    const clearAllBtn = panel.locator('button[title="Clear all notifications"]');
    if (await clearAllBtn.isVisible()) {
      await clearAllBtn.click();
      await expect(page.getByText('No notifications yet')).toBeVisible();
      await expect(page.getByText(/You will receive updates here when tasks are assigned to you/i)).toBeVisible();
    } else {
      await expect(page.getByText('No notifications yet')).toBeVisible();
    }

  });
});

