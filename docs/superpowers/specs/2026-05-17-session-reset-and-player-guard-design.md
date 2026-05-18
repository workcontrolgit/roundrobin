# Session Reset & Player Deletion Guard — Design Spec

**Date:** 2026-05-17 (updated 2026-05-18)
**Issues:** #11 (reset doesn't remove session), #14 (deleting player mid-game corrupts data)
**Status:** Approved

## Problem

Two related data-integrity issues:

1. **Issue #11** — The Reset button on the Leaderboard tab calls `clearSession()` then `initSession()`, so the session is deleted and immediately re-created. The session never disappears from the drawer list. Additionally, there is no way to selectively clear rounds/scores while keeping the player list — a common need when clubs want to regenerate a schedule.

2. **Issue #14** — Players can be deleted after rounds have been generated and scores recorded. This leaves dangling player references in existing rounds, corrupting the Scores tab and Leaderboard display.

## Decisions

- **"Regenerate Schedule"** (clear rounds & scores, keep players) lives on the **Schedule tab** — that is where the user's mental model places it.
- **"Reset Session"** (clear everything) stays on the **Leaderboard tab** as a single-option confirm dialog.
- **Delete Session** is a separate action — a trash icon per session row in the session drawer.
- **Player deletion** is disabled (not hidden) once `rounds.length > 0`, with a tooltip and snackbar explaining why.
- A shared `ConfirmDialog` component is introduced for all destructive confirmations.

---

## Feature 1: Regenerate Schedule (Schedule tab)

### Behavior

The Schedule tab gets a **"Regenerate Schedule"** button, visible when `rounds.length > 0`. Tapping it opens `ConfirmDialog`:

*"Regenerate Schedule? All rounds and scores will be cleared. Your player list will be kept."*

On confirm: `sessionService.resetRoundsAndScores(date, sessionNumber)` — clears rounds and scores, preserves players. The Schedule tab then shows the empty state prompting the user to generate a new schedule.

### New `SessionService` Method

```ts
resetRoundsAndScores(date: string, sessionNumber: number): void
// Saves session with rounds: [], preserving players list
// Updates active session signal
```

### `ScheduleTab` Changes

- Inject `MatDialog`
- Add `openRegenerateDialog()` method
- Show "Regenerate Schedule" button when `rounds.length > 0`

---

## Feature 2: Reset Session (Leaderboard tab)

### Behavior

The existing Reset button on the Leaderboard tab opens `ConfirmDialog`:

*"Reset Session? All players, rounds, and scores will be cleared."*

Single **Reset** action (warn color) + Cancel. On confirm: `sessionService.resetEverything(date, sessionNumber)`. Session slot remains in the drawer as empty — it is not deleted.

### New `SessionService` Method

```ts
resetEverything(date: string, sessionNumber: number): void
// Saves session with players: [], rounds: []
// Updates active session signal
```

### `LeaderboardTab` Changes

- Inject `MatDialog`
- Replace `resetSession()` with `openResetDialog()`:
  ```ts
  openResetDialog(): void {
    const ref = this.dialog.open(ConfirmDialog, {
      data: {
        title: 'Reset Session',
        message: 'All players, rounds, and scores will be cleared.',
        actions: [{ label: 'Reset', value: 'all', color: 'warn' }]
      } as ConfirmDialogData
    });
    ref.afterClosed().subscribe(value => {
      if (value !== 'all') return;
      const session = this.sessionService.activeSession();
      if (session) this.sessionService.resetEverything(session.date, session.sessionNumber);
    });
  }
  ```

---

## Feature 3: Delete Session from Drawer (#11)

### Behavior

Each session row in the `SessionDrawer` bottom sheet gets a trash icon button (`mat-icon-button` with `delete` icon) on the right side. Tapping it:

1. Opens `ConfirmDialog`: *"Delete Session N? All players, rounds, and scores will be permanently removed."* with a single **Delete** action (warn color) and Cancel.
2. On confirm:
   - `clearSession(date, sessionNumber)` — removes the localStorage key (no reinit)
   - If the deleted session **was the active session**:
     - Remaining sessions exist for that date → navigate to Session 1 (lowest number)
     - No sessions remain → `initSession(date, 1)` auto-creates fresh Session 1, navigate there
   - If the deleted session **was not active** → stay on current session, refresh drawer list
3. Drawer closes after deletion

### `SessionDrawer` Changes

