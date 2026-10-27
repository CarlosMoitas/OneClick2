# API – Jornada Massa de Dados PJ (CTA-005)

## Objetivo
Expor, de forma padronizada, um endpoint REST para orquestração automatizada das 6 etapas do card *Massa de Dados PJ* (CTA-005), centralizando toda a lógica e extração no BFF.

---

## Endpoint

```
POST /api/jornadas/massa-dados-pj
```

---

## Autenticação

- Exige JWT válido, emitido pelo Portal principal.
- Middleware: `authMiddleware` no router.
- Usuário autenticado (session) propagado em segurança para logs e execução.

---

## Request Body

```json
{
  "environment": "TI",             // Opcional. Default TU
  "agency": "3995",                // Opcional. Agência alvo
  "username": "mXXXXXX"            // Opcional. SSO; default sistêmico configurado
}
```

---

## Fluxo das 6 etapas (orquestrador BFF)

Todas as etapas são executadas **sequencial e atomicamente**, via `tdmService.submitAndDownload`, com extração e propagação de variáveis na própria jornada (service dedicado).

| Ordem | Etapa (Builder)                  | Observações                                        | Extração                    |
|-------|----------------------------------|----------------------------------------------------|-----------------------------|
| 1     | Cadastro de Clientes PSDC        | cadastro-clientes-psdc.builder.ts                  | –                           |
| 2     | Contas Correntes PJ              | contas-correntes-pj.builder.ts                     | –                           |
| 3     | Contas Correntes PF              | contas-correntes-pf.builder.ts                     | ⚑ agência, conta, cpfCliente|
| 4     | Habilitar Conta no MA            | habilitar-conta-ma-pj.builder.ts                   | ← dados extraídos da 3      |
| 5     | Incluir Procurador PJ            | incluir-procurador-pj.builder.ts                   | ← dados extraídos da 3/4    |
| 6     | BROB – Geração de Contrato       | brob-geracao-contrato.builder.ts                   | ← cpfCliente da 3           |

---

## Regras de extração (etapa PF)

Após o término da etapa 3, o BFF baixa o artefato ZIP e extrai:

- **Agência**: campo extraído do log
- **Conta Corrente**: campo extraído do log
- **CPF do Cliente (`cpfCliente`)**:
  - Regra: 
    ```
    cpfCliente = leftPad(CCGC_CPF, 9, '0') + leftPad(CCTRL_CPF_CGC, 2, '0')
    ```
  - Extrações feitas a partir do arquivo:
    ```
    Job_<RequestID>_Data_Pool_Abertura de Conta Corrente PF_TI2.log
    ```
  - Exemplo: 
    ```
    CCGC_CPF = 47221438  => 047221438
    CCTRL_CPF_CGC = 11   => 11
    cpfCliente = 04722143811
    ```

- **Fail Fast**: Se agência, conta ou CPF não forem extraídos, a jornada é abortada com erro funcional padronizado.

---

## Exemplo de resposta

```json
{
  "success": true,
  "environment": "TI",
  "agencyRequested": "3995",
  "contaGerada": {
    "agencia": "448",
    "conta": "501234"
  },
  "cpfCliente": "04722143811",
  "steps": [
    {
      "step": "cadastro-clientes-psdc",
      "requestedJobId": 2890123,
      "childJobId": null,
      "effectiveJobId": 2890123,
      "parentStatus": "SUCESSO",
      "childStatus": null,
      "sizeBytes": 20971
    },
    {
      "step": "contas-correntes-pj",
      "requestedJobId": 2890161,
      "childJobId": null,
      "effectiveJobId": 2890161,
      "parentStatus": "SUCESSO",
      "childStatus": null,
      "sizeBytes": 22892
    },
    {
      "step": "contas-correntes-pf",
      "requestedJobId": 2890202,
      "childJobId": null,
      "effectiveJobId": 2890202,
      "parentStatus": "SUCESSO",
      "childStatus": null,
      "sizeBytes": 23351,
      "extractedContaInfo": {
        "found": true,
        "agencia": "448",
        "conta": "501234",
        "cpfCliente": "04722143811",
        "reason": null
      }
    },
    {
      "step": "habilitar-conta-ma",
      "requestedJobId": 2890233,
      "childJobId": null,
      "effectiveJobId": 2890233,
      "parentStatus": "SUCESSO",
      "childStatus": null,
      "sizeBytes": 21761
    },
    {
      "step": "incluir-procurador-pj",
      "requestedJobId": 2890295,
      "childJobId": null,
      "effectiveJobId": 2890295,
      "parentStatus": "SUCESSO",
      "childStatus": null,
      "sizeBytes": 20301
    },
    {
      "step": "brob-geracao-contrato",
      "requestedJobId": 2890392,
      "childJobId": null,
      "effectiveJobId": 2890392,
      "parentStatus": "SUCESSO",
      "childStatus": null,
      "sizeBytes": 21195
    }
  ]
}
```

---

## Curl de consumo

```bash
curl -X POST http://localhost:3000/api/jornadas/massa-dados-pj \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"environment":"TU","agency":"3995","username":"m627529"}'
```

---

## Observações finais

- Todos os parâmetros transmitidos e extraídos são propagados sequencialmente, sem acesso externo a estágios intermediários.
- Logs detalhados de cada step são registrados para rastreabilidade.
- Consistência e tratamento de erros seguem o mesmo padrão de `/api/jornadas/abertura-contas`.
- O código e infraestrutura do card 003 permanecem 100% intactos.
