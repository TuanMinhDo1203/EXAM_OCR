import { test, expect } from '@playwright/test';

test('Teacher Dashboard Flow', async ({ page }) => {
  // Go to the dashboard
  await page.goto('/dashboard');

  // Verify the page title and basic layout
  await expect(page).toHaveTitle(/EXAM_OCR/);
  await expect(page.getByText('EXAM_OCR', { exact: true })).toBeVisible(); // Sidebar Logo

  // Verify KPI rendering
  await expect(page.getByText('Live Submission Rate')).toBeVisible();

  // Verify Exam Table headers
  await expect(page.getByText('Exam Batch Name')).toBeVisible();

  // Click on 'View Details' for the first exam row
  const viewDetailsButton = page.getByRole('link', { name: 'View Details' }).first();
  await expect(viewDetailsButton).toBeVisible();
  
  // Wait for mock data load before navigating
  await viewDetailsButton.click();

  // Confirm navigation to Batch Details page
  await expect(page).toHaveURL(/\/exams\/exam_\d{3}/);
  await expect(page.getByText('Examinees Progress')).toBeVisible();
});
