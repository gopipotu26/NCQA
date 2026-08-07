import { Component, OnInit, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { forkJoin } from 'rxjs';
import { AuditService } from '../../services/audit.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatSlideToggleModule],
  template: `
    <div class="p-8 max-w-5xl mx-auto">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-slate-900">Settings</h1>
        <p class="text-slate-500 mt-2">Configure your NCQA Audit Tool preferences</p>
      </div>

      <!-- Settings Sections -->
      <div class="space-y-6">
        
        <!-- General Settings -->
        <div class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div class="px-6 py-4 border-b border-slate-100 bg-slate-50">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <mat-icon class="text-blue-600">settings</mat-icon>
              </div>
              <div>
                <h2 class="text-lg font-semibold text-slate-900">General Settings</h2>
                <p class="text-sm text-slate-500">Basic application configuration</p>
              </div>
            </div>
          </div>
          <div class="p-6 space-y-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="font-medium text-slate-900">Organization Name</p>
                <p class="text-sm text-slate-500">Your healthcare organization name</p>
              </div>
              <input type="text" [(ngModel)]="settings().organizationName" 
                class="px-4 py-2 border border-slate-200 rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div class="flex items-center justify-between">
              <div>
                <p class="font-medium text-slate-900">Default Credentialing Type</p>
                <p class="text-sm text-slate-500">Default type for new audits</p>
              </div>
              <select [(ngModel)]="settings().defaultCredentialingType" 
                class="px-4 py-2 border border-slate-200 rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="INITIAL">Initial Credentialing</option>
                <option value="RECREDENTIALING">Recredentialing</option>
                <option value="AD_HOC">Ad Hoc Review</option>
              </select>
            </div>
            <div class="flex items-center justify-between">
              <div>
                <p class="font-medium text-slate-900">Time Zone</p>
                <p class="text-sm text-slate-500">Used for audit timestamps</p>
              </div>
              <select [(ngModel)]="settings().timezone" 
                class="px-4 py-2 border border-slate-200 rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="America/New_York">Eastern Time (ET)</option>
                <option value="America/Chicago">Central Time (CT)</option>
                <option value="America/Denver">Mountain Time (MT)</option>
                <option value="America/Los_Angeles">Pacific Time (PT)</option>
                <option value="Asia/Kolkata">India Standard Time (IST)</option>
              </select>
            </div>
            <div class="flex items-center justify-between">
              <div>
                <p class="font-medium text-slate-900">AI Processing Model</p>
                <p class="text-sm text-slate-500">Gemini model used for new audit processing</p>
              </div>
              <select [(ngModel)]="settings().aiModel" 
                class="px-4 py-2 border border-slate-200 rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-blue-500">
                @for (model of availableAiModels(); track model) {
                  <option [value]="model">{{ model }}</option>
                }
              </select>
            </div>
            <div class="flex items-center justify-between">
              <div>
                <p class="font-medium text-slate-900">Gemini API Key</p>
                <p class="text-sm text-slate-500">{{ apiKeyPreview() ? 'Current key: ' + apiKeyPreview() : 'Set the key used for new audit processing' }}</p>
              </div>
              <input type="password" [(ngModel)]="settings().geminiApiKey" placeholder="Paste new API key"
                class="px-4 py-2 border border-slate-200 rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div class="flex items-center justify-between gap-6">
              <div>
                <p class="font-medium text-slate-900">Document Storage Path</p>
                <p class="text-sm text-slate-500">Local folder or shared UNC path where uploads and history are saved</p>
              </div>
              <input type="text" [(ngModel)]="settings().storagePath" placeholder="C:\\NCQA\\Uploads or \\\\server\\share\\folder"
                class="px-4 py-2 border border-slate-200 rounded-lg w-96 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
        </div>

        <!-- Compliance Settings -->
        <div class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div class="px-6 py-4 border-b border-slate-100 bg-slate-50">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                <mat-icon class="text-emerald-600">verified</mat-icon>
              </div>
              <div>
                <h2 class="text-lg font-semibold text-slate-900">Compliance Settings</h2>
                <p class="text-sm text-slate-500">NCQA compliance thresholds and rules</p>
              </div>
            </div>
          </div>
          <div class="p-6 space-y-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="font-medium text-slate-900">Fully Compliant Threshold</p>
                <p class="text-sm text-slate-500">Minimum score for full compliance</p>
              </div>
              <div class="flex items-center gap-2">
                <input type="number" [(ngModel)]="settings().fullyCompliantThreshold" min="0" max="100"
                  class="px-4 py-2 border border-slate-200 rounded-lg w-24 text-center focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <span class="text-slate-500">%</span>
              </div>
            </div>
            <div class="flex items-center justify-between">
              <div>
                <p class="font-medium text-slate-900">Substantially Compliant Threshold</p>
                <p class="text-sm text-slate-500">Minimum score for substantial compliance</p>
              </div>
              <div class="flex items-center gap-2">
                <input type="number" [(ngModel)]="settings().substantiallyCompliantThreshold" min="0" max="100"
                  class="px-4 py-2 border border-slate-200 rounded-lg w-24 text-center focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <span class="text-slate-500">%</span>
              </div>
            </div>
            <div class="flex items-center justify-between">
              <div>
                <p class="font-medium text-slate-900">Partially Compliant Threshold</p>
                <p class="text-sm text-slate-500">Minimum score for partial compliance</p>
              </div>
              <div class="flex items-center gap-2">
                <input type="number" [(ngModel)]="settings().partiallyCompliantThreshold" min="0" max="100"
                  class="px-4 py-2 border border-slate-200 rounded-lg w-24 text-center focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <span class="text-slate-500">%</span>
              </div>
            </div>
            <div class="flex items-center justify-between">
              <div>
                <p class="font-medium text-slate-900">PSV Verification Window</p>
                <p class="text-sm text-slate-500">Days allowed for primary source verification</p>
              </div>
              <div class="flex items-center gap-2">
                <input type="number" [(ngModel)]="settings().psvVerificationDays" min="1" max="365"
                  class="px-4 py-2 border border-slate-200 rounded-lg w-24 text-center focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <span class="text-slate-500">days</span>
              </div>
            </div>
            <div class="flex items-center justify-between">
              <div>
                <p class="font-medium text-slate-900">Recredentialing Cycle</p>
                <p class="text-sm text-slate-500">Maximum months between recredentialing</p>
              </div>
              <div class="flex items-center gap-2">
                <input type="number" [(ngModel)]="settings().recredentialingCycleMonths" min="1" max="60"
                  class="px-4 py-2 border border-slate-200 rounded-lg w-24 text-center focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <span class="text-slate-500">months</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Notification Settings -->
        <div class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div class="px-6 py-4 border-b border-slate-100 bg-slate-50">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                <mat-icon class="text-amber-600">notifications</mat-icon>
              </div>
              <div>
                <h2 class="text-lg font-semibold text-slate-900">Notification Settings</h2>
                <p class="text-sm text-slate-500">Configure alerts and notifications</p>
              </div>
            </div>
          </div>
          <div class="p-6 space-y-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="font-medium text-slate-900">Email Notifications</p>
                <p class="text-sm text-slate-500">Receive audit completion emails</p>
              </div>
              <mat-slide-toggle [(ngModel)]="settings().emailNotifications" color="primary"></mat-slide-toggle>
            </div>
            <div class="flex items-center justify-between">
              <div>
                <p class="font-medium text-slate-900">Critical Alert Notifications</p>
                <p class="text-sm text-slate-500">Immediate alerts for critical findings</p>
              </div>
              <mat-slide-toggle [(ngModel)]="settings().criticalAlerts" color="primary"></mat-slide-toggle>
            </div>
            <div class="flex items-center justify-between">
              <div>
                <p class="font-medium text-slate-900">License Expiration Warnings</p>
                <p class="text-sm text-slate-500">Alerts before license expiration</p>
              </div>
              <mat-slide-toggle [(ngModel)]="settings().licenseExpirationWarnings" color="primary"></mat-slide-toggle>
            </div>
            <div class="flex items-center justify-between">
              <div>
                <p class="font-medium text-slate-900">Weekly Summary Reports</p>
                <p class="text-sm text-slate-500">Receive weekly compliance summaries</p>
              </div>
              <mat-slide-toggle [(ngModel)]="settings().weeklySummary" color="primary"></mat-slide-toggle>
            </div>
          </div>
        </div>

        <!-- Data Management -->
        <div class="bg-white rounded-2xl border border-rose-200 shadow-sm overflow-hidden">
          <div class="px-6 py-4 border-b border-rose-100 bg-rose-50">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center">
                <mat-icon class="text-rose-600">delete_sweep</mat-icon>
              </div>
              <div>
                <h2 class="text-lg font-semibold text-slate-900">Data Management</h2>
                <p class="text-sm text-slate-500">Manage stored audit data and uploaded files</p>
              </div>
            </div>
          </div>
          <div class="p-6">
            <!-- Row 1: Reset All (completely empty, no demo) -->
            <div class="flex items-start justify-between gap-6 pb-5 border-b border-slate-100">
              <div>
                <p class="font-medium text-slate-900">Reset All Audit Data</p>
                <p class="text-sm text-slate-500 mt-1">Deletes everything including demo data. The system will be completely empty after this action.</p>
              </div>
              @if (!confirmingReset()) {
                <button (click)="confirmingReset.set(true)"
                        class="shrink-0 px-5 py-2.5 bg-rose-600 text-white text-sm font-semibold rounded-xl hover:bg-rose-700 active:scale-95 transition-all flex items-center gap-2">
                  <mat-icon class="text-[18px]">restart_alt</mat-icon>
                  Reset All
                </button>
              } @else {
                <div class="shrink-0 flex flex-col items-end gap-2">
                  <p class="text-xs font-bold text-rose-700">This cannot be undone. Are you sure?</p>
                  <div class="flex gap-2">
                    <button (click)="confirmingReset.set(false)"
                            class="px-4 py-2 text-sm font-medium border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                      Cancel
                    </button>
                    <button (click)="resetAllIncludingDemoData()"
                            class="px-4 py-2 bg-rose-600 text-white text-sm font-semibold rounded-lg hover:bg-rose-700 transition-colors flex items-center gap-1.5">
                      <mat-icon class="text-[16px]">warning</mat-icon>
                      Confirm Reset
                    </button>
                  </div>
                </div>
              }
            </div>

            <!-- Row 2: Reset All + Initialize Demo (keeps demo) -->
            <div class="flex items-start justify-between gap-6 pt-5">
              <div>
                <p class="font-medium text-slate-900">Reset All + Initialize Demo</p>
                <p class="text-sm text-slate-500 mt-1">Deletes all uploaded files and compliance statuses. Demo data will be restored automatically.</p>
              </div>
              @if (!confirmingFullReset()) {
                <button (click)="confirmingFullReset.set(true)"
                        class="shrink-0 px-5 py-2.5 bg-slate-800 text-white text-sm font-semibold rounded-xl hover:bg-slate-900 active:scale-95 transition-all flex items-center gap-2">
                  <mat-icon class="text-[18px]">delete_forever</mat-icon>
                  Reset All + Initialize Demo
                </button>
              } @else {
                <div class="shrink-0 flex flex-col items-end gap-2">
                  <p class="text-xs font-bold text-rose-700">Demo data will be restored. Are you sure?</p>
                  <div class="flex gap-2">
                    <button (click)="confirmingFullReset.set(false)"
                            class="px-4 py-2 text-sm font-medium border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                      Cancel
                    </button>
                    <button (click)="resetAllData()"
                            class="px-4 py-2 bg-slate-800 text-white text-sm font-semibold rounded-lg hover:bg-slate-900 transition-colors flex items-center gap-1.5">
                      <mat-icon class="text-[16px]">warning</mat-icon>
                      Confirm Full Reset
                    </button>
                  </div>
                </div>
              }
            </div>

            <!-- Row 3: Initialize Demo -->
            <div class="flex items-start justify-between gap-6 pt-5 border-t border-slate-100 mt-5">
              <div>
                <p class="font-medium text-slate-900">Initialize Demo Data</p>
                <p class="text-sm text-slate-500 mt-1">Adds the two demo practitioners back without removing any existing audit data.</p>
              </div>
              <button (click)="initializeDemoData()"
                      class="shrink-0 px-5 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 active:scale-95 transition-all flex items-center gap-2">
                <mat-icon class="text-[18px]">add_circle</mat-icon>
                Initialize Demo
              </button>
            </div>
          </div>
        </div>

        <!-- Save Button -->
        <div class="flex justify-end gap-4">
          <button (click)="resetSettings()" class="px-6 py-3 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors">
            Reset to Defaults
          </button>
          <button (click)="saveSettings()" class="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-2">
            <mat-icon class="text-sm">save</mat-icon>
            Save Settings
          </button>
        </div>

        @if (saveMessage()) {
          <div class="fixed bottom-6 right-6 px-6 py-4 bg-emerald-600 text-white rounded-xl shadow-lg flex items-center gap-3 animate-fade-in">
            <mat-icon>check_circle</mat-icon>
            {{ saveMessage() }}
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    @keyframes fade-in {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .animate-fade-in {
      animation: fade-in 0.3s ease-out;
    }
  `]
})
export class Settings implements OnInit {
  private http = inject(HttpClient);
  private auditService = inject(AuditService);
  apiKeyPreview = signal('');
  availableAiModels = signal<string[]>([
    'gemini-2.5-flash',
    'gemini-3.1-pro-preview',
    'gemini-3.5-flash',
    'gemini-3-flash-preview',
    'gemini-3.1-flash-lite',
    'gemini-2.5-pro',
    'gemini-2.5-flash-lite'
  ]);

