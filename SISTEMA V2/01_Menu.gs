// ─────────────────────────────────────────────────────────────────────────────
//  01_MENÚ — onOpen, crearMenu (con submenús), actualizarSistema, ayuda
//  Los permisos de Drive/PDF viven en 07_PDF.gs (toda la lógica de PDF junta).
// ─────────────────────────────────────────────────────────────────────────────

function onOpen() {
  // El menú se instala SIEMPRE primero: aunque algo pesado falle, los
  // comandos quedan disponibles. Si no aparece, recargue la hoja (F5) o
  // ejecute "onOpen" una vez desde el Editor (ver Ayuda).
  try { crearMenu() } catch (e) { Logger.log('onOpen: crearMenu: ' + e) }
  try {
    var esPrimeraVez = !_ss().getSheetByName(HOJA.config)
    if (esPrimeraVez) {
      actualizarSistema()   // PRIMERA vez (aún no existe CONFIG): monta el sistema
    } else if (_configValor('Última versión aplicada') !== SIS.version) {
      // Versión nueva: NO se actualiza solo. Varias personas abren el libro a
      // diario, así que solo se muestra un aviso simple y cada quien sigue su
      // trabajo; quien corresponda aplica la actualización desde el menú
      // "⚙️ Mantenimiento → Actualizar sistema" cuando estime conveniente.
      _avisarVersionNueva()
    } else {
      _permisosOkSilencioso()   // revisa Drive sin molestar; avisa si falta
    }
    try { _actualizarSelectoresImpresion() } catch (e) { Logger.log('Selectores impresión: ' + e) }
    // Tablero y estadísticas al día al abrir el libro (siempre se reconstruyen
    // desde los datos actuales de REVISIONES; por eso "se actualizan solos").
    try { construirTablero() } catch (e) { Logger.log('onOpen tablero: ' + e) }
    try { construirEstadisticas() } catch (e) { Logger.log('onOpen estadísticas: ' + e) }
    _toastBienvenida()          // pendientes de la semana actual, sin molestar
  } catch (e) {
    Logger.log('onOpen: ' + e)
  }
}

// Aviso SIMPLE de versión nueva: no actualiza nada, solo informa. Se muestra
// UNA sola vez por persona y por versión (avisa sin molestar). El sistema se
// actualiza únicamente cuando se ejecuta "Actualizar sistema" del menú.
function _avisarVersionNueva() {
  try {
    var P = PropertiesService.getUserProperties()
    var key = 'aviso_v_' + SIS.version
    if (P.getProperty(key)) return   // esta persona ya vio el aviso de esta versión
    P.setProperty(key, '1')
    _toast('Hay una versión nueva (' + SIS.version + '). No se aplicó automáticamente: actualice desde el menú cuando lo estime conveniente.', '🔔 ' + SIS.nombre)
  } catch (e) { }
}

// Registra en CONFIG la versión que se acaba de aplicar (siempre, aunque el
// resto de la actualización tenga errores menores): así el aviso de "versión
// nueva" deja de mostrarse en la próxima apertura.
function _marcarVersionAplicada() {
  try {
    var sh = _ss().getSheetByName(HOJA.config)
    if (!sh) return
    var row = _filaParametroConfig(sh, 'Última versión aplicada')
    if (row > 0) {
      sh.getRange(row, 2).setValue(SIS.version)
      sh.getRange(row, 2).setNote('Versión aplicada con "Actualizar sistema". No editar.')
    }
  } catch (e) { Logger.log('Marcar versión aplicada: ' + e) }
}

