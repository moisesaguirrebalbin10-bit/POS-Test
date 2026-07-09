import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MessageService } from 'primeng/api';
import { AdminApiService } from '../core/admin-api.service';

const STATUS_LABELS: Record<string, string> = { trial: 'Prueba', active: 'Activa', past_due: 'Pago pendiente', suspended: 'Suspendida', cancelled: 'Cancelada' };

type CreateForm = { company_name: string; owner_name: string; owner_email: string; plan_id: number | null };

@Component({
  selector: 'app-admin-companies', standalone: true,
  imports: [CurrencyPipe, DatePipe, FormsModule, RouterLink, MatIconModule, MatButtonModule, MatMenuModule],
  template: `
  <section class="admin-page">
    @if (!companyId) {
      <header class="admin-head">
        <div><span class="eyebrow">Panel Administrativo</span><h1>Empresas</h1><p>Todas las empresas registradas en OptiUso.</p></div>
        <button mat-flat-button class="primary-action" (click)="openCreateModal()"><mat-icon>add</mat-icon>Nueva Empresa</button>
      </header>
      <div class="admin-panel">
        <div class="admin-toolbar companies-toolbar">
          <div class="search-pill"><mat-icon>search</mat-icon><input type="text" placeholder="Buscar empresas..." [(ngModel)]="search" (ngModelChange)="onFilterChange()"></div>
          <div class="toolbar-actions">
            <select class="date-preset-select" [(ngModel)]="statusFilter" (ngModelChange)="onFilterChange()">
              <option value="">Todos los Estados</option>
              <option value="trial">Prueba</option>
              <option value="active">Activa</option>
              <option value="past_due">Pago pendiente</option>
              <option value="suspended">Suspendida</option>
              <option value="cancelled">Cancelada</option>
            </select>
            <select class="date-preset-select" [(ngModel)]="planFilter" (ngModelChange)="onFilterChange()">
              <option value="">Todos los Planes</option>
              @for (p of plans; track p.id) { <option [value]="p.id">{{p.name}}</option> }
            </select>
            <button type="button" class="icon-btn" title="Actualizar" (click)="load()"><mat-icon>refresh</mat-icon></button>
          </div>
        </div>

        @if (loading) { <div class="loading-state"><mat-icon>hourglass_empty</mat-icon><p>Cargando...</p></div> }
        @else {
          <div class="data-table">
            <div class="data-row table-head" style="--cols:5"><span>Empresa</span><span>Dueño</span><span>Plan</span><span>Estado</span><span>Usuarios</span><span class="table-actions">Acciones</span></div>
            @for (c of companies; track c.id) {
              <div class="data-row" style="--cols:5">
                <span class="user-name-cell"><span class="user-avatar-initials">{{initials(c.name)}}</span><span><b>{{c.name}}</b><small>{{c.license_key}}</small></span></span>
                <span>{{c.owner?.name || '-'}}</span>
                <span><span class="category-pill">{{c.plan?.name || 'Sin plan'}}</span></span>
                <span><b class="status-chip" [class]="'status-' + c.status">{{statusLabel(c.status)}}</b></span>
                <span>{{c.users_count}}</span>
                <span class="table-actions">
                  <button mat-icon-button [routerLink]="['/admin/companies', c.id]" title="Ver detalle"><mat-icon>visibility</mat-icon></button>
                  <button mat-icon-button [matMenuTriggerFor]="rowMenu" title="Mas acciones"><mat-icon>more_vert</mat-icon></button>
                  <mat-menu #rowMenu="matMenu">
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
          @if (!companies.length) { <div class="empty-state"><mat-icon>business</mat-icon><p>No se encontraron empresas.</p></div> }
          @if (total > 0) {
            <div class="pagination-bar">
              <span class="pagination-label">Mostrando {{rangeStart()}} - {{rangeEnd()}} de {{total}} empresas registradas</span>
              <div class="pagination-controls">
                <button type="button" class="page-btn" [disabled]="page <= 1" (click)="goToPage(page - 1)"><mat-icon>chevron_left</mat-icon></button>
                @for (p of pageNumbers(); track p) { <button type="button" class="page-btn" [class.current]="p === page" (click)="goToPage(p)">{{p}}</button> }
                <button type="button" class="page-btn" [disabled]="page >= lastPage" (click)="goToPage(page + 1)"><mat-icon>chevron_right</mat-icon></button>
              </div>
            </div>
          }
        }
      </div>

      @if (showCreateModal) {
        <div class="modal-backdrop" (click)="closeCreateModal()">
          <div class="app-modal" (click)="$event.stopPropagation()">
            <header><h2>Nueva Empresa</h2><button mat-icon-button (click)="closeCreateModal()"><mat-icon>close</mat-icon></button></header>
            <div class="modal-grid">
              <label class="report-field"><span>Nombre de la Empresa</span><input class="date-input" [(ngModel)]="createForm.company_name" [ngModelOptions]="{standalone: true}"></label>
              <label class="report-field"><span>Nombre del Dueño</span><input class="date-input" [(ngModel)]="createForm.owner_name" [ngModelOptions]="{standalone: true}"></label>
              <label class="report-field"><span>Email del Dueño</span><input class="date-input" type="email" [(ngModel)]="createForm.owner_email" [ngModelOptions]="{standalone: true}"></label>
              <label class="report-field"><span>Plan Inicial</span>
                <select class="date-preset-select" [(ngModel)]="createForm.plan_id" [ngModelOptions]="{standalone: true}">
                  <option [ngValue]="null">Basico (por defecto)</option>
                  @for (p of plans; track p.id) { <option [ngValue]="p.id">{{p.name}}</option> }
                </select>
              </label>
            </div>
            <p class="modal-hint">Se creara la empresa en modo prueba (14 dias) y se generara una contraseña temporal para el dueño.</p>
            @if (createError) { <p class="error">{{createError}}</p> }
            <div class="modal-actions">
              <button mat-stroked-button (click)="closeCreateModal()">Cancelar</button>
              <button mat-flat-button class="primary-action" [disabled]="creating || !createForm.company_name || !createForm.owner_name || !createForm.owner_email" (click)="submitCreate()">{{creating ? 'Creando...' : 'Crear Empresa'}}</button>
            </div>
          </div>
        </div>
      }

      @if (createdResult) {
        <div class="modal-backdrop">
          <div class="app-modal credentials-modal">
            <header><h2><mat-icon>check_circle</mat-icon>Empresa Creada</h2></header>
            <p>Comparte estas credenciales con el dueño de la empresa. La contraseña <b>no se volvera a mostrar</b>.</p>
            <div class="credentials-box">
              <div><span>Empresa</span><b>{{createdResult.company.name}}</b></div>
              <div><span>Email</span><b>{{createdResult.owner_email}}</b></div>
              <div><span>Contraseña Temporal</span><b>{{createdResult.temporary_password}}</b></div>
            </div>
            <div class="modal-actions">
              <button mat-stroked-button (click)="copyCredentials()"><mat-icon>content_copy</mat-icon>Copiar</button>
              <button mat-flat-button class="primary-action" (click)="closeCredentialsModal()">Listo</button>
            </div>
          </div>
        </div>
      }
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
    .companies-toolbar { grid-template-columns: 1fr auto; }
    @media (max-width: 700px) { .companies-toolbar { grid-template-columns: 1fr; } }
    .credentials-box { display: flex; flex-direction: column; gap: 10px; margin: 14px 0; padding: 14px; border-radius: 10px; background: var(--surface-2); border: 1px solid var(--line); }
    .credentials-box > div { display: flex; align-items: center; justify-content: space-between; gap: 12px; font-size: 13px; }
    .credentials-box span { color: var(--muted); font-weight: 700; }
    .credentials-box b { font-family: monospace; font-size: 14px; overflow-wrap: anywhere; text-align: right; }
    .credentials-modal p { color: var(--muted); font-size: 13px; margin: 0; }
  `]
})
export class AdminCompaniesComponent implements OnInit {
  api = inject(AdminApiService); cdr = inject(ChangeDetectorRef); route = inject(ActivatedRoute); router = inject(Router); messages = inject(MessageService);
  companies: any[] = []; loading = false; search = '';
  statusFilter = ''; planFilter = '';
  page = 1; lastPage = 1; total = 0; perPage = 20;
  companyId: string | null = null;
  detail: any = null;
  plans: any[] = [];

