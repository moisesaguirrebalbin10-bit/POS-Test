import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ConfirmationService, MessageService } from 'primeng/api';
import { AdminApiService } from '../core/admin-api.service';

type StaffStats = { total: number; trendPercent: number | null; superAdminCount: number; supportCount: number; activeSessions: number };
type StaffForm = { id: number | null; name: string; email: string; password: string; active: boolean; roles: number[] };

@Component({
  selector: 'app-admin-staff', standalone: true,
  imports: [RouterLink, FormsModule, MatIconModule, MatButtonModule],
  template: `
  <section class="admin-page">
    <header class="admin-head">
      <div><span class="eyebrow">Panel Administrativo</span><h1>Personal Administrativo</h1><p>Administre los miembros del equipo interno de ServiMax y sus niveles de acceso al sistema.</p></div>
      <button mat-flat-button class="primary-action" (click)="openCreate()"><mat-icon>person_add</mat-icon>Nuevo Miembro</button>
    </header>

    @if (stats) {
      <div class="stats-row">
        <article class="stat-tile"><mat-icon>groups</mat-icon><div><small>Total Personal</small><strong>{{stats.total}}</strong>
          @if (stats.trendPercent === null) { <span class="stat-trend neutral">Sin datos del mes anterior</span> }
          @else { <span class="stat-trend positive">&uarr; +{{stats.trendPercent}}% este mes</span> }
        </div></article>
        <article class="stat-tile"><mat-icon>shield</mat-icon><div><small>Administradores</small><strong>{{stats.superAdminCount}}</strong><span class="stat-trend info">Rol Super Admin</span></div></article>
        <article class="stat-tile"><mat-icon>support_agent</mat-icon><div><small>Soporte Tecnico</small><strong>{{stats.supportCount}}</strong><span class="stat-trend neutral">Rol Soporte</span></div></article>
        <article class="stat-tile ok"><mat-icon>wifi_tethering</mat-icon><div><small>Sesiones Activas</small><strong>{{stats.activeSessions}}</strong><span class="stat-trend info"><span class="live-dot"></span>En vivo</span></div></article>
      </div>
    }

    <div class="admin-panel">
      <div class="admin-toolbar companies-toolbar">
        <div class="toolbar-actions">
          <select class="date-preset-select" [(ngModel)]="roleFilter" (ngModelChange)="onFilterChange()">
            <option value="">Todos los Roles</option>
            @for (r of roles; track r.id) { <option [value]="r.id">{{r.name}}</option> }
          </select>
        </div>
        <div class="toolbar-actions" style="margin-left:auto">
          <span class="pagination-label">Mostrando {{total}} miembros</span>
          <button type="button" class="filter-btn" (click)="exportCsv()"><mat-icon>download</mat-icon>Exportar</button>
        </div>
      </div>

      @if (loading) { <div class="loading-state"><mat-icon>hourglass_empty</mat-icon><p>Cargando...</p></div> }
      @else {
        <div class="data-table">
          <div class="data-row table-head" style="--cols:5"><span>Miembro</span><span>Email</span><span>Rol</span><span>Ultimo Acceso</span><span>Estado</span><span class="table-actions">Acciones</span></div>
          @for (s of staff; track s.id) {
            <div class="data-row" style="--cols:5">
              <span class="user-name-cell"><span class="user-avatar-initials">{{initials(s.name)}}</span><span><b>{{s.name}}</b><small>ID: {{s.id}}</small></span></span>
              <span>{{s.email}}</span>
              <span><span class="category-pill">{{s.roles?.[0]?.name || 'Sin rol'}}</span></span>
              <span [class.income-amount]="isActiveNow(s)">{{lastAccessLabel(s)}}</span>
              <span>
                <label class="switch">
                  <input type="checkbox" [checked]="s.active" (change)="toggleActive(s, $any($event.target).checked)">
                  <span class="switch-track"></span><span class="switch-thumb"></span>
                </label>
              </span>
              <span class="table-actions boxed-actions">
                <button mat-icon-button (click)="openEdit(s)"><mat-icon>edit</mat-icon></button>
                <button mat-icon-button (click)="confirmDelete(s)"><mat-icon>delete</mat-icon></button>
              </span>
            </div>
          }
        </div>
        @if (!staff.length) { <div class="empty-state"><mat-icon>group_off</mat-icon><p>No hay miembros de staff para este filtro.</p></div> }
        @if (total > 0) {
          <div class="pagination-bar">
            <span class="pagination-label">Pagina {{page}} de {{lastPage}}</span>
            <div class="pagination-controls">
              <button type="button" class="page-btn" [disabled]="page <= 1" (click)="goToPage(page - 1)"><mat-icon>chevron_left</mat-icon></button>
              @for (p of pageNumbers(); track p) { <button type="button" class="page-btn" [class.current]="p === page" (click)="goToPage(p)">{{p}}</button> }
              <button type="button" class="page-btn" [disabled]="page >= lastPage" (click)="goToPage(page + 1)"><mat-icon>chevron_right</mat-icon></button>
            </div>
          </div>
        }
      }
    </div>

    <article class="audit-trust-card staff-audit-banner">
      <mat-icon>verified_user</mat-icon>
      <div>
        <strong>Auditoria de Seguridad</strong>
        <p>El sistema registra automaticamente todas las acciones administrativas del staff (creacion, edicion, cambios de rol y estado) con fecha, autor e IP.</p>
      </div>
      <a routerLink="/admin/logs" class="btn btn-outline-audit">Ver Registros</a>
    </article>

    @if (showModal) {
      <div class="modal-backdrop" (click)="closeModal()">
        <div class="app-modal" (click)="$event.stopPropagation()">
          <header><h2>{{form.id ? 'Editar' : 'Nuevo'}} Miembro</h2><button mat-icon-button (click)="closeModal()"><mat-icon>close</mat-icon></button></header>
          <div class="modal-grid">
            <label class="report-field"><span>Nombre</span><input class="date-input" [(ngModel)]="form.name" [ngModelOptions]="{standalone: true}"></label>
            <label class="report-field"><span>Email</span><input class="date-input" type="email" [(ngModel)]="form.email" [ngModelOptions]="{standalone: true}"></label>
            <label class="report-field"><span>{{form.id ? 'Nueva Contraseña (opcional)' : 'Contraseña'}}</span><input class="date-input" type="password" [(ngModel)]="form.password" [ngModelOptions]="{standalone: true}"></label>
            <label class="check-field"><input type="checkbox" [(ngModel)]="form.active" [ngModelOptions]="{standalone: true}"> Activo</label>
          </div>
          <div class="multiselect-field">
            <span>Roles</span>
            <div class="multiselect-options">
              @for (r of roles; track r.id) {
                <label class="permission-check">
                  <input type="checkbox" [checked]="form.roles.includes(r.id)" (change)="toggleRole(r.id, $any($event.target).checked)">
                  <span>{{r.name}}</span>
                </label>
              }
            </div>
          </div>
          @if (formError) { <p class="error">{{formError}}</p> }
          <div class="modal-actions">
            <button mat-stroked-button (click)="closeModal()">Cancelar</button>
            <button mat-flat-button class="primary-action" [disabled]="saving || !form.name || !form.email" (click)="save()">{{saving ? 'Guardando...' : 'Guardar'}}</button>
          </div>
        </div>
      </div>
    }
  </section>`,
  styles: [`
    .companies-toolbar { grid-template-columns: auto 1fr; align-items: center; }
    .staff-audit-banner { flex-direction: row; align-items: center; text-align: left; margin-top: 18px; gap: 16px; padding: 18px 20px; }
    .staff-audit-banner p { margin: 4px 0 0; }
    .btn-outline-audit { flex: none; padding: 10px 16px; border-radius: 8px; border: 1px solid rgba(255,255,255,.3); color: #fff; text-decoration: none; font-size: 13px; font-weight: 700; }
    .btn-outline-audit:hover { background: rgba(255,255,255,.1); }
  `]
})
export class AdminStaffComponent implements OnInit {
  api = inject(AdminApiService); cdr = inject(ChangeDetectorRef); messages = inject(MessageService); confirmation = inject(ConfirmationService);
  staff: any[] = []; loading = false;
  stats: StaffStats | null = null;
  roles: any[] = [];
  roleFilter = '';
  page = 1; lastPage = 1; total = 0; perPage = 20;

