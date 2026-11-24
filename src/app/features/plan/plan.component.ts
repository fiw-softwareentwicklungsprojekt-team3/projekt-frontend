import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { catchError, forkJoin, of } from 'rxjs';
import { fehlermeldung } from '../../core/http/fehlermeldung';
import { PlanEntryDto, PlanResponse, PlanService } from '../../core/services/plan.service';
import { ResultService } from '../../core/services/result.service';
import { SemesterArt, parseSemester, semesterSpalten } from '../../core/semester/semester';
import { PlanEntryComponent } from './plan-entry.component';

/** Eine angezeigte Semesterspalte, auch für Semester ohne Einträge. */
export interface SemesterSpalte {
  semester: string;
  art: SemesterArt;
  lp: number;
  sws: number;
  lpLimitExceeded: boolean;
  entries: PlanEntryDto[];
}

/**
 * Seite „Mein Studienplan“ für Studierende (US-40): der Plan als Semesterspalten.
 *
 * Grundgerüst, Zustände (Laden, Fehler, leerer Plan), LP-/SWS-Summen und die
 * Überlast-Warnung stammen aus #42 (Rawan, US-60) und wurden in die Spalten übernommen.
 *
 * Datenquellen:
 * - GET /api/plan: Plan nach Semestern gruppiert (nur Semester mit Einträgen, Lücken füllt semesterSpalten)
 * - GET /api/results: bestandene Module markieren
 *
 * LP-Summen und Verstöße kommen immer vom Backend.
 */
@Component({
  selector: 'app-plan',
  standalone: true,
  imports: [MatIconModule, MatProgressSpinnerModule, PlanEntryComponent],
  template: `
    <section class="page-container">
      <header class="page-header">
        <div>
          <h1>Mein Studienplan</h1>
          @if (plan()) {
            <p class="gesamt-lp">Gesamt: {{ plan()?.totalLp }} LP</p>
          }
        </div>
      </header>

      @if (laedt()) {
        <div class="ladezustand" role="status">
          <mat-spinner diameter="36" />
          <span>Studienplan wird geladen</span>
        </div>
      } @else if (fehler()) {
        <div class="fehlerkasten" role="alert">
          <mat-icon>error_outline</mat-icon>
          <span>{{ fehler() }}</span>
        </div>
      } @else {
        @if (planLeer()) {
          <div class="leerer-plan">
            <mat-icon>school</mat-icon>
            <p>Noch keine Module eingeplant.</p>
          </div>
        }

        <div class="semester-liste">
          @for (spalte of spalten(); track spalte.semester) {
            <article
              class="semester-card"
              [class.ueberlast]="spalte.lpLimitExceeded"
              [attr.aria-label]="spalte.semester"
            >
              <div class="semester-header">
                <h2>{{ spalte.semester }}</h2>
                <div class="summen">
                  <span class="summe"><strong>{{ spalte.lp }}</strong> LP</span>
                  <span class="summe"><strong>{{ spalte.sws }}</strong> SWS</span>
                </div>
              </div>

              @if (spalte.lpLimitExceeded) {
                <div class="warnung" role="status">
                  <mat-icon>warning_amber</mat-icon>
                  <span>
                    Achtung: Dieses Semester hat {{ spalte.lp }} LP. Das empfohlene Limit von
                    {{ plan()?.maxLpPerSemester }} LP ist überschritten.
                  </span>
                </div>
              }

              <div class="eintraege">
                @for (eintrag of spalte.entries; track eintrag.id) {
                  <app-plan-entry
                    [eintrag]="eintrag"
                    [bestanden]="bestanden().has(eintrag.moduleCode)"
                  />
                }
              </div>
            </article>
          }
        </div>
      }
    </section>
  `,
  styles: [
    `
      .page-container {
        margin: 2rem auto;
        padding: 0 1rem;
      }
      .page-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1.5rem;
      }
      h1 {
        margin: 0;
      }
      .gesamt-lp {
        margin: 0.25rem 0 0;
        color: #555;
      }
      .ladezustand,
      .leerer-plan,
      .fehlerkasten {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.75rem;
      }
      .ladezustand {
        min-height: 120px;
      }
      .fehlerkasten {
        color: var(--mat-sys-error);
        background: color-mix(in srgb, var(--mat-sys-error) 8%, white);
        border: 1px solid var(--mat-sys-error);
        border-radius: 8px;
        padding: 1rem;
      }
      .leerer-plan {
        color: #666;
        margin-bottom: 1rem;
      }
      .semester-liste {
        display: flex;
        gap: 1rem;
        overflow-x: auto;
        align-items: flex-start;
        padding-bottom: 0.5rem;
      }
      .semester-card {
        flex: 0 0 270px;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        border: 1px solid #ddd;
        border-radius: 10px;
        background: white;
        padding: 1rem;
      }
      .semester-card.ueberlast {
        border-color: var(--status-warnung);
      }
      .semester-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.5rem;
      }
      .semester-header h2 {
        margin: 0;
        font-size: 1.1rem;
      }
      .summen {
        display: flex;
        gap: 0.4rem;
      }
      .summe {
        border-radius: 999px;
        background: #f1f5eb;
        padding: 0.3rem 0.6rem;
        font-size: 0.85rem;
      }
      .warnung {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        border: 1px solid var(--status-warnung);
        border-radius: 8px;
        background: #fff7ed;
        color: #8a3d00;
        padding: 0.5rem;
        font-size: 0.85rem;
      }
      .eintraege {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }
    `,
  ],
})
export class PlanComponent implements OnInit {
  private readonly planService = inject(PlanService);
  private readonly resultService = inject(ResultService);

  // --- Zustand der Seite (Grundgerüst aus #42) ---
  protected readonly plan = signal<PlanResponse | null>(null);
  protected readonly laedt = signal(true);
  protected readonly fehler = signal('');
  /** Codes aller Module mit Status BESTANDEN. */
  protected readonly bestanden = signal<ReadonlySet<string>>(new Set());

  protected readonly planLeer = computed(() => (this.plan()?.semesters.length ?? 0) === 0);

  /** Alle Spalten vom Startsemester bis zum letzten geplanten plus ein leeres. */
  readonly spalten = computed<SemesterSpalte[]>(() => {
    const plan = this.plan();
    if (!plan) {
      return [];
    }
    const nachSemester = new Map(plan.semesters.map((s) => [s.semester, s]));
    return semesterSpalten(plan.startSemester, [...nachSemester.keys()]).map((semester) => {
      const daten = nachSemester.get(semester);
      return {
        semester,
        art: parseSemester(semester).art,
        lp: daten?.lp ?? 0,
        sws: daten?.sws ?? 0,
        lpLimitExceeded: daten?.lpLimitExceeded ?? false,
        entries: daten?.entries ?? [],
      };
    });
  });

  readonly spaltenNamen = computed(() => this.spalten().map((s) => s.semester));

  ngOnInit(): void {
    this.laden();
  }

  /** Lädt Plan und Leistungen. Nur ein Fehler beim Plan blockiert die Seite. */
  private laden(): void {
    forkJoin({
      plan: this.planService.getPlan(),
      results: this.resultService.getResults().pipe(catchError(() => of([]))),
    }).subscribe({
      next: ({ plan, results }) => {
        this.plan.set(plan);
        this.bestanden.set(
          new Set(results.filter((r) => r.status === 'BESTANDEN').map((r) => r.moduleCode)),
        );
        this.laedt.set(false);
      },
      error: (fehler) => {
        this.laedt.set(false);
        this.fehler.set(fehlermeldung(fehler, 'Der Studienplan konnte nicht geladen werden.'));
      },
    });
  }
}