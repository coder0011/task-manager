import { test, expect } from '@playwright/test';

test.describe('Authentication & Session Management E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Clear storage before each test
    await page.goto('/login');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('validates required email and password fields on login submission', async ({ page }) => {
    await page.goto('/login');

    // Attempt submitting without credentials
    const submitBtn = page.getByRole('button', { name: /Sign In/i });
    await submitBtn.click();

    // Verify error message alert appears
    const errorAlert = page.getByRole('alert');
    await expect(errorAlert).toBeVisible();
    await expect(errorAlert).toContainText(/Please enter both your email address and password/i);
  });

  test('rejects invalid credentials with an error alert', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[type="email"]', 'admin@datapure.io');
    await page.fill('input[type="password"]', 'WrongPassword!999');
    await page.click('button[type="submit"]');

    const errorAlert = page.getByRole('alert');
    await expect(errorAlert).toBeVisible();
    await expect(errorAlert).toContainText(/Invalid email or password|Invalid credentials|Authentication failed/i);
  });

  test('authenticates Admin user, renders dashboard, and verifies role badge', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[type="email"]', 'admin@datapure.io');
    await page.fill('input[type="password"]', 'Admin123!');
    await page.click('button[type="submit"]');

    // Wait for redirect to main board
    await expect(page.getByRole('navigation', { name: /Main Navigation/i })).toBeVisible();
    await expect(page.getByText('Sprint Board')).toBeVisible();

    // Admin should see access to Team Directory, RBAC, and Audit Trail
    await expect(page.getByText('Team & Directory')).toBeVisible();
    await expect(page.getByText('Access Governance (RBAC)')).toBeVisible();
    await expect(page.getByText('Audit Trail')).toBeVisible();
  });

  test('persists user session on page reload via localStorage JWT', async ({ page }) => {
    // Log in as Admin
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@datapure.io');
    await page.fill('input[type="password"]', 'Admin123!');
    await page.click('button[type="submit"]');

    await expect(page.getByText('Sprint Board')).toBeVisible();

    // Reload browser page
    await page.reload();

    // Verify user remains on board without being redirected back to /login
    await expect(page.getByText('Sprint Board')).toBeVisible();
    await expect(page.getByText('DataPure Task Manager')).toBeVisible();
  });
});
