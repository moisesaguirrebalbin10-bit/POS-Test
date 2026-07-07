import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AdminAuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  api = environment.apiUrl;

  login(email: string, password: string, remember: boolean = true) {
    return this.http.post<{ token: string; admin: any }>(`${this.api}/admin/login`, { email, password }).pipe(tap(res => {
      const store = remember ? localStorage : sessionStorage;
      const other = remember ? sessionStorage : localStorage;
      other.removeItem('admin_token');
      other.removeItem('admin_user');
      store.setItem('admin_token', res.token);
      store.setItem('admin_user', JSON.stringify(res.admin));
    }));
  }

  logout() {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    sessionStorage.removeItem('admin_token');
    sessionStorage.removeItem('admin_user');
    this.router.navigateByUrl('/admin/login');
  }

  token() { return localStorage.getItem('admin_token') || sessionStorage.getItem('admin_token'); }
  admin() { return JSON.parse(localStorage.getItem('admin_user') || sessionStorage.getItem('admin_user') || 'null'); }
  isLoggedIn() { return !!this.token(); }
  hasPermission(key: string): boolean {
    return !!this.admin()?.roles?.some((role: any) => role.permissions?.some((p: any) => p.key === key));
  }
}
