@echo off
setlocal
cd /d "%~dp0"

where powershell.exe >nul 2>nul
if errorlevel 1 (
  echo [ERROR] No se encontro Windows PowerShell.
  pause
  exit /b 1
)

powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\configurar-claves-windows.ps1"
if errorlevel 1 (
  echo.
  echo [ERROR] No se pudo actualizar la configuracion.
  pause
  exit /b 1
)

echo.
echo Configuracion finalizada. Reinicie INICIAR-WINDOWS.cmd para aplicar los cambios.
pause
endlocal
