import { Component, Input, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { SessionService } from '../services/session.service';
import { ShareDialog } from '../share-dialog/share-dialog';
import { ConfirmDialog, ConfirmDialogData } from '../confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-leaderboard-tab',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatButtonToggleModule, MatCardModule, MatDialogModule, TranslateModule],
  templateUrl: './leaderboard-tab.html',
})
export class LeaderboardTab {
  @Input() readOnly = false;

  private readonly sessionService = inject(SessionService);
  private readonly dialog = inject(MatDialog);
  private readonly translate = inject(TranslateService);

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
        title: this.translate.instant('leaderboard.reset_confirm_title'),
        message: this.translate.instant('leaderboard.reset_confirm_message'),
        actions: [{ label: this.translate.instant('leaderboard.reset_action'), value: 'all', color: 'warn' }],
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
