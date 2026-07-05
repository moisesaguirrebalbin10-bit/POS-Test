import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { AdminApiService } from '../core/admin-api.service';

@Component({
  selector: 'app-admin-payments', standalone: true,
  imports: [CurrencyPipe, DatePipe],
  template: `
  <section class="admin-page">
    <header class="admin-head"><div><span class="eyebrow">Panel Administrativo</span><h1>Pagos</h1><p>Historial de pagos de todas las empresas.</p></div></header>
    <div class="admin-panel">
      @if (loading) { <div class="loading-state"><p>Cargando...</p></div> }
      @else if (!payments.length) { <div class="empty-state"><p>Aun no hay pagos registrados.</p></div> }
      @else {
        <div class="data-table">
          <div class="data-row table-head" style="--cols:5"><span>Empresa</span><span>Monto</span><span>Metodo</span><span>Estado</span><span>Fecha</span></div>
          @for (p of payments; track p.id) {
            <div class="data-row" style="--cols:5">
              <span>{{p.company?.name || '-'}}</span>
              <span>{{p.amount | currency:'PEN':'S/ '}}</span>
              <span>{{p.method}}</span>
              <span>{{p.status}}</span>
              <span>{{p.created_at | date:'dd/MM/yyyy'}}</span>
            </div>
          }
        </div>
      }
    </div>
  </section>`
})
export class AdminPaymentsComponent implements OnInit {
  api = inject(AdminApiService); cdr = inject(ChangeDetectorRef);
  payments: any[] = []; loading = false;

  ngOnInit() {
    this.loading = true;
    this.api.get<any>('payments').subscribe(res => { this.payments = res.data; this.loading = false; this.cdr.detectChanges(); });
  }
}
