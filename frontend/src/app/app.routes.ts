import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';
import { ShellComponent } from './layout/shell.component';
import { LoginComponent } from './pages/login.component';
import { DashboardComponent } from './pages/dashboard.component';
import { PosComponent } from './pages/pos.component';
import { CrudPageComponent } from './pages/crud-page.component';
import { CashComponent } from './pages/cash.component';
import { ReportsComponent } from './pages/reports.component';
import { SystemBrandingComponent } from './pages/system-branding.component';
import { ActivityLogComponent } from './pages/activity-log.component';
import { DeviceSettingsComponent } from './pages/device-settings.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  {
    path: '', component: ShellComponent, canActivate: [authGuard], children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', component: DashboardComponent },
      { path: 'pos', component: PosComponent },
      { path: 'users', component: CrudPageComponent, data: { title: 'Usuarios', endpoint: 'users' } },
      { path: 'roles', component: CrudPageComponent, data: { title: 'Roles', endpoint: 'roles' } },
      { path: 'company', component: CrudPageComponent, data: { title: 'Empresa', endpoint: 'company-settings', single: true } },
      { path: 'warehouses', component: CrudPageComponent, data: { title: 'Almacenes', endpoint: 'warehouses' } },
      { path: 'products', component: CrudPageComponent, data: { title: 'Productos', endpoint: 'products' } },
      { path: 'sales', component: CrudPageComponent, data: { title: 'Ventas', endpoint: 'sales' } },
      { path: 'cash', component: CashComponent },
      { path: 'movements', component: CrudPageComponent, data: { title: 'Ingresos y egresos', endpoint: 'expenses-income' } },
      { path: 'reports', component: ReportsComponent },
      { path: 'system-branding', component: SystemBrandingComponent },
      { path: 'device-settings', component: DeviceSettingsComponent },
      { path: 'activity-logs', component: ActivityLogComponent }
    ]
  },
  { path: '**', redirectTo: '' }
];
