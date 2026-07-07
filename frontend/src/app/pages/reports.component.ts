import { ChangeDetectorRef, Component, ElementRef, OnInit, ViewChild, inject } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MessageService } from 'primeng/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { strToU8, zipSync } from 'fflate';
import { Chart } from 'chart.js/auto';
import { ApiService } from '../core/api.service';

type ReportOption = { value: string; label: string };
type Analytics = {
  totalSales: number; salesTrend: number | null;
  avgTicket: number; avgTicketTrend: number | null; orderCount: number;
  grossMarginPercent: number; marginTrend: number | null;
  topProduct: string | null; topProductQty: number;
  dailyTrend: { date: string; total: number }[];
  categories: { name: string; total: number; percent: number }[];
  categoryTotal: number;
};

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [FormsModule, CurrencyPipe, DatePipe, MatButtonModule, MatSelectModule, MatInputModule, MatFormFieldModule, MatIconModule, MatMenuModule],
  template: `
  <section class="admin-page">
    <header class="admin-head"><div><span class="eyebrow">Analitica</span><h1>Reportes y Analitica</h1><p>Consulta ventas, stock, utilidad y movimientos con filtros avanzados para optimizar tu operacion.</p></div></header>

    <div class="reports-filter-panel">
      <div class="report-field report-field-type">
        <label>Tipo de Reporte</label>
        <mat-form-field appearance="outline"><mat-select [(ngModel)]="type" (selectionChange)="onTypeChange()">@for (option of reportOptions; track option.value) { <mat-option [value]="option.value">{{option.label}}</mat-option> }</mat-select></mat-form-field>
      </div>
      <div class="report-field">
        <label>Desde</label>
        <input type="date" class="date-input" [(ngModel)]="from" (ngModelChange)="load()">
      </div>
      <div class="report-field">
        <label>Hasta</label>
        <input type="date" class="date-input" [(ngModel)]="to" (ngModelChange)="load()">
      </div>
      <button mat-flat-button class="primary-action" (click)="load()" [disabled]="loading"><mat-icon>{{loading ? 'hourglass_empty' : 'bar_chart'}}</mat-icon>{{loading ? 'Cargando' : 'Generar Reporte'}}</button>
      <button type="button" class="icon-btn" title="Exportar PDF" (click)="exportPdf()"><mat-icon>picture_as_pdf</mat-icon></button>
      <button type="button" class="icon-btn" title="Exportar Excel" (click)="exportExcel()"><mat-icon>table_view</mat-icon></button>
    </div>

    @if (analytics) {
      <div class="stats-row">
        <article class="stat-tile"><mat-icon>payments</mat-icon><div><small>Ventas Totales</small><strong>{{number(analytics.totalSales) | currency:'PEN':'S/ '}}</strong>
          @if (analytics.salesTrend === null) { <span class="stat-trend neutral">vs. periodo anterior</span> }
          @else { <span class="stat-trend" [class.positive]="analytics.salesTrend >= 0" [class.negative]="analytics.salesTrend < 0">{{analytics.salesTrend >= 0 ? '+' : ''}}{{analytics.salesTrend}}% vs. periodo anterior</span> }
        </div></article>
        <article class="stat-tile"><mat-icon>receipt_long</mat-icon><div><small>Ticket Promedio</small><strong>{{number(analytics.avgTicket) | currency:'PEN':'S/ '}}</strong><span class="stat-trend neutral">Basado en {{analytics.orderCount}} pedidos</span></div></article>
        <article class="stat-tile"><mat-icon>trending_up</mat-icon><div><small>Utilidad Bruta</small><strong>{{analytics.grossMarginPercent}}%</strong>
          @if (analytics.marginTrend === null) { <span class="stat-trend neutral">Margen operativo real</span> }
          @else { <span class="stat-trend" [class.positive]="analytics.marginTrend >= 0" [class.negative]="analytics.marginTrend < 0">{{analytics.marginTrend >= 0 ? '+' : ''}}{{analytics.marginTrend}}% Margen operativo real</span> }
        </div></article>
        <article class="stat-tile star">
          <mat-icon>star</mat-icon>
          <div><small>Producto Estrella</small><strong>{{analytics.topProduct || 'Sin ventas'}}</strong><span class="stat-trend neutral">{{number(analytics.topProductQty)}} unidades vendidas</span></div>
          @if (analytics.topProduct) { <span class="top-badge">TOP 1</span> }
        </article>
      </div>

      <div class="reports-charts">
        <article class="footer-card">
          <div class="chart-card-head">
            <div><h3>Tendencia de Ventas Diarias</h3><p>Comparativa de ingresos brutos por dia</p></div>
            <div class="segmented-control small">
              <button type="button" [class.active]="trendGranularity === 'day'" (click)="setTrendGranularity('day')">Dia</button>
              <button type="button" [class.active]="trendGranularity === 'week'" (click)="setTrendGranularity('week')">Semana</button>
            </div>
          </div>
          <canvas #trendChart></canvas>
        </article>
        <article class="footer-card">
          <h3>Ventas por Categoria</h3><p>Distribucion de ingresos</p>
          <div class="donut-wrap">
            <canvas #categoryChart></canvas>
            <div class="donut-center"><strong>{{number(analytics.categoryTotal) | currency:'PEN':'S/ '}}</strong><small>TOTAL BRUTO</small></div>
          </div>
          <div class="payment-breakdown">
            @for (c of analytics.categories; track c.name; let i = $index) {
              <div class="payment-breakdown-item">
                <div class="payment-breakdown-row"><span class="payment-breakdown-label"><span class="dot" [style.background]="categoryColor(i)"></span>{{c.name}}</span><span class="payment-breakdown-percent">{{c.percent}}%</span></div>
              </div>
            }
            @if (!analytics.categories.length) { <small>Sin ventas en el periodo seleccionado.</small> }
          </div>
        </article>
      </div>
    }

    <div class="reports-bottom-grid">
      <article class="peak-hours-card">
        <h3>Horas Pico</h3>
        <p>Densidad de pedidos por hora</p>
        <div class="peak-hours-list">
          @for (h of peakHours; track h.hour) {
            <div class="peak-hour-row">
              <span class="peak-hour-label">{{h.hour}}</span>
              <span class="peak-hour-track"><span class="peak-hour-fill" [style.width.%]="h.percent"></span></span>
            </div>
          }
          @if (!peakHours.length) { <small>Sin datos en el periodo seleccionado.</small> }
        </div>
        @if (recommendation) {
          <div class="ai-recommendation">
            <strong>Recomendación</strong>
            <p>{{recommendation}}</p>
          </div>
        }
      </article>

      <article class="transactions-card">
        <div class="transactions-head">
          <h3>Detalle de Transacciones</h3>
          <div class="transactions-actions">
            <button type="button" class="icon-btn small" title="Actualizar" (click)="refreshTransactions()"><mat-icon>filter_list</mat-icon></button>
            <button type="button" class="icon-btn small" [matMenuTriggerFor]="txMenu"><mat-icon>more_vert</mat-icon></button>
            <mat-menu #txMenu="matMenu"><button mat-menu-item (click)="refreshTransactions()"><mat-icon>refresh</mat-icon>Actualizar</button></mat-menu>
          </div>
        </div>
        <div class="data-table transactions-table">
          <div class="data-row"><span>Fecha / Item</span><span class="money-cell">Cantidad</span><span class="money-cell">Subtotal</span><span class="money-cell">IGV ({{igvPercent}}%)</span><span class="money-cell">Total</span></div>
          @for (t of transactions; track t.sku) {
            <div class="data-row">
              <span class="tx-item-cell"><b>{{t.product_name}}</b><small>SKU: {{t.sku || 'N/A'}} &bull; {{t.date | date:'dd MMM, yyyy'}}</small></span>
              <span class="money-cell">{{number(t.quantity)}}</span>
              <span class="money-cell">{{number(t.subtotal) | currency:'PEN':'S/ '}}</span>
              <span class="money-cell">{{number(t.igv) | currency:'PEN':'S/ '}}</span>
              <span class="money-cell"><b>{{number(t.total) | currency:'PEN':'S/ '}}</b></span>
            </div>
          }
        </div>
        @if (!transactions.length) { <div class="empty-state"><mat-icon>receipt_long</mat-icon><p>No hay transacciones en el periodo seleccionado.</p></div> }
        @if (transactionsTotal > 0) {
          <div class="pagination-bar">
            <span class="pagination-label">Mostrando {{transactions.length}} de {{transactionsTotal}} registros</span>
            <div class="pagination-controls">
              <button type="button" class="page-btn" [disabled]="transactionsPage <= 1" (click)="goToTransactionsPage(transactionsPage - 1)"><mat-icon>chevron_left</mat-icon></button>
              @for (p of transactionsPageNumbers(); track p) { <button type="button" class="page-btn" [class.current]="p === transactionsPage" (click)="goToTransactionsPage(p)">{{p}}</button> }
              <button type="button" class="page-btn" [disabled]="transactionsPage >= transactionsLastPage" (click)="goToTransactionsPage(transactionsPage + 1)"><mat-icon>chevron_right</mat-icon></button>
            </div>
          </div>
        }
      </article>
    </div>
  </section>`
})
export class ReportsComponent implements OnInit {
  api = inject(ApiService);
  messages = inject(MessageService);
  cdr = inject(ChangeDetectorRef);
  type = 'sales-by-day';
  from = '';
  to = '';
  rows: any[] = [];
  columns: string[] = [];
  loading = false;
  analytics: Analytics | null = null;
  trendGranularity: 'day' | 'week' = 'day';
  categoryPalette = ['#0f766e', '#475569', '#9f1239', '#94a3b8', '#ca8a04', '#2563eb'];
  peakHours: { hour: string; count: number; percent: number }[] = [];
  recommendation: string | null = null;
  transactions: { product_name: string; sku: string | null; quantity: number; subtotal: number; igv: number; total: number; date: string }[] = [];
  transactionsTotal = 0; transactionsPage = 1; transactionsLastPage = 1; transactionsPerPage = 4;
  igvPercent = 18;
  private requestId = 0;
  @ViewChild('trendChart') trendChartEl?: ElementRef<HTMLCanvasElement>;
  @ViewChild('categoryChart') categoryChartEl?: ElementRef<HTMLCanvasElement>;
  private trendChart?: Chart;
  private categoryChart?: Chart;
  reportOptions: ReportOption[] = [
    { value: 'sales-by-day', label: 'Ventas por dia' },
    { value: 'top-products', label: 'Productos mas vendidos' },
    { value: 'income', label: 'Ingresos' },
    { value: 'expenses', label: 'Egresos' },
    { value: 'profit', label: 'Utilidad aproximada' },
    { value: 'stock', label: 'Stock actual' },
    { value: 'low-stock', label: 'Stock bajo' },
    { value: 'sales-by-user', label: 'Ventas por cajero' },
    { value: 'sales-by-payment', label: 'Ventas por pago' }
  ];

