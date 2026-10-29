/**
 * MIPyV Red HZT — Control de extintores conectado al MÓDULO 7 · Protección contra incendios del Portal HyS
 * Va en el mismo proyecto de Apps Script de la planilla «MIP RED HZT - Base de Datos v2», como archivo aparte.
 *
 * Desde el 29/10/2026 hay UNA SOLA PUERTA (pedido de Belén, revisión de la carga de extintores):
 *  - MIPyV ya no escribe en la planilla «PROTECCIÓN CONTRA INCENDIOS · Sistema HyS». Cada control, alta y corrección se manda
 *    al Portal HyS (proyecto «Sistema HyS», Incendio.gs › incRed_) con el acceso de servicio «MIPyV». Así se aplican las mismas
 *    reglas que en «Mi establecimiento» (N.º de puesto único, inventario sin repetir, plantas, fechas, dependencias de Sede ex ADOS),
 *    hay un solo turno para escribir (sin choques con Melani o SOMI) y los mensajes de error son los mismos.
 *  - Configuración (Configuración del proyecto › Propiedades de las secuencias de comandos):
 *      PORTAL_CLAVE  la clave del acceso de servicio «MIPyV» (BASE COMÚN › ACCESOS). Sin ella no se puede guardar.
 *      PORTAL_URL    (opcional) dirección de la aplicación web del Portal HyS; si no está, se usa PORTAL_URL_DEFECTO.
 *  - Cada envío lleva su id_origen (el id que pone la app): si la app reintenta, el portal no lo duplica.
 *  - Si el portal rechaza un registro, devuelve { ok: false, codigo, mensaje } y la app lo muestra en «No se pudo enviar».
 *    codigo = no_existe (el extintor ya no está en la lista: la app lo descarta sola), puesto, inventario, datos, fecha, lugar.
 *
 * Lectura (solo lee, no escribe): extintoresParaApp_(ss) arma la lista de extintores para la app (red Trelew sin HMH) y
 * lugaresIncendioParaApp_(ss) dice, para cada lugar de MIPyV, a qué establecimiento, sitio y dependencia corresponde, con la lista
 * de dependencias del sitio (SITIOS_INC › DEPENDENCIAS) y las plantas permitidas.
 * Lugares: hoja establecimientos › codigo_sistema, sitio_sistema y dependencia_sistema (columna nueva, 29/10/2026: Adolescencia,
 * Vacunatorio, Internación de Salud Mental, PROSATE y Consultorios Externos están dentro de la Sede ex ADOS).
 * Normativa: Ley 19.587; Dto. 351/79, cap. 18.
 */
const INC_LIBRO_ID = '10lyFIV8UDQGGiNu3DegHiyxqR5xinSgn82XFmO5VWw0';   // PROTECCIÓN CONTRA INCENDIOS · Sistema HyS (solo lectura desde acá)
const PORTAL_URL_DEFECTO = 'https://script.google.com/macros/s/AKfycbwEf6wxSyzMPh0vu2qoeMJnBwZHNu6IRJgCnAG1sykyuu5N4N4JEFUd_Ve_0Zlu5nME/exec';   // aplicación web del Portal HyS
const INC_EST_MIPYV = ['HZT'];   // MIPyV carga extintores solo de la red Trelew sin HMH (el HMH lo llevan Melani y SOMI)
const INC_PLANTAS = ['Subsuelo', 'Planta baja', '1er piso', '2do piso', '3er piso', 'Única', 'Vehículo'];   // las mismas que el Portal HyS
// Lo usa también Tanques_MIPyV.gs (tqSitio_): NO cambiar sin revisar los tanques. Lugares de MIPyV que en el sistema HyS están dentro de otro sitio.
const INC_SITIO_ALIAS = { 'casa tutelada': 'Casa de convivencia', 'internacion salud mental': 'Sede ex ADOS', 'prosate': 'Sede ex ADOS', 'consultorios externos': 'Sede ex ADOS' };
// Solo para extintores (29/10/2026): «Casa de convivencia» pasó a llamarse «Casa Tutelada» en el módulo de incendio.
const INC_SITIO_EXT = { 'casa tutelada': 'Casa Tutelada', 'casa de convivencia': 'Casa Tutelada', 'internacion salud mental': 'Sede ex ADOS', 'prosate': 'Sede ex ADOS', 'consultorios externos': 'Sede ex ADOS' };
// Dependencia de la Sede ex ADOS según el lugar de MIPyV, si la columna dependencia_sistema está vacía
const INC_DEP_LUGAR = { ADOL: 'Adolescencia', VAC: 'Vacunatorio', ISM: 'Internación de Salud Mental', PROS: 'PROSATE', CEXT: 'Consultorios Externos' };

