import { Component, Input, inject, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { SessionService } from '../services/session.service';

interface ScoreEntry {
  team1Score: number | null;
  team2Score: number | null;
}

@Component({
  selector: 'app-scores-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, MatCardModule, MatInputModule],
  templateUrl: './scores-tab.html',
})
export class ScoresTab {
  @Input() readOnly = false;

  readonly sessionService = inject(SessionService);
  readonly rounds = computed(() => this.sessionService.activeSession()?.rounds ?? []);
  readonly players = computed(() => this.sessionService.activeSession()?.players ?? []);

  // Per-round-per-court pending score inputs: key = `${roundIndex}-${courtName}`
  pendingScores: Record<string, ScoreEntry> = {};

  constructor() {
    // Clear pending inputs whenever the active session changes.
    effect(() => {
      this.sessionService.activeSession();
      this.pendingScores = {};
    });
  }

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

  onBlurSave(roundIndex: number, courtName: string): void {
    const court = this.rounds()[roundIndex]?.courts.find(c => c.courtName === courtName);
    const pending = this.getPending(roundIndex, courtName);
    // Fall back to existing saved score for fields the user didn't touch
    const team1 = pending.team1Score ?? court?.score?.team1 ?? null;
    const team2 = pending.team2Score ?? court?.score?.team2 ?? null;
    if (team1 != null && team2 != null && team1 >= 0 && team2 >= 0) {
      this.sessionService.saveScore(roundIndex, courtName, team1, team2);
      delete this.pendingScores[this.entryKey(roundIndex, courtName)];
    }
  }
}
