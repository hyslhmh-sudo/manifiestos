/**
 * SISTEMA HyS · MÓDULO 6 · COCINAS HOSPITALARIAS
 * Libro propio: «DIAGNÓSTICO DE COCINAS · Sistema HyS» (propiedad DIAG_COC_ID). Hojas:
 *   ITEMS         cuestionario editable (mismo formato que residuos + ALCANCE: Todos / Rural (BPM) / No rural (HACCP))
 *   LUGARES       lugares que se recorren (cocina, depósito, heladeras, lactario…): se pueden agregar o desactivar
 *   DIAGNOSTICOS  un relevamiento por fila (establecimiento, fecha, resultado)
 *   RESPUESTAS    una respuesta por fila (por establecimiento o por lugar)
 * Personas de cocina: BASE COMÚN › COCINA_PERSONAS (una fila por manipulador, propio o de empresa). Todo editable desde la planilla.
 * Alcance: «Hospital rural» (BASE COMÚN › ESTABLECIMIENTOS › TIPO) responde BPM; el resto, BPM + HACCP.
 * Cálculo: el mismo motor que el diagnóstico de residuos (Diag.gs): PUNTAJES, PESO, CRITICO, CONDICION.
 * Instalación: ejecutar una vez construirModuloCocinas(). Después todo se maneja desde el portal y la planilla.
 */
const COC_H_ITEMS = ['ID', 'SECCION', 'ITEM', 'AYUDA', 'NIVEL', 'TIPO', 'OPCIONES', 'PESO', 'CRITICO', 'REFERENCIA', 'ACTIVO', 'FOTO', 'CONDICION', 'PREVIO', 'PUNTAJES', 'ALCANCE', 'URGENCIA', 'IMPORTANCIA', 'PROPUESTA'];   // PROPUESTA: mejora que el informe recomienda y que pasa al plan de acción (12/10/2026)
const COC_H_LUG = ['LUGAR', 'CUANDO', 'QUE_SE_OBSERVA', 'ACTIVO'];
const COC_H_PER = ['ID', 'ESTABLECIMIENTO', 'ORIGEN', 'DNI', 'APELLIDO_Y_NOMBRE', 'EMPRESA', 'FUNCION_COCINA', 'CARNET_TIENE', 'CARNET_EMISOR', 'CARNET_EMISION', 'CARNET_VENCE', 'CARNET_FOTO',
  'LIBRETA_TIENE', 'LIBRETA_EMISOR', 'LIBRETA_EMISION', 'LIBRETA_VENCE', 'LIBRETA_FOTO', 'CAPACITACION_BPM', 'ACTIVO', 'OBSERVACIONES', 'CARGADO_POR', 'ACTUALIZADO'];
const COC_FUNCIONES = ['Cocinero/a', 'Ayudante de cocina', 'Ecónomo o depósito', 'Distribución a pisos', 'Lactario', 'Lavado (bacha)', 'Nutricionista', 'Encargado/a', 'Otro'];
const COC_VIG = { carnet: 3, libreta: 1 };   // años de vigencia cuando solo se carga la fecha de emisión (confirmado por Belén, oct 2026)
const COC_AVISO_DIAS = 60;
const COC_SIN = 'COC01 != No hay servicio de alimentación';   // si no hay servicio de alimentación, solo se responde COC01

// ------------------------------------------------------------------ CONSTRUCCIÓN (una vez)
// Lee el cuestionario aprobado de la planilla de propuesta (hoja ITEMS) y arma el libro del módulo.
const COC_PROPUESTA = '1acik7_X2obVoptHXVCpBiFdGxQxduHT_2v1l0fPAs-M';
function construirModuloCocinas() {
  const ss = nuevoLibro_('DIAGNÓSTICO DE COCINAS · Sistema HyS', 'DIAG_COC_ID'); if (!ss) return;
  // Cuestionario: de la propuesta revisada (columnas ID · ALCANCE · SECCION · ITEM · AYUDA · NIVEL · TIPO · OPCIONES · PESO · CRITICO · REFERENCIA · FOTO · CONDICION · PUNTAJES)
  const P = SpreadsheetApp.openById(COC_PROPUESTA).getSheetByName('ITEMS').getDataRange().getValues().slice(1).filter(r => /^[A-Z]{3}\d{2}$/.test(limpio_(r[0])));
  const filas = P.map(r => {
    const id = limpio_(r[0]), cond = limpio_(r[12]);
    const c = id === 'COC01' ? '' : cond ? cond + '; ' + COC_SIN : COC_SIN;
    return [id, r[2], r[3], r[4], r[5], r[6], r[7], r[8], r[9], r[10], 'Sí', r[11], c, id === 'COC01' ? 'Sí' : '', r[13], r[1], r[9] === 'Sí' ? 3 : 2, Number(r[8]) >= 3 ? 3 : 2, ''];
  });
  filas.push(['LUG01', 'K · Comentarios del lugar', 'Comentarios del lugar', 'Lo que no esté en las preguntas: estado general, mejoras, novedades. Opcional.', 'S', 'TEXTO', '', '', '', '', 'Sí', 'Sí', COC_SIN, '', '', 'Todos', '', '']);
  const it = ss.getSheets()[0].setName('ITEMS');
  encabezar_(it, 'Cuestionario del relevamiento de cocinas (BPM y HACCP)', 'Editable: para dejar de usar una pregunta, ACTIVO = No (no la borres). NIVEL E = establecimiento, S = cada lugar. ALCANCE: Todos · Rural (BPM) · No rural (HACCP).', COC_H_ITEMS,
    ['Código fijo.', 'Sección.', 'Pregunta.', 'Ayuda que ve quien completa.', 'E: una vez · S: por cada lugar.', 'LISTA · MULTI · NUMERO · TEXTO.', 'Opciones separadas por «|».', '1 a 3.', 'Sí: si la respuesta vale 0, es punto crítico.', 'Norma de referencia.', 'Sí / No.', 'Sí: permite fotos.', '«ID ~ A|B», «ID = X», «ID != X»; varias con «;».', 'Sí: se responde antes de los lugares.', 'Valor de cada opción, alineado con OPCIONES («-» no puntúa).', 'A quién se pregunta.', '1 a 3.', '1 a 3.', 'Mejora que se propone en el informe y en el plan de acción cuando la respuesta no cumple.']);
  it.getRange(6, 1, filas.length, COC_H_ITEMS.length).setValues(filas);
  it.setFrozenColumns(3); it.setColumnWidth(3, 420); it.setColumnWidth(4, 300); it.setColumnWidth(7, 320);
  lista_(it, 4, 300, ['E', 'S']); lista_(it, 5, 300, ['LISTA', 'MULTI', 'NUMERO', 'TEXTO']); lista_(it, 10, 300, ['Sí', 'No']); lista_(it, 11, 300, ['Sí', '']); lista_(it, 15, 300, ['Todos', 'Rural (BPM)', 'No rural (HACCP)']);
  proteger_(it, [it.getRange('A1:R5'), it.getRange(6, 1, 300, 1)], 'Encabezados y códigos');
  const lu = ss.insertSheet('LUGARES');
  encabezar_(lu, 'Lugares que se recorren', 'Cada lugar es una pestaña del relevamiento. Para agregar uno, escribilo en una fila nueva; para dejar de usarlo, ACTIVO = No.', COC_H_LUG);
  const L = [['Cocina (área de elaboración)', 'Siempre que haya cocina', 'Personal, lavamanos, instalaciones, limpieza, plagas, residuos, extintor, pisos.', 'Sí'],
    ['Depósito seco', 'Si existe', 'Orden, estantes, PEPS, químicos separados, plagas.', 'Sí'],
    ['Heladeras y cámaras', 'Si existen', 'Termómetro, registro, crudos y cocidos separados.', 'Sí'],
    ['Lactario o sala de fórmulas', 'Si se preparan fórmulas lácteas o enterales', 'Separación, limpieza, lavamanos.', 'Sí'],
    ['Office de piso', 'Si se sirve o recalienta en los pisos', 'Heladera, limpieza, recipientes cerrados.', 'Sí'],
    ['Comedor del personal', 'Si existe', 'Limpieza, plagas, residuos.', 'Sí'],
    ['Vestuario del personal de cocina', 'Si existe', 'Separado de la cocina, en condiciones (Dto. 351/79).', 'Sí']];
  lu.getRange(6, 1, L.length, 4).setValues(L); lu.setColumnWidth(1, 260); lu.setColumnWidth(2, 260); lu.setColumnWidth(3, 420); lista_(lu, 3, 100, ['Sí', 'No']);
  const dg = ss.insertSheet('DIAGNOSTICOS');
  encabezar_(dg, 'Relevamientos de cocina', 'Una fila por relevamiento. Se completa desde el portal o desde la página para referentes. Para anular: ESTADO = Anulado (no borrar).', DIAG_H_DIAG.slice(0, 12).concat(['ALCANCE']), null, [7, 8, 9, 11]);
  lista_(dg, 3, 500, ['Visita', 'Entrevista', 'Referente (en línea)']); lista_(dg, 6, 500, DIAG_ESTADOS);
  const rp = ss.insertSheet('RESPUESTAS');
  encabezar_(rp, 'Respuestas', 'Una fila por pregunta respondida. SITIO vacío = pregunta del establecimiento; si no, es el lugar.', DIAG_H_RESP);
  const ini = ss.insertSheet('INICIO', 0);
  ini.getRange('A1').setValue('DIAGNÓSTICO DE COCINAS · Sistema HyS').setFontSize(18).setFontWeight('bold').setFontColor(BASES.AZUL);
  ini.getRange('A2:A7').setValues([['Módulo 6 · Cocinas hospitalarias. Línea de base de las buenas prácticas de manufactura (BPM) en todos los establecimientos y del sistema HACCP en los no rurales.'],
    ['Quién responde qué: lo decide el TIPO de la BASE COMÚN. «Hospital rural» → BPM; zonal, subzonal y regional → BPM + HACCP; puestos sanitarios → si no tienen servicio de alimentación, solo la primera pregunta.'],
    ['Cálculo: igual que el diagnóstico de residuos. Cada opción vale lo que dice PUNTAJES (1, 0,5, 0); «No se sabe» no cuenta y queda como dato a relevar. PESO 1 a 3. CRITICO = Sí: si vale 0, es punto crítico.'],
    ['Personas de cocina (carnet de manipulador y libreta sanitaria): BASE COMÚN › hoja COCINA_PERSONAS. Vigencia que usa el sistema si solo se carga la emisión: carnet 3 años, libreta 1 año.'],
    ['Hojas: ITEMS (cuestionario), LUGARES (pestañas del relevamiento), DIAGNOSTICOS (uno por fila), RESPUESTAS (una por fila).'],
    ['Nunca borres filas: para anular un relevamiento, ESTADO = Anulado; para dar de baja una persona, ACTIVO = No.']]).setWrap(true);
  ini.setColumnWidth(1, 900); ss.setActiveSheet(ini);
  cocHojaPersonas_();
  Logger.log('Módulo 6 · Cocinas instalado: ' + ss.getUrl() + ' · ' + filas.length + ' preguntas · ' + L.length + ' lugares.');
}
// BASE COMÚN › COCINA_PERSONAS (se crea si falta)
function cocHojaPersonas_() {
  const bc = pBC_(); let sh = bc.getSheetByName('COCINA_PERSONAS'); if (sh) return sh;
  sh = bc.insertSheet('COCINA_PERSONAS');
  encabezar_(sh, 'Personas de cocina (manipuladores de alimentos)', 'Una fila por persona, propia o de empresa. Fechas dd/mm/aaaa. Si falta el vencimiento, el sistema lo calcula: carnet 3 años y libreta 1 año desde la emisión. Para dar de baja: ACTIVO = No.', COC_H_PER,
    ['Lo pone el sistema.', 'Código del establecimiento.', 'Planta o Empresa.', 'Sin puntos.', '', 'Solo si es de empresa.', '', 'Sí · No · s/d', 'Quién lo emitió (municipio).', '', 'Si está vacío, emisión + 3 años.', 'Enlace a la foto.', 'Sí · No · s/d', '', '', 'Si está vacío, emisión + 1 año.', 'Enlace a la foto.', 'Última capacitación interna en BPM.', 'Sí · No', '', 'Quién cargó.', 'Cuándo.']);
  lista_(sh, 2, 1000, ['Planta', 'Empresa']); lista_(sh, 6, 1000, COC_FUNCIONES); lista_(sh, 7, 1000, ['Sí', 'No', 's/d']); lista_(sh, 12, 1000, ['Sí', 'No', 's/d']); lista_(sh, 18, 1000, ['Sí', 'No']);
  sh.getRange(6, 10, 1000, 2).setNumberFormat('dd/mm/yyyy'); sh.getRange(6, 15, 1000, 2).setNumberFormat('dd/mm/yyyy'); sh.getRange(6, 18, 1000, 1).setNumberFormat('dd/mm/yyyy');
  sh.setFrozenColumns(5); sh.setColumnWidth(5, 240);
  return sh;
}

