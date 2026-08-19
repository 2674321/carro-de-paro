// ─────────────────────────────────────────────────────────────────────────────
//  04_REVISIONES — registro DIARIO de cantidades (fármacos e insumos)
//  Cada ítem tiene UNA fila por semana con 7 columnas de cantidad diaria
//  (Lun..Dom, columnas H..N). El usuario escribe SOLO esas columnas; la hora,
//  el estado (Alerta) y la banda de progreso los calcula el script (sin
//  fórmulas → sin #ERROR! por separadores regionales).
//  Stock base (E): cantidad con que empezó el carro esta semana. Al crear la
//  semana se copia desde el Día 7 de la semana anterior (o del maestro si es
//  la primera). Utilidades: avance automático, progreso en banda, panel de
//  alertas, "marcar semana completa" y creación de semanas específicas.
// ─────────────────────────────────────────────────────────────────────────────

function formatearRevisiones() {
  var sh = _hoja(HOJA.revisiones, HOJA_ORDEN.revisiones)
  var cols = 17
  sh.getDataRange().clearFormat()
  _descombinar(sh)
  _pintarPestana(HOJA.revisiones, C.tabRevisiones)

  _tituloPagina(sh, 1, cols, 'REGISTRO DIARIO DE REVISIONES — FÁRMACOS E INSUMOS', C.primario, 30)

  // Fila 2: semana actual + buscador + panel de alertas (paneles con borde).
  // El buscador es un filtro en vivo: al escribir solo quedan visibles las
  // filas que coinciden; borrar el texto devuelve la lista completa.
  _txt(sh, 2, 1, 'Semana actual:', { bold: true, size: 10 })
  _panelInfo(sh, 2, 2, 4, '', C.panelInfo, C.primario)
  _nota(sh.getRange(2, 2, 1, 4), 'Semana que se está revisando ahora. Su bloque aparece con banda AZUL y la etiqueta "HOY" en el registro.')
  _txt(sh, 2, 6, 'Buscar:', { bold: true, size: 10, color: C.gris })
  _panelInfo(sh, 2, 7, 4, '', '#FEF9E7', C.aviso)
  _nota(sh.getRange(2, 7, 1, 4), 'Escriba parte del nombre: se ocultan temporalmente las filas que NO coinciden (solo quedan las encontradas). Borre el texto para ver todo de nuevo.')
  sh.getRange(2, 7, 1, 4).setBorder(true, true, true, true, true, true, C.aviso, SpreadsheetApp.BorderStyle.SOLID)
  _panelInfo(sh, 2, 11, 4, '', C.panelNeutro, C.gris)
  sh.getRange(2, 2, 1, 13).setVerticalAlignment('middle')

  _filaInfo(sh, 3, cols, 'REVISIÓN DIARIA: use el Menú → "Nueva revisión semanal" (una vez por semana) y anote cada día la cantidad en la columna del día (Lun..Dom). Banda AZUL = semana actual (HOY), VERDE = anteriores; al pie del bloque se indica cuántos ítems van revisados hoy.')

  // Fila 4: etiqueta de grupo sobre las 7 columnas de cantidad diaria (H..N)
  var rDias = sh.getRange(4, REV.dia1, 1, 7).merge()
  rDias.setValue('DÍAS DE LA SEMANA — CANTIDAD DIARIA (LU..DOM)')
  rDias.setFontSize(9).setFontWeight('bold').setFontColor('#ffffff').setBackground(C.semAct)
  rDias.setHorizontalAlignment('center').setVerticalAlignment('middle')
  sh.setRowHeight(4, 18)
  sh.getRange(4, 1, 1, REV.dia1 - 1).setBackground(C.panelNeutro)
  sh.getRange(4, REV.alerta, 1, 17 - REV.alerta + 1).setBackground(C.panelNeutro)

  _cabecera(sh, REV_FILA_CAB, REV_TITULOS, C.primario, 26, REV_NOTAS)

  var ultima = _ultimaFilaDatos(sh, REV.item, REV_FILA_DATOS)

  // Recalcular alertas de todo el bloque (idempotente, 1 lectura + 1 escritura)
  _calcularUsoAlertaBloque(sh, REV_FILA_DATOS, ultima)

  _repintarBandasSemana(sh, ultima)
  _bordes(sh, REV_FILA_CAB, Math.max(ultima, REV_FILA_DATOS), cols)
  var nFilas = Math.max(1, ultima - REV_FILA_DATOS + 1)
  sh.getRange(REV_FILA_DATOS, REV.alerta, nFilas, 1).setFontWeight('bold')
  sh.getRange(REV_FILA_DATOS, REV.dia1, nFilas, 7).setBackground(C.cant)

  _resaltarColumnaHoy(sh, ultima)

  _validarDiasRevisiones(sh, ultima)
  _condAlerta(sh, Math.max(ultima, REV_FILA_DATOS))
  _anchos(sh, REV_ANCHOS)
  sh.setFrozenRows(REV_FILA_CAB)
  _actualizarPanel(sh)
  _normalizarFechasRegistro(sh, Math.max(ultima, REV_FILA_DATOS))
}

// Convierte la columna Fecha (A) del registro a texto DD/MM/AAAA SIEMPRE y
// REPARA filas sin fecha válida:
//  · semanas creadas por versiones anteriores pueden tener la celda A como
//    "Fecha" real (Date): el texto "DD/MM/AAAA" se descarta en los lectores
//    que buscan 10 caracteres y Estadísticas queda en 0;
//  · celdas vacías o con un valor no reconocible (número, texto raro) heredan
//    la fecha del bloque de la semana (o el lunes de la semana si es la
//    primera fila del bloque), así el control de calidad deja de marcar
//    "fecha mal registrada".
function _normalizarFechasRegistro(sh, hastaFila) {
  if (!sh || sh.getSheetName() !== HOJA.revisiones) return
  var fin = Math.max(hastaFila, REV_FILA_DATOS)
  if (fin < REV_FILA_DATOS) return
  var n = fin - REV_FILA_DATOS + 1
  var rangoF = sh.getRange(REV_FILA_DATOS, REV.fecha, n, 1)
  rangoF.setNumberFormat('@')   // texto: las fechas ya escritas no se autoconvierten
  var vals = rangoF.getValues()
  var sems = sh.getRange(REV_FILA_DATOS, REV.semana, n, 1).getValues()
  var cambio = false
  var fechaBloque = ''          // primera fecha válida del bloque actual
  for (var i = 0; i < n; i++) {
    var s = String(sems[i][0] || '').trim()
    if (s.indexOf('SEMANA N°') === 0) { fechaBloque = ''; continue }  // banda: cambia de semana
    var t = _fechaTexto(vals[i][0])
    if (t) {
      fechaBloque = t
      if (String(vals[i][0] || '').trim() !== t) { vals[i][0] = t; cambio = true }
    } else if (s) {
      var reparada = fechaBloque
      if (!reparada) {
        var lunes = _lunesDeSemana(s)
        if (lunes) reparada = _fmt(lunes)
      }
      if (reparada) { vals[i][0] = reparada; cambio = true }
    }
  }
  if (cambio) rangoF.setValues(vals)
}

// Valida las 7 columnas de cantidad diaria (H..N) SOLO en las filas de datos,
// en bloques separados por las filas banda. Las bandas están combinadas de
// A a Q y aplicarles una validación lanza "el argumento de la regla de
// validación de datos no es válido" (por eso no se hace sobre H6:N… entero).
function _validarDiasRevisiones(sh, ultima) {
  var fin = Math.max(ultima, REV_FILA_DATOS)
  if (fin < REV_FILA_DATOS) return
  var n = fin - REV_FILA_DATOS + 1
  var colB = sh.getRange(REV_FILA_DATOS, REV.semana, n, 1).getValues()
  var iniRun = -1
  for (var i = 0; i < n; i++) {
    var esBanda = String(colB[i][0] || '').indexOf('SEMANA N°') === 0
    if (esBanda) {
      if (iniRun >= 0) { _valNum(sh, 'H' + iniRun + ':N' + (REV_FILA_DATOS + i - 1)); iniRun = -1 }
    } else if (iniRun < 0) {
      iniRun = REV_FILA_DATOS + i
    }
  }
  if (iniRun >= 0) _valNum(sh, 'H' + iniRun + ':N' + (REV_FILA_DATOS + n - 1))
}

// Formato condicional: Alerta (O)
function _condAlerta(sh, ultima) {
  var fin = Math.max(ultima, REV_FILA_DATOS)
  var rangoO = sh.getRange('O' + REV_FILA_DATOS + ':O' + fin)
  var rules = []

  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo('REPONER').setBackground('#FADBD8').setFontColor(C.alerta).setBold(true)
    .setRanges([rangoO]).build())
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo('VENCIDO').setBackground('#FADBD8').setFontColor(C.alerta).setBold(true)
    .setRanges([rangoO]).build())
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo('POR VENCER').setBackground('#FDEBD0').setFontColor(C.aviso).setBold(true)
    .setRanges([rangoO]).build())
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo('OK').setBackground('#D5F5E3').setFontColor(C.ok)
    .setRanges([rangoO]).build())

  sh.setConditionalFormatRules(rules)
}

