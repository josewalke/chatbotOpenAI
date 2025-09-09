@echo off
echo ========================================
echo   VERIFICACION DEL ESTADO DE GIT
echo ========================================
echo.

echo 📊 Estado del repositorio:
git status

echo.
echo 📝 Últimos commits:
git log --oneline -5

echo.
echo 🌐 Repositorio remoto:
git remote -v

echo.
echo 🔍 Archivos modificados:
git diff --name-only

echo.
echo 📦 Archivos en staging:
git diff --cached --name-only

echo.
pause
