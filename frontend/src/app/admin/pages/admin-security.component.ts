import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ConfirmationService, MessageService } from 'primeng/api';
import { AdminApiService } from '../core/admin-api.service';

type BlockedIpRow = { id: number; ip: string; reason: string | null; violations: number; blocked_at: string };

@Component({
  selector: 'app-admin-security',
  standalone: true,
  imports: [DatePipe, MatIconModule, MatButtonModule],
  template: `
  <section class="admin-page">
    <header class="admin-head">
      <div><span class="eyebrow">Panel Administrativo</span><h1>Seguridad</h1><p>Direcciones IP bloqueadas automaticamente por exceder el limite de peticiones (posible ataque de fuerza bruta o sobrecarga).</p></div>
    </header>

    <div class="admin-panel">
      <div class="panel-subhead">
        <h3>IPs Bloqueadas</h3>
        <span class="pagination-label">Mostrando {{rows.length}} de {{total}}</span>
      </div>

      @if (loading) { <div class="loading-state"><mat-icon>hourglass_empty</mat-icon><p>Cargando...</p></div> }
      @else if (!rows.length) {
        <div class="empty-state"><mat-icon>verified_user</mat-icon><p>No hay ninguna IP bloqueada en este momento.</p></div>
      } @else {
        <div class="data-table">
          <div class="data-row table-head" style="--cols:4"><span>IP</span><span>Motivo</span><span>Violaciones</span><span>Bloqueada</span><span class="table-actions">Acciones</span></div>
          @for (row of rows; track row.id) {
            <div class="data-row" style="--cols:4">
              <span><b>{{row.ip}}</b></span>
              <span>{{row.reason || '-'}}</span>
              <span>{{row.violations}}</span>
              <span>{{row.blocked_at | date:'dd/MM/yyyy HH:mm'}}</span>
              <span class="table-actions">
                <button type="button" class="icon-btn small" title="Desbloquear IP" (click)="unblock(row)"><mat-icon>lock_open</mat-icon></button>
              </span>
            </div>
          }
        </div>
      }

      @if (total > 0) {
        <div class="pagination-bar">
          <span class="pagination-label">Pagina {{page}} de {{lastPage}}</span>
          <div class="pagination-controls">
            <button type="button" class="page-btn" [disabled]="page <= 1" (click)="goToPage(page - 1)"><mat-icon>chevron_left</mat-icon></button>
            <button type="button" class="page-btn" [disabled]="page >= lastPage" (click)="goToPage(page + 1)"><mat-icon>chevron_right</mat-icon></button>
          </div>
        </div>
      }
    </div>
  </section>`
})
export class AdminSecurityComponent implements OnInit {
  api = inject(AdminApiService); cdr = inject(ChangeDetectorRef);
  messages = inject(MessageService); confirmation = inject(ConfirmationService);

  rows: BlockedIpRow[] = [];
  total = 0; page = 1; lastPage = 1; loading = false;

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    this.api.get<any>('blocked-ips', { page: this.page }).subscribe({
      next: r => {
        this.rows = r?.data || [];
        this.total = r?.total || 0;
        this.lastPage = r?.last_page || 1;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => { this.loading = false; this.cdr.detectChanges(); }
    });
  }

  goToPage(p: number) {
    if (p < 1 || p > this.lastPage) return;
    this.page = p;
    this.load();
  }

  unblock(row: BlockedIpRow) {
    this.confirmation.confirm({
      header: 'Desbloquear IP', message: `Deseas desbloquear la IP ${row.ip}? Podra volver a usar el sistema normalmente.`,
      icon: 'pi pi-exclamation-triangle', acceptLabel: 'Desbloquear', rejectLabel: 'Cancelar',
      accept: () => this.api.delete(`blocked-ips/${row.id}`).subscribe({
        next: () => { this.messages.add({ severity: 'success', summary: 'IP desbloqueada', detail: `${row.ip} ya puede usar el sistema.` }); this.load(); },
        error: (err: any) => this.messages.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'No se pudo desbloquear la IP.' })
      })
    });
  }
}
