import { test, expect } from '@playwright/test';

test.describe('Student Submission Flow', () => {
  test.use({ viewport: { width: 390, height: 844 } }); // Emulate Mobile Viewport

  test('Student can navigate through submission flow', async ({ page }) => {
    // 1. Visit specific QR token link (Landing)
    await page.goto('/submit/MTH402-2026');
    
    await expect(page.getByText('Midterm 1: Calculus')).toBeVisible();
    await expect(page.getByText('Prof. FPTU')).toBeVisible();
    
    // 2. Start capture
    await page.getByRole('link', { name: 'Authenticate & Continue' }).click();
    
    // 3. Camera capture screen
    await expect(page).toHaveURL(/.*\/capture/);
    await expect(page.getByText('Align paper here')).toBeVisible();
    
    // Click the capture button (the big circle link)
    // Since it's a mockup, it's just a link to confirmation
    await page.getByRole('link').nth(1).click();
    
    // 4. Confirmation screen
    await expect(page).toHaveURL(/.*\/confirm/);
    await expect(page.getByText('Review Scan')).toBeVisible();
    await expect(page.getByText('Looks Good, Upload')).toBeVisible();

    // Confirm upload
    await page.getByText('Looks Good, Upload').click();

    // 5. Success screen
    await expect(page).toHaveURL(/.*\/success/);
    await expect(page.getByText('Upload Complete!')).toBeVisible();
    
    // Click view grade
    await page.getByRole('link', { name: 'View Result & Grading Portal' }).click();
    
    // 6. Grade portal screen
    await expect(page).toHaveURL(/.*\/grade/);
    await expect(page.getByText('Midterm 1: Calculus')).toBeVisible();
    await expect(page.getByText('AI Feedback:')).first().toBeVisible();
  });
});
