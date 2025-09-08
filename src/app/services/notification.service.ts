import { Injectable } from '@angular/core';
import { DataService } from '../data/data.service';
import { BannerComponent } from '../components/banner.component';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private subs: any[] = [];
  private notified = new Set<string>(); // budgetKey => notified

  constructor(private ds: DataService) {
    // start monitoring
    this.subs.push(this.ds.budgets$.subscribe(() => this.evaluate()));
    this.subs.push(this.ds.transactions$.subscribe(() => this.evaluate()));
    this.subs.push(this.ds.settings$.subscribe(() => this.evaluate()));
    // request permission proactively
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }

  private async evaluate() {
    try {
      const budgets: any[] = await (this.ds as any)._db.budgets.toArray();
      const txs: any[] = await (this.ds as any)._db.transactions.filter((t: any) => !t.deletedAt).toArray();
      const now = new Date();

      for (const b of budgets) {
        const month = b.month; // YYYY-MM
        const start = new Date(month + '-01T00:00:00');
        const end = new Date(start.getFullYear(), start.getMonth()+1, 1);
        // compute spent for budget scope
        const spent = txs.filter(t => {
          const d = new Date(t.date);
          if (isNaN(d.getTime())) return false;
          if (d < start || d >= end) return false;
          if (b.categoryId && t.categoryId !== b.categoryId) return false;
          if (b.accountId && t.accountId !== b.accountId) return false;
          return t.type === 'expense';
        }).reduce((s, t) => s + t.amount, 0);

        const ratio = b.limit > 0 ? spent / b.limit : 0;
        const threshold = b.alertThreshold ?? 0.9;
        const key = `${b.id}:${month}`;

        if (ratio >= threshold && !this.notified.has(key)) {
          // trigger banner and OS notification
          const msg = `Budget alert: ${Math.round(ratio*100)}% of ${b.limit} used for ${b.categoryId ? 'category' : 'account'} ${b.categoryId ?? b.accountId} (${month})`;
          try {
            BannerComponent.push(msg, 'warning', 15000);
          } catch (e) {}
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Budget Alert', { body: msg });
          }
          this.notified.add(key);
        }

        // reset notified if below threshold again
        if (ratio < threshold && this.notified.has(key)) {
          this.notified.delete(key);
        }
      }
    } catch (err) {
      console.error('Error evaluating budgets', err);
    }
  }

  dispose() {
    this.subs.forEach(s => s.unsubscribe());
    this.subs = [];
  }
}
