import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { 
  PractitionerFile, 
  AuditResult, 
  CredentialType,
  DashboardStats,
  MonitoringAlert,
  MonitoringCheck,
  PaginatedResponse,
  ComplianceTier,
  AuditStatus,
  FindingStatus
} from './audit.types';

export interface AuditFilters {
  page?: number;
  pageSize?: number;
  tier?: ComplianceTier;
  status?: AuditStatus;
  search?: string;
}

export interface PortfolioReport {
  totalFiles: number;
  tierDistribution: Record<string, number>;
  averageScore: number;
  topIssues: { issue: string; count: number; percentage: number }[];
  categoryBreakdown: Record<string, { average: number; passRate: number }>;
}

@Injectable({
  providedIn: 'root'
})
export class AuditService {
  private http = inject(HttpClient);

  // ==================== DASHBOARD ====================
  
  getDashboardStats(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>('/api/dashboard/stats');
  }

  // ==================== AUDITS ====================

  getAudits(filters?: AuditFilters): Observable<PaginatedResponse<PractitionerFile>> {
    let params = new HttpParams();
    if (filters) {
      if (filters.page) params = params.set('page', filters.page.toString());
      if (filters.pageSize) params = params.set('pageSize', filters.pageSize.toString());
      if (filters.tier) params = params.set('tier', filters.tier);
      if (filters.status) params = params.set('status', filters.status);
      if (filters.search) params = params.set('search', filters.search);
    }
    return this.http.get<PaginatedResponse<PractitionerFile>>('/api/audits', { params });
  }

  getAuditsList(): Observable<PractitionerFile[]> {
    return this.getAudits({ pageSize: 1000 }).pipe(map(res => res.items));
  }

  getAuditResult(id: string): Observable<AuditResult> {
    return this.http.get<AuditResult>(`/api/audits/${id}`);
  }

  deleteAudit(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`/api/audits/${id}`);
  }

  resetAll(): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>('/api/reset');
  }

  resetAllIncludingDemo(): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>('/api/reset-all');
  }

  initializeDemo(): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>('/api/init-demo', {});
  }

  uploadFiles(files: File[], type: CredentialType, tags?: string[]): Observable<{ success: boolean; data: PractitionerFile }> {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    formData.append('type', type);
    if (tags) {
      formData.append('tags', JSON.stringify(tags));
    }
    return this.http.post<{ success: boolean; data: PractitionerFile }>('/api/audits/upload', formData);
  }

  batchUpload(files: File[], type: CredentialType): Observable<{ success: boolean; batchId: string; files: PractitionerFile[] }> {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    formData.append('type', type);
    return this.http.post<{ success: boolean; batchId: string; files: PractitionerFile[] }>('/api/audits/batch-upload', formData);
  }

  updateFinding(auditId: string, findingId: string, update: { status?: FindingStatus; userNotes?: string; reviewedBy?: string }): Observable<any> {
    return this.http.patch(`/api/audits/${auditId}/findings/${findingId}`, update);
  }

  updateFindingApproval(fileId: string, findingId: string, approvalStatus: 'APPROVED' | 'REJECTED', rejectionComments?: string): Observable<any> {
    return this.http.patch(`/api/audits/${fileId}/findings/${findingId}/approval`, { 
      approvalStatus, 
      rejectionComments 
    });
  }

  exportAudit(id: string, format: 'json' | 'csv'): Observable<Blob> {
    return this.http.get(`/api/audits/${id}/export`, {
      params: { format },
      responseType: 'blob'
    });
  }

  // ==================== MONITORING ====================

  getMonitoringAlerts(filters?: { severity?: string; acknowledged?: boolean }): Observable<MonitoringAlert[]> {
    let params = new HttpParams();
    if (filters) {
      if (filters.severity) params = params.set('severity', filters.severity);
      if (filters.acknowledged !== undefined) params = params.set('acknowledged', filters.acknowledged.toString());
    }
    return this.http.get<MonitoringAlert[]>('/api/monitoring/alerts', { params });
  }

  acknowledgeAlert(id: string, acknowledgedBy: string): Observable<any> {
    return this.http.patch(`/api/monitoring/alerts/${id}/acknowledge`, { acknowledgedBy });
  }

  getMonitoringChecks(): Observable<MonitoringCheck[]> {
    return this.http.get<MonitoringCheck[]>('/api/monitoring/checks');
  }

  runMonitoringCheck(practitionerId: string, checkType: string): Observable<{ success: boolean; check: MonitoringCheck }> {
    return this.http.post<{ success: boolean; check: MonitoringCheck }>('/api/monitoring/run-check', { practitionerId, checkType });
  }

  // ==================== REPORTS ====================

  getPortfolioReport(): Observable<PortfolioReport> {
    return this.http.get<PortfolioReport>('/api/reports/portfolio');
  }

  // ==================== SYSTEM ====================

  getSystemLogs(limit?: number): Observable<any[]> {
    const params = limit ? new HttpParams().set('limit', limit.toString()) : undefined;
    return this.http.get<any[]>('/api/system/logs', { params });
  }

  getNCQAStandards(): Observable<any> {
    return this.http.get('/api/ncqa/standards');
  }
}