  showCreateModal = false;
  creating = false;
  createError = '';
  createForm: CreateForm = { company_name: '', owner_name: '', owner_email: '', plan_id: null };
  createdResult: any = null;

  ngOnInit() {
    this.search = this.route.snapshot.queryParamMap.get('search') || '';
    this.loadPlans();
    this.route.paramMap.subscribe(params => {
      this.companyId = params.get('id');
      if (this.companyId) this.loadDetail(this.companyId); else this.load();
    });
  }

  loadPlans() { this.api.get<any[]>('plans').subscribe(res => { this.plans = res || []; this.cdr.detectChanges(); }); }

  onFilterChange() { this.page = 1; this.load(); }

  load() {
    this.loading = true;
    this.cdr.detectChanges();
    const params: any = {
      page: this.page,
      ...(this.search ? { search: this.search } : {}),
      ...(this.statusFilter ? { status: this.statusFilter } : {}),
      ...(this.planFilter ? { plan_id: this.planFilter } : {}),
    };
    this.api.get<any>('companies', params).subscribe(res => {
      this.companies = res.data || [];
      this.total = res.total ?? this.companies.length;
      this.lastPage = res.last_page || 1;
      this.page = res.current_page || 1;
      this.loading = false;
      this.cdr.detectChanges();
    });
  }

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

