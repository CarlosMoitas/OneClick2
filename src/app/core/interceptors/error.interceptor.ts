import { HttpEvent, HttpHandlerFn, HttpRequest } from '@angular/common/http';
import { catchError, Observable, throwError } from 'rxjs';

export function errorInterceptor(
    req: HttpRequest<unknown>,
    next: HttpHandlerFn
): Observable<HttpEvent<unknown>> {
    return next(req).pipe(
        catchError((error) => {
            // Tratamento de erro HTTP, se precisar. Caso não tenha, pode remover o interceptor por completo.
            return throwError(() => error);
        })
    );
}