- Inject `MatDialog`
- Add `deleteSession(sessionNumber: number)` method
- The drawer passes the delete result back to `app.ts` via `MatBottomSheetRef.dismiss({ date, sessionNumber, deleted: true })`

### `App` Changes

- Add `onSessionDeleted()` navigation handler:
  ```ts
  onSessionDeleted(date: string, deletedNumber: number): void {
    const remaining = this.sessionService.getSavedSessionsForDate(date);
    const next = remaining.length > 0 ? remaining[0] : 1;
    if (remaining.length === 0) {
      this.sessionService.initSession(date, 1);
    }
    this.onSessionChange(date, next);
  }
  ```
- `SessionDrawerResult` extended with optional `deleted?: boolean`

---

## Feature 4: Lock Player Deletion (#14)

### Behavior

When `session.rounds.length > 0`, each player row's delete button in the Players tab is **disabled** (visible but grayed out). Two feedback mechanisms:

- **`MatTooltip`** on the disabled button (desktop): *"Cannot remove players after the schedule has been generated. Use Regenerate Schedule on the Schedule tab to start over."*
- **`MatSnackBar`** (mobile — tap on disabled button): *"Roster is locked. Regenerate the schedule first."*

Adding new players remains allowed even after rounds are generated.

### `PlayersTab` Changes

- Add computed signal:
  ```ts
  readonly scheduleGenerated = computed(() =>
    (this.sessionService.activeSession()?.rounds.length ?? 0) > 0
  );
  ```
- Bind to delete button: `[disabled]="scheduleGenerated()"`
- Add `MatTooltip` and `MatSnackBar` injection

---

## `ConfirmDialog` Component (new, shared)

**File:** `src/app/confirm-dialog/confirm-dialog.ts`

A generic, reusable `MatDialog` component used by all three destructive actions above.

```ts
export interface ConfirmDialogData {
  title: string;
  message: string;
  actions: { label: string; value: string; color?: 'primary' | 'warn' }[];
}
```

Returns the selected action `value` via `MatDialogRef.close(value)`, or `undefined` on cancel. Always includes a Cancel button.

---

## Files Modified

| File | Change |
|------|--------|
| `src/app/confirm-dialog/confirm-dialog.ts` | **Create** — shared reusable confirm dialog |
| `src/app/confirm-dialog/confirm-dialog.html` | **Create** — dialog template |
| `src/app/services/session.service.ts` | **Modify** — add `resetRoundsAndScores()`, `resetEverything()` |
| `src/app/services/session.service.spec.ts` | **Modify** — add tests for 2 new methods |
| `src/app/schedule-tab/schedule-tab.ts` | **Modify** — add `openRegenerateDialog()` |
| `src/app/schedule-tab/schedule-tab.html` | **Modify** — add "Regenerate Schedule" button |
| `src/app/leaderboard-tab/leaderboard-tab.ts` | **Modify** — replace `resetSession()` with `openResetDialog()` |
| `src/app/leaderboard-tab/leaderboard-tab.html` | **Modify** — wire Reset button to `openResetDialog()` |
| `src/app/session-drawer/session-drawer.ts` | **Modify** — add trash icon + `deleteSession()` |
| `src/app/session-drawer/session-drawer.html` | **Modify** — add trash icon per session row |
| `src/app/app.ts` | **Modify** — add `onSessionDeleted()` navigation handler, update `SessionDrawerResult` handling |
| `src/app/players-tab/players-tab.ts` | **Modify** — add `scheduleGenerated` signal, snackbar |
| `src/app/players-tab/players-tab.html` | **Modify** — disable delete button + tooltip |

---

## Tests

### Unit Tests (`session.service.spec.ts`)
- `resetRoundsAndScores` clears rounds, preserves players
- `resetEverything` clears both players and rounds
- Active session signal updated after both resets

### E2E Test Scenarios

| Scenario | Expected |
|----------|----------|
| Regenerate Schedule | Player list intact, Scores tab shows no rounds, Schedule tab shows empty state |
| Cancel regenerate dialog | No data changed |
| Reset Session (everything) | Players tab empty, Schedule and Scores tabs empty |
| Cancel reset dialog | No data changed |
| Delete session from drawer (active) | Session removed, navigated to Session 1 |
| Delete last session for a date | Fresh Session 1 auto-created |
| Delete non-active session | Current session unchanged, deleted session gone from list |
| Delete player when rounds exist | Button disabled, tooltip visible, snackbar on mobile tap |
| Delete player before rounds generated | Button works normally |
