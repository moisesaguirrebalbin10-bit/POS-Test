import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MessageService } from 'primeng/api';
import { AdminAuthService } from '../core/admin-auth.service';

@Component({
  selector: 'app-admin-login', standalone: true, imports: [ReactiveFormsModule, FormsModule, RouterLink, MatIconModule],
  template: `
  <div class="admin-login-page">
    <div class="login-card">
      <span class="login-badge"><mat-icon>admin_panel_settings</mat-icon></span>
      <h1>Panel Administrativo</h1>
      <p class="login-sub">Acceso exclusivo para el equipo de OptiUso</p>

      <form [formGroup]="form" (ngSubmit)="submit()">
        <label class="field">
          <span>Email</span>
          <input class="plain-input" type="email" formControlName="email" autocomplete="email" placeholder="admin@optiuso.com">
        </label>
        <label class="field">
          <span class="field-label-row"><span>Contraseña</span><button type="button" class="link-btn" (click)="forgotPassword()">¿Olvidó su clave?</button></span>
          <span class="field-input">
            <input [type]="showPassword ? 'text' : 'password'" formControlName="password" autocomplete="current-password" placeholder="••••••••">
            <button type="button" class="field-eye" (click)="showPassword = !showPassword" [attr.aria-label]="showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'">
              <mat-icon>{{showPassword ? 'visibility_off' : 'visibility'}}</mat-icon>
            </button>
          </span>
        </label>

        <label class="remember-check">
          <input type="checkbox" [(ngModel)]="remember" [ngModelOptions]="{standalone: true}">
          <span>Mantener sesión iniciada</span>
        </label>

        @if (error) { <p class="error">{{error}}</p> }

        <button type="submit" class="btn btn-primary" [disabled]="form.invalid || loading">
          <mat-icon>login</mat-icon>
          {{loading ? 'INGRESANDO...' : 'INGRESAR'}}
        </button>
      </form>
    </div>

    <a class="back-home" routerLink="/"><mat-icon>arrow_back</mat-icon>Volver al inicio</a>

    <footer class="login-footer"><p>&copy; {{currentYear}} OptiUso. Todos los derechos reservados.</p></footer>
  </div>`,
  styles: [`
    .admin-login-page { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 22px; background: var(--bg); padding: 24px; }

    .login-card { width: min(380px, 100%); background: var(--surface); border: 1px solid var(--line); border-radius: 18px; box-shadow: var(--shadow); padding: 32px 28px; text-align: center; }
    .login-badge { display: inline-flex; align-items: center; justify-content: center; width: 52px; height: 52px; border-radius: 14px; background: var(--surface-2); color: var(--ink); margin-bottom: 16px; }
    .login-badge mat-icon { font-size: 24px; width: 24px; height: 24px; }
    .login-card h1 { font-size: 20px; margin-bottom: 6px; }
    .login-sub { font-size: 13px; color: #4a5578; margin: 0 0 24px; font-weight: 600; }

    form { display: flex; flex-direction: column; align-items: stretch; gap: 16px; text-align: left; }
    .field { display: flex; flex-direction: column; gap: 6px; font-size: 13px; font-weight: 700; color: var(--ink); }
    .field-label-row { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
    .link-btn { border: none; background: transparent; padding: 0; font-size: 12px; font-weight: 700; color: #2563eb; cursor: pointer; }
    .link-btn:hover { text-decoration: underline; }

    .plain-input, .field-input { height: 44px; border: 1px solid var(--line); border-radius: 10px; background: var(--surface); box-sizing: border-box; }
    .plain-input { width: 100%; padding: 0 14px; font-size: 14px; color: var(--ink); font-weight: 400; }
    .plain-input:focus { outline: none; border-color: var(--ink); }
    .plain-input::placeholder { color: #9aa5b1; }

    .field-input { display: flex; align-items: center; gap: 8px; padding: 0 12px; }
    .field-input:focus-within { border-color: var(--ink); }
    .field-input input { flex: 1; min-width: 0; height: 100%; border: none; outline: none; background: transparent; font: inherit; font-weight: 400; font-size: 14px; line-height: 1; color: var(--ink); }
    .field-input input::placeholder { color: #9aa5b1; }
    .field-input input:-webkit-autofill,
    .field-input input:-webkit-autofill:hover,
    .field-input input:-webkit-autofill:focus,
    .field-input input:-webkit-autofill:active {
      -webkit-text-fill-color: var(--ink);
      -webkit-box-shadow: 0 0 0 1000px var(--surface) inset;
      box-shadow: 0 0 0 1000px var(--surface) inset;
      transition: background-color 9999s ease-in-out 0s;
    }
    .field-eye { flex: none; border: none; background: transparent; padding: 0; cursor: pointer; color: #94a3b8; display: flex; }
    .field-eye:hover { color: #475569; }
    .field-eye mat-icon { font-size: 18px; width: 18px; height: 18px; }

    .remember-check { display: flex; align-items: center; gap: 8px; font-size: 12.5px; font-weight: 600; color: var(--muted); cursor: pointer; }
    .remember-check input { width: 15px; height: 15px; accent-color: var(--ink); cursor: pointer; }

    .btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 12px 18px; border-radius: 10px; font-size: 13.5px; font-weight: 800; letter-spacing: .03em; text-decoration: none; cursor: pointer; border: none; }
    .btn-primary { background: var(--ink); color: #fff; }
    .btn-primary mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .btn-primary:hover:not(:disabled) { opacity: .9; }
    .btn-primary:disabled { opacity: .5; cursor: not-allowed; }

    .error { margin: 0; font-size: 13px; color: var(--warn); }

    .back-home { display: inline-flex; align-items: center; gap: 6px; color: #b45309; font-size: 13px; font-weight: 700; text-decoration: none; }
    .back-home mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .back-home:hover { text-decoration: underline; }

    .login-footer p { margin: 0; font-size: 12px; font-weight: 600; color: var(--muted); }
  `]
})
export class AdminLoginComponent {
  fb = inject(FormBuilder); auth = inject(AdminAuthService); router = inject(Router); cdr = inject(ChangeDetectorRef); messages = inject(MessageService);
  error = ''; loading = false; showPassword = false; remember = true;
  currentYear = new Date().getFullYear();
  form = this.fb.group({ email: ['', [Validators.required, Validators.email]], password: ['', Validators.required] });

  submit() {
    if (this.form.invalid || this.loading) return;
    this.loading = true; this.error = '';
    this.auth.login(this.form.value.email!, this.form.value.password!, this.remember).subscribe({
      next: () => this.router.navigateByUrl('/admin/dashboard'),
      error: e => { this.loading = false; this.error = e.error?.message || 'No se pudo iniciar sesion'; this.cdr.detectChanges(); }
    });
  }

  forgotPassword() {
    this.messages.add({ severity: 'info', summary: 'Recuperar acceso', detail: 'Pide a otro Super Admin de OptiUso que restablezca tu contraseña desde el modulo de Staff.' });
  }
}
