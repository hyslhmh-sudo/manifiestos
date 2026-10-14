/**
 * MIPyV Red HZT — Control de extintores conectado al MÓDULO 10 del sistema HyS (14/10/2026)
 * Va en el mismo proyecto de Apps Script de la planilla «MIP RED HZT - Base de Datos v2», como archivo aparte.
 *  - extintoresParaApp_(ss): la lista de extintores del sistema HyS (planilla «PROTECCIÓN CONTRA INCENDIOS · Sistema HyS»,
 *    hoja EXTINTORES), con los lugares de MIPyV donde están (hoja establecimientos › codigo_sistema y sitio_sistema).
 *    La manda doGet junto con los catálogos.
 *  - guardarControlExtintor_(data): el control mensual de un extintor que manda la app (5 respuestas y 3 fotos).
 *    Guarda las fotos en Drive › SISTEMA HyS › MÓDULO 10 › Establecimientos › establecimiento › Controles › año-mes,
 *    agrega la fila en CONTROLES (con el comentario opcional) y actualiza el último control del extintor. No duplica si la app reintenta.
 *  - guardarAltaExtintor_(data): un extintor que no estaba en la lista y Javier agregó desde la app (todos los datos y 3 fotos
 *    obligatorios). Lo suma a EXTINTORES con un ID nuevo (EXT-establecimiento-NNN); las fotos van a … › establecimiento › Altas › año-mes.
 *    Si el N.º de inventario ya estaba cargado, lo agrega igual y deja «Revisar» en Observaciones. No duplica si la app reintenta.
 *  - guardarEdicionExtintor_(data): corrección del nombre (N.º) y la ubicación (lugar, planta, sector, ubicación) de un extintor.
 *    El cambio se anota en CAMBIOS y el extintor queda «Pendiente» en VERIFICACION hasta que Belén lo verifica en el portal.
 *    Si el lugar nuevo es de otro establecimiento, no lo mueve: lo anota para que lo revise HyS.
 * Aviso por correo: si un control queda con algo en «No» y el lugar tiene CORREOS_FALLA en SITIOS_INC (hoy HMH: SOMI y Mantenimiento),
 *    deja el problema abierto en la hoja FALLAS del sistema HyS, que manda un solo correo por día con todos los extintores con problemas
 *    y, mientras sigan abiertos, cada 3 días (no manda un correo por extintor). Regla de Belén 14/10/2026.
 * Normativa: Ley 19.587; Dto. 351/79, cap. 18.
 */
const INC_LIBRO_ID = '10lyFIV8UDQGGiNu3DegHiyxqR5xinSgn82XFmO5VWw0';   // PROTECCIÓN CONTRA INCENDIOS · Sistema HyS
const INC_CARPETA_ID = '1hbRoTsXpKp6vMtz_2Lv4XcuuWdsv8yOV';           // Drive › SISTEMA HyS › MÓDULO 10 · PROTECCIÓN CONTRA INCENDIOS
const INC_PREGUNTAS = ['EN_LUGAR', 'ACCESO_LIBRE', 'MANOMETRO', 'PRECINTO', 'SENALIZACION'];
const INC_FOTOS = [['FOTO_PANORAMICA', 'Panorámica'], ['FOTO_MARBETE', 'Marbete'], ['FOTO_INVENTARIO', 'N.º de inventario']];
// Lugares de MIPyV que en el sistema HyS están dentro de otro sitio (sitio_sistema → sitio del módulo 10)
const INC_SITIO_ALIAS = { 'casa tutelada': 'Casa de convivencia', 'internacion salud mental': 'Sede ex ADOS', 'prosate': 'Sede ex ADOS', 'consultorios externos': 'Sede ex ADOS' };

