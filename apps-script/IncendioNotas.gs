// ------------------------------------------------------------------ 7 · Incendio › Nota interna por extintores vencidos
// Archivo nuevo (07/11/2026, pedido de Belén): «necesito generar nota interna por cada CAPS/hospital/dependencia que tenga los
// extintores vencidos … con una tabla que indique cantidad de extintores, N.º de inventario, tipo, agente extintor, peso y fecha de vencimiento».
// Arma el BORRADOR de la nota interna con el modelo de DOCUMENTOS › LISTAS (el mismo de todas las notas internas HZT/HMH) y el texto
// modelo de Belén (función de los extintores, Ley 19.587 arts. 1, 4, 7 y 9; Dto. 351/79, Cap. 18, punto 7.1). Una nota por lugar:
// cada CAPS, hospital, dispositivo o ambulancias; en Sede ex ADOS, una por dependencia (Vacunatorio, PROSATE…).
// Entra un extintor si tiene la carga vencida o la prueba hidráulica vencida (no los dados de baja). Solo HZT y HMH.
// La nota queda en DOCUMENTOS › REGISTRO como «Borrador», con los ID en Observaciones («Extintores: EXT-…»): así el tablero sabe qué
// extintores ya están en una nota. El N.º lo asigna Mesa de Entradas: si no se indica, queda «s/n». No envía nada. No genera PDF.
// Usa DesviosAcciones.gs (dacListas_, dacDestinatario_, dacCarpeta_, DAC, DAC_MESES), Notas_portal.gs (NTP_LIBRO_ID) e Incendio.gs.
// Entra por Incendio.gs › incPortal_: «p_inc_notas» (lista) y «p_inc_nota» (genera). Respaldo sin GitHub: menú Sistema HyS › Incendio.
// Normativa: Ley 19.587, arts. 1, 4, 7 inc. g y 9 inc. g; Dto. 351/79, Cap. 18 (Anexo VII), punto 7.1.

const INCN = {
  TIPO_NOTA: 'Nota interna HZT/HMH',
  DESTINO: 'Dirección Asociada Administrativa',
  MODULO: 'Protección contra incendios',
  COLOR: '#3A4A52',
  AZUL: '#0D313F',
  PLAZO: '15',
  ESTS: ['HZT', 'HMH'],
  NOMBRES: { 'HMH|HMH': 'el Hospital María Humphreys', 'HZT|HZT Central': 'el Hospital Zonal Trelew «Dr. Adolfo Margara» (sede central)', 'HZT|Ambulancias': 'las ambulancias del Hospital Zonal Trelew' },
  PIE: 'Ley N.º 19.587 de Higiene y Seguridad en el Trabajo, arts. 1, 4, 7 inc. g y 9 inc. g; Decreto N.º 351/79, Capítulo 18 «Protección contra incendios» y Anexo VII, punto 7.1 «Condiciones generales de extinción».'
};

