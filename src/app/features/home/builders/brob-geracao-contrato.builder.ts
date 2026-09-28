import { SubmitRequestDto } from '../../../core/api/dto/submit-request.dto';
import { WORKFLOW_EMAIL, WORKFLOW_PROJETO_JIRA, WORKFLOW_USERNAME_FALLBACK } from './shared-request-defaults';

/**
 * Formulário para o step "BROB - Geração de Contrato" do workflow
 * "Massa de Dados PJ" (cta-005).
 *
 * IMPORTANTE:
 * - agência deve vir da agência extraída do artefato do step "Contas Correntes - PF"
 * - conta deve vir da conta extraída do artefato do step "Contas Correntes - PF"
 * - cpfCliente deve vir do Data Pool do mesmo artefato (.zip),
 *   concatenando CCGC_CPF(9) + CCTRL_CPF_CGC(2)
 */
export interface BrobGeracaoContratoFormData {
  agencia: string;
  conta: string;
  /** CPF completo do cliente extraído no passo 3 (11 dígitos). */
  cpfCliente: string;
  /** CPF usado no BROB (regra atual: CPF completo de 11 dígitos). */
  cpfBase?: string;
  username?: string;
}

const DATA_DESIGN_PROJECT_ID = 3138;
const DATA_DESIGN_VERSION_ID = 3139;

const PUBLISH_JOB_LEVEL_ID = 3211;
const VTFNODE_ID = '420';
const VTFNODE_NAME = 'BROB - Geração de Contrato';
const CONFIGURATION_ID = 2067;

/**
 * Constrói o payload de submissão do step "BROB - Geração de Contrato"
 * conforme payload de referência validado manualmente.
 */
export function buildBrobGeracaoContratoPayload(
  formData: BrobGeracaoContratoFormData,
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
              name: 'p_agcontr',
              preResolveError: '',
              preResolveValue: '',
              value: formData.agencia,
            },
            {
              name: 'p_contacontr',
              preResolveError: '',
              preResolveValue: '',
              value: formData.conta,
            },
            {
              name: 'p_cpf_brob',
              preResolveError: '',
              preResolveValue: '',
              // Para o BROB, enviar o CPF completo (11 dígitos) gerado no Cadastro PF.
              value: formData.cpfBase ?? formData.cpfCliente ?? '',
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
      jobTitle: 'BROB - Geração de Contrato Data Request',
      username: formData.username || WORKFLOW_USERNAME_FALLBACK,
    },
    dataDesign: {
      projectID: DATA_DESIGN_PROJECT_ID,
      versionID: DATA_DESIGN_VERSION_ID,
    },
    advancedToggleFlag: true,
  };
}
