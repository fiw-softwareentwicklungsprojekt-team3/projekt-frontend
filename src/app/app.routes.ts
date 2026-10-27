import { Routes } from '@angular/router';
import { HomeComponent } from './features/home/home.component';
import { ModulesComponent } from './features/modules/modules.component';
import { PlanComponent } from './features/plan/plan.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'modules', component: ModulesComponent },
  { path: 'plan', component: PlanComponent },
  { path: 'dashboard', component: DashboardComponent },
  { path: '**', redirectTo: '' }
];
