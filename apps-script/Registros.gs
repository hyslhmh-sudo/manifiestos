/**
 * SISTEMA HyS · MIS REGISTROS (ver, corregir y anular lo cargado)
 * Para «Mi establecimiento» (m_registros, m_anular) y el portal (p_registros, p_anular).
 *   Manifiestos y certificados: viven en el libro del establecimiento y en el libro general. Al anular, sus filas pasan a la hoja
 *     ANULADOS de cada libro (con fecha, quién y motivo) y salen de MANIFIESTOS/CERTIFICADOS: así no cuentan en el avance, el tablero ni la DDJJ.
 *   Agua, plagas y documentos (BASE COMÚN): la fila queda donde está, marcada «ANULADO …» en OBSERVACIONES (y ESTADO «Anulado» si la hoja lo tiene).
 *     Después se recalcula lo que dependía de ella (última limpieza del tanque, último análisis de la canilla, estado del caso de plagas).
 * Corregir = guardar la versión nueva y anular la anterior con el motivo «Corregido». Si la versión nueva no se puede guardar, la anterior no se toca.
 * Plazo: el establecimiento puede corregir o anular hasta REG_DIAS días después de la carga. Con la clave de Higiene y Seguridad, sin límite.
 * Cada anulación queda en BASE COMÚN › HISTORIAL. Nunca se borra información.
 */
const REG_DIAS = 30;
const regVivo_ = r => !/^ANULADO/.test(String(r.OBSERVACIONES || '')) && r.ESTADO !== 'Anulado';
const regHoy_ = () => Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd');
function regPuede_(maestra, fecha) {
  if (maestra) return true; if (!fecha) return false;
  const d = Math.round((new Date(regHoy_() + 'T12:00:00') - new Date(String(fecha).slice(0, 10) + 'T12:00:00')) / 864e5);
  return d <= REG_DIAS;
}
const regMarca_ = (quien, motivo, previo) => 'ANULADO ' + regHoy_() + ' · ' + (quien || 's/d') + ' · ' + motivo + (previo ? ' · ' + previo : '');
const regLog_ = (cod, hoja, id, motivo, quien) => pHistorial_(pBC_(), [[new Date(), hoja, cod, 'ANULADO · ' + id, '', motivo, (quien || 's/d')]]);

