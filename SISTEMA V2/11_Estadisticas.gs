// ─────────────────────────────────────────────────────────────────────────────
//  11_ESTADISTICAS — hoja de análisis del registro
//  · Panorama del período (KPIs) con tarjetas de color
//  · Evolución semanal: completitud y uso, con gráfico
//  · Consumo TOP (Pareto 80/20) con resaltado y gráfico
//  · Ítems sin consumo (candidatos a revisar stock)
//  · Vencimientos: distribución de los próximos 12 meses, con gráfico
//  · Alertas del período y comparativa FÁRMACOS vs INSUMOS
//  El período (meses) y el top se configuran en las celdas amarillas de la
//  propia hoja (B4/B5) y se refresca con el Menú → "Estadísticas".
//  Sin emojis en las celdas: solo texto, números y colores institucionales.
// ─────────────────────────────────────────────────────────────────────────────

function construirEstadisticas() {
  var sh = _hoja(HOJA.estadisticas, HOJA_ORDEN.estadisticas)
  sh.clear()
  sh.clearFormats()
  _descombinar(sh)
  _pintarPestana(HOJA.estadisticas, C.tabEstadisticas)
  try {
    var graficos = sh.getCharts()
    for (var g = 0; g < graficos.length; g++) sh.removeChart(graficos[g])
  } catch (e) { }

  var cols = 10
  var fila = 1

  _tituloPagina(sh, fila, cols, 'ESTADÍSTICAS — ' + SIS.nombre, C.primario, 30)
  fila++
  _filaInfo(sh, fila, cols, 'Análisis del registro con datos reales. Ajuste los meses y el top en las celdas amarillas y use el Menú → "Estadísticas" para refrescar.')
  fila++
  fila++

  // ─── Controles del análisis ────────────────────────────────────────────────
  var mesesN = _controlNumero(sh, 4, 1, 'Meses a analizar', 3, 24)
  var topN = _controlNumero(sh, 5, 1, 'Top ítems a listar', 10, 30)
  fila = 6

  var registro = _registroCompleto()
  var corte = _mesCorte(mesesN)

  // ─── 1. Panorama del período (tarjetas KPI) ────────────────────────────────
  fila++
  _banner(sh, fila, cols, 'PANORAMA DEL PERÍODO', C.semAct, 20)
  fila++
  var k = _calcularKpis(registro, corte)
  if (registro.length === 0) {
    _txt(sh, fila, 1, 'REVISIONES no tiene filas de datos (la hoja está vacía o sin ítems registrados). Cree la semana con "Nueva revisión semanal".', { color: C.aviso, size: 9, bg: C.panelAviso })
    fila++
  } else if (k.semanas === 0) {
    _txt(sh, fila, 1, 'Hay filas en REVISIONES, pero ninguna fecha coincide con "Meses a analizar" (B4). Si las fechas no tienen formato DD/MM/AAAA, ejecute "Actualizar sistema" para normalizarlas.', { color: C.aviso, size: 9, bg: C.panelAviso })
    fila++
  } else if (k.hechos === 0 && k.total > 0) {
    _txt(sh, fila, 1, 'Las semanas del período existen pero aún no tienen cantidades en las columnas Lun..Dom: por eso todo aparece en 0. Escriba las cantidades diarias en REVISIONES y refresque esta hoja.', { color: C.aviso, size: 9, bg: C.panelAviso })
    fila++
  }
  _kpi(sh, fila, 1, 2, k.semanas, 'Semanas analizadas', C.negro, C.panelNeutro)
  _kpi(sh, fila, 3, 2, k.completitud + '%', 'Completitud general', k.completitud >= 90 ? C.ok : (k.completitud >= 60 ? C.aviso : C.alerta), C.panelNeutro)
  _kpi(sh, fila, 5, 2, k.uso, 'Uso total (unidades)', C.primario, C.panelNeutro)
  _kpi(sh, fila, 7, 2, k.reponer, 'Con REPONER', C.alerta, C.panelAlerta)
  _kpi(sh, fila, 9, 2, k.vencido + ' / ' + k.porVencer, 'Vencidos / por vencer', C.aviso, C.panelAviso)
  fila += 2

  // ─── 2. Evolución semanal ──────────────────────────────────────────────────
  fila++
  var filaEvol = fila
  _banner(sh, fila, cols, 'EVOLUCIÓN SEMANAL (completitud y uso)', C.azul, 20); fila++
  var ev = _evolucionSemanal(registro, corte)
  if (ev.length === 0) {
    _txt(sh, fila, 1, 'Sin datos en el período indicado. Aumente "Meses a analizar" (B4) o registre revisiones.', { color: C.gris, size: 9 })
    fila++
  } else {
    _cabecera(sh, fila, ['Semana', 'Rango', 'Ítems', 'Completados', '%', 'Uso total', 'Alertas'], C.gris, 20); fila++
    var filaEvolDatos = fila
    for (var i = 0; i < ev.length; i++) {
      var e = ev[i]
      var re = sh.getRange(fila, 1, 1, 7)
      re.setValues([[e.key, e.rango, e.total, e.hechos, e.pct + '%', e.uso, e.alertas]])
      re.setFontSize(9).setVerticalAlignment('middle')
      if (e.pct === 100) re.getCell(1, 5).setFontColor(C.ok).setFontWeight('bold')
      if (i % 2 === 1) re.setBackground(C.zebra)
      sh.setRowHeight(fila, 16)
      fila++
    }
    sh.getRange(filaEvolDatos, 1, ev.length, 7).setBorder(true, true, true, true, true, true, C.bordeSuave, SpreadsheetApp.BorderStyle.SOLID)
    _graficoDoble(sh, filaEvolDatos, ev.length, filaEvol)
  }

  // ─── 3. Consumo TOP (Pareto 80/20) ─────────────────────────────────────────
  fila++
  var filaPareto = fila
  _banner(sh, fila, cols, 'CONSUMO — TOP ' + topN + ' (PARETO 80/20)', C.primario, 20); fila++
  var par = _paretoConsumo(registro, corte, topN)
  if (par.filas.length === 0) {
    _txt(sh, fila, 1, 'Sin consumo registrado en el período.', { color: C.gris, size: 9 })
    fila++
  } else {
    _cabecera(sh, fila, ['N°', 'Ítem', 'Sección', 'Uso', '% del total', '% acumulado'], C.gris, 20); fila++
    var filaParDatos = fila
    for (var j = 0; j < par.filas.length; j++) {
      var u = par.filas[j]
      var ru = sh.getRange(fila, 1, 1, 6)
      ru.setValues([[j + 1, u.item, u.seccion, u.uso, u.pct + '%', u.acum + '%']])
      ru.setFontSize(9).setVerticalAlignment('middle')
      if (u.acum <= 80) ru.setBackground(C.panelOk)
      sh.setRowHeight(fila, 16)
      fila++
    }
    sh.getRange(filaParDatos, 1, par.filas.length, 6).setBorder(true, true, true, true, true, true, C.bordeSuave, SpreadsheetApp.BorderStyle.SOLID)
    _txt(sh, fila, 1, par.nota, { color: C.primario, size: 9, bg: C.panelOk })
    fila++
    _graficoPareto(sh, filaParDatos, par.filas.length, filaPareto)
  }

  // ─── 4. Ítems sin consumo ──────────────────────────────────────────────────
  fila++
  _banner(sh, fila, cols, 'ÍTEMS SIN CONSUMO EN EL PERÍODO', C.gris, 20); fila++
  var sinUso = _sinConsumo(registro, corte)
  if (sinUso.length === 0) {
    _txt(sh, fila, 1, 'Todos los ítems del maestro registran consumo en el período.', { color: C.ok, size: 9, bg: C.panelOk })
    fila++
  } else {
    var mostrar = sinUso.slice(0, 12).join(' · ')
    if (sinUso.length > 12) mostrar += ' · … (' + (sinUso.length - 12) + ' más)'
    _txt(sh, fila, 1, mostrar, { color: C.gris, size: 9, bg: C.panelInfo })
    fila++
    _txt(sh, fila, 1, 'Sugerencia: revise si estos ítems realmente se usan o ajuste su stock base.', { color: C.gris, size: 8 })
    fila++
  }

  // ─── 5. Vencimientos: próximos 12 meses ────────────────────────────────────
  fila++
  var filaVto = fila
  _banner(sh, fila, cols, 'VENCIMIENTOS — DISTRIBUCIÓN PRÓXIMOS 12 MESES', C.aviso, 20); fila++
  var vto = _distribucionVencimientos()
  if (vto.length === 0) {
    var insAux = _leerInsumos()
    var conVto = 0
    for (var vi = 0; vi < insAux.length; vi++) {
      if (/^\d{2}\/\d{4}$/.test(insAux[vi].vto)) conVto++
    }
    if (conVto === 0) {
      _txt(sh, fila, 1, 'El maestro INSUMOS no informa vencimiento (columna Vto. con formato MM/AAAA). Por eso este control está vacío.', { color: C.aviso, size: 9, bg: C.panelAviso })
    } else {
      _txt(sh, fila, 1, 'Ningún insumo con vencimiento informado (MM/AAAA) cae en los próximos 12 meses.', { color: C.ok, size: 9, bg: C.panelOk })
    }
    fila++
  } else {
    _cabecera(sh, fila, ['Mes de vencimiento', 'Cantidad de insumos', 'Acumulado'], C.gris, 20); fila++
    var filaVtoDatos = fila
    for (var k = 0; k < vto.length; k++) {
      var rv2 = sh.getRange(fila, 1, 1, 3)
      rv2.setValues([[vto[k].mes, vto[k].cant, vto[k].acum]])
      rv2.setFontSize(9).setVerticalAlignment('middle')
      if (k % 2 === 1) rv2.setBackground(C.zebra)
      sh.setRowHeight(fila, 16)
      fila++
    }
    sh.getRange(filaVtoDatos, 1, vto.length, 3).setBorder(true, true, true, true, true, true, C.bordeSuave, SpreadsheetApp.BorderStyle.SOLID)
    _graficoVto(sh, filaVtoDatos, vto.length, filaVto)
    _txt(sh, fila, 1, 'Distribución mensual (análisis). Detalle por insumo en el TABLERO → VENCIMIENTOS PRÓXIMOS.', { color: C.gris, size: 8 })
    fila++
  }

  // ─── 6. Alertas del período y comparativa de secciones ─────────────────────
  fila++
  _banner(sh, fila, cols, 'ALERTAS DEL PERÍODO Y COMPARATIVA DE SECCIONES', C.alerta, 20); fila++
  var al = _alertasPeriodo(registro, corte)
  _cabecera(sh, fila, ['Tipo', 'Cantidad', '% del período', ''], C.gris, 20); fila++
  var filasAl = [
    ['REPONER', al.reponer, C.alerta, C.panelAlerta],
    ['VENCIDO', al.vencido, C.alerta, C.panelAlerta],
    ['POR VENCER', al.porVencer, C.aviso, C.panelAviso],
    ['OK', al.ok, C.ok, C.panelOk],
    ['Sin cantidad', al.sinDato, C.gris, C.panelNeutro]
  ]
  for (var a = 0; a < filasAl.length; a++) {
    var pct = al.total ? Math.round(filasAl[a][1] / al.total * 100) : 0
    var ra = sh.getRange(fila, 1, 1, 3)
    ra.setValues([[filasAl[a][0], filasAl[a][1], pct + '%']])
    ra.setFontSize(9).setVerticalAlignment('middle').setBackground(filasAl[a][3])
    ra.getCell(1, 1).setFontWeight('bold').setFontColor(filasAl[a][2])
    sh.setRowHeight(fila, 16)
    fila++
  }
  fila++
  _cabecera(sh, fila, ['Sección', 'Ítems', 'Completitud', 'Uso', 'REPONER', 'VENCIDO/POR VENCER'], C.gris, 20); fila++
  var sec = _secciones(registro, corte)
  for (var s = 0; s < sec.length; s++) {
    var rs = sh.getRange(fila, 1, 1, 6)
    rs.setValues([[sec[s].nombre, sec[s].items, sec[s].pct + '%', sec[s].uso, sec[s].reponer, sec[s].vto]])
    rs.setFontSize(9).setVerticalAlignment('middle')
    if (s % 2 === 1) rs.setBackground(C.zebra)
    sh.setRowHeight(fila, 16)
    fila++
  }

  fila++
  _txt(sh, fila, 1, 'Generado el ' + _fmt(_hoy()) + ' · Sistema ' + SIS.nombre + ' v' + SIS.version + ' · Menú → "Estadísticas" para refrescar.', { color: C.gris, size: 8 })
  fila++

  _asegurarFilas(sh, fila + 2)
  _recortarHoja(sh, fila + MARGEN.filasImpresion, 24)
  _anchos(sh, [[1, 125], [2, 175], [3, 55], [4, 95], [5, 55], [6, 75], [7, 65], [8, 90], [9, 90], [10, 90]])
}

