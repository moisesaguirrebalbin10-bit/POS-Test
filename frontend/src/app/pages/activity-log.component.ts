import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ApiService } from '../core/api.service';

type LogRow = { id: number; user_name: string | null; module: string; action: string; description: string; created_at: string };

@Component({
  selector: 'app-activity-log',
  standalone: true,
  imports: [DatePipe, FormsModule, MatFormFieldModule, MatInputModule, MatIconModule, MatButtonModule],
  template: `
  <section class="admin-page">
    <header class="admin-head">
      <div><span class="eyebrow">Administracion</span><h1>Registros</h1><p>Historial de acciones realizadas por los usuarios del sistema.</p></div>
    </header>

    <div class="admin-panel">
      <div class="admin-toolbar">
        <mat-form-field appearance="outline" class="admin-search"><mat-label>Buscar por usuario, modulo o accion</mat-label><mat-icon matPrefix>search</mat-icon><input matInput [(ngModel)]="search" (ngModelChange)="onSearchInput()"></mat-form-field>
        <button mat-flat-button class="filter-action" (click)="load(true)" [disabled]="loading"><mat-icon>refresh</mat-icon>{{loading ? 'Cargando' : 'Actualizar'}}</button>
      </div>

      <div class="data-table log-scroll" (scroll)="onScroll($event)">
        <div class="data-row table-head log-row">
          <span>Fecha y hora</span><span>Usuario</span><span>Modulo</span><span>Accion</span><span>Descripcion</span>
        </div>
        @for (row of rows; track row.id) {
          <div class="data-row log-row">
            <span>{{row.created_at | date:'dd/MM/yyyy HH:mm:ss'}}</span>
            <span>{{row.user_name || 'Sistema'}}</span>
            <span class="status-chip">{{row.module}}</span>
            <span>{{row.action}}</span>
            <span>{{row.description}}</span>
          </div>
        }
      </div>

      @if (loading && !rows.length) { <div class="loading-state"><mat-icon>hourglass_empty</mat-icon><p>Cargando registros...</p></div> }
      @if (!loading && !rows.length) { <div class="empty-state"><mat-icon>inbox</mat-icon><p>No hay registros para mostrar.</p></div> }
      @if (loadingMore) { <div class="log-loading-more"><mat-icon>hourglass_empty</mat-icon>Cargando mas...</div> }
      @if (!loadingMore && rows.length && page < lastPage) { <button mat-stroked-button class="load-more-btn" (click)="loadMore()">Cargar mas ({{rows.length}} de {{total}})</button> }
      @if (error) { <div class="error-state"><mat-icon>error_outline</mat-icon><p>{{error}}</p></div> }
    </div>
  </section>`
})
export class ActivityLogComponent implements OnInit {
  api = inject(ApiService);
  cdr = inject(ChangeDetectorRef);
  rows: LogRow[] = [];
  search = '';
  page = 1; lastPage = 1; total = 0;
  loading = false; loadingMore = false; error = '';
  private searchTimer: ReturnType<typeof setTimeout> | undefined;
  private requestId = 0;

  ngOnInit() { this.load(true); }

  onSearchInput() { clearTimeout(this.searchTimer); this.searchTimer = setTimeout(() => this.load(true), 350); }

  load(reset: boolean) {
    if (reset) { this.page = 1; this.rows = []; }
    const id = ++this.requestId;
    this.loading = reset; this.loadingMore = !reset; this.error = '';
    this.cdr.detectChanges();
    this.api.get<any>('activity-logs', { page: this.page, ...(this.search ? { search: this.search } : {}) }).subscribe({
      next: (res: any) => {
        if (id !== this.requestId) return;
        this.rows = reset ? (res.data || []) : [...this.rows, ...(res.data || [])];
        this.lastPage = res.last_page || 1;
        this.total = res.total ?? this.rows.length;
        this.loading = false; this.loadingMore = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        if (id !== this.requestId) return;
        this.loading = false; this.loadingMore = false;
        this.error = err?.error?.message || 'No se pudo cargar los registros.';
        this.cdr.detectChanges();
      }
    });
  }

  loadMore() {
    if (this.loadingMore || this.page >= this.lastPage) return;
    this.page++;
    this.load(false);
  }

  onScroll(event: Event) {
    const el = event.target as HTMLElement;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 60) this.loadMore();
  }
}
