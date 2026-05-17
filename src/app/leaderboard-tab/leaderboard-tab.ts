import { Component, Input, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { SessionService } from '../services/session.service';
import { ShareDialog } from '../share-dialog/share-dialog';

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

  resetSession(): void {
    const ok = confirm('Reset this session? All players, schedule, and scores will be cleared.');
    if (!ok) return;
    const session = this.sessionService.activeSession();
    if (session) {
      this.sessionService.clearSession(session.date, session.sessionNumber);
      this.sessionService.initSession(session.date, session.sessionNumber);
    }
  }

  openShare(): void {
    const session = this.sessionService.activeSession();
    if (!session) return;
    const encoded = this.sessionService.encodeSessionToHash(session);
    const url = `${window.location.origin}${window.location.pathname}#${encoded}`;
    this.dialog.open(ShareDialog, { data: { url }, width: '320px' });
  }
}
