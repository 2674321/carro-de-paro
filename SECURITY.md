# Política de seguridad

Este repositorio contiene código fuente y documentación del sistema, no datos clínicos u operativos reales.

## Reporte responsable

Si detectas una vulnerabilidad, una exposición de datos o una configuración insegura, evita publicar detalles explotables en un issue abierto. Contacta al mantenedor por un canal privado disponible en su perfil de GitHub.

## No versionar

- datos de pacientes o funcionarios;
- RUT, teléfonos, correos, domicilios u otros identificadores;
- inventarios/exportaciones generadas desde el sistema real cuando incluyan información sensible;
- respaldos, PDFs o planillas producidos desde datos reales;
- credenciales, tokens, cookies, secretos o archivos de servicio;
- `.clasp.json`, `.clasprc.json` y archivos `.env`.

Las capturas, demos y fixtures públicos deben utilizar únicamente información ficticia o anonimizada de forma irreversible.

## Historial Git

Eliminar un archivo del último commit no lo elimina del historial. Si se detecta una exposición, debe evaluarse una purga histórica separada y, si hubo secretos, rotarlos.
