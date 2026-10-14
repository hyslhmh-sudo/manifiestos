/**
 * SISTEMA HyS · 11 · GESTIÓN (fase 3 · versión 14.64 · 14/10/2026)
 * Alcance (niveles A y B), registro único de hallazgos, bandeja de sugeridos, plan de acción único y necesidades de inversión.
 * Todo vive en la BASE COMÚN (hojas GES_ALCANCE, GES_EMPRESAS, GES_HALLAZGOS, GES_ACCIONES): respaldo en Sheets y editable también
 * desde «Datos · editar todo». No envía correos.
 *
 * Paso de lo que ya existe («Traer de los módulos», también cada mañana con el precalentado):
 *   · DIAGNÓSTICO › PLAN_ACCION (diagnósticos de residuos, agua, plagas y cocinas, y auditorías), con su estado e historial.
 *   · M8 › HALLAZGOS_PLAN (servicios e infraestructura).
 *   · Reglas automáticas (Reglas.gs › GES_REGLAS, fase 3): agua NO APTA, plagas atrasadas, residuos (categoría y acopio, certificados),
 *     agua (análisis, limpieza, tapas), incendio (extintores, recorridas) e infraestructura (mediciones, RGRL «No»). Lo abierto en plazo es alerta, no hallazgo.
 * Las hojas de origen no se borran. Al cerrar una acción en Gestión se marca también en su plan de origen (PLAN_ACCION o HALLAZGOS_PLAN).
 */

const GES = {
  MODULOS: ['1 · Residuos', '2 · Agua', '3 · Plagas', '4 · Cocinas hospitalarias', '5 · Radiaciones ionizantes', '6 · Servicios e infraestructura',
    '7 · Protección contra incendios', '8 · Personal y RAR', '9 · Capacitaciones', '10 · Documentos', '11 · Gestión'],
  NIVELES: ['A', 'B', 'Sin habilitar'],
  H_ALC: ['ESTABLECIMIENTO', 'MODULO', 'NIVEL', 'DESDE', 'OBSERVACIONES', 'ACTUALIZADO'],
  H_EMP: ['ESTABLECIMIENTO', 'EMPRESA', 'MODULO', 'QUE_LE_TOCA', 'REFERENCIA_CONTRATO', 'CONTACTO', 'ACTUALIZADO', 'PALABRAS_CLAVE'],   // PALABRAS_CLAVE (14.63): separadas por «|»; vacía = todo el módulo
  H_HAL: ['ID', 'FECHA', 'ESTABLECIMIENTO', 'MODULO', 'SITIO', 'DESCRIPCION', 'ORIGEN', 'REFERENCIA_ORIGEN', 'FUENTE', 'GRAVEDAD', 'URGENCIA', 'PRIORIDAD',
    'EVIDENCIA', 'ENTRADA', 'ESTADO', 'MOTIVO', 'CLAVE', 'ACTUALIZADO'],
  H_ACC: ['ID', 'HALLAZGO', 'ESTABLECIMIENTO', 'MODULO', 'ACCION', 'SITIO', 'RESPONSABLE', 'PLAZO_DIAS', 'FECHA_ALTA', 'FECHA_LIMITE', 'REQUIERE_DIRECCION',
    'TIPO_RECURSO', 'COSTO_ESTIMADO', 'ESTADO', 'FECHA_ELEVADA', 'RESPUESTA_DIRECCION', 'FECHA_RESPUESTA', 'AVANCE', 'EVIDENCIA', 'FECHA_HECHA',
    'FECHA_VERIFICACION', 'MOTIVO', 'CLAVE', 'SEGUIMIENTO', 'HISTORIAL', 'ACTUALIZADO'],
  HAL_ESTADOS: ['Sugerido', 'Confirmado', 'Descartado', 'Cerrado'],
  ORIGENES: ['Diagnóstico', 'Auditoría', 'Relevamiento', 'Análisis de agua', 'Caso de plagas', 'RGRL', 'Recorrida', 'Entrevista', 'Reclamo', 'Siniestro', 'Regla automática', 'Otro'],
  ESTADOS: ['Propuesta', 'Elevada', 'Aprobada', 'No aprobada', 'En curso', 'Hecha', 'Eficaz', 'No eficaz', 'No se realiza', 'Pendiente de recursos'],
  ABIERTOS: ['Propuesta', 'Elevada', 'Aprobada', 'En curso', 'No eficaz'],
  CERRADOS: ['Hecha', 'Eficaz', 'No se realiza'],
  RECURSOS: ['Gestión', 'Insumos', 'Inversión'],
  NIVEL_GU: ['Alta', 'Baja'],
  PRIORIDADES: ['Actuar ya', 'Resolver rápido', 'Planificar', 'Monitorear'],
  PLAZO: { 'Actuar ya': 30, 'Resolver rápido': 90, 'Planificar': 180, 'Monitorear': 180 },
  SIN_RESPUESTA_DIAS: 60,
  M8_ID: '1YgClAXgqLHvSRzFLV9AdX5UnGvtdINX__y0QGM7DTPc',
  NIVEL_A: ['HZT', 'HMH', 'HSST']
};

// ------------------------------------------------------------------ Hojas
function gesHoja_(nombre, titulo, ayuda, cols, listas) {
  const bc = pBC_(); let sh = bc.getSheetByName(nombre);
  if (!sh) {
    sh = bc.insertSheet(nombre); encabezar_(sh, titulo, ayuda, cols);
    Object.keys(listas || {}).forEach(k => { const i = cols.indexOf(k); if (i >= 0) lista_(sh, i, 2000, listas[k]); });
  }
  return sh;
}
const gesAlc_ = () => gesHoja_('GES_ALCANCE', 'Gestión · Alcance por establecimiento', 'Una fila por establecimiento y módulo: nivel A (programa de seguridad), B (lineamientos provinciales) o sin habilitar, y desde cuándo.', GES.H_ALC, { MODULO: GES.MODULOS, NIVEL: GES.NIVELES });
const gesEmp_ = () => gesHoja_('GES_EMPRESAS', 'Gestión · Empresas contratistas por establecimiento', 'Qué le toca a cada empresa por contrato o plan de trabajo, para asignar acciones y citar la cláusula.', GES.H_EMP, { MODULO: GES.MODULOS });
const gesHal_ = () => gesHoja_('GES_HALLAZGOS', 'Gestión · Registro único de hallazgos', 'Un hallazgo es un incumplimiento con fuente escrita que pide una acción. Estados: Sugerido (bandeja), Confirmado, Descartado (con motivo), Cerrado.', GES.H_HAL, { MODULO: GES.MODULOS, ORIGEN: GES.ORIGENES, GRAVEDAD: GES.NIVEL_GU, URGENCIA: GES.NIVEL_GU, PRIORIDAD: GES.PRIORIDADES, ESTADO: GES.HAL_ESTADOS });
const gesAcc_ = () => gesHoja_('GES_ACCIONES', 'Gestión · Plan de acción único', 'Una fila por acción. Inversión no cuenta contra HyS: va a «Necesidades de inversión». El historial de cada acción queda en la columna HISTORIAL.', GES.H_ACC, { MODULO: GES.MODULOS, REQUIERE_DIRECCION: ['Sí', 'No'], TIPO_RECURSO: GES.RECURSOS, ESTADO: GES.ESTADOS });

