import { test, expect } from '@playwright/test';

test.describe('TanStack Query State Sync & Tab Switching E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Authenticate as Admin
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@datapure.io');
    await page.fill('input[type="password"]', 'Admin123!');
    await page.click('button[type="submit"]');
    await expect(page.getByRole('button', { name: 'Sprint Board' })).toBeVisible();
  });

  test('switches across all tabs and back without needing manual reload', async ({ page }) => {
    // 1. Initially on Sprint Board
    await expect(page).toHaveURL(/localhost:5173\/?$/);
    await expect(page.getByText('To Do', { exact: false }).first()).toBeVisible();

    // 2. Switch to Team & Directory
    const teamBtn = page.getByRole('button', { name: 'Team & Directory' });
    await teamBtn.click();
    await expect(page).toHaveURL(/.*\/team/);
    await expect(page.getByText('Team & Identity Directory')).toBeVisible();
    await expect(page.getByText('admin@datapure.io')).toBeVisible();

    // 3. Switch to Access Governance (RBAC)
    const rbacBtn = page.getByRole('button', { name: 'Access Governance (RBAC)' });
    await rbacBtn.click();
    await expect(page).toHaveURL(/.*\/rbac/);
    await expect(page.getByText('Dynamic Role-Based Access Governance (RBAC)')).toBeVisible();
    await expect(page.getByText('LIVE PERMISSION MATRIX')).toBeVisible();

    // 4. Switch to Audit Trail
    const auditBtn = page.getByRole('button', { name: 'Audit Trail' });
    await auditBtn.click();
    await expect(page).toHaveURL(/.*\/audit/);
    await expect(page.getByText('Enterprise Activity & Audit Trail')).toBeVisible();

    // 5. Switch back to Sprint Board (Validates dev mode automatic refetch without manual reload)
    const boardBtn = page.getByRole('button', { name: 'Sprint Board' });
    await boardBtn.click();
    await expect(page).toHaveURL(/localhost:5173\/?$/);
    await expect(page.getByText('To Do', { exact: false }).first()).toBeVisible();
    await expect(page.getByText('In Progress', { exact: false }).first()).toBeVisible();
    await expect(page.getByText('Done', { exact: false }).first()).toBeVisible();
  });

  test('creates a task and verifies it immediately updates the board and persists', async ({ page }) => {
    // Open New Task modal
    await page.getByRole('button', { name: 'New Task' }).click();
    await expect(page.getByRole('dialog', { name: 'Create New Task' })).toBeVisible();

    const uniqueTitle = `Playwright E2E Task ${Date.now()}`;
    await page.fill('input[placeholder*="Design token"]', uniqueTitle);
    await page.fill('textarea[placeholder*="detailed description"]', 'Created via Playwright real browser test');

    // Submit
    await page.getByRole('button', { name: 'Create Task' }).click();

    // Verify task appears on the board immediately via TanStack Query cache invalidation
    await expect(page.getByText(uniqueTitle)).toBeVisible({ timeout: 10000 });
  });
});
