import { Component, computed, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, RouterLink } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';
import { DataService } from './data/data.service';
import { BannerComponent } from './components/banner.component';
import { NotificationService } from './services/notification.service';
import { ToastComponent } from './components/toast.component';
import { SidebarService } from './services/sidebar.service';
import { AuthService } from './services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterModule, MatToolbarModule, MatIconModule, MatListModule, MatButtonModule, BannerComponent, ToastComponent],
  template: `
  <div class="min-h-screen flex flex-col">
    <mat-toolbar color="primary" class="!bg-transparent !px-4 sm:!px-6 border-b border-border bg-card">
      <div class="flex items-center gap-3">
        <button mat-icon-button (click)="toggleMobile()" class="sm:hidden p-2" aria-label="Open menu">
          <div class="hamburger" [class.open]="mobileOpen">
            <span></span><span></span><span></span>
          </div>
        </button>
        <div class="flex items-center gap-2">
          <img src="https://img.icons8.com/fluency/96/combo-chart.png" alt="Auric logo" class="w-10 h-10 rounded-lg object-cover" />
          <div class="hidden sm:block">
            <div class="text-lg font-semibold">Chartly Finance Tracker</div>
            <div class="text-xs text-muted-foreground">Offline-first • IndexedDB • PWA</div>
          </div>
        </div>
      </div>
      <div class="flex-1"></div>
      <div class="relative">
        <!-- Desktop / tablet: show inline controls -->
        <div class="hidden lg:flex items-center gap-2">
          <button mat-icon-button (click)="toggleTheme()" aria-label="Toggle theme">
            <span class="material-icons">dark_mode</span>
          </button>
          <ng-container *ngIf="(auth.currentUser$ | async) as user; else guestDesktop">
            <div class="flex items-center gap-2">
              <button type="button" class="btn-outline" (click)="logout()">Logout</button>
              <button mat-icon-button (click)="goAdmin()" aria-label="Open admin">
                <span class="material-icons">settings</span>
              </button>
            </div>
          </ng-container>
          <ng-template #guestDesktop>
            <button class="btn-outline" routerLink="/admin">Admin</button>
          </ng-template>
        </div>

        <!-- Mobile: collapse into account menu -->
        <div class="lg:hidden flex items-center">
          <button mat-icon-button (click)="toggleRightMenu()" aria-label="Open account menu" class="p-2">
            <span class="material-icons">more_vert</span>
          </button>
        </div>

        <!-- Account dropdown on mobile -->
        <div *ngIf="rightMenuOpen" class="account-menu-wrapper">
          <div class="account-menu-card">
            <button type="button" class="menu-item" (click)="toggleTheme(); closeRightMenu()"><span class="material-icons">dark_mode</span><span>Toggle theme</span></button>
            <ng-container *ngIf="(auth.currentUser$ | async) as user; else guestMobile">
              <button type="button" class="menu-item" (click)="logout(); closeRightMenu()">Logout</button>
              <button type="button" class="menu-item" (click)="goAdmin(); closeRightMenu()">Admin</button>
            </ng-container>
            <ng-template #guestMobile>
              <button type="button" class="menu-item" (click)="goAdmin(); closeRightMenu()">Admin</button>
            </ng-template>
          </div>
          <div class="account-menu-backdrop" (click)="closeRightMenu()"></div>
        </div>
      </div>
    </mat-toolbar>

    <app-banners></app-banners>
    <app-toasts></app-toasts>

    <!-- mobile overlay drawer -->
    <div class="mobile-drawer-backdrop" *ngIf="mobileOpen" (click)="toggleMobile()"></div>
    <aside class="mobile-drawer" [class.open]="mobileOpen">
      <div class="p-4 border-b border-border flex items-center justify-between">
        <div class="flex items-center gap-2">
          <img src="https://img.icons8.com/fluency/96/combo-chart.png" alt="Auric logo" class="w-10 h-10 rounded-lg object-cover" />
          <div>
            <div class="text-sm font-semibold">Chartly</div>
            <div class="text-xs text-muted-foreground">Finance Tracker</div>
          </div>
        </div>
        <button mat-icon-button (click)="toggleMobile()" aria-label="Close menu"><span class="material-icons">close</span></button>
      </div>
      <nav class="p-4 space-y-1">
        <a (click)="navTo('/app/dashboard')" class="block p-3 rounded-md hover:bg-muted flex items-center gap-3"><span class="material-icons">dashboard</span> Dashboard</a>
        <a (click)="navTo('/app/transactions')" class="block p-3 rounded-md hover:bg-muted flex items-center gap-3"><span class="material-icons">receipt_long</span> Transactions</a>
        <a (click)="navTo('/app/accounts')" class="block p-3 rounded-md hover:bg-muted flex items-center gap-3"><span class="material-icons">account_balance</span> Accounts</a>
        <a (click)="navTo('/app/categories')" class="block p-3 rounded-md hover:bg-muted flex items-center gap-3"><span class="material-icons">category</span> Categories</a>
        <a (click)="navTo('/app/budgets')" class="block p-3 rounded-md hover:bg-muted flex items-center gap-3"><span class="material-icons">savings</span> Budgets</a>
        <a (click)="navTo('/app/reports')" class="block p-3 rounded-md hover:bg-muted flex items-center gap-3"><span class="material-icons">bar_chart</span> Reports</a>
        <a (click)="navTo('/app/trash')" class="block p-3 rounded-md hover:bg-muted flex items-center gap-3"><span class="material-icons">delete</span> Trash</a>
        <a (click)="navTo('/app/settings')" class="block p-3 rounded-md hover:bg-muted flex items-center gap-3"><span class="material-icons">tune</span> Settings</a>
      </nav>
    </aside>

    <div class="flex flex-1">
      <!-- Desktop sidebar implemented as a regular aside to avoid legacy mat-sidenav rendering issues -->
      <aside *ngIf="(sidebar.open$ | async) && !isMobile" class="w-64 bg-card border-r border-border p-4 hidden sm:block fancy-sidenav open">
        <nav class="flex flex-col gap-2">
          <a routerLink="/app/dashboard" class="flex items-center gap-3 p-2 rounded-md hover:bg-muted"><span class="material-icons">dashboard</span> Dashboard</a>
          <a routerLink="/app/transactions" class="flex items-center gap-3 p-2 rounded-md hover:bg-muted"><span class="material-icons">receipt_long</span> Transactions</a>
          <a routerLink="/app/accounts" class="flex items-center gap-3 p-2 rounded-md hover:bg-muted"><span class="material-icons">account_balance</span> Accounts</a>
          <a routerLink="/app/categories" class="flex items-center gap-3 p-2 rounded-md hover:bg-muted"><span class="material-icons">category</span> Categories</a>
          <a routerLink="/app/budgets" class="flex items-center gap-3 p-2 rounded-md hover:bg-muted"><span class="material-icons">savings</span> Budgets</a>
          <a routerLink="/app/reports" class="flex items-center gap-3 p-2 rounded-md hover:bg-muted"><span class="material-icons">bar_chart</span> Reports</a>
          <a routerLink="/app/trash" class="flex items-center gap-3 p-2 rounded-md hover:bg-muted"><span class="material-icons">delete</span> Trash</a>
          <a routerLink="/app/settings" class="flex items-center gap-3 p-2 rounded-md hover:bg-muted"><span class="material-icons">tune</span> Settings</a>
        </nav>
      </aside>

      <main class="flex-1 p-4 sm:p-6">
        <router-outlet></router-outlet>
      </main>
    </div>

    <footer class="p-4 text-center text-xs text-muted-foreground border-t border-border bg-card">
      © Chartly Finance Tracker — data stored locally on this device. Backup recommended.
    </footer>
  </div>
  `,
  styles: [``]
})
export class ShellComponent {
  theme = signal<'light' | 'dark' | 'system'>('system');
  mobileOpen = false;
  isMobile = false;
  rightMenuOpen = false;

