import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, OnDestroy, ViewChild, inject } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { Chart } from 'chart.js/auto';
import ApexCharts from 'apexcharts';
import { ApiService } from '../core/api.service';

type Summary = { low_stock_count: number };
type Totals = { sales: number; profit: number; orders: number };
type TrendPeriod = 'day' | 'week' | 'month' | 'year';
type CategoryOption = { id: number; name: string };

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CurrencyPipe, MatIconModule, FormsModule, MatFormFieldModule, MatInputModule, MatDatepickerModule, MatNativeDateModule],
  template: `
  <section class="admin-page dashboard-page">
    <header class="admin-head">
      <div><span class="eyebrow">Resumen</span><h1>Dashboard</h1><p>Resumen del periodo seleccionado en Tendencia de ventas.</p></div>
    </header>

    <div class="kpi-grid">
      <article class="kpi-card kpi-blue">
        <div class="kpi-icon"><mat-icon>payments</mat-icon></div>
        <div class="kpi-body">
          <span>Ventas</span>
          <strong>{{totals.sales | currency:'PEN':'S/ '}}</strong>
          <small [class.down]="changes.sales < 0"><mat-icon>{{changes.sales < 0 ? 'arrow_downward' : 'arrow_upward'}}</mat-icon>{{changes.sales}}% vs periodo anterior</small>
        </div>
      </article>
      <article class="kpi-card kpi-green">
        <div class="kpi-icon"><mat-icon>trending_up</mat-icon></div>
        <div class="kpi-body">
          <span>Utilidad</span>
          <strong>{{totals.profit | currency:'PEN':'S/ '}}</strong>
          <small [class.down]="changes.profit < 0"><mat-icon>{{changes.profit < 0 ? 'arrow_downward' : 'arrow_upward'}}</mat-icon>{{changes.profit}}% vs periodo anterior</small>
        </div>
      </article>
      <article class="kpi-card kpi-orange">
        <div class="kpi-icon"><mat-icon>receipt_long</mat-icon></div>
        <div class="kpi-body">
          <span>Pedidos</span>
          <strong>{{totals.orders}}</strong>
          <small [class.down]="changes.orders < 0"><mat-icon>{{changes.orders < 0 ? 'arrow_downward' : 'arrow_upward'}}</mat-icon>{{changes.orders}}% vs periodo anterior</small>
        </div>
      </article>
      <article class="kpi-card kpi-purple">
        <div class="kpi-icon"><mat-icon>inventory_2</mat-icon></div>
        <div class="kpi-body">
          <span>Stock bajo</span>
          <strong>{{summary.low_stock_count}}</strong>
          <small [class.down]="summary.low_stock_count > 0">{{summary.low_stock_count > 0 ? 'Productos por reponer' : 'Todo en orden'}}</small>
        </div>
      </article>
    </div>

    <div class="dashboard-charts">
      <article class="chart-card chart-card-wide trends-card">
        <header class="trends-header">
          <div class="trends-title"><mat-icon>insights</mat-icon><h3>Tendencia de ventas</h3></div>
          <div class="trends-filters">
            <div class="period-btns">
              <button type="button" [class.active]="activeQuickRange === 'day'" (click)="setPeriod('day')">Dia</button>
              <button type="button" [class.active]="activeQuickRange === 'week'" (click)="setPeriod('week')">Semana</button>
              <button type="button" [class.active]="activeQuickRange === 'month'" (click)="setPeriod('month')">Mes</button>
              <button type="button" [class.active]="activeQuickRange === 'year'" (click)="setPeriod('year')">Año</button>
            </div>
            <mat-form-field appearance="outline" class="trends-select">
              <mat-label>Categoria</mat-label>
              <select matNativeControl [(ngModel)]="trendsCategory" (ngModelChange)="loadTrends()">
                <option value="">Todas las categorias</option>
                @for (c of categories; track c.id) { <option [value]="c.id">{{c.name}}</option> }
              </select>
            </mat-form-field>
            <mat-form-field appearance="outline" class="trends-date"><mat-label>Desde</mat-label><input matInput [matDatepicker]="fromPicker" [ngModel]="trendsFrom" (ngModelChange)="setTrendsDate('from', $event)"><mat-datepicker-toggle matIconSuffix [for]="fromPicker"></mat-datepicker-toggle><mat-datepicker #fromPicker></mat-datepicker></mat-form-field>
            <mat-form-field appearance="outline" class="trends-date"><mat-label>Hasta</mat-label><input matInput [matDatepicker]="toPicker" [ngModel]="trendsTo" (ngModelChange)="setTrendsDate('to', $event)"><mat-datepicker-toggle matIconSuffix [for]="toPicker"></mat-datepicker-toggle><mat-datepicker #toPicker></mat-datepicker></mat-form-field>
          </div>
        </header>
        <div #trendsChart class="trends-chart"></div>
      </article>
      <article class="chart-card">
        <header><mat-icon>show_chart</mat-icon><h3>Ventas diarias</h3></header>
        <canvas #sales></canvas>
      </article>
      <article class="chart-card">
        <header><mat-icon>bar_chart</mat-icon><h3>Productos mas vendidos</h3></header>
        <canvas #products></canvas>
      </article>
      <article class="chart-card">
        <header><mat-icon>donut_large</mat-icon><h3>Metodos de pago</h3></header>
        <canvas #payments></canvas>
      </article>
      <article class="chart-card">
        <header><mat-icon>inventory</mat-icon><h3>Stock bajo por categoria</h3></header>
        <canvas #stock></canvas>
      </article>
    </div>
  </section>`
})
export class DashboardComponent implements AfterViewInit, OnDestroy {
  api = inject(ApiService);
  cdr = inject(ChangeDetectorRef);
  summary: Summary = { low_stock_count: 0 };
  totals: Totals = { sales: 0, profit: 0, orders: 0 };
  changes: Totals = { sales: 0, profit: 0, orders: 0 };
  categories: CategoryOption[] = [];
  trendsPeriod: TrendPeriod = 'day';
  activeQuickRange: TrendPeriod | null = null;
  trendsCategory = '';
  trendsFrom: Date | null = null;
  trendsTo: Date | null = null;

