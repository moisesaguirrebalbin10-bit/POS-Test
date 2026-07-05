import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { AdminApiService } from '../core/admin-api.service';

@Component({
  selector: 'app-admin-logs', standalone: true,
  imports: [DatePipe],
  template: `
  <section class="admin-page">
    <header class="admin-head"><div><span class="eyebrow">Panel Administrativo</span><h1>Registros</h1><p>Actividad de todas las empresas, en un solo lugar.</p></div></header>
    <div class="admin-panel">
      @if (loading) { <div class="loading-state"><p>Cargando...</p></div> }
      @else {
        <div class="data-table">
          <div class="data-row table-head" style="--cols:4"><span>Empresa</span><span>Usuario</span><span>Descripcion</span><span>Fecha</span></div>
          @for (l of logs; track l.id) {
            <div class="data-row" style="--cols:4">
              <span>{{l.company?.name || '-'}}</span>
              <span>{{l.user_name}}</span>
              <span>{{l.description}}</span>
              <span>{{l.created_at | date:'dd/MM/yyyy HH:mm'}}</span>
            </div>
          }
        </div>
      }
    </div>
  </section>`
})
export class AdminLogsComponent implements OnInit {
  api = inject(AdminApiService); cdr = inject(ChangeDetectorRef);
  logs: any[] = []; loading = false;

  ngOnInit() {
    this.loading = true;
    this.api.get<any>('activity-logs').subscribe(res => { this.logs = res.data; this.loading = false; this.cdr.detectChanges(); });
  }
}
