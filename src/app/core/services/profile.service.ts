import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { MeResponse } from './auth.service';

/** Body für PUT /api/me. */
export interface UpdateMeRequest {
  startSemester: string;
}

/**
 * Kapselt den API-Aufruf zum Ändern des Startsemesters (PUT /api/me).
 */
@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly http = inject(HttpClient);

  /**
   * Ändert das Startsemester der angemeldeten Studierenden.
   * @param request neues Startsemester, z. B. { startSemester: "WS 2025" }
   * @returns die aktualisierte MeResponse vom Backend
   */
  updateMe(request: UpdateMeRequest): Observable<MeResponse> {
    return this.http.put<MeResponse>('/api/me', request);
  }
}
