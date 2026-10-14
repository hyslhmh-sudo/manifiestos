/**
 * SISTEMA HyS · MÓDULO 4 · PERSONAL Y RAR (Fase 5 de la separación en módulos)
 *
 *   SISTEMA HyS › MÓDULO 4 · PERSONAL Y RAR
 *     ├ LIBRO ACCIDENTES DE TRABAJO   INICIO · SINIESTROS · NOVEDADES · LISTAS · ESTABLECIMIENTOS
 *     ├ Accidentes                    denuncias y comprobantes, una carpeta por establecimiento y una por año
 *     ├ NTE                           nóminas de trabajadores expuestos (RAR) generadas por el sistema
 *     └ Respaldo
 *
 * SINIESTROS (accidentes de trabajo, in itinere y enfermedades profesionales). Una fila por siniestro (N.º CH del
 * Autoseguro). Lo cargan el Servicio de Personal y la secretaría de HyS desde «Mi establecimiento» › Personal, copiando los
 * datos de la denuncia (el sistema no lee el PDF; se adjunta como respaldo).
 * NOVEDADES: todo lo que le pasa a un siniestro después (inicio de ILT, alta, reingreso, rechazo, inculpable, cierre…),
 * una fila por novedad, con su comprobante. Nada se pisa. ESTADO, DIAS_BAJA y ULTIMA_NOVEDAD los calcula el sistema a
 * partir de las novedades (al guardar cada una y todas las noches).
 * Un reingreso abre un período nuevo de ILT en el MISMO siniestro (como el RENAL, Res. SRT 3326/14); si el Autoseguro da
 * un número nuevo para una recaída, se carga como siniestro nuevo con VIENE_DE = número anterior.
 * Diagnóstico: se copian el CIE 10 y el diagnóstico de certeza tal como figuran en la denuncia (CIE10, DIAGNOSTICO), para la
 * investigación y las estadísticas de HyS. Son datos de salud reservados (Res. SRT 525/15, ptos. 4.5 y 4.6; Ley 25.326):
 * el libro es solo para HyS y la app no los muestra en las listas.
 * No envía correos. Los avisos (plazos, ILT sin novedades) se ven en «Mi establecimiento» › Personal.
 * Normativa: Ley 19.587 y Dto. 351/79; Ley 24.557 (arts. 6 y 31); Res. SRT 525/15 (denuncia dentro de las 48 h, copia al
 * trabajador); Res. SRT 3326/14 (RENAL); Res. SRT 905/15 (Anexo I pto. 13 estadísticas; Anexo II pto. 12 investigación);
 * Ley XXII N.º 50 (Autoseguro Público Provincial).
 * Se puede ejecutar más de una vez: lo que ya existe o ya se movió no se vuelve a tocar.
 */

const MOD4 = {
  SIS: '16AIJZcmxG9EBM3-D-J4vRtvruHK9DVrA',          // Drive › TRABAJO › SISTEMA HyS
  NOMBRE: 'MÓDULO 4 · PERSONAL Y RAR',
  LIBRO: 'LIBRO ACCIDENTES DE TRABAJO',
  PILOTO: ['HZT', 'HMH'],
  P_LIBRO: 'ACC_LIBRO', P_FOTOS: 'ACC_CARPETA', P_NTE: 'NTE_CARPETA'
};
const ACC_TIPOS = ['En el lugar de trabajo', 'In itinere', 'Enfermedad profesional'];
// SINIESTROS: hasta CARGADO, Personal / secretaría (app) · ESTADO a DENUNCIA_EN_PLAZO, el sistema · ESTADO_HYS, Higiene y Seguridad
const SIN_H = ['ID', 'NRO_SINIESTRO', 'VIENE_DE', 'TIPO', 'FECHA_ACCIDENTE', 'HORA', 'ESTABLECIMIENTO', 'SITIO', 'DNI', 'APELLIDO_Y_NOMBRE', 'SERVICIO', 'FUNCION',
  'FECHA_INGRESO', 'EN_BASE', 'FECHA_CONOCIMIENTO', 'FECHA_DENUNCIA', 'COPIA_ENTREGADA', 'DENUNCIA', 'OBSERVACIONES', 'CARGO', 'CARGADO',
  'ESTADO', 'DIAS_BAJA', 'ULTIMA_NOVEDAD', 'DENUNCIA_EN_PLAZO', 'ESTADO_HYS', 'ID_APP', 'CIE10', 'DIAGNOSTICO'];
const SIN_DE_HYS = 'ESTADO_HYS', SIN_DEL_SISTEMA = 'ESTADO';
const NOV_H = ['ID', 'ID_SINIESTRO', 'NRO_SINIESTRO', 'FECHA', 'NOVEDAD', 'COMPROBANTE', 'OBSERVACIONES', 'CARGO', 'CARGADO', 'ESTADO', 'ID_APP'];
const NOV_TIPOS = ['Inicio de ILT', 'Alta médica', 'Reingreso / reapertura', 'Sin baja laboral', 'Rechazo del Autoseguro', 'Inculpable / preexistente',
  'Fin de tratamiento', 'Copia de denuncia entregada', 'Comisión Médica / juicio', 'Otra'];
const NOV_PIDE_ARCHIVO = ['Rechazo del Autoseguro', 'Inculpable / preexistente'];   // notificaciones del Autoseguro (Res. SRT 525/15, ptos. 5.1 y 5.2)
const ACC_ESTADOS = ['Pendiente de análisis', 'Analizado', 'Anulado'];
const ACC_ABIERTOS = ['Denunciado', 'En ILT'];
// Parámetros (se cambian en LISTAS sin tocar código)
const ACC_PARAM = { DIAS_PLAZO_DENUNCIA: 2, DIAS_ILT_SIN_NOVEDAD: 30, DIAS_DENUNCIADO_SIN_NOVEDAD: 7 };

