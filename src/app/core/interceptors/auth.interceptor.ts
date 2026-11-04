import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

/** Anfragen, die ohne Token auskommen müssen. */
const OHNE_TOKEN = ['/api/auth/login', '/api/auth/register'];

/**
 * Hängt das Token als Bearer-Header an alle Anfragen an /api/ an.
 * Eine 401-Antwort auf eine Anfrage mit Token bedeutet: Token ungültig oder abgelaufen.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();
  const mitToken = token !== null && req.url.startsWith('/api/') && !OHNE_TOKEN.includes(req.url);

  const anfrage = mitToken ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(anfrage).pipe(
    catchError((fehler: HttpErrorResponse) => {
      if (mitToken && fehler.status === 401) {
        authService.beiAbgelaufenerSitzung();
      }
      return throwError(() => fehler);
    }),
  );
};