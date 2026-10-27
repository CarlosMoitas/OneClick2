# Documentação de Parâmetros — CTA-005 Massa de Dados PJ
## Etapa 4/6: Habilitar Conta no MA

> **Card:** CTA-005 — Massa de Dados PJ  
> **Projeto:** Abertura de Contas  
> **Versão:** 1.0  
> **Última atualização:** 2026-09-29  
> **Status:** ✅ Builder implementado e testado

---

## Contexto no Fluxo Completo

A Etapa 4 é a quarta de seis etapas do workflow de **Massa de Dados PJ**. Ela habilita a conta corrente PF recém-criada no módulo MA (Mobile/Agência) do sistema Bradesco.

```
Etapa 1 — Cadastro PSDC          ✅ Entregue
    │
    ▼
Etapa 2 — Contas Correntes PJ    ✅ Entregue
    │
    ▼
Etapa 3 — Contas Correntes PF    ✅ Entregue
    │
    ├──► Extrai CPF → usado na Etapa 6
    │
    └──► Extrai Agência + Conta ──► ETAPA 4 (esta) ──► Etapa 5
```

> **Pré-requisito obrigatório:** A Etapa 3 deve ter concluído com sucesso e os valores de `agencia` e `conta` devem ter sido extraídos do seu artefato antes de submeter esta etapa.

---

## Identificação da Rotina

| Propriedade              | Valor                                |
|--------------------------|--------------------------------------|
| **Rotina TDM**           | `Habilitar Conta no MA Data Request` |
| **Builder**              | `habilitar-conta-ma-pj.builder.ts`   |
| **Node TDM**             | `Habilitar MA NOVO TI`               |
| **vtfnodeID**            | `540`                                |
| **Interface de entrada** | `HabilitarContaMaPjFormData`         |

---

## IDs de Configuração TDM

| Propriedade       | Valor  | Descrição                             |
|-------------------|--------|---------------------------------------|
| `projectID`       | `3862` | ID do projeto DataDesign no TDM       |
| `versionID`       | `3863` | Versão do DataDesign utilizada        |
| `levelID`         | `4593` | Nível do PublishJob no TDM            |
| `vtfnodeID`       | `540`  | ID do nó de execução (VTFNode)        |
| `vtfnodeName`     | `Habilitar MA NOVO TI` | Nome do nó de execução  |
| `configurationId` | `3032` | ID da configuração de execução do job |

---

## Entradas do Builder (`HabilitarContaMaPjFormData`)

| Campo      | Tipo     | Obrigatório | Origem                                   | Descrição                                    |
|------------|----------|-------------|------------------------------------------|----------------------------------------------|
| `agencia`  | `string` | ✅ Sim      | Artefato da Etapa 3 (extração do `.log`) | Código da agência onde a conta foi aberta    |
| `conta`    | `string` | ✅ Sim      | Artefato da Etapa 3 (extração do `.log`) | Número da conta corrente PF a ser habilitada |
| `username` | `string` | ❌ Opcional | Sessão SSO do usuário no Portal Angular  | Se omitido, usa `WORKFLOW_USERNAME_FALLBACK` |

### Origem dos dados de Agência e Conta

Os valores `agencia` e `conta` **não são inseridos manualmente** pelo operador. Eles são extraídos automaticamente do artefato gerado pela Etapa 3:

```
Arquivo: Job_<RequestID>_Data_Pool_Abertura de Conta Corrente PF_TI2.log
Serviço: artifact-extractor.ts (BFF)
```

---

## Parâmetros de Publicação (`publishVariables`)

| Parâmetro        | Valor                   | Tipo     | Origem           | Descrição                                                        |
|------------------|-------------------------|----------|------------------|------------------------------------------------------------------|
| `P_AGENCIA_MA`   | `formData.agencia`      | Dinâmico | Artefato Etapa 3 | Código da agência extraído do log da conta PF                    |
| `P_CONTA_MA`     | `formData.conta`        | Dinâmico | Artefato Etapa 3 | Número da conta extraído do log da conta PF                      |
| `p_projeto_jira` | `'ENGPBIA-ENGENHARIA DE PLATAFORMA \| BIA TECH'` | Fixo | `shared-request-defaults.ts` | Tag de rastreabilidade enviada ao TDM em todos os jobs — vincula a execução ao projeto/time no Jira/Rally |

---

## Parâmetros de Controle do Job

