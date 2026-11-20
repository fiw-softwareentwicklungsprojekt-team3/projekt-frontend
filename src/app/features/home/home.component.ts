import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Observable } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import {
  ApiFehler,
  ProfessorRegisterResponse,
  RegisterResponse,
  RegistrationService,
} from '../../core/services/registration.service';
import { HTW_EMAIL_LEHRENDE, HTW_EMAIL_REGISTRIERUNG } from '../../core/validation/htw-email';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ModulesComponent } from '../modules/modules.component';

/** Kontotyp, für den die Registrierung ausgeführt wird. */
export type RegistrierungsModus = 'STUDIERENDE' | 'LEHRENDE';

/**
 * Liefert die letzten Wintersemester, z. B. ["WS 2021", ..., "WS 2026"].
 * Das Wintersemester beginnt im Oktober (getMonth() = 9).
 */
function letzteWintersemester(anzahl = 6, heute = new Date()): string[] {
  const aktuell = heute.getMonth() >= 9 ? heute.getFullYear() : heute.getFullYear() - 1;
  return Array.from({ length: anzahl }, (_, i) => `WS ${aktuell - (anzahl - 1) + i}`);
}

/**
 * Startseite. Ohne Anmeldung zeigt sie das Registrierungsformular, mit Anmeldung den Modulkatalog.
 * Fehler vom Backend werden dem passenden Formularfeld zugeordnet (z. B. 409: E-Mail vergeben).
 */
