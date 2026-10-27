Clear-Host

# ==================================================
# CONFIGURACAO
# ==================================================

$ErrorActionPreference = "Stop"

$LoginUrl = "http://localhost:4200/gw/auth/login"
$JornadaUrl = "http://localhost:3000/api/jornadas/abertura-contas"

$Usuario = "m627529"

$Agency = "3995"
$Environment = "TU"

# Senha opcional por variavel de ambiente:
# $env:BIAT_PASSWORD = "SUA_SENHA"
$Senha = $env:BIAT_PASSWORD

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
# LOGIN E OBTENCAO AUTOMATICA DO TOKEN
# ==================================================

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "                       LOGIN" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

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

    # Aceita formatos comuns de resposta de autenticacao.
    $Token = $LoginResponse.token

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

    # Caso a API retorne o valor ja iniciado por 'Bearer ', remove o prefixo.
    $Token = $Token -replace "^\s*Bearer\s+", ""

    Write-Host "[OK] Token obtido com sucesso." -ForegroundColor Green

    if ($LoginResponse.expiresAt) {
        Write-Host "Expira em: $($LoginResponse.expiresAt)" -ForegroundColor Yellow
    }
    elseif ($LoginResponse.expires_in) {
        Write-Host "Expira em: $($LoginResponse.expires_in) segundos" -ForegroundColor Yellow
    }
}
catch {
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
# CHAMADA DA JORNADA
# ==================================================

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "               ABERTURA DE CONTAS" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "URL      : $JornadaUrl"
Write-Host "Ambiente : $Environment"
Write-Host "Agencia  : $Agency"
Write-Host "Usuario  : $Usuario"
Write-Host ""

$Headers = @{
    Authorization = "Bearer $Token"
    Accept        = "application/json"
}

$Body = @{
    environment = $Environment
    agency      = $Agency
    username    = $Usuario
} | ConvertTo-Json -Compress

$inicio = Get-Date

try {
    Write-Host "Executando jornada..." -ForegroundColor Yellow
    Write-Host ""

    $Resultado = Invoke-RestMethod `
        -Uri $JornadaUrl `
        -Method POST `
        -Headers $Headers `
        -ContentType "application/json" `
        -Body $Body `
        -ErrorAction Stop

    $tempoTotal = [Math]::Round(((Get-Date) - $inicio).TotalSeconds, 2)

    $ResultadoJson = $Resultado | ConvertTo-Json -Depth 30

    $ArquivoResultado = Join-Path $PSScriptRoot "resultado-abertura-contas.json"

    $ResultadoJson | Out-File `
        -FilePath $ArquivoResultado `
        -Encoding UTF8

    Write-Host "==================================================" -ForegroundColor Green
    Write-Host "              EXECUCAO CONCLUIDA" -ForegroundColor Green
    Write-Host "==================================================" -ForegroundColor Green

    Write-Host ""
    Write-Host "Tempo Total : $tempoTotal segundos" -ForegroundColor Yellow

    if ($Resultado.environment) {
        Write-Host "Ambiente    : $($Resultado.environment)" -ForegroundColor Yellow
    }

    if ($Resultado.agencyRequested) {
        Write-Host "Agencia     : $($Resultado.agencyRequested)" -ForegroundColor Yellow
    }

    if ($Resultado.contaGerada) {
        Write-Host "Conta       : $($Resultado.contaGerada.conta)" -ForegroundColor Yellow
    }

    if ($Resultado.cpfCliente) {
        Write-Host "CPF         : $($Resultado.cpfCliente)" -ForegroundColor Yellow
    }

    Write-Host ""
    Write-Host "Resposta da API:" -ForegroundColor Cyan
    Write-Host $ResultadoJson

    Write-Host ""
    Write-Host "Arquivo salvo:" -ForegroundColor Green
    Write-Host $ArquivoResultado -ForegroundColor Green

    exit 0
}
catch {
    Write-Host ""
    Write-Host "==================================================" -ForegroundColor Red
    Write-Host "               ERRO NA EXECUCAO" -ForegroundColor Red
    Write-Host "==================================================" -ForegroundColor Red
    Write-Host ""

    Write-Host $_.Exception.Message -ForegroundColor Red

    if ($_.ErrorDetails -and -not [string]::IsNullOrWhiteSpace($_.ErrorDetails.Message)) {
        Write-Host ""
        Write-Host "Resposta da API:" -ForegroundColor Yellow
        Write-Host $_.ErrorDetails.Message -ForegroundColor DarkRed
    }

    exit 1
}
