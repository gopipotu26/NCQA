// ==================== ENUMS ====================

export enum CredentialType {
  INITIAL = 'Initial',
  RECREDENTIALING = 'Recredentialing',
  AD_HOC = 'Ad Hoc'
}

export enum AuditStatus {
  PENDING = 'Pending',
  IN_PROGRESS = 'In Progress',
  COMPLETED = 'Completed',
  FAILED = 'Failed'
}

export enum ComplianceTier {
  FULLY_COMPLIANT = 'Fully Compliant',
  SUBSTANTIALLY_COMPLIANT = 'Substantially Compliant',
  PARTIALLY_COMPLIANT = 'Partially Compliant',
  NON_COMPLIANT = 'Non-Compliant'
}

export enum DocumentType {
  APPLICATION = 'Application',
  ATTESTATION = 'Attestation',
  LICENSE = 'License',
  DEA_CDS = 'DEA/CDS',
  EDUCATION = 'Education',
  BOARD_CERTIFICATION = 'Board Certification',
  MALPRACTICE_INSURANCE = 'Malpractice Insurance',
  MALPRACTICE_HISTORY = 'Malpractice History',
  SANCTIONS_QUERY = 'Sanctions Query',
  COMMITTEE_DECISION = 'Committee Decision',
 
  CV_WORK_HISTORY = 'CV/Work History',
  OTHER = 'Other'
}

export enum VerificationSource {
  STATE_LICENSING_BOARD = 'State Licensing Board',
  DEA_DATABASE = 'DEA Database',
  NPDB = 'NPDB',
  OIG_LEIE = 'OIG LEIE',
  SAM_GOV = 'SAM.gov',
  STATE_MEDICAID = 'State Medicaid',
  ABMS = 'ABMS',
  AOA = 'AOA',
  SCHOOL_DIRECT = 'School Direct',
  INSURER_DIRECT = 'Insurer Direct',
  EMPLOYER_DIRECT = 'Employer Direct',
  OTHER = 'Other'
}

export enum ComplianceCategory {
  APPLICATION = 'Application',
  PSV = 'PSV',
  DECISION = 'Decision',
  RECREDENTIALING = 'Recredentialing',
  MONITORING = 'Monitoring',
  INTEGRITY = 'Integrity'
}

export enum UserRole {
  CREDENTIALING_SPECIALIST = 'Credentialing Specialist',
  CREDENTIALING_MANAGER = 'Credentialing Manager',
  COMPLIANCE_OFFICER = 'Compliance Officer',
  SYSTEM_ADMINISTRATOR = 'System Administrator'
}

export enum FindingStatus {
  PASS = 'PASS',
  FAIL = 'FAIL',
  PENDING = 'PENDING',
  UNDER_REVIEW = 'UNDER_REVIEW',
  RESOLVED = 'RESOLVED'
}

// ==================== CORE INTERFACES ====================

export interface PractitionerFile {
  id: string;
  name: string;
  npi: string;
  dob?: string;
  specialty?: string;
  practiceLocations?: string[];
  credentialingType: CredentialType;
  uploadDate: string;
  uploadedBy?: string;
  status: AuditStatus;
  overallScore?: number;
  tier?: ComplianceTier;
  confidenceScore?: number;
  documents?: Document[];
  previousCredentialingDate?: string;
  tags?: string[];
}

export interface Document {
  id: string;
  fileId: string;
  documentType: DocumentType;
  fileName: string;
  filePath: string;
  uploadTimestamp: string;
  ocrStatus: 'Pending' | 'Complete' | 'Failed';
  ocrConfidence?: number;
  extractedText?: string;
  extractedData?: ExtractedDocumentData;
  pageCount?: number;
  fileSize?: number;
  mimeType?: string;
}

export interface ExtractedDocumentData {
  // Application data
  practitionerName?: string;
  dob?: string;
  npi?: string;
  specialty?: string;
  practiceLocations?: string[];
  signatureDate?: string;
  
  // License data
  licenseNumber?: string;
  licenseState?: string;
  licenseIssueDate?: string;
  licenseExpirationDate?: string;
  licenseStatus?: string;
  
  // DEA/CDS data
  deaNumber?: string;
  deaExpirationDate?: string;
  deaRegistrationStatus?: string;
  cdsNumber?: string;
  cdsExpirationDate?: string;
  
  // Education data
  institution?: string;
  degree?: string;
  graduationDate?: string;
  
  // Board Certification data
  boardName?: string;
  certificationDate?: string;
  certificationExpirationDate?: string;
  
