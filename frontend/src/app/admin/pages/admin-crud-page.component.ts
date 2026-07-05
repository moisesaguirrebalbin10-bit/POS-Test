import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ConfirmationService, MessageService } from 'primeng/api';
import { DialogModule } from 'primeng/dialog';
import { AdminApiService } from '../core/admin-api.service';

type Column = { key: string; label: string; type?: 'status' | 'count' };
type Field = { key: string; label: string; type?: 'text' | 'password' | 'checkbox' | 'multiselect' | 'permissions'; options?: { value: string; label: string }[] };
type PermissionOption = { id: number; key: string; module: string; label: string };

@Component({
  selector: 'app-admin-crud-page', standalone: true,
  imports: [FormsModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, DialogModule],
  template: `
  <section class="admin-page">
    <header class="admin-head">
      <div><span class="eyebrow">Panel Administrativo</span><h1>{{title}}</h1><p>{{subtitle}}</p></div>
      <button mat-flat-button class="primary-action" (click)="openCreate()"><mat-icon>add</mat-icon>Nuevo</button>
    </header>

    <div class="admin-panel">
      @if (loading) { <div class="loading-state"><mat-icon>hourglass_empty</mat-icon><p>Cargando...</p></div> }
      @else {
        <div class="data-table">
          <div class="data-row table-head" [style.--cols]="columns.length">@for (col of columns; track col.key) { <span>{{col.label}}</span> }<span>Acciones</span></div>
          @for (row of rows; track row.id) {
            <div class="data-row" [style.--cols]="columns.length">
              @for (col of columns; track col.key) {
                <span>
                  @if (col.type === 'status') { <b class="status-chip" [class.off]="!value(row, col.key)">{{value(row, col.key) ? 'Activo' : 'Inactivo'}}</b> }
                  @else if (col.type === 'count') { {{count(value(row, col.key))}} }
                  @else { {{value(row, col.key) ?? '-'}} }
                </span>
              }
              <span class="table-actions"><button mat-icon-button (click)="openEdit(row)"><mat-icon>edit</mat-icon></button><button mat-icon-button (click)="confirmDelete(row)"><mat-icon>delete</mat-icon></button></span>
            </div>
          }
        </div>
      }
      @if (!loading && !rows.length) { <div class="empty-state"><mat-icon>inbox</mat-icon><p>No hay registros.</p></div> }
    </div>

    <p-dialog [(visible)]="modalOpen" [modal]="true" [dismissableMask]="true" [style]="{ width: 'min(560px, 94vw)' }">
      <ng-template pTemplate="header"><h2>{{modalMode === 'create' ? 'Nuevo' : 'Editar'}} {{title}}</h2></ng-template>
      <div class="modal-grid">
        @for (field of fields; track field.key) {
          @if (field.type === 'checkbox') { <label class="check-field"><input type="checkbox" [(ngModel)]="modalModel[field.key]"> {{field.label}}</label> }
          @else if (field.type === 'multiselect' || field.type === 'permissions') {
            <div class="multiselect-field">
              <span>{{field.label}}</span>
              <div class="multiselect-options">
                @for (option of field.options || []; track option.value) {
                  <label class="permission-check">
                    <input type="checkbox" [checked]="hasOption(field.key, option.value)" (change)="toggleOption(field.key, option.value, $any($event.target).checked)">
                    <span>{{option.label}}</span>
                  </label>
                }
              </div>
            </div>
          }
          @else { <mat-form-field appearance="outline"><mat-label>{{field.label}}</mat-label><input matInput [type]="field.type || 'text'" [(ngModel)]="modalModel[field.key]"></mat-form-field> }
        }
      </div>
      <ng-template pTemplate="footer"><div class="modal-actions"><button mat-stroked-button (click)="modalOpen = false">Cancelar</button><button mat-flat-button class="primary-action" (click)="save()"><mat-icon>save</mat-icon>Guardar</button></div></ng-template>
    </p-dialog>
  </section>`
})
export class AdminCrudPageComponent implements OnInit {
  route = inject(ActivatedRoute); api = inject(AdminApiService); cdr = inject(ChangeDetectorRef); messages = inject(MessageService); confirmation = inject(ConfirmationService);
  title = ''; subtitle = ''; endpoint = ''; rows: any[] = []; loading = false; columns: Column[] = []; fields: Field[] = [];
  availablePermissions: PermissionOption[] = []; roleOptions: { value: string; label: string }[] = [];
  modalOpen = false; modalMode: 'create' | 'edit' = 'create'; modalModel: any = {};

