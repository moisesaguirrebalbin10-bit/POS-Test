import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../core/api.service';

type CashStats = { isOpen: boolean; currentId: number | null; estimatedBalance: number };
type TurnoOrder = {
  id: number; code: string; type: string; type_label: string; reference: string | null;
  items_count: number; payment_method: string; total: number | string; cashier: string | null; created_at: string;
};
type TurnoExpense = { id: number; category: string; description: string; amount: number | string; created_at: string };
type Turno = { orders: TurnoOrder[]; orders_total: number; expenses: TurnoExpense[]; expenses_total: number };

@Component({
  selector: 'app-cash',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, FormsModule, MatButtonModule, MatIconModule],
  template: `
  <section class="admin-page">
    <header class="admin-head cash-summary-head">
      <div>
        <span class="eyebrow">Control diario de operaciones</span>
        <h1>Resumen de Caja <span class="status-chip" [class.off]="!stats?.isOpen">{{stats?.isOpen ? 'Caja Abierta' : 'Caja Cerrada'}}</span></h1>
      </div>
      <div class="cash-balance-block"><small>Saldo Actual Estimado</small><strong>{{number(stats?.estimatedBalance) | currency:'PEN':'S/ '}}</strong></div>
    </header>

    <div class="cash-op-grid">
      <article class="cash-op-card">
        <div class="cash-op-head"><span class="cash-op-icon open"><mat-icon>lock_open</mat-icon></span><h2>Apertura</h2></div>
        <label>Monto inicial de apertura</label>
        <input class="date-input full" type="number" min="0" [(ngModel)]="opening" placeholder="S/ 0.00">
        <button mat-flat-button class="primary-action full" (click)="open()" [disabled]="!!stats?.isOpen"><mat-icon>check_circle</mat-icon>Abrir Caja</button>
      </article>
      <article class="cash-op-card">
        <div class="cash-op-head"><span class="cash-op-icon close"><mat-icon>lock</mat-icon></span><h2>Cierre</h2></div>
        <label>Monto contado al cierre</label>
        <input class="date-input full" type="number" min="0" [(ngModel)]="counted" placeholder="S/ 0.00">
        <button mat-flat-button class="danger-action full" (click)="close()" [disabled]="!stats?.isOpen"><mat-icon>cancel</mat-icon>Cerrar Caja</button>
      </article>
    </div>

    <div class="admin-panel">
      <div class="panel-subhead">
        <h3><mat-icon>history</mat-icon>Historial Reciente de Cajas</h3>
        @if (registers.length > 4) { <a href="javascript:void(0)" (click)="showFullHistory = !showFullHistory">{{showFullHistory ? 'Ver menos' : 'Ver todo el historial'}}</a> }
      </div>

      <div class="cash-history-row">
        @for (c of recentRegisters(); track c.id) {
          <div class="cash-history-card">
            <div class="cash-history-top"><b>{{c.date | date:'dd/MM/yyyy'}}</b><span class="status-chip" [class.off]="c.status !== 'open'">{{c.status === 'open' ? 'Abierta' : 'Finalizada'}}</span></div>
            <div class="cash-history-row-item"><span>Apertura:</span><b>{{number(c.opening_amount) | currency:'PEN':'S/ '}}</b></div>
            <div class="cash-history-row-item"><span>Cierre:</span><b>{{c.counted_amount !== null ? (number(c.counted_amount) | currency:'PEN':'S/ ') : '-'}}</b></div>
            <div class="cash-history-row-item"><span>Diferencia:</span><b [class.income-amount]="c.difference > 0" [class.expense-amount]="c.difference < 0">{{c.difference !== null ? formatDiff(c.difference) : '-'}}</b></div>
          </div>
        }
      </div>

      @if (showFullHistory) {
        <div class="data-table cash-full-history">
          <div class="data-row table-head cash-row"><span>Fecha</span><span>Estado</span><span>Inicial</span><span>Contado</span><span>Diferencia</span><span>Apertura</span></div>
          @for (c of registers; track c.id) {
            <div class="data-row cash-row">
              <span>{{c.date | date:'dd/MM/yyyy'}}</span>
              <span><b class="status-chip" [class.off]="c.status !== 'open'">{{c.status === 'open' ? 'Abierta' : 'Cerrada'}}</b></span>
              <span>{{number(c.opening_amount) | currency:'PEN':'S/ '}}</span>
              <span>{{c.counted_amount !== null ? (number(c.counted_amount) | currency:'PEN':'S/ ') : '-'}}</span>
              <span [class.income-amount]="c.difference > 0" [class.expense-amount]="c.difference < 0">{{c.difference !== null ? formatDiff(c.difference) : '-'}}</span>
              <span>{{c.opened_at | date:'dd/MM HH:mm'}}</span>
            </div>
          }
        </div>
      }

      @if (!registers.length) { <div class="empty-state"><mat-icon>point_of_sale</mat-icon><p>No hay cajas registradas.</p></div> }
    </div>

    @if (turno) {
      <div class="admin-panel">
        <div class="panel-subhead">
          <div><h3>Todas las Ordenes</h3><small class="dim">Total: {{turno.orders_total}} ordenes completadas</small></div>
        </div>

        <div class="segmented-control turno-tabs">
          <button type="button" [class.active]="orderTypeFilter === 'all'" (click)="orderTypeFilter = 'all'">Todas <span class="count-pill">{{turno.orders_total}}</span></button>
          <button type="button" [class.active]="orderTypeFilter === 'mesa'" (click)="orderTypeFilter = 'mesa'">Mesa <span class="count-pill">{{ordersByType('mesa').length}}</span></button>
          <button type="button" [class.active]="orderTypeFilter === 'delivery'" (click)="orderTypeFilter = 'delivery'">Delivery <span class="count-pill">{{ordersByType('delivery').length}}</span></button>
          <button type="button" [class.active]="orderTypeFilter === 'para_llevar'" (click)="orderTypeFilter = 'para_llevar'">Para llevar <span class="count-pill">{{ordersByType('para_llevar').length}}</span></button>
        </div>

        @if (!filteredOrders().length) {
          <div class="empty-state"><mat-icon>receipt_long</mat-icon><p>No hay ordenes para este filtro.</p></div>
        } @else {
          <div class="data-table">
            <div class="data-row table-head" [style.--cols]="8"><span>#</span><span>Tipo</span><span>Mesa/Cliente</span><span>Items</span><span>Pago</span><span class="money-cell">Total</span><span>Cobrado por</span><span>Hora</span></div>
            @for (row of filteredOrders(); track row.id) {
              <div class="data-row" [style.--cols]="8">
                <span class="voucher-code">{{row.code}}</span>
                <span><span class="category-pill">{{row.type_label}}</span></span>
                <span>{{row.reference || '-'}}</span>
                <span><span class="count-pill">{{row.items_count}}</span></span>
                <span class="payment-cell"><mat-icon>{{paymentIcons[row.payment_method] || 'payments'}}</mat-icon>{{paymentLabels[row.payment_method] || row.payment_method}}</span>
                <span class="money-cell"><b>{{number(row.total) | currency:'PEN':'S/ '}}</b></span>
                <span>{{row.cashier || '-'}}</span>
                <span>{{row.created_at | date:'HH:mm'}}</span>
              </div>
            }
          </div>
        }
      </div>

      <div class="admin-panel">
        <div class="panel-subhead">
          <div><h3>Gastos del Turno</h3><small class="dim">Total: {{turno.expenses.length}} gastos &middot; {{turno.expenses_total | currency:'PEN':'S/ '}}</small></div>
        </div>

        @if (!turno.expenses.length) {
          <div class="empty-state"><mat-icon>payments</mat-icon><p>No se registraron gastos en este turno.</p></div>
        } @else {
          <div class="data-table">
            <div class="data-row table-head" [style.--cols]="3"><span>Categoria</span><span>Descripcion</span><span class="money-cell">Monto</span></div>
            @for (row of turno.expenses; track row.id) {
              <div class="data-row" [style.--cols]="3">
                <span><span class="category-pill">{{row.category}}</span></span>
                <span>{{row.description}}</span>
                <span class="money-cell expense-amount"><b>{{number(row.amount) | currency:'PEN':'S/ '}}</b></span>
              </div>
            }
          </div>
        }
      </div>
    }
  </section>`,
  styles: [`
    .dim { color: var(--muted); font-size: 12px; }
    .turno-tabs { margin-bottom: 14px; }
    .turno-tabs button { display: flex; align-items: center; gap: 6px; }
    .turno-tabs .count-pill { padding: 1px 7px; font-size: 11px; }
  `]
})
export class CashComponent implements OnInit {
  api = inject(ApiService);
  cdr = inject(ChangeDetectorRef);
  registers: any[] = [];
  stats: CashStats | null = null;
  opening: number | null = null;
  counted: number | null = null;
  showFullHistory = false;

