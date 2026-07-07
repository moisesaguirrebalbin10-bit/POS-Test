import { ChangeDetectorRef, Component, ElementRef, OnInit, ViewChild, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MessageService } from 'primeng/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { strToU8, zipSync } from 'fflate';
import { Chart } from 'chart.js/auto';
import { ApiService } from '../core/api.service';
import { BrandingService } from '../core/branding.service';

type LogRow = { id: number; user_name: string | null; module: string; action: string; description: string; created_at: string };
type LogStats = {
  eventsToday: number; eventsTrend: number | null;
  securityAlerts: number; activeUsers: number;
  hourly: { hour: number; count: number; percent: number }[];
  peakLabel: string | null;
  modules: string[];
};

@Component({
  selector: 'app-activity-log',
  standalone: true,
  imports: [DatePipe, FormsModule, MatIconModule, MatButtonModule],
  template: `
  <section class="admin-page">
    <header class="admin-head">
      <div><span class="eyebrow">Administracion</span><h1>Registros de Auditoria</h1><p>Historial completo de acciones y eventos de seguridad del sistema.</p></div>
      <div class="header-actions">
        <select class="date-preset-select" [(ngModel)]="datePreset" (ngModelChange)="onFiltersChange()">
          <option value="today">Hoy</option>
          <option value="7d">Ultimos 7 dias</option>
          <option value="30d">Ultimos 30 dias</option>
          <option value="all">Todo el historial</option>
        </select>
        <select class="date-preset-select" [(ngModel)]="moduleFilter" (ngModelChange)="onFiltersChange()">
          <option value="">Todos los Modulos</option>
          @for (m of stats?.modules || []; track m) { <option [value]="m">{{moduleLabel(m)}}</option> }
        </select>
        <button mat-flat-button class="filter-action" (click)="refreshAll()" [disabled]="loading"><mat-icon>refresh</mat-icon>{{loading ? 'Cargando' : 'Actualizar'}}</button>
      </div>
    </header>

    @if (stats) {
      <div class="stats-row">
        <article class="stat-tile"><mat-icon>bar_chart</mat-icon><div><small>Total de Eventos (Hoy)</small><strong>{{stats.eventsToday}}</strong>
          @if (stats.eventsTrend === null) { <span class="stat-trend neutral">Sin datos de ayer</span> }
          @else if (stats.eventsTrend >= 0) { <span class="stat-trend positive">&uarr; +{{stats.eventsTrend}}% vs ayer</span> }
          @else { <span class="stat-trend negative">&darr; {{stats.eventsTrend}}% vs ayer</span> }
        </div></article>
        <article class="stat-tile" [class.warn]="stats.securityAlerts > 0"><mat-icon>gpp_maybe</mat-icon><div><small>Alertas de Seguridad</small><strong>{{pad2(stats.securityAlerts)}}</strong>
          @if (stats.securityAlerts > 0) { <span class="stat-trend negative">Critico</span> } @else { <span class="stat-trend neutral">Sin alertas hoy</span> }
        </div></article>
        <article class="stat-tile ok"><mat-icon>group</mat-icon><div><small>Usuarios Activos</small><strong>{{stats.activeUsers}}</strong><span class="stat-trend info"><span class="live-dot"></span>En tiempo real</span></div></article>
      </div>
    }

    <div class="admin-panel">
      <div class="panel-subhead">
        <h3>Detalle de Actividad</h3>
        <span class="pagination-label">Mostrando {{rows.length}} de {{total}} registros</span>
      </div>

      <div class="admin-toolbar">
        <div class="search-pill"><mat-icon>search</mat-icon><input type="text" placeholder="Buscar por usuario, modulo o accion..." [(ngModel)]="search" (ngModelChange)="onSearchInput()"></div>
      </div>

      <div class="data-table">
        <div class="data-row table-head" [style.--cols]="5">
          <span>Timestamp</span><span>Usuario</span><span>Modulo</span><span>Accion</span><span>Descripcion</span><span class="table-actions">Detalle</span>
        </div>
        @for (row of rows; track row.id) {
          <div class="data-row" [style.--cols]="5">
            <span>{{row.created_at | date:'dd/MM/yyyy HH:mm:ss'}}</span>
            <span class="user-name-cell"><span class="user-avatar-initials">{{initials(row.user_name)}}</span><b>{{row.user_name || 'Sistema'}}</b></span>
            <span><span class="category-pill">{{moduleLabel(row.module)}}</span></span>
            <span class="action-cell" [class]="actionMeta(row.action).class"><mat-icon>{{actionMeta(row.action).icon}}</mat-icon>{{actionMeta(row.action).label}}</span>
            <span>{{row.description}}</span>
            <span class="table-actions">
              <button type="button" class="icon-btn small" [class.detail-critical]="row.action === 'delete'" [title]="row.action === 'delete' ? 'Accion critica - copiar detalle' : 'Ver detalle'" (click)="copyDetail(row)">
                <mat-icon>{{row.action === 'delete' ? 'error_outline' : 'visibility'}}</mat-icon>
              </button>
            </span>
          </div>
        }
      </div>

      @if (loading && !rows.length) { <div class="loading-state"><mat-icon>hourglass_empty</mat-icon><p>Cargando registros...</p></div> }
      @if (!loading && !rows.length) { <div class="empty-state"><mat-icon>inbox</mat-icon><p>No hay registros para mostrar.</p></div> }
      @if (error) { <div class="error-state"><mat-icon>error_outline</mat-icon><p>{{error}}</p></div> }

      @if (total > 0) {
        <div class="pagination-bar">
          <span class="pagination-label">Mostrando {{rangeStart()}} - {{rangeEnd()}} de {{total}} registros</span>
          <div class="pagination-controls">
            <button type="button" class="page-btn" [disabled]="page <= 1" (click)="goToPage(page - 1)"><mat-icon>chevron_left</mat-icon></button>
            @for (p of pageNumbers(); track p) { <button type="button" class="page-btn" [class.current]="p === page" (click)="goToPage(p)">{{p}}</button> }
            <button type="button" class="page-btn" [disabled]="page >= lastPage" (click)="goToPage(page + 1)"><mat-icon>chevron_right</mat-icon></button>
          </div>
          <div class="pagination-extra">
            <span class="pagination-label">Ir a la pagina:</span>
            <input type="number" class="goto-page-input" min="1" [max]="lastPage" [(ngModel)]="gotoPageValue" (keydown.enter)="applyGotoPage()">
            <button type="button" class="icon-btn small" title="Exportar PDF" (click)="exportPdf()"><mat-icon>picture_as_pdf</mat-icon></button>
            <button type="button" class="icon-btn small" title="Exportar Excel" (click)="exportExcel()"><mat-icon>table_view</mat-icon></button>
          </div>
        </div>
      }
    </div>

    @if (stats) {
      <div class="reports-charts audit-bottom-grid">
        <article class="footer-card">
          <div class="chart-card-head">
            <div><h3>Intensidad de Operaciones (24h)</h3><p>Eventos registrados por hora en las ultimas 24 horas</p></div>
            @if (stats.peakLabel) { <span class="stat-trend info">Pico: {{stats.peakLabel}}</span> }
          </div>
          <canvas #intensityChart></canvas>
        </article>
        <article class="audit-trust-card">
          <mat-icon>verified_user</mat-icon>
          <strong>Sistema de Auditoria</strong>
          <p>Todos los eventos del sistema quedan registrados automaticamente con fecha, usuario y descripcion para fines de trazabilidad.</p>
        </article>
      </div>
    }

    <div class="audit-footer-bar">
      <span>&copy; {{currentYear}} {{branding.name()}}</span>
      <span class="status-dot-label"><span class="status-dot"></span>Servidor: Online</span>
    </div>
  </section>`
})
export class ActivityLogComponent implements OnInit {
  api = inject(ApiService);
  branding = inject(BrandingService);
  messages = inject(MessageService);
  cdr = inject(ChangeDetectorRef);
  rows: LogRow[] = [];
  search = '';
  datePreset: 'today' | '7d' | '30d' | 'all' = '7d';
  moduleFilter = '';
  page = 1; lastPage = 1; total = 0; perPage = 10;
  gotoPageValue: number | null = null;
  loading = false; error = '';
  stats: LogStats | null = null;
  currentYear = new Date().getFullYear();
  private searchTimer: ReturnType<typeof setTimeout> | undefined;
  private requestId = 0;
  @ViewChild('intensityChart') intensityChartEl?: ElementRef<HTMLCanvasElement>;
  private intensityChart?: Chart;

