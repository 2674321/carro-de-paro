// ─────────────────────────────────────────────────────────────────────────────
//  06_IMPRESION — construcción de las hojas de impresión
//  · Hoja SEMANA: la revisión DIARIA de una semana (7 columnas Lun..Dom) lista
//    para imprimir/firmar.
//  · Hoja IMPRESION: resumen MENSUAL con UNA COLUMNA POR SEMANA revisada
//    (muestra la última cantidad registrada de la semana).
//  El PDF lo genera 07_PDF.gs a partir de estas hojas ya formateadas.
// ─────────────────────────────────────────────────────────────────────────────

// ─── HOJA MENSUAL (una columna por semana) ───────────────────────────────────
// `opc` (opcional) = opciones de personalización ({ id: true/false }).
// 'encabezado' · 'resumen' · 'fechas' · 'obs' · 'usoprom' · 'firmas' · 'vaciarceldas'
function _construirHojaMensual(mes, opc) {
  opc = opc || {}
  var sh = _hojaImpresion(HOJA.impresion, HOJA_ORDEN.impresion)
  sh.clear()
  sh.clearFormats()
  _descombinar(sh)
  _sinCuadricula(sh)
  _pintarPestana(HOJA.impresion, C.tabImpresion)

  var datos = _datosDelMes(mes)                  // { semanas, porSeccion, porUso, porAlerta }
  var calKeys = _semanasCalendarioDelMes(mes)
  // nCol = semanas REALES del mes (4, 5 o 6): tantas columnas como semanas tiene
  // el calendario, no siempre 5. Las semanas del mes sin revisar quedan marcadas
  // como "PEND." en las CELDAS (no en el encabezado).
  var nCol = calKeys.length > 0 ? Math.max(calKeys.length, datos.semanas.length) : Math.max(datos.semanas.length, 5)
  var labels = [], labelsF = [], claves = [], pendientes = []
  for (var s = 0; s < nCol; s++) {
    var keyS = s < calKeys.length ? calKeys[s] : ''
    var conDatos = keyS !== '' && datos.semanas.indexOf(keyS) >= 0
    var pS = /^S(\d+)\/(\d{4})$/.exec(keyS || '')
    if (pS) {
      labels.push('S. N' + pS[1])   // etiqueta corta que cabe en la columna (ej.: S. N34)
      labelsF.push(_ddmm(_lunesDeSemana(keyS)))
    } else {
      labels.push('Sem. N°__')
      labelsF.push('____ → ____')
    }
    claves.push(conDatos ? keyS : '')
    pendientes.push(keyS !== '' && !conDatos)
  }

  var conObs = _opcValor(opc, 'obs', 'mensual')
  var conUsoProm = _opcValor(opc, 'usoprom', 'mensual')
  var cols = 6 + nCol + (conObs ? 1 : 0) + (conUsoProm ? 1 : 0)

  var fila = 1
  fila = _encabezadoInstitucional(sh, fila, cols, mes, opc)

  var farmacos = _leerFarmacos()
  var insumos = _leerInsumos()
  var anchoForma = _anchoSegunTexto(farmacos, 'forma', 85, 170, 8.5)
  // Columna 2 (Reg. ISP en FÁRMACOS / nombre en INSUMOS) y columna 3
  // (nombre en FÁRMACOS / Cant. base en INSUMOS): el ancho se ajusta al
  // texto REAL más largo para que ningún nombre quede cortado.
  var anchoNom2 = Math.max(_anchoSegunTexto(farmacos, 'isp', 80, 240, 9),
                           _anchoSegunTexto(insumos, 'nom', 80, 240, 9))
  var anchoNom3 = Math.max(_anchoSegunTexto(farmacos, 'med', 170, 320, 9), 90)
  // Altura uniforme de las filas de datos: suficiente para mostrar los
  // nombres más largos del catálogo aunque deban envolver en 2 líneas.
  var altoFilas = _altoFilaLineas(_lineasNombreMax(farmacos, insumos, Math.min(anchoNom2, anchoNom3)))
  var colsMens = _anchosMensuales(nCol, conObs, conUsoProm, opc, anchoForma, anchoNom2, anchoNom3)

  // Capacidad real de una página (según el papel elegido en CONFIG y el ancho
  // total de las columnas, que fija la escala de "ajustar al ancho"): las
  // filas "Hoja N de M" y los saltos de página coinciden con la página física.
  var porPagina = _filasPorPaginaMensual(colsMens, _papelConfig(), altoFilas)

  // Paginación total del documento: FÁRMACOS e INSUMOS (una página por bloque
  // de porPagina filas, cada sección empieza en página nueva) + la página del
  // bloque de firmas solo si no cabe en la última página de INSUMOS.
  var nCF = Math.max(1, Math.ceil(farmacos.length / porPagina))
  var nCI = Math.max(1, Math.ceil(insumos.length / porPagina))
  var ultI = insumos.length - (nCI - 1) * porPagina
  var filasBloque = (_opcValor(opc, 'obs', 'mensual') !== false ? 6 : 1) + (_opcValor(opc, 'firmas', 'mensual') !== false ? 6 : 1)
  var pagTotal = nCF + nCI + (ultI + filasBloque > porPagina ? 1 : 0)

  // Banda resumen del mes (completitud, uso total y alertas), igual que la
  // banda del PDF semanal. La controla la misma opción CONFIG "Imprimir
  // resumen de la semana" (aplica al semanal y al mensual).
  if (_opcValor(opc, 'resumen', 'mensual') !== false) {
    var resumen = _resumenMensualPDF(datos, farmacos.length, insumos.length)
    sh.getRange(fila, 1, 1, cols).merge()
    sh.getRange(fila, 1).setValue(resumen.texto)
    sh.getRange(fila, 1).setFontSize(9).setFontWeight('bold').setFontColor(resumen.fg)
    sh.getRange(fila, 1).setBackground(resumen.bg).setVerticalAlignment('middle').setHorizontalAlignment('center')
    sh.getRange(fila, 1, 1, cols).setBorder(true, true, false, true, true, true, C.borde, SpreadsheetApp.BorderStyle.SOLID)
    sh.setRowHeight(fila, 16)
    fila++
  }

  fila = _tablaSeccion(sh, fila, farmacos, 'FÁRMACOS', C.primario,
    ['N°', 'Reg. ISP', 'Medicamento', 'Forma', 'Base', 'Mín.', 'Obs.', 'USO PROM.'],
    ['isp', 'med', 'forma', 'base', 'min', 'obs'], labels, labelsF, claves, pendientes, datos, 'FÁRMACOS', opc,
    { por: porPagina, inicio: 1, total: pagTotal, alto: altoFilas })

  // Cada sección empieza en una página nueva (numeración "Hoja N de M" exacta)
  try { sh.insertPageBreaks([fila]) } catch (e) { }

  fila = _tablaSeccion(sh, fila, insumos, 'INSUMOS CLÍNICOS', C.azul,
    ['N°', 'Insumo', 'Cant. base', 'Mín.', 'Venc.', 'Obs.', 'USO PROM.'],
    ['nom', 'base', 'min', 'vto', 'obs'], labels, labelsF, claves, pendientes, datos, 'INSUMOS', opc,
    { por: porPagina, inicio: nCF + 1, total: pagTotal, alto: altoFilas })

  fila = _bloqueFirmas(sh, fila, cols, 'OBSERVACIONES DEL MES', opc)
  // Si el bloque de firmas no cabe en la última página de INSUMOS, cierra el
  // documento con su propia página (con su pie "Hoja N de M").
  if (ultI + filasBloque > porPagina) fila = _piePagina(sh, fila, cols, pagTotal, pagTotal)
  _asegurarFilas(sh, fila + 2)
  _configurarImpresion(sh, colsMens)
  // Recorta filas y columnas sobrantes de corridas anteriores: si quedaran,
  // ensancharían el PDF (blanco a la derecha) o agregarían páginas vacías.
  _recortarHoja(sh, fila, cols)
  if (_opcValor(opc, 'vaciarceldas', 'mensual')) _vaciarRellenos(sh)
}

// Anchos para la hoja mensual (una columna por semana + uso promedio)
// Reparto equilibrado: el total apunta a ~880-930px para que la escala quede
// cerca de 1:1 y los encabezados (Sem. N°23, USO PROM., fechas) no se corten.
// Con muchas semanas: columnas más angostas y fuente más pequeña.
function _anchosMensuales(nCols, conObs, conUsoProm, opc, anchoForma, anchoNom2, anchoNom3) {
  var compacto = nCols > 6
  var anchos = [[1, 26], [2, anchoNom2 || 85], [3, anchoNom3 || 175], [4, anchoForma || 95], [5, 55], [6, 55]]
  if (conObs) anchos.push([7, 120])
  var c = 7 + (conObs ? 1 : 0)
  for (var i = 0; i < nCols; i++) { anchos.push([c + i, compacto ? 62 : 66]) }
  if (conUsoProm) anchos.push([c + nCols, 78])   // USO PROM.
  return _expandirAnchoImprimible(anchos)
}

// Capacidad real de UNA página A4 vertical del PDF mensual: cuántas filas de
// datos caben según el ancho total de las columnas (que fija la escala de
// "ajustar al ancho") y las alturas fijas (encabezado repetido + banner +
// cabecera + fechas + pie "Hoja N de M"). Así los rótulos y saltos de página
// coinciden con la página física (márgenes 0.30"/0.35"/0.30"/0.30").
function _filasPorPaginaMensual(anchos, papel, alto) {
  papel = papel || _papelConfig()
  var imp = _imprimiblePx(papel)
  var totalW = 0
  for (var i = 0; i < anchos.length; i++) totalW += anchos[i][1]
  var escala = Math.min(1, imp[0] / Math.max(1, totalW))
  var al = (alto || 20)
  var n = Math.floor((imp[1] / escala - 170) / al)
  return Math.max(10, Math.min(80, n))
}

// Capacidad real de UNA página para el PDF semanal (filas de datos, con su
// banner/cabecera y el pie "Hoja N de M" en cada página).
function _filasPorPaginaSemanal(anchos, papel, alto) {
  papel = papel || _papelConfig()
  var imp = _imprimiblePx(papel)
  var totalW = 0
  for (var i = 0; i < anchos.length; i++) totalW += anchos[i][1]
  var escala = Math.min(1, imp[0] / Math.max(1, totalW))
  var al = (alto || 19)
  var n = Math.floor((imp[1] / escala - 170) / al)
  return Math.max(10, Math.min(80, n))
}

// Pie de página impreso en la última fila de cada página: "— Hoja N de M —"
function _piePagina(sh, fila, totCols, pagina, total) {
  var r = sh.getRange(fila, 1, 1, totCols)
  try { r.merge() } catch (e) { }
  r.setValue('— Hoja ' + pagina + ' de ' + total + ' —')
  r.setFontSize(8).setFontColor('#7F8C8D')
  r.setHorizontalAlignment('center').setVerticalAlignment('middle')
  r.setBorder(false, false, true, false, false, false, C.bordeSuave, SpreadsheetApp.BorderStyle.DOTTED)
  sh.setRowHeight(fila, 14)
  return fila + 1
}

