import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { DialogModule } from 'primeng/dialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ApiService } from '../core/api.service';

type Tab = 'resumen' | 'insumos' | 'articulos' | 'recetas' | 'kardex';

type IngredientCategory = { id: number; name: string; icon: string | null; ingredients_count?: number };
type Ingredient = {
  id: number; ingredient_category_id: number | null; sku: string | null; name: string; unit: string;
  stock: number | string; min_stock: number | string; cost: number | string; is_composite: boolean; active: boolean;
  category: IngredientCategory | null;
};
type Articulo = {
  id: number; sku: string; name: string; category_id: number; sale_price: number | string; cost: number | string;
  stock: number | string; min_stock: number | string; active: boolean; category: { id: number; name: string } | null;
};
type RecipeIngredientRow = { id: number; ingredient_id: number; name: string; unit: string; quantity: number | string; cost: number | string; line_cost: number };
type RecipeRow = {
  id: number; kind: string; is_general: boolean;
  product: { id: number; name: string; sale_price: number | string; category: string | null };
  ingredients: RecipeIngredientRow[]; cost_total: number; margin: number; food_cost_percent: number | null;
};
type KardexRow = { id: number; item_name: string; item_kind: 'insumo' | 'articulo'; unit?: string | null; type: string; type_label: string; quantity: number | string; note?: string | null; user: string | null; created_at: string };
type StockCriticoRow = { kind: 'insumo' | 'articulo'; id: number; name: string; category: string | null; icon: string | null; stock: number; unit: string; status: string };
type SummaryData = { valor_inventario: number; salud_stock_percent: number | null; alertas_criticas: number; rotacion_dias: number | null; stock_critico: StockCriticoRow[]; actividad_reciente: KardexRow[] };
type AvailableProduct = { id: number; name: string; sale_price: number | string; category_id: number | null };

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, FormsModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, MatSelectModule, DialogModule],
  template: `
  <section class="mesas-screen">
    <header class="pos-hero">
      <div>
        <span class="eyebrow">Restaurante</span>
        <h1>Inventario Maestro</h1>
        <p>Sistema de gestion de inventario</p>
      </div>
    </header>

    <div class="carta-tabs">
      <button type="button" class="carta-tab" [class.active]="tab === 'resumen'" (click)="setTab('resumen')"><mat-icon>dashboard</mat-icon>Resumen</button>
      <button type="button" class="carta-tab" [class.active]="tab === 'insumos'" (click)="setTab('insumos')"><mat-icon>egg_alt</mat-icon>Insumos</button>
      <button type="button" class="carta-tab" [class.active]="tab === 'articulos'" (click)="setTab('articulos')"><mat-icon>inventory_2</mat-icon>Articulos</button>
      <button type="button" class="carta-tab" [class.active]="tab === 'recetas'" (click)="setTab('recetas')"><mat-icon>menu_book</mat-icon>Recetas</button>
      <button type="button" class="carta-tab" [class.active]="tab === 'kardex'" (click)="setTab('kardex')"><mat-icon>receipt_long</mat-icon>Kardex</button>
    </div>

    <!-- ===================== RESUMEN ===================== -->
    @if (tab === 'resumen') {
      @if (summary) {
        <div class="stats-row">
          <article class="stat-tile"><mat-icon>payments</mat-icon><div><small>Valor Inventario</small><strong>{{summary.valor_inventario | currency:'PEN':'S/ '}}</strong><span class="stat-trend neutral">Costo total actual</span></div></article>
          <article class="stat-tile ok"><mat-icon>favorite</mat-icon><div><small>Salud de Stock</small><strong>{{summary.salud_stock_percent === null ? 'N/A' : summary.salud_stock_percent + '%'}}</strong><span class="stat-trend neutral">Indice de disponibilidad</span></div></article>
          <article class="stat-tile warn"><mat-icon>error_outline</mat-icon><div><small>Alertas Criticas</small><strong>{{summary.alertas_criticas}}</strong><span class="stat-trend neutral">Requieren atencion</span></div></article>
          <article class="stat-tile"><mat-icon>schedule</mat-icon><div><small>Rotacion</small><strong>{{summary.rotacion_dias === null ? 'Sin datos' : summary.rotacion_dias + ' dias'}}</strong><span class="stat-trend neutral">Promedio de permanencia</span></div></article>
        </div>

        <div class="inventory-panel">
          <div class="panel-subhead"><h3>Stock Critico</h3><span class="count-pill">{{summary.stock_critico.length}}</span></div>
          @if (!summary.stock_critico.length) {
            <div class="empty-state"><mat-icon>check_circle</mat-icon><p>No hay alertas de stock critico.</p></div>
          } @else {
            <div class="data-table">
              <div class="data-row table-head" [style.--cols]="3"><span>Ingrediente</span><span>Stock Disponible</span><span>Estado</span></div>
              @for (row of summary.stock_critico; track row.kind + '-' + row.id) {
                <div class="data-row" [style.--cols]="3">
                  <span class="carta-name-cell"><b>{{row.name}}</b>@if (row.category) { <small class="dim-block">{{row.icon}} {{row.category}}</small> }</span>
                  <span>{{number(row.stock)}} {{row.unit}}</span>
                  <span><span class="status-pill" [class]="'status-' + row.status">{{statusLabel(row.status)}}</span></span>
                </div>
              }
            </div>
          }
        </div>

        <div class="inventory-panel">
          <h3>Actividad en Tiempo Real</h3>
          @if (!summary.actividad_reciente.length) {
            <div class="empty-state"><mat-icon>history</mat-icon><p>Sin movimientos registrados aun.</p></div>
          } @else {
            <div class="data-table">
              <div class="data-row table-head" [style.--cols]="4"><span>Item</span><span>Movimiento</span><span>Cantidad</span><span>Usuario / Fecha</span></div>
              @for (row of summary.actividad_reciente; track row.id) {
                <div class="data-row" [style.--cols]="4">
                  <span><b>{{row.item_name}}</b> <small class="dim">({{row.item_kind}})</small></span>
                  <span>{{row.type_label}}</span>
                  <span>{{number(row.quantity)}}</span>
                  <span>{{row.user || 'Sistema'}} &middot; {{row.created_at | date:'dd/MM HH:mm'}}</span>
                </div>
              }
            </div>
          }
        </div>
      }
    }

    <!-- ===================== INSUMOS ===================== -->
    @if (tab === 'insumos') {
      <div class="panel-subhead">
        <div><h2>Ingredientes</h2><p>Gestion de ingredientes y stock</p></div>
        <div class="header-actions">
          <button mat-stroked-button (click)="exportIngredientsPdf()"><mat-icon>picture_as_pdf</mat-icon>PDF</button>
          <button mat-stroked-button (click)="exportIngredientsExcel()"><mat-icon>grid_on</mat-icon>Excel</button>
          <button mat-stroked-button (click)="ingredientFileInput.click()"><mat-icon>upload</mat-icon>Importar</button>
          <input #ingredientFileInput type="file" accept=".csv" hidden (change)="onImportIngredients($event)">
          <button mat-flat-button class="primary-action" (click)="openIngredientModal()"><mat-icon>add</mat-icon>Nuevo Ingrediente</button>
        </div>
      </div>

      <div class="orders-filters">
        <div class="search-pill"><mat-icon>search</mat-icon><input type="text" placeholder="Buscar por nombre o SKU..." [(ngModel)]="ingredientSearch" (ngModelChange)="onIngredientFiltersChange()"></div>
        <select class="date-preset-select" [(ngModel)]="ingredientCategoryFilter" (ngModelChange)="onIngredientFiltersChange()">
          <option [ngValue]="null">Todas las categorias</option>
          @for (c of ingredientCategories; track c.id) { <option [ngValue]="c.id">{{c.icon}} {{c.name}}</option> }
        </select>
        <label class="switch-label"><span class="switch"><input type="checkbox" [(ngModel)]="onlyComposite" (ngModelChange)="onIngredientFiltersChange()"><span class="switch-track"></span><span class="switch-thumb"></span></span>Solo compuestos</label>
        <label class="switch-label"><span class="switch"><input type="checkbox" [(ngModel)]="showInactiveIngredients" (ngModelChange)="onIngredientFiltersChange()"><span class="switch-track"></span><span class="switch-thumb"></span></span>Mostrar inactivos</label>
      </div>

      <p class="results-count">{{ingredients.length}} de {{ingredientsTotal}} ingredientes</p>

      @if (ingredientsLoading) {
        <div class="loading-state"><mat-icon>hourglass_empty</mat-icon><p>Cargando insumos...</p></div>
      } @else if (!ingredients.length) {
        <div class="empty-state"><mat-icon>egg_alt</mat-icon><p>No hay insumos registrados.</p></div>
      } @else {
        <div class="data-table">
          <div class="data-row table-head" [style.--cols]="5"><span>Ingrediente</span><span>Categoria</span><span>Stock Actual</span><span>Estado</span><span class="table-actions">Acciones</span></div>
          @for (row of ingredients; track row.id) {
            <div class="data-row" [style.--cols]="5">
              <span class="carta-name-cell"><b>{{row.name}}</b>@if (row.sku) { <small class="dim-block">{{row.sku}}</small> }</span>
              <span>@if (row.category) { <span class="category-pill">{{row.category.icon}} {{row.category.name}}</span> } @else { <span class="dash">&mdash;</span> }</span>
              <span class="stock-cell">
                <span>{{number(row.stock)}} {{row.unit}}</span>
                @if (number(row.min_stock) > 0) {
                  <span class="stock-bar"><span class="stock-bar-fill" [class]="'fill-' + ingredientStatus(row)" [style.width.%]="stockPercent(row)"></span></span>
                }
              </span>
              <span><span class="status-pill" [class]="'status-' + ingredientStatus(row)">{{statusLabel(ingredientStatus(row))}}</span></span>
              <span class="table-actions boxed-actions"><button mat-icon-button (click)="openIngredientModal(row)"><mat-icon>edit</mat-icon></button><button mat-icon-button (click)="confirmDeleteIngredient(row)"><mat-icon>delete</mat-icon></button></span>
            </div>
          }
        </div>
        @if (ingredientsTotal > 0) {
          <div class="pagination-bar">
            <span class="pagination-label">Mostrando {{ingredients.length}} de {{ingredientsTotal}}</span>
            <div class="pagination-controls">
              <button type="button" class="page-btn" [disabled]="ingredientsPage <= 1" (click)="goToIngredientsPage(ingredientsPage - 1)"><mat-icon>chevron_left</mat-icon></button>
              <button type="button" class="page-btn" [disabled]="ingredientsPage >= ingredientsLastPage" (click)="goToIngredientsPage(ingredientsPage + 1)"><mat-icon>chevron_right</mat-icon></button>
            </div>
          </div>
        }
      }
    }

    <!-- ===================== ARTICULOS ===================== -->
    @if (tab === 'articulos') {
      <div class="panel-subhead">
        <div><h2>Stock de Articulos</h2><p>Bebidas, productos empaquetados y articulos de venta</p></div>
        <div class="header-actions">
          <span class="count-pill">{{articulosTotal}} art.</span>
          <button mat-stroked-button (click)="exportArticulosPdf()"><mat-icon>picture_as_pdf</mat-icon>PDF</button>
          <button mat-stroked-button (click)="exportArticulosExcel()"><mat-icon>grid_on</mat-icon>Excel</button>
          <button mat-flat-button class="primary-action" (click)="openConteoModal()"><mat-icon>fact_check</mat-icon>Conteo de Stock</button>
        </div>
      </div>

      <div class="orders-filters">
        <div class="search-pill"><mat-icon>search</mat-icon><input type="text" placeholder="Buscar articulo..." [(ngModel)]="articuloSearch" (ngModelChange)="onArticuloFiltersChange()"></div>
        <select class="date-preset-select" [(ngModel)]="articuloCategoryFilter" (ngModelChange)="onArticuloFiltersChange()">
          <option [ngValue]="null">Todas las categorias</option>
          @for (c of productCategories; track c.id) { <option [ngValue]="c.id">{{c.name}}</option> }
        </select>
      </div>

      @if (articulosLoading) {
        <div class="loading-state"><mat-icon>hourglass_empty</mat-icon><p>Cargando articulos...</p></div>
      } @else if (!articulos.length) {
        <div class="empty-state"><mat-icon>inventory_2</mat-icon><p>No hay articulos registrados.</p></div>
      } @else {
        <div class="data-table">
          <div class="data-row table-head" [style.--cols]="5"><span>Articulo</span><span>Categoria</span><span>Stock</span><span>Min.</span><span>Estado</span></div>
          @for (row of articulos; track row.id) {
            <div class="data-row" [style.--cols]="5">
              <span class="carta-name-cell"><b>{{row.name}}</b><small class="dim-block">{{row.sku}}</small></span>
              <span>@if (row.category) { <span class="category-pill">{{row.category.name}}</span> } @else { <span class="dash">&mdash;</span> }</span>
              <span [class.negative-cell]="number(row.stock) <= 0">{{number(row.stock)}}</span>
              <span>{{number(row.min_stock)}}</span>
              <span><span class="status-pill" [class]="'status-' + articuloStatus(row)">{{statusLabel(articuloStatus(row))}}</span></span>
            </div>
          }
        </div>
        @if (articulosTotal > 0) {
          <div class="pagination-bar">
            <span class="pagination-label">Mostrando {{articulos.length}} de {{articulosTotal}}</span>
            <div class="pagination-controls">
              <button type="button" class="page-btn" [disabled]="articulosPage <= 1" (click)="goToArticulosPage(articulosPage - 1)"><mat-icon>chevron_left</mat-icon></button>
              <button type="button" class="page-btn" [disabled]="articulosPage >= articulosLastPage" (click)="goToArticulosPage(articulosPage + 1)"><mat-icon>chevron_right</mat-icon></button>
            </div>
          </div>
        }
      }
    }

    <!-- ===================== RECETAS ===================== -->
    @if (tab === 'recetas') {
      <div class="carta-tabs small">
        <button type="button" class="carta-tab" [class.active]="recipeKind === 'receta'" (click)="setRecipeKind('receta')">Recetas</button>
        <button type="button" class="carta-tab" [class.active]="recipeKind === 'extra'" (click)="setRecipeKind('extra')">Extras</button>
      </div>

      <div class="panel-subhead">
        <div>
          <h2>Recetas y Food Cost</h2>
          <p>Analisis de costos y margenes por receta</p>
        </div>
        <div class="header-actions">
          @if (recipeStats) {
            <span class="count-pill">{{recipeStats.with_recipe}}/{{recipeStats.total_dishes}} con receta ({{recipeStats.coverage_percent ?? 0}}%)</span>
          }
          <button mat-flat-button class="primary-action" (click)="openNewRecipeModal()"><mat-icon>add</mat-icon>Nueva Receta</button>
        </div>
      </div>

      <div class="search-pill"><mat-icon>search</mat-icon><input type="text" placeholder="Buscar recetas por nombre o categoria..." [(ngModel)]="recipeSearch" (ngModelChange)="onRecipeFiltersChange()"></div>

      @if (recipesLoading) {
        <div class="loading-state"><mat-icon>hourglass_empty</mat-icon><p>Cargando recetas...</p></div>
      } @else if (!recipes.length) {
        <div class="empty-state"><mat-icon>menu_book</mat-icon><p>No hay recetas registradas.</p></div>
      } @else {
        <div class="recipe-grid">
          @for (r of recipes; track r.id) {
            <article class="recipe-card" (click)="openEditRecipeModal(r)">
              <div class="recipe-card-tags">
                @if (r.product.category) { <span class="category-pill">{{r.product.category}}</span> }
                <span class="recipe-general-pill">{{r.is_general ? 'Receta General' : 'Variante'}}</span>
              </div>
              <h3>{{r.product.name}}</h3>
              <div class="recipe-card-metrics">
                <div><small>PRECIO VENTA</small><b>{{number(r.product.sale_price) | currency:'PEN':'S/ '}}</b></div>
                <div><small>MARGEN</small><b class="margin-value">{{r.margin | currency:'PEN':'S/ '}}</b></div>
              </div>
              <div class="recipe-card-foodcost">
                <div class="recipe-card-foodcost-head">
                  <small>FOOD COST</small>
                  @if (r.food_cost_percent !== null) { <span class="fc-tag" [class]="foodCostTier(r.food_cost_percent).cls">{{foodCostTier(r.food_cost_percent).label}}</span> }
                  <span class="recipe-cost-total">Costo Receta: {{r.cost_total | currency:'PEN':'S/ '}}</span>
                </div>
                <div class="recipe-fc-value">{{r.food_cost_percent === null ? 'N/A' : r.food_cost_percent + '%'}}</div>
                <div class="stock-bar"><span class="stock-bar-fill" [class]="'fill-' + foodCostTier(r.food_cost_percent).cls" [style.width.%]="r.food_cost_percent || 0"></span></div>
              </div>
            </article>
          }
        </div>
      }
    }

    <!-- ===================== KARDEX ===================== -->
    @if (tab === 'kardex') {
      <div class="panel-subhead"><div><h2>Kardex</h2><p>Historial real de movimientos de stock</p></div></div>

      <div class="orders-filters">
        <div class="search-pill"><mat-icon>search</mat-icon><input type="text" placeholder="Buscar por nombre..." [(ngModel)]="kardexSearch" (ngModelChange)="onKardexFiltersChange()"></div>
        <select class="date-preset-select" [(ngModel)]="kardexKind" (ngModelChange)="onKardexFiltersChange()">
          <option value="">Todos</option>
          <option value="insumo">Insumos</option>
          <option value="articulo">Articulos</option>
        </select>
        <select class="date-preset-select" [(ngModel)]="kardexType" (ngModelChange)="onKardexFiltersChange()">
          <option value="">Todos los movimientos</option>
          <option value="entry">Entrada</option>
          <option value="sale">Salida (Venta)</option>
          <option value="transfer">Transferencia</option>
          <option value="adjustment">Ajuste</option>
        </select>
      </div>

      @if (kardexLoading) {
        <div class="loading-state"><mat-icon>hourglass_empty</mat-icon><p>Cargando kardex...</p></div>
      } @else if (!kardexRows.length) {
        <div class="empty-state"><mat-icon>receipt_long</mat-icon><p>No hay movimientos para estos filtros.</p></div>
      } @else {
        <div class="data-table">
          <div class="data-row table-head" [style.--cols]="6"><span>Fecha</span><span>Item</span><span>Tipo</span><span>Movimiento</span><span>Cantidad</span><span>Usuario</span></div>
          @for (row of kardexRows; track row.id) {
            <div class="data-row" [style.--cols]="6">
              <span>{{row.created_at | date:'dd/MM/yyyy HH:mm'}}</span>
              <span><b>{{row.item_name}}</b></span>
              <span><span class="category-pill">{{row.item_kind === 'insumo' ? 'Insumo' : 'Articulo'}}</span></span>
              <span>{{row.type_label}}</span>
              <span>{{number(row.quantity)}} {{row.unit}}</span>
              <span>{{row.user || 'Sistema'}}</span>
            </div>
          }
        </div>
        @if (kardexTotal > 0) {
          <div class="pagination-bar">
            <span class="pagination-label">Mostrando {{kardexRows.length}} de {{kardexTotal}}</span>
            <div class="pagination-controls">
              <button type="button" class="page-btn" [disabled]="kardexPage <= 1" (click)="goToKardexPage(kardexPage - 1)"><mat-icon>chevron_left</mat-icon></button>
              <button type="button" class="page-btn" [disabled]="kardexPage >= kardexLastPage" (click)="goToKardexPage(kardexPage + 1)"><mat-icon>chevron_right</mat-icon></button>
            </div>
          </div>
        }
      }
    }

    <!-- Modal: Nuevo/Editar Insumo -->
    <p-dialog [(visible)]="ingredientModalOpen" [modal]="true" [dismissableMask]="true" [style]="{ width: 'min(420px, 94vw)' }" [header]="editingIngredient ? 'Editar insumo' : 'Nuevo insumo'">
      <mat-form-field appearance="outline"><mat-label>Nombre</mat-label><input matInput [(ngModel)]="ingredientForm.name"></mat-form-field>
      <mat-form-field appearance="outline"><mat-label>SKU (opcional)</mat-label><input matInput [(ngModel)]="ingredientForm.sku"></mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Categoria</mat-label>
        <input matInput [(ngModel)]="ingredientForm.categoryName" list="ingredient-category-options" placeholder="Escribe o elige una categoria">
      </mat-form-field>
      <datalist id="ingredient-category-options">
        @for (c of ingredientCategories; track c.id) { <option [value]="c.name"></option> }
      </datalist>
      <mat-form-field appearance="outline"><mat-label>Unidad (kg, L, und, paq, porc...)</mat-label><input matInput [(ngModel)]="ingredientForm.unit"></mat-form-field>
      <div class="form-row-2">
        <mat-form-field appearance="outline"><mat-label>Stock</mat-label><input matInput type="number" [(ngModel)]="ingredientForm.stock"></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Stock minimo</mat-label><input matInput type="number" min="0" [(ngModel)]="ingredientForm.min_stock"></mat-form-field>
      </div>
      <mat-form-field appearance="outline"><mat-label>Costo por unidad (S/)</mat-label><input matInput type="number" min="0" [(ngModel)]="ingredientForm.cost"></mat-form-field>
      <label class="switch-label"><span class="switch"><input type="checkbox" [(ngModel)]="ingredientForm.is_composite"><span class="switch-track"></span><span class="switch-thumb"></span></span>Insumo compuesto (preparado a partir de otros insumos)</label>
      <label class="switch-label"><span class="switch"><input type="checkbox" [(ngModel)]="ingredientForm.active"><span class="switch-track"></span><span class="switch-thumb"></span></span>Activo</label>
      <ng-template pTemplate="footer">
        <div class="modal-actions">
          <button mat-stroked-button (click)="ingredientModalOpen = false">Cancelar</button>
          <button mat-flat-button class="primary-action" [disabled]="!ingredientForm.name.trim() || savingIngredient" (click)="saveIngredient()"><mat-icon>save</mat-icon>Guardar</button>
        </div>
      </ng-template>
    </p-dialog>

    <!-- Modal: Conteo de Stock -->
    <p-dialog [(visible)]="conteoModalOpen" [modal]="true" [dismissableMask]="true" [style]="{ width: 'min(560px, 96vw)' }" header="Conteo de Stock">
      <p class="advance-hint">Ingresa el stock fisico contado. Solo se ajustaran los articulos con una diferencia real.</p>
      <div class="conteo-list">
        @for (line of conteoLines; track line.product_id) {
          <div class="conteo-line">
            <span>{{line.name}} <small class="dim">(actual: {{line.current_stock}})</small></span>
            <input type="number" min="0" [(ngModel)]="line.counted_stock">
          </div>
        }
      </div>
      <ng-template pTemplate="footer">
        <div class="modal-actions">
          <button mat-stroked-button (click)="conteoModalOpen = false">Cancelar</button>
          <button mat-flat-button class="primary-action" [disabled]="savingConteo" (click)="saveConteo()"><mat-icon>fact_check</mat-icon>Guardar Conteo</button>
        </div>
      </ng-template>
    </p-dialog>

    <!-- Modal: Nueva/Editar Receta -->
    <p-dialog [(visible)]="recipeModalOpen" [modal]="true" [dismissableMask]="true" [style]="{ width: 'min(560px, 96vw)' }" [contentStyle]="{ 'max-height': '74vh', overflow: 'auto' }" [header]="editingRecipe ? 'Editar receta' : 'Nueva receta'">
      @if (!editingRecipe) {
        <mat-form-field appearance="outline">
          <mat-label>Plato</mat-label>
          <mat-select [(ngModel)]="recipeForm.product_id">
            @for (p of availableProducts; track p.id) { <mat-option [value]="p.id">{{p.name}} ({{number(p.sale_price) | currency:'PEN':'S/ '}})</mat-option> }
          </mat-select>
        </mat-form-field>
      } @else {
        <p class="advance-hint">Plato: <b>{{editingRecipe.product.name}}</b></p>
      }
      <mat-form-field appearance="outline">
        <mat-label>Tipo</mat-label>
        <mat-select [(ngModel)]="recipeForm.kind">
          <mat-option value="receta">Receta</mat-option>
          <mat-option value="extra">Extra</mat-option>
        </mat-select>
      </mat-form-field>

      <div class="panel-subhead"><h3>Insumos de la receta</h3></div>
      <div class="round-picker-cart">
        @for (line of recipeForm.ingredients; track line.ingredient_id) {
          <div class="round-picker-cart-line">
            <span>{{ingredientName(line.ingredient_id)}}</span>
            <input type="number" min="0.001" step="0.01" class="qty-input" [(ngModel)]="line.quantity">
            <button mat-icon-button (click)="removeRecipeLine(line)"><mat-icon>close</mat-icon></button>
          </div>
        }
      </div>
      <div class="add-recipe-line">
        <mat-form-field appearance="outline">
          <mat-label>Agregar insumo</mat-label>
          <mat-select [(ngModel)]="pendingIngredientId">
            @for (i of allIngredients; track i.id) { <mat-option [value]="i.id">{{i.name}} ({{i.unit}})</mat-option> }
          </mat-select>
        </mat-form-field>
        <button mat-stroked-button [disabled]="!pendingIngredientId" (click)="addRecipeLine()"><mat-icon>add</mat-icon>Agregar</button>
      </div>

      @if (recipeForm.ingredients.length) {
        <div class="recipe-preview-total">
          <span>Costo receta estimado</span>
          <b>{{recipeFormCostPreview() | currency:'PEN':'S/ '}}</b>
        </div>
      }

      <ng-template pTemplate="footer">
        <div class="modal-actions modal-actions-split">
          @if (editingRecipe) {
            <button mat-stroked-button class="danger-btn" (click)="confirmDeleteRecipe(editingRecipe)"><mat-icon>delete</mat-icon>Eliminar</button>
          }
          <span class="spacer-flex"></span>
          <button mat-stroked-button (click)="recipeModalOpen = false">Cancelar</button>
          <button mat-flat-button class="primary-action" [disabled]="!canSaveRecipe() || savingRecipe" (click)="saveRecipe()"><mat-icon>save</mat-icon>Guardar</button>
        </div>
      </ng-template>
    </p-dialog>
  </section>`,
  styles: [`
    .mesas-screen { display: flex; flex-direction: column; gap: 18px; }
    .header-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .carta-tabs.small { margin-bottom: 4px; }
    .panel-subhead { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin: 4px 0; }
    .panel-subhead h2, .panel-subhead h3 { margin: 0 0 2px; }
    .panel-subhead p { margin: 0; color: var(--muted); font-size: 13px; }
    .inventory-panel { border: 1px solid var(--soft-line); border-radius: 12px; background: var(--surface); padding: 16px; display: flex; flex-direction: column; gap: 12px; }
    .results-count { margin: 0; color: var(--muted); font-size: 13px; }
    .dim { color: var(--muted); }
    .dim-block { display: block; color: var(--muted); font-size: 11px; }
    .carta-name-cell { display: flex; flex-direction: column; }
    .switch-label { display: inline-flex; align-items: center; gap: 8px; font-size: 13px; color: var(--ink); white-space: nowrap; }
    .status-pill { display: inline-flex; align-items: center; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 800; text-transform: uppercase; }
    .status-pill.status-ok { background: #fff1e0; color: #c2410c; }
    .status-pill.status-bajo { background: #f1f2fa; color: #475569; }
    .status-pill.status-agotado { background: #fde8e8; color: #c22a2a; }
    .stock-cell { display: flex; flex-direction: column; gap: 4px; }
    .stock-bar { display: block; height: 4px; border-radius: 999px; background: var(--surface-2); overflow: hidden; width: 100%; max-width: 120px; }
    .stock-bar-fill { display: block; height: 100%; border-radius: 999px; }
    .stock-bar-fill.fill-ok, .stock-bar-fill.fill-optimo { background: #16a34a; }
    .stock-bar-fill.fill-bajo, .stock-bar-fill.fill-aceptable { background: #f59e0b; }
    .stock-bar-fill.fill-agotado, .stock-bar-fill.fill-alto { background: #dc2626; }
    .negative-cell { color: #c22a2a; font-weight: 800; }

    .recipe-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 14px; }
    .recipe-card { border: 1px solid var(--soft-line); border-radius: 14px; background: var(--surface); padding: 16px; cursor: pointer; display: flex; flex-direction: column; gap: 10px; box-shadow: var(--shadow); }
    .recipe-card:hover { transform: translateY(-2px); }
    .recipe-card-tags { display: flex; gap: 6px; flex-wrap: wrap; }
    .recipe-general-pill { display: inline-flex; align-items: center; padding: 3px 9px; border-radius: 999px; font-size: 11px; font-weight: 700; background: #eef2ff; color: #4338ca; }
    .recipe-card h3 { margin: 0; font-size: 16px; }
    .recipe-card-metrics { display: flex; gap: 20px; }
    .recipe-card-metrics small { display: block; color: var(--muted); font-size: 10px; font-weight: 800; letter-spacing: .04em; }
    .recipe-card-metrics b { font-size: 16px; color: var(--primary-strong); }
    .recipe-card-metrics .margin-value { color: #16a34a; }
    .recipe-card-foodcost { border-top: 1px dashed var(--line); padding-top: 10px; display: flex; flex-direction: column; gap: 6px; }
    .recipe-card-foodcost-head { display: flex; align-items: center; gap: 8px; }
    .recipe-card-foodcost-head small { font-size: 10px; font-weight: 800; letter-spacing: .04em; color: var(--muted); }
    .recipe-cost-total { margin-left: auto; font-size: 11px; color: var(--muted); }
    .fc-tag { padding: 2px 8px; border-radius: 999px; font-size: 10px; font-weight: 800; }
    .fc-tag.optimo { background: #e8f7f1; color: #047857; }
    .fc-tag.aceptable { background: #fff1e0; color: #b45309; }
    .fc-tag.alto { background: #fde8e8; color: #c22a2a; }
    .recipe-fc-value { font-size: 20px; font-weight: 800; }

    .form-row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .conteo-list { display: flex; flex-direction: column; gap: 8px; max-height: 320px; overflow: auto; }
    .conteo-line { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 8px; border: 1px solid var(--soft-line); border-radius: 8px; }
    .conteo-line input { width: 90px; height: 34px; border: 1px solid var(--line); border-radius: 6px; padding: 0 8px; text-align: right; }
    .qty-input { width: 70px; height: 32px; border: 1px solid var(--line); border-radius: 6px; padding: 0 6px; text-align: right; }
    .add-recipe-line { display: flex; align-items: center; gap: 8px; margin-top: 6px; }
    .add-recipe-line mat-form-field { flex: 1; }
    .recipe-preview-total { display: flex; justify-content: space-between; padding: 10px 12px; border-radius: 8px; background: var(--surface-2); margin-top: 10px; font-weight: 700; }
    .modal-actions-split { display: flex; align-items: center; width: 100%; }
    .spacer-flex { flex: 1; }
    .danger-btn { color: #c22a2a !important; border-color: #f0b8b8 !important; }
    .advance-hint { margin: 0 0 12px; font-size: 13px; color: var(--muted); }
    .modal-actions { display: flex; justify-content: flex-end; gap: 10px; }
  `]
})
export class InventoryComponent implements OnInit {
  api = inject(ApiService); cdr = inject(ChangeDetectorRef); messages = inject(MessageService); confirmation = inject(ConfirmationService);

