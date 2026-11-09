import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

/** Daten der Registrierungsanfrage; die Feldnamen entsprechen dem Backend. */
export interface RegisterRequest {
  email: string;
  password: string;
  startsemester: string; // Format "WS JJJJ"
}

/** Antwort des Backends nach erfolgreicher Registrierung. */
export interface RegisterResponse {
  id: number;
  email: string;
  role: string;
  startsemester: string;
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

/** Registriert neue Studierende über das Backend (POST /api/auth/register). */
@Injectable({ providedIn: 'root' })
export class RegistrationService {
  private readonly http = inject(HttpClient);

  /** Sendet die Registrierung; die Anfrage startet erst beim subscribe(). */
  register(request: RegisterRequest): Observable<RegisterResponse> {
    return this.http.post<RegisterResponse>('/api/auth/register', request);
  }
}
