import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { RegistrationService } from './registration.service';

describe('RegistrationService', () => {
  let service: RegistrationService;
  let httpMock: HttpTestingController;
  const anfrage = { email: 'a@student.htw-berlin.de', password: 'geheim123', startsemester: 'WS 2025' };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(RegistrationService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify()); // keine offenen Anfragen

  it('sollte bei Erfolg die angelegte Person liefern', () => {
    service.register(anfrage).subscribe((res) => expect(res.id).toBe(1));

    const req = httpMock.expectOne('/api/auth/register');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(anfrage);
    req.flush({ id: 1, email: 'a@student.htw-berlin.de', role: 'STUDIERENDE', startsemester: 'WS 2025' });
  });

  it('sollte bei 409 den Status liefern', () => {
    service.register(anfrage).subscribe({
      error: (e) => expect(e.status).toBe(409),
    });

    httpMock
      .expectOne('/api/auth/register')
      .flush(
        { field: 'email', message: 'E-Mail ist bereits vergeben' },
        { status: 409, statusText: 'Conflict' },
      );
  });

  it('sollte bei 400 den Feldfehler liefern', () => {
    service.register(anfrage).subscribe({
      error: (e) => expect(e.error.field).toBe('password'),
    });

    httpMock
      .expectOne('/api/auth/register')
      .flush(
        { field: 'password', message: 'password muss mindestens 8 Zeichen haben' },
        { status: 400, statusText: 'Bad Request' },
      );
  });

  it('sollte bei 400 im neuen Format die Fehlerliste liefern', () => {
    service.register(anfrage).subscribe({
      error: (e) => expect(e.error.errors[0].field).toBe('password'),
    });

    httpMock.expectOne('/api/auth/register').flush(
      {
        message: 'Die Eingabe ist ungültig.',
        errors: [{ field: 'password', message: 'Passwort zu kurz' }],
      },
      { status: 400, statusText: 'Bad Request' },
    );
  });

  describe('registerProfessor', () => {
    const profAnfrage = {
      email: 'prof@htw-berlin.de',
      password: 'geheimesPasswort',
      code: 'K7MPX4QRT9WZ',
    };

    it('sollte bei Erfolg (201) das angelegte Lehrenden-Konto liefern', () => {
      service.registerProfessor(profAnfrage).subscribe((res) => {
        expect(res).toEqual({
          id: 42,
          email: 'prof@htw-berlin.de',
          role: 'PROFESSOR_IN',
        });
      });

      const req = httpMock.expectOne('/api/auth/register/professor');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(profAnfrage);
      req.flush({ id: 42, email: 'prof@htw-berlin.de', role: 'PROFESSOR_IN' }, { status: 201, statusText: 'Created' });
    });

    it('sollte bei ungültigem Einladungscode (400) den Feldfehler für code liefern', () => {
      service.registerProfessor(profAnfrage).subscribe({
        error: (e) => {
          expect(e.status).toBe(400);
          expect(e.error.errors).toEqual([{ field: 'code', message: 'Der Einladungscode ist ungültig.' }]);
        },
      });

      httpMock.expectOne('/api/auth/register/professor').flush(
        {
          message: 'Der Einladungscode ist ungültig.',
          errors: [{ field: 'code', message: 'Der Einladungscode ist ungültig.' }],
        },
        { status: 400, statusText: 'Bad Request' },
      );
    });

    it('sollte bei vergebener E-Mail (409) den Status liefern', () => {
      service.registerProfessor(profAnfrage).subscribe({
        error: (e) => expect(e.status).toBe(409),
      });

      httpMock.expectOne('/api/auth/register/professor').flush(
        { message: 'Diese E-Mail-Adresse ist bereits vergeben.' },
        { status: 409, statusText: 'Conflict' },
      );
    });
  });
});
