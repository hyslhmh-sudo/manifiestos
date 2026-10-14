/**
 * SISTEMA HyS · CRUCE NOCTURNO PERSONAL ↔ CAPACITACIONES (Fase 1 de la separación en módulos)
 * Corre todos los días a las 3 h (cruceNocturnoPersonal). Reemplaza a sincronizarDesdeCapacitaciones (Bases.gs),
 * que escribía directo en la BASE DE TRABAJADORES. Cruza por DNI. Estudiantes y externos no cruzan.
 *
 * 1. BASE DE TRABAJADORES → capacitaciones (hoja PERSONAS): completa SOLO las celdas vacías de los datos laborales
 *    (FUNCION, FUNCION_DETALLE, SERVICIO, VINCULO, EMPRESA, EN_NTEAR); nunca pisa lo cargado. Cada cambio queda en
 *    HISTORIAL_CAMBIOS de capacitaciones. Si la persona está de Baja en la base, la marca REVISAR = Sí con el motivo.
 * 2. Capacitaciones → BASE DE TRABAJADORES: correo más nuevo, teléfono, jefatura (CARGO_CONDUCCION) y personas que faltan
 *    NO se escriben: quedan como propuesta en la Bandeja (una por establecimiento) y se aplican solo si se aprueban.
 *    La propuesta de la noche anterior que no se revisó queda «Reemplazada» por la nueva.
 * 3. Datos laborales distintos en las dos bases: hoja CRUCE_PERSONAL del libro general, para mirar. No cambia nada.
 * La BASE DE TRABAJADORES no se escribe nunca desde acá.
 */

const CRUCE = {
  ORIGEN: 'Cruce nocturno con capacitaciones',
  LABORALES: ['FUNCION', 'FUNCION_DETALLE', 'SERVICIO', 'VINCULO', 'EMPRESA', 'EN_NTEAR'],
  HOJAS_FUERA: ['INICIO', 'TODOS', 'DUPLICADOS', 'IMPORTACIONES', 'HISTORIAL', 'LISTAS', 'MATRIZ_EXPOSICION'],
  HORA: 3,
  MAX_DIFERENCIAS: 5000
};

