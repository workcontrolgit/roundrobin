import { Component, Inject, OnInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import * as QRCode from 'qrcode';

@Component({
  selector: 'app-share-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule],
  templateUrl: './share-dialog.html',
})
export class ShareDialog implements OnInit {
  @ViewChild('qrCanvas', { static: true }) qrCanvas!: ElementRef<HTMLCanvasElement>;

  copied = false;

  constructor(@Inject(MAT_DIALOG_DATA) public data: { url: string }) {}

  async ngOnInit(): Promise<void> {
    await QRCode.toCanvas(this.qrCanvas.nativeElement, this.data.url, {
      width: 256,
      color: { dark: '#52b788', light: '#1e1e2e' },
    });
  }

  copyUrl(): void {
    navigator.clipboard.writeText(this.data.url).then(() => {
      this.copied = true;
      setTimeout(() => (this.copied = false), 2000);
    });
  }
}
