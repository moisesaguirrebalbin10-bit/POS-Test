import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { ImageModule } from 'primeng/image';
import { MessageService } from 'primeng/api';
import { AuthService } from '../core/auth.service';
import { BrandingService } from '../core/branding.service';
import { RealtimeService } from '../core/realtime.service';

type ThemeMode = 'light' | 'dark' | 'system';

@Component({
  selector: 'app-shell', standalone: true,
  imports: [RouterOutlet, RouterLink, MatToolbarModule, MatSidenavModule, MatListModule, MatIconModule, MatButtonModule, MatMenuModule, MatDividerModule, ImageModule],
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
        <span class="spacer"></span>
        <div class="theme-toggle" aria-label="Tema visual">
          <button mat-icon-button [class.active]="theme === 'light'" (click)="setTheme('light')" title="Tema claro"><mat-icon>light_mode</mat-icon></button>
          <button mat-icon-button [class.active]="theme === 'dark'" (click)="setTheme('dark')" title="Tema oscuro"><mat-icon>dark_mode</mat-icon></button>
          <button mat-icon-button [class.active]="theme === 'system'" (click)="setTheme('system')" title="Tema del sistema"><mat-icon>contrast</mat-icon></button>
        </div>
        <button mat-button class="user-menu-trigger" [matMenuTriggerFor]="userMenu">
          <span class="user-menu-content">
            <span class="user-avatar"><mat-icon>person</mat-icon></span>
            <span class="user-name">{{user?.name || 'Usuario'}}</span>
            <mat-icon class="chevron">expand_more</mat-icon>
          </span>
        </button>
        <mat-menu #userMenu="matMenu" xPosition="before" class="user-menu-panel">
          <div class="user-menu-header" (click)="$event.stopPropagation()">
            <span class="user-avatar"><mat-icon>person</mat-icon></span>
            <div class="user-menu-info">
              <strong>{{user?.name || 'Usuario'}}</strong>
              <small>{{user?.email}}</small>
            </div>
          </div>
          <mat-divider></mat-divider>
          <button mat-menu-item (click)="logout()"><mat-icon>logout</mat-icon><span>Cerrar sesion</span></button>
        </mat-menu>
      </mat-toolbar>
      <main><router-outlet /></main>
    </mat-sidenav-content>
  </mat-sidenav-container>`
})
export class ShellComponent {
  auth = inject(AuthService); router = inject(Router); user = this.auth.user(); branding = inject(BrandingService);
  realtime = inject(RealtimeService); messages = inject(MessageService);
  theme: ThemeMode = (localStorage.getItem('pos-theme') as ThemeMode) || 'light';
  private media = window.matchMedia('(prefers-color-scheme: dark)');
  menu: { path: string; icon: string; label: string; permission?: string }[] = [
    { path: '/app/dashboard', icon: 'dashboard', label: 'Dashboard' }, { path: '/app/pos', icon: 'point_of_sale', label: 'POS' },
    { path: '/app/products', icon: 'inventory_2', label: 'Productos' }, { path: '/app/warehouses', icon: 'warehouse', label: 'Almacenes' },
    { path: '/app/sales', icon: 'receipt_long', label: 'Ventas' }, { path: '/app/cash', icon: 'payments', label: 'Caja' },
    { path: '/app/movements', icon: 'swap_vert', label: 'Ingresos/Egresos' }, { path: '/app/reports', icon: 'bar_chart', label: 'Reportes' },
    { path: '/app/users', icon: 'group', label: 'Usuarios' }, { path: '/app/roles', icon: 'admin_panel_settings', label: 'Roles' },
    { path: '/app/company', icon: 'store', label: 'Empresa' }, { path: '/app/system-branding', icon: 'palette', label: 'Nombre y Logo' },
    { path: '/app/device-settings', icon: 'print', label: 'Equipos', permission: 'devices.manage' },
    { path: '/app/activity-logs', icon: 'history', label: 'Registros', permission: 'logs.view' }
  ];

  visibleMenu() { return this.menu.filter(item => !item.permission || this.hasPermission(item.permission)); }
  hasPermission(key: string): boolean {
    return !!this.user?.roles?.some((role: any) => role.permissions?.some((p: any) => p.key === key));
  }

  constructor() {
    this.branding.load();
    this.applyTheme();
    this.media.addEventListener('change', () => this.theme === 'system' && this.applyTheme());

    this.realtime.connect();
    this.realtime.lowStockAlert$.subscribe(e => this.messages.add({ severity: 'warn', summary: 'Stock bajo', detail: `${e.name}: quedan ${e.stock} (minimo ${e.minStock}).` }));
    this.realtime.cashRegisterChanged$.subscribe(e => this.messages.add({ severity: 'info', summary: 'Caja', detail: `${e.userName} ${e.status === 'open' ? 'abrio' : 'cerro'} una caja.` }));
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

  logout() { this.realtime.disconnect(); this.auth.logout(); }
}