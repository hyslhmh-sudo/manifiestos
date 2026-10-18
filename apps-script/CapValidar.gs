/**
 * SISTEMA HyS · 9 · CAPACITACIONES › PARA VALIDAR (14.67 · 14/10/2026 · desde 14.72 sobre el libro único)
 * Pedido de Belén: validar desde el portal lo que carga la secretaría. Desde el 15/10/2026 (14.72) lee y escribe el libro único
 * «CAPACITACIONES · Sistema HyS» (CG.LIBRO, CapGestion.gs); la base vieja (BASE_PERSONAS_CAPACITACIONES_2026) queda como archivo.
 *   · Altas nuevas: personas con REVISAR = Sí. Se corrigen los datos y «Validar»: REVISAR pasa a No y sus avisos quedan resueltos.
 *   · Cambios propuestos (hoja CAMBIOS_PROPUESTOS, ESTADO Pendiente; los carga la secretaría desde Mi establecimiento):
 *     «Aprobar» escribe el valor en PERSONAS; «Rechazar» pide el motivo.
 *   · Otros avisos pendientes (hoja _AVISOS, ESTADO Pendiente): «Revisado» los pasa a Resuelto.
 *   · Cambios directos de la secretaría (15/10/2026): lo que Melani cambia sin pasar por aprobación (correo y teléfono, contactos
 *     de jefaturas, listas de mails) queda en _HISTORIAL; acá se ven los no revisados desde el 15/10/2026 y se marcan «Revisado»
 *     o se deshacen (vuelve el valor anterior). Columna REVISADO_HYS de _HISTORIAL (la agrega el sistema).
 *   · Todo se puede hacer de a varios: p_cv_lote valida altas (con correcciones en la misma tabla), aprueba o rechaza propuestas,
 *     marca avisos y cambios como revisados o deshace cambios, en una sola vez.
 * Cada cambio en PERSONAS queda en _HISTORIAL (QUIEN «HyS (portal)»). No envía correos.
 * Entrada: Portal.gs › acciones p_cv_… (clave de Higiene y Seguridad). Respaldo sin portal: las mismas hojas, a mano.
 */
const CV = {
  EDITABLES: ['APELLIDOS', 'NOMBRES', 'FUNCION', 'PROFESION', 'SERVICIO', 'INSTITUCION', 'ESTABLECIMIENTO', 'VINCULO', 'EMPRESA', 'CORREO', 'TELEFONO', 'PUBLICO'],
  QUIEN: 'HyS (portal)'
};
const cvTxt_ = v => v instanceof Date ? Utilities.formatDate(v, TZ, 'dd/MM/yyyy HH:mm') : String(v == null ? '' : v).trim();
const cvDni_ = v => String(v == null ? '' : v).replace(/\D/g, '').replace(/^0+/, '');
let CV_LOCK_ = false;   // 15/10/2026: el lote valida muchas cosas dentro de un mismo bloqueo
function cvLock_(fn) { if (CV_LOCK_) return fn(); return conLock_(() => { CV_LOCK_ = true; try { return fn(); } finally { CV_LOCK_ = false; } }); }
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
  const cambios = cvCambios_(); cambios.forEach(c => { if (c.hoja === 'PERSONAS') { const p = porDni[cvDni_(c.id)]; c.persona = p ? cvTxt_(p.o.APELLIDOS) + ', ' + cvTxt_(p.o.NOMBRES) : c.id; } else c.persona = c.id; });
  return { ok: true, altas: altas, propuestas: propuestas, avisos: avisos.filter(v => !enAlta[v.dni]), cambios: cambios, listas: L, libro: cgLibro_().getUrl() };
}

