import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ProfileComponent } from './profile.component';

describe('ProfileComponent', () => {
  let fixture: ComponentFixture<ProfileComponent>;
  let authService: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [ProfileComponent, MatSnackBarModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideAnimationsAsync(),
      ],
    }).compileComponents();

    authService = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('sollte E-Mail, Rolle und das Startsemester-Formular für Studierende anzeigen', () => {
    authService.aktuelleRolle.set('STUDIERENDE');
    authService.email.set('s12345@student.htw-berlin.de');
    authService.startSemester.set('WS 2024');

    fixture = TestBed.createComponent(ProfileComponent);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent;
    expect(text).toContain('s12345@student.htw-berlin.de');
    expect(text).toContain('Studierende:r');
    expect(fixture.nativeElement.querySelector('.semester-form')).toBeTruthy();
  });

  it('sollte E-Mail und Rolle für Lehrende anzeigen, aber kein Startsemester-Formular', () => {
    authService.aktuelleRolle.set('PROFESSOR_IN');
    authService.email.set('prof@htw-berlin.de');
    authService.startSemester.set(null);

    fixture = TestBed.createComponent(ProfileComponent);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent;
    expect(text).toContain('prof@htw-berlin.de');
    expect(text).toContain('Lehrende:r');
    expect(fixture.nativeElement.querySelector('.semester-form')).toBeNull();
  });

  it('sollte das gewählte Startsemester über PUT /api/me speichern und das Signal in AuthService aktualisieren', async () => {
    authService.aktuelleRolle.set('STUDIERENDE');
    authService.email.set('s12345@student.htw-berlin.de');
    authService.startSemester.set('WS 2024');

    fixture = TestBed.createComponent(ProfileComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance['gewaehlteSemester'] = 'WS 2025';
    fixture.detectChanges();

    const submitBtn = fixture.nativeElement.querySelector('.speichern-btn') as HTMLButtonElement;
    submitBtn.click();
    fixture.detectChanges();

    const req = httpMock.expectOne('/api/me');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ startSemester: 'WS 2025' });

    req.flush({
      id: 1,
      email: 's12345@student.htw-berlin.de',
      role: 'STUDIERENDE',
      startSemester: 'WS 2025',
    });
    fixture.detectChanges();

    expect(authService.startSemester()).toBe('WS 2025');
  });

  it('sollte Backend-Fehlermeldung (body.message) am Feld anzeigen', async () => {
    authService.aktuelleRolle.set('STUDIERENDE');
    authService.email.set('s12345@student.htw-berlin.de');
    authService.startSemester.set('WS 2024');

    fixture = TestBed.createComponent(ProfileComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const submitBtn = fixture.nativeElement.querySelector('.speichern-btn') as HTMLButtonElement;
    submitBtn.click();

    const req = httpMock.expectOne('/api/me');
    req.flush(
      {
        message: 'Startsemester kann nicht geändert werden, da bereits Leistungen vorliegen.',
      },
      { status: 400, statusText: 'Bad Request' },
    );
    fixture.detectChanges();

    const fehlerEl = fixture.nativeElement.querySelector('.field-error');
    expect(fehlerEl).toBeTruthy();
    expect(fehlerEl.textContent).toContain('Startsemester kann nicht geändert werden, da bereits Leistungen vorliegen.');
  });
});
