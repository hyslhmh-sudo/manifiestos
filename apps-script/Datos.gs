/**
 * SISTEMA HyS · DATOS (editor general del portal) · versión 14.53 (14/10/2026)
 * Regla: Higiene y Seguridad puede agregar, cambiar y eliminar CUALQUIER dato de CUALQUIER libro del sistema desde el portal.
 * Las pantallas de cada módulo siguen siendo la forma cómoda de cargar; esta pantalla es la llave general para todo lo demás.
 * - Libros: los del sistema (libro general, BASE COMÚN, BASE DE TRABAJADORES, claves), los de cada establecimiento (hoja LIBROS)
 *   y los de cada módulo (propiedades del script con ID de planilla), más los de DAT.EXTRA. Cualquier otra planilla, por enlace.
 * - Cada cambio queda en BASE COMÚN › HISTORIAL (antes y después). Cada fila eliminada queda en BASE COMÚN › PAPELERA y se puede restaurar.
 * - Las celdas con fórmula no se pisan. Si alguien cambió la fila mientras se editaba, avisa y no guarda.
 * Entra por Portal.gs › portalAccion_ (acciones p_dat_…), solo con la clave MAESTRA.
 * Respaldo sin GitHub: es parte del portal de respaldo (?p=portal) y todo se puede seguir haciendo en las planillas.
 */
const DAT = {
  VERSION: '14.53',
  POR_PAGINA: 100,
  // Planillas de otros proyectos del sistema (mismo dueño). Se pueden sumar más con la propiedad del script DATOS_LIBROS_EXTRA («ID|Nombre» separados por coma).
  EXTRA: [
    ['1YgClAXgqLHvSRzFLV9AdX5UnGvtdINX__y0QGM7DTPc', 'M8 · Catálogo y relevamiento (módulo 8)', 'Módulos'],
    ['1Cg8884XTihxQYRc7CE1JPqngTquMpNr5uqQPot4uhGI', 'CAPACITACIONES · Sistema HyS (módulo 7)', 'Módulos'],
    ['1OZmvW2-FypFH78tUMrxT_xSGGBtpCckGPAw8MkHyRuw', 'Notas · antecedentes (módulo 2)', 'Módulos']
  ],
  // Cachés que se borran después de cada cambio (las demás se renuevan solas o de madrugada)
  CACHES: ['libros', 'accesos', 'acc_est', 'acc_hab', 'inc_tablero', 'rad_tablero', 'coc_tablero', 'diag_tablero', 'caps_dnis', 'caps_res', 'inv_listas', 'claves', 'cfg_inf', 'p_resumen', 'p_resumen_trab', 'rem_red', 'res_tablero', 'res_tablero2']
};

