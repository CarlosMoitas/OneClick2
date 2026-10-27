param(
    [string]$ArquivoYaml = ".\jornadas.yaml"
)

# ==================================================
# EXECUTAR JORNADAS CONFIGURADAS EM YAML
# ==================================================

$ErrorActionPreference = "Stop"

# ==================================================
# FUNCOES AUXILIARES
# ==================================================

function Obter-Valor {
    param(
        [object]$Objeto,
        [string]$Nome
    )

    if ($null -eq $Objeto) {
        return $null
    }

    if ($Objeto -is [System.Collections.IDictionary]) {
        return $Objeto[$Nome]
    }

    $propriedade = $Objeto.PSObject.Properties[$Nome]

    if ($null -ne $propriedade) {
        return $propriedade.Value
    }

    return $null
}

function Obter-ValorPorCaminho {
    param(
        [object]$Contexto,
        [string]$Caminho
    )

    $valorAtual = $Contexto

    foreach ($parte in $Caminho.Split(".")) {
        $valorAtual = Obter-Valor -Objeto $valorAtual -Nome $parte

        if ($null -eq $valorAtual) {
            return $null
        }
    }

    return $valorAtual
}

function Resolver-Texto {
    param(
        [string]$Texto,
        [object]$Contexto
    )

    if ([string]::IsNullOrWhiteSpace($Texto)) {
        return $Texto
    }

    $matches = [regex]::Matches($Texto, '\$\{([^}]+)\}')

    if ($matches.Count -eq 0) {
        return $Texto
    }

    # Se o texto for apenas uma variavel, preserva o tipo original.
    if ($matches.Count -eq 1 -and $matches[0].Value -eq $Texto) {
        $caminho = $matches[0].Groups[1].Value
        $valor = Obter-ValorPorCaminho -Contexto $Contexto -Caminho $caminho

        if ($null -eq $valor) {
            throw "Variavel nao encontrada no YAML: $Texto"
        }

        return $valor
    }

    $resultado = $Texto

    for ($indice = $matches.Count - 1; $indice -ge 0; $indice--) {
        $match = $matches[$indice]
        $caminho = $match.Groups[1].Value
        $valor = Obter-ValorPorCaminho -Contexto $Contexto -Caminho $caminho

        if ($null -eq $valor) {
            throw "Variavel nao encontrada no YAML: $($match.Value)"
        }

        $resultado = $resultado.Substring(0, $match.Index) +
            [string]$valor +
            $resultado.Substring($match.Index + $match.Length)
    }

    return $resultado
}

function Resolver-Objeto {
    param(
        [object]$Objeto,
        [object]$Contexto
    )

    if ($null -eq $Objeto) {
        return $null
    }

    if ($Objeto -is [string]) {
        return Resolver-Texto -Texto $Objeto -Contexto $Contexto
    }

    if ($Objeto -is [System.Collections.IDictionary]) {
        $novoObjeto = [ordered]@{}

        foreach ($chave in $Objeto.Keys) {
            $novoObjeto[$chave] = Resolver-Objeto `
                -Objeto $Objeto[$chave] `
                -Contexto $Contexto
        }

        return $novoObjeto
    }

    if (($Objeto -is [System.Collections.IEnumerable]) -and -not ($Objeto -is [string])) {
        $lista = @()

        foreach ($item in $Objeto) {
            $lista += Resolver-Objeto -Objeto $item -Contexto $Contexto
        }

        return $lista
    }

    return $Objeto
}

function Obter-Senha {
    param(
        [string]$NomeVariavelAmbiente,
        [string]$Usuario
    )

    $senha = [Environment]::GetEnvironmentVariable(
        $NomeVariavelAmbiente,
        [EnvironmentVariableTarget]::Process
    )

    if (-not [string]::IsNullOrWhiteSpace($senha)) {
        return $senha
    }

    $senhaSegura = Read-Host "Informe a senha do usuario $Usuario" -AsSecureString

    $ponteiroSenha = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($senhaSegura)

    try {
        return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ponteiroSenha)
    }
    finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ponteiroSenha)
    }
}

