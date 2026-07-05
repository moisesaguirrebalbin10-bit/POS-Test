import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { forkJoin } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { ConfirmationService, MessageService } from 'primeng/api';
import { DialogModule } from 'primeng/dialog';
import { ImageModule } from 'primeng/image';
import { ApiService } from '../core/api.service';
import { VoucherPdfService } from '../core/voucher-pdf.service';
import { PdfPreviewDialogComponent } from '../shared/pdf-preview-dialog.component';

type Column = { key: string; label: string; type?: 'text' | 'money' | 'date' | 'status' | 'image' | 'count' };
type Field = { key: string; label: string; type?: 'text' | 'number' | 'password' | 'checkbox' | 'image' | 'permissions' | 'select' | 'multiselect' | 'date' | 'textarea'; required?: boolean; options?: { value: string; label: string }[] };
type PermissionOption = { id: number; key: string; module: string; label: string };

@Component({
  selector: 'app-crud-page',
  standalone: true,
  imports: [FormsModule, CurrencyPipe, DatePipe, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, MatDatepickerModule, MatNativeDateModule, DialogModule, ImageModule, PdfPreviewDialogComponent],
  template: `
  <section class="admin-page">
    <header class="admin-head">
      <div><span class="eyebrow">Administracion</span><h1>{{title}}</h1><p>{{subtitle}}</p></div>
      @if (endpoint !== 'sales') { <button mat-flat-button class="primary-action" (click)="single ? openEdit(rows[0]) : openCreate()"><mat-icon>{{single ? 'edit' : 'add'}}</mat-icon>{{single ? 'Editar' : 'Nuevo'}}</button> }
    </header>

    <div class="admin-panel">
      <div class="admin-toolbar">
        <mat-form-field appearance="outline" class="admin-search"><mat-label>Buscar</mat-label><mat-icon matPrefix>search</mat-icon><input matInput [(ngModel)]="search" (ngModelChange)="onSearchInput()" (keyup.enter)="load()"></mat-form-field>
        <button mat-flat-button class="filter-action" (click)="load()" [disabled]="loading"><mat-icon>refresh</mat-icon>{{loading ? 'Cargando' : 'Actualizar'}}</button>
      </div>

      @if (loading) { <div class="loading-state"><mat-icon>hourglass_empty</mat-icon><p>Cargando informacion...</p></div> }
      @else if (endpoint === 'products') {
        <div class="inventory-grid">
          @for (row of rows; track row.id) {
            <article class="inventory-card">
              <p-image [src]="imageUrl(row.image_path)" [alt]="row.name" [preview]="true" imageClass="product-preview-img" />
              <div class="inventory-body">
                <span class="product-category">{{row.category?.name || 'Producto'}}</span><h2>{{row.name}}</h2><p>{{row.sku}}</p>
                <div class="inventory-metrics"><span><small>Precio</small><b>{{number(row.sale_price) | currency:'PEN':'S/ '}}</b></span><span><small>Stock</small><b>{{number(row.stock)}}</b></span><span><small>Minimo</small><b>{{number(row.min_stock)}}</b></span></div>
                <div class="row-actions"><span class="status-chip" [class.off]="!row.active">{{row.active ? 'Activo' : 'Inactivo'}}</span><span><button mat-icon-button (click)="openEdit(row)"><mat-icon>edit</mat-icon></button><button mat-icon-button (click)="openDelete(row)"><mat-icon>delete</mat-icon></button></span></div>
              </div>
            </article>
          }
        </div>
      } @else if (single) {
        <div class="settings-grid">
          @for (col of columns; track col.key) { <article class="setting-card"><span>{{col.label}}</span><strong>{{display(rows[0], col)}}</strong></article> }
        </div>
      } @else {
        <div class="data-table">
          <div class="data-row table-head" [style.--cols]="columns.length">@for (col of columns; track col.key) { <span>{{col.label}}</span> }<span>Acciones</span></div>
          @for (row of rows; track row.id || row.name || row.voucher_number || $index) {
            <div class="data-row" [style.--cols]="columns.length">
              @for (col of columns; track col.key) {
                <span [class.money-cell]="col.type === 'money'">
                  @if (col.type === 'status') { <b class="status-chip" [class.off]="!value(row, col.key)">{{value(row, col.key) ? 'Activo' : 'Inactivo'}}</b> }
                  @else if (col.type === 'money') { <b>{{number(value(row, col.key)) | currency:'PEN':'S/ '}}</b> }
                  @else if (col.type === 'date') { {{value(row, col.key) | date:'dd/MM/yyyy HH:mm'}} }
                  @else if (col.type === 'count') { {{count(value(row, col.key))}} }
                  @else { {{display(row, col)}} }
                </span>
              }
              <span class="table-actions">
                @if (endpoint === 'sales') {
                  <button mat-icon-button title="Ver comprobante" (click)="previewVoucher(row)"><mat-icon>visibility</mat-icon></button>
                  <span class="readonly-chip">Automatico</span>
                } @else if (row.editable !== false) {
                  <button mat-icon-button (click)="openEdit(row)"><mat-icon>edit</mat-icon></button><button mat-icon-button (click)="openDelete(row)"><mat-icon>delete</mat-icon></button>
                } @else {
                  <span class="readonly-chip">Automatico</span>
                }
              </span>
            </div>
          }
        </div>
      }

      @if (!loading && !rows.length) { <div class="empty-state"><mat-icon>inbox</mat-icon><p>No hay registros para mostrar.</p></div> }
      @if (error) { <div class="error-state"><mat-icon>error_outline</mat-icon><p>{{error}}</p></div> }
    </div>

    <p-dialog [(visible)]="modalOpen" [modal]="true" [dismissableMask]="true" [style]="{ width: 'min(760px, 94vw)' }" [contentStyle]="{ 'max-height': '72vh', overflow: 'auto' }">
      <ng-template pTemplate="header"><div class="dialog-title"><h2>{{modalMode === 'create' ? 'Nuevo' : 'Editar'}} {{title}}</h2></div></ng-template>
      <div class="modal-grid">
        @for (field of modalFields; track field.key) {
          @if (field.type === 'image') {
            <div class="image-field">
              <span>{{field.label}}</span>
              <button type="button" class="image-dropzone" [class.uploading]="uploadingImage" (click)="fileInput.click()" (dragover)="onImageDragOver($event)" (drop)="onImageDrop($event)">
                @if (modalModel[field.key]) { <p-image [src]="imageUrl(modalModel[field.key])" alt="Imagen del producto" [preview]="true" imageClass="dropzone-preview-img" /> }
                @else { <mat-icon>cloud_upload</mat-icon> }
                <strong>{{uploadingImage ? 'Subiendo imagen...' : 'Seleccionar o arrastrar imagen'}}</strong>
                <small>JPG, PNG o WEBP hasta 4MB</small>
              </button>
              <input #fileInput type="file" accept="image/png,image/jpeg,image/webp" hidden (change)="onImageSelected($event)">
              <code>{{modalModel[field.key] || 'Sin imagen seleccionada'}}</code>
            </div>
          } @else if (field.type === 'permissions') {
            <div class="permissions-field">
              <div class="permissions-head"><span>{{field.label}}</span><strong>{{selectedPermissionCount()}} seleccionados</strong></div>
              @for (group of permissionGroups(); track group.module) {
                <section class="permission-module">
                  <button type="button" class="permission-module-head" (click)="togglePermissionModule(group.module)">
                    <span>{{group.module}}</span>
                    <small>{{selectedPermissionCount(group.items)}} / {{group.items.length}}</small>
                    <mat-icon>{{isPermissionModuleOpen(group.module) ? 'expand_less' : 'expand_more'}}</mat-icon>
                  </button>
                  @if (isPermissionModuleOpen(group.module)) {
                    <div class="permission-list">
                      @for (permission of group.items; track permission.id) {
                        <label class="permission-check">
                          <input type="checkbox" [checked]="hasPermission(permission.id)" (change)="togglePermission(permission.id, $any($event.target).checked)">
                          <span><b>{{permission.label}}</b><small>{{permission.key}}</small></span>
                        </label>
                      }
                    </div>
                  }
                </section>
              }
            </div>
          } @else if (field.type === 'select' && field.key === 'category_id') {
            <div class="category-field">
              <mat-form-field appearance="outline"><mat-label>{{field.label}}</mat-label><select matNativeControl [(ngModel)]="modalModel[field.key]">@for (option of field.options || []; track option.value) { <option [value]="option.value">{{option.label}}</option> }</select></mat-form-field>
              @if (!showNewCategory) {
                <button type="button" mat-button class="add-category-btn" (click)="showNewCategory = true"><mat-icon>add</mat-icon>Nueva categoria</button>
              } @else {
                <div class="inline-create-form">
                  <input placeholder="Nombre de categoria" [(ngModel)]="newCategoryName" (keyup.enter)="createCategory()">
                  <button type="button" mat-icon-button [disabled]="creatingCategory || !newCategoryName.trim()" (click)="createCategory()"><mat-icon>check</mat-icon></button>
                  <button type="button" mat-icon-button (click)="cancelNewCategory()"><mat-icon>close</mat-icon></button>
                </div>
              }
            </div>
          } @else if (field.type === 'select') {
            <mat-form-field appearance="outline"><mat-label>{{field.label}}</mat-label><select matNativeControl [(ngModel)]="modalModel[field.key]">@for (option of field.options || []; track option.value) { <option [value]="option.value">{{option.label}}</option> }</select></mat-form-field>
          } @else if (field.type === 'multiselect') {
            <div class="multiselect-field">
              <span>{{field.label}}</span>
              <div class="multiselect-options">
                @for (option of field.options || []; track option.value) {
                  <label class="permission-check">
                    <input type="checkbox" [checked]="hasOption(field.key, option.value)" (change)="toggleOption(field.key, option.value, $any($event.target).checked)">
                    <span>{{option.label}}</span>
                  </label>
                }
                @if (!(field.options || []).length) { <small>No hay opciones disponibles.</small> }
              </div>
            </div>
          } @else if (field.type === 'textarea') {
            <mat-form-field appearance="outline"><mat-label>{{field.label}}</mat-label><textarea matInput rows="3" [(ngModel)]="modalModel[field.key]"></textarea></mat-form-field>
          } @else if (field.type === 'date') {
            <mat-form-field appearance="outline"><mat-label>{{field.label}}</mat-label><input matInput [matDatepicker]="picker" [(ngModel)]="modalModel[field.key]"><mat-datepicker-toggle matIconSuffix [for]="picker"></mat-datepicker-toggle><mat-datepicker #picker></mat-datepicker></mat-form-field>
          } @else if (field.type === 'checkbox') { <label class="check-field"><input type="checkbox" [(ngModel)]="modalModel[field.key]"> {{field.label}}</label> }
          @else { <mat-form-field appearance="outline"><mat-label>{{field.label}}</mat-label><input matInput [type]="field.type || 'text'" [(ngModel)]="modalModel[field.key]"></mat-form-field> }
        }
      </div>
      <ng-template pTemplate="footer"><div class="modal-actions"><button mat-stroked-button (click)="closeModal()">Cancelar</button><button mat-flat-button class="primary-action" (click)="saveModal()"><mat-icon>save</mat-icon>Guardar</button></div></ng-template>
    </p-dialog>

    <app-pdf-preview-dialog [visible]="pdfPreviewVisible" [pdfUrl]="pdfPreviewUrl" [title]="pdfPreviewTitle" (visibleChange)="pdfPreviewVisible = $event" (closed)="onPdfPreviewClosed()" />
  </section>`
})
export class CrudPageComponent implements OnInit {
  route = inject(ActivatedRoute); api = inject(ApiService); cdr = inject(ChangeDetectorRef); messages = inject(MessageService); confirmation = inject(ConfirmationService);
  voucherPdf = inject(VoucherPdfService);
  pdfPreviewVisible = false; pdfPreviewUrl: string | null = null; pdfPreviewTitle = '';
  title = ''; subtitle = ''; endpoint = ''; single = false; rows: any[] = []; search = ''; columns: Column[] = []; loading = false; error = '';
  availablePermissions: PermissionOption[] = []; openPermissionModules = new Set<string>();
  categoryOptions: { value: string; label: string }[] = []; warehouseOptions: { value: string; label: string }[] = []; private lookupsLoaded = false;
  roleOptions: { value: string; label: string }[] = []; private userLookupsLoaded = false;
  modalOpen = false; modalMode: 'create' | 'edit' = 'create'; modalModel: any = {}; modalFields: Field[] = []; uploadingImage = false;
  showNewCategory = false; newCategoryName = ''; creatingCategory = false;
  private requestId = 0;
  private searchTimer: ReturnType<typeof setTimeout> | undefined;

