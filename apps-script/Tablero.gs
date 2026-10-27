/**
 * SISTEMA HyS · TABLERO DE CONTROL Y BIBLIOTECA HyS (portal, fase 1)
 * p_tablero      números y series para la pantalla de inicio (lo prepara actualizarPortal cada 30 minutos; «Actualizar» lo rehace)
 * p_bib_listar   documentos de la biblioteca (guías, POE, protocolos, PTS, manuales) con su estado
 * p_bib_guardar  sube un documento nuevo o una versión nueva; la anterior queda «Reemplazado»
 * p_bib_cambiar  cambia datos o estado de un documento (sin subir archivo)
 * Biblioteca: BASE COMÚN › BIBLIOTECA_HYS (se crea sola) y Drive › SISTEMA HyS › Biblioteca HyS.
 * Los documentos visibles llegan a «Mi establecimiento › Documentos» según su ALCANCE (bibPara_).
 * Todo sigue en planillas: la hoja se puede editar a mano. No envía correos.
 */

const BIB_H = ['ID', 'CODIGO', 'TIPO', 'TITULO', 'TEMA', 'VERSION', 'VIGENTE_DESDE', 'REVISION_MESES', 'PROXIMA_REVISION', 'ALCANCE', 'VISIBLE', 'ESTADO', 'ARCHIVO', 'SUBIDO', 'OBSERVACIONES'];
const BIB_TIPOS = { MAN: 'Manual', POE: 'Procedimiento operativo estandarizado', PROT: 'Protocolo', PTS: 'Procedimiento de trabajo seguro', GD: 'Guía', IT: 'Instructivo', REG: 'Registro o formulario', PG: 'Plan' };
const BIB_SISTEMA = '16AIJZcmxG9EBM3-D-J4vRtvruHK9DVrA';   // Drive › TRABAJO › SISTEMA HyS
const tbHoy_ = () => Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd');
const tbF_ = v => v instanceof Date ? Utilities.formatDate(v, TZ, 'yyyy-MM-dd') : String(v == null ? '' : v).trim();
const tbDias_ = f => f ? Math.round((new Date(f + 'T12:00:00') - new Date(tbHoy_() + 'T12:00:00')) / 864e5) : null;