const incNorm_ = (s) => String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
const incIso_ = (v) => v instanceof Date ? Utilities.formatDate(v, ZONA_HORARIA, 'yyyy-MM-dd') : String(v || '').slice(0, 10);
function incTabla_(sh) {   // encabezados en la fila 5, datos desde la 6 (formato del sistema HyS)
  const H = sh.getRange(5, 1, 1, sh.getLastColumn()).getValues()[0].map(String), n = sh.getLastRow() - 5;
  if (n < 1) return { H: H, filas: [] };
  const v = sh.getRange(6, 1, n, H.length).getValues();
  return { H: H, filas: v.map((r, i) => { const o = { _fila: 6 + i }; H.forEach((h, j) => o[h] = r[j]); return o; }).filter((o) => o[H[0]]) };
}

function extintoresParaApp_(ss) {
  const est = ss.getSheetByName('establecimientos'); if (!est) return [];
  const ev = est.getDataRange().getValues(), eh = ev[0];
  const cId = eh.indexOf('id_establecimiento'), cCod = eh.indexOf('codigo_sistema'), cSit = eh.indexOf('sitio_sistema'), cAct = eh.indexOf('activo');
  const porSitio = {};   // "HZT|sede ex ados" → [id MIPyV]
  ev.slice(1).forEach((r) => {
    if (!r[cId] || String(r[cAct] || '').toUpperCase().indexOf('SI') !== 0) return;
    const sit = INC_SITIO_ALIAS[incNorm_(r[cSit])] || r[cSit], k = String(r[cCod]).trim() + '|' + incNorm_(sit);
    (porSitio[k] = porSitio[k] || []).push(String(r[cId]).trim());
  });
  const T = incTabla_(SpreadsheetApp.openById(INC_LIBRO_ID).getSheetByName('EXTINTORES'));
  return T.filas.filter((e) => !/baja/i.test(e.ESTADO)).map((e) => ({
    id: String(e.ID), lugares: porSitio[String(e.ESTABLECIMIENTO).trim() + '|' + incNorm_(e.SITIO)] || [],
    nro: String(e.NRO_EXTINTOR || ''), planta: String(e.PLANTA || ''), sector: String(e.SECTOR || ''), ubicacion: String(e.UBICACION || ''),
    tipo: String(e.TIPO || ''), kg: String(e.CAPACIDAD_KG || ''), inv: String(e.NRO_INVENTARIO || ''), vto: incIso_(e.VTO_CARGA), ph: incIso_(e.PRUEBA_HIDRAULICA_VENCE), ultimo: incIso_(e.ULTIMO_CONTROL),
  })).filter((e) => e.lugares.length);
}

function incCarpetaControles_(cod, mes, sub) {
  const raiz = subcarpeta(DriveApp.getFolderById(INC_CARPETA_ID), 'Establecimientos');
  let dir = null; const it = raiz.getFolders();
  while (it.hasNext()) { const f = it.next(); if (f.getName() === cod || f.getName().indexOf(cod + ' · ') === 0) { dir = f; break; } }
  if (!dir) dir = raiz.createFolder(cod);
  return subcarpeta(subcarpeta(dir, sub || 'Controles'), mes);
}