function gesLeer_(sh, H) {
  const n = sh.getLastRow() - 5; if (n < 1) return [];
  return sh.getRange(6, 1, n, H.length).getValues().map((r, i) => { const o = { fila: 6 + i }; H.forEach((h, j) => o[h] = pFecha_(r[j])); return o; }).filter(o => H.some(h => o[h] !== ''));
}
const gesHoy_ = () => Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd');
const gesAhora_ = () => Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm');
const gesSuma_ = (f, d) => { if (!f || !d) return ''; const x = new Date(String(f).slice(0, 10) + 'T12:00:00'); x.setDate(x.getDate() + Number(d)); return Utilities.formatDate(x, TZ, 'yyyy-MM-dd'); };
function gesSiguiente_(L, pre) { let m = 0; L.forEach(o => { const k = String(o.ID).match(new RegExp('^' + pre + '-(\\d+)$')); if (k) m = Math.max(m, Number(k[1])); }); return n => pre + '-' + ('0000' + (m + n)).slice(-4); }
function gesEscribir_(sh, H, fila, o) { sh.getRange(fila, 1, 1, H.length).setValues([H.map(h => o[h] == null ? '' : o[h])]); }
function gesAgregar_(sh, H, filas) { if (filas.length) sh.getRange(Math.max(sh.getLastRow(), 5) + 1, 1, filas.length, H.length).setValues(filas.map(o => H.map(h => o[h] == null ? '' : o[h]))); }

// Prioridad = gravedad × urgencia (las mismas cuatro de los diagnósticos)
function gesPrioridad_(g, u) {
  const G = g === 'Alta', U = u === 'Alta';
  return G && U ? 'Actuar ya' : U ? 'Resolver rápido' : G ? 'Planificar' : (g || u) ? 'Monitorear' : '';
}
const gesGU_ = p => ({ 'Actuar ya': ['Alta', 'Alta'], 'Resolver rápido': ['Baja', 'Alta'], 'Planificar': ['Alta', 'Baja'], 'Monitorear': ['Baja', 'Baja'] })[p] || ['', ''];
const gesRecurso_ = s => { s = String(s || '').toLowerCase(); return /invers|obra|alto|contrat|equip/.test(s) ? 'Inversión' : /sin costo|gesti|organiz|capacit|procedim/.test(s) ? 'Gestión' : /bajo|insum|stock|existente|menor/.test(s) ? 'Insumos' : ''; };
const gesModNum_ = m => { const k = String(m || '').match(/^(\d+)/); return k ? Number(k[1]) : 0; };

// Estado para mostrar (no se guarda): vencida, sin respuesta, pendiente de recursos
function gesMirar_(a, hoy) {
  const abierta = GES.ABIERTOS.indexOf(a.ESTADO) >= 0 || !a.ESTADO, inv = a.TIPO_RECURSO === 'Inversión';
  a.abierta = abierta || a.ESTADO === 'Pendiente de recursos';
  a.vencida = abierta && !inv && a.ESTADO !== 'Elevada' && !!a.FECHA_LIMITE && a.FECHA_LIMITE < hoy;
  a.sinRespuesta = a.ESTADO === 'Elevada' && !!a.FECHA_ELEVADA && gesSuma_(a.FECHA_ELEVADA, GES.SIN_RESPUESTA_DIAS) < hoy;
  a.verificar = a.ESTADO === 'Hecha';
  return a;
}

