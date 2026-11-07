/**
 * 12 · ERGONOMÍA · Protocolo de Ergonomía (Res. SRT 886/15) · versión 0 (07/11/2026, pedido de Belén)
 *
 * Qué es: el registro del protocolo de ergonomía de la red Trelew (HZT con sus dependencias, CAPS y dispositivos), del HMH
 * y del HSST con sus CAPS. Lo carga solo Higiene y Seguridad (Belén), desde el portal (#ergo) o directo en la planilla.
 *   Planilla 1 · Identificación: una fila por puesto y tarea, con los 9 factores (A a I) Sí / No.
 *   Planilla 2 · Evaluación inicial: una fila por tarea y factor marcado; las respuestas quedan en RESPUESTAS (JSON) y el
 *                resultado lo calcula este archivo con las reglas de la norma (ERGO_REGLAS, abajo).
 *   Evaluación de riesgos: en la misma fila de la Planilla 2 (método, detalle, evaluador y nivel 1, 2 o 3).
 *   Planilla 3 · Medidas: las 3 generales quedan en la fila de la Planilla 1 (GEN_…); las específicas, en MEDIDAS.
 *   Planilla 4 · Seguimiento: SEGUIMIENTO; actualiza el estado y las fechas de la medida.
 *
 * Datos: libro «ERGONOMÍA · Sistema HyS» (propiedad ERGO_ID; si falta, el de ERGO.LIBRO) en Drive › SISTEMA HyS ›
 * MÓDULO 12 · ERGONOMÍA. Encabezados en la fila 5, datos desde la 6. Si alguien agrega columnas, se respetan; las que faltan
 * se crean al final. MEDIDAS › FECHA_LIMITE es una fórmula (fecha de alta + plazo): nunca se escribe desde acá.
 * Fotos: carpeta del módulo › Fotos › <ID>, hasta 5 por campo (sacar en el momento o subir del dispositivo).
 * Cada cambio queda en HISTORIAL. Sin correos automáticos.
 * Portal: acciones «p_ergo…», despachadas en Portal.gs (default:).
 * Normativa: Ley 19.587; Dto. 351/79; Res. SRT 886/15; Res. SRT 3345/15; Res. MTEySS 295/03; Dto. 49/14; Res. SRT 81/19.
 */
const ERGO = {
  P_LIBRO: 'ERGO_ID', LIBRO: '1TDJI7SvA3brLob9Vep_gUoZZCWnye0-E2tzIwa7rtUI', CARPETA: '1iTCv2LmP4rX0IaULdvVW1ELyas2XOVOh', VERSION: '0',
  FACTORES: { A: 'A · Levantamiento/descenso', B: 'B · Empuje/arrastre', C: 'C · Transporte manual', D: 'D · Bipedestación', E: 'E · Movimientos repetitivos',
    F: 'F · Posturas forzadas', G: 'G · Vibraciones', H: 'H · Confort térmico', I: 'I · Estrés de contacto' },
  CALC: ['FECHA_LIMITE'],   // columnas con fórmula: no se escriben
  ID: { PUESTOS: ['ID_PUESTO', 'ERG-P-'], IDENTIFICACION: ['ID_IDENT', 'ERG-I-'], EVALUACIONES: ['ID_EVAL', 'ERG-E-'], MEDIDAS: ['ID_MEDIDA', 'ERG-M-'], SEGUIMIENTO: ['ID_SEG', 'ERG-S-'] },
  PLAZO_DIAS: { 'Actuar ya (30 días)': 30, 'Resolver rápido (90 días)': 90, 'Planificar (180 días)': 180 }
};
// Reglas de la Planilla 2 (Anexo I, Res. SRT 886/15). p1 / p2 = cantidad de preguntas de cada paso; inm = preguntas del Paso 1
// que, en SÍ, ya dan «no tolerable»; mejora = preguntas del Paso 2 que obligan a mejoras (2.E, esfuerzo > 7 Borg).
// G (vibraciones) tiene dos bloques: mano-brazo (Paso 1: 1 a 3; Paso 2: 1 y 2) y cuerpo entero (Paso 1: 4 y 5; Paso 2: 3 y 4).
const ERGO_REGLAS = {
  A: { p1: 3, p2: 6, inm: [3] }, B: { p1: 3, p2: 7, inm: [3] }, C: { p1: 5, p2: 4, inm: [5] }, D: { p1: 1, p2: 4 }, E: { p1: 1, p2: 4, mejora: [3] },
  F: { p1: 1, p2: 6 }, G: { p1: 5, p2: 4, bloques: [{ p1: [1, 2, 3], p2: [1, 2] }, { p1: [4, 5], p2: [3, 4] }] }, H: { p1: 1, p2: 1 }, I: { p1: 1, p2: 4 }
};

