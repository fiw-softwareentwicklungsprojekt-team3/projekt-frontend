import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

/** Kurzfassung eines Moduls für die tabellarische Übersicht (GET /api/modules). */
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

/**
 * Voraussetzung eines Moduls (entweder ein Modul über moduleCode/moduleName
 * oder Mindest-Leistungspunkte über minLp/toleranceLp).
 * Die Feldnamen entsprechen dem DTO PrerequisiteDto der Modul-API.
 */
export interface PrerequisiteDto {
  kind: 'NOTWENDIG' | 'EMPFOHLEN';
  moduleCode?: string;
  moduleName?: string;
  minLp?: number;
  toleranceLp?: number;
}

/** Detaildaten eines Moduls inklusive Voraussetzungen (GET /api/modules/{code}). */
export interface ModuleDetailDto {
  code: string;
  name: string;
  semester: number;
  type: 'P' | 'WP';
  area: 'FACH' | 'AWE';
  hasChoice: boolean;
  lp: number;
  lectureHours: number | null;
  exerciseHours: number;
  level: string | null;
  term: 'WS' | 'SS' | 'BEIDE';
  countsForFinalGrade: boolean;
  graded: boolean;
  prerequisites: PrerequisiteDto[];
}

/** Optionale Filterparameter für GET /api/modules. */
export interface ModuleFilter {
  semester?: number | null;
  type?: 'P' | 'WP' | '' | null;
  term?: 'WS' | 'SS' | '' | null;
}

/** Lädt den Modulkatalog und Moduldetails vom Backend (/api/modules). */
@Injectable({ providedIn: 'root' })
export class ModuleService {
  private readonly http = inject(HttpClient);

  /**
   * Lädt alle Module, optional gefiltert nach Fachsemester (semester),
   * Modulart (type) und Turnus (term).
   */
  getModules(filter?: ModuleFilter): Observable<ModuleDto[]> {
    let params = new HttpParams();
    if (filter?.semester != null) {
      params = params.set('semester', String(filter.semester));
    }
    if (filter?.type) {
      params = params.set('type', filter.type);
    }
    if (filter?.term) {
      params = params.set('term', filter.term);
    }
    return this.http.get<ModuleDto[]>('/api/modules', { params });
  }

  /** Lädt die Detailansicht eines einzelnen Moduls über GET /api/modules/{code}. */
  getModule(code: string): Observable<ModuleDetailDto> {
    return this.http.get<ModuleDetailDto>(`/api/modules/${encodeURIComponent(code)}`);
  }
}
