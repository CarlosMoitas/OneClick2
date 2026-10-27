"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tdmRouter = void 0;
const express_1 = require("express");
const tdm_service_1 = require("./tdm.service");
const auth_middleware_1 = require("../middleware/auth.middleware");
const error_middleware_1 = require("../middleware/error.middleware");
const auth_service_1 = require("../auth/auth.service");
const abertura_contas_journey_service_1 = require("./abertura-contas-journey.service");
exports.tdmRouter = (0, express_1.Router)();
/**
 * Todas as rotas de integração com o TDM exigem sessão válida do Portal
 * (JWT emitido por este servidor) — ver `authMiddleware`.
 */
exports.tdmRouter.use(auth_middleware_1.authMiddleware);
/**
 * Handler compartilhado por /requests/submit-and-download (legado)
 * e por todos os endpoints de jornada nomeados.
 */
async function submitAndDownloadHandler(req, res, next) {
    try {
        const payload = req.body;
        // Resolve o token TDM do usuário logado — se disponível, os jobs
        // aparecem no TDM com o login real do usuário; caso contrário, usa
        // o token sistêmico do .env como fallback (comportamento anterior).
        const userTdmToken = req.user?.username
            ? auth_service_1.authService.getUserTdmToken(req.user.username) ?? undefined
            : undefined;
        const result = await tdm_service_1.tdmService.submitAndDownload(payload, req.correlationId, userTdmToken);
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
    }
    catch (error) {
        next(error);
    }
}
exports.tdmRouter.post('/requests/submit-and-download', submitAndDownloadHandler);
exports.tdmRouter.get('/jobs/:jobId/status', async (req, res, next) => {
    try {
        const jobId = Number(req.params.jobId);
        if (!Number.isFinite(jobId)) {
            throw new error_middleware_1.AppError(400, 'jobId inválido.');
        }
        const userTdmToken = req.user?.username
            ? auth_service_1.authService.getUserTdmToken(req.user.username) ?? undefined
            : undefined;
        const result = await tdm_service_1.tdmService.getJobStatus(jobId, req.correlationId, userTdmToken);
        res.json(result);
    }
    catch (error) {
        next(error);
    }
});
exports.tdmRouter.post('/jornadas/abertura-contas', async (req, res, next) => {
    try {
        const { environment, agency, username } = req.body;
        const userTdmToken = req.user?.username
            ? auth_service_1.authService.getUserTdmToken(req.user.username) ?? undefined
            : undefined;
        const result = await (0, abertura_contas_journey_service_1.executarJornadaAberturaContas)({ environment, agency, username }, req.correlationId, userTdmToken);
        res.json(result);
    }
    catch (error) {
        next(error);
    }
});
//# sourceMappingURL=tdm.routes.js.map