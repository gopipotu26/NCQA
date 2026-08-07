import { ChangeDetectionStrategy, Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuditService } from '../../services/audit.service';
import { AuditResult, AuditFinding, FindingStatus, ComplianceTier, CategoryScore, ApprovalStatus, ProviderIdentityConsistency } from '../../services/audit.types';
import { DocumentViewer } from '../document-viewer/document-viewer';

@Component({
  selector: 'app-audit-detail',
  standalone: true,
  host: { class: 'flex gap-6 w-full' },
  imports: [CommonModule, MatIconModule, MatButtonModule, RouterLink, FormsModule, DocumentViewer],
  template: `
    <!-- Processing State -->
    @if (isProcessing() && !result()) {
      <div class="flex-1 flex flex-col items-center justify-center py-16 text-center bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div class="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center mb-6 animate-pulse">
          <mat-icon class="text-blue-600 text-4xl">hourglass_top</mat-icon>
        </div>
        <h2 class="text-2xl font-bold text-slate-900 mb-2">Processing Audit</h2>
        <p class="text-slate-500 mb-4">AI is analyzing the uploaded documents...</p>
        <div class="w-64 h-2 bg-slate-100 rounded-full overflow-hidden">
          <div class="h-full bg-blue-600 rounded-full animate-[loading_2s_ease-in-out_infinite]" style="width: 60%"></div>
        </div>
        <p class="text-xs text-slate-400 mt-4">This may take 1-3 minutes depending on document complexity</p>
      </div>
    }

    <!-- FR Modal -->
    @if (showFRModal()) {
      <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-[200]" (click)="closeFRModal()">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-6xl mx-4 overflow-hidden max-h-[90vh] overflow-y-auto" (click)="$event.stopPropagation()">
          <div class="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600">
                <mat-icon class="text-[18px]">menu_book</mat-icon>
              </div>
              <div>
                <h3 class="text-lg font-bold text-slate-900">NCQA Compliance Rule Engine</h3>
                <p class="text-xs text-slate-500">Comprehensive NCQA 2025 credentialing standards and validation rules</p>
              </div>
            </div>
            <button (click)="closeFRModal()" 
                    class="p-2 rounded-lg hover:bg-slate-200 transition-colors">
              <mat-icon class="text-slate-600">close</mat-icon>
            </button>
          </div>

          <div class="p-6 space-y-4">
            <!-- FR-008 Accordion -->
            <div class="border border-slate-200 rounded-xl overflow-hidden">
              <button (click)="toggleAccordion('modal-fr008')" 
                      class="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <span class="px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 text-[9px] font-bold tracking-wider">FR-008</span>
                  <span class="text-xs font-bold text-slate-800">Practitioner Application and Attestation Validation</span>
                  <span class="text-[9px] font-bold text-slate-400 bg-white px-2 py-0.5 rounded-full border border-slate-200">5.6%/FR 15%</span>
                </div>
                <mat-icon class="text-slate-400 transition-transform" 
                          [ngClass]="expandedAccordions().includes('modal-fr008') ? 'rotate-180' : ''">
                  expand_more
                </mat-icon>
              </button>
              @if (expandedAccordions().includes('modal-fr008')) {
                <div class="p-4 bg-white border-t border-slate-100">
                  <p class="text-xs text-slate-600 mb-2">The system shall verify that each file contains:</p>
                  <ul class="space-y-1 text-[10px] text-slate-600 ml-4">
                    <li class="flex items-start gap-1"><span class="text-blue-400 mt-0.5">•</span> Completed application with required identifiers (name, DOB or unique ID, NPI, specialty, practice locations)</li>
                    <li class="flex items-start gap-1"><span class="text-blue-400 mt-0.5">•</span> Current CV or work history covering at least 5 years with explanations for gaps > 6 months</li>
                    <li class="flex items-start gap-1"><span class="text-blue-400 mt-0.5">•</span> Signed and dated attestation within the required timeframe (120-180 days of credentialing decision, depending on program version)</li>
                    <li class="flex items-start gap-1"><span class="text-blue-400 mt-0.5">•</span> Required attestation elements must come from Disclosure Questions in the Attestation/Application attestation section, not work history: Sanctions or licensure issues disclosure, Malpractice claims history disclosure, Physical/mental health status as it relates to ability to practice, Lack of current substance abuse, History of loss or limitation of privileges</li>
                    <li class="flex items-start gap-1"><span class="text-blue-400 mt-0.5">•</span> (2025+) Optional race, ethnicity, and language questions with non-discrimination language</li>
                  </ul>
                  <div class="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                    <p class="text-[9px] font-bold text-amber-800">Compliance Rule: Flag as non-compliant if any required disclosure question is missing, unanswered, undated, outside the acceptable timeframe, or if evidence is taken from work history/CV instead of the Attestation/Application Disclosure Questions section.</p>
                  </div>
                </div>
              }
            </div>

            <!-- FR-009 Accordion -->
            <div class="border border-slate-200 rounded-xl overflow-hidden">
              <button (click)="toggleAccordion('modal-fr009')" 
                      class="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <span class="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 text-[9px] font-bold tracking-wider">FR-009</span>
                  <span class="text-xs font-bold text-slate-800">Primary Source Verification (PSV) Validation</span>
                  <span class="text-[9px] font-bold text-slate-400 bg-white px-2 py-0.5 rounded-full border border-slate-200">16.9%/FR 45%</span>
                </div>
                <mat-icon class="text-slate-400 transition-transform" 
                          [ngClass]="expandedAccordions().includes('modal-fr009') ? 'rotate-180' : ''">
                  expand_more
                </mat-icon>
              </button>
              @if (expandedAccordions().includes('modal-fr009')) {
                <div class="p-4 bg-white border-t border-slate-100">
                  <p class="text-xs text-slate-600 mb-2">The system shall verify that each required credential has been verified from an acceptable primary source and that the file documents the source, method, and date.</p>
                  
                  <div class="mb-3">
                    <p class="text-[9px] font-bold text-slate-700 mb-1">Table 2: Primary source verification requirements (2025 standards)</p>
                    <div class="overflow-x-auto">
                      <table class="w-full text-[9px]">
                        <thead>
                          <tr class="border-b border-slate-200">
                            <th class="text-left py-1 px-2 font-semibold text-slate-700">Credential</th>
                            <th class="text-left py-1 px-2 font-semibold text-slate-700">Primary Source</th>
                            <th class="text-left py-1 px-2 font-semibold text-slate-700">Timing Requirement</th>
                          </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100">
                          <tr><td class="py-1 px-2">State License</td><td class="py-1 px-2">State licensing board PSV document</td><td class="py-1 px-2">120 days (accred) / 90 days (cert) from verification date to decision date</td></tr>
                          <tr><td class="py-1 px-2">DEA/CDS</td><td class="py-1 px-2">DEA database or state site PSV document</td><td class="py-1 px-2">120 days (accred) / 90 days (cert) from verification date to decision date</td></tr>
                          <tr><td class="py-1 px-2">Education</td><td class="py-1 px-2">School, program, or designated verifier</td><td class="py-1 px-2">Once (initial credentialing)</td></tr>
                          <tr><td class="py-1 px-2">Board Certification</td><td class="py-1 px-2">ABMS, AOA, or recognized board</td><td class="py-1 px-2">As claimed or required</td></tr>
                          <tr><td class="py-1 px-2">Work History</td><td class="py-1 px-2">Direct verification or CV review</td><td class="py-1 px-2">5 years minimum</td></tr>
                          <tr><td class="py-1 px-2">Malpractice Insurance</td><td class="py-1 px-2">CAQH malpractice insurance section or insurance copy/certificate, not practitioner profile</td><td class="py-1 px-2">Current coverage</td></tr>
                          <tr><td class="py-1 px-2">Malpractice History</td><td class="py-1 px-2">Loss runs or NPDB document</td><td class="py-1 px-2">Documented review</td></tr>
                          <tr><td class="py-1 px-2">Sanctions/Exclusions</td><td class="py-1 px-2">OIG, SAM, Medicare Opt Out, Medicare Preclusion, Medicaid Sanctions</td><td class="py-1 px-2">120 days (accred) / 90 days (cert) from verification date to decision date</td></tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div class="p-2 bg-amber-50 border border-amber-200 rounded-lg">
                    <p class="text-[9px] font-bold text-amber-800">Compliance Rule: Flag as non-compliant if required PSV is missing, verification source is not primary or acceptable per policy, verification date is missing or falls outside the allowed window calculated from verification date to decision date, method of verification is not documented, malpractice insurance evidence points to practitioner profile instead of CAQH malpractice insurance section or insurance copy/certificate, or other source evidence points to practitioner profile instead of the applicable PSV/NPDB/sanctions document.</p>
                  </div>
                </div>
              }
            </div>

            <!-- FR-010 Accordion -->
            <div class="border border-slate-200 rounded-xl overflow-hidden">
              <button (click)="toggleAccordion('modal-fr010')" 
                      class="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <span class="px-2 py-0.5 rounded-md bg-purple-100 text-purple-700 text-[9px] font-bold tracking-wider">FR-010</span>
                  <span class="text-xs font-bold text-slate-800">Credentialing Decision Validation</span>
                  <span class="text-[9px] font-bold text-slate-400 bg-white px-2 py-0.5 rounded-full border border-slate-200">5.6%/FR 15%</span>
                </div>
                <mat-icon class="text-slate-400 transition-transform" 
                          [ngClass]="expandedAccordions().includes('modal-fr010') ? 'rotate-180' : ''">
                  expand_more
                </mat-icon>
              </button>
              @if (expandedAccordions().includes('modal-fr010')) {
                <div class="p-4 bg-white border-t border-slate-100">
                  <p class="text-xs text-slate-600 mb-2">The system shall verify that the file contains evidence of a credentialing decision:</p>
                  <ul class="space-y-1 text-[10px] text-slate-600 ml-4">
                    <li class="flex items-start gap-1"><span class="text-purple-400 mt-0.5">•</span> Committee meeting minutes or medical director approval received/not received</li>
                    <li class="flex items-start gap-1"><span class="text-purple-400 mt-0.5">•</span> Practitioner name, decision (approve, deny, restrict), and decision date clearly documented in committee or medical director approval documentation</li>
                    <li class="flex items-start gap-1"><span class="text-purple-400 mt-0.5">•</span> Decision date occurs after all required verifications are complete</li>
                    <li class="flex items-start gap-1"><span class="text-purple-400 mt-0.5">•</span> Verification Dates of relative PSVs are within the NCQA timelines from the Decision date</li>
                    <li class="flex items-start gap-1"><span class="text-purple-400 mt-0.5">•</span> For adverse actions, documentation of rationale and communication process</li>
                  </ul>
                  <div class="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                    <p class="text-[9px] font-bold text-amber-800">Compliance Rule: Flag as non-compliant if committee or medical director approval documentation is missing, undated, or if relative PSV verification dates are outside NCQA timelines from the decision date.</p>
                  </div>
                </div>
              }
            </div>

            <!-- FR-011 Accordion -->
            <div class="border border-slate-200 rounded-xl overflow-hidden">
              <button (click)="toggleAccordion('modal-fr011')" 
                      class="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <span class="px-2 py-0.5 rounded-md bg-amber-100 text-amber-700 text-[9px] font-bold tracking-wider">FR-011</span>
                  <span class="text-xs font-bold text-slate-800">Recredentialing Cycle Validation</span>
                  <span class="text-[9px] font-bold text-slate-400 bg-white px-2 py-0.5 rounded-full border border-slate-200">3.8%/FR 10%</span>
                </div>
                <mat-icon class="text-slate-400 transition-transform" 
                          [ngClass]="expandedAccordions().includes('modal-fr011') ? 'rotate-180' : ''">
                  expand_more
                </mat-icon>
              </button>
              @if (expandedAccordions().includes('modal-fr011')) {
                <div class="p-4 bg-white border-t border-slate-100">
                  <p class="text-xs text-slate-600 mb-2">For recredentialing files, the system shall verify:</p>
                  <ul class="space-y-1 text-[10px] text-slate-600 ml-4">
                    <li class="flex items-start gap-1"><span class="text-amber-400 mt-0.5">•</span> Recredentialing performed within 36 months of previous credentialing decision</li>
                    <li class="flex items-start gap-1"><span class="text-amber-400 mt-0.5">•</span> All PSV elements refreshed (license, DEA/CDS, board certification status, malpractice, sanctions, work history)</li>
                    <li class="flex items-start gap-1"><span class="text-amber-400 mt-0.5">•</span> Refreshed verifications are within required timeframes</li>
                    <li class="flex items-start gap-1"><span class="text-amber-400 mt-0.5">•</span> Updated attestation signed and dated by practitioner</li>
                  </ul>
                  <div class="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                    <p class="text-[9px] font-bold text-amber-800">Compliance Rule: Flag as non-compliant if recredentialing cycle exceeds 36 months or required PSVs are not refreshed.</p>
                  </div>
                </div>
              }
            </div>

            <!-- FR-012 Ongoing Monitoring Evidence excluded from audit processing and display. -->

            <!-- FR-013 Accordion -->
            <div class="border border-rose-200 rounded-xl overflow-hidden">
              <button (click)="toggleAccordion('modal-fr013')" 
                      class="w-full px-4 py-3 bg-rose-50 hover:bg-rose-100 transition-colors flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <span class="px-2 py-0.5 rounded-md bg-rose-100 text-rose-700 text-[9px] font-bold tracking-wider">FR-013</span>
                  <span class="text-xs font-bold text-slate-800">Information Integrity Validation (2025+ Standard)</span>
                  <span class="text-[9px] font-bold text-rose-600 bg-rose-100 px-2 py-0.5 rounded-full border border-rose-200">3.8%/FR MUST-PASS • 10%</span>
                </div>
                <mat-icon class="text-rose-400 transition-transform" 
                          [ngClass]="expandedAccordions().includes('modal-fr013') ? 'rotate-180' : ''">
                  expand_more
                </mat-icon>
              </button>
              @if (expandedAccordions().includes('modal-fr013')) {
                <div class="p-4 bg-white border-t border-rose-100">
                  <p class="text-xs text-slate-600 mb-2">The system shall validate Information Integrity requirements (mandatory as of July 1, 2025):</p>
                  <ul class="space-y-1 text-[10px] text-slate-600 ml-4">
                    <li class="flex items-start gap-1"><span class="text-rose-400 mt-0.5">•</span> Credentialing system records include: practitioner application, attestation, source documents, verification dates, report dates, decision dates, and verifier signatures/initials</li>
                    <li class="flex items-start gap-1"><span class="text-rose-400 mt-0.5">•</span> No evidence of inappropriate documentation "updates" (NCQA's specific term for modifications—e.g., overwritten data without audit trail, altered verification dates, backdated entries)</li>
                    <li class="flex items-start gap-1"><span class="text-rose-400 mt-0.5">•</span> Complete audit trail present showing who verified each element, when, and from what source</li>
                  </ul>
                  <div class="mt-2 p-2 bg-rose-100 border border-rose-200 rounded-lg">
                    <p class="text-[9px] font-bold text-rose-800">Compliance Rule (Must-Pass Element): Flag as non-compliant if required data elements are missing from system records, evidence of inappropriate "updates" exists, verifier identification or verification dates are missing, or source documentation is missing.</p>
                    <p class="text-[8px] text-rose-700 mt-1 italic">Note: Information Integrity is a Must-Pass Element requiring 4 of 5 factors to be Met—no Partially Met scoring option exists.</p>
                  </div>
                </div>
              }
            </div>
          </div>
        </div>
      </div>
    }

    <!-- Error State -->
    @if (processingError()) {
      <div class="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div class="w-20 h-20 rounded-full bg-rose-50 flex items-center justify-center mb-6">
          <mat-icon class="text-rose-600 text-4xl">error_outline</mat-icon>
        </div>
        <h2 class="text-2xl font-bold text-slate-900 mb-2">Audit Failed</h2>
        <p class="text-slate-500 mb-6">{{ processingError() }}</p>
        <a [routerLink]="['/upload']" class="btn-primary">
          <mat-icon class="text-sm mr-2">upload</mat-icon>
          Try Again
        </a>
      </div>
    }

    @if (result(); as auditResult) {
      <div class="space-y-10">
        <!-- Header -->
        <div class="flex justify-between items-end">
          <div class="flex items-center gap-6">
            <button [routerLink]="['/audits']" class="w-12 h-12 rounded-2xl bg-white border border-slate-100 text-slate-400 hover:text-blue-600 hover:border-blue-100 transition-all flex items-center justify-center shadow-sm">
              <mat-icon>arrow_back</mat-icon>
            </button>
            <div>
              <div class="flex items-center gap-4 mb-2">
                <h2 class="text-4xl font-extrabold text-slate-900 tracking-tight">{{ auditResult.name }}</h2>
                <span class="px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-[0.2em] shadow-sm"
                      [ngClass]="getTierBadgeClass(auditResult.tier)">
                  {{ auditResult.tier }}
                </span>
              </div>
              <p class="text-slate-500 font-medium flex items-center gap-3">
                <span class="flex items-center gap-1"><mat-icon class="text-xs">badge</mat-icon> NPI: {{ auditResult.npi }}</span>
                <span class="text-slate-300">•</span>
                <span class="flex items-center gap-1"><mat-icon class="text-xs">medical_services</mat-icon> {{ auditResult.specialty || 'N/A' }}</span>
                <span class="text-slate-300">•</span>
                <span class="flex items-center gap-1"><mat-icon class="text-xs">event</mat-icon> {{ auditResult.timestamp | date:'MMM d, y, h:mm a' }}</span>
              </p>
            </div>
          </div>
          <div class="flex gap-4">
            <button (click)="exportCsv()" class="btn-secondary flex items-center gap-2">
              <mat-icon class="text-sm">table_chart</mat-icon>
              Export CSV
            </button>
            <button (click)="exportJson()" class="btn-secondary flex items-center gap-2">
              <mat-icon class="text-sm">code</mat-icon>
              Export JSON
            </button>
            <button (click)="printReport()" class="btn-primary flex items-center gap-2">
              <mat-icon class="text-sm">print</mat-icon>
              Print Report
            </button>
          </div>
        </div>

        <!-- Summary Grid -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
          <!-- Score Card -->
          <div class="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8 flex flex-col items-center justify-center text-center relative overflow-hidden">
            <div class="absolute -top-10 -right-10 w-40 h-40 rounded-full blur-3xl opacity-50"
                 [ngClass]="getScoreBgClass(auditResult.overallScore)"></div>
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4">Compliance Score</p>
            <div class="relative w-36 h-36 flex items-center justify-center">
              <svg class="w-full h-full transform -rotate-90">
                <circle cx="72" cy="72" r="64" stroke="currentColor" stroke-width="10" fill="transparent" class="text-slate-100" />
                <circle cx="72" cy="72" r="64" stroke="currentColor" stroke-width="10" fill="transparent" 
                        [attr.stroke-dasharray]="402"
                        [attr.stroke-dashoffset]="402 - (402 * auditResult.overallScore / 100)"
                        [ngClass]="getScoreStrokeClass(auditResult.overallScore)"
                        class="transition-all duration-1000 ease-out" />
              </svg>
              <div class="absolute flex flex-col items-center">
                <span class="text-4xl font-black tracking-tighter" [ngClass]="getScoreTextClass(auditResult.overallScore)">{{ auditResult.overallScore }}%</span>
              </div>
            </div>
            <p class="text-xs font-medium text-slate-500 mt-4">{{ getTierDescription(auditResult.tier) }}</p>
          </div>

          <!-- Confidence Factors -->
          <div class="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8">
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-6">Confidence Factors</p>
            <div class="space-y-4">
              <div>
                <div class="flex justify-between text-xs mb-1">
                  <span class="text-slate-600">OCR Quality</span>
                  <span class="font-bold">{{ auditResult.ocrQuality || 0 }}%</span>
                </div>
                <div class="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div class="h-full bg-blue-500 rounded-full" [style.width.%]="auditResult.ocrQuality || 0"></div>
                </div>
              </div>
              <div>
                <div class="flex justify-between text-xs mb-1">
                  <span class="text-slate-600">Doc Completeness</span>
                  <span class="font-bold">{{ auditResult.documentCompleteness || 0 }}%</span>
                </div>
                <div class="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div class="h-full bg-indigo-500 rounded-full" [style.width.%]="auditResult.documentCompleteness || 0"></div>
                </div>
              </div>
              <div>
                <div class="flex justify-between text-xs mb-1">
                  <span class="text-slate-600">Data Consistency</span>
                  <span class="font-bold">{{ auditResult.dataConsistency || 0 }}%</span>
                </div>
                <div class="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div class="h-full bg-emerald-500 rounded-full" [style.width.%]="auditResult.dataConsistency || 0"></div>
                </div>
              </div>
              <div>
                <div class="flex justify-between text-xs mb-1">
                  <span class="text-slate-600">Rule Ambiguity</span>
                  <span class="font-bold">{{ (auditResult.ruleAmbiguity || 0) }}%</span>
                </div>
                <div class="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div class="h-full bg-amber-500 rounded-full" [style.width.%]="(auditResult.ruleAmbiguity || 0)"></div>
                </div>
              </div>
            </div>
            <div class="mt-6 pt-4 border-t border-slate-100">
              <div class="flex justify-between items-center">
                <span class="text-xs text-slate-500">Overall Confidence</span>
                <span class="text-lg font-black text-slate-900">{{ auditResult.confidenceScore }}%</span>
              </div>
            </div>
          </div>

          <!-- Category Breakdown -->
          <div class="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8">
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-6">Category Scores</p>
            <div class="space-y-3">
              @for (cat of getCategoryKeys(auditResult); track cat) {
                <div class="flex items-center gap-3">
                  <div class="w-20 text-[10px] font-bold text-slate-600 uppercase tracking-wider truncate">{{ cat }}</div>
                  <div class="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div class="h-full rounded-full transition-all duration-500" 
                         [ngClass]="getScoreBarClass(getCategoryScore(auditResult, cat))"
                         [style.width.%]="getCategoryScore(auditResult, cat)"></div>
                  </div>
                  <div class="w-10 text-right text-xs font-bold" [ngClass]="getScoreTextClass(getCategoryScore(auditResult, cat))">
                    {{ getCategoryScore(auditResult, cat) }}%
                  </div>
                </div>
              }
            </div>
          </div>

          <!-- AI Engine Info -->
          <div class="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2.5rem] p-8 text-white shadow-xl">
            <div class="flex items-center gap-3 mb-4">
              <div class="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <mat-icon>psychology</mat-icon>
              </div>
              <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-200">AI Analysis</p>
            </div>
            <h3 class="text-3xl font-black mb-2 tracking-tighter">{{ auditResult.confidenceScore }}%</h3>
            <p class="text-blue-100 text-xs leading-relaxed mb-4">Confidence in audit accuracy</p>
            <div class="space-y-2 text-xs">
              <div class="flex justify-between py-1 border-b border-white/10">
                <span class="text-blue-200">Rule Version</span>
                <span class="font-bold">{{ auditResult.ruleVersionApplied }}</span>
              </div>
              <div class="flex justify-between py-1">
                
              </div>
            </div>
          </div>
        </div>

        <!-- Recommendations -->
        @if (auditResult.recommendations?.length) {
          <div class="bg-amber-50 border border-amber-200 rounded-[2rem] p-8">
            <div class="flex items-center gap-3 mb-4">
              <div class="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600">
                <mat-icon>lightbulb</mat-icon>
              </div>
              <h3 class="text-lg font-bold text-amber-900">Remediation Recommendations</h3>
            </div>
            <ul class="space-y-3">
              @for (rec of auditResult.recommendations; track rec) {
                <li class="flex items-start gap-3 text-sm text-amber-800">
                  <mat-icon class="text-amber-500 text-sm mt-0.5">arrow_right</mat-icon>
                  <span>{{ rec }}</span>
                </li>
              }
            </ul>
          </div>
        }

        <!-- Documents Found -->
        @if (auditResult.documents?.length) {
          <div class="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8">
            <h3 class="text-lg font-bold text-slate-900 mb-6">Documents Analyzed</h3>
            <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              @for (doc of getFilteredDocuments(auditResult.documents); track doc.documentType) {
                <div class="p-4 rounded-xl border text-center"
                     [ngClass]="doc.found ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'">
                  <mat-icon class="text-2xl mb-2" [ngClass]="doc.found ? 'text-emerald-600' : 'text-slate-400'">
                    {{ doc.found ? 'check_circle' : 'cancel' }}
                  </mat-icon>
                  <p class="text-[10px] font-bold uppercase tracking-wider" [ngClass]="doc.found ? 'text-emerald-700' : 'text-slate-500'">
                    {{ doc.documentType }}
                  </p>
                  @if (doc.found && doc.extractionConfidence) {
                    <p class="text-[10px] text-emerald-600 mt-1">{{ doc.extractionConfidence }}% conf</p>
                  }
                </div>
              }
            </div>
          </div>
        }

        <!-- Confidence Score Calculation -->
        <div class="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8">
          <div class="flex items-center gap-3 mb-6">
            <div class="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
              <mat-icon>analytics</mat-icon>
            </div>
            <div>
              <h3 class="text-lg font-bold text-slate-900">Confidence Score Calculation</h3>
              <p class="text-[10px] text-slate-500">System certainty assessment for compliant and non-compliant determinations</p>
            </div>
          </div>

          <p class="text-sm text-slate-600 mb-4">For both compliant and non-compliant determinations, the system shall provide a confidence score (0-100%) indicating the system's certainty in its assessment:</p>
          
          <div class="space-y-3">
            <div class="flex items-start gap-3 p-4 bg-emerald-50 rounded-xl border border-emerald-200">
              <div class="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                <span class="text-[10px] font-black text-emerald-700">H</span>
              </div>
              <div>
                <p class="text-sm font-bold text-emerald-700">High Confidence (90-100%)</p>
                <p class="text-xs text-slate-600 mt-1">Data clearly extracted, rule logic unambiguous, no conflicting information</p>
              </div>
            </div>

            <div class="flex items-start gap-3 p-4 bg-amber-50 rounded-xl border border-amber-200">
              <div class="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <span class="text-[10px] font-black text-amber-700">M</span>
              </div>
              <div>
                <p class="text-sm font-bold text-amber-700">Medium Confidence (70-89%)</p>
                <p class="text-xs text-slate-600 mt-1">Some data ambiguity, partial OCR quality issues, or minor inconsistencies</p>
              </div>
            </div>

            <div class="flex items-start gap-3 p-4 bg-rose-50 rounded-xl border border-rose-200">
              <div class="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0">
                <span class="text-[10px] font-black text-rose-700">L</span>
              </div>
              <div>
                <p class="text-sm font-bold text-rose-700">Low Confidence (0-69%)</p>
                <p class="text-xs text-slate-600 mt-1">Significant OCR challenges, conflicting dates, missing key documents, or unclear documentation</p>
              </div>
            </div>
          </div>
        </div>
<!-- NCQA Compliance Rule Engine -->
        <div class="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
          <div class="flex items-center gap-3 mb-4">
            <div class="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600">
              <mat-icon class="text-[18px]">menu_book</mat-icon>
            </div>
            <div>
              <h3 class="text-base font-bold text-slate-900"> NCQA Compliance Rule Engine</h3>
              <p class="text-[9px] text-slate-500">Comprehensive NCQA 2025 credentialing standards and validation rules</p>
            </div>
            <button (click)="openFRModal()" 
                    class="ml-auto px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-all flex items-center gap-1">
              <mat-icon class="text-[12px]">open_in_new</mat-icon>
              View All FR Rules
            </button>
          </div>

          <div class="space-y-3">
            <!-- FR-008 Accordion -->
            <div class="mb-4 text-right">
              <span class="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">15% weight</span>
            </div>
            <div class="border border-slate-200 rounded-xl overflow-hidden">
              <button (click)="toggleAccordion('fr008')" 
                      class="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <span class="px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 text-[9px] font-bold tracking-wider">FR-008</span>
                  <span class="text-xs font-bold text-slate-800">Practitioner Application and Attestation Validation</span>
                  <span class="text-[9px] font-bold text-slate-400 bg-white px-2 py-0.5 rounded-full border border-slate-200">15% weight</span>
                </div>
                <mat-icon class="text-slate-400 transition-transform" 
                          [ngClass]="expandedAccordions().includes('fr008') ? 'rotate-180' : ''">
                  expand_more
                </mat-icon>
              </button>
              @if (expandedAccordions().includes('fr008')) {
                <div class="p-4 bg-white border-t border-slate-100">
                  <p class="text-xs text-slate-600 mb-2">The system shall verify that each file contains:</p>
                  <ul class="space-y-1 text-[10px] text-slate-600 ml-4">
                    <li class="flex items-start gap-1"><span class="text-blue-400 mt-0.5">•</span> Completed application with required identifiers (name, DOB or unique ID, NPI, specialty, practice locations)</li>
                    <li class="flex items-start gap-1"><span class="text-blue-400 mt-0.5">•</span> Current CV or work history covering at least 5 years with explanations for gaps > 6 months</li>
                    <li class="flex items-start gap-1"><span class="text-blue-400 mt-0.5">•</span> Signed and dated attestation within the required timeframe (120-180 days of credentialing decision, depending on program version)</li>
                    <li class="flex items-start gap-1"><span class="text-blue-400 mt-0.5">•</span> Required attestation elements must come from Disclosure Questions in the Attestation/Application attestation section, not work history: Sanctions or licensure issues disclosure, Malpractice claims history disclosure, Physical/mental health status as it relates to ability to practice, Lack of current substance abuse, History of loss or limitation of privileges</li>
                    <li class="flex items-start gap-1"><span class="text-blue-400 mt-0.5">•</span> (2025+) Optional race, ethnicity, and language questions with non-discrimination language</li>
                  </ul>
                  <div class="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                    <p class="text-[9px] font-bold text-amber-800">Compliance Rule: Flag as non-compliant if any required disclosure question is missing, unanswered, undated, outside the acceptable timeframe, or if evidence is taken from work history/CV instead of the Attestation/Application Disclosure Questions section.</p>
                  </div>
                </div>
              }
            </div>

            <!-- FR-009 Accordion -->
            <div class="border border-slate-200 rounded-xl overflow-hidden">
              <button (click)="toggleAccordion('fr009')" 
                      class="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <span class="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 text-[9px] font-bold tracking-wider">FR-009</span>
                  <span class="text-xs font-bold text-slate-800">Primary Source Verification (PSV) Validation</span>
                  <span class="text-[9px] font-bold text-slate-400 bg-white px-2 py-0.5 rounded-full border border-slate-200">45% weight</span>
                </div>
                <mat-icon class="text-slate-400 transition-transform" 
                          [ngClass]="expandedAccordions().includes('fr009') ? 'rotate-180' : ''">
                  expand_more
                </mat-icon>
              </button>
              @if (expandedAccordions().includes('fr009')) {
                <div class="p-4 bg-white border-t border-slate-100">
                  <p class="text-xs text-slate-600 mb-2">The system shall verify that each required credential has been verified from an acceptable primary source and that the file documents the source, method, and date.</p>
                  
                  <div class="mb-3">
                    <p class="text-[9px] font-bold text-slate-700 mb-1">Table 2: Primary source verification requirements (2025 standards)</p>
                    <div class="overflow-x-auto">
                      <table class="w-full text-[9px]">
                        <thead>
                          <tr class="border-b border-slate-200">
                            <th class="text-left py-1 px-2 font-semibold text-slate-700">Credential</th>
                            <th class="text-left py-1 px-2 font-semibold text-slate-700">Primary Source</th>
                            <th class="text-left py-1 px-2 font-semibold text-slate-700">Timing Requirement</th>
                          </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100">
                          <tr><td class="py-1 px-2">State License</td><td class="py-1 px-2">State licensing board PSV document</td><td class="py-1 px-2">120 days (accred) / 90 days (cert) from verification date to decision date</td></tr>
                          <tr><td class="py-1 px-2">DEA/CDS</td><td class="py-1 px-2">DEA database or state site PSV document</td><td class="py-1 px-2">120 days (accred) / 90 days (cert) from verification date to decision date</td></tr>
                          <tr><td class="py-1 px-2">Education</td><td class="py-1 px-2">School, program, or designated verifier</td><td class="py-1 px-2">Once (initial credentialing)</td></tr>
                          <tr><td class="py-1 px-2">Board Certification</td><td class="py-1 px-2">ABMS, AOA, or recognized board</td><td class="py-1 px-2">As claimed or required</td></tr>
                          <tr><td class="py-1 px-2">Work History</td><td class="py-1 px-2">Direct verification or CV review</td><td class="py-1 px-2">5 years minimum</td></tr>
                          <tr><td class="py-1 px-2">Malpractice Insurance</td><td class="py-1 px-2">CAQH malpractice insurance section or insurance copy/certificate, not practitioner profile</td><td class="py-1 px-2">Current coverage</td></tr>
                          <tr><td class="py-1 px-2">Malpractice History</td><td class="py-1 px-2">Loss runs or NPDB document</td><td class="py-1 px-2">Documented review</td></tr>
                          <tr><td class="py-1 px-2">Sanctions/Exclusions</td><td class="py-1 px-2">OIG, SAM, Medicare Opt Out, Medicare Preclusion, Medicaid Sanctions</td><td class="py-1 px-2">120 days (accred) / 90 days (cert) from verification date to decision date</td></tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div class="p-2 bg-amber-50 border border-amber-200 rounded-lg">
                    <p class="text-[9px] font-bold text-amber-800">Compliance Rule: Flag as non-compliant if required PSV is missing, verification source is not primary or acceptable per policy, verification date is missing or falls outside the allowed window calculated from verification date to decision date, method of verification is not documented, malpractice insurance evidence points to practitioner profile instead of CAQH malpractice insurance section or insurance copy/certificate, or other source evidence points to practitioner profile instead of the applicable PSV/NPDB/sanctions document.</p>
                  </div>
                </div>
              }
            </div>

            <!-- FR-010 Accordion -->
            <div class="border border-slate-200 rounded-xl overflow-hidden">
              <button (click)="toggleAccordion('fr010')" 
                      class="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <span class="px-2 py-0.5 rounded-md bg-purple-100 text-purple-700 text-[9px] font-bold tracking-wider">FR-010</span>
                  <span class="text-xs font-bold text-slate-800">Credentialing Decision Validation</span>
                  <span class="text-[9px] font-bold text-slate-400 bg-white px-2 py-0.5 rounded-full border border-slate-200">15% weight</span>
                </div>
                <mat-icon class="text-slate-400 transition-transform" 
                          [ngClass]="expandedAccordions().includes('fr010') ? 'rotate-180' : ''">
                  expand_more
                </mat-icon>
              </button>
              @if (expandedAccordions().includes('fr010')) {
                <div class="p-4 bg-white border-t border-slate-100">
                  <p class="text-xs text-slate-600 mb-2">The system shall verify that the file contains evidence of a credentialing decision:</p>
                  <ul class="space-y-1 text-[10px] text-slate-600 ml-4">
                    <li class="flex items-start gap-1"><span class="text-purple-400 mt-0.5">•</span> Committee meeting minutes or medical director approval received/not received</li>
                    <li class="flex items-start gap-1"><span class="text-purple-400 mt-0.5">•</span> Practitioner name, decision (approve, deny, restrict), and decision date clearly documented in committee or medical director approval documentation</li>
                    <li class="flex items-start gap-1"><span class="text-purple-400 mt-0.5">•</span> Decision date occurs after all required verifications are complete</li>
                    <li class="flex items-start gap-1"><span class="text-purple-400 mt-0.5">•</span> Verification Dates of relative PSVs are within the NCQA timelines from the Decision date</li>
                    <li class="flex items-start gap-1"><span class="text-purple-400 mt-0.5">•</span> For adverse actions, documentation of rationale and communication process</li>
                  </ul>
                  <div class="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                    <p class="text-[9px] font-bold text-amber-800">Compliance Rule: Flag as non-compliant if committee or medical director approval documentation is missing, undated, or if relative PSV verification dates are outside NCQA timelines from the decision date.</p>
                  </div>
                </div>
              }
            </div>

            @if (!isInitialCredentialing(auditResult)) {
            <!-- FR-011 Accordion -->
            <div class="border border-slate-200 rounded-xl overflow-hidden">
              <button (click)="toggleAccordion('fr011')" 
                      class="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <span class="px-2 py-0.5 rounded-md bg-amber-100 text-amber-700 text-[9px] font-bold tracking-wider">FR-011</span>
                  <span class="text-xs font-bold text-slate-800">Recredentialing Cycle Validation</span>
                  <span class="text-[9px] font-bold text-slate-400 bg-white px-2 py-0.5 rounded-full border border-slate-200">10% weight</span>
                </div>
                <mat-icon class="text-slate-400 transition-transform" 
                          [ngClass]="expandedAccordions().includes('fr011') ? 'rotate-180' : ''">
                  expand_more
                </mat-icon>
              </button>
              @if (expandedAccordions().includes('fr011')) {
                <div class="p-4 bg-white border-t border-slate-100">
                  <p class="text-xs text-slate-600 mb-2">For recredentialing files, the system shall verify:</p>
                  <ul class="space-y-1 text-[10px] text-slate-600 ml-4">
                    <li class="flex items-start gap-1"><span class="text-amber-400 mt-0.5">•</span> Recredentialing performed within 36 months of previous credentialing decision</li>
                    <li class="flex items-start gap-1"><span class="text-amber-400 mt-0.5">•</span> All PSV elements refreshed (license, DEA/CDS, board certification status, malpractice, sanctions, work history)</li>
                    <li class="flex items-start gap-1"><span class="text-amber-400 mt-0.5">•</span> Refreshed verifications are within required timeframes</li>
                    <li class="flex items-start gap-1"><span class="text-amber-400 mt-0.5">•</span> Updated attestation signed and dated by practitioner</li>
                  </ul>
                  <div class="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                    <p class="text-[9px] font-bold text-amber-800">Compliance Rule: Flag as non-compliant if recredentialing cycle exceeds 36 months or required PSVs are not refreshed.</p>
                  </div>
                </div>
              }
            </div>
            }

            <!-- FR-012 Ongoing Monitoring Evidence excluded from audit processing and display. -->

            <!-- FR-013 Accordion -->
            <div class="border border-rose-200 rounded-xl overflow-hidden">
              <button (click)="toggleAccordion('fr013')" 
                      class="w-full px-4 py-3 bg-rose-50 hover:bg-rose-100 transition-colors flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <span class="px-2 py-0.5 rounded-md bg-rose-100 text-rose-700 text-[9px] font-bold tracking-wider">FR-013</span>
                  <span class="text-xs font-bold text-slate-800">Information Integrity Validation (2025+ Standard)</span>
                  <span class="text-[9px] font-bold text-rose-600 bg-rose-100 px-2 py-0.5 rounded-full border border-rose-200">MUST-PASS • 10% weight</span>
                </div>
                <mat-icon class="text-rose-400 transition-transform" 
                          [ngClass]="expandedAccordions().includes('fr013') ? 'rotate-180' : ''">
                  expand_more
                </mat-icon>
              </button>
              @if (expandedAccordions().includes('fr013')) {
                <div class="p-4 bg-white border-t border-rose-100">
                  <p class="text-xs text-slate-600 mb-2">The system shall validate Information Integrity requirements (mandatory as of July 1, 2025):</p>
                  <ul class="space-y-1 text-[10px] text-slate-600 ml-4">
                    <li class="flex items-start gap-1"><span class="text-rose-400 mt-0.5">•</span> Credentialing system records include: practitioner application, attestation, source documents, verification dates, report dates, decision dates, and verifier signatures/initials</li>
                    <li class="flex items-start gap-1"><span class="text-rose-400 mt-0.5">•</span> No evidence of inappropriate documentation "updates" (NCQA's specific term for modifications—e.g., overwritten data without audit trail, altered verification dates, backdated entries)</li>
                    <li class="flex items-start gap-1"><span class="text-rose-400 mt-0.5">•</span> Complete audit trail present showing who verified each element, when, and from what source</li>
                  </ul>
                  <div class="mt-2 p-2 bg-rose-100 border border-rose-200 rounded-lg">
                    <p class="text-[9px] font-bold text-rose-800">Compliance Rule (Must-Pass Element): Flag as non-compliant if required data elements are missing from system records, evidence of inappropriate "updates" exists, verifier identification or verification dates are missing, or source documentation is missing.</p>
                    <p class="text-[8px] text-rose-700 mt-1 italic">Note: Information Integrity is a Must-Pass Element requiring 4 of 5 factors to be Met—no Partially Met scoring option exists.</p>
                  </div>
                </div>
              }
            </div>
          </div>
        </div>
        
        <!-- Findings Table -->
        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div class="px-4 py-3 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <div>
              <h3 class="text-base font-bold text-slate-900">Detailed Compliance Findings</h3>
              <p class="text-[10px] text-slate-500">NCQA 2025 element-by-element verification results</p>
            </div>
            <div class="flex items-center gap-2 text-[11px] font-semibold">
              <button type="button" (click)="expandAllCats(auditResult)"
                      class="flex items-center gap-0.5 px-2 py-1 text-[10px] text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
                <mat-icon class="text-[13px]">unfold_more</mat-icon>Expand All
              </button>
              <button type="button" (click)="collapseAllCats(auditResult)"
                      class="flex items-center gap-0.5 px-2 py-1 text-[10px] text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
                <mat-icon class="text-[13px]">unfold_less</mat-icon>Collapse All
              </button>
              <span class="w-px h-4 bg-slate-200 mx-0.5"></span>
              <button type="button"
                      (click)="setFindingFilter('all')"
                      class="px-2.5 py-1 rounded-full transition-colors"
                      [ngClass]="filterStatus() === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'">
                All {{ getVisibleFindingsCount(auditResult) }}
              </button>
              <button type="button"
                      (click)="setFindingFilter('PASS')"
                      class="px-2.5 py-1 rounded-full transition-colors"
                      [ngClass]="filterStatus() === 'PASS' ? 'bg-emerald-600 text-white' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'">
                Pass {{ getPassCount(auditResult) }}
              </button>
              <button type="button"
                      (click)="setFindingFilter('FAIL')"
                      class="px-2.5 py-1 rounded-full transition-colors"
                      [ngClass]="filterStatus() === 'FAIL' ? 'bg-rose-600 text-white' : 'bg-rose-100 text-rose-700 hover:bg-rose-200'">
                Fail {{ getFailCount(auditResult) }}
              </button>
            </div>
          </div>

          <!-- Provider Identity Consistency (inline) -->
          @if (auditResult.providerIdentityConsistency) {
            <div class="mx-4 my-3 rounded-2xl border p-4"
                 [ngClass]="identityCardClass(auditResult.providerIdentityConsistency.result)">
              <!-- Header row -->
              <div class="flex items-center gap-2 mb-3">
                <mat-icon class="text-[18px]"
                          [ngClass]="identityIconClass(auditResult.providerIdentityConsistency.result)">
                  manage_accounts
                </mat-icon>
                <span class="text-xs font-bold text-slate-800">Provider Identity Consistency</span>
                <span class="text-[9px] text-slate-400">— cross-document identity check</span>
                <span class="ml-auto px-2.5 py-0.5 rounded-full text-[10px] font-bold border"
                      [ngClass]="identityBadgeClass(auditResult.providerIdentityConsistency.result)">
                  {{ identityBadgeText(auditResult.providerIdentityConsistency.result) }}
                </span>
              </div>

              <!-- Primary Identifiers -->
              <div class="flex flex-wrap gap-2 mb-3">
                @if (auditResult.providerIdentityConsistency.primaryIdentifiers.fullName) {
                  <div class="px-2.5 py-1.5 bg-white rounded-lg border border-slate-200 text-[10px]">
                    <span class="text-slate-400 font-bold uppercase tracking-wider">Name </span>
                    <span class="font-bold text-slate-800">{{ auditResult.providerIdentityConsistency.primaryIdentifiers.fullName }}</span>
                  </div>
                }
                @if (auditResult.providerIdentityConsistency.primaryIdentifiers.npi) {
                  <div class="px-2.5 py-1.5 bg-white rounded-lg border border-slate-200 text-[10px]">
                    <span class="text-slate-400 font-bold uppercase tracking-wider">NPI </span>
                    <span class="font-bold text-slate-800">{{ auditResult.providerIdentityConsistency.primaryIdentifiers.npi }}</span>
                  </div>
                }
                @if (auditResult.providerIdentityConsistency.primaryIdentifiers.dateOfBirth) {
                  <div class="px-2.5 py-1.5 bg-white rounded-lg border border-slate-200 text-[10px]">
                    <span class="text-slate-400 font-bold uppercase tracking-wider">DOB </span>
                    <span class="font-bold text-slate-800">{{ auditResult.providerIdentityConsistency.primaryIdentifiers.dateOfBirth }}</span>
                  </div>
                }
                @if (auditResult.providerIdentityConsistency.primaryIdentifiers.deaNumber) {
                  <div class="px-2.5 py-1.5 bg-white rounded-lg border border-slate-200 text-[10px]">
                    <span class="text-slate-400 font-bold uppercase tracking-wider">DEA </span>
                    <span class="font-bold text-slate-800">{{ auditResult.providerIdentityConsistency.primaryIdentifiers.deaNumber }}</span>
                  </div>
                }
                @if (auditResult.providerIdentityConsistency.primaryIdentifiers.specialty) {
                  <div class="px-2.5 py-1.5 bg-white rounded-lg border border-slate-200 text-[10px]">
                    <span class="text-slate-400 font-bold uppercase tracking-wider">Specialty </span>
                    <span class="font-bold text-slate-800">{{ auditResult.providerIdentityConsistency.primaryIdentifiers.specialty }}</span>
                  </div>
                }
                @for (lic of auditResult.providerIdentityConsistency.primaryIdentifiers.stateLicenseNumbers; track lic) {
                  <div class="px-2.5 py-1.5 bg-white rounded-lg border border-slate-200 text-[10px]">
                    <span class="text-slate-400 font-bold uppercase tracking-wider">License </span>
                    <span class="font-bold text-slate-800">{{ lic }}</span>
                  </div>
                }
              </div>

              <!-- Foreign provider / name-variant alert -->
              @if (auditResult.providerIdentityConsistency.foreignProviderNames?.length) {
                <div class="mb-3 p-3 rounded-xl"
                     [ngClass]="auditResult.providerIdentityConsistency.result === 'MANUAL_REVIEW'
                       ? 'bg-amber-100 border border-amber-300'
                       : 'bg-rose-100 border border-rose-300'">
                  <p class="text-[10px] font-bold mb-1.5"
                     [ngClass]="auditResult.providerIdentityConsistency.result === 'MANUAL_REVIEW' ? 'text-amber-800' : 'text-rose-800'">
                    <mat-icon class="text-[12px] align-middle mr-0.5">person_off</mat-icon>
                    {{ auditResult.providerIdentityConsistency.result === 'MANUAL_REVIEW'
                        ? 'Name variant(s) requiring manual review:'
                        : 'Foreign provider name(s) detected in this packet:' }}
                  </p>
                  <div class="flex flex-wrap gap-1.5">
                    @for (name of auditResult.providerIdentityConsistency.foreignProviderNames; track name) {
                      <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white"
                            [ngClass]="auditResult.providerIdentityConsistency.result === 'MANUAL_REVIEW'
                              ? 'border border-amber-300 text-amber-800'
                              : 'border border-rose-300 text-rose-800'">{{ name }}</span>
                    }
                  </div>
                </div>
              }

              <!-- AI summary comment -->
              @if (auditResult.providerIdentityConsistency.comments) {
                <p class="text-[10px] leading-relaxed"
                   [ngClass]="identityCommentClass(auditResult.providerIdentityConsistency.result)">
                  <span class="font-bold">AI Summary: </span>{{ auditResult.providerIdentityConsistency.comments }}
                </p>
              }
            </div>
          }

          <div class="w-full">
            <table class="w-full text-left table-fixed">
              <thead>
                <tr class="bg-slate-50 border-b border-slate-200">
                  <th class="px-3 py-2 text-[10px] font-semibold text-slate-600 uppercase tracking-wide" style="width: 16%">Element</th>
                  <th class="px-2 py-2 text-[10px] font-semibold text-slate-600 uppercase tracking-wide" style="width: 6%">Status</th>
                  <th class="px-2 py-2 text-[10px] font-semibold text-slate-600 uppercase tracking-wide" style="width: 6%">Conf.</th>
                  <th class="px-2 py-2 text-[10px] font-semibold text-slate-600 uppercase tracking-wide" style="width: 8%">Weight %</th>
                  <th class="px-2 py-2 text-[10px] font-semibold text-slate-600 uppercase tracking-wide" style="width: 23%">Finding</th>
                  <th class="px-2 py-2 text-[10px] font-semibold text-slate-600 uppercase tracking-wide" style="width: 14%">Recommendation</th>
                  <th class="px-2 py-2 text-[10px] font-semibold text-slate-600 uppercase tracking-wide" style="width: 9%">Approval</th>
                  <th class="px-2 py-2 text-[10px] font-semibold text-slate-600 uppercase tracking-wide" style="width: 18%">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                @for (category of getFindingCategories(auditResult); track category) {
                  <!-- Collapsible category group header -->
                  <tr class="bg-slate-100/70 border-y border-slate-200 cursor-pointer hover:bg-slate-200/60 transition-colors"
                      (click)="toggleCategory(category)">
                    <td colspan="8" class="px-3 py-2">
                      <div class="flex items-center gap-2">
                        <mat-icon class="text-slate-500 text-[18px] transition-transform duration-200"
                                  [ngClass]="isCategoryExpanded(category) ? 'rotate-0' : '-rotate-90'">
                          expand_more
                        </mat-icon>
                        <span class="text-[11px] font-bold text-slate-800 uppercase tracking-wide">{{ category }}</span>
                        <span class="text-[10px] text-slate-400 font-medium">
                          {{ getFindingsForCategory(auditResult, category).length }}
                          {{ getFindingsForCategory(auditResult, category).length === 1 ? 'element' : 'elements' }}
                        </span>
                        <span class="flex-1"></span>
                        @if (getCatPassCount(auditResult, category) > 0) {
                          <span class="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-700">
                            {{ getCatPassCount(auditResult, category) }} Pass
                          </span>
                        }
                        @if (getCatFailCount(auditResult, category) > 0) {
                          <span class="px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-100 text-rose-700">
                            {{ getCatFailCount(auditResult, category) }} Fail
                          </span>
                        }
                      </div>
                    </td>
                  </tr>

                  <!-- Category rows (expanded by default; only hidden when user collapses) -->
                  @if (isCategoryExpanded(category)) {
                    @for (finding of getFindingsForCategory(auditResult, category); track finding.id || finding.element) {
                  <tr class="hover:bg-blue-50/50 transition-colors">
                    <td class="px-3 py-2 align-top">
                      <div class="flex flex-col gap-2">
                        <button (click)="viewSourceDocument(auditResult.fileId, finding)" 
                                class="text-left group cursor-pointer w-full">
                          <div class="flex items-start gap-2">
                            <div class="flex flex-col">
                              <p class="text-[10px] font-bold text-slate-700 group-hover:text-blue-600 transition-colors line-clamp-2" [title]="finding.element">
                                {{ finding.element }}
                              </p>
                            </div>
                          </div>
                        </button>
                        <button (click)="viewSourceDocument(auditResult.fileId, finding)" 
                                class="text-left group cursor-pointer w-full">
                          @if (finding.sourceDocument) {
                            <p class="text-[9px] text-blue-600 mt-0.5 flex items-center gap-0.5 truncate">
                              <mat-icon class="text-[9px]">description</mat-icon>
                              {{ finding.sourceDocument }}
                              @if (finding.sourcePage) {
                                <span class="ml-1 px-1 py-0.5 bg-blue-100 text-blue-700 rounded text-[8px] font-bold">p.{{ finding.sourcePage }}</span>
                              }
                            </p>
                          }
                        </button>
                      </div>
                    </td>
                    <td class="px-2 py-2 align-top">
                      <div class="flex items-center gap-1">
                        <span class="w-1.5 h-1.5 rounded-full flex-shrink-0" 
                             [ngClass]="finding.status === 'PASS' ? 'bg-emerald-500' : 'bg-rose-500'"></span>
                        <span class="text-[10px] font-semibold" 
                              [ngClass]="finding.status === 'PASS' ? 'text-emerald-600' : 'text-rose-600'">
                          {{ finding.status }}
                        </span>
                      </div>
                    </td>
                    <td class="px-2 py-2 align-top">
                      <span class="text-[10px] font-bold" 
                            [ngClass]="finding.confidence >= 90 ? 'text-emerald-700' : finding.confidence >= 70 ? 'text-amber-700' : 'text-rose-700'">
                        {{ finding.confidence }}% {{ finding.confidence >= 90 ? 'H' : finding.confidence >= 70 ? 'M' : 'L' }}
                      </span>
                    </td>
                    <td class="px-2 py-2 align-top">
                      <span class="text-[10px] font-bold text-slate-700">
                        {{ getElementWeightedContribution(auditResult, finding) }}%/<span class="text-indigo-600">{{ getCategoryWeight(auditResult, finding) }}%</span>
                      </span>
                    </td>
                    <td class="px-2 py-2 align-top">
                      <p class="text-[10px] text-slate-600 leading-tight line-clamp-2 cursor-help" [title]="finding.finding">
                        {{ finding.finding }}
                      </p>
                    </td>
                    <td class="px-2 py-2 align-top">
                      <p class="text-[10px] text-slate-500 leading-tight line-clamp-2 cursor-help" [title]="finding.recommendation || 'N/A'">
                        {{ finding.recommendation || 'N/A' }}
                      </p>
                    </td>
                    <td class="px-2 py-2 align-top">
                      @if (finding.approvalStatus === 'APPROVED') {
                        <span class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[9px] font-medium">
                          <mat-icon class="text-[10px]">check_circle</mat-icon>
                          Approved
                        </span>
                      } @else if (finding.approvalStatus === 'REJECTED') {
                        <span class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[9px] font-medium">
                          <mat-icon class="text-[10px]">cancel</mat-icon>
                          Rejected
                        </span>
                      } @else {
                        <span class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[9px] font-medium">
                          <mat-icon class="text-[10px]">pending</mat-icon>
                          Pending
                        </span>
                      }
                    </td>
                    <td class="px-2 py-2 align-top">
                      <div class="flex items-center gap-1 flex-nowrap">
                        <button (click)="approveFinding(auditResult.fileId, finding)"
                                [disabled]="finding.approvalStatus === 'APPROVED'"
                                class="inline-flex items-center justify-center gap-0.5 px-2 py-1 rounded text-[10px] font-medium transition-all border whitespace-nowrap flex-shrink-0"
                                [ngClass]="finding.approvalStatus === 'APPROVED' 
                                  ? 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed' 
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'">
                          <mat-icon class="text-[11px]">check</mat-icon>
                          Approve
                        </button>
                        <button (click)="openRejectModal(auditResult.fileId, finding)"
                                [disabled]="finding.approvalStatus === 'REJECTED'"
                                class="inline-flex items-center justify-center gap-0.5 px-2 py-1 rounded text-[10px] font-medium transition-all border whitespace-nowrap flex-shrink-0"
                                [ngClass]="finding.approvalStatus === 'REJECTED' 
                                  ? 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed' 
                                  : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'">
                          <mat-icon class="text-[11px]">close</mat-icon>
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                    }
                  }
                } @empty {
                  <tr>
                    <td colspan="8" class="px-4 py-8 text-center text-slate-400 text-sm">
                      No compliance findings were returned for this audit.
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>

        

        <!-- Audit Trail -->
        @if (auditResult.auditTrail?.length) {
          <div class="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8">
            <h3 class="text-lg font-bold text-slate-900 mb-6">Audit Trail</h3>
            <div class="space-y-4">
              @for (entry of auditResult.auditTrail; track entry.timestamp) {
                <div class="flex items-start gap-4 p-4 bg-slate-50/50 rounded-xl">
                  <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                    <mat-icon class="text-sm">history</mat-icon>
                  </div>
                  <div class="flex-1">
                    <div class="flex justify-between items-start">
                      <p class="text-sm font-bold text-slate-900">{{ entry.action }}</p>
                      <p class="text-[10px] text-slate-400">{{ entry.timestamp | date:'MMM d, y h:mm a' }}</p>
                    </div>
                    <p class="text-xs text-slate-500 mt-1">{{ entry.details }}</p>
                    <p class="text-[10px] text-slate-400 mt-1">By: {{ entry.performedBy }}</p>
                  </div>
                </div>
              }
            </div>
          </div>
        }
      </div>
    } @else {
      <div class="flex-1 flex flex-col items-center justify-center py-16 text-slate-400 bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div class="w-24 h-24 bg-blue-50 rounded-[2.5rem] flex items-center justify-center mb-8 shadow-sm">
          <div class="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
        <h3 class="text-2xl font-black text-slate-900 tracking-tight">Analyzing Credentialing Packet...</h3>
        <p class="text-sm mt-2 text-slate-500">AI is extracting data and evaluating NCQA 2025 compliance.</p>
        <p class="text-xs mt-4 text-slate-400">This typically takes 1-3 minutes depending on document complexity.</p>
      </div>
    }

    <!-- PDF Viewer Modal -->
    @if (showPdfViewer()) {
      <app-document-viewer
        [isModal]="true"
        [pdfUrl]="pdfViewerUrl()"
        [docName]="pdfViewerDocName()"
        [elemName]="pdfViewerElemName()"
        [page]="pdfViewerPage()"
        [searchText]="pdfViewerSearchText()"
        [findingData]="pdfViewerFinding()"
        [allFindings]="pdfViewerAllFindings()"
        [viewerFileId]="pdfViewerFileId()"
        (closed)="closePdfViewer()"
        (approved)="onViewerApprove($event)"
        (rejected)="onViewerReject($event)"
      ></app-document-viewer>
    }

    <!-- Rejection Modal -->
    @if (showRejectModal()) {
      <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-[200]" (click)="closeRejectModal()">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden" (click)="$event.stopPropagation()">
          <div class="bg-rose-50 px-6 py-4 border-b border-rose-100">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center text-rose-600">
                <mat-icon>cancel</mat-icon>
              </div>
              <div>
                <h3 class="text-lg font-bold text-rose-900">Reject Finding</h3>
                <p class="text-xs text-rose-600">{{ rejectingFinding()?.element }}</p>
              </div>
            </div>
          </div>
          
          <div class="p-6">
            <label class="block text-sm font-bold text-slate-700 mb-2">
              Rejection Comments <span class="text-rose-500">*</span>
            </label>
            <textarea 
              [(ngModel)]="rejectionComments"
              rows="4"
              class="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent resize-none"
              placeholder="Please provide a reason for rejecting this finding..."
            ></textarea>
            @if (rejectionError()) {
              <p class="text-xs text-rose-500 mt-2 flex items-center gap-1">
                <mat-icon class="text-sm">error</mat-icon>
                {{ rejectionError() }}
              </p>
            }
          </div>
          
          <div class="px-6 py-4 bg-slate-50 flex justify-end gap-3">
            <button (click)="closeRejectModal()" 
                    class="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-200 transition-all">
              Cancel
            </button>
            <button (click)="submitRejection()" 
                    class="px-4 py-2 rounded-xl text-sm font-bold bg-rose-600 text-white hover:bg-rose-700 transition-all flex items-center gap-2">
              <mat-icon class="text-sm">close</mat-icon>
              Reject Finding
            </button>
          </div>
        </div>
      </div>
    }

    <!-- Element Modal -->
    @if (showElementModal()) {
      <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-[200]" (click)="closeElementModal()">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-4xl mx-4 overflow-hidden max-h-[90vh] overflow-y-auto" (click)="$event.stopPropagation()">
          <div class="bg-indigo-50 px-6 py-4 border-b border-indigo-100">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
                  <mat-icon>menu_book</mat-icon>
                </div>
                <div>
                  <h3 class="text-lg font-bold text-slate-900">NCQA Compliance Rule Engine</h3>
                  <p class="text-[10px] text-slate-500">{{ selectedElement() }}</p>
                </div>
              </div>
              <button (click)="closeElementModal()" 
                      class="w-8 h-8 rounded-lg bg-white/80 hover:bg-white transition-colors flex items-center justify-center">
                <mat-icon class="text-slate-600 text-[16px]">close</mat-icon>
              </button>
            </div>
          </div>
          
          <div class="p-6">
            @let rule = getNCQARuleForElement(selectedElement());
            <div class="space-y-6">
              <div>
                <h4 class="text-base font-bold text-slate-900 mb-2">{{ rule.title }}</h4>
                <p class="text-sm text-slate-600 mb-4">{{ rule.description }}</p>
                @if (rule.weight !== 'Varies') {
                  <div class="inline-flex items-center gap-2 px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium">
                    <mat-icon class="text-[14px]">weight</mat-icon>
                    {{ rule.weight }} weight
                  </div>
                }
              </div>

              <div>
                <h5 class="text-sm font-bold text-slate-800 mb-3">Requirements:</h5>
                <div class="space-y-2">
                  @for (req of rule.requirements; track req) {
                    <div class="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                      <span class="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-2 flex-shrink-0"></span>
                      <p class="text-xs text-slate-600 leading-relaxed">{{ req }}</p>
                    </div>
                  }
                </div>
              </div>

              <div>
                <h5 class="text-sm font-bold text-slate-800 mb-3">Compliance Rule:</h5>
                <div class="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <p class="text-xs text-amber-800 leading-relaxed">{{ rule.complianceRule }}</p>
                </div>
              </div>

              <div>
                <h5 class="text-sm font-bold text-slate-800 mb-3">FR-015: Binary Compliance Determination</h5>
                <p class="text-xs text-slate-600 mb-3">For each NCQA requirement element, the system shall assign a binary compliance status:</p>
                <div class="grid grid-cols-2 gap-3">
                  <div class="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <div class="flex items-start gap-2">
                      <span class="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                        <mat-icon class="text-emerald-600 text-[11px]">check</mat-icon>
                      </span>
                      <div>
                        <p class="text-xs font-bold text-emerald-700">Compliant (PASS)</p>
                        <p class="text-[9px] text-emerald-600 mt-0.5">Element is present, complete, accurate, and within required timeframes</p>
                      </div>
                    </div>
                  </div>
                  <div class="p-3 bg-rose-50 border border-rose-200 rounded-lg">
                    <div class="flex items-start gap-2">
                      <span class="w-5 h-5 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0">
                        <mat-icon class="text-rose-600 text-[11px]">close</mat-icon>
                      </span>
                      <div>
                        <p class="text-xs font-bold text-rose-700">Non-Compliant (FAIL)</p>
                        <p class="text-[9px] text-rose-600 mt-0.5">Element is missing, incomplete, inaccurate, or outside timeframes</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    }

  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AuditDetail implements OnInit {
  private auditService = inject(AuditService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  result = signal<AuditResult | null>(null);
  isProcessing = signal(false);
  processingError = signal<string | null>(null);
  filterStatus = signal<'all' | 'PASS' | 'FAIL'>('all');
  categoryList = ['Application', 'PSV', 'Recredentialing', 'Integrity'];
  
  // PDF Viewer modal state
  showPdfViewer = signal(false);
  pdfViewerUrl = signal('');
  pdfViewerDocName = signal('');
  pdfViewerElemName = signal('');
  pdfViewerPage = signal(0);
  pdfViewerSearchText = signal('');
  pdfViewerFinding = signal<AuditFinding | null>(null);
  pdfViewerAllFindings = signal<AuditFinding[]>([]);
  pdfViewerFileId = signal('');

  // Rejection modal state
  showRejectModal = signal(false);
  rejectingFinding = signal<AuditFinding | null>(null);
  rejectingFileId = signal<string>('');
  rejectionComments = signal('');
  rejectionError = signal('');

  // Accordion functionality
  expandedAccordions = signal<string[]>([]);

  // Category grouping — track COLLAPSED categories only; empty = all expanded (never hides rows)
  collapsedCategories = signal<string[]>([]);

  // FR Modal functionality
  showFRModal = signal(false);

  // Element modal state
  showElementModal = signal(false);
  selectedElement = signal<string>('');

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadAuditResult(id);
    }
  }

  loadAuditResult(id: string) {
    this.auditService.getAuditResult(id).subscribe({
      next: (data: any) => {
        // Check if response indicates processing status
        if (data.status === 'processing') {
          this.isProcessing.set(true);
          this.processingError.set(null);
          // Retry after 3 seconds
          setTimeout(() => this.loadAuditResult(id), 3000);
        } else if (data.status === 'failed') {
          this.isProcessing.set(false);
          this.processingError.set(data.message || 'Audit processing failed');
        } else {
          // Full audit result received
          this.isProcessing.set(false);
          this.processingError.set(null);
          this.result.set(data);
        }
      },
      error: (err) => {
        if (err.status === 202) {
          // Still processing
          this.isProcessing.set(true);
          setTimeout(() => this.loadAuditResult(id), 3000);
        } else if (err.status === 500) {
          this.isProcessing.set(false);
          this.processingError.set('Audit processing failed');
        } else {
          // Retry on other errors (might still be processing)
          this.isProcessing.set(true);
          setTimeout(() => this.loadAuditResult(id), 3000);
        }
      }
    });
  }

  // ---- Identity card helpers (4-state: PASS / FAIL / MANUAL_REVIEW / UNABLE_TO_VERIFY) ----
  identityCardClass(result: string): string {
    switch (result) {
      case 'PASS':           return 'bg-emerald-50 border-emerald-100';
      case 'FAIL':           return 'bg-rose-50 border-rose-200';
      case 'MANUAL_REVIEW':  return 'bg-amber-50 border-amber-200';
      case 'UNABLE_TO_VERIFY': return 'bg-slate-50 border-slate-200';
      default:               return 'bg-slate-50 border-slate-200';
    }
  }

  identityIconClass(result: string): string {
    switch (result) {
      case 'PASS':           return 'text-emerald-600';
      case 'FAIL':           return 'text-rose-600';
      case 'MANUAL_REVIEW':  return 'text-amber-600';
      case 'UNABLE_TO_VERIFY': return 'text-slate-500';
      default:               return 'text-slate-500';
    }
  }

  identityBadgeClass(result: string): string {
    switch (result) {
      case 'PASS':           return 'bg-emerald-100 text-emerald-700 border-emerald-300';
      case 'FAIL':           return 'bg-rose-100 text-rose-700 border-rose-300';
      case 'MANUAL_REVIEW':  return 'bg-amber-100 text-amber-700 border-amber-300';
      case 'UNABLE_TO_VERIFY': return 'bg-slate-100 text-slate-600 border-slate-300';
      default:               return 'bg-slate-100 text-slate-600 border-slate-300';
    }
  }

  identityBadgeText(result: string): string {
    switch (result) {
      case 'PASS':           return '✓ Identity Consistent';
      case 'FAIL':           return '⚠ Identity Mismatch Detected';
      case 'MANUAL_REVIEW':  return '🔍 Manual Review Required';
      case 'UNABLE_TO_VERIFY': return '❓ Unable to Verify Identity';
      default:               return '❓ Unable to Verify Identity';
    }
  }

  identityCommentClass(result: string): string {
    switch (result) {
      case 'PASS':           return 'text-emerald-800';
      case 'FAIL':           return 'text-rose-800';
      case 'MANUAL_REVIEW':  return 'text-amber-800';
      case 'UNABLE_TO_VERIFY': return 'text-slate-600';
      default:               return 'text-slate-600';
    }
  }

  printReport() {
    window.print();
  }

  exportJson() {
    const data = this.result();
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    this.downloadBlob(blob, `ncqa-audit-${data.npi}-${new Date().toISOString().split('T')[0]}.json`);
  }

  exportCsv() {
    const data = this.result();
    if (!data) return;
    
    const headers = ['Element', 'Category', 'Status', 'Confidence', 'Finding', 'Recommendation', 'Source Document'];
    const rows = data.findings.map(f => [
      f.element,
      f.category,
      f.status,
      f.confidence.toString(),
      `"${(f.finding || '').replace(/"/g, '""')}"`,
      `"${(f.recommendation || '').replace(/"/g, '""')}"`,
      f.sourceDocument || ''
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    this.downloadBlob(blob, `ncqa-audit-${data.npi}-${new Date().toISOString().split('T')[0]}.csv`);
  }

  viewSourceDocument(fileId: string, finding: AuditFinding) {
    const documentName = finding.sourceDocument || finding.element;
    const url = `/api/documents/${fileId}/${encodeURIComponent(documentName)}`;

    this.pdfViewerUrl.set(url);
    this.pdfViewerDocName.set(documentName);
    this.pdfViewerElemName.set(finding.element);
    this.pdfViewerPage.set(finding.sourcePage || 0);
    this.pdfViewerSearchText.set(finding.sourceText || '');
    this.pdfViewerFinding.set(finding);
    this.pdfViewerFileId.set(fileId);
    // Pass all findings from the current audit result
    const allFindings = this.result()?.findings || [];
    this.pdfViewerAllFindings.set(allFindings);
    this.showPdfViewer.set(true);
  }

  closePdfViewer() {
    this.showPdfViewer.set(false);
  }

  onViewerApprove(finding: AuditFinding) {
    this.approveFinding(this.pdfViewerFileId(), finding);
  }

  onViewerReject(finding: AuditFinding) {
    this.openRejectModal(this.pdfViewerFileId(), finding);
  }

  approveFinding(fileId: string, finding: AuditFinding) {
    this.auditService.updateFindingApproval(fileId, finding.id, 'APPROVED').subscribe({
      next: () => {
        // Update local state
        finding.approvalStatus = ApprovalStatus.APPROVED;
        finding.approvedAt = new Date().toISOString();
        finding.approvedBy = 'Current User';
        // Trigger change detection by updating the result signal
        this.result.set({ ...this.result()! });
        // Update PDF viewer panel if open
        if (this.showPdfViewer()) {
          this.pdfViewerAllFindings.set([...this.result()!.findings]);
          this.pdfViewerFinding.set(finding);
        }
      },
      error: (err) => {
        console.error('Failed to approve finding:', err);
      }
    });
  }

  openRejectModal(fileId: string, finding: AuditFinding) {
    this.rejectingFileId.set(fileId);
    this.rejectingFinding.set(finding);
    this.rejectionComments.set('');
    this.rejectionError.set('');
    this.showRejectModal.set(true);
  }

  closeRejectModal() {
    this.showRejectModal.set(false);
    this.rejectingFinding.set(null);
    this.rejectingFileId.set('');
    this.rejectionComments.set('');
    this.rejectionError.set('');
  }

  submitRejection() {
    // Validate mandatory comments
    if (!this.rejectionComments().trim()) {
      this.rejectionError.set('Rejection comments are required');
      return;
    }

    const finding = this.rejectingFinding();
    const fileId = this.rejectingFileId();
    
    if (!finding || !fileId) return;

    this.auditService.updateFindingApproval(fileId, finding.id, 'REJECTED', this.rejectionComments().trim()).subscribe({
      next: () => {
        // Update local state
        finding.approvalStatus = ApprovalStatus.REJECTED;
        finding.rejectionComments = this.rejectionComments().trim();
        finding.rejectedAt = new Date().toISOString();
        finding.rejectedBy = 'Current User';
        // Trigger change detection by updating the result signal
        this.result.set({ ...this.result()! });
        // Update PDF viewer panel if open
        if (this.showPdfViewer()) {
          this.pdfViewerAllFindings.set([...this.result()!.findings]);
          this.pdfViewerFinding.set(finding);
        }
        this.closeRejectModal();
      },
      error: (err) => {
        console.error('Failed to reject finding:', err);
        this.rejectionError.set('Failed to reject finding. Please try again.');
      }
    });
  }

  private downloadBlob(blob: Blob, filename: string) {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  getFilteredDocuments(documents: any[]): any[] {
    return (documents || []).filter(doc => {
      const text = `${doc?.documentType || ''} ${(doc?.keyDataExtracted || []).join(' ')}`.toLowerCase();
      return !text.includes('fr-012')
        && !text.includes('ongoing monitoring evidence')
        && !text.includes('ongoing monitoring between credentialing cycles')
        && !text.includes('policy ongoing monitoring evidence')
        && !text.includes('policy ongoing monitoring');
    });
  }

  getFilteredFindings(audit: AuditResult): AuditFinding[] {
    const findings = audit.findings.filter(f => !this.isExcludedAuditElement(f, audit));
    const status = this.filterStatus();
    if (status === 'all') return findings;
    return findings.filter(f => this.normalizeFindingStatus(f.status) === status);
  }

  // ── Category grouping (UI only) — derived from getFilteredFindings so totals & filter stay identical ──
  private categoryKey(f: AuditFinding): string {
    return ((f.category as string) || 'Other').trim() || 'Other';
  }

  getFindingCategories(audit: AuditResult): string[] {
    const cats: string[] = [];
    for (const f of this.getFilteredFindings(audit)) {
      const c = this.categoryKey(f);
      if (!cats.includes(c)) cats.push(c);
    }
    return cats;
  }

  getFindingsForCategory(audit: AuditResult, category: string): AuditFinding[] {
    return this.getFilteredFindings(audit).filter(f => this.categoryKey(f) === category);
  }

  toggleCategory(category: string) {
    const cur = this.collapsedCategories();
    this.collapsedCategories.set(
      cur.includes(category) ? cur.filter(c => c !== category) : [...cur, category]
    );
  }

  isCategoryExpanded(category: string): boolean {
    return !this.collapsedCategories().includes(category);
  }

  expandAllCats(audit: AuditResult) {
    this.collapsedCategories.set([]);
  }

  collapseAllCats(audit: AuditResult) {
    this.collapsedCategories.set(this.getFindingCategories(audit));
  }

  getCatPassCount(audit: AuditResult, category: string): number {
    return this.getFindingsForCategory(audit, category)
      .filter(f => this.normalizeFindingStatus(f.status) === FindingStatus.PASS).length;
  }

  getCatFailCount(audit: AuditResult, category: string): number {
    return this.getFindingsForCategory(audit, category)
      .filter(f => this.normalizeFindingStatus(f.status) === FindingStatus.FAIL).length;
  }
  // ──────────────────────────────────────────────────────────────────────────────

  setFindingFilter(status: 'all' | 'PASS' | 'FAIL') {
    this.filterStatus.set(status);
    // Auto-expand all categories so filtered results are always visible
    this.collapsedCategories.set([]);
  }

  getVisibleFindingsCount(audit: AuditResult): number {
    return audit.findings.filter(f => !this.isExcludedAuditElement(f, audit)).length;
  }

  getPassCount(audit: AuditResult): number {
    return audit.findings.filter(f => !this.isExcludedAuditElement(f, audit) && this.normalizeFindingStatus(f.status) === FindingStatus.PASS).length;
  }

  getFailCount(audit: AuditResult): number {
    return audit.findings.filter(f => !this.isExcludedAuditElement(f, audit) && this.normalizeFindingStatus(f.status) === FindingStatus.FAIL).length;
  }

  private isExcludedAuditElement(finding: AuditFinding, audit?: AuditResult): boolean {
    const text = `${finding.element || ''} ${finding.category || ''} ${finding.finding || ''} ${finding.recommendation || ''} ${finding.sourceDocument || ''} ${finding.sourceText || ''}`.toLowerCase();
    const isPaStateLicense = (text.includes('license') || text.includes('state licensure') || text.includes('state medical'))
      && (text.includes('pa state') || text.includes('pennsylvania') || /\bpa\b/.test(text));
    const isArchivedNonPracticingStateLicense = (text.includes('license') || text.includes('state licensure') || text.includes('state medical'))
      && (text.includes('archive') || text.includes('archived') || text.includes('not practicing') || text.includes('not practise'));
    const isProviderCaqhLicenseAttachment = (text.includes('license') || text.includes('state licensure') || text.includes('state medical'))
      && text.includes('caqh')
      && (text.includes('attachment') || text.includes('provider uploaded') || text.includes('provider-uploaded') || text.includes('shared by provider'));

    return (this.isInitialCredentialing(audit) && (finding.category === 'Recredentialing' || text.includes('fr-011') || text.includes('recredentialing cycle') || text.includes('recredentialing validation')))
      || finding.category === 'Monitoring'
      || text.includes('fr-012')
      || text.includes('ongoing monitoring evidence')
      || text.includes('ongoing monitoring validation')
      || text.includes('ongoing monitoring between credentialing cycles')
      || text.includes('policy ongoing monitoring evidence')
      || text.includes('policy ongoing monitoring')
      || text.includes('policy alignment')
      || text.includes('fr-014')
      || text.includes('annual information integrity audit')
      || text.includes('annual audit')
      || text.includes('qualitative analysis')
      || text.includes('root cause analysis')
      || text.includes('effectiveness review')
      || isPaStateLicense
      || isArchivedNonPracticingStateLicense
      || isProviderCaqhLicenseAttachment;
  }

  private normalizeFindingStatus(status: FindingStatus | string): string {
    return String(status || '').trim().toUpperCase();
  }

  getCategoryKeys(audit: AuditResult): string[] {
    const keys = Object.keys(audit.categoryScores || {}).filter(key => key !== 'Monitoring');
    if (this.isInitialCredentialing(audit)) {
      return keys.filter(key => key !== 'Recredentialing');
    }
    return keys;
  }

  isInitialCredentialing(audit?: AuditResult | null): boolean {
    return String((audit as any)?.credentialingType || '').toLowerCase() === 'initial';
  }

  openElementModal(element: string) {
    this.selectedElement.set(element);
    this.showElementModal.set(true);
  }

  closeElementModal() {
    this.showElementModal.set(false);
    this.selectedElement.set('');
  }

  toggleAccordion(accordionId: string) {
    const current = this.expandedAccordions();
    if (current.includes(accordionId)) {
      this.expandedAccordions.set(current.filter(id => id !== accordionId));
    } else {
      this.expandedAccordions.set([...current, accordionId]);
    }
  }

  openFRModal() {
    this.showFRModal.set(true);
  }

  closeFRModal() {
    this.showFRModal.set(false);
  }

  getNCQARuleForElement(element: string) {
    const rules: Record<string, any> = {
      'FR-008': {
        title: 'FR-008: Practitioner Application and Attestation Validation',
        description: 'The system shall verify that each file contains:',
        requirements: [
          'Completed application with required identifiers (name, DOB or unique ID, NPI, specialty, practice locations)',
          'Current CV or work history covering at least 5 years with explanations for gaps > 6 months',
          'Signed and dated attestation within the required timeframe (120-180 days of credentialing decision, depending on program version)',
          'Required attestation elements must come from Disclosure Questions in the Attestation/Application attestation section, not work history: Sanctions or licensure issues disclosure, Malpractice claims history disclosure, Physical/mental health status as it relates to ability to practice, Lack of current substance abuse, History of loss or limitation of privileges',
          '(2025+) Optional race, ethnicity, and language questions with non-discrimination language'
        ],
        complianceRule: 'Flag as non-compliant if any required disclosure question is missing, unanswered, undated, outside the acceptable timeframe, or if evidence is taken from work history/CV instead of the Attestation/Application Disclosure Questions section.',
        weight: '15%'
      },
      'FR-009': {
        title: 'FR-009: Primary Source Verification (PSV) Validation',
        description: 'The system shall verify that each required credential has been verified from an acceptable primary source and that the file documents the source, method, and date.',
        requirements: [
          'State License: State licensing board PSV document - 120 days (accred) / 90 days (cert) from verification date to decision date',
          'DEA/CDS: DEA database or state site PSV document - 120 days (accred) / 90 days (cert) from verification date to decision date',
          'Education: School, program, or designated verifier - Once (initial credentialing)',
          'Board Certification: ABMS, AOA, or recognized board - As claimed or required',
          'Work History: Direct verification or CV review - 5 years minimum',
          'Malpractice Insurance: CAQH malpractice insurance section or insurance copy/certificate, not practitioner profile - Current coverage',
          'Malpractice History: Loss runs or NPDB document - Documented review',
          'Sanctions/Exclusions: OIG, SAM, Medicare Opt Out, Medicare Preclusion, Medicaid Sanctions - 120 days (accred) / 90 days (cert) from verification date to decision date'
        ],
        complianceRule: 'Flag as non-compliant if: Required PSV is missing, Verification source is not primary or acceptable per policy, Verification date is missing or falls outside the allowed window calculated from verification date to decision date, Method of verification is not documented, malpractice insurance evidence points to practitioner profile instead of CAQH malpractice insurance section or insurance copy/certificate, or other source evidence points to practitioner profile instead of the applicable PSV/NPDB/sanctions document',
        weight: '45%'
      },
      'FR-010': {
        title: 'FR-010: Credentialing Decision Validation',
        description: 'The system shall verify that the file contains evidence of a credentialing decision:',
        requirements: [
          'Committee meeting minutes or medical director approval received/not received',
          'Practitioner name, decision (approve, deny, restrict), and decision date clearly documented in committee or medical director approval documentation',
          'Decision date occurs after all required verifications are complete',
          'Verification Dates of relative PSVs are within the NCQA timelines from the Decision date',
          'For adverse actions, documentation of rationale and communication process'
        ],
        complianceRule: 'Flag as non-compliant if committee or medical director approval documentation is missing, undated, or if relative PSV verification dates are outside NCQA timelines from the decision date.',
        weight: '15%'
      },
      'FR-011': {
        title: 'FR-011: Recredentialing Cycle Validation',
        description: 'For recredentialing files, the system shall verify:',
        requirements: [
          'Recredentialing performed within 36 months of previous credentialing decision',
          'All PSV elements refreshed (license, DEA/CDS, board certification status, malpractice, sanctions, work history)',
          'Refreshed verifications are within required timeframes',
          'Updated attestation signed and dated by practitioner'
        ],
        complianceRule: 'Flag as non-compliant if recredentialing cycle exceeds 36 months or required PSVs are not refreshed.',
        weight: '10%'
      },
      'FR-013': {
        title: 'FR-013: Information Integrity Validation (2025+ Standard)',
        description: 'The system shall validate Information Integrity requirements (mandatory as of July 1, 2025):',
        requirements: [
          'Credentialing system records include: practitioner application, attestation, source documents, verification dates, report dates, decision dates, and verifier signatures/initials',
          'No evidence of inappropriate documentation "updates" (NCQA\'s specific term for modifications—e.g., overwritten data without audit trail, altered verification dates, backdated entries)',
          'Complete audit trail present showing who verified each element, when, and from what source',
        ],
        complianceRule: 'Must-Pass Element: Flag as non-compliant if required data elements are missing from system records, evidence of inappropriate "updates" exists, verifier identification or verification dates are missing, or source documentation is missing.',
        weight: '10%'
      }
    };

    // Find the rule that matches the element
    for (const [key, rule] of Object.entries(rules)) {
      if (element.includes(key) || element.toLowerCase().includes(key.toLowerCase().substring(3))) {
        return rule;
      }
    }

    // Default rule if no specific match
    return {
      title: element,
      description: 'NCQA Compliance Rule',
      requirements: ['Element verification requirements'],
      complianceRule: 'Compliance rule applied',
      weight: 'Varies'
    };
  }

  getWeightedContribution(audit: AuditResult, category: string): number {
    const catScore = audit.categoryScores?.[category];
    if (!catScore) return 0;
    const score = typeof catScore === 'number' ? catScore : (catScore as CategoryScore).score || 0;
    const weight = typeof catScore === 'number' ? 0 : (catScore as CategoryScore).weight || 0;
    const normalizedScore = score > 0 && score <= 1 ? score : score / 100;
    return Math.round(normalizedScore * weight);
  }

  getElementWeightedContribution(audit: AuditResult, finding: AuditFinding): number {
    const catScore = audit.categoryScores?.[finding.category];
    if (!catScore) return 0;
    const weight = typeof catScore === 'number' ? 0 : (catScore as CategoryScore).weight || 0;
    const totalElements = typeof catScore === 'number' ? 1 : (catScore as CategoryScore).totalElements || 1;
    const elementWeight = weight / totalElements;
    return Math.round(elementWeight * 10) / 10; // Round to 1 decimal place
  }

  getCategoryWeight(audit: AuditResult, finding: AuditFinding): number {
    const catScore = audit.categoryScores?.[finding.category];
    if (!catScore) return 0;
    const weight = typeof catScore === 'number' ? catScore : (catScore as CategoryScore).weight || 0;
    return Math.round(weight * 10) / 10;
  }

  getCategoryScore(audit: AuditResult, category: string): number {
    const catScore = audit.categoryScores?.[category];
    if (!catScore) return 0;
    const raw = typeof catScore === 'number' ? catScore : (catScore as CategoryScore).score || 0;
    return raw > 0 && raw <= 1 ? Math.round(raw * 100) : Math.round(raw);
  }

  getTierBadgeClass(tier: ComplianceTier): string {
    switch (tier) {
      case ComplianceTier.FULLY_COMPLIANT: return 'bg-emerald-500 text-white';
      case ComplianceTier.SUBSTANTIALLY_COMPLIANT: return 'bg-blue-500 text-white';
      case ComplianceTier.PARTIALLY_COMPLIANT: return 'bg-amber-500 text-white';
      case ComplianceTier.NON_COMPLIANT: return 'bg-rose-500 text-white';
      default: return 'bg-slate-500 text-white';
    }
  }

  getTierDescription(tier: ComplianceTier): string {
    switch (tier) {
      case ComplianceTier.FULLY_COMPLIANT: return 'Review Required/Ready for NCQA audit';
      case ComplianceTier.SUBSTANTIALLY_COMPLIANT: return 'Minor remediation needed';
      case ComplianceTier.PARTIALLY_COMPLIANT: return 'Significant gaps found';
      case ComplianceTier.NON_COMPLIANT: return 'Major deficiencies - rebuild required';
      default: return 'Pending analysis';
    }
  }

  getScoreBgClass(score: number): string {
    if (score >= 95) return 'bg-emerald-100';
    if (score >= 85) return 'bg-blue-100';
    if (score >= 70) return 'bg-amber-100';
    return 'bg-rose-100';
  }

  getScoreStrokeClass(score: number): string {
    if (score >= 95) return 'text-emerald-500';
    if (score >= 85) return 'text-blue-500';
    if (score >= 70) return 'text-amber-500';
    return 'text-rose-500';
  }

  getScoreBarClass(score: number): string {
    if (score >= 95) return 'bg-emerald-500';
    if (score >= 85) return 'bg-blue-500';
    if (score >= 70) return 'bg-amber-500';
    return 'bg-rose-500';
  }

  getScoreTextClass(score: number): string {
    if (score >= 95) return 'text-emerald-600';
    if (score >= 85) return 'text-blue-600';
    if (score >= 70) return 'text-amber-600';
    return 'text-rose-600';
  }
}
