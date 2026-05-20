// spec: specs/test-plan.md — Section 4

import { test, expect } from '@playwright/test';
import {
  freshState, setupSchedule, saveRound1Scores,
  goToLeaderboard, goToScores, generateShareUrl,
} from '../helpers';

test.describe('Leaderboard Tab', () => {
  test('4.1 — Leaderboard Empty State (No Scores)', async ({ page }) => {
    // Precondition: 8 players added, schedule generated, no scores entered
    await freshState(page);
    await page.getByRole('tab', { name: 'Players' }).click();
    await setupSchedule(page);

    // Click the Leaderboard tab
    await goToLeaderboard(page);

    // Message: "No scores recorded yet."
    await expect(page.getByText('No scores recorded yet.')).toBeVisible();

    // No player cards shown
    await expect(page.locator('[role="row"]').first()).not.toBeVisible();

    // Sort by Wins toggle is selected by default
    await expect(page.getByRole('radio', { name: 'Wins' })).toBeChecked();

    // Share QR button is visible
    await expect(page.getByRole('button', { name: 'Share QR' })).toBeVisible();

    // Reset Session button is visible
    await expect(page.getByRole('button', { name: 'Reset Session' })).toBeVisible();
  });

  test('4.2 — Leaderboard Populates After Round 1 Scored', async ({ page }) => {
    // Precondition: Round 1 fully scored (Court 1: 11–7, Court 2: 9–11)
    await freshState(page);
    await page.getByRole('tab', { name: 'Players' }).click();
    await setupSchedule(page);
    await saveRound1Scores(page, [11, 7], [9, 11]);

    // Click the Leaderboard tab
    await goToLeaderboard(page);

    // 8 player cards appear ranked by wins
    const cards = page.locator('[role="row"]');
    await expect(cards).toHaveCount(8);

    // Top 3 show medal emojis
    await expect(page.getByText('🥇')).toBeVisible();
    await expect(page.getByText('🥈')).toBeVisible();
    await expect(page.getByText('🥉')).toBeVisible();

    // Badge on each card shows "XW" (wins count)
    await expect(page.getByText(/\dW/).first()).toBeVisible();

    // Players with wins rank above players with 0 wins
    await expect(cards.first().getByText(/1W/)).toBeVisible();
  });

  test('4.3 — Sort by Points', async ({ page }) => {
    // Precondition: Round 1 scored
    await freshState(page);
    await page.getByRole('tab', { name: 'Players' }).click();
    await setupSchedule(page);
    await saveRound1Scores(page);
    await goToLeaderboard(page);

    // 1. Click Sort by Points toggle
    await page.getByRole('radio', { name: 'Points' }).click();
    await expect(page.getByRole('radio', { name: 'Points' })).toBeChecked();

    // Badge changes to show "Xpts" instead of "XW"
    await expect(page.getByText(/\dpts/).first()).toBeVisible();
  });

  test('4.4 — Sort by Wins (Toggle Back)', async ({ page }) => {
    // Precondition: currently sorted by Points
    await freshState(page);
    await page.getByRole('tab', { name: 'Players' }).click();
    await setupSchedule(page);
    await saveRound1Scores(page);
    await goToLeaderboard(page);

    await page.getByRole('radio', { name: 'Points' }).click();

    // Click Sort by Wins toggle
    await page.getByRole('radio', { name: 'Wins' }).click();
    await expect(page.getByRole('radio', { name: 'Wins' })).toBeChecked();

    // Badge reverts to "XW" format
    await expect(page.getByText(/\dW/).first()).toBeVisible();
  });

  test('4.5 — Medal Display for Top 3', async ({ page }) => {
    // Precondition: Round 1 scored creating distinct win totals
    await freshState(page);
    await page.getByRole('tab', { name: 'Players' }).click();
    await setupSchedule(page);
    await saveRound1Scores(page, [11, 7], [9, 11]);
    await goToLeaderboard(page);

    await expect(page.getByText('🥇')).toBeVisible();
    await expect(page.getByText('🥈')).toBeVisible();
    await expect(page.getByText('🥉')).toBeVisible();

    // Ranks 4+ show numeric rank, not medal emoji
    const cards = page.locator('[role="row"]');
    const fourthCardText = await cards.nth(3).textContent();
    expect(fourthCardText).not.toContain('🥇');
    expect(fourthCardText).not.toContain('🥈');
    expect(fourthCardText).not.toContain('🥉');
    expect(fourthCardText).toMatch(/[4-8]/);
  });

  test('4.6 — Leaderboard Stats Accuracy', async ({ page }) => {
    // Precondition: Round 1 scored — Court 1 = 11–7 (Team A wins), Court 2 = 9–11 (Team B wins)
    // EIGHT_PLAYERS: Alice, Bob, Charlie, Diana, Eve, Frank, Grace, Hank
    // Court 1: Alice & Bob (11 pts, win) vs Charlie & Diana (7 pts, loss)
    // Court 2: Eve & Frank (9 pts, loss) vs Grace & Hank (11 pts, win)
    await freshState(page);
    await page.getByRole('tab', { name: 'Players' }).click();
    await setupSchedule(page);
    await saveRound1Scores(page, [11, 7], [9, 11]);
    await goToLeaderboard(page);

    // Alice (Court 1 winner): 1 win, 11 pts
    const aliceCard = page.locator('[role="row"]', { hasText: 'Alice' });
    await expect(aliceCard).toBeVisible();
    await expect(aliceCard.getByText(/1W/)).toBeVisible();
    await expect(aliceCard.getByText(/11\s*pts/i)).toBeVisible();

    // Grace (Court 2 winner): 1 win, 11 pts
    const graceCard = page.locator('[role="row"]', { hasText: 'Grace' });
    await expect(graceCard.getByText(/1W/)).toBeVisible();

    // Charlie (Court 1 loser): 0 wins, 7 pts
    const charlieCard = page.locator('[role="row"]', { hasText: 'Charlie' });
    await expect(charlieCard.getByText(/0W/)).toBeVisible();
    await expect(charlieCard.getByText(/7\s*pts/i)).toBeVisible();

    // Eve (Court 2 loser): 0 wins, 9 pts
    const eveCard = page.locator('[role="row"]', { hasText: 'Eve' });
    await expect(eveCard.getByText(/0W/)).toBeVisible();
    await expect(eveCard.getByText(/9\s*pts/i)).toBeVisible();
  });

  test('4.7 — Reset Session Confirmation — Cancel', async ({ page }) => {
    // Precondition: players and schedule exist
    await freshState(page);
    await page.getByRole('tab', { name: 'Players' }).click();
    await setupSchedule(page);
    await goToLeaderboard(page);

    // 1. Click Reset Session, then Cancel
    await page.getByRole('button', { name: 'Reset Session' }).click();
    await page.locator('mat-dialog-actions button', { hasText: 'Cancel' }).click();

    // Session data remains intact
    await page.getByRole('tab', { name: 'Players' }).click();
    await expect(page.getByText('8 / 11')).toBeVisible();

    await page.getByRole('tab', { name: 'Schedule' }).click();
    await expect(page.getByText('Round 1')).toBeVisible();
  });

  test('4.8 — Reset Session Confirmation — Confirm', async ({ page }) => {
    // Precondition: players, schedule, and scores exist
    await freshState(page);
    await page.getByRole('tab', { name: 'Players' }).click();
    await setupSchedule(page);
    await saveRound1Scores(page);
    await goToLeaderboard(page);

    // 1. Click Reset Session, then OK
    await page.getByRole('button', { name: 'Reset Session' }).click();
    await page.locator('mat-dialog-actions button', { hasText: 'Reset' }).click();

    // Players tab shows 0 / 11
    await page.getByRole('tab', { name: 'Players' }).click();
    await expect(page.getByText('0 / 11')).toBeVisible();

    // Schedule tab shows empty state
    await page.getByRole('tab', { name: 'Schedule' }).click();
    await expect(page.getByText('Add 8–11 players on the Players tab and generate a schedule.')).toBeVisible();

    // Scores tab shows empty state
    await page.getByRole('tab', { name: 'Scores' }).click();
    await expect(page.getByText('Generate a schedule first.')).toBeVisible();

    // Leaderboard shows no scores
    await goToLeaderboard(page);
    await expect(page.getByText('No scores recorded yet.')).toBeVisible();
  });

  test('4.9 — Leaderboard in Read-Only Mode', async ({ page }) => {
    // Precondition: navigate to app via a valid URL hash
    const shareUrl = await generateShareUrl(page);
    await page.goto(shareUrl);
    await goToLeaderboard(page);

    // Leaderboard data is visible
    await expect(page.locator('[role="row"]').first()).toBeVisible();

    // Share QR button is NOT visible
    await expect(page.getByRole('button', { name: 'Share QR' })).not.toBeVisible();

    // Reset Session button is NOT visible
    await expect(page.getByRole('button', { name: 'Reset Session' })).not.toBeVisible();

    // Sort toggles are still functional
    await expect(page.getByRole('radio', { name: 'Wins' })).toBeVisible();
    await expect(page.getByRole('radio', { name: 'Points' })).toBeVisible();
    await page.getByRole('radio', { name: 'Points' }).click();
    await expect(page.getByRole('radio', { name: 'Points' })).toBeChecked();
  });

  test('4.10 — Leaderboard Updates Live After Score Edit', async ({ page }) => {
    // Precondition: Round 1 fully scored
    await freshState(page);
    await page.getByRole('tab', { name: 'Players' }).click();
    await setupSchedule(page);
    await saveRound1Scores(page, [11, 7], [9, 11]);
    await goToLeaderboard(page);

    // Note Alice's current stats — 11 pts
    const aliceCard = page.locator('[role="row"]', { hasText: 'Alice' });
    await expect(aliceCard.getByText(/11\s*pts/i)).toBeVisible();

    // Switch to Scores tab and update Court 1: Team 1 from 11 to 5 via blur auto-save
    await goToScores(page);
    const scoreInput = page.getByLabel('Court 1 team 1 score').first();
    await scoreInput.click();
    await scoreInput.selectText();
    await scoreInput.pressSequentially('5');
    await page.keyboard.press('Tab'); // blur triggers onBlurSave

    // Switch back to Leaderboard — Alice's points updated to 5
    await goToLeaderboard(page);
    const updatedAlice = page.locator('[role="row"]', { hasText: 'Alice' });
    await expect(updatedAlice.getByText(/5\s*pts/i)).toBeVisible();
    await expect(updatedAlice).not.toContainText('11 pts');
  });
});
