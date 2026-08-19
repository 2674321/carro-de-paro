// ─────────────────────────────────────────────────────────────────────────────
//  10_TABLERO — panel de control con estadísticas en vivo
//  Semáforo de la semana actual · vencimientos próximos · uso de los últimos
//  3 meses (con gráfico) · completitud de las revisiones.
//  Sin emojis en las celdas: solo texto y colores institucionales.
//  Se refresca desde el menú "Tablero de control" (y en cada "Actualizar").
// ─────────────────────────────────────────────────────────────────────────────

function construirTablero() {
  var sh = _hoja(HOJA.tablero, HOJA_ORDEN.tablero)
  sh.clear()
  sh.clearFormats()
  _descombinar(sh)
  _pintarPestana(HOJA.tablero, C.tabTablero)
  try {
    var graficos = sh.getCharts()
    for (var g = 0; g < graficos.length; g++) sh.removeChart(graficos[g])
  } catch (e) { }

  var cols = 7
  var fila = 1
  var MES = _MESES()

  _tituloPagina(sh, fila, cols, 'TABLERO DE CONTROL — ' + SIS.nombre, C.primario, 30)
  fila++
  _filaInfo(sh, fila, cols, 'Datos en vivo del registro. Se actualiza al abrirlo desde el menú y al escribir cantidades.')
  fila++

  // ─── Semáforo de la semana actual ──────────────────────────────────────────
  fila++
  _banner(sh, fila, cols, 'ESTADO DE LA SEMANA ACTUAL', C.semAct, 20); fila++
  var est = _estadoSemanaActual()
  var cSem = sh.getRange(fila, 1, 2, cols).merge()
  cSem.setValue(est.texto)
  cSem.setFontSize(11).setFontWeight('bold').setFontColor(est.fg)
  cSem.setBackground(est.bg).setVerticalAlignment('middle').setHorizontalAlignment('left')
  cSem.setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP)
  sh.setRowHeight(fila, 20)
  sh.setRowHeight(fila + 1, 20)
  fila += 2

  // ─── Vencimientos próximos (resumen; clasificación _estadoVencimiento) ────
  fila++
  _banner(sh, fila, cols, 'VENCIMIENTOS PRÓXIMOS', C.aviso, 20); fila++
  var vtos = _vencimientosProximos()
  if (vtos.length === 0) {
    _txt(sh, fila, 1, 'Ninguno: todos los insumos están vigentes o no informan vencimiento.', { color: C.ok, size: 9, bg: C.panelOk })
    fila++
  } else {
    var nVto = 0, nPor = 0
    for (var vi = 0; vi < vtos.length; vi++) {
      if (vtos[vi].estado === 'VENCIDO') nVto++; else nPor++
    }
    _txt(sh, fila, 1, nVto + ' VENCIDO(S)  ·  ' + nPor + ' POR VENCER  —  actualice los vencimientos en el maestro INSUMOS.',
      { color: C.alerta, size: 9, bg: C.panelAlerta }); fila++
    _cabecera(sh, fila, ['Insumo', 'Vencimiento', 'Estado', 'Meses restantes'], C.gris, 20); fila++
    var filaVtoIni = fila
    var maxVto = Math.min(vtos.length, 6)
    for (var i = 0; i < maxVto; i++) {
      var v = vtos[i]
      var rv = sh.getRange(fila, 1, 1, 4)
      rv.setValues([[v.nom, v.vto, v.estado, v.meses]])
      rv.setFontSize(9).setVerticalAlignment('middle')
      rv.setFontColor(v.estado === 'VENCIDO' ? C.alerta : C.aviso).setFontWeight('bold')
      sh.setRowHeight(fila, 16)
      fila++
    }
    sh.getRange(filaVtoIni, 1, maxVto, 4).setBorder(true, true, true, true, true, true, C.bordeSuave, SpreadsheetApp.BorderStyle.SOLID)
    if (vtos.length > maxVto) {
      _txt(sh, fila, 1, '… y ' + (vtos.length - maxVto) + ' más — revise el maestro INSUMOS.', { color: C.gris, size: 9 })
      fila++
    }
  }

  // ─── Uso de los últimos 3 meses (top 10 + gráfico) ────────────────────────
  fila++
  _banner(sh, fila, cols, 'USO DE LOS ÚLTIMOS 3 MESES (TOP 10)', C.primario, 20); fila++
  var uso = _usoUltimosMeses()
  if (uso.filas.length === 0) {
    _txt(sh, fila, 1, 'Sin registros de uso en los últimos 3 meses. Complete cantidades para ver estadísticas.', { color: C.gris, size: 9 })
    fila++
  } else {
    var cab = ['Ítem', 'Sección'].concat(uso.meses).concat(['Total'])
    _cabecera(sh, fila, cab, C.gris, 20); fila++
    var filaUsoIni = fila
    for (var j = 0; j < uso.filas.length; j++) {
      var u = uso.filas[j]
      var ru = sh.getRange(fila, 1, 1, cab.length)
      ru.setValues([[u.item, u.seccion].concat(u.vals).concat([u.total])])
      ru.setFontSize(9).setVerticalAlignment('middle')
      if (j % 2 === 1) ru.setBackground(C.zebra)
      sh.setRowHeight(fila, 16)
      fila++
    }
    sh.getRange(filaUsoIni, 1, uso.filas.length, cab.length).setBorder(true, true, true, true, true, true, C.bordeSuave, SpreadsheetApp.BorderStyle.SOLID)
    _agregarGraficoUso(sh, filaUsoIni, fila - 1, uso.meses.length)
  }

  // ─── Completitud de las revisiones (últimos 3 meses) ───────────────────────
  fila++
  _banner(sh, fila, cols, 'COMPLETITUD DE LAS REVISIONES', C.azul, 20); fila++
  _cabecera(sh, fila, ['Mes', 'Semanas registradas', 'Ítems completados', 'Total esperado', 'Avance'], C.gris, 20); fila++
  var comp = _completitudMeses()
  if (comp.length === 0) {
    _txt(sh, fila, 1, 'Aún no hay revisiones registradas.', { color: C.gris, size: 9 })
    fila++
  } else {
    var filaCompIni = fila
    for (var k = 0; k < comp.length; k++) {
      var c = comp[k]
      var rc = sh.getRange(fila, 1, 1, 5)
      rc.setValues([[c.mes, c.semanas, c.hechos, c.total, c.pct + '%']])
      rc.setFontSize(9).setVerticalAlignment('middle')
      rc.getCell(1, 5).setFontWeight('bold').setFontColor(c.pct >= 100 ? C.ok : (c.pct >= 50 ? C.aviso : C.alerta))
      if (k % 2 === 1) rc.setBackground(C.zebra)
      sh.setRowHeight(fila, 16)
      fila++
    }
    sh.getRange(filaCompIni, 1, comp.length, 5).setBorder(true, true, true, true, true, true, C.bordeSuave, SpreadsheetApp.BorderStyle.SOLID)
  }

  fila++
  _txt(sh, fila, 1, 'Generado el ' + _fmt(_hoy()) + ' · Sistema ' + SIS.nombre + ' v' + SIS.version + ' · Menú → "Tablero de control" para refrescar.', { color: C.gris, size: 8 })
  fila++

  _asegurarFilas(sh, fila + 2)
  _recortarHoja(sh, fila + MARGEN.filasImpresion, 20)
  _anchos(sh, [[1, 300], [2, 100], [3, 105], [4, 105], [5, 105], [6, 105], [7, 105], [8, 20], [9, 85], [10, 85], [11, 85]])
}

