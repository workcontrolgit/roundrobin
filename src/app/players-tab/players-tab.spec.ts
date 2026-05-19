import { TestBed } from '@angular/core/testing';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { provideHttpClient } from '@angular/common/http';
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { of } from 'rxjs';
import { PlayersTab } from './players-tab';
import { SessionService } from '../services/session.service';
import { CopyPlayersSheet } from '../copy-players-sheet/copy-players-sheet';
import { Session } from '../models/session.models';

function makeSession(date: string, sessionNumber: number, playerNames: string[] = []): Session {
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
      players: {
        copy_button: 'Copy from previous session',
        empty_state: 'Add 8–11 players to get started.',
      },
    });
  }
}

describe('PlayersTab', () => {
  let sessionService: SessionService;
  let bottomSheetSpy: jasmine.SpyObj<MatBottomSheet>;

  beforeEach(() => {
    localStorage.clear();

    bottomSheetSpy = jasmine.createSpyObj('MatBottomSheet', ['open']);

    TestBed.configureTestingModule({
      imports: [
        PlayersTab,
        TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: FakeTranslateLoader } }),
      ],
      providers: [
        provideHttpClient(),
        { provide: MatBottomSheet, useValue: bottomSheetSpy },
        SessionService,
      ],
    });

    sessionService = TestBed.inject(SessionService);
  });

  function createComponent() {
    const fixture = TestBed.createComponent(PlayersTab);
    fixture.detectChanges();
    return fixture;
  }

  describe('hasPreviousSessions', () => {
    it('is false when no other sessions exist in localStorage', () => {
      sessionService.initSession('2026-05-18', 1);
      // Only the current session is in localStorage
      const fixture = createComponent();
      const comp = fixture.componentInstance;
      expect(comp.hasPreviousSessions()).toBeFalse();
    });

    it('is true when another session exists in localStorage', () => {
      sessionService.initSession('2026-05-18', 1);
      sessionService.saveSession(makeSession('2026-05-17', 1, ['Alice', 'Bob']));
      const fixture = createComponent();
      const comp = fixture.componentInstance;
      expect(comp.hasPreviousSessions()).toBeTrue();
    });

    it('is false when only the current session key exists', () => {
      sessionService.initSession('2026-05-18', 2);
      // Explicitly verify that only one key is present (the current session)
      const fixture = createComponent();
      const comp = fixture.componentInstance;
      expect(comp.hasPreviousSessions()).toBeFalse();
    });
  });

  describe('openCopySheet()', () => {
    it('calls bottomSheet.open with CopyPlayersSheet', () => {
      sessionService.initSession('2026-05-18', 1);
      const fixture = createComponent();
      const comp = fixture.componentInstance;

      comp.openCopySheet();

      expect(bottomSheetSpy.open).toHaveBeenCalledWith(CopyPlayersSheet as any);
    });
  });

  describe('copy button visibility', () => {
    it('is visible when players list is empty and hasPreviousSessions is true', () => {
      sessionService.initSession('2026-05-18', 1);
      sessionService.saveSession(makeSession('2026-05-17', 1, ['Alice', 'Bob']));

      const fixture = createComponent();
      fixture.detectChanges();

      const button = fixture.nativeElement.querySelector('[data-testid="copy-players-btn"]');
      expect(button).toBeTruthy();
    });

    it('is hidden when players exist (even if hasPreviousSessions is true)', () => {
      sessionService.initSession('2026-05-18', 1);
      sessionService.saveSession(makeSession('2026-05-17', 1, ['Alice', 'Bob']));
      // Add a player to the current session
      sessionService.addPlayer('Charlie');

      const fixture = createComponent();
      fixture.detectChanges();

      const button = fixture.nativeElement.querySelector('[data-testid="copy-players-btn"]');
      expect(button).toBeFalsy();
    });

    it('is hidden when no previous sessions exist (even if players list is empty)', () => {
      sessionService.initSession('2026-05-18', 1);
      // No other sessions in localStorage

      const fixture = createComponent();
      fixture.detectChanges();

      const button = fixture.nativeElement.querySelector('[data-testid="copy-players-btn"]');
      expect(button).toBeFalsy();
    });
  });
});
