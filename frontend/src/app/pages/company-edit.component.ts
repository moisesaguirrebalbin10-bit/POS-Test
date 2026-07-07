import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { ImageModule } from 'primeng/image';
import { MessageService } from 'primeng/api';
import { ApiService } from '../core/api.service';
import { BrandingService } from '../core/branding.service';

@Component({
  selector: 'app-company-edit',
  standalone: true,
  imports: [FormsModule, RouterLink, MatButtonModule, MatIconModule, MatSelectModule, ImageModule],
  template: `
  <section class="role-edit-page">
    <div class="role-edit-breadcrumb"><a routerLink="/app/company">Configuracion</a><mat-icon>chevron_right</mat-icon><span>Empresa</span></div>

    <header class="role-edit-header">
      <div><h1>Configuracion de Empresa</h1><p class="company-edit-subtitle">Administra la identidad comercial, impuestos y parametros de facturacion de tu negocio.</p></div>
      <div class="role-edit-header-actions">
        <button mat-stroked-button (click)="cancel()">Cancelar</button>
        <button mat-flat-button class="primary-action" [disabled]="saving || !model.name?.trim()" (click)="save()"><mat-icon>save</mat-icon>Guardar Cambios</button>
      </div>
    </header>

    <div class="company-edit-panel">
      <h3><mat-icon>store</mat-icon>Informacion General</h3>
      <div class="company-edit-general-grid">
        <div class="company-edit-fields">
          <div class="role-edit-fields no-border">
            <div class="report-field"><label>Empresa</label><input class="date-input" [(ngModel)]="model.name"></div>
            <div class="report-field"><label>RUC</label><input class="date-input" [(ngModel)]="model.ruc"></div>
          </div>
          <div class="role-edit-fields no-border">
            <div class="report-field"><label>Celular</label><input class="date-input" [(ngModel)]="model.phone"></div>
            <div class="report-field"><label>Direccion</label><input class="date-input" [(ngModel)]="model.address"></div>
          </div>
          <div class="report-field"><label>Eslogan / Mensaje de Bienvenida</label><input class="date-input" [(ngModel)]="model.slogan" placeholder="Gracias por su preferencia"></div>
        </div>
        <div class="image-field company-edit-logo">
          <span>Logo de la Empresa</span>
          <button type="button" class="image-dropzone" [class.uploading]="uploadingLogo" (click)="fileInput.click()" (dragover)="onDragOver($event)" (drop)="onDrop($event)">
            @if (model.logo_path) { <p-image [src]="logoUrl()" alt="Logo" [preview]="true" imageClass="dropzone-preview-img" /> }
            @else { <mat-icon>cloud_upload</mat-icon> }
            <strong>{{uploadingLogo ? 'Subiendo...' : 'Click para subir'}}</strong>
            <small>Recomendado: 512x512px PNG/SVG</small>
          </button>
          <input #fileInput type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" hidden (change)="onSelected($event)">
        </div>
      </div>
    </div>

    <div class="company-edit-two-col">
      <div class="company-edit-panel">
        <h3><mat-icon>tune</mat-icon>Reglas Operativas</h3>
        <div class="report-field"><label>Modo del Sistema</label>
          <select class="date-preset-select company-edit-select" [(ngModel)]="model.business_type">
            <option value="market">Mercado</option>
            <option value="restaurant">Restaurante</option>
          </select>
        </div>
        <div class="role-edit-fields no-border">
          <div class="report-field"><label>IGV %</label><input class="date-input" type="number" min="0" [(ngModel)]="model.igv_percent"></div>
          <div class="report-field"><label>Propina Default</label><input class="date-input" type="number" min="0" [(ngModel)]="model.default_tip"></div>
        </div>
      </div>

      <div class="company-edit-panel">
        <h3><mat-icon>receipt</mat-icon>Configuracion de Comprobantes</h3>
        <div class="role-edit-fields no-border">
          <div class="report-field"><label>Serie de Facturacion</label><input class="date-input" [(ngModel)]="model.voucher_series"></div>
          <div class="report-field"><label>Numero Inicial</label><input class="date-input" type="number" min="1" [(ngModel)]="model.voucher_start_number"></div>
        </div>
        <div class="report-field">
          <label>Ancho de Ticket (mm)</label>
          <div class="segmented-control">
            <button type="button" [class.active]="model.ticket_width === '58'" (click)="model.ticket_width = '58'">58 mm</button>
            <button type="button" [class.active]="model.ticket_width === '80'" (click)="model.ticket_width = '80'">80 mm</button>
          </div>
        </div>
      </div>
    </div>

    <div class="company-note company-region-card">
      <mat-icon>public</mat-icon>
      <div>
        <strong>Sincronizacion Regional</strong>
        <p>La zona horaria y moneda se usan automaticamente para <b>Lima, Peru</b>. Esto afecta tus reportes de cierre de caja.</p>
        <div class="role-pill-list"><span class="category-pill">UTC -05:00</span><span class="category-pill">Soles (S/)</span></div>
      </div>
    </div>
  </section>`
})
export class CompanyEditComponent implements OnInit {
  api = inject(ApiService); branding = inject(BrandingService); router = inject(Router); messages = inject(MessageService); cdr = inject(ChangeDetectorRef);
  model: any = {};
  uploadingLogo = false;
  saving = false;

