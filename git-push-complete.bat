@echo off
echo ========================================
echo   GIT PUSH COMPLETO - PASO A PASO
echo ========================================
echo.

echo 📦 Paso 1: Agregando todos los archivos...
git add .

echo.
echo 💾 Paso 2: Creando commit...
git commit -m "Mejoras en scripts de inicio y control de procesos - $(date)"

echo.
echo 🚀 Paso 3: Subiendo a GitHub...
git push origin master

echo.
echo ✅ Proceso completado
echo.
pause
