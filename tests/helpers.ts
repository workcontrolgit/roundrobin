// spec: specs/test-plan.md
// Shared helpers for Pickleball Round Robin Playwright tests

import { Page, expect } from '@playwright/test';

export const BASE_URL = process.env['BASE_URL'] ?? 'http://localhost:4200/roundrobin';

/** Clear localStorage and navigate to a fresh app state */
export async function freshState(page: Page): Promise<void> {
  await page.goto(BASE_URL);
  await page.evaluate(() => localStorage.clear());
  await page.goto(BASE_URL);
}

/** Click the Players tab */
export async function goToPlayers(page: Page): Promise<void> {
  await page.getByRole('tab', { name: 'Players' }).click();
}

/** Click the Schedule tab */
export async function goToSchedule(page: Page): Promise<void> {
  await page.getByRole('tab', { name: 'Schedule' }).click();
}

/** Click the Scores tab */
export async function goToScores(page: Page): Promise<void> {
  await page.getByRole('tab', { name: 'Scores' }).click();
}

/** Click the Leaderboard tab */
export async function goToLeaderboard(page: Page): Promise<void> {
  await page.getByRole('tab', { name: 'Leaderboard' }).click();
}

/** Add a single player by name */
export async function addPlayer(page: Page, name: string): Promise<void> {
  await page.getByLabel('Player name').fill(name);
  await page.getByTestId('add-player-btn').click();
}

/** Add multiple players */
export async function addPlayers(page: Page, names: string[]): Promise<void> {
  for (const name of names) {
    await addPlayer(page, name);
  }
}

/** Standard 8-player set used across many tests */
export const EIGHT_PLAYERS = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Hank'];

/** Standard 11-player set */
export const ELEVEN_PLAYERS = [
  'Alice', 'Bob', 'Charlie', 'Diana', 'Eve',
  'Frank', 'Grace', 'Hank', 'Ivy', 'Jack', 'Kylie',
];

/** Add 8 players and generate schedule */
export async function setupSchedule(page: Page, players = EIGHT_PLAYERS): Promise<void> {
  await page.getByRole('tab', { name: 'Players' }).click();
  await addPlayers(page, players);
  await page.getByRole('button', { name: /Generate Schedule/ }).click();
}

/** Save scores for both courts of the active round via blur auto-save */
export async function saveRound1Scores(
  page: Page,
  court1: [number, number] = [11, 7],
  court2: [number, number] = [9, 11],
): Promise<void> {
  await goToScores(page);

  // Use a stable non-interactive element to trigger blur (works across all browsers)
  const heading = page.locator('h2').first();

  // Court 1: type scores then click heading to blur → triggers onBlurSave
  await page.getByLabel('Court 1 team 1 score').first().click();
  await page.getByLabel('Court 1 team 1 score').first().pressSequentially(String(court1[0]));
  await page.getByLabel('Court 1 team 2 score').first().click();
  await page.getByLabel('Court 1 team 2 score').first().pressSequentially(String(court1[1]));
  await heading.click(); // blur → triggers onBlurSave for Court 1

  // Court 2: same pattern
  await page.getByLabel('Court 2 team 1 score').first().click();
  await page.getByLabel('Court 2 team 1 score').first().pressSequentially(String(court2[0]));
  await page.getByLabel('Court 2 team 2 score').first().click();
  await page.getByLabel('Court 2 team 2 score').first().pressSequentially(String(court2[1]));
  await heading.click(); // blur → triggers onBlurSave for Court 2

  // Wait for Round 1 to transition to completed (ensures blur-save has fully processed)
  await expect(page.locator('.round-card').first()).toHaveClass(/completed/, { timeout: 8000 });
}

/** Generate a valid share URL by setting up a full session */
export async function generateShareUrl(page: Page): Promise<string> {
  await freshState(page);
  await setupSchedule(page);
  await saveRound1Scores(page);
  await goToLeaderboard(page);
  await page.getByRole('button', { name: 'Share QR' }).click();
  await page.getByRole('dialog').waitFor({ state: 'visible' });
  const urlText = await page.locator('mat-dialog-content p').textContent();
  await page.getByRole('button', { name: 'Close' }).click();
  // Navigate away so subsequent page.goto(shareUrl) causes a full page load.
  // Without this, navigating from BASE_URL to BASE_URL#hash is a hash-only
  // navigation that does not reload the page or re-run Angular's ngOnInit.
  await page.goto('about:blank');
  return urlText?.trim() ?? '';
}
