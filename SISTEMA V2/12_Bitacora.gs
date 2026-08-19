// ─────────────────────────────────────────────────────────────────────────────
//  12_BITACORA — trazabilidad y control de calidad
//  · _registrarEvento: agrega un evento a la BITÁCORA (fecha, hora, tipo,
//    detalle). La hoja se autoacota (BIT_MAX_EVENTOS) y el registro nunca
//    interrumpe el flujo principal (try/catch total).
//  · formatearBitacora: encabezado y recorte de la hoja.
//  · _controlCalidad: revisa maestros y registro (duplicados, stock base,
//    formato de vencimiento, claves de semana, fechas) y reporta hallazgos.
//  Sin emojis en las celdas: la bitácora es un documento oficial.
// ─────────────────────────────────────────────────────────────────────────────

// Agrega un evento a la BITÁCORA (nunca lanza errores)
function _registrarEvento(tipo, detalle) {
  try {
    var ss = _ss()
    var sh = ss.getSheetByName(HOJA.bitacora)
    if (!sh) sh = _hoja(HOJA.bitacora, HOJA_ORDEN.bitacora)

    var ahora = new Date()
    var fecha = _fmt(ahora)
    var hora = ('0' + ahora.getHours()).slice(-2) + ':' + ('0' + ahora.getMinutes()).slice(-2)

    var ultima = _ultimaFilaDatos(sh, 1, BIT_FILA_DATOS)
    var fila = Math.max(ultima, BIT_FILA_DATOS - 1) + 1
    sh.getRange(fila, 1, 1, 4).setValues([[fecha, hora, tipo, String(detalle || '')]])

    // Autoacotado: si supera el máximo, borra los eventos más antiguos
    var total = fila - BIT_FILA_DATOS + 1
    if (total > BIT_MAX_EVENTOS) sh.deleteRows(BIT_FILA_DATOS, total - BIT_MAX_EVENTOS)
  } catch (e) { }
}

// Encabezado de la bitácora (los datos ya fueron escritos por _registrarEvento)
function formatearBitacora() {
  var sh = _hoja(HOJA.bitacora, HOJA_ORDEN.bitacora)
  _descombinar(sh)
  _pintarPestana(HOJA.bitacora, C.tabBitacora)

  var fila = 1
  _tituloPagina(sh, fila, 4, 'BITÁCORA DE OPERACIONES — ' + SIS.nombre, C.gris, 28)
  fila++
  _filaInfo(sh, fila, 4, 'Historial de eventos del sistema: semanas creadas, completadas, copiadas, eliminadas, PDF generados y controles de calidad. Se registra automáticamente; no se edita a mano.')
  fila++
  _cabecera(sh, fila, BIT_TITULOS, C.gris, 20)

  var ultima = _ultimaFilaDatos(sh, 1, BIT_FILA_DATOS)
  if (ultima < BIT_FILA_DATOS) {
    _txt(sh, BIT_FILA_DATOS, 1, '(Sin eventos registrados aún)', { color: C.gris, size: 9 })
  } else {
    var n = ultima - BIT_FILA_DATOS + 1
    var rango = sh.getRange(BIT_FILA_DATOS, 1, n, 4)
    rango.setFontSize(9).setVerticalAlignment('middle')
    rango.setBorder(true, true, true, true, true, true, C.bordeSuave, SpreadsheetApp.BorderStyle.SOLID)
    sh.getRange(BIT_FILA_DATOS, BIT.tipo, n, 1).setFontWeight('bold')
    for (var i = 0; i < n; i++) {
      var fr = BIT_FILA_DATOS + i
      if (i % 2 === 1) sh.getRange(fr, 1, 1, 4).setBackground(C.zebra)
      var tipo = String(sh.getRange(fr, BIT.tipo).getValue() || '').trim()
      if (tipo === 'ALERTA' || tipo === 'ERROR') sh.getRange(fr, BIT.tipo).setFontColor(C.alerta)
      else if (tipo === 'REVISIÓN' || tipo === 'SISTEMA') sh.getRange(fr, BIT.tipo).setFontColor(C.primario)
      else sh.getRange(fr, BIT.tipo).setFontColor(C.aviso)
    }
  }
  _anchos(sh, BIT_ANCHOS)
}

// ─── CONTROL DE CALIDAD ──────────────────────────────────────────────────────
// Revisa maestros y registro; devuelve { ok, texto } y deja constancia en la
// bitácora. No corrige nada: solo informa (el usuario decide).
function _controlCalidad() {
  var hallazgos = []

  // Fármacos: duplicados y stock base
  var farm = _leerFarmacos()
  var vistos = {}
  for (var i = 0; i < farm.length; i++) {
    var nombre = farm[i].med
    if (vistos[nombre]) hallazgos.push('Fármaco duplicado en el maestro: ' + nombre)
    vistos[nombre] = true
    var base = Number(farm[i].base)
    if (isNaN(base) || base <= 0) hallazgos.push('Fármaco sin stock base válido: ' + nombre)
  }

  // Insumos: duplicados, cantidad base y formato de vencimiento
  var ins = _leerInsumos()
  var vistosI = {}
  for (var j = 0; j < ins.length; j++) {
    var nom = ins[j].nom
    if (vistosI[nom]) hallazgos.push('Insumo duplicado en el maestro: ' + nom)
    vistosI[nom] = true
    var b = Number(ins[j].base)
    if (isNaN(b) || b <= 0) hallazgos.push('Insumo sin cantidad base válida: ' + nom)
    if (ins[j].vto && !_esVto(ins[j].vto)) {
      hallazgos.push('Vencimiento no reconocible como fecha: ' + nom)
    }
  }

  // Registro: claves de semana y fechas
  var reg = _registroCompleto()
  var fechasMalas = 0
  var semsMalas = 0
  var semsBuenas = 0
  for (var r = 0; r < reg.length; r++) {
    var s = String(reg[r][1] || '').trim()
    if (s.indexOf('SEMANA N°') === 0) continue   // filas banda, no tienen fecha
    var f = String(reg[r][0] || '').trim()
    if (f.length !== 10) fechasMalas++
    if (/^S\d+\/\d{4}$/.test(s)) semsBuenas++
    else if (s) semsMalas++
  }
  if (semsMalas) hallazgos.push(semsMalas + ' fila(s) con clave de semana no estándar')
  if (fechasMalas) hallazgos.push(fechasMalas + ' fila(s) con fecha mal registrada')

  if (hallazgos.length === 0) {
    _registrarEvento('CALIDAD', 'Sin hallazgos (' + farm.length + ' fármacos, ' + ins.length + ' insumos, ' + semsBuenas + ' filas de registro)')
    return {
      ok: true,
      texto: 'Sin hallazgos: ' + farm.length + ' fármacos y ' + ins.length + ' insumos en los maestros, registro con ' + semsBuenas + ' filas consistentes.'
    }
  }

  var detalle = hallazgos.slice(0, 6).join(' | ') + (hallazgos.length > 6 ? ' | …' : '')
  _registrarEvento('CALIDAD', hallazgos.length + ' hallazgo(s): ' + detalle)
  return { ok: false, texto: hallazgos.join('\n') }
}

// Paso de "Actualizar sistema": muestra el resultado del control de calidad
function _pasoControlCalidad() {
  var r = _controlCalidad()
  if (!r.ok) {
    var ui = _ui()
    if (ui) _alerta(ui, 'Control de calidad', r.texto + '\n\nCorrija estos puntos en los maestros y vuelva a actualizar.')
  }
}
