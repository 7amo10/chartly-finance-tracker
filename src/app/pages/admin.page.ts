import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../data/data.service';
import { sha256Hex, encryptJson, decryptBlob } from '../utils/crypto';
import { AuditLogComponent } from '../components/audit-log.component';
import { ToastService } from '../services/toast.service';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, AuditLogComponent],
  template: `
    <div class="admin-wrapper">
      <div class="admin-container" [class.expanded]="loggedIn()">
        <div class="card p-4 max-w-3xl mx-auto admin-section section-top">
          <h3 class="text-lg font-semibold">Admin Panel</h3>
          <p class="text-muted-foreground">
            Local-only admin: manage global categories, seed sample data, export
            full backup, purge data.
          </p>

          <div
            class="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 admin-credentials admin-section"
          >
            <div>
              <label class="text-sm text-muted-foreground">Admin Email</label>
              <input
                class="input mt-1"
                type="email"
                [(ngModel)]="adminEmail"
                placeholder="name@example.com"
              />
            </div>
            <div>
              <label class="text-sm text-muted-foreground">Password</label>
              <input
                class="input mt-1"
                type="password"
                [(ngModel)]="adminPassword"
                placeholder="Choose a strong password"
              />
            </div>
            <div class="flex items-end gap-2">
              <button class="btn-primary" (click)="register()">
                Set / Update Admin
              </button>
              <button class="btn-outline" (click)="login()" *ngIf="!loggedIn()">
                Login
              </button>
              <button class="btn-outline" (click)="logout()" *ngIf="loggedIn()">
                Logout
              </button>
              <button
                class="btn-outline"
                (click)="goBackToApp()"
                *ngIf="loggedIn()"
              >
                Back to app
              </button>
            </div>
          </div>
          <div class="mt-2 text-sm text-muted-foreground admin-section">
            Optionally seed a test admin or set your own admin credentials here.
          </div>
        </div>

        <div class="admin-section actions" *ngIf="loggedIn()">
          <div class="mt-4 flex gap-2">
            <button class="btn-outline" (click)="exportJSON()">
              Export JSON
            </button>
            <button class="btn-outline" (click)="exportEncrypted()">
              Export Encrypted
            </button>
            <button class="btn-outline" (click)="importFile()">
              Import JSON
            </button>
            <button class="btn-outline" (click)="openSeedModal()">
              Seed Sample Data
            </button>
            <button class="btn-outline" (click)="purge()">
              Purge All Data
            </button>
          </div>

          <!-- Seed confirmation modal -->
          <div
            *ngIf="seedModalOpen"
            class="app-modal"
            role="dialog"
            aria-modal="true"
          >
            <div class="backdrop" (click)="closeSeedModal()"></div>
            <div class="modal-content seed-modal-content card p-6">
              <h3 class="text-lg font-semibold">Seed LARGE Sample Dataset</h3>
              <p class="text-sm text-muted-foreground mt-2">
                This will add multiple accounts, categories (with
                subcategories), and up to 500 transactions across ~2 years to
                populate the dashboard. This operation should be faster now.
              </p>
              <div class="mt-4">
                <ul class="text-sm list-disc list-inside text-muted-foreground">
                  <li>Accounts: Checking, Savings, Cash Wallet, Credit Card</li>
                  <li>
                    Many categories & sub-categories (Food, Transport,
                    Entertainment...)
                  </li>
                  <li>Transactions: recurring incomes and daily expenses</li>
                </ul>
              </div>
              <div class="mt-4 flex items-center justify-end gap-2">
                <button
                  class="btn-outline"
                  (click)="closeSeedModal()"
                  [disabled]="seedInProgress"
                >
                  Cancel
                </button>
                <button
                  class="btn-primary"
                  (click)="confirmSeed()"
                  [disabled]="seedInProgress"
                >
                  <span *ngIf="!seedInProgress">Begin Seeding</span>
                  <span *ngIf="seedInProgress" class="flex items-center gap-2"
                    >Seeding...
                    <svg class="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle
                        class="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        stroke-width="4"
                        fill="none"
                      ></circle>
                      <path
                        class="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                      ></path></svg
                  ></span>
                </button>
              </div>
            </div>
          </div>

          <div class="mt-4 p-4 card admin-section">
            <h4 class="font-semibold">Admin Actions</h4>
            <p class="text-sm text-muted-foreground">
              You are authenticated. You can view audit logs or purge data.
            </p>

            <div class="mt-2 flex flex-col sm:flex-row sm:items-center gap-2">
              <button class="btn-outline" (click)="viewLogs()">
                Refresh Logs
              </button>
              <button
                class="btn-outline"
                (click)="clearCache()"
                [disabled]="clearing"
              >
                {{ clearing ? 'Clearing...' : 'Clear Cache & Reload' }}
              </button>
            </div>

            <div class="mt-4">
              <h5 class="font-semibold">
                Currency Rates (to {{ settings?.defaultCurrency || 'USD' }})
              </h5>
              <div class="text-sm text-muted-foreground">
                Enter rates as multiplier to convert from that currency to
                default currency. e.g. EUR:1.05 means 1 EUR = 1.05 USD
              </div>
              <div class="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div
                  *ngFor="let r of rates; let i = index"
                  class="flex items-center gap-2"
                >
                  <input
                    class="input"
                    [(ngModel)]="r.code"
                    placeholder="Currency code"
                  />
                  <input
                    class="input"
                    [(ngModel)]="r.rate"
                    type="number"
                    step="0.0001"
                  />
                  <button class="btn-outline" (click)="removeRate(i)">
                    Remove
                  </button>
                </div>
              </div>
              <div class="mt-2 flex items-center gap-2">
                <input
                  class="input"
                  placeholder="Code"
                  [(ngModel)]="newRate.code"
                />
                <input
                  class="input"
                  placeholder="Rate"
                  type="number"
                  step="0.0001"
                  [(ngModel)]="newRate.rate"
                />
                <button class="btn-primary" (click)="addRate()">
                  Add Rate
                </button>
              </div>
              <div class="mt-3">
                <button class="btn-primary" (click)="saveRates()">
                  Save Rates
                </button>
              </div>
            </div>

            <div class="mt-4">
              <audit-log-component></audit-log-component>
            </div>
          </div>
        </div>

        <ng-template #showLoginPrompt>
          <div class="mt-6 p-6 card text-center admin-section">
            <h4 class="font-semibold">Admin access required</h4>
            <p class="text-sm text-muted-foreground">
              You must sign in to access admin features.
            </p>
            <div class="mt-4 flex items-center justify-center gap-2">
              <a routerLink="/login" class="btn-primary">Sign In</a>
              <button class="btn-outline" (click)="goHome()">
                Back to App
              </button>
            </div>
          </div>
        </ng-template>
      </div>
    </div>
  `,
})
export class AdminPage {
  adminEmail = '';
  adminPassword = '';
  loggedIn = signal(false);
  settings: any = null;
  rates: { code: string; rate: number }[] = [];
  newRate: { code: string; rate: number } = { code: '', rate: 0 };

