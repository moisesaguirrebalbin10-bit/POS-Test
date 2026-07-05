import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AdminApiService } from '../core/admin-api.service';

type Stats = {
  companies_total: number;
  companies_by_status: Record<string, number>;
  companies_by_plan: Record<string, number>;
  users_total: number;
  sales_total: number;
  sales_count: number;
  platform_revenue: number;
  recent_companies: any[];
};

const STATUS_LABELS: Record<string, string> = { trial: 'Prueba', active: 'Activa', past_due: 'Pago pendiente', suspended: 'Suspendida', cancelled: 'Cancelada' };

@Component({
  selector: 'app-admin-dashboard', standalone: true,
  imports: [CurrencyPipe, DatePipe, RouterLink, MatIconModule],
  template: `
  <section class="admin-page">
    <header class="admin-head">
      <div><span class="eyebrow">Panel Administrativo</span><h1>Dashboard</h1><p>Resumen de todas las empresas registradas en ServiMax.</p></div>
    </header>

    @if (stats) {
      <div class="kpi-grid">
        <article class="kpi-card kpi-blue"><div class="kpi-icon"><mat-icon>business</mat-icon></div><div class="kpi-body"><span>Empresas totales</span><strong>{{stats.companies_total}}</strong></div></article>
        <article class="kpi-card kpi-green"><div class="kpi-icon"><mat-icon>payments</mat-icon></div><div class="kpi-body"><span>Ingresos de la plataforma</span><strong>{{stats.platform_revenue | currency:'PEN':'S/ '}}</strong></div></article>
        <article class="kpi-card kpi-orange"><div class="kpi-icon"><mat-icon>point_of_sale</mat-icon></div><div class="kpi-body"><span>Ventas totales (todas las empresas)</span><strong>{{stats.sales_total | currency:'PEN':'S/ '}}</strong></div></article>
        <article class="kpi-card kpi-purple"><div class="kpi-icon"><mat-icon>group</mat-icon></div><div class="kpi-body"><span>Usuarios registrados</span><strong>{{stats.users_total}}</strong></div></article>
      </div>

      <div class="dashboard-charts two-col">
        <article class="chart-card">
          <header><mat-icon>sell</mat-icon><h3>Empresas por plan</h3></header>
          <div class="bar-list">
            @for (row of planRows(); track row.label) {
              <div class="bar-row">
                <span class="bar-label">{{row.label}}</span>
                <div class="bar-track"><div class="bar-fill" [style.width.%]="row.percent"></div></div>
                <b>{{row.count}}</b>
              </div>
            }
          </div>
        </article>
        <article class="chart-card">
          <header><mat-icon>flag</mat-icon><h3>Empresas por estado</h3></header>
          <div class="status-badges">
            @for (row of statusRows(); track row.key) {
              <div class="status-badge" [class]="'status-' + row.key">
                <strong>{{row.count}}</strong>
                <span>{{row.label}}</span>
              </div>
            }
          </div>
        </article>
      </div>

      <article class="chart-card chart-card-wide">
        <header><mat-icon>schedule</mat-icon><h3>Empresas recientes</h3></header>
        <div class="data-table">
          <div class="data-row table-head" style="--cols:4"><span>Empresa</span><span>Plan</span><span>Estado</span><span>Registrada</span></div>
          @for (c of stats.recent_companies; track c.id) {
            <div class="data-row" style="--cols:4">
              <span><a [routerLink]="['/admin/companies', c.id]">{{c.name}}</a></span>
              <span>{{c.plan?.name || 'Sin plan'}}</span>
              <span><b class="status-chip" [class]="'status-' + c.status">{{statusLabel(c.status)}}</b></span>
              <span>{{c.created_at | date:'dd/MM/yyyy'}}</span>
            </div>
          }
        </div>
      </article>
    }
  </section>`,
  styles: [`
    .bar-list { display: flex; flex-direction: column; gap: 14px; }
    .bar-row { display: grid; grid-template-columns: 110px 1fr 30px; align-items: center; gap: 10px; }
    .bar-label { font-size: 13px; color: var(--muted); }
    .bar-track { height: 10px; border-radius: 999px; background: var(--surface-2); overflow: hidden; }
    .bar-fill { height: 100%; background: var(--primary); border-radius: 999px; }
    .bar-row b { text-align: right; font-size: 13px; }

    .status-badges { display: flex; flex-wrap: wrap; gap: 12px; }
    .status-badge { flex: 1 1 100px; border-radius: 12px; padding: 12px; text-align: center; background: var(--surface-2); border: 1px solid var(--line); }
    .status-badge strong { display: block; font-size: 22px; }
    .status-badge span { font-size: 12px; color: var(--muted); }
    .status-badge.status-active strong { color: #16a34a; }
    .status-badge.status-trial strong { color: #ca8a04; }
    .status-badge.status-suspended strong, .status-badge.status-cancelled strong, .status-badge.status-past_due strong { color: #dc2626; }

    .status-chip.status-active { background: #dcfce7; color: #16a34a; }
    .status-chip.status-trial { background: #fef9c3; color: #a16207; }
    .status-chip.status-suspended, .status-chip.status-cancelled, .status-chip.status-past_due { background: #fee2e2; color: #dc2626; }
  `]
})
export class AdminDashboardComponent implements OnInit {
  api = inject(AdminApiService); cdr = inject(ChangeDetectorRef);
  stats: Stats | null = null;

  ngOnInit() {
    this.api.get<Stats>('stats').subscribe(res => { this.stats = res; this.cdr.detectChanges(); });
  }

  planRows() {
    if (!this.stats) return [];
    const entries = Object.entries(this.stats.companies_by_plan);
    const max = Math.max(1, ...entries.map(([, count]) => count));
    return entries.map(([label, count]) => ({ label, count, percent: (count / max) * 100 }));
  }

  statusRows() {
    if (!this.stats) return [];
    return Object.entries(this.stats.companies_by_status).map(([key, count]) => ({ key, count, label: STATUS_LABELS[key] || key }));
  }

  statusLabel(status: string) { return STATUS_LABELS[status] || status; }
}
