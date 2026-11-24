import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

/**
 * Verstoß gegen eine Modulvoraussetzung (E30).
 * - FEHLER: notwendige Voraussetzung fehlt oder zu wenige LP
 * - WARNUNG: empfohlene Voraussetzung fehlt oder LP-Lücke innerhalb der Toleranz
 * - HINWEIS: Voraussetzung liegt in einem vergangenen Semester, das Ergebnis fehlt noch
 */
export interface PlanViolationDto {
  severity: 'FEHLER' | 'WARNUNG' | 'HINWEIS';
  /** Code des fehlenden Moduls; null bei einer LP-Voraussetzung (dann nennt message die LP). */
  prerequisiteCode: string | null;
  message: string;
}

/** Ein Eintrag im Plan. Entspricht dem DTO PlanEntryDto des Backends. */
export interface PlanEntryDto {
  id: number;
  moduleCode: string;
  moduleName: string;
  lp: number;
  /** Empfohlenes Fachsemester laut StuPO, nicht das Plansemester. */
  recommendedSemester: number;
  offerCode: string | null;
  offerName: string | null;
  courseCode: string | null;
  courseTitle: string | null;
  /** false, sobald mindestens ein Verstoß mit severity FEHLER vorliegt. */
  prerequisitesMet: boolean;
  violations: PlanViolationDto[];
}

/** Ein Semester im Plan mit seinen Einträgen (sortiert nach Modulcode). */
export interface PlanSemesterDto {
  /** Plansemester als "WS JJJJ" oder "SS JJJJ". */
  semester: string;
  lp: number;
  /** Summe der SWS (Vorlesung + Übung), null aus dem Backend wird bereits als 0 geliefert. */
  sws: number;
  /** true, wenn die LP-Summe dieses Semesters das konfigurierte Limit überschreitet. */
  lpLimitExceeded: boolean;
  entries: PlanEntryDto[];
}

/**
 * Der ganze Plan der angemeldeten Person (GET /api/plan, US-38).
 * Enthält nur Semester mit Einträgen, zeitlich sortiert; Lücken füllt das Frontend.
 */
export interface PlanResponse {
  startSemester: string;
  totalLp: number;
  maxLpPerSemester: number;
  semesters: PlanSemesterDto[];
}

/** Lädt den Studienplan der angemeldeten Person vom Backend (/api/plan). */
@Injectable({ providedIn: 'root' })
export class PlanService {
  private readonly http = inject(HttpClient);

  /** Lädt den ganzen Plan, nach Semestern gruppiert, inklusive Verstößen. */
  getPlan(): Observable<PlanResponse> {
    return this.http.get<PlanResponse>('/api/plan');
  }
}
