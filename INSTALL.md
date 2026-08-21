# Instalación — Carro de Paro (SISTEMA V2)

La guía completa de instalación y configuración está en
[`SISTEMA V2/README_instalacion.md`](SISTEMA%20V2/README_instalacion.md).

## Resumen

1. Cuenta de Google + clasp:
   ```bash
   npm install -g @google/clasp && clasp login
   ```
2. Contenedor: hoja de cálculo nueva → *Extensiones → Apps Script*.
3. Copiar los `*.gs` de `SISTEMA V2/` junto a `appsscript.json` y subir:
   ```bash
   clasp push
   ```
4. Recargar la hoja de cálculo: el menú del sistema aparece automáticamente.