// Texto modelo de Belén (07/11/2026). En los lugares que no son hospital no se habla de cirugía. «todas las personas» → «todos» (regla de lenguaje de Belén).
function incnFundamento_(esHospital) {
  return [
    'Los extintores representan la primera línea de defensa contra incendios y, en un entorno donde se manipulan sustancias inflamables, se utilizan equipos eléctricos' + (esHospital ? ' y se realiza cirugía' : ' y se atiende a pacientes') + ', su presencia es esencial para controlar y extinguir incendios de manera rápida y eficiente. La pronta respuesta ante un incendio puede marcar la diferencia entre la vida y la muerte, así como evitar daños materiales significativos. Además de su función en la extinción de incendios, los extintores desempeñan un papel crucial en la prevención de la propagación del fuego, lo que minimiza el riesgo de evacuaciones masivas y el caos en un entorno ' + (esHospital ? 'hospitalario' : 'de atención de la salud') + '. Asimismo, permiten que el personal de seguridad y el personal médico actúen de manera efectiva en situaciones de emergencia, lo que contribuye a mantener la calma y la organización en momentos críticos.',
    'La legislación y regulaciones en materia de seguridad laboral, como la Ley de Higiene y Seguridad en el Trabajo y el Decreto 351/79, establecen la obligación de contar con extintores adecuados y en buen estado como parte integral de las medidas de seguridad en el trabajo. Cumplir con estas normativas no solo es un requisito legal, sino también una responsabilidad moral y ética para preservar la seguridad y la salud de todos los que dependen del ' + (esHospital ? 'hospital' : 'establecimiento') + ', ya sean pacientes, empleados o visitantes. El mantenimiento adecuado y la disponibilidad inmediata de extintores son pilares fundamentales en la creación de un entorno ' + (esHospital ? 'hospitalario' : 'de atención de la salud') + ' seguro y eficaz en la atención de la salud.',
    { t: 'La Ley N.º 19.587 de Higiene, Seguridad y Salud Ocupacional establece:', b: true },
    { t: 'Artículo 1.° - Las condiciones de higiene y seguridad en el trabajo se ajustarán, en todo el territorio de la República, a las normas de la presente ley y de las reglamentaciones que en su consecuencia se dicten.', i: true },
    { t: 'Artículo 4.° - La higiene y seguridad en el trabajo comprenderá las normas técnicas y medidas sanitarias, precautorias, de tutela o de cualquier otra índole que tengan por objeto: a) proteger la vida, preservar y mantener la integridad psicofísica de los trabajadores; b) prevenir, reducir, eliminar o aislar los riesgos de los distintos centros o puestos de trabajo; c) estimular y desarrollar una actitud positiva respecto de la prevención de los accidentes o enfermedades que puedan derivarse de la actividad laboral.', i: true },
    { t: 'Artículo 7.° - Las reglamentaciones de las condiciones de seguridad en el trabajo deberán considerar primordialmente: g) prevención y protección contra incendios y cualquier clase de siniestros.', i: true },
    { t: 'Artículo 9.° - Sin perjuicio de lo que determinen especialmente los reglamentos, son también obligaciones del empleador: g) instalar los equipos necesarios para afrontar los riesgos en caso de incendio o cualquier otro siniestro.', i: true },
    { t: 'El Decreto Reglamentario N.º 351/79, Capítulo 18 - Protección contra incendios, establece:', b: true },
    { t: '7. Condiciones de extinción: las condiciones de extinción constituyen el conjunto de exigencias destinadas a suministrar los medios que faciliten la extinción de un incendio en sus distintas etapas.', i: true },
    { t: '7.1. Condiciones generales de extinción. 7.1.1. Todo edificio deberá poseer matafuegos con un potencial mínimo de extinción equivalente a 1 A y 5 BC, en cada piso, en lugares accesibles y prácticos, distribuidos a razón de 1 cada 200 m2 de superficie cubierta o fracción. La clase de estos elementos se corresponderá con la clase de fuego probable.', i: true },
    { t: '7.1.2. La autoridad competente podrá exigir, cuando a su juicio la naturaleza del riesgo lo justifique, una mayor cantidad de matafuegos, así como también la ejecución de instalaciones fijas automáticas de extinción.', i: true }
  ];
}

// Extintores que ya están en una nota (no anulada): REGISTRO › Observaciones con «Extintores: EXT-…»
function incnIncluidos_() {
  const sh = SpreadsheetApp.openById(NTP_LIBRO_ID).getSheetByName('REGISTRO'), u = sh.getLastRow(), out = {};
  if (u < 4) return out;
  sh.getRange(4, 1, u - 3, 21).getValues().forEach(r => {
    if (/anulad/i.test(String(r[16])) || !/Extintores:/.test(String(r[20]))) return;
    const nro = String(r[4] || 's/n'), url = String(r[19] || ''), fecha = r[0] instanceof Date ? Utilities.formatDate(r[0], TZ, 'yyyy-MM-dd') : '';
    (String(r[20]).match(/EXT-[A-Z]+-\d+/g) || []).forEach(id => { out[id] = { nro: nro, url: url, fecha: fecha, estado: String(r[16] || '') }; });
  });
  return out;
}

// Nombre del lugar para el texto de la nota
const incnDe_ = n => /^el /.test(n) ? 'del ' + n.slice(3) : 'de ' + n;   // «de el» → «del»
function incnNombre_(g) {
  if (g.dep) return 'la ' + g.sitio + ' (' + g.dep + ')';
  if (INCN.NOMBRES[g.cod + '|' + g.sitio]) return INCN.NOMBRES[g.cod + '|' + g.sitio];
  if (/^caps$/i.test(g.tipoSitio)) return 'el CAPS ' + g.sitio.replace(/^CAPS\s+/i, '');
  if (/^dispositivo$/i.test(g.tipoSitio)) return 'el dispositivo ' + g.sitio;
  return g.sitio;
}

