import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MessageService } from 'primeng/api';
import { AdminApiService } from '../core/admin-api.service';

type Tab = 'plans' | 'settings' | 'history';

const PLAN_ICONS: Record<string, string> = { basico: 'inventory_2', profesional: 'rocket_launch', empresarial: 'apartment' };

@Component({
  selector: 'app-admin-plans', standalone: true,
  imports: [DatePipe, FormsModule, MatIconModule, MatButtonModule],
  template: `
  <section class="admin-page">
    <header class="admin-head"><div><span class="eyebrow">Panel Administrativo</span><h1>Gestion de Planes</h1><p>Configura los precios y limites globales para cada nivel de suscripcion. Los cambios aplican de inmediato para todas las nuevas empresas registradas y renovaciones.</p></div></header>

    <div class="plans-tabs">
      <button type="button" class="plans-tab" [class.active]="tab === 'plans'" (click)="tab = 'plans'">Niveles de Planes</button>
      <button type="button" class="plans-tab" [class.active]="tab === 'settings'" (click)="tab = 'settings'">Configuracion Global</button>
      <button type="button" class="plans-tab" [class.active]="tab === 'history'" (click)="loadHistory()">Historial de Cambios</button>
    </div>

    @if (tab === 'plans') {
      <div class="plans-grid">
        @for (plan of plans; track plan.id) {
          <article class="plan-tier-card" [class.featured]="isFeatured(plan.key)">
            @if (isFeatured(plan.key)) { <span class="plan-popular-badge">MAS POPULAR</span> }
            <div class="plan-tier-head">
              <div>
                <h3 class="plan-tier-name">{{plan.name}}</h3>
                <small class="plan-tier-count">{{plan.companies_count}} empresas</small>
              </div>
              <span class="plan-tier-icon"><mat-icon>{{planIcon(plan.key)}}</mat-icon></span>
            </div>

            <div class="plan-tier-field"><label>Precio (S/ /mes)</label><input class="date-input" type="number" min="0" [(ngModel)]="plan.price"></div>
            <div class="plan-tier-field"><label>Maximo de usuarios</label><input class="date-input" type="number" min="1" placeholder="Ilimitado" [(ngModel)]="plan.max_users"></div>
            <div class="plan-tier-field"><label>Maximo de almacenes</label><input class="date-input" type="number" min="1" placeholder="Ilimitado" [(ngModel)]="plan.max_warehouses"></div>

            <button mat-flat-button class="plan-tier-save" (click)="savePlan(plan)"><mat-icon>save</mat-icon>Guardar Cambios</button>
          </article>
        }
      </div>
    }

    @if (tab === 'settings' && settings) {
      <article class="global-settings-card">
        <div class="global-settings-head"><mat-icon>settings</mat-icon><h3>Configuracion Global del Sistema</h3></div>
        <p class="global-settings-sub">Parametros impositivos y de visualizacion regional.</p>

        <div class="global-settings-grid">
          <div class="plan-tier-field"><label>Moneda Predeterminada</label>
            <select class="date-preset-select" [(ngModel)]="settings.default_currency">
              <option value="PEN">Soles (S/)</option>
            </select>
          </div>
          <div class="plan-tier-field"><label>Impuesto (IGV/IVA) %</label><input class="date-input" type="number" min="0" max="100" [(ngModel)]="settings.default_igv_percent"></div>
          <div class="plan-tier-field"><label>Periodo de Prueba (Dias)</label><input class="date-input" type="number" min="1" max="90" [(ngModel)]="settings.trial_days"></div>
          <button mat-flat-button class="primary-action" [disabled]="savingSettings" (click)="saveSettings()"><mat-icon>save</mat-icon>{{savingSettings ? 'Guardando...' : 'Actualizar Ajustes'}}</button>
        </div>

        <div class="global-settings-note">
          <mat-icon>info</mat-icon>
          <span>Estos valores se aplican como configuracion inicial para las empresas nuevas (registro publico o creadas desde este panel). No modifican la configuracion ya guardada de empresas existentes; cada una puede seguir ajustando su propio IGV desde su modulo de Empresa.</span>
        </div>
      </article>
    }

    @if (tab === 'history') {
      <article class="global-settings-card">
        <div class="global-settings-head"><mat-icon>history</mat-icon><h3>Historial de Cambios</h3></div>
        <p class="global-settings-sub">Ultimas modificaciones a planes y configuracion global.</p>
        @if (loadingHistory) { <div class="loading-state"><mat-icon>hourglass_empty</mat-icon><p>Cargando...</p></div> }
        @else if (!history.length) { <div class="empty-state"><mat-icon>history</mat-icon><p>Aun no hay cambios registrados.</p></div> }
        @else {
          <div class="history-list">
            @for (h of history; track h.id) {
              <div class="history-row">
                <div class="history-row-main"><b>{{h.description}}</b><small>{{h.admin_name}}</small></div>
                <span class="history-row-date">{{h.created_at | date:'dd/MM/yyyy HH:mm'}}</span>
              </div>
            }
          </div>
        }
      </article>
    }
  </section>`,
  styles: [`
    .plans-tabs { display: flex; gap: 26px; border-bottom: 1px solid var(--line); margin-bottom: 20px; }
    .plans-tab { padding: 10px 2px; background: none; border: none; border-bottom: 2px solid transparent; color: var(--muted); font-size: 13.5px; font-weight: 700; cursor: pointer; }
    .plans-tab.active { color: var(--primary-strong); border-bottom-color: var(--primary-strong); }

    .plans-grid { display: grid; grid-template-columns: repeat(3, minmax(240px, 1fr)); gap: 16px; }
    @media (max-width: 900px) { .plans-grid { grid-template-columns: 1fr; } }
    .plan-tier-card { position: relative; border: 1px solid var(--line); border-radius: 12px; background: var(--surface); box-shadow: var(--shadow); padding: 20px; display: flex; flex-direction: column; gap: 14px; }
    .plan-tier-card.featured { border-color: #2563eb; border-width: 2px; }
    .plan-tier-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
    .plan-tier-name { font-size: 17px; margin: 0; }
    .plan-tier-count { display: block; font-size: 11px; color: var(--muted); font-weight: 700; margin-top: 4px; }
    .plan-tier-icon { flex: none; width: 38px; height: 38px; border-radius: 10px; background: var(--surface-2); display: flex; align-items: center; justify-content: center; color: var(--muted); }
    .plan-tier-card.featured .plan-tier-icon { background: #dbeafe; color: #2563eb; }
    .plan-popular-badge { position: absolute; top: -11px; left: 50%; transform: translateX(-50%); background: #2563eb; color: #fff; font-size: 10px; font-weight: 800; letter-spacing: .04em; padding: 4px 12px; border-radius: 999px; }
    .plan-tier-field { display: flex; flex-direction: column; gap: 5px; }
    .plan-tier-field label { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: .04em; color: var(--muted); }
    .plan-tier-field .date-input, .plan-tier-field .date-preset-select { width: 100%; }
    .plan-tier-save { width: 100%; height: 42px; border-radius: 8px !important; background: var(--ink) !important; color: #fff !important; font-weight: 800 !important; }
    .plan-tier-card.featured .plan-tier-save { background: #2563eb !important; }

    .global-settings-card { border: 1px solid var(--line); border-radius: 12px; background: var(--surface); box-shadow: var(--shadow); padding: 20px; }
    .global-settings-head { display: flex; align-items: center; gap: 10px; margin-bottom: 4px; }
    .global-settings-head mat-icon { color: var(--muted); }
    .global-settings-head h3 { margin: 0; font-size: 15px; }
    .global-settings-sub { margin: 2px 0 18px 46px; color: var(--muted); font-size: 12.5px; }
    .global-settings-grid { display: grid; grid-template-columns: repeat(3, 1fr) auto; gap: 14px; align-items: end; }
    @media (max-width: 900px) { .global-settings-grid { grid-template-columns: 1fr; } }
    .global-settings-grid .primary-action { height: 48px; }
    .global-settings-note { display: flex; gap: 8px; margin-top: 18px; padding: 12px 14px; border-radius: 8px; background: #e8f7f1; color: var(--primary-strong); font-size: 12.5px; line-height: 1.5; }
    .global-settings-note mat-icon { flex: none; font-size: 18px; width: 18px; height: 18px; }
    html.app-dark .global-settings-note { background: var(--surface-2); }

    .history-list { display: flex; flex-direction: column; }
    .history-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; padding: 12px 4px; border-bottom: 1px solid var(--soft-line); font-size: 13px; }
    .history-row:last-child { border-bottom: none; }
    .history-row-main b { display: block; }
    .history-row-main small { color: var(--muted); }
    .history-row-date { flex: none; color: var(--muted); font-size: 12px; white-space: nowrap; }
  `]
})
export class AdminPlansComponent implements OnInit {
  api = inject(AdminApiService); cdr = inject(ChangeDetectorRef); messages = inject(MessageService);
  tab: Tab = 'plans';
  plans: any[] = [];
  settings: any = null;
  savingSettings = false;
  history: any[] = [];
  loadingHistory = false;
  private historyLoaded = false;

