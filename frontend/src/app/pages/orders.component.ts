import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { DialogModule } from 'primeng/dialog';
import { MessageService } from 'primeng/api';
import { Subscription, firstValueFrom } from 'rxjs';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { RealtimeService } from '../core/realtime.service';
import { limaDateString } from '../core/lima-time';
import { VoucherCopy, VoucherPdfService } from '../core/voucher-pdf.service';
import { PdfPreviewDialogComponent } from '../shared/pdf-preview-dialog.component';

type ItemRow = { id: number; product_id: number; product_name: string; quantity: number | string; unit_price: number | string; notes: string | null; delivered_at: string | null };
type RoundRow = { id: number; sent_at: string; completed_at: string | null; items: ItemRow[] };
type OrderRow = {
  id: number; type: string; type_label: string; status: string;
  table: { id: number; name: string; capacity: number; zone: string | null } | null;
  customer_name: string | null; customer_phone: string | null; delivery_address: string | null; notes: string | null;
  tip: number | string; total: number; amount_paid: number; balance_due: number; sale_id: number | null;
  creator: { id: number; name: string } | null;
  opened_at: string; closed_at: string | null;
  cancel_reason: string | null; cancelled_at: string | null; canceller: { id: number; name: string } | null;
  rounds: RoundRow[];
};
type OrderStats = {
  total_orders: number; paid_count: number; paid_percent: number | null;
  pending_payment_count: number; pending_payment_percent: number | null;
  total_sales: number; avg_ticket: number | null;
};
type Product = { id: number; name: string; sku: string; sale_price: number | string; image_path?: string };
type PickLine = { product_id: number; name: string; sale_price: number; quantity: number };

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, FormsModule, RouterLink, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, MatSelectModule, DialogModule, PdfPreviewDialogComponent],
  template: `
  <section class="mesas-screen">
    <header class="pos-hero">
      <div>
        <span class="eyebrow">Restaurante</span>
        <h1>Ordenes del Turno</h1>
        <p>{{cashPillText()}}</p>
      </div>
      <div class="header-actions">
        @if (auth.hasPermission('kitchen.view')) {
          <a mat-stroked-button routerLink="/app/kitchen"><mat-icon>soup_kitchen</mat-icon>Cocina</a>
        }
        <button mat-stroked-button [class.active-toggle]="statusFilter === 'paid'" (click)="toggleHistory()"><mat-icon>history</mat-icon>Historial</button>
        <a mat-flat-button class="primary-action" routerLink="/app/orders/new"><mat-icon>add</mat-icon>Crear Orden</a>
      </div>
    </header>

    @if (stats) {
      <div class="stats-row">
        <article class="stat-tile"><mat-icon>receipt_long</mat-icon><div><small>Ordenes Hoy</small><strong>{{stats.total_orders}}</strong></div></article>
        <article class="stat-tile ok"><mat-icon>check_circle</mat-icon><div><small>Pagadas</small><strong>{{stats.paid_count}}</strong>
          @if (stats.paid_percent === null) { <span class="stat-trend neutral">Sin datos</span> } @else { <span class="stat-trend positive">{{stats.paid_percent}}%</span> }
        </div></article>
        <article class="stat-tile warn"><mat-icon>hourglass_top</mat-icon><div><small>Por Cobrar</small><strong>{{stats.pending_payment_count}}</strong>
          @if (stats.pending_payment_percent === null) { <span class="stat-trend neutral">Sin datos</span> } @else { <span class="stat-trend info">{{stats.pending_payment_percent}}%</span> }
        </div></article>
        <article class="stat-tile"><mat-icon>payments</mat-icon><div><small>Ventas Totales</small><strong>{{number(stats.total_sales) | currency:'PEN':'S/ '}}</strong>
          @if (stats.avg_ticket === null) { <span class="stat-trend neutral">Sin ventas</span> } @else { <span class="stat-trend info">Ticket prom. {{number(stats.avg_ticket) | currency:'PEN':'S/ '}}</span> }
        </div></article>
      </div>
    }

    <div class="orders-filters">
      <select class="date-preset-select" [(ngModel)]="statusFilter" (ngModelChange)="onFiltersChange()">
        <option value="active">Ordenes Activas</option>
        <option value="">Todos los Estados</option>
        <option value="open">Abiertas</option>
        <option value="awaiting_payment">Por Cobrar</option>
        <option value="paid">Pagadas</option>
        <option value="cancelled">Canceladas</option>
      </select>
      <select class="date-preset-select" [(ngModel)]="typeFilter" (ngModelChange)="onFiltersChange()">
        <option value="">Todos los Tipos</option>
        <option value="mesa">Mesa</option>
        <option value="para_llevar">Para llevar</option>
        <option value="delivery">Delivery</option>
      </select>
      <select class="date-preset-select" [(ngModel)]="creatorFilter" (ngModelChange)="onFiltersChange()">
        <option value="">Persona Asignada: Todas</option>
        @for (person of knownCreators(); track person.id) { <option [value]="person.id">{{person.name}}</option> }
      </select>
    </div>

    @if (loading) {
      <div class="loading-state"><mat-icon>hourglass_empty</mat-icon><p>Cargando ordenes...</p></div>
    } @else if (!rows.length) {
      <div class="empty-state"><mat-icon>receipt_long</mat-icon><p>No hay ordenes para estos filtros.</p></div>
    } @else {
      <div class="orders-grid">
        @for (o of rows; track o.id) {
          <article class="order-card-v2" (click)="openOrder(o)">
            <div class="order-card-v2-top">
              <span class="order-code-badge">#{{orderCode(o.id)}}</span>
              <span class="order-type-badge"><mat-icon>{{typeIcon(o.type)}}</mat-icon>{{o.type_label}}</span>
              <span class="mesa-status-chip" [class]="'order-status-chip-' + o.status">{{statusLabel(o.status)}}</span>
            </div>
            <div class="order-card-v2-price-row">
              <b class="order-card-v2-price">{{o.total | currency:'PEN':'S/ '}}</b>
              <span class="order-card-v2-time">{{o.opened_at | date:'HH:mm'}}</span>
            </div>
            <div class="order-card-v2-subtitle">{{o.table?.name || o.type_label}}</div>
            <div class="order-card-v2-items-head">PLATOS</div>
            <div class="order-card-v2-items">
              @for (line of itemLines(o).slice(0, 4); track line.key) {
                <div class="order-card-v2-item-row"><span>{{line.qty}}x {{line.name}}</span><b>{{line.total | currency:'PEN':'S/ '}}</b></div>
              }
            </div>
            <footer class="order-card-v2-foot">
              <span>{{itemCount(o)}} item(s)</span>
              <span>{{o.creator?.name || 'Sin asignar'}}</span>
              <span>{{o.opened_at | date:'dd/MM/yyyy'}}</span>
            </footer>
          </article>
        }
      </div>
      @if (total > 0) {
        <div class="pagination-bar">
          <span class="pagination-label">Mostrando {{rangeStart()}} - {{rangeEnd()}} de {{total}} ordenes</span>
          <div class="pagination-controls">
            <button type="button" class="page-btn" [disabled]="page <= 1" (click)="goToPage(page - 1)"><mat-icon>chevron_left</mat-icon></button>
            @for (p of pageNumbers(); track p) { <button type="button" class="page-btn" [class.current]="p === page" (click)="goToPage(p)">{{p}}</button> }
            <button type="button" class="page-btn" [disabled]="page >= lastPage" (click)="goToPage(page + 1)"><mat-icon>chevron_right</mat-icon></button>
          </div>
        </div>
      }
    }

    <!-- Detalle de orden (panel lateral) -->
    @if (detailOpen && selected) {
      <div class="side-panel-backdrop" (click)="detailOpen = false"></div>
      <aside class="side-panel">
        <header class="side-panel-header">
          <div class="order-modal-header">
            <div class="order-modal-header-left">
              <span class="order-code-badge lg">#{{orderCode(selected.id)}}</span>
              <span class="mesa-status-chip" [class]="'order-status-chip-' + selected.status">{{statusLabel(selected.status)}}</span>
            </div>
            <div class="side-panel-header-actions">
              <button type="button" mat-stroked-button [disabled]="selected.status === 'paid'" (click)="openAddRound()"><mat-icon>add</mat-icon>Agregar</button>
              <button type="button" class="side-panel-close" (click)="detailOpen = false"><mat-icon>close</mat-icon></button>
            </div>
          </div>
        </header>

        <div class="side-panel-body">
          <div class="order-modal-subheader">
            <span><mat-icon>{{typeIcon(selected.type)}}</mat-icon>{{selected.type_label}}</span>
            @if (selected.customer_name) { <span><mat-icon>person</mat-icon>{{selected.customer_name}}</span> }
            @if (selected.table) { <span><mat-icon>table_bar</mat-icon>{{selected.table.name}}</span> }
            <span class="order-modal-relative-time"><mat-icon>schedule</mat-icon>{{relativeTime(selected.opened_at)}}</span>
          </div>

          @if (selected.customer_phone || selected.delivery_address) {
            <div class="order-customer-box">
              @if (selected.customer_phone) { <div><mat-icon>call</mat-icon>{{selected.customer_phone}}</div> }
              @if (selected.delivery_address) { <div><mat-icon>place</mat-icon>{{selected.delivery_address}}</div> }
            </div>
          }
          @if (selected.notes) { <div class="order-notes-box"><mat-icon>notes</mat-icon>{{selected.notes}}</div> }
          @if (selected.status === 'cancelled') {
            <div class="order-cancel-box">
              <mat-icon>block</mat-icon>
              <div>
                <b>Orden cancelada{{selected.canceller ? ' por ' + selected.canceller.name : ''}}{{selected.cancelled_at ? ' - ' + (selected.cancelled_at | date:'dd/MM/yyyy HH:mm') : ''}}</b>
                @if (selected.cancel_reason) { <small>Motivo: {{selected.cancel_reason}}</small> }
              </div>
            </div>
          }

          <div class="order-items-section-head">
            <span>ITEMS ({{itemCount(selected)}})</span>
            <span class="order-items-section-meta">{{selected.creator?.name}} &middot; {{selected.opened_at | date:'HH:mm'}}</span>
          </div>

          <div class="order-items-list">
            @for (round of selected.rounds; track round.id) {
              @for (item of round.items; track item.id) {
                <div class="order-item-row" [class.done]="item.delivered_at">
                  <span class="order-item-qty">{{number(item.quantity)}}</span>
                  <div class="order-item-info">
                    <b>{{item.product_name}}</b>
                    <button type="button" class="order-item-toggle" (click)="toggleItem(item)">
                      <mat-icon>{{item.delivered_at ? 'check_circle' : 'radio_button_unchecked'}}</mat-icon>{{item.delivered_at ? 'Listo' : 'Marcar listo'}}
                    </button>
                  </div>
                  <b>{{(number(item.quantity) * number(item.unit_price)) | currency:'PEN':'S/ '}}</b>
                </div>
              }
            }
          </div>

          <div class="order-modal-totals">
            @if (selected.amount_paid > 0) {
              <div class="order-modal-totals-row"><span>Cobro anticipado</span><span>- {{selected.amount_paid | currency:'PEN':'S/ '}}</span></div>
            }
            <div class="order-modal-totals-row grand"><span>Saldo pendiente</span><b>{{selected.balance_due | currency:'PEN':'S/ '}}</b></div>
          </div>
        </div>

        <footer class="side-panel-footer">
          <div class="order-modal-actions">
            <button mat-flat-button class="pay-btn" [disabled]="selected.status === 'paid' || selected.status === 'cancelled'" (click)="openPayment()">
              <mat-icon>payments</mat-icon>Pagar y completar {{selected.balance_due | currency:'PEN':'S/ '}}
            </button>
            <button mat-stroked-button [disabled]="selected.status === 'cancelled' || allItemsDone(selected)" (click)="markAllDone(selected)">
              <mat-icon>done_all</mat-icon>Todo Listo
            </button>
            <div class="order-modal-secondary-actions">
              <button type="button" [disabled]="selected.status === 'paid' || selected.status === 'cancelled' || selected.balance_due <= 0" (click)="openAdvancePayment()"><mat-icon>savings</mat-icon>Cobro anticipado</button>
              <button type="button" (click)="previewDocument('comanda')"><mat-icon>receipt</mat-icon>Comanda</button>
              <button type="button" (click)="previewDocument('precuenta')"><mat-icon>description</mat-icon>Pre-cuenta</button>
              @if (canCancel(selected)) {
                <button type="button" class="order-cancel-btn" (click)="openCancel()"><mat-icon>block</mat-icon>Cancelar Orden</button>
              }
            </div>
          </div>
        </footer>
      </aside>
    }

    <!-- Agregar productos -->
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

    <!-- Cobro anticipado -->
    <p-dialog [(visible)]="advanceOpen" [modal]="true" [dismissableMask]="!savingAdvance" [style]="{ width: 'min(360px, 94vw)' }" header="Cobro anticipado">
      @if (selected) {
        <p class="advance-hint">Saldo pendiente: <b>{{selected.balance_due | currency:'PEN':'S/ '}}</b></p>
        <mat-form-field appearance="outline"><mat-label>Monto a cobrar</mat-label><input matInput type="number" min="0.01" [max]="selected.balance_due" [(ngModel)]="advanceAmount"></mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Pago</mat-label>
          <mat-select [(ngModel)]="advanceMethod">
            <mat-option value="cash">Efectivo</mat-option>
            <mat-option value="yape">Yape</mat-option>
            <mat-option value="plin">Plin</mat-option>
            <mat-option value="card">Tarjeta</mat-option>
            <mat-option value="transfer">Transferencia</mat-option>
          </mat-select>
        </mat-form-field>
      }
      <ng-template pTemplate="footer">
        <div class="modal-actions">
          <button mat-stroked-button [disabled]="savingAdvance" (click)="advanceOpen = false">Cancelar</button>
          <button mat-flat-button class="primary-action" [disabled]="!advanceAmount || advanceAmount <= 0 || savingAdvance" (click)="confirmAdvance()"><mat-icon>savings</mat-icon>Registrar Cobro</button>
        </div>
      </ng-template>
    </p-dialog>

    <!-- Cancelar orden -->
    <p-dialog [(visible)]="cancelOpen" [modal]="true" [dismissableMask]="!cancelling" [style]="{ width: 'min(420px, 94vw)' }" header="Cancelar orden">
      @if (selected) {
        <p class="advance-hint">Se cancelara la orden #{{orderCode(selected.id)}}{{selected.table ? ' (mesa ' + selected.table.name + ')' : ''}}. Esta accion queda registrada en el historial y no se puede deshacer.</p>
        <mat-form-field appearance="outline" class="cancel-reason-field">
          <mat-label>Motivo de la cancelacion</mat-label>
          <textarea matInput rows="3" maxlength="255" [(ngModel)]="cancelReason" placeholder="Ej: orden duplicada, error al tomar el pedido..."></textarea>
        </mat-form-field>
      }
      <ng-template pTemplate="footer">
        <div class="modal-actions">
          <button mat-stroked-button [disabled]="cancelling" (click)="cancelOpen = false">Volver</button>
          <button mat-flat-button class="order-cancel-confirm-btn" [disabled]="!cancelReason.trim() || cancelling" (click)="confirmCancel()"><mat-icon>block</mat-icon>{{cancelling ? 'Cancelando...' : 'Cancelar Orden'}}</button>
        </div>
      </ng-template>
    </p-dialog>

    <!-- Total a Cobrar (modal centrado) -->
    <p-dialog [(visible)]="paymentOpen" [modal]="true" [dismissableMask]="!printing" [showHeader]="false" [style]="{ width: 'min(420px, 94vw)' }" [contentStyle]="{ padding: 0, overflow: 'hidden' }">
      @if (selected) {
        <div class="payment-banner">
          <div class="payment-banner-top">
            <span class="order-code-badge on-brand">#{{orderCode(selected.id)}}</span>
            <button type="button" class="payment-close-btn" [disabled]="printing" (click)="paymentOpen = false"><mat-icon>close</mat-icon></button>
          </div>
          <span class="payment-banner-label">TOTAL A COBRAR</span>
          <strong class="payment-banner-amount">{{chargeTotal() | currency:'PEN':'S/ '}}</strong>
        </div>

        <div class="payment-body">
          <mat-form-field appearance="outline"><mat-label>Cliente</mat-label><input matInput [(ngModel)]="payCustomer"></mat-form-field>

          <div class="payment-method-grid">
            @for (m of paymentMethods; track m.value) {
              <button type="button" class="payment-method-btn" [class.selected]="payMethod === m.value" (click)="selectPaymentMethod(m.value)">
                <mat-icon>{{m.icon}}</mat-icon>
                <span>{{m.label}}</span>
              </button>
            }
          </div>

          <div class="payment-extra-fields">
            <mat-form-field appearance="outline"><mat-label>Descuento %</mat-label><input matInput type="number" min="0" max="100" [(ngModel)]="payDiscountPercent" (blur)="payDiscountPercent = clampPercent(payDiscountPercent)"></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Propina S/</mat-label><input matInput type="number" min="0" [(ngModel)]="payTip" (blur)="payTip = clampNonNegative(payTip)"></mat-form-field>
          </div>

          @if (selected.amount_paid > 0) {
            <div class="payment-summary-row"><span>Cobro anticipado</span><span>- {{selected.amount_paid | currency:'PEN':'S/ '}}</span></div>
          }
          @if (payDiscountPercent > 0) {
            <div class="payment-summary-row"><span>Descuento ({{payDiscountPercent}}%)</span><span>- {{discountAmountPreview() | currency:'PEN':'S/ '}}</span></div>
          }

          @if (payMethod && payMethod !== 'cash') {
            <button mat-flat-button class="pay-btn" [disabled]="printing" (click)="confirmCharge()">
              <mat-icon>print</mat-icon>{{printing ? 'Imprimiendo...' : 'Cobrar e Imprimir'}}
            </button>
          }
        </div>
      }
    </p-dialog>

    <!-- Efectivo: calculadora de monto recibido (modal centrado) -->
    <p-dialog [(visible)]="cashTenderOpen" [modal]="true" [dismissableMask]="!printing" [showHeader]="false" [style]="{ width: 'min(420px, 94vw)' }" [contentStyle]="{ padding: 0, overflow: 'hidden' }">
      @if (selected) {
        <div class="cash-tender-header">
          <button type="button" class="cash-tender-back" [disabled]="printing" (click)="cashTenderOpen = false"><mat-icon>arrow_back</mat-icon></button>
          <div class="cash-tender-title">
            <strong>Efectivo</strong>
            <small>#{{orderCode(selected.id)}}</small>
          </div>
          <div class="cash-tender-total">{{chargeTotal() | currency:'PEN':'S/ '}}</div>
          <button type="button" class="cash-tender-close" [disabled]="printing" (click)="cashTenderOpen = false; paymentOpen = false"><mat-icon>close</mat-icon></button>
        </div>

        <div class="cash-tender-body">
          <div class="cash-tender-field-head">
            <span>MONTO RECIBIDO</span>
            <button type="button" class="cash-tender-clear" (click)="clearReceived()">Limpiar</button>
          </div>
          <mat-form-field appearance="outline" class="cash-tender-amount-field">
            <input matInput type="number" min="0" [(ngModel)]="amountReceived">
          </mat-form-field>

          <button type="button" class="cash-tender-exact" [class.active]="isExactAmount()" (click)="setExactAmount()">
            <mat-icon>check</mat-icon>Monto Exacto &mdash; {{chargeTotal() | currency:'PEN':'S/ '}}
          </button>

          <div class="cash-tender-denoms-head">BILLETES</div>
          <div class="cash-tender-denoms-grid">
            @for (d of billDenominations; track d) {
              <button type="button" class="cash-tender-denom-btn" (click)="addDenomination(d)">S/{{d}}</button>
            }
          </div>

          <div class="cash-tender-denoms-head">MONEDAS</div>
          <div class="cash-tender-denoms-grid">
            @for (d of coinDenominations; track d) {
              <button type="button" class="cash-tender-denom-btn" (click)="addDenomination(d)">S/{{d}}</button>
            }
          </div>

          <div class="cash-tender-change-box" [class.short]="changeAmount() < 0">
            <span>{{changeAmount() >= 0 ? 'CAMBIO A DAR' : 'FALTA RECIBIR'}}</span>
            <strong>{{(changeAmount() >= 0 ? changeAmount() : -changeAmount()) | currency:'PEN':'S/ '}}</strong>
            <small>Recibido: {{number(amountReceived) | currency:'PEN':'S/ '}}</small>
          </div>

          <button mat-flat-button class="pay-btn" [disabled]="printing" (click)="confirmCharge()">
            <mat-icon>point_of_sale</mat-icon>{{printing ? 'Imprimiendo...' : ('Cobrar ' + (chargeTotal() | currency:'PEN':'S/ '))}}
          </button>
        </div>
      }
    </p-dialog>

    <app-pdf-preview-dialog [visible]="pdfPreviewVisible" [pdfUrl]="pdfPreviewUrl" [title]="pdfPreviewTitle" (visibleChange)="pdfPreviewVisible = $event" (closed)="onPdfPreviewClosed()" />
  </section>`,
  styles: [`
    .mesas-screen { display: flex; flex-direction: column; gap: 18px; }
    .header-actions { display: flex; align-items: center; gap: 10px; }
    .header-actions .active-toggle { background: var(--surface-2); border-color: var(--primary); color: var(--primary); }
    @media (max-width: 640px) {
      .pos-hero { flex-wrap: wrap; }
      .header-actions { width: 100%; flex-wrap: wrap; }
      .header-actions > a, .header-actions > button { flex: 1; min-width: 0; justify-content: center; }
    }
    .orders-filters { display: flex; flex-wrap: wrap; gap: 10px; }
    .orders-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 14px; }

    .order-code-badge { display: inline-flex; align-items: center; padding: 3px 9px; border-radius: 6px; background: var(--surface-2); font-weight: 800; font-size: 12px; color: var(--ink); }
    .order-code-badge.lg { font-size: 15px; padding: 5px 12px; }
    .order-type-badge { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 700; color: var(--muted); text-transform: uppercase; }
    .order-type-badge mat-icon { font-size: 14px; width: 14px; height: 14px; }

    .order-card-v2 { border: 1px solid var(--soft-line); border-radius: 14px; background: var(--surface); padding: 14px; cursor: pointer; display: flex; flex-direction: column; gap: 8px; transition: transform .15s; box-shadow: var(--shadow); }
    .order-card-v2:hover { transform: translateY(-2px); }
    .order-card-v2-top { display: flex; align-items: center; gap: 8px; }
    .order-card-v2-top .mesa-status-chip { margin-left: auto; }
    .order-card-v2-price-row { display: flex; align-items: baseline; justify-content: space-between; }
    .order-card-v2-price { font-size: 20px; color: var(--primary-strong); }
    .order-card-v2-time { color: var(--muted); font-size: 12px; }
    .order-card-v2-subtitle { color: var(--muted); font-size: 13px; font-weight: 600; }
    .order-card-v2-items-head { font-size: 10px; font-weight: 800; letter-spacing: .05em; color: var(--muted); border-top: 1px dashed var(--line); padding-top: 8px; }
    .order-card-v2-items { display: flex; flex-direction: column; gap: 3px; }
    .order-card-v2-item-row { display: flex; justify-content: space-between; gap: 8px; font-size: 12.5px; }
    .order-card-v2-item-row span { color: var(--ink); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .order-card-v2-foot { display: flex; align-items: center; justify-content: space-between; gap: 6px; font-size: 11px; color: var(--muted); padding-top: 8px; border-top: 1px dashed var(--line); }

    .order-status-chip-open { background: #fde8e8; color: #c22a2a; }
    .order-status-chip-awaiting_payment { background: #fff1e0; color: #c2410c; }
    .order-status-chip-paid { background: #e8f7f1; color: #047857; }
    .order-status-chip-cancelled { background: #f1f2f4; color: #565f6b; }

    .order-cancel-btn { color: #c22a2a !important; border-color: #f3caca !important; }
    .order-cancel-btn:hover:not(:disabled) { background: #fdecec !important; }
    .order-cancel-confirm-btn { background: #c22a2a !important; color: #fff !important; }
    .order-cancel-confirm-btn:hover:not(:disabled) { background: #a51f1f !important; }
    .order-cancel-box { display: flex; align-items: flex-start; gap: 8px; padding: 10px 12px; border-radius: 10px; background: #f1f2f4; color: #4b5563; font-size: 13px; margin-bottom: 12px; }
    .order-cancel-box mat-icon { flex: none; font-size: 18px; width: 18px; height: 18px; margin-top: 1px; }
    .order-cancel-box b { display: block; }
    .order-cancel-box small { display: block; color: var(--muted); margin-top: 2px; }
    html.app-dark .order-cancel-box { background: var(--surface-2); color: var(--ink); }
    .cancel-reason-field { width: 100%; }

    .side-panel-backdrop { position: fixed; inset: 0; background: rgba(15, 23, 31, .45); z-index: 1000; animation: side-panel-fade .15s ease; }
    .side-panel {
      position: fixed; top: 0; right: 0; bottom: 0; width: min(480px, 96vw); background: var(--surface); z-index: 1001;
      display: flex; flex-direction: column; box-shadow: -14px 0 40px rgba(0, 0, 0, .25); animation: side-panel-slide-in .2s ease;
    }
    @keyframes side-panel-fade { from { opacity: 0; } to { opacity: 1; } }
    @keyframes side-panel-slide-in { from { transform: translateX(100%); } to { transform: translateX(0); } }
    .side-panel-header { flex: none; padding: 16px 20px; border-bottom: 1px solid var(--line); }
    .side-panel-header-actions { display: flex; align-items: center; gap: 8px; }
    .side-panel-close { border: none; background: var(--surface-2); color: var(--ink); width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; }
    .side-panel-body { flex: 1; overflow-y: auto; padding: 18px 20px; display: flex; flex-direction: column; gap: 14px; }
    .side-panel-footer { flex: none; padding: 16px 20px; border-top: 1px solid var(--line); }

    .cash-tender-header { display: flex; align-items: center; gap: 10px; padding: 16px 18px; border-bottom: 1px solid var(--line); border-radius: 12px 12px 0 0; }
    .cash-tender-back, .cash-tender-close { border: none; background: var(--surface-2); color: var(--ink); width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; flex: none; }
    .cash-tender-title { display: flex; flex-direction: column; }
    .cash-tender-title small { color: var(--muted); font-size: 12px; }
    .cash-tender-total { margin-left: auto; font-weight: 800; font-size: 18px; }
    .cash-tender-body { display: flex; flex-direction: column; gap: 10px; padding: 18px; }
    .cash-tender-field-head { display: flex; align-items: center; justify-content: space-between; font-size: 11px; font-weight: 800; letter-spacing: .05em; color: var(--muted); }
    .cash-tender-clear { border: none; background: transparent; color: var(--primary); font-weight: 700; font-size: 12px; cursor: pointer; }
    .cash-tender-amount-field { width: 100%; }
    .cash-tender-amount-field input { font-size: 24px; font-weight: 800; text-align: center; }
    .cash-tender-exact {
      display: flex; align-items: center; justify-content: center; gap: 6px; height: 42px; border: 2px dashed var(--primary); border-radius: 8px;
      background: var(--surface-2); color: var(--primary-strong); font-weight: 700; font-size: 13px; cursor: pointer;
    }
    .cash-tender-exact.active { background: var(--primary); color: #fff; border-style: solid; }
    .cash-tender-denoms-head { font-size: 10px; font-weight: 800; letter-spacing: .05em; color: var(--muted); margin-top: 4px; }
    .cash-tender-denoms-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; }
    .cash-tender-denom-btn { height: 42px; border: 1px solid var(--soft-line); border-radius: 8px; background: var(--surface); color: var(--ink); font-weight: 700; font-size: 12.5px; cursor: pointer; }
    .cash-tender-denom-btn:hover { border-color: var(--primary); }
    .cash-tender-change-box { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 14px; border-radius: 10px; background: var(--surface-2); margin-top: 6px; }
    .cash-tender-change-box span { font-size: 11px; font-weight: 800; letter-spacing: .05em; color: var(--primary-strong); }
    .cash-tender-change-box strong { font-size: 26px; color: var(--primary-strong); }
    .cash-tender-change-box small { color: var(--muted); font-size: 12px; }
    .cash-tender-change-box.short span, .cash-tender-change-box.short strong { color: #c22a2a; }

    .order-modal-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; width: 100%; }
    .order-modal-header-left { display: flex; align-items: center; gap: 10px; }
    .order-modal-body { display: flex; flex-direction: column; gap: 14px; }
    .order-modal-subheader { display: flex; flex-wrap: wrap; align-items: center; gap: 14px; color: var(--muted); font-size: 13px; }
    .order-modal-subheader span { display: flex; align-items: center; gap: 5px; }
    .order-modal-subheader mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .order-modal-relative-time { margin-left: auto; }
    .order-customer-box, .order-notes-box { display: flex; flex-direction: column; gap: 6px; padding: 10px 12px; border-radius: 10px; background: var(--surface-2); font-size: 13px; }
    .order-customer-box div { display: flex; align-items: center; gap: 8px; }
    .order-notes-box { flex-direction: row; align-items: flex-start; color: var(--muted); }

    .order-items-section-head { display: flex; align-items: center; justify-content: space-between; font-size: 12px; font-weight: 800; letter-spacing: .04em; color: var(--muted); }
    .order-items-section-meta { font-weight: 500; }
    .order-items-list { display: flex; flex-direction: column; gap: 6px; }
    .order-item-row { display: flex; align-items: center; gap: 12px; padding: 8px; border: 1px solid var(--soft-line); border-radius: 10px; }
    .order-item-row.done { background: var(--surface-2); }
    .order-item-qty { flex: none; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; border-radius: 50%; background: var(--surface-2); font-weight: 800; font-size: 12px; }
    .order-item-info { flex: 1; display: flex; flex-direction: column; gap: 3px; }
    .order-item-row.done .order-item-info b { text-decoration: line-through; color: var(--muted); }
    .order-item-toggle { display: inline-flex; align-items: center; gap: 4px; align-self: flex-start; border: none; background: transparent; padding: 0; font-size: 11px; font-weight: 700; color: var(--primary-strong); cursor: pointer; }
    .order-item-toggle mat-icon { font-size: 15px; width: 15px; height: 15px; }
    .order-item-row.done .order-item-toggle { color: var(--primary); }

    .order-modal-totals { display: flex; flex-direction: column; gap: 4px; padding: 10px 12px; border-radius: 10px; background: var(--surface-2); }
    .order-modal-totals-row { display: flex; justify-content: space-between; font-size: 13px; color: var(--muted); }
    .order-modal-totals-row.grand { color: var(--ink); font-weight: 800; font-size: 15px; }

    .order-modal-actions { display: flex; flex-direction: column; gap: 8px; width: 100%; }
    .order-modal-actions .pay-btn, .order-modal-actions > button { width: 100%; height: 46px; }
    .order-modal-secondary-actions { display: flex; gap: 8px; }
    .order-modal-secondary-actions button {
      flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 8px 4px; border: 1px solid var(--line); border-radius: 8px;
      background: var(--surface); color: var(--ink); font-size: 11px; font-weight: 700; cursor: pointer;
    }
    .order-modal-secondary-actions button:disabled { opacity: .4; cursor: not-allowed; }
    .order-modal-secondary-actions button mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .pay-btn { background: var(--primary) !important; color: #fff !important; width: 100%; height: 46px; }
    .pay-btn:hover { background: var(--primary-strong) !important; }
    .advance-hint { margin: 0 0 12px; font-size: 13px; color: var(--muted); }

    .payment-banner { background: linear-gradient(135deg, var(--primary), var(--primary-strong)); color: #fff; padding: 20px; display: flex; flex-direction: column; gap: 4px; border-radius: 12px 12px 0 0; }
    .payment-banner-top { display: flex; align-items: center; justify-content: space-between; }
    .order-code-badge.on-brand { background: rgba(255,255,255,.2); color: #fff; }
    .payment-close-btn { border: none; background: rgba(255,255,255,.15); color: #fff; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; }
    .payment-close-btn:disabled { opacity: .5; cursor: not-allowed; }
    .payment-banner-label { font-size: 11px; font-weight: 800; letter-spacing: .08em; opacity: .85; text-align: center; margin-top: 10px; }
    .payment-banner-amount { font-size: 36px; font-weight: 800; text-align: center; line-height: 1.2; }
    .payment-body { display: flex; flex-direction: column; gap: 14px; padding: 18px; }
    .payment-method-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
    .payment-method-btn { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 14px 6px; border: 2px solid var(--soft-line); border-radius: 10px; background: var(--surface); color: var(--ink); cursor: pointer; font-size: 12px; font-weight: 700; }
    .payment-method-btn mat-icon { font-size: 22px; width: 22px; height: 22px; color: var(--muted); }
    .payment-method-btn.selected { border-color: var(--primary); background: var(--surface-2); color: var(--primary-strong); }
    .payment-method-btn.selected mat-icon { color: var(--primary); }
    .payment-extra-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .payment-summary-row { display: flex; justify-content: space-between; font-size: 13px; color: var(--muted); padding: 0 2px; }

    .round-picker { display: flex; flex-direction: column; gap: 12px; }
    .round-picker-list { display: flex; flex-direction: column; gap: 4px; max-height: 220px; overflow: auto; border: 1px solid var(--soft-line); border-radius: 8px; }
    .round-picker-item { display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; border: none; background: transparent; cursor: pointer; text-align: left; }
    .round-picker-item:hover { background: var(--surface-2); }
    .round-picker-cart { display: flex; flex-direction: column; gap: 6px; border-top: 1px dashed var(--line); padding-top: 10px; }
    .round-picker-cart-line { display: flex; align-items: center; justify-content: space-between; }
    .qty-control { display: flex; align-items: center; gap: 4px; }

    .modal-actions { display: flex; justify-content: flex-end; gap: 10px; }
  `]
})
export class OrdersComponent implements OnInit, OnDestroy {
  api = inject(ApiService); cdr = inject(ChangeDetectorRef); messages = inject(MessageService);
  realtime = inject(RealtimeService); voucherPdf = inject(VoucherPdfService); auth = inject(AuthService);

