import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { AuthService } from '../../core/services/auth.service';
import { ApiFehler, RegistrationService } from '../../core/services/registration.service';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

/**
 * Liefert die letzten Wintersemester, z. B. ["WS 2021", ..., "WS 2026"].
 * Das Wintersemester beginnt im Oktober (getMonth() = 9).
 */
function letzteWintersemester(anzahl = 6, heute = new Date()): string[] {
  const aktuell = heute.getMonth() >= 9 ? heute.getFullYear() : heute.getFullYear() - 1;
  return Array.from({ length: anzahl }, (_, i) => `WS ${aktuell - (anzahl - 1) + i}`);
}

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
    MatProgressSpinnerModule
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
              <form class="register-form" #f="ngForm" (submit)="$event.preventDefault()">                <!-- E-Mail -->
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>HTW E-Mail-Adresse</mat-label>
                  <input matInput type="email" [(ngModel)]="email" name="email" required email placeholder="name@student.htw-berlin.de" />                  <mat-icon matSuffix>email</mat-icon>
                </mat-form-field>

                <!-- Passwort -->
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Passwort wählen</mat-label>
                  <input matInput type="password" [(ngModel)]="passwort" name="passwort" required minlength="8" placeholder="Mindestens 8 Zeichen" />                  <mat-icon matSuffix>lock</mat-icon>
                </mat-form-field>

                <!-- Startsemester -->
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Startsemester</mat-label>
                  <mat-select [(ngModel)]="startsemester" name="startsemester" required>                    @for (semester of startsemesterOptions; track semester) {
                      <mat-option [value]="semester">{{ semester }}</mat-option>
                    }
                  </mat-select>
                  <mat-icon matSuffix>event</mat-icon>
                </mat-form-field>

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

    .register-form {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .full-width {
      width: 100%;
    }

    .register-btn {
      margin-top: 0.5rem;
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
  `]
})
export class HomeComponent {
  protected readonly authService = inject(AuthService);

  // Formularfelder für die Registrierung:
  protected email = '';
  protected passwort = '';
   // Reihenfolge beachten: Der Startwert nutzt die Liste.
  protected readonly startsemesterOptions = letzteWintersemester();
  protected startsemester = this.startsemesterOptions.at(-1) ?? '';

  private readonly registrationService = inject(RegistrationService);

  // Signale, da die Anwendung ohne zone.js läuft.
  protected readonly laedt = signal(false);
  protected readonly erfolg = signal(false);
  protected readonly feldFehler = signal<Record<string, string>>({});
  protected readonly allgemeinerFehler = signal('');

  /** Sendet die Registrierung und zeigt Erfolg oder Fehler an. */
  protected onRegister(form: NgForm): void {
    this.laedt.set(true);
    this.erfolg.set(false);
    this.feldFehler.set({});
    this.allgemeinerFehler.set('');

    this.registrationService
      .register({ email: this.email, password: this.passwort, startsemester: this.startsemester })
      .subscribe({
        next: () => {
          this.laedt.set(false);
          this.erfolg.set(true);
          this.email = '';
          this.passwort = '';
          form.resetForm({ startsemester: this.startsemester });
        },
        error: (fehler: HttpErrorResponse) => {
          this.laedt.set(false);
          this.fehlerZuordnen(fehler);
        }
      });
  }

  /**
   * Ordnet eine Fehlerantwort dem passenden Feld zu.
   * Bei 409 fehlt das Feld in der Antwort; betroffen ist dann die E-Mail-Adresse.
   */
  private fehlerZuordnen(fehler: HttpErrorResponse): void {
    const body = fehler.error as ApiFehler | null;
    const neu: Record<string, string> = {};

    if (body?.errors?.length) {
      body.errors.forEach((e) => (neu[e.field] = e.message));
    } else if (body?.field && body.message) {
      neu[body.field] = body.message;
    } else if (fehler.status === 409) {
      neu['email'] = body?.message ?? 'E-Mail ist bereits vergeben';
    }

    if (Object.keys(neu).length > 0) {
      this.feldFehler.set(neu);
    } else {
      this.allgemeinerFehler.set(
        'Der Server ist gerade nicht erreichbar. Bitte später erneut versuchen.');
    }
  }
}
