import { Injectable, computed, signal } from '@angular/core';
import { CatalogService } from '../../core/services/catalog.service';
import { ExecutionService } from '../../core/services/execution.service';
import { LoggerService } from '../../core/logging/logger.service';
import { ApiError } from '../../core/models/api-error.model';
import { Catalog, CatalogCard } from '../../core/models/catalog.model';
import { Execution } from '../../core/models/execution.model';
import {
  AgendarDebitoAutomaticoFormData,
  buildAgendarDebitoAutomaticoPayload,
} from './builders/agendar-debito-automatico.builder';
import { buildHabilitarContaMaPayload } from './builders/habilitar-conta-ma.builder';
import { buildDebitoAutomaticoPayload } from './builders/debito-automatico.builder';
import { DEFAULT_WORKFLOW_ENVIRONMENT, WorkflowEnvironment } from './builders/workflow-environment';
import { WORKFLOW_PROJETO_JIRA, WORKFLOW_USERNAME_FALLBACK } from './builders/shared-request-defaults';
import { AuthService } from '../../core/services/auth.service';
// POC Journey Progress — injeção somente visual, não altera lógica de negócio
import { JourneyProgressService, ABERTURA_CONTAS_STEPS } from '../../shared/services/journey-progress.service';

/** ID do primeiro card com integração real ao Gateway TDM. */
const CARD_ID_AGENDAR_DEBITO_AUTOMATICO = 'cta-003';

/** Step IDs do Journey Progress que espelham as etapas da jornada. */
const JP_STEP_PORTAL_TDM = 0;        // "Portal TDM" — marcado success ao iniciar (conexão já estabelecida)
const JP_STEP_CONTAS_CORRENTES = 1;
const JP_STEP_HABILITAR_MA = 2;
const JP_STEP_DEBITO_AUTOMATICO = 3;

/** Linha exibida no painel de acompanhamento em tempo real do workflow. */
export interface WorkflowLogEntry {
  timestamp: string;
  message: string;
  level: 'info' | 'success' | 'error';
}

/**
 * Contexto compartilhado entre as 3 etapas do workflow "Abertura de
 * Contas". É preenchido a partir da escolha do usuário e do resultado da
 * primeira etapa, e propagado (sem repetição de lógica) para os cards
 * "Habilitar Conta MA" e "Débito Automático".
 */
interface WorkflowContext {
  environment: WorkflowEnvironment;
  agencia: string;
  projetoJira: string;
  conta: string;
  /** Username do usuário autenticado no Portal — quem está executando a ação. */
  username: string;
}

/**
 * Facade da feature Home. Isola o componente `Home` dos services de
 * negócio, concentrando estado (signals), orquestração de chamadas,
 * validação de entrada e tratamento de erro/sucesso da tela. O componente
 * só conhece a Facade — nunca HTTP, DTO, Gateway ou payload diretamente.
 *
 * Workflow encadeado "Abertura de Contas" (3 etapas, todas disparadas a
 * partir do card cta-003 "Agendar Débito Automático"):
 *
 *   1) Contas Correntes - PF     → cria a conta corrente; extrai a conta do artefato
 *   2) Habilitar Conta MA        → usa conta extraída da etapa 1
 *   3) Débito Automático         → usa conta extraída da etapa 1
 *
 * O progresso de cada etapa é publicado em `workflowLog` (signal) E
 * espelhado no JourneyProgressService (visual apenas, sem regra de negócio).
 */
@Injectable({ providedIn: 'root' })
export class HomeFacade {
  private readonly _catalogs = signal<Catalog[]>([]);
  private readonly _cards = signal<CatalogCard[]>([]);
  private readonly _errorMessage = signal<string | null>(null);
  private readonly _lastExecution = signal<Execution | null>(null);
  private readonly _workflowLog = signal<WorkflowLogEntry[]>([]);

  readonly catalogs = computed(() => this._catalogs());
  readonly cards = computed(() => this._cards());
  readonly errorMessage = computed(() => this._errorMessage());
  readonly lastExecution = computed(() => this._lastExecution());
  readonly workflowLog = computed(() => this._workflowLog());

  constructor(
    private readonly catalogService: CatalogService,
    private readonly executionService: ExecutionService,
    private readonly logger: LoggerService,
    private readonly authService: AuthService,
    private readonly journeyProgress: JourneyProgressService,
  ) {}

  loadInitialData(): void {
    this._errorMessage.set(null);

    this.catalogService.getCatalogs().subscribe({
      next: (catalogs) => this._catalogs.set(catalogs),
      error: (error: ApiError) => this.handleError('Falha ao carregar catálogos', error),
    });

    this.catalogService.getCards().subscribe({
      next: (cards) => this._cards.set(cards),
      error: (error: ApiError) => this.handleError('Falha ao carregar cards', error),
    });
  }

