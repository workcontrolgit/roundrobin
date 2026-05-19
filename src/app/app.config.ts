import { ApplicationConfig, importProvidersFrom, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { TranslateModule } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideHttpClient(),
    ...provideTranslateHttpLoader({ prefix: '/i18n/', suffix: '.json' }),
    importProvidersFrom(
      TranslateModule.forRoot({
        defaultLanguage: 'en',
      })
    ),
  ]
};