// Cambios directos de la secretaría (no pasan por aprobación): _HISTORIAL sin REVISADO_HYS, desde el cambio de sistema
const CV_DESDE = new Date(2026, 9, 15);
const cvEsSecretaria_ = q => !!q && !/^(hys|registro|migraci|inscrip|secretar[ií]a \(aprobado|sistema|agenda|validaci)/i.test(q) && q !== CG.QUIEN;
function cvHistHoja_() {
  const sh = cgLibro_().getSheetByName('_HISTORIAL'); if (!sh) return null;
  const H = sh.getRange(5, 1, 1, sh.getLastColumn()).getValues()[0].map(h => String(h).trim());
  if (H.indexOf('REVISADO_HYS') < 0) { sh.getRange(5, H.length + 1).setValue('REVISADO_HYS'); }
  return cgHoja_('_HISTORIAL');
}
function cvCambios_() {
  const T = cvHistHoja_(); if (!T) return [];
  return T.filas.filter(x => { const f = cgFecha_(x.o.FECHA); return f && f >= CV_DESDE && cvEsSecretaria_(cvTxt_(x.o.QUIEN)) && !cvTxt_(x.o.REVISADO_HYS) && /^(PERSONAS|JEFATURAS)$/i.test(cvTxt_(x.o.HOJA)) && cvTxt_(x.o.CAMPO) !== 'ALTA'; })
    .map(x => ({ fila: x.fila, fecha: x.o.FECHA instanceof Date ? Utilities.formatDate(x.o.FECHA, TZ, 'dd/MM/yyyy HH:mm') : cvTxt_(x.o.FECHA), quien: cvTxt_(x.o.QUIEN), hoja: cvTxt_(x.o.HOJA), id: cvTxt_(x.o.ID),
      campo: cvTxt_(x.o.CAMPO), antes: cvTxt_(x.o.ANTES), despues: cvTxt_(x.o.DESPUES), motivo: cvTxt_(x.o.MOTIVO) })).reverse();
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
  return cvLock_(() => {
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
  return cvLock_(() => {
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
  return cvLock_(() => { const filas = (x.filas || []).map(Number).filter(Boolean); if (!filas.length) return { ok: false, mensaje: 'No hay avisos elegidos.' };
    return { ok: true, n: cvResolverAvisos_(cgHoja_('_AVISOS'), '', filas, new Date()) }; });
}
// Cuántos hay para validar (para el aviso del tablero)
function cvCuenta_() {
  const d = cvDatos_(), ult = [];
  d.altas.forEach(a => ult.push({ tipo: 'Alta nueva', t: a.APELLIDOS + ', ' + a.NOMBRES, s: [a.FUNCION, a.INSTITUCION || a.ESTABLECIMIENTO].filter(v => v && v !== 's/d').join(' · '), f: a.ORIGEN_DE_DATOS }));
  d.propuestas.forEach(p => ult.push({ tipo: 'Cambio propuesto', t: p.persona, s: p.campo + ': ' + (p.actual || 'vacío') + ' → ' + p.propuesto, f: p.fecha }));
  d.cambios.forEach(c => ult.push({ tipo: 'Cambio directo', t: c.persona, s: c.campo + ': ' + (c.antes || 'vacío') + ' → ' + c.despues, f: c.fecha + (c.quien ? ' · ' + c.quien : '') }));
  return { ok: true, altas: d.altas.length, propuestas: d.propuestas.length, avisos: d.avisos.length, cambios: d.cambios.length, ultimos: ult.slice(0, 8) };
}
// Cambios directos: marcar revisados o deshacer (vuelve el valor anterior si nadie lo cambió después)
function cvCambiosResolver_(filas, deshacer) {
  return cvLock_(() => {
    const T = cvHistHoja_(); if (!T) return { ok: false, mensaje: 'No está la hoja _HISTORIAL.' };
    const ahora = new Date(), marca = (fila, txt) => cgSet_(T, fila, 'REVISADO_HYS', txt + ' · ' + Utilities.formatDate(ahora, TZ, 'dd/MM/yyyy HH:mm'));
    let n = 0; const avisos = [], hist = [];
    (filas || []).map(Number).filter(Boolean).forEach(fila => {
      const h = T.filas.find(z => z.fila === fila); if (!h || cvTxt_(h.o.REVISADO_HYS)) return;
      if (!deshacer) { marca(fila, 'Revisado'); n++; return; }
      const hoja = cvTxt_(h.o.HOJA), campo = cvTxt_(h.o.CAMPO), antes = cvTxt_(h.o.ANTES), despues = cvTxt_(h.o.DESPUES), id = cvTxt_(h.o.ID);
      const D = cgHoja_(hoja), r = hoja === 'PERSONAS' ? D.filas.find(z => cvDni_(z.o.DNI) === cvDni_(id)) : D.filas.find(z => cgNorm_(z.o.JEFATURA) === cgNorm_(id));
      if (!r || D.H.indexOf(campo) < 0) { avisos.push(id + ' · ' + campo + ': no lo encontré'); return; }
      if (cvTxt_(r.o[campo]) !== despues) { avisos.push(id + ' · ' + campo + ': ya cambió después («' + cvTxt_(r.o[campo]) + '»), no lo toqué'); return; }
      cgSet_(D, r.fila, campo, antes || 's/d');
      hist.push({ FECHA: ahora, QUIEN: CV.QUIEN, HOJA: hoja, ID: id, CAMPO: campo, ANTES: despues, DESPUES: antes || 's/d', MOTIVO: 'HyS deshizo un cambio de ' + cvTxt_(h.o.QUIEN), REVISADO_HYS: 'HyS' });
      marca(fila, 'Deshecho'); n++;
    });
    cgHistorial_(hist);
    return { ok: true, n: n, avisos: avisos };
  });
}
// Varios a la vez (15/10/2026): un solo pedido con todo lo elegido en la pantalla
function cvLote_(x) {
  return cvLock_(() => {
    const res = { ok: true, altas: 0, aprobadas: 0, rechazadas: 0, avisos: 0, revisados: 0, deshechos: 0, errores: [] };
    (x.altas || []).forEach(a => { try { const r = cvAlta_(a); if (r.ok) res.altas++; else res.errores.push('Alta ' + a.dni + ': ' + r.mensaje); } catch (e) { res.errores.push('Alta ' + a.dni + ': ' + e.message); } });
    (x.propuestas || []).forEach(p => { try { const r = cvPropuesta_(p); if (r.ok) res[p.decision === 'rechazar' ? 'rechazadas' : 'aprobadas']++; else res.errores.push('Propuesta ' + p.id + ': ' + r.mensaje); } catch (e) { res.errores.push('Propuesta ' + p.id + ': ' + e.message); } });
    if ((x.avisos || []).length) { const r = cvAvisos_({ filas: x.avisos }); res.avisos = r.n || 0; }
    if ((x.revisados || []).length) { const r = cvCambiosResolver_(x.revisados, false); res.revisados = r.n || 0; }
    if ((x.deshacer || []).length) { const r = cvCambiosResolver_(x.deshacer, true); res.deshechos = r.n || 0; (r.avisos || []).forEach(a => res.errores.push(a)); }
    return res;
  });
}

// ------------------------------------------------------------------ Vista comparativa (18/10/2026, pedido de Belén)
// Una fila por persona con todo lo que tiene pendiente (alta, cambios propuestos, cambios directos, avisos):
//   · Antes: el valor anterior del cambio, o lo que dice la base de trabajadores (o el libro, si no está en la base).
//   · Después: lo que quedó en el libro (con lo propuesto encima). Se corrige en la misma tabla.
// Se eligen de a varios y se resuelven juntos: «Aceptar» (guarda lo que se ve y cierra todo lo pendiente de esa persona),
// «Requiere revisión» (queda en la lista con una marca y una nota, hoja _REVISION_HYS) o «Volver a lo anterior» (cambios directos).
const CV_CAMPOS = ['ESTABLECIMIENTO', 'SERVICIO', 'FUNCION', 'PROFESION', 'VINCULO', 'EMPRESA', 'INSTITUCION', 'PUBLICO', 'CORREO', 'TELEFONO'];
function cvRevHoja_() {
  const lb = cgLibro_(); let sh = lb.getSheetByName('_REVISION_HYS');
  if (!sh) {
    sh = lb.insertSheet('_REVISION_HYS');
    sh.getRange(1, 1).setValue('Para validar · lo que HyS marcó «Requiere revisión». Lo escribe el portal. ESTADO «Resuelto» o fila borrada: deja de tener la marca.');
    sh.getRange(5, 1, 1, 5).setValues([['CLAVE', 'ESTADO', 'NOTA', 'FECHA', 'QUIEN']]).setFontWeight('bold');
  }
  return cgHoja_('_REVISION_HYS');
}
// Base de trabajadores (hoja TODOS, columnas TRAB_COLS de Bases.gs), leída una sola vez para todos los DNI pedidos
function cvBaseMapa_(dnis) {
  const m = {}, quiero = {}; dnis.forEach(d => { if (d) quiero[d] = 1; }); if (!Object.keys(quiero).length) return m;
  try {
    const T = pBT_().getSheetByName('TODOS'), n = T.getLastRow() - 5; if (n < 1) return m;
    const ix = k => TRAB_COLS.indexOf(k);
    T.getRange(6, 1, n, TRAB_COLS.length).getValues().forEach(r => { const d = cvDni_(r[ix('DNI')]); if (!quiero[d]) return; const g = k => cvTxt_(r[ix(k)]);
      m[d] = { ESTABLECIMIENTO: g('ESTABLECIMIENTO'), SERVICIO: g('SERVICIO'), FUNCION: g('FUNCION'), PROFESION: g('FUNCION_DETALLE'), VINCULO: g('VINCULO'), EMPRESA: g('EMPRESA'), CORREO: g('EMAIL'), TELEFONO: g('TELEFONO') }; });
  } catch (e) { /* sin base: se compara con el libro */ }
  return m;
}
function cvComparar_() {
  const d = cvDatos_(), rev = {};
  cvRevHoja_().filas.forEach(x => { if (/^requiere/i.test(cvTxt_(x.o.ESTADO))) rev[cvTxt_(x.o.CLAVE)] = { nota: cvTxt_(x.o.NOTA), fecha: cvTxt_(x.o.FECHA), quien: cvTxt_(x.o.QUIEN) }; });
  const P = cgHoja_('PERSONAS'), porDni = {}; P.filas.forEach(x => { porDni[cvDni_(x.o.DNI)] = x; });
  const G = {}, orden = [];
  const grupo = (k, dni, nombre) => { if (!G[k]) { G[k] = { clave: k, dni: dni, persona: nombre, items: [], antes: {}, fuente: {}, propuesto: {} }; orden.push(k); } return G[k]; };
  const item = (g, o) => { o.revision = rev[o.clave] || null; g.items.push(o); };
  d.altas.forEach(a => { const g = grupo(a.DNI, a.DNI, a.APELLIDOS + ', ' + a.NOMBRES); item(g, { tipo: 'Alta nueva', clave: 'AL:' + a.DNI, detalle: a.ORIGEN_DE_DATOS });
    (a.avisos || []).forEach(v => item(g, { tipo: v.tipo, clave: 'AV:' + v.fila, detalle: v.detalle, fecha: v.fecha })); });
  d.propuestas.forEach(p => { const g = grupo(p.dni, p.dni, p.persona);
    item(g, { tipo: 'Cambio propuesto', clave: 'PR:' + p.id, campo: p.campo, detalle: p.campo + ': ' + (p.actual || 'vacío') + ' → ' + p.propuesto + (p.motivo ? ' · ' + p.motivo : ''), fecha: p.fecha, quien: p.quien });
    if (!(p.campo in g.antes)) { g.antes[p.campo] = p.actual; g.fuente[p.campo] = 'valor anterior'; } g.propuesto[p.campo] = p.propuesto; });
  d.cambios.slice().reverse().forEach(c => { const per = c.hoja === 'PERSONAS', k = per ? cvDni_(c.id) : 'J:' + c.id, g = grupo(k, per ? cvDni_(c.id) : '', c.persona); if (!per) g.jefatura = true;
    item(g, { tipo: 'Cambio directo', clave: 'CA:' + c.fila, campo: c.campo, detalle: c.campo + ': ' + (c.antes || 'vacío') + ' → ' + (c.despues || 'vacío'), fecha: c.fecha, quien: c.quien, antes: c.antes, despues: c.despues });
    if (!(c.campo in g.antes)) { g.antes[c.campo] = c.antes; g.fuente[c.campo] = 'valor anterior'; } });
  d.avisos.forEach(v => { const g = grupo(v.dni || 'A:' + v.fila, v.dni, v.persona); item(g, { tipo: v.tipo, clave: 'AV:' + v.fila, detalle: v.detalle, fecha: v.fecha }); });
  const base = cvBaseMapa_(orden.map(k => G[k].dni));
  const grupos = orden.map(k => { const g = G[k], p = g.dni && porDni[g.dni], b = g.dni && base[g.dni];
    g.enLibro = !!p; g.enBase = !!b; g.despues = {};
    CV_CAMPOS.forEach(f => { const lib = p ? cvTxt_(p.o[f]) : '';
      g.despues[f] = f in g.propuesto ? g.propuesto[f] : lib;
      if (!(f in g.antes)) { if (b && f in b) { g.antes[f] = b[f]; g.fuente[f] = 'base de trabajadores'; } else { g.antes[f] = lib; g.fuente[f] = 'libro'; } } });
    if (p) g.persona = cvTxt_(p.o.APELLIDOS) + ', ' + cvTxt_(p.o.NOMBRES);
    g.revision = g.items.filter(i => i.revision).map(i => i.revision)[0] || null;
    delete g.propuesto; return g; });
  grupos.sort((a, b) => (!!a.revision - !!b.revision) || String(a.persona).localeCompare(String(b.persona)));
  return { ok: true, grupos: grupos, campos: CV_CAMPOS, listas: d.listas, libro: d.libro,
    cuenta: { personas: grupos.length, items: grupos.reduce((s, g) => s + g.items.length, 0), revision: grupos.filter(g => g.revision).length } };
}
// Guarda en PERSONAS lo que se corrigió en la tabla (solo lo que cambió; cada campo queda en _HISTORIAL)
function cvEditar_(dni, datos, motivo) {
  const P = cgHoja_('PERSONAS'), p = P.filas.find(z => cvDni_(z.o.DNI) === dni); if (!p || !datos) return 0;
  const ahora = new Date(), hist = [];
  CV.EDITABLES.forEach(k => { if (datos[k] == null || P.H.indexOf(k) < 0) return; let nuevo = String(datos[k]).trim(); if (!nuevo && k !== 'EMPRESA') nuevo = 's/d'; const antes = cvTxt_(p.o[k]);
    if (nuevo !== antes) { cgSet_(P, p.fila, k, nuevo); hist.push({ FECHA: ahora, QUIEN: CV.QUIEN, HOJA: 'PERSONAS', ID: dni, CAMPO: k, ANTES: antes, DESPUES: nuevo, MOTIVO: motivo }); } });
  if (hist.length) { cgSet_(P, p.fila, 'ULTIMA_ACTUALIZACION', Utilities.formatDate(ahora, TZ, 'dd/MM/yyyy')); cgHistorial_(hist); }
  return hist.length;
}
function cvMarcarRev_(claves, estado, nota) {
  const R = cvRevHoja_(), ahora = new Date(), nuevas = [];
  claves.forEach(k => { const f = R.filas.find(z => cvTxt_(z.o.CLAVE) === k);
    if (f) { cgSet_(R, f.fila, 'ESTADO', estado); if (nota != null) cgSet_(R, f.fila, 'NOTA', nota); cgSet_(R, f.fila, 'FECHA', ahora); cgSet_(R, f.fila, 'QUIEN', CV.QUIEN); }
    else if (estado !== 'Resuelto') nuevas.push([k, estado, nota || '', ahora, CV.QUIEN]); });
  if (nuevas.length) R.sh.getRange(Math.max(R.sh.getLastRow(), 5) + 1, 1, nuevas.length, 5).setValues(nuevas);
}
// x.grupos: [{ dni, claves: ['AL:…','PR:…','CA:…','AV:…'], datos?, decision: 'aceptar' | 'revisar' | 'deshacer', nota? }]
function cvDecidir_(x) {
  return cvLock_(() => {
    const res = { ok: true, aceptadas: 0, revision: 0, deshechos: 0, correcciones: 0, errores: [] };
    (x.grupos || []).forEach(g => { try {
      const cl = g.claves || [], de = p => cl.filter(k => k.indexOf(p) === 0).map(k => k.slice(3)), dni = cvDni_(g.dni), datos = g.datos || null;
      if (g.decision === 'revisar') { cvMarcarRev_(cl, 'Requiere revisión', String(g.nota || '').trim()); res.revision++; return; }
      if (g.decision === 'deshacer') { const r = cvCambiosResolver_(de('CA:'), true); res.deshechos += r.n || 0; (r.avisos || []).forEach(a => res.errores.push(a)); cvMarcarRev_(cl.filter(k => /^CA:/.test(k)), 'Resuelto'); return; }
      // aceptar: primero los cambios propuestos (con el valor que se ve), después el resto de las correcciones
      de('PR:').forEach(id => { const PR = cvPropHoja_(), q = PR.filas.find(z => cvTxt_(z.o.ID) === id), campo = q ? cvTxt_(q.o.CAMPO) : '';
        const r = cvPropuesta_({ id: id, decision: 'aprobar', valor: datos && campo && datos[campo] != null ? datos[campo] : null }); if (!r.ok) res.errores.push('Propuesta ' + id + ': ' + r.mensaje); });
      if (de('AL:').length) { const r = cvAlta_({ dni: dni, datos: datos || {} }); if (!r.ok) res.errores.push('Alta ' + dni + ': ' + r.mensaje); else res.correcciones += r.cambios || 0; }
      else if (dni && datos) res.correcciones += cvEditar_(dni, datos, 'Corrección de HyS al validar');
      if (de('CA:').length) cvCambiosResolver_(de('CA:'), false);
      if (de('AV:').length) cvResolverAvisos_(cgHoja_('_AVISOS'), '', de('AV:').map(Number), new Date());
      cvMarcarRev_(cl, 'Resuelto'); res.aceptadas++;
    } catch (e) { res.errores.push((g.dni || 'fila') + ': ' + e.message); } });
    return res;
  });
}

function cvPortal_(accion, x) {
  switch (accion) {
    case 'p_cv_comparar': return cvComparar_();
    case 'p_cv_decidir': return cvDecidir_(x);
    case 'p_cv_datos': return cvDatos_();
    case 'p_cv_cuenta': return cvCuenta_();
    case 'p_cv_alta': return cvAlta_(x);
    case 'p_cv_propuesta': return cvPropuesta_(x);
    case 'p_cv_avisos': return cvAvisos_(x);
    case 'p_cv_lote': return cvLote_(x);
    case 'p_cv_cambios': return cvCambiosResolver_(x.filas, !!x.deshacer);
  }
  return { ok: false, mensaje: 'Acción desconocida: ' + accion };
}
// Prueba desde el editor (solo lee)
function probarParaValidar() { const d = cvDatos_(); Logger.log('Altas: ' + d.altas.length + ' · propuestas: ' + d.propuestas.length + ' · otros avisos: ' + d.avisos.length); }