// Encabezado institucional común (banda verde + banda del mes + datos) con la
// misma línea de diseño que la hoja semanal: banda verde con el título, banda
// superior (aviso) con el MES y fila de información del establecimiento.
function _encabezadoInstitucional(sh, fila, cols, mes, opc) {
  if (opc && _opcValor(opc, 'encabezado', 'mensual') === false) return fila
  sh.getRange(fila, 1).setValue(TITULO_MENSUAL)
  sh.getRange(fila, 1, 1, cols).merge()
  sh.getRange(fila, 1).setFontSize(13).setFontWeight('bold').setFontColor('#ffffff').setBackground(C.primario)
  sh.getRange(fila, 1).setHorizontalAlignment('center').setVerticalAlignment('middle')
  sh.setRowHeight(fila, 28)
  fila++

  // Banda del mes (estilo de la banda "SEMANA N° X — DEL …" del PDF semanal)
  var txtMes = 'MES: ' + _nombreMes(mes)
  sh.getRange(fila, 1).setValue(txtMes)
  sh.getRange(fila, 1, 1, cols).merge()
  sh.getRange(fila, 1).setFontSize(10).setFontWeight('bold').setFontColor('#ffffff').setBackground(C.aviso)
  sh.getRange(fila, 1).setHorizontalAlignment('center').setVerticalAlignment('middle')
  sh.setRowHeight(fila, 20)
  fila++

  var est = _configValor('Establecimiento') || 'CESFAM San Juan'
  var disp = _configValor('Dispositivo (carro de paro)') || 'Carro de paro'
  var disp2 = _configValor('Dispositivo alternativo (móvil)') || 'Carro móvil'
  // Fila única combinada con ajuste de texto: evita que los datos largos
  // (dispositivos) se corten o desborden sobre las columnas vecinas
  var rInfo = sh.getRange(fila, 1, 1, cols).merge()
  rInfo.setValue('Establecimiento: ' + est + '    |    Dispositivo: ☐ ' + disp + '  ☐ ' + disp2)
  rInfo.setFontSize(9).setFontWeight('bold')
  rInfo.setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP)
  rInfo.setVerticalAlignment('middle').setHorizontalAlignment('left')
  rInfo.setBorder(true, false, false, false, false, false, C.primario, SpreadsheetApp.BorderStyle.SOLID)
  sh.setRowHeight(fila, 18)
  fila++

  return fila
}

// "06/2026" → "JUNIO 2026" (o devuelve el texto tal cual si no es MM/AAAA)
function _nombreMes(mes) {
  var p = /^(\d{2})\/(\d{4})$/.exec(mes)
  if (!p) return mes
  var nombres = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO',
    'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE']
  return (nombres[Number(p[1]) - 1] || mes) + ' ' + p[2]
}

// Nombres de los 12 meses en minúsculas (opciones de los dropdowns de mes)
function _nombresMeses() {
  return ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
    'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
}

// Nombre de mes ("marzo") → clave "MM/AAAA" con el AÑO detectado automáticamente
// (año en curso). Devuelve null si no es un mes válido.
function _mesPorNombre(nombre) {
  var n = String(nombre == null ? '' : nombre).trim().toLowerCase()
  if (n === '') return null
  var idx = _nombresMeses().indexOf(n)
  if (idx < 0) return null
  return ('0' + (idx + 1)).slice(-2) + '/' + _hoy().getFullYear()
}

// Los 12 meses del año en curso para el dropdown del panel de impresión:
// [{ v: 'MM/AAAA', t: 'enero' }, …] (solo el NOMBRE del mes a la vista).
function _listaMesesAno() {
  var nombres = _nombresMeses()
  var anio = _hoy().getFullYear()
  var out = []
  for (var i = 1; i <= 12; i++) {
    out.push({ v: ('0' + i).slice(-2) + '/' + anio, t: nombres[i - 1] })
  }
  return out
}

// Resumen del mes para la banda del PDF mensual: { texto, bg, fg }
// Un ítem está "completado" si registró al menos una cantidad en el mes; el
// uso es la suma de todas las semanas; las alertas son las vigentes (última
// revisión de la semana más reciente de cada ítem).
function _resumenMensualPDF(datos, nF, nI) {
  var hechos = 0, reponer = 0, vencido = 0, porVencer = 0, uso = 0
  for (var k in datos.porSeccion) hechos++
  for (var u in datos.porUso) {
    var m = datos.porUso[u]
    for (var s in m) {
      var v = Number(m[s])
      if (!isNaN(v)) uso += v
    }
  }
  for (var a in datos.porAlerta) {
    var al = datos.porAlerta[a]
    if (al === 'REPONER') reponer++
    else if (al === 'VENCIDO') vencido++
    else if (al === 'POR VENCER') porVencer++
  }
  var total = nF + nI
  var partes = ['COMPLETADOS ' + hechos + ' DE ' + total]
  if (uso) partes.push('USO TOTAL ' + uso)
  if (reponer) partes.push('REPONER ' + reponer)
  if (vencido) partes.push('VENCIDO ' + vencido)
  if (porVencer) partes.push('POR VENCER ' + porVencer)
  var texto = partes.join('   ·   ')
  if (vencido || reponer) return { texto: texto, bg: C.panelAlerta, fg: C.alerta }
  if (porVencer) return { texto: texto, bg: C.panelAviso, fg: C.aviso }
  if (hechos === total) return { texto: texto + '   ·   MES COMPLETO', bg: C.panelOk, fg: C.ok }
  return { texto: texto, bg: C.panelNeutro, fg: C.gris }
}

// ─── Tabla mensual (paginada en bloques de `porPagina` filas) ────────────────
function _tablaSeccion(sh, fila, items, titulo, color, cabeceras, campos, labels, labelsF, claves, pendientes, datos, seccion, opc, pag) {
  opc = opc || {}
  pendientes = pendientes || []
  pag = pag || {}
  var porPagina = pag.por || IMP.filasPorPagina
  var inipag = pag.inicio || 1
  var totalPag = pag.total || Math.max(1, inipag + Math.ceil(items.length / porPagina) - 1)

  // La opción "obs" quita la columna Obs. y su campo; "usoprom" quita la
  // columna USO PROM.; "fechas" quita la fila secundaria de rangos de fechas.
  var cAbs = cabeceras.slice()
  var cPos = campos.slice()
  if (_opcValor(opc, 'obs', 'mensual') === false) {
    for (var hb = cAbs.length - 1; hb >= 0; hb--) { if (cAbs[hb] === 'Obs.') cAbs.splice(hb, 1) }
    for (var hc = cPos.length - 1; hc >= 0; hc--) { if (cPos[hc] === 'obs') cPos.splice(hc, 1) }
  }
  // "USO PROMO." es una columna DE CIERRE (su valor va al final, después de
  // las semanas): se saca del bloque de títulos de texto y se agrega al final
  // del encabezado, para que títulos y datos queden alineados columna a columna.
  var conUsoProm = _opcValor(opc, 'usoprom', 'mensual') !== false
  for (var hd = cAbs.length - 1; hd >= 0; hd--) { if (cAbs[hd] === 'USO PROM.') cAbs.splice(hd, 1) }
  var sinUsoProm = !conUsoProm
  var verFechas = _opcValor(opc, 'fechas', 'mensual') !== false

  var nCol = labels.length
  var totCols = cAbs.length + nCol + (conUsoProm ? 1 : 0)
  var compacto = nCol > 6          // fuente adaptativa según cantidad de semanas
  var tam = compacto ? 9 : 10
  var saltos = []
  var colObs = cAbs.indexOf('Obs.')   // columna de observaciones (-1 si está oculta)
  var cabCompleto = cAbs.concat(labels, conUsoProm ? ['USO PROM.'] : [])

  if (items.length === 0) {
    _banner(sh, fila, totCols, titulo, color, 22); fila++
    _cabecera(sh, fila, cabCompleto, color, 20)
    sh.getRange(fila, cAbs.length + 1, 1, nCol).setFontSize(8).setHorizontalAlignment('center')
    if (conUsoProm) sh.getRange(fila, totCols).setFontSize(8)
    fila++
    _txt(sh, fila, 1, '(Lista vacía — cargue el maestro ' + seccion + ')', { color: C.gris, size: 9 })
    return fila + 1
  }

  var primeraDeLaPagina = true
  var filaIni = fila

  for (var i = 0; i < items.length; i++) {
    if (primeraDeLaPagina) {
      if (i > 0) saltos.push(fila)
      _banner(sh, fila, totCols, titulo, color, 22)
      fila++
      _cabecera(sh, fila, cabCompleto, color, 20)
      sh.getRange(fila, cAbs.length + 1, 1, nCol).setFontSize(8).setHorizontalAlignment('center')
      if (conUsoProm) sh.getRange(fila, totCols).setFontSize(8)
      fila++
      // Fila secundaria de cabecera: rango de fechas debajo de cada semana
      if (verFechas && labelsF.length === labels.length) {
        var filaSec = []
        for (var z = 0; z < cAbs.length; z++) filaSec.push('')
        filaSec = filaSec.concat(labelsF)
        while (filaSec.length < totCols) filaSec.push('')
        sh.getRange(fila, 1, 1, totCols).setValues([filaSec])
        var rf = sh.getRange(fila, cAbs.length + 1, 1, nCol)
        rf.setFontSize(compacto ? 7 : 8).setFontColor('#ffffff').setBackground('#7FB3D5')
        rf.setHorizontalAlignment('center').setVerticalAlignment('middle')
        fila++
      }
      primeraDeLaPagina = false
    }

    var row = items[i]
    var valores = [row.num]
    for (var c = 0; c < cPos.length; c++) valores.push(row[cPos[c]])
    var usos = []
    var pendCel = []
    for (var s = 0; s < nCol; s++) {
      // Semanas del mes sin revisar: la CELDA marca "PEND." (el encabezado se
      // mantiene limpio y corto para que quepa en la columna).
      var qv = _qtyPara(datos, seccion, row.med || row.nom, claves[s])
      if (qv === '' && pendientes[s]) { qv = 'PEND.'; pendCel.push(s) }
      valores.push(qv)
      var u = _usoPara(datos, seccion, row.med || row.nom, claves[s])
      if (u !== '' && u !== null && u !== undefined) usos.push(Number(u))
    }
    if (!sinUsoProm) {
      // Solo muestra el promedio cuando hubo consumo real (evita "0" en los
      // ítems sin uso, como muchos insumos clínicos con stock base en 0).
      var prom = ''
      var hayUso = false
      for (var uu = 0; uu < usos.length; uu++) { if (usos[uu] > 0) { hayUso = true; break } }
      if (hayUso) {
        prom = Math.round(usos.reduce(function (a, b) { return a + b }, 0) / usos.length * 10) / 10
      }
      valores.push(prom)
    }

    var rango = sh.getRange(fila, 1, 1, valores.length)
    rango.setValues([valores])
    // Fuerza formato de NÚMERO en las columnas numéricas (N°, Base/Mín.,
    // semanas y USO PROM.): si la columna arrastrara un formato de fecha de
    // una corrida anterior, los valores grandes se mostrarían como fechas.
    var fmtNum = []
    for (var fx = 1; fx <= valores.length; fx++) {
      var esNum = (fx === 1) || (fx === cB + 1) || (fx === cMi + 1) ||
                  (fx > cAbs.length && fx <= cAbs.length + nCol) ||
                  (conUsoProm && fx === totCols)
      fmtNum.push(esNum ? (conUsoProm && fx === totCols ? '0.#' : '0') : '@')
    }
    rango.setNumberFormats([fmtNum])
    rango.setFontSize(tam).setVerticalAlignment('middle')
    rango.setBorder(false, false, true, false, false, false, C.bordeSuave, SpreadsheetApp.BorderStyle.DOTTED)
    if (i % 2 === 1) rango.setBackground(C.zebra)

    // Números en negrita y centrados: N°, Base/Mín. y todas las cantidades por
    // semana (y USO PROM.); los textos quedan alineados a la izquierda y el
    // medicamento/insumo en negrita como en el maestro. La altura de la fila
    // se adapta a los nombres más largos (pag.alto) y nada se corta.
    var cB = 1 + cPos.indexOf('base')
    var cMi = 1 + cPos.indexOf('min')
    sh.getRange(fila, 1).setFontWeight('bold').setHorizontalAlignment('center').setFontSize(tam)
    if (cB > 0) sh.getRange(fila, cB + 1).setFontWeight('bold').setHorizontalAlignment('center').setFontSize(tam)
    if (cMi > 0) sh.getRange(fila, cMi + 1).setFontWeight('bold').setHorizontalAlignment('center').setFontSize(tam)
    var numIni = valores.length - nCol - (sinUsoProm ? 0 : 1)
    if (numIni >= 0 && numIni < valores.length) {
      sh.getRange(fila, numIni + 1, 1, valores.length - numIni).setFontSize(tam).setFontWeight('bold').setHorizontalAlignment('center')
    }
    var cNomI = cAbs.indexOf('Medicamento')
    if (cNomI < 0) cNomI = cAbs.indexOf('Insumo')
    if (cNomI >= 0) sh.getRange(fila, cNomI + 1).setFontWeight('bold')
    if (cNomI >= 0) sh.getRange(fila, cNomI + 1).setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP).setVerticalAlignment('middle')
    if (colObs >= 0) sh.getRange(fila, colObs + 1).setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP).setFontWeight('normal').setFontSize(tam)
    for (var pc = 0; pc < pendCel.length; pc++) {
      sh.getRange(fila, cAbs.length + 1 + pendCel[pc]).setFontColor(C.gris).setFontStyle('italic')
    }
    sh.setRowHeight(fila, pag.alto || 20)
    fila++

    // Pie de página de cada bloque: "— Hoja N de M —" en la última fila
    if ((i + 1) % porPagina === 0 || i + 1 === items.length) {
      fila = _piePagina(sh, fila, totCols, inipag + Math.floor(i / porPagina), totalPag)
    }
    if ((i + 1) % porPagina === 0 && i + 1 < items.length) primeraDeLaPagina = true
  }

  sh.getRange(filaIni, 1, fila - filaIni, totCols).setBorder(true, true, true, true, true, true, C.borde, SpreadsheetApp.BorderStyle.SOLID)
  try { sh.insertPageBreaks(saltos) } catch (e) { }
  fila++
  return fila
}

