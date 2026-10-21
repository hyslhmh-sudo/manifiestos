/**
 * SISTEMA HyS · MÓDULO 1 · RESIDUOS · INFORME DE FRECUENCIA DE RETIRO (versión 14.26, 13/10/2026; calendario real 14.80, 20/10/2026; 14.81, 20/10/2026: logos centrados, protocolo de manifiestos, comparación 2024-2026, costos desde la vigencia del contrato, corriente Y3, PDF solo a pedido)
 * Informe mensual, semestral, anual o de un período a elección, para Jefatura de Área Externa / CAPS, STyC, Direcciones o la
 * Secretaría de Salud. Belén elige los establecimientos y sitios (toda la red Trelew, HZT con o sin CAPS, un CAPS, todos los CAPS,
 * la sede ex ADOS, HSST con sus CAPS, etc.) y el informe muestra, por sitio, la frecuencia pactada y la real, con las fechas
 * exactas de cada retiro y los números de manifiesto.
 * Lee: libro general (MANIFIESTOS, CONTRATOS, CONTRATO_GRUPOS, CONTRATO_ALCANCE) y BASE COMÚN › SITIOS. Escribe solo al generar:
 * un Google Doc y su PDF en la carpeta «Informes» del establecimiento (o «Informes de la red» si hay más de uno) y el número en
 * REGISTRO_DOCUMENTOS (docNumero_, bloque RES, tipo IT).
 * Normativa: Ley 24.051 y Dto. 831/93 (manifiesto); Ley XI N.º 35 (Código Ambiental del Chubut); Anexo I del contrato (frecuencias);
 * Ley 19.587, Dto. 351/79 y Res. SRT 905/2015 (competencias del servicio).
 * Entrada: Portal.gs › case 'p_res_inf_opciones' y 'p_res_informe'.
 */
const RINF = {
  MODELO: '1MDc2eRXqj37O-nmi5HrYHxXfyuo16E4tIMx8b6NTyOs',   // MODELO · Informe técnico HySL: encabezado con logos HZT/HMH y pie (código, servicio, logo HySL, «Página X de Y»)
  LOGO_PIE: '1DnztPPclcsCNA23DDlAF-90Uchf6QdzN',   // logo de HySL («Hospitales más seguros para las personas»)
  TRELEW: ['HZT', 'HMH'],                          // con estos, paleta azul y logo HZT/HMH; con otros, colores de la Secretaría de Salud
  SS: { AZUL: '#21708C', ACENTO: '#FF682C', TEXTO: '#343A40' },
  DESTINOS: ['Jefatura de Área Externa (CAPS)', 'STyC', 'Dirección del establecimiento', 'Secretaría de Salud']
};

