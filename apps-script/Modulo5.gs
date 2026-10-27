/**
 * SISTEMA HyS · MÓDULO 5 · PLAGAS (Fase 5 de la separación en módulos)
 *
 *   SISTEMA HyS › MÓDULO 5 · PLAGAS
 *     ├ Establecimientos     una carpeta por establecimiento (fotos de F-PLG-01 a 04 cargadas en «Mi establecimiento»)
 *     ├ MIPyV                el libro del registro de los operarios (se mueve acá: conserva su ID, su enlace y su app)
 *     └ Respaldo
 *
 * Dos fuentes, un solo módulo:
 *   1. «Mi establecimiento» (referentes): avisos de aparición, intervenciones, seguimientos y recorridas → BASE COMÚN ›
 *      PLAGAS_CASOS y PLAGAS_REGISTROS (como hasta ahora).
 *   2. Registro MIPyV (operarios de la red Trelew, personal propio): visitas, intervenciones, trabajos de saneamiento y
 *      seguimientos vencidos → su propio libro. El sistema lo LEE (no lo modifica), salvo la marca «revisado_hys» que pone
 *      Higiene y Seguridad desde el panel. Cada lugar de MIPyV se cruza con el sistema por establecimientos › codigo_sistema.
 * Criterio: Dto. 351/79 (higiene de los establecimientos); manejo integrado de plagas y vectores con control físico,
 * químico y ambiental, y saneamiento previo; registro de productos con su hoja de seguridad.
 * Se puede ejecutar más de una vez: lo que ya se movió no se vuelve a tocar.
 */

const MOD5 = {
  SIS: '16AIJZcmxG9EBM3-D-J4vRtvruHK9DVrA',          // Drive › TRABAJO › SISTEMA HyS
  NOMBRE: 'MÓDULO 5 · PLAGAS',
  PROP_EST: 'PLAGAS_EST_CARPETA',                   // carpeta «Establecimientos» del módulo
  PROP_MIPYV: 'MIPYV_LIBRO',                        // libro del registro MIPyV
  MIPYV: '1JFNEftNebLDw0hWRRw1H_Dy7IcJ8RuC8Dpuv9HWeebk',
  // Apps Script del libro MIPyV (el mismo que usa la app de los operarios): calcula los casos abiertos y recibe los cierres (25/10/2026)
  MIPYV_API: 'https://script.google.com/macros/s/AKfycbzLLhU4Zgb7EsqmkBTfHc_oLxd6rJRNzfy33IRmRbrHuvJo9FD7EWqaaahROhr_Jucwrg/exec'
};

// Carpeta de plagas de un establecimiento dentro del módulo (la usa Establecimiento.gs). null si el módulo no está armado.
function plagCarpetaEst_(cod) {
  const id = PropertiesService.getScriptProperties().getProperty(MOD5.PROP_EST); if (!id) return null;
  const vieja = audCarpetaEst_(cod); if (!vieja) return null;
  try { return carpeta_(DriveApp.getFolderById(id), vieja.getName()); } catch (e) { return null; }
}

