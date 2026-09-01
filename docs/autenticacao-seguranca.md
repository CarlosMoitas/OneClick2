# Autenticação e Segurança — Portal TDM 1Click

## Visão Geral

O portal **não possui uma base de usuários própria**. A autenticação é delegada inteiramente ao Broadcom TDM — o mesmo sistema que os engenheiros já usam para acessar o Portal TDM corporativo. Isso garante que:

- Somente usuários cadastrados e autorizados no TDM conseguem entrar
- Nenhuma senha é armazenada pelo portal em nenhum lugar
- O controle de acesso é centralizado no TDM

---

## Arquitetura de Segurança em Camadas

O sistema usa **duas camadas de autenticação independentes**:

```
┌─────────────────────────────────────────────────────────────────┐
│  CAMADA 1 — Identidade (TDM)                                    │
│  Valida quem você é usando as credenciais corporativas do TDM   │
│  Retorna: Bearer Token TDM                                      │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│  CAMADA 2 — Sessão do Portal (JWT)                              │
│  Controla o acesso às rotas e ao BFF do Portal                  │
│  Retorna: JWT assinado pelo BFF Node.js                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Fluxo Detalhado de Login

### Etapa 1 — Usuário digita credenciais

O usuário acessa `http://portal:4200/login` e preenche:
- Usuário (ex.: `m627529`)
- Senha corporativa do TDM

### Etapa 2 — Angular envia para o BFF

O Angular chama `POST /gw/api/auth/login` via HTTPS com o body:
```json
{ "username": "m627529", "password": "****" }
```
A senha trafega **apenas via HTTPS** — nunca fica em localStorage, cookie ou log.

### Etapa 3 — BFF valida a identidade contra o Broadcom TDM (ETAPA 1 de 2)

O BFF (`bff/src/auth/auth.service.ts`, método `verifyCredentialsAgainstTdm`) faz uma chamada **obrigatória** ao TDM:
```
POST https://tdm-server:8443/TestDataManager/user/login
Authorization: Basic m627529:senha
```

Esse método **falha DURAMENTE** em qualquer situação anômala:

| Situação | Resultado |
|---|---|
| Credenciais inválidas (401/403 do TDM) | `AppError(401)` — login bloqueado |
| TDM indisponível / timeout / rede | `AppError(503)` — login bloqueado |
| TDM retorna resposta inesperada | `AppError(503)` — login bloqueado |
| Credenciais válidas | Segue para a Etapa 4 |

> **Correção de segurança aplicada:** anteriormente, uma falha de rede ao consultar o TDM era silenciosamente ignorada e o login era concedido mesmo sem validar a identidade do usuário. Esse comportamento foi corrigido — hoje o login **só é concedido se o TDM confirmar as credenciais**.

**A senha é usada apenas nesta chamada — não é salva em nenhum lugar.**

### Etapa 4 — BFF captura o Bearer Token TDM para rastreabilidade (ETAPA 2 de 2)

Após a identidade ser confirmada na Etapa 3, o BFF chama novamente o TDM (`captureTdmTokenSilently`) para capturar o Bearer Token específico daquele usuário — usado depois para submeter jobs com rastreabilidade real (em vez do token sistêmico fixo).

Esta segunda chamada **falha SILENCIOSAMENTE**:

| Situação | Resultado |
|---|---|
| Captura bem-sucedida | Token guardado em memória (Map), por 8h |
| Qualquer falha (timeout, erro, etc.) | Retorna `null` — login **continua normalmente** com fallback para o token sistêmico do `.env` |

Essa etapa nunca bloqueia o login — ela é apenas uma melhoria de rastreabilidade, não um requisito de segurança.

### Etapa 5 — BFF emite o JWT do Portal

Após as duas etapas acima, o BFF emite um **JWT próprio** assinado com `JWT_SECRET` (configurado em `bff/.env`):

```json
{
  "sub": "m627529",
  "username": "m627529",
  "roles": ["user"],
  "iat": 1729349700,
  "exp": 1729378500
}
```

Propriedades do JWT do Portal:
- Validade padrão: **8 horas** (configurável via `JWT_EXPIRES_IN` no `.env`)
- Assinado com algoritmo `HS256`
- Não contém senha, não contém dados sensíveis, não contém o Bearer Token do TDM

### Etapa 6 — Angular armazena o JWT

O Angular armazena no `localStorage` do browser:
```
tdm_access_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
tdm_authenticated_user = { "id": "m627529", "username": "m627529" }
```

**O que NÃO é armazenado:** senha, Bearer Token TDM, segredos de qualquer tipo.

### Etapa 7 — Angular usa o JWT em todas as chamadas

O `auth.interceptor.ts` do Angular anexa automaticamente o JWT em cada requisição ao BFF:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Etapa 8 — BFF valida o JWT a cada requisição

O `auth.middleware.ts` do BFF valida o JWT antes de processar qualquer rota protegida:
- JWT válido → requisição processada
- JWT inválido/ausente → `401 Unauthorized`
- JWT expirado → `401 Unauthorized`

---

## Diagrama Completo do Fluxo

```
Usuário digita usuário/senha
        ↓
Angular → POST /gw/api/auth/login → BFF
        ↓
BFF ETAPA 1 (verifyCredentialsAgainstTdm) — OBRIGATÓRIA
  ├─ Credenciais inválidas  → 401, login bloqueado
  ├─ TDM indisponível       → 503, login bloqueado
  └─ Credenciais válidas    → continua
        ↓
BFF ETAPA 2 (captureTdmTokenSilently) — OPCIONAL
  ├─ Sucesso  → guarda Bearer Token TDM em memória (8h)
  └─ Falha    → ignora silenciosamente, segue com fallback sistêmico
        ↓
BFF emite JWT do Portal (8h, HS256)
        ↓
Angular armazena JWT no localStorage
        ↓
Usuário autenticado — acessa a Home
```

