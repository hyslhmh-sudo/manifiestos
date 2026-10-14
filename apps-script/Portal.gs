/**
 * SISTEMA HyS · PORTAL DE GESTIÓN (fase 2)
 * Acciones del portal personal de Higiene y Seguridad. Todas exigen la clave universal (MAESTRA).
 * Lee y escribe en BASE COMÚN, BASE DE TRABAJADORES y el libro general de residuos.
 * Las planillas siguen siendo el sistema: el portal no guarda nada propio.
 */

function portal_(d) {
  if (!esMaestra_(d.clave)) return { ok: false, error: 'clave', mensaje: 'La clave de Higiene y Seguridad no es correcta.' };
  const t0 = Date.now(), r = portalAccion_(d);
  const ms = Date.now() - t0;
  if (ms > 4000) try {   // registro de acciones lentas, para revisar la velocidad
    const g = SpreadsheetApp.openById(CFG.GENERAL); let sh = g.getSheetByName('TIEMPOS_PORTAL');
    if (!sh) { sh = g.insertSheet('TIEMPOS_PORTAL'); sh.appendRow(['FECHA', 'ACCION', 'SEGUNDOS', 'DETALLE']); sh.getRange('A1:D1').setFontWeight('bold'); }
    sh.appendRow([new Date(), d.accion, Math.round(ms / 100) / 10, JSON.stringify(d.datos || {}).slice(0, 120)]);
  } catch (e) {}
  return r;
}
function portalAccion_(d) {
  const x = d.datos || {};
  switch (d.accion) {
    case 'p_ping': return { ok: true, version: VERSION_SISTEMA };   // solo valida la clave (ingreso rápido)
    case 'p_resumen': return pResumen_(x.fresco);
    case 'p_tablero': { const t = tbTablero_(x.fresco); try { if (t && t.ok !== false && typeof remRed_ === 'function') t.remision = remRed_(x.fresco); } catch (e) {} return t; }   // tablero de control (Tablero.gs) + remisión semanal de manifiestos (ResiduosRemision.gs)
    case 'p_res_tablero': return typeof resTablero_ === 'function' ? resTablero_(x.fresco) : { ok: false, mensaje: 'Falta instalar ResiduosTablero.gs.' };   // 1 · Residuos: tablero general (14.22)
    case 'p_res_frecuencias': return typeof resFrecuencias_ === 'function' ? resFrecuencias_(x) : { ok: false, mensaje: 'Falta instalar ResiduosContratos.gs.' };   // frecuencias de retiro (14.23)
    case 'p_res_inf_opciones': return typeof resInfOpciones_ === 'function' ? resInfOpciones_() : { ok: false, mensaje: 'Falta instalar ResiduosInforme.gs.' };   // informe de frecuencia de retiro (14.26)
    case 'p_res_informe': return typeof resInforme_ === 'function' ? resInforme_(x) : { ok: false, mensaje: 'Falta instalar ResiduosInforme.gs.' };
    case 'p_res_costos': return typeof resCostos_ === 'function' ? resCostos_(x) : { ok: false, mensaje: 'Falta instalar ResiduosContratos.gs.' };   // contrato y costos (14.23)
    case 'p_bib_listar': return bibListar_();       // biblioteca HyS
    case 'p_bib_guardar': return bibGuardar_(x);
    case 'p_bib_cambiar': return bibCambiar_(x);
    case 'p_registros': return regListar_(limpio_(x.cod), true, 24);   // Registros.gs: todo lo cargado, sin plazo para Higiene y Seguridad
    case 'p_anular': return conLock_(() => regAnular_(limpio_(x.cod), x, true));
    case 'p_mi': return miTablero_(limpio_(x.cod));   // agua, plagas y documentos de un establecimiento (Establecimiento.gs)
    case 'p_ficha': return pFicha_(x.cod);
    case 'p_trab': return pTrab_(x);
    case 'p_trab_guardar': return conLock_(() => pTrabGuardar_(x));
    case 'p_ficha_guardar': return conLock_(() => pFichaGuardar_(x));
    case 'p_caps': return { ok: true, caps: pCapsDe_(x.dni) };
    case 'p_diag_lista': return { ok: true, lista: pDiagLista_() };
    case 'p_diag_abrir': { const r = pDiagAbrir_(x.cod, x.id); try { r.informes = r.actual ? pInformesDiag_(r.actual.ID_DIAG) : []; } catch (e) { r.informes = []; } return r; }
    case 'p_informe_diag': return informeDiag_(x);
    case 'p_informe_correo': return informeCorreo_(x);
    case 'p_plan_listar': return planListar_();
    case 'p_plan_abrir': return planAbrir_(x);
    case 'p_plan_enviado': return planEnviado_(x);
    case 'p_plan_guardar': return planGuardar_(x);
    case 'p_plan_evidencia': return planEvidencia_(x);
    case 'p_nte_revisar': return nteRevisar_(x);
    case 'p_nte_matriz': return nteGuardarMatriz_(x);
    case 'p_nte_generar': return nteGenerar_(x);
    case 'p_bj_generar': return bjGenerar_(x);
    case 'p_bj_subir': return bjSubir_(x);
    case 'p_bj_carpeta': return bjCarpeta_();
    case 'p_bj_listar': return bjListar_();
    case 'p_bj_aplicar': return bjAplicar_(x);
    case 'p_diag_guardar': return conLock_(() => pDiagGuardar_(x, false));
    case 'p_diag_foto': return pDiagFoto_(x);
    // p_numero (pedido manual de números) se quitó el 12/10/2026: las notas las numera el hospital; los informes toman su número solos.
    case 'p_registro': return docRegistro_(x);
    case 'p_notas': return typeof notasPortal_ === 'function' ? notasPortal_('p_notas', x) : { ok: false, mensaje: 'Falta instalar Notas_portal.gs.' };   // 2 · Documentos › Notas enviadas y recibidas (Notas_portal.gs, solo lectura)
    case 'p_doc_actualizar': return docActualizar_(x);
    case 'p_diag_tablero': if (x.fresco) CacheService.getScriptCache().remove('diag_tablero'); return pDiagTablero_();
    case 'p_imp_previa': return pImportar_(x, false);
    case 'p_imp_aplicar': return conLock_(() => pImportar_(x, true));
    // Módulo 4 · Personal y RAR (Modulo4.gs): siniestros y exposición; buscador general
    case 'p_sin_lista': return typeof accPortalLista_ === 'function' ? accPortalLista_() : { ok: false, mensaje: 'Falta instalar Modulo4.gs.' };
    case 'p_sin_persona': return typeof accPortalPersona_ === 'function' ? accPortalPersona_(x.dni, x.hoja) : { ok: true, siniestros: [], exposicion: null };
    case 'p_sin_expo': return { ok: true, exposicion: typeof accExposicion_ === 'function' ? accExposicion_(x.dni, x.hoja) : null };
    case 'p_buscar': return pBuscar_(x.q);
    // Investigación de siniestros y estadísticas (Investigacion.gs)
    case 'p_inv_abrir': return typeof invAbrir_ === 'function' ? invAbrir_(x) : { ok: false, mensaje: 'Falta instalar Investigacion.gs.' };
    case 'p_inv_guardar': return invGuardar_(x);
    case 'p_inv_nota': return conLock_(() => invNota_(x));
    case 'p_sin_est': return typeof invEstadisticas_ === 'function' ? invEstadisticas_(x) : { ok: false, mensaje: 'Falta instalar Investigacion.gs.' };
    // Módulo 5 · Plagas (Modulo5.gs): registro MIPyV de los operarios
    case 'p_mipyv': return typeof plagMipyv_ === 'function' ? (x.fresco ? (CacheService.getScriptCache().remove('mipyv'), plagMipyv_()) : plagMipyv_()) : { ok: false, mensaje: 'Falta instalar Modulo5.gs.' };
    case 'p_mipyv_revisar': return conLock_(() => plagRevisar_(x));
    // Auditorías de residuos (Auditoria.gs)
    case 'p_aud_listar': return audListar_(x);
    case 'p_aud_opciones': return audOpciones_(x);
    case 'p_aud_crear': return audCrear_(x);
    case 'p_aud_abrir': return audAbrir_(x);
    case 'p_aud_responder': return audResponder_(x);
    case 'p_aud_foto': return audFoto_(x);
    case 'p_aud_cerrar': return audCerrar_(x);
    case 'p_aud_resultado': return audResultado_(x);
    case 'p_aud_hallazgos': return audHallazgos_(x);
    case 'p_aud_hallazgo_guardar': return audHallazgoGuardar_(x);
    case 'p_aud_al_plan': return audAlPlan_(x);
    case 'p_aud_verificar': return audVerificar_(x);
    case 'p_diag_relevamiento': return diagRelevamientoInicial_(x);   // relevamiento inicial del diagnóstico base (versión 10)
    case 'p_informe_trim_op': return informeTrimOpciones_(x);   // informe trimestral de auditoría (versión 11)
    case 'p_informe_trim': return informeTrim_(x);
    // Módulo 6 · Cocinas hospitalarias (Modulo6.gs): relevamiento BPM / HACCP y personas de cocina
    default: if (String(d.accion).indexOf('p_docest_') === 0) return typeof docEstPortal_ === 'function' ? docEstPortal_(d.accion, x) : { ok: false, mensaje: 'Falta actualizar Modulo2.gs.' };   // 2 · Documentos de los establecimientos
      if (String(d.accion).indexOf('p_acc_') === 0) return typeof accPortal_ === 'function' ? accPortal_(d.accion, x) : { ok: false, error: 'Acción desconocida.' };   // pantalla «Accesos» (Accesos.gs)
      if (String(d.accion).indexOf('p_dgm_') === 0) return typeof dgmPortal_ === 'function' ? dgmPortal_(d.accion, x) : { ok: false, error: 'Acción desconocida.' };   // diagnóstico de agua y plagas (DiagModulos.gs)
      if (String(d.accion).indexOf('p_coc_') === 0) return typeof cocPortal_ === 'function' ? cocPortal_(d.accion, x) : { ok: false, mensaje: 'Falta instalar Modulo6.gs.' };
      if (String(d.accion).indexOf('p_rad_') === 0) return typeof radPortal_ === 'function' ? radPortal_(d.accion, x) : { ok: false, mensaje: 'Falta instalar Radiaciones.gs (módulo 9).' };   // 9 · Radiaciones ionizantes
  }
  return { ok: false, error: 'Acción desconocida.' };
}
// Cada libro se abre una sola vez por ejecución (14.22): abrirlo de nuevo cuesta entre medio y un segundo cada vez.
let P_BC_ = null, P_BT_ = null;
const pBC_ = () => P_BC_ || (P_BC_ = SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('BASE_COMUN_ID')));
const pBT_ = () => P_BT_ || (P_BT_ = SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('BASE_TRABAJADORES_ID')));
const pFecha_ = v => v instanceof Date ? Utilities.formatDate(v, TZ, 'yyyy-MM-dd') : String(v || '');
function pTabla_(sh, nCols) {   // filas desde la 6, con su número de fila
  const n = sh.getLastRow() - 5; if (n < 1) return [];
  return sh.getRange(6, 1, n, nCols).getValues().map((r, i) => ({ fila: 6 + i, v: r })).filter(x => x.v.some(c => c !== '' && c !== null));
}
function pHistorial_(ss, filas) {   // BASE COMÚN: hoja HISTORIAL (se crea si falta)
  let sh = ss.getSheetByName('HISTORIAL');
  if (!sh) { sh = ss.insertSheet('HISTORIAL'); encabezar_(sh, 'Historial de cambios', 'Antes y después de cada cambio hecho desde el portal.', ['FECHA', 'HOJA', 'CODIGO', 'CAMPO', 'VALOR_ANTERIOR', 'VALOR_NUEVO', 'ORIGEN']); }
  if (filas.length) sh.getRange(Math.max(sh.getLastRow(), 5) + 1, 1, filas.length, 7).setValues(filas);
}
function pEstablecimientos_() {
  const sh = pBC_().getSheetByName('ESTABLECIMIENTOS'), H = sh.getRange(5, 1, 1, 17).getValues()[0];
  return { H: H, filas: pTabla_(sh, 17) };
}

