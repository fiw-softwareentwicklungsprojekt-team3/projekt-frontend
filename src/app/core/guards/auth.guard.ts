import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Schützt Routen vor unbefugtem Zugriff.
 * Ohne gespeichertes Token wird zur Login-Seite (/login) weitergeleitet.
 */
export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.getToken() !== null) {
    return true;
  }
  return router.createUrlTree(['/login']);
};

/**
 * Erlaubt eine Route nur für die angegebene Rolle.
 * Ohne Token oder ohne geladene Rolle geht es nach /login, bei einer anderen Rolle
 * zur Startseite der eigenen Rolle.
 * Die Rolle steht schon fest, weil provideAppInitializer sie vor dem ersten Guard lädt.
 * Schlägt GET /api/me beim Start fehl, bleibt die Rolle leer, obwohl ein Token vorhanden ist.
 */
export const rolleGuard = (erlaubteRolle: 'STUDIERENDE' | 'PROFESSOR_IN'): CanActivateFn => () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.getToken() === null || authService.aktuelleRolle() === null) {
    return router.createUrlTree(['/login']);
  }
  if (authService.aktuelleRolle() === erlaubteRolle) {
    return true;
  }
  return router.createUrlTree([authService.startseite()]);
};

/** Leitet Lehrende von /, /login und /register direkt in ihr Dashboard. Alle anderen bleiben dort. */
export const startseiteGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.aktuelleRolle() === 'PROFESSOR_IN') {
    return router.createUrlTree(['/dashboard']);
  }
  return true;
};