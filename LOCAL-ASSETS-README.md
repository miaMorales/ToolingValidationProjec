# 📦 Conversión de Recursos Externos a Locales

## ¿Qué hace esto?

Descarga todos los recursos que actualmente se cargan desde internet (Bootstrap, jQuery, iconos, fuentes) y los guarda localmente en tu proyecto.

## 🎯 Beneficios

✅ **Carga más rápida** - Sin depender de CDN externos
✅ **Funciona offline** - No necesitas internet
✅ **Más control** - Versiones fijas, sin cambios inesperados
✅ **Mejor rendimiento** - Especialmente en redes lentas

## 🚀 Uso

### Opción 1: Script Automático (Recomendado)

Abre PowerShell en esta carpeta y ejecuta:

```powershell
.\setup-local-assets.ps1
```

Este script hará **TODO automáticamente**:
1. Descarga Bootstrap, jQuery, Bootstrap Icons y Poppins
2. Los guarda en `public/vendor/`
3. Actualiza todos los archivos HTML para usar las versiones locales

### Opción 2: Paso a Paso

Si prefieres hacerlo manualmente:

```powershell
# 1. Descargar recursos
.\download-assets.ps1

# 2. Actualizar HTML
.\update-html-links.ps1
```

## 📁 Estructura Creada

```
public/
└── vendor/
    ├── css/
    │   ├── bootstrap.min.css
    │   ├── bootstrap-icons.min.css
    │   └── poppins.css
    ├── js/
    │   ├── bootstrap.bundle.min.js
    │   └── jquery.min.js
    └── fonts/
        ├── bootstrap-icons/
        │   ├── bootstrap-icons.woff
        │   └── bootstrap-icons.woff2
        └── poppins/
            ├── poppins-v20-latin-300.woff2
            ├── poppins-v20-latin-regular.woff2
            ├── poppins-v20-latin-500.woff2
            ├── poppins-v20-latin-600.woff2
            ├── poppins-v20-latin-700.woff2
            └── poppins-v20-latin-800.woff2
```

## 📝 Archivos HTML Actualizados

El script actualiza estos archivos automáticamente:
- `index.html`
- `adminIndex.html`
- `stencil-hp.html`
- `plate-hp.html`
- `squeegee-hp.html`
- `recipes.html`
- `recipe-detail.html`
- `users-hp.html`
- `imprimir.html`
- `HTML/index.html`

## 🔄 Recursos Descargados

| Recurso | Versión | Tamaño Aprox. |
|---------|---------|---------------|
| Bootstrap CSS | 5.3.3 | ~190 KB |
| Bootstrap JS | 5.3.3 | ~80 KB |
| Bootstrap Icons | 1.11.3 | ~150 KB |
| jQuery | 3.7.1 | ~85 KB |
| Poppins Fonts | v20 | ~120 KB |
| **TOTAL** | | **~625 KB** |

## ⚠️ Importante

- Asegúrate de tener conexión a internet para ejecutar el script de descarga
- El script creará la carpeta `vendor/` automáticamente
- Los archivos originales HTML se sobrescriben (sin backup)
- Si algo sale mal, puedes restaurar desde Git

## 🧪 Verificación

Después de ejecutar el script:

1. Reinicia el servidor:
   ```powershell
   cd src
   node server.js
   ```

2. Abre en el navegador:
   ```
   http://localhost:3111
   ```

3. Verifica en las DevTools (F12) → Network que:
   - Los archivos se cargan desde `/vendor/`
   - No hay errores 404
   - Todo se ve igual que antes

## 🐛 Troubleshooting

**Problema**: Error al descargar archivos
- **Solución**: Verifica tu conexión a internet y vuelve a ejecutar

**Problema**: Los estilos no se ven
- **Solución**: Verifica que la carpeta `vendor/` exista en `public/`
- Revisa la consola del navegador (F12) por errores

**Problema**: Las fuentes no cargan
- **Solución**: Asegúrate que los archivos `.woff2` estén en `public/vendor/fonts/`

## 📊 Comparación de Rendimiento

### Antes (CDN)
- Primera carga: ~2-3 segundos
- Depende de internet
- Múltiples servidores

### Después (Local)
- Primera carga: ~0.5-1 segundo
- Funciona offline
- Un solo servidor

## ✅ Checklist

- [ ] Ejecutar `setup-local-assets.ps1`
- [ ] Verificar que se creó la carpeta `vendor/`
- [ ] Reiniciar el servidor
- [ ] Probar todas las páginas
- [ ] Verificar que no hay errores 404
- [ ] Confirmar que todo se ve igual

---

**Nota**: Este proceso es irreversible sin Git. Asegúrate de tener un commit limpio antes de ejecutar.