// ------------------------------------------------------------------ INICIO: matriz provincial
// Copias guardadas en Drive (SISTEMA HyS › «Datos del portal (no borrar)»): el portal las lee en un segundo
// cuando la memoria temporal está vacía, en lugar de recalcular todo. Las rehacen las tareas automáticas.
function sysCarpeta_() {
  const p = PropertiesService.getScriptProperties(), id = p.getProperty('DATOS_PORTAL');
  if (id) try { return DriveApp.getFolderById(id); } catch (e) {}
  const f = carpeta_(DriveApp.getFolderById('16AIJZcmxG9EBM3-D-J4vRtvruHK9DVrA'), 'Datos del portal (no borrar)'); p.setProperty('DATOS_PORTAL', f.getId()); return f;
}
function sysGuardar_(nombre, obj) {
  try { const d = sysCarpeta_(), it = d.getFilesByName(nombre + '.json'), txt = JSON.stringify(obj);
    if (it.hasNext()) it.next().setContent(txt); else d.createFile(nombre + '.json', txt, 'application/json'); } catch (e) { Logger.log(e); }
}
function sysLeer_(nombre) {
  try { const it = sysCarpeta_().getFilesByName(nombre + '.json'); return it.hasNext() ? JSON.parse(it.next().getBlob().getDataAsString()) : null; } catch (e) { return null; }
}
// Resumen de la matriz (14.22). Lo pesado (personal por establecimiento: 45 hojas y capacitaciones) se guarda aparte y solo se
// recalcula si cambió la BASE DE TRABAJADORES, de noche (actualizarPortal) o con fresco = 'todo'. Residuos y diagnóstico se leen en el
// momento: tarda pocos segundos y queda al día después de cada manifiesto (antes, al borrarse la memoria, volvía la copia de la noche).
function pResumen_(fresco) {
  const cache = CacheService.getScriptCache();
  if (!fresco) { const c = cache.get('p_resumen'); if (c) return JSON.parse(c); }
  const E = pEstablecimientos_(), claves = clavesEstados_();
  const T = pResumenTrab_(fresco === 'todo'), trab = T.trab;
  let diag = {}; try { if (PropertiesService.getScriptProperties().getProperty('DIAG_RES_ID')) diag = pDiagLista_(); } catch (e) {}
  // Residuos: último retiro y retiros (Y1) del mes, desde el libro general
  const g = SpreadsheetApp.openById(CFG.GENERAL), gm = g.getSheetByName('MANIFIESTOS'), n = gm.getLastRow() - 5;
  const porNombre = {}; E.filas.forEach(f => porNombre[limpio_(f.v[1])] = limpio_(f.v[0]));
  const res = {}, hoy = new Date(), mes = Utilities.formatDate(hoy, TZ, 'yyyy-MM');
  if (n > 0) gm.getRange(6, 1, n, 8).getValues().forEach(r => {
    const cod = porNombre[limpio_(r[0])]; if (!cod || !r[3]) return;
    const f = pFecha_(new Date(r[3])), x = res[cod] = res[cod] || { ultimo: '', mes: 0 };
    if (f > x.ultimo) x.ultimo = f;
    if (f.slice(0, 7) === mes && r[7] === 'Y1') x.mes++;
  });
  const filas = E.filas.map(f => {
    const v = f.v, cod = limpio_(v[0]), r = res[cod] || { ultimo: '', mes: 0 }, t = trab[cod] || { total: 0, activos: 0 };
    const dias = r.ultimo ? Math.floor((hoy - new Date(r.ultimo + 'T12:00:00')) / 86400000) : null;
    return { cod: cod, nombre: v[1], tipo: v[3], area: v[4], cabecera: v[5] === 'Sí', servicio: v[13], estado: claves[cod] || v[14], libro: v[15],
      diag: diag[cod] ? { pct: diag[cod].PORCENTAJE, fecha: diag[cod].FECHA, estado: diag[cod].ESTADO, criticos: diag[cod].CRITICOS_NO_CUMPLE } : null,
      trabajadores: t.total, activos: t.activos, capacitados: t.capacitados || 0, ultimoRetiro: r.ultimo, retirosMes: r.mes, diasSinRetiro: dias };
  });
  const out = { ok: true, filas: filas, nc: trab['NC'] || { total: 0 }, sinAsignar: (trab['SIN_ASIGNAR'] || { total: 0 }).total, actualizado: new Date().toISOString(),
    personalAl: T.calculado, enlaces: { baseComun: pBC_().getUrl(), baseTrabajadores: T.url, general: g.getUrl() } };
  try { cache.put('p_resumen', JSON.stringify(out), 21600); } catch (e) {}
  if (fresco === 'todo') sysGuardar_('resumen', out);
  return out;
}
// Personal por establecimiento (lo más pesado: 45 hojas y capacitaciones). Se guarda en la memoria y en Drive; se recalcula de noche
// (actualizarPortal), con fresco = 'todo' o si no hay copia. Los números de personal pueden tener hasta un día de atraso.
function pResumenTrab_(forzar) {
  const cache = CacheService.getScriptCache();
  if (!forzar) {
    let o = null; try { o = JSON.parse(cache.get('p_resumen_trab') || 'null'); } catch (e) {}
    if (o && o.trab) return o;
    o = sysLeer_('resumen_trab'); if (o && o.trab) { try { cache.put('p_resumen_trab', JSON.stringify(o), 21600); } catch (e) {} return o; }
  }
  const capDni = pCapsDnis_(), bt = pBT_(), trab = {};
  bt.getSheets().forEach(sh => {
    const cod = sh.getName(); if (sh.getLastRow() < 6 || ['INICIO', 'TODOS', 'DUPLICADOS', 'IMPORTACIONES', 'HISTORIAL', 'LISTAS'].indexOf(cod) >= 0) return;
    const v = sh.getRange(6, 2, sh.getLastRow() - 5, 19).getValues();
    const act = v.filter(r => r[0] !== '' && (r[18] === 'Activo' || r[18] === ''));
    trab[cod] = { total: v.filter(r => r[0] !== '').length, activos: act.length, capacitados: act.filter(r => capDni[pDni_(r[0])]).length };
  });
  const o = { trab: trab, calculado: new Date().toISOString(), url: bt.getUrl() };
  try { cache.put('p_resumen_trab', JSON.stringify(o), 21600); } catch (e) {}
  sysGuardar_('resumen_trab', o);
  return o;
}
function clavesEstados_() {
  const m = {}; SpreadsheetApp.openById(CFG.CLAVES).getSheets()[0].getDataRange().getValues().slice(1).forEach(r => { if (r[1]) m[limpio_(r[1])] = limpio_(r[4]); });
  return m;
}

