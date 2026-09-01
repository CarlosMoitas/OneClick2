import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { LoggerService } from '../logging/logger.service';
import { ApiError } from '../models/api-error.model';
import { CORRELATION_ID_CONTEXT } from './correlation-id.interceptor';

/**
 * Intercepta todas as respostas HTTP com erro (401, 403, 404, 500, erros de
 * rede, etc.) e as normaliza no contrato único `ApiError`
 * (ver core/models/api-error.model.ts) antes de propagar para os
 * serviços/facades.
 *
 * Objetivo: nenhum componente ou serviço deve precisar interpretar
 * `HttpErrorResponse` diretamente — sempre recebem um `ApiError` já
 * normalizado, com mensagem amigável pronta para exibição e o mesmo
 * Correlation ID enviado na requisição (para rastreamento ponta a ponta
 * com o Gateway/TDM).
 *
 * Comportamento adicional — sessão expirada (401):
 * Quando qualquer chamada ao Gateway retorna 401 (sessão inválida ou
 * expirada), o interceptor limpa a sessão local e redireciona o usuário
 * para a tela de login automaticamente. A requisição de login em si
 * (`/gw/auth/login`) está excluída para evitar loop de redirect.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const logger = inject(LoggerService);
  const authService = inject(AuthService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      const correlationId = req.context.get(CORRELATION_ID_CONTEXT) || undefined;
      const normalized = normalizeError(error, correlationId);
      logger.error(`Falha na requisição ${req.method} ${req.url}`, correlationId, normalized);

      // Sessão expirada ou inválida: limpa a sessão e redireciona para login.
      // Exclui a própria rota de login para não criar loop de redirect.
      const isLoginRequest = req.url.includes('/auth/login');
      if (normalized.status === 401 && !isLoginRequest) {
        authService.logout();
        router.navigate(['/login']);
      }

      return throwError(() => normalized);
    }),
  );
};

function normalizeError(error: HttpErrorResponse, correlationId?: string): ApiError {
  // Erro de rede / sem resposta do servidor (status 0)
  if (error.status === 0) {
    return {
      status: 0,
      message:
        'Não foi possível conectar ao Portal. Verifique se a VPN corporativa está ativa e tente novamente.',
      code: 'NETWORK_ERROR',
      correlationId,
      details: error,
    };
  }

  // Extrai o código de erro específico retornado pelo BFF — permite
  // mensagens mais precisas do que apenas o status HTTP.
  const bffCode = extractBffCode(error);

  // Mensagens específicas por código do BFF (precedem as mensagens por status)
  const messageByBffCode = resolveMessageByBffCode(bffCode);
  if (messageByBffCode) {
    return {
      status: error.status,
      message: messageByBffCode,
      code: bffCode ?? 'UNKNOWN_ERROR',
      correlationId,
      details: error.error,
    };
  }

  switch (error.status) {
    case 401:
      return {
        status: 401,
        message: 'Sessão expirada ou inválida. Faça login novamente.',
        code: 'UNAUTHORIZED',
        correlationId,
        details: error.error,
      };
    case 403:
      return {
        status: 403,
        message: 'Você não tem permissão para executar esta ação.',
        code: 'FORBIDDEN',
        correlationId,
        details: error.error,
      };
    case 404:
      return {
        status: 404,
        message: 'Recurso não encontrado no Gateway do Portal TDM.',
        code: 'NOT_FOUND',
        correlationId,
        details: error.error,
      };
    case 500:
    case 502:
      return {
        status: error.status,
        message:
          'Ocorreu um erro ao processar a solicitação no serviço TDM. ' +
          'Verifique se a VPN está ativa e tente novamente. ' +
          'Se o problema persistir, o serviço TDM pode estar instável.',
        code: 'INTERNAL_ERROR',
        correlationId,
        details: error.error,
      };
    case 503:
      return {
        status: 503,
        message:
          'Não foi possível conectar ao serviço TDM. ' +
          'Verifique se a VPN corporativa está ativa e tente novamente.',
        code: 'SERVICE_UNAVAILABLE',
        correlationId,
        details: error.error,
      };
    case 504:
      return {
        status: 504,
        message:
          'O tempo máximo de espera foi atingido. ' +
          'O job pode ainda estar em execução no TDM. ' +
          'Verifique o histórico no Portal TDM antes de tentar novamente.',
        code: 'TIMEOUT',
        correlationId,
        details: error.error,
      };
    default:
      return {
        status: error.status,
        message:
          extractGatewayMessage(error) ?? 'Ocorreu um erro inesperado ao comunicar com o Gateway.',
        code: 'UNKNOWN_ERROR',
        correlationId,
        details: error.error,
      };
  }
}

/**
 * Extrai o código de erro específico (`code`) do corpo da resposta do BFF.
 */
function extractBffCode(error: HttpErrorResponse): string | undefined {
  const body = error.error;
  if (body && typeof body === 'object') {
    return (body as { code?: string }).code ?? undefined;
  }
  return undefined;
}

/**
 * Mapeia códigos específicos do BFF para mensagens amigáveis com
 * orientação de diagnóstico para o usuário.
 */
function resolveMessageByBffCode(code?: string): string | undefined {
  switch (code) {
    case 'TDM_AUTH_UNAVAILABLE':
      return (
        'Não foi possível conectar ao serviço de autenticação (TDM). ' +
        'Verifique se a VPN corporativa está ativa e tente novamente.'
      );
    case 'TDM_AUTH_ERROR':
      return (
        'O serviço de autenticação (TDM) retornou uma resposta inesperada. ' +
        'Tente novamente em instantes.'
      );
    case 'TDM_SUBMIT_FAILED':
      return (
        'A criação do job falhou no serviço TDM. ' +
        'Verifique se a VPN está ativa e se o Portal TDM está operacional.'
      );
    case 'TDM_JOB_FAILED':
      return (
        'O processamento de dados falhou no serviço TDM. ' +
        'Aguarde alguns minutos e tente novamente. ' +
        'Se o problema persistir, verifique o status no Portal TDM ou acione o suporte.'
      );
    case 'TDM_JOB_TIMEOUT':
      return (
        'O tempo máximo de espera foi atingido. ' +
        'O job pode ainda estar em execução no TDM. ' +
        'Verifique o histórico no Portal TDM antes de tentar novamente para evitar duplicidade.'
      );
    case 'TDM_DOWNLOAD_FAILED':
      return (
        'O artefato gerado pelo TDM não pôde ser baixado. ' +
        'O job foi concluído mas os dados não foram entregues. ' +
        'Tente novamente ou verifique o resultado no Portal TDM.'
      );
    case 'TDM_JOB_STATUS_FAILED':
      return (
        'Não foi possível consultar o status do job no TDM. ' +
        'Verifique se a VPN está ativa e tente novamente.'
      );
    default:
      return undefined;
  }
}

/**
 * Tenta extrair uma mensagem amigável do payload de erro retornado pelo
 * Gateway, já que o formato exato do corpo de erro pode variar entre
 * endpoints.
 */
function extractGatewayMessage(error: HttpErrorResponse): string | undefined {
  const body = error.error;
  if (typeof body === 'string') {
    return body;
  }
  if (body && typeof body === 'object') {
    return (body as { message?: string }).message;
  }
  return undefined;
}
