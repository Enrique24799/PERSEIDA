# PERSEIDA — Visores HTML (ejemplos)

Visores HTML **autocontenidos** (sin dependencias externas, se abren directamente en el navegador):

- `gantt-tiempo-cambio.html` — Gantt de tiempos de cambio por línea.
- `OUTPUT_PANTALLA_VENTAS.html` — Pantalla de ventas con la propuesta de carga de camiones.

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

## `qlik/FACTURACION.qvs` — Script Qlik de facturación

Pestaña de facturación de PERSEIDA: genera las líneas `Expedido`, `Pendiente` y `Previsión`, las
guarda en `Historico_Facturacion.qvd` y las añade a `DATOS`.

### Cliente por defecto de la previsión (provisional)

La previsión (MDPB) viene por material, así que se le asigna un **cliente por defecto**
(bloque `2.bis`):

- Base: lo expedido en los últimos `vMesesClienteDefecto` meses (6, por `Fecha_Salida`) más la
  cartera actual (líneas `Pendiente`, incluidas las atrasadas). Los clientes de `vClientesExcluir`
  no cuentan.
- Se elige el cliente con **más cantidad** del material (si empatan: más importe y, después,
  `Id_Cliente`).
- Un material con previsión pero sin ventas ni cartera queda con `Id_Cliente = 'Sin cliente'`.
- En las líneas de previsión, `Origen_Cliente` indica de dónde sale el cliente
  (`Ventas + cartera` / `Sin ventas ni cartera`).

Cuando esté disponible la tabla de registros info de venta (cliente-material), tendrá prioridad
sobre este cálculo.

## `qlik/MAESTRO_MATERIALES.qvs` — Maestro de materiales

Construye `Materiales` (un registro por material del centro 12) y `MAESTRO_PERSEIDA`, la foto
mensual del maestro (mes actual guardado en `MAESTRO_PERSEIDA.qvd` junto con los meses pasados, más
18 meses futuros sin guardar). `MAESTRO_PERSEIDA` enlaza con las líneas de facturación de `DATOS`
por `Key` (`YYYY_MM_IdMaterial`).

### Agrupación de clientes

`CLC_AGRCL` / `CLC_AGRCL_TEXT` de `CL_MARA` indican a qué cliente pertenece cada material. Se
exponen en `Materiales` como `Id_Agrupacion_Cliente` y `Nombre_Agrupacion_Cliente`, y llegan a las
líneas de facturación (expedido, pendiente y previsión) a través de `Key`.

- **No** añadir campos con esos mismos nombres a `FACTURACION` / `DATOS`: Qlik crearía una clave
  sintética con `MAESTRO_PERSEIDA` y las líneas de meses pasados perderían los atributos del maestro.
  Si hace falta en la propia línea, usar otro nombre (p. ej. `Id_Agrupacion_Cliente_Fact`).
- Los meses anteriores a 2026_10 ya guardados en el QVD no tienen agrupación; tampoco los meses más
  allá del horizonte (`vHorizonte` = 18) ni los materiales que no están en el centro 12.
- Supone un único valor por material en `CL_MARA`; si hubiera varios, `Materiales` duplicaría filas.
