import { Routes } from '@angular/router';
import { authGuard, loginGuard } from './guards/auth-guard';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [loginGuard],
    loadComponent: () => import('./components/login/login').then(m => m.Login)
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./components/dashboard/dashboard').then(m => m.Dashboard)
  },
  {
    path: 'audits',
    canActivate: [authGuard],
    loadComponent: () => import('./components/audit-list/audit-list').then(m => m.AuditList)
  },
  {
    path: 'audit/:id',
    canActivate: [authGuard],
    loadComponent: () => import('./components/audit-detail/audit-detail').then(m => m.AuditDetail)
  },
  {
    path: 'upload',
    canActivate: [authGuard],
    loadComponent: () => import('./components/upload/upload').then(m => m.Upload)
  },
  {
    path: 'monitoring',
    canActivate: [authGuard],
    loadComponent: () => import('./components/monitoring-settings/monitoring-settings').then(m => m.MonitoringSettings)
  },
  {
    path: 'standards',
    canActivate: [authGuard],
    loadComponent: () => import('./components/standards/standards').then(m => m.Standards)
  },
  {
    path: 'settings',
    canActivate: [authGuard],
    loadComponent: () => import('./components/settings/settings').then(m => m.Settings)
  },
  {
    path: 'profile',
    canActivate: [authGuard],
    loadComponent: () => import('./components/profile/profile').then(m => m.Profile)
  },
  {
    path: 'document/:fileId/:documentName',
    canActivate: [authGuard],
    loadComponent: () => import('./components/document-viewer/document-viewer').then(m => m.DocumentViewer)
  }
];
