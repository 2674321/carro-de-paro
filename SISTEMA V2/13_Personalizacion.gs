// ─────────────────────────────────────────────────────────────────────────────
//  13_PERSONALIZACION — menú de personalización por impresión
//  Cada PDF (semana / resumen del mes) abre un diálogo HTML con
//  casillas de personalización: quitar columnas (USO, ALERTA, ESTADO, Obs.),
//  quitar bloques (firmas, encabezado, resumen, filas de fechas), vaciar
//  celdas de relleno, etc. El diálogo muestra el progreso y el enlace final.
//  El catálogo vive aquí: agregar una casilla = agregar un {id} y aplicarla
//  en 06_Impresión.gs (las opciones se pasan a los constructores de hoja).
// ─────────────────────────────────────────────────────────────────────────────

var IMP_TIPOS = {
  semanal: {
    titulo: 'PDF de la semana',
    opciones: [
      { id: 'encabezado',  t: 'Encabezado institucional',  d: 'Banda verde con título, semana y establecimiento', def: true },
      { id: 'resumen',     t: 'Resumen de la semana',      d: 'Banda "COMPLETADOS X DE Y · USO TOTAL · alertas"', def: true },
      { id: 'hora',        t: 'Fila hora / revisado por',  d: 'Línea "HORA DE LA REVISIÓN: ____:____"', def: true },
      { id: 'fechas',      t: 'Fechas bajo los días',      d: 'Fila secundaria con DD/MM bajo Lun..Dom', def: true },
      { id: 'uso',         t: 'Columna USO',               d: 'Consumo calculado de la semana (base − última)', def: true },
      { id: 'alerta',      t: 'Columna ALERTA',            d: 'Estado REPONER / VENCIDO / POR VENCER', def: true },
      { id: 'obs',         t: 'Observaciones',             d: 'Columna Obs. y bloque de observaciones', def: true },
      { id: 'firmas',      t: 'Firmas y pie',              d: 'Tarjetas NOMBRE / FIRMA / TIMBRE y fecha de impresión', def: true },
      { id: 'vaciarceldas', t: 'Vaciar celdas en blanco',  d: 'Limpia celdas de relleno ("Sem. N°__", guiones) cuando no hay datos', def: false }
    ]
  },
  mensual: {
    titulo: 'PDF resumen del mes',
    opciones: [
      { id: 'encabezado',  t: 'Encabezado institucional',  d: 'Banda verde con título, datos del establecimiento y mes', def: true },
      { id: 'resumen',     t: 'Resumen del mes',           d: 'Banda con completitud, uso total y alertas del mes', def: true },
      { id: 'fechas',      t: 'Fechas bajo cada semana',   d: 'Fila secundaria con el rango de fechas de cada columna', def: true },
      { id: 'obs',         t: 'Columna Obs.',              d: 'Columna de observaciones de cada ítem (desactivada por defecto)', def: false },
      { id: 'usoprom',     t: 'Columna USO PROM.',         d: 'Última columna con el uso promedio por ítem (desactivada por defecto)', def: false },
      { id: 'firmas',      t: 'Firmas y pie',              d: 'Tarjetas NOMBRE / FIRMA / TIMBRE y fecha de impresión', def: true },
      { id: 'vaciarceldas', t: 'Vaciar celdas en blanco',  d: 'Limpia celdas de relleno ("Sem. N°__", "____ → ____") cuando no hay datos', def: false }
    ]
  },
  informe: {
    titulo: 'PDF informe de revisión mensual',
    opciones: [
      { id: 'responsables', t: 'Responsable de la inspección', d: 'Una fila por cada fecha del mes con su responsable', def: true },
      { id: 'timbre',       t: 'Timbre por fecha',             d: 'Recuadro TIMBRE en la fila de cada fecha (formato especial del informe)', def: true }
    ]
  }
}

