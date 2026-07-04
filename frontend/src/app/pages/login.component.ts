import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../core/auth.service';
import { BrandingService } from '../core/branding.service';

@Component({ selector: 'app-login', standalone: true, imports: [ReactiveFormsModule, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule], template: `
<section class="login"><mat-card><div class="login-brand"><div class="brand-box"><div class="brand-logo">@if (branding.logoUrl()) { <img [src]="branding.logoUrl()" alt="Logo" class="brand-logo-img"> } @else { <mat-icon>storefront</mat-icon> }</div><div class="brand-text"><h1>{{branding.name()}}</h1>@if (branding.slogan()) { <small>{{branding.slogan()}}</small> }</div></div></div><form [formGroup]="form" (ngSubmit)="submit()"><mat-form-field><mat-label>Email</mat-label><input matInput formControlName="email"></mat-form-field><mat-form-field><mat-label>Password</mat-label><input matInput type="password" formControlName="password"></mat-form-field><button mat-flat-button color="primary" [disabled]="form.invalid">Ingresar</button><p class="error">{{error}}</p></form></mat-card></section>` })
export class LoginComponent {
  fb = inject(FormBuilder); auth = inject(AuthService); router = inject(Router); branding = inject(BrandingService); cdr = inject(ChangeDetectorRef); error = '';
  form = this.fb.group({ email: ['admin@poschifa.local', [Validators.required, Validators.email]], password: ['Admin12345', Validators.required] });

  constructor() { this.branding.load(); }
  submit() { if (this.form.invalid) return; this.auth.login(this.form.value.email!, this.form.value.password!).subscribe({ next: () => this.router.navigateByUrl('/dashboard'), error: e => { this.error = e.error?.message || 'No se pudo iniciar sesion'; this.cdr.detectChanges(); } }); }
}
