# Script de inicio para el Chatbot de Clínica Estética
# Este script evita conflictos de puerto y maneja ambos servicios

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   CHATBOT CLINICA ESTETICA - INICIO" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Función para detener procesos
function Stop-AllProcesses {
    Write-Host "🔴 Deteniendo procesos existentes..." -ForegroundColor Red
    
    # Detener procesos de Node.js
    $nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
    if ($nodeProcesses) {
        $nodeProcesses | Stop-Process -Force
        Write-Host "   ✅ Procesos Node.js detenidos" -ForegroundColor Green
    }
    
    # Detener procesos de npm
    $npmProcesses = Get-Process -Name "npm" -ErrorAction SilentlyContinue
    if ($npmProcesses) {
        $npmProcesses | Stop-Process -Force
        Write-Host "   ✅ Procesos npm detenidos" -ForegroundColor Green
    }
    
    Start-Sleep -Seconds 2
}

# Función para verificar si un puerto está libre
function Test-Port {
    param([int]$Port)
    
    try {
        $connection = New-Object System.Net.Sockets.TcpClient
        $connection.Connect("localhost", $Port)
        $connection.Close()
        return $false  # Puerto en uso
    }
    catch {
        return $true   # Puerto libre
    }
}

# Función para esperar a que un servicio esté listo
function Wait-ForService {
    param([string]$Url, [string]$ServiceName)
    
    $maxAttempts = 30
    $attempt = 0
    
    Write-Host "⏳ Esperando que $ServiceName esté listo..." -ForegroundColor Yellow
    
    do {
        $attempt++
        try {
            $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 2
            if ($response.StatusCode -eq 200) {
                Write-Host "   ✅ $ServiceName está funcionando" -ForegroundColor Green
                return $true
            }
        }
        catch {
            # Servicio aún no está listo
        }
        
        Start-Sleep -Seconds 1
    } while ($attempt -lt $maxAttempts)
    
    Write-Host "   ❌ $ServiceName no respondió después de $maxAttempts intentos" -ForegroundColor Red
    return $false
}

# Función principal
function Start-ChatbotServices {
    # Detener procesos existentes
    Stop-AllProcesses
    
    # Obtener directorio del script
    $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
    
    # Iniciar Backend
    Write-Host "🚀 Iniciando Backend (Puerto 5000)..." -ForegroundColor Blue
    $backendDir = Join-Path $scriptDir "backend"
    Set-Location $backendDir
    
    # Verificar que el puerto esté libre
    if (-not (Test-Port -Port 5000)) {
        Write-Host "⚠️  Puerto 5000 en uso. Liberando..." -ForegroundColor Yellow
        Stop-AllProcesses
        Start-Sleep -Seconds 2
    }
    
    # Iniciar backend en segundo plano
    Start-Process -FilePath "node" -ArgumentList "src/server.js" -WindowStyle Hidden
    Start-Sleep -Seconds 3
    
    # Verificar que el backend esté funcionando
    if (Wait-ForService -Url "http://localhost:5000/api/health" -ServiceName "Backend") {
        Write-Host "✅ Backend iniciado correctamente" -ForegroundColor Green
    } else {
        Write-Host "❌ Error iniciando Backend" -ForegroundColor Red
        return
    }
    
    # Iniciar Frontend
    Write-Host ""
    Write-Host "🌐 Iniciando Frontend (Puerto 3000)..." -ForegroundColor Blue
    $frontendDir = Join-Path $scriptDir "frontend"
    Set-Location $frontendDir
    
    # Verificar que el puerto esté libre
    if (-not (Test-Port -Port 3000)) {
        Write-Host "⚠️  Puerto 3000 en uso. Liberando..." -ForegroundColor Yellow
        Stop-AllProcesses
        Start-Sleep -Seconds 2
    }
    
    # Iniciar frontend en segundo plano
    Start-Process -FilePath "npm" -ArgumentList "start" -WindowStyle Hidden
    Start-Sleep -Seconds 5
    
    # Verificar que el frontend esté funcionando
    if (Wait-ForService -Url "http://localhost:3000" -ServiceName "Frontend") {
        Write-Host "✅ Frontend iniciado correctamente" -ForegroundColor Green
    } else {
        Write-Host "❌ Error iniciando Frontend" -ForegroundColor Red
        return
    }
    
    # Mostrar información final
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "   SISTEMA LISTO PARA USAR" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "📱 Frontend: http://localhost:3000" -ForegroundColor Cyan
    Write-Host "🔧 Backend:  http://localhost:5000" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "💡 Presiona cualquier tecla para abrir el navegador..." -ForegroundColor Yellow
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    
    Write-Host "🌐 Abriendo navegador..." -ForegroundColor Blue
    Start-Process "http://localhost:3000"
    
    Write-Host ""
    Write-Host "💡 Para detener los servicios, presiona Ctrl+C" -ForegroundColor Yellow
    Write-Host ""
    
    # Mantener el script corriendo
    try {
        while ($true) {
            Start-Sleep -Seconds 1
        }
    }
    catch {
        Write-Host ""
        Write-Host "🛑 Deteniendo servicios..." -ForegroundColor Red
        Stop-AllProcesses
        Write-Host "✅ Servicios detenidos" -ForegroundColor Green
    }
}

# Ejecutar función principal
Start-ChatbotServices
