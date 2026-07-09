import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { BreakpointObserver } from '@angular/cdk/layout';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';
import { MessageService } from 'primeng/api';
import { AdminAuthService } from '../core/admin-auth.service';
import { AdminApiService } from '../core/admin-api.service';

@Component({
  selector: 'app-admin-shell', standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, FormsModule, MatToolbarModule, MatSidenavModule, MatIconModule, MatButtonModule, MatMenuModule, MatBadgeModule],
  template: `
  <mat-sidenav-container class="shell admin-shell">
    <mat-sidenav [mode]="isHandset ? 'over' : 'side'" [opened]="sidenavOpened" (openedChange)="sidenavOpened = $event" class="nav admin-nav">
      <div class="brand-box">
        <img class="brand-logo-img" src="/assets/brand/optiuso-logo.png" alt="OptiUso">
        <div class="brand-text"><small>Super Admin</small></div>
      </div>
      <nav class="admin-nav-links">
        @for (item of visibleMenu(); track item.path) { <a class="nav-link" [routerLink]="item.path" routerLinkActive="active-link"><mat-icon>{{item.icon}}</mat-icon><span>{{item.label}}</span></a> }
      </nav>
      <div class="admin-nav-user">
        <span class="admin-nav-avatar"><mat-icon>account_circle</mat-icon></span>
        <div class="admin-nav-user-info"><strong>{{admin?.name || 'Super Admin'}}</strong><small>SUPER ADMIN</small></div>
      </div>
    </mat-sidenav>
    <mat-sidenav-content>
      <mat-toolbar class="admin-toolbar-top">
        @if (isHandset) {
          <button mat-icon-button (click)="sidenavOpened = !sidenavOpened" class="menu-toggle" aria-label="Abrir menu"><mat-icon>menu</mat-icon></button>
        }
        <div class="search-pill admin-search"><mat-icon>search</mat-icon><input type="text" placeholder="Buscar empresas..." [(ngModel)]="globalSearch" (keydown.enter)="runSearch()"></div>
        <span class="spacer"></span>
        <button mat-icon-button [matMenuTriggerFor]="notifMenu" [matBadge]="unreadCount || null" matBadgeColor="warn" matBadgeSize="small" (click)="loadNotifications()" title="Notificaciones">
          <mat-icon>notifications</mat-icon>
        </button>
        <mat-menu #notifMenu="matMenu" class="notif-menu">
          @if (!notifications.length) { <div class="notif-empty">Sin notificaciones.</div> }
          @for (n of notifications; track n.id) {
            <button mat-menu-item (click)="markRead(n)" [class.unread]="!n.read_at">
              <div class="notif-item"><strong>{{n.title}}</strong><small>{{n.message}}</small></div>
            </button>
          }
        </mat-menu>
        <button mat-icon-button (click)="help()" title="Ayuda"><mat-icon>help_outline</mat-icon></button>
        <button mat-icon-button (click)="settings()" title="Configuracion"><mat-icon>settings</mat-icon></button>
        <button mat-button (click)="logout()" class="sign-out-btn"><span>Sign Out</span><mat-icon>logout</mat-icon></button>
      </mat-toolbar>
      <main><router-outlet /></main>
    </mat-sidenav-content>
  </mat-sidenav-container>`,
  styles: [`
    .admin-nav { background: #111827; }
    .admin-nav .brand-box { flex-direction: row; align-items: center; gap: 10px; padding: 4px 12px 18px; margin-bottom: 6px; border-bottom: 1px solid rgba(255,255,255,.08); }
    .admin-nav .brand-logo-img { flex: none; height: 40px; width: auto; }
    .admin-nav .brand-text { align-items: flex-start; text-align: left; gap: 0; }
    .admin-nav .brand-text small { color: #64748b; }
    .admin-nav-links { display: flex; flex-direction: column; flex: 1; }
    .admin-nav .nav-link {
      display: flex; align-items: center; gap: 12px;
      margin: 2px 8px; padding: 10px 16px; border-radius: 8px;
      color: #e2e8f0; text-decoration: none; font-size: 14px;
      transition: background .15s, color .15s;
    }
    .admin-nav .nav-link mat-icon { color: #94a3b8; transition: color .15s; }
    .admin-nav .nav-link:hover { background: rgba(255, 255, 255, 0.1); color: #fff; }
    .admin-nav .nav-link:hover mat-icon { color: #fff; }
    .admin-nav .nav-link.active-link { background: #1e293b; color: #fff; font-weight: 600; }
    .admin-nav .nav-link.active-link mat-icon { color: #22c55e; }

    .admin-nav-user { display: flex; align-items: center; gap: 10px; margin: 12px; padding: 12px; border-radius: 10px; background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.08); }
    .admin-nav-avatar { flex: none; width: 34px; height: 34px; border-radius: 50%; background: rgba(255,255,255,.1); display: flex; align-items: center; justify-content: center; color: #cbd5e1; }
    .admin-nav-avatar mat-icon { font-size: 20px; width: 20px; height: 20px; }
    .admin-nav-user-info { min-width: 0; }
    .admin-nav-user-info strong { display: block; font-size: 12.5px; color: #fff; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .admin-nav-user-info small { display: block; font-size: 10px; color: #64748b; font-weight: 800; letter-spacing: .04em; }

    .admin-toolbar-top { gap: 6px; }
    .admin-search { width: min(360px, 100%); }
    .sign-out-btn { display: inline-flex; align-items: center; gap: 8px; font-weight: 700; color: var(--ink); }
    .sign-out-btn mat-icon { font-size: 18px; width: 18px; height: 18px; }

    .notif-menu { max-width: 320px; }
    .notif-empty { padding: 16px; color: var(--muted); font-size: 13px; }
    .notif-item { display: flex; flex-direction: column; gap: 2px; padding: 4px 0; white-space: normal; }
    .notif-item small { color: var(--muted); }

    @media (max-width: 900px) {
      .admin-search { width: min(220px, 40vw); }
    }
    @media (max-width: 640px) {
      .admin-toolbar-top { gap: 2px; padding: 0 8px; }
      .admin-search { display: none; }
      .sign-out-btn span { display: none; }
    }
  `]
})
export class AdminShellComponent {
  auth = inject(AdminAuthService); router = inject(Router); admin = this.auth.admin(); api = inject(AdminApiService); messages = inject(MessageService);
  private breakpointObserver = inject(BreakpointObserver);
  unreadCount = 0;
  notifications: any[] = [];
  globalSearch = '';
  isHandset = false;
  sidenavOpened = true;

