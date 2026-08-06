import { Routes } from '@angular/router';
import { welcomeGuard } from './core/guards/welcome.guard';

export const routes: Routes = [
  // @todo: Rota padrão agora vai para boas-vindas com guard de controle
  { path: '', pathMatch: 'full', redirectTo: 'welcome' },
  {
    title: 'Boas-vindas',
    path: 'welcome',
    canActivate: [welcomeGuard],
    loadComponent: () =>
      import('./components/welcome/welcome.component').then((m) => m.WelcomeComponent),
  },
  {
    title: 'Home da jornada',
    path: 'home',
    loadComponent: () => import('./components/home/home.component').then((m) => m.HomeComponent),
  },
  {
    title: 'Menu de Exemplos',
    path: 'exemplos',
    loadChildren: () =>
      import('./components/exemplos/exemplos.routes').then((m) => m.EXEMPLOS_ROUTES),
  },
  {
    title: 'Página de Erro',
    path: 'erro',
    loadChildren: () => import('./core/error/error.routes').then((m) => m.ERROR_ROUTES),
  },
  { path: '**', redirectTo: 'erro' },
];
