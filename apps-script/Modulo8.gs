/**
 * MÓDULO 8 · SERVICIOS HOSPITALARIOS E INFRAESTRUCTURA
 * Sistema HyS · Servicio de Higiene y Seguridad Laboral
 * Versión 0 (2026-10-12)
 *
 * Puede ir dentro de la planilla «M8 · Servicios e Infraestructura · Catálogo y relevamiento (v0)»
 * (Extensiones › Apps Script) o en un proyecto aparte (lee la planilla por su ID). Hace tres cosas:
 *   1) Atiende al Portal HyS (pantallas del módulo 8): lee y escribe esta planilla.
 *   2) Genera los libros de relevamiento para la red e importa los libros completos.
 *   3) Agrega el menú «Módulo 8» en la planilla, para hacer todo desde Sheets si falta GitHub.
 *
 * No envía correos. No comparte archivos con nadie: los libros quedan en Drive y se comparten a mano.
 */

const VERSION_M8 = '2026-10-12 · 1.2';
const PLANILLA_M8_ID = '1YgClAXgqLHvSRzFLV9AdX5UnGvtdINX__y0QGM7DTPc';   // M8 · Catálogo y relevamiento (v0)
const LIBRO_MODELO_ID = '1zJ_7xbnemqMvkhMYrJoN6F0cWUUiA1LrJIlpx9XKeB8';   // M8 · Libro de relevamiento para la red (modelo v0)
const CARPETA_M8_ID = '1_2lcPXz9MVwHufCbsRy5KAO-IA5Q0PYW';            // MÓDULO 8 · SERVICIOS E INFRAESTRUCTURA
const CARPETA_LIBROS = 'LIBROS DE LA RED';
const TIPOS_CRITICOS = ['Guardia', 'Quirófano', 'UTI', 'UCIP', 'Neonatología'];
const H = { CAT: 'CATALOGO_ITEMS', SERV: 'SERVICIOS', REL: 'RELEVAMIENTOS', RESP: 'RESPUESTAS', HAL: 'HALLAZGOS_PLAN', IND: 'INDICADORES', PAR: 'PARAMETROS', AYU: 'AYUDA' };

// ======================================================================
// 1) Portal HyS: entrada por la web
// ======================================================================
function doGet() {
  return json_({ ok: true, modulo: 8, version: VERSION_M8 });
}

function doPost(e) {
  let pedido = {};
  try { pedido = JSON.parse(e.postData.contents || '{}'); } catch (err) { return json_({ ok: false, mensaje: 'Pedido ilegible.' }); }
  const clave = PropertiesService.getScriptProperties().getProperty('CLAVE_HYS');
  if (!clave) return json_({ ok: false, mensaje: 'Falta configurar la clave: en Apps Script, Configuración del proyecto › Propiedades de la secuencia de comandos › CLAVE_HYS (o, si el código está en la planilla, menú Módulo 8 › Configurar clave del portal).' });
  if (String(pedido.clave || '') !== clave) return json_({ ok: false, error: 'clave' });
  const d = pedido.datos || {};
  const lock = LockService.getScriptLock();
  try {
    switch (pedido.accion) {
      case 'm8_ping': return json_({ ok: true, version: VERSION_M8 });
      case 'm8_datos': return json_(datosM8_());
      case 'm8_items': return json_(itemsRelevamiento_(d.servicio, d.id));
      case 'm8_guardar': lock.waitLock(30000); return json_(guardarRelevamiento_(d));
      case 'm8_hallazgos_generar': lock.waitLock(30000); return json_(generarHallazgos_(d.id));
      case 'm8_hallazgo_guardar': lock.waitLock(30000); return json_(guardarHallazgo_(d));
      case 'm8_servicio_guardar': lock.waitLock(30000); return json_(guardarServicio_(d));
      case 'm8_libro_generar': lock.waitLock(30000); return json_(generarLibro_(d));
      case 'm8_informe': lock.waitLock(30000); return json_(generarInforme_(d.id));
      case 'm8_libro_importar': lock.waitLock(60000); return json_(importarLibro_(d.url, d.generarHallazgos !== false));
      default: return json_({ ok: false, mensaje: 'Acción desconocida: ' + pedido.accion });
    }
  } catch (err) {
    return json_({ ok: false, mensaje: 'Error del módulo 8: ' + err.message });
  } finally {
    try { lock.releaseLock(); } catch (e2) {}
  }
}

function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

// ======================================================================
// Lecturas
// ======================================================================
// Funciona igual si el código está dentro de la planilla o en un proyecto aparte
function planilla_() { let a = null; try { a = SpreadsheetApp.getActive(); } catch (e) {} return a || SpreadsheetApp.openById(PLANILLA_M8_ID); }
function hoja_(n) { return planilla_().getSheetByName(n); }
function filas_(n, cols) {
  const h = hoja_(n), u = h.getLastRow();
  return u < 2 ? [] : h.getRange(2, 1, u - 1, cols).getValues();
}
function fecha_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, 'America/Argentina/Buenos_Aires', 'yyyy-MM-dd');
  const s = String(v || '').trim(), m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  return m ? m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2) : s;
}
function catalogo_() {
  return filas_(H.CAT, 15).filter(r => r[0]).map(r => ({
    cod: r[0], capa: r[1], aplica: r[2], rubro: r[3], item: r[4], verificar: r[5], fund: r[6], rgrl: r[7],
    critico: r[8] === 'S', gravedad: Number(r[9]) || 0, modulo: r[10], propuesta: r[11], responsable: r[12], esfuerzo: r[13]
  }));
}
function servicios_() {
  return filas_(H.SERV, 10).filter(r => r[0]).map(r => ({
    id: r[0], est: r[1], edificio: r[2], servicio: r[3], tipo: r[4], directriz: r[5], criticidad: Number(r[6]) || 0, personas: r[7], jefatura: r[8], obs: r[9]
  }));
}
function itemsDeTipo_(cat, tipo) {
  if (tipo === 'Edificio') return cat.filter(i => i.capa === 'A');
  return cat.filter(i => i.aplica === tipo || (i.aplica === 'Áreas críticas (todas)' && TIPOS_CRITICOS.indexOf(tipo) >= 0));
}

function datosM8_() {
  const rel = filas_(H.REL, 10).filter(r => r[0]);
  const ind = filas_(H.IND, 12);
  const indPorId = {};
  ind.forEach(r => { if (r[0]) indPorId[r[0]] = { evaluados: r[5], pct: r[6] === '' ? null : Number(r[6]), criticosNC: r[7], actuar: r[8], rapido: r[9], planificar: r[10], semaforo: r[11] }; });
  const hal = filas_(H.HAL, 17).map((r, i) => ({ fila: i + 2, id: r[0], rel: r[1], cod: r[2], item: r[3], servicio: r[4], resp: r[5], prioridad: r[6], plazo: r[7],
    fecha: fecha_(r[8]), limite: fecha_(r[9]), desc: r[10], propuesta: r[11], responsable: r[12], esfuerzo: r[13], estado: r[14], respDir: r[15], cierre: fecha_(r[16]) })).filter(h => h.id);
  return {
    ok: true, version: VERSION_M8, actualizado: new Date().toISOString(),
    planilla: planilla_().getUrl(),
    servicios: servicios_(),
    relevamientos: rel.map(r => Object.assign({ id: r[0], fecha: fecha_(r[1]), tipo: r[2], servicio: r[3], est: r[4], nombre: r[5], relevo: r[6], acompano: r[7], obs: r[8], informe: r[9] || '' }, indPorId[r[0]] || {})),
    hallazgos: hal,
    catalogo: { total: catalogo_().length },
    base: baseComun_()
  };
}