  ngOnInit() {
    this.api.get<any>('company-settings').subscribe(s => { this.model = { ...s }; this.cdr.detectChanges(); });
  }

  logoUrl() { return this.api.assetUrl(this.model.logo_path || undefined); }

  onDragOver(event: DragEvent) { event.preventDefault(); }
  onDrop(event: DragEvent) { event.preventDefault(); const file = event.dataTransfer?.files?.[0]; if (file) this.uploadLogo(file); }
  onSelected(event: Event) { const input = event.target as HTMLInputElement; const file = input.files?.[0]; if (file) this.uploadLogo(file); input.value = ''; }

  uploadLogo(file: File) {
    if (!file.type.startsWith('image/')) { this.messages.add({ severity: 'warn', summary: 'Imagen invalida', detail: 'Selecciona un archivo de imagen valido.' }); return; }
    this.uploadingLogo = true;
    this.api.upload<{ path: string }>('company-settings/upload-logo', file).subscribe({
      next: res => { this.model.logo_path = res.path; this.uploadingLogo = false; this.messages.add({ severity: 'success', summary: 'Logo cargado', detail: 'El logo se cargo correctamente.' }); this.cdr.detectChanges(); },
      error: err => { this.uploadingLogo = false; const detail = err?.error?.message || 'No se pudo subir el logo.'; this.messages.add({ severity: 'error', summary: 'Error', detail }); this.cdr.detectChanges(); }
    });
  }

  cancel() { this.router.navigateByUrl('/app/company'); }

  save() {
    if (!this.model.name?.trim() || this.saving) return;
    this.saving = true;
    const body = {
      name: this.model.name, ruc: this.model.ruc, phone: this.model.phone, address: this.model.address,
      slogan: this.model.slogan, logo_path: this.model.logo_path, igv_percent: this.model.igv_percent,
      tip_enabled: this.model.tip_enabled, default_tip: this.model.default_tip, voucher_series: this.model.voucher_series,
      voucher_start_number: this.model.voucher_start_number, ticket_width: this.model.ticket_width, business_type: this.model.business_type,
    };
    this.api.put<any>('company-settings', body).subscribe({
      next: () => { this.saving = false; this.branding.refresh(); this.messages.add({ severity: 'success', summary: 'Guardado', detail: 'Configuracion de la empresa actualizada.' }); this.router.navigateByUrl('/app/company'); },
      error: (err: any) => { this.saving = false; this.messages.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'No se pudo guardar.' }); }
    });
  }
}