// ------------------------------------------------------------------ Armado del módulo (ejecutar una vez)
function armarModuloPersonal() {
  const p = PropertiesService.getScriptProperties();
  const raiz = carpeta_(DriveApp.getFolderById(MOD4.SIS), MOD4.NOMBRE);
  const fotos = carpeta_(raiz, 'Accidentes'), nte = carpeta_(raiz, 'NTE'); carpeta_(raiz, 'Respaldo');
  p.setProperty(MOD4.P_FOTOS, fotos.getId()); p.setProperty(MOD4.P_NTE, nte.getId());
  const log = [];
  let ss = null; const id = p.getProperty(MOD4.P_LIBRO);
  if (id) try { ss = SpreadsheetApp.openById(id); log.push('Libro: ya estaba'); } catch (e) { ss = null; }
  if (!ss) {
    ss = SpreadsheetApp.create(MOD4.LIBRO); DriveApp.getFileById(ss.getId()).moveTo(raiz); p.setProperty(MOD4.P_LIBRO, ss.getId());
    ss.getSheets()[0].setName('INICIO');
    const e = ss.insertSheet('ESTABLECIMIENTOS');
    e.getRange(1, 1, 1, 4).setValues([['CODIGO', 'ACTIVO', 'OBSERVACIONES', 'CARGA_JUNTO_CON']]).setFontWeight('bold').setFontColor('#FFFFFF').setBackground('#0D313F');
    e.getRange(2, 1, MOD4.PILOTO.length, 3).setValues(MOD4.PILOTO.map(c => [c, 'Sí', 'Piloto (octubre de 2026)']));
    e.getRange(2, 2, 200, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(['Sí', 'No'], true).build());
    log.push('Libro: creado');
  }
  // NTE: las carpetas «NTE» de cada establecimiento pasan al módulo (cada archivo conserva su enlace)
  const sh = pBC_().getSheetByName('ESTABLECIMIENTOS'), H = sh.getRange(5, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
  let movidas = 0;
  pTabla_(sh, H.length).map(r => limpio_(r.v[0])).filter(Boolean).forEach(cod => {
    const vieja = audCarpetaEst_(cod); if (!vieja) return;
    const it = vieja.getFoldersByName('NTE'); if (!it.hasNext()) return;
    const dest = carpeta_(nte, vieja.getName());
    while (it.hasNext()) { const f = it.next(), fs = f.getFiles(); while (fs.hasNext()) fs.next().moveTo(dest);
      if (!f.getFiles().hasNext() && !f.getFolders().hasNext()) f.setTrashed(true); }
    movidas++;
  });
  log.push('NTE movidas: ' + movidas + ' establecimientos');
  Logger.log('Listo. ' + log.join(' · ') + '. Ahora ejecutá actualizarLibroSiniestros. Libro: ' + ss.getUrl());
}

// ------------------------------------------------------------------ Libro de siniestros: hojas nuevas (ejecutar una vez; se puede repetir)
// Pasa ACCIDENTES a SINIESTROS sin perder nada: copia cada fila por nombre de columna y deja la hoja vieja oculta como respaldo.
function actualizarLibroSiniestros() {
  const ss = accLibro_(); if (!ss) return Logger.log('Falta el libro: ejecutá armarModuloPersonal.');
  const log = [], AZ = '#0D313F', CEL = '#5894A7', GRIS = '#8AA0AA';
  const cab = (sh, H, titulo, ayuda, cortes) => {
    sh.getRange(1, 1).setValue(titulo).setFontSize(14).setFontWeight('bold').setFontColor(AZ);
    sh.getRange(2, 1).setValue(ayuda).setFontStyle('italic').setFontColor('#4F616B');
    sh.getRange(5, 1, 1, H.length).setValues([H]).setFontWeight('bold').setFontColor('#FFFFFF').setBackground(AZ);
    (cortes || []).forEach(([desde, hasta, color]) => sh.getRange(5, H.indexOf(desde) + 1, 1, H.indexOf(hasta) - H.indexOf(desde) + 1).setBackground(color));
    sh.setFrozenRows(5);
  };
  const lista = (sh, H, col, vals) => sh.getRange(6, H.indexOf(col) + 1, 3000, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(vals, true).setAllowInvalid(false).build());
  const texto = (sh, H, cols) => cols.forEach(c => sh.getRange(6, H.indexOf(c) + 1, 3000, 1).setNumberFormat('@'));

  // 1. SINIESTROS
  let S = ss.getSheetByName('SINIESTROS');
  if (!S) {
    S = ss.insertSheet('SINIESTROS', 1);
    cab(S, SIN_H, 'Siniestros', 'Una fila por siniestro (N.º CH). Hasta CARGADO: Personal y secretaría (desde la app). ESTADO a DENUNCIA_EN_PLAZO: los calcula el sistema con las NOVEDADES. ESTADO_HYS: Higiene y Seguridad. No borrar filas: un error se marca «Anulado» en ESTADO_HYS.',
      [['ESTADO', 'DENUNCIA_EN_PLAZO', GRIS], ['ESTADO_HYS', 'ESTADO_HYS', CEL]]);
    texto(S, SIN_H, ['NRO_SINIESTRO', 'VIENE_DE', 'DNI', 'HORA']);
    lista(S, SIN_H, 'TIPO', ACC_TIPOS); lista(S, SIN_H, 'ESTADO_HYS', ACC_ESTADOS); lista(S, SIN_H, 'COPIA_ENTREGADA', ['Sí', 'No']);
    const V = ss.getSheetByName('ACCIDENTES');
    if (V && V.getLastRow() > 5) {
      const HV = V.getRange(5, 1, 1, V.getLastColumn()).getValues()[0].map(String), vv = V.getRange(6, 1, V.getLastRow() - 5, HV.length).getValues().filter(r => r[0]);
      const viejasHyS = ['FORMA', 'AGENTE', 'PARTE_DEL_CUERPO', 'DIAS_DE_BAJA', 'ANALISIS', 'MEDIDAS'];
      const filas = vv.map(r => { const o = {}; HV.forEach((h, j) => o[h] = r[j]);
        const extra = viejasHyS.filter(h => o[h] !== '' && o[h] != null).map(h => h + ': ' + o[h]).join(' · ');   // no se pierde nada de lo que HyS hubiera escrito
        if (extra) o.OBSERVACIONES = [o.OBSERVACIONES, extra].filter(Boolean).join(' · ');
        o.NRO_SINIESTRO = String(o.NRO_SINIESTRO || '').trim(); o.EN_BASE = /s\/d/.test(String(o.SERVICIO)) ? 'No' : 'Sí';
        return SIN_H.map(h => o[h] == null ? '' : o[h]); });
      S.getRange(6, 1, filas.length, SIN_H.length).setValues(filas);
      log.push('SINIESTROS: ' + filas.length + ' fila(s) pasadas de ACCIDENTES');
    }
    if (V) { V.setName('ACCIDENTES (respaldo)'); V.hideSheet(); log.push('ACCIDENTES quedó oculta como respaldo'); }
  } else log.push('SINIESTROS: ya estaba');

  // 2. NOVEDADES
  let N = ss.getSheetByName('NOVEDADES');
  if (!N) {
    N = ss.insertSheet('NOVEDADES', 2);
    cab(N, NOV_H, 'Novedades de cada siniestro', 'Una fila por novedad (inicio de ILT, alta, reingreso, rechazo…). Las carga Personal o la secretaría. No se borran: una equivocada se marca «Anulada» en ESTADO y después Sistema HyS › Siniestros › Recalcular (menú del libro general).',
      [['ESTADO', 'ESTADO', CEL]]);
    texto(N, NOV_H, ['NRO_SINIESTRO']); lista(N, NOV_H, 'NOVEDAD', NOV_TIPOS); lista(N, NOV_H, 'ESTADO', ['Vigente', 'Anulada']);
    log.push('NOVEDADES: creada');
  } else log.push('NOVEDADES: ya estaba');

  // 3. LISTAS (tipos y parámetros, editables)
  let L = ss.getSheetByName('LISTAS');
  if (!L) {
    L = ss.insertSheet('LISTAS');
    L.getRange(1, 1).setValue('Listas y parámetros del módulo').setFontSize(14).setFontWeight('bold').setFontColor(AZ);
    L.getRange(2, 1).setValue('Los parámetros se pueden cambiar (número de días). Las listas de tipos las usa el sistema: para sumar un tipo nuevo, avisar a HyS.').setFontStyle('italic').setFontColor('#4F616B');
    L.getRange(5, 1, 1, 4).setValues([['PARAMETRO', 'VALOR', 'PARA QUÉ SIRVE', '']]).setFontWeight('bold').setFontColor('#FFFFFF').setBackground(AZ);
    L.getRange(6, 1, 3, 3).setValues([
      ['DIAS_PLAZO_DENUNCIA', ACC_PARAM.DIAS_PLAZO_DENUNCIA, 'Días entre que el hospital se entera y la denuncia al Autoseguro (Res. SRT 525/15: 48 h)'],
      ['DIAS_ILT_SIN_NOVEDAD', ACC_PARAM.DIAS_ILT_SIN_NOVEDAD, 'Aviso «¿sigue en ILT?» si pasan estos días sin novedades'],
      ['DIAS_DENUNCIADO_SIN_NOVEDAD', ACC_PARAM.DIAS_DENUNCIADO_SIN_NOVEDAD, 'Aviso «¿tuvo baja?» si después de la denuncia no se cargó inicio de ILT ni «Sin baja laboral»']]);
    L.getRange(11, 1, 1, 2).setValues([['TIPO DE SINIESTRO', 'NOVEDAD']]).setFontWeight('bold').setFontColor('#FFFFFF').setBackground(AZ);
    const n = Math.max(ACC_TIPOS.length, NOV_TIPOS.length);
    L.getRange(12, 1, n, 2).setValues(Array.from({ length: n }, (_, i) => [ACC_TIPOS[i] || '', NOV_TIPOS[i] || '']));
    L.setColumnWidth(1, 240); L.setColumnWidth(3, 620);
    log.push('LISTAS: creada');
  } else log.push('LISTAS: ya estaba');

  // 4. INICIO (ayuda)
  const ini = ss.getSheetByName('INICIO') || ss.insertSheet('INICIO', 0);
  ini.clear();
  ini.getRange(1, 1, 14, 1).setValues([['Libro de siniestros (accidentes de trabajo, in itinere y enfermedades profesionales)'],
    ['Lo cargan el Servicio de Personal y la secretaría de Higiene y Seguridad desde «Mi establecimiento» › Personal.'], [''],
    ['Cómo funciona'],
    ['1. SINIESTROS: una fila por siniestro, con los datos copiados de la denuncia del Autoseguro (N.º CH, fecha, tipo, DNI, lugar, fechas de conocimiento y de denuncia, copia al trabajador). El PDF queda adjunto.'],
    ['2. NOVEDADES: inicio de ILT, alta, reingreso, sin baja, rechazo, inculpable, fin de tratamiento… Una fila por novedad; nada se pisa.'],
    ['3. ESTADO, DIAS_BAJA y ULTIMA_NOVEDAD los calcula el sistema con las novedades (al guardar y todas las noches). Un reingreso abre otro período de ILT en el mismo siniestro y los días se suman.'],
    ['4. Si el Autoseguro da un número nuevo para una recaída: siniestro nuevo con VIENE_DE = número anterior.'],
    ['5. Errores: no se borran filas. Un siniestro equivocado: ESTADO_HYS = Anulado. Una novedad equivocada: ESTADO = Anulada. Después: Sistema HyS › Siniestros › Recalcular (menú del libro general).'],
    ['6. LISTAS: plazos de los avisos (se pueden cambiar). ESTABLECIMIENTOS: dónde está habilitada la carga (ACTIVO = Sí).'],
    ['7. Datos sensibles: CIE10 y DIAGNOSTICO se copian de la denuncia. Son datos de salud reservados (Ley 25.326): el libro es solo para Higiene y Seguridad y quienes cargan; no compartir.'],
    [''],
    ['Base: Ley 24.557, arts. 6 y 31 · Res. SRT 525/15 (denuncia en 48 h y copia al trabajador) · Res. SRT 3326/14 (RENAL) · Res. SRT 905/15, Anexo I pto. 13 y Anexo II pto. 12 · Ley XXII N.º 50 (Autoseguro Público Provincial).'],
    ['Higiene y Seguridad Laboral · Hospitales más seguros para las personas']]);
  ini.getRange(1, 1).setFontSize(16).setFontWeight('bold').setFontColor(AZ); ini.getRange(4, 1).setFontWeight('bold').setFontColor(AZ);
  ini.getRange(13, 1, 2, 1).setFontColor('#4F616B').setFontSize(9); ini.setColumnWidth(1, 1000); ini.getRange(1, 1, 14, 1).setWrap(true);

  // 5. Establecimientos: por ahora HZT y HMH (los demás quedan en «No», no se borran). CARGA_JUNTO_CON: HZT y HMH se ven juntos.
  const E = ss.getSheetByName('ESTABLECIMIENTOS');
  if (E && String(E.getRange(1, 4).getValue()) !== 'CARGA_JUNTO_CON') { E.getRange(1, 4).setValue('CARGA_JUNTO_CON').setFontWeight('bold').setFontColor('#FFFFFF').setBackground(AZ);
    E.getRange(2, 1, Math.max(1, E.getLastRow() - 1), 1).getValues().forEach((r, i) => { const j = { HZT: 'HMH', HMH: 'HZT' }[String(r[0]).trim()]; if (j) E.getRange(2 + i, 4).setValue(j); }); }
  if (E && E.getLastRow() > 1) { const v = E.getRange(2, 1, E.getLastRow() - 1, 2).getValues();
    v.forEach((r, i) => { if (r[0] && MOD4.PILOTO.indexOf(String(r[0]).trim()) < 0 && /^s/i.test(String(r[1]))) { E.getRange(2 + i, 2).setValue('No'); log.push(r[0] + ': carga en pausa (ACTIVO = No)'); } }); }

  ss.setActiveSheet(ini); ss.moveActiveSheet(1);
  CacheService.getScriptCache().removeAll(['acc_est', 'p_resumen', 'p_tablero', 'acc_vis_HZT', 'acc_vis_HMH']);
  const r = accRecalcularTodo(); log.push(r);
  Logger.log('Listo. ' + log.join(' · ') + '. Libro: ' + ss.getUrl());
}

// ------------------------------------------------------------------ Ayudas que usan los demás archivos
function nteCarpetaEst_(cod) {   // carpeta NTE de un establecimiento (la usa Riesgos.gs); null si el módulo no está armado
  const id = PropertiesService.getScriptProperties().getProperty(MOD4.P_NTE); if (!id) return null;
  const vieja = audCarpetaEst_(cod); if (!vieja) return null;
  try { return carpeta_(DriveApp.getFolderById(id), vieja.getName()); } catch (e) { return null; }
}
function accLibro_() { const id = PropertiesService.getScriptProperties().getProperty(MOD4.P_LIBRO); return id ? SpreadsheetApp.openById(id) : null; }
const accHoja_ = ss => ss.getSheetByName('SINIESTROS') || ss.getSheetByName('ACCIDENTES');
function accActivo_(cod) {   // ¿está habilitada la carga para este establecimiento? (hoja ESTABLECIMIENTOS del libro)
  try {
    const c = CacheService.getScriptCache(); let L = c.get('acc_est');
    if (!L) { const ss = accLibro_(); if (!ss) return false; const sh = ss.getSheetByName('ESTABLECIMIENTOS');
      L = JSON.stringify(sh.getRange(2, 1, Math.max(1, sh.getLastRow() - 1), 2).getValues().filter(r => /^s[ií]$/i.test(String(r[1]).trim())).map(r => String(r[0]).trim()));
      c.put('acc_est', L, 600); }
    return JSON.parse(L).indexOf(cod) >= 0;
  } catch (e) { return false; }
}
// Establecimientos que ve y carga quien entra por «cod»: el suyo, su grupo y los de CARGA_JUNTO_CON (hoja ESTABLECIMIENTOS
// del libro; ej.: HZT y HMH comparten Dirección y Servicio de Personal). Solo los que tienen ACTIVO = Sí.
function accVisibles_(cod) {
  const c = CacheService.getScriptCache(), k = 'acc_vis_' + cod, ya = c.get(k); if (ya) return JSON.parse(ya);
  const ss = accLibro_(), sh = ss && ss.getSheetByName('ESTABLECIMIENTOS'); if (!sh) return [cod];
  const H = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String), jJ = H.indexOf('CARGA_JUNTO_CON');
  const v = sh.getRange(2, 1, Math.max(1, sh.getLastRow() - 1), H.length).getValues().map(r => ({ c: String(r[0]).trim(), a: /^s[ií]$/i.test(String(r[1]).trim()), j: jJ >= 0 ? String(r[jJ]).split(/[,;\s]+/).map(x => x.trim()).filter(Boolean) : [] }));
  const activos = v.filter(r => r.a).map(r => r.c), yo = v.find(r => r.c === cod) || { j: [] };
  const L = [cod].concat(miGrupo_(cod).cods || [], yo.j).filter((x, i, a) => x && a.indexOf(x) === i && activos.indexOf(x) >= 0);
  c.put(k, JSON.stringify(L), 600); return L;
}
// Fechas: todo se guarda y se compara como aaaa-mm-dd
function accIso_(v) {
  if (v instanceof Date && !isNaN(v)) return Utilities.formatDate(v, TZ, 'yyyy-MM-dd');
  const s = String(v == null ? '' : v).trim(), dm = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(s), iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  return iso ? iso[0] : dm ? dm[3] + '-' + ('0' + dm[2]).slice(-2) + '-' + ('0' + dm[1]).slice(-2) : '';
}
const accHoy_ = () => Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd');
const accDias_ = (a, b) => Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 86400000);   // días de a hasta b
const accNro_ = v => String(v == null ? '' : v).replace(/\s+/g, '').toUpperCase();
function accParam_(ss) {
  const P = Object.assign({}, ACC_PARAM), L = ss.getSheetByName('LISTAS'); if (!L || L.getLastRow() < 6) return P;
  L.getRange(6, 1, 5, 2).getValues().forEach(r => { const k = String(r[0]).trim(); if (P[k] != null && Number(r[1]) > 0) P[k] = Number(r[1]); });
  return P;
}
// Lee una hoja (fila 5 = encabezados) como objetos
function accLeer_(sh) {
  if (!sh || sh.getLastRow() < 6) return [];
  const H = sh.getRange(5, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
  return sh.getRange(6, 1, sh.getLastRow() - 5, H.length).getValues().map((r, i) => { const o = { _fila: 6 + i }; H.forEach((h, j) => o[h] = r[j] instanceof Date ? accIso_(r[j]) : r[j]); return o; }).filter(o => o.ID);
}
function accEscribir_(sh, H, o) {   // escribe según los encabezados reales de la hoja (si faltan columnas de H, las agrega al final)
  const R = sh.getRange(5, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
  H.forEach(h => { if (R.indexOf(h) < 0) { if (R.length + 1 > sh.getMaxColumns()) sh.insertColumnsAfter(sh.getMaxColumns(), 1); sh.getRange(5, R.length + 1).setValue(h).setFontWeight('bold').setFontColor('#FFFFFF').setBackground('#0D313F'); R.push(h); } });
  sh.getRange(Math.max(sh.getLastRow(), 5) + 1, 1, 1, R.length).setValues([R.map(h => o[h] == null ? '' : o[h])]);
}

// Guarda un archivo en MÓDULO 4 › Accidentes › establecimiento › año
function accArchivo_(cod, arch, fecha, nombre) {
  const vieja = audCarpetaEst_(miGrupo_(cod).dueno) || audCarpetaEst_(cod), base = DriveApp.getFolderById(PropertiesService.getScriptProperties().getProperty(MOD4.P_FOTOS));
  const dir = carpeta_(carpeta_(base, vieja ? vieja.getName() : cod), String(fecha).slice(0, 4)), tipo = arch.tipo || 'image/jpeg';
  return dir.createFile(Utilities.newBlob(Utilities.base64Decode(String(arch.base64).replace(/^data:[^,]+,/, '')), tipo, nombre + (/pdf/.test(tipo) ? '.pdf' : '.jpg'))).getUrl();
}

// ------------------------------------------------------------------ Estado de un siniestro a partir de sus novedades
// Devuelve { ok, estado, dias, ultima, error }. Se usa para calcular y para revisar que una novedad nueva tenga sentido.
function accSimular_(nov, hoy) {
  const L = nov.slice().sort((a, b) => String(a.FECHA).localeCompare(String(b.FECHA)) || String(a.CARGADO).localeCompare(String(b.CARGADO)));
  let estado = 'Denunciado', abierto = '', dias = 0, ultima = '';
  const cerrar = f => { if (abierto) { dias += Math.max(0, accDias_(abierto, f)); abierto = ''; } };
  for (const n of L) {
    const t = n.NOVEDAD, f = accIso_(n.FECHA), no = m => ({ ok: false, error: m + ' (novedad del ' + f.split('-').reverse().join('/') + ')' });
    if (t === 'Inicio de ILT') { if (['Denunciado', 'Sin baja'].indexOf(estado) < 0) return no('El inicio de ILT va antes de cualquier alta; si volvió a tener baja, es «Reingreso / reapertura»'); abierto = f; estado = 'En ILT'; }
    else if (t === 'Alta médica') { if (estado !== 'En ILT') return no('No hay una ILT abierta para dar de alta: falta cargar el inicio de ILT o el reingreso'); cerrar(f); estado = 'De alta'; }
    else if (t === 'Reingreso / reapertura') { if (['De alta', 'Cerrado', 'Sin baja'].indexOf(estado) < 0) return no('El reingreso va después de un alta, un cierre o un «Sin baja»'); abierto = f; estado = 'En ILT'; }
    else if (t === 'Sin baja laboral') { if (estado !== 'Denunciado') return no('«Sin baja laboral» va solo cuando todavía no hubo ILT'); estado = 'Sin baja'; }
    else if (t === 'Rechazo del Autoseguro') { cerrar(f); estado = 'Rechazado'; }
    else if (t === 'Inculpable / preexistente') { cerrar(f); estado = 'Inculpable'; }
    else if (t === 'Fin de tratamiento') { cerrar(f); estado = 'Cerrado'; }
    ultima = f + ' · ' + t;
  }
  if (abierto) dias += Math.max(0, accDias_(abierto, hoy));
  return { ok: true, estado: estado, dias: dias, ultima: ultima };
}
// Recalcula ESTADO, DIAS_BAJA y ULTIMA_NOVEDAD (de uno o de todos). Devuelve un texto para el registro.
function accRecalcular_(ss, soloId) {
  const S = accHoja_(ss), N = ss.getSheetByName('NOVEDADES'); if (!S || !N || S.getName() !== 'SINIESTROS') return 'Sin hojas nuevas';
  const H = S.getRange(5, 1, 1, S.getLastColumn()).getValues()[0].map(String), sin = accLeer_(S).filter(s => !soloId || s.ID === soloId);
  const nov = accLeer_(N).filter(n => n.ESTADO !== 'Anulada'), hoy = accHoy_(), jE = H.indexOf('ESTADO'), problemas = [];
  sin.forEach(s => {
    const r = accSimular_(nov.filter(n => n.ID_SINIESTRO === s.ID), hoy);
    if (!r.ok) { problemas.push(s.ID + ': ' + r.error); return; }
    S.getRange(s._fila, jE + 1, 1, 3).setValues([[s.ESTADO_HYS === 'Anulado' ? 'Anulado' : r.estado, r.dias, r.ultima]]);
  });
  return 'Recalculados: ' + sin.length + (problemas.length ? ' · Revisar: ' + problemas.join(' | ') : '');
}
// Para el menú y el activador nocturno
function accRecalcularTodo() { const ss = accLibro_(); if (!ss) return 'Sin libro'; const r = accRecalcular_(ss); Logger.log(r); return r; }
function instalarActivadorSiniestros() {   // ejecutar una vez: recalcula días y estados todas las noches (3 a 4 h)
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'accRecalcularTodo').forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('accRecalcularTodo').timeBased().everyDays(1).atHour(3).inTimezone(TZ).create();
  Logger.log('Listo: los siniestros se recalculan todas las noches.');
}

// ------------------------------------------------------------------ Entrada desde «Mi establecimiento» (acción m_accidente)
// x.op: 'lista' · 'novedad' (x.REEMPLAZA = corrige otra) · 'corregir' (datos del siniestro) · 'anular' (siniestro) ·
//       'anular_nov' (novedad) · sin op = denuncia nueva. Nada se borra: lo corregido o anulado queda anotado en OBSERVACIONES.
function accGuardar_(cod, x, quien) {
  if (!accActivo_(cod)) return { ok: false, mensaje: 'La carga de siniestros todavía no está habilitada para este establecimiento.' };
  const ss = accLibro_(); if (!ss) return { ok: false, mensaje: 'El libro de siniestros no está armado. Avisá a Higiene y Seguridad.' };
  if (x.op === 'lista') return accLista_(ss, cod);
  if (x.op === 'novedad') return accNovedad_(ss, cod, x, quien);
  if (x.op === 'corregir') return accCorregir_(ss, cod, x, quien);
  if (x.op === 'anular') return accAnular_(ss, cod, x, quien);
  if (x.op === 'anular_nov') return accAnularNov_(ss, cod, x, quien);
  return accDenuncia_(ss, cod, x, quien);
}
const accAhora_ = () => Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm');
const accHoyTxt_ = () => Utilities.formatDate(new Date(), TZ, 'dd/MM/yyyy');
const accFTxt_ = iso => iso ? String(iso).split('-').reverse().join('/') : '';
// Archivos adjuntos (uno o varios: fotos y PDF). Devuelve las direcciones, una por línea.
function accArchivos_(est, x, fecha, base) {
  const L = (x.archivos && x.archivos.length ? x.archivos : x.archivo && x.archivo.base64 ? [x.archivo] : []).filter(a => a && a.base64).slice(0, 8);
  return L.map((a, i) => accArchivo_(est, a, fecha, base + (L.length > 1 ? '_' + (i + 1) : '')));
}
const accHayArchivos_ = x => !!((x.archivos && x.archivos.some(a => a && a.base64)) || (x.archivo && x.archivo.base64));

// Revisa los datos de una denuncia (nueva o corregida). Devuelve { error } o los datos ya normalizados.
function accValidarDen_(ss, cod, x, idPropio) {
  const hoy = accHoy_(), dni = String(x.DNI || '').replace(/\D/g, ''), nro = accNro_(x.NRO_SINIESTRO), viene = accNro_(x.VIENE_DE);
  const vis = accVisibles_(cod), est = x.ESTABLECIMIENTO && vis.indexOf(String(x.ESTABLECIMIENTO)) >= 0 ? String(x.ESTABLECIMIENTO) : cod;
  const fa = accIso_(x.FECHA_ACCIDENTE), fc = accIso_(x.FECHA_CONOCIMIENTO), fd = accIso_(x.FECHA_DENUNCIA), no = m => ({ error: m });
  if (/^\d{12,}$/.test(nro)) return no('Ese es el número largo de la denuncia. Copiá el N.º de siniestro que empieza con CH (ej.: CH523636).');
  if (!/^CH\d{5,8}$/.test(nro)) return no('Revisá el N.º de siniestro: empieza con CH y sigue con números (ej.: CH523636).');
  if (viene && !/^CH\d{5,8}$/.test(viene)) return no('Revisá «Viene de»: tiene que ser un N.º de siniestro con CH.');
  if (!fa) return no('Falta la fecha del accidente.');
  if (fa > hoy) return no('La fecha del accidente no puede ser posterior a hoy.');
  if (ACC_TIPOS.indexOf(x.TIPO) < 0) return no('Elegí el tipo.');
  if (dni.length < 7 || dni.length > 8) return no('Revisá el DNI: tiene que tener 7 u 8 números.');
  if (!fc) return no('Falta la fecha en que el hospital se enteró.');
  if (!fd) return no('Falta la fecha de la denuncia al Autoseguro.');
  if (fc < fa && x.TIPO !== 'Enfermedad profesional') return no('La fecha en que el hospital se enteró no puede ser anterior al accidente.');
  if (fd < fc) return no('La fecha de la denuncia no puede ser anterior a la fecha en que el hospital se enteró.');
  if (fc > hoy || fd > hoy) return no('Las fechas no pueden ser posteriores a hoy.');
  if (['Sí', 'No'].indexOf(String(x.COPIA_ENTREGADA).slice(0, 2)) < 0) return no('Indicá si se entregó la copia de la denuncia al trabajador.');
  const ya = accLeer_(accHoja_(ss)).find(s => accNro_(s.NRO_SINIESTRO) === nro && s.ESTADO_HYS !== 'Anulado' && s.ID !== idPropio);
  if (ya) return no('El siniestro ' + nro + ' ya está cargado (' + ya.ID + ', ' + ya.APELLIDO_Y_NOMBRE + '). Si es una novedad (alta, reingreso…), cargala desde «Siniestros».');
  return { est: est, dni: dni, nro: nro, viene: viene, fa: fa, fc: fc, fd: fd };
}
function accPersonaDatos_(dni, est, nomEscrito) {
  let nom = String(nomEscrito || '').trim(), serv = '', fun = '', ing = '';
  try { const r = accPersona_(dni, est); if (r) { nom = (persVal_(r, 'APELLIDOS') + ' ' + persVal_(r, 'NOMBRES')).trim() || nom; serv = persVal_(r, 'SERVICIO'); fun = persVal_(r, 'FUNCION_DETALLE') || persVal_(r, 'FUNCION'); ing = accIso_(persVal_(r, 'FECHA_INGRESO')); } } catch (e) {}
  return { nom: nom, serv: serv, fun: fun, ing: ing };
}

function accDenuncia_(ss, cod, x, quien) {
  const S = accHoja_(ss); if (S.getName() !== 'SINIESTROS') return { ok: false, mensaje: 'Falta actualizar el libro de siniestros. Avisá a Higiene y Seguridad.' };
  const lista = accLeer_(S);
  if (x.idLocal && lista.some(s => String(s.ID_APP) === String(x.idLocal))) return { ok: true, repetido: true };
  const v = accValidarDen_(ss, cod, x, ''); if (v.error) return { ok: false, mensaje: v.error };
  if (!accHayArchivos_(x) && !x.fotoUrl) return { ok: false, mensaje: 'Falta el PDF o la foto de la denuncia.' };
  const p = accPersonaDatos_(v.dni, v.est, x.APELLIDO_Y_NOMBRE);
  if (!p.nom) return { ok: false, mensaje: 'Ese DNI no está en la base de trabajadores: escribí el apellido y nombre.' };
  const urls = x.fotoUrl ? [x.fotoUrl] : accArchivos_(v.est, x, v.fa, 'Denuncia_' + v.nro + '_' + v.dni);
  const anio = v.fa.slice(0, 4), base = 'ACC-' + v.est + '-' + anio + '-', prev = lista.filter(s => String(s.ID).indexOf(base) === 0).length;
  const idAcc = base + ('00' + (prev + 1)).slice(-3), P = accParam_(ss), dPlazo = accDias_(v.fc, v.fd);
  const o = { ID: idAcc, NRO_SINIESTRO: v.nro, VIENE_DE: v.viene, TIPO: x.TIPO, FECHA_ACCIDENTE: v.fa, HORA: String(x.HORA || '').trim(), ESTABLECIMIENTO: v.est, SITIO: x.SITIO || '', DNI: v.dni,
    APELLIDO_Y_NOMBRE: p.nom, SERVICIO: p.serv || 's/d (revisar)', FUNCION: p.fun || 's/d (revisar)', FECHA_INGRESO: p.ing || 's/d', EN_BASE: p.serv ? 'Sí' : 'No',
    FECHA_CONOCIMIENTO: v.fc, FECHA_DENUNCIA: v.fd, COPIA_ENTREGADA: x.COPIA_ENTREGADA, DENUNCIA: urls.join('\n'), OBSERVACIONES: String(x.OBSERVACIONES || '').trim(), CARGO: quien,
    CARGADO: accAhora_(), ESTADO: 'Denunciado', DIAS_BAJA: 0, ULTIMA_NOVEDAD: '',
    DENUNCIA_EN_PLAZO: dPlazo <= P.DIAS_PLAZO_DENUNCIA ? 'Sí' : 'No (' + dPlazo + ' días)', ESTADO_HYS: 'Pendiente de análisis', ID_APP: x.idLocal || '',
    CIE10: String(x.CIE10 || '').trim() || 's/d (revisar)', DIAGNOSTICO: String(x.DIAGNOSTICO || '').trim() || 's/d (revisar)' };
  accEscribir_(S, SIN_H, o);
  SpreadsheetApp.flush();   // queda escrito antes de liberar el turno: si la app reintenta el envío, no se duplica
  CacheService.getScriptCache().removeAll(['p_resumen', 'p_tablero']);
  return { ok: true, id: idAcc, persona: p.nom, enBase: !!p.serv };
}

// Busca un siniestro visible para quien entra por «cod»
function accBuscar_(ss, cod, id) { const vis = accVisibles_(cod); return accLeer_(accHoja_(ss)).find(r => r.ID === id && vis.indexOf(String(r.ESTABLECIMIENTO)) >= 0) || null; }
function accCelda_(sh, fila, col, valor) { const H = sh.getRange(5, 1, 1, sh.getLastColumn()).getValues()[0].map(String), j = H.indexOf(col); if (j >= 0) sh.getRange(fila, j + 1).setValue(valor); }

// Corrige los datos de un siniestro en el lugar (mismo ID). Cada cambio queda anotado en OBSERVACIONES.
function accCorregir_(ss, cod, x, quien) {
  const S = accHoja_(ss), s = accBuscar_(ss, cod, x.ID_SINIESTRO);
  if (!s) return { ok: false, mensaje: 'No se encontró el siniestro. Actualizá la lista y probá de nuevo.' };
  if (s.ESTADO_HYS === 'Anulado') return { ok: false, mensaje: 'Ese siniestro está anulado.' };
  if (x.idLocal && String(s.OBSERVACIONES).indexOf('[' + x.idLocal + ']') >= 0) return { ok: true, repetido: true };
  const v = accValidarDen_(ss, cod, x, s.ID); if (v.error) return { ok: false, mensaje: v.error };
  const nuevo = { NRO_SINIESTRO: v.nro, VIENE_DE: v.viene, TIPO: x.TIPO, FECHA_ACCIDENTE: v.fa, HORA: String(x.HORA || '').trim(), ESTABLECIMIENTO: v.est, SITIO: x.SITIO || '',
    FECHA_CONOCIMIENTO: v.fc, FECHA_DENUNCIA: v.fd, COPIA_ENTREGADA: x.COPIA_ENTREGADA, CIE10: String(x.CIE10 || '').trim() || 's/d (revisar)', DIAGNOSTICO: String(x.DIAGNOSTICO || '').trim() || 's/d (revisar)' };
  if (v.dni !== String(s.DNI)) {   // otra persona: se vuelve a buscar en la base
    const p = accPersonaDatos_(v.dni, v.est, x.APELLIDO_Y_NOMBRE); if (!p.nom) return { ok: false, mensaje: 'Ese DNI no está en la base de trabajadores: escribí el apellido y nombre.' };
    Object.assign(nuevo, { DNI: v.dni, APELLIDO_Y_NOMBRE: p.nom, SERVICIO: p.serv || 's/d (revisar)', FUNCION: p.fun || 's/d (revisar)', FECHA_INGRESO: p.ing || 's/d', EN_BASE: p.serv ? 'Sí' : 'No' });
  } else if (String(x.APELLIDO_Y_NOMBRE || '').trim() && s.EN_BASE === 'No') nuevo.APELLIDO_Y_NOMBRE = String(x.APELLIDO_Y_NOMBRE).trim();
  const P = accParam_(ss), dPlazo = accDias_(v.fc, v.fd); nuevo.DENUNCIA_EN_PLAZO = dPlazo <= P.DIAS_PLAZO_DENUNCIA ? 'Sí' : 'No (' + dPlazo + ' días)';
  const cambios = Object.keys(nuevo).filter(k => k !== 'DENUNCIA_EN_PLAZO' && String(accIso_(s[k]) || s[k] || '') !== String(nuevo[k] || ''));
  const urls = accHayArchivos_(x) ? accArchivos_(v.est, x, v.fa, 'Denuncia_' + v.nro + '_' + v.dni + '_agregado') : [];
  if (!cambios.length && !urls.length && !String(x.OBSERVACIONES || '').trim()) return { ok: false, mensaje: 'No cambiaste ningún dato.' };
  const H = S.getRange(5, 1, 1, S.getLastColumn()).getValues()[0].map(String);
  Object.keys(nuevo).forEach(k => { const j = H.indexOf(k); if (j >= 0) S.getRange(s._fila, j + 1).setValue(nuevo[k]); });
  if (urls.length) accCelda_(S, s._fila, 'DENUNCIA', [String(s.DENUNCIA || '')].concat(urls).filter(Boolean).join('\n'));
  const nota = 'Corregido ' + accHoyTxt_() + ' por ' + quien + (cambios.length ? ': ' + cambios.map(k => k + ' «' + (accIso_(s[k]) ? accFTxt_(accIso_(s[k])) : s[k]) + '»').join(', ') + ' (antes)' : '') +
    (urls.length ? ' · ' + urls.length + ' archivo(s) agregado(s)' : '') + (String(x.OBSERVACIONES || '').trim() ? ' · ' + String(x.OBSERVACIONES).trim() : '') + ' [' + (x.idLocal || '') + ']';
  accCelda_(S, s._fila, 'OBSERVACIONES', [String(s.OBSERVACIONES || ''), nota].filter(Boolean).join(' · '));
  SpreadsheetApp.flush(); accRecalcular_(ss, s.ID);
  return { ok: true, id: s.ID };
}
// Anula un siniestro mal cargado (queda en la planilla, marcado y con el motivo)
function accAnular_(ss, cod, x, quien) {
  const S = accHoja_(ss), s = accBuscar_(ss, cod, x.ID_SINIESTRO), motivo = String(x.MOTIVO || '').trim();
  if (!s) return { ok: false, mensaje: 'No se encontró el siniestro.' };
  if (s.ESTADO_HYS === 'Anulado') return { ok: true, repetido: true };
  if (motivo.length < 5) return { ok: false, mensaje: 'Escribí el motivo (ej.: cargado dos veces).' };
  accCelda_(S, s._fila, 'ESTADO_HYS', 'Anulado'); accCelda_(S, s._fila, 'ESTADO', 'Anulado');
  accCelda_(S, s._fila, 'OBSERVACIONES', [String(s.OBSERVACIONES || ''), 'Anulado ' + accHoyTxt_() + ' por ' + quien + ': ' + motivo].filter(Boolean).join(' · '));
  SpreadsheetApp.flush(); CacheService.getScriptCache().removeAll(['p_resumen', 'p_tablero']);
  return { ok: true, id: s.ID };
}
// Anula una novedad mal cargada y recalcula el siniestro
function accAnularNov_(ss, cod, x, quien) {
  const N = ss.getSheetByName('NOVEDADES'), n = accLeer_(N).find(r => r.ID === x.ID_NOVEDAD), motivo = String(x.MOTIVO || '').trim();
  if (!n || !accBuscar_(ss, cod, n.ID_SINIESTRO)) return { ok: false, mensaje: 'No se encontró la novedad.' };
  if (n.ESTADO === 'Anulada') return { ok: true, repetido: true };
  if (motivo.length < 5) return { ok: false, mensaje: 'Escribí el motivo (ej.: fecha equivocada).' };
  const otras = accLeer_(N).filter(r => r.ID_SINIESTRO === n.ID_SINIESTRO && r.ESTADO !== 'Anulada' && r.ID !== n.ID), sim = accSimular_(otras, accHoy_());
  if (!sim.ok) return { ok: false, mensaje: 'Si se anula esta, las demás novedades no cierran: ' + sim.error + '. Anulá primero las posteriores.' };
  accCelda_(N, n._fila, 'ESTADO', 'Anulada');
  accCelda_(N, n._fila, 'OBSERVACIONES', [String(n.OBSERVACIONES || ''), 'Anulada ' + accHoyTxt_() + ' por ' + quien + ': ' + motivo].filter(Boolean).join(' · '));
  SpreadsheetApp.flush(); accRecalcular_(ss, n.ID_SINIESTRO);
  return { ok: true, id: n.ID_SINIESTRO, estado: sim.estado, dias: sim.dias };
}

function accNovedad_(ss, cod, x, quien) {
  const S = accHoja_(ss), N = ss.getSheetByName('NOVEDADES'); if (!N) return { ok: false, mensaje: 'Falta actualizar el libro de siniestros. Avisá a Higiene y Seguridad.' };
  const s = accBuscar_(ss, cod, x.ID_SINIESTRO);
  if (!s) return { ok: false, mensaje: 'No se encontró el siniestro. Actualizá la lista y probá de nuevo.' };
  if (s.ESTADO_HYS === 'Anulado') return { ok: false, mensaje: 'Ese siniestro está anulado.' };
  const f = accIso_(x.FECHA), hoy = accHoy_(), t = x.NOVEDAD, todas = accLeer_(N), viejo = x.REEMPLAZA ? todas.find(n => n.ID === x.REEMPLAZA && n.ID_SINIESTRO === s.ID) : null;
  if (x.idLocal && todas.some(n => String(n.ID_APP) === String(x.idLocal))) return { ok: true, repetido: true };
  if (x.REEMPLAZA && (!viejo || viejo.ESTADO === 'Anulada')) return { ok: false, mensaje: 'La novedad que querés corregir ya no está vigente. Actualizá la lista.' };
  if (NOV_TIPOS.indexOf(t) < 0) return { ok: false, mensaje: 'Elegí la novedad.' };
  if (!f) return { ok: false, mensaje: 'Falta la fecha.' };
  if (f > hoy) return { ok: false, mensaje: 'La fecha no puede ser posterior a hoy.' };
  if (f < accIso_(s.FECHA_ACCIDENTE) && s.TIPO !== 'Enfermedad profesional') return { ok: false, mensaje: 'La fecha no puede ser anterior al accidente (' + accFTxt_(accIso_(s.FECHA_ACCIDENTE)) + ').' };
  const archivoViejo = viejo && viejo.COMPROBANTE ? String(viejo.COMPROBANTE) : '';   // los comprobantes de la corregida se mantienen
  if (NOV_PIDE_ARCHIVO.indexOf(t) >= 0 && !accHayArchivos_(x) && !archivoViejo) return { ok: false, mensaje: 'Adjuntá la notificación del Autoseguro.' };
  if (t === 'Otra' && !String(x.OBSERVACIONES || '').trim()) return { ok: false, mensaje: 'Contá brevemente cuál es la novedad.' };
  const nuevo = { FECHA: f, NOVEDAD: t, CARGADO: accAhora_() };
  const sim = accSimular_(todas.filter(n => n.ID_SINIESTRO === s.ID && n.ESTADO !== 'Anulada' && (!viejo || n.ID !== viejo.ID)).concat([nuevo]), hoy);
  if (!sim.ok) return { ok: false, mensaje: sim.error + '.' };
  const urls = accArchivos_(String(s.ESTABLECIMIENTO), x, f, t.split(' ')[0] + '_' + s.NRO_SINIESTRO + '_' + f);
  const prev = todas.filter(n => n.ID_SINIESTRO === s.ID).length, idNov = s.ID + '-N' + ('0' + (prev + 1)).slice(-2);
  accEscribir_(N, NOV_H, { ID: idNov, ID_SINIESTRO: s.ID, NRO_SINIESTRO: s.NRO_SINIESTRO, FECHA: f, NOVEDAD: t, COMPROBANTE: [archivoViejo].concat(urls).filter(Boolean).join('\n'),
    OBSERVACIONES: [String(x.OBSERVACIONES || '').trim(), viejo ? 'Corrige a ' + viejo.ID : ''].filter(Boolean).join(' · '), CARGO: quien, CARGADO: nuevo.CARGADO, ESTADO: 'Vigente', ID_APP: x.idLocal || '' });
  if (viejo) { accCelda_(N, viejo._fila, 'ESTADO', 'Anulada'); accCelda_(N, viejo._fila, 'OBSERVACIONES', [String(viejo.OBSERVACIONES || ''), 'Corregida ' + accHoyTxt_() + ' por ' + quien + ': la reemplaza ' + idNov].filter(Boolean).join(' · ')); }
  if (t === 'Copia de denuncia entregada') accCelda_(S, s._fila, 'COPIA_ENTREGADA', 'Sí (' + accFTxt_(f) + ')');
  SpreadsheetApp.flush();
  accRecalcular_(ss, s.ID);
  return { ok: true, id: s.ID, estado: sim.estado, dias: sim.dias };
}

// Siniestros del establecimiento (y los que se cargan junto con él) para la pantalla de Personal, con los avisos de cada uno.
// «datos» trae lo necesario para corregir (incluye el diagnóstico, que la app solo muestra en el formulario de corrección).
function accLista_(ss, cod) {
  const vis = accVisibles_(cod), hoy = accHoy_(), P = accParam_(ss), N = ss.getSheetByName('NOVEDADES'), S = accHoja_(ss);
  const nov = N ? accLeer_(N).filter(n => n.ESTADO !== 'Anulada') : [];
  const L = accLeer_(S).filter(s => vis.indexOf(String(s.ESTABLECIMIENTO)) >= 0 && s.ESTADO_HYS !== 'Anulado').map(s => {
    const mias = nov.filter(n => n.ID_SINIESTRO === s.ID).sort((a, b) => String(a.FECHA).localeCompare(String(b.FECHA)));
    const sim = accSimular_(mias, hoy), estado = sim.ok ? sim.estado : String(s.ESTADO || 'Denunciado'), avisos = [];
    const ult = mias.length ? accIso_(mias[mias.length - 1].FECHA) : accIso_(s.FECHA_DENUNCIA) || accIso_(s.FECHA_ACCIDENTE), sin = ult ? accDias_(ult, hoy) : 0;
    if (estado === 'En ILT' && sin >= P.DIAS_ILT_SIN_NOVEDAD) avisos.push(['wa', 'Sin novedades hace ' + sin + ' días: ¿sigue en ILT?']);
    if (estado === 'Denunciado' && sin >= P.DIAS_DENUNCIADO_SIN_NOVEDAD) avisos.push(['wa', '¿Tuvo baja? Cargá «Inicio de ILT» o «Sin baja laboral»']);
    if (String(s.COPIA_ENTREGADA) === 'No') avisos.push(['wa', 'Falta entregar la copia de la denuncia al trabajador']);
    if (/^No/.test(String(s.DENUNCIA_EN_PLAZO))) avisos.push(['ok', 'Denuncia fuera de las 48 h']);
    if (!sim.ok) avisos.push(['er', 'Revisar novedades: ' + sim.error]);
    const urls = String(s.DENUNCIA || '').split(/\s*\n\s*|\s+·\s+/).filter(u => /^https?:/.test(u));
    return { id: s.ID, nro: s.NRO_SINIESTRO, nombre: s.APELLIDO_Y_NOMBRE, dni: String(s.DNI), tipo: s.TIPO, fecha: accIso_(s.FECHA_ACCIDENTE), est: s.ESTABLECIMIENTO, sitio: s.SITIO,
      estado: estado, dias: sim.ok ? sim.dias : s.DIAS_BAJA, abierto: ACC_ABIERTOS.indexOf(estado) >= 0, avisos: avisos, denuncia: urls[0] || '', denuncias: urls,
      datos: { NRO_SINIESTRO: s.NRO_SINIESTRO, VIENE_DE: s.VIENE_DE, TIPO: s.TIPO, FECHA_ACCIDENTE: accIso_(s.FECHA_ACCIDENTE), HORA: String(s.HORA || '').replace(/^s\/d.*/, ''), ESTABLECIMIENTO: s.ESTABLECIMIENTO, SITIO: s.SITIO,
        DNI: String(s.DNI), EN_BASE: s.EN_BASE, FECHA_CONOCIMIENTO: accIso_(s.FECHA_CONOCIMIENTO), FECHA_DENUNCIA: accIso_(s.FECHA_DENUNCIA), COPIA_ENTREGADA: /^S/.test(String(s.COPIA_ENTREGADA)) ? 'Sí' : /^No/.test(String(s.COPIA_ENTREGADA)) ? 'No' : '',
        CIE10: String(s.CIE10 || '').replace(/^s\/d.*/, ''), DIAGNOSTICO: String(s.DIAGNOSTICO || '').replace(/^s\/d.*/, '') },
      novedades: mias.map(n => ({ id: n.ID, fecha: accIso_(n.FECHA), novedad: n.NOVEDAD, urls: String(n.COMPROBANTE || '').split(/\s*\n\s*/).filter(u => /^https?:/.test(u)), obs: n.OBSERVACIONES })) };
  }).sort((a, b) => (b.abierto - a.abierto) || b.fecha.localeCompare(a.fecha));
  const sedes = vis.map(e => ({ est: e, sitios: (() => { try { return miSitios_(e); } catch (er) { return []; } })() }));
  return { ok: true, lista: L, sedes: sedes, tipos: NOV_TIPOS, pideArchivo: NOV_PIDE_ARCHIVO, hoy: hoy };
}

// Busca a la persona por DNI: primero en la hoja de su establecimiento (rápido) y, si no está, en toda la BASE DE TRABAJADORES
function accPersona_(dni, cod) {
  const bt = SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('BASE_TRABAJADORES_ID'));
  const hojas = [cod, miGrupo_(cod).dueno].filter((h, i, a) => h && a.indexOf(h) === i).map(h => bt.getSheetByName(h)).filter(Boolean);
  for (const sh of hojas) {
    const H = bjCabTrab_(sh), j = H.indexOf('DNI'); if (j < 0 || sh.getLastRow() < 6) continue;
    const c = sh.getRange(6, j + 1, sh.getLastRow() - 5, 1).createTextFinder(dni).matchEntireCell(true).findNext();
    if (c) return { H: H, v: sh.getRange(c.getRow(), 1, 1, H.length).getValues()[0] };
  }
  const r = persBuscar_(persIndice_(), '', dni, cod); return r.p || null;
}

