import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { DialogModule } from 'primeng/dialog';

@Component({
  selector: 'app-pdf-preview-dialog',
  standalone: true,
  imports: [DialogModule],
  template: `
  <p-dialog [visible]="visible" (visibleChange)="onVisibleChange($event)" [modal]="true" [dismissableMask]="true" [style]="{ width: 'min(560px, 94vw)', height: '85vh' }" [contentStyle]="{ padding: 0, height: '100%' }">
    <ng-template pTemplate="header"><h2 class="pdf-preview-title">{{title}}</h2></ng-template>
    @if (safeUrl) { <embed [src]="safeUrl" type="application/pdf" class="pdf-preview-embed"> }
  </p-dialog>`,
  styles: [`
    .pdf-preview-title { margin: 0; font-size: 16px; }
    .pdf-preview-embed { width: 100%; height: 100%; border: 0; display: block; }
  `]
})
export class PdfPreviewDialogComponent {
  private sanitizer = inject(DomSanitizer);
  private _pdfUrl: string | null = null;
  safeUrl: SafeResourceUrl | null = null;

  @Input() visible = false;
  @Input() title = 'Vista previa';
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() closed = new EventEmitter<void>();

  @Input() set pdfUrl(value: string | null) {
    this._pdfUrl = value;
    this.safeUrl = value ? this.sanitizer.bypassSecurityTrustResourceUrl(value) : null;
  }
  get pdfUrl(): string | null { return this._pdfUrl; }

  onVisibleChange(value: boolean) {
    this.visible = value;
    this.visibleChange.emit(value);
    if (!value) this.closed.emit();
  }
}
