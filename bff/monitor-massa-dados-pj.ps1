# ==========================================
# EXECUTAR MASSA DADOS PJ
# ==========================================

$Url = "http://localhost:3000/api/jornadas/massa-dados-pj"

$Token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJtNjI3NTI5IiwidXNlcm5hbWUiOiJtNjI3NTI5Iiwicm9sZXMiOlsidXNlciJdLCJpYXQiOjE3OTE4ODk4MjQsImV4cCI6MTc5MTkxODYyNH0.KB-UnBwg4v69dLzxUBzCXZN9r-zFwaX50y31qwy9PTI"

$Headers = @{
    "Authorization" = "Bearer $Token"
    "Content-Type"  = "application/json"
}

$Body = @{
    environment = "TU"
    agency      = "448"
    username    = "m627529"
} | ConvertTo-Json

Clear-Host

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "          MASSA DADOS PJ" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

$inicio = Get-Date

$job = Start-Job -ScriptBlock {

    param($Url,$Headers,$Body)

    try {
        Invoke-RestMethod `
            -Uri $Url `
            -Method POST `
            -Headers $Headers `
            -Body $Body
    }
    catch {
        throw $_
    }

} -ArgumentList $Url,$Headers,$Body

$spinner = @("|","/","-","\")
$idx = 0

while ($job.State -eq "Running")
{
    $segundos = [int]((Get-Date) - $.TotalSeconds

    Write-Host -NoNewline "`r$($spinner[$idx]) Executando jornada... $segundos segundos "

    Start-Sleep -Milliseconds 300

    $idx++

    if ($idx -ge $spinner.Count)
    {
        $idx = 0
    }
}

Write-Host ""
Write-Host ""

if ($job.State -eq "Failed")
{
    Write-Host "ERRO NA EXECUCAO" -ForegroundColor Red
    Receive-Job $job
    Remove-Job $job -Force
    exit
}

$resposta = Receive-Job $job
Remove-Job $job -Force

$tempoTotal = [math]::Round(((Get-Date) - $.TotalSeconds,2)

Write-Host "==================================================" -ForegroundColor Green
Write-Host "          EXECUCAO CONCLUIDA" -ForegroundColor Green
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

foreach ($step in $resposta.steps)
{
    Write-Host ""

    if ($step.childStatus -eq "Completed")
    {
        Write-Host "[OK] $($step.step)" -ForegroundColor Green
    }
    else
    {
        Write-Host "[ERRO] $($step.step)" -ForegroundColor Red
    }

    Write-Host "Job ID.......: $($step.effectiveJobId)"
    Write-Host "ParentStatus.: $($step.parentStatus)"
    Write-Host "ChildStatus..: $($step.childStatus)"
    Write-Host "Size Bytes...: $($step.sizeBytes)"

    if ($step.extractedContaInfo)
    {
        Write-Host ""
        Write-Host "Conta Encontrada" -ForegroundColor Cyan
        Write-Host "Agencia......: $($step.extractedContaInfo.agencia)"
        Write-Host "Conta........: $($step.extractedContaInfo.conta)"
        Write-Host "CPF..........: $($step.extractedContaInfo.cpfCliente)"
    }
}

Write-Host ""
Write-Host "==================================================" -ForegroundColor Green
Write-Host "                RESUMO FINAL" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green

Write-Host ""
Write-Host "Conta Gerada : $($resposta.contaGerada.conta)" -ForegroundColor Cyan
Write-Host "Agencia      : $($resposta.contaGerada.agencia)" -ForegroundColor Cyan
Write-Host "CPF Cliente  : $($resposta.cpfCliente)" -ForegroundColor Cyan
Write-Host "Tempo Total  : $tempoTotal segundos" -ForegroundColor Cyan
Write-Host ""