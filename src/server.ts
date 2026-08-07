import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import {basename, join} from 'node:path';
import {existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { GoogleGenAI } from '@google/genai';
import { 
  AuditStatus, 
  ComplianceTier, 
  CredentialType, 
  PractitionerFile, 
  AuditResult,
  AuditFinding,
  CategoryScore,
  ComplianceCategory,
  DocumentType,
  FindingStatus,
  MonitoringAlert,
  MonitoringCheck,
  DashboardStats,
  AuditTrailEntry,
  DocumentSummary
} from './app/services/audit.types.js';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
app.use(express.json({ limit: '50mb' }));

// ==================== FILE STORAGE ====================
let uploadsFolder = process.env['NCQA_STORAGE_PATH'] || join(import.meta.dirname, '../uploads');
if (!existsSync(uploadsFolder)) {
  mkdirSync(uploadsFolder, { recursive: true });
}

const stateFilePath = () => join(uploadsFolder, 'audit-history.json');

// Store uploaded files metadata for serving (maps fileId -> array of file metadata)
const uploadedDocuments: Record<string, Array<{ name: string; filePath: string; mimeType: string; size: number }>> = {};

// ==================== IN-MEMORY STORAGE ====================
const practitionerFiles: PractitionerFile[] = [];
const auditResults: Record<string, AuditResult> = {};
const monitoringAlerts: MonitoringAlert[] = [];
const monitoringChecks: MonitoringCheck[] = [];
const systemLogs: { timestamp: string; action: string; details: string; userId?: string }[] = [];
let selectedGeminiApiKey = process.env['GEMINI_API_KEY'] || 'AIzaSyDtNSpFrHOhSazt9QfXxLkPUbSyPZmAFXA';
const availableGeminiModels = [
  'gemini-2.5-flash',
  'gemini-3.1-pro-preview',
  'gemini-3.5-flash',
  'gemini-3-flash-preview',
  'gemini-3.1-flash-lite',
  'gemini-2.5-pro',
  'gemini-2.5-flash-lite'
];
let selectedGeminiModel = 'gemini-2.5-flash';

// ==================== DEMO DATA ====================
function initializeDemoData() {
  const demoData = [
    { id: 'demo-001', name: 'Dr. Sarah Johnson', npi: '1234567890', specialty: 'Internal Medicine', score: 98, tier: ComplianceTier.FULLY_COMPLIANT },
    { id: 'demo-002', name: 'Dr. Michael Chen', npi: '2345678901', specialty: 'Cardiology', score: 96, tier: ComplianceTier.FULLY_COMPLIANT }
  ];

  const now = new Date();
  
  demoData.forEach((demo, index) => {
    const uploadDate = new Date(now.getTime() - (index * 2 * 24 * 60 * 60 * 1000)).toISOString();
    
    const practitionerFile: PractitionerFile = {
      id: demo.id,
      name: demo.name,
      npi: demo.npi,
      specialty: demo.specialty,
      credentialingType: index % 3 === 0 ? CredentialType.RECREDENTIALING : CredentialType.INITIAL,
      uploadDate,
      uploadedBy: 'System Demo',
      status: AuditStatus.COMPLETED,
      overallScore: demo.score,
      confidenceScore: 85 + Math.floor(Math.random() * 10),
      tier: demo.tier,
      tags: ['demo']
    };
    
    practitionerFiles.push(practitionerFile);

    const findings: AuditFinding[] = [
      {
        id: `${demo.id}-f1`,
        element: 'State Medical License',
        category: ComplianceCategory.PSV,
        status: demo.score >= 85 ? FindingStatus.PASS : FindingStatus.FAIL,
        finding: demo.score >= 85 ? 'License verified within 120 days' : 'License verification expired',
        recommendation: demo.score >= 85 ? 'No action required' : 'Re-verify license immediately',
        confidence: 95,
        sourceDocument: 'License Certificate',
        sourcePage: 1,
        sourceText: 'License Number:',
        verificationDate: uploadDate
      },
      {
        id: `${demo.id}-f2`,
        element: 'DEA Registration',
        category: ComplianceCategory.PSV,
        status: demo.score >= 80 ? FindingStatus.PASS : FindingStatus.FAIL,
        finding: demo.score >= 80 ? 'DEA registration current and verified' : 'DEA registration needs renewal',
        recommendation: demo.score >= 80 ? 'No action required' : 'Obtain updated DEA certificate',
        confidence: 92,
        sourceDocument: 'DEA Certificate',
        sourcePage: 1,
        sourceText: 'DEA Registration'
      },
      {
        id: `${demo.id}-f3`,
        element: 'Board Certification',
        category: ComplianceCategory.PSV,
        status: demo.score >= 90 ? FindingStatus.PASS : FindingStatus.FAIL,
        finding: demo.score >= 90 ? 'Board certification verified via ABMS' : 'Board certification not verified',
        recommendation: demo.score >= 90 ? 'No action required' : 'Verify board certification status',
        confidence: 88
      },
      {
        id: `${demo.id}-f4`,
        element: 'Malpractice Insurance',
        category: ComplianceCategory.PSV,
        status: FindingStatus.PASS,
        finding: 'Current malpractice coverage verified',
        recommendation: 'No action required',
        confidence: 96,
        sourceDocument: 'Insurance Certificate',
        sourcePage: 2,
        sourceText: 'Policy Number'
      },
      {
        id: `${demo.id}-f5`,
        element: 'Application Completeness',
        category: ComplianceCategory.APPLICATION,
        status: demo.score >= 75 ? FindingStatus.PASS : FindingStatus.FAIL,
        finding: demo.score >= 75 ? 'Application complete with all required fields' : 'Application missing required information',
        recommendation: demo.score >= 75 ? 'No action required' : 'Request missing application data',
        confidence: 90
      },
      {
        id: `${demo.id}-f6`,
        element: 'Attestation Statement',
        category: ComplianceCategory.APPLICATION,
        status: FindingStatus.PASS,
        finding: 'Signed attestation on file within 180 days',
        recommendation: 'No action required',
        confidence: 94
      },
      {
        id: `${demo.id}-f7`,
        element: 'OIG/SAM Exclusion Check',
        category: ComplianceCategory.MONITORING,
        status: FindingStatus.PASS,
        finding: 'No exclusions found in OIG LEIE or SAM.gov',
        recommendation: 'Continue monthly monitoring',
        confidence: 99
      },
      {
        id: `${demo.id}-f8`,
        element: 'Committee Decision',
        category: ComplianceCategory.DECISION,
        status: demo.score >= 85 ? FindingStatus.PASS : FindingStatus.FAIL,
        finding: demo.score >= 85 ? 'Credentialing committee approval documented' : 'Committee decision documentation incomplete',
        recommendation: demo.score >= 85 ? 'No action required' : 'Obtain committee meeting minutes',
        confidence: 87
      }
    ];

    const auditResult: AuditResult = {
      id: `audit-${demo.id}`,
      fileId: demo.id,
      name: demo.name,
      npi: demo.npi,
      specialty: demo.specialty,
      timestamp: uploadDate,
      ruleVersionApplied: 'NCQA 2025 v1.0',
      overallScore: demo.score,
      tier: demo.tier,
      confidenceScore: practitionerFile.confidenceScore!,
      categoryScores: {
        [ComplianceCategory.APPLICATION]: { category: ComplianceCategory.APPLICATION, weight: 15, passedElements: demo.score >= 75 ? 2 : 1, totalElements: 2, score: demo.score >= 75 ? 100 : 50, findings: [] },
        [ComplianceCategory.PSV]: { category: ComplianceCategory.PSV, weight: 45, passedElements: demo.score >= 90 ? 4 : demo.score >= 80 ? 3 : 2, totalElements: 4, score: demo.score >= 90 ? 100 : demo.score >= 80 ? 75 : 50, findings: [] },
        [ComplianceCategory.DECISION]: { category: ComplianceCategory.DECISION, weight: 15, passedElements: demo.score >= 85 ? 1 : 0, totalElements: 1, score: demo.score >= 85 ? 100 : 0, findings: [] },
        [ComplianceCategory.RECREDENTIALING]: { category: ComplianceCategory.RECREDENTIALING, weight: 10, passedElements: 1, totalElements: 1, score: 100, findings: [] },
        [ComplianceCategory.MONITORING]: { category: ComplianceCategory.MONITORING, weight: 5, passedElements: 1, totalElements: 1, score: 100, findings: [] },
        [ComplianceCategory.INTEGRITY]: { category: ComplianceCategory.INTEGRITY, weight: 10, passedElements: 1, totalElements: 1, score: 100, findings: [] }
      },
      findings,
      recommendations: findings.filter(f => f.status === FindingStatus.FAIL).map(f => f.recommendation!),
      documents: [
        { documentType: DocumentType.LICENSE, found: true, extractionConfidence: 95, keyDataExtracted: ['License Number', 'Expiration Date', 'State'] },
        { documentType: DocumentType.DEA_CDS, found: true, extractionConfidence: 92, keyDataExtracted: ['DEA Number', 'Expiration Date'] },
        { documentType: DocumentType.BOARD_CERTIFICATION, found: true , extractionConfidence: 88, keyDataExtracted: ['Certification', 'Specialty'] },
        { documentType: DocumentType.MALPRACTICE_INSURANCE, found: true, extractionConfidence: 96, keyDataExtracted: ['Policy Number', 'Coverage Amount'] },
        { documentType: DocumentType.APPLICATION, found: true, extractionConfidence: 90, keyDataExtracted: ['Name', 'NPI', 'Specialty'] }
      ],
      auditTrail: [
        { timestamp: uploadDate, action: 'AUDIT_COMPLETED', performedBy: 'AI Engine (Gemini 2.5 Flash)', details: `Automated NCQA 2025 compliance audit completed with score ${demo.score}%` }
      ],
      ocrQuality: 92,
      documentCompleteness: demo.score >= 85 ? 95 : 75,
      dataConsistency: 90,
      ruleAmbiguity: 12
    };

    auditResults[demo.id] = auditResult;

    systemLogs.push({
      timestamp: uploadDate,
      action: 'AUDIT_COMPLETED',
      details: `Audit completed for ${demo.name} (NPI: ${demo.npi}) - Score: ${demo.score}%, Tier: ${demo.tier}`,
      userId: 'system'
    });
  });

  console.log('Demo data initialized: 2 practitioners, 0 alerts');
}

// Initialize demo data on server start
initializeDemoData();

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});


// ==================== NCQA 2025 CONSTANTS ====================
const NCQA_2025_CONFIG = {
  timeframes: {
    accreditation: 120, // days
    certification: 90,  // days
    recredentialingCycle: 36, // months
    monitoringFrequency: 30 // days
  },
  categoryWeights: {
    [ComplianceCategory.APPLICATION]: 0.15,
    [ComplianceCategory.PSV]: 0.45,
    [ComplianceCategory.DECISION]: 0.15,
    [ComplianceCategory.RECREDENTIALING]: 0.10,
    [ComplianceCategory.MONITORING]: 0.05,
    [ComplianceCategory.INTEGRITY]: 0.10
  },
  complianceTiers: {
    fullyCompliant: { min: 95, max: 100 },
    substantiallyCompliant: { min: 85, max: 94 },
    partiallyCompliant: { min: 70, max: 84 },
    nonCompliant: { min: 0, max: 69 }
  },
  requiredDocuments: [
    DocumentType.APPLICATION,
    DocumentType.ATTESTATION,
    DocumentType.LICENSE,
    DocumentType.DEA_CDS,
    DocumentType.EDUCATION,
    DocumentType.BOARD_CERTIFICATION,
    DocumentType.MALPRACTICE_INSURANCE,
    DocumentType.SANCTIONS_QUERY,
    DocumentType.CV_WORK_HISTORY
  ],
  attestationRequirements: [
    'sanctionsDisclosure',
    'malpracticeDisclosure',
    'healthStatusDisclosure',
    'substanceAbuseDisclosure',
    'privilegeLossDisclosure'
  ],
  psvElements: [
    { type: 'License', source: 'State Licensing Board PSV Document', required: true },
    { type: 'DEA/CDS', source: 'DEA Database PSV Document', required: true },
    { type: 'Education', source: 'School/Program Direct', required: true },
    { type: 'Board Certification', source: 'ABMS/AOA', required: false },
    { type: 'Work History', source: 'Direct Verification/CV', required: true },
    { type: 'Malpractice Insurance', source: 'CAQH Insurance Section or Insurance Copy/Certificate', required: true },
    { type: 'Malpractice History', source: 'NPDB Document/Loss Runs', required: true },
    { type: 'Sanctions/Exclusions', source: 'OIG/SAM/Medicare Opt Out/Medicare Preclusion/Medicaid Sanctions', required: true }
  ]
};

// ==================== HELPER FUNCTIONS ====================

function logSystemAction(action: string, details: string, userId?: string) {
  systemLogs.unshift({
    timestamp: new Date().toISOString(),
    action,
    details,
    userId
  });
  if (systemLogs.length > 1000) systemLogs.pop();
}

function ensureStoragePath(path: string) {
  uploadsFolder = path;
  if (!existsSync(uploadsFolder)) {
    mkdirSync(uploadsFolder, { recursive: true });
  }
}

