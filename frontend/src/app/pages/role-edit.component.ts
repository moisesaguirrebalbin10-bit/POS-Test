import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MessageService } from 'primeng/api';
import { ApiService } from '../core/api.service';

type PermissionOption = { id: number; key: string; module: string; label: string };
type PermissionGroup = { module: string; items: PermissionOption[] };

const MODULE_ICONS: Record<string, string> = {
  Dashboard: 'dashboard', Usuarios: 'group', Roles: 'admin_panel_settings', Empresa: 'store',
  Almacenes: 'warehouse', Productos: 'inventory_2', Ventas: 'receipt_long', Caja: 'payments',
  'Ingresos/Egresos': 'swap_vert', Reportes: 'bar_chart', Registros: 'history', Equipos: 'print', Mesas: 'table_bar',
  Reservas: 'event_available', Inventario: 'inventory',
};
const MODULE_DESCRIPTIONS: Record<string, string> = {
  Dashboard: 'Acceso a metricas, resumenes y analiticas generales.',
  Usuarios: 'Gestion de cuentas, invitaciones y accesos del equipo.',
  Roles: 'Definicion de perfiles de acceso y permisos.',
  Empresa: 'Configuracion comercial, IGV y datos del negocio.',
  Almacenes: 'Control de stock, insumos y transferencias.',
  Productos: 'Catalogo, precios y disponibilidad.',
  Ventas: 'Historial de ventas y comprobantes generados.',
  Caja: 'Apertura, cierre de caja y arqueo diario.',
  'Ingresos/Egresos': 'Movimientos manuales que afectan el flujo de caja.',
  Reportes: 'Analiticas de ventas, stock y utilidad.',
  Registros: 'Auditoria de acciones realizadas en el sistema.',
  Equipos: 'Configuracion de impresoras y dispositivos.',
  Mesas: 'Mapa de mesas, rondas y pedidos en salon.',
  Reservas: 'Reservas de mesas y notificacion de proximas llegadas.',
  Inventario: 'Insumos, articulos, recetas y kardex de stock (modo Restaurante).',
};

@Component({
  selector: 'app-role-edit',
  standalone: true,
  imports: [FormsModule, RouterLink, MatButtonModule, MatIconModule],
  template: `
  <section class="role-edit-page">
    <div class="role-edit-breadcrumb"><a routerLink="/app/roles">Roles</a><mat-icon>chevron_right</mat-icon><span>{{isEdit ? 'Editar Permisos' : 'Nuevo Rol'}}</span></div>

    <header class="role-edit-header">
      <h1>Configuracion de Rol</h1>
      <div class="role-edit-header-actions">
        <button mat-stroked-button (click)="cancel()">Cancelar</button>
        <button mat-flat-button class="primary-action" [disabled]="saving || !name.trim()" (click)="save()"><mat-icon>save</mat-icon>Guardar Cambios</button>
      </div>
    </header>

    <div class="role-edit-fields">
      <div class="report-field"><label>Nombre del Rol</label><input class="date-input" [(ngModel)]="name" placeholder="Ej. Gerente de Piso"></div>
      <div class="report-field"><label>Descripcion</label><input class="date-input" [(ngModel)]="description" placeholder="Responsable de la operacion diaria..."></div>
    </div>

    <div class="role-edit-layout">
      <aside class="role-edit-sidebar">
        <div class="role-status-card" [class.inactive]="!active">
          <span class="role-status-label">Estado</span>
          <strong>{{active ? 'Configuracion Activa' : 'Rol Suspendido'}}</strong>
          <span class="role-status-sub"><span class="live-dot"></span>Sincronizado en tiempo real</span>
          <button type="button" class="role-status-toggle" (click)="active = !active">{{active ? 'Suspender rol' : 'Activar rol'}}</button>
        </div>
        <div class="role-summary-card">
          <h4>Resumen de Permisos</h4>
          <div class="role-summary-row"><span>Modulos habilitados</span><b>{{modulesEnabledCount()}}/{{permissionGroups().length}}</b></div>
          <div class="role-summary-row"><span>Permisos totales</span><b>{{selectedPermissions.length}}</b></div>
        </div>
      </aside>

      <div class="role-edit-modules">
        @for (group of permissionGroups(); track group.module) {
          <article class="role-module-card">
            <button type="button" class="role-module-head" (click)="toggleModuleOpen(group.module)">
              <span class="role-module-icon"><mat-icon>{{moduleIcon(group.module)}}</mat-icon></span>
              <span class="role-module-text"><b>{{group.module}}</b><small>{{moduleDescription(group.module)}}</small></span>
              <span class="role-module-count">{{moduleSelectedCount(group)}}/{{group.items.length}}</span>
              <mat-icon class="role-module-chevron">{{isModuleOpen(group.module) ? 'expand_less' : 'expand_more'}}</mat-icon>
            </button>
            @if (isModuleOpen(group.module)) {
              <div class="role-permission-grid">
                @for (perm of group.items; track perm.id) {
                  <button type="button" class="role-permission-toggle" [class.checked]="hasPermission(perm.id)" (click)="togglePermission(perm.id)">
                    <span class="role-permission-check"><mat-icon>{{hasPermission(perm.id) ? 'check_box' : 'check_box_outline_blank'}}</mat-icon></span>
                    <span><b>{{perm.label}}</b></span>
                  </button>
                }
              </div>
            }
          </article>
        }
        @if (!permissionGroups().length) { <div class="empty-state"><mat-icon>shield</mat-icon><p>Cargando catalogo de permisos...</p></div> }
      </div>
    </div>

    <footer class="role-edit-footer">
      <span>
        @if (role?.updater) { Ultima edicion {{timeAgo(role.updated_at)}} por: {{role.updater.name}} }
        @else if (isEdit) { Aun no registra ediciones. }
        @else { Se registrara al guardar. }
      </span>
      @if (role) { <span>ID de referencia: ROLE_{{role.id}}</span> }
    </footer>
  </section>`
})
export class RoleEditComponent implements OnInit {
  route = inject(ActivatedRoute); router = inject(Router); api = inject(ApiService);
  messages = inject(MessageService); cdr = inject(ChangeDetectorRef);

