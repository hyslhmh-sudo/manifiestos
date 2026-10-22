/**
 * SISTEMA HyS · MÓDULO 1 · RESIDUOS · DESVÍOS DEL RECORRIDO: ACCIONES Y SEGUIMIENTO (versión 0, 22/10/2026)
 * Pedido de Belén (22/10/2026): cada desvío que registran los operarios de Star Union en el recorrido de retiro del HMH lleva
 * una acción de Higiene y Seguridad (nota al servicio, a Servicios Generales, a la jefatura, a Star Union, pedido de contenedores,
 * capacitación, seguimiento, solo registro…) y un seguimiento hasta verificar que se corrigió.
 *
 * Decisiones de Belén (22/10/2026):
 *  · Una acción puede abarcar varios desvíos (por ejemplo, una sola nota a Star Union con los desvíos de la semana).
 *  · Las notas se generan como BORRADOR con el modelo de nota interna y quedan en DOCUMENTOS › REGISTRO (Estado «Borrador»):
 *    ella las revisa y las envía. Nunca se envían correos.
 *  · Un desvío se cierra recién cuando se verifica en el lugar que se corrigió (o con «Solo registro», cuando no era un error).
 *  · Plazos según la gravedad (hoja PLAZOS): para tomar la acción y para verificar después de la acción.
 *  · Verifican: Belén (portal), Melani («Mi establecimiento») y los operarios en el próximo recorrido; lo que dicen los operarios
 *    queda «para confirmar» por HyS.
 *  · Si un lugar acumula desvíos (PLAZOS › ESCALAR_VECES en ESCALAR_DIAS) o un desvío persiste, se sugiere la nota a la jefatura.
 *  · Melani no ve las acciones.
 *
 * Dónde está todo: planilla «DESVÍOS RESIDUOS HMH · Registro (v0)» (la misma de la carga de los operarios):
 *  · REGISTROS: columnas ESTADO_GESTION, VENCE, ACCIONES y ULTIMO_SEGUIMIENTO (las mantiene el sistema; se pueden corregir a mano).
 *  · ACCIONES: una fila por acción (con el enlace a la nota, si la hay).  · SEGUIMIENTOS: una fila por verificación.
 *  · TIPOS_ACCION: tipos de acción, destinatario sugerido, texto del motivo y de lo que se pide en la nota (editable).
 *  · PLAZOS: días por gravedad y regla para sugerir escalar.
 * Normativa: Ley 19.587 y Dto. 351/79; Ley 24.051 y Dto. 831/93; Ley XI N.º 35 (Código Ambiental del Chubut);
 * Res. MSN 134/2016 (Directrices Nacionales GREAS).
 * Entra por Portal.gs › portalAccion_ (acciones «p_desv_…», solo con la clave maestra).
 */
const DAC = {
  LIBRO: '14bK84HUpTXXGcBBQ737SUScFWHOykUh9V50VTpiVCXw',   // DESVÍOS RESIDUOS HMH · Registro (v0)
  EST: 'HMH',
  CARPETA_NOTAS: '1O_vf2fuL-wuXp9MPsaXhXStzfqb1PJH0',       // MÓDULO 2 · DOCUMENTOS › Notas
  TIPO_NOTA: 'Nota interna HZT/HMH',
  DEPENDENCIA: 'Hospital Zonal Trelew «Dr. Adolfo Margara» y Hospital María Humphreys',
  ESTADOS: { SIN: 'Sin acción', SEG: 'En seguimiento', OPER: 'Corregido según operario (confirmar)', OK: 'Cerrado · corregido', NADA: 'Cerrado · sin acción' },
  FUNDAMENTO: 'La Ley N.º 24.051 de Residuos Peligrosos y su Decreto Reglamentario N.º 831/93, la Ley XI N.º 35 (Código Ambiental de la Provincia del Chubut) ' +
    'y la Resolución del Ministerio de Salud de la Nación N.º 134/2016 (Directrices Nacionales para la Gestión de Residuos en Establecimientos de Atención de la Salud) ' +
    'establecen que los residuos se separan en el lugar donde se generan, se acondicionan en recipientes adecuados y permanecen contenidos hasta su retiro. ' +
    'La Ley N.º 19.587 de Higiene y Seguridad en el Trabajo y su Decreto Reglamentario N.º 351/79 exigen mantener condiciones de trabajo que protejan al personal que manipula los residuos.'
};
const DAC_MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

// ------------------------------------------------------------------ LECTURA
function dacSS_() { return SpreadsheetApp.openById(DAC.LIBRO); }
function dacTabla_(ss, nombre) {
  const sh = ss.getSheetByName(nombre); if (!sh || sh.getLastRow() < 2) return { sh: sh, H: sh ? sh.getRange(1, 1, 1, Math.max(1, sh.getLastColumn())).getValues()[0].map(h => String(h).trim()) : [], filas: [] };
  const v = sh.getDataRange().getValues(), H = v.shift().map(h => String(h).trim());
  return { sh: sh, H: H, filas: v.map((r, i) => { const o = { _fila: i + 2 }; H.forEach((h, j) => { if (h) o[h] = r[j]; }); return o; }) };
}
const dacFecha_ = v => v instanceof Date ? v : (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(String(v)) ? new Date(String(v).replace(/^(\d{1,2})\/(\d{1,2})\/(\d{4}).*/, '$3-$2-$1') + 'T12:00:00') : (/^\d{4}-\d{2}-\d{2}/.test(String(v)) ? new Date(String(v).slice(0, 10) + 'T12:00:00') : null));
const dacTxtF_ = d => d ? Utilities.formatDate(d, TZ, 'yyyy-MM-dd') : '';
const dacMas_ = (d, n) => { const x = new Date(d.getTime()); x.setDate(x.getDate() + Number(n || 0)); return x; };