  @ViewChild('sales') sales!: ElementRef<HTMLCanvasElement>;
  @ViewChild('products') products!: ElementRef<HTMLCanvasElement>;
  @ViewChild('payments') payments!: ElementRef<HTMLCanvasElement>;
  @ViewChild('stock') stock!: ElementRef<HTMLCanvasElement>;
  @ViewChild('trendsChart') trendsChartEl!: ElementRef<HTMLDivElement>;
  private trendsChart?: ApexCharts;
  private themeObserver?: MutationObserver;

  ngAfterViewInit() {
    this.api.get<any>('dashboard').subscribe(d => {
      this.summary = { ...this.summary, ...d.summary };
      this.chart(this.sales.nativeElement, 'line', d.daily_sales, 'date', 'total');
      this.chart(this.products.nativeElement, 'bar', d.top_products, 'product_name', 'quantity');
      this.chart(this.payments.nativeElement, 'doughnut', d.payment_methods, 'payment_method', 'total');
      this.chart(this.stock.nativeElement, 'bar', d.low_stock_by_category, 'name', 'total');
      this.cdr.detectChanges();
    });

    this.setPeriod('day');

    this.themeObserver = new MutationObserver(() => this.renderTrendsChart(this.lastTrendsRows));
    this.themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  }

  ngOnDestroy() {
    this.themeObserver?.disconnect();
    this.trendsChart?.destroy();
  }

