import { Component, computed, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { PlanEntryDto } from '../../core/services/plan.service';

/**
 * Ein Modul in einer Semesterspalte (US-40): Name, LP, gewähltes Angebot,
 * bestanden-Markierung und Verstöße.
 */
@Component({
  selector: 'app-plan-entry',
  standalone: true,
  imports: [MatIconModule],
  template: `
    <article
      class="eintrag"
      [class.eintrag--bestanden]="bestanden()"
      [class.eintrag--fehler]="!eintrag().prerequisitesMet"
    >
      <div class="kopf">
        <div>
          <strong>{{ eintrag().moduleCode }}</strong>
          <span class="lp">{{ eintrag().lp }} LP</span>
          @if (bestanden()) {
            <span class="badge-bestanden"><mat-icon inline>check_circle</mat-icon> bestanden</span>
          }
        </div>
        <span class="fachsemester" title="Empfohlenes Fachsemester laut StuPO">
          FS {{ eintrag().recommendedSemester }}
        </span>
      </div>
      <div class="name">{{ eintrag().moduleName }}</div>
      @if (auswahlText(); as text) {
        <div class="auswahl">{{ text }}</div>
      }

      @if (eintrag().violations.length > 0) {
        <ul class="verstoesse">
          @for (v of eintrag().violations; track $index) {
            <li class="verstoss" [class]="'verstoss--' + v.severity">
              <span class="schwere">{{ v.severity }}</span> {{ v.message }}
            </li>
          }
        </ul>
      }
    </article>
  `,
  styles: [
    `
      /* Farben aus den Design-Regeln (E10.1, styles.scss):
         FEHLER = --status-gesperrt (Rot), WARNUNG = --status-warnung (Orange),
         HINWEIS = --status-belegt (Blau), bestanden = --status-bestanden (Grün) */
      .eintrag {
        background: white;
        border: 1px solid #ddd;
        border-left: 4px solid var(--status-offen);
        border-radius: 6px;
        padding: 0.5rem 0.6rem;
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }
      .eintrag--fehler {
        border-left-color: var(--status-gesperrt);
      }
      .eintrag--bestanden {
        border-left-color: var(--status-bestanden);
      }
      .kopf {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        gap: 0.5rem;
      }
      .lp,
      .fachsemester,
      .auswahl {
        font-size: 0.8rem;
        color: #555;
      }
      .lp {
        margin-left: 0.4rem;
      }
      .name {
        font-size: 0.9rem;
      }
      .badge-bestanden {
        margin-left: 0.4rem;
        font-size: 0.75rem;
        color: var(--htw-green-dark);
        font-weight: 500;
      }
      .verstoesse {
        list-style: none;
        margin: 0.2rem 0 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 0.2rem;
      }
      .verstoss {
        font-size: 0.8rem;
        padding: 0.2rem 0.4rem;
        border-radius: 4px;
        border-left: 3px solid;
      }
      .schwere {
        font-weight: 600;
        font-size: 0.7rem;
      }
      .verstoss--FEHLER {
        border-color: var(--status-gesperrt);
        background: #fdecea;
      }
      .verstoss--FEHLER .schwere {
        color: var(--status-gesperrt);
      }
      .verstoss--WARNUNG {
        border-color: var(--status-warnung);
        background: #fff1e6;
      }
      .verstoss--WARNUNG .schwere {
        color: #b34200;
      }
      .verstoss--HINWEIS {
        border-color: var(--status-belegt);
        background: #e6f3fb;
      }
      .verstoss--HINWEIS .schwere {
        color: #005c94;
      }
    `,
  ],
})
export class PlanEntryComponent {
  readonly eintrag = input.required<PlanEntryDto>();
  readonly bestanden = input(false);
  /** Angebot oder freie Veranstaltung als eine Zeile, oder null. */
  readonly auswahlText = computed(() => {
    const e = this.eintrag();
    if (e.offerCode) {
      return e.offerName ? `${e.offerCode} – ${e.offerName}` : e.offerCode;
    }
    if (e.courseCode) {
      return e.courseTitle ? `${e.courseCode} – ${e.courseTitle}` : e.courseCode;
    }
    return null;
  });
}