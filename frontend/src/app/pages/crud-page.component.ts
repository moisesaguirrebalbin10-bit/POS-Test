import { ChangeDetectorRef, Component, ElementRef, OnInit, ViewChild, inject } from '@angular/core';
import { forkJoin } from 'rxjs';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatMenuModule } from '@angular/material/menu';
import { ConfirmationService, MessageService } from 'primeng/api';
import { DialogModule } from 'primeng/dialog';
import { ImageModule } from 'primeng/image';
import { Chart } from 'chart.js/auto';
import { ApiService } from '../core/api.service';
import { BrandingService } from '../core/branding.service';
import { VoucherPdfService } from '../core/voucher-pdf.service';
import { PdfPreviewDialogComponent } from '../shared/pdf-preview-dialog.component';

type Column = { key: string; label: string; type?: 'text' | 'money' | 'date' | 'status' | 'image' | 'count' };
type Field = { key: string; label: string; type?: 'text' | 'number' | 'password' | 'checkbox' | 'image' | 'permissions' | 'select' | 'multiselect' | 'date' | 'textarea'; required?: boolean; options?: { value: string; label: string }[] };
type PermissionOption = { id: number; key: string; module: string; label: string };

@Component({
  selector: 'app-crud-page',
  standalone: true,
  imports: [FormsModule, CurrencyPipe, DatePipe, RouterLink, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, MatDatepickerModule, MatNativeDateModule, MatMenuModule, DialogModule, ImageModule, PdfPreviewDialogComponent],
  template: `
  <section class="admin-page">
    <header class="admin-head">
      <div><span class="eyebrow">{{endpoint === 'company-settings' ? 'Configuracion / Empresa' : 'Administracion'}}</span><h1>{{endpoint === 'company-settings' ? 'Informacion de la Empresa' : title}}</h1><p>{{subtitle}}</p></div>
      @if (endpoint === 'sales') {
        <div class="header-actions">
          <button type="button" class="filter-btn" [matMenuTriggerFor]="paymentMenu"><mat-icon>filter_list</mat-icon>Filtrar</button>
          <mat-menu #paymentMenu="matMenu">
            <button mat-menu-item (click)="setSalesPaymentFilter('all')">Todos</button>
            <button mat-menu-item (click)="setSalesPaymentFilter('cash')">Efectivo</button>
            <button mat-menu-item (click)="setSalesPaymentFilter('yape')">Yape</button>
            <button mat-menu-item (click)="setSalesPaymentFilter('plin')">Plin</button>
            <button mat-menu-item (click)="setSalesPaymentFilter('card')">Tarjeta</button>
            <button mat-menu-item (click)="setSalesPaymentFilter('transfer')">Transferencia</button>
          </mat-menu>
          <button mat-flat-button class="filter-action" (click)="load()" [disabled]="loading"><mat-icon>refresh</mat-icon>{{loading ? 'Cargando' : 'Actualizar'}}</button>
        </div>
      } @else if (endpoint === 'expenses-income') {
        <div class="header-actions">
          <button mat-flat-button class="filter-action" (click)="load()" [disabled]="loading"><mat-icon>refresh</mat-icon>{{loading ? 'Cargando' : 'Actualizar'}}</button>
          <button mat-flat-button class="primary-action" (click)="openCreate()"><mat-icon>add</mat-icon>Nuevo Movimiento</button>
        </div>
      } @else {
        <button mat-flat-button class="primary-action" (click)="single ? openEdit(rows[0]) : openCreate()"><mat-icon>{{single ? 'edit' : 'add'}}</mat-icon>{{single ? (endpoint === 'company-settings' ? 'Editar Configuracion' : 'Editar') : (endpoint === 'products' ? 'Nuevo Producto' : (endpoint === 'warehouses' ? 'Nuevo Almacen' : (endpoint === 'users' ? 'Nuevo Usuario' : (endpoint === 'roles' ? 'Nuevo Rol' : 'Nuevo'))))}}</button>
      }
    </header>

    <div class="admin-panel">
      @if (endpoint !== 'sales' && endpoint !== 'expenses-income' && endpoint !== 'roles' && !single) {
        <div class="admin-toolbar">
          <div class="search-pill"><mat-icon>search</mat-icon><input type="text" [placeholder]="endpoint === 'users' ? 'Buscar usuarios por nombre, email o rol...' : 'Buscar...'" [(ngModel)]="search" (ngModelChange)="onSearchInput()" (keyup.enter)="load()"></div>
          <div class="toolbar-actions">
            @if (endpoint === 'users') {
              <button type="button" class="filter-btn" [matMenuTriggerFor]="userStatusMenu"><mat-icon>filter_list</mat-icon>Filtros</button>
              <mat-menu #userStatusMenu="matMenu">
                <button mat-menu-item (click)="setUserStatusFilter('all')">Todos</button>
                <button mat-menu-item (click)="setUserStatusFilter('active')">Activos</button>
                <button mat-menu-item (click)="setUserStatusFilter('inactive')">Inactivos</button>
              </mat-menu>
            }
            <button mat-flat-button class="filter-action" (click)="load()" [disabled]="loading"><mat-icon>refresh</mat-icon>{{loading ? 'Cargando' : 'Actualizar'}}</button>
          </div>
        </div>
      }
      @if (endpoint === 'expenses-income') {
        <div class="movements-toolbar">
          <div class="segmented-control">
            <button type="button" [class.active]="expensesTypeFilter === 'all'" (click)="setExpensesTypeFilter('all')">Todos</button>
            <button type="button" [class.active]="expensesTypeFilter === 'income'" (click)="setExpensesTypeFilter('income')">Ingresos</button>
            <button type="button" [class.active]="expensesTypeFilter === 'expense'" (click)="setExpensesTypeFilter('expense')">Egresos</button>
          </div>
          <select class="date-preset-select" [(ngModel)]="expensesDatePreset" (ngModelChange)="setExpensesDatePreset(expensesDatePreset)">
            <option value="today">Hoy</option>
            <option value="week">Esta semana</option>
            <option value="month">Este mes</option>
            <option value="all">Todo</option>
          </select>
          <span class="spacer"></span>
          <button type="button" class="icon-btn" title="Exportar CSV" (click)="exportMovementsCsv()"><mat-icon>download</mat-icon></button>
        </div>
      }

      @if (loading) { <div class="loading-state"><mat-icon>hourglass_empty</mat-icon><p>Cargando informacion...</p></div> }
      @else if (endpoint === 'products') {
        @if (productStats) {
          <div class="stats-row">
            @for (cat of productStats.topCategories; track cat.id) {
              <article class="stat-tile"><mat-icon>restaurant_menu</mat-icon><div><small>{{cat.name}}</small><strong>{{cat.count}}</strong></div></article>
            }
            <article class="stat-tile warn"><mat-icon>warning</mat-icon><div><small>Bajo stock</small><strong>{{productStats.lowStock}}</strong></div></article>
            <article class="stat-tile"><mat-icon>category</mat-icon><div><small>Categorias</small><strong>{{productStats.categoriesCount}}</strong></div></article>
          </div>
        }
        <div class="inventory-grid">
          @for (row of rows; track row.id) {
            <article class="inventory-card">
              <div class="inventory-image">
                <p-image [src]="imageUrl(row.image_path)" [alt]="row.name" [preview]="true" imageClass="product-preview-img" />
                <span class="category-badge">{{row.category?.name || 'Producto'}}</span>
              </div>
              <div class="inventory-body">
                <h2>{{row.name}}</h2><p>{{row.sku}}</p>
                <div class="inventory-metrics"><span><small>Precio</small><b>{{number(row.sale_price) | currency:'PEN':'S/ '}}</b></span><span><small>Stock</small><b>{{number(row.stock)}}</b></span><span><small>Minimo</small><b>{{number(row.min_stock)}}</b></span></div>
                <div class="row-actions"><span class="status-chip" [class.off]="!row.active">{{row.active ? 'Activo' : 'Inactivo'}}</span><span class="boxed-actions"><button mat-icon-button (click)="openEdit(row)"><mat-icon>edit</mat-icon></button><button mat-icon-button (click)="openDelete(row)"><mat-icon>delete</mat-icon></button></span></div>
              </div>
            </article>
          }
        </div>
        @if (total > 0) {
          <div class="pagination-bar">
            <span class="pagination-label">Mostrando {{rangeStart()}} - {{rangeEnd()}} de {{total}} productos</span>
            <div class="pagination-controls">
              <button type="button" class="page-btn" [disabled]="page <= 1" (click)="goToPage(page - 1)"><mat-icon>chevron_left</mat-icon></button>
              @for (p of pageNumbers(); track p) { <button type="button" class="page-btn" [class.current]="p === page" (click)="goToPage(p)">{{p}}</button> }
              <button type="button" class="page-btn" [disabled]="page >= lastPage" (click)="goToPage(page + 1)"><mat-icon>chevron_right</mat-icon></button>
            </div>
          </div>
        }
      } @else if (endpoint === 'warehouses') {
        @if (warehouseStats) {
          <div class="stats-row">
            <article class="stat-tile"><mat-icon>warehouse</mat-icon><div><small>Total almacenes</small><strong>{{warehouseStats.totalWarehouses}}</strong></div></article>
            <article class="stat-tile"><mat-icon>inventory_2</mat-icon><div><small>Stock total</small><strong>{{warehouseStats.totalStock}}</strong></div></article>
            <article class="stat-tile"><mat-icon>swap_horiz</mat-icon><div><small>Movimientos hoy</small><strong>{{warehouseStats.movementsToday}}</strong></div></article>
          </div>
        }
        <div class="panel-subhead">
          <h3>Listado de Almacenes</h3>
          <button type="button" class="filter-btn" [matMenuTriggerFor]="statusMenu"><mat-icon>filter_list</mat-icon>Filtrar</button>
          <mat-menu #statusMenu="matMenu">
            <button mat-menu-item (click)="setWarehouseStatusFilter('all')">Todos</button>
            <button mat-menu-item (click)="setWarehouseStatusFilter('active')">Activos</button>
            <button mat-menu-item (click)="setWarehouseStatusFilter('inactive')">Inactivos</button>
          </mat-menu>
        </div>
        <div class="data-table">
          <div class="data-row table-head" [style.--cols]="5"><span>Almacen</span><span>Descripcion</span><span>Productos</span><span>Stock</span><span>Estado</span><span class="table-actions">Acciones</span></div>
          @for (row of pagedWarehouseRows(); track row.id) {
            <div class="data-row" [style.--cols]="5">
              <span class="warehouse-name-cell"><span class="warehouse-icon"><mat-icon>warehouse</mat-icon></span><b>{{row.name}}</b></span>
              <span>{{row.description || '-'}}</span>
              <span><span class="count-pill"><mat-icon>inventory_2</mat-icon>{{number(row.products_count)}}</span></span>
              <span><span class="count-pill stock"><mat-icon>layers</mat-icon>{{number(row.products_sum_stock)}}</span></span>
              <span><b class="status-chip" [class.off]="!row.active">{{row.active ? 'Activo' : 'Inactivo'}}</b></span>
              <span class="table-actions boxed-actions"><button mat-icon-button (click)="openEdit(row)"><mat-icon>edit</mat-icon></button><button mat-icon-button (click)="openDelete(row)"><mat-icon>delete</mat-icon></button></span>
            </div>
          }
        </div>
        @if (filteredWarehouseRows().length > warehousePerPage) {
          <div class="pagination-bar">
            <span class="pagination-label">Mostrando {{warehouseRangeStart()}} - {{warehouseRangeEnd()}} de {{filteredWarehouseRows().length}} almacenes</span>
            <div class="pagination-controls">
              <button type="button" class="page-btn" [disabled]="warehousePage <= 1" (click)="goToWarehousePage(warehousePage - 1)"><mat-icon>chevron_left</mat-icon></button>
              @for (p of warehousePageNumbers(); track p) { <button type="button" class="page-btn" [class.current]="p === warehousePage" (click)="goToWarehousePage(p)">{{p}}</button> }
              <button type="button" class="page-btn" [disabled]="warehousePage >= warehouseLastPage()" (click)="goToWarehousePage(warehousePage + 1)"><mat-icon>chevron_right</mat-icon></button>
            </div>
          </div>
        }
      } @else if (endpoint === 'sales') {
        @if (salesStats) {
          <div class="stats-row">
            <article class="stat-tile"><mat-icon>payments</mat-icon><div><small>Ventas totales</small><strong>{{number(salesStats.todayTotal) | currency:'PEN':'S/ '}}</strong>
              @if (salesStats.trendPercent === null) { <span class="stat-trend neutral">Sin datos de ayer</span> }
              @else if (salesStats.trendPercent >= 0) { <span class="stat-trend positive">&uarr; +{{salesStats.trendPercent}}% hoy</span> }
              @else { <span class="stat-trend negative">&darr; {{salesStats.trendPercent}}% hoy</span> }
            </div></article>
            <article class="stat-tile"><mat-icon>receipt_long</mat-icon><div><small>Comprobantes</small><strong>{{salesStats.vouchersCount}}</strong><span class="stat-trend info">{{salesStats.issuedPercent}}% Emitidos</span></div></article>
            <article class="stat-tile"><mat-icon>trending_up</mat-icon><div><small>Ticket promedio</small><strong>{{number(salesStats.avgTicket) | currency:'PEN':'S/ '}}</strong><span class="stat-trend neutral">Estable</span></div></article>
            <article class="stat-tile"><mat-icon>star</mat-icon><div><small>Metodo popular</small><strong>{{paymentLabels[salesStats.popularMethod || ''] || 'N/A'}}</strong><span class="stat-trend info">{{salesStats.popularPercent}}% de ventas</span></div></article>
          </div>
        }
        <div class="data-table">
          <div class="data-row table-head" [style.--cols]="7"><span>Comprobante</span><span>Mesa</span><span>Cliente</span><span>Pago</span><span class="money-cell">Total</span><span>Fecha</span><span>Estado</span><span class="table-actions">Acciones</span></div>
          @for (row of rows; track row.id) {
            <div class="data-row" [style.--cols]="7">
              <span class="voucher-code">{{row.voucher_number}}</span>
              <span>@if (row.table_name) { <span class="count-pill stock">{{row.table_name}}</span> } @else { <span class="dash">&mdash;</span> }</span>
              <span>{{row.customer_name}}</span>
              <span class="payment-cell"><mat-icon>{{paymentIcons[row.payment_method] || 'payments'}}</mat-icon>{{paymentLabels[row.payment_method] || row.payment_method}}</span>
              <span class="money-cell"><b>{{number(row.total) | currency:'PEN':'S/ '}}</b></span>
              <span>{{row.created_at | date:'dd/MM/yyyy HH:mm'}}</span>
              <span><b class="status-chip">Pagado</b></span>
              <span class="table-actions boxed-actions"><button mat-icon-button title="Ver comprobante" (click)="previewVoucher(row)"><mat-icon>visibility</mat-icon></button></span>
            </div>
          }
        </div>
        @if (total > 0) {
          <div class="pagination-bar">
            <span class="pagination-label">Mostrando {{rangeStart()}} - {{rangeEnd()}} de {{total}} ventas</span>
            <div class="pagination-controls">
              <button type="button" class="page-btn" [disabled]="page <= 1" (click)="goToPage(page - 1)"><mat-icon>chevron_left</mat-icon></button>
              @for (p of pageNumbers(); track p) { <button type="button" class="page-btn" [class.current]="p === page" (click)="goToPage(p)">{{p}}</button> }
              <button type="button" class="page-btn" [disabled]="page >= lastPage" (click)="goToPage(page + 1)"><mat-icon>chevron_right</mat-icon></button>
            </div>
          </div>
        }
      } @else if (endpoint === 'expenses-income') {
        @if (expensesStats) {
          <div class="stats-row">
            <article class="stat-tile"><mat-icon>trending_up</mat-icon><div><small>Ingresos totales</small><strong>{{number(expensesStats.incomeTotal) | currency:'PEN':'S/ '}}</strong>
              @if (expensesStats.incomeTrend === null) { <span class="stat-trend neutral">Mes de {{currentMonthLabel}}</span> }
              @else { <span class="stat-trend" [class.positive]="expensesStats.incomeTrend >= 0" [class.negative]="expensesStats.incomeTrend < 0">{{expensesStats.incomeTrend >= 0 ? '+' : ''}}{{expensesStats.incomeTrend}}%</span> }
            </div></article>
            <article class="stat-tile warn"><mat-icon>trending_down</mat-icon><div><small>Egresos totales</small><strong>{{number(expensesStats.expenseTotal) | currency:'PEN':'S/ '}}</strong>
              @if (expensesStats.expenseTrend === null) { <span class="stat-trend neutral">Mes de {{currentMonthLabel}}</span> }
              @else { <span class="stat-trend" [class.negative]="expensesStats.expenseTrend >= 0" [class.positive]="expensesStats.expenseTrend < 0">{{expensesStats.expenseTrend >= 0 ? '+' : ''}}{{expensesStats.expenseTrend}}%</span> }
            </div></article>
            <article class="stat-tile balance"><mat-icon>account_balance_wallet</mat-icon><div><small>Balance neto</small><strong>{{number(expensesStats.balanceNet) | currency:'PEN':'S/ '}}</strong>
              <span class="balance-bar"><span class="balance-bar-fill" [style.width.%]="balanceBarWidth()"></span></span>
            </div></article>
            <article class="stat-tile"><mat-icon>point_of_sale</mat-icon><div><small>Caja actual</small><strong>{{number(expensesStats.cajaActual) | currency:'PEN':'S/ '}}</strong><span class="stat-trend" [class.info]="expensesStats.cajaStatus === 'open'" [class.neutral]="expensesStats.cajaStatus !== 'open'">{{expensesStats.cajaStatus === 'open' ? 'Conciliado' : 'Caja cerrada'}}</span></div></article>
          </div>
        }
        <div class="data-table">
          <div class="data-row table-head" [style.--cols]="7"><span>Tipo</span><span>Origen</span><span>Categoria</span><span>Descripcion</span><span>Pago</span><span class="money-cell">Monto</span><span>Fecha / Hora</span><span class="table-actions">Acciones</span></div>
          @for (row of rows; track row.movement_id) {
            <div class="data-row" [style.--cols]="7">
              <span class="type-cell" [class.expense]="row.type === 'expense'"><mat-icon>{{row.type === 'expense' ? 'arrow_downward' : 'arrow_upward'}}</mat-icon>{{row.type_label}}</span>
              <span>{{row.source}}</span>
              <span><span class="category-pill" [class.expense]="row.type === 'expense'">{{row.category}}</span></span>
              <span>{{row.description}}</span>
              <span class="payment-cell"><mat-icon>{{paymentIcons[row.payment_method] || 'payments'}}</mat-icon>{{paymentLabels[row.payment_method] || row.payment_method}}</span>
              <span class="money-cell"><b [class.expense-amount]="row.type === 'expense'" [class.income-amount]="row.type !== 'expense'">{{row.type === 'expense' ? '-' : '+'}}{{number(row.amount) | currency:'PEN':'S/ '}}</b></span>
              <span>{{row.created_at | date:'dd/MM/yyyy HH:mm'}}</span>
              <span class="table-actions">
                @if (row.editable) {
                  <span class="boxed-actions"><button mat-icon-button (click)="openEdit(row)"><mat-icon>edit</mat-icon></button><button mat-icon-button (click)="openDelete(row)"><mat-icon>delete</mat-icon></button></span>
                } @else {
                  <span class="auto-tag">Automatico</span>
                }
              </span>
            </div>
          }
        </div>
        @if (total > 0) {
          <div class="pagination-bar">
            <span class="pagination-label">Mostrando {{rangeStart()}} - {{rangeEnd()}} de {{total}} registros</span>
            <div class="pagination-controls">
              <button type="button" class="page-btn" [disabled]="page <= 1" (click)="goToPage(page - 1)"><mat-icon>chevron_left</mat-icon></button>
              @for (p of pageNumbers(); track p) { <button type="button" class="page-btn" [class.current]="p === page" (click)="goToPage(p)">{{p}}</button> }
              <button type="button" class="page-btn" [disabled]="page >= lastPage" (click)="goToPage(page + 1)"><mat-icon>chevron_right</mat-icon></button>
            </div>
          </div>
        }
        @if (expensesStats) {
          <div class="movements-footer">
            <article class="footer-card">
              <h3>Flujo Semanal</h3>
              <canvas #weeklyFlowChart></canvas>
            </article>
            <article class="footer-card">
              <h3>Metodos de Pago</h3>
              <div class="payment-breakdown">
                @for (m of expensesStats.paymentMethods; track m.method) {
                  <div class="payment-breakdown-item">
                    <div class="payment-breakdown-row">
                      <span class="payment-breakdown-label"><span class="dot" [style.background]="paymentColors[m.method] || '#94a3b8'"></span>{{paymentLabels[m.method] || m.method}}</span>
                      <span class="payment-breakdown-percent">{{m.percent}}%</span>
                    </div>
                    <div class="payment-breakdown-track"><div class="payment-breakdown-fill" [style.width.%]="m.percent" [style.background]="paymentColors[m.method] || '#94a3b8'"></div></div>
                  </div>
                }
                @if (!expensesStats.paymentMethods.length) { <small>Sin movimientos este mes.</small> }
              </div>
            </article>
          </div>
        }
      } @else if (endpoint === 'users') {
        @if (userStats) {
          <div class="stats-row">
            <article class="stat-tile"><mat-icon>group</mat-icon><div><small>Total Usuarios</small><strong>{{userStats.totalUsers}}</strong>
              @if (userStats.trendPercent === null) { <span class="stat-trend neutral">Sin datos del mes anterior</span> }
              @else { <span class="stat-trend positive">&uarr; +{{userStats.trendPercent}}% este mes</span> }
            </div></article>
            <article class="stat-tile ok"><mat-icon>how_to_reg</mat-icon><div><small>Usuarios Activos</small><strong>{{userStats.activeUsers}}</strong><span class="stat-trend info"><span class="live-dot"></span>Conectados ahora: {{userStats.onlineNow}}</span></div></article>
            <article class="stat-tile"><mat-icon>shield</mat-icon><div><small>Roles Creados</small><strong>{{userStats.totalRoles}}</strong><span class="stat-trend neutral">{{userStats.customRoles}} roles personalizados</span></div></article>
          </div>
        }
        <div class="data-table">
          <div class="data-row table-head" [style.--cols]="4"><span>Usuario</span><span>Email</span><span>Roles</span><span>Estado</span><span class="table-actions">Acciones</span></div>
          @for (row of rows; track row.id) {
            <div class="data-row" [style.--cols]="4">
              <span class="user-name-cell">
                <span class="user-avatar-initials">{{initials(row.name)}}</span>
                <span><b>{{row.name}}</b><small>ID: #U-{{row.id}}</small></span>
              </span>
              <span>{{row.email}}</span>
              <span class="role-pill-list">
                @for (r of row.roles; track r.id) { <span class="category-pill">{{r.name}}</span> }
                @if (!row.roles?.length) { <span class="dash">&mdash;</span> }
              </span>
              <span><span class="status-dot-label"><span class="status-dot" [class.off]="!row.active"></span>{{row.active ? 'Activo' : 'Inactivo'}}</span></span>
              <span class="table-actions boxed-actions"><button mat-icon-button (click)="openEdit(row)"><mat-icon>edit</mat-icon></button><button mat-icon-button (click)="openDelete(row)"><mat-icon>delete</mat-icon></button></span>
            </div>
          }
        </div>
        @if (total > 0) {
          <div class="pagination-bar">
            <span class="pagination-label">Mostrando {{rangeStart()}} - {{rangeEnd()}} de {{total}} usuarios</span>
            <div class="pagination-controls">
              <button type="button" class="page-btn" [disabled]="page <= 1" (click)="goToPage(page - 1)"><mat-icon>chevron_left</mat-icon></button>
              @for (p of pageNumbers(); track p) { <button type="button" class="page-btn" [class.current]="p === page" (click)="goToPage(p)">{{p}}</button> }
              <button type="button" class="page-btn" [disabled]="page >= lastPage" (click)="goToPage(page + 1)"><mat-icon>chevron_right</mat-icon></button>
            </div>
          </div>
        }
      } @else if (endpoint === 'roles') {
        @if (roleStats) {
          <div class="stats-row">
            <article class="stat-tile"><mat-icon>shield</mat-icon><div><small>Roles Activos</small><strong>{{pad2(roleStats.activeRoles)}}</strong><span class="stat-trend positive">+{{roleStats.newThisMonth}} este mes</span></div></article>
            <article class="stat-tile"><mat-icon>group</mat-icon><div><small>Total Usuarios</small><strong>{{roleStats.totalUsers}}</strong></div></article>
            <article class="stat-tile security-tile"><mat-icon>verified_user</mat-icon><div><small>Sistema de Seguridad</small><strong>Nivel de Integridad: Alto</strong><span class="stat-trend neutral">Todas las sesiones estan encriptadas y los permisos se auditan cada 24 horas.</span></div></article>
          </div>
        }
        <div class="data-table">
          <div class="data-row table-head" [style.--cols]="4"><span>Nombre del Rol</span><span>Descripcion</span><span class="money-cell">Permisos</span><span>Estado</span><span class="table-actions">Acciones</span></div>
          @for (row of rows; track row.id) {
            <div class="data-row" [style.--cols]="4">
              <span class="role-name-cell"><span class="role-icon"><mat-icon>{{roleIcon(row.name)}}</mat-icon></span><b>{{row.name}}</b></span>
              <span>{{row.description || '-'}}</span>
              <span class="money-cell"><span class="category-pill">{{permissionCountLabel(row)}}</span></span>
              <span><span class="status-dot-label"><span class="status-dot" [class.off]="!row.active"></span>{{row.active ? 'Activo' : 'Suspendido'}}</span></span>
              <span class="table-actions boxed-actions"><button mat-icon-button (click)="openEdit(row)"><mat-icon>edit</mat-icon></button><button mat-icon-button (click)="openDelete(row)"><mat-icon>delete</mat-icon></button></span>
            </div>
          }
        </div>
        <div class="pagination-bar">
          <span class="pagination-label">Mostrando {{rows.length}} de {{rows.length}} roles</span>
          <div class="pagination-controls"><span class="page-btn current">1</span></div>
        </div>
        <div class="roles-footer-grid">
          <article class="role-tip-card">
            <mat-icon>info</mat-icon>
            <div><strong>Consejo de Administracion</strong><p>Recuerda aplicar el principio de "minimo privilegio". Otorga a cada rol unicamente los permisos estrictamente necesarios para su operacion diaria para mantener la seguridad del negocio.</p></div>
          </article>
          @if (roleStats?.lastChange; as change) {
            <article class="role-audit-card">
              <div class="role-audit-head"><span class="role-audit-avatar"><mat-icon>manage_accounts</mat-icon></span><div><b>{{change.userName}}</b><small>Ultimo cambio {{timeAgo(change.createdAt)}}</small></div></div>
              <div class="role-audit-body"><span>{{change.description}}</span><a routerLink="/app/activity-logs">Ver Log</a></div>
            </article>
          }
        </div>
      } @else if (single) {
        @if (rows[0]; as company) {
          <div class="company-view-grid">
            <article class="company-identity-card">
              <div class="company-logo-preview">
                @if (branding.logoUrl()) { <img [src]="branding.logoUrl()" alt="Logo"> }
                @else { <mat-icon>storefront</mat-icon> }
              </div>
              <div class="company-identity-text">
                <span class="company-identity-label">Identidad Corporativa</span>
                <h2>{{company.name}}</h2>
                @if (company.slogan) { <p class="company-slogan">"{{company.slogan}}"</p> }
                <div class="role-pill-list">
                  <span class="category-pill">{{companyStatusLabel(company.status)}}</span>
                  <span class="category-pill">Sede Principal</span>
                </div>
              </div>
            </article>

            <article class="company-status-card">
              <span class="company-status-label">Estado Operativo</span>
              <strong>{{company.business_type === 'restaurant' ? 'Restaurante' : 'Mercado'}}</strong>
              <p>El sistema se encuentra configurado para atencion {{company.business_type === 'restaurant' ? 'en salon y delivery' : 'de mostrador y ventas rapidas'}}.</p>
              @if (company.last_audit) {
                <div class="company-audit-row">
                  <div><small>Ultima Auditoria</small><b>{{company.last_audit.created_at | date:'dd/MM/yyyy, hh:mm a'}}</b></div>
                  <a routerLink="/app/activity-logs">Ver Logs <mat-icon>arrow_forward</mat-icon></a>
                </div>
              }
            </article>
          </div>

          <div class="stats-row company-info-tiles">
            <article class="stat-tile"><mat-icon>badge</mat-icon><div><small>RUC</small><strong>{{company.ruc || 'No registrado'}}</strong></div></article>
            <article class="stat-tile"><mat-icon>call</mat-icon><div><small>Telefono</small><strong>{{company.phone || 'No registrado'}}</strong></div></article>
            <article class="stat-tile"><mat-icon>place</mat-icon><div><small>Direccion</small><strong>{{company.address || 'No registrada'}}</strong></div></article>
            <article class="stat-tile"><mat-icon>mail</mat-icon><div><small>Email</small><strong>{{company.owner_email || 'No registrado'}}</strong></div></article>
          </div>

          <div class="reports-charts company-bottom-grid">
            <article class="footer-card">
              <h3>Detalles Operativos</h3>
              <div class="role-summary-row"><span>Modo del Sistema</span><span class="category-pill">{{company.business_type === 'restaurant' ? 'Restaurante' : 'Mercado'}}</span></div>
              <div class="role-summary-row"><span>Tasa de IGV</span><b>{{company.igv_percent}} %</b></div>
              <div class="role-summary-row"><span>Propina Predeterminada</span><b>{{company.default_tip}} %</b></div>
              <div class="company-note"><mat-icon>info</mat-icon>Los cambios en IGV afectaran a todas las comandas nuevas.</div>
            </article>
            <article class="footer-card">
              <h3>Resumen de Facturacion</h3>
              <div class="company-billing-tiles">
                <div class="stat-tile"><div><small>Serie Actual</small><strong>{{company.voucher_series}}</strong></div></div>
                <div class="stat-tile"><div><small>Siguiente Ticket</small><strong>{{company.next_voucher_number}}</strong></div></div>
              </div>
              <span class="company-note-label">Configuracion de Comprobantes</span>
              <div class="role-pill-list"><span class="category-pill">Tickets POS ({{company.ticket_width}}mm)</span></div>
            </article>
          </div>
        }
      } @else {
        <div class="data-table">
          <div class="data-row table-head" [style.--cols]="columns.length">@for (col of columns; track col.key) { <span [class.money-cell]="col.type === 'money'">{{col.label}}</span> }<span class="table-actions">Acciones</span></div>
          @for (row of rows; track row.id || row.name || row.voucher_number || $index) {
            <div class="data-row" [style.--cols]="columns.length">
              @for (col of columns; track col.key) {
                <span [class.money-cell]="col.type === 'money'">
                  @if (col.type === 'status') { <b class="status-chip" [class.off]="!value(row, col.key)">{{value(row, col.key) ? 'Activo' : 'Inactivo'}}</b> }
                  @else if (col.type === 'money') { <b>{{number(value(row, col.key)) | currency:'PEN':'S/ '}}</b> }
                  @else if (col.type === 'date') { {{value(row, col.key) | date:'dd/MM/yyyy HH:mm'}} }
                  @else if (col.type === 'count') { {{count(value(row, col.key))}} }
                  @else { {{display(row, col)}} }
                </span>
              }
              <span class="table-actions">
                @if (row.editable !== false) {
                  <button mat-icon-button (click)="openEdit(row)"><mat-icon>edit</mat-icon></button><button mat-icon-button (click)="openDelete(row)"><mat-icon>delete</mat-icon></button>
                } @else {
                  <span class="readonly-chip">Automatico</span>
                }
              </span>
            </div>
          }
        </div>
      }

      @if (!loading && !rows.length) { <div class="empty-state"><mat-icon>inbox</mat-icon><p>No hay registros para mostrar.</p></div> }
      @if (error) { <div class="error-state"><mat-icon>error_outline</mat-icon><p>{{error}}</p></div> }
    </div>

    <p-dialog [(visible)]="modalOpen" [modal]="true" [dismissableMask]="true" [style]="{ width: 'min(760px, 94vw)' }" [contentStyle]="{ 'max-height': '72vh', overflow: 'auto' }">
      <ng-template pTemplate="header"><div class="dialog-title"><h2>{{modalMode === 'create' ? 'Nuevo' : 'Editar'}} {{title}}</h2></div></ng-template>
      <div class="modal-grid">
        @for (field of modalFields; track field.key) {
          @if (field.type === 'image') {
            <div class="image-field">
              <span>{{field.label}}</span>
              <button type="button" class="image-dropzone" [class.uploading]="uploadingImage" (click)="fileInput.click()" (dragover)="onImageDragOver($event)" (drop)="onImageDrop($event)">
                @if (modalModel[field.key]) { <p-image [src]="imageUrl(modalModel[field.key])" alt="Imagen del producto" [preview]="true" imageClass="dropzone-preview-img" /> }
                @else { <mat-icon>cloud_upload</mat-icon> }
                <strong>{{uploadingImage ? 'Subiendo imagen...' : 'Seleccionar o arrastrar imagen'}}</strong>
                <small>JPG, PNG o WEBP hasta 4MB</small>
              </button>
              <input #fileInput type="file" accept="image/png,image/jpeg,image/webp" hidden (change)="onImageSelected($event)">
              <code>{{modalModel[field.key] || 'Sin imagen seleccionada'}}</code>
            </div>
          } @else if (field.type === 'permissions') {
            <div class="permissions-field">
              <div class="permissions-head"><span>{{field.label}}</span><strong>{{selectedPermissionCount()}} seleccionados</strong></div>
              @for (group of permissionGroups(); track group.module) {
                <section class="permission-module">
                  <button type="button" class="permission-module-head" (click)="togglePermissionModule(group.module)">
                    <span>{{group.module}}</span>
                    <small>{{selectedPermissionCount(group.items)}} / {{group.items.length}}</small>
                    <mat-icon>{{isPermissionModuleOpen(group.module) ? 'expand_less' : 'expand_more'}}</mat-icon>
                  </button>
                  @if (isPermissionModuleOpen(group.module)) {
                    <div class="permission-list">
                      @for (permission of group.items; track permission.id) {
                        <label class="permission-check">
                          <input type="checkbox" [checked]="hasPermission(permission.id)" (change)="togglePermission(permission.id, $any($event.target).checked)">
                          <span><b>{{permission.label}}</b><small>{{permission.key}}</small></span>
                        </label>
                      }
                    </div>
                  }
                </section>
              }
            </div>
          } @else if (field.type === 'select' && field.key === 'category_id') {
            <div class="category-field">
              <mat-form-field appearance="outline"><mat-label>{{field.label}}</mat-label><select matNativeControl [(ngModel)]="modalModel[field.key]">@for (option of field.options || []; track option.value) { <option [value]="option.value">{{option.label}}</option> }</select></mat-form-field>
              @if (!showNewCategory) {
                <button type="button" mat-button class="add-category-btn" (click)="showNewCategory = true"><mat-icon>add</mat-icon>Nueva categoria</button>
              } @else {
                <div class="inline-create-form">
                  <input placeholder="Nombre de categoria" [(ngModel)]="newCategoryName" (keyup.enter)="createCategory()">
                  <button type="button" mat-icon-button [disabled]="creatingCategory || !newCategoryName.trim()" (click)="createCategory()"><mat-icon>check</mat-icon></button>
                  <button type="button" mat-icon-button (click)="cancelNewCategory()"><mat-icon>close</mat-icon></button>
                </div>
              }
            </div>
          } @else if (field.type === 'select') {
            <mat-form-field appearance="outline"><mat-label>{{field.label}}</mat-label><select matNativeControl [(ngModel)]="modalModel[field.key]">@for (option of field.options || []; track option.value) { <option [value]="option.value">{{option.label}}</option> }</select></mat-form-field>
          } @else if (field.type === 'multiselect') {
            <div class="multiselect-field">
              <span>{{field.label}}</span>
              <div class="multiselect-options">
                @for (option of field.options || []; track option.value) {
                  <label class="permission-check">
                    <input type="checkbox" [checked]="hasOption(field.key, option.value)" (change)="toggleOption(field.key, option.value, $any($event.target).checked)">
                    <span>{{option.label}}</span>
                  </label>
                }
                @if (!(field.options || []).length) { <small>No hay opciones disponibles.</small> }
              </div>
            </div>
          } @else if (field.type === 'textarea') {
            <mat-form-field appearance="outline"><mat-label>{{field.label}}</mat-label><textarea matInput rows="3" [(ngModel)]="modalModel[field.key]"></textarea></mat-form-field>
          } @else if (field.type === 'date') {
            <mat-form-field appearance="outline"><mat-label>{{field.label}}</mat-label><input matInput [matDatepicker]="picker" [(ngModel)]="modalModel[field.key]"><mat-datepicker-toggle matIconSuffix [for]="picker"></mat-datepicker-toggle><mat-datepicker #picker></mat-datepicker></mat-form-field>
          } @else if (field.type === 'checkbox') { <label class="check-field"><input type="checkbox" [(ngModel)]="modalModel[field.key]"> {{field.label}}</label> }
          @else { <mat-form-field appearance="outline"><mat-label>{{field.label}}</mat-label><input matInput [type]="field.type || 'text'" [(ngModel)]="modalModel[field.key]"></mat-form-field> }
        }
      </div>
      <ng-template pTemplate="footer"><div class="modal-actions"><button mat-stroked-button (click)="closeModal()">Cancelar</button><button mat-flat-button class="primary-action" (click)="saveModal()"><mat-icon>save</mat-icon>Guardar</button></div></ng-template>
    </p-dialog>

    <app-pdf-preview-dialog [visible]="pdfPreviewVisible" [pdfUrl]="pdfPreviewUrl" [title]="pdfPreviewTitle" (visibleChange)="pdfPreviewVisible = $event" (closed)="onPdfPreviewClosed()" />
  </section>`
})
export class CrudPageComponent implements OnInit {
  route = inject(ActivatedRoute); router = inject(Router); api = inject(ApiService); cdr = inject(ChangeDetectorRef); messages = inject(MessageService); confirmation = inject(ConfirmationService);
  voucherPdf = inject(VoucherPdfService); branding = inject(BrandingService);
  pdfPreviewVisible = false; pdfPreviewUrl: string | null = null; pdfPreviewTitle = '';
  title = ''; subtitle = ''; endpoint = ''; single = false; rows: any[] = []; search = ''; columns: Column[] = []; loading = false; error = '';
  availablePermissions: PermissionOption[] = []; openPermissionModules = new Set<string>();
  categoryOptions: { value: string; label: string }[] = []; warehouseOptions: { value: string; label: string }[] = []; private lookupsLoaded = false;
  roleOptions: { value: string; label: string }[] = []; private userLookupsLoaded = false;
  modalOpen = false; modalMode: 'create' | 'edit' = 'create'; modalModel: any = {}; modalFields: Field[] = []; uploadingImage = false;
  showNewCategory = false; newCategoryName = ''; creatingCategory = false;
  page = 1; perPage = 12; total = 0; lastPage = 1;
  productStats: { topCategories: { id: number; name: string; count: number }[]; lowStock: number; categoriesCount: number } | null = null;
  warehouseStats: { totalWarehouses: number; totalStock: number; movementsToday: number } | null = null;
  warehouseStatusFilter: 'all' | 'active' | 'inactive' = 'all';
  warehousePage = 1; warehousePerPage = 8;
  salesStats: { todayTotal: number; trendPercent: number | null; vouchersCount: number; issuedPercent: number; avgTicket: number; popularMethod: string | null; popularPercent: number } | null = null;
  salesPaymentFilter = 'all';
  paymentLabels: Record<string, string> = { cash: 'Efectivo', yape: 'Yape', plin: 'Plin', card: 'Tarjeta', transfer: 'Transferencia', mixed: 'Mixto' };
  paymentIcons: Record<string, string> = { cash: 'payments', yape: 'smartphone', plin: 'smartphone', card: 'credit_card', transfer: 'account_balance', mixed: 'call_split' };
  paymentColors: Record<string, string> = { cash: '#0f766e', card: '#2563eb', yape: '#7c3aed', plin: '#0891b2', transfer: '#ca8a04', mixed: '#64748b' };
  expensesStats: { incomeTotal: number; incomeTrend: number | null; expenseTotal: number; expenseTrend: number | null; balanceNet: number; cajaActual: number; cajaStatus: string; weeklyFlow: { dayIndex: number; total: number; isWeekend: boolean }[]; paymentMethods: { method: string; total: number; percent: number }[] } | null = null;
  expensesTypeFilter: 'all' | 'income' | 'expense' = 'all';
  expensesDatePreset: 'today' | 'week' | 'month' | 'all' = 'month';
  currentMonthLabel = new Date().toLocaleDateString('es-PE', { month: 'long' });
  @ViewChild('weeklyFlowChart') weeklyFlowChartEl?: ElementRef<HTMLCanvasElement>;
  private weeklyFlowChart?: Chart;
  userStats: { totalUsers: number; trendPercent: number | null; activeUsers: number; onlineNow: number; totalRoles: number; customRoles: number } | null = null;
  userStatusFilter: 'all' | 'active' | 'inactive' = 'all';
  roleStats: { activeRoles: number; newThisMonth: number; totalUsers: number; lastChange: { description: string; userName: string; createdAt: string } | null } | null = null;
  private requestId = 0;
  private searchTimer: ReturnType<typeof setTimeout> | undefined;

