# PERSEIDA — Visores HTML (ejemplos)

Visores HTML **autocontenidos** (sin dependencias externas, se abren directamente en el navegador):

- `gantt-tiempo-cambio.html` — Gantt de tiempos de cambio por línea.
- `OUTPUT_PANTALLA_VENTAS.html` — Pantalla de ventas con la propuesta de carga de camiones.
- `flujos-material-multipais.html` — Flujos actual y objetivo de dos procesos de traslado, en pestañas.
- `PANTALLA_NECESIDADES_TRASLADO.html` — Pantalla de necesidades de solicitudes de traslado.

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

## `flujos-material-multipais.html` — Flujos de traslado (actual vs. objetivo)

Dos procesos, cada uno en su **pestaña**, con `70908810` como material de ejemplo. La pestaña se
recuerda en `localStorage`.

### Pestaña 1 · Entre países (centro `12` → `12FR`)

**Actual.** Copia manual del material (`70908810FR`) en el **centro 12**, almacén `HUFR`. La
previsión de Francia se carga sobre `70908810` en el almacén `1202`, las necesidades llegan a GPP
mezcladas con las del centro 12, se fabrica y se da de alta en el `1201`. Logística lleva en un
Excel lo que hay que mandar a Francia, hace el movimiento **311** del `1202` al `HUFR` y crea a mano
el pedido de venta y el de compra, **sin factura**. El stock sigue siendo del centro 12, así que no
hay entrada de mercancías. El pedido del cliente final entra sobre `70908810FR` contra `HUFR` y la
salida también es manual.

**Objetivo.** Material único dado de alta en el **centro de Francia** (`12FR`), previsión separada y
demanda que llega a GPP como **solped de traslado**. La conversión en **pedido de traslado**, el
**transporte** y el **traslado** con picking desde la PDA se dan **en un mismo paso**. No se
factura: se produce una **conversión de impuestos**. La mercancía entra en el `12FR` como
**entrada de mercancías** (aprovisionamiento) y el pedido del cliente final queda **un escalón por
debajo**, compensando el stock ya disponible.

### Pestaña 2 · Entre almacenes (`1202` → `12PO`)

**Actual.** El material **no se duplica**: `12PO` es un almacén más del centro `12`, sin
planificación propia. La previsión se carga sobre el almacén `1202` e incluye sin separar la del
`12PO`; las necesidades de ese almacén se llevan en un **Excel**, de donde salen a mano el camión de
traslado y el propio movimiento al `12PO`. Como sólo cambia de almacén, no hay entrada de
mercancías. Las salidas se hacen a mano a medida que entran los pedidos en el `12PO`.

**Objetivo.** Crear el **área de planificación `12_12PO`** en el centro `12`, sobre un almacén
distinto del `1202` (por ejemplo el propio `12PO`), y cargar **previsión y pedidos** contra esa área.
La necesidad sale como **solicitud de pedido de traslado** al almacén `1202`, visible en la parte
logística, y el traslado se resuelve **como en el flujo por países**: conversión a pedido,
transporte, traslado y entrada de mercancías en el `12PO`, sobre cuyo stock disponible salen los
pedidos.

### Cómo leer los diagramas

Los cuatro diagramas comparten carriles y columnas, para poder compararlos fila a fila. Ámbar
discontinuo = paso manual, verde = paso automático, caja tachada = lo que desaparece. Cada pestaña
termina con una tabla **paso a paso** y con sus **puntos a cerrar**.

## `PANTALLA_NECESIDADES_TRASLADO.html` — Necesidades de solicitudes de traslado

Diseño de la pantalla desde la que logística ve las necesidades de traslado. El alcance actual son
**sólo los traslados**; el filtro *Tipo de necesidad* deja ya sitio a los camiones de carga, que se
añadirán más adelante. Datos de **ejemplo** generados de forma reproducible en el navegador.

### Filtros

| Filtro | Qué hace |
|---|---|
| **Fecha de solicitud** (desde / hasta) | Filtra las solicitudes por su fecha. Un material sale en el nivel 1 si tiene al menos una solicitud dentro del rango. |
| **Material** | Código o nombre, por texto contenido. |
| **Nombre de cliente** | Se aplica a los pedidos de venta y arrastra al material: si se filtra por cliente, sólo salen los materiales con pedidos de ese cliente. |
| **Tipo de necesidad** | *Traslados* (único activo) y *Camiones de carga*, deshabilitado hasta que se amplíe la funcionalidad. |

### Nivel 1 — una fila por material

`Material`, `Nombre del material`, `Solicitudes` (nº), `Cant. a trasladar (UD)`, `Palets`,
`1.ª fecha de solicitud`, `Pedidos de venta` (nº) y `Cant. pendiente (UD)`. Las columnas ordenan al
pulsar en la cabecera y los totales son siempre los de las líneas filtradas. Al pulsar en la fila se
despliega el nivel 2.

### Nivel 2 — dos pestañas

- **Necesidades de traslado:** `Solicitud`, `Pos.`, `Fecha de solicitud`, `Cantidad (UD)`, `Palets`,
  `Centro destino`, `Almacén destino` y `Estado` (Abierta / Parcial / Convertida a pedido).
- **Pedidos de venta:** `Pedido`, `Pos.`, `Cliente`, `Centro`, `Almacén`, `Cant. pendiente (UD)` y
  `Fecha de entrega`.

Cada pestaña cierra con una fila de totales. Cada material recuerda la pestaña que se dejó abierta.

### Pendiente de confirmar

- **Almacén y centro de origen** de la solicitud: en el ejemplo todas salen del `1202`, por lo que no
  se muestra la columna. Si va a haber varios orígenes, hay que añadirla.
- **Unidad de medida:** el ejemplo usa unidades (UD) y palets; falta confirmar cuál es la de trabajo.
- **Estados de la solicitud:** los tres del ejemplo (Abierta, Parcial, Convertida) son una propuesta.

Para conectar con datos reales basta sustituir `genDatos()` por la consulta correspondiente,
manteniendo la forma de los arrays `solicitudes` y `pedidos`.
