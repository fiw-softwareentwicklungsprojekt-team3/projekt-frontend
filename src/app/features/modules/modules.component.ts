import { BreakpointObserver } from '@angular/cdk/layout';
import { NgTemplateOutlet } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { Subscription, map } from 'rxjs';
import { APP_BREAKPOINTS } from '../../core/layout/breakpoints';
import {
  ModuleDetailDto,
  ModuleDto,
  ModuleService,
  PrerequisiteDto,
} from '../../core/services/module.service';
import { ApiFehler } from '../../core/services/registration.service';

/**
 * Modulkatalog-Ansicht (/modules): zeigt alle Module tabellarisch (mat-table) bzw. unter 600 px
 * als kompakte Kartenansicht, bietet kombinierbare Filter (semester, type, term) und lädt bei
 * Klick die Detailansicht direkt unterhalb des jeweiligen Moduls samt StuPO-Voraussetzungen
 * (NOTWENDIG / EMPFOHLEN).
 */
@Component({
  selector: 'app-modules',
  standalone: true,
  imports: [
    NgTemplateOutlet,
    FormsModule,
    MatTableModule,
    MatFormFieldModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <section class="page-container">
      <header class="page-header">
        <div>
          <h1>Modulkatalog</h1>
          <p class="subtitle">
            Übersicht aller Module des Studiengangs mit Filterung und StuPO-Voraussetzungen
          </p>
        </div>
      </header>

      <!-- Filterleiste -->
      <div class="filter-bar" role="region" aria-label="Modulfilter">
        <mat-form-field appearance="outline" subscriptSizing="dynamic" class="filter-field">
          <mat-label>Fachsemester</mat-label>
          <mat-select
            [ngModel]="semesterFilter()"
            (ngModelChange)="setzeSemesterFilter($event)"
            aria-label="Fachsemester filtern"
          >
            <mat-option [value]="null">Alle Fachsemester</mat-option>
            @for (sem of fachsemesterOptionen; track sem) {
              <mat-option [value]="sem">{{ sem }}. Fachsemester</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" subscriptSizing="dynamic" class="filter-field">
          <mat-label>Modulart</mat-label>
          <mat-select
            [ngModel]="typeFilter()"
            (ngModelChange)="setzeTypeFilter($event)"
            aria-label="Modulart filtern"
          >
            <mat-option [value]="null">Alle Arten</mat-option>
            <mat-option value="P">Pflicht (P)</mat-option>
            <mat-option value="WP">Wahlpflicht (WP)</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" subscriptSizing="dynamic" class="filter-field">
          <mat-label>Turnus</mat-label>
          <mat-select
            [ngModel]="termFilter()"
            (ngModelChange)="setzeTermFilter($event)"
            aria-label="Turnus filtern"
          >
            <mat-option [value]="null">Alle Semester</mat-option>
            <mat-option value="WS">Wintersemester (WS)</mat-option>
            <mat-option value="SS">Sommersemester (SS)</mat-option>
          </mat-select>
        </mat-form-field>

        <button
          mat-stroked-button
          type="button"
          class="reset-btn"
          [disabled]="!hatAktiveFilter()"
          (click)="filterZuruecksetzen()"
        >
          <mat-icon>filter_alt_off</mat-icon>
          Filter zurücksetzen
        </button>
      </div>

      <!-- Ladezustand, Fehler oder Modultabelle -->
      @if (laedt()) {
        <div class="status-box" role="status">
          <mat-spinner diameter="32" />
          <p>Module werden geladen…</p>
        </div>
      } @else if (fehler()) {
        <p class="fehler" role="alert">{{ fehler() }}</p>
      } @else if (module().length === 0) {
        <p class="empty-hint">Keine Module für die gewählten Filter gefunden.</p>
      } @else {
        <!-- Gemeinsames Detail-Panel für Desktop-Tabelle und Mobile-Kartenansicht -->
        <ng-template #detailInhalt let-modul>
          <div class="detail-panel" role="region" aria-label="Moduldetails">
            <div class="detail-header">
              <h2>
                @if (modulDetail(); as detail) {
                  {{ detail.code }} – {{ detail.name }}
                } @else {
                  {{ modul.code }} – {{ modul.name }}
                }
              </h2>
              <button
                mat-icon-button
                type="button"
                aria-label="Detailansicht schließen"
                (click)="schliesseDetail(); $event.stopPropagation()"
              >
                <mat-icon>close</mat-icon>
              </button>
            </div>

            @if (detailLaedt()) {
              <div class="status-box" role="status">
                <mat-spinner diameter="28" />
                <span>Moduldetails werden geladen…</span>
              </div>
            } @else if (detailFehler()) {
              <p class="fehler" role="alert">{{ detailFehler() }}</p>
            } @else if (modulDetail(); as detail) {
              <div class="detail-meta-grid">
                <div class="meta-item">
                  <span class="meta-label">Fachsemester</span>
                  <span class="meta-value">{{ detail.semester }}. Semester</span>
                </div>
                <div class="meta-item">
                  <span class="meta-label">Modulart</span>
                  <span class="meta-value">
                    <span class="type-badge" [class.type-badge--wp]="detail.type === 'WP'">
                      {{ detail.type === 'P' ? 'Pflicht (P)' : 'Wahlpflicht (WP)' }}
                    </span>
                  </span>
                </div>
                <div class="meta-item">
                  <span class="meta-label">Bereich</span>
                  <span class="meta-value">{{ detail.area }}</span>
                </div>
                <div class="meta-item">
                  <span class="meta-label">Leistungspunkte</span>
                  <span class="meta-value">{{ detail.lp }} LP</span>
                </div>
                <div class="meta-item">
                  <span class="meta-label">SWS</span>
                  <span class="meta-value">{{ formatSws(detail) }}</span>
                </div>
                <div class="meta-item">
                  <span class="meta-label">Turnus</span>
                  <span class="meta-value">{{ detail.term }}</span>
                </div>
                <div class="meta-item">
                  <span class="meta-label">Niveaustufe</span>
                  <span class="meta-value">{{ detail.level ?? '–' }}</span>
                </div>
                <div class="meta-item">
                  <span class="meta-label">Bewertung</span>
                  <span class="meta-value">
                    {{ detail.graded ? 'Benotet' : 'Unbenotet' }}
                    ({{
                      detail.countsForFinalGrade
                        ? 'zählt für Gesamtnote'
                        : 'ohne Gesamtnote'
                    }})
                  </span>
                </div>
              </div>

              <div class="prerequisites-section">
                <h3>Voraussetzungen laut StuPO</h3>
                @if (detail.prerequisites.length === 0) {
                  <p class="no-prerequisites">Keine Voraussetzungen</p>
                } @else {
                  @if (notwendigeVoraussetzungen().length > 0) {
                    <div class="prerequisite-group">
                      <h4 class="group-title group-title--notwendig">
                        Notwendige Voraussetzungen (NOTWENDIG)
                      </h4>
                      <ul class="prerequisite-list">
                        @for (voraus of notwendigeVoraussetzungen(); track $index) {
                          <li class="prerequisite-item prerequisite-item--notwendig">
                            <span class="kind-badge kind-badge--notwendig">{{
                              voraus.kind
                            }}</span>
                            <span class="prerequisite-text">{{
                              formatVoraussetzung(voraus)
                            }}</span>
                          </li>
                        }
                      </ul>
                    </div>
                  }

                  @if (empfohleneVoraussetzungen().length > 0) {
                    <div class="prerequisite-group">
                      <h4 class="group-title group-title--empfohlen">
                        Empfohlene Voraussetzungen (EMPFOHLEN)
                      </h4>
                      <ul class="prerequisite-list">
                        @for (voraus of empfohleneVoraussetzungen(); track $index) {
                          <li class="prerequisite-item prerequisite-item--empfohlen">
                            <span class="kind-badge kind-badge--empfohlen">{{
                              voraus.kind
                            }}</span>
                            <span class="prerequisite-text">{{
                              formatVoraussetzung(voraus)
                            }}</span>
                          </li>
                        }
                      </ul>
                    </div>
                  }
                }
              </div>
            }
          </div>
        </ng-template>

        @if (istMobil()) {
          <div class="module-cards" role="list" aria-label="Modulkatalog">
            @for (modul of module(); track modul.code) {
              <article
                class="module-card"
                [class.module-card--selected]="ausgewaehlterCode() === modul.code"
                role="listitem"
              >
                <button
                  type="button"
                  class="module-card__trigger"
                  [attr.aria-expanded]="ausgewaehlterCode() === modul.code"
                  [attr.aria-label]="'Details zu Modul ' + modul.code + ' anzeigen'"
                  (click)="waehleModul(modul.code)"
                >
                  <div class="module-card__top">
                    <strong class="module-card__code">{{ modul.code }}</strong>
                    <span class="type-badge" [class.type-badge--wp]="modul.type === 'WP'">
                      {{ modul.type }}
                    </span>
                    <mat-icon class="module-card__chevron" aria-hidden="true">
                      {{ ausgewaehlterCode() === modul.code ? 'expand_less' : 'expand_more' }}
                    </mat-icon>
                  </div>
                  <div class="module-card__name">{{ modul.name }}</div>
                  <div class="module-card__meta">
                    <span>{{ modul.semester }}. Sem.</span>
                    <span>{{ modul.lp }} LP</span>
                    <span>{{ modul.term }}</span>
                    <span>{{ formatSws(modul) }} SWS</span>
                  </div>
                </button>

                @if (ausgewaehlterCode() === modul.code) {
                  <ng-container *ngTemplateOutlet="detailInhalt; context: { $implicit: modul }" />
                }
              </article>
            }
          </div>
        } @else {
          <div class="table-container">
            <table mat-table [dataSource]="module()" multiTemplateDataRows class="modules-table">
              <ng-container matColumnDef="code">
                <th mat-header-cell *matHeaderCellDef>Code</th>
                <td mat-cell *matCellDef="let modul">
                  <strong>{{ modul.code }}</strong>
                </td>
              </ng-container>

              <ng-container matColumnDef="name">
                <th mat-header-cell *matHeaderCellDef>Name</th>
                <td mat-cell *matCellDef="let modul">{{ modul.name }}</td>
              </ng-container>

              <ng-container matColumnDef="semester">
                <th mat-header-cell *matHeaderCellDef class="col-semester">Fachsemester</th>
                <td mat-cell *matCellDef="let modul" class="col-semester">{{ modul.semester }}</td>
              </ng-container>

              <ng-container matColumnDef="type">
                <th mat-header-cell *matHeaderCellDef>Art</th>
                <td mat-cell *matCellDef="let modul">
                  <span class="type-badge" [class.type-badge--wp]="modul.type === 'WP'">
                    {{ modul.type }}
                  </span>
                </td>
              </ng-container>

              <ng-container matColumnDef="lp">
                <th mat-header-cell *matHeaderCellDef>LP</th>
                <td mat-cell *matCellDef="let modul">{{ modul.lp }}</td>
              </ng-container>

              <ng-container matColumnDef="sws">
                <th mat-header-cell *matHeaderCellDef>SWS</th>
                <td mat-cell *matCellDef="let modul">{{ formatSws(modul) }}</td>
              </ng-container>

              <ng-container matColumnDef="term">
                <th mat-header-cell *matHeaderCellDef>Turnus</th>
                <td mat-cell *matCellDef="let modul">{{ modul.term }}</td>
              </ng-container>

              <!-- Ausklappbare Detailzeile direkt unterhalb des angeklickten Moduls -->
              <ng-container matColumnDef="expandedDetail">
                <td
                  mat-cell
                  *matCellDef="let modul"
                  [attr.colspan]="displayedColumns.length"
                  class="detail-cell"
                >
                  @if (ausgewaehlterCode() === modul.code) {
                    <ng-container *ngTemplateOutlet="detailInhalt; context: { $implicit: modul }" />
                  }
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr
                mat-row
                *matRowDef="let row; columns: displayedColumns"
                class="module-row"
                [class.module-row--selected]="ausgewaehlterCode() === row.code"
                tabindex="0"
                role="button"
                [attr.aria-expanded]="ausgewaehlterCode() === row.code"
                [attr.aria-label]="'Details zu Modul ' + row.code + ' anzeigen'"
                (click)="waehleModul(row.code)"
                (keydown.enter)="waehleModul(row.code)"
                (keydown.space)="waehleModul(row.code); $event.preventDefault()"
              ></tr>
              <tr
                mat-row
                *matRowDef="let row; columns: ['expandedDetail']"
                class="detail-row"
                [class.detail-row--expanded]="ausgewaehlterCode() === row.code"
              ></tr>
            </table>
          </div>
        }
      }
    </section>
  `,
  styles: [
    `
      @use '../../../styles/breakpoints' as bp;

      .page-container {
        max-width: 1100px;
        margin: 1.5rem auto;
        padding: 0 1rem;
      }

      .page-header h1 {
        margin: 0 0 0.25rem;
      }

      .filter-bar,
      .status-box,
      .prerequisite-item,
      .module-card__top {
        display: flex;
        align-items: center;
      }

      .prerequisite-list,
      .module-cards,
      .meta-item,
      .module-card__trigger {
        display: flex;
        flex-direction: column;
      }

      .subtitle,
      .status-box,
      .empty-hint,
      .meta-label,
      .no-prerequisites,
      .module-card__chevron,
      .module-card__meta {
        color: var(--status-offen);
      }

      .subtitle {
        margin: 0 0 1.25rem;
        font-size: 0.95rem;
      }

      .filter-bar {
        flex-wrap: wrap;
        gap: 0.75rem;
        margin-bottom: 1.25rem;
      }

      .filter-field {
        min-width: 190px;
        flex: 1 1 190px;
      }

      .reset-btn {
        height: 56px;
        padding: 0 1.25rem;
      }

      .status-box {
        gap: 0.75rem;
        padding: 1.25rem 0;
      }

      .fehler {
        color: var(--status-gesperrt);
        background: rgba(211, 47, 47, 0.08);
        border-left: 4px solid var(--status-gesperrt);
        padding: 0.75rem 1rem;
        border-radius: 4px;
        margin: 0.75rem 0;
      }

      .empty-hint {
        padding: 1rem 0;
      }

      .table-container,
      .module-card {
        background: #fff;
        border-radius: 10px;
        border: 1px solid rgba(0, 0, 0, 0.08);
      }

      .table-container {
        overflow-x: auto;
      }

      .modules-table {
        width: 100%;
      }

      .col-semester {
        text-align: center;
      }

      .module-row {
        cursor: pointer;
        transition: background-color 0.15s ease;
      }

      .module-row:hover,
      .module-row:focus-visible {
        background: rgba(118, 185, 0, 0.08);
        outline: 0;
      }

      .module-row--selected {
        background: rgba(118, 185, 0, 0.16);
      }

      .detail-row:not(.detail-row--expanded) {
        display: none;
      }

      .detail-cell {
        padding: 0 !important;
        border-bottom: 0;
      }

      .detail-row--expanded .detail-cell {
        border-bottom: 1px solid rgba(0, 0, 0, 0.12);
      }

      .detail-panel {
        padding: clamp(0.9rem, 3vw, 1.25rem) clamp(1rem, 3.5vw, 1.5rem);
        background: #fafcf6;
        border-left: 4px solid var(--htw-green);
      }

      .type-badge,
      .kind-badge {
        display: inline-block;
        padding: 0.15rem 0.5rem;
      }

      .type-badge {
        border-radius: 999px;
        font-size: 0.8rem;
        font-weight: 600;
        background: rgba(118, 185, 0, 0.18);
        color: var(--htw-green-dark);
      }

      .type-badge--wp {
        background: rgba(0, 130, 209, 0.15);
        color: var(--htw-blue);
      }

      .detail-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 1rem;
        margin-bottom: 0.85rem;
      }

      .detail-header h2 {
        margin: 0;
        min-width: 0;
        font-size: clamp(1rem, 3.5vw, 1.15rem);
        overflow-wrap: anywhere;
      }

      .detail-meta-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(min(150px, 100%), 1fr));
        gap: 0.75rem 1rem;
        padding-bottom: 1rem;
        border-bottom: 1px solid rgba(0, 0, 0, 0.08);
      }

      .meta-item {
        gap: 0.2rem;
        min-width: 0;
      }

      .meta-label {
        font-size: 0.78rem;
        text-transform: uppercase;
        letter-spacing: 0.03em;
      }

      .meta-value,
      .prerequisite-text {
        font-weight: 500;
        overflow-wrap: anywhere;
      }

      .prerequisites-section {
        margin-top: 1rem;
      }

      .prerequisites-section h3 {
        margin: 0 0 0.75rem;
        font-size: 1rem;
      }

      .no-prerequisites {
        margin: 0;
        font-style: italic;
      }

      .prerequisite-group {
        margin-bottom: 0.85rem;
      }

      .group-title {
        margin: 0 0 0.4rem;
        font-size: 0.9rem;
        font-weight: 600;
      }

      .group-title--notwendig {
        color: var(--status-gesperrt);
      }

      .group-title--empfohlen {
        color: var(--status-warnung);
      }

      .prerequisite-list {
        list-style: none;
        padding: 0;
        margin: 0;
        gap: 0.4rem;
      }

      .prerequisite-item {
        flex-wrap: wrap;
        gap: 0.6rem;
        padding: 0.45rem 0.75rem;
        border-radius: 6px;
        border-left: 4px solid transparent;
      }

      .prerequisite-item--notwendig {
        background: rgba(211, 47, 47, 0.07);
        border-left-color: var(--status-gesperrt);
      }

      .prerequisite-item--empfohlen {
        background: rgba(255, 95, 0, 0.08);
        border-left-color: var(--status-warnung);
      }

      .kind-badge {
        border-radius: 4px;
        font-size: 0.75rem;
        font-weight: 700;
        color: #fff;
      }

      .kind-badge--notwendig {
        background: var(--status-gesperrt);
      }

      .kind-badge--empfohlen {
        background: var(--status-warnung);
      }

      .module-cards {
        gap: 0.75rem;
      }

      .module-card {
        overflow: hidden;
      }

      .module-card--selected {
        border-color: var(--htw-green);
      }

      .module-card__trigger {
        width: 100%;
        box-sizing: border-box;
        border: 0;
        background: none;
        padding: 0.85rem 1rem;
        text-align: left;
        font: inherit;
        color: inherit;
        cursor: pointer;
        gap: 0.4rem;
      }

      .module-card--selected .module-card__trigger {
        background: rgba(118, 185, 0, 0.14);
      }

      .module-card__top {
        gap: 0.5rem;
      }

      .module-card__chevron {
        margin-left: auto;
      }

      .module-card__name {
        font-weight: 500;
        line-height: 1.3;
        overflow-wrap: anywhere;
      }

      .module-card__meta {
        display: flex;
        flex-wrap: wrap;
        gap: 0.35rem 0.75rem;
        font-size: 0.82rem;
      }

      @include bp.mobile {
        .page-container {
          margin: 0;
          padding: 0;
        }

        .filter-bar {
          flex-direction: column;
          align-items: stretch;
          gap: 0.65rem;
        }

        .filter-field {
          min-width: 0;
          flex-basis: auto;
        }

        .reset-btn {
          height: 44px;
        }
      }
    `,
  ],
})
export class ModulesComponent implements OnInit {
  private readonly moduleService = inject(ModuleService);
  private readonly breakpointObserver = inject(BreakpointObserver);
  private ladeAbo: Subscription | null = null;

  /** Erkennt schmale Bildschirme unter 600 px für die mobile Kartenansicht. */
  protected readonly istMobil = toSignal(
    this.breakpointObserver.observe(APP_BREAKPOINTS.mobile).pipe(map((state) => state.matches)),
    { initialValue: false },
  );

  /** Spalten der Modultabelle (mat-table). */
  protected readonly displayedColumns = [
    'code',
    'name',
    'semester',
    'type',
    'lp',
    'sws',
    'term',
  ] as const;

  /** Auswahlwerte für das Fachsemester-Filterfeld (1 bis 6). */
  protected readonly fachsemesterOptionen = [1, 2, 3, 4, 5, 6] as const;

  // Filter-Signale:
  protected readonly semesterFilter = signal<number | null>(null);
  protected readonly typeFilter = signal<'P' | 'WP' | null>(null);
  protected readonly termFilter = signal<'WS' | 'SS' | null>(null);

  protected readonly hatAktiveFilter = computed(
    () =>
      this.semesterFilter() !== null || this.typeFilter() !== null || this.termFilter() !== null,
  );

  // Zustand der Modulliste:
  protected readonly module = signal<ModuleDto[]>([]);
  protected readonly laedt = signal<boolean>(true);
  protected readonly fehler = signal<string>('');

  // Zustand der Detailansicht:
  protected readonly ausgewaehlterCode = signal<string | null>(null);
  protected readonly modulDetail = signal<ModuleDetailDto | null>(null);
  protected readonly detailLaedt = signal<boolean>(false);
  protected readonly detailFehler = signal<string>('');

  /** Gefilterte Liste der notwendigen Voraussetzungen (NOTWENDIG) des gewählten Moduls. */
  protected readonly notwendigeVoraussetzungen = computed(() =>
    (this.modulDetail()?.prerequisites ?? []).filter((v) => v.kind === 'NOTWENDIG'),
  );

  /** Gefilterte Liste der empfohlenen Voraussetzungen (EMPFOHLEN) des gewählten Moduls. */
  protected readonly empfohleneVoraussetzungen = computed(() =>
    (this.modulDetail()?.prerequisites ?? []).filter((v) => v.kind === 'EMPFOHLEN'),
  );

  ngOnInit(): void {
    this.ladeModule();
  }

  /** Setzt den Fachsemester-Filter, schließt eine offene Detailansicht und lädt die Tabelle neu. */
  protected setzeSemesterFilter(semester: number | null): void {
    this.semesterFilter.set(semester);
    this.schliesseDetail();
    this.ladeModule();
  }

  /** Setzt den Modulart-Filter (P/WP), schließt eine offene Detailansicht und lädt die Tabelle neu. */
  protected setzeTypeFilter(type: 'P' | 'WP' | null): void {
    this.typeFilter.set(type);
    this.schliesseDetail();
    this.ladeModule();
  }

  /** Setzt den Turnus-Filter (WS/SS), schließt eine offene Detailansicht und lädt die Tabelle neu. */
  protected setzeTermFilter(term: 'WS' | 'SS' | null): void {
    this.termFilter.set(term);
    this.schliesseDetail();
    this.ladeModule();
  }

  /** Setzt alle Filter auf den Ausgangszustand zurück, schließt die Detailansicht und lädt alle Module. */
  protected filterZuruecksetzen(): void {
    this.semesterFilter.set(null);
    this.typeFilter.set(null);
    this.termFilter.set(null);
    this.schliesseDetail();
    this.ladeModule();
  }

  /**
   * Öffnet oder schließt die Detailansicht eines Moduls direkt unter dessen Tabellenzeile
   * und lädt beim Öffnen die Detaildaten über GET /api/modules/{code}.
   */
  protected waehleModul(code: string): void {
    if (this.ausgewaehlterCode() === code) {
      this.schliesseDetail();
      return;
    }

    this.ausgewaehlterCode.set(code);
    this.modulDetail.set(null);
    this.detailFehler.set('');
    this.detailLaedt.set(true);

    this.moduleService.getModule(code).subscribe({
      next: (detail) => {
        if (this.ausgewaehlterCode() !== code) {
          return;
        }
        this.modulDetail.set(detail);
        this.detailLaedt.set(false);
      },
      error: (err: HttpErrorResponse) => {
        if (this.ausgewaehlterCode() !== code) {
          return;
        }
        this.detailLaedt.set(false);
        this.detailFehler.set(
          this.fehlertextErmitteln(err, 'Die Moduldetails konnten nicht geladen werden.'),
        );
      },
    });
  }

  /** Schließt die geöffnete Detailansicht. */
  protected schliesseDetail(): void {
    this.ausgewaehlterCode.set(null);
    this.modulDetail.set(null);
    this.detailFehler.set('');
    this.detailLaedt.set(false);
  }

  /** Berechnet und formatiert die Semesterwochenstunden (Vorlesung + Übung). */
  protected formatSws(modul: Pick<ModuleDto, 'lectureHours' | 'exerciseHours'>): string {
    const vorlesung = modul.lectureHours ?? 0;
    const uebung = modul.exerciseHours ?? 0;
    const gesamt = vorlesung + uebung;
    if (gesamt === 0) {
      return '0';
    }
    return `${gesamt} (${vorlesung}V + ${uebung}Ü)`;
  }

  /**
   * Formatiert eine einzelne Voraussetzung (Modul mit moduleCode/moduleName
   * oder Mindest-LP mit minLp und optionaler toleranceLp).
   */
  protected formatVoraussetzung(voraus: PrerequisiteDto): string {
    if (voraus.moduleCode) {
      return voraus.moduleName ? `${voraus.moduleCode} – ${voraus.moduleName}` : voraus.moduleCode;
    }
    if (voraus.minLp != null) {
      if (voraus.toleranceLp != null && voraus.toleranceLp > 0) {
        return `Mindestens ${voraus.minLp} LP (Toleranz: ${voraus.toleranceLp} LP)`;
      }
      return `Mindestens ${voraus.minLp} LP`;
    }
    return '';
  }

  /** Ruft die Module mit den aktuellen Filtern vom Backend ab und sortiert nach Semester und Code. */
  private ladeModule(): void {
    this.laedt.set(true);
    this.fehler.set('');
    this.ladeAbo?.unsubscribe();

    this.ladeAbo = this.moduleService
      .getModules({
        semester: this.semesterFilter(),
        type: this.typeFilter(),
        term: this.termFilter(),
      })
      .subscribe({
        next: (daten) => {
          const sortiert = [...daten].sort(
            (a, b) => a.semester - b.semester || a.code.localeCompare(b.code),
          );
          this.module.set(sortiert);
          this.laedt.set(false);
        },
        error: (err: HttpErrorResponse) => {
          this.laedt.set(false);
          this.fehler.set(
            this.fehlertextErmitteln(err, 'Die Module konnten nicht geladen werden.'),
          );
        },
      });
  }

  /** Liest die message aus dem Backend-Fehlerformat (US-49) oder liefert eine verständliche Meldung. */
  private fehlertextErmitteln(fehler: HttpErrorResponse, fallback: string): string {
    const body = fehler.error as ApiFehler | null;
    if (body && typeof body === 'object' && body.message) {
      return body.message;
    }
    if (fehler.status === 0) {
      return 'Der Server ist gerade nicht erreichbar. Bitte später erneut versuchen.';
    }
    return fallback;
  }
}