const incNorm_ = (s) => String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
const incIso_ = (v) => v instanceof Date ? Utilities.formatDate(v, ZONA_HORARIA, 'yyyy-MM-dd') : String(v || '').slice(0, 10);
function incTabla_(sh) {   // encabezados en la fila 5, datos desde la 6 (formato del sistema HyS)
  const H = sh.getRange(5, 1, 1, sh.getLastColumn()).getValues()[0].map(String), n = sh.getLastRow() - 5;
  if (n < 1) return { H: H, filas: [] };
  const v = sh.getRange(6, 1, n, H.length).getValues();
  return { H: H, filas: v.map((r, i) => { const o = { _fila: 6 + i }; H.forEach((h, j) => o[h] = r[j]); return o; }).filter((o) => o[H[0]]) };
}

// ------------------------------------------------------------------ LUGARES (lugar de MIPyV → establecimiento, sitio y dependencia)
function incLugares_(ss, libro) {
  const est = ss.getSheetByName('establecimientos'); if (!est) return {};
  const ev = est.getDataRange().getValues(), eh = ev[0].map(String), c = (k) => eh.indexOf(k);
  // dependencias de cada sitio (SITIOS_INC › DEPENDENCIAS, separadas por «·»)
  const deps = {}; try {
    const S = incTabla_((libro || SpreadsheetApp.openById(INC_LIBRO_ID)).getSheetByName('SITIOS_INC'));
    S.filas.forEach((s) => { const l = String(s.DEPENDENCIAS || '').split(/\s*[·;]\s*/).map((x) => x.trim()).filter(Boolean); if (l.length) deps[String(s.ESTABLECIMIENTO).trim() + '|' + incNorm_(s.SITIO)] = l; });
  } catch (e) { /* sin la columna, sin dependencias */ }
  const out = {};
  ev.slice(1).forEach((r) => {
    const id = String(r[c('id_establecimiento')] || '').trim(); if (!id || String(r[c('activo')] || '').toUpperCase().indexOf('SI') !== 0) return;
    const cod = String(r[c('codigo_sistema')] || '').trim(), sit0 = String(r[c('sitio_sistema')] || '').trim(); if (!cod || !sit0 || INC_EST_MIPYV.indexOf(cod) < 0) return;
    const sitio = INC_SITIO_EXT[incNorm_(sit0)] || sit0, ds = deps[cod + '|' + incNorm_(sitio)] || [];
    let dep = c('dependencia_sistema') >= 0 ? String(r[c('dependencia_sistema')] || '').trim() : '';
    if (!dep && ds.length) dep = INC_DEP_LUGAR[id] || '';
    if (dep && ds.length && !ds.some((d) => incNorm_(d) === incNorm_(dep))) dep = '';   // una dependencia que no está en la lista no filtra
    out[id] = { cod: cod, sitio: sitio, dep: dep, deps: ds };
  });
  return out;
}
// Para la app: { id_lugar: { cod, sitio, dep, deps, plantas } }
function lugaresIncendioParaApp_(ss) {
  const L = incLugares_(ss); Object.keys(L).forEach((k) => L[k].plantas = INC_PLANTAS); return L;
}

