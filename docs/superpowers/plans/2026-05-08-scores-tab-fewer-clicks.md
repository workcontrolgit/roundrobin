# Scores Tab — Fewer Clicks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace per-court Save buttons in the active round with a single "Save Round N (X/Y courts ready)" button, adding per-court checkmarks (✓/○) as visual progress indicators.

**Architecture:** Add 4 new methods to `ScoresTab` for readiness tracking and round-level save. Update the template to show checkmarks per court and a single Save Round button at the bottom of the active round card. Update helpers and Playwright tests to use the new button.

**Tech Stack:** Angular 20, Angular Material, Signals, Playwright

---

## Files Changed

| File | Change |
|------|--------|
| `src/app/scores-tab/scores-tab.ts` | Add `courtReady()`, `courtsReadyCount()`, `allCourtsReady()`, `saveRound()` |
| `src/app/scores-tab/scores-tab.html` | Remove per-court Save button; add checkmark per court; add Save Round button after court loop |
| `tests/helpers.ts` | Update `saveRound1Scores()` to use new Save Round button |
| `tests/scores/scores-tab.spec.ts` | Update 8 tests; repurpose 2 tests for new checkmark behavior |

---

## Task 1: Add new methods to ScoresTab

**Files:**
- Modify: `src/app/scores-tab/scores-tab.ts`

- [ ] **Step 1: Add the 4 new methods after `canSave()`**

Replace the existing `canSave` and `saveScore` methods block in `scores-tab.ts`. Add the 4 new methods after `canSave`. The full updated file:

```typescript
import { Component, Input, inject, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { SessionService } from '../services/session.service';

interface ScoreEntry {
  team1Score: number | null;
  team2Score: number | null;
}

@Component({
  selector: 'app-scores-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, MatCardModule, MatButtonModule, MatInputModule],
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
    // Clear pending inputs whenever the active session changes (including after saves).
    // This prevents stale inputs from one session appearing in another.
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

  canSave(roundIndex: number, courtName: string): boolean {
    const entry = this.getPending(roundIndex, courtName);
    return entry.team1Score != null && entry.team2Score != null &&
           entry.team1Score >= 0 && entry.team2Score >= 0;
  }

  saveScore(roundIndex: number, courtName: string): void {
    const entry = this.getPending(roundIndex, courtName);
    if (!this.canSave(roundIndex, courtName)) return;
    this.sessionService.saveScore(roundIndex, courtName, entry.team1Score!, entry.team2Score!);
    delete this.pendingScores[this.entryKey(roundIndex, courtName)];
  }

  courtReady(roundIndex: number, courtName: string): boolean {
    const entry = this.getPending(roundIndex, courtName);
    return entry.team1Score != null && entry.team2Score != null &&
           entry.team1Score >= 0 && entry.team2Score >= 0;
  }

  courtsReadyCount(roundIndex: number): number {
    const courts = this.rounds()[roundIndex]?.courts ?? [];
    return courts.filter(c => this.courtReady(roundIndex, c.courtName)).length;
  }

  allCourtsReady(roundIndex: number): boolean {
    const courts = this.rounds()[roundIndex]?.courts ?? [];
    return courts.length > 0 && this.courtsReadyCount(roundIndex) === courts.length;
  }

  saveRound(roundIndex: number): void {
    const courts = this.rounds()[roundIndex]?.courts ?? [];
    for (const court of courts) {
      if (this.courtReady(roundIndex, court.courtName)) {
        const entry = this.getPending(roundIndex, court.courtName);
        this.sessionService.saveScore(roundIndex, court.courtName, entry.team1Score!, entry.team2Score!);
      }
    }
  }
}
```

- [ ] **Step 2: Verify build passes**

```bash
npm run build 2>&1 | tail -20
```

Expected: `Application bundle generation complete.` with no errors (warnings are OK).

- [ ] **Step 3: Commit**

```bash
git add src/app/scores-tab/scores-tab.ts
git commit -m "feat(scores-tab): add courtReady/allCourtsReady/saveRound methods"
```

---

## Task 2: Redesign the active round template

**Files:**
- Modify: `src/app/scores-tab/scores-tab.html`

- [ ] **Step 1: Replace the full template**

