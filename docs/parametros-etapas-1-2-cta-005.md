# Documentação de Parâmetros — CTA-005 Massa de Dados PJ
## Etapas 1 e 2: PSDC e Contas Correntes PJ

> **Card:** CTA-005 — Massa de Dados PJ  
> **Projeto:** Abertura de Contas  
> **Versão:** 1.0  
> **Última atualização:** 2026-09-24

---

## Etapa 1/6 — Cadastro de Clientes PSDC

**Rotina TDM:** `Cadastro de Clientes PSDC Data Request`  
**Builder:** `cadastro-clientes-psdc.builder.ts`  
**Node TDM:** `Cadastro PJ Alfa - 01 Sócio` (`vtfnodeID: 2430`)  
**Alerta:** ⚠️ Gerar no máximo **10 CNPJs por vez**

> **Regra Operacional — Origem:** A limitação é estabelecida pelo próprio Node do TDM através do campo `vtfnodeDesc`, cujo valor é:  
> `"******GERAR NO MAXIMO 10 CNPJS POR VEZ********"`  
> Esse texto é enviado ao TDM no campo `publishJobs[0].vtfnodeDesc` do payload. O time de TDM configurou esse aviso diretamente no Node de execução (`vtfnodeID: 2430`), e o builder o repassa na submissão. A restrição deve ser observada durante a execução da rotina.

### IDs de Configuração TDM

| Propriedade         | Valor  | Descrição                                      |
|---------------------|--------|------------------------------------------------|
| `projectID`         | `2956` | ID do projeto DataDesign no TDM                |
| `versionID`         | `2957` | Versão do DataDesign utilizada                 |
| `levelID`           | `4338` | Nível do PublishJob no TDM                     |
| `vtfnodeID`         | `2430` | ID do nó de execução (VTFNode)                 |
| `configurationId`   | `2762` | ID da configuração de execução do job          |

### Parâmetros de Publicação (`publishVariables`)

| Parâmetro          | Valor                      | Tipo   | Origem  | Descrição                                                                 |
|--------------------|----------------------------|--------|---------|---------------------------------------------------------------------------|
| `p_tipo_cnpj`      | `01-Numérico`              | Fixo   | Builder | Define o formato do CNPJ gerado — numérico sem pontuação                  |
| `p_porte_empresa`  | `01-MICROEMPRESA `         | Fixo   | Builder | Porte da empresa cadastrada no PSDC                                        |
| `p_Const_Empresa`  | `00 - EMPRESA INDIVIDUAL`  | Fixo   | Builder | Natureza jurídica / constituição da empresa                                |
| `p_projeto_jira`   | `WORKFLOW_PROJETO_JIRA`    | Fixo   | Shared  | Código do projeto Jira vinculado à rastreabilidade da geração de massa     |

### Parâmetros de Controle do Job

| Propriedade                    | Valor                                     | Descrição                                      |
|-------------------------------|-------------------------------------------|------------------------------------------------|
| `jobTitle`                    | `Cadastro de Clientes PSDC Data Request`  | Título do job submetido ao TDM                 |
| `username`                    | SSO do usuário (sessão Angular)           | Identifica quem executou o job no TDM          |
| `email`                       | `WORKFLOW_EMAIL`                          | E-mail de notificação (valor compartilhado)    |
| `batchEngineThread`           | `ANY`                                     | Thread de execução — sem afinidade específica  |
| `globalThreadName`            | `ANY`                                     | Thread global sem afinidade                    |
| `iterations`                  | `1`                                       | Executa uma iteração do job                    |
| `jobSubmissionOrder`          | `0`                                       | Ordem de submissão dentro do grupo             |
| `advancedToggleFlag`          | `true`                                    | Habilita modo avançado de submissão            |
| `selfServiceEmailMandate`     | `false`                                   | Não exige e-mail mandatório de self-service    |
| `scheduledDateTimeInMillisec` | `now.toISOString()`                       | Data/hora de agendamento (execução imediata)   |

---

## Etapa 2/6 — Contas Correntes PJ

**Rotina TDM:** `Contas Correntes - PJ Data Request`  
**Builder:** `contas-correntes-pj.builder.ts`  
**Node TDM:** `Abertura de Conta Corrente PJ Numérico` (`vtfnodeID: 440`)

### IDs de Configuração TDM

| Propriedade         | Valor  | Descrição                                      |
|---------------------|--------|------------------------------------------------|
| `projectID`         | `2476` | ID do projeto DataDesign no TDM                |
| `versionID`         | `2477` | Versão do DataDesign utilizada                 |
| `levelID`           | `2954` | Nível do PublishJob no TDM                     |
| `vtfnodeID`         | `440`  | ID do nó de execução (VTFNode)                 |
| `configurationId`   | `2991` | ID da configuração de execução do job          |

### Parâmetros de Publicação (`publishVariables`)

