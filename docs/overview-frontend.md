# Documentação de Arquitetura Frontend — Portal OneClick

---

## 1. Visão Geral

O frontend do Portal OneClick é implementado com **Angular**. A aplicação possui estrutura modular, componentes reutilizáveis, integração centralizada com o backend (BFF) e organização em features. Visa facilitar as jornadas de automação, cadastro, consulta e visualização de dados de clientes PJ.

---

## 2. Estrutura de Diretórios

```
src/
├── app/
│   ├── app.config.ts         # Configuração do app Angular
│   ├── app.routes.ts         # Rotas principais
│   ├── app.ts / app.html / app.scss # Raiz da app e estilos globais
│   ├── features/             # Funcionalidades/jornadas de negócio
│   ├── shared/               # Componentes e serviços reutilizáveis
│   ├── core/                 # Serviços centrais, interceptors, models
│   └── components/           # Componentes de interface agrupados (ex: massa-dados-pj)
├── assets/                   # Imagens e outros recursos estáticos
├── environments/             # Variáveis de ambiente Angular
│   └── environment.ts
└── styles/                   # Design tokens e temas customizados
```

---

## 3. Features e Jornadas

- **features/home/**
    - Pontos de entrada de jornadas, builders para montagem de payloads conforme regra de negócios:
        - `cadastro-clientes-psdc.builder.ts` — Cadastro clientes PJ
        - `contas-correntes-pj/pf.builder.ts` — Abertura de contas
        - `habilitar-conta-ma-pj.builder.ts` — Habilitar conta no MA
        - `incluir-procurador-pj.builder.ts` — Etapa de inclusão de procurador
        - `brob-geracao-contrato.builder.ts` — Geração de contrato BROB

- **components/massa-dados-pj/**
    - Componentização da UI/jornada massa de dados PJ
        - View com telas, forms, cards, estados do processo (component, html, scss)
        - Orquestração de eventos e progresso do usuário

---

## 4. Comunicação com Backend

- **shared/services/**
    - Serviços de integração com BFF (calls REST APIs definidas no backend)
    - Exemplo: `journey-progress.service.ts` — consulta e monitora progresso de jornadas

- **core/api/**
    - Definição de DTOs, endpoints, mocks para desenvolvimento local
    - `gateway-api.service.ts`: wrapper para chamadas HTTP centralizadas, tratamento de erros autorais, retries

---

## 5. Principais Componentes da Navegação

- **shared/components/navbar/**
    - Barra de navegação fixa/topo, links para navegação entre jornadas/funcionalidades

- **app.routes.ts**
    - Roteamento com proteção de caminhos, lazy loading de features

---

## 6. Temas e Estilos

- **styles/theme-dark.scss** e **theme-light.scss**
    - Temas claro/escuro, com tokens de design para consistência visual
- **tokens.scss/design-tokens.css**
    - Paleta de cores, espaçamento, tipografia

---

## 7. Configuração e Ambiente

- **environments/environment.ts**
    - Aponta variáveis de ambiente como URLs do BFF, toggles de feature, etc.
- **proxy.conf.json**
    - Redirecionamento local do frontend para o backend rodando no ambiente de desenvolvimento

---

## 8. Pontos de Observação

- Cada jornada agregada via arquivo builder, para facilitar extensibilidade e isolamento de regras.
- Componentes seguem padrão Angular para reuso, isolamento de estado e apresentação.
- Integração fortemente acoplada ao BFF, desacoplando a responsabilidade do frontend de autenticar/autorização e tratar dados sensíveis.

---

**Esta documentação é apenas informativa e não altera nada no frontend do projeto nem realiza nenhum procedimento ou alteração de código. Todos os fluxos, processos e lógicas foram preservados conforme solicitado.**
