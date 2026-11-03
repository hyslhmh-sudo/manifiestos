// ------------------------------------------------------------------ 3 · Plagas › Nota interna por falta de producto
// Archivo nuevo (03/11/2026, pedido de Belén): «necesito generar una nota interna cada vez que no haya producto».
// Junta las visitas MIPyV cargadas con «No había producto (falta de insumo)» que todavía no figuran en ninguna nota y arma
// el BORRADOR de la nota interna con el modelo de DOCUMENTOS › LISTAS (mismo modelo que el resto de las notas internas):
// hechos (una línea por lugar y plaga, con las fechas), aclaración de que la falta de resolución se debe a no contar con
// los biocidas adecuados, y (opcional, marcado por defecto) la reiteración de que los operarios siguen sin EPP ni ropa de trabajo.
// La nota queda en DOCUMENTOS › REGISTRO como «Borrador», con los ID de las visitas en Observaciones («Visitas: V-…»):
// así esas visitas ya no se vuelven a ofrecer. El N.º lo asigna Mesa de Entradas: si no se indica, queda «s/n».
// No envía nada. Usa DesviosAcciones.gs (dacListas_, dacDestinatario_, dacCarpeta_), Modulo5.gs (plagMipyvLibro_, plagTabla_, plagFecha_)
// y Notas_portal.gs (NTP_LIBRO_ID). Entra por Portal.gs › portalAccion_: «p_psp_listar» y «p_psp_nota» (solo clave maestra).
// Normativa del texto: Ley 19.587, art. 8, inc. c; Dto. 351/79, Cap. 19; Res. SRT 299/2011.

const PSP = {
  MARCA: /no hab[ií]a producto/i,
  TIPO_NOTA: 'Nota interna HZT/HMH',
  MODULO: 'Plagas (MIPyV)',
  DESTINO: 'Jefatura de Servicios Técnicos y Complementarios',
  COLOR: '#3A4A52',
  BASE_ANT: 'NI 114/24 · NI 156/24 · NI 210/24 · NI 96/25 · NI 152/26 · NI 171/26 · NI 174/26 · NI 177/26 · NI 200/26',
  FUND: 'La Ley N.º 19.587 y su Decreto Reglamentario N.º 351/79 establecen que el empleador debe suministrar y mantener los elementos de protección personal adecuados al riesgo de cada tarea, y la Resolución SRT N.º 299/2011 exige dejar constancia de su entrega a cada trabajador.',
  NOTA_PIE: 'Ley N.º 19.587, art. 8, inc. c (suministro y mantenimiento de los equipos de protección personal); Decreto N.º 351/79, Capítulo 19, «Equipos y elementos de protección personal»; Resolución SRT N.º 299/2011, constancia de entrega de ropa de trabajo y elementos de protección personal.'
};

// Visitas ya incluidas en alguna nota (no anulada): REGISTRO › Observaciones con «V-…»
function pspIncluidas_() {
  const sh = SpreadsheetApp.openById(NTP_LIBRO_ID).getSheetByName('REGISTRO'), u = sh.getLastRow(), set = {};
  if (u < 4) return set;
  sh.getRange(4, 1, u - 3, 21).getValues().forEach(r => {
    if (/anulad/i.test(String(r[16]))) return;
    (String(r[20]).match(/V-\d+/g) || []).forEach(id => { set[id] = String(r[4] || 's/n'); });
  });
  return set;
}

function pspVisitas_() {
  const inc = pspIncluidas_();
  return plagTabla_(plagMipyvLibro_(), 'visitas').filter(v => PSP.MARCA.test(String(v.producto || ''))).map(v => ({
    id: String(v.id_visita), fecha: plagFecha_(v.fecha), lugar: limpio_(v.establecimiento), sector: limpio_(v.sector), plaga: limpio_(v.tipo_plaga) || 's/d',
    protocolo: limpio_(v.protocolo), operario: limpio_(v.operario), acompanante: limpio_(v.operario_acompanante), nota: inc[String(v.id_visita)] || ''
  })).sort((a, b) => a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0);
}