function dacPlazos_(ss) {
  const T = dacTabla_(ss, 'PLAZOS'), p = { grav: {}, escalarVeces: 3, escalarDias: 30 };
  T.filas.forEach(o => {
    const g = limpio_(o.GRAVEDAD);
    if (g === 'ESCALAR_VECES') p.escalarVeces = Number(o.DIAS_ACCION) || 3;
    else if (g === 'ESCALAR_DIAS') p.escalarDias = Number(o.DIAS_ACCION) || 30;
    else if (g) p.grav[g] = { accion: Number(o.DIAS_ACCION) || 7, seguimiento: Number(o.DIAS_SEGUIMIENTO) || 7 };
  });
  if (!p.grav['s/d']) p.grav['s/d'] = { accion: 7, seguimiento: 7 };
  return p;
}
function dacTipos_(ss) {
  return dacTabla_(ss, 'TIPOS_ACCION').filas.filter(o => limpio_(o.TIPO) && o.ACTIVO !== 'No').map(o => ({
    tipo: limpio_(o.TIPO), nota: o.GENERA_NOTA === 'Sí', destinatario: limpio_(o.DESTINATARIO), numero: limpio_(o.NUMERO),
    motivo: limpio_(o.MOTIVO), pedido: limpio_(o.PEDIDO), cierra: o.CIERRA === 'Sí', ayuda: limpio_(o.AYUDA) }));
}

// Todo lo necesario para la pantalla: desvíos con su estado, plazos, acciones y seguimientos
function dacDatos_(ss) {
  ss = ss || dacSS_();
  const R = dacTabla_(ss, 'REGISTROS'), A = dacTabla_(ss, 'ACCIONES'), S = dacTabla_(ss, 'SEGUIMIENTOS'), P = dacPlazos_(ss);
  const hoy = new Date(); hoy.setHours(12, 0, 0, 0);
  const acc = {}, seg = {};
  A.filas.forEach(a => String(a.DESVIOS || '').split(/[;,\s]+/).filter(Boolean).forEach(id => (acc[id] = acc[id] || []).push({
    id: limpio_(a.ID), fecha: dacTxtF_(dacFecha_(a.FECHA)), tipo: limpio_(a.TIPO), destinatario: limpio_(a.DESTINATARIO), detalle: limpio_(a.DETALLE),
    nota: limpio_(a.NOTA_CODIGO), url: limpio_(a.NOTA_URL), quien: limpio_(a.HECHA_POR) })));
  S.filas.forEach(s => { const id = limpio_(s.DESVIO); if (!id) return; (seg[id] = seg[id] || []).push({ fila: s._fila, fecha: dacTxtF_(dacFecha_(s.FECHA)), resultado: limpio_(s.RESULTADO),
    quien: limpio_(s.QUIEN), origen: limpio_(s.ORIGEN), obs: limpio_(s.OBS), confirmado: limpio_(s.CONFIRMADO) }); });
  const L = R.filas.filter(o => limpio_(o.ID)).map(o => {
    const f = dacFecha_(o.FECHA_CARGA) || dacFecha_(o.FECHA_OBSERVACION), grav = limpio_(o.GRAVEDAD_HYS) || limpio_(o.GRAVEDAD_REGLA) || (limpio_(o.GRAVEDAD_INFORMANTE) !== 's/d' ? limpio_(o.GRAVEDAD_INFORMANTE) : '') || 's/d';   // HyS > reglas (REGLAS_GRAVEDAD) > operario
    const pl = P.grav[grav] || P.grav['s/d'];
    let estado = limpio_(o.ESTADO_GESTION) || DAC.ESTADOS.SIN;
    let vence = dacFecha_(o.VENCE);
    if (!vence && estado === DAC.ESTADOS.SIN && f) vence = dacMas_(f, pl.accion);
    const cerrado = /^Cerrado/.test(estado);
    return { fila: o._fila, ID: limpio_(o.ID), FECHA: dacTxtF_(f), HORA: o.HORA instanceof Date ? Utilities.formatDate(o.HORA, TZ, 'HH:mm') : limpio_(o.HORA),
      PUNTO: limpio_(o.PUNTO_COD), PISO: limpio_(o.PISO), SERVICIO: limpio_(o.SERVICIO), UBICACION: limpio_(o.UBICACION),
      DETALLE_UBICACION: limpio_(o.DETALLE_UBICACION) === 's/d' ? '' : limpio_(o.DETALLE_UBICACION),
      TIPOS: limpio_(o.TIPOS_DESVIO), RESIDUO: limpio_(o.TIPO_RESIDUO), DESCRIPCION: limpio_(o.DESCRIPCION), CAUSA: limpio_(o.CAUSA),
      CONTENEDORES: limpio_(o.CONTENEDORES), AISLAMIENTO: limpio_(o.AISLAMIENTO), LESION: limpio_(o.LESION), REITERADO: limpio_(o.REITERADO),
      OPERARIO: limpio_(o.OPERARIO), OPERARIO_COD: limpio_(o.OPERARIO_COD), FOTOS: String(o.FOTOS || '').match(/https?:\/\/[^,\s]+/g) || [],
      GRAVEDAD: grav, GRAVEDAD_HYS: limpio_(o.GRAVEDAD_HYS), GRAVEDAD_FUENTE: limpio_(o.GRAVEDAD_HYS) ? 'HyS' : limpio_(o.GRAVEDAD_REGLA) ? 'regla' : 'operario', SEGREGACION: limpio_(o.SEGREGACION), ORIGEN_SUGERIDO: limpio_(o.ORIGEN_SUGERIDO), ORIGEN_HYS: limpio_(o.ORIGEN_HYS),
      ESTADO: estado, VENCE: cerrado ? '' : dacTxtF_(vence), vencido: !cerrado && !!vence && vence < hoy,
      ACCIONES: acc[limpio_(o.ID)] || [], SEGUIMIENTOS: (seg[limpio_(o.ID)] || []).map(s => { const c = Object.assign({}, s); delete c.fila; return c; }),
      ULTIMO_SEGUIMIENTO: limpio_(o.ULTIMO_SEGUIMIENTO), _f: f };
  });
  // Sugerir escalar: el lugar acumula desvíos en el período o el desvío persiste después de una acción
  const lim = dacMas_(hoy, -P.escalarDias);
  L.forEach(d => {
    const mismos = L.filter(x => x.PUNTO === d.PUNTO && x._f && x._f >= lim).length;
    const persiste = d.SEGUIMIENTOS.some(s => s.resultado === 'Persiste');
    d.escalar = /^Cerrado/.test(d.ESTADO) ? '' : persiste ? 'Persiste después de la acción' : (mismos >= P.escalarVeces ? mismos + ' desvíos en este lugar en ' + P.escalarDias + ' días' : '');
  });
  L.forEach(d => delete d._f);
  return { R: R, A: A, S: S, P: P, L: L };
}

