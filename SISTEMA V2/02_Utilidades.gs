// ─────────────────────────────────────────────────────────────────────────────
//  02_UTILIDADES — helpers reutilizables (hojas, UI, formato, fechas, lectores)
//  Sin lógica de negocio: solo piezas pequeñas y seguras.
// ─────────────────────────────────────────────────────────────────────────────

function _ss() {
  return SpreadsheetApp.getActiveSpreadsheet()
}

// Devuelve la UI o null si no hay contexto de interfaz (▶ Ejecutar en el Editor)
function _ui() {
  try { return SpreadsheetApp.getUi() } catch (e) { return null }
}

// Obtiene o crea una pestaña y la activa
function _hoja(nombre, index) {
  var ss = _ss()
  var sh = ss.getSheetByName(nombre)
  if (sh) { sh.activate(); return sh }
  sh = ss.insertSheet(nombre, (index === undefined) ? ss.getSheets().length : index)
  return sh
}

// Hoja de impresión (SEMANA / IMPRESIÓN): la obtiene o crea SIN activar y la
// muestra si estaba oculta. Estas pestañas viven OCULTAS para que el libro no
// acumule hojas de trabajo temporales; solo se activan cuando el usuario elige
// "Ver hoja de impresión" (el PDF se exporta igual estando oculta).
function _hojaImpresion(nombre, index) {
  var ss = _ss()
  var sh = ss.getSheetByName(nombre)
  if (!sh) sh = ss.insertSheet(nombre, (index === undefined) ? ss.getSheets().length : index)
  try { if (sh.isSheetHidden()) sh.showSheet() } catch (e) { }
  return sh
}

// Muestra y activa una hoja de impresión (modo "Ver hoja de la semana/mes")
function _mostrarHojaDeImpresion(nombre) {
  var sh = _ss().getSheetByName(nombre)
  if (!sh) return null
  try { sh.showSheet() } catch (e) { }
  try { sh.activate() } catch (e) { }
  return sh
}

function _toast(msg, titulo, segundos) {
  _ss().toast(msg, titulo || SIS.nombre, segundos || 3)
}

// Confirma con OK_CANCEL: devuelve true solo si pulsa OK (ui puede ser null).
// Si el diálogo no está autorizado (falta el permiso script.container.ui), no
// bloquea: avisa por toast y asume OK para que la operación continúe.
function _confirmar(ui, titulo, mensaje) {
  if (!ui) return true
  try {
    return ui.alert(titulo, mensaje, ui.ButtonSet.OK_CANCEL) === ui.Button.OK
  } catch (e) {
    _toast('Diálogo no disponible (falta "Verificar permisos PDF"); se continúa con la acción.', '⚠ ' + SIS.nombre, 6)
    return true
  }
}

// Alerta simple a prueba de diálogos bloqueados (fallback a toast).
function _alerta(ui, titulo, texto, botones) {
  if (!ui) return
  try {
    return ui.alert(titulo, texto, botones || ui.ButtonSet.OK)
  } catch (e) {
    _toast(titulo + ' · ' + texto, SIS.nombre, 6)
    return null
  }
}

// Pregunta a prueba de diálogos bloqueados: devuelve cadena o null.
// Si `defecto` viene definido y el diálogo NO puede abrirse (permiso de UI
// bloqueado), devuelve `defecto` para que el flujo continúe y el usuario vea
// el resultado en pantalla en vez de que la operación muera en silencio.
function _pregunta(ui, titulo, texto, textoVisible, defecto) {
  if (!ui) return defecto !== undefined ? defecto : null
  try {
    var resp = ui.prompt(titulo, texto, ui.ButtonSet.OK_CANCEL)
    if (resp.getSelectedButton() !== ui.Button.OK) return null
    return String(resp.getResponseText() || '').trim()
  } catch (e) {
    if (defecto !== undefined) return defecto
    _toast(titulo + ' · ' + texto, SIS.nombre, 6)
    return null
  }
}

