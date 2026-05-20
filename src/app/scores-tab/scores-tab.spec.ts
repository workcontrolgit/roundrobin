import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { of } from 'rxjs';
import { ScoresTab } from './scores-tab';
import { SessionService } from '../services/session.service';

class FakeTranslateLoader implements TranslateLoader {
  getTranslation() {
    return of({
      scores: {
        title: 'Scores',
        empty_state: 'Generate a schedule first.',
      },
    });
  }
}

describe('ScoresTab', () => {
  let sessionService: SessionService;

  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({
      imports: [
        ScoresTab,
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
    const fixture = TestBed.createComponent(ScoresTab);
    fixture.detectChanges();
    return fixture;
  }

  it('should create', () => {
    sessionService.initSession('2026-05-18', 1);
    const fixture = createComponent();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should show empty state when no rounds', () => {
    sessionService.initSession('2026-05-18', 1);
    const fixture = createComponent();
    const el = fixture.nativeElement as HTMLElement;
    const emptyEl = el.querySelector('p.text-muted');
    expect(emptyEl).toBeTruthy();
  });
});