  rows: OrderRow[] = [];
  stats: OrderStats | null = null;
  loading = false;
  page = 1; perPage = 12; total = 0; lastPage = 1;
  statusFilter: string = 'active';
  typeFilter = '';
  creatorFilter = '';

  cashInfo: { is_open: boolean; opened_at: string | null } | null = null;

  detailOpen = false; selected: OrderRow | null = null;

  roundOpen = false; allProducts: Product[] = []; productSearch = ''; picks: PickLine[] = []; sendingRound = false;

  advanceOpen = false; advanceAmount: number | null = null; advanceMethod = 'cash'; savingAdvance = false;

  cancelOpen = false; cancelReason = ''; cancelling = false;

  paymentOpen = false; payCustomer = 'Cliente General'; payMethod = ''; payTip = 0; payDiscountPercent = 0; printing = false;
  paymentMethods: { value: string; label: string; icon: string }[] = [
    { value: 'cash', label: 'Efectivo', icon: 'payments' },
    { value: 'card', label: 'Tarjeta', icon: 'credit_card' },
    { value: 'yape', label: 'Yape', icon: 'smartphone' },
    { value: 'plin', label: 'Plin', icon: 'phone_iphone' },
    { value: 'transfer', label: 'Transferencia', icon: 'sync_alt' },
    { value: 'mixed', label: 'Mixto', icon: 'dashboard_customize' },
  ];

