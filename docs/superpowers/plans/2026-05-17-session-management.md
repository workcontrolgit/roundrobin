# Session Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix date-is-read-only (issue #8) and enable multiple sessions per day (issue #9) by keying sessions on `date + sessionNumber`, replacing the toolbar dropdown with a chip + MatBottomSheet drawer.

**Architecture:** Add `sessionNumber: number` to the `Session` model and update the localStorage key from `pickleball-session-YYYY-MM-DD` to `pickleball-session-YYYY-MM-DD-N`. A new `SessionDrawer` standalone component is opened via `MatBottomSheet` from the toolbar chip, containing a date `<input>`, a session list, and a "+ New Session" button. On first load, `migrateOldKeys()` renames legacy keys to the `-1` format.

**Tech Stack:** Angular 20, Angular Material (MatBottomSheet), TypeScript signals, Jasmine unit tests, Playwright E2E

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `src/app/models/session.models.ts` | Add `sessionNumber: number` to `Session` |
| Modify | `src/app/services/session.service.ts` | Update CRUD + add migration/query methods |
| Modify | `src/app/services/session.service.spec.ts` | Update all tests for new signatures |
| Modify | `src/app/leaderboard-tab/leaderboard-tab.ts` | Fix `resetSession()` to pass `sessionNumber` |
| Create | `src/app/session-drawer/session-drawer.ts` | New standalone bottom-sheet drawer component |
| Create | `src/app/session-drawer/session-drawer.html` | Drawer template |
| Modify | `src/app/app.ts` | Add `selectedSessionNumber` signal, `openSessionDrawer()`, update init |
| Modify | `src/app/app.html` | Replace `mat-select` with toolbar chip button |
| Modify | `tests/date/date-session.spec.ts` | Update for new key format and drawer UI |
| Modify | `tests/persistence/persistence.spec.ts` | Update for new key format and drawer UI |

---

## Task 1: Update Session Model

**Files:**
- Modify: `src/app/models/session.models.ts`

- [ ] **Step 1: Add `sessionNumber` to the `Session` interface**

Replace the `Session` interface in `src/app/models/session.models.ts`:

```ts
export interface Session {
  date: string;          // YYYY-MM-DD
  sessionNumber: number; // 1, 2, 3… auto-assigned per day
  players: Player[];
  rounds: Round[];
}
```

- [ ] **Step 2: Verify TypeScript compile errors surface**

```bash
cd c:/apps/pickleball/roundrobin && npx ng build --configuration development 2>&1 | head -40
```

Expected: errors in `session.service.ts` and `leaderboard-tab.ts` about missing `sessionNumber`. This is correct — the following tasks fix them.

- [ ] **Step 3: Commit the model change**

```bash
git add src/app/models/session.models.ts
git commit -m "feat(model): add sessionNumber to Session interface"
```

---

## Task 2: Update SessionService — Core Methods

**Files:**
- Modify: `src/app/services/session.service.spec.ts`
- Modify: `src/app/services/session.service.ts`

- [ ] **Step 1: Replace `session.service.spec.ts` with updated tests**

