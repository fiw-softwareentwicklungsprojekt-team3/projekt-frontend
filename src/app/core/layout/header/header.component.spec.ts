import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
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
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
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