let ERGO_SS_ = null;
const ergoTxt_ = v => v instanceof Date ? Utilities.formatDate(v, TZ, 'yyyy-MM-dd') : String(v == null ? '' : v).trim();
const ergoFecha_ = s => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s || '')); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : (s || ''); };

function ergoLibro_() {
  if (ERGO_SS_) return ERGO_SS_;
  const id = PropertiesService.getScriptProperties().getProperty(ERGO.P_LIBRO) || ERGO.LIBRO;
  ERGO_SS_ = SpreadsheetApp.openById(id);
  return ERGO_SS_;
}
function ergoHoja_(n) { const sh = ergoLibro_().getSheetByName(n); if (!sh) throw new Error('Falta la hoja ' + n + ' en el libro de ergonomía.'); return sh; }
function ergoEnc_(sh) { return sh.getRange(5, 1, 1, sh.getLastColumn()).getValues()[0].map(ergoTxt_); }
// Última fila con ID (columna A): las fórmulas de otras columnas no cuentan
function ergoUltima_(sh) {
  const n = sh.getMaxRows() - 5; if (n < 1) return 5;
  const v = sh.getRange(6, 1, n, 1).getValues(); for (let i = v.length - 1; i >= 0; i--) if (String(v[i][0]).trim()) return 6 + i;
  return 5;
}
function ergoLeer_(n) {
  const sh = ergoHoja_(n), u = ergoUltima_(sh); if (u < 6) return [];
  const H = ergoEnc_(sh);
  return sh.getRange(6, 1, u - 5, H.length).getValues().map((r, i) => { const o = { _fila: 6 + i }; H.forEach((h, j) => { if (h) o[h] = ergoTxt_(r[j]); }); return o; }).filter(o => o[H[0]]);
}
function ergoListas_() {
  const sh = ergoHoja_('LISTAS'), H = ergoEnc_(sh), u = Math.max(6, sh.getLastRow()), V = sh.getRange(6, 1, u - 5, H.length).getValues(), L = {};
  H.forEach((h, j) => { if (h) L[h] = V.map(r => ergoTxt_(r[j])).filter(Boolean); });
  // SITIO_ESTABLECIMIENTO va alineado con SITIO
  L.SITIOS = V.map(r => ({ sitio: ergoTxt_(r[H.indexOf('SITIO')]), est: ergoTxt_(r[H.indexOf('SITIO_ESTABLECIMIENTO')]) })).filter(s => s.sitio);
  return L;
}
// Escribe un objeto en la fila (solo las claves que trae; crea columnas que falten; salta las de fórmula)
function ergoEscribir_(sh, fila, o) {
  let H = ergoEnc_(sh);
  const faltan = Object.keys(o).filter(k => k && k.charAt(0) !== '_' && H.indexOf(k) < 0);
  if (faltan.length) { sh.getRange(5, H.length + 1, 1, faltan.length).setValues([faltan]).setFontWeight('bold').setBackground('#0D313F').setFontColor('#FFFFFF'); H = H.concat(faltan); }
  const cols = H.map((h, j) => j).filter(j => Object.prototype.hasOwnProperty.call(o, H[j]) && ERGO.CALC.indexOf(H[j]) < 0);
  // tramos contiguos, para no pisar columnas que no vienen
  let i = 0;
  while (i < cols.length) { let k = i; while (k + 1 < cols.length && cols[k + 1] === cols[k] + 1) k++;
    sh.getRange(fila, cols[i] + 1, 1, k - i + 1).setValues([cols.slice(i, k + 1).map(j => { const v = o[H[j]]; return v == null ? '' : v; })]); i = k + 1; }
}
function ergoSigId_(n) {
  const [col, pref] = ERGO.ID[n]; let max = 0;
  ergoLeer_(n).forEach(r => { const m = new RegExp('^' + pref + '(\\d+)$').exec(r[col] || ''); if (m) max = Math.max(max, +m[1]); });
  return pref + ('000' + (max + 1)).slice(-4);
}
// Alta (sin ID) o cambio (con ID). Devuelve el ID.
function ergoGuardar_(n, o) {
  const sh = ergoHoja_(n), col = ERGO.ID[n][0];
  let id = o[col], fila = 0, accion = 'Cambio';
  if (id) { const r = ergoLeer_(n).find(x => x[col] === id); if (r) fila = r._fila; }
  if (!fila) { id = id || ergoSigId_(n); o[col] = id; fila = ergoUltima_(sh) + 1; accion = 'Alta'; }
  ergoEscribir_(sh, fila, o);
  ergoHist_(n, id, accion, Object.keys(o).filter(k => k !== col).slice(0, 12).join(', '));
  return id;
}
function ergoHist_(hoja, id, accion, detalle) {
  try { const sh = ergoHoja_('HISTORIAL'); ergoEscribir_(sh, Math.max(ergoUltima_(sh), 5) + 1, { FECHA_HORA: new Date(), USUARIO: Session.getActiveUser().getEmail() || 'Portal HyS', HOJA: hoja, ID: id, ACCION: accion, DETALLE: detalle }); } catch (e) {}
}
// Fotos: hasta 5 por campo. v = lista de dataURL (o lo que acepte guardarFotos_). Si no vienen fotos nuevas, queda el enlace anterior.
function ergoFotos_(id, campo, v, anterior) {
  if (!v || (Array.isArray(v) && !v.length)) return anterior || '';
  const dir = carpeta_(carpeta_(DriveApp.getFolderById(ERGO.CARPETA), 'Fotos'), id);
  return guardarFotos_(dir, id + ' · ' + campo, v) || anterior || '';
}

