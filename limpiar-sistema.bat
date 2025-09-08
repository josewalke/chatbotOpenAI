@echo off
echo ========================================
echo   CHATBOT CLINICA ESTETICA
echo ========================================
echo.

echo Deteniendo procesos existentes...
taskkill /F /IM node.exe 2>nul
taskkill /F /IM npm.exe 2>nul
timeout /t 2 /nobreak >nul

echo.
echo Sistema listo para usar npm start
echo.
echo Para iniciar el backend:
echo   cd backend
echo   npm start
echo.
echo Para iniciar el frontend:
echo   cd frontend  
echo   npm start
echo.
pause