// ------------------------------------------------------------------ FICHA DEL ESTABLECIMIENTO
function pInvalidar_(cod) { try { const c = CacheService.getScriptCache(); if (cod) c.remove('p_ficha_' + cod); } catch (e) {} }
function pFicha_(cod) {
  cod = limpio_(cod);
  const cf = CacheService.getScriptCache(), ck = cf.get('p_ficha_' + cod); if (ck) return JSON.parse(ck);
  const out = pFichaCalc_(cod);
  if (out.ok) try { cf.put('p_ficha_' + cod, JSON.stringify(out), 1800); } catch (e) {}
  return out;
}
function pFichaCalc_(cod) {
  const bc = pBC_(), E = pEstablecimientos_(), e = E.filas.find(f => limpio_(f.v[0]) === cod);
  if (!e) return { ok: false, error: 'datos', mensaje: 'Establecimiento no encontrado.' };
  const datos = {}; E.H.forEach((h, i) => datos[h] = e.v[i] instanceof Date ? pFecha_(e.v[i]) : e.v[i]);
  const de = (hoja, n) => pTabla_(bc.getSheetByName(hoja), n).filter(x => limpio_(x.v[0]) === cod).map(x => ({ fila: x.fila, v: x.v.map(c => c instanceof Date ? pFecha_(c) : c) }));
  const comDueno = pComiteDueno_(cod), deCom = (hoja, n) => pTabla_(bc.getSheetByName(hoja), n).filter(x => limpio_(x.v[0]) === comDueno).map(x => ({ fila: x.fila, v: x.v.map(c => c instanceof Date ? pFecha_(c) : c) }));
  const sitios = de('SITIOS', 7), red = de('RED_HYS', 14), comites = deCom('COMITES', 8), integrantes = deCom('INTEGRANTES', 9), contactos = bc.getSheetByName('CONTACTOS') ? de('CONTACTOS', 15) : [];
  // Residuos: últimos manifiestos y certificados del libro general
  const g = SpreadsheetApp.openById(CFG.GENERAL), nombre = limpio_(e.v[1]);
  const gm = g.getSheetByName('MANIFIESTOS'), nm = gm.getLastRow() - 5;
  const man = nm > 0 ? gm.getRange(6, 1, nm, 12).getValues().filter(r => limpio_(r[0]) === nombre && r[3]).map(r => ({ fecha: pFecha_(new Date(r[3])), sitio: r[1], nro: String(r[6]), corriente: r[7], cantidad: r[9], unidad: r[10], origen: r[11] })) : [];
  man.sort((a, b) => b.fecha.localeCompare(a.fecha));
  const gc = g.getSheetByName('CERTIFICADOS'), nc = gc.getLastRow() - 5;
  const cert = nc > 0 ? gc.getRange(6, 1, nc, 7).getValues().filter(r => limpio_(r[0]) === nombre && r[4]).map(r => ({ empresa: r[1], mes: r[2] + '-' + String(r[3]).padStart(2, '0'), nro: String(r[4]), origen: r[6] })) : [];
  // Trabajadores
  const sh = pBT_().getSheetByName(cod);
  let tot = 0, act = 0;
  const capDni = pCapsDnis_(); let cap = 0;
  if (sh && sh.getLastRow() >= 6) sh.getRange(6, 2, sh.getLastRow() - 5, 19).getValues().forEach(r => { if (r[0] !== '') { tot++; if (r[18] === 'Activo' || r[18] === '') { act++; if (capDni[pDni_(r[0])]) cap++; } } });
  return { ok: true, cod: cod, datos: datos, estadoApp: clavesEstados_()[cod] || 's/d', sitios: sitios, red: red, comites: comites, comitesDe: comDueno !== cod ? comDueno : '', integrantes: integrantes, contactos: contactos,
    residuos: { manifiestos: man.slice(0, 15), totalManifiestos: man.length, ultimo: man[0] ? man[0].fecha : '', certificados: cert.slice(-6).reverse() },
    trabajadores: { total: tot, activos: act, capacitados: cap, url: sh ? pBT_().getUrl() + '#gid=' + sh.getSheetId() : '' } };
}

