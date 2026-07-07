import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-register', standalone: true, imports: [ReactiveFormsModule, FormsModule, RouterLink, MatIconModule],
  template: `
  <div class="login-page">
    <a class="login-brand" routerLink="/">
      <span class="login-brand-mark"><mat-icon>bolt</mat-icon></span>
      <span class="login-brand-text">ServiMax</span>
    </a>

    <div class="login-card">
      <h1>Crea tu cuenta</h1>
      <p class="login-sub">Comienza a optimizar tus operaciones culinarias hoy mismo.</p>

      <form [formGroup]="form" (ngSubmit)="submit()">
        <label class="field">
          <span class="field-label"><mat-icon>store</mat-icon>Nombre del Negocio</span>
          <input class="plain-input" type="text" formControlName="company_name" autocomplete="organization" placeholder="Ej: Restaurante El Gourmet">
        </label>
        <label class="field">
          <span class="field-label"><mat-icon>person</mat-icon>Tu Nombre</span>
          <input class="plain-input" type="text" formControlName="owner_name" autocomplete="name" placeholder="Nombre completo">
        </label>
        <label class="field">
          <span class="field-label"><mat-icon>mail</mat-icon>Email</span>
          <input class="plain-input" type="email" formControlName="email" autocomplete="email" placeholder="usuario@servimax.com">
        </label>
        <label class="field">
          <span class="field-label"><mat-icon>lock</mat-icon>Contraseña</span>
          <span class="field-input">
            <input [type]="showPassword ? 'text' : 'password'" formControlName="password" autocomplete="new-password" placeholder="Mínimo 8 caracteres">
            <button type="button" class="field-eye" (click)="showPassword = !showPassword" [attr.aria-label]="showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'">
              <mat-icon>{{showPassword ? 'visibility_off' : 'visibility'}}</mat-icon>
            </button>
          </span>
        </label>

        <label class="terms-check">
          <input type="checkbox" [(ngModel)]="acceptedTerms" [ngModelOptions]="{standalone: true}">
          <span>Acepto los <b>Términos de Servicio</b> y la <b>Política de Privacidad</b> de ServiMax.</span>
        </label>

        @if (error) { <p class="error">{{error}}</p> }

        <button type="submit" class="btn btn-primary" [disabled]="form.invalid || !acceptedTerms || loading">
          {{loading ? 'Creando cuenta...' : 'Crear cuenta gratis'}}
          <mat-icon>arrow_forward</mat-icon>
        </button>
      </form>

      <p class="login-alt">¿Ya tienes cuenta? <a routerLink="/login">Inicia sesión</a></p>
    </div>

    <a class="back-home" routerLink="/"><mat-icon>arrow_back</mat-icon>Volver al Inicio</a>

    <footer class="login-footer">
      <p>&copy; {{currentYear}} ServiMax. Todos los derechos reservados.</p>
      <div class="login-footer-links"><span>Privacidad</span><span class="dot">&middot;</span><span>Seguridad</span><span class="dot">&middot;</span><span>Términos</span></div>
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

    .login-brand { display: flex; flex-direction: column; align-items: center; gap: 10px; text-decoration: none; }
    .login-brand-mark { width: 46px; height: 46px; border-radius: 12px; background: #14b8a6; color: #06201b; display: flex; align-items: center; justify-content: center; flex: none; box-shadow: 0 12px 30px rgba(20,184,166,.35); }
    .login-brand-mark mat-icon { font-size: 24px; width: 24px; height: 24px; }
    .login-brand-text { font-size: 19px; font-weight: 800; color: #fff; letter-spacing: -.01em; }

    .login-card { width: min(420px, 100%); background: #f4f6f5; border-radius: 18px; box-shadow: 0 30px 70px rgba(0,0,0,.35); padding: 30px 28px; }
    .login-card h1 { font-size: 21px; margin-bottom: 6px; color: #14201e; }
    .login-sub { font-size: 13px; color: #64748b; margin: 0 0 20px; }

    form { display: flex; flex-direction: column; align-items: stretch; gap: 14px; }
    .field { display: flex; flex-direction: column; gap: 6px; }
    .field-label { display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: .04em; color: #475569; }
    .field-label mat-icon { font-size: 14px; width: 14px; height: 14px; color: #64748b; }

    .plain-input, .field-input { height: 44px; border: 1px solid #d9e2e7; border-radius: 10px; background: #fff; box-sizing: border-box; }
    .plain-input { width: 100%; padding: 0 14px; font-size: 14px; color: #14201e; }
    .plain-input:focus { outline: none; border-color: #0f766e; box-shadow: 0 0 0 3px rgba(15,118,110,.12); }
    .plain-input::placeholder { color: #9aa5b1; }

    .field-input { display: flex; align-items: center; gap: 8px; padding: 0 12px; }
    .field-input:focus-within { border-color: #0f766e; box-shadow: 0 0 0 3px rgba(15,118,110,.12); }
    .field-input input { flex: 1; min-width: 0; height: 100%; border: none; outline: none; background: transparent; font: inherit; font-weight: 400; font-size: 14px; line-height: 1; color: #14201e; }
    .field-input input::placeholder { color: #9aa5b1; }
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

    .terms-check { display: flex; align-items: flex-start; gap: 8px; font-size: 12px; color: #475569; line-height: 1.5; cursor: pointer; margin-top: 2px; }
    .terms-check input { width: 15px; height: 15px; flex: none; margin-top: 2px; accent-color: #0f766e; cursor: pointer; }
    .terms-check b { color: #0f766e; font-weight: 700; }

    .btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 12px 18px; border-radius: 10px; font-size: 14px; font-weight: 700; text-decoration: none; cursor: pointer; border: none; }
    .btn-primary { background: #0b5f59; color: #fff; margin-top: 4px; }
    .btn-primary mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .btn-primary:hover:not(:disabled) { background: #0f766e; }
    .btn-primary:disabled { opacity: .55; cursor: not-allowed; }

    .error { margin: 0; font-size: 12.5px; color: #b42318; }
    .login-alt { font-size: 12.5px; color: #64748b; margin: 18px 0 0; text-align: center; }
    .login-alt a { color: #0f766e; font-weight: 700; text-decoration: none; }
    .login-alt a:hover { text-decoration: underline; }

    .back-home { display: inline-flex; align-items: center; gap: 6px; color: rgba(255,255,255,.82); font-size: 13px; font-weight: 700; text-decoration: none; }
    .back-home mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .back-home:hover { color: #fff; }

    .login-footer { display: flex; flex-direction: column; align-items: center; gap: 6px; text-align: center; }
    .login-footer p { margin: 0; font-size: 12px; font-weight: 700; color: rgba(255,255,255,.78); }
    .login-footer-links { display: flex; align-items: center; gap: 8px; font-size: 11.5px; color: rgba(255,255,255,.5); }
    .login-footer-links .dot { color: rgba(255,255,255,.35); }
  `]
})
export class RegisterComponent {
  fb = inject(FormBuilder); auth = inject(AuthService); router = inject(Router); cdr = inject(ChangeDetectorRef);
  error = ''; loading = false; showPassword = false; acceptedTerms = false;
  currentYear = new Date().getFullYear();
  form = this.fb.group({
    company_name: ['', Validators.required],
    owner_name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  submit() {
    if (this.form.invalid || !this.acceptedTerms || this.loading) return;
    this.loading = true;
    this.auth.registerCompany(this.form.value as any).subscribe({
      next: () => this.router.navigateByUrl('/app/dashboard'),
      error: e => { this.error = e.error?.message || 'No se pudo crear la cuenta.'; this.loading = false; this.cdr.detectChanges(); }
    });
  }
}
