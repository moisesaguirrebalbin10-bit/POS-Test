import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import '../core/electron-window';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MessageService } from 'primeng/api';

type PrinterInfo = { name: string; displayName: string; description: string };

@Component({
  selector: 'app-device-settings',
  standalone: true,
  imports: [FormsModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule],
  template: `
  <section class="admin-page">
    <header class="admin-head">
      <div><span class="eyebrow">Administracion</span><h1>Configuracion de equipos</h1><p>Asigna que impresora usar para cada copia del voucher. Esto solo sirve como referencia: al imprimir, la impresora se debe seleccionar manualmente en el dialogo.</p></div>
    </header>

    @if (!available) {
      <div class="empty-state"><mat-icon>desktop_windows</mat-icon><p>Solo esta disponible para el Aplicativo de Escritorio.</p></div>
    } @else if (loading) {
      <div class="loading-state"><mat-icon>hourglass_empty</mat-icon><p>Cargando impresoras...</p></div>
    } @else {
      <div class="admin-panel device-panel">
        <mat-form-field appearance="outline">
          <mat-label>Impresora para Boleta (Cliente / Caja)</mat-label>
          <select matNativeControl [(ngModel)]="customerPrinter">
            <option value="">Sin asignar</option>
            @for (p of printers; track p.name) { <option [value]="p.name">{{p.displayName}}</option> }
          </select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Impresora para Comanda (Cocina / Local)</mat-label>
          <select matNativeControl [(ngModel)]="localPrinter">
            <option value="">Sin asignar</option>
            @for (p of printers; track p.name) { <option [value]="p.name">{{p.displayName}}</option> }
          </select>
        </mat-form-field>

        @if (!printers.length) { <p class="modal-hint">No se detectaron impresoras instaladas en este equipo.</p> }

        <div class="modal-actions">
          <button mat-flat-button class="primary-action" [disabled]="saving" (click)="save()"><mat-icon>save</mat-icon>Guardar</button>
        </div>
      </div>
    }
  </section>`,
  styles: [`.device-panel { display: grid; gap: 18px; max-width: 480px; }`]
})
export class DeviceSettingsComponent implements OnInit {
  messages = inject(MessageService);
  cdr = inject(ChangeDetectorRef);
  available = !!window.posChifa?.listPrinters;
  loading = false;
  saving = false;
  printers: PrinterInfo[] = [];
  customerPrinter = '';
  localPrinter = '';

  ngOnInit() {
    if (!this.available) return;
    this.loading = true;
    Promise.all([window.posChifa!.listPrinters(), window.posChifa!.getPrinterConfig()])
      .then(([printers, config]) => {
        this.printers = printers || [];
        this.customerPrinter = config?.customer || '';
        this.localPrinter = config?.local || '';
        this.loading = false;
        this.cdr.detectChanges();
      })
      .catch(() => {
        this.loading = false;
        this.messages.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar la lista de impresoras.' });
        this.cdr.detectChanges();
      });
  }

  save() {
    if (!this.available) return;
    this.saving = true;
    window.posChifa!.savePrinterConfig({ customer: this.customerPrinter, local: this.localPrinter })
      .then(() => {
        this.saving = false;
        this.messages.add({ severity: 'success', summary: 'Guardado', detail: 'Configuracion de impresoras actualizada.' });
        this.cdr.detectChanges();
      })
      .catch(() => {
        this.saving = false;
        this.messages.add({ severity: 'error', summary: 'Error', detail: 'No se pudo guardar la configuracion.' });
        this.cdr.detectChanges();
      });
  }
}