// Códigos de establecimiento y sitios de la BASE COMÚN (hoja oculta _BASE_COMUN, que los trae con IMPORTRANGE)
function baseComun_() {
  const h = hoja_('_BASE_COMUN'); if (!h || h.getLastRow() < 2) return { establecimientos: [], sitios: [] };
  const v = h.getRange(2, 1, h.getLastRow() - 1, 5).getValues();
  const ok = x => x && String(x).indexOf('Sin conexión') < 0;
  return {
    establecimientos: v.filter(r => ok(r[0])).map(r => ({ cod: String(r[0]), nombre: String(r[1] || r[0]) })),
    sitios: v.filter(r => ok(r[3]) && r[4]).map(r => ({ cod: String(r[3]), sitio: String(r[4]) }))
  };
}

function itemsRelevamiento_(servicioId, relId) {
  const s = servicios_().filter(x => x.id === servicioId)[0];
  if (!s) return { ok: false, mensaje: 'No existe el servicio ' + servicioId + ' en la hoja SERVICIOS.' };
  const items = itemsDeTipo_(catalogo_(), s.tipo);
  const prev = {};
  if (relId) filas_(H.RESP, 5).forEach(r => { if (r[0] === relId) prev[r[1]] = { resp: r[2], obs: r[3], foto: r[4] }; });
  let cab = null;
  if (relId) filas_(H.REL, 9).forEach(r => { if (r[0] === relId) cab = { id: r[0], fecha: fecha_(r[1]), tipo: r[2], servicio: r[3], relevo: r[6], acompano: r[7], obs: r[8] }; });
  return { ok: true, servicio: s, cabecera: cab, items: items.map(i => Object.assign(i, prev[i.cod] || { resp: '', obs: '', foto: '' })) };
}

// ======================================================================
// Escrituras
// ======================================================================
// Copia las fórmulas de la fila 2 si la fila destino todavía no las tiene
function asegurarFormulas_(h, fila, c1, c2) {
  if (fila <= 2) return;
  if (!h.getRange(fila, c1).getFormula()) h.getRange(2, c1, 1, c2 - c1 + 1).copyTo(h.getRange(fila, c1, 1, c2 - c1 + 1));
}
function primeraVacia_(h, col) {
  const u = Math.max(h.getLastRow(), 2), v = h.getRange(2, col, u - 1, 1).getValues();
  for (let i = 0; i < v.length; i++) if (v[i][0] === '' || v[i][0] === null) return i + 2;
  return u + 1;
}

function guardarRelevamiento_(d) {
  const c = d.cabecera || {};
  if (!c.id || !c.servicio) return { ok: false, mensaje: 'Faltan el ID del relevamiento o el servicio.' };
  const hr = hoja_(H.REL), rel = filas_(H.REL, 1);
  let fila = rel.findIndex(r => r[0] === c.id); fila = fila >= 0 ? fila + 2 : primeraVacia_(hr, 1);
  hr.getRange(fila, 1, 1, 4).setValues([[c.id, c.fecha ? new Date(c.fecha + 'T12:00:00') : new Date(), c.tipo || 'Diagnóstico', c.servicio]]);
  hr.getRange(fila, 7, 1, 3).setValues([[c.relevo || 's/d', c.acompano || 's/d', c.obs || '']]);
  asegurarFormulas_(hr, fila, 5, 6);
  const hs = hoja_(H.RESP), prev = filas_(H.RESP, 2);
  const idx = {}; prev.forEach((r, i) => { if (r[0]) idx[r[0] + '|' + r[1]] = i + 2; });
  let libre = primeraVacia_(hs, 1), n = 0;
  (d.respuestas || []).forEach(r => {
    if (!r.cod) return;
    const k = c.id + '|' + r.cod;
    if (!r.resp && !idx[k]) return;   // no se cargan filas vacías
    let f = idx[k];
    if (!f) { f = libre; libre++; while (hs.getRange(libre, 1).getValue() !== '') libre++; }
    hs.getRange(f, 1, 1, 5).setValues([[c.id, r.cod, r.resp || '', r.obs || '', r.foto || '']]);
    asegurarFormulas_(hs, f, 6, 17); n++;
  });
  SpreadsheetApp.flush();
  return { ok: true, id: c.id, respuestas: n };
}

function generarHallazgos_(relId) {
  if (!relId) return { ok: false, mensaje: 'Falta el ID del relevamiento.' };
  const resp = filas_(H.RESP, 4).filter(r => r[0] === relId && (r[2] === 'P' || r[2] === 'NC'));
  const hh = hoja_(H.HAL), hal = filas_(H.HAL, 3);
  const ya = {}; hal.forEach(r => { if (r[1]) ya[r[1] + '|' + r[2]] = true; });
  let max = 0; hal.forEach(r => { const m = String(r[0]).match(/^H-(\d+)$/); if (m) max = Math.max(max, Number(m[1])); });
  let fila = primeraVacia_(hh, 1), nuevos = 0;
  resp.forEach(r => {
    if (ya[relId + '|' + r[1]]) return;
    max++;
    hh.getRange(fila, 1, 1, 3).setValues([['H-' + ('000' + max).slice(-4), relId, r[1]]]);
    hh.getRange(fila, 11).setValue(r[3] || '');
    hh.getRange(fila, 15).setValue('Abierto');
    asegurarFormulas_(hh, fila, 4, 10); asegurarFormulas_(hh, fila, 12, 14);
    fila++; nuevos++;
  });
  SpreadsheetApp.flush();
  return { ok: true, nuevos: nuevos };
}

function guardarHallazgo_(d) {
  const f = Number(d.fila);
  if (!f || f < 2) return { ok: false, mensaje: 'Fila inválida.' };
  const hh = hoja_(H.HAL);
  if (hh.getRange(f, 1).getValue() !== d.id) return { ok: false, mensaje: 'El hallazgo cambió de lugar en la planilla. Actualizá la pantalla.' };
  if (d.propuesta != null) hh.getRange(f, 12).setValue(d.propuesta);
  if (d.responsable != null) hh.getRange(f, 13).setValue(d.responsable);
  if (d.esfuerzo != null) hh.getRange(f, 14).setValue(d.esfuerzo);
  if (d.estado != null) hh.getRange(f, 15).setValue(d.estado);
  if (d.respDir != null) hh.getRange(f, 16).setValue(d.respDir);
  if (d.cierre != null) hh.getRange(f, 17).setValue(d.cierre ? new Date(d.cierre + 'T12:00:00') : '');
  return { ok: true };
}

