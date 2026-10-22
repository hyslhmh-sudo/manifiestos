/**
 * DESVÍOS EN GESTIÓN DE RESIDUOS · HMH — versión 0
 * Servicio de Higiene y Seguridad Laboral · HZT / HMH
 *
 * Archivo: Codigo.gs (respaldo y recepción de cargas)
 * Va pegado en: Extensiones > Apps Script de la planilla
 *               «DESVÍOS RESIDUOS HMH · Registro (v0)».
 *
 * Qué hace:
 *  - Recibe cada carga desde la página de GitHub (o desde la planilla).
 *  - Guarda las fotos en Drive (FOTOS / año-mes).
 *  - Agrega la fila en REGISTROS.
 *  - Manda un aviso inmediato a la secretaría HyS.
 *  - Entrega al portal la lista de registros (con clave de lectura).
 *
 * Todo lo que se puede cambiar está en la hoja CONFIG
 * (correo de aviso, horarios de turnos, carpeta de fotos, clave).
 */

// ---------------------------------------------------------------
// 1. Datos básicos
// ---------------------------------------------------------------

var HOJA_REG = 'REGISTROS';
var HOJA_OPE = 'OPERARIOS';
var HOJA_PUN = 'PUNTOS';
var HOJA_TIP = 'TIPOS_DESVIO';
var HOJA_CAU = 'CAUSAS';
var HOJA_CFG = 'CONFIG';
var ZONA = 'America/Argentina/Buenos_Aires';

// Orden de columnas de REGISTROS (no cambiar el orden en la hoja)
var COLS = ['ID', 'FECHA_CARGA', 'FECHA_OBSERVACION', 'HORA', 'TURNO', 'ESTABLECIMIENTO',
  'INFORMANTE', 'OPERARIO_COD', 'OPERARIO', 'PUNTO_COD', 'PISO', 'SERVICIO', 'UBICACION',
  'DETALLE_UBICACION', 'TIPO_RESIDUO', 'MEZCLA', 'TIPOS_DESVIO', 'DESCRIPCION',
  'GRAVEDAD_INFORMANTE', 'LESION', 'DETALLE_LESION', 'FOTOS', 'ORIGEN_SUGERIDO',
  'ORIGEN_HYS', 'GRAVEDAD_HYS', 'ACCION_INDIVIDUAL', 'OBS_HYS', 'REVISADO_POR',
  'FECHA_REVISION', 'AVISO_ENVIADO', 'FUENTE', 'OBS_INFORMANTE', 'REVISAR_UBICACION',
  'REITERADO', 'CAUSA', 'CONTENEDORES', 'AISLAMIENTO'];

// Causas (hoja CAUSAS). Si la hoja falta, se usan estas.
var CAUSAS_BASE = [
  ['No había lugar: todos los contenedores estaban llenos', 'Faltan contenedores (capacidad del punto)'],
  ['Había lugar en otro contenedor y no lo usaron', 'Disposición en el servicio'],
  ['Contenedor roto, sin tapa o sin bolsa', 'Estado o reposición del contenedor'],
  ['Hacía mucho que no se retiraba', 'Frecuencia de retiro interno'],
  ['No sé', 'Revisar (HyS)']
];
function causas_() {
  var h = ss_().getSheetByName(HOJA_CAU);
  if (!h || h.getLastRow() < 2) return CAUSAS_BASE.map(function (c) { return { causa: c[0], origen: c[1] }; });
  return tabla_(HOJA_CAU).filter(function (c) { return c.ACTIVO !== 'No'; })
    .map(function (c) { return { causa: String(c.CAUSA).trim(), origen: String(c.ORIGEN_SUGERIDO || '').trim() }; });
}

function ss_() { return SpreadsheetApp.getActiveSpreadsheet(); }

function config_() {
  var v = ss_().getSheetByName(HOJA_CFG).getDataRange().getValues();
  var c = {};
  for (var i = 1; i < v.length; i++) {
    if (v[i][0]) c[String(v[i][0]).trim()] = String(v[i][1]).trim();
  }
  return c;
}

