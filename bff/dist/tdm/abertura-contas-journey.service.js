"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.executarJornadaAberturaContas = executarJornadaAberturaContas;
const error_middleware_1 = require("../middleware/error.middleware");
const logger_1 = require("../logging/logger");
const tdm_service_1 = require("./tdm.service");
const DEFAULT_WORKFLOW_ENVIRONMENT = 'TU';
const WORKFLOW_PROJETO_JIRA = 'ENGPBIA-ENGENHARIA DE PLATAFORMA | BIA TECH';
const WORKFLOW_EMAIL = 'carlosandre.moitas@bradesco.com.br';
const WORKFLOW_USERNAME_FALLBACK = 'm627529';
const DEFAULT_AGENCY = '3995';
const CONTAS_CORRENTES_CONFIG = {
    TU: {
        ambienteLabel: 'PDB204P - TU',
        segmentoContaCorretePF: '000-CLIENTE CLASSIC',
        configurationId: 2985,
        connectionProfile: 'DB204P',
    },
    TI: {
        ambienteLabel: 'PCM2AB  - NOVO TI',
        segmentoContaCorretePF: '',
        configurationId: 2985,
        connectionProfile: 'PCM2AB',
    },
};
const HABILITAR_CONTA_MA_CONFIG = {
    TU: {
        levelID: 4588,
        configurationId: 3019,
        vtfnodeID: '420',
        vtfnodeName: 'Habilitar Conta MA TU',
        connectionProfile: 'DB204P',
    },
    TI: {
        levelID: 4593,
        configurationId: 3032,
        vtfnodeID: '540',
        vtfnodeName: 'Habilitar MA NOVO TI',
        connectionProfile: 'PCM2AB',
    },
};
const DEBITO_AUTOMATICO_CONFIG = {
    TU: { configurationId: 845, connectionProfile: 'DB204P' },
    TI: { configurationId: 845, connectionProfile: 'PCM2AB' },
};
function getContasCorrentesEnvConfig(environment) {
    return CONTAS_CORRENTES_CONFIG[environment];
}
function getHabilitarContaMaEnvConfig(environment) {
    return HABILITAR_CONTA_MA_CONFIG[environment];
}
function getDebitoAutomaticoEnvConfig(environment) {
    return DEBITO_AUTOMATICO_CONFIG[environment];
}
function createBaseJobPubParams(now, username) {
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
function buildContasCorrentesPfPayload(input) {
    const now = new Date();
    const environment = input.environment ?? DEFAULT_WORKFLOW_ENVIRONMENT;
    const envConfig = getContasCorrentesEnvConfig(environment);
    const username = input.username || WORKFLOW_USERNAME_FALLBACK;
    return {
        jobPubParams: {
            ...createBaseJobPubParams(now, username),
            publishJobs: [
                {
                    batchEngineThread: 'ANY',
                    dataSourceProfile: 'DB204P',
                    dataTargetProfile: 'DB204P',
                    description: '',
                    jobTitle: 'Group Job',
                    levelID: 3309,
                    publishVariables: [
                        { name: 'p_ambiente_gerar_conta', preResolveError: '', preResolveValue: '', value: envConfig.ambienteLabel },
                        { name: 'p_SegmentoContaCorretePF', preResolveError: '', preResolveValue: '', value: envConfig.segmentoContaCorretePF },
                        { name: 'p_agencia', preResolveError: '', preResolveValue: '', value: input.agency || DEFAULT_AGENCY },
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
                    configurationId: envConfig.configurationId,
                },
            ],
            globalSourceConnection: 'DB204P',
            globalTargetConnection: 'DB204P',
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
function buildHabilitarContaMaPayload(params) {
    const now = new Date();
    const envConfig = getHabilitarContaMaEnvConfig(params.environment);
    return {
        jobPubParams: {
            ...createBaseJobPubParams(now, params.username),
            publishJobs: [
                {
                    batchEngineThread: 'ANY',
                    dataSourceProfile: envConfig.connectionProfile,
                    dataTargetProfile: envConfig.connectionProfile,
                    description: '',
                    jobTitle: 'Group Job',
                    levelID: envConfig.levelID,
                    publishVariables: [
                        { name: 'P_AGENCIA_MA', preResolveError: '', preResolveValue: '', value: params.agencia },
                        { name: 'P_CONTA_MA', preResolveError: '', preResolveValue: '', value: params.conta },
                        { name: 'p_projeto_jira', preResolveError: '', preResolveValue: '', value: WORKFLOW_PROJETO_JIRA },
                    ],
                    seq: 1,
                    vtfnodeDesc: envConfig.vtfnodeName,
                    vtfnodeID: envConfig.vtfnodeID,
                    vtfnodeName: envConfig.vtfnodeName,
                    iterations: 1,
                    csvDelimiter: null,
                    csvQuotationMarks: null,
                    configurationId: envConfig.configurationId,
                },
            ],
            globalSourceConnection: envConfig.connectionProfile,
            globalTargetConnection: envConfig.connectionProfile,
            jobTitle: 'Habilitar Conta MA Data Request',
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
function buildDebitoAutomaticoPayload(params) {
    const now = new Date();
    const envConfig = getDebitoAutomaticoEnvConfig(params.environment);
    return {
        jobPubParams: {
            ...createBaseJobPubParams(now, params.username),
            publishJobs: [
                {
                    batchEngineThread: 'ANY',
                    dataSourceProfile: envConfig.connectionProfile,
                    dataTargetProfile: envConfig.connectionProfile,
                    description: '',
                    jobTitle: 'Group Job',
                    levelID: 3101,
                    publishVariables: [
                        { name: 'p_combo_ctpo_crtl_db_uf', preResolveError: '', preResolveValue: '', value: '01-SP                                      ' },
                        { name: 'p_combo_ctpo_crtl_db', preResolveError: '', preResolveValue: '', value: '001-Energia Elétrica                   ' },
                        { name: 'p_combo_empresa', preResolveError: '', preResolveValue: '', value: '2269651-0000000906-CETRIL/SP                                - 01237               ' },
                        { name: 'p_agencia', preResolveError: '', preResolveValue: '', value: params.agencia },
                        { name: 'p_conta', preResolveError: '', preResolveValue: '', value: params.conta },
                        { name: 'p_combo_contratante', preResolveError: '', preResolveValue: '', value: '999-NOVO CONTRATO' },
                        { name: 'p_qntd', preResolveError: '', preResolveValue: '', value: '1' },
                        { name: 'p_projeto_jira', preResolveError: '', preResolveValue: '', value: WORKFLOW_PROJETO_JIRA },
                    ],
                    seq: 1,
                    vtfnodeDesc: 'Débito Automático Corrente Mobile e TF',
                    vtfnodeID: '53470',
                    vtfnodeName: 'Débito Automático Corrente Mobile e TF',
                    iterations: 1,
                    csvDelimiter: null,
                    csvQuotationMarks: null,
                    configurationId: 2369,
                },
            ],
            globalSourceConnection: envConfig.connectionProfile,
            globalTargetConnection: envConfig.connectionProfile,
            jobTitle: 'Débito Automático Data Request',
        },
        dataDesign: {
            projectID: 2346,
            versionID: 2351,
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
async function executarJornadaAberturaContas(input, correlationId, userToken) {
    const environment = input.environment ?? DEFAULT_WORKFLOW_ENVIRONMENT;
    const username = input.username || WORKFLOW_USERNAME_FALLBACK;
    const agencyRequested = input.agency || DEFAULT_AGENCY;
    const steps = [];
    logger_1.logger.info('Iniciando jornada Abertura de Contas (cta-003)', correlationId, {
        environment,
        agencyRequested,
        username,
    });
    const step1 = await tdm_service_1.tdmService.submitAndDownload(buildContasCorrentesPfPayload({ environment, agency: agencyRequested, username }), correlationId, userToken);
    steps.push({
        step: 'contas-correntes-pf',
        requestedJobId: step1.requestedJobId,
        childJobId: step1.childJobId,
        effectiveJobId: step1.effectiveJobId,
        parentStatus: step1.parentStatus,
        childStatus: step1.childStatus,
        sizeBytes: step1.artifact.sizeBytes,
        extractedContaInfo: step1.extractedContaInfo,
    });
    const contaInfo = step1.extractedContaInfo;
    if (!contaInfo?.found || !contaInfo.conta) {
        throw new error_middleware_1.AppError(502, `A jornada foi interrompida porque não foi possível extrair a conta do artefato da etapa 1. ${contaInfo?.reason ?? ''}`.trim(), 'JORNADA_CONTA_NAO_EXTRAIDA', contaInfo);
    }
    const agenciaEfetiva = contaInfo.agencia || agencyRequested;
    const contaEfetiva = contaInfo.conta;
    const step2 = await tdm_service_1.tdmService.submitAndDownload(buildHabilitarContaMaPayload({
        agencia: agenciaEfetiva,
        conta: contaEfetiva,
        environment,
        username,
    }), correlationId, userToken);
    steps.push({
        step: 'habilitar-conta-ma',
        requestedJobId: step2.requestedJobId,
        childJobId: step2.childJobId,
        effectiveJobId: step2.effectiveJobId,
        parentStatus: step2.parentStatus,
        childStatus: step2.childStatus,
        sizeBytes: step2.artifact.sizeBytes,
    });
    const step3 = await tdm_service_1.tdmService.submitAndDownload(buildDebitoAutomaticoPayload({
        agencia: agenciaEfetiva,
        conta: contaEfetiva,
        environment,
        username,
    }), correlationId, userToken);
    steps.push({
        step: 'debito-automatico',
        requestedJobId: step3.requestedJobId,
        childJobId: step3.childJobId,
        effectiveJobId: step3.effectiveJobId,
        parentStatus: step3.parentStatus,
        childStatus: step3.childStatus,
        sizeBytes: step3.artifact.sizeBytes,
    });
    return {
        success: true,
        environment,
        agencyRequested,
        contaGerada: {
            agencia: agenciaEfetiva,
            conta: contaEfetiva,
        },
        steps,
    };
}
//# sourceMappingURL=abertura-contas-journey.service.js.map