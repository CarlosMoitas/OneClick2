import { AppError } from '../middleware/error.middleware';
import { logger } from '../logging/logger';
import { extractAccountInfoFromZip } from '../storage/artifact-extractor';
import { SubmitRequestPayload } from './tdm.types';
import { tdmService } from './tdm.service';

export type MassaDadosPJEnvironment = 'TI' | 'TU';

const DEFAULT_WORKFLOW_ENVIRONMENT: MassaDadosPJEnvironment = 'TU';
const WORKFLOW_PROJETO_JIRA = 'ENGPBIA-ENGENHARIA DE PLATAFORMA | BIA TECH';
const WORKFLOW_EMAIL = 'Carlos.AndreMoitas@emeal.nttdata.com';
const WORKFLOW_USERNAME_FALLBACK = 'm627529';
const DEFAULT_AGENCY = '3995';

function resolveContaEnvironment(environment: MassaDadosPJEnvironment): string {
  return environment === 'TI' ? 'PCM2AB  - NOVO TI' : 'PCM2AB  - NOVO TU';
}

export interface MassaDadosPJJourneyRequest {
  environment?: MassaDadosPJEnvironment;
  agency?: string;
  username?: string;
}

export interface MassaDadosPJStepResult {
  step:
    | 'cadastro-clientes-psdc'
    | 'contas-correntes-pj'
    | 'contas-correntes-pf'
    | 'habilitar-conta-ma'
    | 'incluir-procurador-pj'
    | 'brob-geracao-contrato';
  requestedJobId: number;
  childJobId: number | null;
  effectiveJobId: number;
  parentStatus?: string;
  childStatus?: string;
  sizeBytes: number;
  extractedContaInfo?: {
    agencia?: string;
    conta?: string;
    cpfCliente?: string;
    found?: boolean;
    reason?: string;
  };
}

export interface MassaDadosPJJourneyResponse {
  success: boolean;
  environment: MassaDadosPJEnvironment;
  agencyRequested: string;
  contaGerada?: {
    agencia: string;
    conta: string;
  };
  cpfCliente?: string;
  steps: MassaDadosPJStepResult[];
}

function createBaseJobPubParams(now: Date, username: string) {
  return {
    scheduledDateTimeInMillisec: now.toISOString(),
    almjobs: [],
    rallyJobs: [],
    jobParams: [],
    testMatches: [],
    exportJobs: [],
    scheduledDt: now.toISOString(),
    selfServiceEmailMandate: false,
    email: WORKFLOW_EMAIL,
    globalThreadName: 'ANY',
    scheduledDateTimeInMillis: now.getTime(),
    currentDay: now.getDate(),
    currentMonth: now.getMonth() + 1,
    currentYear: now.getFullYear(),
    jobSubmissionOrder: '0',
    username,
  };
}

function buildCadastroClientesPsdcPayload(input: MassaDadosPJJourneyRequest): SubmitRequestPayload {
  const now = new Date();
  const username = input.username || WORKFLOW_USERNAME_FALLBACK;

  return {
    jobPubParams: {
      ...createBaseJobPubParams(now, username),
      publishJobs: [
        {
          batchEngineThread: 'ANY',
          dataSourceProfile: '',
          dataTargetProfile: '',
          description: '',
          jobTitle: 'Group Job',
          levelID: 4338,
          publishVariables: [
            { name: 'p_tipo_cnpj', preResolveError: '', preResolveValue: '', value: '01-Numérico' },
            { name: 'p_porte_empresa', preResolveError: '', preResolveValue: '', value: '01-MICROEMPRESA ' },
            { name: 'p_Const_Empresa', preResolveError: '', preResolveValue: '', value: '00 - EMPRESA INDIVIDUAL' },
            { name: 'p_projeto_jira', preResolveError: '', preResolveValue: '', value: WORKFLOW_PROJETO_JIRA },
          ],
          seq: 1,
          vtfnodeDesc: '******GERAR NO MAXIMO 10 CNPJS POR VEZ********',
          vtfnodeID: '2430',
          vtfnodeName: 'Cadastro PJ Alfa - 01 Sócio',
          iterations: 1,
          csvDelimiter: null,
          csvQuotationMarks: null,
          configurationId: 2762,
        },
      ],
      globalSourceConnection: '',
      globalTargetConnection: '',
      jobTitle: 'Cadastro de Clientes PSDC Data Request',
    },
    dataDesign: {
      projectID: 2956,
      versionID: 2957,
    },
    publishVariables: [],
    advancedToggleFlag: true,
    almjobs: [],
    rallyJobs: [],
    jobParams: [],
    testMatches: [],
    exportJobs: [],
  };
}