// ------------------------------------------------------------------ Manifiestos y certificados (libros)
function regLibro_(cod) { const E = est_(cod); if (!E || !E.libro) throw new Error('El establecimiento no tiene libro de residuos.'); return { E: E, ss: SpreadsheetApp.openById(E.libro) }; }
const regFecha_ = v => v instanceof Date ? Utilities.formatDate(v, TZ, 'yyyy-MM-dd') : String(v || '').slice(0, 10);
// Clave de un manifiesto: el identificador de la app («app:…») o, si es histórico, sitio|número|fecha
function regClaveMan_(sitio, nro, fecha, obs) { const m = /app:([\w-]+)/.exec(String(obs || '')); return m ? 'app:' + m[1] : 'k:' + sitio + '|' + String(nro).trim() + '|' + fecha; }
const regObs_ = (obs, etiqueta) => { const m = new RegExp(etiqueta + ':\\s*([^·]+)').exec(String(obs || '')); return m ? m[1].trim() : ''; };
function regManifiestos_(ss, desde) {
  const sh = ss.getSheetByName('MANIFIESTOS'), n = sh.getLastRow() - 5; if (n < 1) return [];
  const g = {}, orden = [];
  sh.getRange(6, 1, n, 13).getValues().forEach((r, i) => {
    if (!r[2]) return; const fecha = regFecha_(r[2]); if (fecha < desde) return;
    const k = regClaveMan_(r[1], r[5], fecha, r[12]);
    if (!g[k]) { g[k] = { id: k, filas: [], sitio: r[1], nro: String(r[5]).trim(), fecha: fecha, origen: r[11], obs: String(r[12] || ''), res: [] }; orden.push(k); }
    g[k].filas.push(6 + i); g[k].res.push({ corriente: r[6], cant: r[7], tam: r[8], vol: r[9], uni: r[10] || 'dm³' });
  });
  return orden.map(k => g[k]);
}
function regCertificados_(ss, desde) {
  const sh = ss.getSheetByName('CERTIFICADOS'), n = sh.getLastRow() - 5; if (n < 1) return [];
  return sh.getRange(6, 1, n, certAncho_(sh)).getValues().map((r, i) => ({ fila: 6 + i, r: r })).filter(x => x.r[3]).map(x => {
    const mes = x.r[1] + '-' + String(x.r[2]).padStart(2, '0'), ft = x.r[4] ? regFecha_(x.r[4]) : '';
    return { id: 'cert:' + String(x.r[3]).trim(), fila: x.fila, empresa: x.r[0], mes: mes, ncert: String(x.r[3]).trim(), ftrat: ft, ref: String(x.r[7] || ''), fecha: ft || mes + '-01', res: certCantLeer_(x.r) };
  }).filter(c => c.fecha >= desde);
}
// Mueve filas a la hoja ANULADOS del mismo libro (se crea sola), con fecha, quién y motivo
function regMover_(ss, hoja, filas, quien, motivo) {
  if (!filas.length) return 0;
  const sh = ss.getSheetByName(hoja), nc = sh.getLastColumn();
  let an = ss.getSheetByName('ANULADOS');
  if (!an) { an = ss.insertSheet('ANULADOS'); an.appendRow(['Anulado', 'Quién', 'Motivo', 'Hoja', 'Datos de la fila (en el mismo orden de la hoja)']); an.getRange(1, 1, 1, 5).setFontWeight('bold').setBackground('#343A40').setFontColor('#FFFFFF'); an.setFrozenRows(1); }
  const orden = filas.slice().sort((a, b) => b - a);
  orden.forEach(f => { const v = sh.getRange(f, 1, 1, nc).getValues()[0].map(x => x instanceof Date ? Utilities.formatDate(x, TZ, 'dd/MM/yyyy') : x); an.appendRow([new Date(), quien || 's/d', motivo, hoja].concat(v)); });
  orden.forEach(f => sh.deleteRow(f));
  return orden.length;
}
function regAnularMan_(cod, id, quien, motivo, excluir) {
  const L = regLibro_(cod), M = regManifiestos_(L.ss, '1900-01-01').find(m => m.id === id); if (!M) return { ok: false, mensaje: 'No encontré ese manifiesto.' };
  const filas = M.filas.filter(f => !excluir || String(L.ss.getSheetByName('MANIFIESTOS').getRange(f, 13).getValue()).indexOf('app:' + excluir) < 0);
  regMover_(L.ss, 'MANIFIESTOS', filas, quien, motivo);
  // Libro general: mismas filas (por el identificador de la app o por establecimiento, sitio, número y fecha)
  const g = SpreadsheetApp.openById(CFG.GENERAL), gm = g.getSheetByName('MANIFIESTOS'), n = gm.getLastRow() - 5, fg = [];
  if (n > 0) gm.getRange(6, 1, n, 14).getValues().forEach((r, i) => {
    if (limpio_(r[0]) !== limpio_(L.E.nombre)) return; const o = String(r[13] || '');
    if (excluir && o.indexOf('app:' + excluir) >= 0) return;
    if (/^app:/.test(id) ? o.indexOf(id) >= 0 : (r[1] === M.sitio && String(r[6]).trim() === M.nro && regFecha_(r[3]) === M.fecha)) fg.push(6 + i);
  });
  regMover_(g, 'MANIFIESTOS', fg, quien, motivo + ' · ' + cod);
  regLog_(cod, 'MANIFIESTOS', 'Manifiesto ' + M.nro + ' (' + M.fecha + ', ' + M.sitio + ')', motivo, quien);
  CacheService.getScriptCache().removeAll(['p_resumen', 'p_tablero']);
  return { ok: true };
}
function regAnularCert_(cod, id, quien, motivo, excluir) {
  const L = regLibro_(cod), C = regCertificados_(L.ss, '1900-01-01').filter(c => c.id === id && (!excluir || c.ref.indexOf('app:' + excluir) < 0)); if (!C.length) return { ok: false, mensaje: 'No encontré ese certificado.' };
  regMover_(L.ss, 'CERTIFICADOS', C.map(c => c.fila), quien, motivo);
  const g = SpreadsheetApp.openById(CFG.GENERAL), gc = g.getSheetByName('CERTIFICADOS'), n = gc.getLastRow() - 5, fg = [];
  if (n > 0) gc.getRange(6, 1, n, 8).getValues().forEach((r, i) => { if (limpio_(r[0]) === limpio_(L.E.nombre) && 'cert:' + String(r[4]).trim() === id && !(excluir && String(r[7]).indexOf('app:' + excluir) >= 0)) fg.push(6 + i); });
  regMover_(g, 'CERTIFICADOS', fg, quien, motivo + ' · ' + cod);
  regLog_(cod, 'CERTIFICADOS', 'Certificado ' + id.slice(5), motivo, quien);
  return { ok: true };
}

