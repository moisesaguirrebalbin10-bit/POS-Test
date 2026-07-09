import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import '../core/electron-window';
import { CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { DialogModule } from 'primeng/dialog';
import { MessageService } from 'primeng/api';
import { Subscription } from 'rxjs';
import { ApiService } from '../core/api.service';
import { BrandingService } from '../core/branding.service';
import { RealtimeService } from '../core/realtime.service';
import { VoucherCopy, VoucherPdfService } from '../core/voucher-pdf.service';
import { PdfPreviewDialogComponent } from '../shared/pdf-preview-dialog.component';

type Product = {
  id: number;
  name: string;
  sku: string;
  sale_price: number | string;
  stock: number | string;
  image_path?: string;
  category?: { name: string };
};

type CartLine = {
  product_id: number;
  name: string;
  sale_price: number;
  quantity: number;
  image_path?: string;
};

@Component({
  selector: 'app-pos',
  standalone: true,
  imports: [CurrencyPipe, FormsModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, MatSelectModule, DialogModule, PdfPreviewDialogComponent],
  template: `
  <section class="pos-screen">
    <header class="pos-hero">
      <div>
        <span class="eyebrow">Venta rapida</span>
        <h1>{{branding.name()}}</h1>
        <p>{{filteredProducts.length}} de {{allProducts.length}} productos disponibles para atencion en mostrador.</p>
      </div>
      <div class="hero-total">
        <span>Total actual</span>
        <strong>{{total | currency:'PEN':'S/ '}}</strong>
      </div>
    </header>

    <section class="pos-workspace">
      <div class="catalog-panel">
        <div class="catalog-head">
          <div><span class="eyebrow">Punto de Venta</span><h2>Catalogo de Productos</h2><p>Selecciona productos para anadir al carrito de compra.</p></div>
          <div class="catalog-head-actions">
            <button type="button" class="filter-btn" (click)="restoreFilters()"><mat-icon>filter_alt_off</mat-icon>Restaurar Filtros</button>
            <button mat-flat-button class="primary-action" (click)="reloadProducts()"><mat-icon>refresh</mat-icon>Actualizar Stock</button>
          </div>
        </div>

        <div class="catalog-toolbar smart-search-wrap">
          <div class="search-pill catalog-search"><mat-icon>search</mat-icon><input type="text" placeholder="Buscar plato, bebida o SKU..." [(ngModel)]="search" (ngModelChange)="applySearch()" (focus)="searchFocused = true" (keydown.escape)="clearSearch()"></div>

          @if (searchFocused && search.trim() && searchMatches.length) {
            <div class="search-results">
              <div class="search-results-head">
                <span>{{searchMatches.length}} coincidencias</span>
                <button mat-button (click)="clearSearch()">Limpiar</button>
              </div>
              @for (p of searchMatches; track p.id) {
                <button class="search-result-item" (mousedown)="$event.preventDefault()" (click)="selectProduct(p)">
                  <img [src]="imageUrl(p.image_path)" [alt]="p.name">
                  <span>
                    <strong>{{p.name}}</strong>
                    <small>{{p.category?.name || 'Producto'}} ? {{p.sku}}</small>
                  </span>
                  <b>{{number(p.sale_price) | currency:'PEN':'S/ '}}</b>
                </button>
              }
            </div>
          }
        </div>

        <div class="category-chip-row">
          <button type="button" class="category-chip" [class.active]="selectedCategory === 'all'" (click)="selectCategory('all')">Todos</button>
          @for (cat of categories; track cat) {
            <button type="button" class="category-chip" [class.active]="selectedCategory === cat" (click)="selectCategory(cat)">{{cat}}</button>
          }
        </div>

        @if (loading) {
          <div class="loading-state"><mat-icon>hourglass_empty</mat-icon><p>Cargando productos...</p></div>
        } @else if (!filteredProducts.length) {
          <div class="empty-state"><mat-icon>search_off</mat-icon><p>No se encontraron productos con esa busqueda.</p></div>
        } @else {
          <div class="product-grid">
            @for (p of filteredProducts; track p.id) {
              <button class="product-card" (click)="add(p)">
                <span class="product-image-wrap">
                  <img [src]="imageUrl(p.image_path)" [alt]="p.name" loading="lazy">
                  <span class="stock-pill">Stock {{number(p.stock)}}</span>
                </span>
                <span class="product-info">
                  <span class="product-category">{{p.category?.name || 'Producto'}}</span>
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
          <div>
            <span class="eyebrow">Pedido</span>
            <h2>Carrito</h2>
          </div>
          <span class="item-count">{{cart.length}} items</span>
        </div>

        @if (!cart.length) {
          <div class="empty-cart">
            <mat-icon>shopping_cart</mat-icon>
            <p>Selecciona un producto para iniciar la venta.</p>
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

        <div class="checkout-form">
          <mat-form-field appearance="outline">
            <mat-label>Cliente</mat-label>
            <input matInput [(ngModel)]="customer">
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Pago</mat-label>
            <mat-select [(ngModel)]="payment">
              <mat-option value="cash">Efectivo</mat-option>
              <mat-option value="yape">Yape</mat-option>
              <mat-option value="plin">Plin</mat-option>
              <mat-option value="card">Tarjeta</mat-option>
              <mat-option value="transfer">Transferencia</mat-option>
              <mat-option value="mixed">Mixto</mat-option>
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Propina</mat-label>
            <input matInput type="number" min="0" [(ngModel)]="tip" (blur)="tip = clampNonNegative(tip)">
          </mat-form-field>
          <div class="paid-with-row">
            <mat-form-field appearance="outline">
              <mat-label>Nos paga con</mat-label>
              <input matInput type="number" [(ngModel)]="amountReceived">
            </mat-form-field>
            <button type="button" mat-stroked-button class="exact-amount-btn" (click)="markFullPayment()">Completo</button>
          </div>
          @if (number(amountReceived) > 0) {
            @if (change >= 0) { <div class="change-hint"><mat-icon>payments</mat-icon><span>Vuelto a entregar</span><b>{{change | currency:'PEN':'S/ '}}</b></div> }
            @else { <div class="change-hint short"><mat-icon>error_outline</mat-icon><span>Falta recibir</span><b>{{-change | currency:'PEN':'S/ '}}</b></div> }
          }
        </div>

        <div class="totals-card">
          <p><span>Subtotal</span><b>{{subtotal | currency:'PEN':'S/ '}}</b></p>
          <p><span>IGV 18%</span><b>{{igv | currency:'PEN':'S/ '}}</b></p>
          @if (number(tip) > 0) { <p><span>Propina</span><b>{{number(tip) | currency:'PEN':'S/ '}}</b></p> }
          <p class="grand-total"><span>Total</span><b>{{total | currency:'PEN':'S/ '}}</b></p>
        </div>

        @if (cashMessage) { <div class="cash-required"><mat-icon>lock</mat-icon><span>{{cashMessage}}</span></div> }
        <button mat-flat-button class="pay-btn" (click)="openConfirmModal()" [disabled]="!cart.length || !currentCash || printing">
          <mat-icon>receipt_long</mat-icon>
          Confirmar venta
        </button>

        @if (lastSaleId) {
          <div class="reprint-actions">
            <span>Venta #{{lastSaleId}} registrada. Reimprimir:</span>
            <div class="reprint-buttons">
              <button mat-stroked-button [disabled]="printing" (click)="reprint(lastSaleId, 'customer')"><mat-icon>receipt</mat-icon>Boleta cliente</button>
              <button mat-stroked-button [disabled]="printing" (click)="reprint(lastSaleId, 'local')"><mat-icon>store</mat-icon>Copia local</button>
            </div>
          </div>
        }
      </aside>
    </section>

    <p-dialog [(visible)]="confirmModalOpen" [modal]="true" [dismissableMask]="!printing" [closable]="!printing" [style]="{ width: 'min(480px, 94vw)' }" header="Nota de venta">
      <div class="sale-preview">
        <div class="sale-preview-row"><span>Cliente</span><b>{{customer || 'Cliente General'}}</b></div>
        <div class="sale-preview-row"><span>Metodo de pago</span><b>{{paymentLabel()}}</b></div>
        <div class="sale-preview-items">
          @for (line of cart; track line.product_id) {
            <div class="sale-preview-item"><span>{{line.quantity}} x {{line.name}}</span><b>{{line.sale_price * line.quantity | currency:'PEN':'S/ '}}</b></div>
          }
        </div>
        <div class="sale-preview-row"><span>Subtotal</span><b>{{subtotal | currency:'PEN':'S/ '}}</b></div>
        <div class="sale-preview-row"><span>IGV 18%</span><b>{{igv | currency:'PEN':'S/ '}}</b></div>
        @if (number(tip) > 0) { <div class="sale-preview-row"><span>Propina</span><b>{{number(tip) | currency:'PEN':'S/ '}}</b></div> }
        <div class="sale-preview-row total"><span>Total</span><b>{{total | currency:'PEN':'S/ '}}</b></div>
        @if (number(amountReceived) > 0) {
          <div class="sale-preview-row"><span>Nos paga con</span><b>{{number(amountReceived) | currency:'PEN':'S/ '}}</b></div>
          <div class="sale-preview-row" [class.warn]="change < 0"><span>{{change >= 0 ? 'Vuelto' : 'Falta recibir'}}</span><b>{{(change >= 0 ? change : -change) | currency:'PEN':'S/ '}}</b></div>
        }
      </div>
      <ng-template pTemplate="footer">
        <div class="modal-actions">
          <button mat-stroked-button [disabled]="printing" (click)="closeConfirmModal()">Cancelar</button>
          <button mat-flat-button class="primary-action" [disabled]="printing" (click)="confirm()"><mat-icon>print</mat-icon>{{printing ? 'Imprimiendo...' : 'Imprimir'}}</button>
        </div>
      </ng-template>
    </p-dialog>

    <app-pdf-preview-dialog [visible]="pdfPreviewVisible" [pdfUrl]="pdfPreviewUrl" [title]="pdfPreviewTitle" (visibleChange)="pdfPreviewVisible = $event" (closed)="onPdfPreviewClosed()" />
  </section>`
})
export class PosComponent implements OnInit, OnDestroy {
  api = inject(ApiService); branding = inject(BrandingService);
  cdr = inject(ChangeDetectorRef);
  voucherPdf = inject(VoucherPdfService);
  messages = inject(MessageService);
  realtime = inject(RealtimeService);
  private stockSub?: Subscription;
  allProducts: Product[] = [];
  filteredProducts: Product[] = [];
  searchMatches: Product[] = [];
  cart: CartLine[] = [];
  currentCash: any = null;
  cashMessage = '';
  search = '';
  selectedCategory = 'all';
  searchFocused = false;
  loading = false;
  customer = 'Cliente General';
  payment = 'cash';
  tip = 0;
  amountReceived = 0;
  confirmModalOpen = false;
  lastSaleId: number | null = null;
  printing = false;
  paymentLabels: Record<string, string> = { cash: 'Efectivo', yape: 'Yape', plin: 'Plin', card: 'Tarjeta', transfer: 'Transferencia', mixed: 'Mixto' };

  pdfPreviewVisible = false;
  pdfPreviewUrl: string | null = null;
  pdfPreviewTitle = '';
  private pdfPreviewResolve: (() => void) | null = null;

  ngOnInit() {
    this.reloadProducts();
    this.loadOpenCash();
    this.stockSub = this.realtime.stockUpdated$.subscribe(e => this.applyStockUpdate(e.productId, e.stock));
  }

  ngOnDestroy() { this.stockSub?.unsubscribe(); }

  applyStockUpdate(productId: number, stock: number) {
    for (const list of [this.allProducts, this.filteredProducts, this.searchMatches]) {
      const product = list.find(p => p.id === productId);
      if (product) product.stock = stock;
    }
    this.cdr.detectChanges();
  }

  loadOpenCash() {
    this.api.get<any>('cash-registers').subscribe((r: any) => {
      const rows = r.data || [];
      this.currentCash = rows.find((x: any) => x.status === 'open');
      this.cashMessage = this.currentCash ? '' : 'Debes abrir caja diaria antes de registrar ventas.';
      this.cdr.detectChanges();
    });
  }

  reloadProducts() {
    this.loading = true;
    this.cdr.detectChanges();

    const params: any = this.branding.businessType() === 'restaurant' ? { type: 'plato', per_page: 200 } : {};
    this.api.get<any>('products', params).subscribe({
      next: (r: any) => {
        this.allProducts = this.normalizeProducts(r);
        this.loading = false;
        this.applySearch();
        this.cdr.detectChanges();
      },
      error: () => {
        this.allProducts = [];
        this.filteredProducts = [];
        this.searchMatches = [];
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  normalizeProducts(response: any): Product[] {
    if (Array.isArray(response)) return response;
    if (Array.isArray(response?.data)) return response.data;
    if (Array.isArray(response?.products)) return response.products;
    return [];
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
    this.searchMatches = terms.length ? this.filteredProducts.slice(0, 12) : [];
    this.cdr.detectChanges();
  }

  matchesTerms(p: Product, terms: string[]) {
    const haystack = [p.name, p.sku, p.category?.name, p.sale_price, p.stock].join(' ').toLowerCase();
    return terms.every(term => haystack.includes(term));
  }

  selectProduct(p: Product) {
    this.add(p);
    this.search = p.name;
    this.applySearch();
    this.searchFocused = false;
  }

  clearSearch() {
    this.search = '';
    this.searchFocused = false;
    this.applySearch();
  }

  add(p: Product) {
    const line = this.cart.find(x => x.product_id === p.id);
    if (line) {
      line.quantity++;
      return;
    }
    this.cart.push({ product_id: p.id, name: p.name, sale_price: this.number(p.sale_price), quantity: 1, image_path: p.image_path });
  }

  inc(l: CartLine) { l.quantity++; }

  dec(l: CartLine) {
    l.quantity--;
    if (l.quantity <= 0) this.cart = this.cart.filter(x => x !== l);
  }

  number(value: unknown) { return Number(value || 0); }
  clampNonNegative(value: unknown) { return Math.max(0, this.number(value)); }

  imageUrl(path?: string) {
    return this.api.assetUrl(path);
  }

  get grossTotal() { return this.cart.reduce((s, l) => s + l.sale_price * l.quantity, 0); }
  get subtotal() { return this.grossTotal / 1.18; }
  get igv() { return this.grossTotal - this.subtotal; }
  get total() { return this.grossTotal + this.number(this.tip); }
  get change() { return this.number(this.amountReceived) - this.total; }

  markFullPayment() { this.amountReceived = Number(this.total.toFixed(2)); }
  paymentLabel() { return this.paymentLabels[this.payment] || this.payment; }

  openConfirmModal() {
    if (!this.cart.length || !this.currentCash) return;
    this.confirmModalOpen = true;
  }
  closeConfirmModal() { if (!this.printing) this.confirmModalOpen = false; }

  confirm() {
    this.api.post<any>('sales', {
      customer_name: this.customer,
      payment_method: this.payment,
      tip: this.tip,
      items: this.cart.map(({ product_id, quantity }) => ({ product_id, quantity }))
    }).subscribe(async (s: any) => {
      this.cart = [];
      this.amountReceived = 0;
      this.lastSaleId = s.id;
      this.confirmModalOpen = false;
      this.loadOpenCash();
      this.reloadProducts();
      this.printing = true;
      this.cdr.detectChanges();
      try {
        await this.printSale(s.id, 'customer', true);
        await this.printSale(s.id, 'local', true);
      } finally {
        this.printing = false;
        this.cdr.detectChanges();
      }
    });
  }

  async reprint(saleId: number, copy: VoucherCopy) {
    this.printing = true;
    this.cdr.detectChanges();
    try {
      await this.printSale(saleId, copy, false);
    } finally {
      this.printing = false;
      this.cdr.detectChanges();
    }
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
    await this.showPrinterHint(copy);
    await new Promise<void>(resolve => { this.pdfPreviewResolve = resolve; });
  }

  onPdfPreviewClosed() {
    if (this.pdfPreviewUrl) URL.revokeObjectURL(this.pdfPreviewUrl);
    this.pdfPreviewUrl = null;
    this.pdfPreviewResolve?.();
    this.pdfPreviewResolve = null;
  }

  async showPrinterHint(copy: VoucherCopy) {
    if (!window.posChifa?.getPrinterConfig || typeof Notification === 'undefined') return;
    try {
      const config = await window.posChifa.getPrinterConfig();
      const printerName = config[copy];
      if (!printerName) return;
      const copyLabel = copy === 'local' ? 'Cocina / Comanda' : 'Cliente / Caja';
      new Notification('Impresion de voucher', { body: `Copia ${copyLabel} - Usa: ${printerName}` });
    } catch { /* impresora no configurada, sin aviso */ }
  }
}