  showModal = false; saving = false; formError = '';
  form: StaffForm = { id: null, name: '', email: '', password: '', active: true, roles: [] };

  ngOnInit() {
    this.loadRoles();
    this.loadStats();
    this.load();
  }

  loadRoles() { this.api.get<any>('staff-roles').subscribe(res => { this.roles = res.roles || []; this.cdr.detectChanges(); }); }
  loadStats() {
    this.api.get<any>('staff-stats').subscribe(res => {
      this.stats = {
        total: Number(res?.total || 0), trendPercent: res?.trend_percent === null || res?.trend_percent === undefined ? null : Number(res.trend_percent),
        superAdminCount: Number(res?.super_admin_count || 0), supportCount: Number(res?.support_count || 0),
        activeSessions: Number(res?.active_sessions || 0),
      };
      this.cdr.detectChanges();
    });
  }

  onFilterChange() { this.page = 1; this.load(); }

  load() {
    this.loading = true;
    this.cdr.detectChanges();
    const params: any = { page: this.page, per_page: this.perPage, ...(this.roleFilter ? { role_id: this.roleFilter } : {}) };
    this.api.get<any>('staff', params).subscribe(res => {
      this.staff = res.data || [];
      this.total = res.total ?? this.staff.length;
      this.lastPage = res.last_page || 1;
      this.page = res.current_page || 1;
      this.loading = false;
      this.cdr.detectChanges();
    });
  }

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

