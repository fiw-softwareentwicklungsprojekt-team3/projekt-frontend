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
  // Nur Anfragen an die eigene API und nur, wenn ein Token vorhanden ist.
  const mitToken = token !== null && req.url.startsWith('/api/') && !OHNE_TOKEN.includes(req.url);

  // Anfragen sind unveränderlich, deshalb entsteht eine Kopie mit dem zusätzlichen Header.
  const anfrage = mitToken ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(anfrage).pipe(
    catchError((fehler: HttpErrorResponse) => {
      // 401 mit Token: Sitzung abgelaufen. 403 meldet bewusst nicht ab (Rolle reicht nicht).
      if (mitToken && fehler.status === 401) {
        authService.beiAbgelaufenerSitzung();
      }
      // Der Fehler wird weitergegeben, damit der Aufrufer ihn ebenfalls behandeln kann.
      return throwError(() => fehler);
    }),
  );
};
