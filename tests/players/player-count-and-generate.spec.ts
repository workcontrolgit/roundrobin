// spec: specs/test-plan.md — Section 1.6, 1.7, 1.8, 1.9, 1.10, 1.11, 1.12

import { test, expect } from '@playwright/test';
import { freshState, addPlayer, addPlayers, EIGHT_PLAYERS, ELEVEN_PLAYERS } from '../helpers';

test.describe('Players Tab', () => {
  test('1.6 — Add 8 Players — Generate Schedule Button Appears', async ({ page }) => {
    // Precondition: fresh state
    await freshState(page);
    await page.getByRole('tab', { name: 'Players' }).click();

    // 1. Add 8 players with distinct names (Alice through Hank)
    await addPlayers(page, EIGHT_PLAYERS);

    // Counter badge shows 8 / 11
    await expect(page.getByText('8 / 11')).toBeVisible();

    // Generate Schedule button appears
    await expect(page.getByRole('button', { name: /Generate Schedule \(8 players · 2 courts\)/ })).toBeVisible();

    // "Add X more" message disappears
    await expect(page.getByText(/Add \d+ more player/)).not.toBeVisible();

    // All 8 players appear in numbered list order
    for (let i = 0; i < EIGHT_PLAYERS.length; i++) {
      await expect(page.getByText(`${i + 1}. ${EIGHT_PLAYERS[i]}`)).toBeVisible();
    }
  });

  test('1.7 — Add Maximum 11 Players [BOUNDARY]', async ({ page }) => {
    // Precondition: fresh state
    await freshState(page);
    await page.getByRole('tab', { name: 'Players' }).click();

    // 1. Add 11 players
    await addPlayers(page, ELEVEN_PLAYERS);

    // Counter badge shows 11 / 11
    await expect(page.getByText('11 / 11')).toBeVisible();

    // 2. Type a 12th name in the input
    await page.getByLabel('Player name').fill('Lara');

    // 3. Add button is disabled even with a name typed
    await expect(page.getByRole('button', { name: 'Add' })).toBeDisabled();

    // Generate Schedule button visible
    await expect(page.getByRole('button', { name: /Generate Schedule \(11 players · 2 courts\)/ })).toBeVisible();
  });

  test('1.8 — Remove a Player', async ({ page }) => {
    // Precondition: 3 players added (Alice, Bob, Charlie)
    await freshState(page);
    await page.getByRole('tab', { name: 'Players' }).click();
    await addPlayers(page, ['Alice', 'Bob', 'Charlie']);

    // 1. Click the × remove button next to Bob
    await page.getByRole('button', { name: 'Remove Bob' }).click();

    // Bob is removed from the list
    await expect(page.getByText('Bob')).not.toBeVisible();

    // Counter badge updates to 2 / 11
    await expect(page.getByText('2 / 11')).toBeVisible();

    // Remaining players are renumbered (1. Alice, 2. Charlie)
    await expect(page.getByText('1. Alice')).toBeVisible();
    await expect(page.getByText('2. Charlie')).toBeVisible();
  });

  test('1.9 — Remove Player Drops Below 8 Hides Generate Button [BOUNDARY]', async ({ page }) => {
    // Precondition: exactly 8 players added
    await freshState(page);
    await page.getByRole('tab', { name: 'Players' }).click();
    await addPlayers(page, EIGHT_PLAYERS);

    // Confirm Generate Schedule button is visible
    await expect(page.getByRole('button', { name: /Generate Schedule/ })).toBeVisible();

    // 1. Click the × remove button on any player
    await page.getByRole('button', { name: `Remove ${EIGHT_PLAYERS[0]}` }).click();

    // Generate Schedule button disappears
    await expect(page.getByRole('button', { name: /Generate Schedule/ })).not.toBeVisible();

    // Counter badge shows 7 / 11
    await expect(page.getByText('7 / 11')).toBeVisible();

    // "Add 1 more player(s) to generate schedule" reappears
    await expect(page.getByText('Add 1 more player(s) to generate schedule')).toBeVisible();
  });

  test('1.10 — Player Name Maximum Length (30 characters) [BOUNDARY]', async ({ page }) => {
    // Precondition: fresh state
    await freshState(page);
    await page.getByRole('tab', { name: 'Players' }).click();

    // 1. Type exactly 31 characters in the input
    const thirtyOneChars = 'A'.repeat(31);
    await page.getByLabel('Player name').fill(thirtyOneChars);

    // 2. Input enforces maxlength="30" — only 30 characters accepted
    const inputValue = await page.getByLabel('Player name').inputValue();
    expect(inputValue.length).toBeLessThanOrEqual(30);

    // 3. Click Add — player is added with 30-char name if Add is enabled
    if (inputValue.length > 0) {
      await page.getByRole('button', { name: 'Add' }).click();
      await expect(page.getByText(/1\. A+/)).toBeVisible();
    }
  });

  test('1.11 — Generate Schedule with Confirmation on Existing Schedule', async ({ page }) => {
    // Precondition: 8 players added and schedule already generated
    await freshState(page);
    await page.getByRole('tab', { name: 'Players' }).click();
    await addPlayers(page, EIGHT_PLAYERS);

    // Generate initial schedule
    await page.getByRole('button', { name: /Generate Schedule/ }).click();

    // 1. Click Generate Schedule again — confirm dialog appears
    // 2. Click Cancel
    page.once('dialog', async dialog => {
      expect(dialog.message()).toContain('This will clear the existing schedule');
      await dialog.dismiss();
    });
    await page.getByRole('button', { name: /Generate Schedule/ }).click();

    // Existing schedule is NOT cleared — switch to Schedule tab to verify rounds remain
    await page.getByRole('tab', { name: 'Schedule' }).click();
    await expect(page.getByText('Round 1')).toBeVisible();

    // 3. Click Generate Schedule again, then click OK
    await page.getByRole('tab', { name: 'Players' }).click();
    page.once('dialog', async dialog => {
      await dialog.accept();
    });
    await page.getByRole('button', { name: /Generate Schedule/ }).click();

    // A new schedule is generated — Schedule tab still shows rounds
    await page.getByRole('tab', { name: 'Schedule' }).click();
    await expect(page.getByText('Round 1')).toBeVisible();
  });

  test('1.12 — Counter Badge Color Changes at 8+ Players', async ({ page }) => {
    // Precondition: fresh state
    await freshState(page);
    await page.getByRole('tab', { name: 'Players' }).click();

    // Add 7 players — badge shows badge-upcoming styling
    await addPlayers(page, EIGHT_PLAYERS.slice(0, 7));
    const badge = page.getByText('7 / 11');
    await expect(badge).toHaveClass(/badge-upcoming/);

    // Add 1 more player (8 total) — badge shows badge-completed styling
    await addPlayer(page, EIGHT_PLAYERS[7]);
    const badge8 = page.getByText('8 / 11');
    await expect(badge8).toHaveClass(/badge-completed/);
  });

  test('1.14 — Persistence: Players Survive Page Reload', async ({ page }) => {
    // Precondition: 3 players added
    await freshState(page);
    await page.getByRole('tab', { name: 'Players' }).click();
    await addPlayers(page, ['Alice', 'Bob', 'Charlie']);

    // 1. Reload the page
    await page.reload();

    // 2. Click the Players tab
    await page.getByRole('tab', { name: 'Players' }).click();

    // All 3 players are still listed
    await expect(page.getByText('1. Alice')).toBeVisible();
    await expect(page.getByText('2. Bob')).toBeVisible();
    await expect(page.getByText('3. Charlie')).toBeVisible();

    // Counter badge correctly reflects 3 / 11
    await expect(page.getByText('3 / 11')).toBeVisible();
  });
});
