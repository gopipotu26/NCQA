import {RenderMode, ServerRoute} from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: 'login',
    renderMode: RenderMode.Client,
  },
  {
    path: '',
    renderMode: RenderMode.Client,
  },
  {
    path: 'audits',
    renderMode: RenderMode.Client,
  },
  {
    path: 'audit/:id',
    renderMode: RenderMode.Client,
  },
  {
    path: 'upload',
    renderMode: RenderMode.Client,
  },
  {
    path: 'monitoring',
    renderMode: RenderMode.Client,
  },
  {
    path: 'standards',
    renderMode: RenderMode.Client,
  },
  {
    path: 'settings',
    renderMode: RenderMode.Client,
  },
  {
    path: 'profile',
    renderMode: RenderMode.Client,
  },
  {
    path: 'document/:fileId/:documentName',
    renderMode: RenderMode.Client,
  },
  {
    path: '**',
    renderMode: RenderMode.Client,
  },
];
