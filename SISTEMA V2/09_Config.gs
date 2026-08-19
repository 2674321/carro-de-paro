// ─────────────────────────────────────────────────────────────────────────────
//  09_CONFIG — hoja de configuración (se construye siempre idéntica)
//  En v2 la configuración es 100% por script: nunca se acumula texto duplicado
//  ni se pierden valores al re-formatear. Los parámetros viven en CONFIG_DEF,
//  sus controles/dropdowns en CONFIG_TIPOS y el orden visual en CONFIG_GRUPOS.
// ─────────────────────────────────────────────────────────────────────────────

// Colores de las bandas de sección, en el orden de CONFIG_GRUPOS
var CONFIG_GRUPO_COLORES = ['#2E86C1', '#1E6B52', '#148F77', '#6C3483', '#7FB3D5', '#566573', '#B9770E']

// Última fila con contenido del panel de CONFIG (títulos + grupos + pie).
// Lo usan formatearConfig (para ubicar el pie y recortar) y _recortarHojas.
// Cada parámetro con casillas de días (etiquetas Lun..Dom ✓) ocupa 2 filas
// en vez de 1; se cuentan dinámicamente para no depender de una constante.
function _filasConfig() {
  var nCasillas = 0
  for (var g = 0; g < CONFIG_GRUPOS.length; g++) {
    var lista = CONFIG_GRUPOS[g][1]
    for (var p = 0; p < lista.length; p++) {
      if (_esCasillasDias(lista[p])) nCasillas++
    }
  }
  // 3 (título+info+cabecera) + N parámetros + extras de cada grupo (banner+)
  // + 2 filas por bloque de casillas + pie + margen.
  return 3 + CONFIG_DEF.length + CONFIG_GRUPOS.length + nCasillas + 3 + MARGEN.filasConfig
}

// Parámetros de CONFIG que se eligen marcando casillas ✓ (Lun..Dom)
function _listaCasillasDias() {
  return ['Días del informe semanal', 'Días del informe de revisión']
}

function _esCasillasDias(nombre) {
  return _listaCasillasDias().indexOf(nombre) >= 0
}

