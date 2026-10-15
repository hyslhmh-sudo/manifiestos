/**
 * SISTEMA HyS · 9 · CAPACITACIONES › PARA VALIDAR (14.67 · 14/10/2026)
 * Pedido de Belén: validar desde el portal (no desde el panel viejo) lo que carga la secretaría en la base de capacitaciones
 * (BASE_PERSONAS_CAPACITACIONES_2026, BASES.CAPACITACIONES):
 *   · Altas nuevas: personas con REVISAR = Sí. Se pueden corregir los datos y «Validar»: REVISAR pasa a No y sus avisos quedan resueltos.
 *   · Cambios propuestos (hoja PROPUESTAS, ESTADO Pendiente): «Aprobar» escribe el valor en PERSONAS; «Rechazar» pide el motivo.
 *   · Otros avisos sin resolver (hoja AVISOS): «Marcar revisado» pone la fecha en RESUELTO.
 * Cada cambio en PERSONAS queda en HISTORIAL_CAMBIOS de la base de capacitaciones (ORIGEN «HyS (portal)»). No envía correos.
 * Entrada: Portal.gs › acciones p_cv_… (clave de Higiene y Seguridad). Respaldo sin portal: las mismas hojas, a mano.
 */
const CV = {
  EDITABLES: ['APELLIDOS', 'NOMBRES', 'FUNCION', 'FUNCION_DETALLE', 'SERVICIO', 'ESTABLECIMIENTO', 'VINCULO', 'EMPRESA', 'EMAIL', 'TELEFONO'],
  QUIEN: 'HyS (portal)'
};
let CV_SS_ = null;
const cvLibro_ = () => CV_SS_ || (CV_SS_ = SpreadsheetApp.openById(BASES.CAPACITACIONES));
const cvTxt_ = v => v instanceof Date ? Utilities.formatDate(v, TZ, 'dd/MM/yyyy HH:mm') : String(v == null ? '' : v).trim();
const cvDni_ = v => String(v == null ? '' : v).replace(/\D/g, '').replace(/^0+/, '');
// Hoja con encabezado en la fila 1: { sh, H, filas: [{ fila, o }] }
function cvHoja_(nombre) {
  const sh = cvLibro_().getSheetByName(nombre); if (!sh) throw new Error('No encuentro la hoja ' + nombre + ' en la base de capacitaciones.');
  const v = sh.getDataRange().getValues(), H = v[0].map(h => String(h).trim());
  return { sh: sh, H: H, filas: v.slice(1).map((r, i) => { const o = {}; H.forEach((h, j) => { if (h) o[h] = r[j]; }); return { fila: i + 2, o: o }; }).filter(x => H.some(h => h && String(x.o[h]).trim() !== '')) };
}
const cvCol_ = (lst, k) => lst.filter(String).filter((x, i, a) => a.indexOf(x) === i).sort((a, b) => a.localeCompare(b));
function cvListas_() {
  const lee = (n, col) => { try { return cvHoja_(n).filas.map(x => cvTxt_(x.o[col])); } catch (e) { return []; } };
  return { funciones: cvCol_(lee('CATALOGO_FUNCIONES', 'FUNCION')), servicios: cvCol_(lee('CATALOGO_SERVICIOS', 'SERVICIO_NORMALIZADO')),
    establecimientos: cvCol_(lee('ESTABLECIMIENTOS', 'ESTABLECIMIENTO')), empresas: cvCol_(lee('EMPRESAS_TERCERIZADAS', 'EMPRESA')), vinculos: ['Planta', 'Contrato', 'Tercerizado/a', 'Cooperativa', 'Residente', 'Estudiante'] };
}