// ─── Bandas separadoras de semana + zebra alternada + PROGRESO ───────────────
// Las filas banda llevan "SEMANA N°..." en la columna B (el parser de datos
// las ignora porque su columna de Ítem está vacía).
// Banda AZUL = semana actual · VERDE = anteriores · "✔ 10/28" = progreso.
// Optimizada: 3 lecturas en bloque y una llamada de formato por semana.
function _repintarBandasSemana(sh, hastaFila) {
  if (hastaFila < REV_FILA_DATOS) return
  var n = hastaFila - REV_FILA_DATOS + 1
  var colsB = sh.getRange(REV_FILA_DATOS, REV.semana, n, 1).getValues()
  var colsD = sh.getRange(REV_FILA_DATOS, REV.item, n, 1).getValues()
  var colsH = sh.getRange(REV_FILA_DATOS, REV.dia1, n, 7).getValues()
  var rangoActual = '— ' + _semRangoCorto(_semKey(_hoy()))
  var diaHoy = _diaSemana(_hoy())            // 0=Lun .. 6=Dom → posición en colsH

  var idxSem = 0
  var i = 0
  while (i < n) {
    var b = String(colsB[i][0] || '')
    if (b.indexOf('SEMANA N°') === 0) {
      idxSem++
      // Progreso del bloque de datos que sigue a esta banda
      var hechos = 0, total = 0, j = i + 1
      while (j < n && String(colsB[j][0] || '').indexOf('SEMANA N°') !== 0) {
        if (String(colsD[j][0] || '').trim() !== '') {
          total++
          if (_filaDiaTexto(colsH[j], diaHoy, b, rangoActual)) hechos++
        }
        j++
      }
      var base = b.replace(/ {2}· +completadas \d+\/\d+$/, '').replace(/ {2}· +HOY$/, '')
      // Normaliza bandas viejas (rango largo o con "✔ n/m") al formato corto
      var pB = /^SEMANA N° (\d+) — (\d{2})\/(\d{2})\/(\d{4}) al (\d{2})\/(\d{2})\/(\d{4})$/.exec(base)
      if (pB) base = 'SEMANA N° ' + pB[1] + ' — ' + _semRangoCorto('S' + pB[1] + '/' + pB[4])
      var esActual = base.indexOf(rangoActual) > 0
      var texto = base + (esActual ? '  ·  HOY' : '') + (total > 0 ? '  ·  completadas ' + hechos + '/' + total : '')
      var banda = sh.getRange(REV_FILA_DATOS + i, 1, 1, 17)
      if (b !== texto) banda.setValue(texto)
      banda.merge()
      // Color: AZUL = semana actual · VERDES alternos = anteriores (más color)
      var colorBanda = esActual ? C.semAct : (idxSem % 2 === 0 ? C.semPas : C.semAlt)
      banda.setBackground(colorBanda).setFontColor('#ffffff').setFontWeight('bold').setFontSize(10)
      banda.setHorizontalAlignment('left').setVerticalAlignment('middle')
      sh.setRowHeight(REV_FILA_DATOS + i, 20)

      // Fondo del bloque de datos (zebra alterna por semana) en una sola llamada
      if (total > 0) {
        var bg = (idxSem % 2 === 1) ? C.zebra : C.zebraAlt
        var filaBloque = REV_FILA_DATOS + i + 1
        sh.getRange(filaBloque, 1, j - i - 1, 17).setBackground(bg)
        _grisesRegistro(sh, filaBloque, filaBloque + (j - i - 1) - 1)
      }
      i = j
    } else {
      i++
    }
  }
  sh.getRange(REV_FILA_DATOS, REV.dia1, Math.max(1, n), 7).setBackground(C.cant)
}

// Resalta la columna del día de HOY: en la cabecera marca la celda del día
// actual y en cada bloque de datos pinta la columna en amarillo intenso
// (saltando las filas banda, que están combinadas A:Q y no aceptan color
// parcial). Así el usuario sabe siempre en qué columna escribir hoy.
function _resaltarColumnaHoy(sh, hastaFila) {
  var dia = _diaSemana(_hoy())
  var col = REV.dia1 + dia
  try {
    var celdaCab = sh.getRange(REV_FILA_CAB, col)
    celdaCab.setBackground(C.semAct)
    celdaCab.setValue(REV_ABREV_DIAS[dia] + ' · HOY')
    celdaCab.setNote('Columna de HOY: escriba aquí la cantidad de hoy (' + REV_NOMBRES_DIAS[dia] + ').')
  } catch (e) { }

  var fin = Math.max(hastaFila, REV_FILA_DATOS)
  if (fin < REV_FILA_DATOS) return
  var n = fin - REV_FILA_DATOS + 1
  var colB = sh.getRange(REV_FILA_DATOS, REV.semana, n, 1).getValues()
  var iniRun = -1
  for (var i = 0; i < n; i++) {
    var esBanda = String(colB[i][0] || '').indexOf('SEMANA N°') === 0
    if (esBanda) {
      if (iniRun >= 0) { _pintarHoyBloque(sh, iniRun, REV_FILA_DATOS + i - 1, col); iniRun = -1 }
    } else if (iniRun < 0) {
      iniRun = REV_FILA_DATOS + i
    }
  }
  if (iniRun >= 0) _pintarHoyBloque(sh, iniRun, REV_FILA_DATOS + n - 1, col)
}

function _pintarHoyBloque(sh, ini, fin, col) {
  try { sh.getRange(ini, col, fin - ini + 1, 1).setBackground(C.hoyDia) } catch (e) { }
}

// ¿La fila de un ítem cuenta como revisada hoy para el progreso de la banda?
// Semana HOY (su texto incluye el rango actual) → cantidad en el día de hoy.
// Semanas cerradas → cantidad en el Día 7 (Dom, posición 6 del array).
function _filaDiaTexto(colsH, diaHoy, textoBanda, rangoActual) {
  var pos = (textoBanda.indexOf(rangoActual) > 0) ? diaHoy : 6
  var v = colsH[pos]
  return v !== '' && v !== null && v !== undefined
}

// Fondo gris "no editar" en columnas automáticas (A, B, O, Q) y amarillo en
// las 7 columnas de cantidad diaria (H..N, lo único editable)
function _grisesRegistro(sh, ini, fin) {
  if (fin < ini) return
  var span = fin - ini + 1
  sh.getRange(ini, REV.fecha, span, 2).setBackground(C.grisFondo).setFontColor(C.gris).setFontStyle('italic')
  sh.getRange(ini, REV.alerta, span, 1).setBackground(C.grisFondo)
  sh.getRange(ini, REV.hora, span, 1).setBackground(C.grisFondo)
  sh.getRange(ini, REV.dia1, span, 7).setBackground(C.cant)
}

// ─── Panel superior: semana actual + resumen de alertas ──────────────────────
// Solo actualiza VALORES y COLORES (los estilos fijos los deja formatearRevisiones).
function _actualizarPanel(sh, ultimaReg) {
  var hoy = _hoy()
  var key = _semKey(hoy)
  var celdaSem = sh.getRange(2, 2, 1, 4)
  celdaSem.setValue('Semana N° ' + _semanaDelAnio(hoy) + ' de ' + hoy.getFullYear() + '  ·  ' + _semRango(key))

  var res = _resumenAlertas(sh, key, ultimaReg)
  var celda = sh.getRange(2, 11, 1, 4)
  celda.setValue(res.texto)
  if (res.tipo === 'alerta') { celda.setBackground(C.panelAlerta).setFontColor(C.alerta) }
  else if (res.tipo === 'aviso') { celda.setBackground(C.panelAviso).setFontColor(C.aviso) }
  else if (res.tipo === 'ok') { celda.setBackground(C.panelOk).setFontColor(C.ok) }
  else { celda.setBackground(C.panelNeutro).setFontColor(C.gris) }

  // Semáforo de la pestaña: el color de la solapa REVISIONES refleja el estado
  var colorTab = res.tipo === 'alerta' ? C.alerta : (res.tipo === 'aviso' ? C.aviso : (res.tipo === 'ok' ? C.ok : C.tabRevisiones))
  try { sh.setTabColor(colorTab) } catch (e) { }
}

