/**
 * SISTEMA HyS · PERSONAS
 * Regla: las personas viven en la BASE DE TRABAJADORES (una sola fuente). Direcciones, jefaturas y comités son DATOS de esas personas:
 *   CARGO_CONDUCCION (dirección o jefatura) y COMITES (comités o equipos a los que pertenece).
 * - Al cargar un responsable de comité o un contacto en el portal, se busca a la persona en la base y se le actualiza el rol, el correo y el teléfono (si faltan).
 * - El modelo «Contactos y referentes» se arma con las personas de la base que tienen cargo o comité.
 * - sincronizarDesdeNTEAR(): trae de la planilla NTEAR 2026 el CUIL, la fecha de ingreso, la exposición y los agentes (solo completa lo vacío) como propuesta en la Bandeja.
 */

const PERS_NTEAR_ID = '1iLlahqu2XtHePHtqKMhEm7h9sbKyqm7cj-_aKs1fpx4';   // NTEAR 2026 (Drive). Si cambia la planilla, se corrige acá.
const PERS_NO_HOJAS = ['INICIO', 'TODOS', 'DUPLICADOS', 'IMPORTACIONES', 'HISTORIAL'];
const PERS_TITULOS = /^(dr|dra|lic|ing|cdor|cdora|cdra|cr|cra|sr|sra|srta|enf|tec|téc|prof|bioq|farm|arq|mg|esp)\.?$/i;

function persTokens_(s) { return sinTildes_(String(s || '').replace(/\([^)]*\)/g, ' ').replace(/,/g, ' ')).split(' ').filter(t => t && !PERS_TITULOS.test(t) && t.length > 1); }

// Índice de todas las personas de la base (todas las hojas de establecimientos)
function persIndice_() {
  const bt = SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('BASE_TRABAJADORES_ID')), L = [];
  bt.getSheets().forEach(sh => { const hoja = sh.getName(); if (PERS_NO_HOJAS.indexOf(hoja) >= 0 || sh.getLastRow() < 6) return;
    const H = bjCabTrab_(sh); if (H.indexOf('DNI') < 0) return;
    sh.getRange(6, 1, sh.getLastRow() - 5, H.length).getValues().forEach((v, i) => { const dni = String(v[H.indexOf('DNI')]).replace(/\D/g, ''); if (!dni) return;
      L.push({ hoja: hoja, fila: 6 + i, H: H, v: v, dni: dni, tokens: persTokens_(v[H.indexOf('APELLIDOS')] + ' ' + v[H.indexOf('NOMBRES')]) }); }); });
  return L;
}
// Busca una persona por DNI o por nombre (todas las palabras del nombre buscado tienen que estar). Prefiere el mismo establecimiento.
function persBuscar_(L, texto, dni, cod) {
  dni = String(dni || '').replace(/\D/g, '');
  if (dni) { const p = L.filter(x => x.dni === dni); if (p.length) return { p: p.find(x => x.hoja === cod) || p[0] }; }
  const t = persTokens_(texto); if (t.length < 2) return { error: 'falta el nombre completo' };
  const c = L.filter(x => t.every(w => x.tokens.indexOf(w) >= 0)), mismo = c.filter(x => x.hoja === cod);
  const pool = mismo.length ? mismo : c, unicos = Array.from(new Set(pool.map(x => x.dni)));
  if (unicos.length === 1) return { p: pool[0] };
  if (!unicos.length) return { error: 'no está en la base de personal' };
  const donde = Array.from(new Set(pool.map(x => x.hoja))).join(', ');
  return { error: mismo.length ? 'hay ' + unicos.length + ' personas con ese nombre en ' + cod + ': indicá el DNI' : 'no está en ' + cod + '; hay ' + unicos.length + ' con ese nombre en ' + donde + ': indicá el DNI' };
}
const persVal_ = (x, campo) => { const j = x.H.indexOf(campo); return j >= 0 ? bjVal_(x.v[j]) : ''; };