// Subir la foto o el PDF de un manifiesto ya cargado (regulariza la falta de foto; se puede en cualquier momento)
function regFotoMan_(cod, id, archivo, quien) {
  if (!archivo || !archivo.base64) return { ok: false, mensaje: 'Falta el archivo.' };
  const L = regLibro_(cod), M = regManifiestos_(L.ss, '1900-01-01').find(m => m.id === id); if (!M) return { ok: false, mensaje: 'No encontré ese manifiesto.' };
  const url = guardarFoto_(L.E.carpeta, 'Fotos manifiestos', M.fecha.slice(0, 4), fechaPunto_(M.fecha) + ' - ' + nro12_(M.nro), 'data:' + (archivo.tipo || 'image/jpeg') + ';base64,' + String(archivo.base64).replace(/^data:[^,]+,/, ''));
  if (!url) return { ok: false, mensaje: 'El archivo no se pudo leer.' };
  const nueva = o => { o = String(o || ''); const t = 'Foto: ' + url + ' (subida el ' + regHoy_() + (quien ? ' por ' + quien : '') + ')';
    return /Sin foto|En lote escaneado:[^·]*/.test(o) ? o.replace(/Sin foto|En lote escaneado:[^·]*/, t + ' ') : t + ' · ' + o; };
  const sh = L.ss.getSheetByName('MANIFIESTOS'); M.filas.forEach(f => sh.getRange(f, 13).setValue(nueva(sh.getRange(f, 13).getValue())));
  const gm = SpreadsheetApp.openById(CFG.GENERAL).getSheetByName('MANIFIESTOS'), n = gm.getLastRow() - 5;
  if (n > 0) gm.getRange(6, 1, n, 14).getValues().forEach((r, i) => {
    if (limpio_(r[0]) !== limpio_(L.E.nombre)) return; const o = String(r[13] || '');
    if (/^app:/.test(id) ? o.indexOf(id) >= 0 : (r[1] === M.sitio && String(r[6]).trim() === M.nro && regFecha_(r[3]) === M.fecha)) gm.getRange(6 + i, 14).setValue(nueva(o));
  });
  pHistorial_(pBC_(), [[new Date(), 'MANIFIESTOS', cod, 'FOTO · Manifiesto ' + M.nro, 'Sin foto', url, quien || 's/d']]);
  return { ok: true, url: url };
}

