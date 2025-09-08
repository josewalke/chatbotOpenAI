# Script de inicio simple para el Chatbot de Clínica Estética
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   CHATBOT CLINICA ESTETICA - INICIO" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Detener procesos existentes
Write-Host "Deteniendo procesos existentes..." -ForegroundColor Red
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force
Get-Process -Name "npm" -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2

# Obtener directorio del script
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Iniciar Backend
Write-Host "Iniciando Backend (Puerto 5000)..." -ForegroundColor Blue
$backendDir = Join-Path $scriptDir "backend"
Set-Location $backendDir
Start-Process -FilePath "node" -ArgumentList "src/server.js" -WindowStyle Hidden
Start-Sleep -Seconds 3

# Verificar Backend
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5000/api/health" -UseBasicParsing -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
        Write-Host "Backend iniciado correctamente" -ForegroundColor Green
    }
} catch {
    Write-Host "Error iniciando Backend" -ForegroundColor Red
    exit 1
}

# Iniciar Frontend
Write-Host ""
Write-Host "Iniciando Frontend (Puerto 3000)..." -ForegroundColor Blue
$frontendDir = Join-Path $scriptDir "frontend"
Set-Location $frontendDir
Start-Process -FilePath "npm" -ArgumentList "start" -WindowStyle Hidden
Start-Sleep -Seconds 5

# Verificar Frontend
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 10
    if ($response.StatusCode -eq 200) {
        Write-Host "Frontend iniciado correctamente" -ForegroundColor Green
    }
} catch {
    Write-Host "Error iniciando Frontend" -ForegroundColor Red
    exit 1
}

# Mostrar información final
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "   SISTEMA LISTO PARA USAR" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "Backend:  http://localhost:5000" -ForegroundColor Cyan
Write-Host ""
Write-Host "Presiona cualquier tecla para abrir el navegador..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

Write-Host "Abriendo navegador..." -ForegroundColor Blue
Start-Process "http://localhost:3000"

Write-Host ""
Write-Host "Para detener los servicios, presiona Ctrl+C" -ForegroundColor Yellow
Write-Host ""

# Mantener el script corriendo
try {
    while ($true) {
        Start-Sleep -Seconds 1
    }
} catch {
    Write-Host ""
    Write-Host "Deteniendo servicios..." -ForegroundColor Red
    Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force
    Get-Process -Name "npm" -ErrorAction SilentlyContinue | Stop-Process -Force
    Write-Host "Servicios detenidos" -ForegroundColor Green
}