// Valor de una opción de impresión. Orden de prioridad:
// 1) lo elegido en el diálogo/sidebar (opc), 2) el parámetro de CONFIG
// "Impresión — qué se imprime" (editable siempre, funciona sin ventanas),
// 3) el defecto del catálogo, 4) true (comportamiento clásico).
function _opcValor(opc, id, tipo) {
  opc = opc || {}
  if (id in opc) return !!opc[id]
  if (typeof CONFIG_IMPR === 'object' && CONFIG_IMPR[id]) {
    var cv = String(_configValor(CONFIG_IMPR[id]) || '').toLowerCase()
    if (cv === 'sí' || cv === 'si' || cv === 's' || cv === 'true') return true
    if (cv === 'no' || cv === 'n' || cv === 'false') return false
  }
  if (tipo && IMP_TIPOS[tipo]) {
    var lista = IMP_TIPOS[tipo].opciones
    for (var i = 0; i < lista.length; i++) {
      if (lista[i].id === id) return !!lista[i].def
    }
  }
  return true
}

// ─── Apertura del diálogo de personalización ─────────────────────────────────
// `tipo` = 'semanal' | 'mensual'; `params` = datos del
// documento que se va a imprimir (clave de semana, mes, etc.).
// Si params.modo === 'hoja', el diálogo construye la hoja con las opciones
// elegidas y la muestra (sin generar PDF): "ver hoja de impresión".
// En otro caso (modo 'pdf', el usual) construye la hoja y la exporta a PDF.
function _abrirDialogoPDF(tipo, params) {
  var ui = _ui()
  var t = IMP_TIPOS[tipo]
  if (!t) return
  // El informe: según el formato elegido en CONFIG ("Formato de firmas del
  // informe") se muestran las opciones que realmente aplican — por fecha
  // (responsable/timbre) o tarjetas clásicas. Nunca ambas a la vez.
  if (tipo === 'informe' && _formatoFirmasInforme() === 'tarjetas') {
    t = {
      titulo: t.titulo,
      opciones: [
        { id: 'firmas', t: 'Firmas y pie', d: 'Tarjetas NOMBRE / FIRMA / TIMBRE (dirección, responsable y encargado de la unidad)', def: true }
      ]
    }
  }
  var esHoja = params && params.modo === 'hoja'
  var subtitulo = ''
  if (tipo === 'semanal') subtitulo = 'Semana N° ' + params.num + ' — ' + params.rango
  else if (tipo === 'mensual') subtitulo = 'Mes ' + params.mes
  else if (tipo === 'informe') subtitulo = 'Mes ' + params.mes

  var htmlBase = HtmlService.createHtmlOutput(_htmlDialogoPDF(tipo, t, subtitulo, params, esHoja))
  var titulo = (esHoja ? '📄 ' : '🖨️ ') + t.titulo

  // 1) MODAL (ventana centrada "tipo notificación"): el usuario ve de inmediato
  //    el dropdown del período, sin depender de paneles laterales. Es la
  //    interfaz preferida porque es válida también en Sheets móvil.
  try {
    ui.showModalDialog(htmlBase.setWidth(430), titulo)
    return
  } catch (e2) {
    Logger.log('Modal no disponible (' + (e2.message || e2) + ') — intentando sidebar.')
  }

  // 2) SIDEBAR (panel lateral derecho) como respaldo.
  try {
    ui.showSidebar(htmlBase)
    return
  } catch (e1) {
    // El contenedor no tiene autorizado ningún diálogo (permiso
    // script.container.ui). La impresión NUNCA queda en nada: se usan las
    // opciones por defecto, la hoja se construye y se ACTIVA (queda visible en
    // pantalla) y, si es PDF, el enlace queda en la pestaña "PDF — ENLACE".
    Logger.log('Diálogos no disponibles (' + (e1.message || e1) + ') — modo sin diálogo (hoja activada).')
    var res = exportarPdfConOpciones(tipo, params, esHoja ? {} : (params.opciones || {}))
    if (res.ok) {
      if (esHoja) {
        try { _mostrarHojaDeImpresion(res.hoja) } catch (e3) { }
      }
      _toast((esHoja ? 'Hoja construida y activada en "' + res.hoja + '".' : 'PDF generado. Enlace en la pestaña "PDF — ENLACE" (activada).'), '✅ ' + SIS.nombre, 5)
    } else {
      _mostrarResultado(ui, res, '', 'No se pudo completar la impresión', '⚠️')
    }
  }
}

