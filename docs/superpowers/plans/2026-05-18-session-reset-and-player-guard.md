# Session Reset & Player Deletion Guard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix issues #11 and #14 — add selective session reset (rounds only vs. everything), delete session from drawer, and lock player deletion once a schedule is generated.

**Architecture:** A shared `ConfirmDialog` component handles all destructive confirmations. `SessionService` gets two new reset methods. "Regenerate Schedule" moves to the Schedule tab; "Reset Session" stays on Leaderboard as a single-option confirm. Delete Session lives as a trash icon in `SessionDrawer`. Player deletion is disabled (not hidden) when rounds exist.

**Tech Stack:** Angular 20 standalone components, Angular Material `MatDialog`, `MatSnackBar`, `MatTooltip`, signals.

**Spec:** `docs/superpowers/specs/2026-05-17-session-reset-and-player-guard-design.md`

---

### Task 1: Add `resetRoundsAndScores()` and `resetEverything()` to SessionService

**Files:**
- Modify: `src/app/services/session.service.ts`
- Modify: `src/app/services/session.service.spec.ts`

- [ ] **Step 1: Write the failing tests**

Add to `src/app/services/session.service.spec.ts` inside the `describe('SessionService')` block, after the existing `migrateOldKeys()` describe:

```ts
describe('resetRoundsAndScores()', () => {
  it('clears rounds but preserves players', () => {
    service.initSession('2026-05-04', 1);
    service.addPlayer('Alice');
    service.addPlayer('Bob');
    service.setRounds([{
      roundNumber: 1,
      courts: [{ courtName: 'Court 1', team1: ['a', 'b'], team2: ['c', 'd'] }],
      sittingOut: [],
    }]);
    service.resetRoundsAndScores('2026-05-04', 1);
    expect(service.activeSession()!.rounds).toEqual([]);
    expect(service.activeSession()!.players.length).toBe(2);
  });

  it('updates active session signal', () => {
    service.initSession('2026-05-04', 1);
    service.setRounds([{
      roundNumber: 1,
      courts: [{ courtName: 'Court 1', team1: ['a', 'b'], team2: ['c', 'd'] }],
      sittingOut: [],
    }]);
    service.resetRoundsAndScores('2026-05-04', 1);
    expect(service.activeSession()!.rounds.length).toBe(0);
  });

  it('persists to localStorage', () => {
    service.initSession('2026-05-04', 1);
    service.setRounds([{
      roundNumber: 1,
      courts: [{ courtName: 'Court 1', team1: ['a', 'b'], team2: ['c', 'd'] }],
      sittingOut: [],
    }]);
    service.resetRoundsAndScores('2026-05-04', 1);
    const saved = service.loadSession('2026-05-04', 1);
    expect(saved!.rounds).toEqual([]);
  });
});

describe('resetEverything()', () => {
  it('clears both players and rounds', () => {
    service.initSession('2026-05-04', 1);
    service.addPlayer('Alice');
    service.setRounds([{
      roundNumber: 1,
      courts: [{ courtName: 'Court 1', team1: ['a', 'b'], team2: ['c', 'd'] }],
      sittingOut: [],
    }]);
    service.resetEverything('2026-05-04', 1);
    expect(service.activeSession()!.players).toEqual([]);
    expect(service.activeSession()!.rounds).toEqual([]);
  });

  it('keeps the session in localStorage (does not delete the key)', () => {
    service.initSession('2026-05-04', 1);
    service.addPlayer('Alice');
    service.resetEverything('2026-05-04', 1);
    expect(service.loadSession('2026-05-04', 1)).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx ng test --include="src/app/services/session.service.spec.ts" --watch=false
```

Expected: FAIL — `service.resetRoundsAndScores is not a function`, `service.resetEverything is not a function`

- [ ] **Step 3: Implement the two new methods in `session.service.ts`**

Add after the `clearSession()` method (line 43):

```ts
resetRoundsAndScores(date: string, sessionNumber: number): void {
  this.update(s => ({ ...s, rounds: [] }));
}

resetEverything(date: string, sessionNumber: number): void {
  this.update(s => ({ ...s, players: [], rounds: [] }));
}
```

