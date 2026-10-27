import { Component } from '@angular/core';

@Component({
  selector: 'app-plan',
  standalone: true,
  template: `
    <section class="page-container">
      <h1>Mein Studienplan</h1>
      <p>Hier erscheint dein persönlicher Studienplan.</p>
    </section>
  `,
  styles: [`
    .page-container {
      max-width: 900px;
      margin: 2rem auto;
      padding: 0 1rem;
    }

    h1 {
      margin-bottom: 0.5rem;
    }

    p {
      margin: 0;
      color: #444;
    }
  `]
})
export class PlanComponent {}