```ts
import { TestBed } from '@angular/core/testing';
import { SessionService } from './session.service';
import { Session } from '../models/session.models';

function makeSession(date: string, sessionNumber = 1): Session {
  return { date, sessionNumber, players: [], rounds: [] };
}

describe('SessionService', () => {
  let service: SessionService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(SessionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('storageKey()', () => {
    it('returns key combining date and session number', () => {
      expect(service.storageKey('2026-05-04', 1)).toBe('pickleball-session-2026-05-04-1');
      expect(service.storageKey('2026-05-04', 2)).toBe('pickleball-session-2026-05-04-2');
    });
  });

  describe('saveSession()', () => {
    it('saves session under date-session key', () => {
      const session = makeSession('2026-05-04', 1);
      service.saveSession(session);
      const raw = localStorage.getItem('pickleball-session-2026-05-04-1');
      expect(raw).toBeTruthy();
      const parsed = JSON.parse(raw!);
      expect(parsed.date).toBe('2026-05-04');
      expect(parsed.sessionNumber).toBe(1);
    });
  });

  describe('loadSession()', () => {
    it('returns null when no session exists', () => {
      expect(service.loadSession('2026-01-01', 1)).toBeNull();
    });

    it('returns the saved session for date and session number', () => {
      service.saveSession(makeSession('2026-05-04', 1));
      const loaded = service.loadSession('2026-05-04', 1);
      expect(loaded).not.toBeNull();
      expect(loaded!.date).toBe('2026-05-04');
      expect(loaded!.sessionNumber).toBe(1);
    });

    it('does not return session for a different session number', () => {
      service.saveSession(makeSession('2026-05-04', 1));
      expect(service.loadSession('2026-05-04', 2)).toBeNull();
    });
  });

  describe('getSavedDates()', () => {
    it('returns empty array when no sessions saved', () => {
      expect(service.getSavedDates()).toEqual([]);
    });

    it('returns deduplicated dates sorted descending', () => {
      service.saveSession(makeSession('2026-05-01', 1));
      service.saveSession(makeSession('2026-05-04', 1));
      service.saveSession(makeSession('2026-05-04', 2));
      service.saveSession(makeSession('2026-04-30', 1));
      const dates = service.getSavedDates();
      expect(dates).toEqual(['2026-05-04', '2026-05-01', '2026-04-30']);
    });
  });

  describe('clearSession()', () => {
    it('removes the session from localStorage', () => {
      service.saveSession(makeSession('2026-05-04', 1));
      service.clearSession('2026-05-04', 1);
      expect(service.loadSession('2026-05-04', 1)).toBeNull();
    });

    it('does not remove a session with a different session number', () => {
      service.saveSession(makeSession('2026-05-04', 1));
      service.saveSession(makeSession('2026-05-04', 2));
      service.clearSession('2026-05-04', 1);
      expect(service.loadSession('2026-05-04', 2)).not.toBeNull();
    });
  });

  describe('initSession()', () => {
    it('creates a new session if none exists', () => {
      service.initSession('2026-05-04', 1);
      expect(service.activeSession()).not.toBeNull();
      expect(service.activeSession()!.sessionNumber).toBe(1);
    });

    it('loads existing session if already saved', () => {
      const existing = makeSession('2026-05-04', 1);
      service.saveSession(existing);
      service.initSession('2026-05-04', 1);
      expect(service.activeSession()!.sessionNumber).toBe(1);
    });
  });

  describe('addPlayer()', () => {
    it('adds a player to the active session and saves', () => {
      service.initSession('2026-05-04', 1);
      service.addPlayer('Alice');
      expect(service.activeSession()!.players.length).toBe(1);
      expect(service.activeSession()!.players[0].name).toBe('Alice');
    });

    it('generates a unique id for each player', () => {
      service.initSession('2026-05-04', 1);
      service.addPlayer('Alice');
      service.addPlayer('Bob');
      const ids = service.activeSession()!.players.map(p => p.id);
      expect(new Set(ids).size).toBe(2);
    });
  });

  describe('removePlayer()', () => {
    it('removes a player by id', () => {
      service.initSession('2026-05-04', 1);
      service.addPlayer('Alice');
      const id = service.activeSession()!.players[0].id;
      service.removePlayer(id);
      expect(service.activeSession()!.players.length).toBe(0);
    });
  });

  describe('setRounds()', () => {
    it('saves rounds to the active session', () => {
      service.initSession('2026-05-04', 1);
      service.setRounds([]);
      expect(service.activeSession()!.rounds).toEqual([]);
    });
  });

  describe('saveScore()', () => {
    it('saves score for the correct court in the correct round', () => {
      service.initSession('2026-05-04', 1);
      service.setRounds([{
        roundNumber: 1,
        courts: [
          { courtName: 'Court 1', team1: ['p0', 'p1'], team2: ['p2', 'p3'] },
          { courtName: 'Court 2', team1: ['p4', 'p5'], team2: ['p6', 'p7'] },
        ],
        sittingOut: [],
      }]);
      service.saveScore(0, 'Court 1', 11, 7);
      const court = service.activeSession()!.rounds[0].courts[0];
      expect(court.score).toEqual({ team1: 11, team2: 7 });
    });
  });

  describe('getPlayerStats()', () => {
    it('returns 0 wins and 0 points when no scores', () => {
      service.initSession('2026-05-04', 1);
      service.addPlayer('Alice');
      service.setRounds([{
        roundNumber: 1,
        courts: [
          { courtName: 'Court 1', team1: [service.activeSession()!.players[0].id, 'p1'], team2: ['p2', 'p3'] },
          { courtName: 'Court 2', team1: ['p4', 'p5'], team2: ['p6', 'p7'] },
        ],
        sittingOut: [],
      }]);
      const alice = service.getPlayerStats().find(s => s.player.name === 'Alice')!;
      expect(alice.wins).toBe(0);
      expect(alice.totalPoints).toBe(0);
    });

    it('counts wins and points correctly', () => {
      service.initSession('2026-05-04', 1);
      service.addPlayer('Alice');
      const aliceId = service.activeSession()!.players[0].id;
      service.setRounds([{
        roundNumber: 1,
        courts: [
          { courtName: 'Court 1', team1: [aliceId, 'p1'], team2: ['p2', 'p3'], score: { team1: 11, team2: 7 } },
          { courtName: 'Court 2', team1: ['p4', 'p5'], team2: ['p6', 'p7'] },
        ],
        sittingOut: [],
      }]);
      const alice = service.getPlayerStats().find(s => s.player.name === 'Alice')!;
      expect(alice.wins).toBe(1);
      expect(alice.totalPoints).toBe(11);
    });
  });
});
```

