"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractAccountInfoFromZip = extractAccountInfoFromZip;
const adm_zip_1 = __importDefault(require("adm-zip"));
const TARGET_LOG_SUFFIX = 'Action_38_1_Workflow.log';
const SQLCODE_904 = 'SQLCODE=-904';
/**
 * Varre TODOS os arquivos .log contidos no ZIP procurando pelo código de
 * erro DB2 SQLCODE=-904 (objeto indisponível/tabela bloqueada).
 * Retorna `true` assim que a primeira ocorrência for encontrada.
 */
function detectDb2TableUnavailable(entries) {
    for (const entry of entries) {
        if (!entry.entryName.toLowerCase().endsWith('.log'))
            continue;
        try {
            const content = entry.getData().toString('utf8');
            if (content.includes(SQLCODE_904))
                return true;
        }
        catch {
            // ignora entradas ilegíveis — não bloqueia a análise dos demais logs
        }
    }
    return false;
}
/**
 * Garante que o arquivo de log correto seja buscado pelo ID real do artefato (.zip)
 */
function getDataPoolLogEntry(entries, effectiveJobId) {
    // Busca por filename exato com o número do ZIP/job
    const expected = `Job_${effectiveJobId}_Data_Pool_Abertura de Conta Corrente PF_TI2.log`;
    return entries.find(e => e.entryName.split('/').pop()?.toLowerCase() === expected.toLowerCase());
}
const CPF_TARGET_LOG_REGEX = /^Job_\d+_Data_Pool_Abertura de Conta Corrente PF_TI2\.log$/i;
function leftPad(value, length, padChar) {
    if (value.length >= length)
        return value;
    return padChar.repeat(length - value.length) + value;
}
function safeDigits(value) {
    return (value ?? '').toString().trim().replace(/[^\d]/g, '');
}
function extractColumnValueFromDataPool(raw, columnName) {
    // Suporta:
    // - CLIENTE_AGENCIA  CCGC_CPF        1  458532246
    // - CLIENTE_AGENCIA  CCGC_CPF_ST     1  458532246
    // - separadores com TAB ou múltiplos espaços
    // - "Row" variando (não fixo em 1)
    const escapedColumn = columnName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const escapedColumnSt = `${escapedColumn}_ST`;
    const lines = raw.split(/\r?\n|\r|\n/);
    const candidates = [];
    for (const line of lines) {
        if (!line.includes('CLIENTE_AGENCIA'))
            continue;
        if (line.includes(columnName) || line.includes(`${columnName}_ST`)) {
            candidates.push(line);
        }
    }
    // Prioriza coluna exata; depois fallback para *_ST
    const orderedCandidates = [
        ...candidates.filter((l) => new RegExp(`\\b${escapedColumn}\\b`, 'i').test(l)),
        ...candidates.filter((l) => new RegExp(`\\b${escapedColumnSt}\\b`, 'i').test(l)),
    ];
    for (const line of orderedCandidates) {
        const tokens = line.trim().split(/\t| +/).filter(Boolean);
        // Formato esperado de tokens:
        // [CLIENTE_AGENCIA, CCGC_CPF, 1, 458532246]
        // [CLIENTE_AGENCIA, CCGC_CPF_ST, 1, 458532246]
        if (tokens.length >= 4) {
            const valueToken = tokens[tokens.length - 1];
            if (/^\d+$/.test(valueToken))
                return valueToken;
        }
        // Fallback: pega o último trecho numérico da linha
        const numericChunks = line.match(/\d+/g);
        if (numericChunks?.length) {
            return numericChunks[numericChunks.length - 1];
        }
    }
    return undefined;
}
function extractCpfClienteFromLogContent(raw) {
    const ccgcRaw = extractColumnValueFromDataPool(raw, 'CCGC_CPF');
    const cctrlRaw = extractColumnValueFromDataPool(raw, 'CCTRL_CPF_CGC');
    const ccgcValue = safeDigits(ccgcRaw ?? '');
    const cctrlValue = safeDigits(cctrlRaw ?? '');
    if (!ccgcValue || !cctrlValue) {
        return {
            reason: `CPF não encontrado no Data Pool: ` +
                `CCGC_CPF=${ccgcRaw ?? 'null'} / CCTRL_CPF_CGC=${cctrlRaw ?? 'null'}.`,
        };
    }
    const cpfBase = leftPad(ccgcValue, 9, '0');
    const cpfDv = leftPad(cctrlValue, 2, '0');
    const cpfCliente = cpfBase + cpfDv;
    if (cpfCliente.length !== 11) {
        return { reason: `CPF montado com tamanho inválido (${cpfCliente.length}).` };
    }
    return { cpfCliente };
}
/**
 * Agora pode receber o effectiveJobId (string ou number) para buscar o Data Pool real.
 */
