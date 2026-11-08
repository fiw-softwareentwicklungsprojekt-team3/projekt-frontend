import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService, TOKEN_KEY } from './auth.service';

/** Prüft Login, Logout und die Wiederherstellung der Anmeldung beim Start. */
describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('sollte nach dem Login Rolle, E-Mail und Token setzen', () => {
    service.login('a@b.de', 'geheim123').subscribe();

    const req = httpMock.expectOne('/api/auth/login');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'a@b.de', password: 'geheim123' });
    req.flush({ token: 'abc', expiresIn: 3600, role: 'PROFESSOR_IN' });

    expect(service.aktuelleRolle()).toBe('PROFESSOR_IN');
    expect(service.email()).toBe('a@b.de');
    expect(service.getToken()).toBe('abc');
  });

  it('sollte bei falschen Daten nichts speichern', () => {
    service.login('a@b.de', 'falsch').subscribe({ error: () => undefined });

    httpMock.expectOne('/api/auth/login').flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(service.aktuelleRolle()).toBeNull();
    expect(service.getToken()).toBeNull();
  });

  it('sollte beim Logout Token und Zustand löschen', () => {
    service.login('a@b.de', 'geheim123').subscribe();
    httpMock
      .expectOne('/api/auth/login')
      .flush({ token: 'abc', expiresIn: 3600, role: 'STUDIERENDE' });

    service.logout();

    expect(service.aktuelleRolle()).toBeNull();
    expect(service.email()).toBe('');
    expect(service.getToken()).toBeNull();
  });

  it('sollte beim Start mit gültigem JWT die Anmeldung wiederherstellen', () => {
    const payload = btoa(JSON.stringify({ email: 'a@b.de', rolle: 'STUDIERENDE' }));
    localStorage.setItem(TOKEN_KEY, `header.${payload}.sig`);

    service.sitzungPruefen();

    expect(service.aktuelleRolle()).toBe('STUDIERENDE');
    expect(service.email()).toBe('a@b.de');
  });

  it('sollte beim Start mit abgelaufenem JWT das Token löschen', () => {
    const abgelaufen = Math.floor(Date.now() / 1000) - 60;
    const payload = btoa(JSON.stringify({ email: 'a@b.de', rolle: 'STUDIERENDE', exp: abgelaufen }));
    localStorage.setItem(TOKEN_KEY, `header.${payload}.sig`);

    service.sitzungPruefen();

    expect(service.aktuelleRolle()).toBeNull();
    expect(service.getToken()).toBeNull();
  });

  it('sollte ohne Token abgemeldet bleiben', () => {
    service.sitzungPruefen();

    expect(service.aktuelleRolle()).toBeNull();
    expect(service.email()).toBe('');
  });
});