// ─── Control numérico de la hoja (celda amarilla con respaldo) ───────────────
// Lee el valor actual de B{fila}; si está vacío o inválido, usa el defecto.
function _controlNumero(sh, fila, col, etiqueta, valorDefecto, max) {
  var et = sh.getRange(fila, col)
  et.setValue(etiqueta).setFontSize(10).setFontWeight('bold')
  var celda = et.offset(0, 1)
  var n = parseInt(String(celda.getValue() || '').trim(), 10)
  if (isNaN(n) || n < 1) n = valorDefecto
  if (n > max) n = max
  celda.setValue(n).setBackground(C.cant).setFontSize(10)
  return n
}

// Tarjeta KPI: valor grande + etiqueta, 2 filas de alto
function _kpi(sh, fila, colIni, ancho, valor, etiqueta, colorValor, bg) {
  var v = sh.getRange(fila, colIni, 1, ancho).merge()
  v.setValue(String(valor)).setFontSize(16).setFontWeight('bold').setFontColor(colorValor)
  v.setBackground(bg).setVerticalAlignment('middle').setHorizontalAlignment('center')
  v.setBorder(true, true, true, true, true, true, C.bordeSuave, SpreadsheetApp.BorderStyle.SOLID)
  var e = sh.getRange(fila + 1, colIni, 1, ancho).merge()
  e.setValue(etiqueta).setFontSize(8).setFontColor(C.gris).setBackground(bg)
  e.setHorizontalAlignment('center').setVerticalAlignment('middle')
  e.setBorder(true, true, true, true, true, true, C.bordeSuave, SpreadsheetApp.BorderStyle.SOLID)
}

