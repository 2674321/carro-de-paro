# CARRO DE PARO — CESFAM SAN JUAN (SISTEMA V2)

Sistema de **registro diario** de cantidades (Lun a Dom), con control de
vencimientos y de fármacos e insumos del carro de paro, con impresión semanal,
resumen mensual por semanas en PDF e **informe de revisión mensual**.
**v2.2.27 (VERSIÓN FINAL ESTABLE)** — revisión diaria: 7 columnas de cantidad,
una por día de la semana.

# Novedades v2.2.27 (Informe de revisión mensual)

- 📝 **Nuevo informe de revisión mensual**: el menú "🖨️ Imprimir y PDF" ahora
  ofrece "📝 Construir informe de revisión" y "📝 PDF informe de revisión
  mensual". Se construye la hoja **INFORME MENSUAL** (visible y editable, para
  dejar archivada) con **todas las columnas FÁRMACOS y INSUMOS**, una columna de
  **cantidad por cada día del mes que corresponda** (por defecto **todos los
  domingos**) y una columna **VENC** (MM/AAAA) a la derecha de cada día, tomada
  del maestro (los fármacos no traen vencimiento, queda en blanco).
- 🗓️ **Mes configurable**: en CONFIG → "INFORME DE REVISIÓN MENSUAL", el
  parámetro **"Mes del informe de revisión"** elige qué mes se usa
  ("— Automático —" usa el último mes con datos) y **"Días del informe de
  revisión"** (casillas ✓ Lun..Dom, por defecto solo Domingo) define qué días
  ocupan columna.
- 🧮 **Precarga automática**: el informe arma la estructura del mes (encabezado
  "MES: XXX", tablas verdes, filas de fecha, bloque de observaciones y firmas) y
  **rellena con los valores ya registrados** en REVISIONES; la columna VAC se
  copia del maestro INSUMOS. La hoja queda lista para completar a mano.
- 🔒 **Se conservan las ediciones manuales**: la hoja solo se reconstruye si se
  cambia el mes; el PDF del informe exporta la hoja **tal cual está** (no se
  regraba), así las anotaciones a mano se conservan al imprimir.

# Novedades v2.2.26 (Optimización de rendimiento)

- ⚡ **Los PDF semanal y mensual se generan mucho más rápido**: cada página de
  la tabla se escribe en LOTE (los valores de todas sus filas en una sola
  llamada y sus estilos/formatos en una llamada por atributo), en vez de
  procesar fila por fila. Antes la generación de un PDF podía tardar ~15-20
  segundos por el volumen de llamadas a celdas; ahora el grueso se resuelve en
  una fracción de ese tiempo (objetivo < 8 s).
- 🔄 **Cachés de una sola lectura por ejecución**: la hoja CONFIG y la lista de
  semanas/meses disponibles se leen UNA vez por operación (antes cada consulta
  re-leía la hoja entera, 2-3 veces por PDF); se invalidan automáticamente al
  guardar o cambiar parámetros.
- 🚀 **Tablero, Estadísticas y Bitácora también en lote**: fondos, colores,
  negritas y alturas de fila se aplican por rangos completos en una sola
  llamada cada uno (antes era una llamada por celda).
- 🖨️ **Menos lecturas al construir el PDF**: los anchos de columnas de las
  tarjetas de firmas se leen en una sola llamada y se corrigió que los guiones
  de relleno ("—") no se limpiaran con la opción "vaciar celdas en blanco".

# Novedades v2.2.25

- **📅 Días del informe semanal**: en CONFIG, el parámetro se elige MARCANDO
  las casillas ✓ Lun..Dom (por defecto los 7 marcados). Si solo se revisa el
  carro los domingos, deje marcado solo "Dom" y el PDF semanal saldrá solo con
  esa columna. La columna "Valor" muestra el resumen automáticamente. El
  cálculo del USO siempre usa la semana completa.
- **📦 USO = consumo total de la semana** (base − última cantidad registrada):
  los ítems con base 0 (muchos insumos clínicos) ahora también muestran su uso
  en el PDF semanal, igual que el mensual — antes quedaban en blanco por un
  control que descartaba las bases en 0.
- **🔢 Celdas con formato de fecha en el PDF**: algunas celdas de cantidades
  salían como fecha en lugar del valor (las columnas arrastraban un formato de
  fecha de corridas anteriores y un stock grande, p. ej. 45334, se mostraba
  como 03/02/2024). Ahora cada celda numérica (semanal y mensual) recibe
  forzosamente formato de número al generarse; las fechas de los encabezados de
  día se mantienen como fechas.
- **🔧 Revisión de la generación de PDF**: corregida la alineación de la
  columna "USO PROM." en el resumen mensual (antes el título quedaba ANTES de
  las semanas pero su valor al final → todos los datos semanales salían
  desalineados una columna cuando la opción estaba activa) y las hojas de
  impresión ahora se recortan al tamaño real del contenido tras cada
  generación (columnas/filas sobrantes de corridas anteriores provocaban
  blanco a la derecha y páginas vacías en el PDF).
- **📐 El PDF siempre ocupa el máximo ancho de la hoja**: si el contenido de
  las columnas resulta más angosto que la página (nombres cortos, semanas
  ocultas, etc.), el sobrante se reparte automáticamente entre las columnas y
  "ajustar al ancho" queda en escala 1:1 — nunca hay espacio en blanco a la
  derecha del documento.
- **🔤 Nombres de fármacos e insumos SIEMPRE completos en los PDF**: la columna
  del nombre ya no tiene un ancho fijo: se mide el nombre más largo real y el
  ancho se ajusta solo (igual que la columna "Forma"). Si algún día se agrega
  un nombre muy largo, la fila crece sola para mostrarlo completo (todas las
  filas con altura llam que alcanza para envolver en dos líneas y el layout se
  adapta automáticamente, con fuente un punto menor para que quepa holgado).
  También se ensanchó la columna del nombre en los catálogos FÁRMACOS e
  INSUMOS, y en la hoja de impresión el nombre va en negrita.
- **🔢 Formato de los PDF más claro y aprovechando el ancho de la hoja**: los
  números (cantidades diarias, N°, Base/Mín., cantidades por semana y USO
  PROM.) se imprimen MÁS GRANDES, en negrita ligera y centrados; el
  medicamento/insumo va en negrita y los textos quedan a la izquierda. Las
  columnas y la fila de datos son más anchas y altas, ocupando mejor el
  espacio libre a la derecha del documento (la escala de "ajustar al ancho"
  queda cerca de 1:1, y los días de la semana tienen columna propia más
  ancha).
