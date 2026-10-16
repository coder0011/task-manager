import { test, expect } from '@playwright/test';

test.describe('Task Lifecycle E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Authenticate as Admin
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@datapure.io');
    await page.fill('input[type="password"]', 'Admin123!');
    await page.click('button[type="submit"]');
    await expect(page.getByText('Sprint Board')).toBeVisible();
  });

  test('creates a new task through the task modal and displays it on the board', async ({ page }) => {
    // Open New Task modal
    const newTaskBtn = page.getByRole('button', { name: /New Task/i });
    await newTaskBtn.click();

    // Verify modal is visible
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();
    await expect(page.getByText('Create New Task')).toBeVisible();

    // Fill Title
    const titleInput = page.getByPlaceholder(/Design token synchronization pipeline/i);
    const testTitle = `Playwright Automated Task ${Date.now()}`;
    await titleInput.fill(testTitle);

    // Fill Description
    const descInput = page.locator('textarea[id*="desc"]');
    if (await descInput.isVisible()) {
      await descInput.fill('Task created automatically via Playwright browser test');
    }

    // Submit form
    const createBtn = page.getByRole('button', { name: /Create Task/i });
    await createBtn.click();

    // Verify modal closed
    await expect(modal).not.toBeVisible();

    // Verify newly created task card is displayed on the board
    await expect(page.getByText(testTitle)).toBeVisible();
  });

  test('opens task details modal on clicking task card', async ({ page }) => {
    // Click any visible task card
    const firstTask = page.locator('[role="button"][aria-label^="Task DP-"]').first();
    await expect(firstTask).toBeVisible();
    await firstTask.click();

    // Verify Task Detail Modal opens
    const detailModal = page.getByRole('dialog');
    await expect(detailModal).toBeVisible();
    await expect(page.getByText('Overview')).toBeVisible();

    // Close modal
    const closeBtn = page.getByRole('button', { name: /Close modal/i });
    await closeBtn.click();
    await expect(detailModal).not.toBeVisible();
  });
});
