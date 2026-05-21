# Lazy Session Initialization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop creating sessions automatically on app launch or after delete — a session is created only when the user enters the first player name.

**Architecture:** Three coordinated changes: (1) `SessionService.addPlayer` lazy-inits a session if none is active before adding the player; (2) `app.ts` stops calling `initSession` when no sessions exist on load or after the last session is deleted; (3) `app.html` disables Schedule/Scores/Leaderboard tabs and snaps to Players tab when `activeSession()` is null.

**Tech Stack:** Angular 20 signals, Angular Material tabs (`mat-tab-group`), Jasmine unit tests, Playwright E2E tests.

---

## File Map

| Action | Path | Purpose |
|---|---|---|
| Modify | `src/app/services/session.service.ts` | Add lazy-init guard to `addPlayer` |
| Modify | `src/app/services/session.service.spec.ts` | Add unit test for lazy-init behavior |
| Modify | `src/app/app.ts` | Add `selectedTabIndex` signal; update `loadFromHash` and `onSessionDeleted` |
| Modify | `src/app/app.html` | Bind `selectedIndex`; add `[disabled]` to 3 tabs; update chip display |
| Modify | `tests/players/add-first-player.spec.ts` | Add E2E: tabs disabled on fresh state, enabled after first player |
| Modify | `tests/reset/reset-session.spec.ts` | Add E2E: delete last session snaps to Players, tabs re-enable on add |

---

### Task 1: SessionService — lazy-init guard in `addPlayer`

**Files:**
- Modify: `src/app/services/session.service.ts:121-126`
- Modify: `src/app/services/session.service.spec.ts` (inside `describe('addPlayer()')` block at line 105)

- [ ] **Step 1: Write the failing unit test**

Open `src/app/services/session.service.spec.ts`. Inside the existing `describe('addPlayer()', ...)` block (around line 105), add this test **before** the existing ones:

```ts
it('creates a new session when activeSession is null before adding a player', () => {
  // No initSession called — activeSession starts as null
  expect(service.activeSession()).toBeNull();

  service.addPlayer('Alice');

  expect(service.activeSession()).not.toBeNull();
  expect(service.activeSession()!.players.length).toBe(1);
  expect(service.activeSession()!.players[0].name).toBe('Alice');
  // Session must also be persisted to localStorage
  const sessions = service.getSavedSessionsForDate(service.todayDate());
  expect(sessions.length).toBe(1);
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd c:/apps/pickleball/roundrobin
npx ng test --include=src/app/services/session.service.spec.ts --watch=false
```

Expected: FAIL — `addPlayer` calls `update()` which does nothing when `_activeSession` is null, so `activeSession()` stays null.

- [ ] **Step 3: Add lazy-init guard to `addPlayer`**

In `src/app/services/session.service.ts`, replace the `addPlayer` method (lines 121–126):

```ts
addPlayer(name: string): void {
  if (!this._activeSession()) {
    const today = this.todayDate();
    this.initSession(today, this.getNextSessionNumber(today));
  }
  this.update(s => ({
    ...s,
    players: [...s.players, { id: crypto.randomUUID(), name: name.trim() }],
  }));
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx ng test --include=src/app/services/session.service.spec.ts --watch=false
```

Expected: All tests pass including the new one.

- [ ] **Step 5: Commit**

```bash
git add src/app/services/session.service.ts src/app/services/session.service.spec.ts
git commit -m "feat(service): lazy-init session on first addPlayer call"
```

---

### Task 2: app.ts — selectedTabIndex signal, loadFromHash, onSessionDeleted

**Files:**
- Modify: `src/app/app.ts`

- [ ] **Step 1: Add `selectedTabIndex` signal to the App class**

In `src/app/app.ts`, add `selectedTabIndex` alongside the existing signals at the top of the class (after line 31):

```ts
selectedDate = signal<string>('');
selectedSessionNumber = signal<number>(1);
readonly isReadOnly = signal<boolean>(false);
selectedTabIndex = signal<number>(0);
```

- [ ] **Step 2: Update `loadFromHash` — load only, no create**

Replace the `loadFromHash` method (lines 51–66) with:

