import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatMenuModule } from '@angular/material/menu';
import { DialogModule } from 'primeng/dialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Subscription } from 'rxjs';
import { ApiService } from '../core/api.service';
import { RealtimeService } from '../core/realtime.service';
import { VoucherCopy, VoucherPdfService } from '../core/voucher-pdf.service';
import { PdfPreviewDialogComponent } from '../shared/pdf-preview-dialog.component';

type ItemRow = { id: number; product_id: number; product_name: string; quantity: number | string; unit_price: number | string; notes: string | null; delivered_at: string | null };
type RoundRow = { id: number; sent_at: string; completed_at: string | null; items: ItemRow[] };
type OrderRow = { id: number; status: string; opened_at: string; rounds: RoundRow[] };
type TableRow = { id: number; name: string; status: string; capacity: number; active_order: OrderRow | null };
type Product = { id: number; name: string; sku: string; sale_price: number | string; stock: number | string };
type PickLine = { product_id: number; name: string; sale_price: number; quantity: number };

@Component({
  selector: 'app-mesas',
  standalone: true,
  imports: [CurrencyPipe, FormsModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatMenuModule, DialogModule, PdfPreviewDialogComponent],
  template: `
  <section class="mesas-screen">
    <header class="pos-hero">
      <div>
        <span class="eyebrow">Restaurante</span>
        <h1>Gestion de Mesas</h1>
        <p>Monitoreo en tiempo real de la capacidad y estados del salon.</p>
      </div>
      <button mat-flat-button class="primary-action" (click)="openAddTable()"><mat-icon>add</mat-icon>Anadir Mesa</button>
    </header>

    @if (loading) {
      <div class="loading-state"><mat-icon>hourglass_empty</mat-icon><p>Cargando mesas...</p></div>
    } @else if (!tables.length) {
      <div class="empty-state"><mat-icon>table_bar</mat-icon><p>Aun no hay mesas. Crea la primera con "Anadir Mesa".</p></div>
    } @else {
      <div class="stats-row">
        <article class="stat-tile"><mat-icon>table_bar</mat-icon><div><small>Total de Mesas</small><strong>{{tables.length}}</strong></div></article>
        <article class="stat-tile warn"><mat-icon>event_busy</mat-icon><div><small>Ocupadas</small><strong>{{occupiedCount()}}</strong></div></article>
        <article class="stat-tile ok"><mat-icon>check_circle</mat-icon><div><small>Libres</small><strong>{{freeCount()}}</strong></div></article>
      </div>

      <div class="segmented-control">
        <button type="button" [class.active]="tableFilter === 'all'" (click)="tableFilter = 'all'">Todas</button>
        <button type="button" [class.active]="tableFilter === 'free'" (click)="tableFilter = 'free'">Libres</button>
        <button type="button" [class.active]="tableFilter === 'occupied'" (click)="tableFilter = 'occupied'">Ocupadas</button>
      </div>

      <div class="mesas-layout">
        <div class="mesas-grid">
          @for (t of visibleTables(); track t.id) {
            <div class="mesa-card" [class]="'mesa-' + t.status" (click)="openTable(t)">
              <div class="mesa-card-head">
                <div>
                  <strong>{{t.name}}</strong>
                  <span class="mesa-capacity"><mat-icon>groups</mat-icon>{{t.capacity}} personas</span>
                </div>
                <span class="mesa-card-head-right">
                  <span class="mesa-status-chip" [class]="'mesa-status-' + t.status">{{statusLabel(t.status)}}</span>
                  <span class="mesa-menu-trigger" (click)="$event.stopPropagation()" [matMenuTriggerFor]="mesaMenu"><mat-icon>more_vert</mat-icon></span>
                  <mat-menu #mesaMenu="matMenu">
                    <button mat-menu-item (click)="openEditTable(t)"><mat-icon>edit</mat-icon><span>Editar mesa</span></button>
                    @if (t.status === 'free') {
                      <button mat-menu-item (click)="confirmDeleteTable(t)"><mat-icon>delete</mat-icon><span>Eliminar mesa</span></button>
                    }
                  </mat-menu>
                </span>
              </div>
              @if (t.active_order) {
                <div class="mesa-card-body">
                  <span class="mesa-timer-box"><mat-icon>schedule</mat-icon><span><small>TIEMPO</small><b>{{elapsed(t.active_order.opened_at, t.status === 'awaiting_payment' ? lastCompletedAt(t.active_order) : null)}}</b></span></span>
                </div>
                <button type="button" class="mesa-action-btn dark" (click)="$event.stopPropagation(); openTable(t)">Ver Pedido</button>
              } @else {
                <div class="mesa-card-body"><span class="mesa-free-hint">Mesa disponible</span></div>
                <button type="button" class="mesa-action-btn ok" (click)="$event.stopPropagation(); openTable(t)"><mat-icon>add</mat-icon>Abrir Comanda</button>
              }
            </div>
          }
        </div>

        <aside class="kitchen-status-card">
          <h3><mat-icon>soup_kitchen</mat-icon>Estado Cocina</h3>
          <div class="kitchen-status-row"><span>Pedidos Pendientes</span><strong>{{pendingRoundsCount()}}</strong></div>
          <div class="kitchen-status-track"><div class="kitchen-status-fill" [style.width.%]="kitchenWorkloadPercent()"></div></div>
          <small>{{kitchenWorkloadLabel()}}</small>
        </aside>
      </div>
    }

    <!-- Nueva / editar mesa -->
    <p-dialog [(visible)]="addTableOpen" [modal]="true" [dismissableMask]="true" [style]="{ width: 'min(360px, 92vw)' }" [header]="tableModalMode === 'create' ? 'Nueva mesa' : 'Editar mesa'">
      <mat-form-field appearance="outline"><mat-label>Nombre</mat-label><input matInput [(ngModel)]="newTableName" placeholder="Mesa 5" (keyup.enter)="saveTable()"></mat-form-field>
      <mat-form-field appearance="outline"><mat-label>Capacidad (personas)</mat-label><input matInput type="number" min="1" [(ngModel)]="newTableCapacity" (keyup.enter)="saveTable()"></mat-form-field>
      <ng-template pTemplate="footer">
        <div class="modal-actions">
          <button mat-stroked-button (click)="addTableOpen = false">Cancelar</button>
          <button mat-flat-button class="primary-action" [disabled]="!newTableName.trim() || savingTable" (click)="saveTable()"><mat-icon>save</mat-icon>{{tableModalMode === 'create' ? 'Crear' : 'Guardar'}}</button>
        </div>
      </ng-template>
    </p-dialog>

    <!-- Detalle de mesa -->
    <p-dialog [(visible)]="detailOpen" [modal]="true" [dismissableMask]="true" [style]="{ width: 'min(640px, 96vw)' }" [contentStyle]="{ 'max-height': '76vh', overflow: 'auto' }">
      <ng-template pTemplate="header"><h2>{{selected?.name}}</h2></ng-template>
      @if (selected) {
        <div class="mesa-detail">
          @if (!selected.active_order) {
            <div class="empty-state"><mat-icon>restaurant</mat-icon><p>Mesa libre. Agrega productos para abrir un pedido.</p></div>
          } @else {
            @for (round of selected.active_order.rounds; track round.id) {
              <article class="round-card" [class.round-done]="round.completed_at">
                <header>
                  <span><mat-icon>{{round.completed_at ? 'check_circle' : 'timer'}}</mat-icon>Ronda {{round.id}}</span>
                  <b>{{elapsed(round.sent_at, round.completed_at)}}</b>
                </header>
                <div class="round-items">
                  @for (item of round.items; track item.id) {
                    <label class="round-item" [class.delivered]="item.delivered_at">
                      <input type="checkbox" [checked]="!!item.delivered_at" (change)="toggleItem(item)">
                      <span>{{number(item.quantity)}} x {{item.product_name}}</span>
                      <b>{{(number(item.quantity) * number(item.unit_price)) | currency:'PEN':'S/ '}}</b>
                    </label>
                  }
                </div>
              </article>
            }
          }

          <div class="mesa-detail-actions">
            <button mat-stroked-button (click)="openAddRound()"><mat-icon>add_shopping_cart</mat-icon>Agregar productos</button>
            @if (selected.status === 'awaiting_payment') {
              <button mat-flat-button class="pay-btn" (click)="openPayment()"><mat-icon>point_of_sale</mat-icon>Cobrar e Imprimir</button>
            }
          </div>
        </div>
      }
    </p-dialog>

    <!-- Agregar productos / ronda -->
    <p-dialog [(visible)]="roundOpen" [modal]="true" [dismissableMask]="true" [style]="{ width: 'min(560px, 96vw)' }" header="Agregar productos">
      <div class="round-picker">
        <div class="search-pill"><mat-icon>search</mat-icon><input type="text" placeholder="Buscar producto..." [(ngModel)]="productSearch"></div>
        <div class="round-picker-list">
          @for (p of filteredProducts(); track p.id) {
            <button type="button" class="round-picker-item" (click)="addPick(p)">
              <span>{{p.name}}</span>
              <b>{{number(p.sale_price) | currency:'PEN':'S/ '}}</b>
            </button>
          }
        </div>
        @if (picks.length) {
          <div class="round-picker-cart">
            @for (line of picks; track line.product_id) {
              <div class="round-picker-cart-line">
                <span>{{line.name}}</span>
                <div class="qty-control">
                  <button mat-icon-button (click)="decPick(line)"><mat-icon>remove</mat-icon></button>
                  <b>{{line.quantity}}</b>
                  <button mat-icon-button (click)="incPick(line)"><mat-icon>add</mat-icon></button>
                </div>
              </div>
            }
          </div>
        }
      </div>
      <ng-template pTemplate="footer">
        <div class="modal-actions">
          <button mat-stroked-button (click)="roundOpen = false">Cancelar</button>
          <button mat-flat-button class="primary-action" [disabled]="!picks.length || sendingRound" (click)="sendRound()"><mat-icon>send</mat-icon>Enviar a cocina</button>
        </div>
      </ng-template>
    </p-dialog>

    <!-- Cobrar e imprimir -->
    <p-dialog [(visible)]="paymentOpen" [modal]="true" [dismissableMask]="!printing" [closable]="!printing" [style]="{ width: 'min(480px, 94vw)' }" header="Nota de venta">
      @if (selected?.active_order) {
        <div class="sale-preview">
          <div class="sale-preview-row"><span>Mesa</span><b>{{selected?.name}}</b></div>
          <mat-form-field appearance="outline"><mat-label>Cliente</mat-label><input matInput [(ngModel)]="payCustomer"></mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Pago</mat-label>
            <mat-select [(ngModel)]="payMethod">
              <mat-option value="cash">Efectivo</mat-option>
              <mat-option value="yape">Yape</mat-option>
              <mat-option value="plin">Plin</mat-option>
              <mat-option value="card">Tarjeta</mat-option>
              <mat-option value="transfer">Transferencia</mat-option>
              <mat-option value="mixed">Mixto</mat-option>
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline"><mat-label>Propina</mat-label><input matInput type="number" min="0" [(ngModel)]="payTip" (blur)="payTip = clampNonNegative(payTip)"></mat-form-field>
          <div class="sale-preview-items">
            @for (line of chargeItems(); track line.product_id) {
              <div class="sale-preview-item"><span>{{line.quantity}} x {{line.name}}</span><b>{{(line.quantity * line.sale_price) | currency:'PEN':'S/ '}}</b></div>
            }
          </div>
          <div class="sale-preview-row total"><span>Total estimado</span><b>{{chargeTotal() | currency:'PEN':'S/ '}}</b></div>
        </div>
      }
      <ng-template pTemplate="footer">
        <div class="modal-actions">
          <button mat-stroked-button [disabled]="printing" (click)="paymentOpen = false">Cancelar</button>
          <button mat-flat-button class="primary-action" [disabled]="printing" (click)="confirmCharge()"><mat-icon>print</mat-icon>{{printing ? 'Imprimiendo...' : 'Cobrar e Imprimir'}}</button>
        </div>
      </ng-template>
    </p-dialog>

    <app-pdf-preview-dialog [visible]="pdfPreviewVisible" [pdfUrl]="pdfPreviewUrl" [title]="pdfPreviewTitle" (visibleChange)="pdfPreviewVisible = $event" (closed)="onPdfPreviewClosed()" />
  </section>`,
  styles: [`
    .mesas-screen { display: flex; flex-direction: column; gap: 18px; }
    .segmented-control { align-self: flex-start; }
    .mesas-layout { display: grid; grid-template-columns: 1fr 260px; gap: 18px; align-items: start; }
    @media (max-width: 900px) { .mesas-layout { grid-template-columns: 1fr; } }
    .mesas-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 14px; }
    .mesa-card { position: relative; text-align: left; border: 2px solid var(--soft-line); border-radius: 14px; background: var(--surface); padding: 16px; cursor: pointer; display: flex; flex-direction: column; gap: 12px; transition: border-color .15s, transform .15s; }
    .mesa-card:hover { transform: translateY(-2px); }
    .mesa-card-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
    .mesa-card-head strong { display: block; font-size: 17px; }
    .mesa-capacity { display: flex; align-items: center; gap: 4px; margin-top: 3px; color: var(--muted); font-size: 12px; }
    .mesa-capacity mat-icon { font-size: 15px; width: 15px; height: 15px; }
    .mesa-card-head-right { display: flex; align-items: center; gap: 4px; flex: none; }
    .mesa-status-chip { display: inline-flex; align-items: center; min-height: 24px; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 800; text-transform: uppercase; }
    .mesa-status-free { background: #e8f7f1; color: #047857; }
    .mesa-status-occupied { background: #fde8e8; color: #c22a2a; }
    .mesa-status-awaiting_payment { background: #fff1e0; color: #c2410c; }
    .mesa-card-body { display: flex; flex-direction: column; gap: 4px; color: var(--muted); font-size: 13px; }
    .mesa-timer-box { display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-radius: 8px; background: var(--surface-2); }
    .mesa-timer-box mat-icon { color: var(--muted); }
    .mesa-timer-box small { display: block; color: var(--muted); font-size: 10px; font-weight: 800; letter-spacing: .04em; }
    .mesa-timer-box b { display: block; color: var(--ink); font-size: 14px; }
    .mesa-free-hint { color: var(--muted); font-style: italic; }
    .mesa-menu-trigger { flex: none; display: flex; align-items: center; justify-content: center; width: 26px; height: 26px; border-radius: 50%; color: var(--muted); transition: background .15s; }
    .mesa-menu-trigger:hover { background: var(--surface-2); color: var(--ink); }
    .mesa-menu-trigger mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .mesa-action-btn {
      display: flex; align-items: center; justify-content: center; gap: 6px; height: 40px; border: none; border-radius: 8px;
      font-size: 13px; font-weight: 800; cursor: pointer; text-transform: uppercase; letter-spacing: .03em;
    }
    .mesa-action-btn.dark { background: #475569; color: #fff; }
    .mesa-action-btn.dark:hover { background: #334155; }
    .mesa-action-btn.ok { background: var(--primary); color: #fff; }
    .mesa-action-btn.ok:hover { background: var(--primary-strong); }
    .mesa-occupied { border-color: #f0b8b8; }
    .mesa-awaiting_payment { border-color: #fbceac; }
    .mesa-free { border-color: var(--soft-line); }
    .stat-tile.ok mat-icon { background: #e8f7f1; color: #047857; }
    .kitchen-status-card { border: 1px solid #1c2b23; border-radius: 14px; background: #0e1c17; color: #fff; padding: 18px; display: flex; flex-direction: column; gap: 10px; }
    .kitchen-status-card h3 { margin: 0 0 4px; display: flex; align-items: center; gap: 8px; font-size: 14px; }
    .kitchen-status-row { display: flex; align-items: center; justify-content: space-between; font-size: 13px; color: rgba(255,255,255,.75); }
    .kitchen-status-row strong { font-size: 20px; color: #fff; }
    .kitchen-status-track { height: 6px; border-radius: 999px; background: rgba(255,255,255,.15); overflow: hidden; }
    .kitchen-status-fill { height: 100%; border-radius: 999px; background: #4fd1a5; }
    .kitchen-status-card small { color: rgba(255,255,255,.6); font-size: 11px; }

    .mesa-detail { display: flex; flex-direction: column; gap: 14px; }
    .round-card { border: 1px solid var(--soft-line); border-radius: 10px; padding: 12px; }
    .round-card header { display: flex; align-items: center; justify-content: space-between; font-size: 13px; font-weight: 700; color: var(--muted); margin-bottom: 8px; }
    .round-card header mat-icon { font-size: 16px; width: 16px; height: 16px; vertical-align: middle; margin-right: 4px; }
    .round-card.round-done header { color: #16a34a; }
    .round-items { display: flex; flex-direction: column; gap: 6px; }
    .round-item { display: flex; align-items: center; gap: 10px; font-size: 14px; padding: 6px 4px; border-radius: 6px; }
    .round-item span { flex: 1; }
    .round-item.delivered span { text-decoration: line-through; color: var(--muted); }
    .mesa-detail-actions { display: flex; gap: 10px; flex-wrap: wrap; justify-content: flex-end; }
    .pay-btn { background: #16a34a !important; color: #fff !important; }

    .round-picker { display: flex; flex-direction: column; gap: 12px; }
    .round-picker-list { display: flex; flex-direction: column; gap: 4px; max-height: 220px; overflow: auto; border: 1px solid var(--soft-line); border-radius: 8px; }
    .round-picker-item { display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; border: none; background: transparent; cursor: pointer; text-align: left; }
    .round-picker-item:hover { background: var(--surface-2); }
    .round-picker-cart { display: flex; flex-direction: column; gap: 6px; border-top: 1px dashed var(--line); padding-top: 10px; }
    .round-picker-cart-line { display: flex; align-items: center; justify-content: space-between; }
    .qty-control { display: flex; align-items: center; gap: 4px; }

    .modal-actions { display: flex; justify-content: flex-end; gap: 10px; }
    html.app-dark .mesa-card, html.app-dark .round-card { background: var(--surface); }
    html.app-dark .mesa-free { border-color: var(--line); }
    html.app-dark .mesa-timer-box { background: var(--surface-2); }
  `]
})
export class MesasComponent implements OnInit, OnDestroy {
  api = inject(ApiService); cdr = inject(ChangeDetectorRef); messages = inject(MessageService); confirmation = inject(ConfirmationService);
  realtime = inject(RealtimeService); voucherPdf = inject(VoucherPdfService);

