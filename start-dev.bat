@echo off
cd /d "%~dp0"
echo Starting POS Toko dev server on http://localhost:3000
echo Biarkan jendela ini terbuka selama development.
echo.
npm run dev
pause
