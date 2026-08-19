// ─────────────────────────────────────────────────────────────────────────────
//  07_PDF — exportación a PDF, permisos de Drive y carpeta de impresiones
//  Devuelve SIEMPRE un objeto {ok, url} o {ok:false, msg} para que el selector
//  muestre un mensaje claro al usuario (nunca un error crudo).
// ─────────────────────────────────────────────────────────────────────────────

// ─── Permisos de Drive/PDF ───────────────────────────────────────────────────

// Verifica permisos sin abrir diálogos; solo toasts cuando falta algo
// El resultado se guarda por ejecución (variable estática): verificar Drive en
// cada PDF era lento; ahora se comprueba una sola vez por invocación.
var __permisosCache = null
function _permisosOkSilencioso() {
  if (__permisosCache !== null) return __permisosCache
  try {
    DriveApp.getRootFolder()
    _carpetaImpresiones()
    __permisosCache = true
  } catch (e) {
    Logger.log('Permisos de Drive pendientes: ' + e)
    __permisosCache = false
  }
  return __permisosCache
}

// ─── PERMISOS (UNA autorización para TODO el proyecto) ───────────────────────
// Apps Script pide permiso UNA sola vez POR PROYECTO, no por archivo ni por
// función: los 13 archivos .gs son parte del mismo proyecto de script, por lo
// que autorizando aquí quedan cubiertos TODOS los menús del sistema.
// `permisos()` ejercita de una vez los servicios usados (hoja de cálculo,
// Drive, exportación PDF por URL) y además verifica que todos los archivos
// clave estén cargados (si falta pegar un .gs, lo informa).
function permisos() {
  var ui = _ui()
  var fallas = []

  // 1) Hoja de cálculo
  try { _ss().getSheets() } catch (e) { fallas.push('Hoja de cálculo: ' + (e.message || e)) }

  // 2) Drive + carpeta de impresiones
  try {
    DriveApp.getRootFolder()
    _carpetaImpresiones()
  } catch (e) { fallas.push('Drive: ' + (e.message || e)) }

  // 3) Exportación PDF real (UrlFetchApp + token de autorización)
  try {
    var ss = _ss()
    var hoja = ss.getSheetByName(HOJA.impresion) || ss.getSheets()[0]
    var url = 'https://docs.google.com/spreadsheets/d/' + ss.getId() +
      '/export?format=pdf&gid=' + hoja.getSheetId() + '&size=' + _papelConfig().url + '&portrait=true&fitw=true'

    var r = UrlFetchApp.fetch(url, {
      headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
      muteHttpExceptions: true
    })
    if (r.getResponseCode() !== 200) fallas.push('PDF: el servicio respondió ' + r.getResponseCode())
  } catch (e) { fallas.push('PDF: ' + (e.message || e)) }

  // 4) Verifica que TODOS los archivos del sistema estén cargados (funciones clave)
  var criticas = [
    'actualizarSistema', 'crearMenu', 'mostrarAyuda', 'mostrarAcerca',
    'formatearConfig', 'formatearFarmacos', 'formatearInsumos', 'formatearRevisiones',
    'formatearBitacora', 'construirTablero', 'construirEstadisticas',
    '_protegerColumnasAutomaticas',
    'nuevaRevisionSemanal', 'completarSemanaCompleta', 'copiarSemanaAnterior',
    'imprimirPdfSemanal', 'imprimirPdfMensual',
    'construirInforme', 'imprimirPdfInforme',
    'exportarPdfConOpciones', '_abrirDialogoPDF',
    '_logEvento', '_maestroSoloPlaceholder', '_cargarArsenal'
  ]
  var faltantes = []
  for (var i = 0; i < criticas.length; i++) {
    if (!_existeFn(criticas[i])) faltantes.push(criticas[i])
  }
  if (faltantes.length) fallas.push('Archivos incompletos (falta pegar un .gs en el editor): ' + faltantes.join(', '))

  if (fallas.length === 0) {
    _toast('Permisos OK: una sola autorización cubre todo el sistema.', '🔑 ' + SIS.nombre)
    try {
      if (ui) ui.alert('🔑 Permisos verificados',
        'Todo listo para trabajar:\n\n' +
        '· Hoja de cálculo: OK\n' +
        '· Drive y carpeta de impresiones: OK\n' +
        '· Exportación PDF (prueba real): OK\n' +
        '· Archivos del sistema cargados (' + criticas.length + ' funciones clave): OK\n\n' +
        'Nota: Apps Script autoriza UNA sola vez por proyecto. Como todos los archivos .gs son parte del mismo proyecto, con esta única autorización quedan habilitados todos los menús (no se pide permiso por cada archivo).',
        ui.ButtonSet.OK)
    } catch (e) { /* el diálogo puede no estar autorizado; el toast ya informó */ }
  } else {
    _avisoPermisos(ui, fallas.join(' | '))
  }
}

