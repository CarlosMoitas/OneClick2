# Setup em Nova Máquina — biat-fed-tdm-jornada-web

## Visão Geral da Arquitetura

O portal é composto por **dois processos independentes** que devem rodar em paralelo:

```
┌─────────────────────────────────────────────────────┐
│  NAVEGADOR                                          │
│  http://localhost:4200                              │
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │  FRONTEND Angular 21          porta 4200     │  │
│  │  /  (raiz do projeto)                        │  │
│  │  npm start → ng serve --proxy-config          │  │
│  │  proxy: /gw/* → http://localhost:3000        │  │
│  └───────────────────┬──────────────────────────┘  │
│                      │ /gw/...                      │
│  ┌───────────────────▼──────────────────────────┐  │
│  │  BFF (Express/Node)           porta 3000     │  │
│  │  bff/                                        │  │
│  │  npm run dev → ts-node-dev                   │  │
│  │  → Broadcom TDM (10.198.2.185:8443)          │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

---

## Pré-requisitos

| Ferramenta | Versão mínima | Verificar |
|------------|--------------|-----------|
| Node.js    | 20.x LTS     | `node -v` |
| npm        | 11.x         | `npm -v`  |
| Git        | qualquer     | `git --version` |

> O projeto usa `"packageManager": "npm@11.11.0"`. Recomenda-se usar **nvm** (Linux/macOS) ou **nvm-windows** para gerenciar versões do Node.

---

## Passo 1 — Clonar o repositório

```bash
git clone https://github.com/Bradesco-Core/biat-fed-tdm-jornada-web.git
cd biat-fed-tdm-jornada-web
```

---

## Passo 2 — Instalar dependências do Frontend

Na **raiz** do projeto:

```bash
npm install
```

Isso instala o Angular CLI, compilador e demais dependências listadas em `package.json`.

---

## Passo 3 — Instalar dependências do BFF

Entrar na pasta `bff/` e instalar separadamente:

```bash
cd bff
npm install
cd ..
```

---

## Passo 4 — Configurar variáveis de ambiente do BFF

O arquivo `bff/.env` **não está versionado** e precisa ser criado manualmente:

```bash
# Copiar o template
copy bff\.env.example bff\.env      # Windows (cmd)
# ou
cp bff/.env.example bff/.env        # Linux/macOS/Git Bash
```

Editar `bff/.env` e preencher os valores reais:

```dotenv
# Porta do BFF (não alterar, a menos que haja conflito)
PORT=3000

# JWT — segredo para assinar a sessão interna do portal
JWT_SECRET=troque-por-um-segredo-forte-e-unico
JWT_EXPIRES_IN=8h

# Broadcom TDM — credenciais de acesso à API
TDM_BASE_URL=https://10.198.2.185:8443
TDM_USERNAME=<usuario_tdm>
TDM_PASSWORD=<senha_tdm>

# Opcional: Bearer Token manual (vazio = auto-login automático)
TDM_BEARER_TOKEN=

