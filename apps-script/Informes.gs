/**
 * SISTEMA HyS · INFORME DE DIAGNÓSTICO DE RESIDUOS (etapa 3)
 * Genera un Google Doc editable + PDF a partir de un diagnóstico CERRADO, con el modelo aprobado:
 *   Resumen ejecutivo · 1 Presentación · 2 Método de trabajo · 3 Descripción de hechos · 4 Análisis de los datos
 *   · 5 Conclusión y recomendaciones · cierre sin numerar · firma · anexos A a D.
 * Todo se lee de las planillas (nada fijo en el código):
 *   BASE COMÚN › CONFIG_INFORMES, NORMATIVA, TIPOS_ACCION, TEXTOS_SITUACION · DIAGNÓSTICO › ITEMS (acciones, costos, referencias)
 * Numeración automática (Documentos.gs): HYSL-[est]-RES-DG-[año]-[N.º], registrada como «Emitido» con los enlaces.
 * Notas al pie: con el servicio avanzado «Google Docs API» activado (Servicios › +). Sin él, quedan como referencias numeradas al final.
 */

const INF2 = { AZUL: '#0D313F', PATA: '#5894A7', GRIS: '#E4EAED', CLARO: '#F4F7F8', TEXTO: '#3A4950', GRIS_TXT: '#5F7480', FUENTE: 'Plus Jakarta Sans', MAX_FOTOS_CUERPO: 4, MAX_FOTOS: 24 };
const pc = n => String(n).replace('.', ',');
const minus = s => { s = String(s || ''); return /^[A-ZÁÉÍÓÚÑ]{2}/.test(s) ? s : s.charAt(0).toLowerCase() + s.slice(1); };
const lista = a => a.length <= 1 ? a.join('') : a.slice(0, -1).join(', ') + ' y ' + a[a.length - 1];
const Q_NOMBRE = { Q1: 'Actuar ya', Q3: 'Resolver rápido', Q2: 'Planificar', Q4: 'Monitorear' };

