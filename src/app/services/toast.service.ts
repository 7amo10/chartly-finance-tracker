import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export type ToastSeverity = 'success' | 'error' | 'info' | 'warning';
export interface ToastItem { id: string; message: string; severity: ToastSeverity; title?: string; ttl?: number }

@Injectable({ providedIn: 'root' })
export class ToastService {
  private subject = new Subject<ToastItem>();
  public changes = this.subject.asObservable();

  private make(id?: string) { return (id || Math.random().toString(36).slice(2,9)); }

  show(message: string, severity: ToastSeverity = 'info', title?: string, ttl = 4000) {
    const item: ToastItem = { id: this.make(), message, severity, title, ttl };
    this.subject.next(item);
    return item.id;
  }

  success(message: string, title?: string, ttl = 4000) { return this.show(message, 'success', title, ttl); }
  error(message: string, title?: string, ttl = 6000) { return this.show(message, 'error', title, ttl); }
  info(message: string, title?: string, ttl = 4000) { return this.show(message, 'info', title, ttl); }
  warning(message: string, title?: string, ttl = 5000) { return this.show(message, 'warning', title, ttl); }
}