// ------------------------------------------------------------------ TRABAJADORES
// Datos extra de la ficha personal (columnas al final de cada hoja; se crean al guardar si faltan)
//   EDIFICIOS: dónde trabaja dentro de la red Trelew (ej. «HZT y HMH» si está en los dos en simultáneo)
//   OBS_PUESTO: observación de puesto (ej. «Guardias en la UTI del HMH; servicio de base en el HZT»)
const TRAB_EXTRAS = ['EDIFICIOS', 'OBS_PUESTO'];
function pExtrasLeer_(sh, filas) {
  if (!sh || !filas.length || sh.getLastRow() < 6) return;
  const H = sh.getRange(5, 1, 1, sh.getLastColumn()).getValues()[0].map(String), n = sh.getLastRow() - 5;
  TRAB_EXTRAS.forEach(c => { const j = H.indexOf(c); if (j < 0) return; const col = sh.getRange(6, j + 1, n, 1).getDisplayValues();
    filas.forEach(f => { const val = (col[f.fila - 6] || [''])[0]; if (val !== '') (f.extra = f.extra || {})[c] = val; }); });
}
function pExtrasGuardar_(sh, fila, d, anotar, dni, cod) {
  const H = sh.getRange(5, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
  TRAB_EXTRAS.forEach(c => { if (!(c in d)) return; const nuevo = String(d[c] == null ? '' : d[c]).trim();
    let j = H.indexOf(c); if (j < 0) { if (!nuevo) return; j = H.length; sh.getRange(5, j + 1).setValue(c); H.push(c); }
    const antes = sh.getRange(fila, j + 1).getDisplayValue(); if (antes === nuevo) return;
    sh.getRange(fila, j + 1).setValue(nuevo); anotar(dni, cod, c, antes, nuevo); });
}
function pFilasTrab_(sh) {
  if (!sh || sh.getLastRow() < 6) return [];
  const v = sh.getRange(6, 1, sh.getLastRow() - 5, 22).getValues();
  return v.map((r, i) => ({ fila: 6 + i, v: r })).filter(x => x.v[1] !== '');
}
function pTrab_(x) {
  const bt = pBT_(), q = sinTildes_(x.q || ''), cod = limpio_(x.cod || '');
  let filas = [];
  if ((!cod || cod === '*') && q.length < 3) return { ok: true, filas: [], aviso: 'Escribí al menos 3 letras o números para buscar en todos los establecimientos.' };
  if (!cod || cod === '*') {
    // Una sola lectura de la hoja TODOS; después se ubica la fila de cada resultado en su hoja
    const T = bt.getSheetByName('TODOS'), n = T.getLastRow() - 5, v = n > 0 ? T.getRange(6, 1, n, 22).getValues() : [];
    const hits = v.filter(r => r[1] !== '' && sinTildes_([r[0], r[1], r[2], r[3], r[5], r[7]].join(' ')).indexOf(q) >= 0).slice(0, 400);
    const porHoja = {}; hits.forEach(r => (porHoja[r[21]] = porHoja[r[21]] || []).push(r));
    Object.keys(porHoja).forEach(h => {
      const sh = bt.getSheetByName(h); if (!sh) return;
      const bb = sh.getRange(6, 2, Math.max(sh.getLastRow() - 5, 1), 19).getValues();
      porHoja[h].forEach(r => { const i = bb.findIndex(x => String(x[0]) === String(r[1]) && String(x[18]) === String(r[19])); if (i >= 0) filas.push({ hoja: h, fila: 6 + i, v: r.map(c => c instanceof Date ? pFecha_(c) : c) }); });
    });
    filas.sort((a, b) => String(a.v[2]).localeCompare(String(b.v[2])));
    Object.keys(porHoja).forEach(h => pExtrasLeer_(bt.getSheetByName(h), filas.filter(f => f.hoja === h)));
    return { ok: true, cols: TRAB_COLS, filas: filas, total: hits.length };
  }
  [cod].forEach(h => pFilasTrab_(bt.getSheetByName(h)).forEach(f => {
    const texto = sinTildes_([f.v[0], f.v[1], f.v[2], f.v[3], f.v[5], f.v[7]].join(' '));
    if (!q || texto.indexOf(q) >= 0) filas.push({ hoja: h, fila: f.fila, v: f.v.map(c => c instanceof Date ? pFecha_(c) : c) });
  }));
  filas.sort((a, b) => String(a.v[2]).localeCompare(String(b.v[2])));
  const muestra = filas.slice(0, 400); pExtrasLeer_(bt.getSheetByName(cod), muestra);
  return { ok: true, cols: TRAB_COLS, filas: muestra, total: filas.length };
}
// Buscador general del panel: personas (por DNI, apellido o nombre, en todos los establecimientos) y siniestros (por N.º CH, DNI o apellido)
function pBuscar_(q) {
  q = String(q || '').trim(); if (q.length < 3) return { ok: true, personas: [], siniestros: [], aviso: 'Escribí al menos 3 letras o números.' };
  let personas = [], siniestros = [];
  try { const r = pTrab_({ cod: '*', q: q }); personas = (r.filas || []).slice(0, 25); } catch (e) {}
  try { const t = sinTildes_(q), d = q.replace(/\D/g, ''), r = typeof accPortalLista_ === 'function' ? accPortalLista_() : { lista: [] };
    siniestros = (r.lista || []).filter(s => sinTildes_(s.nombre + ' ' + s.nro).indexOf(t) >= 0 || (d.length >= 5 && s.dni.indexOf(d) >= 0)).slice(0, 25); } catch (e) {}
  return { ok: true, personas: personas, siniestros: siniestros, cols: TRAB_COLS };
}
function pCuilOk_(cuil, dni) {
  const c = String(cuil || '').replace(/\D/g, ''); if (!c) return '';
  if (c.length !== 11) return 'El CUIL tiene que tener 11 números.';
  const m = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2]; let s = 0; for (let i = 0; i < 10; i++) s += Number(c[i]) * m[i];
  let dv = 11 - (s % 11); if (dv === 11) dv = 0; if (dv === 10) dv = 9;
  if (dv !== Number(c[10])) return 'El CUIL no es válido (dígito verificador). Revisalo.';
  if (dni && c.slice(2, 10).replace(/^0+/, '') !== String(dni).replace(/^0+/, '')) return 'El CUIL no coincide con el DNI.';
  return '';
}
function pTrabGuardar_(x) {
  const bt = pBT_(), hoy = new Date(), cod = limpio_(x.cod), sh = bt.getSheetByName(cod);
  if (!sh) return { ok: false, mensaje: 'Establecimiento no encontrado en la base de trabajadores.' };
  const hist = bt.getSheetByName('HISTORIAL'), log = [];
  const anotar = (dni, est, campo, antes, despues) => log.push([hoy, dni, est, campo, antes, despues, 'Portal']);
  const ultimaFila = s => { const f = pFilasTrab_(s); return f.length ? f[f.length - 1].fila : 5; };

  if (x.accion === 'baja' || x.accion === 'traslado') {
    const v = sh.getRange(x.fila, 1, 1, 21).getValues()[0], dni = v[1];
    if (x.accion === 'baja') { sh.getRange(x.fila, 20).setValue('Baja'); anotar(dni, cod, 'ESTADO', v[19], 'Baja'); }
    else {
      const dest = bt.getSheetByName(limpio_(x.destino)); if (!dest || limpio_(x.destino) === cod) return { ok: false, mensaje: 'Elegí el establecimiento de destino.' };
      const nueva = v.slice(); nueva[19] = 'Activo'; nueva[20] = hoy; nueva[15] = limpio_(v[15]) + ' | Traslado desde ' + cod;
      dest.getRange(ultimaFila(dest) + 1, 1, 1, 21).setValues([nueva]);
      sh.getRange(x.fila, 20).setValue('Traslado a ' + limpio_(x.destino));
      anotar(dni, cod, 'ESTADO', v[19], 'Traslado a ' + limpio_(x.destino)); anotar(dni, limpio_(x.destino), 'ALTA', '', 'Traslado desde ' + cod); pInvalidar_(limpio_(x.destino));
    }
    if (log.length) hist.getRange(Math.max(hist.getLastRow(), 5) + 1, 1, log.length, 7).setValues(log);
    pInvalidar_(x && x.cod);
    return { ok: true };
  }

  // Alta o edición
  const d = x.datos || {}, dni = String(d.DNI || '').replace(/\D/g, '');
  if (!/^\d{7,8}$/.test(dni)) return { ok: false, mensaje: 'El DNI tiene que tener 7 u 8 números.' };
  const eCuil = pCuilOk_(d.CUIL, dni); if (eCuil) return { ok: false, mensaje: eCuil };
  if (!limpio_(d.APELLIDOS) || !limpio_(d.NOMBRES)) return { ok: false, mensaje: 'Faltan apellido o nombre.' };
  // El mismo DNI en otra fila (de cualquier establecimiento)
  const todos = bt.getSheets().map(s => s.getName()).filter(n => ['INICIO', 'TODOS', 'DUPLICADOS', 'IMPORTACIONES', 'HISTORIAL', 'LISTAS'].indexOf(n) < 0);
  for (const h of todos) {
    const r = pFilasTrab_(bt.getSheetByName(h)).find(f => String(f.v[1]).replace(/\D/g, '') === dni && !(h === cod && f.fila === x.fila) && !/^(Baja|Traslado)/.test(String(f.v[19])));
    if (r) return { ok: false, mensaje: 'Ese DNI ya está cargado en ' + h + ' (fila ' + r.fila + '). Si cambió de establecimiento, usá «Traslado».' };
  }
  const campos = TRAB_COLS.slice(0, 19), cuil = String(d.CUIL || '').replace(/\D/g, '');
  const nuevo = campos.map(c => c === 'DNI' ? dni : c === 'CUIL' ? (cuil ? cuil.slice(0, 2) + '-' + cuil.slice(2, 10) + '-' + cuil.slice(10) : '') : (d[c] == null ? '' : String(d[c]).trim()));
  let filaG = x.fila;
  if (x.fila) {
    const viejo = sh.getRange(x.fila, 1, 1, 19).getDisplayValues()[0];
    nuevo.forEach((val, i) => { if (String(val) !== String(viejo[i])) anotar(dni, cod, campos[i], viejo[i], val); });
    if (d.EMAIL && d.EMAIL !== viejo[11]) nuevo[12] = Utilities.formatDate(hoy, TZ, 'dd/MM/yyyy');
    sh.getRange(x.fila, 1, 1, 19).setValues([nuevo]);
    if (d.ESTADO) { const e0 = sh.getRange(x.fila, 20).getValue(); if (d.ESTADO !== e0) { sh.getRange(x.fila, 20).setValue(d.ESTADO); anotar(dni, cod, 'ESTADO', e0, d.ESTADO); } }
  } else {
    nuevo[15] = (nuevo[15] ? nuevo[15] + ' | ' : '') + 'Portal';
    const f = ultimaFila(sh) + 1; filaG = f;
    sh.getRange(f, 1, 1, 21).setValues([nuevo.concat([d.ESTADO || 'Activo', hoy])]);
    anotar(dni, cod, 'ALTA', '', limpio_(d.APELLIDOS) + ', ' + limpio_(d.NOMBRES));
  }
  pExtrasGuardar_(sh, filaG, d, anotar, dni, cod);
  if (log.length) hist.getRange(Math.max(hist.getLastRow(), 5) + 1, 1, log.length, 7).setValues(log);
  pInvalidar_(x && x.cod);
  let comite = ''; try { comite = pComiteDesdePersona_(cod, d, dni); } catch (e) { comite = 'No se pudo actualizar el comité: ' + e.message; }
  return { ok: true, cambios: log.length, comite: comite };
}