function guardarControlExtintor_(data) {
  if (!data.ID_EXTINTOR || !data.id_control) throw new Error('Falta el extintor.');
  const libro = SpreadsheetApp.openById(INC_LIBRO_ID), shC = libro.getSheetByName('CONTROLES'), shE = libro.getSheetByName('EXTINTORES');
  const C = incTabla_(shC);
  if (C.filas.some((c) => String(c.ID) === String(data.id_control))) return { duplicado: true };   // la app reintentó
  const E = incTabla_(shE), e = E.filas.find((x) => String(x.ID) === String(data.ID_EXTINTOR));
  if (!e) throw new Error('El extintor ' + data.ID_EXTINTOR + ' no está en el sistema HyS.');
  const faltan = INC_PREGUNTAS.filter((k) => !/^(Sí|No)$/.test(data[k] || ''));
  if (faltan.length) throw new Error('Faltan respuestas: ' + faltan.join(', '));
  const fotos = listaDeFotos(data); if (fotos.length < 3) throw new Error('Faltan fotos (son 3).');
  const fecha = new Date(data.fecha || new Date()), mes = Utilities.formatDate(fecha, ZONA_HORARIA, 'yyyy-MM'), cod = String(e.ESTABLECIMIENTO).trim();
  const carpeta = incCarpetaControles_(cod, mes), links = {};
  INC_FOTOS.forEach(([k, et], i) => {
    const nombre = data.id_control + ' · ' + e.ID + (e.NRO_EXTINTOR ? ' n.º ' + e.NRO_EXTINTOR : '') + ' · ' + et + '.jpg';
    const previo = carpeta.getFilesByName(nombre);
    if (previo.hasNext()) { links[k] = previo.next().getUrl(); return; }
    const m = String(fotos[i]).match(/^data:([^;]+);base64,(.*)$/);
    links[k] = carpeta.createFile(Utilities.newBlob(Utilities.base64Decode(m ? m[2] : String(fotos[i])), m ? m[1] : 'image/jpeg', nombre)).getUrl();
  });
  // Vencimientos leídos en la tarjeta (pedido de Belén 14/10/2026): carga (o «no se lee») y prueba hidráulica si figura
  const fIso = (v) => /^\d{4}-\d{2}-\d{2}/.test(String(v || '')) ? String(v).slice(0, 10) : '', vto = fIso(data.VTO_CARGA), ph = fIso(data.PRUEBA_HIDRAULICA_VENCE);
  const noSeLee = /^s\/d/i.test(String(data.VTO_CARGA || '')), hoyIso = Utilities.formatDate(fecha, ZONA_HORARIA, 'yyyy-MM-dd'), vencida = !!vto && vto < hoyIso;
  const dFecha = (iso) => new Date(iso + 'T12:00:00');
  const resultado = INC_PREGUNTAS.every((k) => data[k] === 'Sí') && !vencida && !noSeLee ? 'Conforme' : 'Con observaciones';
  const quien = String(data.operario || 'Operario MIPyV') + (data.operario_acompanante ? ' (con ' + data.operario_acompanante + ')' : '') + ' · MIPyV';
  const fila = { ID: data.id_control, FECHA: fecha, ESTABLECIMIENTO: cod, SITIO: e.SITIO, ID_EXTINTOR: e.ID, RESULTADO: resultado,
    OBSERVACIONES: (String(data.OBSERVACIONES || '').trim() ? String(data.OBSERVACIONES).trim() + ' · ' : '') + 'Cargado desde MIPyV (tarea ' + (data.id_tarea || 's/d') + ').', QUIEN: quien, CARGADO: new Date(), ESTADO: 'Vigente',
    VTO_CARGA: vto ? dFecha(vto) : noSeLee ? 's/d (no se lee)' : '', PRUEBA_HIDRAULICA_VENCE: ph ? dFecha(ph) : '', PROBLEMAS: [vencida ? 'Carga vencida' : '', noSeLee ? 'Sin tarjeta (marbete) o ilegible' : ''].filter(Boolean).join(' · ') };
  INC_PREGUNTAS.forEach((k) => fila[k] = data[k]); Object.assign(fila, links);
  shC.getRange(Math.max(shC.getLastRow(), 5) + 1, 1, 1, C.H.length).setValues([C.H.map((h) => fila[h] == null ? '' : fila[h])]);
  // Último control del extintor (si este es el más reciente)
  const ult = e.ULTIMO_CONTROL instanceof Date ? e.ULTIMO_CONTROL : null;
  if (!ult || ult <= fecha) {
    const com = String(data.OBSERVACIONES || '').trim();
    const cambios = Object.assign({ ULTIMO_CONTROL: fecha, RESULTADO_CONTROL: resultado + ' (MIPyV)' + (com ? ': ' + com : ''), ACTUALIZADO: new Date() }, links);
    const antes = (v) => v instanceof Date ? Utilities.formatDate(v, ZONA_HORARIA, 'yyyy-MM-dd') : String(v || ''), dif = [];
    if (vto && antes(e.VTO_CARGA) !== vto) { cambios.VTO_CARGA = dFecha(vto); dif.push('Vencimiento de la carga: «' + (antes(e.VTO_CARGA) || '—') + '» → «' + vto + '»'); }
    if (ph && antes(e.PRUEBA_HIDRAULICA_VENCE) !== ph) { cambios.PRUEBA_HIDRAULICA_VENCE = dFecha(ph); dif.push('Prueba hidráulica: «' + (antes(e.PRUEBA_HIDRAULICA_VENCE) || '—') + '» → «' + ph + '»'); }
    if (dif.length) cambios.CAMBIOS = (Utilities.formatDate(new Date(), ZONA_HORARIA, 'dd/MM/yyyy') + ' · ' + quien + ' (control): ' + dif.join('; ') + (e.CAMBIOS ? '\n' + e.CAMBIOS : '')).slice(0, 2000);
    Object.keys(cambios).forEach((k) => { const j = E.H.indexOf(k); if (j >= 0) shE.getRange(e._fila, j + 1).setValue(cambios[k]); });
  }
  // Aviso por correo si quedó algo en «No» y el lugar tiene CORREOS_FALLA en SITIOS_INC (regla de Belén 14/10/2026: HMH → SOMI y Mantenimiento)
  const mal = INC_PREGUNTAS.filter((k) => data[k] === 'No').concat(vencida ? ['VTO'] : [], noSeLee ? ['SINTARJETA'] : []);
  if (mal.length) { const av = incAvisoFallaMipyv_(libro, e, mal, quien, fecha, String(data.OBSERVACIONES || '').trim(), links, data.id_control);
    if (av) { const C2 = incTabla_(shC), f = C2.filas.find((z) => String(z.ID) === String(data.id_control)), j = C2.H.indexOf('AVISO_CORREO'); if (f && j >= 0) shC.getRange(f._fila, j + 1).setValue(av); } }
  return { resultado: resultado };
}
const INC_NO_FALLA = { EN_LUGAR: 'No está en su lugar o no se ve', ACCESO_LIBRE: 'Acceso obstruido', MANOMETRO: 'Presión fuera de rango (manómetro fuera del verde)', PRECINTO: 'Sin precinto o seguro', SENALIZACION: 'Sin señalización', VTO: 'Carga vencida', SINTARJETA: 'Sin tarjeta (marbete) o ilegible' };
// Deja el problema abierto en la hoja FALLAS del sistema HyS. No manda correo: el sistema HyS manda uno solo por día (19 h) con todos
// los extintores con problemas y, mientras sigan abiertos, cada 3 días (Incendio.gs › resumenFallasIncendio). Pedido de Belén 14/10/2026.
function incAvisoFallaMipyv_(libro, e, mal, quien, fecha, obs, links, id) {
  const S = incTabla_(libro.getSheetByName('SITIOS_INC')).filas.filter((z) => String(z.ESTABLECIMIENTO).trim() === String(e.ESTABLECIMIENTO).trim() && z.ACTIVO !== 'No');
  const sit = S.find((z) => incNorm_(z.SITIO) === incNorm_(e.SITIO)) || S.find((z) => String(z.CORREOS_FALLA || '').trim());
  const para = String((sit && sit.CORREOS_FALLA) || '').split(/[,;\s]+/).filter((m) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(m)); if (!para.length) return '';
  const shF = libro.getSheetByName('FALLAS'); if (!shF) return 'Falta la hoja FALLAS (ejecutar prepararAvisosIncendio en el Sistema HyS).';
  const F = incTabla_(shF), fallas = mal.map((k) => INC_NO_FALLA[k]), hoy = Utilities.formatDate(fecha, ZONA_HORARIA, 'dd/MM/yyyy');
  const linea = hoy + ' · ' + quien + ': ' + fallas.join('; ') + (obs ? ' (' + obs + ')' : '');
  const ab = F.filas.find((z) => String(z.ID_EXTINTOR) === String(e.ID) && !/^resuel/i.test(String(z.ESTADO || '')));
  const setF = (fila, o) => Object.keys(o).forEach((k) => { const j = F.H.indexOf(k); if (j >= 0) shF.getRange(fila, j + 1).setValue(o[k]); });
  const va = 'Va en el correo de hoy (19 h) a ' + para.join(', ') + ', junto con los demás extintores con problemas.';
  if (ab) {
    const previos = String(ab.PROBLEMAS || '').split(' · ').filter(Boolean), nuevos = fallas.filter((f) => previos.indexOf(f) < 0), o = { HISTORIAL: (linea + (ab.HISTORIAL ? '\n' + ab.HISTORIAL : '')).slice(0, 3000) };
    if (nuevos.length) { o.PROBLEMAS = previos.concat(nuevos).join(' · '); o.ULTIMO_AVISO = ''; }
    setF(ab._fila, o);
    return nuevos.length ? va : 'Ya tenía un problema abierto: sigue en el correo cada 3 días hasta que se marque resuelto.';
  }
  const o = { ID: 'FAL-' + String(e.ESTABLECIMIENTO).trim() + '-' + Utilities.formatDate(new Date(), ZONA_HORARIA, 'yyMMddHHmmss'), FECHA: new Date(Utilities.formatDate(fecha, ZONA_HORARIA, 'yyyy-MM-dd') + 'T12:00:00'),
    ESTABLECIMIENTO: String(e.ESTABLECIMIENTO).trim(), SITIO: e.SITIO, ID_EXTINTOR: e.ID, PROBLEMAS: fallas.join(' · '), DETECTO: quien, ID_CONTROL: id, ESTADO: 'Abierta', AVISOS: 0, HISTORIAL: linea };
  shF.getRange(Math.max(shF.getLastRow(), 5) + 1, 1, 1, F.H.length).setValues([F.H.map((h) => o[h] == null ? '' : o[h])]);
  return va;
}

