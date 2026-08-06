/**
 * Serviço para recuperar configurações externas ao build do projeto.
 */
import { Injectable } from '@angular/core';

// Interface para o arquivo app-config.js
type TAppConfig = {
  urlAPI: string;
};

// Aqui declaramos a variável criada no app-config.js
declare let appConfig: TAppConfig;

@Injectable({
  providedIn: 'root',
})
export class AppConfigService {
  // valores padrão considerando caminho relativo.
  config: TAppConfig = {
    urlAPI: '',
  };

  constructor() {
    this.init();
  }

  init(): void {
    try {
      this.config = appConfig;
    } catch (erro) {
      // tenta usar o caminho padrão
    }
  }
}