  ngOnInit() { this.route.data.subscribe(d => { this.title = d['title']; this.endpoint = d['endpoint']; this.single = !!d['single']; this.columns = this.columnsFor(this.endpoint); this.subtitle = this.subtitleFor(this.endpoint); this.search = ''; this.rows = []; this.load(); if (this.endpoint === 'products') this.loadProductLookups(); if (this.endpoint === 'users') this.loadUserLookups(); }); }
  loadProductLookups(after?: () => void) {
    if (this.lookupsLoaded) { after?.(); return; }
    forkJoin({ categories: this.api.get<any[]>('categories'), warehouses: this.api.get<any[]>('warehouses') }).subscribe(({ categories, warehouses }) => {
      this.categoryOptions = (categories || []).map((c: any) => ({ value: String(c.id), label: c.name }));
      this.warehouseOptions = (warehouses || []).map((w: any) => ({ value: String(w.id), label: w.name }));
      this.lookupsLoaded = true;
      after?.();
    });
  }
  loadUserLookups(after?: () => void) {
    if (this.userLookupsLoaded) { after?.(); return; }
    this.api.get<any>('roles').subscribe((res: any) => {
      this.roleOptions = (res?.roles || []).map((r: any) => ({ value: String(r.id), label: r.name }));
      this.userLookupsLoaded = true;
      after?.();
    });
  }

