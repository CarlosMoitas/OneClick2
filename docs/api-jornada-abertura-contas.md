# API — Jornada Abertura de Contas (cta-003)

## Objetivo

Executar a jornada completa de abertura de contas via API do OneClick, encadeando automaticamente:

1. **Contas Correntes - PF**
2. **Habilitar Conta MA**
3. **Débito Automático**

A API reaproveita a lógica existente do projeto para:

- submeter os jobs ao TDM
- aguardar conclusão
- baixar e processar o artefato `.zip`
- extrair a conta gerada na etapa 1
- reutilizar a conta nas etapas 2 e 3

---

## Endpoint

```http
POST /api/tdm/jornadas/abertura-contas
```

> Observação: o prefixo final pode variar conforme a montagem das rotas principais do servidor. No módulo TDM, a rota adicionada foi:
>
> ```http
> POST /jornadas/abertura-contas
> ```

---

## Autenticação

A rota exige autenticação igual às demais rotas protegidas do backend:

- JWT válido do portal OneClick
- o backend tenta usar o token TDM do usuário autenticado
- se não houver token TDM do usuário, o fluxo segue com fallback sistêmico já existente

---

## Request body

```json
{
  "environment": "TU",
  "agency": "3995",
  "username": "m123456"
}
```

### Campos

- `environment`:
  - opcional
  - valores aceitos: `TU` ou `TI`
  - padrão: `TU`

- `agency`:
  - opcional
  - agência usada no step 1
  - padrão atual: `3995`

- `username`:
  - opcional
  - usuário a ser enviado ao TDM como executor do job
  - se omitido, o backend usa fallback configurado

---

## Comportamento da jornada

### Etapa 1 — Contas Correntes PF
A API monta o payload técnico da rotina de criação de conta PF e executa o job no TDM.

### Etapa 2 — Extração do `.zip`
Após a conclusão da etapa 1, o backend:

- baixa o artefato
- lê o `.zip` em memória
- extrai `agencia` e `conta`

Se a conta não puder ser extraída, a jornada é interrompida.

### Etapa 3 — Habilitar Conta MA
Com a conta extraída, a API monta automaticamente o payload de habilitação MA e executa o segundo job.

### Etapa 4 — Débito Automático
Com a mesma conta extraída, a API monta o payload de débito automático e executa o terceiro job.

---

## Exemplo de resposta com sucesso

```json
{
  "success": true,
  "environment": "TU",
  "agencyRequested": "3995",
  "contaGerada": {
    "agencia": "3995",
    "conta": "123456"
  },
  "steps": [
    {
      "step": "contas-correntes-pf",
      "requestedJobId": 123,
      "childJobId": 124,
      "effectiveJobId": 124,
      "parentStatus": "Completed",
      "childStatus": "Completed",
      "sizeBytes": 18542,
      "extractedContaInfo": {
        "found": true,
        "agencia": "3995",
        "conta": "123456"
      }
    },
    {
      "step": "habilitar-conta-ma",
      "requestedJobId": 125,
      "childJobId": 126,
      "effectiveJobId": 126,
      "parentStatus": "Completed",
      "childStatus": "Completed",
      "sizeBytes": 9321
    },
    {
      "step": "debito-automatico",
      "requestedJobId": 127,
      "childJobId": 128,
      "effectiveJobId": 128,
      "parentStatus": "Completed",
      "childStatus": "Completed",
      "sizeBytes": 8011
    }
  ]
}
```

---

## Exemplo de erro funcional

Quando a conta não puder ser extraída do artefato da etapa 1, a API retorna erro e interrompe a jornada.

Exemplo de código interno usado:
- `JORNADA_CONTA_NAO_EXTRAIDA`

---

## Exemplo de consumo via curl

```bash
curl -X POST http://localhost:3000/api/tdm/jornadas/abertura-contas ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer SEU_TOKEN_JWT" ^
  -d "{\"environment\":\"TU\",\"agency\":\"3995\",\"username\":\"m123456\"}"
```

---

## Arquivos alterados

Implementação adicionada de forma modular, sem remover o fluxo existente:

- `server/src/tdm/abertura-contas-journey.service.ts`
- `server/src/tdm/tdm.routes.ts`
- `server/src/tdm/tdm.types.ts`

---

## Próximas evoluções recomendadas

1. Validar o contrato de entrada com schema/DTO
2. Adicionar testes automatizados do orquestrador
3. Externalizar constantes de builders compartilhados
4. Opcionalmente expor logs consolidados por etapa
5. Opcionalmente retornar correlação e tempos de execução por step
