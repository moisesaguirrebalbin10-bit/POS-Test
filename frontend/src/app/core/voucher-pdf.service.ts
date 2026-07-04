import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService } from './api.service';

export type VoucherCopy = 'customer' | 'local';

@Injectable({ providedIn: 'root' })
export class VoucherPdfService {
  private api = inject(ApiService);

  generate(saleId: number, copy: VoucherCopy) {
    return firstValueFrom(this.api.post<{ path: string }>(`sales/${saleId}/voucher-pdf`, { copy }));
  }

  async fetchObjectUrl(saleId: number, copy: VoucherCopy) {
    const blob = await firstValueFrom(this.api.getBlob(`sales/${saleId}/voucher-pdf`, { copy }));
    return URL.createObjectURL(blob);
  }

  async generateAndOpen(saleId: number, copy: VoucherCopy) {
    await this.generate(saleId, copy);
    return this.fetchObjectUrl(saleId, copy);
  }
}
