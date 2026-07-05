import { Injectable, inject } from '@angular/core';
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

@Injectable({ providedIn: 'root' })
export class RealtimeService {
  private auth = inject(AuthService);
  private echo: any = null;

  stockUpdated$ = new Subject<StockUpdatedEvent>();
  lowStockAlert$ = new Subject<LowStockAlertEvent>();
  saleCreated$ = new Subject<SaleCreatedEvent>();
  cashRegisterChanged$ = new Subject<CashRegisterChangedEvent>();

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
      .listen('.cash-register.status-changed', (e: any) => this.cashRegisterChanged$.next({ status: e.status, userName: e.userName }));
  }

  disconnect() {
    this.echo?.disconnect();
    this.echo = null;
  }
}
