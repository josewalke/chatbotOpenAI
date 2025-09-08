@echo off
echo Limpiando procesos Node.js...
taskkill /f /im node.exe 2>nul

echo Esperando 2 segundos...
timeout /t 2 /nobreak >nul

echo Iniciando backend en puerto 5001...
cd /d "%~dp0backend"
start "Backend" cmd /k "node src/server.js"

echo Esperando 5 segundos para que inicie el backend...
timeout /t 5 /nobreak >nul

echo Iniciando frontend...
cd /d "%~dp0frontend"
start "Frontend" cmd /k "npm start"

echo.
echo ✅ Sistema iniciado correctamente
echo 📡 Backend: http://localhost:5001
echo 🌐 Frontend: http://localhost:3000
echo.
pause
