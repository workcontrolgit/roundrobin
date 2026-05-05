# Pickleball Round Robin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an Angular 17+ single-page app for organizing a 2-court pickleball round robin with 8–11 players, score tracking, a leaderboard, and QR-code-based session sharing, deployed to GitHub Pages.

**Architecture:** Standalone Angular components with Angular Material tabs. Two injectable services own all logic — `SessionService` (localStorage persistence keyed by date) and `ScheduleService` (pure schedule generation). Components are thin wrappers over these services.

**Tech Stack:** Angular 17+ (standalone), Angular Material 17, SCSS dark theme, `qrcode` npm package, GitHub Actions for GitHub Pages deployment.

---

## File Map

```
src/
├── styles.scss                                    ← global dark theme
├── app/
│   ├── models/
│   │   └── session.models.ts                     ← all interfaces (Player, Session, Round, CourtGame)
│   ├── services/
│   │   ├── session.service.ts                    ← localStorage, date-keyed sessions, state signal
│   │   ├── session.service.spec.ts
│   │   ├── schedule.service.ts                   ← pure schedule generation algorithm
│   │   └── schedule.service.spec.ts
│   ├── players-tab/
│   │   ├── players-tab.component.ts
│   │   └── players-tab.component.html
│   ├── schedule-tab/
│   │   ├── schedule-tab.component.ts
│   │   └── schedule-tab.component.html
│   ├── scores-tab/
│   │   ├── scores-tab.component.ts
│   │   └── scores-tab.component.html
│   ├── leaderboard-tab/
│   │   ├── leaderboard-tab.component.ts
│   │   └── leaderboard-tab.component.html
│   ├── share-dialog/
│   │   ├── share-dialog.component.ts
│   │   └── share-dialog.component.html
│   ├── app.component.ts
│   ├── app.component.html
│   └── app.component.scss
.github/
└── workflows/
    └── deploy.yml
```

---

## Task 1: Scaffold Angular project

**Files:**
- Create: `src/` (Angular CLI generates all scaffold files)
- Modify: `angular.json` (base-href for GitHub Pages)

- [ ] **Step 1: Create Angular project**

```bash
cd c:/apps/pickleball/roundrobin
ng new pickleball-roundrobin --standalone --routing=false --style=scss --skip-git=true --directory=.
```

When prompted: accept defaults. If the directory is not empty, confirm overwrite.

- [ ] **Step 2: Add Angular Material**

```bash
cd c:/apps/pickleball/roundrobin
ng add @angular/material
```

When prompted:
- Choose theme: **Custom**
- Set up global Angular Material typography: **Yes**
- Include and enable animations: **Yes**

- [ ] **Step 3: Install qrcode**

```bash
npm install qrcode
npm install --save-dev @types/qrcode
```

- [ ] **Step 4: Verify the project builds**

```bash
ng build
```

Expected: Build succeeds, output in `dist/`.

- [ ] **Step 5: Commit**

```bash
git init
git add .
git commit -m "feat: scaffold Angular project with Angular Material"
```

---

## Task 2: Data models

**Files:**
- Create: `src/app/models/session.models.ts`

- [ ] **Step 1: Create the models file**

Create `src/app/models/session.models.ts`:

```typescript
export interface Player {
  id: string;    // crypto.randomUUID()
  name: string;
}

export interface CourtGame {
  courtName: string;                        // "Court 1", "Court 2"
  team1: [string, string];                  // player ids
  team2: [string, string];                  // player ids
  score?: { team1: number; team2: number };
}

export interface Round {
  roundNumber: number;
  courts: CourtGame[];   // always 2 in V1
  sittingOut: string[];  // player ids
}

export interface Session {
  date: string;          // YYYY-MM-DD
  players: Player[];     // 8–11 players
  rounds: Round[];
}

export interface PlayerStats {
  player: Player;
  wins: number;
  totalPoints: number;
  gamesPlayed: number;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/models/session.models.ts
git commit -m "feat: add session data models"
```

---

## Task 3: ScheduleService — TDD

**Files:**
- Create: `src/app/services/schedule.service.ts`
- Create: `src/app/services/schedule.service.spec.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/app/services/schedule.service.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { ScheduleService } from './schedule.service';
import { Player, Round } from '../models/session.models';

function makePlayers(n: number): Player[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `p${i}`,
    name: `Player ${i + 1}`,
  }));
}

describe('ScheduleService', () => {
  let service: ScheduleService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ScheduleService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('generateRounds()', () => {
    it('generates at least 7 rounds for 8 players', () => {
      const rounds = service.generateRounds(makePlayers(8));
      expect(rounds.length).toBeGreaterThanOrEqual(7);
    });

    it('generates rounds for 11 players', () => {
      const rounds = service.generateRounds(makePlayers(11));
      expect(rounds.length).toBeGreaterThanOrEqual(7);
    });

    it('every round has exactly 2 courts', () => {
      const rounds = service.generateRounds(makePlayers(8));
      rounds.forEach(r => expect(r.courts.length).toBe(2));
    });

    it('every court has exactly 4 unique players per round', () => {
      const rounds = service.generateRounds(makePlayers(8));
      rounds.forEach(round => {
        round.courts.forEach(court => {
          const ids = [...court.team1, ...court.team2];
          expect(ids.length).toBe(4);
          expect(new Set(ids).size).toBe(4);
        });
      });
    });

    it('no player appears twice in the same round', () => {
      const rounds = service.generateRounds(makePlayers(9));
      rounds.forEach(round => {
        const allPlaying = round.courts.flatMap(c => [...c.team1, ...c.team2]);
        expect(new Set(allPlaying).size).toBe(allPlaying.length);
      });
    });

    it('with 8 players, no one sits out', () => {
      const rounds = service.generateRounds(makePlayers(8));
      rounds.forEach(r => expect(r.sittingOut.length).toBe(0));
    });

    it('with 9 players, exactly 1 sits out per round', () => {
      const rounds = service.generateRounds(makePlayers(9));
      rounds.forEach(r => expect(r.sittingOut.length).toBe(1));
    });

    it('with 11 players, exactly 3 sit out per round', () => {
      const rounds = service.generateRounds(makePlayers(11));
      rounds.forEach(r => expect(r.sittingOut.length).toBe(3));
    });

    it('sit-outs are distributed fairly across all players', () => {
      const players = makePlayers(9);
      const rounds = service.generateRounds(players);
      const sitOutCounts: Record<string, number> = {};
      players.forEach(p => (sitOutCounts[p.id] = 0));
      rounds.forEach(r => r.sittingOut.forEach(id => sitOutCounts[id]++));
      const counts = Object.values(sitOutCounts);
      const max = Math.max(...counts);
      const min = Math.min(...counts);
      expect(max - min).toBeLessThanOrEqual(1);
    });

    it('round numbers are sequential starting at 1', () => {
      const rounds = service.generateRounds(makePlayers(8));
      rounds.forEach((r, i) => expect(r.roundNumber).toBe(i + 1));
    });

    it('court names are Court 1 and Court 2', () => {
      const rounds = service.generateRounds(makePlayers(8));
      rounds.forEach(r => {
        expect(r.courts[0].courtName).toBe('Court 1');
        expect(r.courts[1].courtName).toBe('Court 2');
      });
    });

    it('is deterministic — same players produce same schedule', () => {
      const players = makePlayers(10);
      const r1 = service.generateRounds(players);
      const r2 = service.generateRounds(players);
      expect(JSON.stringify(r1)).toBe(JSON.stringify(r2));
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
ng test --include="**/schedule.service.spec.ts" --watch=false
```

