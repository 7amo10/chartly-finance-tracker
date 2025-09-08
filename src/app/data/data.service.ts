import { Injectable, inject } from '@angular/core';
import { liveQuery } from 'dexie';
import { db } from './db';
import { Account, AuditLog, Budget, Category, Receipt, Settings, Transaction } from './models';

@Injectable({ providedIn: 'root' })
export class DataService {
  private _db = db;

  // Live queries
  accounts$ = liveQuery(() => this._db.accounts.toArray());
  categories$ = liveQuery(() => this._db.categories.toArray());
  transactions$ = liveQuery(() => this._db.transactions.filter(t => !t.deletedAt).toArray());
  deletedTransactions$ = liveQuery(() => this._db.transactions.filter(t => !!t.deletedAt).toArray());
  budgets$ = liveQuery(() => this._db.budgets.toArray());
  settings$ = liveQuery(() => this._db.settings.get('singleton'));

  async upsertAccount(a: Account) {
    const now = new Date().toISOString();
    if (!a.createdAt) a.createdAt = now;
    const id = await this._db.accounts.put(a);
    await this.log('account', id, a.id ? 'update' : 'create', null, a);
    return id;
  }

  async deleteAccount(id: number) {
    const before = await this._db.accounts.get(id);
    await this._db.accounts.delete(id);
    await this.log('account', id, 'delete', before, null);
  }

  async upsertCategory(c: Category) {
    const now = new Date().toISOString();
    if (!c.createdAt) c.createdAt = now;
    const id = await this._db.categories.put(c);
    await this.log('category', id, c.id ? 'update' : 'create', null, c);
    return id;
  }

  // helper to apply delta to aggregates for a single transaction
  private async _applyAggregateDelta(t: Transaction, multiplier: number) {
    const month = (typeof t.date === 'string' ? t.date.slice(0,7) : new Date(t.date).toISOString().slice(0,7));
    // monthly + category updates in a single transaction
    const cid = t.categoryId ? Number(t.categoryId) : 0;
    await this._db.transaction('rw', this._db.monthlyTotals, this._db.categoryTotals, async () => {
      const existing = await this._db.monthlyTotals.get(month);
      const income = (existing?.income || 0) + (t.type === 'income' ? multiplier * Number(t.amount || 0) : 0);
      const expense = (existing?.expense || 0) + (t.type === 'expense' ? multiplier * Number(t.amount || 0) : 0);
      await this._db.monthlyTotals.put({ month, income, expense });

      const existingCat = await this._db.categoryTotals.where('categoryId').equals(cid).first();
      const amt = (existingCat?.amount || 0) + (t.type === 'expense' ? multiplier * Number(t.amount || 0) : 0);
      if (existingCat) {
        await this._db.categoryTotals.update(existingCat.categoryId, { amount: amt });
      } else {
        await this._db.categoryTotals.add({ categoryId: cid, amount: amt });
      }
    });
  }

  async upsertTransaction(t: Transaction) {
    const now = new Date().toISOString();
    t.updatedAt = now;
    if (!t.createdAt) t.createdAt = now;

    // detect existing
    let before: Transaction | undefined = undefined;
    if (t.id) before = await this._db.transactions.get(t.id);

    await this._db.transaction('rw', this._db.tables, async () => {
      const id = await this._db.transactions.put(t);
      // update aggregates: if before existed, remove its effect, then add new
      if (before) await this._applyAggregateDelta(before, -1);
      await this._applyAggregateDelta(t, 1);
      await this.log('transaction', id, before ? 'update' : 'create', before ?? null, t);
    });

    return t.id;
  }

  async softDeleteTransaction(id: number) {
    const before = await this._db.transactions.get(id);
    if (!before) return;
    await this._db.transaction('rw', this._db.tables, async () => {
      await this._db.transactions.update(id, { deletedAt: new Date().toISOString() });
      // remove effect from aggregates
      await this._applyAggregateDelta(before, -1);
      const after = await this._db.transactions.get(id);
      await this.log('transaction', id, 'delete', before, after!);
    });
  }

