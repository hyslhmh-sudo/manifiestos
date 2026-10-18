/**
 * SISTEMA HyS · CRUCE NOCTURNO PERSONAL ↔ CAPACITACIONES
 * Versión 18/10/2026: lee el libro nuevo «CAPACITACIONES · Sistema HyS» (CG.LIBRO, encabezado en la fila 5).
 * Antes leía BASE_PERSONAS_CAPACITACIONES_2026, que dejó de recibir datos el 15/10.
 * Corre todos los días a las 3 h (cruceNocturnoPersonal). Cruza por DNI.
 * Solo cruzan PUBLICO = Red Trelew o Red Chubut; Estudiantes y Profesionales externos quedan solo en capacitaciones.
 *
 * 1. BASE DE TRABAJADORES → capacitaciones (PERSONAS): completa SOLO las celdas vacías o «s/d» de los datos laborales
 *    (FUNCION, SERVICIO, VINCULO, EMPRESA); nunca pisa lo cargado. Cada cambio queda en _HISTORIAL del libro nuevo.
 *    Si la persona está de Baja en la base, marca REVISAR = Sí.
 * 2. Capacitaciones → BASE DE TRABAJADORES, DIRECTO (decisión del 18/10):
 *    · CORREO: se escribe en EMAIL si la base no tiene o si el de capacitaciones es más nuevo (ULTIMA_ACTUALIZACION > EMAIL_FECHA).
 *    · TELEFONO: igual que el correo. Solo se copian teléfonos de 10 dígitos (código de área + número); los otros van a CRUCE_PERSONAL.
 *    Cada dato escrito queda en la hoja HISTORIAL de la BASE DE TRABAJADORES. Si alguien cambió la celda mientras corría el cruce,
 *    no se pisa.
 * 3. Personas que faltan en la base: siguen como propuesta de alta en la Bandeja (se aplican solo si se aprueban).
 *    La propuesta de la noche anterior que no se revisó queda «Reemplazada» por la nueva.
 * 4. Datos laborales distintos en las dos bases: hoja CRUCE_PERSONAL del libro general, para mirar. No cambia nada.
 */

