// ─────────────────────────────────────────────────────────────────────────────
//  05_BUSQUEDA — filtro en vivo al escribir en la celda "Buscar"
//  Busca por NOMBRE y por CÓDIGO (Registro ISP en FÁRMACOS, clave Sxx/AAAA en
//  REVISIONES). Al escribir se resaltan en amarillo las filas coincidentes y
//  se OCULTAN temporalmente las que no coinciden (tipo filtro). Borrar el
//  texto restaura la lista completa. La primera coincidencia queda activa
//  para editarla ya.
//  Optimizada para velocidad: 1 lectura + 1 escritura de fondos en bloque
//  (sin repintar bandas/zebra en cada tecla — se restauran al limpiar).
// ─────────────────────────────────────────────────────────────────────────────

function _buscarEnHoja(e, sh, cfg) {
  if (!e || !e.range || !sh || !cfg) return false
  var r = e.range
  if (r.getRow() !== cfg.fila) return false
  if (r.getColumn() < cfg.colIni || r.getColumn() > cfg.colFin) return false

  var query = _normalizar(String(r.getValue() || ''))
  var ultima = _ultimaFilaDatos(sh, cfg.colBuscar, cfg.filaDatos)
  var filas = Math.max(1, ultima - cfg.filaDatos + 1)

  // Texto vacío: restaura fondos, zebra/bandas y VISIBILIDAD completa.
  if (!query) {
    _limpiarResaltados(sh, cfg, ultima)
    return true
  }

  // Reaparecen todas las filas (las ocultas pueden coincidir con el texto nuevo)
  try { sh.showRows(cfg.filaDatos, filas) } catch (e) { }

  // Busca en NOMBRE y en CÓDIGO. Lee las 2 columnas en UNA sola llamada.
  var colA = Math.min(cfg.colBuscar, cfg.colCodigo || cfg.colBuscar)
  var colZ = Math.max(cfg.colBuscar, cfg.colCodigo || cfg.colBuscar)
  var vals = sh.getRange(cfg.filaDatos, colA, filas, colZ - colA + 1).getValues()
  var idxBus = cfg.colBuscar - colA
  var idxCod = cfg.colCodigo ? cfg.colCodigo - colA : -1

  // Matriz de fondos completa: blanco base + amarillo en coincidencias.
  // Una sola setBackgrounds() reemplaza a N setBackground() (rápido).
  var coincide = []
  var total = 0
  var primera = -1
  var bg = []
  for (var i = 0; i < filas; i++) {
    var nombre = _normalizar(String(vals[i][idxBus] || ''))
    var ok = nombre.indexOf(query) !== -1
    if (!ok && idxCod >= 0) ok = _normalizar(String(vals[i][idxCod] || '')).indexOf(query) !== -1
    coincide.push(ok)
    var filaBg = []
    for (var c = 0; c < cfg.nCols; c++) filaBg.push(ok ? C.buscar : '#ffffff')
    bg.push(filaBg)
    if (ok) {
      if (primera < 0) primera = cfg.filaDatos + i
      total++
    }
  }

  try {
    sh.getRange(cfg.filaDatos, 1, filas, cfg.nCols).setBackgrounds(bg)
  } catch (e2) {
    // Respaldos: pinta fila a fila solo las coincidencias
    for (var j = 0; j < filas; j++) {
      if (coincide[j]) sh.getRange(cfg.filaDatos + j, 1, 1, cfg.nCols).setBackground(C.buscar)
    }
  }

  if (total > 0) {
    _filtrarFilas(sh, cfg.filaDatos, filas, coincide)   // oculta temporalmente las que NO coinciden
    sh.activate()
    _ss().setActiveRange(sh.getRange(primera, cfg.colEditar))
    _toast(total + ' coincidencia(s) · se ocultaron las demás — borre la búsqueda para ver la lista completa.', '🔎 ' + SIS.nombre, 4)
  } else {
    _toast('Sin coincidencias para "' + query + '" · borre el texto para ver la lista completa.', '⚠ ' + SIS.nombre)
  }
  return true
}

// Oculta (fila por fila, agrupando en runs) las filas que NO coinciden.
// `coincide` es un array de booleanos de largo `n` (una entrada por fila).
function _filtrarFilas(sh, filaIni, n, coincide) {
  try {
    var inicio = -1
    for (var i = 0; i <= n; i++) {
      var mostrar = (i < n) && coincide[i]
      if (mostrar) {
        if (inicio >= 0) { sh.hideRows(filaIni + inicio, i - inicio); inicio = -1 }
      } else if (inicio < 0) {
        inicio = i
      }
    }
  } catch (e) { Logger.log('Filtro de filas omitido: ' + e) }
}

// Restaura fondos y VISIBILIDAD tras una búsqueda (usado por onEdit y por
// "Limpiar búsquedas"): muestra todas las filas de datos y devuelve su color.
function _limpiarResaltados(sh, cfg, ultima) {
  if (!sh || !cfg) return
  var fin = ultima || _ultimaFilaDatos(sh, cfg.colBuscar, cfg.filaDatos)
  var filas = Math.max(1, fin - cfg.filaDatos + 1)

  // Reaparecen todas las filas (deshace el ocultamiento temporal del filtro)
  try { sh.showRows(cfg.filaDatos, filas) } catch (e) { }

  sh.getRange(cfg.filaDatos, 1, filas, cfg.nCols).setBackground('#ffffff')
  if (cfg.colRestaurar) {
    sh.getRange(cfg.filaDatos, cfg.colRestaurar, filas, 1).setBackground(C.cant)
  }

  if (sh.getSheetName() === HOJA.revisiones) {
    if (typeof _repintarBandasSemana === 'function') _repintarBandasSemana(sh, fin)
    if (typeof _resaltarColumnaHoy === 'function') _resaltarColumnaHoy(sh, fin)
  } else if (typeof _zebra === 'function') {
    _zebra(sh, cfg.filaDatos, fin, cfg.nCols)
  }
}