// ------------------------------------------------------------------ COMITÉS COMPARTIDOS Y CAMINO PERSONA → COMITÉ
// ESTABLECIMIENTOS › COMITES_COMPARTIDOS: si un establecimiento dice otro código (HMH → HZT), usa los comités de ese (un mismo hospital).
function pComitesCompartidos_() {
  const sh = pBC_().getSheetByName('ESTABLECIMIENTOS'), H = sh.getRange(5, 1, 1, sh.getLastColumn()).getValues()[0].map(String), j = H.indexOf('COMITES_COMPARTIDOS'), m = {};
  if (j < 0) return m;
  pTabla_(sh, H.length).forEach(r => { const v = limpio_(r.v[j]); if (v && !/^s\/d/i.test(v)) m[limpio_(r.v[0])] = v; });
  return m;
}
function pComiteDueno_(cod) { const m = pComitesCompartidos_(); return m[cod] && m[cod] !== cod ? m[cod] : cod; }
function pComiteGrupo_(dueno) { const m = pComitesCompartidos_(); return [dueno].concat(Object.keys(m).filter(k => m[k] === dueno)); }

// Si al guardar a una persona su cargo menciona un comité (ej. «A/C Comité de Infecciones»), completa ese comité en COMITES:
// responsable si estaba en «s/d», y correo o teléfono que falten. Si ya hay otro responsable, no lo pisa: avisa.
function pComiteDesdePersona_(cod, d, dni) {
  const cargo = String(d.CARGO_CONDUCCION || ''); if (!/comit/i.test(sinTildes_(cargo))) return '';
  const dueno = pComiteDueno_(cod), bc = pBC_(), sh = bc.getSheetByName('COMITES');
  const nucleo = s => sinTildes_(String(s || '')).toLowerCase().replace(/comites?/g, ' ').replace(/\b(de|del|la|el|los|las|y|e|para|a\/c|a cargo|ac)\b/g, ' ').split(/[^a-z0-9]+/).filter(w => w.length > 2);
  const txt = nucleo(cargo), f = pTabla_(sh, 8).filter(r => limpio_(r.v[0]) === dueno).find(r => { const n = nucleo(r.v[1]); return n.length && n.every(w => txt.indexOf(w) >= 0); });
  if (!f) return 'El cargo menciona un comité que no está en la lista de ' + dueno + ': agregalo en la ficha (Comités) para vincularlo.';
  if (!/(^|\W)(a\/?c|a cargo|respons|coordin|presid|jef|titular)/i.test(sinTildes_(cargo))) return '';   // integrante: no cambia el responsable
  const vacio = v => !limpio_(v) || /^s\/d/i.test(limpio_(v)), nombre = (limpio_(d.NOMBRES) + ' ' + limpio_(d.APELLIDOS)).trim(), actual = limpio_(f.v[2]);
  const tok = s => persTokens_(s).map(w => w.toLowerCase());
  if (!vacio(actual)) { const a = tok(actual), n = tok(nombre); if (!(a.length && (a.every(w => n.indexOf(w) >= 0) || n.every(w => a.indexOf(w) >= 0))))
    return f.v[1] + ' de ' + dueno + ' ya tiene como responsable a ' + actual + '. Si cambió, editalo en la ficha del establecimiento › Comités.'; }
  const hoy = new Date(), log = [], poner = (col, val) => { val = limpio_(val); if (!val || /^s\/d/i.test(val) || !vacio(f.v[col])) return;
    sh.getRange(f.fila, col + 1).setValue(val); log.push([hoy, 'COMITES', dueno, P_COM_COLS[col], f.v[col], val, 'Portal (trabajador)']); };
  poner(2, nombre); poner(3, d.EMAIL); poner(4, d.TELEFONO);
  if (log.length) { pHistorial_(bc, log); pComiteGrupo_(dueno).forEach(c => pInvalidar_(c)); }
  try { persVincular_(cod, 'comite', { RESPONSABLE: nombre, DNI: dni, COMITE_O_AREA: f.v[1] }); } catch (e) {}   // suma el comité a la ficha de la persona
  return log.length ? f.v[1] + ' de ' + dueno + ' actualizado con estos datos.' : '';
}

