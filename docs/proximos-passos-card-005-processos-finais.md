# Próximos passos para finalizar os 2 últimos processos do card 005

## Objetivo
Documentar o que ainda precisa ser feito para concluir os 2 últimos processos da jornada do card 005, **sem alterar o programa atual**, **sem mexer nas lógicas existentes** e **sem impactar a execução já implementada**.

Este documento serve apenas como guia de desenvolvimento futuro.

---

## Escopo preservado

Este planejamento considera que devem permanecer **intactos**:

- a lógica atual do card 003
- a lógica atual do card 005 já implementada
- os fluxos existentes no frontend
- os serviços atuais do BFF
- a forma atual de autenticação, execução e extração
- os builders já existentes
- o endpoint já exposto da jornada

Ou seja, o objetivo aqui é **somente documentar** o que seria necessário para concluir os 2 últimos processos pendentes.

---

## Contexto atual

A jornada de Massa de Dados PJ (CTA-005) já possui estrutura de execução dedicada e documentação da API. Parte relevante do fluxo já foi organizada para permitir:

- execução sequencial por etapas
- reaproveitamento do padrão do card 003
- extração de dados intermediários
- propagação de parâmetros entre etapas
- isolamento da nova jornada sem interferir na jornada anterior

Os 2 últimos processos pendentes devem seguir esse mesmo padrão arquitetural, sem quebra de compatibilidade.

---

## Premissas para concluir os 2 últimos processos

Antes de desenvolver os processos finais, é necessário considerar as seguintes premissas:

1. **Não alterar a base já validada**
   - O que já está funcionando deve permanecer igual.
   - Ajustes devem ser incrementais e isolados.

2. **Seguir o padrão da jornada existente**
   - Reaproveitar convenções já usadas em builders, services, extração de artefato e retorno da API.

3. **Evitar acoplamento com o card 003**
   - Toda continuidade deve permanecer isolada no contexto do CTA-005.

4. **Validar dependências entre etapas**
   - Confirmar exatamente quais dados de saída das etapas anteriores serão exigidos nos 2 últimos processos.

5. **Documentar contratos antes de codificar**
   - Antes de implementar, validar payloads, parâmetros obrigatórios, arquivos de retorno e regras de negócio.

---

## Próximos passos sugeridos

## 1. Mapear exatamente quais são os 2 últimos processos pendentes
Antes de qualquer implementação, confirmar formalmente:

- nome funcional de cada processo
- nome técnico do workflow/job no TDM
- ordem correta dentro da jornada
- objetivo de cada processo
- dependência em relação às etapas anteriores
- insumos obrigatórios
- saída esperada

### Entregável esperado
Um quadro simples contendo:

- processo
- finalidade
- entrada
- saída
- dependência
- risco

---

## 2. Levantar os parâmetros obrigatórios de cada processo
Para cada um dos 2 últimos processos, levantar:

- campos obrigatórios
- campos opcionais
- valores default
- origem de cada valor
- quais dados vêm do request inicial
- quais dados vêm de etapas anteriores
- quais dados precisam ser extraídos de artefatos/logs

### Validar principalmente
- agência
- conta
- CPF/CNPJ
- matrícula/usuário
- environment
- identificadores internos do job
- dados de contrato ou procurador, se aplicável

### Entregável esperado
Documento de parâmetros por processo, no padrão já usado nos outros materiais do card 005.

---

## 3. Confirmar o desenho do payload de cada workflow
Antes de codificar, revisar como cada builder futuro deverá montar o payload.

Itens a validar:

- estrutura JSON esperada pelo TDM
- nomes exatos dos campos
- formato de datas, números e documentos
- uso de máscaras ou valores crus
- campos fixos
- campos derivados
- campos que dependem de extração anterior

### Entregável esperado
Rascunho do payload de cada processo com exemplo realista.

---

## 4. Definir a estratégia de encadeamento na jornada
Os 2 últimos processos precisam ser adicionados ao fluxo sem alterar o comportamento atual.

Deve ser decidido:

- se ambos entram no final da cadeia atual
- se algum deles depende de sucesso explícito da etapa anterior
- se haverá bloqueio por ausência de dado extraído
- se alguma etapa poderá ser opcional no futuro
- como ficará o retorno consolidado da jornada

### Decisão importante
Definir se o comportamento será:

- **fail fast** ao faltar dado obrigatório
ou
- **continuidade controlada** com marcação de erro por etapa

### Entregável esperado
Fluxo sequencial atualizado da jornada, apenas em nível documental.

---

## 5. Mapear necessidade de novas extrações
Se algum dos 2 últimos processos depender de dados ainda não extraídos hoje, será preciso planejar:

- qual arquivo/log será lido
- em qual etapa a extração deve ocorrer
- qual regex/regra será usada
- como o dado será validado
- o que acontece se o dado não for encontrado