// ------------------------------------------------------------------ Alcance
function gesSembrarAlcance_() {
  const sh = gesAlc_(); if (sh.getLastRow() > 5) return 0;
  const hoy = gesHoy_(), filas = [];
  pEstablecimientos_().filas.forEach(f => {
    const cod = limpio_(f.v[0]), area = String(f.v[4] || ''); if (!cod) return;
    GES.MODULOS.slice(0, 10).forEach(m => {
      if (GES.NIVEL_A.indexOf(cod) >= 0) filas.push({ ESTABLECIMIENTO: cod, MODULO: m, NIVEL: 'A', DESDE: hoy, OBSERVACIONES: 'Programa de seguridad', ACTUALIZADO: hoy });
      else if (/trelew/i.test(area) && /^1 /.test(m)) filas.push({ ESTABLECIMIENTO: cod, MODULO: m, NIVEL: 'B', DESDE: hoy, OBSERVACIONES: 'Lineamientos: área programática Trelew empieza por residuos', ACTUALIZADO: hoy });
    });
  });
  gesAgregar_(sh, GES.H_ALC, filas);
  gesEmpColumnas_();
  const se = gesEmp_(); if (se.getLastRow() <= 5) gesAgregar_(se, GES.H_EMP, [
    { ESTABLECIMIENTO: 'HMH', EMPRESA: 'SOMI', MODULO: '7 · Protección contra incendios', QUE_LE_TOCA: 'Control y reposición de extintores; colabora en incendio y evacuación', REFERENCIA_CONTRATO: 'Plan de trabajos – Mantenimiento preventivo, Hospital María Humphreys, 12 meses', ACTUALIZADO: hoy, PALABRAS_CLAVE: 'extintor|matafuego|carga vencida|prueba hidráulica' },
    { ESTABLECIMIENTO: 'HMH', EMPRESA: 'SOMI', MODULO: '1 · Residuos', QUE_LE_TOCA: 'Mantenimiento de la planta de efluentes y de equipos de tratamiento de residuos (meses 9 y 10 del plan)', REFERENCIA_CONTRATO: 'Plan de trabajos – Mantenimiento preventivo, Hospital María Humphreys, 12 meses', ACTUALIZADO: hoy, PALABRAS_CLAVE: 'efluente|planta de tratamiento|autoclave|equipo de tratamiento' },
    { ESTABLECIMIENTO: 'HMH', EMPRESA: 'MAREM', MODULO: '7 · Protección contra incendios', QUE_LE_TOCA: 'Colabora en incendio y evacuación (por contrato)', REFERENCIA_CONTRATO: 'Sin contrato ni plan cargado: no se asigna en forma automática', ACTUALIZADO: hoy }]);
  return filas.length;
}
// 14.63: agrega la columna PALABRAS_CLAVE a GES_EMPRESAS (al final) y completa las de SOMI la primera vez
function gesEmpColumnas_() {
  const sh = gesEmp_(), c = GES.H_EMP.length;
  if (String(sh.getRange(5, c).getValue()).trim() === 'PALABRAS_CLAVE') return;
  sh.getRange(5, c).setValue('PALABRAS_CLAVE').setFontWeight('bold').setFontColor('#FFFFFF').setBackground('#0D313F').setNote('Palabras que tiene que tener la acción para asignársela a la empresa, separadas por «|». Vacía = todas las del módulo. Si la referencia dice «Sin contrato», no se asigna sola.');
  gesLeer_(sh, GES.H_EMP).forEach(o => { if (o.EMPRESA !== 'SOMI') return;
    const k = /incendio/i.test(o.MODULO) ? 'extintor|matafuego|carga vencida|prueba hidráulica' : /residuos/i.test(o.MODULO) ? 'efluente|planta de tratamiento|autoclave|equipo de tratamiento' : '';
    if (k) sh.getRange(o.fila, c).setValue(k); });
}
// Asignación automática por contrato: si la acción no tiene responsable y una empresa del establecimiento tiene ese módulo
// (y, si hay palabras clave, alguna aparece en la acción o el hallazgo), queda a su cargo y se cita el contrato.
function gesAsignar_(a, h, EMP) {
  if (a.RESPONSABLE) return '';
  const txt = String(a.ACCION + ' ' + (h ? h.DESCRIPCION : '') + ' ' + (a.SITIO || '')).toLowerCase();
  const e = (EMP || []).find(o => o.ESTABLECIMIENTO === a.ESTABLECIMIENTO && o.MODULO === a.MODULO && !/sin contrato/i.test(o.REFERENCIA_CONTRATO) &&
    (!o.PALABRAS_CLAVE || String(o.PALABRAS_CLAVE).toLowerCase().split('|').map(x => x.trim()).filter(String).some(x => txt.indexOf(x) >= 0)));
  if (!e) return '';
  a.RESPONSABLE = e.EMPRESA;
  return 'Asignada a ' + e.EMPRESA + ' por contrato: ' + e.QUE_LE_TOCA + ' (' + e.REFERENCIA_CONTRATO + ')';
}
function gesAlcance_() {
  gesSembrarAlcance_();
  const L = gesLeer_(gesAlc_(), GES.H_ALC), E = pEstablecimientos_().filas.map(f => ({ cod: limpio_(f.v[0]), nombre: String(f.v[2] || f.v[1] || ''), tipo: String(f.v[3] || ''), area: String(f.v[4] || '') })).filter(e => e.cod);
  return { ok: true, modulos: GES.MODULOS.slice(0, 10), niveles: GES.NIVELES, establecimientos: E, celdas: L, empresas: gesLeer_(gesEmp_(), GES.H_EMP) };
}
function gesNivelDe_(L, cod, modulo) { const c = L.find(o => o.ESTABLECIMIENTO === cod && o.MODULO === modulo); return c ? c.NIVEL : 'Sin habilitar'; }
function gesAlcanceGuardar_(x) {
  return conLock_(() => {
    const sh = gesAlc_(), L = gesLeer_(sh, GES.H_ALC), hoy = gesHoy_(), cod = limpio_(x.cod);
    if (!cod || GES.MODULOS.indexOf(x.modulo) < 0 || GES.NIVELES.indexOf(x.nivel) < 0) return { ok: false, mensaje: 'Faltan el establecimiento, el módulo o el nivel.' };
    const c = L.find(o => o.ESTABLECIMIENTO === cod && o.MODULO === x.modulo), antes = c ? c.NIVEL : 'Sin habilitar';
    const o = Object.assign({}, c || { ESTABLECIMIENTO: cod, MODULO: x.modulo }, { NIVEL: x.nivel, DESDE: x.desde || (c && c.NIVEL === x.nivel ? c.DESDE : hoy), OBSERVACIONES: x.obs != null ? x.obs : (c ? c.OBSERVACIONES : ''), ACTUALIZADO: hoy });
    if (c) gesEscribir_(sh, GES.H_ALC, c.fila, o); else gesAgregar_(sh, GES.H_ALC, [o]);
    if (antes !== x.nivel) pHistorial_(pBC_(), [[new Date(), 'GES_ALCANCE', cod, x.modulo, antes, x.nivel, 'Portal HyS']]);
    return { ok: true };
  });
}

// ------------------------------------------------------------------ Lectura general
function gesDatos_() {
  gesSembrarAlcance_();
  const hoy = gesHoy_(), H = gesLeer_(gesHal_(), GES.H_HAL), A = gesLeer_(gesAcc_(), GES.H_ACC).map(a => gesMirar_(a, hoy));
  const E = pEstablecimientos_().filas.map(f => ({ cod: limpio_(f.v[0]), nombre: String(f.v[2] || f.v[1] || '') })).filter(e => e.cod);
  const resp = Array.from(new Set(A.map(a => a.RESPONSABLE).filter(String))).sort();
  return { ok: true, hoy: hoy, hallazgos: H, acciones: A, establecimientos: E, responsables: resp, empresas: gesLeer_(gesEmp_(), GES.H_EMP),
    listas: { modulos: GES.MODULOS, estados: GES.ESTADOS, halEstados: GES.HAL_ESTADOS, origenes: GES.ORIGENES, recursos: GES.RECURSOS, gu: GES.NIVEL_GU, prioridades: GES.PRIORIDADES, plazos: [30, 90, 180] },
    actualizado: new Date().toISOString() };
}

// ------------------------------------------------------------------ Hallazgos
function gesHallazgoGuardar_(x) {
  return conLock_(() => {
    const sh = gesHal_(), L = gesLeer_(sh, GES.H_HAL), hoy = gesHoy_(), d = x.datos || {};
    const c = x.id ? L.find(o => o.ID === x.id) : null; if (x.id && !c) return { ok: false, mensaje: 'No encuentro el hallazgo ' + x.id + '. Actualizá la pantalla.' };
    const o = Object.assign({}, c || { ID: gesSiguiente_(L, 'HZ')(1), FECHA: hoy, ENTRADA: 'Manual', ESTADO: 'Confirmado', ORIGEN: 'Otro' }, d, { ACTUALIZADO: gesAhora_() });
    if (!o.ESTABLECIMIENTO || !o.MODULO || !o.DESCRIPCION) return { ok: false, mensaje: 'Completá establecimiento, módulo y descripción.' };
    o.ESTABLECIMIENTO = limpio_(o.ESTABLECIMIENTO);
    if (d.GRAVEDAD != null || d.URGENCIA != null) { const p = gesPrioridad_(o.GRAVEDAD, o.URGENCIA); if (p && !d.PRIORIDAD) o.PRIORIDAD = p; }
    if (o.ESTADO === 'Descartado' && !o.MOTIVO) return { ok: false, mensaje: 'Para descartar, escribí el motivo.' };
    if (c) { const cam = GES.H_HAL.filter(h => h !== 'ACTUALIZADO' && String(c[h]) !== String(o[h])).map(h => [new Date(), 'GES_HALLAZGOS', o.ID, h, c[h], o[h], 'Portal HyS']); gesEscribir_(sh, GES.H_HAL, c.fila, o); if (cam.length) pHistorial_(pBC_(), cam); }
    else gesAgregar_(sh, GES.H_HAL, [o]);
    let accion = null;
    if (x.conAccion && o.ESTADO === 'Confirmado') accion = gesAccionNueva_(o, x.accion || {});
    return { ok: true, id: o.ID, accion: accion };
  });
}
// Confirmar o descartar desde la bandeja (un toque)
function gesBandeja_(x) {
  return conLock_(() => {
    const sh = gesHal_(), L = gesLeer_(sh, GES.H_HAL), c = L.find(o => o.ID === x.id);
    if (!c) return { ok: false, mensaje: 'No encuentro el hallazgo. Actualizá la pantalla.' };
    if (c.ESTADO !== 'Sugerido') return { ok: false, mensaje: 'Este hallazgo ya está ' + c.ESTADO.toLowerCase() + '.' };
    if (x.decision === 'descartar') { if (!x.motivo) return { ok: false, mensaje: 'Escribí el motivo del descarte.' }; c.ESTADO = 'Descartado'; c.MOTIVO = x.motivo; }
    else c.ESTADO = 'Confirmado';
    c.ACTUALIZADO = gesAhora_(); gesEscribir_(sh, GES.H_HAL, c.fila, c);
    pHistorial_(pBC_(), [[new Date(), 'GES_HALLAZGOS', c.ID, 'ESTADO', 'Sugerido', c.ESTADO, 'Portal HyS · bandeja']]);
    let accion = null; if (c.ESTADO === 'Confirmado') { const ya = gesLeer_(gesAcc_(), GES.H_ACC).some(a => a.HALLAZGO === c.ID); if (!ya) accion = gesAccionNueva_(c, x.accion || {}); }
    return { ok: true, accion: accion };
  });
}