# Cabeçalhos opcionais exigidos por alguns endpoints TDM
TDM_ORIGIN=
TDM_REFERER=
```

> **Atenção:** Nunca commitar o arquivo `.env` com credenciais reais.

---

## Passo 5 — Rodar o projeto (modo desenvolvimento)

Abrir **dois terminais** na raiz do projeto:

### Terminal 1 — BFF

```bash
cd bff
npm run dev
```

Aguardar a mensagem:
```
Server running on port 3000
```

### Terminal 2 — Frontend Angular

```bash
npm start
```

Aguardar a mensagem:
```
Application bundle generation complete.
Local: http://localhost:4200/
```

Acessar no navegador: **http://localhost:4200**

---

## Estrutura de Pastas

```
biat-fed-tdm-jornada-web/
│
├── src/                          # Código-fonte Angular
│   ├── app/
│   │   ├── app.ts                # Componente raiz
│   │   ├── app.routes.ts         # Roteamento principal
│   │   ├── core/                 # API, models, interceptors
│   │   ├── features/
│   │   │   └── home/             # Tela principal do portal
│   │   │       ├── builders/     # Builders de jornadas TDM
│   │   │       ├── home.facade.ts
│   │   │       └── home.ts
│   │   ├── components/           # Componentes standalone
│   │   │   └── massa-dados-pj/
│   │   └── shared/               # Componentes/services reutilizáveis
│   │       ├── components/navbar/
│   │       └── services/
│   └── environments/             # Configurações por ambiente
│
├── bff/                          # Backend For Frontend (Express)
│   ├── src/
│   │   ├── server.ts             # Entrypoint
│   │   ├── app.ts                # Setup do Express
│   │   ├── auth/                 # Autenticação JWT
│   │   ├── tdm/                  # Integração Broadcom TDM
│   │   ├── health/               # Health check endpoint
│   │   ├── storage/              # Armazenamento de payloads/logs
│   │   ├── middleware/           # Auth, correlação, erros
│   │   ├── logging/              # Logger
│   │   └── config/               # Variáveis de ambiente
│   ├── .env.example              # Template de variáveis (commitar)
│   ├── .env                      # Valores reais (NÃO commitar)
│   ├── package.json
│   └── tsconfig.json
│
├── public/                       # Assets estáticos (favicon, imagens)
│   └── config/
│       └── app-config.js         # Configuração injetada em runtime
│
├── config/                       # Configurações por ambiente de deploy
│   ├── DEV/config.yaml
│   ├── HOM/config.yaml
│   └── PRD/config.yaml
│
├── docs/                         # Documentação do projeto
├── mocks/                        # Mock server (desenvolvimento offline)
├── proxy.conf.json               # Proxy Angular → BFF (/gw → :3000)
├── angular.json                  # Configuração Angular CLI
├── package.json                  # Dependências frontend
└── tsconfig.json                 # Configuração TypeScript
```

---

## Comandos de Referência Rápida

### Frontend (raiz)

| Comando | Descrição |
|---------|-----------|
| `npm start` | Servidor de desenvolvimento (porta 4200) |
| `npm run build` | Build de produção (`dist/`) |
| `npm test` | Testes unitários com Vitest |

### BFF (`bff/`)

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Servidor de desenvolvimento com hot-reload |
| `npm run build` | Compila TypeScript → `bff/dist/` |
| `npm start` | Inicia versão compilada (`node dist/server.js`) |
| `npm test` | Testes unitários com Jest |

---

## Proxy (como o frontend fala com o BFF)

O Angular está configurado com `proxy.conf.json`:

```json
{
  "/gw": {
    "target": "http://localhost:3000",
    "pathRewrite": { "^/gw": "" },
    "secure": false,
    "changeOrigin": true
  }
}
```

Toda chamada do Angular para `/gw/algum/endpoint` é redirecionada para `http://localhost:3000/algum/endpoint`.  
**O BFF precisa estar rodando antes de fazer chamadas à API.**

---

## Arquivos que NÃO estão no repositório (criação manual obrigatória)

| Arquivo | Como criar |
|---------|-----------|
| `bff/.env` | Copiar de `bff/.env.example` e preencher |
| `node_modules/` (raiz) | `npm install` na raiz |
| `bff/node_modules/` | `npm install` dentro de `bff/` |
| `bff/dist/` | `npm run build` dentro de `bff/` (só prod) |

---

## Troubleshooting

### "Cannot find module" ao rodar o BFF
```bash
cd bff && npm install
```

### Porta 3000 já em uso
Alterar `PORT=3001` no `bff/.env` e atualizar `proxy.conf.json`:
```json
{ "/gw": { "target": "http://localhost:3001", ... } }
```

### Erro de certificado SSL com o TDM (HTTPS self-signed)
O BFF já configura `httpsAgent` ignorando certificados inválidos internamente.  
Se necessário, adicionar ao `bff/.env`:
```dotenv
NODE_TLS_REJECT_UNAUTHORIZED=0
```

### Angular não consegue acessar o BFF
1. Confirmar que o BFF está rodando: `curl http://localhost:3000/health`
2. Confirmar que `npm start` usa o proxy: verificar `angular.json` → `serve.options.proxyConfig`
