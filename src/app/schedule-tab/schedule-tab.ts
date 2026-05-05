import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { SessionService } from '../services/session.service';

@Component({
  selector: 'app-schedule-tab',
  standalone: true,
  imports: [CommonModule, MatCardModule],
  templateUrl: './schedule-tab.html',
})
export class ScheduleTab {
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
