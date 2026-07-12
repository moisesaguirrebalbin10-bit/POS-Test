import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ApiService } from '../core/api.service';
import { NotificationsService, NotificationItem } from '../core/notifications.service';

const TYPE_LABELS: Record<string, string> = {
  low_stock: 'Stock bajo',
  out_of_stock: 'Sin stock',
  order_delay: 'Pedido demorado',
};

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [DatePipe, MatIconModule, MatButtonModule],
  template: `
  <section class="admin-page">
    <header class="admin-head">
      <div><span class="eyebrow">Alertas</span><h1>Notificaciones</h1><p>Stock bajo, productos agotados y pedidos demorados en cocina.</p></div>
      <div class="header-actions">
        <button mat-flat-button class="filter-action" [disabled]="!notifications.unreadCount()" (click)="notifications.markAllRead()">
          <mat-icon>done_all</mat-icon>Marcar todas como vista
        </button>
      </div>
    </header>

    <div class="admin-panel">
      <div class="panel-subhead">
        <h3>Historial</h3>
        <span class="pagination-label">Mostrando {{rows.length}} de {{total}}</span>
      </div>

      @if (loading && !rows.length) { <div class="loading-state"><mat-icon>hourglass_empty</mat-icon><p>Cargando notificaciones...</p></div> }
      @if (!loading && !rows.length) { <div class="empty-state"><mat-icon>notifications_none</mat-icon><p>No hay notificaciones todavia.</p></div> }

      <div class="notif-list-full">
        @for (n of rows; track n.id) {
          <button type="button" class="notif-row" [class.unread]="!n.read_at" (click)="open(n)">
            <span class="notif-row-icon" [class]="'sev-' + n.severity"><mat-icon>{{icon(n.type)}}</mat-icon></span>
            <span class="notif-row-body">
              <strong>{{n.title}} <small class="notif-type-tag">{{typeLabel(n.type)}}</small></strong>
              <small>{{n.message}}</small>
              <small class="notif-row-time">{{n.created_at | date:'dd/MM/yyyy HH:mm'}}</small>
            </span>
            @if (!n.read_at) { <span class="notif-row-dot"></span> }
          </button>
        }
      </div>

      @if (total > 0) {
        <div class="pagination-bar">
          <span class="pagination-label">Pagina {{page}} de {{lastPage}}</span>
          <div class="pagination-controls">
            <button type="button" class="page-btn" [disabled]="page <= 1" (click)="goToPage(page - 1)"><mat-icon>chevron_left</mat-icon></button>
            <button type="button" class="page-btn" [disabled]="page >= lastPage" (click)="goToPage(page + 1)"><mat-icon>chevron_right</mat-icon></button>
          </div>
        </div>
      }
    </div>
  </section>`
})
export class NotificationsComponent implements OnInit {
  api = inject(ApiService); router = inject(Router); cdr = inject(ChangeDetectorRef);
  notifications = inject(NotificationsService);

  rows: NotificationItem[] = [];
  total = 0; page = 1; lastPage = 1; loading = false;

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    this.api.get<any>('notifications-all', { page: this.page, per_page: 20 }).subscribe({
      next: r => {
        this.rows = r?.data || [];
        this.total = r?.total || 0;
        this.lastPage = r?.last_page || 1;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => { this.loading = false; this.cdr.detectChanges(); }
    });
  }

  goToPage(p: number) {
    if (p < 1 || p > this.lastPage) return;
    this.page = p;
    this.load();
  }

  icon(type: string): string {
    if (type === 'out_of_stock') return 'remove_shopping_cart';
    if (type === 'low_stock') return 'inventory_2';
    if (type === 'order_delay') return 'schedule';
    return 'notifications';
  }

  typeLabel(type: string): string { return TYPE_LABELS[type] || type; }

  open(n: NotificationItem) {
    this.notifications.markRead(n);
    n.read_at = n.read_at || new Date().toISOString();
    if (n.link) this.router.navigateByUrl(n.link);
  }
}
