import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { of } from 'rxjs';
import { ScheduleTab } from './schedule-tab';
import { SessionService } from '../services/session.service';

class FakeTranslateLoader implements TranslateLoader {
  getTranslation() {
    return of({
      schedule: {
        title: 'Schedule',
        empty_state: 'Add players on the Players tab and generate a schedule.',
        round: 'Round {{ number }}',
        sitting_out: 'Sitting out: {{ names }}',
        regenerate_button: 'Regenerate Schedule',
        regenerate_confirm_title: 'Regenerate Schedule?',
        regenerate_confirm_message: 'All rounds and scores will be cleared. Your player list will be kept.',
        regenerate_action: 'Regenerate',
      },
      common: {
        active: 'active',
      },
    });
  }
}

describe('ScheduleTab', () => {
  let sessionService: SessionService;

  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({
      imports: [
        ScheduleTab,
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
    const fixture = TestBed.createComponent(ScheduleTab);
    fixture.detectChanges();
    return fixture;
  }

  it('should create', () => {
    sessionService.initSession('2026-05-18', 1);
    const fixture = createComponent();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should show empty state paragraph when no rounds', () => {
    sessionService.initSession('2026-05-18', 1);
    const fixture = createComponent();
    const el = fixture.nativeElement as HTMLElement;
    const emptyEl = el.querySelector('p.text-muted');
    expect(emptyEl).toBeTruthy();
  });

  it('should not show regenerate button when no rounds', () => {
    sessionService.initSession('2026-05-18', 1);
    const fixture = createComponent();
    const el = fixture.nativeElement as HTMLElement;
    // No rounds => regenerate button should not be rendered
    const buttons = el.querySelectorAll('button');
    expect(buttons.length).toBe(0);
  });
});