  onSearchInput() { clearTimeout(this.searchTimer); this.searchTimer = setTimeout(() => this.load(), 350); }

  load() { const id = ++this.requestId; const endpoint = this.endpoint; this.loading = true; this.error = ''; this.rows = []; this.cdr.detectChanges(); this.api.get<any>(endpoint, this.search ? { search: this.search } : {}).subscribe({ next: (res: any) => { if (id !== this.requestId || endpoint !== this.endpoint) return; this.rows = this.normalizeRows(res); this.loading = false; this.cdr.detectChanges(); }, error: (err: any) => { if (id !== this.requestId) return; this.loading = false; this.rows = []; this.error = err?.error?.message || 'No se pudo cargar la informacion del modulo.'; this.messages.add({ severity: 'error', summary: 'Error', detail: this.error }); this.cdr.detectChanges(); } }); }
  normalizeRows(res: any): any[] { if (this.endpoint === 'roles' && Array.isArray(res?.permissions)) { this.availablePermissions = res.permissions; this.openPermissionModules = new Set(this.availablePermissions.slice(0, 2).map(p => p.module)); } if (this.single) return res ? [res] : []; if (Array.isArray(res)) return res; if (Array.isArray(res?.data)) return res.data; if (Array.isArray(res?.roles)) return res.roles; return []; }

