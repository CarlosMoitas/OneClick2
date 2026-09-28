import { Injectable, computed } from '@angular/core';
import { HealthService } from './health.service';

export type NavbarConnectionStatus = 'checking' | 'ready' | 'degraded' | 'tdm-down';

/**
 * Facade do módulo de health check enterprise. Isola completamente a
 * Navbar (e qualquer outro consumidor de UI) da lógica de verificação de
 * saúde da plataforma — a Navbar NÃO deve executar validações, conhecer
 * detalhes do TDM, nem fazer chamadas HTTP: ela apenas lê o estado já
 * processado exposto aqui.
 *
 * `connectionStatus` traduz o resultado bruto do health check em um
 * estado preciso de apresentação:
 *   - 'checking'  → ainda não houve a primeira resposta do backend
 *   - 'ready'     → readyForExecution = true (Gateway + TDM + Auth OK)
 *   - 'tdm-down'  → Gateway responde (gateway = 'UP'), mas TDM ou Auth falhou
 *   - 'degraded'  → BFF inacessível (gateway = 'DOWN' — catchError no Angular)
 *
 * A distinção entre 'tdm-down' e 'degraded' é fundamental para exibir
 * mensagens precisas: "Gateway Indisponível" só é correto quando o
 * processo do BFF em si não responde. Quando o BFF está de pé mas o TDM
 * falha, a mensagem correta é "TDM Indisponível".
 */
@Injectable({ providedIn: 'root' })
export class HealthFacade {
  readonly health = computed(() => this.healthService.health());

  readonly connectionStatus = computed<NavbarConnectionStatus>(() => {
    if (!this.healthService.hasReceivedFirstResponse()) {
      return 'checking';
    }
    const h = this.healthService.health();
    if (h.readyForExecution) return 'ready';
    // Se o gateway respondeu (gateway = 'UP'), o BFF está de pé — o problema
    // está no TDM ou na autenticação, não no Gateway.
    if (h.gateway === 'UP') return 'tdm-down';
    // gateway = 'DOWN' → BFF inacessível (OFFLINE_HEALTH via catchError).
    return 'degraded';
  });

  readonly message = computed(() => this.healthService.health().message);

  constructor(private readonly healthService: HealthService) {}
}