  tab: Tab = 'resumen';

  // Resumen
  summary: SummaryData | null = null;

  // Insumos
  ingredients: Ingredient[] = [];
  ingredientsLoading = false;
  ingredientsPage = 1; ingredientsPerPage = 30; ingredientsTotal = 0; ingredientsLastPage = 1;
  ingredientSearch = ''; ingredientCategoryFilter: number | null = null;
  onlyComposite = false; showInactiveIngredients = false;
  ingredientCategories: IngredientCategory[] = [];

  ingredientModalOpen = false; editingIngredient: Ingredient | null = null; savingIngredient = false;
  ingredientForm = { name: '', sku: '', categoryName: '', unit: 'und', stock: 0, min_stock: 0, cost: 0, is_composite: false, active: true };

  // Articulos
  articulos: Articulo[] = [];
  articulosLoading = false;
  articulosPage = 1; articulosPerPage = 30; articulosTotal = 0; articulosLastPage = 1;
  articuloSearch = ''; articuloCategoryFilter: number | null = null;
  productCategories: { id: number; name: string }[] = [];

  conteoModalOpen = false; savingConteo = false;
  conteoLines: { product_id: number; name: string; current_stock: number; counted_stock: number }[] = [];

  // Recetas
  recipes: RecipeRow[] = [];
  recipesLoading = false;
  recipeKind: 'receta' | 'extra' = 'receta';
  recipeSearch = '';
  recipeStats: { total_dishes: number; with_recipe: number; coverage_percent: number | null } | null = null;
  availableProducts: AvailableProduct[] = [];
  allIngredients: Ingredient[] = [];

