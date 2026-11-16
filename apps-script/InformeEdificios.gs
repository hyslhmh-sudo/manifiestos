/**
 * SISTEMA HyS · INFORME DEL RELEVAMIENTO DE EDIFICIOS · red Trelew (15/11/2026, pedido de Belén)
 * «Un informe de todos los CAPS y la red HZT que ya relevaron Javier y Paulo: tapa, índice, un capítulo por CAPS o dependencia
 *  con su ubicación, todas las fotos y los comentarios de Javier interpretados y bien redactados, formato institucional.»
 *
 * informeEdificios()       Arma el Google Doc (borrador v0, sin PDF) con:
 *                          · el texto redactado por HySL, en un JSON guardado en Drive (INF_EDIF.JSON): resumen ejecutivo, presentación,
 *                            método, un capítulo por lugar (situación por aspecto, otros riesgos, observaciones, aclaraciones), análisis,
 *                            conclusión, recomendaciones y notas normativas al pie;
 *                          · la ficha, los estados y TODAS las fotos de cada lugar, leídos de la hoja «relevamiento_edificio» del libro
 *                            MIPyV (Edificios.gs › edifLista_(); se toma el relevamiento más nuevo de cada lugar).
 * informeEdificiosFotos()  Inserta las fotos (tabla de 2 columnas por lugar, en lugar de la marca [[FOTOS:código]]). Si se corta por
 *                          tiempo (más de 4,5 min), volver a ejecutarla: sigue desde el lugar donde quedó.
 * El documento queda en Drive › … › carpeta de informes de la red (INF_EDIF.CARPETA). El PDF se exporta cuando Belén da el visto bueno.
 * Usa los formatos de Informes.gs (infConfig_, infEst_, infCelda_, infTabla2_, infNotas_) y el logo de HySL del pie (DGM_LOGO_PIE).
 */
const INF_EDIF = { JSON: '15tPk5797gDzwcT-DV5bV4LtFBcYkEVvr', CARPETA: '1utwg8StwNrmysye8lKvE3JVofr1ogt2P', PROP: 'INF_EDIF_DOC' };

