/**
 * SISTEMA HyS · PLAN DE ACCIÓN (etapa 4)
 * Cada informe emitido genera sus recomendaciones en DIAGNÓSTICO › PLAN_ACCION.
 * Belén marca la fecha de envío, carga la respuesta de la Dirección (responsable y fecha prevista), el estado y la evidencia.
 * Estados: Pendiente · En curso · Cumplida (solo con evidencia) · Descartada (con motivo).
 * Se calculan solos: «Sin enviar», «Sin respuesta» (pasó el plazo de respuesta sin responsable) y «Vencida» (pasó la fecha sin cumplir).
 */

const PLAN_H = ['CODIGO_INFORME', 'ID_DIAG', 'ESTABLECIMIENTO', 'N_REC', 'ITEM_ID', 'RECOMENDACION', 'LUGAR', 'TIPO', 'COSTO', 'A_CARGO', 'PRIORIDAD', 'PLAZO_TECNICO',
  'FECHA_ENVIO', 'FECHA_LIMITE', 'FECHA_RESPUESTA', 'RESPONSABLE_DIRECCION', 'FECHA_PREVISTA', 'ESTADO', 'EVIDENCIA', 'OBSERVACIONES', 'ACTUALIZADO'];
const PLAN_ESTADOS = ['Pendiente', 'En curso', 'Cumplida', 'Descartada'];

function planHoja_() {
  const dg = pDG_(); let sh = dg.getSheetByName('PLAN_ACCION');
  if (!sh) {
    sh = dg.insertSheet('PLAN_ACCION');
    sh.getRange(1, 1).setValue('Plan de acción de los informes').setFontSize(16).setFontWeight('bold').setFontColor('#0D313F');
    sh.getRange(2, 1).setValue('Una fila por recomendación. Se carga desde el portal (Residuos › Plan de acción). «Cumplida» solo con evidencia; «Descartada» con motivo en OBSERVACIONES.').setFontStyle('italic').setFontColor('#4F616B');
    sh.getRange(5, 1, 1, PLAN_H.length).setValues([PLAN_H]).setFontWeight('bold').setFontColor('#FFFFFF').setBackground('#0D313F').setWrap(true);
    sh.setFrozenRows(5); sh.setColumnWidth(6, 320); sh.setColumnWidth(20, 240);
    sh.getRange(6, 18, 2000, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(PLAN_ESTADOS, true).setAllowInvalid(false).build());
  }
  return sh;
}
const planF_ = v => v instanceof Date ? Utilities.formatDate(v, TZ, 'yyyy-MM-dd') : String(v == null ? '' : v);
function planFilas_() {
  const sh = planHoja_(), n = sh.getLastRow() - 5; if (n < 1) return [];
  return sh.getRange(6, 1, n, PLAN_H.length).getValues().map((r, i) => { const o = { fila: 6 + i }; PLAN_H.forEach((h, j) => o[h] = planF_(r[j])); return o; }).filter(o => o.CODIGO_INFORME);
}
const planSuma_ = (f, d) => { const x = new Date(f + 'T12:00:00'); x.setDate(x.getDate() + d); return Utilities.formatDate(x, TZ, 'yyyy-MM-dd'); };

// Estado efectivo (se calcula al leer; no se guarda)
function planEstado_(o, hoy, resp) {
  if (o.ESTADO === 'Cumplida' || o.ESTADO === 'Descartada') return o.ESTADO;
  if (!o.FECHA_ENVIO) return 'Sin enviar';
  const lim = o.FECHA_PREVISTA || o.FECHA_LIMITE;
  if (lim && hoy > lim) return 'Vencida';
  if (!o.RESPONSABLE_DIRECCION && hoy > planSuma_(o.FECHA_ENVIO, resp)) return 'Sin respuesta';
  return o.ESTADO || 'Pendiente';
}

// Se llama al generar el informe: crea o actualiza las recomendaciones (nunca pisa respuestas ni estados)
function planDesdeInforme_(X, recs, codigo) {
  return conLock_(() => {
    const sh = planHoja_(), ex = planFilas_().filter(o => o.CODIGO_INFORME === codigo), hoy = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd'), nuevas = [];
    recs.forEach(p => {
      const plazo = /^\d+/.test(p.plazo) ? parseInt(p.plazo, 10) : '';
      const base = [p.h.it.ID, p.accion, p.lugar, p.h.it.TIPO_ACCION || '', p.costo, p.cargo, p.prioridad, p.plazo];
      const e = ex.find(o => o.N_REC === p.n);
      if (e) { sh.getRange(e.fila, 5, 1, 8).setValues([base]); if (e.FECHA_ENVIO && plazo) sh.getRange(e.fila, 14).setValue(planSuma_(e.FECHA_ENVIO, plazo)); sh.getRange(e.fila, 21).setValue(hoy); }
      else nuevas.push([codigo, X.A.ID_DIAG, X.cod, p.n].concat(base).concat(['', '', '', '', '', 'Pendiente', '', '', hoy]));
    });
    if (nuevas.length) sh.getRange(Math.max(sh.getLastRow(), 5) + 1, 1, nuevas.length, PLAN_H.length).setValues(nuevas);
    return true;
  });
}

