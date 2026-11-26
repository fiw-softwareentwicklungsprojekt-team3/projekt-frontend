/**
 * Semester-Logik im Frontend (US-40).
 *
 * Die Reihenfolge ist dieselbe wie im Backend (Semester#compareTo): erst nach Jahr,
 * im selben Jahr kommt SS vor WS. Auf "SS 2027" folgt also "WS 2027", auf "WS 2027" folgt "SS 2028".
 * Nicht anders rechnen als das Backend, sonst stimmen Lücken und Sortierung nicht.
 */

/** Art eines Plansemesters. */
export type SemesterArt = 'WS' | 'SS';

/** Turnus eines Moduls laut Katalog. */
export type Turnus = 'WS' | 'SS' | 'BEIDE';

/** Ein Semester als Jahr und Art, z. B. { jahr: 2026, art: 'WS' } für "WS 2026". */
export interface Semester {
  jahr: number;
  art: SemesterArt;
}

const SEMESTER_MUSTER = /^(WS|SS) (\d{4})$/;

/** Liest "WS 2026" oder "SS 2027". Wirft bei falschem Format einen Fehler. */
export function parseSemester(text: string): Semester {
  const treffer = SEMESTER_MUSTER.exec(text?.trim() ?? '');
  if (!treffer) {
    throw new Error(`Ungültiges Semester: "${text}"`);
  }
  return { art: treffer[1] as SemesterArt, jahr: Number(treffer[2]) };
}

/** Schreibt ein Semester im Format des Backends, z. B. "WS 2026". */
export function formatSemester(semester: Semester): string {
  return `${semester.art} ${semester.jahr}`;
}

/** Vergleicht zwei Semester zeitlich: negativ, wenn a früher ist; 0 bei gleich. */
export function vergleicheSemester(a: Semester, b: Semester): number {
  if (a.jahr !== b.jahr) {
    return a.jahr - b.jahr;
  }
  return reihenfolge(a.art) - reihenfolge(b.art);
}

/** Das direkt folgende Semester: SS 2027 → WS 2027, WS 2027 → SS 2028. */
export function naechstesSemester(semester: Semester): Semester {
  return semester.art === 'SS'
    ? { jahr: semester.jahr, art: 'WS' }
    : { jahr: semester.jahr + 1, art: 'SS' };
}

/** Alle Semester von `von` bis einschließlich `bis`. Leer, wenn `bis` vor `von` liegt. */
export function semesterBereich(von: Semester, bis: Semester): Semester[] {
  const ergebnis: Semester[] = [];
  let aktuell = von;
  while (vergleicheSemester(aktuell, bis) <= 0) {
    ergebnis.push(aktuell);
    aktuell = naechstesSemester(aktuell);
  }
  return ergebnis;
}

/**
 * Welche Semesterspalten die Planseite zeigt (als Strings wie "WS 2026"):
 * vom Startsemester bis zum letzten geplanten Semester, danach ein leeres Semester.
 * Lücken dazwischen werden aufgefüllt, weil das Backend nur Semester mit Einträgen liefert.
 *
 * Sonderfälle:
 * - Leerer Plan: Startsemester und das folgende, damit WS- und SS-Module wählbar sind.
 * - Liegt ein Eintrag vor dem Startsemester (z. B. nach Änderung des Startsemesters),
 *   beginnt die Liste dort, damit kein Eintrag verschwindet.
 */
export function semesterSpalten(startSemester: string, geplanteSemester: string[]): string[] {
  const start = parseSemester(startSemester);
  const geplant = geplanteSemester.map(parseSemester).sort(vergleicheSemester);

  if (geplant.length === 0) {
    return [start, naechstesSemester(start)].map(formatSemester);
  }

  const erstes = vergleicheSemester(geplant[0], start) < 0 ? geplant[0] : start;
  const letztes = geplant[geplant.length - 1];
  const bisLetztes = vergleicheSemester(letztes, start) < 0 ? start : letztes;

  return [...semesterBereich(erstes, bisLetztes), naechstesSemester(bisLetztes)].map(
    formatSemester,
  );
}

/** true, wenn ein Modul mit diesem Turnus im Semester angeboten wird. */
export function passtZumTurnus(turnus: Turnus, semester: string): boolean {
  return turnus === 'BEIDE' || turnus === parseSemester(semester).art;
}

function reihenfolge(art: SemesterArt): number {
  return art === 'SS' ? 0 : 1;
}