// ─────────────────────────────────────────────────────────────────────────────
//  SISTEMA CARRO DE PARO — v2.2.25 (versión final estable)
//  Registro semanal de fármacos e insumos — CESFAM San Juan, Coquimbo
//  Proyecto reconstruido: modular, escalable y con permisos resueltos.
//  Este archivo es el ÚNICO lugar donde se definen nombres, colores y layout.
//  Nota: las celdas/hojas NO usan emojis (documentos oficiales); los emojis
//  solo aparecen en el menú y en los diálogos de interfaz (UI).
// ─────────────────────────────────────────────────────────────────────────────

var SIS = {
  nombre: 'CARRO DE PARO',
  version: '2.2.27',
  versionEstable: true,                    // lanzamiento final estable (07/08/2026)
  actualizacion: '07/08/2026',           // fecha de la última actualización
  autor: 'Interno TENS Patricio Varela Contreras A.',
  menu: 'CARRO DE PARO ☤',
  carpetaPDF: 'Carro de Paro — Impresiones'   // carpeta Drive de destino
}

// ─── Pestañas del libro ──────────────────────────────────────────────────────
// Orden de creación: 0=CONFIG, 1=FÁRMACOS, 2=INSUMOS, 3=REVISIONES,
// 4=SEMANA, 5=IMPRESION, 6=TABLERO, 7=ESTADÍSTICAS, 8=BITÁCORA
var HOJA = {
  config:      'CONFIG',
  farmacos:    'FÁRMACOS',
  insumos:     'INSUMOS',
  revisiones:  'REVISIONES',
  semana:      'SEMANA',
  impresion:   'IMPRESION',
  tablero:     'TABLERO',
  estadisticas: 'ESTADÍSTICAS',
  bitacora:    'BITÁCORA',
  semanasCerradas: 'SEMANAS CERRADAS',
  informe:     'INFORME MENSUAL'
}
// Índices de pestaña (para insertar en orden). Orden lógico de trabajo:
// el INFORME MENSUAL primero (hoja de rellenado y consulta), luego el
// REGISTRO diario, los catálogos, controles, informes y la configuración.
var HOJA_ORDEN = {
  informe: 0, revisiones: 1, farmacos: 2, insumos: 3, tablero: 4, estadisticas: 5, semana: 6, impresion: 7, semanasCerradas: 8, bitacora: 9, config: 10
}

// ─── Paleta institucional ────────────────────────────────────────────────────
var C = {
  primario: '#1E6B52',     // verde institucional (bandas y acentos)
  azul:     '#2E86C1',     // insumos
  semPas:   '#1E6B52',     // banda de semana ya registrada
  semAlt:   '#25855F',     // banda alterna (semanas pares) — más color
  semAct:   '#2471A3',     // banda de la semana ACTUAL (azul destacado)
  claro:    '#E8F6F3',     // fondo claro de celdas de entrada
  alerta:   '#C0392B',     // rojo REPONER / VENCIDO
  aviso:    '#E67E22',     // naranjo POR VENCER / acentos
  ok:       '#1E8449',     // verde OK
  negro:    '#17202A',
  gris:     '#566573',
  zebra:    '#F2F6F4',     // fila alternada suave
  zebraAlt: '#E8F8F0',     // zebra alterna con tinte verde
  grisFondo:'#ECF0F1',     // fondo de columnas automáticas (no editar)
  buscar:   '#FFF2CC',     // resaltado de búsqueda
  cant:     '#FFF8E1',     // celda de Cant. real
  hoyDia:   '#FFE9A8',     // columna del día de HOY en el registro (resaltada)
  borde:    '#1F2937',
  bordeSuave: '#B0BEC5',
  panelAlerta: '#FDEDEC',  // fondos de panel de estado
  panelAviso:  '#FEF5E7',
  panelOk:     '#E9F7EF',
  panelInfo:   '#EBF5FB',  // panel informativo (instrucciones)
  panelNeutro: '#F4F6F6',
  tabFarmacos: '#1E6B52',  // colores de pestañas
  tabInsumos:  '#2E86C1',
  tabRevisiones: '#E67E22',
  tabConfig:   '#566573',
  tabSemana:   '#148F77',
  tabImpresion: '#424949',
  tabTablero:  '#0E6251',
  tabEstadisticas: '#6C3483',
  tabBitacora: '#34495E',
  tabSemanasCerradas: '#00695C',
  tabInforme: '#117A65'
}

// ─── Bitácora de operaciones ─────────────────────────────────────────────────
// Fecha | Hora | Tipo | Detalle — los eventos se agregan con _registrarEvento.
var BIT = { fecha: 1, hora: 2, tipo: 3, detalle: 4 }
var BIT_FILA_DATOS = 4
var BIT_MAX_EVENTOS = 250      // la bitácora se autoacota para no crecer sin fin
var BIT_TITULOS = ['Fecha', 'Hora', 'Tipo', 'Detalle']
var BIT_ANCHOS = [[1, 95], [2, 60], [3, 110], [4, 560]]

