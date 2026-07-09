import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import '../core/electron-window';

@Component({
  selector: 'app-license-activation', standalone: true, imports: [FormsModule, MatIconModule],
  template: `
  <div class="login">
    <div class="login-logo">
      <img class="login-logo-img" src="/assets/brand/optiuso-logo.png" alt="OptiUso">
    </div>

    <div class="login-card">
      <h1>Activa tu Aplicativo de Escritorio</h1>
      <p class="login-sub">{{blockedMessage || 'Ingresa el codigo de licencia que recibiste al registrar tu empresa en OptiUso.'}}</p>

      <form (ngSubmit)="submit()">
        <label class="field">
          <span>Codigo de licencia</span>
          <input type="text" name="licenseKey" [(ngModel)]="licenseKey" placeholder="SVMX-XXXX-XXXX" autocomplete="off">
        </label>
        @if (error) { <p class="error">{{error}}</p> }
        <button type="submit" class="btn btn-primary" [disabled]="!licenseKey.trim() || loading">{{loading ? 'Validando...' : 'Activar'}}</button>
      </form>
    </div>
  </div>`,
  styles: [`
    .login { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 28px; background: var(--bg); padding: 24px; }

    .login-logo { display: flex; align-items: center; justify-content: center; text-decoration: none; }
    .login-logo-img { height: 90px; width: auto; }

    .login-card { width: min(400px, 100%); background: var(--surface); border: 1px solid var(--line); border-radius: 18px; box-shadow: var(--shadow); padding: 32px 28px; text-align: center; }
    .login-card h1 { font-size: 20px; margin-bottom: 6px; }
    .login-sub { font-size: 14px; color: var(--muted); margin: 0 0 24px; }

    form { display: flex; flex-direction: column; gap: 16px; text-align: left; }
    .field { display: flex; flex-direction: column; gap: 6px; font-size: 13px; font-weight: 600; color: var(--ink); }
    .field input { font: inherit; font-weight: 400; padding: 10px 12px; border: 1px solid var(--line); border-radius: 10px; background: var(--surface-2); color: var(--ink); text-transform: uppercase; }
    .field input:focus { outline: none; border-color: var(--primary); }

    .btn { display: inline-flex; align-items: center; justify-content: center; padding: 12px 18px; border-radius: 10px; font-size: 14px; font-weight: 700; text-decoration: none; cursor: pointer; border: none; }
    .btn-primary { background: var(--primary); color: #fff; }
    .btn-primary:hover:not(:disabled) { background: var(--primary-strong); }
    .btn-primary:disabled { opacity: .55; cursor: not-allowed; }

    .error { margin: 0; font-size: 13px; color: var(--warn); }
  `]
})
export class LicenseActivationComponent implements OnInit {
  router = inject(Router); cdr = inject(ChangeDetectorRef);
  licenseKey = ''; error = ''; loading = false; blockedMessage = '';

  async ngOnInit() {
    const status = await window.posChifa?.getLicenseStatus();
    if (status?.message && !status.valid) this.blockedMessage = status.message;
    this.cdr.detectChanges();
  }

  async submit() {
    if (!this.licenseKey.trim() || this.loading) return;
    this.loading = true; this.error = '';
    const result = await window.posChifa?.activateLicense(this.licenseKey.trim());
    this.loading = false;
    if (result?.valid) {
      this.router.navigateByUrl('/login');
    } else {
      this.error = result?.message || 'No se pudo activar la licencia.';
    }
    this.cdr.detectChanges();
  }
}
