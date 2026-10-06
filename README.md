# PERSEIDA — Visores HTML (ejemplos)

Visores HTML **autocontenidos** (sin dependencias externas, se abren directamente en el navegador):

- `gantt-tiempo-cambio.html` — Gantt de tiempos de cambio por línea.
- `OUTPUT_PANTALLA_VENTAS.html` — Pantalla de ventas con la propuesta de carga de camiones.
- `notificacion-fabricacion-reactores.html` — Notificación de fabricaciones en reactores.

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

## `notificacion-fabricacion-reactores.html` — Notificación de fabricaciones (reactores)

Versión para **reactores** de la pantalla de notificación de las líneas de envasado. Datos de
**ejemplo**; la llamada a SAP se simula en el navegador.

Cada orden se notifica **de una sola vez** (una única notificación), repartida en líneas: cada
línea es una **unidad de almacenamiento** con sus kilos y su ubicación, y SAP devuelve una
**matrícula por línea**.

### Tarjeta por reactor

`Reactor`, `Material`, `Orden Fab` (las órdenes de fabricación empiezan por **100**),
`Cod. Material` (los de fabricación empiezan por **29**) y `Kg Orden` (kilos totales de la orden).
Sin barra de progreso ni kilos notificados. Botones **Notificar** y **Ver Matrículas**.

La tarjeta muestra la primera orden del reactor sin notificar; al notificarla pasa a la siguiente.
Si ya están todas notificadas, muestra la última con la marca **NOTIFICADA** y el botón Notificar
desactivado (en los datos de ejemplo, R5).

### Ventana *Notificación Fabricación* (botón Notificar)

- **Datos Orden:** Material, Orden (desplegable con las órdenes del reactor; las ya notificadas
  aparecen desactivadas) y Tipo Material = *Fabricación*.
- **Datos:** Lote, Cant. de la Orden e Imprimir Etiqueta (activado por defecto).
- **Revisa los datos y confirma la notificación:** **Kilos a Notificar** (por defecto, la cantidad
  de la orden; avisa si difiere de ella, sin bloquear) y Observaciones (opcional).
- **Distribución en unidades de almacenamiento:** rejilla de líneas con **Kilos**, **Ubicación**
  (desplegable; por ahora Tanque 1 a Tanque 6, en `UBICACIONES`) y **Matrícula (SAP)**.
  *Añadir línea* propone los kilos que faltan; cada línea se puede quitar. Con una sola línea,
  sus kilos siguen al total. Se indica lo distribuido frente al total.
- **Aceptar** (o Enter) solo se activa si todas las líneas tienen kilos y ubicación y la suma
  coincide con los kilos a notificar. Envía la notificación a SAP (`sapNotificar()`), que devuelve
  las matrículas creadas: aparecen en la columna *Matrícula (SAP)* y en un aviso, la tarjeta se
  actualiza y la ventana queda en solo lectura con *Imprimir etiquetas* y *Cerrar*.
- Si *Imprimir Etiqueta* está activado, al pulsar Aceptar se abre una **pestaña nueva** que muestra
  las etiquetas (una por matrícula) en cuanto SAP responde y lanza el diálogo de impresión. Si el
  navegador bloquea la pestaña, la notificación se registra igualmente y se avisa para reimprimir.

### Ventana *Matrículas* (botón Ver Matrículas)

Matrículas creadas en SAP para la orden seleccionada (por defecto, la última notificada):
Matrícula, **Ubicación**, Kilos, Fecha de notificación, Lote y Observaciones. Cada fila puede
**reimprimir** su etiqueta y *Imprimir todas* imprime todas las de la orden (en una pestaña nueva).

### Etiqueta (una por matrícula)

Mismo diseño que la etiqueta de palet de envasado, adaptada a fabricación. Tamaño 148 × 105 mm
(A6 apaisado; se cambia en `.etq` y `@page`, dentro de `<template id="tplEstiloEtiqueta">`). Al
imprimir varias, cada etiqueta sale en su página.

| Envasado | Fabricación (reactores) |
|----------|-------------------------|
| Código de barras + nº de matrícula | Igual: **Code 128** de la matrícula (10 dígitos, `1000…`), generado en la propia página |
| Linea Envasado: L1 | **Reactor:** R1 |
| Fecha Alta | Fecha de la notificación |
| — | **Ubicación:** TANQUE N |
| Recuadro APROBADO / LOTE / PERSEIDA BELLEZA S.L. / EXP | Igual (estado de calidad de la orden, lote, empresa, caducidad MM/AA) |
| Matrícula con ceros a 20 dígitos | Igual |
| 1 de 12 (palet) | **1 de N** (unidad de almacenamiento dentro de la notificación) |
| Orden Envasado (200…) | **Orden Fabricación** (100…) |
| Cod. Material (70…) | Cod. Material de fabricación (**29…**) |
| Cantidad (unidades) | **Kilos** de esa unidad de almacenamiento |

Para conectar con datos reales basta sustituir el array `REACTORES` (incluye `codMaterial`,
`caducidad` y `estado` de cada orden), la lista `UBICACIONES` y la función `sapNotificar()` por la
llamada real a SAP, que debe devolver una matrícula por línea en el mismo orden.
