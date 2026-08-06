import {
  ApplicationConfig,
  DEFAULT_CURRENCY_CODE,
  ErrorHandler,
  LOCALE_ID,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection
} from '@angular/core';
import { provideRouter, withHashLocation } from '@angular/router';

import { registerLocaleData } from '@angular/common';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import localePt from '@angular/common/locales/pt';
import { routes } from './app.routes';
import { AppErrorHandler } from './core/error/app-error-handler';
import { requestInterceptor } from './core/interceptors/request.interceptor';

registerLocaleData(localePt, 'pt');

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withHashLocation()),
    /**
     * Caso seu projeto tenha log de negócio, considere utilizar o interceptor "logDeviceInterceptor".
     * O interceptor depende da dependência @bradesco/rast-lib-device-interceptor-logging@21
     * Voce pode utilizar o comando "npm run devtools --schema=logging" para adicionar a dependência e configurar o interceptor automaticamente.
     * Mais informações em: https://confluence.bradesco.com.br:8443/pages/viewpage.action?pageId=807469806
     */
    provideHttpClient(withInterceptors([requestInterceptor])),
    { provide: LOCALE_ID, useValue: 'pt' },
    { provide: DEFAULT_CURRENCY_CODE, useValue: 'BRL' },
    { provide: ErrorHandler, useClass: AppErrorHandler },
  ],
};
