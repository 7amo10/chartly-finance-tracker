import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService, ToastItem } from '../services/toast.service';

@Component({
  standalone: true,
  selector: 'app-toasts',
  imports: [CommonModule],
  template: `
    <div class="fixed top-4 right-4 z-50 flex flex-col gap-2 w-[min(360px,95%)]">
      <div *ngFor="let t of toasts" class="flex items-start gap-3 p-3 rounded-lg shadow border" [ngClass]="bgClass(t.severity)">
        <div class="flex-shrink-0" [innerHTML]="icon(t.severity)"></div>
        <div class="flex-1">
          <div class="font-semibold">{{t.title || (t.severity | titlecase)}}</div>
          <div class="text-sm text-muted-foreground">{{t.message}}</div>
        </div>
        <div class="flex-shrink-0 flex items-center">
          <button class="btn-outline" (click)="dismiss(t.id)">✕</button>
        </div>
      </div>
    </div>
  `
})
export class ToastComponent {
  toasts: ToastItem[] = [];

  constructor(private ts: ToastService) {
    this.ts.changes.subscribe(t => this.push(t));
  }

  push(t: ToastItem) {
    this.toasts = [t, ...this.toasts];
    if (t.ttl && t.ttl > 0) {
      setTimeout(() => this.dismiss(t.id), t.ttl);
    }
  }

  dismiss(id: string) {
    this.toasts = this.toasts.filter(x => x.id !== id);
  }

  bgClass(s: ToastItem['severity']) {
    switch (s) {
      case 'success':
        return 'bg-green-50 border-green-100 text-green-900 dark:bg-green-900/18 dark:border-green-800/40 dark:text-green-200';
      case 'error':
        return 'bg-red-50 border-red-100 text-red-900 dark:bg-red-900/18 dark:border-red-800/40 dark:text-red-200';
      case 'warning':
        return 'bg-amber-50 border-amber-100 text-amber-900 dark:bg-amber-900/18 dark:border-amber-800/40 dark:text-amber-200';
      default:
        return 'bg-slate-50 border-border text-slate-900 dark:bg-slate-900/18 dark:border-slate-800/40 dark:text-slate-200';
    }
  }

  icon(s: ToastItem['severity']) {
    switch (s) {
      case 'success':
        return `<svg class="h-6 w-6 text-green-600 dark:text-green-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>`;
      case 'error':
        return `<svg class="h-6 w-6 text-red-600 dark:text-red-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>`;
      case 'warning':
        return `<svg class="h-6 w-6 text-amber-600 dark:text-amber-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.29 3.86L1.82 18a1 1 0 00.86 1.5h18.64a1 1 0 00.86-1.5L13.71 3.86a1 1 0 00-1.72 0zM12 9v4M12 17h.01"/></svg>`;
      default:
        return `<svg class="h-6 w-6 text-slate-600 dark:text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01"/></svg>`;
    }
  }
}
