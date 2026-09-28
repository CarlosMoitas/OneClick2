# TDM OneClick — Apresentação do Projeto

> **Portal de automação de jornadas TDM para o time de Qualidade e Testes do Bradesco**  
> Plataforma web desenvolvida pelo time BIAT-FED para eliminar operações manuais repetitivas no portal TDM

---

## O que é o TDM OneClick?

O **TDM OneClick** é uma plataforma web interna que automatiza jornadas de preparação de massa de dados no sistema TDM (Test Data Management) do Bradesco. O operador acessa o portal, seleciona a jornada desejada, clica em **"Gerar Massa"** e acompanha em tempo real o progresso de todas as etapas — sem precisar navegar manualmente pelo Portal TDM, preencher formulários, aguardar jobs, copiar dados entre telas ou encadear manualmente cada passo do processo.

---

## O problema que ele resolve

Antes do OneClick, preparar massa de dados para um teste de integração exigia que o analista:

1. Acessasse o Portal TDM manualmente
2. Localizasse o job correto entre dezenas de rotinas disponíveis
3. Preenchesse todos os parâmetros (agência, conta, CNPJ, CPF, ambiente, etc.)
4. Aguardasse o job concluir — sem feedback de progresso
5. Baixasse o artefato ZIP gerado
6. Abrisse o ZIP, localizasse o arquivo de log correto
7. Lesse o log manualmente para extrair dados como agência, conta e CPF gerados
8. Voltasse ao Portal TDM e repetisse as etapas 2–7 para o próximo job da cadeia
9. Repetisse esse ciclo para **cada etapa da jornada** — que pode ter até 6 jobs encadeados

Com jornadas de até **6 etapas sequenciais**, esse processo manual tomava entre **30 e 90 minutos por execução** e era altamente suscetível a erros humanos (parâmetros errados, dados copiados incorretamente, jobs não encadeados na ordem certa).

---

## O que o OneClick entrega

| Antes (manual) | Depois (OneClick) |
|---|---|
| Acesso manual ao Portal TDM | Um clique no portal OneClick |
| Preenchimento manual de parâmetros | Parâmetros pré-configurados por jornada |
| Aguardar job sem feedback | Tracker visual em tempo real (step-by-step) |
| Download e leitura manual do ZIP/log | Extração automática de agência, conta e CPF |
| Copiar dados entre etapas manualmente | Encadeamento automático entre jobs |
| 30–90 minutos por jornada | **< 10 minutos por jornada** |
| Alto risco de erro humano | Validação e leftPad automáticos nos campos críticos |

**Estimativa de ganho de produtividade:** redução de até **85% do tempo** operacional por jornada executada.

---

## Arquitetura resumida

```
┌─────────────────────────────────────────────────────────────┐
│                    Portal OneClick (Angular)                  │
│  Seleção de jornada → Parâmetros → "Gerar Massa" → Tracker  │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTP (BFF)
┌───────────────────────────▼─────────────────────────────────┐
│                      BFF (Node.js/Express)                   │
│  Autenticação SSO · Submissão de jobs · Polling de status   │
│  Download de artefatos · Extração de dados dos logs         │
└───────────────────────────┬─────────────────────────────────┘
                            │ API REST
┌───────────────────────────▼─────────────────────────────────┐
│                       Portal TDM (Bradesco)                  │
│           Execução real dos jobs de preparação de dados      │
└─────────────────────────────────────────────────────────────┘
```

---

## Jornadas já implementadas

---

### ✅ CTA-003 — Agendar Débito Automático
**Projeto:** Abertura de Contas · **Versão:** 1.0

**O que faz:**  
Automatiza o fluxo de agendamento de débito automático para conta corrente PF, incluindo a abertura da conta e o vínculo com o débito automático.

**Etapas automatizadas:**

| Etapa | Job TDM | Status |
|-------|---------|--------|
| 1/2 | Contas Correntes — PF (abertura de conta) | ✅ Automatizado |
| 2/2 | Débito Automático (agendamento) | ✅ Automatizado |

