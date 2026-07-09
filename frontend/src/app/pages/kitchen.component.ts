import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MessageService } from 'primeng/api';
import { Subscription } from 'rxjs';
import { ApiService } from '../core/api.service';
import { RealtimeService } from '../core/realtime.service';

type KitchenItem = { id: number; product_name: string; quantity: number | string; notes: string | null; delivered_at: string | null };
type KitchenRound = { id: number; sent_at: string; items: KitchenItem[] };
type KitchenTicket = { id: number; type: string; type_label: string; table_name: string | null; creator: { id: number; name: string } | null; opened_at: string; rounds: KitchenRound[] };

@Component({
  selector: 'app-kitchen',
  standalone: true,
  imports: [MatIconModule],
  template: `
  <section class="kitchen-screen">
    <header class="kitchen-topbar">
      <div class="kitchen-topbar-left">
        <button type="button" class="icon-btn" (click)="goBack()"><mat-icon>arrow_back</mat-icon></button>
        <h1>COCINA</h1>
      </div>
      <div class="kitchen-topbar-center">
        <span class="kitchen-tickets-pill"><mat-icon>receipt_long</mat-icon>TICKETS {{tickets.length}}</span>
        <span class="kitchen-clock">{{clockText}}</span>
        <span class="kitchen-connection" [class.online]="realtime.connected()"><i class="dot"></i>{{realtime.connected() ? 'Conectado' : 'Desconectado'}}</span>
      </div>
      <div class="kitchen-topbar-right">
        <button type="button" class="icon-btn" (click)="toggleFullscreen()"><mat-icon>{{isFullscreen ? 'fullscreen_exit' : 'fullscreen'}}</mat-icon></button>
        <button type="button" class="icon-btn" (click)="load()"><mat-icon>refresh</mat-icon></button>
      </div>
    </header>

    @if (loading) {
      <div class="loading-state"><mat-icon>hourglass_empty</mat-icon><p>Cargando tickets...</p></div>
    } @else if (!tickets.length) {
      <div class="empty-state"><mat-icon>soup_kitchen</mat-icon><p>No hay pedidos pendientes en cocina.</p></div>
    } @else {
      <div class="kitchen-grid">
        @for (t of tickets; track t.id) {
          <article class="kitchen-ticket">
            <header class="kitchen-ticket-head">
              <div>
                <b>#{{t.id}}</b>
                <small>{{t.table_name || t.type_label}}</small>
              </div>
              <div class="kitchen-ticket-timer"><mat-icon>schedule</mat-icon>{{elapsed(t.opened_at)}}</div>
            </header>
            @if (t.creator) { <div class="kitchen-ticket-assignee"><mat-icon>person</mat-icon>{{t.creator.name}}</div> }
            <div class="kitchen-ticket-items">
              @for (round of t.rounds; track round.id) {
                @for (item of round.items; track item.id) {
                  <button type="button" class="kitchen-item" [class.done]="item.delivered_at" (click)="toggleItem(item, t)">
                    <span class="kitchen-item-qty">{{number(item.quantity)}}x</span>
                    <span class="kitchen-item-name">
                      {{item.product_name}}
                      <small>{{elapsed(round.sent_at)}}</small>
                    </span>
                    @if (item.delivered_at) { <mat-icon class="kitchen-item-check">check</mat-icon> }
                  </button>
                }
              }
            </div>
            <button type="button" class="kitchen-ticket-done-btn" [disabled]="!pendingCount(t)" (click)="completeTicket(t)">
              <mat-icon>check</mat-icon>LISTO
            </button>
          </article>
        }
      </div>
    }
  </section>`,
  styles: [`
    .kitchen-screen { display: flex; flex-direction: column; gap: 18px; }
    .kitchen-topbar { display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap; padding-bottom: 12px; border-bottom: 1px solid var(--line); }
    .kitchen-topbar-left { display: flex; align-items: center; gap: 10px; }
    .kitchen-topbar-left h1 { margin: 0; font-size: 18px; letter-spacing: .04em; }
    .kitchen-topbar-center { display: flex; align-items: center; gap: 14px; color: var(--muted); font-size: 13px; }
    .kitchen-tickets-pill { display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px; border-radius: 999px; background: var(--surface-2); font-weight: 800; color: var(--ink); }
    .kitchen-tickets-pill mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .kitchen-connection { display: flex; align-items: center; gap: 6px; }
    .kitchen-connection .dot { width: 8px; height: 8px; border-radius: 50%; background: #c22a2a; display: inline-block; }
    .kitchen-connection.online .dot { background: #16a34a; }
    .kitchen-topbar-right { display: flex; align-items: center; gap: 8px; }

    .kitchen-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; }
    .kitchen-ticket { display: flex; flex-direction: column; border: 1px solid var(--soft-line); border-radius: 12px; overflow: hidden; background: var(--surface); box-shadow: var(--shadow); }
    .kitchen-ticket-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; padding: 12px 14px; background: #171f2b; color: #fff; }
    .kitchen-ticket-head b { display: block; font-size: 16px; }
    .kitchen-ticket-head small { color: rgba(255,255,255,.6); text-transform: lowercase; font-size: 12px; }
    .kitchen-ticket-timer { display: flex; align-items: center; gap: 4px; font-weight: 800; font-size: 13px; }
    .kitchen-ticket-timer mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .kitchen-ticket-assignee { display: flex; align-items: center; gap: 6px; padding: 8px 14px 0; color: var(--muted); font-size: 12px; }
    .kitchen-ticket-assignee mat-icon { font-size: 14px; width: 14px; height: 14px; }
    .kitchen-ticket-items { display: flex; flex-direction: column; padding: 10px 8px; gap: 2px; }
    .kitchen-item { display: flex; align-items: center; gap: 10px; width: 100%; padding: 10px 8px; border: none; background: transparent; cursor: pointer; text-align: left; border-radius: 8px; }
    .kitchen-item:hover { background: var(--surface-2); }
    .kitchen-item-qty { flex: none; font-weight: 800; color: var(--primary-strong); }
    .kitchen-item-name { flex: 1; display: flex; flex-direction: column; font-weight: 700; font-size: 14px; }
    .kitchen-item-name small { color: var(--muted); font-weight: 500; font-size: 11px; }
    .kitchen-item.done .kitchen-item-name { text-decoration: line-through; color: var(--muted); }
    .kitchen-item-check { color: #16a34a; }
    .kitchen-ticket-done-btn {
      display: flex; align-items: center; justify-content: center; gap: 8px; height: 46px; margin: 8px; border: none; border-radius: 8px;
      background: #171f2b; color: #fff; font-weight: 800; letter-spacing: .03em; cursor: pointer;
    }
    .kitchen-ticket-done-btn:disabled { opacity: .35; cursor: not-allowed; }
    html.app-dark .kitchen-ticket-head { background: #0e1c17; }
  `]
})
export class KitchenComponent implements OnInit, OnDestroy {
  api = inject(ApiService); cdr = inject(ChangeDetectorRef); messages = inject(MessageService);
  realtime = inject(RealtimeService); router = inject(Router);

