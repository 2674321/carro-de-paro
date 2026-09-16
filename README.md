# Carro de Paro — CESFAM San Juan

[![Licencia MIT](https://img.shields.io/badge/licencia-MIT-blue)](LICENSE) ![Versión](https://img.shields.io/badge/versi%C3%B3n-v2.2.27-green) ![Estado](https://img.shields.io/badge/estado-en%20uso-brightgreen) [![CI](https://github.com/2674321/carro-de-paro/actions/workflows/ci.yml/badge.svg)](https://github.com/2674321/carro-de-paro/actions/workflows/ci.yml)

Sistema de **revisión de inventario de los carros de paro / móviles del SAPU del
CESFAM San Juan** (urgencia ambulatoria y móviles): revisiones, stock y
vencimientos. Construido sobre **Google Apps Script + Google Sheets**.

> **En uso** · v2.2.27 (VERSIÓN FINAL ESTABLE) · revisión diaria: 7 columnas de
> cantidad, una por día de la semana.

## Funcionalidades

- 🗓️ **Revisión diaria** (Lun–Dom) con 7 columnas de cantidad y avance automático.
- ⚠️ **Alertas automáticas**: REPONER / POR VENCER / VENCIDO según el último día
  registrado y el vencimiento del insumo.
- 🖨️ **Impresión y PDF**: registro semanal, resumen mensual por semanas, informe
  de revisión mensual y control de vencimientos — personalizables desde CONFIG.
- 📊 **Tablero de control**: semáforo de la semana actual, vencimientos próximos,
  uso de los últimos 3 meses y completitud.
- 📈 **Estadísticas**: KPIs, evolución semanal, Pareto 80/20, distribución de
  vencimientos y comparativa FÁRMACOS vs INSUMOS.
- 🔎 **Búsqueda en vivo** por nombre o código (farmacos e insumos) con filtro.
- 🧾 **Bitácora de operaciones** y control de calidad automático.
- 💾 **Datos de prueba** opcionales para probar el flujo sin tocar datos reales.

## Capturas

> Datos ficticios · capturas: agosto 2026 · línea SISTEMA V2

![Hoja de revisiones](docs/screenshots/carro-hoja-revisiones.png)
*Registro semanal de revisiones · ago 2026*

![Configuraciones](docs/screenshots/carro-configuraciones.png)
*Configuración del sistema · ago 2026*

![Informe mensual](docs/screenshots/carro-informe-mensual.png)
*Informe de revisión mensual · ago 2026*

![Informe PDF](docs/screenshots/carro-informe-pdf.png)
*PDF del informe · ago 2026*

## Stack

| Componente | Tecnología |
|---|---|
| Runtime | Google Apps Script (V8) |
| Base de datos | Google Sheets |
| PDF | Drive + exportación oficial de Google (respetando configuración de página) |
| CI | GitHub Actions (`node --check` sobre los `.gs`) |

## Instalación y uso

La guía completa de instalación (manual en la hoja y por `clasp`), uso diario,
menú del sistema y notas técnicas está en
[`SISTEMA V2/README_instalacion.md`](SISTEMA%20V2/README_instalacion.md).

Documentación resumida en [`INSTALL.md`](INSTALL.md).

## Estructura

```text
SISTEMA V2/
├── appsscript.json          # Manifest del proyecto Apps Script
├── README_instalacion.md    # Guía completa de instalación y uso
└── 00_Sistema.gs … 13_Personalizacion.gs   # 14 módulos de código
docs/screenshots/            # Capturas (datos ficticios)
```

## Licencia

MIT — ver [LICENSE](LICENSE).

Para citar este proyecto: ver [`CITATION.cff`](CITATION.cff).

---

Desarrollado por [@2674321](https://github.com/2674321) · Coquimbo, Chile