import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ImageModule } from 'primeng/image';
import { MessageService } from 'primeng/api';
import { ApiService } from '../core/api.service';
import { BrandingService } from '../core/branding.service';

@Component({
  selector: 'app-system-branding',
  standalone: true,
  imports: [FormsModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, ImageModule],
  template: `
  <section class="admin-page">
    <header class="admin-head">
      <div><span class="eyebrow">Administracion</span><h1>Nombre y logo del sistema</h1><p>Personaliza el nombre y el logo que se muestran en el sidebar, el login y el punto de venta.</p></div>
    </header>

    <div class="admin-panel branding-panel">
      <div class="image-field">
        <span>Logo del sistema</span>
        <button type="button" class="image-dropzone" [class.uploading]="uploadingLogo" (click)="fileInput.click()" (dragover)="onDragOver($event)" (drop)="onDrop($event)">
          @if (logoPath) { <p-image [src]="logoUrl()" alt="Logo del sistema" [preview]="true" imageClass="dropzone-preview-img" /> }
          @else { <mat-icon>cloud_upload</mat-icon> }
          <strong>{{uploadingLogo ? 'Subiendo logo...' : 'Seleccionar o arrastrar imagen'}}</strong>
          <small>JPG, PNG o WEBP hasta 4MB</small>
        </button>
        <input #fileInput type="file" accept="image/png,image/jpeg,image/webp" hidden (change)="onSelected($event)">
        <code>{{logoPath || 'Sin logo seleccionado'}}</code>
      </div>

      <mat-form-field appearance="outline" class="name-field">
        <mat-label>Nombre del sistema</mat-label>
        <input matInput [(ngModel)]="name" placeholder="MR.WOK">
      </mat-form-field>

      <mat-form-field appearance="outline" class="name-field">
        <mat-label>Eslogan (opcional)</mat-label>
        <input matInput [(ngModel)]="slogan" placeholder="Chifa Fusion">
      </mat-form-field>

      <div class="branding-preview">
        <span>Vista previa</span>
        <div class="brand-box preview-box">
          <div class="brand-logo">
            @if (logoPath) { <p-image [src]="logoUrl()" alt="Logo" [preview]="true" imageClass="brand-logo-img" /> }
            @else { <mat-icon>storefront</mat-icon> }
          </div>
          <div class="brand-text">
            <h2>{{name || 'MR.WOK'}}</h2>
            @if (slogan) { <small>{{slogan}}</small> }
          </div>
        </div>
      </div>

      <div class="modal-actions">
        <button mat-flat-button class="primary-action" [disabled]="saving" (click)="save()"><mat-icon>save</mat-icon>Guardar</button>
      </div>
    </div>
  </section>`,
  styles: [`
    .branding-panel { display: grid; gap: 18px; max-width: 520px; }
    .name-field { width: 100%; }
    .branding-preview { display: grid; gap: 8px; }
    .branding-preview > span { color: var(--muted); font-size: 12px; font-weight: 800; text-transform: uppercase; }
    .preview-box { height: 240px; border: 1px dashed var(--line); border-radius: 8px; background: var(--surface-2); }
    .preview-box .brand-logo { border-bottom: 1px dashed var(--line); }
  `]
})
export class SystemBrandingComponent implements OnInit {
  api = inject(ApiService); branding = inject(BrandingService); messages = inject(MessageService); cdr = inject(ChangeDetectorRef);
  settings: any = {};
  name = '';
  slogan = '';
  logoPath: string | null = null;
  uploadingLogo = false;
  saving = false;

  ngOnInit() {
    this.api.get<any>('company-settings').subscribe(s => {
      this.settings = s;
      this.name = s?.name || '';
      this.slogan = s?.slogan || '';
      this.logoPath = s?.logo_path || null;
      this.cdr.detectChanges();
    });
  }

  logoUrl() { return this.api.assetUrl(this.logoPath || undefined); }

  onDragOver(event: DragEvent) { event.preventDefault(); }
  onDrop(event: DragEvent) { event.preventDefault(); const file = event.dataTransfer?.files?.[0]; if (file) this.uploadLogo(file); }
  onSelected(event: Event) { const input = event.target as HTMLInputElement; const file = input.files?.[0]; if (file) this.uploadLogo(file); input.value = ''; }

  uploadLogo(file: File) {
    if (!file.type.startsWith('image/')) { this.messages.add({ severity: 'warn', summary: 'Imagen invalida', detail: 'Selecciona un archivo de imagen valido.' }); return; }
    this.uploadingLogo = true;
    this.api.upload<{ path: string }>('company-settings/upload-logo', file).subscribe({
      next: res => { this.logoPath = res.path; this.uploadingLogo = false; this.messages.add({ severity: 'success', summary: 'Logo cargado', detail: 'El logo se cargo correctamente.' }); this.cdr.detectChanges(); },
      error: err => { this.uploadingLogo = false; const detail = err?.error?.message || 'No se pudo subir el logo.'; this.messages.add({ severity: 'error', summary: 'Error', detail }); this.cdr.detectChanges(); }
    });
  }

  save() {
    this.saving = true;
    const body = { ...this.settings, name: this.name, slogan: this.slogan, logo_path: this.logoPath };
    delete body.id; delete body.created_at; delete body.updated_at; delete body.deleted_at;
    this.api.put<any>('company-settings', body).subscribe({
      next: s => { this.settings = s; this.saving = false; this.messages.add({ severity: 'success', summary: 'Guardado', detail: 'Nombre y logo del sistema actualizados.' }); this.branding.refresh(); this.cdr.detectChanges(); },
      error: err => { this.saving = false; const detail = err?.error?.message || 'No se pudo guardar.'; this.messages.add({ severity: 'error', summary: 'Error', detail }); this.cdr.detectChanges(); }
    });
  }
}
