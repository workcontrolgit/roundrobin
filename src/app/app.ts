import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatBottomSheet, MatBottomSheetModule } from '@angular/material/bottom-sheet';
import { TranslateModule } from '@ngx-translate/core';
import { SessionService } from './services/session.service';
import { LanguageService } from './services/language.service';
import { PlayersTab } from './players-tab/players-tab';
import { ScheduleTab } from './schedule-tab/schedule-tab';
import { ScoresTab } from './scores-tab/scores-tab';
import { LeaderboardTab } from './leaderboard-tab/leaderboard-tab';
import { SessionDrawer, SessionDrawerData, SessionDrawerResult } from './session-drawer/session-drawer';
import { AboutSheet } from './about-sheet/about-sheet';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    MatTabsModule, MatToolbarModule, MatButtonModule, MatIconModule, MatBottomSheetModule,
    TranslateModule,
    PlayersTab, ScheduleTab, ScoresTab, LeaderboardTab,
  ],
  templateUrl: './app.html',
  styleUrls: ['./app.scss'],
})
export class App implements OnInit {
  selectedDate = signal<string>('');
  selectedSessionNumber = signal<number>(1);
  readonly isReadOnly = signal<boolean>(false);
  selectedTabIndex = signal<number>(0);

  private readonly languageService = inject(LanguageService);

  constructor(
    readonly sessionService: SessionService,
    private readonly bottomSheet: MatBottomSheet,
  ) {
    this.languageService.init();
  }

  openAboutSheet(): void {
    this.bottomSheet.open(AboutSheet);
  }

  ngOnInit(): void {
    this.loadFromHash();
    window.addEventListener('hashchange', () => this.loadFromHash());
  }

  private loadFromHash(): void {
    const hash = window.location.hash.slice(1);
    if (hash) {
      const shared = this.sessionService.decodeSessionFromHash(hash);
      if (shared) {
        this.sessionService.loadSharedSession(shared);
        this.isReadOnly.set(true);
        return;
      }
    }
    this.sessionService.migrateOldKeys();
    const today = this.sessionService.todayDate();
    const sessions = this.sessionService.getSavedSessionsForDate(today);
    if (sessions.length > 0) {
      this.sessionService.initSession(today, sessions[0]);
      this.selectedSessionNumber.set(sessions[0]);
    } else {
      this.selectedSessionNumber.set(0);
    }
    this.selectedDate.set(today);
  }

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
    if (remaining.length > 0) {
      this.onSessionChange(date, remaining[0]);
    } else {
      this.selectedDate.set(date);
      this.selectedSessionNumber.set(0);
      this.selectedTabIndex.set(0);
    }
  }

  onSessionChange(date: string, sessionNumber: number): void {
    if (sessionNumber === 0) return;
    this.selectedDate.set(date);
    this.selectedSessionNumber.set(sessionNumber);
    this.sessionService.initSession(date, sessionNumber);
  }

  isToday(): boolean {
    return this.selectedDate() === this.sessionService.todayDate();
  }
}
