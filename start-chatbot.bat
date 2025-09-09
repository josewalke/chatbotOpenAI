@echo off
echo ========================================
echo   CHATBOT CLINICA ESTETICA - INICIO
echo ========================================
echo.

echo 🔴 Deteniendo procesos Node.js existentes...
taskkill /F /IM node.exe 2>nul
taskkill /F /IM npm.exe 2>nul
taskkill /F /IM nodemon.exe 2>nul
timeout /t 2 /nobreak >nul

echo 🔍 Verificando puertos ocupados...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8080') do (
    echo 🚫 Puerto 8080 ocupado por PID %%a
    taskkill /F /PID %%a 2>nul
)

for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000') do (
    echo 🚫 Puerto 3000 ocupado por PID %%a
    taskkill /F /PID %%a 2>nul
)

timeout /t 2 /nobreak >nul

echo.
echo 🚀 Iniciando Backend (Puerto 8080)...
cd /d "%~dp0backend"
start "Backend - Chatbot" cmd /k "npm run dev"
timeout /t 5 /nobreak >nul

echo ✅ Backend iniciado correctamente
echo.
echo 🌐 Iniciando Frontend (Puerto 3000)...
cd /d "%~dp0frontend"
start "Frontend - Chatbot" cmd /k "npm start"
timeout /t 8 /nobreak >nul

echo ✅ Frontend iniciado correctamente
echo.
echo ========================================
echo   SISTEMA LISTO PARA USAR
echo ========================================
echo.
echo 📱 Frontend: http://localhost:3000
echo 🔧 Backend:  http://localhost:8080/api
echo.
echo 💡 Presiona cualquier tecla para abrir el navegador...
pause >nul

echo 🌐 Abriendo navegador...
start http://localhost:3000

echo.
echo 💡 Para detener los servicios, cierra las ventanas:
echo    - "Backend - Chatbot" 
echo    - "Frontend - Chatbot"
echo    o presiona Ctrl+C en cada ventana
echo.
pause
