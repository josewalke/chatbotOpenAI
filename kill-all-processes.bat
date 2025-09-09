@echo off
echo ========================================
echo   LIMPIEZA AGRESIVA - TODOS LOS PROCESOS
echo ========================================
echo.

echo 🔴 MATANDO TODOS LOS PROCESOS NODE.JS...
taskkill /F /IM node.exe 2>nul
taskkill /F /IM npm.exe 2>nul
taskkill /F /IM nodemon.exe 2>nul
taskkill /F /IM cmd.exe /FI "WINDOWTITLE eq Backend*" 2>nul
taskkill /F /IM cmd.exe /FI "WINDOWTITLE eq Frontend*" 2>nul

echo.
echo 🔍 BUSCANDO PROCESOS OCULTOS EN PUERTOS...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8080') do (
    echo 🚫 Matando proceso en puerto 8080: PID %%a
    taskkill /F /PID %%a 2>nul
)

for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000') do (
    echo 🚫 Matando proceso en puerto 3000: PID %%a
    taskkill /F /PID %%a 2>nul
)

for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5000') do (
    echo 🚫 Matando proceso en puerto 5000: PID %%a
    taskkill /F /PID %%a 2>nul
)

echo.
echo ⏳ Esperando 5 segundos para liberación completa...
timeout /t 5 /nobreak >nul

echo.
echo 🔍 VERIFICACIÓN FINAL...
netstat -ano | findstr ":8080\|:3000\|:5000"

echo.
echo ✅ LIMPIEZA COMPLETADA
echo 💡 Ahora puedes ejecutar manualmente:
echo    - cd backend ^&^& npm run dev
echo    - cd frontend ^&^& npm start
echo.
pause