function formatearConfig() {
  var sh = _hoja(HOJA.config, HOJA_ORDEN.config)
  // Conserva la selección de días marcada en las casillas antes de limpiar
  var selPrev = {
    'Días del informe semanal': _diasMarcadosDesde(sh, 'Días del informe semanal'),
    'Días del informe de revisión': _diasMarcadosDesde(sh, 'Días del informe de revisión')
  }
  sh.clear()
  sh.clearFormats()
  _descombinar(sh)
  _pintarPestana(HOJA.config, C.tabConfig)

  var cols = 2
  _tituloPagina(sh, 1, cols, 'CONFIGURACIÓN GENERAL', C.primario, 30)
  _filaInfo(sh, 2, cols, 'CÓMO EDITAR: solo la columna "Valor" (celdas amarillas). ▾ con flecha = lista desplegable · ☑ casillas = días del informe · texto libre = escriba directamente. Pase el mouse sobre cada parámetro para ver su ayuda.')
  _cabecera(sh, 3, ['Parámetro', 'Valor'], C.gris, 20)

  var def = {}
  for (var d = 0; d < CONFIG_DEF.length; d++) def[CONFIG_DEF[d][0]] = CONFIG_DEF[d][1]

  var fila = 4
  for (var g = 0; g < CONFIG_GRUPOS.length; g++) {
    var grupo = CONFIG_GRUPOS[g]
    fila++
    _banner(sh, fila, cols, grupo[0], CONFIG_GRUPO_COLORES[g], 16)
    fila++
    for (var p = 0; p < grupo[1].length; p++) {
      var nombre = grupo[1][p]
      sh.getRange(fila, 1).setValue(nombre).setFontWeight('bold').setFontSize(10)
      var cVal = sh.getRange(fila, 2)
      cVal.setValue(def[nombre]).setFontSize(10).setBackground(C.cant).setHorizontalAlignment('left')
      _nota(cVal, _configTooltip(nombre))

      // Control según el tipo del parámetro (CONFIG_TIPOS en 00_Sistema.gs)
      var tipo = CONFIG_TIPOS[nombre] || 'texto'
      if (tipo === 'numero') {
        _valNum(sh, 'B' + fila)
      } else if (tipo && tipo[0] === 'lista') {
        _valLista(sh, 'B' + fila, tipo[1], _configTooltip(nombre))
      }

      var r = sh.getRange(fila, 1, 1, 2)
      if ((fila - 4) % 2 === 1) r.setBackground(C.zebra)
      r.setBorder(true, true, true, true, true, true, C.bordeSuave, SpreadsheetApp.BorderStyle.SOLID)

      // Valores largos (pie de página, nombres): se envuelven dentro de la fila
      if (String(def[nombre] || '').length > 26) {
        cVal.setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP).setVerticalAlignment('middle')
        sh.setRowHeight(fila, 30)
      }

      // "Días del informe semanal" y "Días del informe de revisión": se eligen
      // MARCANDO casillas ✓ (Lun..Dom), no escribiendo texto. La columna Valor
      // muestra el resumen automático.
      if (nombre === 'Días del informe semanal' || nombre === 'Días del informe de revisión') {
        var seleccion = (selPrev[nombre] && selPrev[nombre].length ? selPrev[nombre] : null) || _diasDesdeTexto(def[nombre])
        sh.getRange(fila, 2).setValue(_resumenDias(seleccion)).setFontSize(10).setFontWeight('bold')
          .setBackground(C.cant).setHorizontalAlignment('center')
        sh.getRange(fila, 2).setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP).setVerticalAlignment('middle')
        // Fila de etiquetas Lun..Dom (columnas 3..9)
        var rEtq = sh.getRange(fila, 3, 1, 7)
        rEtq.setValues([REV_ABREV_DIAS.slice(0, 7).map(function (d) { return d })])
        rEtq.setFontSize(8).setFontWeight('bold').setFontColor(C.gris).setHorizontalAlignment('center').setVerticalAlignment('middle')
        // Fila de casillas de verificación
        var rChk = sh.getRange(fila + 1, 3, 1, 7)
        rChk.insertCheckboxes()
        var estados = []
        for (var ej = 0; ej < 7; ej++) estados.push(seleccion.indexOf(ej) >= 0)
        rChk.setValues([estados])
        rChk.setHorizontalAlignment('center').setVerticalAlignment('middle')
        sh.getRange(fila, 1, 2, 9).setBorder(true, true, true, true, true, true, C.bordeSuave, SpreadsheetApp.BorderStyle.SOLID)
        sh.getRange(fila + 1, 1, 1, 9).setBackground(C.zebra)
        sh.setRowHeight(fila, 18)
        sh.setRowHeight(fila + 1, 22)
        fila += 2
        continue
      }
      fila++
    }
  }

  fila++
  _banner(sh, fila, cols, 'SISTEMA ' + SIS.nombre + ' · v' + SIS.version + ' · actualizado el ' + SIS.actualizacion, CONFIG_GRUPO_COLORES[4], 16)
  fila++
  _txt(sh, fila, 1, 'Las celdas amarillas son editables. Los menús e impresiones leen estos valores en vivo; no hace falta recalcular nada. El dropdown "Formato de firmas del informe" decide cómo se cierra el informe mensual (tarjetas o fila por fecha).', { color: C.gris, size: 9, bg: C.panelInfo })
  fila++

  _asegurarFilas(sh, _filasConfig())
  _recortarHoja(sh, _filasConfig(), 10)
  _anchos(sh, [[1, 330], [2, 300], [3, 36], [4, 36], [5, 36], [6, 36], [7, 36], [8, 36], [9, 36]])
  _logEvento('CONFIG', 'Configuración reformateada (' + CONFIG_DEF.length + ' parámetros)')
}

// ─── Selección de días del informe semanal y del informe de revisión ──────────
// En CONFIG el parámetro se marca con casillas de verificación en las columnas
// 3..9 de dos filas (etiquetas Lun..Dom y casillas), ubicadas bajo la fila del
// parámetro. Devuelve null si aún no existen casillas (primera vez).

function _filaDiasConfig(sh, parametro) {
  return _filaParametroConfig(sh, parametro || 'Días del informe semanal')
}

function _diasMarcadosDesde(sh, parametro) {
  if (!sh) return null
  var f = _filaDiasConfig(sh, parametro)
  if (!f) return null
  var vals = sh.getRange(f + 1, 3, 1, 7).getValues()
  var out = []
  for (var i = 0; i < 7; i++) {
    var v = vals[0][i]
    if (v === true || v === 1 || (typeof v === 'string' && v.toLowerCase() === 'true')) out.push(i)
  }
  return out.length ? out : null
}

function _resumenDias(sel) {
  if (!sel || !sel.length) return 'Todos'
  var vis = []
  for (var i = 0; i < sel.length; i++) vis.push(REV_ABREV_DIAS[sel[i]])
  return vis.join(', ')
}

