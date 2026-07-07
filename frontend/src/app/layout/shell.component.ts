import { AfterViewInit, Component, ElementRef, ViewChild, inject } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { ImageModule } from 'primeng/image';
import { MessageService } from 'primeng/api';
import { AuthService } from '../core/auth.service';
import { BrandingService } from '../core/branding.service';
import { RealtimeService } from '../core/realtime.service';
import { ApiService } from '../core/api.service';
import { BusinessTypeOnboardingComponent } from './business-type-onboarding.component';

type ThemeMode = 'light' | 'dark' | 'system';

@Component({
  selector: 'app-shell', standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatToolbarModule, MatSidenavModule, MatIconModule, MatButtonModule, MatMenuModule, MatDividerModule, ImageModule, BusinessTypeOnboardingComponent],
  template: `
  <mat-sidenav-container class="shell">
    <mat-sidenav mode="side" opened class="nav">
      <div class="nav-brand">
        <div class="nav-brand-icon">
          @if (branding.logoUrl()) { <p-image [src]="branding.logoUrl()" alt="Logo" [preview]="true" imageClass="nav-brand-logo-img" /> }
          @else { <mat-icon>{{branding.businessType() === 'restaurant' ? 'restaurant' : 'storefront'}}</mat-icon> }
        </div>
        <div class="nav-brand-text">
          <h2>{{branding.name()}}</h2>
          <small>{{branding.businessType() === 'restaurant' ? 'Gestion de Restaurante' : 'Gestion de Mercado'}}</small>
        </div>
      </div>
      <nav class="nav-links">
        @for (item of visibleMenu(); track item.path) {
          <a class="nav-link" [routerLink]="item.path" routerLinkActive="active"><mat-icon>{{item.icon}}</mat-icon><span>{{item.label}}</span></a>
        }
      </nav>
      <div class="nav-user-card">
        <span class="nav-user-avatar"><mat-icon>person</mat-icon></span>
        <div class="nav-user-info">
          <strong>{{user?.name || 'Usuario'}}</strong>
          <small>{{branding.name()}}</small>
        </div>
      </div>
    </mat-sidenav>
    <mat-sidenav-content #scrollContent>
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
  </mat-sidenav-container>
  <app-business-type-onboarding [open]="showOnboarding" [saving]="savingOnboarding" (confirm)="confirmOnboarding($event)" />`
})
export class ShellComponent implements AfterViewInit {
  auth = inject(AuthService); router = inject(Router); user = this.auth.user(); branding = inject(BrandingService);
  realtime = inject(RealtimeService); messages = inject(MessageService); api = inject(ApiService);
  theme: ThemeMode = (localStorage.getItem('pos-theme') as ThemeMode) || 'light';
  private media = window.matchMedia('(prefers-color-scheme: dark)');
  showOnboarding = false;
  savingOnboarding = false;
  @ViewChild('scrollContent', { read: ElementRef }) scrollContent?: ElementRef<HTMLElement>;
  menu: { path: string; icon: string; label: string; permission?: string; businessType?: 'restaurant' }[] = [
    { path: '/app/dashboard', icon: 'dashboard', label: 'Dashboard' }, { path: '/app/pos', icon: 'point_of_sale', label: 'POS' },
    { path: '/app/tables', icon: 'table_bar', label: 'Mesas', permission: 'tables.manage', businessType: 'restaurant' },
    { path: '/app/products', icon: 'inventory_2', label: 'Productos' }, { path: '/app/warehouses', icon: 'warehouse', label: 'Almacenes' },
    { path: '/app/sales', icon: 'receipt_long', label: 'Ventas' }, { path: '/app/cash', icon: 'payments', label: 'Caja' },
    { path: '/app/movements', icon: 'swap_vert', label: 'Ingresos/Egresos' }, { path: '/app/reports', icon: 'bar_chart', label: 'Reportes' },
    { path: '/app/users', icon: 'group', label: 'Usuarios' }, { path: '/app/roles', icon: 'admin_panel_settings', label: 'Roles' },
    { path: '/app/company', icon: 'store', label: 'Empresa' }, { path: '/app/system-branding', icon: 'palette', label: 'Nombre y Logo' },
    { path: '/app/device-settings', icon: 'print', label: 'Equipos', permission: 'devices.manage' },
    { path: '/app/activity-logs', icon: 'history', label: 'Registros', permission: 'logs.view' }
  ];

  visibleMenu() {
    return this.menu.filter(item =>
      (!item.permission || this.hasPermission(item.permission)) &&
      (!item.businessType || this.branding.businessType() === item.businessType)
    );
  }
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

    if (!this.user?.company?.business_type_selected_at && this.hasPermission('settings.update')) {
      this.showOnboarding = true;
    }

    this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe(() => this.resetScroll());
  }

  ngAfterViewInit() {
    // Chrome restaura automaticamente el scroll de contenedores internos al recargar
    // la pagina (no solo el de la ventana); forzamos el reset tras el primer render
    // y de nuevo un tick despues para ganarle a esa restauracion tardia.
    this.resetScroll();
    requestAnimationFrame(() => this.resetScroll());
    setTimeout(() => this.resetScroll(), 50);
  }

  resetScroll() {
    const el = this.scrollContent?.nativeElement;
    if (el) { el.scrollTop = 0; el.scrollLeft = 0; }
  }

  confirmOnboarding(businessType: 'market' | 'restaurant') {
    this.savingOnboarding = true;
    this.api.post<any>('company-settings/business-type', { business_type: businessType }).subscribe({
      next: company => {
        this.savingOnboarding = false;
        this.showOnboarding = false;
        this.branding.refresh();
        if (this.user) {
          this.user.company = { ...(this.user.company || {}), business_type: company.business_type, business_type_selected_at: company.business_type_selected_at };
          localStorage.setItem('user', JSON.stringify(this.user));
        }
        this.messages.add({ severity: 'success', summary: 'Listo', detail: businessType === 'restaurant' ? 'Modo Restaurante activado.' : 'Modo Market activado.' });
      },
      error: () => { this.savingOnboarding = false; this.messages.add({ severity: 'error', summary: 'Error', detail: 'No se pudo guardar el modo del sistema.' }); }
    });
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