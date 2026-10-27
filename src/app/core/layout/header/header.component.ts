import { Component, inject, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule, MatMenuTrigger } from '@angular/material/menu';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { AuthService } from '../../services/auth.service';
import { HealthService } from '../../services/health.service';

@Component({
  selector: 'app-header',
  imports: [
    RouterLink,
    FormsModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule
  ],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent implements OnInit {
  protected readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly healthService = inject(HealthService);

  protected healthStatus: 'online' | 'offline' | 'unknown' = 'unknown';

  // Formular-Felder für das Login-Dropdown:
  protected selectedRolle: 'STUDIERENDE' | 'PROFESSOR_IN' = 'STUDIERENDE';
  protected email = '';
  protected passwort = '';

  ngOnInit(): void {
    this.healthService.getHealth().subscribe({
      next: () => {
        this.healthStatus = 'online';
      },
      error: () => {
        this.healthStatus = 'offline';
      }
    });
  }

  protected rolleLabel(): string {
    const rolle = this.authService.aktuelleRolle();
    if (rolle === 'STUDIERENDE') return 'Studierende:r';
    if (rolle === 'PROFESSOR_IN') return 'Lehrende:r';
    return '';
  }

  protected doLogin(trigger: MatMenuTrigger): void {
    this.authService.login(this.selectedRolle, this.email);
    trigger.closeMenu();
    this.email = '';
    this.passwort = '';
  }

  protected logout(): void {
    this.authService.logout();
    this.router.navigate(['/']);
  }
}