// Cuenta alertas de la semana indicada: { texto, tipo }
// Optimizado: se lee SOLO la columna B (1 lectura) para ubicar los bloques; si
// el último bloque contiene la semana pedida (caso usual: la semana activa es
// la más reciente), se lee únicamente su tramo B..O en vez de todas las semanas.
function _resumenAlertas(sh, key, ultimaReg) {
  var ultima = ultimaReg || _ultimaFilaDatos(sh, REV.item, REV_FILA_DATOS)
  if (ultima < REV_FILA_DATOS) return { texto: 'Sin revisiones aún', tipo: '' }
  var n = ultima - REV_FILA_DATOS + 1
  var colSem = sh.getRange(REV_FILA_DATOS, REV.semana, n, 1).getValues()
  var bandas = []
  for (var b2 = 0; b2 < n; b2++) {
    if (String(colSem[b2][0] || '').indexOf('SEMANA N°') === 0) bandas.push(b2)
  }
  // Último bloque (normalmente la semana en curso). Como ya leímos la columna
  // B, verificamos si la clave está en él; si no (semana fuera de orden en el
  // futuro), caemos al recorrido completo del historial (comportamiento previo).
  var ini = REV_FILA_DATOS
  var enUltimo = bandas.length > 0
  if (enUltimo) {
    var iniB = bandas[bandas.length - 1] + 1
    enUltimo = false
    for (var v2 = iniB; v2 < n; v2++) {
      if (String(colSem[v2][0]).trim() === key) { enUltimo = true; break }
    }
    if (enUltimo) ini = REV_FILA_DATOS + iniB
  }
  var vals = sh.getRange(ini, REV.semana, ultima - ini + 1, 14).getValues()  // B..O

  var reponer = 0, vencido = 0, porVencer = 0, hechos = 0, total = 0
  for (var i = 0; i < vals.length; i++) {
    if (String(vals[i][0]).trim() !== key) continue
    var a = String(vals[i][12] || '').trim()   // O = col 15 → índice 12 de B..O
    if (a === 'REPONER') reponer++
    else if (a === 'VENCIDO') vencido++
    else if (a === 'POR VENCER') porVencer++
    if (a !== '') { hechos++; total++ }
  }
  var partes = []
  if (reponer) partes.push(reponer + ' reponer')
  if (vencido) partes.push(vencido + ' vencido')
  if (porVencer) partes.push(porVencer + ' por vencer')
  if (partes.length) return { texto: 'Resumen semana actual: ' + partes.join(' · '), tipo: vencido || reponer ? 'alerta' : 'aviso' }
  if (hechos === 0) return { texto: 'Semana actual sin cantidades aún', tipo: '' }
  return { texto: 'Resumen semana actual: sin alertas', tipo: 'ok' }
}

// ─── Copiar cantidades de la semana anterior ─────────────────────────────────
// Punto de partida: la mayoría de las cantidades no cambian de semana a semana.
// Copia los 7 días (Lun..Dom) de cada ítem en los días que estén vacíos.
function copiarSemanaAnterior() {
  var ui = _ui()
  if (!ui) return
  var sh = _hoja(HOJA.revisiones, HOJA_ORDEN.revisiones)
  var hoy = _hoy()
  var keyAct = _semKey(hoy)
  var num = _semanaDelAnio(hoy)
  var lunesPrev = _lunesDe(hoy)
  lunesPrev.setDate(lunesPrev.getDate() - 7)
  var keyPrev = _semKey(lunesPrev)

  var ultima = _ultimaFilaDatos(sh, REV.item, REV_FILA_DATOS)
  if (ultima < REV_FILA_DATOS) {
    _alerta(ui, 'Sin datos', 'Cree primero la revisión de la semana con "Nueva revisión semanal".')
    return
  }

  var n = ultima - REV_FILA_DATOS + 1
  var vals = sh.getRange(REV_FILA_DATOS, 1, n, 17).getValues()
  var prev = {}      // 'SECCIÓN|ítem' → [d1..d7] de la semana anterior
  var pend = []      // índices de filas de la semana actual con días vacíos
  for (var i = 0; i < n; i++) {
    var sem = String(vals[i][REV.semana - 1]).trim()
    var item = String(vals[i][REV.item - 1]).trim()
    if (!item) continue
    if (sem === keyPrev) {
      var clave = (String(vals[i][REV.seccion - 1]).trim() || '') + '|' + item
      var dias = []
      var hay = false
      for (var d = 0; d < 7; d++) {
        var dv = vals[i][REV.dia1 - 1 + d]
        dias.push(dv)
        if (dv !== '' && dv !== null && dv !== undefined) hay = true
      }
      if (hay) prev[clave] = dias
    } else if (sem === keyAct) {
      var vacio = false
      for (var d2 = 0; d2 < 7; d2++) {
        var v2 = vals[i][REV.dia1 - 1 + d2]
        if (v2 === '' || v2 === null || v2 === undefined) { vacio = true; break }
      }
      if (vacio) pend.push(i)
    }
  }

  if (Object.keys(prev).length === 0) {
    _mostrarAviso('Sin datos previos', 'La semana anterior (' + keyPrev + ') no tiene cantidades registradas.', ['Registre primero la semana anterior.'])
    return
  }

  var copiados = 0
  var hora = _hora(hoy)
  for (var k = 0; k < pend.length; k++) {
    var idx = pend[k]
    var sec = String(vals[idx][REV.seccion - 1]).trim()
    var itm = String(vals[idx][REV.item - 1]).trim()
    if ((sec + '|' + itm) in prev) {
      for (var d3 = 0; d3 < 7; d3++) {
        if (vals[idx][REV.dia1 - 1 + d3] === '' || vals[idx][REV.dia1 - 1 + d3] === null || vals[idx][REV.dia1 - 1 + d3] === undefined) {
          vals[idx][REV.dia1 - 1 + d3] = prev[sec + '|' + itm][d3]
          if (prev[sec + '|' + itm][d3] !== '' && prev[sec + '|' + itm][d3] !== null && prev[sec + '|' + itm][d3] !== undefined) copiados++
        }
      }
      vals[idx][REV.hora - 1] = hora
    }
  }
  if (copiados === 0) {
    _mostrarAviso('Nada que copiar', 'Los ítems de la semana N° ' + num + ' ya tienen cantidades o no coinciden con la semana anterior.', ['Use "✔️ Completar semana completa" (menú principal) para llenar con el stock base.'])
    return
  }

  if (!_confirmar(ui, '📋 Copiar semana anterior',
    'Se copiarán ' + copiados + ' cantidad(es) diaria(s) desde la semana ' + keyPrev + ' a la SEMANA N° ' + num + '.\n\nDespués ajuste solo los que cambiaron.')) return

  sh.getRange(REV_FILA_DATOS, 1, n, 17).setValues(vals)
  _calcularUsoAlertaBloque(sh, REV_FILA_DATOS, ultima)
  _repintarBandasSemana(sh, ultima)
  _resaltarColumnaHoy(sh, ultima)
  _actualizarPanel(sh)
  sh.activate()
  _logEvento('REVISIÓN', 'Semana ' + keyAct + ': copiadas ' + copiados + ' cantidades desde ' + keyPrev)
  _toast(copiados + ' cantidades copiadas desde la semana anterior.', '📋 ' + SIS.nombre)
}

// ─── NUEVA REVISIÓN SEMANAL ──────────────────────────────────────────────────
function nuevaRevisionSemanal() {
  _crearRevisionSemana(_semanaDelAnio(_hoy()))
}

// Crea la revisión de una semana específica (feriados, atrasos)
function nuevaRevisionSemanaEspecifica() {
  var ui = _ui()
  if (!ui) return
  var num = _pregunta(ui, '📅 Crear revisión de otra semana',
    'Escriba el N° de semana del año ' + _hoy().getFullYear() + ' que quiere crear (ej. 30).\n\nÚtil cuando el día de revisión cayó en feriado o hubo atraso.')
  if (num === null) return
  num = String(num)
  if (!/^\d+$/.test(num) || Number(num) < 1 || Number(num) > 54) {
    _mostrarAviso('N° inválido', 'Escriba un número de semana entre 1 y 54.', ['Ejemplo: 30'])
    return
  }
  _crearRevisionSemana(Number(num))
}

