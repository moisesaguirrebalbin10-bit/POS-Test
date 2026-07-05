import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AdminApiService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/admin`;

  get<T>(path: string, params: Record<string, any> = {}) {
    return this.http.get<T>(`${this.api}/${path}`, { params: new HttpParams({ fromObject: params }) });
  }

  post<T>(path: string, body: any) { return this.http.post<T>(`${this.api}/${path}`, body); }
  put<T>(path: string, body: any) { return this.http.put<T>(`${this.api}/${path}`, body); }
  delete<T>(path: string) { return this.http.delete<T>(`${this.api}/${path}`); }
}
