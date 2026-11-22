import { Routes } from '@angular/router';
import { HomeComponent } from './features/home/home.component';
import { ModulesComponent } from './features/modules/modules.component';
import { PlanComponent } from './features/plan/plan.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { authGuard, rolleGuard, startseiteGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  // /, /login und /register zeigen dieselbe Seite. Angemeldete Lehrende werden ins Dashboard geleitet.
  { path: '', component: HomeComponent, canActivate: [startseiteGuard] },
  { path: 'register', component: HomeComponent, canActivate: [startseiteGuard] },
  { path: 'login', component: HomeComponent, canActivate: [startseiteGuard] },
  { path: 'modules', component: ModulesComponent, canActivate: [authGuard] },
  { path: 'plan', component: PlanComponent, canActivate: [rolleGuard('STUDIERENDE')] },
  { path: 'dashboard', component: DashboardComponent, canActivate: [rolleGuard('PROFESSOR_IN')] },
  { path: '**', redirectTo: '' }
];