// ------------------------------------------------------------------ DATOS
const pDC_ = () => { const id = PropertiesService.getScriptProperties().getProperty('DIAG_COC_ID'); if (!id) throw new Error('El módulo de cocinas todavía no está instalado (construirModuloCocinas).'); return SpreadsheetApp.openById(id); };
function cocItems_(todos) {
  return pTabla_(pDC_().getSheetByName('ITEMS'), COC_H_ITEMS.length).map(r => { const o = {}; COC_H_ITEMS.forEach((h, i) => o[h] = r.v[i] instanceof Date ? pFecha_(r.v[i]) : r.v[i]); return o; })
    .filter(o => o.ID && (todos || o.ACTIVO !== 'No'));
}
function cocLugares_() { return pTabla_(pDC_().getSheetByName('LUGARES'), COC_H_LUG.length).filter(r => limpio_(r.v[0]) && r.v[3] !== 'No').map(r => ({ sitio: limpio_(r.v[0]), oficial: limpio_(r.v[2]), tipo: limpio_(r.v[1]) })); }
// Tipo del establecimiento (BASE COMÚN) y alcance que le corresponde
function cocTipo_(cod) {
  const E = pEstablecimientos_(), f = E.filas.find(x => limpio_(x.v[0]) === cod);
  const tipo = f ? limpio_(f.v[3]) : '', rural = /rural/i.test(tipo);
  return { tipo: tipo || 's/d', rural: rural, alcance: rural ? 'Rural (BPM)' : 'No rural (HACCP)', nombre: f ? f.v[1] : cod, area: f ? f.v[4] : '' };
}
const cocAplicaAlcance_ = (it, alc) => { const a = limpio_(it.ALCANCE) || 'Todos'; return a === 'Todos' || a === alc; };
function cocDiagLeer_() {
  return pTabla_(pDC_().getSheetByName('DIAGNOSTICOS'), 13).map(r => { const o = { fila: r.fila }; DIAG_H_DIAG.slice(0, 12).concat(['ALCANCE']).forEach((h, i) => o[h] = r.v[i] instanceof Date ? pFecha_(r.v[i]) : r.v[i]); return o; });
}
function cocLista_() {   // último relevamiento (no anulado) de cada establecimiento
  const m = {}; cocDiagLeer_().forEach(o => { if (o.ESTADO === 'Anulado') return; const p = m[o.CODIGO]; if (!p || String(o.FECHA) >= String(p.FECHA)) m[o.CODIGO] = o; }); return m;
}

// ------------------------------------------------------------------ RELEVAMIENTO (mismo formulario que el diagnóstico de residuos)
function cocAbrir_(cod, id) {
  cod = limpio_(cod); const dc = pDC_(), T = cocTipo_(cod), todos = cocItems_(true);
  const lista = cocDiagLeer_().filter(o => o.CODIGO === cod && o.ESTADO !== 'Anulado').sort((a, b) => String(b.FECHA).localeCompare(String(a.FECHA)));
  const actual = id ? lista.find(o => o.ID_DIAG === id) : lista.find(o => o.ESTADO === 'Borrador' || o.ESTADO === 'Enviado');
  const previo = lista.find(o => o.ESTADO === 'Cerrado' && (!actual || o.ID_DIAG !== actual.ID_DIAG));
  const resp = {}, quiero = [actual && actual.ID_DIAG, previo && previo.ID_DIAG].filter(Boolean);
  if (quiero.length) pTabla_(dc.getSheetByName('RESPUESTAS'), DIAG_H_RESP.length).forEach(r => { if (quiero.indexOf(r.v[0]) >= 0) (resp[r.v[0]] = resp[r.v[0]] || []).push({ sitio: r.v[2], item: r.v[3], resp: r.v[4], valor: r.v[5], obs: r.v[6], fotos: String(r.v[7] || '').split(' | ').filter(Boolean) }); });
  const usados = {}; Object.keys(resp).forEach(k => resp[k].forEach(r => usados[r.item] = true));
  const items = todos.filter(i => (i.ACTIVO !== 'No' && cocAplicaAlcance_(i, T.alcance)) || usados[i.ID]);
  let personas = null; try { personas = cocResumenPersonas_(cod); } catch (e) {}
  return { ok: true, cod: cod, nombre: T.nombre, tipo: T.tipo, alcance: T.alcance, items: items, sitios: cocLugares_(), personas: personas, sugerencias: cocSugerencias_(cod, personas),
    actual: actual || null, respuestas: actual ? (resp[actual.ID_DIAG] || []) : [], previo: previo || null, respuestasPrevio: previo ? (resp[previo.ID_DIAG] || []) : [],
    historial: lista.map(o => ({ id: o.ID_DIAG, fecha: o.FECHA, estado: o.ESTADO, pct: o.PORCENTAJE, criticos: o.CRITICOS_NO_CUMPLE, modalidad: o.MODALIDAD })),
    informes: (() => { try { return actual ? pInformesDiag_(actual.ID_DIAG) : []; } catch (e) { return []; } })() };
}
// Respuestas sugeridas a partir de lo que ya está cargado (se pueden cambiar)
function cocSugerencias_(cod, P) {
  const s = {}; if (!P || !P.total) return s;
  const prop = (n, t) => n === t ? 'Todos' : n === 0 ? 'Ninguno' : n * 2 > t ? 'Más de la mitad' : 'Menos de la mitad';
  s.MAN01 = prop(P.carnetVigente, P.total); s.MAN02 = prop(P.libretaVigente, P.total);
  return s;
}
function cocGuardar_(x, red) {
  const dc = pDC_(), sh = dc.getSheetByName('DIAGNOSTICOS'), rp = dc.getSheetByName('RESPUESTAS'), hoy = new Date(), c = x.cabecera || {}, cod = limpio_(x.cod), T = cocTipo_(cod);
  const resp = (x.respuestas || []).filter(r => r.item && (r.resp || r.valor || r.obs || (r.fotos || []).length)), usados = {}; resp.forEach(r => usados[r.item] = true);
  const items = cocItems_(true).filter(i => (i.ACTIVO !== 'No' && cocAplicaAlcance_(i, T.alcance)) || usados[i.ID]);
  const calc = pDiagCalcular_(items, resp);
  let id = limpio_(x.id), fila = null;
  if (id) { const f = pTabla_(sh, 7).find(r => r.v[0] === id); if (f) { fila = f.fila; if (red && /^(Enviado|Cerrado)$/.test(f.v[6])) return { ok: false, mensaje: 'Este relevamiento ya fue enviado a Higiene y Seguridad: no se puede modificar.' }; } }
  let estado = x.estado || 'Borrador'; if (DIAG_ESTADOS.indexOf(estado) < 0) estado = 'Borrador'; if (red && estado === 'Cerrado') estado = 'Enviado';
  if (estado === 'Cerrado' || estado === 'Enviado') {
    const f = diagFaltantes_(items, resp, cocLugares_().map(l => l.sitio)), sin = (resp.find(r => r.item === 'COC01' && !r.sitio) || {}).valor === 'No hay servicio de alimentación';
    if (f.estab.length) return { ok: false, mensaje: 'Falta completar en la pestaña Establecimiento ' + f.estab.length + ' pregunta(s), por ejemplo: «' + f.estab.slice(0, 3).join('», «') + '».' };
    if (!sin && !f.sitios && items.some(i => i.NIVEL === 'S')) return { ok: false, mensaje: 'Falta relevar al menos un lugar (por ejemplo, la cocina).' };
  }
  if (!fila) id = 'DC-' + cod.replace(/\s+/g, '').toUpperCase().slice(0, 8) + '-' + Utilities.formatDate(hoy, TZ, 'yyyyMMdd-HHmmss');
  const cab = [id, cod, c.FECHA || Utilities.formatDate(hoy, TZ, 'yyyy-MM-dd'), c.MODALIDAD || 'Visita', c.RELEVADO_POR || (red ? '' : 'Belén Pellegrini'), c.ENTREVISTADO || '', estado, calc.pct, calc.criticos, calc.n, c.OBSERVACIONES || '', hoy, T.alcance];
  if (fila) sh.getRange(fila, 1, 1, cab.length).setValues([cab]); else sh.getRange(Math.max(sh.getLastRow(), 5) + 1, 1, 1, cab.length).setValues([cab]);
  const viejas = pTabla_(rp, 1).filter(r => r.v[0] === id).map(r => r.fila).sort((a, b) => a - b);
  if (viejas.length && viejas[viejas.length - 1] - viejas[0] + 1 === viejas.length) rp.deleteRows(viejas[0], viejas.length); else viejas.reverse().forEach(f => rp.deleteRow(f));
  if (resp.length) rp.getRange(Math.max(rp.getLastRow(), 5) + 1, 1, resp.length, DIAG_H_RESP.length).setValues(resp.map(r => [id, cod, r.sitio || '', r.item, r.resp || '', r.valor || '', r.obs || '', (r.fotos || []).join(' | ')]));
  CacheService.getScriptCache().removeAll(['coc_tablero', 'p_resumen']);
  return { ok: true, id: id, pct: calc.pct, criticos: calc.criticos, n: calc.n, porSeccion: calc.porSeccion, estado: estado };
}
// Fotos del relevamiento: carpeta del establecimiento › «Cocina» › «Relevamientos» › ID
function cocFoto_(x) {
  const E = est_(limpio_(x.cod)); if (!E || !E.carpeta) return { ok: false, mensaje: 'El establecimiento no tiene carpeta.' };
  if (!x.id) return { ok: false, mensaje: 'Guardá el borrador antes de agregar fotos.' };
  const m = /^data:(image\/[\w.+-]+);base64,(.+)$/.exec(String(x.dataUrl || '')); if (!m) return { ok: false, mensaje: 'La foto no es válida.' };
  const raiz = carpeta_(carpeta_(carpeta_(DriveApp.getFolderById(E.carpeta), 'Cocina'), 'Relevamientos'), x.id);
  const nombre = [(x.sitio || x.cod), x.item, Utilities.formatDate(new Date(), TZ, 'yyyyMMdd-HHmmss')].join(' - ').replace(/[^\w\-.áéíóúñÁÉÍÓÚÑ ]/g, '_') + '.jpg';
  return { ok: true, url: raiz.createFile(Utilities.newBlob(Utilities.base64Decode(m[2]), m[1], nombre)).getUrl() };
}