  openCreate() {
    if (this.endpoint === 'sales') return;
    if (this.endpoint === 'products' && !this.lookupsLoaded) { this.loadProductLookups(() => this.openCreate()); return; }
    if (this.endpoint === 'users' && !this.userLookupsLoaded) { this.loadUserLookups(() => this.openCreate()); return; }
    this.cancelNewCategory();
    this.modalMode = 'create'; this.modalFields = this.fieldsFor(this.endpoint, true); this.modalModel = this.defaultsFor(this.endpoint); if (this.endpoint === 'roles') this.modalModel.permissions = []; if (this.endpoint === 'users') this.modalModel.roles = []; this.modalOpen = true;
  }
  openEdit(row: any) {
    if (!row || row.editable === false || this.endpoint === 'sales') { if (row?.editable === false || this.endpoint === 'sales') this.messages.add({ severity: 'info', summary: 'Movimiento automatico', detail: 'Las ventas se registran desde el modulo POS.' }); return; }
    if (this.endpoint === 'products' && !this.lookupsLoaded) { this.loadProductLookups(() => this.openEdit(row)); return; }
    if (this.endpoint === 'users' && !this.userLookupsLoaded) { this.loadUserLookups(() => this.openEdit(row)); return; }
    this.cancelNewCategory();
    this.modalMode = 'edit'; this.modalFields = this.fieldsFor(this.endpoint, false);
    this.modalModel = { ...row, roles: this.endpoint === 'users' ? this.idArrayStr(row.roles) : this.ids(row.roles), permissions: this.endpoint === 'roles' ? this.idArray(row.permissions) : this.ids(row.permissions) };
    if (this.endpoint === 'products') { this.modalModel.category_id = String(row.category_id ?? row.category?.id ?? ''); this.modalModel.warehouse_id = String(row.warehouse_id ?? row.warehouse?.id ?? ''); }
    for (const field of this.modalFields) { if (field.type === 'date' && this.modalModel[field.key]) this.modalModel[field.key] = this.parseDate(this.modalModel[field.key]); }
    this.modalOpen = true;
  }
  openDelete(row: any) { if (row?.editable === false || this.endpoint === 'sales') { this.messages.add({ severity: 'info', summary: 'Movimiento automatico', detail: 'Las ventas no se eliminan desde este modulo.' }); return; } this.confirmation.confirm({ header: 'Confirmar eliminacion', message: `Deseas eliminar o desactivar ${row?.name || row?.email || 'este registro'}?`, icon: 'pi pi-exclamation-triangle', acceptLabel: 'Eliminar', rejectLabel: 'Cancelar', acceptButtonStyleClass: 'p-button-danger', accept: () => this.confirmDelete(row) }); }
  closeModal() { this.modalOpen = false; this.modalModel = {}; this.cancelNewCategory(); }