// Aviso suave al abrir: progreso y alertas de la semana actual (si existe)
function _toastBienvenida() {
  try {
    var sh = _ss().getSheetByName(HOJA.revisiones)
    if (!sh) return
    var key = _semKey(_hoy())
    var ultima = _ultimaFilaDatos(sh, REV.item, REV_FILA_DATOS)
    if (ultima < REV_FILA_DATOS) return
    var vals = sh.getRange(REV_FILA_DATOS, REV.semana, ultima - REV_FILA_DATOS + 1, REV.alerta - REV.semana + 1).getValues()  // B..O
    var hechos = 0, total = 0, vencidos = 0
    for (var i = 0; i < vals.length; i++) {
      if (String(vals[i][0]).trim() !== key) continue
      total++
      var a = String(vals[i][REV.alerta - REV.semana] || '').trim()
      if (a !== '') hechos++
      if (a === 'VENCIDO') vencidos++
    }
    if (total === 0) return
    var msg = 'Semana ' + key + ': ' + hechos + ' de ' + total + ' completados'
    if (vencidos) msg += ' · ' + vencidos + ' VENCIDO(S)'
    else if (total - hechos > 0) msg += ' · quedan ' + (total - hechos) + ' por completar'
    else msg += ' · semana completa'
    _toast(msg, '☤ ' + SIS.nombre)
  } catch (e) { }
}

// ─── Menús principales (3 menús separados) ───────────────────────────────────
// · "CARRO DE PARO ☤": uso diario (crear/registrar, ver y navegar).
// · "🖨️ Imprimir y PDF": emisión de PDF y hojas de impresión (propio).
// · "⚙️ Mantenimiento": maestros, datos de prueba, bitácora y actualizar.
// Tres menús cortos son más rápidos que uno largo con submenús anidados.
function crearMenu() {
  var ui = _ui()
  if (!ui) return  // sin UI (▶ Ejecutar desde el Editor) → no hay menú

  // ── Menú principal: uso diario ─────────────────────────────────────────
  // El informe de revisión mensual va PRIMERO (es la tarea siguiente a la
  // revisión semanal) junto a su hoja de rellenado, y luego la semana.
  var menu = ui.createMenu(SIS.menu)
  menu.addItem('📝 Construir informe de revisión (mensual)', 'construirInforme')
  menu.addItem('✍️ Hoja de rellenado del informe mensual', 'verHojaInforme')
  menu.addSeparator()
  menu.addItem('📅 Nueva revisión semanal', 'nuevaRevisionSemanal')
  menu.addItem('✔️ Completar semana completa', 'completarSemanaCompleta')
  menu.addItem('🔒 Cerrar semana y guardarla', 'cerrarSemanaEnRegistro')
  menu.addItem('📋 Copiar semana anterior', 'copiarSemanaAnterior')
  menu.addSeparator()
  menu.addItem('📋 Registro semanal', 'irARevisiones')
  menu.addItem('📊 Tablero de control', 'irATablero')
  menu.addItem('📈 Estadísticas', 'irAEstadisticas')
  menu.addSeparator()

  var nav = ui.createMenu('🧭 Ir a…')
  nav.addItem('🏠 Semana actual', 'irASemanaActual')
  nav.addItem('🔍 Última semana registrada', 'irUltimaSemana')
  nav.addItem('📅 Ir a una semana específica', 'irASemanaN')
  nav.addItem('📅 Crear revisión de otra semana', 'nuevaRevisionSemanaEspecifica')
  menu.addSubMenu(nav)

  menu.addSeparator()
  menu.addItem('❓ Ayuda', 'mostrarAyuda')
  menu.addItem('ℹ️ Sobre el sistema', 'mostrarAcerca')
  menu.addToUi()

  // ── Menú de IMPRESIÓN (menú PROPIO, separado de Mantenimiento) ──────────
  // La impresión/PDF es lo más importante del sistema: va en su propio menú
  // de primer nivel para que se vea de inmediato al abrir el libro.
  var imp = ui.createMenu('🖨️ Imprimir y PDF')
  imp.addItem('🖨️ PDF de la semana', 'imprimirPdfSemanal')
  imp.addItem('📊 PDF resumen del mes', 'imprimirPdfMensual')
  imp.addItem('📝 PDF informe de revisión mensual', 'imprimirPdfInforme')
  imp.addSeparator()
  imp.addItem('📄 Ver hoja de la semana', 'verHojaSemanal')
  imp.addItem('📄 Ver hoja del mes', 'verHojaImpresionMensual')
  imp.addItem('📄 Ver hoja del informe', 'verHojaInforme')
  imp.addItem('📝 Construir informe de revisión', 'construirInforme')
  imp.addSeparator()
  imp.addItem('🔑 Verificar permisos', 'permisos')
  imp.addItem('📂 Abrir carpeta de impresiones (año actual)', 'abrirCarpetaImpresiones')
  imp.addItem('⚙️ Tamaño de página y opciones', 'irAConfig')
  imp.addToUi()

  // ── Menú de mantenimiento ───────────────────────────────────────────────
  var admin = ui.createMenu('⚙️ Mantenimiento')

  var mast = ui.createMenu('🗂️ Maestros')
  mast.addItem('💊 Fármacos', 'irAFarmacos')
  mast.addItem('🧫 Insumos', 'irAInsumos')
  admin.addSubMenu(mast)

  var datos = ui.createMenu('🧰 Datos y limpieza')
  datos.addItem('🧪 Cargar datos de prueba', 'cargarDatosPrueba')
  datos.addItem('🗑️ Eliminar revisión de una semana', 'borrarSemana')
  datos.addItem('🔒 Cerrar semana y guardarla', 'cerrarSemanaEnRegistro')
  datos.addItem('🗂️ Ver semanas cerradas', 'irASemanasCerradas')
  datos.addItem('🧹 Limpiar búsquedas', 'limpiarBusqueda')
  datos.addItem('🧾 Bitácora de operaciones', 'irABitacora')
  admin.addSubMenu(datos)

  admin.addSeparator()
  admin.addItem('🔄 Actualizar sistema', 'actualizarSistema')
  admin.addToUi()
}