// ─── Márgenes de recorte de hojas ────────────────────────────────────────────
// Las hojas quedan con solo sus filas/columnas necesarias + este respiro.
// Google Sheets agrega filas solas si el usuario escribe más abajo. Se usan
// márgenes MÍNIMOS: ninguna hoja sobra filas vacías al final.
var MARGEN = {
  filasMaestro: 6,      // filas libres bajo el último dato del maestro
  filasRevisiones: 8,   // el registro crece una vez por semana (~8 filas de sobra)
  filasImpresion: 2,    // hojas de impresión (se reconstruyen en cada PDF)
  filasConfig: 2,
  colExtra: 1           // columna libre después del último dato
}

// ─── Maestro FÁRMACOS ────────────────────────────────────────────────────────
// A N° | B Reg. ISP | C Medicamento | D Forma farm. | E Stock base | F Stock mín. | G Observaciones
var FARM = { num: 1, isp: 2, med: 3, forma: 4, base: 5, min: 6, obs: 7 }
var FARM_TITULOS = ['N°', 'Registro ISP', 'Medicamento', 'Forma farmacéutica', 'Stock base', 'Stock mín.', 'Observaciones']
var FARM_ANCHOS = [[1, 35], [2, 85], [3, 300], [4, 150], [5, 75], [6, 75], [7, 190], [8, 400]]
var FARM_NOTAS = [
  'Número correlativo.',
  'Registro del Instituto de Salud Pública (si aplica).',
  'Nombre del medicamento. Úselo también para buscar con el cuadro amarillo.',
  'Presentación: Amp. 1 mL, Fco. 10 mL, Comp., Inhalador, etc.',
  'Cantidad que DEBE tener el carro.',
  'Mínimo permitido: si la cantidad real es igual o menor, se marca REPONER.',
  'Observaciones (ej. "Estupefaciente: conteo con libro").'
]

// ─── Maestro INSUMOS ─────────────────────────────────────────────────────────
// A N° | B Insumo | C Cant. base | D Stock mín. | E Vencimiento (MM/AAAA) | F Observaciones
var INSU = { num: 1, nom: 2, base: 3, min: 4, vto: 5, obs: 6 }
var INSU_TITULOS = ['N°', 'Insumo', 'Cant. base', 'Stock mín.', 'Vencimiento', 'Observaciones']
var INSU_ANCHOS = [[1, 35], [2, 300], [3, 85], [4, 85], [5, 105], [6, 190], [7, 400]]
var INSU_NOTAS = [
  'Número correlativo.',
  'Nombre del insumo. Úselo también para buscar con el cuadro amarillo.',
  'Cantidad que DEBE tener el carro.',
  'Mínimo permitido: si la cantidad real es igual o menor, se marca REPONER.',
  'Vencimiento: acepta cualquier formato (MM/AAAA, DD/MM/AAAA, MM-AAAA…). Se usa para calcular VENCIDO / POR VENCER.',
  'Observaciones (ej. "Revisar sello y fuga").'
]

// ─── Registro REVISIONES (DIARIO — UNA FILA POR ÍTEM Y SEMANA) ────────────────
// Modelo: la revisión se hace TODOS los días de la semana: cada ítem tiene UNA
// fila por semana con 7 columnas de cantidad diaria (una por día, Lun..Dom).
// E "Stock base" de la fila = stock con que empezó el carro esta semana:
//   - si existe la semana anterior en el registro, su último día (Día 7) se
//     copia como Base de esta semana, junto con el vencimiento del insumo;
//   - si es la primera semana, se copia el Stock base del maestro.
// El usuario edita SOLO las 7 columnas de cantidad diaria (H..N, Lun..Dom); el
// resto de columnas (A..G, O..Q) las administra el sistema automáticamente.
// O Alerta: si un día queda ≤ stock mín. → REPONER; si el insumo tiene
// vencimiento, también se evalúa VENCIDO / POR VENCER según su fecha (G).
var REV_FILA_CAB = 5                 // fila de cabecera de la tabla
var REV_FILA_DATOS = 6               // primera fila de datos
var REV = {
  fecha: 1, semana: 2, seccion: 3, item: 4, base: 5, min: 6, vto: 7,
  dia1: 8, dia2: 9, dia3: 10, dia4: 11, dia5: 12, dia6: 13, dia7: 14,
  alerta: 15, obs: 16, hora: 17
}
var REV_NOMBRES_DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
var REV_ABREV_DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
var REV_DIAS = [REV.dia1, REV.dia2, REV.dia3, REV.dia4, REV.dia5, REV.dia6, REV.dia7]
var REV_TITULOS = ['Fecha', 'Semana', 'Sección', 'Ítem', 'Stock base', 'Stock mín.', 'Venc.',
  'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom', 'Alerta', 'Obs.', 'Hora']
