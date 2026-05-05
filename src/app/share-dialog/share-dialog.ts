import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
@Component({
  selector: 'app-share-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule],
  template: `<h2 mat-dialog-title>Share</h2><mat-dialog-actions><button mat-button mat-dialog-close>Close</button></mat-dialog-actions>`
})
export class ShareDialog {
  constructor(@Inject(MAT_DIALOG_DATA) public data: { url: string }) {}
}