// Personas de un establecimiento con dirección, jefatura o comité (para el modelo de contactos)
function persDeBase_(cod) {
  return persIndice_().filter(x => x.hoja === cod && (persVal_(x, 'CARGO_CONDUCCION') || persVal_(x, 'COMITES'))).map(x => {
    const cargo = persVal_(x, 'CARGO_CONDUCCION'), com = persVal_(x, 'COMITES');
    return { tipo: /direc/i.test(cargo) ? 'Dirección' : cargo ? 'Jefatura' : 'Comité', unidad: cargo ? (persVal_(x, 'SERVICIO') || '') : com, cargo: cargo || 'Integrante', nombre: (persVal_(x, 'APELLIDOS') + ' ' + persVal_(x, 'NOMBRES')).trim(), dni: x.dni, tel: persVal_(x, 'TELEFONO'), email: persVal_(x, 'EMAIL') };
  });
}

// Vincula un responsable (comité o contacto cargado en el portal) con su ficha en la base de personal
function persVincular_(cod, tipo, d, indice, moverA) {
  const nombre = tipo === 'comite' ? d.RESPONSABLE : d.RESPONSABLE, rol = tipo === 'comite' ? d.COMITE_O_AREA : [d.CARGO, d.UNIDAD].filter(Boolean).join(' · ');
  if (!nombre || /^s\/d$/i.test(nombre)) return { ok: true, vinculado: false };
  const L = indice || persIndice_(), r = persBuscar_(L, nombre, d.DNI, cod);
  if (!r.p) return { ok: true, vinculado: false, aviso: nombre + ': ' + r.error + '. Agregalo en la base de personal (Trabajadores) o en la Nómina de personal.' };
  const p = r.p, quien = (persVal_(p, 'APELLIDOS') + ' ' + persVal_(p, 'NOMBRES')).trim() + ' (DNI ' + p.dni + ')', C = [];
  const poner = (campo, valor, sumar) => { if (!valor || /^s\/d$/i.test(valor)) return; const viejo = persVal_(p, campo);
    if (sumar) { if (viejo.split(' | ').indexOf(valor) < 0) C.push({ clave: quien, campo: campo, antes: viejo, despues: viejo ? viejo + ' | ' + valor : valor, fila: p.fila }); }
    else if (!viejo || /^s\/d$/i.test(viejo)) C.push({ clave: quien, campo: campo, antes: viejo, despues: valor, fila: p.fila }); };
  if (tipo === 'comite') poner('COMITES', rol + ' (responsable)', true);
  else if (/direc|jef|coordin|responsable|referente/i.test(rol)) poner('CARGO_CONDUCCION', rol, false);
  poner('EMAIL', d.CORREO || d.CORREO_PERSONAL || d.CORREO_INSTITUCIONAL, false);
  poner('TELEFONO', d.TELEFONO || d.CELULAR || d.TELEFONO_FIJO, false);
  if (C.length) { bjAplicarTrab_(p.hoja, C, 'Portal (' + (tipo === 'comite' ? 'comité' : 'contacto') + ')');
    C.forEach(c => { const j = p.H.indexOf(c.campo); if (j >= 0) p.v[j] = c.despues; else { p.H.push(c.campo); p.v.push(c.despues); } }); }   // el índice queda al día
  // Si la persona estaba en SIN_ASIGNAR, su cargo o comité dice dónde trabaja: se la pasa a ese establecimiento
  let traslado = '';
  if (p.hoja === 'SIN_ASIGNAR' && cod && cod !== 'SIN_ASIGNAR') { if (moverA) moverA.push({ p: p, destino: cod }); else persTrasladar_([{ p: p, destino: cod }]); traslado = cod; }
  return { ok: true, vinculado: true, persona: quien, cambios: C.length, traslado: traslado };
}