// ------------------------------------------------------------------ Agua, plagas y documentos (BASE COMÚN): marcar y recalcular
function regMarcar_(hoja, campo, id, cod, quien, motivo) {
  const f = miLeer_(hoja).find(r => r[campo] === id && r.ESTABLECIMIENTO === cod); if (!f) return null;
  if (!regVivo_(f)) return f;
  const o = { OBSERVACIONES: regMarca_(quien, motivo, f.OBSERVACIONES) }; if (MI_H[hoja].indexOf('ESTADO') >= 0) o.ESTADO = 'Anulado';
  miCambiar_(hoja, f.fila, o); regLog_(cod, hoja, id, motivo, quien); return f;
}
function regRecalcTanque_(codTanque) {
  const T = miLeer_('RESERVORIOS').find(t => t.CODIGO_TANQUE === codTanque); if (!T) return;
  const u = miLeer_('AGUA_LIMPIEZAS').filter(l => l.CODIGO_TANQUE === codTanque && regVivo_(l)).map(l => l.FECHA).sort().pop() || '';
  miCambiar_('RESERVORIOS', T.fila, { ULTIMA_LIMPIEZA: u, PROXIMA_LIMPIEZA: u ? miSumarMeses_(u, Number(T.FRECUENCIA_LIMPIEZA_MESES) || 12) : '', ACTUALIZADO: regHoy_() });
}
function regRecalcPunto_(codPunto) {
  const P = miLeer_('PUNTOS_MUESTREO').find(p => p.CODIGO_PUNTO === codPunto); if (!P) return;
  const A = miLeer_('AGUA_ANALISIS').filter(a => a.CODIGO_PUNTO === codPunto), V = A.filter(regVivo_).sort((a, b) => a.FECHA_TOMA.localeCompare(b.FECHA_TOMA));
  const ult = re => (V.filter(a => re.test(a.TIPO)).pop() || {}).FECHA_TOMA || '', u = V[V.length - 1];
  miCambiar_('PUNTOS_MUESTREO', P.fila, { ULTIMO_BACTERIOLOGICO: ult(/bacterio|ambos/i), ULTIMO_FISICOQUIMICO: ult(/f[ií]sico|ambos/i), ULTIMO_RESULTADO: u ? u.RESULTADO + ' (' + u.FECHA_TOMA + ')' : '' });
  // Un NO APTO que se había cerrado por una muestra apta que ahora no vale, se vuelve a abrir
  A.filter(a => regVivo_(a) && /no apta/i.test(a.RESULTADO) && /^Cerrada/.test(a.ESTADO_ACCION)).forEach(a => {
    if (!V.some(b => /^apta/i.test(b.RESULTADO) && b.FECHA_TOMA >= a.FECHA_TOMA)) miCambiar_('AGUA_ANALISIS', a.fila, { ESTADO_ACCION: 'Abierta' }); });
}
function regRecalcCaso_(caso) {
  const C = miLeer_('PLAGAS_CASOS').find(c => c.CASO === caso); if (!C || !regVivo_(C)) return;
  const R = miLeer_('PLAGAS_REGISTROS').filter(r => r.CASO === caso && regVivo_(r)).sort((a, b) => (a.FECHA + a.ID).localeCompare(b.FECHA + b.ID));
  const u = R[R.length - 1], seg = R.filter(r => r.TIPO === 'Seguimiento'), s2 = seg.slice(-2);
  const cerrado = s2.length === 2 && s2.every(r => /sin actividad/i.test(r.RESULTADO)) && /cerrar/i.test(s2[1].DECISION || '');
  miCambiar_('PLAGAS_CASOS', C.fila, { ESTADO: !u ? 'Abierto' : cerrado ? 'Cerrado' : 'En seguimiento', PROXIMA_REVISION: !u || cerrado ? '' : (u.PROXIMA_REVISION || ''), ACTUALIZADO: regHoy_() });
}