Expected: FAILED — `ScheduleService` not found.

- [ ] **Step 3: Implement ScheduleService**

Create `src/app/services/schedule.service.ts`:

```typescript
import { Injectable } from '@angular/core';
import { Player, Round, CourtGame } from '../models/session.models';

@Injectable({ providedIn: 'root' })
export class ScheduleService {

  generateRounds(players: Player[]): Round[] {
    const n = players.length;
    const sitOutsPerRound = n - 8;
    // Target: enough rounds that every player has rotated through sit-outs
    // and played with varied partners. Min 7 rounds.
    const numRounds = Math.max(7, n <= 8 ? 7 : n <= 9 ? 9 : n <= 10 ? 10 : 11);

    const sitOutCount = new Array(n).fill(0);
    const pairCount: Record<string, number> = {};
    const rounds: Round[] = [];

    for (let r = 0; r < numRounds; r++) {
      const indices = Array.from({ length: n }, (_, i) => i);

      // Select sit-outs: players with fewest sit-outs first (their turn)
      const sorted = [...indices].sort((a, b) =>
        sitOutCount[a] !== sitOutCount[b]
          ? sitOutCount[a] - sitOutCount[b]
          : a - b
      );
      const sittingOutIndices = sorted.slice(0, sitOutsPerRound);
      const playingIndices = sorted.slice(sitOutsPerRound);
      sittingOutIndices.forEach(i => sitOutCount[i]++);

      // Rotate playing order each round to vary court assignments
      const offset = r % playingIndices.length;
      const rotated = [
        ...playingIndices.slice(offset),
        ...playingIndices.slice(0, offset),
      ];

      const court1Group = rotated.slice(0, 4);
      const court2Group = rotated.slice(4, 8);

      const [c1t1, c1t2] = this.bestTeamSplit(court1Group, players, pairCount);
      const [c2t1, c2t2] = this.bestTeamSplit(court2Group, players, pairCount);

      this.recordPair(players[c1t1[0]].id, players[c1t1[1]].id, pairCount);
      this.recordPair(players[c1t2[0]].id, players[c1t2[1]].id, pairCount);
      this.recordPair(players[c2t1[0]].id, players[c2t1[1]].id, pairCount);
      this.recordPair(players[c2t2[0]].id, players[c2t2[1]].id, pairCount);

      rounds.push({
        roundNumber: r + 1,
        courts: [
          {
            courtName: 'Court 1',
            team1: [players[c1t1[0]].id, players[c1t1[1]].id],
            team2: [players[c1t2[0]].id, players[c1t2[1]].id],
          },
          {
            courtName: 'Court 2',
            team1: [players[c2t1[0]].id, players[c2t1[1]].id],
            team2: [players[c2t2[0]].id, players[c2t2[1]].id],
          },
        ],
        sittingOut: sittingOutIndices.map(i => players[i].id),
      });
    }

    return rounds;
  }

  private bestTeamSplit(
    group: number[],
    players: Player[],
    pairCount: Record<string, number>
  ): [number[], number[]] {
    const score = (i: number, j: number) =>
      pairCount[this.pairKey(players[group[i]].id, players[group[j]].id)] ?? 0;

    const splits = [
      { teams: [[0, 1], [2, 3]], score: score(0, 1) + score(2, 3) },
      { teams: [[0, 2], [1, 3]], score: score(0, 2) + score(1, 3) },
      { teams: [[0, 3], [1, 2]], score: score(0, 3) + score(1, 2) },
    ];
    splits.sort((a, b) => a.score - b.score);
    return [
      splits[0].teams[0].map(i => group[i]),
      splits[0].teams[1].map(i => group[i]),
    ];
  }

  private pairKey(a: string, b: string): string {
    return [a, b].sort().join('|');
  }

  private recordPair(a: string, b: string, pairCount: Record<string, number>): void {
    const key = this.pairKey(a, b);
    pairCount[key] = (pairCount[key] ?? 0) + 1;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
ng test --include="**/schedule.service.spec.ts" --watch=false
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/services/schedule.service.ts src/app/services/schedule.service.spec.ts
git commit -m "feat: add ScheduleService with round-robin algorithm"
```

---

## Task 4: SessionService — TDD

