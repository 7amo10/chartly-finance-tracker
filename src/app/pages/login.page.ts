import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <div class="min-h-[70vh] flex items-center justify-center p-6">
    <div class="w-full max-w-md">
      <div class="card p-6">
        <h2 class="text-lg font-semibold mb-2">Admin Sign In</h2>
        <p class="text-sm text-muted-foreground mb-4">Sign in to access the Admin Panel. Your credentials are stored locally on this device.</p>

        <form (ngSubmit)="submit()" novalidate>
          <label class="text-sm text-muted-foreground">Email</label>
          <input class="input mt-1 mb-2" type="email" [(ngModel)]="email" name="email" [class.border-red-400]="emailTouched && !validEmail()" (blur)="emailTouched=true" placeholder="you@example.com" />
          <div *ngIf="emailTouched && !validEmail()" class="text-xs text-red-500 mb-2">Enter a valid email.</div>

          <label class="text-sm text-muted-foreground">Password</label>
          <input class="input mt-1 mb-2" type="password" [(ngModel)]="password" name="password" [class.border-red-400]="pwTouched && !validPassword()" (blur)="pwTouched=true" placeholder="Enter your password" />
          <div *ngIf="pwTouched && !validPassword()" class="text-xs text-red-500 mb-2">Password must be at least 8 characters.</div>

          <div class="flex items-center justify-between mt-4">
            <label class="flex items-center gap-2 text-sm">
              <input type="checkbox" [(ngModel)]="remember" name="remember" />
              Remember me
            </label>
            <div class="text-sm text-muted-foreground">Use your admin credentials to sign in.</div>
          </div>

          <div class="mt-4 flex items-center gap-2">
            <button class="btn-primary flex-1" [disabled]="loading">{{ loading ? 'Signing in...' : 'Sign In' }}</button>
            <button type="button" class="btn-outline" (click)="goBack()">Back</button>
          </div>
        </form>
      </div>
    </div>
  </div>
  `
})
export class LoginPage {
  email = localStorage.getItem('admin_remember') || '';
  password = '';
  remember = !!localStorage.getItem('admin_remember');
  loading = false;
  emailTouched = false;
  pwTouched = false;

  constructor(private auth: AuthService, private toast: ToastService, private router: Router) {}

  validEmail() { return !!this.email && this.email.includes('@'); }
  validPassword() { return !!this.password && this.password.length >= 8; }

  async submit() {
    this.emailTouched = true; this.pwTouched = true;
    if (!this.validEmail() || !this.validPassword()) { this.toast.warning('Please fix validation errors'); return; }
    this.loading = true;
    try {
      await this.auth.login(this.email, this.password);
      if (this.remember) localStorage.setItem('admin_remember', this.email);
      else localStorage.removeItem('admin_remember');
      this.toast.success('Signed in');
      await this.router.navigate(['/admin']);
    } catch (e: any) {
      console.error(e);
      this.toast.error(e?.message || 'Failed to sign in');
    } finally { this.loading = false; }
  }

  goHome() { this.router.navigate(['/']); }
  goBack() { this.router.navigate(['/app/dashboard']); }
}