- [ ] **Step 2: Run tests to see them fail**

```bash
cd c:/apps/pickleball/roundrobin && npx ng test --include='src/app/services/session.service.spec.ts' --watch=false --browsers=ChromeHeadless 2>&1 | tail -20
```

Expected: compile errors or failures on `storageKey`, `loadSession`, `clearSession`, `initSession` due to wrong argument count.

- [ ] **Step 3: Update `session.service.ts` — core methods**

Replace the file `src/app/services/session.service.ts` with:

```ts
import { Injectable, signal } from '@angular/core';
import { Session, Player, Round, PlayerStats } from '../models/session.models';

@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly PREFIX = 'pickleball-session-';
  private _activeSession = signal<Session | null>(null);

  readonly activeSession = this._activeSession.asReadonly();

  storageKey(date: string, sessionNumber: number): string {
    return `${this.PREFIX}${date}-${sessionNumber}`;
  }

  saveSession(session: Session): void {
    localStorage.setItem(this.storageKey(session.date, session.sessionNumber), JSON.stringify(session));
  }

  loadSession(date: string, sessionNumber: number): Session | null {
    const raw = localStorage.getItem(this.storageKey(date, sessionNumber));
    return raw ? (JSON.parse(raw) as Session) : null;
  }

  getSavedDates(): string[] {
    const dates = new Set<string>();
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)!;
      if (key.startsWith(this.PREFIX)) {
        const suffix = key.slice(this.PREFIX.length);
        const match = suffix.match(/^(\d{4}-\d{2}-\d{2})-\d+$/);
        if (match) dates.add(match[1]);
      }
    }
    return Array.from(dates).sort((a, b) => b.localeCompare(a));
  }

  clearSession(date: string, sessionNumber: number): void {
    localStorage.removeItem(this.storageKey(date, sessionNumber));
    const active = this._activeSession();
    if (active?.date === date && active?.sessionNumber === sessionNumber) {
      this._activeSession.set(null);
    }
  }

  loadSharedSession(session: Session): void {
    this._activeSession.set(session);
  }

  initSession(date: string, sessionNumber: number): void {
    const existing = this.loadSession(date, sessionNumber);
    if (existing) {
      this._activeSession.set(existing);
    } else {
      const session: Session = { date, sessionNumber, players: [], rounds: [] };
      this.saveSession(session);
      this._activeSession.set(session);
    }
  }

  getSavedSessionsForDate(date: string): number[] {
    const prefix = `${this.PREFIX}${date}-`;
    const numbers: number[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)!;
      if (key.startsWith(prefix)) {
        const suffix = key.slice(prefix.length);
        const n = parseInt(suffix, 10);
        if (!isNaN(n) && String(n) === suffix) numbers.push(n);
      }
    }
    return numbers.sort((a, b) => a - b);
  }

  getNextSessionNumber(date: string): number {
    const sessions = this.getSavedSessionsForDate(date);
    return sessions.length === 0 ? 1 : Math.max(...sessions) + 1;
  }

  migrateOldKeys(): void {
    const keysToMigrate: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)!;
      if (key.startsWith(this.PREFIX)) {
        const suffix = key.slice(this.PREFIX.length);
        if (/^\d{4}-\d{2}-\d{2}$/.test(suffix)) {
          keysToMigrate.push(key);
        }
      }
    }
    keysToMigrate.forEach(key => {
      const raw = localStorage.getItem(key);
      if (!raw) return;
      const session = JSON.parse(raw) as Session;
      session.sessionNumber = 1;
      const newKey = `${key}-1`;
      localStorage.setItem(newKey, JSON.stringify(session));
      localStorage.removeItem(key);
    });
  }

  todayDate(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private update(fn: (s: Session) => Session): void {
    const current = this._activeSession();
    if (!current) return;
    const updated = fn(current);
    this._activeSession.set(updated);
    this.saveSession(updated);
  }

  addPlayer(name: string): void {
    this.update(s => ({
      ...s,
      players: [...s.players, { id: crypto.randomUUID(), name: name.trim() }],
    }));
  }

  removePlayer(id: string): void {
    this.update(s => ({ ...s, players: s.players.filter(p => p.id !== id) }));
  }

  setRounds(rounds: Round[]): void {
    this.update(s => ({ ...s, rounds }));
  }

  saveScore(roundIndex: number, courtName: string, team1Score: number, team2Score: number): void {
    this.update(s => {
      const rounds = s.rounds.map((r, ri) => {
        if (ri !== roundIndex) return r;
        return {
          ...r,
          courts: r.courts.map(c =>
            c.courtName === courtName
              ? { ...c, score: { team1: team1Score, team2: team2Score } }
              : c
          ),
        };
      });
      return { ...s, rounds };
    });
  }

  getPlayerStats(): PlayerStats[] {
    const session = this._activeSession();
    if (!session) return [];

    const statsMap = new Map<string, PlayerStats>(
      session.players.map(p => [p.id, { player: p, wins: 0, totalPoints: 0, gamesPlayed: 0 }])
    );

    session.rounds.forEach(round => {
      round.courts.forEach(court => {
        if (!court.score) return;
        const { team1, team2, score } = court;
        const team1Won = score.team1 > score.team2;

        [...team1].forEach(id => {
          const s = statsMap.get(id);
          if (!s) return;
          s.gamesPlayed++;
          s.totalPoints += score.team1;
          if (team1Won) s.wins++;
        });

        [...team2].forEach(id => {
          const s = statsMap.get(id);
          if (!s) return;
          s.gamesPlayed++;
          s.totalPoints += score.team2;
          if (!team1Won) s.wins++;
        });
      });
    });

    return Array.from(statsMap.values());
  }

  encodeSessionToHash(session: Session): string {
    const json = JSON.stringify(session);
    const bytes = new TextEncoder().encode(json);
    let binary = '';
    bytes.forEach(b => binary += String.fromCharCode(b));
    return btoa(binary);
  }

  decodeSessionFromHash(hash: string): Session | null {
    try {
      const binary = atob(hash);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const json = new TextDecoder().decode(bytes);
      return JSON.parse(json) as Session;
    } catch {
      return null;
    }
  }
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
cd c:/apps/pickleball/roundrobin && npx ng test --include='src/app/services/session.service.spec.ts' --watch=false --browsers=ChromeHeadless 2>&1 | tail -20
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/app/services/session.service.spec.ts src/app/services/session.service.ts
git commit -m "feat(service): update SessionService for date+sessionNumber composite key"
```