// ─── Datos del mes desde REVISIONES (agrupados POR SEMANA) ───────────────────
// Devuelve { semanas, claves, etiquetas, etiquetasFechas, porSeccion, porUso,
// porAlerta }
// porSeccion['SECCIÓN|ítem'][claveSemana] = última cantidad real de la semana
// porUso['SECCIÓN|ítem'][claveSemana]      = uso de esa semana (base − última)
// porAlerta['SECCIÓN|ítem']                = alerta vigente (última revisión)
function _datosDelMes(mes) {
  var sh = _ss().getSheetByName(HOJA.revisiones)
  var out = { semanas: [], claves: [], etiquetas: [], etiquetasFechas: [], porSeccion: {}, porUso: {}, porAlerta: {} }
  if (!sh) return out

  var ultima = _ultimaFilaDatos(sh, REV.item, REV_FILA_DATOS)
  if (ultima < REV_FILA_DATOS) return out

  var vals = sh.getRange(REV_FILA_DATOS, 1, ultima - REV_FILA_DATOS + 1, REV.alerta).getValues()
  var ordenSem = {}

  for (var i = 0; i < vals.length; i++) {
    var fechaStr = _fechaTexto(vals[i][0])
    if (fechaStr.length !== 10) continue
    if (fechaStr.slice(3) !== mes) continue

    var key = String(vals[i][1] || '').trim()
    if (!/^S\d+\/\d{4}$/.test(key)) continue

    var seccion = String(vals[i][2] || '').trim().toUpperCase()
    var item = String(vals[i][3] || '').trim()
    var qty = _ultimoDiaEscrito(vals[i], REV.dia1 - 1)
    var base = Number(vals[i][REV.base - 1])
    if (!item) continue
    out.porAlerta[seccion + '|' + item] = String(vals[i][REV.alerta - 1] || '').trim()

    if (!ordenSem[key]) {
      ordenSem[key] = true
      out.semanas.push(key)
    }
    if (qty !== '' && qty !== null && qty !== undefined) {
      out.porSeccion[seccion + '|' + item] = out.porSeccion[seccion + '|' + item] || {}
      out.porSeccion[seccion + '|' + item][key] = qty   // última revisión de la semana
      var nQ = Number(qty)
      if (!isNaN(nQ) && !isNaN(base)) {
        out.porUso[seccion + '|' + item] = out.porUso[seccion + '|' + item] || {}
        out.porUso[seccion + '|' + item][key] = Math.max(0, base - nQ)
      }
    }
  }

  out.semanas.sort(_cmpSemana)
  out.claves = out.semanas
  for (var k = 0; k < out.semanas.length; k++) {
    var p = /^S(\d+)\/(\d{4})$/.exec(out.semanas[k])
    out.etiquetas.push('Sem. N°' + p[1])
    out.etiquetasFechas.push(p[1] + ' · ' + _semRango(out.semanas[k]).replace(/ al /g, ' → '))
  }
  return out
}

// Ordena claves "S25/2026" por año y número
function _cmpSemana(a, b) {
  var pa = /^S(\d+)\/(\d{4})$/.exec(a)
  var pb = /^S(\d+)\/(\d{4})$/.exec(b)
  var na = Number(pa[2]) * 1000 + Number(pa[1])
  var nb = Number(pb[2]) * 1000 + Number(pb[1])
  return na - nb
}

// Última cantidad escrita en la semana (recorre Dom→Lun dentro de la fila)
function _ultimoDiaEscrito(filaVals, colDia1) {
  for (var d = 6; d >= 0; d--) {
    var v = filaVals[colDia1 + d]
    if (v !== '' && v !== null && v !== undefined) return v
  }
  return ''
}

// Fechas DD/MM de cada día de la semana clave (para cabeceras de la hoja SEMANA)
function _fechasDeSemana(key) {
  var p = /^S(\d+)\/(\d{4})$/.exec(key)
  if (!p) return REV_ABREV_DIAS.slice()
  var lunes = _lunesDe(new Date(Number(p[2]), 0, 1))
  lunes.setDate(lunes.getDate() + (Number(p[1]) - 1) * 7)
  var out = []
  for (var d = 0; d < 7; d++) {
    var f = new Date(lunes)
    f.setDate(f.getDate() + d)
    out.push(_ddmm(f))
  }
  return out
}

// Fecha corta "dd/mm" (para cabeceras compactas que no se corten en el PDF)
function _ddmm(d) {
  return ('0' + d.getDate()).slice(-2) + '/' + ('0' + (d.getMonth() + 1)).slice(-2)
}

function _qtyPara(datos, seccion, item, key) {
  if (!key) return ''
  var mapa = datos.porSeccion[seccion + '|' + item]
  if (mapa && key in mapa) return mapa[key]
  return ''
}

function _usoPara(datos, seccion, item, key) {
  if (!key) return ''
  var mapa = datos.porUso[seccion + '|' + item]
  if (mapa && key in mapa) return mapa[key]
  return ''
}

// Meses CON REGISTROS (MM/AAAA) ordenados, sin rellenar meses vacíos. Es la
// base para saber hasta qué mes hay datos reales ("— Automático —").
function _mesesConDatos() {
  var sh = _ss().getSheetByName(HOJA.revisiones)
  var out = []
  if (!sh) return out
  var ultima = _ultimaFilaDatos(sh, REV.item, REV_FILA_DATOS)
  if (ultima < REV_FILA_DATOS) return out
  var vals = sh.getRange(REV_FILA_DATOS, REV.fecha, ultima - REV_FILA_DATOS + 1, 1).getValues()
  var visto = {}
  for (var i = 0; i < vals.length; i++) {
    var s = _fechaTexto(vals[i][0])
    if (s.length === 10) {
      var m = s.slice(3)
      if (!visto[m]) { visto[m] = true; out.push(m) }
    }
  }
  return out.sort()
}

// Último mes que tiene registros (o null si no hay ninguno)
function _ultimoMesConDatos() {
  var d = _mesesConDatos()
  return d.length ? d[d.length - 1] : null
}

// Meses disponibles en los dropdowns (MM/AAAA) ordenados: TODOS los meses del
// calendario entre el primer mes con registros y el mes actual. Incluye meses
// sin revisar, para poder imprimir o construir el informe de un mes que aún
// no se revisó a tiempo.
function _mesesDisponibles() {
  var base = _mesesConDatos()
  if (!base.length) return []
  var p = base[0].split('/')
  var it = new Date(Number(p[1]), Number(p[0]) - 1, 1)
  var h = _hoy()
  var fin = new Date(h.getFullYear(), h.getMonth(), 1)
  var out = []
  while (it <= fin) {
    out.push(('0' + (it.getMonth() + 1)).slice(-2) + '/' + it.getFullYear())
    it = new Date(it.getFullYear(), it.getMonth() + 1, 1)
  }
  return out
}

// Claves "Sxx/AAAA" de TODAS las semanas del mes según el calendario: se
// recorren los días del mes y se juntan las claves de cada semana que toca el
// mes (4, 5 o 6 columnas según el mes). Es la base para marcar "PEND." las
// semanas del mes que todavía no se revisaron en el PDF mensual.
function _semanasCalendarioDelMes(mes) {
  var p = /^(\d{2})\/(\d{4})$/.exec(mes)
  if (!p) return []
  var anio = Number(p[2]), mesN = Number(p[1])
  var visto = {}, out = []
  for (var d = 1; d <= 31; d++) {
    var f = new Date(anio, mesN - 1, d)
    if (f.getMonth() !== mesN - 1) break
    var key = _semKey(f)
    if (/^S\d+\/\d{4}$/.test(key) && !visto[key]) { visto[key] = true; out.push(key) }
  }
  return out
}

// Semanas con datos: [{ key, num, anio, fecha, rango }] ordenadas
function _semanasDisponibles() {
  var sh = _ss().getSheetByName(HOJA.revisiones)
  var out = []
  if (!sh) return out
  var ultima = _ultimaFilaDatos(sh, REV.item, REV_FILA_DATOS)
  if (ultima < REV_FILA_DATOS) return out

  var vals = sh.getRange(REV_FILA_DATOS, 1, ultima - REV_FILA_DATOS + 1, 2).getValues()
  var visto = {}
  for (var i = 0; i < vals.length; i++) {
    var key = String(vals[i][1] || '').trim()
    var p = /^S(\d+)\/(\d{4})$/.exec(key)
    if (!p || visto[key]) continue
    visto[key] = true
    out.push({ key: key, num: Number(p[1]), anio: Number(p[2]), fecha: String(vals[i][0] || '').trim(), rango: _semRango(key) })
  }
  out.sort(function (a, b) { return a.anio * 1000 + a.num - (b.anio * 1000 + b.num) })
  return out
}

function _etiquetasVacias(n) {
  var out = []
  for (var i = 0; i < n; i++) out.push('Sem. N°__')
  return out
}

function _etiquetasFechasVacias(n) {
  var out = []
  for (var i = 0; i < n; i++) out.push('____ → ____')
  return out
}

function _clavesVacias(n) {
  var out = []
  for (var i = 0; i < n; i++) out.push('')
  return out
}

