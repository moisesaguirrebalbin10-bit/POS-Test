import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ImageModule } from 'primeng/image';
import { AuthService } from '../core/auth.service';
import { BrandingService } from '../core/branding.service';

type ThemeMode = 'light' | 'dark' | 'system';

@Component({
  selector: 'app-shell', standalone: true,
  imports: [RouterOutlet, RouterLink, MatToolbarModule, MatSidenavModule, MatListModule, MatIconModule, MatButtonModule, ImageModule],
  template: `
  <mat-sidenav-container class="shell">
    <mat-sidenav mode="side" opened class="nav">
      <div class="brand-box">
        <div class="brand-logo">
          @if (branding.logoUrl()) { <p-image [src]="branding.logoUrl()" alt="Logo" [preview]="true" imageClass="brand-logo-img" /> }
          @else { <mat-icon>storefront</mat-icon> }
        </div>
        <div class="brand-text">
          <h2>{{branding.name()}}</h2>
          @if (branding.slogan()) { <small>{{branding.slogan()}}</small> }
        </div>
      </div>
      @for (item of visibleMenu(); track item.path) { <a mat-list-item [routerLink]="item.path"><mat-icon>{{item.icon}}</mat-icon><span>{{item.label}}</span></a> }
    </mat-sidenav>
    <mat-sidenav-content>
      <mat-toolbar>
        <span>{{user?.name || 'Usuario'}}</span>
        <span class="spacer"></span>
        <div class="theme-toggle" aria-label="Tema visual">
          <button mat-icon-button [class.active]="theme === 'light'" (click)="setTheme('light')" title="Tema claro"><mat-icon>light_mode</mat-icon></button>
          <button mat-icon-button [class.active]="theme === 'dark'" (click)="setTheme('dark')" title="Tema oscuro"><mat-icon>dark_mode</mat-icon></button>
          <button mat-icon-button [class.active]="theme === 'system'" (click)="setTheme('system')" title="Tema del sistema"><mat-icon>contrast</mat-icon></button>
        </div>
        <button mat-icon-button (click)="logout()" title="Salir"><mat-icon>logout</mat-icon></button>
      </mat-toolbar>
      <main><router-outlet /></main>
    </mat-sidenav-content>
  </mat-sidenav-container>`
})
export class ShellComponent {
  auth = inject(AuthService); router = inject(Router); user = this.auth.user(); branding = inject(BrandingService);
  theme: ThemeMode = (localStorage.getItem('pos-theme') as ThemeMode) || 'light';
  private media = window.matchMedia('(prefers-color-scheme: dark)');
  menu: { path: string; icon: string; label: string; permission?: string }[] = [
    { path: '/dashboard', icon: 'dashboard', label: 'Dashboard' }, { path: '/pos', icon: 'point_of_sale', label: 'POS' },
    { path: '/products', icon: 'inventory_2', label: 'Productos' }, { path: '/warehouses', icon: 'warehouse', label: 'Almacenes' },
    { path: '/sales', icon: 'receipt_long', label: 'Ventas' }, { path: '/cash', icon: 'payments', label: 'Caja' },
    { path: '/movements', icon: 'swap_vert', label: 'Ingresos/Egresos' }, { path: '/reports', icon: 'bar_chart', label: 'Reportes' },
    { path: '/users', icon: 'group', label: 'Usuarios' }, { path: '/roles', icon: 'admin_panel_settings', label: 'Roles' },
    { path: '/company', icon: 'store', label: 'Empresa' }, { path: '/system-branding', icon: 'palette', label: 'Nombre y Logo' },
    { path: '/device-settings', icon: 'print', label: 'Equipos', permission: 'devices.manage' },
    { path: '/activity-logs', icon: 'history', label: 'Registros', permission: 'logs.view' }
  ];

  visibleMenu() { return this.menu.filter(item => !item.permission || this.hasPermission(item.permission)); }
  hasPermission(key: string): boolean {
    return !!this.user?.roles?.some((role: any) => role.permissions?.some((p: any) => p.key === key));
  }

  constructor() {
    this.branding.load();
    this.applyTheme();
    this.media.addEventListener('change', () => this.theme === 'system' && this.applyTheme());
  }

  setTheme(theme: ThemeMode) {
    this.theme = theme;
    localStorage.setItem('pos-theme', theme);
    this.applyTheme();
  }

  applyTheme() {
    const dark = this.theme === 'dark' || (this.theme === 'system' && this.media.matches);
    document.documentElement.classList.toggle('app-dark', dark);
    document.documentElement.classList.toggle('app-light', !dark);
    document.documentElement.classList.toggle('app-system', this.theme === 'system');
  }

  logout() { this.auth.logout(); }
}