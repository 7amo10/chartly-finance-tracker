import { Component, OnDestroy, Renderer2 } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { DataService } from '../data/data.service';
import { ToastService } from '../services/toast.service';
import { SidebarService } from '../services/sidebar.service';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, MatTableModule, MatButtonModule],
  template: `
    <div class="card p-4">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold">Transactions</h3>
        <div class="flex items-center gap-2">
          <input type="file" accept=".csv,application/csv" (change)="onCsv($event)" class="hidden" #csvIn />
          <button class="btn-outline" (click)="csvIn.click()">Import CSV</button>
          <button class="btn-outline" (click)="exportCsv()">Export CSV</button>
          <button class="btn-primary" (click)="openNew()">New</button>
        </div>
      </div>

      <div class="mb-4 flex items-center gap-2">
        <input placeholder="Search description or tags" class="input" [(ngModel)]="query" (input)="applyFilter()" />
      </div>

      <div class="overflow-x-auto -mx-2 sm:mx-0">
        <table class="min-w-[720px] w-full table-auto">
          <thead>
            <tr class="text-left text-sm text-muted-foreground">
              <th class="px-2">Date</th>
              <th class="px-2">Description</th>
              <th class="px-2 w-24">Receipt</th>
              <th class="px-2">Category</th>
              <th class="px-2">Account</th>
              <th class="px-2 text-right">Amount</th>
              <th class="px-2 text-right">&nbsp;</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let tx of pagedFiltered" class="align-top border-t border-border">
              <td class="align-top px-2 py-2">{{tx.date | date:'shortDate'}}</td>
              <td class="align-top px-2 py-2"><div class="truncate max-w-[220px] sm:max-w-none">{{tx.description}}</div></td>
              <td class="align-top px-2 py-2">
                <div *ngIf="tx.receiptId" class="flex items-center justify-center">
                  <button class="p-0 rounded-md" (click)="viewReceipt(tx)">
                    <img [src]="receiptPreviewMap[tx.receiptId] || ''" alt="receipt" class="object-cover rounded-md border border-border" [ngClass]="{'w-14 h-10 sm:w-20 sm:h-14': true}" />
                  </button>
                </div>
              </td>
              <td class="align-top px-2 py-2">{{getCategoryName(tx.categoryId)}}</td>
              <td class="align-top px-2 py-2">{{getAccountName(tx.accountId)}}</td>
              <td class="text-right align-top px-2 py-2">{{tx.type === 'expense' ? '-' : ''}}{{tx.amount | number:'1.2-2'}}</td>
              <td class="text-right px-2 py-2">
                <div class="flex items-center justify-end gap-2 whitespace-nowrap">
                  <button class="btn-outline" (click)="edit(tx)">Edit</button>
                  <button class="btn-outline" (click)="del(tx)">Delete</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="mt-3 flex items-center justify-center">
        <nav class="inline-flex items-center rounded-md border border-border divide-x">
          <button class="px-3 py-1 disabled:opacity-50" [disabled]="pageIndex===0" (click)="goPrev()">Prev</button>
          <div class="flex">
            <button *ngFor="let p of pageButtons()" (click)="goTo(p-1)" [ngClass]="pageIndex===p-1 ? 'px-3 py-1 bg-primary text-white' : 'px-3 py-1'">{{p}}</button>
          </div>
          <button class="px-3 py-1 disabled:opacity-50" [disabled]="pageIndex>=totalPages()-1" (click)="goNext()">Next</button>
        </nav>
      </div>

      <!-- image preview modal with gestures/zoom -->
      <div *ngIf="previewOpen" class="app-modal">
        <div class="backdrop" (click)="closePreview()"></div>
        <div class="modal-content relative max-w-[95%] max-h-[95%] p-4 flex items-center justify-center">
          <button class="absolute -top-4 -right-4 bg-card rounded-full p-2 shadow" (click)="closePreview()" aria-label="Close">✕</button>

          <div class="touch-pan-zoom relative" tabindex="0"
               (wheel)="onWheel($event)"
               (keydown)="onKey($event)"
               (pointerdown)="onPointerDown($event)"
               (pointermove)="onPointerMove($event)"
               (pointerup)="onPointerUp($event)"
               (pointercancel)="onPointerUp($event)"
               (touchstart)="onTouchStart($event)"
               (touchmove)="onTouchMove($event)"
               (touchend)="onTouchEnd($event)">
            <img [src]="previewUrl" alt="receipt preview" [style.transform]="transformStyle()"
                 class="max-h-[80vh] max-w-[90vw] object-contain rounded-md border border-border shadow transition-transform" />
          </div>
        </div>
      </div>

      <!-- Transaction modal (used for New/Edit) -->
      <div *ngIf="editingTx" class="app-modal">
        <div class="backdrop" (click)="cancel()"></div>
        <div class="modal-content card p-4 max-w-2xl w-[95%]">
          <button class="absolute -top-4 -right-4 bg-card rounded-full p-2 shadow" (click)="cancel()" aria-label="Close">✕</button>
          <h4 class="font-semibold">{{isEditing ? 'Edit' : 'New'}} Transaction</h4>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
            <div>
              <label class="text-sm text-muted-foreground">Date</label>
              <input type="date" class="input mt-1" [(ngModel)]="editingTx.date" />
            </div>
            <div>
              <label class="text-sm text-muted-foreground">Amount</label>
              <input type="number" class="input mt-1" [(ngModel)]="editingTx.amount" />
            </div>
            <div>
              <label class="text-sm text-muted-foreground">Type</label>
              <select class="input mt-1" [(ngModel)]="editingTx.type">
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </div>
            <div>
              <label class="text-sm text-muted-foreground">Account</label>
              <select class="input mt-1" [(ngModel)]="editingTx.accountId">
                <option *ngFor="let a of accounts" [value]="a.id">{{a.name}}</option>
              </select>
            </div>
            <div>
              <label class="text-sm text-muted-foreground">Category</label>
              <select class="input mt-1" [(ngModel)]="editingTx.categoryId">
                <option [ngValue]="null">—</option>
                <option *ngFor="let c of categories" [value]="c.id">{{c.name}}</option>
              </select>
            </div>
            <div>
              <label class="text-sm text-muted-foreground">Receipt</label>
              <input type="file" class="mt-1" (change)="onReceipt($event)" />
              <div *ngIf="previewUrl" class="mt-2">
                <img [src]="previewUrl" class="max-h-48 rounded-md border border-border" />
              </div>
            </div>
            <div class="sm:col-span-2">
              <label class="text-sm text-muted-foreground">Description</label>
              <input class="input mt-1" [(ngModel)]="editingTx.description" />
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
export class TransactionsPage {
  transactions: any[] = [];
  filtered: any[] = [];
  pagedFiltered: any[] = [];
  accounts: any[] = [];
  categories: any[] = [];
  query = '';
  pageSize = 10;
  pageIndex = 0;

  // modal form state
  editingTx: any = null;
  isEditing = false;
  form: any = { date: '', amount: 0, type: 'expense', accountId: null, categoryId: null, description: '', receiptFile: null, receiptId: null };
  previewUrl: string | null = null;
  previewOpen = false;
  receiptPreviewMap: Record<number, string> = {};

  // gesture/zoom state
  zoom = 1;
  minZoom = 1;
  maxZoom = 4;
  panX = 0;
  panY = 0;
  private pointerActive = false;
  private lastPointer: { x: number; y: number } | null = null;
  private touchPinch = false;
  private pinchStartDist = 0;
  private pinchStartZoom = 1;

  constructor(private ds: DataService, private renderer: Renderer2, private toast: ToastService, private sidebar: SidebarService) {
    this.ds.transactions$.subscribe(v => { this.transactions = v as any[]; this.applyFilter(); this._ensureReceiptPreviews(v || []); this._updatePaged(); });
    this.ds.accounts$.subscribe(a => this.accounts = a as any[]);
    this.ds.categories$.subscribe(c => this.categories = c as any[]);
  }

  private async _ensureReceiptPreviews(txList: any[]) {
    for (const t of txList) {
      if (t.receiptId && !this.receiptPreviewMap[t.receiptId]) {
        try {
          const url = await this.ds.getReceiptUrl(t.receiptId);
          if (url) this.receiptPreviewMap[t.receiptId] = url;
        } catch (e) { /* ignore */ }
      }
    }
  }

  // revoke object URLs when component destroyed
  ngOnDestroy(): void {
    for (const id of Object.keys(this.receiptPreviewMap)) {
      try { URL.revokeObjectURL(this.receiptPreviewMap[Number(id)]); } catch (e) {}
    }
  }

  applyFilter() {
    const q = this.query.toLowerCase().trim();
    if (!q) this.filtered = this.transactions.slice();
    else this.filtered = this.transactions.filter(t => (t.description || '').toLowerCase().includes(q) || (t.tags || []).join(' ').toLowerCase().includes(q));
    this.pageIndex = 0;
    this._updatePaged();
  }

  private _updatePaged() {
    const start = this.pageIndex * this.pageSize;
    this.pagedFiltered = this.filtered.slice(start, start + this.pageSize);
  }

  // pagination helpers
  totalPages() {
    if (!this.filtered || this.filtered.length === 0) return 0;
    return Math.ceil(this.filtered.length / this.pageSize);
  }

  pageButtons(): number[] {
    const total = this.totalPages();
    if (total === 0) return [];
    const current = this.pageIndex + 1;
    let start = 1;
    if (current <= 3) start = 1;
    else start = current - 2;
    let end = Math.min(total, start + 2);
    if (end - start < 2) start = Math.max(1, end - 2);
    const out: number[] = [];
    for (let i = start; i <= end; i++) out.push(i);
    return out;
  }

  goTo(index: number) {
    this.pageIndex = Math.max(0, Math.min(index, this.totalPages()-1));
    this._updatePaged();
  }

  goPrev() { if (this.pageIndex > 0) { this.pageIndex--; this._updatePaged(); } }
  goNext() { if (this.pageIndex < this.totalPages()-1) { this.pageIndex++; this._updatePaged(); } }

  getCategoryName(id: number) { return this.categories.find(c => c.id === id)?.name ?? '-'; }
  getAccountName(id: number) { return this.accounts.find(a => a.id === id)?.name ?? '-'; }

  openNew() { this.resetForm(); this.isEditing = false; this.previewUrl = null; this.previewOpen = false; this.editingTx = { ...this.form }; try { this.sidebar.set(false); } catch (e) {} }
  async edit(tx: any) {
    this.form = { ...tx };
    this.isEditing = true;
    this.previewUrl = null; this.previewOpen = false;
    if (tx.receiptId) {
      this.previewUrl = await this.ds.getReceiptUrl(tx.receiptId);
    }
    this.editingTx = { ...this.form };
    try { this.sidebar.set(false); } catch (e) {}
  }
  cancel() { this.editingTx = null; this.resetForm(); this.previewUrl = null; this.previewOpen = false; }

  resetForm() { this.form = { date: new Date().toISOString().slice(0,10), amount: 0, type: 'expense', accountId: this.accounts[0]?.id ?? null, categoryId: null, description: '', receiptFile: null, receiptId: null }; }

  async save() {
    const t = { ...this.editingTx };
    t.amount = Number(t.amount);
    try {
      if (t.receiptFile) {
        const rid = await this.ds.addReceipt(t.receiptFile);
        t.receiptId = rid;
        this.previewUrl = await this.ds.getReceiptUrl(rid);
      }
      const savedId = await this.ds.upsertTransaction({ ...t, createdAt: t.createdAt ?? new Date().toISOString(), updatedAt: new Date().toISOString() });
      // ensure immediate preview availability for the newly saved transaction
      if (t.receiptId) {
        try {
          const url = this.previewUrl || (await this.ds.getReceiptUrl(t.receiptId)) || '';
          this.receiptPreviewMap[t.receiptId] = url;
        } catch (e) { /* ignore */ }
      }
      this.toast.success('Transaction saved');
      this.editingTx = null; this.resetForm();
    } catch (e) {
      console.error('Failed saving transaction', e);
      this.toast.error('Failed to save transaction');
    }
  }

  async del(tx: any) {
    if (!confirm('Move this transaction to trash?')) return;
    try {
      await this.ds.softDeleteTransaction(tx.id);
      this.toast.success('Transaction moved to trash');
    } catch (e) {
      console.error('Failed deleting transaction', e);
      this.toast.error('Failed to delete transaction');
    }
  }

  onReceipt(e: any) { const f = e.target.files?.[0]; if (!f) return; if (this.editingTx) { this.editingTx.receiptFile = f; this.previewUrl = URL.createObjectURL(f); } else { this.form.receiptFile = f; this.previewUrl = URL.createObjectURL(f); } }

  async viewReceipt(tx: any) {
    if (!tx.receiptId) { this.toast.error('No receipt attached'); return; }
    const url = this.receiptPreviewMap[tx.receiptId] || await this.ds.getReceiptUrl(tx.receiptId);
    if (!url) { this.toast.error('Receipt not found'); return; }
    this.previewUrl = url;
    this.previewOpen = true;
    try { this.sidebar.set(false); } catch (e) {}
    try { document.body.classList.add('modal-open'); } catch (e) {}
    this.zoom = 1; this.panX = 0; this.panY = 0;
    // focus for keyboard events
    setTimeout(() => {
      const el = document.querySelector('.touch-pan-zoom') as HTMLElement | null;
      el?.focus();
    }, 50);
  }

  closePreview() { this.previewOpen = false; this.previewUrl = null; this.zoom = 1; this.panX = 0; this.panY = 0; try { document.body.classList.remove('modal-open'); } catch (e) {} }

  transformStyle() {
    return `translate(${this.panX}px, ${this.panY}px) scale(${this.zoom})`;
  }

  onWheel(e: WheelEvent) {
    if (!this.previewOpen) return;
    e.preventDefault();
    const delta = -e.deltaY * 0.001;
    const next = Math.min(this.maxZoom, Math.max(this.minZoom, this.zoom + delta));
    this.zoom = next;
  }

  onKey(e: KeyboardEvent) {
    if (!this.previewOpen) return;
    if (e.key === 'Escape') this.closePreview();
    if (e.key === '+') this.zoom = Math.min(this.maxZoom, this.zoom + 0.25);
    if (e.key === '-') this.zoom = Math.max(this.minZoom, this.zoom - 0.25);
  }

  onPointerDown(e: PointerEvent) {
    if (!this.previewOpen) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    this.pointerActive = true;
    this.lastPointer = { x: e.clientX, y: e.clientY };
  }

  onPointerMove(e: PointerEvent) {
    if (!this.previewOpen || !this.pointerActive || !this.lastPointer) return;
    const dx = e.clientX - this.lastPointer.x;
    const dy = e.clientY - this.lastPointer.y;
    this.panX += dx; this.panY += dy;
    this.lastPointer = { x: e.clientX, y: e.clientY };
  }

  onPointerUp(e: PointerEvent) {
    this.pointerActive = false; this.lastPointer = null;
  }

  onTouchStart(e: TouchEvent) {
    if (!this.previewOpen) return;
    if (e.touches.length === 2) {
      this.touchPinch = true;
      this.pinchStartDist = this._distanceBetweenTouches(e.touches[0], e.touches[1]);
      this.pinchStartZoom = this.zoom;
    }
  }

  onTouchMove(e: TouchEvent) {
    if (!this.previewOpen) return;
    if (this.touchPinch && e.touches.length === 2) {
      const dist = this._distanceBetweenTouches(e.touches[0], e.touches[1]);
      const factor = dist / this.pinchStartDist;
      this.zoom = Math.min(this.maxZoom, Math.max(this.minZoom, this.pinchStartZoom * factor));
    }
  }

  onTouchEnd(e: TouchEvent) {
    if (!this.previewOpen) return;
    if (this.touchPinch) {
      this.touchPinch = false; return;
    }
    // swipe down to close
    // simplistic: if total panY > 150 close
    if (this.panY > 150) this.closePreview();
  }

  private _distanceBetweenTouches(a: Touch, b: Touch) {
    return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
  }

  async onCsv(e: any) {
    const f = e.target.files?.[0];
    if (!f) return;
    const Papa = (await import('papaparse')).default;
    Papa.parse(f, {
      header: true,
      complete: async (results: any) => {
        const data = results.data as any[];
        // simple mapping: date, amount, type, description
        for (const row of data) {
          const now = new Date().toISOString();
          const tx: any = {
            type: ((row.type || 'expense').toString().toLowerCase().includes('inc') ? 'income' : 'expense') as any,
            date: row.date || now,
            amount: Number(row.amount) || 0,
            currency: 'USD',
            accountId: this.accounts[0]?.id ?? 1,
            categoryId: null,
            description: row.description || row.memo || '',
            createdAt: now,
            updatedAt: now,
          };
          await this.ds.upsertTransaction(tx);
        }
        this.toast.success('Imported CSV rows: ' + data.length, 'Import');
      }
    });
  }

  async exportCsv() {
    const rows = this.transactions.map(t => ({ date: t.date, type: t.type, amount: t.amount, description: t.description }));
    const Papa = (await import('papaparse')).default;
    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const { saveAs } = await import('file-saver');
    saveAs(blob, 'transactions.csv');
  }
}