// Nombre corto del mes "06/2026" → "Jun 2026"
function _MESES() {
  return ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
}

function _nombreMesCorto(m) {
  var p = m.split('/')
  return _MESES()[Number(p[0]) - 1] + ' ' + p[1]
}

// Estado de la semana actual: alertas + progreso → { texto, bg, fg }
function _estadoSemanaActual() {
  var sh = _ss().getSheetByName(HOJA.revisiones)
  var key = _semKey(_hoy())
  if (!sh) return { texto: 'Sin datos.', bg: C.panelNeutro, fg: C.gris }
  var ultima = _ultimaFilaDatos(sh, REV.item, REV_FILA_DATOS)
  if (ultima < REV_FILA_DATOS) {
    return { texto: 'Aún no hay revisiones. Cree la primera con el Menú → "Nueva revisión semanal".', bg: C.panelNeutro, fg: C.gris }
  }
  var vals = sh.getRange(REV_FILA_DATOS, REV.semana, ultima - REV_FILA_DATOS + 1, REV.alerta - REV.semana + 1).getValues()  // B..O

  var reponer = 0, vencido = 0, porVencer = 0, hechos = 0, total = 0, enSemana = false
  for (var i = 0; i < vals.length; i++) {
    if (String(vals[i][0]).trim() !== key) continue
    enSemana = true
    var a = String(vals[i][REV.alerta - REV.semana] || '').trim()   // Alerta (col. O)
    if (a === 'REPONER') reponer++
    else if (a === 'VENCIDO') vencido++
    else if (a === 'POR VENCER') porVencer++
    if (a !== '') { hechos++; total++ }
  }
  if (!enSemana) {
    return { texto: 'La revisión de la semana ' + key + ' (' + _semRango(key) + ') aún no se crea.', bg: C.panelNeutro, fg: C.gris }
  }
  var partes = ['Semana ' + key + ' (' + _semRango(key) + '): ' + hechos + ' de ' + total + ' completados']
  if (reponer) partes.push(reponer + ' para reponer')
  if (vencido) partes.push(vencido + ' vencidos')
  if (porVencer) partes.push(porVencer + ' por vencer')
  var texto = partes.join(' · ')
  if (vencido) return { texto: texto + ' — ATENCIÓN: hay ítems vencidos.', bg: C.panelAlerta, fg: C.alerta }
  if (reponer) return { texto: texto + ' — hay ítems para reponer.', bg: C.panelAlerta, fg: C.alerta }
  if (porVencer) return { texto: texto + ' — revise los vencimientos.', bg: C.panelAviso, fg: C.aviso }
  if (hechos < total) return { texto: texto + ' — semana en curso.', bg: C.panelAviso, fg: C.aviso }
  return { texto: texto + ' — semana completa, sin alertas.', bg: C.panelOk, fg: C.ok }
}

