import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatBottomSheetRef, MAT_BOTTOM_SHEET_DATA } from '@angular/material/bottom-sheet';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { SessionService } from '../services/session.service';
import { ConfirmDialog, ConfirmDialogData } from '../confirm-dialog/confirm-dialog';

export interface SessionDrawerData {
  currentDate: string;
  currentSessionNumber: number;
}

export interface SessionDrawerResult {
  date: string;
  sessionNumber: number;
  deleted?: boolean;
}

@Component({
  selector: 'app-session-drawer',
  standalone: true,
  imports: [FormsModule, MatButtonModule, MatIconModule, MatDialogModule, TranslateModule],
  templateUrl: './session-drawer.html',
})
export class SessionDrawer {
  private readonly sheetRef = inject(MatBottomSheetRef<SessionDrawer, SessionDrawerResult>);
  private readonly sessionService = inject(SessionService);
  private readonly dialog = inject(MatDialog);
  private readonly translate = inject(TranslateService);
  readonly data = inject<SessionDrawerData>(MAT_BOTTOM_SHEET_DATA);

  selectedDate = signal<string>(this.data.currentDate);
  sessions = signal<number[]>([]);

  constructor() {
    this.refreshSessions();
  }

  onDateChange(date: string): void {
    this.selectedDate.set(date);
    this.refreshSessions();
  }

  private refreshSessions(): void {
    this.sessions.set(this.sessionService.getSavedSessionsForDate(this.selectedDate()));
  }

  selectSession(sessionNumber: number): void {
    this.sheetRef.dismiss({ date: this.selectedDate(), sessionNumber });
  }

  addNewSession(): void {
    const date = this.selectedDate();
    const sessionNumber = this.sessionService.getNextSessionNumber(date);
    this.sheetRef.dismiss({ date, sessionNumber });
  }

  isCurrentSession(n: number): boolean {
    return n === this.data.currentSessionNumber && this.selectedDate() === this.data.currentDate;
  }

  openDeleteDialog(sessionNumber: number): void {
    const ref = this.dialog.open(ConfirmDialog, {
      data: {
        title: this.translate.instant('session_drawer.delete_confirm_title', { number: sessionNumber }),
        message: this.translate.instant('session_drawer.delete_confirm_message'),
        actions: [{ label: this.translate.instant('session_drawer.delete_action'), value: 'delete', color: 'warn' }],
      } as ConfirmDialogData,
    });
    ref.afterClosed().subscribe(value => {
      if (value !== 'delete') return;
      this.sessionService.clearSession(this.selectedDate(), sessionNumber);
      this.sheetRef.dismiss({
        date: this.selectedDate(),
        sessionNumber,
        deleted: true,
      });
    });
  }
}
