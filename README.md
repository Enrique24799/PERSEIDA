# PERSEIDA — Visores HTML (ejemplos)

Visores HTML **autocontenidos** (sin dependencias externas, se abren directamente en el navegador):

- `gantt-tiempo-cambio.html` — Gantt de tiempos de cambio por línea.
- `OUTPUT_PANTALLA_VENTAS.html` — Pantalla de ventas con la propuesta de carga de camiones.
- `FABRICACIONES.html` — Calendario de turnos (M/T/N) por día y reactor, con modificación masiva por sección.

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

## `FABRICACIONES.html` — Calendario de turnos por reactor

Módulo de **fabricaciones** para programar, por **día** y **puesto de trabajo (reactor)**, los turnos
de **Mañana (M)**, **Tarde (T)** y **Noche (N)**. Cada reactor se identifica **solo por su nomenclatura**
(`reNomenclatura`). Estado autocontenido y persistido en `localStorage`.

### Pantallas

- **Calendario.** Rejilla `día × reactor`: una semana en columnas (con navegación Anterior / Hoy /
  Siguiente) y los reactores en filas, agrupados por sección. En cada celda hay un *check* por turno
  (M/T/N) que se colorea al marcarse. La última columna resume nº de turnos y horas de cada reactor en
  la semana.
- **Configuración de turnos.** Nomenclatura y **duración** de cada turno: se editan las horas de inicio
  y fin (el turno de noche cruza la medianoche) y la duración se recalcula y alimenta los totales de
  horas del calendario.

### Modificación masiva (por sección)

- **Panel «Modificación masiva».** Elige los turnos (M/T/N), el ámbito de **días** (todos / laborables
  L–V / fin de semana / un día concreto) y de **reactores** (todos los de la sección o uno), y la acción
  **Marcar / Desmarcar** → botón **Aplicar**.
- **Patrones rápidos:** `L–V · M`, `L–V · M+T`, `L–V · M+T+N`, `7 días · M+T+N`, `Finde · M+T` y
  **Vaciar sección**.
- **Por fila / columna:** los botones `▣` (rellenar) y `▢` (vaciar) de cada reactor y de cada día
  aplican a toda la fila o columna visible.

### Origen de los datos

| Dato | Origen |
|------|--------|
| Reactores (sección, nomenclatura, color) | Tabla `dbo.Reactores` (`reUbicacion`, `reNomenclatura`, `reColor`) |
| Programación de turnos | Se introduce en pantalla; se guarda en `localStorage` (datos de ejemplo) |

Para conectar con datos reales basta sustituir el array `REACTORES` del `<script>` por la consulta
correspondiente a `dbo.Reactores`.
