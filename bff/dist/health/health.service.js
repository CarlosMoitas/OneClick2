"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthService = void 0;
const env_1 = require("../config/env");
const tdm_client_1 = require("../tdm/tdm.client");
const error_middleware_1 = require("../middleware/error.middleware");
/**
 * Health check enterprise: valida a cadeia completa necessária para o
 * Portal executar requests reais no Broadcom TDM, e não apenas se este
 * processo Node está de pé.
 *
 * Camadas verificadas, em ordem:
 *   1) gateway         → sempre 'UP' se chegamos a executar este código
 *   2) tdm              → TDM_BASE_URL configurada nesta instância
 *   3) authentication   → login real no TDM (via tdmClient.tdmLogin) obtido com sucesso
 *   4) readyForExecution → true somente se as 3 camadas acima estiverem 'UP'
 *
 * IMPORTANTE: reaproveita `tdmClient.tdmLogin()` (já usado nas submissões
 * reais) em vez de duplicar lógica de autenticação. Como o token é
 * cacheado por 10 minutos (ver tdm.client.ts), a maioria das chamadas a
 * este health check não gera login real no TDM — só quando o cache
 * expira, mantendo o custo de rede baixo mesmo com polling frequente.
 */
async function checkHealth() {
    const timestamp = new Date().toISOString();
    // Camada 1 — Gateway: se este código está executando, o processo está de pé.
    const gateway = 'UP';
    // Camada 2 — TDM: a URL base precisa estar configurada nesta instância.
    const tdmUrlConfigured = Boolean(env_1.env.tdm.baseUrl);
    if (!tdmUrlConfigured) {
        return {
            gateway,
            tdm: 'DOWN',
            authentication: 'DOWN',
            readyForExecution: false,
            message: 'TDM_BASE_URL não configurada neste servidor.',
            timestamp,
        };
    }
    // Camada 3 — Authentication.
    //
    // O Portal suporta dois modos de autenticação com o TDM:
    //
    //   a) Sistêmica: TDM_USERNAME + TDM_PASSWORD (ou TDM_BEARER_TOKEN)
    //      configurados neste servidor. O `tdmClient.tdmLogin()` obtém um
    //      token técnico compartilhado e o usa em todas as chamadas.
    //
    //   b) Delegada por sessão: credenciais NÃO configuradas neste servidor.
    //      Cada usuário faz login no Portal com suas próprias credenciais TDM
    //      via `POST /auth/login` → `verifyTdmCredentials()`, e o token
    //      pessoal é armazenado no JWT de sessão Angular. Todas as chamadas
    //      de execução usam `tdmRequestAs(config, userToken)` — o servidor
    //      nunca precisa de um token sistêmico próprio.
    //
    // IMPORTANTE: ausência de credenciais sistêmicas NÃO é uma falha — é
    // uma configuração intencional e válida (modo delegado). Só reportar
    // `authentication: DOWN` quando credenciais FORAM configuradas mas
    // falharam ao testar, ou quando o TDM está literalmente inacessível.
    const hasSystemAuth = Boolean(env_1.env.tdm.bearerToken) ||
        (Boolean(env_1.env.tdm.username) && Boolean(env_1.env.tdm.password));
    if (!hasSystemAuth) {
        // Modo delegado: autenticação por sessão do usuário. O Portal está
        // pronto para executar cards assim que o usuário fizer login.
        return {
            gateway,
            tdm: 'UP',
            authentication: 'UP',
            readyForExecution: true,
            message: 'Portal pronto para executar requests (autenticação por sessão de usuário).',
            timestamp,
        };
    }
    // Modo sistêmico: testa o token técnico do servidor (cache de 10 min).
    try {
        await tdm_client_1.tdmClient.tdmLogin();
        return {
            gateway,
            tdm: 'UP',
            authentication: 'UP',
            readyForExecution: true,
            message: 'Portal pronto para executar requests.',
            timestamp,
        };
    }
    catch (error) {
        const message = error instanceof error_middleware_1.AppError
            ? error.message
            : 'Falha ao autenticar no Broadcom TDM.';
        return {
            gateway,
            tdm: 'DOWN',
            authentication: 'DOWN',
            readyForExecution: false,
            message,
            timestamp,
        };
    }
}
exports.healthService = { checkHealth };
//# sourceMappingURL=health.service.js.map