```ts
private loadFromHash(): void {
  const hash = window.location.hash.slice(1);
  if (hash) {
    const shared = this.sessionService.decodeSessionFromHash(hash);
    if (shared) {
      this.sessionService.loadSharedSession(shared);
      this.isReadOnly.set(true);
      return;
    }
  }
  this.sessionService.migrateOldKeys();
  const today = this.sessionService.todayDate();
  const sessions = this.sessionService.getSavedSessionsForDate(today);
  if (sessions.length > 0) {
    this.sessionService.initSession(today, sessions[0]);
    this.selectedSessionNumber.set(sessions[0]);
  } else {
    this.selectedSessionNumber.set(0);
  }
  this.selectedDate.set(today);
}
```

- [ ] **Step 3: Update `onSessionDeleted` — no fallback initSession**

Replace the `onSessionDeleted` method (lines 85–92) with:

```ts
onSessionDeleted(date: string, deletedNumber: number): void {
  const remaining = this.sessionService.getSavedSessionsForDate(date);
  if (remaining.length > 0) {
    this.onSessionChange(date, remaining[0]);
  } else {
    this.selectedDate.set(date);
    this.selectedSessionNumber.set(0);
    this.selectedTabIndex.set(0);
  }
}
```

- [ ] **Step 4: Verify the full app.ts compiles**

```bash
npx ng build --configuration development 2>&1 | tail -20
```

Expected: Build succeeds with no errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/app.ts
git commit -m "feat(app): add selectedTabIndex signal; stop auto-creating sessions on load or delete"
```

---

### Task 3: app.html — bind selectedIndex, disable tabs, update chip

**Files:**
- Modify: `src/app/app.html`

- [ ] **Step 1: Bind `selectedIndex` on mat-tab-group**

In `src/app/app.html`, replace the `mat-tab-group` opening tag (line 29):

```html
<mat-tab-group
  mat-stretch-tabs="false"
  animationDuration="200ms"
  style="margin-top:4px;"
  [selectedIndex]="selectedTabIndex()"
  (selectedIndexChange)="selectedTabIndex.set($event)"
>
```

- [ ] **Step 2: Disable Schedule, Scores, and Leaderboard tabs when no active session**

Replace the three tab labels (lines 33, 35, 37):

```html
<mat-tab label="Players">
  <app-players-tab [readOnly]="isReadOnly()" />
</mat-tab>
<mat-tab label="Schedule" [disabled]="!sessionService.activeSession()">
  <app-schedule-tab />
</mat-tab>
<mat-tab label="Scores" [disabled]="!sessionService.activeSession()">
  <app-scores-tab [readOnly]="isReadOnly()" />
</mat-tab>
<mat-tab label="Leaderboard" [disabled]="!sessionService.activeSession()">
  <app-leaderboard-tab [readOnly]="isReadOnly()" />
</mat-tab>
```

- [ ] **Step 3: Update toolbar chip to hide session number when no session exists**

Replace the chip button content (line 17):

```html
📅 {{ selectedDate() | date:'MMM d' }}@if (selectedSessionNumber() > 0) { | {{ selectedSessionNumber() }}} ▾
```

- [ ] **Step 4: Verify build and check UI manually**

```bash
npx ng build --configuration development 2>&1 | tail -20
```

Expected: Build succeeds.

Then run `npm start` and open http://localhost:4200/roundrobin in a browser. Verify:
- Schedule, Scores, Leaderboard tabs appear grayed out on fresh state
- Toolbar chip shows `📅 May 20 ▾` (no session number)
- Typing a player name and clicking Add: tabs become clickable
- Toolbar chip shows `📅 May 20 | 1 ▾`

- [ ] **Step 5: Commit**

```bash
git add src/app/app.html
git commit -m "feat(app): disable tabs and bind selectedIndex; update chip for no-session state"
```

---

### Task 4: E2E tests — tab state on fresh start and after delete

**Files:**
- Modify: `tests/players/add-first-player.spec.ts`
- Modify: `tests/reset/reset-session.spec.ts`

- [ ] **Step 1: Add E2E tests for fresh-state tab disabling**

In `tests/players/add-first-player.spec.ts`, append these two tests inside the existing `describe('Players Tab', ...)` block:

```ts
test('1.6 — Schedule, Scores, Leaderboard tabs are disabled on fresh state', async ({ page }) => {
  await freshState(page);

  await expect(page.getByRole('tab', { name: 'Schedule' })).toHaveAttribute('aria-disabled', 'true');
  await expect(page.getByRole('tab', { name: 'Scores' })).toHaveAttribute('aria-disabled', 'true');
  await expect(page.getByRole('tab', { name: 'Leaderboard' })).toHaveAttribute('aria-disabled', 'true');
});