---

## Task 3: Fix LeaderboardTab — resetSession

**Files:**
- Modify: `src/app/leaderboard-tab/leaderboard-tab.ts`

- [ ] **Step 1: Update `resetSession()` to pass `sessionNumber`**

In `src/app/leaderboard-tab/leaderboard-tab.ts`, replace the `resetSession()` method:

```ts
resetSession(): void {
  const ok = confirm('Reset this session? All players, schedule, and scores will be cleared.');
  if (!ok) return;
  const session = this.sessionService.activeSession();
  if (session) {
    this.sessionService.clearSession(session.date, session.sessionNumber);
    this.sessionService.initSession(session.date, session.sessionNumber);
  }
}
```

- [ ] **Step 2: Verify build compiles cleanly**

```bash
cd c:/apps/pickleball/roundrobin && npx ng build --configuration development 2>&1 | grep -E "error|warning" | head -20
```

Expected: no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/leaderboard-tab/leaderboard-tab.ts
git commit -m "fix(leaderboard): pass sessionNumber to clearSession and initSession"
```

---

## Task 4: Create SessionDrawer Component

**Files:**
- Create: `src/app/session-drawer/session-drawer.ts`
- Create: `src/app/session-drawer/session-drawer.html`

- [ ] **Step 1: Create `src/app/session-drawer/session-drawer.ts`**

```ts
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatBottomSheetRef, MAT_BOTTOM_SHEET_DATA } from '@angular/material/bottom-sheet';
import { MatButtonModule } from '@angular/material/button';
import { SessionService } from '../services/session.service';

