/**
 * SISTEMA HyS · DIAGNÓSTICO DE AGUA (módulo 3) Y DE PLAGAS (módulo 5)
 * Mismo esquema que el módulo 6 (cocinas): un libro por módulo con las hojas
 *   ITEMS         cuestionario editable (sale de la planilla de propuesta revisada por Belén)
 *   LUGARES       lugares que se recorren (se pueden agregar o desactivar)
 *   DIAGNOSTICOS  un relevamiento por fila (establecimiento, fecha, resultado)
 *   RESPUESTAS    una respuesta por fila (por establecimiento o por lugar)
 * Cálculo: el mismo motor del diagnóstico de residuos (Diag.gs): PUNTAJES, PESO, CRITICO, CONDICION.
 * Agua: cada tanque o cisterna del inventario (BASE COMÚN › RESERVORIOS) es un lugar propio; los CAPS se relevan dentro del
 * hospital del que dependen (sus tanques se cargan en RESERVORIOS con el código del hospital). Si el establecimiento todavía
 * no tiene reservorios cargados, se usan los lugares genéricos «Tanque elevado» y «Cisterna».
 * Instalación: ejecutar una vez construirModuloAgua() y construirModuloPlagas(). Después todo se maneja desde el portal y la planilla.
 * Respuestas de Belén a las dudas (12/10/2026): hojas DUDAS de cada propuesta.
 */
const DGM = {
  agua: { titulo: 'DIAGNÓSTICO DE AGUA · Sistema HyS', prop: 'DIAG_AGU_ID', propuesta: '17Y5L9tVmu4X-Ivygq8BqGz_9ZxsuJPQBSsWi7MT4EG8', pref: 'DA', carpeta: 'Agua',
    modulo: 'Módulo 3 · Agua', tema: 'agua para consumo', inicio: ['Módulo 3 · Agua. Línea de base de la gestión del agua para consumo en cada establecimiento: documentación y registros, tanques y cisternas, seguridad de quien limpia o toma muestras, y puntos de consumo y agua caliente (Legionella).',
      'Frecuencias que usa el sistema: limpieza de tanques y cisternas anual, bacteriológico cada 6 meses y fisicoquímico anual (o la norma local más exigente: BASE COMÚN › AGUA_NORMATIVA).',
      'Lugares: cada tanque o cisterna de BASE COMÚN › RESERVORIOS es una pestaña del relevamiento. Los CAPS se relevan dentro del hospital del que dependen. Si todavía no hay reservorios cargados, se usan «Tanque elevado» y «Cisterna».',
      'La sección de agua caliente (Legionella) aparece solo si el establecimiento tiene termotanques o calderas (AGU04). El agua para hemodiálisis o esterilización solo se pregunta para saber si existe y quién la controla.'] },
  plagas: { titulo: 'DIAGNÓSTICO DE PLAGAS · Sistema HyS', prop: 'DIAG_PLG_ID', propuesta: '1OXtnE0eHl2_k7ynVY0sDrgEtL_gNAaGDvvOCsmiGhMI', pref: 'DP', carpeta: 'Plagas',
    modulo: 'Módulo 5 · Plagas', tema: 'manejo integrado de plagas', inicio: ['Módulo 5 · Plagas. Línea de base del manejo integrado de plagas (MIP) en toda la red: programa y registros, productos y seguridad de quien aplica, condiciones del edificio, residuos y exterior, y situación actual.',
      'El diagnóstico se habilita para toda la red. El registro de intervenciones (app MIPyV) sigue solo en Trelew.',
      'Palomas y animales sueltos no forman parte de este diagnóstico.'] }
};
const DGM_H_ITEMS = ['ID', 'SECCION', 'ITEM', 'AYUDA', 'NIVEL', 'TIPO', 'OPCIONES', 'PESO', 'CRITICO', 'REFERENCIA', 'ACTIVO', 'FOTO', 'CONDICION', 'PREVIO', 'PUNTAJES', 'ALCANCE', 'URGENCIA', 'IMPORTANCIA'];
const DGM_H_LUG = ['LUGAR', 'CUANDO', 'QUE_SE_OBSERVA', 'ACTIVO'];
const dgmCfg_ = m => { const c = DGM[m]; if (!c) throw new Error('Módulo de diagnóstico desconocido: ' + m); return c; };

