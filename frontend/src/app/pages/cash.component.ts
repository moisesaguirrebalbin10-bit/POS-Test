import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../core/api.service';

type CashStats = { isOpen: boolean; currentId: number | null; estimatedBalance: number };

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
  </section>`
})
export class CashComponent implements OnInit {
  api = inject(ApiService);
  cdr = inject(ChangeDetectorRef);
  registers: any[] = [];
  stats: CashStats | null = null;
  opening: number | null = null;
  counted: number | null = null;
  showFullHistory = false;

  ngOnInit() { this.load(); }

  load() {
    this.api.get<any>('cash-registers').subscribe((r: any) => {
      this.registers = r.data || [];
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
