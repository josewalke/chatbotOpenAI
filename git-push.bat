@echo off
echo ========================================
echo   GIT PUSH - SUBIR CAMBIOS
echo ========================================
echo.

echo 📦 Agregando archivos al staging...
git add .

echo.
echo 💾 Creando commit...
git commit -m "Mejoras en scripts de inicio y control de procesos"

echo.
echo 🚀 Subiendo cambios al repositorio...
git push

echo.
echo ✅ Git push completado
echo.
pause
