"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tdmService = void 0;
const env_1 = require("../config/env");
const tdm_client_1 = require("./tdm.client");
const error_middleware_1 = require("../middleware/error.middleware");
const logger_1 = require("../logging/logger");
const storage_service_1 = require("../storage/storage.service");
const artifact_extractor_1 = require("../storage/artifact-extractor");
function normalizeStatus(status) {
    return String(status ?? '').trim().toLowerCase();
}
function isCompleted(status) {
    return normalizeStatus(status) === 'completed';
}
function extractJobId(response) {
    const jobId = response.jobId ?? response.id ?? response.data?.jobId ?? response.data?.id;
    return jobId != null ? Number(jobId) : null;
}
function isTerminalStatus(status) {
    return ['completed', 'failed', 'cancelled', 'canceled'].includes(normalizeStatus(status));
}
function pickDownloadableChildJob(job) {
    const children = Array.isArray(job.jobs) ? job.jobs : [];
    return (children.find((child) => String(child.type ?? '').toUpperCase() === 'PUBLISH' &&
        isCompleted(child.status) &&
        child.artifactLocation) ??
        children.find((child) => String(child.type ?? '').toUpperCase() === 'PUBLISH' && isCompleted(child.status)) ??
        children.find((child) => isCompleted(child.status) && child.artifactLocation) ??
        children.find((child) => isCompleted(child.status)) ??
        null);
}
/**
 * Igual a `pickDownloadableChildJob`, mas aceita filhos em qualquer status
 * terminal (inclusive "failed") que possuam `artifactLocation`.
 * Usado como fallback para inspecionar o artefato de jobs que falharam.
 */
function pickAnyChildJobWithArtifact(job) {
    const children = Array.isArray(job.jobs) ? job.jobs : [];
    return (children.find((child) => String(child.type ?? '').toUpperCase() === 'PUBLISH' && child.artifactLocation) ??
        children.find((child) => child.artifactLocation) ??
        null);
}
/**
 * Seleciona automaticamente a função de request correta:
 * - Se `userToken` for fornecido → usa `tdmRequestAs` (token do usuário
 *   logado), com fallback automático para o token sistêmico em caso de
 *   401/403. Jobs aparecem no TDM com o login real do usuário.
 * - Caso contrário → usa `tdmRequest` (token sistêmico do servidor).
 * Toda a lógica de execução dos cards permanece inalterada.
 */
