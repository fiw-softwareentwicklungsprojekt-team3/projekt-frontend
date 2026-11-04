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

/** Antwort von GET /api/auth/me. Feldnamen mit dem Backend abstimmen. */
export interface MeResponse {
  email: string;
  role: 'STUDIERENDE' | 'PROFESSOR_IN';
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
   * Das Backend liefert die E-Mail nicht mit, sie stammt aus dem Formular.
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

  /** Wird bei einer 401-Antwort aufgerufen: meldet ab, zeigt den Hinweis und geht zur Startseite. */
  beiAbgelaufenerSitzung(): void {
    this.logout();
    this.sitzungAbgelaufen.set(true);
    void this.router.navigate(['/']);
  }

  /**
   * Stellt beim Start der App die Anmeldung wieder her, wenn ein Token gespeichert ist.
   * Bei 401 meldet der Interceptor ab und löscht das Token.
   */
  sitzungPruefen(): void {
    // Ohne Token ist niemand angemeldet, eine Anfrage wäre überflüssig.
    if (this.getToken() === null) {
      return;
    }
    this.http.get<MeResponse>('/api/auth/me').subscribe({
      next: (antwort) => {
        this.aktuelleRolle.set(antwort.role);
        this.email.set(antwort.email);
      },
      // Andere Fehler (z. B. Server nicht erreichbar): die Person bleibt abgemeldet.
      error: () => undefined,
    });
  }
}
