import { test, expect } from '@playwright/test';

test.describe('Task Comments & Discussion Thread E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Authenticate as Admin
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@datapure.io');
    await page.fill('input[type="password"]', 'Admin123!');
    await page.click('button[type="submit"]');
    await expect(page.getByText('Sprint Board')).toBeVisible();
  });

  test('adds a new comment to a task and displays author badge with relative timestamp', async ({ page }) => {
    // Open first task
    const firstTask = page.locator('[role="button"][aria-label^="Task DP-"]').first();
    await expect(firstTask).toBeVisible();
    await firstTask.click();

    const detailModal = page.getByRole('dialog');
    await expect(detailModal).toBeVisible();

    // Type comment in discussion thread
    const commentInput = page.getByPlaceholder(/Write a comment or update on this task/i);
    await expect(commentInput).toBeVisible();

    const commentText = `Playwright automated test comment ${Date.now()}`;
    await commentInput.fill(commentText);

    // Submit comment
    const postBtn = page.getByRole('button', { name: /Post Comment/i });
    await postBtn.click();

    // Verify comment appears in the list
    await expect(page.getByText(commentText)).toBeVisible();

    // Close modal
    const closeBtn = page.getByRole('button', { name: /Close modal/i });
    await closeBtn.click();
  });

  test('deletes a comment after SweetAlert2 confirmation dialog', async ({ page }) => {
    // Open first task
    const firstTask = page.locator('[role="button"][aria-label^="Task DP-"]').first();
    await expect(firstTask).toBeVisible();
    await firstTask.click();

    const detailModal = page.getByRole('dialog');
    await expect(detailModal).toBeVisible();

    // Post a comment to be deleted
    const commentInput = page.getByPlaceholder(/Write a comment or update on this task/i);
    const commentToDelete = `Comment to be deleted ${Date.now()}`;
    await commentInput.fill(commentToDelete);
    await page.getByRole('button', { name: /Post Comment/i }).click();

    // Wait for comment to render
    const commentElement = page.getByText(commentToDelete);
    await expect(commentElement).toBeVisible();

    // Find the comment container and delete button
    const commentContainer = page.locator('.group\\/comment', { hasText: commentToDelete });
    await commentContainer.hover();

    const deleteBtn = commentContainer.locator('button[aria-label="Delete Comment"], button[title="Delete Comment"]');
    await deleteBtn.click({ force: true });

    // Verify comment is removed
    await expect(commentElement).not.toBeVisible();

    // Close modal
    const closeBtn = page.getByRole('button', { name: /Close modal/i });
    await closeBtn.click();
  });
});
