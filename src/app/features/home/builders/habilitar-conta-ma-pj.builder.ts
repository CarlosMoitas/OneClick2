import { SubmitRequestDto } from '../../../core/api/dto/submit-request.dto';
import { WORKFLOW_EMAIL, WORKFLOW_PROJETO_JIRA, WORKFLOW_USERNAME_FALLBACK } from './shared-request-defaults';

/**
 * Formulário para o step "Habilitar Conta no MA" do workflow
 * "Massa de Dados PJ" (cta-005).
 *
 * IMPORTANTE: agência/conta devem vir da extração do artefato do step anterior.
 */
export interface HabilitarContaMaPjFormData {
  /** Agência extraída do log do artefato do job PJ. */
  agencia: string;
  /** Conta extraída do log do artefato do job PJ. */
  conta: string;
  /** Username do usuário autenticado no Portal (SSO). */
  username?: string;
}

const DATA_DESIGN_PROJECT_ID = 3862;
const DATA_DESIGN_VERSION_ID = 3863;

const PUBLISH_JOB_LEVEL_ID = 4593;
const VTFNODE_ID = '540';
const VTFNODE_NAME = 'Habilitar MA NOVO TI';
const CONFIGURATION_ID = 3032;

export function buildHabilitarContaMaPjPayload(formData: HabilitarContaMaPjFormData): SubmitRequestDto {
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
              name: 'P_AGENCIA_MA',
              preResolveError: '',
              preResolveValue: '',
              value: formData.agencia,
            },
            {
              name: 'P_CONTA_MA',
              preResolveError: '',
              preResolveValue: '',
              value: formData.conta,
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
      jobTitle: 'Habilitar Conta no MA Data Request',
      username: formData.username || WORKFLOW_USERNAME_FALLBACK,
    },
    dataDesign: {
      projectID: DATA_DESIGN_PROJECT_ID,
      versionID: DATA_DESIGN_VERSION_ID,
    },
    advancedToggleFlag: true,
  };
}