  clearing = false;
  seedModalOpen = false;
  seedInProgress = false;
  constructor(
    private ds: DataService,
    private toast: ToastService,
    private auth: AuthService,
    private router: Router,
  ) {
    // reflect auth state
    this.auth.currentUser$.subscribe((u) => this.loggedIn.set(!!u));
  }

  openSeedModal() {
    this.seedModalOpen = true;
  }
  closeSeedModal() {
    if (!this.seedInProgress) this.seedModalOpen = false;
  }
  async confirmSeed() {
    this.seedInProgress = true;
    try {
      await this.seed();
      this.seedInProgress = false;
      this.seedModalOpen = false;
      this.toast.success('Seeding completed');
    } catch (e) {
      this.seedInProgress = false;
      this.toast.error('Seeding failed: ' + ((e as any)?.message || String(e)));
    }
  }

  goHome() {
    this.router.navigate(['/']);
  }

  goBackToApp() {
    this.router.navigate(['/app/dashboard']);
  }

  async logout() {
    try {
      await this.auth.logout();
      this.toast.info('Logged out');
      await this.router.navigate(['/login']);
    } catch (e) {
      console.warn('logout failed', e);
      this.toast.error('Logout failed');
    }
  }

  async register() {
    if (!this.adminEmail || !this.adminPassword) {
      this.toast.warning('Enter email and password');
      return;
    }
    try {
      await this.auth.register(this.adminEmail, this.adminPassword);
      this.toast.success('Admin registered/updated. You are now logged in.');
      await this.loadSettingsAndRates();
    } catch (e) {
      console.error(e);
      this.toast.error('Failed to register admin');
    }
  }

