import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
    <div class="p-8 max-w-5xl mx-auto">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-slate-900">User Profile</h1>
        <p class="text-slate-500 mt-2">Manage your account information and preferences</p>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Profile Card -->
        <div class="lg:col-span-1">
          <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 text-center">
            <div class="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 mx-auto flex items-center justify-center text-white text-3xl font-bold mb-4">
              {{ getInitials() }}
            </div>
            <h2 class="text-xl font-bold text-slate-900">{{ profile().fullName }}</h2>
            <p class="text-slate-500">{{ profile().role }}</p>
            <div class="mt-4 flex justify-center gap-2">
              <span class="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium">Active</span>
              <span class="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">{{ profile().department }}</span>
            </div>
            
            <div class="mt-6 pt-6 border-t border-slate-100">
              <div class="grid grid-cols-2 gap-4 text-center">
                <div>
                  <p class="text-2xl font-bold text-slate-900">{{ profile().auditsCompleted }}</p>
                  <p class="text-xs text-slate-500">Audits Completed</p>
                </div>
                <div>
                  <p class="text-2xl font-bold text-slate-900">{{ profile().avgAccuracy }}%</p>
                  <p class="text-xs text-slate-500">Avg Accuracy</p>
                </div>
              </div>
            </div>

            <button class="mt-6 w-full px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2">
              <mat-icon class="text-sm">photo_camera</mat-icon>
              Change Photo
            </button>
          </div>

          <!-- Quick Stats -->
          <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mt-6">
            <h3 class="font-semibold text-slate-900 mb-4">Activity Summary</h3>
            <div class="space-y-4">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                    <mat-icon class="text-blue-600 text-sm">upload_file</mat-icon>
                  </div>
                  <span class="text-sm text-slate-600">Files Uploaded</span>
                </div>
                <span class="font-semibold text-slate-900">{{ profile().filesUploaded }}</span>
              </div>
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <mat-icon class="text-emerald-600 text-sm">check_circle</mat-icon>
                  </div>
                  <span class="text-sm text-slate-600">Approved</span>
                </div>
                <span class="font-semibold text-slate-900">{{ profile().approvedAudits }}</span>
              </div>
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                    <mat-icon class="text-amber-600 text-sm">pending</mat-icon>
                  </div>
                  <span class="text-sm text-slate-600">Pending Review</span>
                </div>
                <span class="font-semibold text-slate-900">{{ profile().pendingReviews }}</span>
              </div>
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center">
                    <mat-icon class="text-rose-600 text-sm">flag</mat-icon>
                  </div>
                  <span class="text-sm text-slate-600">Flagged Items</span>
                </div>
                <span class="font-semibold text-slate-900">{{ profile().flaggedItems }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Profile Details -->
        <div class="lg:col-span-2 space-y-6">
          <!-- Personal Information -->
          <div class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div class="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                  <mat-icon class="text-blue-600">person</mat-icon>
                </div>
                <div>
                  <h2 class="text-lg font-semibold text-slate-900">Personal Information</h2>
                  <p class="text-sm text-slate-500">Your basic account details</p>
                </div>
              </div>
              <button (click)="toggleEdit('personal')" class="text-blue-600 hover:text-blue-700 text-sm font-medium">
                {{ isEditing() === 'personal' ? 'Cancel' : 'Edit' }}
              </button>
            </div>
            <div class="p-6 space-y-4">
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-slate-500 mb-1">Full Name</label>
                  @if (isEditing() === 'personal') {
                    <input type="text" [(ngModel)]="profile().fullName" 
                      class="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  } @else {
                    <p class="text-slate-900 font-medium">{{ profile().fullName }}</p>
                  }
                </div>
                <div>
                  <label class="block text-sm font-medium text-slate-500 mb-1">Email Address</label>
                  @if (isEditing() === 'personal') {
                    <input type="email" [(ngModel)]="profile().email" 
                      class="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  } @else {
                    <p class="text-slate-900 font-medium">{{ profile().email }}</p>
                  }
                </div>
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-slate-500 mb-1">Phone Number</label>
                  @if (isEditing() === 'personal') {
                    <input type="tel" [(ngModel)]="profile().phone" 
                      class="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  } @else {
                    <p class="text-slate-900 font-medium">{{ profile().phone }}</p>
                  }
                </div>
                <div>
                  <label class="block text-sm font-medium text-slate-500 mb-1">Employee ID</label>
                  <p class="text-slate-900 font-medium">{{ profile().employeeId }}</p>
                </div>
              </div>
              @if (isEditing() === 'personal') {
                <div class="flex justify-end">
                  <button (click)="saveSection('personal')" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    Save Changes
                  </button>
                </div>
              }
            </div>
          </div>

          <!-- Work Information -->
          <div class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div class="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <mat-icon class="text-emerald-600">work</mat-icon>
                </div>
                <div>
                  <h2 class="text-lg font-semibold text-slate-900">Work Information</h2>
                  <p class="text-sm text-slate-500">Your role and department details</p>
                </div>
              </div>
            </div>
            <div class="p-6 space-y-4">
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-slate-500 mb-1">Role</label>
                  <p class="text-slate-900 font-medium">{{ profile().role }}</p>
                </div>
                <div>
                  <label class="block text-sm font-medium text-slate-500 mb-1">Department</label>
                  <p class="text-slate-900 font-medium">{{ profile().department }}</p>
                </div>
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-slate-500 mb-1">Manager</label>
                  <p class="text-slate-900 font-medium">{{ profile().manager }}</p>
                </div>
                <div>
                  <label class="block text-sm font-medium text-slate-500 mb-1">Start Date</label>
                  <p class="text-slate-900 font-medium">{{ profile().startDate }}</p>
                </div>
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-500 mb-1">Permissions</label>
                <div class="flex flex-wrap gap-2 mt-1">
                  @for (permission of profile().permissions; track permission) {
                    <span class="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-sm">{{ permission }}</span>
                  }
                </div>
              </div>
            </div>
          </div>

          <!-- Security -->
          <div class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div class="px-6 py-4 border-b border-slate-100 bg-slate-50">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center">
                  <mat-icon class="text-rose-600">security</mat-icon>
                </div>
                <div>
                  <h2 class="text-lg font-semibold text-slate-900">Security</h2>
                  <p class="text-sm text-slate-500">Password and authentication settings</p>
                </div>
              </div>
            </div>
            <div class="p-6 space-y-4">
              <div class="flex items-center justify-between py-3 border-b border-slate-100">
                <div>
                  <p class="font-medium text-slate-900">Password</p>
                  <p class="text-sm text-slate-500">Last changed {{ profile().lastPasswordChange }}</p>
                </div>
                <button class="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors">
                  Change Password
                </button>
              </div>
              <div class="flex items-center justify-between py-3 border-b border-slate-100">
                <div>
                  <p class="font-medium text-slate-900">Two-Factor Authentication</p>
                  <p class="text-sm text-slate-500">{{ profile().twoFactorEnabled ? 'Enabled' : 'Not enabled' }}</p>
                </div>
                <button class="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors">
                  {{ profile().twoFactorEnabled ? 'Manage' : 'Enable' }}
                </button>
              </div>
              <div class="flex items-center justify-between py-3">
                <div>
                  <p class="font-medium text-slate-900">Active Sessions</p>
                  <p class="text-sm text-slate-500">{{ profile().activeSessions }} active session(s)</p>
                </div>
                <button class="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors">
                  View Sessions
                </button>
              </div>
            </div>
          </div>

          <!-- Recent Activity -->
          <div class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div class="px-6 py-4 border-b border-slate-100 bg-slate-50">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
                  <mat-icon class="text-violet-600">history</mat-icon>
                </div>
                <div>
                  <h2 class="text-lg font-semibold text-slate-900">Recent Activity</h2>
                  <p class="text-sm text-slate-500">Your latest actions in the system</p>
                </div>
              </div>
            </div>
            <div class="divide-y divide-slate-100">
              @for (activity of recentActivity(); track activity.id) {
                <div class="px-6 py-4 flex items-center gap-4">
                  <div class="w-10 h-10 rounded-full flex items-center justify-center"
                    [class]="getActivityIconClass(activity.type)">
                    <mat-icon class="text-sm">{{ getActivityIcon(activity.type) }}</mat-icon>
                  </div>
                  <div class="flex-1">
                    <p class="text-slate-900">{{ activity.description }}</p>
                    <p class="text-sm text-slate-500">{{ activity.timestamp }}</p>
                  </div>
                </div>
              }
            </div>
          </div>
        </div>
      </div>

      @if (saveMessage()) {
        <div class="fixed bottom-6 right-6 px-6 py-4 bg-emerald-600 text-white rounded-xl shadow-lg flex items-center gap-3 animate-fade-in">
          <mat-icon>check_circle</mat-icon>
          {{ saveMessage() }}
        </div>
      }
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
export class Profile {
  profile = signal({
    fullName: 'Dr. Jennifer Williams',
    email: 'j.williams@healthcareplus.org',
    phone: '(555) 123-4567',
    employeeId: 'EMP-2024-0142',
    role: 'Credentialing Specialist',
    department: 'Medical Staff Services',
    manager: 'Sarah Thompson',
    startDate: 'March 15, 2022',
    permissions: ['View Audits', 'Upload Documents', 'Run Audits', 'Export Reports', 'Manage Alerts'],
    lastPasswordChange: '45 days ago',
    twoFactorEnabled: true,
    activeSessions: 2,
    auditsCompleted: 156,
    avgAccuracy: 94,
    filesUploaded: 423,
    approvedAudits: 142,
    pendingReviews: 8,
    flaggedItems: 6
  });

  recentActivity = signal([
    { id: 1, type: 'audit', description: 'Completed audit for Dr. Sarah Johnson', timestamp: '2 hours ago' },
    { id: 2, type: 'upload', description: 'Uploaded 3 credentialing documents', timestamp: '4 hours ago' },
    { id: 3, type: 'export', description: 'Exported compliance report (PDF)', timestamp: 'Yesterday at 3:45 PM' },
    { id: 4, type: 'review', description: 'Reviewed and approved Dr. Michael Chen', timestamp: 'Yesterday at 11:20 AM' },
    { id: 5, type: 'alert', description: 'Acknowledged license expiration alert', timestamp: '2 days ago' }
  ]);

  isEditing = signal<string | null>(null);
  saveMessage = signal<string | null>(null);

  getInitials(): string {
    return this.profile().fullName.split(' ').map(n => n[0]).join('').substring(0, 2);
  }

  toggleEdit(section: string) {
    this.isEditing.set(this.isEditing() === section ? null : section);
  }

  saveSection(section: string) {
    this.isEditing.set(null);
    this.saveMessage.set('Profile updated successfully!');
    setTimeout(() => this.saveMessage.set(null), 3000);
  }

  getActivityIcon(type: string): string {
    const icons: Record<string, string> = {
      audit: 'fact_check',
      upload: 'upload_file',
      export: 'download',
      review: 'check_circle',
      alert: 'notifications'
    };
    return icons[type] || 'circle';
  }

  getActivityIconClass(type: string): string {
    const classes: Record<string, string> = {
      audit: 'bg-blue-100 text-blue-600',
      upload: 'bg-emerald-100 text-emerald-600',
      export: 'bg-violet-100 text-violet-600',
      review: 'bg-amber-100 text-amber-600',
      alert: 'bg-rose-100 text-rose-600'
    };
    return classes[type] || 'bg-slate-100 text-slate-600';
  }
}
