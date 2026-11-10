import { Component, OnInit, inject, signal } from '@angular/core';
import { ModuleDto, ModuleService } from '../../core/services/module.service';

/**
 * Zeigt den Modulkatalog. Die Module kommen beim Start vom Backend (GET /api/modules).
 * Solange geladen wird, steht ein Hinweis da. Schlägt das Laden fehl, erscheint eine Fehlermeldung.
 */
@Component({
  selector: 'app-modules',
  standalone: true,
  template: `
    <section class="page-container">
      <h1>Module</h1>
      @if (laedt()) {
        <p>Module werden geladen…</p>
      } @else if (fehler()) {
        <p class="fehler" role="alert">{{ fehler() }}</p>
      } @else if (module().length === 0) {
        <p>Keine Module vorhanden.</p>
      } @else {
        <ul class="module-list">
          @for (modul of module(); track modul.code) {
            <li class="module-item">
              <strong>{{ modul.code }}</strong> – {{ modul.name }}
              <span class="module-meta">
                ({{ modul.semester }}. Semester · {{ modul.type }} · {{ modul.lp }} LP · {{ modul.term }})
              </span>
            </li>
          }
        </ul>
      }
    </section>
  `,
  styles: [`
    .page-container {
      max-width: 900px;
      margin: 2rem auto;
      padding: 0 1rem;
    }

    h1 {
      margin-bottom: 1rem;
    }

    p {
      margin: 0;
      color: #444;
    }

    .fehler {
      color: var(--status-gesperrt);
    }

    .module-list {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .module-item {
      padding: 0.75rem 1rem;
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.08);
      border-radius: 8px;
    }

    .module-meta {
      color: #555;
      font-size: 0.9rem;
      margin-left: 0.35rem;
    }
  `]
})
export class ModulesComponent implements OnInit {
  private readonly moduleService = inject(ModuleService);

  protected readonly module = signal<ModuleDto[]>([]);
  protected readonly laedt = signal<boolean>(true);
  protected readonly fehler = signal<string>('');

  ngOnInit(): void {
    this.moduleService.getModules().subscribe({
      next: (daten) => {
        this.module.set(daten);
        this.laedt.set(false);
      },
      error: () => {
        this.laedt.set(false);
        this.fehler.set('Die Module konnten nicht geladen werden.');
      }
    });
  }
}

