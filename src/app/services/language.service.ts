import { Injectable, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly translate = inject(TranslateService);
  private readonly STORAGE_KEY = 'pickleball-lang';
  private readonly SUPPORTED = ['en', 'vi', 'zh', 'ja', 'ms', 'de', 'fil'];
  private readonly DEFAULT = 'en';

  init(): void {
    const persisted = localStorage.getItem(this.STORAGE_KEY);
    if (persisted && this.SUPPORTED.includes(persisted)) {
      this.translate.use(persisted);
      return;
    }
    const browserLang = navigator.language.split('-')[0];
    const lang = this.SUPPORTED.includes(browserLang) ? browserLang : this.DEFAULT;
    this.translate.use(lang);
  }

  setLanguage(lang: string): void {
    if (!this.SUPPORTED.includes(lang)) return;
    localStorage.setItem(this.STORAGE_KEY, lang);
    this.translate.use(lang);
  }

  getCurrentLang(): string {
    return this.translate.currentLang || this.DEFAULT;
  }
}
