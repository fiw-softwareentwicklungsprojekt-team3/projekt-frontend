import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { AuthService } from '../../core/services/auth.service';

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
    MatSelectModule
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
              <form class="register-form" (submit)="$event.preventDefault()">
                <!-- Rollen-Auswahl -->
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Ich bin</mat-label>
                  <mat-select [(ngModel)]="regRolle" name="regRolle">
                    <mat-option value="STUDIERENDE">Studierende / Studierender</mat-option>
                    <mat-option value="PROFESSOR_IN">Professorin / Professor</mat-option>
                  </mat-select>
                </mat-form-field>

                <!-- Matrikelnummer / Kürzel -->
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Matrikelnummer / HTW-Kürzel</mat-label>
                  <input matInput [(ngModel)]="matrikelnummer" name="matrikelnummer" placeholder="z. B. s0512345" />
                  <mat-icon matSuffix>badge</mat-icon>
                </mat-form-field>

                <!-- E-Mail -->
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>HTW E-Mail-Adresse</mat-label>
                  <input matInput type="email" [(ngModel)]="email" name="email" placeholder="name@student.htw-berlin.de" />
                  <mat-icon matSuffix>email</mat-icon>
                </mat-form-field>

                <!-- Passwort -->
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Passwort wählen</mat-label>
                  <input matInput type="password" [(ngModel)]="passwort" name="passwort" placeholder="Mindestens 8 Zeichen" />
                  <mat-icon matSuffix>lock</mat-icon>
                </mat-form-field>

                <!-- Registrieren-Button (macht aktuell noch nichts) -->
                <button mat-flat-button class="full-width register-btn" type="button" (click)="onRegister()">
                  <mat-icon>how_to_reg</mat-icon>
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
      color: #3b5d00;
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
      background-color: var(--htw-green, #76B900) !important;
      color: #121e00 !important;
      border-radius: 8px;
    }

    .card-footer {
      padding: 0.85rem 1.5rem;
      background: #f8f9fa;
      border-top: 1px solid #ebebeb;
    }

    .footer-hint {
      font-size: 0.85rem;
      color: #666;
      line-height: 1.4;
    }
  `]
})
export class HomeComponent {
  protected readonly authService = inject(AuthService);

  // Formularfelder für die Registrierung:
  protected regRolle: 'STUDIERENDE' | 'PROFESSOR_IN' = 'STUDIERENDE';
  protected matrikelnummer = '';
  protected email = '';
  protected passwort = '';

  protected onRegister(): void {
    // Es soll aktuell noch nichts passieren beim Klick auf "Konto erstellen"
  }
}
