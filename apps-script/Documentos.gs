/**
 * SISTEMA HyS · NUMERACIÓN DE DOCUMENTOS (etapa 2)
 * Código: SIGLA-ESTABLECIMIENTO-BLOQUE-TIPO-AÑO-NNN  (ej.: HYSL-HZPM-RES-DG-2026-001)
 * El número es correlativo por establecimiento y por año, en todos los bloques. «RED» = documentos de toda la red.
 * Registro: libro general › hoja REGISTRO_DOCUMENTOS. Nunca se borran filas: un número mal pedido se marca «Anulado».
 * Sigla y textos: BASE COMÚN › CONFIG_INFORMES.
 */

const DOC_BLOQUES = { RES: 'Residuos', RIE: 'Riesgos', DOC: 'Documental', CAP: 'Capacitación', GEN: 'General' };
const DOC_TIPOS = { DG: 'Diagnóstico', SP: 'Seguimiento del plan de acción', IT: 'Informe técnico', AU: 'Auditoría o inspección', NT: 'Nota', AC: 'Acta', IR: 'Informe de la red' };
const DOC_H = ['CODIGO', 'SIGLA', 'ESTABLECIMIENTO', 'COD_DOC', 'BLOQUE', 'TIPO', 'ANIO', 'NUMERO', 'FECHA', 'ASUNTO', 'ORIGEN', 'ID_ORIGEN', 'DOCUMENTO', 'PDF', 'ESTADO', 'OBSERVACIONES', 'PEDIDO_POR'];

// ------------------------------------------------------------------ Configuración (BASE COMÚN › CONFIG_INFORMES)
// cod (opcional): las claves «CLAVE@COD» de CONFIG_INFORMES reemplazan a la general para ese establecimiento (p. ej. ENCABEZADO_LINEA2@HZT)
function configInformes_(cod) {
  const c = CacheService.getScriptCache(), k = c.get('cfg_inf'); if (k) return cfgEst_(JSON.parse(k), cod);
  const out = {}, sh = pBC_().getSheetByName('CONFIG_INFORMES');
  if (sh && sh.getLastRow() > 5) sh.getRange(6, 1, sh.getLastRow() - 5, 2).getValues().forEach(r => { if (r[0]) out[String(r[0]).trim()] = String(r[1] == null ? '' : r[1]).trim(); });
  if (!out.SIGLA) out.SIGLA = 'HYSL';
  try { c.put('cfg_inf', JSON.stringify(out), 600); } catch (e) {}
  return cfgEst_(out, cod);
}
function cfgEst_(out, cod) {
  if (!cod) return out;
  const r = Object.assign({}, out), suf = '@' + String(cod).trim().toUpperCase();
  Object.keys(out).forEach(k => { if (k.toUpperCase().slice(-suf.length) === suf) r[k.slice(0, -suf.length)] = out[k]; });
  return r;
}

// Código corto del establecimiento para el número: sin tildes ni espacios, en mayúsculas (máx. 12)
function docCodEst_(cod) {
  const s = String(cod || '').trim(); if (/^red$/i.test(s)) return 'RED';
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 12);
}

function docHoja_() {
  const g = SpreadsheetApp.openById(CFG.GENERAL); let sh = g.getSheetByName('REGISTRO_DOCUMENTOS');
  if (!sh) {
    sh = g.insertSheet('REGISTRO_DOCUMENTOS');
    sh.getRange(1, 1).setValue('Registro de documentos').setFontSize(16).setFontWeight('bold').setFontColor('#0D313F');
    sh.getRange(2, 1).setValue('Numeración correlativa por establecimiento y por año, en todos los bloques. No se borran filas: un número mal pedido se marca «Anulado».').setFontStyle('italic').setFontColor('#4F616B');
    sh.getRange(5, 1, 1, DOC_H.length).setValues([DOC_H]).setFontWeight('bold').setFontColor('#FFFFFF').setBackground('#0D313F');
    sh.setFrozenRows(5); sh.setColumnWidth(1, 240); sh.setColumnWidth(10, 320);
    sh.getRange(6, 15, 1000, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(['Reservado', 'Emitido', 'Anulado'], true).setAllowInvalid(false).build());
  }
  return sh;
}

