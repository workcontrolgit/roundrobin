// spec: specs/test-plan.md — Sections 11

import { test, expect } from '@playwright/test';
import {
  freshState, setupSchedule, saveRound1Scores,
  goToScores, goToSchedule, goToLeaderboard, addPlayers, EIGHT_PLAYERS, ELEVEN_PLAYERS,
} from '../helpers';

test.describe('Edge Cases and Boundary Conditions', () => {
  test('11.1 — Score Entry: Both Fields Must Be Non-Null [BOUNDARY]', async ({ page }) => {
    // Precondition: Round 1 active on Scores tab
    await freshState(page);
    await page.getByRole('tab', { name: 'Players' }).click();
    await setupSchedule(page);
    await goToScores(page);

    // 1. Enter a value in Team 1 score only (leave Team 2 blank), then blur
    await page.getByLabel('Court 1 team 1 score').first().fill('11');
    await page.locator('h2').first().click(); // blur without team 2 filled — save should not happen

    // Score should NOT appear in the round card (no "11–" text)
    await expect(page.locator('.round-card').first()).not.toContainText('11–');
  });

  test('11.2 — Score of Zero is Valid', async ({ page }) => {
    // Precondition: Round 1 active
    await freshState(page);
    await page.getByRole('tab', { name: 'Players' }).click();
    await setupSchedule(page);
    await goToScores(page);

    // Use saveRound1Scores with 11–0 for Court 1 to verify saving works
    await saveRound1Scores(page, [11, 0], [9, 11]);

    // Check score on Schedule tab where completed rounds show static score text
    await goToSchedule(page);
    await expect(page.locator('.round-card').first().getByText('11–0')).toBeVisible();

    // Leaderboard reflects Team 1's win and 11 points
    await goToLeaderboard(page);
    await expect(page.getByText('11 pts').first()).toBeVisible();
  });

  test('11.3 — Very Large Score Values [BOUNDARY]', async ({ page }) => {
    // Precondition: Round 1 active
    await freshState(page);
    await page.getByRole('tab', { name: 'Players' }).click();
    await setupSchedule(page);
    await goToScores(page);

    // Use saveRound1Scores with very large scores for Court 1
    await saveRound1Scores(page, [999, 998], [9, 11]);

    // Check score on Schedule tab where completed rounds show static score text
    await goToSchedule(page);
    await expect(page.locator('.round-card').first().getByText('999–998')).toBeVisible();
  });

  test('11.4 — Generate Schedule Minimum Players (8) [BOUNDARY]', async ({ page }) => {
    // Precondition: exactly 8 players
    await freshState(page);
    await page.getByRole('tab', { name: 'Players' }).click();
    await addPlayers(page, EIGHT_PLAYERS);

    // 1. Click Generate Schedule
    await page.getByRole('button', { name: /Generate Schedule \(8 players · 2 courts\)/ }).click();

    // Schedule generated successfully with 7 rounds
    await page.getByRole('tab', { name: 'Schedule' }).click();
    await expect(page.getByText('Round 7')).toBeVisible();

    // No sit-outs per round
    await expect(page.getByText(/Sitting out:/)).not.toBeVisible();
  });

  test('11.5 — Generate Schedule Maximum Players (11) [BOUNDARY]', async ({ page }) => {
    // Precondition: exactly 11 players
    await freshState(page);
    await page.getByRole('tab', { name: 'Players' }).click();
    await addPlayers(page, ELEVEN_PLAYERS);

    // 1. Click Generate Schedule
    await page.getByRole('button', { name: /Generate Schedule \(11 players · 2 courts\)/ }).click();

    // Schedule generated with 11 rounds
    await page.getByRole('tab', { name: 'Schedule' }).click();
    await expect(page.getByText('Round 11')).toBeVisible();

    // 3 sit-outs per round
    const sittingOutText = await page.getByText(/Sitting out:/).first().textContent();
    const parts = sittingOutText?.replace('Sitting out:', '').trim().split(',') ?? [];
    expect(parts.length).toBeGreaterThanOrEqual(3);
  });

  test('11.6 — Player with Special Characters in Name', async ({ page }) => {
    // Precondition: fresh state
    await freshState(page);
    await page.getByRole('tab', { name: 'Players' }).click();

    // 1. Add player with apostrophe and hyphen
    await page.getByLabel('Player name').fill("O'Brien-Smith");
    await page.getByRole('button', { name: 'Add' }).click();
    await expect(page.getByText("1. O'Brien-Smith")).toBeVisible();

    // 2. Add player with accented characters
    await page.getByLabel('Player name').fill('María José');
    await page.getByRole('button', { name: 'Add' }).click();
    await expect(page.getByText('2. María José')).toBeVisible();

    // Add more players to reach 8
    await addPlayers(page, ['C', 'D', 'E', 'F', 'G', 'H']);

    // 3. Generate a schedule
    await page.getByRole('button', { name: /Generate Schedule/ }).click();

    // 4. Special character names display correctly in Schedule tab
    await page.getByRole('tab', { name: 'Schedule' }).click();
    await expect(page.getByText("O'Brien-Smith").first()).toBeVisible();
    await expect(page.getByText('María José').first()).toBeVisible();
  });

  test('11.7 — Duplicate Player Names Allowed', async ({ page }) => {
    // Precondition: fresh state
    await freshState(page);
    await page.getByRole('tab', { name: 'Players' }).click();

    // 1. Add two players both named "Alex"
    await page.getByLabel('Player name').fill('Alex');
    await page.getByRole('button', { name: 'Add' }).click();
    await page.getByLabel('Player name').fill('Alex');
    await page.getByRole('button', { name: 'Add' }).click();

    // Both "Alex" entries appear
    await expect(page.getByText('1. Alex')).toBeVisible();
    await expect(page.getByText('2. Alex')).toBeVisible();
    await expect(page.getByText('2 / 11')).toBeVisible();

    // Add remaining players to reach 8
    await addPlayers(page, ['C', 'D', 'E', 'F', 'G', 'H']);

    // 2. Generate a schedule
    await page.getByRole('button', { name: /Generate Schedule/ }).click();

    // 3. App does not crash
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));

    await page.getByRole('tab', { name: 'Schedule' }).click();
    await expect(page.getByText('Round 1')).toBeVisible();
    expect(errors).toHaveLength(0);
  });
});
