import { ChangeDetectorRef, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { DialogModule } from 'primeng/dialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ApiService } from '../core/api.service';
import { limaDateTimeLocalString, minutesUntil } from '../core/lima-time';

export type PickedTable = { id: number; name: string; capacity: number; zone: string | null };
type NextReservation = { id: number; customer_name: string; party_size: number; reserved_at: string; status: string };
type TableRow = { id: number; name: string; status: string; capacity: number; zone: string | null; has_upcoming_reservation: boolean; next_reservation: NextReservation | null };

@Component({
  selector: 'app-table-picker-dialog',
  standalone: true,
  imports: [FormsModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, DialogModule],
  template: `
  <p-dialog [visible]="visible" (visibleChange)="onVisibleChange($event)" [modal]="true" [dismissableMask]="true" [style]="{ width: 'min(820px, 96vw)' }" [contentStyle]="{ 'max-height': '78vh', overflow: 'auto' }" header="Seleccionar Mesa">
    <div class="picker-layout">
      <aside class="picker-zones">
        <button type="button" class="picker-zone-btn" [class.active]="zoneFilter === null" (click)="zoneFilter = null">
          <span>Todas las Zonas</span><b>{{tables.length}}</b>
        </button>
        @for (z of zones(); track z.name) {
          <button type="button" class="picker-zone-btn" [class.active]="zoneFilter === z.name" (click)="zoneFilter = z.name">
            <span>{{z.name}}</span><b>{{z.count}}</b>
          </button>
        }
      </aside>

      <div class="picker-main">
        <div class="picker-capacity-chips">
          <button type="button" class="category-chip" [class.active]="capacityFilter === 0" (click)="capacityFilter = 0">Todas</button>
          @for (c of [2, 4, 6, 8]; track c) {
            <button type="button" class="category-chip" [class.active]="capacityFilter === c" (click)="capacityFilter = c">{{c}}+ personas</button>
          }
        </div>

        <div class="picker-legend">
          <span><i class="legend-dot free"></i>Disponible</span>
          <span><i class="legend-dot occupied"></i>Ocupada</span>
          <span><i class="legend-dot reserved"></i>Reservada</span>
        </div>

        @if (loading) {
          <div class="loading-state"><mat-icon>hourglass_empty</mat-icon><p>Cargando mesas...</p></div>
        } @else if (!displayedTables().length) {
          <div class="empty-state"><mat-icon>table_bar</mat-icon><p>No hay mesas con estos filtros.</p></div>
        } @else {
          <div class="picker-grid">
            @for (t of displayedTables(); track t.id) {
              <article class="picker-card" [class]="'mesa-' + t.status">
                <header>
                  <strong>{{t.name}}</strong>
                  <span class="mesa-status-chip" [class]="'mesa-status-' + t.status">{{statusLabel(t.status)}}</span>
                </header>
                <div class="picker-card-meta"><mat-icon>groups</mat-icon>{{t.capacity}} personas @if (t.zone) { &middot; {{t.zone}} }</div>
                @if (t.has_upcoming_reservation && t.next_reservation) {
                  <span class="mesa-reserved-badge"><mat-icon>event_available</mat-icon>Reservada {{reservationTime(t.next_reservation.reserved_at)}}</span>
                }
                <div class="picker-card-actions">
                  <button type="button" class="mesa-action-btn ok" [disabled]="t.status !== 'free'" (click)="select(t)">
                    <mat-icon>check</mat-icon>{{t.status === 'free' ? 'Seleccionar' : 'Ocupada'}}
                  </button>
                  <button type="button" mat-stroked-button (click)="toggleReserve(t)">Reservar</button>
                </div>

                @if (reservingTableId === t.id) {
                  <div class="picker-reserve-form" (click)="$event.stopPropagation()">
                    <mat-form-field appearance="outline"><mat-label>Cliente</mat-label><input matInput [(ngModel)]="reserveForm.customer_name"></mat-form-field>
                    <mat-form-field appearance="outline"><mat-label>Telefono</mat-label><input matInput [(ngModel)]="reserveForm.customer_phone"></mat-form-field>
                    <mat-form-field appearance="outline"><mat-label>Personas</mat-label><input matInput type="number" min="1" [(ngModel)]="reserveForm.party_size"></mat-form-field>
                    <mat-form-field appearance="outline"><mat-label>Fecha y hora</mat-label><input matInput type="datetime-local" [(ngModel)]="reserveForm.reserved_at"></mat-form-field>
                    <mat-form-field appearance="outline"><mat-label>Notas (opcional)</mat-label><input matInput [(ngModel)]="reserveForm.notes"></mat-form-field>
                    <div class="modal-actions">
                      <button mat-stroked-button (click)="reservingTableId = null">Cancelar</button>
                      <button mat-flat-button class="primary-action" [disabled]="!reserveForm.customer_name.trim() || savingReservation" (click)="confirmReserve(t)">
                        <mat-icon>event_available</mat-icon>Confirmar Reserva
                      </button>
                    </div>
                  </div>
                }
              </article>
            }
          </div>
        }
      </div>
    </div>
    <ng-template pTemplate="footer">
      <div class="modal-actions">
        <button mat-stroked-button (click)="close()">Cancelar</button>
      </div>
    </ng-template>
  </p-dialog>`,
  styles: [`
    .picker-layout { display: grid; grid-template-columns: 180px 1fr; gap: 16px; align-items: start; }
    @media (max-width: 720px) { .picker-layout { grid-template-columns: 1fr; } }
    .picker-zones { display: flex; flex-direction: column; gap: 4px; }
    .picker-zone-btn { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 9px 12px; border: none; border-radius: 8px; background: transparent; cursor: pointer; text-align: left; font-size: 13px; color: var(--ink); }
    .picker-zone-btn:hover { background: var(--surface-2); }
    .picker-zone-btn.active { background: var(--primary); color: #fff; font-weight: 700; }
    .picker-zone-btn b { font-weight: 700; }
    .picker-main { display: flex; flex-direction: column; gap: 12px; }
    .picker-capacity-chips { display: flex; flex-wrap: wrap; gap: 8px; }
    .picker-legend { display: flex; flex-wrap: wrap; gap: 16px; font-size: 12px; color: var(--muted); }
    .picker-legend span { display: flex; align-items: center; gap: 6px; }
    .legend-dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
    .legend-dot.free { background: #047857; }
    .legend-dot.occupied { background: #c22a2a; }
    .legend-dot.reserved { background: #b45309; }
    .picker-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; }
    .picker-card { position: relative; border: 2px solid var(--soft-line); border-radius: 12px; background: var(--surface); padding: 12px; display: flex; flex-direction: column; gap: 8px; }
    .picker-card.mesa-occupied, .picker-card.mesa-awaiting_payment { border-color: #f0b8b8; }
    .picker-card header { display: flex; align-items: center; justify-content: space-between; gap: 6px; }
    .picker-card-meta { display: flex; align-items: center; gap: 4px; color: var(--muted); font-size: 12px; }
    .picker-card-meta mat-icon { font-size: 14px; width: 14px; height: 14px; }
    .picker-card-actions { display: flex; gap: 6px; }
    .picker-card-actions .mesa-action-btn { flex: 1; height: 34px; font-size: 12px; }
    .picker-reserve-form { display: flex; flex-direction: column; gap: 8px; margin-top: 6px; padding-top: 10px; border-top: 1px dashed var(--line); }
    .modal-actions { display: flex; justify-content: flex-end; gap: 10px; }
  `]
})
export class TablePickerDialogComponent implements OnChanges {
  api = inject(ApiService); cdr = inject(ChangeDetectorRef); messages = inject(MessageService); confirmation = inject(ConfirmationService);

  @Input() visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() tableSelected = new EventEmitter<PickedTable>();

  tables: TableRow[] = [];
  loading = false;
  zoneFilter: string | null = null;
  capacityFilter = 0;

  reservingTableId: number | null = null;
  savingReservation = false;
  reserveForm = { customer_name: '', customer_phone: '', party_size: 2, reserved_at: '', notes: '' };

  statusLabels: Record<string, string> = { free: 'Libre', occupied: 'Ocupada', awaiting_payment: 'Por cobrar' };

  ngOnChanges(changes: SimpleChanges) {
    if (changes['visible'] && this.visible) this.load();
  }

  load() {
    this.loading = true;
    this.zoneFilter = null;
    this.capacityFilter = 0;
    this.reservingTableId = null;
    this.cdr.detectChanges();
    this.api.get<TableRow[]>('tables').subscribe({
      next: (rows: any) => { this.tables = Array.isArray(rows) ? rows : []; this.loading = false; this.cdr.detectChanges(); },
      error: () => { this.tables = []; this.loading = false; this.cdr.detectChanges(); }
    });
  }

  zones(): { name: string; count: number }[] {
    const map = new Map<string, number>();
    for (const t of this.tables) {
      const name = (t.zone || '').trim() || 'Sin zona';
      map.set(name, (map.get(name) || 0) + 1);
    }
    return Array.from(map, ([name, count]) => ({ name, count })).sort((a, b) => a.name.localeCompare(b.name));
  }

  displayedTables(): TableRow[] {
    return this.tables.filter(t => {
      const zoneName = (t.zone || '').trim() || 'Sin zona';
      if (this.zoneFilter !== null && zoneName !== this.zoneFilter) return false;
      if (this.capacityFilter > 0 && t.capacity < this.capacityFilter) return false;
      return true;
    });
  }

  statusLabel(status: string) { return this.statusLabels[status] || status; }
  reservationTime(reservedAt: string): string {
    return new Date(reservedAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
  }

  select(t: TableRow) {
    if (t.status !== 'free') return;
    if (t.has_upcoming_reservation && t.next_reservation) {
      const mins = minutesUntil(t.next_reservation.reserved_at);
      if (mins <= 60) {
        this.confirmation.confirm({
          header: 'Mesa con reserva proxima', icon: 'pi pi-exclamation-triangle',
          message: `"${t.name}" tiene una reserva de "${t.next_reservation.customer_name}" (${t.next_reservation.party_size} personas) a las ${this.reservationTime(t.next_reservation.reserved_at)}, ${mins > 0 ? `en ${mins} minutos` : 'ya paso su hora'}. ¿Deseas continuar de todos modos?`,
          acceptLabel: 'Continuar de todos modos', rejectLabel: 'Elegir otra mesa',
          accept: () => { this.tableSelected.emit({ id: t.id, name: t.name, capacity: t.capacity, zone: t.zone }); this.close(); }
        });
        return;
      }
    }
    this.tableSelected.emit({ id: t.id, name: t.name, capacity: t.capacity, zone: t.zone });
    this.close();
  }

  toggleReserve(t: TableRow) {
    if (this.reservingTableId === t.id) { this.reservingTableId = null; return; }
    this.reservingTableId = t.id;
    this.reserveForm = {
      customer_name: '', customer_phone: '', party_size: Math.min(t.capacity || 2, 2) || 2,
      reserved_at: limaDateTimeLocalString(new Date(Date.now() + 60 * 60 * 1000)),
      notes: ''
    };
  }

  confirmReserve(t: TableRow) {
    if (!this.reserveForm.customer_name.trim() || this.savingReservation) return;
    this.savingReservation = true;
    this.api.post<any>('reservations', {
      restaurant_table_ids: [t.id],
      customer_name: this.reserveForm.customer_name.trim(),
      customer_phone: this.reserveForm.customer_phone.trim() || null,
      party_size: this.reserveForm.party_size,
      reserved_at: this.reserveForm.reserved_at,
      notes: this.reserveForm.notes.trim() || null
    }).subscribe({
      next: () => {
        this.savingReservation = false;
        this.reservingTableId = null;
        this.messages.add({ severity: 'success', summary: 'Reserva creada', detail: `Mesa "${t.name}" reservada para "${this.reserveForm.customer_name}".` });
        this.load();
      },
      error: (err: any) => { this.savingReservation = false; this.messages.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'No se pudo crear la reserva.' }); }
    });
  }

  close() { this.visible = false; this.visibleChange.emit(false); }
  onVisibleChange(value: boolean) { this.visible = value; this.visibleChange.emit(value); }
}