// ------------------------------------------------------------------ ESCRITURA EN REGISTROS
function dacSet_(R, fila, campos) {
  Object.keys(campos).forEach(k => { const j = R.H.indexOf(k); if (j >= 0) R.sh.getRange(fila, j + 1).setValue(campos[k]); });
}
function dacProximoId_(A) {
  let max = 0; A.filas.forEach(a => { const n = parseInt(String(a.ID || '').replace(/\D/g, ''), 10); if (n > max) max = n; });
  return 'AC-' + ('000' + (max + 1)).slice(-4);
}

// ------------------------------------------------------------------ NOTA (borrador con el modelo de nota interna)
function dacListas_() {
  const doc = SpreadsheetApp.openById(NTP_LIBRO_ID), hl = doc.getSheetByName('LISTAS'), ul = hl.getLastRow();
  const tipos = hl.getRange('W2:AA20').getValues().filter(f => String(f[0]).trim()).map(f => ({ tipo: String(f[0]).trim(), texto: String(f[1]).trim() || 'Nota N.º', modelo: String(f[2]).trim(), base: Number(f[3]) || 0, anioBase: Number(f[4]) || 0 }));
  const dest = ul >= 2 ? hl.getRange('R2:U' + ul).getValues().filter(f => String(f[0]).trim()).map(f => ({ etiqueta: String(f[0]).trim(), nombre: limpio_(f[1]), cargo: limpio_(f[2]), dependencia: limpio_(f[3]) })) : [];
  return { libro: doc, tipos: tipos, dest: dest };
}
function dacDestinatario_(etiqueta, LS) {
  const k = String(etiqueta || '').toLowerCase().trim();
  let d = LS.dest.find(x => x.etiqueta.toLowerCase() === k);
  if (d) return d;
  try {   // BASE COMÚN › CONTACTOS (unidad de HZT/HMH)
    const sh = pBC_().getSheetByName('CONTACTOS');
    if (sh && sh.getLastRow() >= 6) {
      const v = sh.getRange(6, 1, sh.getLastRow() - 5, 5).getValues();
      const f = v.find(r => /^(HZT|HMH)$/.test(String(r[0]).trim()) && String(r[2]).trim().toLowerCase() === k);
      if (f) return { etiqueta: etiqueta, nombre: limpio_(f[4]), cargo: limpio_(f[3]).replace(/\/a\b/g, '') || etiqueta, dependencia: DAC.DEPENDENCIA };
    }
  } catch (e) {}
  return { etiqueta: etiqueta, nombre: '', cargo: etiqueta, dependencia: DAC.DEPENDENCIA };
}
function dacProximoNro_(LS, tipo, anio) {
  const t = LS.tipos.find(x => x.tipo === tipo) || { base: 0, anioBase: 0 };
  let max = anio === t.anioBase ? t.base : 0;
  const sh = LS.libro.getSheetByName('REGISTRO'), u = sh.getLastRow();
  if (u >= 4) sh.getRange(4, 1, u - 3, 5).getValues().forEach(f => { const n = parseInt(String(f[4]).split('/')[0], 10); if (f[1] === tipo && f[0] instanceof Date && f[0].getFullYear() === anio && n > max) max = n; });
  return max + 1;
}
function dacCarpeta_(padre, nombre) { const it = padre.getFoldersByName(nombre); return it.hasNext() ? it.next() : padre.createFolder(nombre); }
function dacSinCursiva_(par) { try { par.editAsText().setItalic(false); } catch (e) {} }

