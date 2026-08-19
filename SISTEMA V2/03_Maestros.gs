// ─────────────────────────────────────────────────────────────────────────────
//  03_MAESTROS — pestañas FÁRMACOS e INSUMOS (catálogo del carro)
//  Con autofiltro, tooltips en las cabeceras y búsqueda amarilla en vivo.
// ─────────────────────────────────────────────────────────────────────────────

// Pestaña FÁRMACOS
function formatearFarmacos() {
  var sh = _hoja(HOJA.farmacos, HOJA_ORDEN.farmacos)
  var cols = 7
  sh.getDataRange().clearFormat()
  sh.getRange(1, 1, Math.max(sh.getLastRow(), 1), cols).clearNote()
  _pintarPestana(HOJA.farmacos, C.tabFarmacos)

  _tituloPagina(sh, 1, cols, 'MAESTRO FÁRMACOS — CARRO DE PARO Y MÓVIL', C.primario, 30)
  _txt(sh, 2, 1, 'Buscar fármaco:', { bold: true, size: 10 })
  _panelInfo(sh, 2, 2, 5, '', '#FEF9E7', C.aviso)
  sh.getRange(2, 2, 1, 5).setBorder(true, true, true, true, true, true, C.aviso, SpreadsheetApp.BorderStyle.SOLID)
  _nota(sh.getRange(2, 2, 1, 5), 'Escriba parte del nombre (p. ej. "adre"): las filas que NO coinciden se ocultan temporalmente. Borre el texto para ver todo de nuevo.')
  _txt(sh, 2, 7, 'Filtre con el triángulo de la cabecera ⏷', { color: C.gris, size: 9 })

  _cabecera(sh, 3, FARM_TITULOS, C.primario, 26, FARM_NOTAS)

  if (_maestroSoloPlaceholder(sh, FARM.med, FARM.obs)) {
    _cargarArsenal(sh, 4, FARMACOS_ARSENAL, cols)
  }

  var ultima = _ultimaFilaDatos(sh, FARM.med)
  _renombrarFarmacosDuplicados(sh, ultima)
  _bordes(sh, 3, ultima, cols)
  sh.getRange(4, 1, ultima - 3, 1).setHorizontalAlignment('center')
  sh.getRange(4, FARM.base, ultima - 3, 2).setHorizontalAlignment('center')
  sh.getRange(4, FARM.med, ultima - 3, 1).setFontWeight('bold')
  sh.getRange(4, FARM.obs, ultima - 3, 1).setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP)
  _zebra(sh, 4, ultima, cols)

    _valNum(sh, 'E4:F' + Math.max(ultima, 4))
  _normalizarFormas(sh, 4, Math.max(ultima, 4))
  _valLista(sh, 'D4:D' + Math.max(ultima, 4), FORMAS_FARMACEUTICAS, 'Forma farmacéutica del medicamento. Si no está en la lista, puede escribir otra.', false)
  _condStockMin(sh, 4, Math.max(ultima, 4), FARM.base, FARM.min)
  _anchos(sh, FARM_ANCHOS)
  sh.setFrozenRows(3)
  _autofiltro(sh, 3, Math.max(ultima, 4), cols)

  // Notas al LADO DERECHO de la lista (columna tras las Observaciones, H)
  _notaDerecha(sh, ultima + 2, FARM.obs + 1, 'Nota: "Stock base" = cantidad que debe tener el carro. "Stock mín." = si la cantidad real queda igual o bajo ese valor, el sistema marca REPONER.', 9)
  _notaDerecha(sh, ultima + 3, FARM.obs + 1, 'Notas al pie de la lista: (1) Arsenal Farmacológico SAPU/SAR según ORD C51 N° de MINSAL · (2) Sin registro sanitario vigente, CENABAST · (3) Restringido para SAR · (4) Restringido para SAPU y SAR.', 8)
}