  ngOnInit() {
    this.route.data.subscribe(d => {
      this.title = d['title']; this.endpoint = d['endpoint'];
      this.columns = this.endpoint === 'staff'
        ? [{ key: 'name', label: 'Nombre' }, { key: 'email', label: 'Email' }, { key: 'roles', label: 'Roles', type: 'count' }, { key: 'active', label: 'Estado', type: 'status' }]
        : [{ key: 'name', label: 'Rol' }, { key: 'description', label: 'Descripcion' }, { key: 'permissions', label: 'Permisos', type: 'count' }];
      this.subtitle = this.endpoint === 'staff' ? 'Empleados propios con acceso al panel administrativo.' : 'Roles y permisos para el staff del panel.';
      this.load();
    });
  }

  load() {
    this.loading = true; this.cdr.detectChanges();
    if (this.endpoint === 'staff-roles') {
      this.api.get<any>('staff-roles').subscribe(res => {
        this.availablePermissions = res.permissions;
        this.rows = res.roles;
        this.loading = false; this.cdr.detectChanges();
      });
    } else {
      this.api.get<any>('staff-roles').subscribe(res => {
        this.roleOptions = (res.roles || []).map((r: any) => ({ value: String(r.id), label: r.name }));
        this.api.get<any>('staff').subscribe(res2 => {
          this.rows = res2.data;
          this.loading = false; this.cdr.detectChanges();
        });
      });
    }
  }

  fieldsFor(): Field[] {
    if (this.endpoint === 'staff') {
      return [
        { key: 'name', label: 'Nombre' }, { key: 'email', label: 'Email' },
        { key: 'password', label: this.modalMode === 'create' ? 'Password' : 'Nuevo password', type: 'password' },
        { key: 'roles', label: 'Roles', type: 'multiselect', options: this.roleOptions },
        { key: 'active', label: 'Activo', type: 'checkbox' },
      ];
    }
    return [
      { key: 'name', label: 'Nombre' }, { key: 'description', label: 'Descripcion' },
      { key: 'permissions', label: 'Permisos', type: 'permissions', options: this.availablePermissions.map(p => ({ value: String(p.id), label: `${p.label} (${p.module})` })) },
    ];
  }

  openCreate() {
    this.modalMode = 'create'; this.fields = this.fieldsFor();
    this.modalModel = this.endpoint === 'staff' ? { active: true, roles: [] } : { permissions: [] };
    this.modalOpen = true;
  }

  openEdit(row: any) {
    this.modalMode = 'edit'; this.fields = this.fieldsFor();
    if (this.endpoint === 'staff') {
      this.modalModel = { ...row, roles: (row.roles || []).map((r: any) => String(r.id)), password: '' };
    } else {
      this.modalModel = { ...row, permissions: (row.permissions || []).map((p: any) => String(p.id)) };
    }
    this.modalOpen = true;
  }

  save() {
    const body: any = { ...this.modalModel };
    const id = body.id;
    delete body.id; delete body.created_at; delete body.updated_at;
    if (this.endpoint === 'staff' && !body.password) delete body.password;
    const req = id ? this.api.put<any>(`${this.endpoint}/${id}`, body) : this.api.post<any>(this.endpoint, body);
    req.subscribe({
      next: () => { this.messages.add({ severity: 'success', summary: 'Guardado', detail: 'Registro guardado correctamente.' }); this.modalOpen = false; this.load(); },
      error: (err: any) => this.messages.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'No se pudo guardar.' })
    });
  }

  confirmDelete(row: any) {
    this.confirmation.confirm({
      header: 'Confirmar eliminacion', message: `Deseas eliminar ${row.name}?`, icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Eliminar', rejectLabel: 'Cancelar', acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.api.delete(`${this.endpoint}/${row.id}`).subscribe({
        next: () => { this.messages.add({ severity: 'success', summary: 'Eliminado', detail: 'Registro eliminado.' }); this.load(); },
        error: (err: any) => this.messages.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'No se pudo eliminar.' })
      })
    });
  }

  hasOption(key: string, value: string) { return Array.isArray(this.modalModel[key]) && this.modalModel[key].includes(value); }
  toggleOption(key: string, value: string, checked: boolean) {
    const current: string[] = Array.isArray(this.modalModel[key]) ? this.modalModel[key] : [];
    this.modalModel[key] = checked ? [...current, value] : current.filter((v: string) => v !== value);
  }

  value(row: any, key: string) { return row?.[key]; }
  count(value: unknown) { return Array.isArray(value) ? value.length : 0; }
}
