# Observações Técnicas — Workflow "Contas Correntes - PF" no ambiente TU

## Objetivo

Registrar o comportamento observado no card **Contas Correntes - PF** do workflow **Abertura de Contas**, especificamente no ambiente **TU**, para consulta futura e eventual correção adicional.

---

## Contexto

Durante a execução do workflow pelo portal `tdm-angular-novo`, o primeiro card:

- **Contas Correntes - PF**

estava falhando com status:

- `Failed`

O erro era percebido no portal durante a etapa:

- `[1/3] Contas Correntes - PF (TU)`

---

## Evidência inicial observada

O payload persistido pelo backend para o job com falha mostrava a seguinte configuração principal:

- `levelID: 3309`
- `configurationId: 2982`
- `p_ambiente_gerar_conta: PDB204P - TU`
- `p_SegmentoContaCorretePF: 000-CLIENTE CLASSIC`
- `p_agencia: 3995`
- `p_cpf: 0`
- `p_qtdcontas_ger: 1`
- `p_tp_disp: SEM DISPOSITIVO`
- `dataSourceProfile: DB204P`
- `dataTargetProfile: DB204P`
- `globalSourceConnection: DB204P`
- `globalTargetConnection: DB204P`

---

## Log de erro relevante

Foi apresentado log do TDM/DB2 com falha na tabela:

- `SIT_CTA_CLI`

Erro observado:

- `DB2 SQL Error: SQLCODE=-904`
- `SQLSTATE=57011`
- `SQLERRMC=00C90097;00000200;BISDD000.BISDS001`

Leitura técnica:
- o TDM aceitava o request
- o workflow iniciava normalmente
- múltiplas tabelas eram publicadas com sucesso
- a falha acontecia durante o publish de `SIT_CTA_CLI`

Isso indicava possível problema operacional/interno no ambiente de dados, mas ainda sem excluir divergência de configuração entre o payload do portal e o payload manual usado no Portal TDM.

---

## Evidência comparativa decisiva

Foi fornecido um payload executado **manualmente direto no Portal TDM** com sucesso.

Esse payload bem-sucedido continha:

- `levelID: 3309`
- `configurationId: 2985`
- `p_ambiente_gerar_conta: PDB204P - TU`
- `p_SegmentoContaCorretePF: 000-CLIENTE CLASSIC`
- `p_agencia: 3995`
- `p_cpf: 0`
- `p_qtdcontas_ger: 1`
- `p_tp_disp: SEM DISPOSITIVO`

Diferenças relevantes em relação ao portal:
- `configurationId` manual: **2985**
- `configurationId` portal: **2982**

Além disso, no payload manual:
- `dataSourceProfile: ""`
- `dataTargetProfile: ""`
- `globalSourceConnection: ""`
- `globalTargetConnection: ""`

Enquanto no portal:
- `dataSourceProfile: "DB204P"`
- `dataTargetProfile: "DB204P"`
- `globalSourceConnection: "DB204P"`
- `globalTargetConnection: "DB204P"`

---

## Correção aplicada

Arquivo alterado:

- `src/app/features/home/builders/workflow-environment.ts`

Alteração aplicada para o ambiente `TU` no card **Contas Correntes - PF**:

```ts
configurationId: 2982
```

foi alterado para:

```ts
configurationId: 2985
```

---

## Interpretação atual

A divergência mais objetiva encontrada entre o payload manual bem-sucedido e o payload gerado pelo portal foi o `configurationId`.

Assim, a correção aplicada foi:

- alinhar o `configurationId` do ambiente `TU` ao valor observado no request manual funcional

---

## Ponto ainda aberto para investigação futura

Mesmo após identificar a divergência de `configurationId`, permanece registrada uma diferença adicional relevante:

### Portal atual envia:
- `dataSourceProfile: DB204P`
- `dataTargetProfile: DB204P`
- `globalSourceConnection: DB204P`
- `globalTargetConnection: DB204P`

### Payload manual bem-sucedido envia:
- `dataSourceProfile: ""`
- `dataTargetProfile: ""`
- `globalSourceConnection: ""`
- `globalTargetConnection: ""`

## Importante
Neste momento, **não foi aplicada alteração nesses 4 campos**, porque:

1. já existia evidência anterior de funcionamento usando `DB204P`
2. a divergência comprovada mais forte era o `configurationId`
3. alterar múltiplas dimensões simultaneamente dificultaria isolar a causa real

---

## Recomendação para futura análise, se a falha voltar

Se o problema reaparecer mesmo com `configurationId: 2985`, revisar comparativamente:

1. `dataSourceProfile`
2. `dataTargetProfile`
3. `globalSourceConnection`
4. `globalTargetConnection`

Comparar sempre com o payload que funciona no **Portal TDM manual**.

Possível hipótese futura:
- o `configurationId 2985` pode estar associado a uma execução que espera conexões vazias
- enquanto a configuração antiga `2982` podia operar com `DB204P`
- isso precisa ser validado empiricamente se houver nova falha

---

## Resumo executivo

### Problema
Falha do card **Contas Correntes - PF** no ambiente **TU** ao executar via portal.

### Divergência encontrada
O portal estava usando:

- `configurationId: 2982`

enquanto o request manual bem-sucedido no Portal TDM usava:

- `configurationId: 2985`

### Ação realizada
Foi ajustado o mapeamento do ambiente `TU` para usar:

- `configurationId: 2985`

### Ponto de atenção futuro
Se necessário, investigar também o impacto de:
- `dataSourceProfile`
- `dataTargetProfile`
- `globalSourceConnection`
- `globalTargetConnection`

---

## Arquivos relacionados

