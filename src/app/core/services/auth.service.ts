import { Injectable, signal } from '@angular/core';

export type Rolle = 'STUDIERENDE' | 'PROFESSOR_IN' | null;

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly aktuelleRolle = signal<Rolle>(null); // Standardmäßig nicht eingeloggt
  readonly benutzername = signal<string>('');

  login(rolle: 'STUDIERENDE' | 'PROFESSOR_IN', benutzername?: string): void {
    this.aktuelleRolle.set(rolle);
    this.benutzername.set(benutzername || (rolle === 'STUDIERENDE' ? 'studierende@htw-berlin.de' : 'prof@htw-berlin.de'));
  }

  logout(): void {
    this.aktuelleRolle.set(null);
    this.benutzername.set('');
  }
}