  ngOnInit() { this.load(); }

  onTypeChange() { this.load(); }

  load(afterLoad?: () => void) {
    const id = ++this.requestId;
    this.loading = true;
    this.cdr.detectChanges();
    const params = { from: this.from || '', to: this.to || '' };
    this.api.get<any>(`reports/${this.type}`, params).subscribe({
      next: (r: any) => {
        if (id !== this.requestId) return;
        this.setRows(r);
        this.loading = false;
        this.cdr.detectChanges();
        afterLoad?.();
      },
      error: () => {
        if (id !== this.requestId) return;
        this.loading = false;
        this.rows = [];
        this.columns = [];
        this.messages.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar el reporte.' });
        this.cdr.detectChanges();
      }
    });
    this.loadAnalytics();
    this.loadPeakHours();
    this.transactionsPage = 1;
    this.loadTransactions();
  }

  loadPeakHours() {
    const params = { from: this.from || '', to: this.to || '' };
    this.api.get<any>('reports-peak-hours', params).subscribe(res => {
      this.peakHours = (res?.peak_hours || []).map((h: any) => ({ hour: h.hour, count: Number(h.count || 0), percent: Number(h.percent || 0) }));
      this.recommendation = res?.recommendation || null;
      this.cdr.detectChanges();
    });
  }