  // Malpractice Insurance data
  policyNumber?: string;
  coverageLimits?: string;
  effectiveDate?: string;
  expirationDate?: string;
  insurerName?: string;
  
  // Sanctions Query data
  queryDate?: string;
  querySource?: string;
  queryResult?: 'Clear' | 'Match Found' | 'Pending';
  
  // Committee Decision data
  decisionDate?: string;
  approvalStatus?: 'Approved' | 'Denied' | 'Restricted' | 'Pending';
  reviewerName?: string;
  rationale?: string;
  
  // Work History data
  workHistoryYears?: number;
  gapsIdentified?: WorkHistoryGap[];
  
  // Attestation data
  attestationDate?: string;
  sanctionsDisclosure?: boolean;
  malpracticeDisclosure?: boolean;
  healthStatusDisclosure?: boolean;
  substanceAbuseDisclosure?: boolean;
  privilegeLossDisclosure?: boolean;
  raceEthnicityCollected?: boolean;
  languageCollected?: boolean;
  nonDiscriminationLanguagePresent?: boolean;
}

export interface WorkHistoryGap {
  startDate: string;
  endDate: string;
  durationMonths: number;
  explanation?: string;
}

export interface CredentialElement {
  id: string;
  fileId: string;
  elementType: DocumentType;
  extractedValue?: string;
  verificationSource?: VerificationSource;
  verificationDate?: string;
  verificationMethod?: string;
  verifierName?: string;
  verifierInitials?: string;
  expirationDate?: string;
  complianceStatus: FindingStatus;
  confidenceScore: number;
  notes?: string;
}

// ==================== AUDIT INTERFACES ====================

export enum ApprovalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

export interface AuditFinding {
  id: string;
  element: string;
  category: ComplianceCategory;
  status: FindingStatus;
  finding: string;
  recommendation?: string;
  confidence: number;
  sourceDocument?: string;
  sourcePage?: number;
  sourceText?: string;
  verificationDate?: string;
  requiredTimeframe?: number;
  actualTimeframe?: number;
  isTimelinessFail?: boolean;
  userNotes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  approvalStatus?: ApprovalStatus;
  rejectionComments?: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
}

export interface CategoryScore {
  category: ComplianceCategory;
  weight: number;
  passedElements: number;
  totalElements: number;
  score: number;
  findings: AuditFinding[];
}

export interface AuditResult {
  id: string;
  fileId: string;
  name: string;
  npi: string;
  dob?: string;
  specialty?: string;
  credentialingType?: CredentialType;
  timestamp: string;
  ruleVersionApplied: string;
  overallScore: number;
  tier: ComplianceTier;
  confidenceScore: number;
  categoryScores: Record<string, CategoryScore>;
  findings: AuditFinding[];
  recommendations: string[];
  documents: DocumentSummary[];
  auditTrail: AuditTrailEntry[];
  
  // Confidence factors
  ocrQuality: number;
  documentCompleteness: number;
  dataConsistency: number;
  ruleAmbiguity: number;

  // Provider identity consistency validation
  providerIdentityConsistency?: ProviderIdentityConsistency;
}

export interface DocumentSummary {
  documentType: DocumentType;
  found: boolean;
  documentId?: string;
  extractionConfidence?: number;
  keyDataExtracted?: string[];
}

export interface AuditTrailEntry {
  timestamp: string;
  action: string;
  performedBy: string;
  details?: string;
  previousValue?: string;
  newValue?: string;
}

// ==================== COMPLIANCE RULES ====================

export interface ComplianceRule {
  id: string;
  name: string;
  description: string;
  category: ComplianceCategory;
  evaluationLogic: string;
  isActive: boolean;
  effectiveDate: string;
  endDate?: string;
  version: string;
  weight: number;
  isMustPass: boolean;
  timeframeAccreditation?: number;
  timeframeCertification?: number;
}

export interface RuleSet {
  id: string;
  name: string;
  version: string;
  effectiveDate: string;
  rules: ComplianceRule[];
  categoryWeights: Record<ComplianceCategory, number>;
}

// ==================== MONITORING ====================

export interface MonitoringCheck {
  id: string;
  practitionerId: string;
  checkType: 'OIG' | 'SAM' | 'LICENSE' | 'DEA' | 'MEDICAID' | 'STATE_BOARD';
  checkDate: string;
  result: 'Clear' | 'Match' | 'Expired' | 'Expiring Soon' | 'Error';
  details?: string;
  nextCheckDue: string;
}

