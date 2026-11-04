import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService, TOKEN_KEY } from '../services/auth.service';
import { authInterceptor } from './auth.interceptor';

/** Prüft, dass der Interceptor das Token anhängt und nur bei 401 abmeldet. */
describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let authService: AuthService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'login', children: [] }]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AuthService);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('sollte das Token als Bearer-Header anhängen', () => {
    localStorage.setItem(TOKEN_KEY, 'abc');
    http.get('/api/modules').subscribe();

    const req = httpMock.expectOne('/api/modules');
    expect(req.request.headers.get('Authorization')).toBe('Bearer abc');
    req.flush([]);
  });

  it('sollte bei Login und Registrierung keinen Header anhängen', () => {
    localStorage.setItem(TOKEN_KEY, 'abc');
    http.post('/api/auth/login', {}).subscribe();
    http.post('/api/auth/register', {}).subscribe();

    expect(httpMock.expectOne('/api/auth/login').request.headers.has('Authorization')).toBe(false);
    expect(httpMock.expectOne('/api/auth/register').request.headers.has('Authorization')).toBe(
      false,
    );
  });

  it('sollte bei 401 abmelden und den Hinweis setzen', () => {
    localStorage.setItem(TOKEN_KEY, 'abc');
    authService.aktuelleRolle.set('STUDIERENDE');
    http.get('/api/modules').subscribe({ error: () => undefined });

    httpMock.expectOne('/api/modules').flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(authService.aktuelleRolle()).toBeNull();
    expect(authService.getToken()).toBeNull();
    expect(authService.sitzungAbgelaufen()).toBe(true);
  });

  it('sollte bei 403 nicht abmelden', () => {
    localStorage.setItem(TOKEN_KEY, 'abc');
    authService.aktuelleRolle.set('STUDIERENDE');
    http.get('/api/plan').subscribe({ error: () => undefined });

    httpMock.expectOne('/api/plan').flush(null, { status: 403, statusText: 'Forbidden' });

    expect(authService.aktuelleRolle()).toBe('STUDIERENDE');
  });
});