test('1.7 — Tabs become enabled after adding the first player', async ({ page }) => {
  await freshState(page);

  // Confirm tabs start disabled
  await expect(page.getByRole('tab', { name: 'Schedule' })).toHaveAttribute('aria-disabled', 'true');

  // Add one player
  await page.getByLabel('Player name').fill('Alice');
  await page.getByRole('button', { name: 'Add' }).click();
  await expect(page.getByText('1. Alice')).toBeVisible();

  // Tabs should now be enabled
  await expect(page.getByRole('tab', { name: 'Schedule' })).not.toHaveAttribute('aria-disabled', 'true');
  await expect(page.getByRole('tab', { name: 'Scores' })).not.toHaveAttribute('aria-disabled', 'true');
  await expect(page.getByRole('tab', { name: 'Leaderboard' })).not.toHaveAttribute('aria-disabled', 'true');
});
```

- [ ] **Step 2: Add E2E tests for delete-last-session behavior**

In `tests/reset/reset-session.spec.ts`, append these two tests inside the existing `describe` block:

```ts
test('7.7 Delete last session disables tabs and shows Players tab', async ({ page }) => {
  await freshState(page);
  await addPlayers(page, EIGHT_PLAYERS);

  // Open session drawer
  await page.getByRole('button', { name: /📅/ }).click();
  await page.waitForSelector('mat-bottom-sheet-container');

  // Click delete on session 1
  await page.getByRole('button', { name: /delete/i }).first().click();
  // Confirm the delete dialog
  await page.locator('mat-dialog-actions button', { hasText: 'Delete' }).click();

  // App should be on Players tab
  await expect(page.getByRole('tab', { name: 'Players' })).toHaveClass(/mdc-tab--active|mat-mdc-tab-active/);

  // Other tabs should be disabled
  await expect(page.getByRole('tab', { name: 'Schedule' })).toHaveAttribute('aria-disabled', 'true');
  await expect(page.getByRole('tab', { name: 'Scores' })).toHaveAttribute('aria-disabled', 'true');
  await expect(page.getByRole('tab', { name: 'Leaderboard' })).toHaveAttribute('aria-disabled', 'true');
});

test('7.8 Adding a player after delete creates a new session and re-enables tabs', async ({ page }) => {
  await freshState(page);
  await addPlayers(page, EIGHT_PLAYERS);

  // Open session drawer and delete session 1
  await page.getByRole('button', { name: /📅/ }).click();
  await page.waitForSelector('mat-bottom-sheet-container');
  await page.getByRole('button', { name: /delete/i }).first().click();
  await page.locator('mat-dialog-actions button', { hasText: 'Delete' }).click();

  // No active session — add a new player
  await page.getByLabel('Player name').fill('Zara');
  await page.getByRole('button', { name: 'Add' }).click();
  await expect(page.getByText('1. Zara')).toBeVisible();

  // Tabs should be enabled again
  await expect(page.getByRole('tab', { name: 'Schedule' })).not.toHaveAttribute('aria-disabled', 'true');
  await expect(page.getByRole('tab', { name: 'Scores' })).not.toHaveAttribute('aria-disabled', 'true');
  await expect(page.getByRole('tab', { name: 'Leaderboard' })).not.toHaveAttribute('aria-disabled', 'true');
});
```

- [ ] **Step 3: Run all new E2E tests against the dev server**

Make sure `npm start` is running, then:

```bash
npx playwright test tests/players/add-first-player.spec.ts tests/reset/reset-session.spec.ts --reporter=list
```

Expected: All tests pass (6 original + 2 new in each file).

- [ ] **Step 4: Run the full unit test suite**

```bash
npx ng test --watch=false
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add tests/players/add-first-player.spec.ts tests/reset/reset-session.spec.ts
git commit -m "test(e2e): add tab-disable and lazy-session-init tests"
```
