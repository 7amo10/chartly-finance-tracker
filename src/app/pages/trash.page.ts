import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataService } from '../data/data.service';
import { ToastService } from '../services/toast.service';

@Component({
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="card p-4">
      <h3 class="text-lg font-semibold">Trash (Deleted Transactions)</h3>
      <p class="text-muted-foreground">Soft-deleted transactions are listed here. You can restore or permanently delete them.</p>

      <div *ngIf="txs.length === 0" class="mt-4 text-muted-foreground">Trash is empty.</div>
      <div *ngFor="let t of txs" class="mt-3 p-3 card flex items-center justify-between">
        <div>
          <div class="font-semibold">{{t.description || '—'}}</div>
          <div class="text-sm text-muted-foreground">{{t.date | date:'short'}} • {{t.amount | number:'1.2-2'}}</div>
        </div>
        <div class="flex gap-2">
          <button class="btn-outline" (click)="restore(t)">Restore</button>
          <button class="btn-outline" (click)="purge(t)">Permanently Delete</button>
        </div>
      </div>
    </div>
  `
})
export class TrashPage {
  txs: any[] = [];
  constructor(private ds: DataService, private toast: ToastService) {
    (this.ds as any).deletedTransactions$.subscribe((v: any) => this.txs = v || []);
  }

  async restore(t: any) {
    await this.ds.restoreTransaction(t.id);
    this.toast.success('Restored transaction');
  }

  async purge(t: any) {
    if (!confirm('Permanently delete this transaction? This cannot be undone.')) return;
    await (this.ds as any)._db.transactions.delete(t.id);
    await (this.ds as any)._db.auditLogs.add({ entity: 'transaction', entityId: t.id, action: 'purge', timestamp: new Date().toISOString() });
    this.toast.success('Deleted permanently');
  }
}
