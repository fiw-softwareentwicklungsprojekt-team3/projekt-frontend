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

