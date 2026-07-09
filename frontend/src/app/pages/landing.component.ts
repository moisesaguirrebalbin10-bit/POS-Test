import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink, MatIconModule],
  template: `
  <div class="landing">
    <header class="landing-nav">
      <div class="landing-nav-inner">
        <a class="landing-logo" routerLink="/">
          <img class="landing-logo-img" src="/assets/brand/optiuso-logo.png" alt="OptiUso">
        </a>
        <nav class="landing-nav-links">
          <a href="#features">Características</a>
          <a href="#how">Cómo funciona</a>
          <a href="#pricing">Precios</a>
        </nav>
        <div class="landing-nav-actions">
          <a routerLink="/login" class="btn btn-ghost">Iniciar sesión</a>
          <a routerLink="/register" class="btn btn-primary">Prueba gratis</a>
        </div>
      </div>
    </header>

    <section class="landing-hero">
      <div class="landing-hero-bg"></div>
      <div class="landing-hero-scrim"></div>
      <div class="landing-hero-inner">
        <div class="landing-hero-copy">
          <span class="landing-eyebrow">Software POS para restaurantes</span>
          <h1>Vende, controla tu caja e inventario desde un solo sistema</h1>
          <p>OptiUso es el punto de venta pensado para chifas y restaurantes: registra ventas en segundos, controla tu caja diaria y tu inventario, y genera comprobantes en PDF listos para imprimir.</p>
          <div class="landing-hero-actions">
            <a routerLink="/register" class="btn btn-primary btn-lg">Prueba gratis</a>
            <a href="#how" class="btn btn-outline btn-lg">Ver cómo funciona</a>
          </div>
          <ul class="landing-trust">
            <li><mat-icon>check_circle</mat-icon>Sin tarjeta de crédito</li>
            <li><mat-icon>check_circle</mat-icon>Web y aplicativo de escritorio</li>
            <li><mat-icon>check_circle</mat-icon>Soporte en español</li>
          </ul>
        </div>
      </div>
    </section>

    <section class="landing-features" id="features">
      <h2 class="landing-section-title">Todo lo que tu restaurante necesita</h2>
      <p class="landing-section-sub">Un sistema pensado para el día a día del negocio, sin complicaciones.</p>
      <div class="landing-features-grid">
        @for (f of features; track f.title) {
          <div class="feature-card">
            <div class="feature-icon"><mat-icon>{{f.icon}}</mat-icon></div>
            <h3>{{f.title}}</h3>
            <p>{{f.text}}</p>
          </div>
        }
      </div>
    </section>

    <section class="landing-how" id="how">
      <h2 class="landing-section-title">Cómo funciona</h2>
      <div class="landing-steps">
        @for (s of steps; track s.title; let i = $index) {
          <div class="step-card">
            <span class="step-number">{{i + 1}}</span>
            <h3>{{s.title}}</h3>
            <p>{{s.text}}</p>
          </div>
        }
      </div>
    </section>

    <section class="landing-pricing" id="pricing">
      <h2 class="landing-section-title">Planes para cada etapa de tu negocio</h2>
      <p class="landing-section-sub">Prueba gratis y elige el plan que se ajuste a tu negocio, sea restaurante o market.</p>

      <div class="billing-toggle">
        <button type="button" [class.active]="billingCycle === 'monthly'" (click)="billingCycle = 'monthly'">Mensual</button>
        <button type="button" [class.active]="billingCycle === 'yearly'" (click)="billingCycle = 'yearly'">
          Anual <span class="save-badge">Ahorra S/ 500</span>
        </button>
      </div>

      <div class="landing-plans">
        @for (p of plans; track p.name) {
          <div class="plan-card" [class.featured]="p.featured">
            @if (p.featured) { <span class="plan-badge">Más popular</span> }
            <h3>{{p.name}}</h3>
            <div class="plan-price"><span class="plan-amount">{{planPrice(p)}}</span><span class="plan-period">{{planPeriod(p)}}</span></div>
            <p class="plan-desc">{{p.desc}}</p>
            <ul class="plan-features">
              @for (feat of p.features; track feat) { <li><mat-icon>check</mat-icon>{{feat}}</li> }
            </ul>
            <a routerLink="/register" class="btn" [class.btn-primary]="p.featured" [class.btn-outline]="!p.featured">{{p.cta}}</a>
          </div>
        }
      </div>
    </section>

    <section class="landing-cta">
      <h2>¿Listo para simplificar tu negocio?</h2>
      <p>Únete a los restaurantes que ya gestionan sus ventas con OptiUso.</p>
      <a routerLink="/register" class="btn btn-primary btn-lg">Comenzar ahora</a>
    </section>

    <footer class="landing-footer">
      <div class="landing-footer-inner">
        <div class="landing-footer-brand">
          <div class="landing-logo">
            <img class="landing-logo-img" src="/assets/brand/optiuso-logo.png" alt="OptiUso">
          </div>
          <p>El POS simple para restaurantes.</p>
        </div>
        <div class="landing-footer-col">
          <h4>Producto</h4>
          <a href="#features">Características</a>
          <a href="#pricing">Precios</a>
        </div>
        <div class="landing-footer-col">
          <h4>Cuenta</h4>
          <a routerLink="/login">Iniciar sesión</a>
          <a routerLink="/register">Crear cuenta</a>
        </div>
      </div>
      <div class="landing-footer-bottom">© {{year}} OptiUso. Todos los derechos reservados.</div>
    </footer>
  </div>`,
  styles: [`
    .landing { min-height: 100vh; background: var(--bg); color: var(--ink); overflow-x: hidden; }

    .btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 10px 18px; border-radius: 10px; font-size: 14px; font-weight: 600; text-decoration: none; cursor: pointer; border: 1px solid transparent; transition: transform .15s ease, box-shadow .15s ease, background .15s ease; }
    .btn-lg { padding: 13px 24px; font-size: 15px; }
    .btn-primary { background: var(--primary); color: #fff; }
    .btn-primary:hover { background: var(--primary-strong); transform: translateY(-1px); }
    .btn-outline { border-color: var(--line); color: var(--ink); background: var(--surface); }
    .btn-outline:hover { border-color: var(--primary); color: var(--primary-strong); }
    .btn-ghost { color: var(--ink); background: transparent; }
    .btn-ghost:hover { color: var(--primary-strong); }

    .landing-nav { position: sticky; top: 0; z-index: 20; background: color-mix(in srgb, var(--surface) 88%, transparent); backdrop-filter: blur(8px); border-bottom: 1px solid var(--line); }
    .landing-nav-inner { max-width: 1180px; margin: 0 auto; padding: 14px 24px; display: flex; align-items: center; gap: 24px; }
    .landing-logo { display: flex; align-items: center; text-decoration: none; }
    .landing-logo-img { height: 48px; width: auto; }
    .landing-nav-links { display: flex; gap: 22px; margin-left: 12px; flex: 1; }
    .landing-nav-links a { color: var(--muted); text-decoration: none; font-size: 14px; font-weight: 600; }
    .landing-nav-links a:hover { color: var(--ink); }
    .landing-nav-actions { display: flex; gap: 10px; align-items: center; }

    .landing-hero { position: relative; overflow: hidden; aspect-ratio: 1691 / 951; background: #0c1418; }
    .landing-hero-bg {
      position: absolute; inset: 0;
      background: url('/assets/landing/hero-optiuso.jpg') center / cover no-repeat;
    }
    .landing-hero-scrim {
      position: absolute; inset: 0;
      background: linear-gradient(90deg, rgba(8,14,18,.85) 0%, rgba(8,14,18,.72) 30%, rgba(8,14,18,.4) 48%, rgba(8,14,18,.1) 62%, transparent 72%);
    }
    .landing-hero-inner { position: relative; z-index: 1; max-width: 1180px; margin: 0 auto; padding: 64px 24px; height: 100%; display: flex; align-items: flex-start; padding-top: 12%; }
    .landing-hero-copy { max-width: 560px; }
    .landing-eyebrow { display: inline-block; font-size: 13px; font-weight: 700; color: #fff; background: rgba(255,255,255,.16); padding: 6px 12px; border-radius: 999px; margin-bottom: 18px; }
    .landing-hero-copy h1 { font-size: 42px; line-height: 1.12; letter-spacing: -.02em; margin-bottom: 18px; color: #fff; }
    .landing-hero-copy p { font-size: 16px; line-height: 1.6; color: rgba(255,255,255,.78); max-width: 520px; margin-bottom: 26px; }
    .landing-hero-actions { display: flex; gap: 12px; margin-bottom: 28px; flex-wrap: wrap; }
    .landing-trust { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
    .landing-trust li { display: flex; align-items: center; gap: 8px; font-size: 14px; color: rgba(255,255,255,.78); }
    .landing-trust mat-icon { font-size: 18px; width: 18px; height: 18px; color: var(--primary); }

    .landing-section-title { text-align: center; font-size: 30px; letter-spacing: -.02em; margin-bottom: 10px; }
    .landing-section-sub { text-align: center; color: var(--muted); font-size: 15px; margin: 0 auto 40px; max-width: 520px; }

    .landing-features { max-width: 1180px; margin: 0 auto; padding: 80px 24px; }
    .landing-features-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
    .feature-card { background: var(--surface); border: 1px solid var(--line); border-radius: 16px; padding: 24px; }
    .feature-icon { width: 44px; height: 44px; border-radius: 12px; background: color-mix(in srgb, var(--primary) 12%, transparent); color: var(--primary-strong); display: flex; align-items: center; justify-content: center; margin-bottom: 14px; }
    .feature-card h3 { font-size: 16px; margin-bottom: 8px; }
    .feature-card p { font-size: 14px; color: var(--muted); line-height: 1.55; margin: 0; }

    .landing-how { background: var(--surface-2); padding: 80px 24px; border-top: 1px solid var(--soft-line); border-bottom: 1px solid var(--soft-line); }
    .landing-steps { max-width: 1180px; margin: 0 auto; display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
    .step-card { text-align: center; padding: 0 12px; }
    .step-number { display: inline-flex; width: 38px; height: 38px; border-radius: 50%; background: var(--primary); color: #fff; align-items: center; justify-content: center; font-weight: 700; margin-bottom: 14px; }
    .step-card h3 { font-size: 16px; margin-bottom: 8px; }
    .step-card p { font-size: 14px; color: var(--muted); line-height: 1.55; margin: 0; }

    .landing-pricing { max-width: 1180px; margin: 0 auto; padding: 80px 24px; }
    .billing-toggle { display: flex; justify-content: center; gap: 4px; margin: 0 auto 36px; padding: 4px; width: fit-content; background: var(--surface-2); border: 1px solid var(--line); border-radius: 999px; }
    .billing-toggle button { display: flex; align-items: center; gap: 8px; padding: 9px 18px; border: none; border-radius: 999px; background: transparent; color: var(--muted); font-size: 13.5px; font-weight: 700; cursor: pointer; transition: background .15s, color .15s; }
    .billing-toggle button.active { background: var(--primary); color: #fff; }
    .billing-toggle .save-badge { font-size: 11px; font-weight: 800; padding: 2px 8px; border-radius: 999px; background: rgba(255,255,255,.2); color: inherit; }
    .billing-toggle button:not(.active) .save-badge { background: color-mix(in srgb, var(--primary) 15%, transparent); color: var(--primary-strong); }
    .landing-plans { display: grid; grid-template-columns: repeat(2, minmax(0, 400px)); justify-content: center; gap: 24px; align-items: stretch; }
    .plan-card { position: relative; background: var(--surface); border: 1px solid var(--line); border-radius: 18px; padding: 28px 24px; display: flex; flex-direction: column; }
    .plan-card.featured { border-color: var(--primary); box-shadow: var(--shadow); }
    .plan-badge { position: absolute; top: -12px; left: 50%; transform: translateX(-50%); background: var(--primary); color: #fff; font-size: 11px; font-weight: 700; padding: 4px 12px; border-radius: 999px; }
    .plan-card h3 { font-size: 17px; margin-bottom: 10px; }
    .plan-price { display: flex; align-items: baseline; gap: 4px; margin-bottom: 10px; }
    .plan-amount { font-size: 30px; font-weight: 800; letter-spacing: -.02em; }
    .plan-period { font-size: 13px; color: var(--muted); }
    .plan-desc { font-size: 13px; color: var(--muted); margin: 0 0 18px; min-height: 36px; }
    .plan-features { list-style: none; margin: 0 0 24px; padding: 0; display: flex; flex-direction: column; gap: 10px; flex: 1; }
    .plan-features li { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--ink); }
    .plan-features mat-icon { font-size: 17px; width: 17px; height: 17px; color: var(--primary); }
    .plan-card .btn { width: 100%; }

    .landing-cta { text-align: center; padding: 80px 24px; background: var(--primary); color: #fff; }
    .landing-cta h2 { font-size: 28px; margin-bottom: 10px; }
    .landing-cta p { font-size: 15px; opacity: .9; margin-bottom: 24px; }
    .landing-cta .btn-primary { background: #fff; color: var(--primary-strong); }
    .landing-cta .btn-primary:hover { background: #f2f2f2; }

    .landing-footer { background: var(--surface); border-top: 1px solid var(--line); padding: 48px 24px 24px; }
    .landing-footer-inner { max-width: 1180px; margin: 0 auto; display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 32px; margin-bottom: 28px; }
    .landing-footer-brand p { font-size: 13px; color: var(--muted); margin: 10px 0 0; max-width: 260px; }
    .landing-footer-col h4 { font-size: 13px; text-transform: uppercase; letter-spacing: .04em; color: var(--muted); margin-bottom: 12px; }
    .landing-footer-col a { display: block; font-size: 14px; color: var(--ink); text-decoration: none; margin-bottom: 8px; }
    .landing-footer-col a:hover { color: var(--primary-strong); }
    .landing-footer-bottom { max-width: 1180px; margin: 0 auto; border-top: 1px solid var(--soft-line); padding-top: 20px; font-size: 12px; color: var(--muted); text-align: center; }

    @media (max-width: 900px) {
      .landing-hero { aspect-ratio: auto; min-height: 640px; }
      .landing-hero-inner { height: auto; padding: 48px 24px 64px; }
      .landing-hero-copy { max-width: none; }
      .landing-hero-scrim { background: rgba(8,14,18,.82); }
      .landing-nav-links { display: none; }
      .landing-features-grid, .landing-steps, .landing-plans { grid-template-columns: 1fr; }
      .landing-footer-inner { grid-template-columns: 1fr; }
      .landing-hero-copy h1 { font-size: 32px; }
    }
  `]
})
export class LandingComponent {
  year = new Date().getFullYear();

