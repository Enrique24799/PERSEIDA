# PERSEIDA — Visores HTML (ejemplos)

Visores HTML **autocontenidos** (sin dependencias externas, se abren directamente en el navegador):

- `gantt-tiempo-cambio.html` — Gantt de tiempos de cambio por línea.
- `OUTPUT_PANTALLA_VENTAS.html` — Pantalla de ventas con la propuesta de carga de camiones.
- `RESERVA_CARGAS.html` — Reserva de fechas de carga para FEDEFARMA, BIDAFARMA y UNNEFA (con servidor en
  Google Sheets + Apps Script y aviso por correo; ver [su sección](#reserva_cargashtml--reserva-de-fechas-de-carga)).

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

## `RESERVA_CARGAS.html` — Reserva de fechas de carga

La planificación de Perseida publica fechas de carga posibles y los clientes **FEDEFARMA**, **BIDAFARMA**
y **UNNEFA** entran (cada uno cuando quiera) y reservan una. En cuanto un cliente reserva una fecha, deja de
estar disponible para los otros dos. Cada reserva o anulación envía un correo a **jgata@perseida.com**.

### Arquitectura

Un HTML estático (GitHub Pages u otro repositorio/hosting) no puede compartir datos entre clientes, así que
la página habla con un pequeño servidor gratuito: una **hoja de cálculo de Google** con un **Apps Script**
publicado como aplicación web.

```
 FEDEFARMA ─┐
 BIDAFARMA ─┼─► RESERVA_CARGAS.html ──POST JSON──► Apps Script (aplicación web) ──► correo a jgata@perseida.com
 UNNEFA ────┤   (repositorio externo)                │  bloqueo: si dos clientes reservan
 Planific. ─┘                                        │  a la vez, solo gana el primero
                                                     ▼
                                     Hoja de Google: «Fechas» · «Accesos» · «Registro»
```

- **Hoja «Fechas»**: una fila por fecha/franja de carga. Fila sin cliente = libre; con cliente = reservada.
- **Hoja «Accesos»**: código de acceso de cada cliente y de la planificación.
- **Hoja «Registro»**: histórico de altas, bajas, reservas, anulaciones y errores de correo.

Código del servidor: [`reserva-cargas-apps-script/Code.gs`](reserva-cargas-apps-script/Code.gs).

### Funcionamiento

**Clientes**
- Entran con su código (o con su enlace personalizado `…/RESERVA_CARGAS.html?c=CÓDIGO`; el código se quita
  de la barra de direcciones y queda recordado en ese navegador).
- Ven un calendario (o lista, en móvil) con las fechas **libres** (verde), **las suyas** (azul) y las
  **no disponibles** (gris). Un cliente **nunca ve qué otro cliente** ha reservado una fecha.
- Para reservar indican persona de contacto (obligatoria), email (opcional, recibe copia del aviso) y un
  comentario (nº de palets, matrícula…).
- Si otro cliente se adelanta mientras tanto, la reserva se rechaza con un aviso y la vista se actualiza.
- Pueden anular sus reservas futuras (configurable); la fecha vuelve a quedar libre.
- La disponibilidad se refresca sola cada 60 s y al volver a la pestaña.

**Planificación** (código `PLANIFICACION`)
- Alta de fechas por rango (*desde/hasta*), días de la semana y una o varias franjas horarias separadas por
  comas, con observaciones visibles para los clientes.
- Ve qué cliente tiene cada fecha, sus datos de contacto, y puede **liberar** (reservadas) o **eliminar**
  (libres) fechas.
- También puede trabajar directamente en la hoja «Fechas»: añadir filas (Fecha, Franja horaria,
  Observaciones; el ID se rellena solo), escribir un cliente para asignarle una fecha o borrar las columnas
  E–I para liberarla.

**Correo** a `jgata@perseida.com` en cada reserva y anulación, con cliente, fecha, franja, contacto y
comentario, y enlace a la hoja. Si el cliente indicó email, va en copia y como dirección de respuesta. Si
el envío falla, la reserva se mantiene, la página lo indica y queda anotado en «Registro».

### Instalación (una sola vez, ~15 minutos)

1. Con la cuenta de Google desde la que saldrán los avisos (p. ej. una cuenta genérica de planificación),
   crea una **hoja de cálculo de Google** nueva, por ejemplo «PERSEIDA · Reservas de carga».
2. En la hoja: **Extensiones → Apps Script**. Borra el contenido de `Código.gs`, pega el de
   [`reserva-cargas-apps-script/Code.gs`](reserva-cargas-apps-script/Code.gs) y guarda.
3. **Configuración del proyecto** (⚙): zona horaria **(GMT+01:00) Madrid**. Comprueba también que la hoja
   de cálculo usa esa zona (Archivo → Configuración).
4. En el editor, elige la función **`setup`** y pulsa **Ejecutar**. Acepta los permisos (si aparece «Google
   no ha verificado esta aplicación»: *Configuración avanzada → Ir a … (no seguro)*; es lo normal en
   scripts propios). Se crean las hojas y los **códigos de acceso** en la hoja «Accesos».
5. Ejecuta **`pruebaCorreo`** y comprueba que llega un correo a jgata@perseida.com.
6. **Implementar → Nueva implementación → Aplicación web**, con *Ejecutar como: Yo* y *Quién tiene acceso:
   Cualquier usuario*. Copia la URL que termina en **`/exec`**.
7. En `RESERVA_CARGAS.html` pega esa URL en `CONFIG.API_URL`:
   ```js
   const CONFIG = {
     API_URL: 'https://script.google.com/macros/s/XXXXXXXX/exec',
   ```
8. Sube `RESERVA_CARGAS.html` al repositorio externo (p. ej. GitHub Pages: *Settings → Pages → Deploy from
   a branch*).
9. Envía a cada cliente su enlace con su código:
   `https://<usuario>.github.io/<repositorio>/RESERVA_CARGAS.html?c=<CÓDIGO>`.

> Si más adelante cambias `Code.gs`: *Implementar → Gestionar implementaciones → ✏️ → Versión: Nueva
> versión*. Así la URL `/exec` no cambia y no hay que tocar el HTML.
>
> En cuentas de Google Workspace, si el administrador no permite *«Cualquier usuario»*, usa otra cuenta o
> pide que lo habilite: los clientes no tienen cuenta de Perseida.

### Configuración (`CONFIG` en `Code.gs`)

| Parámetro | Por defecto | Qué hace |
|-----------|-------------|----------|
| `NOTIFICAR_A` | `jgata@perseida.com` | Destinatario(s) del aviso (varios separados por comas). |
| `COPIA_AL_CLIENTE` | `true` | Copia del aviso al email que indique el cliente. |
| `PERMITIR_ANULAR_CLIENTE` | `true` | El cliente puede anular sus reservas futuras. |
| `MAX_RESERVAS_ACTIVAS_POR_CLIENTE` | `0` | Máximo de reservas futuras por cliente (0 = sin límite), para repartir fechas. |
| `DIAS_HISTORICO_PLANIFICACION` | `90` | Días de fechas pasadas que ve la planificación. |

### Gestión de accesos

- Cambiar un código (p. ej. si se ha difundido): edítalo en la hoja «Accesos»; el cambio es inmediato.
- Añadir otro cliente: una fila nueva en «Accesos» con su nombre y un código.
- Los códigos **no** están en el HTML: la URL del script es pública, pero sin un código válido no se puede
  ver ni reservar nada.

### Límites

- Correos: 100/día con una cuenta de Gmail y 1.500/día con Google Workspace (de sobra para este uso).
- Pensado para pocos usuarios simultáneos (decenas); cada operación tarda 1–2 s.

### Modo demo

Con `CONFIG.API_URL` vacío, la página funciona en **modo demostración**: simula el servidor con las mismas
reglas y guarda los datos solo en ese navegador (no envía correos). Hay botones para entrar como cada
cliente o como planificación y comprobar el bloqueo entre clientes.

