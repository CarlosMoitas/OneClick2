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
│  Controla o acesso às rotas e ao gateway do Portal              │
│  Retorna: JWT assinado pelo servidor Node.js                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Fluxo Detalhado de Login

### Etapa 1 — Usuário digita credenciais

O usuário acessa `http://portal:4200/login` e preenche:
- Usuário (ex.: `m627529`)
- Senha corporativa do TDM

### Etapa 2 — Angular envia para o servidor

O Angular chama `POST /gw/api/auth/login` via HTTPS com o body:
```json
{ "username": "m627529", "password": "****" }
```
A senha trafega **apenas via HTTPS** — nunca fica em localStorage, cookie ou log.

### Etapa 3 — Servidor valida contra o Broadcom TDM

O servidor Node.js (`server/src/auth/auth.service.ts`) faz uma única chamada ao TDM:
```
POST https://tdm-server:8443/TestDataManager/user/login
Authorization: Basic m627529:senha
```
- Se o TDM aceitar → retorna um Bearer Token TDM para aquele usuário
- Se o TDM rejeitar (usuário inválido, senha errada, conta inativa) → retorna `401 Unauthorized`

**A senha é descartada imediatamente após essa chamada — não é salva em nenhum lugar.**

### Etapa 4 — Servidor emite o JWT do Portal

Após a confirmação do TDM, o servidor emite um **JWT próprio** assinado com `JWT_SECRET` (configurado em `server/.env`):

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
- Não contém senha, não contém dados sensíveis

### Etapa 5 — Angular armazena o JWT

O Angular armazena no `localStorage` do browser:
```
tdm_access_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
tdm_authenticated_user = { "id": "m627529", "username": "m627529" }
```

**O que NÃO é armazenado:** senha, Bearer Token TDM, segredos de qualquer tipo.

### Etapa 6 — Angular usa o JWT em todas as chamadas

O `auth.interceptor.ts` do Angular anexa automaticamente o JWT em cada requisição ao Gateway:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Etapa 7 — Servidor valida o JWT a cada requisição

O `auth.middleware.ts` do servidor valida o JWT antes de processar qualquer rota protegida:
- JWT válido → requisição processada
- JWT inválido/ausente → `401 Unauthorized`
- JWT expirado → `401 Unauthorized`

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

### No servidor (backend)

O `auth.middleware.ts` protege todas as rotas do Gateway:
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
| Bearer Token TDM do usuário | RAM do servidor Node.js (Map em memória) | 8h ou reinício | ❌ Não é senha |
| Senha do usuário | **Nenhum lugar** | **Não armazenada** | — |

---

## Garantias de Segurança

| Aspecto | Garantia |
|---|---|
| Nenhuma base de usuários própria | O TDM é o único provedor de identidade |
| Senha nunca armazenada | Descartada imediatamente após a validação no TDM |
| Senha nunca em log | Não aparece em nenhum arquivo de log do projeto |
| Senha nunca em banco | O projeto não usa banco de dados próprio |
| Usuário não autorizado no TDM | Login negado pelo TDM — portal nunca emite JWT |
| JWT forjado | Rejeitado — só são aceitos JWTs assinados com o `JWT_SECRET` correto |
| Acesso sem login | Auth Guard bloqueia e redireciona para /login |
| Sessão expirada durante workflow | Backend retorna 401 → interceptor redireciona para login automaticamente |
| Credenciais do TDM (sistêmico) | Ficam apenas no `server/.env` — o Angular nunca as conhece |

---

## Arquivos-Chave da Implementação

| Arquivo | Responsabilidade |
|---|---|
| `server/src/auth/auth.service.ts` | Valida credenciais contra o TDM, emite JWT do Portal, guarda Bearer Token TDM por usuário |
| `server/src/auth/auth.controller.ts` | Expõe endpoint `POST /api/auth/login` |
| `server/src/middleware/auth.middleware.ts` | Valida o JWT do Portal em todas as rotas protegidas do servidor |
| `src/app/core/services/auth.service.ts` | Gerencia a sessão no Angular (armazenamento e leitura do JWT) |
| `src/app/core/guards/auth.guard.ts` | Protege as rotas do Angular — redireciona para login se sem sessão |
| `src/app/core/interceptors/auth.interceptor.ts` | Anexa o JWT automaticamente em todas as chamadas HTTP do Angular |
| `src/app/core/interceptors/error.interceptor.ts` | Detecta 401 e redireciona para login automaticamente |
| `server/.env` | Armazena `JWT_SECRET` e `JWT_EXPIRES_IN` — nunca versionado no Git |

---

## Configuração de Segurança no `.env` do Servidor

```env
# Segredo para assinar os JWTs do Portal
JWT_SECRET=troque-por-um-segredo-forte-e-unico

# Validade da sessão (padrão: 8 horas)
JWT_EXPIRES_IN=8h

# Credenciais do usuário sistêmico do TDM (usadas pelo servidor para submeter jobs)
TDM_USERNAME=m627529
TDM_PASSWORD=****
```

> **Importante:** O arquivo `server/.env` está no `.gitignore` e **nunca deve ser versionado** no Git. Qualquer servidor que receba o projeto deve criar o `.env` a partir do `server/.env.example`.

---

## Ponto de Atenção Futuro

Atualmente qualquer usuário válido no TDM pode usar o portal. Se for necessário restringir o acesso a grupos ou projetos específicos (ex.: somente membros do time TDM), será necessário:

1. Consultar os grupos/roles do usuário no TDM após o login
2. Verificar se o usuário pertence ao grupo permitido no `auth.service.ts` do servidor
3. Negar o JWT se o usuário não tiver a permissão esperada

Essa funcionalidade não foi implementada pois todos os usuários do TDM que têm acesso ao Portal TDM corporativo são considerados autorizados para usar este portal.