// ------------------------------------------------------------------ Acciones
function gesAccionNueva_(h, d) {
  const sh = gesAcc_(), L = gesLeer_(sh, GES.H_ACC), hoy = gesHoy_(), plazo = Number(d.PLAZO_DIAS) || GES.PLAZO[h.PRIORIDAD] || 90;
  const o = Object.assign({ ID: gesSiguiente_(L, 'AC')(1), HALLAZGO: h.ID, ESTABLECIMIENTO: h.ESTABLECIMIENTO, MODULO: h.MODULO, ACCION: d.ACCION || 'A definir: ' + h.DESCRIPCION, SITIO: h.SITIO,
    RESPONSABLE: '', PLAZO_DIAS: plazo, FECHA_ALTA: hoy, REQUIERE_DIRECCION: 'No', TIPO_RECURSO: '', ESTADO: 'Propuesta', CLAVE: h.CLAVE || '' }, d);
  o.FECHA_LIMITE = o.FECHA_LIMITE || gesSuma_(o.FECHA_ALTA, o.PLAZO_DIAS);
  let asig = ''; try { gesEmpColumnas_(); asig = gesAsignar_(o, h, gesLeer_(gesEmp_(), GES.H_EMP)); } catch (e) {}
  o.HISTORIAL = gesAhora_() + ' · Alta (' + o.ESTADO + ')' + (asig ? '\n' + gesAhora_() + ' · ' + asig : ''); o.SEGUIMIENTO = hoy; o.ACTUALIZADO = gesAhora_();
  gesAgregar_(sh, GES.H_ACC, [o]);
  return o.ID;
}
function gesAccionGuardar_(x) {
  const r = conLock_(() => {
    const sh = gesAcc_(), L = gesLeer_(sh, GES.H_ACC), hoy = gesHoy_(), d = Object.assign({}, x.datos || {});
    const c = x.id ? L.find(o => o.ID === x.id) : null; if (x.id && !c) return { ok: false, mensaje: 'No encuentro la acción ' + x.id + '. Actualizá la pantalla.' };
    if (!c) {   // acción nueva sin hallazgo previo: se crea también el hallazgo (todo hallazgo tiene su acción y viceversa)
      if (!d.ESTABLECIMIENTO || !d.MODULO || !d.ACCION) return { ok: false, mensaje: 'Completá establecimiento, módulo y acción.' };
      const hs = gesHal_(), HL = gesLeer_(hs, GES.H_HAL), id = gesSiguiente_(HL, 'HZ')(1);
      gesAgregar_(hs, GES.H_HAL, [{ ID: id, FECHA: hoy, ESTABLECIMIENTO: limpio_(d.ESTABLECIMIENTO), MODULO: d.MODULO, SITIO: d.SITIO || '', DESCRIPCION: d.HALLAZGO_DESC || d.ACCION, ORIGEN: d.ORIGEN || 'Otro', FUENTE: d.FUENTE || '', PRIORIDAD: d.PRIORIDAD || '', ENTRADA: 'Manual', ESTADO: 'Confirmado', ACTUALIZADO: gesAhora_() }]);
      ['HALLAZGO_DESC', 'ORIGEN', 'FUENTE', 'PRIORIDAD'].forEach(k => delete d[k]);
      d.ESTABLECIMIENTO = limpio_(d.ESTABLECIMIENTO);
      return { ok: true, id: gesAccionNueva_({ ID: id, ESTABLECIMIENTO: d.ESTABLECIMIENTO, MODULO: d.MODULO, SITIO: d.SITIO, PRIORIDAD: '' }, d), nueva: true };
    }
    const o = Object.assign({}, c, d), notas = [];
    // Reglas del ciclo
    if (o.TIPO_RECURSO === 'Inversión' && o.ESTADO === 'No aprobada') o.ESTADO = 'Pendiente de recursos';
    if (o.ESTADO === 'Elevada' && !o.FECHA_ELEVADA) o.FECHA_ELEVADA = hoy;
    if ((o.ESTADO === 'Aprobada' || o.ESTADO === 'No aprobada') && !o.FECHA_RESPUESTA) o.FECHA_RESPUESTA = hoy;
    if (o.ESTADO === 'Hecha' && !o.FECHA_HECHA) o.FECHA_HECHA = hoy;
    if ((o.ESTADO === 'No se realiza' || o.ESTADO === 'Pendiente de recursos') && !o.MOTIVO) return { ok: false, mensaje: 'Para «' + o.ESTADO + '» escribí el motivo.' };
    if (o.ESTADO === 'Eficaz' && !o.EVIDENCIA) return { ok: false, mensaje: 'Para marcar eficaz hace falta la evidencia.' };
    if (o.ESTADO === 'Eficaz' && !o.FECHA_VERIFICACION) o.FECHA_VERIFICACION = hoy;
    if (o.ESTADO === 'No eficaz') { o.FECHA_VERIFICACION = hoy; o.ESTADO = 'En curso'; o.FECHA_HECHA = ''; notas.push('Verificación: no eficaz, vuelve a En curso'); }
    // Plazo: desde el alta, o desde la aprobación si requiere Dirección
    if (d.FECHA_LIMITE == null && (d.PLAZO_DIAS != null || d.ESTADO === 'Aprobada' || d.REQUIERE_DIRECCION != null)) {
      const base = o.REQUIERE_DIRECCION === 'Sí' && o.FECHA_RESPUESTA ? o.FECHA_RESPUESTA : o.FECHA_ALTA;
      o.FECHA_LIMITE = gesSuma_(base, o.PLAZO_DIAS) || o.FECHA_LIMITE;
    }
    const cam = GES.H_ACC.filter(h => ['HISTORIAL', 'ACTUALIZADO', 'SEGUIMIENTO'].indexOf(h) < 0 && String(c[h]) !== String(o[h]));
    if (!cam.length) return { ok: true, cambios: 0 };
    if (c.ESTADO !== o.ESTADO) notas.unshift(c.ESTADO + ' → ' + o.ESTADO);
    if (d.AVANCE && d.AVANCE !== c.AVANCE) notas.push('Avance: ' + String(d.AVANCE).slice(0, 120));
    if (notas.length) o.HISTORIAL = (c.HISTORIAL ? c.HISTORIAL + '\n' : '') + gesAhora_() + ' · ' + notas.join(' · ');
    o.SEGUIMIENTO = hoy; o.ACTUALIZADO = gesAhora_();
    gesEscribir_(sh, GES.H_ACC, c.fila, o);
    pHistorial_(pBC_(), cam.map(h => [new Date(), 'GES_ACCIONES', o.ID, h, c[h], o[h], 'Portal HyS']));
    // Hallazgo: se cierra cuando la acción queda eficaz; se reabre si vuelve a abrirse
    try { const hs = gesHal_(), hh = gesLeer_(hs, GES.H_HAL).find(h => h.ID === o.HALLAZGO);
      if (hh) { const nuevo = o.ESTADO === 'Eficaz' ? 'Cerrado' : hh.ESTADO === 'Cerrado' && GES.ABIERTOS.indexOf(o.ESTADO) >= 0 ? 'Confirmado' : hh.ESTADO;
        if (nuevo !== hh.ESTADO) { hh.ESTADO = nuevo; hh.ACTUALIZADO = gesAhora_(); gesEscribir_(hs, GES.H_HAL, hh.fila, hh); } } } catch (e) {}
    return { ok: true, cambios: cam.length, accion: o, antes: c };
  });
  if (r.ok && r.accion) { try { r.origen = gesDevolver_(r.accion, r.antes); } catch (e) { r.origen = 'No se pudo marcar en el plan de origen: ' + e.message; } delete r.antes; }
  return r;
}