// Muestra un enlace SIEMPRE visible: crea (o reutiliza) la pestaña
// "PDF — ENLACE", escribe el enlace con instrucciones y la activa.
// Se usa cuando Google bloquea los diálogos (permiso script.container.ui):
// así la impresión nunca termina en "nada", el enlace queda clicable.
function _mostrarEnlaceEnHoja(url, titulo, instruccion) {
  try {
    var ss = _ss()
    var sh = ss.getSheetByName('PDF — ENLACE')
    if (sh) {
      sh.clear()
    } else {
      sh = ss.insertSheet('PDF — ENLACE', Math.min(ss.getSheets().length, 3))
    }
    _descombinar(sh)

    var papel = _papelConfig().nombre

    // ── Fila 1: banda verde ocupa todo el ancho (título centrado) ─────────
    sh.getRange(1, 1).setValue(titulo || 'Documento generado')
    sh.getRange(1, 1, 1, 3).merge()
    sh.getRange(1, 1).setFontSize(16).setFontWeight('bold').setFontColor('#ffffff').setBackground(C.primario)
    sh.getRange(1, 1).setHorizontalAlignment('center').setVerticalAlignment('middle')
    sh.setRowHeight(1, 36)

    // ── Fila 2: metadatos (fecha/hora · papel · versión) ─────────────────
    sh.getRange(2, 1).setValue('Generado el ' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy — HH:mm') +
      '   ·   Tamaño: ' + papel + '   ·   ' + SIS.nombre + ' v' + SIS.version)
    sh.getRange(2, 1, 1, 3).merge()
    sh.getRange(2, 1).setFontSize(10).setFontColor('#7F8C8D').setHorizontalAlignment('center').setVerticalAlignment('middle')
    sh.setRowHeight(2, 22)

    // ── Fila 3: rótulo pequeño ───────────────────────────────────────────
    sh.getRange(3, 1).setValue('Enlace del documento')
    sh.getRange(3, 1, 1, 3).merge()
    sh.getRange(3, 1).setFontSize(9).setFontWeight('bold').setFontColor('#1E6B52')
    sh.getRange(3, 1).setHorizontalAlignment('center').setVerticalAlignment('middle')
    sh.setRowHeight(3, 16)

    // ── Fila 4: recuadro verde con el enlace clicable y centrado ─────────
    var rl = sh.getRange(4, 1, 1, 3)
    rl.merge()
    rl.setValue(String(url))
    rl.setFontSize(12).setFontWeight('bold')
    rl.setFontColor('#ffffff').setBackground('#1E6B52')
    rl.setHorizontalAlignment('center').setVerticalAlignment('middle')
    rl.setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP)
    rl.setBorder(true, true, true, true, true, true, '#ffffff', SpreadsheetApp.BorderStyle.SOLID)
    try { rl.setLinkUrl(url) } catch (e) { }
    sh.setRowHeight(4, 38)

    // ── Fila 5: instrucciones de uso ─────────────────────────────────────
    var rI = sh.getRange(5, 1, 1, 3)
    rI.merge()
    rI.setValue('👉 ' + (instruccion || 'Haga clic en el enlace de arriba para abrir el documento. Al imprimir desde Drive: Ctrl+P → elija "Una cara" si su impresora imprime a doble cara por defecto.'))
    rI.setFontSize(10).setFontColor('#566573')
    rI.setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP).setVerticalAlignment('middle')
    rI.setHorizontalAlignment('left')
    sh.setRowHeight(5, 34)

    // ── Hoja reducida a su contenido real (sin filas/columnas sobrantes) ─
    sh.setColumnWidths(1, 3, 260)
    _asegurarFilas(sh, 5)
    _recortarHoja(sh, 5, 3)
    ss.setActiveSheet(sh)
    try { sh.showSheet() } catch (e) { }
    try { sh.activate() } catch (e) { }
    return true
  } catch (e) {
    return false
  }
}

