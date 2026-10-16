import { test, expect } from '@playwright/test';

test.describe('Kanban Board & Filtering E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Authenticate as Admin
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@datapure.io');
    await page.fill('input[type="password"]', 'Admin123!');
    await page.click('button[type="submit"]');
    await expect(page.getByText('Sprint Board')).toBeVisible();
  });

  test('renders Kanban columns and column headers', async ({ page }) => {
    // Verify standard workflow columns exist on the board
    await expect(page.getByText('To Do', { exact: false }).first()).toBeVisible();
    await expect(page.getByText('In Progress', { exact: false }).first()).toBeVisible();
    await expect(page.getByText('Done', { exact: false }).first()).toBeVisible();
  });

  test('filters task cards reactively via search bar input', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/Search tasks/i);
    await expect(searchInput).toBeVisible();

    // Type query
    await searchInput.fill('NonExistentTaskXYZ999');

    // Wait for debounce and verify board shows 0 results or empty column states
    await page.waitForTimeout(400);
    const visibleCards = page.locator('[role="button"][aria-label^="Task DP-"]');
    await expect(visibleCards).toHaveCount(0);

    // Clear search
    await searchInput.fill('');
    await page.waitForTimeout(400);
  });

  test('switches between Kanban Board and Table View modes seamlessly', async ({ page }) => {
    // Switch to Table View
    const tableViewBtn = page.getByLabel('Switch to Table grid view');
    await tableViewBtn.click();

    // Verify Table headers render
    await expect(page.getByText('Workflow State')).toBeVisible();

    // Switch back to Kanban Board
    const kanbanViewBtn = page.getByLabel('Switch to Kanban board view');
    await kanbanViewBtn.click();

    // Verify columns return
    await expect(page.getByText('To Do', { exact: false })).toBeVisible();
  });
});
