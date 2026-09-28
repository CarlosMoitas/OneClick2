# Texto para Jira — Evidência de Execução: Etapa 3/6 Contas Correntes PF (CTA-005)

> Pronto para colar no campo de comentário ou descrição do card no Jira.

---

## Texto sugerido

---

**✅ Etapa 3/6 — Contas Correntes PF: implementada e validada**

Concluída a implementação da Etapa 3 da jornada **Massa de Dados PJ (CTA-005)** no portal TDM OneClick.

---

**O que foi implementado**

O BFF passou a realizar, de forma automática e após a conclusão do job TDM da etapa, as seguintes ações:

1. **Download do artefato ZIP** retornado pelo job *Contas Correntes PF*
2. **Localização do arquivo de log** dentro do ZIP:
   `Job_<RequestID>_Data_Pool_Abertura de Conta Corrente PF_TI2.log`
3. **Extração e composição do CPF do cliente** a partir das colunas do Data Pool:

   | Campo no log | Tabela | Valor bruto (exemplo) | Regra | Valor tratado |
   |---|---|---|---|---|
   | `CCGC_CPF` | `CLIENTE_AGENCIA` | `47221438` | leftPad `'0'` → 9 posições | `047221438` |
   | `CCTRL_CPF_CGC` | `CLIENTE_AGENCIA` | `11` | leftPad `'0'` → 2 posições | `11` |

   **CPF composto:** `cpfCliente = 04722143811`

4. **Extração de Agência, Conta e Dígito** da conta corrente PF criada pelo job, via parser resiliente do artefato ZIP (vtfnode-agnóstico, com fallback genérico de log).

   Exemplo de saída capturada em execução real:
   ```
   Agência: 448    Conta: 246173    Dígito: 4
   ```

5. **Propagação automática** para as etapas seguintes:
   - `cpfCliente` → Etapa 6 (BROB — Geração de Contrato)
   - `agencia` + `conta` → Etapa 4 (Habilitar Conta no MA) e Etapa 5 (Incluir Procurador PJ)

---

**Cobertura de testes**

Arquivo: `bff/src/storage/test-cpf-extraction.test.ts`

Resultado: **10/10 casos passando ✅**

| # | Cenário | Entrada | CPF Esperado | Resultado |
|---|---------|---------|--------------|-----------|
| 1 | Exemplo do enunciado | `47221438` + `11` | `04722143811` | ✅ PASS |
| 2 | CCGC com 9 dígitos / CCTRL com 2 dígitos (sem padding) | `458532246` + `97` | `45853224697` | ✅ PASS |
| 3 | CCTRL com 1 dígito | `123456789` + `1` | `12345678901` | ✅ PASS |
| 4 | CCTRL = 0 | `123456789` + `0` | `12345678900` | ✅ PASS |
| 5 | CCGC com 1 dígito | `1` + `11` | `00000000111` | ✅ PASS |
| 6 | Separador com espaços múltiplos (em vez de TAB) | `47221438` + `11` | `04722143811` | ✅ PASS |
| 7 | Valores distintos | `99988877` + `22` | `09998887722` | ✅ PASS |
| 8 | `CCGC_CPF` ausente no log | — | `undefined` | ✅ PASS |
| 9 | `CCTRL_CPF_CGC` ausente no log | — | `undefined` | ✅ PASS |
| 10 | Ambos os campos ausentes | — | `undefined` | ✅ PASS |

CPF validado em execução com log real de Data Pool:
> `cpfCliente: "45853224697"`

---

**Arquivos alterados**

| Arquivo | Descrição da mudança |
|---|---|
| `bff/src/storage/artifact-extractor.ts` | Parser do log Data Pool com leftPad, fallback de colunas `_ST` e tolerância a TAB/espaços |
| `bff/src/storage/test-cpf-extraction.test.ts` | 10 casos de teste unitários (Jest) — novo arquivo |
| `src/app/features/home/home.facade.ts` | Propagação de `cpfCliente`, `agencia`, `conta` e `digito` para etapas seguintes |
| `src/app/core/models/execution.model.ts` | Campo `digito` adicionado ao model `ExtractedContaInfo` |
| `src/app/core/api/dto/submit-response.dto.ts` | Campo `digito` adicionado ao DTO de resposta |

---

**Status da etapa**

```
[3/6] Contas Correntes - PF  →  ✅ CONCLUÍDO
      ├── agencia:     448
      ├── conta:       246173
      ├── digito:      4
      └── cpfCliente:  04722143811
```

A variável `cpfCliente` está disponível no contexto da jornada para uso na Etapa 6 — BROB Geração de Contrato.
