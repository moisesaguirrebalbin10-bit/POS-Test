import { ChangeDetectorRef, Component, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatTimepickerModule } from '@angular/material/timepicker';
import { MAT_DATE_LOCALE, provideNativeDateAdapter } from '@angular/material/core';
import { DialogModule } from 'primeng/dialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Subscription } from 'rxjs';
import { FullCalendarComponent, FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions, EventClickArg, EventHoveringArg, EventInput } from '@fullcalendar/core';
import esLocale from '@fullcalendar/core/locales/es';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin, { DateClickArg } from '@fullcalendar/interaction';
import { ApiService } from '../core/api.service';
import { RealtimeService } from '../core/realtime.service';

type TableOption = { id: number; name: string; capacity: number; zone: string | null };
type ReservationRow = {
  id: number; customer_name: string; customer_phone: string | null; customer_dni: string | null; party_size: number;
  reserved_at: string; status: string; notes: string | null;
  tables: TableOption[]; creator: { id: number; name: string } | null;
};

const STATUS_COLORS: Record<string, string> = {
  pending: '#4f46e5', seated: '#2563eb', completed: '#059669', cancelled: '#dc2626', no_show: '#6b7280'
};
const EVENT_DURATION_MINUTES = 90;

@Component({
  selector: 'app-reservations',
  standalone: true,
  imports: [DatePipe, FormsModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, MatDatepickerModule, MatTimepickerModule, DialogModule, FullCalendarModule],
  providers: [provideNativeDateAdapter(), { provide: MAT_DATE_LOCALE, useValue: 'es-PE' }],
  template: `
  <section class="mesas-screen">
    <header class="pos-hero">
      <div>
        <span class="eyebrow">Restaurante</span>
        <h1>Reservas</h1>
        <p>
          @if (upcomingCount > 0) { <span class="upcoming-pill"><mat-icon>notifications_active</mat-icon>{{upcomingCount}} reserva{{upcomingCount === 1 ? '' : 's'}} en la proxima hora</span> }
          @else { Gestiona las reservas de mesas del restaurante. }
        </p>
      </div>
      <button mat-flat-button class="primary-action" (click)="openNew()"><mat-icon>event_available</mat-icon>Nueva Reserva</button>
    </header>

    <div class="segmented-control">
      <button type="button" [class.active]="viewMode === 'calendar'" (click)="setViewMode('calendar')">Calendario</button>
      <button type="button" [class.active]="viewMode === 'list'" (click)="setViewMode('list')">Lista</button>
    </div>

    <div class="orders-filters">
      @if (viewMode === 'list') {
        <mat-form-field appearance="outline">
          <mat-label>Fecha</mat-label>
          <input matInput [matDatepicker]="listDatePicker" [(ngModel)]="dateFilter" (ngModelChange)="onFiltersChange()">
          <mat-datepicker-toggle matSuffix [for]="listDatePicker"></mat-datepicker-toggle>
          <mat-datepicker #listDatePicker></mat-datepicker>
        </mat-form-field>
      }
      <select class="date-preset-select" [(ngModel)]="statusFilter" (ngModelChange)="onFiltersChange()">
        <option value="">Todos los Estados</option>
        <option value="pending">Pendiente</option>
        <option value="seated">Sentados</option>
        <option value="completed">Completada</option>
        <option value="cancelled">Cancelada</option>
        <option value="no_show">No llego</option>
      </select>
      @if (viewMode === 'calendar') {
        <span class="calendar-hint"><mat-icon>info</mat-icon>Pasa el mouse sobre una reserva para ver el detalle, o haz clic para gestionarla. Haz clic en un espacio libre para crear una nueva.</span>
      }
    </div>

    @if (viewMode === 'calendar') {
      <div class="fc-wrap">
        <full-calendar #calendar [options]="calendarOptions">
          <ng-template #eventContent let-arg>
            <div class="fc-event-custom">
              <b>{{arg.timeText}}</b>
              <span>{{arg.event.title}}</span>
            </div>
          </ng-template>
        </full-calendar>
      </div>

      @if (hoverRow) {
        <div class="event-tooltip" [style.left.px]="hoverPos.x" [style.top.px]="hoverPos.y">
          <strong>{{hoverRow.customer_name}}</strong>
          <div class="event-tooltip-row"><mat-icon>schedule</mat-icon>{{hoverRow.reserved_at | date:'dd/MM HH:mm'}}</div>
          <div class="event-tooltip-row"><mat-icon>groups</mat-icon>{{hoverRow.party_size}} personas</div>
          <div class="event-tooltip-row"><mat-icon>table_bar</mat-icon>{{tableNames(hoverRow)}}</div>
          @if (hoverRow.notes) { <div class="event-tooltip-row dim">{{hoverRow.notes}}</div> }
          <span class="mesa-status-chip" [class]="'reservation-status-' + hoverRow.status">{{statusLabel(hoverRow.status)}}</span>
        </div>
      }
    } @else if (loading) {
      <div class="loading-state"><mat-icon>hourglass_empty</mat-icon><p>Cargando reservas...</p></div>
    } @else if (!rows.length) {
      <div class="empty-state"><mat-icon>event_busy</mat-icon><p>No hay reservas para estos filtros.</p></div>
    } @else {
      <div class="data-table">
        <div class="data-row table-head" [style.--cols]="7">
          <span>Hora</span><span>Cliente</span><span>Personas</span><span>Mesas</span><span>Notas</span><span>Estado</span><span class="table-actions">Acciones</span>
        </div>
        @for (row of rows; track row.id) {
          <div class="data-row" [style.--cols]="7">
            <span><b>{{row.reserved_at | date:'dd/MM HH:mm'}}</b></span>
            <span>
              <b>{{row.customer_name}}</b>
              @if (row.customer_phone) { <br><small class="dim">{{row.customer_phone}}</small> }
            </span>
            <span>{{row.party_size}}</span>
            <span>
              @if (row.tables.length) {
                @for (t of row.tables; track t.id) { <span class="category-pill">{{t.name}}</span> }
              } @else { <span class="dash">&mdash;</span> }
            </span>
            <span>{{row.notes || '-'}}</span>
            <span><span class="mesa-status-chip" [class]="'reservation-status-' + row.status">{{statusLabel(row.status)}}</span></span>
            <span class="table-actions reservation-actions">
              @if (row.status === 'pending') {
                <button type="button" class="icon-btn small" title="Sentar" (click)="setStatus(row, 'seated')"><mat-icon>event_seat</mat-icon></button>
                <button type="button" class="icon-btn small" title="No llego" (click)="setStatus(row, 'no_show')"><mat-icon>person_off</mat-icon></button>
                <button type="button" class="icon-btn small" title="Cancelar" (click)="setStatus(row, 'cancelled')"><mat-icon>cancel</mat-icon></button>
              }
              @if (row.status === 'seated') {
                <button type="button" class="icon-btn small" title="Completar" (click)="setStatus(row, 'completed')"><mat-icon>task_alt</mat-icon></button>
                <button type="button" class="icon-btn small" title="Cancelar" (click)="setStatus(row, 'cancelled')"><mat-icon>cancel</mat-icon></button>
              }
              @if (row.status !== 'seated' && row.status !== 'completed') {
                <button type="button" class="icon-btn small" title="Eliminar" (click)="confirmDelete(row)"><mat-icon>delete</mat-icon></button>
              }
            </span>
          </div>
        }
      </div>
      @if (total > 0) {
        <div class="pagination-bar">
          <span class="pagination-label">Mostrando {{rangeStart()}} - {{rangeEnd()}} de {{total}} reservas</span>
          <div class="pagination-controls">
            <button type="button" class="page-btn" [disabled]="page <= 1" (click)="goToPage(page - 1)"><mat-icon>chevron_left</mat-icon></button>
            @for (p of pageNumbers(); track p) { <button type="button" class="page-btn" [class.current]="p === page" (click)="goToPage(p)">{{p}}</button> }
            <button type="button" class="page-btn" [disabled]="page >= lastPage" (click)="goToPage(page + 1)"><mat-icon>chevron_right</mat-icon></button>
          </div>
        </div>
      }
    }

    <!-- Nueva reserva -->
    <p-dialog [(visible)]="newOpen" [modal]="true" [dismissableMask]="true" [style]="{ width: 'min(480px, 94vw)' }" styleClass="reservation-dialog" [contentStyle]="{ 'max-height': '78vh', overflow: 'auto' }" header="Nueva reserva">
      <div class="table-cards-label">Mesa(s) (opcional)</div>
      <div class="table-cards-grid">
        @for (t of tables; track t.id) {
          <button type="button" class="table-card" [class.selected]="isTableSelected(t.id)" (click)="toggleTable(t.id)">
            @if (isTableSelected(t.id)) { <span class="table-card-check"><mat-icon>check</mat-icon></span> }
            <mat-icon>table_bar</mat-icon>
            <strong>{{t.name}}</strong>
            <small>{{t.capacity}} personas</small>
          </button>
        }
      </div>

      <mat-form-field appearance="outline"><mat-label>Cliente</mat-label><input matInput [(ngModel)]="form.customer_name"></mat-form-field>
      <div class="form-row-2">
        <mat-form-field appearance="outline"><mat-label>Telefono</mat-label><input matInput [(ngModel)]="form.customer_phone"></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>DNI</mat-label><input matInput maxlength="15" [(ngModel)]="form.customer_dni"></mat-form-field>
      </div>
      <div class="form-row-2">
        <mat-form-field appearance="outline">
          <mat-label>Fecha</mat-label>
          <input matInput [matDatepicker]="datePicker" [(ngModel)]="form.date">
          <mat-datepicker-toggle matSuffix [for]="datePicker"></mat-datepicker-toggle>
          <mat-datepicker #datePicker></mat-datepicker>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Hora</mat-label>
          <input matInput [matTimepicker]="timePicker" [(ngModel)]="form.time">
          <mat-timepicker-toggle matSuffix [for]="timePicker"></mat-timepicker-toggle>
          <mat-timepicker #timePicker interval="30m"></mat-timepicker>
        </mat-form-field>
      </div>
      <mat-form-field appearance="outline"><mat-label>Personas</mat-label><input matInput type="number" min="1" [(ngModel)]="form.party_size"></mat-form-field>
      <mat-form-field appearance="outline"><mat-label>Notas (opcional)</mat-label><input matInput [(ngModel)]="form.notes"></mat-form-field>
      <ng-template pTemplate="footer">
        <div class="modal-actions">
          <button mat-stroked-button (click)="newOpen = false">Cancelar</button>
          <button mat-flat-button class="primary-action" [disabled]="!form.customer_name.trim() || !form.date || !form.time || saving" (click)="save()"><mat-icon>save</mat-icon>Crear Reserva</button>
        </div>
      </ng-template>
    </p-dialog>

    <!-- Detalle de reserva (click en un evento del calendario) -->
    <p-dialog [(visible)]="detailOpen" [modal]="true" [dismissableMask]="true" [style]="{ width: 'min(420px, 94vw)' }" header="Detalle de reserva">
      @if (detailRow) {
        <div class="detail-body">
          <div class="alert-row"><span>Cliente</span><b>{{detailRow.customer_name}}</b></div>
          @if (detailRow.customer_phone) { <div class="alert-row"><span>Telefono</span><b>{{detailRow.customer_phone}}</b></div> }
          @if (detailRow.customer_dni) { <div class="alert-row"><span>DNI</span><b>{{detailRow.customer_dni}}</b></div> }
          <div class="alert-row"><span>Hora</span><b>{{detailRow.reserved_at | date:'dd/MM HH:mm'}}</b></div>
          <div class="alert-row"><span>Personas</span><b>{{detailRow.party_size}}</b></div>
          <div class="alert-row"><span>Mesas</span><b>{{tableNames(detailRow)}}</b></div>
          @if (detailRow.notes) { <div class="alert-row"><span>Notas</span><b>{{detailRow.notes}}</b></div> }
          <div class="alert-row"><span>Estado</span><span class="mesa-status-chip" [class]="'reservation-status-' + detailRow.status">{{statusLabel(detailRow.status)}}</span></div>
        </div>
        <div class="detail-actions">
          @if (detailRow.status === 'pending') {
            <button mat-stroked-button (click)="setStatus(detailRow, 'seated')"><mat-icon>event_seat</mat-icon>Sentar</button>
            <button mat-stroked-button (click)="setStatus(detailRow, 'no_show')"><mat-icon>person_off</mat-icon>No llego</button>
            <button mat-stroked-button (click)="setStatus(detailRow, 'cancelled')"><mat-icon>cancel</mat-icon>Cancelar</button>
          }
          @if (detailRow.status === 'seated') {
            <button mat-stroked-button (click)="setStatus(detailRow, 'completed')"><mat-icon>task_alt</mat-icon>Completar</button>
            <button mat-stroked-button (click)="setStatus(detailRow, 'cancelled')"><mat-icon>cancel</mat-icon>Cancelar</button>
          }
          @if (detailRow.status !== 'seated' && detailRow.status !== 'completed') {
            <button mat-stroked-button (click)="confirmDelete(detailRow)"><mat-icon>delete</mat-icon>Eliminar</button>
          }
        </div>
      }
    </p-dialog>
  </section>`,
  styles: [`
    .mesas-screen { display: flex; flex-direction: column; gap: 18px; }
    .upcoming-pill { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 999px; background: #fef3c7; color: #92400e; font-weight: 700; font-size: 13px; }
    .upcoming-pill mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .orders-filters { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }
    .dim { color: var(--muted); }
    .reservation-status-pending { background: #e0e7ff; color: #3730a3; }
    .reservation-status-seated { background: #dbeafe; color: #1d4ed8; }
    .reservation-status-completed { background: #e8f7f1; color: #047857; }
    .reservation-status-cancelled { background: #fde8e8; color: #c22a2a; }
    .reservation-status-no_show { background: #f1f2fa; color: #6b7280; }
    .reservation-actions { display: flex; gap: 4px; }
    .modal-actions { display: flex; justify-content: flex-end; gap: 10px; }
    .calendar-hint { display: inline-flex; align-items: center; gap: 6px; color: var(--muted); font-size: 12px; }
    .calendar-hint mat-icon { font-size: 15px; width: 15px; height: 15px; }
    .fc-wrap {
      border: 1px solid var(--soft-line); border-radius: 12px; padding: 12px; background: var(--surface);
      --fc-today-bg-color: rgba(15, 118, 110, .12);
      --fc-button-bg-color: var(--primary); --fc-button-border-color: var(--primary);
      --fc-button-hover-bg-color: var(--primary-strong); --fc-button-hover-border-color: var(--primary-strong);
      --fc-button-active-bg-color: var(--primary-strong); --fc-button-active-border-color: var(--primary-strong);
    }
    html.app-dark .fc-wrap {
      --fc-border-color: var(--line); --fc-page-bg-color: var(--surface);
      --fc-neutral-bg-color: var(--surface-2); --fc-neutral-text-color: var(--muted);
      --fc-list-event-hover-bg-color: var(--surface-2);
    }
    .fc-event-custom { display: flex; flex-direction: column; gap: 1px; padding: 1px 2px; overflow: hidden; }
    .fc-event-custom b { font-size: 11px; }
    .fc-event-custom span { font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .event-tooltip {
      position: fixed; z-index: 1200; width: 240px; padding: 12px; border-radius: 10px;
      background: var(--surface); border: 1px solid var(--soft-line); box-shadow: 0 8px 24px rgba(0,0,0,.18);
      display: flex; flex-direction: column; gap: 6px; pointer-events: none; font-size: 13px;
    }
    .event-tooltip-row { display: flex; align-items: center; gap: 6px; color: var(--muted); font-size: 12px; }
    .event-tooltip-row mat-icon { font-size: 15px; width: 15px; height: 15px; }
    .event-tooltip .mesa-status-chip { align-self: flex-start; }
    .detail-body { display: flex; flex-direction: column; gap: 2px; }
    .alert-row { display: flex; justify-content: space-between; padding: 6px 0; border-top: 1px dashed var(--line); font-size: 13px; }
    .alert-row:first-of-type { border-top: none; }
    .detail-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 14px; }
    .table-cards-label { font-size: 12px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: .03em; margin-bottom: 8px; }
    .table-cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(88px, 1fr)); gap: 10px; margin-bottom: 18px; }
    .table-card {
      position: relative; display: flex; flex-direction: column; align-items: center; gap: 4px;
      padding: 14px 8px; border: 2px solid var(--soft-line); border-radius: 14px; background: var(--surface);
      cursor: pointer; transition: border-color .15s, background .15s, transform .1s; font-family: inherit;
    }
    .table-card:hover { border-color: var(--primary); transform: translateY(-1px); }
    .table-card.selected { border-color: var(--primary); background: rgba(15, 118, 110, .08); }
    .table-card mat-icon { color: var(--muted); font-size: 20px; width: 20px; height: 20px; }
    .table-card strong { font-size: 13px; color: var(--ink); }
    .table-card small { color: var(--muted); font-size: 11px; }
    .table-card-check {
      position: absolute; top: -7px; right: -7px; width: 22px; height: 22px; border-radius: 50%;
      background: #16a34a; color: #fff; display: flex; align-items: center; justify-content: center;
      box-shadow: 0 2px 5px rgba(0,0,0,.25);
    }
    .table-card-check mat-icon { font-size: 14px; width: 14px; height: 14px; color: #fff; }
    .form-row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  `]
})
export class ReservationsComponent implements OnInit, OnDestroy {
  api = inject(ApiService); cdr = inject(ChangeDetectorRef); messages = inject(MessageService);
  confirmation = inject(ConfirmationService); realtime = inject(RealtimeService);