Note: `update()` already reads `_activeSession()`, updates the signal, and saves to localStorage — no extra work needed.

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx ng test --include="src/app/services/session.service.spec.ts" --watch=false
```

Expected: All tests pass (26 existing + 5 new = 31 total)

- [ ] **Step 5: Commit**

```bash
git add src/app/services/session.service.ts src/app/services/session.service.spec.ts
git commit -m "feat(service): add resetRoundsAndScores and resetEverything methods"
```

---

### Task 2: Create shared `ConfirmDialog` component

**Files:**
- Create: `src/app/confirm-dialog/confirm-dialog.ts`
- Create: `src/app/confirm-dialog/confirm-dialog.html`

- [ ] **Step 1: Create `src/app/confirm-dialog/confirm-dialog.ts`**

```ts
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

export interface ConfirmDialogData {
  title: string;
  message: string;
  actions: { label: string; value: string; color?: 'primary' | 'warn' }[];
}

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatDialogModule],
  templateUrl: './confirm-dialog.html',
})
export class ConfirmDialog {
  readonly data = inject<ConfirmDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<ConfirmDialog>);

  confirm(value: string): void {
    this.dialogRef.close(value);
  }

  cancel(): void {
    this.dialogRef.close(undefined);
  }
}
```

- [ ] **Step 2: Create `src/app/confirm-dialog/confirm-dialog.html`**

```html
<h2 mat-dialog-title>{{ data.title }}</h2>
<mat-dialog-content>
  <p style="color:#aaa; margin:0;">{{ data.message }}</p>
</mat-dialog-content>
<mat-dialog-actions align="end" style="gap:8px; padding:16px;">
  <button mat-stroked-button (click)="cancel()">Cancel</button>
  @for (action of data.actions; track action.value) {
    <button mat-raised-button [color]="action.color ?? 'primary'" (click)="confirm(action.value)">
      {{ action.label }}
    </button>
  }
</mat-dialog-actions>
```

- [ ] **Step 3: Verify the build compiles**

```bash
npx ng build --configuration=development 2>&1 | tail -5
```

Expected: `Build at: ... - Hash: ...` with no errors

- [ ] **Step 4: Commit**

```bash
git add src/app/confirm-dialog/
git commit -m "feat(confirm-dialog): add shared reusable confirmation dialog component"
```

---

### Task 3: Add "Regenerate Schedule" button to Schedule tab

**Files:**
- Modify: `src/app/schedule-tab/schedule-tab.ts`
- Modify: `src/app/schedule-tab/schedule-tab.html`

- [ ] **Step 1: Update `src/app/schedule-tab/schedule-tab.ts`**

Replace the full file with:

```ts
import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { SessionService } from '../services/session.service';
import { ConfirmDialog, ConfirmDialogData } from '../confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-schedule-tab',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatDialogModule],
  templateUrl: './schedule-tab.html',
})
export class ScheduleTab {
  readonly sessionService = inject(SessionService);
  private readonly dialog = inject(MatDialog);

  readonly rounds = computed(() => this.sessionService.activeSession()?.rounds ?? []);
  readonly players = computed(() => this.sessionService.activeSession()?.players ?? []);

