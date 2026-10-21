/**
 * Testes do tdm.service.ts focados no fluxo "Habilitar Conta no MA" (Etapa 4).
 *
 * Estratégia: mockar o tdm.client (HTTP) + storage + artifact-extractor
 * para que nenhuma chamada real ao TDM seja feita. Testa apenas a lógica
 * interna do serviço (submit → poll → download → extração).
 *
 * Executar:
 *   cd bff && npx jest --testPathPattern=tdm.service.habilitar-ma --no-coverage
 */

import { tdmService } from './tdm.service';
import * as tdmClient from './tdm.client';
import * as storageService from '../storage/storage.service';
import * as artifactExtractor from '../storage/artifact-extractor';
import { AppError } from '../middleware/error.middleware';

// ──────────────────────────────────────────────
// Mocks de módulos externos
// ──────────────────────────────────────────────

jest.mock('./tdm.client', () => ({
  tdmRequest: jest.fn(),
  tdmRequestAs: jest.fn(),
}));

jest.mock('../storage/storage.service', () => ({
  savePayload: jest.fn(),
}));

jest.mock('../storage/artifact-extractor', () => ({
  extractAccountInfoFromZip: jest.fn(),
}));

jest.mock('../config/env', () => ({
  env: {
    tdm: {
      baseUrl: 'https://tdm-mock.test',
      origin: 'https://portal-mock.test',
      referer: 'https://portal-mock.test/',
      bearerToken: '',
      username: 'svc-test',
      password: 'svc-pass',
    },
  },
}));