  async login() {
    if (!this.adminEmail || !this.adminPassword) {
      this.toast.warning('Enter email and password');
      return;
    }
    try {
      await this.auth.login(this.adminEmail, this.adminPassword);
      this.toast.success('Admin login successful');
      await this.loadSettingsAndRates();
    } catch (e: any) {
      console.error(e);
      this.toast.error(e?.message || 'Login failed');
    }
  }

  async loadSettingsAndRates() {
    const s = await (this.ds as any)._db.settings.get('singleton');
    this.settings = s || {};
    const ratesObj: Record<string, number> = s?.currencyRates || {};
    this.rates = Object.keys(ratesObj).map((k) => ({
      code: k,
      rate: ratesObj[k],
    }));
  }

  addRate() {
    if (!this.newRate.code || !this.newRate.rate) {
      this.toast.warning('Enter code and rate');
      return;
    }
    this.rates.push({
      code: this.newRate.code.toUpperCase(),
      rate: Number(this.newRate.rate),
    });
    this.newRate = { code: '', rate: 0 };
  }

  removeRate(i: number) {
    this.rates.splice(i, 1);
  }

  async saveRates() {
    const s: any = (await (this.ds as any)._db.settings.get('singleton')) || {
      id: 'singleton',
    };
    s.currencyRates = {};
    for (const r of this.rates) s.currencyRates[r.code] = Number(r.rate);
    await this.ds.saveSettings(s);
    this.toast.success('Saved currency rates');
  }

  async clearCache() {
    if (this.clearing) return;
    this.clearing = true;
    this.toast.info('Clearing caches...');

    // preserve admin record so the admin user isn't locked out after clearing
    let adminRec: any = null;
    try {
      adminRec = await (this.ds as any)._db.admin.get('admin');
    } catch (e) {
      console.warn('Failed to read admin record before clearing', e);
    }

    try {
      // unregister service workers
      if ('serviceWorker' in navigator) {
        try {
          const regs = await navigator.serviceWorker
            .getRegistrations()
            .catch(() => []);
          await Promise.all(regs.map((r) => r.unregister()));
          this.toast.info('Service workers unregistered');
        } catch (e) {
          console.warn('Failed to unregister SW', e);
          this.toast.warning('Failed to unregister service workers');
        }
      }

      // delete caches
      if ('caches' in window) {
        try {
          const keys = await caches.keys();
          await Promise.all(keys.map((k) => caches.delete(k)));
          this.toast.info('Cache storage cleared');
        } catch (e) {
          console.warn('Failed to delete caches', e);
          this.toast.warning('Failed to delete cache storage');
        }
      }

      // clear storage except admin_remember (preserve remembered admin email)
      try {
        const remembered = localStorage.getItem('admin_remember');
        localStorage.clear();
        if (remembered) localStorage.setItem('admin_remember', remembered);
        sessionStorage.clear();
        this.toast.info(
          'Local/session storage cleared (admin_remember preserved)',
        );
      } catch (e) {
        console.warn('Failed to clear storage', e);
      }

      // Clear app data using the app's Dexie API (safe) while preserving the DB instance
      try {
        await this.ds.purgeAll();
        this.toast.info('App data cleared');
      } catch (e) {
        console.warn('Failed to purge app data via Dexie', e);
        this.toast.warning('Failed to fully clear app data');
      }

      // restore admin record if we had one
      if (adminRec) {
        try {
          await this.auth.restoreAdminRecord(adminRec);
          this.toast.info('Admin credentials preserved');
        } catch (e) {
          console.warn('Failed to restore admin record after clearing', e);
        }
      }

      this.toast.success('Cache cleared — reloading');
    } catch (err) {
      console.error('clearCache error', err);
      this.toast.error('Error while clearing cache');
    } finally {
      setTimeout(() => location.reload(), 300);
    }
  }

