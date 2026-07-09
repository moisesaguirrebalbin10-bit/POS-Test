import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ConfirmationService, MessageService } from 'primeng/api';
import { AdminApiService } from '../core/admin-api.service';

type RoleStats = { totalRoles: number; totalPermissions: number; staffLinked: number };
type RoleForm = { id: number | null; name: string; description: string; permissions: number[] };

const ROLE_ICONS: Record<string, { icon: string; bg: string; color: string }> = {
  'Super Admin': { icon: 'rocket_launch', bg: '#e0f2fe', color: '#0284c7' },
  Soporte: { icon: 'support_agent', bg: '#e0e7ff', color: '#4338ca' },
  Ventas: { icon: 'sell', bg: '#dcfce7', color: '#16a34a' },
};

@Component({
  selector: 'app-admin-staff-roles', standalone: true,
  imports: [FormsModule, MatIconModule, MatButtonModule],
  template: `
  <section class="admin-page">
    <header class="admin-head">
      <div><span class="eyebrow">Panel Administrativo</span><h1>Roles de Sistema</h1><p>Define y gestiona los niveles de acceso y permisos para el personal administrativo de OptiUso.</p></div>
      <button mat-flat-button class="primary-action" (click)="openCreate()"><mat-icon>add</mat-icon>Nuevo Rol</button>
    </header>

    @if (stats) {
      <div class="stats-row">
        <article class="stat-tile"><mat-icon>groups</mat-icon><div><small>Total Roles</small><strong>{{pad2(stats.totalRoles)}}</strong></div></article>
        <article class="stat-tile"><mat-icon>vpn_key</mat-icon><div><small>Permisos Globales</small><strong>{{stats.totalPermissions}}</strong><span class="stat-trend info">activos</span></div></article>
        <article class="stat-tile ok"><mat-icon>badge</mat-icon><div><small>Staff Vinculado</small><strong>{{stats.staffLinked}}</strong><span class="stat-trend neutral">usuarios</span></div></article>
      </div>
    }

    <div class="admin-panel">
      <div class="panel-subhead"><h3>Listado de Roles</h3></div>

      @if (loading) { <div class="loading-state"><mat-icon>hourglass_empty</mat-icon><p>Cargando...</p></div> }
      @else {
        <div class="data-table">
          <div class="data-row table-head" style="--cols:4"><span>Rol</span><span>Descripcion</span><span>Nivel de Acceso</span><span>Permisos Asignados</span><span class="table-actions">Acciones</span></div>
          @for (r of pagedRoles(); track r.id) {
            <div class="data-row" style="--cols:4">
              <span class="role-name-cell"><span class="role-icon" [style.background]="roleIcon(r.name).bg" [style.color]="roleIcon(r.name).color"><mat-icon>{{roleIcon(r.name).icon}}</mat-icon></span><b>{{r.name}}</b></span>
              <span>{{r.description || '-'}}</span>
              <span class="access-level">
                <span class="level-dots">
                  @for (i of [1,2,3,4,5]; track i) { <span class="level-dot" [class.filled]="i <= accessLevel(r)"></span> }
                </span>
                <small>NIVEL {{accessLevel(r)}}</small>
              </span>
              <span class="perm-progress">
                <span class="perm-progress-track"><span class="perm-progress-fill" [style.width.%]="permPercent(r)"></span></span>
                <b>{{r.permissions?.length || 0}}/{{stats?.totalPermissions || 0}}</b>
              </span>
              <span class="table-actions boxed-actions">
                <button mat-icon-button (click)="openEdit(r)"><mat-icon>edit</mat-icon></button>
                <button mat-icon-button (click)="confirmDelete(r)"><mat-icon>delete</mat-icon></button>
              </span>
            </div>
          }
        </div>
        @if (!roles.length) { <div class="empty-state"><mat-icon>shield</mat-icon><p>No hay roles de staff todavia.</p></div> }
        @if (roles.length > 0) {
          <div class="pagination-bar">
            <span class="pagination-label">Mostrando {{pagedRoles().length}} de {{roles.length}} roles de sistema</span>
            <div class="pagination-controls">
              <button type="button" class="page-btn" [disabled]="page <= 1" (click)="page = page - 1">Anterior</button>
              <button type="button" class="page-btn" [disabled]="page >= lastPage()" (click)="page = page + 1">Siguiente</button>
            </div>
          </div>
        }
      }
    </div>

    <article class="audit-trust-card staff-audit-banner">
      <mat-icon>admin_panel_settings</mat-icon>
      <div>
        <strong>Consola de Control Total</strong>
        <p>Cada rol se administra desde aqui: crea, edita permisos por modulo y elimina roles con el icono de lapiz en la tabla. Los cambios se aplican de inmediato a todo el staff que tenga ese rol asignado.</p>
      </div>
    </article>

    @if (showModal) {
      <div class="modal-backdrop" (click)="closeModal()">
        <div class="app-modal role-modal" (click)="$event.stopPropagation()">
          <header><h2>{{form.id ? 'Editar' : 'Nuevo'}} Rol</h2><button mat-icon-button (click)="closeModal()"><mat-icon>close</mat-icon></button></header>
          <div class="modal-grid">
            <label class="report-field"><span>Nombre del Rol</span><input class="date-input" [(ngModel)]="form.name" [ngModelOptions]="{standalone: true}"></label>
            <label class="report-field"><span>Descripcion</span><input class="date-input" [(ngModel)]="form.description" [ngModelOptions]="{standalone: true}"></label>
          </div>
          @for (group of permissionGroups(); track group.module) {
            <div class="multiselect-field">
              <span>{{group.module}}</span>
              <div class="multiselect-options">
                @for (p of group.items; track p.id) {
                  <label class="permission-check">
                    <input type="checkbox" [checked]="form.permissions.includes(p.id)" (change)="togglePermission(p.id, $any($event.target).checked)">
                    <span>{{p.label}}</span>
                  </label>
                }
              </div>
            </div>
          }
          @if (formError) { <p class="error">{{formError}}</p> }
          <div class="modal-actions">
            <button mat-stroked-button (click)="closeModal()">Cancelar</button>
            <button mat-flat-button class="primary-action" [disabled]="saving || !form.name" (click)="save()">{{saving ? 'Guardando...' : 'Guardar'}}</button>
          </div>
        </div>
      </div>
    }
  </section>`,
  styles: [`
    .access-level { display: flex; flex-direction: column; gap: 4px; }
    .level-dots { display: flex; gap: 3px; }
    .level-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--soft-line); }
    .level-dot.filled { background: #2563eb; }
    .access-level small { font-size: 10px; font-weight: 800; letter-spacing: .04em; color: var(--muted); }
    .perm-progress { display: flex; align-items: center; gap: 8px; }
    .perm-progress-track { flex: 1; height: 6px; border-radius: 999px; background: var(--soft-line); overflow: hidden; }
    .perm-progress-fill { display: block; height: 100%; background: var(--primary); border-radius: 999px; }
    .perm-progress b { font-size: 12px; color: var(--muted); flex: none; }
    .staff-audit-banner { flex-direction: row; align-items: center; text-align: left; margin-top: 18px; gap: 16px; padding: 18px 20px; }
    .staff-audit-banner p { margin: 4px 0 0; }
    .role-modal { width: min(640px, 94vw); }
  `]
})
export class AdminStaffRolesComponent implements OnInit {
  api = inject(AdminApiService); cdr = inject(ChangeDetectorRef); messages = inject(MessageService); confirmation = inject(ConfirmationService);
  roles: any[] = []; permissions: any[] = []; loading = false;
  stats: RoleStats | null = null;
  page = 1; perPage = 5;