function guardarServicio_(d) {
  if (!d.id || !d.servicio || !d.tipo) return { ok: false, mensaje: 'Faltan ID, servicio o tipo.' };
  const hs = hoja_(H.SERV), L = filas_(H.SERV, 1);
  let f = L.findIndex(r => r[0] === d.id); f = f >= 0 ? f + 2 : primeraVacia_(hs, 1);
  hs.getRange(f, 1, 1, 10).setValues([[d.id, d.est || 's/d', d.edificio || 's/d', d.servicio, d.tipo, d.directriz || 's/d', Number(d.criticidad) || 2, d.personas || 's/d', d.jefatura || 's/d', d.obs || '']]);
  return { ok: true };
}

// ======================================================================
// 2) Libros para la red
// ======================================================================
function carpetaLibros_() {
  const p = DriveApp.getFolderById(CARPETA_M8_ID), it = p.getFoldersByName(CARPETA_LIBROS);
  return it.hasNext() ? it.next() : p.createFolder(CARPETA_LIBROS);
}

// d = { est: 'Hospital …', cod: 'HMH', servicios: ['HMH-EDI', 'HMH-GUA', …] }
function generarLibro_(d) {
  const ids = d.servicios || [];
  if (!ids.length) return { ok: false, mensaje: 'Elegí al menos un servicio o edificio.' };
  const S = servicios_(), cat = catalogo_(), filas = [];
  ids.forEach(id => {
    const s = S.filter(x => x.id === id)[0]; if (!s) return;
    itemsDeTipo_(cat, s.tipo).forEach(i => filas.push([s.id, s.servicio + (s.edificio && s.edificio !== 's/d' ? ' · ' + s.edificio : ''), i.cod, i.critico ? '★' : '', i.item, i.verificar, '', '', '', 'ok']));
  });
  if (!filas.length) return { ok: false, mensaje: 'Los servicios elegidos no tienen ítems en el catálogo.' };
  const hoy = Utilities.formatDate(new Date(), 'America/Argentina/Buenos_Aires', 'yyyy-MM-dd');
  const nombre = 'M8 · Libro de relevamiento · ' + (d.cod || d.est || 's/d') + ' · ' + hoy;
  const copia = DriveApp.getFileById(LIBRO_MODELO_ID).makeCopy(nombre, carpetaLibros_());
  const L = SpreadsheetApp.openById(copia.getId());
  const dat = L.getSheetByName('DATOS');
  dat.getRange('B2').setValue(d.est || 's/d'); dat.getRange('B3').setValue(d.cod || 's/d'); dat.getRange('B4').setValue(d.tipo || 'Diagnóstico');
  dat.getRange('B9').setValue(Utilities.formatDate(new Date(), 'America/Argentina/Buenos_Aires', 'dd/MM/yyyy'));
  const rl = L.getSheetByName('RELEVAMIENTO');
  rl.getRange(2, 1, Math.max(rl.getMaxRows() - 1, 1), 10).clearContent();
  if (rl.getMaxRows() < filas.length + 1) rl.insertRowsAfter(rl.getMaxRows(), filas.length + 1 - rl.getMaxRows());
  rl.getRange(2, 1, filas.length, 10).setValues(filas);
  SpreadsheetApp.flush();
  return { ok: true, url: L.getUrl(), nombre: nombre, filas: filas.length };
}

function importarLibro_(url, conHallazgos) {
  if (!url) return { ok: false, mensaje: 'Falta el enlace del libro.' };
  const L = SpreadsheetApp.openByUrl(url);
  const dat = L.getSheetByName('DATOS'), rl = L.getSheetByName('RELEVAMIENTO');
  if (!dat || !rl) return { ok: false, mensaje: 'Ese archivo no es un libro de relevamiento del módulo 8.' };
  const fechaTxt = String(dat.getRange('B5').getDisplayValue() || '').trim();
  const fecha = fecha_(fechaTxt) || Utilities.formatDate(new Date(), 'America/Argentina/Buenos_Aires', 'yyyy-MM-dd');
  const tipo = dat.getRange('B4').getValue() || 'Diagnóstico';
  const relevo = dat.getRange('B6').getValue() || 's/d', acomp = dat.getRange('B7').getValue() || 's/d', obsGen = dat.getRange('B8').getValue() || '';
  const u = rl.getLastRow(); if (u < 2) return { ok: false, mensaje: 'El libro no tiene filas.' };
  const v = rl.getRange(2, 1, u - 1, 9).getValues();
  const porServicio = {};
  v.forEach(r => { if (r[0] && r[2] && r[6]) (porServicio[r[0]] = porServicio[r[0]] || []).push({ cod: r[2], resp: String(r[6]).trim().toUpperCase(), obs: r[7], foto: r[8] }); });
  const existentes = {}; filas_(H.REL, 1).forEach(r => { if (r[0]) existentes[r[0]] = true; });
  const res = [];
  Object.keys(porServicio).forEach(sid => {
    let id = sid + '-' + fecha.replace(/-/g, ''), k = 2; while (existentes[id]) id = sid + '-' + fecha.replace(/-/g, '') + '-' + (k++);
    existentes[id] = true;
    const g = guardarRelevamiento_({ cabecera: { id: id, fecha: fecha, tipo: tipo, servicio: sid, relevo: relevo, acompano: acomp, obs: 'Importado del libro de la red: ' + url + (obsGen ? ' · ' + obsGen : '') }, respuestas: porServicio[sid] });
    const h = conHallazgos ? generarHallazgos_(id) : { nuevos: 0 };
    res.push({ id: id, servicio: sid, respuestas: g.respuestas, hallazgos: h.nuevos });
  });
  if (!res.length) return { ok: false, mensaje: 'El libro no tiene respuestas cargadas.' };
  return { ok: true, relevamientos: res };
}