// Núcleo de creación: si la semana ya existe va a ella; si no, crea el bloque.
// Stock base (E) = cantidad con que el carro empezó la semana: el Día 7 de la
// semana anterior si existe para ese ítem; si no, el stock base del maestro.
function _crearRevisionSemana(num) {
  var sh = _hoja(HOJA.revisiones, HOJA_ORDEN.revisiones)
  var anio = _hoy().getFullYear()
  var key = 'S' + num + '/' + anio
  var rango = _semRango(key)
  var ultima = _ultimaFilaDatos(sh, REV.item, REV_FILA_DATOS)

  // ¿Ya existe la semana?
  if (ultima >= REV_FILA_DATOS) {
    var sem = sh.getRange(REV_FILA_DATOS, REV.semana, ultima - REV_FILA_DATOS + 1, 1).getValues()
    for (var i = 0; i < sem.length; i++) {
      if (String(sem[i][0]).trim() === key) {
        _repintarBandasSemana(sh, _ultimaFilaDatos(sh, REV.item, REV_FILA_DATOS))
        _actualizarPanel(sh)
        sh.activate()
        _ss().setActiveRange(sh.getRange(REV_FILA_DATOS + i, REV.dia1 + _diaSemana(_hoy())))
        _toast('Ya existe la revisión de la SEMANA N° ' + num + ' — complete las cantidades de hoy.', '📅 ' + SIS.nombre)
        return
      }
    }
  }

  // Stock base de la semana anterior (Día 7) por ítem, si existe
  var basesPrev = _basesSemanaAnterior(sh, key, ultima)

  // Armar filas: primero fármacos, luego insumos
  var filas = []
  var farmacos = _leerFarmacos()
  var insumos = _leerInsumos()
  for (var f = 0; f < farmacos.length; f++) {
    filas.push(_filaRevision(_hoy(), key, 'FÁRMACOS', farmacos[f].med, basesPrev, farmacos[f].base, farmacos[f].min, ''))
  }
  for (var j = 0; j < insumos.length; j++) {
    filas.push(_filaRevision(_hoy(), key, 'INSUMOS', insumos[j].nom, basesPrev, insumos[j].base, insumos[j].min, insumos[j].vto))
  }

  if (filas.length === 0) {
    var ui = _ui()
    try {
      if (ui) ui.alert('Sin ítems', 'Los maestros FÁRMACOS e INSUMOS están vacíos. Cárguelos antes de crear una revisión.', ui.ButtonSet.OK)
    } catch (e) {
      _toast('Los maestros FÁRMACOS e INSUMOS están vacíos — cárguelos primero.', '⚠ ' + SIS.nombre, 6)
    }
    return
  }

  // Fila banda separadora de la semana (rango corto para legibilidad)
  var banda = ['', 'SEMANA N° ' + num + ' — ' + _semRangoCorto(key), '', '', '', '', '', '', '', '', '', '', '', '', '', '', '']
  // Comienza justo donde terminan los datos (sin dejar fila vacía de aire):
  // con `_ultimaFilaDatos` (devuelve desde si no hay nada) +1 quedaba un hueco
  // antes de la banda cuando aún no existían revisiones o tras semanas cerradas.
  var ini = REV_FILA_DATOS
  if (ultima > REV_FILA_DATOS ||
      (ultima === REV_FILA_DATOS && String(sh.getRange(ultima, REV.item).getValue() || '').trim() !== '')) {
    ini = ultima + 1
  }

  sh.getRange(ini, 1, 1, 17).setValues([banda])
  sh.getRange(ini, REV.dia1, 1, 10).clear()   // dejar limpias H..Q de la banda
  var iniDatos = ini + 1
  _asegurarFilas(sh, iniDatos + filas.length - 1)
  sh.getRange(iniDatos, 1, filas.length, 17).setValues(filas)
  _grisesRegistro(sh, iniDatos, iniDatos + filas.length - 1)

  // Calcular alertas del bloque nuevo (1 lectura + 1 escritura)
  _calcularUsoAlertaBloque(sh, iniDatos, iniDatos + filas.length - 1)

  _repintarBandasSemana(sh, iniDatos + filas.length - 1)
  _resaltarColumnaHoy(sh, iniDatos + filas.length - 1)
  _bordes(sh, REV_FILA_CAB, iniDatos + filas.length - 1, 17)
  sh.getRange(iniDatos, REV.alerta, filas.length, 1).setFontWeight('bold')
  sh.getRange(iniDatos, 1, filas.length, 17).setVerticalAlignment('middle')
  sh.getRange(iniDatos, 1, filas.length, 17).setWrapStrategy(SpreadsheetApp.WrapStrategy.CLIP)

  var finReal = _ultimaFilaDatos(sh, REV.item, REV_FILA_DATOS)
  _validarDiasRevisiones(sh, finReal)
  _condAlerta(sh, Math.max(finReal, REV_FILA_DATOS))
  _actualizarPanel(sh)

  sh.activate()
  _ss().setActiveRange(sh.getRange(iniDatos, REV.dia1 + _diaSemana(_hoy()), 1, 1))
  _logEvento('REVISIÓN', 'Creada semana ' + key + ' con ' + filas.length + ' ítems')
  _toast(filas.length + ' ítems listos para la SEMANA N° ' + num + ' (' + rango + ')', '📅 ' + SIS.nombre)
}

// Fila de revisión (17 columnas) con el stock base que corresponda:
// el Día 7 de la semana anterior si existe para ese ítem, si no el del maestro.
function _filaRevision(fecha, key, seccion, item, basesPrev, baseMaestro, min, vto) {
  var base = baseMaestro
  var clave = seccion + '|' + item
  if (basesPrev && clave in basesPrev && basesPrev[clave] !== '' && basesPrev[clave] !== null && basesPrev[clave] !== undefined) {
    base = basesPrev[clave]
  }
  return [_fmt(fecha), key, seccion, item, base, min, vto, '', '', '', '', '', '', '', '', '', '']
}

// Stock base (Día 7) de la semana anterior por ítem, para sembrar la siguiente
function _basesSemanaAnterior(sh, key, ultima) {
  var bases = {}
  if (ultima < REV_FILA_DATOS) return bases
  var p = /^S(\d+)\/(\d{4})$/.exec(key)
  if (!p) return bases
  var numPrev = Number(p[1]) - 1
  var keyPrev = 'S' + numPrev + '/' + p[2]
  if (numPrev < 1) return bases
  var n = ultima - (REV_FILA_DATOS - 1) + 1
  var vals = sh.getRange(REV_FILA_DATOS, 1, ultima - REV_FILA_DATOS + 1, 17).getValues()
  for (var i = 0; i < vals.length; i++) {
    if (String(vals[i][REV.semana - 1]).trim() !== keyPrev) continue
    var seccion = String(vals[i][REV.seccion - 1]).trim()
    var item = String(vals[i][REV.item - 1]).trim()
    if (!item) continue
    bases[seccion + '|' + item] = vals[i][REV.dia7 - 1]
  }
  return bases
}

// ─── Relleno rápido: marca la semana actual como completa ────────────────────
// Rellena las 7 columnas diarias (Lun..Dom) con el stock base en los ítems
// que no registran ninguna cantidad (el usuario ajusta solo los que cambiaron).
function completarSemanaCompleta() {
  var ui = _ui()
  if (!ui) return
  var sh = _hoja(HOJA.revisiones, HOJA_ORDEN.revisiones)
  var hoy = _hoy()
  var key = _semKey(hoy)
  var num = _semanaDelAnio(hoy)
  var ultima = _ultimaFilaDatos(sh, REV.item, REV_FILA_DATOS)
  if (ultima < REV_FILA_DATOS) {
    _alerta(ui, 'Sin datos', 'Cree primero la revisión de la semana con "Nueva revisión semanal".')
    return
  }

  var n = ultima - REV_FILA_DATOS + 1
  var vals = sh.getRange(REV_FILA_DATOS, 1, n, 17).getValues()
  var pendientes = []
  for (var i = 0; i < n; i++) {
    var semv = String(vals[i][REV.semana - 1] || '').trim()
    var vacio = true
    for (var d = 0; d < 7; d++) {
      var dv = vals[i][REV.dia1 - 1 + d]
      if (dv !== '' && dv !== null && dv !== undefined) { vacio = false; break }
    }
    if (semv === key && vacio) pendientes.push(i)
  }

  if (pendientes.length === 0) {
    _toast('La semana N° ' + num + ' ya está completa.', '✔️ ' + SIS.nombre)
    return
  }

  if (!_confirmar(ui, '✔️ Completar semana',
    'Se rellenarán los 7 días (Lun..Dom) con el stock base en ' + pendientes.length + ' ítem(s) pendiente(s) de la SEMANA N° ' + num + '.\n\nDespués ajuste solo los que cambiaron.')) return

  var hora = _hora(hoy)
  for (var k = 0; k < pendientes.length; k++) {
    var idx = pendientes[k]
    for (var d = 0; d < 7; d++) vals[idx][REV.dia1 - 1 + d] = vals[idx][REV.base - 1]
    vals[idx][REV.hora - 1] = hora
  }
  sh.getRange(REV_FILA_DATOS, 1, n, 17).setValues(vals)

  _calcularUsoAlertaBloque(sh, REV_FILA_DATOS, ultima)
  _repintarBandasSemana(sh, ultima)
  _resaltarColumnaHoy(sh, ultima)
  _actualizarPanel(sh)
  sh.activate()
  _toast(pendientes.length + ' ítems completados con el stock base en los 7 días — ajuste los que cambiaron.', '✔️ ' + SIS.nombre)
}