Write the complete new `scores-tab.html`. Key changes:
- Active court rows: add `✓`/`○` checkmark span; remove per-court Save button
- After the `@for (court ...)` loop, inside `mat-card-content`: add the Save Round button

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
              <!-- Completed — show editable score -->
              <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                <span style="font-size:13px;">{{ playerName(court.team1[0]) }} &amp; {{ playerName(court.team1[1]) }}</span>
                <input type="number" min="0"
                       [ngModel]="court.score.team1"
                       (ngModelChange)="getPending(ri, court.courtName).team1Score = $event"
                       [disabled]="readOnly"
                       [attr.aria-label]="court.courtName + ' team 1 score'"
                       style="width:48px; background:#1a1a2e; border:1px solid #444; border-radius:4px; padding:4px; color:#a6e3a1; text-align:center;" />
                <span class="text-muted">–</span>
                <input type="number" min="0"
                       [ngModel]="court.score.team2"
                       (ngModelChange)="getPending(ri, court.courtName).team2Score = $event"
                       [disabled]="readOnly"
                       [attr.aria-label]="court.courtName + ' team 2 score'"
                       style="width:48px; background:#1a1a2e; border:1px solid #444; border-radius:4px; padding:4px; color:#f38ba8; text-align:center;" />
                <span style="font-size:13px;">{{ playerName(court.team2[0]) }} &amp; {{ playerName(court.team2[1]) }}</span>
                @if (!readOnly) {
                  <button mat-stroked-button style="font-size:11px; height:28px; line-height:28px;"
                          (click)="saveScore(ri, court.courtName)">Update</button>
                }
              </div>
            } @else if (ri === activeRoundIndex() && !readOnly) {
              <!-- Active — score entry with per-court readiness indicator -->
              <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-bottom:8px;">
                <span [style.color]="courtReady(ri, court.courtName) ? '#52b788' : '#888'">
                  {{ courtReady(ri, court.courtName) ? '✓' : '○' }}
                </span>
                <span style="font-size:13px;">{{ playerName(court.team1[0]) }} &amp; {{ playerName(court.team1[1]) }}</span>
                <input type="number" min="0" placeholder="0"
                       [ngModel]="getPending(ri, court.courtName).team1Score"
                       (ngModelChange)="getPending(ri, court.courtName).team1Score = $event"
                       [attr.aria-label]="court.courtName + ' team 1 score'"
                       style="width:48px; background:#1a1a2e; border:1px solid #52b788; border-radius:4px; padding:4px; color:#cdd6f4; text-align:center;" />
                <span class="text-muted">–</span>
                <input type="number" min="0" placeholder="0"
                       [ngModel]="getPending(ri, court.courtName).team2Score"
                       (ngModelChange)="getPending(ri, court.courtName).team2Score = $event"
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
        @if (ri === activeRoundIndex() && !readOnly) {
          <button mat-raised-button color="primary" style="width:100%; margin-top:4px;"
                  [disabled]="!allCourtsReady(ri)"
                  (click)="saveRound(ri)">
            Save Round {{ round.roundNumber }} ({{ courtsReadyCount(ri) }}/{{ round.courts.length }} courts ready)
          </button>
        }
      </mat-card-content>
    </mat-card>
  }
</div>
```

- [ ] **Step 2: Verify build passes**

```bash
npm run build 2>&1 | tail -20
```

Expected: `Application bundle generation complete.` with no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/scores-tab/scores-tab.html
git commit -m "feat(scores-tab): replace per-court Save with single Save Round button + checkmarks"
```

---

## Task 3: Update helpers.ts

`saveRound1Scores` currently clicks per-court Save buttons. Update it to fill all scores then click the single Save Round button.

**Files:**
- Modify: `tests/helpers.ts`

- [ ] **Step 1: Update `saveRound1Scores`**