// Lugares con extintores vencidos (carga o prueba hidráulica), uno por lugar (y por dependencia en Sede ex ADOS)
function incnGrupos_() {
  const D = incDatos_(), hoy = incHoy_(), inc = incnIncluidos_(), G = {};
  D.ext.filter(e => INCN.ESTS.indexOf(e.ESTABLECIMIENTO) >= 0 && !/baja/i.test(e.ESTADO || '')).forEach(e => {
    const s = incEstadoExt_(e, hoy), carga = s.carga === 'vencida', ph = s.prueba === 'vencida'; if (!carga && !ph) return;
    const sit = D.sit.find(z => z.ESTABLECIMIENTO === e.ESTABLECIMIENTO && sinTildes_(z.SITIO) === sinTildes_(e.SITIO)) || {};
    const dep = (sit.DEPENDENCIAS || []).find(d => sinTildes_(d) === sinTildes_(e.SECTOR)) || '';
    const lugar = e.SITIO + (dep ? ' · ' + dep : ''), k = e.ESTABLECIMIENTO + '|' + lugar;
    const g = G[k] = G[k] || { cod: e.ESTABLECIMIENTO, sitio: e.SITIO, dep: dep, lugar: lugar, tipoSitio: limpio_(sit.TIPO_SITIO), ext: [] };
    g.ext.push({ ID: e.ID, puesto: limpio_(e.NRO_EXTINTOR), inv: limpio_(e.NRO_INVENTARIO) || 's/d', tipo: limpio_(e.TIPO) || 's/d', agente: limpio_(e.AGENTE) || 's/d',
      kg: limpio_(e.CAPACIDAD_KG) || 's/d', vto: incISO_(e.VTO_CARGA), ph: incISO_(e.PRUEBA_HIDRAULICA_VENCE), carga: carga, prueba: ph, nota: inc[e.ID] || null });
  });
  return Object.keys(G).map(k => { const g = G[k];
    g.ext.sort((a, b) => (Number(a.puesto) || 999) - (Number(b.puesto) || 999));
    g.nombre = incnNombre_(g); g.sinNota = g.ext.filter(x => !x.nota).length;
    const N = {}; g.ext.forEach(x => { if (x.nota) N[x.nota.url || x.nota.nro] = x.nota; }); g.notas = Object.keys(N).map(u => N[u]);
    return g; }).sort((a, b) => a.cod === b.cod ? a.lugar.localeCompare(b.lugar) : a.cod === 'HMH' ? -1 : 1);
}
function incnListar_() { try { return { ok: true, grupos: incnGrupos_() }; } catch (e) { return { ok: false, mensaje: String(e.message || e) }; } }

