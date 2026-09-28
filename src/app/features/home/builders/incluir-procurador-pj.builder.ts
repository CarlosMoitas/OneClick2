import { SubmitRequestDto } from '../../../core/api/dto/submit-request.dto';
import { WORKFLOW_EMAIL, WORKFLOW_PROJETO_JIRA, WORKFLOW_USERNAME_FALLBACK } from './shared-request-defaults';

/**
 * Formulário para o step "Incluir Procurador PJ" do workflow
 * "Massa de Dados PJ" (cta-005) — quinta e última etapa.
 *
 * IMPORTANTE: agência/conta devem ser as MESMAS já extraídas do artefato
 * do step "Contas Correntes - PF" (as mesmas usadas em "Habilitar Conta
 * no MA") — nunca digitadas pelo usuário.
 */
export interface IncluirProcuradorPjFormData {
  /** Agência extraída do log do artefato do job PJ. */
  agencia: string;
  /** Conta extraída do log do artefato do job PJ. */
  conta: string;
  /** Username do usuário autenticado no Portal (SSO). */
  username?: string;
}

const DATA_DESIGN_PROJECT_ID = 3862;
const DATA_DESIGN_VERSION_ID = 3863;

const PUBLISH_JOB_LEVEL_ID = 3922;
const VTFNODE_ID = '420';
const VTFNODE_NAME = 'Incluir Procurador (Em conta PJ)';
const CONFIGURATION_ID = 2066;

/**
 * Constrói o payload de submissão do step "Incluir Procurador PJ"
 * (última etapa do workflow "Massa de Dados PJ", cta-005), para a rotina
 * "Incluir Procurador em conta PJ Data Request".
 *
 * NOTA: `jobSubmissionOrder: '1'` é o valor exato fornecido no payload
 * de referência validado manualmente no Portal TDM — diferente do padrão
 * `'0'` usado pelos demais builders deste workflow. Mantido intencionalmente
 * até haver evidência de que outro valor seja necessário.
 */
export function buildIncluirProcuradorPjPayload(
  formData: IncluirProcuradorPjFormData,
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
              name: 'p_agencia',
              preResolveError: '',
              preResolveValue: '',
              value: formData.agencia,
            },
            {
              name: 'p_conta_corrente_proc',
              preResolveError: '',
              preResolveValue: '',
              value: formData.conta,
            },
            {
              name: 'p_cpf_procurador',
              preResolveError: '',
              preResolveValue: '',
              value: '0',
            },
            {
              name: 'p_forma_ass',
              preResolveError: '',
              preResolveValue: '',
              value: 'INDIVIDUAL',
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
      jobSubmissionOrder: '1',
      jobTitle: 'Incluir Procurador em conta PJ Data Request',
      username: formData.username || WORKFLOW_USERNAME_FALLBACK,
    },
    dataDesign: {
      projectID: DATA_DESIGN_PROJECT_ID,
      versionID: DATA_DESIGN_VERSION_ID,
    },
    advancedToggleFlag: true,
  };
}
