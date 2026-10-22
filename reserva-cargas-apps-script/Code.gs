/* =====================================================================
   PERSEIDA · Reserva de fechas de carga — Backend (Google Apps Script)

   Hoja de cálculo de Google + este script publicado como «Aplicación web».
   La página RESERVA_CARGAS.html llama a la URL /exec de la aplicación.

   - Hoja «Fechas»:   días y horas de carga habilitados por la planificación
                      (desde la página o escribiendo directamente en la hoja).
                      Fila sin «Cliente» = LIBRE · con «Cliente» = RESERVADA.
   - Hoja «Accesos»:  usuario, contraseña y perfil (CLIENTE / PLANIFICADOR /
                      VISUALIZACION = solo consulta).
                      Las contraseñas solo están aquí: nunca en el HTML ni en
                      el repositorio (setup() crea los usuarios sin contraseña).
   - Hoja «Registro»: histórico de accesos fallidos, reservas, anulaciones,
                      altas y bajas.

   Todas las operaciones se hacen con un bloqueo (LockService), de modo que
   si dos clientes reservan la misma fecha a la vez solo gana el primero.

   Instalación: ver README.md, sección «RESERVA_CARGAS.html».
   ===================================================================== */

const CONFIG = {
  NOTIFICAR_A: 'jgata@perseida.com',      // aviso de cada reserva (varios: separados por comas)
  AVISAR_ANULACIONES: true,               // avisar también cuando se anula o libera una reserva
  PERMITIR_ANULAR_CLIENTE: true,          // el cliente puede anular sus propias reservas futuras
  MAX_RESERVAS_ACTIVAS_POR_CLIENTE: 0,    // 0 = sin límite
  MAX_PALETS_POR_RESERVA: 0,              // 0 = sin límite
  DIAS_HISTORICO_PLANIFICACION: 90,       // la planificación ve también las fechas pasadas de los últimos N días
  HORAS_SESION: 6,                        // la sesión caduca tras N horas sin uso (máximo 6)
  INTENTOS_MAX: 5,                        // contraseñas erróneas seguidas antes de bloquear el usuario…
  MINUTOS_BLOQUEO: 60,                    // …durante estos minutos (máximo 360). Con contraseñas de 4 cifras
                                          // conviene que sea estricto: 5 intentos/hora = meses para adivinarla.
  AVISAR_BLOQUEOS: true,                  // correo a NOTIFICAR_A cuando se bloquea un usuario
  REMITENTE: 'PERSEIDA · Reservas de carga',
};

/* Usuarios que setup() añade a la hoja «Accesos» si aún no están (no toca los
   que ya existen). La contraseña se toma de CONTRASENAS_INICIALES; si está
   vacía, se escribe luego a mano en la hoja. Un usuario sin contraseña no puede
   entrar. Perfiles: CLIENTE (reserva), PLANIFICADOR (habilita, libera y elimina)
   y VISUALIZACION (ve todo como el planificador, sin poder cambiar nada). */
const USUARIOS_INICIALES = [
  ['FEDEFARMA', 'CLIENTE'],
  ['BIDAFARMA', 'CLIENTE'],
  ['UNNEFA', 'CLIENTE'],
  ['PLANIFICADOR', 'PLANIFICADOR'],
  ['VISUALIZACION', 'VISUALIZACION'],
];

/* Rellenar solo en la copia pegada en Apps Script (no en el repositorio). */
const CONTRASENAS_INICIALES = {
  FEDEFARMA: '',
  BIDAFARMA: '',
  UNNEFA: '',
  PLANIFICADOR: '',
  VISUALIZACION: '',
};

const HOJA = { FECHAS: 'Fechas', ACCESOS: 'Accesos', REGISTRO: 'Registro' };
const COLS = ['ID', 'Fecha', 'Hora', 'Cliente', 'Nº palets', 'Reservado el'];
const C = { ID: 0, FECHA: 1, HORA: 2, CLIENTE: 3, PALETS: 4, RESERVADO: 5 };

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
  'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/* ---------- Puntos de entrada de la aplicación web ---------- */

function doGet() {
  return json_({ ok: true, servicio: 'PERSEIDA · Reserva de fechas de carga' });
}

/* La página envía POST con Content-Type text/plain (evita el preflight CORS)
   y cuerpo JSON: { action, token | usuario+password, ...datos }. */
