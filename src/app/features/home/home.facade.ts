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
import {
  CadastroClientesPsdcFormData,
  buildCadastroClientesPsdcPayload,
} from './builders/cadastro-clientes-psdc.builder';
import {
  ContasCorrentesPjFormData,
  buildContasCorrentesPjPayload,
} from './builders/contas-correntes-pj.builder';
import {
  ContasCorrentesPfFormData,
  buildContasCorrentesPfPayload,
} from './builders/contas-correntes-pf.builder';
import {
  HabilitarContaMaPjFormData,
  buildHabilitarContaMaPjPayload,
} from './builders/habilitar-conta-ma-pj.builder';
import {
  IncluirProcuradorPjFormData,
  buildIncluirProcuradorPjPayload,
} from './builders/incluir-procurador-pj.builder';
import {
  BrobGeracaoContratoFormData,
  buildBrobGeracaoContratoPayload,
} from './builders/brob-geracao-contrato.builder';
import { DEFAULT_WORKFLOW_ENVIRONMENT, WorkflowEnvironment } from './builders/workflow-environment';
import { WORKFLOW_PROJETO_JIRA, WORKFLOW_USERNAME_FALLBACK } from './builders/shared-request-defaults';
import { AuthService } from '../../core/services/auth.service';
// POC Journey Progress — injeção somente visual, não altera lógica de negócio
import {
  JourneyProgressService,
  ABERTURA_CONTAS_STEPS,
  MASSA_DADOS_PJ_STEPS,
} from '../../shared/services/journey-progress.service';

/** ID do primeiro card com integração real ao Gateway TDM. */
const CARD_ID_AGENDAR_DEBITO_AUTOMATICO = 'cta-003';

/** ID do card "Massa de Dados PJ". */
const CARD_ID_MASSA_DADOS_PJ = 'cta-005';

/** Step IDs do Journey Progress que espelham as etapas da jornada "Abertura de Contas". */
const JP_STEP_PORTAL_TDM = 0;        // "Portal TDM" — marcado success ao iniciar (conexão já estabelecida)
const JP_STEP_CONTAS_CORRENTES = 1;
const JP_STEP_HABILITAR_MA = 2;
const JP_STEP_DEBITO_AUTOMATICO = 3;

/** Step IDs do Journey Progress para o workflow "Massa de Dados PJ". */
const JP_PJ_STEP_PORTAL_TDM = 0;           // "Portal TDM" — marcado success ao iniciar
const JP_PJ_STEP_CADASTRO_PSDC = 1;        // "Cadastro de Clientes PSDC"
const JP_PJ_STEP_CONTAS_CORRENTES_PJ = 2;  // "Contas Correntes PJ"
const JP_PJ_STEP_CONTAS_CORRENTES_PF = 3;  // "Contas Correntes PF"
const JP_PJ_STEP_HABILITAR_CONTA_MA = 4;   // "Habilitar Conta no MA"
const JP_PJ_STEP_INCLUIR_PROCURADOR = 5;   // "Incluir Procurador PJ"
const JP_PJ_STEP_BROB_GERACAO_CONTRATO = 6; // "BROB - Geração de Contrato"

/** Linha exibida no painel de acompanhamento em tempo real do workflow. */
export interface WorkflowLogEntry {
  timestamp: string;
  message: string;
  level: 'info' | 'success' | 'error';
}

/**
 * Resumo da conta corrente criada durante o workflow — exibido de forma
 * destacada no painel "Acompanhamento do workflow", além de aparecer
 * também no log em texto corrido. Preenchido assim que a conta é
 * extraída do artefato e permanece na tela até o usuário iniciar um
 * novo workflow (não é limpo ao concluir o workflow atual).
 */
export interface CreatedAccountSummary {
  workflowLabel: string;
  agencia: string;
  conta: string;
  digito?: string;
  cpfCliente?: string;
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
  /**
   * CPF do cliente gerado no step "Contas Correntes - PF", extraído do artefato (.zip)
   * a partir do Data Pool (CCGC_CPF + CCTRL_CPF_CGC).
   * Usado posteriormente no card "BROB - Geração de Contrato".
   */
  cpfCliente?: string;
  /** CPF base utilizado no BROB. */
  cpfBase?: string;
}