  async exportJSON() {
    const blob = await this.ds.exportJSON();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pft-backup.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  async exportEncrypted() {
    if (!this.adminPassword)
      return alert('Enter a password to encrypt the backup');
    const dump = await (this.ds as any)._db.transaction(
      'r',
      (this.ds as any)._db.tables,
      async () => {
        return {
          accounts: await (this.ds as any)._db.accounts.toArray(),
          categories: await (this.ds as any)._db.categories.toArray(),
          transactions: await (this.ds as any)._db.transactions.toArray(),
          budgets: await (this.ds as any)._db.budgets.toArray(),
          settings: await (this.ds as any)._db.settings.toArray(),
          receipts: await (this.ds as any)._db.receipts.toArray(),
          auditLogs: await (this.ds as any)._db.auditLogs.toArray(),
        };
      },
    );
    const blob = await encryptJson(dump, this.adminPassword);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pft-backup-encrypted.bin';
    a.click();
    URL.revokeObjectURL(url);
  }

  async importFile() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = async () => {
      const f = input.files?.[0];
      if (!f) return;
      await this.ds.importJSON(f);
      this.toast.success('Imported JSON backup');
    };
    input.click();
  }

  // Seeds large dataset (assumes user confirmed via modal)
  async seed() {
    this.toast.info('Seeding large dataset — this may take a moment...');
    const now = new Date();
    const start = new Date(now.getFullYear() - 2, now.getMonth(), 1); // ~24 months back

    // helper funcs
    const rand = (min: number, max: number) =>
      Math.random() * (max - min) + min;
    const pick = <T>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
    const fmt = (d: Date) => d.toISOString().slice(0, 10);

    // Define accounts
    const accounts = [
      { name: 'Checking Account', type: 'bank', currency: 'USD' },
      { name: 'Savings Account', type: 'bank', currency: 'USD' },
      { name: 'Cash Wallet', type: 'cash', currency: 'USD' },
      { name: 'Credit Card', type: 'credit', currency: 'USD' },
    ];

    // Categories with subcategories
    const categories = [
      { name: 'Income' },
      { name: 'Housing' },
      { name: 'Utilities' },
      { name: 'Food' },
      { name: 'Groceries', parentName: 'Food' },
      { name: 'Dining Out', parentName: 'Food' },
      { name: 'Transport' },
      { name: 'Fuel', parentName: 'Transport' },
      { name: 'Public Transport', parentName: 'Transport' },
      { name: 'Entertainment' },
      { name: 'Subscriptions', parentName: 'Entertainment' },
      { name: 'Healthcare' },
      { name: 'Shopping' },
      { name: 'Education' },
      { name: 'Misc' },
    ];

    // Generate transactions list
    const txs: any[] = [];

    // Monthly recurring incomes and bills
    const recurring = [] as any[];

    // Salary on 1st of each month
    for (let d = new Date(start); d <= now; d.setMonth(d.getMonth() + 1)) {
      recurring.push({
        date: new Date(d.getFullYear(), d.getMonth(), 1),
        type: 'income',
        amount: Math.round(rand(2500, 5000)),
        categoryName: 'Income',
      });
      recurring.push({
        date: new Date(d.getFullYear(), d.getMonth(), 3),
        type: 'expense',
        amount: Math.round(rand(800, 1600)),
        categoryName: 'Housing',
      });
      recurring.push({
        date: new Date(d.getFullYear(), d.getMonth(), 5),
        type: 'expense',
        amount: Math.round(rand(60, 180)),
        categoryName: 'Utilities',
      });
      recurring.push({
        date: new Date(d.getFullYear(), d.getMonth(), 10),
        type: 'expense',
        amount: Math.round(rand(10, 20)),
        categoryName: 'Subscriptions',
      });
    }

    // Daily varied transactions
    for (let d = new Date(start); d <= now; d.setDate(d.getDate() + 1)) {
      const dayCount =
        Math.random() < 0.3
          ? Math.floor(rand(0, 3))
          : Math.random() < 0.6
            ? Math.floor(rand(0, 2))
            : 0;
      for (let i = 0; i < dayCount; i++) {
        const type = Math.random() < 0.12 ? 'income' : 'expense';
        let amount = 0;
        let categoryName = 'Misc';
        if (type === 'income') {
          amount = Math.round(rand(50, 500));
          categoryName = 'Income';
        } else {
          categoryName = pick([
            'Groceries',
            'Dining Out',
            'Fuel',
            'Public Transport',
            'Entertainment',
            'Shopping',
            'Healthcare',
            'Misc',
          ]);
          switch (categoryName) {
            case 'Groceries':
              amount = Math.round(rand(8, 150));
              break;
            case 'Dining Out':
              amount = Math.round(rand(5, 120));
              break;
            case 'Fuel':
              amount = Math.round(rand(10, 80));
              break;
            case 'Public Transport':
              amount = Math.round(rand(1, 15));
              break;
            case 'Entertainment':
              amount = Math.round(rand(5, 100));
              break;
            case 'Shopping':
              amount = Math.round(rand(5, 400));
              break;
            case 'Healthcare':
              amount = Math.round(rand(10, 600));
              break;
            default:
              amount = Math.round(rand(1, 80));
          }
        }
        txs.push({
          date: new Date(d).toISOString().slice(0, 10),
          type,
          amount,
          categoryName,
        });
      }
    }

    // Merge recurring into txs
    for (const r of recurring)
      txs.push({
        date: fmt(r.date),
        type: r.type,
        amount: r.amount,
        categoryName: r.categoryName,
      });

    // Shuffle
    for (let i = txs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [txs[i], txs[j]] = [txs[j], txs[i]];
    }

    // Persist into DB
    try {
      await (this.ds as any)._db.transaction(
        'rw',
        (this.ds as any)._db.tables,
        async () => {
          const nowIso = new Date().toISOString();
          // accounts
          const accIds = [] as number[];
          for (const a of accounts) {
            const id = await (this.ds as any)._db.accounts.add({
              ...a,
              createdAt: nowIso,
            });
            accIds.push(id as number);
          }

          // categories with parent linking
          const catMap: Record<string, number> = {};
          for (const c of categories.filter((x) => !x.parentName)) {
            const id = await (this.ds as any)._db.categories.add({
              name: c.name,
              createdAt: nowIso,
            });
            catMap[c.name] = id as number;
          }
          for (const c of categories.filter((x) => x.parentName)) {
            const parentId = c.parentName ? catMap[c.parentName] : undefined;
            const id = await (this.ds as any)._db.categories.add({
              name: c.name,
              parentId,
              createdAt: nowIso,
            });
            catMap[c.name] = id as number;
          }

          // transactions (limit to avoid huge operations)
          const limit = Math.min(txs.length, 500);
          let added = 0;
          for (let i = 0; i < limit; i++) {
            const t = txs[i];
            const accountId = pick(accIds);
            const categoryId = catMap[t.categoryName] ?? null;
            const txRec: any = {
              type: t.type,
              date: t.date,
              amount: Number(t.amount),
              currency: 'USD',
              accountId,
              categoryId,
              description: t.type === 'income' ? 'Income' : t.categoryName,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            await (this.ds as any)._db.transactions.add(txRec);
            added++;
          }

          await this.ds.saveSettings({
            id: 'singleton',
            theme: 'system',
            dateFormat: 'yyyy-MM-dd',
            numberFormat: 'en-US',
            defaultCurrency: 'USD',
            autosaveMs: 1000,
            backupScheduleDays: 7,
            demoMode: true,
          });
          // audit log skipped (private method) — seed performed
        },
      );

      this.toast.success(
        'Large dataset seeded — open Dashboard to view charts',
      );
    } catch (e) {
      console.error('Seeding failed', e);
      this.toast.error('Seeding failed: ' + ((e as any)?.message || String(e)));
    }
  }

  async purge() {
    if (
      !confirm(
        'Are you sure you want to purge ALL local data? This cannot be undone.',
      )
    )
      return;
    await this.ds.purgeAll();
    this.toast.success('All data purged.');
  }

  async viewLogs() {
    const logs = await (this.ds as any)._db.auditLogs.toArray();
    console.log('Audit logs', logs);
    this.toast.info('Audit logs printed to console');
  }
}
