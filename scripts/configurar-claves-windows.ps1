$ErrorActionPreference = 'Stop'

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$EnvPath = Join-Path $ProjectRoot '.env'
$ExamplePath = Join-Path $ProjectRoot '.env.example'

if (-not (Test-Path -LiteralPath $EnvPath)) {
  if (Test-Path -LiteralPath $ExamplePath) {
    Copy-Item -LiteralPath $ExamplePath -Destination $EnvPath
  } else {
    New-Item -ItemType File -Path $EnvPath | Out-Null
  }
}

function Convert-SecureValue([Security.SecureString]$SecureValue) {
  $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecureValue)
  try {
    return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
  } finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
  }
}

function Set-DotEnvValue([string]$Name, [string]$Value) {
  if ($Value -match "[`r`n]") { throw "Valor invalido para $Name" }
  $lines = [Collections.Generic.List[string]]::new()
  foreach ($line in [IO.File]::ReadAllLines($EnvPath)) { $lines.Add($line) }
  $pattern = '^(?:#\s*)?' + [Regex]::Escape($Name) + '='
  $replacement = "$Name=$Value"
  $updated = $false
  for ($index = 0; $index -lt $lines.Count; $index++) {
    if ($lines[$index] -match $pattern) {
      $lines[$index] = $replacement
      $updated = $true
    }
  }
  if (-not $updated) {
    $lines.Add($replacement)
  }
  [IO.File]::WriteAllLines($EnvPath, $lines, [Text.UTF8Encoding]::new($false))
}

function Save-Secret([string]$Name, [string]$Label) {
  $secure = Read-Host "Pegue $Label (no se mostrara en pantalla)" -AsSecureString
  $value = Convert-SecureValue $secure
  if ([string]::IsNullOrWhiteSpace($value)) {
    Write-Host 'No se realizaron cambios.' -ForegroundColor Yellow
    return
  }
  $value = $value.Trim()
  if ($value.Length -gt 512 -or $value -notmatch '^[A-Za-z0-9._~+/=:-]+$') {
    throw "$Label contiene espacios o caracteres no validos para un archivo .env"
  }
  Set-DotEnvValue $Name $value
  Write-Host "$Label guardada." -ForegroundColor Green
}

function Protect-EnvFile {
  try {
    & icacls.exe $EnvPath /inheritance:r /grant:r "${env:USERNAME}:(F)" | Out-Null
  } catch {
    Write-Host 'Aviso: no se pudieron restringir automaticamente los permisos del archivo .env.' -ForegroundColor Yellow
  }
}

do {
  Clear-Host
  Write-Host 'OBSERVATORIO ARGENTINA - CREDENCIALES LOCALES' -ForegroundColor Cyan
  Write-Host 'Las claves se guardan en .env y nunca se muestran.'
  Write-Host ''
  Write-Host '1. NASA FIRMS (incendios)'
  Write-Host '2. AISStream (embarcaciones)'
  Write-Host '3. OpenSky OAuth (vuelos)'
  Write-Host '4. Cesium ion (terreno y 3D)'
  Write-Host '5. OpenAI (voz e IA)'
  Write-Host '6. TomTom (transito)'
  Write-Host '7. Google Maps cliente'
  Write-Host '8. Google Maps servidor'
  Write-Host '0. Guardar y salir'
  Write-Host ''
  $choice = Read-Host 'Seleccione una opcion'

  switch ($choice) {
    '1' { Save-Secret 'FIRMS_MAP_KEY' 'la clave NASA FIRMS' }
    '2' { Save-Secret 'AISSTREAM_API_KEY' 'la clave AISStream' }
    '3' {
      Set-DotEnvValue 'OPENSKY_AUTH_MODE' 'oauth'
      Save-Secret 'OPENSKY_CLIENT_ID' 'el Client ID de OpenSky'
      Save-Secret 'OPENSKY_CLIENT_SECRET' 'el Client Secret de OpenSky'
    }
    '4' { Save-Secret 'CESIUM_ION_TOKEN' 'el token Cesium ion' }
    '5' { Save-Secret 'OPENAI_API_KEY' 'la clave OpenAI' }
    '6' { Save-Secret 'TOMTOM_API_KEY' 'la clave TomTom' }
    '7' { Save-Secret 'GOOGLE_MAPS_API_KEY' 'la clave Google Maps cliente' }
    '8' { Save-Secret 'GOOGLE_MAPS_SERVER_API_KEY' 'la clave Google Maps servidor' }
    '0' { }
    default { Write-Host 'Opcion no valida.' -ForegroundColor Yellow }
  }
  if ($choice -ne '0') {
    Write-Host ''
    Read-Host 'Presione Enter para continuar' | Out-Null
  }
} while ($choice -ne '0')

Protect-EnvFile
Write-Host "Credenciales guardadas localmente en $EnvPath" -ForegroundColor Green