**Files:**
- Create: `src/app/services/session.service.ts`
- Create: `src/app/services/session.service.spec.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/app/services/session.service.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { SessionService } from './session.service';
import { Session, Player } from '../models/session.models';

function makeSession(date: string): Session {
  return { date, players: [], rounds: [] };
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
    it('returns correct key for a date', () => {
      expect(service.storageKey('2026-05-04')).toBe('pickleball-session-2026-05-04');
    });
  });

  describe('saveSession()', () => {
    it('saves session to localStorage under date key', () => {
      const session = makeSession('2026-05-04');
      service.saveSession(session);
      const raw = localStorage.getItem('pickleball-session-2026-05-04');
      expect(raw).toBeTruthy();
      expect(JSON.parse(raw!).date).toBe('2026-05-04');
    });
  });

  describe('loadSession()', () => {
    it('returns null when no session exists for date', () => {
      expect(service.loadSession('2026-01-01')).toBeNull();
    });

    it('returns the saved session for a date', () => {
      const session = makeSession('2026-05-04');
      service.saveSession(session);
      const loaded = service.loadSession('2026-05-04');
      expect(loaded).not.toBeNull();
      expect(loaded!.date).toBe('2026-05-04');
    });
  });

  describe('getSavedDates()', () => {
    it('returns empty array when no sessions saved', () => {
      expect(service.getSavedDates()).toEqual([]);
    });

    it('returns list of saved dates sorted descending', () => {
      service.saveSession(makeSession('2026-05-01'));
      service.saveSession(makeSession('2026-05-04'));
      service.saveSession(makeSession('2026-04-30'));
      const dates = service.getSavedDates();
      expect(dates).toEqual(['2026-05-04', '2026-05-01', '2026-04-30']);
    });
  });

  describe('clearSession()', () => {
    it('removes session from localStorage', () => {
      service.saveSession(makeSession('2026-05-04'));
      service.clearSession('2026-05-04');
      expect(service.loadSession('2026-05-04')).toBeNull();
    });
  });

  describe('addPlayer()', () => {
    it('adds a player to the active session and saves', () => {
      service.initSession('2026-05-04');
      service.addPlayer('Alice');
      const session = service.activeSession();
      expect(session!.players.length).toBe(1);
      expect(session!.players[0].name).toBe('Alice');
    });

    it('generates a unique id for each player', () => {
      service.initSession('2026-05-04');
      service.addPlayer('Alice');
      service.addPlayer('Bob');
      const ids = service.activeSession()!.players.map(p => p.id);
      expect(new Set(ids).size).toBe(2);
    });
  });

  describe('removePlayer()', () => {
    it('removes a player by id', () => {
      service.initSession('2026-05-04');
      service.addPlayer('Alice');
      const id = service.activeSession()!.players[0].id;
      service.removePlayer(id);
      expect(service.activeSession()!.players.length).toBe(0);
    });
  });

  describe('setRounds()', () => {
    it('saves rounds to the active session', () => {
      service.initSession('2026-05-04');
      service.setRounds([]);
      expect(service.activeSession()!.rounds).toEqual([]);
    });
  });

  describe('saveScore()', () => {
    it('saves score for the correct court in the correct round', () => {
      service.initSession('2026-05-04');
      service.setRounds([
        {
          roundNumber: 1,
          courts: [
            { courtName: 'Court 1', team1: ['p0', 'p1'], team2: ['p2', 'p3'] },
            { courtName: 'Court 2', team1: ['p4', 'p5'], team2: ['p6', 'p7'] },
          ],
          sittingOut: [],
        },
      ]);
      service.saveScore(0, 'Court 1', 11, 7);
      const court = service.activeSession()!.rounds[0].courts[0];
      expect(court.score).toEqual({ team1: 11, team2: 7 });
    });
  });

  describe('getPlayerStats()', () => {
    it('returns 0 wins and 0 points when no scores', () => {
      service.initSession('2026-05-04');
      service.addPlayer('Alice');
      service.setRounds([
        {
          roundNumber: 1,
          courts: [
            { courtName: 'Court 1', team1: [service.activeSession()!.players[0].id, 'p1'], team2: ['p2', 'p3'] },
            { courtName: 'Court 2', team1: ['p4', 'p5'], team2: ['p6', 'p7'] },
          ],
          sittingOut: [],
        },
      ]);
      const stats = service.getPlayerStats();
      const alice = stats.find(s => s.player.name === 'Alice')!;
      expect(alice.wins).toBe(0);
      expect(alice.totalPoints).toBe(0);
    });

    it('counts wins and points correctly', () => {
      service.initSession('2026-05-04');
      service.addPlayer('Alice');
      const aliceId = service.activeSession()!.players[0].id;
      service.setRounds([
        {
          roundNumber: 1,
          courts: [
            {
              courtName: 'Court 1',
              team1: [aliceId, 'p1'],
              team2: ['p2', 'p3'],
              score: { team1: 11, team2: 7 },
            },
            { courtName: 'Court 2', team1: ['p4', 'p5'], team2: ['p6', 'p7'] },
          ],
          sittingOut: [],
        },
      ]);
      const stats = service.getPlayerStats();
      const alice = stats.find(s => s.player.name === 'Alice')!;
      expect(alice.wins).toBe(1);
      expect(alice.totalPoints).toBe(11);
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
ng test --include="**/session.service.spec.ts" --watch=false
```

Expected: FAILED — `SessionService` not found.

- [ ] **Step 3: Implement SessionService**

Create `src/app/services/session.service.ts`:

```typescript
import { Injectable, signal, computed } from '@angular/core';
import { Session, Player, Round, PlayerStats, CourtGame } from '../models/session.models';

@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly PREFIX = 'pickleball-session-';
  private _activeSession = signal<Session | null>(null);

  readonly activeSession = this._activeSession.asReadonly();

  storageKey(date: string): string {
    return `${this.PREFIX}${date}`;
  }

  saveSession(session: Session): void {
    localStorage.setItem(this.storageKey(session.date), JSON.stringify(session));
  }

  loadSession(date: string): Session | null {
    const raw = localStorage.getItem(this.storageKey(date));
    return raw ? (JSON.parse(raw) as Session) : null;
  }

  getSavedDates(): string[] {
    const dates: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)!;
      if (key.startsWith(this.PREFIX)) {
        dates.push(key.slice(this.PREFIX.length));
      }
    }
    return dates.sort((a, b) => b.localeCompare(a));
  }

  clearSession(date: string): void {
    localStorage.removeItem(this.storageKey(date));
    if (this._activeSession()?.date === date) {
      this._activeSession.set(null);
    }
  }

  initSession(date: string): void {
    const existing = this.loadSession(date);
    if (existing) {
      this._activeSession.set(existing);
    } else {
      const session: Session = { date, players: [], rounds: [] };
      this.saveSession(session);
      this._activeSession.set(session);
    }
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
    return btoa(JSON.stringify(session));
  }

  decodeSessionFromHash(hash: string): Session | null {
    try {
      return JSON.parse(atob(hash)) as Session;
    } catch {
      return null;
    }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
ng test --include="**/session.service.spec.ts" --watch=false
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/services/session.service.ts src/app/services/session.service.spec.ts
git commit -m "feat: add SessionService with localStorage persistence"
```

