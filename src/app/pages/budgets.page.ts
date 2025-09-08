import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../data/data.service';
import { ToastService } from '../services/toast.service';
import { SidebarService } from '../services/sidebar.service';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="card p-4">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold">Budgets</h3>
        <div class="flex items-center gap-2">
          <button class="btn-primary" (click)="openNew()">New Budget</button>
        </div>
      </div>

      <div *ngIf="showForm" class="mb-4 card p-4">
        <h4 class="font-semibold">Create Budget</h4>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2">
          <div>
            <label class="text-sm text-muted-foreground">Month (YYYY-MM)</label>
            <input class="input mt-1" [(ngModel)]="form.month" placeholder="2025-08" />
          </div>
          <div>
            <label class="text-sm text-muted-foreground">Category</label>
            <select class="input mt-1" [(ngModel)]="form.categoryId">
              <option [ngValue]="null">—</option>
              <option *ngFor="let c of categories" [ngValue]="c.id">{{c.name}}</option>
            </select>
          </div>
          <div>
            <label class="text-sm text-muted-foreground">Account</label>
            <select class="input mt-1" [(ngModel)]="form.accountId">
              <option [ngValue]="null">—</option>
              <option *ngFor="let a of accounts" [ngValue]="a.id">{{a.name}}</option>
            </select>
          </div>
          <div>
            <label class="text-sm text-muted-foreground">Limit</label>
            <input class="input mt-1" type="number" [(ngModel)]="form.limit" />
          </div>
          <div>
            <label class="text-sm text-muted-foreground">Alert Threshold (0-1)</label>
            <input class="input mt-1" type="number" step="0.01" min="0" max="1" [(ngModel)]="form.alertThreshold" />
          </div>
        </div>
        <div class="mt-3 flex gap-2">
          <button class="btn-primary" (click)="save()">Save</button>
          <button class="btn-outline" (click)="cancel()">Cancel</button>
        </div>
      </div>

      <div *ngIf="budgets?.length === 0" class="text-muted-foreground">No budgets set. Create monthly budgets per category.</div>
      <div *ngFor="let b of budgets" class="p-3 card mb-2 flex items-center justify-between">
        <div>
          <div class="text-sm text-muted-foreground">{{b.month}}</div>
          <div class="font-semibold">Limit: {{b.limit | number:'1.2-2'}}</div>
        </div>
        <div class="flex items-center gap-2">
          <div class="text-sm text-muted-foreground">Alerts @ {{(b.alertThreshold ?? 0.9) * 100}}%</div>
          <button class="btn-outline" (click)="openEdit(b)">Edit</button>
        </div>
      </div>

      <!-- Edit / Delete Modal -->
      <div *ngIf="editingBudget" class="app-modal">
        <div class="backdrop" (click)="closeEdit()"></div>
        <div class="modal-content relative w-full max-w-md p-4">
          <div class="card p-4">
            <h4 class="font-semibold">Edit Budget</h4>
            <div class="grid grid-cols-1 gap-3 mt-2">
              <div>
                <label class="text-sm text-muted-foreground">Month</label>
                <input class="input mt-1" [(ngModel)]="editingBudget.month" />
              </div>
              <div>
                <label class="text-sm text-muted-foreground">Limit</label>
                <input class="input mt-1" type="number" [(ngModel)]="editingBudget.limit" />
              </div>
              <div>
                <label class="text-sm text-muted-foreground">Alert Threshold</label>
                <input class="input mt-1" type="number" step="0.01" min="0" max="1" [(ngModel)]="editingBudget.alertThreshold" />
              </div>
              <div class="flex items-center gap-2 mt-3 justify-end">
                <button class="btn-outline" (click)="confirmDelete()">Delete</button>
                <button class="btn-outline" (click)="closeEdit()">Cancel</button>
                <button class="btn-primary" (click)="saveEdit()">Save</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class BudgetsPage {
  budgets: any[] = [];
  categories: any[] = [];
  accounts: any[] = [];

  showForm = false;
  form: any = { month: '', categoryId: null, accountId: null, limit: 0, alertThreshold: 0.9 };

  editingBudget: any = null;

  constructor(private ds: DataService, private toast: ToastService, private sidebar: SidebarService) {
    this.ds.budgets$.subscribe(b => this.budgets = b as any[]);
    this.ds.categories$.subscribe(c => this.categories = c as any[]);
    this.ds.accounts$.subscribe(a => this.accounts = a as any[]);
    if (!this.form.month) this.form.month = new Date().toISOString().slice(0,7);
  }

  openNew() { this.showForm = true; }
  cancel() { this.showForm = false; this.form = { month: new Date().toISOString().slice(0,7), categoryId: null, accountId: null, limit: 0, alertThreshold: 0.9 }; }

  async save() {
    if (!this.form.month) { this.toast.warning('Please enter month'); return; }
    if (!this.form.limit || Number(this.form.limit) <= 0) { this.toast.warning('Please enter a positive limit'); return; }
    try {
      await this.ds.upsertBudget({ month: this.form.month, categoryId: this.form.categoryId, accountId: this.form.accountId, limit: Number(this.form.limit), alertThreshold: Number(this.form.alertThreshold), createdAt: new Date().toISOString() } as any);
      this.toast.success('Budget created');
      this.cancel();
    } catch (err) {
      console.error('Error saving budget', err);
      this.toast.error('Error saving budget');
    }
  }

  openEdit(b: any) {
    this.editingBudget = { ...b };
    try { this.sidebar.set(false); } catch (e) {}
    try { document.body.classList.add('modal-open'); } catch (e) {}
  }

  closeEdit() {
    this.editingBudget = null;
    try { document.body.classList.remove('modal-open'); } catch (e) {}
  }

  async saveEdit() {
    if (!this.editingBudget) return;
    try {
      await this.ds.upsertBudget(this.editingBudget);
      this.editingBudget = null;
      this.toast.success('Budget updated');
    } catch (e) {
      console.error(e);
      this.toast.error('Failed to update budget');
    }
  }

  async confirmDelete() {
    if (!this.editingBudget) return;
    if (!confirm('Delete this budget?')) return;
    try {
      await this.ds.deleteBudget(this.editingBudget.id);
      this.editingBudget = null;
      this.toast.success('Budget deleted');
    } catch (e) {
      console.error(e);
      this.toast.error('Failed to delete budget');
    }
  }
}
