import { SubmitRequestDto } from '../../../core/api/dto/submit-request.dto';
import { WORKFLOW_EMAIL, WORKFLOW_PROJETO_JIRA, WORKFLOW_USERNAME_FALLBACK } from './shared-request-defaults';

/**
 * Formulário preenchido pelo usuário na Home para o card
 * "Massa de Dados PJ" (cta-005) — primeira (e por ora única) etapa do
 * workflow "Massa de Dados PJ" (rotina "Cadastro de Clientes - PSDC").
 */
export interface CadastroClientesPsdcFormData {
  /**
   * Username do usuário autenticado no Portal (sessão/SSO). Enviado ao
   * TDM como `username` do job — reflete quem de fato está executando a
   * ação, e não um valor fixo.
   */
  username?: string;
}

const DATA_DESIGN_PROJECT_ID = 2956;
const DATA_DESIGN_VERSION_ID = 2957;

const PUBLISH_JOB_LEVEL_ID = 4338;
const VTFNODE_ID = '2430';
const VTFNODE_NAME = 'Cadastro PJ Alfa - 01 Sócio';
const VTFNODE_DESC = '******GERAR NO MAXIMO 10 CNPJS POR VEZ********';
const CONFIGURATION_ID = 2762;

/**
 * Constrói o payload de submissão do card "Massa de Dados PJ" (cta-005)
 * no formato exigido pelo Gateway (POST /gw/api/requests/submit-and-download),
 * para a rotina "Cadastro de Clientes PSDC Data Request".
 *
 * Variáveis fixas do payload:
 * - p_tipo_cnpj      → "01-Numérico"
 * - p_porte_empresa  → "01-MICROEMPRESA "
 * - p_Const_Empresa  → "00 - EMPRESA INDIVIDUAL"
 * - p_projeto_jira   → WORKFLOW_PROJETO_JIRA
 */
export function buildCadastroClientesPsdcPayload(
  formData: CadastroClientesPsdcFormData,
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
              name: 'p_porte_empresa',
              preResolveError: '',
              preResolveValue: '',
              value: '01-MICROEMPRESA ',
            },
            {
              name: 'p_Const_Empresa',
              preResolveError: '',
              preResolveValue: '',
              value: '00 - EMPRESA INDIVIDUAL',
            },
            {
              name: 'p_projeto_jira',
              preResolveError: '',
              preResolveValue: '',
              value: WORKFLOW_PROJETO_JIRA,
            },
          ],
          seq: 1,
          vtfnodeDesc: VTFNODE_DESC,
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
      jobTitle: 'Cadastro de Clientes PSDC Data Request',
      username: formData.username || WORKFLOW_USERNAME_FALLBACK,
    },
    dataDesign: {
      projectID: DATA_DESIGN_PROJECT_ID,
      versionID: DATA_DESIGN_VERSION_ID,
    },
    advancedToggleFlag: true,
  };
}