function doPost(e) {
  try {
    const req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    return json_(atender_(req));
  } catch (err) {
    return json_({ ok: false, error: err.message || String(err), conflicto: !!err.conflicto, sesion: !!err.sesion });
  }
}

function atender_(req) {
  if (req.action === 'logout') {
    if (req.token) CacheService.getScriptCache().remove('ses_' + req.token);
    return { ok: true };
  }
  const accesos = leerAccesos_();
  let token = req.token;
  let acc;
  if (req.action === 'login') ({ token, acc } = iniciarSesion_(accesos, req.usuario, req.password));
  else acc = sesion_(accesos, token);

  let aviso = null;
  let mensaje = '';
  const fechas = conBloqueo_(() => {
    switch (req.action) {
      case 'login':
      case 'list':
        break;
      case 'reserve':
        ({ aviso, mensaje } = reservar_(acc, req));
        break;
      case 'cancel':
        ({ aviso, mensaje } = anular_(acc, req));
        break;
      case 'addSlots':
        soloPlanificacion_(acc);
        mensaje = altaFechas_(acc, req.fechas);
        break;
      case 'deleteSlot':
        soloPlanificacion_(acc);
        mensaje = eliminarFecha_(acc, req.id);
        break;
      default:
        throw new Error('Acción no válida.');
    }
    return listar_(acc);
  });

  // El correo se envía fuera del bloqueo para no frenar a los demás usuarios.
  const correo = aviso ? enviarAviso_(aviso) : null;

  return {
    ok: true,
    token: req.action === 'login' ? token : undefined,
    usuario: acc.usuario,
    planificador: acc.plan,
    soloLectura: acc.ver,
    clientes: acc.plan || acc.ver ? accesos.filter(a => a.cliente).map(a => a.usuario) : [],
    reglas: {
      permitirAnular: CONFIG.PERMITIR_ANULAR_CLIENTE,
      maxReservas: CONFIG.MAX_RESERVAS_ACTIVAS_POR_CLIENTE,
      maxPalets: CONFIG.MAX_PALETS_POR_RESERVA,
    },
    mensaje,
    correo,
    fechas,
  };
}

/* ---------- Usuarios y sesiones ---------- */

function leerAccesos_() {
  const sh = hoja_(HOJA.ACCESOS);
  const n = sh.getLastRow() - 1;
  const filas = n > 0 ? sh.getRange(2, 1, n, 3).getDisplayValues() : [];
  return filas
    .map(([u, p, perfil]) => {
      const plan = /^PLANIF/i.test(perfil.trim());
      const ver = /^VISUAL/i.test(perfil.trim());
      return { usuario: u.trim().toUpperCase(), password: p, plan, ver, cliente: !plan && !ver };
    })
    .filter(a => a.usuario && a.password);
}

function iniciarSesion_(accesos, usuario, password) {
  usuario = String(usuario || '').trim().toUpperCase();
  password = String(password || '');
  const cache = CacheService.getScriptCache();
  const kIntentos = 'int_' + usuario.slice(0, 60);
  const intentos = Number(cache.get(kIntentos) || 0);
  if (intentos >= CONFIG.INTENTOS_MAX) {
    throw new Error(`Usuario bloqueado temporalmente por demasiados intentos fallidos. Vuelve a intentarlo en ${CONFIG.MINUTOS_BLOQUEO} minutos.`);
  }
  const acc = accesos.find(a => a.usuario === usuario);
  if (!acc || acc.password !== password) {
    cache.put(kIntentos, String(intentos + 1), CONFIG.MINUTOS_BLOQUEO * 60);
    if (acc) {
      registrar_(acc.usuario, 'ACCESO FALLIDO', null, `Intento ${intentos + 1} de ${CONFIG.INTENTOS_MAX}`);
      if (intentos + 1 === CONFIG.INTENTOS_MAX) avisarBloqueo_(acc.usuario);
    }
    Utilities.sleep(1000); // frena los intentos de adivinar contraseñas
    throw new Error('Usuario o contraseña incorrectos.');
  }
  cache.remove(kIntentos);
  const token = (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '');
  // La sesión guarda una huella de la contraseña: si se cambia en «Accesos», la sesión deja de valer.
  cache.put('ses_' + token, JSON.stringify({ u: acc.usuario, h: huella_(acc.password) }), segundosSesion_());
  return { token, acc };
}