  constructor(public ds: DataService, private notifier: NotificationService, public sidebar: SidebarService, public auth: AuthService, public router: Router) {
    const saved = localStorage.getItem('theme') as 'light' | 'dark' | 'system' | null;
    if (saved) this.theme.set(saved);
    effect(() => {
      const t = this.theme();
      if (t === 'dark') document.documentElement.classList.add('dark');
      else document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', t);
    });

    // responsive detection
    this._updateIsMobile();
    window.addEventListener('resize', () => this._updateIsMobile());
  }

  private _updateIsMobile() {
    const mq = window.matchMedia('(max-width: 639px)');
    const mobile = mq.matches;
    this.isMobile = mobile;
    if (!this.isMobile) {
      // Ensure mobile drawer is closed when on desktop/tablet
      this.mobileOpen = false;
    } else {
      // When on mobile, ensure the desktop sidebar (managed by SidebarService) is closed
      try { this.sidebar.set(false); } catch (e) {}
    }
  }

  logout() { this.auth.logout().then(()=>{ this.router.navigate(['/login']); }).catch(e=>{ console.warn('logout failed', e); }); }

  toggleTheme() {
    const next = this.theme() === 'dark' ? 'light' : 'dark';
    this.theme.set(next);
  }

  toggleMobile() { this.mobileOpen = !this.mobileOpen; if (this.mobileOpen) { try { this.sidebar.set(false); } catch(e) {} } }
  navTo(path: string) { this.mobileOpen = false; try { this.sidebar.set(false); } catch(e) {} this.router.navigate([path]); }

  toggleRightMenu() { this.rightMenuOpen = !this.rightMenuOpen; }
  closeRightMenu() { this.rightMenuOpen = false; }

  goAdmin() { try { this.router.navigate(['/admin']); } catch (e) { console.warn('nav failed', e); } }
}