// Tooltip de cada parámetro (ayuda al pasar el mouse)
function _configTooltip(parametro) {
  var ayudas = {
    'Establecimiento': 'Nombre del establecimiento que aparece en el encabezado de las impresiones.',
    'Ciudad': 'Ciudad o comuna del establecimiento.',
    'Día fijo de revisión semanal': 'Día en que se hace la revisión del carro (Lunes recomendado). El sistema usa la semana de HOY al crear una revisión.',
    'Avanzar al siguiente ítem al escribir': 'Con "Sí" (recomendado), al escribir una cantidad el cursor salta automáticamente al siguiente ítem sin cantidad de la misma semana. Con "No", queda donde escribió.',
    'Dispositivo (carro de paro)': 'Nombre del carro principal. Se muestra como casilla ☐ en las impresiones.',
    'Dispositivo alternativo (móvil)': 'Nombre del carro secundario. Se muestra como casilla ☐ en las impresiones.',
    'Responsable del registro': 'Nombre de quien firma como encargado/a del registro en las impresiones.',
    'Cargo del responsable del registro': 'Cargo de quien firma el registro (solo si aplica). Se imprime junto a la firma.',
    'Encargado de la unidad': 'Nombre del encargado de la unidad/servicio. Se imprime con su firma y timbre en todas las impresiones.',
    'Cargo del encargado': 'Cargo del encargado (ej. Enfermera/o, Gestor(a) de stock). Se imprime junto a su firma.',
    'Director(a) del establecimiento': 'Nombre del director(a) para la firma de Dirección en las impresiones.',
    'Anticipación de alerta de vencimiento (meses)': 'Con cuántos meses de anticipación se marca POR VENCER (ej. 1 = un mes antes del vencimiento). Escriba 0 para marcar solo al llegar el mes.',
    'Pie de página de impresiones': 'Nota institucional que se imprime al pie de cada PDF (ej. "Documento oficial — Prohibida su reproducción"). Vacío = no se imprime.',
    'Semana a imprimir': 'Elija en el dropdown qué semana se imprime con "PDF de la semana" y "Ver hoja de la semana" (opción "— Automático —" = la última semana con datos). Las opciones se actualizan solas al abrir el libro o al imprimir.',
    'Mes a imprimir': 'Elija en el dropdown el mes por su NOMBRE (enero, febrero…, siempre los 12 del año en curso, con el año detectado automáticamente). Opción "— Automático —" = el último mes con registros. El mismo mes se usa en el informe ("Mes del informe de revisión").',
    'Tamaño de página para imprimir': 'Tamaño de papel de todas las impresiones y PDF: A4 (210 × 297 mm), Carta (216 × 279 mm) u Oficio (216 × 356 mm). El formato se adapta solo: columnas y paginación se recalculan. Por defecto A4.',
    'Imprimir encabezado institucional': 'Sí = imprime la banda verde con título, establecimiento y semana/mes. No = la omite.',
    'Imprimir resumen de la semana': 'Sí = imprime la banda "COMPLETADOS X DE Y · USO TOTAL · alertas" en el PDF semanal y en el resumen mensual.',
    'Imprimir fila de hora': 'Sí = imprime la línea "HORA DE LA REVISIÓN: ____:____" en el PDF semanal.',
    'Imprimir fechas bajo los días': 'Sí = imprime la fila secundaria con las fechas DD/MM bajo Lun..Dom (semanal) o el rango por columna (mensual).',
    'Días del informe semanal': 'QUÉ días se imprimen en el informe semanal. Escriba "Todos" (opción por defecto) o una lista separada por comas, ej. "Domingo", "Lun, Mié, Sáb" o "1,7" (1 = Lunes). Solo se imprimen las columnas de esos días.',
    'Mes del informe de revisión': 'Elija en el dropdown el mes por su NOMBRE (enero, febrero…, los 12 del año en curso, año auto). "— Automático —" = el último mes con registros (o el actual si no hay). Si quedó en automático, se respeta lo elegido en "Mes a imprimir".',
    'Días del informe de revisión': 'QUÉ días del mes forman las columnas del informe de revisión mensual. Por defecto solo Domingo: el informe muestra UNA columna por cada dominio del mes elegido.',
    'Formato de firmas del informe': 'Cómo se cierra el informe mensual: "Una fila por fecha" (una fila por cada dominio del mes, con un solo responsable de la inspección y su TIMBRE opcional) o "Tarjetas" (las tres firmas clásicas: dirección, responsable y encargado de la unidad, cada una con su timbre). Solo se imprime el formato elegido.',
    'Imprimir columna USO': 'Sí = imprime la columna USO (consumo calculado de la semana). No = se omite y la hoja queda más ancha para los días.',
    'Imprimir columna ALERTA': 'Sí = imprime la columna ALERTA (REPONER / VENCIDO / POR VENCER). No = se omite.',
    'Imprimir columna USO PROM.': 'Sí = agrega la columna con el uso promedio por ítem en el PDF mensual. Por defecto está en No: la cantidad final de cada semana ya se ve en su columna y así el PDF ocupa menos espacio.',
    'Imprimir observaciones': 'Sí = imprime la columna Obs. y el bloque de observaciones generales. No = se omiten.',
    'Imprimir firmas y pie': 'Sí = imprime las tarjetas NOMBRE / FIRMA / TIMBRE y la fecha de impresión al final.',
    'Vaciar celdas en blanco': 'Sí = limpia las celdas de relleno ("Sem. N°__", "____ → ____", guiones) para que el PDF quede limpio cuando no hay datos.',
    'Programador del sistema': 'Crédito del desarrollo. Se muestra en "ℹ️ Sobre el sistema" (no se imprime en los documentos).',
    'Título del programador': 'Título o profesión del desarrollador. Se muestra en "ℹ️ Sobre el sistema".',
    'Correo del programador': 'Correo de contacto para dudas y sugerencias. Se muestra en "ℹ️ Sobre el sistema".',
    'Última versión aplicada': 'Versión del sistema que se aplicó al actualizar. No editar.'
  }
  return ayudas[parametro] || 'Parámetro de configuración general.'
}