// Tamaño de página elegido en CONFIG (dropdown "Tamaño de página para
// imprimir"). Si falta la hoja o el parámetro, devuelve A4 (por defecto).
// Devuelve SIEMPRE un objeto nuevo: la constante de SpreadsheetApp.PageSize
// se resuelve aquí (tiempo de ejecución, no al cargar el script) y no debe
// quedar guardada sobre PAPEL para no contaminar llamadas siguientes.
function _papelConfig() {
  // Respaldo robusto: si PAPEL no existe (proyecto pegado incompleto/versión
  // vieja), se usa A4 por defecto. Así la impresión NUNCA falla con
  // "Cannot read properties of undefined (reading 'A4')".
  var mapa = (typeof PAPEL !== 'undefined' && PAPEL) ? PAPEL :
    { 'A4': { nombre: 'A4', url: 'A4', pageSize: 'A4', mm: [210, 297] } }
  var nombre = String(_configValor('Tamaño de página para imprimir') || 'A4').trim()
  var b = mapa[nombre] || mapa['A4']
  var papel = { nombre: b ? b.nombre : 'A4', url: b ? b.url : 'A4', mm: b ? b.mm : [210, 297] }
  try {
    papel.pageSize = SpreadsheetApp.PageSize[b ? b.pageSize : 'A4']
  } catch (e) {
    papel.pageSize = undefined
  }
  return papel
}

// Área imprimible del papel en píxeles (96 dpi), descontando los márgenes de
// impresión que usa la exportación PDF (0.30" laterales, 0.30"/0.35" sup/inf).
function _imprimiblePx(papel) {
  if (!papel || !papel.mm || papel.mm.length < 2) papel = { mm: [210, 297] }
  var px = 96 / 25.4
  var w = papel.mm[0] - (0.30 + 0.30) * 25.4
  var h = papel.mm[1] - (0.30 + 0.35) * 25.4
  return [Math.round(w * px), Math.round(h * px)]
}

// ─── Formato ─────────────────────────────────────────────────────────────────

// Banda de sección: fila combinada con color de fondo
function _banner(sh, fila, cols, texto, bg, alto) {
  var r = sh.getRange(fila, 1, 1, cols)
  r.merge()
  r.setValue(texto)
  r.setFontSize(12).setFontWeight('bold').setFontColor('#ffffff')
  r.setBackground(bg)
  r.setVerticalAlignment('middle')
  r.setHorizontalAlignment('left')
  if (alto) sh.setRowHeight(fila, alto)
  return r
}

// Título de página: banner grande con línea inferior de acento (sin emojis:
// el documento es oficial). Si `texto` trae un prefijo emoji, se elimina.
function _tituloPagina(sh, fila, cols, texto, bg, alto, emoji) {
  var r = _banner(sh, fila, cols, (emoji ? emoji + '  ' : '') + texto, bg, alto)
  r.setFontSize(12)
  sh.getRange(fila, 1, 1, cols).setBorder(false, false, true, false, false, false, '#ffffff', SpreadsheetApp.BorderStyle.SOLID)
  return r
}

// Panel de estado/información: merge con borde, fondo y texto centrado vertical
function _panelInfo(sh, fila, colIni, ancho, texto, colorFondo, colorTexto) {
  var r = sh.getRange(fila, colIni, 1, ancho)
  r.merge()
  r.setValue(texto)
  r.setBackground(colorFondo || C.panelNeutro)
  r.setFontColor(colorTexto || C.negro)
  r.setFontSize(10)
  r.setVerticalAlignment('middle')
  r.setHorizontalAlignment('left')
  r.setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP)
  r.setBorder(true, true, true, true, true, true, C.bordeSuave, SpreadsheetApp.BorderStyle.SOLID)
  return r
}

// Fila de instrucciones: texto con fondo suave que ocupa todo el ancho
function _filaInfo(sh, fila, cols, texto, color) {
  var r = _panelInfo(sh, fila, 1, cols, texto, color || C.panelInfo, C.gris)
  r.setFontSize(9).setFontStyle('italic')
  // Alto adaptativo: si el texto no cabe en una línea, agranda la fila
  // (sin esto, un texto largo envuelto queda cortado a la altura por defecto)
  var ancho = 0
  for (var c = 1; c <= cols; c++) {
    try { ancho += sh.getColumnWidth(c) } catch (e) { }
  }
  var lineas = Math.max(1, Math.ceil((texto.length * 4.6) / Math.max(1, ancho)))
  sh.setRowHeight(fila, Math.max(21, lineas * 15))
  return r
}

// Centra el contenido de un bloque (números y encabezados)
function _centrar(sh, filaIni, filaFin, colIni, colFin) {
  sh.getRange(filaIni, colIni, filaFin - filaIni + 1, colFin - colIni + 1).setHorizontalAlignment('center')
}