  private moduleLabels: Record<string, string> = {
    auth: 'Autenticacion', users: 'Usuarios', roles: 'Roles', products: 'Inventario',
    warehouses: 'Almacenes', categories: 'Categorias', sales: 'Ventas', 'expenses-income': 'Finanzas',
    cash: 'Caja', tables: 'Mesas', 'company-settings': 'Configuracion',
  };
  private actionMetaMap: Record<string, { label: string; icon: string; class: string }> = {
    create: { label: 'Creacion', icon: 'add_circle', class: 'action-create' },
    update: { label: 'Edicion', icon: 'edit', class: 'action-update' },
    delete: { label: 'Eliminacion', icon: 'delete', class: 'action-delete' },
    login: { label: 'Inicio de sesion', icon: 'login', class: 'action-login' },
    logout: { label: 'Cierre de sesion', icon: 'logout', class: 'action-login' },
    register: { label: 'Registro', icon: 'app_registration', class: 'action-create' },
    transfer: { label: 'Transferencia', icon: 'swap_horiz', class: 'action-update' },
    'round-sent': { label: 'Pedido a cocina', icon: 'restaurant', class: 'action-update' },
    charge: { label: 'Cobro', icon: 'point_of_sale', class: 'action-create' },
    open: { label: 'Apertura', icon: 'lock_open', class: 'action-create' },
    close: { label: 'Cierre', icon: 'lock', class: 'action-update' },
    onboarding: { label: 'Configuracion inicial', icon: 'flag', class: 'action-update' },
    'voucher-pdf': { label: 'Comprobante PDF', icon: 'picture_as_pdf', class: 'action-update' },
  };

