import { Component, Input, inject, computed, effect } from '@angular/core';
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
    effect(() => {
      this.sessionService.activeSession(); // track signal
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
