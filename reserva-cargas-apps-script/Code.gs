/* =====================================================================
   PERSEIDA · Reserva de fechas de carga — Backend (Google Apps Script)

   Hoja de cálculo de Google + este script publicado como «Aplicación web».
   La página RESERVA_CARGAS.html llama a la URL /exec de la aplicación.

   - Hoja «Fechas»:   fechas de carga posibles (las da de alta la planificación,
                      desde la página o escribiendo directamente en la hoja).
                      Fila sin «Cliente» = LIBRE · con «Cliente» = RESERVADA.
   - Hoja «Accesos»:  código de acceso de cada cliente y de la planificación.
   - Hoja «Registro»: histórico de reservas, anulaciones, altas y bajas.

   Todas las operaciones se hacen con un bloqueo (LockService), de modo que
   si dos clientes reservan la misma fecha a la vez solo gana el primero.

   Instalación: ver README.md, sección «RESERVA_CARGAS.html».
   ===================================================================== */

const CONFIG = {
  NOTIFICAR_A: 'jgata@perseida.com',      // aviso de cada reserva/anulación (varios: separados por comas)
  COPIA_AL_CLIENTE: true,                 // CC al email de contacto que indique el cliente al reservar
  PERMITIR_ANULAR_CLIENTE: true,          // el cliente puede anular sus propias reservas futuras
  MAX_RESERVAS_ACTIVAS_POR_CLIENTE: 0,    // 0 = sin límite
  DIAS_HISTORICO_PLANIFICACION: 90,       // la planificación ve también las fechas pasadas de los últimos N días
  REMITENTE: 'PERSEIDA · Reservas de carga',
};

/* Usuarios que crea setup() en la hoja «Accesos». Para añadir un cliente
   más basta con añadir una fila en esa hoja (no hace falta tocar el código). */
const CLIENTES_INICIALES = ['FEDEFARMA', 'BIDAFARMA', 'UNNEFA'];
const PLANIFICACION = 'PLANIFICACION';

const HOJA = { FECHAS: 'Fechas', ACCESOS: 'Accesos', REGISTRO: 'Registro' };
const COLS = ['ID', 'Fecha', 'Franja horaria', 'Observaciones', 'Cliente',
  'Persona de contacto', 'Email de contacto', 'Comentario del cliente', 'Reservado el'];
const C = { ID: 0, FECHA: 1, FRANJA: 2, OBS: 3, CLIENTE: 4, CONTACTO: 5, EMAIL: 6, COMENT: 7, RESERVADO: 8 };

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
  'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/* ---------- Puntos de entrada de la aplicación web ---------- */

function doGet() {
  return json_({ ok: true, servicio: 'PERSEIDA · Reserva de fechas de carga' });
}

/* La página envía POST con Content-Type text/plain (evita el preflight CORS)
   y cuerpo JSON: { action, code, ...datos }. */
function doPost(e) {
  try {
    const req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    return json_(atender_(req));
  } catch (err) {
    return json_({ ok: false, error: err.message || String(err), conflicto: !!err.conflicto });
  }
}

function atender_(req) {
  const { usuario, clientes } = autenticar_(req.code);
  const esPlan = usuario === PLANIFICACION;
  let aviso = null;
  let mensaje = '';

  const fechas = conBloqueo_(() => {
    switch (req.action) {
      case 'list':
        break;
      case 'reserve':
        ({ aviso, mensaje } = reservar_(usuario, req));
        break;
      case 'cancel':
        ({ aviso, mensaje } = anular_(usuario, req));
        break;
      case 'addSlots':
        soloPlanificacion_(esPlan);
        mensaje = altaFechas_(req.fechas);
        break;
      case 'deleteSlot':
        soloPlanificacion_(esPlan);
        mensaje = eliminarFecha_(req.id);
        break;
      default:
        throw new Error('Acción no válida.');
    }
    return listar_(usuario);
  });

  // El correo se envía fuera del bloqueo para no frenar a los demás usuarios.
  const correo = aviso ? enviarAviso_(aviso) : null;

  return {
    ok: true,
    usuario,
    planificador: esPlan,
    clientes: esPlan ? clientes : [],
    reglas: {
      permitirAnular: CONFIG.PERMITIR_ANULAR_CLIENTE,
      maxReservas: CONFIG.MAX_RESERVAS_ACTIVAS_POR_CLIENTE,
      copiaCliente: CONFIG.COPIA_AL_CLIENTE,
    },
    mensaje,
    correo,
    fechas,
  };
}