// Insumos VENCIDOS o POR VENCER según la anticipación de CONFIG
// (misma clasificación que las alertas del registro: _estadoVencimiento)
function _vencimientosProximos() {
  var out = []
  var hoy = _hoy()
  var anticipa = Number(_configValor('Anticipación de alerta de vencimiento (meses)'))
  if (isNaN(anticipa)) anticipa = 1

  var insumos = _leerInsumos()
  for (var i = 0; i < insumos.length; i++) {
    var vtoMes = _parseVto(insumos[i].vto)
    if (!vtoMes) continue
    var estado = _estadoVencimiento(vtoMes, hoy, anticipa)
    if (estado === 'PRÓXIMO') continue
    var meses = Math.round((vtoMes.getTime() - hoy.getTime()) / (30.44 * 24 * 3600 * 1000))
    if (meses < 0) meses = 0
    out.push({ nom: insumos[i].nom, vto: insumos[i].vto, estado: estado, meses: meses })
  }
  out.sort(function (a, b) {
    if (a.estado !== b.estado) return a.estado === 'VENCIDO' ? -1 : 1
    return a.vto < b.vto ? -1 : 1
  })
  return out
}

// Suma de uso por ítem en los últimos 3 meses con datos → { meses, filas }
// Uso semanal de un ítem = Stock base − última cantidad de la semana.
function _usoUltimosMeses() {
  var sh = _ss().getSheetByName(HOJA.revisiones)
  var out = { meses: [], filas: [] }
  if (!sh) return out
  var ultima = _ultimaFilaDatos(sh, REV.item, REV_FILA_DATOS)
  if (ultima < REV_FILA_DATOS) return out
  var vals = sh.getRange(REV_FILA_DATOS, 1, ultima - REV_FILA_DATOS + 1, REV.alerta).getValues()  // A..O

  var porMes = {}
  var orden = []
  for (var i = 0; i < vals.length; i++) {
    var f = String(vals[i][0] || '').trim()
    if (f.length !== 10) continue
    var m = f.slice(3)
    var ultimo = _ultimoDiaEscrito(vals[i], REV.dia1 - 1)
    var base = Number(vals[i][REV.base - 1])
    var item = String(vals[i][3] || '').trim()
    var seccion = String(vals[i][2] || '').trim()
    if (!item || ultimo === '' || ultimo === null || ultimo === undefined || isNaN(Number(ultimo)) || isNaN(base)) continue
    var u = Math.max(0, base - Number(ultimo))
    if (!porMes[m]) { porMes[m] = {}; orden.push(m) }
    var k = seccion + '|' + item
    porMes[m][k] = (porMes[m][k] || 0) + u
  }
  var recientes = orden.sort().slice(-3)
  var totales = {}
  for (var j = 0; j < recientes.length; j++) {
    for (var k2 in porMes[recientes[j]]) {
      totales[k2] = (totales[k2] || 0) + porMes[recientes[j]][k2]
    }
  }
  var claves = Object.keys(totales).sort(function (a, b) { return totales[b] - totales[a] })
  var filas = []
  for (var t = 0; t < claves.length && t < 10; t++) {
    var sep = claves[t].indexOf('|')
    var vv = []
    for (var y = 0; y < recientes.length; y++) {
      vv.push(porMes[recientes[y]][claves[t]] || '')
    }
    filas.push({ item: claves[t].slice(sep + 1), seccion: claves[t].slice(0, sep), vals: vv, total: totales[claves[t]] })
  }
  var labels = []
  for (var x = 0; x < recientes.length; x++) labels.push(_nombreMesCorto(recientes[x]))
  out.meses = labels
  out.filas = filas
  return out
}

