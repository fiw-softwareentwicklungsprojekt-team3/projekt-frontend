import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { AuthService } from './core/services/auth.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    // Läuft einmal beim Start: stellt die Anmeldung über GET /api/me wieder her (E2-US7).
    // Angular wartet auf das Promise, bevor die erste Seite angezeigt wird.
    provideAppInitializer(() => inject(AuthService).sitzungPruefen())
  ]
};