// ------------------------------------------------------------------ Opciones: establecimientos y sitios para elegir
function resInfOpciones_() {
  const E = pEstablecimientos_().filas, est = {};
  E.forEach(f => { const c = limpio_(f.v[0]); if (c) est[c] = { cod: c, nombre: limpio_(f.v[1]), tipo: limpio_(f.v[3]), area: limpio_(f.v[4]), sitios: {} }; });
  try { pTabla_(pBC_().getSheetByName('SITIOS'), 7).forEach(r => { const c = limpio_(r.v[0]), s = limpio_(r.v[1]); if (est[c] && s) est[c].sitios[sinTildes_(s)] = { sitio: s, tipo: limpio_(r.v[4]), frecuencia: limpio_(r.v[6]) }; }); } catch (e) {}
  // Sitios que aparecen en los manifiestos de los últimos 24 meses (aunque no estén en SITIOS)
  const d0 = new Date(); d0.setMonth(d0.getMonth() - 24);
  const L = rctRetiros_(SpreadsheetApp.openById(CFG.GENERAL), Utilities.formatDate(d0, TZ, 'yyyy-MM-dd')), ult = {};
  L.retiros.forEach(r => { const e = est[r.cod]; if (!e) return; const k = sinTildes_(r.sitio); e.sitios[k] = e.sitios[k] || { sitio: r.sitio, tipo: r.tipo, frecuencia: '' }; const u = r.cod + '|' + k; if (!ult[u] || r.fecha > ult[u]) ult[u] = r.fecha; });
  const lista = Object.keys(est).map(c => { const e = est[c]; e.sitios = Object.keys(e.sitios).map(k => Object.assign({ ultimo: ult[c + '|' + k] || '' }, e.sitios[k])).sort((a, b) => a.sitio.localeCompare(b.sitio));
    e.conDatos = e.sitios.some(s => s.ultimo); return e; }).filter(e => e.sitios.length).sort((a, b) => (b.conDatos - a.conDatos) || a.nombre.localeCompare(b.nombre));
  return { ok: true, establecimientos: lista, destinos: RINF.DESTINOS, hoy: Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd') };
}

// ------------------------------------------------------------------ Cálculo (sirve para la vista previa y para el documento)
// x: { desde: 'aaaa-mm-dd', hasta: 'aaaa-mm-dd', sitios: ['COD|Sitio', ...], tipoPeriodo, destinatario, cargo, detalle, generar }
function resInfCalcular_(x) {
  const hoy = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd'), re = /^\d{4}-\d{2}-\d{2}$/;
  if (!re.test(x.desde || '') || !re.test(x.hasta || '')) return { ok: false, mensaje: 'Elegí el período del informe.' };
  if (x.desde > x.hasta) return { ok: false, mensaje: 'La fecha «desde» es posterior a «hasta».' };
  const sel = (x.sitios || []).map(String).filter(s => s.indexOf('|') > 0); if (!sel.length) return { ok: false, mensaje: 'Elegí al menos un establecimiento o sitio.' };
  const hasta = x.hasta > hoy ? hoy : x.hasta, desde = x.desde, dPer = (new Date(hasta + 'T12:00:00') - new Date(desde + 'T12:00:00')) / 864e5 + 1;
  const g = SpreadsheetApp.openById(CFG.GENERAL), K = rctContratos_(g), C = K.contratos, anioH = Number(hasta.slice(0, 4)), ANIOS = [anioH - 2, anioH - 1, anioH], base3 = ANIOS[0] + '-01-01',
    LA = rctRetiros_(g, base3 < desde ? base3 : desde), L = { retiros: LA.retiros.filter(r => r.fecha >= desde), info: LA.info };
  const elegido = {}; sel.forEach(s => { const i = s.indexOf('|'); elegido[s.slice(0, i) + '|' + sinTildes_(s.slice(i + 1))] = s.slice(i + 1); });
  const frecBC = {}, tipoBC = {}; try { pTabla_(pBC_().getSheetByName('SITIOS'), 7).forEach(r => { const k = limpio_(r.v[0]) + '|' + sinTildes_(r.v[1]); frecBC[k] = limpio_(r.v[6]); tipoBC[k] = limpio_(r.v[4]); }); } catch (e) {}
  // Retiros del período agrupados por sitio y fecha (un retiro = una fecha con uno o más manifiestos)
  const S = {};
  Object.keys(elegido).forEach(k => { const i = k.indexOf('|'), cod = k.slice(0, i); S[k] = { cod: cod, nombre: (L.info[cod] || {}).nombre || cod, sitio: elegido[k], tipo: tipoBC[k] || '', dias: {} }; });
  L.retiros.forEach(r => { if (r.fecha > hasta) return; const k = r.cod + '|' + sinTildes_(r.sitio), s = S[k]; if (!s) return; if (!s.tipo && r.tipo) s.tipo = r.tipo;
    const d = s.dias[r.fecha] = s.dias[r.fecha] || { fecha: r.fecha, nros: [], y1: 0, y3: 0, otras: 0, enKg: 0 }; if (r.nro && d.nros.indexOf(r.nro) < 0) d.nros.push(r.nro);
    d.y1 += r.y1; d.y3 += r.y3; d.otras += r.otras; if (r.enKg) d.enKg++; });
  const meses = rctMeses_(desde, hasta), dif = (a, b) => Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 864e5);
  // Calendario real (14.80, 20/10/2026): la empresa no retira los domingos ni los feriados nacionales (BASE COMÚN › FERIADOS, IMPEESA_NO_RETIRA = Sí);
  // retira los feriados y días no laborables provinciales de Chubut. Los esperados salen de los días lunes a sábado sin feriado nacional.
  const FER = gregFeriados_(), ferEntre = (a, b) => Object.keys(FER).filter(f => f > a && f < b).length;
  const CAL = (() => { let hab = 0, sab = 0; const fer = []; for (let t = new Date(desde + 'T12:00:00'), e = new Date(hasta + 'T12:00:00'); t <= e; t.setDate(t.getDate() + 1)) {
    const f = Utilities.formatDate(t, TZ, 'yyyy-MM-dd'), w = t.getDay(); if (w === 0) continue; if (FER[f]) { fer.push([f, FER[f]]); continue; } hab++; if (w === 6) sab++; } return { hab: hab, sab: sab, fer: fer }; })();
  const sitios = Object.keys(S).map(k => {
    const s = S[k], R = Object.keys(s.dias).sort().map(f => s.dias[f]);
    const u = rctUbicar_(C, s.cod, s.sitio, s.tipo, hasta.slice(0, 7)) || {};
    const frec = u.frecuencia && !/^s\/d/i.test(u.frecuencia) ? u.frecuencia : (frecBC[k] || u.frecuencia || 's/d (revisar)');
    const origen = u.frecuencia && !/^s\/d/i.test(u.frecuencia) ? (u.deduccion ? 'Deducción (no figura en el contrato)' : 'Contrato ' + u.contrato) : (frecBC[k] ? 'BASE COMÚN › SITIOS' : 's/d');
    const porMes = rctEsperados_(frec), fN = sinTildes_(frec), diaria = /diari/.test(fN) && !/todos los dias|lun a dom/.test(fN),
      esperados = porMes ? Math.round((diaria ? CAL.hab : porMes * CAL.hab / 26.083) * 10) / 10 : null, lim = resLimiteDias_(frec);
    let ant = null; const fuera = [];
    R.forEach(d => { d.desdeAnt = ant ? dif(ant.fecha, d.fecha) : null; const fe = ant ? ferEntre(ant.fecha, d.fecha) : 0; d.excede = d.desdeAnt != null && d.desdeAnt - fe > lim; if (d.excede) fuera.push({ desde: ant.fecha, nrosDesde: ant.nros, hasta: d.fecha, nrosHasta: d.nros, dias: d.desdeAnt, fer: fe }); ant = d; });
    const sinRetiroFinal = R.length ? dif(R[R.length - 1].fecha, hasta) : null;
    if (R.length && sinRetiroFinal - ferEntre(R[R.length - 1].fecha, hasta) > lim) fuera.push({ desde: R[R.length - 1].fecha, nrosDesde: R[R.length - 1].nros, hasta: '', nrosHasta: [], dias: sinRetiroFinal, abierto: true, fer: ferEntre(R[R.length - 1].fecha, hasta) });
    // Comparación de los últimos 3 años (año completo y mismo período, del 1.º de enero al día y mes de «hasta»): retiros = fechas distintas con retiro
    const kS = s.cod + '|' + sinTildes_(s.sitio), md = hasta.slice(5), anios = {};
    ANIOS.forEach(a => anios[a] = { ret: 0, dm3: 0, y1: 0, y3: 0, ret3: 0, retMP: 0, dm3MP: 0, y3MP: 0, _f: {}, _f3: {}, _fm: {} });
    LA.retiros.forEach(r => { if (r.cod + '|' + sinTildes_(r.sitio) !== kS || r.fecha > hasta && Number(r.fecha.slice(0, 4)) === anioH) return; const a = anios[Number(r.fecha.slice(0, 4))]; if (!a) return;
      const t = r.y1 + r.y3 + r.otras, mp = r.fecha.slice(5) <= md; a.dm3 += t; a.y1 += r.y1; a.y3 += r.y3; a._f[r.fecha] = 1; if (r.y3 > 0) a._f3[r.fecha] = 1; if (mp) { a.dm3MP += t; a.y3MP += r.y3; a._fm[r.fecha] = 1; } });
    ANIOS.forEach(y => { const a = anios[y]; a.ret = Object.keys(a._f).length; a.ret3 = Object.keys(a._f3).length; a.retMP = Object.keys(a._fm).length; ['dm3', 'y1', 'y3', 'dm3MP', 'y3MP'].forEach(k => a[k] = Math.round(a[k])); delete a._f; delete a._f3; delete a._fm; });
    const gaps = R.slice(1).map(d => d.desdeAnt), cuenta = {}; R.forEach(d => cuenta[d.fecha.slice(0, 7)] = (cuenta[d.fecha.slice(0, 7)] || 0) + 1);
    return { anios: anios, cod: s.cod, nombre: s.nombre, sitio: s.sitio, tipo: s.tipo || 's/d', frecuencia: frec, noAplica: /no corresponde|no aplica/i.test(sinTildes_(frec)), origen: origen, limite: lim, esperados: esperados,
      retiros: R.length, manifiestos: R.reduce((a, d) => a + d.nros.length, 0), cumplimiento: esperados ? Math.round(100 * R.length / esperados) : null,
      intervaloProm: gaps.length ? Math.round(10 * gaps.reduce((a, b) => a + b, 0) / gaps.length) / 10 : null, intervaloMax: gaps.length ? Math.max.apply(null, gaps) : null,
      primero: R.length ? R[0].fecha : '', ultimo: R.length ? R[R.length - 1].fecha : '', sinRetiroFinal: sinRetiroFinal, fuera: fuera, porMes: cuenta,
      sabados: diaria ? { pactados: CAL.sab, retirados: R.filter(d => new Date(d.fecha + 'T12:00:00').getDay() === 6).length } : null, enFeriado: R.filter(d => FER[d.fecha]).length, y1: Math.round(R.reduce((a, d) => a + d.y1, 0)), y3: Math.round(R.reduce((a, d) => a + d.y3, 0)), enKg: R.reduce((a, d) => a + d.enKg, 0),
      detalle: R.map(d => ({ fecha: d.fecha, nros: d.nros, y1: Math.round(d.y1), y3: Math.round(d.y3), desdeAnt: d.desdeAnt, excede: d.excede })) };
  }).sort((a, b) => (a.nombre + (a.tipo === 'CAPS' ? 'z' : 'a') + a.sitio).localeCompare(b.nombre + (b.tipo === 'CAPS' ? 'z' : 'a') + b.sitio));
  // Costos: solo desde la vigencia del contrato vigente (no hacia atrás): volumen retirado (todas las corrientes, en dm³) por el precio por dm³ del grupo del sitio
  const cv = C.find(c => c.ESTADO === 'Vigente') || null, costos = { contrato: cv ? cv.ID : '', empresa: cv ? cv.EMPRESA : '', expediente: cv ? cv.EXPEDIENTE : '', resolucion: cv ? cv.RESOLUCION : '', vigencia: cv ? cv.DESDE : '', desde: '', filas: [], total: 0, dm3: 0, retiros: 0, cupo: cv ? cv.CUPO_TOTAL_DM3_MES : 0 };
  if (cv && cv.DESDE) {
    costos.desde = cv.DESDE > desde ? cv.DESDE : desde; const M = {}, kk = {};
    LA.retiros.forEach(r => { if (r.fecha < costos.desde || r.fecha > hasta || !elegido[r.cod + '|' + sinTildes_(r.sitio)]) return; const m = r.fecha.slice(0, 7), u = rctUbicar_([cv], r.cod, r.sitio, r.tipo, m); if (!u) return;
      const p = cv.grupos.filter(x => x.GRUPO === u.grupo && (!x.DESDE || x.DESDE.slice(0, 7) <= m) && (!x.HASTA || x.HASTA.slice(0, 7) >= m)).sort((a, b) => String(b.DESDE).localeCompare(String(a.DESDE)))[0]; if (!p) return;
      const o = M[m] = M[m] || { mes: m, retiros: 0, dm3: 0, costo: 0, precio: p.PRECIO_DM3 }, t = r.y1 + r.y3 + r.otras, kf = r.cod + '|' + r.sitio + '|' + r.fecha;
      if (!kk[kf]) { kk[kf] = 1; o.retiros++; } o.dm3 += t; o.costo += t * p.PRECIO_DM3; o.precio = p.PRECIO_DM3; });
    costos.filas = rctMeses_(costos.desde, hasta).map(m => M[m] || { mes: m, retiros: 0, dm3: 0, costo: 0, precio: null }); costos.filas.forEach(f => { f.dm3 = Math.round(f.dm3); f.costo = Math.round(f.costo); costos.total += f.costo; costos.dm3 += f.dm3; costos.retiros += f.retiros; });
  }
  const totAnio = ANIOS.map(y => { const o = { anio: y, ret: 0, dm3: 0, y1: 0, y3: 0, ret3: 0, retMP: 0, dm3MP: 0 }; sitios.forEach(s => { const a = s.anios[y]; ['ret', 'dm3', 'y1', 'y3', 'ret3', 'retMP', 'dm3MP'].forEach(k => o[k] += a[k]); }); return o; });
  const ests = Array.from(new Set(sitios.map(s => s.cod))), tot = sitios.reduce((a, s) => a + s.retiros, 0), esp = sitios.filter(s => s.esperados).reduce((a, s) => a + s.esperados, 0);
  return { ok: true, desde: desde, hasta: hasta, hastaPedido: x.hasta, hoy: hoy, dias: dPer, habiles: CAL.hab, feriados: CAL.fer, meses: meses, anios: ANIOS, totAnio: totAnio, costos: costos, sitios: sitios, establecimientos: ests.map(c => ({ cod: c, nombre: (L.info[c] || {}).nombre || c })),
    totales: { sitios: sitios.length, conRetiros: sitios.filter(s => s.retiros).length, retiros: tot, manifiestos: sitios.reduce((a, s) => a + s.manifiestos, 0),
      esperados: Math.round(esp), cumplimiento: esp ? Math.round(100 * sitios.filter(s => s.esperados).reduce((a, s) => a + s.retiros, 0) / esp) : null,
      intervalosFuera: sitios.reduce((a, s) => a + s.fuera.length, 0), sitiosBajo: sitios.filter(s => s.cumplimiento != null && s.cumplimiento < 80).length } };
}