// ------------------------------------------------------------------ Anular (una acción para todos los tipos)
function regAnular_(cod, x, maestra) {
  const tipo = x.tipo, id = limpio_(x.id), motivo = limpio_(x.motivo), quien = limpio_(x.quien) || (maestra ? 'Higiene y Seguridad' : 's/d');
  if (!motivo) return { ok: false, mensaje: 'Falta el motivo.' };
  const lista = regListar_(cod, maestra, 24).registros, r = lista.find(o => o.tipo === tipo && o.id === id);
  if (!r) return { ok: false, mensaje: 'No encontré ese registro.' };
  if (r.anulado) return { ok: true, aviso: 'Ya estaba anulado.' };
  if (!r.editable) return { ok: false, mensaje: 'Pasaron más de ' + REG_DIAS + ' días desde la carga: pedile a Higiene y Seguridad que lo corrija.' };
  return regAnularSin_(cod, tipo, id, quien, motivo, '');
}
function regAnularSin_(cod, tipo, id, quien, motivo, excluir) {
  if (tipo === 'manifiesto') return regAnularMan_(cod, id, quien, motivo, excluir);
  if (tipo === 'certificado') return regAnularCert_(cod, id, quien, motivo, excluir);
  if (tipo === 'limpieza') { const f = regMarcar_('AGUA_LIMPIEZAS', 'ID', id, cod, quien, motivo); if (!f) return { ok: false, mensaje: 'No encontré esa limpieza.' }; regRecalcTanque_(f.CODIGO_TANQUE); }
  else if (tipo === 'analisis') { const f = regMarcar_('AGUA_ANALISIS', 'ID', id, cod, quien, motivo); if (!f) return { ok: false, mensaje: 'No encontré ese análisis.' }; regRecalcPunto_(f.CODIGO_PUNTO); }
  else if (tipo === 'caso') { const f = regMarcar_('PLAGAS_CASOS', 'CASO', id, cod, quien, motivo); if (!f) return { ok: false, mensaje: 'No encontré ese caso.' };
    miLeer_('PLAGAS_REGISTROS').filter(r => r.CASO === id && regVivo_(r)).forEach(r => miCambiar_('PLAGAS_REGISTROS', r.fila, { OBSERVACIONES: regMarca_(quien, 'Caso ' + id + ' anulado', r.OBSERVACIONES) })); }
  else if (tipo === 'plaga') { const f = regMarcar_('PLAGAS_REGISTROS', 'ID', id, cod, quien, motivo); if (!f) return { ok: false, mensaje: 'No encontré ese registro.' }; if (f.CASO) regRecalcCaso_(f.CASO); }
  else if (tipo === 'documento') { if (!regMarcar_('DOCUMENTOS_EST', 'ID', id, cod, quien, motivo)) return { ok: false, mensaje: 'No encontré ese documento.' }; }
  else return { ok: false, mensaje: 'Tipo de registro desconocido.' };
  CacheService.getScriptCache().remove('p_tablero');
  return { ok: true };
}

// ------------------------------------------------------------------ Corregir: guarda la versión nueva y anula la anterior
// guardar: función que guarda la versión nueva y devuelve {ok,...}. Se usa desde Código.gs (manifiesto, certificado) y Establecimiento.gs.
function regCorregir_(cod, tipo, id, maestra, quien, guardar, idNuevo) {
  const r = regListar_(cod, maestra, 24).registros.find(o => o.tipo === tipo && o.id === id);
  if (!r) {   // reintento desde el teléfono: la corrección ya se había guardado (la versión anterior ya está anulada)
    const res = guardar(); if (res && res.ok && res.repetido) return res;
    return res && res.ok ? Object.assign({}, res, { aviso: 'El registro original ya no estaba: se guardó como carga nueva.' }) : { ok: false, mensaje: 'No encontré el registro que querés corregir.' };
  }
  if (r.anulado) return { ok: false, mensaje: 'Ese registro ya estaba anulado.' };
  if (!r.editable) return { ok: false, mensaje: 'Pasaron más de ' + REG_DIAS + ' días desde la carga: pedile a Higiene y Seguridad que lo corrija.' };
  const res = guardar(); if (!res || !res.ok || res.repetido) return res;
  regAnularSin_(cod, tipo, id, quien || 's/d', 'Corregido: reemplazado por una carga nueva', idNuevo || '');
  if (tipo === 'limpieza' && r.datos.CODIGO_TANQUE) regRecalcTanque_(r.datos.CODIGO_TANQUE);
  if (tipo === 'analisis' && r.datos.CODIGO_PUNTO) regRecalcPunto_(r.datos.CODIGO_PUNTO);
  return Object.assign({}, res, { corregido: true });
}
// Aviso de plagas (caso) y documento propio: se corrigen en el mismo lugar (otros registros apuntan a su código)
function regEditar_(cod, hoja, campo, id, maestra, x, quien) {
  const f = miLeer_(hoja).find(r => r[campo] === id && r.ESTABLECIMIENTO === cod); if (!f) return { ok: false, mensaje: 'No encontré el registro.' };
  if (!maestra && !regPuede_(false, f.CARGADO || f.FECHA || f.ACTUALIZADO)) return { ok: false, mensaje: 'Pasaron más de ' + REG_DIAS + ' días desde la carga: pedile a Higiene y Seguridad que lo corrija.' };
  const campos = hoja === 'PLAGAS_CASOS' ? ['SITIO', 'SECTOR', 'FECHA', 'PLAGA', 'EVIDENCIA', 'CANTIDAD', 'OBSERVACIONES'] : ['TEMA', 'TIPO', 'CODIGO', 'TITULO', 'VERSION', 'FECHA_VIGENCIA', 'FECHA_VENCIMIENTO', 'OBSERVACIONES'];
  const o = {}, log = [];
  campos.forEach(k => { if (k in x && String(x[k] == null ? '' : x[k]) !== String(f[k] || '')) { o[k] = x[k]; log.push([new Date(), hoja, cod, k + ' · ' + id, f[k], x[k], 'Corrección · ' + (quien || 's/d')]); } });
  const url = x.archivo && x.archivo.base64 ? miArchivo_(cod, hoja === 'PLAGAS_CASOS' ? 'Plagas' : 'Documentos propios', hoja === 'PLAGAS_CASOS' ? id : (x.TEMA || f.TEMA || 'Otro'), Object.assign({ nombre: id }, x.archivo)) : '';
  if (url) { o.ARCHIVO = url; log.push([new Date(), hoja, cod, 'ARCHIVO · ' + id, f.ARCHIVO, url, 'Corrección · ' + (quien || 's/d')]); }
  if (hoja === 'PLAGAS_CASOS') o.ACTUALIZADO = regHoy_();
  if (Object.keys(o).length) miCambiar_(hoja, f.fila, o);
  if (log.length) pHistorial_(pBC_(), log);
  CacheService.getScriptCache().remove('p_tablero');
  return { ok: true, corregido: true };
}