const CRUCE = {
  ORIGEN: 'Cruce nocturno con capacitaciones',
  LABORALES: ['FUNCION', 'FUNCION_DETALLE', 'SERVICIO', 'VINCULO', 'EMPRESA', 'EN_NTEAR'],   // los que no existan en el libro nuevo se saltean
  PUBLICOS: ['Red Trelew', 'Red Chubut'],
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
  const tel10 = x => { let s = String(x == null ? '' : x).replace(/\D/g, ''); s = s.replace(/^549/, '').replace(/^54/, '').replace(/^0/, ''); return /^\d{10}$/.test(s) ? s : ''; };
  const ahora = new Date(), hoyTxt = Utilities.formatDate(ahora, TZ, 'dd/MM/yyyy');

  // Equivalencias de nombres → código del establecimiento
  const eqv = {}, shQ = bc.getSheetByName('EQUIVALENCIAS');
  shQ.getRange(6, 1, Math.max(shQ.getLastRow() - 5, 1), 3).getValues().forEach(r => { if (r[0] && r[1]) eqv[sinTildes_(r[0])] = { cod: limpio_(r[1]), sitio: limpio_(r[2]) }; });

  // Índice de la BASE DE TRABAJADORES (con la fila de cada persona, para poder escribir correo y teléfono)
  const hojasBT = {}, colsBT = {}, activo = {}, baja = {};
  bt.getSheets().forEach(sh => {
    const h = sh.getName(); if (CRUCE.HOJAS_FUERA.indexOf(h) >= 0) return;
    if (sh.getLastRow() < 6) { hojasBT[h] = true; return; }
    const H = sh.getRange(5, 1, 1, sh.getLastColumn()).getValues()[0].map(x => String(x).trim()), jD = H.indexOf('DNI'); if (jD < 0) return;
    hojasBT[h] = true; colsBT[h] = H;
    const jE = H.indexOf('ESTADO');
    sh.getRange(6, 1, sh.getLastRow() - 5, H.length).getValues().forEach((r, i) => {
      const d = dniN(r[jD]); if (!/^\d{7,8}$/.test(d)) return;
      const o = { hoja: h, fila: i + 6 }; H.forEach((k, j) => { if (k) o[k] = r[j]; });
      if (/^(Baja|Traslado)/i.test(limpio_(jE >= 0 ? r[jE] : ''))) { if (!baja[d]) baja[d] = o; } else if (!activo[d]) activo[d] = o;
    });
  });

  // Capacitaciones · PERSONAS del libro nuevo (encabezado fila 5, datos desde la fila 6)
  const ssC = SpreadsheetApp.openById(CG.LIBRO), shC = ssC.getSheetByName('PERSONAS');
  if (!shC) throw new Error('No encuentro la hoja PERSONAS en el libro CAPACITACIONES · Sistema HyS.');
  const nC = shC.getLastRow() - 5, HC = shC.getRange(5, 1, 1, shC.getLastColumn()).getValues()[0].map(x => String(x).trim()), ic = k => HC.indexOf(k);
  const v = nC > 0 ? shC.getRange(6, 1, nC, HC.length).getValues() : [];
  const cambiadas = {}, histCap = [], diferencias = [], propuestas = {}, escribirBT = [];

  // Listas desplegables de capacitaciones (se lee la validación de la primera fila de datos, la 6)
  const listas = {};
  CRUCE.LABORALES.forEach(k => { const j = ic(k); if (j < 0 || !v.length) return;
    try { const rule = shC.getRange(6, j + 1).getDataValidation(); if (!rule) return;
      const t = rule.getCriteriaType(), c = rule.getCriteriaValues(); let vals = null;
      if (t === SpreadsheetApp.DataValidationCriteria.VALUE_IN_LIST) vals = c[0];
      else if (t === SpreadsheetApp.DataValidationCriteria.VALUE_IN_RANGE) vals = c[0].getValues().map(x => x[0]);
      if (vals) { listas[k] = {}; vals.forEach(x => { if (limpio_(x)) listas[k][sinTildes_(x)] = limpio_(x); }); }
    } catch (e) {} });
  let nBajas = 0;
  const proponer = (hoja, c) => (propuestas[hoja] = propuestas[hoja] || []).push(Object.assign({ hoja: hoja }, c));
  const val = (r, k) => ic(k) >= 0 ? r[ic(k)] : '';

  for (let i = 0; i < v.length; i++) {
    const r = v[i], d = dniN(val(r, 'DNI')); if (!/^\d{7,8}$/.test(d)) continue;
    const pub = limpio_(val(r, 'PUBLICO')), vin = limpio_(val(r, 'VINCULO'));
    if (CRUCE.PUBLICOS.indexOf(pub) < 0 || /estudiante|extern/i.test(vin)) continue;   // estudiantes y externos no cruzan
    const quien = (limpio_(val(r, 'APELLIDOS')) + ' ' + limpio_(val(r, 'NOMBRES'))).trim() + ' (DNI ' + d + ')', p = activo[d];
    const fCap = val(r, 'ULTIMA_ACTUALIZACION');

    if (p) {
      // 1. Base → capacitaciones: solo lo vacío
      CRUCE.LABORALES.forEach(k => {
        const j = ic(k); if (j < 0 || !(k in p)) return;
        const bv = p[k], cv = r[j];
        if (!vacio(bv) && vacio(cv)) {
          const nuevo = listas[k] ? listas[k][sinTildes_(txt(bv))] : txt(bv);
          if (!nuevo) { diferencias.push([d, quien, p.hoja, k, txt(bv), '(vacío · el valor de la base no está en la lista de capacitaciones)']); return; }
          r[j] = nuevo; cambiadas[j] = true; histCap.push({ j: j, o: { FECHA: ahora, QUIEN: CRUCE.ORIGEN, HOJA: 'PERSONAS', ID: d, CAMPO: k, ANTES: txt(cv), DESPUES: nuevo, MOTIVO: 'Completado desde la BASE DE TRABAJADORES (' + p.hoja + ')' } });
        }
        else if (!vacio(bv) && !vacio(cv) && sinTildes_(txt(bv)) !== sinTildes_(txt(cv))) diferencias.push([d, quien, p.hoja, k, txt(bv), txt(cv)]);
      });

      // 2. Capacitaciones → base: correo y teléfono directo, si el de capacitaciones es más nuevo
      const masNuevo = vacio(p.EMAIL_FECHA) || fechaN(fCap) > fechaN(p.EMAIL_FECHA);
      const mail = limpio_(val(r, 'CORREO')).toLowerCase(), mailB = limpio_(p.EMAIL).toLowerCase();
      let cambioMail = false;
      if ('EMAIL' in p && !vacio(mail) && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail) && mail !== mailB && (vacio(mailB) || masNuevo)) {
        escribirBT.push({ p: p, d: d, campo: 'EMAIL', antes: mailB, despues: mail }); cambioMail = true;
      }
      const telC = txt(val(r, 'TELEFONO'));
      if ('TELEFONO' in p && !vacio(telC)) {
        const t = tel10(telC), tB = txt(p.TELEFONO).replace(/\D/g, '');
        if (!t) diferencias.push([d, quien, p.hoja, 'TELEFONO', txt(p.TELEFONO), telC + ' (no tiene 10 dígitos: no se copió)']);
        else if (t !== tB && (vacio(p.TELEFONO) || masNuevo)) escribirBT.push({ p: p, d: d, campo: 'TELEFONO', antes: txt(p.TELEFONO), despues: t });
        else if (t !== tB) diferencias.push([d, quien, p.hoja, 'TELEFONO', txt(p.TELEFONO), telC]);
      }
      if (cambioMail && 'EMAIL_FECHA' in p) escribirBT.push({ p: p, d: d, campo: 'EMAIL_FECHA', antes: txt(p.EMAIL_FECHA), despues: vacio(fCap) ? hoyTxt : txt(fCap) });

      // Jefatura: solo si el libro de capacitaciones tiene la columna (el nuevo no la tiene)
      const jef = txt(val(r, 'CARGO_CONDUCCION'));
      if (jef && !vacio(jef) && sinTildes_(jef) !== sinTildes_(txt(p.CARGO_CONDUCCION))) proponer(p.hoja, { clave: quien, campo: 'CARGO_CONDUCCION', antes: txt(p.CARGO_CONDUCCION), despues: jef });
      continue;
    }

    if (baja[d]) {
      // Baja en la base: se avisa en capacitaciones (no se borra a nadie)
      const jR = ic('REVISAR');
      if (jR >= 0 && limpio_(r[jR]) !== 'Sí') {
        const antes = txt(r[jR]); r[jR] = 'Sí'; cambiadas[jR] = true; nBajas++;
        histCap.push({ j: jR, o: { FECHA: ahora, QUIEN: CRUCE.ORIGEN, HOJA: 'PERSONAS', ID: d, CAMPO: 'REVISAR', ANTES: antes, DESPUES: 'Sí', MOTIVO: 'Baja en la base de personal (' + baja[d].hoja + ')' } });
      }
      continue;
    }

    // Persona que no está en la base: propuesta de alta (el libro nuevo guarda el código del establecimiento: HMH, HZT…)
    const est = limpio_(val(r, 'ESTABLECIMIENTO'));
    const m = (hojasBT[est] ? { cod: est, sitio: '' } : null) || eqv[sinTildes_(est)] || eqv[sinTildes_(val(r, 'INSTITUCION'))];
    const hoja = m && hojasBT[m.cod] ? m.cod : (hojasBT.SIN_ASIGNAR ? 'SIN_ASIGNAR' : ''); if (!hoja) continue;
    const mailN = limpio_(val(r, 'CORREO')).toLowerCase(), telN = tel10(val(r, 'TELEFONO'));
    const nueva = { DNI: d, APELLIDOS: txt(val(r, 'APELLIDOS')), NOMBRES: txt(val(r, 'NOMBRES')), SITIO: m ? m.sitio : '', FUNCION: txt(val(r, 'FUNCION')),
      SERVICIO: txt(val(r, 'SERVICIO')), VINCULO: vin, EMPRESA: txt(val(r, 'EMPRESA')), EMAIL: vacio(mailN) ? '' : mailN,
      EMAIL_FECHA: vacio(mailN) ? '' : (vacio(fCap) ? hoyTxt : txt(fCap)), TELEFONO: telN, ESTADO: 'Activo' };
    if (hoja === 'SIN_ASIGNAR') { nueva.REVISAR = 'Sí'; nueva.MOTIVO_REVISION = 'Establecimiento no reconocido: ' + (est || txt(val(r, 'INSTITUCION'))); }
    proponer(hoja, { clave: quien, campo: '(fila nueva)', antes: '', despues: [nueva.SERVICIO, nueva.FUNCION].filter(Boolean).join(' · ') || 'alta', nueva: nueva });
  }

  // Escritura en capacitaciones: solo las columnas que cambiaron. Si una columna no se puede escribir, se saltea y se avisa;
  // el historial guarda solo lo que de verdad se escribió.
  const fallidas = [];
  Object.keys(cambiadas).forEach(j => { j = Number(j);
    try { shC.getRange(6, j + 1, v.length, 1).setValues(v.map(r => [r[j]])); }
    catch (e) { fallidas.push(j); Logger.log('No se pudo escribir la columna ' + HC[j] + ': ' + e.message); } });
  const histOk = histCap.filter(h => fallidas.indexOf(h.j) < 0).map(h => h.o);
  const nCompletados = histOk.filter(o => o.CAMPO !== 'REVISAR').length;
  cgHistorial_(histOk);

  // Escritura en la BASE DE TRABAJADORES: correo y teléfono, celda por celda, con historial.
  // Antes de escribir se vuelve a leer la celda: si cambió mientras corría el cruce, no se toca.
  let nMail = 0, nTel = 0, nSaltadas = 0;
  if (escribirBT.length) conLock_(() => {
    const hist = [];
    escribirBT.forEach(w => {
      const H = colsBT[w.p.hoja], j = H.indexOf(w.campo); if (j < 0) return;
      const cel = bt.getSheetByName(w.p.hoja).getRange(w.p.fila, j + 1), actual = cel.getValue();
      const dniFila = dniN(bt.getSheetByName(w.p.hoja).getRange(w.p.fila, H.indexOf('DNI') + 1).getValue());
      if (dniFila !== w.d || txt(actual).toLowerCase() !== String(w.antes).toLowerCase()) { nSaltadas++; return; }
      cel.setNumberFormat('@').setValue(w.despues);
      hist.push([hoyTxt, w.d, w.p.hoja, w.campo, w.antes, w.despues, CRUCE.ORIGEN + ' (libro CAPACITACIONES · Sistema HyS)']);
      if (w.campo === 'EMAIL') nMail++; if (w.campo === 'TELEFONO') nTel++;
    });
    if (hist.length) { const sh = bt.getSheetByName('HISTORIAL'); if (sh) sh.getRange(sh.getLastRow() + 1, 1, hist.length, 7).setNumberFormat('@').setValues(hist); }
  });

  // Propuestas en la Bandeja: la de la noche anterior sin revisar queda «Reemplazada»
  conLock_(() => { const sh = bjHoja_(), n = sh.getLastRow() - 5; if (n < 1) return;
    const rows = sh.getRange(6, 1, n, 8).getValues(); rows.forEach((r, i) => { if (r[6] === CRUCE.ORIGEN && r[7] === 'Para revisar') sh.getRange(6 + i, 8).setValue('Reemplazada'); }); });
  let nProp = 0;
  Object.keys(propuestas).forEach(h => { bjGuardarPropuesta_('NOMINA_PERSONAL', h, CRUCE.ORIGEN, propuestas[h], [], CRUCE.ORIGEN, ''); nProp += propuestas[h].length; });

  // Hoja CRUCE_PERSONAL del libro general: resumen y diferencias para mirar
  const g = SpreadsheetApp.openById(CFG.GENERAL); let shD = g.getSheetByName('CRUCE_PERSONAL');
  if (!shD) { shD = g.insertSheet('CRUCE_PERSONAL'); shD.setFrozenRows(5); }
  shD.clearContents();
  const seg = Math.round((Date.now() - t0) / 1000), resumen = 'Último cruce: ' + Utilities.formatDate(ahora, TZ, 'dd/MM/yyyy HH:mm') + ' (' + seg + ' s) · ' +
    nMail + ' correo(s) y ' + nTel + ' teléfono(s) copiados a la base · ' + nCompletados + ' dato(s) completado(s) en capacitaciones · ' +
    nBajas + ' baja(s) marcada(s) para revisar · ' + nProp + ' alta(s) propuesta(s) en la Bandeja · ' + diferencias.length + ' diferencia(s)' +
    (nSaltadas ? ' · ' + nSaltadas + ' celda(s) no tocadas porque cambiaron durante el cruce' : '') + '.';
  shD.getRange(1, 1, 3, 1).setValues([['Cruce nocturno · BASE DE TRABAJADORES y capacitaciones'], [resumen], ['Datos distintos en las dos bases. Solo para mirar: el cruce no cambia nada de esta lista. Se corrige en la base que corresponda.']]);
  shD.getRange(1, 1).setFontWeight('bold').setFontSize(16).setFontColor('#0D313F'); shD.getRange(2, 1, 2, 1).setFontStyle('italic').setFontColor('#4F616B');
  const HD = ['DNI', 'PERSONA', 'ESTABLECIMIENTO', 'CAMPO', 'BASE_DE_TRABAJADORES', 'CAPACITACIONES'];
  shD.getRange(5, 1, 1, HD.length).setValues([HD]).setFontWeight('bold').setFontColor('#FFFFFF').setBackground('#0D313F');
  const filas = diferencias.slice(0, CRUCE.MAX_DIFERENCIAS); if (filas.length) shD.getRange(6, 1, filas.length, HD.length).setNumberFormat('@').setValues(filas);
  CacheService.getScriptCache().removeAll(['p_resumen', 'caps_dnis']);
  Logger.log(resumen);
}

// Instalación (una vez): borra la tarea vieja sincronizarDesdeCapacitaciones y deja el cruce todos los días a las 3 h.
function instalarCruceNocturno() {
  let borradas = 0;
  ScriptApp.getProjectTriggers().filter(t => ['sincronizarDesdeCapacitaciones', 'cruceNocturnoPersonal'].indexOf(t.getHandlerFunction()) >= 0).forEach(t => { ScriptApp.deleteTrigger(t); borradas++; });
  ScriptApp.newTrigger('cruceNocturnoPersonal').timeBased().everyDays(1).atHour(CRUCE.HORA).inTimezone(TZ).create();
  Logger.log('Listo. Tareas viejas borradas: ' + borradas + '. El cruce corre todos los días a las ' + CRUCE.HORA + ' h. Tareas activas: ' +
    ScriptApp.getProjectTriggers().map(t => t.getHandlerFunction()).join(', ') + '.');
}
