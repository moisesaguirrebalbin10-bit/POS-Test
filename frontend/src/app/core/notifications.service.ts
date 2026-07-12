import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from './api.service';
import { RealtimeService } from './realtime.service';

export type NotificationItem = {
  id: number; type: string; severity: string; title: string; message: string;
  link: string | null; read_at: string | null; created_at: string;
};

@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private api = inject(ApiService);
  private realtime = inject(RealtimeService);

  notifications = signal<NotificationItem[]>([]);
  unreadCount = signal(0);

  private started = false;
  private pollTimer?: ReturnType<typeof setInterval>;

  start() {
    if (this.started) return;
    this.started = true;
    this.load();
    this.pollTimer = setInterval(() => this.load(), 45000);
    this.realtime.notificationCreated$.subscribe(() => this.load());
    this.realtime.tableRoundSent$.subscribe(() => this.load());
    this.realtime.tableItemDelivered$.subscribe(() => this.load());
    this.realtime.lowStockAlert$.subscribe(() => this.load());
  }

  load() {
    this.api.get<{ unread_count: number; notifications: NotificationItem[] }>('notifications').subscribe({
      next: r => { this.unreadCount.set(r.unread_count || 0); this.notifications.set(r.notifications || []); },
      error: () => {}
    });
  }

  badgeText(): string {
    const n = this.unreadCount();
    return n > 99 ? '99+' : String(n);
  }

  markRead(item: NotificationItem) {
    if (item.read_at) return;
    item.read_at = new Date().toISOString();
    this.unreadCount.set(Math.max(0, this.unreadCount() - 1));
    this.api.post(`notifications/${item.id}/read`, {}).subscribe({ error: () => this.load() });
  }

  markAllRead() {
    const now = new Date().toISOString();
    this.notifications.update(list => list.map(n => ({ ...n, read_at: n.read_at || now })));
    this.unreadCount.set(0);
    this.api.post('notifications/mark-all-read', {}).subscribe({ error: () => this.load() });
  }
}
