import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { vi } from 'vitest';
import { AuthService } from '../../services/auth.service';
import { APP_BREAKPOINTS } from '../breakpoints';
import { HeaderComponent } from './header.component';

/**
 * Prüft die zweistufige E-Mail-Prüfung im Login-Menü (US-27):
 * 1. Ist die Eingabe überhaupt eine E-Mail-Adresse?
 * 2. Gehört sie zu @student.htw-berlin.de oder @htw-berlin.de?
 */
describe('HeaderComponent – E-Mail-Prüfung beim Login', () => {
  let fixture: ComponentFixture<HeaderComponent>;
  let httpMock: HttpTestingController;

  const FORMAT_FEHLER = 'Bitte eine gültige E-Mail-Adresse eingeben.';
  const DOMAIN_FEHLER =
    'Bitte eine gültige HTW-E-Mail-Adresse (@student.htw-berlin.de oder @htw-berlin.de) eingeben.';

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [HeaderComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([
          { path: 'dashboard', children: [] },
          { path: 'modules', children: [] },
        ]),
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(HeaderComponent);
    fixture.detectChanges();
    // Der Header fragt beim Start den Backend-Status ab.
    httpMock.expectOne('/api/health').flush({ status: 'UP' });

    // Das Login-Formular liegt in einem Menü und existiert erst, wenn das Menü offen ist.
    (fixture.nativeElement.querySelector('.login-trigger-btn') as HTMLButtonElement).click();
    fixture.detectChanges();
    await fixture.whenStable();
  });

  afterEach(() => {
    httpMock.verify();
  });

  /** Das Menü wird außerhalb der Komponente im Dokument angezeigt, deshalb die Suche über document. */
  function imMenue<T extends Element>(selector: string): T {
    return document.querySelector(`.login-dropdown-container ${selector}`) as T;
  }

  /** Tippt einen Wert in ein Feld und verlässt es, damit Fehlermeldungen sichtbar werden. */
  async function eingeben(name: string, wert: string): Promise<void> {
    const feld = imMenue<HTMLInputElement>(`input[name="${name}"]`);
    feld.value = wert;
    feld.dispatchEvent(new Event('input'));
    feld.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
    await fixture.whenStable();
  }

  /** Füllt E-Mail und ein gültiges Passwort aus. */
  async function formularAusfuellen(email: string): Promise<void> {
    await eingeben('email', email);
    await eingeben('password', 'geheim123');
  }

  /** Texte aller sichtbaren Fehlermeldungen unter den Feldern. */
  function fehlermeldungen(): string[] {
    const elemente = document.querySelectorAll('.login-dropdown-container mat-error');
    return Array.from(elemente).map((e) => e.textContent?.trim() ?? '');
  }

  function anmeldenButton(): HTMLButtonElement {
    return imMenue<HTMLButtonElement>('.submit-btn');
  }

  it.each(['max.mustermann', 'max@'])(
    'zeigt bei ungültigem E-Mail-Format (%s) nur die allgemeine Meldung',
    async (email) => {
      await formularAusfuellen(email);

      expect(fehlermeldungen()).toEqual([FORMAT_FEHLER]);
      expect(anmeldenButton().disabled).toBe(true);
    },
  );

  it.each(['name@gmail.com', 'name@fakestudent.htw-berlin.de', 'htw-berlin.de@gmail.com'])(
    'zeigt bei gültiger E-Mail ohne HTW-Domain (%s) die HTW-Meldung',
    async (email) => {
      await formularAusfuellen(email);

      expect(fehlermeldungen()).toEqual([DOMAIN_FEHLER]);
      expect(anmeldenButton().disabled).toBe(true);
    },
  );

  it.each(['name@student.htw-berlin.de', 'name@htw-berlin.de', 'Name@HTW-Berlin.de'])(
    'akzeptiert die HTW-Adresse %s und gibt den Button frei',
    async (email) => {
      await formularAusfuellen(email);

      expect(fehlermeldungen()).toEqual([]);
      expect(anmeldenButton().disabled).toBe(false);
    },
  );

  it('sendet den Login mit einer Lehrenden-Adresse ans Backend', async () => {
    await formularAusfuellen('name@htw-berlin.de');

    anmeldenButton().click();

    const req = httpMock.expectOne('/api/auth/login');
    expect(req.request.body).toEqual({ email: 'name@htw-berlin.de', password: 'geheim123' });
    req.flush({ token: 'abc', expiresIn: 3600, role: 'PROFESSOR_IN' });
    fixture.detectChanges();
    await fixture.whenStable();
    // Lehrende landen nach dem Login im Dashboard.
    expect(TestBed.inject(Router).url).toBe('/dashboard');
    localStorage.clear();
  });

  // Studierende landen nach dem Login im Modulkatalog (AuthService.startseite()).
  it('leitet Studierende nach dem Login in den Modulkatalog', async () => {
    await formularAusfuellen('name@student.htw-berlin.de');

    anmeldenButton().click();

    httpMock
      .expectOne('/api/auth/login')
      .flush({ token: 'abc', expiresIn: 3600, role: 'STUDIERENDE' });
    fixture.detectChanges();
    await fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/modules');
    localStorage.clear();
  });

  it('zeigt die Feldmeldung des Backends an, falls es die Adresse trotzdem ablehnt (400)', async () => {
    await formularAusfuellen('name@student.htw-berlin.de');
    anmeldenButton().click();

    // Antwort im Fehlerformat des Backends (US-28): errors[] mit field und message.
    const backendMeldung = 'email muss auf @student.htw-berlin.de oder @htw-berlin.de enden';
    httpMock.expectOne('/api/auth/login').flush(
      {
        status: 400,
        message: 'Die Eingabe ist ungültig. Bitte prüfe die markierten Felder.',
        errors: [{ field: 'email', message: backendMeldung }],
      },
      { status: 400, statusText: 'Bad Request' },
    );
    fixture.detectChanges();
    await fixture.whenStable();

    expect(imMenue<HTMLElement>('.login-fehler').textContent?.trim()).toBe(backendMeldung);
  });
});