// ─── Actualizar sistema (aplicar estructura y formato) ───────────────────────
// Cada paso es independiente: si uno falla, los demás siguen y se reporta.
// Todos los pasos van como cierre (thunk) para que una función faltante
// (archivo .gs no pegado en el editor) se registre como error y NO detenga
// el resto de la actualización.
function actualizarSistema() {
  var errores = []
  var paso = function (nombre, fn) {
    try { fn() } catch (e) { errores.push(nombre + ': ' + (e.message || e)) }
  }
  paso('Configuración', function () { formatearConfig() })
  paso('Selectores de impresión', function () { _actualizarSelectoresImpresion() })
  paso('Maestro Fármacos', function () { formatearFarmacos() })
  paso('Maestro Insumos', function () { formatearInsumos() })
  paso('Registro semanal', function () { formatearRevisiones() })
  paso('Registro de semanas cerradas', function () { if (typeof formatearSemanasCerradas === 'function') formatearSemanasCerradas() })
  paso('Limpieza de hojas base', function () { _limpiarHojasBase() })
  paso('Recorte de filas y columnas', function () { _recortarHojas() })
  paso('Tablero de control', function () { construirTablero() })
  paso('Estadísticas', function () { construirEstadisticas() })
  paso('Bitácora', function () { if (typeof formatearBitacora === 'function') formatearBitacora() })
  paso('Eliminación de la hoja VENCIMIENTOS', function () { _eliminarHojaVencimientos() })
  paso('Control de calidad', function () { if (typeof _pasoControlCalidad === 'function') _pasoControlCalidad() })
  paso('Protección de columnas automáticas', function () { _protegerColumnasAutomaticas() })
  paso('Colores de pestañas', function () { _pintarPestanas() })
  paso('Menú', function () { crearMenu() })
  paso('Permisos PDF', function () { _permisosOkSilencioso() })
  _marcarVersionAplicada()   // registra la versión aplicada: apaga el aviso de "versión nueva"

  var ui = _ui()
  if (errores.length === 0) {
    _logEvento('SISTEMA', 'Actualización a v' + SIS.version + ' — sin errores')
    _toast('Sistema actualizado a v' + SIS.version + ' — sin errores', '✔ ' + SIS.nombre)
  } else if (ui) {
    _logEvento('SISTEMA', 'Actualización con errores: ' + errores.join(' | '))
    _alerta(ui, 'Hubo problemas al actualizar',
      'Algunos pasos fallaron (los demás siguieron trabajando):\n\n' + errores.join('\n'))
  } else {
    _logEvento('SISTEMA', 'Actualización con errores: ' + errores.join(' | '))
    Logger.log('Errores al actualizar: ' + errores.join(' | '))
  }
}