// Pestaña INSUMOS
function formatearInsumos() {
  var sh = _hoja(HOJA.insumos, HOJA_ORDEN.insumos)
  var cols = 6
  sh.getDataRange().clearFormat()
  sh.getRange(1, 1, Math.max(sh.getLastRow(), 1), cols).clearNote()
  _pintarPestana(HOJA.insumos, C.tabInsumos)

  _tituloPagina(sh, 1, cols, 'INSUMOS CLÍNICOS — CARRO DE PARO Y MÓVIL', C.azul, 30)
  _txt(sh, 2, 1, 'Buscar insumo:', { bold: true, size: 10 })
  _panelInfo(sh, 2, 2, 4, '', '#FEF9E7', C.aviso)
  sh.getRange(2, 2, 1, 4).setBorder(true, true, true, true, true, true, C.aviso, SpreadsheetApp.BorderStyle.SOLID)
  _nota(sh.getRange(2, 2, 1, 4), 'Escriba parte del nombre: las filas que NO coinciden se ocultan temporalmente. Borre el texto para ver todo de nuevo.')
  _txt(sh, 2, 6, 'Filtre con el triángulo de la cabecera ⏷', { color: C.gris, size: 9 })

  _cabecera(sh, 3, INSU_TITULOS, C.azul, 26, INSU_NOTAS)

  if (_maestroSoloPlaceholder(sh, INSU.nom, INSU.obs)) {
    _cargarArsenal(sh, 4, INSUMOS_ARSENAL, cols)
  }

  var ultima = _ultimaFilaDatos(sh, INSU.nom)
  _bordes(sh, 3, ultima, cols)
  sh.getRange(4, 1, ultima - 3, 1).setHorizontalAlignment('center')
  sh.getRange(4, INSU.base, ultima - 3, 2).setHorizontalAlignment('center')
  sh.getRange(4, INSU.nom, ultima - 3, 1).setFontWeight('bold')
  sh.getRange(4, INSU.vto, ultima - 3, 1).setHorizontalAlignment('center')
  sh.getRange(4, INSU.obs, ultima - 3, 1).setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP)
  _zebra(sh, 4, ultima, cols)

  _valNum(sh, 'C4:D' + Math.max(ultima, 4))
  _valVto(sh, 'E4:E' + Math.max(ultima, 4))
  _condStockMin(sh, 4, Math.max(ultima, 4), INSU.base, INSU.min)
  _anchos(sh, INSU_ANCHOS)
  sh.setFrozenRows(3)
  _autofiltro(sh, 3, Math.max(ultima, 4), cols)

  // Nota al LADO DERECHO de la lista (columna tras las Observaciones, G)
  _notaDerecha(sh, ultima + 2, INSU.obs + 1, 'Nota: vencimiento acepta cualquier formato de fecha (MM/AAAA, DD/MM/AAAA, MM-AAAA…) — el sistema lo normaliza a MM/AAAA.', 9)
}

// ¿El maestro está vacío o solo tiene los placeholders "EJEMPLO —"?
// Si hay algún ítem real (sin la marca EJEMPLO) se respeta lo cargado.
function _maestroSoloPlaceholder(sh, colNombre, colObs) {
  var ultima = sh.getLastRow()
  if (ultima < 4) return true
  var noms = sh.getRange(4, colNombre, ultima - 3, 1).getValues()
  var obss = sh.getRange(4, colObs, ultima - 3, 1).getValues()
  for (var i = 0; i < noms.length; i++) {
    var nom = String(noms[i][0] || '')
    var obs = String(obss[i][0] || '')
    if (nom === '' && obs === '') continue
    if (nom.indexOf('EJEMPLO') === -1 && obs.indexOf('EJEMPLO') === -1) return false
  }
  return true
}

// Carga el arsenal real numerado (primera vez o reemplazando placeholders)
function _cargarArsenal(sh, filaIni, datos, cols) {
  _asegurarFilas(sh, filaIni + datos.length - 1)
  if (sh.getLastRow() >= filaIni) sh.getRange(filaIni, 1, sh.getLastRow() - filaIni + 1, cols).clearContent()
  var filas = []
  for (var i = 0; i < datos.length; i++) {
    filas.push([i + 1].concat(datos[i]))
  }
  sh.getRange(filaIni, 1, filas.length, cols).setValues(filas)
}