  readonly activeRoundIndex = computed(() => {
    const rounds = this.rounds();
    for (let i = 0; i < rounds.length; i++) {
      const allScored = rounds[i].courts.every(c => c.score != null);
      if (!allScored) return i;
    }
    return rounds.length;
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

  openRegenerateDialog(): void {
    const ref = this.dialog.open(ConfirmDialog, {
      data: {
        title: 'Regenerate Schedule?',
        message: 'All rounds and scores will be cleared. Your player list will be kept.',
        actions: [{ label: 'Regenerate', value: 'regenerate', color: 'warn' }],
      } as ConfirmDialogData,
    });
    ref.afterClosed().subscribe(value => {
      if (value !== 'regenerate') return;
      const session = this.sessionService.activeSession();
      if (session) this.sessionService.resetRoundsAndScores(session.date, session.sessionNumber);
    });
  }
}
```

- [ ] **Step 2: Update `src/app/schedule-tab/schedule-tab.html`**

Replace the full file with:

```html
<div style="max-width:500px; margin:0 auto;">
  <h2 style="color:#52b788;">Schedule</h2>

  @if (rounds().length === 0) {
    <p class="text-muted" style="text-align:center;">
      Add 8–11 players on the Players tab and generate a schedule.
    </p>
  }

  @for (round of rounds(); track round.roundNumber; let i = $index) {
    <mat-card class="round-card" [class]="roundStatus(i)"
              [attr.aria-label]="'Round ' + round.roundNumber + ', ' + roundStatus(i)">
      <mat-card-header>
        <mat-card-title style="font-size:16px; font-weight:bold;">
          Round {{ round.roundNumber }}
        </mat-card-title>
        <span style="flex:1;"></span>
        <span class="status-badge" [class]="'badge-' + roundStatus(i)">
          {{ roundStatus(i) === 'active' ? 'NOW' : (roundStatus(i) | uppercase) }}
        </span>
      </mat-card-header>

      <mat-card-content style="margin-top:12px;">
        @for (court of round.courts; track court.courtName) {
          <div style="margin-bottom:10px;">
            <div class="text-muted text-small" style="margin-bottom:4px; font-weight:bold;">
              {{ court.courtName }}
            </div>
            <div style="display:flex; align-items:center; gap:8px; font-size:16px; flex-wrap:wrap;">
              <span>{{ playerName(court.team1[0]) }} &amp; {{ playerName(court.team1[1]) }}</span>
              @if (court.score) {
                <span class="score-display">
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

  @if (rounds().length > 0) {
    <button mat-stroked-button color="warn" style="width:100%; margin-top:16px;"
            (click)="openRegenerateDialog()">
      Regenerate Schedule
    </button>
  }
</div>
```

- [ ] **Step 3: Run unit tests**

```bash
npx ng test --watch=false
```

Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add src/app/schedule-tab/schedule-tab.ts src/app/schedule-tab/schedule-tab.html
git commit -m "feat(schedule-tab): add Regenerate Schedule button with confirm dialog"
```

---

### Task 4: Replace Reset button on Leaderboard tab with `ConfirmDialog`

**Files:**
- Modify: `src/app/leaderboard-tab/leaderboard-tab.ts`
- Modify: `src/app/leaderboard-tab/leaderboard-tab.html`

- [ ] **Step 1: Update `src/app/leaderboard-tab/leaderboard-tab.ts`**

Replace the full file:

```ts
import { Component, Input, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { SessionService } from '../services/session.service';
import { ShareDialog } from '../share-dialog/share-dialog';
import { ConfirmDialog, ConfirmDialogData } from '../confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-leaderboard-tab',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatButtonToggleModule, MatCardModule, MatDialogModule],
  templateUrl: './leaderboard-tab.html',
})
export class LeaderboardTab {
  @Input() readOnly = false;

  private readonly sessionService = inject(SessionService);
  private readonly dialog = inject(MatDialog);

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

  readonly hasScores = computed(() =>
    this.sessionService.getPlayerStats().some(s => s.gamesPlayed > 0)
  );

  medal(index: number): string {
    return ['🥇', '🥈', '🥉'][index] ?? '';
  }

  openResetDialog(): void {
    const ref = this.dialog.open(ConfirmDialog, {
      data: {
        title: 'Reset Session?',
        message: 'All players, rounds, and scores will be cleared.',
        actions: [{ label: 'Reset', value: 'all', color: 'warn' }],
      } as ConfirmDialogData,
    });
    ref.afterClosed().subscribe(value => {
      if (value !== 'all') return;
      const session = this.sessionService.activeSession();
      if (session) this.sessionService.resetEverything(session.date, session.sessionNumber);
    });
  }

  openShare(): void {
    const session = this.sessionService.activeSession();
    if (!session) return;
    const encoded = this.sessionService.encodeSessionToHash(session);
    const url = `${window.location.origin}${window.location.pathname}#${encoded}`;
    this.dialog.open(ShareDialog, { data: { url }, width: '320px' });
  }
}
```

- [ ] **Step 2: Update `src/app/leaderboard-tab/leaderboard-tab.html`**

Change only the Reset button line (line 43) — replace `(click)="resetSession()"` with `(click)="openResetDialog()"`:

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
                           aria-label="Sort leaderboard by"
                           style="margin-bottom:16px; width:100%;">
    <mat-button-toggle value="wins" style="flex:1;">Wins</mat-button-toggle>
    <mat-button-toggle value="points" style="flex:1;">Points</mat-button-toggle>
  </mat-button-toggle-group>

  @if (!hasScores()) {
    <p class="text-muted" style="text-align:center;">No scores recorded yet.</p>
  } @else {
    @for (entry of stats(); track entry.player.id; let i = $index) {
      <mat-card class="round-card" style="margin-bottom:8px;" role="row"
                [attr.aria-label]="'Rank ' + (i+1) + ': ' + entry.player.name + ', ' + entry.wins + ' wins, ' + entry.totalPoints + ' points'">
        <mat-card-content style="padding:12px !important;">
          <div style="display:flex; align-items:center; gap:12px;">
            <span style="font-size:22px; width:32px; text-align:center;" aria-hidden="true">
              {{ medal(i) || (i + 1) }}
            </span>
            <div style="flex:1;">
              <div class="player-name">{{ entry.player.name }}</div>
              <div class="player-stat text-muted">{{ entry.wins }} wins · {{ entry.totalPoints }} pts · {{ entry.gamesPlayed }} games</div>
            </div>
            <span class="status-badge badge-completed">
              {{ sortBy() === 'wins' ? entry.wins + 'W' : entry.totalPoints + 'pts' }}
            </span>
          </div>
        </mat-card-content>
      </mat-card>
    }
  }

  @if (!readOnly) {
    <button mat-stroked-button color="warn" style="width:100%; margin-top:24px;" (click)="openResetDialog()">
      Reset Session
    </button>
  }
</div>
```

- [ ] **Step 3: Run unit tests**

```bash
npx ng test --watch=false
```

Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add src/app/leaderboard-tab/leaderboard-tab.ts src/app/leaderboard-tab/leaderboard-tab.html
git commit -m "feat(leaderboard-tab): replace window.confirm with MatDialog for Reset Session"
```

---

### Task 5: Add Delete Session to `SessionDrawer`

**Files:**
- Modify: `src/app/session-drawer/session-drawer.ts`
- Modify: `src/app/session-drawer/session-drawer.html`
- Modify: `src/app/app.ts`

- [ ] **Step 1: Update `SessionDrawerResult` and `session-drawer.ts`**

Replace the full file `src/app/session-drawer/session-drawer.ts`:

```ts
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatBottomSheetRef, MAT_BOTTOM_SHEET_DATA } from '@angular/material/bottom-sheet';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { SessionService } from '../services/session.service';
import { ConfirmDialog, ConfirmDialogData } from '../confirm-dialog/confirm-dialog';

export interface SessionDrawerData {
  currentDate: string;
  currentSessionNumber: number;
}

export interface SessionDrawerResult {
  date: string;
  sessionNumber: number;
  deleted?: boolean;
}

@Component({
  selector: 'app-session-drawer',
  standalone: true,
  imports: [FormsModule, MatButtonModule, MatIconModule, MatDialogModule],
  templateUrl: './session-drawer.html',
})
export class SessionDrawer {
  private readonly sheetRef = inject(MatBottomSheetRef<SessionDrawer, SessionDrawerResult>);
  private readonly sessionService = inject(SessionService);
  private readonly dialog = inject(MatDialog);
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
    this.sheetRef.dismiss({ date, sessionNumber });
  }

  isCurrentSession(n: number): boolean {
    return n === this.data.currentSessionNumber && this.selectedDate() === this.data.currentDate;
  }

  openDeleteDialog(sessionNumber: number): void {
    const ref = this.dialog.open(ConfirmDialog, {
      data: {
        title: `Delete Session ${sessionNumber}?`,
        message: 'All players, rounds, and scores will be permanently removed.',
        actions: [{ label: 'Delete', value: 'delete', color: 'warn' }],
      } as ConfirmDialogData,
    });
    ref.afterClosed().subscribe(value => {
      if (value !== 'delete') return;
      this.sessionService.clearSession(this.selectedDate(), sessionNumber);
      this.sheetRef.dismiss({
        date: this.selectedDate(),
        sessionNumber,
        deleted: true,
      });
    });
  }
}
```

- [ ] **Step 2: Update `src/app/session-drawer/session-drawer.html`**

Replace the full file — adds a trash icon button to each session row:

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
      <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
        <button
          mat-stroked-button
          (click)="selectSession(n)"
          style="flex:1;"
          [style.background]="isCurrentSession(n) ? '#52b788' : 'transparent'"
          [style.color]="isCurrentSession(n) ? '#1a1a2e' : '#e0e0e0'"
          [style.border-color]="isCurrentSession(n) ? '#52b788' : '#444'"
        >
          Session {{ n }}
          @if (isCurrentSession(n)) {
            <span style="margin-left:8px; font-size:11px; opacity:0.8;">✓ active</span>
          }
        </button>
        <button mat-icon-button color="warn" (click)="openDeleteDialog(n)"
                [attr.aria-label]="'Delete session ' + n">
          <mat-icon>delete</mat-icon>
        </button>
      </div>
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

- [ ] **Step 3: Update `src/app/app.ts` to handle `deleted: true` result**

Replace the `openSessionDrawer()` method and add `onSessionDeleted()`:

```ts
openSessionDrawer(): void {
  const ref = this.bottomSheet.open(SessionDrawer, {
    data: {
      currentDate: this.selectedDate(),
      currentSessionNumber: this.selectedSessionNumber(),
    } as SessionDrawerData,
  });
  ref.afterDismissed().subscribe((result?: SessionDrawerResult) => {
    if (!result) return;
    if (result.deleted) {
      this.onSessionDeleted(result.date, result.sessionNumber);
    } else {
      this.onSessionChange(result.date, result.sessionNumber);
    }
  });
}

onSessionDeleted(date: string, deletedNumber: number): void {
  const remaining = this.sessionService.getSavedSessionsForDate(date);
  const next = remaining.length > 0 ? remaining[0] : 1;
  if (remaining.length === 0) {
    this.sessionService.initSession(date, 1);
  }
  this.onSessionChange(date, next);
}
```

- [ ] **Step 4: Run unit tests**

```bash
npx ng test --watch=false
```

Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add src/app/session-drawer/session-drawer.ts src/app/session-drawer/session-drawer.html src/app/app.ts
git commit -m "feat(session-drawer): add delete session button with confirm dialog"
```

---

### Task 6: Lock player deletion when schedule is generated

**Files:**
- Modify: `src/app/players-tab/players-tab.ts`
- Modify: `src/app/players-tab/players-tab.html`

- [ ] **Step 1: Update `src/app/players-tab/players-tab.ts`**

Add `MatTooltipModule`, `MatSnackBar` imports and `scheduleGenerated` signal. Replace the full file:

```ts
import { Component, Input, signal, inject, computed, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SessionService } from '../services/session.service';
import { ScheduleService } from '../services/schedule.service';

@Component({
  selector: 'app-players-tab',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatInputModule, MatButtonModule, MatIconModule, MatListModule, MatTooltipModule,
  ],
  templateUrl: './players-tab.html',
})
export class PlayersTab {
  @Input() readOnly = false;

  readonly sessionService = inject(SessionService);
  readonly scheduleService = inject(ScheduleService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly snackBar = inject(MatSnackBar);

  newName = signal('');

  readonly players = computed(() => this.sessionService.activeSession()?.players ?? []);
  readonly canAdd = computed(() => this.players().length < 11 && this.newName().trim().length > 0);
  readonly canGenerate = computed(() => this.players().length >= 8);
  readonly scheduleGenerated = computed(() =>
    (this.sessionService.activeSession()?.rounds.length ?? 0) > 0
  );

  addPlayer(): void {
    if (!this.canAdd()) return;
    this.sessionService.addPlayer(this.newName());
    this.newName.set('');
    this.cdr.detectChanges();
  }

  removePlayer(id: string): void {
    if (this.scheduleGenerated()) {
      this.snackBar.open('Roster is locked. Regenerate the schedule first.', 'OK', { duration: 3000 });
      return;
    }
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

  onKeydown(event: KeyboardEvent, inputEl?: HTMLInputElement): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.addPlayer();
      if (inputEl) inputEl.value = '';
    }
  }
}
```

- [ ] **Step 2: Update `src/app/players-tab/players-tab.html`**

Add `[disabled]` and `matTooltip` to the delete button. Replace the full file:

```html
<div style="max-width:500px; margin:0 auto;">

  <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:16px;">
    <h2 style="margin:0; color:#52b788;">Players</h2>
    <span class="status-badge" [class]="players().length >= 8 ? 'badge-completed' : 'badge-upcoming'">
      {{ players().length }} / 11
    </span>
  </div>

  @if (!readOnly) {
    <div style="display:flex; gap:8px; margin-bottom:16px; align-items:flex-start;">
      <mat-form-field appearance="outline" style="flex:1;">
        <mat-label>Player name</mat-label>
        <input #nameInput matInput [ngModel]="newName()" (ngModelChange)="newName.set($event)" (keydown)="onKeydown($event, nameInput)" maxlength="30" />
      </mat-form-field>
      <button mat-raised-button color="primary" (click)="addPlayer()" [disabled]="!canAdd()"
              style="margin-top:4px;">
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
        <span matListItemTitle style="font-size:18px;">{{ i + 1 }}. {{ player.name }}</span>
        @if (!readOnly) {
          <button matListItemMeta mat-icon-button color="warn" (click)="removePlayer(player.id)"
                  [disabled]="scheduleGenerated()"
                  [matTooltip]="scheduleGenerated() ? 'Cannot remove players after the schedule has been generated. Use Regenerate Schedule on the Schedule tab to start over.' : ''"
                  [attr.aria-label]="'Remove ' + player.name">
            <mat-icon>close</mat-icon>
          </button>
        }
      </mat-list-item>
    }
  </mat-list>

  @if (!readOnly && canGenerate()) {
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

- [ ] **Step 3: Run unit tests**

```bash
npx ng test --watch=false
```

Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add src/app/players-tab/players-tab.ts src/app/players-tab/players-tab.html
git commit -m "feat(players-tab): disable player deletion when schedule is generated"
```

---

### Task 7: E2E tests

**Files:**
- Create: `tests/reset/reset-session.spec.ts`

- [ ] **Step 1: Create `tests/reset/reset-session.spec.ts`**

```ts
import { test, expect } from '@playwright/test';
import { freshState, addPlayers, goToSchedule, goToPlayers, goToLeaderboard, EIGHT_PLAYERS } from '../helpers';

test.describe('Session Reset & Player Guard', () => {

  test('7.1 Regenerate Schedule clears rounds and scores but keeps players', async ({ page }) => {
    await freshState(page);
    await addPlayers(page, EIGHT_PLAYERS);
    await goToSchedule(page);
    await page.getByRole('button', { name: /Generate Schedule/i }).click();
    await expect(page.getByText('Round 1')).toBeVisible();

    await page.getByRole('button', { name: /Regenerate Schedule/i }).click();
    await page.getByRole('button', { name: 'Regenerate' }).click();

    await expect(page.getByText('Round 1')).not.toBeVisible();
    await goToPlayers(page);
    await expect(page.getByText('Alice')).toBeVisible();
  });

  test('7.2 Cancel Regenerate Schedule keeps data intact', async ({ page }) => {
    await freshState(page);
    await addPlayers(page, EIGHT_PLAYERS);
    await goToSchedule(page);
    await page.getByRole('button', { name: /Generate Schedule/i }).click();
    await expect(page.getByText('Round 1')).toBeVisible();

    await page.getByRole('button', { name: /Regenerate Schedule/i }).click();
    await page.getByRole('button', { name: 'Cancel' }).click();

    await expect(page.getByText('Round 1')).toBeVisible();
  });

  test('7.3 Reset Session clears players and rounds', async ({ page }) => {
    await freshState(page);
    await addPlayers(page, EIGHT_PLAYERS);
    await goToLeaderboard(page);

    await page.getByRole('button', { name: /Reset Session/i }).click();
    await page.getByRole('button', { name: 'Reset' }).click();

    await goToPlayers(page);
    await expect(page.getByText('Alice')).not.toBeVisible();
    await expect(page.getByText('Add 8–11 players to get started')).toBeVisible();
  });

  test('7.4 Cancel Reset Session keeps data intact', async ({ page }) => {
    await freshState(page);
    await addPlayers(page, EIGHT_PLAYERS);
    await goToLeaderboard(page);

    await page.getByRole('button', { name: /Reset Session/i }).click();
    await page.getByRole('button', { name: 'Cancel' }).click();

    await goToPlayers(page);
    await expect(page.getByText('Alice')).toBeVisible();
  });

  test('7.5 Delete player button is disabled after schedule is generated', async ({ page }) => {
    await freshState(page);
    await addPlayers(page, EIGHT_PLAYERS);
    await goToSchedule(page);
    await page.getByRole('button', { name: /Generate Schedule/i }).click();

    await goToPlayers(page);
    const deleteBtn = page.getByRole('button', { name: 'Remove Alice' });
    await expect(deleteBtn).toBeDisabled();
  });

  test('7.6 Delete player button is enabled before schedule is generated', async ({ page }) => {
    await freshState(page);
    await addPlayers(page, EIGHT_PLAYERS);

    const deleteBtn = page.getByRole('button', { name: 'Remove Alice' });
    await expect(deleteBtn).toBeEnabled();
  });

  test('7.7 Delete session from drawer navigates to remaining session', async ({ page }) => {
    await freshState(page);
    // Create session 2
    await page.getByRole('button', { name: /📅/ }).click();
    await page.getByRole('button', { name: /\+ New Session/i }).click();
    // Now on session 2 — delete it via drawer
    await page.getByRole('button', { name: /📅/ }).click();
    await page.getByRole('button', { name: /Delete session 2/i }).click();
    await page.getByRole('button', { name: 'Delete' }).click();
    // Should land back on session 1
    await expect(page.getByRole('button', { name: /📅/ })).toContainText('1');
  });

  test('7.8 Delete last session auto-creates fresh session 1', async ({ page }) => {
    await freshState(page);
    await page.getByRole('button', { name: /📅/ }).click();
    await page.getByRole('button', { name: /Delete session 1/i }).click();
    await page.getByRole('button', { name: 'Delete' }).click();
    // Session 1 should be auto-created
    await expect(page.getByRole('button', { name: /📅/ })).toContainText('1');
    await goToPlayers(page);
    await expect(page.getByText('Add 8–11 players to get started')).toBeVisible();
  });
});
```

- [ ] **Step 2: Verify helpers exist**

```bash
grep -n "export async function" tests/helpers.ts
```

Expected output includes: `freshState`, `addPlayers`, `goToPlayers`, `goToSchedule`, `goToLeaderboard`, `EIGHT_PLAYERS`

- [ ] **Step 3: Run E2E tests**

```bash
npx playwright test tests/reset/reset-session.spec.ts --project=chromium
```

Expected: All 8 tests pass

- [ ] **Step 4: Run full test suite**

```bash
npx ng test --watch=false && npx playwright test --project=chromium
```

Expected: All unit tests and E2E tests pass

- [ ] **Step 5: Commit**

```bash
git add tests/reset/reset-session.spec.ts
git commit -m "test(e2e): add reset session and player guard E2E tests"
```