function buildContasCorrentesPjPayload(input: MassaDadosPJJourneyRequest): SubmitRequestPayload {
  const now = new Date();
  const username = input.username || WORKFLOW_USERNAME_FALLBACK;
  const environment = input.environment ?? DEFAULT_WORKFLOW_ENVIRONMENT;
  const agency = input.agency || DEFAULT_AGENCY;

  return {
    jobPubParams: {
      ...createBaseJobPubParams(now, username),
      publishJobs: [
        {
          batchEngineThread: 'ANY',
          dataSourceProfile: '',
          dataTargetProfile: '',
          description: '',
          jobTitle: 'Group Job',
          levelID: 2954,
          publishVariables: [
            { name: 'p_tipo_cnpj', preResolveError: '', preResolveValue: '', value: '01-Numérico' },
            {
              name: 'p_ambiente_gerar_conta',
              preResolveError: '',
              preResolveValue: '',
              value: resolveContaEnvironment(environment),
            },
            { name: 'P_SEGMENTOCONTACORRENTEPJ', preResolveError: '', preResolveValue: '', value: '000-NAO SEGMENTADA' },
            { name: 'p_agencia', preResolveError: '', preResolveValue: '', value: agency },
            { name: 'P_CNPJ', preResolveError: '', preResolveValue: '', value: '0' },
            { name: 'p_porte_empresa_conta', preResolveError: '', preResolveValue: '', value: '03-MÉDIA EMPRESA' },
            { name: 'p_projeto_jira', preResolveError: '', preResolveValue: '', value: WORKFLOW_PROJETO_JIRA },
          ],
          seq: 1,
          vtfnodeDesc: 'Abertura de Conta Corrente PJ Numérico',
          vtfnodeID: '440',
          vtfnodeName: 'Abertura de Conta Corrente PJ Numérico',
          iterations: 1,
          csvDelimiter: null,
          csvQuotationMarks: null,
          configurationId: 2991,
        },
      ],
      globalSourceConnection: '',
      globalTargetConnection: '',
      jobTitle: 'Contas Correntes - PJ Data Request',
    },
    dataDesign: {
      projectID: 2476,
      versionID: 2477,
    },
    publishVariables: [],
    advancedToggleFlag: true,
    almjobs: [],
    rallyJobs: [],
    jobParams: [],
    testMatches: [],
    exportJobs: [],
  };
}

