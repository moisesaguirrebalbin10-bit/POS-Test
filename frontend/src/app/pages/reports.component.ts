import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MessageService } from 'primeng/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { strToU8, zipSync } from 'fflate';
import { ApiService } from '../core/api.service';

type ExportFormat = 'pdf' | 'excel';

type ReportOption = { value: string; label: string };

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [FormsModule, MatCardModule, MatButtonModule, MatSelectModule, MatInputModule, MatFormFieldModule, MatIconModule, MatDatepickerModule, MatNativeDateModule],
  template: `
  <section class="admin-page">
    <header class="admin-head"><div><span class="eyebrow">Analitica</span><h1>Reportes</h1><p>Consulta ventas, stock, utilidad y movimientos con filtros de fecha.</p></div></header>
    <mat-card class="reports-panel">
      <div class="toolbar reports-toolbar">
        <mat-form-field appearance="outline"><mat-label>Reporte</mat-label><mat-select [(ngModel)]="type" (selectionChange)="onTypeChange()">@for (option of reportOptions; track option.value) { <mat-option [value]="option.value">{{option.label}}</mat-option> }</mat-select></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Desde</mat-label><input matInput [matDatepicker]="fromPicker" [(ngModel)]="from" (ngModelChange)="load()"><mat-datepicker-toggle matIconSuffix [for]="fromPicker"></mat-datepicker-toggle><mat-datepicker #fromPicker></mat-datepicker></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Hasta</mat-label><input matInput [matDatepicker]="toPicker" [(ngModel)]="to" (ngModelChange)="load()"><mat-datepicker-toggle matIconSuffix [for]="toPicker"></mat-datepicker-toggle><mat-datepicker #toPicker></mat-datepicker></mat-form-field>
        <button mat-stroked-button class="export-choice" [class.selected]="selectedExport === 'pdf'" (click)="toggleExport('pdf')"><mat-icon>picture_as_pdf</mat-icon>PDF</button>
        <button mat-stroked-button class="export-choice" [class.selected]="selectedExport === 'excel'" (click)="toggleExport('excel')"><mat-icon>table_view</mat-icon>Excel</button>
        <button mat-flat-button class="primary-action" (click)="generate()" [disabled]="loading"><mat-icon>{{loading ? 'hourglass_empty' : 'bar_chart'}}</mat-icon>{{loading ? 'Cargando' : 'Generar'}}</button>
      </div>

      @if (loading) { <div class="loading-state"><mat-icon>hourglass_empty</mat-icon><p>Cargando reporte...</p></div> }
      @else {
        <div class="data-table report-table">
          <div class="data-row table-head" [style.--cols]="columns.length || 1">@for (c of columns; track c) { <span>{{label(c)}}</span> }</div>
          @for (row of rows; track $index) {
            <div class="data-row" [style.--cols]="columns.length || 1">
              @for (c of columns; track c) { <span>{{format(row[c])}}</span> }
            </div>
          }
        </div>
        @if (!rows.length) { <div class="empty-state"><mat-icon>query_stats</mat-icon><p>No hay datos para el reporte seleccionado.</p></div> }
      }
    </mat-card>
  </section>`
})
export class ReportsComponent {
  api = inject(ApiService);
  messages = inject(MessageService);
  cdr = inject(ChangeDetectorRef);
  type = 'sales-by-day';
  from: Date | null = null;
  to: Date | null = null;
  rows: any[] = [];
  columns: string[] = [];
  loading = false;
  selectedExport: ExportFormat | null = null;
  private requestId = 0;
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

  onTypeChange() {
    this.selectedExport = null;
    this.load();
  }

  formatDateValue(value: Date) { const y = value.getFullYear(); const m = String(value.getMonth() + 1).padStart(2, '0'); const d = String(value.getDate()).padStart(2, '0'); return `${y}-${m}-${d}`; }
  toggleExport(format: ExportFormat) {
    this.selectedExport = this.selectedExport === format ? null : format;
  }

  load(afterLoad?: () => void) {
    const id = ++this.requestId;
    this.loading = true;
    this.cdr.detectChanges();
    const params = { from: this.from ? this.formatDateValue(this.from) : '', to: this.to ? this.formatDateValue(this.to) : '' };
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
  }

  generate() {
    if (!this.selectedExport) {
      this.messages.add({ severity: 'warn', summary: 'Formato requerido', detail: 'Selecciona PDF o Excel antes de generar.' });
      return;
    }
    const run = () => this.selectedExport === 'pdf' ? this.exportPdf() : this.exportExcel();
    if (!this.rows.length) this.load(run); else run();
  }

  setRows(data: any) {
    const rows = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
    this.rows = rows;
    this.columns = rows.length ? Object.keys(rows[0]).filter(k => typeof rows[0][k] !== 'object') : [];
  }

  exportPdf() {
    if (!this.ensureExportable()) return;
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
    if (!this.ensureExportable()) return;
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

  currentReportLabel() { return this.reportOptions.find(option => option.value === this.type)?.label || 'Reporte'; }
  periodLabel() { return `Periodo: ${this.from ? this.formatDateValue(this.from) : 'inicio'} - ${this.to ? this.formatDateValue(this.to) : 'hoy'}`; }
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