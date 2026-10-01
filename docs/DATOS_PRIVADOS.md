# Datos privados y datos de prueba

El repositorio público debe contener solamente código, documentación y material de demostración seguro.

## Datos reales

Los datos reales del sistema deben permanecer fuera de Git. Esto incluye planillas, exportaciones, respaldos, PDFs, archivos temporales y cualquier registro que permita identificar personas o reconstruir información operativa real.

## Datos de prueba

Los fixtures y ejemplos deben ser completamente sintéticos. No usar datos reales con nombres parcialmente ocultos ni combinaciones que permitan reidentificación.

## Antes de publicar

1. revisar `git diff --staged`;
2. confirmar que no se incluyeron planillas, exportaciones ni respaldos;
3. comprobar que las capturas no muestren datos reales;
4. ejecutar las pruebas disponibles;
5. si hubo una exposición previa, revisar también el historial Git.
