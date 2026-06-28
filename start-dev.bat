@echo off
cd /d "%~dp0"

echo Starting POS Toko dev server on http://localhost:3000
echo.

for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000" ^| findstr "LISTENING"') do (
  echo Port 3000 sudah dipakai PID %%a — hentikan proses lama dulu.
  echo   taskkill /PID %%a /F
  pause
  exit /b 1
)

echo Biarkan jendela ini terbuka selama development.
echo Jika CSS/assets 404, tutup semua terminal dev lalu jalankan ulang script ini.
echo.
npm run dev
pause
