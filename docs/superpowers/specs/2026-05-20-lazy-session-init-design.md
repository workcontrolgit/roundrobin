# Lazy Session Initialization — Design Spec

## Objective

Stop creating sessions automatically on app launch or after delete. A session is created only when the user enters the first player name. This makes the data model honest — every saved session has real content.

## Problem

Currently `initSession` is called in two places that create blank sessions without user intent:

1. **`app.ts loadFromHash`** — creates session 1 on every fresh launch even before any players are added
2. **`app.ts onSessionDeleted`** — when the last session for a date is deleted, immediately creates a blank session 1 as fallback

Both result in ghost blank sessions in localStorage that represent no real activity.

## Behavior After This Change

- On fresh launch with no saved data: `activeSession()` is null, Players tab shows empty add-input, Schedule/Scores/Leaderboard tabs are disabled
- On delete of last session: `activeSession()` becomes null, app snaps back to Players tab (index 0), other tabs disable
- On delete of one of multiple sessions: switches to next remaining session, tabs stay enabled, no new session created
- On first player name entry (any scenario): `addPlayer` lazy-inits a session for today with the next available session number, then adds the player — tabs enable immediately
- On launch with existing saved data: loads the first saved session for today as before

## Architecture

### `SessionService.addPlayer` — lazy init guard

```ts
addPlayer(name: string): void {
  if (!this._activeSession()) {
    const today = this.todayDate();
    this.initSession(today, this.getNextSessionNumber(today));
  }
  this.update(s => ({ ...s, players: [...s.players, { id: crypto.randomUUID(), name: name.trim() }] }));
}
```

The date is always today — Players tab is the only entry point for a new session and the app always starts on today's date.

### `app.ts loadFromHash` — load only, no create

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
    this.selectedSessionNumber.set(0);  // sentinel: no active session
  }
  this.selectedDate.set(today);
}
```

### `app.ts onSessionDeleted` — no fallback create

```ts
onSessionDeleted(date: string, deletedNumber: number): void {
  const remaining = this.sessionService.getSavedSessionsForDate(date);
  if (remaining.length > 0) {
    this.onSessionChange(date, remaining[0]);
  } else {
    this.selectedDate.set(date);
    this.selectedSessionNumber.set(0);  // sentinel: no active session
    this.selectedTabIndex.set(0);       // snap back to Players tab
  }
}
```

### `app.ts` — tab disabling and tab index signal

Add `selectedTabIndex = signal<number>(0)` to `App`.

In `app.html`, bind tabs to `selectedTabIndex` and disable Schedule/Scores/Leaderboard when no active session:

```html
<mat-tab-group [(selectedIndex)]="selectedTabIndex">
  <mat-tab label="Players">...</mat-tab>
  <mat-tab label="Schedule"    [disabled]="!sessionService.activeSession()">...</mat-tab>
  <mat-tab label="Scores"      [disabled]="!sessionService.activeSession()">...</mat-tab>
  <mat-tab label="Leaderboard" [disabled]="!sessionService.activeSession()">...</mat-tab>
</mat-tab-group>
```

## Files Changed

| File | Change |
|---|---|
| `src/app/services/session.service.ts` | Add lazy-init guard to `addPlayer` |
| `src/app/app.ts` | Update `loadFromHash`, `onSessionDeleted`; add `selectedTabIndex` signal |
| `src/app/app.html` | Bind `selectedIndex`, add `[disabled]` to 3 tabs |
| `src/app/services/session.service.spec.ts` | Add test: `addPlayer` on null session creates session first |
| `tests/players/add-first-player.spec.ts` | Add E2E: fresh state → tabs disabled → add player → tabs enabled |
| `tests/reset/reset-session.spec.ts` | Add E2E: delete last session → tabs disabled → add player → tabs re-enable |

## Success Criteria

- No session exists in localStorage until at least one player name is entered
- Schedule, Scores, and Leaderboard tabs are disabled when `activeSession()` is null
- Deleting the last session snaps the user back to the Players tab
- Switching to an existing session after delete works as before
- All existing tests continue to pass
