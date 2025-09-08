export type CurrencyCode = string; // ISO 4217 like 'USD', 'EUR'

export type AccountType = 'cash' | 'bank' | 'credit';

export interface Account {
  id?: number;
  name: string;
  type: AccountType;
  currency: CurrencyCode;
  archived?: boolean;
  createdAt: string; // ISO date
}

export interface Category {
  id?: number;
  name: string;
  parentId?: number | null;
  color?: string | null; // hex
  rules?: string[]; // keyword rules for auto-tagging
  createdAt: string;
}

export type TxType = 'income' | 'expense' | 'transfer';

export interface Transaction {
  id?: number;
  type: TxType;
  date: string; // ISO date
  amount: number; // positive number; sign determined by type
  currency: CurrencyCode;
  accountId: number;
  categoryId?: number | null;
  tags?: string[];
  description?: string;
  notes?: string;
  receiptId?: number | null;
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Budget {
  id?: number;
  month: string; // YYYY-MM
  categoryId?: number | null;
  accountId?: number | null;
  limit: number;
  alertThreshold?: number; // 0-1
  createdAt: string;
}

export interface Receipt {
  id?: number;
  blob: Blob;
  mimeType: string;
  size: number;
  createdAt: string;
}

export interface Settings {
  id: 'singleton';
  theme: 'light' | 'dark' | 'system';
  dateFormat: string; // e.g., 'yyyy-MM-dd'
  numberFormat: string; // e.g., 'en-US'
  defaultCurrency: CurrencyCode;
  autosaveMs: number;
  backupScheduleDays: number; // local reminder interval
  demoMode: boolean;
}

export interface AuditLog<T = unknown> {
  id?: number;
  entity: 'account' | 'transaction' | 'category' | 'budget' | 'settings' | 'receipt' | 'admin';
  entityId?: number | string | null;
  action: 'create' | 'update' | 'delete' | 'restore' | 'purge' | 'import' | 'export';
  timestamp: string;
  before?: T | null;
  after?: T | null;
}

export interface AdminSecret {
  id: 'admin';
  passhash: string; // hex sha-256
  createdAt: string;
  updatedAt: string;
}

export interface MonthlyAggregate {
  month: string; // YYYY-MM
  income: number;
  expense: number;
}

export interface CategoryAggregate {
  categoryId: number; // 0 for uncategorized
  amount: number; // expense total
}
