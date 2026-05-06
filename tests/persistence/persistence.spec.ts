// spec: specs/test-plan.md — Section 8

import { test, expect } from '@playwright/test';
import { freshState, setupSchedule, saveRound1Scores, goToLeaderboard } from '../helpers';

const BASE_URL = 'http://localhost:4200/roundrobin';

test.describe('localStorage Persistence', () => {
  test('8.1 — Session Persists Across Browser Reload', async ({ page }) => {
    // Precondition: 8 players added, schedule generated, Round 1 scored
    await freshState(page);
    await page.getByRole('tab', { name: 'Players' }).click();
    await setupSchedule(page);
    await saveRound1Scores(page, [11, 7], [9, 11]);

    // 1. Reload the page
    await page.reload();

    // All players are still listed
    await page.getByRole('tab', { name: 'Players' }).click();
    await expect(page.getByText('8 / 11')).toBeVisible();

    // Schedule is intact
    await page.getByRole('tab', { name: 'Schedule' }).click();
    await expect(page.getByText('Round 1')).toBeVisible();

    // Round 1 scores are preserved
    await page.getByRole('tab', { name: 'Scores' }).click();
    await expect(page.locator('.round-card').first().getByText('11–7')).toBeVisible();

    // Round 2 is the active round (Round 1 shows as COMPLETED)
    await page.getByRole('tab', { name: 'Schedule' }).click();
    await expect(page.locator('.round-card').first().getByText('COMPLETED')).toBeVisible();
    await expect(page.locator('.round-card').nth(1).getByText('NOW')).toBeVisible();
  });

  test('8.2 — Multiple Dates Stored Independently', async ({ page }) => {
    // Precondition: session data exists for today; inject a past date session
    await freshState(page);

    const pastDate = '2026-04-01';
    const pastSession = {
      date: pastDate,
      players: [{ id: 'past-player-id', name: 'PastPlayer' }],
      rounds: [],
    };

    await page.evaluate(
      ([key, value]) => localStorage.setItem(key, value),
      [`pickleball-session-${pastDate}`, JSON.stringify(pastSession)]
    );

    // Reload the app to pick up injected session
    await page.goto(BASE_URL);

    // Both dates appear in the dropdown
    await page.getByRole('combobox').click();
    await expect(page.getByRole('option', { name: pastDate })).toBeVisible();

    // Selecting the past date loads its session data
    await page.getByRole('option', { name: pastDate }).click();
    await page.getByRole('tab', { name: 'Players' }).click();
    await expect(page.getByText('PastPlayer')).toBeVisible();

    // Switching back to today restores today's session (0 players)
    await page.getByRole('combobox').click();
    const today = new Date().toISOString().split('T')[0];
    await page.getByRole('option', { name: today }).click();
    await page.getByRole('tab', { name: 'Players' }).click();
    await expect(page.getByText('0 / 11')).toBeVisible();
  });

  test('8.3 — Reset Clears localStorage Entry for Current Date', async ({ page }) => {
    // Precondition: today's session has players and scores
    await freshState(page);
    await page.getByRole('tab', { name: 'Players' }).click();
    await setupSchedule(page);
    await saveRound1Scores(page);
    await goToLeaderboard(page);

    // 1. Reset Session → OK
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: 'Reset Session' }).click();

    // Verify localStorage re-created with empty data
    const today = new Date().toISOString().split('T')[0];
    const stored = await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key) ?? 'null'),
      `pickleball-session-${today}`
    );

    // The session still exists but is empty
    expect(stored).not.toBeNull();
    expect(stored.players).toHaveLength(0);
    expect(stored.rounds).toHaveLength(0);
  });
});