  async restoreTransaction(id: number) {
    const before = await this._db.transactions.get(id);
    if (!before) return;
    await this._db.transaction('rw', this._db.tables, async () => {
      await this._db.transactions.update(id, { deletedAt: null });
      // re-apply effect
      await this._applyAggregateDelta(before, 1);
      const after = await this._db.transactions.get(id);
      await this.log('transaction', id, 'restore', before!, after!);
    });
  }

  /** Rebuild aggregates using a Web Worker for heavy compute */
  async rebuildAggregatesUsingWorker(progressCb?: (pct:number)=>void) {
    // read all transactions (this is occasional)
    const txs = await this._db.transactions.toArray();
    // spawn worker
    const worker = new Worker(new URL('../workers/aggregator.worker.ts', import.meta.url), { type: 'module' });
    return new Promise<void>((resolve, reject) => {
      const onMessage = async (ev: any) => {
        const d = ev.data;
        if (d.type === 'progress') {
          if (progressCb) progressCb(d.pct);
          return;
        }
        if (d.type === 'result') {
          try {
            await this._db.transaction('rw', this._db.monthlyTotals, this._db.categoryTotals, async () => {
              await this._db.monthlyTotals.clear();
              await this._db.categoryTotals.clear();
              for (const m of d.months) await this._db.monthlyTotals.put(m);
              for (const c of d.categories) await this._db.categoryTotals.add(c);
            });
            worker.terminate();
            resolve();
          } catch (e) { worker.terminate(); reject(e); }
        }
      };
      worker.addEventListener('message', onMessage);
      worker.addEventListener('error', (e)=>{ worker.terminate(); reject(e); });
      // send data
      worker.postMessage({ action: 'rebuild', transactions: txs });
    });
  }

  /** Fast read helpers from caches */
  async cachedMonthlySeries(months: string[]) {
    const res = await this._db.monthlyTotals.bulkGet(months);
    const incomeSeries = months.map((m, i) => Number(res[i]?.income || 0));
    const expenseSeries = months.map((m, i) => Number(res[i]?.expense || 0));
    const totalIncome = incomeSeries.reduce((s,n)=>s+n,0);
    const totalExpense = expenseSeries.reduce((s,n)=>s+n,0);
    return { incomeSeries, expenseSeries, totalIncome, totalExpense };
  }

  async cachedCategoryTotals(limit = 8) {
    const cats = await this._db.categoryTotals.orderBy('amount').reverse().limit(limit).toArray();
    return cats; // array of {categoryId, amount}
  }

  async upsertBudget(b: Budget) {
    const now = new Date().toISOString();
    if (!b.createdAt) b.createdAt = now;
    const id = await this._db.budgets.put(b);
    await this.log('budget', id, b.id ? 'update' : 'create', null, b);
    return id;
  }

  async deleteBudget(id: number) {
    const before = await this._db.budgets.get(id);
    await this._db.budgets.delete(id);
    await this.log('budget', id, 'delete', before, null);
  }

  async saveSettings(s: Settings) {
    await this._db.settings.put(s);
    await this.log('settings', 'singleton', 'update', null, s);
  }

  async addReceipt(file: File): Promise<number> {
    const blob = new Blob([await file.arrayBuffer()], { type: file.type });
    const r: Receipt = {
      blob,
      mimeType: file.type,
      size: file.size,
      createdAt: new Date().toISOString(),
    };
    const id = await this._db.receipts.add(r);
    await this.log('receipt', id, 'create', null, { id, size: r.size, mimeType: r.mimeType } as any);
    return id;
  }

  async getReceiptUrl(id: number): Promise<string | null> {
    const r = await this._db.receipts.get(id);
    if (!r) return null;
    return URL.createObjectURL(r.blob);
  }

  async exportJSON(): Promise<Blob> {
    const dump = {
      accounts: await this._db.accounts.toArray(),
      categories: await this._db.categories.toArray(),
      transactions: await this._db.transactions.toArray(),
      budgets: await this._db.budgets.toArray(),
      settings: await this._db.settings.toArray(),
      receipts: await this._db.receipts.toArray(),
      auditLogs: await this._db.auditLogs.toArray(),
    };
    await this.log('settings', 'singleton', 'export', null, { size: JSON.stringify(dump).length } as any);
    return new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' });
  }

