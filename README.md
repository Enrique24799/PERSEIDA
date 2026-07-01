# PERSEIDA — Visores HTML (ejemplos)

Visores HTML **autocontenidos** (sin dependencias externas, se abren directamente en el navegador):

- `gantt-tiempo-cambio.html` — Gantt de tiempos de cambio por línea.
- `OUTPUT_PANTALLA_VENTAS.html` — Pantalla de ventas con la propuesta de carga de camiones.
- `AJUSTE_PALETS.html` — Transacción de control y ajuste de inventario de palets.
- `GESTION_DE_ENVASADOS.html` — Gestión de envasados: pantalla de **Control de Producción**.

## `gantt-tiempo-cambio.html` — Gantt de tiempo de cambio (líneas internas)

Muestra los tiempos de cambio de las líneas internas.

## Características

- **Una fila por línea (puesto de trabajo).** A diferencia de la herramienta original, al
  cambiar de turno la programación **no salta a una fila nueva**: continúa en la misma línea.
  Los turnos se indican con bandas de color suaves y líneas discontinuas (M = mañana 06–14,
  T = tarde 14–22, N = noche 22–06).
- **Dos tipos de cambio:** Cambio de producto (azul) y Cambio de formato (verde). La anchura de
  cada barra equivale a su duración en minutos.
- **Filtros:**
  - **Sección:** Todas / Cosmética / Higiene.
  - **Puesto de trabajo (línea):** Todos o una línea concreta (la lista se actualiza según la sección).
  - **Tiempo de cambio:** Todos / Cambio de producto / Cambio de formato.
- **Zoom In / Zoom Out**, **Actualizar** y **Reiniciar**.

## Origen de los datos

| Dato | Origen |
|------|--------|
| Asignación de líneas a sección (Cosmética / Higiene) | Pestañas de las capturas |
| `Código`, `C.Prod` (Cambio de producto, min), `C.Form` (Cambio de formato, min) | Tabla `prLinea / prCodLinea / prCambioProducto / prCambioFormato` |
| Eventos de cambio sobre la línea de tiempo | **Datos de ejemplo** generados de forma reproducible para la semana del 15/06/2026 |

Líneas que aparecen en la pestaña de sección pero **no** en la tabla → valores de ejemplo:
`ESTUCHAD`, `LENCAJAD`, `MONTMANU` (marcadas con `ej:true` en el código). `LCOLONIA` figura en la
tabla y se ha clasificado como Cosmética.

Para conectar con datos reales basta sustituir el array `LINES` y la función `genEvents()` del
`<script>` por la consulta correspondiente.

## `OUTPUT_PANTALLA_VENTAS.html` — Pantalla de ventas (propuesta de carga)

Salida del algoritmo que propone en qué camión se carga cada pedido-posición. Los datos son de
**ejemplo** y el algoritmo se simula en el propio navegador, de modo que la fecha y el modo
cambian el resultado de forma realista.

### Parámetros (para ejecutar el algoritmo)

- **Fecha de propuesta de carga.**
- **Disponibilidad:** *Solo stock* (solo usa stock real) o *Stock + planificado* (usa también la
  producción planificada → aparecen propuestas de tipo *Fabricación* y baja el backlog).
- Botón **Ejecutar algoritmo**.

### Campos de la tabla

`Id_Camión`, `Estado` (Completo / Parcial / **Backlog**), `Destino`, `Fecha propuesta de carga`,
`Tipo de propuesta` (Stock / Fabricación), `Pedido`, `Posición`, `Material`, `Nombre material`,
`Fecha de entrega`, `Fecha disponible`, `Stock real / planificado`, `Cliente`, `Cantidad (palets)`,
`Volumen total camión` y `Peso total camión`.

Si el algoritmo **no** propone carga para un pedido-posición, su estado es **Backlog** y el
`Id_Camión` queda vacío. Las posiciones de un mismo camión se agrupan: los datos del camión y los
totales de volumen/peso se muestran una sola vez por camión.

Para conectar con datos reales basta sustituir `MATERIALS` / `genDemanda()` por los datos reales y,
si procede, `runAlgo()` por la llamada al algoritmo real.

## `AJUSTE_PALETS.html` — Ajuste de palets (control de inventario)

Simulación de una transacción SAP (`ZPAL_AJUS`) para **controlar y ajustar** el inventario de
palets. A cada material se le cuelga un palet en su lista de materiales; al notificar/consumir
órdenes los palets se bloquean o quedan libres, y esta transacción permite además ajustarlos
manualmente.

