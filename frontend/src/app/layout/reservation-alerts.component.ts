import { Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { ReservationAlert, ReservationAlertsService } from '../core/reservation-alerts.service';

@Component({
  selector: 'app-reservation-alerts',
  standalone: true,
  imports: [DatePipe, DialogModule],
  template: `
  <p-dialog [visible]="!!service.dueAlert() && !service.showDailyReminder()" (visibleChange)="onDueVisibleChange($event)" [modal]="true" [dismissableMask]="false" [style]="{ width: 'min(420px, 94vw)' }" header="Reserva por llegar">
    @if (service.dueAlert(); as due) {
      <div class="alert-body">
        <p class="alert-lead">La reserva de <strong>{{due.customer_name}}</strong> esta por llegar.</p>
        <div class="alert-row"><span>Hora</span><b>{{due.reserved_at | date:'HH:mm'}}</b></div>
        <div class="alert-row"><span>Personas</span><b>{{due.party_size}}</b></div>
        <div class="alert-row"><span>Mesa(s)</span><b>{{tableNames(due)}}</b></div>
        @if (due.notes) { <div class="alert-row"><span>Notas</span><b>{{due.notes}}</b></div> }
      </div>
    }
    <ng-template pTemplate="footer">
      <button type="button" class="alert-confirm" (click)="service.dismissDueAlert()">Entendido</button>
    </ng-template>
  </p-dialog>

  <p-dialog [visible]="service.showDailyReminder()" (visibleChange)="onDailyVisibleChange($event)" [modal]="true" [dismissableMask]="false" [style]="{ width: 'min(520px, 94vw)' }" header="Reservas de hoy">
    <p class="alert-lead">Hay {{service.todaysReservations().length}} reserva(s) programada(s) para hoy:</p>
    <div class="daily-list">
      @for (r of service.todaysReservations(); track r.id) {
        <div class="daily-row">
          <b>{{r.reserved_at | date:'HH:mm'}}</b>
          <span>{{r.customer_name}} ({{r.party_size}} personas)</span>
          <span class="daily-tables">{{tableNames(r)}}</span>
        </div>
      }
    </div>
    <ng-template pTemplate="footer">
      <button type="button" class="alert-confirm" (click)="service.dismissDailyReminder()">Entendido</button>
    </ng-template>
  </p-dialog>`,
  styles: [`
    .alert-lead { margin: 0 0 12px; font-size: 14px; }
    .alert-row { display: flex; justify-content: space-between; padding: 6px 0; border-top: 1px dashed var(--line); font-size: 13px; }
    .alert-row:first-of-type { border-top: none; }
    .alert-confirm { width: 100%; padding: 10px; border: none; border-radius: 8px; background: var(--primary); color: #fff; font-weight: 700; cursor: pointer; }
    .alert-confirm:hover { background: var(--primary-strong); }
    .daily-list { display: flex; flex-direction: column; gap: 4px; max-height: 320px; overflow: auto; }
    .daily-row { display: grid; grid-template-columns: 60px 1fr auto; gap: 8px; align-items: center; padding: 8px 6px; border-radius: 8px; font-size: 13px; }
    .daily-row:nth-child(odd) { background: var(--surface-2); }
    .daily-tables { color: var(--muted); font-size: 12px; }
  `]
})
export class ReservationAlertsComponent {
  service = inject(ReservationAlertsService);

  onDueVisibleChange(visible: boolean) { if (!visible) this.service.dismissDueAlert(); }
  onDailyVisibleChange(visible: boolean) { if (!visible) this.service.dismissDailyReminder(); }

  tableNames(r: ReservationAlert): string {
    return r.tables?.length ? r.tables.map(t => t.name).join(', ') : 'Sin mesa asignada';
  }
}