/* ---------- Acceso ---------- */

function autenticar_(code) {
  code = String(code || '').trim();
  const sh = hoja_(HOJA.ACCESOS);
  const filas = sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, 2).getValues() : [];
  const clientes = [];
  let usuario = null;
  filas.forEach(([u, codigo]) => {
    u = String(u).trim().toUpperCase();
    if (!u) return;
    if (u !== PLANIFICACION) clientes.push(u);
    if (code && String(codigo).trim() === code) usuario = u;
  });
  if (!usuario) {
    Utilities.sleep(800); // frena los intentos de adivinar códigos
    throw new Error('Código de acceso no válido.');
  }
  return { usuario, clientes };
}

function soloPlanificacion_(esPlan) {
  if (!esPlan) throw new Error('Solo la planificación de Perseida puede hacer esta operación.');
}

/* ---------- Operaciones ---------- */

function listar_(usuario) {
  const esPlan = usuario === PLANIFICACION;
  const hoy = hoy_();
  const desde = esPlan ? sumarDias_(hoy, -CONFIG.DIAS_HISTORICO_PLANIFICACION) : hoy;
  return leerFechas_()
    .filter(f => f.fecha >= desde)
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.franja.localeCompare(b.franja))
    .map(f => {
      const mia = f.cliente === usuario;
      const v = { id: f.id, fecha: f.fecha, franja: f.franja, obs: f.obs,
        estado: !f.cliente ? 'libre' : (mia ? 'mia' : 'ocupada') };
      // Un cliente nunca ve qué otro cliente ha reservado una fecha.
      if (esPlan || mia) {
        Object.assign(v, { cliente: f.cliente, contacto: f.contacto, email: f.email,
          comentario: f.comentario, reservadoEl: f.reservadoEl });
      }
      return v;
    });
}

function reservar_(usuario, req) {
  if (usuario === PLANIFICACION) {
    throw new Error('Para asignar una fecha a un cliente, escribe su nombre en la columna «Cliente» de la hoja «Fechas».');
  }
  const hoy = hoy_();
  const filas = leerFechas_();
  const f = filas.find(x => x.id === String(req.id));
  if (!f) throw conflicto_('Esta fecha ya no está disponible.');
  if (f.fecha < hoy) throw new Error('No se puede reservar una fecha pasada.');
  if (f.cliente === usuario) throw conflicto_('Ya tienes reservada esta fecha.');
  if (f.cliente) throw conflicto_('Lo sentimos: otro cliente acaba de reservar esta fecha. Elige otra, por favor.');

  const max = CONFIG.MAX_RESERVAS_ACTIVAS_POR_CLIENTE;
  if (max > 0 && filas.filter(x => x.cliente === usuario && x.fecha >= hoy).length >= max) {
    throw new Error(`Has alcanzado el máximo de ${max} reserva(s) activa(s).`);
  }

  const contacto = texto_(req.contacto, 80);
  const email = texto_(req.email, 120).toLowerCase();
  const comentario = texto_(req.comentario, 500);
  if (contacto.length < 2) throw new Error('Indica la persona de contacto.');
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('El email de contacto no es válido.');

  hoja_(HOJA.FECHAS).getRange(f.fila, C.CLIENTE + 1, 1, 5)
    .setValues([[usuario, celda_(contacto), celda_(email), celda_(comentario), new Date()]]);
  registrar_(usuario, 'RESERVA', f, contacto + (comentario ? ' · ' + comentario : ''));

  return {
    mensaje: `Reserva confirmada: ${fechaLarga_(f.fecha)}${f.franja ? ' · ' + f.franja : ''}.`,
    aviso: { tipo: 'reserva', por: usuario, cliente: usuario, fecha: f.fecha, franja: f.franja,
      obs: f.obs, contacto, email, comentario },
  };
}

