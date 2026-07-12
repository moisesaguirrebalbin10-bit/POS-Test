import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  api = environment.apiUrl;

  login(email: string, password: string, remember: boolean = true) {
    return this.http.post<{ token: string; user: any }>(`${this.api}/login`, { email, password }).pipe(tap(res => {
      this.persistSession(res.token, res.user, remember);
    }));
  }

  registerCompany(payload: { company_name: string; owner_name: string; email: string; password: string }) {
    return this.http.post<{ token: string; user: any }>(`${this.api}/register-company`, payload).pipe(tap(res => {
      this.persistSession(res.token, res.user, true);
    }));
  }

  // "Recordarme" decide si la sesion sobrevive al cerrar el navegador (localStorage)
  // o solo dura la pestana actual (sessionStorage); se limpia la otra para no dejar rastros.
  private persistSession(token: string, user: any, remember: boolean) {
    const store = remember ? localStorage : sessionStorage;
    const other = remember ? sessionStorage : localStorage;
    other.removeItem('token');
    other.removeItem('user');
    store.setItem('token', token);
    store.setItem('user', JSON.stringify(user));
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    this.router.navigateByUrl('/login');
  }

  token() { return localStorage.getItem('token') || sessionStorage.getItem('token'); }
  user() { return JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || 'null'); }
  isLoggedIn() { return !!this.token(); }

  // Acepta una sola clave o varias separadas por coma (igual que el middleware
  // "permission:a,b" del backend) para exigir cualquiera de ellas (logica OR).
  hasPermission(key: string): boolean {
    const user = this.user();
    const keys = key.split(',').map(k => k.trim()).filter(Boolean);
    return keys.some(k => user?.roles?.some((role: any) => role.permissions?.some((p: any) => p.key === k)));
  }

  // Primera vista a la que un usuario tiene acceso segun sus permisos, en el mismo
  // orden en que aparecen en el menu lateral (shell.component.ts). Evita mandar a
  // cuentas de un solo modulo (ej. Cocina) a un Dashboard que no pueden ver.
  defaultLandingRoute(): string {
    const candidates: { path: string; permission?: string }[] = [
      { path: '/app/dashboard', permission: 'dashboard.view' },
      { path: '/app/orders', permission: 'tables.manage' },
      { path: '/app/kitchen', permission: 'kitchen.view' },
      { path: '/app/tables', permission: 'tables.manage' },
      { path: '/app/pos', permission: 'sales.create' },
      { path: '/app/reservations', permission: 'reservations.manage' },
      { path: '/app/inventory', permission: 'inventory.manage' },
      { path: '/app/products', permission: 'products.view' },
      { path: '/app/sales', permission: 'sales.view' },
      { path: '/app/cash', permission: 'cash.view' },
      { path: '/app/reports', permission: 'reports.view' },
      { path: '/app/warehouses', permission: 'warehouses.view' },
      { path: '/app/users', permission: 'users.view' },
      { path: '/app/company', permission: 'settings.view' },
    ];
    const match = candidates.find(c => !c.permission || this.hasPermission(c.permission));
    // '/app/dashboard' no exige permiso a nivel de ruta (solo se oculta del menu),
    // asi que sirve de red de seguridad si un rol quedo sin ningun permiso asignado.
    return match?.path || '/app/dashboard';
  }

  // La sesion activa vive en localStorage (Recordarme) o sessionStorage; escribimos
  // siempre en la que realmente tiene el token para no dejar una copia obsoleta en la otra.
  updateUser(user: any) {
    const store = localStorage.getItem('token') ? localStorage : sessionStorage;
    store.setItem('user', JSON.stringify(user));
  }
}