  loadTransactions() {
    const params = { from: this.from || '', to: this.to || '', page: this.transactionsPage, per_page: this.transactionsPerPage };
    this.api.get<any>('reports-transactions', params).subscribe(res => {
      this.transactions = (res?.data || []).map((t: any) => ({ product_name: t.product_name, sku: t.sku, quantity: Number(t.quantity || 0), subtotal: Number(t.subtotal || 0), igv: Number(t.igv || 0), total: Number(t.total || 0), date: t.date }));
      this.transactionsTotal = Number(res?.total || 0);
      this.transactionsLastPage = Number(res?.last_page || 1);
      this.transactionsPage = Number(res?.current_page || 1);
      this.igvPercent = Number(res?.igv_percent || 18);
      this.cdr.detectChanges();
    });
  }

  refreshTransactions() { this.loadTransactions(); this.loadPeakHours(); }
  goToTransactionsPage(p: number) { if (p < 1 || p > this.transactionsLastPage || p === this.transactionsPage) return; this.transactionsPage = p; this.loadTransactions(); }
  transactionsPageNumbers(): number[] {
    const span = 5;
    let start = Math.max(1, this.transactionsPage - Math.floor(span / 2));
    const end = Math.min(this.transactionsLastPage, start + span - 1);
    start = Math.max(1, end - span + 1);
    const pages: number[] = [];
    for (let p = start; p <= end; p++) pages.push(p);
    return pages;
  }