  ngOnInit() {
    this.branding.load();
    this.load(true);
    this.loadStats();
  }

  moduleLabel(m: string) { return this.moduleLabels[m] || m; }
  actionMeta(a: string) { return this.actionMetaMap[a] || { label: a, icon: 'bolt', class: 'action-update' }; }
  pad2(n: number) { return String(n).padStart(2, '0'); }
  initials(name: string | null) {
    if (!name) return 'SI';
    const parts = name.trim().split(/\s+/);
    return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || 'U';
  }

  onSearchInput() { clearTimeout(this.searchTimer); this.searchTimer = setTimeout(() => this.load(true), 350); }
  onFiltersChange() { this.load(true); this.loadStats(); }
  refreshAll() { this.load(true); this.loadStats(); }

  private dateRange(): { from: string; to: string } {
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    const today = new Date();
    if (this.datePreset === 'today') return { from: fmt(today), to: fmt(today) };
    if (this.datePreset === '7d') { const start = new Date(today); start.setDate(today.getDate() - 6); return { from: fmt(start), to: fmt(today) }; }
    if (this.datePreset === '30d') { const start = new Date(today); start.setDate(today.getDate() - 29); return { from: fmt(start), to: fmt(today) }; }
    return { from: '', to: '' };
  }

  load(reset: boolean) {
    if (reset) this.page = 1;
    const id = ++this.requestId;
    this.loading = true; this.error = '';
    this.cdr.detectChanges();
    const range = this.dateRange();
    const params: any = {
      page: this.page, per_page: this.perPage,
      ...(this.search ? { search: this.search } : {}),
      ...(this.moduleFilter ? { module: this.moduleFilter } : {}),
      ...(range.from ? { from: range.from, to: range.to } : {}),
    };
    this.api.get<any>('activity-logs', params).subscribe({
      next: (res: any) => {
        if (id !== this.requestId) return;
        this.rows = res.data || [];
        this.lastPage = res.last_page || 1;
        this.total = res.total ?? this.rows.length;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        if (id !== this.requestId) return;
        this.loading = false;
        this.error = err?.error?.message || 'No se pudo cargar los registros.';
        this.cdr.detectChanges();
      }
    });
  }

  loadStats() {
    this.api.get<any>('activity-logs-stats').subscribe(res => {
      this.stats = {
        eventsToday: Number(res?.events_today || 0),
        eventsTrend: res?.events_trend === null || res?.events_trend === undefined ? null : Number(res.events_trend),
        securityAlerts: Number(res?.security_alerts || 0),
        activeUsers: Number(res?.active_users || 0),
        hourly: (res?.hourly || []).map((h: any) => ({ hour: Number(h.hour), count: Number(h.count || 0), percent: Number(h.percent || 0) })),
        peakLabel: res?.peak_label || null,
        modules: res?.modules || [],
      };
      this.cdr.detectChanges();
      setTimeout(() => this.renderIntensityChart(), 0);
    });
  }