// ------------------------------------------------------------------ CONSTRUCCIÓN (una vez por módulo)
function construirModuloAgua() { dgmConstruir_('agua'); }
function construirModuloPlagas() { dgmConstruir_('plagas'); }
function dgmConstruir_(m) {
  const C = dgmCfg_(m), ss = nuevoLibro_(C.titulo, C.prop); if (!ss) return;
  const prop = SpreadsheetApp.openById(C.propuesta);
  // Cuestionario: columnas de la propuesta ID · ALCANCE · SECCION · ITEM · AYUDA · NIVEL · TIPO · OPCIONES · PESO · CRITICO · REFERENCIA · FOTO · CONDICION · PUNTAJES
  const P = prop.getSheetByName('ITEMS').getDataRange().getValues().slice(1).filter(r => /^[A-Z]{3}\d{2}$/.test(limpio_(r[0])));
  const filas = P.map(r => [limpio_(r[0]), r[2], r[3], r[4], r[5], r[6], r[7], r[8], r[9], r[10], 'Sí', r[11], limpio_(r[12]), '', r[13], r[1] || 'Todos', r[9] === 'Sí' ? 3 : 2, Number(r[8]) >= 3 ? 3 : 2]);
  const it = ss.getSheets()[0].setName('ITEMS');
  encabezar_(it, 'Cuestionario del diagnóstico de ' + m, 'Editable: para dejar de usar una pregunta, ACTIVO = No (no la borres). NIVEL E = establecimiento, S = cada lugar.', DGM_H_ITEMS,
    ['Código fijo.', 'Sección.', 'Pregunta.', 'Ayuda que ve quien completa.', 'E: una vez · S: por cada lugar.', 'LISTA · MULTI · NUMERO · TEXTO.', 'Opciones separadas por «|».', '1 a 3.', 'Sí: si la respuesta vale 0, es punto crítico.', 'Norma de referencia.', 'Sí / No.', 'Sí: permite fotos.', '«ID ~ A|B», «ID = X», «ID != X», «LUGAR ~ Tanque|Cisterna» (solo en esos lugares); varias con «;».', 'Sí: se responde antes de los lugares.', 'Valor de cada opción, alineado con OPCIONES («-» no puntúa).', 'A quién se pregunta.', '1 a 3.', '1 a 3.']);
  it.getRange(6, 1, filas.length, DGM_H_ITEMS.length).setValues(filas);
  it.setFrozenColumns(3); it.setColumnWidth(3, 420); it.setColumnWidth(4, 300); it.setColumnWidth(7, 320);
  lista_(it, 4, 300, ['E', 'S']); lista_(it, 5, 300, ['LISTA', 'MULTI', 'NUMERO', 'TEXTO']); lista_(it, 10, 300, ['Sí', 'No']); lista_(it, 11, 300, ['Sí', '']);
  proteger_(it, [it.getRange('A1:R5'), it.getRange(6, 1, 300, 1)], 'Encabezados y códigos');
  // Lugares: de la propuesta (LUGAR · CUANDO · QUE_SE_OBSERVA)
  const L = prop.getSheetByName('LUGARES').getDataRange().getValues().slice(1).filter(r => limpio_(r[0])).map(r => [limpio_(r[0]), limpio_(r[1]), limpio_(r[2]), 'Sí']);
  const lu = ss.insertSheet('LUGARES');
  encabezar_(lu, 'Lugares que se recorren', 'Cada lugar es una pestaña del relevamiento. Para agregar uno, escribilo en una fila nueva; para dejar de usarlo, ACTIVO = No.' +
    (m === 'agua' ? ' Los tanques y cisternas cargados en BASE COMÚN › RESERVORIOS reemplazan a «Tanque elevado» y «Cisterna».' : ''), DGM_H_LUG);
  lu.getRange(6, 1, L.length, 4).setValues(L); lu.setColumnWidth(1, 260); lu.setColumnWidth(2, 260); lu.setColumnWidth(3, 420); lista_(lu, 3, 100, ['Sí', 'No']);
  const dg = ss.insertSheet('DIAGNOSTICOS');
  encabezar_(dg, 'Relevamientos', 'Una fila por relevamiento. Se completa desde el portal (y más adelante desde la página para referentes). Para anular: ESTADO = Anulado (no borrar).', DIAG_H_DIAG.slice(0, 12), null, [7, 8, 9, 11]);
  lista_(dg, 3, 500, ['Visita', 'Entrevista', 'Referente (en línea)']); lista_(dg, 6, 500, DIAG_ESTADOS);
  const rp = ss.insertSheet('RESPUESTAS');
  encabezar_(rp, 'Respuestas', 'Una fila por pregunta respondida. SITIO vacío = pregunta del establecimiento; si no, es el lugar.', DIAG_H_RESP);
  const ini = ss.insertSheet('INICIO', 0);
  ini.getRange('A1').setValue(C.titulo).setFontSize(18).setFontWeight('bold').setFontColor(BASES.AZUL);
  const txt = C.inicio.concat(['Cálculo: igual que el diagnóstico de residuos. Cada opción vale lo que dice PUNTAJES (1, 0,5, 0); «No se sabe» y «No aplica» no cuentan. PESO 1 a 3. CRITICO = Sí: si vale 0, es punto crítico.',
    'Hojas: ITEMS (cuestionario), LUGARES (pestañas del relevamiento), DIAGNOSTICOS (uno por fila), RESPUESTAS (una por fila). Nunca borres filas: para anular un relevamiento, ESTADO = Anulado.',
    'Documento en versión 0 hasta su alta en el sistema.']);
  ini.getRange(2, 1, txt.length, 1).setValues(txt.map(t => [t])).setWrap(true);
  ini.setColumnWidth(1, 900); ss.setActiveSheet(ini);
  Logger.log(C.modulo + ' · diagnóstico instalado: ' + ss.getUrl() + ' · ' + filas.length + ' preguntas · ' + L.length + ' lugares.');
}

