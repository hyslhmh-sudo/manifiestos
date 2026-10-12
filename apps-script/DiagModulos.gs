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
const DGM_H_ITEMS = ['ID', 'SECCION', 'ITEM', 'AYUDA', 'NIVEL', 'TIPO', 'OPCIONES', 'PESO', 'CRITICO', 'REFERENCIA', 'ACTIVO', 'FOTO', 'CONDICION', 'PREVIO', 'PUNTAJES', 'ALCANCE', 'URGENCIA', 'IMPORTANCIA', 'PROPUESTA'];
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
  const filas = P.map(r => [limpio_(r[0]), r[2], r[3], r[4], r[5], r[6], r[7], r[8], r[9], r[10], 'Sí', r[11], limpio_(r[12]), '', r[13], r[1] || 'Todos', r[9] === 'Sí' ? 3 : 2, Number(r[8]) >= 3 ? 3 : 2, '']);
  const it = ss.getSheets()[0].setName('ITEMS');
  encabezar_(it, 'Cuestionario del diagnóstico de ' + m, 'Editable: para dejar de usar una pregunta, ACTIVO = No (no la borres). NIVEL E = establecimiento, S = cada lugar.', DGM_H_ITEMS,
    ['Código fijo.', 'Sección.', 'Pregunta.', 'Ayuda que ve quien completa.', 'E: una vez · S: por cada lugar.', 'LISTA · MULTI · NUMERO · TEXTO.', 'Opciones separadas por «|».', '1 a 3.', 'Sí: si la respuesta vale 0, es punto crítico.', 'Norma de referencia.', 'Sí / No.', 'Sí: permite fotos.', '«ID ~ A|B», «ID = X», «ID != X», «LUGAR ~ Tanque|Cisterna» (solo en esos lugares); varias con «;».', 'Sí: se responde antes de los lugares.', 'Valor de cada opción, alineado con OPCIONES («-» no puntúa).', 'A quién se pregunta.', '1 a 3.', '1 a 3.', 'Mejora que se propone en el informe y en el plan de acción cuando la respuesta no cumple.']);
  it.getRange(6, 1, filas.length, DGM_H_ITEMS.length).setValues(filas);
  it.setFrozenColumns(3); it.setColumnWidth(3, 420); it.setColumnWidth(4, 300); it.setColumnWidth(7, 320);
  lista_(it, 4, 300, ['E', 'S']); lista_(it, 5, 300, ['LISTA', 'MULTI', 'NUMERO', 'TEXTO']); lista_(it, 10, 300, ['Sí', 'No']); lista_(it, 11, 300, ['Sí', '']);
  proteger_(it, [it.getRange('A1:S5'), it.getRange(6, 1, 300, 1)], 'Encabezados y códigos');
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
  // El informe y su correo llevan el módulo en el nombre de la acción (p_dgm_informe_agua, p_dgm_correo_plagas): el botón común del portal solo manda cod e id
  const suf = /^p_dgm_(informe|correo)_(agua|plagas)$/.exec(accion); if (suf) { x.m = suf[2]; accion = 'p_dgm_' + suf[1]; }
  const m = String(x.m || ''); if (!DGM[m]) return { ok: false, mensaje: 'Falta el módulo (agua o plagas).' };
  if (accion !== 'p_dgm_tablero' && !dgmInstalado_(m)) return { ok: false, mensaje: 'El diagnóstico de ' + m + ' todavía no está instalado.' };
  switch (accion) {
    case 'p_dgm_tablero': return dgmTablero_(m, x.fresco);
    case 'p_dgm_abrir': return dgmAbrir_(m, x.cod, x.id);
    case 'p_dgm_guardar': return conLock_(() => dgmGuardar_(m, x, false));
    case 'p_dgm_foto': return dgmFoto_(m, x);
    case 'p_dgm_informe': return dgmInforme_(m, x);
    case 'p_dgm_correo': { const X = dgmInfDatos_(m, x.cod, x.id); if (!X.ok) return X; const prev = pInformesDiag_(X.A.ID_DIAG); if (!prev.length) return { ok: false, mensaje: 'Todavía no hay informe de este diagnóstico.' }; return { ok: true, correo: dgmCorreo_(X, infConfig_(X.cod), prev[0].codigo) }; }
  }
  return { ok: false, error: 'Acción desconocida.' };
}

