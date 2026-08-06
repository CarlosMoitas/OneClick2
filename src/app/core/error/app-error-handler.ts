import { ErrorHandler, inject, Injectable, Injector, NgZone } from '@angular/core';
import { Router } from '@angular/router';

@Injectable()
export class AppErrorHandler implements ErrorHandler {
  private readonly _injector = inject(Injector);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleError(error: any): void {
    /* É possivel utilizar a function "console.error(error)" no ambiente de desenvolvimento para facilitar a interpretação de erros;*/

    // @todo: Remover o console.error no build de produção e modificar fedkit para que identifique seu projeto.
    console.error(error); // Log the error to the console, usado enquanto testes locais
    // !!error?.status && (window as { dtrum?: { reportError: (error: unknown) => void } }).dtrum?.reportError(`fedKit: ${error}`)

    const router = this._injector.get(Router);
    const ngZone = this._injector.get(NgZone);

    ngZone.runGuarded(() => {
      router.navigate([`erro/${error.status}`], { skipLocationChange: true });
    });
  }
}
