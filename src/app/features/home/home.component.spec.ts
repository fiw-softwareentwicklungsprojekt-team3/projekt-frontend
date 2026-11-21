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

describe('HomeComponent – Professor:innen-Registrierung mit Einladungscode', () => {
  let fixture: ComponentFixture<HomeComponent>;
  let httpMock: HttpTestingController;

  const LEHRENDE_DOMAIN_FEHLER =
    'Bitte eine gültige HTW-E-Mail-Adresse (@htw-berlin.de) eingeben.';

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

  function modusButton(label: 'Studierende:r' | 'Lehrende:r'): HTMLButtonElement {
    const buttons = Array.from(
      fixture.nativeElement.querySelectorAll('.modus-btn') as NodeListOf<HTMLButtonElement>,
    );
    const gefunden = buttons.find((b) => b.textContent?.includes(label));
    if (!gefunden) {
      throw new Error(`Modus-Button "${label}" nicht gefunden`);
    }
    return gefunden;
  }

  async function zuModusWechseln(label: 'Studierende:r' | 'Lehrende:r'): Promise<void> {
    modusButton(label).click();
    fixture.detectChanges();
    await fixture.whenStable();
  }

  async function eingeben(name: string, wert: string): Promise<void> {
    const feld = fixture.nativeElement.querySelector(`input[name="${name}"]`) as HTMLInputElement;
    feld.value = wert;
    feld.dispatchEvent(new Event('input'));
    feld.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
    await fixture.whenStable();
  }

  async function profFormularAusfuellen(
    email: string,
    code = 'K7MPX4QRT9WZ',
    passwort = 'geheimesPasswort',
  ): Promise<void> {
    await eingeben('email', email);
    await eingeben('passwort', passwort);
    await eingeben('code', code);
  }

  function fehlermeldungen(): string[] {
    const elemente = fixture.nativeElement.querySelectorAll('mat-error') as NodeListOf<HTMLElement>;
    return Array.from(elemente).map((e) => e.textContent?.trim() ?? '');
  }

  function registrierenButton(): HTMLButtonElement {
    return fixture.nativeElement.querySelector('.register-btn') as HTMLButtonElement;
  }

  it('zeigt beim Umschalten auf Lehrende:r das Feld Einladungscode statt Startsemester', async () => {
    expect(fixture.nativeElement.querySelector('mat-select[name="startsemester"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('input[name="code"]')).toBeNull();

    await zuModusWechseln('Lehrende:r');

    expect(fixture.nativeElement.querySelector('mat-select[name="startsemester"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('input[name="code"]')).not.toBeNull();
    expect(modusButton('Lehrende:r').getAttribute('aria-pressed')).toBe('true');
    expect(modusButton('Studierende:r').getAttribute('aria-pressed')).toBe('false');
  });

  it('setzt feldFehler, allgemeinerFehler und erfolg beim Moduswechsel zurück', async () => {
    await zuModusWechseln('Lehrende:r');
    await profFormularAusfuellen('prof@htw-berlin.de', 'UNGUELTIG');
    registrierenButton().click();

    httpMock.expectOne('/api/auth/register/professor').flush(
      {
        message: 'Der Einladungscode ist ungültig.',
        errors: [{ field: 'code', message: 'Der Einladungscode ist ungültig.' }],
      },
      { status: 400, statusText: 'Bad Request' },
    );
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.fehler')).not.toBeNull();

    await zuModusWechseln('Studierende:r');
    expect(fixture.nativeElement.querySelector('.fehler')).toBeNull();

    await eingeben('email', 'name@student.htw-berlin.de');
    await eingeben('passwort', 'geheimesPasswort');
    registrierenButton().click();
    httpMock
      .expectOne('/api/auth/register')
      .flush({ message: 'Diese E-Mail-Adresse ist bereits vergeben.' }, { status: 409, statusText: 'Conflict' });
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.allgemeiner-fehler')).not.toBeNull();

    await zuModusWechseln('Lehrende:r');
    expect(fixture.nativeElement.querySelector('.allgemeiner-fehler')).toBeNull();

    await profFormularAusfuellen('prof@htw-berlin.de', 'K7MPX4QRT9WZ');
    registrierenButton().click();
    httpMock
      .expectOne('/api/auth/register/professor')
      .flush({ id: 42, email: 'prof@htw-berlin.de', role: 'PROFESSOR_IN' }, { status: 201, statusText: 'Created' });
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.erfolg')).not.toBeNull();

    await zuModusWechseln('Studierende:r');
    expect(fixture.nativeElement.querySelector('.erfolg')).toBeNull();
  });

  it.each([
    'name@student.htw-berlin.de',
    'name@gmail.com',
    'name@fakehtw-berlin.de',
    'htw-berlin.de@gmail.com',
  ])('zeigt im Modus Lehrende:r bei falscher Domain (%s) den Hinweis und sperrt den Button', async (email) => {
    await zuModusWechseln('Lehrende:r');
    await profFormularAusfuellen(email);

    expect(fehlermeldungen()).toEqual([LEHRENDE_DOMAIN_FEHLER]);
    expect(registrierenButton().disabled).toBe(true);
  });

  it('sendet bei Erfolg (201) an /api/auth/register/professor, leert das Formular und zeigt Login-Hinweis', async () => {
    await zuModusWechseln('Lehrende:r');
    await profFormularAusfuellen('Professorin@HTW-Berlin.de', '  k7mpx4qrt9wz ');

    expect(fehlermeldungen()).toEqual([]);
    expect(registrierenButton().disabled).toBe(false);
    registrierenButton().click();

    const req = httpMock.expectOne('/api/auth/register/professor');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      email: 'Professorin@HTW-Berlin.de',
      password: 'geheimesPasswort',
      code: '  k7mpx4qrt9wz ',
    });
    req.flush({ id: 42, email: 'professorin@htw-berlin.de', role: 'PROFESSOR_IN' }, { status: 201, statusText: 'Created' });
    fixture.detectChanges();
    await fixture.whenStable();

    const erfolg = fixture.nativeElement.querySelector('.erfolg') as HTMLElement;
    expect(erfolg.textContent).toContain('oben rechts');
    expect(erfolg.textContent).toContain('Login');

    expect((fixture.nativeElement.querySelector('input[name="email"]') as HTMLInputElement).value).toBe('');
    expect((fixture.nativeElement.querySelector('input[name="passwort"]') as HTMLInputElement).value).toBe('');
    expect((fixture.nativeElement.querySelector('input[name="code"]') as HTMLInputElement).value).toBe('');
  });

  it('zeigt bei ungültigem Einladungscode (400) die Meldung direkt am Code-Feld', async () => {
    await zuModusWechseln('Lehrende:r');
    await profFormularAusfuellen('prof@htw-berlin.de', 'FALSCH123456');
    registrierenButton().click();

    httpMock.expectOne('/api/auth/register/professor').flush(
      {
        status: 400,
        message: 'Der Einladungscode ist ungültig.',
        errors: [{ field: 'code', message: 'Der Einladungscode ist ungültig.' }],
      },
      { status: 400, statusText: 'Bad Request' },
    );
    fixture.detectChanges();
    await fixture.whenStable();

    const codeInput = fixture.nativeElement.querySelector('input[name="code"]') as HTMLElement;
    const codeFormField = codeInput.closest('mat-form-field');
    const codeFehler = codeFormField?.nextElementSibling as HTMLElement | null;
    expect(codeFehler?.classList.contains('fehler')).toBe(true);
    expect(codeFehler?.textContent?.trim()).toBe('Der Einladungscode ist ungültig.');
  });

  it('ordnet 400-Feldfehler für email und password den jeweiligen Feldern zu', async () => {
    await zuModusWechseln('Lehrende:r');
    await profFormularAusfuellen('prof@htw-berlin.de', 'K7MPX4QRT9WZ');
    registrierenButton().click();

    httpMock.expectOne('/api/auth/register/professor').flush(
      {
        status: 400,
        message: 'Die Eingabe ist ungültig.',
        errors: [
          { field: 'email', message: 'email muss auf @htw-berlin.de enden' },
          { field: 'password', message: 'password muss mindestens 8 Zeichen haben' },
        ],
      },
      { status: 400, statusText: 'Bad Request' },
    );
    fixture.detectChanges();
    await fixture.whenStable();

    const fehlerTexte = Array.from(
      fixture.nativeElement.querySelectorAll('.fehler') as NodeListOf<HTMLElement>,
    ).map((el) => el.textContent?.trim());
    expect(fehlerTexte).toEqual([
      'email muss auf @htw-berlin.de enden',
      'password muss mindestens 8 Zeichen haben',
    ]);
  });

  it('zeigt bei bereits vergebener E-Mail (409) die Fehlermeldung in allgemeinerFehler', async () => {
    await zuModusWechseln('Lehrende:r');
    await profFormularAusfuellen('prof@htw-berlin.de', 'K7MPX4QRT9WZ');
    registrierenButton().click();

    httpMock.expectOne('/api/auth/register/professor').flush(
      { message: 'Diese E-Mail-Adresse ist bereits vergeben.' },
      { status: 409, statusText: 'Conflict' },
    );
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('.fehler')).toBeNull();
    const allgemein = fixture.nativeElement.querySelector('.allgemeiner-fehler') as HTMLElement;
    expect(allgemein.textContent?.trim()).toBe('Diese E-Mail-Adresse ist bereits vergeben.');
  });

  it('zeigt bei Netzwerkfehler (Status 0) eine verständliche Meldung in allgemeinerFehler', async () => {
    await zuModusWechseln('Lehrende:r');
    await profFormularAusfuellen('prof@htw-berlin.de', 'K7MPX4QRT9WZ');
    registrierenButton().click();

    httpMock
      .expectOne('/api/auth/register/professor')
      .error(new ProgressEvent('error'), { status: 0, statusText: 'Unknown Error' });
    fixture.detectChanges();
    await fixture.whenStable();

    const allgemein = fixture.nativeElement.querySelector('.allgemeiner-fehler') as HTMLElement;
    expect(allgemein.textContent?.trim()).toBe(
      'Der Server ist gerade nicht erreichbar. Bitte später erneut versuchen.',
    );
  });
});