export interface SessionDrawerData {
  currentDate: string;
  currentSessionNumber: number;
}

export interface SessionDrawerResult {
  date: string;
  sessionNumber: number;
}

@Component({
  selector: 'app-session-drawer',
  standalone: true,
  imports: [FormsModule, MatButtonModule],
  templateUrl: './session-drawer.html',
})
export class SessionDrawer {
  private readonly sheetRef = inject(MatBottomSheetRef<SessionDrawer, SessionDrawerResult>);
  readonly sessionService = inject(SessionService);
  readonly data = inject<SessionDrawerData>(MAT_BOTTOM_SHEET_DATA);

  selectedDate = signal<string>(this.data.currentDate);
  sessions = signal<number[]>([]);

  constructor() {
    this.refreshSessions();
  }

  onDateChange(date: string): void {
    this.selectedDate.set(date);
    this.refreshSessions();
  }

  private refreshSessions(): void {
    this.sessions.set(this.sessionService.getSavedSessionsForDate(this.selectedDate()));
  }

  selectSession(sessionNumber: number): void {
    this.sheetRef.dismiss({ date: this.selectedDate(), sessionNumber });
  }

  addNewSession(): void {
    const date = this.selectedDate();
    const sessionNumber = this.sessionService.getNextSessionNumber(date);
    this.sessionService.initSession(date, sessionNumber);
    this.sheetRef.dismiss({ date, sessionNumber });
  }
}
```

- [ ] **Step 2: Create `src/app/session-drawer/session-drawer.html`**

```html
<div style="padding:16px; max-width:400px; margin:0 auto;">
  <h3 style="margin:0 0 16px; color:#52b788; font-size:16px; font-weight:600;">Switch Session</h3>

  <div style="margin-bottom:16px;">
    <label style="display:block; font-size:12px; color:#aaa; margin-bottom:6px; text-transform:uppercase; letter-spacing:0.5px;">Date</label>
    <input
      type="date"
      [ngModel]="selectedDate()"
      (ngModelChange)="onDateChange($event)"
      style="width:100%; background:#2a2a4e; color:#e0e0e0; border:1px solid #52b788; border-radius:4px; padding:8px 10px; font-size:14px; box-sizing:border-box;"
    />
  </div>

  <div style="margin-bottom:12px;">
    @for (n of sessions(); track n) {
      <button
        mat-stroked-button
        (click)="selectSession(n)"
        [style.width]="'100%'"
        [style.margin-bottom]="'8px'"
        [style.background]="n === data.currentSessionNumber && selectedDate() === data.currentDate ? '#52b788' : 'transparent'"
        [style.color]="n === data.currentSessionNumber && selectedDate() === data.currentDate ? '#1a1a2e' : '#e0e0e0'"
        [style.border-color]="n === data.currentSessionNumber && selectedDate() === data.currentDate ? '#52b788' : '#444'"
      >
        Session {{ n }}
        @if (n === data.currentSessionNumber && selectedDate() === data.currentDate) {
          <span style="margin-left:8px; font-size:11px; opacity:0.8;">✓ active</span>
        }
      </button>
    }
    @if (sessions().length === 0) {
      <p style="color:#aaa; font-size:13px; text-align:center; margin:12px 0;">No sessions for this date yet</p>
    }
  </div>

  <button
    mat-stroked-button
    (click)="addNewSession()"
    style="width:100%; border-style:dashed; color:#52b788; border-color:#52b788;"
  >
    + New Session
  </button>