// ─── Lectura y filtros ───────────────────────────────────────────────────────
// Filas del registro NORMALIZADAS al modelo diario:
// [fecha, semana, sección, ítem, base, min, vto, últimaCantidad, uso, alerta]
// uso de la semana = stock base − última cantidad registrada (D1..D7).
function _registroCompleto() {
  var sh = _ss().getSheetByName(HOJA.revisiones)
  if (!sh) return []
  var ultima = _ultimaFilaDatos(sh, REV.item, REV_FILA_DATOS)
  if (ultima < REV_FILA_DATOS) return []
  var vals = sh.getRange(REV_FILA_DATOS, 1, ultima - REV_FILA_DATOS + 1, REV.alerta).getValues()
  var out = []
  for (var i = 0; i < vals.length; i++) {
    var ultimo = _ultimoDiaEscrito(vals[i], REV.dia1 - 1)
    var base = Number(vals[i][REV.base - 1])
    var uso = ''
    if (ultimo !== '' && ultimo !== null && ultimo !== undefined && !isNaN(Number(ultimo)) && !isNaN(base)) {
      uso = Math.max(0, base - Number(ultimo))
    }
    out.push([
      _fechaTexto(vals[i][0]), vals[i][1], vals[i][2], vals[i][3],
      vals[i][4], vals[i][5], vals[i][6],
      ultimo, uso, vals[i][REV.alerta - 1]
    ])
  }
  return out
}

