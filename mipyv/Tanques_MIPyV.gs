/**
 * MIPyV Red HZT — TANQUES Y CISTERNAS de la red Trelew (sin el HMH) conectados al sistema HyS (28/10/2026, pedido de Belén)
 * Va en el mismo proyecto de Apps Script de la planilla «MIP RED HZT - Base de Datos v2», como archivo aparte (igual que Incendio_MIPyV.gs).
 * Javier y Paulo cargan desde la app MIP › «Tanques y cisternas»:
 *  - el relevamiento de cada tanque o cisterna (alta con sus datos y el primer relevamiento de estado),
 *  - el relevamiento de estado cada 3 meses (inspección visual del POE-AGU-001, punto 10.1),
 *  - cada limpieza, con la foto del formulario F-AGU-01-T firmado (se descarga en PDF desde la app).
 * Todo se guarda en la BASE COMÚN del sistema HyS, en las mismas hojas que usan el Portal HyS y «Mi establecimiento»:
 *  - RESERVORIOS       inventario (código HZT-T01 para tanques, HZT-C01 para cisternas; SITIO = sitio_sistema del lugar de MIPyV),
 *  - AGUA_INSPECCIONES relevamientos de estado (hoja nueva, se crea sola con encabezados en la fila 5),
 *  - AGUA_LIMPIEZAS    limpiezas (PROCEDIMIENTO «POE-AGU-001 (propio)»); actualiza ULTIMA_LIMPIEZA y PROXIMA_LIMPIEZA del tanque.
 * Fotos: Drive › SISTEMA HyS › MÓDULO 3 · AGUA › Establecimientos › HZT · … › Tanques y cisternas (MIPyV) › año.
 * Lugares: los de la hoja establecimientos activos, menos los de codigo_sistema HMH (los tanques del HMH los lleva el sistema HyS)
 *   y los de la lista TQ_SIN_TANQUES (por ahora, Ambulancias). Los lugares que están en el mismo edificio comparten tanques
 *   (INC_SITIO_ALIAS de Incendio_MIPyV.gs: Internación Salud Mental, PROSATE y Consultorios Externos → Sede ex ADOS).
 * Si la app reintenta un envío que ya había llegado, no se duplica (marca [id] en OBSERVACIONES o ID en AGUA_INSPECCIONES).
 * No envía correos.
 * Normativa: POE-AGU-001 (HySL HZT/HMH, v01, vigencia 03/09/2026); Ord. Trelew 12695/17 mod. 13422 (limpieza al menos anual);
 *   Ley 19.587 y Dto. 351/79 arts. 57-58; Res. SRT 953/2010 (espacios confinados).
 */
const TQ_BC_ID = '1rjKzrfo3KGTyKgyaCEKV0B15ZSi8b1j0zIAY8wAgYwQ';         // BASE COMÚN · Sistema HyS
const TQ_CARPETA_EST = '1QDQ6gbcPVc1A_I1UfDeXlQ3RG-sj6vjV';               // Drive › MÓDULO 3 · AGUA › Establecimientos
const TQ_SIN_TANQUES = ['AMB'];                                          // lugares de MIPyV sin tanques propios
const TQ_COD_EXCLUIDOS = ['HMH'];                                        // pedido de Belén: el HMH no entra en esta sección
const TQ_INSP_MESES = 3;                                                 // relevamiento de estado cada 3 meses (POE-AGU-001, 10.1)
const TQ_INSP_H = ['ID', 'FECHA', 'ESTABLECIMIENTO', 'SITIO', 'CODIGO_TANQUE', 'TAPA', 'FISURAS', 'OXIDO', 'SEDIMENTO', 'OLOR_TURBIDEZ', 'FLOTANTE_OK',
  'VENTILACION_MALLA', 'INSECTOS', 'ACCESO_SEGURO', 'CLORO_MG_L', 'RESULTADO', 'PROXIMA_INSPECCION', 'FOTOS', 'QUIEN', 'CARGADO', 'OBSERVACIONES'];
// Preguntas del relevamiento: [campo, respuesta que está bien, qué hace falta si no]
const TQ_PREG = [['FISURAS', 'No', 'reparación'], ['OXIDO', 'No', 'reparación'], ['SEDIMENTO', 'No', 'limpieza'], ['OLOR_TURBIDEZ', 'No', 'limpieza'],
  ['FLOTANTE_OK', 'Sí', 'reparación'], ['VENTILACION_MALLA', 'Sí', 'reparación'], ['INSECTOS', 'No', 'limpieza'], ['ACCESO_SEGURO', 'Sí', 'reparación']];
