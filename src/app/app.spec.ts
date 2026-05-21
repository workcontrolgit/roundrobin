import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { of } from 'rxjs';
import { App } from './app';
import { AboutSheet } from './about-sheet/about-sheet';
import { LanguageService } from './services/language.service';

class FakeTranslateLoader implements TranslateLoader {
  getTranslation() { return of({}); }
}

describe('App', () => {
  const fakeBottomSheet = {
    open: jasmine.createSpy('open').and.returnValue({ afterDismissed: () => of(undefined) }),
  };

  beforeEach(async () => {
    fakeBottomSheet.open.calls.reset();
    await TestBed.configureTestingModule({
      imports: [
        App,
        TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: FakeTranslateLoader } }),
      ],
      providers: [
        provideHttpClient(),
        { provide: MatBottomSheet, useValue: fakeBottomSheet },
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render toolbar title', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('mat-toolbar')?.textContent).toContain('Pickleball Round Robin');
  });

  it('should call languageService.init() on construction', () => {
    const langSpy = spyOn(TestBed.inject(LanguageService), 'init');
    TestBed.createComponent(App);
    expect(langSpy).toHaveBeenCalledTimes(1);
  });

  it('should open AboutSheet when openAboutSheet() is called', () => {
    const fixture = TestBed.createComponent(App);
    const comp = fixture.componentInstance;
    // Access the private bottomSheet reference via the instance
    const openSpy = spyOn((comp as any).bottomSheet, 'open');
    comp.openAboutSheet();
    expect(openSpy).toHaveBeenCalledWith(AboutSheet as any);
  });

  it('should render an info icon button in the toolbar', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const icons = compiled.querySelectorAll('mat-toolbar mat-icon');
    const iconTexts = Array.from(icons).map(el => el.textContent?.trim());
    expect(iconTexts).toContain('info');
  });

  it('should show session chip without S prefix', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    // ngOnInit is already called at this point, but loadFromHash may have set selectedSessionNumber to 0
    // Explicitly set the session after component creation
    app.selectedDate.set('2026-05-21');
    app.selectedSessionNumber.set(1);
    // First detect changes to render initial template
    fixture.detectChanges();
    // Set the session number again in case there's a race condition
    app.selectedSessionNumber.set(1);
    // Detect changes again to render with the session number
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    // The session button text should contain ' | ' separator but not 'S' before the number
    const buttons = compiled.querySelectorAll('mat-toolbar button');
    const sessionBtn = Array.from(buttons).find(btn => btn.textContent?.includes('|'));
    expect(sessionBtn).toBeTruthy('session chip button should exist');
    expect(sessionBtn?.textContent).not.toMatch(/S\d/);
  });
});