// ─── Días elegidos para el informe semanal ───────────────────────────────────
// Devuelve un array de índices 0..6 ordenados (0 = Lunes … 6 = Domingo).
// Fuente principal: las casillas ✓ de la hoja CONFIG (el usuario marca los
// días). Si aún no hay casillas, se interpreta el texto de la columna Valor:
// "Todos", "Domingo", "Lun, Sáb", "1,7" o "Lun a Sáb" (sin acentos/puntos).
function _diasDesdeTexto(cfg) {
  cfg = String(cfg || '').trim().toLowerCase()
  if (!cfg || cfg === 'todos' || cfg === 'todas') {
    var todo = []
    for (var t0 = 0; t0 < 7; t0++) todo.push(t0)
    return todo
  }
  var sinTildes = function (s) { return s.replace(/á/g, 'a').replace(/é/g, 'e').replace(/í/g, 'i').replace(/ó/g, 'o').replace(/ú/g, 'u') }
  var alias = {}
  for (var i = 0; i < 7; i++) {
    alias[sinTildes(REV_NOMBRES_DIAS[i]).toLowerCase()] = i
    alias[sinTildes(REV_ABREV_DIAS[i]).toLowerCase()] = i
  }
  cfg = sinTildes(cfg).replace(/[–—/]/g, ',').replace(/\ba\b/g, ',').replace(/\s+/g, ' ')
  var partes = cfg.split(/[\s,·;]+/)
  var out = []
  for (var p = 0; p < partes.length; p++) {
    var tok = partes[p].trim().toLowerCase().replace(/\.+$/, '')
    if (!tok) continue
    var idx = -1
    if (tok in alias) idx = alias[tok]
    else {
      var num = parseInt(tok, 10)
      if (!isNaN(num) && num >= 1 && num <= 7) idx = num - 1
    }
    if (idx >= 0 && out.indexOf(idx) < 0) out.push(idx)
  }
  if (!out.length) {
    for (var t1 = 0; t1 < 7; t1++) out.push(t1)
  }
  return out.sort(function (a, b) { return a - b })
}

function _diasInforme() {
  var marcados = _diasMarcadosDesde(_ss().getSheetByName(HOJA.config))
  if (marcados) return marcados
  return _diasDesdeTexto(_configValor('Días del informe semanal'))
}

// ─── HOJA SEMANAL ────────────────────────────────────────────────────────────
// La revisión de UNA semana con sus cantidades (para imprimir y firmar)
// `opc` (opcional) = opciones de personalización:
// 'encabezado' · 'resumen' · 'hora' · 'fechas' · 'uso' · 'alerta' · 'obs'
// · 'firmas' · 'vaciarceldas'
function _construirHojaSemanal(key, opc) {
  opc = opc || {}
  var sh = _hojaImpresion(HOJA.semana, HOJA_ORDEN.semana)
  sh.clear()
  sh.clearFormats()
  _descombinar(sh)
  _sinCuadricula(sh)
  _pintarPestana(HOJA.semana, C.tabSemana)

  var conUso = _opcValor(opc, 'uso', 'semanal')
  var conAlerta = _opcValor(opc, 'alerta', 'semanal')
  var conObs = _opcValor(opc, 'obs', 'semanal')
  var conFirmas = _opcValor(opc, 'firmas', 'semanal') !== false
  var tail = (conUso ? 1 : 0) + (conAlerta ? 1 : 0) + (conObs ? 1 : 0)

  var fila = 1
  // Días que se imprimen en el informe semanal: según CONFIG 'Días del
  // informe semanal' (por defecto los 7; ej. "Domingo" si solo se revisa ese
  // día). El cálculo del USO siempre usa la semana completa.
  var diasSel = _diasInforme()
  var nDias = diasSel.length
  var cols = 6 + nDias + tail   // N° + 5 campos + días + columnas opcionales
  var fechasFull = _fechasDeSemana(key)
  var fechas = []
  for (var fi = 0; fi < diasSel.length; fi++) fechas.push(fechasFull[diasSel[fi]])

  if (_opcValor(opc, 'encabezado', 'semanal') !== false) {
    // Encabezado (banda verde institucional)
    sh.getRange(fila, 1).setValue(TITULO_SEMANAL)
    sh.getRange(fila, 1, 1, cols).merge()
    sh.getRange(fila, 1).setFontSize(12).setFontWeight('bold').setFontColor('#ffffff').setBackground(C.primario)
    sh.getRange(fila, 1).setHorizontalAlignment('center').setVerticalAlignment('middle')
    sh.setRowHeight(fila, 26)
    fila++

    var p = /^S(\d+)\/(\d{4})$/.exec(key)
    var txtSemana = p ? 'SEMANA N° ' + p[1] + ' — DEL ' + _semRango(key).toUpperCase() : 'SEMANA: ' + key
    sh.getRange(fila, 1).setValue(txtSemana)
    sh.getRange(fila, 1, 1, cols).merge()
    sh.getRange(fila, 1).setFontSize(11).setFontWeight('bold').setFontColor('#ffffff').setBackground(C.aviso)
    sh.getRange(fila, 1).setHorizontalAlignment('center').setVerticalAlignment('middle')
    sh.setRowHeight(fila, 20)
    fila++

    var est = _configValor('Establecimiento') || 'CESFAM San Juan'
    var disp = _configValor('Dispositivo (carro de paro)') || 'Carro de paro'
    sh.getRange(fila, 1).setValue('Establecimiento: ' + est + '   |   Dispositivo: ☐ ' + disp + ' ☐ ' + (_configValor('Dispositivo alternativo (móvil)') || 'Carro móvil'))
    sh.getRange(fila, 1, 1, cols).merge()
    sh.getRange(fila, 1).setFontSize(9).setFontWeight('bold')
    sh.getRange(fila, 1, 1, cols).setBorder(true, false, false, false, false, false, C.primario, SpreadsheetApp.BorderStyle.SOLID)
    sh.setRowHeight(fila, 16)
    fila++
  }

  if (_opcValor(opc, 'hora', 'semanal') !== false) {
    sh.getRange(fila, 1).setValue('HORA DE LA REVISIÓN: ____:____      REVISADO POR: ______________________')
    sh.getRange(fila, 1, 1, cols).merge()
    sh.getRange(fila, 1).setFontSize(10).setFontWeight('bold').setFontColor(C.primario)
    sh.setRowHeight(fila, 18)
    fila++
  }

  var datosSem = _datosDeSemana(key)

  var farmacos = _leerFarmacos()
  var insumos = _leerInsumos()
  var anchoForma = _anchoSegunTexto(farmacos, 'forma', 85, 170, 8.5)
  // Columna 2 (Reg. ISP en FÁRMACOS / nombre en INSUMOS) y columna 3
  // (Medicamento en FÁRMACOS / Cant. base en INSUMOS): ancho ajustado al
  // texto REAL más largo para que ningún nombre quede cortado.
  var anchoNom2 = Math.max(_anchoSegunTexto(farmacos, 'isp', 90, 240, 9),
                           _anchoSegunTexto(insumos, 'nom', 90, 240, 9))
  var anchoNom3 = Math.max(_anchoSegunTexto(farmacos, 'med', 150, 320, 9), 100)
  // Altura uniforme de las filas: suficiente para los nombres más largos
  // aunque envuelvan en dos líneas (nada se corta).
  var altoFilas = _altoFilaLineas(_lineasNombreMax(farmacos, insumos, Math.min(anchoNom2, anchoNom3)))
  var anchosFin = _anchosSemanal(tail, conUso, conAlerta, conObs, anchoForma, anchoNom2, anchoNom3, nDias)

  // Paginación del PDF semanal: capacidad real por página (según el papel
  // elegido en CONFIG) y páginas totales del documento ("Hoja N de M").
  var capSem = _filasPorPaginaSemanal(anchosFin, _papelConfig(), altoFilas)
  var nCF = Math.max(1, Math.ceil(farmacos.length / capSem))
  var nCI = Math.max(1, Math.ceil(insumos.length / capSem))
  var ultI = insumos.length - (nCI - 1) * capSem
  var filasBloque = (conObs ? 6 : 1) + (conFirmas ? 6 : 1)
  var pagSem = nCF + nCI + (ultI + filasBloque > capSem ? 1 : 0)

  // Banda resumen de la semana: completitud y alertas (como la solapa)
  if (_opcValor(opc, 'resumen', 'semanal') !== false) {
    var resumen = _resumenSemanalPDF(datosSem, farmacos.length, insumos.length)
    sh.getRange(fila, 1, 1, cols).merge()
    sh.getRange(fila, 1).setValue(resumen.texto)
    sh.getRange(fila, 1).setFontSize(9).setFontWeight('bold').setFontColor(resumen.fg)
    sh.getRange(fila, 1).setBackground(resumen.bg).setVerticalAlignment('middle').setHorizontalAlignment('center')
    sh.getRange(fila, 1, 1, cols).setBorder(true, true, false, true, true, true, C.borde, SpreadsheetApp.BorderStyle.SOLID)
    sh.setRowHeight(fila, 16)
    fila++
  }

  fila = _tablaSemanal(sh, fila, farmacos, 'FÁRMACOS', C.primario,
    ['N°', 'Reg. ISP', 'Medicamento', 'Forma', 'Base', 'Mín.'],
    ['isp', 'med', 'forma', 'base', 'min'], datosSem, 'FÁRMACOS', fechas, opc,
    { por: capSem, inicio: 1, total: pagSem, alto: altoFilas }, diasSel)

  // Cada sección empieza en una página nueva (numeración "Hoja N de M" exacta)
  try { sh.insertPageBreaks([fila]) } catch (e) { }

  fila = _tablaSemanal(sh, fila, insumos, 'INSUMOS CLÍNICOS', C.azul,
    ['N°', 'Insumo', 'Cant. base', 'Mín.', 'Venc.'],
    ['nom', 'base', 'min', 'vto'], datosSem, 'INSUMOS', fechas, opc,
    { por: capSem, inicio: nCF + 1, total: pagSem, alto: altoFilas }, diasSel)

  // Observaciones, firmas (nombre/firma/timbre) y fecha de impresión
  fila = _bloqueFirmas(sh, fila, cols, 'OBSERVACIONES DE LA SEMANA', opc)
  if (ultI + filasBloque > capSem) fila = _piePagina(sh, fila, cols, pagSem, pagSem)

  _asegurarFilas(sh, fila + 2)
  _configurarImpresion(sh, anchosFin)
  // Recorta filas y columnas sobrantes de corridas anteriores (blanco a la
  // derecha / páginas vacías en el PDF).
  _recortarHoja(sh, fila, cols)
  if (_opcValor(opc, 'vaciarceldas', 'semanal')) _vaciarRellenos(sh)
}

// Ancho sugerido (px) para una columna de texto según su contenido REAL: se
// mide el texto más largo y se asigna el ancho justo (con tope), para que
// nada salga cortado en el PDF (ej.: la forma farmacéutica en la columna
// "Forma"). El factor es px por carácter: ~8.5 para fuente 10 y ~9 si es en
// negrita. Devuelve `minimo` si la lista está vacía o no tiene el campo.
function _anchoSegunTexto(items, campo, minimo, maximo, factor) {
  var mn = minimo || 60, mx = maximo || 150
  var px = factor || 8.5
  var mejor = mn
  for (var i = 0; i < items.length; i++) {
    var t = String(items[i][campo] || '')
    if (t === '') continue
    var w = Math.ceil(t.length * px)   // px por carácter según la fuente real
    if (w > mejor) mejor = w
  }
  return Math.min(mx, mejor)
}