// ------------------------------------------------------------------ INFORME A LA DIRECCIÓN (Google Doc editable + PDF, con número HYSL)
// Estructura: portada · índice · resumen ejecutivo · 1. Presentación · 2. Método de trabajo · 3. Descripción de los hechos ·
// 4. Análisis de los datos · 5. Conclusión · 6. Recomendaciones (de la columna PROPUESTA de ITEMS) · cierre y firma · anexo fotográfico.
// Notas al pie con la normativa (infNotas_). Borrador en versión 0: se revisa y se firma.
const DGM_LOGO_PIE = '1DnztPPclcsCNA23DDlAF-90Uchf6QdzN';   // logo de HySL («Hospitales más seguros para las personas»)
const DGM_NORMAS = {
  '19587': 'Ley 19.587 de Higiene y Seguridad en el Trabajo y Decreto reglamentario 351/79.',
  '905': 'Res. SRT 905/2015, que establece las funciones de los Servicios de Higiene y Seguridad en el Trabajo.',
  '523': 'Res. MTSS 523/95, parámetros de calidad del agua para consumo humano (Decreto 351/79, arts. 57 y 58).',
  'CAA': 'Ley 18.284, Código Alimentario Argentino (CAA), art. 982 (agua potable) y capítulo II (condiciones higiénico-sanitarias).',
  'DPSB': 'Secretaría de Salud del Chubut (DPSB): Proceso de limpieza y desinfección de tanques, cisternas y red interna, y Proceso de toma de muestra y gestión de resultados para hospitales y CAPS.',
  '299': 'Res. SRT 299/2011, elementos de protección personal.',
  '801': 'Res. SRT 801/2015, Sistema Globalmente Armonizado (SGA) de clasificación y etiquetado de productos químicos.',
  'MSN': 'Ministerio de Salud de la Nación (2023), recomendaciones para la prevención de Legionella en establecimientos de salud.',
  'ANMAT': 'Productos domisanitarios con registro ante la Administración Nacional de Medicamentos, Alimentos y Tecnología Médica (ANMAT).',
  'Aedes': 'Ministerio de Salud de la Nación, recomendaciones para la eliminación de criaderos del mosquito Aedes aegypti.',
  'POE': 'Procedimientos operativos estandarizados (POE) propios del establecimiento.'
};
const dgmNormasDe_ = ref => { ref = String(ref || ''); const k = [];
  if (/19\.587|351\/79/.test(ref)) k.push('19587'); if (/905\/2015/.test(ref)) k.push('905'); if (/523\/95/.test(ref)) k.push('523'); if (/CAA/.test(ref)) k.push('CAA');
  if (/DPSB|provincial/.test(ref)) k.push('DPSB'); if (/299\/2011/.test(ref)) k.push('299'); if (/801\/2015|SGA/.test(ref)) k.push('801'); if (/Ministerio de Salud de la Naci[oó]n \(2023\)|Legionella/.test(ref)) k.push('MSN');
  if (/ANMAT/.test(ref)) k.push('ANMAT'); if (/Aedes/.test(ref)) k.push('Aedes'); if (/POE/.test(ref)) k.push('POE'); return k; };
const DGM_PRIOR = { 'Actuar ya': 0, 'Resolver rápido': 1, 'Planificar': 2 };

function dgmInfDatos_(m, cod, id) {
  cod = limpio_(cod); const D = dgmAbrir_(m, cod, id || '');
  let A = D.actual; if (!A || A.ESTADO !== 'Cerrado') { if (!id && D.previo) return dgmInfDatos_(m, cod, D.previo.ID_DIAG); return { ok: false, mensaje: A ? 'El informe se genera solo desde un diagnóstico cerrado.' : 'No hay un diagnóstico de ' + m + ' de este establecimiento.' }; }
  const items = D.items, porId = {}; items.forEach(i => porId[i.ID] = i);
  const R = D.respuestas.filter(r => porId[r.item] && diagAplica_(porId[r.item], D.respuestas, r.sitio, porId));
  return { ok: true, m: m, D: D, A: A, items: items, porId: porId, R: R, calc: pDiagCalcular_(items, R), E: est_(cod) || {}, cod: cod };
}
// Hallazgos: respuestas que no cumplen del todo, agrupadas por pregunta (con sus lugares), prioridad y plazo
function dgmHallazgos_(X, cfg) {
  const porItem = {}, hoy = new Date();
  X.R.forEach(r => { const it = X.porId[r.item]; if (!it) return; const w = pDiagValor_(it, { resp: r.resp, valor: r.valor }); if (w == null || w >= 1) return;
    const h = porItem[it.ID] = porItem[it.ID] || { it: it, lugares: [], peor: 1, obs: [], fotos: [] };
    h.lugares.push(r.sitio || 'Establecimiento'); h.peor = Math.min(h.peor, w); if (r.obs) h.obs.push((r.sitio ? r.sitio + ': ' : '') + r.obs); (r.fotos || []).forEach(f => h.fotos.push(f)); });
  return Object.keys(porItem).map(k => { const h = porItem[k], it = h.it, critico = it.CRITICO === 'Sí' && h.peor <= 1 / 3;
    h.critico = critico; h.prioridad = critico ? 'Actuar ya' : Number(it.PESO) >= 3 || it.CRITICO === 'Sí' ? 'Resolver rápido' : 'Planificar';
    h.dias = h.prioridad === 'Actuar ya' ? cfg.plazo.Q1 : h.prioridad === 'Resolver rápido' ? cfg.plazo.Q3 : cfg.plazo.Q2;
    const l = new Date(hoy.getTime() + h.dias * 864e5); h.limite = Utilities.formatDate(l, TZ, 'yyyy-MM-dd');
    h.propuesta = limpio_(it.PROPUESTA) || 's/d (revisar): definir la mejora para «' + it.ITEM + '».'; return h; })
    .sort((a, b) => DGM_PRIOR[a.prioridad] - DGM_PRIOR[b.prioridad] || Number(b.it.PESO || 0) - Number(a.it.PESO || 0) || a.peor - b.peor);
}