// ------------------------------------------------------------------ Biblioteca: hoja y lectura
function bibHoja_() {
  const bc = pBC_(); let sh = bc.getSheetByName('BIBLIOTECA_HYS');
  if (!sh) {
    sh = bc.insertSheet('BIBLIOTECA_HYS');
    sh.getRange(1, 1).setValue('Biblioteca HyS').setFontSize(14).setFontWeight('bold').setFontColor('#0D313F');
    sh.getRange(2, 1).setValue('Guías, POE, protocolos, PTS y manuales de Higiene y Seguridad. ALCANCE: «Toda la red», un área («Área Programática Trelew») o códigos de establecimiento separados por coma. VISIBLE = Sí: aparece en «Mi establecimiento». No borrar filas: una versión vieja queda «Reemplazado».').setFontStyle('italic').setFontColor('#4F616B').setWrap(false);
    sh.getRange(5, 1, 1, BIB_H.length).setValues([BIB_H]).setFontWeight('bold').setFontColor('#FFFFFF').setBackground('#0D313F');
    sh.setFrozenRows(5);
  }
  return sh;
}
function bibLeer_() {
  const sh = bibHoja_(), n = sh.getLastRow() - 5; if (n < 1) return [];
  return sh.getRange(6, 1, n, BIB_H.length).getValues().map((r, i) => { const o = { fila: 6 + i }; BIB_H.forEach((h, j) => o[h] = tbF_(r[j])); return o; }).filter(o => o.ID);
}
// Estado que se muestra: «A revisar» si la revisión vence en 60 días o ya venció
function bibEstado_(d) {
  if (d.ESTADO && d.ESTADO !== 'Vigente') return d.ESTADO;
  const dias = tbDias_(d.PROXIMA_REVISION); return dias != null && dias <= 60 ? 'A revisar' : 'Vigente';
}
function bibListar_() {
  const L = bibLeer_().map(d => Object.assign({}, d, { estadoVer: bibEstado_(d), dias: tbDias_(d.PROXIMA_REVISION) }));
  return { ok: true, documentos: L.sort((a, b) => (a.ESTADO === 'Reemplazado') - (b.ESTADO === 'Reemplazado') || a.CODIGO.localeCompare(b.CODIGO, 'es')), tipos: BIB_TIPOS,
    areas: pEstablecimientos_().filas.map(f => f.v[4]).filter((v, i, a) => v && a.indexOf(v) === i).sort(), sugeridos: bibSugeridos_(L) };
}
// Próximo número libre por prefijo (PTS-ALT-001 → sugiere el siguiente de cada familia y el 001 de familias nuevas)
function bibSugeridos_(L) {
  const max = {}; L.forEach(d => { const m = /^([A-Z]+-[A-Z]+)-(\d+)$/.exec(d.CODIGO); if (m) max[m[1]] = Math.max(max[m[1]] || 0, Number(m[2])); });
  const out = {}; Object.keys(max).forEach(k => out[k] = k + '-' + ('00' + (max[k] + 1)).slice(-3)); return out;
}
function bibCarpeta_() {
  const p = PropertiesService.getScriptProperties(), id = p.getProperty('BIBLIOTECA_CARPETA');
  if (id) try { return DriveApp.getFolderById(id); } catch (e) {}
  const f = carpeta_(DriveApp.getFolderById(BIB_SISTEMA), 'Biblioteca HyS'); p.setProperty('BIBLIOTECA_CARPETA', f.getId()); return f;
}
const bibSumarMeses_ = (f, m) => { if (!f || !m) return ''; const d = new Date(f + 'T12:00:00'); d.setMonth(d.getMonth() + Number(m)); return Utilities.formatDate(d, TZ, 'yyyy-MM-dd'); };