// ------------------------------------------------------------------ PERSONAS DE COCINA (carnet de manipulador y libreta sanitaria)
const cocFechaISO_ = v => { if (v instanceof Date) return pFecha_(v); const s = limpio_(v), m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s); return m ? m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2) : /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : ''; };
const cocMasAnios_ = (iso, n) => { if (!iso) return ''; const d = new Date(iso + 'T12:00:00'); d.setFullYear(d.getFullYear() + n); return Utilities.formatDate(d, TZ, 'yyyy-MM-dd'); };
// Estado de un documento: vigente · porvencer (60 días) · vencido · no (no tiene) · sd (sin dato)
function cocEstadoDoc_(tiene, vence, hoyISO) {
  if (/^no$/i.test(tiene)) return 'no';
  if (!vence) return 'sd';
  if (vence < hoyISO) return 'vencido';
  const lim = new Date(hoyISO + 'T12:00:00'); lim.setDate(lim.getDate() + COC_AVISO_DIAS);
  return vence <= Utilities.formatDate(lim, TZ, 'yyyy-MM-dd') ? 'porvencer' : 'vigente';
}
const COC_ORDEN = { no: 0, vencido: 1, sd: 2, porvencer: 3, vigente: 4 };
function cocPersonas_(cod) {   // cod vacío o «*»: toda la red
  const sh = cocHojaPersonas_(), hoy = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd');
  return pTabla_(sh, COC_H_PER.length).map(r => {
    const o = { fila: r.fila }; COC_H_PER.forEach((h, i) => o[h] = r.v[i]);
    ['CARNET_EMISION', 'CARNET_VENCE', 'LIBRETA_EMISION', 'LIBRETA_VENCE', 'CAPACITACION_BPM', 'ACTUALIZADO'].forEach(k => o[k] = cocFechaISO_(o[k]));
    o.DNI = String(o.DNI || '').replace(/\D/g, ''); o.ESTABLECIMIENTO = limpio_(o.ESTABLECIMIENTO);
    o.carnetVence = o.CARNET_VENCE || cocMasAnios_(o.CARNET_EMISION, COC_VIG.carnet);
    o.libretaVence = o.LIBRETA_VENCE || cocMasAnios_(o.LIBRETA_EMISION, COC_VIG.libreta);
    o.carnet = cocEstadoDoc_(o.CARNET_TIENE, o.carnetVence, hoy); o.libreta = cocEstadoDoc_(o.LIBRETA_TIENE, o.libretaVence, hoy);
    o.estado = COC_ORDEN[o.carnet] <= COC_ORDEN[o.libreta] ? o.carnet : o.libreta;
    return o;
  }).filter(o => (o.APELLIDO_Y_NOMBRE || o.DNI) && (!cod || cod === '*' || o.ESTABLECIMIENTO === cod));
}
function cocResumenPersonas_(cod, lista) {
  const L = (lista || cocPersonas_(cod)).filter(p => p.ACTIVO !== 'No'), c = k => L.filter(p => p[k] === 'vigente' || p[k] === 'porvencer').length;
  return { total: L.length, carnetVigente: c('carnet'), libretaVigente: c('libreta'), vencidos: L.filter(p => p.estado === 'vencido' || p.estado === 'no').length,
    porVencer: L.filter(p => p.estado === 'porvencer').length, sinDato: L.filter(p => p.estado === 'sd').length, empresa: L.filter(p => p.ORIGEN === 'Empresa').length };
}
// Personas de la base de trabajadores que parecen de cocina (para sumarlas rápido)
function cocSugeridas_(cod) {
  const T = pBT_().getSheetByName('TODOS'), n = T.getLastRow() - 5; if (n < 1) return [];
  const ya = {}; cocPersonas_(cod).forEach(p => ya[p.DNI] = true);
  return T.getRange(6, 1, n, 22).getValues().filter(r => limpio_(r[21]) === cod && !/baja/i.test(r[19]) && r[1] !== '' && !ya[String(r[1]).replace(/\D/g, '')] &&
    /cocin|aliment|nutric|lactar|ec[oó]nom|diet/i.test([r[5], r[6], r[7]].join(' ')))
    .slice(0, 60).map(r => ({ dni: String(r[1]).replace(/\D/g, ''), nombre: [r[2], r[3]].filter(Boolean).join(', '), funcion: limpio_(r[5] || r[6]), servicio: limpio_(r[7]), empresa: limpio_(r[9]) }));
}
function cocDniBase_(dni) {
  dni = String(dni || '').replace(/\D/g, ''); if (dni.length < 6) return null;
  const T = pBT_().getSheetByName('TODOS'), n = T.getLastRow() - 5; if (n < 1) return null;
  const r = T.getRange(6, 1, n, 22).getValues().find(x => String(x[1]).replace(/\D/g, '') === dni);
  return r ? { dni: dni, nombre: [r[2], r[3]].filter(Boolean).join(', '), funcion: limpio_(r[5] || r[6]), servicio: limpio_(r[7]), empresa: limpio_(r[9]), est: limpio_(r[21]) } : null;
}
// Archivo de carnet o libreta: { base64: 'data:…;base64,…', tipo, nombre } o dataUrl suelto → carpeta del establecimiento › Cocina › Carnets y libretas
function cocArchivo_(cod, a, etiqueta) {
  const src = a && (a.base64 || a.dataUrl || a); const m = /^data:([\w/.+-]+);base64,(.+)$/.exec(String(src || '')); if (!m) return '';
  const E = est_(cod); if (!E || !E.carpeta) throw new Error('El establecimiento no tiene carpeta en Drive.');
  const dir = carpeta_(carpeta_(DriveApp.getFolderById(E.carpeta), 'Cocina'), 'Carnets y libretas');
  const ext = /pdf/.test(m[1]) ? '.pdf' : '.jpg', nombre = (etiqueta + ' - ' + Utilities.formatDate(new Date(), TZ, 'yyyyMMdd-HHmmss')).replace(/[^\w\-.áéíóúñÁÉÍÓÚÑ ,]/g, '_') + ext;
  return dir.createFile(Utilities.newBlob(Utilities.base64Decode(m[2]), m[1], nombre)).getUrl();
}
// Alta o cambio de una persona. x: { ID?, ESTABLECIMIENTO, ORIGEN, DNI, APELLIDO_Y_NOMBRE, …, carnetArchivo?, libretaArchivo? }
function cocPersonaGuardar_(x, quien, codFijo) {
  const sh = cocHojaPersonas_(), hoy = new Date(), cod = limpio_(codFijo || x.ESTABLECIMIENTO);
  if (!cod || !est_(cod)) return { ok: false, mensaje: 'Falta el establecimiento.' };
  const dni = String(x.DNI || '').replace(/\D/g, ''), nom = limpio_(x.APELLIDO_Y_NOMBRE);
  if (!nom) return { ok: false, mensaje: 'Falta el apellido y nombre.' };
  if (dni && (dni.length < 7 || dni.length > 9)) return { ok: false, mensaje: 'El DNI tiene que tener 7 u 8 números.' };
  const L = pTabla_(sh, COC_H_PER.length);
  let fila = null, antes = null;
  if (x.ID) { const f = L.find(r => r.v[0] === x.ID); if (!f) return { ok: false, mensaje: 'No se encontró la persona: actualizá la lista.' }; if (codFijo && limpio_(f.v[1]) !== codFijo) return { ok: false, mensaje: 'Esta persona es de otro establecimiento.' }; fila = f.fila; antes = f.v; }
  else if (dni && L.some(r => String(r.v[3]).replace(/\D/g, '') === dni && limpio_(r.v[1]) === cod && r.v[18] !== 'No')) return { ok: false, mensaje: 'Esa persona ya está cargada en este establecimiento.' };
  const id = x.ID || ('PC-' + cod.replace(/\s+/g, '').toUpperCase().slice(0, 6) + '-' + Utilities.formatDate(hoy, TZ, 'yyMMddHHmmss'));
  const fecha = v => { const s = cocFechaISO_(v); return s ? new Date(s + 'T12:00:00') : ''; };
  let cFoto = antes ? antes[11] : '', lFoto = antes ? antes[16] : '';
  if (x.carnetArchivo) cFoto = cocArchivo_(cod, x.carnetArchivo, 'Carnet ' + nom);
  if (x.libretaArchivo) lFoto = cocArchivo_(cod, x.libretaArchivo, 'Libreta ' + nom);
  const v = [id, cod, x.ORIGEN === 'Empresa' ? 'Empresa' : 'Planta', dni, nom, x.ORIGEN === 'Empresa' ? limpio_(x.EMPRESA) : '', limpio_(x.FUNCION_COCINA),
    /^(Sí|No)$/.test(x.CARNET_TIENE) ? x.CARNET_TIENE : 's/d', limpio_(x.CARNET_EMISOR), fecha(x.CARNET_EMISION), fecha(x.CARNET_VENCE), cFoto,
    /^(Sí|No)$/.test(x.LIBRETA_TIENE) ? x.LIBRETA_TIENE : 's/d', limpio_(x.LIBRETA_EMISOR), fecha(x.LIBRETA_EMISION), fecha(x.LIBRETA_VENCE), lFoto,
    fecha(x.CAPACITACION_BPM), x.ACTIVO === 'No' ? 'No' : 'Sí', limpio_(x.OBSERVACIONES), limpio_(quien) || 'Portal', hoy];
  if (fila) sh.getRange(fila, 1, 1, v.length).setValues([v]); else sh.getRange(Math.max(sh.getLastRow(), 5) + 1, 1, 1, v.length).setValues([v]);
  // Historial de la BASE COMÚN: qué cambió
  const log = [];
  if (antes) COC_H_PER.forEach((h, i) => { if (i >= 20) return; const a = antes[i] instanceof Date ? pFecha_(antes[i]) : String(antes[i]), b = v[i] instanceof Date ? pFecha_(v[i]) : String(v[i]); if (a !== b) log.push([hoy, 'COCINA_PERSONAS', cod + ' · ' + nom, h, a, b, limpio_(quien) || 'Portal']); });
  else log.push([hoy, 'COCINA_PERSONAS', cod + ' · ' + nom, 'ALTA', '', id, limpio_(quien) || 'Portal']);
  try { pHistorial_(pBC_(), log); } catch (e) {}
  CacheService.getScriptCache().remove('coc_tablero');
  return { ok: true, id: id };
}