function dgmInforme_(m, x) {
  const K = dgmCfg_(m), X = dgmInfDatos_(m, x.cod, x.id); if (!X.ok) return X;
  if (!X.E.carpeta) return { ok: false, mensaje: 'El establecimiento no tiene carpeta en el sistema.' };
  const cfg = infConfig_(X.cod), C = cfg.C, A = X.A, calc = X.calc, D = X.D, R = X.R, porId = X.porId;
  if (!calc.n) return { ok: false, mensaje: 'El diagnóstico no tiene puntos evaluados: completalo antes de generar el informe.' };
  const TEMA = m === 'agua' ? 'gestión del agua para consumo' : 'manejo integrado de plagas', TEMA_DE = m === 'agua' ? 'de la gestión del agua para consumo' : 'del manejo integrado de plagas', TIT = 'Diagnóstico de ' + (m === 'agua' ? 'agua' : 'plagas');
  const prev = pInformesDiag_(A.ID_DIAG); let codigo, revision = 0;
  if (prev.length) { codigo = prev[0].codigo; if (prev[0].doc) { const mm = /Revisión (\d+)/.exec(String(prev[0].obs || '')); revision = mm ? Number(mm[1]) + 1 : 1; } }
  else { const n = docNumero_({ est: X.cod, bloque: 'GEN', tipo: 'DG', asunto: TIT + ' · ' + (X.E.nombre || X.cod), origen: 'Sistema', idOrigen: A.ID_DIAG, pedidoPor: Session.getActiveUser().getEmail() }); if (!n.ok) return n; codigo = n.codigo; }
  const hoyD = new Date(), hoy = Utilities.formatDate(hoyD, TZ, 'dd/MM/yyyy'), fTxt = f => f ? String(f).slice(0, 10).split('-').reverse().join('/') : 's/d', fRel = fTxt(A.FECHA);
  const nombre = X.E.nombre || D.nombre || X.cod, H = dgmHallazgos_(X, cfg), crit = H.filter(h => h.critico);
  const conArt = /^(Hospital|Centro|Puesto|Servicio)\b/.test(nombre), deN = (conArt ? 'del ' : 'de ') + nombre, enN = (conArt ? 'en el ' : 'en ') + nombre;
  const nose = R.filter(r => /(^|\|)No se sabe|No se midió|No se pudo observar/.test(String(r.valor || r.resp || ''))).map(r => ({ it: porId[r.item], r: r }));
  const bloques = Object.keys(calc.porSeccion).filter(s => !/^0 ·|Comentarios/.test(s)).map(s => [s, calc.porSeccion[s]]).sort((a, b) => b[1] - a[1]);
  const sinLetra = s => String(s).replace(/^[0-9A-Z]+\d? · /, '');
  const lugares = ['Establecimiento'].concat(D.sitios.map(s => s.sitio)).filter(s => R.some(r => (r.sitio || 'Establecimiento') === s));
  const v = id => { const r = R.find(q => q.item === id && !q.sitio); return r ? String(r.valor || r.resp || '') : ''; };
  const respTxt = r => { const it = porId[r.item] || {}, t = String(r.valor || r.resp || ''); return it.TIPO === 'TEXTO' ? t : t.split('|').map(minus).join(', '); };
  const local = C.MODO_LOCAL === 'Sí', COMP = C.NOTA_COMPETENCIAS || 'Ley 19.587 de Higiene y Seguridad en el Trabajo; Decreto 351/79; Res. SRT 905/2015, funciones de los servicios de Higiene y Seguridad en el Trabajo.';

  const carpeta = carpeta_(DriveApp.getFolderById(X.E.carpeta), 'Informes');
  const titulo = codigo + (revision ? ' · Rev. ' + revision : '') + ' · ' + TIT + ' · ' + nombre;
  let doc; const notas = [];
  try {
    doc = DocumentApp.create(titulo); DriveApp.getFileById(doc.getId()).moveTo(carpeta);
    const b = doc.getBody(); b.setPageWidth(595.3).setPageHeight(841.9).setMarginTop(56).setMarginBottom(56).setMarginLeft(62).setMarginRight(57);
    const AT = DocumentApp.Attribute, est = o => { const a = {}; a[AT.FONT_FAMILY] = INF2.FUENTE; a[AT.FONT_SIZE] = o.tam || 10.5; a[AT.FOREGROUND_COLOR] = o.color || INF2.TEXTO; a[AT.BOLD] = !!o.neg; a[AT.ITALIC] = !!o.it; return a; };
    const IZQ = DocumentApp.HorizontalAlignment.LEFT;
    const P_ = (t, o) => { o = o || {}; const p = b.appendParagraph(t || ''); if (o.h) p.setHeading(o.h); p.setAttributes(est(o)); p.setAlignment(o.izq ? IZQ : DocumentApp.HorizontalAlignment.JUSTIFY); p.setLineSpacing(o.inter || 1.5); p.setSpacingAfter(o.desp == null ? 6 : o.desp); p.setSpacingBefore(o.antes || 0); return p; };
    const G = t => P_(t, { it: true, color: INF2.PATA, tam: 9.5 });   // guía: se borra al revisar
    const H1 = t => P_(t, { h: DocumentApp.ParagraphHeading.HEADING1, tam: 14, neg: true, color: INF2.AZUL, izq: true, desp: 8, antes: 6, inter: 1.15 });
    const H2 = t => P_(t, { h: DocumentApp.ParagraphHeading.HEADING2, tam: 11.5, neg: true, color: INF2.AZUL, izq: true, desp: 4, antes: 6, inter: 1.15 });
    const TAB = (filas, anchos) => infTabla2_(b, filas, anchos);
    const yaNota = {}, nota = (clave, texto) => { if (!texto || yaNota[clave]) return ''; notas.push(texto); yaNota[clave] = notas.length; return '[[NOTA' + notas.length + ']]'; };
    const notaN = k => nota('n_' + k, DGM_NORMAS[k]);
    const refTxt = it => { const k = dgmNormasDe_(it.REFERENCIA); return (it.REFERENCIA || '—') + k.map(notaN).join(''); };

    // ---------------- PORTADA
    const enc = b.getParagraphs()[0]; enc.setText(C.ENCABEZADO_LINEA1 || 'Hospital Zonal Trelew «Dr. Adolfo Margara» · Hospital María Humphreys'); enc.setAttributes(est({ tam: 11, neg: true, color: INF2.AZUL })); enc.setAlignment(IZQ);
    P_('Servicio de Higiene y Seguridad Laboral', { color: INF2.PATA, izq: true, desp: 70 });
    P_('INFORME TÉCNICO', { tam: 9, neg: true, color: INF2.PATA, izq: true, desp: 4, inter: 1.1 });
    P_(TIT, { tam: 24, neg: true, color: INF2.AZUL, izq: true, desp: 4, inter: 1.1 });
    P_(nombre + ' · ' + lbMay_(TEMA), { tam: 13, color: INF2.PATA, izq: true, desp: 36, inter: 1.2 });
    TAB([['Informe N.º', codigo + (revision ? ' · Revisión ' + revision : '')], ['Establecimiento', nombre], ['Tipo de relevamiento', 'Diagnóstico (línea de base)'],
      ['Fecha del relevamiento', fRel], ['Fecha del informe', hoy], ['Destinatario', 'Dirección del establecimiento'],
      ['Elaboró', (C.FIRMA_NOMBRE || 'Belén Pellegrini') + ' · Licenciada en Higiene, Seguridad y Medio Ambiente del Trabajo, M.P. LCOHSECH0383'], ['Módulo del sistema HyS', K.modulo]], [150, 320]);
    G('Borrador generado por el sistema HyS (versión 0). Los textos en celeste e itálica son guía: revisarlos, completarlos y borrarlos antes de firmar. Números de página: Insertar › Números de página.');
    b.appendPageBreak();
    // ---------------- ÍNDICE
    H1('Índice'); G('Para tener el índice con números de página: Insertar › Índice, y borrar esta lista.');
    ['Resumen ejecutivo', '1. Presentación', '2. Método de trabajo', '3. Descripción de los hechos', '4. Análisis de los datos', '5. Conclusión', '6. Recomendaciones', 'Anexo · Registro fotográfico']
      .forEach(t => P_(t, { izq: true, desp: 0, inter: 1.3 }));
    b.appendPageBreak();

    // ---------------- RESUMEN EJECUTIVO (prosa, sin tablas)
    H1('Resumen ejecutivo');
    const mejores = bloques.filter(s => s[1] >= 60).slice(0, 2).map(s => '«' + minus(sinLetra(s[0])) + '»'), peores = bloques.filter(s => s[1] < 60).slice(-2).reverse().map(s => '«' + minus(sinLetra(s[0])) + '»');
    const critTxt = crit.slice(0, 4).map(h => minus(String(h.it.ITEM).replace(/^¿|\?$/g, '')));
    P_('El ' + fRel + ' se realizó el diagnóstico ' + TEMA_DE + ' ' + deN + ', en el marco de las funciones del Servicio de Higiene y Seguridad Laboral' + nota('competencias', COMP) + '. ' +
      'El cumplimiento general fue del ' + (calc.pct === '' ? 's/d' : pc(calc.pct) + ' %') + '. ' + (mejores.length ? 'Los mejores resultados están en ' + lista(mejores) + '. ' : '') + (peores.length ? 'Las brechas mayores se concentran en ' + lista(peores) + '. ' : '') +
      (crit.length ? (crit.length > 1 ? 'Se registraron ' + crit.length + ' hallazgos críticos, que conviene atender dentro de los ' + cfg.plazo.Q1 + ' días: ' : 'Se registró un hallazgo crítico, que conviene atender dentro de los ' + cfg.plazo.Q1 + ' días: ') + critTxt.join('; ') + '.' : 'No se registraron hallazgos críticos.'));
    P_((H.length ? 'El informe propone ' + H.length + (H.length > 1 ? ' mejoras, ordenadas' : ' mejora, ordenada') + ' por prioridad y plazo, que se registrarán en el plan de acción para su seguimiento. ' : 'No surgen mejoras a proponer en esta instancia. ') +
      (nose.length ? (nose.length > 1 ? 'Quedaron ' + nose.length + ' datos sin conocer, que no restan puntaje y se relevarán más adelante.' : 'Quedó un dato sin conocer, que no resta puntaje y se relevará más adelante.') : ''));
    G('Revisar: uno o dos párrafos en prosa, sin tablas; debe leerse en un minuto.');

    // ---------------- 1. PRESENTACIÓN
    H1('1. Presentación');
    if (m === 'agua') P_('El agua para consumo de un establecimiento de salud la usan pacientes con defensas bajas y el personal, y se emplea en la higiene y en la preparación de alimentos. Las normas exigen que sea apta para el consumo' + notaN('19587') + notaN('523') + ' y que los tanques y cisternas se limpien y desinfecten con una frecuencia definida y registrada' + notaN('DPSB') + '. La limpieza de reservorios, además, expone a quien la realiza a trabajo en altura, espacios confinados y productos químicos.');
    else P_('La presencia de plagas en un establecimiento de salud es un riesgo para pacientes, personal y alimentos. El manejo integrado de plagas (MIP) prioriza la prevención —condiciones del edificio, orden, limpieza y residuos— y usa productos solo cuando hace falta, registrados' + notaN('ANMAT') + ' y aplicados por personal capacitado y protegido' + notaN('19587') + '.');
    P_('El presente informe tiene por objeto poner en conocimiento de la Dirección la situación de partida (línea de base) ' + TEMA_DE + ' ' + enN + ', con propuestas de mejora ordenadas por prioridad. Registra lo encontrado sin valoración de las personas, para poder medir después los cambios.');

    // ---------------- 2. MÉTODO DE TRABAJO
    H1('2. Método de trabajo');
    TAB([['Aspecto', 'Detalle'], ['Modalidad', (A.MODALIDAD || 's/d') + (A.RELEVADO_POR ? ' · relevado por ' + A.RELEVADO_POR : '')], ['Fecha', fRel],
      ['Informantes', A.ENTREVISTADO || 's/d'], ['Período de referencia', 'Últimos 12 meses'],
      ['Lugares relevados', lugares.map(s => s === 'Establecimiento' ? 'Generales del establecimiento' : s).join(' · ')]], [130, 340]);
    P_('Se utilizó el cuestionario del ' + K.modulo.toLowerCase().replace('módulo', 'módulo') + ' del sistema HyS, con preguntas generales del establecimiento y observaciones en cada lugar recorrido' + (m === 'agua' ? ' (cada tanque o cisterna, sala de bombas y puntos de consumo)' : ' (cocina, depósitos, local de residuos, internación, sótanos y exterior)') +
      '. Cada pregunta indica su referencia normativa. En las que puntúan, la mejor situación vale 1, las intermedias valen en proporción y la peor vale 0; las preguntas tienen un peso de 1 a 3 y algunas se marcan como críticas. Las respuestas «no se sabe» y «no aplica» no se cuentan.');
    P_('Prioridad de las mejoras: un punto crítico que no se cumple se ubica en «actuar ya» (' + cfg.plazo.Q1 + ' días); los puntos de peso alto o críticos con cumplimiento parcial, en «resolver rápido» (' + cfg.plazo.Q3 + ' días); el resto, en «planificar» (' + cfg.plazo.Q2 + ' días).');
    G('Revisar: limitaciones del relevamiento (lugares sin acceso, mediciones no realizadas).');

    // ---------------- 3. DESCRIPCIÓN DE LOS HECHOS
    H1('3. Descripción de los hechos');
    P_('Se describe la situación informada y observada, por bloque, sin valoración normativa.');
    const secs = Array.from(new Set(X.items.map(i => i.SECCION))); let nS = 0;
    secs.forEach(sec => {
      const its = X.items.filter(i => i.SECCION === sec), lineas = [];
      ['Establecimiento'].concat(D.sitios.map(s => s.sitio)).forEach(lug => {
        const partes = [];
        its.forEach(it => { const r = R.find(q => q.item === it.ID && (q.sitio || 'Establecimiento') === lug); if (!r) return;
          if (it.TIPO === 'TEXTO') { if (r.valor) partes.push((it.ID === 'LUG01' ? 'comentarios' : minus(it.ITEM)) + ': ' + String(r.valor)); return; }
          const val = String(r.valor || r.resp || ''); if (!val) return;
          partes.push(String(it.ITEM).replace(/\?\s*¿/g, ', ').replace(/[¿?]/g, '').replace(/\s*\([^)]*\)\s*$/, '').replace(/:\s/g, ', ') + ': ' + respTxt(r) + (r.obs ? ' (' + r.obs + ')' : '')); });
        if (partes.length) lineas.push((lug === 'Establecimiento' ? '' : lug + '. ') + lbMay_(partes.map((x, i) => i ? minus(x) : x).join('; ')) + '.');
      });
      if (!lineas.length) return;
      nS++; H2('3.' + nS + ' ' + sinLetra(sec)); lineas.forEach(l => P_(l));
    });

    // ---------------- 4. ANÁLISIS DE LOS DATOS
    H1('4. Análisis de los datos');
    H2('4.1 Resultado general, por bloque y por lugar');
    TAB([['Bloque', 'Cumplimiento'], ['Total del establecimiento', calc.pct === '' ? 's/d' : pc(calc.pct) + ' %']].concat(bloques.map(s => [sinLetra(s[0]), pc(s[1]) + ' %'])), [340, 130]);
    if (lugares.length > 2) { const fl = [['Lugar', 'Puntos evaluados', 'Cumplimiento']]; lugares.filter(l => l !== 'Establecimiento').forEach(l => { const c = pDiagCalcular_(X.items, R.filter(r => (r.sitio || 'Establecimiento') === l)); if (c.n) fl.push([l, String(c.n), pc(c.pct) + ' %']); }); if (fl.length > 1) TAB(fl, [270, 100, 100]); }
    H2('4.2 Hallazgos críticos');
    if (crit.length) { P_('Situaciones que comprometen la salud de pacientes y personal o la seguridad de quien trabaja. Se informan aparte porque requieren atención aunque el porcentaje general sea aceptable.');
      TAB([['Situación', 'Lugar', 'Referencia']].concat(crit.map(h => [h.it.ITEM, h.lugares.join(', '), refTxt(h.it)])), [210, 120, 140]); }
    else P_('No se registraron hallazgos críticos.');
    H2('4.3 Otras brechas respecto de la normativa');
    const otras = H.filter(h => !h.critico);
    if (otras.length) TAB([['Requisito', 'Lugar', 'Referencia']].concat(otras.map(h => [h.it.ITEM, h.lugares.join(', '), refTxt(h.it)])), [210, 120, 140]);
    else P_('No se registraron otras brechas.');
    H2('4.4 Datos a relevar');
    P_(nose.length ? 'Los siguientes datos no se conocían al momento del relevamiento; no restan puntaje y quedan pendientes: ' + Array.from(new Set(nose.map(h => minus(String(h.it.ITEM).replace(/^¿|\?$/g, '')) + (h.r.sitio ? ' (' + h.r.sitio + ')' : '')))).join('; ') + '.' : 'No quedaron datos sin conocer.');
    G('Completar: con qué se relacionan principalmente las brechas (organización, mantenimiento, recursos) y qué indican.');

    // ---------------- 5. CONCLUSIÓN
    H1('5. Conclusión');
    P_('La línea de base ' + TEMA_DE + ' ' + deN + ' registra un cumplimiento general del ' + (calc.pct === '' ? 's/d' : pc(calc.pct) + ' %') + (crit.length ? ', con ' + crit.length + (crit.length > 1 ? ' hallazgos críticos' : ' hallazgo crítico') : ', sin hallazgos críticos') + (nose.length ? ' y ' + nose.length + (nose.length > 1 ? ' datos' : ' dato') + ' a relevar' : '') + '. ' +
      (peores.length ? 'Los bloques con mayor margen de mejora son ' + lista(peores) + '. ' : '') +
      (crit.length ? 'Resolver primero los hallazgos críticos reduce el riesgo principal; el resto de las mejoras puede planificarse según los recursos disponibles. ' : 'Las mejoras propuestas permiten sostener y mejorar el nivel de cumplimiento. ') +
      'Estos resultados son el punto de partida para acordar las medidas y medir su avance en los próximos relevamientos.');

    // ---------------- 6. RECOMENDACIONES
    H1('6. Recomendaciones');
    if (H.length) {
      P_('Se proponen las siguientes mejoras, ordenadas por prioridad. Se solicita a la Dirección que, por su intermedio, se requiera a los servicios responsables la confirmación de las acciones y de los plazos de ejecución, que se registrarán en el plan de acción del sistema para su seguimiento.');
      TAB([['Prioridad', 'Hallazgo', 'Propuesta de mejora', 'Lugar', 'Fecha límite sugerida']].concat(H.map(h => [h.prioridad + ' (' + h.dias + ' días)', h.it.ITEM, h.propuesta, h.lugares.join(', '), fTxt(h.limite)])), [70, 120, 160, 70, 55]);
    } else P_('No surgen mejoras a proponer en esta instancia.');
    const seg = new Date(hoyD.getTime() + cfg.plazo.Q1 * 864e5);
    P_('El Servicio de Higiene y Seguridad Laboral realizará el seguimiento a partir del ' + Utilities.formatDate(seg, TZ, 'dd/MM/yyyy') + ', empezando por los hallazgos críticos y las acciones comprometidas.');

    // ---------------- CIERRE Y FIRMA
    P_(C.TEXTO_CIERRE || 'Quedo a disposición por cualquier consulta, requerimiento o ampliación de lo informado.', { antes: 14 });
    P_('Celular: ' + (C.CONTACTO_CELULAR || '2804389910') + ' · Correo electrónico: ' + (C.CONTACTO_CORREO || 'belenpellegrini.hys@gmail.com'), { izq: true, desp: 30 });
    [[C.FIRMA_NOMBRE || 'Belén Pellegrini', true], ['Licenciada en Higiene, Seguridad y Medio Ambiente del Trabajo', false], ['M.P. LCOHSECH0383', false], [local ? 'Servicio de Higiene y Seguridad Laboral' : (C.CARGO || 'Servicio de Higiene y Seguridad Laboral'), false]]
      .forEach(f => P_(f[0], { neg: f[1], color: f[1] ? INF2.AZUL : INF2.TEXTO, tam: f[1] ? 10.5 : 9.5, izq: true, desp: 0, inter: 1.2 }));

    // ---------------- ANEXO FOTOGRÁFICO
    const fotos = []; R.forEach(r => (r.fotos || []).forEach(u => fotos.push({ u: u, h: { r: r, it: porId[r.item] || { ITEM: r.item } } })));
    b.appendPageBreak(); H1('Anexo · Registro fotográfico');
    if (fotos.length) infFotos_(b, fotos.slice(0, INF2.MAX_FOTOS), 1, porId); else G('No se cargaron fotos en el diagnóstico. Si las hay, insertarlas numeradas y con epígrafe.');

    // ---------------- PIE: código y logo de HySL
    try { const pie = doc.addFooter(), p0 = pie.getParagraphs()[0]; p0.setText(codigo); p0.setAttributes(est({ tam: 7.5, color: INF2.PATA })); p0.setAlignment(IZQ);
      const pl = pie.appendParagraph(''); pl.setAlignment(DocumentApp.HorizontalAlignment.CENTER); const img = pl.appendInlineImage(DriveApp.getFileById(DGM_LOGO_PIE).getBlob()); const w = 260; img.setHeight(Math.round(img.getHeight() * w / img.getWidth())); img.setWidth(w); } catch (e) {}
    doc.saveAndClose();
  } catch (err) { try { if (doc) DriveApp.getFileById(doc.getId()).setTrashed(true); } catch (e) {} throw err; }
  const notasOk = infNotas_(doc.getId(), notas);
  const pdf = carpeta.createFile(DriveApp.getFileById(doc.getId()).getAs('application/pdf')).setName(titulo + '.pdf');
  docActualizar_({ codigo: codigo, documento: doc.getUrl(), pdf: pdf.getUrl(), estado: 'Emitido', motivo: revision ? 'Revisión ' + revision + ' (' + hoy + ')' : '' });
  return { ok: true, codigo: codigo, revision: revision, doc: doc.getUrl(), pdf: pdf.getUrl(), correo: dgmCorreo_(X, cfg, codigo, H), notasAlPie: notasOk, criticos: crit.length, mejoras: H.length, aRelevar: nose.length };
}

