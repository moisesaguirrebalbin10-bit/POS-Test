import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from './api.service';
import { RealtimeService } from './realtime.service';
import { limaDateString, minutesUntil } from './lima-time';

export type ReservationAlert = {
  id: number; customer_name: string; party_size: number; reserved_at: string; status: string;
  notes: string | null; tables: { id: number; name: string }[];
};

const ALERT_WINDOW_MINUTES = 15;

@Injectable({ providedIn: 'root' })
export class ReservationAlertsService {
  private api = inject(ApiService);
  private realtime = inject(RealtimeService);

  todaysReservations = signal<ReservationAlert[]>([]);
  showDailyReminder = signal(false);
  dueAlert = signal<ReservationAlert | null>(null);

  private started = false;
  private alertedIds = new Set<number>();
  private pollTimer?: ReturnType<typeof setInterval>;

  start() {
    if (this.started) return;
    this.started = true;
    this.refresh(true);
    this.pollTimer = setInterval(() => this.refresh(false), 60000);
    this.realtime.reservationChanged$.subscribe(() => this.refresh(false));
  }

  private refresh(isInitial: boolean) {
    this.api.get<any>('reservations', { date: limaDateString(), status: 'pending,seated', per_page: 100 }).subscribe({
      next: (r: any) => {
        const rows: ReservationAlert[] = r?.data || [];
        this.todaysReservations.set(rows);

        if (isInitial) {
          const key = 'reservations-reminder-shown-' + limaDateString();
          if (rows.length && !localStorage.getItem(key)) this.showDailyReminder.set(true);
        }

        for (const row of rows) {
          if (row.status !== 'pending' || this.alertedIds.has(row.id)) continue;
          const mins = minutesUntil(row.reserved_at);
          if (mins >= 0 && mins <= ALERT_WINDOW_MINUTES) {
            this.alertedIds.add(row.id);
            this.dueAlert.set(row);
          }
        }
      },
      error: () => {}
    });
  }

  dismissDailyReminder() {
    localStorage.setItem('reservations-reminder-shown-' + limaDateString(), '1');
    this.showDailyReminder.set(false);
  }

  dismissDueAlert() {
    this.dueAlert.set(null);
  }
}
