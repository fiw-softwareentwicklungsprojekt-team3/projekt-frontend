import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, firstValueFrom, of, tap, timeout } from 'rxjs';

/** Rolle der angemeldeten Person. null bedeutet: niemand ist angemeldet. */
export type Rolle = 'STUDIERENDE' | 'PROFESSOR_IN' | null;

/** Antwort von POST /api/auth/login. */
export interface LoginResponse {
  token: string;
  expiresIn: number;
  role: 'STUDIERENDE' | 'PROFESSOR_IN';
}

/** Antwort von GET /api/me. Feldnamen genau wie im Backend (MeResponse.java). */
export interface MeResponse {
  id: number;
  email: string;
  role: 'STUDIERENDE' | 'PROFESSOR_IN';
  /** Startsemester im Format "WS JJJJ"; bei PROFESSOR_IN null. */
  startSemester: string | null;
}

/** Schlüssel, unter dem das Token im localStorage liegt. */
export const TOKEN_KEY = 'studyplanner.token';

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
   * Gespeichert wird nur das Token. Rolle und E-Mail liegen in Signals und werden nach einem
   * Reload über GET /api/me neu geladen (siehe sitzungPruefen).
   * Das Backend liefert die E-Mail nicht im Response-Body mit, sie stammt aus dem Formular.
   * Das Observable liefert auch Fehler (z. B. 401), damit der Aufrufer sie anzeigen kann.
   */
  login(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>('/api/auth/login', { email, password }).pipe(
      tap((antwort) => {
        // Token im localStorage: bewusst einfach gehalten, für dieses Projekt ausreichend.
        localStorage.setItem(TOKEN_KEY, antwort.token);
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
   * Stellt beim Start der App die Anmeldung wieder her, wenn ein Token gespeichert ist.
   * Rolle und E-Mail kommen vom Backend (GET /api/me), nicht aus dem Token selbst. So werden
   * gelöschte Konten und geänderte Rollen sofort erkannt.
   *
   * Ist das Token abgelaufen oder ungültig, antwortet das Backend mit 401. Dann meldet der
   * Interceptor ab und zeigt den Hinweis "Sitzung abgelaufen" (beiAbgelaufenerSitzung).
   *
   * Gibt ein Promise zurück, damit provideAppInitializer (app.config.ts) auf die Antwort
   * wartet: Die Rolle ist bekannt, bevor die erste Seite angezeigt wird.
   */
  sitzungPruefen(): Promise<void> {
    // Ohne Token ist niemand angemeldet, eine Anfrage wäre überflüssig.
    if (this.getToken() === null) {
      return Promise.resolve();
    }
    return firstValueFrom(
      this.http.get<MeResponse>('/api/me').pipe(
        // Antwortet das Backend nicht, soll die App nicht ewig beim Start hängen.
        timeout(5000),
        tap((antwort) => {
          this.aktuelleRolle.set(antwort.role);
          this.email.set(antwort.email);
        }),
        // Fehler (401, Server nicht erreichbar, Timeout): Die Person bleibt abgemeldet,
        // die App startet trotzdem.
        catchError(() => of(null)),
      ),
    ).then(() => undefined);
  }
}