  recipeModalOpen = false; editingRecipe: RecipeRow | null = null; savingRecipe = false;
  recipeForm: { product_id: number | null; kind: string; ingredients: { ingredient_id: number; quantity: number }[] } = { product_id: null, kind: 'receta', ingredients: [] };
  pendingIngredientId: number | null = null;

  // Kardex
  kardexRows: KardexRow[] = [];
  kardexLoading = false;
  kardexPage = 1; kardexPerPage = 30; kardexTotal = 0; kardexLastPage = 1;
  kardexSearch = ''; kardexKind = ''; kardexType = '';

  statusLabels: Record<string, string> = { ok: 'OK', bajo: 'Bajo', agotado: 'Agotado' };

  ngOnInit() {
    this.loadSummary();
    this.loadIngredientCategories();
    this.loadProductCategories();
  }

  setTab(tab: Tab) {
    this.tab = tab;
    if (tab === 'resumen') this.loadSummary();
    if (tab === 'insumos' && !this.ingredients.length) this.loadIngredients();
    if (tab === 'articulos' && !this.articulos.length) this.loadArticulos();
    if (tab === 'recetas' && !this.recipes.length) { this.loadRecipes(); this.loadRecipeStats(); }
    if (tab === 'kardex' && !this.kardexRows.length) this.loadKardex();
  }