| Propriedade                    | Valor                                | Descrição                                                       |
|-------------------------------|--------------------------------------|-----------------------------------------------------------------|
| `jobTitle`                    | `Habilitar Conta no MA Data Request` | Título do job submetido ao TDM                                  |
| `username`                    | SSO do usuário (sessão Angular)      | Identifica quem executou o job no TDM                           |
| `email`                       | `WORKFLOW_EMAIL`                     | E-mail de notificação (valor compartilhado)                     |
| `batchEngineThread`           | `ANY`                                | Thread de execução — sem afinidade específica                   |
| `globalThreadName`            | `ANY`                                | Thread global sem afinidade                                     |
| `globalSourceConnection`      | `''` (vazio)                         | ⚠️ Deve ser vazio — ver observação abaixo                      |
| `globalTargetConnection`      | `''` (vazio)                         | ⚠️ Deve ser vazio — ver observação abaixo                      |
| `dataSourceProfile`           | `''` (vazio)                         | ⚠️ Deve ser vazio — NÃO usar `PCM2AB`                          |
| `dataTargetProfile`           | `''` (vazio)                         | ⚠️ Deve ser vazio — NÃO usar `PCM2AB`                          |
| `iterations`                  | `1`                                  | Executa uma iteração do job                                     |
| `jobSubmissionOrder`          | `0`                                  | Ordem de submissão dentro do grupo                              |
| `advancedToggleFlag`          | `true`                               | Habilita modo avançado de submissão                             |
| `selfServiceEmailMandate`     | `false`                              | Não exige e-mail mandatório de self-service                     |
| `scheduledDateTimeInMillisec` | `now.toISOString()`                  | Data/hora de agendamento (execução imediata)                    |

---

## Observações Críticas de Configuração

### 1. Perfis de conexão devem ser VAZIOS

Esta rotina **não utiliza** perfil de conexão (`connectionProfile`). Os campos abaixo **devem permanecer como string vazia**:

```
dataSourceProfile      = ''   ← NÃO colocar 'PCM2AB'
dataTargetProfile      = ''   ← NÃO colocar 'PCM2AB'
globalSourceConnection = ''
globalTargetConnection = ''
```

> **Por quê:** O payload manual validado em ambiente TDM que executa com sucesso usa campos de conexão vazios. Incluir `PCM2AB` causa falha na execução do job. Essa regra está explicitamente coberta pelo teste unitário `'deve manter dataSourceProfile e dataTargetProfile como string vazia'`.

### 2. Agência e Conta vêm exclusivamente do artefato

Os parâmetros `P_AGENCIA_MA` e `P_CONTA_MA` **não devem ser hardcoded** nem inseridos manualmente. Eles são extraídos do artefato da Etapa 3 para garantir consistência entre a conta criada e a conta habilitada.

### 3. vtfnodeID 540 — ambiente NOVO TI

O node `540` (`Habilitar MA NOVO TI`) corresponde exclusivamente ao ambiente de testes integrados (TI2 / NOVO TI). Não deve ser alterado para outros ambientes sem validação junto ao time de TDM.

---

## Payload JSON Gerado (Exemplo)

```json
{
  "jobPubParams": {
    "scheduledDateTimeInMillisec": "2026-09-29T10:30:00.000Z",
    "almjobs": [],
    "rallyJobs": [],
    "jobParams": [],
    "publishJobs": [
      {
        "batchEngineThread": "ANY",
        "dataSourceProfile": "",
        "dataTargetProfile": "",
        "description": "",
        "jobTitle": "Group Job",
        "levelID": 4593,
        "publishVariables": [
          {
            "name": "P_AGENCIA_MA",
            "preResolveError": "",
            "preResolveValue": "",
            "value": "448"
          },
          {
            "name": "P_CONTA_MA",
            "preResolveError": "",
            "preResolveValue": "",
            "value": "123456"
          },
          {
            "name": "p_projeto_jira",
            "preResolveError": "",
            "preResolveValue": "",
            "value": "<WORKFLOW_PROJETO_JIRA>"
          }
        ],
        "seq": 1,
        "vtfnodeDesc": "Habilitar MA NOVO TI",
        "vtfnodeID": "540",
        "vtfnodeName": "Habilitar MA NOVO TI",
        "iterations": 1,
        "csvDelimiter": null,
        "csvQuotationMarks": null,
        "configurationId": 3032
      }
    ],
    "testMatches": [],
    "exportJobs": [],
    "scheduledDt": "2026-09-29T10:30:00.000Z",
    "selfServiceEmailMandate": false,
    "email": "<WORKFLOW_EMAIL>",
    "globalThreadName": "ANY",
    "scheduledDateTimeInMillis": 1759146600000,
    "currentDay": 29,
    "currentMonth": 9,
    "currentYear": 2026,
    "globalSourceConnection": "",
    "globalTargetConnection": "",
    "jobSubmissionOrder": "0",
    "jobTitle": "Habilitar Conta no MA Data Request",
    "username": "m123456"
  },
  "dataDesign": {
    "projectID": 3862,
    "versionID": 3863
  },
  "advancedToggleFlag": true
}
```

