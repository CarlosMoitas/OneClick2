# Retrospectiva DevPS — Projeto TDM OneClick (Massa de Dados PJ)

## 1. Contexto da entrega

Nesta sprint, evoluímos a jornada **Massa de Dados PJ (card cta-005)** com foco em:

- extração do CPF do cliente a partir do artefato `.zip` retornado pelo TDM;
- encadeamento das etapas até o card **BROB - Geração de Contrato**;
- aumento de resiliência da leitura de logs reais de Data Pool;
- estabilidade operacional entre frontend e BFF local.

---

## 2. Objetivo técnico principal

Garantir a criação da variável **`cpfCliente`** no fluxo do step **Contas Correntes - PF** a partir de duas colunas do log:

- `CCGC_CPF` (base do CPF)
- `CCTRL_CPF_CGC` (dígitos finais)

### Regra aplicada

1. `CCGC_CPF` deve ter 9 posições (`leftPad` com `0` à esquerda)
2. `CCTRL_CPF_CGC` deve ter 2 posições (`leftPad` com `0` à esquerda)
3. concatenação final:
   - `cpfCliente = cpfBase + cpfDv`

Exemplo:

- `CCGC_CPF = 47221438` → `047221438`
- `CCTRL_CPF_CGC = 11` → `11`
- `cpfCliente = 04722143811`

---

## 3. O que foi implementado

## 3.1 Extração robusta no BFF

**Arquivo:** `bff/src/storage/artifact-extractor.ts`

Implementamos/ajustamos:

- busca do arquivo de Data Pool por nome esperado:
  - `Job_<RequestID>_Data_Pool_Abertura de Conta Corrente PF_TI2.log`
- fallback por regex para encontrar o log quando necessário;
- leitura tolerante a:
  - TAB e múltiplos espaços;
  - variação de row;
  - colunas com sufixo `_ST`.

### Colunas suportadas na extração

- principal:
  - `CCGC_CPF`
  - `CCTRL_CPF_CGC`
- fallback:
  - `CCGC_CPF_ST`
  - `CCTRL_CPF_CGC_ST`

### Trecho crítico (leftPad + concatenação)

```ts
const cpfBase = leftPad(ccgcValue, 9, '0');
const cpfDv = leftPad(cctrlValue, 2, '0');
const cpfCliente = cpfBase + cpfDv;
```

---

## 3.2 Ajuste de propagação no frontend (workflow)

**Arquivo:** `src/app/features/home/home.facade.ts`

Aprimoramentos no step `[3/5]`:

- separação de validação de conta/agência e CPF;
- log explícito quando CPF é encontrado;
- preservação de `cpfCliente` no contexto para steps seguintes.

---

## 3.3 Ajuste de regra para BROB

**Arquivo:** `src/app/features/home/builders/brob-geracao-contrato.builder.ts`

Regra alinhada com negócio:

- `p_cpf_brob` passou a receber o **CPF completo (11 dígitos)** gerado no processo Cadastro PF.

---

## 4. Evidências e validações

- Testes de extração executados com sucesso:
  - `bff/src/storage/test-cpf-extraction.test.ts`
  - resultado: **PASS (10) / FAIL (0)**
- Validação com log real de Data Pool mostrou CPF montado corretamente em cenário de referência:
  - `cpfCliente: "45853224697"`

---

## 5. Problemas encontrados na jornada (e resolução)

## 5.1 “CPF não encontrado no Data Pool”

**Causas identificadas:**

- variações reais de log não cobertas inicialmente;
- alguns cenários com colunas `_ST`.

**Ação:**

- parser tornado mais resiliente com fallback de colunas e estratégia de tokenização numérica.

---

## 5.2 “Gateway Indisponível” / falha de login mesmo com VPN

**Causa operacional principal:**

- BFF correto sem arquivo `.env` local.

**Ação:**

- restauração de `.env` no BFF atualizado;
- reinicialização do serviço no caminho correto do projeto.

---

## 6. Aprendizados da sprint

- Logs reais de Data Pool possuem variações relevantes; parser precisa ser defensivo.
- Mensagens de UI podem mascarar causa real quando dependem de múltiplas condições.
- Em ambiente local, disponibilidade do gateway depende de:
  - BFF correto em execução;
  - `.env` válido;
  - conectividade VPN/DNS/rota com TDM.
- Padronizar o caminho oficial de execução evita confusão entre cópias de BFF.

---

## 7. Próximos passos recomendados (DevPS)

1. **Observabilidade**
   - adicionar logs estruturados no BFF para indicar:
     - arquivo ZIP lido,
     - colunas encontradas,
     - motivo detalhado quando CPF não for montado.

2. **Hardening de configuração**
   - validação de `.env` obrigatório no startup;
   - fail-fast com mensagem clara se variáveis críticas do TDM estiverem ausentes.

3. **Qualidade**
   - ampliar testes para múltiplos formatos de Data Pool;
   - criar casos com `_ST`, row variável e espaçamento inconsistente.

4. **Operação**
   - documentar runbook único:
     - pasta oficial de execução,
     - sequência de subida frontend/BFF,
     - checklist de health/login.

---

## 8. Resumo executivo

A entrega resolveu o ponto central da jornada: **composição do CPF via Data Pool com leftPad e concatenação**, mantendo o valor disponível para o step posterior de contrato (BROB), além de fortalecer a estabilidade do fluxo contra variações reais de log e problemas de configuração local.