  initials(name: string | null) {
    if (!name) return 'NA';
    const parts = name.trim().split(/\s+/);
    return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || 'NA';
  }

  toggleStatus(company: any) {
    const newStatus = company.status === 'suspended' ? 'active' : 'suspended';
    this.api.put<any>(`companies/${company.id}/status`, { status: newStatus }).subscribe({
      next: () => { this.messages.add({ severity: 'success', summary: 'Actualizado', detail: `"${company.name}" ${newStatus === 'suspended' ? 'fue suspendida' : 'fue reactivada'}.` }); this.load(); },
      error: (err: any) => this.messages.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'No autorizado para esta accion.' })
    });
  }

  openCreateModal() { this.createError = ''; this.createForm = { company_name: '', owner_name: '', owner_email: '', plan_id: null }; this.showCreateModal = true; }
  closeCreateModal() { this.showCreateModal = false; }

  submitCreate() {
    if (this.creating || !this.createForm.company_name || !this.createForm.owner_name || !this.createForm.owner_email) return;
    this.creating = true; this.createError = '';
    this.api.post<any>('companies', this.createForm).subscribe({
      next: (res: any) => {
        this.creating = false; this.showCreateModal = false; this.createdResult = res;
        this.load();
        this.cdr.detectChanges();
      },
      error: (err: any) => { this.creating = false; this.createError = err?.error?.message || 'No se pudo crear la empresa.'; this.cdr.detectChanges(); }
    });
  }

  closeCredentialsModal() { this.createdResult = null; }

  copyCredentials() {
    if (!this.createdResult) return;
    const text = `Empresa: ${this.createdResult.company.name}\nEmail: ${this.createdResult.owner_email}\nContrasena temporal: ${this.createdResult.temporary_password}`;
    navigator.clipboard?.writeText(text).then(() => this.messages.add({ severity: 'success', summary: 'Copiado', detail: 'Credenciales copiadas al portapapeles.' }));
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
