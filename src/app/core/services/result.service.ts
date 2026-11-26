import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

/** Status einer Leistung. */
export type LeistungsStatus = 'BELEGT' | 'BESTANDEN' | 'NICHT_BESTANDEN';

/** Eine Leistung aus GET /api/results (ResultResponse). */
export interface ResultResponse {
  moduleCode: string;
  status: LeistungsStatus;
  semester: string | null;
  grade: number | null;
  attempts: number;
  offerCode: string | null;
  courseCode: string | null;
  courseTitle: string | null;
}

/**
 * Lesen der eigenen Leistungen (/api/results).
 * Die Plan-Seite braucht nur die Liste, um bestandene Module zu markieren.
 * Eintragen und Löschen kommen mit US-57 dazu.
 */
@Injectable({ providedIn: 'root' })
export class ResultService {
  private readonly http = inject(HttpClient);

  /** Lädt alle Leistungen der angemeldeten Person. */
  getResults(): Observable<ResultResponse[]> {
    return this.http.get<ResultResponse[]>('/api/results');
  }
}