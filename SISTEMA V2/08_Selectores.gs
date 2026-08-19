// ─────────────────────────────────────────────────────────────────────────────
//  08_SELECTORES — utilidades de UI (aviso con sugerencias)
//  En v2 las semanas/meses se eligen por teclado con formato validado y con
//  autodetección de la última disponible (simple y sin dependencias).
// ─────────────────────────────────────────────────────────────────────────────

// Aviso con título y lista de sugerencias (usado por PDF y selectores).
// Si el diálogo no está autorizado, muestra el aviso por toast en vez de fallar.
function _mostrarAviso(titulo, mensaje, sugerencias) {
  var ui = _ui()
  var texto = mensaje + '\n'
  if (sugerencias && sugerencias.length) {
    texto += '\nSugerencias:'
    for (var i = 0; i < sugerencias.length; i++) texto += '\n' + (i + 1) + '. ' + sugerencias[i]
  }
  if (!ui) return
  try {
    ui.alert(titulo, texto, ui.ButtonSet.OK)
  } catch (e) {
    _toast((titulo || SIS.nombre) + ' · ' + texto, SIS.nombre, 6)
  }
}
