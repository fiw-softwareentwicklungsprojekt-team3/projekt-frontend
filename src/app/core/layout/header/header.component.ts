import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule, MatMenuTrigger } from '@angular/material/menu';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { AuthService } from '../../services/auth.service';
import { HealthService } from '../../services/health.service';

/**
 * Kopfzeile der App: Navigation nach Rolle, Backend-Status sowie Login-Menü und Logout.
 */
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
    MatInputModule
  ],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent implements OnInit {
  protected readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly healthService = inject(HealthService);

  protected healthStatus: 'online' | 'offline' | 'unknown' = 'unknown';

  // Formular-Felder für das Login-Dropdown (Signals, damit die Anzeige zoneless aktualisiert wird):
  protected readonly email = signal('');
  protected readonly passwort = signal('');
  /** Fehlermeldung des letzten Login-Versuchs, leer wenn kein Fehler vorliegt. */
  protected readonly loginFehler = signal('');

  /** Fragt beim Start, ob das Backend erreichbar ist. */
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

  /** Liefert den angezeigten Namen der Rolle. */
  protected rolleLabel(): string {
    const rolle = this.authService.aktuelleRolle();
    if (rolle === 'STUDIERENDE') return 'Studierende:r';
    if (rolle === 'PROFESSOR_IN') return 'Lehrende:r';
    return '';
  }

  /**
   * Meldet die Person mit den eingegebenen Daten an.
   * Bei Erfolg schließt das Menü, bei einem Fehler erscheint eine Meldung.
   */
  protected doLogin(trigger: MatMenuTrigger): void {
    this.loginFehler.set('');
    this.authService.login(this.email(), this.passwort()).subscribe({
      next: () => {
        trigger.closeMenu();
        this.email.set('');
        this.passwort.set('');
      },
      error: (fehler: HttpErrorResponse) => {
        // Das Passwort wird nach einem Fehler immer geleert.
        this.passwort.set('');
        this.loginFehler.set(this.loginFehlerText(fehler));
      }
    });
  }

  /** Wählt die Fehlermeldung passend zum Status der Antwort. */
  private loginFehlerText(fehler: HttpErrorResponse): string {
    // 400 (leere oder ungültige Eingabe) und 401 (falsche Daten) bekommen dieselbe Meldung.
    if (fehler.status === 400 || fehler.status === 401) {
      return 'E-Mail oder Passwort falsch';
    }
    // Status 0: keine Antwort vom Server.
    if (fehler.status === 0) {
      return 'Der Server ist gerade nicht erreichbar. Bitte später erneut versuchen.';
    }
    return 'Anmeldung nicht möglich. Bitte später erneut versuchen.';
  }

  /** Meldet ab und öffnet die Startseite. */
  protected logout(): void {
    this.authService.logout();
    this.router.navigate(['/']);
  }
}