// Valor de un parámetro de CONFIG (con respaldo)
function _configValor(parametro) {
  var sh = _ss().getSheetByName(HOJA.config)
  if (!sh) return ''
  var ultima = _ultimaFilaDatos(sh, 1, 4)
  if (ultima < 4) return ''
  var vals = sh.getRange(4, 1, ultima - 3, 2).getValues()
  for (var i = 0; i < vals.length; i++) {
    if (String(vals[i][0] || '').trim() === parametro) {
      return String(vals[i][1] || '').trim()
    }
  }
  return ''
}

// N° de fila (en la hoja CONFIG) donde vive un parámetro, o 0 si no existe
function _filaParametroConfig(sh, parametro) {
  var ultima = _ultimaFilaDatos(sh, 1, 4)
  if (ultima < 4) return 0
  var vals = sh.getRange(4, 1, ultima - 3, 1).getValues()
  for (var i = 0; i < vals.length; i++) {
    if (String(vals[i][0] || '').trim() === parametro) return 4 + i
  }
  return 0
}

// ─── Selectores de semana y mes para imprimir (dropdowns dinámicos) ──────────
// Los parámetros "Semana a imprimir" y "Mes a imprimir" de CONFIG son listas
// que se actualizan solas con los períodos realmente disponibles (REVISIONES).
// Si el valor elegido dejó de existir (semana vieja sin datos), se repone la
// opción "— Automático —" para que el flujo de impresión nunca se rompa.
function _actualizarSelectoresImpresion() {
  try {
    var sh = _ss().getSheetByName(HOJA.config)
    if (!sh) return

    var semanas = _semanasDisponibles()
    var opcSem = ['— Automático —']
    for (var i = 0; i < semanas.length; i++) opcSem.push(semanas[i].key)
    _fijarDropdownConfig(sh, 'Semana a imprimir', opcSem)

    var mNombre = _nombresMeses()
    var opcMes = ['— Automático —']
    for (var j = 0; j < mNombre.length; j++) opcMes.push(mNombre[j])
    _fijarDropdownConfig(sh, 'Mes a imprimir', opcMes)

    // Dropdown del informe de revisión mensual: mismas opciones que
    // "Mes a imprimir" (los 12 meses del año en curso, solo el nombre).
    _fijarDropdownConfig(sh, 'Mes del informe de revisión', opcMes)
  } catch (e) {
    Logger.log('_actualizarSelectoresImpresion: ' + e)
  }
}

// Aplica la lista desplegable a un parámetro de CONFIG manteniendo su valor si
// sigue siendo válido; si no, lo repone con "— Automático —".
function _fijarDropdownConfig(sh, parametro, opciones) {
  var fila = _filaParametroConfig(sh, parametro)
  if (!fila) return
  var cVal = sh.getRange(fila, 2)
  var actual = String(cVal.getValue() || '').trim()
  var valido = false
  for (var i = 0; i < opciones.length; i++) {
    if (opciones[i] === actual) { valido = true; break }
  }
  if (!valido) {
    cVal.setValue(opciones[0])
    actual = opciones[0]
  }
  _valLista(sh, 'B' + fila, opciones, _configTooltip(parametro), false)
  var r = sh.getRange(fila, 1, 1, 2)
  if ((fila - 4) % 2 === 1) r.setBackground(C.zebra)
  r.setBorder(true, true, true, true, true, true, C.bordeSuave, SpreadsheetApp.BorderStyle.SOLID)
}