// Líneas de texto que necesitarían los nombres MÁS LARGOS del catálogo
// (FÁRMACOS col 'med', INSUMOS col 'nom') al mostrarse en una columna de
// `anchoCol` px. Sirve para dimensionar la ALTURA de las filas de datos: así
// ningún nombre queda cortado aunque deba envolver en dos líneas. Se usa la
// columna de nombre más angosta para cubrir el peor caso.
function _lineasNombreMax(farmacos, insumos, anchoCol) {
  var a = _anchoSegunTexto(farmacos, 'med', 0, 99999, 9)
  var b = _anchoSegunTexto(insumos, 'nom', 0, 99999, 9)
  if (anchoCol <= 0) return 1
  var maxPx = Math.max(a, b)
  return Math.max(1, Math.min(4, Math.ceil((maxPx * 1.05) / anchoCol)))
}

// Altura de fila (px) según las líneas de texto de los nombres: 1 línea = 19,
// 2 líneas = 32, etc. Filas uniformes para que la paginación "Hoja N de M"
// siga coincidiendo con la página física.
function _altoFilaLineas(lineas) {
  return lineas <= 1 ? 19 : lineas * 14 + 4
}

// Anchos para la hoja semanal: reparto equilibrado para que con A4 +
// ajustar al ancho la escala quede cerca de 1:1 y NINGUNA columna se corte
// (antes ALERTA/por vencer salían recortadas porque el total era muy ancho).
// La columna 2 es el nombre en INSUMOS y el Reg. ISP en FÁRMACOS. La columna
// "Forma" se ajusta sola según los textos reales (anchoForma).
// Ajusta el ancho de TODAS las columnas para que el PDF SIEMPRE ocupe el
// máximo horizontal de la hoja: si el ancho total del contenido es menor que
// el ancho imprimible del papel (márgenes descontados), el sobrante se
// reparte entre las columnas. Así "ajustar al ancho" queda en escala 1:1 y
// nunca hay espacio en blanco a la derecha, aunque los nombres sean cortos.
function _expandirAnchoImprimible(anchos) {
  if (!anchos || !anchos.length) return anchos
  var imp = _imprimiblePx(_papelConfig())
  var total = 0
  for (var i = 0; i < anchos.length; i++) total += anchos[i][1]
  var faltante = Math.ceil(imp[0] * 1.001 - total)
  if (faltante <= 0) return anchos
  var base = Math.floor(faltante / anchos.length)
  var resto = faltante % anchos.length
  for (var j = 0; j < anchos.length; j++) {
    anchos[j][1] += base + (j < resto ? 1 : 0)
  }
  return anchos
}

// Anchos para la hoja semanal: reparto para aprovechar el ancho imprimible
// (A4 ≈ 736 px a 96 dpi): los NOMBRES llevan el ancho justo según su texto
// real (nada se corta), los números y días quedan centrados y ALERTA holgada.
// FÁRMACOS tiene 6 columnas base (N°, ISP, Med, Forma, Base, Mín.) e INSUMOS
// 5 (N°, Insumo, Cant. base, Mín., Venc.), por lo que ambas tablas comparten
// columnas físicas DESFASADAS: los anchos se asignan POR ÍNDICE tomando el
// MÁXIMO entre lo que necesita cada sección en esa columna. Así la columna
// ALERTA de INSUMOS nunca queda apretada por la columna USO de FÁRMACOS
// (antes recibía 42 px y "REPONER"/"POR VENCER" se cortaban).
function _anchosSemanal(tail, conUso, conAlerta, conObs, anchoForma, anchoNom2, anchoNom3, nDias) {
  nDias = nDias || 7
  var maxBase = 6
  var totCol = maxBase + nDias + tail
  var anchos = []
  for (var c = 1; c <= totCol; c++) anchos.push([c, 46])
  anchos[0][1] = 26                                // N°
  anchos[1][1] = anchoNom2 || 100                  // ISP (F) / Insumo (I)
  anchos[2][1] = anchoNom3 || 150                  // Medicamento (F)
  anchos[3][1] = anchoForma || 100                 // Forma (F)
  anchos[4][1] = 52                                // Base (F) / Venc. (I)
  anchos[5][1] = 52                                // Mín. (F) / día 1 (I)
  // Columnas de cierre por sección: la posición depende de su n° de columnas
  // base (6 FÁRMACOS / 5 INSUMOS); cada columna física toma el máximo pedido.
  for (var s = 0; s < 2; s++) {
    var nB = s === 0 ? 6 : 5
    var pos = nB + nDias
    if (conUso) { pos++; anchos[pos - 1][1] = Math.max(anchos[pos - 1][1], 42) }
    if (conAlerta) { pos++; anchos[pos - 1][1] = Math.max(anchos[pos - 1][1], 116) }
    if (conObs) { pos++; anchos[pos - 1][1] = Math.max(anchos[pos - 1][1], 90) }
  }
  return _expandirAnchoImprimible(anchos)
}

// Datos de UNA semana: { porSeccion: { 'SECCIÓN|ítem': { dias, base, alerta } } }
// dias = las 7 cantidades Lun..Dom ('' si ese día no se registró)
function _datosDeSemana(key) {
  var sh = _ss().getSheetByName(HOJA.revisiones)
  var out = { porSeccion: {} }
  if (!sh) return out
  var ultima = _ultimaFilaDatos(sh, REV.item, REV_FILA_DATOS)
  if (ultima < REV_FILA_DATOS) return out

  var vals = sh.getRange(REV_FILA_DATOS, 1, ultima - REV_FILA_DATOS + 1, REV.hora).getValues()
  for (var i = 0; i < vals.length; i++) {
    if (String(vals[i][1] || '').trim() !== key) continue
    var seccion = String(vals[i][2] || '').trim().toUpperCase()
    var item = String(vals[i][3] || '').trim()
    if (!item) continue
    var dias = []
    for (var d = 0; d < 7; d++) dias.push(vals[i][REV.dia1 - 1 + d])
    out.porSeccion[seccion + '|' + item] = {
      dias: dias,
      base: vals[i][REV.base - 1],
      alerta: vals[i][REV.alerta - 1]
    }
  }
  return out
}

// Resumen de la semana para el encabezado del PDF: { texto, bg, fg }
// Un ítem está "completado" si registró al menos un día; el uso se calcula
// como base − última cantidad de la semana.
function _resumenSemanalPDF(datosSem, nF, nI) {
  var reponer = 0, vencido = 0, porVencer = 0, hechos = 0, uso = 0
  for (var k in datosSem.porSeccion) {
    var d = datosSem.porSeccion[k]
    var ultimo = _ultimoDiaEscrito(d.dias, 0)
    if (ultimo !== '' && ultimo !== null && ultimo !== undefined) {
      hechos++
      var q = Number(ultimo)
      var b = Number(d.base)
      if (!isNaN(q) && !isNaN(b)) uso += Math.max(0, b - q)
    }
    var a = String(d.alerta || '').trim()
    if (a === 'REPONER') reponer++
    else if (a === 'VENCIDO') vencido++
    else if (a === 'POR VENCER') porVencer++
  }
  var total = nF + nI
  var partes = ['COMPLETADOS ' + hechos + ' DE ' + total]
  if (uso) partes.push('USO TOTAL ' + uso)
  if (reponer) partes.push('REPONER ' + reponer)
  if (vencido) partes.push('VENCIDO ' + vencido)
  if (porVencer) partes.push('POR VENCER ' + porVencer)
  var texto = partes.join('   ·   ')
  if (vencido || reponer) return { texto: texto, bg: C.panelAlerta, fg: C.alerta }
  if (porVencer) return { texto: texto, bg: C.panelAviso, fg: C.aviso }
  if (hechos === total) return { texto: texto + '   ·   SEMANA COMPLETA', bg: C.panelOk, fg: C.ok }
  return { texto: texto, bg: C.panelNeutro, fg: C.gris }
}