// Texto del correo de envío (no se envía: se copia desde el portal)
function dgmCorreo_(X, cfg, codigo, H) {
  const C = cfg.C, calc = X.calc, nombre = X.E.nombre || X.D.nombre || X.cod, fRel = String(X.A.FECHA).slice(0, 10).split('-').reverse().join('/');
  const deN = (/^(Hospital|Centro|Puesto|Servicio)\b/.test(nombre) ? 'del ' : 'de ') + nombre;
  H = H || dgmHallazgos_(X, cfg); const crit = H.filter(h => h.critico).length, TEMA_DE = X.m === 'agua' ? 'de la gestión del agua para consumo' : 'del manejo integrado de plagas';
  return { asunto: codigo + ' · Diagnóstico de ' + (X.m === 'agua' ? 'agua' : 'plagas') + ' · ' + nombre,
    cuerpo: 'Sr./Sra. Director/a:\n\nEn el marco de las funciones del Servicio de Higiene y Seguridad Laboral¹, se remite el diagnóstico ' + TEMA_DE + ' ' + deN + ', relevado el ' + fRel + '.\n\n' +
      'El cumplimiento general fue del ' + (calc.pct === '' ? 's/d' : pc(calc.pct) + ' %') + '. ' + (crit ? 'Se identificaron ' + crit + ' hallazgo(s) crítico(s), detallados en el punto 4.2, que conviene atender dentro de los ' + cfg.plazo.Q1 + ' días.' : 'No se identificaron hallazgos críticos.') +
      (H.length ? ' En el punto 6 se proponen ' + H.length + ' mejora(s) ordenadas por prioridad, para confirmar responsables y plazos.' : '') + '\n\n' +
      (C.TEXTO_CIERRE || 'Quedo a disposición por cualquier consulta, requerimiento o ampliación de lo informado.') + '\n\nSaludos cordiales.\n\n' + (C.FIRMA_NOMBRE || 'Belén Pellegrini') + '\nServicio de Higiene y Seguridad Laboral\nCelular: ' + (C.CONTACTO_CELULAR || '2804389910') + ' · ' + (C.CONTACTO_CORREO || 'belenpellegrini.hys@gmail.com') +
      '\n\n———\n¹ ' + (C.NOTA_COMPETENCIAS || 'Ley 19.587; Decreto 351/79; Res. SRT 905/2015.'), copia: '' };
}

