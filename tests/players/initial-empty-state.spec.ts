// spec: specs/test-plan.md — Section 1.1

import { test, expect } from '@playwright/test';
import { freshState } from '../helpers';

const BASE_URL = 'http://localhost:4200/roundrobin';

test.describe('Players Tab', () => {
  test('1.1 — Initial Empty State', async ({ page }) => {
    // 1. Navigate to the app with fresh state
    await freshState(page);

    // 2. Click the Players tab
    await page.getByRole('tab', { name: 'Players' }).click();

    // 3. Observe the heading, player count badge, input field, Add button, Generate Schedule button
    await expect(page.getByRole('heading', { name: 'Players' })).toBeVisible();

    // Counter badge shows 0 / 11
    await expect(page.getByText('0 / 11')).toBeVisible();

    // "Player name" input is visible and empty
    const input = page.getByLabel('Player name');
    await expect(input).toBeVisible();
    await expect(input).toHaveValue('');

    // Add button is disabled (input is empty)
    await expect(page.getByRole('button', { name: 'Add' })).toBeDisabled();

    // Generate Schedule button is not visible (fewer than 8 players)
    await expect(page.getByRole('button', { name: /Generate Schedule/ })).not.toBeVisible();

    // Placeholder message is displayed
    await expect(page.getByText('Add 8–11 players to get started.')).toBeVisible();
  });
});
