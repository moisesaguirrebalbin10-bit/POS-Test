import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MessageService } from 'primeng/api';
import { ApiService } from '../core/api.service';
import { BrandingService } from '../core/branding.service';
import { TablePickerDialogComponent, PickedTable } from '../shared/table-picker-dialog.component';

type Product = { id: number; name: string; sku: string; sale_price: number | string; stock: number | string; image_path?: string; category?: { name: string } };
type CartLine = { product_id: number; name: string; sale_price: number; quantity: number; image_path?: string };
type MostOrdered = { product_id: number; name: string; sale_price: number | string; image_path?: string; total_qty: number };

@Component({
  selector: 'app-order-builder',
  standalone: true,
  imports: [CurrencyPipe, FormsModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, TablePickerDialogComponent],
  template: `
  <section class="pos-screen">
    <header class="pos-hero">
      <div>
        <span class="eyebrow">Restaurante</span>
        <h1>Crear Orden</h1>
        <p>{{filteredProducts.length}} de {{allProducts.length}} platos disponibles.</p>
      </div>
      <div class="hero-total">
        <span>Total actual</span>
        <strong>{{total | currency:'PEN':'S/ '}}</strong>
      </div>
    </header>

    <section class="pos-workspace">
      <div class="catalog-panel">
        <div class="catalog-head">
          <div><span class="eyebrow">Nueva Orden</span><h2>Catalogo de Platos</h2><p>Selecciona platos para anadir a la orden.</p></div>
          <div class="catalog-head-actions">
            <button type="button" class="filter-btn" (click)="restoreFilters()"><mat-icon>filter_alt_off</mat-icon>Restaurar Filtros</button>
            <button mat-flat-button class="primary-action" (click)="reloadProducts()"><mat-icon>refresh</mat-icon>Actualizar</button>
          </div>
        </div>

        <div class="catalog-toolbar smart-search-wrap">
          <div class="search-pill catalog-search"><mat-icon>search</mat-icon><input type="text" placeholder="Buscar plato o SKU..." [(ngModel)]="search" (ngModelChange)="applySearch()"></div>
        </div>

        <div class="category-chip-row">
          <button type="button" class="category-chip" [class.active]="selectedCategory === 'all'" (click)="selectCategory('all')">Todos</button>
          @for (cat of categories; track cat) {
            <button type="button" class="category-chip" [class.active]="selectedCategory === cat" (click)="selectCategory(cat)">{{cat}}</button>
          }
        </div>

        @if (mostOrdered.length && selectedCategory === 'all' && !search.trim()) {
          <div class="most-ordered-row">
            <h3><mat-icon>local_fire_department</mat-icon>Mas Pedidos</h3>
            <div class="most-ordered-grid">
              @for (p of mostOrdered; track p.product_id) {
                <button type="button" class="most-ordered-card" (click)="addFromMostOrdered(p)">
                  <img [src]="imageUrl(p.image_path)" [alt]="p.name">
                  <span>{{p.name}}</span>
                  <b>{{number(p.sale_price) | currency:'PEN':'S/ '}}</b>
                </button>
              }
            </div>
          </div>
        }

        @if (loading) {
          <div class="loading-state"><mat-icon>hourglass_empty</mat-icon><p>Cargando platos...</p></div>
        } @else if (!filteredProducts.length) {
          <div class="empty-state"><mat-icon>search_off</mat-icon><p>No se encontraron platos con esa busqueda.</p></div>
        } @else {
          <div class="product-grid">
            @for (p of filteredProducts; track p.id) {
              <button class="product-card" (click)="add(p)">
                <span class="product-image-wrap">
                  <img [src]="imageUrl(p.image_path)" [alt]="p.name" loading="lazy">
                  @if (qtyInCart(p.id) > 0) { <span class="product-qty-badge">{{qtyInCart(p.id)}}</span> }
                </span>
                <span class="product-info">
                  <span class="product-category">{{p.category?.name || 'Plato'}}</span>
                  <strong>{{p.name}}</strong>
                  <span class="product-meta">
                    <span>{{p.sku}}</span>
                    <b>{{number(p.sale_price) | currency:'PEN':'S/ '}}</b>
                  </span>
                </span>
              </button>
            }
          </div>
        }
      </div>

      <aside class="cart-panel">
        <div class="cart-header">
          <div><span class="eyebrow">Orden</span><h2>Orden Actual</h2></div>
          <span class="item-count">{{cart.length}} items</span>
        </div>

        <div class="segmented-control order-type-segment">
          <button type="button" [class.active]="orderType === 'mesa'" (click)="setOrderType('mesa')"><mat-icon>table_bar</mat-icon>Mesa</button>
          <button type="button" [class.active]="orderType === 'para_llevar'" (click)="setOrderType('para_llevar')"><mat-icon>shopping_bag</mat-icon>Para llevar</button>
          <button type="button" [class.active]="orderType === 'delivery'" (click)="setOrderType('delivery')"><mat-icon>moped</mat-icon>Delivery</button>
        </div>

        @if (orderType === 'mesa') {
          <button type="button" class="table-picker-trigger" (click)="tablePickerOpen = true">
            <mat-icon>table_bar</mat-icon>
            @if (selectedTable) { <span>{{selectedTable.name}} &middot; {{selectedTable.capacity}} personas</span> }
            @else { <span>Seleccionar Mesa...</span> }
            <mat-icon class="chevron">chevron_right</mat-icon>
          </button>
        }

        @if (orderType === 'delivery') {
          <div class="delivery-fields">
            <mat-form-field appearance="outline"><mat-label>Cliente</mat-label><input matInput [(ngModel)]="customerName"></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Telefono</mat-label><input matInput [(ngModel)]="customerPhone"></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Direccion de entrega</mat-label><input matInput [(ngModel)]="deliveryAddress"></mat-form-field>
          </div>
        }

        @if (orderType === 'para_llevar') {
          <mat-form-field appearance="outline"><mat-label>Cliente (opcional)</mat-label><input matInput [(ngModel)]="customerName"></mat-form-field>
        }

        @if (!cart.length) {
          <div class="empty-cart">
            <mat-icon>shopping_cart</mat-icon>
            <p>Selecciona platos para iniciar la orden.</p>
          </div>
        }

        <div class="cart-list">
          @for (line of cart; track line.product_id) {
            <div class="cart-item">
              <img [src]="imageUrl(line.image_path)" [alt]="line.name">
              <div class="cart-item-main">
                <strong>{{line.name}}</strong>
                <span>{{line.sale_price | currency:'PEN':'S/ '}} c/u</span>
                <div class="qty-control">
                  <button mat-icon-button (click)="dec(line)"><mat-icon>remove</mat-icon></button>
                  <b>{{line.quantity}}</b>
                  <button mat-icon-button (click)="inc(line)"><mat-icon>add</mat-icon></button>
                </div>
              </div>
              <b>{{line.sale_price * line.quantity | currency:'PEN':'S/ '}}</b>
            </div>
          }
        </div>

        <button type="button" class="advanced-options-toggle" (click)="advancedOpen = !advancedOpen">
          <mat-icon>tune</mat-icon>Opciones Avanzadas<mat-icon>{{advancedOpen ? 'expand_less' : 'expand_more'}}</mat-icon>
        </button>
        @if (advancedOpen) {
          <mat-form-field appearance="outline"><mat-label>Nota del pedido (opcional)</mat-label><textarea matInput rows="2" [(ngModel)]="notes"></textarea></mat-form-field>
        }

        <div class="totals-card">
          <p><span>Subtotal</span><b>{{subtotal | currency:'PEN':'S/ '}}</b></p>
          <p><span>IGV {{branding.igvPercent()}}%</span><b>{{igv | currency:'PEN':'S/ '}}</b></p>
          <p class="grand-total"><span>Total</span><b>{{total | currency:'PEN':'S/ '}}</b></p>
        </div>

        <button mat-flat-button class="pay-btn" [disabled]="!canSubmit() || submitting" (click)="submitOrder()">
          <mat-icon>send</mat-icon>{{submitting ? 'Creando orden...' : 'Crear Orden'}}
        </button>
      </aside>
    </section>

    <app-table-picker-dialog [visible]="tablePickerOpen" (visibleChange)="tablePickerOpen = $event" (tableSelected)="onTableSelected($event)" />
  </section>`,
  styles: [`
    .order-type-segment { width: 100%; margin-bottom: 14px; }
    .order-type-segment button { flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 0 8px; font-size: 12px; }
    .order-type-segment button mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .table-picker-trigger {
      display: flex; align-items: center; gap: 10px; width: 100%; height: 46px; padding: 0 14px; margin-bottom: 14px;
      border: 1px solid var(--line); border-radius: 8px; background: var(--surface-2); color: var(--ink); cursor: pointer; font-size: 14px; font-weight: 600;
    }
    .table-picker-trigger:hover { border-color: var(--primary); }
    .table-picker-trigger span { flex: 1; text-align: left; }
    .table-picker-trigger .chevron { color: var(--muted); }
    .delivery-fields { display: flex; flex-direction: column; gap: 4px; margin-bottom: 10px; }
    .product-qty-badge {
      position: absolute; top: 10px; left: 10px; min-width: 22px; height: 22px; padding: 0 6px; border-radius: 999px;
      background: var(--primary); color: #fff; font-size: 12px; font-weight: 800; display: flex; align-items: center; justify-content: center;
    }
    .most-ordered-row { margin-bottom: 18px; }
    .most-ordered-row h3 { display: flex; align-items: center; gap: 6px; margin: 0 0 10px; font-size: 14px; color: var(--muted); }
    .most-ordered-row h3 mat-icon { color: #f97316; font-size: 18px; width: 18px; height: 18px; }
    .most-ordered-grid { display: flex; gap: 10px; overflow-x: auto; padding-bottom: 4px; }
    .most-ordered-card { flex: none; width: 110px; display: flex; flex-direction: column; gap: 4px; border: 1px solid var(--soft-line); border-radius: 8px; background: var(--surface); padding: 8px; cursor: pointer; text-align: left; }
    .most-ordered-card img { width: 100%; height: 64px; object-fit: cover; border-radius: 6px; }
    .most-ordered-card span { font-size: 11px; font-weight: 700; line-height: 1.2; }
    .most-ordered-card b { font-size: 12px; color: var(--primary-strong); }
    .advanced-options-toggle {
      display: flex; align-items: center; gap: 8px; width: 100%; padding: 10px 4px; margin: 10px 0; border: none; background: transparent;
      color: var(--muted); font-weight: 700; font-size: 13px; cursor: pointer;
    }
    .advanced-options-toggle mat-icon:last-child { margin-left: auto; }
  `]
})
export class OrderBuilderComponent implements OnInit {
  api = inject(ApiService); branding = inject(BrandingService);
  cdr = inject(ChangeDetectorRef); messages = inject(MessageService); router = inject(Router);