function cruceNocturnoPersonal() {
  const t0 = Date.now(), props = PropertiesService.getScriptProperties();
  const bc = SpreadsheetApp.openById(props.getProperty('BASE_COMUN_ID')), bt = SpreadsheetApp.openById(props.getProperty('BASE_TRABAJADORES_ID'));
  const dniN = x => String(x == null ? '' : x).replace(/\D/g, '').replace(/^0+/, '');
  const vacio = x => { const s = limpio_(x instanceof Date ? Utilities.formatDate(x, TZ, 'dd/MM/yyyy') : x); return !s || /^s\/d/i.test(s); };
  const txt = x => x instanceof Date ? Utilities.formatDate(x, TZ, 'dd/MM/yyyy') : limpio_(x);
  const fechaN = x => { if (x instanceof Date) return x.getTime(); const m = String(x || '').match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/); return m ? new Date(m[3], m[2] - 1, m[1]).getTime() : 0; };

  // Equivalencias de nombres → código del establecimiento
  const eqv = {}, shQ = bc.getSheetByName('EQUIVALENCIAS');
  shQ.getRange(6, 1, Math.max(shQ.getLastRow() - 5, 1), 3).getValues().forEach(r => { if (r[0] && r[1]) eqv[sinTildes_(r[0])] = { cod: limpio_(r[1]), sitio: limpio_(r[2]) }; });

  // Índice de la BASE DE TRABAJADORES (solo lectura)
  const hojasBT = {}, activo = {}, baja = {};
  bt.getSheets().forEach(sh => {
    const h = sh.getName(); if (CRUCE.HOJAS_FUERA.indexOf(h) >= 0 || sh.getLastRow() < 6) { if (CRUCE.HOJAS_FUERA.indexOf(h) < 0) hojasBT[h] = true; return; }
    const H = sh.getRange(5, 1, 1, sh.getLastColumn()).getValues()[0].map(String), jD = H.indexOf('DNI'); if (jD < 0) return;
    hojasBT[h] = true;
    const jE = H.indexOf('ESTADO');
    sh.getRange(6, 1, sh.getLastRow() - 5, H.length).getValues().forEach(r => {
      const d = dniN(r[jD]); if (!/^\d{7,8}$/.test(d)) return;
      const o = { hoja: h }; H.forEach((k, j) => { if (k) o[k] = r[j]; });
      if (/^(Baja|Traslado)/i.test(limpio_(jE >= 0 ? r[jE] : ''))) { if (!baja[d]) baja[d] = o; } else if (!activo[d]) activo[d] = o;
    });
  });

  // Capacitaciones · PERSONAS
  const ssC = SpreadsheetApp.openById(BASES.CAPACITACIONES), shC = ssC.getSheetByName('PERSONAS'), v = shC.getDataRange().getValues(), HC = v[0].map(String), ic = k => HC.indexOf(k);
  const cambiadas = {}, histCap = [], diferencias = [], propuestas = {}, ahora = new Date();
  // Listas desplegables de capacitaciones (por ejemplo VINCULO: Planta, Contrato, Tercerizado, Cooperativa): solo se escribe un valor de la lista
  const listas = {};
  CRUCE.LABORALES.forEach(k => { const j = ic(k); if (j < 0 || v.length < 2) return;
    try { const rule = shC.getRange(2, j + 1).getDataValidation(); if (!rule) return;
      const t = rule.getCriteriaType(), c = rule.getCriteriaValues(); let vals = null;
      if (t === SpreadsheetApp.DataValidationCriteria.VALUE_IN_LIST) vals = c[0];
      else if (t === SpreadsheetApp.DataValidationCriteria.VALUE_IN_RANGE) vals = c[0].getValues().map(x => x[0]);
      if (vals) { listas[k] = {}; vals.forEach(x => { if (limpio_(x)) listas[k][sinTildes_(x)] = limpio_(x); }); }
    } catch (e) {} });
  let nCompletados = 0, nBajas = 0;
  const proponer = (hoja, c) => (propuestas[hoja] = propuestas[hoja] || []).push(Object.assign({ hoja: hoja }, c));

  for (let i = 1; i < v.length; i++) {
    const r = v[i], d = dniN(r[ic('DNI')]); if (!/^\d{7,8}$/.test(d)) continue;
    const pub = limpio_(r[ic('PUBLICO')]), vin = limpio_(r[ic('VINCULO')]);
    if ((pub !== 'Primario' && pub !== 'Secundario') || /estudiante|extern/i.test(vin)) continue;   // estudiantes y externos no cruzan
    const quien = (limpio_(r[ic('APELLIDOS')]) + ' ' + limpio_(r[ic('NOMBRES')])).trim() + ' (DNI ' + d + ')', p = activo[d];

    if (p) {
      // 1. Base → capacitaciones: solo lo vacío
      CRUCE.LABORALES.forEach(k => {
        const j = ic(k); if (j < 0 || !(k in p)) return;
        const bv = p[k], cv = r[j];
        if (!vacio(bv) && vacio(cv)) {
          const nuevo = listas[k] ? listas[k][sinTildes_(txt(bv))] : txt(bv);
          if (!nuevo) { diferencias.push([d, quien, p.hoja, k, txt(bv), '(vacío · el valor de la base no está en la lista de capacitaciones)']); return; }
          r[j] = nuevo; cambiadas[j] = true; histCap.push({ j: j, fila: [ahora, d, k, txt(cv), nuevo, CRUCE.ORIGEN, ''] });
        }
        else if (!vacio(bv) && !vacio(cv) && sinTildes_(txt(bv)) !== sinTildes_(txt(cv))) diferencias.push([d, quien, p.hoja, k, txt(bv), txt(cv)]);
      });
      // 2. Capacitaciones → base: a la Bandeja
      const mail = limpio_(r[ic('EMAIL')]).toLowerCase(), mailB = limpio_(p.EMAIL).toLowerCase();
      if (mail && mail !== mailB && (!mailB || fechaN(r[ic('EMAIL_FECHA')]) > fechaN(p.EMAIL_FECHA))) {
        proponer(p.hoja, { clave: quien, campo: 'EMAIL', antes: mailB, despues: mail });
        if (!vacio(r[ic('EMAIL_FECHA')])) proponer(p.hoja, { clave: quien, campo: 'EMAIL_FECHA', antes: txt(p.EMAIL_FECHA), despues: txt(r[ic('EMAIL_FECHA')]) });
      }
      const tel = txt(r[ic('TELEFONO')]);
      if (tel && !vacio(tel)) { if (vacio(p.TELEFONO)) proponer(p.hoja, { clave: quien, campo: 'TELEFONO', antes: '', despues: tel });
        else if (tel.replace(/\D/g, '') !== txt(p.TELEFONO).replace(/\D/g, '')) diferencias.push([d, quien, p.hoja, 'TELEFONO', txt(p.TELEFONO), tel]); }
      const jef = txt(r[ic('CARGO_CONDUCCION')]);
      if (jef && !vacio(jef) && sinTildes_(jef) !== sinTildes_(txt(p.CARGO_CONDUCCION))) proponer(p.hoja, { clave: quien, campo: 'CARGO_CONDUCCION', antes: txt(p.CARGO_CONDUCCION), despues: jef });
      continue;
    }

    if (baja[d]) {
      // Baja en la base: se avisa en capacitaciones (no se borra a nadie)
      const jR = ic('REVISAR'), jM = ic('MOTIVO_REVISION'), mot = 'Baja en la base de personal';
      if (jR >= 0 && jM >= 0 && String(r[jM]).indexOf(mot) < 0) {
        const antes = txt(r[jM]); r[jR] = 'Sí'; r[jM] = antes ? antes + ' · ' + mot : mot; cambiadas[jR] = cambiadas[jM] = true; nBajas++;
        histCap.push({ j: jM, fila: [ahora, d, 'REVISAR', antes, r[jM], CRUCE.ORIGEN, ''] });
      }
      continue;
    }

    // Persona que no está en la base: propuesta de alta
    const m = eqv[sinTildes_(r[ic('ESTABLECIMIENTO')])] || eqv[sinTildes_(r[ic('HOSPITAL_CABECERA')])];
    const hoja = m && hojasBT[m.cod] ? m.cod : (hojasBT.SIN_ASIGNAR ? 'SIN_ASIGNAR' : ''); if (!hoja) continue;
    const nueva = { DNI: d, APELLIDOS: txt(r[ic('APELLIDOS')]), NOMBRES: txt(r[ic('NOMBRES')]), SITIO: m ? m.sitio : '', FUNCION: txt(r[ic('FUNCION')]), FUNCION_DETALLE: txt(r[ic('FUNCION_DETALLE')]),
      SERVICIO: txt(r[ic('SERVICIO')]), VINCULO: vin, EMPRESA: txt(r[ic('EMPRESA')]), CARGO_CONDUCCION: txt(r[ic('CARGO_CONDUCCION')]), EMAIL: limpio_(r[ic('EMAIL')]).toLowerCase(),
      EMAIL_FECHA: txt(r[ic('EMAIL_FECHA')]), TELEFONO: txt(r[ic('TELEFONO')]), EN_NTEAR: txt(r[ic('EN_NTEAR')]), ESTADO: 'Activo' };
    if (hoja === 'SIN_ASIGNAR') { nueva.REVISAR = 'Sí'; nueva.MOTIVO_REVISION = 'Establecimiento no reconocido: ' + txt(r[ic('ESTABLECIMIENTO')]); }
    proponer(hoja, { clave: quien, campo: '(fila nueva)', antes: '', despues: [nueva.SERVICIO, nueva.FUNCION].filter(Boolean).join(' · ') || 'alta', nueva: nueva });
  }

  // Escritura en capacitaciones: solo las columnas que cambiaron. Si una columna no se puede escribir, se saltea y se avisa;
  // el historial guarda solo lo que de verdad se escribió.
  const fallidas = [];
  Object.keys(cambiadas).forEach(j => { j = Number(j);
    try { shC.getRange(2, j + 1, v.length - 1, 1).setValues(v.slice(1).map(r => [r[j]])); }
    catch (e) { fallidas.push(j); Logger.log('No se pudo escribir la columna ' + HC[j] + ': ' + e.message); } });
  const histOk = histCap.filter(h => fallidas.indexOf(h.j) < 0 && !(h.fila[2] === 'REVISAR' && fallidas.indexOf(ic('REVISAR')) >= 0)).map(h => h.fila);
  nCompletados = histOk.filter(f => f[2] !== 'REVISAR').length;
  if (histOk.length) { const sh = ssC.getSheetByName('HISTORIAL_CAMBIOS'); if (sh) sh.getRange(sh.getLastRow() + 1, 1, histOk.length, 7).setValues(histOk); }

  // Propuestas en la Bandeja: la de la noche anterior sin revisar queda «Reemplazada»
  conLock_(() => { const sh = bjHoja_(), n = sh.getLastRow() - 5; if (n < 1) return;
    const rows = sh.getRange(6, 1, n, 8).getValues(); rows.forEach((r, i) => { if (r[6] === CRUCE.ORIGEN && r[7] === 'Para revisar') sh.getRange(6 + i, 8).setValue('Reemplazada'); }); });
  let nProp = 0;
  Object.keys(propuestas).forEach(h => { bjGuardarPropuesta_('NOMINA_PERSONAL', h, CRUCE.ORIGEN, propuestas[h], [], CRUCE.ORIGEN, ''); nProp += propuestas[h].length; });

  // Hoja CRUCE_PERSONAL del libro general: resumen y diferencias para mirar
  const g = SpreadsheetApp.openById(CFG.GENERAL); let shD = g.getSheetByName('CRUCE_PERSONAL');
  if (!shD) { shD = g.insertSheet('CRUCE_PERSONAL'); shD.setFrozenRows(5); }
  shD.clearContents();
  const seg = Math.round((Date.now() - t0) / 1000), resumen = 'Último cruce: ' + Utilities.formatDate(ahora, TZ, 'dd/MM/yyyy HH:mm') + ' (' + seg + ' s) · ' + nCompletados + ' dato(s) completado(s) en capacitaciones · ' +
    nBajas + ' baja(s) marcada(s) para revisar · ' + nProp + ' cambio(s) propuesto(s) en la Bandeja · ' + diferencias.length + ' diferencia(s).';
  shD.getRange(1, 1, 3, 1).setValues([['Cruce nocturno · BASE DE TRABAJADORES y capacitaciones'], [resumen], ['Datos laborales distintos en las dos bases. Solo para mirar: el cruce no cambia nada de esta lista. Se corrige en la base que corresponda.']]);
  shD.getRange(1, 1).setFontWeight('bold').setFontSize(16).setFontColor('#0D313F'); shD.getRange(2, 1, 2, 1).setFontStyle('italic').setFontColor('#4F616B');
  const HD = ['DNI', 'PERSONA', 'ESTABLECIMIENTO', 'CAMPO', 'BASE_DE_TRABAJADORES', 'CAPACITACIONES'];
  shD.getRange(5, 1, 1, HD.length).setValues([HD]).setFontWeight('bold').setFontColor('#FFFFFF').setBackground('#0D313F');
  const filas = diferencias.slice(0, CRUCE.MAX_DIFERENCIAS); if (filas.length) shD.getRange(6, 1, filas.length, HD.length).setNumberFormat('@').setValues(filas);
  CacheService.getScriptCache().removeAll(['p_resumen', 'caps_dnis']);
  Logger.log(resumen);
}