interface WorkflowPjContext {
  agencia: string;
  conta: string;
  digito?: string;
  username: string;
  cpfCliente?: string;
  /** CPF base utilizado no BROB. */
  cpfBase?: string;
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
  /**
   * Resumo destacado da conta corrente criada — permanece preenchido
   * mesmo após o workflow concluir, até que um novo workflow seja
   * iniciado (ver `generateMass`, que o reseta ao começar nova execução).
   */
  private readonly _lastCreatedAccount = signal<CreatedAccountSummary | null>(null);

  readonly catalogs = computed(() => this._catalogs());
  readonly cards = computed(() => this._cards());
  readonly errorMessage = computed(() => this._errorMessage());
  readonly lastExecution = computed(() => this._lastExecution());
  readonly workflowLog = computed(() => this._workflowLog());
  readonly lastCreatedAccount = computed(() => this._lastCreatedAccount());

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
      this._lastCreatedAccount.set(null);
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

    if (cardId === CARD_ID_MASSA_DADOS_PJ) {
      this._workflowLog.set([]);
      this._lastCreatedAccount.set(null);
      this.pushLog('info', 'Workflow "Massa de Dados PJ" iniciado.');

      // Inicializa o tracker visual com 4 steps reais (Portal TDM + 4 etapas)
      this.journeyProgress.initJourney([...MASSA_DADOS_PJ_STEPS]);
      // Portal TDM: conexão já estabelecida — marca como success imediatamente
      this.journeyProgress.startStep(JP_PJ_STEP_PORTAL_TDM);
      this.journeyProgress.completeStep(JP_PJ_STEP_PORTAL_TDM);

      this.executeCadastroClientesPsdc({
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
    // Adiciona CPF base (CCGC_CPF)
    cpfBase: contaInfo.cpfCliente?.slice(0, 9),
    cpfCliente: contaInfo.cpfCliente,
  };

  this.pushLog(
    'success',
    `[1/3] Conta capturada do log dentro do .zip: agência ${context.agencia}, conta ${context.conta}. CPF Cliente: ${contaInfo.cpfCliente ?? 'não disponível'}`,
  );
  this._lastCreatedAccount.set({
    workflowLabel: 'Contas Correntes - PF',
    agencia: context.agencia,
    conta: context.conta,
    cpfCliente: contaInfo.cpfCliente,
  });
  // POC: conclui step 1, avança para step 2
  this.journeyProgress.completeStep(JP_STEP_CONTAS_CORRENTES);
  this.executeHabilitarContaMa(context);
} else {
  this.logger.warn(
    'Conta não foi extraída do artefato — os próximos cards não serão disparados automaticamente.',
    undefined,
    contaInfo,
  );
  if (contaInfo?.db2TableUnavailable) {
    this.pushLog(
      'error',
      '[1/3] ⚠️ SQLCODE=-904 detectado no artefato — tabela DB2 indisponível durante a execução. Tente novamente mais tarde.',
    );
  }
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
        if (error.code === 'TDM_DB2_TABLE_UNAVAILABLE' || error.message?.includes('SQLCODE=-904')) {
          this.pushLog(
            'error',
            '[1/3] ⚠️ SQLCODE=-904 detectado — tabela DB2 indisponível. O job foi encerrado pelo TDM. Tente novamente mais tarde.',
          );
        }
        if (error.code === 'TDM_DB2_DUPLICATE_KEY' || error.message?.includes('SQLCODE=-803')) {
          this.pushLog(
            'error',
            '[1/3] ⚠️ SQLCODE=-803 detectado — dado já cadastrado (chave duplicada). Verifique se o cliente já possui cadastro ativo antes de tentar novamente.',
          );
        }
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

  /**
   * Primeira etapa do workflow "Massa de Dados PJ":
   * submete o job "Cadastro de Clientes - PSDC" ao Gateway TDM.
   * Ao concluir com sucesso, encadeia automaticamente a segunda etapa
   * "Contas Correntes - PJ".
   */
  private executeCadastroClientesPsdc(formData: CadastroClientesPsdcFormData): void {
    const payload = buildCadastroClientesPsdcPayload(formData);
    this.logger.debug('Payload gerado para Cadastro de Clientes PSDC', undefined, payload);
    this.pushLog('info', '[1/5] Cadastro de Clientes PSDC: enviando request ao Gateway...');

    // Inicia o step 1 no tracker visual
    this.journeyProgress.startStep(JP_PJ_STEP_CADASTRO_PSDC);

    this.executionService.execute(payload).subscribe({
      next: (execution) => {
        this.logger.info('Execução concluída (Cadastro de Clientes PSDC)', undefined, execution);
        this._lastExecution.set(execution);

        if (!execution.success) {
          const message =
            execution.message ?? 'A execução de Cadastro de Clientes PSDC no TDM não foi concluída com sucesso.';
          this.pushLog('error', `[1/5] Cadastro de Clientes PSDC: falhou — ${message}`);
          this._errorMessage.set(message);
          this.journeyProgress.failStep(JP_PJ_STEP_CADASTRO_PSDC, message);
          return;
        }

        this.pushLog(
          'success',
          `[1/5] Cadastro de Clientes PSDC: concluído (job ${execution.effectiveJobId ?? execution.requestedJobId}).`,
        );

        if (execution.sizeBytes) {
          this.pushLog('info', `[1/5] Artefato .zip processado em memória (${execution.sizeBytes} bytes).`);
        }

        // Conclui step 1 e encadeia step 2
        this.journeyProgress.completeStep(JP_PJ_STEP_CADASTRO_PSDC);
        this.executeContasCorrentesPj({
          username: formData.username,
        });
      },
      error: (error: ApiError) => {
        this.pushLog('error', `[1/5] Cadastro de Clientes PSDC: erro — ${error.message}`);
        this.handleError('Falha ao executar Cadastro de Clientes PSDC no TDM', error);
        this.journeyProgress.failStep(JP_PJ_STEP_CADASTRO_PSDC, error.message);
      },
    });
  }

  /**
   * Segunda etapa do workflow "Massa de Dados PJ":
   * submete o job "Contas Correntes - PJ Data Request" ao Gateway TDM.
   * Ao concluir com sucesso, encadeia automaticamente a terceira etapa
   * "Contas Correntes - PF".
   */
  private executeContasCorrentesPj(formData: ContasCorrentesPjFormData): void {
    const payload = buildContasCorrentesPjPayload(formData);
    this.logger.debug('Payload gerado para Contas Correntes PJ', undefined, payload);
    this.pushLog('info', '[2/5] Contas Correntes - PJ: enviando request ao Gateway...');

    // Inicia o step 2 no tracker visual
    this.journeyProgress.startStep(JP_PJ_STEP_CONTAS_CORRENTES_PJ);

    this.executionService.execute(payload).subscribe({
      next: (execution) => {
        this.logger.info('Execução concluída (Contas Correntes PJ)', undefined, execution);
        this._lastExecution.set(execution);

        if (!execution.success) {
          const message =
            execution.message ?? 'A execução de Contas Correntes PJ no TDM não foi concluída com sucesso.';
          this.pushLog('error', `[2/5] Contas Correntes - PJ: falhou — ${message}`);
          this._errorMessage.set(message);
          this.journeyProgress.failStep(JP_PJ_STEP_CONTAS_CORRENTES_PJ, message);
          return;
        }

        this.pushLog(
          'success',
          `[2/5] Contas Correntes - PJ: concluído (job ${execution.effectiveJobId ?? execution.requestedJobId}).`,
        );

        if (execution.sizeBytes) {
          this.pushLog('info', `[2/5] Artefato .zip processado em memória (${execution.sizeBytes} bytes).`);
        }

        this.journeyProgress.completeStep(JP_PJ_STEP_CONTAS_CORRENTES_PJ);
        this.executeContasCorrentesPf({
          username: formData.username,
        });
      },
      error: (error: ApiError) => {
        this.pushLog('error', `[2/5] Contas Correntes - PJ: erro — ${error.message}`);
        this.handleError('Falha ao executar Contas Correntes PJ no TDM', error);
        this.journeyProgress.failStep(JP_PJ_STEP_CONTAS_CORRENTES_PJ, error.message);
      },
    });
  }

  /**
   *. Terceira etapa do workflow "Massa de Dados PJ":
   * submete o job "Contas Correntes - PF Data Request" ao Gateway TDM.
   * Ao concluir com sucesso, dispara automaticamente o step
   * "Habilitar Conta no MA" usando a agência/conta extraídas da etapa PJ.
   */
  private executeContasCorrentesPf(formData: ContasCorrentesPfFormData): void {
    const payload = buildContasCorrentesPfPayload(formData);
    this.logger.debug('Payload gerado para Contas Correntes PF', undefined, payload);
    this.pushLog('info', '[3/5] Contas Correntes - PF: enviando request ao Gateway...');

    this.journeyProgress.startStep(JP_PJ_STEP_CONTAS_CORRENTES_PF);

    this.executionService.execute(payload).subscribe({
      next: (execution) => {
        this.logger.info('Execução concluída (Contas Correntes PF)', undefined, execution);
        this._lastExecution.set(execution);

        if (!execution.success) {
          const message =
            execution.message ?? 'A execução de Contas Correntes PF no TDM não foi concluída com sucesso.';
          this.pushLog('error', `[3/5] Contas Correntes - PF: falhou — ${message}`);
          this._errorMessage.set(message);
          this.journeyProgress.failStep(JP_PJ_STEP_CONTAS_CORRENTES_PF, message);
          return;
        }

        this.pushLog(
          'success',
          `[3/5] Contas Correntes - PF: concluído (job ${execution.effectiveJobId ?? execution.requestedJobId}).`,
        );

        if (execution.sizeBytes) {
          this.pushLog('info', `[3/5] Artefato .zip processado em memória (${execution.sizeBytes} bytes).`);
        }

        const contaInfo = execution.extractedContaInfo;
        const hasContaPf = Boolean(contaInfo?.found && contaInfo.agencia && contaInfo.conta);
        const hasCpfCliente = Boolean(contaInfo?.cpfCliente);

        if (hasContaPf) {
          const context: WorkflowPjContext = {
            agencia: contaInfo!.agencia!,
            conta: contaInfo!.conta!,
            digito: contaInfo!.digito,
            username: formData.username || WORKFLOW_USERNAME_FALLBACK,
            cpfCliente: contaInfo!.cpfCliente,
            cpfBase: contaInfo!.cpfCliente?.slice(0, 9),
          };

          this.pushLog(
            'success',
            `[3/5] Conta PF capturada do log: agência ${context.agencia}, conta ${context.conta}${
              context.digito != null ? `, dígito ${context.digito}` : ''
            }.`,
          );

          if (hasCpfCliente) {
            this.pushLog(
              'success',
              `[3/5] CPF Cliente capturado do Data Pool e concatenado: ${contaInfo!.cpfCliente}`,
            );
          } else {
            this.pushLog('error', '[3/5] CPF Cliente não encontrado no Data Pool (CCGC_CPF/CCTRL_CPF_CGC).');
          }

          this._lastCreatedAccount.set({
            workflowLabel: 'Contas Correntes - PF',
            agencia: context.agencia,
            conta: context.conta,
            digito: context.digito,
            cpfCliente: contaInfo!.cpfCliente,
          });

          this.journeyProgress.completeStep(JP_PJ_STEP_CONTAS_CORRENTES_PF);
          this.executeHabilitarContaMaPj(context);
          return;
        }

        if (hasCpfCliente) {
          this.pushLog(
            'success',
            `[3/5] CPF Cliente capturado do Data Pool e concatenado: ${contaInfo!.cpfCliente}`,
          );
        }

        if (contaInfo?.db2TableUnavailable) {
          this.pushLog(
            'error',
            '[3/5] ⚠️ SQLCODE=-904 detectado no artefato — tabela DB2 indisponível durante a execução. Tente novamente mais tarde.',
          );
        }
        if (contaInfo?.db2DuplicateKey) {
          this.pushLog(
            'error',
            '[3/5] ⚠️ SQLCODE=-803 detectado no artefato — dado já cadastrado (chave duplicada). Verifique se o cliente já possui cadastro ativo antes de tentar novamente.',
          );
        }
        this._errorMessage.set(
          contaInfo?.reason ?? 'Não foi possível extrair agência/conta do artefato do step PJ.',
        );
        this.pushLog(
          'error',
          `[3/5] Não foi possível extrair agência/conta do artefato do step PJ — ${
            contaInfo?.reason ?? 'motivo desconhecido'
          }. Workflow interrompido.`,
        );
        this.journeyProgress.failStep(
          JP_PJ_STEP_CONTAS_CORRENTES_PF,
          contaInfo?.reason ?? 'Agência/conta não extraídas do artefato',
        );
      },
      error: (error: ApiError) => {
        if (error.code === 'TDM_DB2_TABLE_UNAVAILABLE' || error.message?.includes('SQLCODE=-904')) {
          this.pushLog(
            'error',
            '[3/5] ⚠️ SQLCODE=-904 detectado — tabela DB2 indisponível. O job foi encerrado pelo TDM. Tente novamente mais tarde.',
          );
        }
        if (error.code === 'TDM_DB2_DUPLICATE_KEY' || error.message?.includes('SQLCODE=-803')) {
          this.pushLog(
            'error',
            '[3/5] ⚠️ SQLCODE=-803 detectado — dado já cadastrado (chave duplicada). Verifique se o cliente já possui cadastro ativo antes de tentar novamente.',
          );
        }
        this.pushLog('error', `[3/5] Contas Correntes - PF: erro — ${error.message}`);
        this.handleError('Falha ao executar Contas Correntes PF no TDM', error);
        this.journeyProgress.failStep(JP_PJ_STEP_CONTAS_CORRENTES_PF, error.message);
      },
    });
  }

  /**
   * Quarta e última etapa do workflow "Massa de Dados PJ":
   * habilita a conta no MA usando agência/conta extraídas da própria
   * jornada cta-005.
   */
  private executeHabilitarContaMaPj(context: WorkflowPjContext): void {
    const payload = buildHabilitarContaMaPjPayload({
      agencia: context.agencia,
      conta: context.conta,
      username: context.username,
    });
    this.logger.debug('Payload gerado para Habilitar Conta no MA (PJ)', undefined, payload);
    this.pushLog('info', '[4/5] Habilitar Conta no MA: enviando request ao Gateway...');

    this.journeyProgress.startStep(JP_PJ_STEP_HABILITAR_CONTA_MA);

    this.executionService.execute(payload).subscribe({
      next: (execution) => {
        this.logger.info('Execução concluída (Habilitar Conta no MA - PJ)', undefined, execution);
        this._lastExecution.set(execution);

        if (!execution.success) {
          const message =
            execution.message ?? 'A execução de Habilitar Conta no MA no TDM não foi concluída com sucesso.';
          this.pushLog('error', `[4/5] Habilitar Conta no MA: falhou — ${message}`);
          this._errorMessage.set(message);
          this.journeyProgress.failStep(JP_PJ_STEP_HABILITAR_CONTA_MA, message);
          return;
        }

        this.pushLog(
          'success',
          `[4/5] Habilitar Conta no MA: concluído (job ${execution.effectiveJobId ?? execution.requestedJobId}).`,
        );

        this.journeyProgress.completeStep(JP_PJ_STEP_HABILITAR_CONTA_MA);

        // Quinta etapa: Incluir Procurador PJ, reutilizando a
        // mesma agência/conta já extraídas do step "Contas Correntes - PF".
        this.executeIncluirProcuradorPj(context);
      },
      error: (error: ApiError) => {
        this.pushLog('error', `[4/5] Habilitar Conta no MA: erro — ${error.message}`);
        this.handleError('Falha ao executar Habilitar Conta no MA (PJ) no TDM', error);
        this.journeyProgress.failStep(JP_PJ_STEP_HABILITAR_CONTA_MA, error.message);
      },
    });
  }

  /**
   * Quinta etapa do workflow "Massa de Dados PJ":
   * inclui procurador na conta PJ recém-habilitada no MA, usando a mesma
   * agência/conta extraídas do step "Contas Correntes - PF".
   */
  private executeIncluirProcuradorPj(context: WorkflowPjContext): void {
    const payload = buildIncluirProcuradorPjPayload({
      agencia: context.agencia,
      conta: context.conta,
      username: context.username,
    });
    this.logger.debug('Payload gerado para Incluir Procurador PJ', undefined, payload);
    this.pushLog('info', '[5/5] Incluir Procurador PJ: enviando request ao Gateway...');

    this.journeyProgress.startStep(JP_PJ_STEP_INCLUIR_PROCURADOR);

    this.executionService.execute(payload).subscribe({
      next: (execution) => {
        this.logger.info('Execução concluída (Incluir Procurador PJ)', undefined, execution);
        this._lastExecution.set(execution);

        if (!execution.success) {
          const message =
            execution.message ?? 'A execução de Incluir Procurador PJ no TDM não foi concluída com sucesso.';
          this.pushLog('error', `[5/5] Incluir Procurador PJ: falhou — ${message}`);
          this._errorMessage.set(message);
          this.journeyProgress.failStep(JP_PJ_STEP_INCLUIR_PROCURADOR, message);
          return;
        }

        this.pushLog(
          'success',
          `[5/6] Incluir Procurador PJ: concluído (job ${execution.effectiveJobId ?? execution.requestedJobId}).`,
        );

        this.journeyProgress.completeStep(JP_PJ_STEP_INCLUIR_PROCURADOR);
        this.executeBrobGeracaoContrato({
          agencia: context.agencia,
          conta: context.conta,
          cpfCliente: context.cpfCliente ?? '',
          cpfBase: context.cpfBase ?? '',
          username: context.username,
        });
      },
      error: (error: ApiError) => {
        this.pushLog('error', `[5/5] Incluir Procurador PJ: erro — ${error.message}`);
        this.handleError('Falha ao executar Incluir Procurador PJ no TDM', error);
        this.journeyProgress.failStep(JP_PJ_STEP_INCLUIR_PROCURADOR, error.message);
      },
    });
  }

  /**
   * Sexta etapa do workflow "Massa de Dados PJ":
   * envia payload ao BROB - Geração de Contrato.
   */
  private executeBrobGeracaoContrato(formData: BrobGeracaoContratoFormData): void {
    const payload = buildBrobGeracaoContratoPayload(formData);
    this.logger.debug('Payload gerado para BROB - Geração de Contrato', undefined, payload);
    this.pushLog('info', '[6/6] BROB - Geração de Contrato: enviando request ao Gateway...');

    this.journeyProgress.startStep(JP_PJ_STEP_BROB_GERACAO_CONTRATO);

    this.executionService.execute(payload).subscribe({
      next: (execution) => {
        this.logger.info('Execução concluída (BROB - Geração de Contrato)', undefined, execution);
        this._lastExecution.set(execution);

        if (!execution.success) {
          const message =
            execution.message ?? 'A execução de BROB - Geração de Contrato no TDM não foi concluída com sucesso.';
          this.pushLog('error', `[6/6] BROB - Geração de Contrato: falhou — ${message}`);
          this._errorMessage.set(message);
          this.journeyProgress.failStep(JP_PJ_STEP_BROB_GERACAO_CONTRATO, message);
          return;
        }

        this.pushLog(
          'success',
          `[6/6] BROB - Geração de Contrato: concluído (job ${execution.effectiveJobId ?? execution.requestedJobId}).`,
        );

        this.pushLog('success', 'Workflow "Massa de Dados PJ" concluído com sucesso.');

        this.journeyProgress.completeStep(JP_PJ_STEP_BROB_GERACAO_CONTRATO);
      },
      error: (error: ApiError) => {
        this.pushLog('error', `[6/6] BROB - Geração de Contrato: erro — ${error.message}`);
        this.handleError('Falha ao executar BROB - Geração de Contrato no TDM', error);
        this.journeyProgress.failStep(JP_PJ_STEP_BROB_GERACAO_CONTRATO, error.message);
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
