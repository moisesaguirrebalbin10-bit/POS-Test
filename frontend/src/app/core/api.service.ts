import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private api = environment.apiUrl;
  private assetBase = environment.apiUrl.replace(/\/api\/?$/, '');

  get<T>(path: string, params: Record<string, any> = {}) {
    return this.http.get<T>(`${this.api}/${path}`, { params: new HttpParams({ fromObject: params }) });
  }

  getBlob(path: string, params: Record<string, any> = {}) {
    return this.http.get(`${this.api}/${path}`, { params: new HttpParams({ fromObject: params }), responseType: 'blob' });
  }

  post<T>(path: string, body: any) { return this.http.post<T>(`${this.api}/${path}`, body); }
  put<T>(path: string, body: any) { return this.http.put<T>(`${this.api}/${path}`, body); }
  patch<T>(path: string, body: any = {}) { return this.http.patch<T>(`${this.api}/${path}`, body); }

  upload<T>(path: string, file: File, field = 'image') {
    const form = new FormData();
    form.append(field, file);
    return this.http.post<T>(`${this.api}/${path}`, form);
  }

  assetUrl(path?: string) {
    if (!path) return `${this.assetBase}/assets/products/arroz-chaufa.png`;
    if (/^https?:\/\//i.test(path)) return path;
    return `${this.assetBase}/${path.replace(/^\//, '')}`;
  }

  delete<T>(path: string) { return this.http.delete<T>(`${this.api}/${path}`); }
}