// Asegura que la hoja tenga al menos `filas` filas (las agrega si faltan)
function _asegurarFilas(sh, filas) {
  if (sh.getMaxRows() < filas) sh.insertRowsAfter(sh.getMaxRows(), filas - sh.getMaxRows())
}

// Deshace TODAS las combinaciones de celdas de la hoja. Se usa al reconstruir
// un diseño: una combinación vieja (p. ej. de un PDF mensual con otra cantidad
// de semanas) que se cruce con una combinación nueva lanza error y deja
// restos visuales. Es idempotente y nunca lanza.
function _descombinar(sh) {
  try {
    var merges = sh.getMergedRanges()
    for (var i = 0; i < merges.length; i++) {
      try { merges[i].unmerge() } catch (e) { }
    }
  } catch (e) { }
}

// ─── Recorte de hojas ────────────────────────────────────────────────────────
// Elimina las filas/columnas sobrantes: la hoja queda con solo lo necesario
// + el margen configurado (menos celdas vacías = documento más limpio).
// Seguro ante combinaciones: antes de borrar deshace las celdas combinadas
// que toquen la zona a eliminar (de otro modo deleteRows/deleteColumns lanzan)
// y nunca falla: si algo sale mal, deja la hoja como estaba.
function _recortarHoja(sh, filasNecesarias, columnasNecesarias) {
  try {
    var maxF = sh.getMaxRows()
    var maxC = sh.getMaxColumns()
    if (maxF > filasNecesarias || maxC > columnasNecesarias) {
      var merges = sh.getMergedRanges()
      for (var i = 0; i < merges.length; i++) {
        var m = merges[i]
        try {
          if (maxF > filasNecesarias && m.getRow() + m.getNumRows() - 1 > filasNecesarias) { m.unmerge(); continue }
          if (maxC > columnasNecesarias && m.getColumn() + m.getNumColumns() - 1 > columnasNecesarias) m.unmerge()
        } catch (e) { }
      }
    }
    if (maxF > filasNecesarias) sh.deleteRows(filasNecesarias + 1, maxF - filasNecesarias)
    if (maxC > columnasNecesarias) sh.deleteColumns(columnasNecesarias + 1, maxC - columnasNecesarias)
  } catch (e) {
    Logger.log('Recorte de hoja omitido: ' + e)
  }
}

// Cabecera de tabla (con tooltips opcionales por columna)
function _cabecera(sh, fila, titulos, bg, alto, notas) {
  var r = sh.getRange(fila, 1, 1, titulos.length)
  r.setValues([titulos])
  r.setFontSize(10).setFontWeight('bold').setFontColor('#ffffff')
  r.setBackground(bg)
  r.setHorizontalAlignment('center').setVerticalAlignment('middle')
  r.setWrapStrategy(SpreadsheetApp.WrapStrategy.CLIP)
  if (alto) sh.setRowHeight(fila, alto)
  if (notas) {
    for (var i = 0; i < notas.length && i < titulos.length; i++) {
      _nota(sh.getRange(fila, 1 + i), notas[i])
    }
  }
  return r
}

// Tooltip: nota que aparece al pasar el mouse sobre la celda
function _nota(celda, texto) {
  try { celda.setNote(texto) } catch (e) { }
  return celda
}

// Colorea la pestaña (falla silenciosamente si no hay permisos de edición)
function _pintarPestana(nombre, color) {
  try { _ss().getSheetByName(nombre).setTabColor(color) } catch (e) { }
}

// Crea autofiltro en un bloque (si no existe ya)
function _autofiltro(sh, filaIni, filaFin, colFin) {
  try {
    if (!sh.getFilter()) {
      sh.getRange(filaIni, 1, Math.max(1, filaFin - filaIni + 1), colFin).createFilter()
    }
  } catch (e) { }
}

// Bordes completos de un bloque
function _bordes(sh, filaIni, filaFin, colFin) {
  sh.getRange(filaIni, 1, filaFin - filaIni + 1, colFin)
    .setBorder(true, true, true, true, true, true, C.borde, SpreadsheetApp.BorderStyle.SOLID)
}