Replace the `saveRound1Scores` function (lines 66–86) with:

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add tests/helpers.ts
git commit -m "test(helpers): update saveRound1Scores to use Save Round button"
```

---

## Task 4: Update Playwright tests

**Files:**
- Modify: `tests/scores/scores-tab.spec.ts`

8 tests change; 2 are repurposed; 2 are unchanged (3.1, 3.6, 3.9, 3.10 are all unchanged).

- [ ] **Step 1: Rewrite `scores-tab.spec.ts`**

Write the complete updated file:

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

  test('3.2 — Active Round Shows Score Input Fields and Disabled Save Round Button', async ({ page }) => {
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

    // No per-court Save buttons
    await expect(page.getByRole('button', { name: 'Save Court 1 Score' })).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Save Court 2 Score' })).not.toBeVisible();

    // Single Save Round button is visible but disabled (0/2 courts ready)
    const saveRoundBtn = round1Card.getByRole('button', { name: /Save Round 1/ });
    await expect(saveRoundBtn).toBeVisible();
    await expect(saveRoundBtn).toBeDisabled();

    // Rounds 2–7 are upcoming (no inputs)
    const allCards = page.locator('.round-card');
    const count = await allCards.count();
    for (let i = 1; i < count; i++) {
      await expect(allCards.nth(i)).toHaveClass(/upcoming/);
    }
  });

  test('3.3 — Save Round Button Enables Only When ALL Courts Ready', async ({ page }) => {
    await freshState(page);
    await goToPlayers(page);
    await setupSchedule(page);
    await goToScores(page);

    const round1Card = page.locator('.round-card').first();
    const saveRoundBtn = round1Card.getByRole('button', { name: /Save Round 1/ });

    // Fill Court 1 only — button stays disabled (1/2)
    await page.getByLabel('Court 1 team 1 score').first().fill('11');
    await page.getByLabel('Court 1 team 2 score').first().fill('7');
    await expect(saveRoundBtn).toBeDisabled();

    // Fill Court 2 — button becomes enabled (2/2)
    await page.getByLabel('Court 2 team 1 score').first().fill('9');
    await page.getByLabel('Court 2 team 2 score').first().fill('11');
    await expect(saveRoundBtn).toBeEnabled();
  });

  test('3.4 — Court Checkmarks Show Per-Court Readiness', async ({ page }) => {
    await freshState(page);
    await goToPlayers(page);
    await setupSchedule(page);
    await goToScores(page);

    // Both courts start with ○ (not ready)
    await expect(page.getByText('○').first()).toBeVisible();

    // Fill Court 1 — its checkmark becomes ✓
    await page.getByLabel('Court 1 team 1 score').first().fill('11');
    await page.getByLabel('Court 1 team 2 score').first().fill('7');
    await expect(page.getByText('✓').first()).toBeVisible();

    // Court 2 still shows ○
    const circles = page.getByText('○');
    await expect(circles.first()).toBeVisible();

    // Fill Court 2 — both checkmarks are ✓
    await page.getByLabel('Court 2 team 1 score').first().fill('9');
    await page.getByLabel('Court 2 team 2 score').first().fill('11');
    await expect(page.getByText('✓').nth(1)).toBeVisible();
    await expect(page.getByText('○')).not.toBeVisible();
  });

  test('3.5 — Active Round Advances After Save Round', async ({ page }) => {
    await freshState(page);
    await goToPlayers(page);
    await setupSchedule(page);
    await goToScores(page);

    // Fill and save Round 1
    await page.getByLabel('Court 1 team 1 score').first().fill('11');
    await page.getByLabel('Court 1 team 2 score').first().fill('7');
    await page.getByLabel('Court 2 team 1 score').first().fill('9');
    await page.getByLabel('Court 2 team 2 score').first().fill('11');
    await page.getByRole('button', { name: /Save Round 1/ }).click();

    // Round 1 transitions to completed
    const round1Card = page.locator('.round-card').first();
    await expect(round1Card).toHaveClass(/completed/);
    await expect(round1Card.getByRole('button', { name: /Save Round/ })).not.toBeVisible();

    // Round 2 becomes active — Save Round 2 button appears
    const round2Card = page.locator('.round-card').nth(1);
    await expect(round2Card).toHaveClass(/active/);
    await expect(round2Card.getByRole('button', { name: /Save Round 2/ })).toBeVisible();
  });

  test('3.6 — Update Saved Score', async ({ page }) => {
    await freshState(page);
    await goToPlayers(page);
    await setupSchedule(page);
    await saveRound1Scores(page, [11, 7], [9, 11]);

    // In Round 1 Court 1: change Team 1 score from 11 to 9
    await page.getByLabel('Court 1 team 1 score').first().fill('9');
    await page.getByRole('button', { name: 'Update' }).first().click();

    await expect(page.getByLabel('Court 1 team 1 score').first()).toHaveValue('9');
    await expect(page.getByLabel('Court 1 team 2 score').first()).toHaveValue('7');

    await goToLeaderboard(page);
    await expect(page.locator('mat-card').first()).toBeVisible();
  });

  test('3.7 — Save Round Button Enabled for Zero-Zero Scores [NEGATIVE]', async ({ page }) => {
    await freshState(page);
    await goToPlayers(page);
    await setupSchedule(page);
    await goToScores(page);

    // Enter 0–0 for both courts
    await page.getByLabel('Court 1 team 1 score').first().fill('0');
    await page.getByLabel('Court 1 team 2 score').first().fill('0');
    await page.getByLabel('Court 2 team 1 score').first().fill('0');
    await page.getByLabel('Court 2 team 2 score').first().fill('0');

    // Save Round button is enabled (0–0 is a valid result per >= 0 check)
    await expect(page.getByRole('button', { name: /Save Round 1/ })).toBeEnabled();
  });

  test('3.8 — Negative Score Keeps Save Round Button Disabled [NEGATIVE]', async ({ page }) => {
    await freshState(page);
    await goToPlayers(page);
    await setupSchedule(page);
    await goToScores(page);

    // Enter valid Court 2, but negative Court 1 Team 1
    await page.getByLabel('Court 1 team 1 score').first().fill('-1');
    await page.getByLabel('Court 1 team 2 score').first().fill('11');
    await page.getByLabel('Court 2 team 1 score').first().fill('9');
    await page.getByLabel('Court 2 team 2 score').first().fill('11');

    // Save Round button stays disabled (Court 1 fails >= 0 check)
    await expect(page.getByRole('button', { name: /Save Round 1/ })).toBeDisabled();
  });

  test('3.9 — Upcoming Round Shows Read-Only Teams (No Input Fields)', async ({ page }) => {
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
      await expect(card.getByRole('button', { name: /Save/ })).not.toBeVisible();
    }
  });

  test('3.10 — Scores Tab in Read-Only Mode', async ({ page }) => {
    const shareUrl = await generateShareUrl(page);
    await page.goto(shareUrl);
    await goToScores(page);

    await expect(page.getByText('Shared session — read only')).toBeVisible();

    const court1Input = page.getByLabel('Court 1 team 1 score').first();
    await expect(court1Input).toBeVisible();
    await expect(court1Input).toBeDisabled();

    await expect(page.getByRole('button', { name: /Save/ })).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Update' })).not.toBeVisible();
  });

  test('3.11 — Score Persistence After Reload', async ({ page }) => {
    await freshState(page);
    await goToPlayers(page);
    await setupSchedule(page);
    await goToScores(page);

    // Save full Round 1
    await page.getByLabel('Court 1 team 1 score').first().fill('11');
    await page.getByLabel('Court 1 team 2 score').first().fill('7');
    await page.getByLabel('Court 2 team 1 score').first().fill('9');
    await page.getByLabel('Court 2 team 2 score').first().fill('11');
    await page.getByRole('button', { name: /Save Round 1/ }).click();

    // Reload
    await page.reload();
    await goToScores(page);

    // Round 1 still shows saved scores
    await expect(page.getByLabel('Court 1 team 1 score').first()).toHaveValue('11');
    await expect(page.getByLabel('Court 1 team 2 score').first()).toHaveValue('7');
    await expect(page.getByLabel('Court 2 team 1 score').first()).toHaveValue('9');
    await expect(page.getByLabel('Court 2 team 2 score').first()).toHaveValue('11');

    // Both courts show Update buttons
    const updateBtns = page.getByRole('button', { name: 'Update' });
    await expect(updateBtns.nth(0)).toBeVisible();
    await expect(updateBtns.nth(1)).toBeVisible();
  });

  test('3.12 — Court Checkmarks Are Independent', async ({ page }) => {
    await freshState(page);
    await goToPlayers(page);
    await setupSchedule(page);
    await goToScores(page);

    // Fill Court 1 — Court 1 gets ✓, Court 2 stays ○
    await page.getByLabel('Court 1 team 1 score').first().fill('11');
    await page.getByLabel('Court 1 team 2 score').first().fill('7');
    await expect(page.getByText('✓').first()).toBeVisible();
    await expect(page.getByText('○').first()).toBeVisible();

    // Fill Court 2 — both become ✓
    await page.getByLabel('Court 2 team 1 score').first().fill('9');
    await page.getByLabel('Court 2 team 2 score').first().fill('11');
    await expect(page.getByText('✓').nth(1)).toBeVisible();
    await expect(page.getByText('○')).not.toBeVisible();

    // Clear a Court 1 score — Court 1 reverts to ○
    await page.getByLabel('Court 1 team 1 score').first().fill('');
    await expect(page.getByText('○').first()).toBeVisible();

    // Court 2 checkmark is unaffected — still ✓
    await expect(page.getByText('✓').first()).toBeVisible();
  });
});
```

- [ ] **Step 2: Start dev server (separate terminal) and run the scores tests**

```bash
npx playwright test tests/scores/scores-tab.spec.ts --reporter=line
```

Expected: 12 tests pass. If any fail, fix the locator or assertion — the logic is correct.

- [ ] **Step 3: Run the full Playwright suite to check for regressions**

```bash
npx playwright test --reporter=line
```

Expected: all tests pass. Tests that use `saveRound1Scores` (leaderboard, share, persistence) should also pass since `helpers.ts` was updated in Task 3.

- [ ] **Step 4: Commit**

```bash
git add tests/scores/scores-tab.spec.ts
git commit -m "test(scores-tab): update E2E tests for Save Round button and court checkmarks"
```

---

## Done

All 4 tasks complete. The scores tab now saves a full round in one click, with per-court checkmarks showing progress.
