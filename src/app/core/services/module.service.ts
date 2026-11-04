import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface ModuleDto {
  code: string;
  name: string;
  semester: number;
  type: 'P' | 'WP';
  lp: number;
  lectureHours: number | null;
  exerciseHours: number;
  term: 'WS' | 'SS' | 'BEIDE';
}

/** Lädt den Modulkatalog vom Backend (GET /api/modules). */
@Injectable({ providedIn: 'root' })
export class ModuleService {
  private readonly http = inject(HttpClient);

  getModules(): Observable<ModuleDto[]> {
    return this.http.get<ModuleDto[]>('/api/modules');
  }
}

