// spec: specs/test-plan.md — Section 2

import { test, expect } from '@playwright/test';
import {
  freshState, addPlayers, setupSchedule, saveRound1Scores,
  goToSchedule, goToScores, EIGHT_PLAYERS,
} from '../helpers';

test.describe('Schedule Tab', () => {
  test('2.1 — Schedule Tab Empty State (No Schedule Generated)', async ({ page }) => {
    // Precondition: fresh state with 0–7 players (no schedule generated)
    await freshState(page);

    // Click the Schedule tab
    await page.getByRole('tab', { name: 'Schedule' }).click();

    // Message displayed
    await expect(
      page.getByText('Add players on the Players tab and generate a schedule.')
    ).toBeVisible();

    // No round cards displayed
    await expect(page.getByText('Round 1')).not.toBeVisible();
  });

  test('2.2 — Schedule Generated for 8 Players (No Sit-Outs)', async ({ page }) => {
    // Precondition: 8 players added and schedule generated
    await freshState(page);
    await page.getByRole('tab', { name: 'Players' }).click();
    await setupSchedule(page);

    // Click the Schedule tab
    await goToSchedule(page);

    // 7 rounds are displayed
    for (let r = 1; r <= 7; r++) {
      await expect(page.getByText(`Round ${r}`)).toBeVisible();
    }

    // Round 1 has status badge ACTIVE
    await expect(page.locator('.round-card').first().getByText('ACTIVE')).toBeVisible();

    // Rounds 2–7 have status badge UPCOMING
    const cards = page.locator('.round-card');
    const count = await cards.count();
    for (let i = 1; i < count; i++) {
      await expect(cards.nth(i).getByText('UPCOMING')).toBeVisible();
    }

    // Each round shows Court 1 and Court 2
    await expect(page.getByText('Court 1').first()).toBeVisible();
    await expect(page.getByText('Court 2').first()).toBeVisible();

    // No "Sitting out:" line for 8 players
    await expect(page.getByText(/Sitting out:/)).not.toBeVisible();
  });

  test('2.3 — Schedule Generated for 9 Players (1 Sit-Out Per Round)', async ({ page }) => {
    // Precondition: 9 players added and schedule generated
    await freshState(page);
    await page.getByRole('tab', { name: 'Players' }).click();
    await setupSchedule(page, [...EIGHT_PLAYERS, 'Ivy']);

    // Click the Schedule tab
    await goToSchedule(page);

    // 9 rounds are generated
    await expect(page.getByText('Round 9')).toBeVisible();

    // Each round shows a "Sitting out:" line
    const sittingOuts = page.getByText(/Sitting out:/);
    const count = await sittingOuts.count();
    expect(count).toBeGreaterThanOrEqual(9);
  });

  test('2.4 — Schedule Generated for 10 Players (2 Sit-Outs Per Round)', async ({ page }) => {
    // Precondition: 10 players added and schedule generated
    await freshState(page);
    await page.getByRole('tab', { name: 'Players' }).click();
    await setupSchedule(page, [...EIGHT_PLAYERS, 'Ivy', 'Jack']);

    // Click the Schedule tab
    await goToSchedule(page);

    // 10 rounds are generated
    await expect(page.getByText('Round 10')).toBeVisible();

    // Each round shows "Sitting out: [Name], [Name]" with 2 names
    const sittingOutText = await page.getByText(/Sitting out:/).first().textContent();
    const parts = sittingOutText?.replace('Sitting out:', '').trim().split(',') ?? [];
    expect(parts.length).toBeGreaterThanOrEqual(2);
  });

  test('2.5 — Schedule Generated for 11 Players (3 Sit-Outs Per Round) [BOUNDARY]', async ({ page }) => {
    // Precondition: 11 players added and schedule generated
    await freshState(page);
    await page.getByRole('tab', { name: 'Players' }).click();
    await setupSchedule(page, [...EIGHT_PLAYERS, 'Ivy', 'Jack', 'Kylie']);

    // Click the Schedule tab
    await goToSchedule(page);

    // 11 rounds are generated
    await expect(page.getByText('Round 11')).toBeVisible();

    // Each round shows "Sitting out: [Name], [Name], [Name]" with 3 names
    const sittingOutText = await page.getByText(/Sitting out:/).first().textContent();
    const parts = sittingOutText?.replace('Sitting out:', '').trim().split(',') ?? [];
    expect(parts.length).toBeGreaterThanOrEqual(3);
  });

  test('2.6 — Round Status Transitions: NOW → COMPLETED After Scoring', async ({ page }) => {
    // Precondition: 8 players, schedule generated, enter scores for Round 1
    await freshState(page);
    await page.getByRole('tab', { name: 'Players' }).click();
    await setupSchedule(page);

    // Save both courts for Round 1
    await saveRound1Scores(page);

    // Switch to the Schedule tab
    await goToSchedule(page);

    // Round 1 shows COMPLETED badge
    const round1Card = page.locator('.round-card').first();
    await expect(round1Card.getByText('COMPLETED')).toBeVisible();

    // Round 2 shows ACTIVE badge
    const round2Card = page.locator('.round-card').nth(1);
    await expect(round2Card.getByText('ACTIVE')).toBeVisible();

    // Rounds 3–7 remain UPCOMING
    for (let i = 2; i < 7; i++) {
      await expect(page.locator('.round-card').nth(i).getByText('UPCOMING')).toBeVisible();
    }
  });

  test('2.7 — Score Display in Schedule After Saving', async ({ page }) => {
    // Precondition: Round 1 scores saved (Court 1: 11–7, Court 2: 9–11)
    await freshState(page);
    await page.getByRole('tab', { name: 'Players' }).click();
    await setupSchedule(page);
    await saveRound1Scores(page, [11, 7], [9, 11]);

    // Click the Schedule tab
    await goToSchedule(page);

    // Round 1 courts display the saved scores inline
    const round1Card = page.locator('.round-card').first();
    await expect(round1Card.getByText('11–7')).toBeVisible();
    await expect(round1Card.getByText('9–11')).toBeVisible();
  });

  test('2.8 — All Rounds COMPLETED When All Scores Entered', async ({ page }) => {
    // Precondition: 8 players, schedule generated, all 7 rounds scored
    await freshState(page);
    await page.getByRole('tab', { name: 'Players' }).click();
    await setupSchedule(page);

    // Score all 7 rounds via blur auto-save
    // Each completed round shows 2 editable score inputs (Court 1 + Court 2 team 1 scores)
    // So for round N (0-based), the active round's Court 1 team 1 input is at index N
    await goToScores(page);
    const heading = page.locator('h2').first();
    for (let round = 0; round < 7; round++) {
      // Active round Court 1 team 1 is at index `round` (after `round` completed rounds' inputs)
      const c1t1 = page.getByLabel('Court 1 team 1 score').nth(round);
      const c1t2 = page.getByLabel('Court 1 team 2 score').nth(round);
      const c2t1 = page.getByLabel('Court 2 team 1 score').nth(round);
      const c2t2 = page.getByLabel('Court 2 team 2 score').nth(round);

      await c1t1.click();
      await c1t1.pressSequentially('11');
      await c1t2.click();
      await c1t2.pressSequentially('7');
      await heading.click(); // blur triggers onBlurSave for Court 1 (works across all browsers)

      await c2t1.click();
      await c2t1.pressSequentially('9');
      await c2t2.click();
      await c2t2.pressSequentially('11');
      await heading.click(); // blur triggers onBlurSave for Court 2 (works across all browsers)

      // Wait for round to be saved: Court 1 team 1 input count grows by 1 (now round+2 entries)
      if (round < 6) {
        await expect(page.getByLabel('Court 1 team 1 score')).toHaveCount(round + 2, { timeout: 10000 });
      }
    }

    // Click the Schedule tab
    await goToSchedule(page);

    // Scope to the Schedule tabpanel to avoid counting Scores tab's round cards (both use .round-card)
    const schedulePanel = page.getByRole('tabpanel', { name: 'Schedule' });

    // All 7 rounds show COMPLETED badge
    const cards = schedulePanel.locator('.round-card');
    const count = await cards.count();
    for (let i = 0; i < count; i++) {
      await expect(cards.nth(i).getByText('COMPLETED')).toBeVisible();
    }

    // No round shows ACTIVE or UPCOMING in the Schedule panel
    await expect(schedulePanel.getByText('ACTIVE')).not.toBeVisible();
    await expect(schedulePanel.getByText('UPCOMING')).not.toBeVisible();
  });

  test('2.9 — Player Names Display Correctly (Not UUIDs)', async ({ page }) => {
    // Precondition: players with recognizable names; schedule generated
    await freshState(page);
    await page.getByRole('tab', { name: 'Players' }).click();
    await setupSchedule(page);

    // Click the Schedule tab
    await goToSchedule(page);

    // All team assignments show player names (not UUID-format IDs)
    for (const name of EIGHT_PLAYERS) {
      await expect(page.getByText(name).first()).toBeVisible();
    }

    // No UUID-like text visible (8-4-4-4-12 pattern)
    const bodyText = await page.locator('.round-card').first().textContent();
    expect(bodyText).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  });
});