function sesion_(accesos, token) {
  token = String(token || '');
  const cache = CacheService.getScriptCache();
  const raw = /^[0-9a-f]{64}$/.test(token) ? cache.get('ses_' + token) : null;
  if (raw) {
    const s = JSON.parse(raw);
    const acc = accesos.find(a => a.usuario === s.u);
    if (acc && huella_(acc.password) === s.h) {
      cache.put('ses_' + token, raw, segundosSesion_()); // renueva la caducidad
      return acc;
    }
    cache.remove('ses_' + token);
  }
  const e = new Error('Tu sesión ha caducado. Inicia sesión de nuevo.');
  e.sesion = true;
  throw e;
}

function avisarBloqueo_(usuario) {
  registrar_(usuario, 'USUARIO BLOQUEADO', null, `${CONFIG.MINUTOS_BLOQUEO} minutos`);
  if (!CONFIG.AVISAR_BLOQUEOS || !CONFIG.NOTIFICAR_A) return;
  try {
    MailApp.sendEmail({
      to: CONFIG.NOTIFICAR_A,
      name: CONFIG.REMITENTE,
      subject: `Reservas de carga · usuario ${usuario} bloqueado por contraseñas erróneas`,
      body: `Se han introducido ${CONFIG.INTENTOS_MAX} contraseñas erróneas seguidas para el usuario ${usuario}, ` +
        `que queda bloqueado ${CONFIG.MINUTOS_BLOQUEO} minutos.\n\nSi no ha sido el propio cliente, cambia su ` +
        `contraseña en la hoja «Accesos»: ${SpreadsheetApp.getActive().getUrl()}`,
    });
  } catch (err) {
    console.error('Error enviando aviso de bloqueo: ' + err);
  }
}

function segundosSesion_() { return Math.min(Math.max(CONFIG.HORAS_SESION, 1), 6) * 3600; }

function huella_(s) {
  return Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, s, Utilities.Charset.UTF_8));
}

function soloPlanificacion_(acc) {
  if (!acc.plan) throw new Error('Solo la planificación de Perseida puede hacer esta operación.');
}

function noSoloLectura_(acc) {
  if (acc.ver) throw new Error('Usuario de solo consulta: no puede reservar ni modificar fechas.');
}

/* ---------- Operaciones ---------- */

function listar_(acc) {
  const hoy = hoy_();
  const todo = acc.plan || acc.ver; // planificación y consulta ven todas las reservas
  const desde = todo ? sumarDias_(hoy, -CONFIG.DIAS_HISTORICO_PLANIFICACION) : hoy;
  return leerFechas_()
    // Un cliente solo ve las fechas libres y las suyas: las reservadas por otro cliente no le aparecen.
    .filter(f => f.fecha >= desde && (todo || !f.cliente || f.cliente === acc.usuario))
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.hora.localeCompare(b.hora))
    .map(f => {
      const v = { id: f.id, fecha: f.fecha, hora: f.hora, estado: !f.cliente ? 'libre' : (f.cliente === acc.usuario ? 'mia' : 'ocupada') };
      if (f.cliente) Object.assign(v, { cliente: f.cliente, palets: f.palets, reservadoEl: f.reservadoEl });
      return v;
    });
}

