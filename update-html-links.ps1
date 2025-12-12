# Script para actualizar todos los enlaces de CDN a recursos locales
Write-Host "=== Actualizando enlaces en archivos HTML ===" -ForegroundColor Cyan

$publicPath = "c:\Alma\ToolingValidationProject\public"

# Función para actualizar un archivo
function Update-HtmlFile {
    param([string]$filePath)
    
    if (-not (Test-Path $filePath)) {
        Write-Host "  X No encontrado: $filePath" -ForegroundColor Red
        return
    }
    
    Write-Host "Actualizando: $(Split-Path $filePath -Leaf)" -ForegroundColor Green
    
    $content = Get-Content $filePath -Raw -Encoding UTF8
    $originalContent = $content
    
    # Eliminar líneas de preconnect (ya no son necesarias)
    $content = $content -replace '.*<link rel="preconnect" href="https://cdn\.jsdelivr\.net".*\r?\n', ''
    $content = $content -replace '.*<link rel="preconnect" href="https://fonts\.googleapis\.com".*\r?\n', ''
    $content = $content -replace '.*<link rel="preconnect" href="https://fonts\.gstatic\.com".*\r?\n', ''
    
    # Reemplazar Bootstrap CSS
    $content = $content -replace 'https://cdn\.jsdelivr\.net/npm/bootstrap@5\.3\.3/dist/css/bootstrap\.min\.css', '/vendor/css/bootstrap.min.css'
    
    # Reemplazar Bootstrap JS
    $content = $content -replace 'https://cdn\.jsdelivr\.net/npm/bootstrap@5\.3\.3/dist/js/bootstrap\.bundle\.min\.js', '/vendor/js/bootstrap.bundle.min.js'
    
    # Reemplazar Bootstrap Icons
    $content = $content -replace 'https://cdn\.jsdelivr\.net/npm/bootstrap-icons@1\.11\.3/font/bootstrap-icons\.min\.css', '/vendor/css/bootstrap-icons.min.css'
    
    # Reemplazar jQuery
    $content = $content -replace 'https://ajax\.googleapis\.com/ajax/libs/jquery/3\.7\.1/jquery\.min\.js', '/vendor/js/jquery.min.js'
    
    # Reemplazar Google Fonts (Poppins)
    $content = $content -replace 'https://fonts\.googleapis\.com/css2\?family=Poppins[^"]*', '/vendor/css/poppins.css'
    
    # Eliminar atributos media="print" y onload de fuentes locales
    $content = $content -replace ' media="print" onload="this\.media=''all''"', ''
    
    # Solo guardar si hubo cambios
    if ($content -ne $originalContent) {
        $content | Out-File -FilePath $filePath -Encoding UTF8 -NoNewline
        Write-Host "  OK Actualizado" -ForegroundColor Gray
    } else {
        Write-Host "  - Sin cambios" -ForegroundColor DarkGray
    }
}

# Archivos HTML a actualizar
$htmlFiles = @(
    "$publicPath\index.html",
    "$publicPath\adminIndex.html",
    "$publicPath\stencil-hp.html",
    "$publicPath\plate-hp.html",
    "$publicPath\squeegee-hp.html",
    "$publicPath\recipes.html",
    "$publicPath\recipe-detail.html",
    "$publicPath\users-hp.html",
    "$publicPath\imprimir.html",
    "$publicPath\HTML\index.html"
)

foreach ($file in $htmlFiles) {
    Update-HtmlFile $file
}

Write-Host "`n=== ACTUALIZACION COMPLETADA ===" -ForegroundColor Green
Write-Host "`nTodos los enlaces ahora apuntan a recursos locales en /vendor/" -ForegroundColor Cyan
Write-Host "Los archivos cargarán más rápido y funcionarán sin internet." -ForegroundColor Yellow
