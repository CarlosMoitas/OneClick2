import { describe, it, expect } from 'vitest';
import { buildIncluirProcuradorPjPayload } from './incluir-procurador-pj.builder';
import { WORKFLOW_USERNAME_FALLBACK } from './shared-request-defaults';

describe('buildIncluirProcuradorPjPayload', () => {
  const BASE_INPUT = {
    agencia: '448',
    conta: '245847',
    username: 'test-user',
  };

  it('deve retornar um payload com estrutura válida de SubmitRequestDto', () => {
    const payload = buildIncluirProcuradorPjPayload(BASE_INPUT);

    expect(payload.jobPubParams).toBeDefined();
    expect(payload.dataDesign).toBeDefined();
    expect(payload.advancedToggleFlag).toBe(true);
  });

  it('deve usar os IDs corretos da rotina (levelID 3922, configurationId 2066, vtfnodeID 420)', () => {
    const payload = buildIncluirProcuradorPjPayload(BASE_INPUT);
    const publishJob = payload.jobPubParams.publishJobs[0];

    expect(publishJob.levelID).toBe(3922);
    expect(publishJob.configurationId).toBe(2066);
    expect(publishJob.vtfnodeID).toBe('420');
    expect(publishJob.vtfnodeName).toBe('Incluir Procurador (Em conta PJ)');
  });

  it('deve manter dataSourceProfile/dataTargetProfile e globalSourceConnection/globalTargetConnection vazios (conforme payload de referência)', () => {
    const payload = buildIncluirProcuradorPjPayload(BASE_INPUT);
    const publishJob = payload.jobPubParams.publishJobs[0];

    expect(publishJob.dataSourceProfile).toBe('');
    expect(publishJob.dataTargetProfile).toBe('');
    expect(payload.jobPubParams.globalSourceConnection).toBe('');
    expect(payload.jobPubParams.globalTargetConnection).toBe('');
  });

  it('deve injetar agência e conta extraídas nas variáveis p_agencia e p_conta_corrente_proc', () => {
    const payload = buildIncluirProcuradorPjPayload({ agencia: '1234', conta: '987654', username: 'u1' });
    const vars = payload.jobPubParams.publishJobs[0].publishVariables;

    const agencia = vars.find((v) => v.name === 'p_agencia');
    const conta = vars.find((v) => v.name === 'p_conta_corrente_proc');

    expect(agencia?.value).toBe('1234');
    expect(conta?.value).toBe('987654');
  });

  it('deve fixar p_cpf_procurador como "0" e p_forma_ass como "INDIVIDUAL"', () => {
    const payload = buildIncluirProcuradorPjPayload(BASE_INPUT);
    const vars = payload.jobPubParams.publishJobs[0].publishVariables;

    expect(vars.find((v) => v.name === 'p_cpf_procurador')?.value).toBe('0');
    expect(vars.find((v) => v.name === 'p_forma_ass')?.value).toBe('INDIVIDUAL');
  });

  it('deve usar WORKFLOW_USERNAME_FALLBACK quando username não for informado', () => {
    const payload = buildIncluirProcuradorPjPayload({ agencia: '100', conta: '200' });

    expect(payload.jobPubParams.username).toBe(WORKFLOW_USERNAME_FALLBACK);
  });

  it('deve usar o username fornecido quando disponível', () => {
    const payload = buildIncluirProcuradorPjPayload({ agencia: '100', conta: '200', username: 'm999999' });

    expect(payload.jobPubParams.username).toBe('m999999');
  });

  it('deve usar dataDesign correto (projectID 3862, versionID 3863)', () => {
    const payload = buildIncluirProcuradorPjPayload(BASE_INPUT);

    expect(payload.dataDesign.projectID).toBe(3862);
    expect(payload.dataDesign.versionID).toBe(3863);
  });

  it('deve usar jobTitle correto no nível jobPubParams', () => {
    const payload = buildIncluirProcuradorPjPayload(BASE_INPUT);

    expect(payload.jobPubParams.jobTitle).toBe('Incluir Procurador em conta PJ Data Request');
  });

  it('deve usar jobSubmissionOrder "1" (valor específico desta rotina, conforme payload de referência)', () => {
    const payload = buildIncluirProcuradorPjPayload(BASE_INPUT);

    expect(payload.jobPubParams.jobSubmissionOrder).toBe('1');
  });

  it('[anti-hardcoding] deve injetar agência/conta diferentes corretamente', () => {
    const p1 = buildIncluirProcuradorPjPayload({ agencia: '111', conta: '222', username: 'u1' });
    const p2 = buildIncluirProcuradorPjPayload({ agencia: '333', conta: '444', username: 'u2' });

    const getAgencia = (p: typeof p1) =>
      p.jobPubParams.publishJobs[0].publishVariables.find((v) => v.name === 'p_agencia')?.value;
    const getConta = (p: typeof p1) =>
      p.jobPubParams.publishJobs[0].publishVariables.find((v) => v.name === 'p_conta_corrente_proc')?.value;

    expect(getAgencia(p1)).toBe('111');
    expect(getConta(p1)).toBe('222');
    expect(getAgencia(p2)).toBe('333');
    expect(getConta(p2)).toBe('444');
  });
});
