// spec: specs/test-plan.md — Section 8

import { test, expect } from '@playwright/test';
import { freshState, setupSchedule, saveRound1Scores, goToLeaderboard } from '../helpers';

const BASE_URL = 'http://localhost:4200/roundrobin';

test.describe('localStorage Persistence', () => {
  test('8.1 — Session Persists Across Browser Reload', async ({ page }) => {
    await freshState(page);
    await page.getByRole('tab', { name: 'Players' }).click();
    await setupSchedule(page);
    await saveRound1Scores(page, [11, 7], [9, 11]);

    await page.reload();

    await page.getByRole('tab', { name: 'Players' }).click();
    await expect(page.getByText('8 / 11')).toBeVisible();

    await page.getByRole('tab', { name: 'Schedule' }).click();
    await expect(page.getByText('Round 1')).toBeVisible();

    await page.getByRole('tab', { name: 'Scores' }).click();
    await expect(page.locator('.round-card').first().getByText('11–7')).toBeVisible();

    await page.getByRole('tab', { name: 'Schedule' }).click();
    await expect(page.locator('.round-card').first().getByText('COMPLETED')).toBeVisible();
    await expect(page.locator('.round-card').nth(1).getByText('NOW')).toBeVisible();
  });

  test('8.2 — Multiple Dates Stored Independently', async ({ page }) => {
    await freshState(page);

    const pastDate = '2026-04-01';
    const pastSession = {
      date: pastDate,
      sessionNumber: 1,
      players: [{ id: 'past-player-id', name: 'PastPlayer' }],
      rounds: [],
    };

    // Inject with new key format
    await page.evaluate(
      ([key, value]) => localStorage.setItem(key, value),
      [`pickleball-session-${pastDate}-1`, JSON.stringify(pastSession)]
    );

    await page.goto(BASE_URL);

    // Open drawer and switch to past date
    await page.getByRole('button', { name: /S1/ }).click();
    await page.locator('input[type="date"]').fill(pastDate);
    await page.keyboard.press('Tab');
    await page.getByRole('button', { name: /Session 1/ }).click();

    // Past player is visible
    await page.getByRole('tab', { name: 'Players' }).click();
    await expect(page.getByText('PastPlayer')).toBeVisible();

    // Switch back to today — 0 players
    const today = new Date().toISOString().split('T')[0];
    await page.getByRole('button', { name: /S1/ }).click();
    await page.locator('input[type="date"]').fill(today);
    await page.keyboard.press('Tab');
    await page.getByRole('button', { name: /Session 1/ }).click();

    await page.getByRole('tab', { name: 'Players' }).click();
    await expect(page.getByText('0 / 11')).toBeVisible();
  });

  test('8.3 — Reset Clears localStorage Entry for Current Session', async ({ page }) => {
    await freshState(page);
    await page.getByRole('tab', { name: 'Players' }).click();
    await setupSchedule(page);
    await saveRound1Scores(page);
    await goToLeaderboard(page);

    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: 'Reset Session' }).click();

    // Verify localStorage re-created with empty data under new key format
    const today = new Date().toISOString().split('T')[0];
    const stored = await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key) ?? 'null'),
      `pickleball-session-${today}-1`
    );

    expect(stored).not.toBeNull();
    expect(stored.players).toHaveLength(0);
    expect(stored.rounds).toHaveLength(0);
  });

  test('8.4 — Old localStorage Keys Migrated on Load', async ({ page }) => {
    await freshState(page);

    // Inject old-format key (no session number suffix)
    const oldDate = '2026-03-15';
    const oldSession = {
      date: oldDate,
      players: [{ id: 'old-id', name: 'OldPlayer' }],
      rounds: [],
    };
    await page.evaluate(
      ([key, value]) => localStorage.setItem(key, value),
      [`pickleball-session-${oldDate}`, JSON.stringify(oldSession)]
    );

    // Reload triggers migrateOldKeys()
    await page.goto(BASE_URL);

    // Old key is gone, new key exists
    const oldKeyVal = await page.evaluate(
      (key) => localStorage.getItem(key),
      `pickleball-session-${oldDate}`
    );
    expect(oldKeyVal).toBeNull();

    const newKeyVal = await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key) ?? 'null'),
      `pickleball-session-${oldDate}-1`
    );
    expect(newKeyVal).not.toBeNull();
    expect(newKeyVal.sessionNumber).toBe(1);
  });
});