// ------------------------------------------------------------------ DATOS
const dgmLibro_ = m => { const id = PropertiesService.getScriptProperties().getProperty(dgmCfg_(m).prop); if (!id) throw new Error('El diagnóstico de ' + m + ' todavía no está instalado (construirModulo' + (m === 'agua' ? 'Agua' : 'Plagas') + ').'); return SpreadsheetApp.openById(id); };
const dgmInstalado_ = m => !!PropertiesService.getScriptProperties().getProperty(dgmCfg_(m).prop);
function dgmItems_(m, todos) {
  return pTabla_(dgmLibro_(m).getSheetByName('ITEMS'), DGM_H_ITEMS.length).map(r => { const o = {}; DGM_H_ITEMS.forEach((h, i) => o[h] = r.v[i] instanceof Date ? pFecha_(r.v[i]) : r.v[i]); return o; })
    .filter(o => o.ID && (todos || o.ACTIVO !== 'No'));
}
// Reservorios activos de un establecimiento (BASE COMÚN › RESERVORIOS, encabezados en la fila 5)
function dgmReservorios_(cod) {
  const sh = pBC_().getSheetByName('RESERVORIOS'); if (!sh || sh.getLastRow() < 6) return [];
  const H = sh.getRange(5, 1, 1, sh.getLastColumn()).getValues()[0].map(limpio_), j = h => H.indexOf(h);
  return sh.getRange(6, 1, sh.getLastRow() - 5, H.length).getDisplayValues()
    .filter(r => limpio_(r[j('CODIGO_TANQUE')]) && limpio_(r[j('ESTABLECIMIENTO')]) === cod && !/fuera de uso|baja/i.test(r[j('ESTADO')] || ''))
    .map(r => ({ codigo: limpio_(r[j('CODIGO_TANQUE')]), tipo: limpio_(r[j('TIPO')]), sitio: limpio_(r[j('SITIO')]), ubicacion: limpio_(r[j('UBICACION')]), capacidad: limpio_(r[j('CAPACIDAD_L')]) }));
}
function dgmLugares_(m, cod) {
  let L = pTabla_(dgmLibro_(m).getSheetByName('LUGARES'), DGM_H_LUG.length).filter(r => limpio_(r.v[0]) && r.v[3] !== 'No').map(r => ({ sitio: limpio_(r.v[0]), oficial: limpio_(r.v[2]), tipo: limpio_(r.v[1]) }));
  if (m === 'agua' && cod) {
    let R = []; try { R = dgmReservorios_(cod); } catch (e) {}
    if (R.length) L = R.map(t => ({ sitio: t.codigo + ' · ' + (t.tipo || 'Reservorio'), oficial: [t.sitio, t.ubicacion, t.capacidad ? t.capacidad + ' L' : ''].filter(Boolean).join(' · '), tipo: 'Inventario' }))
      .concat(L.filter(l => !/^(tanque|cisterna)/i.test(l.sitio)));
  }
  return L;
}
function dgmDiagLeer_(m) {
  return pTabla_(dgmLibro_(m).getSheetByName('DIAGNOSTICOS'), 12).map(r => { const o = { fila: r.fila }; DIAG_H_DIAG.slice(0, 12).forEach((h, i) => o[h] = r.v[i] instanceof Date ? pFecha_(r.v[i]) : r.v[i]); return o; });
}
function dgmLista_(m) {   // último relevamiento (no anulado) de cada establecimiento
  const out = {}; dgmDiagLeer_(m).forEach(o => { if (o.ESTADO === 'Anulado') return; const p = out[o.CODIGO]; if (!p || String(o.FECHA) >= String(p.FECHA)) out[o.CODIGO] = o; }); return out;
}