// ─── Tabla semanal DIARIA (días según CONFIG + uso + alerta + obs) ───────────
// `diasIdx` (opcional) = índices 0..6 de los días a imprimir (por defecto los
// 7). El USO siempre se calcula con la última cantidad de la semana completa.
function _tablaSemanal(sh, fila, items, titulo, color, cabeceras, campos, datosSem, seccion, fechas, opc, pag, diasIdx) {
  opc = opc || {}
  fechas = fechas || _fechasDeSemana('')
  pag = pag || {}
  var porPagina = pag.por || 0
  var inipag = pag.inicio || 1
  var totalPag = pag.total || 1
  var saltos = []

  diasIdx = diasIdx || _diasInforme()
  var nD = diasIdx.length
  var abDias = []
  for (var di = 0; di < nD; di++) abDias.push(REV_ABREV_DIAS[diasIdx[di]])
  var fechasVis = fechas
  if (fechas && fechas.length === 7 && nD !== 7) {
    fechasVis = []
    for (var fz = 0; fz < nD; fz++) fechasVis.push(fechas[diasIdx[fz]])
  }

  // Columnas de cierre según las opciones de personalización
  var conUso = _opcValor(opc, 'uso', 'semanal')
  var conAlerta = _opcValor(opc, 'alerta', 'semanal')
  var conObs = _opcValor(opc, 'obs', 'semanal')
  var verFechas = _opcValor(opc, 'fechas', 'semanal') !== false
  var cabColas = []
  if (conUso) cabColas.push('USO')
  if (conAlerta) cabColas.push('ALERTA')
  if (conObs) cabColas.push('Obs.')

  var totCols = cabeceras.length + nD + cabColas.length

  _banner(sh, fila, totCols, titulo, color, 20); fila++
  _cabecera(sh, fila, cabeceras.concat(abDias, cabColas), color, 22)
  fila++
  // Cabecera secundaria: fecha de cada día bajo su abreviatura
  if (verFechas) {
    var filaSec = []
    for (var z = 0; z < cabeceras.length; z++) filaSec.push('')
    filaSec = filaSec.concat(fechasVis)
    while (filaSec.length < totCols) filaSec.push('')
    sh.getRange(fila, 1, 1, totCols).setValues([filaSec])
    var rf = sh.getRange(fila, cabeceras.length + 1, 1, nD)
    rf.setFontSize(8).setFontColor('#ffffff').setBackground('#7FB3D5')
    rf.setHorizontalAlignment('center').setVerticalAlignment('middle')
    sh.setRowHeight(fila, 16)
    fila++
  }

  if (items.length === 0) {
    _txt(sh, fila, 1, '(Lista vacía — cargue el maestro ' + seccion + ')', { color: C.gris, size: 9 })
    return fila + 1
  }

  var filaIni = fila
  for (var i = 0; i < items.length; i++) {
    if (porPagina > 0 && i > 0 && i % porPagina === 0) {
      // Cierra la página con su pie y abre la siguiente con el encabezado de
      // la sección repetido (salto de página real).
      fila = _piePagina(sh, fila, totCols, inipag + Math.floor(i / porPagina) - 1, totalPag)
      saltos.push(fila)
      _banner(sh, fila, totCols, titulo, color, 20); fila++
      _cabecera(sh, fila, cabeceras.concat(abDias, cabColas), color, 22); fila++
      if (verFechas) {
        var filaSec2 = []
        for (var z2 = 0; z2 < cabeceras.length; z2++) filaSec2.push('')
        filaSec2 = filaSec2.concat(fechasVis)
        while (filaSec2.length < totCols) filaSec2.push('')
        sh.getRange(fila, 1, 1, totCols).setValues([filaSec2])
        sh.getRange(fila, cabeceras.length + 1, 1, nD).setFontSize(8).setFontColor('#ffffff').setBackground('#7FB3D5')
        sh.getRange(fila, cabeceras.length + 1, 1, nD).setHorizontalAlignment('center').setVerticalAlignment('middle')
        sh.setRowHeight(fila, 16)
        fila++
      }
    }
    var row = items[i]
    var datos = datosSem.porSeccion[seccion + '|' + (row.med || row.nom)]

    var valores = [row.num]
    for (var c = 0; c < campos.length; c++) valores.push(row[campos[c]])
    // Solo los días elegidos (mismo orden que en la cabecera): el dato de un
    // día no escrito sale en blanco.
    for (var dv = 0; dv < nD; dv++) {
      var vd = ''
      if (datos) {
        var raw = datos.dias[diasIdx[dv]]
        if (raw !== '' && raw !== null && raw !== undefined) vd = raw
      }
      valores.push(vd)
    }
    if (conUso) {
      var uso = ''
      if (datos) {
        var ultimo = _ultimoDiaEscrito(datos.dias, 0)
        if (ultimo !== '' && ultimo !== null && ultimo !== undefined) {
          var q = Number(ultimo)
          var b = Number(datos.base)
          if (!isNaN(q) && !isNaN(b)) {
            uso = Math.max(0, b - q)
            if (uso === 0) uso = ''   // sin consumo: celda limpia, no "0"
          }
        }
      }
      valores.push(uso)
    }
    if (conAlerta) valores.push(datos ? datos.alerta : '')
    if (conObs) valores.push('')

    var rango = sh.getRange(fila, 1, 1, valores.length)
    rango.setValues([valores])
    // Fuerza formato de NÚMERO en las columnas numéricas (N°, Base/Mín., los 7
    // días y USO): evita que valores grandes se muestren como fechas si la
    // columna arrastrara un formato de fecha de una corrida anterior.
    var fmtNum = []
    for (var fx = 1; fx <= valores.length; fx++) {
      var esNum = (fx === 1) || (fx === cB) || (fx === cMi) ||
                  (fx > cabeceras.length && fx <= cabeceras.length + nD) ||
                  (conUso && fx === cabeceras.length + nD + 1)
      fmtNum.push(esNum ? '0' : '@')
    }
    rango.setNumberFormats([fmtNum])
    rango.setFontSize(10).setVerticalAlignment('middle')
    rango.setBorder(false, false, true, false, false, false, C.bordeSuave, SpreadsheetApp.BorderStyle.DOTTED)
    if (i % 2 === 1) rango.setBackground(C.zebra)

    // Números en negrita, más grandes y centrados (N°, Base/Mín., 7 días y
    // USO); el texto (medicamento, forma, alerta) queda a la izquierda y el
    // medicamento/insumo en negrita como en el maestro.
    var cB = 2 + campos.indexOf('base')
    var cMi = 2 + campos.indexOf('min')
    var cNom = 2 + Math.max(campos.indexOf('med'), campos.indexOf('nom'))
    var cNom2 = 2 + campos.indexOf('nom')
    sh.getRange(fila, 1).setFontWeight('bold').setHorizontalAlignment('center').setFontSize(10)
    if (cB > 1) sh.getRange(fila, cB).setFontWeight('bold').setHorizontalAlignment('center').setFontSize(10)
    if (cMi > 1) sh.getRange(fila, cMi).setFontWeight('bold').setHorizontalAlignment('center').setFontSize(10)
    sh.getRange(fila, cabeceras.length + 1, 1, nD).setFontSize(11).setFontWeight('bold').setHorizontalAlignment('center').setVerticalAlignment('middle')
    var cAux = cabeceras.length + nD + 1
    if (conUso) { sh.getRange(fila, cAux).setFontSize(10).setFontWeight('bold').setHorizontalAlignment('center'); cAux++ }
    if (conAlerta) { sh.getRange(fila, cAux).setFontSize(10).setHorizontalAlignment('center'); cAux++ }
    if (conObs) sh.getRange(fila, cAux).setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP)
    if (cNom > 1 && cNom < cabeceras.length + 1) {
      sh.getRange(fila, cNom).setFontWeight('bold').setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP)
    }
    if (cNom2 > 1 && cNom2 < cabeceras.length + 1) {
      sh.getRange(fila, cNom2).setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP)
    }
    sh.setRowHeight(fila, pag.alto || 19)
    fila++
  }

  // Pie de la última página de la sección
  if (porPagina > 0) {
    fila = _piePagina(sh, fila, totCols, inipag + Math.floor((items.length - 1) / porPagina), totalPag)
  }
  try { sh.insertPageBreaks(saltos) } catch (e) { }

  sh.getRange(filaIni, 1, fila - filaIni, totCols).setBorder(true, true, true, true, true, true, C.borde, SpreadsheetApp.BorderStyle.SOLID)
  return fila
}

// ─── Observaciones, firmas (nombre/firma/TIMBRE) y pie de impresión ──────────
// Tres firmantes en tarjetas de una sola línea de alto (evita saltos de página
// feos): ENCARGADO DEL REGISTRO · ENCARGADO DE LA UNIDAD · DIRECCIÓN.
// Rótulos genéricos: el cargo real depende de cada establecimiento (nunca se
// asume "TENS" por defecto). Cada tarjeta muestra NOMBRE, FIRMA y TIMBRE.
// Al final, fecha y hora exactas de impresión (documentos oficiales).
function _bloqueFirmas(sh, fila, cols, titulo, opc) {
  opc = opc || {}
  titulo = titulo || 'OBSERVACIONES GENERALES'
  var conObs = _opcValor(opc, 'obs', 'semanal') !== false
  var conFirmas = _opcValor(opc, 'firmas', 'semanal') !== false

  // ── Observaciones ─────────────────────────────────────────────────────
  if (conObs) {
    fila++
    var rT = sh.getRange(fila, 1, 1, cols).merge()
    rT.setValue(titulo)
    rT.setFontSize(10).setFontWeight('bold').setFontColor('#ffffff').setBackground(C.gris)
    rT.setVerticalAlignment('middle')
    sh.setRowHeight(fila, 22)
    fila++
    for (var i = 0; i < 3; i++) {
      sh.getRange(fila, 1, 1, cols).setBorder(true, true, true, true, true, true, C.borde, SpreadsheetApp.BorderStyle.SOLID)
      sh.setRowHeight(fila, 22)
      fila++
    }
    fila++
  }

  if (conFirmas) {
  // ── Tarjetas de firmas (tres firmantes en columnas) ────────────────────
  var resp = _configValor('Responsable del registro')
  var cargoResp = _configValor('Cargo del responsable del registro')
  var enc = _configValor('Encargado de la unidad')
  var cargoEnc = _configValor('Cargo del encargado')
  var dir = _configValor('Director(a) del establecimiento')

  var tarjetas = [
    { rotulo: 'ENCARGADO DEL REGISTRO', nombre: resp, cargo: cargoResp, color: C.primario },
    { rotulo: 'ENCARGADO DE LA UNIDAD', nombre: enc, cargo: cargoEnc, color: C.aviso },
    { rotulo: 'DIRECCIÓN', nombre: dir, cargo: '', color: C.azul }
  ]

  // Divide el ancho en 3 segmentos y luego los IGUALA EN PÍXELES (con 13 o 16
  // columnas la tabla no parte en tercios exactos y antes quedaba 5/4/4 o
  // 6/5/5 → tarjetas desiguales). Se reparte la diferencia ajustando la última
  // columna de cada tarjeta; el ancho total no cambia, así que 'ajustar al
  // ancho de página' mantiene la misma escala.
  var seg = Math.floor(cols / 3)
  var sobra = cols - seg * 3
  var segs = []
  for (var t = 0; t < tarjetas.length; t++) {
    var ancho = seg + (t < sobra ? 1 : 0)
    var ini = t * seg + (t < sobra ? t : sobra) + 1
    var fin = ini + ancho - 1
    if (fin < ini) fin = ini
    segs.push({ ini: ini, fin: fin })
  }
  var anchoPx = []
  for (var s2 = 0; s2 < segs.length; s2++) {
    var suma = 0
    for (var cj = segs[s2].ini; cj <= segs[s2].fin; cj++) suma += sh.getColumnWidth(cj)
    anchoPx.push(suma)
  }
  var totPx = anchoPx[0] + anchoPx[1] + anchoPx[2]
  var meta = totPx / 3
  for (var s3 = 0; s3 < segs.length; s3++) {
    var dif = Math.round(meta - anchoPx[s3])
    if (dif === 0) continue
    var cActual = sh.getColumnWidth(segs[s3].fin)
    sh.setColumnWidth(segs[s3].fin, Math.max(25, cActual + dif))
  }

  // Iguala EXACTAMENTE el recuadro del TIMBRE (las 2 columnas fin-1 y fin de
  // cada tarjeta) en las 3 tarjetas: antes el del responsable salía más ancho
  // porque sus columnas eran más anchas que las de las otras tarjetas. La
  // diferencia se compensa en la columna de la FIRMA (fin-2), conservando el
  // ancho total de cada tarjeta y de la página.
  var okBox = true
  for (var b0 = 0; b0 < 3; b0++) if (segs[b0].fin - segs[b0].ini < 3) okBox = false
  if (okBox) {
    var boxW = []
    for (var b1 = 0; b1 < 3; b1++) {
      boxW.push(sh.getColumnWidth(segs[b1].fin - 1) + sh.getColumnWidth(segs[b1].fin))
    }
    var target = Math.round((boxW[0] + boxW[1] + boxW[2]) / 3)
    for (var b = 0; b < 3; b++) {
      var delta = target - boxW[b]
      if (delta === 0) continue
      var wIni = sh.getColumnWidth(segs[b].fin - 1)
      var nuevo = Math.max(20, wIni + delta)
      sh.setColumnWidth(segs[b].fin - 1, nuevo)
      var aplicado = nuevo - wIni
      if (aplicado !== delta) delta = aplicado
      var wFirma = sh.getColumnWidth(segs[b].fin - 2)
      sh.setColumnWidth(segs[b].fin - 2, Math.max(20, wFirma - delta))
    }
  }

  for (var t2 = 0; t2 < segs.length; t2++) {
    var ini = segs[t2].ini
    var fin = segs[t2].fin
    var etiqueta = tarjetas[t2].rotulo + (tarjetas[t2].cargo ? '  ·  ' + tarjetas[t2].cargo : '')

    // Rótulo del cargo (mayúsculas, fondo de color)
    var rR = sh.getRange(fila, ini, 1, fin - ini + 1).merge()
    rR.setValue(etiqueta)
    rR.setFontSize(11).setFontWeight('bold').setFontColor('#ffffff').setBackground(tarjetas[t2].color)
    rR.setVerticalAlignment('middle').setHorizontalAlignment('center')
    sh.setRowHeight(fila, 22)
    fila++

    // Nombre del responsable
    var nombreTxt = tarjetas[t2].nombre ? tarjetas[t2].nombre : '______________________'
    var rN = sh.getRange(fila, ini, 1, fin - ini + 1).merge()
    rN.setValue('NOMBRE: ' + nombreTxt)
    rN.setFontSize(11).setFontWeight('bold').setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP)
    rN.setVerticalAlignment('middle').setHorizontalAlignment('left')
    sh.setRowHeight(fila, 32)
    fila++

    // Firma (izquierda) y TIMBRE (recuadro propio), en una fila alta
    if (fin - ini >= 3) {
      var rF = sh.getRange(fila, ini, 1, fin - 1 - ini).merge()
      rF.setValue('FIRMA: ______________________')
      rF.setFontSize(11).setFontWeight('bold').setHorizontalAlignment('left').setVerticalAlignment('middle')
      rF.setBorder(true, true, true, true, true, true, C.borde, SpreadsheetApp.BorderStyle.SOLID)
      var rT = sh.getRange(fila, fin - 1, 1, 2).merge()
      rT.setValue('TIMBRE')
      rT.setFontSize(11).setFontWeight('bold').setHorizontalAlignment('center').setVerticalAlignment('middle')
      rT.setBorder(true, true, true, true, true, true, C.borde, SpreadsheetApp.BorderStyle.SOLID)
      sh.setRowHeight(fila, 48)
    } else {
      var rU = sh.getRange(fila, ini, 1, fin - ini + 1).merge()
      rU.setValue('FIRMA: ______________________     TIMBRE:')
      rU.setFontSize(11).setFontWeight('bold').setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP)
      rU.setBorder(true, true, true, true, true, true, C.borde, SpreadsheetApp.BorderStyle.SOLID)
      sh.setRowHeight(fila, 48)
    }
    fila++
  }

  // ── Pie de impresión (fecha y hora exactas de generación) ───────────────
  fila++
  var ahora = _hoy()
  var rP = sh.getRange(fila, 1, 1, cols).merge()
  rP.setValue('FECHA DE IMPRESIÓN: ' + _fmt(ahora) + '  a las  ' + _hora(ahora))
  rP.setFontSize(8).setFontColor(C.gris).setVerticalAlignment('middle').setHorizontalAlignment('center')
  rP.setBackground(C.panelNeutro)
  rP.setBorder(true, true, true, true, true, true, C.bordeSuave, SpreadsheetApp.BorderStyle.SOLID)
  sh.setRowHeight(fila, 16)
  fila++

  var pie = _configValor('Pie de página de impresiones')
  if (pie) {
    var rO = sh.getRange(fila, 1, 1, cols).merge()
    rO.setValue(pie)
    rO.setFontSize(8).setFontColor(C.gris).setFontStyle('italic')
    rO.setVerticalAlignment('middle').setHorizontalAlignment('center')
    sh.setRowHeight(fila, 16)
    fila++
  }
  }  // fin de firmas
  return fila
}

