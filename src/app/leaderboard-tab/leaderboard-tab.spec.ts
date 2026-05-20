import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { of } from 'rxjs';
import { LeaderboardTab } from './leaderboard-tab';
import { SessionService } from '../services/session.service';

class FakeTranslateLoader implements TranslateLoader {
  getTranslation() {
    return of({
      leaderboard: {
        title: 'Leaderboard',
        share_button: 'Share QR',
        sort_wins: 'Wins',
        sort_points: 'Points',
        empty_state: 'No scores recorded yet.',
        stat_line: '{{ wins }} wins · {{ points }} pts · {{ games }} games',
        reset_button: 'Reset Session',
        reset_confirm_title: 'Reset Session?',
        reset_confirm_message: 'All players, rounds, and scores will be cleared.',
        reset_action: 'Reset',
      },
    });
  }
}

describe('LeaderboardTab', () => {
  let sessionService: SessionService;

  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({
      imports: [
        LeaderboardTab,
        TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: FakeTranslateLoader } }),
      ],
      providers: [
        provideHttpClient(),
        SessionService,
      ],
    });

    sessionService = TestBed.inject(SessionService);
  });

  function createComponent() {
    const fixture = TestBed.createComponent(LeaderboardTab);
    fixture.detectChanges();
    return fixture;
  }

  it('should create', () => {
    sessionService.initSession('2026-05-18', 1);
    const fixture = createComponent();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should show empty state when no scores recorded', () => {
    sessionService.initSession('2026-05-18', 1);
    const fixture = createComponent();
    const el = fixture.nativeElement as HTMLElement;
    const emptyEl = el.querySelector('p.text-muted');
    expect(emptyEl).toBeTruthy();
  });

  it('should show reset button when not read-only', () => {
    sessionService.initSession('2026-05-18', 1);
    const fixture = createComponent();
    const el = fixture.nativeElement as HTMLElement;
    // The warn-colored stroked button is the reset button
    const resetBtn = el.querySelector('button[color="warn"], button.mat-warn');
    expect(resetBtn).toBeTruthy();
  });

  it('should hide reset button when readOnly is true', () => {
    sessionService.initSession('2026-05-18', 1);
    const fixture = createComponent();
    fixture.componentInstance.readOnly = true;
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const resetBtn = el.querySelector('button[color="warn"], button.mat-warn');
    expect(resetBtn).toBeFalsy();
  });
});
