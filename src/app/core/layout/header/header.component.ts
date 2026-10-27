import { Component, inject, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule, MatMenuTrigger } from '@angular/material/menu';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { AuthService } from '../../services/auth.service';
import { HealthService } from '../../services/health.service';

@Component({
  selector: 'app-header',
  imports: [
    RouterLink,
    FormsModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule
  ],
  template: `
    <mat-toolbar color="primary" class="header-toolbar">
      <!-- 1. Logo / App-Name -->
      <div class="logo-section" routerLink="/">
        <mat-icon class="logo-icon">school</mat-icon>
        <span class="app-title">HTW Studyplanner</span>
      </div>

      <!-- 2. Rollenbasierte Navigation -->
      <nav class="nav-links">
        @if (authService.aktuelleRolle() === 'STUDIERENDE') {
          <a routerLink="/modules" class="nav-link">Module</a>
          <a routerLink="/plan" class="nav-link">Mein Studienplan</a>
        } @else if (authService.aktuelleRolle() === 'PROFESSOR_IN') {
          <a routerLink="/dashboard" class="nav-link">Dashboard</a>
          <a routerLink="/modules" class="nav-link">Modulangebote</a>
        }
      </nav>

      <span class="spacer"></span>

      @if (healthStatus !== 'unknown') {
        <div
          class="backend-status"
          [class.backend-status--online]="healthStatus === 'online'"
          [class.backend-status--offline]="healthStatus === 'offline'"
          [title]="healthStatus === 'online' ? 'Backend erreichbar' : 'Backend nicht erreichbar'"
        >
          <span class="backend-status__dot"></span>
          <span>{{ healthStatus === 'online' ? 'Backend online' : 'Backend offline' }}</span>
        </div>
      }

      <!-- 3. Benutzerbereich (Login oder Angemeldet + Logout) -->
      <div class="user-section">
        @if (authService.aktuelleRolle() === null) {
          <!-- Wenn NICHT angemeldet: Login-Button -->
          <button mat-button [matMenuTriggerFor]="loginMenu" #loginTrigger="matMenuTrigger" class="login-trigger-btn">
            <mat-icon>login</mat-icon>
            <span>Login</span>
          </button>

          <!-- Ausklappbares Login-Menü mit Rollen-Auswahl und Feldern -->
          <mat-menu #loginMenu="matMenu" xPosition="before" class="login-menu-panel">
            <div class="login-dropdown-container" (click)="$event.stopPropagation()">
              <div class="login-header">
                <mat-icon class="login-icon">account_circle</mat-icon>
                <span class="login-title">Anmeldung</span>
              </div>

              <!-- Option: Studierende:r oder Lehrende:r -->
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Rolle</mat-label>
                <mat-select [(ngModel)]="selectedRolle">
                  <mat-option value="STUDIERENDE">Studierende:r</mat-option>
                  <mat-option value="PROFESSOR_IN">Lehrende:r</mat-option>
                </mat-select>
              </mat-form-field>

              <!-- Eingabefeld: E-Mail -->
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>E-Mail</mat-label>
                <input matInput type="email" [(ngModel)]="email" placeholder="name@student.htw-berlin.de" />
              </mat-form-field>

              <!-- Eingabefeld: Passwort -->
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Passwort</mat-label>
                <input matInput type="password" [(ngModel)]="passwort" placeholder="Passwort" (keyup.enter)="doLogin(loginTrigger)" />
              </mat-form-field>

              <!-- Anmelde-Button -->
              <button mat-flat-button class="full-width submit-btn" (click)="doLogin(loginTrigger)">
                <mat-icon>login</mat-icon> Anmelden
              </button>

              <!-- Passwort vergessen -->
              <div class="forgot-password-container">
                <a class="forgot-password-link" href="javascript:void(0)" (click)="$event.preventDefault()">
                  Passwort vergessen?
                </a>
              </div>
            </div>
          </mat-menu>
        } @else {
          <!-- Wenn ANGEMELDET: Rolle-Badge und sichtbarer Logout-Button -->
          <div class="logged-in-badge">
            <mat-icon>{{ authService.aktuelleRolle() === 'STUDIERENDE' ? 'school' : 'psychology' }}</mat-icon>
            <span>{{ rolleLabel() }}</span>
          </div>

          <button mat-button (click)="logout()" class="logout-btn" title="Vom System abmelden">
            <mat-icon>logout</mat-icon>
            <span>Logout</span>
          </button>
        }
      </div>
    </mat-toolbar>
  `,
  styles: [`
    .header-toolbar {
      display: flex;
      align-items: center;
      gap: 1.5rem;
      position: sticky;
      top: 0;
      z-index: 1000;
      background-color: var(--htw-green, var(--mat-sys-primary)) !important;
      color: var(--mat-sys-on-primary, #121e00) !important;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);
    }

    .logo-section {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      cursor: pointer;
      font-weight: 700;
      font-size: 1.25rem;
      user-select: none;
      color: #121e00;
    }

    .logo-icon {
      font-size: 28px;
      width: 28px;
      height: 28px;
      color: #121e00;
    }

    .nav-links {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      flex-wrap: wrap;
    }

    .nav-link {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 2rem;
      padding: 0.3rem 0.7rem;
      border-radius: 0.5rem;
      color: #121e00 !important;
      text-decoration: none;
      font-weight: 600;
      font-size: 0.9rem;
      background: transparent;
      border: 1px solid transparent;
      transition: background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease;
    }

    .nav-link:hover {
      background: rgba(18, 30, 0, 0.04);
      border-color: rgba(18, 30, 0, 0.08);
      color: #121e00 !important;
    }

    .nav-link:active {
      background: rgba(18, 30, 0, 0.08);
    }

    .active-link {
      background: rgba(18, 30, 0, 0.06) !important;
      border-color: rgba(18, 30, 0, 0.08);
      color: #121e00 !important;
    }

    .spacer {
      flex: 1 1 auto;
    }

    .user-section {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .backend-status {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      padding: 0.3rem 0.6rem;
      border-radius: 999px;
      font-size: 0.72rem;
      font-weight: 600;
      line-height: 1;
      opacity: 0.88;
      background: rgba(18, 30, 0, 0.12);
      color: #121e00;
      border: 1px solid rgba(18, 30, 0, 0.12);
    }

    .backend-status__dot {
      width: 0.5rem;
      height: 0.5rem;
      border-radius: 50%;
      display: inline-block;
      background: currentColor;
      box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.2);
    }

    .backend-status--online {
      color: #1e5f00;
      background: rgba(118, 185, 0, 0.18);
    }

    .backend-status--offline {
      color: #8a1f1f;
      background: rgba(211, 47, 47, 0.12);
    }

    .login-trigger-btn {
      color: #121e00 !important;
      border: 1.5px solid rgba(18, 30, 0, 0.4) !important;
      border-radius: 20px;
      font-weight: 600;
      transition: background-color 0.2s, border-color 0.2s;
    }

    .login-trigger-btn:hover {
      background: rgba(18, 30, 0, 0.1);
      border-color: #121e00 !important;
    }

    .login-dropdown-container {
      padding: 1.25rem;
      width: 290px;
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
      box-sizing: border-box;
    }

    .login-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.5rem;
      color: #1a1a1a;
    }

    .login-icon {
      color: var(--htw-green);
    }

    .login-title {
      font-size: 1.1rem;
      font-weight: 600;
    }

    .full-width {
      width: 100%;
    }

    .submit-btn {
      margin-top: 0.5rem;
      font-weight: 600;
      background-color: var(--htw-green) !important;
      color: var(--mat-sys-on-primary, #121e00) !important;
    }

    .forgot-password-container {
      margin-top: 0.35rem;
      text-align: center;
    }

    .forgot-password-link {
      font-size: 0.8rem;
      color: #666;
      text-decoration: none;
      cursor: pointer;
      transition: color 0.2s, text-decoration 0.2s;
    }

    .forgot-password-link:hover {
      color: #3b5d00;
      text-decoration: underline;
    }

    .logged-in-badge {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      background: rgba(18, 30, 0, 0.12);
      padding: 0.35rem 0.85rem;
      border-radius: 20px;
      font-size: 0.9rem;
      font-weight: 600;
      color: #121e00;
    }

    .logout-btn {
      color: #121e00 !important;
      border: 1.5px solid rgba(18, 30, 0, 0.4) !important;
      border-radius: 20px;
      font-weight: 600;
      transition: background-color 0.2s, border-color 0.2s;
    }

    .logout-btn:hover {
      background: rgba(18, 30, 0, 0.1);
      border-color: #121e00 !important;
    }
  `]
})
export class HeaderComponent implements OnInit {
  protected readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly healthService = inject(HealthService);

  protected healthStatus: 'online' | 'offline' | 'unknown' = 'unknown';

  // Formular-Felder für das Login-Dropdown:
  protected selectedRolle: 'STUDIERENDE' | 'PROFESSOR_IN' = 'STUDIERENDE';
  protected email = '';
  protected passwort = '';

  ngOnInit(): void {
    this.healthService.getHealth().subscribe({
      next: () => {
        this.healthStatus = 'online';
      },
      error: () => {
        this.healthStatus = 'offline';
      }
    });
  }

  protected rolleLabel(): string {
    const rolle = this.authService.aktuelleRolle();
    if (rolle === 'STUDIERENDE') return 'Studierende:r';
    if (rolle === 'PROFESSOR_IN') return 'Lehrende:r';
    return '';
  }

  protected doLogin(trigger: MatMenuTrigger): void {
    this.authService.login(this.selectedRolle, this.email);
    trigger.closeMenu();
    this.email = '';
    this.passwort = '';
  }

  protected logout(): void {
    this.authService.logout();
    this.router.navigate(['/']);
  }
}