- **➡️ Notas al lado derecho de las listas**: la nota de "Stock base / Stock
  mín." y las notas al pie "(1) Arsenal Farmacológico SAPU/SAR… (4) Restringido
  para SAPU y SAR" ya no quedan debajo de la lista a la izquierda: ahora se
  muestran en un panel a la DERECHA de la tabla (columna H en FÁRMACOS, G en
  INSUMOS), con el mismo estilo para la nota de vencimiento de insumos.
- **🔄 Columna "Forma farmacéutica" consistente**: al formatear el maestro se
  normalizan las variantes comunes (mayúsculas, abreviaturas como "comp.",
  plurales, "sol. inyectable"…) a la forma canónica del catálogo. Los valores
  que no coinciden con ninguna forma conocida se respetan.
- **🖨️ Menú propio de impresión**: "Imprimir y PDF" salió de Mantenimiento y es
  ahora un menú de primer nivel (CARRO DE PARO ☤ / 🖨️ Imprimir y PDF /
  ⚙️ Mantenimiento) con los PDF de la semana y del mes, ver hojas, permisos,
  carpeta de impresiones y acceso directo a Configuración.
- **🛡️ La impresión no puede fallar por el tamaño de página**: si el valor de
  CONFIG o la definición de papeles faltara (proyecto incompleto), el sistema
  usa A4 automáticamente en vez de mostrar
  "Cannot read properties of undefined (reading 'A4')".
- **🖨️ Tamaño de página elegible en CONFIG**: nuevo dropdown "Tamaño de página
  para imprimir" (A4 · Carta · Oficio). Todas las impresiones y PDF (semanal y
  mensual) se adaptan solos: ancho de columnas, escala y paginación se
  recalculan según el papel. Por defecto **A4**, vertical, ajustado al ancho.
- **📄 Numeración "Hoja N de M" en el pie de cada página** (en vez de los
  encabezados "FÁRMACOS — HOJA 1/2/…"): cada página cierra con "— Hoja 1 de 3 —"
  calculado con la capacidad real de la página (papel, ancho total de columnas,
  escala de ajuste y alturas de encabezado). Cada sección (FÁRMACOS / INSUMOS)
  empieza en página nueva y el número de página coincide con la página física.
