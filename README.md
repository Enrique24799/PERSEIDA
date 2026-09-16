# PERSEIDA — Visores HTML (ejemplos)

Visores HTML **autocontenidos** (sin dependencias externas, se abren directamente en el navegador):

- `gantt-tiempo-cambio.html` — Gantt de tiempos de cambio por línea.
- `OUTPUT_PANTALLA_VENTAS.html` — Pantalla de ventas con la propuesta de carga de camiones.
- `flujos-material-multipais.html` — Flujos actual y objetivo del proceso multipaís (centros de país).

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

## `flujos-material-multipais.html` — Flujos multipaís (actual vs. objetivo)

Dibujo de los dos flujos de planificación, venta y expedición entre Perseida y las sociedades de
país (Francia, Holanda…), tomando `70908810` como material de ejemplo.

### Flujo actual

Copia manual del material (`70908810FR`) en el **centro 12**, almacén `HUFR` / `HUNL`. La previsión
del país se carga sobre `70908810` en el almacén `1202`, las necesidades llegan a GPP como
`70908810` mezcladas con las del centro 12, se fabrica y se da de alta en el `1201`. Logística
lleva en un Excel lo que hay que mandar a cada país, hace el movimiento **311** del `1202` al
`HUFR` y crea a mano el pedido de venta y el de compra entre Perseida y Perseida FR. El pedido del
cliente final entra sobre `70908810FR` contra `HUFR` y la salida también es manual.

### Flujo objetivo

Un único material `70908810` dado de alta en un **centro por país** (`12FR`, `12NL`). La previsión
se carga en el centro del país, separada de la del centro 12; la demanda llega al centro 12 como
**necesidad de traslado** visible para logística (se elimina el Excel). El traslado se resuelve con
**picking desde la PDA** y entrada de mercancías en el `12FR`, igual que los camiones de traslado
actuales, y el pedido del cliente final va contra el centro `12FR`.

### Cómo leer los diagramas

Los dos diagramas comparten carriles (datos maestros, previsión y planificación, fabricación y
stock, comercial ES–FR, cliente final) y columnas, para poder compararlos fila a fila. Ámbar
discontinuo = paso manual, verde = paso automático, caja tachada = lo que desaparece, azul
discontinuo = pendiente de definir. El apartado **Puntos a cerrar** recoge lo que la descripción
del proceso deja abierto (entre otros, el paso del almacén `1201` al `1202` y cómo queda la
facturación entre empresas).
