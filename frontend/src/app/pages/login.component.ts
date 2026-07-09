import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MessageService } from 'primeng/api';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-login', standalone: true, imports: [ReactiveFormsModule, FormsModule, RouterLink, MatIconModule],
  template: `
  <div class="login-page">
    <a class="login-brand" routerLink="/">
      <img class="login-brand-logo" src="/assets/brand/optiuso-logo.png" alt="OptiUso">
    </a>

    <div class="login-card">
      <h1>Bienvenido de nuevo</h1>
      <p class="login-sub">Ingresa tus credenciales para acceder al sistema</p>

      <form [formGroup]="form" (ngSubmit)="submit()">
        <label class="field">
          <span>Email</span>
          <span class="field-input">
            <mat-icon>mail</mat-icon>
            <input type="email" formControlName="email" autocomplete="email" placeholder="usuario@optiuso.com">
          </span>
        </label>
        <label class="field">
          <span>Contraseña</span>
          <span class="field-input">
            <mat-icon>lock</mat-icon>
            <input [type]="showPassword ? 'text' : 'password'" formControlName="password" autocomplete="current-password" placeholder="Tu contraseña">
            <button type="button" class="field-eye" (click)="showPassword = !showPassword" [attr.aria-label]="showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'">
              <mat-icon>{{showPassword ? 'visibility_off' : 'visibility'}}</mat-icon>
            </button>
          </span>
        </label>

        <div class="login-row">
          <label class="remember-check">
            <input type="checkbox" [(ngModel)]="remember" [ngModelOptions]="{standalone: true}">
            <span>Recordarme</span>
          </label>
          <button type="button" class="link-btn" (click)="forgotPassword()">¿Olvidé mi contraseña?</button>
        </div>

        @if (error) { <p class="error">{{error}}</p> }

        <button type="submit" class="btn btn-primary" [disabled]="form.invalid || loading">
          {{loading ? 'Ingresando...' : 'Ingresar'}}
          <mat-icon>login</mat-icon>
        </button>
      </form>

      <p class="login-alt">¿No tienes cuenta? <a routerLink="/register">Prueba gratis</a></p>

      <div class="login-divider"></div>
      <p class="login-help">¿Tienes problemas técnicos? <button type="button" class="link-btn" (click)="contactSupport()">Contactar a soporte</button></p>
    </div>

    <a class="back-home" routerLink="/"><mat-icon>arrow_back</mat-icon>Volver al Inicio</a>

    <footer class="login-footer">
      <p>&copy; {{currentYear}} OptiUso. Todos los derechos reservados.</p>
      <div class="login-footer-links"><a routerLink="/privacy">Privacidad</a><span class="dot">&middot;</span><span>Seguridad</span><span class="dot">&middot;</span><a routerLink="/terms">Términos</a></div>
    </footer>
  </div>`,
  styles: [`
    .login-page {
      min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 26px; padding: 32px 24px;
      background:
        radial-gradient(circle at 18% 14%, rgba(255,255,255,.07), transparent 40%),
        radial-gradient(circle at 82% 78%, rgba(255,255,255,.05), transparent 45%),
        linear-gradient(135deg, #0c1f1c 0%, #0f2e28 42%, #123a30 68%, #0a1917 100%);
    }

    .login-brand { display: flex; flex-direction: column; align-items: center; text-decoration: none; }
    .login-brand-logo { height: 110px; width: auto; }

    .login-card { width: min(400px, 100%); background: #fff; border-radius: 18px; box-shadow: 0 30px 70px rgba(0,0,0,.35); padding: 32px 28px; }
    .login-card h1 { font-size: 21px; margin-bottom: 6px; color: #14201e; }
    .login-sub { font-size: 13px; color: #64748b; margin: 0 0 22px; }

    form { display: flex; flex-direction: column; align-items: stretch; gap: 16px; }
    .field { display: flex; flex-direction: column; gap: 6px; font-size: 12.5px; font-weight: 700; color: #344054; }
    .field-input { display: flex; align-items: center; gap: 8px; padding: 0 12px; height: 44px; border: 1px solid #d9e2e7; border-radius: 10px; background: #fff; }
    .field-input:focus-within { border-color: #0f766e; box-shadow: 0 0 0 3px rgba(15,118,110,.12); }
    .field-input mat-icon { flex: none; font-size: 18px; width: 18px; height: 18px; color: #94a3b8; }
    .field-input input { flex: 1; min-width: 0; height: 100%; border: none; outline: none; background: transparent; font: inherit; font-weight: 400; font-size: 14px; line-height: 1; color: #14201e; }
    .field-input input:-webkit-autofill,
    .field-input input:-webkit-autofill:hover,
    .field-input input:-webkit-autofill:focus,
    .field-input input:-webkit-autofill:active {
      -webkit-text-fill-color: #14201e;
      -webkit-box-shadow: 0 0 0 1000px #fff inset;
      box-shadow: 0 0 0 1000px #fff inset;
      caret-color: #14201e;
      transition: background-color 9999s ease-in-out 0s;
    }
    .field-eye { flex: none; border: none; background: transparent; padding: 0; cursor: pointer; color: #94a3b8; display: flex; }
    .field-eye:hover { color: #475569; }
    .field-eye mat-icon { font-size: 18px; width: 18px; height: 18px; }

    .login-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: -4px; }
    .remember-check { display: flex; align-items: center; gap: 7px; font-size: 12.5px; font-weight: 600; color: #475569; cursor: pointer; }
    .remember-check input { width: 15px; height: 15px; accent-color: #0f766e; cursor: pointer; }
    .link-btn { border: none; background: transparent; padding: 0; font-size: 12.5px; font-weight: 700; color: #0f766e; cursor: pointer; text-decoration: none; }
    .link-btn:hover { text-decoration: underline; }

    .btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 12px 18px; border-radius: 10px; font-size: 14px; font-weight: 700; text-decoration: none; cursor: pointer; border: none; }
    .btn-primary { background: #0b5f59; color: #fff; }
    .btn-primary mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .btn-primary:hover:not(:disabled) { background: #0f766e; }
    .btn-primary:disabled { opacity: .55; cursor: not-allowed; }

    .error { margin: 0; font-size: 12.5px; color: #b42318; }
    .login-alt { font-size: 12.5px; color: #64748b; margin: 18px 0 0; text-align: center; }
    .login-alt a { color: #0f766e; font-weight: 700; text-decoration: none; }
    .login-alt a:hover { text-decoration: underline; }

    .login-divider { height: 1px; background: #edf2f4; margin: 18px 0 14px; }
    .login-help { margin: 0; font-size: 12px; color: #64748b; text-align: center; }
    .login-help .link-btn { font-size: 12px; }

    .back-home { display: inline-flex; align-items: center; gap: 6px; color: rgba(255,255,255,.82); font-size: 13px; font-weight: 700; text-decoration: none; }
    .back-home mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .back-home:hover { color: #fff; }

    .login-footer { display: flex; flex-direction: column; align-items: center; gap: 6px; text-align: center; }
    .login-footer p { margin: 0; font-size: 12px; font-weight: 700; color: rgba(255,255,255,.78); }
    .login-footer-links { display: flex; align-items: center; gap: 8px; font-size: 11.5px; color: rgba(255,255,255,.5); }
    .login-footer-links .dot { color: rgba(255,255,255,.35); }
    .login-footer-links a { color: inherit; text-decoration: none; }
    .login-footer-links a:hover { color: #fff; text-decoration: underline; }
  `]
})
export class LoginComponent {
  fb = inject(FormBuilder); auth = inject(AuthService); router = inject(Router); cdr = inject(ChangeDetectorRef); messages = inject(MessageService);
  error = ''; loading = false; showPassword = false; remember = true;
  currentYear = new Date().getFullYear();
  form = this.fb.group({ email: ['', [Validators.required, Validators.email]], password: ['', Validators.required] });

  submit() {
    if (this.form.invalid || this.loading) return;
    this.loading = true; this.error = '';
    this.auth.login(this.form.value.email!, this.form.value.password!, this.remember).subscribe({
      next: () => this.router.navigateByUrl('/app/dashboard'),
      error: e => { this.loading = false; this.error = e.error?.message || 'No se pudo iniciar sesion'; this.cdr.detectChanges(); }
    });
  }

  forgotPassword() {
    this.messages.add({ severity: 'info', summary: 'Recuperar acceso', detail: 'Pide al administrador de tu empresa que restablezca tu contraseña desde el modulo de Usuarios.' });
  }

  contactSupport() {
    this.messages.add({ severity: 'info', summary: 'Soporte', detail: 'Comunicate con el administrador de tu cuenta OptiUso para recibir ayuda tecnica.' });
  }
}
