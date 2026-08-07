import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthService, UserRole } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
    <div class="min-h-screen w-full flex items-center justify-center bg-slate-50 font-sans p-4">
      <div class="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 rounded-3xl overflow-hidden shadow-2xl shadow-slate-300/50 bg-white">

        <!-- Left brand panel -->
        <div class="hidden lg:flex flex-col justify-between p-10 bg-gradient-to-br from-blue-600 to-indigo-700 text-white">
          <div class="flex items-center gap-3">
            <div class="w-11 h-11 bg-white/15 backdrop-blur rounded-xl flex items-center justify-center">
              <mat-icon class="text-white">verified_user</mat-icon>
            </div>
            <div>
              <h1 class="text-lg font-bold leading-tight">NCQA Automated</h1>
              <p class="text-[10px] text-blue-100 uppercase tracking-wider">Credentialing Audit</p>
            </div>
          </div>

          <div>
            <h2 class="text-3xl font-bold leading-snug mb-3">AI-Powered NCQA 2025 Credentialing</h2>
            <p class="text-sm text-blue-100 leading-relaxed">
              Automated element-by-element verification, primary source validation, and continuous monitoring — all in one place.
            </p>
          </div>

          <div class="flex items-center gap-2 text-xs text-blue-100">
            <mat-icon class="icon-sm">verified</mat-icon>
            <span>NCQA 2025 Ready • PSV 120 days • Monthly Monitoring</span>
          </div>
        </div>

        <!-- Right form panel -->
        <div class="p-8 sm:p-10 flex flex-col justify-center">
          <div class="mb-8">
            <h2 class="text-2xl font-bold text-slate-900">Welcome back</h2>
            <p class="text-sm text-slate-500 mt-1">Sign in to continue to your dashboard</p>
          </div>

          <form (ngSubmit)="submit()" class="space-y-5">
            <!-- Username -->
            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1.5">Username</label>
              <div class="relative">
                <mat-icon class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 icon-sm">person</mat-icon>
                <input type="text" name="username" [(ngModel)]="username" autocomplete="username"
                       placeholder="admin or user"
                       class="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all">
              </div>
            </div>

            <!-- Password -->
            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1.5">Password</label>
              <div class="relative">
                <mat-icon class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 icon-sm">lock</mat-icon>
                <input [type]="showPassword() ? 'text' : 'password'" name="password" [(ngModel)]="password"
                       autocomplete="current-password" placeholder="Enter password"
                       class="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all">
                <button type="button" (click)="showPassword.set(!showPassword())"
                        class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <mat-icon class="icon-sm">{{ showPassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
                </button>
              </div>
            </div>

            @if (error()) {
              <div class="flex items-center gap-2 px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                <mat-icon class="icon-sm">error_outline</mat-icon>
                {{ error() }}
              </div>
            }

            <button type="submit"
                    class="w-full py-2.5 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 text-white text-sm font-semibold shadow-lg shadow-blue-500/25 hover:from-blue-700 hover:to-indigo-700 transition-all flex items-center justify-center gap-2">
              <mat-icon class="icon-sm">login</mat-icon>
              Sign In
            </button>
          </form>

          <!-- Demo credentials -->
          <div class="mt-8 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <p class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-3">Demo Credentials</p>
            <div class="space-y-2">
              @for (u of auth.users; track u) {
                <button type="button" (click)="fill(u)"
                        class="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50/40 transition-colors text-left">
                  <div class="flex items-center gap-2">
                    <span class="w-6 h-6 rounded-md flex items-center justify-center text-white text-[10px] font-bold"
                          [ngClass]="u === 'admin' ? 'bg-indigo-600' : 'bg-emerald-600'">
                      {{ u === 'admin' ? 'A' : 'U' }}
                    </span>
                    <div class="text-xs">
                      <span class="font-semibold text-slate-700 capitalize">{{ u }}</span>
                      <span class="text-slate-400"> — {{ u === 'admin' ? 'Full access' : 'Limited (no Settings/Profile)' }}</span>
                    </div>
                  </div>
                  <div class="text-right">
                    <p class="text-[11px] font-mono text-slate-600">{{ u }}</p>
                    <p class="text-[11px] font-mono text-slate-400">{{ auth.password }}</p>
                  </div>
                </button>
              }
            </div>
            <p class="text-[10px] text-slate-400 mt-2.5">Click a card to auto-fill, then Sign In.</p>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class Login {
  auth = inject(AuthService);
  private router = inject(Router);

  username = '';
  password = '';
  showPassword = signal(false);
  error = signal('');

  fill(role: UserRole) {
    this.username = role;
    this.password = this.auth.password;
    this.error.set('');
  }

  submit() {
    this.error.set('');
    const ok = this.auth.login(this.username, this.password);
    if (!ok) {
      this.error.set('Invalid username or password.');
      return;
    }
    this.router.navigate(['/']);
  }
}
