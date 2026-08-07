import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { Router } from '@angular/router';
import { AuditService } from '../../services/audit.service';
import { CredentialType, DocumentType } from '../../services/audit.types';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-upload',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, FormsModule],
  template: `
    <div class="max-w-5xl mx-auto space-y-10">
      <div>
        <h2 class="text-4xl font-extrabold text-slate-900 tracking-tight">New Compliance Audit</h2>
        <p class="text-slate-500 mt-2 font-medium">Upload practitioner credentialing files for automated NCQA 2025 compliance verification.</p>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- Main Upload Section -->
        <div class="lg:col-span-2 space-y-8">
          <div class="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-10 space-y-10">
            <!-- Audit Type Selection -->
            <div class="space-y-6">
              <div class="flex items-center justify-between">
                <p class="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Credentialing Type</p>
                <span class="text-[10px] text-blue-600 font-bold">Step 1 of 3</span>
              </div>
              <div class="grid grid-cols-3 gap-4">
                @for (type of credentialTypes; track type.value) {
                  <button (click)="selectedType.set(type.value)"
                          [ngClass]="selectedType() === type.value ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20 border-blue-600' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'"
                          class="p-5 border rounded-2xl text-left transition-all active:scale-95">
                    <mat-icon class="mb-3" [ngClass]="selectedType() === type.value ? 'text-white' : 'text-blue-600'">{{ type.icon }}</mat-icon>
                    <p class="text-sm font-bold">{{ type.value }}</p>
                    <p class="text-[10px] mt-1" [ngClass]="selectedType() === type.value ? 'text-blue-100' : 'text-slate-400'">{{ type.description }}</p>
                  </button>
                }
              </div>
            </div>

            <!-- Practitioner Info (Optional) -->
            <div class="space-y-6">
              <div class="flex items-center justify-between">
                <p class="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Practitioner Info (Optional)</p>
                <span class="text-[10px] text-blue-600 font-bold">Step 2 of 3</span>
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="text-xs font-bold text-slate-600 mb-2 block">Practitioner Name</label>
                  <input type="text" [(ngModel)]="practitionerName" placeholder="Dr. John Smith"
                         class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
                </div>
                <div>
                  <label class="text-xs font-bold text-slate-600 mb-2 block">NPI Number</label>
                  <input type="text" [(ngModel)]="npiNumber" placeholder="1234567890" maxlength="10"
                         class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
                </div>
              </div>
            </div>

            <!-- Dropzone -->
            <div class="space-y-6">
              <div class="flex items-center justify-between">
                <p class="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Upload Documents</p>
                <span class="text-[10px] text-blue-600 font-bold">Step 3 of 3</span>
              </div>
              <div (dragover)="onDragOver($event)" 
                   (dragleave)="onDragLeave($event)"
                   (drop)="onFileDrop($event)"
                   (keydown.enter)="fileInput.click()"
                   tabindex="0"
                   [ngClass]="isDragging() ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-400 hover:bg-blue-50/30'"
                   class="border-2 border-dashed rounded-[2rem] p-16 text-center transition-all cursor-pointer group"
                   (click)="fileInput.click()">
                <input #fileInput type="file" multiple class="hidden" 
                       accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.tiff,.xlsx,.xls,.zip,.rar"
                       (change)="onFileSelect($event)">
                <div class="w-20 h-20 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                  <mat-icon class="text-3xl">cloud_upload</mat-icon>
                </div>
                <h3 class="text-xl font-black text-slate-900 tracking-tight">Drop files here or click to browse</h3>
                <p class="text-slate-400 text-sm mt-3 max-w-md mx-auto leading-relaxed">
                  Supports PDF, Word, Excel, Images (JPEG, PNG, TIFF), and ZIP archives. Max 50MB per file.
                </p>
              </div>
            </div>

            <!-- File List -->
            @if (files().length > 0) {
              <div class="space-y-4">
                <div class="flex items-center justify-between">
                  <p class="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                    Selected Files ({{ files().length }}) • {{ getTotalSize() }}
                  </p>
                  <button (click)="files.set([])" class="text-xs text-rose-600 font-bold hover:underline">Clear All</button>
                </div>
                <div class="max-h-64 overflow-y-auto space-y-2 pr-2">
                  @for (file of files(); track file.name; let i = $index) {
                    <div class="flex items-center justify-between p-4 bg-slate-50/50 rounded-xl border border-slate-100 group hover:border-blue-200 transition-colors">
                      <div class="flex items-center gap-3 min-w-0">
                        <div class="w-10 h-10 rounded-lg flex items-center justify-center shadow-sm"
                             [ngClass]="getFileIconClass(file.name)">
                          <mat-icon class="text-sm">{{ getFileIcon(file.name) }}</mat-icon>
                        </div>
                        <div class="min-w-0">
                          <p class="text-sm font-bold text-slate-900 truncate">{{ file.name }}</p>
                          <p class="text-[10px] text-slate-400">{{ formatFileSize(file.size) }}</p>
                        </div>
                      </div>
                      <button (click)="removeFile(i); $event.stopPropagation()" 
                              class="w-8 h-8 rounded-lg text-slate-300 hover:bg-rose-50 hover:text-rose-600 transition-all flex items-center justify-center shrink-0">
                        <mat-icon class="text-sm">close</mat-icon>
                      </button>
                    </div>
                  }
                </div>
              </div>
            }

            <!-- Submit Button -->
            <div class="pt-6 border-t border-slate-100">
              <button (click)="upload()"
                      [disabled]="files().length === 0 || isUploading()"
                      [ngClass]="files().length === 0 ? 'opacity-50 cursor-not-allowed' : ''"
                      class="w-full btn-primary flex items-center justify-center gap-3 py-5 text-lg">
                @if (!isUploading()) {
                  <mat-icon>bolt</mat-icon>
                  <span>Start NCQA 2025 Compliance Audit</span>
                } @else {
                  <div class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Uploading & Analyzing...</span>
                }
              </button>
              <p class="text-center text-[10px] text-slate-400 mt-4">
                Processing typically takes 1-3 minutes depending on document complexity
              </p>
            </div>
          </div>
        </div>

        <!-- Sidebar -->
        <div class="space-y-6">
          <!-- Required Documents Checklist -->
          <div class="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-8" style="display:none">
            <h3 class="text-lg font-bold text-slate-900 mb-6">Required Documents</h3>
            <div class="space-y-3">
              @for (doc of requiredDocuments; track doc.type) {
                <div class="flex items-center gap-3 p-3 rounded-xl" 
                     [ngClass]="doc.required ? 'bg-slate-50' : 'bg-slate-50/50'">
                  <div class="w-6 h-6 rounded-full flex items-center justify-center"
                       [ngClass]="doc.required ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'">
                    <mat-icon class="text-xs">{{ doc.required ? 'check' : 'remove' }}</mat-icon>
                  </div>
                  <div class="flex-1">
                    <p class="text-xs font-bold text-slate-700">{{ doc.type }}</p>
                    <p class="text-[10px] text-slate-400">{{ doc.description }}</p>
                  </div>
                </div>
              }
            </div>
          </div>

          <!-- NCQA 2025 Info -->
          <div class="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2rem] p-8 text-white">
            <div class="flex items-center gap-2 mb-4">
              <mat-icon>verified_user</mat-icon>
              <h4 class="font-bold">NCQA 2025 Standards</h4>
            </div>
            <div class="space-y-3 text-sm">
              <div class="flex justify-between py-2 border-b border-white/10">
                <span class="text-blue-100">Accreditation Timeframe</span>
                <span class="font-bold">120 days</span>
              </div>
              <div class="flex justify-between py-2 border-b border-white/10">
                <span class="text-blue-100">Certification Timeframe</span>
                <span class="font-bold">90 days</span>
              </div>
              <div class="flex justify-between py-2">
                <span class="text-blue-100">Monitoring</span>
                <span class="font-bold">Every 30 days</span>
              </div>
            </div>
          </div>

          <!-- Security Info -->
          <div class="bg-emerald-50 rounded-[2rem] border border-emerald-100 p-8">
            <div class="flex items-center gap-2 mb-4 text-emerald-700">
              <mat-icon>security</mat-icon>
              <h4 class="font-bold">HIPAA Compliant</h4>
            </div>
            <p class="text-xs text-emerald-600 leading-relaxed">
              All uploads are encrypted with AES-256. Data is processed securely and never stored permanently without your consent.
            </p>
          </div>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Upload {
  private auditService = inject(AuditService);
  private router = inject(Router);

  credentialTypes = [
    { value: CredentialType.INITIAL, icon: 'person_add', description: 'New practitioner' },
    { value: CredentialType.RECREDENTIALING, icon: 'refresh', description: 'Renewal (≤36 mo)' }
  ];
  
  requiredDocuments = [
    { type: 'Application', description: 'Signed practitioner application', required: true },
    { type: 'Attestation', description: 'Signed attestation form', required: true },
    { type: 'License', description: 'State medical license', required: true },
    { type: 'DEA/CDS', description: 'DEA registration certificate', required: true },
    { type: 'Education', description: 'Medical school verification', required: true },
    { type: 'Board Cert', description: 'Board certification (if claimed)', required: false },
    { type: 'Malpractice', description: 'Insurance certificate', required: true },
    { type: 'Sanctions', description: 'OIG/SAM query results', required: true },
    { type: 'CV/Work History', description: '5-year work history', required: true },
    { type: 'Committee Decision', description: 'Approval documentation', required: true }
  ];

  selectedType = signal<CredentialType>(CredentialType.INITIAL);
  files = signal<File[]>([]);
  isUploading = signal(false);
  isDragging = signal(false);
  practitionerName = '';
  npiNumber = '';

  onFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      const selectedFiles = Array.from(input.files).filter(f => this.isValidFile(f));
      this.files.update(f => [...f, ...selectedFiles]);
    }
    // Reset input to allow selecting same file again
    (event.target as HTMLInputElement).value = '';
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    this.isDragging.set(false);
  }

  onFileDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragging.set(false);
    if (event.dataTransfer?.files) {
      const droppedFiles = Array.from(event.dataTransfer.files).filter(f => this.isValidFile(f));
      this.files.update(f => [...f, ...droppedFiles]);
    }
  }

  isValidFile(file: File): boolean {
    const validTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg',
      'image/png',
      'image/tiff',
      'application/zip',
      'application/x-rar-compressed'
    ];
    const maxSize = 50 * 1024 * 1024; // 50MB
    return validTypes.includes(file.type) && file.size <= maxSize;
  }

  removeFile(index: number) {
    this.files.update(f => f.filter((_, i) => i !== index));
  }

  getTotalSize(): string {
    const total = this.files().reduce((sum, f) => sum + f.size, 0);
    return this.formatFileSize(total);
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }

  getFileIcon(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf': return 'picture_as_pdf';
      case 'doc':
      case 'docx': return 'description';
      case 'xls':
      case 'xlsx': return 'table_chart';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'tiff': return 'image';
      case 'zip':
      case 'rar': return 'folder_zip';
      default: return 'insert_drive_file';
    }
  }

  getFileIconClass(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf': return 'bg-rose-100 text-rose-600';
      case 'doc':
      case 'docx': return 'bg-blue-100 text-blue-600';
      case 'xls':
      case 'xlsx': return 'bg-emerald-100 text-emerald-600';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'tiff': return 'bg-purple-100 text-purple-600';
      case 'zip':
      case 'rar': return 'bg-amber-100 text-amber-600';
      default: return 'bg-slate-100 text-slate-600';
    }
  }

  upload() {
    if (this.files().length === 0) return;
    
    this.isUploading.set(true);
    
    const tags: string[] = [];
    if (this.practitionerName) tags.push(`name:${this.practitionerName}`);
    if (this.npiNumber) tags.push(`npi:${this.npiNumber}`);

    this.auditService.uploadFiles(this.files(), this.selectedType(), tags).subscribe({
      next: (response) => {
        this.router.navigate(['/audit', response.data.id]);
      },
      error: (err) => {
        console.error('Upload failed', err);
        this.isUploading.set(false);
      }
    });
  }
}