  tables: TableRow[] = [];
  loading = false;
  now = Date.now();
  private tickTimer?: ReturnType<typeof setInterval>;
  private subs: Subscription[] = [];

  addTableOpen = false; newTableName = ''; newTableCapacity = 4; savingTable = false;
  tableModalMode: 'create' | 'edit' = 'create'; editingTableId: number | null = null;
  detailOpen = false; selected: TableRow | null = null;
  tableFilter: 'all' | 'free' | 'occupied' = 'all';

  roundOpen = false; allProducts: Product[] = []; productSearch = ''; picks: PickLine[] = []; sendingRound = false;

  paymentOpen = false; payCustomer = 'Cliente General'; payMethod = 'cash'; payTip = 0; printing = false;

  pdfPreviewVisible = false; pdfPreviewUrl: string | null = null; pdfPreviewTitle = '';
  private pdfPreviewResolve: (() => void) | null = null;

  statusLabels: Record<string, string> = { free: 'Libre', occupied: 'Ocupada', awaiting_payment: 'Por cobrar' };

  ngOnInit() {
    this.load();
    this.loadProducts();
    this.tickTimer = setInterval(() => { this.now = Date.now(); this.cdr.detectChanges(); }, 1000);
    this.subs.push(this.realtime.tableRoundSent$.subscribe(() => this.load(true)));
    this.subs.push(this.realtime.tableItemDelivered$.subscribe(() => this.load(true)));
    this.subs.push(this.realtime.tableFreed$.subscribe(() => this.load(true)));
  }

