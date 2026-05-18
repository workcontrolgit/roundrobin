# Session Management — Design Spec

**Date:** 2026-05-17
**Issues:** #8 (date not changeable), #9 (multiple sessions per day)
**Status:** Approved

## Problem

Two related issues are solved together:

1. **Issue #8** — The date field defaults to today and cannot be changed, blocking clubs from setting up future-dated round robins.
2. **Issue #9** — Only one session can be saved per day. Clubs that run concurrent or sequential sessions (e.g., 8 AM and 11 AM, or two courts groups simultaneously) cannot save both.

## Decisions

- Sessions are identified by **date + auto-numbered session number** (Session 1, Session 2…).
- No user-typed name required — the number is assigned automatically per day.
- Session management lives in a **toolbar chip → Angular Material BottomSheet drawer**.
- The chip displays the current session: `📅 May 17 · S1`.
- The drawer contains: date picker, session list for that date, and "+ New Session" button.

## Data Model

### `Session` interface (updated)

```ts
export interface Session {
  date: string;          // YYYY-MM-DD
  sessionNumber: number; // 1, 2, 3… auto-assigned per day
  players: Player[];
  rounds: Round[];
}
```

### Storage key format (updated)

| Old format | New format |
|---|---|
| `pickleball-session-2026-05-17` | `pickleball-session-2026-05-17-1` |
| *(one per day)* | `pickleball-session-2026-05-17-2` |

### Backward compatibility / migration

On app startup, `migrateOldKeys()` is called once. Any key matching the old pattern `pickleball-session-YYYY-MM-DD` (no trailing `-N`) is renamed to `pickleball-session-YYYY-MM-DD-1`. Session data is preserved.

## SessionService API Changes

```ts
// Updated (signature changed)
storageKey(date: string, sessionNumber: number): string
initSession(date: string, sessionNumber: number): void
loadSession(date: string, sessionNumber: number): Session | null
clearSession(date: string, sessionNumber: number): void

// New
getSavedSessionsForDate(date: string): number[]   // → [1, 2, 3]
getNextSessionNumber(date: string): number        // → max + 1, or 1 if none
migrateOldKeys(): void                            // called once on app init

// Unchanged
todayDate(): string
getSavedDates(): string[]    // deduplicated dates across all session keys
saveSession(session: Session): void  // session.sessionNumber used internally via storageKey
getPlayerStats(): PlayerStats[]
encodeSessionToHash(session: Session): string
decodeSessionFromHash(hash: string): Session | null
```

## App Component Changes (`app.ts` / `app.html`)

### New signals
```ts
selectedDate = signal<string>('');
selectedSessionNumber = signal<number>(1);   // new
```

### Startup sequence
1. Call `sessionService.migrateOldKeys()`
2. If no URL hash: load today's date, Session 1 (create if not exists)
3. If URL hash present: decode shared session (read-only mode, unchanged)

### Toolbar chip (replaces `mat-select`)
```html
<button mat-button (click)="openSessionDrawer()">
  📅 {{ selectedDate() | date:'MMM d' }} · S{{ selectedSessionNumber() }} ▾
</button>
```

### `openSessionDrawer()`
Opens `MatBottomSheet` with `SessionDrawerComponent`, passing:
- `currentDate: string`
- `currentSessionNumber: number`

The drawer emits `{ date: string, sessionNumber: number }` on selection. The app calls `onSessionChange(date, sessionNumber)` which loads the session and updates both signals.

## SessionDrawer Component (new)

**File:** `src/app/session-drawer/session-drawer.ts`

**Inputs (via `MAT_BOTTOM_SHEET_DATA`):**
- `currentDate: string`
- `currentSessionNumber: number`

**Template behavior:**
- Date `<input type="date">` — changing it reloads session list for new date
- Session list — each row shows "Session N", active session highlighted; tap to select
- "+ New Session" button — calls `getNextSessionNumber(date)`, creates session, emits selection
- If a newly selected date has no sessions, Session 1 is auto-created

**Output:** emits `{ date, sessionNumber }` via `MatBottomSheetRef.dismiss(result)`

## Tests

### Updates required
- `tests/date/date-session.spec.ts` — update storage key expectations to new `-N` format
- `tests/persistence/persistence.spec.ts` — update key format expectations

### New test scenarios
| Scenario | Expected |
|---|---|
| Create Session 2 same day | Session 1 data unchanged |
| Switch sessions | Correct players/rounds/scores loaded |
| "+ New Session" | Auto-numbers correctly (1 → 2 → 3) |
| Pick future date (no sessions) | Session 1 auto-created |
| Old key migration on load | Data intact, key renamed to `-1` format |
| Toolbar chip text | Shows correct date + session number |
| Tap chip | Opens bottom sheet drawer |
| Select session in drawer | Chip updates, correct session loaded |