// ─── onEdit: búsqueda, hora automática, avance y panel ───────────────────────
function onEdit(e) {
  try {
    var sh = e.range.getSheet()
    var nombre = sh.getSheetName()

    if (nombre === HOJA.farmacos)   { _buscarEnHoja(e, sh, BUS.farmacos); return }
    if (nombre === HOJA.insumos)    {
      if (typeof _sincronizarVencimiento === 'function' && _sincronizarVencimiento(e, sh)) return
      _buscarEnHoja(e, sh, BUS.insumos)
      return
    }
    if (nombre === HOJA.revisiones) {
      if (_buscarEnHoja(e, sh, BUS.revisiones)) return
      _marcarFechaHora(e, sh)
      return
    }
  } catch (err) { }
}

// Al editar la columna Vencimiento del maestro INSUMOS: normaliza el formato
// (acepta cualquier fecha), actualiza el vencimiento en TODAS las filas del
// registro REVISIONES que correspondan a ese insumo y recalcula sus alertas.
function _sincronizarVencimiento(e, sh) {
  var col = e.range.getColumn()
  if (col !== INSU.vto) return false
  var fila = e.range.getRow()
  if (fila < 4) return false
  var nom = String(sh.getRange(fila, INSU.nom).getValue() || '').trim()
  if (!nom) return false

  // 1) Normaliza la celda al formato canónico MM/AAAA (si es fecha válida).
  var valor = e.range.getValue()
  var vtoTexto = _formatoVto(valor)
  if (vtoTexto !== '' && String(valor).trim() !== vtoTexto) {
    try { e.range.setValue(vtoTexto) } catch (err2) { }
  }

  // 2) Actualiza la columna Vto (G) de REVISIONES para ese insumo.
  var shR = _ss().getSheetByName(HOJA.revisiones)
  if (shR && vtoTexto !== '') {
    var ultima = _ultimaFilaDatos(shR, REV.item, REV_FILA_DATOS)
    if (ultima >= REV_FILA_DATOS) {
      var n = ultima - REV_FILA_DATOS + 1
      var datos = shR.getRange(REV_FILA_DATOS, REV.item, n, REV.vto - REV.item + 1).getValues()
      var iniRun = -1
      for (var i = 0; i < n; i++) {
        var esBanda = String(datos[i][0] || '').indexOf('SEMANA N°') === 0
        if (!esBanda && String(datos[i][0] || '').trim() === nom && String(datos[i][REV.vto - REV.item] || '').trim() !== vtoTexto) {
          datos[i][REV.vto - REV.item] = vtoTexto
        }
        if (esBanda && iniRun >= 0) { _escribirVtoRango(shR, REV_FILA_DATOS + iniRun, REV_FILA_DATOS + i - 1, datos, iniRun); iniRun = -1 }
        else if (!esBanda && iniRun < 0) iniRun = i
      }
      if (iniRun >= 0) _escribirVtoRango(shR, REV_FILA_DATOS + iniRun, REV_FILA_DATOS + n - 1, datos, iniRun)
      // Recalcula las alertas de todas las semanas (el vencimiento cambió)
      _calcularUsoAlertaBloque(shR, REV_FILA_DATOS, ultima)
    }
  }

  // 3) Alertas recalculadas en el paso 2 (el vencimiento cambió).
  return false   // continúa con la búsqueda normal
}

// Al escribir una cantidad en una columna de día (H..N): hora automática,
// recálculo de la alerta y avance al siguiente ítem sin cantidad del mismo día.
// Lecturas en bloque; el cálculo de alerta se hace en un único bloque.
function _marcarFechaHora(e, sh) {
  var fila = e.range.getRow()
  var altura = e.range.getHeight()
  var col = e.range.getColumn()
  if (col < REV.dia1 || col > REV.dia7) return
  if (fila < REV_FILA_DATOS) return

  // Una sola lectura: columna de semana (B) + columna del día editado (col)
  var ancho = col - REV.semana + 1
  var vals = sh.getRange(fila, REV.semana, altura, ancho).getValues()
  var iDia = col - REV.semana
  var editedRows = []           // filas (relativas) con número nuevo
  var invalidas = 0
  for (var i = 0; i < altura; i++) {
    var esBanda = String(vals[i][0] || '').indexOf('SEMANA N°') === 0
    if (esBanda) continue
    var valor = vals[i][iDia]
    if (valor === '' || valor === null || valor === undefined) continue
    if (isNaN(Number(valor))) { invalidas++; continue }
    editedRows.push(i)
  }

  if (invalidas > 0) {
    _toast(invalidas + ' cantidad(es) no es un número: revísela(s).', '⚠ ' + SIS.nombre)
  }

  if (editedRows.length > 0) {
    var hora = _hora(_hoy())
    if (altura === 1) {
      sh.getRange(fila, REV.hora).setValue(hora)
    } else {
      // Varias filas: escribe hora fila a fila (evita celdas BANDA combinadas)
      for (var k = 0; k < editedRows.length; k++) {
        try { sh.getRange(fila + editedRows[k], REV.hora).setValue(hora) } catch (e) { }
      }
    }
    var iniB = fila, finB = fila + altura - 1
    if (String(vals[0][0] || '').indexOf('SEMANA N°') === 0) iniB = fila + 1
    if (String(vals[altura - 1][0] || '').indexOf('SEMANA N°') === 0) finB--
    if (finB >= iniB) _calcularUsoAlertaBloque(sh, iniB, finB)
    var ultimaReg = _ultimaFilaDatos(sh, REV.item, REV_FILA_DATOS)
    _actualizarPanel(sh, ultimaReg)
    _avanzarSiguiente(sh, fila + editedRows[editedRows.length - 1], col, ultimaReg)
  }
}

// Salta al siguiente ítem de la MISMA semana y del MISMO día sin cantidad
// (toggle en CONFIG). Si se acaban los ítems del día, deja el cursor donde está.
// Optimizado: 1 sola lectura (semana + día juntas) y la comprobación de filas
// ocultas (isRowHiddenByUser) solo si hay búsqueda activa en la fila 2.
function _avanzarSiguiente(sh, fila, col, ultimaReg) {
  var cfg = _configValor('Avanzar al siguiente ítem al escribir')
  if (cfg === 'No') return
  var key = String(sh.getRange(fila, REV.semana).getValue() || '').trim()
  var ultima = ultimaReg || _ultimaFilaDatos(sh, REV.item, REV_FILA_DATOS)
  if (fila >= ultima) return

  // ¿Hay una búsqueda (filtro) activa? Solo entonces hay filas ocultas que saltar.
  var hayBuscador = String(sh.getRange(2, 7).getValue() || '').trim() !== ''

  var n = ultima - fila
  // Una sola lectura: incluye columna de semana + columna del día
  var iniCol = Math.min(REV.semana, col)
  var ancho = Math.max(REV.semana, col) - iniCol + 1
  var vals = sh.getRange(fila + 1, iniCol, n, ancho).getValues()
  var iSem = REV.semana - iniCol
  var iDia = col - iniCol
  for (var i = 0; i < n; i++) {
    // Salta filas ocultas por el filtro de búsqueda (no se pueden activar)
    if (hayBuscador) {
      try { if (sh.isRowHiddenByUser(fila + 1 + i)) continue } catch (e) { }
    }
    if (String(vals[i][iSem] || '').trim() === key && (vals[i][iDia] === '' || vals[i][iDia] === null || vals[i][iDia] === undefined)) {
      sh.activate()
      _ss().setActiveRange(sh.getRange(fila + 1 + i, col))
      return
    }
  }
}

// ─── CÁLCULO DE LA ALERTA (DIARIO) ───────────────────────────────────────────
// La alerta se calcula con la ÚLTIMA cantidad escrita (el último día de Lun..Dom
// que tenga valor → el estado actual del carro). Alerta: REPONER / VENCIDO /
// POR VENCER / OK. Versión en bloque: 1 lectura + 1 escritura (rápida).
function _calcularUsoAlertaBloque(sh, ini, fin) {
  if (fin < ini) return
  var n = fin - ini + 1
  // Una sola lectura A..Q: la columna de semana (índice 1) ya viene incluida.
  var vals = sh.getRange(ini, 1, n, 17).getValues()
  var hoy = _hoy()
  var anticipa = Number(_configValor('Anticipación de alerta de vencimiento (meses)'))
  if (isNaN(anticipa)) anticipa = 1

  for (var i = 0; i < n; i++) {
    if (String(vals[i][REV.semana - 1] || '').indexOf('SEMANA N°') === 0) continue  // fila banda: no tocar
    var base = vals[i][REV.base - 1]
    var min = vals[i][REV.min - 1]
    var vto = String(vals[i][REV.vto - 1] || '').trim()

    // Último día (más avanzado de la semana) que tiene cantidad escrita
    var real = ''
    var hayDia = false
    for (var d = 6; d >= 0; d--) {
      var v = vals[i][REV.dia1 - 1 + d]
      if (v !== '' && v !== null && v !== undefined) {
        real = v
        hayDia = true
        break
      }
    }

    if (!hayDia) {
      vals[i][REV.alerta - 1] = ''
      continue
    }

    var nReal = Number(real)
    var nMin = (min === '' || min === null || min === undefined || isNaN(Number(min))) ? 0 : Number(min)
    if (isNaN(nReal)) {
      vals[i][REV.alerta - 1] = ''
      continue
    }

    var alerta = ''
    if (nReal <= nMin) {
      alerta = 'REPONER'
    } else if (vto !== '') {
      var vtoMes = _parseVto(vto)
      if (vtoMes) {
        var est = _estadoVencimiento(vtoMes, hoy, anticipa)
        alerta = est === 'PRÓXIMO' ? 'OK' : est
      } else {
        alerta = 'OK'
      }
    } else {
      alerta = 'OK'
    }
    vals[i][REV.alerta - 1] = alerta
  }

  // Escritura por tramos: las filas banda están COMBINADAS (A:Q) y no pueden
  // entrar en un setValues que las incluya; solo se escriben los tramos de
  // datos que quedan entre banda y banda.
  var iniRun = -1
  for (var k = 0; k <= n; k++) {
    var esBandaK = k < n && String(vals[k][REV.semana - 1] || '').indexOf('SEMANA N°') === 0
    if (esBandaK) {
      if (iniRun >= 0) { _escribirAlertaRango(sh, ini + iniRun, ini + k - 1, vals, iniRun); iniRun = -1 }
    } else if (iniRun < 0) {
      iniRun = k
    }
  }
  if (iniRun >= 0 && iniRun < n) _escribirAlertaRango(sh, ini + iniRun, ini + n - 1, vals, iniRun)
}