// Al cerrar o reabrir en Gestión, se marca en el plan de origen (los informes siguen leyendo de ahí)
function gesDevolver_(a, antes) {
  if (a.ESTADO === antes.ESTADO || !a.CLAVE) return '';
  const p = a.CLAVE.split('|');
  if (p[0] === 'PLAN') {
    const est = a.ESTADO === 'Hecha' || a.ESTADO === 'Eficaz' ? 'Cumplida' : a.ESTADO === 'No se realiza' ? 'Descartada' : a.ESTADO === 'En curso' ? 'En curso' : '';
    if (!est) return '';
    const o = planFilas_().find(f => f.CODIGO_INFORME === p[1] && String(f.N_REC) === p[2]); if (!o) return 'No está en PLAN_ACCION.';
    if (est === 'Cumplida' && !(a.EVIDENCIA || o.EVIDENCIA)) return 'En PLAN_ACCION queda como estaba: «Cumplida» pide evidencia.';
    const sh = planHoja_(); sh.getRange(o.fila, 18, 1, 2).setValues([[est, a.EVIDENCIA || o.EVIDENCIA]]);
    if (est === 'Descartada' && a.MOTIVO) sh.getRange(o.fila, 20).setValue((o.OBSERVACIONES ? o.OBSERVACIONES + ' · ' : '') + a.MOTIVO);
    sh.getRange(o.fila, 21).setValue(gesHoy_());
    return 'PLAN_ACCION: ' + est;
  }
  if (p[0] === 'M8') {
    const est = a.ESTADO === 'Hecha' || a.ESTADO === 'Eficaz' ? 'Resuelto' : a.ESTADO === 'No se realiza' ? 'Descartado' : a.ESTADO === 'En curso' ? 'En curso' : '';
    if (!est) return '';
    const hh = SpreadsheetApp.openById(GES.M8_ID).getSheetByName('HALLAZGOS_PLAN'), ids = hh.getRange(2, 1, Math.max(hh.getLastRow() - 1, 1), 1).getValues().map(r => String(r[0]));
    const i = ids.indexOf(p[1]); if (i < 0) return 'No está en HALLAZGOS_PLAN.';
    hh.getRange(i + 2, 15).setValue(est); if (est === 'Resuelto' || est === 'Descartado') hh.getRange(i + 2, 17).setValue(new Date(gesHoy_() + 'T12:00:00'));
    return 'HALLAZGOS_PLAN: ' + est;
  }
  return '';
}