// ------------------------------------------------------------------ LISTA DE EXTINTORES PARA LA APP (solo lee)
// Cada extintor aparece en los lugares de MIPyV de su sitio; si el lugar es una dependencia (p. ej. Vacunatorio), solo los de ese sector.
function extintoresParaApp_(ss) {
  const libro = SpreadsheetApp.openById(INC_LIBRO_ID), L = incLugares_(ss, libro);
  const T = incTabla_(libro.getSheetByName('EXTINTORES'));
  return T.filas.filter((e) => !/baja/i.test(e.ESTADO) && INC_EST_MIPYV.indexOf(String(e.ESTABLECIMIENTO).trim()) >= 0).map((e) => {
    const cod = String(e.ESTABLECIMIENTO).trim(), sit = incNorm_(e.SITIO);
    const lugares = Object.keys(L).filter((k) => L[k].cod === cod && incNorm_(L[k].sitio) === sit && (!L[k].dep || incNorm_(L[k].dep) === incNorm_(e.SECTOR)));
    const alta = String(e.CAMBIOS || '').split('\n').filter((x) => /: Alta/.test(x)).pop() || '';
    return {
      id: String(e.ID), lugares: lugares, sitio: String(e.SITIO || ''), nro: String(e.NRO_EXTINTOR || ''), planta: String(e.PLANTA || ''), sector: String(e.SECTOR || ''), ubicacion: String(e.UBICACION || ''),
      tipo: String(e.TIPO || ''), agente: String(e.AGENTE || ''), kg: String(e.CAPACIDAD_KG || ''), inv: String(e.NRO_INVENTARIO || ''), vto: incIso_(e.VTO_CARGA), ph: incIso_(e.PRUEBA_HIDRAULICA_VENCE),
      ultimo: incIso_(e.ULTIMO_CONTROL), resultado: String(e.RESULTADO_CONTROL || ''), estado: String(e.ESTADO || ''), verificacion: String(e.VERIFICACION || ''),
      cargo: alta ? alta.replace(/^\d{2}\/\d{2}\/\d{4} · /, '').replace(/: Alta.*$/, '') : '', alta: alta ? alta.slice(0, 10) : '',
    };
  }).filter((e) => e.lugares.length);
}

// ------------------------------------------------------------------ PUENTE AL PORTAL HyS (escribe el portal, no MIPyV)
function incPortal_(accion, est, datos) {
  const P = PropertiesService.getScriptProperties(), clave = String(P.getProperty('PORTAL_CLAVE') || '').trim(), url = String(P.getProperty('PORTAL_URL') || PORTAL_URL_DEFECTO).trim();
  if (!clave) return { ok: false, codigo: 'config', mensaje: 'Falta configurar MIPyV con el Portal HyS (PORTAL_CLAVE). Avisale a Higiene y Seguridad.' };
  const res = UrlFetchApp.fetch(url, { method: 'post', contentType: 'text/plain;charset=utf-8', muteHttpExceptions: true, followRedirects: true,
    payload: JSON.stringify({ accion: accion, est: est, clave: clave, dni: '', datos: datos, version: 'MIPyV' }) });
  const txt = res.getContentText();
  let r; try { r = JSON.parse(txt); } catch (e) { throw new Error('El Portal HyS no respondió bien (' + res.getResponseCode() + '). Se reintenta solo.'); }   // error de red: se reintenta
  if (r && r.error === 'clave') return { ok: false, codigo: 'config', mensaje: 'La clave de MIPyV para el Portal HyS no es correcta o no está activa: ' + (r.mensaje || '') + ' Avisale a Higiene y Seguridad.' };
  if (r && r.error === 'interno') throw new Error(r.mensaje || 'El Portal HyS tuvo un problema. Se reintenta solo.');
  return r || { ok: false, mensaje: 'Respuesta vacía del Portal HyS.' };
}
const incFotoUrl_ = (f) => !f ? '' : /^data:/.test(String(f)) ? String(f) : 'data:image/jpeg;base64,' + String(f);
const incDia_ = (v) => { try { return Utilities.formatDate(v ? new Date(v) : new Date(), ZONA_HORARIA, 'yyyy-MM-dd'); } catch (e) { return Utilities.formatDate(new Date(), ZONA_HORARIA, 'yyyy-MM-dd'); } };
const INC_FOTOS_K = ['FOTO_PANORAMICA', 'FOTO_MARBETE', 'FOTO_INVENTARIO'];
const INC_PREGUNTAS = ['EN_LUGAR', 'ACCESO_LIBRE', 'MANOMETRO', 'PRECINTO', 'SENALIZACION'];
function incQuien_(data) { return { operario: String(data.operario || ''), operario_acompanante: String(data.operario_acompanante || '') }; }
function incEstDe_(id) {   // establecimiento de un extintor (solo lee)
  const e = incTabla_(SpreadsheetApp.openById(INC_LIBRO_ID).getSheetByName('EXTINTORES')).filas.find((x) => String(x.ID) === String(id));
  return e ? String(e.ESTABLECIMIENTO).trim() : '';
}
// Planta: los valores viejos de la app («Baja») pasan a la lista nueva
const incPlanta_ = (p) => /^baja$/i.test(String(p || '').trim()) ? 'Planta baja' : String(p || '').trim();