// Anchos de columna: [[col, px], ...]
function _anchos(sh, pares) {
  for (var i = 0; i < pares.length; i++) sh.setColumnWidth(pares[i][0], pares[i][1])
}

// Texto de celda con opciones
function _txt(sh, fila, col, valor, opts) {
  opts = opts || {}
  var c = sh.getRange(fila, col)
  c.setValue(valor)
  if (opts.bold) c.setFontWeight('bold')
  if (opts.size) c.setFontSize(opts.size)
  if (opts.color) c.setFontColor(opts.color)
  if (opts.bg) c.setBackground(opts.bg)
  if (opts.wrap) c.setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP)
  if (opts.align) c.setHorizontalAlignment(opts.align)
  return c
}

// Validación numérica (entero >= 0)
function _valNum(sh, rango) {
  try {
    sh.getRange(rango).setDataValidation(
      SpreadsheetApp.newDataValidation()
        .requireNumberBetween(0, 99999)
        .setAllowInvalid(false)
        .setHelpText('Ingrese un número mayor o igual a 0')
        .build()
    )
  } catch (e) { Logger.log('Validación numérica omitida en ' + rango + ': ' + e) }
}

// Validación de vencimiento FLEXIBLE: acepta cualquier formato de fecha que el
// usuario quiera escribir (MM/AAAA, DD/MM/AAAA, MM-AAAA, AAAA-MM, fecha real…).
// Solo avisa si la celda queda VACÍA (no bloquea formatos válidos). El sistema
// normaliza internamente con _parseVto/_formatoVto, así que no se pierde nada.
function _valVto(sh, rango) {
  try {
    sh.getRange(rango).setDataValidation(
      SpreadsheetApp.newDataValidation()
        .setAllowInvalid(true)
        .setHelpText('Fecha de vencimiento: cualquier formato (MM/AAAA, DD/MM/AAAA, MM-AAAA…)')
        .build()
    )
  } catch (e) { Logger.log('Validación de vencimiento omitida en ' + rango + ': ' + e) }
}

// Dropdown de lista (o sugerencias si allowInvalid es true)
function _valLista(sh, rango, opciones, ayuda, estricto) {
  try {
    sh.getRange(rango).setDataValidation(
      SpreadsheetApp.newDataValidation()
        .requireValueInList(opciones, estricto !== true)
        .setAllowInvalid(estricto !== true)
        .setHelpText(ayuda || 'Elija una opción de la lista')
        .build()
    )
  } catch (e) { Logger.log('Dropdown omitido en ' + rango + ': ' + e) }
}

// ─── Fechas ──────────────────────────────────────────────────────────────────

function _hoy() { return new Date() }

// Día de la semana del modelo DIARIO: 0=Lunes..6=Domingo (0-based)
function _diaSemana(d) {
  return (d.getDay() + 6) % 7
}

function _fmt(d) {
  var dd = ('0' + d.getDate()).slice(-2)
  var mm = ('0' + (d.getMonth() + 1)).slice(-2)
  return dd + '/' + mm + '/' + d.getFullYear()
}

function _mesAno(d) {
  var mm = ('0' + (d.getMonth() + 1)).slice(-2)
  return mm + '/' + d.getFullYear()
}

function _hora(d) {
  return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2)
}

// Normaliza una fecha leída de una hoja a texto DD/MM/AAAA.
// Las celdas de fecha pueden guardar un valor Fecha real (Date) o texto; todos
// los lectores (Estadísticas, Tablero, PDFs) deben ver el mismo formato, si no
// los filtros "de 10 caracteres" descartan filas y los KPIs quedan en 0.
function _fechaTexto(v) {
  if (v instanceof Date && !isNaN(v.getTime())) {
    return ('0' + v.getDate()).slice(-2) + '/' + ('0' + (v.getMonth() + 1)).slice(-2) + '/' + v.getFullYear()
  }
  var s = String(v == null ? '' : v).trim()
  var p = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s)
  if (p) return ('0' + p[1]).slice(-2) + '/' + ('0' + p[2]).slice(-2) + '/' + p[3]
  var p2 = /^(\d{4})-(\d{2})-(\d{2})/.exec(s)  // tolera formato ISO (AAAA-MM-DD)
  if (p2) return p2[3] + '/' + p2[2] + '/' + p2[1]
  return ''   // vacío o no reconocible → se descarta como bandas/notas
}