// Gráfico de barras del top 10 (categorías = ítem, series = cada mes)
// Referencia las celdas escritas por el script (sin fórmulas) y se posiciona
// a la derecha del contenido principal; las columnas 9+ quedan libres de sobra.
function _agregarGraficoUso(sh, filaIni, filaFin, nMes) {
  try {
    var chart = sh.newChart()
      .setChartType(SpreadsheetApp.ChartType.BAR)
      .addRange(sh.getRange(filaIni, 1, filaFin - filaIni + 1, 1))
      .addRange(sh.getRange(filaIni - 1, 3, filaFin - filaIni + 2, nMes))
      .setNumHeaders(1)
      .setPosition(1, 9, 0, 0)
      .setOption('title', 'Uso por ítem — últimos 3 meses')
      .setOption('legend', { position: 'bottom' })
      .setOption('height', 360)
      .setOption('width', 460)
      .setOption('colors', ['#2471A3', '#25855F', '#E67E22'])
      .build()
    sh.insertChart(chart)
  } catch (e) { }
}

// Completitud por mes (últimos 3 meses con datos): ítems con algún día
// registrado / total de ítems registrados ese mes
function _completitudMeses() {
  var sh = _ss().getSheetByName(HOJA.revisiones)
  var out = []
  if (!sh) return out
  var ultima = _ultimaFilaDatos(sh, REV.item, REV_FILA_DATOS)
  if (ultima < REV_FILA_DATOS) return out
  var vals = sh.getRange(REV_FILA_DATOS, 1, ultima - REV_FILA_DATOS + 1, REV.dia7).getValues()  // A..N

  var porMes = {}
  for (var i = 0; i < vals.length; i++) {
    var f = String(vals[i][0] || '').trim()
    if (f.length !== 10) continue
    var m = f.slice(3)
    if (!porMes[m]) porMes[m] = { hechos: 0, total: 0, semanas: {} }
    var r = _ultimoDiaEscrito(vals[i], REV.dia1 - 1)
    if (r !== '' && r !== null && r !== undefined && !isNaN(Number(r))) porMes[m].hechos++
    porMes[m].total++
    var key = String(vals[i][1] || '').trim()
    if (/^S\d+\/\d{4}$/.test(key)) porMes[m].semanas[key] = true
  }
  var meses = Object.keys(porMes).sort().slice(-3)
  for (var j = 0; j < meses.length; j++) {
    var d = porMes[meses[j]]
    var nSem = 0
    for (var s in d.semanas) nSem++
    out.push({
      mes: _nombreMesCorto(meses[j]),
      semanas: nSem,
      hechos: d.hechos,
      total: d.total,
      pct: d.total ? Math.round(d.hechos / d.total * 100) : 0
    })
  }
  return out
}