// ------------------------------------------------------------------ Lectura
function cvDatos_() {
  const P = cvHoja_('PERSONAS'), A = cvHoja_('AVISOS'), PR = cvHoja_('PROPUESTAS'), porDni = {};
  P.filas.forEach(x => { porDni[cvDni_(x.o.DNI)] = x; });
  const avisos = A.filas.filter(x => !cvTxt_(x.o.RESUELTO)).map(x => ({ fila: x.fila, fecha: cvTxt_(x.o.FECHA_HORA), tipo: cvTxt_(x.o.TIPO), dni: cvDni_(x.o.DNI), persona: cvTxt_(x.o.PERSONA), detalle: cvTxt_(x.o.DETALLE) }));
  const pers = x => { const o = { fila: x.fila }; ['DNI', 'APELLIDOS', 'NOMBRES', 'FUNCION', 'FUNCION_DETALLE', 'SERVICIO', 'ESTABLECIMIENTO', 'VINCULO', 'EMPRESA', 'EMAIL', 'TELEFONO', 'REVISAR', 'MOTIVO_REVISION', 'FUENTES', 'EN_NTEAR'].forEach(k => o[k] = cvTxt_(x.o[k])); o.DNI = cvDni_(o.DNI); return o; };
  const altas = P.filas.filter(x => /^s[ií]$/i.test(cvTxt_(x.o.REVISAR))).map(pers);
  const enAlta = {}; altas.forEach(a => enAlta[a.DNI] = 1);
  altas.forEach(a => a.avisos = avisos.filter(v => v.dni === a.DNI));
  const propuestas = PR.filas.filter(x => /^pendiente/i.test(cvTxt_(x.o.ESTADO))).map(x => ({ fila: x.fila, id: cvTxt_(x.o.ID), fecha: cvTxt_(x.o.FECHA), dni: cvDni_(x.o.DNI), persona: cvTxt_(x.o.PERSONA),
    campo: cvTxt_(x.o.CAMPO), actual: cvTxt_(x.o.VALOR_ACTUAL), propuesto: cvTxt_(x.o.VALOR_PROPUESTO), motivo: cvTxt_(x.o.MOTIVO), enBase: !!porDni[cvDni_(x.o.DNI)] }));
  return { ok: true, altas: altas, propuestas: propuestas, avisos: avisos.filter(v => !enAlta[v.dni]), listas: cvListas_(), libro: cvLibro_().getUrl() };
}