  features = [
    { icon: 'point_of_sale', title: 'Ventas rápidas', text: 'Registra pedidos y cobra en segundos desde una pantalla pensada para el mostrador.' },
    { icon: 'inventory_2', title: 'Control de inventario', text: 'Controla stock por almacén y recibe alertas cuando un producto llega a su mínimo.' },
    { icon: 'payments', title: 'Caja diaria', text: 'Abre y cierra caja, registra ingresos y egresos, y cuadra el efectivo sin hojas de cálculo.' },
    { icon: 'receipt_long', title: 'Comprobantes en PDF', text: 'Genera e imprime boletas y comandas en PDF, listas para tickets de 58mm u 80mm.' },
    { icon: 'bar_chart', title: 'Reportes en tiempo real', text: 'Visualiza tendencias de ventas, utilidad y pedidos filtrando por fecha o categoría.' },
    { icon: 'admin_panel_settings', title: 'Roles y permisos', text: 'Da acceso a tu equipo con permisos por módulo: cajeros, cocina y administración.' }
  ];

  steps = [
    { title: 'Configura tu negocio', text: 'Registra tu empresa, tus almacenes y tus productos en minutos.' },
    { title: 'Registra tus ventas', text: 'Tu equipo cobra desde el POS y el sistema actualiza caja e inventario al instante.' },
    { title: 'Controla todo desde un panel', text: 'Revisa reportes, cierra caja y da seguimiento a tu negocio desde cualquier dispositivo.' }
  ];