function reservar_(acc, req) {
  noSoloLectura_(acc);
  if (acc.plan) {
    throw new Error('Para asignar una fecha a un cliente, escribe su nombre en la columna «Cliente» de la hoja «Fechas».');
  }
  const hoy = hoy_();
  const filas = leerFechas_();
  const f = filas.find(x => x.id === String(req.id));
  if (f && f.cliente === acc.usuario) throw conflicto_('Ya tienes reservada esta fecha.');
  if (!f || f.cliente) throw conflicto_('Lo sentimos: esta fecha y hora ya no está disponible. Elige otra, por favor.');
  if (f.fecha < hoy) throw new Error('No se puede reservar una fecha pasada.');

  const max = CONFIG.MAX_RESERVAS_ACTIVAS_POR_CLIENTE;
  if (max > 0 && filas.filter(x => x.cliente === acc.usuario && x.fecha >= hoy).length >= max) {
    throw new Error(`Has alcanzado el máximo de ${max} reserva(s) activa(s).`);
  }
  const palets = Number(req.palets);
  const maxPal = CONFIG.MAX_PALETS_POR_RESERVA || 999;
  if (!Number.isInteger(palets) || palets < 1 || palets > maxPal) {
    throw new Error(`Indica un nº de palets entero entre 1 y ${maxPal}.`);
  }

  hoja_(HOJA.FECHAS).getRange(f.fila, C.CLIENTE + 1, 1, 3).setValues([[acc.usuario, palets, new Date()]]);
  registrar_(acc.usuario, 'RESERVA', f, pal_(palets));

  return {
    mensaje: `Reserva confirmada a nombre de ${acc.usuario}: ${fechaLarga_(f.fecha)}${f.hora ? ' · ' + f.hora : ''} · ${pal_(palets)}.`,
    aviso: { tipo: 'reserva', por: acc.usuario, cliente: acc.usuario, fecha: f.fecha, hora: f.hora, palets },
  };
}

function anular_(acc, req) {
  noSoloLectura_(acc);
  const f = leerFechas_().find(x => x.id === String(req.id));
  if (!f || !f.cliente || (!acc.plan && f.cliente !== acc.usuario)) throw conflicto_('Esta reserva ya no existe.');
  if (!acc.plan) {
    if (!CONFIG.PERMITIR_ANULAR_CLIENTE) throw new Error('Para anular una reserva contacta con la planificación de Perseida.');
    if (f.fecha < hoy_()) throw new Error('No se puede anular una reserva pasada.');
  }

  hoja_(HOJA.FECHAS).getRange(f.fila, C.CLIENTE + 1, 1, 3).clearContent();
  registrar_(acc.usuario, 'ANULACIÓN', f, `Reserva de ${f.cliente} (${pal_(f.palets)})`);

  return {
    mensaje: acc.plan ? `Fecha liberada (estaba reservada por ${f.cliente}).` : 'Reserva anulada. La fecha vuelve a estar libre.',
    aviso: CONFIG.AVISAR_ANULACIONES
      ? { tipo: 'anulacion', por: acc.plan ? 'Planificación Perseida' : acc.usuario, cliente: f.cliente, fecha: f.fecha, hora: f.hora, palets: f.palets }
      : null,
  };
}

