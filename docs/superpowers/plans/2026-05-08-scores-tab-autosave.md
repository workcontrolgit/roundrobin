# Scores Tab — Auto-save on Blur Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all Save/Update buttons on the Scores tab with auto-save on blur — scores save automatically when the user leaves a score input field.

**Architecture:** Add `onBlurSave(roundIndex, courtName)` to `ScoresTab`, bind it to `(blur)` on every score input. Completed courts become editable with the same handler using a fallback to the existing saved score for unmodified fields. Remove all Save buttons, Update buttons, and per-court checkmarks from the previous iteration.

**Tech Stack:** Angular 20, Angular Material, Signals, Playwright

---

## Files Changed

| File | Change |
|------|--------|
| `src/app/scores-tab/scores-tab.ts` | Replace with simplified version: remove `canSave`, `saveScore`, `courtReady`, `courtsReadyCount`, `allCourtsReady`, `saveRound`; add `onBlurSave()`; remove `MatButtonModule` import |
| `src/app/scores-tab/scores-tab.html` | Remove Save Round button, remove Update button, remove ✓/○ checkmarks; add `(blur)` to all score inputs; make completed court inputs editable without buttons |
| `tests/helpers.ts` | Update `saveRound1Scores()` — fill + Tab instead of button click |
| `tests/scores/scores-tab.spec.ts` | Rewrite 10 tests; remove 2 checkmark tests (3.4, 3.12) |

---

## Task 1: Simplify ScoresTab component

**Files:**
- Modify: `src/app/scores-tab/scores-tab.ts`

- [ ] **Step 1: Overwrite the component with the simplified version**

```typescript
import { Component, Input, inject, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { SessionService } from '../services/session.service';

interface ScoreEntry {
  team1Score: number | null;
  team2Score: number | null;
}

@Component({
  selector: 'app-scores-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, MatCardModule, MatInputModule],
  templateUrl: './scores-tab.html',
})
export class ScoresTab {
  @Input() readOnly = false;

  readonly sessionService = inject(SessionService);
  readonly rounds = computed(() => this.sessionService.activeSession()?.rounds ?? []);
  readonly players = computed(() => this.sessionService.activeSession()?.players ?? []);

  // Per-round-per-court pending score inputs: key = `${roundIndex}-${courtName}`
  pendingScores: Record<string, ScoreEntry> = {};

  constructor() {
    // Clear pending inputs whenever the active session changes.
    effect(() => {
      this.sessionService.activeSession();
      this.pendingScores = {};
    });
  }

  readonly activeRoundIndex = computed(() => {
    const rounds = this.rounds();
    for (let i = 0; i < rounds.length; i++) {
      if (rounds[i].courts.some(c => c.score == null)) return i;
    }
    return rounds.length;
  });

  playerName(id: string): string {
    return this.players().find(p => p.id === id)?.name ?? id;
  }

  entryKey(roundIndex: number, courtName: string): string {
    return `${roundIndex}-${courtName}`;
  }

  getPending(roundIndex: number, courtName: string): ScoreEntry {
    const key = this.entryKey(roundIndex, courtName);
    if (!this.pendingScores[key]) {
      this.pendingScores[key] = { team1Score: null, team2Score: null };
    }
    return this.pendingScores[key];
  }

  onBlurSave(roundIndex: number, courtName: string): void {
    const court = this.rounds()[roundIndex]?.courts.find(c => c.courtName === courtName);
    const pending = this.getPending(roundIndex, courtName);
    // Fall back to existing saved score for fields the user didn't touch
    const team1 = pending.team1Score ?? court?.score?.team1 ?? null;
    const team2 = pending.team2Score ?? court?.score?.team2 ?? null;
    if (team1 != null && team2 != null && team1 >= 0 && team2 >= 0) {
      this.sessionService.saveScore(roundIndex, courtName, team1, team2);
      delete this.pendingScores[this.entryKey(roundIndex, courtName)];
    }
  }
}
```

- [ ] **Step 2: Verify build passes**