  cashTenderOpen = false; amountReceived: number | null = null;
  billDenominations = [200, 100, 50, 20, 10];
  coinDenominations = [5, 2, 1, 0.5];

  pdfPreviewVisible = false; pdfPreviewUrl: string | null = null; pdfPreviewTitle = '';
  private pdfPreviewResolve: (() => void) | null = null;

  private subs: Subscription[] = [];

  statusLabels: Record<string, string> = { open: 'Preparando', awaiting_payment: 'Por cobrar', paid: 'Pagada', cancelled: 'Cancelada' };
  typeIcons: Record<string, string> = { mesa: 'table_bar', para_llevar: 'shopping_bag', delivery: 'moped' };

  ngOnInit() {
    this.load();
    this.loadStats();
    this.loadCashInfo();
    this.loadProducts();
    this.subs.push(this.realtime.tableRoundSent$.subscribe(() => this.refreshSilently()));
    this.subs.push(this.realtime.tableItemDelivered$.subscribe(() => this.refreshSilently()));
    this.subs.push(this.realtime.tableFreed$.subscribe(() => this.refreshSilently()));
  }

  ngOnDestroy() { this.subs.forEach(s => s.unsubscribe()); }

  refreshSilently() { this.load(true); this.loadStats(); }

  todayDate() { return limaDateString(); }