  number(value: unknown) { return Number(value || 0); }
  statusLabel(status: string) { return this.statusLabels[status] || status; }

  // ---------- Resumen ----------
  loadSummary() {
    this.api.get<SummaryData>('inventory-summary').subscribe(s => { this.summary = s; this.cdr.detectChanges(); });
  }

  // ---------- Insumos ----------
  loadIngredientCategories() {
    this.api.get<IngredientCategory[]>('ingredient-categories').subscribe((r: any) => { this.ingredientCategories = Array.isArray(r) ? r : []; this.cdr.detectChanges(); });
  }

  loadIngredients() {
    this.ingredientsLoading = true;
    const params: any = { page: this.ingredientsPage, per_page: this.ingredientsPerPage, show_inactive: this.showInactiveIngredients };
    if (this.ingredientSearch.trim()) params.search = this.ingredientSearch.trim();
    if (this.ingredientCategoryFilter) params.ingredient_category_id = this.ingredientCategoryFilter;
    if (this.onlyComposite) params.is_composite = true;
    this.api.get<any>('ingredients', params).subscribe({
      next: (r: any) => {
        this.ingredients = r?.data || [];
        this.ingredientsTotal = r?.total ?? this.ingredients.length;
        this.ingredientsLastPage = r?.last_page ?? 1;
        this.ingredientsLoading = false;
        this.cdr.detectChanges();
      },
      error: () => { this.ingredientsLoading = false; this.ingredients = []; this.cdr.detectChanges(); }
    });
  }

