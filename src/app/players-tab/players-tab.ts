import { Component, Input, signal, inject, computed, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { TranslateModule } from '@ngx-translate/core';
import { SessionService } from '../services/session.service';
import { ScheduleService } from '../services/schedule.service';
import { CopyPlayersSheet } from '../copy-players-sheet/copy-players-sheet';

@Component({
  selector: 'app-players-tab',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatInputModule, MatButtonModule, MatIconModule, MatTooltipModule,
    TranslateModule,
  ],
  templateUrl: './players-tab.html',
})
export class PlayersTab {
  @Input() readOnly = false;

  readonly sessionService = inject(SessionService);
  readonly scheduleService = inject(ScheduleService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly snackBar = inject(MatSnackBar);
  private readonly bottomSheet = inject(MatBottomSheet);

  newName = signal('');
  editingId = signal<string | null>(null);
  editName = signal('');

  readonly players = computed(() => this.sessionService.activeSession()?.players ?? []);
  readonly canAdd = computed(() => this.players().length < 11 && this.newName().trim().length > 0);
  readonly canGenerate = computed(() => this.players().length >= 8);
  readonly scheduleGenerated = computed(() =>
    (this.sessionService.activeSession()?.rounds.length ?? 0) > 0
  );

  readonly hasPreviousSessions = computed(() => {
    const activeSession = this.sessionService.activeSession();
    const currentKey = activeSession
      ? `pickleball-session-${activeSession.date}-${activeSession.sessionNumber}`
      : null;

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('pickleball-session-') && key !== currentKey) {
        return true;
      }
    }
    return false;
  });

  openCopySheet(): void {
    this.bottomSheet.open(CopyPlayersSheet);
  }

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

  startEdit(player: { id: string; name: string }): void {
    this.editingId.set(player.id);
    this.editName.set(player.name);
  }

  saveEdit(id: string): void {
    if (!this.editName().trim()) return;
    this.sessionService.renamePlayer(id, this.editName());
    this.editingId.set(null);
    this.editName.set('');
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.editName.set('');
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