// ------------------------------------------------------------------ TABLERO DEL MÓDULO
function cocTablero_(fresco) {
  const c = CacheService.getScriptCache(); if (!fresco) { const k = c.get('coc_tablero'); if (k) return JSON.parse(k); }
  const E = pEstablecimientos_(), ult = cocLista_(), per = cocPersonas_('*'), hoy = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd');
  const est = E.filas.map(f => {
    const cod = limpio_(f.v[0]), tipo = limpio_(f.v[3]), d = ult[cod], L = per.filter(p => p.ESTABLECIMIENTO === cod);
    return { cod: cod, nombre: f.v[1], tipo: tipo, area: f.v[4], rural: /rural/i.test(tipo), alcance: /rural/i.test(tipo) ? 'BPM' : /puesto/i.test(tipo) ? 'BPM (si tiene cocina)' : 'BPM + HACCP',
      diag: d ? { id: d.ID_DIAG, fecha: d.FECHA, estado: d.ESTADO, pct: d.PORCENTAJE, criticos: d.CRITICOS_NO_CUMPLE } : null, personas: cocResumenPersonas_(cod, L) };
  });
  const activos = per.filter(p => p.ACTIVO !== 'No');
  const avisos = activos.filter(p => p.estado !== 'vigente').map(p => ({ cod: p.ESTABLECIMIENTO, id: p.ID, nombre: p.APELLIDO_Y_NOMBRE, origen: p.ORIGEN, carnet: p.carnet, libreta: p.libreta, carnetVence: p.carnetVence, libretaVence: p.libretaVence, estado: p.estado }))
    .sort((a, b) => COC_ORDEN[a.estado] - COC_ORDEN[b.estado] || String(a.cod).localeCompare(String(b.cod)));
  const con = est.filter(e => e.diag && e.diag.estado === 'Cerrado' && e.diag.pct !== '');
  const out = { ok: true, hoy: hoy, establecimientos: est, avisos: avisos.slice(0, 200),
    totales: { establecimientos: est.length, relevados: con.length, enviados: est.filter(e => e.diag && e.diag.estado === 'Enviado').length,
      promedio: con.length ? Math.round(10 * con.reduce((a, e) => a + Number(e.diag.pct), 0) / con.length) / 10 : null, criticos: con.filter(e => Number(e.diag.criticos) > 0).length,
      personas: activos.length, carnetVigente: activos.filter(p => p.carnet === 'vigente' || p.carnet === 'porvencer').length, libretaVigente: activos.filter(p => p.libreta === 'vigente' || p.libreta === 'porvencer').length,
      vencidos: activos.filter(p => p.estado === 'vencido' || p.estado === 'no').length, porVencer: activos.filter(p => p.estado === 'porvencer').length, sinDato: activos.filter(p => p.estado === 'sd').length } };
  try { c.put('coc_tablero', JSON.stringify(out), 600); } catch (e) {}
  return out;
}

// ------------------------------------------------------------------ ENTRADAS
// Portal (clave de Higiene y Seguridad): acciones «p_coc_…»
function cocPortal_(accion, x) {
  switch (accion) {
    case 'p_coc_tablero': return cocTablero_(x.fresco);
    case 'p_coc_abrir': return cocAbrir_(x.cod, x.id);
    case 'p_coc_guardar': return conLock_(() => cocGuardar_(x, false));
    case 'p_coc_foto': return cocFoto_(x);
    case 'p_coc_personas': { const L = cocPersonas_(limpio_(x.cod) || '*'); return { ok: true, personas: L, resumen: cocResumenPersonas_('', L), sugeridas: x.cod && x.cod !== '*' ? cocSugeridas_(limpio_(x.cod)) : [], funciones: COC_FUNCIONES, vigencia: COC_VIG }; }
    case 'p_coc_persona_guardar': return conLock_(() => cocPersonaGuardar_(x, x.quien || 'Higiene y Seguridad (portal)'));
    case 'p_coc_dni': return { ok: true, persona: cocDniBase_(x.dni) };
    case 'p_coc_informe': return cocInforme_(x);
    case 'p_coc_informe_correo': { const X = cocInfDatos_(x.cod, x.id); if (!X.ok) return X; const prev = pInformesDiag_(X.A.ID_DIAG); if (!prev.length) return { ok: false, mensaje: 'Todavía no hay informe de este relevamiento.' }; return { ok: true, correo: cocCorreo_(X, infConfig_(X.cod), prev[0].codigo) }; }
  }
  return { ok: false, error: 'Acción desconocida.' };
}
// «Mi establecimiento» y página para referentes (clave del establecimiento o personal): acciones «k_…» (módulo Cocina)
function cocRed_(d) {
  const x = d.datos || {}, cod = limpio_(d.est); x.cod = cod;
  if (!PropertiesService.getScriptProperties().getProperty('DIAG_COC_ID')) return { ok: false, mensaje: 'El módulo de cocinas todavía no está habilitado.' };
  switch (d.accion) {
    case 'k_abrir': { const r = cocAbrir_(cod, ''); delete r.previo; delete r.respuestasPrevio; delete r.informes; return r; }
    case 'k_guardar': if (!x.cabecera) x.cabecera = {}; x.cabecera.MODALIDAD = 'Referente (en línea)'; return conLock_(() => cocGuardar_(x, true));
    case 'k_foto': return cocFoto_(x);
    case 'k_personas': { const L = cocPersonas_(cod); return { ok: true, personas: L, resumen: cocResumenPersonas_('', L), sugeridas: cocSugeridas_(cod), funciones: COC_FUNCIONES, vigencia: COC_VIG }; }
    case 'k_persona_guardar': return conLock_(() => cocPersonaGuardar_(x, x.quien || 'Referente', cod));
    case 'k_dni': { const p = cocDniBase_(x.dni); return { ok: true, persona: p && p.est === cod ? p : p ? { dni: p.dni, nombre: p.nombre } : null }; }
  }
  return { ok: false, error: 'Acción desconocida.' };
}

// ------------------------------------------------------------------ INFORME DE LÍNEA DE BASE DE COCINA (Google Doc editable + PDF)
// Mismo formato que la línea de base de residuos: presentación, método, hechos, análisis, conclusión, cierre y anexo de fotos. Sin plan de mejora.
const COC_NORMAS = {
  'CAA': 'Ley 18.284, Código Alimentario Argentino (CAA), y su reglamentación (Decreto 2126/71).',
  'GMC': 'Resolución GMC (Mercosur) 80/96, reglamento técnico sobre las condiciones higiénico-sanitarias y de buenas prácticas de elaboración, incorporada al CAA, capítulo II.',
  'Codex': 'Codex Alimentarius, Principios generales de higiene de los alimentos CXC 1-1969 (revisión 2020), capítulo 2: sistema de análisis de peligros y puntos críticos de control (HACCP).',
  '19587': 'Ley 19.587 de Higiene y Seguridad en el Trabajo y Decreto 351/79.',
  '299': 'Resolución SRT 299/2011, elementos de protección personal.',
  '886': 'Resolución SRT 886/2015, protocolo de ergonomía.',
  '26588': 'Ley 26.588 de celiaquía y sus modificatorias.'
};
// Normas que cita un punto (columna REFERENCIA) → claves de COC_NORMAS
const cocNormasDe_ = ref => { ref = String(ref || ''); const k = [];
  if (/CAA|18\.284/.test(ref)) k.push('CAA'); if (/GMC/.test(ref)) k.push('GMC'); if (/Codex|HACCP/.test(ref)) k.push('Codex');
  if (/19\.587|351\/79/.test(ref)) k.push('19587'); if (/299\/11/.test(ref)) k.push('299'); if (/886\/15/.test(ref)) k.push('886'); if (/26\.588/.test(ref)) k.push('26588'); return k; };