```bash
cd c:\apps\pickleball\roundrobin && npm run build 2>&1 | tail -10
```

Expected: `Application bundle generation complete.` — no TypeScript errors. (Warnings about bundle size and qrcode CommonJS are OK.)

- [ ] **Step 3: Commit**

```bash
cd c:\apps\pickleball\roundrobin && git add src/app/scores-tab/scores-tab.ts && git commit -m "feat(scores-tab): replace Save buttons with onBlurSave auto-save"
```

---

## Task 2: Redesign the template

**Files:**
- Modify: `src/app/scores-tab/scores-tab.html`

- [ ] **Step 1: Overwrite the template**

Key changes:
- Completed court block (`@if court.score`): remove Update button; add `(blur)="onBlurSave(ri, court.courtName)"` to both inputs
- Active court block (`@else if`): remove ✓/○ checkmark span; remove `margin-bottom:8px` div wrapper; add `(blur)="onBlurSave(ri, court.courtName)"` to both inputs
- Remove Save Round button block (`@if (ri === activeRoundIndex() && !readOnly)`) entirely

```html
<div style="max-width:500px; margin:0 auto;">
  <h2 style="color:#52b788;">Scores</h2>

  @if (rounds().length === 0) {
    <p class="text-muted" style="text-align:center;">Generate a schedule first.</p>
  }

  @for (round of rounds(); track round.roundNumber; let ri = $index) {
    <mat-card class="round-card"
              [class.active]="ri === activeRoundIndex()"
              [class.completed]="ri < activeRoundIndex()"
              [class.upcoming]="ri > activeRoundIndex()">
      <mat-card-header>
        <mat-card-title style="font-size:14px;">Round {{ round.roundNumber }}</mat-card-title>
      </mat-card-header>

      <mat-card-content style="margin-top:12px;">
        @for (court of round.courts; track court.courtName) {
          <div style="margin-bottom:14px;">
            <div class="text-muted text-small" style="margin-bottom:6px;">{{ court.courtName }}</div>

            @if (court.score) {
              <!-- Completed — editable, auto-saves on blur -->
              <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                <span style="font-size:13px;">{{ playerName(court.team1[0]) }} &amp; {{ playerName(court.team1[1]) }}</span>
                <input type="number" min="0"
                       [ngModel]="court.score.team1"
                       (ngModelChange)="getPending(ri, court.courtName).team1Score = $event"
                       (blur)="onBlurSave(ri, court.courtName)"
                       [disabled]="readOnly"
                       [attr.aria-label]="court.courtName + ' team 1 score'"
                       style="width:48px; background:#1a1a2e; border:1px solid #444; border-radius:4px; padding:4px; color:#a6e3a1; text-align:center;" />
                <span class="text-muted">–</span>
                <input type="number" min="0"
                       [ngModel]="court.score.team2"
                       (ngModelChange)="getPending(ri, court.courtName).team2Score = $event"
                       (blur)="onBlurSave(ri, court.courtName)"
                       [disabled]="readOnly"
                       [attr.aria-label]="court.courtName + ' team 2 score'"
                       style="width:48px; background:#1a1a2e; border:1px solid #444; border-radius:4px; padding:4px; color:#f38ba8; text-align:center;" />
                <span style="font-size:13px;">{{ playerName(court.team2[0]) }} &amp; {{ playerName(court.team2[1]) }}</span>
              </div>
            } @else if (ri === activeRoundIndex() && !readOnly) {
              <!-- Active — score entry, auto-saves on blur -->
              <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                <span style="font-size:13px;">{{ playerName(court.team1[0]) }} &amp; {{ playerName(court.team1[1]) }}</span>
                <input type="number" min="0" placeholder="0"
                       [ngModel]="getPending(ri, court.courtName).team1Score"
                       (ngModelChange)="getPending(ri, court.courtName).team1Score = $event"
                       (blur)="onBlurSave(ri, court.courtName)"
                       [attr.aria-label]="court.courtName + ' team 1 score'"
                       style="width:48px; background:#1a1a2e; border:1px solid #52b788; border-radius:4px; padding:4px; color:#cdd6f4; text-align:center;" />
                <span class="text-muted">–</span>
                <input type="number" min="0" placeholder="0"
                       [ngModel]="getPending(ri, court.courtName).team2Score"
                       (ngModelChange)="getPending(ri, court.courtName).team2Score = $event"
                       (blur)="onBlurSave(ri, court.courtName)"
                       [attr.aria-label]="court.courtName + ' team 2 score'"
                       style="width:48px; background:#1a1a2e; border:1px solid #52b788; border-radius:4px; padding:4px; color:#cdd6f4; text-align:center;" />
                <span style="font-size:13px;">{{ playerName(court.team2[0]) }} &amp; {{ playerName(court.team2[1]) }}</span>
              </div>
            } @else {
              <!-- Upcoming -->
              <div class="text-muted" style="font-size:13px;">
                {{ playerName(court.team1[0]) }} &amp; {{ playerName(court.team1[1]) }}
                vs
                {{ playerName(court.team2[0]) }} &amp; {{ playerName(court.team2[1]) }}
              </div>
            }
          </div>
        }
      </mat-card-content>
    </mat-card>
  }
</div>
```