  renderIntensityChart() {
    const el = this.intensityChartEl?.nativeElement;
    if (!el || !this.stats) return;
    this.intensityChart?.destroy();
    this.intensityChart = new Chart(el, {
      type: 'bar',
      data: {
        labels: this.stats.hourly.map(h => this.hourLabel(h.hour)),
        datasets: [{ data: this.stats.hourly.map(h => h.count), backgroundColor: '#0f766e', borderRadius: 4, maxBarThickness: 20 }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, ticks: { precision: 0 } }, x: { ticks: { autoSkip: true, maxTicksLimit: 8 } } }
      }
    });
  }

  hourLabel(h: number) { const d = new Date(); d.setHours(h, 0, 0, 0); return d.toLocaleTimeString('es-PE', { hour: 'numeric', hour12: true }); }

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
  goToPage(p: number) { if (p < 1 || p > this.lastPage || p === this.page) return; this.page = p; this.load(false); }
  applyGotoPage() { if (this.gotoPageValue) this.goToPage(this.gotoPageValue); }

  copyDetail(row: LogRow) {
    const text = `[${new Date(row.created_at).toLocaleString('es-PE')}] ${row.user_name || 'Sistema'} - ${this.moduleLabel(row.module)} / ${this.actionMeta(row.action).label}\n${row.description}`;
    const done = () => this.messages.add({ severity: 'success', summary: 'Detalle copiado', detail: 'El registro se copio al portapapeles.' });
    const fail = () => this.messages.add({ severity: 'error', summary: 'Error', detail: 'No se pudo copiar el detalle.' });
    navigator.clipboard?.writeText(text).then(done).catch(fail);
  }

  private fetchAllForExport(cb: (rows: LogRow[]) => void) {
    const range = this.dateRange();
    const params: any = {
      per_page: 1000,
      ...(this.search ? { search: this.search } : {}),
      ...(this.moduleFilter ? { module: this.moduleFilter } : {}),
      ...(range.from ? { from: range.from, to: range.to } : {}),
    };
    this.api.get<any>('activity-logs', params).subscribe(res => {
      const rows = res?.data || [];
      if (!rows.length) { this.messages.add({ severity: 'warn', summary: 'Sin datos', detail: 'No hay registros para exportar.' }); return; }
      cb(rows);
    });
  }

  periodLabel() {
    const range = this.dateRange();
    return range.from ? `${range.from} - ${range.to}` : 'Todo el historial';
  }

  exportPdf() { this.fetchAllForExport(rows => this.doExportPdf(rows)); }

  doExportPdf(rows: LogRow[]) {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(15);
    doc.text('Registros de Auditoria', 14, 16);
    doc.setFontSize(9);
    doc.text(`Periodo: ${this.periodLabel()}`, 14, 23);
    autoTable(doc, {
      startY: 30,
      head: [['Fecha y hora', 'Usuario', 'Modulo', 'Accion', 'Descripcion']],
      body: rows.map(r => [new Date(r.created_at).toLocaleString('es-PE'), r.user_name || 'Sistema', this.moduleLabel(r.module), this.actionMeta(r.action).label, r.description]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [15, 118, 110] },
    });
    doc.save(`registros-auditoria-${new Date().toISOString().slice(0, 10)}.pdf`);
    this.messages.add({ severity: 'success', summary: 'PDF generado', detail: 'El reporte se descargo correctamente.' });
  }

  exportExcel() { this.fetchAllForExport(rows => this.doExportExcel(rows)); }

  doExportExcel(rows: LogRow[]) {
    const columns = ['Fecha y hora', 'Usuario', 'Modulo', 'Accion', 'Descripcion'];
    const dataRows = rows.map(r => [new Date(r.created_at).toLocaleString('es-PE'), r.user_name || 'Sistema', this.moduleLabel(r.module), this.actionMeta(r.action).label, r.description]);
    const sheetRows = [columns, ...dataRows];
    const sheetData = sheetRows.map((row, rowIndex) => `<row r="${rowIndex + 1}">${row.map((value, colIndex) => `<c r="${this.cellRef(colIndex, rowIndex)}" t="inlineStr"><is><t>${this.xml(value)}</t></is></c>`).join('')}</row>`).join('');
    const files: Record<string, Uint8Array> = {
      '[Content_Types].xml': strToU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>'),
      '_rels/.rels': strToU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'),
      'xl/workbook.xml': strToU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Registros" sheetId="1" r:id="rId1"/></sheets></workbook>'),
      'xl/_rels/workbook.xml.rels': strToU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>'),
      'xl/worksheets/sheet1.xml': strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${sheetData}</sheetData></worksheet>`)
    };
    this.downloadBlob(new Blob([zipSync(files)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `registros-auditoria-${new Date().toISOString().slice(0, 10)}.xlsx`);
    this.messages.add({ severity: 'success', summary: 'Excel generado', detail: 'El reporte se descargo correctamente.' });
  }

  xml(value: unknown) { return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;'); }
  cellRef(col: number, row: number) { return `${this.colName(col)}${row + 1}`; }
  colName(index: number) { let name = ''; for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) name = String.fromCharCode(((n - 1) % 26) + 65) + name; return name; }
  downloadBlob(blob: Blob, fileName: string) { const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = fileName; link.click(); URL.revokeObjectURL(url); }
}