var REV_ANCHOS = [
  [1, 85], [2, 100], [3, 85], [4, 180], [5, 70], [6, 70], [7, 65],
  [8, 56], [9, 56], [10, 56], [11, 56], [12, 56], [13, 56], [14, 56],
  [15, 95], [16, 115], [17, 55]
]
// Tooltips (notas) de cada columna del registro — aparecen al pasar el mouse
var REV_NOTAS = [
  'Fecha en que se hizo la revisión (automática, formato DD/MM/AAAA).',
  'Semana del año (clave S25/2026). La semana va de lunes a domingo.',
  'Sección del carro: FÁRMACOS o INSUMOS.',
  'Nombre del medicamento o insumo (se trae del maestro).',
'Cantidad con que el carro se comienza la semana: igual al último día registrado de la semana anterior o al stock base del maestro.',
  'Si la cantidad de un día queda igual o bajo este valor → se marca REPONER.',
  'Vencimiento (cualquier formato de fecha: MM/AAAA, DD/MM/AAAA, MM-AAAA…).',
  'Cantidad registrada al revisar el carro el día Lunes (1). Al escribir, la hora se registra.',
  'Cantidad registrada el día Martes (2).',
  'Cantidad registrada el día Miércoles (3).',
  'Cantidad registrada el día Jueves (4).',
  'Cantidad registrada el día Viernes (5).',
  'Cantidad registrada el día Sábado (6).',
  'Cantidad registrada el día Domingo (7) — con este valor se cierra la semana.',
  'Estado calculado: REPONER (≤ stock mín.) · VENCIDO · POR VENCER · OK',
  'Observaciones de la revisión (opcional).',
  'Hora de la última edición de la cantidad (automática).'
]

// ─── Registro de SEMANAS CERRADAS (historial permanente) ─────────────────────
// Hoja de solo resguardo: cada semana que se cierra se COPIA aquí con su
// fecha de cierre. La copia original de REVISIONES se conserva; esta hoja evita
// pérdida de datos y sirve de trazabilidad. Layout = Fecha de cierre + las
// columnas B..Q de REVISIONES (sin la columna de fecha original).
var SC_FILA_DATOS = 4
var SC_TITULOS = ['Fecha de cierre'].concat(REV_TITULOS.slice(1))
var SC_ANCHOS = [[1, 105]].concat(REV_ANCHOS.slice(1))

// ─── Búsqueda en hojas ───────────────────────────────────────────────────────
// colBuscar: columna principal del nombre. colCodigo: columna de código que
// también se busca (Registro ISP en FÁRMACOS, clave Sxx/AAAA en REVISIONES).
var BUS = {
  farmacos:   { fila: 2, colIni: 2, colFin: 6, filaDatos: 4, colBuscar: FARM.med, colCodigo: FARM.isp, colEditar: FARM.med, nCols: 7, colRestaurar: 0 },
  insumos:    { fila: 2, colIni: 2, colFin: 6, filaDatos: 4, colBuscar: INSU.nom, colCodigo: null,      colEditar: INSU.nom, nCols: 6,  colRestaurar: 0 },
  revisiones: { fila: 2, colIni: 7, colFin: 10, filaDatos: REV_FILA_DATOS, colBuscar: REV.item, colCodigo: REV.semana, colEditar: REV.dia1, nCols: 17, colRestaurar: REV.dia1 }
}

// ─── Tamaños de página disponibles para imprimir (dropdown de CONFIG) ────────
// 'url' es el valor del parámetro size de la exportación PDF de Google;
// 'pageSize' es el NOMBRE de la constante de SpreadsheetApp.PageSize (se
// resuelve en tiempo de ejecución, ver _papelConfig, para no evaluar el
// servicio al cargar el script — si la evaluación fallara al abrir el libro,
// no se montaría ni el menú); 'mm' son las dimensiones del papel (largo × alto).
var PAPEL = {
  'A4':     { nombre: 'A4',     url: 'A4',     pageSize: 'A4',     mm: [210, 297] },
  'Carta':  { nombre: 'Carta',  url: 'LETTER', pageSize: 'LETTER', mm: [215.9, 279.4] },
  'Oficio': { nombre: 'Oficio', url: 'LEGAL',  pageSize: 'LEGAL',  mm: [215.9, 355.6] }
}