  onIngredientFiltersChange() { this.ingredientsPage = 1; this.loadIngredients(); }
  goToIngredientsPage(p: number) { if (p < 1 || p > this.ingredientsLastPage) return; this.ingredientsPage = p; this.loadIngredients(); }

  ingredientStatus(row: Ingredient): string {
    const stock = this.number(row.stock);
    const min = this.number(row.min_stock);
    if (stock <= 0) return 'agotado';
    return stock <= min ? 'bajo' : 'ok';
  }
  stockPercent(row: Ingredient): number {
    const min = this.number(row.min_stock);
    if (min <= 0) return 100;
    return Math.max(0, Math.min(100, Math.round((this.number(row.stock) / min) * 100)));
  }

  openIngredientModal(row?: Ingredient) {
    this.editingIngredient = row || null;
    this.ingredientForm = row
      ? { name: row.name, sku: row.sku || '', categoryName: row.category?.name || '', unit: row.unit, stock: this.number(row.stock), min_stock: this.number(row.min_stock), cost: this.number(row.cost), is_composite: row.is_composite, active: row.active }
      : { name: '', sku: '', categoryName: '', unit: 'und', stock: 0, min_stock: 0, cost: 0, is_composite: false, active: true };
    this.ingredientModalOpen = true;
  }