// desvios: lista de objetos de dacDatos_().L · t: tipo de TIPOS_ACCION · x: { destinatario, asunto, nro, fundamento, motivo, pedido, antecedentes }
function dacCrearNota_(desvios, t, x, LS) {
  const tipo = LS.tipos.find(z => z.tipo === DAC.TIPO_NOTA); if (!tipo || !tipo.modelo) throw new Error('Falta el modelo de «' + DAC.TIPO_NOTA + '» en DOCUMENTOS › LISTAS (columna Y).');
  const hoy = new Date(), anio = hoy.getFullYear();
  const etiqueta = limpio_(x.destinatario), dest = dacDestinatario_(etiqueta, LS);
  const nroPedido = limpio_(x.nro);
  const nro = /^s\/?n$/i.test(nroPedido) ? 's/n' : (parseInt(nroPedido, 10) || dacProximoNro_(LS, DAC.TIPO_NOTA, anio));
  const sinNro = nro === 's/n';
  const asunto = limpio_(x.asunto) || ('Desvíos en la gestión de residuos · ' + (t.tipo === 'Nota al servicio' ? etiqueta : 'Hospital María Humphreys'));
  const carpeta = dacCarpeta_(dacCarpeta_(DriveApp.getFolderById(DAC.CARPETA_NOTAS), String(anio)), DAC.TIPO_NOTA.replace(/\//g, '-'));
  const nombre = tipo.texto.replace(/\s*N\.º$/, '') + ' ' + (sinNro ? 's-n' : nro) + '-' + anio + ' · ' + etiqueta + ' · ' + asunto;
  const copia = DriveApp.getFileById(tipo.modelo).makeCopy(nombre, carpeta), doc = DocumentApp.openById(copia.getId()), body = doc.getBody();
  const mapa = { NRO_NOTA: (sinNro ? 's/n' : nro) + '/' + anio, CODIGO: tipo.texto + ' ' + (sinNro ? 's/n' : nro) + '/' + anio, SITIO: 'HMH', PROBLEMATICA: 'Residuos',
    FECHA: hoy.getDate() + ' de ' + DAC_MESES[hoy.getMonth()] + ' de ' + anio,
    DEST_NOMBRE: dest.nombre && !/^s\/d/.test(dest.nombre) ? dest.nombre : '[Nombre y apellido]', DEST_CARGO: dest.cargo || etiqueta, DEST_DEPENDENCIA: dest.dependencia || DAC.DEPENDENCIA,
    ASUNTO: asunto, ANTECEDENTES: limpio_(x.antecedentes) || 'no se registran', MOTIVO: limpio_(x.motivo) || t.motivo || '[motivo de la nota]' };
  [body, doc.getHeader(), doc.getFooter()].forEach(p => { if (p) Object.keys(mapa).forEach(k => p.replaceText('\\{\\{' + k + '\\}\\}', String(mapa[k]).replace(/\$/g, '\\$'))); });

  // Hechos: un párrafo de introducción y un punto por desvío (con enlace a la foto)
  const h = body.findText('\\[Hechos:');
  if (h) {
    let par = h.getElement(); while (par && par.getType() !== DocumentApp.ElementType.PARAGRAPH) par = par.getParent();
    if (par) {
      par.setText('Durante el recorrido de retiro interno de residuos, el personal de la empresa de limpieza registró los siguientes desvíos:'); dacSinCursiva_(par);
      let idx = body.getChildIndex(par);
      desvios.forEach(d => {
        const f = d.FECHA ? d.FECHA.split('-').reverse().join('/') : 's/d';
        const lugar = [d.PISO, d.SERVICIO, d.UBICACION].filter(Boolean).join(' · ') + (d.DETALLE_UBICACION ? ' (' + d.DETALLE_UBICACION + ')' : '');
        let txt = f + (d.HORA ? ', ' + d.HORA + ' h' : '') + ' · ' + lugar + ': ' + d.TIPOS + '.' + (d.RESIDUO && d.RESIDUO !== 's/d' ? ' Residuo: ' + d.RESIDUO + '.' : '') +
          (d.DESCRIPCION && d.DESCRIPCION !== 's/d' ? ' ' + d.DESCRIPCION.replace(/\.?$/, '.') : '') + (d.CAUSA ? ' Motivo informado: ' + d.CAUSA + (d.CONTENEDORES ? ' (' + d.CONTENEDORES + ')' : '') + '.' : '') +
          ' (Registro ' + d.ID + ')';
        const li = body.insertListItem(++idx, txt); li.setGlyphType(DocumentApp.GlyphType.BULLET); dacSinCursiva_(li);
        if (d.FOTOS.length) { const ini = li.getText().length; li.appendText(' · foto'); li.editAsText().setLinkUrl(ini + 3, ini + 6, d.FOTOS[0]); }
      });
    }
  }
  // Fundamento normativo
  const fu = body.findText('\\[Fundamento:');
  if (fu) {
    let par = fu.getElement(); while (par && par.getType() !== DocumentApp.ElementType.PARAGRAPH && par.getType() !== DocumentApp.ElementType.LIST_ITEM) par = par.getParent();
    if (par) { if (x.fundamento === false || x.fundamento === 'No') par.removeFromParent(); else { par.setText(DAC.FUNDAMENTO); dacSinCursiva_(par); } }
  }
  // Lo que se solicita (separado por «|» en TIPOS_ACCION › PEDIDO)
  const pedidos = String(limpio_(x.pedido) || t.pedido || '').split('|').map(s => s.trim()).filter(Boolean);
  const p1 = body.findText('\\[Primera acción'), p2 = body.findText('\\[Segunda acción');
  const item = r => { let e = r && r.getElement(); while (e && e.getType() !== DocumentApp.ElementType.LIST_ITEM) e = e.getParent(); return e; };
  const li1 = item(p1), li2 = item(p2);
  if (li1 && pedidos.length) {
    li1.setText(pedidos[0]); dacSinCursiva_(li1);
    let ultimo = li1;
    pedidos.slice(1).forEach((s, i) => {
      if (i === 0 && li2) { li2.setText(s); dacSinCursiva_(li2); ultimo = li2; }
      else { const n = body.insertListItem(body.getChildIndex(ultimo) + 1, ultimo.copy()); n.setText(s); dacSinCursiva_(n); ultimo = n; }
    });
    if (pedidos.length < 2 && li2) li2.removeFromParent();
  }
  doc.saveAndClose();
  const url = copia.getUrl();

  // DOCUMENTOS › REGISTRO (mismas columnas que la aplicación de notas)
  const reg = LS.libro.getSheetByName('REGISTRO'), col = reg.getRange(4, 1, Math.max(1, reg.getMaxRows() - 3), 1).getValues();
  let fila = col.findIndex(r => r[0] === '' || r[0] === null); fila = fila < 0 ? reg.getMaxRows() + 1 : fila + 4;
  if (fila > reg.getMaxRows()) reg.insertRowsAfter(reg.getMaxRows(), 20);
  reg.getRange(fila, 1, 1, 4).setValues([[hoy, DAC.TIPO_NOTA, 'HMH', 'Residuos']]);
  reg.getRange(fila, 9, 1, 3).setValues([[asunto, etiqueta, limpio_(x.antecedentes)]]);
  reg.getRange(fila, 17).setValue('Borrador');
  reg.getRange(fila, 19).setValue('Desvíos del recorrido (HMH)');
  reg.getRange(fila, 20).setValue(url);
  reg.getRange(fila, 21).setValue('Generado por el sistema desde «Desvíos: acciones y seguimiento» (' + desvios.map(d => d.ID).join(', ') + ').' + (sinNro ? ' Sin número (s/n): completar N.º si corresponde.' : ''));
  SpreadsheetApp.flush();
  // El N.º va aparte: la columna E tiene validación (solo el número que indica «Próximo N.º»); las notas s/n la dejan vacía
  let aviso = '';
  if (!sinNro) { try { reg.getRange(fila, 5).setValue(nro); SpreadsheetApp.flush(); } catch (e) { aviso = 'No se pudo anotar el N.º ' + nro + ' en el registro de notas (' + (e.message || e) + '): completalo a mano.'; } }
  return { codigo: mapa.CODIGO, url: url, nombre: nombre, aviso: aviso };
}

// ------------------------------------------------------------------ ACCIONES DEL PORTAL
function dacPortal_(accion, x, quien) {
  quien = limpio_(quien) || 'Belén Pellegrini (HyS)';
  if (accion === 'p_desv_listar') {
    const ss = dacSS_(), D = dacDatos_(ss);
    let destinatarios = [];
    try { destinatarios = dacListas_().dest.map(d => d.etiqueta); } catch (e) {}
    const L = D.L.slice().reverse().map(d => { const c = Object.assign({}, d); delete c.fila; return c; });
    const cuenta = f => L.filter(f).length;
    return { ok: true, desvios: L, tipos: dacTipos_(ss), destinatarios: destinatarios, plazos: D.P,
      resumen: { sinAccion: cuenta(d => d.ESTADO === DAC.ESTADOS.SIN), vencidos: cuenta(d => d.vencido), seguimiento: cuenta(d => d.ESTADO === DAC.ESTADOS.SEG),
        confirmar: cuenta(d => d.ESTADO === DAC.ESTADOS.OPER), cerrados: cuenta(d => /^Cerrado/.test(d.ESTADO)), escalar: cuenta(d => !!d.escalar) },
      estados: DAC.ESTADOS, planilla: 'https://docs.google.com/spreadsheets/d/' + DAC.LIBRO + '/edit' };
  }
  try { CacheService.getScriptCache().remove('dac_avisos'); } catch (e) {}
  if (accion === 'p_desv_accion') return conLock_(() => dacAccion_(x, quien));
  if (accion === 'p_desv_seguimiento') return conLock_(() => dacSeguimiento_(x, quien, 'HyS'));
  if (accion === 'p_desv_confirmar') return conLock_(() => dacConfirmar_(x, quien));
  if (accion === 'p_desv_clasificar') return conLock_(() => dacClasificar_(x));
  if (accion === 'p_desv_reporte') { const S = dacSupervision_(); return { ok: true, html: dacReporteHtml_(S.reporte), reporte: S.reporte, config: dacConfigRep_() }; }
  if (accion === 'p_desv_reporte_enviar') return dacEnviarReporte_(true);
  return null;
}

// x = { ids: ['DR-0041', …], tipo, destinatario, detalle, nro, asunto, fundamento, motivo, pedido }
function dacAccion_(x, quien) {
  const ss = dacSS_(), D = dacDatos_(ss), tipos = dacTipos_(ss), t = tipos.find(z => z.tipo === limpio_(x.tipo));
  if (!t) return { ok: false, mensaje: 'Elegí qué acción tomar.' };
  const ids = (x.ids || []).map(limpio_).filter(Boolean), sel = D.L.filter(d => ids.indexOf(d.ID) >= 0);
  if (!sel.length) return { ok: false, mensaje: 'Marcá al menos un desvío.' };
  const hoy = new Date();
  // Grupos: «Nota al servicio» y «Capacitación al servicio» van por servicio; el resto, todos juntos
  const porServicio = /\(servicio del lugar\)/i.test(t.destinatario) && !limpio_(x.destinatario);
  const grupos = {};
  sel.forEach(d => { const k = porServicio ? (d.SERVICIO || 's/d') : (limpio_(x.destinatario) || t.destinatario || ''); (grupos[k] = grupos[k] || []).push(d); });
  const LS = t.nota ? dacListas_() : null, hechas = [];
  Object.keys(grupos).forEach(dest => {
    const G = grupos[dest];
    // Antecedentes: notas anteriores de estos mismos desvíos
    const ant = Array.from(new Set([].concat.apply([], G.map(d => d.ACCIONES.filter(a => a.nota).map(a => a.nota))))).join('; ');
    let nota = null;
    if (t.nota) nota = dacCrearNota_(G, t, { destinatario: dest, asunto: x.asunto, nro: limpio_(x.nro) || t.numero, fundamento: x.fundamento, motivo: x.motivo, pedido: x.pedido, antecedentes: ant }, LS);
    const id = dacProximoId_(dacTabla_(ss, 'ACCIONES'));
    const grav = G.map(d => (D.P.grav[d.GRAVEDAD] || D.P.grav['s/d']).seguimiento), venceSeg = t.cierra ? '' : dacMas_(hoy, Math.min.apply(null, grav));
    D.A.sh.appendRow([id, hoy, t.tipo, dest, G.map(d => d.ID).join('; '), limpio_(x.detalle), nota ? nota.codigo : '', nota ? nota.url : '', quien, venceSeg, '']);
    G.forEach(d => {
      const prev = d.ACCIONES.map(a => a.id);
      dacSet_(D.R, d.fila, { ESTADO_GESTION: t.cierra ? DAC.ESTADOS.NADA : DAC.ESTADOS.SEG, VENCE: venceSeg, ACCIONES: prev.concat([id]).join('; ') });
    });
    hechas.push({ id: id, destinatario: dest, desvios: G.map(d => d.ID), nota: nota });
  });
  return { ok: true, hechas: hechas };
}

// x = { ids: [...], resultado: 'Corregido' | 'Persiste', obs } · origen: HyS | Melani | Operario
function dacSeguimiento_(x, quien, origen) {
  const ss = dacSS_(), D = dacDatos_(ss), res = limpio_(x.resultado);
  if (['Corregido', 'Persiste'].indexOf(res) < 0) return { ok: false, mensaje: 'Elegí si se corrigió o si persiste.' };
  const ids = (x.ids || []).map(limpio_).filter(Boolean), sel = D.L.filter(d => ids.indexOf(d.ID) >= 0);
  if (!sel.length) return { ok: false, mensaje: 'No encontré esos desvíos.' };
  const hoy = new Date(), confirma = origen !== 'Operario';
  sel.forEach(d => {
    D.S.sh.appendRow([hoy, d.ID, res, quien, origen, limpio_(x.obs), confirma ? 'Sí' : 'Pendiente', confirma ? quien : '']);
    const pl = D.P.grav[d.GRAVEDAD] || D.P.grav['s/d'], ult = Utilities.formatDate(hoy, TZ, 'dd/MM/yyyy') + ' · ' + res + ' (' + origen + ')';
    if (res === 'Corregido') dacSet_(D.R, d.fila, confirma ? { ESTADO_GESTION: DAC.ESTADOS.OK, VENCE: '', ULTIMO_SEGUIMIENTO: ult } : { ESTADO_GESTION: DAC.ESTADOS.OPER, ULTIMO_SEGUIMIENTO: ult });
    else {   // Persiste: si ya tenía acción, se vuelve a verificar en el plazo de seguimiento; si estaba cerrado, se reabre
      const c = { ULTIMO_SEGUIMIENTO: ult };
      if (confirma && (d.ESTADO === DAC.ESTADOS.SEG || d.ESTADO === DAC.ESTADOS.OPER || /^Cerrado/.test(d.ESTADO))) { c.ESTADO_GESTION = DAC.ESTADOS.SEG; c.VENCE = dacMas_(hoy, pl.seguimiento); }
      dacSet_(D.R, d.fila, c);
    }
  });
  return { ok: true };
}

// Lo que dijo un operario: HyS confirma (se cierra) o no (vuelve a seguimiento). x = { id, confirmar: true|false }
function dacConfirmar_(x, quien) {
  const ss = dacSS_(), D = dacDatos_(ss), d = D.L.find(z => z.ID === limpio_(x.id));
  if (!d) return { ok: false, mensaje: 'No encontré ese desvío.' };
  const si = x.confirmar === true || x.confirmar === 'Sí';
  D.S.filas.filter(s => limpio_(s.DESVIO) === d.ID && limpio_(s.CONFIRMADO) === 'Pendiente').forEach(s => {
    D.S.sh.getRange(s._fila, 7, 1, 2).setValues([[si ? 'Sí' : 'No', quien]]); });
  const pl = D.P.grav[d.GRAVEDAD] || D.P.grav['s/d'];
  dacSet_(D.R, d.fila, si ? { ESTADO_GESTION: DAC.ESTADOS.OK, VENCE: '' } : { ESTADO_GESTION: DAC.ESTADOS.SEG, VENCE: dacMas_(new Date(), pl.seguimiento) });
  return { ok: true };
}

// Clasificación de HyS: gravedad y origen (columnas GRAVEDAD_HYS y ORIGEN_HYS)
function dacClasificar_(x) {
  const ss = dacSS_(), D = dacDatos_(ss), d = D.L.find(z => z.ID === limpio_(x.id));
  if (!d) return { ok: false, mensaje: 'No encontré ese desvío.' };
  const c = {}; if (x.gravedad != null) c.GRAVEDAD_HYS = limpio_(x.gravedad); if (x.origen != null) c.ORIGEN_HYS = limpio_(x.origen);
  dacSet_(D.R, d.fila, c);
  return { ok: true };
}

// ------------------------------------------------------------------ AVISOS PARA «LO QUE REQUIERE ATENCIÓN»
function dacAvisos_() {
  const ca = CacheService.getScriptCache(), c = ca.get('dac_avisos'); if (c) return JSON.parse(c);
  const out = [];
  try {
    const L = dacDatos_().L, venc = L.filter(d => d.vencido), conf = L.filter(d => d.ESTADO === DAC.ESTADOS.OPER), esc = L.filter(d => d.escalar);
    const sinAcc = venc.filter(d => d.ESTADO === DAC.ESTADOS.SIN).length, segV = venc.length - sinAcc;
    if (venc.length) out.push({ nivel: 'er', cod: DAC.EST, h: '#desvacc', texto: venc.length + ' desvío(s) del recorrido con plazo vencido' + (sinAcc ? ' · ' + sinAcc + ' sin acción' : '') + (segV ? ' · ' + segV + ' sin verificar' : '') });
    if (conf.length) out.push({ nivel: 'wa', cod: DAC.EST, h: '#desvacc', texto: conf.length + ' desvío(s) que los operarios informan corregidos: confirmar' });
    if (esc.length) out.push({ nivel: 'wa', cod: DAC.EST, h: '#desvacc', texto: esc.length + ' desvío(s) para evaluar escalar a la jefatura (se repiten o persisten)' });
  } catch (e) {}
  try { ca.put('dac_avisos', JSON.stringify(out), 600); } catch (e) {}
  return out;
}


// ------------------------------------------------------------------ SUPERVISIÓN DE STAR UNION (22/10/2026)
// Pedido de Belén: Federico Obelar (supervisor de Star Union) ve todo lo que cargan sus operarios, las acciones de HyS y la
// adhesión de su personal a reportar desvíos (lleva muchas acciones a sus superiores, por ejemplo si faltan carros o contenedores).
// Entra a «Mi establecimiento» (HMH) con su DNI y su clave personal y el módulo «Desvíos» (BASE COMÚN › ACCESOS).
// Además recibe un reporte semanal por correo (CONFIG de la planilla de desvíos: CORREO_SUPERVISOR y REPORTE_SEMANAL = Sí).
const DAC_EMPRESA = 'Star Union';
const DAC_PARA_EMPRESA = /star union|contenedor|servicios generales/i;   // acciones que la empresa tiene que seguir con sus superiores

function dacSupervision_() {
  const ss = dacSS_(), D = dacDatos_(ss), hoy = new Date(); hoy.setHours(23, 59, 59, 0);
  const lim7 = dacMas_(hoy, -7), lim30 = dacMas_(hoy, -30);
  const ops = dacTabla_(ss, 'OPERARIOS').filas.filter(o => limpio_(o.EMPRESA) === DAC_EMPRESA && limpio_(o.ACTIVO) === 'Sí');   // todos los operarios activos de la empresa, también el supervisor (Belén, 22/10/2026)
  const fecha = d => dacFecha_(d.FECHA);
  const adhesion = ops.map(o => {
    const nombre = (limpio_(o.NOMBRE) + ' ' + limpio_(o.APELLIDO)).trim(), mis = D.L.filter(d => d.OPERARIO_COD === limpio_(o.COD));
    const fs = mis.map(fecha).filter(Boolean).sort((a, b) => a - b), ult = fs.length ? fs[fs.length - 1] : null;
    const revis = D.S.filas.filter(s => limpio_(s.ORIGEN) === 'Operario' && limpio_(s.QUIEN) === nombre);
    return { cod: limpio_(o.COD), nombre: nombre, turno: limpio_(o.TURNO_HABITUAL), d7: fs.filter(f => f >= lim7).length, d30: fs.filter(f => f >= lim30).length,
      total: fs.length, ultimo: dacTxtF_(ult), revisiones7: revis.filter(s => { const f = dacFecha_(s.FECHA); return f && f >= lim7; }).length };
  }).sort((a, b) => b.d30 - a.d30 || a.nombre.localeCompare(b.nombre));
  // Semanas (lunes a domingo), las últimas 8
  const lunes = d => { const x = new Date(d.getTime()); x.setHours(12, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };
  const semanas = []; let l = lunes(new Date());
  for (let i = 0; i < 8; i++) { const ini = dacMas_(l, -7 * i), fin = dacMas_(ini, 6); semanas.unshift({ desde: dacTxtF_(ini), hasta: dacTxtF_(fin), n: D.L.filter(d => d.FECHA && d.FECHA >= dacTxtF_(ini) && d.FECHA <= dacTxtF_(fin)).length }); }
  const estadoDe = id => (D.L.find(d => d.ID === id) || {}).ESTADO || '';
  const acciones = D.A.filas.filter(a => limpio_(a.ID)).map(a => {
    const ids = String(a.DESVIOS || '').split(/[;,\s]+/).filter(Boolean), est = ids.map(estadoDe), abiertos = est.filter(e => !/^Cerrado/.test(e)).length;
    return { id: limpio_(a.ID), fecha: dacTxtF_(dacFecha_(a.FECHA)), tipo: limpio_(a.TIPO), destinatario: limpio_(a.DESTINATARIO), desvios: ids, detalle: limpio_(a.DETALLE),
      nota: limpio_(a.NOTA_CODIGO), estado: abiertos ? (abiertos + ' de ' + ids.length + ' desvío(s) en seguimiento') : 'Cerrada', abierta: abiertos > 0,
      empresa: DAC_PARA_EMPRESA.test(limpio_(a.TIPO) + ' ' + limpio_(a.DESTINATARIO)) };
  }).reverse();
  const desvios = D.L.slice().reverse().map(d => { const c = Object.assign({}, d); delete c.fila; c.ACCIONES = d.ACCIONES.map(a => ({ fecha: a.fecha, tipo: a.tipo, destinatario: a.destinatario })); return c; });
  const rep = {
    desde: dacTxtF_(dacMas_(hoy, -6)), hasta: dacTxtF_(hoy),
    cargas7: D.L.filter(d => { const f = fecha(d); return f && f >= lim7; }).length,
    reportaron: adhesion.filter(a => a.d7 > 0).map(a => a.nombre), sinReportar: adhesion.filter(a => a.d7 === 0).map(a => a.nombre), totalOperarios: adhesion.length,
    acciones7: acciones.filter(a => { const f = dacFecha_(a.fecha); return f && f >= lim7; }),
    paraLaEmpresa: acciones.filter(a => a.empresa && a.abierta),
    abiertos: D.L.filter(d => !/^Cerrado/.test(d.ESTADO)).map(d => ({ ID: d.ID, FECHA: d.FECHA, TIPOS: d.TIPOS, SERVICIO: d.SERVICIO, UBICACION: d.UBICACION, ESTADO: d.ESTADO, GRAVEDAD: d.GRAVEDAD, CAUSA: d.CAUSA })),
    cerrados7: D.S.filas.filter(s => { const f = dacFecha_(s.FECHA); return f && f >= lim7 && limpio_(s.RESULTADO) === 'Corregido' && limpio_(s.CONFIRMADO) === 'Sí'; }).length,
    faltanContenedores: D.L.filter(d => { const f = fecha(d); return f && f >= lim30 && /^No había lugar/.test(d.CAUSA); }).length
  };
  return { ok: true, empresa: DAC_EMPRESA, adhesion: adhesion, semanas: semanas, acciones: acciones, desvios: desvios, reporte: rep, estados: DAC.ESTADOS };
}

function dacReporteHtml_(R) {
  const f = t => t ? t.split('-').reverse().join('/') : '', e = t => String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const li = L => L.length ? '<ul>' + L.join('') + '</ul>' : '<p style="color:#666">Nada en este período.</p>';
  return '<div style="font-family:Arial,sans-serif;font-size:14px;color:#222;max-width:680px">' +
    '<h2 style="color:#0D313F;margin:0 0 4px">Desvíos en el recorrido de residuos · HMH</h2><p style="color:#555;margin:0 0 14px">Reporte semanal para Star Union · del ' + f(R.desde) + ' al ' + f(R.hasta) + '</p>' +
    '<h3 style="color:#0D313F">1. Reportes de los operarios</h3><p><b>' + R.cargas7 + '</b> desvío(s) registrados en la semana. Reportaron <b>' + R.reportaron.length + ' de ' + R.totalOperarios + '</b> operarios.</p>' +
    (R.sinReportar.length ? '<p>Sin reportes en la semana: ' + e(R.sinReportar.join(', ')) + '.</p>' : '') +
    '<h3 style="color:#0D313F">2. Acciones iniciadas por Higiene y Seguridad en la semana</h3>' +
    li(R.acciones7.map(a => '<li>' + f(a.fecha) + ' · <b>' + e(a.tipo) + '</b>' + (a.destinatario && a.destinatario !== a.tipo ? ' · ' + e(a.destinatario) : '') + ' · ' + e(a.desvios.join(', ')) + ' · ' + e(a.estado) + '</li>')) +
    '<h3 style="color:#0D313F">3. Para seguir con la empresa</h3><p style="color:#555;margin-top:0">Acciones abiertas dirigidas a Star Union, a Servicios Generales o por falta de contenedores.</p>' +
    li(R.paraLaEmpresa.map(a => '<li>' + f(a.fecha) + ' · <b>' + e(a.tipo) + '</b>' + (a.destinatario ? ' · ' + e(a.destinatario) : '') + ' · ' + e(a.desvios.join(', ')) + ' · ' + e(a.estado) + '</li>')) +
    (R.faltanContenedores ? '<p>En los últimos 30 días hubo <b>' + R.faltanContenedores + '</b> registro(s) en los que no había lugar en ningún contenedor.</p>' : '') +
    '<h3 style="color:#0D313F">4. Desvíos abiertos (' + R.abiertos.length + ')</h3>' +
    li(R.abiertos.map(d => '<li>' + e(d.ID) + ' · ' + f(d.FECHA) + ' · ' + e(d.TIPOS) + ' · ' + e([d.SERVICIO, d.UBICACION].filter(Boolean).join(' · ')) + ' · ' + e(d.ESTADO) + ' · gravedad ' + e(d.GRAVEDAD) + '</li>')) +
    '<p>Corregidos y verificados en la semana: <b>' + R.cerrados7 + '</b>.</p>' +
    '<p style="color:#555;font-size:12px;margin-top:18px">El detalle completo (fotos, lugar, operario y estado de cada desvío) está en «Mi establecimiento» › 1 · Residuos › «Desvíos: supervisión». ' +
    'Servicio de Higiene y Seguridad Laboral HZT / HMH · belenpellegrini.hys@gmail.com</p></div>';
}

function dacConfigRep_() {
  const c = {}; dacTabla_(dacSS_(), 'CONFIG').filas.forEach(o => { if (limpio_(o.CLAVE)) c[limpio_(o.CLAVE)] = limpio_(o.VALOR); });
  return { correo: c.CORREO_SUPERVISOR || 's/d', activo: c.REPORTE_SEMANAL === 'Sí', remitente: c.REMITENTE || '' };
}
// Envía el reporte al supervisor. manual = lo pidió HyS desde el portal (igual exige un correo cargado).
function dacEnviarReporte_(manual) {
  const C = dacConfigRep_();
  if (!manual && !C.activo) return { ok: false, mensaje: 'El reporte semanal está desactivado (CONFIG › REPORTE_SEMANAL).' };
  const para = String(C.correo || '').split(',').map(s => s.trim()).filter(s => /@/.test(s));
  if (!para.length) return { ok: false, mensaje: 'Falta el correo del supervisor (CONFIG › CORREO_SUPERVISOR de la planilla de desvíos).' };
  const R = dacSupervision_().reporte, f = t => t.split('-').reverse().join('/');
  const op = { htmlBody: dacReporteHtml_(R), name: 'Higiene y Seguridad Laboral HZT/HMH' }, propia = Session.getEffectiveUser().getEmail().toLowerCase();
  if (C.remitente && C.remitente.toLowerCase() !== propia) { if (GmailApp.getAliases().map(a => a.toLowerCase()).indexOf(C.remitente.toLowerCase()) >= 0) op.from = C.remitente; else op.replyTo = C.remitente; }
  GmailApp.sendEmail(para.join(','), 'Desvíos en residuos HMH · reporte semanal del ' + f(R.desde) + ' al ' + f(R.hasta), 'Reporte semanal de desvíos en el recorrido de residuos del HMH. Abrilo en un programa de correo que muestre HTML.', op);
  return { ok: true, enviado: para.join(', ') };
}
/** Disparador semanal (lunes, 8 h). Se instala una vez con instalarReporteSemanal(). */
function enviarReporteSemanal() { const r = dacEnviarReporte_(false); Logger.log(JSON.stringify(r)); }
function instalarReporteSemanal() {
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'enviarReporteSemanal').forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('enviarReporteSemanal').timeBased().onWeekDay(ScriptApp.WeekDay.MONDAY).atHour(8).inTimezone(TZ).create();
  Logger.log('Reporte semanal instalado: lunes 8 h.');
}

// Entrada desde «Mi establecimiento» (acciones «m_desv_…»): DNI + clave personal con el módulo «Desvíos», o la clave de HyS
function dacMiRed_(d) {
  const acc = acceso_(d.est, d.clave, d.dni); if (!acc.ok) return acc;
  if (!acc.maestra && (acc.modulos || []).indexOf('Desvíos') < 0) return { ok: false, error: 'permiso', mensaje: 'No tenés asignada la supervisión de desvíos. Consultá con Higiene y Seguridad.' };
  if (d.accion === 'm_desv_supervision') return dacSupervision_();
  return { ok: false, error: 'Acción desconocida.' };
}
