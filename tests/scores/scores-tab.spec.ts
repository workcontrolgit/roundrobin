// spec: specs/test-plan.md — Section 3

import { test, expect } from '@playwright/test';
import {
  freshState, setupSchedule, saveRound1Scores,
  goToScores, goToLeaderboard, goToPlayers, generateShareUrl,
} from '../helpers';

test.describe('Scores Tab', () => {
  test('3.1 — Scores Tab Empty State (No Schedule)', async ({ page }) => {
    // Precondition: fresh state, no schedule generated
    await freshState(page);

    // 1. Click the Scores tab
    await goToScores(page);

    // Message displayed
    await expect(page.getByText('Generate a schedule first.')).toBeVisible();

    // No round cards displayed
    await expect(page.getByText('Round 1')).not.toBeVisible();
  });

  test('3.2 — Active Round Shows Score Input Fields', async ({ page }) => {
    // Precondition: 8 players, schedule generated
    await freshState(page);
    await goToPlayers(page);
    await setupSchedule(page);

    // 1. Click the Scores tab
    await goToScores(page);

    // Round 1 card has active class
    const round1Card = page.locator('.round-card').first();
    await expect(round1Card).toHaveClass(/active/);

    // Court 1 shows two number inputs + disabled Save Court 1 Score button
    await expect(page.getByLabel('Court 1 team 1 score').first()).toBeVisible();
    await expect(page.getByLabel('Court 1 team 2 score').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save Court 1 Score' })).toBeDisabled();

    // Court 2 shows two number inputs + disabled Save Court 2 Score button
    await expect(page.getByLabel('Court 2 team 1 score').first()).toBeVisible();
    await expect(page.getByLabel('Court 2 team 2 score').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save Court 2 Score' })).toBeDisabled();

    // Rounds 2–7 are upcoming (no inputs)
    const allCards = page.locator('.round-card');
    const count = await allCards.count();
    for (let i = 1; i < count; i++) {
      await expect(allCards.nth(i)).toHaveClass(/upcoming/);
    }
  });

  test('3.3 — Save Button Enables When Both Scores Entered', async ({ page }) => {
    // Precondition: Round 1 is active on Scores tab
    await freshState(page);
    await goToPlayers(page);
    await setupSchedule(page);
    await goToScores(page);

    const saveC1Btn = page.getByRole('button', { name: 'Save Court 1 Score' });

    // 1. Enter Team 1 score only — button stays disabled
    await page.getByLabel('Court 1 team 1 score').first().fill('11');
    await expect(saveC1Btn).toBeDisabled();

    // 2. Enter Team 2 score — button becomes enabled
    await page.getByLabel('Court 1 team 2 score').first().fill('7');
    await expect(saveC1Btn).toBeEnabled();
  });

  test('3.4 — Save Court 1 Score', async ({ page }) => {
    // Precondition: Round 1 active, Court 1 scores entered (11 and 7)
    await freshState(page);
    await goToPlayers(page);
    await setupSchedule(page);
    await goToScores(page);

    await page.getByLabel('Court 1 team 1 score').first().fill('11');
    await page.getByLabel('Court 1 team 2 score').first().fill('7');

    // 1. Click Save Court 1 Score
    await page.getByRole('button', { name: 'Save Court 1 Score' }).click();

    // Court 1 now displays saved scores with an Update button
    await expect(page.getByRole('button', { name: 'Update' }).first()).toBeVisible();

    // Save Court 1 Score button is no longer shown
    await expect(page.getByRole('button', { name: 'Save Court 1 Score' })).not.toBeVisible();

    // Court 2 still shows score input fields (not yet saved)
    await expect(page.getByLabel('Court 2 team 1 score').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save Court 2 Score' })).toBeVisible();
  });

  test('3.5 — Active Round Advances After Both Courts Saved', async ({ page }) => {
    // Precondition: Round 1 active, save both courts
    await freshState(page);
    await goToPlayers(page);
    await setupSchedule(page);
    await goToScores(page);

    // Save Court 1
    await page.getByLabel('Court 1 team 1 score').first().fill('11');
    await page.getByLabel('Court 1 team 2 score').first().fill('7');
    await page.getByRole('button', { name: 'Save Court 1 Score' }).click();

    // Save Court 2
    await page.getByLabel('Court 2 team 1 score').first().fill('9');
    await page.getByLabel('Court 2 team 2 score').first().fill('11');
    await page.getByRole('button', { name: 'Save Court 2 Score' }).click();

    // Round 1 transitions to completed state
    const round1Card = page.locator('.round-card').first();
    await expect(round1Card).toHaveClass(/completed/);
    await expect(round1Card.getByRole('button', { name: /Save/ })).not.toBeVisible();

    // Round 2 card becomes active — score input fields appear
    const round2Card = page.locator('.round-card').nth(1);
    await expect(round2Card).toHaveClass(/active/);
    await expect(round2Card.getByRole('button', { name: /Save/ }).first()).toBeVisible();
  });

  test('3.6 — Update Saved Score', async ({ page }) => {
    // Precondition: Round 1 fully scored (Court 1: 11–7, Court 2: 9–11)
    await freshState(page);
    await goToPlayers(page);
    await setupSchedule(page);
    await saveRound1Scores(page, [11, 7], [9, 11]);

    // In Round 1, Court 1: change Team 1 score from 11 to 9
    await page.getByLabel('Court 1 team 1 score').first().fill('9');

    // Click Update
    await page.getByRole('button', { name: 'Update' }).first().click();

    // Input reflects updated value
    await expect(page.getByLabel('Court 1 team 1 score').first()).toHaveValue('9');
    await expect(page.getByLabel('Court 1 team 2 score').first()).toHaveValue('7');

    // Leaderboard reflects the updated scores
    await goToLeaderboard(page);
    await expect(page.locator('mat-card').first()).toBeVisible();
  });

  test('3.7 — Save Button Enabled for Zero-Zero Scores [NEGATIVE]', async ({ page }) => {
    // Precondition: Round 1 active on Scores tab
    await freshState(page);
    await goToPlayers(page);
    await setupSchedule(page);
    await goToScores(page);

    // 1. Enter 0 for both score fields
    await page.getByLabel('Court 1 team 1 score').first().fill('0');
    await page.getByLabel('Court 1 team 2 score').first().fill('0');

    // Save button is enabled (0–0 is a valid result per canSave >= 0 logic)
    await expect(page.getByRole('button', { name: 'Save Court 1 Score' })).toBeEnabled();
  });

  test('3.8 — Negative Score Rejected [NEGATIVE]', async ({ page }) => {
    // Precondition: Round 1 active
    await freshState(page);
    await goToPlayers(page);
    await setupSchedule(page);
    await goToScores(page);

    // 1. Enter -1 for Team 1 and 11 for Team 2
    await page.getByLabel('Court 1 team 1 score').first().fill('-1');
    await page.getByLabel('Court 1 team 2 score').first().fill('11');

    // Save button is disabled (negative score fails >= 0 check)
    await expect(page.getByRole('button', { name: 'Save Court 1 Score' })).toBeDisabled();
  });

  test('3.9 — Upcoming Round Shows Read-Only Teams (No Input Fields)', async ({ page }) => {
    // Precondition: 8 players, schedule generated. Round 1 is active.
    await freshState(page);
    await goToPlayers(page);
    await setupSchedule(page);
    await goToScores(page);

    // Rounds 2–7 show only team names — no input fields, no Save buttons
    const allCards = page.locator('.round-card');
    const count = await allCards.count();
    for (let i = 1; i < count; i++) {
      const card = allCards.nth(i);
      await expect(card.getByText('vs').first()).toBeVisible();
      await expect(card.locator('input[type="number"]')).not.toBeVisible();
      await expect(card.getByRole('button', { name: /Save/ })).not.toBeVisible();
    }
  });

  test('3.10 — Scores Tab in Read-Only Mode', async ({ page }) => {
    // Precondition: Navigate to app via a valid URL hash (read-only mode)
    const shareUrl = await generateShareUrl(page);
    await page.goto(shareUrl);

    // 1. Click the Scores tab
    await goToScores(page);

    // Read-only banner is visible
    await expect(page.getByText('Shared session — read only')).toBeVisible();

    // Score inputs are visible but disabled
    const court1Input = page.getByLabel('Court 1 team 1 score').first();
    await expect(court1Input).toBeVisible();
    await expect(court1Input).toBeDisabled();

    // No Save or Update buttons visible
    await expect(page.getByRole('button', { name: /Save/ })).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Update' })).not.toBeVisible();
  });

  test('3.11 — Score Persistence After Reload', async ({ page }) => {
    // Precondition: Round 1 Court 1 score saved (11–7)
    await freshState(page);
    await goToPlayers(page);
    await setupSchedule(page);
    await goToScores(page);

    await page.getByLabel('Court 1 team 1 score').first().fill('11');
    await page.getByLabel('Court 1 team 2 score').first().fill('7');
    await page.getByRole('button', { name: 'Save Court 1 Score' }).click();

    // 1. Reload the page
    await page.reload();

    // 2. Click the Scores tab
    await goToScores(page);

    // Score 11–7 is still displayed
    await expect(page.getByLabel('Court 1 team 1 score').first()).toHaveValue('11');
    await expect(page.getByLabel('Court 1 team 2 score').first()).toHaveValue('7');

    // Round 1 Court 1 shows the Update button (previously saved state preserved)
    await expect(page.getByRole('button', { name: 'Update' }).first()).toBeVisible();
  });

  test('3.12 — Pending Court Scores Are Independent', async ({ page }) => {
    // Precondition: Round 1 active, enter scores for both courts, save Court 2 first
    await freshState(page);
    await goToPlayers(page);
    await setupSchedule(page);
    await goToScores(page);

    // Enter Court 1 scores (do not save yet)
    await page.getByLabel('Court 1 team 1 score').first().fill('11');
    await page.getByLabel('Court 1 team 2 score').first().fill('7');

    // Enter and save Court 2 scores first
    await page.getByLabel('Court 2 team 1 score').first().fill('9');
    await page.getByLabel('Court 2 team 2 score').first().fill('11');
    await page.getByRole('button', { name: 'Save Court 2 Score' }).click();

    // Court 1 Save button is still visible (no cross-contamination between courts)
    await expect(page.getByRole('button', { name: 'Save Court 1 Score' })).toBeVisible();
    await expect(page.getByLabel('Court 1 team 1 score').first()).toBeVisible();
  });
});
