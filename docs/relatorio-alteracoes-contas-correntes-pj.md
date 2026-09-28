# Relatório de Alterações — Workflow "Massa de Dados PJ" (Contas Correntes PJ)

**Card:** Massa de Dados PJ (cta-005)
**Workflow:** 4 etapas encadeadas — Cadastro de Clientes PSDC → Contas Correntes PJ → Contas Correntes PF → Habilitar Conta no MA
**Data:** Sessão de desenvolvimento — setembro/2026

---

## Resumo Executivo

O workflow "Massa de Dados PJ" apresentava dois problemas críticos: a última etapa ("Habilitar Conta no MA") nunca era executada, e mesmo quando executada manualmente, o step correspondente no tracker visual não era marcado como concluído. Adicionalmente, o painel de acompanhamento em tempo real estava desabilitado e não exibia os dados da conta criada de forma destacada. Todos os problemas foram corrigidos.

---

## 1. Causa Raiz — Etapa "Habilitar Conta no MA" nunca era disparada

### Sintoma
Após a etapa 3 ("Contas Correntes - PF") concluir com sucesso (indicado como verde no tracker), a etapa 4 nunca era submetida ao TDM. Confirmado pela ausência de qualquer payload salvo para o job "Habilitar Conta no MA Data Request" nos últimos registros do BFF.

### Causa
O BFF (`tdm.service.ts`) decide qual estratégia de extração de conta usar com base no `jobTitle` do payload:

```ts
const extractedContaInfo =
  payload.jobPubParams.jobTitle === PJ_JOB_TITLE  // 'Contas Correntes - PJ Data Request'
    ? extractContaInfoFromZip(artifact.buffer, effectiveJobId)
    : extractAccountInfoFromZip(artifact.buffer);
```

O step 3 do workflow PJ usa `jobTitle: 'Contas Correntes - PF Data Request'` — que **não corresponde** a `PJ_JOB_TITLE`. Por isso, a extração usava a função legada (`extractAccountInfoFromZip`), que procura especificamente o arquivo `Action_38_1_Workflow.log` dentro do ZIP retornado.

O job PF dentro do workflow PJ usa `vtfnodeID: '11020'` (diferente do vtfnode `38` do fluxo legado), portanto o artefato gerado **não contém** esse arquivo de log com esse nome exato — a extração retornava `found: false` silenciosamente, interrompendo o encadeamento antes de chamar `executeHabilitarContaMaPj`.

### Correção
**Arquivo:** `../tdm-bff/src/storage/artifact-extractor.ts`

A função `extractAccountInfoFromZip` recebeu um mecanismo de fallback:

1. **Estratégia primária** (inalterada): procura `Action_38_1_Workflow.log`
2. **Fallback (novo):** se o arquivo primário não existir ou não contiver a linha esperada, varre **todos os arquivos `.log`** do ZIP procurando uma linha com `response.Content:` + `"Agencia"` + `"Nova Conta"` — funcionando independentemente do `vtfnodeID` que gerou o log.

Isso resolveu a extração da conta no step 3, permitindo o encadeamento correto para o step 4.

---

## 2. Causa Raiz — Step "Habilitar Conta no MA" preso em "running" mesmo após o TDM concluir com sucesso

### Sintoma
Mesmo após confirmar manualmente (via script de teste direto ao TDM) que o job "Habilitar Conta no MA" completava com sucesso, o step correspondente no tracker do portal permanecia com o ícone de engrenagem (estado `running`), nunca ficando verde.

### Causa
O job "Habilitar Conta no MA" é um job de **configuração** — não gera artefato ZIP de saída. O BFF (`tdm.service.ts`) sempre tentava baixar o artefato incondicionalmente:

```ts
const artifact = await downloadArtifact(effectiveJobId, correlationId, userToken);
```

Quando o TDM respondia **404** (nenhum artefato disponível), o código lançava `AppError(502, 'TDM_DOWNLOAD_FAILED')`, fazendo o Angular tratar a situação como falha, mesmo que o job tivesse sido concluído com sucesso no TDM.

### Correção
**Arquivo:** `../tdm-bff/src/tdm/tdm.service.ts`

`downloadArtifact` passou a tratar 404 como "ausência de artefato" (não como erro):

```ts
if (response.status === 404) {
  logger.info(`Job ${jobId} completou sem artefato disponível (404).`, correlationId);
  return null;
}
```

`submitAndDownload` detecta esse `null` e retorna sucesso, sem tentar processar o ZIP:

```ts
if (!artifact) {
  return {
    ...,
    artifact: { buffer: Buffer.alloc(0), sizeBytes: 0 },
    extractedContaInfo: { found: false, reason: 'Job sem artefato.' },
  };
}
```

O Angular agora recebe `execution.success === true` e chama `completeStep(JP_PJ_STEP_HABILITAR_CONTA_MA)` corretamente — o step fica verde.

---

## 3. Erro de compilação bloqueando build (efeito colateral crítico)

### Sintoma
Diversas alterações de template pareciam não ter efeito no browser mesmo após hot-reload — o painel de log continuava invisível independentemente das mudanças no HTML.

### Causa
`TS2339: Property 'digito' does not exist on type 'ExtractedContaInfo'`

O campo `digito` (dígito verificador da conta PJ) era retornado pelo BFF e usado pela `HomeFacade`, mas os tipos do frontend (`ExtractedContaInfo` e `ExtractedContaInfoDto`) não o declaravam. Esse erro de TypeScript impedia o Angular de recompilar o componente `Home`, fazendo o browser continuar servindo a versão antiga do template (com o painel de log comentado).