  /**
   * @param environment Ambiente escolhido pelo usuário (TI/TU) no primeiro
   * card. Enquanto a UI não expõe o seletor visual, o chamador pode
   * omitir este parâmetro — usa-se `DEFAULT_WORKFLOW_ENVIRONMENT` ('TU').
   */
  generateMass(
    cardId: string,
    environment?: string,
    agency?: string,
    workflowEnvironment?: WorkflowEnvironment,
  ): void {
    this._errorMessage.set(null);
    this.logger.debug('Card selecionado para execução', undefined, { cardId, environment, agency });

    if (cardId === CARD_ID_AGENDAR_DEBITO_AUTOMATICO) {
      this._workflowLog.set([]);
      this.pushLog('info', 'Workflow "Abertura de Contas" iniciado.');

      // POC: inicializa o tracker visual com os 4 steps (Portal TDM + 3 reais)
      this.journeyProgress.initJourney([...ABERTURA_CONTAS_STEPS]);
      // Portal TDM: conexão já estabelecida — marca como success imediatamente
      this.journeyProgress.startStep(JP_STEP_PORTAL_TDM);
      this.journeyProgress.completeStep(JP_STEP_PORTAL_TDM);

      this.executeAgendarDebitoAutomatico({
        environment: workflowEnvironment ?? DEFAULT_WORKFLOW_ENVIRONMENT,
        agency,
        username: this.authService.user()?.username,
      });
      return;
    }

    // Demais cards permanecem no fluxo mockado até serem integrados
    // individualmente, preservando o comportamento atual da Home.
    this.catalogService.executeCard({ cardId, environment }).subscribe({
      next: (response) => this.logger.info('Execução iniciada com sucesso', undefined, response),
      error: (error: ApiError) => this.handleError('Falha ao executar o card no TDM', error),
    });
  }

  private executeAgendarDebitoAutomatico(formData: AgendarDebitoAutomaticoFormData): void {
    const environment = formData.environment ?? DEFAULT_WORKFLOW_ENVIRONMENT;
    const agencia = formData.agency ?? '';

    const payload = buildAgendarDebitoAutomaticoPayload(formData);
    this.logger.debug('Payload gerado para Agendar Débito Automático', undefined, payload);
    this.pushLog('info', `[1/3] Contas Correntes - PF (${environment}): enviando request ao Gateway...`);

    // POC: inicia o step 1 no tracker visual
    this.journeyProgress.startStep(JP_STEP_CONTAS_CORRENTES);

    this.executionService.execute(payload).subscribe({
      next: (execution) => {
        this.logger.info('Execução concluída (Agendar Débito Automático)', undefined, execution);
        this._lastExecution.set(execution);

        if (!execution.success) {
          const message = execution.message ?? 'A execução no TDM não foi concluída com sucesso.';
          this.pushLog('error', `[1/3] Contas Correntes - PF: falhou — ${message}`);
          this._errorMessage.set(message);
          // POC: falha no step 1
          this.journeyProgress.failStep(JP_STEP_CONTAS_CORRENTES, message);
          return;
        }

        this.pushLog(
          'success',
          `[1/3] Contas Correntes - PF: concluído (job ${execution.effectiveJobId ?? execution.requestedJobId}).`,
        );

        // Log do processamento do artefato .zip retornado pelo TDM — lido
        // e processado inteiramente em memória por este servidor (nunca
        // gravado em disco, ver storage.service.ts), pois no BEX não há
        // espaço em disco disponível/permitido para gravação de arquivos.
        if (execution.sizeBytes) {
          this.pushLog('info', `[1/3] Artefato .zip processado em memória (${execution.sizeBytes} bytes).`);
        }

        // Encadeamento do workflow: se a conta corrente foi criada com
        // sucesso (extraída do artefato), monta o contexto compartilhado
        // e dispara automaticamente o card "Habilitar Conta MA".
        const contaInfo = execution.extractedContaInfo;
        if (contaInfo?.found && contaInfo.conta) {
          const context: WorkflowContext = {
            environment,
            agencia: contaInfo.agencia || agencia || '',
            projetoJira: WORKFLOW_PROJETO_JIRA,
            conta: contaInfo.conta,
            username: formData.username || WORKFLOW_USERNAME_FALLBACK,
          };
          this.pushLog(
            'success',
            `[1/3] Conta capturada do log dentro do .zip: agência ${context.agencia}, conta ${context.conta}.`,
          );
          // POC: conclui step 1, avança para step 2
          this.journeyProgress.completeStep(JP_STEP_CONTAS_CORRENTES);
          this.executeHabilitarContaMa(context);
        } else {
          this.logger.warn(
            'Conta não foi extraída do artefato — os próximos cards não serão disparados automaticamente.',
            undefined,
            contaInfo,
          );
          this.pushLog(
            'error',
            `[1/3] Não foi possível extrair a conta do log dentro do .zip — ${
              contaInfo?.reason ?? 'motivo desconhecido'
            }. Workflow interrompido.`,
          );
          // POC: falha no step 1 com motivo
          this.journeyProgress.failStep(
            JP_STEP_CONTAS_CORRENTES,
            contaInfo?.reason ?? 'Conta não extraída do artefato',
          );
        }
      },
      error: (error: ApiError) => {
        this.pushLog('error', `[1/3] Contas Correntes - PF: erro — ${error.message}`);
        this.handleError('Falha ao executar Agendar Débito Automático no TDM', error);
        // POC: falha no step 1
        this.journeyProgress.failStep(JP_STEP_CONTAS_CORRENTES, error.message);
      },
    });
  }

