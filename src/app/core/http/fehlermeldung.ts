import { HttpErrorResponse } from '@angular/common/http';
import { ApiFehler } from '../services/registration.service';

/**
 * Macht aus einer Fehlerantwort des Backends einen lesbaren Text.
 *
 * Grundlage ist `fehlertextErmitteln` aus #42 (Rawan): Status 0 ergibt einen eigenen
 * Verbindungshinweis, sonst zählt die `message` des Backends, zuletzt der Fallback.
 * Neu ist der Vorrang von `errors[].message`: Bei fachlichen 400-Fehlern steht dort die
 * eigentliche Meldung (z. B. „Das Semester liegt vor deinem Startsemester WS 2026.“),
 * `message` enthält dann nur den allgemeinen Satz.
 */
export function fehlermeldung(
  fehler: unknown,
  fallback = 'Es ist ein Fehler aufgetreten.',
): string {
  if (!(fehler instanceof HttpErrorResponse)) {
    return fallback;
  }
  if (fehler.status === 0) {
    return 'Der Server ist gerade nicht erreichbar. Bitte später erneut versuchen.';
  }
  const body = fehler.error as ApiFehler | null;
  const feldMeldungen = (body?.errors ?? []).map((e) => e.message).filter((m): m is string => !!m);
  if (feldMeldungen.length > 0) {
    return feldMeldungen.join(' ');
  }
  return body?.message || fallback;
}