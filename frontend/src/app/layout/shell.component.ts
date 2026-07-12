import { AfterViewInit, Component, ElementRef, ViewChild, effect, inject } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { BreakpointObserver } from '@angular/cdk/layout';
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
import { ReservationAlertsService } from '../core/reservation-alerts.service';
import { NotificationsService, NotificationItem } from '../core/notifications.service';
import { BusinessTypeOnboardingComponent } from './business-type-onboarding.component';
import { ReservationAlertsComponent } from './reservation-alerts.component';

type ThemeMode = 'light' | 'dark' | 'system';

@Component({
  selector: 'app-shell', standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatToolbarModule, MatSidenavModule, MatIconModule, MatButtonModule, MatMenuModule, MatDividerModule, ImageModule, BusinessTypeOnboardingComponent, ReservationAlertsComponent],
  template: `
  <mat-sidenav-container class="shell">
    <mat-sidenav [mode]="isHandset ? 'over' : 'side'" [opened]="sidenavOpened" (openedChange)="sidenavOpened = $event" class="nav">
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
      <div class="nav-scroll">
        <span class="nav-section-label">Principal</span>
        <nav class="nav-links">
          @for (item of menuBySection('principal'); track item.path) {
            <a class="nav-link" [routerLink]="item.path" routerLinkActive="active"><mat-icon>{{item.icon}}</mat-icon><span>{{item.label}}</span></a>
          }
        </nav>
        <span class="nav-section-label">Gestion</span>
        <nav class="nav-links">
          @for (item of menuBySection('gestion'); track item.path) {
            <a class="nav-link" [routerLink]="item.path" routerLinkActive="active"><mat-icon>{{item.icon}}</mat-icon><span>{{item.label}}</span></a>
          }
        </nav>
      </div>
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
        @if (isHandset) {
          <button mat-icon-button (click)="sidenavOpened = !sidenavOpened" class="menu-toggle" aria-label="Abrir menu"><mat-icon>menu</mat-icon></button>
          <span class="toolbar-brand">{{branding.name()}}</span>
        }
        <span class="spacer"></span>
        <button type="button" class="theme-switch" [class.is-dark]="resolvedDark()" (click)="toggleTheme()" [title]="resolvedDark() ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'" aria-label="Cambiar tema">
          <span class="theme-switch-thumb"><mat-icon>{{resolvedDark() ? 'dark_mode' : 'light_mode'}}</mat-icon></span>
        </button>
        <button mat-icon-button class="bell-trigger" [matMenuTriggerFor]="notifMenu" #notifTrigger="matMenuTrigger" (click)="notifications.load()" aria-label="Notificaciones" title="Notificaciones">
          <mat-icon>notifications</mat-icon>
          @if (notifications.unreadCount() > 0) { <span class="bell-badge">{{notifications.badgeText()}}</span> }
        </button>
        <mat-menu #notifMenu="matMenu" xPosition="before" class="notif-menu-panel">
          <div class="notif-panel" (click)="$event.stopPropagation()">
            <div class="notif-panel-head">
              <strong>Notificaciones</strong>
              @if (notifications.unreadCount() > 0) { <span class="notif-new-pill">{{notifications.badgeText()}} nuevas</span> }
            </div>
            <div class="notif-panel-list">
              @if (!notifications.notifications().length) {
                <div class="notif-empty">Sin notificaciones pendientes.</div>
              }
              @for (n of notifications.notifications(); track n.id) {
                <button type="button" class="notif-row" [class.unread]="!n.read_at" (click)="openNotification(n); notifTrigger.closeMenu()">
                  <span class="notif-row-icon" [class]="'sev-' + n.severity"><mat-icon>{{notifIcon(n.type)}}</mat-icon></span>
                  <span class="notif-row-body">
                    <strong>{{n.title}}</strong>
                    <small>{{n.message}}</small>
                  </span>
                  @if (!n.read_at) { <span class="notif-row-dot"></span> }
                </button>
              }
            </div>
            <div class="notif-panel-footer">
              <a routerLink="/app/notifications" class="notif-view-all" (click)="notifTrigger.closeMenu()">Ver todas las notificaciones</a>
              <button type="button" class="notif-mark-all" [disabled]="!notifications.unreadCount()" (click)="notifications.markAllRead()">Marcar todas como vista</button>
            </div>
          </div>
        </mat-menu>
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
          <button mat-menu-item (click)="setTheme('system')">
            <mat-icon>contrast</mat-icon><span>Usar tema del sistema</span>
            @if (theme === 'system') { <mat-icon class="menu-check">check</mat-icon> }
          </button>
          <mat-divider></mat-divider>
          <button mat-menu-item (click)="logout()"><mat-icon>logout</mat-icon><span>Cerrar sesion</span></button>
        </mat-menu>
      </mat-toolbar>
      <main><router-outlet /></main>
      <footer class="app-footer">&copy; {{currentYear}} OptiUso. Todos los derechos reservados.</footer>
    </mat-sidenav-content>
  </mat-sidenav-container>
  <app-business-type-onboarding [open]="showOnboarding" [saving]="savingOnboarding" (confirm)="confirmOnboarding($event)" />
  <app-reservation-alerts />`
})
export class ShellComponent implements AfterViewInit {
  auth = inject(AuthService); router = inject(Router); user = this.auth.user(); branding = inject(BrandingService);
  realtime = inject(RealtimeService); messages = inject(MessageService); api = inject(ApiService);
  reservationAlerts = inject(ReservationAlertsService); notifications = inject(NotificationsService);
  private breakpointObserver = inject(BreakpointObserver);
  theme: ThemeMode = (localStorage.getItem('pos-theme') as ThemeMode) || 'light';
  private media = window.matchMedia('(prefers-color-scheme: dark)');
  showOnboarding = false;
  savingOnboarding = false;
  currentYear = new Date().getFullYear();
  isHandset = false;
  sidenavOpened = true;
  @ViewChild('scrollContent', { read: ElementRef }) scrollContent?: ElementRef<HTMLElement>;
  menu: { path: string; icon: string; label: string; permission?: string; businessType?: 'restaurant' | 'market'; section: 'principal' | 'gestion' }[] = [
    { path: '/app/dashboard', icon: 'dashboard', label: 'Dashboard', permission: 'dashboard.view', section: 'principal' },
    { path: '/app/pos', icon: 'point_of_sale', label: 'POS', permission: 'sales.create', businessType: 'market', section: 'principal' },
    { path: '/app/orders', icon: 'receipt_long', label: 'Ordenes', permission: 'tables.manage', businessType: 'restaurant', section: 'principal' },
    { path: '/app/tables', icon: 'table_bar', label: 'Mesas', permission: 'tables.manage', businessType: 'restaurant', section: 'principal' },
    { path: '/app/kitchen', icon: 'soup_kitchen', label: 'Cocina', permission: 'kitchen.view', businessType: 'restaurant', section: 'principal' },
    { path: '/app/carta', icon: 'restaurant_menu', label: 'Carta', permission: 'products.view', businessType: 'restaurant', section: 'principal' },
    { path: '/app/products', icon: 'inventory_2', label: 'Productos', permission: 'products.view', businessType: 'market', section: 'principal' },
    { path: '/app/warehouses', icon: 'warehouse', label: 'Almacenes', permission: 'warehouses.view', businessType: 'market', section: 'gestion' },
    { path: '/app/inventory', icon: 'inventory', label: 'Inventario', permission: 'inventory.manage', businessType: 'restaurant', section: 'gestion' },
    { path: '/app/sales', icon: 'receipt_long', label: 'Ventas', permission: 'sales.view', section: 'gestion' },
    { path: '/app/cash', icon: 'payments', label: 'Caja', permission: 'cash.view', section: 'gestion' },
    { path: '/app/movements', icon: 'swap_vert', label: 'Ingresos/Egresos', permission: 'movements.view', section: 'gestion' },
    { path: '/app/reservations', icon: 'event_available', label: 'Reservas', permission: 'reservations.manage', businessType: 'restaurant', section: 'gestion' },
    { path: '/app/reports', icon: 'bar_chart', label: 'Reportes', permission: 'reports.view', section: 'gestion' },
    { path: '/app/users', icon: 'group', label: 'Usuarios', permission: 'users.view', section: 'gestion' },
    { path: '/app/roles', icon: 'admin_panel_settings', label: 'Roles', permission: 'roles.view', section: 'gestion' },
    { path: '/app/company', icon: 'store', label: 'Empresa', permission: 'settings.view', section: 'gestion' },
    { path: '/app/system-branding', icon: 'palette', label: 'Nombre y Logo', permission: 'settings.update', section: 'gestion' },
    { path: '/app/device-settings', icon: 'print', label: 'Equipos', permission: 'devices.manage', section: 'gestion' },
    { path: '/app/activity-logs', icon: 'history', label: 'Registros', permission: 'logs.view', section: 'gestion' }
  ];