function tabla_(nombre) {
  var v = ss_().getSheetByName(nombre).getDataRange().getValues();
  var enc = v.shift();
  return v.filter(function (f) { return f[0] !== ''; }).map(function (f) {
    var o = {};
    enc.forEach(function (h, i) { o[String(h).trim()] = f[i]; });
    return o;
  });
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ---------------------------------------------------------------
// 2. Entrada web (GitHub y portal)
// ---------------------------------------------------------------

/** GET: listas para la página de carga, o la página de carga de respaldo (?p=carga, sin GitHub). */
function doGet(e) {
  var p = (e && e.parameter) || {};
  try {
    if (p.p === 'carga') {
      return HtmlService.createHtmlOutputFromFile('Carga').setTitle('Desvíos en residuos · HMH')
        .addMetaTag('viewport', 'width=device-width, initial-scale=1')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    }
    return json_(listas_());
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

/** POST: una carga nueva, o la lectura para «Mi establecimiento» / portal (con DNI y clave). */
function doPost(e) {
  try {
    var d = JSON.parse(e.postData.contents);
    if (d.accion === 'cargar') return json_(guardarCarga_(d));
    if (d.accion === 'registros') return json_(registros_(d));
    return json_({ ok: false, error: 'Acción desconocida' });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

/** Respaldo de la página de carga (desde Google) si se llama con google.script.run. */
function cargarDesdeRespaldo(d) { return guardarCarga_(d); }
function listasDesdeRespaldo() { return listas_(); }

/** Listas que necesita la página de carga (sin DNI). */
function listas_() {
  var ope = tabla_(HOJA_OPE).filter(function (o) { return o.ACTIVO === 'Sí'; })
    .map(function (o) {
      return { cod: o.COD, nombre: o.NOMBRE + ' ' + o.APELLIDO, empresa: o.EMPRESA, turno: o.TURNO_HABITUAL };
    });
  var pun = tabla_(HOJA_PUN).filter(function (x) { return x.ACTIVO === 'Sí'; })
    .map(function (x) {
      return { cod: x.COD, piso: x.PISO, servicio: x.SERVICIO, ubicacion: x.UBICACION };
    });
  var tip = tabla_(HOJA_TIP).map(function (t) {
    return { tipo: t.TIPO, urgente: t.URGENTE === 'Sí', causa: t.PREGUNTA_CAUSA === 'Sí', aisl: t.AVISO_AISLAMIENTO === 'Sí' };
  });
  var cfg = config_();
  return { ok: true, operarios: ope, puntos: pun, tipos: tip, causas: causas_().map(function (c) { return c.causa; }),
    establecimiento: cfg.ESTABLECIMIENTO, version: cfg.VERSION };
}

// ---------------------------------------------------------------
// 3. Guardar una carga
// ---------------------------------------------------------------

function guardarCarga_(d) {
  var cfg = config_();

  // 3.1 Identificación del operario (nombre + últimos 3 dígitos del DNI)
  var ope = tabla_(HOJA_OPE).filter(function (o) { return o.COD === d.operario; })[0];
  if (!ope || ope.ACTIVO !== 'Sí') return { ok: false, error: 'Operario no habilitado.' };
  var dni = String(ope.DNI || '');
  if (ope.EMPRESA !== 'HySL') {
    if (!d.dni3 || dni.slice(-3) !== String(d.dni3).trim()) {
      return { ok: false, error: 'Los 3 números del DNI no coinciden. Revisá y volvé a intentar.' };
    }
  }

  // 3.2 Punto del recorrido
  var pun = tabla_(HOJA_PUN).filter(function (x) { return x.COD === d.punto; })[0];
  if (!pun) return { ok: false, error: 'Punto del recorrido no encontrado.' };

  // 3.3 Fecha, hora y turno
  var ahora = new Date();
  var hora = Utilities.formatDate(ahora, ZONA, 'HH:mm');
  var turno = turno_(hora, cfg);

  // 3.4 Fotos a Drive
  var links = [];
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var hoja = ss_().getSheetByName(HOJA_REG);
    asegurarEncabezado_(hoja);
    var id = nuevoId_(hoja);
    (d.fotos || []).forEach(function (f, i) {
      links.push(guardarFoto_(f, id, i + 1, cfg));
    });

    // 3.5 Urgencia y reiteración
    var tipos = (d.tipos || []);
    var urgTipos = tabla_(HOJA_TIP).filter(function (t) { return t.URGENTE === 'Sí'; })
      .map(function (t) { return t.TIPO; });
    var lesion = d.lesion === 'Sí';
    var urgente = lesion || tipos.some(function (t) { return urgTipos.indexOf(t) >= 0; });
    var reiterado = contarReiterados_(hoja, d.punto, tipos, Number(cfg.DIAS_REITERADO || 30));

    // 3.6 Causa (solo en los desvíos que la preguntan, p. ej. contenedor lleno o residuo fuera de contenedor)
    var causa = String(d.causa || '').trim();
    var cau = causas_().filter(function (c) { return c.causa === causa; })[0];
    var origen = cau && cau.origen && cau.origen !== 'Revisar (HyS)' ? cau.origen : (pun.TRAMO_SUGERIDO || 'Revisar (HyS)');
    var nT = parseInt(d.contTotal, 10), nL = parseInt(d.contLlenos, 10);
    var contenedores = !isNaN(nT) && nT > 0 ? (!isNaN(nL) ? nL + ' de ' + nT + ' llenos' : nT + ' en el lugar') : (!isNaN(nL) ? nL + ' llenos' : '');

    var fila = {
      ID: id,
      FECHA_CARGA: ahora,
      FECHA_OBSERVACION: Utilities.formatDate(ahora, ZONA, 'dd/MM/yyyy'),
      HORA: hora,
      TURNO: turno,
      ESTABLECIMIENTO: cfg.ESTABLECIMIENTO || 's/d',
      INFORMANTE: ope.EMPRESA === 'HySL' ? 'HyS' : ope.EMPRESA,
      OPERARIO_COD: ope.COD,
      OPERARIO: ope.NOMBRE + ' ' + ope.APELLIDO,
      PUNTO_COD: pun.COD,
      PISO: pun.PISO,
      SERVICIO: pun.SERVICIO,
      UBICACION: pun.UBICACION,
      DETALLE_UBICACION: d.detalle || 's/d',
      TIPO_RESIDUO: (d.residuos || []).join('; ') || 's/d',
      MEZCLA: d.mezcla || 's/d',
      TIPOS_DESVIO: tipos.join('; ') || 's/d',
      DESCRIPCION: d.descripcion || 's/d',
      GRAVEDAD_INFORMANTE: d.gravedad || 's/d',
      LESION: lesion ? 'Sí' : 'No',
      DETALLE_LESION: lesion ? (d.detalleLesion || 's/d') : '',
      FOTOS: links.length ? links.join(', ') : 'Sin foto',
      ORIGEN_SUGERIDO: origen,
      AVISO_ENVIADO: 'Pendiente',
      FUENTE: d.fuente || 'Página de carga',
      OBS_INFORMANTE: d.observaciones || '',
      REVISAR_UBICACION: pun.COD === 'OT-99' ? 'Sí' : 'No',
      REITERADO: reiterado > 0 ? 'Sí (' + reiterado + ' en ' + (cfg.DIAS_REITERADO || 30) + ' días)' : 'No',
      CAUSA: causa,
      CONTENEDORES: contenedores,
      AISLAMIENTO: String(d.aislamiento || '').trim()
    };
    hoja.appendRow(COLS.map(function (c) { return fila[c] !== undefined ? fila[c] : ''; }));
    var nFila = hoja.getLastRow();
  } finally {
    lock.releaseLock();
  }

  // 3.6 Aviso inmediato a la secretaría
  var estado = enviarAviso_(fila, urgente, cfg);
  hoja.getRange(nFila, COLS.indexOf('AVISO_ENVIADO') + 1).setValue(estado);

  return { ok: true, id: id, urgente: urgente };
}

function turno_(hhmm, cfg) {
  var m = aMin_(hhmm);
  var r = [['Mañana', cfg.TURNO_MANANA], ['Tarde', cfg.TURNO_TARDE], ['Noche', cfg.TURNO_NOCHE]];
  for (var i = 0; i < r.length; i++) {
    var par = String(r[i][1] || '').split('-');
    if (par.length !== 2) continue;
    var a = aMin_(par[0]), b = aMin_(par[1]);
    if (a < b ? (m >= a && m < b) : (m >= a || m < b)) return r[i][0];
  }
  return 's/d';
}
function aMin_(t) { var p = String(t).trim().split(':'); return Number(p[0]) * 60 + Number(p[1] || 0); }

function asegurarEncabezado_(hoja) {
  var enc = hoja.getRange(1, 1, 1, COLS.length).getValues()[0];
  if (enc[COLS.length - 1] !== COLS[COLS.length - 1]) {
    hoja.getRange(1, 1, 1, COLS.length).setValues([COLS]);
  }
}

function nuevoId_(hoja) {
  var n = hoja.getLastRow();
  var max = 0;
  if (n > 1) {
    hoja.getRange(2, 1, n - 1, 1).getValues().forEach(function (f) {
      var k = Number(String(f[0]).replace('DR-', ''));
      if (k > max) max = k;
    });
  }
  return 'DR-' + ('0000' + (max + 1)).slice(-4);
}

function contarReiterados_(hoja, punto, tipos, dias) {
  var n = hoja.getLastRow();
  if (n < 2 || !tipos.length) return 0;
  var v = hoja.getRange(2, 1, n - 1, COLS.length).getValues();
  var iP = COLS.indexOf('PUNTO_COD'), iT = COLS.indexOf('TIPOS_DESVIO'), iF = COLS.indexOf('FECHA_CARGA');
  var limite = new Date().getTime() - dias * 86400000;
  return v.filter(function (f) {
    var fecha = f[iF] instanceof Date ? f[iF].getTime() : 0;
    return f[iP] === punto && fecha >= limite &&
      tipos.some(function (t) { return String(f[iT]).indexOf(t) >= 0; });
  }).length;
}

function guardarFoto_(f, id, n, cfg) {
  var raiz = DriveApp.getFolderById(cfg.CARPETA_FOTOS_ID);
  var mes = Utilities.formatDate(new Date(), ZONA, 'yyyy-MM');
  var it = raiz.getFoldersByName(mes);
  var carpeta = it.hasNext() ? it.next() : raiz.createFolder(mes);
  var datos = String(f.base64 || '').replace(/^data:[^,]+,/, '');
  var blob = Utilities.newBlob(Utilities.base64Decode(datos), f.tipo || 'image/jpeg',
    id + '_' + n + '.jpg');
  return carpeta.createFile(blob).getUrl();
}

// ---------------------------------------------------------------
// 4. Aviso por correo a la secretaría HyS
// ---------------------------------------------------------------

function enviarAviso_(f, urgente, cfg) {
  var para = cfg.CORREO_AVISO;
  if (!para || para === 's/d') return 'Sin correo configurado';
  var asunto = (urgente ? 'URGENTE · ' : '') + 'Desvío en residuos ' + f.ID + ' · ' +
    f.SERVICIO + ' · ' + f.HORA + ' h';
  var filas = [
    ['Fecha y hora', f.FECHA_OBSERVACION + ' · ' + f.HORA + ' h (' + f.TURNO + ')'],
    ['Operario', f.OPERARIO + ' (' + f.INFORMANTE + ')'],
    ['Lugar', f.PISO + ' · ' + f.SERVICIO + ' · ' + f.UBICACION],
    ['Detalle del lugar', f.DETALLE_UBICACION],
    ['Tipo de residuo', f.TIPO_RESIDUO],
    ['Desvío', f.TIPOS_DESVIO],
    ['¿Por qué?', f.CAUSA || ''],
    ['Contenedores', f.CONTENEDORES || ''],
    ['¿Venía de un aislamiento?', f.AISLAMIENTO || ''],
    ['Descripción', f.DESCRIPCION],
    ['Gravedad (operario)', f.GRAVEDAD_INFORMANTE],
    ['Lesión', f.LESION + (f.DETALLE_LESION ? ' · ' + f.DETALLE_LESION : '')],
    ['Reiterado', f.REITERADO],
    ['Origen sugerido', f.ORIGEN_SUGERIDO],
    ['Fotos', f.FOTOS]
  ];
  filas = filas.filter(function (r) { return ['¿Por qué?', 'Contenedores', '¿Venía de un aislamiento?'].indexOf(r[0]) < 0 || r[1]; });
  var html = '<div style="font-family:Arial,sans-serif;font-size:14px;color:#222">' +
    (urgente ? '<p style="color:#b00020;font-weight:bold">Requiere atención prioritaria (cortopunzante o lesión).</p>' : '') +
    '<p>Se registró un desvío en el recorrido de retiro de residuos.</p><table style="border-collapse:collapse">' +
    filas.map(function (r) {
      var val = String(r[1] || '');
      if (r[0] === 'Fotos' && val.indexOf('http') === 0) {
        val = val.split(', ').map(function (u, i) { return '<a href="' + u + '">Foto ' + (i + 1) + '</a>'; }).join(' · ');
      }
      return '<tr><td style="padding:4px 10px 4px 0;font-weight:bold;vertical-align:top">' + r[0] +
        '</td><td style="padding:4px 0">' + val + '</td></tr>';
    }).join('') +
    '</table><p style="color:#666;font-size:12px">Registro ' + f.ID +
    ' · Servicio de Higiene y Seguridad Laboral · HZT / HMH</p></div>';
  var texto = filas.map(function (r) { return r[0] + ': ' + r[1]; }).join('\n');
  var opciones = { htmlBody: html, name: 'Higiene y Seguridad Laboral · HMH' };
  if (cfg.REMITENTE && cfg.REMITENTE !== 's/d') opciones.from = cfg.REMITENTE;
  try {
    GmailApp.sendEmail(para, asunto, texto, opciones);
    return 'Sí · ' + Utilities.formatDate(new Date(), ZONA, 'dd/MM HH:mm');
  } catch (err) {
    try {
      delete opciones.from;               // si el remitente no está habilitado
      GmailApp.sendEmail(para, asunto, texto, opciones);
      return 'Sí (sin remitente HyS)';
    } catch (err2) {
      return 'Error: ' + String(err2).slice(0, 80);
    }
  }
}

// ---------------------------------------------------------------
// 5. Lectura para el portal (Melani / HyS)
// ---------------------------------------------------------------

/**
 * Lectura para «Mi establecimiento» (Melani) y el portal de HyS.
 * Se entra con la MISMA clave del Sistema HyS (DNI + clave personal, o la clave de Higiene y Seguridad):
 * esta función le pregunta al Sistema HyS (CONFIG › URL_SISTEMA) si la clave es válida para el
 * establecimiento. La respuesta queda guardada 6 horas para no consultar en cada vista.
 */
function accesoValido_(est, dni, clave, cfg) {
  if (!clave) return false;
  if (cfg.CLAVE_LECTURA && cfg.CLAVE_LECTURA !== 's/d' && clave === cfg.CLAVE_LECTURA) return true;
  var ests = String(cfg.EST_LECTURA || 'HMH,HZT').split(',').map(function (s) { return s.trim(); });
  if (ests.indexOf(est) < 0) return false;
  var url = cfg.URL_SISTEMA;
  if (!url || url === 's/d') return false;
  var huella = Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,
    est + '|' + (dni || '') + '|' + String(clave).toLowerCase()));
  var cache = CacheService.getScriptCache();
  if (cache.get('acc_' + huella) === 'ok') return true;
  var r = UrlFetchApp.fetch(url, { method: 'post', contentType: 'text/plain', muteHttpExceptions: true,
    payload: JSON.stringify({ accion: 'm_tablero', est: est, dni: dni || '', clave: clave }) });
  var j = {};
  try { j = JSON.parse(r.getContentText()); } catch (e) { return false; }
  var ok = j && j.ok !== false;
  if (ok) cache.put('acc_' + huella, 'ok', 21600);
  return ok;
}

function registros_(d) {
  var cfg = config_();
  if (!accesoValido_(String(d.est || ''), String(d.dni || ''), String(d.clave || ''), cfg)) {
    return { ok: false, error: 'clave', mensaje: 'No se pudo comprobar tu acceso. Volvé a ingresar con tu DNI y tu clave.' };
  }
  var desde = d.desde;
  var hoja = ss_().getSheetByName(HOJA_REG);
  var v = hoja.getDataRange().getValues();
  var enc = v.shift();
  var lim = desde ? new Date(desde).getTime() : 0;
  var out = v.filter(function (f) { return f[0]; }).map(function (f) {
    var o = {};
    enc.forEach(function (h, i) {
      var x = f[i];
      o[h] = x instanceof Date ? Utilities.formatDate(x, ZONA, 'yyyy-MM-dd HH:mm') : x;
    });
    return o;
  }).filter(function (o) {
    return !lim || new Date(String(o.FECHA_CARGA).replace(' ', 'T')).getTime() >= lim;
  });
  // Lo que no hace falta mostrar en la pantalla de consulta (DNI nunca se manda)
  out.forEach(function (o) { delete o.OPERARIO_COD; });
  return { ok: true, registros: out, resumen: resumen_(out), actualizado: Utilities.formatDate(new Date(), ZONA, 'dd/MM/yyyy HH:mm') };
}

/** Conteos para el tablero: por punto, por tipo de desvío, por mes y últimos 30 días. */
function resumen_(L) {
  var porPunto = {}, porTipo = {}, porMes = {}, porCausa = {}, ult30 = 0, urg = 0, lesion = 0, sinRevisar = 0, faltan = 0, aislInf = 0;
  var lim = new Date().getTime() - 30 * 86400000;
  L.forEach(function (o) {
    var k = o.PUNTO_COD + ' · ' + o.SERVICIO + ' · ' + o.UBICACION;
    porPunto[k] = (porPunto[k] || 0) + 1;
    String(o.TIPOS_DESVIO || '').split(';').map(function (s) { return s.trim(); }).filter(String)
      .forEach(function (t) { porTipo[t] = (porTipo[t] || 0) + 1; });
    var mes = String(o.FECHA_CARGA).slice(0, 7);
    porMes[mes] = (porMes[mes] || 0) + 1;
    var t = new Date(String(o.FECHA_CARGA).replace(' ', 'T')).getTime();
    if (t >= lim) ult30++;
    if (o.LESION === 'Sí') lesion++;
    if (/cortopunzante/i.test(o.TIPOS_DESVIO) || o.LESION === 'Sí') urg++;
    if (!o.ORIGEN_HYS) sinRevisar++;
    if (/infectocontagiosa/i.test(o.AISLAMIENTO || '')) aislInf++;
    if (o.CAUSA) { porCausa[o.CAUSA] = (porCausa[o.CAUSA] || 0) + 1; if (/^No había lugar/.test(o.CAUSA)) faltan++; }
  });
  var orden = function (m) { return Object.keys(m).map(function (k) { return { k: k, n: m[k] }; }).sort(function (a, b) { return b.n - a.n; }); };
  return { total: L.length, ultimos30: ult30, cortopunzantesOLesion: urg, lesiones: lesion, sinRevisarHyS: sinRevisar, faltanContenedores: faltan, deAislamientoInfecto: aislInf,
    porPunto: orden(porPunto), porCausa: orden(porCausa), porTipo: orden(porTipo), porMes: Object.keys(porMes).sort().map(function (k) { return { k: k, n: porMes[k] }; }) };
}

// ---------------------------------------------------------------
// 6. Menú de la planilla (Ayuda incluida)
// ---------------------------------------------------------------

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Desvíos HyS')
    .addItem('Ayuda para operarios y secretaría', 'ayudaUsuarios')
    .addItem('Ayuda para administración (HyS)', 'ayudaAdmin')
    .addSeparator()
    .addItem('Probar el aviso por correo', 'probarAviso')
    .addItem('Recalcular «Reiterado» en todos los registros', 'recalcularReiterados')
    .addToUi();
}

function ayudaUsuarios() {
  SpreadsheetApp.getUi().alert('Ayuda · Registro de desvíos',
    '• Cada fila de REGISTROS es un hallazgo del recorrido.\n' +
    '• La carga normal se hace desde la página en el celular.\n' +
    '• Si la página no funciona, se puede escribir una fila nueva a mano en REGISTROS ' +
    '(completar al menos fecha, operario, punto, desvío y descripción).\n' +
    '• Cuando falte un dato, escribir «s/d».\n' +
    '• En «Contenedor lleno» y «Residuo fuera de contenedor» el operario dice POR QUÉ pasó (columna CAUSA): ' +
    'si no había lugar en ningún contenedor, el problema es la falta de contenedores, no la práctica.\n' +
    '• En «Segregación incorrecta» y «Bolsa incorrecta» la página recuerda que todo lo que sale de un aislamiento por enfermedad infectocontagiosa, ' +
    'incluida la comida, es biopatogénico (bolsa roja), y pregunta si venía de un aislamiento (columna AISLAMIENTO). En el aislamiento inverso o protector se separa como siempre.\n' +
    '• Cada carga manda un aviso al correo de la secretaría HyS.',
    SpreadsheetApp.getUi().ButtonSet.OK);
}

function ayudaAdmin() {
  SpreadsheetApp.getUi().alert('Ayuda · Administración',
    '• OPERARIOS: alta = fila nueva con código OP-xx; baja = ACTIVO «No".\n' +
    '• PUNTOS: agregar filas con código nuevo; no cambiar códigos ya usados.\n' +
    '• TIPOS_DESVIO: la columna URGENTE «Sí» marca el aviso como URGENTE.\n' +
    '• TIPOS_DESVIO: la columna PREGUNTA_CAUSA «Sí» hace que la página pregunte por qué pasó (p. ej. contenedor lleno).\n' +
    '• TIPOS_DESVIO: la columna AVISO_AISLAMIENTO «Sí» muestra el aviso de aislamiento y la pregunta «¿Venía de una habitación con aislamiento?».\n' +
    '• CAUSAS: las respuestas posibles y el origen que sugiere cada una (se pueden agregar o desactivar con ACTIVO «No»).\n' +
    '• CONFIG: correo de aviso, remitente, horarios de turno, clave del portal.\n' +
    '• Columnas grises de REGISTROS (ORIGEN_HYS a FECHA_REVISION): revisión de HyS.\n' +
    '• Si se cambia el código, volver a implementar la aplicación web (Implementar > Administrar implementaciones > Editar > Versión nueva).',
    SpreadsheetApp.getUi().ButtonSet.OK);
}

function probarAviso() {
  var cfg = config_();
  var f = { ID: 'PRUEBA', FECHA_OBSERVACION: Utilities.formatDate(new Date(), ZONA, 'dd/MM/yyyy'),
    HORA: Utilities.formatDate(new Date(), ZONA, 'HH:mm'), TURNO: 'Prueba', OPERARIO: 'Prueba del sistema',
    INFORMANTE: 'HyS', PISO: '-', SERVICIO: 'Prueba', UBICACION: '-', DETALLE_UBICACION: '-',
    TIPO_RESIDUO: '-', TIPOS_DESVIO: '-', DESCRIPCION: 'Mensaje de prueba del registro de desvíos.',
    GRAVEDAD_INFORMANTE: '-', LESION: 'No', DETALLE_LESION: '', REITERADO: '-', ORIGEN_SUGERIDO: '-', FOTOS: 'Sin foto' };
  var r = enviarAviso_(f, false, cfg);
  SpreadsheetApp.getUi().alert('Resultado del envío de prueba: ' + r);
}

function recalcularReiterados() {
  var cfg = config_();
  var dias = Number(cfg.DIAS_REITERADO || 30);
  var hoja = ss_().getSheetByName(HOJA_REG);
  asegurarEncabezado_(hoja);
  var n = hoja.getLastRow();
  if (n < 2) return;
  var v = hoja.getRange(2, 1, n - 1, COLS.length).getValues();
  var iP = COLS.indexOf('PUNTO_COD'), iT = COLS.indexOf('TIPOS_DESVIO'), iF = COLS.indexOf('FECHA_CARGA');
  var out = v.map(function (f, i) {
    var t0 = f[iF] instanceof Date ? f[iF].getTime() : 0;
    var tipos = String(f[iT]).split(';').map(function (s) { return s.trim(); }).filter(String);
    var c = v.slice(0, i).filter(function (g) {
      var t = g[iF] instanceof Date ? g[iF].getTime() : 0;
      return g[iP] === f[iP] && t0 - t <= dias * 86400000 && t <= t0 &&
        tipos.some(function (x) { return String(g[iT]).indexOf(x) >= 0; });
    }).length;
    return [c > 0 ? 'Sí (' + c + ' en ' + dias + ' días)' : 'No'];
  });
  hoja.getRange(2, COLS.indexOf('REITERADO') + 1, out.length, 1).setValues(out);
  SpreadsheetApp.getUi().alert('Listo: se recalculó la columna REITERADO.');
}


/** Ejecutar una vez desde el editor para autorizar la conexión con el Sistema HyS (comprobación de claves). */
function autorizarConexionSistema() {
  var cfg = config_();
  var r = UrlFetchApp.fetch(cfg.URL_SISTEMA, { muteHttpExceptions: true });
  Logger.log('Sistema HyS respondió: ' + r.getResponseCode());
}


/** Copia a Drive la guía para operarios (DOCUMENTOS PARA COLABORADORES) y los carteles QR (carpeta del registro). Se ejecuta desde el editor. */
function guardarGuiaYQr() {
  var base = 'https://raw.githubusercontent.com/hyslhmh-sudo/manifiestos/b6a2fcf/desvios/impresion/';
  var guia = UrlFetchApp.fetch(base + 'Guia_registro_desvios_HMH_v0.docx').getBlob().setName('Guía · Registro de desvíos en el recorrido de residuos · HMH (v0).docx');
  var qr = UrlFetchApp.fetch(base + 'QR_puntos_recorrido_HMH_v0.pdf').getBlob().setName('QR · Puntos del recorrido de residuos · HMH (v0).pdf');
  var g = DriveApp.getFolderById('1tT3WC_Qj8yD6-xgkba2QpPQFCAxZUwCk').createFile(guia);
  var q = DriveApp.getFolderById('1dmWBDp9iL8xS76pxF0WisMbjAtQn_AzP').createFile(qr);
  Logger.log('Guía: ' + g.getUrl());
  Logger.log('QR: ' + q.getUrl());
}

/** Reemplaza la guía de operarios en DOCUMENTOS PARA COLABORADORES por la versión de GitHub (la anterior va a la papelera). */
function actualizarGuia() {
  var url = 'https://raw.githubusercontent.com/hyslhmh-sudo/manifiestos/main/desvios/impresion/Guia_registro_desvios_HMH_v0.docx';
  var nombre = 'Guía · Registro de desvíos en el recorrido de residuos · HMH (v0).docx';
  var carpeta = DriveApp.getFolderById('1tT3WC_Qj8yD6-xgkba2QpPQFCAxZUwCk');
  var nueva = carpeta.createFile(UrlFetchApp.fetch(url + '?v=' + Date.now()).getBlob().setName(nombre));
  var it = carpeta.getFilesByName(nombre);
  while (it.hasNext()) { var f = it.next(); if (f.getId() !== nueva.getId()) f.setTrashed(true); }
  Logger.log('Guía actualizada: ' + nueva.getUrl());
  return nueva.getUrl();
}