// Colores de las pestañas (una sola fuente de verdad en C.tab*)
function _pintarPestanas() {
  _pintarPestana(HOJA.config, C.tabConfig)
  _pintarPestana(HOJA.farmacos, C.tabFarmacos)
  _pintarPestana(HOJA.insumos, C.tabInsumos)
  _pintarPestana(HOJA.revisiones, C.tabRevisiones)
  _pintarPestana(HOJA.semana, C.tabSemana)
  _pintarPestana(HOJA.informe, C.tabInforme)
  _pintarPestana(HOJA.impresion, C.tabImpresion)
  _pintarPestana(HOJA.tablero, C.tabTablero)
  _pintarPestana(HOJA.estadisticas, C.tabEstadisticas)
  _pintarPestana(HOJA.bitacora, C.tabBitacora)
  _pintarPestana(HOJA.semanasCerradas, C.tabSemanasCerradas)
  _ordenarPestanas()
}

// Reordena físicamente las pestañas según HOJA_ORDEN (en un libro ya creado
// las pestañas no se mueven solas al cambiar el índice: se desplazan aquí).
// Orden lógico: INFORME MENSUAL (primera hoja, rellenado/consulta) →
// REVISIONES (trabajo diario) → TABLERO → ESTADÍSTICAS → FÁRMACOS → INSUMOS
// → SEMANAS CERRADAS → BITÁCORA → CONFIG.
// Las hojas temporales SEMANA e IMPRESION quedan OCULTAS (solo se ven con
// "Ver hoja de la semana/mes" o durante la generación de cada PDF).
function _ordenarPestanas() {
  var ss = _ss()
  var pos = 1
  var orden = ['informe', 'revisiones', 'tablero', 'estadisticas', 'farmacos', 'insumos', 'semanasCerradas', 'bitacora', 'config']
  for (var i = 0; i < orden.length; i++) {
    var sh = ss.getSheetByName(HOJA[orden[i]])
    if (!sh) continue
    try {
      ss.setActiveSheet(sh)
      ss.moveActiveSheet(pos)
    } catch (e) { }
    pos++
  }
  var ocultas = [HOJA.semana, HOJA.impresion]
  for (var h = 0; h < ocultas.length; h++) {
    try {
      var shO = ss.getSheetByName(ocultas[h])
      if (shO && !shO.isSheetHidden()) shO.hideSheet()
    } catch (e) { }
  }
}

// ─── Navegación ──────────────────────────────────────────────────────────────
function irAConfig()       { _hoja(HOJA.config) }
function irAFarmacos()     { _hoja(HOJA.farmacos) }
function irAInsumos()      { _hoja(HOJA.insumos) }
function irARevisiones()   { _hoja(HOJA.revisiones) }
function irASemana()       { _hoja(HOJA.semana) }
function irAImpresion()    { _hoja(HOJA.impresion) }
function irATablero()      { if (typeof construirTablero === 'function') construirTablero(); _hoja(HOJA.tablero) }
function irAEstadisticas() { if (typeof construirEstadisticas === 'function') construirEstadisticas(); _hoja(HOJA.estadisticas) }
function irABitacora() {
  if (typeof formatearBitacora === 'function') {
    formatearBitacora()
  } else {
    _toast('Falta el archivo 12_Bitacora.gs en el editor de Apps Script: la bitácora no está disponible.', '⚠ ' + SIS.nombre)
  }
  _hoja(HOJA.bitacora)
}