@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    ModulesComponent
  ],
  template: `
    @if (authService.aktuelleRolle() === null) {
      <div class="home-container">
        <!-- Zentrierter Kasten: Jetzt registrieren -->
        <div class="card-container">
          <mat-card class="register-card">
            <mat-card-header class="card-header">
              <div mat-card-avatar class="card-avatar">
                <mat-icon>person_add</mat-icon>
              </div>
              <mat-card-title>Jetzt registrieren</mat-card-title>
              <mat-card-subtitle>Studyplanner-Konto erstellen</mat-card-subtitle>
            </mat-card-header>

            <mat-card-content class="card-body">
              <div class="modus-umschalter" role="group" aria-label="Kontotyp wählen">
                <button
                  type="button"
                  class="modus-btn"
                  [class.modus-btn--aktiv]="modus() === 'STUDIERENDE'"
                  [attr.aria-pressed]="modus() === 'STUDIERENDE'"
                  (click)="modusWechseln('STUDIERENDE')"
                >
                  <mat-icon>school</mat-icon>
                  <span>Studierende:r</span>
                </button>
                <button
                  type="button"
                  class="modus-btn"
                  [class.modus-btn--aktiv]="modus() === 'LEHRENDE'"
                  [attr.aria-pressed]="modus() === 'LEHRENDE'"
                  (click)="modusWechseln('LEHRENDE')"
                >
                  <mat-icon>psychology</mat-icon>
                  <span>Lehrende:r</span>
                </button>
              </div>

              <form class="register-form" #f="ngForm" (submit)="$event.preventDefault()">
                <!-- E-Mail -->
                <mat-form-field appearance="outline" subscriptSizing="dynamic" class="full-width">
                  <mat-label>HTW E-Mail-Adresse</mat-label>
                  <input matInput type="email" [(ngModel)]="email" (focus)="erfolg.set(false)" (ngModelChange)="eingabeGeaendert('email')" #emailModel="ngModel" name="email" required email [pattern]="htwEmailMuster" [placeholder]="modus() === 'LEHRENDE' ? 'name@htw-berlin.de' : 'name@student.htw-berlin.de'" />
                  <mat-icon matSuffix>email</mat-icon>
                  @if (emailModel.hasError('required')) {
                    <mat-error>E-Mail-Adresse darf nicht leer sein.</mat-error>
                  } @else if (emailModel.hasError('email')) {
                    <mat-error>Bitte eine gültige E-Mail-Adresse eingeben.</mat-error>
                  } @else if (emailModel.hasError('pattern')) {
                    @if (modus() === 'LEHRENDE') {
                      <mat-error>Bitte eine gültige HTW-E-Mail-Adresse (&#64;htw-berlin.de) eingeben.</mat-error>
                    } @else {
                      <mat-error>Bitte eine gültige HTW-E-Mail-Adresse (&#64;student.htw-berlin.de) eingeben.</mat-error>
                    }
                  }
                </mat-form-field>
                @if (feldFehler()['email']) {
                  <div class="fehler">{{ feldFehler()['email'] }}</div>
                }

                <!-- Passwort -->
                <mat-form-field appearance="outline" subscriptSizing="dynamic" class="full-width">
                  <mat-label>Passwort wählen</mat-label>
                  <input matInput type="password" [(ngModel)]="passwort" (focus)="erfolg.set(false)" (ngModelChange)="eingabeGeaendert('password')" #passwortModel="ngModel" name="passwort" required minlength="8" placeholder="Mindestens 8 Zeichen" />
                  <mat-icon matSuffix>lock</mat-icon>
                  @if (passwortModel.hasError('required')) {
                    <mat-error>Passwort darf nicht leer sein.</mat-error>
                  } @else if (passwortModel.hasError('minlength')) {
                    <mat-error>Das Passwort muss mindestens 8 Zeichen haben.</mat-error>
                  }
                </mat-form-field>
                @if (feldFehler()['password']) {
                  <div class="fehler">{{ feldFehler()['password'] }}</div>
                }

                @if (modus() === 'STUDIERENDE') {
                  <!-- Startsemester -->
                  <mat-form-field appearance="outline" subscriptSizing="dynamic" class="full-width">
                    <mat-label>Startsemester</mat-label>
                    <mat-select [(ngModel)]="startsemester" (focus)="erfolg.set(false)" (ngModelChange)="eingabeGeaendert('startsemester')" name="startsemester" required>
                      @for (semester of startsemesterOptions; track semester) {
                        <mat-option [value]="semester">{{ semester }}</mat-option>
                      }
                    </mat-select>
                    <mat-icon matSuffix>event</mat-icon>
                  </mat-form-field>
                  @if (feldFehler()['startsemester']) {
                    <div class="fehler">{{ feldFehler()['startsemester'] }}</div>
                  }
                } @else {
                  <!-- Einladungscode -->
                  <mat-form-field appearance="outline" subscriptSizing="dynamic" class="full-width">
                    <mat-label>Einladungscode</mat-label>
                    <input matInput type="text" [(ngModel)]="code" (focus)="erfolg.set(false)" (ngModelChange)="eingabeGeaendert('code')" #codeModel="ngModel" name="code" required placeholder="Code vom Team eingeben" />
                    <mat-icon matSuffix>vpn_key</mat-icon>
                    @if (codeModel.hasError('required')) {
                      <mat-error>Einladungscode darf nicht leer sein.</mat-error>
                    }
                  </mat-form-field>
                  @if (feldFehler()['code']) {
                    <div class="fehler">{{ feldFehler()['code'] }}</div>
                  }
                }

                <!-- Registrieren-Button -->
                <button mat-flat-button class="full-width register-btn" type="button"
                        [disabled]="f.invalid || laedt()" (click)="onRegister(f)">
                  @if (laedt()) {
                    <mat-spinner diameter="18" />
                  } @else {
                    <mat-icon>how_to_reg</mat-icon>
                  }
                  Konto erstellen
                </button>
                @if (allgemeinerFehler()) {
                  <div class="allgemeiner-fehler" role="alert">{{ allgemeinerFehler() }}</div>
                }
                @if (erfolg()) {
                  <div class="erfolg">
                    Konto erstellt. Bitte melde dich oben rechts im Menü über Login an.
                  </div>
                }
              </form>
            </mat-card-content>

            <mat-card-footer class="card-footer">
              <span class="footer-hint">
                Bereits registriert? Melde dich oben rechts im Menü über <strong>Login</strong> an.
              </span>
            </mat-card-footer>
          </mat-card>
        </div>
      </div>
    } @else {
      <app-modules />
    }
  `,
  styles: [`
    .home-container {
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 2.5rem 1rem;
    }

    .card-container {
      width: 100%;
      max-width: 480px;
      margin: 0 auto;
      text-align: left;
    }

    .register-card {
      border-radius: 16px;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
      border: 1px solid rgba(0, 0, 0, 0.06);
      background: #ffffff;
      overflow: hidden;
    }

    .card-header {
      padding: 1.5rem 1.5rem 0.5rem 1.5rem;
    }

    .card-avatar {
      background-color: rgba(118, 185, 0, 0.2);
      color: var(--htw-green-dark);
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
    }

    .card-body {
      padding: 1rem 1.5rem 1.5rem 1.5rem;
    }

    .modus-umschalter {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.5rem;
      padding: 0.25rem;
      margin-bottom: 1.25rem;
      border-radius: 10px;
      background: #f1f3f5;
      border: 1px solid rgba(0, 0, 0, 0.08);
    }

    .modus-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.45rem;
      padding: 0.55rem 0.75rem;
      border: none;
      border-radius: 8px;
      background: transparent;
      color: var(--status-offen);
      font: inherit;
      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;
      transition: background-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease;
    }

    .modus-btn mat-icon {
      font-size: 1.15rem;
      width: 1.15rem;
      height: 1.15rem;
    }

    .modus-btn:hover {
      color: #1f2937;
    }

    .modus-btn:focus-visible {
      outline: 2px solid var(--htw-green-dark);
      outline-offset: 2px;
    }

    .modus-btn--aktiv {
      background: #ffffff;
      color: var(--htw-green-dark);
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
    }

    /* Die Felder reservieren keinen festen Platz für Fehlermeldungen (subscriptSizing="dynamic").
       Der Abstand zwischen den Feldern kommt deshalb von hier. Lange Meldungen dürfen umbrechen
       und schieben die nächsten Felder nach unten, statt sie zu überdecken. */
    .register-form {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .full-width {
      width: 100%;
    }

    .register-btn {
      margin-top: 0.25rem;
      margin-bottom: 0.25rem;
      padding: 0.75rem 1rem;
      font-size: 1rem;
      font-weight: 700;
      background-color: var(--htw-green, var(--mat-sys-primary)) !important;
      color: var(--mat-sys-on-primary) !important;
      border-radius: 8px;
    }

    .card-footer {
      padding: 0.85rem 1.5rem;
      background: var(--mat-sys-surface, #f8f9fa);
      border-top: 1px solid rgba(0, 0, 0, 0.08);
    }

    .footer-hint {
      font-size: 0.85rem;
      color: var(--status-offen);
      line-height: 1.4;
    }

    .fehler {
      color: var(--status-gesperrt);
      font-size: 0.85rem;
      /* Rückt die Meldung des Backends näher an ihr Feld, der Abstand nach unten kommt vom gap. */
      margin: -0.85rem 0 0;
      padding: 0 1rem;
    }

    .allgemeiner-fehler {
      color: var(--status-gesperrt);
      font-size: 0.85rem;
      margin-top: 0.85rem;
    }

    .erfolg {
      color: var(--htw-green-dark);
      font-size: 0.9rem;
      margin-top: 0.75rem;
    }
  `]
})
export class HomeComponent {
  protected readonly authService = inject(AuthService);

