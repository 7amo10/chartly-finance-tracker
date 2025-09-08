import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../data/data.service';
import { ToastService } from '../services/toast.service';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="card p-4">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold">Accounts</h3>
        <div class="flex items-center gap-2">
          <button class="btn-primary" (click)="openNew()">New Account</button>
        </div>
      </div>

      <div *ngIf="showForm" class="mb-4 card p-4">
        <h4 class="font-semibold">Add Account</h4>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2">
          <div>
            <label class="text-sm text-muted-foreground">Name</label>
            <input class="input mt-1" [(ngModel)]="form.name" />
          </div>
          <div>
            <label class="text-sm text-muted-foreground">Type</label>
            <select class="input mt-1" [(ngModel)]="form.type">
              <option value="cash">Cash</option>
              <option value="bank">Bank</option>
              <option value="credit">Credit</option>
            </select>
          </div>
          <div>
            <label class="text-sm text-muted-foreground">Currency</label>
            <input class="input mt-1" [(ngModel)]="form.currency" />
          </div>
        </div>
        <div class="mt-3 flex gap-2">
          <button class="btn-primary" (click)="save()">Create</button>
          <button class="btn-outline" (click)="cancel()">Cancel</button>
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div *ngFor="let a of accounts" class="p-4 card">
          <div class="flex items-center justify-between">
            <div>
              <div class="text-sm text-muted-foreground">{{a.type | titlecase}}</div>
              <div class="text-lg font-semibold">{{a.name}}</div>
            </div>
            <div class="text-right">
              <div class="text-sm text-muted-foreground">{{a.currency}}</div>
              <div class="text-xl font-bold">{{balancesMap[a.id] | number:'1.2-2'}}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class AccountsPage {
  accounts: any[] = [];
  balancesMap: Record<number, number> = {};

  showForm = false;
  form: any = { name: '', type: 'bank', currency: 'USD' };

  constructor(private ds: DataService, private toast: ToastService) {
    this.ds.accounts$.subscribe(a => this.accounts = a as any[]);
    this.refreshBalances();
  }

  openNew() { this.showForm = true; }
  cancel() { this.showForm = false; this.form = { name: '', type: 'bank', currency: 'USD' }; }

  async save() {
    if (!this.form.name) { this.toast.warning('Please enter a name'); return; }
    try {
      await this.ds.upsertAccount({ name: this.form.name, type: this.form.type, currency: this.form.currency, createdAt: new Date().toISOString() } as any);
      this.toast.success('Account created');
      this.cancel();
      await this.refreshBalances();
    } catch (err) {
      console.error('Error creating account', err);
      this.toast.error('Error creating account');
    }
  }

  async refreshBalances() {
    const b = await this.ds.balancesByAccount();
    this.balancesMap = Object.fromEntries(b.map(x => [x.accountId, x.balance]));
  }
}
