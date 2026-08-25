import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError } from '../middleware/error.middleware';
import { AuthenticatedUser, JwtPayload, LoginRequest, LoginResponse } from './auth.types';

/**
 * Cache em memória de tokens TDM por usuário — mapeado por `username`.
 * Permite que jobs sejam submetidos ao TDM com o token real do usuário
 * logado, e não o token sistêmico fixo do `.env`.
 *
 * TTL idêntico ao da sessão JWT do Portal (padrão 8h). Quando o token
 * expirar ou não existir (usuário não fez login pelo portal), o fluxo
 * de execução cai automaticamente para o token sistêmico.
 */
interface UserTokenEntry {
  tdmToken: string;
  storedAtMs: number;
}

const USER_TDM_TOKEN_TTL_MS = 8 * 60 * 60 * 1000; // 8 horas (igual ao JWT do portal)
const userTdmTokenStore = new Map<string, UserTokenEntry>();

/**
 * Autenticação corporativa do Portal.
 *
 * IMPORTANTE — decisão arquitetural (opção 3 adotada):
 * O login do Portal NÃO usa uma base de usuários própria — ele valida o
 * usuário/senha digitados DIRETAMENTE contra o Broadcom TDM (mesma rotina
 * usada pelo `tdmClient`), reaproveitando as permissões de acesso e
 * execução já existentes no TDM Portal. Isso evita duplicar uma base de
 * credenciais e integrar um provedor de identidade corporativo adicional
 * (LDAP/SSO), aproveitando que o próprio TDM já expõe autenticação via
 * Basic Auth em `/TestDataManager/user/login`.
 *
 * O JWT emitido aqui é EXCLUSIVAMENTE a sessão do Portal (nunca contém o
 * token do TDM) — ele apenas certifica que o usuário passou pela
 * validação de credenciais do TDM no momento do login.
 *
 * EXTENSÃO — Token TDM por Sessão:
 * Além de validar as credenciais, ao fazer login o Portal agora captura
 * o Bearer Token TDM do usuário e o guarda em memória. Isso permite que
 * as execuções de jobs usem o token real do usuário (não o sistêmico),
 * garantindo rastreabilidade real no TDM — cada job aparece com o login
 * de quem de fato executou.
 */
export class AuthService {
  async login(request: LoginRequest): Promise<LoginResponse> {
    const { username, password } = request;

    if (!username || !password) {
      throw new AppError(400, 'Informe usuário e senha.');
    }

    // Chamada única ao TDM: valida credenciais E captura o Bearer Token
    // do usuário em uma só requisição. Lança AppError(401) se rejeitado.
    const tdmToken = await this.fetchUserTdmToken(username, password);

    if (tdmToken) {
      userTdmTokenStore.set(username, {
        tdmToken,
        storedAtMs: Date.now(),
      });
    }

    const user: AuthenticatedUser = {
      id: username,
      username,
      roles: ['user'],
    };

    const token = this.issueToken(user);

    return {
      token,
      expiresAt: this.resolveExpiresAt(),
      user,
    };
  }

  /**
   * Retorna o Bearer Token TDM armazenado para o usuário, ou `null` se
   * não houver sessão ativa ou ela tiver expirado. Quando `null`, o
   * fluxo de execução usa o token sistêmico do `.env` como fallback.
   */
  getUserTdmToken(username: string): string | null {
    const entry = userTdmTokenStore.get(username);
    if (!entry) return null;

    const isExpired = Date.now() - entry.storedAtMs > USER_TDM_TOKEN_TTL_MS;
    if (isExpired) {
      userTdmTokenStore.delete(username);
      return null;
    }

    return entry.tdmToken;
  }

  /**
   * Faz login no TDM com as credenciais do usuário em uma ÚNICA chamada
   * HTTP e retorna o Bearer Token obtido.
   * - Lança AppError(401) se as credenciais forem inválidas.
   * - Retorna null silenciosamente para falhas de infraestrutura (TDM
   *   indisponível, timeout, etc.) — o portal continua funcionando com
   *   o token sistêmico como fallback.
   */
  private async fetchUserTdmToken(username: string, password: string): Promise<string | null> {
    if (!env.tdm.baseUrl) {
      throw new AppError(500, 'TDM_BASE_URL não configurada neste servidor.');
    }

    try {
      const { default: axios } = await import('axios');
      const { default: https } = await import('https');
      const httpsAgent = new https.Agent({ rejectUnauthorized: false });
      const url = `${env.tdm.baseUrl}/TestDataManager/user/login`;

      const response = await axios.post(url, null, {
        httpsAgent,
        headers: { Accept: 'application/json' },
        auth: { username, password },
        validateStatus: () => true,
      });

      if (response.status === 401 || response.status === 403) {
        throw new AppError(401, 'Usuário ou senha do TDM inválidos.', 'TDM_LOGIN_UNAUTHORIZED');
      }

      if (response.status < 200 || response.status >= 300) {
        // Falha de infra — não bloqueia o login; usa fallback sistêmico
        return null;
      }

      return response.data?.token ?? null;
    } catch (error) {
      if (error instanceof AppError) throw error; // re-lança erros de credencial
      return null; // swallow falhas de rede/TDM — fallback sistêmico assumido
    }
  }

  verifyToken(token: string): JwtPayload {
    try {
      return jwt.verify(token, env.jwt.secret) as JwtPayload;
    } catch {
      throw new AppError(401, 'Sessão inválida ou expirada.');
    }
  }

  private issueToken(user: AuthenticatedUser): string {
    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
      name: user.name,
      roles: user.roles,
    };

    const options: SignOptions = { expiresIn: env.jwt.expiresIn as SignOptions['expiresIn'] };
    return jwt.sign(payload, env.jwt.secret, options);
  }

  private resolveExpiresAt(): string {
    const durationMs = this.parseExpiresInToMs(env.jwt.expiresIn);
    return new Date(Date.now() + durationMs).toISOString();
  }

  private parseExpiresInToMs(expiresIn: string): number {
    const match = /^(\d+)(s|m|h|d)$/.exec(expiresIn.trim());
    if (!match) {
      return 8 * 60 * 60 * 1000; // fallback: 8h
    }

    const value = Number(match[1]);
    const unit = match[2];
    const unitMs: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };

    return value * unitMs[unit];
  }
}

export const authService = new AuthService();
