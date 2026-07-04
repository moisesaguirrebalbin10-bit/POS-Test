import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../core/api.service';

@Component({
  selector: 'app-cash',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, FormsModule, MatCardModule, MatButtonModule, MatInputModule, MatFormFieldModule, MatIconModule],
  template: `
  <section class="admin-page">
    <header class="admin-head">
      <div><span class="eyebrow">Control diario</span><h1>Caja diaria</h1><p>Apertura, cierre y resumen de movimientos por cajero.</p></div>
      <span class="status-chip" [class.off]="!current">{{current ? 'Caja abierta' : 'Sin caja abierta'}}</span>
    </header>

    <section class="grid two cash-actions">
      <mat-card>
        <h2>Apertura</h2>
        <mat-form-field appearance="outline"><mat-label>Monto inicial</mat-label><input matInput type="number" [(ngModel)]="opening"></mat-form-field>
        <button mat-flat-button class="primary-action" (click)="open()" [disabled]="!!current"><mat-icon>lock_open</mat-icon>Abrir caja</button>
      </mat-card>
      <mat-card>
        <h2>Cierre</h2>
        <mat-form-field appearance="outline"><mat-label>Monto contado</mat-label><input matInput type="number" [(ngModel)]="counted"></mat-form-field>
        <button mat-flat-button class="danger-action" (click)="close()" [disabled]="!current"><mat-icon>lock</mat-icon>Cerrar caja</button>
      </mat-card>
    </section>

    <div class="admin-panel">
      <div class="admin-toolbar compact"><h2>Cajas registradas</h2><button mat-flat-button class="filter-action" (click)="load()"><mat-icon>refresh</mat-icon>Actualizar</button></div>
      <div class="data-table">
        <div class="data-row table-head cash-row"><span>Fecha</span><span>Estado</span><span>Inicial</span><span>Contado</span><span>Diferencia</span><span>Apertura</span></div>
        @for (c of registers; track c.id) {
          <div class="data-row cash-row">
            <span>{{c.date | date:'dd/MM/yyyy'}}</span>
            <span><b class="status-chip" [class.off]="c.status !== 'open'">{{c.status === 'open' ? 'Abierta' : 'Cerrada'}}</b></span>
            <span>{{number(c.opening_amount) | currency:'PEN':'S/ '}}</span>
            <span>{{number(c.counted_amount) | currency:'PEN':'S/ '}}</span>
            <span>{{number(c.difference) | currency:'PEN':'S/ '}}</span>
            <span>{{c.opened_at | date:'dd/MM HH:mm'}}</span>
          </div>
        }
      </div>
      @if (!registers.length) { <div class="empty-state"><mat-icon>point_of_sale</mat-icon><p>No hay cajas registradas.</p></div> }
    </div>
  </section>`
})
export class CashComponent implements OnInit {
  api = inject(ApiService);
  cdr = inject(ChangeDetectorRef);
  registers: any[] = [];
  current: any;
  opening = 0;
  counted = 0;

  ngOnInit() { this.load(); }

  load() {
    this.api.get<any>('cash-registers').subscribe((r: any) => {
      this.registers = r.data || [];
      this.current = this.registers.find(x => x.status === 'open');
      this.cdr.detectChanges();
    });
  }

  open() { this.api.post('cash-registers', { opening_amount: this.opening }).subscribe(() => this.load()); }
  close() { if (!this.current) return; this.api.post(`cash-registers/${this.current.id}/close`, { counted_amount: this.counted }).subscribe(() => this.load()); }
  number(value: unknown) { return Number(value || 0); }
}
