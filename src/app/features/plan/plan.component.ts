import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { Observable, catchError, forkJoin, of, switchMap } from 'rxjs';
import { fehlermeldung } from '../../core/http/fehlermeldung';
import { ModuleDetailDto, ModuleDto, ModuleService } from '../../core/services/module.service';
import {
  PlanEntryDto,
  PlanEntryRequest,
  PlanResponse,
  PlanService,
} from '../../core/services/plan.service';
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
 * - GET /api/results: bestandene Module markieren und aus der Auswahl nehmen
 * - GET /api/modules?term=WS|SS: Modulauswahl einer Spalte
 * - GET /api/modules/{code}: Angebote (offers) eines Moduls mit Auswahl
 *
 * Nach jedem Hinzufügen wird GET /api/plan neu geladen,
 * damit LP-Summen und Verstöße immer vom Backend kommen.
 */
@Component({
  selector: 'app-plan',
  standalone: true,
  imports: [
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    PlanEntryComponent,
  ],
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

        @if (aktionsFehler()) {
          <div class="fehlerkasten aktionsfehler" role="alert">
            <mat-icon>error_outline</mat-icon>
            <span>{{ aktionsFehler() }}</span>
            <button
              mat-icon-button
              type="button"
              aria-label="Meldung schließen"
              (click)="aktionsFehler.set('')"
            >
              <mat-icon>close</mat-icon>
            </button>
          </div>
        }

        <div class="semester-liste" [class.beschaeftigt]="beschaeftigt()">
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

              @if (offeneSpalte() === spalte.semester) {
                <form class="hinzufuegen" (submit)="$event.preventDefault(); einplanen()">
                  @if (auswahlLaedt()) {
                    <div class="auswahl-laedt" role="status">
                      <mat-spinner diameter="20" /> Module werden geladen
                    </div>
                  } @else {
                    <mat-form-field appearance="outline" subscriptSizing="dynamic">
                      <mat-label>Modul ({{ spalte.art }})</mat-label>
                      <mat-select
                        name="modul"
                        [ngModel]="gewaehltesModul()"
                        (ngModelChange)="modulGewaehlt($event)"
                      >
                        @for (m of auswahlOhneBestandene(); track m.code) {
                          <mat-option [value]="m.code" [disabled]="geplanteCodes().has(m.code)">
                            {{ m.code }} – {{ m.name }} ({{ m.lp }} LP)
                            @if (geplanteCodes().has(m.code)) {
                              · schon im Plan
                            }
                          </mat-option>
                        }
                      </mat-select>
                    </mat-form-field>

                    @if (modulDetail()?.offers?.length) {
                      <mat-form-field appearance="outline" subscriptSizing="dynamic">
                        <mat-label>Angebot (optional)</mat-label>
                        <mat-select
                          name="angebot"
                          [ngModel]="offerCode()"
                          (ngModelChange)="offerCode.set($event)"
                        >
                          <mat-option [value]="null">Noch offen</mat-option>
                          @for (o of modulDetail()?.offers ?? []; track o.code) {
                            <mat-option [value]="o.code">{{ o.code }} – {{ o.name }}</mat-option>
                          }
                        </mat-select>
                      </mat-form-field>
                    }

                    @if (freieVeranstaltung()) {
                      <mat-form-field appearance="outline" subscriptSizing="dynamic">
                        <mat-label>Veranstaltungsnummer (optional)</mat-label>
                        <input
                          matInput
                          name="courseCode"
                          maxlength="30"
                          [ngModel]="courseCode()"
                          (ngModelChange)="courseCode.set($event)"
                        />
                      </mat-form-field>
                      <mat-form-field appearance="outline" subscriptSizing="dynamic">
                        <mat-label>Veranstaltungstitel (optional)</mat-label>
                        <input
                          matInput
                          name="courseTitle"
                          maxlength="150"
                          [ngModel]="courseTitle()"
                          (ngModelChange)="courseTitle.set($event)"
                        />
                      </mat-form-field>
                    }

                    <div class="formular-knoepfe">
                      <button
                        mat-flat-button
                        type="submit"
                        [disabled]="!gewaehltesModul() || beschaeftigt()"
                      >
                        Einplanen
                      </button>
                      <button mat-button type="button" (click)="formularSchliessen()">
                        Abbrechen
                      </button>
                    </div>
                  }
                </form>
              } @else {
                <button
                  mat-stroked-button
                  type="button"
                  class="plus"
                  [disabled]="beschaeftigt()"
                  (click)="formularOeffnen(spalte)"
                >
                  <mat-icon>add</mat-icon> Modul hinzufügen
                </button>
              }
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
      .aktionsfehler {
        justify-content: flex-start;
        margin-bottom: 1rem;
        padding: 0.25rem 0.25rem 0.25rem 1rem;
      }
      .aktionsfehler span {
        flex: 1;
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
      .beschaeftigt {
        opacity: 0.7;
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
      .eintraege,
      .hinzufuegen {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }
      .hinzufuegen {
        border: 1px dashed #bbb;
        border-radius: 6px;
        padding: 0.5rem;
      }
      .auswahl-laedt,
      .formular-knoepfe {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      .plus {
        width: 100%;
      }
    `,
  ],
})
export class PlanComponent implements OnInit {
  private readonly planService = inject(PlanService);
  private readonly moduleService = inject(ModuleService);
  private readonly resultService = inject(ResultService);

  // --- Zustand der Seite (Grundgerüst aus #42) ---
  protected readonly plan = signal<PlanResponse | null>(null);
  protected readonly laedt = signal(true);
  protected readonly fehler = signal('');
  /** Meldung nach einer abgelehnten Aktion (z. B. 409 „schon im Plan“). */
  protected readonly aktionsFehler = signal('');
  /** true, solange eine Aktion läuft. */
  protected readonly beschaeftigt = signal(false);
  /** Codes aller Module mit Status BESTANDEN. */
  protected readonly bestanden = signal<ReadonlySet<string>>(new Set());

  // --- Formular „Modul hinzufügen“ (immer nur in einer Spalte offen) ---
  protected readonly offeneSpalte = signal<string | null>(null);
  protected readonly auswahlLaedt = signal(false);
  protected readonly auswahlModule = signal<ModuleDto[]>([]);
  protected readonly gewaehltesModul = signal<string | null>(null);
  protected readonly modulDetail = signal<ModuleDetailDto | null>(null);
  protected readonly offerCode = signal<string | null>(null);
  protected readonly courseCode = signal('');
  protected readonly courseTitle = signal('');
  /** Bereits geladene Modulauswahl je Turnus, damit nicht jede Spalte neu lädt. */
  private readonly auswahlCache = new Map<SemesterArt, ModuleDto[]>();

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

  /** Codes aller Module, die schon im Plan stehen. */
  protected readonly geplanteCodes = computed(
    () => new Set(this.spalten().flatMap((s) => s.entries.map((e) => e.moduleCode))),
  );

  /** Modulauswahl ohne bestandene Module. Schon geplante bleiben sichtbar, aber gesperrt. */
  readonly auswahlOhneBestandene = computed(() =>
    this.auswahlModule().filter((m) => !this.bestanden().has(m.code)),
  );

  /** Bei B63/B64: Modul mit Auswahl, aber ohne Angebotsliste, nur freie Veranstaltung. */
  protected readonly freieVeranstaltung = computed(() => {
    const d = this.modulDetail();
    return !!d && d.hasChoice && (d.offers?.length ?? 0) === 0;
  });

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

  // --- Hinzufügen ---

  formularOeffnen(spalte: SemesterSpalte): void {
    this.formularZuruecksetzen();
    this.offeneSpalte.set(spalte.semester);
    this.aktionsFehler.set('');

    const cache = this.auswahlCache.get(spalte.art);
    if (cache) {
      this.auswahlModule.set(cache);
      return;
    }
    this.auswahlLaedt.set(true);
    // Turnus, nicht Fachsemester: ?term=WS liefert WS- und BEIDE-Module.
    this.moduleService.getModules({ term: spalte.art }).subscribe({
      next: (module) => {
        this.auswahlCache.set(spalte.art, module);
        const offen = this.offeneSpalte();
        if (offen && parseSemester(offen).art === spalte.art) {
          this.auswahlModule.set(module);
        }
        this.auswahlLaedt.set(false);
      },
      error: (fehler) => {
        this.aktionsFehler.set(fehlermeldung(fehler, 'Die Module konnten nicht geladen werden.'));
        this.auswahlLaedt.set(false);
      },
    });
  }

  formularSchliessen(): void {
    this.formularZuruecksetzen();
  }

  modulGewaehlt(code: string | null): void {
    this.gewaehltesModul.set(code);
    this.modulDetail.set(null);
    this.offerCode.set(null);
    this.courseCode.set('');
    this.courseTitle.set('');
    if (!code) {
      return;
    }
    // Angebote stehen nur in der Detailansicht (offers aus US-34).
    this.moduleService.getModule(code).subscribe({
      next: (detail) => {
        if (this.gewaehltesModul() === code) {
          this.modulDetail.set(detail);
        }
      },
      // Ohne Details kann trotzdem ohne Angebot eingeplant werden.
      error: () => undefined,
    });
  }

  einplanen(): void {
    const semester = this.offeneSpalte();
    const moduleCode = this.gewaehltesModul();
    if (!semester || !moduleCode) {
      return;
    }
    const request: PlanEntryRequest = {
      moduleCode,
      semester,
      offerCode: this.offerCode(),
      courseCode: this.courseCode(),
      courseTitle: this.courseTitle(),
    };
    this.aktionAusfuehren(this.planService.addEntry(request), () => this.formularZuruecksetzen());
  }

  /**
   * Führt eine Änderung aus und lädt danach immer GET /api/plan neu.
   * Lehnt das Backend ab, bleibt der Plan unverändert und die Meldung erscheint.
   */
  private aktionAusfuehren(aktion: Observable<unknown>, beiErfolg?: () => void): void {
    this.beschaeftigt.set(true);
    this.aktionsFehler.set('');
    aktion.pipe(switchMap(() => this.planService.getPlan())).subscribe({
      next: (plan) => {
        this.plan.set(plan);
        beiErfolg?.();
        this.beschaeftigt.set(false);
      },
      error: (fehler) => {
        this.aktionsFehler.set(fehlermeldung(fehler));
        this.beschaeftigt.set(false);
      },
    });
  }

  private formularZuruecksetzen(): void {
    this.offeneSpalte.set(null);
    this.auswahlModule.set([]);
    this.auswahlLaedt.set(false);
    this.gewaehltesModul.set(null);
    this.modulDetail.set(null);
    this.offerCode.set(null);
    this.courseCode.set('');
    this.courseTitle.set('');
  }
}