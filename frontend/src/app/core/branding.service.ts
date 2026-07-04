import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class BrandingService {
  private api = inject(ApiService);
  private loaded = false;

  name = signal('POS Chifa');
  slogan = signal('');
  logoPath = signal<string | null>(null);

  load() {
    if (this.loaded) return;
    this.loaded = true;
    this.api.get<any>('branding').subscribe({
      next: settings => {
        this.name.set(settings?.name || 'POS Chifa');
        this.slogan.set(settings?.slogan || '');
        this.logoPath.set(settings?.logo_path || null);
      },
      error: () => { this.loaded = false; }
    });
  }

  refresh() { this.loaded = false; this.load(); }

  logoUrl(): string | null {
    const path = this.logoPath();
    return path ? this.api.assetUrl(path) : null;
  }
}
