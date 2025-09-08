import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgChartsModule } from 'ng2-charts';
import { ChartConfiguration, ChartType } from 'chart.js';
import { DataService } from '../data/data.service';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, NgChartsModule],
  template: `
    <div class="space-y-6 relative">
      <div class="flex items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl font-semibold">Dashboard</h1>
          <div class="text-sm text-muted-foreground">Overview of your finances</div>
        </div>
        <div class="flex items-center gap-2">
          <div class="flex items-center gap-2">
            <button class="btn" [class.btn-primary]="range==='30'" (click)="setPreset(30)">30d</button>
            <button class="btn" [class.btn-primary]="range==='90'" (click)="setPreset(90)">90d</button>
            <button class="btn" [class.btn-primary]="range==='180'" (click)="setPreset(180)">6m</button>
            <button class="btn" [class.btn-primary]="range==='365'" (click)="setPreset(365)">12m</button>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <label class="text-sm text-muted-foreground">From</label>
            <input type="date" class="input w-36 max-w-full" [(ngModel)]="fromDate" (change)="onCustomRange()" />
            <label class="text-sm text-muted-foreground">To</label>
            <input type="date" class="input w-36 max-w-full" [(ngModel)]="toDate" (change)="onCustomRange()" />
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div class="card p-4">
          <div class="text-sm text-muted-foreground">Total Balance ({{displayCurrency}})</div>
          <div class="text-3xl font-bold mt-2">{{formatCurrency(totalBalance)}}</div>
          <div class="mt-2 text-xs text-muted-foreground">Aggregated across accounts using admin rates (if available)</div>
        </div>

        <div class="card p-4">
          <div class="flex items-center justify-between">
            <div>
              <div class="text-sm text-muted-foreground">Income (period)</div>
              <div class="text-lg font-semibold">{{formatCurrency(periodIncome)}}</div>
            </div>
          </div>
          <div class="mt-2">
            <canvas baseChart [data]="sparkIncome" [type]="lineType" [options]="sparkOptions"></canvas>
          </div>
        </div>

        <div class="card p-4">
          <div class="text-sm text-muted-foreground">Expense (period)</div>
          <div class="text-lg font-semibold">{{formatCurrency(periodExpense)}}</div>
          <div class="mt-2">
            <canvas baseChart [data]="sparkExpense" [type]="lineType" [options]="sparkOptions"></canvas>
          </div>
        </div>

        <div class="card p-4">
          <div class="text-sm text-muted-foreground">Net (period)</div>
          <div class="text-lg font-semibold">{{formatCurrency(periodIncome - periodExpense)}}</div>
          <div class="mt-2">
            <canvas baseChart [data]="sparkNet" [type]="lineType" [options]="sparkOptions"></canvas>
          </div>
        </div>
      </div>

      <div class="relative">
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div class="card p-4 lg:col-span-2">
            <div class="flex items-center justify-between">
              <div>
                <div class="text-sm text-muted-foreground">Balance Timeline</div>
                <div class="text-lg font-semibold">Balance over time</div>
              </div>
            </div>
            <div class="mt-3">
              <canvas baseChart [data]="balanceData" [type]="lineType"></canvas>
            </div>
          </div>

          <div class="card p-4">
            <div class="flex items-center justify-between">
              <div class="text-sm text-muted-foreground">Expenses by Category</div>
              <div *ngIf="categoryFilter" class="text-sm">Filter: <span class="font-semibold">{{categoryFilter}}</span> <button class="btn-outline ml-2" (click)="clearCategoryFilter()">Clear</button></div>
            </div>
            <div class="mt-2">
              <canvas baseChart [data]="pieData" [type]="pieType" (chartClick)="onPieClick($event)"></canvas>
            </div>
          </div>
        </div>

        <div *ngIf="loading" class="absolute inset-0 z-40 flex items-center justify-center pointer-events-none">
          <div class="w-full h-full bg-white/10 dark:bg-black/10"></div>
          <div class="absolute z-50 p-4 bg-card rounded-lg shadow">
            <svg class="animate-spin h-6 w-6 text-brand mr-2 inline-block" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path></svg>
            <span>Updating charts…</span>
          </div>
        </div>
      </div>

      <div class="card p-4">
        <h3 class="font-semibold">Recent Transactions</h3>
        <div *ngIf="recent.length === 0" class="text-sm text-muted-foreground mt-2">No transactions yet.</div>
        <table *ngIf="recent.length > 0" class="w-full mt-2">
          <thead>
            <tr class="text-left text-sm text-muted-foreground"><th>Date</th><th>Description</th><th class="text-right">Amount</th></tr>
          </thead>
          <tbody>
            <tr *ngFor="let t of recent" class="border-t border-border">
              <td class="py-2">{{t.date | date:'shortDate'}}</td>
              <td class="py-2">{{t.description}}</td>
              <td class="py-2 text-right">{{t.type === 'expense' ? '-' : ''}}{{formatCurrency(t.amount, t.currency)}}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `
})
export class DashboardPage {
  totalBalance = 0;
  displayCurrency = 'USD';
  numberFormat = 'en-US';