// Clave de mes 'MM/AAAA' → 'AAAA/MM' (para ordenar y comparar)
function _mesNum(m) {
  var p = m.split('/')
  return p[1] + '/' + p[0]
}

// Primer mes incluido en el análisis, según los meses solicitados ('MM/AAAA')
function _mesCorte(n) {
  var m = new Date(_hoy().getFullYear(), _hoy().getMonth() - (n - 1), 1)
  return ('0' + (m.getMonth() + 1)).slice(-2) + '/' + m.getFullYear()
}

function _enPeriodo(mes, corte) {
  return _mesNum(mes) >= _mesNum(corte)
}

// ─── 1. KPIs del período ─────────────────────────────────────────────────────
function _calcularKpis(registro, corte) {
  var k = { semanas: 0, hechos: 0, total: 0, uso: 0, reponer: 0, vencido: 0, porVencer: 0, completitud: 0 }
  var sems = {}
  for (var i = 0; i < registro.length; i++) {
    var f = String(registro[i][0] || '').trim()
    if (f.length !== 10) continue
    if (!_enPeriodo(f.slice(3), corte)) continue
    var key = String(registro[i][1] || '').trim()
    if (/^S\d+\/\d{4}$/.test(key)) sems[key] = true
    var real = registro[i][7]
    var uso = registro[i][8]
    var al = String(registro[i][9] || '').trim()
    if (real !== '' && real !== null && real !== undefined && !isNaN(Number(real))) k.hechos++
    k.total++
    if (uso !== '' && uso !== null && uso !== undefined && !isNaN(Number(uso))) k.uso += Number(uso)
    if (al === 'REPONER') k.reponer++
    else if (al === 'VENCIDO') k.vencido++
    else if (al === 'POR VENCER') k.porVencer++
  }
  var n = 0
  for (var s in sems) n++
  k.semanas = n
  k.completitud = k.total ? Math.round(k.hechos / k.total * 100) : 0
  return k
}

