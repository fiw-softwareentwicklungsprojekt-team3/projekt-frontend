import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../../core/services/auth.service';
import { ProfileService } from '../../core/services/profile.service';
import { ApiFehler } from '../../core/services/registration.service';

/** Liefert die letzten Wintersemester, z. B. ["WS 2021", ..., "WS 2026"]. */
function mehereWintersemester(startSem?: string | null, anzahl = 8, heute = new Date()): string[] {
  const aktuell = heute.getMonth() >= 9 ? heute.getFullYear() : heute.getFullYear() - 1;
  const options = Array.from({ length: anzahl }, (_, i) => `WS ${aktuell - (anzahl - 1) + i}`);
  if (startSem && !options.includes(startSem)) {
    options.unshift(startSem);
  }
  return options;
}

/**
 * Profilseite: Zeigt E-Mail und Rolle der angemeldeten Person.
 * Studierende können ihr Startsemester über PUT /api/me ändern.
 */
@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSnackBarModule,
  ],
  template: `
    <section class="page-container">
      <h1>Mein Profil</h1>

      <mat-card class="profile-card">
        <mat-card-header>
          <div mat-card-avatar class="profile-avatar">
            <mat-icon>account_circle</mat-icon>
          </div>
          <mat-card-title>Kontoinformationen</mat-card-title>
          <mat-card-subtitle>{{ rolleLabel() }}</mat-card-subtitle>
        </mat-card-header>

        <mat-card-content class="profile-content">
          <!-- E-Mail (nur Anzeige) -->
          <div class="info-row">
            <mat-icon class="info-icon">email</mat-icon>
            <div class="info-text">
              <span class="info-label">E-Mail-Adresse</span>
              <span class="info-value">{{ authService.email() }}</span>
            </div>
          </div>

          <!-- Rolle (nur Anzeige) -->
          <div class="info-row">
            <mat-icon class="info-icon">badge</mat-icon>
            <div class="info-text">
              <span class="info-label">Rolle</span>
              <span class="info-value">{{ rolleLabel() }}</span>
            </div>
          </div>

          <!-- Startsemester (nur für Studierende, änderbar) -->
          @if (authService.aktuelleRolle() === 'STUDIERENDE') {
            <form #f="ngForm" class="semester-form" (submit)="$event.preventDefault()">
              <mat-form-field appearance="outline" subscriptSizing="dynamic" class="semester-field">
                <mat-label>Startsemester</mat-label>
                <mat-select
                  name="startSemester"
                  [(ngModel)]="gewaehlteSemester"
                  (ngModelChange)="startsemesterFehler.set('')"
                  required
                >
                  @for (sem of semesterOptions; track sem) {
                    <mat-option [value]="sem">{{ sem }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>

              @if (startsemesterFehler()) {
                <p class="field-error" role="alert">{{ startsemesterFehler() }}</p>
              }

              @if (allgemeinerFehler()) {
                <p class="allgemeiner-fehler" role="alert">{{ allgemeinerFehler() }}</p>
              }

              <button
                mat-flat-button
                type="button"
                class="speichern-btn"
                [disabled]="laedt() || f.invalid"
                (click)="startsemesterSpeichern()"
              >
                <mat-icon>save</mat-icon>
                {{ laedt() ? 'Wird gespeichert …' : 'Startsemester speichern' }}
              </button>
            </form>
          }
        </mat-card-content>
      </mat-card>
    </section>
  `,
  styles: [`
    .page-container {
      max-width: 600px;
      margin: 2rem auto;
      padding: 0 1rem;
    }

    h1 {
      margin-bottom: 1.5rem;
    }

    .profile-card {
      padding: 0.5rem 0;
    }

    .profile-avatar {
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--htw-green, var(--mat-sys-primary));
      border-radius: 50%;
      width: 40px;
      height: 40px;
    }

    .profile-avatar mat-icon {
      color: white;
    }

    .profile-content {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      padding: 1rem 1rem 0;
    }

    .info-row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .info-icon {
      color: var(--htw-green, var(--mat-sys-primary));
      flex-shrink: 0;
    }

    .info-text {
      display: flex;
      flex-direction: column;
    }

    .info-label {
      font-size: 0.75rem;
      color: rgba(0, 0, 0, 0.6);
      line-height: 1.2;
    }

    .info-value {
      font-size: 1rem;
      font-weight: 500;
    }

    .semester-form {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      margin-top: 0.5rem;
    }

    .semester-field {
      width: 100%;
    }

    .speichern-btn {
      align-self: flex-start;
      background-color: var(--htw-green, var(--mat-sys-primary)) !important;
      color: white !important;
      font-weight: 600;
    }

    .field-error {
      color: var(--status-gesperrt, #d32f2f);
      font-size: 0.875rem;
      margin: 0;
    }

    .allgemeiner-fehler {
      color: var(--status-gesperrt, #d32f2f);
      font-size: 0.875rem;
      margin: 0;
    }
  `],
})
export class ProfileComponent {
  protected readonly authService = inject(AuthService);
  private readonly profileService = inject(ProfileService);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly semesterOptions = mehereWintersemester(this.authService.startSemester());
  protected gewaehlteSemester = this.authService.startSemester() ?? this.semesterOptions.at(-1) ?? '';

  protected readonly laedt = signal(false);
  protected readonly startsemesterFehler = signal('');
  protected readonly allgemeinerFehler = signal('');

  /** Liefert den angezeigten Namen der Rolle. */
  protected rolleLabel(): string {
    const rolle = this.authService.aktuelleRolle();
    if (rolle === 'STUDIERENDE') return 'Studierende:r';
    if (rolle === 'PROFESSOR_IN') return 'Lehrende:r';
    return '';
  }

  /** Sendet PUT /api/me mit dem gewählten Startsemester. */
  protected startsemesterSpeichern(): void {
    this.laedt.set(true);
    this.startsemesterFehler.set('');
    this.allgemeinerFehler.set('');

    this.profileService.updateMe({ startSemester: this.gewaehlteSemester }).subscribe({
      next: (antwort) => {
        this.laedt.set(false);
        // AuthService-Signal aktualisieren, damit Header & App den neuen Stand zeigen.
        this.authService.startSemester.set(antwort.startSemester);
        this.snackBar.open('Startsemester erfolgreich gespeichert!', 'OK', { duration: 4000 });
      },
      error: (fehler: HttpErrorResponse) => {
        this.laedt.set(false);
        this.fehlerZuordnen(fehler);
      },
    });
  }

  private fehlerZuordnen(fehler: HttpErrorResponse): void {
    const body = fehler.error as ApiFehler | null;

    // Feldfehler aus errors[].field === 'startSemester'
    const feldFehler = body?.errors?.find((e) => e.field === 'startSemester');
    if (feldFehler) {
      this.startsemesterFehler.set(feldFehler.message);
      return;
    }

    if (fehler.status === 0) {
      this.allgemeinerFehler.set('Der Server ist gerade nicht erreichbar. Bitte später erneut versuchen.');
      return;
    }

    // Backend-Message am Feld anzeigen, falls vorhanden
    if (body?.message) {
      this.startsemesterFehler.set(body.message);
      return;
    }

    this.allgemeinerFehler.set('Speichern nicht möglich. Bitte später erneut versuchen.');
  }
}