  menu = [
    { path: '/admin/dashboard', icon: 'dashboard', label: 'Dashboard' },
    { path: '/admin/companies', icon: 'business', label: 'Empresas' },
    { path: '/admin/plans', icon: 'sell', label: 'Planes' },
    { path: '/admin/payments', icon: 'payments', label: 'Pagos' },
    { path: '/admin/logs', icon: 'history', label: 'Registros' },
    { path: '/admin/staff', icon: 'group', label: 'Staff', permission: 'staff.manage' },
    { path: '/admin/staff-roles', icon: 'shield', label: 'Roles Staff', permission: 'staff.manage' },
  ];

  constructor() {
    this.loadNotifications();
    this.breakpointObserver.observe(['(max-width: 900px)']).subscribe(result => {
      this.isHandset = result.matches;
      this.sidenavOpened = !result.matches;
    });
    this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe(() => {
      if (this.isHandset) this.sidenavOpened = false;
    });
  }

  visibleMenu() { return this.menu.filter(item => !item.permission || this.auth.hasPermission(item.permission)); }

  runSearch() {
    if (!this.globalSearch.trim()) return;
    this.router.navigate(['/admin/companies'], { queryParams: { search: this.globalSearch.trim() } });
  }

  help() { this.messages.add({ severity: 'info', summary: 'Ayuda', detail: 'La documentacion del panel esta en construccion.' }); }
  settings() { this.messages.add({ severity: 'info', summary: 'Configuracion', detail: 'La configuracion general del panel estara disponible proximamente.' }); }

  loadNotifications() {
    this.api.get<any>('notifications').subscribe(res => {
      this.unreadCount = res.unread_count;
      this.notifications = res.notifications;
    });
  }

  markRead(notification: any) {
    if (notification.read_at) return;
    this.api.post(`notifications/${notification.id}/read`, {}).subscribe(() => this.loadNotifications());
  }

  logout() { this.auth.logout(); }
}
