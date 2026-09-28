# Gráfico da Jornada — Massa de Dados PJ (ID: cta-005)

## Fluxo completo (Mermaid)

```mermaid
flowchart TD
    A[Portal TDM<br/>Conexão estabelecida] --> B[1/5 Cadastro de Clientes PSDC]
    B --> C[2/5 Contas Correntes PJ]
    C --> D[3/5 Contas Correntes PF]
    D --> E[4/5 Habilitar Conta no MA]
    E --> F[5/5 Incluir Procurador PJ]
    F --> G[6/6 BROB - Geração de Contrato]

    D --> H[Extrair CPF do Data Pool<br/>CCGC_CPF + CCTRL_CPF_CGC]
    H --> I[leftPad CCGC_CPF para 9]
    H --> J[leftPad CCTRL_CPF_CGC para 2]
    I --> K[cpfCliente = cpfBase + cpfDv]
    J --> K
    K --> G

    D --> L[Extrair Agência/Conta do artefato]
    L --> E
```

---

## Regras de composição do CPF (step 3/5)

- **CCGC_CPF** → `leftPad(9, '0')`
- **CCTRL_CPF_CGC** → `leftPad(2, '0')`
- **CPF final** → concatenação dos dois valores tratados

Exemplo:
- `47221438` + `11`  
- `047221438` + `11`  
- `cpfCliente = 04722143811`

---

## Versão simplificada (apresentação rápida)

```mermaid
flowchart LR
    S1[Cadastro PSDC] --> S2[Contas PJ] --> S3[Contas PF]
    S3 --> CPF[Gerar CPF<br/>leftPad(9)+leftPad(2)]
    CPF --> S4[Habilitar MA] --> S5[Incluir Procurador] --> S6[BROB Contrato]