function datTxt_(v) {
  if (v instanceof Date) return isNaN(v) ? '' : Utilities.formatDate(v, TZ, v.getHours() || v.getMinutes() ? 'dd/MM/yyyy HH:mm' : 'dd/MM/yyyy');
  return v == null ? '' : String(v);
}
function datH_(v) { const s = String(v == null ? '' : v); return /^0\d+$/.test(s) ? "'" + s : s; }   // historial: conserva ceros a la izquierda
function datNorm_(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
function datIdDe_(t) { const m = String(t || '').match(/[-\w]{25,}/); return m ? m[0] : ''; }
function datAbrir_(id) { if (!id) throw new Error('Falta el libro.'); return SpreadsheetApp.openById(id); }

// ------------------------------------------------------------------ Lista de libros (6 h en caché; «Actualizar» la rehace)
function datLibros_(fresco) {
  const c = CacheService.getScriptCache();
  if (!fresco) { const v = c.get('dat_libros'); if (v) return JSON.parse(v); }
  const cand = [], visto = {}, add = (id, nombre, grupo) => { id = datIdDe_(id); if (id && !visto[id]) { visto[id] = 1; cand.push({ id: id, nombre: nombre || '', grupo: grupo }); } };
  const P = PropertiesService.getScriptProperties();
  add(CFG.GENERAL, 'Libro general de residuos', 'Bases del sistema');
  add(P.getProperty('BASE_COMUN_ID'), 'BASE COMÚN', 'Bases del sistema');
  add(P.getProperty('BASE_TRABAJADORES_ID'), 'BASE DE TRABAJADORES', 'Bases del sistema');
  add(CFG.CLAVES, 'Claves de establecimientos', 'Bases del sistema');
  try { const m = librosMapa_(); Object.keys(m).forEach(k => { if (m[k] && m[k].libro) add(m[k].libro, k + ' · ' + (m[k].nombre || ''), 'Libros de los establecimientos'); }); } catch (e) {}
  const props = P.getProperties();
  Object.keys(props).sort().forEach(k => { if (/^[-\w]{25,60}$/.test(String(props[k]).trim())) add(props[k], '', 'Módulos'); });
  DAT.EXTRA.forEach(x => add(x[0], x[1], x[2]));
  String(props.DATOS_LIBROS_EXTRA || '').split(',').forEach(x => { const p = x.split('|'); add(p[0], (p[1] || '').trim(), 'Otros'); });
  const out = [];
  cand.forEach(x => { try { const f = DriveApp.getFileById(x.id); if (f.getMimeType() !== MimeType.GOOGLE_SHEETS || f.isTrashed()) return; x.nombre = x.nombre && x.grupo !== 'Módulos' ? x.nombre : f.getName(); x.url = f.getUrl(); out.push(x); } catch (e) {} });
  const r = { ok: true, libros: out, hecho: new Date().toISOString() };
  try { c.put('dat_libros', JSON.stringify(r), 21600); } catch (e) {}
  return r;
}

function datHojas_(x) {
  const ss = datAbrir_(datIdDe_(x.id));
  return { ok: true, id: ss.getId(), nombre: ss.getName(), url: ss.getUrl(), hojas: ss.getSheets().map(s => ({ nombre: s.getName(), filas: s.getLastRow(), cols: s.getLastColumn(), oculta: s.isSheetHidden() })) };
}

// Fila de encabezados: la primera de las 12 primeras con más celdas de texto (en el sistema suele ser la 5; en otras planillas, la 1)
function datEncabezado_(v) {
  let mejor = 1, max = 0;
  for (let i = 0; i < Math.min(12, v.length); i++) {
    const n = v[i].filter(c => String(c).trim() && isNaN(Number(c))).length;
    if (n > max + 1 || (n > max && max < 2)) { max = n; mejor = i + 1; }
  }
  return mejor;
}

function datHoja_(x) {
  const ss = datAbrir_(datIdDe_(x.id)), sh = ss.getSheetByName(x.hoja); if (!sh) return { ok: false, mensaje: 'No está la hoja «' + x.hoja + '».' };
  const nf = sh.getLastRow(), nc = Math.max(sh.getLastColumn(), 1);
  if (nf < 1) return { ok: true, libro: ss.getName(), url: ss.getUrl() + '#gid=' + sh.getSheetId(), enc: 1, cab: [], filas: [], total: 0, desde: 0, cols: nc, listas: {} };
  const v = sh.getRange(1, 1, nf, nc).getDisplayValues();
  const enc = Math.min(Math.max(1, Number(x.enc) || datEncabezado_(v)), nf);
  const letra = i => { let s = '', n = i + 1; while (n) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; };
  const cab = v[enc - 1].map((h, i) => String(h).trim() || 'Columna ' + letra(i));
  const q = datNorm_(x.q).trim(), partes = q ? q.split(/\s+/) : [];
  let filas = [];
  for (let i = enc; i < nf; i++) {
    const r = v[i]; if (!r.some(c => String(c).trim())) continue;
    if (partes.length) { const t = datNorm_(r.join(' ')); if (!partes.every(p => t.indexOf(p) >= 0)) continue; }
    filas.push({ fila: i + 1, v: r });
  }
  const total = filas.length, desde = Math.max(0, Math.min(Number(x.desde) || 0, Math.max(0, total - 1)));
  filas = (x.orden === 'nuevas' ? filas.slice().reverse() : filas).slice(desde, desde + DAT.POR_PAGINA);
  // Fórmulas (no se pisan) y listas desplegables, solo de las filas que se muestran
  if (filas.length) {
    const f0 = Math.min.apply(null, filas.map(f => f.fila)), f1 = Math.max.apply(null, filas.map(f => f.fila));
    const fo = sh.getRange(f0, 1, f1 - f0 + 1, nc).getFormulas();
    filas.forEach(f => { const r = fo[f.fila - f0]; const cf = []; r.forEach((c, j) => { if (c) cf.push(j); }); if (cf.length) f.f = cf; });
  }
  const listas = {};
  try {
    const dv = sh.getRange(Math.min(enc + 1, sh.getMaxRows()), 1, 1, nc).getDataValidations()[0];
    dv.forEach((d, j) => { if (!d) return; const t = d.getCriteriaType(), a = d.getCriteriaValues();
      if (t === SpreadsheetApp.DataValidationCriteria.VALUE_IN_LIST) listas[j] = a[0].map(String);
      else if (t === SpreadsheetApp.DataValidationCriteria.VALUE_IN_RANGE) listas[j] = a[0].getDisplayValues().map(r => r[0]).filter(String).slice(0, 300); });
  } catch (e) {}
  return { ok: true, libro: ss.getName(), url: ss.getUrl() + '#gid=' + sh.getSheetId(), enc: enc, cab: cab, filas: filas, total: total, desde: desde, cols: nc, listas: listas, porPagina: DAT.POR_PAGINA };
}

// Escribe un valor respetando ceros a la izquierda (DNI, códigos) y sin pisar fórmulas
function datPoner_(rg, valor) {
  const s = String(valor == null ? '' : valor);
  if (/^0\d+$/.test(s) || /^\+?\d{12,}$/.test(s)) rg.setNumberFormat('@');
  rg.setValue(s.trim() === '' ? '' : s);
}
function datLimpiarCaches_() {
  try { const c = CacheService.getScriptCache(), k = DAT.CACHES.slice(); try { Object.keys(librosMapa_()).forEach(cod => k.push('p_ficha_' + cod, 'caps_' + cod)); } catch (e) {} c.removeAll(k); } catch (e) {}
}

function datGuardar_(x) {
  const ss = datAbrir_(datIdDe_(x.id)), sh = ss.getSheetByName(x.hoja); if (!sh) return { ok: false, mensaje: 'No está la hoja.' };
  const fila = Number(x.fila), nc = sh.getLastColumn(); if (!(fila > Number(x.enc || 0))) return { ok: false, mensaje: 'Fila no válida.' };
  const rg = sh.getRange(fila, 1, 1, nc), ahora = rg.getDisplayValues()[0], fo = rg.getFormulas()[0], cab = sh.getRange(Number(x.enc) || 1, 1, 1, nc).getDisplayValues()[0];
  const antes = x.antes || {}, cambios = x.cambios || {};
  const choque = Object.keys(antes).filter(j => String(ahora[j] == null ? '' : ahora[j]) !== String(antes[j]));
  if (choque.length) return { ok: false, choque: true, mensaje: 'Esta fila cambió en la planilla mientras la editabas (' + choque.map(j => cab[j] || ('columna ' + (Number(j) + 1))).join(', ') + '). Volvé a abrirla para ver lo último.' };
  const log = [];
  Object.keys(cambios).forEach(j => { const c = Number(j); if (c >= nc || fo[c]) return; if (String(ahora[c]) === String(cambios[j])) return;
    datPoner_(sh.getRange(fila, c + 1), cambios[j]); log.push([new Date(), ss.getName() + ' › ' + sh.getName(), 'fila ' + fila + (ahora[0] ? ' · ' + String(ahora[0]).slice(0, 40) : ''), cab[c] || ('columna ' + (c + 1)), datH_(ahora[c]), datH_(cambios[j]), 'Portal · Datos']); });
  if (log.length) { pHistorial_(pBC_(), log); datLimpiarCaches_(); }
  return { ok: true, cambios: log.length };
}

function datAgregar_(x) {
  const ss = datAbrir_(datIdDe_(x.id)), sh = ss.getSheetByName(x.hoja); if (!sh) return { ok: false, mensaje: 'No está la hoja.' };
  const enc = Number(x.enc) || 1, nc = Math.max(sh.getLastColumn(), 1), ult = Math.max(sh.getLastRow(), enc), nueva = ult + 1, val = x.valores || {};
  if (!Object.keys(val).some(j => String(val[j]).trim())) return { ok: false, mensaje: 'La fila está vacía.' };
  if (nueva > sh.getMaxRows()) sh.insertRowsAfter(sh.getMaxRows(), 1);
  let fo = [];
  if (ult > enc) { const prev = sh.getRange(ult, 1, 1, nc); fo = prev.getFormulas()[0]; prev.copyTo(sh.getRange(nueva, 1, 1, nc), SpreadsheetApp.CopyPasteType.PASTE_FORMAT, false); prev.copyTo(sh.getRange(nueva, 1, 1, nc), SpreadsheetApp.CopyPasteType.PASTE_DATA_VALIDATION, false);
    fo.forEach((f, j) => { if (f) sh.getRange(ult, j + 1).copyTo(sh.getRange(nueva, j + 1)); }); }
  const cab = sh.getRange(enc, 1, 1, nc).getDisplayValues()[0], log = [];
  for (let j = 0; j < nc; j++) { if (fo[j]) continue; const v = val[j] == null ? '' : val[j]; if (String(v).trim()) { datPoner_(sh.getRange(nueva, j + 1), v); log.push([new Date(), ss.getName() + ' › ' + sh.getName(), 'fila ' + nueva + ' (nueva)', cab[j] || ('columna ' + (j + 1)), '', datH_(v), 'Portal · Datos']); } }
  pHistorial_(pBC_(), log); datLimpiarCaches_();
  return { ok: true, fila: nueva };
}

function datPapeleraHoja_() {
  const bc = pBC_(); let sh = bc.getSheetByName('PAPELERA');
  if (!sh) { sh = bc.insertSheet('PAPELERA'); encabezar_(sh, 'Papelera', 'Filas eliminadas desde el portal (Datos). Se pueden restaurar desde el portal o copiándolas a mano.', ['FECHA', 'LIBRO_ID', 'LIBRO', 'HOJA', 'FILA', 'ENCABEZADOS', 'VALORES', 'ESTADO']); }
  return sh;
}
function datEliminar_(x) {
  const ss = datAbrir_(datIdDe_(x.id)), sh = ss.getSheetByName(x.hoja); if (!sh) return { ok: false, mensaje: 'No está la hoja.' };
  const fila = Number(x.fila), enc = Number(x.enc) || 1, nc = sh.getLastColumn(); if (!(fila > enc) || fila > sh.getLastRow()) return { ok: false, mensaje: 'Fila no válida.' };
  const rg = sh.getRange(fila, 1, 1, nc), disp = rg.getDisplayValues()[0];
  if (x.antes && JSON.stringify(disp.map(String)) !== JSON.stringify((x.antes || []).map(String).slice(0, nc).concat(Array(Math.max(0, nc - (x.antes || []).length)).fill('')).slice(0, nc)))
    return { ok: false, choque: true, mensaje: 'La fila cambió en la planilla (o se movió). Volvé a abrir la hoja y probá de nuevo.' };
  const crudo = rg.getValues()[0], fo = rg.getFormulas()[0], cab = sh.getRange(enc, 1, 1, nc).getDisplayValues()[0];
  const guardado = crudo.map((v, j) => fo[j] ? fo[j] : (v instanceof Date ? { d: v.toISOString() } : v));
  datPapeleraHoja_().appendRow([new Date(), ss.getId(), ss.getName(), sh.getName(), fila, JSON.stringify(cab), JSON.stringify(guardado), 'Eliminada']);
  sh.deleteRow(fila);
  pHistorial_(pBC_(), [[new Date(), ss.getName() + ' › ' + sh.getName(), 'fila ' + fila + (disp[0] ? ' · ' + String(disp[0]).slice(0, 40) : ''), '(fila completa)', disp.filter(String).join(' | ').slice(0, 500), '(eliminada · en PAPELERA)', 'Portal · Datos']]);
  datLimpiarCaches_();
  return { ok: true };
}
function datPapelera_() {
  const sh = datPapeleraHoja_(), n = sh.getLastRow() - 5; if (n < 1) return { ok: true, lista: [] };
  const v = sh.getRange(6, 1, n, 8).getValues();
  return { ok: true, lista: v.map((r, i) => ({ n: 6 + i, fecha: datTxt_(r[0]), libro: r[2], hoja: r[3], fila: r[4], cab: (() => { try { return JSON.parse(r[5]); } catch (e) { return []; } })(), valores: (() => { try { return JSON.parse(r[6]).map(c => c && c.d ? datTxt_(new Date(c.d)) : c); } catch (e) { return []; } })(), estado: r[7] })).reverse().slice(0, 300) };
}
function datRestaurar_(x) {
  const pap = datPapeleraHoja_(), n = Number(x.n); if (!(n >= 6)) return { ok: false, mensaje: 'Elegí una fila de la papelera.' };
  const r = pap.getRange(n, 1, 1, 8).getValues()[0]; if (r[7] !== 'Eliminada') return { ok: false, mensaje: 'Esa fila ya fue restaurada.' };
  const ss = datAbrir_(r[1]), sh = ss.getSheetByName(r[3]); if (!sh) return { ok: false, mensaje: 'La hoja «' + r[3] + '» ya no existe.' };
  const vals = JSON.parse(r[6]).map(c => c && c.d ? new Date(c.d) : c), nueva = sh.getLastRow() + 1;
  if (nueva > sh.getMaxRows()) sh.insertRowsAfter(sh.getMaxRows(), 1);
  vals.forEach((v, j) => { const c = sh.getRange(nueva, j + 1); if (typeof v === 'string' && v.charAt(0) === '=') c.setFormula(v); else if (v !== '' && v != null) { if (typeof v === 'string' && /^0\d+$/.test(v)) c.setNumberFormat('@'); c.setValue(v); } });
  pap.getRange(n, 8).setValue('Restaurada el ' + datTxt_(new Date()) + ' (fila ' + nueva + ')');
  pHistorial_(pBC_(), [[new Date(), ss.getName() + ' › ' + sh.getName(), 'fila ' + nueva + ' (restaurada)', '(fila completa)', '', '(restaurada desde PAPELERA; antes estaba en la fila ' + r[4] + ')', 'Portal · Datos']]);
  datLimpiarCaches_();
  return { ok: true, fila: nueva, hoja: r[3], libro: ss.getName() };
}
function datHistorial_(x) {
  const sh = pBC_().getSheetByName('HISTORIAL'); if (!sh || sh.getLastRow() < 6) return { ok: true, lista: [] };
  const n = Math.min(sh.getLastRow() - 5, 3000), v = sh.getRange(sh.getLastRow() - n + 1, 1, n, 7).getDisplayValues().reverse();
  const q = datNorm_(x && x.q).trim();
  return { ok: true, lista: v.filter(r => !q || datNorm_(r.join(' ')).indexOf(q) >= 0).slice(0, 300) };
}

// Configuración del sistema (propiedades del script: IDs de libros y carpetas, establecimientos a precalentar, etc.)
function datProps_() { const p = PropertiesService.getScriptProperties().getProperties(); return { ok: true, props: Object.keys(p).sort().map(k => ({ k: k, v: /CLAVE|TOKEN|SECRET/i.test(k) ? '' : p[k], oculta: /CLAVE|TOKEN|SECRET/i.test(k) })) }; }
function datProp_(x) {
  const k = String(x.k || '').trim(); if (!/^[A-Z0-9_]{2,60}$/.test(k)) return { ok: false, mensaje: 'El nombre va en mayúsculas, sin espacios (ej.: PRECALENTAR_EST).' };
  const P = PropertiesService.getScriptProperties(), antes = P.getProperty(k) || '';
  if (x.borrar) P.deleteProperty(k); else P.setProperty(k, String(x.v == null ? '' : x.v).trim());
  pHistorial_(pBC_(), [[new Date(), 'Configuración del sistema (propiedades del script)', k, k, /CLAVE|TOKEN|SECRET/i.test(k) ? '(oculto)' : datH_(antes), x.borrar ? '(borrada)' : (/CLAVE|TOKEN|SECRET/i.test(k) ? '(oculto)' : datH_(x.v)), 'Portal · Datos']]);
  if (k === 'DATOS_LIBROS_EXTRA' || /_ID$/.test(k)) CacheService.getScriptCache().remove('dat_libros');
  return { ok: true };
}

function datPortal_(accion, x) {
  switch (accion) {
    case 'p_dat_libros': return datLibros_(x.fresco);
    case 'p_dat_hojas': return datHojas_(x);
    case 'p_dat_hoja': return datHoja_(x);
    case 'p_dat_guardar': return conLock_(() => datGuardar_(x));
    case 'p_dat_agregar': return conLock_(() => datAgregar_(x));
    case 'p_dat_eliminar': return conLock_(() => datEliminar_(x));
    case 'p_dat_papelera': return datPapelera_();
    case 'p_dat_restaurar': return conLock_(() => datRestaurar_(x));
    case 'p_dat_historial': return datHistorial_(x);
    case 'p_dat_props': return datProps_();
    case 'p_dat_prop': return conLock_(() => datProp_(x));
  }
  return { ok: false, mensaje: 'Acción desconocida.' };
}