// ------------------------------------------------------------------ PRUEBA (desde el editor): informe con respuestas de ejemplo, sin número HYSL ni registro
// Genera «PRUEBA-…» en la carpeta Informes del establecimiento; borrarlo después de revisarlo.
function probarInformeAgua() { Logger.log(JSON.stringify(dgmProbarInforme_('agua', 'HMH'))); }
function probarInformePlagas() { Logger.log(JSON.stringify(dgmProbarInforme_('plagas', 'HMH'))); }
function dgmProbarInforme_(m, cod) {
  const items = dgmItems_(m), sitios = dgmLugares_(m, cod), porId = {}; items.forEach(i => porId[i.ID] = i);
  const resp = [], elegir = (it, k) => { const ops = String(it.OPCIONES || '').split('|').filter(Boolean); return ops[k % Math.max(1, ops.length - 1)] || ''; };
  let k = 0;
  items.forEach(it => {
    const lugares = it.NIVEL === 'S' ? sitios.map(s => s.sitio) : [''];
    lugares.forEach(s => { const r = { sitio: s, item: it.ID, resp: '', valor: '', obs: '', fotos: [] };
      if (it.TIPO === 'TEXTO') r.valor = it.ID === 'LUG01' ? '' : 's/d';
      else if (it.TIPO === 'MULTI') r.valor = String(it.OPCIONES).split('|')[0];
      else r.valor = it.ID === 'AGU04' ? 'Sí' : elegir(it, k++);
      if (r.valor) resp.push(r); });
  });
  const R = resp.filter(r => diagAplica_(porId[r.item], resp, r.sitio, porId)), f = pEstablecimientos_().filas.find(x => limpio_(x.v[0]) === cod);
  const A = { ID_DIAG: 'PRUEBA-' + m.toUpperCase(), CODIGO: cod, FECHA: Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd'), MODALIDAD: 'Visita', RELEVADO_POR: 'Belén Pellegrini', ENTREVISTADO: 's/d (prueba)', ESTADO: 'Cerrado' };
  const X = { ok: true, m: m, A: A, items: items, porId: porId, R: R, calc: pDiagCalcular_(items, R), E: est_(cod) || {}, cod: cod,
    D: { nombre: f ? f.v[1] : cod, sitios: sitios, actual: A, respuestas: R, items: items } };
  const g = this, orig = { dgmInfDatos_: g.dgmInfDatos_, docNumero_: g.docNumero_, docActualizar_: g.docActualizar_, pInformesDiag_: g.pInformesDiag_ };
  try {
    g.dgmInfDatos_ = () => X; g.docNumero_ = () => ({ ok: true, codigo: 'PRUEBA-' + cod + '-' + m.toUpperCase() }); g.docActualizar_ = () => ({ ok: true }); g.pInformesDiag_ = () => [];
    return dgmInforme_(m, { cod: cod, id: A.ID_DIAG });
  } finally { Object.keys(orig).forEach(n => g[n] = orig[n]); }
}