  loadAnalytics() {
    const params = { from: this.from || '', to: this.to || '' };
    this.api.get<any>('reports-analytics', params).subscribe(res => {
      this.analytics = {
        totalSales: Number(res?.total_sales || 0), salesTrend: res?.sales_trend === null || res?.sales_trend === undefined ? null : Number(res.sales_trend),
        avgTicket: Number(res?.avg_ticket || 0), avgTicketTrend: res?.avg_ticket_trend === null || res?.avg_ticket_trend === undefined ? null : Number(res.avg_ticket_trend),
        orderCount: Number(res?.order_count || 0),
        grossMarginPercent: Number(res?.gross_margin_percent || 0), marginTrend: res?.margin_trend === null || res?.margin_trend === undefined ? null : Number(res.margin_trend),
        topProduct: res?.top_product || null, topProductQty: Number(res?.top_product_qty || 0),
        dailyTrend: (res?.daily_trend || []).map((d: any) => ({ date: d.date, total: Number(d.total || 0) })),
        categories: (res?.categories || []).map((c: any) => ({ name: c.name, total: Number(c.total || 0), percent: Number(c.percent || 0) })),
        categoryTotal: Number(res?.category_total || 0),
      };
      this.cdr.detectChanges();
      setTimeout(() => { this.renderTrendChart(); this.renderCategoryChart(); }, 0);
    });
  }

  setTrendGranularity(g: 'day' | 'week') { this.trendGranularity = g; this.renderTrendChart(); }

  categoryColor(i: number) { return this.categoryPalette[i % this.categoryPalette.length]; }