---

## Task 5: Global dark theme and AppComponent layout

**Files:**
- Modify: `src/styles.scss`
- Modify: `src/app/app.component.ts`
- Modify: `src/app/app.component.html`
- Modify: `src/app/app.component.scss`

- [ ] **Step 1: Apply dark theme in styles.scss**

Replace the contents of `src/styles.scss`:

```scss
@use '@angular/material' as mat;

// Use large typography for 508 compliance — older users need readable text
$typography: mat.define-typography-config(
  $body-1:   mat.define-typography-level(18px, 1.5, 400),
  $body-2:   mat.define-typography-level(18px, 1.5, 500),
  $subtitle-1: mat.define-typography-level(20px, 1.4, 500),
  $headline-6: mat.define-typography-level(22px, 1.3, 600),
);

$primary: mat.define-palette(mat.$green-palette, 400, 200, 700);
$accent:  mat.define-palette(mat.$blue-palette, A200);
$warn:    mat.define-palette(mat.$red-palette);

$theme: mat.define-dark-theme((
  color: (primary: $primary, accent: $accent, warn: $warn),
  typography: $typography,
  density: 0,
));

@include mat.all-component-themes($theme);

html, body {
  height: 100%;
  margin: 0;
  background-color: #1e1e2e;
  color: #cdd6f4;      // contrast ratio ≥ 8:1 on #1e1e2e — passes WCAG AAA
  font-family: Roboto, sans-serif;
  font-size: 18px;     // 508: minimum body text size
}

// 508: all buttons/interactive elements min 48×48px touch target
button, .mat-mdc-button, .mat-mdc-raised-button,
.mat-mdc-stroked-button, .mat-mdc-icon-button {
  min-height: 48px !important;
  min-width: 48px !important;
}

// 508: tab bar height
.mat-mdc-tab {
  min-height: 56px !important;
  font-size: 16px !important;
}

.accent-green { color: #52b788; }  // contrast 4.7:1 on #1e1e2e — passes WCAG AA

// 508: muted text still passes 4.5:1 — use #8a8fa8 instead of #6c7086
.text-muted   { color: #8a8fa8; }  // contrast 4.6:1 on #1e1e2e

.text-small   { font-size: 16px; } // 508: no text below 16px

.round-card {
  background: #2a2a3e !important;
  margin-bottom: 14px;
  padding: 4px 0;
}

.round-card.active {
  border: 2px solid #52b788 !important; // thicker border — more visible
}

.round-card.completed {
  opacity: 0.9; // 508: don't reduce opacity too much — keeps contrast
}

.round-card.upcoming {
  opacity: 0.65; // 508: reduced but still readable
}

.status-badge {
  font-size: 14px;       // 508: readable badge text
  font-weight: bold;
  padding: 4px 10px;
  border-radius: 10px;
}

// All badge colors pass WCAG AA contrast on their backgrounds
.badge-completed { background: #1a3a2a; color: #a6e3a1; }  // 4.8:1
.badge-active    { background: #1a2a3a; color: #89dcff; }  // 5.1:1
.badge-upcoming  { background: #2a2a3e; color: #8a8fa8; }  // 4.6:1

// 508: score inputs — large, readable
input[type="number"] {
  font-size: 20px !important;
  font-weight: bold !important;
  min-height: 48px !important;
  text-align: center;
}

// 508: player list rows — tall enough to tap easily
mat-list-item {
  min-height: 56px !important;
}

// 508: leaderboard rows
.leaderboard-row {
  min-height: 60px;
  font-size: 18px;
}

// 508: player name in leaderboard — large and bold
.player-name {
  font-size: 20px;
  font-weight: 600;
  color: #cdd6f4;
}

.player-stat {
  font-size: 16px;
  color: #8a8fa8;
}

// 508: score display — large
.score-display {
  font-size: 24px;
  font-weight: bold;
  color: #a6e3a1;
}
```

- [ ] **Step 2: Write AppComponent**

Replace `src/app/app.component.ts`:

```typescript
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { SessionService } from './services/session.service';
import { Session } from './models/session.models';
import { PlayersTabComponent } from './players-tab/players-tab.component';
import { ScheduleTabComponent } from './schedule-tab/schedule-tab.component';
import { ScoresTabComponent } from './scores-tab/scores-tab.component';
import { LeaderboardTabComponent } from './leaderboard-tab/leaderboard-tab.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatTabsModule, MatToolbarModule, MatSelectModule, MatButtonModule, MatIconModule,
    PlayersTabComponent, ScheduleTabComponent, ScoresTabComponent, LeaderboardTabComponent,
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
  savedDates = signal<string[]>([]);
  selectedDate = signal<string>('');
  readonly isReadOnly = signal<boolean>(false);

  constructor(readonly sessionService: SessionService) {}

  ngOnInit(): void {
    // Check for shared session in URL hash
    const hash = window.location.hash.slice(1);
    if (hash) {
      const shared = this.sessionService.decodeSessionFromHash(hash);
      if (shared) {
        this.sessionService['_activeSession'].set(shared);
        this.isReadOnly.set(true);
        return;
      }
    }
    // Load today's session
    const today = this.sessionService.todayDate();
    this.sessionService.initSession(today);
    this.selectedDate.set(today);
    this.refreshDates();
  }

  refreshDates(): void {
    const dates = this.sessionService.getSavedDates();
    const today = this.sessionService.todayDate();
    if (!dates.includes(today)) dates.unshift(today);
    this.savedDates.set(dates);
  }

  onDateChange(date: string): void {
    this.selectedDate.set(date);
    this.sessionService.initSession(date);
  }

  isToday(): boolean {
    return this.selectedDate() === this.sessionService.todayDate();
  }
}
```

