import { SubmitRequestDto } from '../../../core/api/dto/submit-request.dto';
import { WORKFLOW_EMAIL, WORKFLOW_PROJETO_JIRA, WORKFLOW_USERNAME_FALLBACK } from './shared-request-defaults';

/**
 * Formulário para o step "Contas Correntes - PJ" do workflow
 * "Massa de Dados PJ" (cta-005).
 */
export interface ContasCorrentesPjFormData {
  /** Username do usuário autenticado no Portal (SSO). */
  username?: string;
}

const DATA_DESIGN_PROJECT_ID = 2476;
const DATA_DESIGN_VERSION_ID = 2477;

const PUBLISH_JOB_LEVEL_ID = 2954;
const VTFNODE_ID = '440';
const VTFNODE_NAME = 'Abertura de Conta Corrente PJ Numérico';
const CONFIGURATION_ID = 2991;

/**
 * Constrói o payload de submissão do step "Contas Correntes - PJ"
 * dentro do workflow "Massa de Dados PJ" (cta-005), para a rotina
 * "Contas Correntes - PJ Data Request".
 */
export function buildContasCorrentesPjPayload(
  formData: ContasCorrentesPjFormData,
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
              name: 'p_tipo_cnpj',
              preResolveError: '',
              preResolveValue: '',
              value: '01-Numérico',
            },
            {
              name: 'p_ambiente_gerar_conta',
              preResolveError: '',
              preResolveValue: '',
              value: 'PCM2AB  - NOVO TI',
            },
            {
              name: 'P_SEGMENTOCONTACORRENTEPJ',
              preResolveError: '',
              preResolveValue: '',
              value: '000-NAO SEGMENTADA',
            },
            {
              name: 'p_agencia',
              preResolveError: '',
              preResolveValue: '',
              value: '448',
            },
            {
              name: 'P_CNPJ',
              preResolveError: '',
              preResolveValue: '',
              value: '0',
            },
            {
              name: 'p_porte_empresa_conta',
              preResolveError: '',
              preResolveValue: '',
              value: '03-MÉDIA EMPRESA',
            },
            {
              name: 'p_projeto_jira',
              preResolveError: '',
              preResolveValue: '',
              value: WORKFLOW_PROJETO_JIRA,
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
      jobTitle: 'Contas Correntes - PJ Data Request',
      username: formData.username || WORKFLOW_USERNAME_FALLBACK,
    },
    dataDesign: {
      projectID: DATA_DESIGN_PROJECT_ID,
      versionID: DATA_DESIGN_VERSION_ID,
    },
    advancedToggleFlag: true,
  };
}