function extractAccountInfoFromZip(buffer, effectiveJobId) {
    let zip;
    try {
        zip = new adm_zip_1.default(buffer);
    }
    catch (error) {
        return { found: false, reason: `ZIP inválido: ${error.message}` };
    }
    const entries = zip.getEntries();
    // 1) Extração atual (Agência/Conta) — log do workflow
    const workflowEntry = entries.find((entry) => entry.entryName.endsWith(TARGET_LOG_SUFFIX));
    // 2) Extração de CPF (Data Pool) — agora sempre pelo ID do artefato/ZIP/job!
    const idFromZipOrArg = (effectiveJobId !== undefined
        ? String(effectiveJobId)
        : (() => {
            // Tenta inferir do workflowEntry: extraindo do nome do próprio ZIP
            // Ex: ...Job_2801103_Data_Pool_Abertura de Conta Corrente PF_TI2.log
            const base = workflowEntry &&
                workflowEntry.entryName.match(/Job_(\d+)_/)?.[1];
            return base;
        })()) ?? '';
    let cpfEntry = undefined;
    if (idFromZipOrArg) {
        cpfEntry = getDataPoolLogEntry(entries, idFromZipOrArg);
    }
    if (!cpfEntry) {
        // fallback super robusto: acha o primeiro matching pelo regex (último backup)
        cpfEntry = entries.find((entry) => {
            const baseName = entry.entryName.split('/').pop() ?? entry.entryName;
            return CPF_TARGET_LOG_REGEX.test(baseName);
        });
    }
    let agencia;
    let conta;
    let cpfCliente;
    if (workflowEntry) {
        const raw = workflowEntry.getData().toString('utf8');
        const lines = raw.split(/\r?\n/);
        const responseLine = lines
            .reverse()
            .find((line) => line.includes('response.Content:') && line.includes('Agencia') && line.includes('Nova Conta'));
        if (responseLine) {
            const agenciaMatch = /"Agencia":"(\d+)"/.exec(responseLine);
            const contaMatch = /"Nova Conta":"(\d+)"/.exec(responseLine);
            agencia = agenciaMatch?.[1];
            conta = contaMatch?.[1];
        }
    }
    if (cpfEntry) {
        const rawCpf = cpfEntry.getData().toString('utf8');
        const cpfResult = extractCpfClienteFromLogContent(rawCpf);
        cpfCliente = cpfResult.cpfCliente;
    }
    else {
        // Fallback: tenta encontrar o CPF diretamente no workflow log (caso o Data Pool log não exista no ZIP)
        const fallbackEntry = workflowEntry;
        if (fallbackEntry) {
            const rawFallback = fallbackEntry.getData().toString('utf8');
            const cpfResult = extractCpfClienteFromLogContent(rawFallback);
            cpfCliente = cpfResult.cpfCliente ?? cpfCliente;
        }
    }
    const found = Boolean(agencia && conta);
    const db2TableUnavailable = detectDb2TableUnavailable(entries) || undefined;
    return {
        found,
        agencia,
        conta,
        cpfCliente,
        db2TableUnavailable,
        reason: found || cpfCliente
            ? undefined
            : !workflowEntry && !cpfEntry
                ? `Arquivos ${TARGET_LOG_SUFFIX} e/ou Job_<RequestId>_Data_Pool_Abertura de Conta Corrente PF_TI2.log não encontrados dentro do ZIP.`
                : !workflowEntry
                    ? `Arquivo ${TARGET_LOG_SUFFIX} não encontrado dentro do ZIP.`
                    : !cpfEntry
                        ? 'Arquivo de Data Pool do CPF não encontrado dentro do ZIP.'
                        : undefined,
    };
}
//# sourceMappingURL=artifact-extractor.js.map