describe('HeaderComponent – Responsive Navigation (< 960 px)', () => {
  let fixture: ComponentFixture<HeaderComponent>;
  let httpMock: HttpTestingController;
  let authService: AuthService;
  let breakpointSubject: BehaviorSubject<BreakpointState>;
  let observeSpy: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    localStorage.clear();
    breakpointSubject = new BehaviorSubject<BreakpointState>({
      matches: false,
      breakpoints: {},
    });
    observeSpy = vi.fn().mockReturnValue(breakpointSubject.asObservable());

    await TestBed.configureTestingModule({
      imports: [HeaderComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([
          { path: 'dashboard', children: [] },
          { path: 'modules', children: [] },
          { path: 'plan', children: [] },
          { path: 'profile', children: [] },
          { path: 'login', children: [] },
        ]),
        {
          provide: BreakpointObserver,
          useValue: { observe: observeSpy },
        },
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AuthService);
    fixture = TestBed.createComponent(HeaderComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/health').flush({ status: 'UP' });
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  function anmeldenAls(rolle: 'STUDIERENDE' | 'PROFESSOR_IN', email: string): void {
    authService.aktuelleRolle.set(rolle);
    authService.email.set(email);
    fixture.detectChanges();
  }

  async function mobileMenueOeffnen(): Promise<HTMLElement> {
    const button = fixture.nativeElement.querySelector('.mobile-menu-btn') as HTMLButtonElement;
    expect(button).toBeTruthy();
    button.click();
    fixture.detectChanges();
    await fixture.whenStable();
    const panel = document.querySelector('.mobile-nav-menu-panel') as HTMLElement;
    expect(panel).toBeTruthy();
    return panel;
  }

  it('zeigt bei Desktop-Breite (>= 960 px) die reguläre Navigation ohne Menü-Button', () => {
    anmeldenAls('STUDIERENDE', 'stud@student.htw-berlin.de');

    expect(observeSpy).toHaveBeenCalledWith(APP_BREAKPOINTS.compactNav);

    const element = fixture.nativeElement as HTMLElement;
    const nav = element.querySelector('.nav-links');
    expect(nav).toBeTruthy();
    expect(nav?.textContent).toContain('Module');
    expect(nav?.textContent).toContain('Mein Studienplan');
    expect(element.querySelector('.profile-btn')).toBeTruthy();
    expect(element.querySelector('.logout-btn')).toBeTruthy();
    expect(element.querySelector('.mobile-menu-btn')).toBeNull();
  });

  it('zeigt unter 960 px (Mobil & Tablet) für Studierende den Menü-Button mit allen Menüpunkten und ermöglicht Logout', async () => {
    breakpointSubject.next({
      matches: true,
      breakpoints: { [APP_BREAKPOINTS.compactNav]: true },
    });
    anmeldenAls('STUDIERENDE', 'stud@student.htw-berlin.de');

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.nav-links')).toBeNull();

    const panel = await mobileMenueOeffnen();
    expect(panel.textContent).toContain('Studierende:r');
    expect(panel.textContent).toContain('stud@student.htw-berlin.de');
    expect(panel.textContent).toContain('Module');
    expect(panel.textContent).toContain('Mein Studienplan');
    expect(panel.textContent).toContain('Profil');
    expect(panel.textContent).toContain('Logout');

    const logoutItem = panel.querySelector('.mobile-logout-item') as HTMLButtonElement;
    logoutItem.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(authService.aktuelleRolle()).toBeNull();
    expect(TestBed.inject(Router).url).toBe('/login');
  });

  it('zeigt unter 960 px (Mobil & Tablet) für Lehrende alle Menüpunkte im Mobile-Menü', async () => {
    breakpointSubject.next({
      matches: true,
      breakpoints: { [APP_BREAKPOINTS.compactNav]: true },
    });
    anmeldenAls('PROFESSOR_IN', 'prof@htw-berlin.de');

    const panel = await mobileMenueOeffnen();
    expect(panel.textContent).toContain('Lehrende:r');
    expect(panel.textContent).toContain('prof@htw-berlin.de');
    expect(panel.textContent).toContain('Dashboard');
    expect(panel.textContent).toContain('Modulangebote');
    expect(panel.textContent).toContain('Profil');
    expect(panel.textContent).toContain('Logout');
  });

  it('zeigt unter 960 px abgemeldet den Login-Button und verschiebt den Sitzungshinweis ins Banner', () => {
    breakpointSubject.next({
      matches: true,
      breakpoints: { [APP_BREAKPOINTS.compactNav]: true },
    });
    authService.sitzungAbgelaufen.set(true);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.login-trigger-btn')).toBeTruthy();
    expect(element.querySelector('.user-section .session-hinweis')).toBeNull();
    const banner = element.querySelector('.session-hinweis-banner');
    expect(banner?.textContent).toContain('Sitzung abgelaufen. Bitte erneut anmelden.');
  });

  it('wechselt reaktiv von Desktop- auf kompakte Navigation bei Breite < 960 px', () => {
    anmeldenAls('STUDIERENDE', 'stud@student.htw-berlin.de');

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.nav-links')).toBeTruthy();
    expect(element.querySelector('.mobile-menu-btn')).toBeNull();

    breakpointSubject.next({
      matches: true,
      breakpoints: { [APP_BREAKPOINTS.compactNav]: true },
    });
    fixture.detectChanges();

    expect(element.querySelector('.nav-links')).toBeNull();
    expect(element.querySelector('.mobile-menu-btn')).toBeTruthy();
  });
});