---

## Controle de Acesso — Rotas Protegidas

### No Angular (frontend)

O `auth.guard.ts` protege todas as rotas da aplicação:
```
Usuário tenta acessar /home
    ↓
Auth Guard verifica se há JWT no localStorage
    ↓
Não há JWT ou expirado → redirect para /login
Há JWT válido → acesso liberado
```

### No BFF (backend)

O `auth.middleware.ts` protege todas as rotas do BFF:
```
POST /gw/api/tdm/requests/submit-and-download
    ↓
Middleware extrai o JWT do header Authorization
    ↓
Verifica assinatura e validade com JWT_SECRET
    ↓
Inválido → 401 Unauthorized
Válido → requisição processada
```

---

## Expiração de Sessão — Comportamento Automático

Quando a sessão expira (JWT inválido ou vencido), o `error.interceptor.ts` do Angular detecta o `401` em qualquer chamada HTTP e:

1. Chama `authService.logout()` — limpa o JWT e os dados do usuário do `localStorage`
2. Redireciona automaticamente para `/login`
3. O usuário faz novo login com suas credenciais

Isso acontece de forma transparente — sem necessidade de ação manual do usuário além do novo login.

---

## O Que é Armazenado e Onde

| Dado | Onde | Duração | Contém senha? |
|---|---|---|---|
| JWT de sessão do Portal | `localStorage` do browser | 8h (ou logout) | ❌ Não |
| Username (somente nome) | `localStorage` do browser | Mesma sessão | ❌ Não |
| Bearer Token TDM do usuário | RAM do BFF Node.js (Map em memória) | 8h ou reinício | ❌ Não é senha |
| Senha do usuário | **Nenhum lugar** | **Não armazenada** | — |

---

## Garantias de Segurança

| Aspecto | Garantia |
|---|---|
| Nenhuma base de usuários própria | O TDM é o único provedor de identidade |
| Senha nunca armazenada | Usada apenas nas 2 chamadas de login, depois descartada |
| Senha nunca em log | Não aparece em nenhum arquivo de log do projeto |
| Senha nunca em banco | O projeto não usa banco de dados próprio |
| Usuário não autorizado no TDM | Login negado — BFF nunca emite JWT sem confirmação do TDM |
| TDM indisponível durante login | Login bloqueado com `503` — nunca é concedido "por padrão" |
| JWT forjado | Rejeitado — só são aceitos JWTs assinados com o `JWT_SECRET` correto |
| Acesso sem login | Auth Guard bloqueia e redireciona para /login |
| Sessão expirada durante workflow | BFF retorna 401 → interceptor redireciona para login automaticamente |
| Credenciais do TDM (sistêmico) | Ficam apenas no `bff/.env` — o Angular nunca as conhece |

---

## Arquivos-Chave da Implementação

| Arquivo | Responsabilidade |
|---|---|
| `bff/src/auth/auth.service.ts` | Etapa 1 (`verifyCredentialsAgainstTdm`) + Etapa 2 (`captureTdmTokenSilently`) + emissão do JWT |
| `bff/src/auth/auth.controller.ts` | Expõe endpoint `POST /api/auth/login` |
| `bff/src/middleware/auth.middleware.ts` | Valida o JWT do Portal em todas as rotas protegidas do BFF |
| `src/app/core/services/auth.service.ts` | Gerencia a sessão no Angular (armazenamento e leitura do JWT) |
| `src/app/core/guards/auth.guard.ts` | Protege as rotas do Angular — redireciona para login se sem sessão |
| `src/app/core/interceptors/auth.interceptor.ts` | Anexa o JWT automaticamente em todas as chamadas HTTP do Angular |
| `src/app/core/interceptors/error.interceptor.ts` | Detecta 401 e redireciona para login automaticamente |
| `bff/.env` | Armazena `JWT_SECRET` e `JWT_EXPIRES_IN` — nunca versionado no Git |

---

## Configuração de Segurança no `.env` do BFF

```env
# Segredo para assinar os JWTs do Portal
JWT_SECRET=troque-por-um-segredo-forte-e-unico

# Validade da sessão (padrão: 8 horas)
JWT_EXPIRES_IN=8h

# Credenciais do usuário sistêmico do TDM (usadas como fallback quando o
# token do usuário logado não está disponível)
TDM_USERNAME=m627529
TDM_PASSWORD=****
```

> **Importante:** O arquivo `bff/.env` está no `.gitignore` e **nunca deve ser versionado** no Git. Qualquer servidor que receba o projeto deve criar o `.env` a partir do `bff/.env.example`.

---

## Ponto de Atenção Futuro

Atualmente qualquer usuário válido no TDM pode usar o portal. Se for necessário restringir o acesso a grupos ou projetos específicos (ex.: somente membros do time TDM), será necessário:

1. Consultar os grupos/roles do usuário no TDM após o login
2. Verificar se o usuário pertence ao grupo permitido no `auth.service.ts` do BFF
3. Negar o JWT se o usuário não tiver a permissão esperada

Essa funcionalidade não foi implementada pois todos os usuários do TDM que têm acesso ao Portal TDM corporativo são considerados autorizados para usar este portal.