// Documento nuevo o versión nueva (si ya hay uno vigente con el mismo código, queda «Reemplazado»)
function bibGuardar_(x) {
  return conLock_(() => {
    const d = x.datos || {}, cod = String(d.CODIGO || '').trim().toUpperCase();
    if (!cod || !d.TITULO) return { ok: false, mensaje: 'Faltan el código o el título.' };
    if (!d.archivo || !d.archivo.base64) return { ok: false, mensaje: 'Falta el archivo.' };
    const L = bibLeer_(), sh = bibHoja_(), hoy = tbHoy_();
    const a = d.archivo, tipo = a.tipo || 'application/pdf', ext = (/\.([a-z0-9]{2,5})$/i.exec(a.nombre || '') || [, /pdf/.test(tipo) ? 'pdf' : 'docx'])[1];
    const f = bibCarpeta_().createFile(Utilities.newBlob(Utilities.base64Decode(String(a.base64).replace(/^data:[^,]+,/, '')), tipo, cod + ' v' + (d.VERSION || '1') + ' · ' + String(d.TITULO).slice(0, 80) + '.' + ext));
    try { f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) {}   // para que lo abran los establecimientos
    L.filter(o => o.CODIGO === cod && o.ESTADO === 'Vigente').forEach(o => sh.getRange(o.fila, BIB_H.indexOf('ESTADO') + 1).setValue('Reemplazado'));
    const desde = d.VIGENTE_DESDE || hoy, rev = Number(d.REVISION_MESES) || 12, id = 'BIB-' + Utilities.formatDate(new Date(), TZ, 'yyyyMMddHHmmss');
    const o = { ID: id, CODIGO: cod, TIPO: d.TIPO || (BIB_TIPOS[cod.split('-')[0]] || 'Otro'), TITULO: d.TITULO, TEMA: d.TEMA || '', VERSION: d.VERSION || '1', VIGENTE_DESDE: desde, REVISION_MESES: rev,
      PROXIMA_REVISION: bibSumarMeses_(desde, rev), ALCANCE: d.ALCANCE || 'Toda la red', VISIBLE: d.VISIBLE === 'No' ? 'No' : 'Sí', ESTADO: 'Vigente', ARCHIVO: f.getUrl(), SUBIDO: hoy, OBSERVACIONES: d.OBSERVACIONES || '' };
    sh.getRange(Math.max(sh.getLastRow(), 5) + 1, 1, 1, BIB_H.length).setValues([BIB_H.map(h => o[h])]);
    CacheService.getScriptCache().remove('p_tablero');
    return { ok: true, id: id, url: o.ARCHIVO };
  });
}
function bibCambiar_(x) {
  return conLock_(() => {
    const d = x.datos || {}, sh = bibHoja_(), o = bibLeer_().find(r => r.ID === d.ID); if (!o) return { ok: false, mensaje: 'No encontré el documento.' };
    ['TITULO', 'TEMA', 'ALCANCE', 'VISIBLE', 'ESTADO', 'REVISION_MESES', 'PROXIMA_REVISION', 'OBSERVACIONES'].forEach(k => { if (k in d) sh.getRange(o.fila, BIB_H.indexOf(k) + 1).setValue(d[k]); });
    if ('REVISION_MESES' in d && !('PROXIMA_REVISION' in d)) sh.getRange(o.fila, BIB_H.indexOf('PROXIMA_REVISION') + 1).setValue(bibSumarMeses_(o.VIGENTE_DESDE, d.REVISION_MESES));
    CacheService.getScriptCache().remove('p_tablero');
    return { ok: true };
  });
}
// Documentos de la biblioteca que corresponden a un establecimiento (los usa «Mi establecimiento»)
function bibPara_(cod) {
  try {
    const E = pEstablecimientos_().filas.find(f => limpio_(f.v[0]) === cod), area = E ? limpio_(E.v[4]) : '';
    return bibLeer_().filter(d => d.ESTADO === 'Vigente' && d.VISIBLE !== 'No').filter(d => {
      const a = d.ALCANCE || 'Toda la red'; if (/^toda/i.test(a)) return true; if (area && a === area) return true;
      return a.split(',').map(s => s.trim()).indexOf(cod) >= 0;
    }).map(d => ({ codigo: d.CODIGO, titulo: d.TITULO, tipo: d.TIPO, tema: d.TEMA, version: d.VERSION, url: d.ARCHIVO, desde: d.VIGENTE_DESDE }));
  } catch (e) { return []; }
}