  async importJSON(file: File) {
    const text = await file.text();
    const data = JSON.parse(text);
    await this._db.transaction('rw', this._db.tables, async () => {
      if (data.accounts) await this._db.accounts.clear().then(() => this._db.accounts.bulkAdd(data.accounts));
      if (data.categories) await this._db.categories.clear().then(() => this._db.categories.bulkAdd(data.categories));
      if (data.transactions) await this._db.transactions.clear().then(() => this._db.transactions.bulkAdd(data.transactions));
      if (data.budgets) await this._db.budgets.clear().then(() => this._db.budgets.bulkAdd(data.budgets));
      if (data.settings) await this._db.settings.clear().then(() => this._db.settings.bulkAdd(data.settings));
      if (data.receipts) await this._db.receipts.clear().then(() => this._db.receipts.bulkAdd(data.receipts));
      await this.log('settings', 'singleton', 'import', null, { keys: Object.keys(data) } as any);
    });
  }

  async purgeAll() {
    await this._db.transaction('rw', this._db.tables, async () => {
      for (const table of this._db.tables) await table.clear();
    });
    await this.log('settings', 'singleton', 'purge', null, null);
  }

  async balancesByAccount(): Promise<{ accountId: number; balance: number; currency: string }[]> {
    const accounts = await this._db.accounts.toArray();
    const result: { accountId: number; balance: number; currency: string }[] = [];
    for (const a of accounts) {
      const txs = await this._db.transactions.where('accountId').equals(a.id!).filter((t: any) => !t.deletedAt).toArray();
      const balance = txs.reduce((sum: number, t: any) => sum + (t.type === 'expense' ? -Number(t.amount || 0) : Number(t.amount || 0)), 0);
      result.push({ accountId: a.id!, currency: a.currency, balance });
    }
    return result;
  }

  /**
   * Compute aggregates across transactions in the given ISO date range.
   * Returns monthly income/expense series aligned with provided months array,
   * period totals and a Map of categoryId -> expense amount.
   */
  async transactionAggregates(fromIso: string, toIso: string, months: string[]) {
    const incomeSeries = new Array(months.length).fill(0);
    const expenseSeries = new Array(months.length).fill(0);
    let periodIncome = 0;
    let periodExpense = 0;
    const byCat = new Map<number, number>();

    await this._db.transactions
      .where('date')
      .between(fromIso, toIso, true, true)
      .and((t: any) => !t.deletedAt)
      .each((t: any) => {
        const monthKey = (typeof t.date === 'string') ? t.date.slice(0,7) : new Date(t.date).toISOString().slice(0,7);
        const idx = months.indexOf(monthKey);
        if (idx >= 0) {
          if (t.type === 'income') incomeSeries[idx] += Number(t.amount || 0);
          if (t.type === 'expense') expenseSeries[idx] += Number(t.amount || 0);
        }
        if (t.type === 'income') periodIncome += Number(t.amount || 0);
        if (t.type === 'expense') periodExpense += Number(t.amount || 0);
        if (t.type === 'expense') {
          const cid = t.categoryId ? Number(t.categoryId) : 0;
          byCat.set(cid, (byCat.get(cid) || 0) + Number(t.amount || 0));
        }
      });

    return { incomeSeries, expenseSeries, periodIncome, periodExpense, byCat };
  }

  /**
   * Return recent transactions (most recent first) within date range, optionally limited.
   * Uses orderBy('date').reverse() with filter + limit to avoid materializing full arrays.
   */
  async recentTransactions(fromIso: string, toIso: string, limit = 8) {
    const coll = this._db.transactions.orderBy('date').reverse().filter((t: any) => {
      if (t.deletedAt) return false;
      return t.date >= fromIso && t.date <= toIso;
    });
    return await coll.limit(limit).toArray();
  }

  private async log(entity: AuditLog['entity'], entityId: any, action: AuditLog['action'], before: any, after: any) {
    const entry: AuditLog = {
      entity,
      entityId,
      action,
      timestamp: new Date().toISOString(),
      before: before ?? null,
      after: after ?? null,
    };
    await this._db.auditLogs.add(entry);
  }
}
