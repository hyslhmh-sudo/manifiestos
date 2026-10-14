/**
 * SISTEMA HyS · CARGA MANUAL de manifiestos (14.62 · 14/10/2026)
 * Respaldo de la aplicación: si «Mi establecimiento» no funciona, la referente carga cada manifiesto en su libro,
 * hoja CARGA MANUAL (una fila por corriente, desde la fila 7). Cada hora el sistema revisa las filas:
 *   · si están completas, las registra igual que la aplicación (libro del establecimiento y libro general, origen «Carga manual»);
 *   · si falta algo, lo escribe en la columna Estado y la vuelve a revisar en la hora siguiente;
 *   · nunca registra dos veces la misma fila ni un manifiesto que ya estaba cargado (mismo número, sitio y corriente).
 * Columnas: A Sitio · B Fecha · C N.º · D Corriente · E Contenedor · F Recipientes · G Tamaño (dm³) · H Cantidad · I Unidad ·
 *           J ¿Firmó el transportista? · K ¿Original en el establecimiento? · L Foto (enlace) · M Quién carga · N Estado.
 * No envía correos. Instalación: ejecutar una vez instalarCargaManual (tarea de cada hora). Prueba: procesarCargaManual.
 */
const CM = { HOJA: 'CARGA MANUAL', FILA: 7, COLS: 14, PRESUPUESTO_MS: 280000 };

function cmFecha_(v) {
  if (v instanceof Date && !isNaN(v)) return Utilities.formatDate(v, TZ, 'yyyy-MM-dd');
  const s = String(v || '').trim(), m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  return m ? m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2) : /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : '';
}

// Revisa la hoja CARGA MANUAL de un establecimiento. Devuelve cuántas filas registró y cuántas tienen algo para corregir.
function cmProcesarLibro_(cod) {
  const E = est_(cod); if (!E || !E.libro) return { registradas: 0, revisar: 0 };
  const ss = SpreadsheetApp.openById(E.libro), sh = ss.getSheetByName(CM.HOJA);
  if (!sh || sh.getLastRow() < CM.FILA) return { registradas: 0, revisar: 0 };
  const n = sh.getLastRow() - CM.FILA + 1, v = sh.getRange(CM.FILA, 1, n, CM.COLS).getValues(), hoy = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd');
  const grupos = {}, estados = v.map(r => r[13]);
  v.forEach((r, i) => {
    if (!r.slice(0, 13).some(c => String(c).trim() !== '')) return;   // fila vacía
    if (/^Registrad|^Ya estaba/.test(String(r[13]))) return;          // ya procesada
    const sitio = String(r[0]).trim(), fecha = cmFecha_(r[1]), nro = String(r[2]).trim(), corr = String(r[3]).trim().toUpperCase().slice(0, 2);
    const rec = num_(r[5]), tam = num_(r[6]), cant = num_(r[7]) !== '' ? num_(r[7]) : (rec !== '' && tam !== '' ? rec * tam : '');
    const falta = [];
    if (!sitio) falta.push('sitio'); if (!fecha) falta.push('fecha (dd/mm/aaaa)'); else if (fecha > hoy) falta.push('fecha (no puede ser posterior a hoy)');
    if (!nro) falta.push('N.º de manifiesto'); if (corr !== 'Y1' && corr !== 'Y3') falta.push('corriente (Y1 o Y3)');
    if (rec === '' && cant === '') falta.push('recipientes o cantidad retirada');
    if (falta.length) { estados[i] = 'Falta: ' + falta.join(', ') + '. Se vuelve a revisar en la próxima hora.'; return; }
    const k = sitio + '|' + fecha + '|' + nro;
    (grupos[k] = grupos[k] || { sitio: sitio, fecha: fecha, nro: nro, filas: [], res: [], r: r }).filas.push(i);
    grupos[k].res.push({ corriente: corr, cant: rec, tam: tam, vol: cant, uni: String(r[8]).trim() || 'dm³' });
  });
  let registradas = 0;
  Object.keys(grupos).forEach(k => {
    const g = grupos[k], r = g.r, ahora = Utilities.formatDate(new Date(), TZ, 'dd/MM/yyyy HH:mm');
    // Una corriente repetida en el mismo manifiesto: se avisa, no se suma
    const corrs = g.res.map(x => x.corriente); if (corrs.length !== new Set(corrs).size) { g.filas.forEach(i => estados[i] = 'Revisar: la misma corriente aparece dos veces para este manifiesto.'); return; }
    const m = { nro: g.nro, fecha: g.fecha, sitio: g.sitio, res: g.res, firma: String(r[9]).trim(), original: String(r[10]).trim(), fotoUrl: String(r[11]).trim(),
      persona: { nombre: String(r[12]).trim() || 's/d (carga manual)' }, obs: 'Carga manual (hoja CARGA MANUAL)', origen: 'Carga manual',
      idLocal: 'cm-' + cod + '-' + g.sitio + '-' + g.fecha + '-' + g.nro + '-' + corrs.sort().join('') };
    let res; try { res = conLock_(() => guardarManifiesto_(cod, m)); } catch (e) { res = { ok: false, mensaje: e.message }; }
    const txt = res.ok ? (res.repetido ? 'Ya estaba cargado (no se duplicó) · ' + ahora : 'Registrado ' + ahora)
      : res.error === 'duplicado' ? 'Ya estaba cargado: ' + res.mensaje : 'No se pudo registrar: ' + (res.mensaje || 'error') + '. Se vuelve a intentar en la próxima hora.';
    g.filas.forEach(i => estados[i] = txt); if (res.ok && !res.repetido) registradas += g.filas.length;
  });
  sh.getRange(CM.FILA, 14, n, 1).setValues(estados.map(x => [x == null ? '' : x]));
  return { registradas: registradas, revisar: estados.filter(x => /^Falta|^Revisar|^No se pudo/.test(String(x))).length };
}