---

## Testes Unitários (`habilitar-conta-ma-pj.builder.spec.ts`)

A suíte possui **10 casos de teste** cobrindo:

| Teste | O que valida |
|-------|-------------|
| Estrutura válida de `SubmitRequestDto` | Presença de `jobPubParams`, `dataDesign` e `advancedToggleFlag` |
| IDs corretos (NOVO TI) | `levelID=4593`, `configurationId=3032`, `vtfnodeID='540'` |
| Perfis de conexão vazios | `dataSourceProfile` e `dataTargetProfile` devem ser `''` |
| Conexões globais vazias | `globalSourceConnection` e `globalTargetConnection` devem ser `''` |
| Injeção de agência/conta | `P_AGENCIA_MA` e `P_CONTA_MA` recebem os valores corretos |
| Username fallback | Usa `WORKFLOW_USERNAME_FALLBACK` quando `username` é omitido |
| Username fornecido | Usa o valor informado quando `username` está presente |
| DataDesign correto | `projectID=3862`, `versionID=3863` |
| jobTitle correto | `'Habilitar Conta no MA Data Request'` |
| Anti-hardcoding | Agências e contas diferentes geram variáveis distintas sem colisão |

Para executar os testes:

```bash
# Na raiz do projeto
npm test -- --reporter=verbose habilitar-conta-ma-pj
```

---

## Comparativo com Outras Etapas

| Aspecto                    | Etapa 2 — Contas PJ           | Etapa 3 — Contas PF         | Etapa 4 — Habilitar MA (esta)             |
|---------------------------|-------------------------------|------------------------------|-------------------------------------------|
| **Objetivo**              | Abrir conta PJ                | Abrir conta PF + extrair dados | Habilitar conta PF no módulo MA          |
| **Rotina TDM**            | Contas Correntes - PJ         | Contas Correntes - PF        | Habilitar Conta no MA                     |
| **vtfnodeID**             | `440`                         | *(ver builder)*              | `540`                                     |
| **configurationId**       | `2991`                        | *(ver builder)*              | `3032`                                    |
| **projectID / versionID** | `2476` / `2477`               | *(ver builder)*              | `3862` / `3863`                           |
| **Ambiente (profile)**    | `dataSourceProfile='PCM2AB'`  | *(ver builder)*              | `dataSourceProfile=''` ⚠️ vazio           |
| **Parâmetros dinâmicos**  | Nenhum (todos fixos)          | Nenhum (todos fixos)         | `P_AGENCIA_MA` e `P_CONTA_MA` dinâmicos  |
| **Depende de**            | Etapa 1                       | Etapa 2                      | Etapa 3 (extração de artefato)            |
| **Gera dados para**       | Etapas seguintes (via TDM)    | Etapas 4, 5 e 6              | Nenhum — etapa terminal de dados          |

---

## Posição no Card CTA-005

| Etapa   | Rotina TDM                    | Status             | Builder                                  |
|---------|-------------------------------|--------------------|------------------------------------------|
| 1/6     | Cadastro de Clientes PSDC     | ✅ Entregue        | `cadastro-clientes-psdc.builder.ts`      |
| 2/6     | Contas Correntes PJ           | ✅ Entregue        | `contas-correntes-pj.builder.ts`         |
| 3/6     | Contas Correntes PF           | ✅ Entregue        | `contas-correntes-pf.builder.ts`         |
| **4/6** | **Habilitar Conta no MA**     | **✅ Entregue**    | **`habilitar-conta-ma-pj.builder.ts`**   |
| 5/6     | Incluir Procurador PJ         | 🔴 A implementar   | `incluir-procurador-pj.builder.ts`       |
| 6/6     | BROB — Geração de Contrato    | 🔴 A implementar   | `brob-geracao-contrato.builder.ts`       |

---

## Referências

| Documento | Descrição |
|-----------|-----------|
| `docs/parametros-etapas-1-2-cta-005.md` | Documentação das Etapas 1 e 2 |
| `docs/plano-entrega-cta-005-etapas-3-a-6.md` | Plano de entrega completo das etapas 3 a 6 |
| `src/app/features/home/builders/habilitar-conta-ma-pj.builder.ts` | Código-fonte do builder |
| `src/app/features/home/builders/habilitar-conta-ma-pj.builder.spec.ts` | Testes unitários |
| `bff/src/storage/artifact-extractor.ts` | Serviço de extração de artefatos (BFF) |