// ======================================================================
// 3) Menú en la planilla (todo se puede hacer sin GitHub)
// ======================================================================
function onOpen() {
  SpreadsheetApp.getUi().createMenu('Módulo 8')
    .addItem('Ayuda', 'menuAyuda')
    .addSeparator()
    .addItem('Generar libro para un establecimiento', 'menuGenerarLibro')
    .addItem('Importar un libro completo de la red', 'menuImportarLibro')
    .addItem('Generar hallazgos de un relevamiento', 'menuGenerarHallazgos')
    .addItem('Generar informe a la Dirección', 'menuGenerarInforme')
    .addSeparator()
    .addItem('Configurar clave del portal', 'menuClave')
    .addItem('Ver versión', 'menuVersion')
    .addToUi();
}
function menuAyuda() { SpreadsheetApp.getActive().getSheetByName(H.AYU).activate(); }
function menuVersion() { SpreadsheetApp.getUi().alert('Módulo 8 · versión ' + VERSION_M8); }
function menuClave() {
  const ui = SpreadsheetApp.getUi(), r = ui.prompt('Clave del portal', 'Escribí la misma clave de Higiene y Seguridad que usás para entrar al Portal HyS.', ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK || !r.getResponseText().trim()) return;
  PropertiesService.getScriptProperties().setProperty('CLAVE_HYS', r.getResponseText().trim());
  ui.alert('Clave guardada. El portal ya puede usar el módulo 8.');
}
function menuGenerarLibro() {
  const ui = SpreadsheetApp.getUi();
  const a = ui.prompt('Generar libro (1 de 2)', 'Nombre y código del establecimiento, separados por una barra. Ejemplo: Hospital María Humphreys / HMH', ui.ButtonSet.OK_CANCEL);
  if (a.getSelectedButton() !== ui.Button.OK) return;
  const p = a.getResponseText().split('/');
  const b = ui.prompt('Generar libro (2 de 2)', 'IDs de los servicios separados por coma, tal como están en la hoja SERVICIOS. Ejemplo: HMH-EDI, HMH-GUA, HMH-UTI', ui.ButtonSet.OK_CANCEL);
  if (b.getSelectedButton() !== ui.Button.OK) return;
  const r = generarLibro_({ est: (p[0] || '').trim(), cod: (p[1] || '').trim(), servicios: b.getResponseText().split(',').map(x => x.trim()).filter(String) });
  ui.alert(r.ok ? 'Libro generado con ' + r.filas + ' ítems.\n\nEstá en la carpeta del módulo 8 › ' + CARPETA_LIBROS + ':\n' + r.url + '\n\nCompartilo con el referente como editor.' : r.mensaje);
}
function menuImportarLibro() {
  const ui = SpreadsheetApp.getUi(), a = ui.prompt('Importar libro', 'Pegá el enlace del libro completo.', ui.ButtonSet.OK_CANCEL);
  if (a.getSelectedButton() !== ui.Button.OK) return;
  const r = importarLibro_(a.getResponseText().trim(), true);
  ui.alert(r.ok ? 'Importado:\n' + r.relevamientos.map(x => '· ' + x.id + ': ' + x.respuestas + ' respuestas, ' + x.hallazgos + ' hallazgos').join('\n') : r.mensaje);
}
function menuGenerarHallazgos() {
  const ui = SpreadsheetApp.getUi(), a = ui.prompt('Generar hallazgos', 'ID del relevamiento (hoja RELEVAMIENTOS).', ui.ButtonSet.OK_CANCEL);
  if (a.getSelectedButton() !== ui.Button.OK) return;
  const r = generarHallazgos_(a.getResponseText().trim());
  ui.alert(r.ok ? 'Se agregaron ' + r.nuevos + ' hallazgos a HALLAZGOS_PLAN.' : r.mensaje);
}

// ======================================================================
// 4) Informe a la Dirección (borrador en Google Docs)
// ======================================================================
const LOGO_PIE_ID = '1DnztPPclcsCNA23DDlAF-90Uchf6QdzN';   // logo-hysl-pie.png (SISTEMA HyS)
const CARPETA_INFORMES = 'INFORMES';
const C_AZUL = '#0D313F', C_PATA = '#5894A7', C_TXT = '#404040', C_GUIA = '#5894A7', FUENTE = 'Plus Jakarta Sans';
const NORMAS = {
  ley: 'Ley 19.587 de Higiene y Seguridad en el Trabajo y Decreto reglamentario 351/79.',
  r905: 'Res. SRT 905/2015, que establece las funciones de los Servicios de Higiene y Seguridad en el Trabajo y de Medicina del Trabajo (Anexo I).',
  rgrl: 'Res. SRT 463/2009, que aprueba el Relevamiento General de Riesgos Laborales (RGRL).',
  pngcam: 'Programa Nacional de Garantía de Calidad de la Atención Médica (Res. SS 432/92) y sus directrices de organización y funcionamiento. Para este servicio: ',
  aea: 'Asociación Electrotécnica Argentina, Reglamentación AEA 90364, Parte 7, Sección 710 (locales para usos médicos), como referencia técnica.'
};