// ------------------------------------------------------------------ Entrada: vista previa o documento
function resInforme_(x) {
  x = x || {};
  const R = resInfCalcular_(x); if (!R.ok || !x.generar) return R;
  return resInfDocumento_(x, R);
}

// ------------------------------------------------------------------ Asistencia a capacitaciones de residuos (CAP-HYS-003 y CAP-HYS-020) por sitio, desde el libro CAPACITACIONES
// Se cruza el servicio / institución de cada persona con el nombre del sitio; el sistema registra desde 2026 (los dictados anteriores no están cargados)
function resInfCapac_(sitios) {
  try {
    const ss = SpreadsheetApp.openById(CG.LIBRO), tabla = n => { const v = ss.getSheetByName(n).getDataRange().getValues(), h = v[4].map(String); return v.slice(5).filter(r => r[0] !== '').map(r => { const o = {}; h.forEach((k, i) => o[k] = r[i]); return o; }); };
    const P = {}; tabla('PERSONAS').forEach(p => P[cgDni_(p.DNI)] = p);
    const dni = {}; tabla('REGISTROS').forEach(r => { if (['CAP-HYS-003', 'CAP-HYS-020'].indexOf(String(r.CODIGO)) >= 0 && String(r.ESTADO) === 'Válido') dni[cgDni_(r.DNI)] = 1; });
    const por = {}; let total = 0, caps = 0;
    Object.keys(dni).forEach(d => { const p = P[d]; if (!p) return; total++; const sv = sinTildes_(String(p.SERVICIO || '') + ' ' + String(p.INSTITUCION || ''));
      if (/caps|primer nivel|area externa/.test(sv)) caps++; sitios.forEach(x => { const n = sinTildes_(x.sitio); if (n && sv.indexOf(n) >= 0) por[x.sitio] = (por[x.sitio] || 0) + 1; }); });
    return { ok: true, total: total, caps: caps, por: por };
  } catch (e) { return { ok: false }; }
}

