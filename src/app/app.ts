import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { SessionService } from './services/session.service';
import { PlayersTab } from './players-tab/players-tab';
import { ScheduleTab } from './schedule-tab/schedule-tab';
import { ScoresTab } from './scores-tab/scores-tab';
import { LeaderboardTab } from './leaderboard-tab/leaderboard-tab';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatTabsModule, MatToolbarModule, MatSelectModule, MatButtonModule, MatIconModule,
    PlayersTab, ScheduleTab, ScoresTab, LeaderboardTab,
  ],
  templateUrl: './app.html',
  styleUrls: ['./app.scss'],
})
export class App implements OnInit {
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
        this.sessionService.loadSharedSession(shared);
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
    this.refreshDates();
  }

  isToday(): boolean {
    return this.selectedDate() === this.sessionService.todayDate();
  }
}
