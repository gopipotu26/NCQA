import { ChangeDetectionStrategy, Component, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

interface MonitoringProfile {
  id: string;
  name: string;
  description: string;
  lastUpdated: string;
  settings: {
    exclusionFrequency: string;
    licenseAlertDays: number;
    psvThresholdDays: number;
    autoRecredCycle: string;
    sanctionSources: string[];
  };
}

interface LiveMetric {
  label: string;
  value: number;
  change: number;
  icon: string;
  color: string;
}

interface ActivityLog {
  time: string;
  action: string;
  status: 'success' | 'warning' | 'error';
  details: string;
}

@Component({
  selector: 'app-monitoring-settings',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule],
  template: `
    <div class="space-y-8">
      <!-- Header -->
      <div class="flex justify-between items-end">
        <div>
          <h2 class="text-3xl font-extrabold text-slate-900 tracking-tight">Live Monitoring Dashboard</h2>
          <p class="text-slate-500 mt-1 font-medium">Real-time compliance metrics and system activity</p>
        </div>
        <div class="flex items-center gap-3">
          <div class="flex items-center gap-2 px-4 py-2 bg-emerald-50 rounded-xl border border-emerald-200">
            <span class="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
            <span class="text-xs font-bold text-emerald-700">LIVE</span>
          </div>
          <span class="text-xs text-slate-400">Last updated: {{ currentTime() }}</span>
        </div>
      </div>

      <!-- Live Metrics Cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        @for (metric of liveMetrics(); track metric.label) {
          <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <div class="flex items-center justify-between mb-4">
              <div class="w-12 h-12 rounded-xl flex items-center justify-center" [ngClass]="metric.color">
                <mat-icon class="text-white">{{ metric.icon }}</mat-icon>
              </div>
              <div class="flex items-center gap-1 text-xs font-bold" 
                   [ngClass]="metric.change >= 0 ? 'text-emerald-600' : 'text-rose-600'">
                <mat-icon class="text-sm">{{ metric.change >= 0 ? 'trending_up' : 'trending_down' }}</mat-icon>
                {{ metric.change >= 0 ? '+' : '' }}{{ metric.change }}%
              </div>
            </div>
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{{ metric.label }}</p>
            <h3 class="text-3xl font-black text-slate-900">{{ metric.value }}</h3>
          </div>
        }
      </div>

      <!-- Charts Section -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Compliance Trend Chart -->
        <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div class="flex justify-between items-center mb-6">
            <h3 class="text-lg font-bold text-slate-900">Compliance Trend (7 Days)</h3>
            <div class="flex gap-2">
              <span class="flex items-center gap-1 text-xs text-slate-500">
                <span class="w-3 h-3 bg-emerald-500 rounded-full"></span> Pass
              </span>
              <span class="flex items-center gap-1 text-xs text-slate-500">
                <span class="w-3 h-3 bg-rose-500 rounded-full"></span> Fail
              </span>
            </div>
          </div>
          <!-- Bar Chart -->
          <div class="flex items-end justify-between h-48 gap-2">
            @for (day of chartData(); track day.label) {
              <div class="flex-1 flex flex-col items-center gap-1">
                <div class="w-full flex flex-col gap-1">
                  <div class="w-full bg-emerald-500 rounded-t-md transition-all duration-500" 
                       [style.height.px]="day.pass * 1.5"></div>
                  <div class="w-full bg-rose-500 rounded-b-md transition-all duration-500" 
                       [style.height.px]="day.fail * 3"></div>
                </div>
                <span class="text-[10px] text-slate-400 font-medium mt-2">{{ day.label }}</span>
              </div>
            }
          </div>
        </div>

        <!-- Category Performance Donut -->
        <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h3 class="text-lg font-bold text-slate-900 mb-6">Category Performance</h3>
          <div class="flex items-center gap-8">
            <!-- Donut Chart Visualization -->
            <div class="relative w-40 h-40">
              <svg class="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" fill="none" stroke="#f1f5f9" stroke-width="12"/>
                <circle cx="50" cy="50" r="40" fill="none" stroke="#10b981" stroke-width="12"
                        stroke-dasharray="188.5" stroke-dashoffset="37.7" stroke-linecap="round"/>
                <circle cx="50" cy="50" r="40" fill="none" stroke="#f59e0b" stroke-width="12"
                        stroke-dasharray="188.5" stroke-dashoffset="150.8" stroke-linecap="round"
                        class="origin-center" style="transform: rotate(288deg)"/>
                <circle cx="50" cy="50" r="40" fill="none" stroke="#ef4444" stroke-width="12"
                        stroke-dasharray="188.5" stroke-dashoffset="169.65" stroke-linecap="round"
                        class="origin-center" style="transform: rotate(324deg)"/>
              </svg>
              <div class="absolute inset-0 flex flex-col items-center justify-center">
                <span class="text-2xl font-black text-slate-900">87%</span>
                <span class="text-[10px] text-slate-400 font-medium">Overall</span>
              </div>
            </div>
            <!-- Legend -->
            <div class="flex-1 space-y-3">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <span class="w-3 h-3 bg-emerald-500 rounded-full"></span>
                  <span class="text-sm text-slate-600">Compliant</span>
                </div>
                <span class="text-sm font-bold text-slate-900">80%</span>
              </div>
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <span class="w-3 h-3 bg-amber-500 rounded-full"></span>
                  <span class="text-sm text-slate-600">Needs Review</span>
                </div>
                <span class="text-sm font-bold text-slate-900">15%</span>
              </div>
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <span class="w-3 h-3 bg-rose-500 rounded-full"></span>
                  <span class="text-sm text-slate-600">Non-Compliant</span>
                </div>
                <span class="text-sm font-bold text-slate-900">5%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Live Activity Feed & System Status -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Live Activity Feed -->
        <div class="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div class="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
            <h3 class="text-lg font-bold text-slate-900">Live Activity Feed</h3>
            <span class="flex items-center gap-2 text-xs text-slate-500">
              <span class="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
              Streaming
            </span>
          </div>
          <div class="divide-y divide-slate-100 max-h-80 overflow-auto">
            @for (log of activityLogs(); track log.time) {
              <div class="px-6 py-4 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                <div class="w-10 h-10 rounded-lg flex items-center justify-center"
                     [ngClass]="{
                       'bg-emerald-100 text-emerald-600': log.status === 'success',
                       'bg-amber-100 text-amber-600': log.status === 'warning',
                       'bg-rose-100 text-rose-600': log.status === 'error'
                     }">
                  <mat-icon class="text-lg">
                    {{ log.status === 'success' ? 'check_circle' : log.status === 'warning' ? 'warning' : 'error' }}
                  </mat-icon>
                </div>
                <div class="flex-1">
                  <p class="text-sm font-semibold text-slate-900">{{ log.action }}</p>
                  <p class="text-xs text-slate-500">{{ log.details }}</p>
                </div>
                <span class="text-xs text-slate-400 font-medium">{{ log.time }}</span>
              </div>
            }
          </div>
        </div>

        <!-- System Status -->
        <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h3 class="text-lg font-bold text-slate-900 mb-6">System Status</h3>
          <div class="space-y-4">
            <div class="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
              <div class="flex items-center justify-between mb-2">
                <span class="text-sm font-semibold text-emerald-800">API Server</span>
                <span class="w-2 h-2 bg-emerald-500 rounded-full"></span>
              </div>
              <div class="flex items-center gap-2">
                <div class="flex-1 h-2 bg-emerald-200 rounded-full overflow-hidden">
                  <div class="h-full bg-emerald-500 w-[98%]"></div>
                </div>
                <span class="text-xs font-bold text-emerald-700">98%</span>
              </div>
            </div>
            <div class="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
              <div class="flex items-center justify-between mb-2">
                <span class="text-sm font-semibold text-emerald-800">AI Engine</span>
                <span class="w-2 h-2 bg-emerald-500 rounded-full"></span>
              </div>
              <div class="flex items-center gap-2">
                <div class="flex-1 h-2 bg-emerald-200 rounded-full overflow-hidden">
                  <div class="h-full bg-emerald-500 w-[95%]"></div>
                </div>
                <span class="text-xs font-bold text-emerald-700">95%</span>
              </div>
            </div>
            <div class="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
              <div class="flex items-center justify-between mb-2">
                <span class="text-sm font-semibold text-emerald-800">Database</span>
                <span class="w-2 h-2 bg-emerald-500 rounded-full"></span>
              </div>
              <div class="flex items-center gap-2">
                <div class="flex-1 h-2 bg-emerald-200 rounded-full overflow-hidden">
                  <div class="h-full bg-emerald-500 w-[99%]"></div>
                </div>
                <span class="text-xs font-bold text-emerald-700">99%</span>
              </div>
            </div>
            <div class="p-4 bg-amber-50 rounded-xl border border-amber-200">
              <div class="flex items-center justify-between mb-2">
                <span class="text-sm font-semibold text-amber-800">OCR Service</span>
                <span class="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
              </div>
              <div class="flex items-center gap-2">
                <div class="flex-1 h-2 bg-amber-200 rounded-full overflow-hidden">
                  <div class="h-full bg-amber-500 w-[78%]"></div>
                </div>
                <span class="text-xs font-bold text-amber-700">78%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Monitoring Configuration -->
      <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div class="flex justify-between items-center mb-6">
          <h3 class="text-lg font-bold text-slate-900">Monitoring Configuration</h3>
          <button class="btn-primary flex items-center gap-2 text-sm">
            <mat-icon class="text-lg">save</mat-icon>
            Save Settings
          </button>
        </div>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div class="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Exclusion Check</p>
            <p class="text-lg font-bold text-slate-900">{{ activeProfile().settings.exclusionFrequency }}</p>
          </div>
          <div class="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">License Alert</p>
            <p class="text-lg font-bold text-slate-900">{{ activeProfile().settings.licenseAlertDays }} Days</p>
          </div>
          <div class="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">PSV Threshold</p>
            <p class="text-lg font-bold text-slate-900">{{ activeProfile().settings.psvThresholdDays }} Days</p>
          </div>
          <div class="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Re-cred Cycle</p>
            <p class="text-lg font-bold text-slate-900">{{ activeProfile().settings.autoRecredCycle }}</p>
          </div>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MonitoringSettings implements OnInit, OnDestroy {
  private intervalId: any;

  currentTime = signal(new Date().toLocaleTimeString());

  liveMetrics = signal<LiveMetric[]>([
    { label: 'Active Audits', value: 12, change: 8.3, icon: 'assessment', color: 'bg-blue-500' },
    { label: 'Pending Reviews', value: 7, change: -12.5, icon: 'pending_actions', color: 'bg-amber-500' },
    { label: 'Alerts Today', value: 3, change: 50, icon: 'notifications_active', color: 'bg-rose-500' },
    { label: 'Compliance Rate', value: 87, change: 2.4, icon: 'verified', color: 'bg-emerald-500' }
  ]);

  chartData = signal([
    { label: 'Mon', pass: 85, fail: 15 },
    { label: 'Tue', pass: 88, fail: 12 },
    { label: 'Wed', pass: 82, fail: 18 },
    { label: 'Thu', pass: 90, fail: 10 },
    { label: 'Fri', pass: 87, fail: 13 },
    { label: 'Sat', pass: 92, fail: 8 },
    { label: 'Sun', pass: 89, fail: 11 }
  ]);

  activityLogs = signal<ActivityLog[]>([
    { time: '2 min ago', action: 'Audit Completed', status: 'success', details: 'Dr. Sarah Johnson - Score: 98%' },
    { time: '5 min ago', action: 'License Expiring', status: 'warning', details: 'Dr. Michael Chen - 30 days remaining' },
    { time: '8 min ago', action: 'PSV Verification', status: 'success', details: 'Board certification verified for Dr. Emily Davis' },
    { time: '12 min ago', action: 'Sanction Alert', status: 'error', details: 'OIG exclusion check flagged - Dr. Robert Wilson' },
    { time: '15 min ago', action: 'Document Uploaded', status: 'success', details: 'New credentialing file received' },
    { time: '18 min ago', action: 'Re-credentialing Due', status: 'warning', details: 'Dr. Lisa Anderson - Due in 45 days' },
    { time: '22 min ago', action: 'Audit Started', status: 'success', details: 'Processing Dr. James Brown credentials' },
    { time: '25 min ago', action: 'API Rate Limit', status: 'warning', details: 'NPDB query throttled - retrying' }
  ]);

  activeProfile = signal<MonitoringProfile>({
    id: 'prof_001',
    name: 'Standard NCQA 2025 Profile',
    description: 'Default monitoring rules for NCQA 2025 compliance across all practitioner types.',
    lastUpdated: new Date().toISOString(),
    settings: {
      exclusionFrequency: 'Every 30 Days',
      licenseAlertDays: 60,
      psvThresholdDays: 120,
      autoRecredCycle: '36 Months',
      sanctionSources: ['OIG', 'SAM', 'NPDB', 'MEDICAID', 'MEDICARE', 'STATE_BOARDS']
    }
  });

  ngOnInit() {
    // Update time every second for live feel
    this.intervalId = setInterval(() => {
      this.currentTime.set(new Date().toLocaleTimeString());
      // Simulate live metric updates
      this.updateMetrics();
    }, 5000);
  }

  ngOnDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  private updateMetrics() {
    const metrics = this.liveMetrics();
    const updated = metrics.map(m => ({
      ...m,
      value: m.label === 'Compliance Rate' ? m.value : m.value + Math.floor(Math.random() * 3) - 1,
      change: +(m.change + (Math.random() * 2 - 1)).toFixed(1)
    }));
    this.liveMetrics.set(updated);
  }
}