**Destaques técnicos:**
- Extração automática de **agência e conta** do artefato ZIP gerado na etapa 1
- Encadeamento automático: a conta gerada na etapa 1 é passada automaticamente como parâmetro da etapa 2
- Exibição de resumo destacado ao final: **Agência · Conta** da conta criada
- Tracker visual em tempo real mostrando o progresso de cada etapa

---

### ✅ CTA-005 — Massa de Dados PJ
**Projeto:** Contas Correntes · **Versão:** 1.0

**O que faz:**  
Automatiza o fluxo completo de abertura de conta corrente para Pessoa Jurídica, incluindo o cadastro de cliente, abertura de conta PJ, abertura de conta PF vinculada, habilitação no módulo MA, inclusão de procurador e geração de contrato.

**Etapas automatizadas:**

| Etapa | Job TDM | Status |
|-------|---------|--------|
| 1/6 | Cadastro de Clientes PSDC | ✅ Automatizado |
| 2/6 | Contas Correntes — PJ | ✅ Automatizado |
| 3/6 | Contas Correntes — PF | ✅ Automatizado |
| 4/6 | Habilitar Conta no MA | ✅ Automatizado |
| 5/6 | Incluir Procurador PJ | ✅ Automatizado |
| 6/6 | BROB — Geração de Contrato | ✅ Automatizado |

**Destaques técnicos:**

- **Extração automática de CPF** a partir do log `Job_<RequestID>_Data_Pool_Abertura de Conta Corrente PF_TI2.log` dentro do artefato ZIP:
  - Campo `CCGC_CPF` com leftPad para 9 posições
  - Campo `CCTRL_CPF_CGC` com leftPad para 2 posições
  - CPF composto: `cpfCliente = cpfBase + cpfDv` (ex: `04722143811`)
- **Extração automática de agência, conta e dígito** do artefato ZIP (mecanismo vtfnode-agnóstico com fallback genérico de log)
- **Encadeamento completo de 6 etapas**: cada job recebe automaticamente os parâmetros extraídos das etapas anteriores
- **Tratamento de jobs sem artefato** (etapa 4 — "Habilitar Conta no MA" não gera ZIP): concluído com sucesso sem falsa falha
- **Tracker visual** com 6 steps, exibindo nome e status de cada etapa em tempo real
- **Resumo destacado** ao final da execução:
  ```
  CONTAS CORRENTES - PJ — Conta criada:
  Agência: 448    Conta: 246173    Dígito: 4
  ```
- **Cobertura de testes:** 10 casos unitários para extração de CPF (Jest) + 10 casos para o builder `habilitar-conta-ma-pj`

---

## Valor entregue ao negócio

### Produtividade operacional
- Jornada CTA-003 (2 etapas): de ~30 min manuais para **~3 min automatizados**
- Jornada CTA-005 (6 etapas): de ~90 min manuais para **~8 min automatizados**
- Redução estimada de **85% do tempo** por execução
- Eliminação de erros de digitação em campos críticos (CPF, agência, conta)

### Qualidade e rastreabilidade
- Cada execução é registrada com ID de job TDM, timestamp, usuário e parâmetros utilizados
- Painel de log em tempo real permite identificar falhas no momento em que ocorrem
- Mensagens de erro contextualizadas (ex: distinção entre `Not Started` e `Running` no timeout)

### Escalabilidade
- Arquitetura baseada em **builders independentes por jornada** — cada nova jornada pode ser adicionada sem alterar as existentes
- BFF genérico com extração de artefatos reutilizável entre todas as jornadas
- Padrão estabelecido permite onboarding rápido de novos fluxos TDM

---

## Próximas evoluções planejadas

| Melhoria | Descrição | Prioridade |
|----------|-----------|------------|
| Mensagem contextualizada por `Task State` | Distinguir `Not Started` de `Running` no timeout do BROB | Alta |
| Retry parcial do BROB | Reexecutar apenas a etapa BROB sem refazer toda a jornada | Média |
| Novas jornadas | Expansão para outros projetos/carteiras além de Abertura de Contas | A definir |

---

## Equipe e repositório

**Time:** BIAT-FED  
**Repositório:** `biat-fed-tdm-jornada-web`  
**Stack:** Angular 17+ (frontend) · Node.js/Express + TypeScript (BFF) · Autenticação SSO Bradesco  
**Ambientes:** DEV · HOM · PRD