</div>
```

- [ ] **Step 3: Verify build compiles cleanly**

```bash
cd c:/apps/pickleball/roundrobin && npx ng build --configuration development 2>&1 | grep -E "error" | head -20
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/session-drawer/session-drawer.ts src/app/session-drawer/session-drawer.html
git commit -m "feat(session-drawer): add SessionDrawer bottom-sheet component"
```

---

## Task 5: Update App Component

**Files:**
- Modify: `src/app/app.ts`
- Modify: `src/app/app.html`

- [ ] **Step 1: Replace `src/app/app.ts`**

```ts
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatBottomSheet, MatBottomSheetModule } from '@angular/material/bottom-sheet';
import { SessionService } from './services/session.service';
import { PlayersTab } from './players-tab/players-tab';
import { ScheduleTab } from './schedule-tab/schedule-tab';
import { ScoresTab } from './scores-tab/scores-tab';
import { LeaderboardTab } from './leaderboard-tab/leaderboard-tab';
import { SessionDrawer, SessionDrawerData, SessionDrawerResult } from './session-drawer/session-drawer';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    MatTabsModule, MatToolbarModule, MatButtonModule, MatIconModule, MatBottomSheetModule,
    PlayersTab, ScheduleTab, ScoresTab, LeaderboardTab,
  ],
  templateUrl: './app.html',
  styleUrls: ['./app.scss'],
})
export class App implements OnInit {
  selectedDate = signal<string>('');
  selectedSessionNumber = signal<number>(1);
  readonly isReadOnly = signal<boolean>(false);

  constructor(
    readonly sessionService: SessionService,
    private readonly bottomSheet: MatBottomSheet,
  ) {}

  ngOnInit(): void {
    this.loadFromHash();
    window.addEventListener('hashchange', () => this.loadFromHash());
  }

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
    this.sessionService.initSession(today, 1);
    this.selectedDate.set(today);
    this.selectedSessionNumber.set(1);
  }

  openSessionDrawer(): void {
    const ref = this.bottomSheet.open(SessionDrawer, {
      data: {
        currentDate: this.selectedDate(),
        currentSessionNumber: this.selectedSessionNumber(),
      } as SessionDrawerData,
    });
    ref.afterDismissed().subscribe((result?: SessionDrawerResult) => {
      if (result) {
        this.onSessionChange(result.date, result.sessionNumber);
      }
    });
  }

  onSessionChange(date: string, sessionNumber: number): void {
    this.selectedDate.set(date);
    this.selectedSessionNumber.set(sessionNumber);
    this.sessionService.initSession(date, sessionNumber);
  }

  isToday(): boolean {
    return this.selectedDate() === this.sessionService.todayDate();
  }
}
```

- [ ] **Step 2: Replace `src/app/app.html`**

```html
<mat-toolbar color="primary" style="background:#1a1a2e; position:sticky; top:0; z-index:10;">
  <span style="font-weight:bold; color:#52b788; font-size:18px;">🏓 Pickleball Round Robin</span>
  <span style="flex:1"></span>

  @if (!isReadOnly()) {
    <button
      mat-button
      (click)="openSessionDrawer()"
      style="color:#89b4fa; font-size:13px; border:1px solid #444; border-radius:16px; padding:4px 14px; line-height:1.5;"
    >
      📅 {{ selectedDate() | date:'MMM d' }} · S{{ selectedSessionNumber() }} ▾
    </button>
  } @else {
    <span style="font-size:14px; color:#89b4fa;">👁 View Only</span>
  }
</mat-toolbar>

@if (isReadOnly()) {
  <div style="text-align:center; padding:10px; background:#1a2a3a; color:#89b4fa; font-size:14px;">
    Shared session — read only
  </div>
}

<mat-tab-group mat-stretch-tabs="false" animationDuration="200ms" style="margin-top:4px;">
  <mat-tab label="Players">
    <app-players-tab [readOnly]="isReadOnly()" />
  </mat-tab>
  <mat-tab label="Schedule">
    <app-schedule-tab />
  </mat-tab>
  <mat-tab label="Scores">
    <app-scores-tab [readOnly]="isReadOnly()" />
  </mat-tab>
  <mat-tab label="Leaderboard">
    <app-leaderboard-tab [readOnly]="isReadOnly()" />
  </mat-tab>