  private weeklyTrend(): { label: string; total: number }[] {
    if (!this.analytics) return [];
    const weeks = new Map<string, number>();
    for (const d of this.analytics.dailyTrend) {
      const date = new Date(`${d.date}T00:00:00`);
      const jan1 = new Date(date.getFullYear(), 0, 1);
      const week = Math.ceil(((date.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
      const key = `Sem ${week}`;
      weeks.set(key, (weeks.get(key) || 0) + d.total);
    }
    return Array.from(weeks.entries()).map(([label, total]) => ({ label, total }));
  }

  renderTrendChart() {
    const el = this.trendChartEl?.nativeElement;
    if (!el || !this.analytics) return;
    const dayLabels = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];
    const points = this.trendGranularity === 'day'
      ? this.analytics.dailyTrend.map(d => ({ label: dayLabels[new Date(`${d.date}T00:00:00`).getDay()], total: d.total }))
      : this.weeklyTrend();
    this.trendChart?.destroy();
    this.trendChart = new Chart(el, {
      type: 'bar',
      data: { labels: points.map(p => p.label), datasets: [{ data: points.map(p => p.total), backgroundColor: '#0f766e', borderRadius: 6, maxBarThickness: 44 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
    });
  }

  renderCategoryChart() {
    const el = this.categoryChartEl?.nativeElement;
    if (!el || !this.analytics) return;
    this.categoryChart?.destroy();
    this.categoryChart = new Chart(el, {
      type: 'doughnut',
      data: {
        labels: this.analytics.categories.map(c => c.name),
        datasets: [{ data: this.analytics.categories.map(c => c.total), backgroundColor: this.analytics.categories.map((_, i) => this.categoryColor(i)), borderWidth: 0 }]
      },
      options: { responsive: true, maintainAspectRatio: false, cutout: '72%', plugins: { legend: { display: false } } }
    });
  }

  setRows(data: any) {
    const rows = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
    this.rows = rows;
    this.columns = rows.length ? Object.keys(rows[0]).filter(k => typeof rows[0][k] !== 'object') : [];
  }

  exportPdf() {
    const run = () => { if (!this.ensureExportable()) return; this.doExportPdf(); };
    if (!this.rows.length) this.load(run); else run();
  }

  doExportPdf() {
    const doc = new jsPDF({ orientation: this.columns.length > 5 ? 'landscape' : 'portrait' });
    doc.setFontSize(15);
    doc.text(this.currentReportLabel(), 14, 16);
    doc.setFontSize(9);
    doc.text(this.periodLabel(), 14, 23);
    autoTable(doc, { startY: 30, head: [this.columns.map(c => this.label(c))], body: this.rows.map(row => this.columns.map(c => this.format(row[c]))), styles: { fontSize: 8 }, headStyles: { fillColor: [15, 118, 110] } });
    doc.save(`${this.fileBaseName()}.pdf`);
    this.messages.add({ severity: 'success', summary: 'PDF generado', detail: 'El reporte se descargo correctamente.' });
  }

  exportExcel() {
    const run = () => { if (!this.ensureExportable()) return; this.doExportExcel(); };
    if (!this.rows.length) this.load(run); else run();
  }

  doExportExcel() {
    const sheetRows = [this.columns.map(c => this.label(c)), ...this.rows.map(row => this.columns.map(c => this.format(row[c])))];
    const sheetData = sheetRows.map((row, rowIndex) => `<row r="${rowIndex + 1}">${row.map((value, colIndex) => `<c r="${this.cellRef(colIndex, rowIndex)}" t="inlineStr"><is><t>${this.xml(value)}</t></is></c>`).join('')}</row>`).join('');
    const files: Record<string, Uint8Array> = {
      '[Content_Types].xml': strToU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>'),
      '_rels/.rels': strToU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'),
      'xl/workbook.xml': strToU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Reporte" sheetId="1" r:id="rId1"/></sheets></workbook>'),
      'xl/_rels/workbook.xml.rels': strToU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>'),
      'xl/worksheets/sheet1.xml': strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${sheetData}</sheetData></worksheet>`)
    };
    this.downloadBlob(new Blob([zipSync(files)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `${this.fileBaseName()}.xlsx`);
    this.messages.add({ severity: 'success', summary: 'Excel generado', detail: 'El reporte se descargo correctamente.' });
  }

  ensureExportable() {
    if (this.rows.length && this.columns.length) return true;
    this.messages.add({ severity: 'warn', summary: 'Sin datos', detail: 'No hay datos para exportar.' });
    return false;
  }

  number(value: unknown) { return Number(value || 0); }
  currentReportLabel() { return this.reportOptions.find(option => option.value === this.type)?.label || 'Reporte'; }
  periodLabel() { return `Periodo: ${this.from || 'inicio'} - ${this.to || 'hoy'}`; }
  fileBaseName() { return `${this.type}-${new Date().toISOString().slice(0, 10)}`; }
  label(key: string) { return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()); }
  xml(value: unknown) { return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;'); }
  cellRef(col: number, row: number) { return `${this.colName(col)}${row + 1}`; }
  colName(index: number) { let name = ''; for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) name = String.fromCharCode(((n - 1) % 26) + 65) + name; return name; }
  downloadBlob(blob: Blob, fileName: string) { const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = fileName; link.click(); URL.revokeObjectURL(url); }

  format(value: any) {
    if (value === null || value === undefined) return '-';
    if (!isNaN(Number(value)) && String(value).trim() !== '') return Number(value).toLocaleString('es-PE', { minimumFractionDigits: String(value).includes('.') ? 2 : 0, maximumFractionDigits: 2 });
    return String(value);
  }
}