const TQ_TEXTO = { FISURAS: 'fisuras o pérdidas', OXIDO: 'óxido o deterioro', SEDIMENTO: 'barro o sedimento', OLOR_TURBIDEZ: 'olor o turbidez',
  FLOTANTE_OK: 'flotante o válvulas con fallas', VENTILACION_MALLA: 'ventilación sin malla', INSECTOS: 'insectos o restos de animales', ACCESO_SEGURO: 'acceso inseguro' };

const tqNorm_ = (s) => String(s == null ? '' : s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
const tqIso_ = (v) => v instanceof Date ? Utilities.formatDate(v, ZONA_HORARIA, 'yyyy-MM-dd') : String(v || '').trim().slice(0, 10);
const tqHoy_ = () => Utilities.formatDate(new Date(), ZONA_HORARIA, 'yyyy-MM-dd');
function tqMeses_(iso, m) { if (!/^\d{4}-\d{2}-\d{2}$/.test(iso || '')) return ''; const d = new Date(iso + 'T12:00:00'); d.setMonth(d.getMonth() + Number(m)); return Utilities.formatDate(d, ZONA_HORARIA, 'yyyy-MM-dd'); }
const tqQuien_ = (data) => String(data.operario || 'Operario MIPyV') + (data.operario_acompanante ? ' (con ' + data.operario_acompanante + ')' : '') + ' · MIPyV';
function tqSitio_(s) { const a = typeof INC_SITIO_ALIAS !== 'undefined' ? INC_SITIO_ALIAS : {}; return a[tqNorm_(s)] || String(s || '').trim(); }

// Hoja de la BASE COMÚN con encabezados en la fila 5 → { sh, H, filas:[{_fila, campo: valor}] }
function tqTabla_(nombre, crearCon) {
  const bc = SpreadsheetApp.openById(TQ_BC_ID); let sh = bc.getSheetByName(nombre);
  if (!sh) {
    if (!crearCon) throw new Error('Falta la hoja ' + nombre + ' en la BASE COMÚN.');
    sh = bc.insertSheet(nombre);
    sh.getRange(1, 1).setValue(nombre + ' · Relevamiento de estado de tanques y cisternas').setFontWeight('bold').setFontSize(13);
    sh.getRange(2, 1).setValue('Una fila por relevamiento (inspección visual cada 3 meses, POE-AGU-001 punto 10.1). La carga la app MIP (Javier y Paulo). Respuestas Sí / No; RESULTADO: Conforme, Requiere limpieza, Requiere reparación o Requiere limpieza y reparación. Si falta un dato: s/d.').setFontStyle('italic');
    sh.getRange(5, 1, 1, crearCon.length).setValues([crearCon]).setFontWeight('bold').setFontColor('#FFFFFF').setBackground('#0D313F');
    sh.setFrozenRows(5);
  }
  const H = sh.getRange(5, 1, 1, sh.getLastColumn()).getValues()[0].map(String), n = sh.getLastRow() - 5;
  const filas = n < 1 ? [] : sh.getRange(6, 1, n, H.length).getValues().map((r, i) => { const o = { _fila: 6 + i }; H.forEach((h, j) => o[h] = r[j]); return o; }).filter((o) => o[H[0]]);
  return { sh: sh, H: H, filas: filas };
}
const tqAgregar_ = (T, o) => T.sh.getRange(Math.max(T.sh.getLastRow(), 5) + 1, 1, 1, T.H.length).setValues([T.H.map((h) => o[h] == null ? '' : o[h])]);
const tqCambiar_ = (T, fila, o) => Object.keys(o).forEach((k) => { const j = T.H.indexOf(k); if (j >= 0) T.sh.getRange(fila, j + 1).setValue(o[k]); });

// Lugares de MIPyV que entran en la sección (id, nombre, código y sitio del sistema)
function tqLugares_(ss) {
  const ev = ss.getSheetByName('establecimientos').getDataRange().getValues(), eh = ev[0];
  const c = (k) => eh.indexOf(k);
  return ev.slice(1).filter((r) => r[c('id_establecimiento')] && /^si/i.test(String(r[c('activo')] || '').trim())).map((r) => ({
    id: String(r[c('id_establecimiento')]).trim(), nombre: String(r[c('nombre')] || '').trim(), tipo: String(r[c('tipo')] || '').trim(),
    cod: String(r[c('codigo_sistema')] || '').trim(), sitio: tqSitio_(r[c('sitio_sistema')]) }))
    .filter((l) => l.cod && l.sitio && TQ_COD_EXCLUIDOS.indexOf(l.cod) < 0 && TQ_SIN_TANQUES.indexOf(l.id) < 0);
}
function tqLugar_(ss, id) { const l = tqLugares_(ss).find((x) => x.id === String(id || '').trim()); if (!l) throw new Error('El lugar ' + id + ' no está habilitado para tanques y cisternas.'); return l; }

// Lo que manda doGet: lugares y tanques (con su última inspección y limpieza)
function tanquesParaApp_(ss) {
  const L = tqLugares_(ss), porSitio = {};
  L.forEach((l) => { const k = l.cod + '|' + tqNorm_(l.sitio); (porSitio[k] = porSitio[k] || []).push(l.id); });
  const R = tqTabla_('RESERVORIOS'), I = tqTabla_('AGUA_INSPECCIONES', TQ_INSP_H), ultI = {};
  I.filas.forEach((x) => { const k = String(x.CODIGO_TANQUE), f = tqIso_(x.FECHA); if (!ultI[k] || f >= ultI[k].fecha) ultI[k] = { fecha: f, resultado: String(x.RESULTADO || ''), proxima: tqIso_(x.PROXIMA_INSPECCION) }; });
  const tanques = R.filas.filter((t) => !/fuera/i.test(t.ESTADO) && TQ_COD_EXCLUIDOS.indexOf(String(t.ESTABLECIMIENTO).trim()) < 0).map((t) => {
    const lug = porSitio[String(t.ESTABLECIMIENTO).trim() + '|' + tqNorm_(tqSitio_(t.SITIO))] || [], i = ultI[String(t.CODIGO_TANQUE)] || {};
    const ult = tqIso_(t.ULTIMA_LIMPIEZA);
    return { codigo: String(t.CODIGO_TANQUE), lugares: lug, sitio: String(t.SITIO || ''), ubicacion: String(t.UBICACION || ''), tipo: String(t.TIPO || ''), uso: String(t.USO || ''),
      capacidad: String(t.CAPACIDAD_L || ''), material: String(t.MATERIAL || ''), tapa: String(t.TAPA || ''), acceso: String(t.ACCESO || ''),
      ultima_limpieza: ult, proxima_limpieza: tqIso_(t.PROXIMA_LIMPIEZA) || tqMeses_(ult, Number(t.FRECUENCIA_LIMPIEZA_MESES) || 12),
      ultima_insp: i.fecha || '', resultado_insp: i.resultado || '', proxima_insp: i.proxima || '' };
  }).filter((t) => t.lugares.length);
  return { lugares: L.map((l) => ({ id: l.id, nombre: l.nombre, tipo: l.tipo })), tanques: tanques, hoy: tqHoy_(), meses_inspeccion: TQ_INSP_MESES };
}

// Carpeta de fotos: MÓDULO 3 · AGUA › Establecimientos › «HZT · …» › Tanques y cisternas (MIPyV) › año
function tqCarpeta_(cod, anio) {
  const raiz = DriveApp.getFolderById(TQ_CARPETA_EST); let dir = null; const it = raiz.getFolders();
  while (it.hasNext()) { const f = it.next(); if (f.getName() === cod || f.getName().indexOf(cod + ' · ') === 0) { dir = f; break; } }
  if (!dir) dir = raiz.createFolder(cod === 'HZT' ? 'HZT · Hospital Zonal Trelew' : cod);
  return subcarpeta(subcarpeta(dir, 'Tanques y cisternas (MIPyV)'), String(anio));
}
// Guarda las fotos (no duplica si ya estaban) y devuelve el enlace: el de la foto si es una sola, el de su carpeta si son varias
function tqFotos_(data, cod, fecha, nombreBase, minimo) {
  const fotos = listaDeFotos(data).slice(0, 5);
  if (fotos.length < (minimo || 0)) throw new Error(minimo === 1 ? 'Falta la foto.' : 'Faltan fotos (mínimo ' + minimo + ').');
  if (!fotos.length) return '';
  let dir = tqCarpeta_(cod, fecha.slice(0, 4));
  if (fotos.length > 1) dir = subcarpeta(dir, nombreBase);
  const links = fotos.map((b64, i) => {
    const nombre = nombreBase + (fotos.length > 1 ? ' (' + (i + 1) + ')' : '') + '.jpg', previo = dir.getFilesByName(nombre);
    if (previo.hasNext()) return previo.next().getUrl();
    const m = String(b64).match(/^data:([^;]+);base64,(.*)$/);
    return dir.createFile(Utilities.newBlob(Utilities.base64Decode(m ? m[2] : String(b64)), m ? m[1] : 'image/jpeg', nombre)).getUrl();
  });
  return fotos.length > 1 ? dir.getUrl() : links[0];
}

// Evalúa el relevamiento: resultado y lista de problemas
function tqEvaluar_(data) {
  const faltan = TQ_PREG.filter(([k]) => !/^(Sí|No)$/.test(data[k] || '')).map(([k]) => k);
  if (!/^(Sí, en condiciones|Deficiente|No tiene)$/.test(data.TAPA || '')) faltan.unshift('TAPA');
  if (faltan.length) throw new Error('Faltan respuestas: ' + faltan.join(', '));
  let limpiar = false, reparar = data.TAPA !== 'Sí, en condiciones'; const prob = reparar ? ['tapa ' + data.TAPA.toLowerCase()] : [];
  TQ_PREG.forEach(([k, bien, que]) => { if (data[k] !== bien) { prob.push(TQ_TEXTO[k]); if (que === 'limpieza') limpiar = true; else reparar = true; } });
  const cl = String(data.CLORO_MG_L == null ? '' : data.CLORO_MG_L).replace(',', '.').trim();
  if (cl !== '' && !isNaN(Number(cl)) && (Number(cl) < 0.2 || Number(cl) > 2)) { limpiar = true; prob.push('cloro fuera de rango (' + cl.replace('.', ',') + ' mg/L)'); }
  const resultado = limpiar && reparar ? 'Requiere limpieza y reparación' : limpiar ? 'Requiere limpieza' : reparar ? 'Requiere reparación' : 'Conforme';
  return { resultado: resultado, problemas: prob, cloro: cl === '' ? '' : cl.replace('.', ',') };
}
function tqGuardarInspeccion_(I, data, t, quien, fecha, idInsp) {
  const ev = tqEvaluar_(data);
  const fotos = tqFotos_(data, String(t.ESTABLECIMIENTO).trim(), fecha, fecha + ' · ' + t.CODIGO_TANQUE + ' · Relevamiento', 1);
  const o = { ID: idInsp, FECHA: fecha, ESTABLECIMIENTO: String(t.ESTABLECIMIENTO).trim(), SITIO: t.SITIO, CODIGO_TANQUE: t.CODIGO_TANQUE, TAPA: data.TAPA,
    CLORO_MG_L: ev.cloro || 's/d', RESULTADO: ev.resultado, PROXIMA_INSPECCION: tqMeses_(fecha, TQ_INSP_MESES), FOTOS: fotos, QUIEN: quien, CARGADO: new Date(),
    OBSERVACIONES: [ev.problemas.length ? 'Problemas: ' + ev.problemas.join('; ') + '.' : '', String(data.OBSERVACIONES || '').trim()].filter(Boolean).join(' ') };
  TQ_PREG.forEach(([k]) => o[k] = data[k]);
  tqAgregar_(I, o);
  return ev;
}

// Punto de entrada desde doPost (Código.gs)
function guardarTanqueMipyv_(tipo, data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet(), quien = tqQuien_(data), hoyD = new Date(), marcaFecha = Utilities.formatDate(hoyD, ZONA_HORARIA, 'dd/MM/yyyy');
  const fecha = /^\d{4}-\d{2}-\d{2}/.test(data.FECHA || '') ? data.FECHA.slice(0, 10) : tqIso_(data.fecha ? new Date(data.fecha) : hoyD);
  const R = tqTabla_('RESERVORIOS');
  const buscar = (c) => R.filas.find((x) => String(x.CODIGO_TANQUE) === String(c || ''));

  if (tipo === 'alta_tanque') {   // relevamiento de un tanque nuevo: datos + primer relevamiento de estado
    if (!data.id_alta) throw new Error('Falta el identificador del alta.');
    const marca = '[' + data.id_alta + ']', ya = R.filas.find((x) => String(x.OBSERVACIONES || '').indexOf(marca) >= 0);
    if (ya) return { duplicado: true, codigo: ya.CODIGO_TANQUE };
    const l = tqLugar_(ss, data.lugar_id);
    const req = ['UBICACION', 'TIPO', 'USO', 'CAPACIDAD_L', 'ACCESO']; const falt = req.filter((k) => !String(data[k] || '').trim()); if (falt.length) throw new Error('Faltan datos del tanque: ' + falt.join(', '));
    tqEvaluar_(data);   // valida las respuestas antes de crear nada
    const letra = /cisterna/i.test(data.TIPO) ? 'C' : 'T', pref = l.cod + '-' + letra;
    const n = R.filas.filter((x) => String(x.CODIGO_TANQUE).indexOf(pref) === 0).reduce((m, x) => Math.max(m, Number(String(x.CODIGO_TANQUE).slice(pref.length)) || 0), 0) + 1;
    const codigo = pref + ('0' + n).slice(-2);
    const ult = /^\d{4}-\d{2}-\d{2}$/.test(data.ULTIMA_LIMPIEZA || '') ? data.ULTIMA_LIMPIEZA : '';
    const o = { CODIGO_TANQUE: codigo, ESTABLECIMIENTO: l.cod, SITIO: l.sitio, UBICACION: String(data.UBICACION).trim(), TIPO: data.TIPO, USO: data.USO,
      CAPACIDAD_L: String(data.CAPACIDAD_L).replace(/[^\d]/g, '') || 's/d', MATERIAL: String(data.MATERIAL || '').trim() || 's/d', TAPA: data.TAPA, ACCESO: data.ACCESO,
      QUIEN_LIMPIA: 'Operarios MIPyV (Javier y Paulo Tramaleo)', FRECUENCIA_LIMPIEZA_MESES: 12, ULTIMA_LIMPIEZA: ult || '', PROXIMA_LIMPIEZA: ult ? tqMeses_(ult, 12) : '',
      ESTADO: 'Activo', OBSERVACIONES: ('Alta ' + marcaFecha + ' · ' + quien + ' (lugar: ' + l.nombre + ') ' + marca + '. ' + (ult ? '' : 'Última limpieza: s/d. ') + String(data.OBS_TANQUE || '').trim()).trim(),
      ACTUALIZADO: tqHoy_() };
    tqAgregar_(R, o);
    const ev = tqGuardarInspeccion_(tqTabla_('AGUA_INSPECCIONES', TQ_INSP_H), data, o, quien, fecha, 'INS-' + data.id_alta);
    return { codigo: codigo, resultado: ev.resultado };
  }

  if (tipo === 'editar_tanque') {   // corrección de datos del tanque (queda anotada en OBSERVACIONES)
    if (!data.id_edit) throw new Error('Falta el identificador de la corrección.');
    const t = buscar(data.CODIGO_TANQUE); if (!t) throw new Error('El tanque ' + data.CODIGO_TANQUE + ' no está en la BASE COMÚN.');
    const marca = '[' + data.id_edit + ']'; if (String(t.OBSERVACIONES || '').indexOf(marca) >= 0) return { duplicado: true };
    const nombres = { UBICACION: 'Ubicación', TIPO: 'Tipo', USO: 'Uso', CAPACIDAD_L: 'Capacidad', MATERIAL: 'Material', TAPA: 'Tapa', ACCESO: 'Acceso', ESTADO: 'Estado' };
    const cambios = {}, dif = [];
    Object.keys(nombres).forEach((k) => { if (!(k in data)) return; const v = String(data[k] == null ? '' : data[k]).trim(); if (!v || tqNorm_(v) === tqNorm_(t[k])) return; cambios[k] = k === 'CAPACIDAD_L' ? v.replace(/[^\d]/g, '') : v; dif.push(nombres[k] + ': «' + (String(t[k] || '').trim() || '—') + '» → «' + v + '»'); });
    cambios.OBSERVACIONES = (String(t.OBSERVACIONES || '') + '\n' + marcaFecha + ' · ' + quien + ': ' + (dif.join('; ') || 'sin cambios') + ' ' + marca).trim().slice(0, 3000);
    cambios.ACTUALIZADO = tqHoy_();
    tqCambiar_(R, t._fila, cambios);
    return { cambios: dif.length };
  }

  if (tipo === 'inspeccion_tanque') {   // relevamiento de estado cada 3 meses
    if (!data.id_insp) throw new Error('Falta el identificador del relevamiento.');
    const I = tqTabla_('AGUA_INSPECCIONES', TQ_INSP_H);
    if (I.filas.some((x) => String(x.ID) === String(data.id_insp))) return { duplicado: true };
    const t = buscar(data.CODIGO_TANQUE); if (!t) throw new Error('El tanque ' + data.CODIGO_TANQUE + ' no está en la BASE COMÚN.');
    const ev = tqGuardarInspeccion_(I, data, t, quien, fecha, data.id_insp);
    const c = { ACTUALIZADO: tqHoy_() }; if (data.TAPA && data.TAPA !== t.TAPA) c.TAPA = data.TAPA;
    tqCambiar_(R, t._fila, c);
    return { resultado: ev.resultado };
  }

  if (tipo === 'limpieza_tanque') {   // limpieza con la foto del F-AGU-01-T firmado
    if (!data.id_limpieza) throw new Error('Falta el identificador de la limpieza.');
    const t = buscar(data.CODIGO_TANQUE); if (!t) throw new Error('El tanque ' + data.CODIGO_TANQUE + ' no está en la BASE COMÚN.');
    const Lm = tqTabla_('AGUA_LIMPIEZAS'), marca = '[' + data.id_limpieza + ']';
    const ya = Lm.filas.find((x) => String(x.OBSERVACIONES || '').indexOf(marca) >= 0); if (ya) return { duplicado: true, id: ya.ID };
    const cod = String(t.ESTABLECIMIENTO).trim(), pref = 'LIM-' + cod + '-' + fecha.slice(0, 4) + '-';
    const n = Lm.filas.filter((x) => String(x.ID).indexOf(pref) === 0).reduce((m, x) => Math.max(m, Number(String(x.ID).slice(pref.length)) || 0), 0) + 1;
    const id = pref + ('00' + n).slice(-3);
    const archivo = tqFotos_(data, cod, fecha, fecha + ' · ' + t.CODIGO_TANQUE + ' · Limpieza F-AGU-01-T', 1);
    const cl = String(data.CLORO_PPM == null ? '' : data.CLORO_PPM).replace('.', ',').trim();
    tqAgregar_(Lm, { ID: id, FECHA: fecha, ESTABLECIMIENTO: cod, CODIGO_TANQUE: t.CODIGO_TANQUE, PROCEDIMIENTO: 'POE-AGU-001 (propio) · F-AGU-01-T',
      HORA_CORTE: data.HORA_CORTE || '', HORA_REHABILITACION: data.HORA_REHABILITACION || '', HORAS_CERRADO: data.HORAS_CERRADO || '',
      DESINFECTANTE: 'Lavandina 5,5 % (2 L cada 1.000 L)', CONCENTRACION_GL: 55, VOLUMEN_L: data.VOLUMEN_L || '', CLORO_PPM: cl || 's/d', TURBIDEZ_NTU: '',
      TAPA: data.TAPA || t.TAPA, MUESTRA_TOMADA: data.MUESTRA_TOMADA || '', ARCHIVO: archivo, CARGO: quien, CARGADO: tqHoy_(),
      OBSERVACIONES: ((String(data.OBSERVACIONES || '').trim() ? String(data.OBSERVACIONES).trim() + ' · ' : '') + 'Cargado desde MIPyV ' + marca + '.') });
    const ant = tqIso_(t.ULTIMA_LIMPIEZA), c = { ACTUALIZADO: tqHoy_() };
    if (!ant || ant <= fecha) { c.ULTIMA_LIMPIEZA = fecha; c.PROXIMA_LIMPIEZA = tqMeses_(fecha, Number(t.FRECUENCIA_LIMPIEZA_MESES) || 12); }
    if (data.TAPA) c.TAPA = data.TAPA;
    tqCambiar_(R, t._fila, c);
    return { id: id, proxima: c.PROXIMA_LIMPIEZA || '' };
  }
  throw new Error('Tipo de registro de tanques desconocido: ' + tipo);
}