// Escribe la columna Alerta (O) de un tramo continuo de datos (sin bandas),
// recortando el array `vals` que se leyó desde `ini` en la hoja.
function _escribirAlertaRango(sh, filaIni, filaFin, vals, indiceEnVals) {
  if (filaFin < filaIni) return
  var n = filaFin - filaIni + 1
  var out = []
  for (var i = 0; i < n; i++) out.push([vals[indiceEnVals + i][REV.alerta - 1]])
  sh.getRange(filaIni, REV.alerta, n, 1).setValues(out)
}

// Escribe la columna Vencimiento (G) de un tramo continuo de datos (sin bandas).
function _escribirVtoRango(sh, filaIni, filaFin, vals, indiceEnVals) {
  if (filaFin < filaIni) return
  var n = filaFin - filaIni + 1
  var out = []
  for (var i = 0; i < n; i++) out.push([vals[indiceEnVals + i][REV.vto - REV.item]])
  sh.getRange(filaIni, REV.vto, n, 1).setValues(out)
}

// Versión de una fila (para onEdit)
function _calcularUsoAlerta(sh, fila) {
  _calcularUsoAlertaBloque(sh, fila, fila)
}

// ─── HERRAMIENTAS ────────────────────────────────────────────────────────────

// Navega hasta la banda de la semana ACTUAL (la que dice HOY)
function irASemanaActual() {
  var sh = _hoja(HOJA.revisiones, HOJA_ORDEN.revisiones)
  var ultima = _ultimaFilaDatos(sh, REV.item, REV_FILA_DATOS)
  if (ultima < REV_FILA_DATOS) {
    _toast('Aún no hay revisiones registradas. Cree la semana con "Nueva revisión semanal".', '🏠 ' + SIS.nombre)
    return
  }
  var rangoActual = '— ' + _semRangoCorto(_semKey(_hoy()))
  var vals = sh.getRange(REV_FILA_DATOS, REV.semana, ultima - REV_FILA_DATOS + 1, 1).getValues()
  for (var i = 0; i < vals.length; i++) {
    var v = String(vals[i][0] || '')
    if (v.indexOf('SEMANA N°') === 0 && v.indexOf(rangoActual) > 0) {
      sh.activate()
      _ss().setActiveRange(sh.getRange(REV_FILA_DATOS + i, REV.dia1 + _diaSemana(_hoy())))
      return
    }
  }
  _toast('La semana actual (' + _semKey(_hoy()) + ') aún no está creada. Use "Nueva revisión semanal".', '🏠 ' + SIS.nombre)
}

// Navega hasta la banda de la última semana registrada
function irUltimaSemana() {
  var sh = _hoja(HOJA.revisiones, HOJA_ORDEN.revisiones)
  var ultima = _ultimaFilaDatos(sh, REV.item, REV_FILA_DATOS)
  if (ultima < REV_FILA_DATOS) {
    _toast('Aún no hay revisiones registradas.', '📅 ' + SIS.nombre)
    return
  }
  var vals = sh.getRange(REV_FILA_DATOS, REV.semana, ultima - REV_FILA_DATOS + 1, 1).getValues()
  var filaBanda = REV_FILA_DATOS
  for (var i = 0; i < vals.length; i++) {
    if (String(vals[i][0]).indexOf('SEMANA N°') === 0) filaBanda = REV_FILA_DATOS + i
  }
  sh.activate()
  _ss().setActiveRange(sh.getRange(filaBanda, 1, 1, 17))
}

// Navega hasta una semana específica del registro
function irASemanaN() {
  var ui = _ui()
  if (!ui) return
  var sh = _hoja(HOJA.revisiones, HOJA_ORDEN.revisiones)
  var ultima = _ultimaFilaDatos(sh, REV.item, REV_FILA_DATOS)
  if (ultima < REV_FILA_DATOS) {
    _alerta(ui, 'Sin datos', 'Aún no hay revisiones registradas.')
    return
  }

  var num = _pregunta(ui, '📅 Ir a una semana', 'Escriba el N° de semana a la que quiere ir:')
  if (num === null) return
  num = String(num).replace(/^S/i, '')
  if (!/^\d+$/.test(num)) {
    _mostrarAviso('Formato inválido', 'Escriba solo el N° de semana (ej. 25).', ['Ejemplo: 25'])
    return
  }

  var key = 'S' + num + '/' + _hoy().getFullYear()
  var sem = sh.getRange(REV_FILA_DATOS, REV.semana, ultima - REV_FILA_DATOS + 1, 1).getValues()
  for (var i = 0; i < sem.length; i++) {
    if (String(sem[i][0]).trim() === key) {
      sh.activate()
      _ss().setActiveRange(sh.getRange(REV_FILA_DATOS + i, REV.dia1 + _diaSemana(_hoy())))
      return
    }
  }
  _mostrarAviso('Semana no encontrada', 'No hay registro para la semana N° ' + num + '.', ['Use "Nueva revisión semanal" para crearla.'])
}

// Limpia las celdas de búsqueda de las tres pestañas (y los resaltados)
function limpiarBusqueda() {
  var ss = _ss()
  var shF = ss.getSheetByName(HOJA.farmacos)
  var shI = ss.getSheetByName(HOJA.insumos)
  var shR = ss.getSheetByName(HOJA.revisiones)
  if (shF) { shF.getRange(2, 2, 1, 1).setValue(''); _limpiarResaltados(shF, BUS.farmacos) }
  if (shI) { shI.getRange(2, 2, 1, 1).setValue(''); _limpiarResaltados(shI, BUS.insumos) }
  if (shR) { shR.getRange(2, 7, 1, 1).setValue(''); _limpiarResaltados(shR, BUS.revisiones) }
  _toast('Búsquedas limpiadas en FÁRMACOS, INSUMOS y REVISIONES.', '🧹 ' + SIS.nombre)
}