// ------------------------------------------------------------------ Paso de lo que existe y entrada de lo nuevo
function gesTraer_(x) {
  x = x || {};
  return conLock_(() => {
    gesSembrarAlcance_();
    const hoy = gesHoy_(), ahora = gesAhora_(), hs = gesHal_(), as = gesAcc_(), HL = gesLeer_(hs, GES.H_HAL), AL = gesLeer_(as, GES.H_ACC), ALC = gesLeer_(gesAlc_(), GES.H_ALC);
    const porClave = {}; AL.forEach(a => { if (a.CLAVE) porClave[a.CLAVE] = a; });
    const halClave = {}; HL.forEach(h => { if (h.CLAVE) halClave[h.CLAVE] = h; });
    const nh = gesSiguiente_(HL, 'HZ'), na = gesSiguiente_(AL, 'AC'); let ch = 0, ca = 0;
    gesEmpColumnas_(); const EMP = gesLeer_(gesEmp_(), GES.H_EMP);
    const nuevosH = [], nuevosA = [], cambios = [], res = { plan: 0, m8: 0, reglas: 0, sugeridos: 0, cerradas: 0, errores: [] };
    const alta = (src, k, migrado) => {   // src: {cod, modulo, sitio, desc, origen, ref, fuente, prioridad, accion, responsable, plazo, limite, estado, recurso, dir, elevada, resp, fresp, evid, hecha, motivo, alta, historial, directo}
      if (porClave[k] || halClave[k]) return false;
      const nivel = gesNivelDe_(ALC, src.cod, src.modulo), sugerido = !migrado && (src.entra ? (src.entra !== 'Directo' || nivel !== 'A') : (nivel !== 'A' && !src.directo));
      const gu = gesGU_(src.prioridad), idH = nh(++ch);
      nuevosH.push({ ID: idH, FECHA: src.alta || hoy, ESTABLECIMIENTO: src.cod, MODULO: src.modulo, SITIO: src.sitio || '', DESCRIPCION: src.desc, ORIGEN: src.origen, REFERENCIA_ORIGEN: src.ref || '',
        FUENTE: src.fuente || '', GRAVEDAD: gu[0], URGENCIA: gu[1], PRIORIDAD: src.prioridad || '', EVIDENCIA: '', ENTRADA: migrado ? 'Migrado' : sugerido ? 'Sugerido' : 'Directo',
        ESTADO: sugerido ? 'Sugerido' : src.estado === 'Eficaz' ? 'Cerrado' : 'Confirmado', MOTIVO: '', CLAVE: k, ACTUALIZADO: ahora });
      if (sugerido) { res.sugeridos++; return true; }
      const plazo = Number(src.plazo) || GES.PLAZO[src.prioridad] || 90, fa = src.alta || hoy;
      nuevosA.push({ ID: na(++ca), HALLAZGO: idH, ESTABLECIMIENTO: src.cod, MODULO: src.modulo, ACCION: src.accion || src.desc, SITIO: src.sitio || '', RESPONSABLE: src.responsable || '',
        PLAZO_DIAS: plazo, FECHA_ALTA: fa, FECHA_LIMITE: src.limite || gesSuma_(fa, plazo), REQUIERE_DIRECCION: src.dir || 'No', TIPO_RECURSO: src.recurso || '', COSTO_ESTIMADO: src.costo || '',
        ESTADO: src.estado || 'Propuesta', FECHA_ELEVADA: src.elevada || '', RESPUESTA_DIRECCION: src.resp || '', FECHA_RESPUESTA: src.fresp || '', AVANCE: src.avance || '', EVIDENCIA: src.evid || '',
        FECHA_HECHA: src.hecha || '', FECHA_VERIFICACION: '', MOTIVO: src.motivo || '', CLAVE: k, SEGUIMIENTO: hoy,
        HISTORIAL: (src.historial ? src.historial + '\n' : '') + ahora + ' · ' + (migrado ? 'Pasó al plan único desde ' : 'Entró desde ') + src.origen + (src.ref ? ' (' + src.ref + ')' : ''), ACTUALIZADO: ahora });
      const nA = nuevosA[nuevosA.length - 1], asig = gesAsignar_(nA, { DESCRIPCION: src.desc }, EMP); if (asig) nA.HISTORIAL += '\n' + ahora + ' · ' + asig;
      return true;
    };
    // Cierre en el origen → «Hecha» en Gestión (Belén verifica la eficacia)
    const cerrarSi = (k, motivo, noRealiza) => { const a = porClave[k]; if (!a || GES.ABIERTOS.indexOf(a.ESTADO) < 0) return;
      a.ESTADO = noRealiza ? 'No se realiza' : 'Hecha'; if (!noRealiza) a.FECHA_HECHA = a.FECHA_HECHA || hoy; else a.MOTIVO = a.MOTIVO || motivo;
      a.HISTORIAL = (a.HISTORIAL ? a.HISTORIAL + '\n' : '') + ahora + ' · ' + motivo; a.SEGUIMIENTO = hoy; a.ACTUALIZADO = ahora; cambios.push(a); res.cerradas++; };

    // 1) DIAGNÓSTICO › PLAN_ACCION (todo, también lo cerrado: es el historial)
    try {
      planFilas_().forEach(o => {
        const k = 'PLAN|' + o.CODIGO_INFORME + '|' + o.N_REC, id = String(o.ID_DIAG || '');
        const modulo = /^DA-/.test(id) ? GES.MODULOS[1] : /^DP-/.test(id) ? GES.MODULOS[2] : /^DC-/.test(id) ? GES.MODULOS[3] : GES.MODULOS[0];
        const aud = /^AUD-/.test(o.CODIGO_INFORME);
        if (porClave[k]) { if (o.ESTADO === 'Cumplida') cerrarSi(k, 'Cumplida en PLAN_ACCION'); else if (o.ESTADO === 'Descartada') cerrarSi(k, 'Descartada en PLAN_ACCION: ' + (o.OBSERVACIONES || 's/d'), true); return; }
        const est = o.ESTADO === 'Cumplida' ? 'Hecha' : o.ESTADO === 'Descartada' ? 'No se realiza' : o.ESTADO === 'En curso' ? 'En curso' : o.RESPONSABLE_DIRECCION ? 'Aprobada' : o.FECHA_ENVIO ? 'Elevada' : 'Propuesta';
        const pr = String(o.PRIORIDAD || ''), plazo = /^\d+/.test(o.PLAZO_TECNICO) ? parseInt(o.PLAZO_TECNICO, 10) : '';
        const hist = [o.FECHA_ENVIO ? o.FECHA_ENVIO + ' · Enviada a la Dirección con el informe ' + o.CODIGO_INFORME : '', o.FECHA_RESPUESTA ? o.FECHA_RESPUESTA + ' · Respuesta: ' + (o.RESPONSABLE_DIRECCION || 's/d') + (o.FECHA_PREVISTA ? ', fecha prevista ' + o.FECHA_PREVISTA : '') : '', o.OBSERVACIONES ? 'Observaciones: ' + o.OBSERVACIONES : ''].filter(String).join('\n');
        if (alta({ cod: limpio_(o.ESTABLECIMIENTO), modulo: modulo, sitio: o.LUGAR, desc: o.RECOMENDACION, accion: o.RECOMENDACION, origen: aud ? 'Auditoría' : 'Diagnóstico', ref: o.CODIGO_INFORME + ' · rec. ' + o.N_REC + (o.ITEM_ID ? ' · ' + o.ITEM_ID : ''),
          prioridad: GES.PRIORIDADES.indexOf(pr) >= 0 ? pr : '', plazo: plazo, limite: o.FECHA_PREVISTA || o.FECHA_LIMITE, estado: est, recurso: gesRecurso_(o.COSTO + ' ' + o.TIPO), costo: /s\/d/.test(o.COSTO) ? '' : o.COSTO,
          dir: 'Sí', elevada: o.FECHA_ENVIO, resp: o.RESPONSABLE_DIRECCION, fresp: o.FECHA_RESPUESTA, evid: o.EVIDENCIA, hecha: est === 'Hecha' ? (o.ACTUALIZADO || hoy) : '', motivo: est === 'No se realiza' ? o.OBSERVACIONES || 'Descartada en el plan de origen' : '',
          responsable: o.RESPONSABLE_DIRECCION || (/s\/d/.test(o.A_CARGO) ? '' : o.A_CARGO), alta: o.FECHA_ENVIO || o.ACTUALIZADO || hoy, historial: hist }, k, true)) res.plan++;
      });
    } catch (e) { res.errores.push('Plan de acción: ' + e.message); }

    // 2) M8 › HALLAZGOS_PLAN
    if (x.solo !== 'plan') try {
      const m8 = SpreadsheetApp.openById(GES.M8_ID), rv = m8.getSheetByName('RELEVAMIENTOS'), hh = m8.getSheetByName('HALLAZGOS_PLAN');
      const estDe = {}; if (rv && rv.getLastRow() > 1) rv.getRange(2, 1, rv.getLastRow() - 1, 5).getValues().forEach(r => { if (r[0]) estDe[r[0]] = limpio_(r[4]); });
      if (hh && hh.getLastRow() > 1) hh.getRange(2, 1, hh.getLastRow() - 1, 17).getValues().forEach(r => {
        if (!r[0]) return; const k = 'M8|' + r[0], st = String(r[14] || '');
        if (porClave[k]) { if (/resuelto|cerr|cumpl/i.test(st)) cerrarSi(k, st + ' en el plan de infraestructura'); else if (/descart/i.test(st)) cerrarSi(k, 'Descartado en el plan de infraestructura', true); return; }
        const est = /resuelto|cerr|cumpl/i.test(st) ? 'Hecha' : /descart/i.test(st) ? 'No se realiza' : /curso/i.test(st) ? 'En curso' : r[15] ? 'Aprobada' : 'Propuesta';
        const pr = /actuar/i.test(r[6]) ? 'Actuar ya' : /r[aá]pido/i.test(r[6]) ? 'Resolver rápido' : /planif/i.test(r[6]) ? 'Planificar' : /monit/i.test(r[6]) ? 'Monitorear' : '';
        if (alta({ cod: estDe[r[1]] || 's/d', modulo: GES.MODULOS[5], sitio: r[4], desc: (r[3] || r[2]) + (r[10] ? ': ' + r[10] : ''), accion: r[11] || 'A definir', origen: 'Relevamiento', ref: r[0] + ' · ' + r[1],
          prioridad: pr, plazo: r[7], limite: pFecha_(r[9]), estado: est, recurso: gesRecurso_(r[13]), responsable: r[12], resp: r[15], dir: r[15] ? 'Sí' : 'No', hecha: est === 'Hecha' ? pFecha_(r[16]) : '',
          motivo: est === 'No se realiza' ? 'Descartado en el plan de infraestructura' : '', alta: pFecha_(r[8]) || hoy }, k, true)) res.m8++;
      });
    } catch (e) { res.errores.push('Infraestructura (M8): ' + e.message); }

    // 3) Reglas automáticas (fase 3 · Reglas.gs › GES_REGLAS): agua NO APTA, plagas atrasadas, residuos, agua, incendio e infraestructura
    const cambiosH = [];
    if (x.solo !== 'plan') try {
      const RGL = gregLeer_(), RG = RGL.R, D = gregDetectar_(RG, !!x.fresco), vistos = {}, cuenta = {};
      D.errores.forEach(e => res.errores.push(e));
      // La última vuelta de una clave (si se cerró y volvió a aparecer, la clave sigue con #2, #3…)
      const accDe = {}; AL.forEach(a => { if (a.HALLAZGO) accDe[a.HALLAZGO] = a; });
      const ciclo = base => { let n = 1; while (halClave[base + '#' + (n + 1)] || porClave[base + '#' + (n + 1)]) n++; return { n: n, k: n === 1 ? base : base + '#' + n }; };
      D.det.forEach(d => {
        const r = RG[d.regla], cod = limpio_(d.cod), nivel = gesNivelDe_(ALC, cod, r.MODULO); if (nivel === 'Sin habilitar') return;
        cuenta[d.regla] = (cuenta[d.regla] || 0) + 1;
        const fuente = [r.FUENTE, d.fuente && String(r.FUENTE).indexOf(d.fuente) < 0 ? d.fuente : ''].filter(String).join('; ');
        const src = { cod: cod, modulo: r.MODULO, sitio: d.sitio || '', desc: d.desc, accion: d.accion || r.ACCION, origen: d.origen || 'Regla automática', ref: d.regla + (d.ref ? ' · ' + d.ref : ''),
          fuente: fuente, prioridad: r.PRIORIDAD, plazo: r.PLAZO_DIAS, limite: d.limite || '', dir: r.REQUIERE_DIRECCION || 'No', estado: d.estado || 'Propuesta', recurso: d.recurso || '', entra: r.ENTRA };
        const c = ciclo(d.clave), h = halClave[c.k], a = porClave[c.k] || (h ? accDe[h.ID] : null); vistos[c.k] = true;
        if (!h && !a) { if (alta(src, d.clave, false)) res.reglas++; return; }
        if (a && !a.CLAVE && h) { a.CLAVE = h.CLAVE; porClave[h.CLAVE] = a; cambios.push(a); }   // acción confirmada desde la bandeja antes de la 14.64: queda enlazada
        if (h && h.ESTADO === 'Descartado') return;   // Belén lo descartó: no vuelve a entrar
        if (h && h.ESTADO === 'Confirmado' && !a) return;   // confirmado sin acción todavía
        const abierta = a && (GES.ABIERTOS.indexOf(a.ESTADO) >= 0 || a.ESTADO === 'Pendiente de recursos');
        if ((h && h.ESTADO === 'Sugerido') || abierta) {   // sigue: se actualiza lo que cambió
          if (h && h.DESCRIPCION !== d.desc) { h.DESCRIPCION = d.desc; h.ACTUALIZADO = ahora; cambiosH.push(h);
            if (abierta) { a.HISTORIAL = (a.HISTORIAL ? a.HISTORIAL + '\n' : '') + ahora + ' · Actualizado por la regla ' + d.regla + ': ' + d.desc; a.SEGUIMIENTO = hoy; a.ACTUALIZADO = ahora; cambios.push(a); } }
          return;
        }
        if (a && a.ESTADO === 'Hecha') {   // marcada hecha pero el módulo sigue mostrando el problema: a la semana vuelve como «No eficaz»
          if (a.FECHA_HECHA && gesSuma_(a.FECHA_HECHA, 7) < hoy) { a.ESTADO = 'No eficaz'; a.HISTORIAL = (a.HISTORIAL ? a.HISTORIAL + '\n' : '') + ahora + ' · No eficaz: el módulo sigue mostrando el problema (' + d.regla + ')'; a.SEGUIMIENTO = hoy; a.ACTUALIZADO = ahora; cambios.push(a); }
          return;
        }
        if (a && a.ESTADO === 'No se realiza') return;
        const k2 = d.clave + '#' + (c.n + 1); vistos[k2] = true;   // se había cerrado (eficaz o resuelto): entra uno nuevo
        if (alta(src, k2, false)) res.reglas++;
      });
      // Lo que ya no aparece en su módulo se resolvió allá: la acción pasa a «Hecha» y el sugerido sin confirmar se cierra
      Object.keys(D.ok).forEach(id => { const pre = gregPrefijos_(id), es = k => pre.some(p => String(k).indexOf(p) === 0);
        AL.forEach(a => { if (a.CLAVE && es(a.CLAVE) && !vistos[a.CLAVE]) cerrarSi(a.CLAVE, 'Ya no aparece en el módulo de origen (regla ' + id + ')'); });
        HL.forEach(h => { if (h.CLAVE && es(h.CLAVE) && !vistos[h.CLAVE] && h.ESTADO === 'Sugerido') { h.ESTADO = 'Cerrado'; h.MOTIVO = 'Se resolvió en el módulo antes de confirmarlo'; h.ACTUALIZADO = ahora; cambiosH.push(h); } });
      });
      gregAnotar_(RGL.lista, cuenta, D.ok);
    } catch (e) { res.errores.push('Reglas: ' + e.message); }

    gesAgregar_(hs, GES.H_HAL, nuevosH); gesAgregar_(as, GES.H_ACC, nuevosA);
    const una = L => L.filter((o, i) => L.findIndex(z => z.fila === o.fila) === i);
    una(cambios).forEach(a => gesEscribir_(as, GES.H_ACC, a.fila, a)); una(cambiosH).forEach(h => gesEscribir_(hs, GES.H_HAL, h.fila, h));
    res.hallazgos = nuevosH.length; res.acciones = nuevosA.length;
    return Object.assign({ ok: true }, res);
  });
}