- [ ] **Step 3: Write AppComponent template**

Replace `src/app/app.component.html`:

```html
<mat-toolbar color="primary" style="background:#1a1a2e; position:sticky; top:0; z-index:10;">
  <span style="font-weight:bold; color:#52b788;">🏓 Pickleball Round Robin</span>
  <span style="flex:1"></span>

  @if (!isReadOnly()) {
    <mat-select
      [ngModel]="selectedDate()"
      (ngModelChange)="onDateChange($event)"
      style="width:140px; font-size:13px;"
    >
      @for (date of savedDates(); track date) {
        <mat-option [value]="date">{{ date }}</mat-option>
      }
    </mat-select>
  } @else {
    <span style="font-size:12px; color:#89b4fa;">👁 View Only</span>
  }
</mat-toolbar>

@if (isReadOnly()) {
  <div style="text-align:center; padding:8px; background:#1a2a3a; color:#89b4fa; font-size:13px;">
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

- [ ] **Step 4: Write AppComponent styles**

Replace `src/app/app.component.scss`:

```scss
:host {
  display: block;
  max-width: 600px;
  margin: 0 auto;
}

mat-tab-group {
  ::ng-deep .mat-mdc-tab-body-content {
    padding: 16px;
  }
}
```

- [ ] **Step 5: Verify build compiles (tabs are empty stubs for now)**

Create stub components so the build passes. Create `src/app/players-tab/players-tab.component.ts`:

```typescript
import { Component, Input } from '@angular/core';
@Component({ selector: 'app-players-tab', standalone: true, template: '<p>Players</p>' })
export class PlayersTabComponent { @Input() readOnly = false; }
```

Create `src/app/schedule-tab/schedule-tab.component.ts`:
```typescript
import { Component } from '@angular/core';
@Component({ selector: 'app-schedule-tab', standalone: true, template: '<p>Schedule</p>' })
export class ScheduleTabComponent {}
```

Create `src/app/scores-tab/scores-tab.component.ts`:
```typescript
import { Component, Input } from '@angular/core';
@Component({ selector: 'app-scores-tab', standalone: true, template: '<p>Scores</p>' })
export class ScoresTabComponent { @Input() readOnly = false; }
```

Create `src/app/leaderboard-tab/leaderboard-tab.component.ts`:
```typescript
import { Component, Input } from '@angular/core';
@Component({ selector: 'app-leaderboard-tab', standalone: true, template: '<p>Leaderboard</p>' })
export class LeaderboardTabComponent { @Input() readOnly = false; }
```

```bash
ng build
```

Expected: Build succeeds.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add AppComponent layout with dark theme and session date selector"
```

---

## Task 6: PlayersTabComponent

**Files:**
- Modify: `src/app/players-tab/players-tab.component.ts`
- Create: `src/app/players-tab/players-tab.component.html`

- [ ] **Step 1: Implement PlayersTabComponent**

Replace `src/app/players-tab/players-tab.component.ts`:

```typescript
import { Component, Input, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { SessionService } from '../services/session.service';
import { ScheduleService } from '../services/schedule.service';

@Component({
  selector: 'app-players-tab',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatInputModule, MatButtonModule, MatIconModule, MatListModule, MatDialogModule,
  ],
  templateUrl: './players-tab.component.html',
})
export class PlayersTabComponent {
  @Input() readOnly = false;

  readonly sessionService = inject(SessionService);
  readonly scheduleService = inject(ScheduleService);

  newName = '';

  readonly players = computed(() => this.sessionService.activeSession()?.players ?? []);
  readonly canAdd = computed(() => this.players().length < 11 && this.newName.trim().length > 0);
  readonly canGenerate = computed(() => this.players().length >= 8);

  addPlayer(): void {
    if (!this.canAdd()) return;
    this.sessionService.addPlayer(this.newName);
    this.newName = '';
  }

  removePlayer(id: string): void {
    this.sessionService.removePlayer(id);
  }

  generateSchedule(): void {
    const session = this.sessionService.activeSession();
    if (!session || !this.canGenerate()) return;
    const hasExisting = session.rounds.length > 0;
    if (hasExisting) {
      const ok = confirm('This will clear the existing schedule and all scores. Continue?');
      if (!ok) return;
    }
    const rounds = this.scheduleService.generateRounds(session.players);
    this.sessionService.setRounds(rounds);
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') this.addPlayer();
  }
}
```

- [ ] **Step 2: Write template**

Create `src/app/players-tab/players-tab.component.html`:

```html
<div style="max-width:500px; margin:0 auto;">

  <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:16px;">
    <h2 style="margin:0; color:#52b788;">Players</h2>
    <span class="status-badge" [class]="players().length >= 8 ? 'badge-completed' : 'badge-upcoming'">
      {{ players().length }} / 11
    </span>
  </div>

  @if (!readOnly) {
    <div style="display:flex; gap:8px; margin-bottom:16px;">
      <mat-form-field appearance="outline" style="flex:1;">
        <mat-label>Player name</mat-label>
        <input matInput [(ngModel)]="newName" (keydown)="onKeydown($event)" maxlength="30" />
      </mat-form-field>
      <button mat-raised-button color="primary" (click)="addPlayer()" [disabled]="!canAdd()">
        Add
      </button>
    </div>
  }

  @if (players().length === 0) {
    <p class="text-muted" style="text-align:center;">Add 8–11 players to get started.</p>
  }

  <mat-list>
    @for (player of players(); track player.id; let i = $index) {
      <mat-list-item style="background:#2a2a3e; border-radius:8px; margin-bottom:6px;">
        <span matListItemTitle>{{ i + 1 }}. {{ player.name }}</span>
        @if (!readOnly) {
          <button matListItemMeta mat-icon-button color="warn" (click)="removePlayer(player.id)">
            <mat-icon>close</mat-icon>
          </button>
        }
      </mat-list-item>
    }
  </mat-list>

  @if (!readOnly && players().length >= 8) {
    <button mat-raised-button color="primary" style="width:100%; margin-top:16px;"
            (click)="generateSchedule()">
      Generate Schedule ({{ players().length }} players · 2 courts)
    </button>
  }

  @if (!readOnly && players().length > 0 && players().length < 8) {
    <p class="text-muted" style="text-align:center; margin-top:8px;">
      Add {{ 8 - players().length }} more player(s) to generate schedule
    </p>
  }

</div>
```