// Lista de informes con su resumen (pantalla principal del plan de acción)
function planListar_() {
  const cfg = configInformes_(), resp = Number(cfg.PLAZO_RESPUESTA) || 30, hoy = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd');
  const por = {}, reg = {}; (docRegistro_({}).filas || []).forEach(f => reg[f.v[0]] = f.v);
  planFilas_().forEach(o => {
    const r = reg[o.CODIGO_INFORME]; if (r && r[14] === 'Anulado') return;
    const k = o.CODIGO_INFORME, e = planEstado_(o, hoy, resp);
    const s = por[k] = por[k] || { codigo: k, cod: o.ESTABLECIMIENTO, nombre: (est_(o.ESTABLECIMIENTO) || {}).nombre || o.ESTABLECIMIENTO, enviado: o.FECHA_ENVIO, total: 0, c: {}, doc: r ? r[12] : '', pdf: r ? r[13] : '' };
    s.total++; s.c[e] = (s.c[e] || 0) + 1;
  });
  return { ok: true, informes: Object.values(por).sort((a, b) => String(b.codigo).localeCompare(String(a.codigo))) };
}

function planAbrir_(x) {
  const cfg = configInformes_(), resp = Number(cfg.PLAZO_RESPUESTA) || 30, hoy = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd');
  const filas = planFilas_().filter(o => o.CODIGO_INFORME === x.codigo).map(o => Object.assign(o, { EFECTIVO: planEstado_(o, hoy, resp) }));
  if (!filas.length) return { ok: false, mensaje: 'No hay recomendaciones para ese informe.' };
  const r = (docRegistro_({}).filas || []).find(f => f.v[0] === x.codigo);
  const env = filas[0].FECHA_ENVIO;
  return { ok: true, codigo: x.codigo, cod: filas[0].ESTABLECIMIENTO, id: filas[0].ID_DIAG, nombre: (est_(filas[0].ESTABLECIMIENTO) || {}).nombre || filas[0].ESTABLECIMIENTO,
    enviado: env, limiteRespuesta: env ? planSuma_(env, resp) : '', diasRespuesta: env ? Math.max(0, Math.round((new Date(hoy) - new Date(env)) / 86400000)) : 0, plazoRespuesta: resp,
    doc: r ? r.v[12] : '', pdf: r ? r.v[13] : '', filas: filas };
}

// Fecha de envío a la Dirección: fija los plazos técnicos de cada recomendación
function planEnviado_(x) {
  const f = String(x.fecha || '').slice(0, 10); if (!/^\d{4}-\d{2}-\d{2}$/.test(f)) return { ok: false, mensaje: 'Indicá la fecha de envío.' };
  return conLock_(() => {
    const sh = planHoja_(), filas = planFilas_().filter(o => o.CODIGO_INFORME === x.codigo);
    filas.forEach(o => { const d = /^\d+/.test(o.PLAZO_TECNICO) ? parseInt(o.PLAZO_TECNICO, 10) : 0;
      sh.getRange(o.fila, 13, 1, 2).setValues([[f, d ? planSuma_(f, d) : '']]); });
    return { ok: true };
  });
}

// Respuesta de la Dirección, estados y evidencia (solo Higiene y Seguridad)
function planGuardar_(x) {
  const hoy = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd');
  return conLock_(() => {
    const sh = planHoja_(), filas = planFilas_().filter(o => o.CODIGO_INFORME === x.codigo), errores = [];
    (x.filas || []).forEach(c => {
      const o = filas.find(f => f.N_REC === c.n); if (!o) return;
      const estado = PLAN_ESTADOS.indexOf(c.estado) >= 0 ? c.estado : o.ESTADO || 'Pendiente';
      if (estado === 'Cumplida' && !String(c.evidencia || o.EVIDENCIA).trim()) { errores.push(c.n + ': para marcarla cumplida hace falta evidencia (foto, documento o remito).'); return; }
      if (estado === 'Descartada' && !String(c.obs || '').trim()) { errores.push(c.n + ': para descartarla, indicá el motivo en observaciones.'); return; }
      const fr = o.FECHA_RESPUESTA || ((c.responsable || c.fechaPrevista) ? (x.fechaRespuesta || hoy) : '');
      sh.getRange(o.fila, 15, 1, 7).setValues([[fr, String(c.responsable || '').trim(), String(c.fechaPrevista || '').slice(0, 10), estado, String(c.evidencia || o.EVIDENCIA || '').trim(), String(c.obs || '').trim(), hoy]]);
    });
    return errores.length ? { ok: false, mensaje: errores.join(' ') } : { ok: true };
  });
}

// Evidencia: foto o PDF desde el portal → carpeta del establecimiento › Informes › Evidencias › código
function planEvidencia_(x) {
  const E = est_(limpio_(x.cod)); if (!E || !E.carpeta) return { ok: false, mensaje: 'El establecimiento no tiene carpeta.' };
  const m = /^data:([\w./+-]+);base64,(.+)$/.exec(String(x.dataUrl || '')); if (!m) return { ok: false, mensaje: 'El archivo no es válido.' };
  const raiz = carpeta_(carpeta_(carpeta_(DriveApp.getFolderById(E.carpeta), 'Informes'), 'Evidencias'), x.codigo);
  const ext = /pdf/.test(m[1]) ? '.pdf' : '.jpg';
  const f = raiz.createFile(Utilities.newBlob(Utilities.base64Decode(m[2]), m[1], x.n + ' - ' + Utilities.formatDate(new Date(), TZ, 'yyyyMMdd-HHmmss') + ext));
  return { ok: true, url: f.getUrl() };
}