  load(silent = false) {
    if (!silent) { this.loading = true; this.cdr.detectChanges(); }
    const params: any = { page: this.page, per_page: this.perPage, from: this.todayDate() };
    if (this.statusFilter === 'active') params.status = 'open,awaiting_payment';
    else if (this.statusFilter) params.status = this.statusFilter;
    if (this.typeFilter) params.type = this.typeFilter;
    if (this.creatorFilter) params.created_by = this.creatorFilter;

    this.api.get<any>('orders', params).subscribe({
      next: (r: any) => {
        this.rows = r?.data || [];
        this.total = r?.total ?? this.rows.length;
        this.lastPage = r?.last_page ?? 1;
        if (this.selected) this.selected = this.rows.find(o => o.id === this.selected!.id) || this.selected;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => { this.loading = false; this.rows = []; this.cdr.detectChanges(); }
    });
  }

  loadStats() {
    this.api.get<OrderStats>('orders-stats').subscribe({
      next: s => { this.stats = s; this.cdr.detectChanges(); },
      error: () => {}
    });
  }

  loadCashInfo() {
    this.api.get<any>('cash-registers-stats').subscribe({
      next: r => { this.cashInfo = { is_open: !!r?.is_open, opened_at: r?.opened_at || null }; this.cdr.detectChanges(); },
      error: () => { this.cashInfo = null; }
    });
  }

  loadProducts() {
    this.api.get<any>('products', { type: 'plato', per_page: 200 }).subscribe((r: any) => {
      this.allProducts = Array.isArray(r) ? r : (r?.data || []);
      this.cdr.detectChanges();
    });
  }

  cashPillText(): string {
    if (!this.cashInfo) return 'Gestiona los pedidos activos del turno.';
    if (!this.cashInfo.is_open) return 'Caja cerrada.';
    if (!this.cashInfo.opened_at) return 'Caja abierta.';
    const d = new Date(this.cashInfo.opened_at);
    return `Caja abierta desde las ${d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}.`;
  }

  knownCreators(): { id: number; name: string }[] {
    const map = new Map<number, string>();
    for (const o of this.rows) if (o.creator) map.set(o.creator.id, o.creator.name);
    return Array.from(map, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }

  onFiltersChange() { this.page = 1; this.load(); }
  toggleHistory() { this.statusFilter = this.statusFilter === 'paid' ? 'active' : 'paid'; this.onFiltersChange(); }

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

  number(value: unknown) { return Number(value || 0); }
  clampNonNegative(value: unknown) { return Math.max(0, this.number(value)); }
  statusLabel(status: string) { return this.statusLabels[status] || status; }
  typeIcon(type: string) { return this.typeIcons[type] || 'receipt_long'; }
  orderCode(id: number) { return String(id).padStart(4, '0'); }
  itemCount(order: OrderRow) { return order.rounds.reduce((sum, r) => sum + r.items.length, 0); }
  allItemsDone(order: OrderRow) { return order.rounds.every(r => r.items.every(i => !!i.delivered_at)); }

  itemLines(order: OrderRow): { key: string; qty: number; name: string; total: number }[] {
    const map = new Map<number, { key: string; qty: number; name: string; total: number }>();
    for (const round of order.rounds) {
      for (const item of round.items) {
        const qty = this.number(item.quantity);
        const price = this.number(item.unit_price);
        const existing = map.get(item.product_id);
        if (existing) { existing.qty += qty; existing.total += qty * price; }
        else map.set(item.product_id, { key: String(item.product_id), qty, name: item.product_name, total: qty * price });
      }
    }
    return Array.from(map.values());
  }

  relativeTime(dateStr: string): string {
    const minutes = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
    if (minutes < 1) return 'Hace menos de 1 min';
    if (minutes < 60) return `Hace ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Hace ${hours} h`;
    return `Hace ${Math.floor(hours / 24)} d`;
  }

  openOrder(order: OrderRow) { this.selected = order; this.detailOpen = true; }

  toggleItem(item: ItemRow) {
    const previous = item.delivered_at;
    item.delivered_at = previous ? null : new Date().toISOString();
    this.cdr.detectChanges();
    this.api.patch<any>(`table-order-items/${item.id}/deliver`, {}).subscribe({
      next: () => this.load(true),
      error: (err: any) => { item.delivered_at = previous; this.cdr.detectChanges(); this.messages.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'No se pudo actualizar el item.' }); }
    });
  }