// ------------------------------------------------------------------ EDICIÓN DE LA FICHA (BASE COMÚN)
const P_EST_EDITABLES = ['LOCALIDAD', 'DIRECCION', 'TELEFONOS', 'CODIGO_SISA', 'DIRECTOR', 'EMPRESA_RESIDUOS', 'SERVICIO_HYS'];
const P_RED_COLS = ['CODIGO', 'APELLIDO_Y_NOMBRE', 'CUIL', 'DNI', 'ROL', 'TITULO_O_MATRICULA', 'CORREO', 'TELEFONO', 'HORAS_SEMANALES', 'DESDE', 'BLOQUES_QUE_REPORTA', 'FRECUENCIA', 'ESTADO', 'OBSERVACIONES'];
const P_COM_COLS = ['CODIGO', 'COMITE_O_AREA', 'RESPONSABLE', 'CORREO', 'TELEFONO', 'FRECUENCIA_REUNIONES', 'ULTIMA_REUNION', 'OBSERVACIONES'];
const P_CON_COLS = ['CODIGO', 'TIPO', 'UNIDAD', 'CARGO', 'RESPONSABLE', 'DNI', 'TELEFONO_FIJO', 'INTERNO', 'CELULAR', 'CORREO_INSTITUCIONAL', 'CORREO_PERSONAL', 'HORARIO', 'FUENTE', 'ACTUALIZADO', 'OBSERVACIONES'];
function pFichaGuardar_(x) {
  const bc = pBC_(), cod = limpio_(x.cod), d = x.datos || {}, hoy = new Date(), log = [];
  if (x.tipo === 'est') {
    const sh = bc.getSheetByName('ESTABLECIMIENTOS'), H = sh.getRange(5, 1, 1, 17).getValues()[0];
    const f = pTabla_(sh, 1).find(r => limpio_(r.v[0]) === cod); if (!f) return { ok: false, mensaje: 'Establecimiento no encontrado.' };
    P_EST_EDITABLES.forEach(c => {
      if (!(c in d)) return; const col = H.indexOf(c) + 1, antes = sh.getRange(f.fila, col).getDisplayValue(), nuevo = limpio_(d[c]) || 's/d';
      if (antes !== nuevo) { sh.getRange(f.fila, col).setValue(nuevo); log.push([hoy, 'ESTABLECIMIENTOS', cod, c, antes, nuevo, 'Portal']); }
    });
  } else if (x.tipo === 'red' || x.tipo === 'comite' || x.tipo === 'contacto') {
    const hoja = { red: 'RED_HYS', comite: 'COMITES', contacto: 'CONTACTOS' }[x.tipo], cols = { red: P_RED_COLS, comite: P_COM_COLS, contacto: P_CON_COLS }[x.tipo], sh = bc.getSheetByName(hoja);
    if (x.tipo === 'contacto') { d.ACTUALIZADO = Utilities.formatDate(new Date(), TZ, 'dd/MM/yyyy'); if (!d.FUENTE) d.FUENTE = 'Portal'; }
    const codFila = x.tipo === 'comite' ? pComiteDueno_(cod) : cod;   // comités compartidos (HMH → HZT): se guardan en la fila del dueño
    const fila = cols.map(c => c === 'CODIGO' ? codFila : (d[c] == null ? '' : String(d[c]).trim()));
    if (x.tipo === 'red' && !fila[1]) return { ok: false, mensaje: 'Falta el nombre.' };
    if (x.tipo === 'contacto' && !fila[2] && !fila[4]) return { ok: false, mensaje: 'Completá al menos la unidad o el responsable.' };
    if (x.fila) {
      if (limpio_(sh.getRange(x.fila, 1).getValue()) !== codFila) return { ok: false, mensaje: 'La fila no corresponde a este establecimiento. Volvé a abrir la ficha.' };
      const antes = sh.getRange(x.fila, 1, 1, cols.length).getDisplayValues()[0];
      fila.forEach((v, i) => { if (String(v) !== String(antes[i])) log.push([hoy, hoja, cod, cols[i], antes[i], v, 'Portal']); });
      sh.getRange(x.fila, 1, 1, cols.length).setValues([fila]);
    } else {
      const n = pTabla_(sh, 1).reduce((m, r) => Math.max(m, r.fila), 5) + 1;
      sh.getRange(n, 1, 1, cols.length).setValues([fila]);
      log.push([hoy, hoja, cod, 'ALTA', '', fila[1], 'Portal']);
    }
  } else return { ok: false, mensaje: 'Tipo de cambio desconocido.' };
  pHistorial_(bc, log);
  pInvalidar_(x && x.cod); if (x.tipo === 'comite') pComiteGrupo_(pComiteDueno_(cod)).forEach(c => pInvalidar_(c));
  // Las personas viven en la base de trabajadores: el responsable cargado se vincula con su ficha (rol, correo y teléfono)
  let vinc = null; if (x.tipo === 'comite' || x.tipo === 'contacto') { try { vinc = persVincular_(cod, x.tipo, d); } catch (e) { vinc = { aviso: 'No se pudo vincular con la base de personal: ' + e.message }; } }
  return { ok: true, cambios: log.length, vinculo: vinc };
}

