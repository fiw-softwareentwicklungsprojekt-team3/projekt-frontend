import { Injectable, signal } from '@angular/core';

export type Rolle = 'STUDIERENDE' | 'PROFESSOR_IN' | null;

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly aktuelleRolle = signal<Rolle>(null); // Standardmäßig nicht eingeloggt
  readonly email = signal<string>('');

  login(rolle: 'STUDIERENDE' | 'PROFESSOR_IN', email?: string): void {
    this.aktuelleRolle.set(rolle);
    this.email.set(email || (rolle === 'STUDIERENDE' ? 'studierende@htw-berlin.de' : 'prof@htw-berlin.de'));
  }

  logout(): void {
    this.aktuelleRolle.set(null);
    this.email.set('');
  }
}