### Modelo

- Un palet **libre** es un soporte vacío: **no tiene matrícula, ni material, ni orden**. Los libres
  se **agrupan por código de palet (CLP)**: una fila por código con su recuento en la columna
  **Nº palets** (en los ocupados, esa columna vale `1`).
- **Bloquear** (manual): se coge 1 palet libre de un **código** concreto y se le asigna un
  **material** y sus **unidades**. Como no va asociado a una orden, la columna **Orden** muestra
  `BLOQUEO MANUAL`.
- **Alta de palet**: se indican un **código de palet** y una **cantidad** y se suman al stock de
  libres de ese código.
- **Ajustar inventario**: corrige las unidades de un palet. Si se ponen **0 unidades**, el palet se
  da de **baja** (se elimina).
- **Desbloquear**: el palet se vacía y su código vuelve al stock de libres.
- **Devolución**: palet con material que el cliente devuelve. Es el **único** caso con la **Entrega**
  rellena; no tiene matrícula, ni orden, ni ubicación (sí material y unidades).

### Nomenclatura

- **Código Palet (CLP):** `0496xxxx` · **Matrícula:** `1000xxxxxx`.
- **Componente** semielaborado / terminado: `709xxxxx`; **packaging:** `049xxxxx`.
- **Documento de compras:** solo lo tienen los componentes de **packaging**.

### Pantalla de selección (parámetros de entrada)

Se introduce **uno** de estos campos (admite combinar varios; coincidencia parcial en los códigos):
`Código Palet`, `Código Componente`, `Situación Palet` (Bloqueado / Libre / Devolución),
`Orden Fabricación` y `Entrega`. Botones **Ejecutar** (F8) y **Limpiar**.

### Acciones

- **Bloquear** — en el pop-up se elige el **código de palet** (de los que tienen libres), el
  **material** y las **unidades** (muestra descripción, tipo, uds/palet y, en packaging, el
  documento de compras). Crea un palet bloqueado con `BLOQUEO MANUAL`.
- **Desbloquear** — vacía los palets seleccionados y devuelve su código al stock de libres.
- **Ajustar inventario** — corrige las unidades de un palet; con **0** unidades lo da de baja.
- **Alta de palet** — da de alta N palets libres de un código.

Las columnas son: Palet, **Nombre Palet**, Matrícula, Componente, Descripción, Tipo, Uds/Pal.,
Uds Ocup., Situación, **Nº palets**, Orden Fab., Status Orden, Entrega, **Doc. compras** y Ubicación.

Cada acción queda registrada en el **log de movimientos** (fecha/hora, usuario, palet, acción,
situación anterior → nueva, unidades, documento y motivo). Incluye **Exportar** a CSV y barra de
estado tipo SAP. Los datos son de **ejemplo**; para datos reales basta sustituir el array `PALETS`,
el contador `LIBRES` (por código) y los maestros `MATERIALES` / `PALET_TIPOS` del `<script>`.

## `GESTION_DE_ENVASADOS.html` — Gestión de envasados (Control de Producción)

Nuevo visor del *main* de Perseida. Primera pantalla: **Control de Producción** (se añadirán más).
Reproduce la rejilla de control de producción con su cinta (ribbon) de acciones al estilo de la
herramienta de escritorio.

### Cinta (ribbon) — pestaña *Menú*

- **Opciones de Búsqueda:** selector de **línea** (L1…L5 / Todas), botón **Refrescar** y los
  interruptores **Mostrar Centros Externos** y **Mostrar Planificación Futura**.
- **Gestión Órdenes Operativas:** Crear/Liberar Orden de Fabricación, Crear/Liberar Orden de
  Envasado, **Crear/Liberar Orden de Reproceso**, Anular, Baja, Pausa, Finalizar y Alta.
- **Ajuste de Órdenes:** Cambiar Orden, Modificar PT, Cambiar Fecha y Dividir Fab.
- **Control de Órdenes:** En Marcha, Notificar SAP, Activar Finalizado y Consultar Fab.

Bajo la cinta hay una barra con **Edit**, **Faltantes Fabricación**, **Faltantes Envasado** y, a la
derecha, **Column Chooser** y **Export to**; y un **buscador** global (*Enter text to search…*).

### Rejilla

Columnas: **Estatus** (finalizada / en marcha / pendiente), **Tiene Semi**, `Ord.Fab.Sap`,
`Cant.Fab.SAP`, `Ord.Env.SAP`, `Inicio Previsto`, `Fin Previsto`, `Num.Lote.SAP`, `Material`,
**Fecha Rotura** (en rojo si está vencida), `Nombre`, `Formato`, `Stock Granel`, **Stock Bloqueado**,
`Mat.Fabricacion`, `Pedido SAP`, `Procedencia`, **Cant.Planificada** y **Cant.Fabricada**.