  saveModal() { const body = this.payloadFor(this.endpoint, this.modalModel); const req = this.single ? this.api.put<any>(this.endpoint, body) : (this.modalMode === 'create' ? this.api.post<any>(this.endpoint, body) : this.api.put<any>(`${this.endpoint}/${this.modalModel.id}`, body)); req.subscribe({ next: () => { this.messages.add({ severity: 'success', summary: 'Guardado', detail: 'Registro guardado correctamente.' }); this.closeModal(); this.load(); }, error: (err: any) => { this.error = err?.error?.message || 'No se pudo guardar.'; this.messages.add({ severity: 'error', summary: 'Error', detail: this.error }); } }); }
  confirmDelete(row: any) { this.api.delete(`${this.endpoint}/${row.id}`).subscribe({ next: () => { this.messages.add({ severity: 'success', summary: 'Eliminado', detail: 'Registro eliminado o desactivado.' }); this.load(); }, error: (err: any) => { this.error = err?.error?.message || 'No se pudo eliminar.'; this.messages.add({ severity: 'error', summary: 'Error', detail: this.error }); } }); }

  onImageDragOver(event: DragEvent) { event.preventDefault(); }
  onImageDrop(event: DragEvent) { event.preventDefault(); const file = event.dataTransfer?.files?.[0]; if (file) this.uploadProductImage(file); }
  onImageSelected(event: Event) { const input = event.target as HTMLInputElement; const file = input.files?.[0]; if (file) this.uploadProductImage(file); input.value = ''; }
  uploadProductImage(file: File) { if (!file.type.startsWith('image/')) { this.messages.add({ severity: 'warn', summary: 'Imagen invalida', detail: 'Selecciona un archivo de imagen valido.' }); return; } this.uploadingImage = true; this.api.upload<{ path: string }>('products/upload-image', file).subscribe({ next: res => { this.modalModel.image_path = res.path; this.uploadingImage = false; this.messages.add({ severity: 'success', summary: 'Imagen cargada', detail: 'La imagen se cargo correctamente.' }); this.cdr.detectChanges(); }, error: err => { this.uploadingImage = false; const detail = err?.error?.message || 'No se pudo subir la imagen.'; this.messages.add({ severity: 'error', summary: 'Error', detail }); this.cdr.detectChanges(); } }); }

