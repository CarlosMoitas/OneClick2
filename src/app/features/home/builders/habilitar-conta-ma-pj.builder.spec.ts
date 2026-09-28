import { describe, it, expect } from 'vitest';
import { buildHabilitarContaMaPjPayload } from './habilitar-conta-ma-pj.builder';
import { WORKFLOW_USERNAME_FALLBACK } from './shared-request-defaults';

describe('buildHabilitarContaMaPjPayload', () => {
  const BASE_INPUT = {
    agencia: '448',
    conta: '123456',
    username: 'test-user',
  };

  it('deve retornar um payload com estrutura válida de SubmitRequestDto', () => {
    const payload = buildHabilitarContaMaPjPayload(BASE_INPUT);

    expect(payload.jobPubParams).toBeDefined();
    expect(payload.dataDesign).toBeDefined();
    expect(payload.advancedToggleFlag).toBe(true);
  });

  it('deve usar os IDs corretos para o ambiente NOVO TI (levelID 4593, configurationId 3032, vtfnodeID 540)', () => {
    const payload = buildHabilitarContaMaPjPayload(BASE_INPUT);
    const publishJob = payload.jobPubParams.publishJobs[0];

    expect(publishJob.levelID).toBe(4593);
    expect(publishJob.configurationId).toBe(3032);
    expect(publishJob.vtfnodeID).toBe('540');
    expect(publishJob.vtfnodeName).toBe('Habilitar MA NOVO TI');
  });

  it('deve manter dataSourceProfile e dataTargetProfile como string vazia (conforme payload manual validado)', () => {
    const payload = buildHabilitarContaMaPjPayload(BASE_INPUT);
    const publishJob = payload.jobPubParams.publishJobs[0];

    // O payload manual funcional usa campos de conexão vazios para este job.
    // NÃO deve ter 'PCM2AB' — o TDM não exige connectionProfile para esta rotina.
    expect(publishJob.dataSourceProfile).toBe('');
    expect(publishJob.dataTargetProfile).toBe('');
  });

  it('deve manter globalSourceConnection e globalTargetConnection como string vazia (conforme payload manual validado)', () => {
    const payload = buildHabilitarContaMaPjPayload(BASE_INPUT);

    // Idem: campos vazios conforme payload manual que executa com sucesso no TDM.
    expect(payload.jobPubParams.globalSourceConnection).toBe('');
    expect(payload.jobPubParams.globalTargetConnection).toBe('');
  });

  it('deve injetar agência e conta extraídas do artefato nas variáveis P_AGENCIA_MA e P_CONTA_MA', () => {
    const payload = buildHabilitarContaMaPjPayload({ agencia: '1234', conta: '987654', username: 'u1' });
    const vars = payload.jobPubParams.publishJobs[0].publishVariables;

    const agencia = vars.find((v) => v.name === 'P_AGENCIA_MA');
    const conta = vars.find((v) => v.name === 'P_CONTA_MA');

    expect(agencia?.value).toBe('1234');
    expect(conta?.value).toBe('987654');
  });

  it('deve usar WORKFLOW_USERNAME_FALLBACK quando username não for informado', () => {
    const payload = buildHabilitarContaMaPjPayload({ agencia: '100', conta: '200' });

    expect(payload.jobPubParams.username).toBe(WORKFLOW_USERNAME_FALLBACK);
  });

  it('deve usar o username fornecido quando disponível', () => {
    const payload = buildHabilitarContaMaPjPayload({ agencia: '100', conta: '200', username: 'm999999' });

    expect(payload.jobPubParams.username).toBe('m999999');
  });

  it('deve usar dataDesign correto (projectID 3862, versionID 3863)', () => {
    const payload = buildHabilitarContaMaPjPayload(BASE_INPUT);

    expect(payload.dataDesign.projectID).toBe(3862);
    expect(payload.dataDesign.versionID).toBe(3863);
  });

  it('deve usar jobTitle correto no nível jobPubParams', () => {
    const payload = buildHabilitarContaMaPjPayload(BASE_INPUT);

    expect(payload.jobPubParams.jobTitle).toBe('Habilitar Conta no MA Data Request');
  });

  it('[anti-hardcoding] deve injetar agência/conta diferentes corretamente', () => {
    const p1 = buildHabilitarContaMaPjPayload({ agencia: '111', conta: '222', username: 'u1' });
    const p2 = buildHabilitarContaMaPjPayload({ agencia: '333', conta: '444', username: 'u2' });

    const getAgencia = (p: typeof p1) =>
      p.jobPubParams.publishJobs[0].publishVariables.find((v) => v.name === 'P_AGENCIA_MA')?.value;
    const getConta = (p: typeof p1) =>
      p.jobPubParams.publishJobs[0].publishVariables.find((v) => v.name === 'P_CONTA_MA')?.value;

    expect(getAgencia(p1)).toBe('111');
    expect(getConta(p1)).toBe('222');
    expect(getAgencia(p2)).toBe('333');
    expect(getConta(p2)).toBe('444');
  });
});
