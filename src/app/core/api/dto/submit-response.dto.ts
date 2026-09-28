/**
 * Contrato CONFIRMADO: resposta de POST /gw/api/requests/submit-and-download
 *
 * Representa o payload bruto retornado pelo Gateway após submissão e
 * acompanhamento (polling) do job no Broadcom TDM, incluindo o download
 * do artefato quando aplicável. Campos vêm diretamente do Gateway — a
 * camada de Model (core/models/execution.model.ts) desacopla a UI deste
 * formato.
 */
export interface ExtractedContaInfoDto {
  found: boolean;
  agencia?: string;
  conta?: string;
  /** Dígito verificador da conta — presente em workflows PJ (cta-005). */
  digito?: string;
  /** CPF do cliente montado a partir de CCGC_CPF(9) + CCTRL_CPF_CGC(2). */
  cpfCliente?: string;
  /**
   * `true` quando o artefato contém SQLCODE=-904 — tabela DB2 indisponível.
   * Permite ao frontend exibir diagnóstico específico em vez da mensagem genérica.
   */
  db2TableUnavailable?: boolean;
  reason?: string;
}

export interface SubmitResponseDto {
  success: boolean;
  requestedJobId?: number | string;
  childJobId?: number | string;
  effectiveJobId?: number | string;
  parentStatus?: string;
  childStatus?: string;
  sizeBytes?: number;
  artifactLocation?: string;
  message?: string;
  /**
 * Preenchido quando o artefato retornado permite extrair dados da conta
 * corrente criada e dados complementares do cliente (ex.: cpfCliente),
 * usados para encadear automaticamente próximos cards do workflow.
   */
  extractedContaInfo?: ExtractedContaInfoDto;
}