// ─── 2. Evolución semanal (últimas 10 semanas del período) ───────────────────
function _evolucionSemanal(registro, corte) {
  var porSem = {}
  for (var i = 0; i < registro.length; i++) {
    var f = String(registro[i][0] || '').trim()
    if (f.length !== 10) continue
    if (!_enPeriodo(f.slice(3), corte)) continue
    var key = String(registro[i][1] || '').trim()
    if (!/^S\d+\/\d{4}$/.test(key)) continue
    if (!porSem[key]) porSem[key] = { hechos: 0, total: 0, uso: 0, alertas: 0 }
    var d = porSem[key]
    var real = registro[i][7]
    var uso = registro[i][8]
    var al = String(registro[i][9] || '').trim()
    if (real !== '' && real !== null && real !== undefined && !isNaN(Number(real))) d.hechos++
    d.total++
    if (uso !== '' && uso !== null && uso !== undefined && !isNaN(Number(uso))) d.uso += Number(uso)
    if (al === 'REPONER' || al === 'VENCIDO' || al === 'POR VENCER') d.alertas++
  }
  var out = []
  for (var k in porSem) {
    out.push({
      key: k,
      rango: _semRangoCorto(k),
      total: porSem[k].total,
      hechos: porSem[k].hechos,
      pct: porSem[k].total ? Math.round(porSem[k].hechos / porSem[k].total * 100) : 0,
      uso: porSem[k].uso,
      alertas: porSem[k].alertas
    })
  }
  out.sort(_cmpSemana)
  return out.slice(-10)
}