// Control mensual de un extintor (5 respuestas y 3 fotos, o «Todo OK» sin fotos)
function guardarControlExtintor_(data) {
  if (!data.ID_EXTINTOR || !data.id_control) throw new Error('Falta el extintor.');
  const est = incEstDe_(data.ID_EXTINTOR);
  if (!est) return { ok: false, codigo: 'no_existe', mensaje: 'Ese extintor (' + data.ID_EXTINTOR + ') ya no está en la lista: lo dieron de baja o lo borraron.' };
  const todoOk = data.todoOk === true || data.todoOk === 'true', fotos = (Array.isArray(data.fotos_base64) ? data.fotos_base64 : []);
  const d = Object.assign({ ID_EXTINTOR: data.ID_EXTINTOR, FECHA: incDia_(data.fecha), OBSERVACIONES: String(data.OBSERVACIONES || '').trim(), todoOk: todoOk, id_origen: data.id_control,
    VTO_CARGA: String(data.VTO_CARGA || ''), PRUEBA_HIDRAULICA_VENCE: String(data.PRUEBA_HIDRAULICA_VENCE || ''), PROBLEMAS: Array.isArray(data.PROBLEMAS) ? data.PROBLEMAS : [], fotos: {} }, incQuien_(data));
  INC_PREGUNTAS.forEach((k) => d[k] = data[k]);
  if (!todoOk) INC_FOTOS_K.forEach((k, i) => d.fotos[k] = incFotoUrl_(fotos[i]));
  const r = incPortal_('i_control', est, d);
  return r.ok ? { ok: true, resultado: r.resultado, id: r.id, duplicado: !!r.duplicado, aviso: r.aviso || '' } : r;
}

