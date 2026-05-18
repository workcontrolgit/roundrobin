# Session Reset & Player Deletion Guard — Design Spec

**Date:** 2026-05-17
**Issues:** #11 (reset doesn't remove session), #14 (deleting player mid-game corrupts data)
**Status:** Approved

## Problem

Two related data-integrity issues:

1. **Issue #11** — The Reset button on the Leaderboard tab calls `clearSession()` then `initSession()`, so the session is deleted and immediately re-created. The session never disappears from the drawer list. Additionally, there is no way to selectively reset rounds/scores while keeping the player list — a common need when clubs want to regenerate a schedule.

2. **Issue #14** — Players can be deleted after rounds have been generated and scores recorded. This leaves dangling player references in existing rounds, corrupting the Scores tab and Leaderboard display.

## Decisions

- **Reset** becomes a selective operation with two options: reset rounds & scores only, or reset everything.
- **Delete Session** is a separate action — a trash icon per session row in the session drawer.
- **Player deletion** is disabled (not hidden) once `rounds.length > 0`, with a tooltip and snackbar explaining why.
- A shared `ConfirmDialog` component is introduced for all destructive confirmations.

---

## Feature 1: Selective Reset Dialog

### Behavior

The Reset button on the Leaderboard tab opens a `MatDialog` (`ConfirmDialog`) presenting two destructive options:

| Option | What it does |
|--------|-------------|
| **Reset Rounds & Scores** | Keeps player list intact. Clears all rounds and scores. User can regenerate schedule. |
| **Reset Everything** | Clears players, rounds, and scores. Session slot remains in the drawer as empty. |

Both options require a single tap — no secondary confirmation needed since the dialog itself is the confirmation step. A **Cancel** button dismisses without changes.

### New `SessionService` Methods

```ts
resetRoundsAndScores(date: string, sessionNumber: number): void
// Saves session with rounds: [], preserving players list

resetEverything(date: string, sessionNumber: number): void
// Saves session with players: [], rounds: []
```

Both methods update the active session signal after saving.

### `ConfirmDialog` Component (new, shared)

**File:** `src/app/confirm-dialog/confirm-dialog.ts`

A generic, reusable `MatDialog` component. Inputs via `MAT_DIALOG_DATA`:

```ts
export interface ConfirmDialogData {
  title: string;
  message: string;
  actions: { label: string; value: string; color?: 'primary' | 'warn' }[];
}
```

Returns the selected action `value` via `MatDialogRef.close(value)`, or `undefined` on cancel.

Used by both the Reset dialog and the Delete Session dialog.

### `LeaderboardTab` Changes

- Inject `MatDialog`
- `resetSession()` replaced by `openResetDialog()`:
  ```ts
  openResetDialog(): void {
    const ref = this.dialog.open(ConfirmDialog, {
      data: {
        title: 'Reset Session',
        message: 'Choose what to reset:',
        actions: [
          { label: 'Reset Rounds & Scores', value: 'rounds', color: 'warn' },
          { label: 'Reset Everything', value: 'all', color: 'warn' },
        ]
      } as ConfirmDialogData
    });
    ref.afterClosed().subscribe(value => {
      const session = this.sessionService.activeSession();
      if (!session) return;
      if (value === 'rounds') {
        this.sessionService.resetRoundsAndScores(session.date, session.sessionNumber);
      } else if (value === 'all') {
        this.sessionService.resetEverything(session.date, session.sessionNumber);
      }
    });
  }
  ```

---

## Feature 2: Delete Session from Drawer

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
- Emit navigation result via a new `SessionDrawerResult` property: `deleted?: boolean`
- The drawer passes the delete action back to `app.ts` which owns navigation

### `App` Changes

- `onSessionChange()` extended to handle delete + navigation:
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

---

## Feature 3: Lock Player Deletion (#14)

### Behavior

When `session.rounds.length > 0`, each player row's delete button in the Players tab is **disabled** (visible but grayed out). Two feedback mechanisms:

- **`MatTooltip`** on the disabled button (desktop): *"Cannot remove players after the schedule has been generated. Use Reset on the Leaderboard tab to clear the schedule first."*
- **`MatSnackBar`** (mobile — tap on disabled button): *"Roster is locked. Reset the schedule first."*

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

## Files Modified

| File | Change |
|------|--------|
| `src/app/confirm-dialog/confirm-dialog.ts` | **Create** — shared reusable confirm dialog |
| `src/app/confirm-dialog/confirm-dialog.html` | **Create** — dialog template |
| `src/app/services/session.service.ts` | **Modify** — add `resetRoundsAndScores()`, `resetEverything()` |
| `src/app/services/session.service.spec.ts` | **Modify** — add tests for 2 new methods |
| `src/app/leaderboard-tab/leaderboard-tab.ts` | **Modify** — replace `resetSession()` with `openResetDialog()` |
| `src/app/leaderboard-tab/leaderboard-tab.html` | **Modify** — wire Reset button to `openResetDialog()` |
| `src/app/session-drawer/session-drawer.ts` | **Modify** — add trash icon + `deleteSession()` |
| `src/app/session-drawer/session-drawer.html` | **Modify** — add trash icon per session row |
| `src/app/app.ts` | **Modify** — add `onSessionDeleted()` navigation handler |
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
| Reset Rounds & Scores | Player list intact, Scores tab shows no rounds, Schedule tab empty |
| Reset Everything | Players tab empty, Schedule and Scores tabs empty |
| Cancel reset dialog | No data changed |
| Delete session from drawer (active) | Session removed, navigated to Session 1 |
| Delete last session for a date | Fresh Session 1 auto-created |
| Delete non-active session | Current session unchanged, deleted session gone from list |
| Delete player when rounds exist | Button disabled, tooltip visible, snackbar on mobile tap |
| Delete player before rounds generated | Button works normally |
