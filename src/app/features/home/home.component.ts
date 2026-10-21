import { Component, OnInit, inject, signal } from '@angular/core';
import { HealthService } from '../../core/services/health.service';

@Component({
  selector: 'app-home',
  standalone: true,
  template: `
    <main>
      <h1>Studyplanner</h1>
      <p>Backend-Status: <strong>{{ backendStatus() }}</strong></p>
    </main>
  `
})
export class HomeComponent implements OnInit {
  private readonly healthService = inject(HealthService);
  protected readonly backendStatus = signal<string>('wird geprüft...');

  ngOnInit(): void {
    this.healthService.getHealth().subscribe({
      next: (response) => this.backendStatus.set(response.status),
      error: () => this.backendStatus.set('nicht erreichbar')
    });
  }
}
