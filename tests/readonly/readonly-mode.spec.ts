// spec: specs/test-plan.md — Section 7

import { test, expect } from '@playwright/test';
import { freshState, generateShareUrl } from '../helpers';

const BASE_URL = 'http://localhost:4200/roundrobin';

test.describe('URL Hash / Read-Only Mode', () => {
  test('7.2 — Read-Only: View Only Banner Visible', async ({ page }) => {
    // Precondition: URL from test 7.1 setup opened in clean context
    const shareUrl = await generateShareUrl(page);
    await page.goto(shareUrl);

    // Blue banner: "Shared session — read only" appears
    await expect(page.getByText(/Shared session.*read only/i)).toBeVisible();

    // Toolbar shows "View Only" instead of date dropdown
    await expect(page.getByText(/View Only/)).toBeVisible();
    await expect(page.getByRole('combobox')).not.toBeVisible();
  });

  test('7.3 — Read-Only: All Tabs Show Correct Data', async ({ page }) => {
    // Precondition: read-only URL loaded (session has players, schedule, Round 1 scores)
    const shareUrl = await generateShareUrl(page);
    await page.goto(shareUrl);

    // Players tab: all 8 players listed with no edit controls
    await page.getByRole('tab', { name: 'Players' }).click();
    await expect(page.getByText('1. Alice')).toBeVisible();
    await expect(page.getByLabel('Player name')).not.toBeVisible();

    // Schedule tab: Round 1 COMPLETED, Round 2 NOW
    await page.getByRole('tab', { name: 'Schedule' }).click();
    await expect(page.locator('.round-card').first().getByText('COMPLETED')).toBeVisible();
    await expect(page.locator('.round-card').nth(1).getByText('ACTIVE')).toBeVisible();

    // Scores tab: saved scores visible
    await page.getByRole('tab', { name: 'Scores' }).click();
    await expect(page.locator('.round-card').first().getByText('11–7')).toBeVisible();

    // Leaderboard tab: ranked stats, no Share QR or Reset
    await page.getByRole('tab', { name: 'Leaderboard' }).click();
    await expect(page.getByText('🥇')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Share QR' })).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Reset Session' })).not.toBeVisible();
  });

  test('7.4 — Read-Only: Cannot Modify Data [NEGATIVE]', async ({ page }) => {
    // Precondition: read-only URL loaded
    const shareUrl = await generateShareUrl(page);
    await page.goto(shareUrl);

    // Players tab: no Add/Remove/Generate controls
    await page.getByRole('tab', { name: 'Players' }).click();
    await expect(page.getByLabel('Player name')).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Add' })).not.toBeVisible();
    await expect(page.getByRole('button', { name: /Generate Schedule/ })).not.toBeVisible();
    await expect(page.getByRole('button', { name: /^Remove / })).not.toBeVisible();

    // Scores tab: inputs disabled, no Save/Update
    await page.getByRole('tab', { name: 'Scores' }).click();
    await expect(page.getByRole('button', { name: /Save Court/ })).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Update' })).not.toBeVisible();

    // Leaderboard tab: no Reset Session
    await page.getByRole('tab', { name: 'Leaderboard' }).click();
    await expect(page.getByRole('button', { name: 'Reset Session' })).not.toBeVisible();
  });

  test('7.5 — Malformed Hash Ignored, Normal Mode Loads [NEGATIVE]', async ({ page }) => {
    // 1. Navigate to base URL with a too-short hash
    await page.goto(`${BASE_URL}#AAAA`);

    // App falls back to normal mode — no read-only banner
    await expect(page.getByText(/Shared session.*read only/i)).not.toBeVisible();
    await expect(page.getByText(/View Only/)).not.toBeVisible();

    // Today's date session initialized — Players tab accessible
    await page.getByRole('tab', { name: 'Players' }).click();
    await expect(page.getByText('0 / 11')).toBeVisible();
  });

  test('7.6 — Hash with Valid Base64 but Invalid JSON [NEGATIVE]', async ({ page }) => {
    // Navigate to base URL with base64 of a non-JSON string
    const invalidHash = btoa('hello world');
    await page.goto(`${BASE_URL}#${invalidHash}`);

    // App loads in normal mode (no crash, no error displayed)
    await expect(page.locator('app-root')).toBeVisible();
    await expect(page.getByText(/Shared session.*read only/i)).not.toBeVisible();

    // App is functional
    await page.getByRole('tab', { name: 'Players' }).click();
    await expect(page.getByText('0 / 11')).toBeVisible();
  });
});
