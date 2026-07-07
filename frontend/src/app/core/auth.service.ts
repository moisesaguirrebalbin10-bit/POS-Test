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

  // La sesion activa vive en localStorage (Recordarme) o sessionStorage; escribimos
  // siempre en la que realmente tiene el token para no dejar una copia obsoleta en la otra.
  updateUser(user: any) {
    const store = localStorage.getItem('token') ? localStorage : sessionStorage;
    store.setItem('user', JSON.stringify(user));
  }
}
