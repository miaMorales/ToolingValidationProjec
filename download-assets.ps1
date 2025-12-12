# Script para descargar todos los recursos externos localmente
Write-Host "=== Descargando recursos externos ===" -ForegroundColor Cyan

# Crear estructura de carpetas
$publicPath = "c:\Alma\ToolingValidationProject\public"
$vendorPath = "$publicPath\vendor"
$cssPath = "$vendorPath\css"
$jsPath = "$vendorPath\js"
$fontsPath = "$vendorPath\fonts"

Write-Host "Creando carpetas..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path $cssPath | Out-Null
New-Item -ItemType Directory -Force -Path $jsPath | Out-Null
New-Item -ItemType Directory -Force -Path "$fontsPath\bootstrap-icons" | Out-Null
New-Item -ItemType Directory -Force -Path "$fontsPath\poppins" | Out-Null

# Función para descargar archivos
function Download-File {
    param([string]$url, [string]$output)
    Write-Host "Descargando: $url" -ForegroundColor Green
    try {
        Invoke-WebRequest -Uri $url -OutFile $output -UseBasicParsing
        Write-Host "  OK Guardado en: $output" -ForegroundColor Gray
    } catch {
        Write-Host "  X Error: $_" -ForegroundColor Red
    }
}

# 1. Bootstrap CSS
Write-Host "`n[1/7] Bootstrap CSS..." -ForegroundColor Cyan
Download-File "https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" "$cssPath\bootstrap.min.css"

# 2. Bootstrap JS (incluye Popper)
Write-Host "`n[2/7] Bootstrap JS..." -ForegroundColor Cyan
Download-File "https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js" "$jsPath\bootstrap.bundle.min.js"

# 3. Bootstrap Icons CSS
Write-Host "`n[3/7] Bootstrap Icons CSS..." -ForegroundColor Cyan
Download-File "https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css" "$cssPath\bootstrap-icons.min.css"

# 4. Bootstrap Icons Fonts
Write-Host "`n[4/7] Bootstrap Icons Fonts..." -ForegroundColor Cyan
Download-File "https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/fonts/bootstrap-icons.woff" "$fontsPath\bootstrap-icons\bootstrap-icons.woff"
Download-File "https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/fonts/bootstrap-icons.woff2" "$fontsPath\bootstrap-icons\bootstrap-icons.woff2"

# 5. jQuery
Write-Host "`n[5/7] jQuery 3.7.1..." -ForegroundColor Cyan
Download-File "https://ajax.googleapis.com/ajax/libs/jquery/3.7.1/jquery.min.js" "$jsPath\jquery.min.js"

# 6. Poppins Font - CSS
Write-Host "`n[6/7] Poppins Font CSS..." -ForegroundColor Cyan
$poppinsCss = @"
/* Poppins Font - Local */
@font-face {
  font-family: 'Poppins';
  font-style: normal;
  font-weight: 300;
  src: url('../fonts/poppins/poppins-v20-latin-300.woff2') format('woff2');
}
@font-face {
  font-family: 'Poppins';
  font-style: normal;
  font-weight: 400;
  src: url('../fonts/poppins/poppins-v20-latin-regular.woff2') format('woff2');
}
@font-face {
  font-family: 'Poppins';
  font-style: normal;
  font-weight: 500;
  src: url('../fonts/poppins/poppins-v20-latin-500.woff2') format('woff2');
}
@font-face {
  font-family: 'Poppins';
  font-style: normal;
  font-weight: 600;
  src: url('../fonts/poppins/poppins-v20-latin-600.woff2') format('woff2');
}
@font-face {
  font-family: 'Poppins';
  font-style: normal;
  font-weight: 700;
  src: url('../fonts/poppins/poppins-v20-latin-700.woff2') format('woff2');
}
@font-face {
  font-family: 'Poppins';
  font-style: normal;
  font-weight: 800;
  src: url('../fonts/poppins/poppins-v20-latin-800.woff2') format('woff2');
}
"@
$poppinsCss | Out-File -FilePath "$cssPath\poppins.css" -Encoding UTF8
Write-Host "  OK Creado: $cssPath\poppins.css" -ForegroundColor Gray

# 7. Poppins Font - Archivos WOFF2
Write-Host "`n[7/7] Poppins Font Files..." -ForegroundColor Cyan
$poppinsWeights = @("300", "regular", "500", "600", "700", "800")
foreach ($weight in $poppinsWeights) {
    $url = "https://fonts.gstatic.com/s/poppins/v20/pxiByp8kv8JHgFVrLDz8Z1xlFQ.woff2"
    $filename = "poppins-v20-latin-$weight.woff2"
    
    # URLs específicas para cada peso
    switch ($weight) {
        "300"     { $url = "https://fonts.gstatic.com/s/poppins/v20/pxiByp8kv8JHgFVrLDz8Z1JlFQ.woff2" }
        "regular" { $url = "https://fonts.gstatic.com/s/poppins/v20/pxiEyp8kv8JHgFVrJJfecg.woff2" }
        "500"     { $url = "https://fonts.gstatic.com/s/poppins/v20/pxiByp8kv8JHgFVrLGT9Z1JlFQ.woff2" }
        "600"     { $url = "https://fonts.gstatic.com/s/poppins/v20/pxiByp8kv8JHgFVrLEj6Z1JlFQ.woff2" }
        "700"     { $url = "https://fonts.gstatic.com/s/poppins/v20/pxiByp8kv8JHgFVrLCz7Z1JlFQ.woff2" }
        "800"     { $url = "https://fonts.gstatic.com/s/poppins/v20/pxiByp8kv8JHgFVrLDD4Z1JlFQ.woff2" }
    }
    
    Download-File $url "$fontsPath\poppins\$filename"
}

# Corregir la ruta de las fuentes en bootstrap-icons.min.css
Write-Host "`nAjustando rutas de fuentes..." -ForegroundColor Yellow
$biCss = Get-Content "$cssPath\bootstrap-icons.min.css" -Raw
$biCss = $biCss -replace 'fonts/bootstrap-icons', '../fonts/bootstrap-icons/bootstrap-icons'
$biCss | Out-File -FilePath "$cssPath\bootstrap-icons.min.css" -Encoding UTF8 -NoNewline

Write-Host "`n=== DESCARGA COMPLETADA ===" -ForegroundColor Green
Write-Host "`nArchivos guardados en:" -ForegroundColor Cyan
Write-Host "  CSS: $cssPath" -ForegroundColor Gray
Write-Host "  JS:  $jsPath" -ForegroundColor Gray
Write-Host "  Fuentes: $fontsPath" -ForegroundColor Gray
Write-Host "`nAhora ejecuta el script de actualización de HTML:" -ForegroundColor Yellow
Write-Host "  .\update-html-links.ps1" -ForegroundColor White
