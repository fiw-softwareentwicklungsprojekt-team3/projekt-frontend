/**
 * Muster für erlaubte HTW-E-Mail-Adressen (US-27). Die Regeln sind dieselben wie im Backend (US-28):
 * Es zählt nur der Teil hinter dem @, Groß- und Kleinschreibung ist egal (das "i" am Ende).
 *
 * Die Muster prüfen nur die Domain. Ob die Eingabe überhaupt eine E-Mail-Adresse ist,
 * prüft weiterhin der Angular-Validator "email". So gibt es zwei getrennte Fehlermeldungen.
 */

/** Registrierung: nur Studierende, also nur @student.htw-berlin.de. */
export const HTW_EMAIL_REGISTRIERUNG = /^[^@]+@student\.htw-berlin\.de$/i;

/** Login: Studierende (@student.htw-berlin.de) und Lehrende (@htw-berlin.de). */
export const HTW_EMAIL_LOGIN = /^[^@]+@(student\.)?htw-berlin\.de$/i;
