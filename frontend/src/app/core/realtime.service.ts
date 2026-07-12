import { Injectable, inject, signal } from '@angular/core';
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import { Subject } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

(window as any).Pusher = Pusher;

export type StockUpdatedEvent = { productId: number; name: string; stock: number };
export type LowStockAlertEvent = { productId: number; name: string; stock: number; minStock: number };
export type SaleCreatedEvent = { voucherNumber: string; total: number; cashierName: string | null };
export type CashRegisterChangedEvent = { status: string; userName: string };
export type TableRoundSentEvent = { tableId: number | null; tableName: string | null; tableOrderId: number; roundId: number; orderType: string };
export type TableItemDeliveredEvent = { tableId: number | null; tableOrderId: number; itemId: number; allDelivered: boolean };
export type TableFreedEvent = { tableId: number };
export type ReservationChangedEvent = { reservationId: number; tableIds: number[]; status: string };
export type NotificationCreatedEvent = { id: number; type: string; severity: string; title: string; message: string; link: string | null; createdAt: string };

@Injectable({ providedIn: 'root' })
export class RealtimeService {
  private auth = inject(AuthService);
  private echo: any = null;

  connected = signal(false);

  stockUpdated$ = new Subject<StockUpdatedEvent>();
  lowStockAlert$ = new Subject<LowStockAlertEvent>();
  saleCreated$ = new Subject<SaleCreatedEvent>();
  cashRegisterChanged$ = new Subject<CashRegisterChangedEvent>();
  tableRoundSent$ = new Subject<TableRoundSentEvent>();
  tableItemDelivered$ = new Subject<TableItemDeliveredEvent>();
  tableFreed$ = new Subject<TableFreedEvent>();
  reservationChanged$ = new Subject<ReservationChangedEvent>();
  notificationCreated$ = new Subject<NotificationCreatedEvent>();

  connect() {
    const user = this.auth.user();
    if (!user?.company_id || this.echo) return;

    this.echo = new Echo({
      broadcaster: 'reverb',
      key: environment.reverbKey,
      wsHost: environment.reverbHost,
      wsPort: environment.reverbPort,
      wssPort: environment.reverbPort,
      forceTLS: environment.reverbScheme === 'https',
      enabledTransports: ['ws', 'wss'],
      authEndpoint: `${environment.apiUrl}/broadcasting/auth`,
      auth: { headers: { Authorization: `Bearer ${this.auth.token()}` } }
    });

    this.echo.private(`company.${user.company_id}`)
      .listen('.stock.updated', (e: any) => this.stockUpdated$.next({ productId: e.productId, name: e.name, stock: e.stock }))
      .listen('.stock.low', (e: any) => this.lowStockAlert$.next({ productId: e.productId, name: e.name, stock: e.stock, minStock: e.minStock }))
      .listen('.sale.created', (e: any) => this.saleCreated$.next({ voucherNumber: e.voucherNumber, total: e.total, cashierName: e.cashierName }))
      .listen('.cash-register.status-changed', (e: any) => this.cashRegisterChanged$.next({ status: e.status, userName: e.userName }))
      .listen('.table.round-sent', (e: any) => this.tableRoundSent$.next({ tableId: e.tableId, tableName: e.tableName, tableOrderId: e.tableOrderId, roundId: e.roundId, orderType: e.orderType }))
      .listen('.table.item-delivered', (e: any) => this.tableItemDelivered$.next({ tableId: e.tableId, tableOrderId: e.tableOrderId, itemId: e.itemId, allDelivered: e.allDelivered }))
      .listen('.table.freed', (e: any) => this.tableFreed$.next({ tableId: e.tableId }))
      .listen('.reservation.changed', (e: any) => this.reservationChanged$.next({ reservationId: e.reservationId, tableIds: e.tableIds || [], status: e.status }))
      .listen('.notification.created', (e: any) => this.notificationCreated$.next({ id: e.id, type: e.type, severity: e.severity, title: e.title, message: e.message, link: e.link, createdAt: e.createdAt }));

    const connection = this.echo.connector?.pusher?.connection;
    if (connection) {
      this.connected.set(connection.state === 'connected');
      connection.bind('connected', () => this.connected.set(true));
      connection.bind('disconnected', () => this.connected.set(false));
      connection.bind('unavailable', () => this.connected.set(false));
      connection.bind('failed', () => this.connected.set(false));
    }
  }

  disconnect() {
    this.echo?.disconnect();
    this.echo = null;
    this.connected.set(false);
  }
}