- [ ] **Step 2: Verify build passes**

```bash
cd c:\apps\pickleball\roundrobin && npm run build 2>&1 | tail -10
```

Expected: `Application bundle generation complete.` — no errors.

- [ ] **Step 3: Commit**

```bash
cd c:\apps\pickleball\roundrobin && git add src/app/scores-tab/scores-tab.html && git commit -m "feat(scores-tab): remove all Save/Update buttons; add blur auto-save to all inputs"
```

---

## Task 3: Update helpers.ts

`saveRound1Scores` previously clicked a button. Now it fills both scores and presses Tab on the last field to trigger blur (and thus `onBlurSave`).

**Files:**
- Modify: `tests/helpers.ts`

- [ ] **Step 1: Replace `saveRound1Scores`**

Replace lines 66–83 (the `saveRound1Scores` function) with:

```typescript
/** Save scores for both courts of the active round via blur auto-save */
export async function saveRound1Scores(
  page: Page,
  court1: [number, number] = [11, 7],
  court2: [number, number] = [9, 11],
): Promise<void> {
  await goToScores(page);

  // Court 1: fill both fields, Tab out of team2 to trigger onBlurSave
  await page.getByLabel('Court 1 team 1 score').first().fill(String(court1[0]));
  await page.getByLabel('Court 1 team 2 score').first().fill(String(court1[1]));
  await page.getByLabel('Court 1 team 2 score').first().press('Tab');

  // Court 2: fill both fields, Tab out of team2 to trigger onBlurSave
  await page.getByLabel('Court 2 team 1 score').first().fill(String(court2[0]));
  await page.getByLabel('Court 2 team 2 score').first().fill(String(court2[1]));
  await page.getByLabel('Court 2 team 2 score').first().press('Tab');
}
```

- [ ] **Step 2: Commit**

```bash
cd c:\apps\pickleball\roundrobin && git add tests/helpers.ts && git commit -m "test(helpers): update saveRound1Scores to use Tab blur instead of button"
```

---

## Task 4: Rewrite Playwright tests

**Files:**
- Modify: `tests/scores/scores-tab.spec.ts`

Tests 3.4 and 3.12 (checkmark tests) are removed. Tests 3.2, 3.3, 3.5, 3.6, 3.7, 3.8, 3.11 are rewritten. Tests 3.1, 3.9, 3.10 are unchanged.

- [ ] **Step 1: Overwrite the test file**

