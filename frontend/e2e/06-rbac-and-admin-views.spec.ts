import { test, expect } from '@playwright/test';

test.describe('Administrative & RBAC Governance Views E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Authenticate as Admin
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@datapure.io');
    await page.fill('input[type="password"]', 'Admin123!');
    await page.click('button[type="submit"]');
    await expect(page.getByText('Sprint Board')).toBeVisible();
  });

  test('navigates to Team & Directory view and renders user list', async ({ page }) => {
    const teamTab = page.getByText('Team & Directory');
    await teamTab.click();

    // Verify team directory header or controls
    await expect(page.getByText('Team & Identity Directory')).toBeVisible();
    await expect(page.getByText('admin@datapure.io')).toBeVisible();
  });

  test('navigates to Access Governance (RBAC) view and renders permissions matrix', async ({ page }) => {
    const rbacTab = page.getByText('Access Governance (RBAC)');
    await rbacTab.click();

    // Verify RBAC roles and permissions grid
    await expect(page.getByText('Role-Based Access Governance')).toBeVisible();
  });

  test('navigates to Audit Trail view and renders mutation activity logs', async ({ page }) => {
    const auditTab = page.getByText('Audit Trail');
    await auditTab.click();

    // Verify activity logs view header
    await expect(page.getByText('Enterprise Activity & Audit Trail')).toBeVisible();
  });
});
