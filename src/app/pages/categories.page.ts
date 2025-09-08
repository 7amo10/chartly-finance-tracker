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
        <h3 class="text-lg font-semibold">Categories</h3>
        <button class="btn-primary" (click)="openNew()">New Category</button>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div *ngFor="let c of categories" class="p-3 card">
          <div class="flex items-center justify-between">
            <div>
              <div class="text-sm text-muted-foreground">{{c.parentId ? ('Subcategory' ) : 'Category'}}</div>
              <div class="text-lg font-semibold">{{c.name}}</div>
              <div *ngIf="c.rules?.length" class="mt-2 text-sm text-muted-foreground">Rules: {{c.rules.join(', ')}}</div>
            </div>
            <div class="flex flex-col gap-2">
              <button class="btn-outline" (click)="edit(c)">Edit</button>
              <button class="btn-outline" (click)="del(c)">Delete</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Category edit/create modal -->
      <div *ngIf="editingCat" class="app-modal">
        <div class="backdrop" (click)="cancel()"></div>
        <div class="modal-content card p-4 max-w-xl w-[95%]">
          <button class="absolute -top-4 -right-4 bg-card rounded-full p-2 shadow" (click)="cancel()" aria-label="Close">✕</button>
          <h4 class="font-semibold">{{isEditing ? 'Edit' : 'New'}} Category</h4>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
            <div>
              <label class="text-sm text-muted-foreground">Name</label>
              <input class="input mt-1" [(ngModel)]="editingCat.name" />
            </div>
            <div>
              <label class="text-sm text-muted-foreground">Parent</label>
              <select class="input mt-1" [(ngModel)]="editingCat.parentId">
                <option [ngValue]="null">—</option>
                <option *ngFor="let p of categories" [ngValue]="p.id">{{p.name}}</option>
              </select>
            </div>
            <div class="sm:col-span-2">
              <label class="text-sm text-muted-foreground">Auto-tag rules (comma separated keywords)</label>
              <input class="input mt-1" [(ngModel)]="rulesText" />
            </div>
          </div>
          <div class="mt-3 flex gap-2">
            <button class="btn-primary" (click)="save()">Save</button>
            <button class="btn-outline" (click)="cancel()">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class CategoriesPage {
  categories: any[] = [];
  // modal form state
  editingCat: any = null;
  isEditing = false;
  rulesText = '';

  constructor(private ds: DataService, private toast: ToastService, private sidebar: SidebarService) {
    this.ds.categories$.subscribe(c => this.categories = c as any[]);
  }

  openNew() { this.resetForm(); this.isEditing = false; this.editingCat = { name: '', parentId: null, rules: [] }; try { this.sidebar.set(false); } catch (e) {} }
  edit(c: any) { this.editingCat = { ...c }; this.rulesText = (c.rules || []).join(', '); this.isEditing = true; try { this.sidebar.set(false); } catch (e) {} }
  cancel() { this.editingCat = null; this.resetForm(); }
  resetForm() { this.rulesText = ''; }

  async save() {
    if (!this.editingCat || !this.editingCat.name) { this.toast.warning('Please enter a category name'); return; }
    this.editingCat.rules = this.rulesText.split(',').map((s: string) => s.trim()).filter((s: string) => s.length);
    try {
      await this.ds.upsertCategory(this.editingCat);
      this.toast.success(this.isEditing ? 'Category updated' : 'Category created');
      this.editingCat = null; this.resetForm();
    } catch (e) {
      console.error('Failed saving category', e);
      this.toast.error('Failed to save category');
    }
  }

  async del(c: any) {
    if (!confirm('Delete category?')) return;
    try {
      await (this.ds as any)._db.categories.delete(c.id);
      await (this.ds as any)._db.auditLogs.add({ entity: 'category', entityId: c.id, action: 'delete', timestamp: new Date().toISOString() });
      this.toast.success('Category deleted');
    } catch (e) {
      console.error('Failed deleting category', e);
      this.toast.error('Failed to delete category');
    }
  }
}
