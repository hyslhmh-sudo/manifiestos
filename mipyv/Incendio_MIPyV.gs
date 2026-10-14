/**
 * MIPyV Red HZT — Control de extintores conectado al MÓDULO 10 del sistema HyS (14/10/2026)
 * Va en el mismo proyecto de Apps Script de la planilla «MIP RED HZT - Base de Datos v2», como archivo aparte.
 *  - extintoresParaApp_(ss): la lista de extintores del sistema HyS (planilla «PROTECCIÓN CONTRA INCENDIOS · Sistema HyS»,
 *    hoja EXTINTORES), con los lugares de MIPyV donde están (hoja establecimientos › codigo_sistema y sitio_sistema).
 *    La manda doGet junto con los catálogos.
 *  - guardarControlExtintor_(data): el control mensual de un extintor que manda la app (5 respuestas y 3 fotos).
 *    Guarda las fotos en Drive › SISTEMA HyS › MÓDULO 10 › Establecimientos › establecimiento › Controles › año-mes,
 *    agrega la fila en CONTROLES y actualiza el último control del extintor. No duplica si la app reintenta.
 * Normativa: Ley 19.587; Dto. 351/79, cap. 18. No envía correos.
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
    tipo: String(e.TIPO || ''), kg: String(e.CAPACIDAD_KG || ''), inv: String(e.NRO_INVENTARIO || ''), vto: incIso_(e.VTO_CARGA), ultimo: incIso_(e.ULTIMO_CONTROL),
  })).filter((e) => e.lugares.length);
}

function incCarpetaControles_(cod, mes) {
  const raiz = subcarpeta(DriveApp.getFolderById(INC_CARPETA_ID), 'Establecimientos');
  let dir = null; const it = raiz.getFolders();
  while (it.hasNext()) { const f = it.next(); if (f.getName() === cod || f.getName().indexOf(cod + ' · ') === 0) { dir = f; break; } }
  if (!dir) dir = raiz.createFolder(cod);
  return subcarpeta(subcarpeta(dir, 'Controles'), mes);
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
  const resultado = INC_PREGUNTAS.every((k) => data[k] === 'Sí') ? 'Conforme' : 'Con observaciones';
  const quien = String(data.operario || 'Operario MIPyV') + (data.operario_acompanante ? ' (con ' + data.operario_acompanante + ')' : '') + ' · MIPyV';
  const fila = { ID: data.id_control, FECHA: fecha, ESTABLECIMIENTO: cod, SITIO: e.SITIO, ID_EXTINTOR: e.ID, RESULTADO: resultado,
    OBSERVACIONES: 'Cargado desde MIPyV (tarea ' + (data.id_tarea || 's/d') + ').', QUIEN: quien, CARGADO: new Date(), ESTADO: 'Vigente' };
  INC_PREGUNTAS.forEach((k) => fila[k] = data[k]); Object.assign(fila, links);
  shC.getRange(Math.max(shC.getLastRow(), 5) + 1, 1, 1, C.H.length).setValues([C.H.map((h) => fila[h] == null ? '' : fila[h])]);
  // Último control del extintor (si este es el más reciente)
  const ult = e.ULTIMO_CONTROL instanceof Date ? e.ULTIMO_CONTROL : null;
  if (!ult || ult <= fecha) {
    const cambios = Object.assign({ ULTIMO_CONTROL: fecha, RESULTADO_CONTROL: resultado + ' (MIPyV)', ACTUALIZADO: new Date() }, links);
    Object.keys(cambios).forEach((k) => { const j = E.H.indexOf(k); if (j >= 0) shE.getRange(e._fila, j + 1).setValue(cambios[k]); });
  }
  return { resultado: resultado };
}
