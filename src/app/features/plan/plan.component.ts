import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PlanResponse, PlanService } from '../../core/services/plan.service';
import { ApiFehler } from '../../core/services/registration.service';

/**
 * Seite „Mein Studienplan“ für Studierende.
 * Zeigt pro Semester LP- und SWS-Summen sowie eine Warnung bei zu vielen LP.
 */
@Component({
  selector: 'app-plan',
  standalone: true,
  imports: [MatIconModule, MatProgressSpinnerModule],
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
      } @else if (plan()?.semesters?.length === 0) {
        <div class="leerer-plan">
          <mat-icon>school</mat-icon>
          <p>Noch keine Module eingeplant.</p>
        </div>
      } @else {
        <div class="semester-liste">
          @for (semester of plan()?.semesters ?? []; track semester.semester) {
            <article class="semester-card">
              <div class="semester-header">
                <h2>{{ semester.semester }}</h2>
                <div class="summen">
                  <span class="summe"><strong>{{ semester.lp }}</strong> LP</span>
                  <span class="summe"><strong>{{ semester.sws }}</strong> SWS</span>
                </div>
              </div>

              @if (semester.lpLimitExceeded) {
                <div class="warnung" role="alert">
                  <mat-icon>warning_amber</mat-icon>
                  <span>
                    Achtung: Dieses Semester hat {{ semester.lp }} LP.
                    Das empfohlene Limit von {{ plan()?.maxLpPerSemester }} LP ist überschritten.
                  </span>
                </div>
              }

              <ul class="eintraege">
                @for (eintrag of semester.entries; track eintrag.id) {
                  <li>
                    <div>
                      <strong>{{ eintrag.moduleCode }}</strong>
                      <span>{{ eintrag.moduleName }}</span>
                    </div>
                    <span class="eintrag-lp">{{ eintrag.lp }} LP</span>
                  </li>
                }
              </ul>
            </article>
          }
        </div>
      }
    </section>
  `,
  styles: [`
    .page-container {
      max-width: 900px;
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
      flex-direction: column;
      color: #666;
    }

    .semester-liste {
      display: grid;
      gap: 1rem;
    }

    .semester-card {
      border: 1px solid #ddd;
      border-radius: 10px;
      background: white;
      padding: 1rem;
    }

    .semester-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
    }

    .semester-header h2 {
      margin: 0;
    }

    .summen {
      display: flex;
      gap: 0.75rem;
    }

    .summe {
      border-radius: 999px;
      background: #f1f5eb;
      padding: 0.4rem 0.75rem;
    }

    .warnung {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-top: 0.75rem;
      border: 1px solid var(--status-warnung);
      border-radius: 8px;
      background: #fff7ed;
      color: #8a3d00;
      padding: 0.75rem;
    }

    .eintraege {
      margin: 0;
      padding: 0.75rem 0 0;
      list-style: none;
    }

    .eintraege li {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      border-top: 1px solid #eee;
      padding: 0.75rem 0;
    }

    .eintraege li div {
      display: flex;
      gap: 0.75rem;
    }

    .eintrag-lp {
      white-space: nowrap;
      color: #555;
    }

    @media (max-width: 600px) {
      .semester-header,
      .eintraege li {
        align-items: flex-start;
        flex-direction: column;
      }
    }
  `]
})
export class PlanComponent implements OnInit {
  private readonly planService = inject(PlanService);

  protected readonly plan = signal<PlanResponse | null>(null);
  protected readonly laedt = signal(true);
  protected readonly fehler = signal('');

  ngOnInit(): void {
    this.planService.getPlan().subscribe({
      next: (plan) => {
        this.plan.set(plan);
        this.laedt.set(false);
      },
      error: (fehler: HttpErrorResponse) => {
        this.laedt.set(false);
        this.fehler.set(this.fehlertextErmitteln(
          fehler,
          'Der Studienplan konnte nicht geladen werden.',
        ));
      },
    });
  }

  private fehlertextErmitteln(fehler: HttpErrorResponse, fallback: string): string {
    const body = fehler.error as ApiFehler | null;
    if (fehler.status === 0) {
      return 'Der Server ist gerade nicht erreichbar. Bitte später erneut versuchen.';
    }
    if (body?.message) {
      return body.message;
    }
    return fallback;
  }
}