  ngOnDestroy() {
    if (this.tickTimer) clearInterval(this.tickTimer);
    this.subs.forEach(s => s.unsubscribe());
  }

  load(silent = false) {
    if (!silent) { this.loading = true; this.cdr.detectChanges(); }
    this.api.get<TableRow[]>('tables').subscribe({
      next: (rows: any) => {
        this.tables = Array.isArray(rows) ? rows : [];
        if (this.selected) this.selected = this.tables.find(t => t.id === this.selected!.id) || null;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => { this.loading = false; this.cdr.detectChanges(); }
    });
  }

  loadProducts() {
    this.api.get<any>('products').subscribe((r: any) => {
      this.allProducts = Array.isArray(r) ? r : (r?.data || []);
      this.cdr.detectChanges();
    });
  }

  statusLabel(status: string) { return this.statusLabels[status] || status; }
  number(value: unknown) { return Number(value || 0); }
  clampNonNegative(value: unknown) { return Math.max(0, this.number(value)); }
  itemCount(order: OrderRow) { return order.rounds.reduce((sum, r) => sum + r.items.length, 0); }
  lastCompletedAt(order: OrderRow): string | null {
    const dates = order.rounds.map(r => r.completed_at).filter(Boolean) as string[];
    return dates.length ? dates.sort().slice(-1)[0] : null;
  }

  elapsed(start: string, end: string | null): string {
    const startMs = new Date(start).getTime();
    const endMs = end ? new Date(end).getTime() : this.now;
    const totalSeconds = Math.max(0, Math.floor((endMs - startMs) / 1000));
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    const h = Math.floor(m / 60);
    if (h > 0) return `${h}h ${m % 60}m`;
    return `${m}m ${String(s).padStart(2, '0')}s`;
  }

  occupiedCount() { return this.tables.filter(t => t.status !== 'free').length; }
  freeCount() { return this.tables.filter(t => t.status === 'free').length; }
  visibleTables(): TableRow[] {
    if (this.tableFilter === 'free') return this.tables.filter(t => t.status === 'free');
    if (this.tableFilter === 'occupied') return this.tables.filter(t => t.status !== 'free');
    return this.tables;
  }
  pendingRoundsCount(): number {
    let count = 0;
    for (const t of this.tables) {
      if (!t.active_order) continue;
      for (const r of t.active_order.rounds) if (!r.completed_at) count++;
    }
    return count;
  }
  kitchenWorkloadPercent() { return Math.min(100, Math.round((this.pendingRoundsCount() / 10) * 100)); }
  kitchenWorkloadLabel(): string {
    const n = this.pendingRoundsCount();
    if (n === 0) return 'Sin pedidos pendientes.';
    if (n <= 3) return 'Carga de trabajo baja.';
    if (n <= 7) return 'Carga de trabajo moderada.';
    return 'Carga de trabajo alta.';
  }

  openAddTable() { this.tableModalMode = 'create'; this.editingTableId = null; this.newTableName = this.nextTableName(); this.newTableCapacity = 4; this.addTableOpen = true; }
  openEditTable(table: TableRow) { this.tableModalMode = 'edit'; this.editingTableId = table.id; this.newTableName = table.name; this.newTableCapacity = table.capacity || 4; this.addTableOpen = true; }

  nextTableName(): string {
    const numbers = this.tables
      .map(t => /^Mesa\s+(\d+)$/i.exec(t.name.trim()))
      .filter((m): m is RegExpExecArray => !!m)
      .map(m => Number(m[1]));
    const next = (numbers.length ? Math.max(...numbers) : 0) + 1;
    return `Mesa ${next}`;
  }
  saveTable() {
    const name = this.newTableName.trim();
    if (!name || this.savingTable) return;
    this.savingTable = true;
    const capacity = Math.max(1, this.number(this.newTableCapacity) || 4);
    const req = this.tableModalMode === 'create'
      ? this.api.post<TableRow>('tables', { name, capacity })
      : this.api.put<TableRow>(`tables/${this.editingTableId}`, { name, capacity });
    req.subscribe({
      next: () => {
        this.savingTable = false; this.addTableOpen = false;
        this.messages.add({ severity: 'success', summary: this.tableModalMode === 'create' ? 'Mesa creada' : 'Mesa actualizada', detail: `"${name}" ${this.tableModalMode === 'create' ? 'agregada' : 'actualizada'}.` });
        this.load();
      },
      error: (err: any) => { this.savingTable = false; this.messages.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'No se pudo guardar la mesa.' }); }
    });
  }

  confirmDeleteTable(table: TableRow) {
    this.confirmation.confirm({
      header: 'Confirmar eliminacion', message: `Seguro que deseas eliminar "${table.name}"?`, icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Eliminar', rejectLabel: 'Cancelar', acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.deleteTable(table)
    });
  }

  deleteTable(table: TableRow) {
    this.api.delete(`tables/${table.id}`).subscribe({
      next: () => { this.messages.add({ severity: 'success', summary: 'Mesa eliminada', detail: `"${table.name}" eliminada.` }); this.load(); },
      error: (err: any) => this.messages.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'No se pudo eliminar la mesa.' })
    });
  }

  openTable(table: TableRow) { this.selected = table; this.detailOpen = true; }

  toggleItem(item: ItemRow) {
    const previous = item.delivered_at;
    item.delivered_at = previous ? null : new Date().toISOString();
    this.cdr.detectChanges();
    this.api.patch<any>(`table-order-items/${item.id}/deliver`, {}).subscribe({
      next: () => this.load(true),
      error: (err: any) => {
        item.delivered_at = previous;
        this.cdr.detectChanges();
        this.messages.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'No se pudo actualizar el item.' });
      }
    });
  }

  filteredProducts(): Product[] {
    const term = this.productSearch.toLowerCase().trim();
    const list = term ? this.allProducts.filter(p => p.name.toLowerCase().includes(term) || p.sku?.toLowerCase().includes(term)) : this.allProducts;
    return list.slice(0, 30);
  }

  openAddRound() { this.picks = []; this.productSearch = ''; this.roundOpen = true; }
  addPick(p: Product) {
    const line = this.picks.find(x => x.product_id === p.id);
    if (line) { line.quantity++; return; }
    this.picks.push({ product_id: p.id, name: p.name, sale_price: this.number(p.sale_price), quantity: 1 });
  }
  incPick(line: PickLine) { line.quantity++; }
  decPick(line: PickLine) { line.quantity--; if (line.quantity <= 0) this.picks = this.picks.filter(x => x !== line); }

  sendRound() {
    if (!this.selected || !this.picks.length || this.sendingRound) return;
    this.sendingRound = true;
    const items = this.picks.map(({ product_id, quantity }) => ({ product_id, quantity }));
    this.api.post<RoundRow>(`tables/${this.selected.id}/rounds`, { items }).subscribe({
      next: () => { this.sendingRound = false; this.roundOpen = false; this.messages.add({ severity: 'success', summary: 'Enviado a cocina', detail: 'La ronda se envio correctamente.' }); this.load(); },
      error: (err: any) => { this.sendingRound = false; this.messages.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'No se pudo enviar el pedido.' }); }
    });
  }

  chargeItems(): PickLine[] {
    if (!this.selected?.active_order) return [];
    const grouped = new Map<number, PickLine>();
    for (const round of this.selected.active_order.rounds) {
      for (const item of round.items) {
        const existing = grouped.get(item.product_id);
        const qty = this.number(item.quantity);
        if (existing) existing.quantity += qty;
        else grouped.set(item.product_id, { product_id: item.product_id, name: item.product_name, sale_price: this.number(item.unit_price), quantity: qty });
      }
    }
    return Array.from(grouped.values());
  }
  chargeTotal() { return this.chargeItems().reduce((s, l) => s + l.sale_price * l.quantity, 0) + this.number(this.payTip); }

  openPayment() {
    if (!this.selected) return;
    this.payCustomer = 'Cliente General'; this.payMethod = 'cash'; this.payTip = 0;
    this.paymentOpen = true;
  }

  confirmCharge() {
    if (!this.selected?.active_order || this.printing) return;
    const orderId = this.selected.active_order.id;
    this.api.post<any>(`table-orders/${orderId}/charge`, {
      customer_name: this.payCustomer, payment_method: this.payMethod, tip: this.payTip
    }).subscribe({
      next: async (sale: any) => {
        this.paymentOpen = false;
        this.detailOpen = false;
        this.printing = true;
        this.cdr.detectChanges();
        try {
          await this.printSale(sale.id, 'customer', true);
          await this.printSale(sale.id, 'local', true);
        } finally {
          this.printing = false;
          this.cdr.detectChanges();
          this.load();
        }
      },
      error: (err: any) => this.messages.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'No se pudo cobrar la mesa.' })
    });
  }

  async printSale(saleId: number, copy: VoucherCopy, generate: boolean) {
    let url: string;
    try {
      url = generate ? await this.voucherPdf.generateAndOpen(saleId, copy) : await this.voucherPdf.fetchObjectUrl(saleId, copy);
    } catch (err: any) {
      const detail = err?.status === 401 ? 'Tu sesion expiro. Vuelve a iniciar sesion e intenta de nuevo.' : (err?.error?.message || 'No se pudo generar el comprobante en PDF.');
      this.messages.add({ severity: 'error', summary: 'Error al imprimir', detail });
      return;
    }
    this.pdfPreviewTitle = copy === 'local' ? 'Comanda - Cocina / Local' : 'Boleta - Cliente';
    this.pdfPreviewUrl = url;
    this.pdfPreviewVisible = true;
    this.cdr.detectChanges();
    await new Promise<void>(resolve => { this.pdfPreviewResolve = resolve; });
  }

  onPdfPreviewClosed() {
    if (this.pdfPreviewUrl) URL.revokeObjectURL(this.pdfPreviewUrl);
    this.pdfPreviewUrl = null;
    this.pdfPreviewResolve?.();
    this.pdfPreviewResolve = null;
  }
}