function informeEdificios() {
  const idJson = INF_EDIF.JSON || PropertiesService.getScriptProperties().getProperty('INF_EDIF_JSON');
  const G = JSON.parse(DriveApp.getFileById(idJson).getBlob().getDataAsString('UTF-8'));
  const E = edifLista_(), ult = {};
  (E.filas || []).forEach(f => { if (!ult[f.lugar_id]) ult[f.lugar_id] = f; });   // vienen del más nuevo al más viejo
  const cfg = infConfig_('HZT'), C = cfg.C, CEN = DocumentApp.HorizontalAlignment.CENTER;
  const titulo = G.codigo + ' · ' + G.titulo + ' · borrador v0';
  const carpeta = DriveApp.getFolderById(INF_EDIF.CARPETA);
  const plantilla = (/[-\w]{25,}/.exec(C.PLANTILLA_INFORME || '') || [])[0];
  let doc;
  if (plantilla) doc = DocumentApp.openById(DriveApp.getFileById(plantilla).makeCopy(titulo, carpeta).getId());
  else { doc = DocumentApp.create(titulo); DriveApp.getFileById(doc.getId()).moveTo(carpeta); }
  const b = doc.getBody(); b.clear();
  b.setPageWidth(595.3).setPageHeight(841.9).setMarginTop(60).setMarginBottom(56).setMarginLeft(62).setMarginRight(57);
  const base = {}; base[DocumentApp.Attribute.FONT_FAMILY] = INF2.FUENTE; base[DocumentApp.Attribute.FONT_SIZE] = 10; base[DocumentApp.Attribute.FOREGROUND_COLOR] = INF2.TEXTO; b.setAttributes(base);

  // Encabezado (tabla de control documental, como los demás informes) y pie con el código y el logo de HySL
  const enc = doc.getHeader() || doc.addHeader();
  const te = enc.appendTable([[' ', 'x', 'x'], [' ', 'x', 'x']]);
  te.setBorderColor('#C9D6DB').setBorderWidth(0.5);
  infCelda_(te.getCell(0, 0), C.LOGO_URL ? '' : 'HySL', 12, INF2.AZUL, true, 70); infCelda_(te.getCell(1, 0), '', 8, INF2.PATA, false, 70);
  infCelda_(te.getCell(0, 1), 'Relevamiento de edificios · red Trelew', 10, INF2.AZUL, true, 250); infCelda_(te.getCell(1, 1), C.ENCABEZADO_LINEA2 || '', 7.5, INF2.PATA, false, 250);
  infCelda_(te.getCell(0, 2), 'Código: ' + G.codigo, 8, INF2.AZUL, false, 156); infCelda_(te.getCell(1, 2), 'Versión 0 (borrador)', 8, INF2.AZUL, false, 156);
  if (C.LOGO_URL) try { const idL = (/[-\w]{25,}/.exec(C.LOGO_URL) || [])[0]; const im = te.getCell(0, 0).getChild(0).asParagraph().appendInlineImage(DriveApp.getFileById(idL).getBlob()); const k = 40 / im.getHeight(); im.setHeight(40).setWidth(Math.round(im.getWidth() * k)); } catch (e) {}
  if (enc.getNumChildren() > 1 && enc.getChild(0).getType() === DocumentApp.ElementType.PARAGRAPH && enc.getChild(0).asParagraph().getText() === '') enc.removeChild(enc.getChild(0));
  const pie = doc.getFooter();
  if (pie && pie.getText().indexOf('{{CODIGO}}') >= 0) pie.replaceText('\\{\\{CODIGO\\}\\}', G.codigo);
  else { const pf = doc.addFooter(); infEst_(pf.appendParagraph(G.codigo), 7.5, INF2.PATA, false); }
  try { const pl = doc.getFooter().appendParagraph(''); pl.setAlignment(CEN); const img = pl.appendInlineImage(DriveApp.getFileById(DGM_LOGO_PIE).getBlob()); const w = 260; img.setHeight(Math.round(img.getHeight() * w / img.getWidth())); img.setWidth(w); } catch (e) {}

  const P = (t, o) => { o = o || {}; const p = b.appendParagraph(t || ''); infEst_(p, o.tam || 10, o.color || INF2.TEXTO, o.neg); p.setAlignment(o.cen ? CEN : o.izq ? DocumentApp.HorizontalAlignment.LEFT : DocumentApp.HorizontalAlignment.JUSTIFY).setLineSpacing(o.inter || 1.5).setSpacingAfter(o.desp == null ? 6 : o.desp).setSpacingBefore(o.antes || 0); if (o.it) p.setItalic(true); return p; };
  const H = (t, nivel, tam) => { const p = b.appendParagraph(t); p.setHeading(nivel); infEst_(p, tam, INF2.AZUL, true); p.setSpacingBefore(nivel === DocumentApp.ParagraphHeading.HEADING1 ? 6 : 12).setSpacingAfter(6).setLineSpacing(1.15); return p; };
  const H1 = t => H(t, DocumentApp.ParagraphHeading.HEADING1, 15), H2 = t => H(t, DocumentApp.ParagraphHeading.HEADING2, 12), H3 = t => H(t, DocumentApp.ParagraphHeading.HEADING3, 10.5);
  const TAB = (filas, anchos) => infTabla2_(b, filas, anchos);
  const fd = v => /^\d{4}-\d{2}-\d{2}/.test(v || '') ? v.slice(8, 10) + '/' + v.slice(5, 7) + '/' + v.slice(0, 4) : 's/d';

  // ---------------------------------------------------------------- Portada
  P('', { desp: 80 });
  P('Hospital Zonal Trelew «Dr. Adolfo Margara» · Hospital María Humphreys', { cen: true, tam: 10, color: INF2.PATA, desp: 2 });
  P('Servicio de Higiene y Seguridad Laboral', { cen: true, tam: 10, color: INF2.PATA, desp: 60 });
  P('INFORME TÉCNICO', { cen: true, tam: 11, color: INF2.PATA, neg: true, desp: 10 });
  P(G.titulo, { cen: true, tam: 24, color: INF2.AZUL, neg: true, inter: 1.15, desp: 14 });
  P(G.subtitulo, { cen: true, tam: 11, color: INF2.GRIS_TXT, inter: 1.3, desp: 70 });
  P(G.destinatario, { cen: true, tam: 10, color: INF2.TEXTO, desp: 6 });
  P(G.codigo + ' · Versión 0 (borrador) · ' + G.fecha_txt, { cen: true, tam: 9, color: INF2.PATA, desp: 30 });
  P('Borrador (versión 0) para revisión. Borrar este párrafo antes de firmar.', { cen: true, tam: 8.5, color: INF2.GRIS_TXT, it: true });
  b.appendPageBreak();

  // ---------------------------------------------------------------- Índice (lista; el índice automático se inserta desde Docs)
  const caps = G.capitulos || [], nCap0 = 3, nAna = nCap0 + caps.length;
  H1('Índice');
  ['Resumen ejecutivo', '1. Presentación', '2. Método de trabajo'].concat(caps.map((c, i) => (nCap0 + i) + '. ' + c.titulo))
    .concat([nAna + '. Análisis de los datos', (nAna + 1) + '. Conclusión', (nAna + 2) + '. Recomendaciones'])
    .forEach(t => P(t, { izq: true, inter: 1.3, desp: 2 }));
  P('[Para tener el índice con números de página: Insertar › Índice, y borrar esta lista.]', { izq: true, tam: 8.5, color: INF2.GRIS_TXT, it: true, antes: 8 });
  b.appendPageBreak();

  // ---------------------------------------------------------------- Resumen, presentación y método
  H1('Resumen ejecutivo'); (G.resumen || []).forEach(t => P(t));
  H1('1. Presentación'); (G.presentacion || []).forEach(t => P(t));
  H1('2. Método de trabajo'); (G.metodo || []).forEach(t => P(t));

  // ---------------------------------------------------------------- Un capítulo por CAPS o dependencia
  const fotos = {};
  caps.forEach((c, i) => {
    b.appendPageBreak();
    const f = ult[c.lugar_id] || {};
    H1((nCap0 + i) + '. ' + c.titulo);
    P('Ubicación: ' + (c.direccion || 's/d'), { izq: true, color: INF2.PATA, neg: true, desp: 8 });
    TAB([['Dato', 'Detalle'],
      ['Fecha del relevamiento', fd(f.fecha)],
      ['Relevaron', [f.operario, f.operario_acompanante].filter(Boolean).join(' y ') || 's/d'],
      ['Parte relevada', c.parte || f.parte || 's/d'],
      ['Prioridad asignada', f.prioridad || 's/d'],
      ['Agua · Desagües', (f.agua || 's/d') + ' · ' + (f.desagues || 's/d')],
      ['Canaletas · Techo' + (f.techo_tipo && f.techo_tipo !== 's/d' ? ' (' + f.techo_tipo.toLowerCase() + ')' : ''), (f.canaletas || 's/d') + ' · ' + (f.techos || 's/d')]], [150, 326]);
    H2('Situación observada');
    (c.temas || []).forEach(t => { H3(t[0] + ' · ' + t[1]); P(t[2]); });
    if (c.riesgos && c.riesgos.length) { H2('Otros riesgos'); c.riesgos.forEach(r => { const p = P(r[0] + ': ' + r[1]); p.editAsText().setBold(0, r[0].length, true); }); }
    H2('Observaciones generales'); P(c.generales || 's/d');
    if (c.aclaracion) P(c.aclaracion, { it: true, color: INF2.GRIS_TXT });
    if (c.novisto) { const p = P('No se pudo verificar: ' + c.novisto); p.editAsText().setBold(0, 21, true); }
    H2('Registro fotográfico');
    P('[[FOTOS:' + c.lugar_id + ']]', { izq: true });
    const L = []; [['agua', 'Agua'], ['desagues', 'Desagües'], ['canaletas', 'Canaletas y bajadas'], ['techos', 'Techo'], ['riesgos', 'Otros riesgos']]
      .forEach(([k, t]) => (f['fotos_' + k] || []).forEach(x => { if (x.id) L.push({ id: x.id, tema: t }); }));
    fotos[c.lugar_id] = L;
  });

  // ---------------------------------------------------------------- Análisis, conclusión y recomendaciones
  b.appendPageBreak();
  H1(nAna + '. Análisis de los datos');
  const A = G.analisis || [];
  if (A.length) P(A[0]);
  TAB([['Lugar', 'Agua', 'Desagües', 'Canaletas', 'Techo', 'Prioridad']].concat(caps.map(c => { const f = ult[c.lugar_id] || {}; return [c.titulo, f.agua || 's/d', f.desagues || 's/d', f.canaletas || 's/d', f.techos || 's/d', f.prioridad || 's/d']; })), [126, 70, 70, 70, 70, 70]);
  A.slice(1).forEach(t => P(t));
  H1((nAna + 1) + '. Conclusión'); (G.conclusion || []).forEach(t => P(t));
  H1((nAna + 2) + '. Recomendaciones');
  P('Las medidas se ordenan por plazo. Corresponde a la Dirección asignarlas y comunicar los plazos a cada área.');
  TAB([['Plazo', 'Medida', 'A cargo']].concat(G.recomendaciones || []), [70, 300, 106]);
  P(G.cierre, { antes: 14 });
  P('', { desp: 30 });
  (G.firma || []).forEach((t, i) => P(t, { izq: true, neg: i === 0, tam: i === 0 ? 10 : 9, color: i === 0 ? INF2.AZUL : INF2.GRIS_TXT, inter: 1.15, desp: 0 }));
  P(G.contacto, { izq: true, tam: 9, color: INF2.GRIS_TXT, inter: 1.15 });

  doc.saveAndClose();
  infNotas_(doc.getId(), G.notas || []);
  PropertiesService.getScriptProperties().setProperty(INF_EDIF.PROP, JSON.stringify({ doc: doc.getId(), fotos: fotos }));
  Logger.log('Documento creado: ' + doc.getUrl() + ' · ahora se insertan las fotos.');
  informeEdificiosFotos();
}

