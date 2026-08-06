import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class CookieService {
  private readonly _document = inject(DOCUMENT);
  // TODO: Modifique no nome do cookie conforme a necessidade do seu projeto.
  private readonly nomeCookieCsrf = 'MOCK-CSRF-TOKEN';

  /** Cache */
  private csrfCacheado: string | null = null;

  /**
   * Obtém o valor do cookie.
   * - Primeira chamada: varre document.cookie e guarda valor no cache.
   * - Próximas chamadas: retorno imediato do cache.
   */
  getCsrfToken(): string | null {
    if (this.csrfCacheado !== null) {
      return this.csrfCacheado;
    }

    const raw = this._document.cookie;
    if (raw) {
      const prefix = `${this.nomeCookieCsrf}=`;
      const cookies = raw.split('; ');
      for (const cookie of cookies) {
        if (cookie.startsWith(prefix)) {
          const valor = cookie.slice(prefix.length);
          this.csrfCacheado = this.safeDecode(valor);

          return this.csrfCacheado;
        }
      }
    }

    // Caso não ache o cookie, limpa o cache
    this.csrfCacheado = null;
    return this.csrfCacheado;
  }

  /** Decodifica valor URL-encoded com segurança */
  private safeDecode(valor: string): string {
    try {
      return decodeURIComponent(valor);
    } catch {
      return valor;
    }
  }
}
