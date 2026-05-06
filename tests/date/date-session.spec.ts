// spec: specs/test-plan.md — Section 6

import { test, expect } from '@playwright/test';
import { freshState, addPlayers, setupSchedule, generateShareUrl, EIGHT_PLAYERS } from '../helpers';

const BASE_URL = 'http://localhost:4200/roundrobin';

test.describe('Date Session Management', () => {
  test("6.1 — Today's Date Pre-Selected on First Load", async ({ page }) => {
    // Precondition: fresh state
    await freshState(page);

    // The date dropdown in the toolbar shows today's date
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    await expect(page.getByText(today)).toBeVisible();
  });

  test('6.2 — Multiple Sessions via Date Dropdown', async ({ page }) => {
    // Precondition: a session exists for today with players added
    await freshState(page);
    await page.getByRole('tab', { name: 'Players' }).click();
    await addPlayers(page, ['Alice']);

    // Click the date dropdown
    await page.getByRole('combobox').click();

    // Today's date is always present
    const today = new Date().toISOString().split('T')[0];
    await expect(page.getByText(today).first()).toBeVisible();
  });

  test('6.3 — Switching Date Loads Corresponding Session', async ({ page }) => {
    // Precondition: inject a session for a past date via localStorage
    await freshState(page);

    const pastDate = '2026-04-01';
    const pastSession = {
      date: pastDate,
      players: [{ id: 'abc-123', name: 'PastPlayer' }],
      rounds: [],
    };

    // Inject past session into localStorage
    await page.evaluate(
      ([key, value]) => localStorage.setItem(key, value),
      [`pickleball-session-${pastDate}`, JSON.stringify(pastSession)]
    );

    // Reload to pick up the injected session
    await page.goto(BASE_URL);

    // Open the date dropdown and select the past date
    await page.getByRole('combobox').click();
    await page.getByRole('option', { name: pastDate }).click();

    // Players for the selected date are loaded
    await page.getByRole('tab', { name: 'Players' }).click();
    await expect(page.getByText('PastPlayer')).toBeVisible();
  });

  test('6.4 — Date Dropdown Hidden in Read-Only Mode', async ({ page }) => {
    // Precondition: app loaded via shared URL hash
    const shareUrl = await generateShareUrl(page);
    await page.goto(shareUrl);

    // Date dropdown is replaced by "View Only" text
    await expect(page.getByText(/View Only/)).toBeVisible();

    // Date combobox is not visible
    await expect(page.getByRole('combobox')).not.toBeVisible();
  });
});