// Elimina la revisión de una semana completa (banda + filas de datos)
function borrarSemana() {
  var ui = _ui()
  if (!ui) return

  var semanas = _semanasDisponibles()
  if (semanas.length === 0) {
    _alerta(ui, 'Sin datos', 'No hay revisiones registradas.')
    return
  }
  var lista = []
  for (var i = 0; i < semanas.length; i++) {
    lista.push('S' + semanas[i].num + ' (' + semanas[i].rango + ')')
  }

  var resp = _pregunta(ui, '🗑️ Eliminar revisión de una semana',
    'Semanas disponibles:\n' + lista.join('\n') + '\n\nEscriba el N° de semana a ELIMINAR:')
  if (resp === null) return

  var num = String(resp).replace(/^S/i, '')
  if (!/^\d+$/.test(num)) {
    _mostrarAviso('Formato inválido', 'Escriba solo el N° de semana (ej. 25).', ['Ejemplo: 25'])
    return
  }
  var elegida = null
  for (var j = semanas.length - 1; j >= 0; j--) {
    if (semanas[j].num === Number(num)) { elegida = semanas[j]; break }
  }
  if (!elegida) {
    _mostrarAviso('Semana no encontrada', 'No hay registro para la semana N° ' + num + '.', ['Use una de las semanas de la lista.'])
    return
  }

  var sh = _hoja(HOJA.revisiones, HOJA_ORDEN.revisiones)
  var ultima = _ultimaFilaDatos(sh, REV.item, REV_FILA_DATOS)
  var semCol = sh.getRange(REV_FILA_DATOS, REV.semana, ultima - REV_FILA_DATOS + 1, 1).getValues()

  var etiqueta = 'SEMANA N° ' + elegida.num + ' —'
  var iniBanda = -1
  var finBanda = ultima
  var dentro = false
  for (var k = 0; k < semCol.length; k++) {
    var v = String(semCol[k][0]).trim()
    if (v.indexOf('SEMANA N°') === 0) {
      if (dentro) { finBanda = REV_FILA_DATOS + k - 1; break }
      if (v.indexOf(etiqueta) === 0) { iniBanda = REV_FILA_DATOS + k; dentro = true }
    }
  }
  if (iniBanda < 0) {
    _mostrarAviso('No se encontró el bloque', 'La semana N° ' + elegida.num + ' no tiene filas para eliminar.', [])
    return
  }

  if (!_confirmar(ui, '⚠️ Confirmar eliminación',
    'Se eliminarán la banda y las filas de la SEMANA N° ' + elegida.num + ' (' + elegida.rango + ').\n\nEsta acción NO se puede deshacer.')) return

  sh.deleteRows(iniBanda, finBanda - iniBanda + 1)

  var ultima2 = _ultimaFilaDatos(sh, REV.item, REV_FILA_DATOS)
  _asegurarFilas(sh, ultima2 + MARGEN.filasRevisiones)
  _repintarBandasSemana(sh, ultima2)
  _resaltarColumnaHoy(sh, ultima2)
  _bordes(sh, REV_FILA_CAB, Math.max(ultima2, REV_FILA_DATOS), 17)
  _condAlerta(sh, Math.max(ultima2, REV_FILA_DATOS))
  _actualizarPanel(sh)
  _logEvento('REVISIÓN', 'Eliminada semana N° ' + elegida.num + ' de ' + elegida.anio + ' (' + elegida.rango + ')')
  _toast('Semana N° ' + elegida.num + ' eliminada del registro.', '🗑️ ' + SIS.nombre)
}

// ─── DATOS DE PRUEBA (semanas del registro, solo si se pide) ─────────────────
// Rellena SOLO el registro semanal con datos simulados (las últimas 3 semanas
// con cantidades y algunos ítems REPONER) para probar el flujo. No agrega ni
// modifica el inventario (FÁRMACOS e INSUMOS se respetan). No sobrescribe
// semanas que ya tengan cantidades. silencioso = true evita diálogos.
function cargarDatosPrueba(silencioso) {
  var ui = _ui()

  if (_leerFarmacos().length === 0) formatearFarmacos()
  if (_leerInsumos().length === 0) formatearInsumos()

  var hoy = _hoy()
  var anio = hoy.getFullYear()
  var nSem = _semanaDelAnio(hoy)
  var claves = []
  for (var k = Math.max(1, nSem - 2); k <= nSem; k++) claves.push('S' + k + '/' + anio)

  var pendientes = []
  for (var j = 0; j < claves.length; j++) {
    if (!_semanaYaExiste(claves[j])) pendientes.push(claves[j])
  }

  if (pendientes.length === 0) {
    if (!silencioso && ui) {
      _alerta(ui, '🧪 Datos de prueba',
        'Las semanas ' + claves.join(', ') + ' ya tienen revisiones.\n\nNo se modificó nada: el sistema no sobrescribe cantidades existentes.')
    } else {
      _toast('Datos de prueba: las semanas ya tienen revisiones.', '🧪 ' + SIS.nombre)
    }
    return
  }

  if (!silencioso && ui) {
    if (!_confirmar(ui, '🧪 Datos de prueba',
      'Se cargarán datos simulados para probar el sistema:\n\n' +
      '· ' + pendientes.length + ' semana(s): ' + pendientes.join(', ') + '\n' +
      '· Cantidades ficticias con algunos ítems en REPONER\n\n' +
      'No se modifica el inventario (FÁRMACOS e INSUMOS quedan tal cual).\n\n' +
      '¿Continuar?')) return
  }

  var creadas = 0
  for (var c = 0; c < pendientes.length; c++) {
    var p = /^S(\d+)\/(\d{4})$/.exec(pendientes[c])
    _crearRevisionSemana(Number(p[1]))
    _llenarSemanaPrueba(pendientes[c])
    creadas++
  }

  // Reconstruir las pestañas que muestran datos en vivo (sin frenarse si falta un .gs)
  if (typeof formatearRevisiones === 'function') formatearRevisiones()
  if (typeof construirTablero === 'function') construirTablero()
  if (typeof construirEstadisticas === 'function') construirEstadisticas()
  if (typeof formatearBitacora === 'function') formatearBitacora()
  _logEvento('SISTEMA', 'Datos de prueba cargados: ' + creadas + ' semana(s) con cantidades simuladas')

  var resumen = 'Listo:\n\n' +
    '· ' + creadas + ' semana(s) con cantidades simuladas (algunos ítems en REPONER).\n' +
    '· El inventario (FÁRMACOS e INSUMOS) no se tocó.\n' +
    '· TABLERO, ESTADÍSTICAS y PDF ya muestran datos.'
  if (!silencioso && ui) {
    _alerta(ui, '🧪 Datos de prueba', resumen)
  } else {
    _toast('Datos de prueba cargados: ' + creadas + ' semana(s).', '🧪 ' + SIS.nombre)
  }
}

// ¿La clave de semana (S25/2026) ya existe en el registro?
function _semanaYaExiste(key) {
  var sh = _ss().getSheetByName(HOJA.revisiones)
  if (!sh) return false
  var ultima = _ultimaFilaDatos(sh, REV.item, REV_FILA_DATOS)
  if (ultima < REV_FILA_DATOS) return false
  var sem = sh.getRange(REV_FILA_DATOS, REV.semana, ultima - REV_FILA_DATOS + 1, 1).getValues()
  for (var i = 0; i < sem.length; i++) {
    if (String(sem[i][0]).trim() === key) return true
  }
  return false
}

// Llena la semana indicada con cantidades simuladas determinísticas: el stock
// parte en el base el Lunes y va bajando cada día, dejando algunos ítems en
// REPONER. _calcularUsoAlertaBloque marca VENCIDO / POR VENCER por sí solo.
function _llenarSemanaPrueba(key) {
  var sh = _hoja(HOJA.revisiones, HOJA_ORDEN.revisiones)
  var ultima = _ultimaFilaDatos(sh, REV.item, REV_FILA_DATOS)
  var vals = sh.getRange(REV_FILA_DATOS, 1, ultima - REV_FILA_DATOS + 1, 17).getValues()
  var p = /^S(\d+)\/(\d{4})$/.exec(key)
  var lunes = _lunesDe(new Date(Number(p[2]), 0, 1))
  lunes.setDate(lunes.getDate() + (Number(p[1]) - 1) * 7)
  var iniBloque = -1, finBloque = -1, idx = 0

  for (var i = 0; i < vals.length; i++) {
    if (String(vals[i][REV.semana - 1]).trim() !== key) continue
    if (iniBloque < 0) iniBloque = REV_FILA_DATOS + i
    finBloque = REV_FILA_DATOS + i
    var base = Number(vals[i][REV.base - 1])
    var min = Number(vals[i][REV.min - 1])
    var d = new Date(lunes)
    d.setDate(d.getDate() + (idx % 7))
    d.setHours(8 + (idx % 10), (idx * 11) % 60, 0, 0)
    vals[i][REV.fecha - 1] = _fmt(d)
    vals[i][REV.hora - 1] = _hora(d)

    if (!isNaN(base)) {
      // Consumo total de la semana: determinista, algunos ítems llegan bajo mín.
      var uso = (idx * 5 + Number(p[1]) * 3) % 6
      if (idx % 9 === 0) uso = Math.max(0, base - Math.max(0, min))  // → REPONER
      else if (idx % 13 === 0) uso = 0                               // sin uso
      // El carro baja cada día desde el stock base hasta «base − uso».
      for (var dia = 0; dia < 7; dia++) {
        var cant = Math.max(0, Math.round(base - uso * (dia + 1) / 7))
        vals[i][REV.dia1 - 1 + dia] = cant
      }
    }
    vals[i][REV.obs - 1] = 'Dato de prueba'
    idx++
  }
  sh.getRange(REV_FILA_DATOS, 1, vals.length, 17).setValues(vals)
  if (iniBloque >= 0) _calcularUsoAlertaBloque(sh, iniBloque, finBloque)
}