// ─── 3. Pareto de consumo ────────────────────────────────────────────────────
function _paretoConsumo(registro, corte, topN) {
  var porItem = {}
  for (var i = 0; i < registro.length; i++) {
    var f = String(registro[i][0] || '').trim()
    if (f.length !== 10) continue
    if (!_enPeriodo(f.slice(3), corte)) continue
    var uso = registro[i][8]
    var item = String(registro[i][3] || '').trim()
    var seccion = String(registro[i][2] || '').trim()
    if (!item || uso === '' || uso === null || uso === undefined || isNaN(Number(uso))) continue
    var kk = seccion + '|' + item
    porItem[kk] = (porItem[kk] || 0) + Number(uso)
  }
  var claves = Object.keys(porItem).sort(function (a, b) { return porItem[b] - porItem[a] })
  var total = 0
  for (var j = 0; j < claves.length; j++) total += porItem[claves[j]]
  var filas = []
  var acum = 0
  for (var t = 0; t < claves.length && t < topN; t++) {
    var sep = claves[t].indexOf('|')
    acum += porItem[claves[t]]
    filas.push({
      item: claves[t].slice(sep + 1),
      seccion: claves[t].slice(0, sep),
      uso: porItem[claves[t]],
      pct: total ? Math.round(porItem[claves[t]] / total * 100) : 0,
      acum: total ? Math.round(acum / total * 100) : 100
    })
  }
  var n80 = 0
  for (var z = 0; z < filas.length; z++) { if (filas[z].acum <= 80) n80 = z + 1 }
  var nota = n80 > 0
    ? 'El 80% del consumo se concentra en ' + n80 + ' de ' + filas.length + ' ítems listados.'
    : 'Consumo repartido: ningún ítem del top llega al 80% acumulado.'
  return { filas: filas, nota: nota }
}

// ─── 4. Ítems del maestro sin consumo en el período ──────────────────────────
function _sinConsumo(registro, corte) {
  var conUso = {}
  for (var i = 0; i < registro.length; i++) {
    var f = String(registro[i][0] || '').trim()
    if (f.length !== 10) continue
    if (!_enPeriodo(f.slice(3), corte)) continue
    var uso = registro[i][8]
    var item = String(registro[i][3] || '').trim()
    if (item && uso !== '' && uso !== null && uso !== undefined && !isNaN(Number(uso)) && Number(uso) !== 0) {
      conUso[String(registro[i][2] || '').trim() + '|' + item] = true
    }
  }
  var out = []
  var farm = _leerFarmacos()
  for (var a = 0; a < farm.length; a++) {
    if (!conUso['FÁRMACOS|' + farm[a].med]) out.push(farm[a].med)
  }
  var ins = _leerInsumos()
  for (var b = 0; b < ins.length; b++) {
    if (!conUso['INSUMOS|' + ins[b].nom]) out.push(ins[b].nom)
  }
  return out
}

// ─── 5. Distribución de vencimientos (próximos 12 meses) ─────────────────────
function _distribucionVencimientos() {
  var hoy = _hoy()
  var meses = []
  for (var m = 0; m < 12; m++) {
    var fecha = new Date(hoy.getFullYear(), hoy.getMonth() + m, 1)
    var clave = ('0' + (fecha.getMonth() + 1)).slice(-2) + '/' + fecha.getFullYear()
    meses.push({ clave: clave, cant: 0 })
  }
  var ins = _leerInsumos()
  for (var i = 0; i < ins.length; i++) {
    var vto = _formatoVto(ins[i].vto)
    if (vto === '') continue
    for (var j = 0; j < meses.length; j++) {
      if (meses[j].clave === vto) { meses[j].cant++; break }
    }
  }
  var out = []
  var acum = 0
  for (var k = 0; k < meses.length; k++) {
    if (meses[k].cant === 0) continue
    acum += meses[k].cant
    out.push({ mes: _nombreMesCorto(meses[k].clave), cant: meses[k].cant, acum: acum })
  }
  return out
}

// ─── 6. Alertas del período ──────────────────────────────────────────────────
function _alertasPeriodo(registro, corte) {
  var a = { reponer: 0, vencido: 0, porVencer: 0, ok: 0, sinDato: 0, total: 0 }
  for (var i = 0; i < registro.length; i++) {
    var f = String(registro[i][0] || '').trim()
    if (f.length !== 10) continue
    if (!_enPeriodo(f.slice(3), corte)) continue
    a.total++
    var al = String(registro[i][9] || '').trim()
    if (al === 'REPONER') a.reponer++
    else if (al === 'VENCIDO') a.vencido++
    else if (al === 'POR VENCER') a.porVencer++
    else if (al === 'OK') a.ok++
    else a.sinDato++
  }
  return a
}