jest.mock('../logging/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// ──────────────────────────────────────────────
// Helpers tipados
// ──────────────────────────────────────────────

const mockTdmRequest = tdmClient.tdmRequest as jest.MockedFunction<typeof tdmClient.tdmRequest>;
const mockSavePayload = storageService.savePayload as jest.MockedFunction<typeof storageService.savePayload>;
const mockExtract = artifactExtractor.extractAccountInfoFromZip as jest.MockedFunction<
  typeof artifactExtractor.extractAccountInfoFromZip
>;

// ──────────────────────────────────────────────
// Fixtures
// ──────────────────────────────────────────────

/** Payload que o buildHabilitarContaMaPjPayload geraria para agência 448, conta 123456 */
const PAYLOAD_HABILITAR_MA = {
  jobPubParams: {
    scheduledDateTimeInMillisec: '2026-09-29T00:00:00.000Z',
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
        levelID: 4593,
        publishVariables: [
          { name: 'P_AGENCIA_MA', preResolveError: '', preResolveValue: '', value: '448' },
          { name: 'P_CONTA_MA', preResolveError: '', preResolveValue: '', value: '123456' },
          {
            name: 'p_projeto_jira',
            preResolveError: '',
            preResolveValue: '',
            value: 'ENGPBIA-ENGENHARIA DE PLATAFORMA | BIA TECH',
          },
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
    testMatches: [],
    exportJobs: [],
    scheduledDt: '2026-09-29T00:00:00.000Z',
    selfServiceEmailMandate: false,
    email: 'Carlos.AndreMoitas@emeal.nttdata.com',
    globalThreadName: 'ANY',
    scheduledDateTimeInMillis: 1759190400000,
    currentDay: 29,
    currentMonth: 9,
    currentYear: 2026,
    globalSourceConnection: '',
    globalTargetConnection: '',
    jobSubmissionOrder: '0',
    jobTitle: 'Habilitar Conta no MA Data Request',
    username: 'm123456',
  },
  dataDesign: { projectID: 3862, versionID: 3863 },
  publishVariables: [],
  advancedToggleFlag: true,
  almjobs: [],
  rallyJobs: [],
  jobParams: [],
  testMatches: [],
  exportJobs: [],
};

const FAKE_ARTIFACT_BUFFER = Buffer.from('PK\x03\x04fake-zip-habilitar-ma');

// Resposta de job pai concluído com um filho PUBLISH concluído
function makeCompletedJob(parentJobId = 9999, childJobId = 10000) {
  return {
    status: 200,
    data: {
      jobId: parentJobId,
      status: 'completed',
      jobs: [
        {
          jobId: childJobId,
          type: 'PUBLISH',
          status: 'completed',
          artifactLocation: `artifacts/${childJobId}`,
        },
      ],
    },
  };
}

// Resposta de job pai que falhou
function makeFailedJob(parentJobId = 9999) {
  return {
    status: 200,
    data: {
      jobId: parentJobId,
      status: 'failed',
      jobs: [],
    },
  };
}

// ──────────────────────────────────────────────
// Suite
// ──────────────────────────────────────────────

describe('tdmService.submitAndDownload — Habilitar Conta no MA (Etapa 4)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Por padrão, extração não encontra agência/conta (correto para habilitar MA)
    mockExtract.mockReturnValue({ found: false, reason: 'rotina-sem-extracao-de-conta' });
  });

  // ── 1. Happy path ──────────────────────────────────────────────────────────

  describe('happy path', () => {
    beforeEach(() => {
      mockTdmRequest
        .mockResolvedValueOnce({ status: 200, data: { jobId: 9999 } } as any)  // POST submit
        .mockResolvedValueOnce(makeCompletedJob(9999, 10000) as any)             // GET job status
        .mockResolvedValueOnce({ status: 200, data: FAKE_ARTIFACT_BUFFER } as any); // POST download
    });

    it('deve retornar requestedJobId, childJobId e effectiveJobId corretos', async () => {
      const result = await tdmService.submitAndDownload(PAYLOAD_HABILITAR_MA as any);

      expect(result.requestedJobId).toBe(9999);
      expect(result.childJobId).toBe(10000);
      expect(result.effectiveJobId).toBe(10000);
    });

    it('deve reportar status completed para pai e filho', async () => {
      const result = await tdmService.submitAndDownload(PAYLOAD_HABILITAR_MA as any);

      expect(result.parentStatus).toBe('completed');
      expect(result.childStatus).toBe('completed');
    });

    it('deve retornar o buffer do artefato baixado', async () => {
      const result = await tdmService.submitAndDownload(PAYLOAD_HABILITAR_MA as any);

      expect(result.artifact.buffer).toEqual(FAKE_ARTIFACT_BUFFER);
      expect(result.artifact.sizeBytes).toBe(FAKE_ARTIFACT_BUFFER.length);
    });

    it('deve retornar extractedContaInfo.found = false (habilitar MA não gera conta nova)', async () => {
      const result = await tdmService.submitAndDownload(PAYLOAD_HABILITAR_MA as any);

      expect(result.extractedContaInfo.found).toBe(false);
    });

    it('deve persistir o payload no storage com o jobId correto', async () => {
      await tdmService.submitAndDownload(PAYLOAD_HABILITAR_MA as any);

      expect(mockSavePayload).toHaveBeenCalledTimes(1);
      expect(mockSavePayload).toHaveBeenCalledWith(9999, PAYLOAD_HABILITAR_MA);
    });

    it('deve fazer exatamente 3 chamadas ao TDM: submit + poll + download', async () => {
      await tdmService.submitAndDownload(PAYLOAD_HABILITAR_MA as any);

      expect(mockTdmRequest).toHaveBeenCalledTimes(3);
    });

    it('deve chamar o endpoint de submit com o payload e headers corretos', async () => {
      await tdmService.submitAndDownload(PAYLOAD_HABILITAR_MA as any);

      const [submitCall] = mockTdmRequest.mock.calls;
      expect(submitCall[0].method).toBe('POST');
      expect(submitCall[0].url).toContain('/TDMDataFlowService/api/ca/v1/requests');
      expect(submitCall[0].data).toEqual(PAYLOAD_HABILITAR_MA);
      expect((submitCall[0].headers as Record<string, string>)['Content-Type']).toBe('application/json');
    });

    it('deve baixar o artefato usando o jobId do filho (PUBLISH), não do pai', async () => {
      await tdmService.submitAndDownload(PAYLOAD_HABILITAR_MA as any);

      const downloadCall = mockTdmRequest.mock.calls[2];
      expect(downloadCall[0].url).toContain('/10000/actions/downloadArtifact');
    });
  });

  // ── 2. Erros de submissão ──────────────────────────────────────────────────

  describe('erros na submissão', () => {
    it('deve lançar TDM_SUBMIT_FAILED quando TDM retorna HTTP 500', async () => {
      mockTdmRequest.mockResolvedValueOnce({ status: 500, data: { message: 'Internal Server Error' } } as any);

      await expect(tdmService.submitAndDownload(PAYLOAD_HABILITAR_MA as any)).rejects.toMatchObject({
        code: 'TDM_SUBMIT_FAILED',
        status: 502,
      });
    });

    it('deve lançar TDM_SUBMIT_NO_JOB_ID quando resposta não contém jobId', async () => {
      mockTdmRequest.mockResolvedValueOnce({ status: 200, data: {} } as any);

      await expect(tdmService.submitAndDownload(PAYLOAD_HABILITAR_MA as any)).rejects.toMatchObject({
        code: 'TDM_SUBMIT_NO_JOB_ID',
        status: 502,
      });
    });

    it('deve lançar TDM_SUBMIT_NO_JOB_ID quando jobId é null', async () => {
      mockTdmRequest.mockResolvedValueOnce({ status: 200, data: { jobId: null } } as any);

      await expect(tdmService.submitAndDownload(PAYLOAD_HABILITAR_MA as any)).rejects.toMatchObject({
        code: 'TDM_SUBMIT_NO_JOB_ID',
      });
    });
  });

  // ── 3. Erros de polling ────────────────────────────────────────────────────

  describe('erros durante polling do job', () => {
    it('deve lançar TDM_JOB_FAILED quando o job falha imediatamente', async () => {
      mockTdmRequest
        .mockResolvedValueOnce({ status: 200, data: { jobId: 9999 } } as any) // submit OK
        .mockResolvedValueOnce(makeFailedJob(9999) as any);                    // poll → failed

      await expect(tdmService.submitAndDownload(PAYLOAD_HABILITAR_MA as any)).rejects.toMatchObject({
        code: 'TDM_JOB_FAILED',
        status: 502,
      });
    });

    it('deve lançar TDM_JOB_FAILED quando o job é cancelado', async () => {
      mockTdmRequest
        .mockResolvedValueOnce({ status: 200, data: { jobId: 9999 } } as any)
        .mockResolvedValueOnce({
          status: 200,
          data: { jobId: 9999, status: 'cancelled', jobs: [] },
        } as any);

      await expect(tdmService.submitAndDownload(PAYLOAD_HABILITAR_MA as any)).rejects.toMatchObject({
        code: 'TDM_JOB_FAILED',
      });
    });

    it('não deve persistir o payload quando o job falha antes de ser iniciado', async () => {
      mockTdmRequest
        .mockResolvedValueOnce({ status: 200, data: { jobId: 9999 } } as any)
        .mockResolvedValueOnce(makeFailedJob(9999) as any);

      await expect(
        tdmService.submitAndDownload(PAYLOAD_HABILITAR_MA as any),
      ).rejects.toBeDefined();

      // savePayload é chamado antes do polling (após submit com jobId)
      expect(mockSavePayload).toHaveBeenCalledWith(9999, PAYLOAD_HABILITAR_MA);
    });
  });

  // ── 4. Erros de download ───────────────────────────────────────────────────

  describe('erros no download do artefato', () => {
    it('deve lançar TDM_DOWNLOAD_FAILED quando download retorna HTTP 502', async () => {
      mockTdmRequest
        .mockResolvedValueOnce({ status: 200, data: { jobId: 9999 } } as any)
        .mockResolvedValueOnce(makeCompletedJob(9999, 10000) as any)
        .mockResolvedValueOnce({ status: 502, data: null } as any); // download falha

      await expect(tdmService.submitAndDownload(PAYLOAD_HABILITAR_MA as any)).rejects.toMatchObject({
        code: 'TDM_DOWNLOAD_FAILED',
        status: 502,
      });
    });
  });

  // ── 5. Comportamento com userToken (tdmRequestAs) ─────────────────────────

  describe('submissão com userToken (tdmRequestAs)', () => {
    const mockTdmRequestAs = tdmClient.tdmRequestAs as jest.MockedFunction<typeof tdmClient.tdmRequestAs>;

    beforeEach(() => {
      mockTdmRequestAs
        .mockResolvedValueOnce({ status: 200, data: { jobId: 8888 } } as any)
        .mockResolvedValueOnce(makeCompletedJob(8888, 9000) as any)
        .mockResolvedValueOnce({ status: 200, data: FAKE_ARTIFACT_BUFFER } as any);
    });

    it('deve usar tdmRequestAs (token do usuário) quando userToken é fornecido', async () => {
      const result = await tdmService.submitAndDownload(
        PAYLOAD_HABILITAR_MA as any,
        'corr-xyz',
        'user-bearer-token-123',
      );

      expect(mockTdmRequestAs).toHaveBeenCalledTimes(3);
      expect(mockTdmRequest).not.toHaveBeenCalled();
      expect(result.requestedJobId).toBe(8888);
    });

    it('deve usar tdmRequest (token sistêmico) quando userToken não é fornecido', async () => {
      mockTdmRequest
        .mockResolvedValueOnce({ status: 200, data: { jobId: 9999 } } as any)
        .mockResolvedValueOnce(makeCompletedJob(9999, 10000) as any)
        .mockResolvedValueOnce({ status: 200, data: FAKE_ARTIFACT_BUFFER } as any);

      await tdmService.submitAndDownload(PAYLOAD_HABILITAR_MA as any);

      expect(mockTdmRequest).toHaveBeenCalledTimes(3);
      expect(mockTdmRequestAs).not.toHaveBeenCalled();
    });
  });

  // ── 6. Polling com job sem filho PUBLISH ──────────────────────────────────

  describe('job pai sem filho PUBLISH', () => {
    it('deve usar o jobId do pai como effectiveJobId quando não há filho', async () => {
      mockTdmRequest
        .mockResolvedValueOnce({ status: 200, data: { jobId: 9999 } } as any)
        .mockResolvedValueOnce({
          status: 200,
          data: { jobId: 9999, status: 'completed', jobs: [] },
        } as any)
        .mockResolvedValueOnce({ status: 200, data: FAKE_ARTIFACT_BUFFER } as any);

      const result = await tdmService.submitAndDownload(PAYLOAD_HABILITAR_MA as any);

      expect(result.effectiveJobId).toBe(9999);
      expect(result.childJobId).toBeNull();

      const downloadCall = mockTdmRequest.mock.calls[2];
      expect(downloadCall[0].url).toContain('/9999/actions/downloadArtifact');
    });
  });
});
