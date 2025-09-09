@echo off
echo ========================================
echo   GIT PUSH CON .GITIGNORE CORREGIDO
echo ========================================
echo.

echo 📦 Agregando archivos (incluyendo scripts .bat)...
git add .

echo.
echo 💾 Creando commit...
git commit -m "Scripts de control mejorados y .gitignore corregido"

echo.
echo 🚀 Subiendo a GitHub...
git push origin master

echo.
echo ✅ Push completado
echo.
pause