  createCategory() {
    const name = this.newCategoryName.trim();
    if (!name || this.creatingCategory) return;
    this.creatingCategory = true;
    this.api.post<any>('categories', { name, active: true }).subscribe({
      next: (cat: any) => {
        this.categoryOptions = [...this.categoryOptions, { value: String(cat.id), label: cat.name }];
        this.modalModel.category_id = String(cat.id);
        this.creatingCategory = false;
        this.cancelNewCategory();
        this.messages.add({ severity: 'success', summary: 'Categoria creada', detail: `"${cat.name}" agregada correctamente.` });
      },
      error: err => { this.creatingCategory = false; const detail = err?.error?.message || 'No se pudo crear la categoria.'; this.messages.add({ severity: 'error', summary: 'Error', detail }); }
    });
  }
  cancelNewCategory() { this.showNewCategory = false; this.newCategoryName = ''; }

  async previewVoucher(row: any) {
    try {
      this.pdfPreviewUrl = await this.voucherPdf.fetchObjectUrl(row.id, 'customer');
      this.pdfPreviewTitle = `Comprobante ${row.voucher_number || ''}`;
      this.pdfPreviewVisible = true;
      this.cdr.detectChanges();
    } catch (err: any) {
      const detail = err?.status === 401 ? 'Tu sesion expiro. Vuelve a iniciar sesion e intenta de nuevo.' : 'Aun no se genero el PDF de esta venta.';
      this.messages.add({ severity: 'warn', summary: 'Sin comprobante', detail });
    }
  }
  onPdfPreviewClosed() {
    if (this.pdfPreviewUrl) URL.revokeObjectURL(this.pdfPreviewUrl);
    this.pdfPreviewUrl = null;
  }