// Lugar de MIPyV (id_establecimiento) → establecimiento y sitio del sistema HyS
function incLugarSistema_(ss, idLugar) {
  const ev = ss.getSheetByName('establecimientos').getDataRange().getValues(), eh = ev[0];
  const r = ev.slice(1).find((x) => String(x[eh.indexOf('id_establecimiento')]).trim() === String(idLugar).trim());
  if (!r) throw new Error('El lugar ' + idLugar + ' no está en la hoja establecimientos.');
  const cod = String(r[eh.indexOf('codigo_sistema')]).trim(), sit = String(r[eh.indexOf('sitio_sistema')]).trim();
  if (!cod || !sit) throw new Error('Al lugar ' + idLugar + ' le falta codigo_sistema o sitio_sistema en la hoja establecimientos.');
  return { cod: cod, sitio: INC_SITIO_ALIAS[incNorm_(sit)] || sit };
}
const INC_ALTA_REQ = ['PLANTA', 'SECTOR', 'UBICACION', 'TIPO', 'AGENTE', 'CAPACIDAD_KG', 'NRO_INVENTARIO', 'VTO_CARGA'];
function guardarAltaExtintor_(data) {
  if (!data.id_alta || !data.lugar_id) throw new Error('Falta el lugar del extintor.');
  const libro = SpreadsheetApp.openById(INC_LIBRO_ID), shE = libro.getSheetByName('EXTINTORES'), shS = libro.getSheetByName('SITIOS_INC');
  const E = incTabla_(shE), marca = '[' + data.id_alta + ']';
  const ya = E.filas.find((x) => String(x.OBSERVACIONES || '').indexOf(marca) >= 0); if (ya) return { duplicado: true, id: ya.ID };   // la app reintentó
  const faltan = INC_ALTA_REQ.filter((k) => !String(data[k] || '').trim()); if (faltan.length) throw new Error('Faltan datos del extintor: ' + faltan.join(', '));
  const fotos = listaDeFotos(data); if (fotos.length < 3) throw new Error('Faltan fotos (son 3).');
  const L = incLugarSistema_(SpreadsheetApp.getActiveSpreadsheet(), data.lugar_id), cod = L.cod;
  // El lugar tiene que estar en SITIOS_INC para que aparezca en el tablero: si falta, se agrega
  const S = incTabla_(shS);
  if (!S.filas.some((x) => String(x.ESTABLECIMIENTO).trim() === cod && incNorm_(x.SITIO) === incNorm_(L.sitio))) {
    const fs = { ESTABLECIMIENTO: cod, SITIO: L.sitio, TIPO_SITIO: 's/d (revisar)', RESPONSABLES_CONTROL: 'Belén Pellegrini · Melani · Javier Tramaleo', ACTIVO: 'Sí', OBSERVACIONES: 'Agregado desde MIPyV al cargar un extintor.', ACTUALIZADO: new Date() };
    shS.getRange(Math.max(shS.getLastRow(), 5) + 1, 1, 1, S.H.length).setValues([S.H.map((h) => fs[h] == null ? '' : fs[h])]);
  }
  const n = E.filas.filter((x) => String(x.ESTABLECIMIENTO).trim() === cod).reduce((m, x) => Math.max(m, Number(String(x.ID).split('-').pop()) || 0), 0) + 1;
  const id = 'EXT-' + cod + '-' + ('00' + n).slice(-3);
  const inv = incNorm_(data.NRO_INVENTARIO).replace(/\s+/g, '');
  const rep = /^s\/?d/.test(inv) ? null : E.filas.find((x) => String(x.ESTABLECIMIENTO).trim() === cod && !/baja/i.test(x.ESTADO) && incNorm_(x.NRO_INVENTARIO).replace(/\s+/g, '') === inv);
  const fecha = new Date(data.fecha || new Date()), mes = Utilities.formatDate(fecha, ZONA_HORARIA, 'yyyy-MM'), carpeta = incCarpetaControles_(cod, mes, 'Altas'), links = {};
  INC_FOTOS.forEach(([k, et], i) => {
    const nombre = data.id_alta + ' · ' + id + ' · ' + et + '.jpg';
    const m = String(fotos[i]).match(/^data:([^;]+);base64,(.*)$/);
    links[k] = carpeta.createFile(Utilities.newBlob(Utilities.base64Decode(m ? m[2] : String(fotos[i])), m ? m[1] : 'image/jpeg', nombre)).getUrl();
  });
  const quien = String(data.operario || 'Operario MIPyV') + (data.operario_acompanante ? ' (con ' + data.operario_acompanante + ')' : '') + ' · MIPyV';
  const vto = /^\d{4}-\d{2}-\d{2}/.test(data.VTO_CARGA) ? new Date(data.VTO_CARGA.slice(0, 10) + 'T12:00:00') : String(data.VTO_CARGA);
  const obs = ['Alta ' + Utilities.formatDate(fecha, ZONA_HORARIA, 'yyyy-MM-dd') + ' · ' + quien + ' ' + marca + '.',
    rep ? 'Revisar: el N.º de inventario ya estaba cargado en ' + rep.ID + '.' : '', String(data.OBSERVACIONES || '').trim()].filter(Boolean).join(' ');
  const o = { ID: id, ESTABLECIMIENTO: cod, SITIO: L.sitio, NRO_EXTINTOR: String(data.NRO_EXTINTOR || '').trim(), PLANTA: data.PLANTA, SECTOR: String(data.SECTOR).trim(), UBICACION: String(data.UBICACION).trim(),
    TIPO: data.TIPO, AGENTE: data.AGENTE, CAPACIDAD_KG: String(data.CAPACIDAD_KG).trim(), NRO_INVENTARIO: String(data.NRO_INVENTARIO).trim(), VTO_CARGA: vto, PRUEBA_HIDRAULICA_VENCE: 's/d (revisar)',
    ESTADO: 'Operativo', OBSERVACIONES: obs, ACTUALIZADO: new Date(), VERIFICACION: 'Pendiente',
    CAMBIOS: Utilities.formatDate(new Date(), ZONA_HORARIA, 'dd/MM/yyyy') + ' · ' + quien + ': Alta' };
  Object.assign(o, links);
  shE.getRange(Math.max(shE.getLastRow(), 5) + 1, 1, 1, E.H.length).setValues([E.H.map((h) => o[h] == null ? '' : o[h])]);
  return { id: id };
}

