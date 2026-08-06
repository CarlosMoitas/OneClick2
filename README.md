# fed-node-npm-template - Artefato Kit de FED - Frontend em Angular 21

![Angular](https://img.shields.io/badge/Angular-21-green?style=plastic&logo=angular)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-green?style=plastic&logo=typescript)
![Vitest](https://img.shields.io/badge/Vitest-4-green?style=plastic&logo=vitest)

## Introdução

Esse kit possui as configurações e conceitos básicos para iniciar um projeto Angular dentro dos padrões do Leap, juntamente com recomendações corporativas para build, testes, configuração por ambiente e integração com ferramentas de qualidade.

Mais detalhes da arquitetura usada, dicas e recomendações podem ser encontrados em [Módulo 13. FED - Frontend](https://confluence.bradesco.com.br:8443/pages/viewpage.action?pageId=240148867)

## Stack validada no template

- Angular 21.2.x
- TypeScript 5.9.x
- Vitest 4.x via builder de testes do Angular
- core-js 3.49.x para compatibilidade com iOS 15.5+
- zoneless
- Lib de apoio para setup: `@bradesco/thgv-lib-fed-devtools@21.x.x`
  - Compatibilidade com Design System Liquid referenciado no Devtools
  - Compatibilidade com biblioteca de Rastreabildiade referenciada no (Necessario implementação manual ou pelo Devtools)

## O que este template entrega

- Build de produção padronizado com `ng build --configuration production --base-href .`
- Testes unitários com cobertura usando builder do Angular e configuração Vitest
- Threshold mínimo de cobertura configurado em 90% para branches, functions, lines e statements
- Relatório de cobertura gerado em `coverage/` nos formatos HTML, lcov e resumo textual
- Configuração de `app-config.js` por ambiente usando templates em `config/`
- Configuração de proxy local em `proxy.conf.json`
- Exemplo de mock local em `mocks/backend.js` para chamadas BFF em desenvolvimento
- Exemplo de contrato OpenAPI em `mocks/openapi.yaml` para uso com Prism em projetos API-first
- Exemplo de integração com Liquid (Necessario implementação manual ou pelo Devtools)
- Exemplo de monitoramento com Google Tag Manager (Necessario implementação manual ou pelo Devtools)
- Exemplo de tratamento de erro global
- Configuração de `LOCALE_ID` e `DEFAULT_CURRENCY_CODE`
- Exemplo de primeira visita com `localStorage`
- Interceptor HTTP com header `x-csrf-token`, `withCredentials` e timeout padrão
- Exemplo de lazy loading com `loadChildren` e `loadComponent`
- Polyfills para iOS 15.5+
- Scripts auxiliares de `prestart` e `postbuild` para ajustar `index.html` em desenvolvimento e produção

## O que não faz parte deste template

- Exemplo funcional de uso do autorizador cloud em Angular 21, porque a biblioteca ainda não possui versão compatível
- Configuração de MFE
- Configuração formal de ESLint neste repositório
- Jest, pois o template está padronizado com Vitest

## Scripts

- `npm run start` - inicia o servidor de desenvolvimento Angular (`ng serve`)
- `npm run mock` - inicia apenas o backend mock (`node mocks/backend.js`)
- `npm run start:mock` - inicia backend mock e frontend em paralelo
- `npm run build` - gera o build de produção com `--base-href .`
- `npm run watch` - gera build contínuo em modo development
- `npm run test` - executa os testes unitários com cobertura
- `npm run test:watch` - executa os testes unitários em modo watch
- `npm run devtools` - executa a schematic atráves do atributo `--schema` da lib `@bradesco/thgv-lib-fed-devtools` instalada no projeto
- `npm run devtools:initialize` - executa o schematic `initialize` da lib `@bradesco/thgv-lib-fed-devtools` instalada no projeto

> **IMPORTANTE**: O projeto referencia recursos do Liquid hospedados em `static.bradesco.com.br`. No fluxo local, o script `prestart` converte essas URLs para o proxy `/dsysliquid/`, definido em `proxy.conf.json`.

Como sugestão para teste local, se houver bloqueio de CORS ou recursos externos no navegador, use um navegador configurado para o seu ambiente de desenvolvimento conforme as diretrizes internas do time.

## Rodando o projeto localmente

Para executar o projeto em ambiente local é necessario instalar suas dependecias, subir um servidor local do angular para hospedar os bundles do projeto e/ou e um servdor local de mock para o backend .

### Instalação de dependecias

Na raiz do projeto, execute o comando abaixo para instalar as depoendecias no projeto:

```bash
npm install --legacy-peer-deps
```

Obs: Para garantir a instalação das dependencias e suas peer-depdendecies em versões compativeis com o projeto, voce pode incluir o arquivo `.npmrc` nas raiz dos projeto com as linhas `legacy-peer-deps=true`, `strict-ssl=false` e `registry=https://artefatos.bradesco.com.br/artifactory/hbldv-maven-central dessa forma não é necessário passar flags adicionais no` npm install`.

### Iniciar o servidor do projeto

```bash
npm run start
```

O script `start` já executa o `prestart`, que:

- Gera `mocks/_index.html` a partir de `src/index.html`
- Reescreve URLs do Liquid para uso local com proxy `/dsysliquid/`
- Ajusta temporariamente o `angular.json` para usar `mocks/_index.html` no modo development

### Iniciar o servidor mock de backend

O projeto possui suporte nativo para mock local via scripts npm:

- `npm run mock` inicia apenas o backend de mock (`node mocks/backend.js`)

O mock atual foi simplificado para servir como exemplo base de integração com a SPA e cobre:

- rota GET de exemplo no padrão `/bff-canais/:produto/:versao/:canal/*`
- resposta JSON simples para validação de chamada no frontend
- CORS preparado para `withCredentials=true`
- validação de credenciais esperadas em rotas `/bff-canais`
  - header `x-csrf-token`
  - cookie no formato `PREFIX-SESSIONID`
- atraso artificial de resposta no `backend.js`, util para validar loading e timeout

No estado atual do template, o exemplo de tela `Chamar BFF` usa `public/config/app-config.js` apontando diretamente para:

```text
http://localhost:3000/bff-canais/template/v1/mock-v1
```

e faz a chamada GET para:

```text
/check-request
```

resultando na URL final:

```text
http://localhost:3000/bff-canais/template/v1/mock-v1/check-request
```

Para o mock autorizar a chamada, o interceptor da aplicação já envia o header `x-csrf-token`. O cookie de sessão precisa existir no navegador. Para testes locais, você pode criar manualmente no console do browser um cookie de exemplo como:

```js
document.cookie = 'MOCK-SESSIONID=mock-session-id';
document.cookie = 'MOCK-CSRF-TOKEN=mock-csrf-token';
```

> **OBSERVACAO:** o mock atual aceita qualquer cookie no formato `PREFIX-SESSIONID`. O nome `MOCK-SESSIONID` existe apenas como exemplo didático para o template.

### Iniciar o servidor do projeto com mock de backend

Para subir frontend e backend mock juntos:

```bash
npm run start:mock
```

O script `start:mock` já executa o `start e o mock`, que executa os script de forma sequencia garantindo o server angular e de mock do backend

### Mock com Prism em projetos API-first

Para projetos que trabalham com contrato antes da implementação do backend, o template tambem possui um exemplo simples de OpenAPI em `mocks/openapi.yaml`.

Esse arquivo descreve a mesma rota de exemplo usada no `backend.js` e pode ser executado com Prism para mock por contrato.

Exemplo de execucao:

```bash
npm i -g prism
prism mock mocks/openapi.yaml -p 3000
```

Quando usar cada opção:

- `mocks/backend.js`: melhor para mock rápido, simulação de credenciais, delays e ajustes livres de comportamento
- `mocks/openapi.yaml` com Prism: melhor para times que seguem API-first e querem compartilhar mock a partir de contrato OpenAPI

## DevTools

### O que é

A lib `@bradesco/thgv-lib-fed-devtools` é uma coleção de schematics Angular usada para automatizar configurações recorrentes no setup de projetos FED. Neste template, ela serve como apoio para instalar dependências e aplicar configurações iniciais de forma padronizada.

Ela está declarada como dependência de desenvolvimento no `package.json` e pode ser executada tanto pela versão instalada via npm quanto por uma cópia local da biblioteca no mesmo workspace.

### Quando usar

Use a lib quando precisar acelerar a configuração inicial do projeto ou reaplicar alguma estrutura padrão suportada pelo schematic `initialize`, por exemplo:

- instalação guiada de dependências recorrentes do ecossistema FED
- aplicação automatizada de configurações suportadas pelo schematic
- validação local da evolução da própria lib antes de publicar nova versão

### Como usar neste projeto

Para executar a versão instalada no projeto:

```bash
npm run devtools --schema=<nome-do-schematic>
```

Para executar a versão local da biblioteca, usando a pasta vizinha `../thgv-lib-fed-devtools`:

```bash
npm run devtools:local
```

### Diferença entre os scripts

- `npm run devtools` usa a versão publicada e instalada em `node_modules`
- `ng generate ../thgv-lib-fed-devtools/dist:<nome-do-schematic>` usa o build local da biblioteca, útil para desenvolvimento e validação antes de publicar

### Recomendações de uso

- execute em branch própria, porque o schematic pode alterar `package.json` e arquivos de configuração
- revise as alterações geradas antes de commitar
- prefira `ng generate ../thgv-lib-fed-devtools/dist:<nome-do-schematic>` apenas quando estiver trabalhando também na evolução da lib `thgv-lib-fed-devtools`

## Configurações importantes

### APP-CONFIG

Para diferenciar URLs e integrações por ambiente, o template usa um arquivo JavaScript carregado pelo `index.html`:

```html
<script defer src="assets/config/app-config.js?[[VERSION]]" type="application/javascript"></script>
```

No desenvolvimento local, o arquivo-base fica em `public/config/app-config.js` e é servido como `assets/config/app-config.js`.

No build de produção, o diretório `public/config` não é copiado para o `dist`, porque `angular.json` ignora `config/**` na configuração de assets. Para esteiras e deploy, use os templates em `config/`.

Arquivos relevantes:

- `config/all/config/app-config.js.j2` - template compartilhado
- `config/DEV/config.yaml` - valores de DEV
- `config/HOM/config.yaml` - valores de HOM
- `config/PRD/config.yaml` - valores de PRD

No exemplo local atual do template, `public/config/app-config.js` aponta diretamente para o mock local em `http://localhost:3000/bff-canais/template/v1/mock-v1`.

> **ATENÇÃO 1:** mantenha o mínimo de informação possível nesse arquivo. Se o projeto depender de muitas configurações, prefira carregar os dados por backend.
>
> **ATENÇÃO 2:** o arquivo local em `public/config/app-config.js` serve apenas ao fluxo de desenvolvimento.

### LOCALE_ID e DEFAULT_CURRENCY_CODE

As configurações de localidade atuais do template são:

1. `src/index.html` define `lang="pt-BR"`
2. `src/app/app.config.ts` registra locale pt e define `LOCALE_ID = 'pt'`
3. `src/app/app.config.ts` define `DEFAULT_CURRENCY_CODE = 'BRL'`

### Testes unitários e cobertura

O comando oficial de testes é:

```bash
npm run test
```

Ele usa o builder `@angular/build:unit-test` com `vitest.config.ts` como `runnerConfig`.

Padrões atualmente configurados:

- cobertura mínima de 90% para branches, functions, lines e statements
- exclusão de arquivos HTML, `src/app/app.routes.ts` e JSON da cobertura
- relatório HTML em `coverage/lcov-report/index.html`

O relatório versionado atualmente no repositório mostra 100% de cobertura, mas o contrato mínimo garantido pelo projeto é o threshold configurado em `vitest.config.ts`.

Além dos testes de componente e serviço, existe validação automatizada de configurações do projeto, como:

- script de build contendo `--configuration production`
- script de build contendo `--base-href .`
- configuração de `outputPath.browser` no `angular.json`

### Browserslist e polyfills

Durante o build pode aparecer o aviso abaixo:

```text
One or more browsers which are configured in the project's Browserslist configuration
fall outside Angular's browser support for this version.
```

Esse aviso é esperado porque o template declara suporte a iOS 15.5+ e complementa lacunas com `core-js` em `src/polyfills.ts`.

O projeto mantém:

- `src/polyfills.ts` com polyfills para APIs modernas não disponíveis em iOS 15.5
- `.browserslistrc` com suporte explícito a iOS 15.5+, Safari 15+ e navegadores atuais do projeto
- `tsconfig.json` com modo estrito, declaration map e source map

### Debug e qualidade

O template contém exemplos de `console.log` em fluxos de desenvolvimento e monitoramento. Eles devem ser tratados como código de apoio local e revisados antes de promoção para ambientes estáveis.
Obs.: As functions de console são removidas em build de produção no arquivo `main.ts`:

```code
// Desabilita os logs do console em build de Production
    if (!isDevMode()) {
      console.log = function () { }
      console.warn = function () { }
      console.trace = function () { }
      console.info = function () { }
      console.assert = function () { }
      console.debug = function () { }
      console.error = function () { }
    }
```

Como requisitos não funcionais já refletidos no projeto, este template mantém:

- build de produção obrigatório via script `build`
- testes unitários com cobertura obrigatória via script `test`
- recomendação de auditoria de dependências com `npm audit --omit=dev`
- compatibilidade com pipelines de qualidade e segurança já presentes no repositório, incluindo SonarQube, Fortify e Mend
- TypeScript em modo estrito

## Organização dos diretórios

O código-fonte da aplicação fica em `src/`, mas o template também depende de diretórios de configuração e automação fora dele.

Estrutura principal:

```bash
├ /
├── src/
│   ├── app/
│   │   ├── components/   # componentes e páginas do template
│   │   ├── core/         # guards, interceptors, error handling e services
│   │   └── shared/       # modelos e UI reutilizável
│   ├── index.html
│   ├── main.ts
│   ├── polyfills.ts
│   └── styles.scss
├── config/
│   ├── all/              # templates compartilhados de config
│   ├── DEV/              # valores de ambiente DEV
│   ├── HOM/              # valores de ambiente HOM
│   └── PRD/              # valores de ambiente PRD
├── mocks/
│   ├── _index.html       # index reescrito para desenvolvimento local
│   ├── backend.js        # exemplo de backend mock
│   ├── openapi.yaml      # contrato OpenAPI simples para execucao com Prism
│   ├── scripts/          # scripts de prestart e postbuild
│   └── serve/            # mocks de recursos nativos e analytics
├── public/
│   └── config/           # app-config local usado apenas em desenvolvimento
├── angular.json
├── package.json
├── proxy.conf.json
├── tsconfig.app.json
├── tsconfig.json
├── tsconfig.spec.json
└── vitest.config.ts
```

> **IMPORTANTE**: Evite criar diretórios arbitrários na raiz do projeto sem necessidade, pois isso pode impactar ferramentas de qualidade, segurança e automação usadas nas esteiras.

## Rotas e lazy loading

O template já traz exemplos práticos de lazy loading:

- `src/app/app.routes.ts` usa `loadChildren` para módulos de rotas e `loadComponent` para páginas standalone
- `src/app/components/exemplos/exemplos.routes.ts` faz lazy load dos componentes de exemplo

Além disso, o roteamento principal está configurado com `withHashLocation()`.

## Auditoria de dependências

Uma verificação recomendada para dependências de produção é:

```bash
npm audit --omit=dev
```

Esse comando ajuda a antecipar vulnerabilidades em dependências publicadas no npm antes da execução nas esteiras.

## Build e promoção entre ambientes

Na esteira, o comando esperado é:

```bash
npm run build
```

Esse script executa:

```bash
ng build --configuration production --base-href .
```

Após o build, o `postbuild`:

- substitui `[[VERSION]]` no `dist/index.html` pela versão do `package.json`
- remove comentários HTML, comentários de bloco e comentários de linha do `index.html`

Para promover o build entre ambientes:

1. Mantenha o template em `config/all/config/app-config.js.j2`
2. Defina os valores por ambiente em `config/DEV/config.yaml`, `config/HOM/config.yaml` e `config/PRD/config.yaml`
3. Referencie o arquivo no `src/index.html` e centralize o consumo desses dados em um service, como `src/app/core/services/config/app-config.service.ts`

## Referências

[Módulo 13. FED - Frontend](https://confluence.bradesco.com.br:8443/pages/viewpage.action?pageId=240148867)