  allProducts: Product[] = [];
  filteredProducts: Product[] = [];
  cart: CartLine[] = [];
  mostOrdered: MostOrdered[] = [];
  search = '';
  selectedCategory = 'all';
  loading = false;

  orderType: 'mesa' | 'para_llevar' | 'delivery' = 'mesa';
  selectedTable: PickedTable | null = null;
  tablePickerOpen = false;

  customerName = '';
  customerPhone = '';
  deliveryAddress = '';
  notes = '';
  advancedOpen = false;
  submitting = false;

  ngOnInit() {
    this.branding.load();
    this.reloadProducts();
    this.loadMostOrdered();
  }

  reloadProducts() {
    this.loading = true;
    this.cdr.detectChanges();
    this.api.get<any>('products', { type: 'plato', per_page: 200 }).subscribe({
      next: (r: any) => { this.allProducts = this.normalizeProducts(r); this.loading = false; this.applySearch(); this.cdr.detectChanges(); },
      error: () => { this.allProducts = []; this.filteredProducts = []; this.loading = false; this.cdr.detectChanges(); }
    });
  }

  normalizeProducts(response: any): Product[] {
    if (Array.isArray(response)) return response;
    if (Array.isArray(response?.data)) return response.data;
    return [];
  }

  loadMostOrdered() {
    this.api.get<MostOrdered[]>('orders-most-ordered').subscribe({
      next: (r: any) => { this.mostOrdered = Array.isArray(r) ? r : []; this.cdr.detectChanges(); },
      error: () => { this.mostOrdered = []; }
    });
  }