| Parâmetro                      | Valor                    | Tipo   | Origem  | Descrição                                                                               |
|-------------------------------|--------------------------|--------|---------|-----------------------------------------------------------------------------------------|
| `p_tipo_cnpj`                 | `01-Numérico`            | Fixo   | Builder | Tipo do CNPJ da empresa dona da conta — deve coincidir com a etapa 1                   |
| `p_ambiente_gerar_conta`      | `PCM2AB  - NOVO TI`      | Fixo   | Builder | Ambiente TDM onde a conta será gerada (TI2 — ambiente de testes integrados)             |
| `P_SEGMENTOCONTACORRENTEPJ`   | `000-NAO SEGMENTADA`     | Fixo   | Builder | Segmentação da conta corrente PJ no sistema Bradesco                                    |
| `p_agencia`                   | `448`                    | Fixo   | Builder | Código da agência onde a conta será aberta                                              |
| `P_CNPJ`                      | `0`                      | Fixo   | Builder | Placeholder: o TDM substitui pelo CNPJ gerado na etapa 1 em tempo de execução          |
| `p_porte_empresa_conta`       | `03-MÉDIA EMPRESA`       | Fixo   | Builder | Porte da empresa para classificação da conta (pode diferir do porte do cadastro PSDC)  |
| `p_projeto_jira`              | `WORKFLOW_PROJETO_JIRA`  | Fixo   | Shared  | Código do projeto Jira para rastreabilidade                                             |

### Parâmetros de Controle do Job

| Propriedade                    | Valor                                 | Descrição                                      |
|-------------------------------|---------------------------------------|------------------------------------------------|
| `jobTitle`                    | `Contas Correntes - PJ Data Request`  | Título do job submetido ao TDM                 |
| `username`                    | SSO do usuário (sessão Angular)       | Identifica quem executou o job no TDM          |
| `email`                       | `WORKFLOW_EMAIL`                      | E-mail de notificação (valor compartilhado)    |
| `batchEngineThread`           | `ANY`                                 | Thread de execução — sem afinidade específica  |
| `globalThreadName`            | `ANY`                                 | Thread global sem afinidade                    |
| `iterations`                  | `1`                                   | Executa uma iteração do job                    |
| `jobSubmissionOrder`          | `0`                                   | Ordem de submissão dentro do grupo             |
| `advancedToggleFlag`          | `true`                                | Habilita modo avançado de submissão            |
| `selfServiceEmailMandate`     | `false`                               | Não exige e-mail mandatório de self-service    |
| `scheduledDateTimeInMillisec` | `now.toISOString()`                   | Data/hora de agendamento (execução imediata)   |

---

## Comparativo entre as duas etapas

| Aspecto                    | Etapa 1 — PSDC                        | Etapa 2 — Contas PJ                        |
|---------------------------|---------------------------------------|--------------------------------------------|
| **Objetivo**              | Cadastrar PJ no PSDC (gerar CNPJ)    | Abrir conta corrente para o CNPJ gerado    |
| **Rotina TDM**            | Cadastro de Clientes PSDC Data Request | Contas Correntes - PJ Data Request        |
| **Node**                  | Cadastro PJ Alfa - 01 Sócio (2430)   | Abertura de Conta Corrente PJ Numérico (440) |
| **DataDesign Project**    | 2956 / versão 2957                    | 2476 / versão 2477                         |
| **Configuration**         | 2762                                  | 2991                                       |
| **Tipo CNPJ**             | 01-Numérico                           | 01-Numérico (mesmo padrão)                 |
| **Porte**                 | 01-MICROEMPRESA                       | 03-MÉDIA EMPRESA                           |
| **Ambiente**              | *(padrão TDM)*                        | PCM2AB - NOVO TI (TI2)                     |
| **Agência**               | *(não se aplica)*                     | 448                                        |
| **Limite por execução**   | ⚠️ Máximo 10 CNPJs                   | Sem restrição explícita                    |
| **Input do usuário**      | Apenas `username` (SSO)               | Apenas `username` (SSO)                    |
| **Parâmetros manuais**    | Nenhum — todos fixos no builder       | Nenhum — todos fixos no builder            |

---

## Observações importantes

1. **Dependência sequencial:** A etapa 2 depende do CNPJ gerado na etapa 1. O parâmetro `P_CNPJ = '0'` é um placeholder que o TDM resolve internamente buscando o resultado da execução anterior.

2. **Divergência de porte:** A etapa 1 cadastra como `01-MICROEMPRESA` enquanto a etapa 2 usa `03-MÉDIA EMPRESA`. Isso é intencional — reflete configurações distintas nos sistemas PSDC e Contas Correntes.

3. **Ambiente TI2:** A conta é aberta exclusivamente no ambiente `PCM2AB - NOVO TI`, garantindo que a massa gerada não impacte ambientes produtivos.

4. **Rastreabilidade:** Ambas as etapas usam `p_projeto_jira` (valor compartilhado em `shared-request-defaults.ts`) para vincular a geração ao projeto Jira e permitir auditoria.

5. **Username SSO:** O campo `username` é sempre capturado da sessão do usuário autenticado no Portal Angular — nunca um valor técnico fixo, garantindo rastreabilidade de quem gerou a massa.