// ------------------------------------------------------------------ Tablero de control
function tbTablero_(fresco) {
  const cache = CacheService.getScriptCache();
  if (!fresco) { const c = cache.get('p_tablero'); if (c) return JSON.parse(c);
    const g = sysLeer_('tablero'); if (g) { try { cache.put('p_tablero', JSON.stringify(g), 21600); } catch (e) {} return g; } }
  const hoy = tbHoy_(), E = pEstablecimientos_().filas, areaDe = {}, porNombre = {};
  E.forEach(f => { areaDe[limpio_(f.v[0])] = limpio_(f.v[4]); porNombre[limpio_(f.v[1])] = limpio_(f.v[0]); });
  // Retiros por mes (manifiestos del libro general: una fila por corriente), últimos 12 meses, por área
  const meses = []; for (let i = 11; i >= 0; i--) { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i); meses.push(Utilities.formatDate(d, TZ, 'yyyy-MM')); }
  const retiros = {};   // área → mes → {Y1, Y3}
  const g = SpreadsheetApp.openById(CFG.GENERAL), gm = g.getSheetByName('MANIFIESTOS'), n = gm.getLastRow() - 5, vistos = {};
  if (n > 0) gm.getRange(6, 1, n, 8).getValues().forEach(r => {
    const cod = porNombre[limpio_(r[0])]; if (!cod || !r[3]) return;
    const f = pFecha_(new Date(r[3])), m = f.slice(0, 7); if (meses.indexOf(m) < 0) return;
    const c = /Y3/.test(r[7]) ? 'Y3' : /Y1/.test(r[7]) ? 'Y1' : ''; if (!c) return;
    const k = cod + '|' + r[5] + '|' + f + '|' + c; if (vistos[k]) return; vistos[k] = 1;   // un manifiesto por corriente
    const a = areaDe[cod] || 's/d', x = ((retiros[a] = retiros[a] || {})[m] = retiros[a][m] || { Y1: 0, Y3: 0 }); x[c]++;
  });
  // Acciones abiertas: plan de acción (diagnóstico y auditorías), agua NO APTA y casos de plagas
  const acciones = [];   // {cod, origen, vencida, estado, que, donde, prioridad, aCargo, limite, ref, ir}
  try { planFilas_().forEach(o => { const e = planEstado_(o, hoy, 30); if (e === 'Cumplida' || e === 'Descartada') return; acciones.push({ cod: o.ESTABLECIMIENTO, origen: /^AUD-/.test(o.CODIGO_INFORME) ? 'Auditorías' : /^DA-/.test(o.ID_DIAG) ? 'Agua (diagnóstico)' : /^DP-/.test(o.ID_DIAG) ? 'Plagas (diagnóstico)' : /^DC-/.test(o.ID_DIAG) ? 'Cocinas (relevamiento)' : 'Diagnóstico', vencida: e === 'Vencida', estado: e, que: o.RECOMENDACION || '', donde: o.LUGAR || '', prioridad: o.PRIORIDAD || '', aCargo: o.RESPONSABLE_DIRECCION || o.A_CARGO || '', limite: o.FECHA_PREVISTA || o.FECHA_LIMITE || '', ref: o.CODIGO_INFORME, ir: '#plan/' + o.CODIGO_INFORME }); }); } catch (e) {}
  const leer = nombre => { try { return miLeer_(nombre).filter(regVivo_); } catch (e) { return []; } };   // lo anulado no cuenta
  const AN = leer('AGUA_ANALISIS'), RV = leer('RESERVORIOS'), CS = leer('PLAGAS_CASOS'), noApta = [];
  AN.filter(a => a.ESTADO_ACCION === 'Abierta').forEach(a => { const lim = miSumarHabiles_(a.FECHA_RESULTADO || a.FECHA_TOMA, 15); acciones.push({ cod: a.ESTABLECIMIENTO, origen: 'Agua', vencida: hoy > lim, estado: hoy > lim ? 'Vencida' : 'Abierta', que: 'Agua NO APTA: limpiar y repetir el análisis', donde: a.CODIGO_PUNTO || '', prioridad: 'Alta', aCargo: '', limite: lim, ref: a.CODIGO_PUNTO || '', ir: '#ficha/' + a.ESTABLECIMIENTO }); noApta.push({ cod: a.ESTABLECIMIENTO, punto: a.CODIGO_PUNTO, limite: lim }); });
  const plagas = []; CS.filter(c => c.ESTADO !== 'Cerrado').forEach(c => { const atr = c.PROXIMA_REVISION && c.PROXIMA_REVISION < hoy; acciones.push({ cod: c.ESTABLECIMIENTO, origen: 'Plagas', vencida: !!atr, estado: atr ? 'Revisión atrasada' : (c.ESTADO || 'Abierto'), que: 'Caso de plagas: ' + (c.PLAGA || 's/d'), donde: c.SECTOR || c.LUGAR || '', prioridad: '', aCargo: '', limite: c.PROXIMA_REVISION || '', ref: c.CASO || '', ir: '#plagas' }); plagas.push({ cod: c.ESTABLECIMIENTO, caso: c.CASO, plaga: c.PLAGA, revision: c.PROXIMA_REVISION }); });
  // Plagas · registro MIPyV de los operarios (12/10/2026): intervenciones y saneamientos abiertos, y visitas que pidieron otra visita sin una posterior
  try { if (typeof plagMipyv_ === 'function') { const MP = plagMipyv_(), mas = (f, d) => { const x = new Date(String(f).slice(0, 10) + 'T12:00:00'); x.setDate(x.getDate() + d); return Utilities.formatDate(x, TZ, 'yyyy-MM-dd'); };
    const add = (cod, que, donde, lim, ref, est) => { const atr = !!lim && lim < hoy; acciones.push({ cod: cod, origen: 'Plagas (MIPyV)', vencida: atr, estado: atr ? 'Revisión atrasada' : est, que: que, donde: donde || '', prioridad: '', aCargo: '', limite: lim || '', ref: ref || '', ir: '#plagas' }); plagas.push({ cod: cod, caso: ref, plaga: que, revision: lim }); };
    if (Array.isArray(MP.casos)) {   // 26/10/2026: los mismos casos que muestra 3 · Plagas › Tablero (los calcula el Apps Script de MIPyV, con la regla de la app de los operarios)
      MP.casos.forEach(c => add(c.cod || '', 'Caso abierto: ' + (c.tipo_plaga || 's/d'), c.establecimiento, mas(hoy, Number(c.dias) || 0), c.protocolo, 'Abierto'));
      (MP.saneamiento || []).forEach(s => acciones.push({ cod: s.cod, origen: 'Plagas (MIPyV)', vencida: false, estado: s.estado || 'Abierto', que: 'Trabajo de saneamiento abierto', donde: s.lugar || '', prioridad: '', aCargo: '', limite: '', ref: s.id || '', ir: '#plagas' }));
    } else {   // sin respuesta del Apps Script de MIPyV: cálculo anterior
    const conProt = {}; (MP.abiertas || []).forEach(i => { conProt[i.protocolo] = true; add(i.cod, 'Intervención abierta: ' + (i.plaga || 's/d'), i.lugar, '', i.protocolo, i.estado || 'Abierta'); });
    (MP.saneamiento || []).forEach(s => add(s.cod, 'Trabajo de saneamiento abierto', s.lugar, '', s.id, s.estado || 'Abierto'));
    const ult = {}; (MP.visitas || []).slice().reverse().forEach(x => { if (/no corresponde/i.test(x.plaga || '')) return; ult[x.lugar + '|' + x.plaga] = x; });
    Object.keys(ult).forEach(k => { const x = ult[k]; if (!/otra visita/i.test(x.resultado || '') || (x.protocolo && conProt[x.protocolo])) return;
      add(x.cod, 'Otra visita pendiente: ' + (x.plaga || 's/d'), x.lugar, x.segunda || mas(x.fecha, 15), x.protocolo || x.id, 'Pendiente'); }); } } } catch (e) {}
  // Agua: tanques con limpieza al día
  const tanques = RV.filter(t => !/fuera/i.test(t.ESTADO)).map(t => { const p = t.PROXIMA_LIMPIEZA || (t.ULTIMA_LIMPIEZA ? miSumarMeses_(t.ULTIMA_LIMPIEZA, t.FRECUENCIA_LIMPIEZA_MESES || 12) : ''), d = tbDias_(p);
    return { cod: t.ESTABLECIMIENTO, aldia: !!p && p >= hoy, estado: /riego/i.test(t.USO) ? 'riego' : !t.ULTIMA_LIMPIEZA ? 'sin' : d < 0 ? 'vencida' : d <= 30 ? 'porvencer' : 'aldia' }; });
  // Agua: canillas con análisis bacteriológico al día (cada 6 meses)
  const puntos = leer('PUNTOS_MUESTREO').filter(x => !/fuera/i.test(x.ESTADO)).map(x => { const un = /[uú]nica/i.test(x.ESTADO), eq = /equipo|solo f[ií]sico/i.test(x.ESTADO), v = eq ? (x.ULTIMO_FISICOQUIMICO ? miSumarMeses_(x.ULTIMO_FISICOQUIMICO, 12) : '') : x.ULTIMO_BACTERIOLOGICO ? miSumarMeses_(x.ULTIMO_BACTERIOLOGICO, 6) : '', d = tbDias_(v);   // equipos: físico-químico cada 12 meses (14.37)
    return { cod: x.ESTABLECIMIENTO, estado: un ? 'unica' : !v ? 'sin' : d < 0 ? 'vencida' : d <= 30 ? 'porvencer' : 'aldia' }; });
  // Auditorías: último cumplimiento de campo o verificación y las que esperan verificación
  let aud = { ultima: '', paraVerificar: [] };
  try { const A = audLeer_(audHojaA_(), AUD_H); const u = A.filter(a => /campo|verificaci/i.test(a.TIPO) && a.CUMPLIMIENTO).sort((a, b) => (b.FECHA || '').localeCompare(a.FECHA || ''))[0];
    aud = { ultima: u ? u.CUMPLIMIENTO + ' · ' + u.ESTABLECIMIENTO : '', paraVerificar: A.filter(a => a.ESTADO === 'Para verificar').map(a => ({ cod: a.ESTABLECIMIENTO, id: a.ID_AUD })) }; } catch (e) {}
  // Biblioteca: documentos a revisar
  const docs = bibLeer_().filter(d => d.ESTADO === 'Vigente').map(d => ({ codigo: d.CODIGO, titulo: d.TITULO, revision: d.PROXIMA_REVISION, dias: tbDias_(d.PROXIMA_REVISION) })).filter(d => d.dias != null && d.dias <= 60);
  let cocina = []; try { const pc_ = {}; cocPersonas_('*').filter(p => p.ACTIVO !== 'No').forEach(p => { const c = pc_[p.ESTABLECIMIENTO] = pc_[p.ESTABLECIMIENTO] || { cod: p.ESTABLECIMIENTO, vencidos: 0, porVencer: 0 }; if (p.estado === 'vencido' || p.estado === 'no') c.vencidos++; else if (p.estado === 'porvencer') c.porVencer++; }); cocina = Object.keys(pc_).map(k => pc_[k]).filter(c => c.vencidos || c.porVencer); } catch (e) {}   // 6 · Cocinas: carnets y libretas
  let docsEst = { total: 0, establecimientos: 0, avisos: [] }; try { docsEst = docEstResumen_(); } catch (e) {}   // 2 · Documentos de los establecimientos (Modulo2.gs)
  let modulos = {}; try { modulos = tbModulos_(); } catch (e) { modulos = { error: e.message }; }
  const out = { ok: true, mediciones: typeof rgrlMedVigentes_ === 'function' ? rgrlMedVigentes_() : [], rgrl: typeof rgrlResumen_ === 'function' ? rgrlResumen_() : [], meses: meses, retiros: retiros, acciones: acciones, noApta: noApta, plagas: plagas, tanques: tanques, puntos: puntos, auditorias: aud, docsRevisar: docs, cocina: cocina, docsEst: docsEst, areaDe: areaDe, modulos: modulos, actualizado: new Date().toISOString() };
  try { cache.put('p_tablero', JSON.stringify(out), 21600); } catch (e) {}   // 6 h: la tarea automática lo rehace una vez por día (5 h)
  sysGuardar_('tablero', out);
  return out;
}

