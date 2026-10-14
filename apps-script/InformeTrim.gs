/**
 * SISTEMA HyS · INFORME TRIMESTRAL DE AUDITORÍA DE RESIDUOS (versión 11)
 * Un informe por establecimiento y por trimestre: reúne todas las auditorías cerradas del trimestre
 * (edificios, CAPS, dispositivos y documental) y genera un Google Doc editable + PDF con el formato institucional.
 *   Resumen ejecutivo (prosa) · 1 Presentación · 2 Método de trabajo · 3 Descripción de hechos · 4 Análisis de los datos
 *   · 5 Conclusión y recomendaciones · cierre sin numerar · firma · anexo fotográfico.
 * Análisis: gráficos (cumplimiento por eje, evolución trimestral) y, solo cuando corresponde:
 *   cinco porqués (no conformidad mayor o hallazgo repetido) · Ishikawa (3 o más hallazgos de un eje)
 *   · FODA (cuarto trimestre o primer informe) · ciclo de Deming (siempre, desde el PLAN_ACCION).
 * Las herramientas quedan armadas con los datos; el análisis de causas se completa en el Doc.
 * Usa las funciones de Informes.gs (formato, notas al pie, encabezado) y Documentos.gs (numeración).
 */

const IT_RAMAS = ['Personas', 'Método', 'Insumos y EPP', 'Infraestructura y equipos', 'Entorno', 'Gestión y medición'];
// Rama del Ishikawa de cada punto: por eje, con excepciones por código (se puede cambiar en el Doc)
function itRama_(cod) {
  const c = String(cod || '').toUpperCase(), ex = { B8: 'Personas', H1: 'Personas', H5: 'Personas', A7: 'Personas', H2: 'Insumos y EPP', H6: 'Insumos y EPP', E5: 'Insumos y EPP', F7: 'Insumos y EPP',
    F3: 'Entorno', G2: 'Gestión y medición', G5: 'Gestión y medición' };
  if (ex[c]) return ex[c];
  return { A: 'Gestión y medición', B: 'Método', C: 'Método', D: 'Infraestructura y equipos', E: 'Infraestructura y equipos', F: 'Infraestructura y equipos', G: 'Entorno', H: 'Personas', I: 'Método' }[c.charAt(0)] || 'Método';
}
const itTrim_ = f => { const s = String(f || ''); return s.length >= 7 ? s.slice(0, 4) + '-T' + Math.ceil(Number(s.slice(5, 7)) / 3) : ''; };
const itTrimTxt_ = k => { const m = /^(\d{4})-T(\d)$/.exec(k); return m ? m[2] + '.º trimestre de ' + m[1] : k; };
const itPrevio_ = k => { const m = /^(\d{4})-T(\d)$/.exec(k); if (!m) return ''; const t = Number(m[2]) - 1; return t ? m[1] + '-T' + t : (Number(m[1]) - 1) + '-T4'; };
const itNum_ = v => { const n = parseFloat(String(v || '').replace(',', '.')); return isNaN(n) ? null : n; };
const itCrit_ = v => { const m = /(\d+)\s*de\s*(\d+)/.exec(String(v || '')); return m ? [Number(m[1]), Number(m[2])] : [0, 0]; };