// ─── Ayuda ───────────────────────────────────────────────────────────────────
function mostrarAyuda() {
  var ui = _ui()
  if (!ui) return
  var texto = [
    'SISTEMA ' + SIS.nombre + ' — v' + SIS.version + '\n\n',
    '📅 REGISTRO DIARIO (7 columnas, Lun a Dom, por ítem y semana):\n',
    '1. Menú → "📅 Nueva revisión semanal": crea el bloque de la semana de HOY.\n',
    '   Si la semana ya existe, lo avisa y va directamente a ella.\n',
    '2. Escriba la cantidad de cada día en su columna (Lun..Dom). Al escribir:\n',
    '   · El cursor salta al siguiente ítem vacío del mismo día (opcional en CONFIG)\n',
    '   · Se registran fecha y hora automáticas.\n',
    '3. Cada banda muestra el progreso (✔ 12/28). La banda HOY es la semana actual.\n',
    '   El panel superior de REVISIONES resume las alertas en vivo.\n',
    '4. Si casi nada cambió: "✔️ Completar semana completa" rellena los 7 días\n',
    '   con el Stock base y usted ajusta lo que cambió. "📋 Copiar semana anterior"\n',
    '   copia las cantidades del domingo anterior a los días vacíos.\n',
    '5. Menú → "🔒 Cerrar semana": COPIA la semana a "SEMANAS CERRADAS"\n',
    '   (historial permanente con fecha de cierre). El registro se conserva.\n\n',
    '🔎 BÚSQUEDA QUE FILTRA (en el registro y en los maestros):\n',
    '6. Escriba parte del nombre en el cuadro amarillo "Buscar": las filas que NO\n',
    '   coinciden se ocultan temporalmente y quedan solo las encontradas.\n',
    '7. Borre el texto (o menú → "🧹 Limpiar búsquedas") para volver a ver todo.\n',
    '8. La primera coincidencia queda activa para editarla de inmediato.\n\n',
    '🖨️ IMPRESIÓN (PDF automático en tu Drive):\n',
    '9. Elija qué imprimir en CONFIG → sección "IMPRESIÓN — QUÉ SE IMPRIME":\n',
    '   "Semana a imprimir" es un DROPDOWN con las semanas disponibles y\n',
    '   "Mes a imprimir" muestra los 12 MESES POR SU NOMBRE (enero, febrero…)\n',
    '   del año en curso (año detectado automáticamente). "— Automático —"\n',
    '   usa la última semana/mes con datos. Y debajo, con Sí/No, decide qué\n',
    '   columnas y bloques lleva cada PDF. No hay que escribir nada.\n',
    '10. Menú → "PDF de la semana" / "PDF resumen del mes": se imprime el período\n',
    '   elegido. Si el panel de personalización se abre, también permite cambiar\n',
    '   el período en un dropdown y marcar/desmarcar opciones antes de generar.\n',
    '11. Los PDF se guardan en Drive → "Carro de Paro — Impresiones" → carpeta\n',
    '   del AÑO actual (se crea sola). Menú → "📂 Abrir carpeta de impresiones\n',
    '   (año actual)" la abre directamente.\n',
    '12. Las pestañas SEMANA e IMPRESIÓN (hojas de impresión) viven OCULTAS para\n',
    '   no llenar el libro: se muestran al elegir "Ver hoja de la semana/mes" y\n',
    '   vuelven a ocultarse solas tras generar el PDF.\n\n',
    '🗂️ MAESTROS (menú "⚙️ Mantenimiento"):\n',
    '14. FÁRMACOS e INSUMOS: edite la lista real (con autofiltro, búsqueda que\n',
    '    filtra y resaltado de stock bajo el mínimo).\n\n',
    '🧭 NAVEGACIÓN (menú → "🧭 Ir a…"):\n',
    '15. "🏠 Semana actual" salta directo a la banda HOY del registro.\n',
    '16. "📅 Crear revisión de otra semana": útil para feriados o atrasos.\n',
    '17. "🗑️ Eliminar revisión de una semana": borra un bloque por error.\n\n',
    '⚙️ MANTENIMIENTO (menú "⚙️ Mantenimiento"):\n',
    '18. "🔄 Actualizar sistema" tras cada actualización de versión. No borra datos.\n',
    '19. Si los menús no aparecen al abrir:\n',
    '    a) Recargue la hoja (F5) y espere unos segundos.\n',
    '    b) Extensiones → Apps Script → ▶ Ejecutar "onOpen" (autorice si pide).\n',
    '    c) O ejecute "actualizarSistema" desde el Editor.\n',
    '20. Ante cualquier duda o sugerencia, escriba al desarrollador:\n',
    '    patriciovarelacontreras@gmail.com\n\n',
    'Créditos, versión y datos del sistema: Menú → "ℹ️ Sobre el sistema".'
  ].join('')
  _alerta(ui, 'Ayuda — ' + SIS.nombre, texto)
}

