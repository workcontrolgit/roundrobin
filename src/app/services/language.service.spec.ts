import { TestBed } from '@angular/core/testing';
import { TranslateService, TranslateModule } from '@ngx-translate/core';
import { LanguageService } from './language.service';

describe('LanguageService', () => {
  let service: LanguageService;
  let translate: TranslateService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      providers: [LanguageService],
    });
    service = TestBed.inject(LanguageService);
    translate = TestBed.inject(TranslateService);
    translate.addLangs(['en', 'vi', 'zh', 'ja']);
    translate.setDefaultLang('en');
  });

  it('falls back to "en" for unsupported browser locale', () => {
    spyOnProperty(navigator, 'language', 'get').and.returnValue('fr-FR');
    service.init();
    expect(translate.currentLang).toBe('en');
  });

  it('detects "vi" from browser locale "vi-VN"', () => {
    spyOnProperty(navigator, 'language', 'get').and.returnValue('vi-VN');
    service.init();
    expect(translate.currentLang).toBe('vi');
  });

  it('detects "zh" from browser locale "zh-TW"', () => {
    spyOnProperty(navigator, 'language', 'get').and.returnValue('zh-TW');
    service.init();
    expect(translate.currentLang).toBe('zh');
  });

  it('uses persisted localStorage value over browser locale', () => {
    spyOnProperty(navigator, 'language', 'get').and.returnValue('vi-VN');
    localStorage.setItem('pickleball-lang', 'ja');
    service.init();
    expect(translate.currentLang).toBe('ja');
  });

  it('setLanguage() saves to localStorage and switches language', () => {
    service.init();
    service.setLanguage('zh');
    expect(localStorage.getItem('pickleball-lang')).toBe('zh');
    expect(translate.currentLang).toBe('zh');
  });

  it('getCurrentLang() returns the active language', () => {
    service.init();
    service.setLanguage('vi');
    expect(service.getCurrentLang()).toBe('vi');
  });

  it('getCurrentLang() returns default before init() is called', () => {
    expect(service.getCurrentLang()).toBe('en');
  });

  it('setLanguage() ignores invalid lang codes', () => {
    const useSpy = spyOn(translate, 'use').and.callThrough();
    localStorage.setItem('pickleball-lang', 'en'); // pre-set a valid value
    service.init(); // now init reads 'en' from storage
    useSpy.calls.reset(); // reset call count after init

    service.setLanguage('fr'); // invalid lang

    expect(localStorage.getItem('pickleball-lang')).toBe('en'); // unchanged
    expect(useSpy).not.toHaveBeenCalled();
  });
});
