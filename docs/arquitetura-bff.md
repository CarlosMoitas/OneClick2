# Arquitetura BFF (Backend For Frontend) — Portal TDM 1Click

## O que é BFF

**BFF (Backend For Frontend)** é um padrão arquitetural onde existe um servidor backend dedicado exclusivamente a servir um frontend específico. Em vez do frontend se comunicar diretamente com APIs externas (que podem ter contratos complexos, exigir credenciais sensíveis ou retornar mais dados do que o necessário), ele se comunica com o BFF — que age como intermediário inteligente, adaptando, agregando e protegendo as chamadas à API real.

---

## Como o Portal TDM 1Click implementa o BFF

```
┌──────────────────────────────────────────────────────────┐
│  Angular (frontend)                                      │
│  http://localhost:4200                                   │
│                                                          │
│  - Nunca fala diretamente com o TDM                     │
│  - Não conhece credenciais do TDM                        │
│  - Usa JWT do Portal para autenticação                   │
└───────────────────────────┬──────────────────────────────┘
                            │ HTTP/HTTPS
                            │ Authorization: Bearer <jwt-portal>
                            ▼
┌──────────────────────────────────────────────────────────┐
│  Node.js BFF (server/)                                   │
│  http://localhost:3000                                   │
│                                                          │
│  - Único ponto que conhece as credenciais do TDM         │
│  - Gerencia autenticação e sessões                       │
│  - Agrega operações complexas em endpoints simples       │
│  - Adapta contratos entre Angular e TDM                  │
│  - Persiste payloads para auditoria                      │
└───────────────────────────┬──────────────────────────────┘
                            │ HTTPS
                            │ Authorization: Bearer <token-tdm>
                            ▼
┌──────────────────────────────────────────────────────────┐
│  Broadcom TDM (API externa corporativa)                  │
│  https://10.198.2.185:8443                               │
│                                                          │
│  - TestDataManager/user/login                            │
│  - TDMDataFlowService/api/ca/v1/requests                 │
│  - TDMJobService/api/ca/v1/jobs/:id                     │
│  - downloadArtifact                                      │
└──────────────────────────────────────────────────────────┘
```

---

## Responsabilidades do BFF no Projeto

### 1. Proteção de Credenciais

O Angular **nunca** conhece usuário, senha ou Bearer Token do TDM. Toda autenticação com o TDM é feita exclusivamente dentro do BFF, usando as credenciais configuradas em `server/.env`.

```
Angular → envia login/senha do usuário → BFF valida no TDM → descarta a senha → emite JWT do Portal
```

### 2. Autenticação e Sessão

O BFF emite JWTs próprios do Portal, válidos por 8 horas, que o Angular usa em todas as chamadas subsequentes. O BFF também armazena em memória o Bearer Token TDM de cada usuário logado para que os jobs sejam submetidos com o token correto do usuário real.

### 3. Agregação de Operações Complexas

O endpoint mais importante do BFF é `POST /api/tdm/requests/submit-and-download`, que agrega em **uma única chamada** do Angular as seguintes operações:

```
1. Submeter o request ao TDM
2. Aguardar a conclusão do job (polling com retry)
3. Baixar o artefato ZIP em memória
4. Extrair a conta corrente do conteúdo do ZIP
5. Retornar o resultado consolidado para o Angular
```

Sem o BFF, o Angular precisaria gerenciar essas 5 etapas individualmente, com múltiplas chamadas e lógica de polling no cliente.

### 4. Adaptação de Contratos

O TDM usa payloads complexos com muitos campos técnicos. O BFF recebe payloads já montados pelos builders do Angular (`agendar-debito-automatico.builder.ts`, `habilitar-conta-ma.builder.ts`, etc.) e os envia diretamente ao TDM, garantindo compatibilidade entre os contratos.

### 5. Persistência de Auditoria