// ─── Sobre el sistema (créditos y datos en vivo) ─────────────────────────────
function mostrarAcerca() {
  var ui = _ui()
  if (!ui) return

  var est = _configValor('Establecimiento') || 'CESFAM San Juan'
  var ciudad = _configValor('Ciudad') || 'Coquimbo'
  var programador = _configValor('Programador del sistema') || SIS.autor
  var titulo = _configValor('Título del programador') || 'Técnico en programación nivel medio'
  var correo = _configValor('Correo del programador') || 'patriciovarelacontreras@gmail.com'
  var nF = _leerFarmacos().length
  var nI = _leerInsumos().length
  var nSem = _contarSemanasRegistradas()
  var pestanas = []
  for (var k in HOJA) pestanas.push(HOJA[k])

  var texto = [
    '☤ ' + SIS.nombre + ' — SISTEMA v' + SIS.version + '\n\n',
    '📝 DESCRIPCIÓN\n',
    'Sistema de registro DIARIO de cantidades de fármacos e insumos del carro\n',
    'de paro (una columna por día, Lun a Dom), con cálculo automático de uso y\n',
    'alertas (REPONER / VENCIDO / POR VENCER / OK), resumen mensual por semanas\n',
    'y exportación de PDF personalizables.\n\n',
    '⚙️ FUNCIONALIDADES\n',
    '· Búsqueda que filtra en vivo (oculta lo que no coincide)\n',
    '· Copiar semana anterior · completar semana · cerrar semana (historial)\n',
    '· Tablero de control · Estadísticas (KPIs, tendencia, Pareto, vencimientos)\n',
    '· Impresión PDF con diálogo de personalización (columnas, firmas, etc.)\n',
    '· Bitácora de operaciones y control de calidad automático\n\n',
    '🏥 ESTABLECIMIENTO\n',
    '· ' + est + ' (' + ciudad + ')\n\n',
    '🛠️ INFORMACIÓN TÉCNICA\n',
    '· Versión: ' + SIS.version + '\n',
    '· Última actualización: ' + SIS.actualizacion + '\n',
    '· Plataforma: Google Sheets + Apps Script\n\n',
    '👨‍💻 DESARROLLADOR\n',
    '· ' + programador + '\n',
    '· Título: ' + titulo + '\n',
    '· Correo: ' + correo + '\n\n',
    '📊 DATOS EN VIVO\n',
    '· Fármacos en el maestro: ' + nF + '\n',
    '· Insumos en el maestro: ' + nI + '\n',
    '· Semanas registradas: ' + nSem + '\n',
    '· Pestañas: ' + pestanas.join(' · ') + '\n\n',
    'Actualizaciones: menú "⚙️ Mantenimiento" → "🔄 Actualizar sistema" (no\n',
    'borra datos). Dudas o sugerencias: escriba al correo del desarrollador.\n',
    'Manual de uso: menú → "❓ Ayuda".'
  ].join('')
  _alerta(ui, 'ℹ️ Sobre el sistema', texto)
}

// Cantidad de semanas distintas registradas en REVISIONES (S25/2026, …)
function _contarSemanasRegistradas() {
  var sh = _ss().getSheetByName(HOJA.revisiones)
  if (!sh) return 0
  var ultima = _ultimaFilaDatos(sh, REV.item, REV_FILA_DATOS)
  if (ultima < REV_FILA_DATOS) return 0
  var vals = sh.getRange(REV_FILA_DATOS, REV.semana, ultima - REV_FILA_DATOS + 1, 1).getValues()
  var visto = {}
  for (var i = 0; i < vals.length; i++) {
    var k = String(vals[i][0] || '').trim()
    if (/^S\d+\/\d{4}$/.test(k) && !visto[k]) visto[k] = true
  }
  var n = 0
  for (var j in visto) n++
  return n
}

