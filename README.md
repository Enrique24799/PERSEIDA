# PERSEIDA — Visores HTML (ejemplos)

Visores HTML **autocontenidos** (sin dependencias externas, se abren directamente en el navegador):

- `gantt-tiempo-cambio.html` — Gantt de tiempos de cambio por línea.
- `OUTPUT_PANTALLA_VENTAS.html` — Pantalla de ventas con la propuesta de carga de camiones.
- `AJUSTE_PALETS.html` — Transacción de control y ajuste de inventario de palets.
- `PANTALLA_CAMIONES.html` — Pantalla de camiones (carga/expedición) con detalle desplegable y alta
  de **nuevo camión** en una pestaña nueva (formulario embebido en el mismo archivo).

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

## `PANTALLA_CAMIONES.html` — Pantalla de camiones (carga / expedición)

Rejilla de camiones del día con su estado de carga. Cada fila se puede **desplegar** (botón `>`)
para ver el **detalle de las líneas** (posiciones) del pedido, con las columnas **ajustadas** al
contenido. Es un visor autocontenido con datos de **ejemplo**.

### Pantalla principal

Una fila por camión con las columnas: **Estado** (celda coloreada según el estado), `No Camion`,
`Cliente`, `Tipo Camion`, `Coste`, `Hora de Carga Prevista`, `Fecha Descarga Prevista`, `Muelle`,
`Matricula Remolque` y `Camion Traslado` (check). Los camiones aún no cargados muestran las fechas
como `01/01/1900` (fecha vacía estilo SAP).

**Estados** (leyenda inferior): `Pte. Cargar`, `En Carga`, `Cargado`, `Albaranado` y `Anulado`.

### Detalle desplegable (líneas del pedido)

Al desplegar un camión se muestra una sub-tabla con columnas ajustadas: `Linea`, `Pedido SAP`,
`Entrega SAP`, `Codigo Cliente`, `Nombre Cliente`, `Material`, `Direccion de Envio`, `Unidades`
(*hechas de total*), `Palets` (*hechos de total*), `Completar Camion` (check), `Alm. Dest. Traslado`,
`Año Doc. Traslado` y `Doc. Traslado SAP`.

### Opciones / filtros

`Fecha`, `Almacén`, casilla **Todos** (al desmarcarla se ocultan los camiones sin fecha de carga),
botón **Actualizar**, **buscador** global y **filtros por columna**. En la barra hay tres iconos:
**imprimir**, **Nuevo camión** (rejilla con `+`) y **Anular camión** (rejilla con `✕`, anula el
camión seleccionado). Para datos reales basta sustituir el array `CAMIONES` y los maestros
`CLIENTES` / `MATERIALES` del `<script>`.

### Nuevo camión (pestaña nueva, sin archivo externo)

El icono **Nuevo camión** (rejilla con `+`) **abre una pestaña nueva generada desde este mismo
archivo**, no en un pop-up ni desde un fichero externo. El formulario va **embebido** en una
plantilla `<script id="tplNuevoCamion" type="text/html">` y la pestaña se crea con
`window.open('', '_blank')` + `document.write(...)` (así no puede faltar el archivo y funciona
también con `file://`). Al **Guardar**, el camión generado se inserta en esta rejilla y queda
seleccionado y desplegado. La comunicación es por `postMessage` (ventana abridora) con respaldo en
`localStorage` (evento `storage` y al recuperar el foco de la pantalla).

#### Formulario de alta (plantilla embebida)

Formulario para **crear un camión** y asignarle sus líneas de carga (datos de **ejemplo**):

- **Pestañas:** `Datos Camión` y `Comentarios`.
- **Datos Camión:** `Fecha`, casilla `Camión de TRASLADO`, `Matrícula Remolque`, `Matrícula
  Tractora`, `Coste`, `Conductor`, `Tipo Camión`, `Teléfono` y `Centro`.
- **Líneas de Carga — Buscar por:** `Almacén` + radio `Material` / `Pedido` / `Cliente` + texto, o
  por `Nº Doc` / `Año`. Los resultados salen en la tabla **Pedidos** (`Pedido`, `Cod./Nom. Cliente`,
  `Area Entrega`, `Almacén`, `Fecha Pedido`, `Cod. Material`, `Material`, `Cant. Pedido/Entrega/Pdte`,
  `Stock`, `Stock Verif. Disp.`, `Fabricación Verificada`, `Faltas Comp.`, `Ped. Compra`, `Unidad`,
  `Fecha Entrega`). Al pulsar una fila se rellena **Detalle Material Consultado** (`Stock` /
  `Pdte. Fabricar`).
- **Verificación de disponibilidad** (columnas nuevas de la tabla Pedidos):
  - `Area Entrega` = provincia del cliente; `Almacén` = almacén del material.
  - `Stock Verif. Disp.` = stock disponible **a la fecha de entrega** descontando las **reservas de
    material de otros pedidos** con entrega anterior o igual (en rojo si es negativo).
  - `Fabricación Verificada` (sustituye a *Pdte. Fab.*) = suma de las **órdenes planificadas que
    terminan antes/en la fecha de entrega**. Al pulsar abre un **pop-up** con las órdenes (inicio /
    fin / cantidad), resaltando en verde las que se fabrican antes de la entrega.
  - `Faltas Comp.` = check de si las órdenes del material tienen **faltas de componentes**; al pulsar,
    **pop-up** con las órdenes y los componentes en falta (necesario / disponible / falta).
  - `Ped. Compra` = al pulsar, **pop-up** con los **pedidos de compra** de esos componentes en falta.
- **Agregar Selección:** marca uno o varios pedidos y pásalos a las **líneas de carga** (`Orden`,
  `Pedido SAP`, `Entrega`, `Codigo Cliente`, `Cli. Dir. Envio`, `Cliente`, `Material`, `Dirección
  Envio`, `Tipo Unidad`, `Palets`, `Unid X Palets`, `Completo`). Los `Palets` se calculan como
  `ceil(cantidad / uds-por-palet)`. La casilla **Gestión de Entregas** rellena el nº de entrega.
- **Quitar Selección** quita líneas de carga; **Guardar** genera el camión (estado `PTE CARGAR`) y
  lo envía a la pantalla de camiones.

Para datos reales basta sustituir los maestros `MATS` / `CLIS` / `COMPS`, las órdenes `ORDENES`, las
`FALTAS`, los pedidos de compra `COMPRAS` y el array `PEDIDOS` dentro de la plantilla
`#tplNuevoCamion`.
