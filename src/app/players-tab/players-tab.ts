import { Component, Input, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { SessionService } from '../services/session.service';
import { ScheduleService } from '../services/schedule.service';

@Component({
  selector: 'app-players-tab',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatInputModule, MatButtonModule, MatIconModule, MatListModule,
  ],
  templateUrl: './players-tab.html',
})
export class PlayersTab {
  @Input() readOnly = false;

  readonly sessionService = inject(SessionService);
  readonly scheduleService = inject(ScheduleService);

  newName = signal('');

  readonly players = computed(() => this.sessionService.activeSession()?.players ?? []);
  readonly canAdd = computed(() => this.players().length < 11 && this.newName().trim().length > 0);
  readonly canGenerate = computed(() => this.players().length >= 8);

  addPlayer(): void {
    if (!this.canAdd()) return;
    this.sessionService.addPlayer(this.newName());
    this.newName.set('');
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
