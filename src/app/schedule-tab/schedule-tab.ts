import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { SessionService } from '../services/session.service';
import { ConfirmDialog, ConfirmDialogData } from '../confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-schedule-tab',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatDialogModule, TranslateModule],
  templateUrl: './schedule-tab.html',
})
export class ScheduleTab {
  readonly sessionService = inject(SessionService);
  private readonly dialog = inject(MatDialog);
  private readonly translate = inject(TranslateService);

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
        title: this.translate.instant('schedule.regenerate_confirm_title'),
        message: this.translate.instant('schedule.regenerate_confirm_message'),
        actions: [{ label: this.translate.instant('schedule.regenerate_action'), value: 'regenerate', color: 'warn' }],
      } as ConfirmDialogData,
    });
    ref.afterClosed().subscribe(value => {
      if (value !== 'regenerate') return;
      const session = this.sessionService.activeSession();
      if (session) this.sessionService.resetRoundsAndScores(session.date, session.sessionNumber);
    });
  }
}