// ─── CONFIG: campos por defecto ──────────────────────────────────────────────
var CONFIG_DEF = [
  ['Establecimiento', 'CESFAM San Juan'],
  ['Ciudad', 'Coquimbo'],
  ['Día fijo de revisión semanal', 'Lunes'],
  ['Avanzar al siguiente ítem al escribir', 'Sí'],
  ['Dispositivo (carro de paro)', 'Carro de paro SAPU'],
  ['Dispositivo alternativo (móvil)', 'Carro móvil'],
  ['Responsable del registro', ''],
  ['Cargo del responsable del registro', ''],
  ['Encargado de la unidad', ''],
  ['Cargo del encargado', ''],
  ['Director(a) del establecimiento', ''],
  ['Anticipación de alerta de vencimiento (meses)', '1'],
  ['Pie de página de impresiones', ''],
  ['Semana a imprimir', '— Automático —'],
  ['Mes a imprimir', '— Automático —'],
  ['Imprimir encabezado institucional', 'Sí'],
  ['Tamaño de página para imprimir', 'A4'],
  ['Imprimir resumen de la semana', 'Sí'],
  ['Imprimir fila de hora', 'Sí'],
  ['Imprimir fechas bajo los días', 'Sí'],
  ['Días del informe semanal', 'Todos'],
  ['Mes del informe de revisión', '— Automático —'],
  ['Días del informe de revisión', 'Domingo'],
  ['Formato de firmas del informe', 'Por fecha (una por cada domingo)'],
  ['Imprimir columna USO', 'Sí'],
  ['Imprimir columna ALERTA', 'Sí'],
  ['Imprimir columna USO PROM.', 'No'],
  ['Imprimir observaciones', 'No'],
  ['Imprimir firmas y pie', 'Sí'],
  ['Vaciar celdas en blanco', 'No'],
  ['Programador del sistema', 'Interno TENS Patricio Varela Contreras A.'],
  ['Título del programador', 'Técnico en programación nivel medio'],
  ['Correo del programador', 'patriciovarelacontreras@gmail.com'],
  ['Última versión aplicada', SIS.version]
]

