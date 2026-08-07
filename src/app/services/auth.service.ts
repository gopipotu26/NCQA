import { Injectable, signal, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';

export type UserRole = 'admin' | 'user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private platformId = inject(PLATFORM_ID);
  private router = inject(Router);

  private readonly STORAGE_KEY = 'ncqa_auth_user';
  /** Shared demo password for both accounts. */
  readonly password = 'sutherland@9';
  /** Valid demo usernames. */
  readonly users: UserRole[] = ['admin', 'user'];

  /** Currently logged-in role, or null when signed out. */
  currentUser = signal<UserRole | null>(this.restore());

  private restore(): UserRole | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    const v = localStorage.getItem(this.STORAGE_KEY);
    return v === 'admin' || v === 'user' ? v : null;
  }

  /** Attempts login. Returns true on success. */
  login(username: string, password: string): boolean {
    const uname = (username || '').trim().toLowerCase();
    if (password !== this.password) return false;
    if (uname !== 'admin' && uname !== 'user') return false;

    const role = uname as UserRole;
    this.currentUser.set(role);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(this.STORAGE_KEY, role);
    }
    return true;
  }

  logout() {
    this.currentUser.set(null);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem(this.STORAGE_KEY);
    }
    this.router.navigate(['/login']);
  }

  isAuthenticated(): boolean {
    return this.currentUser() !== null;
  }

  isAdmin(): boolean {
    return this.currentUser() === 'admin';
  }
}
