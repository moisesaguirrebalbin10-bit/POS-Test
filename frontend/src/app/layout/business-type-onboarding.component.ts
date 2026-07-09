import { Component, EventEmitter, Input, Output } from '@angular/core';
import { DialogModule } from 'primeng/dialog';

type BusinessType = 'market' | 'restaurant';

@Component({
  selector: 'app-business-type-onboarding', standalone: true,
  imports: [DialogModule],
  template: `
  <p-dialog [visible]="open" [modal]="true" [closable]="false" [dismissableMask]="false" [draggable]="false"
            [style]="{ width: 'min(720px, 96vw)' }" styleClass="onboarding-dialog">
    <div class="onboarding">
      <h2>Bienvenido a OptiUso</h2>
      <p class="onboarding-sub">Antes de empezar, elige el modo con el que trabaja tu negocio. Podras cambiarlo despues cuando quieras desde <strong>Empresa &rarr; Editar</strong>.</p>

      <div class="onboarding-cards">
        <button type="button" class="onboarding-card" [class.selected]="selected === 'market'" (click)="selected = 'market'">
          <span class="material-icons onboarding-icon">storefront</span>
          <h3>Modo Market</h3>
          <p>Ideal para bodegas, minimarkets y tiendas con venta rapida por mostrador.</p>
          <ul>
            <li>Punto de venta agil con catalogo y busqueda rapida, sin mesas</li>
            <li>Control de stock por almacen, con alertas de stock bajo</li>
            <li>Caja por turnos, con movimientos de efectivo y arqueo</li>
            <li>Reportes de ventas, productos mas vendidos y metodos de pago</li>
          </ul>
        </button>

        <button type="button" class="onboarding-card" [class.selected]="selected === 'restaurant'" (click)="selected = 'restaurant'">
          <span class="material-icons onboarding-icon">restaurant</span>
          <h3>Modo Restaurante</h3>
          <p>Ideal para restaurantes y chifas que atienden pedidos por mesa, para llevar o delivery.</p>
          <ul>
            <li>Ordenes por Mesa, Para llevar o Delivery, con catalogo y vista de cocina en tiempo real</li>
            <li>Mesas con comandas por rondas, temporizador y cobro con propina</li>
            <li>Reservas con calendario interactivo, mesas multiples y alertas automaticas</li>
            <li>Inventario con recetas, food cost automatico y descuento de insumos por venta</li>
          </ul>
        </button>
      </div>

      <button type="button" class="onboarding-confirm" [disabled]="!selected || saving" (click)="confirm.emit(selected!)">
        {{ saving ? 'Guardando...' : 'Confirmar y continuar' }}
      </button>
    </div>
  </p-dialog>`,
  styles: [`
    .onboarding { padding: .5rem .25rem; }
    .onboarding h2 { margin: 0 0 .35rem; font-size: 1.4rem; }
    .onboarding-sub { margin: 0 0 1.25rem; color: var(--text-color-secondary, #667085); font-size: .92rem; line-height: 1.45; }
    .onboarding-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.25rem; }
    @media (max-width: 640px) { .onboarding-cards { grid-template-columns: 1fr; } }
    .onboarding-card {
      text-align: left; border: 2px solid #e2e8f0; border-radius: 14px; padding: 1.1rem 1.1rem 1.25rem;
      background: #ffffff; cursor: pointer; transition: border-color .15s, box-shadow .15s, transform .1s;
      display: flex; flex-direction: column; gap: .4rem; font-family: inherit; color: #0f172a;
    }
    .onboarding-card:hover { border-color: #94a3b8; transform: translateY(-1px); }
    .onboarding-card.selected { border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37,99,235,.15); }
    .onboarding-icon { font-size: 2rem; color: #2563eb; }
    .onboarding-card h3 { margin: 0; font-size: 1.05rem; color: #0f172a; }
    .onboarding-card p { margin: 0; font-size: .85rem; color: #667085; line-height: 1.4; }
    .onboarding-card ul { margin: .3rem 0 0; padding-left: 1.1rem; font-size: .82rem; color: #334155; display: flex; flex-direction: column; gap: .2rem; }
    .onboarding-confirm {
      width: 100%; padding: .75rem 1rem; border: none; border-radius: 10px; background: #2563eb; color: #fff;
      font-size: .95rem; font-weight: 600; cursor: pointer; transition: background .15s;
    }
    .onboarding-confirm:disabled { background: #94a3b8; cursor: not-allowed; }
    .onboarding-confirm:not(:disabled):hover { background: #1d4ed8; }
  `]
})
export class BusinessTypeOnboardingComponent {
  @Input() open = false;
  @Input() saving = false;
  @Output() confirm = new EventEmitter<BusinessType>();

  selected: BusinessType | null = null;
}