function buildContasCorrentesPfPayload(input: MassaDadosPJJourneyRequest): SubmitRequestPayload {
  const now = new Date();
  const username = input.username || WORKFLOW_USERNAME_FALLBACK;
  const environment = input.environment ?? DEFAULT_WORKFLOW_ENVIRONMENT;
  const agency = input.agency || DEFAULT_AGENCY;

  return {
    jobPubParams: {
      ...createBaseJobPubParams(now, username),
      publishJobs: [
        {
          batchEngineThread: 'ANY',
          dataSourceProfile: '',
          dataTargetProfile: '',
          description: '',
          jobTitle: 'Group Job',
          levelID: 3309,
          publishVariables: [
            {
              name: 'p_ambiente_gerar_conta',
              preResolveError: '',
              preResolveValue: '',
              value: resolveContaEnvironment(environment),
            },
            { name: 'p_SegmentoContaCorretePF', preResolveError: '', preResolveValue: '', value: '000-CLIENTE CLASSIC' },
            { name: 'p_agencia', preResolveError: '', preResolveValue: '', value: agency },
            { name: 'p_cpf', preResolveError: '', preResolveValue: '', value: '0' },
            { name: 'p_qtdcontas_ger', preResolveError: '', preResolveValue: '', value: '1' },
            { name: 'p_projeto_jira', preResolveError: '', preResolveValue: '', value: WORKFLOW_PROJETO_JIRA },
            { name: 'p_tp_disp', preResolveError: '', preResolveValue: '', value: 'SEM DISPOSITIVO' },
          ],
          seq: 1,
          vtfnodeDesc: '02 - Conta Corrente PF',
          vtfnodeID: '11020',
          vtfnodeName: '02 - Conta Corrente PF',
          iterations: 1,
          csvDelimiter: null,
          csvQuotationMarks: null,
          configurationId: 2985,
        },
      ],
      globalSourceConnection: '',
      globalTargetConnection: '',
      jobTitle: 'Contas Correntes - PF Data Request',
    },
    dataDesign: {
      projectID: 2476,
      versionID: 2477,
    },
    publishVariables: [],
    advancedToggleFlag: true,
    almjobs: [],
    rallyJobs: [],
    jobParams: [],
    testMatches: [],
    exportJobs: [],
  };
}

function buildHabilitarContaMaPayload(params: {
  agencia: string;
  conta: string;
  username: string;
}): SubmitRequestPayload {
  const now = new Date();

  return {
    jobPubParams: {
      ...createBaseJobPubParams(now, params.username),
      publishJobs: [
        {
          batchEngineThread: 'ANY',
          dataSourceProfile: '',
          dataTargetProfile: '',
          description: '',
          jobTitle: 'Group Job',
          levelID: 4593,
          publishVariables: [
            { name: 'P_AGENCIA_MA', preResolveError: '', preResolveValue: '', value: params.agencia },
            { name: 'P_CONTA_MA', preResolveError: '', preResolveValue: '', value: params.conta },
            { name: 'p_projeto_jira', preResolveError: '', preResolveValue: '', value: WORKFLOW_PROJETO_JIRA },
          ],
          seq: 1,
          vtfnodeDesc: 'Habilitar MA NOVO TI',
          vtfnodeID: '540',
          vtfnodeName: 'Habilitar MA NOVO TI',
          iterations: 1,
          csvDelimiter: null,
          csvQuotationMarks: null,
          configurationId: 3032,
        },
      ],
      globalSourceConnection: '',
      globalTargetConnection: '',
      jobTitle: 'Habilitar Conta no MA Data Request',
    },
    dataDesign: {
      projectID: 3862,
      versionID: 3863,
    },
    publishVariables: [],
    advancedToggleFlag: true,
    almjobs: [],
    rallyJobs: [],
    jobParams: [],
    testMatches: [],
    exportJobs: [],
  };
}

function buildIncluirProcuradorPjPayload(params: {
  agencia: string;
  conta: string;
  username: string;
}): SubmitRequestPayload {
  const now = new Date();

  return {
    jobPubParams: {
      ...createBaseJobPubParams(now, params.username),
      publishJobs: [
        {
          batchEngineThread: 'ANY',
          dataSourceProfile: '',
          dataTargetProfile: '',
          description: '',
          jobTitle: 'Group Job',
          levelID: 3922,
          publishVariables: [
            { name: 'p_agencia', preResolveError: '', preResolveValue: '', value: params.agencia },
            { name: 'p_conta_corrente_proc', preResolveError: '', preResolveValue: '', value: params.conta },
            { name: 'p_cpf_procurador', preResolveError: '', preResolveValue: '', value: '0' },
            { name: 'p_forma_ass', preResolveError: '', preResolveValue: '', value: 'INDIVIDUAL' },
            { name: 'p_projeto_jira', preResolveError: '', preResolveValue: '', value: WORKFLOW_PROJETO_JIRA },
          ],
          seq: 1,
          vtfnodeDesc: 'Incluir Procurador (Em conta PJ)',
          vtfnodeID: '420',
          vtfnodeName: 'Incluir Procurador (Em conta PJ)',
          iterations: 1,
          csvDelimiter: null,
          csvQuotationMarks: null,
          configurationId: 2066,
        },
      ],
      globalSourceConnection: '',
      globalTargetConnection: '',
      jobTitle: 'Incluir Procurador em conta PJ Data Request',
    },
    dataDesign: {
      projectID: 3862,
      versionID: 3863,
    },
    publishVariables: [],
    advancedToggleFlag: true,
    almjobs: [],
    rallyJobs: [],
    jobParams: [],
    testMatches: [],
    exportJobs: [],
  };
}

