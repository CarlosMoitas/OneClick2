# ==========================================
# AGENDAR DEBITO AUTOMATICO / ABERTURA DE CONTAS
# ==========================================

$ErrorActionPreference = "Stop"

# ==================================================
# CONFIGURACAO
# ==================================================

$LoginUrl = "http://localhost:4200/gw/auth/login"
$Url = "http://localhost:3000/api/jornadas/abertura-contas"

$Usuario = "m627529"
$Agency = "3995"
$Environment = "TU"

# Defina a senha antes de executar, se quiser evitar o prompt:
# $env:BIAT_PASSWORD = "SUA_SENHA"
$Senha = $env:BIAT_PASSWORD

# Caso a variavel de ambiente nao exista, solicita a senha no terminal.
if ([string]::IsNullOrWhiteSpace($Senha)) {
    $SenhaSegura = Read-Host "Informe a senha do usuario $Usuario" -AsSecureString
    $PonteiroSenha = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($SenhaSegura)

    try {
        $Senha = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($PonteiroSenha)
    }
    finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($PonteiroSenha)
    }
}

if ([string]::IsNullOrWhiteSpace($Senha)) {
    Write-Host ""
    Write-Host "ERRO: Senha nao informada." -ForegroundColor Red
    exit 1
}

# ==================================================
# CABECALHO
# ==================================================

Clear-Host

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "          AGENDAR DEBITO AUTOMATICO" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Jornada  : $Url"
Write-Host "Ambiente : $Environment"
Write-Host "Agencia  : $Agency"
Write-Host "Usuario  : $Usuario"
Write-Host ""

# ==================================================
# ETAPA 1 - LOGIN E TOKEN
# ==================================================

Write-Host "[1/2] Obtendo token de acesso..." -ForegroundColor Yellow

try {
    $LoginBody = @{
        username = $Usuario
        password = $Senha
    } | ConvertTo-Json -Compress

    $LoginResponse = Invoke-RestMethod `
        -Uri $LoginUrl `
        -Method POST `
        -ContentType "application/json" `
        -Body $LoginBody `
        -ErrorAction Stop

    # Formato principal esperado: { "token": "..." }
    $Token = $LoginResponse.token

    # Formatos alternativos aceitos.
    if ([string]::IsNullOrWhiteSpace($Token)) {
        $Token = $LoginResponse.access_token
    }

    if ([string]::IsNullOrWhiteSpace($Token) -and $LoginResponse.data) {
        $Token = $LoginResponse.data.token
    }

    if ([string]::IsNullOrWhiteSpace($Token) -and $LoginResponse.data) {
        $Token = $LoginResponse.data.access_token
    }

    if ([string]::IsNullOrWhiteSpace($Token)) {
        throw "Token nao retornado pela API de login."
    }

    # Remove "Bearer " se a API de login devolver o token com o prefixo.
    $Token = $Token -replace "^\s*Bearer\s+", ""

    Write-Host "[OK] Token obtido com sucesso." -ForegroundColor Green

    if ($LoginResponse.expiresAt) {
        Write-Host "     Expira em: $($LoginResponse.expiresAt)" -ForegroundColor DarkYellow
    }
    elseif ($LoginResponse.expires_in) {
        Write-Host "     Expira em: $($LoginResponse.expires_in) segundos" -ForegroundColor DarkYellow
    }

    # Remove a senha da variavel apos o login.
    Remove-Variable Senha -ErrorAction SilentlyContinue
}
catch {
    Write-Host "[ERRO] Falha ao obter token." -ForegroundColor Red
    Write-Host ""

    Write-Host "==================================================" -ForegroundColor Red
    Write-Host "              ERRO AO OBTER TOKEN" -ForegroundColor Red
    Write-Host "==================================================" -ForegroundColor Red
    Write-Host ""

    Write-Host $_.Exception.Message -ForegroundColor Red

    if ($_.ErrorDetails -and -not [string]::IsNullOrWhiteSpace($_.ErrorDetails.Message)) {
        Write-Host ""
        Write-Host $_.ErrorDetails.Message -ForegroundColor DarkRed
    }

    exit 1
}

# ==================================================
# ETAPA 2 - CHAMADA DA JORNADA
# ==================================================

$Headers = @{
    Authorization = "Bearer $Token"
    Accept = "application/json"
}

$Body = @{
    environment = $Environment
    agency      = $Agency
    username    = $Usuario
} | ConvertTo-Json -Compress

Write-Host ""
Write-Host "[2/2] Iniciando jornada..." -ForegroundColor Yellow
Write-Host ""

$inicio = Get-Date

$job = Start-Job -ScriptBlock {
    param(
        [string]$Url,
        [hashtable]$Headers,
        [string]$Body
    )

    try {
        Invoke-RestMethod `
            -Uri $Url `
            -Method POST `
            -Headers $Headers `
            -ContentType "application/json" `
            -Body $Body `
            -ErrorAction Stop
    }
    catch {
        $mensagem = $_.Exception.Message

        if ($_.ErrorDetails -and $_.ErrorDetails.Message) {
            $mensagem += "`n$($_.ErrorDetails.Message)"
        }

        throw $mensagem
    }

} -ArgumentList $Url, $Headers, $Body