  @ViewChild('calendar') calendarComponent?: FullCalendarComponent;

  rows: ReservationRow[] = [];
  tables: TableOption[] = [];
  loading = false;
  page = 1; perPage = 20; total = 0; lastPage = 1;
  dateFilter: Date = new Date();
  statusFilter = '';
  upcomingCount = 0;
  viewMode: 'calendar' | 'list' = 'calendar';

  newOpen = false; saving = false;
  form = { restaurant_table_ids: [] as number[], customer_name: '', customer_phone: '', customer_dni: '', party_size: 2, date: null as Date | null, time: null as Date | null, notes: '' };

  detailOpen = false;
  detailRow: ReservationRow | null = null;
  hoverRow: ReservationRow | null = null;
  hoverPos = { x: 0, y: 0 };

  statusLabels: Record<string, string> = { pending: 'Pendiente', seated: 'Sentados', completed: 'Completada', cancelled: 'Cancelada', no_show: 'No llego' };

  calendarOptions: CalendarOptions = {
    plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
    initialView: 'dayGridMonth',
    locale: esLocale,
    headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay' },
    slotMinTime: '00:00:00',
    slotMaxTime: '24:00:00',
    allDaySlot: false,
    height: 'auto',
    nowIndicator: true,
    dayMaxEvents: true,
    events: (info, success, failure) => this.fetchEvents(info, success, failure),
    eventClick: (arg) => this.onEventClick(arg),
    eventMouseEnter: (arg) => this.onEventMouseEnter(arg),
    eventMouseLeave: () => this.onEventMouseLeave(),
    dateClick: (arg) => this.onDateClick(arg)
  };

