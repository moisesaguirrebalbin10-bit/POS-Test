import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MessageService } from 'primeng/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AdminApiService } from '../core/admin-api.service';

type LogRow = {
  id: number; user_name: string | null; module: string; action: string; description: string;
  created_at: string; ip_address: string | null; company: { id: number; name: string; license_key: string } | null;
};
type LogStats = {
  eventsTotal: number; eventsTrend: number | null;
  securityAlertsToday: number; securityAlertsDelta: number;
  activeUsers24h: number; activeUsersTrend: number | null;
  modules: string[];
};

const MODULE_LABELS: Record<string, string> = {
  auth: 'Autenticacion', users: 'Usuarios', roles: 'Roles', products: 'Inventario',
  warehouses: 'Almacenes', categories: 'Categorias', sales: 'Ventas', 'expenses-income': 'Finanzas',
  cash: 'Caja', tables: 'Mesas', 'company-settings': 'Configuracion',
};
const ACTION_META: Record<string, { label: string; class: string }> = {
  create: { label: 'Creacion', class: 'action-create' },
  update: { label: 'Edicion', class: 'action-update' },
  delete: { label: 'Eliminacion', class: 'action-delete' },
  login: { label: 'Inicio de sesion', class: 'action-login' },
  logout: { label: 'Cierre de sesion', class: 'action-login' },
  register: { label: 'Registro', class: 'action-create' },
  transfer: { label: 'Transferencia', class: 'action-update' },
  'round-sent': { label: 'Pedido a cocina', class: 'action-update' },
  charge: { label: 'Cobro', class: 'action-create' },
  open: { label: 'Apertura', class: 'action-create' },
  close: { label: 'Cierre', class: 'action-update' },
  onboarding: { label: 'Configuracion inicial', class: 'action-update' },
  'voucher-pdf': { label: 'Comprobante PDF', class: 'action-update' },
  'update-status': { label: 'Cambio de estado', class: 'action-update' },
};

