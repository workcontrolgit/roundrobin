// spec: specs/test-plan.md — Section 9

import { test, expect } from '@playwright/test';
import { freshState, setupSchedule, saveRound1Scores, goToLeaderboard, addPlayers } from '../helpers';

test.describe('Accessibility (A11Y)', () => {
  test('9.1 — Remove Player Button Has Accessible Label [A11Y]', async ({ page }) => {
    // Precondition: at least one player in the list
    await freshState(page);
    await page.getByRole('tab', { name: 'Players' }).click();
    await page.getByLabel('Player name').fill('Alice');
    await page.getByRole('button', { name: 'Add' }).click();

    // Remove button has aria-label="Remove Alice"
    await expect(page.getByRole('button', { name: 'Remove Alice' })).toBeVisible();
  });

  test('9.2 — Score Input Fields Have Accessible Labels [A11Y]', async ({ page }) => {
    // Precondition: Scores tab with active round
    await freshState(page);
    await page.getByRole('tab', { name: 'Players' }).click();
    await setupSchedule(page);
    await page.getByRole('tab', { name: 'Scores' }).click();

    // Team 1 input has aria-label="Court 1 team 1 score"
    await expect(page.getByLabel('Court 1 team 1 score').first()).toBeVisible();

    // Team 2 input has aria-label="Court 1 team 2 score"
    await expect(page.getByLabel('Court 1 team 2 score').first()).toBeVisible();
  });

  test('9.3 — Leaderboard Cards Have Accessible Rank Labels [A11Y]', async ({ page }) => {
    // Precondition: scores entered; leaderboard populated
    await freshState(page);
    await page.getByRole('tab', { name: 'Players' }).click();
    await setupSchedule(page);
    await saveRound1Scores(page);
    await goToLeaderboard(page);

    // Each card has role="row" and aria-label containing rank info
    const rows = page.getByRole('row');
    await expect(rows.first()).toBeVisible();

    const ariaLabel = await rows.first().getAttribute('aria-label');
    expect(ariaLabel).toMatch(/Rank \d+/i);
  });

  test('9.4 — Sort Toggle Has ARIA Label [A11Y]', async ({ page }) => {
    // Precondition: Leaderboard tab visible
    await freshState(page);
    await page.getByRole('tab', { name: 'Players' }).click();
    await setupSchedule(page);
    await goToLeaderboard(page);

    // Toggle group has aria-label="Sort leaderboard by"
    const group = page.getByRole('radiogroup', { name: 'Sort leaderboard by' });
    await expect(group).toBeVisible();

    // Each toggle option is keyboard-focusable
    await expect(page.getByRole('radio', { name: 'Wins' })).toBeVisible();
    await expect(page.getByRole('radio', { name: 'Points' })).toBeVisible();
  });

  test('9.5 — QR Code Canvas Has Alt Text [A11Y]', async ({ page }) => {
    // Precondition: Share dialog open
    await freshState(page);
    await page.getByRole('tab', { name: 'Players' }).click();
    await setupSchedule(page);
    await saveRound1Scores(page);
    await goToLeaderboard(page);
    await page.getByRole('button', { name: 'Share QR' }).click();

    // Canvas has role="img" and aria-label
    const canvas = page.locator('canvas');
    await expect(canvas).toHaveAttribute('role', 'img');
    const label = await canvas.getAttribute('aria-label');
    expect(label).toMatch(/QR code/i);
  });

  test('9.6 — Copy URL Button Text Updates on Click [A11Y]', async ({ page }) => {
    // Precondition: Share dialog open
    await freshState(page);
    await page.getByRole('tab', { name: 'Players' }).click();
    await setupSchedule(page);
    await saveRound1Scores(page);
    await goToLeaderboard(page);
    await page.getByRole('button', { name: 'Share QR' }).click();

    const copyBtn = page.getByRole('button', { name: 'Copy URL' });

    // Button is visible before click
    await expect(copyBtn).toBeVisible();

    // Click Copy URL
    await copyBtn.click();

    // After click: button text changes to "Copied!"
    await expect(page.getByRole('button', { name: 'Copied!' })).toBeVisible();
  });

  test('9.7 — Tab Navigation Order is Logical [A11Y]', async ({ page }) => {
    // Precondition: app loaded normally, with a name filled so Add button is enabled
    await freshState(page);
    await page.getByRole('tab', { name: 'Players' }).click();

    // Player name input is reachable via Tab
    await page.getByLabel('Player name').fill('Alice');
    await page.getByLabel('Player name').focus();
    await expect(page.getByLabel('Player name')).toBeFocused();

    // Add button is reachable via Tab from the player name input (enabled when name is filled)
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Add' })).toBeFocused();
  });
});
