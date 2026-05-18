// spec: docs/superpowers/plans/2026-05-18-session-reset-and-player-guard.md — Tests 7.1–7.6

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

});