  settings = signal({
    organizationName: 'Sutherland Healthcare Solutions',
    defaultCredentialingType: 'INITIAL',
    timezone: 'America/New_York',
    fullyCompliantThreshold: 95,
    substantiallyCompliantThreshold: 85,
    partiallyCompliantThreshold: 70,
    psvVerificationDays: 120,
    recredentialingCycleMonths: 36,
    emailNotifications: true,
    criticalAlerts: true,
    licenseExpirationWarnings: true,
    weeklySummary: false,
    aiModel: 'gemini-2.5-flash',
    geminiApiKey: '',
    storagePath: '',
    minConfidenceThreshold: 80,
    enhancedOcr: true
  });

  saveMessage = signal<string | null>(null);
  confirmingReset = signal(false);
  confirmingFullReset = signal(false);

  ngOnInit() {
    this.http.get<{ availableModels: string[]; selectedModel: string; apiKeyPreview: string }>('/api/settings/ai-models').subscribe({
      next: (data) => {
        this.availableAiModels.set(data.availableModels);
        this.apiKeyPreview.set(data.apiKeyPreview);
        this.settings.update(current => ({ ...current, aiModel: data.selectedModel }));
      }
    });

    this.http.get<{ storagePath: string }>('/api/settings/storage').subscribe({
      next: (data) => {
        this.settings.update(current => ({ ...current, storagePath: data.storagePath }));
      }
    });
  }

