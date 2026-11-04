import { Routes } from '@angular/router';
import { HomeComponent } from './features/home/home.component';
import { ModulesComponent } from './features/modules/modules.component';
import { PlanComponent } from './features/plan/plan.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'register', component: HomeComponent },
  { path: 'login', component: HomeComponent },
  { path: 'modules', component: ModulesComponent, canActivate: [authGuard] },
  { path: 'plan', component: PlanComponent, canActivate: [authGuard] },
  { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },
  { path: '**', redirectTo: '' }
];