function generarInforme_(relId) {
  if (!relId) return { ok: false, mensaje: 'Falta el ID del relevamiento.' };
  const R = filas_(H.REL, 10).map((r, i) => ({ fila: i + 2, r: r })).filter(x => x.r[0] === relId)[0];
  if (!R) return { ok: false, mensaje: 'No existe el relevamiento ' + relId + '.' };
  const rel = { id: R.r[0], fecha: fecha_(R.r[1]), tipo: String(R.r[2] || 'Diagnóstico'), servicio: R.r[3], relevo: R.r[6], acompano: R.r[7], obs: R.r[8] };
  const S = servicios_().filter(x => x.id === rel.servicio)[0] || { id: rel.servicio, est: 's/d', edificio: 's/d', servicio: rel.servicio, tipo: '', directriz: 's/d', criticidad: 2 };
  const nomEst = (baseComun_().establecimientos.filter(e => e.cod === S.est)[0] || {}).nombre || S.est;
  const cat = {}; catalogo_().forEach(i => cat[i.cod] = i);
  const resp = filas_(H.RESP, 5).filter(r => r[0] === relId && r[2]).map(r => ({ cod: r[1], resp: String(r[2]).toUpperCase(), obs: String(r[3] || ''), foto: String(r[4] || ''), it: cat[r[1]] || { item: r[1], rubro: 's/d', critico: false, gravedad: 0 } }));
  if (!resp.length) return { ok: false, mensaje: 'El relevamiento no tiene respuestas cargadas.' };
  const ind = (filas_(H.IND, 12).filter(r => r[0] === relId)[0]) || [];
  const hal = filas_(H.HAL, 17).filter(r => r[1] === relId).map(r => ({ id: r[0], cod: r[2], item: r[3], resp: r[5], prioridad: r[6], plazo: r[7], limite: fecha_(r[9]), desc: r[10], propuesta: r[11], responsable: r[12], esfuerzo: r[13] }));
  const n = k => resp.filter(x => x.resp === k).length, eval_ = resp.filter(x => x.resp !== 'NA');
  const sumG = eval_.reduce((s, x) => s + (x.it.gravedad || 1), 0);
  const pct = sumG ? Math.round(100 * eval_.reduce((s, x) => s + (x.it.gravedad || 1) * (x.resp === 'C' ? 1 : x.resp === 'P' ? 0.5 : 0), 0) / sumG) : 0;
  const crit = resp.filter(x => x.it.critico && x.resp === 'NC');
  const semaforo = String(ind[11] || (crit.length || pct < 60 ? 'ROJO' : pct < 85 ? 'AMARILLO' : 'VERDE'));
  const cuenta = p => hal.filter(h => h.prioridad === p).length;
  const esf = e => hal.filter(h => new RegExp(e, 'i').test(h.esfuerzo || '')).length;
  const ORD = { 'Actuar ya': 0, 'Resolver rápido': 1, 'Planificar': 2 }, ORE = s => /sin/i.test(s) ? 0 : /bajo/i.test(s) ? 1 : /compra/i.test(s) ? 2 : 3;
  hal.sort((a, b) => (ORD[a.prioridad] ?? 9) - (ORD[b.prioridad] ?? 9) || ORE(a.esfuerzo || '') - ORE(b.esfuerzo || ''));
  const auditoria = /audit/i.test(rel.tipo), hoy = Utilities.formatDate(new Date(), 'America/Argentina/Buenos_Aires', 'yyyy-MM-dd');
  const fTxt = f => f ? f.split('-').reverse().join('/') : 's/d';
  const previos = filas_(H.IND, 12).filter(r => r[0] !== relId && r[4] === S.servicio && r[3] === S.est && fecha_(r[1]) < rel.fecha).sort((a, b) => fecha_(b[1]).localeCompare(fecha_(a[1])));
  // Número de informe por establecimiento y año
  const P = PropertiesService.getScriptProperties(), anio = hoy.slice(0, 4), kN = 'M8_NRO_' + S.est + '_' + anio;
  let nro = P.getProperty('M8_INF_' + relId);
  if (!nro) { const k = Number(P.getProperty(kN) || 0) + 1; P.setProperty(kN, String(k)); nro = S.est + '-M8-' + ('00' + k).slice(-3) + '/' + anio; P.setProperty('M8_INF_' + relId, nro); }

  // ---------- Documento
  const nombre = 'M8 · Informe ' + nro.replace('/', '-') + ' · ' + S.servicio + ' · ' + S.est + ' (borrador)';
  const doc = DocumentApp.create(nombre), id = doc.getId();
  const carpeta = (() => { const p = DriveApp.getFolderById(CARPETA_M8_ID), it = p.getFoldersByName(CARPETA_INFORMES); return it.hasNext() ? it.next() : p.createFolder(CARPETA_INFORMES); })();
  DriveApp.getFileById(id).moveTo(carpeta);
  const B = doc.getBody(); B.setPageWidth(595.3).setPageHeight(841.9).setMarginTop(56).setMarginBottom(56).setMarginLeft(62).setMarginRight(62);
  const st = {}; st[DocumentApp.Attribute.FONT_FAMILY] = FUENTE; st[DocumentApp.Attribute.FONT_SIZE] = 10.5; st[DocumentApp.Attribute.FOREGROUND_COLOR] = C_TXT; B.setAttributes(st);
  const notas = [];   // notas al pie: el texto lleva ⟦n⟧ y después se convierten en notas reales
  const nota = t => { notas.push(t); return '⟦' + notas.length + '⟧'; };
  const AT = DocumentApp.Attribute, estilo = (o) => { const a = {}; a[AT.FONT_FAMILY] = FUENTE; a[AT.FONT_SIZE] = o.size || 10.5; a[AT.FOREGROUND_COLOR] = o.color || C_TXT; a[AT.BOLD] = !!o.bold; a[AT.ITALIC] = !!o.italic; return a; };
  const P_ = (t, o) => { o = o || {}; const p = B.appendParagraph(t || ''); if (o.heading) p.setHeading(o.heading);
    p.setAttributes(estilo(o.heading ? Object.assign({}, o, { color: o.color || C_AZUL, bold: true }) : o)); p.setAlignment(o.align || DocumentApp.HorizontalAlignment.JUSTIFY); p.setLineSpacing(o.ls || 1.5); p.setSpacingAfter(o.after == null ? 6 : o.after); return p; };
  const G = t => P_(t, { italic: true, color: C_GUIA, size: 9.5 });   // guía: se borra al revisar
  const H1 = t => P_(t, { heading: DocumentApp.ParagraphHeading.HEADING1, size: 14, align: DocumentApp.HorizontalAlignment.LEFT, after: 8 });
  const H2 = t => P_(t, { heading: DocumentApp.ParagraphHeading.HEADING2, size: 12, align: DocumentApp.HorizontalAlignment.LEFT });
  const H3 = t => P_(t, { heading: DocumentApp.ParagraphHeading.HEADING3, size: 10.5, color: C_PATA, align: DocumentApp.HorizontalAlignment.LEFT });
  const T = (filas, cab, anchos) => { const t = B.appendTable(filas); t.setBorderColor('#C9D6DB');
    for (let i = 0; i < t.getNumRows(); i++) { const row = t.getRow(i); for (let j = 0; j < row.getNumCells(); j++) { const c = row.getCell(j); c.setPaddingTop(3).setPaddingBottom(3).setPaddingLeft(5).setPaddingRight(5);
      for (let k = 0; k < c.getNumChildren(); k++) { const pp = c.getChild(k); if (pp.getType() === DocumentApp.ElementType.PARAGRAPH) { const q = pp.asParagraph(); q.setAttributes(estilo({ size: 9, color: cab && i === 0 ? '#FFFFFF' : C_TXT, bold: !!(cab && i === 0) })); q.setAlignment(DocumentApp.HorizontalAlignment.LEFT); q.setLineSpacing(1.1); q.setSpacingAfter(0); } }
      if (cab && i === 0) c.setBackgroundColor(C_AZUL); } }
    if (anchos) anchos.forEach((w, j) => { try { t.setColumnWidth(j, w); } catch (e) {} }); return t; };

  // Portada
  const enc = B.getParagraphs()[0]; enc.setText('Hospital Zonal Trelew «Dr. Adolfo Margara» · Hospital María Humphreys'); enc.setAttributes(estilo({ size: 11, bold: true, color: C_AZUL })); enc.setAlignment(DocumentApp.HorizontalAlignment.LEFT);
  P_('Servicio de Higiene y Seguridad Laboral', { color: C_PATA, align: DocumentApp.HorizontalAlignment.LEFT, after: 60 });
  P_((auditoria ? 'Auditoría' : 'Diagnóstico') + ' de infraestructura e instalaciones', { size: 22, bold: true, color: C_AZUL, align: DocumentApp.HorizontalAlignment.LEFT, ls: 1.15 });
  P_(S.servicio + ' — ' + nomEst, { size: 14, color: C_PATA, align: DocumentApp.HorizontalAlignment.LEFT, after: 30 });
  T([['Informe N.º', nro], ['Tipo de relevamiento', auditoria ? 'Auditoría de seguimiento' : 'Diagnóstico (línea de base)'], ['Establecimiento / edificio', nomEst + ' / ' + S.edificio],
    ['Servicio', S.servicio + ' (' + S.id + ')'], ['Fecha del relevamiento', fTxt(rel.fecha)], ['Fecha del informe', fTxt(hoy)], ['Destinatario', 'Dirección del ' + nomEst],
    ['Elaboró', 'Belén Pellegrini — Licenciada en Higiene, Seguridad y Medio Ambiente del Trabajo, M.P. LCOHSECH0383'], ['Módulo del sistema HyS', 'Módulo 8 · Servicios hospitalarios e infraestructura']], false, [170, 300]);
  G('Borrador generado por el sistema HyS (versión 0). Los textos en celeste e itálica son guía: revisarlos, completarlos y borrarlos antes de firmar. Para numerar las páginas («Página X de Y»): Insertar › Números de página.');
  B.appendPageBreak();
  // Índice
  H1('Índice'); G('Para tener números de página automáticos: Insertar › Índice, y borrar esta lista.');
  ['Resumen ejecutivo', '1. Presentación', '2. Marco normativo', '3. Método de trabajo', '4. Descripción de los hechos', '5. Análisis de los datos', '6. Conclusión', '7. Recomendaciones y plan de acción', 'Anexo I — Registro fotográfico', 'Anexo II — Lista de verificación', 'Anexo III — Escala de valoración y ponderación'].forEach(t => P_(t, { align: DocumentApp.HorizontalAlignment.LEFT, after: 0, ls: 1.3 }));
  B.appendPageBreak();
  // Resumen ejecutivo
  const sinCosto = esf('sin costo') + esf('bajo'), compras = esf('compra'), obras = esf('obra');
  const ejemplos = hal.filter(h => /sin costo|bajo/i.test(h.esfuerzo || '')).slice(0, 2).map(h => String(h.propuesta || h.item).replace(/\.$/, '').toLowerCase());
  H1('Resumen ejecutivo');
  P_('El ' + fTxt(rel.fecha) + ' se realizó ' + (auditoria ? 'la auditoría' : 'el diagnóstico') + ' de las condiciones de infraestructura e instalaciones del servicio de ' + S.servicio + ' del ' + nomEst + ', en el marco de las funciones del Servicio de Higiene y Seguridad Laboral' + nota(NORMAS.r905) + '. Se evaluaron ' + eval_.length + ' puntos de control; el nivel de cumplimiento ponderado fue del ' + pct + ' %' +
    (crit.length ? (crit.length > 1 ? ', y se identificaron ' + crit.length + ' situaciones críticas: ' : ', y se identificó una situación crítica: ') + crit.map(c => String(c.it.item).replace(/\.$/, '').toLowerCase()).join('; ') + '.' : ', sin situaciones críticas.'));
  if (hal.length) P_((hal.length > 1 ? 'De las ' + hal.length + ' mejoras propuestas, ' + sinCosto + (sinCosto === 1 ? ' puede' : ' pueden') : 'La mejora propuesta ' + (sinCosto ? 'puede' : 'no puede')) + ' resolverse sin costo o con bajo costo' + (ejemplos.length ? ' —' + ejemplos.join('; ') + '—' : '') + (hal.length > 1 ? ' y se presentan en primer lugar.' : '.') + (compras || obras ? ' ' + (compras ? compras + (compras === 1 ? ' requiere' : ' requieren') + ' compras' : '') + (compras && obras ? ' y ' : '') + (obras ? obras + (obras === 1 ? ' requiere' : ' requieren') + ' obra' : '') + ', y se proponen para su planificación de acuerdo con las prioridades y los recursos disponibles de la institución.' : ''));
  G('Revisar: uno o dos párrafos en prosa, sin tablas; debe leerse en un minuto.');
  // 1. Presentación
  H1('1. Presentación'); H2('1.1. Objeto');
  P_('El presente informe se elabora en ejercicio de las funciones del Servicio de Higiene y Seguridad Laboral de identificar, evaluar y proponer medidas de control sobre las condiciones del ambiente de trabajo, y tiene por objeto poner en conocimiento de la Dirección el estado de las condiciones de infraestructura e instalaciones del servicio de ' + S.servicio + ', con propuestas de mejora ordenadas por prioridad.');
  if (auditoria) G('Agregar: «El presente constituye la auditoría de seguimiento del Informe N.º [N.º], de fecha [fecha].»');
  H2('1.2. Alcance');
  P_('El relevamiento comprende la planta física, las instalaciones y el equipamiento de seguridad del servicio de ' + S.servicio + ' (' + S.edificio + '). ' + (S.tipo === 'Edificio' ? 'Este informe comprende las condiciones generales del edificio (capa A).' : 'Las condiciones generales del edificio se informan por separado en el diagnóstico del edificio.'));
  // 2. Marco normativo
  H1('2. Marco normativo');
  P_('El relevamiento se encuadra en la Ley 19.587 de Higiene y Seguridad en el Trabajo y su decreto reglamentario' + nota(NORMAS.ley) + ', que establecen las condiciones de higiene y seguridad de los establecimientos y las obligaciones del empleador; en la Res. SRT 905/2015' + nota(NORMAS.r905) + ', que define las funciones del Servicio de Higiene y Seguridad en el Trabajo; y en la Res. SRT 463/2009' + nota(NORMAS.rgrl) + ', cuyos ítems se toman como base de la lista de verificación del edificio.');
  P_('Para los requisitos propios del servicio se toman, en lo que corresponde a planta física, instalaciones y equipamiento de seguridad, las directrices de organización y funcionamiento' + nota(NORMAS.pngcam + (S.directriz && S.directriz !== '—' ? S.directriz : 's/d') + '.') + '. Para las instalaciones eléctricas de locales médicos se toma como referencia técnica la Reglamentación AEA 90364-7-710' + nota(NORMAS.aea) + '. Los requisitos de recursos humanos asistenciales y de organización clínica de las directrices no forman parte de este relevamiento.');
  // 3. Método
  H1('3. Método de trabajo'); H2('3.1. Relevamiento');
  P_('El relevamiento se realizó el ' + fTxt(rel.fecha) + ' mediante recorrido presencial, observación directa y verificación de registros documentales' + (rel.acompano && rel.acompano !== 's/d' ? ', con el acompañamiento de ' + rel.acompano : '') + '. Relevó: ' + (rel.relevo || 's/d') + '.');
  G('Completar: turno, cantidad de agentes entrevistados y si se tomó registro fotográfico.');
  H2('3.2. Instrumento');
  const nCrit = resp.filter(x => x.it.critico).length;
  P_('Se aplicó la lista de verificación del módulo 8 del sistema HyS, que integra dos capas: la capa A, con los requisitos generales del edificio derivados del RGRL, y la capa B, con los requisitos de cada servicio derivados de su directriz. Cada ítem consigna el fundamento normativo, la evidencia que se verifica y si se trata de un punto crítico. Se aplicaron ' + resp.length + ' ítems (' + nCrit + ' de ellos críticos).');
  H2('3.3. Criterios de valoración');
  P_('Cada punto se calificó como «cumple» (C), «cumple parcialmente» (P), «no cumple» (NC) o «no aplica» (NA). Se considera punto crítico aquel cuyo incumplimiento puede causar la muerte o una lesión grave, o impedir la evacuación o la continuidad de un área de alto riesgo.');
  H2('3.4. Ponderación y plazos técnicos');
  P_('Cada incumplimiento se pondera multiplicando la gravedad del ítem (1 a 4), la criticidad del servicio (1 a 3) y el factor de incumplimiento (1 para NC y 0,5 para P). Según el puntaje se asigna un plazo técnico: 30 días («actuar ya») para puntajes de 9 o más, 90 días («resolver rápido») entre 4 y 8,9, y 180 días («planificar») por debajo de 4. Todo punto crítico en NC se ubica en el plazo de 30 días. El cumplimiento ponderado se calcula ponderando cada respuesta por la gravedad del ítem, sin contar los NA, y se expresa en un semáforo (Anexo III).');
  H2('3.5. Limitaciones'); P_('No se registraron limitaciones.'); G('Revisar: mediciones no realizadas, sectores sin acceso o turnos no relevados.');
  // 4. Hechos
  H1('4. Descripción de los hechos'); H2('4.1. Situaciones críticas');
  if (crit.length) crit.forEach((c, i) => { const p = P_(''); const t1 = p.appendText(String(c.it.item).replace(/\.$/, '') + '. '); t1.setBold(true); const t2 = p.appendText(c.obs || ''); t2.setBold(false); if (!c.obs) G('Completar: qué se observó, dónde y en qué momento.');
    if (c.foto) P_('Foto ' + (i + 1) + ': ' + c.foto, { italic: true, size: 9, align: DocumentApp.HorizontalAlignment.LEFT }); else G('Foto ' + (i + 1) + ': insertar la foto del hallazgo crítico.'); });
  else P_('No se identificaron situaciones críticas.');
  H2('4.2. Otras observaciones');
  const otros = resp.filter(x => (x.resp === 'P' || x.resp === 'NC') && !(x.it.critico && x.resp === 'NC')), rub = {};
  otros.forEach(x => (rub[x.it.rubro || 's/d'] = rub[x.it.rubro || 's/d'] || []).push(x));
  if (Object.keys(rub).length) Object.keys(rub).forEach(r => P_(r + ': ' + rub[r].map(x => String(x.it.item).replace(/\.$/, '').toLowerCase() + ' (' + (x.resp === 'P' ? 'cumple en parte' : 'no cumple') + (x.obs ? ': ' + x.obs.charAt(0).toLowerCase() + x.obs.slice(1).replace(/\.$/, '') : '') + ')').join('; ') + '.'));
  else P_('No se registraron otros incumplimientos.');
  G('Revisar la redacción: describir sin juicios de valor ni adjetivos.');
  H2('4.3. Aspectos favorables');
  const ok = resp.filter(x => x.resp === 'C'), rubOk = Array.from(new Set(ok.map(x => x.it.rubro).filter(Boolean)));
  P_(ok.length ? 'Se verificó el cumplimiento de ' + ok.length + (ok.length === 1 ? ' punto' : ' puntos') + (rubOk.length ? (rubOk.length === 1 ? ', en el rubro ' : ', en los rubros ') + rubOk.join(', ') : '') + '. Son condiciones que conviene sostener.' : 'No se registraron puntos en cumplimiento.');
  // 5. Análisis
  H1('5. Análisis de los datos'); H2('5.1. Indicadores');
  T([['Indicador', 'Valor'], ['Puntos evaluados', eval_.length + ' (sin NA)'], ['Cumplen / parcial / no cumplen', n('C') + ' / ' + n('P') + ' / ' + n('NC')], ['Cumplimiento ponderado', pct + ' %'], ['Puntos críticos en «no cumple»', String(crit.length)],
    ['Hallazgos «actuar ya» (30 días)', String(cuenta('Actuar ya'))], ['Hallazgos «resolver rápido» (90 días)', String(cuenta('Resolver rápido'))], ['Hallazgos «planificar» (180 días)', String(cuenta('Planificar'))], ['Mejoras sin costo o de bajo costo', sinCosto + ' de ' + hal.length], ['Semáforo', semaforo]], true, [280, 190]);
  H2('5.2. Interpretación');
  const rubNc = Object.keys(rub).concat(crit.map(c => c.it.rubro)).reduce((m, r) => (m[r] = (m[r] || 0) + 1, m), {}), top = Object.keys(rubNc).sort((a, b) => rubNc[b] - rubNc[a]).slice(0, 2);
  P_('El servicio se ubica en la categoría ' + semaforo.toLowerCase() + (crit.length ? ' por la presencia de ' + crit.length + (crit.length > 1 ? ' puntos críticos' : ' punto crítico') + ' sin cumplir' : ' con un cumplimiento ponderado del ' + pct + ' %') + '.' + (top.length ? (top.length > 1 ? ' Los rubros con más incumplimientos fueron ' + top.join(' y ') : ' El rubro con más incumplimientos fue ' + top[0]) + '.' : ''));
  if (previos.length) P_('Respecto del relevamiento del ' + fTxt(fecha_(previos[0][1])) + ', el cumplimiento ponderado pasó de ' + Math.round(Number(String(previos[0][6]).replace('%', '').replace(',', '.')) * (String(previos[0][6]).indexOf('%') >= 0 ? 1 : 100)) + ' % a ' + pct + ' %.');
  G('Completar: con qué se relacionan principalmente los incumplimientos (organización interna, mantenimiento, recursos) y qué indica.');
  // 6. Conclusión
  H1('6. Conclusión');
  P_(crit.length ? 'Las condiciones de infraestructura e instalaciones del servicio presentan ' + (crit.length > 1 ? 'situaciones críticas que requieren' : 'una situación crítica que requiere') + ' una acción inmediata. Resolver las acciones de 30 días' + (sinCosto ? ', empezando por las que no requieren presupuesto,' : '') + ' reduce el riesgo principal' + (compras || obras ? ' mientras se planifican las mejoras que requieren compras u obra.' : '.') : 'Las condiciones de infraestructura e instalaciones del servicio no presentan situaciones críticas. Las mejoras propuestas permiten sostener y mejorar el nivel de cumplimiento, empezando por las que no requieren presupuesto.');
  G('Revisar: estado general, riesgo principal y qué cambia si se resuelven las prioridades.');
  // 7. Recomendaciones
  H1('7. Recomendaciones y plan de acción');
  P_('Se proponen las siguientes acciones, ordenadas por plazo técnico. Se solicita a la Dirección que, por su intermedio, se requiera a los servicios responsables la confirmación de las acciones y los plazos de ejecución.');
  if (hal.length) T([['Prioridad', 'Hallazgo', 'Propuesta de mejora', 'Responsable sugerido', 'Esfuerzo', 'Fecha límite']].concat(hal.map(h => [h.prioridad || 's/d', String(h.item || h.cod), String(h.propuesta || 's/d'), String(h.responsable || 's/d'), String(h.esfuerzo || 's/d'), fTxt(h.limite)])), true, [62, 110, 120, 80, 50, 55]);
  else G('No hay hallazgos generados para este relevamiento: usar «Generar hallazgos» antes de emitir el informe.');
  const seg = new Date(hoy + 'T12:00:00'); seg.setDate(seg.getDate() + 30);
  P_('El Servicio de Higiene y Seguridad Laboral realizará la auditoría de seguimiento a partir del ' + Utilities.formatDate(seg, 'America/Argentina/Buenos_Aires', 'dd/MM/yyyy') + ', centrada en las situaciones críticas y en las acciones comprometidas.');
  P_('Quedo a disposición por cualquier consulta, requerimiento o ampliación de la información.', { after: 2 });
  P_('Celular: 2804389910 — Correo: belenpellegrini.hys@gmail.com', { align: DocumentApp.HorizontalAlignment.LEFT, after: 30 });
  ['Belén Pellegrini', 'Licenciada en Higiene, Seguridad y Medio Ambiente del Trabajo', 'M.P. LCOHSECH0383', 'Servicio de Higiene y Seguridad Laboral'].forEach((t, i) => P_(t, { align: DocumentApp.HorizontalAlignment.LEFT, after: 0, ls: 1.2, bold: i === 0 }));
  // Anexos
  B.appendPageBreak(); H1('Anexo I — Registro fotográfico');
  const fotos = resp.filter(x => x.foto && !(x.it.critico && x.resp === 'NC'));
  if (fotos.length) fotos.forEach((x, i) => P_('Foto ' + (crit.length + i + 1) + ' · ' + x.it.item + ': ' + x.foto, { size: 9, align: DocumentApp.HorizontalAlignment.LEFT })); else G('Insertar las fotos de los hallazgos no críticos, numeradas y con epígrafe.');
  H1('Anexo II — Lista de verificación'); P_('★ = punto crítico.', { size: 9, after: 4 });
  T([['Código', 'Ítem', 'Resp.', 'Observación']].concat(resp.map(x => [x.cod, (x.it.critico ? '★ ' : '') + x.it.item, x.resp, x.obs || ''])), true, [75, 230, 35, 130]);
  H1('Anexo III — Escala de valoración y ponderación');
  T([['Concepto', 'Valores'], ['Respuesta', 'C = 1 · P = 0,5 · NC = 0 · NA = no se cuenta'], ['Gravedad del ítem', '1 leve · 2 moderada · 3 grave · 4 crítica'], ['Criticidad del servicio', '1 baja · 2 media · 3 alta (guardia, quirófano, UTI, UCIP, neonatología, esterilización)'],
    ['Factor de incumplimiento', 'NC = 1 · P = 0,5'], ['Puntaje', 'Gravedad × criticidad × factor'], ['Plazo técnico', '≥ 9 o crítico en NC: 30 días · 4 a 8,9: 90 días · < 4: 180 días'], ['Semáforo', 'Verde ≥ 85 % · Amarillo 60 a 84 % · Rojo < 60 % o crítico en NC']], true, [150, 320]);
  // Pie con el logo de HySL
  try { const pie = doc.addFooter(), pp = pie.getParagraphs()[0]; pp.setAlignment(DocumentApp.HorizontalAlignment.CENTER); const img = pp.appendInlineImage(DriveApp.getFileById(LOGO_PIE_ID).getBlob()); const w = 300, h = Math.round(img.getHeight() * w / img.getWidth()); img.setWidth(w); img.setHeight(h); } catch (e) {}
  doc.saveAndClose();
  // Notas al pie reales (servicio avanzado Docs)
  let notasOk = true, notasError = ''; try { notasAlPie_(id, notas); } catch (e) { notasOk = false; notasError = String(e.message || e); }
  hoja_(H.REL).getRange(R.fila, 10).setValue(doc.getUrl());
  return { ok: true, url: 'https://docs.google.com/document/d/' + id + '/edit', nro: nro, nombre: nombre, notas: notasOk, notasError: notasError };
}

