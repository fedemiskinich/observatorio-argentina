@echo off
setlocal
cd /d "%~dp0"

rem Perfil argentino: evita que un .env antiguo reactive Austin u otros packs.
set "CCTV_SOURCES_FILE=config/cctv_sources.argentina.json"
set "CCTV_SOURCES_JSON=[]"
set "CCTV_LIVE_PACKS_ENABLED=0"
set "CCTV_PREFER_AUSTIN=0"
set "CCTV_FORCE_AUSTIN=0"

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js no esta instalado o no figura en PATH.
  echo Instale Node.js 24.14 o superior dentro de la rama 24.x, o Node.js 26.x.
  pause
  exit /b 1
)

echo [Observatorio Argentina] Verificando el entorno...
if not exist node_modules\ (
  echo Instalando dependencias por primera vez...
  call npm ci
  if errorlevel 1 (
    echo [ERROR] No se pudieron instalar las dependencias.
    pause
    exit /b 1
  )
)

call npm run doctor
if errorlevel 1 (
  echo.
  echo [ERROR] El entorno no cumple los requisitos del proyecto.
  pause
  exit /b 1
)

echo.
echo [Observatorio Argentina] Iniciando en http://localhost:4173
echo [CCTV] Catalogo argentino activo: Las Heras, Corrientes y Buenos Aires.
echo [CCTV] Paquetes internacionales deshabilitados.
echo Presione Ctrl+C para detenerlo.
call npm run dev

endlocal
