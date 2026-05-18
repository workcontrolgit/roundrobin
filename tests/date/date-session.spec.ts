// spec: specs/test-plan.md — Section 6

import { test, expect } from '@playwright/test';
import { freshState, generateShareUrl } from '../helpers';

const BASE_URL = 'http://localhost:4200/roundrobin';

test.describe('Date Session Management', () => {
  test("6.1 — Today's Date Pre-Selected on First Load", async ({ page }) => {
    await freshState(page);

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    // Format as "MMM D" (e.g. "May 17") — matches Angular DatePipe 'MMM d'
    const formatted = new Date(today + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    await expect(page.getByText(new RegExp(formatted))).toBeVisible();
  });

  test('6.2 — Session Chip Shows Current Session Label', async ({ page }) => {
    await freshState(page);

    // Chip displays "📅 <date> · S1"
    await expect(page.getByRole('button', { name: /S1/ })).toBeVisible();
  });

  test('6.3 — Switching to Past Date Loads Corresponding Session', async ({ page }) => {
    await freshState(page);

    const pastDate = '2026-04-01';
    const pastSession = {
      date: pastDate,
      sessionNumber: 1,
      players: [{ id: 'abc-123', name: 'PastPlayer' }],
      rounds: [],
    };

    // Inject past session with new key format
    await page.evaluate(
      ([key, value]) => localStorage.setItem(key, value),
      [`pickleball-session-${pastDate}-1`, JSON.stringify(pastSession)]
    );

    await page.goto(BASE_URL);

    // Open session drawer
    await page.getByRole('button', { name: /S1/ }).click();

    // Change date in drawer
    await page.locator('input[type="date"]').evaluate(
      (el: HTMLInputElement, date) => {
        el.value = date;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      },
      pastDate
    );

    // Select Session 1 for past date
    await page.getByRole('button', { name: /Session 1/ }).click();

    // Players for the selected date are loaded
    await page.getByRole('tab', { name: 'Players' }).click();
    await expect(page.getByText('PastPlayer')).toBeVisible();
  });

  test('6.4 — Session Chip Hidden in Read-Only Mode', async ({ page }) => {
    const shareUrl = await generateShareUrl(page);
    await page.goto(shareUrl);

    // "View Only" text is visible
    await expect(page.getByText(/View Only/)).toBeVisible();

    // Session chip button is not visible
    await expect(page.getByRole('button', { name: /S\d/ })).not.toBeVisible();
  });

  test('6.5 — Multiple Sessions on Same Day', async ({ page }) => {
    await freshState(page);

    // Open drawer and create Session 2
    await page.getByRole('button', { name: /S1/ }).click();
    await page.getByRole('button', { name: /New Session/ }).click();

    // Chip now shows S2
    await expect(page.getByRole('button', { name: /S2/ })).toBeVisible();

    // Open drawer — both sessions listed
    await page.getByRole('button', { name: /S2/ }).click();
    await expect(page.getByRole('button', { name: /Session 1/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Session 2/ })).toBeVisible();

    // Switch back to Session 1
    await page.getByRole('button', { name: /Session 1/ }).click();
    await expect(page.getByRole('button', { name: /S1/ })).toBeVisible();
  });

  test('6.6 — Future Date Can Be Selected', async ({ page }) => {
    await freshState(page);

    const futureDate = '2027-01-15';

    // Open drawer and set a future date
    await page.getByRole('button', { name: /S1/ }).click();
    await page.locator('input[type="date"]').evaluate(
      (el: HTMLInputElement, date) => {
        el.value = date;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      },
      futureDate
    );

    // Create Session 1 for future date
    await page.getByRole('button', { name: /New Session/ }).click();

    // Chip now shows future date · S1 (format: "Jan 15 · S1")
    const futureFormatted = new Date(futureDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    await expect(page.getByRole('button', { name: new RegExp(futureFormatted) })).toBeVisible();

    // Add a player to verify session works for future date
    await page.getByRole('tab', { name: 'Players' }).click();
    await page.getByLabel('Player name').fill('FuturePlayer');
    await page.getByRole('button', { name: 'Add' }).click();
    await expect(page.getByText('FuturePlayer')).toBeVisible();
  });
});