  // sparks
  lineType: ChartType = 'line';
  sparkIncome: ChartConfiguration<'line'>['data'] = { labels: [], datasets: [{ data: [] }] };
  sparkExpense: ChartConfiguration<'line'>['data'] = { labels: [], datasets: [{ data: [] }] };
  sparkNet: ChartConfiguration<'line'>['data'] = { labels: [], datasets: [{ data: [] }] };
  sparkOptions: any = { elements: { point: { radius: 0 } }, scales: { x: { display: false }, y: { display: false } }, plugins: { legend: { display: false } } };

  // big charts
  pieType: ChartType = 'pie';
  pieData: ChartConfiguration<'pie'>['data'] = { labels: [], datasets: [{ data: [] }] };
  balanceData: ChartConfiguration<'line'>['data'] = { labels: [], datasets: [] };

  periodIncome = 0;
  periodExpense = 0;
  recent: any[] = [];

  loading = false;
  categoryFilter: string | null = null;

  // range
  range = '180';
  fromDate = new Date(new Date().setMonth(new Date().getMonth()-6)).toISOString().slice(0,10);
  toDate = new Date().toISOString().slice(0,10);

  constructor(private ds: DataService) {
    this.loadSettings();
    this.refresh();
    const schedule = this._scheduleRefresh.bind(this);
    this.ds.transactions$.subscribe(() => schedule());
    this.ds.accounts$.subscribe(() => schedule());
    this.ds.categories$.subscribe(() => schedule());
    this.ds.settings$.subscribe(() => this.loadSettings());
  }

  private _refreshTimer: any = null;
  private _scheduleRefresh() {
    if (this._refreshTimer) clearTimeout(this._refreshTimer);
    this._refreshTimer = setTimeout(() => { this._refreshTimer = null; this.refresh(); }, 120);
  }

  async loadSettings() {
    const s: any = await (this.ds as any)._db.settings.get('singleton');
    if (s) {
      this.displayCurrency = s.defaultCurrency || 'USD';
      this.numberFormat = s.numberFormat || this.numberFormat;
      // rates may be stored as s.currencyRates = { 'EUR': 1.1 }
    }
  }

  onRangeChange() {
    const days = Number(this.range);
    const now = new Date();
    this.toDate = now.toISOString().slice(0,10);
    this.fromDate = new Date(Date.now() - days*24*60*60*1000).toISOString().slice(0,10);
    this.refresh();
  }

  setPreset(days: number) {
    this.range = String(days);
    this.onRangeChange();
  }

  onCustomRange() { this.refresh(); }

  onPieClick(evt: any) {
    try {
      const active = evt?.active && evt.active.length ? evt.active[0] : null;
      if (!active) return;
      const idx = active.index;
      const label = this.pieData.labels?.[idx] as string | undefined;
      if (!label) return;
      this.categoryFilter = label;
      this.refresh();
    } catch (e) { console.error(e); }
  }

  clearCategoryFilter() { this.categoryFilter = null; this.refresh(); }

  formatCurrency(amount: number, currency?: string) {
    try {
      const fmt = new Intl.NumberFormat(this.numberFormat || 'en-US', { style: 'currency', currency: currency || this.displayCurrency });
      return fmt.format(amount);
    } catch (e) {
      // Fallback
      return (amount || 0).toFixed(2) + ' ' + (currency || this.displayCurrency);
    }
  }

