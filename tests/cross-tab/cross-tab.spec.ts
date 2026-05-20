// spec: specs/test-plan.md — Section 10

import { test, expect } from '@playwright/test';
import {
  freshState, setupSchedule, saveRound1Scores,
  goToScores, goToSchedule, goToLeaderboard, addPlayers, EIGHT_PLAYERS,
} from '../helpers';

test.describe('Cross-Tab Reactivity', () => {
  test('10.1 — Schedule Tab Reflects Scores Without Manual Refresh', async ({ page }) => {
    // Precondition: Schedule tab is visible, Round 1 active
    await freshState(page);
    await page.getByRole('tab', { name: 'Players' }).click();
    await setupSchedule(page);

    // Switch to Scores tab and save both courts for Round 1
    await saveRound1Scores(page, [11, 7], [9, 11]);

    // Switch back to Schedule tab
    await goToSchedule(page);

    // Round 1 immediately shows COMPLETED badge (no page reload required)
    await expect(page.locator('.round-card').first().getByText('COMPLETED')).toBeVisible();

    // Round 2 shows ACTIVE badge
    await expect(page.locator('.round-card').nth(1).getByText('ACTIVE')).toBeVisible();

    // Round 1 shows inline scores
    await expect(page.locator('.round-card').first().getByText('11–7')).toBeVisible();
  });

  // The app intentionally disables the Remove button when a schedule is generated (player guard).
  // Player removal after schedule generation is no longer possible via the UI.
  test.fixme('10.2 — App Handles Player Removal After Schedule Generated [EDGE]', async ({ page }) => {
    // Precondition: 8 players, schedule generated, Round 1 scored. Leaderboard shows 8 entries.
    await freshState(page);
    await page.getByRole('tab', { name: 'Players' }).click();
    await setupSchedule(page);
    await saveRound1Scores(page);
    await goToLeaderboard(page);

    // Note: Leaderboard shows 8 entries
    await expect(page.getByText('🥇')).toBeVisible();

    // Switch to Players tab and remove one player
    await page.getByRole('tab', { name: 'Players' }).click();
    await page.getByRole('button', { name: `Remove ${EIGHT_PLAYERS[7]}` }).click();

    // App should not throw a JavaScript error
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));

    // Leaderboard should handle missing player gracefully
    await goToLeaderboard(page);
    expect(errors).toHaveLength(0);
  });

  test('10.3 — Counter Badge Stays in Sync After Add/Remove', async ({ page }) => {
    // Precondition: 5 players in list
    await freshState(page);
    await page.getByRole('tab', { name: 'Players' }).click();
    await addPlayers(page, EIGHT_PLAYERS.slice(0, 5));

    // 1. Add one player → badge shows 6 / 11
    await page.getByLabel('Player name').fill('Frank');
    await page.getByRole('button', { name: 'Add' }).click();
    await expect(page.getByText('6 / 11')).toBeVisible();

    // 2. Remove one player → badge shows 5 / 11
    await page.getByRole('button', { name: 'Remove Frank' }).click();
    await expect(page.getByText('5 / 11')).toBeVisible();

    // 3. Add three players → badge shows 8 / 11
    await addPlayers(page, ['Frank', 'Grace', 'Hank']);
    await expect(page.getByText('8 / 11')).toBeVisible();
  });
});