// ------------------------------------------------------------------ Panel de gestión (portal de HyS · solo clave maestra)
// Todos los siniestros de la red, con diagnóstico, novedades y archivos (p_sin_lista)
function accPortalLista_() {
  const ss = accLibro_(); if (!ss) return { ok: false, mensaje: 'El libro de siniestros no está armado.' };
  const hoy = accHoy_(), P = accParam_(ss), N = ss.getSheetByName('NOVEDADES'), nov = N ? accLeer_(N).filter(n => n.ESTADO !== 'Anulada') : [];
  const urls = t => String(t || '').split(/\s*\n\s*|\s+·\s+/).filter(u => /^https?:/.test(u));
  const L = accLeer_(accHoja_(ss)).filter(s => s.ESTADO_HYS !== 'Anulado').map(s => {
    const mias = nov.filter(n => n.ID_SINIESTRO === s.ID).sort((a, b) => String(a.FECHA).localeCompare(String(b.FECHA))), sim = accSimular_(mias, hoy), estado = sim.ok ? sim.estado : String(s.ESTADO || 'Denunciado');
    const ult = mias.length ? accIso_(mias[mias.length - 1].FECHA) : accIso_(s.FECHA_DENUNCIA) || accIso_(s.FECHA_ACCIDENTE), sin = ult ? accDias_(ult, hoy) : 0, avisos = [];
    if (estado === 'En ILT' && sin >= P.DIAS_ILT_SIN_NOVEDAD) avisos.push('Sin novedades hace ' + sin + ' días');
    if (estado === 'Denunciado' && sin >= P.DIAS_DENUNCIADO_SIN_NOVEDAD) avisos.push('¿Tuvo baja?');
    if (String(s.COPIA_ENTREGADA) === 'No') avisos.push('Falta copia al trabajador');
    if (/^No/.test(String(s.DENUNCIA_EN_PLAZO))) avisos.push('Denuncia fuera de plazo');
    if (s.EN_BASE === 'No') avisos.push('No está en la base de trabajadores');
    if (/s\/d/.test(String(s.CIE10) + String(s.DIAGNOSTICO))) avisos.push('Diagnóstico s/d');
    if (!sim.ok) avisos.push('Novedades que no cierran');
    return { id: s.ID, nro: s.NRO_SINIESTRO, viene: s.VIENE_DE, tipo: s.TIPO, fecha: accIso_(s.FECHA_ACCIDENTE), hora: s.HORA, est: s.ESTABLECIMIENTO, sitio: s.SITIO, dni: String(s.DNI), nombre: s.APELLIDO_Y_NOMBRE,
      servicio: s.SERVICIO, funcion: s.FUNCION, ingreso: accIso_(s.FECHA_INGRESO), enBase: s.EN_BASE, conoce: accIso_(s.FECHA_CONOCIMIENTO), denuncia: accIso_(s.FECHA_DENUNCIA), plazo: s.DENUNCIA_EN_PLAZO,
      copia: s.COPIA_ENTREGADA, cie10: s.CIE10, diagnostico: s.DIAGNOSTICO, archivos: urls(s.DENUNCIA), obs: s.OBSERVACIONES, cargo: s.CARGO, cargado: s.CARGADO,
      estado: estado, dias: sim.ok ? sim.dias : s.DIAS_BAJA, abierto: ACC_ABIERTOS.indexOf(estado) >= 0, estadoHys: s.ESTADO_HYS, avisos: avisos,
      novedades: mias.map(n => ({ fecha: accIso_(n.FECHA), novedad: n.NOVEDAD, urls: urls(n.COMPROBANTE), obs: n.OBSERVACIONES, cargo: n.CARGO })) };
  }).sort((a, b) => b.fecha.localeCompare(a.fecha));
  return { ok: true, lista: L, libro: ss.getUrl(), hoy: hoy };
}
// Lo que el módulo 4 sabe de una persona (ficha de Personas): sus siniestros y su exposición según la NTE
function accPortalPersona_(dni, hoja) {
  dni = String(dni || '').replace(/\D/g, ''); if (!dni) return { ok: true, siniestros: [], exposicion: null };
  let sin = [];
  try { const r = accPortalLista_(); if (r.ok) sin = r.lista.filter(s => s.dni === dni); } catch (e) {}
  return { ok: true, siniestros: sin, exposicion: accExposicion_(dni, hoja) };
}
// Exposición de la persona según la matriz de la NTE (o lo propio de su ficha, que manda)
// «hoja» (establecimiento) hace la búsqueda rápida; sin ella se busca en toda la base de trabajadores
function accExposicion_(dni, hoja) {
  try {
    dni = String(dni || '').replace(/\D/g, '');
    let p = null;
    if (hoja) { const r = accPersona_(dni, limpio_(hoja)); if (r) p = { H: r.H, v: r.v, hoja: r.hoja || limpio_(hoja) }; }
    if (!p) { const r = persBuscar_(persIndice_(), '', dni, ''); if (!r.p) return null; p = r.p; }
    const o = {}; p.H.forEach((h, j) => o[h] = bjVal_(p.v[j]));
    const G = nteGrupo_(p.hoja), d = G.duenio, mm = {};
    pTabla_(nteHojaMatriz_(), NTE_MAT_H.length).filter(x => x.v[0] === d).forEach(x => mm[nteClave_(d, bjVal_(x.v[1]), bjVal_(x.v[2]))] = { agentes: bjVal_(x.v[4]) });
    const ag = nteAgentes_(o, mm, d), cat = nteCatalogo_();
    if (!ag.length) return { estado: 'sin definir', hoja: p.hoja, servicio: o.SERVICIO, funcion: nteFuncion_(o), agentes: [] };
    if (ag[0] === 'NO EXPUESTO') return { estado: 'no expuesto', hoja: p.hoja, servicio: o.SERVICIO, funcion: nteFuncion_(o), agentes: [] };
    return { estado: 'expuesto', hoja: p.hoja, servicio: o.SERVICIO, funcion: nteFuncion_(o), propio: !!String(o.AGENTES_ESOP || '').trim(),
      agentes: ag.map(c => ({ cod: c, agente: (cat[c] || {}).agente || 'código no listado', tipo: (cat[c] || {}).tipo || '' })) };
  } catch (e) { return null; }
}

// Resumen para el panel de gestión (Tablero.gs puede leerlo)
function accResumen_() {
  try { const ss = accLibro_(); if (!ss) return null; const L = accLeer_(accHoja_(ss)).filter(s => s.ESTADO_HYS !== 'Anulado'), anio = accHoy_().slice(0, 4);
    return { anio: L.filter(s => accIso_(s.FECHA_ACCIDENTE).slice(0, 4) === anio).length, pendientes: L.filter(s => s.ESTADO_HYS === 'Pendiente de análisis').length,
      enIlt: L.filter(s => s.ESTADO === 'En ILT').length, sinBase: L.filter(s => s.EN_BASE === 'No').length, url: ss.getUrl() };
  } catch (e) { return null; }
}