// ------------------------------------------------------------------ Lectura de configuración
function infTabla_(hoja) {
  const sh = pBC_().getSheetByName(hoja); if (!sh || sh.getLastRow() < 6) return { h: [], v: [] };
  const h = sh.getRange(5, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
  return { h: h, v: sh.getRange(6, 1, sh.getLastRow() - 5, h.length).getValues().filter(r => r[0] !== '') };
}
function infConfig_(cod) {   // cod: aplica las claves «CLAVE@COD» de CONFIG_INFORMES (encabezado, cargo, contacto del hospital)
  CacheService.getScriptCache().remove('cfg_inf');
  const C = configInformes_(cod);
  const N = {}; infTabla_('NORMATIVA').v.forEach(r => { if (r[1]) N[String(r[1]).trim()] = String(r[2]).trim(); });
  const T = {}; const tt = infTabla_('TIPOS_ACCION'); tt.v.forEach(r => { const o = {}; tt.h.forEach((k, i) => o[k] = String(r[i])); T[o.TIPO] = o; });
  const X = {}; infTabla_('TEXTOS_SITUACION').v.forEach(r => X[String(r[0]).trim()] = { A: String(r[1]), B: String(r[2]), C: String(r[3]) });
  const num = (k, d) => Number(C[k]) || d;
  return { C: C, N: N, T: T, X: X, plazo: { Q1: num('PLAZO_ACTUAR_YA', 30), Q3: num('PLAZO_RESOLVER_RAPIDO', 90), Q2: num('PLAZO_PLANIFICAR', 180) }, resp: num('PLAZO_RESPUESTA', 30) };
}
const infTxt_ = (X, parte, esc) => { const r = X[parte]; return r ? (r[esc] || r.A || '') : ''; };

// Escenario de HySL del establecimiento: A con HySL propio (o cabecera) · B con referente · C sin nadie
function infEscenario_(R, cod) {
  const r = R.find(x => x.item === 'PER10' && !x.sitio), v = r ? String(r.valor || '') : '';
  if (/propio/i.test(v)) return { esc: 'A', cabecera: false };
  if (/cabecera/i.test(v)) return { esc: 'A', cabecera: true };
  if (/referente/i.test(v)) return { esc: 'B' };
  if (/nadie/i.test(v)) return { esc: 'C' };
  const e = pTabla_(pBC_().getSheetByName('ESTABLECIMIENTOS'), 14).find(x => limpio_(x.v[0]) === cod);
  return { esc: e && /profesional/i.test(String(e.v[13])) ? 'A' : 'B' };
}

// ------------------------------------------------------------------ Datos del informe
function infDatos_(cod, id) {
  let D = pDiagAbrir_(cod, id || '');
  if (D.ok && (!D.actual || D.actual.ESTADO !== 'Cerrado') && D.previo) D = pDiagAbrir_(cod, D.previo.ID_DIAG);
  if (!D.ok || !D.actual) return { ok: false, mensaje: 'No hay un diagnóstico de este establecimiento.' };
  if (D.actual.ESTADO !== 'Cerrado') return { ok: false, mensaje: 'El informe se genera solo desde un diagnóstico cerrado.' };
  const items = D.items, porId = {}; items.forEach(i => porId[i.ID] = i);
  const R = D.respuestas.filter(r => porId[r.item] && diagAplica_(porId[r.item], D.respuestas, r.sitio, porId)), calc = pDiagCalcular_(items, R);
  const hall = [];
  R.forEach(r => {
    const it = porId[r.item], v = pDiagValor_(it, { resp: r.resp, valor: r.valor }); if (v == null) return;
    const nivel = it.TIPO === 'ESCALA' ? pNivel_(r.valor) : null;
    const grav = it.TIPO === 'CPN' ? (r.resp === 'No cumple' ? 1 : r.resp === 'Parcial' ? 0.5 : 0) : (nivel <= 3 ? 1 - v : 0);
    if (grav) hall.push({ it: it, r: r, grav: grav, q: pDiagCuadrante_(it, grav >= 1 || (it.TIPO === 'ESCALA' && nivel <= 2) ? 1 : grav) });
  });
  // Puntos descriptivos que también son oportunidad de mejora (hoja ITEMS › MEJORA_SI)
  R.forEach(r => { const it = porId[r.item]; if (!it || !it.MEJORA_SI || !r.valor) return;
    const malas = String(it.MEJORA_SI).split('|').map(s => s.trim()), elegidas = String(r.valor).split('|').filter(v => malas.indexOf(v) >= 0);
    if (elegidas.length) hall.push({ it: it, r: Object.assign({}, r, { resp: elegidas.join(', ') }), grav: 1, q: pDiagCuadrante_(it, 1), detalle: it.TIPO === 'MULTI' ? elegidas.join(', ') : '' }); });
  const orden = { Q1: 1, Q3: 2, Q2: 3, Q4: 4 };
  hall.sort((a, b) => orden[a.q] - orden[b.q] || b.grav - a.grav);
  const E = est_(cod) || {}, esc = infEscenario_(R, cod);
  return { ok: true, D: D, A: D.actual, items: items, porId: porId, R: R, calc: calc, hall: hall, E: E, esc: esc, cod: cod };
}

// Recomendaciones (una por punto; si se repite en varios lugares, se agrupa)
function infRecomendaciones_(X, cfg) {
  const vistos = {}, recs = [];
  X.hall.forEach(h => {
    const k = h.it.ID; if (vistos[k]) { vistos[k].lugares.push(h.r.sitio || 'Establecimiento'); return; }
    const rec = { h: h, lugares: [h.r.sitio || 'Establecimiento'] }; vistos[k] = rec; recs.push(rec);
  });
  if (X.esc.esc === 'C') { const it = X.porId.PER10; recs.push({ h: { it: Object.assign({}, it || {}, { ID: 'PER10', ACCION: 'Designar un referente de residuos del establecimiento.', TIPO_ACCION: 'Gestión', COSTO: 'Sin costo', REFERENCIA: 'Res. SRT 905/2015' }), q: 'Q3', r: { sitio: '' } }, lugares: ['Establecimiento'] }); }
  recs.forEach((p, i) => {
    const it = p.h.it, tipo = it.TIPO_ACCION || 'Gestión', tecnico = /capacitaci|procedim/i.test(tipo);
    p.n = 'R-' + ('0' + (i + 1)).slice(-2);
    p.accion = (it.ACCION || ('Mejorar: ' + it.ITEM)) + (p.h.detalle ? ' (' + p.h.detalle + ')' : '');
    p.costo = it.COSTO || 's/d';
    p.prioridad = Q_NOMBRE[p.h.q];
    if (tecnico && X.esc.esc === 'A') { p.cargo = X.esc.cabecera ? 'Servicio de HySL del hospital cabecera' : 'Servicio de HySL del establecimiento'; p.plazo = 'Según planificación del servicio'; }
    else { p.cargo = tecnico ? 'Referencia Provincial' : ((cfg.T[tipo] || {}).EJECUTOR || 'Dirección'); p.plazo = cfg.plazo[p.h.q] ? cfg.plazo[p.h.q] + ' días' : 'Próximo diagnóstico'; }
    p.lugar = Array.from(new Set(p.lugares)).join(', ');
  });
  return recs;
}

// ------------------------------------------------------------------ Generación
function informeDiag_(x) {
  const X = infDatos_(limpio_(x.cod), x.id); if (!X.ok) return X;
  if (lbEsLineaBase_(X.R)) return informeLB_(X, x); // cuestionario de línea de base (oct 2026)
  if (!X.E.carpeta) return { ok: false, mensaje: 'El establecimiento no tiene carpeta en el sistema.' };
  if (!X.calc.n) return { ok: false, mensaje: 'El diagnóstico no tiene puntos evaluados: completalo antes de generar el informe.' };
  const cfg = infConfig_(X.cod || limpio_(x.cod)), C = cfg.C, A = X.A;
  const recs = infRecomendaciones_(X, cfg);
  // Número: se reutiliza si el diagnóstico ya tenía informe (nueva revisión); si no, se pide uno nuevo
  const prev = pInformesDiag_(A.ID_DIAG); let codigo, revision = 0;
  if (prev.length) { codigo = prev[0].codigo; if (prev[0].doc) { const m = /Revisión (\d+)/.exec(String(prev[0].obs || '')); revision = m ? Number(m[1]) + 1 : 1; } }
  else { const n = docNumero_({ est: X.cod, bloque: 'RES', tipo: 'DG', asunto: 'Diagnóstico de gestión de residuos', origen: 'Sistema', idOrigen: A.ID_DIAG, pedidoPor: Session.getActiveUser().getEmail() }); if (!n.ok) return n; codigo = n.codigo; }
  const hoy = Utilities.formatDate(new Date(), TZ, 'dd/MM/yyyy'), fRel = String(A.FECHA).slice(0, 10).split('-').reverse().join('/');
  const nombre = X.E.nombre || X.cod;

  const carpeta = carpeta_(DriveApp.getFolderById(X.E.carpeta), 'Informes');
  let doc; const notas = [];
  try {
  const titulo = codigo + (revision ? ' · Rev. ' + revision : '') + ' · Diagnóstico de gestión de residuos · ' + nombre;
  const plantilla = (/[-\w]{25,}/.exec(C.PLANTILLA_INFORME || '') || [])[0];
  if (plantilla) { doc = DocumentApp.openById(DriveApp.getFileById(plantilla).makeCopy(titulo, carpeta).getId()); }
  else { doc = DocumentApp.create(titulo); DriveApp.getFileById(doc.getId()).moveTo(carpeta); }
  const b = doc.getBody(); b.clear();
  b.setPageWidth(595.3).setPageHeight(841.9).setMarginTop(60).setMarginBottom(56).setMarginLeft(62).setMarginRight(57);
  const base = {}; base[DocumentApp.Attribute.FONT_FAMILY] = INF2.FUENTE; base[DocumentApp.Attribute.FONT_SIZE] = 10.5; base[DocumentApp.Attribute.FOREGROUND_COLOR] = INF2.TEXTO; b.setAttributes(base);

  // Encabezado formato D (tabla de control documental) y pie
  const enc = doc.getHeader() || doc.addHeader();
  const te = enc.appendTable([[' ', 'x', 'x'], [' ', 'x', 'x']]);
  te.setBorderColor('#C9D6DB').setBorderWidth(0.5);
  infCelda_(te.getCell(0, 0), C.LOGO_URL ? '' : 'HySL', 12, INF2.AZUL, true, 70); infCelda_(te.getCell(1, 0), '', 8, INF2.PATA, false, 70);
  infCelda_(te.getCell(0, 1), 'Diagnóstico de gestión de residuos', 10, INF2.AZUL, true, 250); infCelda_(te.getCell(1, 1), C.ENCABEZADO_LINEA2 || '', 7.5, INF2.PATA, false, 250);
  infCelda_(te.getCell(0, 2), 'Código: ' + codigo, 8, INF2.AZUL, false, 156); infCelda_(te.getCell(1, 2), 'Emisión: ' + hoy + ' · Revisión: ' + revision, 8, INF2.AZUL, false, 156);
  if (C.LOGO_URL) try { const idL = (/[-\w]{25,}/.exec(C.LOGO_URL) || [])[0]; const im = te.getCell(0, 0).getChild(0).asParagraph().appendInlineImage(DriveApp.getFileById(idL).getBlob()); const k = 40 / im.getHeight(); im.setHeight(40).setWidth(Math.round(im.getWidth() * k)); } catch (e) {}
  if (enc.getNumChildren() > 1 && enc.getChild(0).getType() === DocumentApp.ElementType.PARAGRAPH && enc.getChild(0).asParagraph().getText() === '') enc.removeChild(enc.getChild(0));
  const pie = doc.getFooter();
  if (pie && pie.getText().indexOf('{{CODIGO}}') >= 0) pie.replaceText('\\{\\{CODIGO\\}\\}', codigo);
  else { const pf = doc.addFooter(); infEst_(pf.appendParagraph(codigo), 7.5, INF2.PATA, false); }

  // Notas al pie: se insertan como marcas y después se convierten (ver infNotas_)
  const yaNota = {};
  const nota = (clave, texto) => { if (!texto) return ''; if (yaNota[clave]) return ''; notas.push(texto); yaNota[clave] = notas.length; return '[[NOTA' + notas.length + ']]'; };
  const normaDe = cita => cfg.N[cita] || cita;

  const P = (t, o) => { o = o || {}; const p = b.appendParagraph(t || ''); infEst_(p, o.tam || 10.5, o.color || INF2.TEXTO, o.neg); p.setAlignment(o.izq ? DocumentApp.HorizontalAlignment.LEFT : DocumentApp.HorizontalAlignment.JUSTIFY).setLineSpacing(o.inter || 1.5).setSpacingAfter(o.desp == null ? 6 : o.desp).setSpacingBefore(o.antes || 0); return p; };
  const H2 = t => { const p = b.appendParagraph(t); p.setHeading(DocumentApp.ParagraphHeading.HEADING2); infEst_(p, 13, INF2.AZUL, true); p.setSpacingBefore(16).setSpacingAfter(6).setLineSpacing(1.15); return p; };
  const H3 = t => { const p = b.appendParagraph(t); p.setHeading(DocumentApp.ParagraphHeading.HEADING3); infEst_(p, 11, INF2.AZUL, true); p.setSpacingBefore(10).setSpacingAfter(4).setLineSpacing(1.15); return p; };
  const TAB = (filas, anchos) => infTabla2_(b, filas, anchos);

  const esc = X.esc.esc, calc = X.calc;
  const lugares = ['Establecimiento'].concat(X.D.sitios.map(s => s.sitio)).filter(s => X.R.some(r => (r.sitio || 'Establecimiento') === s));
  const secPct = Object.keys(calc.porSeccion).filter(s => !/^A ·|^0 ·|^Z ·/.test(s)).map(s => [s, calc.porSeccion[s]]).sort((a, b) => b[1] - a[1]);
  const q1 = X.hall.filter(h => h.q === 'Q1');

  // ---------------- PÁGINA 1 · RESUMEN EJECUTIVO
  P('INFORME TÉCNICO', { tam: 8.5, color: INF2.PATA, neg: true, desp: 2, izq: true, inter: 1.1 });
  P('Diagnóstico de gestión de residuos', { tam: 20, color: INF2.AZUL, neg: true, desp: 2, izq: true, inter: 1.1 });
  P(nombre + (X.D.sitios.length > 1 ? ' y sitios dependientes' : ''), { tam: 13, color: INF2.AZUL, neg: true, desp: 4, izq: true, inter: 1.1 });
  P('Destinatario: Dirección del establecimiento · Relevamiento: ' + fRel + ' · Emisión: ' + hoy, { tam: 8.5, color: INF2.PATA, desp: 10, izq: true, inter: 1.1 });
  if (C.MODO_LOCAL === 'Sí') P('Desde el Servicio de Higiene y Seguridad Laboral y en el marco de sus competencias' + nota('competencias', C.NOTA_COMPETENCIAS || 'Ley 19.587; Decreto 351/79; Res. SRT 905/2015.') + ', se remite el diagnóstico de la gestión de residuos del establecimiento.');
    else P('En carácter de ' + (C.CARGO || 'Referente Provincial de Seguridad e Higiene Sanitaria') + nota('designacion', 'Designación: ' + (C.DESIGNACION_INSTRUMENTO || 's/d') + '. ' + normaDe('Línea 8') + '.') +
    ' y en el marco de las competencias de Higiene y Seguridad Laboral' + nota('competencias', C.NOTA_COMPETENCIAS || 'Ley 19.587; Decreto 351/79; Res. SRT 905/2015.') +
    ', se remite el diagnóstico de la gestión de residuos del establecimiento, realizado como parte del relevamiento provincial de la red de salud.');
  H3('Resumen ejecutivo');
  const fuertes = secPct.filter(s => s[1] >= 60).slice(0, 2).map(s => minus(s[0].replace(/^[A-Z] · /, '')));
  const debiles = secPct.filter(s => s[1] < 60).slice(-2).reverse().map(s => minus(s[0].replace(/^[A-Z] · /, '')));
  const q1txt = q1.slice(0, 3).map(h => minus(h.it.ITEM) + (h.r.sitio ? ' (' + h.r.sitio + ')' : ''));
  const exp = q1.some(h => /COR|CAR07|PER01|DFI|MAT02|TAC06/.test(h.it.ID));
  P('El relevamiento realizado el ' + fRel + ' en ' + (lugares.length > 1 ? lugares.length - 1 + ' lugar(es) del establecimiento' : 'el establecimiento') + ' muestra ' + (fuertes.length ? 'sus mejores resultados en ' + lista(fuertes) : 'una base de gestión en desarrollo') +
    '. El cumplimiento general es del ' + (calc.pct === '' ? 's/d' : pc(calc.pct) + ' %') + (calc.msn !== '' ? ' (matriz nacional: ' + String(calc.msn).replace('.', ',') + ' sobre 6)' : '') + '. ' +
    (debiles.length ? 'Las brechas principales se concentran en ' + lista(debiles) + (q1txt.length ? '; entre ellas: ' + q1txt.join('; ') : '') + '.' : (q1txt.length ? 'Las situaciones que requieren atención prioritaria son: ' + q1txt.join('; ') + '.' : 'No se registraron situaciones de atención prioritaria.')) +
    (exp ? ' Estas situaciones exponen al personal a accidentes con material biológico, que generan licencias y reemplazos difíciles de cubrir.' : ''));
  const r1 = recs.filter(p => p.h.q === 'Q1'), r1b = r1.filter(p => /sin costo|bajo|stock/i.test(p.costo)).length, rr = recs.length - r1.length;
  P('Se proponen ' + r1.length + ' medida(s) prioritaria(s) para los próximos ' + cfg.plazo.Q1 + ' días' + (r1.length ? ', ' + r1b + ' de ellas sin costo, de bajo costo o con recursos existentes' : '') + (rr ? ', y ' + rr + ' mejora(s) a ' + cfg.plazo.Q3 + ' y ' + cfg.plazo.Q2 + ' días que pueden incorporarse en forma gradual' : '') +
    '. Para el seguimiento, se solicita informar dentro de los ' + cfg.resp + ' días el responsable y la fecha prevista de cada recomendación; queda abierta además la posibilidad de una reunión para ajustar el plan a las posibilidades del establecimiento.');
  b.appendPageBreak();

  // ---------------- 1. PRESENTACIÓN
  H2('1. Presentación');
  P('La Secretaría de Salud de la Provincia del Chubut incorporó en su plan provincial la línea «Seguridad e higiene sanitaria», orientada a proteger al equipo de salud y a los pacientes frente a los riesgos biológicos, químicos y físicos de la atención. Una de sus metas es relevar las principales problemáticas de la red para elaborar un plan de abordaje común; la gestión de residuos es el primer eje de ese relevamiento.');
  P('La gestión de residuos en un establecimiento de salud es, ante todo, una condición de trabajo. Quienes generan, separan, trasladan y almacenan los residuos están expuestos a riesgo biológico, a lesiones con elementos cortopunzantes, a sustancias químicas y a sobreesfuerzos; por eso la normativa asigna a Higiene y Seguridad la identificación de estos riesgos, la propuesta de medidas preventivas, la capacitación del personal y el seguimiento de su cumplimiento' +
    nota('funciones', 'Ley 19.587, arts. 4 y 5; Decreto 351/79; Res. SRT 905/2015, funciones de los servicios de Higiene y Seguridad en el Trabajo.') + '. Una gestión deficiente se traduce en accidentes y exposiciones del personal' + nota('lrt', normaDe('Ley 24.557') + '; ' + normaDe('Ley XXII N.º 50 (APPC)') + '.') +
    ', en riesgo para pacientes y visitantes, en contaminación ambiental y en incumplimientos de la normativa provincial que regula a los establecimientos como generadores' + nota('prov', normaDe('Ley XI N.º 35') + '; ' + normaDe('Dto. 1675/93') + '.') + '.');
  P((C.TEXTO_CALIDAD || '') + ' ' + infTxt_(cfg.X, 'Presentación · último párrafo', esc).replace(/Servicio de Higiene y Seguridad del establecimiento/, X.esc.cabecera ? 'Servicio de Higiene y Seguridad del hospital cabecera' : 'Servicio de Higiene y Seguridad del establecimiento'));

  // ---------------- 2. MÉTODO DE TRABAJO
  H2('2. Método de trabajo');
  H3('2.1 Fuentes de información');
  const quien = A.RELEVADO_POR || 's/d', modal = A.MODALIDAD || 's/d';
  TAB([['Fuente', 'Qué aporta', 'Fecha'],
    [modal + (quien !== 's/d' ? ' (' + quien + ')' : ''), 'Observación de sectores, tachos, carros y depósitos; registro fotográfico', fRel],
    ['Manifiestos y certificados', 'Sistema provincial de manifiestos de residuos', 'Últimos 12 meses'],
    ['Registro de capacitaciones', 'Personal capacitado en gestión de residuos', 'Últimos 12 meses'],
    ['Base de trabajadores', 'Personal activo por sector', Utilities.formatDate(new Date(), TZ, 'MM/yyyy')]], [150, 250, 70]);
  H3('2.2 Instrumento y criterios');
  P('Se utilizó la lista de verificación del diagnóstico provincial, que integra los veinte criterios de la matriz nacional de evaluación (escala de 0 a 6)' + nota('Matriz nacional MSN', normaDe('Matriz nacional MSN') + '.') + ' y los requisitos de las directrices nacionales' + nota('Res. MSN 134/2016', normaDe('Res. MSN 134/2016') + '.') +
    ' y de la normativa provincial. Cada punto se valoró como cumple (1), cumple parcialmente (0,5) o no cumple (0); los que no aplican no se consideran. La prioridad de cada recomendación surge de la urgencia y la importancia del problema (anexo C).');
  H3('2.3 Lugares relevados');
  P(lugares.map(s => s === 'Establecimiento' ? nombre + ' (puntos generales)' : s).join(' · ') + '.');

  // ---------------- 3. DESCRIPCIÓN DE HECHOS
  H2('3. Descripción de hechos');
  P({ A: 'Según lo relevado por el Servicio de Higiene y Seguridad del establecimiento, ', B: 'Según lo informado por el referente de residuos del establecimiento, ', C: 'Según lo observado en el relevamiento, ' }[esc] + 'se describe la situación encontrada por etapa de la gestión, sin valoración normativa.');
  const secciones = Array.from(new Set(X.items.map(i => i.SECCION))).filter(s => !/^A ·|^Z ·/.test(s));
  let nSec = 0;
  secciones.forEach(sec => {
    const its = X.items.filter(i => i.SECCION === sec), lineas = [];
    ['Establecimiento'].concat(X.D.sitios.map(s => s.sitio)).forEach(lug => {
      const rs = X.R.filter(r => (r.sitio || 'Establecimiento') === lug && r.item !== 'PER10' && its.some(i => i.ID === r.item));
      const partes = [];
      rs.forEach(r => { const it = X.porId[r.item];
        if (/LISTA|MULTI|TEXTO|NUMERO/.test(it.TIPO) && r.valor) partes.push(it.ITEM.replace(/^¿|\?$/g, '') + ': ' + minus(String(r.valor).split('|').join(', ')));
        if (r.obs) partes.push(r.obs); });
      if (partes.length) lineas.push((lug === 'Establecimiento' ? '' : lug + ': ') + partes.join('; ') + '.');
    });
    if (!lineas.length) return;
    nSec++; H3('3.' + nSec + ' ' + sec.replace(/^[0-9A-Z] · /, ''));
    lineas.forEach(l => P(l.charAt(0).toUpperCase() + l.slice(1)));
  });
  const fotosCrit = []; X.hall.filter(h => h.it.CRITICO === 'Sí').forEach(h => (h.r.fotos || []).forEach(u => fotosCrit.push({ u: u, h: h })));
  infFotos_(b, fotosCrit.slice(0, INF2.MAX_FOTOS_CUERPO), 1, X.porId);

  // ---------------- 4. ANÁLISIS DE LOS DATOS
  H2('4. Análisis de los datos');
  H3('4.1 Resultado general y por lugar');
  const filasL = [['Lugar', 'Puntos evaluados', 'Cumplimiento'], ['Total', String(calc.n), calc.pct === '' ? 's/d' : pc(calc.pct) + ' %']];
  lugares.forEach(l => { const c = pDiagCalcular_(X.items, X.R.filter(r => (r.sitio || 'Establecimiento') === l)); if (c.n) filasL.push([l === 'Establecimiento' ? 'Puntos generales del establecimiento' : l, String(c.n), pc(c.pct) + ' %']); });
  TAB(filasL, [270, 100, 100]);
  H3('4.2 Resultado por etapa de la gestión');
  TAB([['Etapa', 'Cumplimiento']].concat(Object.keys(calc.porSeccion).filter(s => !/^Z ·/.test(s)).map(s => [s.replace(/^[0-9A-Z] · /, ''), pc(calc.porSeccion[s]) + ' %'])), [340, 130]);
  H3('4.3 Matriz nacional');
  P('Resultado: ' + (calc.msn === '' ? 's/d' : String(calc.msn).replace('.', ',') + ' sobre 6') + '. El detalle de los criterios se incluye en el anexo B.');
  H3('4.4 Fortalezas (a sostener)');
  const fortalezas = X.R.filter(r => r.resp === 'Cumple' && X.porId[r.item] && Number(X.porId[r.item].PESO) >= 2).map(r => minus(X.porId[r.item].ITEM));
  P(fortalezas.length ? (s => s.charAt(0).toUpperCase() + s.slice(1))(Array.from(new Set(fortalezas)).slice(0, 10).join('; ')) + '.' : 'No se registraron puntos de peso alto con cumplimiento total.');
  H3('4.5 Brechas respecto de la normativa');
  P('Requisitos no cumplidos o cumplidos parcialmente, con la norma de referencia. Los puntos críticos se indican con (crítico).');
  const filasB = [['Requisito', 'Lugar', 'Situación', 'Referencia', 'Prioridad']];
  X.hall.forEach(h => {
    const refs = String(h.it.REFERENCIA || '').split(' · ').map(s => s.trim()).filter(Boolean);
    const refTxt = refs.map(r => { const base = r.replace(/\s*\(.*\)$/, ''); return r + (cfg.N[base] ? nota(base, cfg.N[base] + '.') : ''); }).join('; ');
    filasB.push([h.it.ITEM + (h.it.CRITICO === 'Sí' ? ' (crítico)' : ''), h.r.sitio || 'Establecimiento', h.it.TIPO === 'ESCALA' ? 'Nivel ' + pNivel_(h.r.valor) + ' de 6' : h.r.resp, refTxt || '—', Q_NOMBRE[h.q]]);
  });
  if (filasB.length > 1) TAB(filasB, [160, 75, 60, 110, 65]); else P('No se registraron brechas.');


  // ---------------- 5. CONCLUSIÓN Y RECOMENDACIONES
  H2('5. Conclusión y recomendaciones');
  H3('5.1 Conclusión');
  P('El establecimiento ' + (fuertes.length ? 'muestra sus mejores resultados en ' + lista(fuertes) : 'presenta una gestión en desarrollo') + '. ' +
    (debiles.length ? 'Las brechas de mayor peso se concentran en ' + lista(debiles) + '. ' : '') +
    (r1.length ? (r1b === r1.length ? 'Las medidas prioritarias pueden resolverse sin costo, con bajo costo o con recursos existentes. ' : r1b ? 'Parte de las medidas prioritarias puede resolverse con bajo costo o con recursos existentes; el resto requiere gestión de recursos. ' : 'Las medidas prioritarias requieren gestión de recursos. ') : 'No se registraron situaciones de prioridad inmediata. ') +
    'La formalización de procedimientos y la capacitación sistemática del personal permitirían sostener las mejoras en el tiempo.');
  H3('5.2 Recomendaciones');
  P('Se ordenan por prioridad e indican el costo estimado, para facilitar su programación según los recursos disponibles. El plazo técnico corresponde al criterio de Higiene y Seguridad Laboral según el riesgo; la fecha de ejecución se acuerda con la Dirección.');
  if (recs.length) TAB([['N.º', 'Recomendación', 'Costo', 'A cargo de', 'Prioridad', 'Plazo técnico']].concat(recs.map(p => [p.n, p.accion + (p.lugar !== 'Establecimiento' ? ' (' + p.lugar + ')' : ''), p.costo, p.cargo, p.prioridad, p.plazo])), [34, 190, 55, 90, 55, 56]);
  else P('No se registraron brechas: se sugiere sostener lo logrado y repetir el diagnóstico en 12 meses.');
  const prop = X.R.find(r => r.item === 'CIE02' && !r.sitio), propOtras = X.R.find(r => r.item === 'CIE06' && !r.sitio);
  const lp = [].concat(prop && prop.valor ? String(prop.valor).split('|') : [], propOtras && propOtras.valor ? [propOtras.valor] : []).filter(Boolean);
  if (lp.length) P('Además, en el relevamiento se señalaron las siguientes propuestas de mejora: ' + lp.map(minus).join('; ') + '.');
  const cap = X.D.capacitacion;
  if (cap && cap.activos) {
    let t = infTxt_(cfg.X, 'Texto de capacitación', esc);
    t = t.replace('[x]', cap.limpieza ? cap.limpiezaCap : cap.capacitados).replace('[y]', cap.limpieza || cap.activos).replace('[z]', String(cap.limpieza ? cap.pctLimpieza : cap.pct).replace('.', ','));
    if (X.esc.cabecera) t = t.replace('Servicio de Higiene y Seguridad del establecimiento', 'Servicio de Higiene y Seguridad del hospital cabecera');
    if (t) P(t);
  }
  if (X.hall.some(h => /MAT10|PER04|PER08/.test(h.it.ID))) { const t = infTxt_(cfg.X, 'Texto de POE', esc); if (t) P(t); }
  H3('5.3 Solicitud y plazo de respuesta');
  P('Para el seguimiento, se solicita informar, dentro de los ' + cfg.resp + ' días de recibido este informe, el responsable y la fecha prevista de ejecución de cada recomendación. La respuesta puede enviarse por correo electrónico, citando el número de cada recomendación (anexo A). El avance se revisará en forma trimestral.');

  // ---------------- CIERRE Y FIRMA
  P(C.TEXTO_CIERRE || 'Quedo a disposición para cualquier consulta, aclaración o requerimiento vinculado con el presente informe.', { antes: 14 });
  P('Celular: ' + (C.CONTACTO_CELULAR || 's/d') + ' · Correo electrónico: ' + (C.CONTACTO_CORREO || 's/d'), { izq: true, desp: 26 });
  P(C.FIRMA_NOMBRE || 'Belén Pellegrini', { neg: true, color: INF2.AZUL, izq: true, desp: 0, inter: 1.2 });
  P((C.FIRMA_TITULO || '') + (C.FIRMA_MATRICULA ? ' · ' + C.FIRMA_MATRICULA : ''), { tam: 9, izq: true, desp: 0, inter: 1.2 });
  P(C.CARGO || '', { tam: 9, izq: true, desp: 0, inter: 1.2 });

  // ---------------- ANEXOS
  b.appendPageBreak();
  H2('Anexo A · Recomendaciones para la respuesta de la Dirección');
  if (recs.length) TAB([['N.º', 'Recomendación', 'Prioridad', 'Plazo técnico', 'Responsable', 'Fecha prevista']].concat(recs.map(p => [p.n, p.accion, p.prioridad, p.plazo, '', ''])), [34, 180, 60, 60, 80, 66]);
  H2('Anexo B · Matriz nacional: detalle de los criterios');
  const msn = X.items.filter(i => i.TIPO === 'ESCALA').map(i => { const r = X.R.find(x => x.item === i.ID && !x.sitio); return r && r.valor ? [i.ITEM, String(pNivel_(r.valor)), String(r.valor).replace(/^\s*\d\s*·\s*/, '')] : null; }).filter(Boolean);
  if (msn.length) TAB([['Criterio', 'Nivel', 'Situación']].concat(msn), [210, 40, 220]); else P('No se completaron los criterios de la matriz nacional.');
  H2('Anexo C · Criterios de priorización');
  P('Cada brecha se clasifica según su urgencia (riesgo inmediato de exposición o incumplimiento grave) y su importancia (peso en la gestión o requisito legal). Plazos técnicos: actuar ya, ' + cfg.plazo.Q1 + ' días, con medida provisoria inmediata cuando corresponde; resolver rápido, ' + cfg.plazo.Q3 + ' días; planificar, ' + cfg.plazo.Q2 + ' días; monitorear, hasta el próximo diagnóstico.');
  const resto = []; X.R.forEach(r => (r.fotos || []).forEach(u => { if (!fotosCrit.slice(0, INF2.MAX_FOTOS_CUERPO).some(f => f.u === u)) resto.push({ u: u, h: { r: r, it: X.porId[r.item] || { ITEM: r.item } } }); }));
  if (resto.length) { b.appendPageBreak(); H2('Anexo D · Registro fotográfico complementario'); infFotos_(b, resto.slice(0, INF2.MAX_FOTOS), INF2.MAX_FOTOS_CUERPO + 1, X.porId); }

  if (b.getChild(0).getType() === DocumentApp.ElementType.PARAGRAPH && b.getChild(0).asParagraph().getText() === '') b.removeChild(b.getChild(0));
  doc.saveAndClose();
  } catch (err) { try { if (doc) DriveApp.getFileById(doc.getId()).setTrashed(true); } catch (e) {} throw err; }
  const notasOk = infNotas_(doc.getId(), notas);

  // PDF y registro
  const archivo = codigo + (revision ? ' · Rev. ' + revision : '') + ' · Diagnóstico de gestión de residuos · ' + nombre;
  const pdf = carpeta.createFile(DriveApp.getFileById(doc.getId()).getAs('application/pdf')).setName(archivo + '.pdf');
  docActualizar_({ codigo: codigo, documento: doc.getUrl(), pdf: pdf.getUrl(), estado: 'Emitido', motivo: revision ? 'Revisión ' + revision + ' (' + hoy + ')' : '' });
  try { planDesdeInforme_(X, recs, codigo); } catch (e) {}
  const correo = infCorreo_(X, cfg, codigo, recs);
  return { ok: true, codigo: codigo, revision: revision, doc: doc.getUrl(), pdf: pdf.getUrl(), correo: correo, notasAlPie: notasOk, recomendaciones: recs.length };
}

// ------------------------------------------------------------------ Correo de envío (tono neutral, con referencia normativa)
function infCorreo_(X, cfg, codigo, recs) {
  const C = cfg.C, fRel = String(X.A.FECHA).slice(0, 10).split('-').reverse().join('/'), q1 = recs.filter(p => p.h.q === 'Q1').length;
  const asunto = codigo + ' · Diagnóstico de gestión de residuos · ' + (X.E.nombre || X.cod);
  const cuerpo = 'Sr./Sra. Director/a:\n\nEn el marco de las funciones del Servicio de Higiene y Seguridad Laboral¹, se remite el informe del diagnóstico de gestión de residuos realizado el ' + fRel + ' en ' + (X.E.nombre || X.cod) + '.\n\n' +
    'El establecimiento registró un cumplimiento del ' + (X.calc.pct === '' ? 's/d' : pc(X.calc.pct) + ' %') + (X.calc.msn !== '' ? ' (matriz nacional: ' + String(X.calc.msn).replace('.', ',') + ' sobre 6)' : '') + '. ' +
    (q1 ? 'Se identificaron ' + q1 + ' situación(es) de intervención prioritaria, con plazo técnico de ' + cfg.plazo.Q1 + ' días; se detallan en el informe, junto con las medidas provisorias correspondientes.' : 'No se identificaron situaciones de intervención inmediata.') + '\n\n' +
    'Para el seguimiento, se solicita informar dentro de los ' + cfg.resp + ' días el responsable y la fecha prevista para cada recomendación del anexo A. La respuesta puede remitirse por este medio, con referencia al número de cada recomendación.\n\n' +
    (C.TEXTO_CIERRE || '') + '\n\nSaludos cordiales.\n\n' + (C.FIRMA_NOMBRE || '') + '\n' + (C.FIRMA_TITULO || '') + (C.FIRMA_MATRICULA ? ' · ' + C.FIRMA_MATRICULA : '') + '\n' + (C.CARGO || '') + '\nCelular: ' + (C.CONTACTO_CELULAR || '') + ' · ' + (C.CONTACTO_CORREO || '') +
    '\n\n———\n¹ ' + (C.NOTA_COMPETENCIAS || 'Ley 19.587; Decreto 351/79; Res. SRT 905/2015.');
  const cc = X.esc.esc === 'A' ? 'Con copia al Servicio de Higiene y Seguridad del establecimiento' : X.esc.esc === 'B' ? 'Con copia al referente de residuos' : '';
  return { asunto: asunto, cuerpo: cuerpo, copia: cc };
}
function informeCorreo_(x) {
  const X = infDatos_(limpio_(x.cod), x.id); if (!X.ok) return X;
  if (lbEsLineaBase_(X.R)) { const pv = pInformesDiag_(X.A.ID_DIAG); return pv.length ? { ok: true, correo: lbCorreo_(X, infConfig_(X.cod), pv[0].codigo) } : { ok: false, mensaje: 'Todavía no se generó el informe.' }; }
  const cfg = infConfig_(X.cod || limpio_(x.cod)), recs = infRecomendaciones_(X, cfg), prev = pInformesDiag_(X.A.ID_DIAG);
  if (!prev.length) return { ok: false, mensaje: 'Todavía no se generó el informe.' };
  return { ok: true, correo: infCorreo_(X, cfg, prev[0].codigo, recs) };
}

// Informes de un diagnóstico (desde el registro de documentos)
function pInformesDiag_(idDiag) {
  if (!idDiag) return [];
  const R = docRegistro_({}); return (R.filas || []).filter(f => String(f.v[11]) === String(idDiag) && f.v[14] !== 'Anulado').map(f => ({ codigo: f.v[0], fecha: f.v[8], doc: f.v[12], pdf: f.v[13], estado: f.v[14], obs: f.v[15] }));
}

// ------------------------------------------------------------------ Notas al pie (servicio avanzado «Docs»)
function infNotas_(docId, notas) {
  if (!notas.length) return true;
  const marcas = [];
  const recorrer = cont => (cont || []).forEach(el => {
    if (el.paragraph) (el.paragraph.elements || []).forEach(pe => { const t = pe.textRun && pe.textRun.content; if (!t) return; const re = /\[\[NOTA(\d+)\]\]/g; let m; while ((m = re.exec(t))) marcas.push({ ini: pe.startIndex + m.index, fin: pe.startIndex + m.index + m[0].length, n: Number(m[1]) }); });
    if (el.table) el.table.tableRows.forEach(row => row.tableCells.forEach(c => recorrer(c.content)));
  });
  try {
    if (typeof Docs === 'undefined') throw new Error('sin servicio');
    recorrer(Docs.Documents.get(docId).body.content);
    marcas.sort((a, b) => b.ini - a.ini);
    const req = []; marcas.forEach(m => { req.push({ deleteContentRange: { range: { startIndex: m.ini, endIndex: m.fin } } }); req.push({ createFootnote: { location: { index: m.ini } } }); });
    const rep = Docs.Documents.batchUpdate({ requests: req }, docId).replies;
    const ins = []; marcas.forEach((m, i) => { const id = rep[i * 2 + 1].createFootnote.footnoteId; ins.push({ insertText: { location: { segmentId: id, index: 1 }, text: notas[m.n - 1] } }); });
    Docs.Documents.batchUpdate({ requests: ins }, docId);
    // Tipografía y color de las notas (Plus Jakarta Sans 8, gris)
    try {
      const fn = Docs.Documents.get(docId).footnotes || {}, est = [];
      Object.keys(fn).forEach(id => { const c = fn[id].content || [], fin = c.length ? c[c.length - 1].endIndex - 1 : 0; if (fin > 0)
        est.push({ updateTextStyle: { range: { segmentId: id, startIndex: 0, endIndex: fin }, textStyle: { weightedFontFamily: { fontFamily: INF2.FUENTE }, fontSize: { magnitude: 8, unit: 'PT' }, foregroundColor: { color: { rgbColor: { red: 0x5F / 255, green: 0x74 / 255, blue: 0x80 / 255 } } } }, fields: 'weightedFontFamily,fontSize,foregroundColor' } }); });
      if (est.length) Docs.Documents.batchUpdate({ requests: est }, docId);
    } catch (e) {}
    return true;
  } catch (e) {
    // Sin servicio avanzado: números en superíndice y referencias al final
    const d = DocumentApp.openById(docId), b = d.getBody();
    let f; while ((f = b.findText('\\[\\[NOTA\\d+\\]\\]'))) { const el = f.getElement().asText(), s = f.getStartOffset(), e2 = f.getEndOffsetInclusive(), n = el.getText().slice(s, e2 + 1).replace(/\D/g, '');
      el.deleteText(s, e2); el.insertText(s, n); el.setTextAlignment(s, s + n.length - 1, DocumentApp.TextAlignment.SUPERSCRIPT); }
    const p = b.appendParagraph('Referencias normativas'); infEst_(p, 11, INF2.AZUL, true);
    notas.forEach((t, i) => infEst_(b.appendParagraph((i + 1) + '. ' + t), 8.5, INF2.TEXTO, false));
    d.saveAndClose();
    return false;
  }
}

// ------------------------------------------------------------------ Formato
function infEst_(p, tam, color, neg) { const a = {}; a[DocumentApp.Attribute.FONT_FAMILY] = INF2.FUENTE; a[DocumentApp.Attribute.FONT_SIZE] = tam; a[DocumentApp.Attribute.FOREGROUND_COLOR] = color; a[DocumentApp.Attribute.BOLD] = !!neg; p.setAttributes(a); return p; }
function infCelda_(c, t, tam, color, neg, ancho) {
  c.setPaddingTop(3).setPaddingBottom(3).setPaddingLeft(5).setPaddingRight(5); if (ancho) c.setWidth(ancho);
  const p = c.getChild(0).asParagraph(); p.setText(t === '' ? ' ' : t); infEst_(p, tam, color, neg); p.setLineSpacing(1.1).setSpacingAfter(0);
}
function infTabla2_(b, filas, anchos) {
  const t = b.appendTable(filas.map(f => f.map(c => { const s = String(c == null ? '' : c); return s === '' ? ' ' : s; })));
  t.setBorderColor(INF2.GRIS).setBorderWidth(0.5);
  for (let i = 0; i < t.getNumRows(); i++) { const row = t.getRow(i);
    for (let j = 0; j < row.getNumCells(); j++) { const c = row.getCell(j);
      c.setPaddingTop(3).setPaddingBottom(3).setPaddingLeft(5).setPaddingRight(5); if (anchos && anchos[j]) c.setWidth(anchos[j]);
      for (let k = 0; k < c.getNumChildren(); k++) { const p = c.getChild(k).asParagraph(); infEst_(p, 8.8, i === 0 ? '#FFFFFF' : INF2.TEXTO, i === 0); p.setAlignment(DocumentApp.HorizontalAlignment.LEFT).setLineSpacing(1.1).setSpacingAfter(0); }
      if (i === 0) c.setBackgroundColor(INF2.AZUL); else if (i % 2 === 0) c.setBackgroundColor(INF2.CLARO);
    } }
  b.appendParagraph('').setSpacingAfter(2);
  return t;
}
function infFotos_(b, fotos, desde, porId) {
  fotos.forEach((f, i) => { try {
    const id = (/\/d\/([\w-]+)/.exec(f.u) || /id=([\w-]+)/.exec(f.u) || [])[1]; if (!id) return;
    const im = b.appendImage(DriveApp.getFileById(id).getBlob()), w = im.getWidth(), h = im.getHeight(), k = Math.min(1, 300 / w, 200 / h);
    im.setWidth(Math.round(w * k)).setHeight(Math.round(h * k));
    const it = f.h.it || {}; infEst_(b.appendParagraph('Foto ' + (desde + i) + ' · ' + (f.h.r.sitio || 'Establecimiento') + ' · ' + (it.ITEM || '')), 8, INF2.PATA, false).setSpacingAfter(10);
  } catch (e) {} });
}

// Plantilla del informe (una vez): documento A4 con el pie «{{CODIGO}} · Página » donde se insertan a mano los números de página
function crearPlantillaInforme() {
  const d = DocumentApp.create('PLANTILLA · Informe HYSL (no borrar)'), b = d.getBody();
  b.setPageWidth(595.3).setPageHeight(841.9).setMarginTop(60).setMarginBottom(56).setMarginLeft(62).setMarginRight(57);
  b.getChild(0).asParagraph().setText('Plantilla de los informes del Sistema HyS. No escribir aquí: el sistema reemplaza este texto. Solo se edita el pie de página.');
  const p = d.addFooter().getChild(0).asParagraph(); p.setText('{{CODIGO}} · Página ');
  const a = {}; a[DocumentApp.Attribute.FONT_FAMILY] = INF2.FUENTE; a[DocumentApp.Attribute.FONT_SIZE] = 7.5; a[DocumentApp.Attribute.FOREGROUND_COLOR] = INF2.PATA; p.setAttributes(a);
  d.saveAndClose();
  const sis = DriveApp.getFileById(CFG.GENERAL).getParents(); if (sis.hasNext()) DriveApp.getFileById(d.getId()).moveTo(sis.next());
  const sh = pBC_().getSheetByName('CONFIG_INFORMES'), v = sh.getRange(6, 1, sh.getLastRow() - 5, 1).getValues().map(r => String(r[0]));
  const i = v.indexOf('PLANTILLA_INFORME');
  if (i >= 0) sh.getRange(6 + i, 2).setValue(d.getUrl()); else sh.appendRow(['PLANTILLA_INFORME', d.getUrl(), 'Documento base de los informes (pie con número de página). Se edita solo el pie.']);
  CacheService.getScriptCache().remove('cfg_inf');
  Logger.log('Plantilla creada: ' + d.getUrl() + '  → abrila y agregá los números de página en el pie (ver instrucciones).');
}

// Autorización (una vez): pide los permisos para crear documentos de Google
function autorizarInformes() { const d = DocumentApp.create('Prueba de permisos · se borra sola'); DriveApp.getFileById(d.getId()).setTrashed(true); Logger.log('Listo: permisos para crear documentos autorizados.'); }

// ------------------------------------------------------------------ Menú de la planilla (sin portal)
function menuGenerarInforme() {
  const ui = SpreadsheetApp.getUi(), r = ui.prompt('Generar informe de diagnóstico', 'Código del establecimiento (por ejemplo, HZPM). Se usa su último diagnóstico cerrado.', ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  const out = informeDiag_({ cod: r.getResponseText().trim() });
  ui.alert(out.ok ? 'Informe ' + out.codigo + ' listo.\n\nDocumento: ' + out.doc + '\nPDF: ' + out.pdf : out.mensaje);
}

// ------------------------------------------------------------------ INFORME DE LÍNEA DE BASE (diagnóstico de residuos, fase 1 · oct 2026)
// Se usa cuando el diagnóstico tiene el cuestionario de línea de base (puntos MAN, LEG, DOC, ACO, PSN, DAT).
// Sin plan de mejora: situación, brechas, hallazgos críticos, datos a relevar e indicadores. El plan se arma en la fase 2, con toda la red.
const LB_BOLSA_DM3 = { 'Chica (40 × 60 cm)': 25, 'Mediana (60 × 90 cm)': 70, 'Grande (90 × 120 cm)': 130 }; // volumen aproximado de bolsa llena
const LB_KG_DM3 = 0.25; // OMS 2014, residuos contaminados (criterio adoptado para la DDJJ)
const lbEsLineaBase_ = R => R.some(r => /^(MAN|LEG|DOC|ACO|PSN|DAT)\d\d$/.test(r.item));
const lbMay_ = s => { s = String(s || ''); return s.charAt(0).toUpperCase() + s.slice(1); };
const lbNum_ = v => { const n = Number(String(v == null ? '' : v).replace(',', '.')); return String(v == null ? '' : v).trim() === '' || isNaN(n) ? null : n; };
const lbFmt_ = (n, d) => { if (n == null) return 's/d'; const t = (Math.round(n * Math.pow(10, d || 0)) / Math.pow(10, d || 0)).toFixed(d || 0).split('.'); return t[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (t[1] ? ',' + t[1] : ''); };
// Opción en minúscula dentro de una oración, salvo nombres propios (Higiene y Seguridad, Secretaría de Salud, Impeesa…)
const LB_PROPIOS = /^(Higiene y Seguridad|Secretar[ií]a|Impeesa|[ÁA]rea Program|Ambiente|Direcci[oó]n|Comit[eé]|RAEE|HySL|Sistema de manifiestos|Planilla de c[aá]lculo|Personal \(RR)/;
const lbOpc_ = s => { s = String(s || ''); return LB_PROPIOS.test(s) ? s : s.charAt(0).toLowerCase() + s.slice(1); };
const lbItem_ = s => String(s || '').replace(/[¿?]/g, '').replace(/\s*\(.*?\)\s*$/, '').trim();
const lbBloque_ = s => '«' + s + '»';

function lbIndicadores_(X) {
const v = id => { const r = X.R.find(x => x.item === id && !x.sitio); return r ? String(r.valor || r.resp || '') : ''; };
const fuente = v('DAT01'); let kg = null, origen = 's/d';
if (/^Pesado/.test(fuente)) { kg = lbNum_(v('DAT02')); origen = 'pesado'; }
else if (/^Volumen/.test(fuente)) { const d = lbNum_(v('DAT02')); kg = d == null ? null : d * LB_KG_DM3; origen = 'volumen de manifiesto × ' + String(LB_KG_DM3).replace('.', ',') + ' kg/dm³'; }
else if (/^Estimado/.test(fuente)) { const n = lbNum_(v('DAT03')), vol = LB_BOLSA_DM3[v('DAT04')]; kg = n == null || !vol ? null : n * 4.33 * vol * LB_KG_DM3; origen = 'estimado por bolsas (' + (n == null ? 's/d' : n) + ' por semana, ' + (minus(v('DAT04')) || 's/d') + ')'; }
const camas = lbNum_(v('PRF03')), consultas = lbNum_(v('DGN01'));
const trab = ['DGN02', 'DGN03', 'DGN04', 'DGN05'].map(id => lbNum_(v(id))), totTrab = trab.some(n => n != null) ? trab.reduce((a, n) => a + (n || 0), 0) : null;
const acc = lbNum_(v('PSN15'));
return {
kgMes: kg, origen: origen,
kgCamaDia: kg != null && camas ? kg / (camas * 30) : null,
kgConsulta: kg != null && consultas ? kg / consultas : null, conCamas: !!camas,
capLimpieza: v('PSN02') || 's/d', capAsist: v('PSN06') || 's/d',
accidentes: v('PSN14') || 's/d', tasaAcc: acc != null && totTrab ? 100 * acc / totTrab : null, trabajadores: totTrab
};
}

function informeLB_(X, x) {
if (!X.E.carpeta) return { ok: false, mensaje: 'El establecimiento no tiene carpeta en el sistema.' };
if (!X.calc.n) return { ok: false, mensaje: 'El diagnóstico no tiene puntos evaluados: completalo antes de generar el informe.' };
const cfg = infConfig_(X.cod), C = cfg.C, A = X.A, calc = X.calc, local = C.MODO_LOCAL === 'Sí';
const prev = pInformesDiag_(A.ID_DIAG); let codigo, revision = 0;
if (prev.length) { codigo = prev[0].codigo; if (prev[0].doc) { const m = /Revisión (\d+)/.exec(String(prev[0].obs || '')); revision = m ? Number(m[1]) + 1 : 1; } }
else { const n = docNumero_({ est: X.cod, bloque: 'RES', tipo: 'DG', asunto: 'Línea de base de la gestión de residuos', origen: 'Sistema', idOrigen: A.ID_DIAG, pedidoPor: Session.getActiveUser().getEmail() }); if (!n.ok) return n; codigo = n.codigo; }
const hoy = Utilities.formatDate(new Date(), TZ, 'dd/MM/yyyy'), fRel = String(A.FECHA).slice(0, 10).split('-').reverse().join('/'), nombre = X.E.nombre || X.cod;
const porId = X.porId, R = X.R;
// Clasificación de respuestas
const valorDe = r => pDiagValor_(porId[r.item], { resp: r.resp, valor: r.valor });
const criticos = [], brechas = [], nose = [];
R.forEach(r => { const it = porId[r.item]; if (!it) return;
const val = String(r.valor || r.resp || '');
if (/(^|\|)No se sabe/.test(val)) nose.push({ it: it, r: r });
const v = valorDe(r); if (v == null || v >= 1) return;
if (it.CRITICO === 'Sí' && v <= 1 / 3) criticos.push({ it: it, r: r, v: v }); else brechas.push({ it: it, r: r, v: v }); });
brechas.sort((a, b) => a.v - b.v);
const I = lbIndicadores_(X);
const lugares = ['Establecimiento'].concat(X.D.sitios.map(s => s.sitio)).filter(s => R.some(r => (r.sitio || 'Establecimiento') === s));
const bloques = Object.keys(calc.porSeccion).filter(s => !/^0 ·|^Anexo/.test(s)).map(s => [s, calc.porSeccion[s]]).sort((a, b) => b[1] - a[1]);
const sinLetra = s => s.replace(/^[0-9A-Z]+\d? · /, '');
const informantes = (() => { const r = R.find(x => x.item === 'DGN06' && !x.sitio); return r && r.valor ? String(r.valor).split('|').map(minus) : []; })();

// Mejoras priorizadas (12/10/2026): salen de ITEMS › ACCION y pasan al punto 6 y al plan de acción (mismo criterio que agua, plagas y cocinas)
const porIdP = {}; Object.keys(porId).forEach(k => porIdP[k] = Object.assign({}, porId[k], { PROPUESTA: porId[k].ACCION }));
const HL = dgmHallazgos_({ R: R, porId: porIdP }, cfg);
const carpeta = carpeta_(DriveApp.getFolderById(X.E.carpeta), 'Informes');
let doc; const notas = [];
try {
const titulo = codigo + (revision ? ' · Rev. ' + revision : '') + ' · Línea de base de la gestión de residuos · ' + nombre;
const plantilla = (/[-\w]{25,}/.exec(C.PLANTILLA_INFORME || '') || [])[0];
if (plantilla) { doc = DocumentApp.openById(DriveApp.getFileById(plantilla).makeCopy(titulo, carpeta).getId()); }
else { doc = DocumentApp.create(titulo); DriveApp.getFileById(doc.getId()).moveTo(carpeta); }
const b = doc.getBody(); b.clear();
b.setPageWidth(595.3).setPageHeight(841.9).setMarginTop(60).setMarginBottom(56).setMarginLeft(62).setMarginRight(57);
const base = {}; base[DocumentApp.Attribute.FONT_FAMILY] = INF2.FUENTE; base[DocumentApp.Attribute.FONT_SIZE] = 10.5; base[DocumentApp.Attribute.FOREGROUND_COLOR] = INF2.TEXTO; b.setAttributes(base);
// Encabezado (tabla de control documental) y pie
const enc = doc.getHeader() || doc.addHeader();
const te = enc.appendTable([[' ', 'x', 'x'], [' ', 'x', 'x']]);
te.setBorderColor('#C9D6DB').setBorderWidth(0.5);
infCelda_(te.getCell(0, 0), C.LOGO_URL ? '' : 'HySL', 12, INF2.AZUL, true, 70); infCelda_(te.getCell(1, 0), '', 8, INF2.PATA, false, 70);
infCelda_(te.getCell(0, 1), 'Línea de base de la gestión de residuos', 10, INF2.AZUL, true, 250); infCelda_(te.getCell(1, 1), C.ENCABEZADO_LINEA2 || '', 7.5, INF2.PATA, false, 250);
infCelda_(te.getCell(0, 2), 'Código: ' + codigo, 8, INF2.AZUL, false, 156); infCelda_(te.getCell(1, 2), 'Emisión: ' + hoy + ' · Revisión: ' + revision, 8, INF2.AZUL, false, 156);
if (C.LOGO_URL) try { const idL = (/[-\w]{25,}/.exec(C.LOGO_URL) || [])[0]; const im = te.getCell(0, 0).getChild(0).asParagraph().appendInlineImage(DriveApp.getFileById(idL).getBlob()); const k = 40 / im.getHeight(); im.setHeight(40).setWidth(Math.round(im.getWidth() * k)); } catch (e) {}
if (enc.getNumChildren() > 1 && enc.getChild(0).getType() === DocumentApp.ElementType.PARAGRAPH && enc.getChild(0).asParagraph().getText() === '') enc.removeChild(enc.getChild(0));
const pie = doc.getFooter();
if (pie && pie.getText().indexOf('{{CODIGO}}') >= 0) pie.replaceText('\\{\\{CODIGO\\}\\}', codigo);
else { const pf = doc.addFooter(); infEst_(pf.appendParagraph(codigo), 7.5, INF2.PATA, false); }
try { const pl = doc.getFooter().appendParagraph(''); pl.setAlignment(DocumentApp.HorizontalAlignment.CENTER); const img = pl.appendInlineImage(DriveApp.getFileById(DGM_LOGO_PIE).getBlob()); const w = 260; img.setHeight(Math.round(img.getHeight() * w / img.getWidth())); img.setWidth(w); } catch (e) {}   // logo de HySL en el pie

const yaNota = {};
const nota = (clave, texto) => { if (!texto || yaNota[clave]) return ''; notas.push(texto); yaNota[clave] = notas.length; return '[[NOTA' + notas.length + ']]'; };
const normaDe = cita => cfg.N[cita] || cita;
const P = (t, o) => { o = o || {}; const p = b.appendParagraph(t || ''); infEst_(p, o.tam || 10.5, o.color || INF2.TEXTO, o.neg); p.setAlignment(o.izq ? DocumentApp.HorizontalAlignment.LEFT : DocumentApp.HorizontalAlignment.JUSTIFY).setLineSpacing(o.inter || 1.5).setSpacingAfter(o.desp == null ? 6 : o.desp).setSpacingBefore(o.antes || 0); return p; };
const H2 = t => { const p = b.appendParagraph(t); p.setHeading(DocumentApp.ParagraphHeading.HEADING2); infEst_(p, 13, INF2.AZUL, true); p.setSpacingBefore(16).setSpacingAfter(6).setLineSpacing(1.15); return p; };
const H3 = t => { const p = b.appendParagraph(t); p.setHeading(DocumentApp.ParagraphHeading.HEADING3); infEst_(p, 11, INF2.AZUL, true); p.setSpacingBefore(10).setSpacingAfter(4).setLineSpacing(1.15); return p; };
const TAB = (filas, anchos) => infTabla2_(b, filas, anchos);
const COMP = C.NOTA_COMPETENCIAS || 'Ley 19.587 de Higiene y Seguridad en el Trabajo; Decreto 351/79; Res. SRT 905/2015, funciones de los servicios de Higiene y Seguridad en el Trabajo.';
const lugarTxt = r => r.sitio || 'Establecimiento';
const respTxt = r => String(r.valor || r.resp || '').split('|').map(lbOpc_).join(', ');

// ---------------- PORTADA E ÍNDICE (12/10/2026: mismo formato que los demás informes)
P('Servicio de Higiene y Seguridad Laboral', { color: INF2.PATA, izq: true, desp: 60 });
P('INFORME TÉCNICO', { tam: 9, color: INF2.PATA, neg: true, desp: 4, izq: true, inter: 1.1 });
P('Línea de base de la gestión de residuos', { tam: 24, color: INF2.AZUL, neg: true, desp: 4, izq: true, inter: 1.1 });
P(nombre + (lugares.length > 2 ? ' y lugares dependientes' : ''), { tam: 13, color: INF2.PATA, desp: 30, izq: true, inter: 1.2 });
TAB([['Informe N.º', codigo + (revision ? ' · Revisión ' + revision : '')], ['Establecimiento', nombre], ['Tipo de relevamiento', 'Línea de base de la gestión de residuos'],
  ['Fecha del relevamiento', fRel], ['Fecha del informe', hoy], ['Destinatario', 'Dirección del establecimiento'],
  ['Elaboró', (C.FIRMA_NOMBRE || 'Belén Pellegrini') + ' · Licenciada en Higiene, Seguridad y Medio Ambiente del Trabajo, M.P. LCOHSECH0383'], ['Módulo del sistema HyS', 'Módulo 1 · Residuos']], [150, 320]);
P('Borrador generado por el sistema HyS (versión 0): revisarlo antes de firmar. Números de página: Insertar › Números de página.', { tam: 9, color: INF2.PATA, izq: true, antes: 10 });
b.appendPageBreak();
H2('Índice');
P('Para tener el índice con números de página: Insertar › Índice, y borrar esta lista.', { tam: 9, color: INF2.PATA, izq: true });
['Resumen ejecutivo', '1. Presentación', '2. Método de trabajo', '3. Descripción de los hechos', '4. Análisis de los datos', '5. Conclusión', '6. Recomendaciones', 'Anexo · Registro fotográfico'].forEach(t => P(t, { izq: true, desp: 0, inter: 1.3 }));
b.appendPageBreak();
if (local) P('Desde el Servicio de Higiene y Seguridad Laboral y en el marco de sus competencias' + nota('competencias', COMP) + ', se remite la línea de base de la gestión de residuos del establecimiento: la situación encontrada antes de la puesta en marcha del sistema de gestión, que sirve de punto de partida para medir los avances.');
else P('En carácter de ' + (C.CARGO || 'Referente Provincial de Seguridad e Higiene Sanitaria') + nota('designacion', 'Designación: ' + (C.DESIGNACION_INSTRUMENTO || 's/d') + '. ' + normaDe('Línea 8') + '.') + ' y en el marco de las competencias de Higiene y Seguridad Laboral' + nota('competencias', COMP) + ', se remite la línea de base de la gestión de residuos del establecimiento, relevada como parte del diagnóstico de la red de salud.');
H2('Resumen ejecutivo');
const mejores = bloques.filter(s => s[1] >= 60).slice(0, 2).map(s => lbBloque_(sinLetra(s[0])));
const peores = bloques.filter(s => s[1] < 60).slice(-2).reverse().map(s => lbBloque_(sinLetra(s[0])));
const critTxt = Array.from(new Set(criticos.map(h => lbOpc_(lbItem_(h.it.ITEM)) + ' (' + respTxt(h.r) + (h.r.sitio ? ', ' + h.r.sitio : '') + ')'))).slice(0, 4);
P('El relevamiento del ' + fRel + (lugares.length > 2 ? ', que abarcó ' + (lugares.length - 1) + ' lugares,' : '') + ' muestra un cumplimiento general del ' + (calc.pct === '' ? 's/d' : pc(calc.pct) + ' %') + '. ' +
(mejores.length ? 'Los mejores resultados están en ' + lista(mejores) + '. ' : '') + (peores.length ? 'Las brechas mayores se concentran en ' + lista(peores) + '. ' : '') +
(criticos.length === 1 ? 'Se registró un hallazgo crítico, que conviene atender dentro de los ' + cfg.plazo.Q1 + ' días: ' + critTxt[0] + '.' : criticos.length ? 'Se registraron ' + criticos.length + ' hallazgos críticos, que conviene atender dentro de los ' + cfg.plazo.Q1 + ' días: ' + critTxt.join('; ') + '.' : 'No se registraron hallazgos críticos.'));
P((nose.length ? 'Quedaron ' + nose.length + ' dato' + (nose.length > 1 ? 's' : '') + ' sin conocer, que se relevarán en las próximas visitas y no restan puntaje. ' : '') +
(HL.length ? 'El informe propone ' + HL.length + (HL.length > 1 ? ' mejoras, ordenadas' : ' mejora, ordenada') + ' por prioridad y plazo (punto 6), que se registran en el plan de acción para su seguimiento.' : 'No surgen mejoras a proponer en esta instancia.'));
b.appendPageBreak();

// ---------------- 1. PRESENTACIÓN
H2('1. Presentación');
P('La gestión de residuos en un establecimiento de salud es, ante todo, una condición de trabajo: quienes generan, separan, trasladan y almacenan los residuos están expuestos a riesgo biológico, a lesiones con elementos cortopunzantes y a sustancias químicas' + nota('funciones', 'Ley 19.587, arts. 4 y 5; Decreto 351/79; Res. SRT 905/2015.') + '. Además, los establecimientos son generadores de residuos peligrosos y deben cumplir la normativa nacional y provincial que regula su manejo, transporte y tratamiento' + nota('rrpp', normaDe('Ley 24.051') + '; ' + normaDe('Ley XI N.º 35') + '; ' + normaDe('Dto. 1675/93') + '.') + '.');
P('Antes de implementar el sistema de gestión (registro de manifiestos, auditorías y seguimiento), es necesario conocer cómo se trabaja hoy. Por eso este primer diagnóstico es una línea de base: registra la situación encontrada, sin valoración de las personas, para poder medir después los cambios.');

// ---------------- 2. MÉTODO DE TRABAJO
H2('2. Método de trabajo');
TAB([['Aspecto', 'Detalle'],
['Modalidad', (A.MODALIDAD || 's/d') + (A.RELEVADO_POR ? ' · relevado por ' + A.RELEVADO_POR : '')],
['Fecha', fRel],
['Informantes', [informantes.length ? lbMay_(lista(informantes)) : '', A.ENTREVISTADO || ''].filter(Boolean).join(' · ') || 's/d'],
['Período de referencia', 'Últimos 12 meses'],
['Lugares relevados', lugares.map(s => s === 'Establecimiento' ? nombre + ' (generales)' : s).join(' · ')]], [130, 340]);
P('Se utilizó el cuestionario provincial de línea de base, con respuestas cerradas y preguntas que se habilitan según el tipo de establecimiento, los servicios y las respuestas anteriores' + nota('greas', normaDe('Res. MSN 134/2016') + '.') + '. En cada pregunta que puntúa, la mejor situación vale 1, las intermedias valen en proporción y la peor vale 0; los puntos críticos valen doble. Las respuestas «no se sabe» y «no aplica» no se cuentan. Las respuestas son declarativas: se registra la función de quien informó.');

// ---------------- 3. DESCRIPCIÓN DE LOS HECHOS
H2('3. Descripción de los hechos');
P('Se describe la situación informada y observada, por bloque, sin valoración normativa.');
const secs = Array.from(new Set(X.items.map(i => i.SECCION))).filter(s => !/^Anexo/.test(s));
let nS = 0;
secs.forEach(sec => {
const its = X.items.filter(i => i.SECCION === sec), lineas = [];
['Establecimiento'].concat(X.D.sitios.map(s => s.sitio)).forEach(lug => {
const partes = [];
its.forEach(it => { const r = R.find(x => x.item === it.ID && lugarTxt(x) === lug); if (!r) return;
if (it.ID === 'ACO19') { if (r.valor) partes.push('observación: ' + String(r.valor).trim().replace(/\.+$/, '')); return; }
const val = String(r.valor || r.resp || ''); if (!val) return;
partes.push(lbItem_(it.ITEM) + ': ' + respTxt(r)); });
if (partes.length) lineas.push((lug === 'Establecimiento' ? '' : lug + '. ') + lbMay_(partes.join('; ')) + '.');
});
if (!lineas.length) return;
nS++; H3('3.' + nS + ' ' + sinLetra(sec));
lineas.forEach(l => P(l));
});

// ---------------- 4. ANÁLISIS DE LOS DATOS
H2('4. Análisis de los datos');
H3('4.1 Resultado general, por bloque y por lugar');
TAB([['Bloque', 'Cumplimiento']].concat([['Total del establecimiento', calc.pct === '' ? 's/d' : pc(calc.pct) + ' %']]).concat(Object.keys(calc.porSeccion).filter(s => !/^0 ·|^Anexo/.test(s)).map(s => [sinLetra(s), pc(calc.porSeccion[s]) + ' %'])), [340, 130]);
if (lugares.length > 2) { const fl = [['Lugar', 'Puntos evaluados', 'Cumplimiento']]; lugares.filter(l => l !== 'Establecimiento').forEach(l => { const c = pDiagCalcular_(X.items, R.filter(r => lugarTxt(r) === l)); if (c.n) fl.push([l, String(c.n), pc(c.pct) + ' %']); }); if (fl.length > 1) TAB(fl, [270, 100, 100]); }
H3('4.2 Hallazgos críticos');
if (criticos.length) {
P('Situaciones que exponen al personal o incumplen requisitos legales. Se informan aparte porque requieren atención aunque el porcentaje general sea aceptable.');
TAB([['Situación', 'Lugar', 'Respuesta', 'Referencia']].concat(criticos.map(h => [h.it.ITEM, lugarTxt(h.r), lbMay_(respTxt(h.r)), String(h.it.REFERENCIA || '—').split(' · ').map(s => s + (cfg.N[s] ? nota(s, cfg.N[s] + '.') : '')).join('; ')])), [170, 80, 100, 120]);
} else P('No se registraron hallazgos críticos.');
H3('4.3 Otras brechas respecto de la normativa');
if (brechas.length) TAB([['Requisito', 'Lugar', 'Respuesta', 'Referencia']].concat(brechas.map(h => [h.it.ITEM, lugarTxt(h.r), lbMay_(respTxt(h.r)), h.it.REFERENCIA || '—'])), [170, 80, 100, 120]);
else P('No se registraron otras brechas.');
H3('4.4 Datos a relevar');
if (nose.length) P('Los siguientes datos no se conocían al momento del relevamiento; no restan puntaje y quedan pendientes: ' + Array.from(new Set(nose.map(h => lbOpc_(lbItem_(h.it.ITEM)) + (h.r.sitio ? ' (' + h.r.sitio + ')' : '')))).join('; ') + '.');
else P('No quedaron datos sin conocer.');
H3('4.5 Indicadores de la línea de base');
TAB([['Indicador', 'Valor', 'Fuente o criterio'],
['Biopatogénicos por mes', I.kgMes == null ? 's/d' : lbFmt_(I.kgMes, 0) + ' kg', I.origen],
['kg por cama ocupada y día', I.kgCamaDia == null ? 's/d' : lbFmt_(I.kgCamaDia, 2), 'Camas en uso del último mes'],
['kg por consulta', I.conCamas ? 'No corresponde' : I.kgConsulta == null ? 's/d' : lbFmt_(I.kgConsulta, 3), I.conCamas ? 'Se usa el indicador por cama' : 'Consultas promedio por mes'],
['Personal de limpieza capacitado (12 meses)', lbMay_(minus(I.capLimpieza)), 'Declarado'],
['Personal asistencial capacitado (12 meses)', lbMay_(minus(I.capAsist)), 'Declarado'],
['Accidentes cortopunzantes (12 meses)', lbMay_(minus(I.accidentes)) + (I.tasaAcc == null ? '' : ' · ' + lbFmt_(I.tasaAcc, 1) + ' cada 100 trabajadores'), I.trabajadores ? I.trabajadores + ' trabajadores declarados' : 'Declarado']], [190, 120, 160]);
const cap = X.D.capacitacion;
if (cap && cap.activos) P('Según el registro de capacitaciones del sistema, en los últimos 12 meses se capacitaron en residuos ' + cap.capacitados + ' de ' + cap.activos + ' personas activas (' + pc(cap.pct) + ' %)' + (cap.limpieza ? ', y ' + cap.limpiezaCap + ' de ' + cap.limpieza + ' del personal de limpieza, maestranza y servicios generales (' + pc(cap.pctLimpieza) + ' %)' : '') + '.');

// ---------------- 5. CONCLUSIÓN
H2('5. Conclusión');
P('La línea de base ' + (/^(Hospital|Centro|Puesto|Servicio)\b/.test(nombre) ? 'del ' : 'de ') + nombre + ' registra un cumplimiento general del ' + (calc.pct === '' ? 's/d' : pc(calc.pct) + ' %') + (criticos.length ? ', con ' + criticos.length + ' hallazgo' + (criticos.length > 1 ? 's' : '') + ' crítico' + (criticos.length > 1 ? 's' : '') : ', sin hallazgos críticos') + (nose.length ? ' y ' + nose.length + ' dato' + (nose.length > 1 ? 's' : '') + ' a relevar' : '') + '. ' +
(peores.length ? 'Los bloques con mayor margen de mejora son ' + lista(peores) + '. ' : '') +
(local ? 'Estos resultados son el punto de partida para acordar con la Dirección las medidas de mejora y para medir su avance con las auditorías del sistema.' : 'Estos resultados se integrarán al análisis de la red, a partir del cual se elaborará un plan de abordaje común, que cada establecimiento adaptará a sus posibilidades.'));

// ---------------- 6. RECOMENDACIONES (ITEMS › ACCION; pasan al plan de acción)
H2('6. Recomendaciones');
if (HL.length) {
P('Se proponen las siguientes mejoras, ordenadas por prioridad: «actuar ya» (' + cfg.plazo.Q1 + ' días) para los hallazgos críticos, «resolver rápido» (' + cfg.plazo.Q3 + ' días) para los puntos de peso alto y «planificar» (' + cfg.plazo.Q2 + ' días) para el resto. Se solicita a la Dirección que, por su intermedio, se requiera a los servicios responsables la confirmación de las acciones y de los plazos de ejecución, que se registrarán en el plan de acción del sistema para su seguimiento.');
TAB([['Prioridad', 'Hallazgo', 'Propuesta de mejora', 'Lugar', 'Fecha límite sugerida']].concat(HL.map(h => [h.prioridad + ' (' + h.dias + ' días)', lbItem_(h.it.ITEM), h.propuesta, h.lugares.join(', '), String(h.limite).split('-').reverse().join('/')])), [70, 120, 160, 70, 55]);
} else P('No surgen mejoras a proponer en esta instancia.');

// ---------------- CIERRE Y FIRMA
P(C.TEXTO_CIERRE || 'Quedo a disposición por cualquier consulta, requerimiento o ampliación de lo informado.', { antes: 14 });
P('Celular: ' + (C.CONTACTO_CELULAR || 's/d') + ' · Correo electrónico: ' + (C.CONTACTO_CORREO || 's/d'), { izq: true, desp: 26 });
P(C.FIRMA_NOMBRE || 'Belén Pellegrini', { neg: true, color: INF2.AZUL, izq: true, desp: 0, inter: 1.2 });
P('Licenciada en Higiene, Seguridad y Medio Ambiente del Trabajo', { tam: 9, izq: true, desp: 0, inter: 1.2 });
P('M.P. LCOHSECH0383', { tam: 9, izq: true, desp: 0, inter: 1.2 });
P(local ? 'Servicio de Higiene y Seguridad Laboral' : (C.CARGO || ''), { tam: 9, izq: true, desp: 0, inter: 1.2 });

// ---------------- ANEXO · FOTOS
const fotos = []; R.forEach(r => (r.fotos || []).forEach(u => fotos.push({ u: u, h: { r: r, it: porId[r.item] || { ITEM: r.item } } })));
if (fotos.length) { b.appendPageBreak(); H2('Anexo · Registro fotográfico'); infFotos_(b, fotos.slice(0, INF2.MAX_FOTOS), 1, porId); }
if (b.getChild(0).getType() === DocumentApp.ElementType.PARAGRAPH && b.getChild(0).asParagraph().getText() === '') b.removeChild(b.getChild(0));
doc.saveAndClose();
} catch (err) { try { if (doc) DriveApp.getFileById(doc.getId()).setTrashed(true); } catch (e) {} throw err; }
const notasOk = infNotas_(doc.getId(), notas);
const archivo = codigo + (revision ? ' · Rev. ' + revision : '') + ' · Línea de base de la gestión de residuos · ' + nombre;
const pdf = carpeta.createFile(DriveApp.getFileById(doc.getId()).getAs('application/pdf')).setName(archivo + '.pdf');
docActualizar_({ codigo: codigo, documento: doc.getUrl(), pdf: pdf.getUrl(), estado: 'Emitido', motivo: revision ? 'Revisión ' + revision + ' (' + hoy + ')' : '' });
// Plan de acción: cada mejora del punto 6 pasa a DIAGNÓSTICO › PLAN_ACCION (nunca pisa respuestas ni estados)
let plan = true; try { if (HL.length) planDesdeInforme_(X, HL.map((h, i) => ({ n: i + 1, h: h, accion: h.propuesta, lugar: h.lugares.join(', '), costo: h.it.COSTO || 's/d', cargo: 's/d (a definir por la Dirección)', prioridad: h.prioridad, plazo: h.dias + ' días' })), codigo); } catch (e) { plan = false; }
const correo = lbCorreo_(X, cfg, codigo);
return { ok: true, codigo: codigo, revision: revision, doc: doc.getUrl(), pdf: pdf.getUrl(), correo: correo, notasAlPie: notasOk, criticos: criticos.length, aRelevar: nose.length, mejoras: HL.length, plan: plan };
}

function lbCorreo_(X, cfg, codigo) {
const C = cfg.C, calc = X.calc, nombre = X.E.nombre || X.cod, fRel = String(X.A.FECHA).slice(0, 10).split('-').reverse().join('/');
const crit = X.R.filter(r => { const it = X.porId[r.item]; if (!it || it.CRITICO !== 'Sí') return false; const v = pDiagValor_(it, { resp: r.resp, valor: r.valor }); return v != null && v <= 1 / 3; }).length;
return { asunto: codigo + ' · Línea de base de la gestión de residuos · ' + nombre,
cuerpo: 'Sr./Sra. Director/a:\n\nEn el marco de las funciones del Servicio de Higiene y Seguridad Laboral¹, se remite la línea de base de la gestión de residuos ' + (/^(Hospital|Centro|Puesto|Servicio)\b/.test(nombre) ? 'del ' : 'de ') + nombre + ', relevada el ' + fRel + '.\n\n' +
'El establecimiento registró un cumplimiento general del ' + (calc.pct === '' ? 's/d' : pc(calc.pct) + ' %') + '. ' + (crit ? (crit === 1 ? 'Se identificó un hallazgo crítico, detallado en el punto 4.2,' : 'Se identificaron ' + crit + ' hallazgos críticos, detallados en el punto 4.2,') + ' que conviene atender dentro de los ' + cfg.plazo.Q1 + ' días.' : 'No se identificaron hallazgos críticos.') + ' En el punto 6 se proponen las mejoras para confirmar responsables y plazos.' + '\n\n' +
(C.TEXTO_CIERRE || '') + '\n\nSaludos cordiales.\n\n' + (C.FIRMA_NOMBRE || 'Belén Pellegrini') + '\nServicio de Higiene y Seguridad Laboral\nCelular: ' + (C.CONTACTO_CELULAR || '') + ' · ' + (C.CONTACTO_CORREO || '') + '\n\n———\n¹ ' + (C.NOTA_COMPETENCIAS || 'Ley 19.587; Decreto 351/79; Res. SRT 905/2015.'), copia: '' };
}

// Prueba del informe de residuos (12/10/2026): genera «PRUEBA-…» en la carpeta Informes del establecimiento con respuestas inventadas,
// sin numerar, sin tocar el registro de documentos ni el plan de acción. Borrarlo después de revisarlo.
function probarInformeResiduos() { Logger.log(JSON.stringify(resProbarInforme_('HMH'))); }
function resProbarInforme_(cod) {
  const D = pDiagAbrir_(cod, ''); if (!D.ok) return D;
  const items = D.items.filter(i => /^(MAN|LEG|DOC|ACO|PSN|DAT|ORG|DGN|PER|PRF)\d\d$/.test(i.ID)), porId = {}; items.forEach(i => porId[i.ID] = i);
  const sitios = (D.sitios || []).slice(0, 2), resp = [], elegir = (it, k) => { const ops = String(it.OPCIONES || '').split('|').filter(o => o && !/no se sabe|no aplica/i.test(o)); return ops[k % Math.max(1, ops.length)] || ''; };
  let k = 0;
  items.forEach(it => {
    const lugares = it.NIVEL === 'S' ? sitios.map(s => s.sitio) : [''];
    lugares.forEach(s => { const r = { sitio: s, item: it.ID, resp: '', valor: '', obs: '', fotos: [] };
      if (it.TIPO === 'TEXTO') r.valor = 's/d'; else if (/NUM/.test(it.TIPO)) r.valor = '10'; else if (it.TIPO === 'MULTI') r.valor = String(it.OPCIONES).split('|')[0]; else r.valor = elegir(it, k++);
      if (r.valor) resp.push(r); });
  });
  const R = resp.filter(r => diagAplica_(porId[r.item], resp, r.sitio, porId));
  const A = { ID_DIAG: 'PRUEBA-RESIDUOS', CODIGO: cod, FECHA: Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd'), MODALIDAD: 'Visita', RELEVADO_POR: 'Belén Pellegrini', ENTREVISTADO: 's/d (prueba)', ESTADO: 'Cerrado' };
  const X = { ok: true, D: Object.assign({}, D, { actual: A, respuestas: R }), A: A, items: items, porId: porId, R: R, calc: pDiagCalcular_(items, R), hall: [], E: est_(cod) || {}, esc: infEscenario_(R, cod), cod: cod };
  const g = this, orig = { docNumero_: g.docNumero_, docActualizar_: g.docActualizar_, pInformesDiag_: g.pInformesDiag_, planDesdeInforme_: g.planDesdeInforme_ };
  try {
    g.docNumero_ = () => ({ ok: true, codigo: 'PRUEBA-' + cod + '-RESIDUOS' }); g.docActualizar_ = () => ({ ok: true }); g.pInformesDiag_ = () => []; g.planDesdeInforme_ = () => true;
    return informeLB_(X, { cod: cod, id: A.ID_DIAG });
  } finally { Object.keys(orig).forEach(n => g[n] = orig[n]); }
}