// Tarea de cada hora: revisa la hoja CARGA MANUAL de todos los libros. Si se corta por tiempo, sigue en la próxima hora desde donde quedó.
function procesarCargaManual() {
  const t0 = Date.now(), P = PropertiesService.getScriptProperties(), cods = Object.keys(librosMapa_()).filter(k => k !== 'MAESTRA').sort();
  let i0 = Number(P.getProperty('CM_SIGUIENTE') || 0); if (i0 >= cods.length) i0 = 0;
  const hechos = [];
  let tot = 0, i = i0, vueltas = 0;
  for (; vueltas < cods.length; vueltas++, i = (i + 1) % cods.length) {
    if (Date.now() - t0 > CM.PRESUPUESTO_MS) break;
    try { const r = cmProcesarLibro_(cods[i]); tot += r.registradas; if (r.registradas || r.revisar) hechos.push(cods[i] + ': ' + r.registradas + ' registrada(s), ' + r.revisar + ' para corregir'); }
    catch (e) { hechos.push(cods[i] + ': error ' + e.message); }
  }
  P.setProperty('CM_SIGUIENTE', String(vueltas >= cods.length ? 0 : i));
  if (tot && typeof pcBump_ === 'function') pcBump_();   // que el portal muestre los manifiestos nuevos
  const t = 'Carga manual: ' + vueltas + ' de ' + cods.length + ' libros revisados. ' + (hechos.join(' · ') || 'Sin filas nuevas.');
  Logger.log(t); return t;
}

// Ejecutar una vez: crea la tarea de cada hora (borra la anterior si existía)
function instalarCargaManual() {
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'procesarCargaManual').forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('procesarCargaManual').timeBased().everyHours(1).create();
  const t = 'Listo: la hoja CARGA MANUAL de cada libro se revisa cada hora.'; Logger.log(t); return t;
}

// Desde el menú Sistema HyS: revisar ahora
function menuProcesarCargaManual() { SpreadsheetApp.getUi().alert(procesarCargaManual()); }

// Solo mira (no registra nada): cuántas filas con datos sin registrar hay en la CARGA MANUAL de cada libro
function verCargaManualPendiente() {
  const out = [];
  Object.keys(librosMapa_()).filter(k => k !== 'MAESTRA').forEach(k => { try {
    const sh = SpreadsheetApp.openById(est_(k).libro).getSheetByName(CM.HOJA); if (!sh || sh.getLastRow() < CM.FILA) return;
    const v = sh.getRange(CM.FILA, 1, sh.getLastRow() - CM.FILA + 1, CM.COLS).getValues().filter(r => r.slice(0, 13).some(c => String(c).trim() !== '') && !/^Registrad|^Ya estaba/.test(String(r[13])));
    if (v.length) out.push(k + ': ' + v.length + ' fila(s) · ' + v.slice(0, 3).map(r => [r[0], r[1] instanceof Date ? Utilities.formatDate(r[1], TZ, 'dd/MM/yyyy') : r[1], r[2], r[3]].join(' ')).join(' | '));
  } catch (e) { out.push(k + ': error ' + e.message); } });
  Logger.log(out.join('\n') || 'No hay filas pendientes en ninguna CARGA MANUAL.'); return out;
}