// Fondo alternado (zebra) sobre las filas de datos existentes.
// Optimizada: 1 lectura + 1 escritura en bloque (antes era una llamada por fila).
function _zebra(sh, filaIni, filaFin, cols) {
  if (filaFin < filaIni) return
  var n = filaFin - filaIni + 1
  try {
    var bg = sh.getRange(filaIni, 1, n, cols).getBackgrounds()
    for (var f = 0; f < n; f++) {
      if (f % 2 === 1) {
        for (var c = 0; c < cols; c++) bg[f][c] = C.zebra
      }
    }
    sh.getRange(filaIni, 1, n, cols).setBackgrounds(bg)
  } catch (e) {
    for (var f2 = filaIni; f2 <= filaFin; f2++) {
      if ((f2 - filaIni) % 2 === 1) sh.getRange(f2, 1, 1, cols).setBackground(C.zebra)
    }
  }
}

// Resalta en rojo la celda de stock base cuando queda bajo el stock mín.
// (aviso visual de que el carro no alcanza el mínimo exigido). Formato
// condicional con fórmula relativa: colBase < colMin en cada fila.
function _condStockMin(sh, filaIni, filaFin, colBase, colMin) {
  try {
    if (filaFin < filaIni) return
    var f = filaIni
    var formula = '=AND(ISNUMBER($' + _colLetra(colBase) + f + '), ISNUMBER($' + _colLetra(colMin) + f + '), $' + _colLetra(colBase) + f + ' < $' + _colLetra(colMin) + f + ')'
    var rango = _colLetra(colBase) + filaIni + ':' + _colLetra(colBase) + filaFin
    var regla = SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied(formula)
      .setBackground('#FADBD8').setFontColor(C.alerta).setBold(true)
      .setRanges([sh.getRange(rango)])
      .build()
    sh.setConditionalFormatRules([regla])
  } catch (e) { Logger.log('Formato stock mín. omitido: ' + e) }
}

// Letra de columna (1 → A, 27 → AA)
function _colLetra(n) {
  var s = ''
  while (n > 0) {
    var r = (n - 1) % 26
    s = String.fromCharCode(65 + r) + s
    n = Math.floor((n - 1) / 26)
  }
  return s
}

// ─── Notas al lado derecho de la lista ───────────────────────────────────────
// Panel de texto envuelto (columna tras las Observaciones) con alto adaptado
// al ancho de la columna, para las notas institucionales de los maestros.
function _notaDerecha(sh, fila, col, texto, size) {
  var r = sh.getRange(fila, col)
  r.setValue(texto)
  r.setBackground(C.panelInfo)
  r.setFontColor(C.gris)
  r.setFontSize(size || 9)
  r.setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP)
  r.setVerticalAlignment('middle')
  r.setBorder(true, true, true, true, true, true, C.bordeSuave, SpreadsheetApp.BorderStyle.SOLID)
  var ancho = 1
  try { ancho = sh.getColumnWidth(col) } catch (e) { }
  var lineas = Math.max(1, Math.ceil((texto.length * 5.2) / Math.max(1, ancho)))
  sh.setRowHeight(fila, Math.max(21, lineas * 14 + 6))
  return r
}