// Inserta las fotos de cada lugar en tablas de 2 columnas. Si se corta por tiempo, volver a ejecutar: sigue donde quedó.
function informeEdificiosFotos() {
  const st = JSON.parse(PropertiesService.getScriptProperties().getProperty(INF_EDIF.PROP) || '{}');
  if (!st.doc) { Logger.log('Primero ejecutar informeEdificios().'); return; }
  const t0 = Date.now(), CEN = DocumentApp.HorizontalAlignment.CENTER;
  let total = 0;
  for (const lid of Object.keys(st.fotos || {})) {
    if (Date.now() - t0 > 270000) { Logger.log('Se cortó por tiempo: volver a ejecutar informeEdificiosFotos() para seguir.'); return; }
    const doc = DocumentApp.openById(st.doc), b = doc.getBody();
    const f = b.findText('\\[\\[FOTOS:' + lid.replace(/[-]/g, '\\-') + '\\]\\]'); if (!f) continue;
    const par = f.getElement().getParent(), L = st.fotos[lid] || [];
    if (!L.length) { par.asParagraph().setText('No se adjuntaron fotografías en este relevamiento.'); doc.saveAndClose(); continue; }
    const filas = []; for (let i = 0; i < L.length; i += 2) filas.push([' ', ' ']);
    const t = b.insertTable(b.getChildIndex(par), filas); t.setBorderWidth(0);
    L.forEach((x, i) => {
      const c = t.getCell(Math.floor(i / 2), i % 2); c.setWidth(238).setPaddingTop(4).setPaddingBottom(4).setPaddingLeft(4).setPaddingRight(4);
      const p = c.getChild(0).asParagraph(); p.setText(''); p.setAlignment(CEN);
      try { const im = p.appendInlineImage(infEdifImg_(x.id)), w = im.getWidth(), h = im.getHeight(), k = Math.min(226 / w, 240 / h); im.setWidth(Math.round(w * k)).setHeight(Math.round(h * k)); }
      catch (e) { p.setText('(foto no disponible)'); }
      const cap = c.appendParagraph('Foto ' + (i + 1) + ' · ' + x.tema); infEst_(cap, 8, INF2.PATA, false); cap.setAlignment(CEN).setSpacingAfter(8).setLineSpacing(1.1);
      total++;
    });
    if (L.length % 2) { const c = t.getCell(t.getNumRows() - 1, 1); c.getChild(0).asParagraph().setText(''); c.setWidth(238); }
    b.removeChild(par);
    doc.saveAndClose();
  }
  Logger.log('Listo: fotos insertadas (' + total + ' en esta ejecución). ' + DocumentApp.openById(st.doc).getUrl());
}

// Imagen de Drive reducida (miniatura de 1000 px) para que el documento no pese demasiado; si falla, el archivo original.
function infEdifImg_(id) {
  const tok = ScriptApp.getOAuthToken();
  try {
    const r = UrlFetchApp.fetch('https://www.googleapis.com/drive/v3/files/' + id + '?fields=thumbnailLink', { headers: { Authorization: 'Bearer ' + tok }, muteHttpExceptions: true });
    const l = JSON.parse(r.getContentText()).thumbnailLink;
    if (l) { const r2 = UrlFetchApp.fetch(l.replace(/=s\d+$/, '=s1000'), { headers: { Authorization: 'Bearer ' + tok }, muteHttpExceptions: true }); if (r2.getResponseCode() === 200) return r2.getBlob(); }
  } catch (e) {}
  return DriveApp.getFileById(id).getBlob();
}