// Reemplaza cada ⟦n⟧ por una nota al pie con su texto (de atrás hacia adelante, para no correr los índices).
// Usa la API de Docs con el permiso del propio script (no hace falta activar servicios avanzados).
function docsApi_(id, metodo, cuerpo) {
  const r = UrlFetchApp.fetch('https://docs.googleapis.com/v1/documents/' + id + (metodo === 'get' ? '' : ':batchUpdate'), {
    method: metodo === 'get' ? 'get' : 'post', contentType: 'application/json', payload: metodo === 'get' ? undefined : JSON.stringify(cuerpo),
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }, muteHttpExceptions: true });
  if (r.getResponseCode() >= 300) throw new Error('Docs ' + r.getResponseCode() + ': ' + r.getContentText().slice(0, 200));
  return JSON.parse(r.getContentText());
}
function notasAlPie_(id, notas) {
  const d = docsApi_(id, 'get'), marcas = [];
  (d.body.content || []).forEach(el => (el.paragraph ? el.paragraph.elements || [] : []).forEach(pe => { const t = pe.textRun && pe.textRun.content; if (!t) return; const re = /⟦(\d+)⟧/g; let m;
    while ((m = re.exec(t))) marcas.push({ ini: pe.startIndex + m.index, fin: pe.startIndex + m.index + m[0].length, n: Number(m[1]) }); }));
  marcas.sort((a, b) => b.ini - a.ini).forEach(mk => {
    const r = docsApi_(id, 'batch', { requests: [{ deleteContentRange: { range: { startIndex: mk.ini, endIndex: mk.fin } } }, { createFootnote: { location: { index: mk.ini } } }] });
    const fid = r.replies[1].createFootnote.footnoteId, tx = notas[mk.n - 1];
    docsApi_(id, 'batch', { requests: [{ insertText: { location: { segmentId: fid, index: 1 }, text: tx } },
      { updateTextStyle: { range: { segmentId: fid, startIndex: 1, endIndex: 1 + tx.length }, textStyle: { fontSize: { magnitude: 8.5, unit: 'PT' }, weightedFontFamily: { fontFamily: FUENTE }, foregroundColor: { color: { rgbColor: { red: 0.25, green: 0.25, blue: 0.25 } } } }, fields: 'fontSize,weightedFontFamily,foregroundColor' } }] });
  });
}

