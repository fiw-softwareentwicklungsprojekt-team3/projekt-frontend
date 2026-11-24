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

/** Body für POST /api/plan/entries und PUT /api/plan/entries/{id} (PlanEntryRequest). */
export interface PlanEntryRequest {
  moduleCode: string;
  semester: string;
  offerCode?: string | null;
  courseCode?: string | null;
  courseTitle?: string | null;
}

/** Antwort von POST und PUT auf /api/plan/entries (PlanEntryResponse). */
export interface PlanEntryResponse {
  id: number;
  moduleCode: string;
  semester: string;
  offerCode: string | null;
  courseCode: string | null;
  courseTitle: string | null;
}

/** Lädt und ändert den Studienplan der angemeldeten Person (/api/plan). */
@Injectable({ providedIn: 'root' })
export class PlanService {
  private readonly http = inject(HttpClient);

  /** Lädt den ganzen Plan, nach Semestern gruppiert, inklusive Verstößen. */
  getPlan(): Observable<PlanResponse> {
    return this.http.get<PlanResponse>('/api/plan');
  }

  /** Plant ein Modul in einem Semester ein (US-37). */
  addEntry(request: PlanEntryRequest): Observable<PlanEntryResponse> {
    return this.http.post<PlanEntryResponse>('/api/plan/entries', ohneLeereFelder(request));
  }

  /** Verschiebt einen Eintrag oder ändert seine Auswahl (US-39). */
  updateEntry(id: number, request: PlanEntryRequest): Observable<PlanEntryResponse> {
    return this.http.put<PlanEntryResponse>(`/api/plan/entries/${id}`, ohneLeereFelder(request));
  }

  /** Entfernt einen Eintrag aus dem Plan (US-39, Antwort 204). */
  deleteEntry(id: number): Observable<void> {
    return this.http.delete<void>(`/api/plan/entries/${id}`);
  }
}

/**
 * Leere Texte als null senden: Bei Modulen ohne Auswahl lehnt das Backend
 * auch einen leeren String in offerCode, courseCode oder courseTitle ab.
 */
function ohneLeereFelder(request: PlanEntryRequest): PlanEntryRequest {
  const leer = (wert: string | null | undefined) => (wert?.trim() ? wert.trim() : null);
  return {
    moduleCode: request.moduleCode,
    semester: request.semester,
    offerCode: leer(request.offerCode),
    courseCode: leer(request.courseCode),
    courseTitle: leer(request.courseTitle),
  };
}