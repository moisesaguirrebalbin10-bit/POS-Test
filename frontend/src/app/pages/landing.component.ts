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
          <span class="landing-logo-mark"><mat-icon>bolt</mat-icon></span>
          <span class="landing-logo-text">ServiMax</span>
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
      <div class="landing-hero-inner">
        <div class="landing-hero-copy">
          <span class="landing-eyebrow">Software POS para restaurantes</span>
          <h1>Vende, controla tu caja e inventario desde un solo sistema</h1>
          <p>ServiMax es el punto de venta pensado para chifas y restaurantes: registra ventas en segundos, controla tu caja diaria y tu inventario, y genera comprobantes en PDF listos para imprimir.</p>
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
        <div class="landing-hero-visual">
          <div class="mockup-card">
            <div class="mockup-topbar"><span></span><span></span><span></span></div>
            <div class="mockup-title">Resumen de hoy</div>
            <div class="mockup-stats">
              <div class="mockup-stat"><span class="mockup-stat-label">Ventas</span><span class="mockup-stat-value">S/ 1,248.50</span></div>
              <div class="mockup-stat"><span class="mockup-stat-label">Pedidos</span><span class="mockup-stat-value">86</span></div>
              <div class="mockup-stat"><span class="mockup-stat-label">Ticket prom.</span><span class="mockup-stat-value">S/ 14.50</span></div>
            </div>
            <div class="mockup-list">
              <div class="mockup-row"><span>Arroz chaufa especial</span><span>S/ 18.00</span></div>
              <div class="mockup-row"><span>Wantán frito</span><span>S/ 12.00</span></div>
              <div class="mockup-row"><span>Inka Kola 1L</span><span>S/ 8.00</span></div>
            </div>
          </div>
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
      <p class="landing-section-sub">Empieza gratis y crece cuando lo necesites.</p>
      <div class="landing-plans">
        @for (p of plans; track p.name) {
          <div class="plan-card" [class.featured]="p.featured">
            @if (p.featured) { <span class="plan-badge">Más popular</span> }
            <h3>{{p.name}}</h3>
            <div class="plan-price"><span class="plan-amount">{{p.price}}</span><span class="plan-period">{{p.period}}</span></div>
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
      <p>Únete a los restaurantes que ya gestionan sus ventas con ServiMax.</p>
      <a routerLink="/register" class="btn btn-primary btn-lg">Comenzar ahora</a>
    </section>

    <footer class="landing-footer">
      <div class="landing-footer-inner">
        <div class="landing-footer-brand">
          <div class="landing-logo">
            <span class="landing-logo-mark"><mat-icon>bolt</mat-icon></span>
            <span class="landing-logo-text">ServiMax</span>
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
      <div class="landing-footer-bottom">© {{year}} ServiMax. Todos los derechos reservados.</div>
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
    .landing-logo { display: flex; align-items: center; gap: 8px; text-decoration: none; }
    .landing-logo-mark { width: 34px; height: 34px; border-radius: 9px; background: var(--primary); color: #fff; display: flex; align-items: center; justify-content: center; flex: none; }
    .landing-logo-mark mat-icon { font-size: 20px; width: 20px; height: 20px; }
    .landing-logo-text { font-size: 19px; font-weight: 800; color: var(--ink); letter-spacing: -.02em; }
    .landing-nav-links { display: flex; gap: 22px; margin-left: 12px; flex: 1; }
    .landing-nav-links a { color: var(--muted); text-decoration: none; font-size: 14px; font-weight: 600; }
    .landing-nav-links a:hover { color: var(--ink); }
    .landing-nav-actions { display: flex; gap: 10px; align-items: center; }

    .landing-hero-inner { max-width: 1180px; margin: 0 auto; padding: 64px 24px 80px; display: grid; grid-template-columns: 1.05fr .95fr; gap: 48px; align-items: center; }
    .landing-eyebrow { display: inline-block; font-size: 13px; font-weight: 700; color: var(--primary-strong); background: color-mix(in srgb, var(--primary) 12%, transparent); padding: 6px 12px; border-radius: 999px; margin-bottom: 18px; }
    .landing-hero-copy h1 { font-size: 42px; line-height: 1.12; letter-spacing: -.02em; margin-bottom: 18px; }
    .landing-hero-copy p { font-size: 16px; line-height: 1.6; color: var(--muted); max-width: 520px; margin-bottom: 26px; }
    .landing-hero-actions { display: flex; gap: 12px; margin-bottom: 28px; flex-wrap: wrap; }
    .landing-trust { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
    .landing-trust li { display: flex; align-items: center; gap: 8px; font-size: 14px; color: var(--muted); }
    .landing-trust mat-icon { font-size: 18px; width: 18px; height: 18px; color: var(--primary); }

    .landing-hero-visual { display: flex; justify-content: center; }
    .mockup-card { width: 100%; max-width: 380px; background: var(--surface); border: 1px solid var(--line); border-radius: 18px; box-shadow: var(--shadow); padding: 18px; }
    .mockup-topbar { display: flex; gap: 6px; margin-bottom: 14px; }
    .mockup-topbar span { width: 9px; height: 9px; border-radius: 50%; background: var(--line); }
    .mockup-title { font-size: 13px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: .04em; margin-bottom: 12px; }
    .mockup-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 16px; }
    .mockup-stat { background: var(--surface-2); border: 1px solid var(--soft-line); border-radius: 10px; padding: 10px 8px; display: flex; flex-direction: column; gap: 4px; }
    .mockup-stat-label { font-size: 11px; color: var(--muted); }
    .mockup-stat-value { font-size: 14px; font-weight: 700; color: var(--ink); }
    .mockup-list { display: flex; flex-direction: column; gap: 8px; border-top: 1px dashed var(--line); padding-top: 12px; }
    .mockup-row { display: flex; justify-content: space-between; font-size: 13px; color: var(--ink); }
    .mockup-row span:last-child { font-weight: 700; color: var(--primary-strong); }

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
    .landing-plans { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; align-items: stretch; }
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
      .landing-hero-inner { grid-template-columns: 1fr; padding-top: 40px; }
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

  plans = [
    { name: 'Básico', price: 'S/ 49', period: '/mes', desc: 'Para un negocio con un solo punto de venta.', featured: false, cta: 'Comenzar gratis', features: ['1 punto de venta', 'Hasta 2 usuarios', 'Reportes básicos', 'Soporte por correo'] },
    { name: 'Profesional', price: 'S/ 89', period: '/mes', desc: 'Para restaurantes que quieren crecer sin límites.', featured: true, cta: 'Elegir plan', features: ['Puntos de venta ilimitados', 'Usuarios ilimitados', 'Reportes y tendencias avanzadas', 'Comprobantes en PDF personalizados', 'Soporte prioritario'] },
    { name: 'Empresarial', price: 'Personalizado', period: '', desc: 'Para cadenas con varios locales.', featured: false, cta: 'Hablar con ventas', features: ['Todo lo de Profesional', 'Múltiples locales', 'Integraciones a medida', 'Soporte dedicado'] }
  ];
}