  saveSettings() {
    forkJoin({
      ai: this.http.post<{ selectedModel: string; availableModels: string[]; apiKeyPreview: string }>('/api/settings/ai-model', {
        model: this.settings().aiModel,
        apiKey: this.settings().geminiApiKey
      }),
      storage: this.http.post<{ storagePath: string }>('/api/settings/storage', { storagePath: this.settings().storagePath })
    }).subscribe({
      next: ({ ai, storage }) => {
        this.availableAiModels.set(ai.availableModels);
        this.apiKeyPreview.set(ai.apiKeyPreview);
        this.settings.update(current => ({ ...current, aiModel: ai.selectedModel, geminiApiKey: '', storagePath: storage.storagePath }));
        this.saveMessage.set('Settings saved successfully!');
        setTimeout(() => this.saveMessage.set(null), 3000);
      },
      error: () => {
        this.saveMessage.set('Failed to save settings. Please try again.');
        setTimeout(() => this.saveMessage.set(null), 3000);
      }
    });
  }

  resetAllData() {
    this.auditService.resetAll().subscribe({
      next: () => {
        this.confirmingReset.set(false);
        this.saveMessage.set('All audit data has been reset. Reloading…');
        setTimeout(() => window.location.reload(), 1500);
      },
      error: () => {
        this.confirmingReset.set(false);
        this.saveMessage.set('Reset failed. Please try again.');
        setTimeout(() => this.saveMessage.set(null), 4000);
      }
    });
  }