function anular_(usuario, req) {
  const esPlan = usuario === PLANIFICACION;
  const f = leerFechas_().find(x => x.id === String(req.id));
  if (!f || !f.cliente) throw conflicto_('Esta fecha ya no está reservada.');
  if (!esPlan) {
    if (f.cliente !== usuario) throw new Error('Solo puedes anular tus propias reservas.');
    if (!CONFIG.PERMITIR_ANULAR_CLIENTE) throw new Error('Para anular una reserva contacta con la planificación de Perseida.');
    if (f.fecha < hoy_()) throw new Error('No se puede anular una reserva pasada.');
  }

  hoja_(HOJA.FECHAS).getRange(f.fila, C.CLIENTE + 1, 1, 5).clearContent();
  registrar_(usuario, 'ANULACIÓN', f, 'Reserva de ' + f.cliente);

  return {
    mensaje: esPlan ? `Fecha liberada (estaba reservada por ${f.cliente}).` : 'Reserva anulada. La fecha vuelve a estar libre.',
    aviso: { tipo: 'anulacion', por: usuario, cliente: f.cliente, fecha: f.fecha, franja: f.franja,
      obs: f.obs, contacto: f.contacto, email: f.email, comentario: f.comentario },
  };
}

function altaFechas_(lista) {
  if (!Array.isArray(lista) || !lista.length) throw new Error('No hay fechas que añadir.');
  if (lista.length > 500) throw new Error('Demasiadas fechas de una vez (máximo 500).');
  const tz = tz_();
  const hoy = hoy_();
  const existentes = new Set(leerFechas_().map(f => f.fecha + '|' + f.franja.toLowerCase()));
  const nuevas = [];
  let repetidas = 0;

  lista.forEach(x => {
    const fecha = String((x && x.fecha) || '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || sumarDias_(fecha, 0) !== fecha) throw new Error('Fecha no válida: ' + fecha);
    if (fecha < hoy) throw new Error('No se pueden añadir fechas pasadas: ' + fecha);
    const franja = texto_(x.franja, 40);
    const obs = texto_(x.obs, 200);
    const clave = fecha + '|' + franja.toLowerCase();
    if (existentes.has(clave)) { repetidas++; return; }
    existentes.add(clave);
    nuevas.push([nuevoId_(), Utilities.parseDate(fecha, tz, 'yyyy-MM-dd'), celda_(franja), celda_(obs), '', '', '', '', '']);
  });

  if (nuevas.length) {
    const sh = hoja_(HOJA.FECHAS);
    sh.getRange(sh.getLastRow() + 1, 1, nuevas.length, COLS.length).setValues(nuevas);
    registrar_(PLANIFICACION, 'ALTA', null, nuevas.length + ' fecha(s)');
  }
  return `${nuevas.length} fecha(s) añadida(s)` + (repetidas ? `; ${repetidas} ya existían y se han omitido.` : '.');
}

function eliminarFecha_(id) {
  const f = leerFechas_().find(x => x.id === String(id));
  if (!f) throw conflicto_('La fecha ya no existe.');
  if (f.cliente) throw new Error(`La fecha está reservada por ${f.cliente}. Libérala antes de eliminarla.`);
  hoja_(HOJA.FECHAS).deleteRow(f.fila);
  registrar_(PLANIFICACION, 'BAJA', f, '');
  return 'Fecha eliminada.';
}

/* ---------- Correo ---------- */

function enviarAviso_(a) {
  if (!CONFIG.NOTIFICAR_A) return null;
  const esReserva = a.tipo === 'reserva';
  const titulo = esReserva ? 'Nueva reserva de fecha de carga' : 'Reserva de fecha de carga ANULADA';
  const asunto = `${titulo} · ${a.cliente} · ${fechaCorta_(a.fecha)}${a.franja ? ' ' + a.franja : ''}`;
  const filas = [
    ['Cliente', a.cliente],
    ['Fecha de carga', fechaLarga_(a.fecha)],
    ['Franja horaria', a.franja],
    ['Observaciones', a.obs],
    ['Persona de contacto', a.contacto],
    ['Email de contacto', a.email],
    ['Comentario del cliente', a.comentario],
    [esReserva ? 'Reservado el' : 'Anulado el', Utilities.formatDate(new Date(), tz_(), 'dd/MM/yyyy HH:mm')],
  ];
  if (!esReserva) filas.push(['Anulado por', a.por === PLANIFICACION ? 'Planificación Perseida' : a.por]);

  const color = esReserva ? '#2f5f8f' : '#d9534f';
  const htmlBody =
    `<div style="font-family:Segoe UI,Arial,sans-serif;color:#243140;font-size:14px">` +
    `<h2 style="margin:0 0 12px;color:${color};font-size:18px">${esc_(titulo)}</h2>` +
    `<table style="border-collapse:collapse">` +
    filas.map(([k, v]) =>
      `<tr><td style="padding:5px 14px 5px 0;color:#5b6b7d">${esc_(k)}</td>` +
      `<td style="padding:5px 0;font-weight:600">${esc_(v || '—')}</td></tr>`).join('') +
    `</table>` +
    `<p style="margin-top:16px"><a href="${SpreadsheetApp.getActive().getUrl()}">Abrir la hoja de reservas</a></p>` +
    `</div>`;
  const body = titulo + '\n\n' + filas.map(([k, v]) => `${k}: ${v || '—'}`).join('\n');

  const mensaje = { to: CONFIG.NOTIFICAR_A, subject: asunto, body, htmlBody, name: CONFIG.REMITENTE };
  if (a.email) {
    mensaje.replyTo = a.email;
    if (CONFIG.COPIA_AL_CLIENTE) mensaje.cc = a.email;
  }
  try {
    MailApp.sendEmail(mensaje);
    return { enviado: true };
  } catch (err) {
    console.error('Error enviando aviso: ' + err);
    registrar_('SISTEMA', 'ERROR CORREO', a, String(err.message || err));
    return { enviado: false };
  }
}

/* Ejecutar una vez desde el editor: concede el permiso de envío de correo
   y comprueba que el aviso llega a CONFIG.NOTIFICAR_A. */
function pruebaCorreo() {
  MailApp.sendEmail(CONFIG.NOTIFICAR_A, 'PERSEIDA · Reservas de carga — correo de prueba',
    'Si recibes este correo, los avisos de reserva están bien configurados.');
  Logger.log('Correo de prueba enviado a ' + CONFIG.NOTIFICAR_A + '. Cuota restante hoy: ' + MailApp.getRemainingDailyQuota());
}

/* ---------- Instalación ---------- */

/* Ejecutar una vez desde el editor: crea las hojas y genera los códigos de acceso. */
function setup() {
  const fechas = hoja_(HOJA.FECHAS, true);
  fechas.getRange(1, 1, 1, COLS.length).setValues([COLS]);
  cabecera_(fechas, COLS.length);
  fechas.getRange('B2:B').setNumberFormat('dd/mm/yyyy');
  fechas.getRange('C2:C').setNumberFormat('@');
  fechas.getRange('I2:I').setNumberFormat('dd/mm/yyyy hh:mm');
  fechas.setColumnWidth(1, 90);
  fechas.setColumnWidths(2, 3, 130);
  fechas.setColumnWidths(5, 5, 170);
  fechas.setConditionalFormatRules([
    SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied('=$E2<>""')
      .setBackground('#fdebd0')
      .setRanges([fechas.getRange('A2:I')])
      .build(),
  ]);

  const accesos = hoja_(HOJA.ACCESOS, true);
  if (accesos.getLastRow() < 2) {
    accesos.getRange(1, 1, 1, 2).setValues([['Usuario', 'Código de acceso']]);
    const filas = CLIENTES_INICIALES.concat(PLANIFICACION).map(u => [u, nuevoCodigo_()]);
    accesos.getRange(2, 1, filas.length, 2).setValues(filas);
  }
  cabecera_(accesos, 2);
  accesos.setColumnWidths(1, 2, 200);

  const registro = hoja_(HOJA.REGISTRO, true);
  if (registro.getLastRow() < 1) {
    registro.appendRow(['Fecha/hora', 'Usuario', 'Acción', 'ID', 'Fecha de carga', 'Franja', 'Detalle']);
  }
  cabecera_(registro, 7);

  Logger.log('Hojas preparadas. Códigos de acceso (hoja «Accesos»):');
  accesos.getRange(2, 1, accesos.getLastRow() - 1, 2).getValues()
    .forEach(([u, c]) => Logger.log(`  ${u}: ${c}`));
}

/* ---------- Lectura de la hoja «Fechas» ---------- */

function leerFechas_() {
  const sh = hoja_(HOJA.FECHAS);
  const n = sh.getLastRow() - 1;
  if (n < 1) return [];
  const tz = tz_();
  const rango = sh.getRange(2, 1, n, COLS.length);
  const vals = rango.getValues();
  const txt = rango.getDisplayValues(); // texto tal como se ve en la hoja (horas, etc.)
  let idsNuevos = false;
  const filas = [];
  vals.forEach((v, i) => {
    const fecha = aISO_(v[C.FECHA], tz);
    if (!fecha) return; // fila vacía o fecha ilegible
    // Filas escritas a mano por la planificación: se les asigna un ID.
    if (!v[C.ID]) { v[C.ID] = nuevoId_(); idsNuevos = true; }
    const t = txt[i].map(x => String(x).trim());
    filas.push({
      fila: i + 2,
      id: String(v[C.ID]),
      fecha,
      franja: t[C.FRANJA],
      obs: t[C.OBS],
      cliente: t[C.CLIENTE].toUpperCase(),
      contacto: t[C.CONTACTO],
      email: t[C.EMAIL],
      comentario: t[C.COMENT],
      reservadoEl: t[C.RESERVADO],
    });
  });
  if (idsNuevos) sh.getRange(2, 1, n, 1).setValues(vals.map(v => [v[C.ID]]));
  return filas;
}

/* ---------- Utilidades ---------- */

function conBloqueo_(fn) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) throw new Error('El sistema está ocupado. Inténtalo de nuevo en unos segundos.');
  try {
    const r = fn();
    SpreadsheetApp.flush();
    return r;
  } finally {
    lock.releaseLock();
  }
}