  fieldsFor(endpoint: string, creating: boolean): Field[] {
    const commonActive: Field = { key: 'active', label: 'Activo', type: 'checkbox' };
    const movementFields: Field[] = [
      { key: 'type', label: 'Tipo', type: 'select', options: [{ value: 'income', label: 'Ingreso manual' }, { value: 'expense', label: 'Egreso / gasto' }] },
      { key: 'category', label: 'Categoria' },
      { key: 'description', label: 'Descripcion', type: 'textarea' },
      { key: 'amount', label: 'Monto', type: 'number' },
      { key: 'date', label: 'Fecha', type: 'date' },
      { key: 'payment_method', label: 'Metodo de pago', type: 'select', options: [{ value: 'cash', label: 'Efectivo' }, { value: 'yape', label: 'Yape' }, { value: 'plin', label: 'Plin' }, { value: 'card', label: 'Tarjeta' }, { value: 'transfer', label: 'Transferencia' }] },
      { key: 'observation', label: 'Observacion', type: 'textarea' },
    ];
    const map: Record<string, Field[]> = {
      users: [{ key: 'name', label: 'Nombre' }, { key: 'email', label: 'Email' }, ...(creating ? [{ key: 'password', label: 'Password', type: 'password' as const }] : [{ key: 'password', label: 'Nuevo password', type: 'password' as const }]), { key: 'roles', label: 'Roles', type: 'multiselect', options: this.roleOptions } as Field, commonActive],
      roles: [{ key: 'name', label: 'Nombre' }, { key: 'description', label: 'Descripcion' }, { key: 'permissions', label: 'Permisos por modulo', type: 'permissions' } as Field, commonActive],
      warehouses: [{ key: 'name', label: 'Nombre' }, { key: 'description', label: 'Descripcion' }, commonActive],
      products: [{ key: 'sku', label: 'SKU' }, { key: 'name', label: 'Nombre' }, { key: 'category_id', label: 'Categoria', type: 'select', options: this.categoryOptions }, { key: 'warehouse_id', label: 'Almacen', type: 'select', options: this.warehouseOptions }, { key: 'sale_price', label: 'Precio venta', type: 'number' }, { key: 'cost', label: 'Costo', type: 'number' }, { key: 'stock', label: 'Stock', type: 'number' }, { key: 'min_stock', label: 'Stock minimo', type: 'number' }, { key: 'image_path', label: 'Imagen del producto', type: 'image' }, commonActive],
      'expenses-income': movementFields,
      'company-settings': [{ key: 'name', label: 'Empresa' }, { key: 'ruc', label: 'RUC' }, { key: 'phone', label: 'Celular' }, { key: 'address', label: 'Direccion' }, { key: 'slogan', label: 'Eslogan' }, { key: 'igv_percent', label: 'IGV %', type: 'number' }, { key: 'default_tip', label: 'Propina default', type: 'number' }, { key: 'voucher_series', label: 'Serie' }, { key: 'voucher_start_number', label: 'Numero inicial', type: 'number' }, { key: 'ticket_width', label: 'Ticket 58/80' }]
    };
    return map[endpoint] || [{ key: 'name', label: 'Nombre' }, commonActive];
  }
  defaultsFor(endpoint: string) {
    if (endpoint === 'products') return { active: true, category_id: this.categoryOptions[0]?.value || '', warehouse_id: this.warehouseOptions[0]?.value || '', stock: 0, min_stock: 0, cost: 0, sale_price: 0 };
    if (endpoint === 'expenses-income') return { type: 'expense', category: 'Gastos operativos', description: '', amount: 0, date: new Date(), payment_method: 'cash', observation: '' };
    return { active: true };
  }
  payloadFor(endpoint: string, model: any) {
    const body: any = { ...model };
    for (const key of Object.keys(body)) { if (body[key] instanceof Date) body[key] = this.formatDateValue(body[key]); }
    delete body.id; delete body.created_at; delete body.updated_at; delete body.deleted_at; delete body.movement_id; delete body.editable; delete body.source; delete body.type_label;
    if (endpoint !== 'expenses-income') { delete body.category; }
    delete body.warehouse;
    if (endpoint === 'users' || endpoint === 'roles') { body.roles = this.csv(body.roles); body.permissions = this.csv(body.permissions); if (!body.password) delete body.password; }
    if (endpoint === 'products') { body.category_id = Number(body.category_id); body.warehouse_id = Number(body.warehouse_id); }
    return body;
  }  ids(rows: any[]) { return Array.isArray(rows) ? rows.map(r => r.id).join(',') : ''; }
  idArray(rows: any[]) { return Array.isArray(rows) ? rows.map(r => Number(r.id)).filter(Boolean) : []; }
  idArrayStr(rows: any[]) { return Array.isArray(rows) ? rows.map(r => String(r.id)) : []; }
  csv(value: any) { if (Array.isArray(value)) return value.map((x: any) => Number(x)).filter(Boolean); if (value === undefined || value === null || value === '') return []; return String(value).split(',').map(x => Number(x.trim())).filter(Boolean); }
  hasOption(key: string, value: string) { return Array.isArray(this.modalModel[key]) && this.modalModel[key].includes(value); }
  toggleOption(key: string, value: string, checked: boolean) { const current: string[] = Array.isArray(this.modalModel[key]) ? this.modalModel[key] : []; this.modalModel[key] = checked ? [...current, value] : current.filter((v: string) => v !== value); }

