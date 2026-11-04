import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { TOKEN_KEY } from '../services/auth.service';
import { authGuard } from './auth.guard';

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

