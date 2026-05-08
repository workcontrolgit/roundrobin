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

/** Save scores for both courts of the active round using the Save Round button */
export async function saveRound1Scores(
  page: Page,
  court1: [number, number] = [11, 7],
  court2: [number, number] = [9, 11],
): Promise<void> {
  await goToScores(page);

  // Fill Court 1
  await page.getByLabel('Court 1 team 1 score').first().fill(String(court1[0]));
  await page.getByLabel('Court 1 team 2 score').first().fill(String(court1[1]));

  // Fill Court 2
  await page.getByLabel('Court 2 team 1 score').first().fill(String(court2[0]));
  await page.getByLabel('Court 2 team 2 score').first().fill(String(court2[1]));

  // Save both courts at once
  await page.getByRole('button', { name: /Save Round 1/ }).click();
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
  return urlText?.trim() ?? '';
}