// ------------------------------------------------------------------ Documento (Google Doc; el PDF solo si se pide con pdf: true)
function resInfDocumento_(x, R) {
  const fTxt = f => f ? f.split('-').reverse().join('/') : 's/d', num = n => n == null ? 's/d' : Number(n).toLocaleString('es-AR'), pc = n => n == null ? 's/d' : n + ' %';
  const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'], dia = f => DIAS[new Date(f + 'T12:00:00').getDay()];
  const trelew = R.establecimientos.every(e => RINF.TRELEW.indexOf(e.cod) >= 0);
  const COL = trelew ? { AZUL: INF2.AZUL, ACENTO: INF2.PATA, TEXTO: INF2.TEXTO } : { AZUL: RINF.SS.AZUL, ACENTO: RINF.SS.ACENTO, TEXTO: RINF.SS.TEXTO };
  const MES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'], mesTxt = m => MES[Number(m.slice(5, 7)) - 1] + ' ' + m.slice(0, 4);
  const tipoP = String(x.tipoPeriodo || 'Período'), periodoTxt = tipoP === 'Mensual' ? mesTxt(R.desde.slice(0, 7)) : 'del ' + fTxt(R.desde) + ' al ' + fTxt(R.hastaPedido);
  const alcance = R.establecimientos.map(e => { const ss = R.sitios.filter(s => s.cod === e.cod); return e.nombre + ' (' + (ss.length === 1 ? ss[0].sitio : ss.length + ' sitios') + ')'; }).join('; ');
  const est = R.establecimientos.length === 1 ? R.establecimientos[0].cod : 'RED';
  const asunto = 'Frecuencia de retiro de residuos peligrosos · ' + tipoP + ' ' + periodoTxt + ' · ' + (est === 'RED' ? R.establecimientos.map(e => e.cod).join(' + ') : R.establecimientos[0].nombre);
  // x.prueba: genera el documento sin pedir número ni registrarlo (para revisar el formato); se guarda como PRUEBA y se puede borrar
  const n = x.prueba ? { ok: true, codigo: 'PRUEBA-' + Utilities.formatDate(new Date(), TZ, 'yyyyMMdd-HHmm') } : docNumero_({ est: est, bloque: 'RES', tipo: 'IT', asunto: asunto, origen: 'Sistema', idOrigen: 'retiros ' + R.desde + '/' + R.hasta, pedidoPor: Session.getActiveUser().getEmail() }); if (!n.ok) return n;
  const codigo = n.codigo, titulo = codigo + ' · Frecuencia de retiro · ' + tipoP + ' ' + periodoTxt;
  let carpeta;
  try { carpeta = est !== 'RED' && est_(est) && est_(est).carpeta ? carpeta_(DriveApp.getFolderById(est_(est).carpeta), 'Informes') : null; } catch (e) { carpeta = null; }
  if (!carpeta) carpeta = carpeta_(DriveApp.getFileById(CFG.GENERAL).getParents().next(), 'Informes de la red');
  const notas = [], yaNota = {}, nota = (k, t) => { if (yaNota[k]) return '[[NOTA' + yaNota[k] + ']]'; notas.push(t); yaNota[k] = notas.length; return '[[NOTA' + notas.length + ']]'; };
  let doc;
  try {
    // Se parte del modelo de informe técnico (encabezado y pie institucionales) y se reemplaza el cuerpo
    let deModelo = true;
    try { doc = DocumentApp.openById(DriveApp.getFileById(RINF.MODELO).makeCopy(titulo, carpeta).getId()); doc.getBody().clear(); }
    catch (e) { deModelo = false; doc = DocumentApp.create(titulo); DriveApp.getFileById(doc.getId()).moveTo(carpeta); }
    const b = doc.getBody(); b.setPageWidth(595.3).setPageHeight(841.9).setMarginTop(56).setMarginBottom(56).setMarginLeft(62).setMarginRight(57);
    const AT = DocumentApp.Attribute, IZQ = DocumentApp.HorizontalAlignment.LEFT;
    const estilo = o => { const a = {}; a[AT.FONT_FAMILY] = INF2.FUENTE; a[AT.FONT_SIZE] = o.tam || 10.5; a[AT.FOREGROUND_COLOR] = o.color || COL.TEXTO; a[AT.BOLD] = !!o.neg; a[AT.ITALIC] = !!o.it; return a; };
    const P_ = (t, o) => { o = o || {}; const p = b.appendParagraph(t || ''); if (o.h) p.setHeading(o.h); p.setAttributes(estilo(o)); p.setAlignment(o.izq ? IZQ : DocumentApp.HorizontalAlignment.JUSTIFY); p.setLineSpacing(o.inter || 1.5); p.setSpacingAfter(o.desp == null ? 6 : o.desp); p.setSpacingBefore(o.antes || 0); return p; };
    const G = t => P_(t, { it: true, color: COL.ACENTO, tam: 9.5 });   // guía: se borra al revisar
    const H1 = t => P_(t, { h: DocumentApp.ParagraphHeading.HEADING1, tam: 14, neg: true, color: COL.AZUL, izq: true, desp: 8, antes: 6, inter: 1.15 });
    const H2 = t => P_(t, { h: DocumentApp.ParagraphHeading.HEADING2, tam: 11.5, neg: true, color: COL.AZUL, izq: true, desp: 4, antes: 6, inter: 1.15 });
    const TAB = (filas, anchos, marcar) => { const t = infTabla2_(b, filas, anchos);
      if (!trelew) for (let j = 0; j < t.getRow(0).getNumCells(); j++) t.getRow(0).getCell(j).setBackgroundColor(COL.AZUL);
      if (marcar) marcar.forEach(i => { const row = t.getRow(i); for (let j = 0; j < row.getNumCells(); j++) row.getCell(j).editAsText().setForegroundColor('#B4361F'); });
      return t; };
    const COMP = nota('comp', 'Ley N.º 19.587 de Higiene y Seguridad en el Trabajo y Decreto N.º 351/79; Resolución SRT N.º 905/2015, Anexo I (funciones del Servicio de Higiene y Seguridad en el Trabajo).');
    const MANI = nota('mani', 'Ley N.º 24.051 de Residuos Peligrosos, arts. 12 y 13 (manifiesto), y Decreto N.º 831/93; Ley XI N.º 35 (Código Ambiental de la Provincia del Chubut).');
    const ANEXO = nota('anexo', 'Contrato vigente de recolección, tratamiento y disposición final de residuos patogénicos, Anexo I «Forma de ejecución de los trabajos · De las frecuencias de recolección». Cuando el contrato no fija la frecuencia de un sitio, se usa la frecuencia registrada en BASE COMÚN › SITIOS.');
    const notaProt = () => trelew ? nota('prot', 'PROT-RES-003 «Manifiesto de residuos peligrosos: retiro, verificación y registro» (versión 00): reglas fundamentales 1 a 5, pasos 11 a 30, punto 9 (situaciones anormales) y punto 10 (prohibiciones). https://drive.google.com/file/d/1tA--YuvTH2LNqDlUMY05sxMsqTMIpLv1/view') : MANI;
    const notaY3 = () => nota('y3', 'Ley N.º 24.051, Anexo I (categorías sometidas a control: Y1, desechos clínicos resultantes de la atención médica; Y3, desechos de medicamentos y productos farmacéuticos) y Decreto N.º 831/93.');
    const CT = R.costos, mon = n => n == null ? 's/d' : '$ ' + Number(n).toLocaleString('es-AR');
    const notaCont = () => nota('cont', CT.contrato ? 'Contrato ' + CT.contrato + ' · ' + CT.empresa + ' · Expte. ' + CT.expediente + ' · ' + CT.resolucion + ', vigente desde el ' + fTxt(CT.vigencia) + '. Precio por dm³ del grupo de cada sitio, IVA incluido; cláusula SÉPTIMA (cupo mensual y excedente), Libro general de residuos › CONTRATO_GRUPOS.' : 'Contrato vigente: s/d (revisar).');
    const AN = R.anios, corte = fTxt(R.hasta).slice(0, 5), lblA = (y, i) => i === 2 ? y + ' (al ' + corte + ')' : String(y);
    const T = R.totales, conEsp = R.sitios.filter(s => s.esperados), bajos = R.sitios.filter(s => s.cumplimiento != null && s.cumplimiento < 80), sinRet = R.sitios.filter(s => !s.retiros && !s.noAplica);

    // ---------------- PORTADA
    const enc = b.getParagraphs()[0]; enc.setText(trelew ? 'Hospital Zonal Trelew «Dr. Adolfo Margara» · Hospital María Humphreys' : 'Secretaría de Salud de la Provincia del Chubut'); enc.setAttributes(estilo({ tam: 11, neg: true, color: COL.AZUL })); enc.setAlignment(IZQ);
    P_('Servicio de Higiene y Seguridad Laboral', { color: COL.ACENTO, izq: true, desp: 70 });
    P_('INFORME TÉCNICO', { tam: 9, neg: true, color: COL.ACENTO, izq: true, desp: 4, inter: 1.1 });
    P_('Frecuencia de retiro de residuos peligrosos', { tam: 24, neg: true, color: COL.AZUL, izq: true, desp: 4, inter: 1.1 });
    P_('Informe ' + tipoP.toLowerCase() + ' · ' + periodoTxt, { tam: 13, color: COL.ACENTO, izq: true, desp: 36, inter: 1.2 });
    TAB([['Informe N.º', codigo], ['Período', periodoTxt + (R.hastaPedido > R.hasta ? ' (datos hasta el ' + fTxt(R.hasta) + ')' : '')], ['Establecimientos y sitios', alcance],
      ['Destinatario', [x.destinatario, x.cargo].filter(Boolean).join(' · ') || 's/d (revisar)'], ['Fecha del informe', fTxt(R.hoy)],
      ['Elaboró', 'Belén Pellegrini · Licenciada en Higiene, Seguridad y Medio Ambiente del Trabajo, M.P. LCOHSECH0383']], [150, 320]);
    G('Borrador generado por el sistema HyS (versión 0). Los textos en color e itálica son guía: revisarlos y borrarlos antes de firmar.' + (deModelo ? '' : ' Números de página: Insertar › Números de página.'));
    b.appendPageBreak();
    // ---------------- ÍNDICE
    H1('Índice'); G('Para tener el índice con números de página: Insertar › Índice, y borrar esta lista.');
    ['Resumen ejecutivo', '1. Presentación', '2. Método de trabajo (2.1 Datos y cálculo · 2.2 Protocolo de manifiestos y criterio para el reclamo)', '3. Descripción de los hechos (retiros, comparación ' + AN[0] + '-' + AN[2] + ', corriente Y3, costos)', '4. Análisis de los datos', '5. Conclusión', '6. Recomendaciones', 'Anexo · Detalle de retiros por sitio'].forEach(t => P_(t, { izq: true, desp: 0, inter: 1.3 }));
    b.appendPageBreak();

    // ---------------- RESUMEN EJECUTIVO (prosa, sin tablas)
    H1('Resumen ejecutivo');
    P_('Entre el ' + fTxt(R.desde) + ' y el ' + fTxt(R.hasta) + ' se registraron ' + num(T.retiros) + ' retiros de residuos peligrosos (' + num(T.manifiestos) + ' manifiestos) en ' + T.conRetiros + ' de los ' + T.sitios + ' sitios incluidos. ' +
      (T.esperados ? 'Según la frecuencia pactada correspondían unos ' + num(T.esperados) + ' retiros en los sitios que la tienen definida, por lo que el cumplimiento fue del ' + pc(T.cumplimiento) + '. ' : 'Ningún sitio incluido tiene una frecuencia pactada que permita calcular los retiros esperados. ') +
      (bajos.length ? (bajos.length === 1 ? 'Un sitio quedó por debajo del 80 %: ' : bajos.length + ' sitios quedaron por debajo del 80 %: ') + bajos.slice(0, 6).map(s => s.sitio + ' (' + pc(s.cumplimiento) + ')').join(', ') + (bajos.length > 6 ? ', entre otros' : '') + '. ' : '') +
      (sinRet.length ? (sinRet.length === 1 ? 'Un sitio no registra retiros en el período: ' : sinRet.length + ' sitios no registran retiros en el período: ') + sinRet.slice(0, 6).map(s => s.sitio).join(', ') + (sinRet.length > 6 ? ', entre otros' : '') + '.' : ''));
    const sinY3r = R.sitios.filter(s => !s.noAplica && !s.y3);
    P_((T.intervalosFuera ? 'Se identificaron ' + T.intervalosFuera + (T.intervalosFuera === 1 ? ' intervalo' : ' intervalos') + ' entre retiros mayores que el admisible para la frecuencia de cada sitio, con las fechas y los números de manifiesto en el punto 4.2. Con los datos del sistema no es posible establecer si la diferencia con lo pactado se debe a retiros no realizados por la empresa o a manifiestos no entregados, no remitidos o no cargados; por eso el punto 2.2 indica la verificación previa que establece el protocolo de manifiestos y, confirmada la omisión, el reclamo ante la Secretaría de Salud, que gestiona el contrato. '
      : 'No se identificaron intervalos entre retiros mayores que el admisible para la frecuencia de cada sitio. ') +
      (sinY3r.length ? (sinY3r.length === 1 ? 'Un sitio no registra' : sinY3r.length + ' sitios no registran') + ' retiros de residuos Y3 (medicamentos) en el período, lo que en un centro con farmacia indica una gestión inadecuada de esa corriente. ' : '') +
      (CT.filas.length ? 'Desde la vigencia del contrato (' + fTxt(CT.vigencia) + ') el volumen retirado fue de ' + num(CT.dm3) + ' dm³, equivalente a ' + mon(CT.total) + ' al precio unitario contratado.' : ''));
    G('Revisar: uno o dos párrafos en prosa; debe leerse en un minuto.');

    // ---------------- 1. PRESENTACIÓN
    H1('1. Presentación');
    P_('El presente informe se elabora desde el Servicio de Higiene y Seguridad Laboral, en el marco de sus funciones' + COMP + ', a fin de poner en conocimiento de ' + (x.destinatario || 'la superioridad') + ' la frecuencia con que la empresa prestadora retiró los residuos peligrosos en los establecimientos y sitios indicados, y compararla con la frecuencia pactada.');
    P_('El retiro regular evita acopios prolongados en los establecimientos, que aumentan la exposición del personal y de los pacientes y exigen más espacio de almacenamiento transitorio. Cada retiro queda documentado en el manifiesto de transporte' + MANI + ', que es la fuente de este informe.');

    // ---------------- 2. MÉTODO DE TRABAJO
    H1('2. Método de trabajo');
    H2('2.1 Datos y cálculo');
    P_('Se tomaron los manifiestos cargados en el Sistema HyS para el período indicado. Se considera un retiro cada fecha en que la empresa retiró residuos de un sitio, con uno o más manifiestos. Para cada sitio se informa la frecuencia pactada' + ANEXO + ', los retiros esperados en el período, los realizados, el intervalo promedio y el máximo entre retiros, y los intervalos que superan el admisible. Los retiros esperados se calculan sobre el calendario real del período: se descuentan los domingos y los feriados nacionales, en los que la empresa transportista y operadora de residuos peligrosos (Impeesa) no retira; los feriados y días no laborables provinciales de Chubut no se descuentan, porque la empresa retira esos días. Del intervalo entre dos retiros tampoco se computan los feriados nacionales comprendidos. En el período hubo ' + num(R.habiles) + ' días de lunes a sábado con servicio posible.');
    TAB([['Frecuencia pactada', 'Retiros esperados por mes', 'Intervalo máximo admisible'], ['Diaria (lunes a sábado)', '26', '3 días'], ['Tres días por semana', '13', '5 días'], ['Dos días por semana', '8,7', '6 días'], ['Semanal', '4,3', '10 días'], ['Quincenal', '2,2', '20 días'], ['Mensual', '1', '40 días'], ['Sin frecuencia definida', 's/d', '30 días (referencia)']], [170, 150, 150]);
    P_(R.feriados.length ? 'Feriados nacionales descontados en el período (' + R.feriados.length + '): ' + R.feriados.map(f => fTxt(f[0]) + ' ' + f[1]).join('; ') + '.' : 'En el período no hubo feriados nacionales de lunes a sábado.');
    P_('Comparación de años y costos: se comparan los retiros (fechas con retiro) y el volumen retirado (dm³, todas las corrientes) de ' + AN.join(', ') + ', tanto del año completo como del mismo período (del 1.º de enero al ' + corte + '). Los costos se calculan solo desde la vigencia del contrato vigente' + (CT.contrato ? ' (' + CT.contrato + ', desde el ' + fTxt(CT.vigencia) + ')' : '') + ', y no hacia atrás, multiplicando el volumen retirado por el precio por dm³ del grupo de cada sitio' + notaCont() + '.');
    P_('Limitaciones: el informe refleja solo los manifiestos cargados en el sistema. Un retiro sin manifiesto cargado no aparece y baja el cumplimiento. La causa puede ser que el retiro no se realizó, que la empresa no entregó el manifiesto o su copia, que el sitio no lo remitió a Higiene y Seguridad o que no se cargó; el sistema no permite distinguirlas y se establece con la verificación del punto 2.2.' + (R.hastaPedido > R.hasta ? ' El período elegido termina después de la fecha del informe: los datos llegan hasta el ' + fTxt(R.hasta) + '.' : ''));
    H2('2.2 Protocolo de manifiestos y criterio para el reclamo');
    P_(trelew
      ? 'El manifiesto lo emite la empresa transportista y operadora en el momento del retiro y es la prueba de que los residuos salieron del establecimiento y fueron entregados a la empresa' + notaProt() + '. El protocolo PROT-RES-003, que es el parámetro para los manifiestos de la red Trelew, establece que: (a) no hay retiro sin el operador del sitio presente (regla 1); (b) el operador verifica el manifiesto (sitio, fecha, corriente, cantidad y transportista) y exige la copia del generador (pasos 11 a 19); (c) cada retiro queda anotado en el libro de actas del sitio, una línea por corriente, con fecha, número de manifiesto, bolsas, volumen en dm³ y las firmas del operador y de la empresa (regla 4, pasos 20 a 23); (d) los manifiestos se remiten a Higiene y Seguridad una vez por semana, en sobre cerrado, y no se retienen más de una semana (regla 5, pasos 24 a 29 y punto 10); y (e) Higiene y Seguridad los controla, los coteja con los libros de actas y con los certificados de tratamiento y los archiva por sitio y fecha (paso 30). Desde el 14/10/2026 el Sistema HyS avisa cuando el último manifiesto de un sitio supera los 14 días, una semana de remisión y otra de carga.'
      : 'El manifiesto lo emite la empresa transportista y operadora en el momento del retiro y es la prueba de que los residuos salieron del establecimiento y fueron entregados a la empresa' + MANI + '. El generador conserva la copia que le corresponde y debe registrar cada retiro (fecha, número de manifiesto, corriente y volumen); esos registros son los que se contrastan con los manifiestos cargados en el Sistema HyS.');
    P_('Para atribuir una diferencia a la empresa se requiere descartar antes las demás causas posibles. Cada situación detectada se verifica de la siguiente manera:');
    TAB([['Situación detectada', 'Verificación', 'Si se confirma, corresponde'],
      ['Intervalo mayor que el admisible, con manifiestos cargados antes y después', trelew ? 'Libro de actas del sitio entre ambas fechas (regla 4) y sobre de remisión semanal (pasos 25 a 28)' : 'Registro de retiros del establecimiento y copias del manifiesto entre ambas fechas', 'Sin retiro anotado: retiro no realizado; reclamo a la empresa por la frecuencia del Anexo I, por intermedio de la Secretaría de Salud. Con retiro anotado y sin manifiesto cargado: reclamo de la copia y carga.'],
      ['Sitio sin manifiestos en el período', trelew ? 'Libro de actas, consulta al operador y a la coordinación del sitio, y a la empresa por los manifiestos emitidos' : 'Registro de retiros, consulta a la coordinación del sitio y a la empresa por los manifiestos emitidos', 'Sin retiros anotados: retiro no realizado (reclamo). Con retiros anotados: reclamo de las copias a la empresa y recordatorio del protocolo al sitio.'],
      ['Manifiesto con datos que no coinciden o sin copia legible', trelew ? 'Pasos 12 a 16 y 18, y punto 9 (situaciones anormales)' : 'Datos del manifiesto contra lo retirado', 'Solicitar a la empresa la corrección o la copia; recordar el procedimiento al sitio.']], [130, 150, 190]);
    P_('Este informe no atribuye la diferencia a una de las partes: señala dónde está y qué evidencia debe contrastarse. Las fechas y los números de manifiesto del punto 4.2 son la base documental del reclamo, que se eleva una vez completada la verificación.');

    // ---------------- 3. DESCRIPCIÓN DE LOS HECHOS
    H1('3. Descripción de los hechos');
    H2('3.1 Retiros por sitio');
    TAB([['Establecimiento · sitio', 'Frecuencia pactada', 'Esperados', 'Realizados', 'Cumplimiento', 'Intervalo prom. / máx. (días)', 'Último retiro']].concat(R.sitios.map(s =>
      [s.nombre === s.sitio ? s.sitio : (R.establecimientos.length > 1 ? s.cod + ' · ' : '') + s.sitio, s.frecuencia + (/deduc/i.test(s.origen) ? ' (deducción)' : ''), s.esperados == null ? 's/d' : num(s.esperados), num(s.retiros), pc(s.cumplimiento),
        s.intervaloProm == null ? '—' : num(s.intervaloProm) + ' / ' + num(s.intervaloMax), s.ultimo ? fTxt(s.ultimo) : 'Sin retiros'])), [105, 75, 57, 57, 62, 64, 55],
      R.sitios.map((s, i) => s.cumplimiento != null && s.cumplimiento < 80 || (!s.retiros && !s.noAplica) ? i + 1 : null).filter(i => i));
    if (R.meses.length > 1) {
      H2('3.2 Retiros por mes');
      const ms = R.meses.slice(-12);
      const MC = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
      TAB([['Sitio'].concat(ms.map(m => MC[Number(m.slice(5, 7)) - 1] + (ms.some(k => k.slice(0, 4) !== ms[0].slice(0, 4)) ? ' ' + m.slice(2, 4) : '')))].concat(R.sitios.map(s => [s.sitio].concat(ms.map(m => s.porMes[m] ? String(s.porMes[m]) : '—')))), [110].concat(ms.map(() => Math.floor(360 / ms.length))));
      if (R.meses.length > 12) G('Se muestran los últimos 12 meses del período; el detalle completo está en el anexo.');
    }

    // ---------------- 3.3 COMPARACIÓN DE LOS ÚLTIMOS 3 AÑOS
    const TA = R.totAnio, cats = AN.map(lblA);
    H2('3.3 Comparación ' + AN[0] + '-' + AN[2] + ': retiros y volumen (dm³)');
    TAB([['Año', 'Retiros del año', 'Retiros hasta el ' + corte, 'dm³ del año', 'dm³ hasta el ' + corte, 'de ellos Y3 (dm³, año)']].concat(TA.map((a, i) => [lblA(a.anio, i), num(a.ret), num(a.retMP), num(a.dm3), num(a.dm3MP), num(a.y3)])), [80, 75, 80, 75, 80, 80]);
    if (R.sitios.length > 1) {
      P_('Por sitio (retiros · dm³ de cada año; el último año llega hasta el ' + fTxt(R.hasta) + '):', { antes: 6 });
      TAB([['Sitio'].concat(AN.map((y, i) => 'Retiros ' + lblA(y, i).replace(' (al ', ' al ').replace(')', ''))).concat(AN.map((y, i) => 'dm³ ' + lblA(y, i).replace(' (al ', ' al ').replace(')', '')))].concat(R.sitios.map(s => [(R.establecimientos.length > 1 ? s.cod + ' · ' : '') + s.sitio].concat(AN.map(y => num(s.anios[y].ret))).concat(AN.map(y => num(s.anios[y].dm3))))), [100].concat([62, 62, 62, 62, 62, 62]));
    }
    const grafico = (titulo, eje, series, colores, apilado) => { try {
      const dt = Charts.newDataTable().addColumn(Charts.ColumnType.STRING, 'Año'); series.forEach(x => dt.addColumn(Charts.ColumnType.NUMBER, x.n)); cats.forEach((c, i) => dt.addRow([c].concat(series.map(x => x.v[i]))));
      let cb = Charts.newColumnChart().setDataTable(dt).setTitle(titulo).setDimensions(470, 240).setColors(colores).setLegendPosition(Charts.Position.BOTTOM).setYAxisTitle(eje); if (apilado) cb = cb.setStacked();
      const ip = b.appendParagraph(''); ip.setAlignment(DocumentApp.HorizontalAlignment.CENTER); ip.appendInlineImage(cb.build().getAs('image/png')); ip.setSpacingAfter(8);
    } catch (e) { G('No se pudo dibujar el gráfico «' + titulo + '» (' + e.message + '): puede armarse con la tabla anterior.'); } };
    grafico('Retiros por año · ' + (R.sitios.length === 1 ? R.sitios[0].sitio : 'sitios incluidos'), 'Retiros (fechas con retiro)', [{ n: 'Retiros', v: TA.map(a => a.ret) }], [COL.AZUL]);
    grafico('Volumen retirado por año (dm³) · ' + (R.sitios.length === 1 ? R.sitios[0].sitio : 'sitios incluidos'), 'dm³', [{ n: 'Y1 · biopatogénicos', v: TA.map(a => a.y1) }, { n: 'Y3 · medicamentos', v: TA.map(a => a.y3) }], [COL.AZUL, COL.ACENTO], true);
    P_('El último año se compara con los anteriores hasta la misma fecha en la segunda columna de la tabla; el gráfico muestra los años completos y el año en curso hasta el ' + fTxt(R.hasta) + '.');

    // ---------------- 3.4 CORRIENTE Y3
    H2('3.4 Residuos Y3 (medicamentos y productos farmacéuticos)');
    TAB([['Sitio', 'Retiros con Y3 (período)', 'dm³ Y3 (período)'].concat(AN.map((y, i) => 'Y3 ' + lblA(y, i).replace(' (al ', ' al ').replace(')', '') + ' (dm³)'))].concat(R.sitios.map(s => [(R.establecimientos.length > 1 ? s.cod + ' · ' : '') + s.sitio, num(s.detalle.filter(d => d.y3).length), s.y3 ? num(s.y3) : 'Sin registro'].concat(AN.map(y => s.anios[y].y3 ? num(s.anios[y].y3) : '—')))), [115, 70, 70, 72, 72, 72],
      R.sitios.map((s, i) => !s.noAplica && !s.y3 ? i + 1 : null).filter(i => i));
    const CP = trelew && R.sitios.some(s => s.tipo === 'CAPS') ? resInfCapac_(R.sitios.filter(s => s.tipo === 'CAPS')) : null;

    // ---------------- 3.5 COSTOS DESDE LA VIGENCIA DEL CONTRATO
    H2('3.5 Costo del volumen retirado desde la vigencia del contrato');
    if (CT.filas.length) {
      P_('Contrato ' + CT.contrato + ' (' + CT.empresa + ')' + notaCont() + '. Se informa desde el ' + fTxt(CT.desde) + ' hasta el ' + fTxt(R.hasta) + '.');
      TAB([['Mes', 'Retiros', 'Volumen (dm³)', 'Precio por dm³', 'Costo estimado']].concat(CT.filas.map(f => [mesTxt(f.mes), num(f.retiros), num(f.dm3), f.precio == null ? 's/d' : mon(f.precio), mon(f.costo)]).concat([['Total', num(CT.retiros), num(CT.dm3), '', mon(CT.total)]])), [110, 70, 90, 100, 100]);
      P_('El costo es una estimación del volumen retirado de los sitios incluidos al precio unitario contratado (IVA incluido). La facturación del contrato se rige por el cupo mensual y su excedente (cláusula SÉPTIMA), que se calculan sobre el conjunto de los establecimientos del contrato y no sobre estos sitios; por eso la cifra es de referencia y no reemplaza a la factura.');
    } else P_('No hay un contrato vigente con precio cargado para el período (Libro general de residuos › CONTRATO_GRUPOS): costo s/d (revisar).');

    // ---------------- 4. ANÁLISIS DE LOS DATOS
    H1('4. Análisis de los datos');
    H2('4.1 Cumplimiento de la frecuencia');
    if (conEsp.length) P_('De los ' + conEsp.length + ' sitios con frecuencia definida, ' + conEsp.filter(s => s.cumplimiento >= 80).length + ' alcanzaron al menos el 80 % de los retiros esperados y ' + bajos.length + ' quedaron por debajo. ' + (bajos.length ? 'Los de menor cumplimiento son ' + bajos.slice().sort((a, b) => a.cumplimiento - b.cumplimiento).slice(0, 5).map(s => s.sitio + ' (' + num(s.retiros) + ' de ' + num(s.esperados) + ')').join(', ') + '.' : ''));
    else P_('Ningún sitio incluido tiene una frecuencia pactada que permita calcular el cumplimiento.');
    const diarias = R.sitios.filter(s => s.sabados && s.sabados.pactados);
    if (diarias.length) P_('Sábados: la frecuencia diaria pactada incluye los sábados. ' + diarias.map(s => s.sitio + ': ' + s.sabados.retirados + ' retiro(s) en ' + s.sabados.pactados + ' sábados del período').join('; ') + '.');
    const enFer = R.sitios.filter(s => s.enFeriado); if (enFer.length) P_('Retiros registrados en un feriado nacional: ' + enFer.map(s => s.sitio + ' (' + s.enFeriado + ')').join(', ') + '. Conviene verificar la fecha cargada.');
    const sd = R.sitios.filter(s => !s.esperados && !s.noAplica), na = R.sitios.filter(s => s.noAplica); if (na.length) P_('Sin retiro por la empresa (frecuencia «no corresponde»): ' + na.map(s => s.sitio).join(', ') + '.'); if (sd.length) P_('Sin frecuencia definida: ' + sd.map(s => s.sitio).join(', ') + '. Para estos sitios se informan solo los retiros realizados.');
    H2('4.2 Intervalos mayores que el admisible');
    const F = []; R.sitios.forEach(s => s.fuera.forEach(f => F.push([s.sitio, fTxt(f.desde) + (f.nrosDesde.length ? ' (N.º ' + f.nrosDesde.join(', ') + ')' : ''), f.abierto ? 'Sin retiro hasta el ' + fTxt(R.hasta) : fTxt(f.hasta) + (f.nrosHasta.length ? ' (N.º ' + f.nrosHasta.join(', ') + ')' : ''), String(f.dias) + (f.fer ? ' (' + f.fer + (f.fer === 1 ? ' feriado' : ' feriados') + ' nacional' + (f.fer === 1 ? '' : 'es') + ')' : ''), String(s.limite)])));
    if (F.length) { P_('Cada fila muestra el retiro anterior y el siguiente, con sus números de manifiesto, y los días transcurridos:'); TAB([['Sitio', 'Retiro anterior', 'Retiro siguiente', 'Días', 'Admisible']].concat(F), [100, 120, 135, 45, 55]); }
    else P_('No se registraron intervalos mayores que el admisible.');
    H2('4.3 Sitios sin retiros en el período');
    P_(sinRet.length ? sinRet.map(s => s.sitio + (R.establecimientos.length > 1 ? ' (' + s.cod + ')' : '')).join(', ') + '. Con los datos del sistema no puede saberse si la empresa no retiró, si no entregó los manifiestos o si el sitio no los remitió o no se cargaron: corresponde verificarlo según el punto 2.2 antes de reclamar.' : 'Todos los sitios incluidos registran retiros en el período.');
    H2('4.4 Residuos Y3 y antecedentes de gestión');
    const sinY3 = R.sitios.filter(s => !s.noAplica && !s.y3), conY3 = R.sitios.filter(s => s.y3);
    P_(conY3.length + ' de los ' + R.sitios.length + ' sitios registran retiros de Y3 en el período' + (conY3.length ? ' (' + conY3.slice(0, 8).map(s => s.sitio + ': ' + num(s.y3) + ' dm³').join('; ') + (conY3.length > 8 ? '; entre otros' : '') + ')' : '') + '.');
    if (sinY3.length) {
      P_('Sin registro de Y3 en el período: ' + sinY3.map(s => s.sitio).join(', ') + '. Un centro de salud con farmacia y prestaciones ambulatorias genera residuos de la corriente Y3 (medicamentos vencidos, deteriorados o sobrantes y productos farmacéuticos)' + notaY3() + ', por lo que debería existir registro de su generación y retiro. La ausencia de registros es un indicio de gestión inadecuada de esta corriente: falta de segregación en origen, de retiro o de documentación, que corresponde subsanar con cada sitio.');
      if (trelew) {
        P_('Desde 2024 el Servicio de Higiene y Seguridad Laboral viene trabajando en la gestión de residuos de los CAPS: la Nota Interna N.º 51/24 (04/04/2024) a la Jefatura de Área Externa solicitó fechas para capacitar en gestión de residuos al personal de todos los CAPS y servicios a su cargo, y se dictaron capacitaciones en gestión de residuos. Recientemente se actualizó el manual general de gestión de residuos de la red Trelew y se elaboró un manual específico para los CAPS (MAN-RES-001 CAPS); además, el Manual de Gestión Integral de Residuos, con las guías y protocolos asociados (GD-RES-001, PROT-RES-001 a 004), existe desde 2023.');
        if (CP && CP.ok) {
          P_('Asistencia a las capacitaciones de gestión de residuos (CAP-HYS-003 y CAP-HYS-020) registrada en el sistema de capacitaciones: ' + num(CP.total) + ' personas con la capacitación aprobada o asistida, de las cuales ' + num(CP.caps) + ' pertenecen a CAPS o Área Externa.');
          TAB([['CAPS', 'Personas capacitadas (registro del sistema)']].concat(R.sitios.filter(s => s.tipo === 'CAPS').map(s => [s.sitio, CP.por[s.sitio] ? num(CP.por[s.sitio]) : 's/d (revisar)'])), [200, 270]);
        }
        G('Completar la asistencia por CAPS: el sistema de capacitaciones registra desde 2026 y no incluye los dictados de 2024 y 2025; cargar o adjuntar las planillas de asistencia de cada CAPS.');
      } else G('Completar los antecedentes del establecimiento: notas enviadas, capacitaciones en gestión de residuos (con asistencia por sitio) y manuales vigentes.');
    }
    H2('4.5 Costos');
    P_(CT.filas.length ? 'Desde el ' + fTxt(CT.desde) + ' se retiraron ' + num(CT.dm3) + ' dm³ en ' + num(CT.retiros) + ' retiros, con un costo estimado de ' + mon(CT.total) + (CT.filas.filter(f => f.dm3).length > 1 ? ' (promedio mensual de ' + mon(Math.round(CT.total / CT.filas.filter(f => f.dm3).length)) + ' en los meses con retiros)' : '') + '. La cifra permite dimensionar lo que representa la prestación para estos sitios; no se proyecta hacia atrás porque las condiciones económicas de los contratos anteriores no son comparables.' : 'No se dispone de precios del contrato vigente para estimar el costo (s/d, revisar).');

    // ---------------- 5. CONCLUSIÓN
    H1('5. Conclusión');
    P_('En el período analizado ' + (T.esperados ? 'la frecuencia de retiro alcanzó el ' + pc(T.cumplimiento) + ' de lo pactado' : 'no puede medirse el cumplimiento por falta de frecuencias definidas') + (T.intervalosFuera ? ', con ' + T.intervalosFuera + (T.intervalosFuera === 1 ? ' intervalo' : ' intervalos') + ' mayores que el admisible' : '') + (sinRet.length ? ' y ' + sinRet.length + (sinRet.length === 1 ? ' sitio' : ' sitios') + ' sin retiros registrados' : '') + '. Los datos surgen de los manifiestos cargados y quedan disponibles con su número para el control de la prestación. Las diferencias con lo pactado se verifican contra el protocolo de manifiestos (punto 2.2) antes de atribuirlas a la empresa o al circuito de remisión.' + (R.sitios.some(s => !s.noAplica && !s.y3) ? ' La falta de registros de residuos Y3 en ' + R.sitios.filter(s => !s.noAplica && !s.y3).length + ' sitios indica una gestión inadecuada de esa corriente.' : ''));
    G('Completar o ajustar: qué significa este resultado para el establecimiento (acopios, espacio, riesgos) y qué cambió respecto del informe anterior.');

    // ---------------- 6. RECOMENDACIONES
    H1('6. Recomendaciones');
    const rec = [];
    if (T.intervalosFuera || bajos.length) rec.push('Verificar los intervalos y los sitios con cumplimiento menor al 80 % contra el libro de actas y los sobres de remisión de cada sitio (punto 2.2) y, confirmados los retiros no realizados, elevar el reclamo a la empresa por intermedio de la Secretaría de Salud, con las fechas y números de manifiesto del punto 4.2, para que se regularice la frecuencia del Anexo I del contrato.');
    if (sinRet.length) rec.push('Verificar con cada sitio sin manifiestos si hubo retiros anotados en el libro de actas; reclamar a la empresa las copias de los manifiestos emitidos y recordar al sitio la remisión semanal.');
    if (R.sitios.some(s => !s.noAplica && !s.y3)) rec.push('Trabajar con cada sitio sin registros de Y3 la segregación y el registro de medicamentos vencidos o sobrantes, reforzar la capacitación en gestión de residuos y registrar la asistencia por sitio.');
    const sabBajos = diarias.filter(s => s.sabados.retirados < s.sabados.pactados / 2);
    if (sabBajos.length) rec.push('Solicitar a la empresa, por intermedio de la Secretaría de Salud, que cumpla los retiros de los sábados previstos para la frecuencia diaria en el Anexo I del contrato (' + sabBajos.map(s => s.sitio).join(', ') + '), o que la frecuencia pactada se ajuste a la que efectivamente se presta.');
    if (sd.length) rec.push('Definir la frecuencia de retiro de los sitios que no la tienen (' + sd.slice(0, 5).map(s => s.sitio).join(', ') + (sd.length > 5 ? ', entre otros' : '') + ') e incorporarla al contrato en la próxima renovación.');
    if (!rec.length) rec.push('Sostener la frecuencia actual y la carga de los manifiestos en el sistema.');
    rec.forEach((t, i) => P_((i + 1) + '. ' + t));
    G('Revisar las recomendaciones: agregar responsables y plazos según el destinatario.');

    // ---------------- CIERRE Y FIRMA
    P_('Quedo a disposición por cualquier consulta, requerimiento o ampliación de lo informado.', { antes: 14 });
    P_('Celular: 2804389910 · Correo electrónico: belenpellegrini.hys@gmail.com', { izq: true, desp: 30 });
    [['Belén Pellegrini', true], ['Licenciada en Higiene, Seguridad y Medio Ambiente del Trabajo', false], ['M.P. LCOHSECH0383', false], ['Servicio de Higiene y Seguridad Laboral', false]]
      .forEach(f => P_(f[0], { neg: f[1], color: f[1] ? COL.AZUL : COL.TEXTO, tam: f[1] ? 10.5 : 9.5, izq: true, desp: 0, inter: 1.2 }));

    // ---------------- ANEXO: detalle de retiros por sitio (fechas exactas y números de manifiesto)
    if (x.detalle !== false) {
      b.appendPageBreak(); H1('Anexo · Detalle de retiros por sitio');
      P_('Fecha de cada retiro, día de la semana, números de manifiesto, volumen y días desde el retiro anterior. En rojo, los intervalos mayores que el admisible.');
      R.sitios.forEach(s => {
        H2(s.sitio + (R.establecimientos.length > 1 && s.nombre !== s.sitio ? ' · ' + s.nombre : '') + ' · ' + s.frecuencia + ' (admisible ' + s.limite + ' días)');
        if (!s.detalle.length) { P_('Sin retiros cargados en el período.'); return; }
        TAB([['Fecha', 'Día', 'N.º de manifiesto', 'Y1 (dm³)', 'Y3 (dm³)', 'Días desde el anterior']].concat(s.detalle.map(d => [fTxt(d.fecha), dia(d.fecha), d.nros.join(', ') || 's/d', d.y1 ? num(d.y1) : '—', d.y3 ? num(d.y3) : '—', d.desdeAnt == null ? '—' : String(d.desdeAnt)])),
          [70, 40, 150, 60, 60, 90], s.detalle.map((d, i) => d.excede ? i + 1 : null).filter(i => i));
      });
    }

    // ---------------- ENCABEZADO Y PIE
    const centrarLogos = sec => { if (!sec) return; const rec = el => { const t = el.getType();
      if (t === DocumentApp.ElementType.PARAGRAPH) { const p = el.asParagraph(); let img = false; for (let i = 0; i < p.getNumChildren(); i++) if (p.getChild(i).getType() === DocumentApp.ElementType.INLINE_IMAGE) img = true; if (img) p.setAlignment(DocumentApp.HorizontalAlignment.CENTER); }
      else if (t === DocumentApp.ElementType.TABLE) { const tb = el.asTable(); for (let i = 0; i < tb.getNumRows(); i++) for (let j = 0; j < tb.getRow(i).getNumCells(); j++) { const c = tb.getRow(i).getCell(j); for (let k = 0; k < c.getNumChildren(); k++) rec(c.getChild(k)); } } };
      for (let i = 0; i < sec.getNumChildren(); i++) rec(sec.getChild(i)); };
    if (deModelo) { try { doc.getFooter().replaceText('\\{\\{CODIGO\\}\\}', codigo); } catch (e) {}
      if (!trelew) { try { doc.getHeader().clear(); } catch (e) {} }   // el logo HZT/HMH del modelo solo va en informes de la red Trelew
      try { centrarLogos(doc.getHeader()); } catch (e) {} try { centrarLogos(doc.getFooter()); } catch (e) {} }   // logos centrados (14.81)
    else try { const pie = doc.addFooter(), p0 = pie.getParagraphs()[0]; p0.setText(codigo); p0.setAttributes(estilo({ tam: 7.5, color: COL.ACENTO })); p0.setAlignment(IZQ);
      const pl = pie.appendParagraph(''); pl.setAlignment(DocumentApp.HorizontalAlignment.CENTER); const img = pl.appendInlineImage(DriveApp.getFileById(RINF.LOGO_PIE).getBlob()), w = 260; img.setHeight(Math.round(img.getHeight() * w / img.getWidth())); img.setWidth(w); } catch (e) {}
    doc.saveAndClose();
  } catch (err) { try { if (doc) DriveApp.getFileById(doc.getId()).setTrashed(true); } catch (e) {} throw err; }
  const notasOk = infNotas_(doc.getId(), notas);
  // El PDF solo se genera si se pide (pdf: true): mientras el informe se revisa, cada corrección regenera el Doc y el PDF gasta créditos de uso
  const pdf = x.pdf ? carpeta.createFile(DriveApp.getFileById(doc.getId()).getAs('application/pdf')).setName(titulo + '.pdf') : null;
  if (!x.prueba) docActualizar_({ codigo: codigo, documento: doc.getUrl(), pdf: pdf ? pdf.getUrl() : '', estado: 'Emitido' });
  return Object.assign(R, { generado: true, codigo: codigo, doc: doc.getUrl(), pdf: pdf ? pdf.getUrl() : '', carpeta: carpeta.getUrl(), notasAlPie: notasOk });
}