// ─── Limpieza ────────────────────────────────────────────────────────────────
// Elimina la pestaña VENCIMIENTOS que existía en versiones anteriores
// (v2.12+: los vencimientos se controlan en TABLERO y en las alertas del
// registro, ya no hay hoja propia). El borrado es seguro: solo si existe.
function _eliminarHojaVencimientos() {
  var ss = _ss()
  var sh = ss.getSheetByName('VENCIMIENTOS')
  if (sh) {
    try { ss.deleteSheet(sh) } catch (e) { }
  }
}

// Elimina pestañas residuales "Hoja N" que no pertenecen al sistema
function _limpiarHojasBase() {
  var ss = _ss()
  var permitidas = {}
  for (var k in HOJA) permitidas[HOJA[k]] = true

  var hojas = ss.getSheets()
  for (var i = 0; i < hojas.length; i++) {
    var nombre = hojas[i].getName()
    if (/^Hoja ?\d*$/.test(nombre) && !permitidas[nombre]) {
      try { ss.deleteSheet(hojas[i]) } catch (e) { }
    }
  }
}

// ─── Recorte de hojas ────────────────────────────────────────────────────────
// Deja cada pestaña con solo sus filas/columnas necesarias + margen (MARGEN).
// Las hojas de impresión se calculan según los ítems actuales; Google Sheets
// agrega filas solas si luego se escribe más abajo.
function _recortarHojas() {
  var ss = _ss()
  var ex = function (nombre) { return ss.getSheetByName(nombre) }

  var shC = ex(HOJA.config)
  if (shC) _recortarHoja(shC, _filasConfig(), 3)

  var shF = ex(HOJA.farmacos)
  if (shF) _recortarHoja(shF, _ultimaFilaDatos(shF, FARM.med) + MARGEN.filasMaestro, 7 + MARGEN.colExtra)

  var shI = ex(HOJA.insumos)
  if (shI) _recortarHoja(shI, _ultimaFilaDatos(shI, INSU.nom) + MARGEN.filasMaestro, 6 + MARGEN.colExtra)

  var shR = ex(HOJA.revisiones)
  if (shR) _recortarHoja(shR, _ultimaFilaDatos(shR, REV.item, REV_FILA_DATOS) + MARGEN.filasRevisiones, REV.hora + MARGEN.colExtra)

  // Las hojas de impresión se recortan por su CONTENIDO REAL (no por una
  // estimación): la paginación con pies "Hoja N de M" agrega filas según el
  // papel elegido y recortar por estimación podría cortar el bloque final.
  var shS = ex(HOJA.semana)
  if (shS) _recortarHoja(shS, _ultimaFilaDatos(shS, 1, 2) + MARGEN.filasImpresion, 16 + MARGEN.colExtra)

  var shI2 = ex(HOJA.impresion)
  if (shI2) _recortarHoja(shI2, _ultimaFilaDatos(shI2, 1, 2) + MARGEN.filasImpresion, 22)

  // El informe mensual se recorta por su contenido real (columnas variables:
  // dependen de cuántos días del mes se fijan como columnas del informe).
  var shIF = ex(HOJA.informe)
  if (shIF) _recortarHoja(shIF, Math.max(_ultimaFilaDatos(shIF, 1, 1), 12) + MARGEN.filasMaestro, Math.max(shIF.getLastColumn(), 8))

  var shT = ex(HOJA.tablero)
  if (shT) _recortarHoja(shT, _ultimaFilaDatos(shT, 1, 2) + MARGEN.filasImpresion, 20)

  var shE = ex(HOJA.estadisticas)
  if (shE) _recortarHoja(shE, _ultimaFilaDatos(shE, 1, 2) + MARGEN.filasImpresion, 24)

  var shB = ex(HOJA.bitacora)
  if (shB) _recortarHoja(shB, _ultimaFilaDatos(shB, 1, BIT_FILA_DATOS) + MARGEN.filasMaestro, 4)

  var shSC = ex(HOJA.semanasCerradas)
  if (shSC) _recortarHoja(shSC, _ultimaFilaDatos(shSC, 2, SC_FILA_DATOS) + MARGEN.filasMaestro, SC_TITULOS.length + MARGEN.colExtra)
}
