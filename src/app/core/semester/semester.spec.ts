import {
  naechstesSemester,
  parseSemester,
  passtZumTurnus,
  semesterSpalten,
  vergleicheSemester,
} from './semester';

describe('Semester-Logik', () => {
  it('sortiert wie das Backend: SS kommt im selben Jahr vor WS', () => {
    expect(vergleicheSemester(parseSemester('SS 2027'), parseSemester('WS 2027'))).toBeLessThan(0);
  });

  it('naechstesSemester wechselt richtig', () => {
    expect(naechstesSemester(parseSemester('WS 2026'))).toEqual({ art: 'SS', jahr: 2027 });
    expect(naechstesSemester(parseSemester('SS 2027'))).toEqual({ art: 'WS', jahr: 2027 });
  });

  it('füllt Lücken zwischen geplanten Semestern und hängt ein leeres an', () => {
    expect(semesterSpalten('WS 2026', ['WS 2026', 'WS 2027'])).toEqual([
      'WS 2026',
      'SS 2027',
      'WS 2027',
      'SS 2028',
    ]);
  });

  it('beginnt immer beim Startsemester, auch wenn dort nichts geplant ist', () => {
    expect(semesterSpalten('WS 2026', ['WS 2027'])).toEqual([
      'WS 2026',
      'SS 2027',
      'WS 2027',
      'SS 2028',
    ]);
  });

  it('zeigt bei leerem Plan Startsemester und Folgesemester', () => {
    expect(semesterSpalten('WS 2026', [])).toEqual(['WS 2026', 'SS 2027']);
  });

  it('passtZumTurnus: WS nur im WS, SS nur im SS, BEIDE überall', () => {
    expect(passtZumTurnus('WS', 'WS 2026')).toBe(true);
    expect(passtZumTurnus('WS', 'SS 2027')).toBe(false);
    expect(passtZumTurnus('SS', 'SS 2027')).toBe(true);
    expect(passtZumTurnus('BEIDE', 'WS 2026')).toBe(true);
  });
});