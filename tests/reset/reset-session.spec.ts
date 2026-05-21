// spec: docs/superpowers/plans/2026-05-18-session-reset-and-player-guard.md — Tests 7.1–7.8

import { test, expect } from '@playwright/test';
import { freshState, addPlayers, goToSchedule, goToPlayers, goToLeaderboard, EIGHT_PLAYERS } from '../helpers';

test.describe('Session Reset & Player Guard', () => {

  test('7.1 Regenerate Schedule clears rounds and scores but keeps players', async ({ page }) => {
    await freshState(page);
    await addPlayers(page, EIGHT_PLAYERS);
    await page.getByRole('button', { name: /Generate Schedule/i }).click();
    await goToSchedule(page);
    await expect(page.getByText('Round 1')).toBeVisible();

    await page.getByRole('button', { name: /Regenerate Schedule/i }).click();
    await page.locator('mat-dialog-actions button', { hasText: 'Regenerate' }).click();

    await expect(page.getByText('Round 1')).not.toBeVisible();
    await goToPlayers(page);
    await expect(page.getByText(EIGHT_PLAYERS[0])).toBeVisible();
  });

  test('7.2 Cancel Regenerate Schedule keeps data intact', async ({ page }) => {
    await freshState(page);
    await addPlayers(page, EIGHT_PLAYERS);
    await page.getByRole('button', { name: /Generate Schedule/i }).click();
    await goToSchedule(page);
    await expect(page.getByText('Round 1')).toBeVisible();

    await page.getByRole('button', { name: /Regenerate Schedule/i }).click();
    await page.locator('mat-dialog-actions button', { hasText: 'Cancel' }).click();

    await expect(page.getByText('Round 1')).toBeVisible();
  });

  test('7.3 Reset Session clears players and rounds', async ({ page }) => {
    await freshState(page);
    await addPlayers(page, EIGHT_PLAYERS);
    await goToLeaderboard(page);

    await page.getByRole('button', { name: /Reset Session/i }).click();
    await page.locator('mat-dialog-actions button', { hasText: 'Reset' }).click();

    await goToPlayers(page);
    await expect(page.getByText(EIGHT_PLAYERS[0])).not.toBeVisible();
  });

  test('7.4 Cancel Reset Session keeps data intact', async ({ page }) => {
    await freshState(page);
    await addPlayers(page, EIGHT_PLAYERS);
    await goToLeaderboard(page);

    await page.getByRole('button', { name: /Reset Session/i }).click();
    await page.locator('mat-dialog-actions button', { hasText: 'Cancel' }).click();

    await goToPlayers(page);
    await expect(page.getByText(EIGHT_PLAYERS[0])).toBeVisible();
  });

  test('7.5 Delete player button is disabled after schedule is generated', async ({ page }) => {
    await freshState(page);
    await addPlayers(page, EIGHT_PLAYERS);
    await page.getByRole('button', { name: /Generate Schedule/i }).click();

    await goToPlayers(page);
    const deleteBtn = page.getByRole('button', { name: new RegExp(`Remove ${EIGHT_PLAYERS[0]}`, 'i') });
    await expect(deleteBtn).toBeDisabled();
  });

  test('7.6 Delete player button is enabled before schedule is generated', async ({ page }) => {
    await freshState(page);
    await addPlayers(page, EIGHT_PLAYERS);

    const deleteBtn = page.getByRole('button', { name: new RegExp(`Remove ${EIGHT_PLAYERS[0]}`, 'i') });
    await expect(deleteBtn).toBeEnabled();
  });

  test('7.7 Delete last session disables tabs and shows Players tab', async ({ page }) => {
    await freshState(page);
    await addPlayers(page, EIGHT_PLAYERS);

    // Open session drawer
    await page.getByRole('button', { name: 'Open session drawer' }).click();
    await expect(page.locator('mat-bottom-sheet-container')).toBeVisible();

    // Click delete on session 1
    await page.getByRole('button', { name: /delete/i }).first().click();
    // Confirm the delete dialog
    await page.locator('mat-dialog-actions button', { hasText: 'Delete' }).click();

    // App should be on Players tab
    await expect(page.getByRole('tab', { name: 'Players' })).toHaveAttribute('aria-selected', 'true');

    // Other tabs should be disabled
    await expect(page.getByRole('tab', { name: 'Schedule' })).toHaveAttribute('aria-disabled', 'true');
    await expect(page.getByRole('tab', { name: 'Scores' })).toHaveAttribute('aria-disabled', 'true');
    await expect(page.getByRole('tab', { name: 'Leaderboard' })).toHaveAttribute('aria-disabled', 'true');
  });

  test('7.8 Adding a player after delete creates a new session and re-enables tabs', async ({ page }) => {
    await freshState(page);
    await addPlayers(page, EIGHT_PLAYERS);

    // Open session drawer and delete session 1
    await page.getByRole('button', { name: 'Open session drawer' }).click();
    await expect(page.locator('mat-bottom-sheet-container')).toBeVisible();
    await page.getByRole('button', { name: /delete/i }).first().click();
    await page.locator('mat-dialog-actions button', { hasText: 'Delete' }).click();

    // No active session — navigate to Players and add a new player
    await goToPlayers(page);
    await page.getByLabel('Player name').fill('Zara');
    await page.getByRole('button', { name: 'Add' }).click();
    await expect(page.getByText('1. Zara')).toBeVisible();

    // Tabs should be enabled again
    await expect(page.getByRole('tab', { name: 'Schedule' })).not.toHaveAttribute('aria-disabled', 'true');
    await expect(page.getByRole('tab', { name: 'Scores' })).not.toHaveAttribute('aria-disabled', 'true');
    await expect(page.getByRole('tab', { name: 'Leaderboard' })).not.toHaveAttribute('aria-disabled', 'true');
  });

});