  get categories(): string[] {
    const names = new Set(this.allProducts.map(p => p.category?.name).filter((n): n is string => !!n));
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }

  selectCategory(cat: string) { this.selectedCategory = cat; this.applySearch(); }
  restoreFilters() { this.search = ''; this.selectedCategory = 'all'; this.applySearch(); }

  applySearch() {
    const terms = this.search.toLowerCase().trim().split(/\s+/).filter(Boolean);
    const byCategory = this.selectedCategory === 'all' ? this.allProducts : this.allProducts.filter(p => p.category?.name === this.selectedCategory);
    this.filteredProducts = terms.length ? byCategory.filter(p => this.matchesTerms(p, terms)) : [...byCategory];
    this.cdr.detectChanges();
  }

  matchesTerms(p: Product, terms: string[]) {
    const haystack = [p.name, p.sku, p.category?.name].join(' ').toLowerCase();
    return terms.every(term => haystack.includes(term));
  }

  qtyInCart(productId: number): number { return this.cart.find(l => l.product_id === productId)?.quantity || 0; }

  add(p: Product) {
    const line = this.cart.find(x => x.product_id === p.id);
    if (line) { line.quantity++; return; }
    this.cart.push({ product_id: p.id, name: p.name, sale_price: this.number(p.sale_price), quantity: 1, image_path: p.image_path });
  }