  ngOnInit() {
    this.loadPlans();
    this.loadSettings();
  }

  loadPlans() { this.api.get<any[]>('plans').subscribe(res => { this.plans = res; this.cdr.detectChanges(); }); }

  loadSettings() { this.api.get<any>('settings').subscribe(res => { this.settings = res; this.cdr.detectChanges(); }); }

  loadHistory() {
    this.tab = 'history';
    if (this.historyLoaded) return;
    this.historyLoaded = true;
    this.loadingHistory = true;
    this.cdr.detectChanges();
    this.api.get<any[]>('plans-history').subscribe(res => { this.history = res || []; this.loadingHistory = false; this.cdr.detectChanges(); });
  }

  planIcon(key: string) { return PLAN_ICONS[key] || 'sell'; }
  isFeatured(key: string) { return key === 'profesional'; }

  savePlan(plan: any) {
    this.api.put(`plans/${plan.id}`, { price: plan.price, max_users: plan.max_users || null, max_warehouses: plan.max_warehouses || null, active: true }).subscribe({
      next: () => { this.messages.add({ severity: 'success', summary: 'Guardado', detail: `Plan "${plan.name}" actualizado.` }); this.historyLoaded = false; },
      error: (err: any) => this.messages.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'No se pudo guardar.' })
    });
  }

  saveSettings() {
    if (this.savingSettings || !this.settings) return;
    this.savingSettings = true;
    this.api.put<any>('settings', {
      default_currency: this.settings.default_currency,
      default_igv_percent: this.settings.default_igv_percent,
      trial_days: this.settings.trial_days,
    }).subscribe({
      next: (res: any) => { this.savingSettings = false; this.settings = res; this.historyLoaded = false; this.messages.add({ severity: 'success', summary: 'Guardado', detail: 'Configuracion global actualizada.' }); this.cdr.detectChanges(); },
      error: (err: any) => { this.savingSettings = false; this.messages.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'No se pudo guardar.' }); this.cdr.detectChanges(); }
    });
  }
}