function makeRequest(config, userToken, correlationId) {
    return userToken
        ? (0, tdm_client_1.tdmRequestAs)(config, userToken, correlationId)
        : (0, tdm_client_1.tdmRequest)(config, correlationId);
}
async function fetchJobDetails(jobId, correlationId, userToken) {
    const url = `${env_1.env.tdm.baseUrl}/TDMJobService/api/ca/v1/jobs/${jobId}`;
    const response = await makeRequest({ method: 'GET', url }, userToken, correlationId);
    if (response.status < 200 || response.status >= 300) {
        throw new error_middleware_1.AppError(502, `TDM retornou erro ao consultar o job ${jobId}.`, 'TDM_JOB_STATUS_FAILED');
    }
    return response.data;
}
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
async function waitForJobCompletion(jobId, correlationId, options = {}) {
    const maxAttempts = options.maxAttempts ?? 24;
    const delayMs = options.delayMs ?? 5000;
    const { userToken } = options;
    let lastParentJob = null;
    let lastError = null;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        try {
            const parentJob = await fetchJobDetails(jobId, correlationId, userToken);
            lastParentJob = parentJob;
            lastError = null;
            const childJob = pickDownloadableChildJob(parentJob);
            if (isCompleted(parentJob.status) && (!childJob || isCompleted(childJob.status))) {
                return { parentJob, childJob };
            }
            if (isCompleted(parentJob.status) &&
                Array.isArray(parentJob.jobs) &&
                parentJob.jobs.length > 0 &&
                parentJob.jobs.every((child) => isTerminalStatus(child.status))) {
                const completedChild = pickDownloadableChildJob(parentJob);
                if (completedChild) {
                    logger_1.logger.warn(`Job pai ${jobId} concluído sem marcar filho selecionado como concluído, mas existe child completed terminal. Assumindo sucesso pelo child job.`, correlationId, {
                        parentStatus: parentJob.status,
                        childStatuses: parentJob.jobs.map((child) => ({
                            jobId: child.jobId,
                            status: child.status,
                            type: child.type,
                        })),
                        selectedChildJobId: completedChild.jobId,
                    });
                    return { parentJob, childJob: completedChild };
                }
            }
            if (['failed', 'cancelled', 'canceled'].includes(normalizeStatus(parentJob.status))) {
                throw new error_middleware_1.AppError(502, `O job ${jobId} terminou com status ${parentJob.status}.`, 'TDM_JOB_FAILED', parentJob);
            }
        }
        catch (error) {
            // Falha DEFINITIVA (status failed/cancelled) deve interromper imediatamente.
            if (error instanceof error_middleware_1.AppError && error.code === 'TDM_JOB_FAILED') {
                throw error;
            }
            // Falha TRANSITÓRIA ao consultar o status (ex.: instabilidade momentânea
            // do TDM) não deve abortar o polling — apenas registra e tenta de novo.
            lastError = error;
            logger_1.logger.warn(`Falha transitória ao consultar status do job ${jobId} (tentativa ${attempt}/${maxAttempts}). Tentando novamente.`, correlationId, error);
        }
        if (attempt < maxAttempts) {
            await sleep(delayMs);
        }
    }
    if (lastError) {
        throw lastError;
    }
    throw new error_middleware_1.AppError(504, `Timeout aguardando a conclusão do job ${jobId}.`, 'TDM_JOB_TIMEOUT', lastParentJob);
}
async function downloadArtifact(jobId, correlationId, userToken) {
    const url = `${env_1.env.tdm.baseUrl}/TDMJobService/api/ca/v1/jobs/${jobId}/actions/downloadArtifact`;
    const response = await makeRequest({
        method: 'POST',
        url,
        headers: { Accept: 'application/octet-stream, application/zip, */*' },
        responseType: 'arraybuffer',
    }, userToken, correlationId);
    if (response.status < 200 || response.status >= 300) {
        throw new error_middleware_1.AppError(502, `TDM retornou erro ao baixar o artefato do job ${jobId}.`, 'TDM_DOWNLOAD_FAILED');
    }
    const buffer = Buffer.from(response.data);
    return { buffer, sizeBytes: buffer.length };
}
async function submitAndDownload(payload, correlationId, userToken) {
    const url = `${env_1.env.tdm.baseUrl}/TDMDataFlowService/api/ca/v1/requests`;
    const submitResponse = await makeRequest({
        method: 'POST',
        url,
        data: payload,
        headers: {
            'Content-Type': 'application/json',
            Origin: env_1.env.tdm.origin,
            Referer: env_1.env.tdm.referer,
            'X-Requested-With': 'tdm-angular-novo',
        },
    }, userToken, correlationId);
    if (submitResponse.status < 200 || submitResponse.status >= 300) {
        // Mesmo com status não-2xx, o TDM pode ter criado o job e incluído o
        // jobId no corpo da resposta. Isso ocorre quando o job é persistido com
        // sucesso mas a entrega da resposta HTTP falha (ex.: redirect 302 após
        // criação do recurso, erro interno de serialização do TDM depois de
        // registrar o job, etc.). Se o jobId estiver presente no corpo, o job
        // existe no TDM e o fluxo de polling deve continuar normalmente.
        const recoveredJobId = extractJobId(submitResponse.data);
        if (!recoveredJobId) {
            throw new error_middleware_1.AppError(502, 'TDM retornou erro ao executar o request.', 'TDM_SUBMIT_FAILED', submitResponse.data);
        }
        logger_1.logger.warn(`TDM retornou status HTTP ${submitResponse.status} na submissão, mas jobId ${recoveredJobId} encontrado no corpo — job foi criado. Continuando polling.`, correlationId, { httpStatus: submitResponse.status, responseData: submitResponse.data });
    }
    const requestedJobId = extractJobId(submitResponse.data);
    if (!requestedJobId) {
        throw new error_middleware_1.AppError(502, 'TDM não retornou jobId após a submissão.', 'TDM_SUBMIT_NO_JOB_ID');
    }
    logger_1.logger.info('Request submetido ao TDM', correlationId, { requestedJobId });
    // Persiste o payload exato enviado, indexado pelo jobId — útil para
    // auditoria e para reproduzir a submissão futuramente.
    (0, storage_service_1.savePayload)(requestedJobId, payload);
    let parentJob;
    let childJob;
    try {
        const result = await waitForJobCompletion(requestedJobId, correlationId, { userToken });
        parentJob = result.parentJob;
        childJob = result.childJob;
    }
    catch (waitError) {
        // Quando o job falha com TDM_JOB_FAILED, ainda tentamos baixar o artefato
        // para detectar SQLCODE=-904 (tabela DB2 indisponível). Isso permite exibir
        // uma mensagem de diagnóstico específica em vez da mensagem genérica de falha.
        if (waitError instanceof error_middleware_1.AppError && waitError.code === 'TDM_JOB_FAILED') {
            const failedParent = waitError.details;
            const candidateChild = pickAnyChildJobWithArtifact(failedParent);
            const candidateJobId = candidateChild?.jobId
                ? Number(candidateChild.jobId)
                : requestedJobId;
            try {
                const failedArtifact = await downloadArtifact(candidateJobId, correlationId, userToken);
                const info = (0, artifact_extractor_1.extractAccountInfoFromZip)(failedArtifact.buffer, candidateJobId);
                if (info.db2TableUnavailable) {
                    logger_1.logger.warn('SQLCODE=-904 detectado no artefato de job falho', correlationId, {
                        requestedJobId,
                        candidateJobId,
                    });
                    throw new error_middleware_1.AppError(502, 'Tabela DB2 indisponível (SQLCODE=-904). O job foi encerrado pelo TDM. Tente novamente mais tarde.', 'TDM_DB2_TABLE_UNAVAILABLE', failedParent);
                }
                if (info.db2DuplicateKey) {
                    logger_1.logger.warn('SQLCODE=-803 detectado no artefato de job falho', correlationId, {
                        requestedJobId,
                        candidateJobId,
                    });
                    throw new error_middleware_1.AppError(409, 'Dado já cadastrado no sistema (SQLCODE=-803 — chave duplicada). Verifique se o cliente já possui cadastro ativo antes de tentar novamente.', 'TDM_DB2_DUPLICATE_KEY', failedParent);
                }
            }
            catch (downloadError) {
                // Se o próprio erro for um dos nossos AppErrors de diagnóstico DB2, propaga.
                if (downloadError instanceof error_middleware_1.AppError &&
                    (downloadError.code === 'TDM_DB2_TABLE_UNAVAILABLE' ||
                        downloadError.code === 'TDM_DB2_DUPLICATE_KEY')) {
                    throw downloadError;
                }
                // Qualquer outro erro no download (ex.: artefato não disponível) é
                // registrado mas não mascara o erro original de job falho.
                logger_1.logger.warn('Não foi possível baixar artefato do job falho para diagnóstico de SQLCODE DB2', correlationId, downloadError);
            }
        }
        // Re-lança o erro original (TDM_JOB_FAILED ou qualquer outro).
        throw waitError;
    }
    const effectiveJobId = childJob?.jobId ? Number(childJob.jobId) : requestedJobId;
    const artifact = await downloadArtifact(effectiveJobId, correlationId, userToken);
    // O artefato é lido e processado inteiramente em memória — NÃO é
    // gravado em disco neste servidor (ver storage.service.ts). Isso é
    // intencional: quando hospedado no BEX (shell/iframe), não haverá
    // espaço em disco disponível/permitido para gravação de arquivos.
    // Tenta extrair Agência/Conta do artefato — só terá sucesso para a
    // rotina "Contas Correntes - PF" (Agendar Débito Automático), que gera
    // uma conta nova. Para outras rotinas, retorna found:false silenciosamente.
    // Ajuste: adicione logging adicional ou outro rastreamento pelo effectiveJobId
    logger_1.logger.info('Extrair informações da conta usando o Job ID', correlationId, {
        effectiveJobId,
    });
    const extractedContaInfo = (0, artifact_extractor_1.extractAccountInfoFromZip)(artifact.buffer, effectiveJobId);
    if (extractedContaInfo.found) {
        logger_1.logger.info('Conta extraída do artefato', correlationId, extractedContaInfo);
    }
    return {
        requestedJobId,
        childJobId: childJob?.jobId ? Number(childJob.jobId) : null,
        effectiveJobId,
        parentStatus: parentJob.status,
        childStatus: childJob?.status,
        artifact,
        extractedContaInfo,
    };
}
async function getJobStatus(jobId, correlationId, userToken) {
    const job = await fetchJobDetails(jobId, correlationId, userToken);
    const childJob = pickDownloadableChildJob(job);
    return {
        jobId,
        completed: isCompleted(job.status),
        childJobId: childJob?.jobId ? Number(childJob.jobId) : null,
        childCompleted: childJob ? isCompleted(childJob.status) : false,
        data: job,
    };
}
exports.tdmService = {
    submitAndDownload,
    getJobStatus,
};
//# sourceMappingURL=tdm.service.js.map