  private pollTimer?: ReturnType<typeof setInterval>;
  private subs: Subscription[] = [];

  ngOnInit() {
    this.load();
    this.loadTables();
    this.loadUpcomingCount();
    this.pollTimer = setInterval(() => this.loadUpcomingCount(), 60000);
    this.subs.push(this.realtime.reservationChanged$.subscribe(() => { this.refreshCurrentView(); this.loadUpcomingCount(); }));
  }

  ngOnDestroy() {
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.subs.forEach(s => s.unsubscribe());
  }

  load(silent = false) {
    if (!silent) { this.loading = true; this.cdr.detectChanges(); }
    const params: any = { page: this.page, per_page: this.perPage, date: this.toDateStr(this.dateFilter) };
    if (this.statusFilter) params.status = this.statusFilter;
    this.api.get<any>('reservations', params).subscribe({
      next: (r: any) => {
        this.rows = r?.data || [];
        this.total = r?.total ?? this.rows.length;
        this.lastPage = r?.last_page ?? 1;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => { this.loading = false; this.rows = []; this.cdr.detectChanges(); }
    });
  }

  loadTables() {
    this.api.get<TableOption[]>('tables').subscribe((rows: any) => { this.tables = Array.isArray(rows) ? rows : []; this.cdr.detectChanges(); });
  }

  loadUpcomingCount() {
    this.api.get<any>('reservations-upcoming-count', { minutes: 60 }).subscribe({
      next: r => { this.upcomingCount = Number(r?.count || 0); this.cdr.detectChanges(); },
      error: () => {}
    });
  }

  refreshCurrentView(silent = true) {
    if (this.viewMode === 'list') this.load(silent);
    else this.calendarComponent?.getApi().refetchEvents();
  }

  onFiltersChange() {
    if (this.viewMode === 'list') { this.page = 1; this.load(); }
    else this.calendarComponent?.getApi().refetchEvents();
  }

  rangeStart() { return this.total ? (this.page - 1) * this.perPage + 1 : 0; }
  rangeEnd() { return Math.min(this.page * this.perPage, this.total); }
  pageNumbers(): number[] {
    const span = 5;
    let start = Math.max(1, this.page - Math.floor(span / 2));
    const end = Math.min(this.lastPage, start + span - 1);
    start = Math.max(1, end - span + 1);
    const pages: number[] = [];
    for (let p = start; p <= end; p++) pages.push(p);
    return pages;
  }
  goToPage(p: number) { if (p < 1 || p > this.lastPage || p === this.page) return; this.page = p; this.load(); }

  statusLabel(status: string) { return this.statusLabels[status] || status; }
  tableNames(row: ReservationRow): string { return row.tables?.length ? row.tables.map(t => t.name).join(', ') : 'Sin mesa asignada'; }

  setViewMode(mode: 'calendar' | 'list') {
    if (this.viewMode === mode) return;
    this.viewMode = mode;
    this.page = 1;
    this.hoverRow = null;
    if (mode === 'list') this.load();
  }

  fetchEvents(info: { start: Date; end: Date }, success: (events: EventInput[]) => void, failure: (err: any) => void) {
    const params: any = { from: this.toDateStr(info.start), to: this.toDateStr(new Date(info.end.getTime() - 1)), per_page: 300 };
    if (this.statusFilter) params.status = this.statusFilter;
    this.api.get<any>('reservations', params).subscribe({
      next: (r: any) => {
        const list: ReservationRow[] = r?.data || [];
        success(list.map(row => this.toEvent(row)));
      },
      error: (err) => failure(err)
    });
  }

  private toEvent(row: ReservationRow): EventInput {
    const start = new Date(row.reserved_at);
    const end = new Date(start.getTime() + EVENT_DURATION_MINUTES * 60000);
    const color = STATUS_COLORS[row.status] || STATUS_COLORS['pending'];
    return {
      id: String(row.id),
      title: `${row.customer_name} · ${this.tableNames(row)}`,
      start, end,
      backgroundColor: color, borderColor: color,
      extendedProps: { reservation: row }
    };
  }

  onEventClick(arg: EventClickArg) {
    this.hoverRow = null;
    this.detailRow = arg.event.extendedProps['reservation'] as ReservationRow;
    this.detailOpen = true;
    this.cdr.detectChanges();
  }

  onEventMouseEnter(arg: EventHoveringArg) {
    this.hoverRow = arg.event.extendedProps['reservation'] as ReservationRow;
    const rect = arg.el.getBoundingClientRect();
    this.hoverPos = { x: Math.min(rect.left, window.innerWidth - 260), y: rect.bottom + 6 };
    this.cdr.detectChanges();
  }

  onEventMouseLeave() {
    this.hoverRow = null;
    this.cdr.detectChanges();
  }

  onDateClick(arg: DateClickArg) {
    this.form = {
      restaurant_table_ids: [], customer_name: '', customer_phone: '', customer_dni: '', party_size: 2,
      date: arg.date, time: arg.date,
      notes: ''
    };
    this.newOpen = true;
    this.cdr.detectChanges();
  }

  private toDateStr(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  private combineDateTime(date: Date, time: Date): string {
    return `${this.toDateStr(date)}T${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}`;
  }

  toggleTable(id: number) {
    const idx = this.form.restaurant_table_ids.indexOf(id);
    if (idx >= 0) this.form.restaurant_table_ids.splice(idx, 1);
    else this.form.restaurant_table_ids.push(id);
  }
  isTableSelected(id: number): boolean { return this.form.restaurant_table_ids.includes(id); }

  openNew() {
    const d = new Date(Date.now() + 60 * 60 * 1000);
    this.form = {
      restaurant_table_ids: [], customer_name: '', customer_phone: '', customer_dni: '', party_size: 2,
      date: d, time: d,
      notes: ''
    };
    this.newOpen = true;
  }

  save() {
    if (!this.form.customer_name.trim() || !this.form.date || !this.form.time || this.saving) return;
    this.saving = true;
    this.api.post<any>('reservations', {
      restaurant_table_ids: this.form.restaurant_table_ids,
      customer_name: this.form.customer_name.trim(),
      customer_phone: this.form.customer_phone.trim() || null,
      customer_dni: this.form.customer_dni.trim() || null,
      party_size: this.form.party_size,
      reserved_at: this.combineDateTime(this.form.date, this.form.time),
      notes: this.form.notes.trim() || null
    }).subscribe({
      next: () => {
        this.saving = false; this.newOpen = false;
        this.messages.add({ severity: 'success', summary: 'Reserva creada', detail: `Reserva para "${this.form.customer_name}" registrada.` });
        this.refreshCurrentView(); this.loadUpcomingCount();
      },
      error: (err: any) => { this.saving = false; this.messages.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'No se pudo crear la reserva.' }); }
    });
  }

  setStatus(row: ReservationRow, status: string) {
    const previous = row.status;
    row.status = status;
    this.cdr.detectChanges();
    this.api.patch<any>(`reservations/${row.id}/status`, { status }).subscribe({
      next: () => { this.detailOpen = false; this.refreshCurrentView(); this.loadUpcomingCount(); },
      error: (err: any) => { row.status = previous; this.cdr.detectChanges(); this.messages.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'No se pudo actualizar la reserva.' }); }
    });
  }

  confirmDelete(row: ReservationRow) {
    this.confirmation.confirm({
      header: 'Confirmar eliminacion', message: `Seguro que deseas eliminar la reserva de "${row.customer_name}"?`, icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Eliminar', rejectLabel: 'Cancelar', acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.deleteReservation(row)
    });
  }

  deleteReservation(row: ReservationRow) {
    this.api.delete(`reservations/${row.id}`).subscribe({
      next: () => {
        this.messages.add({ severity: 'success', summary: 'Reserva eliminada', detail: `Reserva de "${row.customer_name}" eliminada.` });
        this.detailOpen = false; this.refreshCurrentView(); this.loadUpcomingCount();
      },
      error: (err: any) => this.messages.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'No se pudo eliminar la reserva.' })
    });
  }
}