// ─── Vencimientos ────────────────────────────────────────────────────────────

// Interpreta UN VENCIMIENTO en CUALQUIER formato razonable y devuelve su valor
// como Date del primer día del mes (o null si no se reconoce). Acepta:
//   MM/AAAA · MM-AAAA · MM.AAAA · MM/AA · MM-AA        → 08/2027, 08-27
//   DD/MM/AAAA · DD-MM-AAAA · DD/MM/AA · DD.MM.AAAA    → 15/08/2027
//   AAAA/MM · AAAA-MM (ISO)                            → 2027-08, 2027/08
//   Fecha real (Date)                                  → la que venga en la celda
// En todos los casos el MES se guarda en el índice 0 (8 = agosto) igual que la
// función _estadoVencimiento espera; para mostrar texto use _formatoVto().
function _parseVto(v) {
  if (v instanceof Date && !isNaN(v.getTime())) {
    return new Date(v.getFullYear(), v.getMonth(), 1)
  }
  var s = String(v == null ? '' : v).trim()
  if (s === '') return null
  // Cualquier separador: / - . espacio
  var nums = s.split(/[\/\-.\s]+/).filter(function (x) { return /^\d+$/.test(x) })
  if (nums.length < 2) return null

  var a = Number(nums[0])
  var b = Number(nums[1])
  var c = nums.length > 2 ? Number(nums[2]) : 0
  var mes, anio

  if (nums.length === 3) {
    // DD/MM/AAAA: primer número día, segundo mes, tercero año
    mes = b
    anio = c
  } else if (a >= 1000) {
    // AAAA/MM (ISO): primer número es el año
    mes = b
    anio = a
  } else if (b > 99) {
    // MM / AAAA: el segundo número (4 dígitos) es el año
    mes = a
    anio = b
  } else {
    // MM / AA: año corto 2 dígitos (24 = 2024)
    mes = a
    anio = (b < 50 ? 2000 : 1900) + b
  }

  if (isNaN(mes) || isNaN(anio)) return null
  if (mes < 1 || mes > 12) return null
  if (anio < 1900 || anio > 2200) return null
  return new Date(anio, mes - 1, 1)
}

// Texto normalizado 'MM/AAAA' a partir de cualquier formato (para mostrar y para
// los lectores que necesitan comparar strings). Devuelve '' si no es válido.
function _formatoVto(v) {
  var d = _parseVto(v)
  if (!d) return ''
  var mm = ('0' + (d.getMonth() + 1)).slice(-2)
  return mm + '/' + d.getFullYear()
}

// Validador booleano: ¿el texto/valor es un vencimiento reconocible?
function _esVto(v) {
  if (v instanceof Date && !isNaN(v.getTime())) return true
  var s = String(v == null ? '' : v).trim()
  if (s === '') return false
  return /^\d{1,2}[\/\-.\s]\d{2,4}$/.test(s) || /^\d{1,2}[\/\-.\s]\d{1,2}[\/\-.\s]\d{2,4}$/.test(s) || /^\d{4}[\/\-.\s]\d{1,2}$/.test(s)
}

// Clasifica un vencimiento (primer día del mes, vtoMes) respecto a hoy:
// 'VENCIDO' · 'POR VENCER' (dentro de la anticipación configurada, incluye el
// mes en curso) · 'PRÓXIMO'. Única fuente de verdad usada por REVISIONES,
// TABLERO y las alertas del registro para que todos indiquen lo mismo.
function _estadoVencimiento(vtoMes, hoy, anticipa) {
  if (isNaN(anticipa)) anticipa = 1
  anticipa = Math.max(0, Math.min(24, Math.round(anticipa)))
  var iniMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
  var limite = new Date(hoy.getFullYear(), hoy.getMonth() + anticipa, 1)
  if (vtoMes < iniMes) return 'VENCIDO'
  if (vtoMes <= limite) return 'POR VENCER'
  return 'PRÓXIMO'
}

// ─── Semanas ─────────────────────────────────────────────────────────────────