function Obter-Token {
    param(
        [string]$LoginUrl,
        [string]$Usuario,
        [string]$Senha
    )

    $loginBody = @{
        username = $Usuario
        password = $Senha
    } | ConvertTo-Json -Compress

    $loginResponse = Invoke-RestMethod `
        -Uri $LoginUrl `
        -Method POST `
        -ContentType "application/json" `
        -Body $loginBody `
        -ErrorAction Stop

    $token = $loginResponse.token

    if ([string]::IsNullOrWhiteSpace($token)) {
        $token = $loginResponse.access_token
    }

    if ([string]::IsNullOrWhiteSpace($token) -and $loginResponse.data) {
        $token = $loginResponse.data.token
    }

    if ([string]::IsNullOrWhiteSpace($token) -and $loginResponse.data) {
        $token = $loginResponse.data.access_token
    }

    if ([string]::IsNullOrWhiteSpace($token)) {
        throw "Token nao retornado pela API de login."
    }

    return ($token -replace "^\s*Bearer\s+", "")
}

function Executar-Etapa {
    param(
        [string]$Url,
        [string]$Metodo,
        [hashtable]$Headers,
        [string]$BodyJson
    )

    try {
        if ([string]::IsNullOrWhiteSpace($BodyJson)) {
            return Invoke-RestMethod `
                -Uri $Url `
                -Method $Metodo `
                -Headers $Headers `
                -ErrorAction Stop
        }

        return Invoke-RestMethod `
            -Uri $Url `
            -Method $Metodo `
            -Headers $Headers `
            -ContentType "application/json" `
            -Body $BodyJson `
            -ErrorAction Stop
    }
    catch {
        $mensagem = $_.Exception.Message

        if ($_.ErrorDetails -and $_.ErrorDetails.Message) {
            $mensagem += "`n$($_.ErrorDetails.Message)"
        }

        throw $mensagem
    }
}

# ==================================================
# VALIDACOES INICIAIS
# ==================================================