// Asigna el próximo número. x: { est, bloque, tipo, asunto, origen, idOrigen, pedidoPor }
function docNumero_(x) {
  const bloque = String(x.bloque || '').toUpperCase(), tipo = String(x.tipo || '').toUpperCase();
  if (!DOC_BLOQUES[bloque]) return { ok: false, mensaje: 'Bloque no válido.' };
  if (!DOC_TIPOS[tipo]) return { ok: false, mensaje: 'Tipo de documento no válido.' };
  const est = String(x.est || '').trim(); if (!est) return { ok: false, mensaje: 'Falta el establecimiento.' };
  if (est !== 'RED' && !est_(est)) return { ok: false, mensaje: 'Establecimiento desconocido.' };
  return conLock_(() => {
    const sh = docHoja_(), anio = Number(Utilities.formatDate(new Date(), TZ, 'yyyy')), ce = docCodEst_(est), sigla = configInformes_().SIGLA;
    const n = sh.getLastRow() - 5, v = n > 0 ? sh.getRange(6, 1, n, 8).getValues() : [];
    const max = v.filter(r => String(r[3]) === ce && Number(r[6]) === anio).reduce((m, r) => Math.max(m, Number(r[7]) || 0), 0);
    const num = max + 1, codigo = [sigla, ce, bloque, tipo, anio, ('00' + num).slice(-3)].join('-');
    const fila = [codigo, sigla, est, ce, bloque, tipo, anio, num, Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd'), String(x.asunto || '').trim(), x.origen || 'Manual', x.idOrigen || '', '', '', 'Reservado', '', x.pedidoPor || ''];
    sh.getRange(Math.max(sh.getLastRow(), 5) + 1, 1, 1, fila.length).setValues([fila]);
    try { docEspejo_(fila); } catch (e) { Logger.log('Espejo en REGISTRO de Documentos: ' + e); }
    return { ok: true, codigo: codigo, numero: num };
  });
}

function docRegistro_(x) {
  const sh = docHoja_(), n = sh.getLastRow() - 5; if (n < 1) return { ok: true, filas: [] };
  const est = String(x && x.est || '').trim(), anio = x && x.anio ? Number(x.anio) : null;
  const filas = sh.getRange(6, 1, n, DOC_H.length).getValues().map((r, i) => ({ fila: 6 + i, v: r.map(c => c instanceof Date ? Utilities.formatDate(c, TZ, 'yyyy-MM-dd') : c) }))
    .filter(f => f.v[0] && (!est || String(f.v[2]) === est) && (!anio || Number(f.v[6]) === anio)).reverse();
  return { ok: true, cols: DOC_H, filas: filas };
}

// Cambios en un registro: adjuntar enlace, marcar emitido o anular (con motivo)
function docActualizar_(x) {
  return conLock_(() => {
    const sh = docHoja_(), n = sh.getLastRow() - 5; if (n < 1) return { ok: false, mensaje: 'Registro vacío.' };
    const cods = sh.getRange(6, 1, n, 1).getValues().map(r => String(r[0])), i = cods.indexOf(String(x.codigo || ''));
    if (i < 0) return { ok: false, mensaje: 'No se encontró el código.' };
    const f = 6 + i;
    if (x.documento != null) sh.getRange(f, 13).setValue(String(x.documento).trim());
    if (x.pdf != null) sh.getRange(f, 14).setValue(String(x.pdf).trim());
    if (x.estado) {
      if (['Reservado', 'Emitido', 'Anulado'].indexOf(x.estado) < 0) return { ok: false, mensaje: 'Estado no válido.' };
      if (x.estado === 'Anulado' && !String(x.motivo || '').trim()) return { ok: false, mensaje: 'Para anular, indicá el motivo.' };
      sh.getRange(f, 15).setValue(x.estado);
    }
    if (x.motivo) sh.getRange(f, 16).setValue(String(x.motivo).trim());
    try { docEspejo_(sh.getRange(f, 1, 1, DOC_H.length).getValues()[0]); } catch (e) { Logger.log('Espejo en REGISTRO de Documentos: ' + e); }
    return { ok: true };
  });
}

// ------------------------------------------------------------------ Espejo en el REGISTRO de seguimiento (Módulo 2 · Documentos)
// Cada código que asigna el sistema (informes, notas de siniestros…) aparece también en DOCUMENTOS · Sistema HyS › REGISTRO,
// donde se registran el envío, la respuesta, las fotos y queda como antecedente. Columna X = código del sistema.
const DOC_SEG_ID = '1OZmvW2-FypFH78tUMrxT_xSGGBtpCckGPAw8MkHyRuw';
const DOC_SEG_TIPO = { DG: 'Diagnóstico', SP: 'Informe', IT: 'Informe', AU: 'Informe de auditoría', NT: 'Nota HYSL (sistema)', AC: 'Acta / constancia', IR: 'Informe' };
const DOC_SEG_PROB = { RES: 'Residuos', RIE: 'Accidentes y siniestros', DOC: 'Organización del servicio HySL', CAP: 'Capacitación', GEN: 's/d (revisar)' };
function docEspejo_(r) {
  const codigo = String(r[0] || ''); if (!codigo) return;
  const sh = SpreadsheetApp.openById(DOC_SEG_ID).getSheetByName('REGISTRO'); if (!sh) return;
  const desde = 4, n = Math.max(sh.getLastRow() - desde + 1, 0), colX = 24;
  const X = n ? sh.getRange(desde, colX, n, 1).getValues() : [];
  let fila = -1; for (let i = 0; i < X.length; i++) if (String(X[i][0]) === codigo) { fila = desde + i; break; }
  const enlace = String(r[12] || r[13] || ''), anulada = r[14] === 'Anulado';
  if (fila < 0) {
    const A = n ? sh.getRange(desde, 1, n, 1).getValues() : []; let libre = desde + A.length;
    for (let i = 0; i < A.length; i++) if (A[i][0] === '' || A[i][0] === null) { libre = desde + i; break; }
    if (libre > sh.getMaxRows()) sh.insertRowsAfter(sh.getMaxRows(), 50);
    const fecha = /^\d{4}-\d{2}-\d{2}$/.test(String(r[8])) ? new Date(Number(String(r[8]).slice(0, 4)), Number(String(r[8]).slice(5, 7)) - 1, Number(String(r[8]).slice(8, 10))) : new Date();
    sh.getRange(libre, 1, 1, 5).setValues([[fecha, DOC_SEG_TIPO[r[5]] || 'Informe', String(r[2]), DOC_SEG_PROB[r[4]] || 's/d (revisar)', Number(r[7]) || '']]);
    sh.getRange(libre, 9, 1, 2).setValues([[String(r[9] || ''), 'Dirección del establecimiento']]);
    sh.getRange(libre, 17).setValue(anulada ? 'Anulada' : 'Borrador');
    if (enlace) sh.getRange(libre, 20).setValue(enlace);
    sh.getRange(libre, 21).setValue('Generado por el sistema (' + (r[10] || '') + (r[11] ? ' · ' + r[11] : '') + ')');
    sh.getRange(libre, colX).setValue(codigo);
  } else {
    if (enlace) sh.getRange(fila, 20).setValue(enlace);
    if (anulada) sh.getRange(fila, 17).setValue('Anulada');
  }
}

// ------------------------------------------------------------------ Menú: ver Menu.gs
function menuAbrirRegistro() { SpreadsheetApp.getActive().setActiveSheet(docHoja_()); }
function menuPedirNumero() {
  const est = Object.keys(librosMapa_()).filter(k => k !== 'MAESTRA').map(k => ({ id: k, nombre: librosMapa_()[k].nombre })).sort((a, b) => String(a.nombre).localeCompare(String(b.nombre)));
  const op = (o) => Object.keys(o).map(k => '<option value="' + k + '">' + k + ' · ' + o[k] + '</option>').join('');
  const html = HtmlService.createHtmlOutput(
    '<style>body{font-family:Arial,sans-serif;font-size:13px;color:#1D2B31}label{display:block;margin:8px 0 2px;font-weight:bold;font-size:12px}select,input{width:100%;padding:6px;box-sizing:border-box}button{margin-top:12px;background:#0D313F;color:#fff;border:0;padding:8px 14px;border-radius:6px;font-weight:bold}#r{margin-top:12px;font-size:16px;font-weight:bold;color:#0D313F}</style>' +
    '<label>Establecimiento</label><select id="est"><option value="RED">RED · Toda la red</option>' + est.map(e => '<option value="' + e.id + '">' + e.nombre + '</option>').join('') + '</select>' +
    '<label>Bloque</label><select id="bl">' + op(DOC_BLOQUES) + '</select><label>Tipo</label><select id="ti">' + op(DOC_TIPOS) + '</select>' +
    '<label>Asunto</label><input id="as" placeholder="Ej.: Nota sobre el depósito final">' +
    '<button id="b" onclick="this.disabled=true;google.script.run.withSuccessHandler(function(r){document.getElementById(\'r\').textContent=r.ok?r.codigo:r.mensaje;document.getElementById(\'b\').disabled=false}).docNumeroMenu({est:est.value,bloque:bl.value,tipo:ti.value,asunto:as.value})">Asignar número</button><div id="r"></div>'
  ).setWidth(420).setHeight(360);
  SpreadsheetApp.getUi().showModalDialog(html, 'Pedir número de documento');
}
function docNumeroMenu(x) { x.origen = 'Manual (planilla)'; x.pedidoPor = Session.getActiveUser().getEmail(); return docNumero_(x); }

// Instalación (una vez): crea la hoja REGISTRO_DOCUMENTOS sin pedir ningún número
function instalarRegistroDocumentos() { const sh = docHoja_(); Logger.log('Listo: hoja ' + sh.getName() + ' en el libro general. Recargá el libro para ver el menú «Sistema HyS».'); }