// ─── CIERRE DE SEMANA — HISTORIAL EN "SEMANAS CERRADAS" ───────────────────────
// "✔️ Completar semana completa" es útil para pruebas: rellena los 7 días con
// el stock base. "🔒 Cerrar semana" es distinto: COPIA la semana elegida tal
// como está en REVISIONES a la hoja SEMANAS CERRADAS (historial permanente con
// fecha de cierre), sin tocar la copia original. Así el dato nunca se pierde.
function cerrarSemanaEnRegistro() {
  var ui = _ui()
  if (!ui) return

  var dispo = _semanasDisponibles()
  if (dispo.length === 0) {
    try {
      ui.alert('Sin datos', 'No hay semanas en REVISIONES para cerrar.', ui.ButtonSet.OK)
    } catch (e) {
      _toast('No hay semanas en REVISIONES para cerrar.', '⚠ ' + SIS.nombre, 6)
    }
    return
  }
  var ya = _semanasArchivadas()
  var pendientes = []
  for (var i = 0; i < dispo.length; i++) {
    if (ya.indexOf(dispo[i].key) < 0) pendientes.push(dispo[i])
  }
  if (pendientes.length === 0) {
    _alerta(ui, 'Todo archivado', 'Todas las semanas ya están en la hoja "' + HOJA.semanasCerradas + '".\n\nNo se duplicaron semanas.')
    return
  }

  var keyHoy = _semKey(_hoy())
  var lista = []
  for (var p = 0; p < pendientes.length; p++) lista.push('· ' + pendientes[p].key + '  (' + pendientes[p].rango + ')')

  var texto = _pregunta(ui, '🔒 Cerrar semana',
    'Se copiará la semana a la hoja "' + HOJA.semanasCerradas + '" para no perder datos.\n\nSemanas sin archivar:\n' + lista.join('\n') +
    '\n\nEscriba el N° de la semana a CERRAR (Enter = la actual ' + keyHoy + '):')
  if (texto === null) return
  texto = String(texto).replace(/S/i, '')
  var objetivo = null
  if (!texto) {
    for (var q = 0; q < pendientes.length; q++) if (pendientes[q].key === keyHoy) objetivo = pendientes[q]
  } else {
    for (var z = 0; z < pendientes.length; z++) if (pendientes[z].num === Number(texto)) objetivo = pendientes[z]
  }
  if (!objetivo) {
    _mostrarAviso('Semana no encontrada', 'Escriba un N° de semana de la lista (o Enter para la actual).', ['Ejemplo: ' + pendientes[pendientes.length - 1].num])
    return
  }

  if (!_confirmar(ui, '🔒 Cerrar semana',
    'Se guardará en "' + HOJA.semanasCerradas + '" la SEMANA N° ' + objetivo.num + ' (' + objetivo.rango + ').\n\n' +
    'Se copian las filas tal como están en REVISIONES (la original se conserva sin cambios).\n\n¿Continuar?')) return

  var filas = _archivarSemana(objetivo.key)
  _logEvento('SEMANA', 'Cerrada y archivada la semana ' + objetivo.key + ' (' + filas + ' filas) en ' + HOJA.semanasCerradas)
  _toast('Semana N° ' + objetivo.num + ' guardada en "' + HOJA.semanasCerradas + '" (' + filas + ' filas).', '🔒 ' + SIS.nombre)
  irASemanasCerradas()
}

// Copia la semana `key` a SEMANAS CERRADAS. Devuelve la cantidad de filas de
// datos archivadas. Se replica una fila banda (con la fecha de cierre) seguida
// de las filas de datos tal como están en REVISIONES; se respeta el orden.
function _archivarSemana(key) {
  var ss = _ss()
  if (!ss.getSheetByName(HOJA.semanasCerradas)) formatearSemanasCerradas()
  var shR = ss.getSheetByName(HOJA.revisiones)
  if (!shR) return 0
  var shA = ss.getSheetByName(HOJA.semanasCerradas)
  if (!shA) shA = _hoja(HOJA.semanasCerradas, HOJA_ORDEN.semanasCerradas)

  var ultima = _ultimaFilaDatos(shR, REV.item, REV_FILA_DATOS)
  if (ultima < REV_FILA_DATOS) return 0

  var n = ultima - REV_FILA_DATOS + 1
  var vals = shR.getRange(REV_FILA_DATOS, 1, n, REV.hora).getValues()

  var p = /^S(\d+)\/(\d{4})$/.exec(key)
  var etiquetaBanda = p
    ? 'SEMANA N° ' + p[1] + ' — ' + _semRango(key) + ' · CERRADA el ' + _fmt(_hoy())
    : key
  var cierre = _fmt(_hoy())

  // Arma las filas destino (17 columnas): [cierre, semana, sección, ítem,
  // base, mín, vto, d1..d7, alerta, obs, hora]
  var destino = []
  for (var i = 0; i < n; i++) {
    var b = String(vals[i][REV.semana - 1] || '').trim()
    var item = String(vals[i][REV.item - 1] || '').trim()
    if (b === key && item) {
      var fila17 = [cierre]
      for (var c = REV.semana; c <= REV.hora; c++) fila17.push(vals[i][c - 1])
      destino.push(fila17)
    }
  }
  if (destino.length === 0) return 0

  // Fila banda con la fecha de cierre (las columnas 2..17 quedan vacías)
  var banda = [cierre, etiquetaBanda]
  for (var x = 2; x < 17; x++) banda.push('')

  // Posición de escritura: primera fila libre tras el último dato (col B)
  var ultimaA = _ultimaFilaDatos(shA, 2, SC_FILA_DATOS)
  var filaA = (ultimaA < SC_FILA_DATOS) ? SC_FILA_DATOS : (ultimaA + 2)  // aire tras el bloque

  var total = 1 + destino.length
  _asegurarFilas(shA, filaA + total + MARGEN.filasMaestro)
  shA.getRange(filaA, 1, total, 17).setValues([banda].concat(destino))
  shA.getRange(filaA, 1, total, 17).setVerticalAlignment('middle')

  // Formato del bloque nuevo (banda verde oscuro + zebra + grises automáticos)
  shA.getRange(filaA, 1, 1, 17).setBackground(C.semPas).setFontColor('#ffffff').setFontWeight('bold').setFontSize(9)
  shA.getRange(filaA, 1, 1, 17).merge()
  for (var k = 1; k <= destino.length; k++) {
    var r = shA.getRange(filaA + k, 1, 1, 17)
    if (k % 2 === 1) r.setBackground(C.zebra)
    r.setBorder(true, true, true, true, true, true, C.bordeSuave, SpreadsheetApp.BorderStyle.SOLID)
    shA.setRowHeight(filaA + k, 16)
  }
  shA.getRange(filaA + 1, 2, destino.length, 16).setFontSize(9)
  shA.getRange(filaA + 1, 2, destino.length, 1).setFontWeight('bold')   // clave S..
  shA.getRange(filaA + 1, 8, destino.length, 7).setHorizontalAlignment('center')  // días

  shA.activate()
  return destino.length
}

// Claves de semana (S25/2026) ya archivadas en SEMANAS CERRADAS
function _semanasArchivadas() {
  var sh = _ss().getSheetByName(HOJA.semanasCerradas)
  if (!sh) return []
  var ultima = _ultimaFilaDatos(sh, 2, SC_FILA_DATOS)
  if (ultima < SC_FILA_DATOS) return []
  var vals = sh.getRange(SC_FILA_DATOS, 2, ultima - SC_FILA_DATOS + 1, 1).getValues()
  var out = []
  for (var i = 0; i < vals.length; i++) {
    var s = String(vals[i][0] || '').trim()
    if (/^S\d+\/\d{4}$/.test(s) && out.indexOf(s) < 0) out.push(s)
  }
  return out
}

// ─── Formato de la hoja SEMANAS CERRADAS (no borra el historial) ─────────────
function formatearSemanasCerradas() {
  var sh = _hoja(HOJA.semanasCerradas, HOJA_ORDEN.semanasCerradas)
  _pintarPestana(HOJA.semanasCerradas, C.tabSemanasCerradas)
  var cols = SC_TITULOS.length

  sh.getRange(1, 1, 3, cols).clearFormat()
  _tituloPagina(sh, 1, cols, 'REGISTRO DE SEMANAS CERRADAS — ' + SIS.nombre, C.primario, 30)
  _filaInfo(sh, 2, cols, 'Historial permanente: cada semana cerrada se copia aquí con su fecha de cierre, tal como estaba en REVISIONES (la copia original se conserva). Se archiva con "🔒 Cerrar semana" del menú.')
  _cabecera(sh, 3, SC_TITULOS, C.gris, 20)

  // Re-formatea el historial existente sin tocar sus valores
  var ultima = _ultimaFilaDatos(sh, 2, SC_FILA_DATOS)
  if (ultima >= SC_FILA_DATOS) {
    var rango = sh.getRange(SC_FILA_DATOS, 1, ultima - SC_FILA_DATOS + 1, cols)
    rango.setVerticalAlignment('middle').setFontSize(9)
    sh.getRange(SC_FILA_DATOS, 8, ultima - SC_FILA_DATOS + 1, 7).setHorizontalAlignment('center')
  }
  sh.setFrozenRows(3)
  _anchos(sh, SC_ANCHOS)
}

// Navega a la hoja del historial de semanas cerradas
function irASemanasCerradas() {
  _hoja(HOJA.semanasCerradas, HOJA_ORDEN.semanasCerradas)
}
