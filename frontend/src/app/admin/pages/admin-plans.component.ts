import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MessageService } from 'primeng/api';
import { AdminApiService } from '../core/admin-api.service';

@Component({
  selector: 'app-admin-plans', standalone: true,
  imports: [FormsModule, MatIconModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  template: `
  <section class="admin-page">
    <header class="admin-head"><div><span class="eyebrow">Panel Administrativo</span><h1>Planes</h1><p>Precios y limites de cada plan. Los cambios aplican de inmediato para todas las empresas en ese plan.</p></div></header>

    <div class="settings-grid">
      @for (plan of plans; track plan.id) {
        <article class="setting-card plan-edit-card">
          <h3>{{plan.name}} <small>({{plan.companies_count}} empresas)</small></h3>
          <mat-form-field appearance="outline"><mat-label>Precio (S/ /mes)</mat-label><input matInput type="number" [(ngModel)]="plan.price"></mat-form-field>
          <mat-form-field appearance="outline"><mat-label>Maximo de usuarios (vacio = sin limite)</mat-label><input matInput type="number" [(ngModel)]="plan.max_users"></mat-form-field>
          <mat-form-field appearance="outline"><mat-label>Maximo de almacenes (vacio = sin limite)</mat-label><input matInput type="number" [(ngModel)]="plan.max_warehouses"></mat-form-field>
          <button mat-flat-button class="primary-action" (click)="save(plan)"><mat-icon>save</mat-icon>Guardar</button>
        </article>
      }
    </div>
  </section>`,
  styles: [`.plan-edit-card { display: flex; flex-direction: column; gap: 10px; } .plan-edit-card h3 small { font-weight: 400; color: var(--muted); }`]
})
export class AdminPlansComponent implements OnInit {
  api = inject(AdminApiService); cdr = inject(ChangeDetectorRef); messages = inject(MessageService);
  plans: any[] = [];

  ngOnInit() { this.load(); }
  load() { this.api.get<any[]>('plans').subscribe(res => { this.plans = res; this.cdr.detectChanges(); }); }

  save(plan: any) {
    this.api.put(`plans/${plan.id}`, { price: plan.price, max_users: plan.max_users || null, max_warehouses: plan.max_warehouses || null, active: true }).subscribe({
      next: () => this.messages.add({ severity: 'success', summary: 'Guardado', detail: `Plan "${plan.name}" actualizado.` }),
      error: (err: any) => this.messages.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'No se pudo guardar.' })
    });
  }
}
