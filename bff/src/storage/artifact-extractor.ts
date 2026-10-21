import AdmZip from 'adm-zip';

/**
 * Extrai Agência e Número de Conta a partir do artefato ZIP retornado pelo
 * TDM na execução da rotina "Contas Correntes - PF" (card Agendar Débito
 * Automático).
 *
 * O ZIP contém arquivos de log do workflow executado no TDM. Um deles
 * (Action_38_1_Workflow.log) registra a resposta da chamada que efetivamente
 * cria a conta corrente, contendo uma linha com "Agencia" e "Nova Conta".
 *
 * Essa informação alimenta o próximo passo do workflow (card "Habilitar
 * Conta MA"), que exige P_AGENCIA_MA e P_CONTA_MA.
 */
export interface ExtractedAccountInfo {
  found: boolean;
  agencia?: string;
  conta?: string;
  /**
   * CPF do cliente extraído do Data Pool (CCGC_CPF + CCTRL_CPF_CGC),
   * já formatado com leftPad (9 + 2 = 11 dígitos).
   *
   * Ex: CCGC_CPF=47221438 => 047221438; CCTRL_CPF_CGC=11 => 11; cpfCliente=04722143811
   */
  cpfCliente?: string;
  /**
   * Parte base do CPF (CCGC_CPF) já normalizada com leftPad para 9 dígitos.
   * Mantida separadamente para permitir ao endpoint espelhar a mesma regra
   * do card 005 no request do BROB (cpfBase ?? cpfCliente ?? '').
   */
  cpfBase?: string;
  /**
   * `true` quando qualquer arquivo .log do artefato contém `SQLCODE=-904`,
   * indicando que uma tabela DB2 estava indisponível durante a execução.
   * Permite ao frontend exibir uma mensagem de diagnóstico específica.
   */
  db2TableUnavailable?: boolean;
  /**
   * `true` quando qualquer arquivo .log do artefato contém `SQLCODE=-803`,
   * indicando violação de chave única (registro duplicado) na tabela DB2.
   * Ocorre quando o TDM tenta inserir um dado que já existe no sistema.
   * Permite ao frontend exibir mensagem orientando o usuário a verificar
   * se o cliente/dado já está cadastrado antes de tentar novamente.
   */
  db2DuplicateKey?: boolean;
  reason?: string;
}

const TARGET_LOG_SUFFIX = 'Action_38_1_Workflow.log';
const SQLCODE_904 = 'SQLCODE=-904';
const SQLCODE_803 = 'SQLCODE=-803';

/**
 * Varre TODOS os arquivos .log contidos no ZIP em uma única passagem,
 * procurando pelos códigos de erro DB2 conhecidos:
 *   - SQLCODE=-904: objeto/tabela indisponível (bloqueio, manutenção)
 *   - SQLCODE=-803: violação de chave única (registro duplicado)
 *
 * Retorna flags independentes para cada código encontrado.
 */
function scanDb2Errors(entries: AdmZip.IZipEntry[]): {
  tableUnavailable: boolean;
  duplicateKey: boolean;
} {
  let tableUnavailable = false;
  let duplicateKey = false;

  for (const entry of entries) {
    if (!entry.entryName.toLowerCase().endsWith('.log')) continue;
    try {
      const content = entry.getData().toString('utf8');
      if (content.includes(SQLCODE_904)) tableUnavailable = true;
      if (content.includes(SQLCODE_803)) duplicateKey = true;
    } catch {
      // ignora entradas ilegíveis — não bloqueia a análise dos demais logs
    }
    if (tableUnavailable && duplicateKey) break; // ambos encontrados, encerra cedo
  }

  return { tableUnavailable, duplicateKey };
}
/**
 * Garante que o arquivo de log correto seja buscado pelo ID real do artefato (.zip)
 */
function getDataPoolLogEntry(entries: AdmZip.IZipEntry[], effectiveJobId: string | number): AdmZip.IZipEntry | undefined {
  // Busca por filename exato com o número do ZIP/job
  const expected = `Job_${effectiveJobId}_Data_Pool_Abertura de Conta Corrente PF_TI2.log`;
  return entries.find(e =>
    e.entryName.split('/').pop()?.toLowerCase() === expected.toLowerCase()
  );
}
const CPF_TARGET_LOG_REGEX = /^Job_\d+_Data_Pool_Abertura de Conta Corrente PF_TI2\.log$/i;

function leftPad(value: string, length: number, padChar: string): string {
  if (value.length >= length) return value;
  return padChar.repeat(length - value.length) + value;
}

function safeDigits(value: string): string {
  return (value ?? '').toString().trim().replace(/[^\d]/g, '');
}