  addFromMostOrdered(p: MostOrdered) {
    const line = this.cart.find(x => x.product_id === p.product_id);
    if (line) { line.quantity++; return; }
    this.cart.push({ product_id: p.product_id, name: p.name, sale_price: this.number(p.sale_price), quantity: 1, image_path: p.image_path });
  }

  inc(l: CartLine) { l.quantity++; }
  dec(l: CartLine) { l.quantity--; if (l.quantity <= 0) this.cart = this.cart.filter(x => x !== l); }

  number(value: unknown) { return Number(value || 0); }
  imageUrl(path?: string) { return this.api.assetUrl(path); }

  get grossTotal() { return this.cart.reduce((s, l) => s + l.sale_price * l.quantity, 0); }
  get subtotal() { return this.grossTotal / (1 + this.branding.igvPercent() / 100); }
  get igv() { return this.grossTotal - this.subtotal; }
  get total() { return this.grossTotal; }

  setOrderType(type: 'mesa' | 'para_llevar' | 'delivery') {
    this.orderType = type;
    if (type !== 'mesa') this.selectedTable = null;
  }

  onTableSelected(table: PickedTable) { this.selectedTable = table; }

  canSubmit(): boolean {
    if (!this.cart.length) return false;
    if (this.orderType === 'mesa') return !!this.selectedTable;
    if (this.orderType === 'delivery') return !!(this.customerName.trim() && this.customerPhone.trim() && this.deliveryAddress.trim());
    return true;
  }

  submitOrder() {
    if (!this.canSubmit() || this.submitting) return;
    this.submitting = true;
    this.api.post<any>('orders', {
      type: this.orderType,
      restaurant_table_id: this.orderType === 'mesa' ? this.selectedTable?.id : null,
      customer_name: this.orderType !== 'mesa' ? (this.customerName.trim() || null) : null,
      customer_phone: this.orderType === 'delivery' ? this.customerPhone.trim() : null,
      delivery_address: this.orderType === 'delivery' ? this.deliveryAddress.trim() : null,
      notes: this.notes.trim() || null,
      items: this.cart.map(({ product_id, quantity }) => ({ product_id, quantity }))
    }).subscribe({
      next: () => {
        this.submitting = false;
        this.messages.add({ severity: 'success', summary: 'Orden creada', detail: 'La orden se registro correctamente.' });
        this.router.navigateByUrl('/app/orders');
      },
      error: (err: any) => { this.submitting = false; this.messages.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'No se pudo crear la orden.' }); }
    });
  }
}