function cocInfDatos_(cod, id) {
  cod = limpio_(cod); const D = cocAbrir_(cod, id || '');
  let A = D.actual; if (!A || A.ESTADO !== 'Cerrado') { if (!id && D.previo) return cocInfDatos_(cod, D.previo.ID_DIAG); return { ok: false, mensaje: A ? 'El informe se genera solo desde un relevamiento cerrado.' : 'No hay un relevamiento de cocina de este establecimiento.' }; }
  const items = D.items, porId = {}; items.forEach(i => porId[i.ID] = i);
  const R = D.respuestas.filter(r => porId[r.item] && diagAplica_(porId[r.item], D.respuestas, r.sitio, porId));
  return { ok: true, D: D, A: A, items: items, porId: porId, R: R, calc: pDiagCalcular_(items, R), E: est_(cod) || {}, cod: cod };
}

function cocInforme_(x) {
  const X = cocInfDatos_(x.cod, x.id); if (!X.ok) return X;
  if (!X.E.carpeta) return { ok: false, mensaje: 'El establecimiento no tiene carpeta en el sistema.' };
  const cfg = infConfig_(X.cod), C = cfg.C, A = X.A, calc = X.calc, D = X.D, local = C.MODO_LOCAL === 'Sí';
  const v = id => { const r = X.R.find(q => q.item === id && !q.sitio); return r ? String(r.valor || r.resp || '') : ''; };
  const sinServicio = v('COC01') === 'No hay servicio de alimentación';
  if (!calc.n && !sinServicio) return { ok: false, mensaje: 'El relevamiento no tiene puntos evaluados: completalo antes de generar el informe.' };
  const rural = D.alcance === 'Rural (BPM)', sist = rural ? 'buenas prácticas de manufactura (BPM)' : 'buenas prácticas de manufactura (BPM) y sistema HACCP';
  const TIT = 'Línea de base de la cocina · ' + (rural ? 'BPM' : 'BPM y HACCP');
  const prev = pInformesDiag_(A.ID_DIAG); let codigo, revision = 0;
  if (prev.length) { codigo = prev[0].codigo; if (prev[0].doc) { const m = /Revisión (\d+)/.exec(String(prev[0].obs || '')); revision = m ? Number(m[1]) + 1 : 1; } }
  else { const n = docNumero_({ est: X.cod, bloque: 'GEN', tipo: 'DG', asunto: TIT, origen: 'Sistema', idOrigen: A.ID_DIAG, pedidoPor: Session.getActiveUser().getEmail() }); if (!n.ok) return n; codigo = n.codigo; }
  const hoy = Utilities.formatDate(new Date(), TZ, 'dd/MM/yyyy'), fRel = String(A.FECHA).slice(0, 10).split('-').reverse().join('/'), nombre = X.E.nombre || D.nombre || X.cod;
  const porId = X.porId, R = X.R;
  const valorDe = r => pDiagValor_(porId[r.item], { resp: r.resp, valor: r.valor });
  const criticos = [], brechas = [], nose = [];
  R.forEach(r => { const it = porId[r.item]; if (!it) return; const val = String(r.valor || r.resp || '');
    if (/(^|\|)No se sabe/.test(val)) nose.push({ it: it, r: r });
    const w = valorDe(r); if (w == null || w >= 1) return;
    if (it.CRITICO === 'Sí' && w <= 1 / 3) criticos.push({ it: it, r: r, v: w }); else brechas.push({ it: it, r: r, v: w }); });
  brechas.sort((a, b) => a.v - b.v);
  const lugares = ['Establecimiento'].concat(D.sitios.map(s => s.sitio)).filter(s => R.some(r => (r.sitio || 'Establecimiento') === s));
  const bloques = Object.keys(calc.porSeccion).filter(s => !/^0 ·|^Anexo|^K ·/.test(s)).map(s => [s, calc.porSeccion[s]]).sort((a, b) => b[1] - a[1]);
  const sinLetra = s => s.replace(/^[0-9A-Z]+\d? · /, '');
  const gestion = v('COC02'), empresa = v('COC03'), conEmpresa = /Empresa|Mixta/.test(gestion);
  const informantes = v('COC10') ? v('COC10').split('|').map(minus) : [];
  // Personas de cocina (registro nominal del sistema)
  const PL = cocPersonas_(X.cod).filter(p => p.ACTIVO !== 'No'), P = cocResumenPersonas_('', PL);
  const hace12 = Utilities.formatDate(new Date(Date.now() - 365 * 864e5), TZ, 'yyyy-MM-dd'), capBPM = PL.filter(p => p.CAPACITACION_BPM && p.CAPACITACION_BPM >= hace12).length;
  const pcp = (n, t) => t ? n + ' de ' + t + ' (' + pc(Math.round(1000 * n / t) / 10) + ' %)' : 's/d';
  const ESTX = { vigente: 'Vigente', porvencer: 'Por vencer', vencido: 'Vencido', no: 'No tiene', sd: 's/d' };
  const aRegularizar = PL.filter(p => p.estado !== 'vigente').sort((a, b) => COC_ORDEN[a.estado] - COC_ORDEN[b.estado] || String(a.APELLIDO_Y_NOMBRE).localeCompare(String(b.APELLIDO_Y_NOMBRE)));
  const fFmt = s => s ? String(s).split('-').reverse().join('/') : 's/d';

  const HL = sinServicio ? [] : dgmHallazgos_(X, cfg);   // mejoras priorizadas (DiagModulos.gs): punto 6 del informe y plan de acción
  const carpeta = carpeta_(DriveApp.getFolderById(X.E.carpeta), 'Informes');
  let doc; const notas = [];
  try {
    const titulo = codigo + (revision ? ' · Rev. ' + revision : '') + ' · ' + TIT + ' · ' + nombre;
    const plantilla = (/[-\w]{25,}/.exec(C.PLANTILLA_INFORME || '') || [])[0];
    if (plantilla) { doc = DocumentApp.openById(DriveApp.getFileById(plantilla).makeCopy(titulo, carpeta).getId()); }
    else { doc = DocumentApp.create(titulo); DriveApp.getFileById(doc.getId()).moveTo(carpeta); }
    const b = doc.getBody(); b.clear();
    b.setPageWidth(595.3).setPageHeight(841.9).setMarginTop(60).setMarginBottom(56).setMarginLeft(62).setMarginRight(57);
    const base = {}; base[DocumentApp.Attribute.FONT_FAMILY] = INF2.FUENTE; base[DocumentApp.Attribute.FONT_SIZE] = 10.5; base[DocumentApp.Attribute.FOREGROUND_COLOR] = INF2.TEXTO; b.setAttributes(base);
    const enc = doc.getHeader() || doc.addHeader();
    const te = enc.appendTable([[' ', 'x', 'x'], [' ', 'x', 'x']]);
    te.setBorderColor('#C9D6DB').setBorderWidth(0.5);
    infCelda_(te.getCell(0, 0), C.LOGO_URL ? '' : 'HySL', 12, INF2.AZUL, true, 70); infCelda_(te.getCell(1, 0), '', 8, INF2.PATA, false, 70);
    infCelda_(te.getCell(0, 1), TIT, 10, INF2.AZUL, true, 250); infCelda_(te.getCell(1, 1), C.ENCABEZADO_LINEA2 || '', 7.5, INF2.PATA, false, 250);
    infCelda_(te.getCell(0, 2), 'Código: ' + codigo, 8, INF2.AZUL, false, 156); infCelda_(te.getCell(1, 2), 'Emisión: ' + hoy + ' · Revisión: ' + revision, 8, INF2.AZUL, false, 156);
    if (C.LOGO_URL) try { const idL = (/[-\w]{25,}/.exec(C.LOGO_URL) || [])[0]; const im = te.getCell(0, 0).getChild(0).asParagraph().appendInlineImage(DriveApp.getFileById(idL).getBlob()); const k = 40 / im.getHeight(); im.setHeight(40).setWidth(Math.round(im.getWidth() * k)); } catch (e) {}
    if (enc.getNumChildren() > 1 && enc.getChild(0).getType() === DocumentApp.ElementType.PARAGRAPH && enc.getChild(0).asParagraph().getText() === '') enc.removeChild(enc.getChild(0));
    const pie = doc.getFooter();
    if (pie && pie.getText().indexOf('{{CODIGO}}') >= 0) pie.replaceText('\\{\\{CODIGO\\}\\}', codigo);
    else { const pf = doc.addFooter(); infEst_(pf.appendParagraph(codigo), 7.5, INF2.PATA, false); }
    try { const pl = doc.getFooter().appendParagraph(''); pl.setAlignment(DocumentApp.HorizontalAlignment.CENTER); const img = pl.appendInlineImage(DriveApp.getFileById(DGM_LOGO_PIE).getBlob()); const w = 260; img.setHeight(Math.round(img.getHeight() * w / img.getWidth())); img.setWidth(w); } catch (e) {}   // logo de HySL en el pie

    const yaNota = {};
    const nota = (clave, texto) => { if (!texto || yaNota[clave]) return ''; notas.push(texto); yaNota[clave] = notas.length; return '[[NOTA' + notas.length + ']]'; };
    const notaN = k => nota('n_' + k, COC_NORMAS[k]);
    const normaDe = cita => cfg.N[cita] || cita;
    const P_ = (t, o) => { o = o || {}; const p = b.appendParagraph(t || ''); infEst_(p, o.tam || 10.5, o.color || INF2.TEXTO, o.neg); p.setAlignment(o.izq ? DocumentApp.HorizontalAlignment.LEFT : DocumentApp.HorizontalAlignment.JUSTIFY).setLineSpacing(o.inter || 1.5).setSpacingAfter(o.desp == null ? 6 : o.desp).setSpacingBefore(o.antes || 0); return p; };
    const H2 = t => { const p = b.appendParagraph(t); p.setHeading(DocumentApp.ParagraphHeading.HEADING2); infEst_(p, 13, INF2.AZUL, true); p.setSpacingBefore(16).setSpacingAfter(6).setLineSpacing(1.15); return p; };
    const H3 = t => { const p = b.appendParagraph(t); p.setHeading(DocumentApp.ParagraphHeading.HEADING3); infEst_(p, 11, INF2.AZUL, true); p.setSpacingBefore(10).setSpacingAfter(4).setLineSpacing(1.15); return p; };
    const TAB = (filas, anchos) => infTabla2_(b, filas, anchos);
    const COMP = C.NOTA_COMPETENCIAS || 'Ley 19.587 de Higiene y Seguridad en el Trabajo; Decreto 351/79; Res. SRT 905/2015, funciones de los servicios de Higiene y Seguridad en el Trabajo.';
    const lugarTxt = r => r.sitio || 'Establecimiento';
    const respTxt = r => { const it = porId[r.item] || {}, t = String(r.valor || r.resp || ''); return it.TIPO === 'TEXTO' ? t : t.split('|').map(minus).join(', '); };
    const refTxt = it => { const k = cocNormasDe_(it.REFERENCIA); return (it.REFERENCIA || '—') + k.map(notaN).join(''); };

    // ---------------- PORTADA E ÍNDICE (12/10/2026: mismo formato que los informes de agua, plagas y módulo 8)
    P_('Servicio de Higiene y Seguridad Laboral', { color: INF2.PATA, izq: true, desp: 60 });
    P_('INFORME TÉCNICO', { tam: 9, color: INF2.PATA, neg: true, desp: 4, izq: true, inter: 1.1 });
    P_('Línea de base de la cocina', { tam: 24, color: INF2.AZUL, neg: true, desp: 4, izq: true, inter: 1.1 });
    P_(nombre + ' · ' + (rural ? 'Buenas prácticas de manufactura' : 'Buenas prácticas de manufactura y sistema HACCP'), { tam: 13, color: INF2.PATA, desp: 30, izq: true, inter: 1.2 });
    TAB([['Informe N.º', codigo + (revision ? ' · Revisión ' + revision : '')], ['Establecimiento', nombre], ['Tipo de relevamiento', 'Línea de base (' + (rural ? 'BPM' : 'BPM y HACCP') + ')'],
      ['Fecha del relevamiento', fRel], ['Fecha del informe', hoy], ['Destinatario', 'Dirección del establecimiento' + (conEmpresa ? ' · copia: empresa concesionaria' + (empresa ? ' (' + empresa + ')' : '') : '')],
      ['Elaboró', (C.FIRMA_NOMBRE || 'Belén Pellegrini') + ' · Licenciada en Higiene, Seguridad y Medio Ambiente del Trabajo, M.P. LCOHSECH0383'], ['Módulo del sistema HyS', 'Módulo 6 · Cocinas hospitalarias']], [150, 320]);
    P_('Borrador generado por el sistema HyS (versión 0): revisarlo antes de firmar. Números de página: Insertar › Números de página.', { tam: 9, color: INF2.PATA, izq: true, antes: 10 });
    b.appendPageBreak();
    H2('Índice');
    P_('Para tener el índice con números de página: Insertar › Índice, y borrar esta lista.', { tam: 9, color: INF2.PATA, izq: true });
    (sinServicio ? ['Resumen ejecutivo', '1. Presentación', '2. Método de trabajo', '3. Conclusión'] : ['Resumen ejecutivo', '1. Presentación', '2. Método de trabajo', '3. Descripción de los hechos', '4. Análisis de los datos', '5. Conclusión', '6. Recomendaciones', 'Anexos'])
      .forEach(t => P_(t, { izq: true, desp: 0, inter: 1.3 }));
    b.appendPageBreak();
    if (local) P_('Desde el Servicio de Higiene y Seguridad Laboral y en el marco de sus competencias' + nota('competencias', COMP) + ', se remite la línea de base de la cocina del establecimiento en materia de ' + sist + ': la situación encontrada antes de implementar mejoras, que sirve de punto de partida para medir los avances.');
    else P_('En carácter de ' + (C.CARGO || 'Referente Provincial de Seguridad e Higiene Sanitaria') + nota('designacion', 'Designación: ' + (C.DESIGNACION_INSTRUMENTO || 's/d') + '. ' + normaDe('Línea 8') + '.') + ' y en el marco de las competencias de Higiene y Seguridad Laboral' + nota('competencias', COMP) + ', se remite la línea de base de la cocina del establecimiento en materia de ' + sist + ', relevada como parte del diagnóstico de la red de salud.');
    H2('Resumen ejecutivo');
    if (sinServicio) {
      P_('En el relevamiento del ' + fRel + ' se informó que el establecimiento no cuenta con servicio de alimentación propio ni recibe comida elaborada para pacientes. Por ese motivo no se evaluaron las condiciones de buenas prácticas y el informe se limita a dejar registrada esa situación.');
    } else {
      const mejores = bloques.filter(s => s[1] >= 60).slice(0, 2).map(s => minus(sinLetra(s[0])));
      const peores = bloques.filter(s => s[1] < 60).slice(-2).reverse().map(s => minus(sinLetra(s[0])));
      const critTxt = Array.from(new Set(criticos.map(h => minus(h.it.ITEM.replace(/^¿|\?$/g, '').replace(/^Observación: /, ''))))).slice(0, 4);
      P_('El relevamiento del ' + fRel + (lugares.length > 2 ? ', que abarcó ' + (lugares.length - 1) + ' lugares,' : '') + ' muestra un cumplimiento general del ' + (calc.pct === '' ? 's/d' : pc(calc.pct) + ' %') + '. ' +
        (mejores.length ? 'Los mejores resultados están en ' + lista(mejores) + '. ' : '') + (peores.length ? 'Las brechas mayores se concentran en ' + lista(peores) + '. ' : '') +
        (criticos.length ? 'Se registraron ' + criticos.length + ' hallazgo' + (criticos.length > 1 ? 's' : '') + ' crítico' + (criticos.length > 1 ? 's' : '') + ', que comprometen la inocuidad de los alimentos o la seguridad del personal y conviene atender dentro de los ' + cfg.plazo.Q1 + ' días: ' + critTxt.join('; ') + '.' : 'No se registraron hallazgos críticos.'));
      P_((P.total ? 'En el registro del sistema hay ' + P.total + ' persona' + (P.total > 1 ? 's' : '') + ' que trabaja' + (P.total > 1 ? 'n' : '') + ' en la cocina; ' + P.carnetVigente + ' con carnet de manipulador de alimentos vigente y ' + P.libretaVigente + ' con libreta sanitaria vigente' + (P.vencidos ? ', y ' + P.vencidos + ' con algún documento vencido o faltante' : '') + '. ' : 'Todavía no hay personas de cocina cargadas en el sistema, por lo que la situación de carnets y libretas es la declarada en el relevamiento. ') +
        (nose.length ? (nose.length > 1 ? 'Quedaron ' + nose.length + ' datos sin conocer, que se relevarán más adelante y no restan puntaje. ' : 'Quedó 1 dato sin conocer, que se relevará más adelante y no resta puntaje. ') : '') +
        (HL.length ? 'El informe propone ' + HL.length + (HL.length > 1 ? ' mejoras, ordenadas' : ' mejora, ordenada') + ' por prioridad y plazo, que se registran en el plan de acción para su seguimiento' + (conEmpresa ? '; las que dependen de la empresa concesionaria se ponen también en su conocimiento.' : '.') : 'No surgen mejoras a proponer en esta instancia.'));
    }
    b.appendPageBreak();

    // ---------------- 1. PRESENTACIÓN
    H2('1. Presentación');
    P_('En un establecimiento de salud la cocina alimenta a personas enfermas, con defensas bajas o con dietas especiales, para quienes una enfermedad transmitida por alimentos puede ser grave. El Código Alimentario Argentino exige que quienes manipulan alimentos cuenten con la documentación sanitaria y la capacitación correspondientes' + notaN('CAA') + ', y que la elaboración siga buenas prácticas de manufactura' + notaN('GMC') + '. ' +
      (rural ? 'En los hospitales rurales, por su escala, el relevamiento se centra en esas buenas prácticas.' : 'En los hospitales de mayor complejidad se releva además el grado de desarrollo del sistema de análisis de peligros y puntos críticos de control (HACCP)' + notaN('Codex') + '.'));
    P_('La cocina es también un lugar de trabajo con riesgos propios: quemaduras, cortes, caídas, sobreesfuerzos, gas y productos químicos' + notaN('19587') + '. Por eso el relevamiento incluye la seguridad del personal de cocina' + (conEmpresa ? ', propio y de la empresa concesionaria' : '') + '.');
    P_('Como en ningún establecimiento existe hoy un registro de esta situación, este primer relevamiento es una línea de base: registra lo encontrado, sin valoración de las personas, para poder medir después los cambios.');

    // ---------------- 2. MÉTODO DE TRABAJO
    H2('2. Método de trabajo');
    TAB([['Aspecto', 'Detalle'],
      ['Modalidad', (A.MODALIDAD || 's/d') + (A.RELEVADO_POR ? ' · relevado por ' + A.RELEVADO_POR : '')],
      ['Fecha', fRel],
      ['Tipo de establecimiento', (D.tipo || 's/d') + ' · alcance: ' + (rural ? 'BPM' : 'BPM y HACCP')],
      ['Gestión de la cocina', sinServicio ? 'Sin servicio de alimentación' : lbMay_(minus(gestion || 's/d')) + (conEmpresa ? ' · empresa: ' + (empresa || 's/d') : '')],
      ['Informantes', [informantes.length ? lbMay_(lista(informantes)) : '', A.ENTREVISTADO || ''].filter(Boolean).join(' · ') || 's/d'],
      ['Período de referencia', 'Últimos 12 meses'],
      ['Lugares relevados', lugares.map(s => s === 'Establecimiento' ? nombre + ' (generales)' : s).join(' · ')]], [130, 340]);
    P_('Se utilizó el cuestionario de cocinas del sistema, con preguntas generales del establecimiento y observaciones en cada lugar recorrido (cocina, depósito, cámaras, lactario y otros). ' + (rural ? 'Para los hospitales rurales se agregan preguntas sobre abastecimiento y reemplazos del personal.' : 'Para los hospitales no rurales se agregan preguntas sobre los elementos del sistema HACCP.') +
      ' En cada pregunta que puntúa, la mejor situación vale 1, las intermedias valen en proporción y la peor vale 0; los puntos críticos pesan más. Las respuestas «no se sabe» y «no aplica» no se cuentan. Las respuestas sobre carnets y libretas se contrastan con el registro nominal de personas de cocina del sistema.');

    if (!sinServicio) {
      // ---------------- 3. DESCRIPCIÓN DE LOS HECHOS
      H2('3. Descripción de los hechos');
      P_('Se describe la situación informada y observada, por bloque, sin valoración normativa.');
      const secs = Array.from(new Set(X.items.map(i => i.SECCION)));
      let nS = 0;
      secs.forEach(sec => {
        const its = X.items.filter(i => i.SECCION === sec), lineas = [];
        ['Establecimiento'].concat(D.sitios.map(s => s.sitio)).forEach(lug => {
          const partes = [];
          its.forEach(it => { const r = R.find(q => q.item === it.ID && lugarTxt(q) === lug); if (!r) return;
            if (it.ID === 'LUG01') { if (r.valor) partes.push('comentarios: ' + String(r.valor)); return; }
            const val = String(r.valor || r.resp || ''); if (!val) return;
            partes.push(it.ITEM.replace(/^¿|\?$/g, '').replace(/^Observación: /, '').replace(/\s*\((?!planta|empresa)[^)]*\)\s*$/, '') + ': ' + respTxt(r)); });
          if (partes.length) lineas.push((lug === 'Establecimiento' ? '' : lug + '. ') + lbMay_(partes.join('; ')) + '.');
        });
        if (!lineas.length) return;
        nS++; H3('3.' + nS + ' ' + sinLetra(sec));
        lineas.forEach(l => P_(l));
      });

      // ---------------- 4. ANÁLISIS DE LOS DATOS
      H2('4. Análisis de los datos');
      H3('4.1 Resultado general, por bloque y por lugar');
      TAB([['Bloque', 'Cumplimiento'], ['Total del establecimiento', calc.pct === '' ? 's/d' : pc(calc.pct) + ' %']].concat(Object.keys(calc.porSeccion).filter(s => !/^0 ·|^Anexo|^K ·/.test(s)).map(s => [sinLetra(s), pc(calc.porSeccion[s]) + ' %'])), [340, 130]);
      if (lugares.length > 2) { const fl = [['Lugar', 'Puntos evaluados', 'Cumplimiento']]; lugares.filter(l => l !== 'Establecimiento').forEach(l => { const c = pDiagCalcular_(X.items, R.filter(r => lugarTxt(r) === l)); if (c.n) fl.push([l, String(c.n), pc(c.pct) + ' %']); }); if (fl.length > 1) TAB(fl, [270, 100, 100]); }
      H3('4.2 Hallazgos críticos');
      if (criticos.length) {
        P_('Situaciones que comprometen la inocuidad de los alimentos o la seguridad del personal. Se informan aparte porque requieren atención aunque el porcentaje general sea aceptable.');
        TAB([['Situación', 'Lugar', 'Respuesta', 'Referencia']].concat(criticos.map(h => [h.it.ITEM, lugarTxt(h.r), lbMay_(respTxt(h.r)), refTxt(h.it)])), [170, 80, 100, 120]);
      } else P_('No se registraron hallazgos críticos.');
      H3('4.3 Otras brechas respecto de la normativa');
      if (brechas.length) TAB([['Requisito', 'Lugar', 'Respuesta', 'Referencia']].concat(brechas.map(h => [h.it.ITEM, lugarTxt(h.r), lbMay_(respTxt(h.r)), refTxt(h.it)])), [170, 80, 100, 120]);
      else P_('No se registraron otras brechas.');
      H3('4.4 Datos a relevar');
      if (nose.length) P_('Los siguientes datos no se conocían al momento del relevamiento; no restan puntaje y quedan pendientes: ' + Array.from(new Set(nose.map(h => minus(h.it.ITEM.replace(/^¿|\?$/g, '')) + (h.r.sitio ? ' (' + h.r.sitio + ')' : '')))).join('; ') + '.');
      else P_('No quedaron datos sin conocer.');
      H3('4.5 Personal manipulador: carnets y libretas');
      P_('El carnet de manipulador de alimentos se considera vigente por ' + COC_VIG.carnet + ' años y la libreta sanitaria por ' + COC_VIG.libreta + ' año desde su emisión, salvo que el documento indique otra fecha de vencimiento' + notaN('CAA') + '. Se avisa como «por vencer» lo que vence en los próximos ' + COC_AVISO_DIAS + ' días.');
      TAB([['Indicador', 'Valor', 'Fuente o criterio'],
        ['Personas de cocina registradas', P.total ? P.total + (P.empresa ? ' (' + (P.total - P.empresa) + ' de planta y ' + P.empresa + ' de la empresa)' : '') : 's/d', 'Registro del sistema'],
        ['Personas declaradas en el relevamiento', [v('COC08') ? v('COC08') + ' de planta' : '', v('COC09') ? v('COC09') + ' de la empresa' : ''].filter(Boolean).join(' y ') || 's/d', 'Declarado'],
        ['Con carnet de manipulador vigente', pcp(P.carnetVigente, P.total), 'Registro del sistema · declarado: ' + (minus(v('MAN01')) || 's/d')],
        ['Con libreta sanitaria vigente', pcp(P.libretaVigente, P.total), 'Registro del sistema · declarado: ' + (minus(v('MAN02')) || 's/d')],
        ['Con algún documento vencido o faltante', P.total ? String(P.vencidos) : 's/d', 'Registro del sistema'],
        ['Por vencer (' + COC_AVISO_DIAS + ' días)', P.total ? String(P.porVencer) : 's/d', 'Registro del sistema'],
        ['Sin dato de vencimiento', P.total ? String(P.sinDato) : 's/d', 'Registro del sistema'],
        ['Capacitación en BPM (12 meses)', P.total ? pcp(capBPM, P.total) : 's/d', 'Registro del sistema · declarado: ' + (minus(v('MAN04')) || 's/d')],
        ['Raciones por día', v('COC04') || 's/d', 'Declarado']], [170, 140, 160]);
      if (P.total && aRegularizar.length) P_(aRegularizar.length > 1 ? 'El detalle de las ' + aRegularizar.length + ' personas con documentación a regularizar está en el anexo I.' : 'El detalle de la persona con documentación a regularizar está en el anexo I.');
    }

    // ---------------- 5. CONCLUSIÓN
    H2(sinServicio ? '3. Conclusión' : '5. Conclusión');
    if (sinServicio) P_(nombre + ' no cuenta con servicio de alimentación. Si esta situación cambia, corresponde realizar un nuevo relevamiento.');
    else {
      const peores = bloques.filter(s => s[1] < 60).slice(-2).reverse().map(s => minus(sinLetra(s[0])));
      P_('La línea de base de la cocina ' + (/^(Hospital|Centro|Puesto|Servicio)\b/.test(nombre) ? 'del ' : 'de ') + nombre + ' registra un cumplimiento general del ' + (calc.pct === '' ? 's/d' : pc(calc.pct) + ' %') + (criticos.length ? ', con ' + criticos.length + ' hallazgo' + (criticos.length > 1 ? 's' : '') + ' crítico' + (criticos.length > 1 ? 's' : '') : ', sin hallazgos críticos') + (nose.length ? ' y ' + nose.length + ' dato' + (nose.length > 1 ? 's' : '') + ' a relevar' : '') + '. ' +
        (peores.length ? 'Los bloques con mayor margen de mejora son ' + lista(peores) + '. ' : '') +
        (P.total ? (P.vencidos ? 'Hay ' + P.vencidos + ' persona' + (P.vencidos > 1 ? 's' : '') + ' con carnet o libreta vencidos o faltantes, situación que conviene regularizar antes de que sigan manipulando alimentos. ' : 'Todo el personal registrado tiene carnet y libreta al día o con dato pendiente. ') : 'Para el seguimiento es necesario cargar en el sistema a las personas que trabajan en la cocina, con sus carnets y libretas. ') +
        (conEmpresa ? 'Las condiciones que dependen de la empresa concesionaria se ponen también en su conocimiento. ' : '') +
        (local ? 'Estos resultados son el punto de partida para acordar las medidas de mejora y medir su avance en los próximos relevamientos.' : 'Estos resultados se integrarán al análisis de la red, a partir del cual se elaborará un plan de abordaje común, que cada establecimiento adaptará a sus posibilidades.'));
    }

    // ---------------- 6. RECOMENDACIONES (columna PROPUESTA de ITEMS; pasan al plan de acción)
    if (!sinServicio) {
      H2('6. Recomendaciones');
      if (HL.length) {
        P_('Se proponen las siguientes mejoras, ordenadas por prioridad: «actuar ya» (' + cfg.plazo.Q1 + ' días) para los hallazgos críticos, «resolver rápido» (' + cfg.plazo.Q3 + ' días) para los puntos de peso alto y «planificar» (' + cfg.plazo.Q2 + ' días) para el resto. Se solicita a la Dirección que, por su intermedio, se requiera a los servicios responsables' + (conEmpresa ? ' y a la empresa concesionaria' : '') + ' la confirmación de las acciones y de los plazos de ejecución, que se registrarán en el plan de acción del sistema para su seguimiento.');
        TAB([['Prioridad', 'Hallazgo', 'Propuesta de mejora', 'Lugar', 'Fecha límite sugerida']].concat(HL.map(h => [h.prioridad + ' (' + h.dias + ' días)', h.it.ITEM, h.propuesta, h.lugares.join(', '), fFmt(h.limite)])), [70, 120, 160, 70, 55]);
      } else P_('No surgen mejoras a proponer en esta instancia.');
    }

    // ---------------- CIERRE Y FIRMA
    P_(C.TEXTO_CIERRE || 'Quedo a disposición por cualquier consulta, requerimiento o ampliación de lo informado.', { antes: 14 });
    P_('Celular: ' + (C.CONTACTO_CELULAR || 's/d') + ' · Correo electrónico: ' + (C.CONTACTO_CORREO || 's/d'), { izq: true, desp: 26 });
    P_(C.FIRMA_NOMBRE || 'Belén Pellegrini', { neg: true, color: INF2.AZUL, izq: true, desp: 0, inter: 1.2 });
    P_('Licenciada en Higiene, Seguridad y Medio Ambiente del Trabajo', { tam: 9, izq: true, desp: 0, inter: 1.2 });
    P_('M.P. LCOHSECH0383', { tam: 9, izq: true, desp: 0, inter: 1.2 });
    P_(local ? 'Servicio de Higiene y Seguridad Laboral' : (C.CARGO || ''), { tam: 9, izq: true, desp: 0, inter: 1.2 });

    // ---------------- ANEXOS
    if (!sinServicio && P.total && aRegularizar.length) {
      b.appendPageBreak(); H2('Anexo I · Personas con documentación a regularizar');
      TAB([['Apellido y nombre', 'Origen', 'Carnet de manipulador', 'Libreta sanitaria']].concat(aRegularizar.map(p => [p.APELLIDO_Y_NOMBRE || 's/d', p.ORIGEN === 'Empresa' ? 'Empresa' + (p.EMPRESA ? ' (' + p.EMPRESA + ')' : '') : 'Planta',
        ESTX[p.carnet] + (p.carnetVence && p.carnet !== 'no' ? ' · vence ' + fFmt(p.carnetVence) : ''), ESTX[p.libreta] + (p.libretaVence && p.libreta !== 'no' ? ' · vence ' + fFmt(p.libretaVence) : '')])), [150, 90, 115, 115]);
    }
    const fotos = []; R.forEach(r => (r.fotos || []).forEach(u => fotos.push({ u: u, h: { r: r, it: porId[r.item] || { ITEM: r.item } } })));
    if (fotos.length) { b.appendPageBreak(); H2((P.total && aRegularizar.length && !sinServicio ? 'Anexo II' : 'Anexo') + ' · Registro fotográfico'); infFotos_(b, fotos.slice(0, INF2.MAX_FOTOS), 1, porId); }
    if (b.getChild(0).getType() === DocumentApp.ElementType.PARAGRAPH && b.getChild(0).asParagraph().getText() === '') b.removeChild(b.getChild(0));
    doc.saveAndClose();
  } catch (err) { try { if (doc) DriveApp.getFileById(doc.getId()).setTrashed(true); } catch (e) {} throw err; }
  const notasOk = infNotas_(doc.getId(), notas);
  const archivo = codigo + (revision ? ' · Rev. ' + revision : '') + ' · ' + TIT + ' · ' + nombre;
  const pdf = carpeta.createFile(DriveApp.getFileById(doc.getId()).getAs('application/pdf')).setName(archivo + '.pdf');
  docActualizar_({ codigo: codigo, documento: doc.getUrl(), pdf: pdf.getUrl(), estado: 'Emitido', motivo: revision ? 'Revisión ' + revision + ' (' + hoy + ')' : '' });
  // Plan de acción: cada mejora del punto 6 pasa a DIAGNÓSTICO › PLAN_ACCION (nunca pisa respuestas ni estados)
  let plan = true; try { if (HL.length) planDesdeInforme_(X, HL.map((h, i) => ({ n: i + 1, h: h, accion: h.propuesta, lugar: h.lugares.join(', '), costo: 's/d', cargo: conEmpresa ? 's/d (Dirección o empresa concesionaria)' : 's/d (a definir por la Dirección)', prioridad: h.prioridad, plazo: h.dias + ' días' })), codigo); } catch (e) { plan = false; }
  return { ok: true, codigo: codigo, revision: revision, doc: doc.getUrl(), pdf: pdf.getUrl(), correo: cocCorreo_(X, cfg, codigo), notasAlPie: notasOk, criticos: criticos.length, aRelevar: nose.length, mejoras: HL.length, plan: plan };
}

