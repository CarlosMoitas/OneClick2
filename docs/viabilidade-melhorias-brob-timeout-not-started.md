# Estudo de Viabilidade — Melhorias no Tratamento de Timeout/Not Started (BROB - Geração de Contrato)

**Data:** 2026-09-24  
**Contexto:** Card CTA-005 — Massa de Dados PJ / Jornada Contas Correntes PF  
**Gatilho:** Job ID 2855302 retornou `Task State = Not Started` após timeout de espera no card BROB - Geração de Contrato

---

## Problema Identificado

A mensagem de erro atual ao atingir o timeout é genérica e não distingue entre dois cenários distintos:

| Cenário | Task State | Risco de duplicidade |
|---------|-----------|----------------------|
| Job iniciou mas demorou demais | Running / Completed | **SIM** — não tentar novamente sem verificar |
| Job nunca chegou a iniciar | **Not Started** | **NÃO** — pode ser executado novamente com segurança |

### Mensagem atual (genérica):
> *"BROB - Geração de Contrato: erro — O tempo máximo de espera foi atingido. O job pode ainda estar em execução no TDM. Verifique o histórico no Portal TDM antes de tentar novamente para evitar duplicidade."*

---

## Melhoria 1 — Mensagem de erro contextualizada por Task State

### Viabilidade: ✅ VIÁVEL

**O que precisa ser feito:**
- O BFF já consulta o status do job durante o polling (`waitForJobCompletion`)
- O `Task State` já é retornado pela API do TDM na resposta de status
- Basta que o serviço de execução propague o `taskState` final até o frontend
- O frontend/builder do BROB verifica o estado e exibe mensagem específica

**Mensagem proposta para `Not Started`:**
> *"BROB - Geração de Contrato: erro — O tempo máximo de espera foi atingido e o job não chegou a iniciar (status: Not Started). Nenhuma execução foi realizada no TDM. O processo pode ser executado novamente sem risco de duplicidade."*

**Mensagem proposta para `Running` (timeout com job em andamento):**
> *"BROB - Geração de Contrato: erro — O tempo máximo de espera foi atingido. O job pode ainda estar em execução no TDM (status: Running). Verifique o histórico no Portal TDM antes de tentar novamente para evitar duplicidade."*

**Arquivos impactados:**
- `bff/src/tdm/tdm.service.ts` — propagar `taskState` na resposta de timeout
- `src/app/features/home/builders/brob-geracao-contrato.builder.ts` — tratar mensagem por estado
- `src/app/core/models/execution.model.ts` — incluir `taskState` no modelo se necessário

---

## Melhoria 2 — Retry parcial do BROB (sem refazer toda a jornada)

### Viabilidade: ✅ VIÁVEL (com desenvolvimento adicional)

**Premissa:** Quando o `Task State = Not Started`, todos os dados necessários para o BROB já foram computados nas etapas anteriores da jornada (agência, conta, cpfCliente). Não há necessidade de refazer as etapas 1 a 5.

**O que precisa ser feito:**

1. **Persistir os parâmetros do BROB em estado/sessão** após as etapas anteriores serem concluídas:
   - `cpfCliente` (extraído do Data Pool — etapa CTA-005)
   - `agencia` e `conta` (extraídos do artefato ZIP — etapa Contas Correntes PF)
   - Demais parâmetros do payload BROB (tipo contrato, produto, etc.)

2. **Expor um botão "Tentar novamente"** na tela de erro, visível apenas quando `taskState = Not Started`

3. **Implementar um endpoint ou ação de retry** que resubmete **somente** o payload BROB utilizando os parâmetros já salvos em estado, sem disparar o pipeline completo

**Arquivos impactados:**
- `src/app/features/home/home.facade.ts` — orquestrar o retry parcial
- `src/app/features/home/home.ts` / `home.html` — exibir botão de retry condicional
- `src/app/features/home/builders/brob-geracao-contrato.builder.ts` — builder deve aceitar parâmetros pré-computados
- `src/app/shared/services/journey-progress.service.ts` — manter estado entre tentativas
- `bff/src/tdm/tdm.service.ts` — suportar resubmissão isolada de etapa

**Considerações adicionais:**
- O retry deve ser idempotente: verificar se já existe um job recente para o mesmo CPF antes de submeter novamente
- Logar a tentativa de retry no histórico de execuções para rastreabilidade

---

## Resumo de Priorização Sugerida

| Melhoria | Complexidade | Impacto UX | Prioridade Sugerida |
|----------|-------------|------------|---------------------|
| Mensagem contextualizada por Task State | 🟢 Baixa | 🟡 Médio | Alta — implementar no próximo sprint |
| Retry parcial do BROB | 🟡 Média | 🟢 Alto | Média — planejar para sprint seguinte |

---

## Referências

- Job de exemplo com `Not Started`: Job ID `2855302`, agendado em 2026-09-24 14:38:51
- Card: **CTA-005** — Massa de Dados PJ
- Projeto: **Abertura de Contas** v1.0
- Jornada: **Contas Correntes PF**