  permissionGroups() { const groups = new Map<string, PermissionOption[]>(); for (const permission of this.availablePermissions) { const module = permission.module || 'General'; groups.set(module, [...(groups.get(module) || []), permission]); } return Array.from(groups.entries()).map(([module, items]) => ({ module, items })); }
  isPermissionModuleOpen(module: string) { return this.openPermissionModules.has(module); }
  togglePermissionModule(module: string) { this.openPermissionModules.has(module) ? this.openPermissionModules.delete(module) : this.openPermissionModules.add(module); }
  selectedPermissions(): number[] { return Array.isArray(this.modalModel.permissions) ? this.modalModel.permissions.map((id: any) => Number(id)).filter(Boolean) : this.csv(this.modalModel.permissions); }
  hasPermission(id: number) { return this.selectedPermissions().includes(Number(id)); }
  togglePermission(id: number, checked: boolean) { const selected = new Set(this.selectedPermissions()); checked ? selected.add(Number(id)) : selected.delete(Number(id)); this.modalModel.permissions = Array.from(selected); }
  selectedPermissionCount(items?: PermissionOption[]) { const selected = this.selectedPermissions(); return items ? items.filter(item => selected.includes(Number(item.id))).length : selected.length; }
  columnsFor(endpoint: string): Column[] {
    const map: Record<string, Column[]> = {
      users: [{ key: 'name', label: 'Usuario' }, { key: 'email', label: 'Email' }, { key: 'roles', label: 'Roles', type: 'count' }, { key: 'active', label: 'Estado', type: 'status' }],
      roles: [{ key: 'name', label: 'Rol' }, { key: 'description', label: 'Descripcion' }, { key: 'permissions', label: 'Permisos', type: 'count' }, { key: 'active', label: 'Estado', type: 'status' }],
      warehouses: [{ key: 'name', label: 'Almacen' }, { key: 'description', label: 'Descripcion' }, { key: 'products_count', label: 'Productos' }, { key: 'active', label: 'Estado', type: 'status' }],
      sales: [{ key: 'voucher_number', label: 'Comprobante' }, { key: 'customer_name', label: 'Cliente' }, { key: 'payment_method', label: 'Pago' }, { key: 'total', label: 'Total', type: 'money' }, { key: 'created_at', label: 'Fecha', type: 'date' }],
      'expenses-income': [{ key: 'type_label', label: 'Tipo' }, { key: 'source', label: 'Origen' }, { key: 'category', label: 'Categoria' }, { key: 'description', label: 'Descripcion' }, { key: 'payment_method', label: 'Pago' }, { key: 'amount', label: 'Monto', type: 'money' }, { key: 'date', label: 'Fecha', type: 'date' }],
      'company-settings': [{ key: 'name', label: 'Empresa' }, { key: 'ruc', label: 'RUC' }, { key: 'phone', label: 'Celular' }, { key: 'address', label: 'Direccion' }, { key: 'igv_percent', label: 'IGV %' }, { key: 'voucher_series', label: 'Serie' }, { key: 'ticket_width', label: 'Ticket mm' }, { key: 'license_key', label: 'Codigo de licencia (Escritorio)' }]
    };
    return map[endpoint] || [{ key: 'name', label: 'Nombre' }, { key: 'active', label: 'Estado', type: 'status' }];
  }  subtitleFor(endpoint: string) { const map: Record<string, string> = { products: 'Catalogo visual de platos, bebidas, precios y stock.', users: 'Usuarios del sistema y sus roles asignados.', roles: 'Perfiles de acceso y permisos configurados.', warehouses: 'Almacenes activos y disponibilidad general.', sales: 'Historial de ventas y comprobantes generados.', 'expenses-income': 'Ventas automaticas e ingresos/egresos manuales que impactan la caja diaria.', 'company-settings': 'Datos comerciales, IGV y configuracion de comprobantes.' }; return map[endpoint] || 'Gestion del modulo.'; }
  parseDate(value: unknown): Date | null {
    if (!value) return null;
    if (value instanceof Date) return value;
    const raw = String(value).slice(0, 10);
    const parts = raw.split('-').map(Number);
    if (parts.length === 3 && parts.every(Boolean)) return new Date(parts[0], parts[1] - 1, parts[2]);
    const parsed = new Date(String(value));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  formatDateValue(value: Date) { const y = value.getFullYear(); const m = String(value.getMonth() + 1).padStart(2, '0'); const d = String(value.getDate()).padStart(2, '0'); return `${y}-${m}-${d}`; }
  value(row: any, key: string) { return key.split('.').reduce((acc, part) => acc?.[part], row); }
  display(row: any, col: Column) { const value = this.value(row, col.key); if (Array.isArray(value)) return value.map(item => item.name || item.label || item.key).join(', '); if (typeof value === 'boolean') return value ? 'Si' : 'No'; return value ?? '-'; }
  count(value: unknown) { return Array.isArray(value) ? value.length : Number(value || 0); }
  number(value: unknown) { return Number(value || 0); }
  imageUrl(path?: string) { return this.api.assetUrl(path); }
}