- `src/app/features/home/builders/workflow-environment.ts`
- `src/app/features/home/builders/agendar-debito-automatico.builder.ts`
- `server/src/tdm/tdm.service.ts`
- `server/storage/payloads/2568917.json`

---

## Observação final

Este documento registra uma correção orientada por evidência comparativa entre:

- payload gerado pelo portal
- payload manual funcional no Portal TDM

Ele deve ser usado como referência caso a rotina volte a falhar ou caso seja necessária nova calibração técnica do card 1 no ambiente TU.

---

## Incidente — 19/08/2026

### Sintoma

O workflow "Abertura de Contas" voltou a apresentar falhas no card `[1/3] Contas Correntes - PF (TU)`.

Durante a investigação foram testados dois payloads manuais direto no Portal TDM:

**Payload A (testado manualmente — falhou):**
- `configurationId: 2982`
- `dataSourceProfile: ""`
- `dataTargetProfile: ""`
- `globalSourceConnection: ""`
- `globalTargetConnection: ""`

**Payload B (portal — também falhava neste momento):**
- `configurationId: 2985`
- `dataSourceProfile: DB204P`
- `dataTargetProfile: DB204P`
- `globalSourceConnection: DB204P`
- `globalTargetConnection: DB204P`

### Diagnóstico

A análise comparativa entre os payloads (2982 + vazio vs 2985 + DB204P) indicava divergência de configuração como possível causa. No entanto, após testes empíricos, a falha **não era causada pelo payload** em nenhuma das combinações.

A causa raiz foi identificada como **instabilidade operacional no servidor do Portal TDM**.

### Resolução

O servidor do Portal TDM foi **reiniciado** pela equipe responsável.

Após o reinício:
- o workflow executou de ponta a ponta com sucesso
- os 3 cards foram concluídos corretamente no ambiente TU
- nenhuma alteração de código foi necessária

### Lição registrada

> Quando o workflow falhar de forma aparentemente inexplicável — especialmente quando payloads previamente funcionais também passam a falhar — **verificar primeiro a disponibilidade/estabilidade do servidor Portal TDM antes de investigar configuração de payload**.

### Protocolo de diagnóstico recomendado para falhas futuras

1. Verificar se o Portal TDM está respondendo normalmente (health check / acesso direto)
2. Tentar reexecutar um payload conhecido como funcional (ex.: o último payload bem-sucedido salvo em `server/storage/payloads/`)
3. Se o payload funcional também falhar → problema operacional no servidor TDM, acionar reinício
4. Se apenas o portal falhar e o Portal TDM manual funcionar → investigar divergência de payload (ver seções anteriores deste documento)

---

### Log técnico detalhado do erro (Job 2591747 — antes do reinício)

O log completo do Publish Job gerado pelo TDM antes do reinício revelou informações importantes:

**Cabeçalho do job:**
```
Publish Job: 2591747
Data Pool: Abertura de Conta Corrente PF_TI2
Publish to: Database: DB208 and Schema: DB2PRD using Profile: CM2AB
```

**Observação crítica sobre o Data Pool e o Profile:**

O log registra `Data Pool: Abertura de Conta Corrente PF_TI2` e `Profile: CM2AB`.

- O perfil `CM2AB` corresponde ao ambiente **NOVO TI**, não ao TU.
- O `configurationId: 2982` (presente no payload testado manualmente) está associado a esse Data Pool/Profile de **TI**, não de TU.
- Isso reforça que o `configurationId: 2985` (atualmente em produção no portal) é o correto para o ambiente TU, como documentado na correção anterior.

**Progresso da publicação:**

Das 23 tabelas do workflow, 22 foram publicadas com sucesso, incluindo:
- `SIT_CTA_CLI` — 1 linha inserida sem erros (nota: o erro histórico anterior mencionava esta tabela, mas neste job ela completou com sucesso)
- A conta foi gerada: agência `3995`, conta `535342`, dígito `4`

**Tabela com falha:**

```
TSDO_ATUAL_CTA — 1 error(s)
```

**Mensagem de erro completa:**
```
ERROR: Publish failed for job 2591747
Insert into TSDO_ATUAL_CTA failed:
DataAccessResourceFailureException: PreparedStatementCallback
SQL: INSERT INTO "DB2PRD"."TSDO_ATUAL_CTA" (...)
DB2 SQL Error: SQLCODE=-904, SQLSTATE=57011
SQLERRMC=00C90097;00000210;CTASD000.CTASS031.00000006
DRIVER=4.25.1301
```

**Interpretação do erro DB2:**

| Campo | Valor | Significado |
|---|---|---|
| `SQLCODE` | `-904` | Recurso indisponível — não é erro de dados ou configuração |
| `SQLSTATE` | `57011` | Tablespace inacessível (cheio, em modo de emergência ou bloqueado) |
| `SQLERRMC` | `CTASD000.CTASS031` | Identificador do tablespace afetado no banco DB2 |

O `SQLCODE=-904` é um erro operacional de infraestrutura do banco de dados. Ele indica que o tablespace `CTASD000.CTASS031` estava indisponível no momento da inserção — não há relação com configuração de payload, `configurationId` ou campos de conexão.

**Conclusão técnica do log:**

A falha foi integralmente causada por indisponibilidade de recurso DB2 (`SQLCODE=-904`) no tablespace da tabela `TSDO_ATUAL_CTA`. A conta já havia sido criada com sucesso (conta `535342`, agência `3995`) antes da falha — o problema ocorreu na última etapa de registro de saldo, não no processo de geração da conta em si.

Após o reinício do servidor Portal TDM (que libera conexões e possivelmente contribui para a recuperação do tablespace), o workflow voltou a funcionar normalmente.