// Texto del correo de envío (no se envía: se copia desde el portal)
function cocCorreo_(X, cfg, codigo) {
  const C = cfg.C, calc = X.calc, D = X.D, nombre = X.E.nombre || D.nombre || X.cod, fRel = String(X.A.FECHA).slice(0, 10).split('-').reverse().join('/');
  const v = id => { const r = X.R.find(q => q.item === id && !q.sitio); return r ? String(r.valor || r.resp || '') : ''; };
  const sin = v('COC01') === 'No hay servicio de alimentación', conEmpresa = /Empresa|Mixta/.test(v('COC02')), empresa = v('COC03');
  const crit = X.R.filter(r => { const it = X.porId[r.item]; if (!it || it.CRITICO !== 'Sí') return false; const w = pDiagValor_(it, { resp: r.resp, valor: r.valor }); return w != null && w <= 1 / 3; }).length;
  let P = null; try { P = cocResumenPersonas_(X.cod); } catch (e) {}
  const TIT = 'Línea de base de la cocina · ' + (D.alcance === 'Rural (BPM)' ? 'BPM' : 'BPM y HACCP');
  return { asunto: codigo + ' · ' + TIT + ' · ' + nombre,
    cuerpo: 'Sr./Sra. Director/a:\n\nEn el marco de las funciones del Servicio de Higiene y Seguridad Laboral¹, se remite la línea de base de la cocina ' + (/^(Hospital|Centro|Puesto|Servicio)\b/.test(nombre) ? 'del ' : 'de ') + nombre + ', relevada el ' + fRel + '.\n\n' +
      (sin ? 'Se registró que el establecimiento no cuenta con servicio de alimentación.' :
        'La cocina registró un cumplimiento general del ' + (calc.pct === '' ? 's/d' : pc(calc.pct) + ' %') + '. ' + (crit ? 'Se identificaron ' + crit + ' hallazgo(s) crítico(s), detallados en el punto 4.2, que conviene atender dentro de los ' + cfg.plazo.Q1 + ' días; en el punto 6 se proponen las mejoras para confirmar responsables y plazos.' : 'No se identificaron hallazgos críticos.') +
        (P && P.total ? ' Del personal de cocina registrado (' + P.total + '), ' + P.vencidos + ' tiene(n) carnet o libreta vencidos o faltantes; el detalle está en el anexo I.' : '')) + '\n\n' +
      (conEmpresa ? 'Se sugiere remitir copia a la empresa concesionaria' + (empresa ? ' (' + empresa + ')' : '') + ', responsable de su personal y de las condiciones a su cargo.\n\n' : '') +
      (C.TEXTO_CIERRE || '') + '\n\nSaludos cordiales.\n\n' + (C.FIRMA_NOMBRE || 'Belén Pellegrini') + '\nServicio de Higiene y Seguridad Laboral\nCelular: ' + (C.CONTACTO_CELULAR || '') + ' · ' + (C.CONTACTO_CORREO || '') + '\n\n———\n¹ ' + (C.NOTA_COMPETENCIAS || 'Ley 19.587; Decreto 351/79; Res. SRT 905/2015.'), copia: '' };
}