// ------------------------------------------------------------------ Escritura
function cvHistorial_(filas) {
  if (!filas.length) return; const sh = cvLibro_().getSheetByName('HISTORIAL_CAMBIOS'); if (!sh) return;
  const H = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
  sh.getRange(sh.getLastRow() + 1, 1, filas.length, H.length).setValues(filas.map(f => H.map(h => f[h] == null ? '' : f[h])));
}
function cvResolverAvisos_(A, dni, filas, ahora) {
  const jR = A.H.indexOf('RESUELTO'); if (jR < 0) return 0; let n = 0;
  A.filas.forEach(x => { if (cvTxt_(x.o.RESUELTO)) return; if ((dni && cvDni_(x.o.DNI) === dni) || (filas && filas.indexOf(x.fila) >= 0)) { A.sh.getRange(x.fila, jR + 1).setValue(ahora); n++; } });
  return n;
}
// Validar un alta (con correcciones opcionales)
function cvAlta_(x) {
  return conLock_(() => {
    const P = cvHoja_('PERSONAS'), dni = cvDni_(x.dni), p = P.filas.find(z => cvDni_(z.o.DNI) === dni);
    if (!p) return { ok: false, mensaje: 'No encuentro a la persona con DNI ' + dni + '. Actualizá la pantalla.' };
    const d = x.datos || {}, ahora = new Date(), hist = [], fila = P.H.map(h => p.o[h]);
    CV.EDITABLES.forEach(k => { const j = P.H.indexOf(k); if (j < 0 || d[k] == null) return; const nuevo = String(d[k]).trim(), antes = cvTxt_(p.o[k]);
      if (nuevo !== antes) { fila[j] = nuevo; hist.push({ FECHA_HORA: ahora, DNI: dni, CAMPO: k, VALOR_ANTERIOR: antes, VALOR_NUEVO: nuevo, ORIGEN: CV.QUIEN, EN_NTEAR: cvTxt_(p.o.EN_NTEAR) }); } });
    const jR = P.H.indexOf('REVISAR'), jM = P.H.indexOf('MOTIVO_REVISION');
    if (jR >= 0) fila[jR] = 'No';
    if (jM >= 0) fila[jM] = (cvTxt_(p.o.MOTIVO_REVISION) ? cvTxt_(p.o.MOTIVO_REVISION) + ' · ' : '') + 'Validada por HyS ' + Utilities.formatDate(ahora, TZ, 'dd/MM/yyyy');
    hist.push({ FECHA_HORA: ahora, DNI: dni, CAMPO: 'REVISAR', VALOR_ANTERIOR: 'Sí', VALOR_NUEVO: 'No (validada)', ORIGEN: CV.QUIEN, EN_NTEAR: cvTxt_(p.o.EN_NTEAR) });
    P.sh.getRange(p.fila, 1, 1, fila.length).setValues([fila]);
    cvHistorial_(hist);
    const n = cvResolverAvisos_(cvHoja_('AVISOS'), dni, null, ahora);
    return { ok: true, cambios: hist.length - 1, avisos: n };
  });
}
// Aprobar o rechazar un cambio propuesto
function cvPropuesta_(x) {
  return conLock_(() => {
    const PR = cvHoja_('PROPUESTAS'), q = PR.filas.find(z => cvTxt_(z.o.ID) === String(x.id));
    if (!q) return { ok: false, mensaje: 'No encuentro la propuesta. Actualizá la pantalla.' };
    if (!/^pendiente/i.test(cvTxt_(q.o.ESTADO))) return { ok: false, mensaje: 'Esta propuesta ya está ' + cvTxt_(q.o.ESTADO).toLowerCase() + '.' };
    const ahora = new Date(), set = (k, v) => { const j = PR.H.indexOf(k); if (j >= 0) PR.sh.getRange(q.fila, j + 1).setValue(v); };
    if (x.decision === 'rechazar') {
      if (!String(x.motivo || '').trim()) return { ok: false, mensaje: 'Escribí el motivo del rechazo.' };
      set('ESTADO', 'Rechazada'); set('MOTIVO', String(x.motivo).trim()); set('RESUELTO', ahora); set('RESUELTO_POR', CV.QUIEN);
      return { ok: true };
    }
    const P = cvHoja_('PERSONAS'), dni = cvDni_(q.o.DNI), p = P.filas.find(z => cvDni_(z.o.DNI) === dni), campo = cvTxt_(q.o.CAMPO), j = P.H.indexOf(campo);
    if (!p) return { ok: false, mensaje: 'La persona (DNI ' + dni + ') no está en PERSONAS.' };
    if (j < 0) return { ok: false, mensaje: 'La columna ' + campo + ' no existe en PERSONAS.' };
    const valor = x.valor != null && String(x.valor).trim() ? String(x.valor).trim() : cvTxt_(q.o.VALOR_PROPUESTO), antes = cvTxt_(p.o[campo]);
    P.sh.getRange(p.fila, j + 1).setValue(valor);
    cvHistorial_([{ FECHA_HORA: ahora, DNI: dni, CAMPO: campo, VALOR_ANTERIOR: antes, VALOR_NUEVO: valor, ORIGEN: 'Secretaría (aprobado por HyS)', EN_NTEAR: cvTxt_(p.o.EN_NTEAR) }]);
    set('ESTADO', 'Aprobada'); set('RESUELTO', ahora); set('RESUELTO_POR', CV.QUIEN);
    if (valor !== cvTxt_(q.o.VALOR_PROPUESTO)) set('MOTIVO', 'Aprobada con corrección: ' + valor);
    return { ok: true };
  });
}
// Marcar avisos como revisados (filas de la hoja AVISOS)
function cvAvisos_(x) {
  return conLock_(() => { const filas = (x.filas || []).map(Number).filter(Boolean); if (!filas.length) return { ok: false, mensaje: 'No hay avisos elegidos.' };
    return { ok: true, n: cvResolverAvisos_(cvHoja_('AVISOS'), '', filas, new Date()) }; });
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
