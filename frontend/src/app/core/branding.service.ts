import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class BrandingService {
  private api = inject(ApiService);
  private loaded = false;

  name = signal('OptiUso');
  slogan = signal('');
  logoPath = signal<string | null>(null);
  businessType = signal<'market' | 'restaurant'>('market');
  igvPercent = signal<number>(18);

  load() {
    if (this.loaded) return;
    this.loaded = true;
    this.api.get<any>('branding').subscribe({
      next: settings => {
        this.name.set(settings?.name || 'OptiUso');
        this.slogan.set(settings?.slogan || '');
        this.logoPath.set(settings?.logo_path || null);
        this.businessType.set(settings?.business_type === 'restaurant' ? 'restaurant' : 'market');
        this.igvPercent.set(Number(settings?.igv_percent ?? 18));
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