// ¿Existe la función `nombre` en el proyecto? (cubre falta de pegado de archivos)
function _existeFn(nombre) {
  try {
    if (typeof globalThis[nombre] === 'function') return true
  } catch (e) { }
  try { return typeof eval(nombre) === 'function' } catch (e) { return false }
}

function _avisoPermisos(ui, detalle) {
  if (!ui) return
  var texto =
    'Para que el sistema funcione, Google pide autorización (UNA sola vez por proyecto, no por archivo).\n\n' +
    'Pasos:\n' +
    '1. Se abrirá una ventana de Google pidiendo el permiso.\n' +
    '2. Elija la cuenta y pulse "Permitir".\n' +
    '3. Si no aparece: Extensiones → Apps Script → ▶ Ejecutar (elija "permisos" o "actualizarSistema") → acepte el permiso.\n' +
    '4. Vuelva a intentar la impresión.\n\n' +
    (detalle ? 'Detalle: ' + detalle : '')
  try {
    ui.alert('Permisos pendientes — cómo activarlos', texto, ui.ButtonSet.OK)
  } catch (e) {
    _toast('Permisos pendientes · ' + (detalle || 'autorice una vez el proyecto desde Apps Script.'), '🔑 ' + SIS.nombre, 6)
  }
}

// Abre la CARPETA DE IMPRESIONES del AÑO ACTUAL. Orden:
// 1) Panel lateral (sidebar) con botón que abre la carpeta en una pestaña
//    nueva con UN clic (los navegadores bloquean el window.open automático).
// 2) Si Google no permite abrir ni el panel ni la ventana, el enlace se muestra
//    directamente en una pestaña activada ("PDF — ENLACE") para abrirla con un
//    clic. Nunca hay pasos intermedios inútiles ni toasts como único aviso.
function abrirCarpetaImpresiones() {
  var ui = _ui()
  var anio = _hoy().getFullYear()
  var carpeta = _carpetaAnual(anio) || _carpetaImpresiones()
  if (!carpeta) {
    try {
      if (ui) ui.alert('Sin acceso', 'No se pudo acceder a la carpeta de impresiones. Ejecute "Verificar permisos (PDF)" primero.', ui.ButtonSet.OK)
    } catch (e) {
      _toast('Sin acceso a la carpeta de impresiones — ejecute "🔑 Verificar permisos PDF".', '⚠ ' + SIS.nombre, 6)
    }
    return
  }

  var url = carpeta.getUrl()
  var nombre = SIS.nombre
  var html = HtmlService.createHtmlOutput(
    '<!DOCTYPE html><html><head><base target="_top"><meta charset="utf-8"><style>' +
    '*{box-sizing:border-box;margin:0;padding:0}body{font-family:Roboto,Arial,sans-serif;background:#F4F6F6;color:#17202A}' +
    '.hd{background:linear-gradient(135deg,#1E6B52,#148F77);color:#fff;padding:14px 16px}' +
    '.hd h2{font-size:15px}.hd .sub{font-size:11px;opacity:.92;margin-top:3px}' +
    '.body{padding:16px;text-align:center}' +
    '.txt{font-size:12px;color:#566573;margin-bottom:16px;line-height:1.5}' +
    'button{font-family:inherit;font-size:13px;font-weight:bold;border:none;border-radius:8px;padding:12px 18px;cursor:pointer;background:#1E6B52;color:#fff;box-shadow:0 2px 6px rgba(0,0,0,.15)}' +
    'button:hover{background:#155A45}button:active{transform:translateY(1px)}' +
    '.pie{display:flex;justify-content:flex-end;padding:10px 16px 14px}' +
    '.pie button{background:#fff;color:#566573;border:1px solid #CBD5DB;padding:8px 12px}' +
    '</style></head><body>' +
    '<div class="hd"><h2>📂 Carpeta de impresiones ' + anio + '</h2><div class="sub">' + SIS.carpetaPDF + ' → ' + anio + '</div></div>' +
    '<div class="body">' +
    '<div class="txt">Los PDF van a la carpeta <b>"' + SIS.carpetaPDF + '/' + anio + '"</b>.<br>Pulsar el botón la abre en una pestaña nueva de Drive.</div>' +
    '<button onclick="window.open(\'' + String(url).replace(/'/g, '&#39;') + '\',\'_blank\');">📂 Abrir carpeta de impresiones</button>' +
    '</div>' +
    '<div class="pie"><button onclick="google.script.host.close()">Cerrar</button></div>' +
    '</body></html>'
  )
  // 1) Sidebar (panel lateral) — no bloquea la hoja y suele estar disponible.
  try {
    ui.showSidebar(html)
    return
  } catch (e1) {
    Logger.log('Sidebar no disponible (' + (e1.message || e1) + ') — intentando modal.')
  }
  // 2) Modal (ventana centrada) como respaldo.
  try {
    ui.showModalDialog(html.setWidth(420).setHeight(250), '📂 Carpeta de impresiones')
    return
  } catch (e2) {
    // 3) Sin diálogos: el enlace queda en una pestaña activada (un clic y se
    // abre la carpeta). Siempre visible, sin pasos intermedios.
    _mostrarEnlaceEnHoja(url, '📂 Carpeta de impresiones ' + anio,
      'Los PDF generados este año se guardan en "' + SIS.carpetaPDF + ' → ' + anio + '". Haga clic en el enlace azul para abrirla. Para que Google muestre el panel lateral, ejecute una vez el menú → "⚙️ Mantenimiento" → "🖨️ Impresión y PDF" → "🔑 Verificar permisos PDF" y acepte la autorización.')
  }
}

// Exporta la hoja como PDF usando la exportación oficial de Google (URL),
// que respeta la configuración de página de la hoja (A4, orientación,
// ajuste al ancho) y solo incluye el rango de impresión (filas recortadas).
// `ocultar` = true (por defecto) oculta la hoja tras exportar; las hojas de
// impresión (SEMANA / IMPRESIÓN) viven ocultas. El informe mensual pasa
// ocultar=false: la hoja es un documento permanente que se queda a la vista.
function _exportarPdfDeHoja(nombreHoja, nombreArchivo, anio, ocultar) {
  var okPermisos = _permisosOkSilencioso()
  if (!okPermisos) {
    return { ok: false, msg: 'Faltan permisos de Drive. Ejecute "Verificar permisos (PDF)" una vez para autorizar, o contacte al administrador de la organización.' }
  }

  try {
    var carpeta = _carpetaAnual(anio) || _carpetaImpresiones()
    if (!carpeta) return { ok: false, msg: 'No se pudo crear/ubicar la carpeta de impresiones en Drive.' }

    var ss = _ss()
    var hoja = ss.getSheetByName(nombreHoja)
    if (!hoja) return { ok: false, msg: 'No existe la hoja de impresión solicitada.' }

    // La exportación oficial con gid FALLA (error 500) si la hoja está oculta:
    // las hojas SEMANA/IMPRESIÓN viven ocultas y, al reutilizar la hoja ya
    // construida (caché), no volvían a mostrarse antes de exportar. Se muestra
    // la hoja solo durante la exportación y se vuelve a ocultar al terminar.
    var estabaOculta = false
    try {
      estabaOculta = hoja.isSheetHidden()
      if (estabaOculta) hoja.showSheet()
    } catch (e) { }

    // Exportación oficial: gid de la hoja + configuración de página explícita
    // (papel según CONFIG, orientación vertical, ajustado al ancho).
    // fitw = ajustar al ancho (una página de ancho), sin cuadrícula y sin
    // el encabezado/fila de títulos de Sheets (que solo estorba en el PDF).
    var url = 'https://docs.google.com/spreadsheets/d/' + ss.getId() +
      '/export?format=pdf&gid=' + hoja.getSheetId() +
      '&size=' + _papelConfig().url + '&portrait=true&fitw=true&gridlines=false&printtitle=false&horizontal_alignment=CENTER&vertical_alignment=TOP' +
      // Márgenes moderados: menos blanco que antes pero con el margen
      // inferior reforzado (0.35) para que la impresora no corte las celdas al
      // imprimir a DOBLE CARA (varias impresoras no imprimen en el borde).
      '&top_margin=0.30&bottom_margin=0.35&left_margin=0.30&right_margin=0.30'

    // Reintentos: el servicio de exportación responde 500 de forma transitoria
    // (carga de Google o caché); se reintenta 3 veces con una pausa corta.
    var r = null
    for (var intento = 1; intento <= 3 && !r; intento++) {
      try {
        var res = UrlFetchApp.fetch(url, {
          headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
          muteHttpExceptions: true
        })
        if (res.getResponseCode() === 200) {
          r = res
        } else if (intento < 3) {
          Utilities.sleep(1500 * intento)
        }
      } catch (eFetch) {
        if (intento < 3) Utilities.sleep(1000 * intento)
      }
    }
    if (!r) {
      // Deja la hoja como estaba: si venía oculta, vuelve a quedar oculta.
      if (estabaOculta) {
        try { hoja.hideSheet() } catch (e2) { }
      }
      return { ok: false, msg: 'El servicio de PDF respondió ' + (res ? res.getResponseCode() : 'error de red') + '. Verifique permisos o intente de nuevo en unos segundos.' }
    }

    var blob = r.getBlob().setName(nombreArchivo + '.pdf')
    var archivo = carpeta.createFile(blob)

    // Las hojas de impresión vuelven a quedar OCULTAS al terminar (menos
    // pestañas a la vista); el enlace del PDF ya quedó en "PDF — ENLACE".
    // El informe mensual SIEMPRE queda visible (es un documento de archivo).
    if (ocultar !== false || estabaOculta) {
      try { ss.getSheetByName(nombreHoja).hideSheet() } catch (e3) { }
    }

    return { ok: true, url: archivo.getUrl() }
  } catch (e) {
    return { ok: false, msg: 'Error inesperado al generar el PDF: ' + e.message }
  }
}

// Busca o crea la carpeta 'Carro de Paro — Impresiones' en el Drive
function _carpetaImpresiones() {
  var nombreCarpeta = SIS.carpetaPDF
  try {
    var it = DriveApp.getFoldersByName(nombreCarpeta)
    if (it.hasNext()) return it.next()
    return DriveApp.createFolder(nombreCarpeta)
  } catch (e) {
    return null
  }
}

// Carpeta del AÑO dentro de la carpeta de impresiones (se crea sola la primera
// vez). Los PDF se guardan ordenados por año: "Carro de Paro — Impresiones/2026".
function _carpetaAnual(anio) {
  var raiz = _carpetaImpresiones()
  if (!raiz) return null
  if (!anio) return raiz
  var nombre = String(anio)
  try {
    var it = raiz.getFoldersByName(nombre)
    if (it.hasNext()) return it.next()
    return raiz.createFolder(nombre)
  } catch (e) {
    return raiz
  }
}

// ─── PDF DE LA SEMANA (revisión semanal lista para firmar) ───────────────────
// La semana se elige en CONFIG → "Semana a imprimir" (dropdown, sin escribir):
// "— Automático —" (o cualquier valor sin datos) usa la última semana revisada.
function imprimirPdfSemanal() {
  var ui = _ui()
  if (!ui) return
  try { _actualizarSelectoresImpresion() } catch (e) { }

  var semanas = _semanasDisponibles()
  if (semanas.length === 0) {
    _alerta(ui, 'Sin datos', 'No hay revisiones registradas aún. Use "Nueva revisión semanal" primero.')
    return
  }

  var elegida = _semanaDesdeConfig(semanas) || semanas[semanas.length - 1]
  _toast('PDF de la semana N° ' + elegida.num + ' (' + elegida.rango + '). Otra semana: CONFIG → "Semana a imprimir" o el panel.', '🖨️ ' + SIS.nombre, 4)
  _abrirDialogoPDF('semanal', { key: elegida.key, num: elegida.num, rango: elegida.rango })
}

// Semana elegida en CONFIG si corresponde a una semana existente; si no, null
function _semanaDesdeConfig(semanas) {
  var cfg = String(_configValor('Semana a imprimir') || '').trim()
  if (/^S\d+\/\d{4}$/.test(cfg)) {
    for (var j = 0; j < semanas.length; j++) {
      if (semanas[j].key === cfg) return semanas[j]
    }
  }
  return null
}

// Mes elegido en CONFIG para el PDF/hoja mensual: "Mes a imprimir" y, si quedó
// en automático, se respeta el "Mes del informe de revisión". Ambos dropdowns
// eligen el MISMO mes: elegir "diciembre" en cualquiera de los dos sirve para
// todos los flujos mensuales (resumen, hoja del mes e informe).
function _mesDesdeConfig(meses) {
  return _mesDesdeTexto(String(_configValor('Mes a imprimir') || '').trim()) ||
    _mesDesdeTexto(String(_configValor('Mes del informe de revisión') || '').trim())
}

// Convierte lo elegido en CONFIG a "MM/AAAA": un NOMBRE de mes ("junio") se
// combina con el año en curso (detectado automáticamente); una clave MM/AAAA
// vieja se respeta tal cual. "— Automático —" o valores raros → null.
function _mesDesdeTexto(cfg) {
  if (!cfg || cfg === '— Automático —') return null
  if (/^\d{2}\/\d{4}$/.test(cfg)) return cfg
  return _mesPorNombre(cfg)
}

// ─── PDF RESUMEN DEL MES (una columna por semana) ────────────────────────────
// El mes se elige en CONFIG → "Mes a imprimir" (dropdown, sin escribir):
// "— Automático —" (o cualquier valor sin datos) usa el último mes revisado.
function imprimirPdfMensual() {
  var ui = _ui()
  if (!ui) return
  try { _actualizarSelectoresImpresion() } catch (e) { }

  var meses = _mesesDisponibles()
  if (meses.length === 0) {
    _alerta(ui, 'Sin datos', 'No hay revisiones registradas aún. Use "Nueva revisión semanal" primero.')
    return
  }

  var mes = _mesDesdeConfig(meses) || _ultimoMesConDatos() || meses[meses.length - 1]
  _toast('PDF resumen del mes ' + mes + '. Otro mes: CONFIG → "Mes a imprimir" o el panel.', '📊 ' + SIS.nombre, 4)
  _abrirDialogoPDF('mensual', { mes: mes })
}

// ─── Menú: hoja de impresión PERSONALIZADA (para imprimir manualmente) ───────
function verHojaSemanal() {
  var ui = _ui()
  if (!ui) return
  try { _actualizarSelectoresImpresion() } catch (e) { }

  var semanas = _semanasDisponibles()
  if (semanas.length === 0) {
    _alerta(ui, 'Sin datos', 'No hay revisiones registradas aún.')
    return
  }

  var elegida = _semanaDesdeConfig(semanas) || semanas[semanas.length - 1]
  _toast('Hoja de la semana N° ' + elegida.num + ' (' + elegida.rango + '). Otra semana: CONFIG → "Semana a imprimir" o el panel.', '📄 ' + SIS.nombre, 4)

  // Abre el diálogo de personalización en modo HOJA (construye la pestaña sin PDF)
  _abrirDialogoPDF('semanal', { key: elegida.key, num: elegida.num, rango: elegida.rango, modo: 'hoja' })
}

function verHojaImpresionMensual() {
  var ui = _ui()
  if (!ui) return
  try { _actualizarSelectoresImpresion() } catch (e) { }

  var meses = _mesesDisponibles()
  if (meses.length === 0) {
    _alerta(ui, 'Sin datos', 'No hay revisiones registradas aún.')
    return
  }

  var mes = _mesDesdeConfig(meses) || _ultimoMesConDatos() || meses[meses.length - 1]
  _toast('Hoja del mes ' + mes + '. Otro mes: CONFIG → "Mes a imprimir" o el panel.', '📄 ' + SIS.nombre, 4)
  _abrirDialogoPDF('mensual', { mes: mes, modo: 'hoja' })
}

// ─── INFORME MENSUAL DE REVISIÓN (una columna por cada día del mes) ───────────
// El mes se elige en CONFIG → "Mes del informe de revisión" (dropdown):
// "— Automático —" (o cualquier valor sin datos) usa el último mes revisado
// (o el mes actual si no hay revisiones). La hoja INFORME MENSUAL es VISIBLE y
// queda archivada como documento; el PDF exporta la hoja tal cual está.
function _mesInformeDesdeConfig(meses) {
  return _mesDesdeTexto(String(_configValor('Mes del informe de revisión') || '').trim()) ||
    _mesDesdeTexto(String(_configValor('Mes a imprimir') || '').trim())
}

// Elige el mes del informe: el de CONFIG si existe; si no, el último con datos;
// como último recurso el mes actual (aunque no haya revisiones, el informe
// sale en blanco listo para completar a mano).
function _mesDelInforme() {
  var meses = _mesesDisponibles()
  var mes = _mesInformeDesdeConfig(meses) || _ultimoMesConDatos() || (meses.length ? meses[meses.length - 1] : null)
  if (!mes) {
    var h = _hoy()
    mes = ('0' + (h.getMonth() + 1)).slice(-2) + '/' + h.getFullYear()
  }
  return mes
}

// Construye (o reconstruye) la hoja INFORME MENSUAL con el mes elegido en
// CONFIG y la deja activa y visible para completar/archivar a mano. Precarga
// las cantidades ya registradas en REVISIONES. Solo reconstruye cuando cambia
// el mes (o su estructura está vacía): las ediciones manuales se conservan.
function construirInforme() {
  var ui = _ui()
  if (!ui) return
  try { _actualizarSelectoresImpresion() } catch (e) { }
  var mes = _mesDelInforme()
  _toast('Informe del mes ' + mes + '. Puede elegir otro mes en la ventana.', '📝 ' + SIS.nombre, 4)
  _abrirDialogoPDF('informe', { mes: mes, modo: 'hoja' })
}

// ¿La hoja INFORME MENSUAL corresponde a TITULO_INFORME y al mes dado?
function _informeCoincideCon(mes) {
  var sh = _ss().getSheetByName(HOJA.informe)
  if (!sh) return false
  try {
    var t = String(sh.getRange(1, 1).getValue() || '').trim()
    if (t.indexOf(TITULO_INFORME) < 0) return false
    var m = String(sh.getRange(2, 1).getValue() || '')
    return m.indexOf(_nombreMes(mes)) >= 0
  } catch (e) { return false }
}

// Exporta a PDF la hoja INFORME MENSUAL tal como está (sin regrabar nada):
// si la hoja ya corresponde al mes de CONFIG se exporta tal cual; si cambió,
// reconstruye el informe de ese mes y luego exporta. Abre el diálogo para
// elegir el mes con un dropdown (no depende de CONFIG).
function imprimirPdfInforme() {
  var ui = _ui()
  if (!ui) return
  try { _actualizarSelectoresImpresion() } catch (e) { }
  var mes = _mesDelInforme()
  _toast('Informe del mes ' + mes + '. Puede elegir otro mes en la ventana.', '📝 ' + SIS.nombre, 4)
  _abrirDialogoPDF('informe', { mes: mes })
}

// Activa la hoja del informe de revisión: abre el diálogo en modo "hoja" para
// elegir el mes con un dropdown y dejar la pestaña lista en pantalla.
function verHojaInforme() {
  var ui = _ui()
  if (!ui) return
  try { _actualizarSelectoresImpresion() } catch (e) { }
  var mes = _mesDelInforme()
  _toast('Hoja del informe del mes ' + mes + '. Puede elegir otro mes en la ventana.', '📄 ' + SIS.nombre, 4)
  _abrirDialogoPDF('informe', { mes: mes, modo: 'hoja' })
}