- **🖨️ Márgenes moderados en los PDF**: bordes blancos reducidos (0,30" en los
  lados y 0,35" abajo) para aprovechar más la hoja, pero dejando el margen
  inferior reforzado para que la impresora no corte las celdas al imprimir a
  DOBLE CARA (muchas impresoras no imprimen en el borde).
- **📏 Anchos de columna reequilibrados en los formatos imprimibles**: antes
  el total de anchos era demasiado ancho y la impresión escalaba todo hacia
  abajo, cortando columnas (por ejemplo ALERTA mostraba "POR VEN" en vez de
  "POR VENCER"). La columna ALERTA se ensanchó para que "POR VENCER" quepa
  entero en fármacos e insumos. Ahora el reparto deja la escala cerca de 1:1:
  días con su fecha completa, ALERTA entera y los encabezados sin cortes. Las
  etiquetas de semana del PDF mensual son ahora cortas (ej.: **S. N34**) para
  que quepan holgadas en su columna, y las observaciones se ajustan a la celda.
- **🕓 La pestaña "PDF — ENLACE" mejorada**: título del documento, fecha y hora
  de generación, tamaño de página usado y versión del sistema; el enlace queda
  en una celda verde clicable (hipervínculo real); la hoja queda reducida a sus
  pocas filas (sin filas sobrantes) y con instrucciones de impresión a una cara.
- **📏 La columna "Forma" se ajusta sola a su contenido**: el ancho se calcula
  según el texto de forma farmacéutica más largo (con tope) para que ningún
  término salga cortado, en el PDF semanal y en el mensual.
- **🗑️ Todas las hojas quedan al mínimo de filas que usan**: se eliminaron las
  filas vacías sobrantes (maestros, registro, hojas de impresión, CONFIG,
  tablero, estadísticas). Cada pestaña tiene solo sus filas reales + un respiro
  mínimo; Google agrega filas solas si se escribe más abajo.
- **☑️ Por defecto ya NO se imprimen las columnas Obs. ni USO PROM.**: la
  configuración "Imprimir observaciones" ahora está en **No** (y USO PROM. ya
  estaba en No). Se pueden reactivar desde CONFIG o el panel de impresión.
- **🔔 Aviso de versión nueva UNA sola vez por persona**: el sistema no se
  actualiza solo al abrir (importante con varias personas). Si hay una versión
  nueva solo aparece un aviso simple, una vez por persona y por versión.
  Cuando se ejecuta "⚙️ Mantenimiento → Actualizar sistema", el aviso se apaga
  definitivamente (el sistema registra la versión aplicada en CONFIG).
- **🔄 La primera apertura de un libro nuevo** sí monta el sistema
  automáticamente (no existe aún la hoja CONFIG); después nunca se actualiza
  solo.

- **🐛 Encabezado del PDF semanal corregido**: los títulos de las columnas
  (N°, Reg. ISP, Medicamento, Stock base, Stock mín.) volvieron a aparecer —
  la fila de fechas bajo los días (Lun 15/06…) se escribía sobre la fila de
  títulos y los borraba. Además, el vaciado "celdas en blanco" ya no borra el
  encabezado "N°" por accidente.
- **📏 Encabezados compactos en todos los PDF**: títulos cortos que caben en su
  columna (Forma, Base, Mín., Venc.) y fechas cortas dd/mm bajo los días —
  nada de encabezados cortados a la mitad en la impresión. Se quitó el texto
  sobrante de las bandas: la del mes ahora dice solo "MES: AGOSTO 2026 · HOJA
  MENSUAL" (sin "ESTANDARIZADA — DISPOSITIVOS…").
- **📅 PDF mensual con las semanas REALES del mes**: la hoja usa tantas
  columnas como semanas tiene el mes según el calendario (4, 5 o 6), no siempre
  5, y cada columna corresponde a su semana (Sem. N°23, N°24…). Las semanas
  del mes que aún no se revisaron se marcan **"PEND." en las CELDAS** (en gris,
  el encabezado queda limpio) — de un vistazo se ve cuántas revisiones del mes
  faltan. El título dice "REGISTRO MENSUAL…" y la banda ámbar indica el mes.

- **📅 PDF mensual con las semanas REALES del mes**: la hoja usa tantas
  columnas como semanas tiene el mes según el calendario (4, 5 o 6), no siempre
  5, y cada columna corresponde a su semana (Sem. N°23, N°24…). Las semanas del
  mes que aún no se revisaron se marcan **"(PEND.)"** con sus celdas vacías:
  de un vistazo se ve cuántas revisiones del mes faltan. El título ahora dice
  **"REGISTRO MENSUAL…"** (antes decía "SEMANAL") y la banda ámbar indica el
  mes, ej. "MES: JUNIO 2026".
- **📅 Elegir semana/mes con DROPDOWN (ya no se escribe nada)**: la sección
  "IMPRESIÓN — QUÉ SE IMPRIME" de CONFIG tiene ahora dos selectores nuevos —
  "Semana a imprimir" y "Mes a imprimir" — con las semanas/meses realmente
  disponibles (se actualizan solos al abrir el libro). "— Automático —" usa la
  última semana/mes con datos. El menú "PDF de la semana/mes" y "Ver hoja..."
  leen esos selectores; y si el panel lateral se abre, también trae su propio
  dropdown de período con las fechas de cada semana.
- **🗂️ Menos pestañas a la vista**: las hojas de impresión SEMANA e IMPRESIÓN
  viven OCULTAS (el PDF se genera igual); solo se muestran y activan cuando
  elige "Ver hoja de la semana/mes" y vuelven a ocultarse solas tras generar
  el PDF.
- **🖨️ PDF mensual modernizado (misma línea que el semanal)**: el resumen del
  mes ahora lleva banda verde con el título, banda ámbar con el **MES**
  (ej. "MES: JUNIO 2026"), fila de establecimiento/dispositivos y la banda de
  resumen "COMPLETADOS X DE Y · USO TOTAL · alertas" con colores de estado,
  como el PDF de la semana. Respeta las mismas opciones de CONFIG
  (encabezado, resumen, fechas, obs, USO PROM., firmas, vaciar celdas). La
  columna USO PROM. viene desactivada por defecto (la cantidad final de cada
  semana ya se ve en su columna); actívela en CONFIG si la necesita.
- **📂 Carpeta de impresiones por AÑO**: los PDF se guardan en
  "Carro de Paro — Impresiones → 2026" (la subcarpeta del año se crea sola).
  Los nombres de archivo ahora ordenan naturalmente en Drive:
  "S25-2026 · Registro semanal…" y "2026-06 · Resumen mensual…".
- **📂 Abrir carpeta de impresiones directo**: el menú abre la carpeta del año
  actual con un clic (panel lateral con botón; si Google no permite paneles, el
  enlace queda en la pestaña "PDF — ENLACE" activada — sin pasos intermedios).
- **⚙️ Qué se imprime, editable en CONFIG**: en la hoja CONFIG hay una nueva
  sección **"IMPRESIÓN — QUÉ SE IMPRIME"** con cada elemento del PDF semanal y
  mensual (encabezado institucional, resumen de la semana/mes, fila de hora,
  fechas bajo los días, columnas USO / ALERTA / USO PROM., observaciones,
  firmas y pie, vaciar celdas en blanco) como columnas **Sí/No** editables. El
  sistema las lee en vivo en cada impresión, aunque Google no permita abrir la
  ventana o el panel lateral de personalización: cambie el valor y la próxima
  impresión sale con ese formato. Si el panel lateral sí se abre, las casillas
  se cargan con esos mismos valores.
- **🗑️ Hoja VENCIMIENTOS eliminada**: la pestaña y su PDF se retiraron del
  sistema; el control de vencimientos queda en el TABLERO (VENCIMIENTOS
  PRÓXIMOS) y en ESTADÍSTICAS. Al actualizar, la pestaña vieja se borra sola
  si aún existe.
- **🖼️ Impresión siempre visible (sin depender de diálogos)**: la
  personalización se abre ahora en un **panel lateral (sidebar)** — no bloquea
  la hoja (puedes seguir tocando celdas) y Google lo muestra incluso cuando
  restringe el modal. Si ni el sidebar ni la ventana pueden abrirse, la hoja se
  construye y se **activa en pantalla** (lista para Ctrl+P) y el enlace del PDF
  queda en una pestaña "PDF — ENLACE" con el enlace clicable. La carpeta de
  impresiones también se abre en el panel lateral.
- **🚫 Nada de toasts como único aviso**: si la ventana de diálogo no puede
  abrirse, se intenta `ui.alert` con el enlace; si tampoco, el enlace queda en
  una pestaña activada. La operación nunca muere en silencio.
- **📄 "Ver hoja de la semana / del mes" ahora personaliza**: también abren el
  diálogo de personalización (quitar columnas USO/ALERTA/Obs., encabezado,
  firmas, fechas…) y construyen la hoja con esas opciones, en vez de generar
  siempre el mismo formato. Ideal para que la hoja semanal con los 7 días
  (Lun..Dom) quede legible en papel.
- **📂 Carpeta de impresiones con botón**: ya no es un popup que se cierra solo
  con un enlace de 1 segundo: abre una ventana con un botón "Abrir carpeta de
  impresiones" que abre la carpeta del Drive en una pestaña nueva.
- **📅 Vencimientos en cualquier formato de fecha**: el maestro INSUMOS acepta
  MM/AAAA, DD/MM/AAAA, MM-AAAA, MM/AA, AAAA-MM o fecha real; el sistema lo
  normaliza a MM/AAAA automáticamente y lo usa en las alertas del registro
  (VENCIDO / POR VENCER), el TABLERO y ESTADÍSTICAS. Ya no se pierden fechas
  por "formato inválido".
- **🔄 Vencimientos al día**: al editar el vencimiento de un insumo, se
  actualiza en todas las semanas del registro y se recalculan las alertas
  (REPONER/POR VENCER/VENCIDO) al instante.
- **📊 Estadísticas con diagnóstico**: si aparece "0% / 0 uso", ahora se indica
  la causa exacta: semana sin cantidades en las columnas Lun..Dom, fechas que no
  cumplen formato DD/MM/AAAA, o el maestro sin datos. Antes solo se veía "0" sin
  explicación.
- **⏳ Vencimientos aclarado**: cuando "Ningún insumo vence" puede leer que la
  columna Vto. del maestro INSUMOS está vacía o sin formato MM/AAAA (ese es el
  motivo de que el TABLERO muestre la lista vacía).
- **⚡ Edición más fluida**: al escribir en un buscador sin texto, ya no se
  consulta por fila si está oculta (solo se verifica cuando el filtro está
  activo), lo que acelera el tecleo en REVISIONES y los maestros.
- **⚡ Menos lecturas en la hoja al teclear**: la hora automática, el avance al
  siguiente ítem, el resumen del panel y el repintado de bandas/zebra leen la
  hoja en bloques (1 o 2 llamadas) en lugar de fila por fila; el resumen de
  alertas del panel solo lee el tramo de la semana activa, no todo el historial.
- **🛡️ Diálogos a prueba de bloqueos**: todos los avisos, confirmaciones y
  preguntas (`ui.alert`/`ui.prompt`) que faltaban ahora se blindan: si el
  diálogo no está autorizado, avisan por toast y la operación continúa (nunca
  más se corta por un error de permisos).
- **🧾 Verificación de sintaxis**: los 14 archivos `.gs` pasan un chequeo de
  paréntesis/llaves balanceados (con manejo de cadenas, comentarios y regex),
  sin errores de sintaxis pendientes.

# Novedades v2.11.2

- **🔎 La búsqueda ahora encuentra por CÓDIGO también**: en FÁRMACOS se busca
  en el nombre **y** en el Registro ISP; en REVISIONES, en el nombre **y** en la
  clave de semana (`S32/2026`). Al teclear, las filas que no coinciden se ocultan
  temporalmente y la primera coincidencia queda activa para editarla. Borrar el
  texto (o "🧹 Limpiar búsquedas") restaura la lista completa con sus colores.
- **🖱️ Buscadores libres de protección**: la fila de búsqueda ya no queda bajo
  la protección de las columnas automáticas; todos pueden escribir en el
  buscador (antes la columna G protegida tapaba el de REVISIONES).
- **⚡ Búsqueda más rápida**: una sola lectura en bloque de las dos columnas y
  un único repintado de fondos (matriz completa), en lugar de una llamada por
  fila. El resaltado ya no arrastra el reacomodo de bandas en cada tecla: esas
  se restauran al limpiar.
- **🩹 Fechas del registro se REPARAN solas**: las celdas de fecha en blanco o
  con valores no reconocibles (números, textos raros) heredan la fecha del
  bloque de la semana, o el lunes de la semana si es la primera fila. Así el
  control de calidad deja de marcar "fecha mal registrada" y Estadísticas y los
  PDF cuentan todas las semanas. Aplica al ejecutar "Actualizar sistema".
- **📐 Velocidad de Actualizar sistema**: zebra de los maestros y cálculo de
  alertas del registro en bloque (una lectura + una escritura por tramo de
  datos), sin tocar las filas banda combinadas.

# Novedades v2.11.1

- **📊 Pestañas en orden**: al actualizar, las hojas se reordenan solas en la
  barra inferior con el orden lógico (REVISIONES → FÁRMACOS → INSUMOS →
  VENCIMIENTOS → TABLERO → ESTADÍSTICAS → SEMANA → IMPRESIÓN → SEMANAS
  CERRADAS → BITÁCORA → CONFIG) aunque el usuario las haya movido.
- **✂️ Menos filas basura**: los márgenes bajo los datos se redujeron (60→12 en
  maestros, 90→8 en impresión, etc.), así el recorte de actualizar deja cada hoja
  con solo lo que usa.
- **🕳️ Sin fila vacía al crear una semana**: la banda "SEMANA N°…" arranca ya en
  la fila de datos, sin dejar un hueco antes si aún no había revisiones.
- **🔎 Búsqueda que FILTRA**: el buscador de REVISIONES, FÁRMACOS e INSUMOS ya no
  solo resalta: **oculta temporalmente** las filas que NO coinciden y deja
  visibles solo las encontradas (la primera queda activa para editarla). Borrar
  el texto (o "🧹 Limpiar búsquedas") restaura la lista completa.
- **📐 REVISIONES rediseñada**: fila de grupo "DÍAS DE LA SEMANA — CANTIDAD
  DIARIA" sobre las 7 columnas, buscador más ancho (col. G..J) y anchos de
  columna recalibrados para que los nombres y los números respiren mejor.
- **↩️ El avance automático respeta el filtro**: al escribir, el cursor salta
  solo a ítems VISIBLES del mismo día (no se mete en filas ocultas por la
  búsqueda).
- **🧹 Maestros sin duplicados**: los nombres genéricos repetidos del arsenal
  (Hidrocortisona Succinato, Nitroglicerina y Sodio Cloruro) se renombran con su
  presentación ("Nitroglicerina Inyectable"/"Nitroglicerina Comprimido", etc.).
  El control de calidad ya no los marca como fármacos duplicados, y las filas
  existentes se renombran solas al actualizar.
- **✅ Control de calidad más preciso**: las filas banda de las semanas
  ("SEMANA N°…") ya no se cuentan como "fecha mal registrada".

# Novedades v2.11.0

- **🖨️ Personalización por impresión**: cada PDF (semana o resumen del mes)
  abre ahora un **diálogo HTML** con casillas para adaptar el documento antes
  de generarlo:
  - **Semanal**: encabezado institucional, banda de resumen, fila hora/
    revisado por, fechas bajo los días, columna USO, columna ALERTA,
    observaciones, firmas y pie, y vaciado de celdas de relleno.
  - **Mensual**: encabezado, rangos de fechas por semana, columna Obs.,
    columna USO PROM., firmas y pie, y vaciado de celdas de relleno.
  - El diálogo incluye **barra de progreso** ("Preparando datos… · Generando
    PDF y guardando en Drive…"), diseño institucional, botón "Valores por
    defecto" y enlace final para abrir el PDF. Las hojas **se adaptan solas**:
    al quitar columnas se ajustan los anchos y el modo compacto.
- **⚡ Nueva pestana 13_Personalizacion.gs** con el catálogo de opciones
  (`IMP_TIPOS`), el diálogo HTML y la exportación con opciones.
- **Verificación ampliada**: `permisos()` ahora comprueba también
  `exportarPdfConOpciones` y `_abrirDialogoPDF`.

## Novedades v2.10.2

- **👤 Nuevos datos de firma en CONFIG**: "Encargado de la unidad" y "Cargo del
  encargado" (con lista desplegable). El encargado aparece ahora como firmante en
  todas las impresiones, junto al responsable del registro y la dirección.
- **🖊️ Bloque de firmas rediseñado (Nombre · Firma · Timbre)**: las impresiones
  (semanal, mensual y maestro de insumos) muestran tres tarjetas de una sola
  línea de alto — Responsable del registro, Encargado de la unidad y Dirección —
  cada una con NOMBRE, espacio de FIRMA y espacio de TIMBRE, evitando saltos de
  página feos entre firmas.
- **🕒 Fecha y hora de impresión al pie**: cada documento imprime la fecha y hora
  exactas de generación, la versión del sistema y el pie institucional
  configurado (traza de control para documentos oficiales).
- **🐞 Estadísticas con fechas robustas**: las columnas de fecha de REVISIONES se
  normalizan a texto DD/MM/AAAA (las semanas viejas podían guardar un valor de
  fecha "Date" real que hacía que Estadísticas, el Tablero y los PDF mostraran
  todo en 0). Tras "Actualizar sistema" los KPIs vuelven a contar semanas.
- **🔒 Cerrar semana (historial SEMANAS CERRADAS)**: nuevo comando del menú que
  COPIA la semana elegida — con fecha de cierre — a la hoja "SEMANAS CERRADAS".
  Es distinto de "✔️ Completar semana completa" (llena con el stock base para
  pruebas): esta opción archiva la semana tal como quedó, sin tocar REVISIONES,
  para que el dato jamás se pierda.

## Novedades v2.10.1

- **🗂️ Dos menús**: "CARRO DE PARO ☤" (uso diario: crear, completar, copiar,
  registro, tablero, estadísticas y navegación) y
  "⚙️ Mantenimiento" (maestros, PDF, datos de prueba, bitácora y actualizar).

- **✨ CONFIG rediseñada**: configuración agrupada por secciones (Establecimiento,
  Registro diario, Dispositivos e impresión, Firmas, Sistema) con bandas de color
  y **listas desplegables** (dropdown) para el día de revisión, el avance
  automático "Sí/No", el cargo del responsable y la anticipación de vencimientos.
- **📅 Columna de HOY resaltada**: en REVISIONES la columna del día actual queda
  en amarillo intenso (cabecera "· HOY") para saber siempre dónde escribir.
- **⬇️ Dropdown de forma farmacéutica** en el maestro FÁRMACOS (con sugerencias,
  permite escribir otro valor) y **resaltado rojo** del stock base cuando queda
  sobre el stock mín. en ambos maestros.
- **🐞 Corrección de validaciones**: los errores "El argumento de la regla de
  validación de datos no es válido" al actualizar (Maestro Insumos y Registro
  semanal) quedaron resueltos: la validación ya no se aplica sobre filas banda
  combinadas ni sobre rangos vacíos, y los pasos de formato usan rangos seguros.
- **🎨 Bitácora**: filas en cebra y tipo de evento coloreado por relevancia.
- **🛡️ Protección corregida**: el registro solo protege Alerta y Hora reales
  (columnas O y Q), sin bloquear las columnas de los días que sí se editan.

## Novedades v2.10.0

## Novedades v2.10.0

- **📅 Revisión DIARIA**: la revisión semanal pasó de una columna "Cant. real"
  a **7 columnas** (Lunes, Martes, Miércoles, Jueves, Viernes, Sábado, Domingo)
  dentro de la misma fila/semana por ítem. Escriba la cantidad de cada día; el
  color amarillo marca las celdas editables del día y el cursor salta al siguiente
  ítem del mismo día.
- **🚨 Alerta por el ÚLTIMO día registrado**: la columna Alerta se calcula con la
  última cantidad escrita de la semana (el estado actual del carro): REPONER si
  está igual o bajo el stock mín., y VENCIDO / POR VENCER según el vencimiento.
- **⏱️ Fecha y hora automáticas por día**: al escribir la cantidad de un día se
  registran fecha y hora del registro (hasta 7 fechas, una por día, hora diaria).
- **↩️ Base de la semana anterior / completar semana**: "Copiar semana anterior"
  lleva las 7 cantidades del domingo anterior a los días vacíos; "Completar
  semana" rellena los 7 días con el stock base del maestro.
- **📊 Semana pasada**: el progreso de banda se calcula sobre el **Día** del
  lunes-viernes registrado (para la semana actual sobre el día HOY).
- 🚫 Nota de migración: los datos de v2.9.5 (columna "Cant. real") quedan en la
  hoja pero el sistema los lee a partir de ahora como **Lunes** solo si se
  ejecuta el script de migración; sin él, regístrelos de nuevo a partir de la
  fecha de actualización.

## Novedades v2.9.5

- **💊 Los maestros FÁRMACOS/INSUMOS se llenan aunque estén vacíos**: se corrigió
  el error "El número de filas del intervalo debe ser 1 como mínimo" que ocurría
  al actualizar con las pestañas en blanco (recién creadas o borradas). Ahora
  "Actualizar sistema" carga el arsenal completo directamente.

- **🚫 Sin datos de prueba**: se eliminaron los insumos "PRUEBA —" (ya no se
  crean en el maestro) y la instalación nueva ya no carga semanas simuladas al
  abrir. El inventario contiene SOLO el arsenal que usted envió: **45 fármacos**
  con su registro ISP, forma farmacéutica, dosificación/concentración, stock en
  carro (6; alcohol 4) y notas de restricción (1)–(4) y **97 insumos**.
- **🛡️ Sin errores "ReferenceError: ... is not defined"**: todos los pasos de
  "Actualizar sistema" están protegidos por separado (thunks). Si falta por
  pegar un archivo `.gs`, el sistema avisa **cuáles** funciones faltan, pero la
  actualización continúa: los maestros FÁRMACOS/INSUMOS, el menú, las revisiones
  y los PDF siguen funcionando.
- **🩺 Stock en carro según su lista**: el inventario respeta el stock que usted
  envió por ítem (alcohol 4; Dopamina, Ketamina, Labetalol, Nitroglicerina iny.
  y Norepinefrina 4; Nitroglicerina comp. 2; el resto 6).

## Novedades v2.9.3

- **🛡️ Actualización a prueba de fallos**: si falta por pegar un archivo `.gs`
  en el editor (p. ej. `12_Bitacora.gs`), el sistema avisa pero ya no se
  detiene: "Actualizar sistema", el menú, las revisiones y los PDF siguen
  funcionando. Verifique que estén **los 13 archivos** en el editor
  (Extensiones → Apps Script → ver archivos a la izquierda).
- **📅 La revisión semanal se genera sola desde el inventario**: cada vez que
  crea una semana, la hoja REVISIONES se llena con el **preformato completo**
  de los maestros FÁRMACOS e INSUMOS (ítem, stock base, stock mín. y
  vencimiento) — solo queda escribir la "Cant. real". Si un maestro está
  vacío, la revisión no muestra ítems de esa sección; si agrega o quita un
  ítem del inventario, la PRÓXIMA semana creada lo refleja.

## Novedades v2.9.2

- **💊 Arsenal real del carro de paro** (Resolución N.º 2504243202): los
  maestros FÁRMACOS e INSUMOS se cargan automáticamente con los **45 fármacos**
  (registros ISP reales, stock base 6 — alcohol 4 — y notas de restricción
  SAPU/SAR o CENABAST) y los **97 insumos** (máscaras y tubos laríngeos,
  jeringas, agujas, guantes talla 6.5–8.5, VVP/TET, sondas, etc.). Si la
  pestaña aún tiene los placeholders "EJEMPLO —", "Actualizar sistema" los
  reemplaza sin tocar datos reales ya cargados.
- **📄 Papel A4 vertical**: las impresiones y los PDF (semanal y mensual)
  se configuran en tamaño **A4** (210 × 297 mm)
  vertical, ajustado al ancho, para que quepan más filas por página.
- Las hojas viejas se dejan de usar; para aplicar: menú → "🔄 Actualizar
  sistema" (una vez).

## Novedades v2.9.1

- **Un solo control de vencimientos**: la pestaña VENCIMIENTOS (y su PDF) es
  ahora el listado detallado único. El TABLERO muestra un resumen compacto
  (conteo de VENCIDOS/POR VENCER + los 6 más urgentes) con enlace a la
  pestaña, y ESTADÍSTICAS conserva solo la distribución mensual con una nota
  de referencia. REVISIONES, TABLERO, ESTADÍSTICAS y VENCIMIENTOS usan la
  **misma clasificación** (`_estadoVencimiento`): VENCIDO / POR VENCER /
  PRÓXIMO según la anticipación de CONFIG.
- **Menú más robusto**: `onOpen` instala el menú primero y el mantenimiento
  va después; al detectar una versión nueva (o en la primera apertura) aplica
  "Actualizar sistema" solo. Si el menú no aparece: recargar F5 o ejecutar
  `onOpen` una vez desde el Editor (ver Ayuda → paso 13).
- **🧪 Datos de prueba** (Herramientas, opcional): carga 3 semanas de revisiones
  con cantidades simuladas (incluye ítems REPONER, un VENCIDO, un POR VENCER y
  un PRÓXIMO) para probar todo el flujo sin tocar datos reales. No sobrescribe
  semanas que ya tengan cantidades y **no toca el inventario**. Solo se carga si
  usted lo ejecuta desde el menú; la primera apertura ya no lo hace.

## Novedades v2.9.0

- **🖨️ PDF control de vencimientos** (nueva pestaña VENCIMIENTOS): genera un
  PDF con la lista de insumos del maestro agrupados por estado — VENCIDOS
  (rojo, "requieren acción"), POR VENCER (naranjo, según la anticipación de
  CONFIG) y PRÓXIMOS — con días restantes y espacio para firmas. Permite
  elegir cuántos meses hacia adelante incluir (por defecto usa el valor de
  CONFIG "Anticipación de alerta de vencimiento").
- **Exportación PDF optimizada**: los tres PDF (semanal, mensual y de
  vencimientos) ahora usan la exportación oficial de Google por URL en lugar
  de copiar el rango, por lo que **respetan la configuración de página** de la
  hoja (A4 vertical, ajuste al ancho, márgenes) y quedan con aspecto idéntico
  a la vista previa de impresión.
- **PDF semanal mejorado**: el encabezado ahora incluye una banda de resumen
  con completitud ("COMPLETADOS X DE Y"), uso total de la semana y conteo de
  alertas (REPONER / VENCIDO / POR VENCER), coloreada según el estado.
- Menú → "🖨️ Impresión y PDF" → "🕐 PDF control de vencimientos".

## Novedades v2.8.0

- **🧾 Bitácora de operaciones** (nueva pestaña BITÁCORA): historial automático
  con fecha, hora, tipo y detalle de cada evento: semanas creadas, completadas,
  copiadas y eliminadas, PDF generados, configuración reformateada y
  actualizaciones del sistema. Se autoacota (máx. 250 eventos) y queda
  protegida con aviso.
- **Control de calidad automático** ("Actualizar sistema"): revisa los maestros
  y el registro y avisa si hay: fármacos o insumos duplicados, ítems sin stock
  base válido, vencimientos mal formateados, claves de semana no estándar o
  fechas mal registradas. Deja constancia en la bitácora.
- **Aviso al abrir**: un toast (no bloquea) muestra el progreso de la semana
  actual al abrir la hoja, p. ej. "Semana S31/2026: 12 de 28 completados ·
  quedan 16 por completar", o "· 2 VENCIDO(S)".
- **Validación de cantidades**: al escribir un valor que no es número en
  "Cant. real" (p. ej. "3,5" o "x2"), se avisa con un toast sin bloquear la
  edición.

## Novedades v2.7.0

- **📈 Estadísticas** (nueva pestaña ESTADÍSTICAS): análisis completo con
  datos reales del registro, período configurable:
  - *Panorama del período*: tarjetas KPI — semanas analizadas, completitud %,
    uso total, con REPONER y vencidos/por vencer.
  - *Evolución semanal*: tabla por semana (% de completitud, uso total y
    alertas de las últimas 10 semanas) con gráfico de barras.
  - *Consumo TOP (Pareto 80/20)*: top de ítems más usados con % y % acumulado,
    resaltado verde hasta cubrir el 80% + gráfico y nota de concentración.
  - *Ítems sin consumo*: lista de los que no registraron uso (candidatos a
    revisar su stock base).
  - *Vencimientos*: distribución de los próximos 12 meses con acumulado y
    gráfico.
  - *Alertas del período*: conteo por tipo (REPONER, VENCIDO, POR VENCER, OK)
    y comparativa FÁRMACOS vs INSUMOS (completitud, uso, alertas).
  - Las celdas amarillas B4 (meses a analizar) y B5 (top de ítems) se editan
    en la propia hoja; Menú → "Estadísticas" refresca todo.
- La pestaña ESTADÍSTICAS queda protegida con aviso, excepto las celdas de
  control (B4:B5).

## Novedades v2.6.0

- **📊 Tablero de control** (nueva pestaña TABLERO): panel con datos en vivo:
  - *Semáforo de la semana actual*: estado del registro en una tarjeta de
    color (rojo = vencidos/reponer, naranjo = por vencer o semana en curso,
    verde = completa, gris = sin semana creada).
  - *Vencimientos próximos*: lista de insumos VENCIDO / POR VENCER según la
    anticipación configurada.
  - *Uso de los últimos 3 meses*: top 10 de ítems más usados (suma de Uso por
    mes) con **gráfico de barras** embebido.
  - *Completitud*: % de ítems con cantidad registrada por mes.
- **Semáforo en la pestaña REVISIONES**: la solapa se pinta del color del
  estado (rojo/naranjo/verde) y se actualiza sola al escribir.
- **Protección con aviso**: las columnas automáticas (fecha, semana, uso,
  alerta, hora, N°) quedan protegidas "con aviso": si alguien intenta
  editarlas, Google pregunta antes (los scripts siempre pueden escribir).

## Novedades v2.5.0

- **ℹ️ Sobre el sistema** (menú): ficha con versión, fecha de la última
  actualización, programador, establecimiento y **datos en vivo** (fármacos,
  insumos y semanas registradas) + pestañas del libro.
- **CONFIG ampliada** (13 parámetros, todos con ayuda al pasar el mouse):
  - *Cargo del responsable del registro*: se imprime junto a la firma
    (ej. "Firma responsable del registro (TENS): ...").
  - *Anticipación de alerta de vencimiento (meses)*: cuántos meses antes se
    marca POR VENCER (0 = solo al llegar el mes; 1 = comportamiento anterior).
  - *Pie de página de impresiones*: nota institucional al pie de cada PDF
    (vacío = no se imprime).

## Novedades v2.4.0

- **Sin emojis en el documento**: las celdas y hojas (que se imprimen y
  archivan) usan solo texto y colores; los emojis quedan solo en el menú y
  en los diálogos de interfaz.
- **Hojas recortadas**: cada pestaña elimina sus filas y columnas sobrantes y
  queda con solo lo necesario + margen de respiro (ej. CONFIG ≈ 18 filas × 3
  columnas). Google Sheets agrega filas solas si se escribe más abajo.
- **Más color**: bandas de semana en dos tonos verdes alternos, bloques con
  zebra alternativa, etiquetas de panel con texto en color según estado.
- El progreso de la banda ahora dice "completadas 12/28" (texto, no símbolo).

## Rellenado rápido (v2.1.0)

- **Avance automático**: al escribir una cantidad, el cursor salta al siguiente
  ítem sin cantidad de la misma semana (configurable en CONFIG: "Avanzar al
  siguiente ítem al escribir" = Sí/No).
- **✔️ Marcar semana como completa** (Herramientas): rellena "Cant. real =
  Stock base" en todos los pendientes de la semana actual con una confirmación;
  luego ajusta solo lo que cambió.
- **📋 Copiar semana anterior** (Herramientas): copia las cantidades de la
  semana previa a la actual (las que no cambian no se reescriben a mano).
- **Progreso en la banda**: cada banda de semana muestra cuántos ítems van
  completados ("completadas 12/28") y se actualiza solo al escribir.
- **Panel de alertas en vivo**: en la parte superior de REVISIONES, un resumen
  de la semana actual (repone · vencido · por vencer · sin alertas) con fondo
  y letra de color según gravedad (rojo / naranjo / verde).
- **Uso negativo en azul**: si la cantidad real supera el stock base (sobró),
  la celda de Uso se pinta azul para detectar errores o sobrantes.
- **📅 Crear revisión de otra semana**: útil para feriados o atrasos.
- **📅 Ir a una semana específica**: salta directo a la semana que indique.

## Instalación (en la hoja de cálculo)

1. Abra la hoja de cálculo en Google Sheets (cree una nueva si es necesario).
2. Menú **Extensiones → Apps Script**.
3. Elimine el contenido (borre todos los archivos que vengan por defecto).
4. Cree un archivo por cada uno de los archivos de la carpeta `SISTEMA V2` y
   pegue su contenido (o use `clasp push` si usa clasp).
   Orden sugerido:
   - `00_Sistema.gs`
   - `01_Menu.gs`
   - `02_Utilidades.gs`
   - `03_Maestros.gs`
   - `04_Revisiones.gs`
   - `05_Busqueda.gs`
   - `06_Impresion.gs`
   - `07_PDF.gs`
   - `08_Selectores.gs`
   - `09_Config.gs`
   - `10_Tablero.gs`
   - `11_Estadisticas.gs`
   - `12_Bitacora.gs`
5. Guarde y **reload la hoja** (F5). Acepte los permisos cuando Google lo pida.
6. En el menú aparecerá **CARRO DE PARO ☤**. La primera apertura monta
   todo el sistema (con el inventario real ya cargado). Si el menú no aparece:
   recargue la hoja (F5) o abra **Extensiones → Apps Script → ▶ Ejecutar
   `onOpen`** y autorice.
7. Ejecute una vez **⚙ Actualizar sistema** (reconstruye pestañas, colores y
   formatos; no borra datos) y luego una vez **🔑 Verificar permisos**
   (autoriza todo el proyecto de una sola vez).

## Uso diario

1. **📅 Nueva revisión semanal**: crea el bloque de la semana de HOY (semana =
   fecha del lunes). Solo una revisión por semana: si ya existe, lo avisa.
2. Escriba la **cantidad del día** en su columna amarilla (Lun, Mar, Mié, Jue,
   Vie, Sáb, Dom — la del día HOY se abre seleccionada). La hora y la fecha se
   registran solas y **Alerta** se calcula automáticamente con la última
   cantidad escrita.
3. Cada semana tiene su banda: **AZUL = semana actual (etiqueta "HOY")**,
   **VERDE = anteriores**; los bloques alternan color para leer más rápido.
4. Pase el mouse sobre las cabeceras de REVISIONES, FÁRMACOS, INSUMOS y CONFIG:
   aparecen tooltips con la ayuda de cada columna/parámetro.
5. Los maestros tienen **autofiltro** (triángulo en las cabeceras) y búsqueda
   amarilla en vivo (fila 2).
6. Al terminar la semana: **🖨️ Impresión y PDF → PDF de la semana** (N° de
   semana o en blanco = última) → la revisión DIARIA de esa semana (7 columnas
   de cantidad), lista para firmar.
7. A fin de mes: **PDF resumen del mes (por semanas)** (escriba `MM/AAAA`) →
   una columna por semana revisada (última cantidad de esa semana) y la
   columna **USO PROM.** (promedio de uso en las semanas con dato). Con muchas
   semanas la hoja se compacta sola.
8. Los PDF se guardan en la carpeta Drive "Carro de Paro — Impresiones"
   (menú: **📂 Abrir carpeta de impresiones**).

## Menú del sistema

```
CARRO DE PARO ☤
├─ 📅 Nueva revisión semanal
├─ 📋 Registro semanal
├─ 📊 Tablero de control
├─ 📈 Estadísticas
├─ 🧰 Herramientas
│   ├─ ✔️ Marcar semana como completa
│   ├─ 📋 Copiar semana anterior
│   ├─ 📅 Crear revisión de otra semana
│   ├─ 🧪 Cargar datos de prueba
│   ├─ 🏠 Ir a la semana actual
│   ├─ 🔍 Ir a la última semana
│   ├─ 📅 Ir a una semana específica
│   ├─ 🧹 Limpiar búsquedas
│   ├─ 🗑️ Eliminar revisión de una semana
│   └─ 🧾 Bitácora de operaciones
├─ 🖨️ Impresión y PDF
│   ├─ 🖨️ PDF de la semana
│   ├─ 📊 PDF resumen del mes (por semanas)
│   ├─ 📄 Ver hojas de impresión
│   │   ├─ 📄 Hoja de la semana
│   │   └─ 📄 Hoja del mes
│   ├─ 🔑 Verificar permisos
│   └─ 📂 Abrir carpeta de impresiones
├─ 🗂️ Maestros  (Fármacos · Insumos · Configuración)
├─ ❓ Ayuda
├─ ℹ️ Sobre el sistema
└─ 🔄 Actualizar sistema
```

## Permisos (importante — UNA sola autorización)

- Apps Script pide autorización **una sola vez por PROYECTO**, no por archivo ni
  por función: los 13 archivos `.gs` son parte del mismo proyecto de script, así
  que autorizando una vez quedan habilitados todos los menús.
- Ejecute **🔑 Verificar permisos** (menú → Impresión y PDF) la primera vez y
  acepte la pantalla de Google. Esta función ejercita de una vez todos los
  servicios (hoja de cálculo, Drive y exportación PDF real) y verifica que todos
  los archivos clave estén cargados en el editor; si falta pegar alguno, lo
  informa claramente.
- No requiere archivos adicionales: todo funciona con las hojas de cálculo y los
  scripts (el `appsscript.json` del proyecto es generado automáticamente por Apps
  Script; no hay que agregarlo a mano).
- Si el PDF falla, el sistema mostrará un mensaje claro con sugerencias
  (nunca un error técnico en la hoja).
- Si la organización bloquea Drive, contacte al administrador.

## Estructura del código

| Archivo              | Contenido                                                        |
|----------------------|------------------------------------------------------------------|
| `00_Sistema.gs`      | Constantes, colores, notas de columnas, layout, ejemplos         |
| `01_Menu.gs`         | Menú con submenús, `actualizarSistema`, navegación, ayuda y "Sobre el sistema" |
| `02_Utilidades.gs`   | Helpers: hojas, tooltips, autofiltro, fechas y semanas, lectores |
| `03_Maestros.gs`     | FÁRMACOS e INSUMOS con filtros y tooltips                        |
| `04_Revisiones.gs`   | Registro semanal, bandas (actual/anteriores), herramientas, datos de prueba |
| `05_Busqueda.gs`     | Búsqueda en vivo por nombre o código, filtro temporal, limpieza |
| `06_Impresion.gs`    | Hoja semanal + resumen mensual por semanas, encabezado oficial |
| `07_PDF.gs`          | Exportación a PDF, permisos de Drive, carpeta de impresiones     |
| `08_Selectores.gs`   | Utilidades de UI (aviso con sugerencias)                         |
| `09_Config.gs`       | Configuración determinista con tooltips (usa `CONFIG_DEF`)       |
| `10_Tablero.gs`      | Tablero de control: semáforo, vencimientos, uso 3 meses, gráfico  |
| `11_Estadisticas.gs` | Estadísticas: KPIs, evolución semanal, Pareto, vencimientos       |
| `12_Bitacora.gs`     | Bitácora de operaciones y control de calidad automático         |
| `13_Personalizacion.gs` | Catálogo de opciones de impresión, diálogo HTML y exportación con personalización |

## Notas técnicas

- **Semanal**: una revisión por semana (menos trabajo que el diario). Las
  semanas se identifican por su lunes (clave `S25/2026`). Las bandas usan un
  rango corto legible (ej. `S25 — 15/06 → 21/06/2026`) y la semana actual
  lleva la etiqueta "HOY".
- **Sin fórmulas**: Uso y Alerta se calculan por script (evita `#ERROR!` por
  separadores regionales de locale hispano).
- **Rendimiento**: los recálculos usan lectura/escritura en bloque
  (`_calcularUsoAlertaBloque` por tramos entre bandas, zebra con una matriz),
  el repintado de bandas hace 3 lecturas; la búsqueda usa 1 lectura + 1
  escritura de fondos; `onEdit` solo toca lo necesario.
- **No editar**: las columnas automáticas del registro (fecha, semana, uso,
  alerta, hora) aparecen en gris; solo se escribe en la columna amarilla.
- **Sin emojis en las celdas**: el documento es oficial (se imprime y archiva);
  los emojis solo aparecen en el menú y en los diálogos.
- **Hojas a tamaño real**: "Actualizar sistema" elimina las filas y columnas
  sobrantes de cada pestaña (deja solo lo necesario + margen de respiro). Si
  más adelante escribe más abajo, Google Sheets agrega filas automáticamente.
- `onEdit` recalcula, repinta el progreso de la banda y actualiza el panel de
  alertas automáticamente.
- Las hojas se reconstruyen siempre idénticas (parámetros solo en `CONFIG_DEF`).
- Vencimiento del maestro INSUMOS acepta cualquier formato de fecha y el
  sistema lo normaliza a `MM/AAAA`.