### Stock bloqueado (falta de componentes)

En envasado, si por rotura de stock de un componente (etiquetas, estuches, cajas…) el material se
notifica pero queda **bloqueado**, esas unidades se acumulan por material. La columna **Stock
Bloqueado** muestra el total bloqueado por material (`7090*`). Al pulsar sobre la cifra se abre un
**pop-up con el desglose por motivo** (CUARENTENA MICRO, SIN ETIQUETA, NO ALMACEN, KO CALIDAD,
REPROCESO, PDTE REVISIÓN, etc.) con su total. El pop-up es **solo de consulta**: las necesidades de
reproceso se generan desde la pantalla *Necesidades Reproceso* (ver abajo). El maestro de motivos
(`MOTIVOS_BLOQUEO`) y el reparto por material son de **ejemplo**; para datos reales basta sustituir
esa lista y el campo `bloqDet` de cada fila.

Incluye fila de **filtros por columna**, **búsqueda** global, **selección múltiple** (las acciones de
la cinta operan sobre las filas seleccionadas) y barra de estado con el recuento de órdenes. Los datos
son de **ejemplo**; para datos reales basta sustituir el array `ROWS` del `<script>` (mismos nombres
de campo).

### Órdenes de reproceso

El nuevo tipo de orden previsto para **completar** los materiales con faltante (una parte se rehace y
otra solo se completa, sumándose a la orden). Se opera en dos pasos:

1. En la pestaña **Necesidades Reproceso** se seleccionan los motivos a reprocesar y se genera en
   *Control de Producción* una **línea sin orden de fabricación ni envasado** (estado *Necesidad*).
2. En la cinta de *Control de Producción*, el grupo *Gestión Órdenes Operativas* incorpora
   **Crear Orden de Reproceso** (asigna nº de orden a las líneas *Necesidad* seleccionadas → estado
   *Orden creada*) y **Liberar Orden de Reproceso** (libera las órdenes creadas → estado
   *Orden liberada*). Las líneas de reproceso se distinguen con un borde rojo y una etiqueta de
   estado en *Procedencia*.

## Pestaña `Necesidades Reproceso`

Segunda pantalla del visor (pestaña junto a *Control de Producción*). Muestra **una línea por material**
con stock bloqueado y su **desglose por motivo de bloqueo** (expandible). Toma campos de la pantalla de
necesidades estándar: `Código`, `Material Fab.`, `Material`, **Opciones Puestos**, `Estrategia`,
`Grupo Planif.`, **Fecha Rotura**, **Planificado**, además de **Stock Bloqueado** y **Cant. a
Reprocesar** (sumatorio de lo seleccionado).

- **Fecha Rotura:** fecha de rotura **del material** (dato de SAP: cuándo nos quedaríamos sin material
  según las necesidades); en rojo si está vencida. No se deriva del inicio de las órdenes.
- **Planificado:** cantidad planificada del material contando **solo las órdenes en marcha o
  planificadas** (se excluyen las finalizadas); al pulsar la cifra se abre un **pop-up con esas
  órdenes** (Orden, **Estado**, **Línea/Puesto**, Inicio, Fin y Cantidad), para saber **dónde se
  produce** y decidir en qué línea lanzar el reproceso.

- **Selección de motivos:** casilla por motivo, casilla de material (selecciona todos sus motivos),
  botón **Seleccionar todo** / **Quitar selección** y casilla global en la cabecera.
- **Puesto de trabajo (Opciones Puestos):** editable a **nivel de cabecera** (material) y a **nivel de
  motivo**. Cambiar el de cabecera propaga a todos los motivos del material; cambiar el de un motivo
  solo afecta a esa línea.
- **Crear necesidad(es) de reproceso:** agrupa los motivos seleccionados por **material y puesto** y
  crea en *Control de Producción* una línea por grupo, **sin órdenes**, en el puesto indicado y con el
  **sumatorio** de las cantidades. Se cambia automáticamente a la pestaña de control para verlas.
- Utilidades: **Expandir / Contraer todo**, **buscador** (material o motivo) y barra de estado con el
  recuento de motivos seleccionados y la cantidad total a reprocesar.

Los puestos (`PUESTOS`), la estrategia y el grupo de planificación son de **ejemplo**.
