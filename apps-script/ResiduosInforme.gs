/**
 * SISTEMA HyS · MÓDULO 1 · RESIDUOS · INFORME DE FRECUENCIA DE RETIRO (versión 14.26, 13/10/2026)
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
  const g = SpreadsheetApp.openById(CFG.GENERAL), K = rctContratos_(g), C = K.contratos, L = rctRetiros_(g, desde);
  const elegido = {}; sel.forEach(s => { const i = s.indexOf('|'); elegido[s.slice(0, i) + '|' + sinTildes_(s.slice(i + 1))] = s.slice(i + 1); });
  const frecBC = {}, tipoBC = {}; try { pTabla_(pBC_().getSheetByName('SITIOS'), 7).forEach(r => { const k = limpio_(r.v[0]) + '|' + sinTildes_(r.v[1]); frecBC[k] = limpio_(r.v[6]); tipoBC[k] = limpio_(r.v[4]); }); } catch (e) {}
  // Retiros del período agrupados por sitio y fecha (un retiro = una fecha con uno o más manifiestos)
  const S = {};
  Object.keys(elegido).forEach(k => { const i = k.indexOf('|'), cod = k.slice(0, i); S[k] = { cod: cod, nombre: (L.info[cod] || {}).nombre || cod, sitio: elegido[k], tipo: tipoBC[k] || '', dias: {} }; });
  L.retiros.forEach(r => { if (r.fecha > hasta) return; const k = r.cod + '|' + sinTildes_(r.sitio), s = S[k]; if (!s) return; if (!s.tipo && r.tipo) s.tipo = r.tipo;
    const d = s.dias[r.fecha] = s.dias[r.fecha] || { fecha: r.fecha, nros: [], y1: 0, y3: 0, otras: 0, enKg: 0 }; if (r.nro && d.nros.indexOf(r.nro) < 0) d.nros.push(r.nro);
    d.y1 += r.y1; d.y3 += r.y3; d.otras += r.otras; if (r.enKg) d.enKg++; });
  const meses = rctMeses_(desde, hasta), dif = (a, b) => Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 864e5);
  const sitios = Object.keys(S).map(k => {
    const s = S[k], R = Object.keys(s.dias).sort().map(f => s.dias[f]);
    const u = rctUbicar_(C, s.cod, s.sitio, s.tipo, hasta.slice(0, 7)) || {};
    const frec = u.frecuencia && !/^s\/d/i.test(u.frecuencia) ? u.frecuencia : (frecBC[k] || u.frecuencia || 's/d (revisar)');
    const origen = u.frecuencia && !/^s\/d/i.test(u.frecuencia) ? (u.deduccion ? 'Deducción (no figura en el contrato)' : 'Contrato ' + u.contrato) : (frecBC[k] ? 'BASE COMÚN › SITIOS' : 's/d');
    const porMes = rctEsperados_(frec), esperados = porMes ? Math.round(porMes * dPer / 30.4375 * 10) / 10 : null, lim = resLimiteDias_(frec);
    let ant = null; const fuera = [];
    R.forEach(d => { d.desdeAnt = ant ? dif(ant.fecha, d.fecha) : null; d.excede = d.desdeAnt != null && d.desdeAnt > lim; if (d.excede) fuera.push({ desde: ant.fecha, nrosDesde: ant.nros, hasta: d.fecha, nrosHasta: d.nros, dias: d.desdeAnt }); ant = d; });
    const sinRetiroFinal = R.length ? dif(R[R.length - 1].fecha, hasta) : null;
    if (R.length && sinRetiroFinal > lim) fuera.push({ desde: R[R.length - 1].fecha, nrosDesde: R[R.length - 1].nros, hasta: '', nrosHasta: [], dias: sinRetiroFinal, abierto: true });
    const gaps = R.slice(1).map(d => d.desdeAnt), cuenta = {}; R.forEach(d => cuenta[d.fecha.slice(0, 7)] = (cuenta[d.fecha.slice(0, 7)] || 0) + 1);
    return { cod: s.cod, nombre: s.nombre, sitio: s.sitio, tipo: s.tipo || 's/d', frecuencia: frec, noAplica: /no corresponde|no aplica/i.test(sinTildes_(frec)), origen: origen, limite: lim, esperados: esperados,
      retiros: R.length, manifiestos: R.reduce((a, d) => a + d.nros.length, 0), cumplimiento: esperados ? Math.round(100 * R.length / esperados) : null,
      intervaloProm: gaps.length ? Math.round(10 * gaps.reduce((a, b) => a + b, 0) / gaps.length) / 10 : null, intervaloMax: gaps.length ? Math.max.apply(null, gaps) : null,
      primero: R.length ? R[0].fecha : '', ultimo: R.length ? R[R.length - 1].fecha : '', sinRetiroFinal: sinRetiroFinal, fuera: fuera, porMes: cuenta,
      y1: Math.round(R.reduce((a, d) => a + d.y1, 0)), y3: Math.round(R.reduce((a, d) => a + d.y3, 0)), enKg: R.reduce((a, d) => a + d.enKg, 0),
      detalle: R.map(d => ({ fecha: d.fecha, nros: d.nros, y1: Math.round(d.y1), y3: Math.round(d.y3), desdeAnt: d.desdeAnt, excede: d.excede })) };
  }).sort((a, b) => (a.nombre + (a.tipo === 'CAPS' ? 'z' : 'a') + a.sitio).localeCompare(b.nombre + (b.tipo === 'CAPS' ? 'z' : 'a') + b.sitio));
  const ests = Array.from(new Set(sitios.map(s => s.cod))), tot = sitios.reduce((a, s) => a + s.retiros, 0), esp = sitios.filter(s => s.esperados).reduce((a, s) => a + s.esperados, 0);
  return { ok: true, desde: desde, hasta: hasta, hastaPedido: x.hasta, hoy: hoy, dias: dPer, meses: meses, sitios: sitios, establecimientos: ests.map(c => ({ cod: c, nombre: (L.info[c] || {}).nombre || c })),
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

// ------------------------------------------------------------------ Documento (Google Doc + PDF)
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
    ['Resumen ejecutivo', '1. Presentación', '2. Método de trabajo', '3. Descripción de los hechos', '4. Análisis de los datos', '5. Conclusión', '6. Recomendaciones', 'Anexo · Detalle de retiros por sitio'].forEach(t => P_(t, { izq: true, desp: 0, inter: 1.3 }));
    b.appendPageBreak();

    // ---------------- RESUMEN EJECUTIVO (prosa, sin tablas)
    H1('Resumen ejecutivo');
    P_('Entre el ' + fTxt(R.desde) + ' y el ' + fTxt(R.hasta) + ' se registraron ' + num(T.retiros) + ' retiros de residuos peligrosos (' + num(T.manifiestos) + ' manifiestos) en ' + T.conRetiros + ' de los ' + T.sitios + ' sitios incluidos. ' +
      (T.esperados ? 'Según la frecuencia pactada correspondían unos ' + num(T.esperados) + ' retiros en los sitios que la tienen definida, por lo que el cumplimiento fue del ' + pc(T.cumplimiento) + '. ' : 'Ningún sitio incluido tiene una frecuencia pactada que permita calcular los retiros esperados. ') +
      (bajos.length ? (bajos.length === 1 ? 'Un sitio quedó por debajo del 80 %: ' : bajos.length + ' sitios quedaron por debajo del 80 %: ') + bajos.slice(0, 6).map(s => s.sitio + ' (' + pc(s.cumplimiento) + ')').join(', ') + (bajos.length > 6 ? ', entre otros' : '') + '. ' : '') +
      (sinRet.length ? (sinRet.length === 1 ? 'Un sitio no registra retiros en el período: ' : sinRet.length + ' sitios no registran retiros en el período: ') + sinRet.slice(0, 6).map(s => s.sitio).join(', ') + (sinRet.length > 6 ? ', entre otros' : '') + '.' : ''));
    P_(T.intervalosFuera ? 'Se identificaron ' + T.intervalosFuera + (T.intervalosFuera === 1 ? ' intervalo' : ' intervalos') + ' entre retiros mayores que el admisible para la frecuencia de cada sitio, con las fechas y los números de manifiesto que lo acreditan en el punto 4. Se recomienda poner esta información en conocimiento de la empresa prestadora y de la Secretaría de Salud, que gestiona el contrato, para que se regularice la frecuencia.'
      : 'No se identificaron intervalos entre retiros mayores que el admisible para la frecuencia de cada sitio.');
    G('Revisar: uno o dos párrafos en prosa; debe leerse en un minuto.');

    // ---------------- 1. PRESENTACIÓN
    H1('1. Presentación');
    P_('El presente informe se elabora desde el Servicio de Higiene y Seguridad Laboral, en el marco de sus funciones' + COMP + ', a fin de poner en conocimiento de ' + (x.destinatario || 'la superioridad') + ' la frecuencia con que la empresa prestadora retiró los residuos peligrosos en los establecimientos y sitios indicados, y compararla con la frecuencia pactada.');
    P_('El retiro regular evita acopios prolongados en los establecimientos, que aumentan la exposición del personal y de los pacientes y exigen más espacio de almacenamiento transitorio. Cada retiro queda documentado en el manifiesto de transporte' + MANI + ', que es la fuente de este informe.');

    // ---------------- 2. MÉTODO DE TRABAJO
    H1('2. Método de trabajo');
    P_('Se tomaron los manifiestos cargados en el Sistema HyS para el período indicado. Se considera un retiro cada fecha en que la empresa retiró residuos de un sitio, con uno o más manifiestos. Para cada sitio se informa la frecuencia pactada' + ANEXO + ', los retiros esperados en el período, los realizados, el intervalo promedio y el máximo entre retiros, y los intervalos que superan el admisible.');
    TAB([['Frecuencia pactada', 'Retiros esperados por mes', 'Intervalo máximo admisible'], ['Diaria (lunes a sábado)', '26', '3 días'], ['Tres días por semana', '13', '5 días'], ['Dos días por semana', '8,7', '6 días'], ['Semanal', '4,3', '10 días'], ['Quincenal', '2,2', '20 días'], ['Mensual', '1', '40 días'], ['Sin frecuencia definida', 's/d', '30 días (referencia)']], [170, 150, 150]);
    P_('Limitaciones: el informe refleja solo lo cargado en el sistema. Un retiro sin manifiesto cargado no aparece y baja el cumplimiento; por eso, antes de reclamar, conviene verificar con el establecimiento que la carga esté completa.' + (R.hastaPedido > R.hasta ? ' El período elegido termina después de la fecha del informe: los datos llegan hasta el ' + fTxt(R.hasta) + '.' : ''));

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

    // ---------------- 4. ANÁLISIS DE LOS DATOS
    H1('4. Análisis de los datos');
    H2('4.1 Cumplimiento de la frecuencia');
    if (conEsp.length) P_('De los ' + conEsp.length + ' sitios con frecuencia definida, ' + conEsp.filter(s => s.cumplimiento >= 80).length + ' alcanzaron al menos el 80 % de los retiros esperados y ' + bajos.length + ' quedaron por debajo. ' + (bajos.length ? 'Los de menor cumplimiento son ' + bajos.slice().sort((a, b) => a.cumplimiento - b.cumplimiento).slice(0, 5).map(s => s.sitio + ' (' + num(s.retiros) + ' de ' + num(s.esperados) + ')').join(', ') + '.' : ''));
    else P_('Ningún sitio incluido tiene una frecuencia pactada que permita calcular el cumplimiento.');
    const sd = R.sitios.filter(s => !s.esperados && !s.noAplica), na = R.sitios.filter(s => s.noAplica); if (na.length) P_('Sin retiro por la empresa (frecuencia «no corresponde»): ' + na.map(s => s.sitio).join(', ') + '.'); if (sd.length) P_('Sin frecuencia definida: ' + sd.map(s => s.sitio).join(', ') + '. Para estos sitios se informan solo los retiros realizados.');
    H2('4.2 Intervalos mayores que el admisible');
    const F = []; R.sitios.forEach(s => s.fuera.forEach(f => F.push([s.sitio, fTxt(f.desde) + (f.nrosDesde.length ? ' (N.º ' + f.nrosDesde.join(', ') + ')' : ''), f.abierto ? 'Sin retiro hasta el ' + fTxt(R.hasta) : fTxt(f.hasta) + (f.nrosHasta.length ? ' (N.º ' + f.nrosHasta.join(', ') + ')' : ''), String(f.dias), String(s.limite)])));
    if (F.length) { P_('Cada fila muestra el retiro anterior y el siguiente, con sus números de manifiesto, y los días transcurridos:'); TAB([['Sitio', 'Retiro anterior', 'Retiro siguiente', 'Días', 'Admisible']].concat(F), [100, 120, 135, 45, 55]); }
    else P_('No se registraron intervalos mayores que el admisible.');
    H2('4.3 Sitios sin retiros en el período');
    P_(sinRet.length ? sinRet.map(s => s.sitio + (R.establecimientos.length > 1 ? ' (' + s.cod + ')' : '')).join(', ') + '. Puede tratarse de falta de retiro o de manifiestos no cargados: corresponde verificarlo con el establecimiento.' : 'Todos los sitios incluidos registran retiros en el período.');

    // ---------------- 5. CONCLUSIÓN
    H1('5. Conclusión');
    P_('En el período analizado ' + (T.esperados ? 'la frecuencia de retiro alcanzó el ' + pc(T.cumplimiento) + ' de lo pactado' : 'no puede medirse el cumplimiento por falta de frecuencias definidas') + (T.intervalosFuera ? ', con ' + T.intervalosFuera + (T.intervalosFuera === 1 ? ' intervalo' : ' intervalos') + ' mayores que el admisible' : '') + (sinRet.length ? ' y ' + sinRet.length + (sinRet.length === 1 ? ' sitio' : ' sitios') + ' sin retiros registrados' : '') + '. Los datos surgen de los manifiestos cargados y quedan disponibles con su número para el control de la prestación.');
    G('Completar o ajustar: qué significa este resultado para el establecimiento (acopios, espacio, riesgos) y qué cambió respecto del informe anterior.');

    // ---------------- 6. RECOMENDACIONES
    H1('6. Recomendaciones');
    const rec = [];
    if (T.intervalosFuera || bajos.length) rec.push('Poner en conocimiento de la empresa prestadora y de la Secretaría de Salud los intervalos y sitios con cumplimiento menor al 80 %, con las fechas y números de manifiesto del punto 4, y solicitar que se regularice la frecuencia del Anexo I del contrato.');
    if (sinRet.length) rec.push('Verificar con cada establecimiento si los sitios sin retiros no tuvieron retiro o si faltan cargar manifiestos, y completar la carga.');
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
    if (deModelo) { try { doc.getFooter().replaceText('\\{\\{CODIGO\\}\\}', codigo); } catch (e) {}
      if (!trelew) { try { doc.getHeader().clear(); } catch (e) {} } }   // el logo HZT/HMH del modelo solo va en informes de la red Trelew
    else try { const pie = doc.addFooter(), p0 = pie.getParagraphs()[0]; p0.setText(codigo); p0.setAttributes(estilo({ tam: 7.5, color: COL.ACENTO })); p0.setAlignment(IZQ);
      const pl = pie.appendParagraph(''); pl.setAlignment(DocumentApp.HorizontalAlignment.CENTER); const img = pl.appendInlineImage(DriveApp.getFileById(RINF.LOGO_PIE).getBlob()), w = 260; img.setHeight(Math.round(img.getHeight() * w / img.getWidth())); img.setWidth(w); } catch (e) {}
    doc.saveAndClose();
  } catch (err) { try { if (doc) DriveApp.getFileById(doc.getId()).setTrashed(true); } catch (e) {} throw err; }
  const notasOk = infNotas_(doc.getId(), notas);
  const pdf = carpeta.createFile(DriveApp.getFileById(doc.getId()).getAs('application/pdf')).setName(titulo + '.pdf');
  if (!x.prueba) docActualizar_({ codigo: codigo, documento: doc.getUrl(), pdf: pdf.getUrl(), estado: 'Emitido' });
  return Object.assign(R, { generado: true, codigo: codigo, doc: doc.getUrl(), pdf: pdf.getUrl(), carpeta: carpeta.getUrl(), notasAlPie: notasOk });
}