// ─── CONSISTENCIA de la columna "Forma farmacéutica" ─────────────────────────
// Lleva cualquier variante reconocible (mayúsculas, abreviaturas, plurales,
// faltas de tildes…) a la forma canónica del catálogo FORMAS_FARMACEUTICAS.
// Los textos que no coinciden con ninguna forma conocida se respetan tal cual
// (solo con mayúscula inicial). Idempotente: lo canónico no cambia.
function _normalizarForma(t) {
  var s = String(t || '').trim().replace(/\s+/g, ' ')
  if (!s) return ''
  var LOW = ' ' + s.toLowerCase() + ' '
  for (var i = 0; i < FORMAS_FARMACEUTICAS.length; i++) {
    if (LOW.indexOf(FORMAS_FARMACEUTICAS[i].toLowerCase()) >= 0) return FORMAS_FARMACEUTICAS[i]
  }
  var variantes = [
    ['polvo liofilizado para sol', 'Polvo Liofilizado para Solución Inyectable'],
    ['polvo para sol', 'Polvo para Solución Inyectable'],
    ['polvo para susp', 'Polvo para Suspensión Oral'],
    ['comp. sublingual', 'Comprimido Sublingual'],
    ['comprimido sublingual', 'Comprimido Sublingual'],
    ['sol. inyectable', 'Solución Inyectable'],
    ['sol inyectable', 'Solución Inyectable'],
    ['solucion inyectable', 'Solución Inyectable'],
    ['inyectable', 'Solución Inyectable'],
    ['comprimidos', 'Comprimido'],
    ['comp.', 'Comprimido'],
    ['capsulas', 'Cápsula'],
    ['caps.', 'Cápsula'],
    ['susp. oral', 'Polvo para Suspensión Oral']
  ]
  for (var j = 0; j < variantes.length; j++) {
    if (LOW.indexOf(variantes[j][0]) >= 0) return variantes[j][1]
  }
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// Aplica _normalizarForma a todas las filas de la columna FORMA (col D)
function _normalizarFormas(sh, filaIni, filaFin) {
  if (filaFin < filaIni) return
  try {
    var vals = sh.getRange(filaIni, FARM.forma, filaFin - filaIni + 1, 1).getValues()
    var cambio = false
    for (var i = 0; i < vals.length; i++) {
      var v = String(vals[i][0] || '').trim()
      var n = _normalizarForma(v)
      if (n && n !== v) { vals[i][0] = n; cambio = true }
    }
    if (cambio) sh.getRange(filaIni, FARM.forma, filaFin - filaIni + 1, 1).setValues(vals)
  } catch (e) { Logger.log('Normalizar formas: ' + e) }
}

// Normaliza nombres genéricos duplicados del arsenal cargado por versiones
// anteriores. Hidrocortisona Succinato, Nitroglicerina y Sodio Cloruro tenían
// el MISMO nombre para presentaciones distintas; el control de calidad los
// marcaba como duplicados. Esta rutina renombra cada fila según su
// presentación (leída de las observaciones) para que los nombres queden únicos.
// Es idempotente: las filas ya renombradas no se tocan.
function _renombrarFarmacosDuplicados(sh, ultima) {
  if (!sh || ultima < 4) return
  var n = ultima - 3
  if (n <= 0) return
  var nomRaw = sh.getRange(4, FARM.med, n, 1).getValues()
  var obsRaw = sh.getRange(4, FARM.obs, n, 1).getValues()
  var cambios = 0
  for (var i = 0; i < n; i++) {
    var nombre = String(nomRaw[i][0] || '').trim()
    var obs = String(obsRaw[i][0] || '')
    var nuevo = _nombreConPresentacion(nombre, obs)
    if (nuevo && nuevo !== nombre) {
      sh.getRange(4 + i, FARM.med).setValue(nuevo)
      cambios++
    }
  }
  if (cambios > 0) Logger.log('_renombrarFarmacosDuplicados: ' + cambios + ' fila(s) renombrada(s) en ' + sh.getName())
}

// Nuevo nombre genérico → nombre con presentación (idempotente)
function _nombreConPresentacion(nombre, obs) {
  var o = String(obs || '')
  if (nombre === 'Hidrocortisona Succinato') {
    if (/100\s*mg/i.test(o)) return 'Hidrocortisona Succinato 100 mg'
    if (/500\s*mg/i.test(o)) return 'Hidrocortisona Succinato 500 mg'
  }
  if (nombre === 'Nitroglicerina') {
    if (/comprimido/i.test(o) || /0,6\s*mg/i.test(o)) return 'Nitroglicerina Comprimido'
    if (/50\s*mg/i.test(o) || /inyectable/i.test(o)) return 'Nitroglicerina Inyectable'
  }
  if (nombre === 'Sodio Cloruro') {
    if (/1000\s*mL/i.test(o)) return 'Sodio Cloruro 0,9% (1000 mL)'
    if (/500\s*mL/i.test(o)) return 'Sodio Cloruro 0,9% (500 mL)'
    if (/10\s*mL/i.test(o) || /20\s*mL/i.test(o)) return 'Sodio Cloruro 0,9% (10-20 mL)'
  }
  return ''
}
