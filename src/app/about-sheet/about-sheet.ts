import { Component, inject } from '@angular/core';
import { MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { LanguageService } from '../services/language.service';
import { version } from '../../../package.json';

@Component({
  selector: 'app-about-sheet',
  standalone: true,
  imports: [MatSelectModule, MatFormFieldModule, FormsModule, TranslateModule],
  templateUrl: './about-sheet.html',
})
export class AboutSheet {
  private readonly sheetRef = inject(MatBottomSheetRef<AboutSheet>);
  private readonly languageService = inject(LanguageService);

  readonly appVersion = version;

  readonly languages = [
    { code: 'en', label: 'English' },
    { code: 'vi', label: 'Tiếng Việt' },
    { code: 'zh', label: '中文' },
    { code: 'ja', label: '日本語' },
    { code: 'ms', label: 'Bahasa Melayu' },
    { code: 'de', label: 'Deutsch' },
    { code: 'fil', label: 'Filipino' },
  ];

  get selectedLang(): string {
    return this.languageService.getCurrentLang();
  }

  onLanguageChange(lang: string): void {
    this.languageService.setLanguage(lang);
  }
}
