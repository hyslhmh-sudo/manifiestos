/**
 * SISTEMA HyS · 9 · CAPACITACIONES › PARA VALIDAR (14.67 · 14/10/2026 · desde 14.72 sobre el libro único)
 * Pedido de Belén: validar desde el portal lo que carga la secretaría. Desde el 15/10/2026 (14.72) lee y escribe el libro único
 * «CAPACITACIONES · Sistema HyS» (CG.LIBRO, CapGestion.gs); la base vieja (BASE_PERSONAS_CAPACITACIONES_2026) queda como archivo.
 *   · Altas nuevas: personas con REVISAR = Sí. Se corrigen los datos y «Validar»: REVISAR pasa a No y sus avisos quedan resueltos.
 *   · Cambios propuestos (hoja CAMBIOS_PROPUESTOS, ESTADO Pendiente; los carga la secretaría desde Mi establecimiento):
 *     «Aprobar» escribe el valor en PERSONAS; «Rechazar» pide el motivo.
 *   · Otros avisos pendientes (hoja _AVISOS, ESTADO Pendiente): «Revisado» los pasa a Resuelto.
 * Cada cambio en PERSONAS queda en _HISTORIAL (QUIEN «HyS (portal)»). No envía correos.
 * Entrada: Portal.gs › acciones p_cv_… (clave de Higiene y Seguridad). Respaldo sin portal: las mismas hojas, a mano.
 */
const CV = {
  EDITABLES: ['APELLIDOS', 'NOMBRES', 'FUNCION', 'PROFESION', 'SERVICIO', 'INSTITUCION', 'ESTABLECIMIENTO', 'VINCULO', 'EMPRESA', 'CORREO', 'TELEFONO', 'PUBLICO'],
  QUIEN: 'HyS (portal)'
};
const cvTxt_ = v => v instanceof Date ? Utilities.formatDate(v, TZ, 'dd/MM/yyyy HH:mm') : String(v == null ? '' : v).trim();
const cvDni_ = v => String(v == null ? '' : v).replace(/\D/g, '').replace(/^0+/, '');
function cvPropHoja_() { if (typeof qProp_ === 'function') qProp_(); return cgHoja_(QC.PROPUESTAS); }

// ------------------------------------------------------------------ Lectura
function cvDatos_() {
  const P = cgHoja_('PERSONAS'), A = cgHoja_('_AVISOS'), PR = cvPropHoja_(), porDni = {};
  P.filas.forEach(x => { porDni[cvDni_(x.o.DNI)] = x; });
  const avisos = A.filas.filter(x => /^pendiente/i.test(cvTxt_(x.o.ESTADO))).map(x => { const det = cvTxt_(x.o.DETALLE), dni = cvDni_(x.o.REFERENCIA), p = porDni[dni];
    return { fila: x.fila, id: cvTxt_(x.o.ID_AVISO), fecha: cvTxt_(x.o.FECHA), tipo: cvTxt_(x.o.TIPO), dni: dni, persona: p ? cvTxt_(p.o.APELLIDOS) + ', ' + cvTxt_(p.o.NOMBRES) : det.split(' · ')[0], detalle: det }; });
  const pers = x => { const o = { fila: x.fila }; ['DNI', 'APELLIDOS', 'NOMBRES', 'FUNCION', 'PROFESION', 'SERVICIO', 'INSTITUCION', 'ESTABLECIMIENTO', 'VINCULO', 'EMPRESA', 'CORREO', 'TELEFONO', 'PUBLICO', 'REVISAR', 'ORIGEN_DE_DATOS'].forEach(k => o[k] = cvTxt_(x.o[k])); o.DNI = cvDni_(o.DNI); return o; };
  const altas = P.filas.filter(x => /^s[ií]$/i.test(cvTxt_(x.o.REVISAR))).map(pers);
  const enAlta = {}; altas.forEach(a => enAlta[a.DNI] = 1);
  altas.forEach(a => a.avisos = avisos.filter(v => v.dni === a.DNI));
  const propuestas = PR.filas.filter(x => /^pendiente/i.test(cvTxt_(x.o.ESTADO))).map(x => ({ fila: x.fila, id: cvTxt_(x.o.ID), fecha: cvTxt_(x.o.FECHA), dni: cvDni_(x.o.DNI), persona: cvTxt_(x.o.PERSONA),
    campo: cvTxt_(x.o.CAMPO), actual: cvTxt_(x.o.VALOR_ACTUAL), propuesto: cvTxt_(x.o.VALOR_PROPUESTO), motivo: cvTxt_(x.o.MOTIVO), quien: cvTxt_(x.o.CARGADO_POR), enBase: !!porDni[cvDni_(x.o.DNI)] }));
  const L = cgListas_(P);
  return { ok: true, altas: altas, propuestas: propuestas, avisos: avisos.filter(v => !enAlta[v.dni]), listas: L, libro: cgLibro_().getUrl() };
}

