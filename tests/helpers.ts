// spec: specs/test-plan.md
// Shared helpers for Pickleball Round Robin Playwright tests

import { Page } from '@playwright/test';

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
  await page.getByRole('button', { name: 'Add' }).click();
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
  await addPlayers(page, players);
  await page.getByRole('button', { name: /Generate Schedule/ }).click();
  // handle confirmation dialog if it appears
  page.once('dialog', dialog => dialog.accept());
}

/** Save scores for both courts of the active round via blur auto-save */
export async function saveRound1Scores(
  page: Page,
  court1: [number, number] = [11, 7],
  court2: [number, number] = [9, 11],
): Promise<void> {
  await goToScores(page);
  const heading = page.locator('h2').first();

  // Court 1: click to focus each field, fill value, click heading to blur and trigger onBlurSave
  await page.getByLabel('Court 1 team 1 score').first().click();
  await page.getByLabel('Court 1 team 1 score').first().fill(String(court1[0]));
  await page.getByLabel('Court 1 team 2 score').first().click();
  await page.getByLabel('Court 1 team 2 score').first().fill(String(court1[1]));
  await heading.click(); // blur Court 1 team 2 → triggers onBlurSave with both scores set

  // Court 2: same pattern
  await page.getByLabel('Court 2 team 1 score').first().click();
  await page.getByLabel('Court 2 team 1 score').first().fill(String(court2[0]));
  await page.getByLabel('Court 2 team 2 score').first().click();
  await page.getByLabel('Court 2 team 2 score').first().fill(String(court2[1]));
  await heading.click(); // blur Court 2 team 2 → triggers onBlurSave
}

/** Generate a valid share URL by setting up a full session */
export async function generateShareUrl(page: Page): Promise<string> {
  await freshState(page);
  await setupSchedule(page);
  await saveRound1Scores(page);
  await goToLeaderboard(page);
  await page.getByRole('button', { name: 'Share QR' }).click();
  const urlText = await page.locator('mat-dialog-content p').textContent();
  await page.getByRole('button', { name: 'Close' }).click();
  // Navigate away so subsequent page.goto(shareUrl) causes a full page load.
  // Without this, navigating from BASE_URL to BASE_URL#hash is a hash-only
  // navigation that does not reload the page or re-run Angular's ngOnInit.
  await page.goto('about:blank');
  return urlText?.trim() ?? '';
}