// ------------------------------------------------------------------ Panel de gestión (Fase 3): resumen de los otros módulos
// Lo arma la tarea de las 5 h junto con el tablero (o el botón «Actualizar»); el portal solo lo lee.
function tbModulos_() {
  const g = SpreadsheetApp.openById(CFG.GENERAL), hoyS = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd'), M = {};
  // Personal: cruce nocturno con capacitaciones y propuestas de la Bandeja
  const cp = g.getSheetByName('CRUCE_PERSONAL'), bj = g.getSheetByName('BANDEJA'), nb = bj ? bj.getLastRow() - 5 : 0;
  const pend = nb > 0 ? bj.getRange(6, 1, nb, 12).getValues().filter(r => r[7] === 'Para revisar') : [];
  let sinAsignar = null;
  try { const s = SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('BASE_TRABAJADORES_ID')).getSheetByName('SIN_ASIGNAR'); if (s) sinAsignar = Math.max(s.getLastRow() - 5, 0); } catch (e) {}
  M.personal = { cruce: cp ? String(cp.getRange(2, 1).getValue()) : '', diferencias: cp ? Math.max(cp.getLastRow() - 5, 0) : 0, bandeja: pend.length,
    bandejaCruce: pend.filter(r => r[6] === 'Cruce nocturno con capacitaciones').length, sinAsignar: sinAsignar,
    altasPersonas: pend.filter(r => r[6] === 'Cruce nocturno con capacitaciones').reduce((s, r) => s + bjCambios_(r[11]).filter(c => c.nueva).length, 0) };   // personas propuestas como alta
  // Capacitaciones: próximos dictados (18/10/2026: lee DICTADOS y AGENDA del libro «CAPACITACIONES · Sistema HyS»;
  // antes leía la AGENDA del libro viejo, que dejó de usarse el 15/10). Un dictado y sus turnos de agenda cuentan una sola vez.
  try {
    const fecha = x => { const d = cgFecha_(x); return d ? Utilities.formatDate(d, TZ, 'yyyy-MM-dd') : ''; };
    const hora = x => x instanceof Date ? Utilities.formatDate(x, TZ, 'HH:mm') : cgTxt_(x);
    const cat = {}; cgHoja_('CATALOGO').filas.forEach(c => { const k = cgTxt_(c.o.CODIGO); if (k && !cat[k]) cat[k] = cgTxt_(c.o.NOMBRE); });
    const fuera = /anul|cancel|suspend|no se present|sin uso|libre/i, vistos = {}, prox = [];
    cgHoja_('DICTADOS').filas.forEach(d => { const o = d.o, f = fecha(o.FECHA), cod = cgTxt_(o.CODIGO);
      if (f < hoyS || !cod || fuera.test(cgTxt_(o.ESTADO))) return; vistos[cgTxt_(o.ID_DICTADO)] = 1;
      prox.push({ fecha: f, hora: hora(o.HORA_INICIO), cap: cat[cod] || cod, lugar: cgVacio_(o.LUGAR) ? cgTxt_(o.MODALIDAD) : cgTxt_(o.LUGAR), estado: cgTxt_(o.MODALIDAD) }); });
    cgHoja_('AGENDA').filas.forEach(t => { const o = t.o, f = fecha(o.FECHA), cod = cgTxt_(o.CODIGO);
      if (f < hoyS || cgVacio_(o.CODIGO) || fuera.test(cgTxt_(o.ESTADO)) || vistos[cgTxt_(o.ID_DICTADO)]) return;
      prox.push({ fecha: f, hora: hora(o.HORA_INICIO), cap: cat[cod] || cod, lugar: cgTxt_(o.LUGAR), estado: cgTxt_(o.ESTADO) }); });
    prox.sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora));
    M.capacitaciones = { proximas: prox.length, lista: prox.slice(0, 5) };
  } catch (e) { M.capacitaciones = { error: 'No se pudo leer la agenda de capacitaciones.' }; }
  // Documentos: informes que el sistema emitió este año (registro HYSL; el pedido manual de números se quitó el 12/10/2026)
  try { const r = docRegistro_({ anio: Number(hoyS.slice(0, 4)) }).filas || [], je = DOC_H.indexOf('ESTADO');
    M.documentos = { emitidos: r.filter(f => String(f.v[je]) === 'Emitido').length }; } catch (e) { M.documentos = {}; }
  M.actualizado = new Date().toISOString();
  return M;
}

// Prueba (12/10/2026): muestra las acciones de plagas que ve el tablero (casos de «Mi establecimiento» y registro MIPyV)
function probarTableroPlagas() { const T = tbTablero_(true); Logger.log(JSON.stringify({ plagas: T.plagas, acciones: (T.acciones || []).filter(a => /^Plagas/.test(a.origen)) })); }
