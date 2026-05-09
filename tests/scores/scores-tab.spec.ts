// spec: specs/test-plan.md — Section 3

import { test, expect } from '@playwright/test';
import {
  freshState, setupSchedule, saveRound1Scores,
  goToScores, goToLeaderboard, goToPlayers, generateShareUrl,
} from '../helpers';

test.describe('Scores Tab', () => {
  test('3.1 — Scores Tab Empty State (No Schedule)', async ({ page }) => {
    await freshState(page);
    await goToScores(page);

    await expect(page.getByText('Generate a schedule first.')).toBeVisible();
    await expect(page.getByText('Round 1')).not.toBeVisible();
  });

  test('3.2 — Active Round Shows Score Inputs, No Buttons', async ({ page }) => {
    await freshState(page);
    await goToPlayers(page);
    await setupSchedule(page);
    await goToScores(page);

    // Round 1 card has active class
    const round1Card = page.locator('.round-card').first();
    await expect(round1Card).toHaveClass(/active/);

    // Both courts show score inputs
    await expect(page.getByLabel('Court 1 team 1 score').first()).toBeVisible();
    await expect(page.getByLabel('Court 1 team 2 score').first()).toBeVisible();
    await expect(page.getByLabel('Court 2 team 1 score').first()).toBeVisible();
    await expect(page.getByLabel('Court 2 team 2 score').first()).toBeVisible();

    // No Save or Update buttons anywhere
    await expect(page.getByRole('button', { name: /Save/ })).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Update' })).not.toBeVisible();

    // Rounds 2–7 are upcoming (no inputs)
    const allCards = page.locator('.round-card');
    const count = await allCards.count();
    for (let i = 1; i < count; i++) {
      await expect(allCards.nth(i)).toHaveClass(/upcoming/);
    }
  });

  test('3.3 — Auto-save Fires on Blur When Both Scores Valid', async ({ page }) => {
    await freshState(page);
    await goToPlayers(page);
    await setupSchedule(page);
    await goToScores(page);

    const round1Card = page.locator('.round-card').first();

    // Fill Court 1 both scores, Tab out of team2 → auto-saves Court 1
    await page.getByLabel('Court 1 team 1 score').first().fill('11');
    await page.getByLabel('Court 1 team 2 score').first().fill('7');
    await page.getByLabel('Court 1 team 2 score').first().press('Tab');

    // Round 1 still active (Court 2 not yet saved)
    await expect(round1Card).toHaveClass(/active/);

    // Fill Court 2, Tab out → Round 1 completes, Round 2 activates
    await page.getByLabel('Court 2 team 1 score').first().fill('9');
    await page.getByLabel('Court 2 team 2 score').first().fill('11');
    await page.getByLabel('Court 2 team 2 score').first().press('Tab');

    await expect(round1Card).toHaveClass(/completed/);
    await expect(page.locator('.round-card').nth(1)).toHaveClass(/active/);
  });

  test('3.4 — Round Advances After All Courts Auto-Saved', async ({ page }) => {
    await freshState(page);
    await goToPlayers(page);
    await setupSchedule(page);
    await saveRound1Scores(page, [11, 7], [9, 11]);

    // Round 1 is completed, Round 2 is active
    await expect(page.locator('.round-card').first()).toHaveClass(/completed/);
    await expect(page.locator('.round-card').nth(1)).toHaveClass(/active/);

    // Round 1 shows saved scores as editable inputs (no Update button)
    await expect(page.getByLabel('Court 1 team 1 score').first()).toHaveValue('11');
    await expect(page.getByLabel('Court 1 team 2 score').first()).toHaveValue('7');
    await expect(page.getByRole('button', { name: 'Update' })).not.toBeVisible();
  });

  test('3.5 — Edit Completed Court Score via Blur (Fallback Save)', async ({ page }) => {
    await freshState(page);
    await goToPlayers(page);
    await setupSchedule(page);
    await saveRound1Scores(page, [11, 7], [9, 11]);

    // Edit only Court 1 team 1 score: fill 9, Tab out
    // onBlurSave uses team2 fallback from court.score.team2 (= 7)
    await page.getByLabel('Court 1 team 1 score').first().fill('9');
    await page.getByLabel('Court 1 team 1 score').first().press('Tab');

    // Score updated to 9–7
    await expect(page.getByLabel('Court 1 team 1 score').first()).toHaveValue('9');
    await expect(page.getByLabel('Court 1 team 2 score').first()).toHaveValue('7');

    // Leaderboard reflects the updated score
    await goToLeaderboard(page);
    await expect(page.locator('mat-card').first()).toBeVisible();
  });

  test('3.6 — Zero-Zero Scores Auto-Save on Blur', async ({ page }) => {
    await freshState(page);
    await goToPlayers(page);
    await setupSchedule(page);
    await goToScores(page);

    // Fill 0–0 for Court 1, Tab out → saves (>= 0 is valid)
    await page.getByLabel('Court 1 team 1 score').first().fill('0');
    await page.getByLabel('Court 1 team 2 score').first().fill('0');
    await page.getByLabel('Court 1 team 2 score').first().press('Tab');

    // Round 1 still active (Court 2 not yet saved)
    await expect(page.locator('.round-card').first()).toHaveClass(/active/);

    // Fill Court 2 with 0–0, Tab out → Round 1 completes
    await page.getByLabel('Court 2 team 1 score').first().fill('0');
    await page.getByLabel('Court 2 team 2 score').first().fill('0');
    await page.getByLabel('Court 2 team 2 score').first().press('Tab');

    await expect(page.locator('.round-card').first()).toHaveClass(/completed/);
  });

  test('3.7 — Negative Score Does Not Auto-Save [NEGATIVE]', async ({ page }) => {
    await freshState(page);
    await goToPlayers(page);
    await setupSchedule(page);
    await goToScores(page);

    // Enter -1 for team1, valid for team2, Tab out — onBlurSave rejects (< 0)
    await page.getByLabel('Court 1 team 1 score').first().fill('-1');
    await page.getByLabel('Court 1 team 2 score').first().fill('11');
    await page.getByLabel('Court 1 team 2 score').first().press('Tab');

    // Round 1 still active (score was not saved)
    await expect(page.locator('.round-card').first()).toHaveClass(/active/);
  });

  test('3.8 — Upcoming Round Shows Read-Only Teams (No Inputs)', async ({ page }) => {
    await freshState(page);
    await goToPlayers(page);
    await setupSchedule(page);
    await goToScores(page);

    const allCards = page.locator('.round-card');
    const count = await allCards.count();
    for (let i = 1; i < count; i++) {
      const card = allCards.nth(i);
      await expect(card.getByText('vs').first()).toBeVisible();
      await expect(card.locator('input[type="number"]')).not.toBeVisible();
    }
  });

  test('3.9 — Scores Tab in Read-Only Mode', async ({ page }) => {
    const shareUrl = await generateShareUrl(page);
    await page.goto(shareUrl);
    await goToScores(page);

    await expect(page.getByText('Shared session — read only')).toBeVisible();

    // Score inputs visible but disabled — no Save buttons
    const court1Input = page.getByLabel('Court 1 team 1 score').first();
    await expect(court1Input).toBeVisible();
    await expect(court1Input).toBeDisabled();
    await expect(page.getByRole('button', { name: /Save/ })).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Update' })).not.toBeVisible();
  });

  test('3.10 — Score Persistence After Reload', async ({ page }) => {
    await freshState(page);
    await goToPlayers(page);
    await setupSchedule(page);
    await saveRound1Scores(page, [11, 7], [9, 11]);

    await page.reload();
    await goToScores(page);

    // Round 1 still completed with correct scores
    await expect(page.locator('.round-card').first()).toHaveClass(/completed/);
    await expect(page.getByLabel('Court 1 team 1 score').first()).toHaveValue('11');
    await expect(page.getByLabel('Court 1 team 2 score').first()).toHaveValue('7');
    await expect(page.getByLabel('Court 2 team 1 score').first()).toHaveValue('9');
    await expect(page.getByLabel('Court 2 team 2 score').first()).toHaveValue('11');
  });

  test('3.11 — Partial Fill Does Not Auto-Save', async ({ page }) => {
    await freshState(page);
    await goToPlayers(page);
    await setupSchedule(page);
    await goToScores(page);

    // Fill only team1, Tab to team2 (blurs team1) — save must not fire
    await page.getByLabel('Court 1 team 1 score').first().fill('11');
    await page.getByLabel('Court 1 team 1 score').first().press('Tab');

    // Round 1 still active (only one score entered)
    await expect(page.locator('.round-card').first()).toHaveClass(/active/);
  });
});