// x: { cod, lugar, nro: '' (s/n) o número, todos: true = también los que ya están en otra nota }
function incnNota_(x) {
  x = x || {};
  const g = incnGrupos_().find(z => z.cod === String(x.cod || '') && z.lugar === String(x.lugar || ''));
  if (!g) return { ok: false, mensaje: 'Ese lugar no tiene extintores vencidos.' };
  const E = x.todos ? g.ext : g.ext.filter(e => !e.nota);
  if (!E.length) return { ok: false, mensaje: 'Todos los extintores vencidos de ' + g.lugar + ' ya están en una nota. Si querés una nota nueva igual, usá «Generar otra».' };
  const LS = dacListas_(), tipo = LS.tipos.find(z => z.tipo === INCN.TIPO_NOTA);
  if (!tipo || !tipo.modelo) return { ok: false, mensaje: 'Falta el modelo de «' + INCN.TIPO_NOTA + '» en DOCUMENTOS › LISTAS (columna Y).' };
  const hoy = new Date(), anio = hoy.getFullYear(), nro = parseInt(String(x.nro || ''), 10) || '', sinNro = !nro;
  const dest = dacDestinatario_(INCN.DESTINO, LS), f = s => s ? s.split('-').reverse().join('/') : 's/d';
  const nC = E.filter(e => e.carga).length, nP = E.filter(e => e.prueba).length, esHosp = /^edificio$/i.test(g.tipoSitio);
  const asunto = (nC ? 'Recarga de extintores' : 'Prueba hidráulica de extintores') + (nC && nP ? ' y prueba hidráulica' : '') + ' · ' + g.lugar + (g.cod === 'HMH' ? '' : ' (' + g.cod + ')');
  const antecedentes = 'Relevamiento de extintores del Servicio de Higiene y Seguridad Laboral al ' + Utilities.formatDate(hoy, TZ, 'dd/MM/yyyy') + ' (Sistema HyS, módulo 7)';
  const carpeta = dacCarpeta_(dacCarpeta_(DriveApp.getFolderById(DAC.CARPETA_NOTAS), String(anio)), INCN.TIPO_NOTA.replace(/\//g, '-'));
  const nombre = 'Nota interna ' + (sinNro ? 's-n' : nro) + '-' + anio + ' · ' + INCN.DESTINO + ' · Extintores vencidos · ' + g.lugar;
  const copia = DriveApp.getFileById(tipo.modelo).makeCopy(nombre, carpeta), doc = DocumentApp.openById(copia.getId()), body = doc.getBody();
  const motivo = nC ? 'solicitar la revisión y la recarga de los extintores ' + incnDe_(g.nombre) + ' que tienen la carga vencida' + (nP ? ', y la prueba hidráulica de los que la tienen vencida' : '')
    : 'solicitar la revisión y la prueba hidráulica de los extintores ' + incnDe_(g.nombre) + ' que la tienen vencida';
  const mapa = { NRO_NOTA: (sinNro ? 's/n' : nro) + '/' + anio, FECHA: hoy.getDate() + ' de ' + DAC_MESES[hoy.getMonth()] + ' de ' + anio,
    DEST_NOMBRE: dest.nombre && !/^s\/d/.test(dest.nombre) ? dest.nombre : '[Nombre y apellido]', DEST_CARGO: dest.cargo || INCN.DESTINO, DEST_DEPENDENCIA: dest.dependencia || DAC.DEPENDENCIA,
    ASUNTO: asunto, ANTECEDENTES: antecedentes, MOTIVO: motivo };
  [body, doc.getHeader(), doc.getFooter()].forEach(p => { if (p) Object.keys(mapa).forEach(k => p.replaceText('\\{\\{' + k + '\\}\\}', String(mapa[k]).replace(/\$/g, '\\$'))); });
  const txt = el => { try { el.editAsText().setItalic(false).setForegroundColor(INCN.COLOR); } catch (e) {} return el; };
  const parDe = r => { let e = r && r.getElement(); while (e && e.getType() !== DocumentApp.ElementType.PARAGRAPH && e.getType() !== DocumentApp.ElementType.LIST_ITEM) e = e.getParent(); return e; };
  const parrafo = (idx, t, o) => { const p = body.insertParagraph(idx, t); p.setAlignment(DocumentApp.HorizontalAlignment.JUSTIFY).setLineSpacing(1.5).setSpacingAfter(o && o.i ? 3 : 6); txt(p);
    if (o && o.i) p.setIndentStart(18).setIndentFirstLine(0).editAsText().setItalic(true); if (o && o.b) p.editAsText().setBold(true); return p; };

  // Hechos: cantidad y tabla (N.º · N.º de inventario · tipo · agente · peso · vencimiento)
  const h = parDe(body.findText('\\[Hechos:'));
  if (h) {
    const num = n => (['', 'un', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez'][n] || String(n));
    txt(h.setText('En el relevamiento de extintores que realiza este Servicio, se constató que en ' + g.nombre + ' hay ' + num(E.length) + (E.length === 1 ? ' extintor' : ' extintores') +
      (nC && nP ? ' con la carga o la prueba hidráulica vencida (' + nC + ' con la carga vencida y ' + nP + ' con la prueba hidráulica vencida)' : nC ? ' con la carga vencida' : ' con la prueba hidráulica vencida') + '. El detalle es el siguiente:'));
    const conPh = nP > 0, cab = ['N.º', 'N.º de inventario', 'Tipo', 'Agente extintor', 'Peso (kg)', 'Vencimiento de la carga'].concat(conPh ? ['Vencimiento de la prueba hidráulica'] : []);
    const filas = [cab].concat(E.map((e, i) => [String(i + 1), e.inv, e.tipo, e.agente, String(e.kg).replace('.', ','), (e.vto ? f(e.vto) : 's/d') + (e.carga ? ' (vencida)' : '')]
      .concat(conPh ? [(e.ph ? f(e.ph) : 's/d') + (e.prueba ? ' (vencida)' : '')] : [])));
    filas.push(['Total: ' + E.length + (E.length === 1 ? ' extintor' : ' extintores')].concat(cab.slice(1).map(() => '')));
    const t = body.insertTable(body.getChildIndex(h) + 1, filas);
    t.setBorderColor('#B7C4CB').setBorderWidth(0.5);
    for (let r = 0; r < t.getNumRows(); r++) { const row = t.getRow(r);
      for (let c = 0; c < row.getNumCells(); c++) { const cell = row.getCell(c); cell.setPaddingTop(2).setPaddingBottom(2).setPaddingLeft(4).setPaddingRight(4);
        const tx = cell.editAsText(); tx.setFontFamily('Plus Jakarta Sans').setFontSize(8.5).setItalic(false).setForegroundColor(r === 0 ? '#FFFFFF' : INCN.COLOR).setBold(r === 0 || r === filas.length - 1);
        if (r === 0) cell.setBackgroundColor(INCN.AZUL); else if (r === filas.length - 1) cell.setBackgroundColor('#E8EEF1');
        try { cell.getChild(0).asParagraph().setAlignment(c === 0 && r < filas.length - 1 ? DocumentApp.HorizontalAlignment.CENTER : DocumentApp.HorizontalAlignment.LEFT).setLineSpacing(1).setSpacingAfter(0); } catch (e) {} } }
    const tras = body.insertParagraph(body.getChildIndex(t) + 1, ''); tras.setSpacingAfter(4);
  }
  // Fundamento: texto modelo de Belén (reemplaza el párrafo guía del modelo) y la nota al pie con la norma
  const fu = parDe(body.findText('\\[Fundamento:'));
  if (fu) {
    const F = incnFundamento_(esHosp); let idx = body.getChildIndex(fu);
    F.forEach((p, i) => { const o = typeof p === 'string' ? { t: p } : p;
      if (i === 0) { const tx = fu.editAsText(), largo = fu.getText().replace(/\s+$/, '').length; tx.deleteText(0, Math.max(0, largo - 1)); tx.insertText(0, o.t); txt(fu); }
      else parrafo(++idx, o.t, o); });
  }
  try { doc.getFootnotes().forEach(fn => { const c = fn.getFootnoteContents(); if (c.findText('\\[Norma específica')) { c.replaceText('\\[Norma específica[^\\]]*\\]', INCN.PIE); txt(c); } }); } catch (e) {}
  // Lo que se solicita
  const li1 = parDe(body.findText('\\[Primera acción')), li2 = parDe(body.findText('\\[Segunda acción'));
  const pedidos = [];
  if (nC) pedidos.push('La revisión y la recarga ' + (nC === 1 ? 'del extintor detallado' : 'de los ' + nC + ' extintores detallados') + ' con la carga vencida.');
  if (nP) pedidos.push('La prueba hidráulica ' + (nP === 1 ? 'del extintor' : 'de los ' + nP + ' extintores') + ' que la ' + (nP === 1 ? 'tiene' : 'tienen') + ' vencida.');
  pedidos.push('Mientras dure la recarga, el reemplazo transitorio de los extintores retirados, para que ' + g.nombre + ' no quede sin protección contra incendios (Decreto N.º 351/79, Anexo VII, punto 7.1.1).');
  if (li1) txt(li1.setText(pedidos[0]));
  if (li2) { txt(li2.setText(pedidos[1])); let ult = li2; pedidos.slice(2).forEach(p => { const li = body.insertListItem(body.getChildIndex(ult) + 1, li2.copy()); txt(li.setText(p)); ult = li; }); }
  const pl = body.findText('\\[30 / 90 / 180\\]'); if (pl) { const t = pl.getElement().asText(), s0 = pl.getStartOffset(); t.deleteText(s0, pl.getEndOffsetInclusive()); t.insertText(s0, INCN.PLAZO); t.setItalic(s0, s0 + INCN.PLAZO.length - 1, false).setForegroundColor(s0, s0 + INCN.PLAZO.length - 1, INCN.COLOR); }
  doc.saveAndClose();
  const url = copia.getUrl();

  // DOCUMENTOS › REGISTRO (Borrador; los ID de los extintores en Observaciones)
  const reg = LS.libro.getSheetByName('REGISTRO'), col = reg.getRange(4, 1, Math.max(1, reg.getMaxRows() - 3), 1).getValues();
  let fila = col.findIndex(r => r[0] === '' || r[0] === null); fila = fila < 0 ? reg.getMaxRows() + 1 : fila + 4;
  if (fila > reg.getMaxRows()) reg.insertRowsAfter(reg.getMaxRows(), 20);
  reg.getRange(fila, 1, 1, 4).setValues([[hoy, INCN.TIPO_NOTA, g.cod, INCN.MODULO]]);
  reg.getRange(fila, 9, 1, 4).setValues([[asunto, INCN.DESTINO + (dest.nombre && !/^s\/d/.test(dest.nombre) ? ' (' + dest.nombre + ')' : ''), antecedentes, 'Mesa de Entradas']]);
  reg.getRange(fila, 17).setValue('Borrador'); reg.getRange(fila, 19).setValue(INCN.MODULO); reg.getRange(fila, 20).setValue(url);
  reg.getRange(fila, 21).setValue('Generado por el sistema (7 · Incendio › Extintores vencidos · ' + g.lugar + '). Extintores: ' + E.map(e => e.ID).join(', ') + '.' + (sinNro ? ' Sin número (s/n): lo asigna Mesa de Entradas.' : ''));
  SpreadsheetApp.flush();
  // N.º: la columna tiene validación (pide el «Próximo N.º»): sin número queda vacía y la completa Mesa de Entradas
  if (!sinNro) { try { reg.getRange(fila, 5).setValue(nro); SpreadsheetApp.flush(); } catch (e) { try { reg.getRange(fila, 5).clearContent(); } catch (x) {} } }
  try { CacheService.getScriptCache().remove('inc_tablero'); } catch (e) {}
  return { ok: true, url: url, nombre: nombre, extintores: E.length };
}

// ------------------------------------------------------------------ Respaldo sin GitHub: menú «Sistema HyS › Incendio › Notas de extintores vencidos»
function menuNotasExtintores() {
  const G = incnGrupos_();
  const fila = (g, i) => '<tr><td><b>' + incnEsc_(g.lugar) + '</b><br><small>' + incnEsc_(g.cod) + ' · ' + g.ext.length + ' vencido(s)' + (g.sinNota < g.ext.length ? ' · ' + (g.ext.length - g.sinNota) + ' ya en nota' : '') + '</small>' +
    g.notas.map(n => '<br><small><a href="' + incnEsc_(n.url) + '" target="_blank">Nota ' + incnEsc_(n.nro) + ' (' + incnEsc_(n.estado || 'borrador') + ') ↗</a></small>').join('') + '</td>' +
    '<td><button onclick="gen(' + i + ',' + (g.sinNota ? 'false' : 'true') + ',this)">' + (g.sinNota ? 'Generar nota' : 'Generar otra') + '</button><div id="r' + i + '"></div></td></tr>';
  const html = '<div style="font-family:Arial,sans-serif;font-size:13px"><p>Lugares con extintores con la carga o la prueba hidráulica vencida. Cada nota queda como borrador (s/n) en DOCUMENTOS › REGISTRO.</p>' +
    (G.length ? '<table style="border-collapse:collapse;width:100%">' + G.map(fila).join('') + '</table>' : '<p><b>No hay extintores vencidos.</b></p>') +
    '<script>const G=' + JSON.stringify(G.map(g => ({ cod: g.cod, lugar: g.lugar }))) + ';function gen(i,todos,b){b.disabled=true;b.textContent="Generando…";google.script.run.withSuccessHandler(function(r){document.getElementById("r"+i).innerHTML=r.ok?"<a href=\\""+r.url+"\\" target=\\"_blank\\">Abrir la nota ↗</a>":"<span style=color:#b00>"+(r.mensaje||"Error")+"</span>";b.textContent="Listo";}).withFailureHandler(function(e){document.getElementById("r"+i).textContent=e.message;b.disabled=false;b.textContent="Reintentar";}).incnNotaMenu(G[i].cod,G[i].lugar,todos);}</script>' +
    '<style>td{border-bottom:1px solid #ddd;padding:6px;vertical-align:top}button{padding:6px 10px;cursor:pointer}</style></div>';
  SpreadsheetApp.getUi().showModalDialog(HtmlService.createHtmlOutput(html).setWidth(560).setHeight(520), 'Notas de extintores vencidos');
}
function incnNotaMenu(cod, lugar, todos) { return incnNota_({ cod: cod, lugar: lugar, todos: !!todos }); }
function incnEsc_(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]); }
