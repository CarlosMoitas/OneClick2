import { Routes } from '@angular/router';
import { ExemplosComponent } from './exemplos.component';

export const EXEMPLOS_ROUTES: Routes = [
  { path: '', component: ExemplosComponent },
  {
    title: 'Exemplo BFF',
    path: 'chamar-bff',
    loadComponent: () => import('./chamar-bff/chamar-bff.component').then((m) => m.ChamarBffComponent),
  },
  {
    title: 'Exemplo de Calendário',
    path: 'calendario',
    loadComponent: () => import('./calendario/calendario.component').then((m) => m.CalendarioComponent),
  },
  {
    title: 'Exemplo de Autorizador',
    path: 'autorizador',
    loadComponent: () => import('./autorizador/autorizador.component').then((m) => m.AutorizadorComponent),
  },
  {
    title: 'Exemplo de uso do GTM',
    path: 'gtm',
    loadComponent: () => import('./gtm/gtm.component').then((m) => m.GtmComponent),
  },
  {
    title: 'Exemplo de Interceptor de Log',
    path: 'logging',
    loadComponent: () =>
      import('./log-rastreabilidade/log-rastreabilidade.component').then((m) => m.DeviceLogInterceptorComponent),
  },
];