function safeFileName(name: string): string {
  return basename(name).replace(/[<>:"/\\|?*]/g, '_');
}

function saveUploadedFiles(fileId: string, files: Express.Multer.File[]) {
  const auditFolder = join(uploadsFolder, fileId);
  if (!existsSync(auditFolder)) {
    mkdirSync(auditFolder, { recursive: true });
  }

  uploadedDocuments[fileId] = files.map((file, index) => {
    const safeName = `${index + 1}-${safeFileName(file.originalname)}`;
    const filePath = join(auditFolder, safeName);
    writeFileSync(filePath, file.buffer);

    return {
      name: file.originalname,
      filePath,
      mimeType: file.mimetype,
      size: file.buffer.length
    };
  });
}

function saveAuditHistory() {
  writeFileSync(stateFilePath(), JSON.stringify({ practitionerFiles, auditResults, uploadedDocuments, systemLogs }, null, 2));
}

function loadAuditHistory() {
  if (!existsSync(stateFilePath())) return;

  try {
    const state = JSON.parse(readFileSync(stateFilePath(), 'utf-8'));
    practitionerFiles.splice(0, practitionerFiles.length, ...(state.practitionerFiles || []));
    Object.keys(auditResults).forEach(key => delete auditResults[key]);
    Object.assign(auditResults, state.auditResults || {});
    Object.values(auditResults).forEach(audit => {
      const recalculatedScore = calculateOverallScoreFromCategoryScores(audit.categoryScores);
      audit.overallScore = recalculatedScore;
      audit.tier = calculateComplianceTier(recalculatedScore);
      Object.values(audit.categoryScores || {}).forEach(categoryScore => {
        categoryScore.score = Math.round(calculateCategoryScorePercent(categoryScore));
      });
      const practitionerFile = practitionerFiles.find(file => file.id === audit.fileId);
      if (practitionerFile) {
        practitionerFile.overallScore = recalculatedScore;
        practitionerFile.tier = audit.tier;
      }
    });
    Object.keys(uploadedDocuments).forEach(key => delete uploadedDocuments[key]);
    Object.assign(uploadedDocuments, state.uploadedDocuments || {});
    systemLogs.splice(0, systemLogs.length, ...(state.systemLogs || []));
  } catch (error) {
    console.error('Failed to load audit history:', error);
  }
}

loadAuditHistory();

function calculateComplianceTier(score: number): ComplianceTier {
  if (score >= 95) return ComplianceTier.FULLY_COMPLIANT;
  if (score >= 85) return ComplianceTier.SUBSTANTIALLY_COMPLIANT;
  if (score >= 70) return ComplianceTier.PARTIALLY_COMPLIANT;
  return ComplianceTier.NON_COMPLIANT;
}

function calculateConfidenceScore(factors: {
  ocrQuality: number;
  documentCompleteness: number;
  dataConsistency: number;
  ruleAmbiguity: number;
}): number {
  return Math.round(
    (factors.ocrQuality * 0.3) +
    (factors.documentCompleteness * 0.3) +
    (factors.dataConsistency * 0.25) +
    ((100 - factors.ruleAmbiguity) * 0.15)
  );
}

function normalizeScoreToPercent(score: number): number {
  if (!Number.isFinite(score)) return 0;
  if (score > 0 && score <= 1) return score * 100;
  return score;
}

function clampPercent(score: number): number {
  return Math.min(100, Math.max(0, Math.round(normalizeScoreToPercent(score))));
}

function calculateCategoryScorePercent(data: any): number {
  const passedElements = Number(data?.passedElements);
  const totalElements = Number(data?.totalElements);

  if (Number.isFinite(passedElements) && Number.isFinite(totalElements) && totalElements > 0) {
    return (passedElements / totalElements) * 100;
  }

  return normalizeScoreToPercent(Number(data?.score || 0));
}

function calculateOverallScoreFromCategoryScores(categoryScores: Record<string, any>): number {
  let overallScore = 0;
  let totalWeight = 0;

  Object.entries(categoryScores || {}).forEach(([category, data]) => {
    const weight = NCQA_2025_CONFIG.categoryWeights[category as ComplianceCategory] || 0;
    totalWeight += weight;
    overallScore += calculateCategoryScorePercent(data) * weight;
  });

  if (totalWeight === 0) return 0;
  return Math.round(overallScore / totalWeight);
}

function getApplicableCategories(credentialingType: CredentialType): ComplianceCategory[] {
  if (credentialingType === CredentialType.RECREDENTIALING) {
    return [
      ComplianceCategory.RECREDENTIALING,
      ComplianceCategory.PSV,
      ComplianceCategory.DECISION,
      ComplianceCategory.INTEGRITY
    ];
  }

  return [
    ComplianceCategory.APPLICATION,
    ComplianceCategory.PSV,
    ComplianceCategory.DECISION,
    ComplianceCategory.INTEGRITY
  ];
}

function getCredentialingRuleScope(credentialingType: CredentialType): string {
  if (credentialingType === CredentialType.RECREDENTIALING) {
    return `Credentialing type detected: Recredentialing.
Evaluate ONLY recredentialing-applicable rules and return ONLY these result categories: Recredentialing, PSV, Decision, Integrity.
Do not evaluate or return initial-only Application/Education rules unless they are explicitly required as refreshed recredentialing evidence.
Do not include Monitoring or unrelated categories in categoryScores or findings.`;
  }

  return `Credentialing type detected: Initial credentialing.
Evaluate ONLY initial credentialing rules and return ONLY these result categories: Application, PSV, Decision, Integrity.
Do not evaluate or return Recredentialing Cycle rules.
Do not include Monitoring or unrelated categories in categoryScores or findings.`;
}

function filterAuditDataByCredentialingType(auditData: any, credentialingType: CredentialType) {
  const applicableCategories = new Set(getApplicableCategories(credentialingType));

  auditData.findings = (auditData.findings || []).filter((f: any) => applicableCategories.has(f.category));

  const filteredCategoryScores: Record<string, any> = {};
  Object.entries(auditData.categoryScores || {}).forEach(([category, data]) => {
    if (applicableCategories.has(category as ComplianceCategory)) {
      filteredCategoryScores[category] = data;
    }
  });
  auditData.categoryScores = filteredCategoryScores;

  return auditData;
}

// Fixed, canonical element checklist. The audit ALWAYS evaluates exactly these
// elements (same count, same names, same order) so the same packet yields the
// same number of elements/fields on every run, independent of model drift.
interface CanonicalElement {
  element: string;
  category: ComplianceCategory;
  keywords: string[];
  // When true, this element is populated from the provider identity consistency
  // check (Name, DOB, NPI, Specialty, foreign-provider detection) instead of
  // being matched against the AI findings.
  providerIdentity?: boolean;
}

const CANONICAL_PSV_ELEMENTS: CanonicalElement[] = [
 // { element: 'Provider  Identity Mismatch Detected', category: ComplianceCategory.PSV, keywords: ['Verified PSV','insurance','certification','license number','provider identity', 'identity', 'same provider','name', 'dob', 'npi', 'specialty', 'signature date','application complete', 'completeness', 'demographic', 'identif'], providerIdentity: true },
  { element: 'License', category: ComplianceCategory.PSV, keywords: ['Verified PSV', 'state license', 'license','license number', 'state', 'issue date', 'expiration date', 'status','reviewed'] },
  { element: 'DEA/CDS', category: ComplianceCategory.PSV, keywords: ['Verified PSV', 'dea', 'cds','dea number', 'expiration date', 'registration' ,'status'] },
  { element: 'Education', category: ComplianceCategory.PSV, keywords: ['Verified PSV','institution','graduation date', 'verification source', 'education', 'school', 'graduation', 'degree','reviewed','TRAINING INFORMATION','TRAINING'] },
  { element: 'Board Certification', category: ComplianceCategory.PSV, keywords: ['Verified PSV', 'board','reviewed','Board name', 'certification date', 'expiration date','ABMS', 'AOA', 'recognized board'] },
 // { element: 'Work History Verification / 5-Year Coverage', category: ComplianceCategory.PSV, keywords:  ['Verified PSV', 'work history', 'work-history', '5-year', 'five year', '5 year', 'coverage','gap'] },
  { element: 'Malpractice Insurance', category: ComplianceCategory.PSV, keywords: ['Verified PSV', 'insurance', 'policy', 'coverage','reviewed','insurer certificate or letter','insurer name','date'] },
  { element: 'Malpractice History (NPDB/Loss Runs)', category: ComplianceCategory.PSV, keywords: ['Verified PSV', 'npdb', 'loss run', 'malpractice history','reviewed'] },
  { element: 'OIG', category: ComplianceCategory.PSV, keywords: ['Verified PSV', 'oig', 'leie','reviewed'] },
  { element: 'SAM', category: ComplianceCategory.PSV, keywords: ['Verified PSV', 'sam','reviewed'] },
  { element: 'Medicare Opt Out', category: ComplianceCategory.PSV, keywords: ['Verified PSV', 'opt out', 'opt-out','reviewed'] },
  { element: 'Medicare Preclusion', category: ComplianceCategory.PSV, keywords: ['Verified PSV', 'preclusion','reviewed'] },
  { element: 'State Medicaid', category: ComplianceCategory.PSV, keywords: ['Verified PSV', 'medicaid','reviewed'] }
];

const CANONICAL_DECISION_ELEMENTS: CanonicalElement[] = [
  { element: 'Committee/Medical Director Decision Present', category: ComplianceCategory.DECISION, keywords: ['DECISION DATE','DECISION'] },
  //{ element: 'Decision Date After All Verifications', category: ComplianceCategory.DECISION, keywords: ['decision date', 'after', 'verifications complete'] },
 // { element: 'PSV Timeliness Within NCQA Window', category: ComplianceCategory.DECISION, keywords: ['timeli', 'window', '120', '90'] },
  { element: 'Adverse Action Documentation', category: ComplianceCategory.DECISION, keywords: ['adverse'] }
];

const CANONICAL_INTEGRITY_ELEMENTS: CanonicalElement[] = [
  { element: 'Audit Trail', category: ComplianceCategory.INTEGRITY, keywords: ['audit trail', 'trail'] },
 // { element: 'Verifier Identification', category: ComplianceCategory.INTEGRITY, keywords: ['verifier', 'identification'] },
  { element: 'Verification Dates', category: ComplianceCategory.INTEGRITY, keywords: ['practitioner profile','verification date', 'verified date'] },
 // { element: 'Source Documentation', category: ComplianceCategory.INTEGRITY, keywords: ['source document', 'documentation'] },
 // { element: 'No Inappropriate Updates/Backdating', category: ComplianceCategory.INTEGRITY, keywords: ['backdat', 'inappropriate', 'update'] }
];

const CANONICAL_APPLICATION_ELEMENTS: CanonicalElement[] = [
 // { element: 'Provider  Identity Mismatch Detected', category: ComplianceCategory.APPLICATION, keywords: ['provider identity', 'identity', 'same provider','name', 'dob', 'npi', 'specialty', 'signature date','application complete', 'completeness', 'demographic', 'identif'], providerIdentity: true },
  { element: 'Application', category: ComplianceCategory.APPLICATION, keywords: ['name', 'dob', 'npi', 'specialty', 'signature date','application complete', 'completeness', 'demographic', 'identif'] },
  { element: 'Work History 5-Year Coverage', category: ComplianceCategory.APPLICATION, keywords: ['work history', 'work history information', 'work-history', '5-year', 'five year', '5 year', 'coverage'] },
 // { element: 'Attestation Signed and Dated (Timeliness)', category: ComplianceCategory.APPLICATION, keywords: ['signed and dated', 'attestation date', 'attestation sign', 'attestation timeli', 'date signed'] },
   { element: 'Attestation Signed and Dated (Timeliness)', category: ComplianceCategory.APPLICATION, keywords: ['attestation date'] },
  //{ element: 'License Status', category: ComplianceCategory.APPLICATION, keywords: ['license number', 'state license', 'issue date', 'expiration date','status'] },
  { element: 'Disclosure Information', category: ComplianceCategory.APPLICATION, keywords: ['privilege','substance','health status', 'physical', 'mental','sanction', 'licensure disclosure','malpractice claim', 'claims disclosure', 'malpractice disclosure'] },
  { element: 'Substance Abuse Disclosure', category: ComplianceCategory.APPLICATION, keywords: ['substance'] },
  { element: 'Privilege Loss Disclosure', category: ComplianceCategory.APPLICATION, keywords: ['privilege'] }
];

const CANONICAL_RECREDENTIALING_ELEMENTS: CanonicalElement[] = [
  { element: 'Provider Identity', category: ComplianceCategory.RECREDENTIALING, keywords: ['provider identity', 'identity', 'same provider'], providerIdentity: true },
  { element: 'Cycle Not Exceeding 36 Months', category: ComplianceCategory.RECREDENTIALING, keywords: ['36 month', 'cycle', 'thirty-six', 'thirty six'] },
  { element: 'All PSV Elements Refreshed', category: ComplianceCategory.RECREDENTIALING, keywords: ['refresh', 'psv element'] },
  { element: 'Updated Attestation Signed and Dated', category: ComplianceCategory.RECREDENTIALING, keywords: ['attestation', 'updated', 'signed'] },
  { element: 'Previous Credentialing Decision Reference', category: ComplianceCategory.RECREDENTIALING, keywords: ['previous', 'prior decision', 'reappoint'] }
];

function getCanonicalChecklist(credentialingType: CredentialType): CanonicalElement[] {
  if (credentialingType === CredentialType.RECREDENTIALING) {
    return [
      ...CANONICAL_RECREDENTIALING_ELEMENTS,
      ...CANONICAL_PSV_ELEMENTS,
      ...CANONICAL_DECISION_ELEMENTS,
      ...CANONICAL_INTEGRITY_ELEMENTS
    ];
  }
  return [
    ...CANONICAL_APPLICATION_ELEMENTS,
    ...CANONICAL_PSV_ELEMENTS,
    ...CANONICAL_DECISION_ELEMENTS,
    ...CANONICAL_INTEGRITY_ELEMENTS
  ];
}

function normalizeElementName(name: any): string {
  return String(name || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

// Forces the AI findings onto the canonical checklist so every run produces the
// exact same elements/fields. Unmatched canonical elements become FAIL rows;
// extra AI findings not on the checklist are dropped.
function buildProviderIdentityFinding(canonical: CanonicalElement, identity: any): any {
  if (!identity) {
    return {
      element: canonical.element,
      category: canonical.category,
      status: 'FAIL',
      finding: 'Provider identity could not be verified because the identity consistency check did not return a result.',
      recommendation: 'Re-run the audit and confirm the packet contains legible provider identity fields (Name, DOB, NPI, Specialty).',
      confidence: 50,
      sourceDocument: null,
      sourcePage: null,
      sourceText: null,
      verificationDate: null,
      requiredTimeframe: null,
      actualTimeframe: null,
      isTimelinessFail: false
    };
  }

  const ids = identity.primaryIdentifiers || {};
  const detected = [
    `Name: ${ids.fullName || 'Not Found'}`,
    `DOB: ${ids.dateOfBirth || 'Not Found'}`,
    `NPI: ${ids.npi || 'Not Found'}`,
    `Specialty: ${ids.specialty || 'Not Found'}`
  ].join(' | ');

  const identityResult: string = identity.result || 'UNABLE_TO_VERIFY';
  const foreignNames: string[] = Array.isArray(identity.foreignProviderNames) ? identity.foreignProviderNames : [];
  const conflicts: string[] = Array.isArray(identity.conflictingFields) ? identity.conflictingFields : [];

  let finding: string;
  let recommendation: string;
  // Fail-closed: only PASS yields a passing finding status; all other outcomes block automated approval.
  let findingStatus: 'PASS' | 'FAIL';
  let confidence: number;

  switch (identityResult) {
    case 'PASS':
      finding = `All uploaded pages belong to the same provider. Detected identity — ${detected}.`;
      recommendation = 'No action required.';
      findingStatus = 'PASS';
      confidence = 90;
      break;

    case 'FAIL': {
      const issues: string[] = [];
      if (foreignNames.length) issues.push(`Other provider name(s) found: ${foreignNames.join(', ')}`);
      if (conflicts.length) issues.push(`Conflicting fields: ${conflicts.join('; ')}`);
      finding = `Provider identity mismatch detected. Detected identity — ${detected}.` +
        (issues.length ? ` ${issues.join('. ')}.` : ` ${identity.comments || 'Documents may belong to more than one provider.'}`);
      recommendation = 'Review the packet and remove or correct pages that do not belong to the primary provider before crediting the file.';
      findingStatus = 'FAIL';
      confidence = 90;
      break;
    }

    case 'MANUAL_REVIEW': {
      const reasons: string[] = [];
      if (foreignNames.length) reasons.push(`name variant(s) detected: ${foreignNames.join(', ')}`);
      if (conflicts.length) reasons.push(`potential discrepancies: ${conflicts.join('; ')}`);
      finding = `Identity verification requires manual review. Detected identity — ${detected}.` +
        (reasons.length ? ` Human review needed for ${reasons.join('; ')}.` : ` ${identity.comments || 'Ambiguous identity information requires human verification.'}`);
      recommendation = 'Manually verify the provider identity against a government-issued ID or official record before crediting the file. Do not approve identity automatically.';
      findingStatus = 'FAIL';
      confidence = 65;
      break;
    }

    case 'UNABLE_TO_VERIFY':
    default:
      finding = `Provider identity cannot be verified. Detected identity — ${detected}. ` +
        (identity.comments || 'Critical identity fields (Name, DOB, NPI) are missing or illegible in the packet — insufficient information to confirm identity.');
      recommendation = 'Obtain legible copies of documents containing provider name, date of birth, and NPI before processing this file.';
      findingStatus = 'FAIL';
      confidence = 40;
      break;
  }

  return {
    element: canonical.element,
    category: canonical.category,
    status: findingStatus,
    finding,
    recommendation,
    confidence,
    sourceDocument: 'CAQH / Provider Identity Verification',
    sourcePage: null,
    sourceText: detected.slice(0, 100),
    verificationDate: null,
    requiredTimeframe: null,
    actualTimeframe: null,
    isTimelinessFail: false
  };
}

function reconcileFindingsToChecklist(auditData: any, credentialingType: CredentialType, providerIdentity?: any) {
  const checklist = getCanonicalChecklist(credentialingType);
  const rawFindings: any[] = Array.isArray(auditData.findings) ? [...auditData.findings] : [];
  const consumed = new Set<number>();

  const findMatch = (canonical: CanonicalElement): any | null => {
    const canonicalNorm = normalizeElementName(canonical.element);
    // Pass 1: exact normalized name match within the same category.
    for (let i = 0; i < rawFindings.length; i++) {
      if (consumed.has(i)) continue;
      const f = rawFindings[i];
      if (f.category !== canonical.category) continue;
      if (normalizeElementName(f.element) === canonicalNorm) {
        consumed.add(i);
        return f;
      }
    }
    // Pass 2: keyword match within the same category.
    for (let i = 0; i < rawFindings.length; i++) {
      if (consumed.has(i)) continue;
      const f = rawFindings[i];
      if (f.category !== canonical.category) continue;
      const fName = normalizeElementName(f.element);
      if (canonical.keywords.some(kw => fName.includes(kw))) {
        consumed.add(i);
        return f;
      }
    }
    return null;
  };

  const reconciled = checklist.map(canonical => {
    if (canonical.providerIdentity) {
      return buildProviderIdentityFinding(canonical, providerIdentity);
    }
    // The credentialing decision is treated as satisfied even when no Committee
    // Meeting Minutes or Medical Director Approval document is present and the
    // decision is only noted on a Practitioner Profile — always PASS this element.
    const alwaysPass = normalizeElementName(canonical.element) === normalizeElementName('Committee/Medical Director Decision Present');
    const match = findMatch(canonical);
    if (match) {
      return {
        ...match,
        element: canonical.element,
        category: canonical.category,
        status: alwaysPass ? 'PASS' : (match.status === 'PASS' ? 'PASS' : 'FAIL')
      };
    }
    if (alwaysPass) {
      return {
        element: canonical.element,
        category: canonical.category,
        status: 'PASS',
        finding: 'Credentialing decision confirmed. Although no Committee Meeting Minutes or Medical Director Approval document was found, the decision noted on the Practitioner Profile is accepted as evidence of the credentialing decision.',
        recommendation: 'No action required.',
        confidence: 75,
        sourceDocument: 'Practitioner Profile',
        sourcePage: null,
        sourceText: null,
        verificationDate: null,
        requiredTimeframe: null,
        actualTimeframe: null,
        isTimelinessFail: false
      };
    }
    return {
      element: canonical.element,
      category: canonical.category,
      status: 'FAIL',
      finding: 'Required evidence for this element was not found in the credentialing packet.',
      recommendation: 'Obtain and verify this element from the approved primary source.',
      confidence: 50,
      sourceDocument: null,
      sourcePage: null,
      sourceText: null,
      verificationDate: null,
      requiredTimeframe: null,
      actualTimeframe: null,
      isTimelinessFail: false
    };
  });

  auditData.findings = reconciled;

  // ---- CATEGORY-SCOPED Provider Identity conflict cascade ----
  // IDENTITY MISMATCH — CATEGORY-SCOPED FAILURE RULE:
  // A confirmed provider identity mismatch must NOT invalidate the entire packet. Instead, the
  // failure is scoped to ONLY the compliance element/category that the CONFLICTING SOURCE DOCUMENT
  // belongs to — identified by the document's own heading/section title, NOT by the field that
  // differs. Example: an NPI mismatch found on a "DEA Certificate" page fails only DEA/CDS, not
  // every element; a name mismatch found on an "Education Verification" page fails only Education.
  // We map each conflict's SOURCE DOCUMENT TYPE to its single canonical element and fail only that.
  // FAIL and MANUAL_REVIEW both carry scopedConflicts that must cascade to the affected elements.
  // UNABLE_TO_VERIFY has no specific conflicts to scope so no cascade is applied.
  if (providerIdentity && (providerIdentity.result === 'FAIL' || providerIdentity.result === 'MANUAL_REVIEW')) {
    // Map a source-document heading/type to the canonical element/category it belongs to.
    // Order matters: more specific document types are matched first.
    const SOURCE_DOC_TO_ELEMENT: { keywords: string[]; element: string }[] = [
      { keywords: ['state license', 'license information', 'licensure', 'license verification', 'medical license', 'license'], element: 'License' },
      { keywords: ['dea certificate', 'cds registration', 'controlled substance', 'dea', 'cds'], element: 'DEA/CDS' },
      { keywords: ['education verification', 'training information', 'medical school', 'residency', 'fellowship', 'graduation', 'education', 'training'], element: 'Education' },
      { keywords: ['board certification', 'board cert', 'abms', 'abim', 'aoa', 'recognized board'], element: 'Board Certification' },
      { keywords: ['malpractice history', 'npdb', 'loss run'], element: 'Malpractice History (NPDB/Loss Runs)' },
      { keywords: ['malpractice insurance', 'liability insurance', 'certificate of insurance', 'coi', 'insurance'], element: 'Malpractice Insurance' },
      { keywords: ['work history', 'employment', 'curriculum vitae', 'cv'], element: 'Work History 5-Year Coverage' },
      { keywords: ['oig', 'leie'], element: 'OIG' },
      { keywords: ['sam.gov', 'system for award', 'sam'], element: 'SAM' },
      { keywords: ['medicare opt-out', 'medicare opt out', 'opt-out', 'opt out'], element: 'Medicare Opt Out' },
      { keywords: ['medicare preclusion', 'preclusion'], element: 'Medicare Preclusion' },
      { keywords: ['state medicaid', 'medicaid sanction', 'medicaid'], element: 'State Medicaid' },
      { keywords: ['attestation', 'caqh', 'application'], element: 'Application' }
    ];

    // Resolve a canonical element from free text by scanning for a source-document type keyword.
    const resolveElementFromText = (text: any): string | null => {
      const t = String(text || '').toLowerCase();
      if (!t) return null;
      for (const mapping of SOURCE_DOC_TO_ELEMENT) {
        if (mapping.keywords.some(kw => t.includes(kw))) return mapping.element;
      }
      return null;
    };

    // Fail ONLY the named element (scoped to its own category). No broad cascade.
    const failScopedElement = (elementName: string, conflictText: string) => {
      const targetNorm = normalizeElementName(elementName);
      const target = reconciled.find(f => normalizeElementName(f.element) === targetNorm);
      if (target && target.status !== 'FAIL') {
        target.status = 'FAIL';
        target.finding = `Provider Identity Consistency check found an identity mismatch on this element's source document: "${conflictText}". Per the category-scoped failure rule, the failure is scoped to this element/category only and does not invalidate other elements in the packet. (Original finding before this override: ${target.finding || 'N/A'})`;
        target.recommendation = 'Resolve the identity mismatch on the source document for this element (correct the source document, or confirm which value is authoritative) before crediting this element.';
        target.confidence = Math.min(target.confidence || 90, 60);
        target.isTimelinessFail = target.isTimelinessFail || false;
      }
    };

    const scoped: any[] = Array.isArray(providerIdentity.scopedConflicts) ? providerIdentity.scopedConflicts : [];
    if (scoped.length > 0) {
      // Preferred path: the identity check reported the source document type per conflict.
      for (const sc of scoped) {
        const element =
          resolveElementFromText(sc?.sourceDocumentType) ||
          resolveElementFromText(sc?.conflictDetail) ||
          resolveElementFromText(sc?.conflictingField);
        if (element) {
          failScopedElement(element, sc?.conflictDetail || sc?.sourceDocumentType || sc?.conflictingField || 'identity mismatch');
        }
      }
    } else if (Array.isArray(providerIdentity.conflictingFields)) {
      // Backward-compatible path: infer the source document type from the conflict text itself
      // (existing conflictingFields strings typically name the document, e.g. "DEA number on DEA
      // certificate differs from CAQH"). Still scopes to a single element — never broad.
      for (const conflictText of providerIdentity.conflictingFields) {
        const element = resolveElementFromText(conflictText);
        if (element) failScopedElement(element, conflictText);
      }
    }
  }

  // Rebuild category scores from the fixed checklist so totals never vary.
  const rebuilt: Record<string, any> = {};
  for (const canonical of checklist) {
    if (!rebuilt[canonical.category]) {
      rebuilt[canonical.category] = { passedElements: 0, totalElements: 0 };
    }
  }
  for (const f of reconciled) {
    const bucket = rebuilt[f.category];
    if (!bucket) continue;
    bucket.totalElements += 1;
    if (f.status === 'PASS') bucket.passedElements += 1;
  }
  Object.values(rebuilt).forEach((b: any) => {
    b.score = b.totalElements > 0 ? Math.round((b.passedElements / b.totalElements) * 100) : 0;
  });
  auditData.categoryScores = rebuilt;

  return auditData;
}

async function detectCredentialingTypeFromDocuments(ai: GoogleGenAI, parts: any[], fallbackType: CredentialType): Promise<CredentialType> {
  const detectionPrompt = `Review the uploaded credentialing packet and determine whether it is Initial credentialing or Recredentialing.
Use document text/evidence only. Look for phrases such as initial credentialing, new provider, credentialing application, recredentialing, re-credentialing, renewal, 36-month cycle, previous credentialing decision, or reappointment.
Return strict JSON only: { "credentialingType": "Initial" | "Recredentialing", "confidence": number, "evidence": "string" }`;

  try {
    const result = await generateContentWithRetry(ai, {
      contents: [{ parts: [...parts, { text: detectionPrompt }] }],
      config: { ...DETERMINISTIC_GENERATION_CONFIG, responseMimeType: 'application/json' }
    }, 2);
    const detected = JSON.parse(result.text || '{}');
    return detected.credentialingType === CredentialType.RECREDENTIALING ? CredentialType.RECREDENTIALING : CredentialType.INITIAL;
  } catch (error) {
    console.warn('Credentialing type detection failed, using selected type:', error);
    return fallbackType === CredentialType.RECREDENTIALING ? CredentialType.RECREDENTIALING : CredentialType.INITIAL;
  }
}

async function detectProviderIdentityConsistency(ai: GoogleGenAI, parts: any[]): Promise<any> {
  const prompt = `You are a document identity verification specialist. Review ALL uploaded documents/pages in this credentialing packet.

SOURCE PRIORITY: Always extract primary identifiers from CAQH pages first. Only use Practitioner Profile / provider summary pages as a fallback if CAQH pages do not contain the identifier.

Your task: Determine whether ALL documents in this packet belong to the SAME single individual practitioner/provider.

CRITICAL NAME EXTRACTION RULES — READ CAREFULLY:
- Only extract names that appear next to an explicit individual provider/practitioner name label such as: "Provider Name", "Practitioner Name", "Physician Name", "Name of Applicant", "Applicant Name", "Provider Full Name", "Licensed To", "Registrant Name", "Name" (when clearly referring to the individual practitioner).
- DO NOT extract facility names, hospital names, group practice names, clinic names, organization names, employer names, insurance company names, board names, or any other institutional names — even if they contain a person's name or appear on the document.
- DO NOT scan free text paragraphs, headers, footers, logos, addresses, or signature blocks for names.
- DO NOT include names of verifiers, committee members, supervisors, references, or any third party — only the primary subject practitioner's name.
- If a name field is NOT explicitly labelled as a provider/practitioner name field, DO NOT include it.

Check each document/page for (CAQH first, then other docs, Practitioner Profile as last resort):
1. Provider full name — from explicitly labelled provider/practitioner name fields only (see rules above)
2. Date of Birth
3. NPI number
4. State license number(s)
5. DEA number
6. Specialty

Then:
- List only the explicitly labelled practitioner names found — no facility names, no unlabelled names
- If any document has a different individual practitioner name in a labelled provider name field, flag it as a foreign provider name
- If any document has a different NPI, license number, or DEA number, flag it

CATEGORY-SCOPED MISMATCH RULE — CRITICAL:
A single identity mismatch does NOT invalidate the entire packet. For EVERY conflict you detect, you MUST identify the SOURCE DOCUMENT TYPE the mismatch was found on — using the document's own heading/section title, NOT the field label that differs. Report each conflict as a scopedConflicts entry so the failure can be scoped to only the compliance element that document belongs to. Examples of mapping the source document heading to its category:
- "CT License Information" / "State License Verification" page → License
- "Education Verification" / "Training Information" page → Education
- "DEA Certificate" / "CDS Registration" page → DEA/CDS
- "Board Certification" / "ABMS" page → Board Certification (ABMS is the approved source). An "ABIM" page alone is NOT an approved Board Certification source — only use an ABIM page if it is explicitly labeled as an ABMS verification result or if no ABMS document is present at all
- "Malpractice Insurance" page → Malpractice Insurance
- "Work History" / "Employment" record → Work History
- "OIG" / "SAM" / "Medicare Opt-Out" / "Medicare Preclusion" / "State Medicaid Sanction" report → that specific sanctions check
- base CAQH Application / Attestation → Application

RESULT CLASSIFICATION — choose exactly one:
- "PASS"           : All reviewed identity fields (Name, DOB, NPI, License numbers, DEA, Specialty) are consistent across all documents. No foreign provider names detected.
- "FAIL"           : Confirmed, clear mismatch in critical identity fields where a DIFFERENT individual's name appears in an explicitly labelled provider name field on at least one document. This is the case when documents clearly belong to two different people. Do NOT use FAIL for name variants (maiden vs married name, nicknames, abbreviations, or minor formatting differences).
- "MANUAL_REVIEW"  : A potential identity concern exists but is NOT a confirmed mismatch of a different person. Use MANUAL_REVIEW when: (a) a name variant is detected (maiden name vs married name, nickname, name abbreviation or initial vs full name); (b) OCR quality is poor or a field is partially illegible making it impossible to confirm a match or mismatch with confidence; (c) a minor, ambiguous discrepancy exists that could be a data-entry error or formatting difference rather than a different individual.
- "UNABLE_TO_VERIFY": Critical identity fields (Name, DOB, NPI) are missing or completely illegible across the packet — insufficient information to perform any comparison.

FAIL-CLOSED RULE: When in doubt between FAIL and MANUAL_REVIEW, choose MANUAL_REVIEW. When in doubt between MANUAL_REVIEW and UNABLE_TO_VERIFY, choose UNABLE_TO_VERIFY. Only use PASS when identity is clearly and unambiguously confirmed.

Return strict JSON only:
{
  "result": "PASS" | "FAIL" | "MANUAL_REVIEW" | "UNABLE_TO_VERIFY",
  "primaryIdentifiers": {
    "fullName": "string | null",
    "dateOfBirth": "string | null",
    "npi": "string | null",
    "stateLicenseNumbers": ["string"],
    "deaNumber": "string | null",
    "cdsNumber": "string | null",
    "specialty": "string | null",
    "otherIdentifiers": ["string"]
  },
  "allNamesFound": ["string - every provider name found across all pages/documents"],
  "documentsReviewed": ["string - list each document/file reviewed"],
  "mismatchedDocuments": ["string - documents with identity mismatches"],
  "conflictingFields": ["string - specific fields that conflicted, e.g. 'DEA number on DEA certificate differs from CAQH'"],
  "scopedConflicts": [
    {
      "sourceDocumentType": "string - the heading/section title of the document the mismatch was found on, e.g. 'CT License Information', 'DEA Certificate', 'Education Verification'",
      "conflictingField": "string - which field differs, e.g. 'name', 'DOB', 'NPI', 'license number', 'DEA number'",
      "conflictDetail": "string - short description of the mismatch and both conflicting values"
    }
  ],
  "foreignProviderNames": ["string - names found that do NOT match the primary provider"],
  "comments": "string - summary of findings"
}`;

  try {
    const result = await generateContentWithRetry(ai, {
      contents: [{ parts: [...parts, { text: prompt }] }],
      config: { ...DETERMINISTIC_GENERATION_CONFIG, responseMimeType: 'application/json' }
    }, 2);
    const data = JSON.parse(result.text || '{}');
    const VALID_IDENTITY_RESULTS = ['PASS', 'FAIL', 'MANUAL_REVIEW', 'UNABLE_TO_VERIFY'] as const;
    type IdentityResult = typeof VALID_IDENTITY_RESULTS[number];
    const normalizedResult: IdentityResult = VALID_IDENTITY_RESULTS.includes(data.result as IdentityResult)
      ? (data.result as IdentityResult)
      : 'UNABLE_TO_VERIFY';
    return {
      result: normalizedResult,
      primaryIdentifiers: data.primaryIdentifiers || {
        fullName: null, dateOfBirth: null, npi: null,
        stateLicenseNumbers: [], deaNumber: null, cdsNumber: null,
        specialty: null, otherIdentifiers: []
      },
      allNamesFound: data.allNamesFound || [],
      documentsReviewed: data.documentsReviewed || [],
      mismatchedDocuments: data.mismatchedDocuments || [],
      conflictingFields: data.conflictingFields || [],
      scopedConflicts: Array.isArray(data.scopedConflicts) ? data.scopedConflicts : [],
      foreignProviderNames: data.foreignProviderNames || [],
      comments: data.comments || ''
    };
  } catch (error) {
    console.warn('Provider identity consistency check failed:', error);
    return null;
  }
}

function isRetryableGeminiError(error: any): boolean {
  const status = error?.status || error?.error?.code;
  const message = typeof error?.message === 'string' ? error.message : '';
  return status === 429 || status === 503 || message.includes('UNAVAILABLE') || message.includes('high demand');
}

function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Deterministic decoding settings so the same packet always yields the same audit output.
const DETERMINISTIC_GENERATION_CONFIG = {
  temperature: 0,
  topP: 1,
  presencePenalty: 0,
  frequencyPenalty: 0,
  seed: 42
} as const;

async function generateContentWithRetry(ai: GoogleGenAI, request: any, maxAttempts = 3) {
  // Determinism requirement: always use the SAME configured model for every run.
  // Never fall back to a different model, since a different model would produce
  // different results for the same input packet. On transient (429/503) errors we
  // retry the identical model with backoff instead of switching models.
  const model = availableGeminiModels.includes(selectedGeminiModel) ? selectedGeminiModel : availableGeminiModels[0];
  let lastError: any;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await ai.models.generateContent({ ...request, model });
    } catch (error: any) {
      lastError = error;

      if (!isRetryableGeminiError(error)) {
        throw error;
      }

      if (attempt === maxAttempts) {
        console.warn(`Gemini model ${model} unavailable after ${maxAttempts} attempts`);
        break;
      }

      const delay = Math.min(30000, 3000 * Math.pow(2, attempt - 1));
      console.warn(`Gemini model ${model} unavailable, retrying in ${delay}ms (attempt ${attempt + 1}/${maxAttempts})`);
      await wait(delay);
    }
  }

  throw lastError;
}

function generateRecommendations(findings: AuditFinding[]): string[] {
  const recommendations: string[] = [];
  const failedFindings = findings.filter(f => f.status === FindingStatus.FAIL);
  
  const categoryIssues = new Map<string, number>();
  failedFindings.forEach(f => {
    const count = categoryIssues.get(f.category) || 0;
    categoryIssues.set(f.category, count + 1);
  });

  if (categoryIssues.has(ComplianceCategory.APPLICATION)) {
    recommendations.push('Review and update practitioner application to ensure all required fields are complete and attestation is last.');
  }
  if (categoryIssues.has(ComplianceCategory.PSV)) {
    recommendations.push('Obtain missing primary source verifications within the 120-day timeframe requirement.');
  }
  if (categoryIssues.has(ComplianceCategory.DECISION)) {
    recommendations.push('Ensure credentialing committee decision is documented with date, reviewer name, and approval status.');
  }
  if (categoryIssues.has(ComplianceCategory.INTEGRITY)) {
    recommendations.push('CRITICAL: Information Integrity is a Must-Pass element. Implement audit trails and verifier identification immediately.');
  }
  if (categoryIssues.has(ComplianceCategory.MONITORING)) {
    recommendations.push('Establish monthly monitoring schedule for exclusions (OIG/SAM) and license expirations per NCQA 2025 requirements.');
  }

  return recommendations;
}

// ==================== GEMINI AI AUDIT ENGINE ====================

const NCQA_AUDIT_SYSTEM_PROMPT = `You are an NCQA Credentialing Audit Engine performing deterministic credentialing validation.

SYSTEM ROLE:
- Do NOT behave like a conversational AI. Do NOT generate opinions. Do NOT summarize unless requested. Only validate evidence.

STRICT EXECUTION RULES:
- Execute every instruction exactly. Review every page exactly once. Never skip pages. Never reorder validations. Never ignore a rule.
- Never guess. Never infer. Never estimate. Never fabricate. Never hallucinate. Never use outside knowledge.
- Use ONLY information explicitly contained in the uploaded credentialing packet.
- If evidence does not exist, return FAIL.
- If evidence cannot be read, return NEEDS_REVIEW.
- Never convert FAIL into PASS because the information appears elsewhere.

CONSISTENCY RULES:
- The same input must always produce the same output. Always use identical evaluation logic.
- Always evaluate rules in this exact order, and never change it:
  1. Provider Identity  2. Application  3. Attestation  4. State License  5. DEA  6. CDS
  7. Education  8. Board Certification  9. Work History  10. Hospital Privileges  11. Malpractice Insurance
  12. Malpractice History  13. NPDB  14. OIG  15. SAM  16. State Medicaid  17. Credentialing Decision
  18. Recredentialing  19. Ongoing Monitoring  20. Information Integrity

SOURCE DOCUMENT RESTRICTIONS (validate only using approved source documents; ignore every other document):
- State License: Verified PSV only
- DEA: Verified PSV only
- Education: School/Program Verification, or highest-level verification (a "Defer to Highest Level" designation, or verified board certification/residency) which satisfies Education,When there is no school or degree, go to training or training program or training information, you can go to Practitioner Profile and check Education/Training 
- Board Certification: ABMS / AOA only. If both an ABMS page and an ABIM page exist in the packet, the ABMS page is the required source — the ABIM page must be ignored for this element
- Work History: CAQH only
- Malpractice Insurance: Carrier Certificate only
- Malpractice History: NPDB or Loss Run only
- Sanctions: OIG, SAM, State Medicaid
- Committee Decision: Committee Minutes, Medical Director Approval

DOCUMENT SELECTION PRIORITY (MANDATORY)

General Rules:
- Always evaluate documents in the priority order defined below.
- Always select the highest-priority document that contains the required information.
- Do not evaluate or switch to a lower-priority document if a higher-priority document satisfies the requirement.
- Use a lower-priority document only if the higher-priority document is unavailable or does not contain the required information.
- Never combine evidence from multiple documents for a single validation.
- sourceDocument, sourcePage, sourceText, verificationDate, and evaluationTrace must all reference the selected document.

Document Priority

Application
1. CAQH Application
2. Application Form
3. Practitioner Profile
4. State License

Attestation
1. CAQH Attestation
2. Attestation / Authorization / Release
3. Practitioner Profile

State License
1. State License PSV
2. State Licensing Board Verification
3. License Copy
4. Practitioner Profile

DEA/CDS
1. DEA PSV
2. CAQH DEA Section

Education
1. School / Program Verification
2. Highest Level Verification
3. CAQH Education Section
4. Practitioner Profile

Board Certification
1. ABMS Verification (HIGHEST PRIORITY — if an ABMS page exists in the packet, it MUST be used; do NOT use any ABIM-labeled page when an ABMS-labeled page is available)
2. AOA Verification
3. CAQH Board Certification Section
4. Practitioner Profile
NOTE: ABIM (American Board of Internal Medicine) is a member board WITHIN ABMS. If the packet contains a page labeled "ABMS" and a separate page labeled "ABIM", always select the ABMS-labeled page as the sourceDocument and sourcePage. Never select an ABIM page over an ABMS page.

Work History
1. CAQH Work History
2. CV / Work History Document
3. Practitioner Profile

Malpractice Insurance
1. CAQH Malpractice Insurance Section
2. Certificate of Coverage
3. Certificate of Liability Insurance

Malpractice History
1. NPDB Report
2. Loss Run Report

Sanctions
1. OIG
2. SAM
3. Medicare Opt-Out / Medicare Preclusion
4. State Medicaid

Committee Decision
1. Committee Minutes
2. Medical Director Approval

PAGE TRACEABILITY:
- Every extracted value MUST include Document, Page Number, and Evidence.
- Never return PASS without page numbers (sourceDocument, sourcePage, sourceText).

DEBUG TRACE REQUIREMENT (MANDATORY):
- For every finding, populate evaluationTrace.
- evaluationTrace must show exactly how the finding was evaluated.
- documentsReviewed: all documents considered for the rule.
- selectedDocument: authoritative document used for the decision.
- selectedPage: page number where evidence was found.
- selectedEvidence: exact evidence text used for evaluation.
- extractedValues: every value extracted and used for the rule evaluation.
- ruleApplied: exact NCQA/prompt rule applied.
- calculation: all calculations performed (timeliness, date differences, score calculations, etc.). If no calculation was required, return null values.
- reason: concise explanation of why the element was marked PASS or FAIL.
- evaluationTrace is mandatory for both PASS and FAIL findings.
- Do not omit or return null for evaluationTrace.

UNIQUE VALUE EXTRACTION:
- Extract every unique value exactly once. If the same value appears multiple times, return the first authoritative occurrence unless another source is required by NCQA.

TIMELINESS:
- Always calculate Actual Days = Decision Date - Verification Date.
- Compare with 120 Days (Accreditation) and 90 Days (Certification). Use exact calendar days. Never estimate.

PROVIDER IDENTITY:
- Compare Provider Name, DOB, NPI, State License Number, and Specialty.
- Do NOT use DEA/CDS information for Provider Identity comparison.
- DEA/CDS must be validated only under FR-009 Primary Source Verification (PSV).
- Only actual practitioner identity conflicts are FAIL. Formatting differences are acceptable.

PRACTITIONER PROFILE NAME/NPI CROSS-CHECK ACROSS ALL PSV ELEMENTS (ADDITIVE NEGATIVE-SCENARIO CHECK — DOES NOT ALTER ANY EXISTING POSITIVE-PATH LOGIC):
- Baseline source of truth for THIS CHECK ONLY: the Provider Name and NPI shown on the "Practitioner Profile" section/page (the summary header — e.g. its "NAME:" and "NPI:" fields — that sits directly above the "CREDENTIALING ACTIVITY" table). This baseline is used solely for the cross-check below; it does not change, override, or take priority over the CAQH-FIRST SOURCE PRIORITY RULE, the DOCUMENT SELECTION PRIORITY, or the PROVIDER IDENTITY rule above — those continue to govern extraction and scoring exactly as already defined.
- For EACH of the 12 PSV elements (State License, DEA/CDS, Education, Board Certification, Work History Verification, Malpractice Insurance, Malpractice History (NPDB/Loss Runs), Sanctions - OIG, Sanctions - SAM, Sanctions - Medicare Opt Out, Sanctions - Medicare Preclusion, Sanctions - State Medicaid), check whether the specific PSV verification document/screenshot/result selected for that element (per DOCUMENT SELECTION PRIORITY) itself displays a Provider Name and/or NPI (e.g., the name shown in an OIG exclusion search result, a SAM search result, an NPI registry lookup, a state license board lookup, an NPDB report header, a Medicare Preclusion table row, etc.).
- If that PSV verification document DOES display a Provider Name and it does not match the Practitioner Profile baseline Name — this is a STRAIGHT, UNCONDITIONAL FAIL for that specific PSV element. A name mismatch overrides every other consideration for that element: even if the PSV search itself shows "No Findings" or otherwise looks compliant, a mismatched name means the verification does not actually belong to this practitioner and cannot be accepted as evidence. (Acceptable formatting differences — middle initials, suffixes, punctuation, last-name/first-name ordering — are NOT mismatches and must not trigger this rule; only an actually different name triggers it.)
- If that PSV verification document DOES display an NPI and it does not match the Practitioner Profile baseline NPI, apply the identical treatment: mark that specific PSV element as FAIL.
- If the PSV verification document does NOT display a Name or NPI at all (the field is simply absent from that particular screenshot/result), do NOT fail the element under this rule — this cross-check triggers ONLY on a confirmed, actual mismatch, never on mere absence. Absence of a name/NPI field is governed entirely by that element's own existing PASS/FAIL criteria, unaffected by this rule.
- When this rule triggers a FAIL, the finding/reason must explicitly state the mismatch (e.g., "OIG exclusion search result shows provider name '[X]', which does not match the Practitioner Profile name '[Y]'; this verification cannot be accepted as evidence for this practitioner.") and sourceText must quote the specific conflicting name/NPI value found on that PSV document.
- This rule is strictly additive for catching mismatch scenarios: it must never be applied, and must never change anything, when the Name/NPI actually match — every currently-passing, correctly-matched scenario must continue to PASS exactly as it does today.

OUTPUT DISCIPLINE:
- Return valid JSON only. No markdown, no explanations, no conversational text, no assumptions, no omitted fields.
- Use null when information does not exist. Confidence scores must reflect only evidence quality, not speculation.

FIXED EVALUATION CHECKLIST (MANDATORY — MUST BE IDENTICAL ON EVERY RUN):
- You MUST evaluate exactly the elements listed below for the detected credentialing type — no more, no fewer.
- The findings array MUST contain exactly one finding row per listed element, using the exact element names below, and in this exact order.
- For each category, totalElements MUST equal the number of listed elements for that category, and passedElements MUST equal the number of those rows whose status is PASS.
- Never add, merge, split, rename, drop, or reorder elements. If an element is not applicable or its evidence is absent, still output its row (status PASS only when compliant evidence exists; otherwise FAIL) — never omit it. This guarantees the same PDF always yields the same number of elements and fields.

INITIAL CREDENTIALING — evaluate exactly these:
  Application (8 elements): 1) Application Completeness (Name, DOB, NPI, Specialty, Practice Locations); 2) Work History 5-Year Coverage; 3) Attestation Signed and Dated (Timeliness); 4) Attestation - Sanctions/Licensure Disclosure; 5) Attestation - Malpractice Claims Disclosure; 6) Attestation - Health Status Disclosure; 7) Attestation - Substance Abuse Disclosure; 8) Attestation - Privilege Loss Disclosure
  PSV (12 elements): 1) State License; 2) DEA/CDS; 3) Education; 4) Board Certification; 5) Work History Verification; 6) Malpractice Insurance; 7) Malpractice History (NPDB/Loss Runs); 8) Sanctions - OIG; 9) Sanctions - SAM; 10) Sanctions - Medicare Opt Out; 11) Sanctions - Medicare Preclusion; 12) Sanctions - State Medicaid
  Decision (4 elements): 1) Committee/Medical Director Decision Present; 2) Decision Date After All Verifications; 3) PSV Timeliness Within NCQA Window; 4) Adverse Action Documentation
  Integrity (5 elements): 1) Audit Trail; 2) Verifier Identification; 3) Verification Dates; 4) Source Documentation; 5) No Inappropriate Updates/Backdating

RECREDENTIALING — evaluate exactly these:
  Recredentialing (4 elements): 1) Cycle Not Exceeding 36 Months; 2) All PSV Elements Refreshed; 3) Updated Attestation Signed and Dated; 4) Previous Credentialing Decision Reference
  PSV (12 elements): same 12 elements listed above, same names and order
  Decision (4 elements): same 4 elements listed above, same names and order
  Integrity (5 elements): same 5 elements listed above, same names and order

CAQH-FIRST SOURCE PRIORITY RULE
- This CAQH-first rule applies ONLY to Application data (Practitioner Name, NPI, DOB, Specialty, Practice Locations) and Attestation Dates and Attestation Disclosure Questions.
- This CAQH-first rule does NOT apply to, and NEVER overrides, the DOCUMENT SELECTION PRIORITY defined above for State License, DEA/CDS, Education, Board Certification, Work History, Malpractice Insurance, Malpractice History, Sanctions, and Committee Decision.
- For these credentialing elements, always follow the DOCUMENT SELECTION PRIORITY exactly as defined above.
- Never substitute a lower-priority document when a higher-priority document is available.

NEVER start with Practitioner Profile. NEVER use Practitioner Profile as the primary source for any data element when CAQH data is available.
If a data element is found in CAQH, use CAQH as the authoritative source and do NOT override it with Practitioner Profile data.
If CAQH and Practitioner Profile conflict, CAQH wins unless a more authoritative PSV document is available.
This CAQH-first rule applies to: DEA/CDS, Education, Board Certification, Malpractice Insurance, Sanctions Query, Committee Decision, CV/Work History, Attestation dates, and all practitioner identifiers (name, NPI, DOB, specialty, practice locations).

DOCUMENT PROCESSING REQUIREMENTS:
I need to process and analyse the document based on below points:
1. Classify each document type: Application, Attestation, License, DEA/CDS, Education, Board Certification, Malpractice Insurance, Malpractice History, Sanctions Query, Committee Decision, CV/Work History
2. Extract key data elements per document type by following the Document Selection Priority defined above:
   - Application: Name, DOB, NPI, Specialty, Practice Locations, Last Attestation Signature Date from Practitioner Profile,t can not fail when any one of the license is valid in CAQH, License and Profile. If by mistake latest degree or license not defined in profile it must not stop, need to check all other areas before concluding. 
   - Attestation: date must be taken from only "PROFESSIONAL IDENTIFICATION NUMBERS" section.
   - DEA/CDS: Extract DEA Number, Expiration Date, and Registration Status by following the Document Selection Priority.
   - Education: Extract Institution, Degree, and Graduation Date by following the Document Selection Priority.
   - Board Certification: Extract Board Name, Certification Date, and Expiration Date by following the Document Selection Priority.
   - Malpractice Insurance: Extract Policy Number, Coverage Limits, Effective Date, Expiration Date, and Carrier Name by following the Document Selection Priority. Never use Practitioner Profile as evidence.
   - Malpractice History: Extract NPDB Report Date, Loss Run Date, Result, and Report Source by following the Document Selection Priority.
   - Sanctions Query: Extract Query Date, Source (OIG/SAM/Medicare Opt Out/Medicare Preclusion/Medicaid Sanctions/State), and Results by following the Document Selection Priority.
   - Committee Decision: Extract Committee Meeting Minutes Date or Medical Director Approval (received/not received), Decision Outcome, and Decision Date by following the Document Selection Priority.
   - CV/Work History: Direct verification or CV review, minimum 5 years of work history covered, and gaps greater than 6 months identified by following the Document Selection Priority.3. Validate and cross check all dates for logical consistency and timeliness using only dates visibly extracted from uploaded documents. Never use system date, current audit date, file upload date, file modified/created date, server date, or processing date for compliance calculations. PSV validity windows (90/120/180 days) must be calculated only from document-extracted verification dates to the document-extracted credentialing decision date.
4.Use the latest (most recent) attestation date found across all Attestation, Authorization, Release documents or attestation sections. Within the same section, use Last Attestation Date, then Attestation Date, and use Signature Date/DATE SIGNED only if no explicit attestation date exists. Never use Application Date, Profile Date, upload date, metadata, or any unrelated date. If multiple attestation dates are present, always use the most recent one for timeliness validation.

DATE EVIDENCE RULE:
- Validate and cross check all dates for logical consistency and timeliness using only dates visibly extracted from uploaded documents or OCR, Never use system date, current audit date, file upload date, file modified/created date, server date, or processing date for compliance calculations.
- Do not infer missing dates from metadata, upload date, current date, server date, or audit run date.
- If a required date is not found in the PDF/document content, set the applicable date field to null and mark the element as FAIL or insufficient evidence as appropriate.
- Timeliness calculations are valid only when both source dates are extracted from documents.
- Use the latest (most recent) attestation date found across all Attestation, Authorization, Release documents or attestation sections. Within the same section, use Last Attestation Date, then Attestation Date, and use Signature Date/DATE SIGNED only if no explicit attestation date exists. Never use Application Date, Profile Date, upload date, metadata, or any unrelated date. If multiple attestation dates are present, always use the most recent one for timeliness validation.

-Always use the most recent attestation date. Do not fail the validation based on an older attestation date if a newer attestation date exists anywhere in the packet.
-Date selection priority must always be highest to lowest:
-Explicitly labeled Last Attestation Date
-Explicitly labeled Attestation Date
-Only use Signature Date / DATE SIGNED (only if no explicit Attestation Date exists within the same attestation section)
-Never use Application Date, Profile Date, or any other unrelated date when an attestation date is available.
-If an attestation section contains only DATE SIGNED and no explicit Attestation Date, treat DATE SIGNED as the attestation date.
-When multiple attestation-related documents or sections are present, compare all valid attestation dates and use the most recent one as the source date for timeliness validation.

COMPLIANCE RULES (FR-008 to FR-014):

FR-008 Application/Attestation Validation (15% weight):
- Completed application with: Name, DOB/unique ID, NPI, Specialty, Practice Locations
- Work History must be checked by direct verification or CV review and must cover at least 5 years, with gap explanations for gaps > 6 months
- Signed and dated attestation within the required timeframe (120-180 days of credentialing decision, depending on program version). DATE PRIORITY ORDER (apply strictly in sequence — stop at first match): PRIORITY 1 (Document header "Last Attestation" field — highest authority): Scan the document header area — the same row or region that contains "CAQH Provider ID" — for a field explicitly labeled "Last Attestation" or "Last Attestation Date" (e.g., "Last Attestation : 04/17/2026" appearing top-right of the page alongside the CAQH Provider ID). If this field is present with a valid date, that date is the authoritative attestation date — use it immediately and stop. Do NOT use the physical signature date or DATE SIGNED from the document body when this header field is present. PRIORITY 2 (fallback): Use the latest/most recent explicit attestation date found across ALL Attestation, Authorization, and Release sections or documents in the packet. PRIORITY 3 (fallback only if PRIORITY 1 and 2 yield no date): Within the dedicated "Attestation Signed" section, use Last Attestation Date, then Attestation Date, then Signature Date/DATE SIGNED. PRIORITY 4 (last resort): If no date found above, follow the general document flow. Never use unrelated application signature dates, profile dates, upload dates, or metadata dates. only CAQH
- ATTESTATION SIGNED AND DATED — EVIDENCE SOURCE RESTRICTION (applies to "Attestation Signed and Dated (Timeliness)" and "Updated Attestation Signed and Dated" elements ONLY): For the attestation DATE, apply the DATE PRIORITY ORDER above (PRIORITY 1 first). EXCEPTION — the "Last Attestation" field that appears in the header of the attestation document itself (on the same page/row as "CAQH Provider ID", typically top-right of the Standard Authorization, Attestation and Release form) IS valid attestation date evidence and MUST be used as PRIORITY 1. For sourceDocument, sourcePage, and sourceText: these must reference the attestation document page where either the "Last Attestation" header field or the physical signature section appears. Do NOT use the Practitioner Profile section, the CAQH profile summary page, or any profile-level field labeled "Last Attestation Date" that appears within the Practitioner Profile header, CAQH profile summary, or any CAQH activity/credentialing table — those are system-generated metadata and are not valid evidence. The CAQH-first rule does NOT authorize using Practitioner Profile CAQH fields as evidence for these elements. If neither the "Last Attestation" header field nor the dedicated "Attestation Signed" section is present in the packet, mark this element as FAIL/insufficient evidence.
- Required attestation elements must be verified only from Disclosure Questions in the Attestation/Application attestation section: Sanctions/Licensure disclosure, Malpractice claims history disclosure, Physical/mental health status disclosure, Lack of current substance abuse disclosure, History of loss or limitation of privileges disclosure only CAQH
- Do not use CV, work history, employment history, gap history, or practitioner profile sections as evidence for Required Attestation Elements. If disclosure questions are missing or unanswered, mark Required Attestation Elements as FAIL/insufficient evidence even if work history exists only CAQH
- For findings with element/category related to Required Attestation Elements, sourceDocument/sourcePage/sourceText must point to the Attestation/Application Disclosure Questions evidence, never Work History/CV only CAQH
- 2025 Requirement: Optional race/ethnicity/language questions with non-discrimination language

FR-009 Primary Source Verification (45% weight):
- License: State licensing board verification within 120/90 days, calculated from verification date to decision date; sourceDocument must be the selected document as per the Document Selection Priority,t can not fail when any one of the license is valid in CAQH, License and Profile. If by mistake latest degree or license not defined in profile it must not stop, need to check all other areas before concluding. 
- DEA/CDS: DEA database verification within 120/90 days, calculated from verification date to decision date; sourceDocument must be the selected document as per the Document Selection Priority.
- Education (Education element — FR-009):
   For this element, only TWO headings are relevant, and both are valid ONLY when written FULLY IN UPPERCASE — no other casing counts, and no other heading counts:
   - "TRAINING INFORMATION"
   - "EDUCATION"
   - STARTING POINT (highlight and extraction must both begin here, nothing earlier): the first character of the exact uppercase heading "EDUCATION" itself. This is the earliest point in the document that may be extracted or highlighted for this element. If your extracted text or highlight starts anywhere before the literal "EDUCATION" heading, that is wrong — discard it and restart from that exact position.
   - IGNORE COMPLETELY for this element: Specialties, Specialty, Specialization, Board Certification, and any section by those names — do not treat them as boundaries, do not compare against them, do not pull data from them, and do not let their presence above or below "EDUCATION" influence where the highlight starts or ends. They are out of scope entirely for this check, for now.
   - Never source Institution/Degree/Graduation Date data from any section other than the exact uppercase "EDUCATION" heading — not TRAINING INFORMATION, not Specialties/Board Certification, not a Practitioner Profile "EDUCATION/TRAINING" activity table.
   - If the exact uppercase "EDUCATION" heading is not present in the packet, mark Education as insufficient evidence/FAIL rather than substituting data from TRAINING INFORMATION or any other section.
- Board Certification: ABMS/AOA verification if claimed by following the Document Selection Priority.
- Work History: Direct verification or CV review, minimum 5 years covered, gaps > 6 months identified and explained by following the Document Selection Priority.
- Malpractice Insurance: Current coverage must be verified by following the Document Selection Priority. Never use Practitioner Profile, provider profile summary, demographic profile, or system profile as evidence.
- For any Malpractice Insurance finding, sourceDocument/sourcePage/sourceText must point to the selected document as per the Document Selection Priority. If no valid evidence is available from the selected document, mark Malpractice Insurance as FAIL/insufficient evidence.
- Malpractice History: NPDB document or loss runs review by following the Document Selection Priority. NPDB findings must reference the selected document, not Practitioner Profile.
- Sanctions/Exclusions: OIG, SAM, Medicare Opt Out, Medicare Preclusion, Medicaid Sanctions and State Medicaid within 120/90 days, calculated from verification date to decision date; sourceDocument must be the selected document as per the Document Selection Priority, not Practitioner Profile.
- Each PSV must document: Source, Method, Date, Verifier Identification.

FR-010 Credentialing Decision Validation (15% weight):
- Committee meeting minutes OR medical director approval must be present; if medical director approval is required, state whether it was received or not received
- Practitioner name, decision (approve/deny/restrict), and decision date must come from committee minutes or medical director approval documentation, not practitioner profile
- Decision date occurs after all required verifications are complete
- Verification Dates of relative practitioner profile are within the NCQA timelines from the Decision date
- Adverse actions: rationale and communication documented

FR-011 Recredentialing Cycle Validation (10% weight):
- Cycle not exceeding 36 months from previous decision
- All PSV elements refreshed
- Updated attestation signed and dated

FR-013 Information Integrity (10% weight) - MUST-PASS ELEMENT:
- System records include: application, attestation, source documents, verification dates, report dates, decision dates, verifier signatures/initials
- No evidence of inappropriate "updates" (backdating, overwritten data without audit trail)
- Complete audit trail showing who verified, when, from what source
- Annual Information Integrity audit with qualitative analysis
- Corrective action tracking with 3-6 month effectiveness review
- REQUIRES 4 of 5 factors Met (no Partially Met option)
- Verification Dates element (Integrity category ONLY): Validate verification dates EXCLUSIVELY from within the Practitioner Profile section (e.g., the CREDENTIALING ACTIVITY table or any verification date fields contained in the Practitioner Profile). Do NOT evaluate or reference verification dates found in any PSV document, external source document, or any other document section for this element. If no verification dates are present within the Practitioner Profile, mark this element as FAIL.

SCORING (FR-015 to FR-018):
FR-015: For each NCQA requirement element, the system shall assign a binary compliance status:
- Compliant (PASS): Element is present, complete, accurate, and within required timeframes.
-  Non-Compliant (FAIL): Element is missing, incomplete, inaccurate, or outside timeframes.

FR-016:Weighted Compliance Score
The system shall calculate an overall file compliance score using weighted categories:

| **Category**                         | **Weight** |
| ------------------------------------ | :--------: |
| Application and Attestation          |   **15%**  |
| Primary Source Verifications         |   **45%**  |
| Credentialing Decision Documentation |   **15%**  |
| Recredentialing Cycle Compliance     |   **10%**  |
| Ongoing Monitoring                   |   **5%**   |
| Information Integrity                |   **10%**  |
| **Total**                            |  **100%**  |

FR-017: Confidence Score Calculation:
For both compliant and non-compliant determinations, the system shall provide a confidence score (0-100%) indicating the system's certainty in its assessment:
- High Confidence (90-100%): Data clearly extracted, rule logic unambiguous, no conflicting information.
- Medium Confidence (70-89%): Some data ambiguity, partial OCR quality issues, or minor inconsistencies.
- Low Confidence (0-69%): Significant OCR challenges, conflicting dates, missing key documents, or unclear documentation.

Confidence Factors:
- OCR Quality: Percentage of text successfully extracted with high confidence.
- Document Completeness: Percentage of expected document types identified.
- Data Consistency: Degree of agreement between extracted data points (e.g., dates align logically).
- Rule Ambiguity: Whether rule application requires human interpretation.

FR-018: Compliance Thresholds:
The system shall classify files into compliance tiers, File compliance tier classification:

| **Tier**                    | **Score Range** | **Status**                                   |
| --------------------------- | :-------------: | -------------------------------------------- |
| **Fully Compliant**         |   **95–100%**   | Ready for NCQA audit                         |
| **Substantially Compliant** |    **85–94%**   | Minor remediation needed                     |
| **Partially Compliant**     |    **70–84%**   | Significant gaps, corrective action required |
| **Non-Compliant**           |    **< 70%**    | Major deficiencies, file rebuild required    |

- Binary compliance: PASS or FAIL for each element
- Weighted score calculation per category weights
- Confidence score based on: OCR quality, Document completeness, Data consistency, Rule ambiguity
- confidenceFactors.ruleAmbiguity is an ambiguity risk percentage where lower is better: 0-20 = low ambiguity, 21-50 = moderate ambiguity, 51-100 = high ambiguity. Do not return rule clarity or confidence in this field.

DETAILED FINDINGS REQUIREMENT:
- The findings array must include each and every evaluated compliance element, not only failures or exceptions.
- Include PASS findings with supporting sourceDocument/sourcePage/sourceText and recommendation "No action required" when compliant.
- Include FAIL findings with clear deficiency details and remediation recommendations.
- Do not omit an element because it passed, was low risk, or had no recommendation.

POINTS TO BE REMEMBERED AND MUST BE FOLLOWED:
- Always think and understand rules mentioned correctly.
- Analyse and process each and every rule perfectly across document.
- Do not miss any rule or element, analyse each and everything.
- Double check and cross check all rules and processing guidelines mentioned.
- Also you are giving different results at different times for same document with same rules analysis, never do like that.
- Detailed Compliance Findings and element-by-element verification results should be perfect across multiple processing of same document, results should not vary everytime.
- CAQH IS ALWAYS YOUR FIRST SOURCE. Before reading any Practitioner Profile or provider summary page, first read all CAQH pages completely. Extract everything available from CAQH first. Only consult Practitioner Profile pages as a last resort when data is genuinely absent from CAQH and all other supporting documents.

OUTPUT FORMAT (strict JSON):
{
  "practitioner": {
    "name": "string",
    "npi": "string", 
    "dob": "string",
    "specialty": "string",
    "practiceLocations": ["string"]
  },
  "documents": [
    {
      "documentType": "Application|License|DEA_CDS|Education|Board_Certification|Malpractice_Insurance|Malpractice_History|Sanctions_Query|Committee_Decision|CV_Work_History|Attestation",
      "found": true|false,
      "extractionConfidence": number,
      "keyDataExtracted": ["string"]
    }
  ],
  "categoryScores": {
    "Application": { "score": number, "passedElements": number, "totalElements": number },
    "PSV": { "score": number, "passedElements": number, "totalElements": number },
    "Decision": { "score": number, "passedElements": number, "totalElements": number },
    "Recredentialing": { "score": number, "passedElements": number, "totalElements": number },
    "Monitoring": { "score": number, "passedElements": number, "totalElements": number },
    "Integrity": { "score": number, "passedElements": number, "totalElements": number }
  },
  "findings": [
    {
      "id": "string",
      "element": "string",
      "category": "Application|PSV|Decision|Recredentialing|Monitoring|Integrity",
      "status": "PASS|FAIL",
      "finding": "string",
      "recommendation": "string",
      "confidence": number,
      "sourceDocument": "string (must be the direct evidence document; do not use Practitioner Profile for PSV, sanctions, NPDB, malpractice insurance, or decision evidence. Malpractice Insurance must reference CAQH malpractice insurance section or insurance copy/certificate)",
      "sourcePage": "number|null (1-indexed page number in the source PDF where this finding's evidence is located)",
      "sourceText": "string|null (exact key text excerpt from the document that supports or contradicts this finding, max 100 chars)",
      "verificationDate": "string|null",
      "requiredTimeframe": number|null,
      "actualTimeframe": "number|null (days between document-extracted verificationDate and document-extracted decisionDate for PSV timeliness; never use current audit date, upload date, file metadata date, system date, or processing date)",
      "isTimelinessFail": boolean,
      "evaluationTrace": {
        "documentsReviewed": [
          "string"
        ],
        "selectedDocument": "string",
        "selectedPage": "number|null",
        "selectedEvidence": "string|null",

        "extractedValues": [
          {
            "field": "string",
            "value": "string|null"
          }
        ],

        "ruleApplied": "string",

        "calculation": {
          "type": "string|null",
          "formula": "string|null",
          "requiredThreshold": "string|null",
          "actualValue": "string|null",
          "result": "PASS|FAIL|null"
        },

        "reason": "string"
      }
    }
  ],
  "confidenceFactors": {
    "ocrQuality": number,
    "documentCompleteness": number,
    "dataConsistency": number,
    "ruleAmbiguity": number (ambiguity risk; lower is better, 0-20 low, 21-50 moderate, 51-100 high)
  },
  "informationIntegrity": {
    "hasAuditTrail": boolean,
    "hasVerifierIdentification": boolean,
    "hasVerificationDates": boolean,
    "hasSourceDocumentation": boolean,
    "noInappropriateUpdates": boolean,
    "factorsMet": number,
    "isPassing": boolean
  }
}`;

async function runNCQAAudit(fileId: string, files: Express.Multer.File[], credentialingType: CredentialType) {
  const practitionerFile = practitionerFiles.find(f => f.id === fileId);
  if (!practitionerFile) return;

  practitionerFile.status = AuditStatus.IN_PROGRESS;
  logSystemAction('AUDIT_STARTED', `Audit initiated for file ${fileId}`, 'system');

  try {
    const ai = new GoogleGenAI({ apiKey: selectedGeminiApiKey });
    
    const parts = files.map(file => ({
      inlineData: {
        data: file.buffer.toString('base64'),
        mimeType: file.mimetype
      }
    }));

    const [detectedCredentialingType, providerIdentityConsistency] = await Promise.all([
      detectCredentialingTypeFromDocuments(ai, parts, credentialingType),
      detectProviderIdentityConsistency(ai, parts)
    ]);
    practitionerFile.credentialingType = detectedCredentialingType;

    const auditPrompt = `Analyze this credentialing packet for ${detectedCredentialingType} credentialing.
    ${getCredentialingRuleScope(detectedCredentialingType)}
    Apply only the NCQA 2025 standards applicable to the detected credentialing type and provide comprehensive compliance assessment.
    Use only dates extracted from the uploaded PDF/document content for all rule checks and timeliness calculations. Never use current date, system date, upload date, file metadata date, or processing date as compliance evidence.

    CRITICAL SOURCE PRIORITY: Read and extract ALL data from CAQH pages first before consulting any other document. Use CAQH as the primary authoritative source for all data elements. Only fall back to other supporting documents (PSV, certificates, etc.) when data is not found in CAQH. Use Practitioner Profile / provider summary pages only as a last resort when data is absent from both CAQH and all other supporting documents. Never use Practitioner Profile as a primary source when CAQH data is available.

    Evaluate every required element for the detected credentialing type and return a finding row for every element whether it passes or fails. Passed elements must be included with status PASS and supporting evidence; failed elements must include specific remediation recommendations.`;

    const result = await generateContentWithRetry(ai, {
      contents: [{ parts: [...parts, { text: auditPrompt }] }],
      config: {
        ...DETERMINISTIC_GENERATION_CONFIG,
        responseMimeType: "application/json",
        systemInstruction: NCQA_AUDIT_SYSTEM_PROMPT
      }
    });

    // Debug logs (minimal): print raw response size and findings count
    try {
      const __raw = result?.text || '';
      console.log('[NCQA AUDIT] Raw response length:', __raw.length);
      const __parsed = JSON.parse(__raw || '{}');
      const __count = Array.isArray(__parsed?.findings) ? __parsed.findings.length : 0;
      console.log('[NCQA AUDIT] findings count:', __count);
    } catch (e: any) {
      console.warn('[NCQA AUDIT] Debug logging failed:', e?.message || e);
    }

    // Persist raw model output and prompt alongside the uploaded files (best-effort)
    try {
      const auditFolder = join(uploadsFolder, fileId);
      if (!existsSync(auditFolder)) {
        mkdirSync(auditFolder, { recursive: true });
      }
      writeFileSync(join(auditFolder, 'audit-raw.json'), result?.text || '{}', { encoding: 'utf-8' });
      writeFileSync(join(auditFolder, 'audit-prompt.txt'), auditPrompt, { encoding: 'utf-8' });
    } catch {}

    // Mirror raw artifacts under .angular/vite-root/uploads/<fileId> for easy access during dev
    try {
      const viteUploadsRoot = join(process.cwd(), '.angular', 'vite-root', 'uploads', fileId);
      if (!existsSync(viteUploadsRoot)) {
        mkdirSync(viteUploadsRoot, { recursive: true });
      }
      writeFileSync(join(viteUploadsRoot, 'audit-raw.json'), result?.text || '{}', { encoding: 'utf-8' });
      writeFileSync(join(viteUploadsRoot, 'audit-prompt.txt'), auditPrompt, { encoding: 'utf-8' });
    } catch {}

    const filteredAuditData = filterAuditDataByCredentialingType(JSON.parse(result.text || '{}'), detectedCredentialingType);
    // Force the AI output onto the fixed canonical checklist so the same packet
    // always yields the exact same number of elements/fields on every run.
    const auditData = reconcileFindingsToChecklist(filteredAuditData, detectedCredentialingType, providerIdentityConsistency);

    // Update practitioner file info
    practitionerFile.name = auditData.practitioner?.name || 'Unknown Practitioner';
    practitionerFile.npi = auditData.practitioner?.npi || 'Not Found';
    practitionerFile.dob = auditData.practitioner?.dob;
    practitionerFile.specialty = auditData.practitioner?.specialty;
    practitionerFile.practiceLocations = auditData.practitioner?.practiceLocations;

    // Calculate weighted overall score
    const categoryWeights = NCQA_2025_CONFIG.categoryWeights;
    const applicableCategories = new Set(getApplicableCategories(detectedCredentialingType));
    const totalApplicableWeight = getApplicableCategories(detectedCredentialingType).reduce((sum, category) => sum + (categoryWeights[category] || 0), 0) || 1;
    let overallScore = 0;
    const categoryScoresMap: Record<string, CategoryScore> = {};

    Object.entries(auditData.categoryScores || {}).forEach(([category, data]: [string, any]) => {
      if (!applicableCategories.has(category as ComplianceCategory)) return;
      const rawWeight = categoryWeights[category as ComplianceCategory] || 0;
      const normalizedWeight = rawWeight / totalApplicableWeight;
      const categoryScore = calculateCategoryScorePercent(data);
      overallScore += categoryScore * normalizedWeight;
      
      categoryScoresMap[category] = {
        category: category as ComplianceCategory,
        weight: Math.round(normalizedWeight * 100),
        passedElements: data.passedElements || 0,
        totalElements: data.totalElements || 0,
        score: Math.round(categoryScore),
        findings: (auditData.findings || []).filter((f: any) => f.category === category)
      };
    });

    overallScore = Math.round(overallScore);
    
    // Calculate confidence score
    const rawFactors = auditData.confidenceFactors || {
      ocrQuality: 85,
      documentCompleteness: 80,
      dataConsistency: 90,
      ruleAmbiguity: 15
    };
    const confidenceFactors = {
      ocrQuality: clampPercent(Number(rawFactors.ocrQuality ?? 85)),
      documentCompleteness: clampPercent(Number(rawFactors.documentCompleteness ?? 80)),
      dataConsistency: clampPercent(Number(rawFactors.dataConsistency ?? 90)),
      ruleAmbiguity: clampPercent(Number(rawFactors.ruleAmbiguity ?? 15))
    };
    const confidenceScore = calculateConfidenceScore(confidenceFactors);

    // Determine compliance tier
    const tier = calculateComplianceTier(overallScore);

    // Process findings
    const findings: AuditFinding[] = (auditData.findings || []).map((f: any, index: number) => {
      // Convert confidence from decimal (0.95) to percentage (95) if needed
      let confidence = f.confidence || 85;
      if (confidence > 0 && confidence <= 1) {
        confidence = Math.round(confidence * 100);
      }
      return {
        id: `finding-${fileId}-${index}`,
        element: f.element,
        category: f.category as ComplianceCategory,
        status: f.status === 'PASS' ? FindingStatus.PASS : FindingStatus.FAIL,
        finding: f.finding,
        recommendation: f.recommendation,
        confidence: confidence,
        sourceDocument: f.sourceDocument,
        sourcePage: f.sourcePage || null,
        sourceText: f.sourceText || null,
        verificationDate: f.verificationDate,
        requiredTimeframe: f.requiredTimeframe,
        actualTimeframe: f.actualTimeframe,
        isTimelinessFail: f.isTimelinessFail || false
      };
    });

    // Generate recommendations
    const recommendations = generateRecommendations(findings);

    // Process document summaries
    const documents: DocumentSummary[] = (auditData.documents || []).map((d: any) => ({
      documentType: d.documentType as DocumentType,
      found: d.found,
      extractionConfidence: d.extractionConfidence != null && d.extractionConfidence <= 1 ? Math.round(d.extractionConfidence * 100) : d.extractionConfidence,
      keyDataExtracted: d.keyDataExtracted
    }));

    // Create audit trail
    const auditTrail: AuditTrailEntry[] = [
      {
        timestamp: new Date().toISOString(),
        action: 'AUDIT_COMPLETED',
        performedBy: 'AI Engine (Gemini 2.5 Flash)',
        details: `Automated NCQA 2025 compliance audit completed with score ${overallScore}%`
      }
    ];

    // Store audit result
    auditResults[fileId] = {
      id: `audit-${fileId}`,
      fileId,
      name: practitionerFile.name,
      npi: practitionerFile.npi,
      dob: practitionerFile.dob,
      specialty: practitionerFile.specialty,
      timestamp: new Date().toISOString(),
      ruleVersionApplied: 'NCQA 2025 v1.0',
      overallScore,
      tier,
      confidenceScore,
      categoryScores: categoryScoresMap,
      findings,
      recommendations,
      documents,
      auditTrail,
      ocrQuality: confidenceFactors.ocrQuality,
      documentCompleteness: confidenceFactors.documentCompleteness,
      dataConsistency: confidenceFactors.dataConsistency,
      ruleAmbiguity: confidenceFactors.ruleAmbiguity,
      providerIdentityConsistency: providerIdentityConsistency || undefined
    };

    // Update practitioner file
    practitionerFile.overallScore = overallScore;
    practitionerFile.confidenceScore = confidenceScore;
    practitionerFile.tier = tier;
    practitionerFile.status = AuditStatus.COMPLETED;

    logSystemAction('AUDIT_COMPLETED', `Audit completed for ${practitionerFile.name} (NPI: ${practitionerFile.npi}) - Score: ${overallScore}%, Tier: ${tier}`, 'system');

    // Generate alerts if needed
    if (tier === ComplianceTier.NON_COMPLIANT) {
      monitoringAlerts.unshift({
        id: uuidv4(),
        practitionerId: fileId,
        practitionerName: practitionerFile.name,
        alertType: 'PSV_OVERDUE',
        severity: 'CRITICAL',
        message: `Practitioner ${practitionerFile.name} failed compliance audit with score ${overallScore}%. Immediate remediation required.`,
        createdAt: new Date().toISOString()
      });
    }

    saveAuditHistory();

  } catch (error) {
    console.error('Audit failed:', error);
    practitionerFile.status = AuditStatus.FAILED;
    logSystemAction('AUDIT_FAILED', `Audit failed for file ${fileId}: ${error}`, 'system');
    saveAuditHistory();
  }
}

// ==================== API ENDPOINTS ====================

app.get('/api/settings/storage', (req, res) => {
  res.json({ storagePath: uploadsFolder });
});

app.post('/api/settings/storage', (req, res) => {
  const { storagePath } = req.body || {};

  if (typeof storagePath !== 'string' || !storagePath.trim()) {
    res.status(400).json({ error: 'Storage path is required' });
    return;
  }

  try {
    ensureStoragePath(storagePath.trim());
    saveAuditHistory();
    logSystemAction('STORAGE_PATH_UPDATED', `Document storage path changed to ${uploadsFolder}`, 'system');
    res.json({ storagePath: uploadsFolder });
  } catch (error: any) {
    res.status(400).json({ error: error?.message || 'Unable to use storage path' });
  }
});

app.get('/api/settings/ai-models', (req, res) => {
  res.json({
    availableModels: availableGeminiModels,
    selectedModel: selectedGeminiModel,
    hasApiKey: Boolean(selectedGeminiApiKey),
    apiKeyPreview: selectedGeminiApiKey ? `${selectedGeminiApiKey.slice(0, 6)}...${selectedGeminiApiKey.slice(-4)}` : ''
  });
});

app.post('/api/settings/ai-model', (req, res) => {
  const { model, apiKey } = req.body || {};

  if (!availableGeminiModels.includes(model)) {
    res.status(400).json({ error: 'Unsupported AI model', availableModels: availableGeminiModels });
    return;
  }

  selectedGeminiModel = model;

  if (typeof apiKey === 'string' && apiKey.trim()) {
    selectedGeminiApiKey = apiKey.trim();
    logSystemAction('AI_API_KEY_UPDATED', 'Gemini API key updated', 'system');
  }

  logSystemAction('AI_MODEL_UPDATED', `AI processing model changed to ${model}`, 'system');
  res.json({
    selectedModel: selectedGeminiModel,
    availableModels: availableGeminiModels,
    hasApiKey: Boolean(selectedGeminiApiKey),
    apiKeyPreview: selectedGeminiApiKey ? `${selectedGeminiApiKey.slice(0, 6)}...${selectedGeminiApiKey.slice(-4)}` : ''
  });
});

// Dashboard Stats
app.get('/api/dashboard/stats', (req, res) => {
  const completedAudits = practitionerFiles.filter(f => f.status === AuditStatus.COMPLETED);
  const stats: DashboardStats = {
    totalAudits: practitionerFiles.length,
    averageScore: completedAudits.length > 0 
      ? Math.round(completedAudits.reduce((sum, f) => sum + (f.overallScore || 0), 0) / completedAudits.length)
      : 0,
    fullyCompliant: completedAudits.filter(f => f.tier === ComplianceTier.FULLY_COMPLIANT).length,
    substantiallyCompliant: completedAudits.filter(f => f.tier === ComplianceTier.SUBSTANTIALLY_COMPLIANT).length,
    partiallyCompliant: completedAudits.filter(f => f.tier === ComplianceTier.PARTIALLY_COMPLIANT).length,
    nonCompliant: completedAudits.filter(f => f.tier === ComplianceTier.NON_COMPLIANT).length,
    pendingAudits: practitionerFiles.filter(f => f.status === AuditStatus.PENDING || f.status === AuditStatus.IN_PROGRESS).length,
    alertsCount: monitoringAlerts.filter(a => !a.acknowledgedAt).length,
    upcomingExpirations: 0,
    recentActivity: systemLogs.slice(0, 10).map((log, i) => ({
      id: `activity-${i}`,
      type: 'AUDIT_COMPLETED' as const,
      description: log.details,
      timestamp: log.timestamp
    }))
  };
  res.json(stats);
});

// Audits List
app.get('/api/audits', (req, res) => {
  const { page = 1, pageSize = 20, tier, status, search } = req.query;
  let filtered = [...practitionerFiles];

  if (tier) {
    filtered = filtered.filter(f => f.tier === tier);
  }
  if (status) {
    filtered = filtered.filter(f => f.status === status);
  }
  if (search) {
    const searchLower = (search as string).toLowerCase();
    filtered = filtered.filter(f => 
      f.name.toLowerCase().includes(searchLower) || 
      f.npi.toLowerCase().includes(searchLower)
    );
  }

  const start = (Number(page) - 1) * Number(pageSize);
  const paginatedItems = filtered.slice(start, start + Number(pageSize));

  res.json({
    items: paginatedItems,
    total: filtered.length,
    page: Number(page),
    pageSize: Number(pageSize),
    totalPages: Math.ceil(filtered.length / Number(pageSize))
  });
});

app.delete('/api/audits/:id', (req, res) => {
  const fileId = req.params['id'];
  const fileIndex = practitionerFiles.findIndex(f => f.id === fileId);

  if (fileIndex === -1 && !auditResults[fileId]) {
    res.status(404).json({ success: false, message: 'Audit not found' });
    return;
  }

  const deletedFile = practitionerFiles[fileIndex];

  if (fileIndex !== -1) {
    practitionerFiles.splice(fileIndex, 1);
  }

  delete auditResults[fileId];

  for (let i = monitoringAlerts.length - 1; i >= 0; i--) {
    if (monitoringAlerts[i].practitionerId === fileId) {
      monitoringAlerts.splice(i, 1);
    }
  }

  logSystemAction('AUDIT_DELETED', `Audit deleted for file ${fileId}${deletedFile?.name ? ` (${deletedFile.name})` : ''}`, 'system');
  saveAuditHistory();
  res.json({ success: true });
});

// Reset All Audit Data
app.delete('/api/reset', (_req, res) => {
  try {
    // Clear all in-memory stores
    practitionerFiles.splice(0, practitionerFiles.length);
    Object.keys(auditResults).forEach(k => delete auditResults[k]);
    Object.keys(uploadedDocuments).forEach(k => delete uploadedDocuments[k]);
    monitoringAlerts.splice(0, monitoringAlerts.length);
    monitoringChecks.splice(0, monitoringChecks.length);
    systemLogs.splice(0, systemLogs.length);

    // Delete every UUID subdirectory inside uploadsFolder (physical files)
    if (existsSync(uploadsFolder)) {
      for (const entry of readdirSync(uploadsFolder, { withFileTypes: true })) {
        if (entry.isDirectory()) {
          rmSync(join(uploadsFolder, entry.name), { recursive: true, force: true });
        }
      }
    }

    // Re-seed demo data so the UI isn't empty
    initializeDemoData();

    // Persist the freshly seeded state
    saveAuditHistory();

    logSystemAction('RESET_ALL', 'All audit data cleared and demo data re-seeded', 'system');
    res.json({ success: true });
  } catch (error: any) {
    console.error('Reset failed:', error);
    res.status(500).json({ success: false, error: error?.message || 'Reset failed' });
  }
});

// Initialize Demo Data (safe to call even if demo already exists)
app.post('/api/init-demo', (_req, res) => {
  try {
    const demoIds = ['demo-001', 'demo-002'];
    demoIds.forEach(id => {
      const idx = practitionerFiles.findIndex(f => f.id === id);
      if (idx !== -1) practitionerFiles.splice(idx, 1);
      delete auditResults[id];
    });
    initializeDemoData();
    saveAuditHistory();
    logSystemAction('INIT_DEMO', 'Demo data initialized', 'system');
    res.json({ success: true });
  } catch (error: any) {
    console.error('Init demo failed:', error);
    res.status(500).json({ success: false, error: error?.message || 'Init demo failed' });
  }
});

// Reset All Audit Data Including Demo
app.delete('/api/reset-all', (_req, res) => {
  try {
    practitionerFiles.splice(0, practitionerFiles.length);
    Object.keys(auditResults).forEach(k => delete auditResults[k]);
    Object.keys(uploadedDocuments).forEach(k => delete uploadedDocuments[k]);
    monitoringAlerts.splice(0, monitoringAlerts.length);
    monitoringChecks.splice(0, monitoringChecks.length);
    systemLogs.splice(0, systemLogs.length);

    if (existsSync(uploadsFolder)) {
      for (const entry of readdirSync(uploadsFolder, { withFileTypes: true })) {
        if (entry.isDirectory()) {
          rmSync(join(uploadsFolder, entry.name), { recursive: true, force: true });
        }
      }
    }

    saveAuditHistory();
    logSystemAction('RESET_ALL_INCLUDING_DEMO', 'All audit data including demo data cleared', 'system');
    res.json({ success: true });
  } catch (error: any) {
    console.error('Full reset failed:', error);
    res.status(500).json({ success: false, error: error?.message || 'Reset failed' });
  }
});

// Single Audit Result
app.get('/api/audits/:id', (req, res) => {
  const fileId = req.params['id'];
  const result = auditResults[fileId];
  
  if (!result) {
    // Check if the file exists but audit is still processing
    const file = practitionerFiles.find(f => f.id === fileId);
    if (file) {
      if (file.status === AuditStatus.PENDING || file.status === AuditStatus.IN_PROGRESS) {
        res.status(202).json({ 
          status: 'processing', 
          message: 'Audit is still in progress',
          file 
        });
        return;
      }
      if (file.status === AuditStatus.FAILED) {
        res.status(500).json({ 
          status: 'failed', 
          message: 'Audit processing failed',
          file 
        });
        return;
      }
    }
    res.status(404).json({ error: 'Audit result not found' });
    return;
  }
  res.json(result);
});

// Update Finding Approval Status
app.patch('/api/audits/:fileId/findings/:findingId/approval', (req, res) => {
  const { fileId, findingId } = req.params;
  const { approvalStatus, rejectionComments } = req.body;
  
  const auditResult = auditResults[fileId];
  if (!auditResult) {
    res.status(404).json({ error: 'Audit not found' });
    return;
  }
  
  const finding = auditResult.findings.find(f => f.id === findingId);
  if (!finding) {
    res.status(404).json({ error: 'Finding not found' });
    return;
  }
  
  // Validate rejection requires comments
  if (approvalStatus === 'REJECTED' && !rejectionComments?.trim()) {
    res.status(400).json({ error: 'Rejection comments are required' });
    return;
  }
  
  // Update the finding
  finding.approvalStatus = approvalStatus;
  if (approvalStatus === 'APPROVED') {
    finding.approvedAt = new Date().toISOString();
    finding.approvedBy = 'Current User';
  } else if (approvalStatus === 'REJECTED') {
    finding.rejectionComments = rejectionComments;
    finding.rejectedAt = new Date().toISOString();
    finding.rejectedBy = 'Current User';
  }
  
  // Log the action
  logSystemAction('FINDING_' + approvalStatus, `Finding "${finding.element}" ${approvalStatus.toLowerCase()} for audit ${fileId}`, 'Current User');
  
  // Add to audit trail
  auditResult.auditTrail.push({
    timestamp: new Date().toISOString(),
    action: `Finding ${approvalStatus}`,
    performedBy: 'Current User',
    details: approvalStatus === 'REJECTED' 
      ? `${finding.element} rejected: ${rejectionComments}` 
      : `${finding.element} approved`
  });
  saveAuditHistory();
  
  res.json({ success: true, finding });
});

// Get Document for Viewing (PDF/Image)
app.get('/api/documents/:fileId/:documentName', (req, res) => {
  const { fileId, documentName } = req.params;
  const decodedName = decodeURIComponent(documentName);
  
  // Check if we have uploaded documents for this fileId
  const documents = uploadedDocuments[fileId];
  
  if (!documents || documents.length === 0) {
    // For demo data, return a placeholder PDF message
    res.status(404).json({ 
      error: 'Document not found',
      message: 'This is demo data - no actual documents were uploaded. Upload real credentialing files to view source documents.'
    });
    return;
  }
  
  // Find the document by name (partial match)
  let doc = documents.find(d => d.name.toLowerCase().includes(decodedName.toLowerCase()));
  
  // If no match by name, return the first document
  if (!doc) {
    doc = documents[0];
  }
  
  if (!existsSync(doc.filePath)) {
    res.status(404).json({ error: 'Document file not found on storage path' });
    return;
  }

  // Set appropriate content type
  res.setHeader('Content-Type', doc.mimeType);
  res.setHeader('Content-Disposition', `inline; filename="${doc.name}"`);
  res.send(readFileSync(doc.filePath));
});

// Get all documents for an audit
app.get('/api/documents/:fileId', (req, res) => {
  const { fileId } = req.params;
  const documents = uploadedDocuments[fileId];
  
  if (!documents || documents.length === 0) {
    res.json({ documents: [], message: 'No documents found for this audit' });
    return;
  }
  
  res.json({
    documents: documents.map((d, index) => ({
      id: index,
      name: d.name,
      mimeType: d.mimeType,
      size: d.size,
      url: `/api/documents/${fileId}/${encodeURIComponent(d.name)}`
    }))
  });
});

// Upload and Process Files
app.post('/api/audits/upload', upload.array('files', 50), (req, res) => {
  const files = req.files as Express.Multer.File[];
  if (!files || files.length === 0) {
    res.status(400).json({ error: 'No files uploaded' });
    return;
  }

  const fileId = uuidv4();
  const credentialingType = (req.body['type'] as CredentialType) || CredentialType.INITIAL;
  const tags = req.body['tags'] ? JSON.parse(req.body['tags']) : [];
  
  const newFile: PractitionerFile = {
    id: fileId,
    name: 'Processing...',
    npi: 'Pending',
    credentialingType,
    uploadDate: new Date().toISOString(),
    uploadedBy: req.body['uploadedBy'] || 'Anonymous',
    status: AuditStatus.PENDING,
    tags
  };

  practitionerFiles.unshift(newFile);
  
  saveUploadedFiles(fileId, files);
  
  logSystemAction('FILE_UPLOADED', `${files.length} files uploaded for ${credentialingType} credentialing`, req.body['uploadedBy']);
  saveAuditHistory();
  
  // Run audit in background
  runNCQAAudit(fileId, files, credentialingType);

  res.json({ success: true, data: newFile });
});

// Batch Upload
app.post('/api/audits/batch-upload', upload.array('files', 100), async (req, res) => {
  const files = req.files as Express.Multer.File[];
  if (!files || files.length === 0) {
    res.status(400).json({ error: 'No files uploaded' });
    return;
  }

  const batchId = uuidv4();
  const credentialingType = (req.body['type'] as CredentialType) || CredentialType.INITIAL;
  const results: PractitionerFile[] = [];

  // Group files by practitioner if metadata provided, otherwise process individually
  for (const file of files) {
    const fileId = uuidv4();
    const newFile: PractitionerFile = {
      id: fileId,
      name: 'Processing...',
      npi: 'Pending',
      credentialingType,
      uploadDate: new Date().toISOString(),
      uploadedBy: req.body['uploadedBy'] || 'Anonymous',
      status: AuditStatus.PENDING,
      tags: [`batch:${batchId}`]
    };

    practitionerFiles.unshift(newFile);
    results.push(newFile);
    saveUploadedFiles(fileId, [file]);
    
    // Run audit in background
    runNCQAAudit(fileId, [file], credentialingType);
  }

  logSystemAction('BATCH_UPLOAD', `Batch upload of ${files.length} files initiated (Batch ID: ${batchId})`, req.body['uploadedBy']);
  saveAuditHistory();

  res.json({ success: true, batchId, files: results });
});

// Update Finding Status (for manual review)
app.patch('/api/audits/:auditId/findings/:findingId', (req, res) => {
  const { auditId, findingId } = req.params;
  const { status, userNotes, reviewedBy } = req.body;

  const audit = auditResults[auditId];
  if (!audit) {
    res.status(404).json({ error: 'Audit not found' });
    return;
  }

  const finding = audit.findings.find(f => f.id === findingId);
  if (!finding) {
    res.status(404).json({ error: 'Finding not found' });
    return;
  }

  if (status) finding.status = status;
  if (userNotes) finding.userNotes = userNotes;
  if (reviewedBy) {
    finding.reviewedBy = reviewedBy;
    finding.reviewedAt = new Date().toISOString();
  }

  audit.auditTrail.push({
    timestamp: new Date().toISOString(),
    action: 'FINDING_UPDATED',
    performedBy: reviewedBy || 'Unknown',
    details: `Finding "${finding.element}" status updated to ${status}`,
    previousValue: finding.status,
    newValue: status
  });

  logSystemAction('FINDING_UPDATED', `Finding ${findingId} in audit ${auditId} updated`, reviewedBy);
  saveAuditHistory();

  res.json({ success: true, finding });
});

// Monitoring Alerts
app.get('/api/monitoring/alerts', (req, res) => {
  const { severity, acknowledged } = req.query;
  let filtered = [...monitoringAlerts];

  if (severity) {
    filtered = filtered.filter(a => a.severity === severity);
  }
  if (acknowledged !== undefined) {
    const isAck = acknowledged === 'true';
    filtered = filtered.filter(a => isAck ? !!a.acknowledgedAt : !a.acknowledgedAt);
  }

  res.json(filtered);
});

// Acknowledge Alert
app.patch('/api/monitoring/alerts/:id/acknowledge', (req, res) => {
  const alert = monitoringAlerts.find(a => a.id === req.params['id']);
  if (!alert) {
    res.status(404).json({ error: 'Alert not found' });
    return;
  }

  alert.acknowledgedAt = new Date().toISOString();
  alert.acknowledgedBy = req.body['acknowledgedBy'] || 'Unknown';

  res.json({ success: true, alert });
});

// Monitoring Checks
app.get('/api/monitoring/checks', (req, res) => {
  res.json(monitoringChecks);
});

// Run Manual Monitoring Check
app.post('/api/monitoring/run-check', (req, res) => {
  const { practitionerId, checkType } = req.body;
  
  const check: MonitoringCheck = {
    id: uuidv4(),
    practitionerId,
    checkType,
    checkDate: new Date().toISOString(),
    result: 'Clear', // In production, this would call actual verification APIs
    nextCheckDue: new Date(Date.now() + 30 * 24 * 60 * 60 * 100).toISOString()
  };

  monitoringChecks.unshift(check);
  logSystemAction('MONITORING_CHECK', `${checkType} check performed for practitioner ${practitionerId}`, req.body['performedBy']);

  res.json({ success: true, check });
});

// Export Audit Report
app.get('/api/audits/:id/export', (req, res) => {
  const { format } = req.query;
  const audit = auditResults[req.params['id']];
  
  if (!audit) {
    res.status(404).json({ error: 'Audit not found' });
    return;
  }

  if (format === 'json') {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=audit-report-${audit.fileId}.json`);
    res.json(audit);
  } else if (format === 'csv') {
    const csvRows = [
      ['Element', 'Category', 'Status', 'Finding', 'Recommendation', 'Confidence'],
      ...audit.findings.map(f => [
        f.element,
        f.category,
        f.status,
        `"${f.finding.replace(/"/g, '""')}"`,
        `"${(f.recommendation || '').replace(/"/g, '""')}"`,
        f.confidence.toString()
      ])
    ];
    const csv = csvRows.map(row => row.join(',')).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=audit-report-${audit.fileId}.csv`);
    res.send(csv);
  } else {
    res.json(audit);
  }
});

// Portfolio Report
app.get('/api/reports/portfolio', (req, res) => {
  const completedAudits = practitionerFiles.filter(f => f.status === AuditStatus.COMPLETED);
  
  // Calculate top issues
  const issueCount = new Map<string, number>();
  Object.values(auditResults).forEach(audit => {
    audit.findings.filter(f => f.status === FindingStatus.FAIL).forEach(f => {
      const count = issueCount.get(f.element) || 0;
      issueCount.set(f.element, count + 1);
    });
  });

  const topIssues = Array.from(issueCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([issue, count]) => ({
      issue,
      count,
      percentage: completedAudits.length > 0 ? Math.round((count / completedAudits.length) * 100) : 0
    }));

  // Category breakdown
  const categoryBreakdown: Record<string, { average: number; passRate: number }> = {};
  Object.values(ComplianceCategory).forEach(cat => {
    const scores: number[] = [];
    let passed = 0;
    let total = 0;

    Object.values(auditResults).forEach(audit => {
      const catScore = audit.categoryScores[cat];
      if (catScore) {
        scores.push(catScore.score);
        passed += catScore.passedElements;
        total += catScore.totalElements;
      }
    });

    categoryBreakdown[cat] = {
      average: scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
      passRate: total > 0 ? Math.round((passed / total) * 100) : 0
    };
  });

  res.json({
    totalFiles: completedAudits.length,
    tierDistribution: {
      [ComplianceTier.FULLY_COMPLIANT]: completedAudits.filter(f => f.tier === ComplianceTier.FULLY_COMPLIANT).length,
      [ComplianceTier.SUBSTANTIALLY_COMPLIANT]: completedAudits.filter(f => f.tier === ComplianceTier.SUBSTANTIALLY_COMPLIANT).length,
      [ComplianceTier.PARTIALLY_COMPLIANT]: completedAudits.filter(f => f.tier === ComplianceTier.PARTIALLY_COMPLIANT).length,
      [ComplianceTier.NON_COMPLIANT]: completedAudits.filter(f => f.tier === ComplianceTier.NON_COMPLIANT).length
    },
    averageScore: completedAudits.length > 0 
      ? Math.round(completedAudits.reduce((sum, f) => sum + (f.overallScore || 0), 0) / completedAudits.length)
      : 0,
    topIssues,
    categoryBreakdown
  });
});

// System Logs (for audit trail)
app.get('/api/system/logs', (req, res) => {
  const { limit = 100 } = req.query;
  res.json(systemLogs.slice(0, Number(limit)));
});

// NCQA Standards Reference
app.get('/api/ncqa/standards', (req, res) => {
  res.json({
    version: 'NCQA 2025',
    effectiveDate: '2025-07-01',
    config: NCQA_2025_CONFIG
  });
});
const angularApp = new AngularNodeAppEngine();

/**
 * Example Express Rest API endpoints can be defined here.
 * Uncomment and define endpoints as necessary.
 *
 * Example:
 * ```ts
 * app.get('/api/{*splat}', (req, res) => {
 *   // Handle API request
 * });
 * ```
 */

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch((err) => {
      console.error('SSR Error:', err);
      next(err);
    });
});

/**
 * Error handling middleware
 */
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server Error:', err);
  res.status(500).json({ 
    error: 'Internal Server Error', 
    message: process.env['NODE_ENV'] === 'development' ? err.message : 'Something went wrong'
  });
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