### Atenções
- não pressupor que todo dado virá no mesmo artefato atual
- validar nome real do arquivo no ZIP
- validar variações por ambiente
- validar diferenças entre execução manual e automática

### Entregável esperado
Tabela de extrações planejadas por processo.

---

## 6. Planejar builders dedicados, se necessário
Se os 2 últimos processos ainda não possuírem builders definitivos ou estiverem incompletos, o desenvolvimento futuro deverá prever:

- criação ou finalização do builder
- uso do mesmo padrão de nomenclatura atual
- separação clara de responsabilidade
- montagem do payload sem lógica de execução embutida
- possibilidade de teste unitário isolado

### Diretriz
O builder deve apenas preparar dados; a orquestração deve continuar centralizada no service da jornada.

### Entregável esperado
Lista dos builders que precisam ser criados, ajustados ou validados.

---

## 7. Planejar a integração dos processos no service da jornada
Sem alterar agora o código, o futuro desenvolvimento deverá prever:

- inclusão dos 2 processos na sequência correta
- propagação dos parâmetros já extraídos
- armazenamento do resultado de cada etapa no retorno consolidado
- padronização de mensagens de erro
- padronização de logs por etapa

### Cuidados
- não duplicar lógica existente
- não mover lógica do card 003
- não alterar o contrato atual da jornada sem necessidade
- não quebrar o endpoint já documentado

### Entregável esperado
Descrição de como os novos passos entram no fluxo do service.

---

## 8. Definir critérios de validação funcional
Antes de implementar, deixar claro como saber se cada um dos 2 últimos processos foi concluído com sucesso.

Critérios mínimos:

- job submetido corretamente
- status final de sucesso no TDM
- artefato baixado quando aplicável
- dados extraídos conforme esperado
- retorno final da API contendo rastreabilidade da etapa
- logs com correlação da execução

### Entregável esperado
Checklist funcional por processo.

---

## 9. Planejar testes antes da implementação
Mesmo sem mexer no programa agora, os testes futuros já devem estar desenhados.

### Testes recomendados

#### Testes unitários
- builder monta payload corretamente
- campos obrigatórios são propagados
- defaults são aplicados corretamente
- regras de extração retornam valor esperado
- erro é lançado quando faltar dado obrigatório

#### Testes integrados
- service executa as etapas na ordem correta
- saída de uma etapa alimenta a próxima
- retorno final contém os novos steps
- falha em etapa crítica interrompe fluxo quando aplicável

#### Testes manuais
- chamada real do endpoint com token válido
- validação do retorno consolidado
- inspeção dos artefatos e logs
- confirmação do comportamento em TU/TI, se necessário

### Entregável esperado
Plano de testes dos 2 últimos processos.

---

## 10. Atualizar documentação após implementação futura
Quando os 2 últimos processos forem efetivamente desenvolvidos, será necessário atualizar a documentação existente.

Arquivos prováveis para atualização:

- `docs/api-jornada-massa-dados-pj.md`
- documentos auxiliares de parâmetros do card 005
- materiais de fluxo e evidência técnica
- documentação de extração, se surgir novo artefato

### Atualizações esperadas
- fluxo completo com todas as etapas finais
- request/response final revisado
- regras de extração adicionais
- exemplos de sucesso e falha
- curl final revisado, se necessário

---

## Riscos a observar

1. **Dependência de dados não extraídos atualmente**
   - Pode exigir nova leitura de artefato ou log.

2. **Diferença de payload entre ambiente TU/TI**
   - Pode impactar builders e testes.

3. **Campos obrigatórios não documentados no workflow**
   - Pode causar falha tardia no TDM.

4. **Inconsistência entre nome técnico e funcional dos processos**
   - Pode gerar implementação incorreta da ordem da jornada.

5. **Acoplamento indevido com lógica existente**
   - Deve ser evitado para não afetar card 003 e partes estáveis do card 005.

---

## Ordem recomendada de execução futura

1. Confirmar quais são exatamente os 2 últimos processos
2. Levantar os parâmetros de entrada e saída
3. Confirmar payload esperado no TDM
4. Mapear dependências com etapas anteriores
5. Planejar extrações adicionais, se existirem
6. Definir builders necessários
7. Planejar entrada dos processos no service da jornada
8. Definir critérios de sucesso
9. Planejar testes unitários, integrados e manuais
10. Atualizar documentação final após desenvolvimento

---

## Conclusão

Para finalizar os 2 últimos processos do card 005, o caminho recomendado é evoluir por documentação técnica e validação de contrato antes de qualquer alteração de código.

Assim, será possível:

- preservar as lógicas atuais
- evitar impacto no card 003
- manter o que já funciona no card 005
- desenvolver os processos finais com menor risco
- registrar claramente o que precisa ser feito antes da implementação

Este documento não altera comportamento do sistema e serve apenas como guia de desenvolvimento futuro.
