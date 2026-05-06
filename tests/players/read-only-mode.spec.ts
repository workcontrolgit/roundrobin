// spec: specs/test-plan.md — Section 1.13

import { test, expect } from '@playwright/test';
import { generateShareUrl } from '../helpers';

test.describe('Players Tab', () => {
  test('1.13 — Players Tab in Read-Only Mode', async ({ page }) => {
    // Precondition: navigate to the app with a valid URL hash
    const shareUrl = await generateShareUrl(page);

    // Navigate to the share URL (read-only mode)
    await page.goto(shareUrl);

    // Click the Players tab
    await page.getByRole('tab', { name: 'Players' }).click();

    // "Player name" input is not visible
    await expect(page.getByLabel('Player name')).not.toBeVisible();

    // Add button is not visible
    await expect(page.getByRole('button', { name: 'Add' })).not.toBeVisible();

    // Generate Schedule button is not visible
    await expect(page.getByRole('button', { name: /Generate Schedule/ })).not.toBeVisible();

    // Remove buttons are not visible
    await expect(page.getByRole('button', { name: /^Remove / })).not.toBeVisible();

    // Players are displayed in read-only list format
    await expect(page.getByText('1. Alice')).toBeVisible();
  });
});
