import { HttpErrorResponse } from '@angular/common/http';
import { fehlermeldung } from './fehlermeldung';

describe('fehlermeldung', () => {
  const antwort = (status: number, error: unknown) => new HttpErrorResponse({ status, error });

  it('zeigt bei 400 die Feldmeldung statt der allgemeinen message', () => {
    const text = fehlermeldung(
      antwort(400, {
        message: 'Die Eingabe ist ungültig. Bitte prüfe die markierten Felder.',
        errors: [
          { field: 'semester', message: 'Das Semester liegt vor deinem Startsemester WS 2026.' },
        ],
      }),
    );
    expect(text).toBe('Das Semester liegt vor deinem Startsemester WS 2026.');
  });

  it('zeigt die message, wenn es keine Feldfehler gibt (409 schon im Plan)', () => {
    expect(
      fehlermeldung(antwort(409, { message: 'Das Modul B11 ist bereits im Plan eingeplant.' })),
    ).toBe('Das Modul B11 ist bereits im Plan eingeplant.');
  });

  it('zeigt bei Status 0 einen Verbindungshinweis', () => {
    expect(fehlermeldung(antwort(0, null))).toContain('nicht erreichbar');
  });
});