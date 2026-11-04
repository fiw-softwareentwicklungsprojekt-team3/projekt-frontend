import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule, NgForm } from '@angular/forms';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule, MatMenuTrigger } from '@angular/material/menu';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { AuthService } from '../../services/auth.service';
import { HealthService } from '../../services/health.service';
import { ApiFehler } from '../../services/registration.service';

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
  protected readonly loginFeldFehler = signal<Record<string, string>>({});

  /** Setzt alte Fehlermeldungen zurück, sobald eine Eingabe geändert wird. */
  protected eingabeGeaendert(feld: string): void {
    this.loginFehler.set('');
    if (this.loginFeldFehler()[feld]) {
      this.loginFeldFehler.update((aktuell) => {
        const kopie = { ...aktuell };
        delete kopie[feld];
        return kopie;
      });
    }
  }

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
  protected doLogin(trigger: MatMenuTrigger, form?: NgForm): void {
    this.loginFehler.set('');
    this.loginFeldFehler.set({});
    this.authService.login(this.email(), this.passwort()).subscribe({
      next: () => {
        trigger.closeMenu();
        this.email.set('');
        this.passwort.set('');
        form?.resetForm({ email: '', password: '' });
        void this.router.navigate(['/']);
      },
      error: (fehler: HttpErrorResponse) => {
        this.passwort.set('');
        form?.controls['password']?.reset('');
        this.loginFehlerZuordnen(fehler);
      }
    });
  }

  private loginFehlerZuordnen(fehler: HttpErrorResponse): void {
    const body = fehler.error as ApiFehler | null;
    const neu: Record<string, string> = {};

    if (fehler.status === 400 && body?.errors?.length) {
      body.errors.forEach((e) => (neu[e.field] = e.message));
      this.loginFeldFehler.set(neu);
      return;
    }

    if (fehler.status === 401 || fehler.status === 400) {
      this.loginFehler.set(body?.message || 'E-Mail oder Passwort falsch');
      return;
    }

    if (fehler.status === 0) {
      this.loginFehler.set('Der Server ist gerade nicht erreichbar. Bitte später erneut versuchen.');
      return;
    }

    this.loginFehler.set(body?.message || 'Anmeldung nicht möglich. Bitte später erneut versuchen.');
  }

  protected logout(): void {
    this.authService.logout();
    void this.router.navigate(['/login']);
  }
}