@echo off
echo 🔄 Reiniciando sistema completo...

echo 🛑 Deteniendo procesos existentes...
taskkill /f /im node.exe 2>nul

echo ⏳ Esperando 3 segundos...
timeout /t 3 /nobreak >nul

echo 🚀 Iniciando backend...
cd /d "%~dp0backend"
start "Backend" cmd /k "node src/server.js"

echo ⏳ Esperando 5 segundos para que inicie el backend...
timeout /t 5 /nobreak >nul

echo 🌐 Iniciando frontend...
cd /d "%~dp0frontend"
start "Frontend" cmd /k "npm start"

echo ⏳ Esperando 10 segundos para que inicie el frontend...
timeout /t 10 /nobreak >nul

echo.
echo ✅ Sistema reiniciado correctamente
echo 📡 Backend: http://localhost:5000
echo 🌐 Frontend: http://localhost:3000
echo 💰 Ventas: http://localhost:3000/sales
echo.
echo 🎯 Las ventas de prueba ya están creadas:
echo    - Hidratación Facial Profunda (€120)
echo    - Peeling Químico (€150)  
echo    - Cavitación Ultrasónica (€360)
echo.
pause
