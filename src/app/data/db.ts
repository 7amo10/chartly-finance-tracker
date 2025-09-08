import Dexie, { Table } from 'dexie';
import { Account, AdminSecret, AuditLog, Budget, Category, Receipt, Settings, Transaction } from './models';

export class FinanceDB extends Dexie {
  accounts!: Table<Account, number>;
  categories!: Table<Category, number>;
  transactions!: Table<Transaction, number>;
  budgets!: Table<Budget, number>;
  receipts!: Table<Receipt, number>;
  settings!: Table<Settings, 'singleton'>;
  auditLogs!: Table<AuditLog, number>;
  admin!: Table<AdminSecret, 'admin'>;
  monthlyTotals!: Table<any, string>;
  categoryTotals!: Table<any, number>;

  constructor() {
    super('personal-finance-tracker');

    this.version(1).stores({
      accounts: '++id, name, type, currency, archived, createdAt',
      categories: '++id, name, parentId, createdAt',
      transactions: '++id, date, type, amount, accountId, categoryId, deletedAt, updatedAt',
      budgets: '++id, month, categoryId, accountId, limit',
      receipts: '++id, createdAt',
      settings: 'id',
      auditLogs: '++id, entity, entityId, action, timestamp',
      admin: 'id',
      monthlyTotals: '&month, income, expense',
      categoryTotals: '&categoryId, amount'
    });

    this.on('populate', async () => {
      const now = new Date().toISOString();
      await this.settings.put({
        id: 'singleton',
        theme: 'system',
        dateFormat: 'yyyy-MM-dd',
        numberFormat: 'en-US',
        defaultCurrency: 'USD',
        autosaveMs: 1000,
        backupScheduleDays: 7,
        demoMode: true,
      });
      await this.accounts.bulkAdd([
        { name: 'Cash Wallet', type: 'cash', currency: 'USD', createdAt: now },
        { name: 'Checking', type: 'bank', currency: 'USD', createdAt: now },
        { name: 'Credit Card', type: 'credit', currency: 'USD', createdAt: now },
      ]);
      const categories = [
        { name: 'Income', createdAt: now },
        { name: 'Food', createdAt: now },
        { name: 'Dining', parentId: 2, createdAt: now },
        { name: 'Groceries', parentId: 2, createdAt: now },
        { name: 'Transport', createdAt: now },
        { name: 'Fuel', parentId: 5, createdAt: now },
      ];
      await this.categories.bulkAdd(categories);
    });
  }
}

export const db = new FinanceDB();