// Corrección del nombre y la ubicación de un extintor (queda pendiente de verificar por HyS)
function guardarEdicionExtintor_(data) {
  if (!data.id_edit || !data.ID_EXTINTOR) throw new Error('Falta el extintor.');
  const libro = SpreadsheetApp.openById(INC_LIBRO_ID), shE = libro.getSheetByName('EXTINTORES'), E = incTabla_(shE), marca = '[' + data.id_edit + ']';
  const e = E.filas.find((x) => String(x.ID) === String(data.ID_EXTINTOR));
  if (!e) throw new Error('El extintor ' + data.ID_EXTINTOR + ' no está en el sistema HyS.');
  if (String(e.CAMBIOS || '').indexOf(marca) >= 0) return { duplicado: true };   // la app reintentó
  const quien = String(data.operario || 'Operario MIPyV') + (data.operario_acompanante ? ' (con ' + data.operario_acompanante + ')' : '') + ' · MIPyV';
  const nuevo = {}, notas = [];
  ['NRO_EXTINTOR', 'PLANTA', 'SECTOR', 'UBICACION'].forEach((k) => { if (k in data && String(data[k] == null ? '' : data[k]).trim() !== '' || k === 'NRO_EXTINTOR' && k in data) nuevo[k] = String(data[k] == null ? '' : data[k]).trim(); });
  if (data.lugar_id) {
    const L = incLugarSistema_(SpreadsheetApp.getActiveSpreadsheet(), data.lugar_id);
    if (L.cod === String(e.ESTABLECIMIENTO).trim()) nuevo.SITIO = L.sitio;
    else notas.push('pidió pasarlo a ' + (data.lugar_nombre || data.lugar_id) + ' (otro establecimiento): revisar');
  }
  const nombres = { NRO_EXTINTOR: 'Nombre o N.º', SITIO: 'Lugar', PLANTA: 'Planta', SECTOR: 'Sector', UBICACION: 'Ubicación' };
  const dif = Object.keys(nuevo).filter((k) => incNorm_(e[k]) !== incNorm_(nuevo[k])).map((k) => nombres[k] + ': «' + (String(e[k] || '').trim() || '—') + '» → «' + (nuevo[k] || '—') + '»');
  const txt = dif.concat(notas).join('; ');
  const cambios = { CAMBIOS: (Utilities.formatDate(new Date(), ZONA_HORARIA, 'dd/MM/yyyy') + ' · ' + quien + ': ' + (txt || 'sin cambios') + ' ' + marca + (e.CAMBIOS ? '\n' + e.CAMBIOS : '')).slice(0, 2000), ACTUALIZADO: new Date() };
  if (txt) cambios.VERIFICACION = 'Pendiente';
  Object.keys(nuevo).forEach((k) => { if (incNorm_(e[k]) !== incNorm_(nuevo[k])) cambios[k] = nuevo[k]; });
  Object.keys(cambios).forEach((k) => { const j = E.H.indexOf(k); if (j >= 0) shE.getRange(e._fila, j + 1).setValue(cambios[k]); });
  return { cambios: dif.length };
}