// ------------------------------------------------------------------ Resultado de la Planilla 2
function ergoResultado_(factor, R) {
  const g = ERGO_REGLAS[factor]; if (!g) return { resultado: 'Pendiente', etapa: 'Factor desconocido', nivel: '' };
  const p1 = (R && R.p1) || [], p2 = (R && R.p2) || [], si = v => v === 'Sí', no = v => v === 'No';
  const n1 = []; for (let i = 0; i < g.p1; i++) n1.push(p1[i] || '');
  if (n1.some(v => !v)) return { resultado: 'Pendiente', etapa: 'Faltan respuestas del Paso 1', nivel: '' };
  if (n1.every(no)) return { resultado: 'Tolerable', etapa: 'Paso 1: el factor no está en las condiciones de la norma', nivel: '1' };
  if ((g.inm || []).some(q => si(n1[q - 1]))) return { resultado: 'No tolerable', etapa: 'Paso 1: no tolerable · implementar mejoras', nivel: '3' };
  // preguntas del Paso 2 que corresponden (en G, solo las del bloque con algún SÍ en el Paso 1)
  let q2 = []; for (let i = 1; i <= g.p2; i++) q2.push(i);
  if (g.bloques) q2 = [].concat.apply([], g.bloques.filter(b => b.p1.some(q => si(n1[q - 1]))).map(b => b.p2));
  const v2 = q2.map(q => p2[q - 1] || '');
  if (v2.some(v => !v)) return { resultado: 'Pendiente', etapa: 'Faltan respuestas del Paso 2', nivel: '' };
  if ((g.mejora || []).some(q => q2.indexOf(q) >= 0 && si(p2[q - 1]))) return { resultado: 'A evaluar', etapa: 'Paso 2: esfuerzo mayor a 7 (Borg) · implementar mejoras y hacer la evaluación de riesgos', nivel: '' };
  if (v2.every(no)) return { resultado: 'Tolerable', etapa: 'Paso 2: todas NO · se presume tolerable', nivel: '1' };
  return { resultado: 'A evaluar', etapa: 'Paso 2: alguna SÍ · falta la evaluación de riesgos', nivel: '' };
}

