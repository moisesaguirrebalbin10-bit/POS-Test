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

  login(email: string, password: string) {
    return this.http.post<{ token: string; user: any }>(`${this.api}/login`, { email, password }).pipe(tap(res => {
      localStorage.setItem('token', res.token);
      localStorage.setItem('user', JSON.stringify(res.user));
    }));
  }

  registerCompany(payload: { company_name: string; owner_name: string; email: string; password: string }) {
    return this.http.post<{ token: string; user: any }>(`${this.api}/register-company`, payload).pipe(tap(res => {
      localStorage.setItem('token', res.token);
      localStorage.setItem('user', JSON.stringify(res.user));
    }));
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.router.navigateByUrl('/login');
  }

  token() { return localStorage.getItem('token'); }
  user() { return JSON.parse(localStorage.getItem('user') || 'null'); }
  isLoggedIn() { return !!this.token(); }
}