  setPeriod(range: TrendPeriod) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let from: Date;
    if (range === 'day') from = new Date(today);
    else if (range === 'week') from = new Date(today.getTime() - 6 * 86400000);
    else if (range === 'month') from = new Date(today.getFullYear(), today.getMonth(), 1);
    else from = new Date(today.getFullYear(), 0, 1);
    this.trendsFrom = from;
    this.trendsTo = today;
    this.activeQuickRange = range;
    this.trendsPeriod = this.periodForRange(from, today);
    this.loadTrends();
  }

  setTrendsDate(key: 'from' | 'to', value: Date | null) {
    if (key === 'from') this.trendsFrom = value; else this.trendsTo = value;
    this.activeQuickRange = null;
    if (this.trendsFrom && this.trendsTo) this.trendsPeriod = this.periodForRange(this.trendsFrom, this.trendsTo);
    this.loadTrends();
  }

  private periodForRange(from: Date, to: Date): TrendPeriod {
    const days = Math.max(1, Math.round((to.getTime() - from.getTime()) / 86400000) + 1);
    if (days <= 31) return 'day';
    if (days <= 180) return 'week';
    if (days <= 730) return 'month';
    return 'year';
  }

  private lastTrendsRows: any[] = [];

  loadTrends() {
    const params: any = { period: this.trendsPeriod };
    if (this.trendsFrom) params.from = this.formatDate(this.trendsFrom);
    if (this.trendsTo) params.to = this.formatDate(this.trendsTo);
    if (this.trendsCategory) params.category_id = this.trendsCategory;
    this.api.get<any>('dashboard/trends', params).subscribe(res => {
      this.categories = res.categories || [];
      this.lastTrendsRows = res.rows || [];
      this.totals = res.totals || { sales: 0, profit: 0, orders: 0 };
      this.changes = res.changes || { sales: 0, profit: 0, orders: 0 };
      this.renderTrendsChart(this.lastTrendsRows);
      this.cdr.detectChanges();
    });
  }

  renderTrendsChart(rows: any[]) {
    if (!this.trendsChartEl) return;
    const dark = document.documentElement.classList.contains('app-dark');
    const labels = rows.map(r => this.formatPeriodLabel(r.period_start));
    const options: any = {
      chart: { type: 'line', height: 320, toolbar: { show: false }, foreColor: dark ? '#c7d2d8' : '#526071', animations: { speed: 300 } },
      series: [
        { name: 'Ventas', data: rows.map(r => Number(r.sales || 0)) },
        { name: 'Utilidad', data: rows.map(r => Number(r.profit || 0)) },
        { name: 'Pedidos', data: rows.map(r => Number(r.orders || 0)) },
      ],
      xaxis: { categories: labels, axisBorder: { color: dark ? '#2b3a40' : '#e2e8ec' }, axisTicks: { color: dark ? '#2b3a40' : '#e2e8ec' } },
      grid: { borderColor: dark ? '#243138' : '#eef2f4' },
      colors: ['#2563eb', '#16a34a', '#f59e0b'],
      stroke: { curve: 'smooth', width: 3 },
      dataLabels: { enabled: false },
      legend: { position: 'top', horizontalAlign: 'right' },
      tooltip: { theme: dark ? 'dark' : 'light' },
      noData: { text: 'Sin datos para el rango seleccionado' },
    };
    if (this.trendsChart) { this.trendsChart.updateOptions(options); }
    else { this.trendsChart = new ApexCharts(this.trendsChartEl.nativeElement, options); this.trendsChart.render(); }
  }

  formatDate(d: Date) { const y = d.getFullYear(); const m = String(d.getMonth() + 1).padStart(2, '0'); const day = String(d.getDate()).padStart(2, '0'); return `${y}-${m}-${day}`; }
  formatPeriodLabel(dateStr: string) {
    const d = new Date(`${dateStr}T00:00:00`);
    if (this.trendsPeriod === 'day') return d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit' });
    if (this.trendsPeriod === 'week') return 'Sem ' + d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit' });
    if (this.trendsPeriod === 'month') return d.toLocaleDateString('es-PE', { month: 'short', year: 'numeric' });
    return d.toLocaleDateString('es-PE', { year: 'numeric' });
  }

  chart(el: HTMLCanvasElement, type: any, rows: any[], label: string, value: string) {
    new Chart(el, {
      type,
      data: {
        labels: rows.map(r => r[label]),
        datasets: [{
          data: rows.map(r => Number(r[value] || 0)),
          label: value,
          backgroundColor: ['#0f766e', '#dc2626', '#2563eb', '#ca8a04', '#7c3aed'],
          borderColor: type === 'line' ? '#0f766e' : undefined,
          borderRadius: type === 'bar' ? 6 : 0
        }]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
  }
}
