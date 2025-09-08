import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { DataService } from '../data/data.service';
import { sha256Hex } from '../utils/crypto';

export interface AdminUser {
  email: string;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private _user$ = new BehaviorSubject<AdminUser | null>(null);
  readonly currentUser$ = this._user$.asObservable();

  constructor(private ds: DataService) {
    this._load();
  }

  private async _load() {
    try {
      const rec: any = await (this.ds as any)._db.admin.get('admin');
      if (rec && rec.email) {
        this._user$.next({ email: rec.email, createdAt: rec.createdAt });
        return;
      }
      // Seed a default admin for testing convenience if none exists
      const defaultEmail = 'admin@example.com';
      const defaultPassword = 'Password123!';
      const hash = await sha256Hex(defaultPassword);
      const now = new Date().toISOString();
      await (this.ds as any)._db.admin.put({
        id: 'admin',
        email: defaultEmail,
        passhash: hash,
        createdAt: now,
        updatedAt: now,
      });
      // Do not auto-login; just ensure credentials exist
      console.info('Seeded example admin:', defaultEmail);
    } catch (e) {
      console.warn('AuthService load error', e);
    }
  }

  get currentUserValue() {
    return (this._user$ as any).getValue
      ? (this._user$ as any).getValue()
      : null;
  }

  async register(email: string, password: string) {
    const hash = await sha256Hex(password || '');
    const now = new Date().toISOString();
    await (this.ds as any)._db.admin.put({
      id: 'admin',
      email: email.toLowerCase(),
      passhash: hash,
      createdAt: now,
      updatedAt: now,
    });
    this._user$.next({ email: email.toLowerCase(), createdAt: now });
  }

  async login(email: string, password: string) {
    const rec: any = await (this.ds as any)._db.admin.get('admin');
    if (!rec) throw new Error('No admin configured');
    const hash = await sha256Hex(password || '');
    const emailLower = (email || '').toLowerCase();

    // Support legacy records that may not have an email stored: allow login by password
    if (rec.passhash === hash && (rec.email === emailLower || !rec.email)) {
      // If legacy without email, persist the provided email for future logins
      if (!rec.email && emailLower) {
        try {
          const now = new Date().toISOString();
          await (this.ds as any)._db.admin.put({
            id: 'admin',
            email: emailLower,
            passhash: rec.passhash,
            createdAt: rec.createdAt || now,
            updatedAt: now,
          });
          console.info('Legacy admin record updated with email:', emailLower);
        } catch (e) {
          console.warn('Failed to update legacy admin email', e);
        }
      }
      this._user$.next({
        email: emailLower || rec.email,
        createdAt: rec.createdAt,
      });
      return true;
    }
    // Provide more helpful error messages for debugging
    if (rec.email && rec.email !== emailLower)
      throw new Error('Invalid credentials: email mismatch');
    throw new Error('Invalid credentials: password mismatch');
  }

  async logout() {
    this._user$.next(null);
  }

  /**
   * Restore a previously-saved admin record into IndexedDB and set the current user.
   * Used by admin clearCache flow to preserve admin credentials across cache clearing.
   */
  async restoreAdminRecord(rec: any) {
    if (!rec) return;
    try {
      await (this.ds as any)._db.admin.put(rec);
      if (rec.email)
        this._user$.next({
          email: rec.email,
          createdAt: rec.createdAt || new Date().toISOString(),
        });
    } catch (e) {
      console.warn('Failed to restore admin record', e);
    }
  }
}