  isEdit = false; roleId: number | null = null; role: any = null;
  name = ''; description = ''; active = true; saving = false;
  availablePermissions: PermissionOption[] = [];
  selectedPermissions: number[] = [];
  openModules = new Set<string>();

  ngOnInit() {
    const idParam = this.route.snapshot.paramMap.get('id');
    this.isEdit = !!idParam;
    this.roleId = idParam ? Number(idParam) : null;

    this.api.get<any>('roles').subscribe(res => {
      this.availablePermissions = res?.permissions || [];
      this.openModules = new Set(this.permissionGroups().slice(0, 2).map(g => g.module));
      this.cdr.detectChanges();
    });

    if (this.isEdit && this.roleId) {
      this.api.get<any>(`roles/${this.roleId}`).subscribe(role => {
        this.role = role;
        this.name = role.name; this.description = role.description || ''; this.active = !!role.active;
        this.selectedPermissions = (role.permissions || []).map((p: any) => p.id);
        this.cdr.detectChanges();
      });
    }
  }

  permissionGroups(): PermissionGroup[] {
    const groups = new Map<string, PermissionOption[]>();
    for (const p of this.availablePermissions) groups.set(p.module, [...(groups.get(p.module) || []), p]);
    return Array.from(groups.entries()).map(([module, items]) => ({ module, items }));
  }
  moduleIcon(module: string) { return MODULE_ICONS[module] || 'extension'; }
  moduleDescription(module: string) { return MODULE_DESCRIPTIONS[module] || 'Permisos del modulo.'; }
  moduleSelectedCount(group: PermissionGroup) { return group.items.filter(p => this.hasPermission(p.id)).length; }
  modulesEnabledCount() { return this.permissionGroups().filter(g => this.moduleSelectedCount(g) > 0).length; }
  isModuleOpen(module: string) { return this.openModules.has(module); }
  toggleModuleOpen(module: string) { this.openModules.has(module) ? this.openModules.delete(module) : this.openModules.add(module); }
  hasPermission(id: number) { return this.selectedPermissions.includes(id); }
  togglePermission(id: number) {
    this.selectedPermissions = this.hasPermission(id) ? this.selectedPermissions.filter(x => x !== id) : [...this.selectedPermissions, id];
  }

  timeAgo(date: string): string {
    const seconds = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 1000));
    if (seconds < 60) return 'hace un momento';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `hace ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `hace ${hours} hora${hours === 1 ? '' : 's'}`;
    const days = Math.floor(hours / 24);
    return `hace ${days} dia${days === 1 ? '' : 's'}`;
  }

  cancel() { this.router.navigateByUrl('/app/roles'); }

  save() {
    const name = this.name.trim();
    if (!name || this.saving) return;
    this.saving = true;
    const body = { name, description: this.description || null, active: this.active, permissions: this.selectedPermissions };
    const req = this.isEdit ? this.api.put<any>(`roles/${this.roleId}`, body) : this.api.post<any>('roles', body);
    req.subscribe({
      next: () => { this.saving = false; this.messages.add({ severity: 'success', summary: 'Guardado', detail: `Rol "${name}" guardado correctamente.` }); this.router.navigateByUrl('/app/roles'); },
      error: (err: any) => { this.saving = false; this.messages.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'No se pudo guardar el rol.' }); }
    });
  }
}
