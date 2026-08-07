import { ChangeDetectionStrategy, Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuditService } from '../../services/audit.service';
import { PractitionerFile, ComplianceTier, AuditStatus } from '../../services/audit.types';

@Component({
  selector: 'app-audit-list',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, RouterLink, FormsModule],
  template: `
    <div class="space-y-6">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-slate-900">All Audits</h1>
          <p class="text-slate-500 text-sm mt-1">{{ audits().length }} practitioner files audited</p>
        </div>
        <button routerLink="/upload" class="btn-primary flex items-center gap-2">
          <mat-icon>add</mat-icon>
          New Audit
        </button>
      </div>

      <!-- Filters & Search -->
      <div class="bg-white rounded-xl border border-slate-200 p-4">
        <div class="flex flex-col md:flex-row gap-4">
          <!-- Search -->
          <div class="flex-1 relative">
            <mat-icon class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 icon-sm">search</mat-icon>
            <input type="text" [(ngModel)]="searchQuery" placeholder="Search by name, NPI, or specialty..." 
                   class="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all">
          </div>
          
          <!-- Status Filter -->
          <div class="flex gap-2">
            <button (click)="statusFilter.set('all')" 
                    [class]="statusFilter() === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
                    class="px-4 py-2.5 rounded-lg text-sm font-medium transition-colors">
              All
            </button>
            <button (click)="statusFilter.set('Completed')" 
                    [class]="statusFilter() === 'Completed' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
                    class="px-4 py-2.5 rounded-lg text-sm font-medium transition-colors">
              Completed
            </button>
            <button (click)="statusFilter.set('In Progress')" 
                    [class]="statusFilter() === 'In Progress' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
                    class="px-4 py-2.5 rounded-lg text-sm font-medium transition-colors">
              In Progress
            </button>
            <button (click)="statusFilter.set('Failed')" 
                    [class]="statusFilter() === 'Failed' ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
                    class="px-4 py-2.5 rounded-lg text-sm font-medium transition-colors">
              Failed
            </button>
          </div>
        </div>
      </div>

      <!-- Stats Summary -->
      <div class="hidden grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="bg-white rounded-xl border border-slate-200 p-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <mat-icon class="text-blue-600">folder</mat-icon>
            </div>
            <div>
              <p class="text-2xl font-bold text-slate-900">{{ audits().length }}</p>
              <p class="text-xs text-slate-500">Total Audits</p>
            </div>
          </div>
        </div>
        <div class="bg-white rounded-xl border border-slate-200 p-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
              <mat-icon class="text-emerald-600">check_circle</mat-icon>
            </div>
            <div>
              <p class="text-2xl font-bold text-emerald-600">{{ getCountByTier('FULLY_COMPLIANT') }}</p>
              <p class="text-xs text-slate-500">Fully Compliant</p>
            </div>
          </div>
        </div>
        <div class="bg-white rounded-xl border border-slate-200 p-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <mat-icon class="text-amber-600">pending</mat-icon>
            </div>
            <div>
              <p class="text-2xl font-bold text-amber-600">{{ getCountByTier('PARTIALLY_COMPLIANT') + getCountByTier('SUBSTANTIALLY_COMPLIANT') }}</p>
              <p class="text-xs text-slate-500">Needs Review</p>
            </div>
          </div>
        </div>
        <div class="bg-white rounded-xl border border-slate-200 p-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg bg-rose-100 flex items-center justify-center">
              <mat-icon class="text-rose-600">error</mat-icon>
            </div>
            <div>
              <p class="text-2xl font-bold text-rose-600">{{ getCountByTier('NON_COMPLIANT') }}</p>
              <p class="text-xs text-slate-500">Non-Compliant</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Audit Cards Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        @for (audit of filteredAudits(); track audit.id) {
          <div [routerLink]="['/audit', audit.id]" 
               class="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-lg hover:border-blue-200 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group">
            <!-- Header -->
            <div class="flex items-start justify-between mb-4">
              <div class="flex items-center gap-3">
                <div class="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-sm"
                     [ngClass]="getTierBgClass(audit.tier)">
                  {{ getInitials(audit.name) }}
                </div>
                <div>
                  <h3 class="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">{{ audit.name }}</h3>
                  <p class="text-xs text-slate-500">NPI: {{ audit.npi }}</p>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <span class="px-2.5 py-1 rounded-lg text-xs font-semibold"
                      [ngClass]="getStatusClass(audit.status)">
                  {{ audit.status }}
                </span>
                <button type="button"
                        (click)="deleteAudit(audit, $event)"
                        class="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors flex items-center justify-center"
                        title="Delete audit">
                  <mat-icon class="text-[18px]">delete</mat-icon>
                </button>
              </div>
            </div>
            
            <!-- Score -->
            <div class="mb-4">
              <div class="flex items-center justify-between mb-2">
                <span class="text-xs text-slate-500">Compliance Score</span>
                <span class="text-sm font-bold" [ngClass]="getScoreTextClass(audit.overallScore)">
                  {{ audit.overallScore || 0 }}%
                </span>
              </div>
              <div class="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div class="h-full rounded-full transition-all duration-500"
                     [ngClass]="getScoreBarClass(audit.overallScore)"
                     [style.width.%]="audit.overallScore || 0"></div>
              </div>
            </div>
            
            <!-- Footer -->
            <div class="flex items-center justify-between pt-3 border-t border-slate-100">
              <div class="flex items-center gap-2">
                <span class="px-2 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-600">
                  {{ audit.credentialingType }}
                </span>
                @if (audit.tier) {
                  <span class="px-2 py-1 rounded-md text-xs font-medium"
                        [ngClass]="getTierBadgeClass(audit.tier)">
                    {{ getTierLabel(audit.tier) }}
                  </span>
                }
              </div>
              <span class="text-xs text-slate-400">{{ audit.uploadDate | date:'MMM d, y, h:mm a' }}</span>
            </div>
          </div>
        } @empty {
          <div class="col-span-full">
            <div class="bg-white rounded-xl border border-slate-200 p-12 text-center">
              <div class="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                <mat-icon class="icon-xl text-slate-400">folder_open</mat-icon>
              </div>
              <h3 class="text-lg font-semibold text-slate-900 mb-2">No audits found</h3>
              <p class="text-sm text-slate-500 mb-6">
                @if (searchQuery || statusFilter() !== 'all') {
                  No audits match your current filters. Try adjusting your search.
                } @else {
                  Get started by uploading your first practitioner file for NCQA compliance analysis.
                }
              </p>
              @if (!searchQuery && statusFilter() === 'all') {
                <button routerLink="/upload" class="btn-primary">
                  <mat-icon class="mr-2">add</mat-icon>
                  Upload First Audit
                </button>
              }
            </div>
          </div>
        }
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AuditList implements OnInit {
  private auditService = inject(AuditService);
  audits = signal<PractitionerFile[]>([]);
  searchQuery = '';
  statusFilter = signal<string>('all');

  filteredAudits = computed(() => {
    let result = this.audits();
    
    if (this.statusFilter() !== 'all') {
      result = result.filter(a => a.status === this.statusFilter());
    }
    
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      result = result.filter(a => 
        a.name?.toLowerCase().includes(query) ||
        a.npi?.toLowerCase().includes(query) ||
        a.specialty?.toLowerCase().includes(query)
      );
    }
    
    return result;
  });

  ngOnInit() {
    this.loadAudits();
  }

  loadAudits() {
    this.auditService.getAudits().subscribe(response => {
      this.audits.set(response.items);
    });
  }

  deleteAudit(audit: PractitionerFile, event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();

    if (!confirm(`Delete audit history for ${audit.name}?`)) return;

    this.auditService.deleteAudit(audit.id).subscribe(() => {
      this.audits.update(items => items.filter(item => item.id !== audit.id));
    });
  }

  getInitials(name: string): string {
    if (!name || name === 'Processing...') return '?';
    return name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();
  }

  getCountByTier(tier: string): number {
    return this.audits().filter(a => a.tier === tier).length;
  }

  getTierBgClass(tier?: ComplianceTier): string {
    switch (tier) {
      case ComplianceTier.FULLY_COMPLIANT: return 'bg-gradient-to-br from-emerald-500 to-emerald-600';
      case ComplianceTier.SUBSTANTIALLY_COMPLIANT: return 'bg-gradient-to-br from-blue-500 to-blue-600';
      case ComplianceTier.PARTIALLY_COMPLIANT: return 'bg-gradient-to-br from-amber-500 to-amber-600';
      case ComplianceTier.NON_COMPLIANT: return 'bg-gradient-to-br from-rose-500 to-rose-600';
      default: return 'bg-gradient-to-br from-slate-400 to-slate-500';
    }
  }

  getTierBadgeClass(tier?: ComplianceTier): string {
    switch (tier) {
      case ComplianceTier.FULLY_COMPLIANT: return 'bg-emerald-100 text-emerald-700';
      case ComplianceTier.SUBSTANTIALLY_COMPLIANT: return 'bg-blue-100 text-blue-700';
      case ComplianceTier.PARTIALLY_COMPLIANT: return 'bg-amber-100 text-amber-700';
      case ComplianceTier.NON_COMPLIANT: return 'bg-rose-100 text-rose-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  }

  getTierLabel(tier?: ComplianceTier): string {
    switch (tier) {
      case ComplianceTier.FULLY_COMPLIANT: return 'Compliant';
      case ComplianceTier.SUBSTANTIALLY_COMPLIANT: return 'Substantial';
      case ComplianceTier.PARTIALLY_COMPLIANT: return 'Partial';
      case ComplianceTier.NON_COMPLIANT: return 'Non-Compliant';
      default: return 'Pending';
    }
  }

  getStatusClass(status?: string): string {
    switch (status) {
      case 'Completed': return 'bg-emerald-100 text-emerald-700';
      case 'In Progress': return 'bg-amber-100 text-amber-700';
      case 'Pending': return 'bg-blue-100 text-blue-700';
      case 'Failed': return 'bg-rose-100 text-rose-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  }

  getScoreBarClass(score?: number): string {
    if (!score) return 'bg-slate-300';
    if (score >= 95) return 'bg-gradient-to-r from-emerald-500 to-emerald-400';
    if (score >= 85) return 'bg-gradient-to-r from-blue-500 to-blue-400';
    if (score >= 70) return 'bg-gradient-to-r from-amber-500 to-amber-400';
    return 'bg-gradient-to-r from-rose-500 to-rose-400';
  }

  getScoreTextClass(score?: number): string {
    if (!score) return 'text-slate-400';
    if (score >= 95) return 'text-emerald-600';
    if (score >= 85) return 'text-blue-600';
    if (score >= 70) return 'text-amber-600';
    return 'text-rose-600';
  }
}