// ------------------------------------------------------------------ Armado del módulo (ejecutar una vez)
function armarModuloPlagas() {
  const t0 = Date.now(), p = PropertiesService.getScriptProperties();
  const raiz = carpeta_(DriveApp.getFolderById(MOD5.SIS), MOD5.NOMBRE), est = carpeta_(raiz, 'Establecimientos'), dirM = carpeta_(raiz, 'MIPyV');
  carpeta_(raiz, 'Respaldo');
  p.setProperty(MOD5.PROP_EST, est.getId());
  if (!p.getProperty(MOD5.PROP_MIPYV)) p.setProperty(MOD5.PROP_MIPYV, MOD5.MIPYV);
  const log = [];
  // 1. El libro MIPyV pasa a la carpeta del módulo (mismo archivo: la app de los operarios sigue igual)
  try { const f = DriveApp.getFileById(p.getProperty(MOD5.PROP_MIPYV)), ya = (() => { const it = f.getParents(); while (it.hasNext()) if (it.next().getId() === dirM.getId()) return true; return false; })();
    if (!ya) { f.moveTo(dirM); log.push('Libro MIPyV: movido a MÓDULO 5 › MIPyV'); } else log.push('Libro MIPyV: ya estaba'); } catch (e) { log.push('Libro MIPyV: no se pudo mover (' + e.message + ')'); }
  // 2. Las carpetas «Plagas» de cada establecimiento pasan al módulo (cada archivo conserva su enlace)
  const volcar = (origen, destino) => {
    const fs = origen.getFiles(); while (fs.hasNext()) fs.next().moveTo(destino);
    const ds = origen.getFolders(); while (ds.hasNext()) { const d = ds.next(), ya = destino.getFoldersByName(d.getName()); if (ya.hasNext()) volcar(d, ya.next()); else d.moveTo(destino); }
    if (!origen.getFiles().hasNext() && !origen.getFolders().hasNext()) origen.setTrashed(true);
  };
  const sh = pBC_().getSheetByName('ESTABLECIMIENTOS'), H = sh.getRange(5, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
  const cods = pTabla_(sh, H.length).map(r => limpio_(r.v[0])).filter(Boolean);
  let movidos = 0, cortado = false; const problemas = [];
  for (let i = 0; i < cods.length; i++) {
    if (Date.now() - t0 > 4.5 * 60 * 1000) { cortado = true; break; }
    const vieja = audCarpetaEst_(cods[i]); if (!vieja) continue;
    const it = vieja.getFoldersByName('Plagas'); if (!it.hasNext()) continue;
    try { const destino = carpeta_(est, vieja.getName()); while (it.hasNext()) volcar(it.next(), destino); movidos++; } catch (e) { problemas.push(cods[i] + ': ' + e.message); }
  }
  CacheService.getScriptCache().removeAll(['p_resumen', 'p_tablero', 'mipyv']);
  Logger.log((cortado ? 'Se cortó por tiempo: volvé a ejecutar para seguir. ' : 'Listo. ') + log.join(' · ') + ' · Carpetas de plagas movidas: ' + movidos +
    ' establecimientos. Carpeta del módulo: ' + raiz.getUrl() + (problemas.length ? ' · Revisar: ' + problemas.join(' | ') : ''));
}

// ------------------------------------------------------------------ Lectura del registro MIPyV (para el panel)
function plagMipyvLibro_() { const id = PropertiesService.getScriptProperties().getProperty(MOD5.PROP_MIPYV) || MOD5.MIPYV; return SpreadsheetApp.openById(id); }
function plagTabla_(ss, hoja) {   // fila 1 = encabezados
  const sh = ss.getSheetByName(hoja); if (!sh || sh.getLastRow() < 2) return [];
  const v = sh.getRange(1, 1, sh.getLastRow(), sh.getLastColumn()).getValues(), H = v[0].map(h => String(h).trim());
  return v.slice(1).map((r, i) => { const o = { _fila: i + 2 }; H.forEach((h, j) => { if (h) o[h] = r[j] instanceof Date ? Utilities.formatDate(r[j], TZ, "yyyy-MM-dd'T'HH:mm") : r[j]; }); return o; })
    .filter(o => Object.keys(o).some(k => k !== '_fila' && o[k] !== '' && o[k] != null));
}
const plagFecha_ = v => { const s = String(v || ''); if (/^\d{4}-\d{2}-\d{2}T/.test(s) && /Z$/.test(s)) { try { return Utilities.formatDate(new Date(s), TZ, 'yyyy-MM-dd'); } catch (e) {} } return s.slice(0, 10); };

// Visitas (últimos «dias»), intervenciones abiertas, trabajos de saneamiento y seguimientos vencidos, ya cruzados con el sistema
function plagMipyv_(dias) {
  const c = CacheService.getScriptCache(), k = 'mipyv', ya = !dias && c.get(k); if (ya) return JSON.parse(ya);
  const ss = plagMipyvLibro_(), lugares = {};
  plagTabla_(ss, 'establecimientos').forEach(e => lugares[String(e.id_establecimiento).trim()] = { cod: /s\/d/i.test(e.codigo_sistema) ? '' : String(e.codigo_sistema || '').trim(), sitio: /s\/d/i.test(e.sitio_sistema) ? '' : String(e.sitio_sistema || '').trim(), nombre: e.nombre });
  const lug = id => lugares[String(id || '').trim()] || { cod: '', sitio: '', nombre: '' };
  const desde = Utilities.formatDate(new Date(Date.now() - (dias || 90) * 864e5), TZ, 'yyyy-MM-dd');
  const visitas = plagTabla_(ss, 'visitas').map(v => { const l = lug(v.id_establecimiento);
    return { id: v.id_visita, fila: v._fila, fecha: plagFecha_(v.fecha), cod: l.cod, sitio: l.sitio, lugar: v.establecimiento, sector: v.sector, operario: v.operario, acompanante: v.operario_acompanante,
      horario: [v.hora_inicio, v.hora_fin].filter(Boolean).join(' a '), motivo: v.motivo, plaga: v.tipo_plaga, producto: v.producto, dosis: v.dosis_aplicada, epp: v.epp_utilizado, resultado: v.resultado,
      segunda: plagFecha_(v.fecha_2da_intervencion), fotos: String(v.foto_url || '').split(/[\s,|]+/).filter(u => /^https?:/.test(u)), obs: v.observaciones, revisado: v.revisado_hys, protocolo: v.protocolo }; })
    .sort((a, b) => b.fecha.localeCompare(a.fecha));   // 27/10/2026: todo el historial (el portal recorta 90 días donde corresponde)
  const abiertas = plagTabla_(ss, 'intervenciones_mipyv').filter(i => !/cerrad/i.test(i.estado)).map(i => { const l = lug(i.id_establecimiento);
    return { protocolo: i.protocolo, cod: l.cod, sitio: l.sitio, lugar: i.establecimiento, plaga: i.tipo_plaga, desde: plagFecha_(i.fecha_apertura), estado: i.estado, operario: i.operario_apertura }; });
  const saneamiento = plagTabla_(ss, 'trabajos_saneamiento').filter(t => !/cerrad/i.test(t.estado)).map(t => { const l = lug(t.id_establecimiento);
    return { id: t.id_trabajo, cod: l.cod, sitio: l.sitio, lugar: t.establecimiento, desde: plagFecha_(t.fecha_inicio), estado: t.estado, operario: t.operario_inicio }; });
  const vencidos = plagTabla_(ss, 'seguimientos_vencidos').filter(s => s.establecimiento).map(s => ({ fecha: plagFecha_(s.fecha_ultima_visita), lugar: s.establecimiento, sector: s.sector, plaga: s.tipo_plaga, operario: s.operario, protocolo: s.protocolo, vencia: plagFecha_(s.vencia), dias: s.dias_vencido }));
  const sinLugar = Object.keys(lugares).filter(id => !lugares[id].cod).map(id => lugares[id].nombre);
  // Casos, solicitudes y cierres: los calcula el Apps Script del libro MIPyV, con la misma regla que ve la app de los operarios
  let casos = null, solicitudes = null, cierres = null; const api = plagMipyvApi_();
  if (api && Array.isArray(api.casos)) {
    casos = api.casos.map(c => { const l = lug(c.id_establecimiento); return Object.assign({}, c, { cod: l.cod, sitio: l.sitio }); });
  }
  // Solicitudes y cierres: se leen directo del libro (no los publica el Apps Script de MIPyV; los operarios no ven la evaluación)
  const fotos_ = u => String(u || '').split(/[\s,|]+/).filter(x => /^https?:/.test(x));
  const hace = d => Utilities.formatDate(new Date(Date.now() - d * 864e5), TZ, 'yyyy-MM-dd');
  solicitudes = plagTabla_(ss, 'solicitudes').filter(x => x.id_solicitud && (String(x.fecha).slice(0, 10) >= hace(120) || x.estado === 'Pendiente' || x.estado === 'En gestión'))
    .map(x => ({ id: x.id_solicitud, fecha: x.fecha, operario: x.operario, tipo: x.tipo, establecimiento: x.establecimiento, que: x.que, cantidad: x.cantidad, detalle: x.detalle, justificacion: x.justificacion,
      fotos: fotos_(x.foto_url), estado: x.estado || 'Pendiente', respuesta: x.respuesta_hys, fecha_respuesta: x.fecha_respuesta }))
    .sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));
  cierres = plagTabla_(ss, 'cierres_casos').filter(x => x.id_cierre && String(x.fecha).slice(0, 10) >= hace(60))
    .map(x => ({ id: x.id_cierre, fecha: x.fecha, operario: x.operario, protocolo: x.protocolo, establecimiento: x.establecimiento, tipo_plaga: x.tipo_plaga, resultado: x.resultado_cierre, motivo: x.motivo,
      detalle: x.detalle, fotos: fotos_(x.foto_url), origen: x.origen, revisado: x.revisado_hys }))
    .sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));
  // Avances de saneamiento (26/10/2026): lo que hicieron cada día en los trabajos de limpieza y saneamiento, para «Qué hicieron» del portal
  const avances = plagTabla_(ss, 'avances_saneamiento').filter(a => a.id_avance).map(a => { const l = lug(a.id_establecimiento);
    return { id: a.id_avance, trabajo: a.id_trabajo, fecha: plagFecha_(a.fecha), cod: l.cod, sitio: l.sitio, lugar: a.establecimiento, operario: a.operario, acompanante: a.operario_acompanante,
      horario: [a.hora_inicio, a.hora_fin].filter(Boolean).join(' a '), tareas: a.tareas, detalle: a.detalle, notas: a.notas, producto: a.producto_biocida, fotos: fotos_(a.foto_url), cierre: a.cierre }; })
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
  // Otros trabajos de HyS cargados en la app (hoja tareas_hys, 26/10/2026)
  const tareas = plagTabla_(ss, 'tareas_hys').filter(t => t.id_tarea).map(t => { const l = lug(t.id_establecimiento);
    return { id: t.id_tarea, fila: t._fila, fecha: plagFecha_(t.fecha), cod: l.cod, sitio: l.sitio, lugar: t.establecimiento, operario: t.operario, acompanante: t.operario_acompanante,
      horario: [t.hora_inicio, t.hora_fin].filter(Boolean).join(' a '), tipo: t.tipo_tarea, detalle: t.detalle, hallazgos: t.hallazgos, obs: t.observaciones, fotos: fotos_(t.foto_url), revisado: t.revisado_hys }; })
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
  const out = { ok: true, visitas: visitas, avances: avances, tareas: tareas, abiertas: abiertas, saneamiento: saneamiento, vencidos: vencidos, casos: casos, solicitudes: solicitudes, cierres: cierres, apiError: api && api.error || '', sinRevisar: visitas.filter(v => v.fecha >= desde && !/^revisad/i.test(String(v.revisado))).length,
    sinLugar: sinLugar, libro: ss.getUrl(), actualizado: Utilities.formatDate(new Date(), TZ, 'dd/MM/yyyy HH:mm') };
  if (!dias) try { c.put(k, JSON.stringify(out), 600); } catch (e) {}
  return out;
}
// ------------------------------------------------------------------ Casos y solicitudes de MIPyV (25/10/2026)
function plagMipyvApi_(datos) {
  try {
    const op = datos ? { method: 'post', contentType: 'text/plain;charset=utf-8', payload: JSON.stringify(datos), muteHttpExceptions: true, followRedirects: true } : { muteHttpExceptions: true, followRedirects: true };
    const r = UrlFetchApp.fetch(MOD5.MIPYV_API + (datos ? '' : '?para=portal'), op), t = r.getContentText();
    try { return JSON.parse(t); } catch (e) { return { ok: false, error: 'Respuesta no válida del Apps Script de MIPyV (código ' + r.getResponseCode() + ').' }; }
  } catch (e) { return { ok: false, error: 'No se pudo consultar el Apps Script de MIPyV: ' + e.message }; }
}
// Cierre de un caso desde el portal (Resuelto / No resuelto con motivo): lo registra el Apps Script de MIPyV en «cierres_casos»
function plagCerrarCaso_(x, quien) {
  if (!/^(Resuelto|No resuelto)$/.test(x.resultado_cierre)) return { ok: false, mensaje: 'Indicá si quedó resuelto.' };
  if (x.resultado_cierre === 'No resuelto' && !x.motivo) return { ok: false, mensaje: 'Elegí el motivo.' };
  if (x.motivo === 'Otro' && !String(x.detalle || '').trim()) return { ok: false, mensaje: 'Explicá el motivo.' };
  const data = { id_cierre: 'C-' + Date.now(), fecha: new Date().toISOString(), operario: 'Belén Pellegrini (HyS)', protocolo: x.protocolo, alias: x.alias || [x.protocolo], id_ultima_visita: x.id_ultima_visita,
    establecimiento: x.establecimiento, tipo_plaga: x.tipo_plaga, resultado_cierre: x.resultado_cierre, motivo: x.resultado_cierre === 'Resuelto' ? '' : x.motivo, detalle: String(x.detalle || '').trim(), origen: 'Portal HyS (' + (quien || 'HyS') + ')' };
  const r = plagMipyvApi_({ tipo: 'cierre_caso', data: data });
  CacheService.getScriptCache().remove('mipyv');
  return r && r.ok ? { ok: true } : { ok: false, mensaje: (r && (r.error || r.mensaje)) || 'No se pudo registrar el cierre.' };
}
// Asigna un número de protocolo a visitas (une las visitas de un mismo caso). Escribe la columna protocolo de «visitas»
function plagProtocolo_(x) {
  const prot = String(x.protocolo || '').trim(), ids = (x.ids || []).map(String);
  if (!/^\d{1,4}\/\d{4}$/.test(prot)) return { ok: false, mensaje: 'El protocolo va como número/año, por ejemplo 141/2026.' };
  if (!ids.length) return { ok: false, mensaje: 'Elegí al menos una visita.' };
  const ss = plagMipyvLibro_(), sh = ss.getSheetByName('visitas'), H = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(h => String(h).trim());
  const jI = H.indexOf('id_visita'), jP = H.indexOf('protocolo'), jE = H.indexOf('establecimiento'); if (jI < 0 || jP < 0) return { ok: false, mensaje: 'El libro MIPyV no tiene la columna protocolo.' };
  const v = sh.getRange(2, 1, Math.max(1, sh.getLastRow() - 1), H.length).getValues();
  const otros = v.filter(r => String(r[jP]).trim() === prot && ids.indexOf(String(r[jI])) < 0).map(r => String(r[jE]));
  const lugares = Array.from(new Set(v.filter(r => ids.indexOf(String(r[jI])) >= 0).map(r => String(r[jE]))));
  if (otros.length && otros.some(e => lugares.indexOf(e) < 0)) return { ok: false, mensaje: 'El protocolo ' + prot + ' ya se usa en otro lugar (' + Array.from(new Set(otros)).join(', ') + ').' };
  let n = 0; v.forEach((r, i) => { if (ids.indexOf(String(r[jI])) >= 0) { sh.getRange(i + 2, jP + 1).setValue(prot); n++; } });
  CacheService.getScriptCache().remove('mipyv');
  return { ok: true, visitas: n };
}
// Respuesta de HyS a una solicitud de los operarios (la ven en la app)
function plagSolicitudResponder_(x) {
  const estados = ['Pendiente', 'En gestión', 'Atendida', 'No corresponde'];
  if (estados.indexOf(x.estado) < 0) return { ok: false, mensaje: 'Elegí el estado.' };
  const ss = plagMipyvLibro_(), sh = ss.getSheetByName('solicitudes'); if (!sh) return { ok: false, mensaje: 'Todavía no hay solicitudes en el libro MIPyV.' };
  const H = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(h => String(h).trim()), jI = H.indexOf('id_solicitud');
  const c = sh.getRange(2, jI + 1, Math.max(1, sh.getLastRow() - 1), 1).createTextFinder(String(x.id || '')).matchEntireCell(true).findNext();
  if (!c) return { ok: false, mensaje: 'No se encontró la solicitud.' };
  const poner = (col, val) => { const j = H.indexOf(col); if (j >= 0) sh.getRange(c.getRow(), j + 1).setValue(val); };
  poner('estado', x.estado); poner('respuesta_hys', String(x.respuesta || '').trim()); poner('fecha_respuesta', Utilities.formatDate(new Date(), TZ, 'dd/MM/yyyy HH:mm'));
  CacheService.getScriptCache().remove('mipyv');
  return { ok: true };
}

// Marca una visita como revisada por Higiene y Seguridad (única escritura en el libro MIPyV)
function plagRevisar_(x) {
  const ss = plagMipyvLibro_(), sh = ss.getSheetByName('visitas'), H = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(h => String(h).trim());
  const jI = H.indexOf('id_visita'), jR = H.indexOf('revisado_hys'); if (jI < 0 || jR < 0) return { ok: false, mensaje: 'El libro MIPyV no tiene la columna revisado_hys.' };
  const c = sh.getRange(2, jI + 1, Math.max(1, sh.getLastRow() - 1), 1).createTextFinder(String(x.id || '')).matchEntireCell(true).findNext();
  if (!c) return { ok: false, mensaje: 'No se encontró la visita.' };
  const nota = String(x.nota || '').trim();
  sh.getRange(c.getRow(), jR + 1).setValue('Revisado ' + Utilities.formatDate(new Date(), TZ, 'dd/MM/yyyy') + (nota ? ': ' + nota : ''));
  CacheService.getScriptCache().remove('mipyv');
  return { ok: true };
}