function pspListar_() { try { return { ok: true, visitas: pspVisitas_() }; } catch (e) { return { ok: false, mensaje: String(e.message || e) }; } }

// x: { ids: [ID de visitas], nro: '' (s/n) o número, epp: true/false }
function pspNota_(x) {
  x = x || {};
  const ids = (x.ids || []).map(String), todas = pspVisitas_(), V = todas.filter(v => ids.indexOf(v.id) >= 0).sort((a, b) => a.fecha < b.fecha ? -1 : 1);
  if (!V.length) return { ok: false, mensaje: 'Elegí al menos una visita sin producto.' };
  const LS = dacListas_(), tipo = LS.tipos.find(z => z.tipo === PSP.TIPO_NOTA);
  if (!tipo || !tipo.modelo) return { ok: false, mensaje: 'Falta el modelo de «' + PSP.TIPO_NOTA + '» en DOCUMENTOS › LISTAS (columna Y).' };
  const hoy = new Date(), anio = hoy.getFullYear(), nro = parseInt(String(x.nro || ''), 10) || '', sinNro = !nro, epp = x.epp !== false;
  const dest = dacDestinatario_(PSP.DESTINO, LS), f = s => s ? s.split('-').reverse().join('/') : 's/d';
  const asunto = 'Intervenciones de control de plagas sin resolver por falta de biocidas' + (epp ? '. Personal operativo sin EPP ni ropa de trabajo' : '');
  const antecedentes = PSP.BASE_ANT + pspAntecedentes_(anio) + ' · Registros MIPyV del ' + f(V[0].fecha) + ' al ' + f(V[V.length - 1].fecha);
  const carpeta = dacCarpeta_(dacCarpeta_(DriveApp.getFolderById(DAC.CARPETA_NOTAS), String(anio)), PSP.TIPO_NOTA.replace(/\//g, '-'));
  const nombre = 'Nota interna ' + (sinNro ? 's-n' : nro) + '-' + anio + ' · ' + PSP.DESTINO + ' · Intervenciones sin resolver por falta de biocidas' + (epp ? ' y falta de EPP y ropa de trabajo' : '');
  const copia = DriveApp.getFileById(tipo.modelo).makeCopy(nombre, carpeta), doc = DocumentApp.openById(copia.getId()), body = doc.getBody();
  const mapa = { NRO_NOTA: (sinNro ? 's/n' : nro) + '/' + anio, FECHA: hoy.getDate() + ' de ' + DAC_MESES[hoy.getMonth()] + ' de ' + anio,
    DEST_NOMBRE: dest.nombre && !/^s\/d/.test(dest.nombre) ? dest.nombre : '[Nombre y apellido]', DEST_CARGO: dest.cargo || PSP.DESTINO, DEST_DEPENDENCIA: dest.dependencia || DAC.DEPENDENCIA,
    ASUNTO: asunto, ANTECEDENTES: antecedentes,
    MOTIVO: 'informar las intervenciones de control de plagas que no pudieron resolverse por no contar con los biocidas adecuados' + (epp ? ', y reiterar que el personal operativo del Servicio continúa sin la provisión de elementos de protección personal (EPP) y ropa de trabajo' : '') };
  [body, doc.getHeader(), doc.getFooter()].forEach(p => { if (p) Object.keys(mapa).forEach(k => p.replaceText('\\{\\{' + k + '\\}\\}', String(mapa[k]).replace(/\$/g, '\\$'))); });
  const txt = el => { try { el.editAsText().setItalic(false).setForegroundColor(PSP.COLOR); } catch (e) {} return el; };
  const parDe = r => { let e = r && r.getElement(); while (e && e.getType() !== DocumentApp.ElementType.PARAGRAPH && e.getType() !== DocumentApp.ElementType.LIST_ITEM) e = e.getParent(); return e; };

  // Hechos: una línea por lugar y plaga, con todas las fechas y los casos
  const G = []; V.forEach(v => { let g = G.find(z => z.lugar === v.lugar && z.plaga === v.plaga); if (!g) G.push(g = { lugar: v.lugar, plaga: v.plaga, fechas: [], prot: [], ops: [] });
    g.fechas.push(f(v.fecha)); if (v.protocolo && g.prot.indexOf(v.protocolo) < 0) g.prot.push(v.protocolo); [v.operario, v.acompanante].forEach(o => { if (o && g.ops.indexOf(o) < 0) g.ops.push(o); }); });
  const ops = Array.from(new Set(V.reduce((a, v) => a.concat([v.operario, v.acompanante]), []).filter(Boolean)));
  const h = parDe(body.findText('\\[Hechos:'));
  if (h) {
    const n = V.length, num = ['', 'una', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez'][n] || String(n);
    txt(h.setText((V[0].fecha === V[n - 1].fecha ? 'El ' + f(V[0].fecha) : 'Entre el ' + f(V[0].fecha) + ' y el ' + f(V[n - 1].fecha)) + ', el personal operativo del Servicio' +
      (ops.length ? ' (' + ops.map(o => 'Sr. ' + o).join(' y ') + ')' : '') + ' registró en el sistema MIPyV ' + num + (n === 1 ? ' intervención en la que' : ' intervenciones en las que') +
      ' se constató la plaga, pero no se pudo aplicar el tratamiento por falta del biocida correspondiente:'));
    let idx = body.getChildIndex(h);
    G.forEach(g => {
      const p = body.insertParagraph(++idx, '• ' + g.fechas.join(', ').replace(/, ([^,]*)$/, ' y $1') + ' · ' + g.lugar + ' · ' + g.plaga.toLowerCase() + (g.prot.length ? ' (caso ' + g.prot.join(', ') + ')' : '') + ': sin producto para el tratamiento.');
      p.setIndentStart(18).setIndentFirstLine(0).setSpacingAfter(3).setAlignment(DocumentApp.HorizontalAlignment.JUSTIFY).setLineSpacing(1.5); txt(p);
    });
    const p2 = body.insertParagraph(++idx, 'En estos casos, la falta de resolución no responde a la tarea del personal ni a la planificación del Servicio, sino a no contar con los biocidas adecuados para cada plaga. Mientras no se provean, el problema persiste en los establecimientos y las intervenciones quedan limitadas a la inspección, la limpieza y las medidas físicas.');
    p2.setAlignment(DocumentApp.HorizontalAlignment.JUSTIFY).setLineSpacing(1.5).setSpacingAfter(6); txt(p2);
    if (epp) { const p3 = body.insertParagraph(++idx, 'Asimismo, pese a todos los reclamos efectuados (notas citadas en los antecedentes), los operarios continúan trabajando sin los elementos de protección personal y la ropa de trabajo correspondientes a estas tareas, que implican contacto con excrementos de aves, nidos, desagües cloacales y productos químicos.');
      p3.setAlignment(DocumentApp.HorizontalAlignment.JUSTIFY).setLineSpacing(1.5).setSpacingAfter(6); txt(p3); }
  }
  // Fundamento (solo con el reclamo de EPP) y su nota al pie
  const fu = parDe(body.findText('\\[Fundamento:'));
  if (fu) { if (epp) txt(fu.setText(PSP.FUND)); else fu.removeFromParent(); }
  try { doc.getFootnotes().forEach(fn => { const c = fn.getFootnoteContents(); if (c.findText('\\[Norma específica')) { c.replaceText('\\[Norma específica[^\\]]*\\]', PSP.NOTA_PIE); txt(c); } }); } catch (e) {}
  // Lo que se solicita
  const li1 = parDe(body.findText('\\[Primera acción')), li2 = parDe(body.findText('\\[Segunda acción'));
  const plagas = Array.from(new Set(V.map(v => v.plaga.toLowerCase()))).join(', ').replace(/, ([^,]*)$/, ' y $1');
  if (li1) txt(li1.setText('La provisión de los biocidas adecuados para las plagas detalladas (' + plagas + '), para completar las intervenciones pendientes.'));
  if (li2) {
    if (epp) { txt(li2.setText('La provisión de los elementos de protección personal y la ropa de trabajo del personal operativo de Higiene y Seguridad, con la constancia de entrega correspondiente.'));
      const li3 = body.insertListItem(body.getChildIndex(li2) + 1, li2.copy()); txt(li3.setText('Una fecha estimada de provisión, para reprogramar las intervenciones.')); }
    else txt(li2.setText('Una fecha estimada de provisión, para reprogramar las intervenciones.'));
  }
  const pl = body.findText('\\[30 / 90 / 180\\]'); if (pl) { const t = pl.getElement().asText(); t.deleteText(pl.getStartOffset(), pl.getEndOffsetInclusive()); t.insertText(pl.getStartOffset(), '15'); t.setItalic(pl.getStartOffset(), pl.getStartOffset() + 1, false).setForegroundColor(pl.getStartOffset(), pl.getStartOffset() + 1, PSP.COLOR); }
  doc.saveAndClose();
  const url = copia.getUrl();

  // DOCUMENTOS › REGISTRO
  const reg = LS.libro.getSheetByName('REGISTRO'), col = reg.getRange(4, 1, Math.max(1, reg.getMaxRows() - 3), 1).getValues();
  let fila = col.findIndex(r => r[0] === '' || r[0] === null); fila = fila < 0 ? reg.getMaxRows() + 1 : fila + 4;
  if (fila > reg.getMaxRows()) reg.insertRowsAfter(reg.getMaxRows(), 20);
  reg.getRange(fila, 1, 1, 4).setValues([[hoy, PSP.TIPO_NOTA, 'HZT', PSP.MODULO]]);
  reg.getRange(fila, 9, 1, 4).setValues([[asunto, PSP.DESTINO + (dest.nombre && !/^s\/d/.test(dest.nombre) ? ' (' + dest.nombre + ')' : ''), antecedentes, 'Mesa de Entradas']]);
  reg.getRange(fila, 17).setValue('Borrador'); reg.getRange(fila, 19).setValue(PSP.MODULO); reg.getRange(fila, 20).setValue(url);
  reg.getRange(fila, 21).setValue('Generado por el sistema (3 · Plagas › Sin producto). Visitas: ' + V.map(v => v.id).join(', ') + '.' + (sinNro ? ' Sin número (s/n): lo asigna Mesa de Entradas.' : ''));
  SpreadsheetApp.flush();
  let aviso = '';
  reg.getRange(fila, 5).setValue(sinNro ? 's/n' : nro);
  try { SpreadsheetApp.flush(); } catch (e) { aviso = 'No se pudo anotar el N.º en el registro de notas: completalo a mano.'; }
  return { ok: true, url: url, nombre: nombre, visitas: V.length, aviso: aviso };
}

// Notas anteriores del mismo tema (plagas o EPP) con número, del año, que no estén en la base fija
function pspAntecedentes_(anio) {
  try {
    const sh = SpreadsheetApp.openById(NTP_LIBRO_ID).getSheetByName('REGISTRO'), u = sh.getLastRow(); if (u < 4) return '';
    const yy = String(anio).slice(-2), ya = PSP.BASE_ANT, out = [];
    sh.getRange(4, 1, u - 3, 19).getValues().forEach(r => {
      const n = parseInt(String(r[4]), 10), d = r[0] instanceof Date ? r[0].getFullYear() : 0;
      if (!n || d !== anio || /anulad|borrador/i.test(String(r[16])) || !/plaga|epp/i.test(String(r[3]) + ' ' + String(r[18]))) return;
      const ref = 'NI ' + n + '/' + yy; if (ya.indexOf(ref) < 0 && out.indexOf(ref) < 0) out.push(ref);
    });
    return out.length ? ' · ' + out.join(' · ') : '';
  } catch (e) { return ''; }
}