function registrar_(usuario, accion, f, detalle) {
  hoja_(HOJA.REGISTRO).appendRow([new Date(), usuario, accion,
    f ? f.id || '' : '', f ? f.fecha : '', f ? celda_(f.franja || '') : '', celda_(detalle || '')]);
}

function hoja_(nombre, crear) {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(nombre) || (crear ? ss.insertSheet(nombre) : null);
  if (!sh) throw new Error(`Falta la hoja «${nombre}». Ejecuta setup() desde el editor de Apps Script.`);
  return sh;
}

function cabecera_(sh, ncols) {
  sh.getRange(1, 1, 1, ncols).setFontWeight('bold').setBackground('#2f5f8f').setFontColor('#ffffff');
  sh.setFrozenRows(1);
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

function conflicto_(msg) {
  const e = new Error(msg);
  e.conflicto = true;
  return e;
}

function tz_() { return SpreadsheetApp.getActive().getSpreadsheetTimeZone(); }
function hoy_() { return Utilities.formatDate(new Date(), tz_(), 'yyyy-MM-dd'); }

function sumarDias_(iso, n) {
  const d = new Date(iso + 'T00:00:00Z');
  if (isNaN(d)) return '';
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function pad2_(n) { return String(n).padStart(2, '0'); }

/* Fecha de la hoja (Date o texto dd/mm/aaaa · aaaa-mm-dd) → 'aaaa-mm-dd'. */
function aISO_(v, tz) {
  if (v instanceof Date) return isNaN(v) ? '' : Utilities.formatDate(v, tz, 'yyyy-MM-dd');
  const s = String(v).trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return `${m[1]}-${pad2_(m[2])}-${pad2_(m[3])}`;
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (m) return `${m[3]}-${pad2_(m[2])}-${pad2_(m[1])}`;
  return '';
}

function texto_(v, max) { return String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, max); }

/* Evita que un texto del cliente se interprete como fórmula en la hoja. */
function celda_(s) { return /^[=+\-@]/.test(s) ? "'" + s : s; }

function esc_(s) {
  return String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
}

function fechaLarga_(iso) {
  const d = new Date(iso + 'T12:00:00Z');
  return `${DIAS[d.getUTCDay()]}, ${d.getUTCDate()} de ${MESES[d.getUTCMonth()]} de ${d.getUTCFullYear()}`;
}

function fechaCorta_(iso) {
  const [y, m, d] = iso.split('-');
  return `${DIAS[new Date(iso + 'T12:00:00Z').getUTCDay()].slice(0, 3)} ${d}/${m}/${y}`;
}

function nuevoId_() { return Utilities.getUuid().replace(/-/g, '').slice(0, 8); }

function nuevoCodigo_() {
  const h = Utilities.getUuid().replace(/-/g, '').toUpperCase();
  return `${h.slice(0, 4)}-${h.slice(4, 8)}-${h.slice(8, 12)}`;
}
