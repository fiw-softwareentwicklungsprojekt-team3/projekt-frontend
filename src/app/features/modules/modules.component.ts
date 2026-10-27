import { Component } from '@angular/core';

@Component({
  selector: 'app-modules',
  standalone: true,
  template: `
    <section class="page-container">
      <h1>Module</h1>
      <p>Hier erscheinen die Modulangebote.</p>
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
export class ModulesComponent {}