// Prueba del informe de cocina (12/10/2026): genera «PRUEBA-…» en la carpeta Informes del establecimiento con respuestas inventadas,
// sin numerar, sin tocar el registro de documentos ni el plan de acción. Borrarlo después de revisarlo.
function probarInformeCocinas() { Logger.log(JSON.stringify(cocProbarInforme_('HMH'))); }
function cocProbarInforme_(cod) {
  const D = cocAbrir_(cod, ''), items = D.items, porId = {}; items.forEach(i => porId[i.ID] = i);
  const resp = [], elegir = (it, k) => { const ops = String(it.OPCIONES || '').split('|').filter(Boolean); return ops[k % Math.max(1, ops.length - 1)] || ''; };
  let k = 0;
  items.forEach(it => {
    const lugares = it.NIVEL === 'S' ? (D.sitios || []).slice(0, 2).map(s => s.sitio) : [''];
    lugares.forEach(s => { const r = { sitio: s, item: it.ID, resp: '', valor: '', obs: '', fotos: [] };
      if (it.TIPO === 'TEXTO') r.valor = 's/d';
      else if (it.TIPO === 'MULTI') r.valor = String(it.OPCIONES).split('|')[0];
      else r.valor = elegir(it, k++);
      if (r.valor) resp.push(r); });
  });
  const R = resp.filter(r => diagAplica_(porId[r.item], resp, r.sitio, porId));
  const A = { ID_DIAG: 'PRUEBA-COCINA', CODIGO: cod, FECHA: Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd'), MODALIDAD: 'Visita', RELEVADO_POR: 'Belén Pellegrini', ENTREVISTADO: 's/d (prueba)', ESTADO: 'Cerrado' };
  const X = { ok: true, D: Object.assign({}, D, { actual: A, respuestas: R }), A: A, items: items, porId: porId, R: R, calc: pDiagCalcular_(items, R), E: est_(cod) || {}, cod: cod };
  const g = this, orig = { cocInfDatos_: g.cocInfDatos_, docNumero_: g.docNumero_, docActualizar_: g.docActualizar_, pInformesDiag_: g.pInformesDiag_, planDesdeInforme_: g.planDesdeInforme_ };
  try {
    g.cocInfDatos_ = () => X; g.docNumero_ = () => ({ ok: true, codigo: 'PRUEBA-' + cod + '-COCINA' }); g.docActualizar_ = () => ({ ok: true }); g.pInformesDiag_ = () => []; g.planDesdeInforme_ = () => true;
    return cocInforme_({ cod: cod, id: A.ID_DIAG });
  } finally { Object.keys(orig).forEach(n => g[n] = orig[n]); }
}