@Component({
  selector: 'app-admin-logs', standalone: true,
  imports: [DatePipe, FormsModule, MatIconModule, MatButtonModule],
  template: `
  <section class="admin-page">
    <header class="admin-head"><div><span class="eyebrow">Panel Administrativo</span><h1>Registros del Sistema</h1><p>Historial centralizado de actividad de todas las empresas y administradores.</p></div></header>

    @if (stats) {
      <div class="stats-row">
        <article class="stat-tile"><mat-icon>bar_chart</mat-icon><div><small>Eventos Totales</small><strong>{{stats.eventsTotal}}</strong>
          @if (stats.eventsTrend === null) { <span class="stat-trend neutral">Sin datos de ayer</span> }
          @else if (stats.eventsTrend >= 0) { <span class="stat-trend positive">+{{stats.eventsTrend}}% hoy</span> }
          @else { <span class="stat-trend negative">{{stats.eventsTrend}}% hoy</span> }
        </div></article>
        <article class="stat-tile" [class.warn]="stats.securityAlertsToday > 0"><mat-icon>shield</mat-icon><div><small>Alertas de Seguridad</small><strong>{{stats.securityAlertsToday}}</strong>
          @if (stats.securityAlertsDelta === 0) { <span class="stat-trend neutral">Sin cambios vs ayer</span> }
          @else if (stats.securityAlertsDelta > 0) { <span class="stat-trend negative">+{{stats.securityAlertsDelta}} vs ayer</span> }
          @else { <span class="stat-trend positive">{{stats.securityAlertsDelta}} vs ayer</span> }
        </div></article>
        <article class="stat-tile ok"><mat-icon>how_to_reg</mat-icon><div><small>Usuarios Activos (24h)</small><strong>{{stats.activeUsers24h}}</strong>
          @if (stats.activeUsersTrend === null) { <span class="stat-trend neutral">Estables</span> }
          @else if (stats.activeUsersTrend >= 0) { <span class="stat-trend positive">+{{stats.activeUsersTrend}}% vs 24h previas</span> }
          @else { <span class="stat-trend negative">{{stats.activeUsersTrend}}% vs 24h previas</span> }
        </div></article>
      </div>
    }

    <div class="admin-panel">
      <div class="logs-filter-row">
        <div class="report-field"><label>Empresa</label>
          <select class="date-preset-select" [(ngModel)]="companyFilter">
            <option value="">Todas las Empresas</option>
            @for (c of companies; track c.id) { <option [value]="c.id">{{c.name}}</option> }
          </select>
        </div>
        <div class="report-field"><label>Modulo</label>
          <select class="date-preset-select" [(ngModel)]="moduleFilter">
            <option value="">Todos los Modulos</option>
            @for (m of stats?.modules || []; track m) { <option [value]="m">{{moduleLabel(m)}}</option> }
          </select>
        </div>
        <div class="report-field"><label>Desde</label><input type="date" class="date-input" [(ngModel)]="from"></div>
        <div class="report-field"><label>Hasta</label><input type="date" class="date-input" [(ngModel)]="to"></div>
        <div class="logs-filter-actions">
          <button type="button" class="filter-btn" (click)="clearFilters()">Limpiar Filtros</button>
          <button mat-flat-button class="primary-action" (click)="applyFilters()"><mat-icon>filter_alt</mat-icon>Aplicar</button>
        </div>
      </div>

      @if (loading) { <div class="loading-state"><mat-icon>hourglass_empty</mat-icon><p>Cargando...</p></div> }
      @else {
        <div class="data-table">
          <div class="data-row table-head" [style.--cols]="6"><span>Timestamp</span><span>Empresa</span><span>Usuario</span><span>Modulo</span><span>Accion</span><span>IP Address</span></div>
          @for (l of logs; track l.id) {
            <div class="data-row" [style.--cols]="6">
              <span>{{l.created_at | date:'dd/MM/yyyy HH:mm:ss'}}</span>
              <span class="user-name-cell"><span><b>{{l.company?.name || 'Sistema'}}</b><small>{{l.company?.license_key || '-'}}</small></span></span>
              <span>{{l.user_name || 'Sistema'}}</span>
              <span><span class="category-pill">{{moduleLabel(l.module)}}</span></span>
              <span class="action-cell" [class]="actionMeta(l.action).class">{{actionMeta(l.action).label}}</span>
              <span>{{l.ip_address || '-'}}</span>
            </div>
          }
        </div>
        @if (!logs.length) { <div class="empty-state"><mat-icon>inbox</mat-icon><p>No hay registros para los filtros seleccionados.</p></div> }
        @if (total > 0) {
          <div class="pagination-bar">
            <span class="pagination-label">Mostrando {{rangeStart()}} - {{rangeEnd()}} de {{total}} resultados</span>
            <div class="pagination-controls">
              <button type="button" class="page-btn" [disabled]="page <= 1" (click)="goToPage(page - 1)"><mat-icon>chevron_left</mat-icon></button>
              @for (p of pageNumbers(); track p) { <button type="button" class="page-btn" [class.current]="p === page" (click)="goToPage(p)">{{p}}</button> }
              <button type="button" class="page-btn" [disabled]="page >= lastPage" (click)="goToPage(page + 1)"><mat-icon>chevron_right</mat-icon></button>
            </div>
          </div>
        }
      }

      <div class="logs-export-row">
        <button type="button" class="filter-btn" (click)="exportCsv()"><mat-icon>download</mat-icon>Exportar CSV</button>
        <button mat-flat-button class="primary-action" (click)="exportPdf()"><mat-icon>picture_as_pdf</mat-icon>Generar Reporte PDF</button>
      </div>
    </div>
  </section>`,
  styles: [`
    .logs-filter-row { display: flex; flex-wrap: wrap; align-items: end; gap: 12px; margin-bottom: 16px; }
    .logs-filter-row .report-field { min-width: 150px; }
    .logs-filter-actions { display: flex; align-items: center; gap: 10px; margin-left: auto; }
    .logs-export-row { display: flex; justify-content: flex-end; gap: 10px; margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--soft-line); }
    .action-cell { font-weight: 700; }
    .action-create { color: #047857; }
    .action-update { color: #1d4ed8; }
    .action-delete { color: #b42318; }
    .action-login { color: #7c3aed; }
  `]
})
export class AdminLogsComponent implements OnInit {
  api = inject(AdminApiService); cdr = inject(ChangeDetectorRef); messages = inject(MessageService);
  logs: LogRow[] = []; loading = false;
  stats: LogStats | null = null;
  companies: any[] = [];
  companyFilter = ''; moduleFilter = ''; from = ''; to = '';
  page = 1; lastPage = 1; total = 0; perPage = 25;

  ngOnInit() {
    this.loadStats();
    this.loadCompanies();
    this.load();
  }

  loadCompanies() { this.api.get<any>('companies', { per_page: 200 }).subscribe(res => { this.companies = res.data || []; this.cdr.detectChanges(); }); }

