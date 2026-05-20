import { TestBed } from '@angular/core/testing';
import { MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { provideHttpClient } from '@angular/common/http';
import { TranslateModule, TranslateLoader, TranslateStore } from '@ngx-translate/core';
import { of } from 'rxjs';
import { CopyPlayersSheet } from './copy-players-sheet';
import { SessionService } from '../services/session.service';
import { Session } from '../models/session.models';

function makeSession(date: string, sessionNumber: number, playerNames: string[]): Session {
  return {
    date,
    sessionNumber,
    players: playerNames.map((name, i) => ({ id: `id-${date}-${i}`, name })),
    rounds: [],
  };
}

class FakeTranslateLoader implements TranslateLoader {
  getTranslation() {
    return of({
      players: { copy_sheet_title: 'Copy players from...' },
    });
  }
}

describe('CopyPlayersSheet', () => {
  let sheetRefSpy: jasmine.SpyObj<MatBottomSheetRef<CopyPlayersSheet>>;
  let sessionService: SessionService;

  beforeEach(() => {
    localStorage.clear();

    sheetRefSpy = jasmine.createSpyObj('MatBottomSheetRef', ['dismiss']);

    TestBed.configureTestingModule({
      imports: [
        CopyPlayersSheet,
        TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: FakeTranslateLoader } }),
      ],
      providers: [
        provideHttpClient(),
        { provide: MatBottomSheetRef, useValue: sheetRefSpy },
        SessionService,
      ],
    });

    sessionService = TestBed.inject(SessionService);
  });

  function createComponent() {
    const fixture = TestBed.createComponent(CopyPlayersSheet);
    fixture.detectChanges();
    return fixture;
  }

  it('groups sessions by date, newest date first', () => {
    sessionService.saveSession(makeSession('2026-05-01', 1, ['Alice', 'Bob']));
    sessionService.saveSession(makeSession('2026-05-10', 1, ['Carol']));
    sessionService.saveSession(makeSession('2026-05-10', 2, ['Dave']));

    const fixture = createComponent();
    const comp = fixture.componentInstance;

    expect(comp.dateGroups.length).toBe(2);
    expect(comp.dateGroups[0].dateKey).toBe('2026-05-10');
    expect(comp.dateGroups[1].dateKey).toBe('2026-05-01');
  });

  it('sessions within a date are sorted ascending by session number', () => {
    sessionService.saveSession(makeSession('2026-05-10', 3, ['Charlie']));
    sessionService.saveSession(makeSession('2026-05-10', 1, ['Alice', 'Bob']));
    sessionService.saveSession(makeSession('2026-05-10', 2, ['Dave']));

    const fixture = createComponent();
    const comp = fixture.componentInstance;

    const sessionsForDate = comp.dateGroups[0].sessions;
    expect(sessionsForDate.map(s => s.sessionNumber)).toEqual([1, 2, 3]);
  });

  it('excludes the current session', () => {
    sessionService.initSession('2026-05-18', 1);
    sessionService.saveSession(makeSession('2026-05-17', 1, ['Alice', 'Bob']));

    const fixture = createComponent();
    const comp = fixture.componentInstance;

    // Only the prior date should appear; current session excluded
    expect(comp.dateGroups.length).toBe(1);
    expect(comp.dateGroups[0].dateKey).toBe('2026-05-17');
    // Verify current session date/number not present
    const allSessions = comp.dateGroups.flatMap(g => g.sessions);
    expect(allSessions.some(s => s.dateKey === '2026-05-18' && s.sessionNumber === 1)).toBeFalse();
  });

  it('copySession() calls importPlayers and dismisses sheet', () => {
    sessionService.initSession('2026-05-18', 1);
    sessionService.saveSession(makeSession('2026-05-17', 1, ['Alice', 'Bob']));

    const fixture = createComponent();
    const comp = fixture.componentInstance;
    const importSpy = spyOn(sessionService, 'importPlayers');

    const entry = comp.dateGroups[0].sessions[0];
    comp.copySession(entry);

    expect(importSpy).toHaveBeenCalledWith(['Alice', 'Bob']);
    expect(sheetRefSpy.dismiss).toHaveBeenCalled();
  });

  it('shows empty state gracefully when no prior sessions', () => {
    sessionService.initSession('2026-05-18', 1);

    const fixture = createComponent();
    const comp = fixture.componentInstance;

    expect(comp.dateGroups.length).toBe(0);
  });
});
