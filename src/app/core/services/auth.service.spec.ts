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

  it('sollte beim Start mit Token die Anmeldung über /api/me wiederherstellen', async () => {
    localStorage.setItem(TOKEN_KEY, 'abc');

    const fertig = service.sitzungPruefen();

    httpMock
      .expectOne('/api/me')
      .flush({ id: 1, email: 'a@b.de', role: 'STUDIERENDE', startSemester: 'WS 2026' });
    await fertig;
    expect(service.aktuelleRolle()).toBe('STUDIERENDE');
    expect(service.email()).toBe('a@b.de');
  });

  it('sollte erst fertig sein, wenn /api/me geantwortet hat', async () => {
    localStorage.setItem(TOKEN_KEY, 'abc');
    let istFertig = false;

    const fertig = service.sitzungPruefen().then(() => {
      istFertig = true;
    });
    await Promise.resolve();
    // Noch keine Antwort: Der App-Start muss weiter warten.
    expect(istFertig).toBe(false);

    httpMock
      .expectOne('/api/me')
      .flush({ id: 1, email: 'p@b.de', role: 'PROFESSOR_IN', startSemester: null });
    await fertig;
    expect(istFertig).toBe(true);
    expect(service.aktuelleRolle()).toBe('PROFESSOR_IN');
  });

  it('sollte bei 401 von /api/me abgemeldet bleiben', async () => {
    localStorage.setItem(TOKEN_KEY, 'abgelaufen');

    const fertig = service.sitzungPruefen();

    httpMock.expectOne('/api/me').flush(null, { status: 401, statusText: 'Unauthorized' });
    await fertig;
    expect(service.aktuelleRolle()).toBeNull();
    expect(service.email()).toBe('');
  });

  it('sollte auch fertig werden, wenn das Backend nicht erreichbar ist', async () => {
    localStorage.setItem(TOKEN_KEY, 'abc');

    const fertig = service.sitzungPruefen();

    httpMock.expectOne('/api/me').error(new ProgressEvent('error'), { status: 0 });
    await fertig;
    // App startet trotzdem, die Person gilt als abgemeldet.
    expect(service.aktuelleRolle()).toBeNull();
  });

  it('sollte ohne Token abgemeldet bleiben und keine Anfrage senden', async () => {
    await service.sitzungPruefen();

    httpMock.expectNone('/api/me');
    expect(service.aktuelleRolle()).toBeNull();
    expect(service.email()).toBe('');
  });
});