  // Formularfelder für die Registrierung:
  protected readonly modus = signal<RegistrierungsModus>('STUDIERENDE');
  protected email = '';
  protected passwort = '';
  protected code = '';
  // Reihenfolge beachten: Der Startwert nutzt die Liste.
  protected readonly startsemesterOptions = letzteWintersemester();
  protected startsemester = this.startsemesterOptions.at(-1) ?? '';

  private readonly registrationService = inject(RegistrationService);

  // Signale, da die Anwendung ohne zone.js läuft.
  protected readonly laedt = signal(false);
  protected readonly erfolg = signal(false);
  protected readonly feldFehler = signal<Record<string, string>>({});
  protected readonly allgemeinerFehler = signal('');

  /** Erlaubtes E-Mail-Muster abhängig vom gewählten Registrierungsmodus (zweite Prüfung nach "email"). */
  protected get htwEmailMuster(): RegExp {
    return this.modus() === 'LEHRENDE' ? HTW_EMAIL_LEHRENDE : HTW_EMAIL_REGISTRIERUNG;
  }

  /** Wechselt zwischen Studierenden- und Lehrenden-Registrierung und setzt alte Meldungen zurück. */
  protected modusWechseln(neuerModus: RegistrierungsModus): void {
    this.modus.set(neuerModus);
    this.feldFehler.set({});
    this.allgemeinerFehler.set('');
    this.erfolg.set(false);
  }

