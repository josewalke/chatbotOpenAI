@echo off
echo ========================================
echo   REINICIO RAPIDO DEL SISTEMA
echo ========================================
echo.

echo 🔄 Reiniciando sistema completo...
echo.

echo 🔴 Paso 1: Deteniendo procesos existentes...
taskkill /F /IM node.exe 2>nul
taskkill /F /IM npm.exe 2>nul
taskkill /F /IM nodemon.exe 2>nul

echo 🔍 Paso 2: Liberando puertos...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8080') do (
    taskkill /F /PID %%a 2>nul
)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000') do (
    taskkill /F /PID %%a 2>nul
)

timeout /t 3 /nobreak >nul

echo 🚀 Paso 3: Iniciando sistema...
call start-chatbot.bat