// N° de semana del año (semana 1 = la que contiene el 1 de enero, lunes inicio)
function _semanaDelAnio(d) {
  var f = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  var lunes = _lunesDe(f)
  var inicio = new Date(f.getFullYear(), 0, 1)
  inicio = _lunesDe(inicio)
  var dias = Math.round((lunes - inicio) / 86400000)
  return Math.floor(dias / 7) + 1
}

// Lunes de la semana que contiene a d
function _lunesDe(d) {
  var f = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  var baja = (f.getDay() + 6) % 7
  f.setDate(f.getDate() - baja)
  return f
}

// Domingo (lunes + 6 días)
function _domingoDe(d) {
  var l = _lunesDe(d)
  l.setDate(l.getDate() + 6)
  return l
}

// Clave de semana: "S25/2026" (se guarda en la columna B del registro)
function _semKey(d) {
  return 'S' + _semanaDelAnio(d) + '/' + d.getFullYear()
}

// Lunes de la semana indicada por una clave "S25/2026" (devuelve Date)
function _lunesDeSemana(key) {
  var p = /^S(\d+)\/(\d{4})$/.exec(key)
  if (!p) return null
  var lunes = new Date(Number(p[2]), 0, 1)
  lunes = _lunesDe(lunes)
  lunes.setDate(lunes.getDate() + (Number(p[1]) - 1) * 7)
  return lunes
}

// Rango legible de una clave: "15/06/2026 al 21/06/2026"
function _semRango(key) {
  var lunes = _lunesDeSemana(key)
  if (!lunes) return key
  return _fmt(lunes) + ' al ' + _fmt(_domingoDe(lunes))
}

// Rango corto para bandas: "15/06 → 21/06/2026"
function _semRangoCorto(key) {
  var lunes = _lunesDeSemana(key)
  if (!lunes) return key
  var dd = function (d) { return ('0' + d.getDate()).slice(-2) + '/' + ('0' + (d.getMonth() + 1)).slice(-2) }
  return dd(lunes) + ' → ' + dd(_domingoDe(lunes)) + '/' + lunes.getFullYear()
}

// ─── Lectura de datos ────────────────────────────────────────────────────────

// Última fila REAL de datos a partir de `desde` (ignora notas/celdas sueltas)
function _ultimaFilaDatos(sh, colClave, desde) {
  desde = desde || 4
  var n = sh.getLastRow()
  if (n < desde) return desde
  var vals = sh.getRange(desde, colClave, n - desde + 1, 1).getValues()
  for (var i = vals.length - 1; i >= 0; i--) {
    if (String(vals[i][0] || '').trim() !== '') return desde + i
  }
  return desde
}

// Fármacos del maestro → [{ num, isp, med, forma, base, min, obs }]
function _leerFarmacos() {
  var sh = _ss().getSheetByName(HOJA.farmacos)
  var out = []
  if (!sh) return out
  var ultima = _ultimaFilaDatos(sh, FARM.med)
  if (ultima < 4) return out
  var vals = sh.getRange(4, 1, ultima - 3, 7).getValues()
  for (var i = 0; i < vals.length; i++) {
    if (!String(vals[i][FARM.med - 1] || '').trim()) continue
    out.push({
      num: i + 1,
      isp: vals[i][FARM.isp - 1],
      med: String(vals[i][FARM.med - 1]).trim(),
      forma: vals[i][FARM.forma - 1],
      base: vals[i][FARM.base - 1],
      min: vals[i][FARM.min - 1],
      obs: vals[i][FARM.obs - 1]
    })
  }
  return out
}

// Insumos del maestro → [{ num, nom, base, min, vto, obs }]
function _leerInsumos() {
  var sh = _ss().getSheetByName(HOJA.insumos)
  var out = []
  if (!sh) return out
  var ultima = _ultimaFilaDatos(sh, INSU.nom)
  if (ultima < 4) return out
  var vals = sh.getRange(4, 1, ultima - 3, 6).getValues()
  for (var i = 0; i < vals.length; i++) {
    if (!String(vals[i][INSU.nom - 1] || '').trim()) continue
    out.push({
      num: i + 1,
      nom: String(vals[i][INSU.nom - 1]).trim(),
      base: vals[i][INSU.base - 1],
      min: vals[i][INSU.min - 1],
      vto: _formatoVto(vals[i][INSU.vto - 1]),
      obs: vals[i][INSU.obs - 1]
    })
  }
  return out
}

