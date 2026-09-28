"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.tdmClient = void 0;
exports.tdmRequest = tdmRequest;
exports.tdmRequestAs = tdmRequestAs;
const axios_1 = __importDefault(require("axios"));
const https_1 = __importDefault(require("https"));
const env_1 = require("../config/env");
const error_middleware_1 = require("../middleware/error.middleware");
const logger_1 = require("../logging/logger");
/**
 * Cliente HTTP responsável exclusivamente por falar com o Broadcom TDM.
 *
 * IMPORTANTE — fronteira de segurança:
 * Este é o ÚNICO ponto do sistema que conhece credenciais/token do TDM.
 * O Angular nunca tem acesso a estas credenciais nem a este módulo — ele
 * fala apenas com as rotas HTTP deste servidor.
 *
 * Replica os conceitos do gateway legado (login com cache, retry em
 * 401/403), mas como implementação nova e isolada.
 */
const httpsAgent = new https_1.default.Agent({ rejectUnauthorized: false });
const TOKEN_TTL_MS = 10 * 60 * 1000; // 10 minutos
let cachedToken = null;
let cachedTokenAtMs = 0;
/**
 * Login TÉCNICO do servidor no TDM, usando as credenciais fixas
 * configuradas em `TDM_USERNAME`/`TDM_PASSWORD` (env). Usado para todas
 * as chamadas de submissão/consulta de jobs feitas pelo servidor em nome
 * do Portal — independente de qual usuário está logado no Angular.
 */
async function tdmLogin(options = {}) {
    const now = Date.now();
    if (!options.force && cachedToken && now - cachedTokenAtMs < TOKEN_TTL_MS) {
        return cachedToken;
    }
    if (!options.force && env_1.env.tdm.bearerToken) {
        cachedToken = env_1.env.tdm.bearerToken;
        cachedTokenAtMs = now;
        return cachedToken;
    }
    if (!env_1.env.tdm.baseUrl || !env_1.env.tdm.username || !env_1.env.tdm.password) {
        throw new error_middleware_1.AppError(500, 'Credenciais do Broadcom TDM não configuradas neste servidor (TDM_BASE_URL/TDM_USERNAME/TDM_PASSWORD).');
    }
    const token = await performTdmLogin(env_1.env.tdm.username, env_1.env.tdm.password);
    cachedToken = token;
    cachedTokenAtMs = now;
    return token;
}
/**
 * Executa o login no TDM (`POST /TestDataManager/user/login`) com um
 * usuário/senha ARBITRÁRIOS — sem depender do cache técnico do servidor.
 *
 * Usado por `AuthService.login()` (opção 3 de autenticação corporativa):
 * a sessão do Portal passa a ser validada diretamente contra o Broadcom
 * TDM, reaproveitando as mesmas permissões de acesso/execução já
 * existentes no TDM Portal — sem precisar de LDAP/SSO corporativo
 * adicional. Lança `AppError(401, ...)` se as credenciais forem
 * rejeitadas pelo TDM.
 */
async function verifyTdmCredentials(username, password) {
    if (!env_1.env.tdm.baseUrl) {
        throw new error_middleware_1.AppError(500, 'TDM_BASE_URL não configurada neste servidor.');
    }
    await performTdmLogin(username, password);
}
async function performTdmLogin(username, password) {
    const url = `${env_1.env.tdm.baseUrl}/TestDataManager/user/login`;
    const response = await axios_1.default.post(url, null, {
        httpsAgent,
        headers: { Accept: 'application/json' },
        auth: { username, password },
        validateStatus: () => true,
    });
    if (response.status === 401 || response.status === 403) {
        throw new error_middleware_1.AppError(401, 'Usuário ou senha do TDM inválidos.', 'TDM_LOGIN_UNAUTHORIZED');
    }
    if (response.status < 200 || response.status >= 300) {
        throw new error_middleware_1.AppError(502, `Falha no login do TDM (status ${response.status}).`, 'TDM_LOGIN_FAILED', response.data);
    }
    const token = response.data?.token;
    if (!token) {
        throw new error_middleware_1.AppError(502, 'Login do TDM não retornou token.', 'TDM_LOGIN_NO_TOKEN');
    }
    return token;
}
/**
 * Executa uma requisição contra o TDM anexando o Bearer Token TÉCNICO do
 * servidor (`tdmLogin`), com um retry automático em caso de 401/403
 * (token expirado/invalidado).
 */
async function tdmRequest(config, correlationId) {
    let token = await tdmLogin();
    const doRequest = (bearer) => (0, axios_1.default)({
        httpsAgent,
        validateStatus: () => true,
        ...config,
        headers: {
            Accept: 'application/json',
            ...(config.headers ?? {}),
            Authorization: `Bearer ${bearer}`,
        },
    });
    let response = await doRequest(token);
    if (response.status === 401 || response.status === 403) {
        logger_1.logger.warn('Token do TDM expirado/invalidado; refazendo login.', correlationId);
        token = await tdmLogin({ force: true });
        response = await doRequest(token);
    }
    return response;
}
/**
 * Executa uma requisição contra o TDM usando um Bearer Token ESPECÍFICO
 * de sessão (obtido no login do usuário). Em caso de 401/403 — token do
 * usuário expirado — cai automaticamente para o token TÉCNICO do servidor,
 * garantindo que a execução não seja bloqueada por expiração de sessão
 * individual.
 *
 * Isso permite que jobs submetidos por usuários logados apareçam no TDM
 * com o token deles (e não o sistêmico `m627529`), mantendo rastreabilidade
 * real por sessão sem sacrificar a robustez do fluxo.
 */
async function tdmRequestAs(config, userToken, correlationId) {
    const doRequest = (bearer) => (0, axios_1.default)({
        httpsAgent,
        validateStatus: () => true,
        ...config,
        headers: {
            Accept: 'application/json',
            ...(config.headers ?? {}),
            Authorization: `Bearer ${bearer}`,
        },
    });
    let response = await doRequest(userToken);
    if (response.status === 401 || response.status === 403) {
        logger_1.logger.warn('Token de sessão do usuário expirado/inválido; fazendo fallback para token técnico do servidor.', correlationId);
        // Fallback: usa token sistêmico para não interromper a execução
        const systemToken = await tdmLogin();
        response = await doRequest(systemToken);
    }
    return response;
}
exports.tdmClient = { tdmLogin, tdmRequest, tdmRequestAs, verifyTdmCredentials };
//# sourceMappingURL=tdm.client.js.map