function buildBrobGeracaoContratoPayload(params: {
  agencia: string;
  conta: string;
  cpfCliente: string;
  cpfBase?: string;
  username: string;
}): SubmitRequestPayload {
  const now = new Date();

  return {
    jobPubParams: {
      ...createBaseJobPubParams(now, params.username),
      publishJobs: [
        {
          batchEngineThread: 'ANY',
          dataSourceProfile: '',
          dataTargetProfile: '',
          description: '',
          jobTitle: 'Group Job',
          levelID: 3211,
          publishVariables: [
            { name: 'p_agcontr', preResolveError: '', preResolveValue: '', value: params.agencia },
            { name: 'p_contacontr', preResolveError: '', preResolveValue: '', value: params.conta },
            {
              name: 'p_cpf_brob',
              preResolveError: '',
              preResolveValue: '',
              value: params.cpfBase ?? params.cpfCliente ?? '',
            },
            { name: 'p_projeto_jira', preResolveError: '', preResolveValue: '', value: WORKFLOW_PROJETO_JIRA },
          ],
          seq: 1,
          vtfnodeDesc: 'BROB - Geração de Contrato',
          vtfnodeID: '420',
          vtfnodeName: 'BROB - Geração de Contrato',
          iterations: 1,
          csvDelimiter: null,
          csvQuotationMarks: null,
          configurationId: 2067,
        },
      ],
      globalSourceConnection: '',
      globalTargetConnection: '',
      jobTitle: 'BROB - Geração de Contrato Data Request',
    },
    dataDesign: {
      projectID: 3138,
      versionID: 3139,
    },
    publishVariables: [],
    advancedToggleFlag: true,
    almjobs: [],
    rallyJobs: [],
    jobParams: [],
    testMatches: [],
    exportJobs: [],
  };
}