### Correção
**Arquivos:**
- `src/app/core/models/execution.model.ts` — adicionado `digito?: string` em `ExtractedContaInfo`
- `src/app/core/api/dto/submit-response.dto.ts` — adicionado `digito?: string` em `ExtractedContaInfoDto`

Build confirmado limpo (zero erros) após a correção.

---

## 4. Reabilitação do painel "Acompanhamento do workflow"

O painel de log em tempo real, que estava comentado no template desde uma solicitação anterior, foi reabilitado através de uma **feature flag centralizada**:

**Arquivo:** `src/app/features/home/home.ts`
```ts
/**
 * FEATURE FLAG — Painel "Acompanhamento do workflow" (debug de jornadas
 * encadeadas). Exibido apenas enquanto estivermos desenvolvendo/validando
 * novos workflows.
 *
 * Para ocultar novamente no futuro: basta trocar para `false`.
 */
const SHOW_WORKFLOW_LOG = true;
```

A visibilidade do painel é controlada por `showWorkflowLog() && showJourneyProgress()` no template — aparece junto com o tracker de jornada, imediatamente ao clicar em "Gerar Massa", e permanece visível durante e após a execução (não é resetado ao concluir).

---

## 5. Resumo destacado de Agência / Conta / Dígito

Adicionado um card visual destacado (verde) dentro do painel de log, exibindo de forma clara os dados da conta corrente criada — tanto para o workflow PF (cta-003) quanto PJ (cta-005):

```
┌─────────────────────────────────────────────────────┐
│ CONTAS CORRENTES - PJ — Conta criada:                │
│ Agência: 448    Conta: 246173    Dígito: 4           │
└─────────────────────────────────────────────────────┘
```

**Arquivo:** `src/app/features/home/home.facade.ts`
- Nova interface `CreatedAccountSummary { workflowLabel, agencia, conta, digito? }`
- Novo signal `_lastCreatedAccount` / computed `lastCreatedAccount`
- Populado em:
  - `executeAgendarDebitoAutomatico` (workflow PF, cta-003) — sem dígito
  - `executeContasCorrentesPf` (workflow PJ, cta-005, step 3) — com dígito
- Resetado apenas ao **iniciar um novo workflow** (não ao concluir o atual) — garantindo que a informação permaneça visível mesmo após a jornada terminar.

---

## Arquivos Alterados — Resumo Consolidado

| Arquivo | Tipo de mudança |
|---|---|
| `../tdm-bff/src/storage/artifact-extractor.ts` | Fallback genérico de extração de conta (vtfnode-agnóstico) |
| `../tdm-bff/src/tdm/tdm.service.ts` | Tratamento gracioso de jobs sem artefato (404 → sucesso) |
| `src/app/core/models/execution.model.ts` | Campo `digito` adicionado ao model |
| `src/app/core/api/dto/submit-response.dto.ts` | Campo `digito` adicionado ao DTO |
| `src/app/features/home/home.facade.ts` | `CreatedAccountSummary` + signal `lastCreatedAccount` |
| `src/app/features/home/home.ts` | Feature flag `SHOW_WORKFLOW_LOG` + exposição de `lastCreatedAccount` |
| `src/app/features/home/home.html` | Painel de log reabilitado + card de resumo da conta |
| `src/app/features/home/home.scss` | Estilos `.workflow-log-empty` e `.created-account-summary` |
| `src/app/features/home/builders/habilitar-conta-ma-pj.builder.ts` | Validado contra payload manual funcional (mantido com campos de conexão vazios) |
| `src/app/features/home/builders/habilitar-conta-ma-pj.builder.spec.ts` | Novo — 10 casos de teste de regressão |
| `test_habilitar_ma.py` | Script auxiliar de teste manual direto ao TDM |

---

## Estado Final do Workflow "Massa de Dados PJ" (cta-005)

```
[1/4] Cadastro de Clientes PSDC        → ✓ concluído
[2/4] Contas Correntes - PJ            → ✓ concluído
[3/4] Contas Correntes - PF            → ✓ concluído (conta extraída via fallback genérico de log)
[4/4] Habilitar Conta no MA            → ✓ concluído (sucesso mesmo sem artefato ZIP)

Workflow "Massa de Dados PJ" concluído com sucesso.
```

Painel "Acompanhamento do workflow" exibe, ao final da execução:

```
┌─────────────────────────────────────────────────────┐
│ CONTAS CORRENTES - PJ — Conta criada:                │
│ Agência: 448    Conta: 246173    Dígito: 4           │
└─────────────────────────────────────────────────────┘
```

---

## Validação

- **Build TypeScript:** `ng build --configuration development` — 0 erros
- **Testes unitários:** `habilitar-conta-ma-pj.builder.spec.ts` — 10/10 passando
- **Teste manual direto ao TDM:** confirmado via `test_habilitar_ma.py` que o job "Habilitar Conta no MA" completa com sucesso no TDM usando os parâmetros do builder atual (campos de conexão vazios, conforme payload manual de referência)

## Riscos Residuais

- A extração de conta com fallback genérico assume que qualquer log com a linha `response.Content:` + `Agencia` + `Nova Conta` é válido — se o ZIP contiver múltiplos logs com esse padrão (cenário não observado até o momento), a lógica retorna a primeira ocorrência encontrada (varredura não determinística por ordem de arquivo no ZIP).
- O tratamento de 404 como "sucesso sem artefato" no BFF assume que o TDM sempre retorna 404 quando não há artefato — se o TDM retornar outro código de erro (400, 500) para o mesmo cenário, o comportamento de falha permanece inalterado (não mascarado).
