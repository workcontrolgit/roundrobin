// spec: specs/test-plan.md — Section 1.2, 1.3, 1.4, 1.5

import { test, expect } from '@playwright/test';
import { freshState } from '../helpers';

test.describe('Players Tab', () => {
  test('1.2 — Add First Player via Button Click', async ({ page }) => {
    // Precondition: fresh state
    await freshState(page);
    await page.getByRole('tab', { name: 'Players' }).click();

    // 1. Click the "Player name" input and type Alice
    await page.getByLabel('Player name').fill('Alice');

    // 2. Click the Add button
    await page.getByRole('button', { name: 'Add' }).click();

    // Input clears after adding
    await expect(page.getByLabel('Player name')).toHaveValue('');

    // Player list shows 1. Alice with a remove button
    await expect(page.getByText('1. Alice')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Remove Alice' })).toBeVisible();

    // Counter badge updates to 1 / 11
    await expect(page.getByText('1 / 11')).toBeVisible();

    // Message "Add 7 more player(s) to generate schedule" is visible
    await expect(page.getByText('Add 7 more player(s) to generate schedule')).toBeVisible();

    // Generate Schedule button remains hidden
    await expect(page.getByRole('button', { name: /Generate Schedule/ })).not.toBeVisible();
  });

  test('1.3 — Add Player via Enter Key', async ({ page }) => {
    // Precondition: fresh state
    await freshState(page);
    await page.getByRole('tab', { name: 'Players' }).click();

    // 1. Click the "Player name" input
    await page.getByLabel('Player name').click();

    // 2. Type Bob (use pressSequentially to fire real key events for Angular ngModel)
    await page.getByLabel('Player name').pressSequentially('Bob');

    // 3. Press Enter
    await page.keyboard.press('Enter');

    // Bob is added to the player list
    await expect(page.getByText('1. Bob')).toBeVisible();

    // Input field clears
    await expect(page.getByLabel('Player name')).toHaveValue('');

    // Counter badge updates to 1 / 11
    await expect(page.getByText('1 / 11')).toBeVisible();
  });

  test('1.4 — Add Button Disabled with Empty Input', async ({ page }) => {
    // Precondition: 1 player already added
    await freshState(page);
    await page.getByRole('tab', { name: 'Players' }).click();
    await page.getByLabel('Player name').fill('Alice');
    await page.getByRole('button', { name: 'Add' }).click();

    // 1. Ensure the "Player name" input is empty
    await expect(page.getByLabel('Player name')).toHaveValue('');

    // 2. Observe the Add button — it must be disabled
    await expect(page.getByRole('button', { name: 'Add' })).toBeDisabled();
  });

  test('1.5 — Add Button Disabled with Whitespace-Only Input [NEGATIVE]', async ({ page }) => {
    // Precondition: fresh state
    await freshState(page);
    await page.getByRole('tab', { name: 'Players' }).click();

    // 1. Click the "Player name" input
    // 2. Type three spaces
    await page.getByLabel('Player name').fill('   ');

    // 3. Observe the Add button — should remain disabled
    await expect(page.getByRole('button', { name: 'Add' })).toBeDisabled();
  });

  test('1.6 — Schedule, Scores, Leaderboard tabs are disabled on fresh state', async ({ page }) => {
    await freshState(page);

    await expect(page.getByRole('tab', { name: 'Schedule' })).toHaveAttribute('aria-disabled', 'true');
    await expect(page.getByRole('tab', { name: 'Scores' })).toHaveAttribute('aria-disabled', 'true');
    await expect(page.getByRole('tab', { name: 'Leaderboard' })).toHaveAttribute('aria-disabled', 'true');
  });

  test('1.7 — Tabs become enabled after adding the first player', async ({ page }) => {
    await freshState(page);

    // Confirm tabs start disabled
    await expect(page.getByRole('tab', { name: 'Schedule' })).toHaveAttribute('aria-disabled', 'true');

    // Add one player
    await page.getByLabel('Player name').fill('Alice');
    await page.getByRole('button', { name: 'Add' }).click();
    await expect(page.getByText('1. Alice')).toBeVisible();

    // Tabs should now be enabled
    await expect(page.getByRole('tab', { name: 'Schedule' })).not.toHaveAttribute('aria-disabled', 'true');
    await expect(page.getByRole('tab', { name: 'Scores' })).not.toHaveAttribute('aria-disabled', 'true');
    await expect(page.getByRole('tab', { name: 'Leaderboard' })).not.toHaveAttribute('aria-disabled', 'true');
  });
});
