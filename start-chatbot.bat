@echo off
echo ========================================
echo   CHATBOT CLINICA ESTETICA - INICIO
echo ========================================
echo.

echo 🔴 Deteniendo procesos existentes...
taskkill /F /IM node.exe 2>nul
taskkill /F /IM npm.exe 2>nul
timeout /t 2 /nobreak >nul

echo.
echo 🚀 Iniciando Backend (Puerto 5000)...
cd /d "%~dp0backend"
start /B node src/server.js
timeout /t 3 /nobreak >nul

echo ✅ Backend iniciado correctamente
echo.
echo 🌐 Iniciando Frontend (Puerto 3000)...
cd /d "%~dp0frontend"
start /B npm start
timeout /t 5 /nobreak >nul

echo ✅ Frontend iniciado correctamente
echo.
echo ========================================
echo   SISTEMA LISTO PARA USAR
echo ========================================
echo.
echo 📱 Frontend: http://localhost:3000
echo 🔧 Backend:  http://localhost:5000
echo.
echo 💡 Presiona cualquier tecla para abrir el navegador...
pause >nul

echo 🌐 Abriendo navegador...
start http://localhost:3000

echo.
echo 💡 Para detener los servicios, cierra esta ventana
echo    o presiona Ctrl+C
echo.
pause
