import { Routes } from '@angular/router';
import { ErroPadraoComponent } from './erro-padrao/erro-padrao.component';
import { NotFoundComponent } from './not-found/not-found.component';

export const ERROR_ROUTES: Routes = [
  {
    path: '',
    component: ErroPadraoComponent,
  },
  {
    path: '404',
    component: NotFoundComponent,
  },
];
