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

  test('3.2 — Active Round Shows Score Input Fields and Disabled Save Round Button', async ({ page }) => {
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

    // No per-court Save buttons
    await expect(page.getByRole('button', { name: 'Save Court 1 Score' })).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Save Court 2 Score' })).not.toBeVisible();

    // Single Save Round button is visible but disabled (0/2 courts ready)
    const saveRoundBtn = round1Card.getByRole('button', { name: /Save Round 1/ });
    await expect(saveRoundBtn).toBeVisible();
    await expect(saveRoundBtn).toBeDisabled();

    // Rounds 2–7 are upcoming (no inputs)
    const allCards = page.locator('.round-card');
    const count = await allCards.count();
    for (let i = 1; i < count; i++) {
      await expect(allCards.nth(i)).toHaveClass(/upcoming/);
    }
  });

  test('3.3 — Save Round Button Enables Only When ALL Courts Ready', async ({ page }) => {
    await freshState(page);
    await goToPlayers(page);
    await setupSchedule(page);
    await goToScores(page);

    const round1Card = page.locator('.round-card').first();
    const saveRoundBtn = round1Card.getByRole('button', { name: /Save Round 1/ });

    // Fill Court 1 only — button stays disabled (1/2)
    await page.getByLabel('Court 1 team 1 score').first().fill('11');
    await page.getByLabel('Court 1 team 2 score').first().fill('7');
    await expect(saveRoundBtn).toBeDisabled();

    // Fill Court 2 — button becomes enabled (2/2)
    await page.getByLabel('Court 2 team 1 score').first().fill('9');
    await page.getByLabel('Court 2 team 2 score').first().fill('11');
    await expect(saveRoundBtn).toBeEnabled();
  });

  test('3.4 — Court Checkmarks Show Per-Court Readiness', async ({ page }) => {
    await freshState(page);
    await goToPlayers(page);
    await setupSchedule(page);
    await goToScores(page);

    // Both courts start with ○ (not ready)
    await expect(page.getByText('○').first()).toBeVisible();

    // Fill Court 1 — its checkmark becomes ✓
    await page.getByLabel('Court 1 team 1 score').first().fill('11');
    await page.getByLabel('Court 1 team 2 score').first().fill('7');
    await expect(page.getByText('✓').first()).toBeVisible();

    // Court 2 still shows ○
    const circles = page.getByText('○');
    await expect(circles.first()).toBeVisible();

    // Fill Court 2 — both checkmarks are ✓
    await page.getByLabel('Court 2 team 1 score').first().fill('9');
    await page.getByLabel('Court 2 team 2 score').first().fill('11');
    await expect(page.getByText('✓').nth(1)).toBeVisible();
    await expect(page.getByText('○')).not.toBeVisible();
  });

  test('3.5 — Active Round Advances After Save Round', async ({ page }) => {
    await freshState(page);
    await goToPlayers(page);
    await setupSchedule(page);
    await goToScores(page);

    // Fill and save Round 1
    await page.getByLabel('Court 1 team 1 score').first().fill('11');
    await page.getByLabel('Court 1 team 2 score').first().fill('7');
    await page.getByLabel('Court 2 team 1 score').first().fill('9');
    await page.getByLabel('Court 2 team 2 score').first().fill('11');
    await page.getByRole('button', { name: /Save Round 1/ }).click();

    // Round 1 transitions to completed
    const round1Card = page.locator('.round-card').first();
    await expect(round1Card).toHaveClass(/completed/);
    await expect(round1Card.getByRole('button', { name: /Save Round/ })).not.toBeVisible();

    // Round 2 becomes active — Save Round 2 button appears
    const round2Card = page.locator('.round-card').nth(1);
    await expect(round2Card).toHaveClass(/active/);
    await expect(round2Card.getByRole('button', { name: /Save Round 2/ })).toBeVisible();
  });

  test('3.6 — Update Saved Score', async ({ page }) => {
    await freshState(page);
    await goToPlayers(page);
    await setupSchedule(page);
    await saveRound1Scores(page, [11, 7], [9, 11]);

    // In Round 1 Court 1: change Team 1 score from 11 to 9
    await page.getByLabel('Court 1 team 1 score').first().fill('9');
    await page.getByRole('button', { name: 'Update' }).first().click();

    await expect(page.getByLabel('Court 1 team 1 score').first()).toHaveValue('9');
    await expect(page.getByLabel('Court 1 team 2 score').first()).toHaveValue('7');

    await goToLeaderboard(page);
    await expect(page.locator('mat-card').first()).toBeVisible();
  });

  test('3.7 — Save Round Button Enabled for Zero-Zero Scores [NEGATIVE]', async ({ page }) => {
    await freshState(page);
    await goToPlayers(page);
    await setupSchedule(page);
    await goToScores(page);

    // Enter 0–0 for both courts
    await page.getByLabel('Court 1 team 1 score').first().fill('0');
    await page.getByLabel('Court 1 team 2 score').first().fill('0');
    await page.getByLabel('Court 2 team 1 score').first().fill('0');
    await page.getByLabel('Court 2 team 2 score').first().fill('0');

    // Save Round button is enabled (0–0 is a valid result per >= 0 check)
    await expect(page.getByRole('button', { name: /Save Round 1/ })).toBeEnabled();
  });

  test('3.8 — Negative Score Keeps Save Round Button Disabled [NEGATIVE]', async ({ page }) => {
    await freshState(page);
    await goToPlayers(page);
    await setupSchedule(page);
    await goToScores(page);

    // Enter valid Court 2, but negative Court 1 Team 1
    await page.getByLabel('Court 1 team 1 score').first().fill('-1');
    await page.getByLabel('Court 1 team 2 score').first().fill('11');
    await page.getByLabel('Court 2 team 1 score').first().fill('9');
    await page.getByLabel('Court 2 team 2 score').first().fill('11');

    // Save Round button stays disabled (Court 1 fails >= 0 check)
    await expect(page.getByRole('button', { name: /Save Round 1/ })).toBeDisabled();
  });

  test('3.9 — Upcoming Round Shows Read-Only Teams (No Input Fields)', async ({ page }) => {
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
      await expect(card.getByRole('button', { name: /Save/ })).not.toBeVisible();
    }
  });

  test('3.10 — Scores Tab in Read-Only Mode', async ({ page }) => {
    const shareUrl = await generateShareUrl(page);
    await page.goto(shareUrl);
    await goToScores(page);

    await expect(page.getByText('Shared session — read only')).toBeVisible();

    const court1Input = page.getByLabel('Court 1 team 1 score').first();
    await expect(court1Input).toBeVisible();
    await expect(court1Input).toBeDisabled();

    await expect(page.getByRole('button', { name: /Save/ })).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Update' })).not.toBeVisible();
  });

  test('3.11 — Score Persistence After Reload', async ({ page }) => {
    await freshState(page);
    await goToPlayers(page);
    await setupSchedule(page);
    await goToScores(page);

    // Save full Round 1
    await page.getByLabel('Court 1 team 1 score').first().fill('11');
    await page.getByLabel('Court 1 team 2 score').first().fill('7');
    await page.getByLabel('Court 2 team 1 score').first().fill('9');
    await page.getByLabel('Court 2 team 2 score').first().fill('11');
    await page.getByRole('button', { name: /Save Round 1/ }).click();

    // Reload
    await page.reload();
    await goToScores(page);

    // Round 1 still shows saved scores
    await expect(page.getByLabel('Court 1 team 1 score').first()).toHaveValue('11');
    await expect(page.getByLabel('Court 1 team 2 score').first()).toHaveValue('7');
    await expect(page.getByLabel('Court 2 team 1 score').first()).toHaveValue('9');
    await expect(page.getByLabel('Court 2 team 2 score').first()).toHaveValue('11');

    // Both courts show Update buttons
    const updateBtns = page.getByRole('button', { name: 'Update' });
    await expect(updateBtns.nth(0)).toBeVisible();
    await expect(updateBtns.nth(1)).toBeVisible();
  });

  test('3.12 — Court Checkmarks Are Independent', async ({ page }) => {
    await freshState(page);
    await goToPlayers(page);
    await setupSchedule(page);
    await goToScores(page);

    // Fill Court 1 — Court 1 gets ✓, Court 2 stays ○
    await page.getByLabel('Court 1 team 1 score').first().fill('11');
    await page.getByLabel('Court 1 team 2 score').first().fill('7');
    await expect(page.getByText('✓').first()).toBeVisible();
    await expect(page.getByText('○').first()).toBeVisible();

    // Fill Court 2 — both become ✓
    await page.getByLabel('Court 2 team 1 score').first().fill('9');
    await page.getByLabel('Court 2 team 2 score').first().fill('11');
    await expect(page.getByText('✓').nth(1)).toBeVisible();
    await expect(page.getByText('○')).not.toBeVisible();

    // Clear a Court 1 score — Court 1 reverts to ○
    await page.getByLabel('Court 1 team 1 score').first().fill('');
    await expect(page.getByText('○').first()).toBeVisible();

    // Court 2 checkmark is unaffected — still ✓
    await expect(page.getByText('✓').first()).toBeVisible();
  });
});