// ------------------------------------------------------------------ Escritura
function cvResolverAvisos_(A, dni, filas, ahora) {
  let n = 0;
  A.filas.forEach(x => { if (!/^pendiente/i.test(cvTxt_(x.o.ESTADO))) return;
    if ((dni && cvDni_(x.o.REFERENCIA) === dni) || (filas && filas.indexOf(x.fila) >= 0)) { cgSet_(A, x.fila, 'ESTADO', 'Resuelto'); cgSet_(A, x.fila, 'RESUELTO_POR', CV.QUIEN); cgSet_(A, x.fila, 'FECHA_RESOLUCION', ahora); n++; } });
  return n;
}
// Validar un alta (con correcciones opcionales)
function cvAlta_(x) {
  return conLock_(() => {
    const P = cgHoja_('PERSONAS'), dni = cvDni_(x.dni), p = P.filas.find(z => cvDni_(z.o.DNI) === dni);
    if (!p) return { ok: false, mensaje: 'No encuentro a la persona con DNI ' + dni + '. Actualizá la pantalla.' };
    const d = x.datos || {}, ahora = new Date(), hist = [], H = P.H, fila = H.map(h => p.o[h]);
    CV.EDITABLES.forEach(k => { const j = H.indexOf(k); if (j < 0 || d[k] == null) return; let nuevo = String(d[k]).trim(); if (!nuevo && k !== 'EMPRESA') nuevo = 's/d'; const antes = cvTxt_(p.o[k]);
      if (nuevo !== antes) { fila[j] = nuevo; hist.push({ FECHA: ahora, QUIEN: CV.QUIEN, HOJA: 'PERSONAS', ID: dni, CAMPO: k, ANTES: antes, DESPUES: nuevo, MOTIVO: 'Corrección al validar el alta' }); } });
    const jR = H.indexOf('REVISAR'), jO = H.indexOf('ORIGEN_DE_DATOS'), jU = H.indexOf('ULTIMA_ACTUALIZACION'), hoy = Utilities.formatDate(ahora, TZ, 'dd/MM/yyyy');
    if (jR >= 0) fila[jR] = 'No';
    if (jO >= 0 && !/validada por HyS/i.test(cvTxt_(p.o.ORIGEN_DE_DATOS))) fila[jO] = (cvTxt_(p.o.ORIGEN_DE_DATOS) ? cvTxt_(p.o.ORIGEN_DE_DATOS) + ' · ' : '') + 'validada por HyS ' + hoy;
    if (jU >= 0) fila[jU] = hoy;
    hist.push({ FECHA: ahora, QUIEN: CV.QUIEN, HOJA: 'PERSONAS', ID: dni, CAMPO: 'REVISAR', ANTES: 'Sí', DESPUES: 'No (validada)', MOTIVO: 'Alta validada' });
    P.sh.getRange(p.fila, 1, 1, fila.length).setValues([fila]);
    cgHistorial_(hist);
    const n = cvResolverAvisos_(cgHoja_('_AVISOS'), dni, null, ahora);
    return { ok: true, cambios: hist.length - 1, avisos: n };
  });
}
// Aprobar o rechazar un cambio propuesto
function cvPropuesta_(x) {
  return conLock_(() => {
    const PR = cvPropHoja_(), q = PR.filas.find(z => cvTxt_(z.o.ID) === String(x.id));
    if (!q) return { ok: false, mensaje: 'No encuentro la propuesta. Actualizá la pantalla.' };
    if (!/^pendiente/i.test(cvTxt_(q.o.ESTADO))) return { ok: false, mensaje: 'Esta propuesta ya está ' + cvTxt_(q.o.ESTADO).toLowerCase() + '.' };
    const ahora = new Date(), set = (k, v) => cgSet_(PR, q.fila, k, v);
    if (x.decision === 'rechazar') {
      if (!String(x.motivo || '').trim()) return { ok: false, mensaje: 'Escribí el motivo del rechazo.' };
      set('ESTADO', 'Rechazada'); set('MOTIVO', (cvTxt_(q.o.MOTIVO) ? cvTxt_(q.o.MOTIVO) + ' · ' : '') + 'Rechazo: ' + String(x.motivo).trim()); set('RESUELTO', ahora); set('RESUELTO_POR', CV.QUIEN);
      return { ok: true };
    }
    const P = cgHoja_('PERSONAS'), dni = cvDni_(q.o.DNI), p = P.filas.find(z => cvDni_(z.o.DNI) === dni), campo = cvTxt_(q.o.CAMPO);
    if (!p) return { ok: false, mensaje: 'La persona (DNI ' + dni + ') no está en PERSONAS.' };
    if (P.H.indexOf(campo) < 0) return { ok: false, mensaje: 'La columna ' + campo + ' no existe en PERSONAS.' };
    const valor = x.valor != null && String(x.valor).trim() ? String(x.valor).trim() : cvTxt_(q.o.VALOR_PROPUESTO), antes = cvTxt_(p.o[campo]);
    cgSet_(P, p.fila, campo, valor); cgSet_(P, p.fila, 'ULTIMA_ACTUALIZACION', Utilities.formatDate(ahora, TZ, 'dd/MM/yyyy'));
    cgHistorial_([{ FECHA: ahora, QUIEN: 'Secretaría (aprobado por HyS)', HOJA: 'PERSONAS', ID: dni, CAMPO: campo, ANTES: antes, DESPUES: valor, MOTIVO: cvTxt_(q.o.MOTIVO) || 'Cambio propuesto por la secretaría' }]);
    set('ESTADO', 'Aprobada'); set('RESUELTO', ahora); set('RESUELTO_POR', CV.QUIEN);
    if (valor !== cvTxt_(q.o.VALOR_PROPUESTO)) set('MOTIVO', (cvTxt_(q.o.MOTIVO) ? cvTxt_(q.o.MOTIVO) + ' · ' : '') + 'Aprobada con corrección: ' + valor);
    return { ok: true };
  });
}
// Marcar avisos como revisados (filas de la hoja _AVISOS)
function cvAvisos_(x) {
  return conLock_(() => { const filas = (x.filas || []).map(Number).filter(Boolean); if (!filas.length) return { ok: false, mensaje: 'No hay avisos elegidos.' };
    return { ok: true, n: cvResolverAvisos_(cgHoja_('_AVISOS'), '', filas, new Date()) }; });
}
// Cuántos hay para validar (para el aviso del tablero)
function cvCuenta_() { const d = cvDatos_(); return { ok: true, altas: d.altas.length, propuestas: d.propuestas.length, avisos: d.avisos.length }; }

function cvPortal_(accion, x) {
  switch (accion) {
    case 'p_cv_datos': return cvDatos_();
    case 'p_cv_cuenta': return cvCuenta_();
    case 'p_cv_alta': return cvAlta_(x);
    case 'p_cv_propuesta': return cvPropuesta_(x);
    case 'p_cv_avisos': return cvAvisos_(x);
  }
  return { ok: false, mensaje: 'Acción desconocida: ' + accion };
}
// Prueba desde el editor (solo lee)
function probarParaValidar() { const d = cvDatos_(); Logger.log('Altas: ' + d.altas.length + ' · propuestas: ' + d.propuestas.length + ' · otros avisos: ' + d.avisos.length); }