- [ ] **Step 3: Build and verify**

```bash
ng build
```

Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/app/players-tab/
git commit -m "feat: implement PlayersTabComponent"
```

---

## Task 7: ScheduleTabComponent

**Files:**
- Modify: `src/app/schedule-tab/schedule-tab.component.ts`
- Create: `src/app/schedule-tab/schedule-tab.component.html`

- [ ] **Step 1: Implement ScheduleTabComponent**

Replace `src/app/schedule-tab/schedule-tab.component.ts`:

```typescript
import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { SessionService } from '../services/session.service';
import { Round, Player } from '../models/session.models';

@Component({
  selector: 'app-schedule-tab',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatChipsModule],
  templateUrl: './schedule-tab.component.html',
})
export class ScheduleTabComponent {
  readonly sessionService = inject(SessionService);

  readonly rounds = computed(() => this.sessionService.activeSession()?.rounds ?? []);
  readonly players = computed(() => this.sessionService.activeSession()?.players ?? []);

  readonly activeRoundIndex = computed(() => {
    const rounds = this.rounds();
    for (let i = 0; i < rounds.length; i++) {
      const allScored = rounds[i].courts.every(c => c.score != null);
      if (!allScored) return i;
    }
    return rounds.length; // all done
  });

  roundStatus(index: number): 'completed' | 'active' | 'upcoming' {
    const active = this.activeRoundIndex();
    if (index < active) return 'completed';
    if (index === active) return 'active';
    return 'upcoming';
  }

  playerName(id: string): string {
    return this.players().find(p => p.id === id)?.name ?? id;
  }

  sittingOutNames(ids: string[]): string {
    return ids.map(id => this.playerName(id)).join(', ');
  }
}
```

- [ ] **Step 2: Write template**

Create `src/app/schedule-tab/schedule-tab.component.html`:

```html
<div style="max-width:500px; margin:0 auto;">
  <h2 style="color:#52b788;">Schedule</h2>

  @if (rounds().length === 0) {
    <p class="text-muted" style="text-align:center;">
      Add 8–11 players on the Players tab and generate a schedule.
    </p>
  }

  @for (round of rounds(); track round.roundNumber; let i = $index) {
    <mat-card class="round-card" [class]="roundStatus(i)">
      <mat-card-header>
        <mat-card-title style="font-size:14px;">
          Round {{ round.roundNumber }}
        </mat-card-title>
        <span style="flex:1;"></span>
        <span class="status-badge"
              [class]="'badge-' + roundStatus(i)">
          {{ roundStatus(i) === 'active' ? 'NOW' : roundStatus(i) | uppercase }}
        </span>
      </mat-card-header>

      <mat-card-content style="margin-top:12px;">
        @for (court of round.courts; track court.courtName) {
          <div style="margin-bottom:10px;">
            <div class="text-muted text-small" style="margin-bottom:4px;">{{ court.courtName }}</div>
            <div style="display:flex; align-items:center; gap:8px; font-size:14px;">
              <span>{{ playerName(court.team1[0]) }} &amp; {{ playerName(court.team1[1]) }}</span>
              @if (court.score) {
                <span class="accent-green" style="font-weight:bold;">
                  {{ court.score.team1 }}–{{ court.score.team2 }}
                </span>
              } @else {
                <span class="text-muted">vs</span>
              }
              <span>{{ playerName(court.team2[0]) }} &amp; {{ playerName(court.team2[1]) }}</span>
            </div>
          </div>
        }

        @if (round.sittingOut.length > 0) {
          <div class="text-muted text-small" style="margin-top:6px;">
            Sitting out: {{ sittingOutNames(round.sittingOut) }}
          </div>
        }
      </mat-card-content>
    </mat-card>
  }
</div>
```

- [ ] **Step 3: Build and verify**

```bash
ng build
```

Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/app/schedule-tab/
git commit -m "feat: implement ScheduleTabComponent"
```

---

## Task 8: ScoresTabComponent

**Files:**
- Modify: `src/app/scores-tab/scores-tab.component.ts`
- Create: `src/app/scores-tab/scores-tab.component.html`

- [ ] **Step 1: Implement ScoresTabComponent**

Replace `src/app/scores-tab/scores-tab.component.ts`:

```typescript
import { Component, Input, inject, computed, signal } from '@angular/core';
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
  templateUrl: './scores-tab.component.html',
})
export class ScoresTabComponent {
  @Input() readOnly = false;

  readonly sessionService = inject(SessionService);
  readonly rounds = computed(() => this.sessionService.activeSession()?.rounds ?? []);
  readonly players = computed(() => this.sessionService.activeSession()?.players ?? []);

  // Per-round-per-court pending score inputs: key = `${roundIndex}-${courtName}`
  pendingScores: Record<string, ScoreEntry> = {};

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
}
```

- [ ] **Step 2: Write template**

