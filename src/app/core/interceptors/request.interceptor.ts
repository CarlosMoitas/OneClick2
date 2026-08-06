import { HttpEvent, HttpHandlerFn, HttpRequest } from '@angular/common/http';
import { inject, isDevMode } from '@angular/core';
import { Observable, timeout } from 'rxjs';
import { CookieService } from '../services/cookie/cookie.service';

/**
 * Intercepta as requisições clientHttp para adicionar headers customizados e timeout padrão.
 */
export function requestInterceptor(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> {
  const cookieService = inject(CookieService);

  // @todo Modifique no nome do cookie conforme a necessidade do seu projeto.
  const csrfToken = cookieService.getCsrfToken();
  isDevMode() && console.log('[Request Interceptor] CSRF Token:', csrfToken);
  req = req.clone({
    //Define o uso de header customizados, se preciso.
    setHeaders: {
      'x-csrf-token': csrfToken ?? '',
      'Content-Type': 'application/json',
    },
    //Define o uso de cookies quando preciso.
    withCredentials: true,
  });
  // define o timeout recomendado para as requisições.
  return next(req).pipe(timeout(3000)); // 3 segundos
}
