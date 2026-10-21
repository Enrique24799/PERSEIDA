# PERSEIDA — Visores HTML (ejemplos)

Visores HTML **autocontenidos** (sin dependencias externas, se abren directamente en el navegador):

- `gantt-tiempo-cambio.html` — Gantt de tiempos de cambio por línea.
- `OUTPUT_PANTALLA_VENTAS.html` — Pantalla de ventas con la propuesta de carga de camiones.
- `AJUSTE_PALETS.html` — Transacción de control y ajuste de inventario de palets.
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

## `RESERVA_CARGAS.html` — Reserva de fechas de carga

La planificación de Perseida habilita días y horas de carga y los clientes **FEDEFARMA**, **BIDAFARMA**
y **UNNEFA** inician sesión (cada uno cuando quiera) y reservan uno indicando el **nº de palets**. En
cuanto un cliente reserva, ese día y hora **desaparece para los otros dos**; la planificación ve qué
cliente lo ha reservado y con cuántos palets. Cada reserva envía un correo a **jgata@perseida.com**.

### Arquitectura

Un HTML estático (un repositorio, GitHub Pages…) no puede compartir datos entre clientes ni guardar
contraseñas de forma segura, así que la página habla con un pequeño servidor gratuito: una **hoja de
cálculo de Google** con un **Apps Script** publicado como aplicación web.

```
 FEDEFARMA ─┐
 BIDAFARMA ─┼─► RESERVA_CARGAS.html ──POST JSON──► Apps Script (aplicación web) ──► correo a jgata@perseida.com
 UNNEFA ────┤   (repositorio de clientes)            │  comprueba usuario/contraseña y bloquea:
 Planific. ─┘                                        │  si dos clientes reservan a la vez, gana el primero
                                                     ▼
                                     Hoja de Google privada: «Fechas» · «Accesos» · «Registro»
```

- **Hoja «Fechas»**: una fila por día/hora de carga (`ID`, `Fecha`, `Hora`, `Cliente`, `Nº palets`,
  `Reservado el`). Fila sin cliente = libre; con cliente = reservada.
- **Hoja «Accesos»**: `Usuario`, `Contraseña` y `Perfil` (`CLIENTE` o `PLANIFICADOR`).
- **Hoja «Registro»**: histórico de accesos fallidos, altas, bajas, reservas, anulaciones y errores de correo.

Código del servidor: [`reserva-cargas-apps-script/Code.gs`](reserva-cargas-apps-script/Code.gs).

### Seguridad (el repositorio lo verán los clientes)

- `RESERVA_CARGAS.html` **no contiene usuarios ni contraseñas**: se comprueban en el servidor contra la
  hoja «Accesos», que solo ve Perseida. Leer el código fuente de la página no da acceso a nada.
- Al iniciar sesión el servidor entrega un **token de sesión** (la contraseña no se guarda en el navegador).
  La sesión se cierra con «Cerrar sesión», al cerrar el navegador o tras 6 h sin uso. Si se cambia una
  contraseña en «Accesos», las sesiones abiertas de ese usuario dejan de valer al momento.
- Las contraseñas son de **4 cifras, distintas por usuario**, y **no están en el repositorio**: se entregan
  aparte y se escriben a mano en la hoja «Accesos».
- Como 4 cifras son pocas combinaciones, tras **5 contraseñas erróneas seguidas** el usuario queda
  bloqueado **1 hora** y se envía un **correo de alerta** a jgata@perseida.com (todo queda en «Registro»).
  Así, adivinar una contraseña probando llevaría meses y Perseida se entera desde el primer bloqueo.
- El servidor solo envía a cada cliente los días libres y sus propias reservas: **nunca** datos de otro cliente.
- Al repositorio de los clientes basta con subir `RESERVA_CARGAS.html` (con `API_URL` configurada).
  `Code.gs` y este README no tienen secretos, pero no hace falta que estén ahí.

### Funcionamiento

**Clientes**
- Pantalla **Iniciar sesión** con usuario y contraseña.
- Ven un calendario (o lista, en móvil) con los días y horas **libres** (verde) y **sus reservas** (azul).
  Lo reservado por otro cliente no les aparece.
- Al pulsar un día/hora libre, el popup solo muestra **a nombre de qué cliente** se hace la reserva, la
  fecha y la hora, y pide el **nº de palets**.
- Si otro cliente se adelanta mientras tanto, la reserva se rechaza con un aviso y la vista se actualiza.
- Pueden anular sus reservas futuras (configurable); el día vuelve a quedar libre para todos.
- La disponibilidad se refresca sola cada 60 s y al volver a la pestaña.

**Planificación** (usuario `PLANIFICADOR`)
- Habilita días por rango (*desde/hasta*), días de la semana y una o varias horas separadas por comas.
- Ve en el calendario y en la tabla qué cliente tiene cada día/hora, con cuántos palets, y un resumen de
  reservas y palets por cliente.
- Puede **liberar** (reservados) o **eliminar** (libres) días/horas.
- También puede trabajar directamente en la hoja «Fechas»: añadir filas (Fecha, Hora; el ID se rellena
  solo), escribir un cliente para asignarle un día o borrar las columnas D–F para liberarlo.
- El sistema arranca **sin ninguna fecha**: solo aparecen las que habilite la planificación.