// ------------------------------------------------------------------ Datos del trimestre
function itDatos_(cod, clave) {
  cod = limpio_(cod);
  const todas = audLeer_(audHojaA_(), AUD_H).filter(a => a.ESTABLECIMIENTO === cod && a.CUMPLIMIENTO !== '' && !/^(Planificada|En curso)$/.test(a.ESTADO));
  if (!clave) { const ks = todas.map(a => itTrim_(a.FECHA)).filter(Boolean).sort(); clave = ks[ks.length - 1]; }
  const Aq = todas.filter(a => itTrim_(a.FECHA) === clave).sort((a, b) => String(a.FECHA).localeCompare(String(b.FECHA)));
  if (!Aq.length) return { ok: false, mensaje: 'No hay auditorías cerradas de ' + cod + ' en el ' + itTrimTxt_(clave || '') + '.' };
  const items = {}; audItems_().forEach(i => items[i.CODIGO] = i);
  const ids = Aq.map(a => a.ID_AUD), R = audLeer_(audHojaR_(), AUD_R_H).filter(r => ids.indexOf(r.ID_AUD) >= 0);
  const HH = audLeer_(audHojaH_(), AUD_HA_H), H = HH.filter(h => ids.indexOf(h.ID_AUD) >= 0);
  // Cumplimiento por eje (sin «No aplica» ni puntos de observación)
  const ejes = {}; R.filter(r => r.RESPUESTA !== 'NA' && !audEsObs_(items[r.CODIGO] || {})).forEach(r => { const e = (items[r.CODIGO] || {}).EJE || 's/d'; ejes[e] = ejes[e] || { c: 0, t: 0 }; ejes[e].t++; if (r.RESPUESTA !== 'NC') ejes[e].c++; });
  const porEje = Object.keys(ejes).sort().map(e => ({ eje: e, pct: Math.round(ejes[e].c * 100 / ejes[e].t), n: ejes[e].t }));
  const tot = Object.keys(ejes).reduce((s, e) => [s[0] + ejes[e].c, s[1] + ejes[e].t], [0, 0]), pct = tot[1] ? Math.round(tot[0] * 100 / tot[1]) : '';
  // Evolución: los últimos cuatro trimestres con auditorías (promedio de cumplimiento)
  const porTrim = {}; todas.forEach(a => { const k = itTrim_(a.FECHA), n = itNum_(a.CUMPLIMIENTO); if (!k || n == null || k > clave) return; (porTrim[k] = porTrim[k] || []).push(n); });
  const evol = Object.keys(porTrim).sort().slice(-4).map(k => ({ trim: k, pct: Math.round(porTrim[k].reduce((s, n) => s + n, 0) / porTrim[k].length) }));
  const ant = evol.length > 1 ? evol[evol.length - 2] : null;
  // Críticos cumplidos (suma de las auditorías del trimestre)
  const crit = Aq.reduce((s, a) => { const c = itCrit_(a.CRITICOS_OK); return [s[0] + c[0], s[1] + c[1]]; }, [0, 0]);
  // Hallazgos repetidos: mismo punto y lugar en el trimestre anterior
  const prevIds = todas.filter(a => itTrim_(a.FECHA) === itPrevio_(clave)).map(a => a.ID_AUD);
  const previos = HH.filter(h => prevIds.indexOf(h.ID_AUD) >= 0);
  H.forEach(h => { h.it = items[h.CODIGO] || {}; h.repetido = previos.some(p => p.CODIGO === h.CODIGO && p.LUGAR === h.LUGAR); h.eje = h.it.EJE || 's/d'; });
  // Observaciones de acopio (F3, G4): el texto que se registró
  const obsAcopio = R.filter(r => audEsObs_(items[r.CODIGO] || {}) && r.NOTA).map(r => ({ lugar: r.LUGAR, punto: (items[r.CODIGO] || {}).PUNTO || r.CODIGO, nota: r.NOTA }));
  // Plan de acción del establecimiento
  let plan = []; try { const hoy = audHoy_(), resp = 15; plan = planFilas_().filter(p => p.ESTABLECIMIENTO === cod).map(p => Object.assign(p, { efectivo: planEstado_(p, hoy, resp) })); } catch (e) {}
  const E = est_(cod) || {}, catA = parseInt(String((Aq.find(a => a.CATEGORIA) || {}).CATEGORIA || ''), 10);
  const cat = catA || audPerfiles_(cod).Establecimiento.cat;
  const primero = !todas.some(a => itTrim_(a.FECHA) < clave);
  // La capacitación (lectura pesada) solo se calcula si el informe lleva FODA
  let cap = null; if (/T4$/.test(clave) || primero) { try { cap = pDiagCapacitacion_(cod); } catch (e) {} }
  return { ok: true, cod: cod, clave: clave, E: E, cat: cat, Aq: Aq, R: R, H: H, items: items, porEje: porEje, pct: pct, evol: evol, ant: ant, crit: crit, obsAcopio: obsAcopio, plan: plan, cap: cap, primero: primero };
}

// ------------------------------------------------------------------ Gráfico como imagen (servicio Charts: rápido, sin hojas temporales)
function itGrafico_(tipo, titulo, filas, alto) {
  const dt = Charts.newDataTable().addColumn(Charts.ColumnType.STRING, filas[0][0]).addColumn(Charts.ColumnType.NUMBER, filas[0][1]);
  filas.slice(1).forEach(f => dt.addRow([String(f[0]), Number(f[1])]));
  const ch = (tipo === 'linea' ? Charts.newLineChart().setPointStyle(Charts.PointStyle.MEDIUM).setRange(0, 100) : Charts.newBarChart().setRange(0, 100))
    .setDataTable(dt.build()).setTitle(titulo).setColors(['#0D313F']).setLegendPosition(Charts.Position.NONE)
    .setDimensions(640, alto || 300).build();
  return ch.getAs('image/png');
}