  resetAllIncludingDemoData() {
    this.auditService.resetAllIncludingDemo().subscribe({
      next: () => {
        this.confirmingFullReset.set(false);
        this.saveMessage.set('All data including demo has been cleared. Reloading…');
        setTimeout(() => window.location.reload(), 1500);
      },
      error: () => {
        this.confirmingFullReset.set(false);
        this.saveMessage.set('Reset failed. Please try again.');
        setTimeout(() => this.saveMessage.set(null), 4000);
      }
    });
  }

  initializeDemoData() {
    this.auditService.initializeDemo().subscribe({
      next: () => {
        this.saveMessage.set('Demo data initialized successfully. Reloading…');
        setTimeout(() => window.location.reload(), 1500);
      },
      error: () => {
        this.saveMessage.set('Failed to initialize demo data. Please try again.');
        setTimeout(() => this.saveMessage.set(null), 4000);
      }
    });
  }

  resetSettings() {
    this.settings.set({
      organizationName: 'Sutherland Healthcare Solutions',
      defaultCredentialingType: 'INITIAL',
      timezone: 'America/New_York',
      fullyCompliantThreshold: 95,
      substantiallyCompliantThreshold: 85,
      partiallyCompliantThreshold: 70,
      psvVerificationDays: 120,
      recredentialingCycleMonths: 36,
      emailNotifications: true,
      criticalAlerts: true,
      licenseExpirationWarnings: true,
      weeklySummary: false,
      aiModel: 'gemini-2.5-flash',
      geminiApiKey: '',
      storagePath: '',
      minConfidenceThreshold: 80,
      enhancedOcr: true
    });
  }
}