$spinner = @("|", "/", "-", "\")
$indice = 0

while ($job.State -in @("NotStarted", "Running", "Blocked")) {
    $segundos = [int](((Get-Date) - $inicio).TotalSeconds)
    $icone = $spinner[$indice % $spinner.Count]

    Write-Host -NoNewline "`r[$icone] Executando jornada... $segundos segundos   "

    $indice++
    Start-Sleep -Milliseconds 200
}

Write-Host ""
Write-Host ""

$errosJob = @()

$resposta = Receive-Job `
    -Job $job `
    -ErrorAction SilentlyContinue `
    -ErrorVariable +errosJob

if ($job.State -ne "Completed") {
    Write-Host "==================================================" -ForegroundColor Red
    Write-Host "               ERRO NA EXECUCAO" -ForegroundColor Red
    Write-Host "==================================================" -ForegroundColor Red
    Write-Host ""

    $motivo = $job.ChildJobs[0].JobStateInfo.Reason

    if ($motivo) {
        Write-Host "Motivo:" -ForegroundColor Yellow
        Write-Host $motivo.Exception.Message -ForegroundColor Red
        Write-Host ""
    }

    if ($errosJob.Count -gt 0) {
        Write-Host "Detalhes:" -ForegroundColor Yellow

        foreach ($erro in $errosJob) {
            Write-Host $erro.Exception.Message -ForegroundColor Red

            if ($erro.ErrorDetails -and $erro.ErrorDetails.Message) {
                Write-Host $erro.ErrorDetails.Message -ForegroundColor DarkRed
            }
        }
    }

    Remove-Job -Job $job -Force
    exit 1
}

Remove-Job -Job $job -Force

if ($null -eq $resposta) {
    Write-Host "ERRO: O endpoint respondeu sem corpo." -ForegroundColor Red
    exit 1
}

$tempoTotal = [math]::Round(((Get-Date) - $inicio).TotalSeconds, 2)

# ==================================================
# RESULTADO
# ==================================================

Write-Host "==================================================" -ForegroundColor Green
Write-Host "              EXECUCAO CONCLUIDA" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green

Write-Host ""
Write-Host "Ambiente : $($resposta.environment)" -ForegroundColor Yellow
Write-Host "Agencia  : $($resposta.agencyRequested)" -ForegroundColor Yellow
Write-Host "Conta    : $($resposta.contaGerada.conta)" -ForegroundColor Yellow
Write-Host "CPF      : $($resposta.cpfCliente)" -ForegroundColor Yellow
Write-Host "Tempo    : $tempoTotal segundos" -ForegroundColor Yellow

Write-Host ""
Write-Host "ETAPAS EXECUTADAS"
Write-Host "--------------------------------------------------"

if ($resposta.steps) {
    foreach ($step in $resposta.steps) {
        Write-Host ""

        if ($step.childStatus -eq "Completed") {
            Write-Host "[OK] $($step.step)" -ForegroundColor Green
        }
        else {
            Write-Host "[ERRO] $($step.step)" -ForegroundColor Red
        }

        Write-Host "Job ID.......: $($step.effectiveJobId)"
        Write-Host "ParentStatus.: $($step.parentStatus)"
        Write-Host "ChildStatus..: $($step.childStatus)"
        Write-Host "Size Bytes...: $($step.sizeBytes)"

        if ($step.extractedContaInfo) {
            Write-Host ""
            Write-Host "Conta Encontrada" -ForegroundColor Cyan
            Write-Host "Agencia......: $($step.extractedContaInfo.agencia)"
            Write-Host "Conta........: $($step.extractedContaInfo.conta)"
            Write-Host "CPF..........: $($step.extractedContaInfo.cpfCliente)"
        }
    }
}

$ArquivoResultado = Join-Path $PSScriptRoot "resultado-abertura-contas.json"

$resposta |
    ConvertTo-Json -Depth 30 |
    Out-File -FilePath $ArquivoResultado -Encoding UTF8

Write-Host ""
Write-Host "==================================================" -ForegroundColor Green
Write-Host "                 RESUMO FINAL" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green

Write-Host ""
Write-Host "Conta Gerada : $($resposta.contaGerada.conta)" -ForegroundColor Cyan
Write-Host "Agencia      : $($resposta.contaGerada.agencia)" -ForegroundColor Cyan
# Write-Host "CPF Cliente  : $($resposta.cpfCliente)" -ForegroundColor Cyan
Write-Host "Tempo Total  : $tempoTotal segundos" -ForegroundColor Cyan
Write-Host ""
Write-Host "JSON salvo em: $ArquivoResultado" -ForegroundColor Green
Write-Host ""

exit 0
