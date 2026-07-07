import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MessageService } from 'primeng/api';
import { AdminApiService } from '../core/admin-api.service';

type Stats = {
  companies_total: number;
  companies_trend_percent: number | null;
  companies_by_status: Record<string, number>;
  companies_by_plan: Record<string, number>;
  users_total: number;
  active_session_percent: number | null;
  sales_total: number;
  sales_count: number;
  platform_revenue: number;
  portfolio_health_percent: number | null;
  recent_companies: any[];
};

const STATUS_LABELS: Record<string, string> = { trial: 'Prueba', active: 'Activa', past_due: 'Pago pendiente', suspended: 'Suspendida', cancelled: 'Cancelada' };

@Component({
  selector: 'app-admin-dashboard', standalone: true,
  imports: [CurrencyPipe, DatePipe, RouterLink, MatIconModule, MatMenuModule],
  template: `
  <section class="admin-page dashboard-page">
    <header class="admin-head">
      <div><span class="eyebrow">Panel Administrativo</span><h1>Dashboard</h1><p>Resumen de todas las empresas registradas en ServiMax. Sistema central de monitoreo de KPIs operativos y comerciales.</p></div>
    </header>

    @if (stats) {
      <div class="kpi-grid">
        <article class="kpi-card kpi-blue">
          <mat-icon class="kpi-corner-icon">business</mat-icon>
          <div class="kpi-body">
            <span>Empresas Totales</span>
            <strong>{{stats.companies_total}}</strong>
            @if (stats.companies_trend_percent === null) { <small>Sin datos del mes anterior</small> }
            @else { <small><mat-icon>trending_up</mat-icon>+{{stats.companies_trend_percent}}% vs mes anterior</small> }
          </div>
        </article>
        <article class="kpi-card kpi-green">
          <mat-icon class="kpi-corner-icon">payments</mat-icon>
          <div class="kpi-body"><span>Ingresos de la Plataforma</span><strong>{{stats.platform_revenue | currency:'PEN':'S/ '}}</strong><small>Pagos confirmados</small></div>
        </article>
        <article class="kpi-card kpi-orange">
          <mat-icon class="kpi-corner-icon">point_of_sale</mat-icon>
          <div class="kpi-body"><span>Ventas Totales (Ecosistema)</span><strong>{{stats.sales_total | currency:'PEN':'S/ '}}</strong><small>{{stats.sales_count}} comprobantes</small></div>
        </article>
        <article class="kpi-card kpi-purple">
          <mat-icon class="kpi-corner-icon">group</mat-icon>
          <div class="kpi-body">
            <span>Usuarios Registrados</span>
            <strong>{{stats.users_total}}</strong>
            @if (stats.active_session_percent === null) { <small>Sin usuarios activos</small> }
            @else { <small>Sesion activa: {{stats.active_session_percent}}%</small> }
          </div>
        </article>
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
          @if (stats.portfolio_health_percent !== null) {
            <div class="health-bar"><span>Cuentas al dia (activas + prueba)</span><b>{{stats.portfolio_health_percent}}%</b></div>
          }
        </article>
      </div>

      <article class="chart-card chart-card-wide">
        <div class="chart-card-head">
          <header><mat-icon>schedule</mat-icon><h3>Empresas Recientes</h3></header>
          <button type="button" class="filter-btn" (click)="exportCsv()"><mat-icon>download</mat-icon>Exportar .csv</button>
        </div>
        <div class="data-table">
          <div class="data-row table-head" style="--cols:4"><span>Empresa</span><span>Plan</span><span>Estado</span><span>Registrada</span><span class="table-actions">Acciones</span></div>
          @for (c of stats.recent_companies; track c.id) {
            <div class="data-row" style="--cols:4">
              <span class="user-name-cell"><span class="user-avatar-initials">{{initials(c.name)}}</span><span><b>{{c.name}}</b><small>{{c.license_key}}</small></span></span>
              <span>{{c.plan?.name || 'Sin plan'}}</span>
              <span><b class="status-chip" [class]="'status-' + c.status">{{statusLabel(c.status)}}</b></span>
              <span>{{c.created_at | date:'dd/MM/yyyy'}}</span>
              <span class="table-actions">
                <button type="button" class="icon-btn small" [matMenuTriggerFor]="rowMenu"><mat-icon>more_vert</mat-icon></button>
                <mat-menu #rowMenu="matMenu">
                  <button mat-menu-item [routerLink]="['/admin/companies', c.id]"><mat-icon>visibility</mat-icon>Ver detalle</button>
                  @if (c.status === 'suspended') {
                    <button mat-menu-item (click)="toggleStatus(c)"><mat-icon>play_circle</mat-icon>Reactivar</button>
                  } @else {
                    <button mat-menu-item (click)="toggleStatus(c)"><mat-icon>pause_circle</mat-icon>Suspender</button>
                  }
                </mat-menu>
              </span>
            </div>
          }
        </div>
        <div class="pagination-bar">
          <span class="pagination-label">Mostrando {{stats.recent_companies.length}} de {{stats.companies_total}} empresas</span>
          <a routerLink="/admin/companies" class="link-btn">Ver todas <mat-icon>arrow_forward</mat-icon></a>
        </div>
      </article>

      <footer class="admin-dashboard-footer">
        <span><b>ServiMax OS</b> &middot; Uso Interno</span>
        <span>&copy; {{currentYear}} ServiMax. Todos los derechos reservados.</span>
      </footer>
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

    .health-bar { display: flex; align-items: center; justify-content: space-between; margin-top: 16px; padding: 12px 14px; border-radius: 10px; background: #eef6ff; color: #1d4ed8; font-size: 12.5px; font-weight: 700; }
    .health-bar b { font-size: 15px; }
    html.app-dark .health-bar { background: var(--surface-2); color: #93c5fd; }

    .kpi-card { position: relative; }
    .kpi-corner-icon { position: absolute; top: 14px; right: 14px; width: 32px !important; height: 32px !important; font-size: 32px !important; opacity: .28; color: #fff; }

    .pagination-bar .link-btn { display: inline-flex; align-items: center; gap: 4px; color: var(--primary-strong); font-weight: 700; font-size: 12.5px; text-decoration: none; }
    .pagination-bar .link-btn:hover { text-decoration: underline; }
    .pagination-bar .link-btn mat-icon { font-size: 15px; width: 15px; height: 15px; }

    .admin-dashboard-footer { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 18px; padding: 14px 4px 4px; color: var(--muted); font-size: 12px; border-top: 1px solid var(--soft-line); flex-wrap: wrap; }
    .admin-dashboard-footer b { color: var(--ink); }
  `]
})
export class AdminDashboardComponent implements OnInit {
  api = inject(AdminApiService); cdr = inject(ChangeDetectorRef); messages = inject(MessageService);
  stats: Stats | null = null;
  currentYear = new Date().getFullYear();

  ngOnInit() { this.load(); }

  load() {
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

  initials(name: string | null) {
    if (!name) return 'NA';
    const parts = name.trim().split(/\s+/);
    return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || 'NA';
  }

  toggleStatus(company: any) {
    const newStatus = company.status === 'suspended' ? 'active' : 'suspended';
    this.api.put<any>(`companies/${company.id}/status`, { status: newStatus }).subscribe({
      next: () => {
        this.messages.add({ severity: 'success', summary: 'Actualizado', detail: `"${company.name}" ${newStatus === 'suspended' ? 'fue suspendida' : 'fue reactivada'}.` });
        this.load();
      },
      error: (err: any) => this.messages.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'No autorizado para esta accion.' })
    });
  }

  exportCsv() {
    if (!this.stats?.recent_companies?.length) return;
    const header = ['Empresa', 'ID', 'Plan', 'Estado', 'Registrada'];
    const rows = this.stats.recent_companies.map(c => [c.name, c.license_key, c.plan?.name || 'Sin plan', this.statusLabel(c.status), new Date(c.created_at).toLocaleDateString('es-PE')]);
    const csv = [header, ...rows].map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `empresas-recientes-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }
}
