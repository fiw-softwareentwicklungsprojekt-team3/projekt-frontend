import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

/** Daten der Registrierungsanfrage für Studierende (POST /api/auth/register); die Feldnamen entsprechen dem Backend. */
export interface RegisterRequest {
  email: string;
  password: string;
  startsemester: string; // Format "WS JJJJ"
}

/** Antwort des Backends nach erfolgreicher Registrierung einer studierenden Person. */
export interface RegisterResponse {
  id: number;
  email: string;
  role: string;
  startsemester: string;
}

/** Daten der Registrierungsanfrage für Lehrende; die Feldnamen entsprechen dem Backend. */
export interface ProfessorRegisterRequest {
  email: string;
  password: string;
  code: string;
}

/** Antwort des Backends nach erfolgreicher Registrierung einer lehrenden Person. */
export interface ProfessorRegisterResponse {
  id: number;
  email: string;
  role: string;
}

export interface ApiFeldFehler {
  field: string;
  message: string;
}

/**
 * Fehlerantwort des Backends. Unterstützt das bisherige Format
 * ({ field, message }) und das neue Format aus E11-US5 ({ errors: [...] }).
 */
export interface ApiFehler {
  field?: string;
  message?: string;
  errors?: ApiFeldFehler[];
}

/** Registriert neue Studierende und Professor:innen über das Backend. */
@Injectable({ providedIn: 'root' })
export class RegistrationService {
  private readonly http = inject(HttpClient);

  /** Sendet die Registrierung für Studierende; die Anfrage startet erst beim subscribe(). */
  register(request: RegisterRequest): Observable<RegisterResponse> {
    return this.http.post<RegisterResponse>('/api/auth/register', request);
  }

  /** Sendet die Registrierung für Lehrende mit Einladungscode; die Anfrage startet erst beim subscribe(). */
  registerProfessor(request: ProfessorRegisterRequest): Observable<ProfessorRegisterResponse> {
    return this.http.post<ProfessorRegisterResponse>('/api/auth/register/professor', request);
  }
}