// ─── Configuración de impresión (papel según CONFIG, vertical, ajustado) ─────
function _configurarImpresion(sh, anchos) {
  try { sh.removePageBreaks() } catch (e) { }
  try {
    var ps = sh.getPageSetup()
    var _papel = _papelConfig()
    if (_papel && _papel.pageSize !== undefined) ps.setPaperSize(_papel.pageSize)
    ps.setOrientation(SpreadsheetApp.Orientation.PORTRAIT)
    ps.setFitToWidth(1)
    ps.setFitToHeight(0)
    ps.setGridlines(false)
    ps.setHeadings(false)
    ps.setCenterHorizontally(true)
    ps.setMarginTop(22).setMarginBottom(26).setMarginLeft(20).setMarginRight(20)
    ps.setRowsToRepeatAtTop(3)
  } catch (e) { }
  _anchos(sh, anchos)
}

// Quita las líneas de cuadrícula de forma segura
function _sinCuadricula(sh) {
  try { sh.setShowGridlines(false) } catch (e) {
    try { sh.getPageSetup().setGridlines(false) } catch (e2) { }
  }
}

// ─── VACIADO DE CELDAS DE RELLENO (opción "vaciar celdas en blanco") ─────────
// Cuando la hoja de impresión no tiene datos en alguna celda, el constructor
// deja marcadores de relleno ("Sem. N°__", "____ → ____", "—", guiones…).
// Esta función borra esos marcadores para que el PDF quede limpio.
function _vaciarRellenos(sh) {
  var u = sh.getDataRange().getValues()
  if (u.length === 0) return
  // Se recolectan las coordenadas y se borran de una sola vez (RangeList):
  // antes era una llamada a la API por celda y hacía los PDF mucho más lentos.
  var refs = []
  for (var i = 0; i < u.length; i++) {
    for (var j = 0; j < u[i].length; j++) {
      var v = u[i][j]
      if (typeof v !== 'string') continue
      var t = v.trim()
      if (t === '' || t === '—' || t === '-' || t === '–') continue
      if (/^Sem\.?\s*N°?_+$/.test(t) ||
          /^_+(_|→)+_*$/.test(t) ||
          /^____(_)*$/.test(t) ||
          /^\*+$/.test(t) ||
          /^\.{3,}$/.test(t)) {
        refs.push('R' + (i + 1) + 'C' + (j + 1))
      }
    }
  }
  if (refs.length > 0) {
    try {
      sh.getRangeList(refs).clearContent()
    } catch (e) {
      for (var k = 0; k < refs.length; k++) {
        var p = /^R(\d+)C(\d+)$/.exec(refs[k])
        if (p) sh.getRange(Number(p[1]), Number(p[2])).clearContent()
      }
    }
    Logger.log('_vaciarRellenos: ' + refs.length + ' celdas limpiadas en ' + sh.getName())
  }
}

// ─── INFORME MENSUAL DE REVISIÓN (una columna por cada día del mes) ───────────
// Hoja propia VISIBLE y editável (para archivar como documento): muestra TODOS
// los ítems de FÁRMACOS e INSUMOS con UNA columna de cantidad por cada día del
// mes que corresponda a los días elegidos (por defecto todos los domingos) y,
// a la derecha de cada día, una columna VENC (MM/AAAA) tomada del maestro
// (solo los insumos tienen vencimiento; los fármacos quedan en blanco).
// El contenido se PRECARGA con lo ya registrado en REVISIONES; la hoja queda
// lista para completar a mano y el PDF exporta la hoja tal cual está.
// `mes` = 'MM/AAAA'. `opc` = opciones de personalización (sin diálogo).
function _construirHojaInforme(mes, opc) {
  opc = opc || {}
  // Hoja VISIBLE (no de impresión): se queda en el libro como documento.
  var sh = _hoja(HOJA.informe, HOJA_ORDEN.informe)

  sh.clear()
  sh.clearFormats()
  _descombinar(sh)
  _sinCuadricula(sh)
  _pintarPestana(HOJA.informe, C.tabInforme)

  var diasSel = _diasInformeRevision()
  var fechas = _fechasDiasDelMes(mes, diasSel)   // fechas Date que caen en los días elegidos
  var nDias = fechas.length

  // Columnas por sección: N° + campos + (día, VENC) por cada fecha del mes.
  var colsF = {}
  var datos = _informeDatosDelMes(mes)   // { porSeccion: {seccion|item: {fechaKey: [d0..d6]} } }

  var farmacos = _leerFarmacos()
  var insumos = _leerInsumos()
  var anchosBase = [[1, 32], [2, 92], [3, 190], [4, 150], [5, 60], [6, 60]]
  var anchos = anchosBase.slice()
  var c = 7
  for (var dd = 0; dd < nDias; dd++) { anchos.push([c, 64]); anchos.push([c + 1, 64]); c += 2 }
  if (nDias === 0) anchos = anchosBase.slice()

  // Encabezado institucional del informe (título propio).
  var fila = _encabezadoInforme(sh, mes, anchos.length)

  fila = _tablaInforme(sh, fila, farmacos, 'FÁRMACOS', C.primario,
    ['N°', 'Reg. ISP', 'Medicamento', 'Forma', 'Base', 'Mín.'],
    ['isp', 'med', 'forma', 'base', 'min'], fechas, datos, 'FÁRMACOS', opc)

  try { sh.insertPageBreaks([fila]) } catch (e) { }

  fila = _tablaInforme(sh, fila, insumos, 'INSUMOS CLÍNICOS', C.azul,
    ['N°', 'Insumo', 'Cant. base', 'Mín.'],
    ['nom', 'base', 'min'], fechas, datos, 'INSUMOS', opc, true)

  // Cierre del informe según "Formato de firmas del informe" (dropdown de
  // CONFIG): el usuario elige entre las tarjetas clásicas (dirección,
  // responsable y encargado de la unidad) o una fila por fecha con su
  // responsable de la inspección (y su propio timbre). Solo se imprime UNO.
  if (_formatoFirmasInforme() === 'tarjetas') {
    fila = _bloqueFirmas(sh, fila, anchos.length, 'OBSERVACIONES DEL MES', opc)
  } else {
    fila = _bloqueResponsablesInspeccion(sh, fila, anchos.length, fechas, opc)
  }

  _asegurarFilas(sh, fila + 2)
  _configurarImpresion(sh, anchos)
  _recortarHoja(sh, fila, anchos.length)
  // El informe es una hoja EDIBLE y de ARCHIVO: nunca se vacían celdas.
}

// ─── FORMATO DE FIRMAS DEL INFORME (dropdown de CONFIG) ─────────────────────
// 'tarjetas' = bloque clásico (dirección, responsable, encargado de la
// unidad, con su timbre cada uno) · 'porfecha' = una fila por cada fecha del
// mes con un solo responsable y su opción propia de timbre. Nunca se imprimen
// los dos a la vez.
function _formatoFirmasInforme() {
  var v = String(_configValor('Formato de firmas del informe') || '').toLowerCase()
  if (v.indexOf('tarjeta') >= 0) return 'tarjetas'
  return 'porfecha'
}

// ─── RESPONSABLE DE LA INSPECCIÓN POR FECHA (timbre propio del informe) ──────
// Formato especial de cierre del informe: una línea por cada fecha del mes
// (cada domingo de la columna) con la fecha completa y, al lado, el espacio
// para el nombre y la firma del responsable de la inspección. El recuadro
// TIMBRE se muestra SOLO si la opción "Timbre por fecha" está activa en el
// diálogo del informe (su selector propio); nunca hay más de un timbre por
// fecha.
function _bloqueResponsablesInspeccion(sh, fila, cols, fechas, opc) {
  opc = opc || {}
  if (!fechas || fechas.length === 0) return fila
  var conResponsable = _opcValor(opc, 'responsables', 'informe')
  var conTimbre = _opcValor(opc, 'timbre', 'informe')
  if (!conResponsable && !conTimbre) return fila

  fila++
  var rT = sh.getRange(fila, 1, 1, cols).merge()
  rT.setValue('RESPONSABLE DE LA INSPECCIÓN')
  rT.setFontSize(10).setFontWeight('bold').setFontColor('#ffffff').setBackground(C.gris)
  rT.setVerticalAlignment('middle').setHorizontalAlignment('center')
  sh.setRowHeight(fila, 22)
  fila++

  for (var i = 0; i < fechas.length; i++) {
    var f = fechas[i].fecha
    var diaNombre = REV_NOMBRES_DIAS[fechas[i].dia] || 'Día'
    var fechaTxt = diaNombre + ' ' + _fmt(f)

    // Columna fija de la fecha (3 columnas).
    var cFecha = sh.getRange(fila, 1, 1, 3)
    cFecha.setValue(fechaTxt)
    cFecha.setFontSize(10).setFontWeight('bold').setBackground(C.panelNeutro)
    cFecha.setBorder(true, true, true, true, true, true, C.bordeSuave, SpreadsheetApp.BorderStyle.SOLID)
    cFecha.setVerticalAlignment('middle').setHorizontalAlignment('center')
    try { cFecha.merge() } catch (e) { }

    // Espacio del responsable: NOMBRE + FIRMA (con o sin timbre según opción).
    var desde = 4
    var hasta = conTimbre ? (cols - 2) : cols
    if (hasta - desde + 1 < 1) hasta = desde
    var cResp = sh.getRange(fila, desde, 1, hasta - desde + 1)
    var txt = (conResponsable ? 'NOMBRE: ______________________   FIRMA: ______________________'
                             : '')
    cResp.setValue(txt)
    cResp.setFontSize(9).setVerticalAlignment('middle').setHorizontalAlignment('left')
    cResp.setBorder(true, true, true, true, true, true, C.borde, SpreadsheetApp.BorderStyle.SOLID)
    try { cResp.merge() } catch (e) { }

    // Recuadro TIMBRE único, solo si la opción propia está activa.
    if (conTimbre && cols - 1 >= 3) {
      var cTimbre = sh.getRange(fila, cols - 1, 1, 2)
      cTimbre.setValue('TIMBRE')
      cTimbre.setFontSize(10).setFontWeight('bold').setBackground(C.panelInfo)
      cTimbre.setVerticalAlignment('middle').setHorizontalAlignment('center')
      cTimbre.setBorder(true, true, true, true, true, true, C.borde, SpreadsheetApp.BorderStyle.SOLID)
      try { cTimbre.merge() } catch (e) { }
    }

    sh.setRowHeight(fila, 32)
    fila++
  }
  return fila
}