// Pasa personas de SIN_ASIGNAR a su establecimiento (copia la fila por nombre de columna y la borra de SIN_ASIGNAR, de abajo hacia arriba)
function persTrasladar_(lista) {
  const bt = SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('BASE_TRABAJADORES_ID')), hist = bt.getSheetByName('HISTORIAL'), hoy = Utilities.formatDate(new Date(), TZ, 'dd/MM/yyyy'), sa = bt.getSheetByName('SIN_ASIGNAR'), borrar = [], log = [];
  const vistos = {}; lista.forEach(m => { if (vistos[m.p.dni]) return; vistos[m.p.dni] = 1;
    const dest = bt.getSheetByName(m.destino); if (!dest) return;
    const fila = sa.getRange(m.p.fila, 1, 1, sa.getLastColumn()).getValues()[0], Hs = bjCabTrab_(sa);
    if (String(fila[Hs.indexOf('DNI')]).replace(/\D/g, '') !== m.p.dni) return;   // la fila cambió: no se toca
    const Hd = bjCabTrab_(dest); Hs.forEach(h => { if (h && Hd.indexOf(h) < 0) { dest.getRange(5, Hd.length + 1).setValue(h); Hd.push(h); } });
    const nueva = Hd.map(h => h === 'ESTABLECIMIENTO' ? m.destino : (h === 'REVISAR' || h === 'MOTIVO_REVISION') ? '' : (Hs.indexOf(h) >= 0 ? fila[Hs.indexOf(h)] : ''));
    dest.getRange(Math.max(dest.getLastRow(), 5) + 1, 1, 1, Hd.length).setValues([nueva]); borrar.push(m.p.fila);
    log.push([hoy, m.p.dni, m.destino, 'TRASLADO', 'SIN_ASIGNAR', m.destino + ' · por su cargo o comité', 'Sistema (vincular personas)']); });
  borrar.sort((a, b) => b - a).forEach(r => sa.deleteRow(r));
  if (hist && log.length) hist.getRange(hist.getLastRow() + 1, 1, log.length, 7).setValues(log);
  return log.length;
}