  tickets: KitchenTicket[] = [];
  loading = false;
  isFullscreen = false;
  clockText = '';

  private clockTimer?: ReturnType<typeof setInterval>;
  private subs: Subscription[] = [];

  ngOnInit() {
    this.load();
    this.updateClock();
    this.clockTimer = setInterval(() => { this.updateClock(); this.cdr.detectChanges(); }, 1000);
    this.subs.push(this.realtime.tableRoundSent$.subscribe(() => this.load(true)));
    this.subs.push(this.realtime.tableItemDelivered$.subscribe(() => this.load(true)));
    document.addEventListener('fullscreenchange', this.onFullscreenChange);
  }

  ngOnDestroy() {
    if (this.clockTimer) clearInterval(this.clockTimer);
    this.subs.forEach(s => s.unsubscribe());
    document.removeEventListener('fullscreenchange', this.onFullscreenChange);
  }

  onFullscreenChange = () => { this.isFullscreen = !!document.fullscreenElement; this.cdr.detectChanges(); };

  updateClock() { this.clockText = new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }); }

  goBack() { this.router.navigateByUrl('/app/orders'); }

  toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen().catch(() => {});
  }

  load(silent = false) {
    if (!silent) { this.loading = true; this.cdr.detectChanges(); }
    this.api.get<KitchenTicket[]>('orders-kitchen').subscribe({
      next: (r: any) => { this.tickets = Array.isArray(r) ? r : []; this.loading = false; this.cdr.detectChanges(); },
      error: () => { this.tickets = []; this.loading = false; this.cdr.detectChanges(); }
    });
  }

  number(value: unknown) { return Number(value || 0); }

  elapsed(start: string): string {
    const totalSeconds = Math.max(0, Math.floor((Date.now() - new Date(start).getTime()) / 1000));
    if (totalSeconds < 60) return `${totalSeconds}s`;
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    const h = Math.floor(m / 60);
    if (h > 0) return `${h}h ${m % 60}m`;
    return `${m}m ${s}s`;
  }

  pendingCount(t: KitchenTicket): number {
    return t.rounds.reduce((sum, r) => sum + r.items.filter(i => !i.delivered_at).length, 0);
  }

  toggleItem(item: KitchenItem, ticket: KitchenTicket) {
    const previous = item.delivered_at;
    item.delivered_at = previous ? null : new Date().toISOString();
    this.cdr.detectChanges();
    this.api.patch<any>(`table-order-items/${item.id}/deliver`, {}).subscribe({
      next: () => { this.messages.add({ severity: 'success', summary: 'Item marcado como listo', detail: `"${item.product_name}" listo para entregar.` }); this.load(true); },
      error: (err: any) => { item.delivered_at = previous; this.cdr.detectChanges(); this.messages.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'No se pudo actualizar el item.' }); }
    });
  }

  completeTicket(ticket: KitchenTicket) {
    const pending = ticket.rounds.flatMap(r => r.items).filter(i => !i.delivered_at);
    if (!pending.length) return;
    Promise.all(pending.map(item => this.api.patch<any>(`table-order-items/${item.id}/deliver`, {}).toPromise())).then(() => {
      this.messages.add({ severity: 'success', summary: 'Ticket listo', detail: `Orden #${ticket.id} lista para entregar.` });
      this.load();
    }).catch((err: any) => {
      this.messages.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'No se pudo completar el ticket.' });
      this.load();
    });
  }
}