  /** Setzt alte Meldungen zurück, sobald eine Eingabe geändert wird. */
  protected eingabeGeaendert(feld: string): void {
    this.erfolg.set(false);
    this.allgemeinerFehler.set('');
    if (this.feldFehler()[feld]) {
      this.feldFehler.update((aktuell) => {
        const kopie = { ...aktuell };
        delete kopie[feld];
        return kopie;
      });
    }
  }

  /** Sendet die Registrierung und zeigt Erfolg oder Fehler an. */
  protected onRegister(form: NgForm): void {
    this.laedt.set(true);
    this.erfolg.set(false);
    this.feldFehler.set({});
    this.allgemeinerFehler.set('');

    const anfrage$: Observable<RegisterResponse | ProfessorRegisterResponse> =
      this.modus() === 'LEHRENDE'
        ? this.registrationService.registerProfessor({
            email: this.email,
            password: this.passwort,
            code: this.code,
          })
        : this.registrationService.register({
            email: this.email,
            password: this.passwort,
            startsemester: this.startsemester,
          });

    anfrage$.subscribe({
      next: () => {
        this.laedt.set(false);
        form.resetForm(
          this.modus() === 'STUDIERENDE'
            ? { email: '', passwort: '', startsemester: this.startsemester }
            : { email: '', passwort: '', code: '' },
        );
        // Erst nach resetForm setzen, da resetForm synchron ngModelChange auslöst und erfolg zurücksetzt.
        this.erfolg.set(true);
      },
      error: (fehler: HttpErrorResponse) => {
        this.laedt.set(false);
        this.fehlerZuordnen(fehler);
      },
    });
  }

  /**
   * Ordnet eine Fehlerantwort dem passenden Feld oder als globale Meldung zu.
   * 400: Feldbezogene Fehler aus errors ([{ field, message }]) an den Eingabefeldern.
   * 409: Globale Fehlermeldung aus message am Formular.
   */
  private fehlerZuordnen(fehler: HttpErrorResponse): void {
    const body = fehler.error as ApiFehler | null;
    const neu: Record<string, string> = {};

    if (body?.errors?.length) {
      body.errors.forEach((e) => {
        const feld = e.field === 'semester' ? 'startsemester' : e.field;
        neu[feld] = e.message;
      });
    } else if (body?.field && body.message && fehler.status !== 409) {
      neu[body.field] = body.message;
    }

    if (Object.keys(neu).length > 0) {
      this.feldFehler.set(neu);
    } else if (fehler.status === 409) {
      this.allgemeinerFehler.set(body?.message ?? 'Diese E-Mail-Adresse ist bereits vergeben.');
    } else if (fehler.status === 0) {
      // Status 0: keine Antwort vom Server (Netzwerk- oder Verbindungsfehler).
      this.allgemeinerFehler.set(
        'Der Server ist gerade nicht erreichbar. Bitte später erneut versuchen.');
    } else {
      // Server hat geantwortet, die Antwort lässt sich aber keinem Feld zuordnen (z. B. 500).
      this.allgemeinerFehler.set(
        body?.message ?? 'Etwas ist schiefgelaufen. Bitte später erneut versuchen.');
    }
  }
}