// ------------------------------------------------------------------ Portal
function ergoPortal_(accion, x) {
  try {
    if (accion === 'p_ergo') return ergoDatos_();
    if (accion === 'p_ergo_puesto') return conLock_(() => ergoPuesto_(x));
    if (accion === 'p_ergo_ident') return conLock_(() => ergoIdent_(x));
    if (accion === 'p_ergo_eval') return conLock_(() => ergoEval_(x));
    if (accion === 'p_ergo_riesgo') return conLock_(() => ergoRiesgo_(x));
    if (accion === 'p_ergo_medida') return conLock_(() => ergoMedida_(x));
    if (accion === 'p_ergo_seg') return conLock_(() => ergoSeg_(x));
    return { ok: false, mensaje: 'Acción desconocida: ' + accion };
  } catch (e) { return { ok: false, mensaje: 'Ergonomía: ' + e.message }; }
}
function ergoDatos_() {
  const sin = L => L.map(o => { delete o._fila; return o; });
  return { ok: true, version: ERGO.VERSION, libro: ergoLibro_().getUrl(), carpeta: 'https://drive.google.com/drive/folders/' + ERGO.CARPETA,
    listas: ergoListas_(), puestos: sin(ergoLeer_('PUESTOS')), tareas: sin(ergoLeer_('TAREAS_TIPO')), ident: sin(ergoLeer_('IDENTIFICACION')),
    evals: sin(ergoLeer_('EVALUACIONES')), medidas: sin(ergoLeer_('MEDIDAS')), seg: sin(ergoLeer_('SEGUIMIENTO')) };
}
const ergoHoy_ = () => new Date();
function ergoPuesto_(x) {
  if (!x.ESTABLECIMIENTO || !x.FUNCION) return { ok: false, mensaje: 'Faltan el establecimiento y la función (puesto).' };
  const o = {}; ['ID_PUESTO', 'ESTABLECIMIENTO', 'SITIO', 'SERVICIO', 'FUNCION', 'FAMILIA', 'CANT_TRABAJADORES', 'TAREAS_SUGERIDAS', 'ESTADO', 'OBSERVACIONES'].forEach(k => { if (k in x) o[k] = x[k] === '' ? 's/d' : x[k]; });
  if (!o.ID_PUESTO) delete o.ID_PUESTO;
  if (!o.ESTADO) o.ESTADO = 'Confirmado';
  o.ACTUALIZADO = ergoHoy_();
  return { ok: true, id: ergoGuardar_('PUESTOS', o) };
}
// Planilla 1: una fila por puesto y tarea
function ergoIdent_(x) {
  const P = ergoLeer_('PUESTOS').find(p => p.ID_PUESTO === x.ID_PUESTO); if (!P) return { ok: false, mensaje: 'No encuentro el puesto ' + x.ID_PUESTO + '.' };
  if (!x.TAREA) return { ok: false, mensaje: 'Falta la tarea.' };
  const ant = x.ID_IDENT ? ergoLeer_('IDENTIFICACION').find(r => r.ID_IDENT === x.ID_IDENT) : null;
  const o = { ID_IDENT: x.ID_IDENT || '', FECHA: ergoFecha_(x.FECHA) || ergoHoy_(), ID_PUESTO: P.ID_PUESTO, ESTABLECIMIENTO: P.ESTABLECIMIENTO, SITIO: P.SITIO, TAREA: x.TAREA,
    TRABAJADORES_DEL_PUESTO: x.TRABAJADORES_DEL_PUESTO || P.CANT_TRABAJADORES || 's/d', MANIFESTACION_TEMPRANA: x.MANIFESTACION_TEMPRANA || 's/d', UBICACION_SINTOMA: x.UBICACION_SINTOMA || '',
    FRECUENCIA: x.FRECUENCIA || '', DURACION: x.DURACION || '', RESPONSABLE: x.RESPONSABLE || 'Belén Pellegrini (HyS)', OBSERVACIONES: x.OBSERVACIONES || '',
    AREA_SECTOR: x.AREA_SECTOR || P.SERVICIO || '', PROCEDIMIENTO_ESCRITO: x.PROCEDIMIENTO_ESCRITO || 's/d', CAPACITACION: x.CAPACITACION || 's/d', NOMBRES_TRABAJADORES: x.NOMBRES_TRABAJADORES || '',
    EXPOSICION: x.EXPOSICION || '', ESTADO: 'Vigente' };
  Object.keys(ERGO.FACTORES).forEach(f => { o[ERGO.FACTORES[f]] = x['F_' + f] === 'Sí' ? 'Sí' : 'No'; });
  ['GEN_INFORMO', 'GEN_CAP_SINTOMAS', 'GEN_CAP_PREVENCION', 'GEN_FECHA', 'GEN_OBS'].forEach(k => { if (k in x) o[k] = k === 'GEN_FECHA' ? ergoFecha_(x[k]) : x[k]; });
  if (!o.ID_IDENT) delete o.ID_IDENT;
  const id = ergoGuardar_('IDENTIFICACION', o);
  if (x.fotos && x.fotos.length) ergoEscribir_(ergoHoja_('IDENTIFICACION'), ergoLeer_('IDENTIFICACION').find(r => r.ID_IDENT === id)._fila, { FOTOS: ergoFotos_(id, 'Planilla 1', x.fotos, ant && ant.FOTOS) });
  // el puesto queda confirmado al identificarlo
  if (/precargado|sin relevar/i.test(P.ESTADO)) ergoGuardar_('PUESTOS', { ID_PUESTO: P.ID_PUESTO, ESTADO: 'Confirmado', ACTUALIZADO: ergoHoy_() });
  if (typeof pcBump_ === 'function') pcBump_();
  return { ok: true, id: id };
}
// Planilla 2: una fila por tarea (identificación) y factor
function ergoEval_(x) {
  const I = ergoLeer_('IDENTIFICACION').find(r => r.ID_IDENT === x.ID_IDENT); if (!I) return { ok: false, mensaje: 'No encuentro la identificación ' + x.ID_IDENT + '.' };
  const f = String(x.FACTOR || '').charAt(0); if (!ERGO_REGLAS[f]) return { ok: false, mensaje: 'Factor no válido.' };
  const ant = x.ID_EVAL ? ergoLeer_('EVALUACIONES').find(r => r.ID_EVAL === x.ID_EVAL) : null;
  const R = { p1: x.p1 || [], p2: x.p2 || [], datos: x.datos || {} }, res = ergoResultado_(f, R);
  const o = { ID_EVAL: x.ID_EVAL || '', FECHA: ergoFecha_(x.FECHA) || ergoHoy_(), ID_IDENT: I.ID_IDENT, ID_PUESTO: I.ID_PUESTO, ESTABLECIMIENTO: I.ESTABLECIMIENTO, SITIO: I.SITIO, TAREA: I.TAREA,
    FACTOR: f, PLANILLA: '2.' + f, RESPUESTAS: JSON.stringify(R), RESULTADO: res.resultado, ETAPA: res.etapa, RESPONSABLE: x.RESPONSABLE || 'Belén Pellegrini (HyS)', OBSERVACIONES: x.OBSERVACIONES || '' };
  // si ya tenía evaluación de riesgos y el Paso 2 sigue sin presumir tolerable, se conserva su nivel
  if (res.nivel) o.NIVEL_RIESGO = res.nivel; else if (!(ant && ant.METODO)) o.NIVEL_RIESGO = '';
  if (ant && ant.METODO && res.resultado === 'A evaluar') { o.RESULTADO = ant.NIVEL_RIESGO === '1' ? 'Tolerable' : ant.NIVEL_RIESGO === '2' ? 'Moderado' : 'No tolerable'; o.ETAPA = 'Evaluación de riesgos hecha (' + ant.METODO + ')'; }
  if (!o.ID_EVAL) delete o.ID_EVAL;
  const id = ergoGuardar_('EVALUACIONES', o);
  if (x.fotos && x.fotos.length) ergoEscribir_(ergoHoja_('EVALUACIONES'), ergoLeer_('EVALUACIONES').find(r => r.ID_EVAL === id)._fila, { FOTOS: ergoFotos_(id, 'Planilla 2.' + f, x.fotos, ant && ant.FOTOS) });
  if (typeof pcBump_ === 'function') pcBump_();
  return { ok: true, id: id, resultado: o.RESULTADO, etapa: o.ETAPA, nivel: o.NIVEL_RIESGO || '' };
}
// Evaluación de riesgos (sobre la fila de la Planilla 2)
function ergoRiesgo_(x) {
  const E = ergoLeer_('EVALUACIONES').find(r => r.ID_EVAL === x.ID_EVAL); if (!E) return { ok: false, mensaje: 'No encuentro la evaluación ' + x.ID_EVAL + '.' };
  if (!/^[123]$/.test(String(x.NIVEL_RIESGO))) return { ok: false, mensaje: 'Elegí el nivel de riesgo (1, 2 o 3).' };
  if (!x.METODO) return { ok: false, mensaje: 'Indicá el método usado.' };
  const n = String(x.NIVEL_RIESGO), o = { NIVEL_RIESGO: n, METODO: x.METODO, METODO_DETALLE: x.METODO_DETALLE || '', EVALUADOR: x.EVALUADOR || 's/d', FECHA_EVAL_RIESGO: ergoFecha_(x.FECHA_EVAL_RIESGO) || ergoHoy_(),
    RESULTADO: n === '1' ? 'Tolerable' : n === '2' ? 'Moderado' : 'No tolerable', ETAPA: 'Evaluación de riesgos hecha (' + x.METODO + ')' };
  if (x.fotos && x.fotos.length) o.FOTOS_RIESGO = ergoFotos_(E.ID_EVAL, 'Evaluación de riesgos', x.fotos, E.FOTOS_RIESGO);
  ergoEscribir_(ergoHoja_('EVALUACIONES'), E._fila, o); ergoHist_('EVALUACIONES', E.ID_EVAL, 'Evaluación de riesgos', 'Nivel ' + n + ' · ' + x.METODO);
  if (typeof pcBump_ === 'function') pcBump_();
  return { ok: true, id: E.ID_EVAL, resultado: o.RESULTADO, nivel: n };
}
// Planilla 3: medida específica
function ergoMedida_(x) {
  const E = x.ID_EVAL ? ergoLeer_('EVALUACIONES').find(r => r.ID_EVAL === x.ID_EVAL) : null;
  const P = ergoLeer_('PUESTOS').find(p => p.ID_PUESTO === (x.ID_PUESTO || (E && E.ID_PUESTO)));
  if (!P) return { ok: false, mensaje: 'No encuentro el puesto.' };
  if (!x.DESCRIPCION) return { ok: false, mensaje: 'Falta describir la medida.' };
  const ant = x.ID_MEDIDA ? ergoLeer_('MEDIDAS').find(r => r.ID_MEDIDA === x.ID_MEDIDA) : null;
  const o = { ID_MEDIDA: x.ID_MEDIDA || '', FECHA_ALTA: ergoFecha_(x.FECHA_ALTA) || (ant ? ergoFecha_(ant.FECHA_ALTA) : ergoHoy_()), ID_EVAL: E ? E.ID_EVAL : (x.ID_EVAL || ''), ID_PUESTO: P.ID_PUESTO,
    ESTABLECIMIENTO: P.ESTABLECIMIENTO, SITIO: P.SITIO, FACTOR: E ? E.FACTOR : (x.FACTOR || ''), TIPO: x.TIPO || 's/d', DESCRIPCION: x.DESCRIPCION, DEPENDE_DE: x.DEPENDE_DE || 's/d',
    PLAZO: x.PLAZO || '', RESPONSABLE: x.RESPONSABLE || 's/d', ESTADO: x.ESTADO || (ant ? ant.ESTADO : 'Abierta'), OBSERVACIONES: x.OBSERVACIONES || '' };
  if (!o.ID_MEDIDA) delete o.ID_MEDIDA;
  const id = ergoGuardar_('MEDIDAS', o);
  if (x.fotos && x.fotos.length) ergoEscribir_(ergoHoja_('MEDIDAS'), ergoLeer_('MEDIDAS').find(r => r.ID_MEDIDA === id)._fila, { FOTOS: ergoFotos_(id, 'Medida', x.fotos, ant && ant.FOTOS) });
  if (typeof pcBump_ === 'function') pcBump_();
  return { ok: true, id: id };
}
// Planilla 4: seguimiento de una medida
function ergoSeg_(x) {
  const M = ergoLeer_('MEDIDAS').find(r => r.ID_MEDIDA === x.ID_MEDIDA); if (!M) return { ok: false, mensaje: 'No encuentro la medida ' + x.ID_MEDIDA + '.' };
  if (!x.ESTADO_MEDIDA) return { ok: false, mensaje: 'Indicá si la medida está implementada.' };
  const f = ergoFecha_(x.FECHA) || ergoHoy_();
  const o = { FECHA: f, ID_MEDIDA: M.ID_MEDIDA, ESTADO_MEDIDA: x.ESTADO_MEDIDA, EFICACIA: x.EFICACIA || 's/d', REEVALUAR: x.REEVALUAR || 's/d', RESPONSABLE: x.RESPONSABLE || 'Belén Pellegrini (HyS)', OBSERVACIONES: x.OBSERVACIONES || '' };
  const id = ergoGuardar_('SEGUIMIENTO', o);
  if (x.fotos && x.fotos.length) ergoEscribir_(ergoHoja_('SEGUIMIENTO'), ergoLeer_('SEGUIMIENTO').find(r => r.ID_SEG === id)._fila, { FOTOS: ergoFotos_(id, 'Seguimiento', x.fotos, '') });
  // la medida toma el estado del seguimiento más nuevo
  const m = { ESTADO: x.ESTADO_MEDIDA === 'Implementada' ? 'Cumplida' : x.ESTADO_MEDIDA === 'Parcial' ? 'En curso' : 'Abierta' };
  if (x.ESTADO_MEDIDA === 'Implementada' && !M.FECHA_IMPLEMENTACION) m.FECHA_IMPLEMENTACION = f;
  if (x.ESTADO_MEDIDA === 'Implementada' && x.EFICACIA === 'Eficaz' && x.REEVALUAR !== 'Sí') m.FECHA_CIERRE = f;
  ergoEscribir_(ergoHoja_('MEDIDAS'), M._fila, m); ergoHist_('MEDIDAS', M.ID_MEDIDA, 'Seguimiento', x.ESTADO_MEDIDA + ' · ' + (x.EFICACIA || 's/d'));
  if (typeof pcBump_ === 'function') pcBump_();
  return { ok: true, id: id };
}