function extractColumnValueFromDataPool(raw: string, columnName: string): string | undefined {
  // Suporta:
  // - CLIENTE_AGENCIA  CCGC_CPF        1  458532246
  // - CLIENTE_AGENCIA  CCGC_CPF_ST     1  458532246
  // - separadores com TAB ou múltiplos espaços
  // - "Row" variando (não fixo em 1)

  const escapedColumn = columnName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const escapedColumnSt = `${escapedColumn}_ST`;

  const lines = raw.split(/\r?\n|\r|\n/);

  const candidates: string[] = [];
  for (const line of lines) {
    if (!line.includes('CLIENTE_AGENCIA')) continue;
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
      if (/^\d+$/.test(valueToken)) return valueToken;
    }

    // Fallback: pega o último trecho numérico da linha
    const numericChunks = line.match(/\d+/g);
    if (numericChunks?.length) {
      return numericChunks[numericChunks.length - 1];
    }
  }

  return undefined;
}

function extractCpfClienteFromLogContent(raw: string): {
  cpfCliente?: string;
  cpfBase?: string;
  reason?: string;
} {
  const ccgcRaw = extractColumnValueFromDataPool(raw, 'CCGC_CPF');
  const cctrlRaw = extractColumnValueFromDataPool(raw, 'CCTRL_CPF_CGC');

  const ccgcValue = safeDigits(ccgcRaw ?? '');
  const cctrlValue = safeDigits(cctrlRaw ?? '');

  if (!ccgcValue || !cctrlValue) {
    return {
      reason:
        `CPF não encontrado no Data Pool: ` +
        `CCGC_CPF=${ccgcRaw ?? 'null'} / CCTRL_CPF_CGC=${cctrlRaw ?? 'null'}.`,
    };
  }

  const cpfBase = leftPad(ccgcValue, 9, '0');
  const cpfDv = leftPad(cctrlValue, 2, '0');
  const cpfCliente = cpfBase + cpfDv;

  if (cpfCliente.length !== 11) {
    return { reason: `CPF montado com tamanho inválido (${cpfCliente.length}).` };
  }

  return { cpfCliente, cpfBase };
}

/**
 * Agora pode receber o effectiveJobId (string ou number) para buscar o Data Pool real.
 */
export function extractAccountInfoFromZip(buffer: Buffer, effectiveJobId?: string | number): ExtractedAccountInfo {
  let zip: AdmZip;
  try {
    zip = new AdmZip(buffer);
  } catch (error) {
    return { found: false, reason: `ZIP inválido: ${(error as Error).message}` };
  }

  const entries = zip.getEntries();

  // 1) Extração atual (Agência/Conta) — log do workflow
  const workflowEntry = entries.find((entry) => entry.entryName.endsWith(TARGET_LOG_SUFFIX));

  // 2) Extração de CPF (Data Pool) — agora sempre pelo ID do artefato/ZIP/job!
  const idFromZipOrArg =
    (effectiveJobId !== undefined
      ? String(effectiveJobId)
      : (() => {
          // Tenta inferir do workflowEntry: extraindo do nome do próprio ZIP
          // Ex: ...Job_2801103_Data_Pool_Abertura de Conta Corrente PF_TI2.log
          const base =
            workflowEntry &&
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

  let agencia: string | undefined;
  let conta: string | undefined;
  let cpfCliente: string | undefined;
  let cpfBase: string | undefined;

  if (workflowEntry) {
    const raw = workflowEntry.getData().toString('utf8');
    const lines = raw.split(/\r?\n/);

    const responseLine = lines
      .reverse()
      .find(
        (line) =>
          line.includes('response.Content:') && line.includes('Agencia') && line.includes('Nova Conta'),
      );

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
    cpfBase = cpfResult.cpfBase;
  } else {
    // Fallback: tenta encontrar o CPF diretamente no workflow log (caso o Data Pool log não exista no ZIP)
    const fallbackEntry = workflowEntry;
    if (fallbackEntry) {
      const rawFallback = fallbackEntry.getData().toString('utf8');
      const cpfResult = extractCpfClienteFromLogContent(rawFallback);
      cpfCliente = cpfResult.cpfCliente ?? cpfCliente;
      cpfBase = cpfResult.cpfBase ?? cpfBase;
    }
  }

  const found = Boolean(agencia && conta);
  const { tableUnavailable, duplicateKey } = scanDb2Errors(entries);

  return {
    found,
    agencia,
    conta,
    cpfCliente,
    cpfBase,
    db2TableUnavailable: tableUnavailable || undefined,
    db2DuplicateKey: duplicateKey || undefined,
    reason:
      found || cpfCliente
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
