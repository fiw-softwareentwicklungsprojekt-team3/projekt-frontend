import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, CanActivateFn, Router, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { AuthService, TOKEN_KEY } from '../services/auth.service';
import { authGuard, rolleGuard, startseiteGuard } from './auth.guard';

describe('authGuard', () => {
  const dummyRoute = {} as ActivatedRouteSnapshot;
  const dummyState = { url: '/modules' } as RouterStateSnapshot;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient()],
    });
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('sollte Zugriff erlauben, wenn ein Token gespeichert ist', () => {
    localStorage.setItem(TOKEN_KEY, 'gueltiges-token');

    const ergebnis = TestBed.runInInjectionContext(() => authGuard(dummyRoute, dummyState));

    expect(ergebnis).toBe(true);
  });

  it('sollte ohne Token nach /login weiterleiten', () => {
    const router = TestBed.inject(Router);

    const ergebnis = TestBed.runInInjectionContext(() => authGuard(dummyRoute, dummyState));

    expect(ergebnis instanceof UrlTree).toBe(true);
    expect(router.serializeUrl(ergebnis as UrlTree)).toBe('/login');
  });
});

describe('rolleGuard und startseiteGuard', () => {
  const dummyRoute = {} as ActivatedRouteSnapshot;
  const dummyState = { url: '/dashboard' } as RouterStateSnapshot;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient()],
    });
  });

  afterEach(() => {
    localStorage.clear();
  });

  const pruefe = (guard: CanActivateFn) =>
    TestBed.runInInjectionContext(() => guard(dummyRoute, dummyState));

  const alsAngemeldet = (rolle: 'STUDIERENDE' | 'PROFESSOR_IN') => {
    localStorage.setItem(TOKEN_KEY, 'token');
    TestBed.inject(AuthService).aktuelleRolle.set(rolle);
  };

  const url = (ergebnis: unknown) =>
    TestBed.inject(Router).serializeUrl(ergebnis as UrlTree);

  it('sollte ohne Anmeldung auf /login leiten', () => {
    expect(url(pruefe(rolleGuard('PROFESSOR_IN')))).toBe('/login');
  });

  it('sollte trotz Token auf /login leiten, wenn keine Rolle geladen werden konnte', () => {
    localStorage.setItem(TOKEN_KEY, 'token');

    expect(url(pruefe(rolleGuard('PROFESSOR_IN')))).toBe('/login');
  });

  // Das Token ist noch gespeichert, aber GET /api/me ist beim Start fehlgeschlagen (Rolle bleibt leer).
  it('sollte trotz Token auf /login leiten, wenn keine Rolle geladen werden konnte', () => {
    localStorage.setItem(TOKEN_KEY, 'token');

    expect(url(pruefe(rolleGuard('PROFESSOR_IN')))).toBe('/login');
  });

  it('sollte STUDIERENDE auf /dashboard nach /modules umleiten', () => {
    alsAngemeldet('STUDIERENDE');

    expect(url(pruefe(rolleGuard('PROFESSOR_IN')))).toBe('/modules');
  });

  it('sollte PROFESSOR_IN auf /plan nach /dashboard umleiten', () => {
    alsAngemeldet('PROFESSOR_IN');

    expect(url(pruefe(rolleGuard('STUDIERENDE')))).toBe('/dashboard');
  });

  it('sollte die passende Rolle durchlassen', () => {
    alsAngemeldet('PROFESSOR_IN');

    expect(pruefe(rolleGuard('PROFESSOR_IN'))).toBe(true);
  });

  it('sollte PROFESSOR_IN von der Startseite ins Dashboard leiten', () => {
    alsAngemeldet('PROFESSOR_IN');

    expect(url(pruefe(startseiteGuard))).toBe('/dashboard');
  });

  // Nicht angemeldete Personen sehen auf /, /login und /register das Registrierungsformular.
  it('sollte nicht angemeldete Personen auf der Startseite lassen', () => {
    expect(pruefe(startseiteGuard)).toBe(true);
  });

  it('sollte STUDIERENDE auf der Startseite lassen', () => {
    alsAngemeldet('STUDIERENDE');

    expect(pruefe(startseiteGuard)).toBe(true);
  });
});