  private resolveCategoryId(name: string, cb: (id: number | null) => void) {
    const trimmed = name.trim();
    if (!trimmed) { cb(null); return; }
    const existing = this.ingredientCategories.find(c => c.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) { cb(existing.id); return; }
    this.api.post<IngredientCategory>('ingredient-categories', { name: trimmed }).subscribe({
      next: (created) => { this.ingredientCategories.push(created); cb(created.id); },
      error: () => cb(null)
    });
  }

  saveIngredient() {
    if (!this.ingredientForm.name.trim() || this.savingIngredient) return;
    this.savingIngredient = true;
    this.resolveCategoryId(this.ingredientForm.categoryName, (categoryId) => {
      const payload = {
        name: this.ingredientForm.name.trim(),
        sku: this.ingredientForm.sku.trim() || null,
        ingredient_category_id: categoryId,
        unit: this.ingredientForm.unit.trim() || 'und',
        stock: this.ingredientForm.stock,
        min_stock: this.ingredientForm.min_stock,
        cost: this.ingredientForm.cost,
        is_composite: this.ingredientForm.is_composite,
        active: this.ingredientForm.active,
      };
      const req = this.editingIngredient
        ? this.api.put<Ingredient>(`ingredients/${this.editingIngredient.id}`, payload)
        : this.api.post<Ingredient>('ingredients', payload);
      req.subscribe({
        next: () => {
          this.savingIngredient = false; this.ingredientModalOpen = false;
          this.messages.add({ severity: 'success', summary: 'Guardado', detail: `Insumo "${payload.name}" guardado.` });
          this.loadIngredients(); this.loadSummary();
        },
        error: (err: any) => { this.savingIngredient = false; this.messages.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'No se pudo guardar el insumo.' }); }
      });
    });
  }

  confirmDeleteIngredient(row: Ingredient) {
    this.confirmation.confirm({
      header: 'Confirmar eliminacion', message: `Seguro que deseas eliminar "${row.name}"?`, icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Eliminar', rejectLabel: 'Cancelar', acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.deleteIngredient(row)
    });
  }
  deleteIngredient(row: Ingredient) {
    this.api.delete(`ingredients/${row.id}`).subscribe({
      next: () => { this.messages.add({ severity: 'success', summary: 'Eliminado', detail: `Insumo "${row.name}" eliminado.` }); this.loadIngredients(); this.loadSummary(); },
      error: (err: any) => this.messages.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'No se pudo eliminar el insumo.' })
    });
  }

  exportIngredientsPdf() { this.downloadBlob('ingredients-pdf', this.ingredientExportParams(), 'insumos.pdf'); }
  exportIngredientsExcel() { this.downloadBlob('ingredients-excel', this.ingredientExportParams(), 'insumos.xlsx'); }

  private ingredientExportParams() {
    const params: any = { show_inactive: this.showInactiveIngredients };
    if (this.ingredientSearch.trim()) params.search = this.ingredientSearch.trim();
    if (this.ingredientCategoryFilter) params.ingredient_category_id = this.ingredientCategoryFilter;
    return params;
  }

  onImportIngredients(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.api.upload<any>('ingredients-import', file, 'file').subscribe({
      next: (r: any) => {
        this.messages.add({ severity: 'success', summary: 'Importado', detail: `${r.created} creados, ${r.updated} actualizados.` });
        this.loadIngredients(); this.loadIngredientCategories(); this.loadSummary();
        input.value = '';
      },
      error: (err: any) => { this.messages.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'No se pudo importar el archivo.' }); input.value = ''; }
    });
  }

  // ---------- Articulos ----------
  loadProductCategories() {
    this.api.get<any>('categories').subscribe((r: any) => { this.productCategories = Array.isArray(r) ? r : (r?.data || []); this.cdr.detectChanges(); });
  }

  loadArticulos() {
    this.articulosLoading = true;
    const params: any = { page: this.articulosPage, per_page: this.articulosPerPage };
    if (this.articuloSearch.trim()) params.search = this.articuloSearch.trim();
    if (this.articuloCategoryFilter) params.category_id = this.articuloCategoryFilter;
    this.api.get<any>('articulos-stock', params).subscribe({
      next: (r: any) => {
        this.articulos = r?.data || [];
        this.articulosTotal = r?.total ?? this.articulos.length;
        this.articulosLastPage = r?.last_page ?? 1;
        this.articulosLoading = false;
        this.cdr.detectChanges();
      },
      error: () => { this.articulosLoading = false; this.articulos = []; this.cdr.detectChanges(); }
    });
  }

  onArticuloFiltersChange() { this.articulosPage = 1; this.loadArticulos(); }
  goToArticulosPage(p: number) { if (p < 1 || p > this.articulosLastPage) return; this.articulosPage = p; this.loadArticulos(); }

  articuloStatus(row: Articulo): string {
    const stock = this.number(row.stock);
    const min = this.number(row.min_stock);
    if (stock <= 0) return 'agotado';
    return stock <= min ? 'bajo' : 'ok';
  }

  private articuloExportParams() {
    const params: any = {};
    if (this.articuloSearch.trim()) params.search = this.articuloSearch.trim();
    if (this.articuloCategoryFilter) params.category_id = this.articuloCategoryFilter;
    return params;
  }
  exportArticulosPdf() { this.downloadBlob('articulos-stock-pdf', this.articuloExportParams(), 'articulos.pdf'); }
  exportArticulosExcel() { this.downloadBlob('articulos-stock-excel', this.articuloExportParams(), 'articulos.xlsx'); }

  openConteoModal() {
    this.api.get<any>('articulos-stock', { per_page: 200 }).subscribe((r: any) => {
      const rows: Articulo[] = r?.data || [];
      this.conteoLines = rows.map(a => ({ product_id: a.id, name: a.name, current_stock: this.number(a.stock), counted_stock: this.number(a.stock) }));
      this.conteoModalOpen = true;
      this.cdr.detectChanges();
    });
  }

  saveConteo() {
    if (this.savingConteo) return;
    const items = this.conteoLines.filter(l => l.counted_stock !== l.current_stock).map(l => ({ product_id: l.product_id, counted_stock: l.counted_stock }));
    if (!items.length) { this.conteoModalOpen = false; return; }
    this.savingConteo = true;
    this.api.post<any>('articulos-stock-conteo', { items }).subscribe({
      next: (r: any) => {
        this.savingConteo = false; this.conteoModalOpen = false;
        this.messages.add({ severity: 'success', summary: 'Conteo guardado', detail: `${r.updated} articulos ajustados.` });
        this.loadArticulos(); this.loadSummary();
      },
      error: (err: any) => { this.savingConteo = false; this.messages.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'No se pudo guardar el conteo.' }); }
    });
  }

  // ---------- Recetas ----------
  loadRecipeStats() {
    this.api.get<any>('recipes-stats').subscribe(s => { this.recipeStats = s; this.cdr.detectChanges(); });
  }

  loadRecipes() {
    this.recipesLoading = true;
    const params: any = { kind: this.recipeKind, per_page: 60 };
    if (this.recipeSearch.trim()) params.search = this.recipeSearch.trim();
    this.api.get<any>('recipes', params).subscribe({
      next: (r: any) => { this.recipes = r?.data || []; this.recipesLoading = false; this.cdr.detectChanges(); },
      error: () => { this.recipesLoading = false; this.recipes = []; this.cdr.detectChanges(); }
    });
  }

  setRecipeKind(kind: 'receta' | 'extra') { this.recipeKind = kind; this.loadRecipes(); }
  onRecipeFiltersChange() { this.loadRecipes(); }

  foodCostTier(percent: number | null): { cls: string; label: string } {
    if (percent === null) return { cls: 'optimo', label: 'N/A' };
    if (percent < 35) return { cls: 'optimo', label: 'Optimo' };
    if (percent <= 40) return { cls: 'aceptable', label: 'Aceptable' };
    return { cls: 'alto', label: 'Alto' };
  }

  private loadIngredientsForRecipeForm() {
    this.api.get<any>('ingredients', { per_page: 500, show_inactive: false }).subscribe((r: any) => {
      this.allIngredients = r?.data || [];
      this.cdr.detectChanges();
    });
  }

  openNewRecipeModal() {
    this.editingRecipe = null;
    this.recipeForm = { product_id: null, kind: 'receta', ingredients: [] };
    this.pendingIngredientId = null;
    this.loadIngredientsForRecipeForm();
    this.api.get<AvailableProduct[]>('recipes-available-products').subscribe((r: any) => {
      this.availableProducts = Array.isArray(r) ? r : [];
      this.cdr.detectChanges();
    });
    this.recipeModalOpen = true;
  }

  openEditRecipeModal(recipe: RecipeRow) {
    this.editingRecipe = recipe;
    this.recipeForm = { product_id: recipe.product.id, kind: recipe.kind, ingredients: recipe.ingredients.map(ri => ({ ingredient_id: ri.ingredient_id, quantity: this.number(ri.quantity) })) };
    this.pendingIngredientId = null;
    this.loadIngredientsForRecipeForm();
    this.recipeModalOpen = true;
  }

  ingredientName(id: number): string {
    return this.allIngredients.find(i => i.id === id)?.name || this.editingRecipe?.ingredients.find(ri => ri.ingredient_id === id)?.name || `#${id}`;
  }

  addRecipeLine() {
    if (!this.pendingIngredientId) return;
    if (this.recipeForm.ingredients.some(l => l.ingredient_id === this.pendingIngredientId)) { this.pendingIngredientId = null; return; }
    this.recipeForm.ingredients.push({ ingredient_id: this.pendingIngredientId, quantity: 1 });
    this.pendingIngredientId = null;
  }
  removeRecipeLine(line: { ingredient_id: number }) {
    this.recipeForm.ingredients = this.recipeForm.ingredients.filter(l => l !== line);
  }

  recipeFormCostPreview(): number {
    return this.recipeForm.ingredients.reduce((sum, line) => {
      const ingredient = this.allIngredients.find(i => i.id === line.ingredient_id);
      return sum + (ingredient ? this.number(ingredient.cost) * this.number(line.quantity) : 0);
    }, 0);
  }

  canSaveRecipe(): boolean {
    if (!this.recipeForm.ingredients.length) return false;
    return this.editingRecipe ? true : !!this.recipeForm.product_id;
  }

  saveRecipe() {
    if (!this.canSaveRecipe() || this.savingRecipe) return;
    this.savingRecipe = true;
    const payload = { kind: this.recipeForm.kind, ingredients: this.recipeForm.ingredients };
    const req = this.editingRecipe
      ? this.api.put<any>(`recipes/${this.editingRecipe.id}`, payload)
      : this.api.post<any>('recipes', { ...payload, product_id: this.recipeForm.product_id, is_general: true });
    req.subscribe({
      next: () => {
        this.savingRecipe = false; this.recipeModalOpen = false;
        this.messages.add({ severity: 'success', summary: 'Guardado', detail: 'La receta se guardo correctamente.' });
        this.loadRecipes(); this.loadRecipeStats();
      },
      error: (err: any) => { this.savingRecipe = false; this.messages.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'No se pudo guardar la receta.' }); }
    });
  }

  confirmDeleteRecipe(recipe: RecipeRow) {
    this.confirmation.confirm({
      header: 'Confirmar eliminacion', message: `Seguro que deseas eliminar la receta de "${recipe.product.name}"?`, icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Eliminar', rejectLabel: 'Cancelar', acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.api.delete(`recipes/${recipe.id}`).subscribe({
          next: () => {
            this.recipeModalOpen = false;
            this.messages.add({ severity: 'success', summary: 'Eliminada', detail: 'Receta eliminada.' });
            this.loadRecipes(); this.loadRecipeStats();
          },
          error: (err: any) => this.messages.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'No se pudo eliminar la receta.' })
        });
      }
    });
  }

  // ---------- Kardex ----------
  loadKardex() {
    this.kardexLoading = true;
    const params: any = { page: this.kardexPage, per_page: this.kardexPerPage };
    if (this.kardexSearch.trim()) params.search = this.kardexSearch.trim();
    if (this.kardexKind) params.kind = this.kardexKind;
    if (this.kardexType) params.type = this.kardexType;
    this.api.get<any>('kardex', params).subscribe({
      next: (r: any) => {
        this.kardexRows = r?.data || [];
        this.kardexTotal = r?.total ?? this.kardexRows.length;
        this.kardexLastPage = r?.last_page ?? 1;
        this.kardexLoading = false;
        this.cdr.detectChanges();
      },
      error: () => { this.kardexLoading = false; this.kardexRows = []; this.cdr.detectChanges(); }
    });
  }

  onKardexFiltersChange() { this.kardexPage = 1; this.loadKardex(); }
  goToKardexPage(p: number) { if (p < 1 || p > this.kardexLastPage) return; this.kardexPage = p; this.loadKardex(); }

  // ---------- Shared export helpers ----------
  private downloadBlob(path: string, params: Record<string, any>, filename: string) {
    this.api.getBlob(path, params).subscribe({
      next: (blob: Blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: (err: any) => this.messages.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'No se pudo generar el archivo.' })
    });
  }
}
