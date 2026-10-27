# ==========================================
# EXECUTAR MASSA DADOS PJ
# ==========================================

$ErrorActionPreference = "Stop"

$Url = "http://localhost:3000/api/jornadas/massa-dados-pj"

# Cole aqui o mesmo token que funciona no curl
$Token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJtNjI3NTI5IiwidXNlcm5hbWUiOiJtNjI3NTI5Iiwicm9sZXMiOlsidXNlciJdLCJpYXQiOjE3OTE4ODk4MjQsImV4cCI6MTc5MTkxODYyNH0.KB-UnBwg4v69dLzxUBzCXZN9r-zFwaX50y31qwy9PTI"

$Headers = @{
    "Authorization" = "Bearer $Token"
    "Content-Type"  = "application/json"
    "Accept"        = "application/json"
}

# Corpo igual ao comando curl informado
$Body = @{
    environment = "TU"
    agency      = "3995"
    username    = "m627529"
} | ConvertTo-Json -Compress

Clear-Host

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "                  MASSA DADOS PJ" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "URL      : $Url"
Write-Host "Ambiente : TU"
Write-Host "Agencia  : 3995"
Write-Host "Usuario  : m627529"
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
    # Importante: Get-Date precisa estar entre parenteses.
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

Write-Host ""
Write-Host "==================================================" -ForegroundColor Green
Write-Host "                 RESUMO FINAL" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green

Write-Host ""
Write-Host "Conta Gerada : $($resposta.contaGerada.conta)" -ForegroundColor Cyan
Write-Host "Agencia      : $($resposta.contaGerada.agencia)" -ForegroundColor Cyan
Write-Host "CPF Cliente  : $($resposta.cpfCliente)" -ForegroundColor Cyan
Write-Host "Tempo Total  : $tempoTotal segundos" -ForegroundColor Cyan
Write-Host ""

exit 0