export interface MonitoringAlert {
  id: string;
  practitionerId: string;
  practitionerName: string;
  alertType: 'EXCLUSION_MATCH' | 'LICENSE_EXPIRING' | 'DEA_EXPIRING' | 'RECRED_DUE' | 'PSV_OVERDUE';
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  message: string;
  createdAt: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

export interface MonitoringSchedule {
  id: string;
  checkType: string;
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  lastRun?: string;
  nextRun: string;
  isActive: boolean;
  sources: string[];
}

// ==================== REPORTING ====================

export interface ComplianceReport {
  id: string;
  generatedAt: string;
  generatedBy: string;
  reportType: 'INDIVIDUAL' | 'PORTFOLIO' | 'TREND' | 'EXECUTIVE';
  dateRange?: { start: string; end: string };
  filters?: ReportFilters;
  data: ReportData;
}

export interface ReportFilters {
  specialties?: string[];
  credentialingTypes?: CredentialType[];
  complianceTiers?: ComplianceTier[];
  dateRange?: { start: string; end: string };
}

export interface ReportData {
  totalFiles: number;
  tierDistribution: Record<ComplianceTier, number>;
  averageScore: number;
  topIssues: { issue: string; count: number; percentage: number }[];
  trendData?: { date: string; averageScore: number; totalAudits: number }[];
  categoryBreakdown: Record<ComplianceCategory, { average: number; passRate: number }>;
}

// ==================== USER & SYSTEM ====================

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  department?: string;
  lastLogin?: string;
  isActive: boolean;
  permissions: string[];
}

export interface SystemLog {
  id: string;
  timestamp: string;
  level: 'INFO' | 'WARNING' | 'ERROR';
  action: string;
  userId?: string;
  details: string;
  ipAddress?: string;
}

export interface SystemConfig {
  id: string;
  key: string;
  value: string;
  description: string;
  lastModified: string;
  modifiedBy: string;
}

// ==================== API RESPONSES ====================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ==================== DASHBOARD ====================

export interface DashboardStats {
  totalAudits: number;
  averageScore: number;
  fullyCompliant: number;
  substantiallyCompliant: number;
  partiallyCompliant: number;
  nonCompliant: number;
  pendingAudits: number;
  alertsCount: number;
  upcomingExpirations: number;
  recentActivity: ActivityItem[];
}

export interface ActivityItem {
  id: string;
  type: 'AUDIT_COMPLETED' | 'FILE_UPLOADED' | 'ALERT_GENERATED' | 'FINDING_RESOLVED';
  description: string;
  timestamp: string;
  userId?: string;
  relatedId?: string;
}

// ==================== NCQA 2025 SPECIFIC ====================

export interface NCQAStandard {
  id: string;
  code: string;
  name: string;
  description: string;
  category: ComplianceCategory;
  isMustPass: boolean;
  effectiveDate: string;
  requirements: NCQARequirement[];
}

export interface NCQARequirement {
  id: string;
  standardId: string;
  description: string;
  verificationMethod: string;
  timeframeAccreditation: number;
  timeframeCertification: number;
  primarySources: VerificationSource[];
  isRequired: boolean;
}

export interface InformationIntegrityCheck {
  hasAuditTrail: boolean;
  hasVerifierIdentification: boolean;
  hasVerificationDates: boolean;
  hasSourceDocumentation: boolean;
  noInappropriateUpdates: boolean;
  annualAuditCompleted: boolean;
  qualitativeAnalysisPresent: boolean;
  correctiveActionsTracked: boolean;
  factorsMet: number;
  totalFactors: number;
  isPassing: boolean;
}

export interface ProviderIdentityScopedConflict {
  sourceDocumentType: string;
  conflictingField: string;
  conflictDetail: string;
}

export interface ProviderIdentityConsistency {
  /**
   * PASS            – All identity fields match across documents.
   * FAIL            – Clear, confirmed mismatch in critical identity fields (different person).
   * MANUAL_REVIEW   – Potential mismatch requiring human verification (name variant, OCR uncertainty, etc.).
   * UNABLE_TO_VERIFY – Identity cannot be determined due to missing or illegible information.
   */
  result: 'PASS' | 'FAIL' | 'MANUAL_REVIEW' | 'UNABLE_TO_VERIFY';
  primaryIdentifiers: {
    fullName: string | null;
    dateOfBirth: string | null;
    npi: string | null;
    stateLicenseNumbers: string[];
    deaNumber: string | null;
    cdsNumber: string | null;
    specialty: string | null;
    otherIdentifiers: string[];
  };
  allNamesFound: string[];
  documentsReviewed: string[];
  mismatchedDocuments: string[];
  conflictingFields: string[];
  scopedConflicts: ProviderIdentityScopedConflict[];
  foreignProviderNames: string[];
  comments: string;
}
