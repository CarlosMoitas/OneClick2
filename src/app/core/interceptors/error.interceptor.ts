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
      message: 'Não foi possível conectar ao Gateway do Portal TDM. Verifique sua conexão.',
      code: 'NETWORK_ERROR',
      correlationId,
      details: error,
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
      return {
        status: 500,
        message: 'Erro interno no Gateway do Portal TDM. Tente novamente mais tarde.',
        code: 'INTERNAL_ERROR',
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