// Ventana con el resultado de una impresión sin diálogo de personalización:
// intenta ui.alert (ventana con el enlace); si el permiso del diálogo sigue
// bloqueado, el enlace se muestra en una pestaña activada. Nunca deja al
// usuario sin saber dónde quedó el PDF.
function _mostrarResultado(ui, res, txtOK, txtErr, emoji) {
  var texto = res.ok ? txtOK : (txtErr + ': ' + (res.msg || 'error desconocido'))
  var link = res.url ? ('\n\n' + res.url) : ''
  try {
    if (ui) {
      ui.alert((res.ok ? '✅ ' : '⚠️ ') + (emoji || '') + ' ' + SIS.nombre, texto + link + (res.ok ? '\n\n(El diálogo de personalización se habilitará al ejecutar una vez "🔑 Verificar permisos PDF".)' : ''), ui.ButtonSet.OK)
      return
    }
  } catch (e2) { }
  if (res.url) {
    _mostrarEnlaceEnHoja(res.url, '⚠️ ' + (emoji || '') + ' ' + SIS.nombre, 'Haga clic en el enlace azul para abrir el resultado.')
  }
}

// ─── Exportación con opciones (llamada desde el diálogo) ─────────────────────
// Devuelve { ok, url, nombre } o { ok:false, msg }
// Si params.modo === 'hoja': construye la hoja, la activa y devuelve
// { ok, hoja, nombre } SIN exportar PDF (para "Ver hoja de impresión").
function exportarPdfConOpciones(tipo, params, opciones) {
  var resp = { ok: false, msg: '' }
  try {
    var t = IMP_TIPOS[tipo]
    if (!t) return { ok: false, msg: 'Tipo de impresión no reconocido.' }
    opciones = opciones || {}
    var esHoja = params && params.modo === 'hoja'
    var hoja, nombre, anio = 0

    // ── CACHÉ DE HOJA: si la hoja ya está construida para el mismo período y
    // las mismas opciones, NO se reconstruye (el PDF sale en segundos). La
    // firma se guarda en las propiedades del documento y se compara al volver
    // a imprimir la misma semana/mes. Ediciones manuales se conservan.
    var firma = _firmaImpresion(tipo, params, opciones)
    if (params && params.forzar) firma = ''

    if (tipo === 'semanal') {
      if (_firmaGuardada('semanal') !== firma || firma === '') {
        _construirHojaSemanal(params.key, opciones)
        _guardarFirma('semanal', firma)
      }
      hoja = HOJA.semana
      var anioSem = /^S\d+\/(\d{4})$/.exec(params.key)
      anio = Number(anioSem ? anioSem[1] : 0)
      nombre = 'S' + params.num + '-' + (anioSem ? anioSem[1] : '') +
        ' · Registro semanal carro de paro (' + String(params.rango).replace(/\//g, '-') + ')'
    } else if (tipo === 'mensual') {
      if (_firmaGuardada('mensual') !== firma || firma === '') {
        _construirHojaMensual(params.mes, opciones)
        _guardarFirma('mensual', firma)
      }
      hoja = HOJA.impresion
      var mp = /^(\d{2})\/(\d{4})$/.exec(params.mes)
      anio = Number(mp ? mp[2] : 0)
      nombre = (mp ? mp[2] + '-' + mp[1] : params.mes) + ' · Resumen mensual carro de paro'
    } else if (tipo === 'informe') {
      if (_firmaGuardada('informe') !== firma || firma === '') {
        _construirHojaInforme(params.mes, opciones)
        _guardarFirma('informe', firma)
      }
      hoja = HOJA.informe
      var fp = /^(\d{2})\/(\d{4})$/.exec(params.mes)
      anio = Number(fp ? fp[2] : 0)
      nombre = 'Informe mensual de revisión · ' + (fp ? fp[2] + '-' + fp[1] : params.mes)
    } else {
      return { ok: false, msg: 'Tipo de impresión no reconocido.' }
    }

    if (esHoja) {
      _mostrarHojaDeImpresion(hoja)
      resp = { ok: true, hoja: hoja, nombre: nombre }
    } else {
      if (anio === 0) anio = Number(_fmt(_hoy()).slice(-4))
      // El informe es un documento de ARCHIVO: el PDF no oculta su hoja.
      var res = _exportarPdfDeHoja(hoja, nombre, anio, tipo === 'informe' ? false : true)
      if (res.ok) {
        _logEvento('PDF', 'PDF personalizado generado (' + tipo + '): ' + nombre)
        // El enlace SIEMPRE queda en la pestaña "PDF — ENLACE" (por si la
        // ventana del diálogo no lo muestra o el usuario la cierra).
        _mostrarEnlaceEnHoja(res.url, '🖨️ ' + t.titulo + ' generado',
          'Haga clic en el enlace verde de abajo para abrir el PDF en una pestaña nueva.')
        resp = { ok: true, url: res.url, nombre: nombre, hoja: hoja }
      } else {
        resp = { ok: false, msg: res.msg }
      }
    }
  } catch (e) {
    resp = { ok: false, msg: 'Error inesperado: ' + (e.message || e) }
  }
  return resp
}

// ─── FIRMA DE CONSTRUCCIÓN (caché de hojas de impresión) ─────────────────────
// Firma estable del documento impreso: tipo + período + las opciones efectivas
// de personalización. Si la hoja ya fue construida con la misma firma, el
// diálogo la reutiliza en lugar de volver a construirla (PDF más rápido).
function _firmaImpresion(tipo, params, opciones) {
  if (!params) return ''
  var periodo = (tipo === 'semanal') ? (params.key || '') : (params.mes || '')
  var firma = tipo + '|' + periodo
  // El INFORME tiene dos formatos de cierre (tarjetas / fila por fecha) que se
  // eligen en CONFIG: se incluyen en la firma para que la hoja se reconstruya
  // al cambiar el dropdown, aunque las opciones del diálogo no cambien.
  if (tipo === 'informe') firma += '|fmt=' + _formatoFirmasInforme()
  var t = IMP_TIPOS[tipo]
  if (t && t.opciones) {
    for (var i = 0; i < t.opciones.length; i++) {
      var id = t.opciones[i].id
      firma += '|' + id + '=' + (_opcValor(opciones, id, tipo) ? 1 : 0)
    }
  }
  return firma
}
function _firmaGuardada(tipo) {
  try {
    return String(PropertiesService.getDocumentProperties().getProperty('impFirma_' + tipo) || '')
  } catch (e) { return '' }
}
function _guardarFirma(tipo, firma) {
  try { PropertiesService.getDocumentProperties().setProperty('impFirma_' + tipo, firma) } catch (e) { }
}

// ─── HTML del diálogo (diseño institucional + barra de progreso) ─────────────
// Las casillas se inicializan con el valor actual de CONFIG ("Impresión — qué
// se imprime"), para que el panel refleje siempre lo que se imprimirá.
function _htmlDialogoPDF(tipo, t, subtitulo, params, esHoja) {
  var opciones = []
  for (var i = 0; i < t.opciones.length; i++) {
    var o = t.opciones[i]
    opciones.push({ id: o.id, t: o.t, d: o.d, def: _opcValor({}, o.id, tipo) })
  }
  // Períodos disponibles (semana o mes) para elegir con un dropdown en el panel
  var periodos = []
  if (tipo === 'semanal') {
    var sems = _semanasDisponibles()
    for (var p = 0; p < sems.length; p++) {
      periodos.push({ v: sems[p].key, t: 'Semana N° ' + sems[p].num + ' — ' + sems[p].rango, num: sems[p].num, rango: sems[p].rango })
    }
  } else {
    // Meses del año en curso (nombre del mes a la vista; el AÑO se detecta
    // automáticamente): siempre aparecen los 12, haya o no revisiones.
    var mesesL = _listaMesesAno()
    for (var q = 0; q < mesesL.length; q++) {
      periodos.push({ v: mesesL[q].v, t: mesesL[q].t, num: 0, rango: '' })
    }
  }
  var data = { tipo: tipo, titulo: t.titulo, subtitulo: subtitulo, params: params, opciones: opciones, esHoja: !!esHoja, periodos: periodos }
  var json = JSON.stringify(data).replace(/</g, '\\u003c')
  var primario = '#1E6B52'
  var aviso = '#E67E22'
  var gris = '#566573'
  var botonGen = esHoja ? 'Ver hoja de impresión' : 'Generar PDF'

  return [
    '<!DOCTYPE html><html><head><base target="_top"><meta charset="utf-8">',
    '<style>',
    '*{box-sizing:border-box;margin:0;padding:0}',
    'body{font-family:Roboto,Arial,sans-serif;background:#F4F6F6;color:#17202A}',
    '.hd{background:linear-gradient(135deg,' + primario + ',#148F77);color:#fff;padding:14px 16px}',
    '.hd h2{font-size:15px;letter-spacing:.3px}',
    '.hd .sub{font-size:11px;opacity:.92;margin-top:3px;word-break:break-word}',
    '.body{padding:14px 14px 6px}',
    '.sec{font-size:10px;font-weight:bold;color:' + gris + ';text-transform:uppercase;letter-spacing:1px;margin-bottom:8px}',
    '.opc{background:#fff;border:1px solid #E3E9EC;border-left:4px solid ' + primario + ';border-radius:6px;padding:8px 10px;margin-bottom:7px;cursor:pointer;display:flex;gap:8px;align-items:flex-start;transition:border-color .15s,box-shadow .15s}',
    '.opc:hover{border-color:' + primario + ';box-shadow:0 1px 4px rgba(0,0,0,.08)}',
    '.opc input{margin-top:2px;width:16px;height:16px;accent-color:' + primario + ';cursor:pointer;flex-shrink:0}',
    '.opc .tx{flex:1}',
    '.opc .tt{font-size:12px;font-weight:bold}',
    '.opc .dd{font-size:10px;color:' + gris + ';margin-top:2px;line-height:1.3}',
    '.pie{display:flex;flex-wrap:wrap;gap:6px;padding:8px 14px 14px;justify-content:flex-end}',
    'button{font-family:inherit;font-size:12px;font-weight:bold;border:none;border-radius:6px;padding:9px 12px;cursor:pointer;transition:transform .1s,opacity .15s}',
    'button:hover{transform:translateY(-1px)}',
    'button:active{transform:translateY(0)}',
    'button:disabled{opacity:.5;cursor:default;transform:none}',
    '.btnSec{background:#fff;border:1px solid #CBD5DB;color:' + gris + '}',
    '.btnPri{background:' + primario + ';color:#fff;flex:1;min-width:120px}',
    '.btnPri:hover{background:#155A45}',
    '#progreso{background:#fff;border-top:1px solid #E3E9EC;padding:16px 14px}',
    '.barra{height:10px;background:#E8EEF1;border-radius:6px;overflow:hidden}',
    '.relleno{height:100%;width:0;background:linear-gradient(90deg,' + primario + ',#2ECC71);border-radius:6px;transition:width .5s ease}',
    '#txtPaso{font-size:12px;color:' + gris + ';margin-bottom:8px;font-weight:bold}',
    '#resultado{background:#fff;border-top:1px solid #E3E9EC;padding:16px 14px}',
    '.okPanel{background:#E9F7EF;border:1px solid #A9DFBF;border-radius:8px;padding:12px 14px}',
    '.okPanel b{color:' + primario + ';font-size:14px}',
    '.okPanel .nm{font-size:12px;color:#1E8449;margin-top:4px;word-break:break-all}',
    '.okPanel a{display:inline-block;margin-top:10px;background:' + primario + ';color:#fff;text-decoration:none;font-weight:bold;font-size:13px;padding:9px 14px;border-radius:6px}',
    '.errPanel{background:#FDEDEC;border:1px solid #F5B7B1;border-radius:8px;padding:12px 14px;font-size:12px;color:#C0392B}',
    '.sel{width:100%;font-family:inherit;font-size:12px;padding:8px 10px;border:1px solid #CBD5DB;border-radius:6px;background:#fff;color:#17202A;margin-bottom:10px}',
    '</style></head><body>',
    '<div class="hd"><h2>' + (esHoja ? '📄 ' : '🖨️ ') + 'Personalizar impresión</h2><div class="sub">' + t.titulo + ' · ' + subtitulo + '</div></div>',
    '<div class="body" id="cuerpo">',
    '<div class="sec">' + (tipo === 'semanal' ? 'Semana a imprimir' : (tipo === 'informe' ? 'Mes del informe a imprimir' : 'Mes a imprimir')) + '</div>',
    '<select id="selPeriodo" class="sel"></select>',
    '<div class="sec">Opciones de personalización</div>',
    '<div id="lista"></div>',
    '</div>',
    '<div id="progreso" style="display:none">',
    '<div id="txtPaso">Preparando…</div><div class="barra"><div class="relleno" id="relleno"></div></div>',
    '</div>',
    '<div id="resultado" style="display:none"></div>',
    '<div class="pie" id="pie">',
    '<button class="btnSec" onclick="google.script.host.close()">Cancelar</button>',
    '<button class="btnSec" onclick="restaurar()">Valores por defecto</button>',
    '<button class="btnPri" id="btnGen" onclick="generar()">' + botonGen + '</button>',
    '</div>',
    '<script>',
    'var DATA = ' + json + ';',
    'function init(){',
    '  var sel = document.getElementById("selPeriodo");',
    '  if (sel && DATA.periodos) {',
    '    var oh = \'<option value="__AUTO__">(automático: \' + (DATA.tipo === "semanal" ? "última semana con datos" : "último mes con datos") + \')</option>\';',    '    for (var j = 0; j < DATA.periodos.length; j++) {',
    '      oh += \'<option value="\' + DATA.periodos[j].v + \'">\' + DATA.periodos[j].t + \'</option>\';',
    '    }',
    '    sel.innerHTML = oh;',
    '    var actual = DATA.tipo === "semanal" ? (DATA.params.key || "") : (DATA.params.mes || "");',
    '    if (actual) { for (var z = 0; z < sel.options.length; z++) { if (sel.options[z].value === actual) { sel.selectedIndex = z; break; } } }',
    '  }',
    '  var html = "";',
    '  for (var i = 0; i < DATA.opciones.length; i++) {',
    '    var o = DATA.opciones[i];',
    '    html += \'<div class="opc" onclick="toggle(this)"><input type="checkbox" data-id="\' + o.id + \'" \' + (o.def ? "checked" : "") + \'><div class="tx"><div class="tt">\' + o.t + \'</div><div class="dd">\' + o.d + \'</div></div></div>\';',
    '  }',
    '  document.getElementById("lista").innerHTML = html;',
    '}',
    'function toggle(el){ var c = el.querySelector("input"); c.checked = !c.checked; }',
    'function restaurar(){',
    '  var cbs = document.querySelectorAll("#lista input");',
    '  for (var i = 0; i < cbs.length; i++) { cbs[i].checked = DATA.opciones[i].def; }',
    '}',
    'function recoger(){',
    '  var o = {};',
    '  var cbs = document.querySelectorAll("#lista input");',
    '  for (var i = 0; i < cbs.length; i++) { if (cbs[i].checked) o[cbs[i].dataset.id] = true; }',
    '  return o;',
    '}',
    'function setPaso(txt, pct){',
    '  document.getElementById("txtPaso").textContent = txt;',
    '  document.getElementById("relleno").style.width = pct + "%";',
    '}',
    'function generar(){',
    '  document.getElementById("btnGen").disabled = true;',
    '  document.getElementById("pie").style.display = "none";',
    '  document.getElementById("resultado").style.display = "none";',
    '  document.getElementById("cuerpo").style.display = "none";',
    '  document.getElementById("progreso").style.display = "block";',
    '  setPaso("Preparando datos…", 15);',
    '  var sel = document.getElementById("selPeriodo");',
    '  if (sel && sel.value !== "__AUTO__" && DATA.periodos) {',
    '    for (var i = 0; i < DATA.periodos.length; i++) {',
    '      if (DATA.periodos[i].v === sel.value) {',
    '        if (DATA.tipo === "semanal") { DATA.params.key = sel.value; DATA.params.num = DATA.periodos[i].num; DATA.params.rango = DATA.periodos[i].rango; }',
    '        else { DATA.params.mes = sel.value; }',
    '        break;',
    '      }',
    '    }',
    '  }',
    '  var opc = recoger();',
    '  setTimeout(function(){ setPaso("Construyendo hoja de impresión…", 55); }, 700);',
    '  setTimeout(function(){ setPaso(' + (esHoja ? '"Aplicando opciones elegidas…"' : '"Generando PDF y guardando en Drive…"') + ', 85); }, 1500);',
    '  google.script.run',
    '    .withSuccessHandler(finOK)',
    '    .withFailureHandler(finErr)',
    '    .exportarPdfConOpciones(DATA.tipo, DATA.params, opc);',
    '}',
    'function finOK(res){',
    '  document.getElementById("progreso").style.display = "none";',
    '  var r = document.getElementById("resultado");',
    '  r.style.display = "block";',
    '  if (res.ok) {',
    '    if (DATA.esHoja) {',
    '      r.innerHTML = \'<div class="okPanel"><b>✅ Hoja de impresión lista</b><div class="nm">\' + res.nombre + \'</div><div style="font-size:11px;color:#566573;margin-top:6px">La pestaña "\' + res.hoja + \'" quedó construida con las opciones elegidas. Revisela y luego: Archivo → Imprimir (o Ctrl+P) para obtener el PDF.</div><a target="_blank" href="#" onclick="google.script.host.close(); return false;">✔ Cerrar y revisar la hoja</a></div>\';',
    '    } else {',
    '      r.innerHTML = \'<div class="okPanel"><b>✅ PDF generado correctamente</b><div class="nm">\' + res.nombre + \'.pdf</div><div style="font-size:11px;color:#566573;margin-top:6px">El enlace también quedó en la pestaña "PDF — ENLACE" del libro.</div><a target="_blank" href="\' + res.url + \'">📄 Abrir el PDF</a></div>\';',
    '    }',
    '  } else {',
    '    r.innerHTML = \'<div class="errPanel"><b>⚠ No se pudo completar la acción</b><br>\' + (res.msg || "Error desconocido") + \'</div>\';',
    '  }',
    '  document.getElementById("pie").style.display = "flex";',
    '  document.getElementById("btnGen").style.display = "none";',
    '}',
    'function finErr(e){',
    '  document.getElementById("progreso").style.display = "none";',
    '  var r = document.getElementById("resultado");',
    '  r.style.display = "block";',
    '  r.innerHTML = \'<div class="errPanel"><b>⚠ Error de ejecución</b><br>\' + (e && e.message ? e.message : String(e)) + \'</div>\';',
    '  document.getElementById("pie").style.display = "flex";',
    '  document.getElementById("btnGen").style.display = "none";',
    '}',
    'init();',
    '</script></body></html>'
  ].join('')
}