</mat-tab-group>
```

- [ ] **Step 3: Build and verify**

```bash
cd c:/apps/pickleball/roundrobin && npx ng build --configuration development 2>&1 | grep -E "error" | head -20
```

Expected: no errors.

- [ ] **Step 4: Run the app and smoke-test manually**

```bash
npx ng serve --open
```

Verify:
- Toolbar shows `📅 May 17 · S1` chip
- Clicking the chip opens a bottom drawer
- Drawer has a date input (defaulting to today) and "Session 1" in the list
- Changing the date in the drawer shows an empty session list + "No sessions yet"
- Clicking "+ New Session" creates a session and updates the chip

- [ ] **Step 5: Commit**

```bash
git add src/app/app.ts src/app/app.html
git commit -m "feat(app): replace date dropdown with session chip + MatBottomSheet drawer"
```

---

## Task 6: Update E2E Tests

**Files:**
- Modify: `tests/date/date-session.spec.ts`
- Modify: `tests/persistence/persistence.spec.ts`

- [ ] **Step 1: Replace `tests/date/date-session.spec.ts`**

```ts
// spec: specs/test-plan.md — Section 6

import { test, expect } from '@playwright/test';
import { freshState, addPlayers, generateShareUrl } from '../helpers';

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
    await page.locator('input[type="date"]').fill(pastDate);
    await page.locator('input[type="date"]').dispatchEvent('input');
    await page.locator('input[type="date"]').dispatchEvent('change');

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
    await page.locator('input[type="date"]').fill(futureDate);
    await page.locator('input[type="date"]').dispatchEvent('input');
    await page.locator('input[type="date"]').dispatchEvent('change');

    // Create Session 1 for future date
    await page.getByRole('button', { name: /New Session/ }).click();

    // Chip now shows future date · S1
    await expect(page.getByRole('button', { name: /S1/ })).toBeVisible();

    // Add a player to verify session works for future date
    await page.getByRole('tab', { name: 'Players' }).click();
    await page.getByPlaceholder('Player name').fill('FuturePlayer');
    await page.getByRole('button', { name: 'Add' }).click();
    await expect(page.getByText('FuturePlayer')).toBeVisible();
  });
});
```

- [ ] **Step 2: Replace `tests/persistence/persistence.spec.ts`**

```ts
// spec: specs/test-plan.md — Section 8

import { test, expect } from '@playwright/test';
import { freshState, setupSchedule, saveRound1Scores, goToLeaderboard } from '../helpers';

const BASE_URL = 'http://localhost:4200/roundrobin';