// ------------------------------------------------------------------ Listado (últimos meses), con lo que se puede corregir
function regListar_(cod, maestra, meses) {
  const desde = (() => { const d = new Date(); d.setMonth(d.getMonth() - (meses || 12)); return Utilities.formatDate(d, TZ, 'yyyy-MM-dd'); })();
  const out = [], pon = o => out.push(o);
  // Residuos
  try {
    const L = regLibro_(cod);
    regManifiestos_(L.ss, desde).forEach(m => pon({ tema: 'Residuos', tipo: 'manifiesto', id: m.id, fecha: m.fecha, lugar: m.sitio, sinFoto: !/(Foto|Escaneo): *https?:/.test(m.obs), historico: m.origen !== 'App', titulo: 'Manifiesto ' + m.nro + ' · ' + m.sitio,
      detalle: m.res.map(r => r.corriente + ' ' + (r.vol || r.cant) + ' ' + r.uni).join(' · '), cargo: regObs_(m.obs, 'Cargó') || m.origen, url: regObs_(m.obs, 'Foto') || regObs_(m.obs, 'Escaneo'),
      editable: regPuede_(maestra, m.fecha), datos: { sitio: m.sitio, nro: m.nro, fecha: m.fecha, firma: regObs_(m.obs, 'Firmó transportista'), llego: (/^(\d{2})\/(\d{2})\/(\d{4})$/.exec(regObs_(m.obs, 'Llegó a la oficina') || '') || []).slice(1).reverse().join('-'), original: regObs_(m.obs, 'Original en el establecimiento'), obs: regObs_(m.obs, 'Obs\\.'), res: m.res } }));
    regCertificados_(L.ss, desde).forEach(c => pon({ tema: 'Residuos', tipo: 'certificado', id: c.id, fecha: c.fecha, titulo: 'Certificado ' + c.ncert + ' · ' + c.mes, detalle: c.empresa + (c.res.length ? ' · ' + c.res.map(r => r.corriente + ' ' + r.vol + ' ' + r.uni).join(' · ') : ''),
      cargo: regObs_(c.ref, 'Cargó'), url: /^https?:/.test(c.ref) ? c.ref.split(' · ')[0] : '', editable: regPuede_(maestra, c.fecha), datos: { empresa: c.empresa, mes: c.mes, ncert: c.ncert, ftrat: c.ftrat, res: c.res } }));
  } catch (e) {}
  const mios = hoja => miLeer_(hoja).filter(r => r.ESTABLECIMIENTO === cod);
  const base = (r, carga) => ({ cargo: r.CARGO || r.AVISO_DE || '', url: r.ARCHIVO || '', anulado: !regVivo_(r), motivo: regVivo_(r) ? '' : String(r.OBSERVACIONES).split(' · ').slice(0, 3).join(' · '), editable: regVivo_(r) && regPuede_(maestra, carga) });
  mios('AGUA_LIMPIEZAS').filter(r => r.FECHA >= desde).forEach(r => pon(Object.assign({ tema: 'Agua', tipo: 'limpieza', id: r.ID, fecha: r.FECHA, titulo: 'Limpieza de ' + r.CODIGO_TANQUE, detalle: [r.PROCEDIMIENTO, r.CLORO_PPM ? 'cloro ' + r.CLORO_PPM + ' ppm' : ''].filter(Boolean).join(' · '), datos: r }, base(r, r.CARGADO || r.FECHA))));
  mios('AGUA_ANALISIS').filter(r => r.FECHA_TOMA >= desde).forEach(r => pon(Object.assign({ tema: 'Agua', tipo: 'analisis', id: r.ID, fecha: r.FECHA_TOMA, titulo: 'Análisis ' + r.TIPO.toLowerCase() + ' · ' + r.CODIGO_PUNTO, detalle: r.RESULTADO + (r.LABORATORIO ? ' · ' + r.LABORATORIO : ''), datos: r }, base(r, r.CARGADO || r.FECHA_TOMA))));
  mios('PLAGAS_CASOS').filter(r => r.FECHA >= desde).forEach(r => pon(Object.assign({ tema: 'Plagas', tipo: 'caso', id: r.CASO, fecha: r.FECHA, titulo: 'Aviso · ' + r.PLAGA + ' (' + r.CASO + ')', detalle: [r.SITIO, r.SECTOR, r.ESTADO].filter(Boolean).join(' · '), datos: r }, base(r, r.FECHA))));
  mios('PLAGAS_REGISTROS').filter(r => r.FECHA >= desde).forEach(r => pon(Object.assign({ tema: 'Plagas', tipo: 'plaga', id: r.ID, fecha: r.FECHA, titulo: r.TIPO + (r.CASO ? ' · ' + r.CASO : ' · ' + r.SECTOR), detalle: [r.RESULTADO, r.DECISION, r.QUIMICO === 'Sí' ? 'químico: ' + r.PRODUCTO : ''].filter(Boolean).join(' · '), datos: r }, base(r, r.CARGADO || r.FECHA))));
  mios('DOCUMENTOS_EST').filter(r => (r.CARGADO || '') >= desde).forEach(r => pon(Object.assign({ tema: 'Documentos', tipo: 'documento', id: r.ID, fecha: r.CARGADO, titulo: (r.CODIGO ? r.CODIGO + ' · ' : '') + r.TITULO, detalle: [r.TIPO, r.VERSION ? 'versión ' + r.VERSION : '', r.ESTADO].filter(Boolean).join(' · '), datos: r }, base(r, r.CARGADO))));
  out.forEach(o => { if (o.anulado == null) o.anulado = false; delete (o.datos || {}).fila; });
  out.sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));
  // Anulados de residuos (hoja ANULADOS del libro), solo para mostrar
  let anulados = [];
  try { const sh = regLibro_(cod).ss.getSheetByName('ANULADOS'); if (sh && sh.getLastRow() > 1) anulados = sh.getRange(2, 1, sh.getLastRow() - 1, 11).getValues().slice(-40).reverse().map(r => ({ fecha: regFecha_(r[0]), quien: r[1], motivo: r[2], hoja: r[3], texto: r[3] === 'MANIFIESTOS' ? 'Manifiesto ' + r[9] + ' · ' + r[5] + ' · ' + r[10] : 'Certificado ' + r[7] })); } catch (e) {}
  return { ok: true, dias: REG_DIAS, maestra: !!maestra, registros: out, anuladosResiduos: anulados };
}