// Recorre todos los comités y contactos ya cargados y los vincula con la base (se puede ejecutar las veces que haga falta)
function vincularComitesYContactos() {
  const bc = pBC_(), avisos = [], hechos = [], L = persIndice_(), mover = [];   // la base se lee una sola vez
  [['COMITES', 'comite'], ['CONTACTOS', 'contacto']].forEach(([hoja, tipo]) => { const sh = bc.getSheetByName(hoja); if (!sh) return;
    const H = sh.getRange(5, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
    pTabla_(sh, H.length).forEach(r => { const d = {}; H.forEach((h, j) => d[h] = bjVal_(r.v[j])); if (!d.RESPONSABLE || /^s\/d$/i.test(d.RESPONSABLE)) return; const out = persVincular_(limpio_(d.CODIGO), tipo, d, L, mover);
      if (out.aviso) avisos.push(d.CODIGO + ' · ' + out.aviso); if (out.cambios || out.traslado) hechos.push(out.persona + (out.cambios ? ' (' + out.cambios + ' dato/s)' : '') + (out.traslado ? ' → pasa a ' + out.traslado : '')); }); });
  const movidos = mover.length ? persTrasladar_(mover) : 0;
  Logger.log('RESUMEN · personas actualizadas: ' + hechos.length + ' · trasladadas desde SIN_ASIGNAR: ' + movidos + ' · sin vincular: ' + avisos.length + '\n\nPersonas actualizadas: ' + hechos.length + (hechos.length ? ' → ' + hechos.join('; ') : '') + '\nSin vincular: ' + avisos.length + (avisos.length ? '\n' + avisos.join('\n') : ''));
  return { ok: true, actualizadas: hechos, avisos: avisos };
}

// ------------------------------------------------------------------ NTEAR 2026 → base de personal (como propuesta en la Bandeja)
function persFecha_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, TZ, 'dd/MM/yyyy');
  const s = String(v || '').trim().toLowerCase(); if (!s) return '';
  const M = { ene: 1, feb: 2, mar: 3, abr: 4, may: 5, jun: 6, jul: 7, ago: 8, sep: 9, set: 9, oct: 10, nov: 11, dic: 12, jan: 1, apr: 4, aug: 8, dec: 12 };
  let m = /^(\d{1,2})[-\/ ]([a-z]{3})[a-z]*[-\/ ](\d{2,4})$/.exec(s); if (m && M[m[2]]) { let y = Number(m[3]); if (y < 100) y += y > 40 ? 1900 : 2000; return ('0' + m[1]).slice(-2) + '/' + ('0' + M[m[2]]).slice(-2) + '/' + y; }
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/.exec(s); if (m) { let y = Number(m[3]); if (y < 100) y += y > 40 ? 1900 : 2000; return ('0' + m[1]).slice(-2) + '/' + ('0' + m[2]).slice(-2) + '/' + y; }
  return '';
}
function sincronizarDesdeNTEAR() {
  const ss = SpreadsheetApp.openById(PERS_NTEAR_ID), sh = ss.getSheetByName('Base'), V = sh.getRange(3, 1, sh.getLastRow() - 2, 22).getValues();
  const L = persIndice_(), porDni = {}; L.forEach(x => (porDni[x.dni] = porDni[x.dni] || []).push(x));
  const porHoja = {}, sinBase = [];
  V.forEach(r => {
    const dni = String(r[1]).replace(/\D/g, ''); if (!dni) return;
    const ps = porDni[dni]; if (!ps) { sinBase.push(String(r[2]).trim() + ' (DNI ' + dni + ', ' + String(r[9]).trim() + ')'); return; }
    const cuil = String(r[0]).replace(/\D/g, ''), agentes = r.slice(14, 19).map(x => String(x).trim()).filter(x => x && !/^ax+$/i.test(x)).join(' · ');
    const nuevo = { CUIL: cuil.length === 11 ? cuil : '', FECHA_INGRESO: persFecha_(r[11]), FECHA_INICIO_EXP: persFecha_(r[12]), FECHA_FIN_EXP: persFecha_(r[13]), AGENTES_ESOP: agentes,
      SERVICIO: String(r[8]).trim(), FUNCION_DETALLE: String(r[4] || r[3]).trim(), VINCULO: [String(r[19]).trim(), String(r[20]).trim()].filter(Boolean).join(' ') };
    ps.forEach(p => { const quien = (persVal_(p, 'APELLIDOS') + ' ' + persVal_(p, 'NOMBRES')).trim() + ' (DNI ' + dni + ')';
      Object.keys(nuevo).forEach(campo => { const val = nuevo[campo], viejo = persVal_(p, campo);
        if (val && (!viejo || /^s\/d$/i.test(viejo) || /\[SIN VERIFICAR\]/i.test(viejo))) (porHoja[p.hoja] = porHoja[p.hoja] || []).push({ clave: quien, campo: campo, antes: viejo, despues: val, fila: p.fila, hoja: p.hoja }); }); });
  });
  const res = Object.keys(porHoja).map(h => h + ': ' + bjGuardarPropuesta_('NOMINA_PERSONAL', h, 'NTEAR 2026', porHoja[h], [], 'NTEAR 2026', ss.getUrl()).resumen);
  if (sinBase.length) bjGuardarPropuesta_('NOMINA_PERSONAL', 'Varios', 'NTEAR 2026 · personas que no están en la base', [], sinBase.slice(0, 400), 'NTEAR 2026', ss.getUrl());
  Logger.log('Propuestas en la Bandeja:\n' + res.join('\n') + '\nPersonas del NTEAR que no están en la base: ' + sinBase.length);
  return { ok: true, propuestas: res, sinBase: sinBase.length };
}