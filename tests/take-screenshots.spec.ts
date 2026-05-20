import { test, Page } from '@playwright/test';
import path from 'path';

const BASE_URL = process.env['BASE_URL'] ?? 'http://localhost:4200/roundrobin';
const SCREENSHOTS_DIR = 'docs/content/screenshots';
const PLAYERS = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Hank'];

async function freshState(page: Page) {
  await page.goto(BASE_URL);
  await page.evaluate(() => localStorage.clear());
  await page.goto(BASE_URL);
}

async function addPlayer(page: Page, name: string) {
  await page.getByLabel('Player name').fill(name);
  await page.getByRole('button', { name: 'Add' }).click();
}

async function screenshot(page: Page, filename: string) {
  await page.waitForTimeout(400);
  await page.screenshot({
    path: path.join(SCREENSHOTS_DIR, filename),
    fullPage: true,
  });
}

async function goToTab(page: Page, name: string) {
  await page.getByRole('tab', { name }).click();
  await page.waitForTimeout(300);
}

test('take all screenshots', async ({ page }) => {
  await page.setViewportSize({ width: 640, height: 780 });

  // ── 01: Players tab — empty ──────────────────────────────────────────────
  await freshState(page);
  await page.getByRole('tab', { name: 'Players' }).click();
  await screenshot(page, '01-players-empty.png');

  // ── 02: Players tab — 8 players ready ───────────────────────────────────
  for (const name of PLAYERS) await addPlayer(page, name);
  await screenshot(page, '02-players-ready.png');

  // ── 03: Schedule tab — generated ────────────────────────────────────────
  await page.getByRole('button', { name: /Generate Schedule/ }).click();
  await page.waitForTimeout(500);
  await goToTab(page, 'Schedule');
  await screenshot(page, '03-schedule.png');

  // ── 04: Scores tab — Round 1 active (no scores yet) ─────────────────────
  await goToTab(page, 'Scores');
  await page.waitForSelector('text=Round 1');
  await screenshot(page, '04-scores-active.png');

  // ── Enter Round 1 scores ─────────────────────────────────────────────────
  const scoresHeading = page.locator('h2').first();
  await page.getByLabel('Court 1 team 1 score').first().fill('11');
  await page.getByLabel('Court 1 team 2 score').first().fill('7');
  await scoresHeading.click(); // blur to trigger onBlurSave (works across all browsers)
  await page.getByLabel('Court 2 team 1 score').first().fill('9');
  await page.getByLabel('Court 2 team 2 score').first().fill('11');
  await scoresHeading.click(); // blur to trigger onBlurSave (works across all browsers)

  // ── 05: Scores tab — Round 2 active ─────────────────────────────────────
  await page.waitForTimeout(300);
  await screenshot(page, '05-scores-round2-active.png');

  // ── 08: Schedule in progress (round 1 done, round 2 active) ─────────────
  await goToTab(page, 'Schedule');
  await screenshot(page, '08-schedule-in-progress.png');

  // ── Finish all remaining rounds ───────────────────────────────────────────
  await goToTab(page, 'Scores');
  const totalRounds = 7;
  for (let r = 1; r < totalRounds; r++) {
    await page.waitForTimeout(300);
    const c1t1 = page.getByLabel('Court 1 team 1 score').nth(r);
    const c1t2 = page.getByLabel('Court 1 team 2 score').nth(r);
    const c2t1 = page.getByLabel('Court 2 team 1 score').nth(r);
    const c2t2 = page.getByLabel('Court 2 team 2 score').nth(r);
    try {
      await c1t1.waitFor({ timeout: 2000 });
      await c1t1.fill('11');
      await c1t2.fill('7');
      await scoresHeading.click(); // blur to trigger onBlurSave
      await c2t1.fill('9');
      await c2t2.fill('11');
      await scoresHeading.click(); // blur to trigger onBlurSave
    } catch {
      // round may have a different court count
    }
  }

  // ── 06: Leaderboard ──────────────────────────────────────────────────────
  await page.waitForTimeout(500);
  await goToTab(page, 'Leaderboard');
  await screenshot(page, '06-leaderboard.png');

  // ── 07: Share dialog ─────────────────────────────────────────────────────
  await page.getByRole('button', { name: 'Share QR' }).click();
  await page.getByRole('dialog').waitFor({ state: 'visible' });
  await screenshot(page, '07-share-dialog.png');
});