  ngOnInit() { this.route.data.subscribe(d => { this.title = d['title']; this.endpoint = d['endpoint']; this.single = !!d['single']; this.columns = this.columnsFor(this.endpoint); this.subtitle = this.subtitleFor(this.endpoint); this.search = ''; this.page = 1; this.perPage = this.endpoint === 'sales' || this.endpoint === 'expenses-income' ? 10 : (this.endpoint === 'users' ? 8 : 12); this.warehousePage = 1; this.warehouseStatusFilter = 'all'; this.salesPaymentFilter = 'all'; this.expensesTypeFilter = 'all'; this.expensesDatePreset = 'month'; this.userStatusFilter = 'all'; this.rows = []; this.load(); if (this.endpoint === 'products') { this.loadProductLookups(); this.loadProductStats(); } if (this.endpoint === 'warehouses') this.loadWarehouseStats(); if (this.endpoint === 'sales') this.loadSalesStats(); if (this.endpoint === 'expenses-income') this.loadExpensesStats(); if (this.endpoint === 'users') { this.loadUserLookups(); this.loadUserStats(); } if (this.endpoint === 'roles') this.loadRoleStats(); }); }
  loadProductStats() {
    this.api.get<any>('products-stats').subscribe(res => {
      this.productStats = { topCategories: res?.top_categories || [], lowStock: Number(res?.low_stock || 0), categoriesCount: Number(res?.categories_count || 0) };
      this.cdr.detectChanges();
    });
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

  loadWarehouseStats() {
    this.api.get<any>('warehouses-stats').subscribe(res => {
      this.warehouseStats = { totalWarehouses: Number(res?.total_warehouses || 0), totalStock: Number(res?.total_stock || 0), movementsToday: Number(res?.movements_today || 0) };
      this.cdr.detectChanges();
    });
  }
  setWarehouseStatusFilter(filter: 'all' | 'active' | 'inactive') { this.warehouseStatusFilter = filter; this.warehousePage = 1; }
  filteredWarehouseRows() {
    let rows = this.rows;
    if (this.warehouseStatusFilter === 'active') rows = rows.filter(r => r.active);
    if (this.warehouseStatusFilter === 'inactive') rows = rows.filter(r => !r.active);
    const term = this.search.trim().toLowerCase();
    if (term) rows = rows.filter(r => (r.name || '').toLowerCase().includes(term) || (r.description || '').toLowerCase().includes(term));
    return rows;
  }
  pagedWarehouseRows() { const start = (this.warehousePage - 1) * this.warehousePerPage; return this.filteredWarehouseRows().slice(start, start + this.warehousePerPage); }
  warehouseLastPage() { return Math.max(1, Math.ceil(this.filteredWarehouseRows().length / this.warehousePerPage)); }
  warehouseRangeStart() { return this.filteredWarehouseRows().length ? (this.warehousePage - 1) * this.warehousePerPage + 1 : 0; }
  warehouseRangeEnd() { return Math.min(this.warehousePage * this.warehousePerPage, this.filteredWarehouseRows().length); }
  warehousePageNumbers(): number[] {
    const span = 5; const lastPage = this.warehouseLastPage();
    let start = Math.max(1, this.warehousePage - Math.floor(span / 2));
    const end = Math.min(lastPage, start + span - 1);
    start = Math.max(1, end - span + 1);
    const pages: number[] = [];
    for (let p = start; p <= end; p++) pages.push(p);
    return pages;
  }
  goToWarehousePage(p: number) { if (p < 1 || p > this.warehouseLastPage() || p === this.warehousePage) return; this.warehousePage = p; }

  loadSalesStats() {
    this.api.get<any>('sales-stats').subscribe(res => {
      this.salesStats = {
        todayTotal: Number(res?.today_total || 0),
        trendPercent: res?.trend_percent === null || res?.trend_percent === undefined ? null : Number(res.trend_percent),
        vouchersCount: Number(res?.vouchers_count || 0),
        issuedPercent: Number(res?.issued_percent || 0),
        avgTicket: Number(res?.avg_ticket || 0),
        popularMethod: res?.popular_method || null,
        popularPercent: Number(res?.popular_percent || 0),
      };
      this.cdr.detectChanges();
    });
  }
  setSalesPaymentFilter(method: string) { this.salesPaymentFilter = method; this.page = 1; this.load(); }

  loadExpensesStats() {
    this.api.get<any>('expenses-income-stats').subscribe(res => {
      this.expensesStats = {
        incomeTotal: Number(res?.income_total || 0),
        incomeTrend: res?.income_trend === null || res?.income_trend === undefined ? null : Number(res.income_trend),
        expenseTotal: Number(res?.expense_total || 0),
        expenseTrend: res?.expense_trend === null || res?.expense_trend === undefined ? null : Number(res.expense_trend),
        balanceNet: Number(res?.balance_net || 0),
        cajaActual: Number(res?.caja_actual || 0),
        cajaStatus: res?.caja_status || 'closed',
        weeklyFlow: (res?.weekly_flow || []).map((d: any) => ({ dayIndex: Number(d.day_index), total: Number(d.total || 0), isWeekend: !!d.is_weekend })),
        paymentMethods: (res?.payment_methods || []).map((m: any) => ({ method: m.method, total: Number(m.total || 0), percent: Number(m.percent || 0) })),
      };
      this.cdr.detectChanges();
      setTimeout(() => this.renderWeeklyFlowChart(), 0);
    });
  }
  setExpensesTypeFilter(filter: 'all' | 'income' | 'expense') { this.expensesTypeFilter = filter; this.page = 1; this.load(); }
  setExpensesDatePreset(preset: 'today' | 'week' | 'month' | 'all') { this.expensesDatePreset = preset; this.page = 1; this.load(); }
  expensesDateRange(): { from: string | null; to: string | null } {
    const today = new Date();
    const fmt = (d: Date) => { const y = d.getFullYear(); const m = String(d.getMonth() + 1).padStart(2, '0'); const day = String(d.getDate()).padStart(2, '0'); return `${y}-${m}-${day}`; };
    if (this.expensesDatePreset === 'today') return { from: fmt(today), to: fmt(today) };
    if (this.expensesDatePreset === 'week') { const start = new Date(today); start.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1)); return { from: fmt(start), to: fmt(today) }; }
    if (this.expensesDatePreset === 'month') { const start = new Date(today.getFullYear(), today.getMonth(), 1); return { from: fmt(start), to: fmt(today) }; }
    return { from: null, to: null };
  }
  balanceBarWidth(): number {
    if (!this.expensesStats) return 0;
    const income = this.expensesStats.incomeTotal;
    return income > 0 ? Math.max(4, Math.min(100, Math.round((this.expensesStats.balanceNet / income) * 100))) : 0;
  }
  renderWeeklyFlowChart() {
    const el = this.weeklyFlowChartEl?.nativeElement;
    if (!el || !this.expensesStats) return;
    const days = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'];
    this.weeklyFlowChart?.destroy();
    this.weeklyFlowChart = new Chart(el, {
      type: 'bar',
      data: {
        labels: this.expensesStats.weeklyFlow.map(d => days[d.dayIndex] ?? ''),
        datasets: [{
          data: this.expensesStats.weeklyFlow.map(d => d.total),
          backgroundColor: this.expensesStats.weeklyFlow.map(d => d.isWeekend ? '#9f1239' : '#0f766e'),
          borderRadius: 6,
          maxBarThickness: 42,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true } },
      },
    });
  }
  exportMovementsCsv() {
    const header = ['Tipo', 'Origen', 'Categoria', 'Descripcion', 'Pago', 'Monto', 'Fecha'];
    const lines = this.rows.map(r => [r.type_label, r.source, r.category, r.description, this.paymentLabels[r.payment_method] || r.payment_method, this.number(r.amount), r.date].map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','));
    const csv = [header.join(','), ...lines].join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `movimientos-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
  loadProductLookups(after?: () => void) {
    if (this.lookupsLoaded) { after?.(); return; }
    forkJoin({ categories: this.api.get<any[]>('categories'), warehouses: this.api.get<any[]>('warehouses') }).subscribe(({ categories, warehouses }) => {
      this.categoryOptions = (categories || []).map((c: any) => ({ value: String(c.id), label: c.name }));
      this.warehouseOptions = (warehouses || []).map((w: any) => ({ value: String(w.id), label: w.name }));
      this.lookupsLoaded = true;
      after?.();
    });
  }
  loadUserLookups(after?: () => void) {
    if (this.userLookupsLoaded) { after?.(); return; }
    this.api.get<any>('roles').subscribe((res: any) => {
      this.roleOptions = (res?.roles || []).map((r: any) => ({ value: String(r.id), label: r.name }));
      this.userLookupsLoaded = true;
      after?.();
    });
  }

  loadUserStats() {
    this.api.get<any>('users-stats').subscribe(res => {
      this.userStats = {
        totalUsers: Number(res?.total_users || 0), trendPercent: res?.trend_percent === null || res?.trend_percent === undefined ? null : Number(res.trend_percent),
        activeUsers: Number(res?.active_users || 0), onlineNow: Number(res?.online_now || 0),
        totalRoles: Number(res?.total_roles || 0), customRoles: Number(res?.custom_roles || 0),
      };
      this.cdr.detectChanges();
    });
  }
  setUserStatusFilter(filter: 'all' | 'active' | 'inactive') { this.userStatusFilter = filter; this.page = 1; this.load(); }

  loadRoleStats() {
    this.api.get<any>('roles-stats').subscribe(res => {
      this.roleStats = {
        activeRoles: Number(res?.active_roles || 0), newThisMonth: Number(res?.new_this_month || 0), totalUsers: Number(res?.total_users || 0),
        lastChange: res?.last_change ? { description: res.last_change.description, userName: res.last_change.user_name, createdAt: res.last_change.created_at } : null,
      };
      this.cdr.detectChanges();
    });
  }
  pad2(n: number) { return String(n).padStart(2, '0'); }
  companyStatusLabels: Record<string, string> = { trial: 'Cuenta en Prueba', active: 'Cuenta Activa', suspended: 'Cuenta Suspendida', cancelled: 'Cuenta Cancelada' };
  companyStatusLabel(status: string) { return this.companyStatusLabels[status] || status; }
  roleIconMap: Record<string, string> = { Administrador: 'admin_panel_settings', Cajero: 'point_of_sale', Almacen: 'warehouse', Supervisor: 'visibility' };
  roleIcon(name: string) { return this.roleIconMap[name] || 'shield'; }
  permissionCountLabel(row: any): string {
    const count = Array.isArray(row.permissions) ? row.permissions.length : 0;
    if (this.availablePermissions.length && count === this.availablePermissions.length) return 'Todos';
    return `${this.pad2(count)} Permisos`;
  }
  timeAgo(date: string): string {
    const seconds = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 1000));
    if (seconds < 60) return 'hace un momento';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `hace ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `hace ${hours} hora${hours === 1 ? '' : 's'}`;
    const days = Math.floor(hours / 24);
    return `hace ${days} dia${days === 1 ? '' : 's'}`;
  }
  initials(name: string): string {
    const parts = (name || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
  }

  onSearchInput() { this.page = 1; this.warehousePage = 1; clearTimeout(this.searchTimer); this.searchTimer = setTimeout(() => this.load(), 350); }

  load() {
    const id = ++this.requestId; const endpoint = this.endpoint; this.loading = true; this.error = ''; this.rows = []; this.cdr.detectChanges();
    const params: Record<string, any> = this.search ? { search: this.search } : {};
    if (endpoint === 'products' || endpoint === 'sales' || endpoint === 'expenses-income' || endpoint === 'users') { params['page'] = this.page; params['per_page'] = this.perPage; }
    if (endpoint === 'sales' && this.salesPaymentFilter !== 'all') { params['payment_method'] = this.salesPaymentFilter; }
    if (endpoint === 'users' && this.userStatusFilter !== 'all') { params['status'] = this.userStatusFilter; }
    if (endpoint === 'expenses-income') {
      if (this.expensesTypeFilter !== 'all') params['type'] = this.expensesTypeFilter;
      const range = this.expensesDateRange();
      if (range.from) params['from'] = range.from;
      if (range.to) params['to'] = range.to;
    }
    this.api.get<any>(endpoint, params).subscribe({
      next: (res: any) => {
        if (id !== this.requestId || endpoint !== this.endpoint) return;
        this.rows = this.normalizeRows(res);
        if (endpoint === 'products' || endpoint === 'sales' || endpoint === 'expenses-income' || endpoint === 'users') { this.total = Number(res?.total || 0); this.lastPage = Number(res?.last_page || 1); this.page = Number(res?.current_page || 1); }
        this.loading = false; this.cdr.detectChanges();
        if (endpoint === 'expenses-income' && this.expensesStats) setTimeout(() => this.renderWeeklyFlowChart(), 0);
      },
      error: (err: any) => { if (id !== this.requestId) return; this.loading = false; this.rows = []; this.error = err?.error?.message || 'No se pudo cargar la informacion del modulo.'; this.messages.add({ severity: 'error', summary: 'Error', detail: this.error }); this.cdr.detectChanges(); }
    });
  }
  normalizeRows(res: any): any[] { if (this.endpoint === 'roles' && Array.isArray(res?.permissions)) { this.availablePermissions = res.permissions; this.openPermissionModules = new Set(this.availablePermissions.slice(0, 2).map(p => p.module)); } if (this.single) return res ? [res] : []; if (Array.isArray(res)) return res; if (Array.isArray(res?.data)) return res.data; if (Array.isArray(res?.roles)) return res.roles; return []; }

  openCreate() {
    if (this.endpoint === 'sales') return;
    if (this.endpoint === 'roles') { this.router.navigateByUrl('/app/roles/new'); return; }
    if (this.endpoint === 'products' && !this.lookupsLoaded) { this.loadProductLookups(() => this.openCreate()); return; }
    if (this.endpoint === 'users' && !this.userLookupsLoaded) { this.loadUserLookups(() => this.openCreate()); return; }
    this.cancelNewCategory();
    this.modalMode = 'create'; this.modalFields = this.fieldsFor(this.endpoint, true); this.modalModel = this.defaultsFor(this.endpoint); if (this.endpoint === 'roles') this.modalModel.permissions = []; if (this.endpoint === 'users') this.modalModel.roles = []; this.modalOpen = true;
  }
  openEdit(row: any) {
    if (!row || row.editable === false || this.endpoint === 'sales') { if (row?.editable === false || this.endpoint === 'sales') this.messages.add({ severity: 'info', summary: 'Movimiento automatico', detail: 'Las ventas se registran desde el modulo POS.' }); return; }
    if (this.endpoint === 'roles') { this.router.navigateByUrl(`/app/roles/${row.id}/edit`); return; }
    if (this.endpoint === 'company-settings') { this.router.navigateByUrl('/app/company/edit'); return; }
    if (this.endpoint === 'products' && !this.lookupsLoaded) { this.loadProductLookups(() => this.openEdit(row)); return; }
    if (this.endpoint === 'users' && !this.userLookupsLoaded) { this.loadUserLookups(() => this.openEdit(row)); return; }
    this.cancelNewCategory();
    this.modalMode = 'edit'; this.modalFields = this.fieldsFor(this.endpoint, false);
    this.modalModel = { ...row, roles: this.endpoint === 'users' ? this.idArrayStr(row.roles) : this.ids(row.roles), permissions: this.endpoint === 'roles' ? this.idArray(row.permissions) : this.ids(row.permissions) };
    if (this.endpoint === 'products') { this.modalModel.category_id = String(row.category_id ?? row.category?.id ?? ''); this.modalModel.warehouse_id = String(row.warehouse_id ?? row.warehouse?.id ?? ''); }
    for (const field of this.modalFields) { if (field.type === 'date' && this.modalModel[field.key]) this.modalModel[field.key] = this.parseDate(this.modalModel[field.key]); }
    this.modalOpen = true;
  }
  openDelete(row: any) { if (row?.editable === false || this.endpoint === 'sales') { this.messages.add({ severity: 'info', summary: 'Movimiento automatico', detail: 'Las ventas no se eliminan desde este modulo.' }); return; } this.confirmation.confirm({ header: 'Confirmar eliminacion', message: `Deseas eliminar o desactivar ${row?.name || row?.email || 'este registro'}?`, icon: 'pi pi-exclamation-triangle', acceptLabel: 'Eliminar', rejectLabel: 'Cancelar', acceptButtonStyleClass: 'p-button-danger', accept: () => this.confirmDelete(row) }); }
  closeModal() { this.modalOpen = false; this.modalModel = {}; this.cancelNewCategory(); }

  saveModal() { const body = this.payloadFor(this.endpoint, this.modalModel); const req = this.single ? this.api.put<any>(this.endpoint, body) : (this.modalMode === 'create' ? this.api.post<any>(this.endpoint, body) : this.api.put<any>(`${this.endpoint}/${this.modalModel.id}`, body)); req.subscribe({ next: () => { this.messages.add({ severity: 'success', summary: 'Guardado', detail: 'Registro guardado correctamente.' }); this.closeModal(); this.load(); if (this.endpoint === 'company-settings') this.branding.refresh(); if (this.endpoint === 'products') this.loadProductStats(); if (this.endpoint === 'warehouses') this.loadWarehouseStats(); if (this.endpoint === 'expenses-income') this.loadExpensesStats(); if (this.endpoint === 'users') this.loadUserStats(); }, error: (err: any) => { this.error = err?.error?.message || 'No se pudo guardar.'; this.messages.add({ severity: 'error', summary: 'Error', detail: this.error }); } }); }
  confirmDelete(row: any) { this.api.delete(`${this.endpoint}/${row.id}`).subscribe({ next: () => { this.messages.add({ severity: 'success', summary: 'Eliminado', detail: 'Registro eliminado o desactivado.' }); this.load(); if (this.endpoint === 'products') this.loadProductStats(); if (this.endpoint === 'warehouses') this.loadWarehouseStats(); if (this.endpoint === 'expenses-income') this.loadExpensesStats(); if (this.endpoint === 'users') this.loadUserStats(); if (this.endpoint === 'roles') this.loadRoleStats(); }, error: (err: any) => { this.error = err?.error?.message || 'No se pudo eliminar.'; this.messages.add({ severity: 'error', summary: 'Error', detail: this.error }); } }); }

  onImageDragOver(event: DragEvent) { event.preventDefault(); }
  onImageDrop(event: DragEvent) { event.preventDefault(); const file = event.dataTransfer?.files?.[0]; if (file) this.uploadProductImage(file); }
  onImageSelected(event: Event) { const input = event.target as HTMLInputElement; const file = input.files?.[0]; if (file) this.uploadProductImage(file); input.value = ''; }
  uploadProductImage(file: File) { if (!file.type.startsWith('image/')) { this.messages.add({ severity: 'warn', summary: 'Imagen invalida', detail: 'Selecciona un archivo de imagen valido.' }); return; } this.uploadingImage = true; this.api.upload<{ path: string }>('products/upload-image', file).subscribe({ next: res => { this.modalModel.image_path = res.path; this.uploadingImage = false; this.messages.add({ severity: 'success', summary: 'Imagen cargada', detail: 'La imagen se cargo correctamente.' }); this.cdr.detectChanges(); }, error: err => { this.uploadingImage = false; const detail = err?.error?.message || 'No se pudo subir la imagen.'; this.messages.add({ severity: 'error', summary: 'Error', detail }); this.cdr.detectChanges(); } }); }

  createCategory() {
    const name = this.newCategoryName.trim();
    if (!name || this.creatingCategory) return;
    this.creatingCategory = true;
    this.api.post<any>('categories', { name, active: true }).subscribe({
      next: (cat: any) => {
        this.categoryOptions = [...this.categoryOptions, { value: String(cat.id), label: cat.name }];
        this.modalModel.category_id = String(cat.id);
        this.creatingCategory = false;
        this.cancelNewCategory();
        this.messages.add({ severity: 'success', summary: 'Categoria creada', detail: `"${cat.name}" agregada correctamente.` });
      },
      error: err => { this.creatingCategory = false; const detail = err?.error?.message || 'No se pudo crear la categoria.'; this.messages.add({ severity: 'error', summary: 'Error', detail }); }
    });
  }
  cancelNewCategory() { this.showNewCategory = false; this.newCategoryName = ''; }

  async previewVoucher(row: any) {
    try {
      this.pdfPreviewUrl = await this.voucherPdf.fetchObjectUrl(row.id, 'customer');
      this.pdfPreviewTitle = `Comprobante ${row.voucher_number || ''}`;
      this.pdfPreviewVisible = true;
      this.cdr.detectChanges();
    } catch (err: any) {
      const detail = err?.status === 401 ? 'Tu sesion expiro. Vuelve a iniciar sesion e intenta de nuevo.' : 'Aun no se genero el PDF de esta venta.';
      this.messages.add({ severity: 'warn', summary: 'Sin comprobante', detail });
    }
  }
  onPdfPreviewClosed() {
    if (this.pdfPreviewUrl) URL.revokeObjectURL(this.pdfPreviewUrl);
    this.pdfPreviewUrl = null;
  }

  fieldsFor(endpoint: string, creating: boolean): Field[] {
    const commonActive: Field = { key: 'active', label: 'Activo', type: 'checkbox' };
    const movementFields: Field[] = [
      { key: 'type', label: 'Tipo', type: 'select', options: [{ value: 'income', label: 'Ingreso manual' }, { value: 'expense', label: 'Egreso / gasto' }] },
      { key: 'category', label: 'Categoria' },
      { key: 'description', label: 'Descripcion', type: 'textarea' },
      { key: 'amount', label: 'Monto', type: 'number' },
      { key: 'date', label: 'Fecha', type: 'date' },
      { key: 'payment_method', label: 'Metodo de pago', type: 'select', options: [{ value: 'cash', label: 'Efectivo' }, { value: 'yape', label: 'Yape' }, { value: 'plin', label: 'Plin' }, { value: 'card', label: 'Tarjeta' }, { value: 'transfer', label: 'Transferencia' }] },
      { key: 'observation', label: 'Observacion', type: 'textarea' },
    ];
    const map: Record<string, Field[]> = {
      users: [{ key: 'name', label: 'Nombre' }, { key: 'email', label: 'Email' }, ...(creating ? [{ key: 'password', label: 'Password', type: 'password' as const }] : [{ key: 'password', label: 'Nuevo password', type: 'password' as const }]), { key: 'roles', label: 'Roles', type: 'multiselect', options: this.roleOptions } as Field, commonActive],
      roles: [{ key: 'name', label: 'Nombre' }, { key: 'description', label: 'Descripcion' }, { key: 'permissions', label: 'Permisos por modulo', type: 'permissions' } as Field, commonActive],
      warehouses: [{ key: 'name', label: 'Nombre' }, { key: 'description', label: 'Descripcion' }, commonActive],
      products: [{ key: 'sku', label: 'SKU' }, { key: 'name', label: 'Nombre' }, { key: 'category_id', label: 'Categoria', type: 'select', options: this.categoryOptions }, { key: 'warehouse_id', label: 'Almacen', type: 'select', options: this.warehouseOptions }, { key: 'sale_price', label: 'Precio venta', type: 'number' }, { key: 'cost', label: 'Costo', type: 'number' }, { key: 'stock', label: 'Stock', type: 'number' }, { key: 'min_stock', label: 'Stock minimo', type: 'number' }, { key: 'image_path', label: 'Imagen del producto', type: 'image' }, commonActive],
      'expenses-income': movementFields,
      'company-settings': [{ key: 'name', label: 'Empresa' }, { key: 'ruc', label: 'RUC' }, { key: 'phone', label: 'Celular' }, { key: 'address', label: 'Direccion' }, { key: 'slogan', label: 'Eslogan' }, { key: 'business_type', label: 'Modo del sistema', type: 'select', options: [{ value: 'market', label: 'Mercado' }, { value: 'restaurant', label: 'Restaurante' }] }, { key: 'igv_percent', label: 'IGV %', type: 'number' }, { key: 'default_tip', label: 'Propina default', type: 'number' }, { key: 'voucher_series', label: 'Serie' }, { key: 'voucher_start_number', label: 'Numero inicial', type: 'number' }, { key: 'ticket_width', label: 'Ticket 58/80' }]
    };
    return map[endpoint] || [{ key: 'name', label: 'Nombre' }, commonActive];
  }
  defaultsFor(endpoint: string) {
    if (endpoint === 'products') return { active: true, category_id: this.categoryOptions[0]?.value || '', warehouse_id: this.warehouseOptions[0]?.value || '', stock: 0, min_stock: 0, cost: 0, sale_price: 0 };
    if (endpoint === 'expenses-income') return { type: 'expense', category: 'Gastos operativos', description: '', amount: 0, date: new Date(), payment_method: 'cash', observation: '' };
    return { active: true };
  }
  payloadFor(endpoint: string, model: any) {
    const body: any = { ...model };
    for (const key of Object.keys(body)) { if (body[key] instanceof Date) body[key] = this.formatDateValue(body[key]); }
    delete body.id; delete body.created_at; delete body.updated_at; delete body.deleted_at; delete body.movement_id; delete body.editable; delete body.source; delete body.type_label;
    if (endpoint !== 'expenses-income') { delete body.category; }
    delete body.warehouse;
    if (endpoint === 'users' || endpoint === 'roles') { body.roles = this.csv(body.roles); body.permissions = this.csv(body.permissions); if (!body.password) delete body.password; }
    if (endpoint === 'products') { body.category_id = Number(body.category_id); body.warehouse_id = Number(body.warehouse_id); }
    return body;
  }  ids(rows: any[]) { return Array.isArray(rows) ? rows.map(r => r.id).join(',') : ''; }
  idArray(rows: any[]) { return Array.isArray(rows) ? rows.map(r => Number(r.id)).filter(Boolean) : []; }
  idArrayStr(rows: any[]) { return Array.isArray(rows) ? rows.map(r => String(r.id)) : []; }
  csv(value: any) { if (Array.isArray(value)) return value.map((x: any) => Number(x)).filter(Boolean); if (value === undefined || value === null || value === '') return []; return String(value).split(',').map(x => Number(x.trim())).filter(Boolean); }
  hasOption(key: string, value: string) { return Array.isArray(this.modalModel[key]) && this.modalModel[key].includes(value); }
  toggleOption(key: string, value: string, checked: boolean) { const current: string[] = Array.isArray(this.modalModel[key]) ? this.modalModel[key] : []; this.modalModel[key] = checked ? [...current, value] : current.filter((v: string) => v !== value); }

  permissionGroups() { const groups = new Map<string, PermissionOption[]>(); for (const permission of this.availablePermissions) { const module = permission.module || 'General'; groups.set(module, [...(groups.get(module) || []), permission]); } return Array.from(groups.entries()).map(([module, items]) => ({ module, items })); }
  isPermissionModuleOpen(module: string) { return this.openPermissionModules.has(module); }
  togglePermissionModule(module: string) { this.openPermissionModules.has(module) ? this.openPermissionModules.delete(module) : this.openPermissionModules.add(module); }
  selectedPermissions(): number[] { return Array.isArray(this.modalModel.permissions) ? this.modalModel.permissions.map((id: any) => Number(id)).filter(Boolean) : this.csv(this.modalModel.permissions); }
  hasPermission(id: number) { return this.selectedPermissions().includes(Number(id)); }
  togglePermission(id: number, checked: boolean) { const selected = new Set(this.selectedPermissions()); checked ? selected.add(Number(id)) : selected.delete(Number(id)); this.modalModel.permissions = Array.from(selected); }
  selectedPermissionCount(items?: PermissionOption[]) { const selected = this.selectedPermissions(); return items ? items.filter(item => selected.includes(Number(item.id))).length : selected.length; }
  columnsFor(endpoint: string): Column[] {
    const map: Record<string, Column[]> = {
      users: [{ key: 'name', label: 'Usuario' }, { key: 'email', label: 'Email' }, { key: 'roles', label: 'Roles', type: 'count' }, { key: 'active', label: 'Estado', type: 'status' }],
      roles: [{ key: 'name', label: 'Rol' }, { key: 'description', label: 'Descripcion' }, { key: 'permissions', label: 'Permisos', type: 'count' }, { key: 'active', label: 'Estado', type: 'status' }],
      warehouses: [{ key: 'name', label: 'Almacen' }, { key: 'description', label: 'Descripcion' }, { key: 'products_count', label: 'Productos' }, { key: 'active', label: 'Estado', type: 'status' }],
      sales: [{ key: 'voucher_number', label: 'Comprobante' }, { key: 'table_name', label: 'Mesa' }, { key: 'customer_name', label: 'Cliente' }, { key: 'payment_method', label: 'Pago' }, { key: 'total', label: 'Total', type: 'money' }, { key: 'created_at', label: 'Fecha', type: 'date' }],
      'expenses-income': [{ key: 'type_label', label: 'Tipo' }, { key: 'source', label: 'Origen' }, { key: 'category', label: 'Categoria' }, { key: 'description', label: 'Descripcion' }, { key: 'payment_method', label: 'Pago' }, { key: 'amount', label: 'Monto', type: 'money' }, { key: 'date', label: 'Fecha', type: 'date' }],
      'company-settings': [{ key: 'name', label: 'Empresa' }, { key: 'ruc', label: 'RUC' }, { key: 'phone', label: 'Celular' }, { key: 'address', label: 'Direccion' }, { key: 'business_type', label: 'Modo del sistema' }, { key: 'igv_percent', label: 'IGV %' }, { key: 'voucher_series', label: 'Serie' }, { key: 'ticket_width', label: 'Ticket mm' }, { key: 'license_key', label: 'Codigo de licencia (Escritorio)' }]
    };
    return map[endpoint] || [{ key: 'name', label: 'Nombre' }, { key: 'active', label: 'Estado', type: 'status' }];
  }  subtitleFor(endpoint: string) { const map: Record<string, string> = { products: 'Catalogo visual de platos, bebidas, precios y stock.', users: 'Usuarios del sistema y sus roles asignados.', roles: 'Perfiles de acceso y permisos configurados.', warehouses: 'Almacenes activos y disponibilidad general. Gestione la distribucion de inventario en tiempo real.', sales: 'Historial de ventas y comprobantes generados.', 'expenses-income': 'Gestione el flujo de caja, ingresos automaticos y movimientos manuales.', 'company-settings': 'Datos comerciales, IGV y configuracion de comprobantes.' }; return map[endpoint] || 'Gestion del modulo.'; }
  parseDate(value: unknown): Date | null {
    if (!value) return null;
    if (value instanceof Date) return value;
    const raw = String(value).slice(0, 10);
    const parts = raw.split('-').map(Number);
    if (parts.length === 3 && parts.every(Boolean)) return new Date(parts[0], parts[1] - 1, parts[2]);
    const parsed = new Date(String(value));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  formatDateValue(value: Date) { const y = value.getFullYear(); const m = String(value.getMonth() + 1).padStart(2, '0'); const d = String(value.getDate()).padStart(2, '0'); return `${y}-${m}-${d}`; }
  value(row: any, key: string) { return key.split('.').reduce((acc, part) => acc?.[part], row); }
  display(row: any, col: Column) { const value = this.value(row, col.key); if (Array.isArray(value)) return value.map(item => item.name || item.label || item.key).join(', '); if (typeof value === 'boolean') return value ? 'Si' : 'No'; return value ?? '-'; }
  count(value: unknown) { return Array.isArray(value) ? value.length : Number(value || 0); }
  number(value: unknown) { return Number(value || 0); }
  imageUrl(path?: string) { return this.api.assetUrl(path); }
}
