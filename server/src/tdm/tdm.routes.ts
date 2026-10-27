import { Router, Request, Response, NextFunction } from 'express';
import { tdmService } from './tdm.service';
import { authMiddleware } from '../middleware/auth.middleware';
import { AppError } from '../middleware/error.middleware';
import { authService } from '../auth/auth.service';
import { SubmitRequestPayload } from './tdm.types';
import { executarJornadaAberturaContas } from './abertura-contas-journey.service';

export const tdmRouter = Router();

/**
 * Todas as rotas de integração com o TDM exigem sessão válida do Portal
 * (JWT emitido por este servidor) — ver `authMiddleware`.
 */
tdmRouter.use(authMiddleware);

tdmRouter.post('/requests/submit-and-download', async (req, res, next) => {
  try {
    const payload = req.body as SubmitRequestPayload;
    // Resolve o token TDM do usuário logado — se disponível, os jobs
    // aparecem no TDM com o login real do usuário; caso contrário, usa
    // o token sistêmico do .env como fallback (comportamento anterior).
    const userTdmToken = req.user?.username
      ? authService.getUserTdmToken(req.user.username) ?? undefined
      : undefined;
    const result = await tdmService.submitAndDownload(payload, req.correlationId, userTdmToken);

    // Responde em JSON (contrato esperado pelo Angular — SubmitResponseDto).
    // O artefato ZIP é processado inteiramente em memória por este
    // servidor (baixado do TDM, lido e descartado) — NÃO é gravado em
    // disco nem enviado no corpo desta resposta. Apenas o resultado da
    // extração (extractedContaInfo) e o tamanho em bytes são retornados.
    res.json({
      success: true,
      requestedJobId: result.requestedJobId,
      childJobId: result.childJobId,
      effectiveJobId: result.effectiveJobId,
      parentStatus: result.parentStatus,
      childStatus: result.childStatus,
      sizeBytes: result.artifact.sizeBytes,
      extractedContaInfo: result.extractedContaInfo,
    });
  } catch (error) {
    next(error);
  }
});

tdmRouter.get('/jobs/:jobId/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const jobId = Number(req.params.jobId);
    if (!Number.isFinite(jobId)) {
      throw new AppError(400, 'jobId inválido.');
    }

    const userTdmToken = req.user?.username
      ? authService.getUserTdmToken(req.user.username) ?? undefined
      : undefined;
    const result = await tdmService.getJobStatus(jobId, req.correlationId, userTdmToken);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Novo endpoint para executar a jornada completa de abertura de contas (cta-003)
tdmRouter.post('/jornadas/abertura-contas', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // O body pode receber: { environment, agency, username }
    const { environment, agency, username } = req.body;
    // userTdmToken pode ser passado explicitamente ou herdado da autenticação atual
    const userTdmToken = req.user?.username ? authService.getUserTdmToken(req.user.username) ?? undefined : undefined;

    const response = await executarJornadaAberturaContas(
      { environment, agency, username },
      req.correlationId,
      userTdmToken,
    );
    res.json(response);
  } catch (error) {
    next(error);
  }
});