  private loadingTimer: any = null;
  async refresh() {
    // show loading only if computation takes longer than 150ms
    if (this.loadingTimer) clearTimeout(this.loadingTimer);
    this.loadingTimer = setTimeout(() => { this.loading = true; this.loadingTimer = null; }, 150);

    try {
      // gather transactions in range — use indexed date range query to avoid loading entire DB
      const from = new Date(this.fromDate + 'T00:00:00');
      const to = new Date(this.toDate + 'T23:59:59');

      // Transactions are stored with date strings in YYYY-MM-DD format; query by that range
      // use efficient aggregate helper that streams transactions via indexed range
      const months = this._monthsArray(new Date(this.fromDate), new Date(this.toDate));
      const { incomeSeries, expenseSeries, periodIncome, periodExpense, byCat } = await this.ds.transactionAggregates(this.fromDate, this.toDate, months);

      this.periodIncome = periodIncome;
      this.periodExpense = periodExpense;

      this.sparkIncome = { labels: months, datasets: [{ data: incomeSeries, borderColor: '#10b981', backgroundColor: 'transparent' }] };
      this.sparkExpense = { labels: months, datasets: [{ data: expenseSeries, borderColor: '#ef4444', backgroundColor: 'transparent' }] };
      this.sparkNet = { labels: months, datasets: [{ data: months.map((_, i) => incomeSeries[i] - expenseSeries[i]), borderColor: '#3b82f6', backgroundColor: 'transparent' }] };

      // balance timeline (cumulative across filtered range)
      let cumulative = 0;
      const labels: string[] = [];
      const dataSeries: number[] = [];
      for (let i = 0; i < months.length; i++) {
        cumulative += (incomeSeries[i] - expenseSeries[i]);
        labels.push(months[i]);
        dataSeries.push(cumulative);
      }
      this.balanceData = { labels, datasets: [{ label: 'Balance', data: dataSeries, borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.08)' }] };

      // pie — map categoryId -> name once
      const categories = await (this.ds as any)._db.categories.toArray();
      const catIdToName = new Map<number, string>(categories.map((c: any) => [Number(c.id), String(c.name)]));
      const catMapName = new Map<string, number>();
      for (const [cid, amt] of byCat.entries()) {
        const name = cid === 0 ? 'Uncategorized' : (catIdToName.get(Number(cid)) || 'Uncategorized');
        catMapName.set(name, (catMapName.get(name) || 0) + amt);
      }
      const sorted = Array.from(catMapName.entries()).sort((a, b) => b[1] - a[1]);
      this.pieData = { labels: sorted.map(s => s[0]).slice(0, 8), datasets: [{ data: sorted.map(s => s[1]).slice(0, 8), backgroundColor: ['#60a5fa','#f97316','#f87171','#34d399','#c084fc','#f59e0b','#a78bfa','#06b6d4'] }] };

      // recent — fetch most recent N without loading entire set
      let recentList = await this.ds.recentTransactions(this.fromDate, this.toDate, 8);
      if (this.categoryFilter) {
        recentList = recentList.filter(r => {
          const cat = r.categoryId ? (catIdToName.get(r.categoryId) || 'Uncategorized') : 'Uncategorized';
          return cat === this.categoryFilter;
        });
      }
      this.recent = recentList;

      // total balance with aggregation using balancesByAccount and possible conversion
      const balances = await this.ds.balancesByAccount();
      // try to use settings rates if available
      const s: any = await (this.ds as any)._db.settings.get('singleton');
      const rates: Record<string, number> = s?.currencyRates || {};
      const defaultCurrency = s?.defaultCurrency || this.displayCurrency;
      this.displayCurrency = defaultCurrency;

      let total = 0;
      let convertible = true;
      for (const b of balances) {
        const cur = b.currency || defaultCurrency;
        if (cur === defaultCurrency) total += b.balance;
        else if (rates && rates[cur]) total += b.balance * rates[cur];
        else convertible = false;
      }

      // if not convertible, just sum balances for same currency as default
      this.totalBalance = convertible ? total : balances.filter(x => x.currency === defaultCurrency).reduce((s, x) => s + x.balance, 0);
    } finally {
      if (this.loadingTimer) { clearTimeout(this.loadingTimer); this.loadingTimer = null; }
      this.loading = false;
    }
  }

  private _monthsArray(from: Date, to: Date) {
    const list: string[] = [];
    const cur = new Date(from.getFullYear(), from.getMonth(), 1);
    const end = new Date(to.getFullYear(), to.getMonth(), 1);
    while (cur <= end) {
      list.push(cur.toISOString().slice(0,7));
      cur.setMonth(cur.getMonth()+1);
    }
    return list;
  }
}
