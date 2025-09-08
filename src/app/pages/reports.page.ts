import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChartConfiguration, ChartType } from 'chart.js';
import { NgChartsModule } from 'ng2-charts';
import { DataService } from '../data/data.service';

@Component({
  standalone: true,
  imports: [CommonModule, NgChartsModule],
  template: `
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div class="card p-4">
        <h4 class="font-semibold">Expenses by Category</h4>
        <canvas baseChart [data]="pieData" [type]="pieType"></canvas>
      </div>
      <div class="card p-4">
        <h4 class="font-semibold">Monthly Income vs Expense</h4>
        <canvas baseChart [data]="barData" [type]="barType"></canvas>
      </div>
    </div>
  `
})
export class ReportsPage {
  pieType: ChartType = 'pie';
  pieData: ChartConfiguration<'pie'>['data'] = { labels: [], datasets: [] };

  barType: ChartType = 'bar';
  barData: ChartConfiguration<'bar'>['data'] = { labels: [], datasets: [] };

  constructor(private ds: DataService) {
    this.ds.transactions$.subscribe(tx => this.updateCharts(tx || []));
  }

  updateCharts(tx: any[]) {
    const byCat = new Map<string, number>();
    const monthly = new Map<string, { income: number; expense: number }>();
    for (const t of tx) {
      const cat = t.categoryId ? String(t.categoryId) : 'Uncategorized';
      byCat.set(cat, (byCat.get(cat) || 0) + (t.type === 'expense' ? t.amount : 0));
      const m = t.date?.slice(0,7) || 'unknown';
      const mm = monthly.get(m) || { income:0, expense:0 };
      if (t.type === 'income') mm.income += t.amount; else if (t.type === 'expense') mm.expense += t.amount;
      monthly.set(m, mm);
    }
    this.pieData = { labels: Array.from(byCat.keys()), datasets: [{ data: Array.from(byCat.values()), backgroundColor: ['#60a5fa','#f97316','#f87171','#34d399','#c084fc'] }] };
    const labels = Array.from(monthly.keys()).sort();
    this.barData = { labels, datasets: [ { label: 'Income', data: labels.map(l => monthly.get(l)?.income || 0), backgroundColor: '#10b981' }, { label: 'Expense', data: labels.map(l => monthly.get(l)?.expense || 0), backgroundColor: '#f43f5e' } ] };
  }
}
