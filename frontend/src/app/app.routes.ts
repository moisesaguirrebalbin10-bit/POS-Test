import { Routes } from '@angular/router';
import { authGuard, guestGuard, landingGuard } from './core/auth.guard';
import { ShellComponent } from './layout/shell.component';
import { LandingComponent } from './pages/landing.component';
import { LoginComponent } from './pages/login.component';
import { RegisterComponent } from './pages/register.component';
import { LicenseActivationComponent } from './pages/license-activation.component';
import { DashboardComponent } from './pages/dashboard.component';
import { PosComponent } from './pages/pos.component';
import { CrudPageComponent } from './pages/crud-page.component';
import { CashComponent } from './pages/cash.component';
import { ReportsComponent } from './pages/reports.component';
import { SystemBrandingComponent } from './pages/system-branding.component';
import { ActivityLogComponent } from './pages/activity-log.component';
import { DeviceSettingsComponent } from './pages/device-settings.component';
import { adminAuthGuard, adminGuestGuard } from './admin/core/admin-auth.guard';
import { AdminShellComponent } from './admin/layout/admin-shell.component';
import { AdminLoginComponent } from './admin/pages/admin-login.component';
import { AdminDashboardComponent } from './admin/pages/admin-dashboard.component';
import { AdminCompaniesComponent } from './admin/pages/admin-companies.component';
import { AdminPlansComponent } from './admin/pages/admin-plans.component';
import { AdminPaymentsComponent } from './admin/pages/admin-payments.component';
import { AdminLogsComponent } from './admin/pages/admin-logs.component';
import { AdminCrudPageComponent } from './admin/pages/admin-crud-page.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', component: LandingComponent, canActivate: [landingGuard] },
  { path: 'login', component: LoginComponent, canActivate: [guestGuard] },
  { path: 'register', component: RegisterComponent, canActivate: [guestGuard] },
  { path: 'license', component: LicenseActivationComponent },
  {
    path: 'app', component: ShellComponent, canActivate: [authGuard], children: [
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
  { path: 'admin/login', component: AdminLoginComponent, canActivate: [adminGuestGuard] },
  {
    path: 'admin', component: AdminShellComponent, canActivate: [adminAuthGuard], children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', component: AdminDashboardComponent },
      { path: 'companies', component: AdminCompaniesComponent },
      { path: 'companies/:id', component: AdminCompaniesComponent },
      { path: 'plans', component: AdminPlansComponent },
      { path: 'payments', component: AdminPaymentsComponent },
      { path: 'logs', component: AdminLogsComponent },
      { path: 'staff', component: AdminCrudPageComponent, data: { title: 'Staff', endpoint: 'staff' } },
      { path: 'staff-roles', component: AdminCrudPageComponent, data: { title: 'Roles Staff', endpoint: 'staff-roles' } },
    ]
  },
  { path: '**', redirectTo: '' }
];
