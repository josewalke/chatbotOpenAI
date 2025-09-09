@echo off
echo ========================================
echo   LIMPIEZA COMPLETA DEL SISTEMA
echo ========================================
echo.

echo 🔴 Deteniendo todos los procesos Node.js...
taskkill /F /IM node.exe 2>nul
taskkill /F /IM npm.exe 2>nul
taskkill /F /IM nodemon.exe 2>nul

echo 🔍 Liberando puertos ocupados...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8080') do (
    echo 🚫 Liberando puerto 8080 (PID %%a)
    taskkill /F /PID %%a 2>nul
)

for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000') do (
    echo 🚫 Liberando puerto 3000 (PID %%a)
    taskkill /F /PID %%a 2>nul
)

for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5000') do (
    echo 🚫 Liberando puerto 5000 (PID %%a)
    taskkill /F /PID %%a 2>nul
)

echo.
echo 🧹 Limpiando archivos temporales...
if exist "backend\logs\*.log" del /q "backend\logs\*.log" 2>nul
if exist "frontend\build" rmdir /s /q "frontend\build" 2>nul

echo.
echo ✅ Sistema limpiado completamente
echo 💡 Ahora puedes ejecutar start-chatbot.bat sin problemas
echo.
pause
