// spec: specs/test-plan.md — Section 5

import { test, expect } from '@playwright/test';
import {
  freshState, setupSchedule, saveRound1Scores, goToLeaderboard,
  generateShareUrl, BASE_URL,
} from '../helpers';

test.describe('Share Dialog', () => {
  test('5.1 — Open Share Dialog', async ({ page }) => {
    // Precondition: 8 players, schedule generated, at least one score saved. On Leaderboard tab.
    await freshState(page);
    await page.getByRole('tab', { name: 'Players' }).click();
    await setupSchedule(page);
    await saveRound1Scores(page);
    await goToLeaderboard(page);

    // 1. Click the Share QR button
    await page.getByRole('button', { name: 'Share QR' }).click();

    // Dialog titled "Share Session" opens
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Share Session' })).toBeVisible();

    // QR code canvas is rendered
    await expect(page.locator('canvas')).toBeVisible();

    // URL is displayed below the QR code
    await expect(page.locator('mat-dialog-content p')).toBeVisible();

    // Copy URL button is visible
    await expect(page.getByRole('button', { name: 'Copy URL' })).toBeVisible();

    // Close button is visible
    await expect(page.getByRole('button', { name: 'Close' })).toBeVisible();
  });

  test('5.2 — Copy URL Button Feedback', async ({ page }) => {
    // Precondition: Share dialog is open
    await freshState(page);
    await page.getByRole('tab', { name: 'Players' }).click();
    await setupSchedule(page);
    await saveRound1Scores(page);
    await goToLeaderboard(page);
    await page.getByRole('button', { name: 'Share QR' }).click();

    // 1. Click Copy URL
    await page.getByRole('button', { name: 'Copy URL' }).click();

    // Button text changes to "Copied!" immediately
    await expect(page.getByRole('button', { name: 'Copied!' })).toBeVisible();

    // After ~2 seconds, button text reverts to "Copy URL"
    await expect(page.getByRole('button', { name: 'Copy URL' })).toBeVisible({ timeout: 5000 });
  });

  test('5.3 — Close Button Dismisses Dialog', async ({ page }) => {
    // Precondition: Share dialog is open
    await freshState(page);
    await page.getByRole('tab', { name: 'Players' }).click();
    await setupSchedule(page);
    await saveRound1Scores(page);
    await goToLeaderboard(page);
    await page.getByRole('button', { name: 'Share QR' }).click();

    // 1. Click Close
    await page.getByRole('button', { name: 'Close' }).click();

    // Dialog closes
    await expect(page.getByRole('dialog')).not.toBeVisible();

    // User is returned to the Leaderboard tab view — no data is lost
    await expect(page.getByRole('tab', { name: 'Leaderboard' })).toBeVisible();
    await expect(page.locator('[role="row"]').first()).toBeVisible();
  });

  test('5.4 — URL Format is Valid Base64 Hash', async ({ page }) => {
    // Precondition: Share dialog open, URL visible
    await freshState(page);
    await page.getByRole('tab', { name: 'Players' }).click();
    await setupSchedule(page);
    await saveRound1Scores(page);
    await goToLeaderboard(page);
    await page.getByRole('button', { name: 'Share QR' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // 1. Copy the URL text from the dialog
    const urlText = await page.locator('mat-dialog-content p').textContent();
    const url = urlText?.trim() ?? '';

    // URL format: [host]/roundrobin#[base64string]
    expect(url).toMatch(/^http.+\/roundrobin#.+/);

    // Hash portion is valid base64 (only A–Z, a–z, 0–9, +, /, =)
    const hashPart = url.split('#')[1];
    expect(hashPart).toBeTruthy();
    expect(hashPart).toMatch(/^[A-Za-z0-9+/=]+$/);

    // Decoding produces valid JSON with date, players, rounds fields
    const decoded = atob(hashPart);
    const session = JSON.parse(decoded);
    expect(session).toHaveProperty('date');
    expect(session).toHaveProperty('players');
    expect(session).toHaveProperty('rounds');
  });

  test('5.5 — Shared URL Loads Session in Read-Only Mode', async ({ page }) => {
    // Precondition: a valid share URL has been generated
    const shareUrl = await generateShareUrl(page);
    await page.goto(shareUrl);

    // Toolbar shows "👁 View Only" label instead of date dropdown
    await expect(page.getByText(/👁\s*View Only/)).toBeVisible();

    // Blue banner: "Shared session — read only"
    await expect(page.getByText('Shared session — read only')).toBeVisible();

    // Players tab: no Add/Remove/Generate controls
    await page.getByRole('tab', { name: 'Players' }).click();
    await expect(page.getByLabel('Player name')).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Add' })).not.toBeVisible();
    await expect(page.getByRole('button', { name: /Generate Schedule/ })).not.toBeVisible();

    // Scores tab: no Save/Update buttons
    await page.getByRole('tab', { name: 'Scores' }).click();
    await expect(page.getByRole('button', { name: /Save Court/ })).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Update' })).not.toBeVisible();

    // Leaderboard tab: no Share QR or Reset Session
    await goToLeaderboard(page);
    await expect(page.getByRole('button', { name: 'Share QR' })).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Reset Session' })).not.toBeVisible();
  });

  test('5.6 — Invalid Hash in URL Gracefully Degrades [NEGATIVE]', async ({ page }) => {
    // Navigate to base URL with an invalid base64 hash
    await page.goto(`${BASE_URL}#thisisnotvalidbase64!!!`);

    // The app does not crash
    await expect(page.getByRole('tab', { name: 'Players' })).toBeVisible();

    // No read-only banner shown
    await expect(page.getByText('Shared session — read only')).not.toBeVisible();

    // No "View Only" label shown
    await expect(page.getByText(/👁\s*View Only/)).not.toBeVisible();

    // Player name input is present (editable mode)
    await page.getByRole('tab', { name: 'Players' }).click();
    await expect(page.getByLabel('Player name')).toBeVisible();
  });

  test('5.7 — QR Code Renders for Standard-Length Session', async ({ page }) => {
    // Precondition: Share dialog open with 8-player, 1-round-scored session
    await freshState(page);
    await page.getByRole('tab', { name: 'Players' }).click();
    await setupSchedule(page);
    await saveRound1Scores(page);
    await goToLeaderboard(page);
    await page.getByRole('button', { name: 'Share QR' }).click();

    // QR code canvas is visible
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();

    // Canvas has non-zero dimensions
    const dimensions = await canvas.evaluate((el: HTMLCanvasElement) => ({
      width: el.width,
      height: el.height,
    }));
    expect(dimensions.width).toBeGreaterThan(0);
    expect(dimensions.height).toBeGreaterThan(0);

    // Canvas has role="img" and accessible label
    await expect(canvas).toHaveAttribute('role', 'img');
    await expect(canvas).toHaveAttribute('aria-label', 'QR code to share this session');
  });

  test('5.8 — Share Dialog Accessible via Keyboard [A11Y]', async ({ page }) => {
    // Precondition: Leaderboard tab active, Share QR button visible
    await freshState(page);
    await page.getByRole('tab', { name: 'Players' }).click();
    await setupSchedule(page);
    await saveRound1Scores(page);
    await goToLeaderboard(page);

    // 1. Tab to Share QR button and press Enter to open dialog
    await page.getByRole('button', { name: 'Share QR' }).focus();
    await page.keyboard.press('Enter');

    // Dialog opens via keyboard
    await expect(page.getByRole('dialog')).toBeVisible();

    // Close button is reachable, press Enter to close
    const closeButton = page.getByRole('button', { name: 'Close' });
    await closeButton.focus();
    await page.keyboard.press('Enter');

    // Dialog closes without losing leaderboard context
    await expect(page.getByRole('dialog')).not.toBeVisible();
    await expect(page.getByRole('tab', { name: 'Leaderboard' })).toBeVisible();
  });
});