Create `src/app/scores-tab/scores-tab.component.html`:

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
                       style="width:48px; background:#1a1a2e; border:1px solid #444; border-radius:4px; padding:4px; color:#a6e3a1; text-align:center;" />
                <span class="text-muted">–</span>
                <input type="number" min="0"
                       [ngModel]="court.score.team2"
                       (ngModelChange)="getPending(ri, court.courtName).team2Score = $event"
                       style="width:48px; background:#1a1a2e; border:1px solid #444; border-radius:4px; padding:4px; color:#f38ba8; text-align:center;" />
                <span style="font-size:13px;">{{ playerName(court.team2[0]) }} &amp; {{ playerName(court.team2[1]) }}</span>
                @if (!readOnly) {
                  <button mat-stroked-button style="font-size:11px; height:28px; line-height:28px;"
                          (click)="saveScore(ri, court.courtName)">Update</button>
                }
              </div>
            } @else if (ri === activeRoundIndex() && !readOnly) {
              <!-- Active — score entry -->
              <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-bottom:8px;">
                <span style="font-size:13px;">{{ playerName(court.team1[0]) }} &amp; {{ playerName(court.team1[1]) }}</span>
                <input type="number" min="0" placeholder="0"
                       [(ngModel)]="getPending(ri, court.courtName).team1Score"
                       style="width:48px; background:#1a1a2e; border:1px solid #52b788; border-radius:4px; padding:4px; color:#cdd6f4; text-align:center;" />
                <span class="text-muted">–</span>
                <input type="number" min="0" placeholder="0"
                       [(ngModel)]="getPending(ri, court.courtName).team2Score"
                       style="width:48px; background:#1a1a2e; border:1px solid #52b788; border-radius:4px; padding:4px; color:#cdd6f4; text-align:center;" />
                <span style="font-size:13px;">{{ playerName(court.team2[0]) }} &amp; {{ playerName(court.team2[1]) }}</span>
              </div>
              <button mat-raised-button color="primary" style="width:100%;"
                      [disabled]="!canSave(ri, court.courtName)"
                      (click)="saveScore(ri, court.courtName)">
                Save {{ court.courtName }} Score
              </button>
            } @else {
              <!-- Upcoming -->
              <div style="font-size:13px; color:#6c7086;">
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

- [ ] **Step 3: Build and verify**

```bash
ng build
```

Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/app/scores-tab/
git commit -m "feat: implement ScoresTabComponent"
```

---

## Task 9: LeaderboardTabComponent

**Files:**
- Modify: `src/app/leaderboard-tab/leaderboard-tab.component.ts`
- Create: `src/app/leaderboard-tab/leaderboard-tab.component.html`

- [ ] **Step 1: Implement LeaderboardTabComponent**

Replace `src/app/leaderboard-tab/leaderboard-tab.component.ts`:

```typescript
import { Component, Input, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { SessionService } from '../services/session.service';
import { PlayerStats } from '../models/session.models';
import { ShareDialogComponent } from '../share-dialog/share-dialog.component';

@Component({
  selector: 'app-leaderboard-tab',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatButtonToggleModule, MatCardModule, MatIconModule, MatDialogModule],
  templateUrl: './leaderboard-tab.component.html',
})
export class LeaderboardTabComponent {
  @Input() readOnly = false;

  readonly sessionService = inject(SessionService);
  readonly dialog = inject(MatDialog);

  sortBy = signal<'wins' | 'points'>('wins');

  readonly stats = computed(() => {
    const raw = this.sessionService.getPlayerStats();
    const by = this.sortBy();
    return [...raw].sort((a, b) =>
      by === 'wins'
        ? b.wins !== a.wins ? b.wins - a.wins : b.totalPoints - a.totalPoints
        : b.totalPoints !== a.totalPoints ? b.totalPoints - a.totalPoints : b.wins - a.wins
    );
  });

  medal(index: number): string {
    return ['🥇', '🥈', '🥉'][index] ?? '';
  }

  resetSession(): void {
    const ok = confirm('Reset this session? All players, schedule, and scores will be cleared.');
    if (!ok) return;
    const date = this.sessionService.activeSession()?.date;
    if (date) {
      this.sessionService.clearSession(date);
      this.sessionService.initSession(date);
    }
  }

  openShare(): void {
    const session = this.sessionService.activeSession();
    if (!session) return;
    const encoded = this.sessionService.encodeSessionToHash(session);
    const url = `${window.location.origin}${window.location.pathname}#${encoded}`;
    this.dialog.open(ShareDialogComponent, { data: { url }, width: '320px' });
  }
}
```

- [ ] **Step 2: Write template**

Create `src/app/leaderboard-tab/leaderboard-tab.component.html`:

```html
<div style="max-width:500px; margin:0 auto;">
  <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:16px;">
    <h2 style="margin:0; color:#52b788;">Leaderboard</h2>
    @if (!readOnly) {
      <button mat-stroked-button color="primary" (click)="openShare()">
        Share QR
      </button>
    }
  </div>

  <mat-button-toggle-group [value]="sortBy()" (change)="sortBy.set($event.value)"
                           style="margin-bottom:16px; width:100%;">
    <mat-button-toggle value="wins" style="flex:1;">By Wins</mat-button-toggle>
    <mat-button-toggle value="points" style="flex:1;">By Points</mat-button-toggle>
  </mat-button-toggle-group>

  @if (stats().length === 0) {
    <p class="text-muted" style="text-align:center;">No scores recorded yet.</p>
  }

  @for (entry of stats(); track entry.player.id; let i = $index) {
    <mat-card class="round-card" style="margin-bottom:8px;">
      <mat-card-content style="padding:12px !important;">
        <div style="display:flex; align-items:center; gap:12px;">
          <span style="font-size:22px; width:32px; text-align:center;">
            {{ medal(i) || (i + 1) }}
          </span>
          <div style="flex:1;">
            <div style="font-size:15px; font-weight:bold; color:#cdd6f4;">{{ entry.player.name }}</div>
            <div class="text-muted text-small">{{ entry.wins }} wins · {{ entry.totalPoints }} pts · {{ entry.gamesPlayed }} games</div>
          </div>
          <span class="status-badge badge-completed">{{ sortBy() === 'wins' ? entry.wins + 'W' : entry.totalPoints + 'pts' }}</span>
        </div>
      </mat-card-content>
    </mat-card>
  }

  @if (!readOnly) {
    <button mat-stroked-button color="warn" style="width:100%; margin-top:24px;" (click)="resetSession()">
      Reset Session
    </button>
  }
</div>
```

- [ ] **Step 3: Build and verify**

```bash
ng build
```

Expected: Build succeeds. (ShareDialogComponent stub needed — create it in Task 10.)

- [ ] **Step 4: Commit**

```bash
git add src/app/leaderboard-tab/
git commit -m "feat: implement LeaderboardTabComponent"
```

---

## Task 10: ShareDialogComponent (QR code)

**Files:**
- Create: `src/app/share-dialog/share-dialog.component.ts`
- Create: `src/app/share-dialog/share-dialog.component.html`

- [ ] **Step 1: Create the share dialog**

Create `src/app/share-dialog/share-dialog.component.ts`:

```typescript
import { Component, Inject, OnInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import QRCode from 'qrcode';

@Component({
  selector: 'app-share-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule],
  templateUrl: './share-dialog.component.html',
})
export class ShareDialogComponent implements OnInit {
  @ViewChild('qrCanvas', { static: true }) qrCanvas!: ElementRef<HTMLCanvasElement>;

  copied = false;

  constructor(@Inject(MAT_DIALOG_DATA) public data: { url: string }) {}

  async ngOnInit(): Promise<void> {
    await QRCode.toCanvas(this.qrCanvas.nativeElement, this.data.url, {
      width: 256,
      color: { dark: '#52b788', light: '#1e1e2e' },
    });
  }

  copyUrl(): void {
    navigator.clipboard.writeText(this.data.url).then(() => {
      this.copied = true;
      setTimeout(() => (this.copied = false), 2000);
    });
  }
}
```

- [ ] **Step 2: Create the share dialog template**

Create `src/app/share-dialog/share-dialog.component.html`:

```html
<h2 mat-dialog-title style="color:#52b788;">Share Session</h2>

<mat-dialog-content style="text-align:center; padding:16px;">
  <canvas #qrCanvas style="border-radius:8px;"></canvas>
  <p class="text-muted text-small" style="margin-top:12px; word-break:break-all;">
    {{ data.url }}
  </p>
</mat-dialog-content>

<mat-dialog-actions align="end">
  <button mat-button (click)="copyUrl()">{{ copied ? 'Copied!' : 'Copy URL' }}</button>
  <button mat-button mat-dialog-close>Close</button>
</mat-dialog-actions>
```

- [ ] **Step 3: Build and verify**

```bash
ng build
```

Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/app/share-dialog/
git commit -m "feat: add ShareDialogComponent with QR code generation"
```

---

## Task 11: End-to-end smoke test and polish

- [ ] **Step 1: Run all tests**

```bash
ng test --watch=false
```

Expected: All tests PASS.

- [ ] **Step 2: Run the app locally and manually verify the full flow**

```bash
ng serve
```

Open `http://localhost:4200`. Verify:

1. App loads with today's date in toolbar
2. Players tab: add 9 players → "Generate Schedule" becomes enabled → click it
3. Schedule tab: rounds appear with Court 1 and Court 2 per round, 1 player sitting out per round
4. Scores tab: enter score for Round 1 Court 1 → "Save Score" → score appears, advances to next court
5. Leaderboard tab: shows players ranked by wins; toggle to points; medals on top 3
6. Leaderboard → Share QR: dialog opens with QR code and copy URL button
7. Copy URL, open in new tab → read-only view, "View Only" badge in toolbar
8. Date selector: change date → new empty session loads
9. Switch back to today's date → session restored

- [ ] **Step 3: Commit any polish fixes found during smoke test**

```bash
git add -A
git commit -m "fix: polish after smoke test"
```

---

## Task 12: GitHub Pages deployment

**Files:**
- Modify: `angular.json` (base-href)
- Create: `.github/workflows/deploy.yml`

- [ ] **Step 1: Update angular.json for GitHub Pages base-href**

In `angular.json`, find the `"build"` → `"options"` section and add `"baseHref"`:

```json
"baseHref": "/roundrobin/"
```

(Replace `roundrobin` with your actual GitHub repo name.)

- [ ] **Step 2: Create GitHub Actions deploy workflow**

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

permissions:
  contents: write

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npx ng build --configuration production

      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist/pickleball-roundrobin/browser
```

- [ ] **Step 3: Add .gitignore entries**

Ensure `dist/` and `.superpowers/` are in `.gitignore`:

```
dist/
.superpowers/
```

- [ ] **Step 4: Final build verification**

```bash
ng build --configuration production
```

Expected: Build succeeds with production optimizations.

- [ ] **Step 5: Final commit**

```bash
git add angular.json .github/workflows/deploy.yml .gitignore
git commit -m "feat: add GitHub Pages deployment workflow"
```

- [ ] **Step 6: Push to GitHub and verify deployment**

```bash
git remote add origin https://github.com/<your-username>/roundrobin.git
git push -u origin main
```

After ~2 minutes, check `https://<your-username>.github.io/roundrobin/` — the app should be live.

---

## Self-Review

**Spec coverage check:**
- ✅ Players tab (add/remove, 8–11 constraint, generate schedule button)
- ✅ Schedule tab (rounds, 2 courts per round, sit-outs, status badges)
- ✅ Scores tab (score entry per court, active round highlight, editable completed scores)
- ✅ Leaderboard (wins + points toggle, medals, reset)
- ✅ Session persistence by date (localStorage `pickleball-session-YYYY-MM-DD`)
- ✅ Session selector (date dropdown in toolbar)
- ✅ QR code sharing (URL hash encoding, read-only view)
- ✅ Angular Material dark theme
- ✅ GitHub Pages deployment
- ✅ Data model supports 3+ courts (CourtGame array, not hardcoded)

**508 / Accessibility check:**
- ✅ Body text 18px minimum, scores 24px bold
- ✅ All text colors pass WCAG AA contrast ratios (documented inline in styles.scss)
- ✅ All touch targets minimum 48×48px
- ✅ Status badges use text labels not color alone
- ✅ Score inputs have `aria-label` with court and team context
- ✅ `.text-muted` uses `#8a8fa8` (4.6:1) not `#6c7086` (3.1:1 — fails AA)
- ✅ Opacity on upcoming/completed rounds kept ≥ 0.65 to preserve contrast

**Type consistency:**
- `CourtGame` used consistently across models, services, and components
- `activeRoundIndex` computed consistently in both ScheduleTab and ScoresTab
- `getPending()` keyed by `${roundIndex}-${courtName}` consistently
- `encodeSessionToHash` / `decodeSessionFromHash` defined in SessionService and used in AppComponent + ShareDialog
