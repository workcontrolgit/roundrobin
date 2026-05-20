import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { MatListModule } from '@angular/material/list';
import { TranslateModule } from '@ngx-translate/core';
import { SessionService } from '../services/session.service';

export interface SessionEntry {
  date: string;
  dateKey: string;
  sessionNumber: number;
  playerCount: number;
  playerNames: string[];
}

export interface DateGroup {
  date: string;
  dateKey: string;
  sessions: SessionEntry[];
}

@Component({
  selector: 'app-copy-players-sheet',
  standalone: true,
  imports: [CommonModule, MatListModule, TranslateModule],
  templateUrl: './copy-players-sheet.html',
})
export class CopyPlayersSheet {
  private readonly sheetRef = inject(MatBottomSheetRef<CopyPlayersSheet>);
  private readonly sessionService = inject(SessionService);

  readonly dateGroups: DateGroup[] = this.buildGroups();

  private buildGroups(): DateGroup[] {
    const activeSession = this.sessionService.activeSession();
    const currentDate = activeSession?.date ?? null;
    const currentSessionNumber = activeSession?.sessionNumber ?? null;

    const PREFIX = 'pickleball-session-';
    const groupMap = new Map<string, SessionEntry[]>();

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)!;
      if (!key.startsWith(PREFIX)) continue;

      const suffix = key.slice(PREFIX.length);
      const match = suffix.match(/^(\d{4}-\d{2}-\d{2})-(\d+)$/);
      if (!match) continue;

      const dateKey = match[1];
      const sessionNumber = parseInt(match[2], 10);

      // Exclude current session
      if (dateKey === currentDate && sessionNumber === currentSessionNumber) continue;

      const raw = localStorage.getItem(key);
      if (!raw) continue;

      let session: { players?: Array<{ name: string }> };
      try {
        session = JSON.parse(raw);
      } catch {
        continue;
      }

      const playerNames = (session.players ?? []).map((p: { name: string }) => p.name);
      const displayDate = new Date(dateKey + 'T00:00:00').toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });

      const entry: SessionEntry = {
        date: displayDate,
        dateKey,
        sessionNumber,
        playerCount: playerNames.length,
        playerNames,
      };

      if (!groupMap.has(dateKey)) {
        groupMap.set(dateKey, []);
      }
      groupMap.get(dateKey)!.push(entry);
    }

    // Sort dates newest first
    const sortedDateKeys = Array.from(groupMap.keys()).sort((a, b) => b.localeCompare(a));

    return sortedDateKeys.map(dateKey => {
      const sessions = groupMap.get(dateKey)!.sort((a, b) => a.sessionNumber - b.sessionNumber);
      return {
        date: sessions[0].date,
        dateKey,
        sessions,
      };
    });
  }

  copySession(entry: SessionEntry): void {
    this.sessionService.importPlayers(entry.playerNames);
    this.sheetRef.dismiss();
  }
}
