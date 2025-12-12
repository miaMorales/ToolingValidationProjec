# Script maestro para convertir todos los recursos a locales
Write-Host @"
================================================================
                                                              
   CONVERTIR RECURSOS EXTERNOS A LOCALES                     
   Tooling Validation Project                                
                                                              
================================================================
"@ -ForegroundColor Cyan

Write-Host "`nEste script:" -ForegroundColor Yellow
Write-Host "  1. Descargará Bootstrap, jQuery, Bootstrap Icons y Poppins" -ForegroundColor White
Write-Host "  2. Los guardará en /public/vendor/" -ForegroundColor White
Write-Host "  3. Actualizará todos los archivos HTML automáticamente" -ForegroundColor White

$confirm = Read-Host "`n¿Deseas continuar? (S/N)"
if ($confirm -notlike "S*" -and $confirm -notlike "s*") {
    Write-Host "Operación cancelada." -ForegroundColor Red
    exit
}

# Paso 1: Descargar recursos
Write-Host "`n" -NoNewline
Write-Host "===============================================================" -ForegroundColor Cyan
Write-Host "PASO 1: Descargando recursos externos..." -ForegroundColor Yellow
Write-Host "===============================================================" -ForegroundColor Cyan
& "$PSScriptRoot\download-assets.ps1"

if ($LASTEXITCODE -ne 0 -and $null -ne $LASTEXITCODE) {
    Write-Host "`nX Error en la descarga. Abortando..." -ForegroundColor Red
    exit 1
}

# Paso 2: Actualizar HTML
Write-Host "`n" -NoNewline
Write-Host "===============================================================" -ForegroundColor Cyan
Write-Host "PASO 2: Actualizando archivos HTML..." -ForegroundColor Yellow
Write-Host "===============================================================" -ForegroundColor Cyan
& "$PSScriptRoot\update-html-links.ps1"

if ($LASTEXITCODE -ne 0 -and $null -ne $LASTEXITCODE) {
    Write-Host "`nX Error en la actualizacion. Verifica manualmente." -ForegroundColor Red
    exit 1
}

# Resumen final
Write-Host "`n" -NoNewline
Write-Host "===============================================================" -ForegroundColor Green
Write-Host "PROCESO COMPLETADO EXITOSAMENTE" -ForegroundColor Green
Write-Host "===============================================================" -ForegroundColor Green

Write-Host "`nEstructura creada:" -ForegroundColor Cyan
Write-Host "  public/vendor/" -ForegroundColor White
Write-Host "    - css/" -ForegroundColor Gray
Write-Host "      - bootstrap.min.css" -ForegroundColor Gray
Write-Host "      - bootstrap-icons.min.css" -ForegroundColor Gray
Write-Host "      - poppins.css" -ForegroundColor Gray
Write-Host "    - js/" -ForegroundColor Gray
Write-Host "      - bootstrap.bundle.min.js" -ForegroundColor Gray
Write-Host "      - jquery.min.js" -ForegroundColor Gray
Write-Host "    - fonts/" -ForegroundColor Gray
Write-Host "      - bootstrap-icons/" -ForegroundColor Gray
Write-Host "      - poppins/" -ForegroundColor Gray

Write-Host "`nBeneficios:" -ForegroundColor Yellow
Write-Host "  - Carga mas rapida (sin depender de internet)" -ForegroundColor Green
Write-Host "  - Funciona completamente offline" -ForegroundColor Green
Write-Host "  - Sin tiempos de espera de CDN" -ForegroundColor Green
Write-Host "  - Mayor control sobre versiones" -ForegroundColor Green

Write-Host "`nPróximos pasos:" -ForegroundColor Cyan
Write-Host "  1. Reinicia el servidor: node src/server.js" -ForegroundColor White
Write-Host "  2. Abre http://localhost:3111" -ForegroundColor White
Write-Host "  3. Verifica que todo cargue correctamente" -ForegroundColor White

Write-Host "`n¡Listo! Tu aplicacion ahora es completamente local." -ForegroundColor Green