// ─── CONFIG: tipo de control por parámetro ───────────────────────────────────
// 'lista' → dropdown con las opciones dadas · 'numero' → entero 0..24 ·
// 'texto' → texto libre. El control se aplica en la columna Valor (09_Config.gs).
var CONFIG_TIPOS = {
  'Establecimiento': 'texto',
  'Ciudad': 'texto',
  'Día fijo de revisión semanal': ['lista', ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']],
  'Avanzar al siguiente ítem al escribir': ['lista', ['Sí', 'No']],
  'Dispositivo (carro de paro)': 'texto',
  'Dispositivo alternativo (móvil)': 'texto',
  'Responsable del registro': 'texto',
  'Cargo del responsable del registro': ['lista', ['TENS', 'Enfermera/o', 'Matrón/a', 'Técnico en Enfermería', 'Médico']],
  'Encargado de la unidad': 'texto',
  'Cargo del encargado': ['lista', ['Enfermera/o', 'TENS', 'Gestor(a) de stock', 'Matrón/a', 'Jefe(a) de unidad']],
  'Director(a) del establecimiento': 'texto',
  'Anticipación de alerta de vencimiento (meses)': 'numero',
  'Pie de página de impresiones': 'texto',
  'Semana a imprimir': ['lista', ['— Automático —']],
  'Mes a imprimir': ['lista', ['— Automático —']],
  'Tamaño de página para imprimir': ['lista', ['A4', 'Carta', 'Oficio']],
  'Imprimir encabezado institucional': ['lista', ['Sí', 'No']],
  'Imprimir resumen de la semana': ['lista', ['Sí', 'No']],
  'Imprimir fila de hora': ['lista', ['Sí', 'No']],
  'Imprimir fechas bajo los días': ['lista', ['Sí', 'No']],
  'Días del informe semanal': 'texto',
  'Mes del informe de revisión': ['lista', ['— Automático —']],
  'Días del informe de revisión': 'texto',
  'Formato de firmas del informe': ['lista', ['Por fecha (una por cada domingo)', 'Tarjetas (dirección, responsable, encargado)']],
  'Imprimir columna USO': ['lista', ['Sí', 'No']],
  'Imprimir columna ALERTA': ['lista', ['Sí', 'No']],
  'Imprimir columna USO PROM.': ['lista', ['Sí', 'No']],
  'Imprimir observaciones': ['lista', ['Sí', 'No']],
  'Imprimir firmas y pie': ['lista', ['Sí', 'No']],
  'Vaciar celdas en blanco': ['lista', ['Sí', 'No']],
  'Programador del sistema': 'texto',
  'Título del programador': 'texto',
  'Correo del programador': 'texto',
  'Última versión aplicada': 'texto'
}

// Grupos visuales de CONFIG: cada grupo se muestra como una banda de sección
var CONFIG_GRUPOS = [
  ['DATOS DEL ESTABLECIMIENTO', ['Establecimiento', 'Ciudad', 'Día fijo de revisión semanal']],
  ['REGISTRO DIARIO', ['Avanzar al siguiente ítem al escribir', 'Anticipación de alerta de vencimiento (meses)']],
  ['DISPOSITIVOS E IMPRESIÓN', ['Dispositivo (carro de paro)', 'Dispositivo alternativo (móvil)', 'Pie de página de impresiones']],
  ['IMPRESIÓN — QUÉ SE IMPRIME', ['Semana a imprimir', 'Mes a imprimir', 'Tamaño de página para imprimir', 'Imprimir encabezado institucional', 'Imprimir resumen de la semana', 'Imprimir fila de hora', 'Imprimir fechas bajo los días', 'Días del informe semanal', 'Imprimir columna USO', 'Imprimir columna ALERTA', 'Imprimir columna USO PROM.', 'Imprimir observaciones', 'Imprimir firmas y pie', 'Vaciar celdas en blanco']],
  ['INFORME DE REVISIÓN MENSUAL', ['Mes del informe de revisión', 'Días del informe de revisión', 'Formato de firmas del informe']],
  ['FIRMAS Y DOCUMENTOS', ['Responsable del registro', 'Cargo del responsable del registro', 'Encargado de la unidad', 'Cargo del encargado', 'Director(a) del establecimiento']],
  ['SISTEMA', ['Programador del sistema', 'Título del programador', 'Correo del programador', 'Última versión aplicada']]
]

// Mapeo de cada casilla del catálogo de impresión (13_Personalizacion.gs) con
// su parámetro de CONFIG. Cuando Google no permite abrir el panel lateral ni
// la ventana de personalización, la impresión usa estos valores (editables
// siempre como cualquier celda de CONFIG).
var CONFIG_IMPR = {
  encabezado:  'Imprimir encabezado institucional',
  resumen:     'Imprimir resumen de la semana',
  hora:        'Imprimir fila de hora',
  fechas:      'Imprimir fechas bajo los días',
  uso:         'Imprimir columna USO',
  alerta:      'Imprimir columna ALERTA',
  usoprom:     'Imprimir columna USO PROM.',
  obs:         'Imprimir observaciones',
  firmas:      'Imprimir firmas y pie',
  vaciarceldas: 'Vaciar celdas en blanco'
}

// Opciones del dropdown "Forma farmacéutica" del maestro FÁRMACOS (con
// escritura libre permitida: sirve de sugerencia, no de restricción)
var FORMAS_FARMACEUTICAS = [
  'Solución Inyectable', 'Polvo para Solución Inyectable', 'Polvo Liofilizado para Solución Inyectable',
  'Comprimido', 'Comprimido Sublingual', 'Cápsula', 'Solución', 'Inhalador',
  'Crema', 'Jarabe', 'Gotas', 'Polvo para Suspensión Oral'
]

// ─── Arsenal real del carro de paro (se carga la primera vez o cuando el
// maestro solo tiene placeholders "EJEMPLO —"). Resolución N° 2504243202.
// FÁRMACOS: [Registro ISP, Medicamento, Forma farmacéutica, Stock base, Stock mín., Observaciones]
var FARMACOS_ARSENAL = [
  ['F-26617/22', 'Ácido Acetilsalicílico', 'Comprimido', 6, 1, '100 mg. · Carro de Paro · (1) Arsenal Farmacológico SAPU/SAR según ORD C51 N° de MINSAL'],
  ['F-26072/21', 'Ácido Tranexámico', 'Solución Inyectable', 6, 1, '1 g/10 mL. · Carro de Paro'],
  ['F-26655/22', 'Adenosina', 'Solución Inyectable', 6, 1, '6 mg./2 mL. · Carro de Paro, Móvil SAPU'],
  ['F-14620/25', 'Agua Estéril para Inyectables', 'Solución Inyectable', 6, 1, 'Carro de Paro. Ampolla 500 mL, 10 mL y 5 mL.'],
  ['D-1107/20', 'Alcohol Etílico Desnaturalizado', 'Solución', 4, 1, '70% · Carro de Paro'],
  ['F-7618/21', 'Amiodarona Clorhidrato', 'Solución Inyectable', 6, 1, '50 mg./1 mL. · Carro de Paro, Móvil SAPU'],
  ['F-3359/25', 'Atropina Sulfato', 'Solución Inyectable', 6, 1, '1 mg./mL. · Carro de Paro'],
  ['F-7523/21', 'Betametasona Sodio Fosfato', 'Solución Inyectable', 6, 1, '4 mg./mL. · Carro de Paro, Móvil SAPU'],
  ['F-6138/20', 'Bicarbonato de Sodio', 'Solución Inyectable', 6, 1, '8,40% · Carro de Paro. Ampolla 10 mL.'],
  ['F-26319/21', 'Calcio Gluconato', 'Solución Inyectable', 6, 1, '10% · Carro de Paro. Ampolla 10 mL.'],
  ['F-16954/23', 'Captopril', 'Comprimido', 6, 1, '25 mg. · Carro de Paro, Móvil SAPU'],
  ['F-6144/25', 'Clorpromazina Clorhidrato', 'Solución Inyectable', 6, 1, '25 mg./2 mL. · Carro de Paro, Móvil SAPU'],
  ['F-10016/21', 'Cloruro de Potasio', 'Solución Inyectable', 6, 1, '10% · Carro de Paro. Ampolla 10 mL.'],
  ['F-2119/24', 'Cloruro de Sodio', 'Solución Inyectable', 6, 1, '10% · Carro de Paro. Ampolla 10 mL.'],
  ['F-3032/20', 'Diazepam', 'Solución Inyectable', 6, 1, '10 mg./2 mL. · Carro de Paro, Móvil SAPU'],
  ['F-10876/21', 'Dopamina Clorhidrato', 'Solución Inyectable', 4, 1, '200 mg./5 mL. · Carro de Paro, Móvil SAPU · (4) Restringido para su utilización en SAPU y SAR'],
  ['F-5477/20', 'Epinefrina Clorhidrato', 'Solución Inyectable', 6, 1, '1 mg./mL. · Carro de Paro, Móvil SAPU'],
  ['F-3038/20', 'Fitomenadiona', 'Solución Inyectable', 6, 1, '10 mg./mL. · Carro de Paro'],
  ['F-26804/22', 'Flumazenil', 'Solución Inyectable', 6, 1, '0,5 mg./5 mL. · Carro de Paro, Móvil SAPU'],
  ['F-10110/21', 'Furosemida', 'Solución Inyectable', 6, 1, '20 mg./mL. · Carro de Paro, Móvil SAPU'],
  ['F-19760/23', 'Glucosa', 'Solución Inyectable', 6, 1, '10% · Ampolla de 500 mL. Carro de Paro, Móvil SAPU'],
  ['F-13488/24', 'Glucosa Hipertónica', 'Solución Inyectable', 6, 1, '30% · Ampolla de 250 mL. Carro de Paro. Alternativa Terapéutica: Glucosa 30% Solución Inyectable Ampolla 500 mL.'],
  ['F-23507/22', 'Haloperidol', 'Solución Inyectable', 6, 1, '5 mg./mL. · Carro de Paro, Móvil SAPU'],
  ['F-19054/21', 'Hidrocortisona Succinato 100 mg', 'Polvo para Solución Inyectable', 6, 1, '100 mg. · Carro de Paro, Móvil SAPU · Hidrocortisona Succinato polvo'],
  ['F-8025/22', 'Hidrocortisona Succinato 500 mg', 'Polvo Liofilizado para Solución Inyectable', 6, 1, '500 mg. · Carro de Paro, Móvil SAPU · Hidrocortisona Succinato liofilizado'],
  ['F-7662/21', 'Ketamina', 'Solución Inyectable', 4, 1, '50 mg./mL. · Carro de Paro. · (4) Restringido para su utilización en SAPU y SAR'],
  ['F-17121/23', 'Labetalol', 'Solución Inyectable', 4, 1, '100 mg./20 mL. · Carro de Paro · (4) Restringido para su utilización en SAPU y SAR'],
  ['F-10893/21', 'Lanatósido C', 'Solución Inyectable', 6, 1, '0,4 mg./2 mL. · Carro de Paro'],
  ['F-15094/20', 'Lidocaína Clorhidrato', 'Solución Inyectable', 6, 1, '2% · Carro de Paro, Móvil SAPU'],
  ['F-10896/21', 'Lorazepam', 'Solución Inyectable', 6, 1, '4 mg./2 mL. · Carro de Paro'],
  ['F-3369/25', 'Magnesio Sulfato', 'Solución Inyectable', 6, 1, '25% · Carro de Paro, Móvil SAPU'],
  ['F-14713/25', 'Midazolam Clorhidrato', 'Solución Inyectable', 6, 1, '5 mg./mL. · Carro de Paro, Móvil SAPU'],
  ['F-3354/20', 'Morfina Clorhidrato', 'Solución Inyectable', 6, 1, '10 mg./mL. · Carro de Paro, Móvil SAPU'],
  ['F-7808/21', 'Naloxona Clorhidrato', 'Solución Inyectable', 6, 1, '0,4 mg./mL. · Carro de Paro, Móvil SAPU'],
  ['F-10905/21', 'Nitroglicerina Inyectable', 'Solución Inyectable', 4, 1, '50 mg./10 mL. · Carro de Paro · (4) Restringido para su utilización en SAPU y SAR'],
  ['F-1410/23', 'Nitroglicerina Comprimido', 'Comprimido', 2, 1, '0,6 mg. · Carro de Paro · (2) Sin registro sanitario vigente, intermediado por CENABAST'],
  ['F-12163/22', 'Norepinefrina', 'Solución Inyectable', 4, 1, '4 mg./4 mL. · Carro de Paro. · (4) Restringido para su utilización en SAPU y SAR'],
  ['F-10910/21', 'Propanolol', 'Solución Inyectable', 6, 1, '1 mg./mL. · Carro de Paro'],
  ['F-10912/21', 'Ranitidina', 'Solución Inyectable', 6, 1, '50 mg./2 mL. · Carro de Paro'],
  ['F-22676/21', 'Ringer Lactato', 'Solución Inyectable', 6, 1, 'Cloruro de Sodio 0.6% + Cloruro de Potasio 0.03% + Cloruro de Calcio x 2H2O 0.02% + Lactato de Sodio 0.31% · Carro de Paro, Móvil SAPU'],
  ['F-18709/21', 'Sodio Cloruro 0,9% (10-20 mL)', 'Solución Inyectable', 6, 1, '0,90% · Ampolla de 10 mL. y/o 20 mL. Carro de Paro, Móvil SAPU'],
  ['F-18709/21', 'Sodio Cloruro 0,9% (500 mL)', 'Solución Inyectable', 6, 1, '0,90% · Ampolla de 500 mL. Carro de Paro, Móvil SAPU'],
  ['F-18709/21', 'Sodio Cloruro 0,9% (1000 mL)', 'Solución Inyectable', 6, 1, '0,90% · Ampolla de 1000 mL. Carro de Paro'],
  ['F-10914/21', 'Suxametonio Cloruro', 'Solución Inyectable', 6, 1, '100 mg./5 mL. · Carro de Paro'],
  ['F-10917/21', 'Verapamilo Clorhidrato', 'Solución Inyectable', 6, 1, '5 mg./2 mL. · Carro de Paro'],
]

// INSUMOS: [Insumo, Cant. base, Stock mín., Vencimiento (MM/AAAA), Observaciones]
// Los vencimientos los informa bodega; ajuste el stock si difiere del arsenal.
var INSUMOS_ARSENAL = [
  ['Máscara laríngea N.º 4.0', 2, 1, '', ''],
  ['Máscara laríngea N.º 3.0', 2, 1, '', ''],
  ['Máscara laríngea N.º 2.0', 2, 1, '', ''],
  ['Máscara laríngea N.º 1.5', 2, 1, '', ''],
  ['Máscara laríngea N.º 1.0', 2, 1, '', ''],
  ['Electrodos para marcapaso externo', 2, 1, '', ''],
  ['Tubo laríngeo N.º 5.0', 2, 1, '', ''],
  ['Tubo laríngeo N.º 4.0', 2, 1, '', ''],
  ['Tubo laríngeo N.º 3.0', 2, 1, '', ''],
  ['Tubo laríngeo N.º 2.0', 2, 1, '', ''],
  ['Tubo laríngeo N.º 1.0', 2, 1, '', ''],
  ['Tubo laríngeo N.º 0.0', 2, 1, '', ''],
  ['Llave de tres pasos', 2, 1, '', ''],
  ['Laringoscopio de hoja curva', 2, 1, '', ''],
  ['Laringoscopio de hoja recta', 2, 1, '', ''],
  ['Jeringa de 60 mL', 2, 1, '', ''],
  ['Jeringa de 20 mL', 2, 1, '', ''],
  ['Jeringa de 10 mL', 2, 1, '', ''],
  ['Jeringa de 5 mL', 2, 1, '', ''],
  ['Jeringa de 2 mL', 2, 1, '', ''],
  ['Jeringa de insulina', 2, 1, '', ''],
  ['Hoja de bisturí', 2, 1, '', ''],
  ['Guantes estériles talla 8.5', 2, 1, '', ''],
  ['Guantes estériles talla 8.0', 2, 1, '', ''],
  ['Guantes estériles talla 7.5', 2, 1, '', ''],
  ['Guantes estériles talla 7.0', 2, 1, '', ''],
  ['Guantes estériles talla 6.5', 2, 1, '', ''],
  ['Gel conductor', 2, 1, '', ''],
  ['Extensor venoso con regulador de goteo', 2, 1, '', ''],
  ['DEA Zoll con parches', 2, 1, '', ''],
  ['Monitor desfibrilador Zoll', 2, 1, '', ''],
  ['Cánula Mayo N.º 6', 2, 1, '', ''],
  ['Cánula Mayo N.º 4', 2, 1, '', ''],
  ['Cánula Mayo N.º 3', 2, 1, '', ''],
  ['Cánula Mayo N.º 2', 2, 1, '', ''],
  ['Cánula Mayo N.º 1', 2, 1, '', ''],
  ['Cánula Mayo N.º 0', 2, 1, '', ''],
  ['Caja de guantes', 2, 1, '', ''],
  ['Bomba de aspiración', 2, 1, '', ''],
  ['Bolsa recolectora de orina', 2, 1, '', ''],
  ['Bajada de suero simple', 2, 1, '', ''],
  ['Antiparras', 2, 1, '', ''],
  ['Ambú neonatal', 2, 1, '', ''],
  ['Ambú pediátrico', 2, 1, '', ''],
  ['Ambú adulto', 2, 1, '', ''],
  ['Aguja 23 G × 1"', 2, 1, '', ''],
  ['Aguja 21 G × 1"', 2, 1, '', ''],
  ['Aguja 21 G × 1/2"', 2, 1, '', ''],
  ['Aguja 19 G × 1"', 2, 1, '', ''],
  ['Manta térmica', 2, 1, '', ''],
  ['VVP 24G', 2, 1, '', ''],
  ['VVP 22G', 2, 1, '', ''],
  ['VVP 20G', 2, 1, '', ''],
  ['VVP 18G', 2, 1, '', ''],
  ['VVP 16G', 2, 1, '', ''],
  ['VVP 14G', 2, 1, '', ''],
  ['TET 9.0', 2, 1, '', ''],
  ['TET 8.5', 2, 1, '', ''],
  ['TET 8.0', 2, 1, '', ''],
  ['TET 7.5', 2, 1, '', ''],
  ['TET 7.0', 2, 1, '', ''],
  ['TET 5.5', 2, 1, '', ''],
  ['TET 5.0', 2, 1, '', ''],
  ['TET 4.5', 2, 1, '', ''],
  ['TET 4.0', 2, 1, '', ''],
  ['TET 3.5', 2, 1, '', ''],
  ['TET 3.0', 2, 1, '', ''],
  ['TET 2.5', 2, 1, '', ''],
  ['TET 2.0', 2, 1, '', ''],
  ['TET 1.5', 2, 1, '', ''],
  ['TET 1.0', 2, 1, '', ''],
  ['TET 0.5', 2, 1, '', ''],
  ['Tela adhesiva', 2, 1, '', ''],
  ['Tapón Luer', 2, 1, '', ''],
  ['Sonda nasogástrica N.º 16', 2, 1, '', ''],
  ['Sonda nasogástrica N.º 14', 2, 1, '', ''],
  ['Sonda nasogástrica N.º 12', 2, 1, '', ''],
  ['Sonda nasogástrica N.º 10', 2, 1, '', ''],
  ['Sonda nasogástrica N.º 8', 2, 1, '', ''],
  ['Sonda nasogástrica N.º 6', 2, 1, '', ''],
  ['Sonda Foley N.º 22', 2, 1, '', ''],
  ['Sonda Foley N.º 20', 2, 1, '', ''],
  ['Sonda Foley N.º 18', 2, 1, '', ''],
  ['Sonda Foley N.º 16', 2, 1, '', ''],
  ['Sonda Foley N.º 14', 2, 1, '', ''],
  ['Sonda Foley N.º 12', 2, 1, '', ''],
  ['Sonda de aspiración N.º 16', 2, 1, '', ''],
  ['Sonda de aspiración N.º 14', 2, 1, '', ''],
  ['Sonda de aspiración N.º 12', 2, 1, '', ''],
  ['Sonda de aspiración N.º 10', 2, 1, '', ''],
  ['Sonda de aspiración N.º 8', 2, 1, '', ''],
  ['Silicona para aspiración', 2, 1, '', ''],
  ['Scalp Vein 23G', 2, 1, '', ''],
  ['Scalp Vein 21G', 2, 1, '', ''],
  ['Scalp Vein 18G', 2, 1, '', ''],
  ['Pinza Magill', 2, 1, '', ''],
  ['Oxímetro de pulso', 2, 1, '', '']
]

// ─── Textos institucionales ──────────────────────────────────────────────────
var TITULO_MENSUAL = 'REGISTRO MENSUAL DE FÁRMACOS E INSUMOS — CARRO DE PARO'
var TITULO_SEMANAL = 'REGISTRO SEMANAL DE FÁRMACOS E INSUMOS — CARRO DE PARO'
var TITULO_INFORME = 'INFORME DE REVISIÓN MENSUAL — CARRO DE PARO'
var IMP = { filasPorPagina: 38 }  // respaldo si no se puede calcular por geometría A4