  markAllDone(order: OrderRow) {
    const pending = order.rounds.flatMap(r => r.items).filter(i => !i.delivered_at);
    if (!pending.length) return;
    Promise.all(pending.map(item => firstValueFrom(this.api.patch<any>(`table-order-items/${item.id}/deliver`, {})))).then(() => {
      this.messages.add({ severity: 'success', summary: 'Orden lista', detail: `Todos los items de la orden #${this.orderCode(order.id)} estan listos.` });
      this.load();
      this.loadStats();
    }).catch((err: any) => {
      this.messages.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'No se pudo completar la orden.' });
      this.load(true);
    });
  }

  filteredProducts(): Product[] {
    const term = this.productSearch.toLowerCase().trim();
    const list = term ? this.allProducts.filter(p => p.name.toLowerCase().includes(term) || p.sku?.toLowerCase().includes(term)) : this.allProducts;
    return list.slice(0, 30);
  }

  openAddRound() { if (!this.selected) return; this.picks = []; this.productSearch = ''; this.roundOpen = true; }
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
    this.api.post<OrderRow>(`table-orders/${this.selected.id}/rounds`, { items }).subscribe({
      next: () => {
        this.sendingRound = false; this.roundOpen = false;
        this.messages.add({ severity: 'success', summary: 'Enviado a cocina', detail: 'Se agregaron los productos a la orden.' });
        this.load(); this.loadStats();
      },
      error: (err: any) => { this.sendingRound = false; this.messages.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'No se pudo agregar productos.' }); }
    });
  }

  openAdvancePayment() {
    if (!this.selected) return;
    this.advanceAmount = null;
    this.advanceMethod = 'cash';
    this.advanceOpen = true;
  }

  confirmAdvance() {
    if (!this.selected || !this.advanceAmount || this.advanceAmount <= 0 || this.savingAdvance) return;
    this.savingAdvance = true;
    this.api.post<OrderRow>(`table-orders/${this.selected.id}/advance-payment`, {
      amount: this.advanceAmount, payment_method: this.advanceMethod
    }).subscribe({
      next: () => {
        this.savingAdvance = false; this.advanceOpen = false;
        this.messages.add({ severity: 'success', summary: 'Cobro registrado', detail: `Se registro un cobro anticipado de S/ ${this.advanceAmount}.` });
        this.load(); this.loadStats();
      },
      error: (err: any) => { this.savingAdvance = false; this.messages.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'No se pudo registrar el cobro anticipado.' }); }
    });
  }

  canCancel(order: OrderRow): boolean {
    return order.status !== 'paid' && order.status !== 'cancelled' && Number(order.amount_paid) <= 0;
  }

  openCancel() {
    if (!this.selected) return;
    this.cancelReason = '';
    this.cancelOpen = true;
  }

  confirmCancel() {
    if (!this.selected || !this.cancelReason.trim() || this.cancelling) return;
    this.cancelling = true;
    this.api.post<OrderRow>(`table-orders/${this.selected.id}/cancel`, { reason: this.cancelReason.trim() }).subscribe({
      next: () => {
        this.cancelling = false; this.cancelOpen = false; this.detailOpen = false;
        this.messages.add({ severity: 'success', summary: 'Orden cancelada', detail: `La orden #${this.orderCode(this.selected!.id)} fue cancelada.` });
        this.load(); this.loadStats();
      },
      error: (err: any) => { this.cancelling = false; this.messages.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'No se pudo cancelar la orden.' }); }
    });
  }

  previewDocument(kind: 'comanda' | 'precuenta') {
    if (!this.selected) return;
    this.api.getBlob(`table-orders/${this.selected.id}/${kind}-pdf`).subscribe({
      next: (blob: Blob) => {
        this.pdfPreviewTitle = kind === 'comanda' ? 'Comanda - Cocina' : 'Pre-cuenta';
        this.pdfPreviewUrl = URL.createObjectURL(blob);
        this.pdfPreviewVisible = true;
        this.cdr.detectChanges();
      },
      error: (err: any) => this.messages.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'No se pudo generar el documento.' })
    });
  }

  chargeItems(): { product_id: number; name: string; sale_price: number; quantity: number }[] {
    if (!this.selected) return [];
    const grouped = new Map<number, { product_id: number; name: string; sale_price: number; quantity: number }>();
    for (const round of this.selected.rounds) {
      for (const item of round.items) {
        const existing = grouped.get(item.product_id);
        const qty = this.number(item.quantity);
        if (existing) existing.quantity += qty;
        else grouped.set(item.product_id, { product_id: item.product_id, name: item.product_name, sale_price: this.number(item.unit_price), quantity: qty });
      }
    }
    return Array.from(grouped.values());
  }
  clampPercent(value: unknown) { return Math.min(100, Math.max(0, this.number(value))); }

  itemsGrossTotal() { return this.chargeItems().reduce((s, l) => s + l.sale_price * l.quantity, 0); }
  discountAmountPreview() { return Math.round(this.itemsGrossTotal() * this.payDiscountPercent / 100 * 100) / 100; }

  chargeTotal() {
    if (!this.selected) return 0;
    const discounted = this.itemsGrossTotal() - this.discountAmountPreview();
    return Math.max(0, discounted - this.selected.amount_paid) + this.number(this.payTip);
  }

  openPayment() {
    if (!this.selected) return;
    this.payCustomer = this.selected.customer_name || 'Cliente General';
    this.payMethod = ''; this.payTip = 0; this.payDiscountPercent = 0; this.amountReceived = null;
    this.paymentOpen = true;
  }

  selectPaymentMethod(value: string) {
    this.payMethod = value;
    if (value === 'cash') { this.amountReceived = null; this.cashTenderOpen = true; }
  }

  clearReceived() { this.amountReceived = null; }
  setExactAmount() { this.amountReceived = this.chargeTotal(); }
  isExactAmount() { return this.amountReceived !== null && Math.abs(this.number(this.amountReceived) - this.chargeTotal()) < 0.001; }
  addDenomination(value: number) { this.amountReceived = Math.round((this.number(this.amountReceived) + value) * 100) / 100; }
  changeAmount() { return this.number(this.amountReceived) - this.chargeTotal(); }

  confirmCharge() {
    if (!this.selected || !this.payMethod || this.printing) return;
    const orderId = this.selected.id;
    this.api.post<any>(`table-orders/${orderId}/charge`, {
      customer_name: this.payCustomer, payment_method: this.payMethod, tip: this.payTip, discount_percent: this.payDiscountPercent
    }).subscribe({
      next: async (sale: any) => {
        this.paymentOpen = false;
        this.cashTenderOpen = false;
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
          this.loadStats();
        }
      },
      error: (err: any) => this.messages.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'No se pudo cobrar la orden.' })
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
