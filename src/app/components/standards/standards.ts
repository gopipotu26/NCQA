import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-standards',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, RouterLink],
  template: `
    <div class="space-y-10">
      <div class="flex justify-between items-end">
        <div>
          <h2 class="text-4xl font-extrabold text-slate-900 tracking-tight">NCQA 2025 Standards</h2>
          <p class="text-slate-500 mt-2 font-medium">Comprehensive guidelines for health plans and CVOs effective July 1, 2025.</p>
        </div>
        <button routerLink="/" class="btn-secondary flex items-center gap-2">
          <mat-icon>arrow_back</mat-icon>
          Back to Dashboard
        </button>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- Key Changes Section -->
        <div class="lg:col-span-2 space-y-8">
          <div class="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-10">
            <h3 class="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
              <mat-icon class="text-blue-600">update</mat-icon>
              2025 Standards Updates
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div class="p-6 bg-blue-50/50 rounded-2xl border border-blue-100/50">
                <p class="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-2">Accreditation Timeframe</p>
                <h4 class="text-2xl font-black text-slate-900 tracking-tight">120 Days</h4>
                <p class="text-xs text-slate-500 mt-2">Reduced from 180 days. All PSV must be completed within this window.</p>
              </div>
              <div class="p-6 bg-indigo-50/50 rounded-2xl border border-indigo-100/50">
                <p class="text-[10px] font-bold text-indigo-600 uppercase tracking-widest mb-2">CVO Certification</p>
                <h4 class="text-2xl font-black text-slate-900 tracking-tight">90 Days</h4>
                <p class="text-xs text-slate-500 mt-2">Reduced from 120 days for Credentialing Verification Organizations.</p>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-10">
            <h3 class="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
              <mat-icon class="text-blue-600">visibility</mat-icon>
              Mandatory Ongoing Monitoring
            </h3>
            <p class="text-sm text-slate-500 mb-8 leading-relaxed">
              NCQA now mandates monthly (at least every 30 days) monitoring of specific practitioner statuses between credentialing cycles.
            </p>
            <div class="space-y-4">
              <div class="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div class="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-blue-600 shadow-sm">
                  <mat-icon>gavel</mat-icon>
                </div>
                <div>
                  <p class="text-sm font-bold text-slate-900">Medicare/Medicaid Exclusions</p>
                  <p class="text-[10px] text-slate-400 uppercase tracking-widest">OIG LEIE & State Lists</p>
                </div>
              </div>
              <div class="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div class="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-blue-600 shadow-sm">
                  <mat-icon>badge</mat-icon>
                </div>
                <div>
                  <p class="text-sm font-bold text-slate-900">License Expiration Dates</p>
                  <p class="text-[10px] text-slate-400 uppercase tracking-widest">State Medical Boards</p>
                </div>
              </div>
              <div class="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div class="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-blue-600 shadow-sm">
                  <mat-icon>security</mat-icon>
                </div>
                <div>
                  <p class="text-sm font-bold text-slate-900">SAM.gov Exclusion Status</p>
                  <p class="text-[10px] text-slate-400 uppercase tracking-widest">System for Award Management</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Sidebar Section -->
        <div class="space-y-8">
          <div class="bg-slate-900 rounded-[2.5rem] p-10 text-white shadow-2xl">
            <h3 class="text-xl font-bold mb-6">Core Mandates</h3>
            <ul class="space-y-6">
              <li class="flex gap-4">
                <mat-icon class="text-blue-400 shrink-0">check_circle</mat-icon>
                <div>
                  <p class="text-sm font-bold">Primary Source Verification</p>
                  <p class="text-xs text-slate-400 mt-1">Direct verification of all specific practitioner credentials.</p>
                </div>
              </li>
              <li class="flex gap-4">
                <mat-icon class="text-blue-400 shrink-0">check_circle</mat-icon>
                <div>
                  <p class="text-sm font-bold">Qualified Committee Decisions</p>
                  <p class="text-xs text-slate-400 mt-1">Documented decisions by medical directors or committees.</p>
                </div>
              </li>
              <li class="flex gap-4">
                <mat-icon class="text-blue-400 shrink-0">check_circle</mat-icon>
                <div>
                  <p class="text-sm font-bold">36-Month Re-cred Cycles</p>
                  <p class="text-xs text-slate-400 mt-1">Cycles must not exceed 36 months for any practitioner.</p>
                </div>
              </li>
              <li class="flex gap-4">
                <mat-icon class="text-blue-400 shrink-0">check_circle</mat-icon>
                <div>
                  <p class="text-sm font-bold">Information Integrity</p>
                  <p class="text-xs text-slate-400 mt-1">Mandatory annual audits and strict control of data updates.</p>
                </div>
              </li>
            </ul>
          </div>

          <div class="bg-blue-50 rounded-[2.5rem] border border-blue-100 p-10">
            <h4 class="font-bold text-blue-600 mb-4 flex items-center gap-2">
              <mat-icon class="text-sm">info</mat-icon>
              Audit Readiness
            </h4>
            <p class="text-xs text-slate-600 leading-relaxed">
              AuditCore is pre-configured to flag any PSV completed outside the 120/90 day windows automatically.
            </p>
          </div>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Standards {}