// Días que ocupan columna en el informe de revisión (índices 0..6, 0=Lunes)
function _diasInformeRevision() {
  var marcados = _diasMarcadosDesde(_ss().getSheetByName(HOJA.config), 'Días del informe de revisión')
  if (marcados) return marcados
  return _diasDesdeTexto(_configValor('Días del informe de revisión'))
}

// Fechas Date de los días del mes que caen en `dias` (índices 0..6)
function _fechasDiasDelMes(mes, dias) {
  var p = /^(\d{2})\/(\d{4})$/.exec(mes || '')
  if (!p) return []
  var mesN = Number(p[1]), anio = Number(p[2])
  var out = []
  for (var d = 1; d <= 31; d++) {
    var f = new Date(anio, mesN - 1, d)
    if (f.getMonth() !== mesN - 1) break
    if (dias && dias.indexOf(_diaSemana(f)) >= 0) out.push({ fecha: f, dia: _diaSemana(f), dd: _ddmm(f) })
  }
  return out
}

// Datos del mes desde REVISIONES por día. Devuelve:
// { porSeccion: { 'FÁRMACOS|item': { 'dd/mm/aaaa': [d0..d6] } } }
// d0=Lunes … d6=Domingo. La fecha clave usa el ID dd/mm/aaaa de la col A.
function _informeDatosDelMes(mes) {
  var sh = _ss().getSheetByName(HOJA.revisiones)
  var out = { porSeccion: {} }
  if (!sh) return out
  var ultima = _ultimaFilaDatos(sh, REV.item, REV_FILA_DATOS)
  if (ultima < REV_FILA_DATOS) return out

  var vals = sh.getRange(REV_FILA_DATOS, 1, ultima - REV_FILA_DATOS + 1, REV.alerta).getValues()
  for (var i = 0; i < vals.length; i++) {
    var fs = _fechaTexto(vals[i][0])
    if (fs.length !== 10) continue
    if (fs.slice(3) !== mes) continue
    var seccion = _normalizar(vals[i][2])   // 'farmacos' / 'insumos'
    var item = _normalizar(vals[i][3])   // nombre sin tildes (clave estable)
    if (!item) continue
    var matriz = out.porSeccion[seccion + '|' + item] = out.porSeccion[seccion + '|' + item] || {}
    var dias = []
    for (var d = 0; d < 7; d++) dias.push(vals[i][REV.dia1 - 1 + d] === '' || vals[i][REV.dia1 - 1 + d] === null || vals[i][REV.dia1 - 1 + d] === undefined ? '' : vals[i][REV.dia1 - 1 + d])
    matriz[fs] = dias
  }
  return out
}

// Cabecera distintiva del informe (banda verde + banda del mes + datos)
function _encabezadoInforme(sh, mes, cols) {
  var fila = 1
  var r1 = sh.getRange(fila, 1, 1, cols).merge()
  r1.setValue(TITULO_INFORME)
  r1.setFontSize(13).setFontWeight('bold').setFontColor('#ffffff').setBackground(C.primario)
  r1.setHorizontalAlignment('center').setVerticalAlignment('middle')
  sh.setRowHeight(fila, 28)
  fila++
  var r2 = sh.getRange(fila, 1, 1, cols).merge()
  r2.setValue('MES: ' + _nombreMes(mes))
  r2.setFontSize(10).setFontWeight('bold').setFontColor('#ffffff').setBackground(C.aviso)
  r2.setHorizontalAlignment('center').setVerticalAlignment('middle')
  sh.setRowHeight(fila, 20)
  fila++
  var est = _configValor('Establecimiento') || 'CESFAM San Juan'
  var disp = _configValor('Dispositivo (carro de paro)') || 'Carro de paro'
  var disp2 = _configValor('Dispositivo alternativo (móvil)') || 'Carro móvil'
  var r3 = sh.getRange(fila, 1, 1, cols).merge()
  r3.setValue('Establecimiento: ' + est + '    |    Dispositivo: ☐ ' + disp + '  ☐ ' + disp2)
  r3.setFontSize(9).setFontWeight('bold')
  r3.setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP).setVerticalAlignment('middle').setHorizontalAlignment('left')
  r3.setBorder(true, false, false, false, false, false, C.primario, SpreadsheetApp.BorderStyle.SOLID)
  sh.setRowHeight(fila, 18)
  fila++
  return fila
}

// Tabla del informe para una sección: campos fijos + (cantidad, VENC) por día.
// `conVenc` = true solo para INSUMOS (tienen vencimiento en el maestro).
function _tablaInforme(sh, fila, items, titulo, color, cabeceras, campos, fechas, datosPorDia, seccion, opc, conVenc) {
  opc = opc || {}
  var nDias = fechas.length
  var totCols = cabeceras.length + nDias * 2

  // Cabecera principal: columnas fijas + (abrevia. día | VENC) por fecha
  var cab = cabeceras.slice()
  for (var d = 0; d < nDias; d++) { cab.push(REV_ABREV_DIAS[fechas[d].dia]); cab.push('VENC') }

  if (items.length === 0) {
    _banner(sh, fila, totCols, seccion, color, 20); fila++
    _cabecera(sh, fila, cab, color, 20); fila++
    _txt(sh, fila, 1, '(Lista vacía — cargue el maestro ' + seccion + ')', { color: C.gris, size: 9 })
    return fila + 1
  }

  _banner(sh, fila, totCols, seccion, color, 20); fila++
  _cabecera(sh, fila, cab, color, 22); fila++
  // Secundaria: fecha dd/mm bajo la abreviatura (VENC queda sin fecha)
  if (nDias > 0) {
    var fs = []
    for (var z = 0; z < cabeceras.length; z++) fs.push('')
    for (var d2 = 0; d2 < nDias; d2++) { fs.push(fechas[d2].dd); fs.push('') }
    var rf = sh.getRange(fila, 1, 1, totCols)
    rf.setValues([fs])
    var rfDiasCol = []
    for (var d3 = 0; d3 < nDias; d3++) { rfDiasCol.push(cabeceras.length + 1 + d3 * 2) } // col del día
    rf.setFontSize(8)
    for (var x = 0; x < rfDiasCol.length; x++) {
      sh.getRange(fila, rfDiasCol[x]).setFontColor('#FFFFFF').setBackground(C.azul).setHorizontalAlignment('center').setVerticalAlignment('middle').setFontWeight('bold')
    }
    rf.setWrapStrategy(SpreadsheetApp.WrapStrategy.OVERFLOW_CELL)
    sh.setRowHeight(fila, 16)
  } else {
    sh.setRowHeight(fila, 0)   // sin días: fila mínima
  }
  fila++

  var filaIni = fila
  var vencRefs = []
  for (var i = 0; i < items.length; i++) {
    var row = items[i]
    var valores = [row.num]
    for (var ci = 0; ci < campos.length; ci++) valores.push(row[campos[ci]])

    var matriz = datosPorDia[_normalizar(seccion) + '|' + _normalizar(row.med || row.nom)]
    for (var d4 = 0; d4 < nDias; d4++) {
      var dd = fechas[d4].fecha
      var ddKey = _fmt(dd)
      var cant = ''
      if (matriz && matriz[ddKey] && fechas[d4].dia !== undefined) {
        var vRaw = matriz[ddKey][fechas[d4].dia]
        if (vRaw !== '' && vRaw !== null && vRaw !== undefined) cant = vRaw
      }
      valores.push(cant)                                  // cantidad del día
      valores.push(conVenc ? (row.vto || '') : '')        // VENC (solo insumos)
    }

    var rango = sh.getRange(fila, 1, 1, valores.length)
    rango.setValues([valores])
    var fmtNum = []
    for (var fx = 1; fx <= valores.length; fx++) {
      var esNum = (fx === 1) ||
        (campos.indexOf('base') >= 0 && fx === 2 + campos.indexOf('base')) ||
        (campos.indexOf('min') >= 0 && fx === 2 + campos.indexOf('min')) ||
        ((fx - cabeceras.length - 1) % 2 === 0 && fx > cabeceras.length)   // columnas de cantidad de cada día
      fmtNum.push(esNum ? '0' : '@')
    }
    rango.setNumberFormats([fmtNum])
    rango.setFontSize(9).setVerticalAlignment('middle')
    rango.setBorder(false, false, true, false, false, false, C.bordeSuave, SpreadsheetApp.BorderStyle.DOTTED)
    if (i % 2 === 1) rango.setBackground(C.zebra)

    sh.getRange(fila, 1).setFontWeight('bold').setHorizontalAlignment('center')
    var idxNom = campos.indexOf('nom')
    if (idxNom >= 0) {
      sh.getRange(fila, 2 + idxNom).setFontWeight('bold').setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP).setVerticalAlignment('middle')
    } else if (campos.indexOf('med') >= 0) {
      sh.getRange(fila, 2 + campos.indexOf('med')).setFontWeight('bold').setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP).setVerticalAlignment('middle')
    }
    // cantidad/venc de cada día: cantidad centrada y negrita, vencimiento
    // pequeño (amarillo si el insumo vence dentro del rango del maestro).
    // Se guardan las coordenadas de urgencia y el fondo se aplica después en
    // una sola llamada (RangeList): esto hace la hoja mucho más rápido de
    // construir cuando hay muchos días y muchos ítems.
    if (conVenc) {
      var vtoMes = _parseVto(row.vto)
      var anticipa = Number(_configValor('Anticipación de alerta de vencimiento (meses)') || 1)
      var estado = vtoMes ? _estadoVencimiento(vtoMes, _hoy(), anticipa) : ''
      if (estado === 'VENCIDO' || estado === 'POR VENCER') {
        for (var d5 = 0; d5 < nDias; d5++) {
          vencRefs.push('R' + fila + 'C' + (cabeceras.length + 2 + d5 * 2))
        }
      }
    }
    sh.setRowHeight(fila, 19 + (nDias > 4 ? 1 : 0))
    fila++
  }

  // Estilos de las columnas de cada día (una llamada por columna, no por
  // celda): cantidad centrada y negrita; VENC pequeño, naranja e itálico.
  for (var d6 = 0; d6 < nDias; d6++) {
    var cDia = cabeceras.length + 1 + d6 * 2
    var cVenc = cDia + 1
    var nF = fila - filaIni
    sh.getRange(filaIni, cDia, nF, 1).setHorizontalAlignment('center').setFontSize(10).setFontWeight('bold')
    sh.getRange(filaIni, cVenc, nF, 1).setHorizontalAlignment('center').setFontSize(8).setFontColor(C.aviso).setFontStyle('italic')
  }
  // Fondo amarillo de urgencia en lote (una sola llamada a la API)
  if (vencRefs.length > 0) {
    try { sh.getRangeList(vencRefs).setBackground(C.panelAviso) } catch (e) { }
  }

  // Bordes completos del bloque
  sh.getRange(filaIni, 1, fila - filaIni, totCols).setBorder(true, true, true, true, true, true, C.borde, SpreadsheetApp.BorderStyle.SOLID)
  return fila
}