// ------------------------------------------------------------------ Informe
// x: { cod, trim: 'AAAA-Tn' (opcional: si falta, el último trimestre con auditorías) }
function informeTrim_(x) {
  const t0 = Date.now(), tiempos = [], marca = k => tiempos.push(k + ' ' + Math.round((Date.now() - t0) / 1000) + ' s');
  const X = itDatos_(x.cod, x.trim); if (!X.ok) return X; marca('datos');
  if (!X.E.carpeta) return { ok: false, mensaje: 'El establecimiento no tiene carpeta en el sistema.' };
  const cfg = infConfig_(X.cod), C = cfg.C, nombre = X.E.nombre || X.cod, trimTxt = itTrimTxt_(X.clave);
  // Número: se reutiliza si el trimestre ya tenía informe (nueva revisión)
  const origen = 'TRIM-' + X.cod + '-' + X.clave, prev = (docRegistro_({}).filas || []).filter(f => String(f.v[11]) === origen && f.v[14] !== 'Anulado');
  let codigo, revision = 0;
  if (prev.length) { codigo = prev[0].v[0]; if (prev[0].v[12]) { const m = /Revisión (\d+)/.exec(String(prev[0].v[15] || '')); revision = m ? Number(m[1]) + 1 : 1; } }
  else { const n = docNumero_({ est: X.cod, bloque: 'RES', tipo: 'AU', asunto: 'Informe trimestral de auditoría de residuos · ' + trimTxt, origen: 'Sistema', idOrigen: origen, pedidoPor: Session.getActiveUser().getEmail() }); if (!n.ok) return n; codigo = n.codigo; }
  const hoy = Utilities.formatDate(new Date(), TZ, 'dd/MM/yyyy');
  const carpeta = carpeta_(DriveApp.getFolderById(X.E.carpeta), 'Informes');
  let doc; const notas = [];
  try {
    const titulo = codigo + (revision ? ' · Rev. ' + revision : '') + ' · Auditoría de residuos · ' + trimTxt + ' · ' + nombre;
    const plantilla = (/[-\w]{25,}/.exec(C.PLANTILLA_INFORME || '') || [])[0];
    if (plantilla) doc = DocumentApp.openById(DriveApp.getFileById(plantilla).makeCopy(titulo, carpeta).getId());
    else { doc = DocumentApp.create(titulo); DriveApp.getFileById(doc.getId()).moveTo(carpeta); }
    const b = doc.getBody(); b.clear();
    b.setPageWidth(595.3).setPageHeight(841.9).setMarginTop(60).setMarginBottom(56).setMarginLeft(62).setMarginRight(57);
    const base = {}; base[DocumentApp.Attribute.FONT_FAMILY] = INF2.FUENTE; base[DocumentApp.Attribute.FONT_SIZE] = 10.5; base[DocumentApp.Attribute.FOREGROUND_COLOR] = INF2.TEXTO; b.setAttributes(base);

    // Encabezado (tabla de control documental) y pie
    const enc = doc.getHeader() || doc.addHeader(), te = enc.appendTable([[' ', 'x', 'x'], [' ', 'x', 'x']]);
    te.setBorderColor('#C9D6DB').setBorderWidth(0.5);
    infCelda_(te.getCell(0, 0), C.LOGO_URL ? '' : 'HySL', 12, INF2.AZUL, true, 70); infCelda_(te.getCell(1, 0), '', 8, INF2.PATA, false, 70);
    infCelda_(te.getCell(0, 1), 'Auditoría de gestión de residuos · ' + trimTxt, 10, INF2.AZUL, true, 250); infCelda_(te.getCell(1, 1), C.ENCABEZADO_LINEA2 || '', 7.5, INF2.PATA, false, 250);
    infCelda_(te.getCell(0, 2), 'Código: ' + codigo, 8, INF2.AZUL, false, 156); infCelda_(te.getCell(1, 2), 'Emisión: ' + hoy + ' · Revisión: ' + revision, 8, INF2.AZUL, false, 156);
    if (C.LOGO_URL) try { const idL = (/[-\w]{25,}/.exec(C.LOGO_URL) || [])[0]; const im = te.getCell(0, 0).getChild(0).asParagraph().appendInlineImage(DriveApp.getFileById(idL).getBlob()); const k = 40 / im.getHeight(); im.setHeight(40).setWidth(Math.round(im.getWidth() * k)); } catch (e) {}
    if (enc.getNumChildren() > 1 && enc.getChild(0).getType() === DocumentApp.ElementType.PARAGRAPH && enc.getChild(0).asParagraph().getText() === '') enc.removeChild(enc.getChild(0));
    const pie = doc.getFooter();
    if (pie && pie.getText().indexOf('{{CODIGO}}') >= 0) pie.replaceText('\\{\\{CODIGO\\}\\}', codigo); else { const pf = doc.addFooter(); infEst_(pf.appendParagraph(codigo), 7.5, INF2.PATA, false); }

    const ya = {}, nota = (k, t) => { if (!t || ya[k]) return ''; notas.push(t); ya[k] = notas.length; return '[[NOTA' + notas.length + ']]'; };
    const normaDe = c => cfg.N[c] || c;
    const P = (t, o) => { o = o || {}; const p = b.appendParagraph(t || ''); infEst_(p, o.tam || 10.5, o.color || INF2.TEXTO, o.neg); p.setAlignment(o.izq ? DocumentApp.HorizontalAlignment.LEFT : DocumentApp.HorizontalAlignment.JUSTIFY).setLineSpacing(o.inter || 1.5).setSpacingAfter(o.desp == null ? 6 : o.desp).setSpacingBefore(o.antes || 0); return p; };
    const H2 = t => { const p = b.appendParagraph(t); p.setHeading(DocumentApp.ParagraphHeading.HEADING2); infEst_(p, 13, INF2.AZUL, true); p.setSpacingBefore(16).setSpacingAfter(6).setLineSpacing(1.15); return p; };
    const H3 = t => { const p = b.appendParagraph(t); p.setHeading(DocumentApp.ParagraphHeading.HEADING3); infEst_(p, 11, INF2.AZUL, true); p.setSpacingBefore(10).setSpacingAfter(4).setLineSpacing(1.15); return p; };
    const TAB = (f, a) => infTabla2_(b, f, a);
    const IMG = (blob, ancho) => { try { const im = b.appendImage(blob), k = (ancho || 470) / im.getWidth(); im.setWidth(Math.round(im.getWidth() * k)).setHeight(Math.round(im.getHeight() * k)); } catch (e) {} };
    const sinLetra = e => String(e).replace(/^[A-Z] · /, '');

    const lugares = Array.from(new Set(X.Aq.map(a => a.LUGARES))).filter(Boolean);
    const may = X.H.filter(h => /mayor/i.test(h.CLASIFICACION)), men = X.H.filter(h => /menor/i.test(h.CLASIFICACION));
    const altos = X.porEje.filter(e => e.pct >= 90), bajos = X.porEje.filter(e => e.pct < 70).sort((a, b) => a.pct - b.pct);
    const abiertas = X.plan.filter(p => !/Cumplida|Descartada/.test(p.efectivo)), vencidas = X.plan.filter(p => p.efectivo === 'Vencida');

    // ---------------- RESUMEN EJECUTIVO
    P('INFORME TRIMESTRAL', { tam: 8.5, color: INF2.PATA, neg: true, desp: 2, izq: true, inter: 1.1 });
    P('Auditoría de gestión de residuos', { tam: 20, color: INF2.AZUL, neg: true, desp: 2, izq: true, inter: 1.1 });
    P(nombre + ' · ' + trimTxt, { tam: 13, color: INF2.AZUL, neg: true, desp: 4, izq: true, inter: 1.1 });
    P('Destinatario: Dirección del establecimiento · Emisión: ' + hoy, { tam: 8.5, color: INF2.PATA, desp: 10, izq: true, inter: 1.1 });
    P('En el marco de las competencias de Higiene y Seguridad Laboral' + nota('competencias', C.NOTA_COMPETENCIAS || 'Ley 19.587; Decreto 351/79; Decreto 1338/96; Res. SRT 905/2015.') +
      ', se remite el resultado de las auditorías de gestión de residuos realizadas en el ' + trimTxt + '.');
    H3('Resumen ejecutivo');
    P('Durante el trimestre se realizaron ' + X.Aq.length + ' auditoría(s) en ' + lugares.length + ' lugar(es) del establecimiento. El cumplimiento general fue del ' + (X.pct === '' ? 's/d' : X.pct + ' %') +
      (X.ant ? ', frente al ' + X.ant.pct + ' % del trimestre anterior' : '') + (X.crit[1] ? ', con ' + X.crit[0] + ' de ' + X.crit[1] + ' puntos críticos cumplidos' : '') + '. ' +
      (altos.length ? 'Los mejores resultados se registraron en ' + lista(altos.map(e => minus(sinLetra(e.eje)))) + '. ' : '') +
      (bajos.length ? 'Las brechas se concentran en ' + lista(bajos.slice(0, 3).map(e => minus(sinLetra(e.eje)))) + '.' : 'No se registraron ejes con cumplimiento bajo.'));
    P((may.length ? 'Se identificaron ' + may.length + ' no conformidad(es) mayor(es), que requieren atención en 30 días, entre ellas: ' + may.slice(0, 3).map(h => minus(h.it.PUNTO || h.CODIGO) + ' (' + h.LUGAR + ')').join('; ') + '. ' : 'No se identificaron no conformidades mayores. ') +
      (men.length ? 'Además, ' + men.length + ' no conformidad(es) menor(es), con plazo de 90 días. ' : '') +
      (abiertas.length ? 'El plan de acción del establecimiento tiene ' + abiertas.length + ' acción(es) abierta(s)' + (vencidas.length ? ', ' + vencidas.length + ' de ellas vencida(s)' : '') + '. ' : '') +
      'Se solicita informar dentro de los ' + cfg.resp + ' días el responsable y la fecha prevista de cada recomendación.');
    b.appendPageBreak();

    // ---------------- 1. PRESENTACIÓN
    H2('1. Presentación');
    P('La auditoría trimestral verifica, con evidencia, el cumplimiento de la gestión de residuos en cada lugar del establecimiento, según su categoría y los servicios que tiene. Su objeto es la protección del personal que genera, separa, traslada y almacena residuos, expuesto a riesgo biológico, a lesiones con elementos cortopunzantes y a sustancias químicas' +
      nota('funciones', 'Ley 19.587, art. 4; Res. SRT 905/2015, Anexos I y II.') + ', y el cumplimiento de las obligaciones del establecimiento como generador' + nota('prov', normaDe('Ley XI N.º 35') + '; Ley 24.051.') + '.');

    // ---------------- 2. MÉTODO DE TRABAJO
    H2('2. Método de trabajo');
    const catsL = Array.from(new Set(X.Aq.map(a => String(a.CATEGORIA || '').trim()).filter(Boolean)));
    P('Se utilizó la lista de verificación de la categoría de cada lugar auditado (' + (catsL.length ? catsL.join('; ') : X.cat + ' · ' + (AUD_CATS[X.cat] || '')) + '), con los módulos que corresponden a cada uno. Cada punto se valoró como conforme, no conforme, observación o no aplica; un «no conforme» en un punto crítico es no conformidad mayor. El tiempo de acopio y la frecuencia de retiro se registran como observación, con la Res. MSN 134/2016 como criterio estandarizado' +
      nota('134', normaDe('Res. MSN 134/2016') + '. Ningún establecimiento de la red cuenta con cámara fría.') + '.');
    TAB([['Lugar', 'Tipo y modalidad', 'Fecha', 'Cumplimiento', 'Críticos']].concat(X.Aq.map(a => [a.LUGARES || 's/d', a.TIPO + (a.MODALIDAD ? ' · ' + a.MODALIDAD : ''), String(a.FECHA).split('-').reverse().join('/'), a.CUMPLIMIENTO || 's/d', a.CRITICOS_OK || '—'])), [150, 120, 65, 70, 65]);

    // ---------------- 3. DESCRIPCIÓN DE HECHOS
    H2('3. Descripción de hechos');
    P('Se describe lo observado en cada lugar, sin valoración normativa.');
    lugares.forEach((l, i) => {
      const hs = X.H.filter(h => h.LUGAR === l && !(/^observ/i.test(h.CLASIFICACION) && audEsObs_(h.it))), ob = X.obsAcopio.filter(o => o.lugar === l);   // la observación de acopio va una sola vez
      H3('3.' + (i + 1) + ' ' + (l === 'Establecimiento' ? 'Aspectos documentales' : l));
      if (!hs.length && !ob.length) { P('No se registraron hallazgos.'); return; }
      hs.forEach(h => P('• ' + h.CLASIFICACION + ': ' + h.DESCRIPCION + (h.repetido ? ' (se repite del trimestre anterior)' : '') + '.', { izq: true, desp: 3 }));
      ob.forEach(o => P('• Observación de acopio: ' + o.nota, { izq: true, desp: 3 }));
    });
    const fotos = []; may.forEach(h => { if (/^https?:/.test(h.EVIDENCIA)) fotos.push({ u: h.EVIDENCIA, h: { r: { sitio: h.LUGAR }, it: { ITEM: h.it.PUNTO || h.CODIGO } } }); });
    infFotos_(b, fotos.slice(0, INF2.MAX_FOTOS_CUERPO), 1, {});

    // ---------------- 4. ANÁLISIS DE LOS DATOS
    H2('4. Análisis de los datos');
    H3('4.1 Cumplimiento por eje');
    if (X.porEje.length) { try { IMG(itGrafico_('barra', 'Cumplimiento por eje (%)', [['Eje', 'Cumplimiento']].concat(X.porEje.map(e => [sinLetra(e.eje).replace(/ (y recolección|e identificación|y manifiesto|hasta el retiro|del personal|peligrosas)$/, ''), e.pct])), 90 + 56 * X.porEje.length)); } catch (e) { TAB([['Eje', 'Cumplimiento']].concat(X.porEje.map(e => [sinLetra(e.eje), e.pct + ' %'])), [340, 130]); } }
    if (X.evol.length > 1) { H3('4.2 Evolución trimestral'); try { IMG(itGrafico_('linea', 'Cumplimiento promedio por trimestre (%)', [['Trimestre', 'Cumplimiento']].concat(X.evol.map(e => [e.trim.replace('-', ' '), e.pct])), 260)); } catch (e) { TAB([['Trimestre', 'Cumplimiento']].concat(X.evol.map(e => [e.trim, e.pct + ' %'])), [200, 130]); } }
    P('Puntos críticos cumplidos en el trimestre: ' + (X.crit[1] ? X.crit[0] + ' de ' + X.crit[1] : 's/d') + '.');

    let nSec = X.evol.length > 1 ? 2 : 1;
    // Cinco porqués: no conformidades mayores y hallazgos repetidos (hasta 6)
    const cinco = X.H.filter(h => /mayor/i.test(h.CLASIFICACION) || h.repetido).slice(0, 6);
    if (cinco.length) {
      H3('4.' + (++nSec) + ' Análisis de causas: cinco porqués');
      P('Para cada no conformidad mayor y cada hallazgo que se repite, se busca la causa de fondo. Completar con el equipo del sector.');
      cinco.forEach(h => TAB([['Problema', h.DESCRIPCION + ' · ' + h.LUGAR]].concat([1, 2, 3, 4, 5].map(n => [n + '. ¿Por qué?', ''])).concat([['Causa raíz', ''], ['Acción sobre la causa', '']]), [120, 350]));
    }
    // Ishikawa: ejes con 3 o más hallazgos
    const porEjeH = {}; X.H.filter(h => !/mejora/i.test(h.CLASIFICACION)).forEach(h => (porEjeH[h.eje] = porEjeH[h.eje] || []).push(h));
    const ejesIsh = Object.keys(porEjeH).filter(e => porEjeH[e].length >= 3);
    if (ejesIsh.length) {
      H3('4.' + (++nSec) + ' Diagrama de causa y efecto (Ishikawa)');
      P('Los hallazgos ya están ubicados en la rama que les corresponde; revisar y agregar causas.');
      ejesIsh.forEach(e => {
        const hs = porEjeH[e], rama = r => hs.filter(h => itRama_(h.CODIGO) === r).map(h => '• ' + (h.it.PUNTO || h.CODIGO) + ' (' + h.LUGAR + ')').join('\n') || '—';
        const t = TAB([[IT_RAMAS[0], IT_RAMAS[1], IT_RAMAS[2]], [rama(IT_RAMAS[0]), rama(IT_RAMAS[1]), rama(IT_RAMAS[2])], ['EFECTO: ' + sinLetra(e) + ' con ' + hs.length + ' hallazgos', '', ''], [IT_RAMAS[3], IT_RAMAS[4], IT_RAMAS[5]], [rama(IT_RAMAS[3]), rama(IT_RAMAS[4]), rama(IT_RAMAS[5])]], [157, 157, 157]);
        try { [2, 3].forEach(i => { const row = t.getRow(i); for (let j = 0; j < 3; j++) { row.getCell(j).setBackgroundColor(i === 2 ? INF2.PATA : INF2.AZUL); const p = row.getCell(j).getChild(0).asParagraph(); infEst_(p, 8.8, '#FFFFFF', true); } }); } catch (er) {}
      });
    }
    // FODA: cuarto trimestre o primer informe
    if (/T4$/.test(X.clave) || X.primero) {
      H3('4.' + (++nSec) + ' FODA');
      P('Fortalezas y debilidades surgen de las auditorías; oportunidades y amenazas, del contexto. Revisar y completar.');
      const opor = [], amen = [];
      if (X.cap && X.cap.activos) (X.cap.pct >= 50 ? opor : amen).push('Personal capacitado en residuos en el último año: ' + String(X.cap.pct).replace('.', ',') + ' %');
      if (vencidas.length) amen.push(vencidas.length + ' acción(es) del plan vencida(s)');
      if (X.obsAcopio.length) amen.push('Acopio sin cámara fría: depende de la frecuencia de retiro');
      opor.push('[completar]'); amen.push('[completar]');
      TAB([['Fortalezas', 'Debilidades'], [altos.map(e => '• ' + sinLetra(e.eje) + ' (' + e.pct + ' %)').join('\n') || '[completar]', bajos.map(e => '• ' + sinLetra(e.eje) + ' (' + e.pct + ' %)').concat(may.slice(0, 3).map(h => '• ' + (h.it.PUNTO || h.CODIGO))).join('\n') || '[completar]'],
        ['Oportunidades', 'Amenazas'], [opor.map(s => '• ' + s).join('\n'), amen.map(s => '• ' + s).join('\n')]], [235, 235]);
    }
    // Ciclo de Deming: siempre
    H3('4.' + (++nSec) + ' Ciclo de mejora (Deming)');
    const nuevas = X.H.filter(h => h.EN_PLAN !== 'Sí' && !/Observación/.test(h.CLASIFICACION)).map(h => '• ' + (h.ACCION || 'Definir acción: ' + (h.it.PUNTO || h.CODIGO)) + ' (' + h.LUGAR + ')');
    const enCurso = abiertas.map(p => '• ' + p.RECOMENDACION + (p.efectivo === 'Vencida' ? ' (vencida)' : ''));
    const enTrim = f => itTrim_(String(f || '').slice(0, 10)) === X.clave;
    const verif = X.plan.filter(p => p.ESTADO === 'Cumplida' && enTrim(p.ACTUALIZADO)).map(p => '• ' + p.RECOMENDACION);
    const fijo = X.plan.filter(p => p.ESTADO === 'Cumplida' && enTrim(p.ACTUALIZADO) && /POE|procedim|capacit|instructivo|protocolo|cartel|señal/i.test(p.RECOMENDACION + ' ' + p.TIPO)).map(p => '• ' + p.RECOMENDACION);
    TAB([['Planificar', 'Hacer', 'Verificar', 'Actuar'], [nuevas.slice(0, 8).join('\n') || '—', enCurso.slice(0, 8).join('\n') || '—', verif.slice(0, 8).join('\n') || '—', fijo.slice(0, 8).join('\n') || '[completar: lo que se deja fijo]']], [118, 118, 118, 118]);

    // ---------------- 5. CONCLUSIÓN Y RECOMENDACIONES
    H2('5. Conclusión y recomendaciones');
    H3('5.1 Conclusión');
    P('El establecimiento ' + (X.pct === '' ? 'no registra resultados comparables en el trimestre' : 'alcanzó un cumplimiento del ' + X.pct + ' %') + (X.ant ? (X.pct > X.ant.pct ? ', con mejora respecto del trimestre anterior' : X.pct < X.ant.pct ? ', por debajo del trimestre anterior' : ', igual al trimestre anterior') : '') + '. ' +
      (may.length ? 'Las no conformidades mayores requieren atención prioritaria. ' : '') + (X.H.some(h => h.repetido) ? 'Algunos hallazgos se repiten del trimestre anterior, lo que indica causas que todavía no se abordaron. ' : '') +
      'El seguimiento se realizará en la próxima auditoría trimestral.');
    H3('5.2 Recomendaciones');
    const recs = may.concat(men);
    if (recs.length) TAB([['N.º', 'Recomendación', 'Lugar', 'Prioridad', 'Plazo técnico']].concat(recs.map((h, i) => [i + 1, h.ACCION || 'Resolver: ' + (h.it.PUNTO || h.CODIGO), h.LUGAR, /mayor/i.test(h.CLASIFICACION) ? 'Alta' : 'Media', /mayor/i.test(h.CLASIFICACION) ? '30 días' : '90 días'])), [34, 220, 90, 60, 66]);
    else P('No se registraron no conformidades: se sugiere sostener lo logrado.');
    P('Se solicita informar, dentro de los ' + cfg.resp + ' días de recibido este informe, el responsable y la fecha prevista de ejecución de cada recomendación.');

    // ---------------- CIERRE Y FIRMA
    P(C.TEXTO_CIERRE || 'Quedo a disposición para cualquier consulta, aclaración o requerimiento vinculado con el presente informe.', { antes: 14 });
    P('Celular: ' + (C.CONTACTO_CELULAR || 's/d') + ' · Correo electrónico: ' + (C.CONTACTO_CORREO || 's/d'), { izq: true, desp: 26 });
    P(C.FIRMA_NOMBRE || 'Belén Pellegrini', { neg: true, color: INF2.AZUL, izq: true, desp: 0, inter: 1.2 });
    P((C.FIRMA_TITULO || '') + (C.FIRMA_MATRICULA ? ' · ' + C.FIRMA_MATRICULA : ''), { tam: 9, izq: true, desp: 0, inter: 1.2 });
    if (C.CARGO) P(C.CARGO, { tam: 9, izq: true, desp: 0, inter: 1.2 });

    // ---------------- ANEXO FOTOGRÁFICO
    const resto = []; X.R.forEach(r => { if (/^https?:/.test(r.FOTO) && !fotos.slice(0, INF2.MAX_FOTOS_CUERPO).some(f => f.u === r.FOTO)) resto.push({ u: r.FOTO, h: { r: { sitio: r.LUGAR }, it: { ITEM: (X.items[r.CODIGO] || {}).PUNTO || r.CODIGO } } }); });
    if (resto.length) { b.appendPageBreak(); H2('Anexo · Registro fotográfico'); infFotos_(b, resto.slice(0, INF2.MAX_FOTOS), INF2.MAX_FOTOS_CUERPO + 1, {}); }

    if (b.getChild(0).getType() === DocumentApp.ElementType.PARAGRAPH && b.getChild(0).asParagraph().getText() === '') b.removeChild(b.getChild(0));
    doc.saveAndClose();
  } catch (err) { try { if (doc) DriveApp.getFileById(doc.getId()).setTrashed(true); } catch (e) {} throw err; }
  marca('documento'); const notasOk = infNotas_(doc.getId(), notas); marca('notas');
  const archivo = codigo + (revision ? ' · Rev. ' + revision : '') + ' · Auditoría de residuos · ' + trimTxt + ' · ' + nombre;
  const pdf = carpeta.createFile(DriveApp.getFileById(doc.getId()).getAs('application/pdf')).setName(archivo + '.pdf');
  docActualizar_({ codigo: codigo, documento: doc.getUrl(), pdf: pdf.getUrl(), estado: 'Emitido', motivo: revision ? 'Revisión ' + revision + ' (' + hoy + ')' : '' });
  marca('pdf'); Logger.log('Informe trimestral ' + codigo + ': ' + tiempos.join(' · '));
  return { ok: true, tiempos: tiempos.join(' · '), codigo: codigo, revision: revision, trimestre: trimTxt, doc: doc.getUrl(), pdf: pdf.getUrl(), notasAlPie: notasOk, auditorias: X.Aq.length };
}

// Trimestres con auditorías cerradas de un establecimiento (para elegir en el portal)
function informeTrimOpciones_(x) {
  const cod = limpio_(x.cod), A = audLeer_(audHojaA_(), AUD_H).filter(a => a.ESTABLECIMIENTO === cod && a.CUMPLIMIENTO !== '' && !/^(Planificada|En curso)$/.test(a.ESTADO));
  const m = {}; A.forEach(a => { const k = itTrim_(a.FECHA); if (k) m[k] = (m[k] || 0) + 1; });
  const reg = (docRegistro_({}).filas || []).filter(f => /^TRIM-/.test(String(f.v[11])) && f.v[14] !== 'Anulado');
  return { ok: true, trimestres: Object.keys(m).sort().reverse().map(k => { const r = reg.find(f => String(f.v[11]) === 'TRIM-' + cod + '-' + k); return { clave: k, texto: itTrimTxt_(k), auditorias: m[k], codigo: r ? r.v[0] : '', doc: r ? r.v[12] : '', pdf: r ? r.v[13] : '' }; }) };
}