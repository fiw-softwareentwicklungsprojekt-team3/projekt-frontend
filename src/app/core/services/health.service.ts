import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface HealthResponse {
  status: string;
}

/**
 * Fragt das Backend, ob es erreichbar ist: GET /api/health.
 * Lokal leitet der Proxy (proxy.conf.json) /api an http://localhost:8080 weiter.
 */
@Injectable({ providedIn: 'root' })
export class HealthService {
  private readonly http = inject(HttpClient);

  getHealth(): Observable<HealthResponse> {
    return this.http.get<HealthResponse>('/api/health');
  }
}
