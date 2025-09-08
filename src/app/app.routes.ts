import { Routes } from '@angular/router';
import { ShellComponent } from './shell.component';
import { Component } from '@angular/core';

@Component({
  standalone: true,
  template: `<div class="card p-6 max-w-4xl mx-auto">
    <h2 class="text-2xl font-semibold">Welcome to Personal Finance Tracker</h2>
    <p class="text-muted-foreground mt-2">
      Use the navigation to explore the app. This demo focuses on offline-first
      storage, transactions, budgets, and admin tools.
    </p>
  </div>`,
})
class HomeComponent {}

@Component({
  standalone: true,
  template: `<div class="prose">
    <h2>Dashboard (Placeholder)</h2>
    <p>Charts and summaries will appear here.</p>
  </div>`,
})
class DashboardComponent {}

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  {
    path: 'app',
    component: ShellComponent,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./pages/dashboard.page').then((m) => m.DashboardPage),
      },
      {
        path: 'transactions',
        loadComponent: () =>
          import('./pages/transactions.page').then((m) => m.TransactionsPage),
      },
      {
        path: 'accounts',
        loadComponent: () =>
          import('./pages/accounts.page').then((m) => m.AccountsPage),
      },
      {
        path: 'categories',
        loadComponent: () =>
          import('./pages/categories.page').then((m) => m.CategoriesPage),
      },
      {
        path: 'budgets',
        loadComponent: () =>
          import('./pages/budgets.page').then((m) => m.BudgetsPage),
      },
      {
        path: 'reports',
        loadComponent: () =>
          import('./pages/reports.page').then((m) => m.ReportsPage),
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./pages/settings.page').then((m) => m.SettingsPage),
      },
      {
        path: 'trash',
        loadComponent: () =>
          import('./pages/trash.page').then((m) => m.TrashPage),
      },
    ],
  },
  {
    path: 'admin',
    loadComponent: () => import('./pages/admin.page').then((m) => m.AdminPage),
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login.page').then((m) => m.LoginPage),
  },
];