// Comparativa FÁRMACOS vs INSUMOS dentro del período
function _secciones(registro, corte) {
  var por = {}
  for (var i = 0; i < registro.length; i++) {
    var f = String(registro[i][0] || '').trim()
    if (f.length !== 10) continue
    if (!_enPeriodo(f.slice(3), corte)) continue
    var sec = String(registro[i][2] || '').trim().toUpperCase() || 'SIN SECCIÓN'
    if (!por[sec]) por[sec] = { items: 0, hechos: 0, uso: 0, reponer: 0, vto: 0 }
    var d = por[sec]
    var real = registro[i][7]
    var uso = registro[i][8]
    var al = String(registro[i][9] || '').trim()
    if (real !== '' && real !== null && real !== undefined && !isNaN(Number(real))) d.hechos++
    d.items++
    if (uso !== '' && uso !== null && uso !== undefined && !isNaN(Number(uso))) d.uso += Number(uso)
    if (al === 'REPONER') d.reponer++
    else if (al === 'VENCIDO' || al === 'POR VENCER') d.vto++
  }
  var out = []
  for (var k in por) {
    out.push({
      nombre: k,
      items: por[k].items,
      pct: por[k].items ? Math.round(por[k].hechos / por[k].items * 100) : 0,
      uso: por[k].uso,
      reponer: por[k].reponer,
      vto: por[k].vto
    })
  }
  out.sort(function (a, b) { return a.nombre < b.nombre ? -1 : 1 })
  return out
}

// ─── Gráficos (referencian las celdas escritas por el script) ────────────────
function _graficoDoble(sh, filaDatos, nFilas, filaPos) {
  try {
    var chart = sh.newChart()
      .setChartType(SpreadsheetApp.ChartType.BAR)
      .addRange(sh.getRange(filaDatos, 1, nFilas, 1))
      .addRange(sh.getRange(filaDatos - 1, 5, nFilas + 1, 2))
      .setNumHeaders(1)
      .setPosition(filaPos, 12, 0, 0)
      .setOption('title', 'Completitud % y uso total por semana')
      .setOption('legend', { position: 'bottom' })
      .setOption('height', 280).setOption('width', 430)
      .setOption('colors', ['#2471A3', '#E67E22'])
      .build()
    sh.insertChart(chart)
  } catch (e) { }
}

function _graficoPareto(sh, filaDatos, nFilas, filaPos) {
  try {
    var chart = sh.newChart()
      .setChartType(SpreadsheetApp.ChartType.BAR)
      .addRange(sh.getRange(filaDatos, 2, nFilas, 1))
      .addRange(sh.getRange(filaDatos - 1, 4, nFilas + 1, 1))
      .setNumHeaders(1)
      .setPosition(filaPos, 12, 0, 0)
      .setOption('title', 'Uso por ítem (unidades)')
      .setOption('height', 230).setOption('width', 430)
      .setOption('colors', ['#1E6B52'])
      .build()
    sh.insertChart(chart)
  } catch (e) { }
}

function _graficoVto(sh, filaDatos, nFilas, filaPos) {
  try {
    var chart = sh.newChart()
      .setChartType(SpreadsheetApp.ChartType.COLUMN)
      .addRange(sh.getRange(filaDatos, 1, nFilas, 1))
      .addRange(sh.getRange(filaDatos - 1, 2, nFilas + 1, 1))
      .setNumHeaders(1)
      .setPosition(filaPos, 12, 0, 0)
      .setOption('title', 'Insumos por mes de vencimiento')
      .setOption('height', 230).setOption('width', 430)
      .setOption('colors', ['#E67E22'])
      .build()
    sh.insertChart(chart)
  } catch (e) { }
}