  turno: Turno | null = null;
  orderTypeFilter: 'all' | 'mesa' | 'delivery' | 'para_llevar' = 'all';
  paymentIcons: Record<string, string> = { cash: 'payments', yape: 'smartphone', plin: 'smartphone', card: 'credit_card', transfer: 'account_balance', mixed: 'call_split' };
  paymentLabels: Record<string, string> = { cash: 'Efectivo', yape: 'Yape', plin: 'Plin', card: 'Tarjeta', transfer: 'Transferencia', mixed: 'Mixto' };

  ngOnInit() { this.load(); }

  load() {
    this.api.get<any>('cash-registers').subscribe((r: any) => {
      this.registers = r.data || [];
      this.loadTurno();
      this.cdr.detectChanges();
    });
    this.loadStats();
  }

  loadStats() {
    this.api.get<any>('cash-registers-stats').subscribe(res => {
      this.stats = { isOpen: !!res?.is_open, currentId: res?.current_id ?? null, estimatedBalance: Number(res?.estimated_balance || 0) };
      this.cdr.detectChanges();
    });
  }

  loadTurno() {
    const registerId = this.stats?.currentId || this.registers[0]?.id;
    if (!registerId) { this.turno = null; return; }
    this.api.get<Turno>(`cash-registers/${registerId}/turno`).subscribe(t => { this.turno = t; this.cdr.detectChanges(); });
  }

  ordersByType(type: string): TurnoOrder[] { return this.turno?.orders.filter(o => o.type === type) || []; }
  filteredOrders(): TurnoOrder[] {
    if (!this.turno) return [];
    return this.orderTypeFilter === 'all' ? this.turno.orders : this.ordersByType(this.orderTypeFilter);
  }

  recentRegisters() { return this.registers.slice(0, 4); }

  open() { this.api.post('cash-registers', { opening_amount: this.opening || 0 }).subscribe(() => { this.opening = null; this.load(); }); }
  close() {
    if (!this.stats?.currentId) return;
    this.api.post(`cash-registers/${this.stats.currentId}/close`, { counted_amount: this.counted || 0 }).subscribe(() => { this.counted = null; this.load(); });
  }

  number(value: unknown) { return Number(value || 0); }
  formatDiff(value: number) {
    const v = Number(value || 0);
    const abs = new Intl.NumberFormat('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(v));
    if (v > 0) return `+S/ ${abs}`;
    if (v < 0) return `- S/ ${abs}`;
    return `S/ ${abs}`;
  }
}