  visibleMenu() {
    return this.menu.filter(item =>
      (!item.permission || this.hasPermission(item.permission)) &&
      (!item.businessType || this.branding.businessType() === item.businessType)
    );
  }

  menuBySection(section: 'principal' | 'gestion') {
    return this.visibleMenu().filter(item => item.section === section);
  }
  hasPermission(key: string): boolean {
    return this.auth.hasPermission(key);
  }

  notifIcon(type: string): string {
    if (type === 'out_of_stock') return 'remove_shopping_cart';
    if (type === 'low_stock') return 'inventory_2';
    if (type === 'order_delay') return 'schedule';
    return 'notifications';
  }

  openNotification(n: NotificationItem) {
    this.notifications.markRead(n);
    if (n.link) this.router.navigateByUrl(n.link);
  }

  constructor() {
    this.branding.load();
    this.applyTheme();
    this.media.addEventListener('change', () => this.theme === 'system' && this.applyTheme());

    this.realtime.connect();
    this.realtime.lowStockAlert$.subscribe(e => this.messages.add({ severity: 'warn', summary: 'Stock bajo', detail: `${e.name}: quedan ${e.stock} (minimo ${e.minStock}).` }));
    this.realtime.cashRegisterChanged$.subscribe(e => this.messages.add({ severity: 'info', summary: 'Caja', detail: `${e.userName} ${e.status === 'open' ? 'abrio' : 'cerro'} una caja.` }));
    this.notifications.start();

    if (!this.user?.company?.business_type_selected_at && this.hasPermission('settings.update')) {
      this.showOnboarding = true;
    }

    effect(() => {
      if (this.branding.businessType() === 'restaurant' && this.hasPermission('reservations.manage')) {
        this.reservationAlerts.start();
      }
    });

    this.breakpointObserver.observe(['(max-width: 900px)']).subscribe(result => {
      this.isHandset = result.matches;
      this.sidenavOpened = !result.matches;
    });

    this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe(() => {
      this.resetScroll();
      if (this.isHandset) this.sidenavOpened = false;
    });
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
          this.auth.updateUser(this.user);
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

  resolvedDark(): boolean {
    return this.theme === 'dark' || (this.theme === 'system' && this.media.matches);
  }

  toggleTheme() {
    this.setTheme(this.resolvedDark() ? 'light' : 'dark');
  }

  applyTheme() {
    const dark = this.theme === 'dark' || (this.theme === 'system' && this.media.matches);
    document.documentElement.classList.toggle('app-dark', dark);
    document.documentElement.classList.toggle('app-light', !dark);
    document.documentElement.classList.toggle('app-system', this.theme === 'system');
  }

  logout() { this.realtime.disconnect(); this.auth.logout(); }
}