  isActiveNow(admin: any): boolean {
    const lastUsed = admin.tokens?.[0]?.last_used_at;
    if (!lastUsed) return false;
    return (Date.now() - new Date(lastUsed).getTime()) / 60000 < 15;
  }
  lastAccessLabel(admin: any): string {
    const lastUsed = admin.tokens?.[0]?.last_used_at;
    if (!lastUsed) return 'Nunca';
    if (this.isActiveNow(admin)) return 'Activo ahora';
    return new Date(lastUsed).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' });
  }

  toggleActive(admin: any, checked: boolean) {
    this.api.put<any>(`staff/${admin.id}`, { active: checked }).subscribe({
      next: () => { admin.active = checked; this.messages.add({ severity: 'success', summary: 'Actualizado', detail: `"${admin.name}" ahora esta ${checked ? 'activo' : 'inactivo'}.` }); },
      error: (err: any) => this.messages.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'No se pudo actualizar.' })
    });
  }

  openCreate() { this.form = { id: null, name: '', email: '', password: '', active: true, roles: [] }; this.formError = ''; this.showModal = true; }
  openEdit(s: any) { this.form = { id: s.id, name: s.name, email: s.email, password: '', active: s.active, roles: (s.roles || []).map((r: any) => r.id) }; this.formError = ''; this.showModal = true; }
  closeModal() { this.showModal = false; }
  toggleRole(id: number, checked: boolean) { this.form.roles = checked ? [...this.form.roles, id] : this.form.roles.filter(r => r !== id); }

  save() {
    if (this.saving || !this.form.name || !this.form.email) return;
    this.saving = true; this.formError = '';
    const body: any = { name: this.form.name, email: this.form.email, active: this.form.active, roles: this.form.roles };
    if (this.form.password) body.password = this.form.password;
    const req = this.form.id ? this.api.put<any>(`staff/${this.form.id}`, body) : this.api.post<any>('staff', body);
    req.subscribe({
      next: () => { this.saving = false; this.showModal = false; this.messages.add({ severity: 'success', summary: 'Guardado', detail: 'Miembro de staff guardado correctamente.' }); this.load(); this.loadStats(); },
      error: (err: any) => { this.saving = false; this.formError = err?.error?.message || 'No se pudo guardar.'; this.cdr.detectChanges(); }
    });
  }

  confirmDelete(s: any) {
    this.confirmation.confirm({
      header: 'Confirmar desactivacion', message: `Deseas desactivar a ${s.name}?`, icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Desactivar', rejectLabel: 'Cancelar', acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.api.delete(`staff/${s.id}`).subscribe({
        next: () => { this.messages.add({ severity: 'success', summary: 'Desactivado', detail: `"${s.name}" fue desactivado.` }); this.load(); this.loadStats(); },
        error: (err: any) => this.messages.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'No se pudo desactivar.' })
      })
    });
  }

  exportCsv() {
    if (!this.staff.length) { this.messages.add({ severity: 'warn', summary: 'Sin datos', detail: 'No hay miembros para exportar.' }); return; }
    const header = ['Nombre', 'Email', 'Rol', 'Ultimo Acceso', 'Estado'];
    const rows = this.staff.map(s => [s.name, s.email, s.roles?.[0]?.name || 'Sin rol', this.lastAccessLabel(s), s.active ? 'Activo' : 'Inactivo']);
    const csv = [header, ...rows].map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = `staff-servimax-${new Date().toISOString().slice(0, 10)}.csv`; link.click();
    URL.revokeObjectURL(url);
  }
}
