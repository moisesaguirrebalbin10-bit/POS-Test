import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-register', standalone: true, imports: [ReactiveFormsModule, RouterLink, MatIconModule],
  template: `
  <div class="login">
    <a class="login-logo" routerLink="/">
      <span class="login-logo-mark"><mat-icon>bolt</mat-icon></span>
      <span class="login-logo-text">ServiMax</span>
    </a>

    <div class="login-card">
      <h1>Crea tu cuenta</h1>
      <p class="login-sub">Empieza tu prueba gratuita de 14 dias, sin tarjeta</p>

      <form [formGroup]="form" (ngSubmit)="submit()">
        <label class="field">
          <span>Nombre del negocio</span>
          <input type="text" formControlName="company_name" autocomplete="organization">
        </label>
        <label class="field">
          <span>Tu nombre</span>
          <input type="text" formControlName="owner_name" autocomplete="name">
        </label>
        <label class="field">
          <span>Email</span>
          <input type="email" formControlName="email" autocomplete="email">
        </label>
        <label class="field">
          <span>Contraseña</span>
          <input type="password" formControlName="password" autocomplete="new-password">
        </label>
        @if (error) { <p class="error">{{error}}</p> }
        <button type="submit" class="btn btn-primary" [disabled]="form.invalid || loading">Crear cuenta gratis</button>
      </form>

      <p class="login-alt">¿Ya tienes cuenta? <a routerLink="/login">Inicia sesión</a></p>
    </div>

    <a class="login-back" routerLink="/">← Volver al inicio</a>
  </div>`,
  styles: [`
    .login { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 28px; background: var(--bg); padding: 24px; }

    .login-logo { display: flex; align-items: center; gap: 8px; text-decoration: none; }
    .login-logo-mark { width: 38px; height: 38px; border-radius: 10px; background: var(--primary); color: #fff; display: flex; align-items: center; justify-content: center; flex: none; }
    .login-logo-mark mat-icon { font-size: 20px; width: 20px; height: 20px; }
    .login-logo-text { font-size: 21px; font-weight: 800; color: var(--ink); letter-spacing: -.02em; }

    .login-card { width: min(400px, 100%); background: var(--surface); border: 1px solid var(--line); border-radius: 18px; box-shadow: var(--shadow); padding: 32px 28px; text-align: center; }
    .login-card h1 { font-size: 22px; margin-bottom: 6px; }
    .login-sub { font-size: 14px; color: var(--muted); margin: 0 0 24px; }

    form { display: flex; flex-direction: column; gap: 16px; text-align: left; }
    .field { display: flex; flex-direction: column; gap: 6px; font-size: 13px; font-weight: 600; color: var(--ink); }
    .field input { font: inherit; font-weight: 400; padding: 10px 12px; border: 1px solid var(--line); border-radius: 10px; background: var(--surface-2); color: var(--ink); }
    .field input:focus { outline: none; border-color: var(--primary); }

    .btn { display: inline-flex; align-items: center; justify-content: center; padding: 12px 18px; border-radius: 10px; font-size: 14px; font-weight: 700; text-decoration: none; cursor: pointer; border: none; }
    .btn-primary { background: var(--primary); color: #fff; }
    .btn-primary:hover:not(:disabled) { background: var(--primary-strong); }
    .btn-primary:disabled { opacity: .55; cursor: not-allowed; }

    .error { margin: 0; font-size: 13px; color: var(--warn); }
    .login-alt { font-size: 13px; color: var(--muted); margin: 18px 0 0; }
    .login-alt a { color: var(--primary-strong); font-weight: 600; text-decoration: none; }
    .login-back { font-size: 13px; color: var(--muted); text-decoration: none; }
    .login-back:hover { color: var(--ink); }
  `]
})
export class RegisterComponent {
  fb = inject(FormBuilder); auth = inject(AuthService); router = inject(Router); cdr = inject(ChangeDetectorRef);
  error = ''; loading = false;
  form = this.fb.group({
    company_name: ['', Validators.required],
    owner_name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  submit() {
    if (this.form.invalid) return;
    this.loading = true;
    this.auth.registerCompany(this.form.value as any).subscribe({
      next: () => this.router.navigateByUrl('/app/dashboard'),
      error: e => { this.error = e.error?.message || 'No se pudo crear la cuenta.'; this.loading = false; this.cdr.detectChanges(); }
    });
  }
}