  /**
   * Segunda etapa do workflow de Abertura de Contas: habilita a conta
   * corrente recém-criada no MA, usando o contexto (ambiente, agência,
   * projetoJira) da primeira etapa e a conta extraída do artefato.
   */
  private executeHabilitarContaMa(context: WorkflowContext): void {
    const payload = buildHabilitarContaMaPayload({
      agencia: context.agencia,
      conta: context.conta,
      environment: context.environment,
      projetoJira: context.projetoJira,
      username: context.username,
    });
    this.logger.debug('Payload gerado para Habilitar Conta MA', undefined, payload);
    this.pushLog(
      'info',
      `[2/3] Habilitar Conta MA (${context.environment}): enviando request ao Gateway...`,
    );

    // POC: inicia step 2
    this.journeyProgress.startStep(JP_STEP_HABILITAR_MA);

    this.executionService.execute(payload).subscribe({
      next: (execution) => {
        this.logger.info('Execução concluída (Habilitar Conta MA)', undefined, execution);
        this._lastExecution.set(execution);

        if (!execution.success) {
          const message =
            execution.message ?? 'A execução de Habilitar Conta MA no TDM não foi concluída com sucesso.';
          this.pushLog('error', `[2/3] Habilitar Conta MA: falhou — ${message}`);
          this._errorMessage.set(message);
          // POC: falha no step 2
          this.journeyProgress.failStep(JP_STEP_HABILITAR_MA, message);
          return;
        }

        this.pushLog(
          'success',
          `[2/3] Habilitar Conta MA: concluído (job ${execution.effectiveJobId ?? execution.requestedJobId}).`,
        );

        // POC: conclui step 2, avança para step 3
        this.journeyProgress.completeStep(JP_STEP_HABILITAR_MA);

        // Terceira e última etapa: Débito Automático, usando o mesmo
        // contexto (ambiente/agência/projetoJira/conta).
        this.executeDebitoAutomatico(context);
      },
      error: (error: ApiError) => {
        this.pushLog('error', `[2/3] Habilitar Conta MA: erro — ${error.message}`);
        this.handleError('Falha ao executar Habilitar Conta MA no TDM', error);
        // POC: falha no step 2
        this.journeyProgress.failStep(JP_STEP_HABILITAR_MA, error.message);
      },
    });
  }

  /**
   * Terceira e última etapa do workflow de Abertura de Contas: agenda o
   * débito automático na conta corrente recém-habilitada, usando o mesmo
   * contexto das etapas anteriores.
   */
  private executeDebitoAutomatico(context: WorkflowContext): void {
    const payload = buildDebitoAutomaticoPayload({
      agencia: context.agencia,
      conta: context.conta,
      environment: context.environment,
      projetoJira: context.projetoJira,
      username: context.username,
    });
    this.logger.debug('Payload gerado para Débito Automático', undefined, payload);
    this.pushLog(
      'info',
      `[3/3] Débito Automático (${context.environment}): enviando request ao Gateway...`,
    );

    // POC: inicia step 3
    this.journeyProgress.startStep(JP_STEP_DEBITO_AUTOMATICO);

    this.executionService.execute(payload).subscribe({
      next: (execution) => {
        this.logger.info('Execução concluída (Débito Automático)', undefined, execution);
        this._lastExecution.set(execution);

        if (!execution.success) {
          const message =
            execution.message ?? 'A execução de Débito Automático no TDM não foi concluída com sucesso.';
          this.pushLog('error', `[3/3] Débito Automático: falhou — ${message}`);
          this._errorMessage.set(message);
          // POC: falha no step 3
          this.journeyProgress.failStep(JP_STEP_DEBITO_AUTOMATICO, message);
          return;
        }

        this.pushLog(
          'success',
          `[3/3] Débito Automático: concluído (job ${execution.effectiveJobId ?? execution.requestedJobId}).`,
        );
        this.pushLog('success', 'Workflow "Abertura de Contas" concluído com sucesso.');

        // POC: conclui step 3 — jornada completa
        this.journeyProgress.completeStep(JP_STEP_DEBITO_AUTOMATICO);
      },
      error: (error: ApiError) => {
        this.pushLog('error', `[3/3] Débito Automático: erro — ${error.message}`);
        this.handleError('Falha ao executar Débito Automático no TDM', error);
        // POC: falha no step 3
        this.journeyProgress.failStep(JP_STEP_DEBITO_AUTOMATICO, error.message);
      },
    });
  }

  private pushLog(level: WorkflowLogEntry['level'], message: string): void {
    const entry: WorkflowLogEntry = {
      timestamp: new Date().toLocaleTimeString('pt-BR'),
      message,
      level,
    };
    this._workflowLog.update((log) => [...log, entry]);
  }

  private handleError(context: string, error: ApiError): void {
    this.logger.error(context, error.correlationId, error);
    this._errorMessage.set(error.message);
  }
}