if (-not (Get-Module -ListAvailable -Name powershell-yaml)) {
    Write-Host ""
    Write-Host "ERRO: O modulo powershell-yaml nao esta instalado." -ForegroundColor Red
    Write-Host ""
    Write-Host "Instale uma unica vez com:" -ForegroundColor Yellow
    Write-Host "Install-Module powershell-yaml -Scope CurrentUser" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

Import-Module powershell-yaml -ErrorAction Stop

$ArquivoYaml = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($ArquivoYaml)

if (-not (Test-Path $ArquivoYaml)) {
    Write-Host "ERRO: Arquivo YAML nao encontrado: $ArquivoYaml" -ForegroundColor Red
    exit 1
}

$config = Get-Content -Path $ArquivoYaml -Raw | ConvertFrom-Yaml

$loginConfig = Obter-Valor -Objeto $config -Nome "login"
$defaults = Obter-Valor -Objeto $config -Nome "defaults"
$steps = Obter-Valor -Objeto $config -Nome "steps"

$LoginUrl = Obter-Valor -Objeto $loginConfig -Nome "url"
$Usuario = Obter-Valor -Objeto $loginConfig -Nome "username"
$PasswordEnv = Obter-Valor -Objeto $loginConfig -Nome "passwordEnv"

if ([string]::IsNullOrWhiteSpace($PasswordEnv)) {
    $PasswordEnv = "BIAT_PASSWORD"
}

if ([string]::IsNullOrWhiteSpace($LoginUrl)) {
    throw "O campo login.url nao foi definido no YAML."
}

if ([string]::IsNullOrWhiteSpace($Usuario)) {
    throw "O campo login.username nao foi definido no YAML."
}

if ($null -eq $steps -or $steps.Count -eq 0) {
    throw "Nenhuma etapa foi definida em steps no YAML."
}

# ==================================================
# CABECALHO
# ==================================================

Clear-Host

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "            ORQUESTRADOR DE JORNADAS" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Configuracao : $ArquivoYaml"
Write-Host "Usuario      : $Usuario"
Write-Host ""

# ==================================================
# LOGIN
# ==================================================

Write-Host "[LOGIN] Obtendo token de acesso..." -ForegroundColor Yellow

try {
    $Senha = Obter-Senha `
        -NomeVariavelAmbiente $PasswordEnv `
        -Usuario $Usuario

    if ([string]::IsNullOrWhiteSpace($Senha)) {
        throw "Senha nao informada."
    }

    $Token = Obter-Token `
        -LoginUrl $LoginUrl `
        -Usuario $Usuario `
        -Senha $Senha

    Remove-Variable Senha -ErrorAction SilentlyContinue

    Write-Host "[OK] Token obtido com sucesso." -ForegroundColor Green
}
catch {
    Write-Host "[ERRO] Falha ao obter token." -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}

$Headers = @{
    Authorization = "Bearer $Token"
    Accept        = "application/json"
}

# Contexto usado para substituir variaveis do YAML.
$Contexto = [ordered]@{
    defaults = $defaults
    login    = $loginConfig
    results  = [ordered]@{}
}

$PastaResultados = Join-Path $PSScriptRoot "resultados"

if (-not (Test-Path $PastaResultados)) {
    New-Item -Path $PastaResultados -ItemType Directory -Force | Out-Null
}

$resumo = @()
$houveErro = $false

# ==================================================
# EXECUCAO DAS ETAPAS
# ==================================================

$totalEtapas = @($steps).Count
$numeroEtapa = 0

foreach ($step in $steps) {
    $numeroEtapa++

    $nome = Obter-Valor -Objeto $step -Nome "name"
    $enabled = Obter-Valor -Objeto $step -Nome "enabled"
    $metodo = Obter-Valor -Objeto $step -Nome "method"
    $urlConfigurada = Obter-Valor -Objeto $step -Nome "url"
    $bodyConfigurado = Obter-Valor -Objeto $step -Nome "body"
    $saveResponseAs = Obter-Valor -Objeto $step -Nome "saveResponseAs"
    $onError = Obter-Valor -Objeto $step -Nome "onError"

    if ([string]::IsNullOrWhiteSpace($nome)) {
        $nome = "Etapa $numeroEtapa"
    }

    if ([string]::IsNullOrWhiteSpace($metodo)) {
        $metodo = "POST"
    }

    if ([string]::IsNullOrWhiteSpace($onError)) {
        $onError = "stop"
    }

    if ($null -eq $enabled) {
        $enabled = $true
    }

    if (-not [bool]$enabled) {
        Write-Host ""
        Write-Host "[$numeroEtapa/$totalEtapas] [IGNORADA] $nome" -ForegroundColor DarkYellow

        $resumo += [PSCustomObject]@{
            Etapa  = $nome
            Status = "Ignorada"
            Tempo  = "-"
        }

        continue
    }

    try {
        $url = Resolver-Texto -Texto $urlConfigurada -Contexto $Contexto
        $bodyResolvido = Resolver-Objeto -Objeto $bodyConfigurado -Contexto $Contexto

        $bodyJson = $null

        if ($null -ne $bodyResolvido) {
            $bodyJson = $bodyResolvido | ConvertTo-Json -Depth 30 -Compress
        }

        Write-Host ""
        Write-Host "==================================================" -ForegroundColor Cyan
        Write-Host "[$numeroEtapa/$totalEtapas] $nome" -ForegroundColor Cyan
        Write-Host "==================================================" -ForegroundColor Cyan
        Write-Host "Metodo : $metodo"
        Write-Host "URL    : $url"
        Write-Host ""

        $inicio = Get-Date

        $job = Start-Job -ScriptBlock {
            param(
                [string]$Url,
                [string]$Metodo,
                [hashtable]$Headers,
                [string]$BodyJson
            )

            try {
                if ([string]::IsNullOrWhiteSpace($BodyJson)) {
                    Invoke-RestMethod `
                        -Uri $Url `
                        -Method $Metodo `
                        -Headers $Headers `
                        -ErrorAction Stop
                }
                else {
                    Invoke-RestMethod `
                        -Uri $Url `
                        -Method $Metodo `
                        -Headers $Headers `
                        -ContentType "application/json" `
                        -Body $BodyJson `
                        -ErrorAction Stop
                }
            }
            catch {
                $mensagem = $_.Exception.Message

                if ($_.ErrorDetails -and $_.ErrorDetails.Message) {
                    $mensagem += "`n$($_.ErrorDetails.Message)"
                }

                throw $mensagem
            }

        } -ArgumentList $url, $metodo, $Headers, $bodyJson

        $spinner = @("|", "/", "-", "\")
        $indice = 0

        while ($job.State -in @("NotStarted", "Running", "Blocked")) {
            $segundos = [int](((Get-Date) - $inicio).TotalSeconds)
            $icone = $spinner[$indice % $spinner.Count]

            Write-Host -NoNewline "`r[$icone] Executando $nome... $segundos segundos   "

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

        $tempoTotal = [math]::Round(((Get-Date) - $inicio).TotalSeconds, 2)

        if ($job.State -ne "Completed") {
            $motivo = $job.ChildJobs[0].JobStateInfo.Reason

            $detalheErro = ""

            if ($motivo) {
                $detalheErro += $motivo.Exception.Message
            }

            foreach ($erro in $errosJob) {
                $detalheErro += "`n$($erro.Exception.Message)"

                if ($erro.ErrorDetails -and $erro.ErrorDetails.Message) {
                    $detalheErro += "`n$($erro.ErrorDetails.Message)"
                }
            }

            Remove-Job -Job $job -Force

            throw $detalheErro
        }

        Remove-Job -Job $job -Force

        if ($null -eq $resposta) {
            throw "O endpoint respondeu sem corpo."
        }

        Write-Host "[OK] $nome concluida em $tempoTotal segundos." -ForegroundColor Green

        if ($resposta.steps) {
            Write-Host ""
            Write-Host "ETAPAS INTERNAS" -ForegroundColor Yellow
            Write-Host "--------------------------------------------------"

            foreach ($subEtapa in $resposta.steps) {
                if ($subEtapa.childStatus -eq "Completed") {
                    Write-Host "[OK] $($subEtapa.step)" -ForegroundColor Green
                }
                else {
                    Write-Host "[ERRO] $($subEtapa.step)" -ForegroundColor Red
                }

                Write-Host "      Job ID......: $($subEtapa.effectiveJobId)"
                Write-Host "      ParentStatus: $($subEtapa.parentStatus)"
                Write-Host "      ChildStatus.: $($subEtapa.childStatus)"
            }
        }

        if ([string]::IsNullOrWhiteSpace($saveResponseAs)) {
            $saveResponseAs = "etapa$numeroEtapa"
        }

        # Disponibiliza o retorno para as proximas etapas.
        $Contexto.results[$saveResponseAs] = $resposta
        $Contexto[$saveResponseAs] = $resposta

        $nomeArquivoSeguro = ($saveResponseAs -replace '[\\/:*?"<>| ]', "-")
        $arquivoResultado = Join-Path $PastaResultados "$nomeArquivoSeguro.json"

        $resposta |
            ConvertTo-Json -Depth 50 |
            Out-File -FilePath $arquivoResultado -Encoding UTF8

        Write-Host ""
        Write-Host "Resposta salva em: $arquivoResultado" -ForegroundColor DarkGreen

        $resumo += [PSCustomObject]@{
            Etapa  = $nome
            Status = "Concluida"
            Tempo  = "$tempoTotal s"
        }
    }
    catch {
        $houveErro = $true

        Write-Host ""
        Write-Host "[ERRO] $nome" -ForegroundColor Red
        Write-Host $_.Exception.Message -ForegroundColor Red

        $resumo += [PSCustomObject]@{
            Etapa  = $nome
            Status = "Erro"
            Tempo  = "-"
        }

        if ($onError -ne "continue") {
            Write-Host ""
            Write-Host "Execucao interrompida. onError configurado como: $onError" -ForegroundColor Yellow
            break
        }

        Write-Host ""
        Write-Host "Continuando para a proxima etapa..." -ForegroundColor Yellow
    }
}

# ==================================================
# RESUMO FINAL
# ==================================================

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "                 RESUMO FINAL" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

$resumo | Format-Table -AutoSize

Write-Host ""
Write-Host "Resultados salvos em: $PastaResultados" -ForegroundColor Yellow
Write-Host ""

if ($houveErro) {
    exit 1
}

exit 0