test.describe('localStorage Persistence', () => {
  test('8.1 — Session Persists Across Browser Reload', async ({ page }) => {
    await freshState(page);
    await page.getByRole('tab', { name: 'Players' }).click();
    await setupSchedule(page);
    await saveRound1Scores(page, [11, 7], [9, 11]);

    await page.reload();

    await page.getByRole('tab', { name: 'Players' }).click();
    await expect(page.getByText('8 / 11')).toBeVisible();

    await page.getByRole('tab', { name: 'Schedule' }).click();
    await expect(page.getByText('Round 1')).toBeVisible();

    await page.getByRole('tab', { name: 'Scores' }).click();
    await expect(page.locator('.round-card').first().getByText('11–7')).toBeVisible();

    await page.getByRole('tab', { name: 'Schedule' }).click();
    await expect(page.locator('.round-card').first().getByText('COMPLETED')).toBeVisible();
    await expect(page.locator('.round-card').nth(1).getByText('NOW')).toBeVisible();
  });

  test('8.2 — Multiple Dates Stored Independently', async ({ page }) => {
    await freshState(page);

    const pastDate = '2026-04-01';
    const pastSession = {
      date: pastDate,
      sessionNumber: 1,
      players: [{ id: 'past-player-id', name: 'PastPlayer' }],
      rounds: [],
    };

    // Inject with new key format
    await page.evaluate(
      ([key, value]) => localStorage.setItem(key, value),
      [`pickleball-session-${pastDate}-1`, JSON.stringify(pastSession)]
    );

    await page.goto(BASE_URL);

    // Open drawer and switch to past date
    await page.getByRole('button', { name: /S1/ }).click();
    await page.locator('input[type="date"]').fill(pastDate);
    await page.locator('input[type="date"]').dispatchEvent('input');
    await page.locator('input[type="date"]').dispatchEvent('change');
    await page.getByRole('button', { name: /Session 1/ }).click();

    // Past player is visible
    await page.getByRole('tab', { name: 'Players' }).click();
    await expect(page.getByText('PastPlayer')).toBeVisible();

    // Switch back to today — 0 players
    const today = new Date().toISOString().split('T')[0];
    await page.getByRole('button', { name: /S1/ }).click();
    await page.locator('input[type="date"]').fill(today);
    await page.locator('input[type="date"]').dispatchEvent('input');
    await page.locator('input[type="date"]').dispatchEvent('change');
    await page.getByRole('button', { name: /Session 1/ }).click();

    await page.getByRole('tab', { name: 'Players' }).click();
    await expect(page.getByText('0 / 11')).toBeVisible();
  });

  test('8.3 — Reset Clears localStorage Entry for Current Session', async ({ page }) => {
    await freshState(page);
    await page.getByRole('tab', { name: 'Players' }).click();
    await setupSchedule(page);
    await saveRound1Scores(page);
    await goToLeaderboard(page);

    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: 'Reset Session' }).click();

    // Verify localStorage re-created with empty data under new key format
    const today = new Date().toISOString().split('T')[0];
    const stored = await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key) ?? 'null'),
      `pickleball-session-${today}-1`
    );

    expect(stored).not.toBeNull();
    expect(stored.players).toHaveLength(0);
    expect(stored.rounds).toHaveLength(0);
  });

  test('8.4 — Old localStorage Keys Migrated on Load', async ({ page }) => {
    await freshState(page);

    // Inject old-format key (no session number suffix)
    const oldDate = '2026-03-15';
    const oldSession = {
      date: oldDate,
      players: [{ id: 'old-id', name: 'OldPlayer' }],
      rounds: [],
    };
    await page.evaluate(
      ([key, value]) => localStorage.setItem(key, value),
      [`pickleball-session-${oldDate}`, JSON.stringify(oldSession)]
    );

    // Reload triggers migrateOldKeys()
    await page.goto(BASE_URL);

    // Old key is gone, new key exists
    const oldKeyVal = await page.evaluate(
      (key) => localStorage.getItem(key),
      `pickleball-session-${oldDate}`
    );
    expect(oldKeyVal).toBeNull();

    const newKeyVal = await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key) ?? 'null'),
      `pickleball-session-${oldDate}-1`
    );
    expect(newKeyVal).not.toBeNull();
    expect(newKeyVal.sessionNumber).toBe(1);
  });
});
```

- [ ] **Step 3: Run date E2E tests**

```bash
cd c:/apps/pickleball/roundrobin && npx playwright test tests/date/ --reporter=line
```

Expected: all pass. If 6.3 or 6.6 fail due to date input interaction, try replacing `dispatchEvent('change')` with `page.keyboard.press('Tab')` after the fill.

- [ ] **Step 4: Run persistence E2E tests**

```bash
cd c:/apps/pickleball/roundrobin && npx playwright test tests/persistence/ --reporter=line
```

Expected: all pass.

- [ ] **Step 5: Run all E2E tests**

```bash
cd c:/apps/pickleball/roundrobin && npx playwright test --reporter=line
```

Expected: all previously passing tests still pass.

- [ ] **Step 6: Commit**

```bash
git add tests/date/date-session.spec.ts tests/persistence/persistence.spec.ts
git commit -m "test(e2e): update date and persistence tests for new session management UI"
```

---

## Task 7: Update anatomy.md

- [ ] **Step 1: Update `.wolf/anatomy.md` entries for new and modified files**

Add these entries under `## src/app/session-drawer/`:

```
- `session-drawer.ts` — Exports SessionDrawer, SessionDrawerData, SessionDrawerResult; MatBottomSheet content component with date input, session list, and New Session button (~250 tok)
- `session-drawer.html` — Drawer template: date input, @for session buttons, + New Session button (~150 tok)
```

Update existing entries:
- `session.models.ts` — add `sessionNumber: number` to description
- `session.service.ts` — add `getSavedSessionsForDate`, `getNextSessionNumber`, `migrateOldKeys` to description
- `app.ts` — update to mention `selectedSessionNumber`, `openSessionDrawer`, `MatBottomSheet`
- `app.html` — update to mention session chip button replacing mat-select

- [ ] **Step 2: Commit anatomy update**

```bash
git add .wolf/anatomy.md
git commit -m "docs(wolf): update anatomy for session management changes"
```
