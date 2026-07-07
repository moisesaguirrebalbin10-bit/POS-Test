import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MessageService } from 'primeng/api';
import { AdminApiService } from '../core/admin-api.service';

const STATUS_LABELS: Record<string, string> = { trial: 'Prueba', active: 'Activa', past_due: 'Pago pendiente', suspended: 'Suspendida', cancelled: 'Cancelada' };

@Component({
  selector: 'app-admin-companies', standalone: true,
  imports: [CurrencyPipe, DatePipe, FormsModule, RouterLink, MatIconModule, MatButtonModule],
  template: `
  <section class="admin-page">
    @if (!companyId) {
      <header class="admin-head"><div><span class="eyebrow">Panel Administrativo</span><h1>Empresas</h1><p>Todas las empresas registradas en ServiMax.</p></div></header>
      <div class="admin-panel">
        <div class="admin-toolbar">
          <div class="search-pill"><mat-icon>search</mat-icon><input type="text" placeholder="Buscar empresas..." [(ngModel)]="search" (ngModelChange)="load()"></div>
        </div>
        @if (loading) { <div class="loading-state"><mat-icon>hourglass_empty</mat-icon><p>Cargando...</p></div> }
        @else {
          <div class="data-table">
            <div class="data-row table-head" style="--cols:6"><span>Empresa</span><span>Dueño</span><span>Plan</span><span>Estado</span><span>Usuarios</span><span>Acciones</span></div>
            @for (c of companies; track c.id) {
              <div class="data-row" style="--cols:6">
                <span>{{c.name}}</span>
                <span>{{c.owner?.name || '-'}}</span>
                <span>{{c.plan?.name || 'Sin plan'}}</span>
                <span><b class="status-chip" [class]="'status-' + c.status">{{statusLabel(c.status)}}</b></span>
                <span>{{c.users_count}}</span>
                <span class="table-actions">
                  <button mat-icon-button [routerLink]="['/admin/companies', c.id]" title="Ver Estadisticas"><mat-icon>visibility</mat-icon></button>
                </span>
              </div>
            }
          </div>
        }
      </div>
    } @else if (detail) {
      <header class="admin-head">
        <div><button mat-button (click)="back()"><mat-icon>arrow_back</mat-icon>Volver</button><h1>{{detail.company.name}}</h1><p>{{detail.company.owner?.email}}</p></div>
        <div class="status-actions">
          <b class="status-chip" [class]="'status-' + detail.company.status">{{statusLabel(detail.company.status)}}</b>
          @if (detail.company.status === 'suspended') {
            <button mat-flat-button class="primary-action" (click)="setStatus('active')"><mat-icon>play_circle</mat-icon>Reactivar</button>
          } @else {
            <button mat-stroked-button color="warn" (click)="setStatus('suspended')"><mat-icon>pause_circle</mat-icon>Suspender</button>
          }
        </div>
      </header>

      <div class="kpi-grid">
        <article class="kpi-card kpi-blue"><div class="kpi-icon"><mat-icon>point_of_sale</mat-icon></div><div class="kpi-body"><span>Ventas totales</span><strong>{{detail.sales_total | currency:'PEN':'S/ '}}</strong></div></article>
        <article class="kpi-card kpi-green"><div class="kpi-icon"><mat-icon>receipt_long</mat-icon></div><div class="kpi-body"><span>Numero de ventas</span><strong>{{detail.sales_count}}</strong></div></article>
        <article class="kpi-card kpi-orange"><div class="kpi-icon"><mat-icon>sell</mat-icon></div><div class="kpi-body"><span>Plan</span><strong>{{detail.company.plan?.name || 'Sin plan'}}</strong></div></article>
        <article class="kpi-card kpi-purple"><div class="kpi-icon"><mat-icon>group</mat-icon></div><div class="kpi-body"><span>Usuarios</span><strong>{{detail.company.users?.length || 0}}</strong></div></article>
      </div>

      <div class="dashboard-charts two-col">
        <article class="chart-card">
          <header><mat-icon>group</mat-icon><h3>Usuarios de la empresa</h3></header>
          <div class="data-table">
            <div class="data-row table-head" style="--cols:3"><span>Nombre</span><span>Email</span><span>Estado</span></div>
            @for (u of detail.company.users; track u.id) {
              <div class="data-row" style="--cols:3"><span>{{u.name}}</span><span>{{u.email}}</span><span>{{u.active ? 'Activo' : 'Inactivo'}}</span></div>
            }
          </div>
        </article>
        <article class="chart-card">
          <header><mat-icon>history</mat-icon><h3>Actividad reciente</h3></header>
          <div class="data-table">
            <div class="data-row table-head" style="--cols:2"><span>Accion</span><span>Fecha</span></div>
            @for (l of detail.activity_logs.slice(0, 10); track l.id) {
              <div class="data-row" style="--cols:2"><span>{{l.description}}</span><span>{{l.created_at | date:'dd/MM/yyyy HH:mm'}}</span></div>
            }
          </div>
        </article>
      </div>
    }
  </section>`,
  styles: [`
    .status-actions { display: flex; align-items: center; gap: 12px; }
    .status-chip.status-active { background: #dcfce7; color: #16a34a; }
    .status-chip.status-trial { background: #fef9c3; color: #a16207; }
    .status-chip.status-suspended, .status-chip.status-cancelled, .status-chip.status-past_due { background: #fee2e2; color: #dc2626; }
  `]
})
export class AdminCompaniesComponent implements OnInit {
  api = inject(AdminApiService); cdr = inject(ChangeDetectorRef); route = inject(ActivatedRoute); router = inject(Router); messages = inject(MessageService);
  companies: any[] = []; loading = false; search = '';
  companyId: string | null = null;
  detail: any = null;

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      this.companyId = params.get('id');
      if (this.companyId) this.loadDetail(this.companyId); else this.load();
    });
  }

  load() {
    this.loading = true;
    this.cdr.detectChanges();
    this.api.get<any>('companies', this.search ? { search: this.search } : {}).subscribe(res => {
      this.companies = res.data;
      this.loading = false;
      this.cdr.detectChanges();
    });
  }

  loadDetail(id: string) {
    this.detail = null;
    this.api.get<any>(`companies/${id}`).subscribe(res => { this.detail = res; this.cdr.detectChanges(); });
  }

  setStatus(status: string) {
    this.api.put(`companies/${this.companyId}/status`, { status }).subscribe({
      next: () => { this.messages.add({ severity: 'success', summary: 'Actualizado', detail: 'Estado de la empresa actualizado.' }); this.loadDetail(this.companyId!); },
      error: (err: any) => this.messages.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'No se pudo actualizar.' })
    });
  }

  back() { this.router.navigateByUrl('/admin/companies'); }
  statusLabel(status: string) { return STATUS_LABELS[status] || status; }
}