  billingCycle: 'monthly' | 'yearly' = 'monthly';

  plans: { name: string; priceMonthly: number | null; priceYearly: number | null; desc: string; featured: boolean; cta: string; features: string[] }[] = [
    {
      name: 'Profesional', priceMonthly: 100, priceYearly: 700, featured: true, cta: 'Elegir plan',
      desc: 'Todo lo que tu negocio necesita para vender, controlar caja e inventario, sin límites de uso.',
      features: [
        'Ventas y usuarios ilimitados',
        'Modo Restaurante: Órdenes, Mesas y Cocina en tiempo real',
        'Reservas con calendario y alertas automáticas',
        'Modo Market: POS, Productos y Almacenes con alertas de stock',
        'Inventario con recetas y food cost automático',
        'Caja con turnos, arqueo y reportes de cierre',
        'Reportes de ventas, productos más vendidos y métodos de pago',
        'Roles y permisos personalizados por usuario',
        'Comprobantes en PDF listos para imprimir',
        'Web y aplicativo de escritorio, con soporte en español'
      ]
    },
    {
      name: 'Empresarial', priceMonthly: null, priceYearly: null, featured: false, cta: 'Hablar con ventas',
      desc: 'Para negocios que necesitan atención dedicada y condiciones a medida.',
      features: [
        'Todo lo incluido en Profesional',
        'Soporte dedicado y prioritario',
        'Onboarding y capacitación personalizada',
        'Condiciones de facturación a medida'
      ]
    }
  ];

  planPrice(p: { priceMonthly: number | null; priceYearly: number | null }): string {
    if (p.priceMonthly == null) return 'Personalizado';
    const amount = this.billingCycle === 'monthly' ? p.priceMonthly : p.priceYearly!;
    return `S/ ${amount}`;
  }

  planPeriod(p: { priceMonthly: number | null }): string {
    if (p.priceMonthly == null) return '';
    return this.billingCycle === 'monthly' ? '/mes' : '/año';
  }
}