Cada payload submetido ao TDM é salvo automaticamente em `server/storage/payloads/<jobId>.json`. Isso permite:
- Reproduzir submissões problemáticas
- Auditar o que foi enviado ao TDM
- Comparar payloads em caso de falha

### 6. Health Check

O BFF monitora continuamente a conectividade com o TDM e expõe o status via endpoint de health check, que o Angular exibe no badge "Gateway Online/Offline" na navbar.

---

## Por que é BFF e não apenas "um backend genérico"

| Característica | Backend Genérico | BFF do Portal |
|---|---|---|
| Serve múltiplos clientes | ✅ | ❌ — exclusivo para este Angular |
| Contratos de API padronizados | ✅ | ❌ — mapeados para o Angular |
| Lógica de negócio genérica | ✅ | ❌ — específica do workflow dos 3 cards |
| Aggregation de chamadas | ❌ | ✅ — submit + polling + download em 1 chamada |
| Acoplamento ao frontend | ❌ | ✅ — intencionalmente acoplado |

As evidências de que é um BFF no código:

- Os DTOs (`submit-request.dto.ts`, `submit-response.dto.ts`) foram criados para mapear exatamente o contrato Angular ↔ BFF
- `submit-and-download` existe porque o Angular precisa de um único resultado, não de múltiplas chamadas
- O BFF conhece a estrutura interna do workflow dos 3 cards (extrai conta do ZIP, passa contexto entre etapas)
- O servidor não tem API pública — só serve este portal

---

## Arquivos-Chave do BFF

| Arquivo | Responsabilidade |
|---|---|
| `server/src/server.ts` | Ponto de entrada — inicia o servidor Express na porta 3000 |
| `server/src/app.ts` | Configuração do app Express — middlewares e rotas |
| `server/src/auth/auth.service.ts` | Valida credenciais no TDM, emite JWT, guarda token por usuário |
| `server/src/auth/auth.controller.ts` | Endpoint `POST /api/auth/login` |
| `server/src/tdm/tdm.client.ts` | Cliente HTTP que fala com o TDM (autenticação Bearer Token) |
| `server/src/tdm/tdm.service.ts` | Lógica de negócio: submit, polling, download, extração de artefato |
| `server/src/tdm/tdm.routes.ts` | Rotas `/api/tdm/*` — protegidas por `authMiddleware` |
| `server/src/health/health.service.ts` | Monitora conectividade com o TDM |
| `server/src/storage/storage.service.ts` | Persiste payloads em `server/storage/payloads/` |
| `server/src/storage/artifact-extractor.ts` | Extrai dados de conta corrente do artefato ZIP em memória |
| `server/src/middleware/auth.middleware.ts` | Valida JWT do Portal antes de qualquer rota protegida |
| `server/.env` | Credenciais do TDM — nunca expostas ao Angular |

---

## Fluxo do Workflow dos 3 Cards pelo BFF

```
Angular: clica em "Gerar Massa" no card cta-003
    ↓
Angular: POST /gw/api/tdm/requests/submit-and-download (payload Card 1)
    ↓
BFF: submete request ao TDM → aguarda job → baixa ZIP → extrai conta
    ↓
BFF: retorna { requestedJobId, effectiveJobId, extractedContaInfo }
    ↓
Angular (HomeFacade): monta payload Card 2 com conta extraída
    ↓
Angular: POST /gw/api/tdm/requests/submit-and-download (payload Card 2)
    ↓
BFF: submete Habilitar Conta MA → aguarda conclusão
    ↓
Angular (HomeFacade): monta payload Card 3
    ↓
Angular: POST /gw/api/tdm/requests/submit-and-download (payload Card 3)
    ↓
BFF: submete Débito Automático → aguarda conclusão → retorna resultado final
```

O BFF abstrai toda a complexidade de comunicação com o TDM, permitindo que o Angular se concentre apenas na orquestração do fluxo e na experiência do usuário.