  showModal = false; saving = false; formError = '';
  form: RoleForm = { id: null, name: '', description: '', permissions: [] };

  ngOnInit() {
    this.loadStats();
    this.load();
  }

  loadStats() {
    this.api.get<any>('staff-roles-stats').subscribe(res => {
      this.stats = { totalRoles: Number(res?.total_roles || 0), totalPermissions: Number(res?.total_permissions || 0), staffLinked: Number(res?.staff_linked || 0) };
      this.cdr.detectChanges();
    });
  }

  load() {
    this.loading = true;
    this.cdr.detectChanges();
    this.api.get<any>('staff-roles').subscribe(res => {
      this.roles = res.roles || [];
      this.permissions = res.permissions || [];
      this.loading = false;
      this.cdr.detectChanges();
    });
  }

  pagedRoles() { return this.roles.slice((this.page - 1) * this.perPage, this.page * this.perPage); }
  lastPage() { return Math.max(1, Math.ceil(this.roles.length / this.perPage)); }

  pad2(n: number) { return String(n).padStart(2, '0'); }
  roleIcon(name: string) { return ROLE_ICONS[name] || { icon: 'shield', bg: '#f1f5f9', color: '#64748b' }; }

  accessLevel(role: any): number {
    const total = this.stats?.totalPermissions || 0;
    if (!total) return 1;
    const count = role.permissions?.length || 0;
    return Math.min(5, Math.max(1, Math.round((count / total) * 5)));
  }
  permPercent(role: any): number {
    const total = this.stats?.totalPermissions || 0;
    if (!total) return 0;
    return Math.min(100, ((role.permissions?.length || 0) / total) * 100);
  }

  permissionGroups(): { module: string; items: any[] }[] {
    const byModule = new Map<string, any[]>();
    for (const p of this.permissions) {
      if (!byModule.has(p.module)) byModule.set(p.module, []);
      byModule.get(p.module)!.push(p);
    }
    return Array.from(byModule.entries()).map(([module, items]) => ({ module, items }));
  }

  openCreate() { this.form = { id: null, name: '', description: '', permissions: [] }; this.formError = ''; this.showModal = true; }
  openEdit(r: any) { this.form = { id: r.id, name: r.name, description: r.description || '', permissions: (r.permissions || []).map((p: any) => p.id) }; this.formError = ''; this.showModal = true; }
  closeModal() { this.showModal = false; }
  togglePermission(id: number, checked: boolean) { this.form.permissions = checked ? [...this.form.permissions, id] : this.form.permissions.filter(p => p !== id); }

  save() {
    if (this.saving || !this.form.name) return;
    this.saving = true; this.formError = '';
    const body = { name: this.form.name, description: this.form.description, permissions: this.form.permissions };
    const req = this.form.id ? this.api.put<any>(`staff-roles/${this.form.id}`, body) : this.api.post<any>('staff-roles', body);
    req.subscribe({
      next: () => { this.saving = false; this.showModal = false; this.messages.add({ severity: 'success', summary: 'Guardado', detail: 'Rol guardado correctamente.' }); this.load(); this.loadStats(); },
      error: (err: any) => { this.saving = false; this.formError = err?.error?.message || 'No se pudo guardar.'; this.cdr.detectChanges(); }
    });
  }

  confirmDelete(r: any) {
    this.confirmation.confirm({
      header: 'Confirmar eliminacion', message: `Deseas eliminar el rol "${r.name}"?`, icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Eliminar', rejectLabel: 'Cancelar', acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.api.delete(`staff-roles/${r.id}`).subscribe({
        next: () => { this.messages.add({ severity: 'success', summary: 'Eliminado', detail: `Rol "${r.name}" eliminado.` }); this.load(); this.loadStats(); },
        error: (err: any) => this.messages.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'No se pudo eliminar.' })
      })
    });
  }
}
