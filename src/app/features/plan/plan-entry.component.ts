import { Component, computed, input, output, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { PlanEntryDto } from '../../core/services/plan.service';
import { Turnus, passtZumTurnus } from '../../core/semester/semester';

/**
 * Ein Modul in einer Semesterspalte (US-40): Name, LP, gewähltes Angebot,
 * bestanden-Markierung, Verstöße, Verschieben und Entfernen mit Bestätigung.
 * Die Komponente ruft selbst keine API auf, sondern meldet Aktionen an die Seite.
 */
@Component({
  selector: 'app-plan-entry',
  standalone: true,
  imports: [MatButtonModule, MatFormFieldModule, MatIconModule, MatSelectModule],
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

      @if (bestaetigen()) {
        <div class="bestaetigung" role="alertdialog" aria-label="Entfernen bestätigen">
          <span>{{ eintrag().moduleCode }} wirklich aus dem Plan entfernen?</span>
          <button mat-flat-button type="button" class="ja" (click)="entfernenBestaetigt()">
            Entfernen
          </button>
          <button mat-button type="button" (click)="bestaetigen.set(false)">Abbrechen</button>
        </div>
      } @else {
        <div class="aktionen">
          <mat-form-field appearance="outline" subscriptSizing="dynamic" class="verschieben">
            <mat-label>Verschieben nach</mat-label>
            <mat-select
              [value]="null"
              [disabled]="gesperrt() || zielSemester().length === 0"
              (selectionChange)="zielGewaehlt($event.value)"
              [attr.aria-label]="eintrag().moduleCode + ' verschieben'"
            >
              @for (s of zielSemester(); track s) {
                <mat-option [value]="s">{{ s }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <button
            mat-icon-button
            type="button"
            [disabled]="gesperrt()"
            (click)="bestaetigen.set(true)"
            [attr.aria-label]="eintrag().moduleCode + ' entfernen'"
            title="Aus dem Plan entfernen"
          >
            <mat-icon>delete</mat-icon>
          </button>
        </div>
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
      .aktionen,
      .bestaetigung {
        display: flex;
        align-items: center;
        gap: 0.25rem;
        margin-top: 0.25rem;
      }
      .verschieben {
        flex: 1;
        min-width: 0;
      }
      .bestaetigung {
        flex-wrap: wrap;
        font-size: 0.85rem;
      }
      .bestaetigung .ja {
        background: var(--status-gesperrt);
        color: white;
      }
    `,
  ],
})
export class PlanEntryComponent {
  readonly eintrag = input.required<PlanEntryDto>();
  /** Plansemester, in dem der Eintrag steht. */
  readonly semester = input.required<string>();
  /** Alle angezeigten Semesterspalten, Grundlage für die Verschiebe-Auswahl. */
  readonly spalten = input.required<string[]>();
  /** Turnus aus dem Katalog; null, wenn unbekannt (dann sind alle Semester erlaubt). */
  readonly turnus = input<Turnus | null>(null);
  readonly bestanden = input(false);
  /** true, solange eine Aktion läuft; sperrt die Bedienelemente. */
  readonly gesperrt = input(false);

  readonly verschieben = output<string>();
  readonly entfernen = output<void>();

  /** true, solange die Rückfrage „Wirklich entfernen?“ sichtbar ist. */
  readonly bestaetigen = signal(false);

  /** Nur Semester mit passendem Turnus, ohne das aktuelle. */
  readonly zielSemester = computed(() => {
    const turnus = this.turnus() ?? 'BEIDE';
    return this.spalten().filter((s) => s !== this.semester() && passtZumTurnus(turnus, s));
  });

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

  zielGewaehlt(ziel: string | null): void {
    if (ziel) {
      this.verschieben.emit(ziel);
    }
  }

  entfernenBestaetigt(): void {
    this.bestaetigen.set(false);
    this.entfernen.emit();
  }
}