// Una sola vez (06/10/2026): la primera prueba del cruce completó celdas vacías de capacitaciones y se cortó antes de
// anotarlas en HISTORIAL_CAMBIOS. Esto compara PERSONAS con la copia del respaldo y anota en el historial lo que cambió.
function historialPruebaCruce() {
  const RESPALDO = '1Ls4rrA008zsH6kDJKThZt7UZ7TaHwwQ5Q1vvBRvKiZk';   // BASE_PERSONAS_CAPACITACIONES_2026 · RESPALDO 2026-10-06
  const ssC = SpreadsheetApp.openById(BASES.CAPACITACIONES), a = ssC.getSheetByName('PERSONAS').getDataRange().getValues(),
    b = SpreadsheetApp.openById(RESPALDO).getSheetByName('PERSONAS').getDataRange().getValues(), Ha = a[0].map(String), Hb = b[0].map(String);
  const antes = {}; b.slice(1).forEach(r => { antes[String(r[Hb.indexOf('DNI')])] = r; });
  const filas = [], cuando = new Date();
  a.slice(1).forEach(r => { const dni = String(r[Ha.indexOf('DNI')]), o = antes[dni]; if (!o) return;
    CRUCE.LABORALES.forEach(k => { const ja = Ha.indexOf(k), jb = Hb.indexOf(k); if (ja < 0 || jb < 0) return;
      const viejo = limpio_(o[jb]), nuevo = limpio_(r[ja]); if (!viejo && nuevo) filas.push([cuando, dni, k, '', nuevo, CRUCE.ORIGEN + ' (prueba del 06/10, anotado después)', '']); }); });
  if (filas.length) { const sh = ssC.getSheetByName('HISTORIAL_CAMBIOS'); sh.getRange(sh.getLastRow() + 1, 1, filas.length, 7).setValues(filas); }
  Logger.log('Anotados en HISTORIAL_CAMBIOS: ' + filas.length + ' dato(s) completado(s) en la prueba.');
}

// Instalación (una vez): borra la tarea vieja sincronizarDesdeCapacitaciones y deja el cruce todos los días a las 3 h.
function instalarCruceNocturno() {
  let borradas = 0;
  ScriptApp.getProjectTriggers().filter(t => ['sincronizarDesdeCapacitaciones', 'cruceNocturnoPersonal'].indexOf(t.getHandlerFunction()) >= 0).forEach(t => { ScriptApp.deleteTrigger(t); borradas++; });
  ScriptApp.newTrigger('cruceNocturnoPersonal').timeBased().everyDays(1).atHour(CRUCE.HORA).inTimezone(TZ).create();
  Logger.log('Listo. Tareas viejas borradas: ' + borradas + '. El cruce corre todos los días a las ' + CRUCE.HORA + ' h. Tareas activas: ' +
    ScriptApp.getProjectTriggers().map(t => t.getHandlerFunction()).join(', ') + '.');
}