// Extintor que no estaba en la lista (todos los datos, N.º de puesto y 3 fotos)
function guardarAltaExtintor_(data) {
  if (!data.id_alta || !data.lugar_id) throw new Error('Falta el lugar del extintor.');
  const lug = incLugares_(SpreadsheetApp.getActiveSpreadsheet())[String(data.lugar_id).trim()];
  if (!lug) return { ok: false, codigo: 'lugar', mensaje: 'Ese lugar (' + (data.lugar_nombre || data.lugar_id) + ') no tiene extintores en el sistema HyS desde MIPyV (revisá codigo_sistema y sitio_sistema en la hoja establecimientos).' };
  const fotos = Array.isArray(data.fotos_base64) ? data.fotos_base64 : [];
  let sector = String(data.SECTOR || '').trim(), ubic = String(data.UBICACION || '').trim();
  if (lug.dep) {   // entró por una dependencia (p. ej. Vacunatorio): el sector es esa dependencia; lo que escribió como sector pasa a la ubicación
    if (sector && incNorm_(sector) !== incNorm_(lug.dep)) ubic = [sector, ubic].filter(Boolean).join(' · ');
    sector = lug.dep;
  }
  const d = Object.assign({ SITIO: lug.sitio, NRO_EXTINTOR: String(data.NRO_EXTINTOR || '').trim(), PLANTA: incPlanta_(data.PLANTA), SECTOR: sector, UBICACION: ubic,
    TIPO: data.TIPO, AGENTE: data.AGENTE, CAPACIDAD_KG: String(data.CAPACIDAD_KG || '').trim(), NRO_INVENTARIO: String(data.NRO_INVENTARIO || '').trim(),
    VTO_CARGA: String(data.VTO_CARGA || '').trim(), PRUEBA_HIDRAULICA_VENCE: String(data.PRUEBA_HIDRAULICA_VENCE || '').trim(), OBSERVACIONES: String(data.OBSERVACIONES || '').trim(),
    id_origen: data.id_alta, fotos: {} }, incQuien_(data));
  INC_FOTOS_K.forEach((k, i) => d.fotos[k] = incFotoUrl_(fotos[i]));
  const r = incPortal_('i_ext_alta', lug.cod, d);
  return r.ok ? { ok: true, id: r.id, duplicado: !!r.duplicado } : r;
}

// Corrección del N.º de puesto y la ubicación (queda «Pendiente» de verificar por HyS en el portal)
function guardarEdicionExtintor_(data) {
  if (!data.id_edit || !data.ID_EXTINTOR) throw new Error('Falta el extintor.');
  const est = incEstDe_(data.ID_EXTINTOR);
  if (!est) return { ok: false, codigo: 'no_existe', mensaje: 'Ese extintor (' + data.ID_EXTINTOR + ') ya no está en la lista: lo dieron de baja o lo borraron.' };
  const d = Object.assign({ ID: data.ID_EXTINTOR, id_origen: data.id_edit }, incQuien_(data));
  ['NRO_EXTINTOR', 'SECTOR', 'UBICACION'].forEach((k) => { if (k in data && String(data[k] == null ? '' : data[k]).trim() !== '') d[k] = String(data[k]).trim(); });
  if ('PLANTA' in data && String(data.PLANTA || '').trim()) d.PLANTA = incPlanta_(data.PLANTA);
  if (data.lugar_id) {
    const lug = incLugares_(SpreadsheetApp.getActiveSpreadsheet())[String(data.lugar_id).trim()];
    if (!lug) return { ok: false, codigo: 'lugar', mensaje: 'Ese lugar (' + (data.lugar_nombre || data.lugar_id) + ') no está vinculado al sistema HyS.' };
    if (lug.cod !== est) return { ok: false, codigo: 'lugar', mensaje: 'Ese lugar es de otro establecimiento: avisale a Higiene y Seguridad para que lo mude.' };
    d.SITIO = lug.sitio; if (lug.dep) d.SECTOR = lug.dep;
  }
  const r = incPortal_('i_ext_editar', est, d);
  return r.ok ? { ok: true, cambios: 1, duplicado: !!r.duplicado } : r;
}

// ------------------------------------------------------------------ PRUEBA DEL PUENTE (ejecutar desde el editor; solo lee, no guarda nada)
// La primera vez pide permiso para «conectarse a un servicio externo» (el Portal HyS). Dice si la clave anda y cuántos extintores ve.
function probarPuentePortal() {
  const r = incPortal_('i_datos', 'HZT', { operario: 'Prueba del puente' });
  const msg = r && r.ok ? 'Puente MIPyV → Portal HyS OK: ' + (r.extintores || []).length + ' extintor(es) del HZT y ' + (r.sitios || []).length + ' lugar(es).' : 'El puente NO anda: ' + ((r && (r.mensaje || r.error)) || 'sin respuesta');
  Logger.log(msg); return msg;
}