export async function executarJornadaMassaDadosPJ(
  input: MassaDadosPJJourneyRequest,
  correlationId?: string,
  userToken?: string,
): Promise<MassaDadosPJJourneyResponse> {
  const environment = input.environment ?? DEFAULT_WORKFLOW_ENVIRONMENT;
  const username = input.username || WORKFLOW_USERNAME_FALLBACK;
  const agencyRequested = input.agency || DEFAULT_AGENCY;
  const steps: MassaDadosPJStepResult[] = [];

  logger.info('Iniciando jornada Massa de Dados PJ (cta-005)', correlationId, {
    environment,
    agencyRequested,
    username,
  });

  const step1 = await tdmService.submitAndDownload(
    buildCadastroClientesPsdcPayload({ environment, agency: agencyRequested, username }),
    correlationId,
    userToken,
  );

  steps.push({
    step: 'cadastro-clientes-psdc',
    requestedJobId: step1.requestedJobId,
    childJobId: step1.childJobId,
    effectiveJobId: step1.effectiveJobId,
    parentStatus: step1.parentStatus,
    childStatus: step1.childStatus,
    sizeBytes: step1.artifact.sizeBytes,
  });

  const step2 = await tdmService.submitAndDownload(
    buildContasCorrentesPjPayload({ environment, agency: agencyRequested, username }),
    correlationId,
    userToken,
  );

  steps.push({
    step: 'contas-correntes-pj',
    requestedJobId: step2.requestedJobId,
    childJobId: step2.childJobId,
    effectiveJobId: step2.effectiveJobId,
    parentStatus: step2.parentStatus,
    childStatus: step2.childStatus,
    sizeBytes: step2.artifact.sizeBytes,
  });

  const step3 = await tdmService.submitAndDownload(
    buildContasCorrentesPfPayload({ environment, agency: agencyRequested, username }),
    correlationId,
    userToken,
  );

  const contaInfo = extractAccountInfoFromZip(step3.artifact.buffer, step3.effectiveJobId);

  steps.push({
    step: 'contas-correntes-pf',
    requestedJobId: step3.requestedJobId,
    childJobId: step3.childJobId,
    effectiveJobId: step3.effectiveJobId,
    parentStatus: step3.parentStatus,
    childStatus: step3.childStatus,
    sizeBytes: step3.artifact.sizeBytes,
    extractedContaInfo: {
      found: contaInfo.found,
      agencia: contaInfo.agencia,
      conta: contaInfo.conta,
      cpfCliente: contaInfo.cpfCliente,
      reason: contaInfo.reason,
    },
  });

  if (!contaInfo?.found || !contaInfo.conta || !contaInfo.agencia) {
    throw new AppError(
      502,
      `A jornada foi interrompida porque não foi possível extrair agência/conta do artefato da etapa 3. ${
        contaInfo?.reason ?? ''
      }`.trim(),
      'JORNADA_MASSA_PJ_CONTA_NAO_EXTRAIDA',
      contaInfo,
    );
  }

  if (!contaInfo.cpfCliente) {
    throw new AppError(
      502,
      `A jornada foi interrompida porque não foi possível extrair o cpfCliente do artefato da etapa 3. ${
        contaInfo?.reason ?? ''
      }`.trim(),
      'JORNADA_MASSA_PJ_CPF_NAO_EXTRAIDO',
      contaInfo,
    );
  }

  const step4 = await tdmService.submitAndDownload(
    buildHabilitarContaMaPayload({
      agencia: contaInfo.agencia,
      conta: contaInfo.conta,
      username,
    }),
    correlationId,
    userToken,
  );

  steps.push({
    step: 'habilitar-conta-ma',
    requestedJobId: step4.requestedJobId,
    childJobId: step4.childJobId,
    effectiveJobId: step4.effectiveJobId,
    parentStatus: step4.parentStatus,
    childStatus: step4.childStatus,
    sizeBytes: step4.artifact.sizeBytes,
  });

  const step5 = await tdmService.submitAndDownload(
    buildIncluirProcuradorPjPayload({
      agencia: contaInfo.agencia,
      conta: contaInfo.conta,
      username,
    }),
    correlationId,
    userToken,
  );

  steps.push({
    step: 'incluir-procurador-pj',
    requestedJobId: step5.requestedJobId,
    childJobId: step5.childJobId,
    effectiveJobId: step5.effectiveJobId,
    parentStatus: step5.parentStatus,
    childStatus: step5.childStatus,
    sizeBytes: step5.artifact.sizeBytes,
  });

  const step6 = await tdmService.submitAndDownload(
    buildBrobGeracaoContratoPayload({
      agencia: contaInfo.agencia,
      conta: contaInfo.conta,
      cpfCliente: contaInfo.cpfCliente,
      cpfBase: contaInfo.cpfBase,
      username,
    }),
    correlationId,
    userToken,
  );

  steps.push({
    step: 'brob-geracao-contrato',
    requestedJobId: step6.requestedJobId,
    childJobId: step6.childJobId,
    effectiveJobId: step6.effectiveJobId,
    parentStatus: step6.parentStatus,
    childStatus: step6.childStatus,
    sizeBytes: step6.artifact.sizeBytes,
  });

  return {
    success: true,
    environment,
    agencyRequested,
    contaGerada: {
      agencia: contaInfo.agencia,
      conta: contaInfo.conta,
    },
    cpfCliente: contaInfo.cpfCliente,
    steps,
  };
}