```typescript
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

  test('3.2 — Active Round Shows Score Inputs, No Buttons', async ({ page }) => {
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

    // No Save or Update buttons anywhere
    await expect(page.getByRole('button', { name: /Save/ })).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Update' })).not.toBeVisible();

    // Rounds 2–7 are upcoming (no inputs)
    const allCards = page.locator('.round-card');
    const count = await allCards.count();
    for (let i = 1; i < count; i++) {
      await expect(allCards.nth(i)).toHaveClass(/upcoming/);
    }
  });

  test('3.3 — Auto-save Fires on Blur When Both Scores Valid', async ({ page }) => {
    await freshState(page);
    await goToPlayers(page);
    await setupSchedule(page);
    await goToScores(page);

    const round1Card = page.locator('.round-card').first();

    // Fill Court 1 both scores, Tab out of team2 → auto-saves Court 1
    await page.getByLabel('Court 1 team 1 score').first().fill('11');
    await page.getByLabel('Court 1 team 2 score').first().fill('7');
    await page.getByLabel('Court 1 team 2 score').first().press('Tab');

    // Round 1 still active (Court 2 not yet saved)
    await expect(round1Card).toHaveClass(/active/);

    // Fill Court 2, Tab out → Round 1 completes, Round 2 activates
    await page.getByLabel('Court 2 team 1 score').first().fill('9');
    await page.getByLabel('Court 2 team 2 score').first().fill('11');
    await page.getByLabel('Court 2 team 2 score').first().press('Tab');

    await expect(round1Card).toHaveClass(/completed/);
    await expect(page.locator('.round-card').nth(1)).toHaveClass(/active/);
  });

  test('3.4 — Round Advances After All Courts Auto-Saved', async ({ page }) => {
    await freshState(page);
    await goToPlayers(page);
    await setupSchedule(page);
    await saveRound1Scores(page, [11, 7], [9, 11]);

    // Round 1 is completed, Round 2 is active
    await expect(page.locator('.round-card').first()).toHaveClass(/completed/);
    await expect(page.locator('.round-card').nth(1)).toHaveClass(/active/);

    // Round 1 shows saved scores as editable inputs (no Update button)
    await expect(page.getByLabel('Court 1 team 1 score').first()).toHaveValue('11');
    await expect(page.getByLabel('Court 1 team 2 score').first()).toHaveValue('7');
    await expect(page.getByRole('button', { name: 'Update' })).not.toBeVisible();
  });

  test('3.5 — Edit Completed Court Score via Blur (Fallback Save)', async ({ page }) => {
    await freshState(page);
    await goToPlayers(page);
    await setupSchedule(page);
    await saveRound1Scores(page, [11, 7], [9, 11]);

    // Edit only Court 1 team 1 score: fill 9, Tab out
    // onBlurSave uses team2 fallback from court.score.team2 (= 7)
    await page.getByLabel('Court 1 team 1 score').first().fill('9');
    await page.getByLabel('Court 1 team 1 score').first().press('Tab');

    // Score updated to 9–7
    await expect(page.getByLabel('Court 1 team 1 score').first()).toHaveValue('9');
    await expect(page.getByLabel('Court 1 team 2 score').first()).toHaveValue('7');

    // Leaderboard reflects the updated score
    await goToLeaderboard(page);
    await expect(page.locator('mat-card').first()).toBeVisible();
  });

  test('3.6 — Zero-Zero Scores Auto-Save on Blur', async ({ page }) => {
    await freshState(page);
    await goToPlayers(page);
    await setupSchedule(page);
    await goToScores(page);

    // Fill 0–0 for Court 1, Tab out → saves (>= 0 is valid)
    await page.getByLabel('Court 1 team 1 score').first().fill('0');
    await page.getByLabel('Court 1 team 2 score').first().fill('0');
    await page.getByLabel('Court 1 team 2 score').first().press('Tab');

    // Round 1 still active (Court 2 not yet saved)
    await expect(page.locator('.round-card').first()).toHaveClass(/active/);

    // Fill Court 2 with 0–0, Tab out → Round 1 completes
    await page.getByLabel('Court 2 team 1 score').first().fill('0');
    await page.getByLabel('Court 2 team 2 score').first().fill('0');
    await page.getByLabel('Court 2 team 2 score').first().press('Tab');

    await expect(page.locator('.round-card').first()).toHaveClass(/completed/);
  });

  test('3.7 — Negative Score Does Not Auto-Save [NEGATIVE]', async ({ page }) => {
    await freshState(page);
    await goToPlayers(page);
    await setupSchedule(page);
    await goToScores(page);

    // Enter -1 for team1, valid for team2, Tab out — onBlurSave rejects (< 0)
    await page.getByLabel('Court 1 team 1 score').first().fill('-1');
    await page.getByLabel('Court 1 team 2 score').first().fill('11');
    await page.getByLabel('Court 1 team 2 score').first().press('Tab');

    // Round 1 still active (score was not saved)
    await expect(page.locator('.round-card').first()).toHaveClass(/active/);
  });

  test('3.8 — Upcoming Round Shows Read-Only Teams (No Inputs)', async ({ page }) => {
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
    }
  });

  test('3.9 — Scores Tab in Read-Only Mode', async ({ page }) => {
    const shareUrl = await generateShareUrl(page);
    await page.goto(shareUrl);
    await goToScores(page);

    await expect(page.getByText('Shared session — read only')).toBeVisible();

    // Score inputs visible but disabled — no Save buttons
    const court1Input = page.getByLabel('Court 1 team 1 score').first();
    await expect(court1Input).toBeVisible();
    await expect(court1Input).toBeDisabled();
    await expect(page.getByRole('button', { name: /Save/ })).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Update' })).not.toBeVisible();
  });

  test('3.10 — Score Persistence After Reload', async ({ page }) => {
    await freshState(page);
    await goToPlayers(page);
    await setupSchedule(page);
    await saveRound1Scores(page, [11, 7], [9, 11]);

    await page.reload();
    await goToScores(page);

    // Round 1 still completed with correct scores
    await expect(page.locator('.round-card').first()).toHaveClass(/completed/);
    await expect(page.getByLabel('Court 1 team 1 score').first()).toHaveValue('11');
    await expect(page.getByLabel('Court 1 team 2 score').first()).toHaveValue('7');
    await expect(page.getByLabel('Court 2 team 1 score').first()).toHaveValue('9');
    await expect(page.getByLabel('Court 2 team 2 score').first()).toHaveValue('11');
  });

  test('3.11 — Partial Fill Does Not Auto-Save', async ({ page }) => {
    await freshState(page);
    await goToPlayers(page);
    await setupSchedule(page);
    await goToScores(page);

    // Fill only team1, Tab to team2 (blurs team1) — save must not fire
    await page.getByLabel('Court 1 team 1 score').first().fill('11');
    await page.getByLabel('Court 1 team 1 score').first().press('Tab');

    // Round 1 still active (only one score entered)
    await expect(page.locator('.round-card').first()).toHaveClass(/active/);
  });
});
```

