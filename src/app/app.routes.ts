import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { ChatPage } from './chat/chat-page/chat-page';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/login/login').then((m) => m.Login),
  },
  {
    // Página de aprovação do BEX Design System — sem guard de autenticação
    path: 'design-preview',
    loadComponent: () => import('./features/design-preview/design-preview').then((m) => m.DesignPreview),
  },
  {
    path: 'chat',
    component: ChatPage,
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./features/home/home').then((m) => m.Home),
  },
];