function menuGenerarInforme() {
  const ui = SpreadsheetApp.getUi(), a = ui.prompt('Generar informe', 'ID del relevamiento (hoja RELEVAMIENTOS).', ui.ButtonSet.OK_CANCEL);
  if (a.getSelectedButton() !== ui.Button.OK) return;
  const r = generarInforme_(a.getResponseText().trim());
  ui.alert(r.ok ? 'Informe ' + r.nro + ' generado (borrador):\n' + r.url : r.mensaje);
}
// Para probar desde el editor: genera el informe del relevamiento de ejemplo
function probarInforme() { const r = filas_(H.REL, 10).map(x => String(x[0])).filter(Boolean).pop(); if (!r) return Logger.log('No hay relevamientos cargados para probar el informe.'); Logger.log(JSON.stringify(generarInforme_(r))); }

// Reinicia la numeración de informes del módulo 8 después de borrar pruebas (12/10/2026).
// Borra los contadores M8_NRO_* y los números asignados a relevamientos que ya no existen en RELEVAMIENTOS.
function reiniciarContadorM8() {
  const P = PropertiesService.getScriptProperties(), props = P.getProperties();
  const ids = filas_(H.REL, 10).map(r => String(r[0]));
  const borradas = [];
  Object.keys(props).forEach(k => {
    if (/^M8_INF_/.test(k) && ids.indexOf(k.replace(/^M8_INF_/, '')) < 0) { P.deleteProperty(k); borradas.push(k + ' = ' + props[k]); }
  });
  const quedan = Object.keys(P.getProperties()).filter(k => /^M8_INF_/.test(k));
  if (!quedan.length) Object.keys(props).filter(k => /^M8_NRO_/.test(k)).forEach(k => { P.deleteProperty(k); borradas.push(k + ' = ' + props[k]); });
  Logger.log(borradas.length ? 'Borrado: ' + borradas.join(' · ') : 'No había nada para reiniciar.');
}
