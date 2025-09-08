import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BehaviorSubject } from 'rxjs';

export type BannerSeverity = 'info' | 'warning' | 'danger' | 'success';
export interface Banner { id: string; message: string; severity?: BannerSeverity; createdAt: string }

class BannerStore {
  private _b = new BehaviorSubject<Banner[]>([]);
  public readonly banners$ = this._b.asObservable();

  add(b: Banner) {
    const list = this._b.value.slice();
    list.push(b);
    this._b.next(list);
  }

  remove(id: string) {
    const list = this._b.value.filter(x => x.id !== id);
    this._b.next(list);
  }
}

export const bannerStore = new BannerStore();

@Component({
  standalone: true,
  selector: 'app-banners',
  imports: [CommonModule],
  template: `
    <div class="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-[min(980px,95%)]">
      <div *ngFor="let b of banners" class="mb-2 p-3 rounded-lg shadow-soft flex items-start justify-between" [ngClass]="bgClass(b.severity)">
        <div class="flex items-start gap-3">
          <div class="text-sm font-medium">{{b.message}}</div>
        </div>
        <div class="flex items-center gap-2">
          <button class="btn-outline" (click)="close(b.id)">Close</button>
        </div>
      </div>
    </div>
  `
})
export class BannerComponent {
  banners: Banner[] = [];
  private timerMap = new Map<string, any>();

  constructor() {
    bannerStore.banners$.subscribe(b => this.banners = b);
  }

  bgClass(s?: BannerSeverity) {
    switch (s) {
      case 'warning': return 'bg-amber-100 text-amber-900 border border-amber-200 dark:bg-amber-900/18 dark:border-amber-800/40 dark:text-amber-200';
      case 'danger': return 'bg-red-100 text-red-900 border border-red-200 dark:bg-red-900/18 dark:border-red-800/40 dark:text-red-200';
      case 'success': return 'bg-green-100 text-green-900 border border-green-200 dark:bg-green-900/18 dark:border-green-800/40 dark:text-green-200';
      default: return 'bg-slate-50 text-slate-900 border border-border dark:bg-slate-900/18 dark:border-slate-800/40 dark:text-slate-200';
    }
  }

  close(id: string) {
    bannerStore.remove(id);
    const t = this.timerMap.get(id);
    if (t) { clearTimeout(t); this.timerMap.delete(id); }
  }

  static push(message: string, severity: BannerSeverity = 'info', ttl = 10000) {
    const id = Math.random().toString(36).slice(2,9);
    const b: Banner = { id, message, severity, createdAt: new Date().toISOString() };
    bannerStore.add(b);
    const timer = setTimeout(() => bannerStore.remove(id), ttl);
    return id;
  }
}
