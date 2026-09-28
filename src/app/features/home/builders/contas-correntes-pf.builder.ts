import { SubmitRequestDto } from '../../../core/api/dto/submit-request.dto';
import { WORKFLOW_EMAIL, WORKFLOW_PROJETO_JIRA, WORKFLOW_USERNAME_FALLBACK } from './shared-request-defaults';

/**
 * Formulário para o step "Contas Correntes - PF" do workflow
 * "Massa de Dados PJ" (cta-005).
 */
export interface ContasCorrentesPfFormData {
  /** Username do usuário autenticado no Portal (SSO). */
  username?: string;
}

const DATA_DESIGN_PROJECT_ID = 2476;
const DATA_DESIGN_VERSION_ID = 2477;

const PUBLISH_JOB_LEVEL_ID = 3309;
const VTFNODE_ID = '11020';
const VTFNODE_NAME = '02 - Conta Corrente PF';
const CONFIGURATION_ID = 2985;

/**
 * Constrói o payload de submissão do step "Contas Correntes - PF"
 * dentro do workflow "Massa de Dados PJ" (cta-005), para a rotina
 * "Contas Correntes - PF Data Request".
 */
export function buildContasCorrentesPfPayload(
  formData: ContasCorrentesPfFormData,
): SubmitRequestDto {
  const now = new Date();

  return {
    jobPubParams: {
      scheduledDateTimeInMillisec: now.toISOString(),
      almjobs: [],
      rallyJobs: [],
      jobParams: [],
      publishJobs: [
        {
          batchEngineThread: 'ANY',
          dataSourceProfile: '',
          dataTargetProfile: '',
          description: '',
          jobTitle: 'Group Job',
          levelID: PUBLISH_JOB_LEVEL_ID,
          publishVariables: [
            {
              name: 'p_ambiente_gerar_conta',
              preResolveError: '',
              preResolveValue: '',
              value: 'PCM2AB  - NOVO TI',
            },
            {
              name: 'p_SegmentoContaCorretePF',
              preResolveError: '',
              preResolveValue: '',
              value: '000-CLIENTE CLASSIC',
            },
            {
              name: 'p_agencia',
              preResolveError: '',
              preResolveValue: '',
              value: '448',
            },
            {
              name: 'p_cpf',
              preResolveError: '',
              preResolveValue: '',
              value: '0',
            },
            {
              name: 'p_qtdcontas_ger',
              preResolveError: '',
              preResolveValue: '',
              value: '1',
            },
            {
              name: 'p_projeto_jira',
              preResolveError: '',
              preResolveValue: '',
              value: WORKFLOW_PROJETO_JIRA,
            },
            {
              name: 'p_tp_disp',
              preResolveError: '',
              preResolveValue: '',
              value: 'SEM DISPOSITIVO',
            },
          ],
          seq: 1,
          vtfnodeDesc: VTFNODE_NAME,
          vtfnodeID: VTFNODE_ID,
          vtfnodeName: VTFNODE_NAME,
          iterations: 1,
          csvDelimiter: null,
          csvQuotationMarks: null,
          configurationId: CONFIGURATION_ID,
        },
      ],
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
      globalSourceConnection: '',
      globalTargetConnection: '',
      jobSubmissionOrder: '0',
      jobTitle: 'Contas Correntes - PF Data Request',
      username: formData.username || WORKFLOW_USERNAME_FALLBACK,
    },
    dataDesign: {
      projectID: DATA_DESIGN_PROJECT_ID,
      versionID: DATA_DESIGN_VERSION_ID,
    },
    advancedToggleFlag: true,
  };
}