function altaFechas_(acc, lista) {
  if (!Array.isArray(lista) || !lista.length) throw new Error('No hay fechas que añadir.');
  if (lista.length > 500) throw new Error('Demasiadas fechas de una vez (máximo 500).');
  const tz = tz_();
  const hoy = hoy_();
  const existentes = new Set(leerFechas_().map(f => f.fecha + '|' + f.hora.toLowerCase()));
  const nuevas = [];
  let repetidas = 0;

  lista.forEach(x => {
    const fecha = String((x && x.fecha) || '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || sumarDias_(fecha, 0) !== fecha) throw new Error('Fecha no válida: ' + fecha);
    if (fecha < hoy) throw new Error('No se pueden añadir fechas pasadas: ' + fecha);
    const hora = texto_(x.hora, 40);
    const clave = fecha + '|' + hora.toLowerCase();
    if (existentes.has(clave)) { repetidas++; return; }
    existentes.add(clave);
    nuevas.push([nuevoId_(), Utilities.parseDate(fecha, tz, 'yyyy-MM-dd'), celda_(hora), '', '', '']);
  });

  if (nuevas.length) {
    const sh = hoja_(HOJA.FECHAS);
    sh.getRange(sh.getLastRow() + 1, 1, nuevas.length, COLS.length).setValues(nuevas);
    registrar_(acc.usuario, 'ALTA', null, nuevas.length + ' fecha(s)');
  }
  return `${nuevas.length} fecha(s) añadida(s)` + (repetidas ? `; ${repetidas} ya existían y se han omitido.` : '.');
}

function eliminarFecha_(acc, id) {
  const f = leerFechas_().find(x => x.id === String(id));
  if (!f) throw conflicto_('La fecha ya no existe.');
  if (f.cliente) throw new Error(`La fecha está reservada por ${f.cliente}. Libérala antes de eliminarla.`);
  hoja_(HOJA.FECHAS).deleteRow(f.fila);
  registrar_(acc.usuario, 'BAJA', f, '');
  return 'Fecha eliminada.';
}

/* ---------- Correo ---------- */

function enviarAviso_(a) {
  if (!CONFIG.NOTIFICAR_A) return null;
  const esReserva = a.tipo === 'reserva';
  const titulo = esReserva ? 'Nueva reserva de fecha de carga' : 'Reserva de fecha de carga ANULADA';
  const asunto = `${titulo} · ${a.cliente} · ${fechaCorta_(a.fecha)}${a.hora ? ' ' + a.hora : ''} · ${pal_(a.palets)}`;
  const filas = [
    ['Cliente', a.cliente],
    ['Fecha de carga', fechaLarga_(a.fecha)],
    ['Hora', a.hora],
    ['Nº de palets', a.palets],
    [esReserva ? 'Reservado el' : 'Anulado el', Utilities.formatDate(new Date(), tz_(), 'dd/MM/yyyy HH:mm')],
  ];
  if (!esReserva) filas.push(['Anulado por', a.por]);

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

  try {
    MailApp.sendEmail({ to: CONFIG.NOTIFICAR_A, subject: asunto, body, htmlBody, name: CONFIG.REMITENTE });
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

/* Ejecutar una vez desde el editor: crea las hojas y genera las contraseñas. */
function setup() {
  const fechas = hoja_(HOJA.FECHAS, true);
  fechas.getRange(1, 1, 1, COLS.length).setValues([COLS]);
  cabecera_(fechas, COLS.length);
  fechas.getRange('B2:B').setNumberFormat('dd/mm/yyyy');
  fechas.getRange('C2:C').setNumberFormat('@');
  fechas.getRange('F2:F').setNumberFormat('dd/mm/yyyy hh:mm');
  fechas.setColumnWidth(1, 90);
  fechas.setColumnWidths(2, 5, 140);
  fechas.setConditionalFormatRules([
    SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied('=$D2<>""')
      .setBackground('#fdebd0')
      .setRanges([fechas.getRange('A2:F')])
      .build(),
  ]);

  const accesos = hoja_(HOJA.ACCESOS, true);
  accesos.getRange(1, 1, 1, 3).setValues([['Usuario', 'Contraseña', 'Perfil']]);
  accesos.getRange('B2:B').setNumberFormat('@'); // texto: conserva las contraseñas tal cual se escriben
  const existentes = accesos.getLastRow() > 1
    ? accesos.getRange(2, 1, accesos.getLastRow() - 1, 1).getDisplayValues().map(([u]) => u.trim().toUpperCase())
    : [];
  const nuevos = USUARIOS_INICIALES.filter(([u]) => !existentes.includes(u))
    .map(([u, perfil]) => [u, CONTRASENAS_INICIALES[u] || '', perfil]);
  if (nuevos.length) accesos.getRange(accesos.getLastRow() + 1, 1, nuevos.length, 3).setValues(nuevos);
  cabecera_(accesos, 3);
  accesos.setColumnWidths(1, 3, 180);

  const registro = hoja_(HOJA.REGISTRO, true);
  if (registro.getLastRow() < 1) {
    registro.appendRow(['Fecha/hora', 'Usuario', 'Acción', 'ID', 'Fecha de carga', 'Hora', 'Detalle']);
  }
  cabecera_(registro, 7);

  Logger.log('Hojas preparadas. Usuarios de la hoja «Accesos»:');
  accesos.getRange(2, 1, accesos.getLastRow() - 1, 3).getDisplayValues()
    .forEach(([u, p, perfil]) => Logger.log(`  ${u} (${perfil}): ${p ? 'con contraseña' : 'SIN CONTRASEÑA — escríbela en la hoja'}`));
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
      hora: t[C.HORA],
      cliente: t[C.CLIENTE].toUpperCase(),
      palets: t[C.PALETS],
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
  hoja_(HOJA.REGISTRO).appendRow([new Date(), celda_(usuario), accion,
    f ? f.id || '' : '', f ? f.fecha : '', f ? celda_(f.hora || '') : '', celda_(String(detalle || ''))]);
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

/* Evita que un texto se interprete como fórmula en la hoja. */
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

function pal_(n) { return `${n} palet${Number(n) === 1 ? '' : 's'}`; }

function nuevoId_() { return Utilities.getUuid().replace(/-/g, '').slice(0, 8); }