// ------------------------------------------------------------------ RELEVAMIENTO (mismo formulario que el diagnóstico de residuos)
function dgmAbrir_(m, cod, id) {
  cod = limpio_(cod); const dc = dgmLibro_(m), todos = dgmItems_(m, true), E = pEstablecimientos_(), f = E.filas.find(x => limpio_(x.v[0]) === cod);
  const lista = dgmDiagLeer_(m).filter(o => o.CODIGO === cod && o.ESTADO !== 'Anulado').sort((a, b) => String(b.FECHA).localeCompare(String(a.FECHA)));
  const actual = id ? lista.find(o => o.ID_DIAG === id) : lista.find(o => o.ESTADO === 'Borrador' || o.ESTADO === 'Enviado');
  const previo = lista.find(o => o.ESTADO === 'Cerrado' && (!actual || o.ID_DIAG !== actual.ID_DIAG));
  const resp = {}, quiero = [actual && actual.ID_DIAG, previo && previo.ID_DIAG].filter(Boolean);
  if (quiero.length) pTabla_(dc.getSheetByName('RESPUESTAS'), DIAG_H_RESP.length).forEach(r => { if (quiero.indexOf(r.v[0]) >= 0) (resp[r.v[0]] = resp[r.v[0]] || []).push({ sitio: r.v[2], item: r.v[3], resp: r.v[4], valor: r.v[5], obs: r.v[6], fotos: String(r.v[7] || '').split(' | ').filter(Boolean) }); });
  const usados = {}; Object.keys(resp).forEach(k => resp[k].forEach(r => usados[r.item] = true));
  const items = todos.filter(i => i.ACTIVO !== 'No' || usados[i.ID]);
  // Lugares: los configurados más los que ya tienen respuestas (por ejemplo, un tanque dado de baja después)
  const sitios = dgmLugares_(m, cod), ya = {}; sitios.forEach(s => ya[s.sitio] = true);
  Object.keys(resp).forEach(k => resp[k].forEach(r => { if (r.sitio && !ya[r.sitio]) { ya[r.sitio] = true; sitios.push({ sitio: r.sitio, oficial: '', tipo: 'Relevado antes' }); } }));
  return { ok: true, modulo: m, cod: cod, nombre: f ? f.v[1] : cod, tipo: f ? limpio_(f.v[3]) : 's/d', items: items, sitios: sitios,
    actual: actual || null, respuestas: actual ? (resp[actual.ID_DIAG] || []) : [], previo: previo || null, respuestasPrevio: previo ? (resp[previo.ID_DIAG] || []) : [],
    historial: lista.map(o => ({ id: o.ID_DIAG, fecha: o.FECHA, estado: o.ESTADO, pct: o.PORCENTAJE, criticos: o.CRITICOS_NO_CUMPLE, modalidad: o.MODALIDAD })),
    informes: (() => { try { return actual ? pInformesDiag_(actual.ID_DIAG) : []; } catch (e) { return []; } })() };
}
function dgmGuardar_(m, x, red) {
  const C = dgmCfg_(m), dc = dgmLibro_(m), sh = dc.getSheetByName('DIAGNOSTICOS'), rp = dc.getSheetByName('RESPUESTAS'), hoy = new Date(), c = x.cabecera || {}, cod = limpio_(x.cod);
  if (!cod) return { ok: false, mensaje: 'Falta el establecimiento.' };
  const resp = (x.respuestas || []).filter(r => r.item && (r.resp || r.valor || r.obs || (r.fotos || []).length)), usados = {}; resp.forEach(r => usados[r.item] = true);
  const items = dgmItems_(m, true).filter(i => i.ACTIVO !== 'No' || usados[i.ID]);
  const calc = pDiagCalcular_(items, resp);
  let id = limpio_(x.id), fila = null;
  if (id) { const f = pTabla_(sh, 7).find(r => r.v[0] === id); if (f) { fila = f.fila; if (red && /^(Enviado|Cerrado)$/.test(f.v[6])) return { ok: false, mensaje: 'Este relevamiento ya fue enviado a Higiene y Seguridad: no se puede modificar.' }; } }
  let estado = x.estado || 'Borrador'; if (DIAG_ESTADOS.indexOf(estado) < 0) estado = 'Borrador'; if (red && estado === 'Cerrado') estado = 'Enviado';
  if (estado === 'Cerrado' || estado === 'Enviado') {
    const f = diagFaltantes_(items, resp, dgmLugares_(m, cod).map(l => l.sitio).concat(resp.map(r => r.sitio).filter(Boolean)));
    if (f.estab.length) return { ok: false, mensaje: 'Falta completar en la pestaña Establecimiento ' + f.estab.length + ' pregunta(s), por ejemplo: «' + f.estab.slice(0, 3).join('», «') + '».' };
    if (!f.sitios && items.some(i => i.NIVEL === 'S')) return { ok: false, mensaje: 'Falta relevar al menos un lugar.' };
  }
  if (!fila) id = C.pref + '-' + cod.replace(/\s+/g, '').toUpperCase().slice(0, 8) + '-' + Utilities.formatDate(hoy, TZ, 'yyyyMMdd-HHmmss');
  const cab = [id, cod, c.FECHA || Utilities.formatDate(hoy, TZ, 'yyyy-MM-dd'), c.MODALIDAD || 'Visita', c.RELEVADO_POR || (red ? '' : 'Belén Pellegrini'), c.ENTREVISTADO || '', estado, calc.pct, calc.criticos, calc.n, c.OBSERVACIONES || '', hoy];
  if (fila) sh.getRange(fila, 1, 1, cab.length).setValues([cab]); else sh.getRange(Math.max(sh.getLastRow(), 5) + 1, 1, 1, cab.length).setValues([cab]);
  const viejas = pTabla_(rp, 1).filter(r => r.v[0] === id).map(r => r.fila).sort((a, b) => a - b);
  if (viejas.length && viejas[viejas.length - 1] - viejas[0] + 1 === viejas.length) rp.deleteRows(viejas[0], viejas.length); else viejas.reverse().forEach(f => rp.deleteRow(f));
  if (resp.length) rp.getRange(Math.max(rp.getLastRow(), 5) + 1, 1, resp.length, DIAG_H_RESP.length).setValues(resp.map(r => [id, cod, r.sitio || '', r.item, r.resp || '', r.valor || '', r.obs || '', (r.fotos || []).join(' | ')]));
  CacheService.getScriptCache().removeAll(['dgm_tablero_' + m, 'p_resumen', 'tablero']);
  return { ok: true, id: id, pct: calc.pct, criticos: calc.criticos, n: calc.n, porSeccion: calc.porSeccion, estado: estado };
}
// Fotos: carpeta del establecimiento › «Agua» o «Plagas» › «Relevamientos» › ID
function dgmFoto_(m, x) {
  const C = dgmCfg_(m), E = est_(limpio_(x.cod)); if (!E || !E.carpeta) return { ok: false, mensaje: 'El establecimiento no tiene carpeta.' };
  if (!x.id) return { ok: false, mensaje: 'Guardá el borrador antes de agregar fotos.' };
  const mm = /^data:(image\/[\w.+-]+);base64,(.+)$/.exec(String(x.dataUrl || '')); if (!mm) return { ok: false, mensaje: 'La foto no es válida.' };
  const raiz = carpeta_(carpeta_(carpeta_(DriveApp.getFolderById(E.carpeta), C.carpeta), 'Relevamientos'), x.id);
  const nombre = [(x.sitio || x.cod), x.item, Utilities.formatDate(new Date(), TZ, 'yyyyMMdd-HHmmss')].join(' - ').replace(/[^\w\-.áéíóúñÁÉÍÓÚÑ ]/g, '_') + '.jpg';
  return { ok: true, url: raiz.createFile(Utilities.newBlob(Utilities.base64Decode(mm[2]), mm[1], nombre)).getUrl() };
}