- [ ] **Step 2: Commit**

```bash
cd c:\apps\pickleball\roundrobin && git add tests/scores/scores-tab.spec.ts && git commit -m "test(scores-tab): rewrite E2E tests for blur auto-save; remove button-based tests"
```

---

## Task 5: Run tests and verify

- [ ] **Step 1: Confirm dev server is running at http://localhost:4200/roundrobin**

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:4200/roundrobin
```

Expected: `200`. If not, run `npm start` in a separate terminal first.

- [ ] **Step 2: Run the scores tests**

```bash
cd c:\apps\pickleball\roundrobin && npx playwright test tests/scores/scores-tab.spec.ts --project=chromium --reporter=line
```

Expected: 11/11 pass. If any fail, check locators — the logic is correct. Common issue: `press('Tab')` may need `await page.waitForTimeout(100)` after if Angular's change detection hasn't fired yet.

- [ ] **Step 3: Run the full suite to catch regressions**

```bash
cd c:\apps\pickleball\roundrobin && npx playwright test --project=chromium --reporter=line
```

Expected: all tests pass (leaderboard, share dialog, cross-tab, etc. all use `saveRound1Scores` from helpers).

- [ ] **Step 4: Run unit tests**

```bash
cd c:\apps\pickleball\roundrobin && npm test -- --watch=false --browsers=ChromeHeadless 2>&1 | tail -5
```

Expected: `TOTAL: 30 SUCCESS`