// ------------------------------------------------------------------ IMPORTACIÓN DE BASES DE PERSONAL
// Compara por DNI. Primero se pide la vista previa (no escribe nada); después se aplica con las opciones elegidas.
// Nunca borra: quien no figura en la base nueva queda con ESTADO «No figura en la última base».
const P_IMP_CAMPOS = ['CUIL', 'APELLIDOS', 'NOMBRES', 'SITIO', 'FUNCION', 'SERVICIO', 'VINCULO', 'EMPRESA', 'CARGO_CONDUCCION', 'EMAIL', 'TELEFONO'];
const pCol_ = c => TRAB_COLS.indexOf(c);
const pDni_ = v => String(v == null ? '' : v).replace(/\.0+$/, '').replace(/\D/g, '').replace(/^0+/, '');
const pCuilFmt_ = c => { c = String(c || '').replace(/\D/g, ''); return c.length === 11 ? c.slice(0, 2) + '-' + c.slice(2, 10) + '-' + c.slice(10) : ''; };
const pTitulo_ = s => limpio_(s).toLowerCase().replace(/(^|[\s'-])([a-záéíóúñü])/g, (m, a, b) => a + b.toUpperCase());
const P_SIGLAS = ['UMU', 'UTI', 'PROSATE', 'RRHH', 'CAPS', 'CESIA', 'HZT', 'HMH', 'SAMU'];
// Texto todo en mayúsculas → «Tipo título», respetando siglas. Si ya viene mezclado, se deja como está.
const pTexto_ = s => { s = limpio_(s).replace(/\s+/g, ' '); if (!s || s !== s.toUpperCase()) return s;
  return s.split(' ').map((w, i) => P_SIGLAS.indexOf(w) >= 0 ? w : (i > 0 && ['DE', 'DEL', 'Y', 'LA', 'LOS', 'E'].indexOf(w) >= 0 ? w.toLowerCase() : pTitulo_(w))).join(' '); };
function pImportar_(x, aplicar) {
  const bt = pBT_(), bc = pBC_(), hoy = new Date(), origen = limpio_(x.origen) || 'Base importada';
  const eqv = {}; pTabla_(bc.getSheetByName('EQUIVALENCIAS'), 3).forEach(r => { if (r.v[0] && r.v[1]) eqv[sinTildes_(r.v[0])] = limpio_(r.v[1]); });
  pTabla_(bc.getSheetByName('ESTABLECIMIENTOS'), 2).forEach(r => { eqv[sinTildes_(r.v[0])] = limpio_(r.v[0]); eqv[sinTildes_(r.v[1])] = limpio_(r.v[0]); });
  eqv[sinTildes_('SIN_ASIGNAR')] = 'SIN_ASIGNAR'; eqv[sinTildes_('NC')] = 'NC'; eqv[sinTildes_('Nivel central')] = 'NC';
  const hojas = bt.getSheets().map(s => s.getName()).filter(n => BT_SISTEMA.indexOf(n) < 0);
  const datos = {}, idx = {};
  hojas.forEach(h => { const sh = bt.getSheetByName(h), n = sh.getLastRow() - 5; datos[h] = { sh: sh, v: n > 0 ? sh.getRange(6, 1, n, 20).getValues() : [] };
    datos[h].v.forEach((r, i) => { const d = pDni_(r[1]); if (d) (idx[d] = idx[d] || []).push({ hoja: h, i: i, fila: 6 + i }); }); });
  const R = { altas: [], cambios: [], iguales: 0, reaparecen: [], mover: [], conflictos: [], errores: [], noFiguran: [] };
  const vistos = {}, tocados = {}, aplicarA = [];
  const igual = (c, a, b) => c === 'CUIL' ? String(a).replace(/\D/g, '') === String(b).replace(/\D/g, '') : sinTildes_(a) === sinTildes_(b);
  (x.filas || []).forEach((r, k) => {
    const n = k + 1, dni = pDni_(r.DNI), nom = limpio_(r.APELLIDOS) + ', ' + limpio_(r.NOMBRES);
    if (!/^\d{7,8}$/.test(dni)) return R.errores.push({ n: n, nombre: nom, motivo: 'DNI vacío o inválido: «' + limpio_(r.DNI) + '»' });
    if (vistos[dni]) return R.errores.push({ n: n, nombre: nom, motivo: 'DNI repetido en el archivo (se toma la primera fila)' });
    vistos[dni] = 1;
    if (r.CUIL) { const e = pCuilOk_(r.CUIL, dni); if (e) { R.errores.push({ n: n, nombre: nom, motivo: e + ' Se importa sin CUIL.' }); r.CUIL = ''; } }
    let cod = x.cod;
    if (cod === '*COL') { cod = eqv[sinTildes_(r.ESTABLECIMIENTO)]; if (!cod || !datos[cod]) { delete vistos[dni]; return R.errores.push({ n: n, nombre: nom, motivo: 'Establecimiento no reconocido: «' + limpio_(r.ESTABLECIMIENTO) + '»' }); } }
    if (!datos[cod]) return R.errores.push({ n: n, nombre: nom, motivo: 'Establecimiento sin hoja: ' + cod });
    tocados[cod] = 1;
    const vivos = (idx[dni] || []).filter(e => !/^(Baja|Traslado)/.test(String(datos[e.hoja].v[e.i][19])));
    const aca = vivos.find(e => e.hoja === cod);
    if (aca) {
      const v = datos[cod].v[aca.i], dif = [];
      // Apellido y nombre que venían juntos: si la persona completa coincide, se respeta cómo está separado en la base
      // (salvo que el apellido guardado sea solo una partícula, como «De»).
      // Si el nombre vino junto (sin separar), se conserva el que ya está en la base (los listados suelen cortarlo).
      // Excepción: el apellido guardado es solo una partícula («De», «Della»…) y el nombre completo coincide.
      const particula = /^(de|del|della|do|di|da|dos|van|von|la|las|los|san)$/i.test(limpio_(v[2])) && sinTildes_(r.APELLIDOS + ' ' + r.NOMBRES) === sinTildes_(v[2] + ' ' + v[3]);
      const juntoIgual = r._junto && limpio_(v[2]) !== '' && !particula;
      P_IMP_CAMPOS.forEach(c => { if (juntoIgual && (c === 'APELLIDOS' || c === 'NOMBRES')) return;
        const nuevo = limpio_(r[c]); if (nuevo && !igual(c, nuevo, v[pCol_(c)])) dif.push({ campo: c, antes: String(v[pCol_(c)] || ''), despues: c === 'CUIL' ? pCuilFmt_(nuevo) : (c === 'APELLIDOS' || c === 'NOMBRES') ? pTitulo_(nuevo) : c === 'EMAIL' ? nuevo.toLowerCase() : pTexto_(nuevo) }); });
      if (x.ntear && v[14] !== 'Sí') dif.push({ campo: 'EN_NTEAR', antes: String(v[14] || ''), despues: 'Sí' });
      if (dif.length) R.cambios.push({ hoja: cod, fila: aca.fila, i: aca.i, dni: dni, nombre: v[2] + ', ' + v[3], dif: dif }); else R.iguales++;
      if (/^No figura/.test(String(v[19])) || /^Revisar/.test(String(v[19]))) R.reaparecen.push({ hoja: cod, i: aca.i, fila: aca.fila, dni: dni, nombre: v[2] + ', ' + v[3], antes: v[19] });
      aplicarA.push({ hoja: cod, i: aca.i });
    } else {
      const otro = vivos[0];
      if (otro && otro.hoja === 'SIN_ASIGNAR') R.mover.push({ dni: dni, nombre: nom, hacia: cod, i: otro.i, r: r });
      else if (otro) R.conflictos.push({ dni: dni, nombre: nom, en: otro.hoja, archivo: cod });
      else R.altas.push({ dni: dni, nombre: nom, hacia: cod, r: r });
    }
  });
  Object.keys(tocados).forEach(cod => datos[cod].v.forEach((v, i) => {
    const d = pDni_(v[1]); if (!d || vistos[d] || /^(Baja|Traslado|No figura)/.test(String(v[19]))) return;
    R.noFiguran.push({ hoja: cod, i: i, fila: 6 + i, dni: d, nombre: v[2] + ', ' + v[3], funcion: v[5] });
  }));
  const resumen = { ok: true, altas: R.altas.length, cambios: R.cambios.length, iguales: R.iguales, reaparecen: R.reaparecen.length, mover: R.mover.length, conflictos: R.conflictos.length, errores: R.errores.length, noFiguran: R.noFiguran.length, establecimientos: Object.keys(tocados) };
  if (!aplicar) {
    const corto = a => a.slice(0, 300).map(o => { const c = Object.assign({}, o); delete c.r; delete c.i; return c; });
    return Object.assign(resumen, { detalle: { altas: corto(R.altas), cambios: corto(R.cambios), reaparecen: corto(R.reaparecen), mover: corto(R.mover), conflictos: corto(R.conflictos), errores: corto(R.errores), noFiguran: corto(R.noFiguran) } });
  }
  // ---- Aplicar
  const op = x.opciones || {}, hist = [], porHoja = {}, cambiadas = {};
  const marca = (h, i) => { cambiadas[h] = cambiadas[h] || {}; cambiadas[h][i] = 1; };
  const fuente = (h, i) => { const v = datos[h].v[i]; if (String(v[15]).indexOf(origen) < 0) { v[15] = (v[15] ? v[15] + ' | ' : '') + origen; marca(h, i); } };
  if (op.cambios !== false) R.cambios.forEach(c => { const v = datos[c.hoja].v[c.i];
    c.dif.forEach(d => { v[pCol_(d.campo)] = d.despues; if (d.campo === 'EMAIL') v[pCol_('EMAIL_FECHA')] = Utilities.formatDate(hoy, TZ, 'dd/MM/yyyy'); hist.push([hoy, c.dni, c.hoja, d.campo, d.antes, d.despues, 'Importación: ' + origen]); });
    marca(c.hoja, c.i); });
  aplicarA.forEach(a => fuente(a.hoja, a.i));
  if (op.reaparecen !== false) R.reaparecen.forEach(c => { datos[c.hoja].v[c.i][19] = 'Activo'; marca(c.hoja, c.i); hist.push([hoy, c.dni, c.hoja, 'ESTADO', c.antes, 'Activo', 'Importación: ' + origen]); });
  if (op.noFiguran !== false) R.noFiguran.forEach(c => { datos[c.hoja].v[c.i][19] = 'No figura en la última base'; marca(c.hoja, c.i); hist.push([hoy, c.dni, c.hoja, 'ESTADO', 'Activo', 'No figura en la última base', 'Importación: ' + origen]); });
  // Reescribe solo las filas cambiadas (columnas A a T)
  Object.keys(cambiadas).forEach(h => {
    const ii = Object.keys(cambiadas[h]);
    if (ii.length > 25) datos[h].sh.getRange(6, 1, datos[h].v.length, 20).setValues(datos[h].v);   // muchas filas: se escribe la hoja de una vez
    else ii.forEach(i => datos[h].sh.getRange(6 + Number(i), 1, 1, 20).setValues([datos[h].v[i]]));
  });
  // Altas y personas que salen de SIN_ASIGNAR
  const nueva = (r, previa) => {
    const p = previa ? previa.slice(0, 20) : new Array(20).fill('');
    const val = (c, def) => limpio_(r[c]) || def;
    p[0] = pCuilFmt_(r.CUIL) || p[0]; p[1] = pDni_(r.DNI); p[2] = r.APELLIDOS ? pTitulo_(r.APELLIDOS) : p[2]; p[3] = r.NOMBRES ? pTitulo_(r.NOMBRES) : p[3];
    ['SITIO', 'FUNCION', 'SERVICIO', 'VINCULO', 'EMPRESA', 'CARGO_CONDUCCION', 'EMAIL', 'TELEFONO'].forEach(c => p[pCol_(c)] = c === 'EMAIL' ? val(c, p[pCol_(c)]).toLowerCase() : pTexto_(val(c, p[pCol_(c)])));
    if (r.EMAIL) p[12] = Utilities.formatDate(hoy, TZ, 'dd/MM/yyyy');
    if (x.ntear) p[14] = 'Sí';
    p[15] = (p[15] ? p[15] + ' | ' : '') + origen; p[19] = 'Activo';
    p[17] = limpio_(r.MOTIVO) ? 'Sí' : ''; p[18] = limpio_(r.MOTIVO);
    return p.concat([hoy]);
  };
  const agregar = (h, fila) => { (porHoja[h] = porHoja[h] || []).push(fila); };
  if (op.altas !== false) R.altas.forEach(a => { agregar(a.hacia, nueva(a.r)); hist.push([hoy, a.dni, a.hacia, 'ALTA', '', a.nombre, 'Importación: ' + origen]); });
  const borrarSA = [];
  if (op.mover !== false) R.mover.forEach(m => { agregar(m.hacia, nueva(m.r, datos.SIN_ASIGNAR.v[m.i])); borrarSA.push(6 + m.i); hist.push([hoy, m.dni, m.hacia, 'ALTA', 'SIN_ASIGNAR', m.nombre, 'Importación: ' + origen]); });
  Object.keys(porHoja).forEach(h => { const filas = pFilasTrab_(datos[h].sh), ult = filas.length ? filas[filas.length - 1].fila : 5; datos[h].sh.getRange(ult + 1, 1, porHoja[h].length, 21).setValues(porHoja[h]); });
  borrarSA.sort((a, b) => b - a).forEach(f => datos.SIN_ASIGNAR.sh.deleteRow(f));
  const H = bt.getSheetByName('HISTORIAL'); if (hist.length) H.getRange(Math.max(H.getLastRow(), 5) + 1, 1, hist.length, 7).setValues(hist);
  const I = bt.getSheetByName('IMPORTACIONES'), log = Object.keys(tocados).map(cod => [hoy, origen, cod,
    (op.altas !== false ? R.altas.filter(a => a.hacia === cod).length : 0) + (op.mover !== false ? R.mover.filter(a => a.hacia === cod).length : 0), op.cambios !== false ? R.cambios.filter(a => a.hoja === cod).length : 0, op.noFiguran !== false ? R.noFiguran.filter(a => a.hoja === cod).length : 0,
    (R.conflictos.filter(a => a.archivo === cod).length ? R.conflictos.filter(a => a.archivo === cod).length + ' en otro establecimiento (sin cambios). ' : '') + (R.errores.length ? R.errores.length + ' fila(s) con error en el archivo.' : '')]);
  if (log.length) I.getRange(Math.max(I.getLastRow(), 5) + 1, 1, log.length, 7).setValues(log);
  Object.keys(tocados).forEach(c => pInvalidar_(c));
  return Object.assign(resumen, { aplicado: true });
}

// ------------------------------------------------------------------ CAPACITACIONES (solo lectura de BASE_PERSONAS_CAPACITACIONES_2026)
// Fuentes: REGISTROS (evaluaciones en línea) e HISTORICO_2026_LIBRO (registros cargados, presenciales).
function pCapsLeer_() {
  const ss = SpreadsheetApp.openById(BASES.CAPACITACIONES), out = [];
  const R = ss.getSheetByName('REGISTROS');
  if (R && R.getLastRow() > 1) R.getRange(2, 1, R.getLastRow() - 1, 25).getValues().forEach(r => {
    if (!r[2] || String(r[24]).toLowerCase() === 'sí' || String(r[24]).toLowerCase() === 'si') return;
    out.push({ dni: pDni_(r[2]), fecha: r[1] instanceof Date ? pFecha_(r[1]) : String(r[1]).split(' ')[0], tema: limpio_(r[6]), tipo: limpio_(r[8]), aprobo: limpio_(r[13]), nota: String(r[12] || ''), cert: limpio_(r[14]), link: limpio_(r[15]), vence: r[17] instanceof Date ? pFecha_(r[17]) : String(r[17] || '').split(' ')[0], fuente: 'En línea' });
  });
  const H = ss.getSheetByName('HISTORICO_2026_LIBRO');
  if (H && H.getLastRow() > 5) H.getRange(6, 1, H.getLastRow() - 5, 15).getValues().forEach(r => {
    if (!r[3] || !r[2]) return;
    out.push({ dni: pDni_(r[3]), fecha: r[1] instanceof Date ? pFecha_(r[1]) : String(r[1]), tema: limpio_(r[2]), tipo: limpio_(r[10]), aprobo: limpio_(r[11]), nota: '', cert: '', link: limpio_(r[12]).indexOf('http') === 0 ? limpio_(r[12]) : '', vence: r[13] instanceof Date ? pFecha_(r[13]) : String(r[13] || ''), estado: limpio_(r[14]), fuente: 'Registro' });
  });
  return out;
}
function pCapsDnis_() {
  const c = CacheService.getScriptCache(), k = c.get('caps_dnis'); if (k) return JSON.parse(k);
  const m = {}; pCapsLeer_().forEach(x => { if (x.dni) m[x.dni] = (m[x.dni] || 0) + 1; });
  try { c.put('caps_dnis', JSON.stringify(m), 21600); } catch (e) {}
  return m;
}
function pCapsDe_(dni) {
  const d = pDni_(dni); if (!d) return [];
  if (!pCapsDnis_()[d]) return [];   // sin registros: respuesta inmediata
  const c = CacheService.getScriptCache(), k = c.get('caps_' + d); if (k) return JSON.parse(k);
  const out = pCapsLeer_().filter(x => x.dni === d).sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));
  try { c.put('caps_' + d, JSON.stringify(out), 1800); } catch (e) {}
  return out;
}

// ------------------------------------------------------------------ MANTENIMIENTO AUTOMÁTICO (velocidad)
// Una vez por día, de madrugada, deja calculados la matriz, el tablero de control y el del diagnóstico.
// Lo calculado queda guardado en Drive («Datos del portal (no borrar)»), así el portal abre rápido todo el día.
// Tres tareas separadas para que ninguna pase el límite de 6 minutos:
//   04 h  actualizarPortal              resumen del portal (matriz provincial)
//   05 h  actualizarTableroControl      tablero de control de residuos
//   06 h  actualizarTableroDiagnostico  tablero del diagnóstico de residuos
// Para ver datos nuevos durante el día: menú Sistema HyS › Bases y libros › Actualizar ahora…, o «Actualizar» en el portal.
function actualizarPortal() {   // resumen de la matriz (lo más pesado)
  const c = CacheService.getScriptCache(); c.remove('caps_dnis');
  pCapsDnis_(); pResumen_('todo');
}
function actualizarTableroControl() {   // tablero de control
  try { tbTablero_(true); } catch (e) { Logger.log(e); }
}
function actualizarTableroDiagnostico() {
  try { if (PropertiesService.getScriptProperties().getProperty('DIAG_RES_ID')) generarTableroDiagnostico(); } catch (e) { Logger.log(e); }
}
// Instala (o reinstala) las tres tareas diarias. Borra antes las tareas viejas de estas funciones (las de cada 30 min / 1 h / 2 h).
function instalarActualizacionPortal() {
  const nombres = ['actualizarPortal', 'actualizarTableroDiagnostico', 'actualizarTableroControl'];
  let borradas = 0;
  ScriptApp.getProjectTriggers().filter(t => nombres.indexOf(t.getHandlerFunction()) >= 0).forEach(t => { ScriptApp.deleteTrigger(t); borradas++; });
  ScriptApp.newTrigger('actualizarPortal').timeBased().everyDays(1).atHour(4).create();
  ScriptApp.newTrigger('actualizarTableroControl').timeBased().everyDays(1).atHour(5).create();
  ScriptApp.newTrigger('actualizarTableroDiagnostico').timeBased().everyDays(1).atHour(6).create();
  const quedan = ScriptApp.getProjectTriggers().map(t => t.getHandlerFunction());
  Logger.log('Listo. Tareas viejas borradas: ' + borradas + '. Ahora corren una vez por día: matriz 4 h, tablero de control 5 h, tablero del diagnóstico 6 h. ' +
    'Tareas activas en este proyecto: ' + quedan.join(', ') + '. Versión ' + VERSION_SISTEMA + '.');
}
// Botones del menú para ver datos nuevos sin esperar a la madrugada.
function actualizarAhoraPortalYTablero() {
  const t0 = Date.now(); actualizarPortal(); actualizarTableroControl();
  try { SpreadsheetApp.getActive().toast('Portal y tablero de control actualizados (' + Math.round((Date.now() - t0) / 1000) + ' s).', 'Sistema HyS', 6); } catch (e) {}
}
function actualizarAhoraDiagnostico() {
  const t0 = Date.now(); actualizarTableroDiagnostico();
  try { SpreadsheetApp.getActive().toast('Tablero del diagnóstico actualizado (' + Math.round((Date.now() - t0) / 1000) + ' s).', 'Sistema HyS', 6); } catch (e) {}
}