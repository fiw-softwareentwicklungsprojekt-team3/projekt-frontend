import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';

/** Rolle der angemeldeten Person. null bedeutet: niemand ist angemeldet. */
export type Rolle = 'STUDIERENDE' | 'PROFESSOR_IN' | null;

/** Antwort von POST /api/auth/login. */
export interface LoginResponse {
  token: string;
  expiresIn: number;
  role: 'STUDIERENDE' | 'PROFESSOR_IN';
}

interface JwtPayload {
  email?: string;
  rolle?: 'STUDIERENDE' | 'PROFESSOR_IN';
  exp?: number;
}

/** Schlüssel, unter dem das Token im localStorage liegt. */
export const TOKEN_KEY = 'studyplanner.token';
export const ROLE_KEY = 'studyplanner.rolle';
export const EMAIL_KEY = 'studyplanner.email';

/**
 * Verwaltet die Anmeldung: Login, Logout und den Zustand der angemeldeten Person.
 * Der Zustand liegt in Signals, damit sich die Anzeige nach HTTP-Antworten aktualisiert.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  /** Rolle der angemeldeten Person oder null, wenn niemand angemeldet ist. */
  readonly aktuelleRolle = signal<Rolle>(null);
  /** E-Mail-Adresse der angemeldeten Person. */
  readonly email = signal<string>('');
  /** true, solange der Hinweis "Sitzung abgelaufen" angezeigt werden soll. */
  readonly sitzungAbgelaufen = signal<boolean>(false);

  /**
   * Meldet die Person am Backend an und merkt sich Token, Rolle und E-Mail.
   * Das Backend liefert die E-Mail nicht im Response-Body mit, sie stammt aus dem Formular bzw. JWT.
   * Das Observable liefert auch Fehler (z. B. 401), damit der Aufrufer sie anzeigen kann.
   */
  login(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>('/api/auth/login', { email, password }).pipe(
      tap((antwort) => {
        // Token im localStorage: bewusst einfach gehalten, für dieses Projekt ausreichend.
        localStorage.setItem(TOKEN_KEY, antwort.token);
        localStorage.setItem(ROLE_KEY, antwort.role);
        localStorage.setItem(EMAIL_KEY, email);
        this.aktuelleRolle.set(antwort.role);
        this.email.set(email);
        this.sitzungAbgelaufen.set(false);
      }),
    );
  }

  /** Liefert das gespeicherte Token oder null, wenn keines vorhanden ist. */
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  /** Löscht Token und Anmeldezustand. */
  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ROLE_KEY);
    localStorage.removeItem(EMAIL_KEY);
    this.aktuelleRolle.set(null);
    this.email.set('');
  }

  /** Wird bei einer 401-Antwort aufgerufen: meldet ab, zeigt den Hinweis und geht zu /login. */
  beiAbgelaufenerSitzung(): void {
    this.logout();
    this.sitzungAbgelaufen.set(true);
    void this.router.navigate(['/login']).catch(() => undefined);
  }

  /**
   * Stellt beim Start der App die Anmeldung aus dem gespeicherten JWT (bzw. localStorage) wieder her.
   * Ist das Token bereits abgelaufen, wird der Zustand bereinigt.
   */
  sitzungPruefen(): void {
    const token = this.getToken();
    if (token === null) {
      return;
    }

    const payload = this.parseJwtPayload(token);
    if (payload?.exp && payload.exp * 1000 <= Date.now()) {
      this.logout();
      return;
    }

    const rolle = payload?.rolle ?? (localStorage.getItem(ROLE_KEY) as Rolle);
    const email = payload?.email ?? localStorage.getItem(EMAIL_KEY) ?? '';

    if (rolle === 'STUDIERENDE' || rolle === 'PROFESSOR_IN') {
      this.aktuelleRolle.set(rolle);
      this.email.set(email);
    }
  }

  private parseJwtPayload(token: string): JwtPayload | null {
    const teile = token.split('.');
    if (teile.length !== 3) {
      return null;
    }
    try {
      const base64 = teile[1].replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(atob(base64)) as JwtPayload;
    } catch {
      return null;
    }
  }
}