// ------------------------------------------------------------------ Elevar a la Dirección (14.63)
// Marca las acciones elegidas como «Elevada» con la fecha, las enlaza con su plan de origen (fecha de envío y plazos)
// y arma el correo para copiar. El sistema no lo envía.
function gesElevar_(x) {
  const f = String(x.fecha || '').slice(0, 10); if (!/^\d{4}-\d{2}-\d{2}$/.test(f)) return { ok: false, mensaje: 'Indicá la fecha de elevación.' };
  const ids = (x.ids || []).map(String); if (!ids.length) return { ok: false, mensaje: 'Elegí al menos una acción.' };
  const r = conLock_(() => {
    const sh = gesAcc_(), L = gesLeer_(sh, GES.H_ACC), H = {}, ahora = gesAhora_(); gesLeer_(gesHal_(), GES.H_HAL).forEach(h => H[h.ID] = h);
    const sel = L.filter(a => ids.indexOf(a.ID) >= 0); if (!sel.length) return { ok: false, mensaje: 'No encuentro las acciones. Actualizá la pantalla.' };
    const cods = Array.from(new Set(sel.map(a => a.ESTABLECIMIENTO))); if (cods.length > 1) return { ok: false, mensaje: 'Elevá de a un establecimiento por vez.' };
    const plan = {}; try { planFilas_().forEach(o => plan[o.CODIGO_INFORME + '|' + o.N_REC] = o); } catch (e) {}
    const psh = Object.keys(plan).length ? planHoja_() : null, hist = [];
    sel.forEach(a => {
      const antes = a.ESTADO; a.REQUIERE_DIRECCION = 'Sí'; a.FECHA_ELEVADA = f; if (GES.ABIERTOS.indexOf(a.ESTADO) >= 0 && a.ESTADO !== 'En curso') a.ESTADO = 'Elevada';
      a.HISTORIAL = (a.HISTORIAL ? a.HISTORIAL + '\n' : '') + ahora + ' · Elevada a la Dirección el ' + f.split('-').reverse().join('/') + (antes !== a.ESTADO ? ' (' + antes + ' → ' + a.ESTADO + ')' : '');
      a.SEGUIMIENTO = gesHoy_(); a.ACTUALIZADO = ahora; gesEscribir_(sh, GES.H_ACC, a.fila, a);
      hist.push([new Date(), 'GES_ACCIONES', a.ID, 'FECHA_ELEVADA', '', f, 'Portal HyS · elevar']);
      const p = String(a.CLAVE).split('|');
      if (p[0] === 'PLAN' && plan[p[1] + '|' + p[2]] && psh) { const o = plan[p[1] + '|' + p[2]], d = /^\d+/.test(o.PLAZO_TECNICO) ? parseInt(o.PLAZO_TECNICO, 10) : Number(a.PLAZO_DIAS) || 0;
        if (!o.FECHA_ENVIO) psh.getRange(o.fila, 13, 1, 2).setValues([[f, d ? planSuma_(f, d) : '']]); }
    });
    if (hist.length) pHistorial_(pBC_(), hist);
    return { ok: true, sel: sel, H: H, cod: cods[0] };
  });
  if (!r.ok) return r;
  // Correo para copiar
  const nom = ((pEstablecimientos_().filas.find(e => limpio_(e.v[0]) === r.cod) || {}).v || [])[1] || r.cod;
  const orden = { 'Actuar ya': 0, 'Resolver rápido': 1, 'Planificar': 2, 'Monitorear': 3 };
  const pos = a => { const p = (r.H[a.HALLAZGO] || {}).PRIORIDAD; return p in orden ? orden[p] : 9; }, L = r.sel.slice().sort((a, b) => pos(a) - pos(b));
  const lin = L.map((a, i) => { const h = r.H[a.HALLAZGO] || {};
    return (i + 1) + '. ' + a.ACCION + (a.SITIO ? ' (' + a.SITIO + ')' : '') + '\n   Motivo: ' + (h.DESCRIPCION || 's/d') + (h.FUENTE ? ' — ' + h.FUENTE : '') +
      '\n   Prioridad: ' + (h.PRIORIDAD || 's/d') + ' · plazo técnico: ' + (a.PLAZO_DIAS || 's/d') + ' días · recurso: ' + (a.TIPO_RECURSO || 's/d') + (a.COSTO_ESTIMADO ? ' (costo estimado: ' + a.COSTO_ESTIMADO + ')' : ''); }).join('\n\n');
  const correo = { asunto: 'Higiene y Seguridad Laboral · acciones que requieren intervención de la Dirección · ' + nom,
    cuerpo: 'Dirección del ' + nom + ':\n\nSe elevan las siguientes acciones de mejora surgidas del seguimiento de Higiene y Seguridad Laboral, que requieren una decisión o recursos de la Dirección. Para cada una se indica el motivo, su fundamento normativo y el plazo técnico sugerido (Ley 19.587; Dto. 351/79; Res. SRT 905/15).\n\n' + lin +
      '\n\nSe solicita indicar, para cada acción, si se aprueba, el responsable de su ejecución y la fecha prevista. Las que no puedan realizarse por falta de recursos quedarán registradas como riesgo informado.\n\nQuedo a disposición por cualquier consulta o requerimiento.\n\nBelén Pellegrini\nLic. en Higiene, Seguridad y Medio Ambiente del Trabajo\nServicio de Higiene y Seguridad Laboral' };
  return { ok: true, elevadas: r.sel.length, correo: correo };
}

// ------------------------------------------------------------------ Entrada del portal
function gesPortal_(accion, x) {
  switch (accion) {
    case 'p_ges_datos': return gesDatos_();
    case 'p_ges_alcance': return gesAlcance_();
    case 'p_ges_alcance_guardar': return gesAlcanceGuardar_(x);
    case 'p_ges_hallazgo': return gesHallazgoGuardar_(x);
    case 'p_ges_bandeja': return gesBandeja_(x);
    case 'p_ges_accion': return gesAccionGuardar_(x);
    case 'p_ges_traer': return gesTraer_(x);
    case 'p_ges_elevar': return gesElevar_(x);
    case 'p_ges_reglas': return gregDatos_();
    case 'p_ges_regla': return gregGuardar_(x);
  }
  return { ok: false, mensaje: 'Acción de Gestión desconocida: ' + accion };
}

// Pruebas desde el editor
function probarGestion() { Logger.log(JSON.stringify(gesTraer_({}))); const d = gesDatos_(); Logger.log('Hallazgos: ' + d.hallazgos.length + ' · acciones: ' + d.acciones.length); }