// ------------------------------------------------------------------ TABLERO (lista de establecimientos con su último relevamiento)
function dgmTablero_(m, fresco) {
  const c = CacheService.getScriptCache(), k = 'dgm_tablero_' + m; if (!fresco) { const v = c.get(k); if (v) return JSON.parse(v); }
  if (!dgmInstalado_(m)) return { ok: true, instalado: false, establecimientos: [], totales: {} };
  const E = pEstablecimientos_(), ult = dgmLista_(m);
  const est = E.filas.filter(f => limpio_(f.v[0])).map(f => { const cod = limpio_(f.v[0]), d = ult[cod];
    return { cod: cod, nombre: f.v[1], tipo: limpio_(f.v[3]), area: f.v[4], diag: d ? { id: d.ID_DIAG, fecha: d.FECHA, estado: d.ESTADO, pct: d.PORCENTAJE, criticos: d.CRITICOS_NO_CUMPLE } : null }; });
  const con = est.filter(e => e.diag && e.diag.estado === 'Cerrado' && e.diag.pct !== '' && e.diag.pct != null);
  const out = { ok: true, instalado: true, libro: dgmLibro_(m).getUrl(), establecimientos: est,
    totales: { establecimientos: est.length, relevados: con.length, borradores: est.filter(e => e.diag && e.diag.estado === 'Borrador').length, enviados: est.filter(e => e.diag && e.diag.estado === 'Enviado').length,
      promedio: con.length ? Math.round(10 * con.reduce((a, e) => a + Number(e.diag.pct), 0) / con.length) / 10 : null, criticos: con.filter(e => Number(e.diag.criticos) > 0).length } };
  try { c.put(k, JSON.stringify(out), 600); } catch (e) {}
  return out;
}

// ------------------------------------------------------------------ ENTRADA DEL PORTAL (clave de Higiene y Seguridad): acciones «p_dgm_…», con datos.m = 'agua' o 'plagas'
function dgmPortal_(accion, x) {
  const m = String(x.m || ''); if (!DGM[m]) return { ok: false, mensaje: 'Falta el módulo (agua o plagas).' };
  if (accion !== 'p_dgm_tablero' && !dgmInstalado_(m)) return { ok: false, mensaje: 'El diagnóstico de ' + m + ' todavía no está instalado.' };
  switch (accion) {
    case 'p_dgm_tablero': return dgmTablero_(m, x.fresco);
    case 'p_dgm_abrir': return dgmAbrir_(m, x.cod, x.id);
    case 'p_dgm_guardar': return conLock_(() => dgmGuardar_(m, x, false));
    case 'p_dgm_foto': return dgmFoto_(m, x);
  }
  return { ok: false, error: 'Acción desconocida.' };
}