  loadStats() { this.api.get<any>('activity-logs-stats').subscribe(res => {
    this.stats = {
      eventsTotal: Number(res?.events_total || 0), eventsTrend: res?.events_trend === null || res?.events_trend === undefined ? null : Number(res.events_trend),
      securityAlertsToday: Number(res?.security_alerts_today || 0), securityAlertsDelta: Number(res?.security_alerts_delta || 0),
      activeUsers24h: Number(res?.active_users_24h || 0), activeUsersTrend: res?.active_users_trend === null || res?.active_users_trend === undefined ? null : Number(res.active_users_trend),
      modules: res?.modules || [],
    };
    this.cdr.detectChanges();
  }); }

  load() {
    this.loading = true;
    this.cdr.detectChanges();
    const params: any = {
      page: this.page, per_page: this.perPage,
      ...(this.companyFilter ? { company_id: this.companyFilter } : {}),
      ...(this.moduleFilter ? { module: this.moduleFilter } : {}),
      ...(this.from ? { from: this.from } : {}),
      ...(this.to ? { to: this.to } : {}),
    };
    this.api.get<any>('activity-logs', params).subscribe(res => {
      this.logs = res.data || [];
      this.total = res.total ?? this.logs.length;
      this.lastPage = res.last_page || 1;
      this.page = res.current_page || 1;
      this.loading = false;
      this.cdr.detectChanges();
    });
  }

  applyFilters() { this.page = 1; this.load(); }
  clearFilters() { this.companyFilter = ''; this.moduleFilter = ''; this.from = ''; this.to = ''; this.page = 1; this.load(); }

  rangeStart() { return this.total === 0 ? 0 : (this.page - 1) * this.perPage + 1; }
  rangeEnd() { return Math.min(this.page * this.perPage, this.total); }
  pageNumbers(): number[] {
    const span = 5;
    let start = Math.max(1, this.page - Math.floor(span / 2));
    const end = Math.min(this.lastPage, start + span - 1);
    start = Math.max(1, end - span + 1);
    const pages: number[] = [];
    for (let p = start; p <= end; p++) pages.push(p);
    return pages;
  }
  goToPage(p: number) { if (p < 1 || p > this.lastPage || p === this.page) return; this.page = p; this.load(); }

  moduleLabel(m: string) { return MODULE_LABELS[m] || m; }
  actionMeta(a: string) { return ACTION_META[a] || { label: a, class: 'action-update' }; }

  private fetchAllForExport(cb: (rows: LogRow[]) => void) {
    const params: any = {
      per_page: 1000,
      ...(this.companyFilter ? { company_id: this.companyFilter } : {}),
      ...(this.moduleFilter ? { module: this.moduleFilter } : {}),
      ...(this.from ? { from: this.from } : {}),
      ...(this.to ? { to: this.to } : {}),
    };
    this.api.get<any>('activity-logs', params).subscribe(res => {
      const rows = res?.data || [];
      if (!rows.length) { this.messages.add({ severity: 'warn', summary: 'Sin datos', detail: 'No hay registros para exportar.' }); return; }
      cb(rows);
    });
  }

  exportCsv() {
    this.fetchAllForExport(rows => {
      const header = ['Timestamp', 'Empresa', 'Usuario', 'Modulo', 'Accion', 'IP Address'];
      const body = rows.map(r => [new Date(r.created_at).toLocaleString('es-PE'), r.company?.name || 'Sistema', r.user_name || 'Sistema', this.moduleLabel(r.module), this.actionMeta(r.action).label, r.ip_address || '-']);
      const csv = [header, ...body].map(row => row.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; link.download = `registros-sistema-${new Date().toISOString().slice(0, 10)}.csv`; link.click();
      URL.revokeObjectURL(url);
    });
  }

  exportPdf() {
    this.fetchAllForExport(rows => {
      const doc = new jsPDF({ orientation: 'landscape' });
      doc.setFontSize(15);
      doc.text('Registros del Sistema - OptiUso', 14, 16);
      doc.setFontSize(9);
      doc.text(`Periodo: ${this.from || 'inicio'} - ${this.to || 'hoy'}`, 14, 23);
      autoTable(doc, {
        startY: 30,
        head: [['Timestamp', 'Empresa', 'Usuario', 'Modulo', 'Accion', 'IP Address']],
        body: rows.map(r => [new Date(r.created_at).toLocaleString('es-PE'), r.company?.name || 'Sistema', r.user_name || 'Sistema', this.moduleLabel(r.module), this.actionMeta(r.action).label, r.ip_address || '-']),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [17, 24, 39] },
      });
      doc.save(`registros-sistema-${new Date().toISOString().slice(0, 10)}.pdf`);
      this.messages.add({ severity: 'success', summary: 'PDF generado', detail: 'El reporte se descargo correctamente.' });
    });
  }
}
