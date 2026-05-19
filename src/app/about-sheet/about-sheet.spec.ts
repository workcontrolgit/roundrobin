import { TestBed } from '@angular/core/testing';
import { MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { provideHttpClient } from '@angular/common/http';
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { of } from 'rxjs';
import { AboutSheet } from './about-sheet';
import { LanguageService } from '../services/language.service';
import { version } from '../../../package.json';

class FakeTranslateLoader implements TranslateLoader {
  getTranslation() {
    return of({
      about: {
        version: 'Version {{version}}',
        built_by: 'Built by Fuji',
        github: 'View on GitHub',
        language: 'Language',
      },
    });
  }
}

describe('AboutSheet', () => {
  let sheetRefSpy: jasmine.SpyObj<MatBottomSheetRef<AboutSheet>>;
  let languageService: LanguageService;

  beforeEach(() => {
    sheetRefSpy = jasmine.createSpyObj('MatBottomSheetRef', ['dismiss']);

    TestBed.configureTestingModule({
      imports: [
        AboutSheet,
        TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: FakeTranslateLoader } }),
      ],
      providers: [
        provideHttpClient(),
        { provide: MatBottomSheetRef, useValue: sheetRefSpy },
        LanguageService,
      ],
    });

    languageService = TestBed.inject(LanguageService);
  });

  function createComponent() {
    const fixture = TestBed.createComponent(AboutSheet);
    fixture.detectChanges();
    return fixture;
  }

  it('displays app version from package.json', () => {
    const fixture = createComponent();
    const comp = fixture.componentInstance;
    expect(comp.appVersion).toBe(version);
  });

  it('shows all 4 language options', () => {
    const fixture = createComponent();
    const comp = fixture.componentInstance;
    expect(comp.languages.length).toBe(4);
    const codes = comp.languages.map(l => l.code);
    expect(codes).toContain('en');
    expect(codes).toContain('vi');
    expect(codes).toContain('zh');
    expect(codes).toContain('ja');
  });

  it('selectedLang reflects current language from LanguageService', () => {
    spyOn(languageService, 'getCurrentLang').and.returnValue('vi');
    const fixture = createComponent();
    const comp = fixture.componentInstance;
    expect(comp.selectedLang).toBe('vi');
  });

  it('onLanguageChange() calls languageService.setLanguage()', () => {
    const fixture = createComponent();
    const comp = fixture.componentInstance;
    const setSpy = spyOn(languageService, 'setLanguage');
    comp.onLanguageChange('zh');
    expect(setSpy).toHaveBeenCalledWith('zh');
  });
});