**Correo** a `jgata@perseida.com` en cada reserva (y en cada anulación o liberación), con cliente, fecha,
hora y nº de palets, y enlace a la hoja. Si el envío falla, la reserva se mantiene, la página lo indica
y queda anotado en «Registro».

### Instalación (una sola vez, ~15 minutos)

1. Con la cuenta de Google desde la que saldrán los avisos (p. ej. una cuenta genérica de planificación),
   crea una **hoja de cálculo de Google** nueva, por ejemplo «PERSEIDA · Reservas de carga». **No la
   compartas con los clientes.**
2. En la hoja: **Extensiones → Apps Script**. Borra el contenido de `Código.gs`, pega el de
   [`reserva-cargas-apps-script/Code.gs`](reserva-cargas-apps-script/Code.gs) y guarda.
3. **Configuración del proyecto** (⚙): zona horaria **(GMT+01:00) Madrid**. Comprueba también que la hoja
   de cálculo usa esa zona (Archivo → Configuración).
4. En el editor, elige la función **`setup`** y pulsa **Ejecutar**. Acepta los permisos (si aparece «Google
   no ha verificado esta aplicación»: *Configuración avanzada → Ir a … (no seguro)*; es lo normal en
   scripts propios). Se crean las hojas y la hoja «Accesos» con los usuarios `FEDEFARMA`, `BIDAFARMA`,
   `UNNEFA` y `PLANIFICADOR`, con las contraseñas de `CONTRASENAS_INICIALES` (en el repositorio está
   vacío: rellénalo en la copia que pegas en Apps Script, o escribe luego las contraseñas en la columna
   «Contraseña»). Un usuario sin contraseña no puede entrar.
5. Ejecuta **`pruebaCorreo`** y comprueba que llega un correo a jgata@perseida.com.
6. **Implementar → Nueva implementación → Aplicación web**, con *Ejecutar como: Yo* y *Quién tiene acceso:
   Cualquier usuario*. Copia la URL que termina en **`/exec`**.
7. En `RESERVA_CARGAS.html` pega esa URL en `CONFIG.API_URL`:
   ```js
   const CONFIG = {
     API_URL: 'https://script.google.com/macros/s/XXXXXXXX/exec',
   ```
8. Sube `RESERVA_CARGAS.html` al repositorio de los clientes (si se publica con GitHub Pages:
   *Settings → Pages → Deploy from a branch*). También funciona descargándolo y abriéndolo en el navegador.
9. Comunica a cada cliente su usuario y contraseña por un canal privado (no en el repositorio).

> Si más adelante cambias `Code.gs`: *Implementar → Gestionar implementaciones → ✏️ → Versión: Nueva
> versión*. Así la URL `/exec` no cambia y no hay que tocar el HTML.
>
> En cuentas de Google Workspace, si el administrador no permite *«Cualquier usuario»*, usa otra cuenta o
> pide que lo habilite: los clientes no tienen cuenta de Perseida.

### Configuración (`CONFIG` en `Code.gs`)

| Parámetro | Por defecto | Qué hace |
|-----------|-------------|----------|
| `NOTIFICAR_A` | `jgata@perseida.com` | Destinatario(s) del aviso (varios separados por comas). |
| `AVISAR_ANULACIONES` | `true` | Avisar también cuando se anula o libera una reserva. |
| `PERMITIR_ANULAR_CLIENTE` | `true` | El cliente puede anular sus reservas futuras. |
| `MAX_RESERVAS_ACTIVAS_POR_CLIENTE` | `0` | Máximo de reservas futuras por cliente (0 = sin límite), para repartir fechas. |
| `MAX_PALETS_POR_RESERVA` | `0` | Máximo de palets por reserva (0 = sin límite; p. ej. 33 = un camión). |
| `DIAS_HISTORICO_PLANIFICACION` | `90` | Días de fechas pasadas que ve la planificación. |
| `HORAS_SESION` | `6` | Horas sin uso tras las que caduca la sesión (máximo 6). |
| `INTENTOS_MAX` / `MINUTOS_BLOQUEO` | `5` / `60` | Bloqueo temporal tras contraseñas erróneas seguidas (máx. 360 min). |
| `AVISAR_BLOQUEOS` | `true` | Correo de alerta a `NOTIFICAR_A` cuando se bloquea un usuario. |

### Gestión de usuarios

- Cambiar una contraseña: edítala en la hoja «Accesos»; el cambio es inmediato y cierra las sesiones
  abiertas de ese usuario. Usa 4 cifras aleatorias, distintas para cada usuario y sin patrones obvios
  (1234, 1111, años…). Si recibes una alerta de bloqueo que no ha provocado el cliente, cámbiala.
- Añadir otro cliente: una fila nueva en «Accesos» con usuario, contraseña y perfil `CLIENTE`.
- Quitar el acceso: borra la fila (o la contraseña) del usuario.

### Límites

- Correos: 100/día con una cuenta de Gmail y 1.500/día con Google Workspace (de sobra para este uso).
- Pensado para pocos usuarios simultáneos (decenas); cada operación tarda 1–2 s.

### Sin servidor configurado

Si `CONFIG.API_URL` está vacío, la página no funciona: al iniciar sesión avisa de que falta conectarla al
servidor de reservas. **No subas el HTML a los clientes sin configurar `API_URL`.**
