import { ChangeDetectionStrategy, Component, inject, signal, OnInit, computed, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { AuditService, PortfolioReport } from '../../services/audit.service';
import { PractitionerFile, ComplianceTier, DashboardStats, MonitoringAlert, ComplianceCategory } from '../../services/audit.types';
import { interval, Subscription } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, RouterLink],
  template: `
    <div class="space-y-10">
      <!-- Dashboard Header -->
      <div class="flex justify-between items-end">
        <div>
          <h2 class="text-4xl font-extrabold text-slate-900 tracking-tight">Compliance Dashboard</h2>
          <p class="text-slate-500 mt-2 font-medium">NCQA 2025 credentialing intelligence • Real-time monitoring</p>
        </div>
        <div class="flex gap-4">
          <button routerLink="/monitoring" class="btn-secondary flex items-center gap-2">
            <mat-icon class="text-lg">monitor_heart</mat-icon>
            Monitoring
          </button>
          <button routerLink="/upload" class="btn-primary flex items-center gap-2">
            <mat-icon class="text-lg">add</mat-icon>
            New Audit
          </button>
        </div>
      </div>

      <!-- Alert Banner -->
      @if (alerts().length > 0) {
        <div class="bg-rose-50 border border-rose-200 rounded-2xl p-6 flex items-center justify-between">
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 bg-rose-100 rounded-xl flex items-center justify-center text-rose-600">
              <mat-icon>warning</mat-icon>
            </div>
            <div>
              <p class="text-sm font-bold text-rose-900">{{ alerts().length }} Active Alert{{ alerts().length > 1 ? 's' : '' }}</p>
              <p class="text-xs text-rose-600">{{ alerts()[0]?.message }}</p>
            </div>
          </div>
          <button routerLink="/monitoring" class="text-rose-600 text-xs font-bold hover:underline">View All Alerts →</button>
        </div>
      }

      <!-- Stats Grid -->
      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div class="w-14 h-14 bg-green-500 rounded-xl flex items-center justify-center mb-5">
            <mat-icon class="text-white text-xl">stop</mat-icon>
          </div>
          <p class="text-[10px] font-bold text-blue-500 uppercase tracking-[0.15em] mb-2">Total Audits</p>
          <h3 class="text-4xl font-black text-slate-800 tracking-tight">{{ stats()?.totalAudits || 0 }}</h3>
        </div>

        <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 relative">
          <div class="absolute top-6 right-6 bg-cyan-50 text-cyan-600 px-2.5 py-1 rounded-lg text-[10px] font-bold">
            {{ getScoreTrend() }}
          </div>
          <div class="w-14 h-14 bg-cyan-500 rounded-xl flex items-center justify-center mb-5">
            <mat-icon class="text-white text-xl">analytics</mat-icon>
          </div>
          <p class="text-[10px] font-bold text-cyan-500 uppercase tracking-[0.15em] mb-2">Avg Compliance</p>
          <h3 class="text-4xl font-black text-slate-800 tracking-tight">{{ stats()?.averageScore || 0 }}%</h3>
        </div>

        <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div class="w-14 h-14 bg-emerald-500 rounded-xl flex items-center justify-center mb-5">
            <mat-icon class="text-white text-xl">check_circle</mat-icon>
          </div>
          <p class="text-[10px] font-bold text-emerald-500 uppercase tracking-[0.15em] mb-2">Fully Compliant</p>
          <h3 class="text-4xl font-black text-emerald-500 tracking-tight">{{ stats()?.fullyCompliant || 0 }}</h3>
          <p class="text-[11px] text-slate-400 font-medium mt-1">95-100% score</p>
        </div>

        <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div class="w-14 h-14 bg-blue-500 rounded-xl flex items-center justify-center mb-5">
            <mat-icon class="text-white text-xl">verified</mat-icon>
          </div>
          <p class="text-[10px] font-bold text-blue-500 uppercase tracking-[0.15em] mb-2">Substantially Compliant</p>
          <h3 class="text-4xl font-black text-blue-500 tracking-tight">{{ stats()?.substantiallyCompliant || 0 }}</h3>
          <p class="text-[11px] text-slate-400 font-medium mt-1">85-94% score</p>
        </div>

        <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div class="w-14 h-14 bg-orange-500 rounded-xl flex items-center justify-center mb-5">
            <mat-icon class="text-white text-xl">chat_bubble</mat-icon>
          </div>
          <p class="text-[10px] font-bold text-orange-500 uppercase tracking-[0.15em] mb-2">Partially Compliant</p>
          <h3 class="text-4xl font-black text-orange-500 tracking-tight">{{ stats()?.partiallyCompliant || 0 }}</h3>
          <p class="text-[11px] text-slate-400 font-medium mt-1">70-84% score</p>
        </div>

        <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div class="w-14 h-14 bg-pink-500 rounded-xl flex items-center justify-center mb-5">
            <mat-icon class="text-white text-xl">error</mat-icon>
          </div>
          <p class="text-[10px] font-bold text-pink-500 uppercase tracking-[0.15em] mb-2">Non-Compliant</p>
          <h3 class="text-4xl font-black text-pink-500 tracking-tight">{{ stats()?.nonCompliant || 0 }}</h3>
          <p class="text-[11px] text-slate-400 font-medium mt-1">&lt;70% score</p>
        </div>
      </div>

      <!-- Main Content Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- Recent Audit History -->
        <div class="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
          <div class="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <div>
              <h3 class="text-lg font-bold text-slate-900">Recent Audit Activity</h3>
              <p class="text-xs text-slate-500 mt-0.5">Latest credentialing file audits with NCQA 2025 compliance scores</p>
            </div>
            <button routerLink="/audits" class="text-blue-600 text-xs font-bold hover:underline flex items-center gap-1">
              View All <mat-icon class="text-sm">chevron_right</mat-icon>
            </button>
          </div>
          
          <div class="flex-1 overflow-auto">
            <table class="w-full text-left">
              <thead>
                <tr class="bg-slate-50 border-b border-slate-200">
                  <th class="px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">Practitioner</th>
                  <th class="px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">Score</th>
                  <th class="px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">Confidence</th>
                  <th class="px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">Tier</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                @for (audit of audits().slice(0, 8); track audit.id) {
                  <tr class="hover:bg-blue-50/50 transition-colors cursor-pointer group" [routerLink]="['/audit', audit.id]">
                    <td class="px-6 py-4">
                      <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-bold"
                             [ngClass]="getTierBgClass(audit.tier)">
                          {{ getInitials(audit.name) }}
                        </div>
                        <div>
                          <p class="text-sm font-semibold text-slate-900">{{ audit.name }}</p>
                          <p class="text-xs text-slate-500">NPI: {{ audit.npi }} • {{ audit.credentialingType }}</p>
                        </div>
                      </div>
                    </td>
                    <td class="px-6 py-4">
                      <div class="flex items-center gap-2">
                        <div class="w-20 h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div class="h-full rounded-full transition-all" 
                               [ngClass]="getScoreBarClass(audit.overallScore)"
                               [style.width.%]="audit.overallScore || 0"></div>
                        </div>
                        <span class="text-sm font-bold min-w-[45px]" [ngClass]="getScoreTextClass(audit.overallScore)">
                          {{ audit.overallScore || 0 }}%
                        </span>
                      </div>
                    </td>
                    <td class="px-6 py-4">
                      <span class="text-sm font-medium text-slate-600">{{ audit.confidenceScore || 0 }}%</span>
                    </td>
                    <td class="px-6 py-4">
                      <span class="px-3 py-1.5 rounded-full text-xs font-semibold"
                            [ngClass]="getTierClass(audit.tier)">
                        {{ getTierLabel(audit.tier) }}
                      </span>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="4" class="px-6 py-16 text-center">
                      <div class="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <mat-icon class="text-3xl text-blue-600">upload_file</mat-icon>
                      </div>
                      <p class="text-base font-bold text-slate-900 mb-2">No Audits Yet</p>
                      <p class="text-sm text-slate-400 mb-4">Upload credentialing files to begin automated NCQA compliance analysis</p>
                      <button routerLink="/upload" class="btn-primary">Start First Audit</button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>

        <!-- Right Sidebar -->
        <div class="space-y-8">
          <!-- Category Performance -->
          <div class="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-10">
            <h3 class="text-xl font-bold text-slate-900 mb-2">Category Performance</h3>
            <p class="text-xs text-slate-400 mb-8">NCQA 2025 compliance by category</p>
            
            @if (portfolioReport()) {
              <div class="space-y-5">
                @for (cat of categoryList; track cat) {
                  <div class="space-y-2">
                    <div class="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                      <span class="text-slate-600">{{ cat }}</span>
                      <span class="text-slate-900">{{ getCategoryScore(cat) }}%</span>
                    </div>
                    <div class="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div class="h-full rounded-full transition-all duration-500" 
                           [ngClass]="getScoreBarClass(getCategoryScore(cat))"
                           [style.width.%]="getCategoryScore(cat)"></div>
                    </div>
                  </div>
                }
              </div>
            } @else {
              <div class="text-center py-8 text-slate-400 text-sm">
                <p>No data available yet</p>
              </div>
            }
          </div>

          <!-- Top Issues -->
          <div class="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-10">
            <h3 class="text-xl font-bold text-slate-900 mb-2">Top Compliance Issues</h3>
            <p class="text-xs text-slate-400 mb-6">Most common audit failures</p>
            
            @if (portfolioReport()?.topIssues?.length) {
              <div class="space-y-4">
                @for (issue of portfolioReport()!.topIssues.slice(0, 5); track issue.issue) {
                  <div class="flex items-center gap-4 p-4 bg-slate-50/50 rounded-xl">
                    <div class="w-10 h-10 bg-rose-50 text-rose-600 rounded-lg flex items-center justify-center text-xs font-bold">
                      {{ issue.count }}
                    </div>
                    <div class="flex-1 min-w-0">
                      <p class="text-xs font-bold text-slate-900 truncate">{{ issue.issue }}</p>
                      <p class="text-[10px] text-slate-400">{{ issue.percentage }}% of audits</p>
                    </div>
                  </div>
                }
              </div>
            } @else {
              <div class="text-center py-8">
                <div class="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <mat-icon class="text-emerald-600">thumb_up</mat-icon>
                </div>
                <p class="text-sm text-slate-400">No recurring issues identified</p>
              </div>
            }
          </div>

          <!-- NCQA 2025 Quick Reference -->
          <div class="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2.5rem] p-10 text-white shadow-xl">
            <div class="flex items-center gap-3 mb-6">
              <mat-icon>verified_user</mat-icon>
              <h4 class="font-bold">NCQA 2025 Standards</h4>
            </div>
            <div class="space-y-4 text-sm">
              <div class="flex justify-between items-center py-2 border-b border-white/10">
                <span class="text-blue-100">Accreditation Timeframe</span>
                <span class="font-bold">120 days</span>
              </div>
              <div class="flex justify-between items-center py-2 border-b border-white/10">
                <span class="text-blue-100">Certification<br>Timeframe</span>
                <span class="font-bold">90 days</span>
              </div>
              <div class="flex justify-between items-center py-2 border-b border-white/10">
                <span class="text-blue-100">Monitoring</span>
                <span class="font-bold">Every 30 days</span>
              </div>
              <div class="flex justify-between items-center py-2">
                <span class="text-blue-100">Re-cred Cycle</span>
                <span class="font-bold">36 months max</span>
              </div>
            </div>
            <button routerLink="/standards" class="mt-6 w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl text-sm font-bold transition-colors">
              View Full Standards →
            </button>
          </div>
        </div>
      </div>

      <!-- Compliance Tier Distribution -->
      @if (audits().length > 0) {
        <div class="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-10">
          <div class="flex justify-between items-center mb-8">
            <div>
              <h3 class="text-xl font-bold text-slate-900">Compliance Distribution</h3>
              <p class="text-xs text-slate-400 mt-1">Practitioner file compliance tier breakdown</p>
            </div>
            <div class="flex gap-6">
              @for (tier of tierList; track tier.key) {
                <div class="flex items-center gap-2">
                  <div class="w-3 h-3 rounded-full" [ngClass]="tier.dotClass"></div>
                  <span class="text-xs font-medium text-slate-600">{{ tier.label }}</span>
                </div>
              }
            </div>
          </div>
          
          <div class="flex h-8 rounded-xl overflow-hidden">
            @for (tier of tierList; track tier.key) {
              @if (getTierPercentage(tier.key) > 0) {
                <div class="h-full transition-all duration-500 flex items-center justify-center text-white text-xs font-bold"
                     [ngClass]="tier.barClass"
                     [style.width.%]="getTierPercentage(tier.key)">
                  {{ getTierPercentage(tier.key) > 10 ? getTierPercentage(tier.key) + '%' : '' }}
                </div>
              }
            }
          </div>
          
          <div class="grid grid-cols-4 gap-4 mt-6">
            @for (tier of tierList; track tier.key) {
              <div class="text-center p-4 rounded-xl" [ngClass]="tier.bgClass">
                <p class="text-2xl font-black" [ngClass]="tier.textClass">{{ getCountByTier(tier.key) }}</p>
                <p class="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">{{ tier.label }}</p>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Dashboard implements OnInit, OnDestroy {
  private auditService = inject(AuditService);
  private refreshSubscription?: Subscription;
  
  audits = signal<PractitionerFile[]>([]);
  stats = signal<DashboardStats | null>(null);
  alerts = signal<MonitoringAlert[]>([]);
  portfolioReport = signal<PortfolioReport | null>(null);
  isLoading = signal(false);
  
  ComplianceTier = ComplianceTier;
  
  categoryList = ['Application', 'PSV', 'Decision', 'Recredentialing', 'Monitoring', 'Integrity'];
  
  tierList = [
    { key: ComplianceTier.FULLY_COMPLIANT, label: 'Fully Compliant', dotClass: 'bg-emerald-500', barClass: 'bg-emerald-500', bgClass: 'bg-emerald-50', textClass: 'text-emerald-600' },
    { key: ComplianceTier.SUBSTANTIALLY_COMPLIANT, label: 'Substantially', dotClass: 'bg-blue-500', barClass: 'bg-blue-500', bgClass: 'bg-blue-50', textClass: 'text-blue-600' },
    { key: ComplianceTier.PARTIALLY_COMPLIANT, label: 'Partially', dotClass: 'bg-amber-500', barClass: 'bg-amber-500', bgClass: 'bg-amber-50', textClass: 'text-amber-600' },
    { key: ComplianceTier.NON_COMPLIANT, label: 'Non-Compliant', dotClass: 'bg-rose-500', barClass: 'bg-rose-500', bgClass: 'bg-rose-50', textClass: 'text-rose-600' }
  ];

  ngOnInit() {
    this.loadAllData();
    // Auto-refresh every 30 seconds
    this.refreshSubscription = interval(30000).subscribe(() => this.loadAllData());
  }

  ngOnDestroy() {
    this.refreshSubscription?.unsubscribe();
  }

  refreshData() {
    this.loadAllData();
  }

  loadAllData() {
    this.isLoading.set(true);
    
    this.auditService.getDashboardStats().subscribe({
      next: (data) => this.stats.set(data),
      error: () => {}
    });

    this.auditService.getAuditsList().subscribe({
      next: (data) => {
        this.audits.set(data);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });

    this.auditService.getMonitoringAlerts({ acknowledged: false }).subscribe({
      next: (data) => this.alerts.set(data),
      error: () => {}
    });

    this.auditService.getPortfolioReport().subscribe({
      next: (data) => this.portfolioReport.set(data),
      error: () => {}
    });
  }

  getCountByTier(tier: ComplianceTier): number {
    return this.audits().filter(a => a.tier === tier).length;
  }

  getTierPercentage(tier: ComplianceTier): number {
    const total = this.audits().length;
    if (total === 0) return 0;
    return Math.round((this.getCountByTier(tier) / total) * 100);
  }

  getCategoryScore(category: string): number {
    const report = this.portfolioReport();
    if (!report?.categoryBreakdown?.[category]) return 0;
    return report.categoryBreakdown[category].average;
  }

  getScoreTrend(): string {
    return '+2.4%'; // In production, calculate from historical data
  }

  getInitials(name: string): string {
    if (!name || name === 'Processing...') return '?';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  }

  getTierBgClass(tier?: ComplianceTier): string {
    switch (tier) {
      case ComplianceTier.FULLY_COMPLIANT: return 'bg-emerald-500';
      case ComplianceTier.SUBSTANTIALLY_COMPLIANT: return 'bg-blue-500';
      case ComplianceTier.PARTIALLY_COMPLIANT: return 'bg-amber-500';
      case ComplianceTier.NON_COMPLIANT: return 'bg-rose-500';
      default: return 'bg-slate-400';
    }
  }

  getTierClass(tier?: ComplianceTier): string {
    switch (tier) {
      case ComplianceTier.FULLY_COMPLIANT: return 'bg-emerald-50 text-emerald-600';
      case ComplianceTier.SUBSTANTIALLY_COMPLIANT: return 'bg-blue-50 text-blue-600';
      case ComplianceTier.PARTIALLY_COMPLIANT: return 'bg-amber-50 text-amber-600';
      case ComplianceTier.NON_COMPLIANT: return 'bg-rose-50 text-rose-600';
      default: return 'bg-slate-50 text-slate-600';
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

  getScoreBarClass(score?: number): string {
    if (!score) return 'bg-slate-300';
    if (score >= 95) return 'bg-emerald-500';
    if (score >= 85) return 'bg-blue-500';
    if (score >= 70) return 'bg-amber-500';
    return 'bg-rose-500';
  }

  getScoreTextClass(score?: number): string {
    if (!score) return 'text-slate-400';
    if (score >= 95) return 'text-emerald-600';
    if (score >= 85) return 'text-blue-600';
    if (score >= 70) return 'text-amber-600';
    return 'text-rose-600';
  }
}
