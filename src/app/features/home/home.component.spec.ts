import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HomeComponent } from './home.component';

/**
 * Prüft die zweistufige E-Mail-Prüfung im Registrierungsformular (US-27):
 * 1. Ist die Eingabe überhaupt eine E-Mail-Adresse?
 * 2. Gehört sie zu @student.htw-berlin.de?
 */
describe('HomeComponent – E-Mail-Prüfung bei der Registrierung', () => {
  let fixture: ComponentFixture<HomeComponent>;
  let httpMock: HttpTestingController;

  const FORMAT_FEHLER = 'Bitte eine gültige E-Mail-Adresse eingeben.';
  const DOMAIN_FEHLER = 'Bitte eine gültige HTW-E-Mail-Adresse (@student.htw-berlin.de) eingeben.';

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(HomeComponent);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  afterEach(() => {
    httpMock.verify();
  });

  /** Tippt einen Wert in ein Feld und verlässt es, damit Fehlermeldungen sichtbar werden. */
  async function eingeben(name: string, wert: string): Promise<void> {
    const feld = fixture.nativeElement.querySelector(`input[name="${name}"]`) as HTMLInputElement;
    feld.value = wert;
    feld.dispatchEvent(new Event('input'));
    feld.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
    await fixture.whenStable();
  }

  /** Füllt E-Mail und ein gültiges Passwort aus. Das Startsemester ist schon vorausgewählt. */
  async function formularAusfuellen(email: string): Promise<void> {
    await eingeben('email', email);
    await eingeben('passwort', 'geheim123');
  }

  /** Texte aller sichtbaren Fehlermeldungen unter den Feldern. */
  function fehlermeldungen(): string[] {
    const elemente = fixture.nativeElement.querySelectorAll('mat-error') as NodeListOf<HTMLElement>;
    return Array.from(elemente).map((e) => e.textContent?.trim() ?? '');
  }

  function registrierenButton(): HTMLButtonElement {
    return fixture.nativeElement.querySelector('.register-btn') as HTMLButtonElement;
  }

  it.each(['max.mustermann', 'max@'])(
    'zeigt bei ungültigem E-Mail-Format (%s) nur die allgemeine Meldung',
    async (email) => {
      await formularAusfuellen(email);

      expect(fehlermeldungen()).toEqual([FORMAT_FEHLER]);
      expect(registrierenButton().disabled).toBe(true);
    },
  );

  it.each([
    'name@gmail.com',
    'name@htw-berlin.de',
    'name@fakestudent.htw-berlin.de',
    'student.htw-berlin.de@gmail.com',
  ])('zeigt bei gültiger E-Mail ohne Studierenden-Domain (%s) die HTW-Meldung', async (email) => {
    await formularAusfuellen(email);

    expect(fehlermeldungen()).toEqual([DOMAIN_FEHLER]);
    expect(registrierenButton().disabled).toBe(true);
  });

  it.each(['name@student.htw-berlin.de', 'Name@Student.HTW-Berlin.de'])(
    'akzeptiert die HTW-Adresse %s und gibt den Button frei',
    async (email) => {
      await formularAusfuellen(email);

      expect(fehlermeldungen()).toEqual([]);
      expect(registrierenButton().disabled).toBe(false);
    },
  );

  it('sendet die Registrierung mit einer gültigen HTW-Adresse ans Backend', async () => {
    await formularAusfuellen('name@student.htw-berlin.de');

    registrierenButton().click();

    const req = httpMock.expectOne('/api/auth/register');
    expect(req.request.body.email).toBe('name@student.htw-berlin.de');
    req.flush({ id: 1, email: 'name@student.htw-berlin.de', role: 'STUDIERENDE', startsemester: 'WS 2026' });
  });

  it('zeigt die Feldmeldung des Backends an, falls es die Adresse trotzdem ablehnt (400)', async () => {
    await formularAusfuellen('name@student.htw-berlin.de');
    registrierenButton().click();

    // Antwort im Fehlerformat des Backends (US-28): errors[] mit field und message.
    httpMock.expectOne('/api/auth/register').flush(
      {
        status: 400,
        message: 'Die Eingabe ist ungültig. Bitte prüfe die markierten Felder.',
        errors: [{ field: 'email', message: 'email muss auf @student.htw-berlin.de enden' }],
      },
      { status: 400, statusText: 'Bad Request' },
    );
    fixture.detectChanges();
    await fixture.whenStable();

    const meldung = fixture.nativeElement.querySelector('.fehler') as HTMLElement;
    expect(meldung.textContent?.trim()).toBe('email muss auf @student.htw-berlin.de enden');
  });

  it('zeigt nach erfolgreicher Registrierung die Erfolgsmeldung ohne Validierungsfehler an und blendet sie beim Fokussieren eines Feldes aus', async () => {
    await formularAusfuellen('name@student.htw-berlin.de');
    registrierenButton().click();

    httpMock.expectOne('/api/auth/register').flush({
      id: 1,
      email: 'name@student.htw-berlin.de',
      role: 'STUDIERENDE',
      startsemester: 'WS 2026',
    });
    fixture.detectChanges();
    await fixture.whenStable();

    const erfolg = fixture.nativeElement.querySelector('.erfolg') as HTMLElement | null;
    expect(erfolg?.textContent?.trim()).toBe(
      'Konto erstellt. Bitte melde dich oben rechts im Menü über Login an.',
    );
    expect(fehlermeldungen()).toEqual([]);

    const emailFeld = fixture.nativeElement.querySelector('input[name="email"]') as HTMLInputElement;
    emailFeld.dispatchEvent(new Event('focus'));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.erfolg')).toBeNull();
  });
});