// Quita tildes y pasa a minúsculas para comparar "lidocaína" = "lidocaina"
function _normalizar(s) {
  return String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

// ─── Protección con aviso (warning-only) ─────────────────────────────────────
// Bloquea con un aviso (no con permiso) las celdas que el script calcula solo:
// el usuario puede editarlas si insiste, pero Google le avisa antes de romper
// un valor automático. Los scripts siguen pudiendo escribir siempre.
function _protegerColumnasAutomaticas() {
  var ss = _ss()

  try {
    var prev = ss.getProtections(SpreadsheetApp.ProtectionType.RANGE)
    for (var i = 0; i < prev.length; i++) { try { prev[i].remove() } catch (e) { } }
    var prevS = ss.getProtections(SpreadsheetApp.ProtectionType.SHEET)
    for (var j = 0; j < prevS.length; j++) { try { prevS[j].remove() } catch (e) { } }
  } catch (e) { }

  function prot(sh, a1, desc) {
    try {
      var p = sh.getRange(a1).protect()
      p.setDescription(desc)
      p.setWarningOnly(true)
    } catch (e) { }
  }

  // Protege UN RANGO numérico (colIni..colFin, filaIni..filaFin) con aviso.
  // Permite dejar libre la fila del buscador (fila 2) de REVISIONES, que queda
  // dentro de la columna G que antes se protegía completa.
  function protRango(sh, colIni, colFin, filaIni, filaFin, desc) {
    try {
      if (filaFin < filaIni) return
      var p = sh.getRange(filaIni, colIni, filaFin - filaIni + 1, colFin - colIni + 1).protect()
      p.setDescription(desc)
      p.setWarningOnly(true)
    } catch (e) { }
  }

  var shR = ss.getSheetByName(HOJA.revisiones)
  if (shR) {
    // La fila 2 (fila del buscador) NO se protege para que todos puedan filtrar.
    var filaFinR = shR.getMaxRows()
    protRango(shR, 1, 7, 3, filaFinR, 'Columnas automáticas del registro (fecha, semana, ítem, stock y vencimiento)')
    protRango(shR, 15, 15, 3, filaFinR, 'Alerta: se calcula sola con la última cantidad escrita del día')
    protRango(shR, 17, 17, 3, filaFinR, 'Hora: se registra automáticamente')
  }
  var shF = ss.getSheetByName(HOJA.farmacos)
  if (shF) prot(shF, 'A:A', 'N° correlativo automático')
  var shI = ss.getSheetByName(HOJA.insumos)
  if (shI) prot(shI, 'A:A', 'N° correlativo automático')
  var shC = ss.getSheetByName(HOJA.config)
  if (shC) prot(shC, 'A:A', 'Nombre del parámetro: edite solo el valor (columna amarilla)')

  var shE = ss.getSheetByName(HOJA.estadisticas)
  if (shE) {
    try {
      var pE = shE.protect()
      pE.setDescription('Hoja generada por el sistema (solo lectura); celdas B4:B5 de control editables')
      pE.setWarningOnly(true)
      pE.setUnprotectedRanges([shE.getRange('B4:B5')])
    } catch (e) { }
  }

  var protegidas = [HOJA.semana, HOJA.impresion, HOJA.tablero, HOJA.bitacora]
  for (var k = 0; k < protegidas.length; k++) {
    var shX = ss.getSheetByName(protegidas[k])
    if (!shX) continue
    try {
      var p = shX.protect()
      p.setDescription('Hoja generada por el sistema (solo lectura recomendada)')
      p.setWarningOnly(true)
    } catch (e) { }
  }
}

// ─── Bitácora segura ─────────────────────────────────────────────────────────
// Registra un evento en la BITÁCORA SIN interrumpir nunca el flujo, aunque el
// archivo 12_Bitacora.gs no esté cargado en el proyecto (falla silenciosa).
function _logEvento(tipo, detalle) {
  try { _registrarEvento(tipo, detalle) } catch (e) { }
}
