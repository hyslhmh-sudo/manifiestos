// =====================================================================
// CAPACITACIONES · Sistema HyS — Fase 7: agenda, jefaturas, matriz y cumplimiento
// Archivo «Agenda.gs». Va en el MISMO proyecto que «Código.gs» (Apps Script › + › Secuencia de comandos)
// y usa sus utilidades (tabla_, obj_, agregar_, setCampos_, historial_, aviso_, conLock_, etc.).
//
// Hojas del libro que usa: FRANJAS, AGENDA, JEFATURAS, SERVICIOS_EQUIV, MATRIZ, CUMPLIMIENTO,
// CUMPLIMIENTO_PERSONAS y _MENSAJES (registro de envíos). Todo se puede ver y corregir en el libro.
//
// Correos: solo los de la agenda (confirmación de la reserva o la inscripción, recordatorios 7, 2 y 1 día
// antes y aviso si HyS suspende un horario), siempre desde belenpellegrini.hys@gmail.com («Enviar como»).
// Si ese remitente no está configurado no se envía nada y queda el aviso en _AVISOS.
// =====================================================================
const VERSION_F7 = '2026-10-11 · 7.0';
const AGENDA_WEB = 'https://hyslhmh-sudo.github.io/capacitaciones/agenda.html';
const CORREO_HYS = 'belenpellegrini.hys@gmail.com';
const REMITENTE = 'Higiene y Seguridad Laboral · HZT / HMH';
const LOGO_HYSL = 'https://hyslhmh-sudo.github.io/logo-hysl.png';
const HS_CONFIRMA = 48;                                            // reserva de servicio con menos anticipación: la confirma HyS
const RECORDAR_DIAS = [7, 2, 1];                                   // días antes en que sale el recordatorio
const HORA_RECORDATORIO = 8;                                       // a partir de esta hora del día
const SECUENCIA_INCENDIO = ['CAP-HYS-007', 'CAP-HYS-012', 'CAP-HYS-004'];   // extintores › seguridad humana › evacuación (plan de emergencia)
const NOMBRE_INCENDIO = { 'CAP-HYS-007': 'Extintores', 'CAP-HYS-012': 'Seguridad humana', 'CAP-HYS-004': 'Evacuación' };
const DURACION_TURNO = 90;                                         // minutos por horario, si no se indica otra cosa
const RED_CUMPLIMIENTO = ['HZT', 'HMH'];                           // si la hoja ALCANCE_CUMPLIMIENTO está vacía: estos forman la nómina (grupo «Red Trelew»)
const ID_PORTAL_PUBLICO = '1W8OlPk0lPxWjrZ9yGJzbx6iLQsm8NJ7z6xMOw_jE95c';   // «PORTAL PÚBLICO HyS · contenidos»
const DIAS_SEMANA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const DIAS_CORTO = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const CARGOS_JEFATURA = ['Jefe/a', 'Coordinador/a', 'A cargo (A/C)'];
const ESTADOS_TURNO = ['Libre', 'Pendiente', 'Reservado', 'Clase abierta', 'Realizado', 'Suspendido', 'Cancelado', 'No se presentó', 'Sin uso', 'Anulado'];
const ACTIVOS_TURNO = ['Pendiente', 'Reservado', 'Clase abierta'];

// ------------------------------------------------------------------ Hojas de la fase 7 (encabezados en la fila 5)
const HOJAS_F7 = {
  FRANJAS: ['FRANJAS · Días y horarios en que ofrecés capacitaciones a los servicios',
    'Una fila por franja semanal. Desde el portal (Agenda › Abrir horarios) o el menú se generan los horarios dentro de estas franjas. Para dejar de usar una franja: VIGENTE = No (no se borra).',
    ['DIA', 'DESDE', 'HASTA', 'LUGAR', 'VIGENTE', 'OBSERVACIONES']],
  AGENDA: ['AGENDA · Horarios para servicios y clases abiertas',
    'Una fila por horario. ESTADO: Libre · Pendiente (la confirmás vos) · Reservado · Clase abierta · Realizado · Suspendido (por HyS) · Cancelado (por el servicio) · No se presentó · Sin uso · Anulado. Nunca se borra: se cambia el ESTADO y se escribe el MOTIVO. Si cargás a mano una reserva o una clase abierta, después usá el menú «Agenda: completar filas cargadas a mano».',
    ['ID_TURNO', 'FECHA', 'HORA_INICIO', 'HORA_FIN', 'TIPO_TURNO', 'CODIGO', 'MODALIDAD', 'LUGAR', 'CUPO', 'ESTADO', 'ID_DICTADO', 'JEFATURA', 'PEDIDO_POR_DNI', 'PEDIDO_POR', 'CARGO', 'CORREO_AVISOS', 'FECHA_PEDIDO', 'CONFIRMADO_POR', 'MOTIVO', 'TOKEN', 'RECORDATORIOS', 'PUBLICADO', 'OBSERVACIONES', 'CREADO', 'ORIGEN']],
  JEFATURAS: ['JEFATURAS · Quién reserva por cada servicio',
    'Una fila por jefatura. SERVICIOS: los servicios que abarca, separados por punto y coma, escritos como en la base de trabajadores (o como quedan en SERVICIOS_EQUIV). Pueden reservar el DNI_RESPONSABLE y los de OTROS_DNI (coordinación o a cargo, separados por punto y coma). Los avisos van a CORREO_SERVICIO y, si no hay, a CORREO_RESPONSABLE.',
    ['JEFATURA', 'SERVICIOS', 'ESTABLECIMIENTO', 'RESPONSABLE', 'CARGO', 'DNI_RESPONSABLE', 'OTROS_DNI', 'CORREO_RESPONSABLE', 'CORREO_SERVICIO', 'TEL_INTERNO', 'UBICACION', 'TIPO', 'DEPENDE_DE', 'PRIORITARIA', 'ULTIMO_INFORME', 'LINK_INFORME', 'ACTUALIZADO', 'OBSERVACIONES']],
  SERVICIOS_EQUIV: ['SERVICIOS_EQUIV · Cómo se agrupan los nombres de servicio de la base de trabajadores',
    'Una fila por forma de escribir un servicio en la base de trabajadores. SERVICIO es el nombre unificado que usa el cumplimiento. REVISAR = Sí marca equivalencias dudosas. Si un nombre no está acá, se usa tal como viene.',
    ['VALOR_EN_BASE', 'SERVICIO', 'REVISAR', 'NOTA']],
  MATRIZ: ['MATRIZ · Qué capacitación corresponde a quién',
    'Una fila por regla. Si FUNCIONES y SERVICIOS están vacíos, es para todo el personal. Alcanza con cumplir la función o el servicio, salvo SOLO_SI_CUMPLE_AMBAS = Sí. TIPO: O (obligatoria) o R (recomendada). Solo cuentan las capacitaciones en estado Activa del CATALOGO. Para dejar de usar una regla: ACTIVA = No y el MOTIVO (no se borra).',
    ['ID_REGLA', 'CODIGO', 'SUBGRUPO', 'FUNCIONES', 'SERVICIOS', 'SOLO_SI_CUMPLE_AMBAS', 'TIPO', 'ACTIVA', 'OBSERVACION', 'ACTUALIZADO', 'MOTIVO']],
  ALCANCE_CUMPLIMIENTO: ['ALCANCE_CUMPLIMIENTO · Qué establecimientos entran en el cumplimiento',
    'Una fila por establecimiento (ESTABLECIMIENTO = nombre de su hoja en la base de trabajadores: HZT, HMH, HSST…). INCLUIR = Sí para que cuente. Los establecimientos con el mismo GRUPO se miden juntos y tienen su propia META (fecha), sus indicadores y su informe a DIRECCION_DESTINO. El primer grupo es el principal (Tablero). Una jefatura sin establecimiento en JEFATURAS pertenece al grupo principal; las de otros grupos llevan su establecimiento.',
    ['ESTABLECIMIENTO', 'NOMBRE', 'GRUPO', 'INCLUIR', 'META', 'DIRECCION_DESTINO', 'OBSERVACIONES']],
  CUMPLIMIENTO: ['CUMPLIMIENTO · Obligatorias por servicio',
    'La escribe el sistema cada vez que se recalcula (portal › Cumplimiento › Actualizar, o menú «Cumplimiento: recalcular ahora»). No se edita a mano. Incendio: personas con extintores, seguridad humana y evacuación vigentes.',
    ['JEFATURA_O_SERVICIO', 'SIN_JEFATURA', 'ESTABLECIMIENTO', 'PERSONAL', 'OBLIGATORIAS', 'CUMPLIDAS', 'PCT', 'AL_DIA', 'EXTINTORES', 'SEGURIDAD_HUMANA', 'EVACUACION', 'INCENDIO_COMPLETO', 'CON_ALGUNA_CAPACITACION', 'PROXIMA_RESERVA', 'SUGERIDA', 'CALCULADO', 'GRUPO']],
  CUMPLIMIENTO_PERSONAS: ['CUMPLIMIENTO_PERSONAS · Obligatorias de cada persona',
    'La escribe el sistema junto con CUMPLIMIENTO. No se edita a mano: los datos de cada persona se corrigen en la base de trabajadores.',
    ['DNI', 'APELLIDOS', 'NOMBRES', 'ESTABLECIMIENTO', 'SERVICIO', 'FUNCION', 'JEFATURA_O_SERVICIO', 'OBLIGATORIAS', 'CUMPLIDAS', 'PCT', 'LE_FALTA', 'GRUPO']]
};
const COLUMNAS_F7 = {
  INSCRIPCIONES: ['CORREO', 'TOKEN_CANCELAR', 'RECORDATORIOS', 'ID_TURNO'],
  _MENSAJES: ['ID_TURNO', 'DETALLE']
};

function prepararF7_() {
  const p = PropertiesService.getScriptProperties();
  if (p.getProperty('hojasF7b') === '1') return [];
  const lib = SpreadsheetApp.getActive(), out = [];
  Object.keys(HOJAS_F7).forEach(n => {
    const def = HOJAS_F7[n], H = def[2];
    let sh = lib.getSheetByName(n);
    if (!sh) { sh = lib.insertSheet(n); out.push(n + ': hoja nueva'); }
    const ult = Math.max(sh.getLastColumn(), 1), act = sh.getRange(5, 1, 1, ult).getDisplayValues()[0].map(x => String(x).trim());
    const hayDatos = sh.getLastRow() > 5 && sh.getRange(6, 1, sh.getLastRow() - 5, ult).getDisplayValues().some(r => r.some(x => String(x).trim()));
    const igual = H.every((h, k) => act[k] === h);
    if (!igual && !hayDatos) {
      sh.getRange(1, 1, 5, ult).clearContent();
      if (sh.getMaxColumns() < H.length) sh.insertColumnsAfter(sh.getMaxColumns(), H.length - sh.getMaxColumns());
      sh.getRange(1, 1).setValue(def[0]); sh.getRange(2, 1).setValue(def[1]); sh.getRange(5, 1, 1, H.length).setValues([H]);
      formatoHoja_(sh, H.length); out.push(n + ': encabezados');
    } else if (!igual) {
      const r = asegurarColumnasDe_({ [n]: H }); if (r.length) out.push(r.join(' · '));
    }
  });
  const r2 = asegurarColumnasDe_(COLUMNAS_F7); if (r2.length) out.push(r2.join(' · '));
  try { lib.getSheetByName('_MENSAJES').getRange(2, 1).setValue('Hoja de sistema. Registro de mensajes. Solo salen solos los de la agenda (confirmación, recordatorios 7, 2 y 1 día antes y aviso de suspensión), desde ' + CORREO_HYS + '. Todo lo demás queda como borrador en tu Gmail y lo enviás vos.'); } catch (e) { /* sin la hoja */ }
  // Alcance inicial: HZT y HMH juntos (Red Trelew); el HSST y el resto, cargados pero sin incluir
  try {
    const T = tabla_('ALCANCE_CUMPLIMIENTO');
    if (!T.filas.some(r => String(r[0]).trim())) agregar_(T, [
      { ESTABLECIMIENTO: 'HZT', NOMBRE: 'Hospital Zonal Trelew', GRUPO: 'Red Trelew', INCLUIR: 'Sí', META: '', DIRECCION_DESTINO: 'Dirección HZT / HMH', OBSERVACIONES: 'META vacía: 31/03 de cada ciclo' },
      { ESTABLECIMIENTO: 'HMH', NOMBRE: 'Hospital María Humphreys', GRUPO: 'Red Trelew', INCLUIR: 'Sí', META: '', DIRECCION_DESTINO: 'Dirección HZT / HMH', OBSERVACIONES: '' },
      { ESTABLECIMIENTO: 'HSST', NOMBRE: 'Hospital Subzonal Santa Teresita', GRUPO: 'HSST', INCLUIR: 'No', META: '', DIRECCION_DESTINO: 's/d', OBSERVACIONES: 'Para sumarlo: INCLUIR = Sí y cargar sus jefaturas con ESTABLECIMIENTO = HSST' }]);
  } catch (e) { out.push('ALCANCE_CUMPLIMIENTO: ' + e.message); }
  p.setProperty('hojasF7b', '1');
  return out;
}
function formatoHoja_(sh, n) {
  sh.getRange(1, 1).setFontSize(14).setFontWeight('bold').setFontColor('#0D313F');
  sh.getRange(2, 1).setFontSize(9).setFontStyle('italic').setFontColor('#4F616B');
  sh.getRange(5, 1, 1, n).setBackground('#0D313F').setFontColor('#FFFFFF').setFontWeight('bold');
  sh.setFrozenRows(5);
}

// ------------------------------------------------------------------ Utilidades
function hhmmDe_(min) { return ('0' + Math.floor(min / 60)).slice(-2) + ':' + ('0' + (min % 60)).slice(-2); }
function minDe_(hhmm) { const m = String(hhmm || '').match(/(\d{1,2}):(\d{2})/); return m ? Number(m[1]) * 60 + Number(m[2]) : -1; }
function inicioDe_(fechaTxt, hora) { const f = isoDe_(fechaTxt); return f ? fechaHora_(dma_(f) + ' ' + (hhmm_(hora) || '00:00')) : new Date(0); }
function diaCorto_(iso) { const d = new Date(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10))); return DIAS_CORTO[d.getDay()] + ' ' + iso.slice(8, 10) + '/' + iso.slice(5, 7); }
function diaSemana_(iso) { return new Date(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10))).getDay(); }
function sumarDias_(iso, n) { const d = new Date(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)) + n); return iso2_(d); }
function lista_(s) { return String(s || '').split(/[;\n]/).map(norm_).filter(x => x && x !== 'todos' && x !== 'todo el personal' && x !== 's/d'); }
function estCod_(s) {
  const n = norm_(s); if (!n || n === 's/d') return '';
  if (/^(hzt|hmh)$/.test(n)) return n.toUpperCase();
  if (/hzt y hmh|ambos|todos/.test(n)) return '';
  if (/humphreys|hmh/.test(n)) return 'HMH';
  if (/zonal|trelew|hzt/.test(n)) return 'HZT';
  return String(s).trim();
}
function tokenAg_() { return Utilities.getUuid().replace(/-/g, '').slice(0, 16); }
function nombreCap_(codigo) { const c = capDe_(codigo); return c ? c.NOMBRE : codigo; }
function capsMapa_() {
  const C = tabla_('CATALOGO'), m = {};
  C.filas.forEach(r => { const o = obj_(C, r); if (o.CODIGO) m[o.CODIGO] = { codigo: o.CODIGO, nombre: o.NOMBRE, estado: o.ESTADO, registro: String(o.REGISTRO || ''), encuentros: num_(o.ENCUENTROS) || 1, horas: o.HORAS_POR_ENCUENTRO || o.CARGA_HORARIA, destinatarios: o.DESTINATARIOS, version: o.VERSION, icono: o.ICONO }; });
  return m;
}
function nombreCorto_(cap) { return NOMBRE_INCENDIO[cap.codigo] ? NOMBRE_INCENDIO[cap.codigo] : String(cap.nombre || cap.codigo).split(/[:(]/)[0].trim(); }

// ------------------------------------------------------------------ Jefaturas, servicios y nómina
function jefaturas_() { const J = tabla_('JEFATURAS'); return J.filas.map((r, k) => Object.assign(obj_(J, r), { _k: k })).filter(o => String(o.JEFATURA || '').trim()); }
function srvLista_(j) { return String(j.SERVICIOS || '').split(/[;\n]/).map(norm_).filter(x => x && x !== '(conduccion)' && x !== 's/d'); }
function dnisJefatura_(j) { return [j.DNI_RESPONSABLE].concat(String(j.OTROS_DNI || '').split(/[;,\s]+/)).map(soloDni_).filter(Boolean); }
function correoAvisos_(j) { return [j.CORREO_SERVICIO, j.CORREO_RESPONSABLE].map(x => String(x || '').trim()).find(correoOk_) || ''; }
function equivServicios_() {
  const m = {}; try { const S = tabla_('SERVICIOS_EQUIV'); S.filas.forEach(r => { const a = norm_(r[S.i('VALOR_EN_BASE')]), b = String(r[S.i('SERVICIO')] || '').trim(); if (a && b) m[a] = b; }); } catch (e) { /* sin la hoja */ }
  return m;
}
// Grupos de establecimientos que se miden juntos (hoja ALCANCE_CUMPLIMIENTO); el primero es el principal
function alcance_() {
  let filas = []; try { const T = tabla_('ALCANCE_CUMPLIMIENTO'); filas = T.filas.map(r => obj_(T, r)).filter(o => String(o.ESTABLECIMIENTO || '').trim()); } catch (e) { filas = []; }
  if (!filas.length) filas = RED_CUMPLIMIENTO.map(e => ({ ESTABLECIMIENTO: e, GRUPO: 'Red Trelew', INCLUIR: 'Sí' }));
  const g = {}, orden = [];
  filas.filter(o => siNo_(o.INCLUIR)).forEach(o => {
    const est = String(o.ESTABLECIMIENTO).trim(), n = String(o.GRUPO || '').trim() || est;
    if (!g[n]) { g[n] = { grupo: n, ests: [], nombres: {}, meta: '', direccion: '' }; orden.push(n); }
    g[n].ests.push(est); g[n].nombres[est] = vacio_(o.NOMBRE) ? est : String(o.NOMBRE).trim();
    if (!g[n].meta && isoDe_(o.META)) g[n].meta = isoDe_(o.META);
    if (!g[n].direccion && !vacio_(o.DIRECCION_DESTINO)) g[n].direccion = String(o.DIRECCION_DESTINO).trim();
  });
  return orden.map((n, i) => Object.assign(g[n], { principal: i === 0 }));
}
function grupoDe_(nombre) { const G = alcance_(); return G.find(x => x.grupo === nombre) || G[0] || { grupo: 'Red Trelew', ests: RED_CUMPLIMIENTO, nombres: {}, meta: '', direccion: '', principal: true }; }
function jefaturaEnGrupo_(j, G) { const e = estCod_(j.ESTABLECIMIENTO); return e ? G.ests.indexOf(e) >= 0 : !!G.principal; }
function grupoDeJefatura_(j) { const G = alcance_(); return G.find(g => jefaturaEnGrupo_(j, g)) || G[0]; }
function todosLosEsts_() { return alcance_().reduce((a, g) => a.concat(g.ests), []); }
function limpiarCumpl_() { try { CacheService.getScriptCache().removeAll(alcance_().map(g => 'cumpl|' + g.grupo)); } catch (e) { /* sin caché */ } }
function nomina_(ests) {
  const lib = SpreadsheetApp.openById(ID.trabajadores), eq = equivServicios_(), visto = {}, out = [];
  (ests || todosLosEsts_()).forEach(est => {
    let T; try { T = tabla_(est, lib); } catch (e) { return; }
    T.filas.forEach(r => {
      const o = obj_(T, r), dni = soloDni_(o.DNI); if (!dni || visto[dni] || /baja/i.test(o.ESTADO)) return;
      visto[dni] = 1;
      const srv = String(o.SERVICIO || '').trim();
      out.push({ dni: dni, ape: String(o.APELLIDOS || '').trim(), nom: String(o.NOMBRES || '').trim(), est: est, funcion: String(o.FUNCION || '').trim() || 's/d',
        servicio: eq[norm_(srv)] || srv || 's/d', servicioBase: srv, empresa: String(o.EMPRESA || '').trim(), correo: String(o.EMAIL || '').trim() });
    });
  });
  return out;
}
function jefaturaDe_(p, J) {
  const s = [norm_(p.servicio), norm_(p.servicioBase)];
  return J.find(j => { const l = srvLista_(j), e = estCod_(j.ESTABLECIMIENTO); return l.some(x => s.indexOf(x) >= 0) && (!e || e === p.est); }) || null;
}

// ------------------------------------------------------------------ Matriz
function reglas_(soloActivas) {
  const M = tabla_('MATRIZ');
  return M.filas.map((r, k) => Object.assign(obj_(M, r), { _k: k })).filter(o => String(o.CODIGO || '').trim() && (!soloActivas || !/^no/i.test(o.ACTIVA)))
    .map(o => ({ id: o.ID_REGLA, codigo: String(o.CODIGO).trim(), subgrupo: o.SUBGRUPO, funciones: o.FUNCIONES, servicios: o.SERVICIOS, f: lista_(o.FUNCIONES), s: lista_(o.SERVICIOS),
      ambas: siNo_(o.SOLO_SI_CUMPLE_AMBAS), tipo: /^r/i.test(o.TIPO) ? 'R' : 'O', activa: !/^no/i.test(o.ACTIVA), observacion: o.OBSERVACION, actualizado: o.ACTUALIZADO, _k: o._k }));
}
function aplica_(r, p) {
  if (!r.f.length && !r.s.length) return true;
  const fOk = r.f.indexOf(norm_(p.funcion)) >= 0;
  const sOk = [p.servicio, p.servicioBase, p.empresa].some(x => x && r.s.indexOf(norm_(x)) >= 0);
  if (r.ambas) return (!r.f.length || fOk) && (!r.s.length || sOk);
  return (r.f.length > 0 && fOk) || (r.s.length > 0 && sOk);
}
function requeridas_(p, reglas) {
  const req = {}; reglas.forEach(r => { if (aplica_(r, p)) req[r.codigo] = (req[r.codigo] === 'O' || r.tipo === 'O') ? 'O' : 'R'; });
  return req;
}

// ------------------------------------------------------------------ Qué tiene hecho cada persona (vigente)
function hechas_(caps, hoy) {
  const R = tabla_('REGISTROS'), ok = {}, alguna = {}, ultima = {};
  R.filas.forEach(r => {
    const o = obj_(R, r); if (!o.DNI || /anulad|reemplaz/i.test(o.ESTADO)) return;
    const d = String(o.DNI), c = String(o.CODIGO || ''); alguna[d] = 1;
    const cap = caps[c]; if (!cap) return;
    const f = isoDe_(o.FECHA), v = /no vence/i.test(o.VENCE) ? '9999-12-31' : (isoDe_(o.VENCE) || (f ? masDoce_(f) : ''));
    if (!v || v < hoy) return;
    let vale;
    // Capacitación de un encuentro: cuenta la asistencia o la evaluación aprobada (una evaluación desaprobada sola no cuenta).
    // Programa: cuenta el certificado de aprobación del programa, o la evaluación final aprobada donde alcanza (008 y 009).
    const esEval = /^evaluaci/i.test(norm_(o.TIPO));
    if (/encuentro/i.test(cap.registro)) vale = PROGRAMAS_EVAL_ALCANZA.indexOf(c) >= 0 && esEval && siNo_(o.APROBADO);
    else vale = esEval ? siNo_(o.APROBADO) : true;
    if (vale) { ok[d + '|' + c] = 1; if (!ultima[d + '|' + c] || f > ultima[d + '|' + c]) ultima[d + '|' + c] = f; }
  });
  try {
    const C = tabla_('CERTIFICADOS');
    C.filas.forEach(r => {
      const o = obj_(C, r); if (!/programa/i.test(o.TIPO) || !/aprob/i.test(o.TIPO) || /anulad|reemplaz/i.test(o.ESTADO)) return;
      const v = /no vence/i.test(o.VENCE) ? '9999-12-31' : isoDe_(o.VENCE); if (v && v < hoy) return;
      ok[String(o.DNI) + '|' + o.CODIGO] = 1;
    });
  } catch (e) { /* sin certificados */ }
  return { ok: ok, alguna: alguna };
}

// ------------------------------------------------------------------ Cumplimiento (se guarda 15 minutos)
function cumplimiento_(fresco, grupo) {
  const cache = CacheService.getScriptCache(), G = grupoDe_(grupo), clave = 'cumpl|' + G.grupo;
  if (!fresco) { const c = cache.get(clave); if (c) return JSON.parse(c); }
  const t = cumplimientoCalc_(null, G.grupo);
  try { escribirCumplimiento_(t); } catch (e) { t.avisoHoja = 'No se pudo escribir la hoja CUMPLIMIENTO: ' + e.message; }
  delete t.personas;
  try { cache.put(clave, JSON.stringify(t), MIN_CACHE * 60); } catch (e) { /* demasiado grande: se recalcula la próxima vez */ }
  return t;
}
function metaCiclo_(hoy) { return (Number(cicloDe_(hoy)) + 1) + '-03-31'; }   // meta: 31/03 del año siguiente al ciclo
function cumplimientoCalc_(soloJefatura, grupo) {
  const hoy = iso_(new Date()), caps = capsMapa_(), G = grupoDe_(grupo);
  const reglas = reglas_(true).filter(r => caps[r.codigo] && /^activ/i.test(caps[r.codigo].estado));
  const N = nomina_(G.ests), J = jefaturas_().filter(j => srvLista_(j).length && jefaturaEnGrupo_(j, G)), H = hechas_(caps, hoy);
  const turnos = turnos_(), grupos = {}, personas = [], est = {};
  G.ests.forEach(e => est[e] = { obl: 0, ok: 0, personal: 0 });
  N.forEach(p => {
    const req = requeridas_(p, reglas), obl = Object.keys(req).filter(c => req[c] === 'O');
    const tiene = c => !!H.ok[p.dni + '|' + c], hechas = obl.filter(tiene);
    const j = jefaturaDe_(p, J), key = j ? j.JEFATURA : p.servicio + ' · ' + p.est;   // sin jefatura: servicio y hospital, para no mezclarlo con una jefatura de igual nombre en el otro hospital
    if (soloJefatura && key !== soloJefatura) return;
    const g = grupos[key] = grupos[key] || { servicio: key, sinJefatura: !j, jefatura: j ? j.JEFATURA : '', est: {}, personal: 0, obligatorias: 0, cumplidas: 0, alDia: 0,
      fuego: { req: 0, ext: 0, seg: 0, eva: 0, completo: 0 }, conAlguna: 0, faltan: {}, elegibles: {}, prioritario: j ? siNo_(j.PRIORITARIA) : false, personas: [] };
    g.personal++; g.est[p.est] = (g.est[p.est] || 0) + 1; g.obligatorias += obl.length; g.cumplidas += hechas.length;
    if (obl.length && hechas.length === obl.length) g.alDia++;
    if (H.alguna[p.dni]) g.conAlguna++;
    const fReq = SECUENCIA_INCENDIO.filter(c => req[c] === 'O');
    if (fReq.length) {
      g.fuego.req++;
      if (tiene('CAP-HYS-007')) g.fuego.ext++; if (tiene('CAP-HYS-012')) g.fuego.seg++; if (tiene('CAP-HYS-004')) g.fuego.eva++;
      if (fReq.every(tiene)) g.fuego.completo++;
    }
    obl.filter(c => !tiene(c)).forEach(c => {
      g.faltan[c] = (g.faltan[c] || 0) + 1;
      const i = SECUENCIA_INCENDIO.indexOf(c);
      if (i <= 0 || tiene(SECUENCIA_INCENDIO[i - 1])) g.elegibles[c] = (g.elegibles[c] || 0) + 1;   // la secuencia de incendio se ofrece en orden
    });
    if (est[p.est]) { est[p.est].obl += obl.length; est[p.est].ok += hechas.length; est[p.est].personal++; }
    const fila = { dni: p.dni, ape: p.ape, nom: p.nom, est: p.est, servicio: p.servicio, funcion: p.funcion, grupo: key, obl: obl.length, ok: hechas.length,
      pct: obl.length ? Math.round(100 * hechas.length / obl.length) : 100, falta: obl.filter(c => !tiene(c)).map(c => caps[c] ? nombreCorto_(caps[c]) : c) };
    personas.push(fila); g.personas.push(fila);
  });
  const ahora = new Date();
  const servicios = Object.keys(grupos).map(k => {
    const g = grupos[k];
    g.pct = g.obligatorias ? Math.round(100 * g.cumplidas / g.obligatorias) : 100;
    g.sinIncendio = g.fuego.req > 0 && !g.fuego.ext && !g.fuego.seg && !g.fuego.eva;
    g.nunca = g.conAlguna === 0;
    g.establecimientos = Object.keys(g.est).sort().join(' · ');
    const futuras = turnos.filter(t => t.JEFATURA === k && ACTIVOS_TURNO.indexOf(t.ESTADO) >= 0 && t.inicio > ahora).sort((a, b) => a.inicio - b.inicio);
    g.proxima = futuras.length ? { id: futuras[0].ID_TURNO, fecha: diaCorto_(isoDe_(futuras[0].FECHA)), hora: hhmm_(futuras[0].HORA_INICIO), codigo: futuras[0].CODIGO, estado: futuras[0].ESTADO } : null;
    g.sugeridas = sugeridas_(g, caps, futuras);
    g.ausencias = turnos.filter(t => t.JEFATURA === k && t.ESTADO === 'No se presentó').length;
    g.canceladas = turnos.filter(t => t.JEFATURA === k && t.ESTADO === 'Cancelado').length;
    if (!soloJefatura) delete g.personas;
    return g;
  }).sort((a, b) => (a.pct - b.pct) || (b.personal - a.personal));
  const tot = servicios.reduce((a, g) => ({ obl: a.obl + g.obligatorias, ok: a.ok + g.cumplidas, personal: a.personal + g.personal }), { obl: 0, ok: 0, personal: 0 });
  const meta = G.meta || metaCiclo_(hoy), pctE = e => est[e] && est[e].obl ? Math.round(100 * est[e].ok / est[e].obl) : 0;
  const kpi = { personal: tot.personal, obligatorias: tot.obl, cumplidas: tot.ok, pct: tot.obl ? Math.round(100 * tot.ok / tot.obl) : 0,
    porEst: G.ests.map(e => ({ codigo: e, nombre: G.nombres[e] || e, personal: est[e].personal, pct: pctE(e) })),
    pctHZT: pctE('HZT'), pctHMH: pctE('HMH'), personalHZT: est.HZT ? est.HZT.personal : 0, personalHMH: est.HMH ? est.HMH.personal : 0,
    sinIncendio: servicios.filter(g => g.sinIncendio).length, personasSinIncendio: servicios.filter(g => g.sinIncendio).reduce((a, g) => a + g.personal, 0),
    nunca: servicios.filter(g => g.nunca).length, alDia: servicios.reduce((a, g) => a + g.alDia, 0),
    meta: meta, diasMeta: Math.max(0, Math.round((fechaHora_(dma_(meta)) - fechaHora_(dma_(hoy))) / 864e5)) };
  const nombres = {}; Object.keys(caps).forEach(c => nombres[c] = { nombre: caps[c].nombre, corto: nombreCorto_(caps[c]) });
  return { ok: true, version: VERSION_F7, calculado: ahora.toISOString(), grupo: G.grupo, grupos: alcance_().map(x => x.grupo), direccion: G.direccion, kpi: kpi, servicios: servicios, caps: nombres, secuencia: SECUENCIA_INCENDIO, personas: personas };
}
// Lo que conviene dictar primero: lo que más falta y se puede tomar ya (la secuencia de incendio, en orden)
function sugeridas_(g, caps, futuras) {
  const reservadas = {}; (futuras || []).forEach(t => { if (t.CODIGO && !reservadas[t.CODIGO]) reservadas[t.CODIGO] = diaCorto_(isoDe_(t.FECHA)); });
  return Object.keys(g.faltan).map(c => ({ codigo: c, nombre: caps[c] ? caps[c].nombre : c, corto: caps[c] ? nombreCorto_(caps[c]) : c, faltan: g.faltan[c], elegibles: g.elegibles[c] || 0,
    fuego: SECUENCIA_INCENDIO.indexOf(c), reservada: reservadas[c] || '' }))
    .filter(s => s.elegibles > 0)
    .sort((a, b) => (!!a.reservada - !!b.reservada) || (b.elegibles - a.elegibles) || ((a.fuego < 0 ? 9 : a.fuego) - (b.fuego < 0 ? 9 : b.fuego)) || a.codigo.localeCompare(b.codigo));
}
function escribirCumplimiento_(t) {
  const lib = SpreadsheetApp.getActive(), C = tabla_('CUMPLIMIENTO'), P = tabla_('CUMPLIMIENTO_PERSONAS'), cuando = fmt_(new Date(t.calculado));
  const filasS = t.servicios.map(g => filaDe_(C, { JEFATURA_O_SERVICIO: g.servicio, SIN_JEFATURA: g.sinJefatura ? 'Sí' : 'No', ESTABLECIMIENTO: g.establecimientos, PERSONAL: g.personal, OBLIGATORIAS: g.obligatorias,
    CUMPLIDAS: g.cumplidas, PCT: g.pct + ' %', AL_DIA: g.alDia, EXTINTORES: g.fuego.ext, SEGURIDAD_HUMANA: g.fuego.seg, EVACUACION: g.fuego.eva, INCENDIO_COMPLETO: g.fuego.completo,
    CON_ALGUNA_CAPACITACION: g.conAlguna, PROXIMA_RESERVA: g.proxima ? g.proxima.fecha + ' ' + g.proxima.hora + ' · ' + g.proxima.codigo + ' (' + g.proxima.estado + ')' : '',
    SUGERIDA: g.sugeridas.length ? g.sugeridas[0].codigo + ' · ' + g.sugeridas[0].corto : '', CALCULADO: cuando, GRUPO: t.grupo }));
  const filasP = t.personas.sort((a, b) => a.grupo.localeCompare(b.grupo) || a.ape.localeCompare(b.ape)).map(p => filaDe_(P, { DNI: p.dni, APELLIDOS: p.ape, NOMBRES: p.nom, ESTABLECIMIENTO: p.est,
    SERVICIO: p.servicio, FUNCION: p.funcion, JEFATURA_O_SERVICIO: p.grupo, OBLIGATORIAS: p.obl, CUMPLIDAS: p.ok, PCT: p.pct + ' %', LE_FALTA: p.falta.join(' · '), GRUPO: t.grupo }));
  [[C, filasS], [P, filasP]].forEach(x => {
    const T = x[0], sh = T.sh, n = Math.max(sh.getLastRow() - 5, 0), ig = T.i('GRUPO');
    x[1] = x[1].concat(T.filas.filter(r => String(r[0]).trim() && ig >= 0 && r[ig] && r[ig] !== t.grupo).map(r => r.slice(0, T.H.length)));   // filas de otros grupos: se conservan
    if (sh.getMaxRows() < 5 + x[1].length + 10) sh.insertRowsAfter(sh.getMaxRows(), 5 + x[1].length + 10 - sh.getMaxRows());   // las hojas nuevas traen 1000 filas
    if (n) sh.getRange(6, 1, n, T.H.length).clearContent();
    if (x[1].length) sh.getRange(6, 1, x[1].length, T.H.length).setValues(x[1]);
  });
  lib.getSheetByName('CUMPLIMIENTO').getRange(3, 1).setValue(t.grupo + ' · obligatorias cumplidas: ' + t.kpi.pct + ' % (' + t.kpi.porEst.map(e => e.codigo + ' ' + e.pct + ' %').join(' · ') + ') · personal ' + t.kpi.personal + ' · meta ' + dma_(t.kpi.meta) + ' · calculado ' + cuando);
}

// ------------------------------------------------------------------ Agenda: lectura
function turnos_() {
  const A = tabla_('AGENDA');
  return A.filas.map((r, k) => { const o = obj_(A, r); o._k = k; o.inicio = inicioDe_(o.FECHA, o.HORA_INICIO); o.fin = inicioDe_(o.FECHA, o.HORA_FIN || o.HORA_INICIO); return o; }).filter(o => o.ID_TURNO);
}
function turnoDe_(id) { const A = tabla_('AGENDA'), k = A.filas.findIndex(r => r[A.i('ID_TURNO')] === id); return { A: A, k: k, o: k >= 0 ? obj_(A, A.filas[k]) : null }; }
function usadosTurno_(A) { const u = {}; A.filas.forEach(r => u[r[A.i('ID_TURNO')]] = 1); return u; }
function nuevoIdTurno_(A, iso, hora, usados) {
  const base = 'TUR-' + iso.replace(/-/g, '') + '-' + String(hhmm_(hora) || '0000').replace(':', '');
  usados = usados || usadosTurno_(A);
  if (!usados[base]) return base;
  for (let i = 2; i < 99; i++) if (!usados[base + '-' + i]) return base + '-' + i;
  return base + '-' + Utilities.getUuid().slice(0, 4);
}
function franjas_() {
  const F = tabla_('FRANJAS');
  return F.filas.map(r => obj_(F, r)).filter(o => o.DIA && !/^no/i.test(o.VIGENTE)).map(o => ({ dia: DIAS_SEMANA.findIndex(d => norm_(d) === norm_(o.DIA)), diaTxt: o.DIA, desde: hhmm_(o.DESDE), hasta: hhmm_(o.HASTA), lugar: o.LUGAR || 'En el servicio' }))
    .filter(f => f.dia >= 0 && f.desde && f.hasta);
}
function franjasTexto_() {
  return franjas_().sort((a, b) => ((a.dia + 6) % 7) - ((b.dia + 6) % 7)).map(f => DIAS_SEMANA[f.dia].toLowerCase() + ' ' + f.desde.replace(/:00$/, '') + '–' + f.hasta.replace(/:00$/, '')).join(', ');
}
function dentroDeFranja_(iso, desde, hasta) {
  const d = diaSemana_(iso), a = minDe_(desde), b = minDe_(hasta);
  return franjas_().some(f => f.dia === d && minDe_(f.desde) <= a && b <= minDe_(f.hasta));
}
function inscriptosTurno_(t, I) {
  if (!t.ID_DICTADO) return [];
  I = I || tabla_('INSCRIPCIONES');
  return I.filas.map((r, k) => Object.assign(obj_(I, r), { _k: k })).filter(x => x.ID_DICTADO === t.ID_DICTADO && !/anulad/i.test(x.ESTADO));
}

// ------------------------------------------------------------------ Página pública (?a=1; ?c=TOKEN para cancelar; ?t=ID_TURNO abre esa clase)
function agendaPagina_(p) {
  const t = HtmlService.createTemplateFromFile('Agenda');
  t.c = String(p.c || '').replace(/[^A-Za-z0-9]/g, '');
  t.t = String(p.t || '').replace(/[^A-Za-z0-9-]/g, '');
  return t.evaluate().setTitle('Capacitaciones HyS · Agenda').addMetaTag('viewport', 'width=device-width, initial-scale=1').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
// Lo que ve cualquiera al entrar: clases abiertas y horarios libres para servicios
function agInicio() {
  prepararF7_();
  const ahora = new Date(), caps = capsMapa_(), I = tabla_('INSCRIPCIONES'), hasta = new Date(ahora.getTime() + 35 * 864e5);
  const T = turnos_();
  const clases = T.filter(t => t.ESTADO === 'Clase abierta' && t.inicio > ahora).sort((a, b) => a.inicio - b.inicio).map(t => {
    const cupo = num_(t.CUPO), usados = inscriptosTurno_(t, I).length, virtual = /^virtual/i.test(t.MODALIDAD);
    return { id: t.ID_TURNO, codigo: t.CODIGO, nombre: caps[t.CODIGO] ? caps[t.CODIGO].nombre : t.CODIGO, icono: caps[t.CODIGO] ? caps[t.CODIGO].icono : '', fecha: diaCorto_(isoDe_(t.FECHA)), iso: isoDe_(t.FECHA),
      hora: hhmm_(t.HORA_INICIO), horaFin: hhmm_(t.HORA_FIN), lugar: t.LUGAR, modalidad: t.MODALIDAD, quedan: virtual || !cupo ? null : Math.max(0, cupo - usados), lleno: !virtual && cupo > 0 && usados >= cupo };
  });
  const libres = T.filter(t => t.ESTADO === 'Libre' && /servicio/i.test(t.TIPO_TURNO) && t.inicio > new Date(ahora.getTime() + 2 * 3600e3) && t.inicio < hasta).sort((a, b) => a.inicio - b.inicio)
    .map(t => ({ id: t.ID_TURNO, fecha: diaCorto_(isoDe_(t.FECHA)), iso: isoDe_(t.FECHA), hora: hhmm_(t.HORA_INICIO), horaFin: hhmm_(t.HORA_FIN), lugar: t.LUGAR, confirmaHyS: (t.inicio - ahora) < HS_CONFIRMA * 3600e3 }));
  return { ok: true, clases: clases, libres: libres, franjas: franjasTexto_(), hsConfirma: HS_CONFIRMA, cargos: CARGOS_JEFATURA,
    jefaturas: jefaturas_().filter(j => srvLista_(j).length).map(j => j.JEFATURA).sort((a, b) => a.localeCompare(b)) };
}
// «Me anoto yo»: busca a la persona por DNI (nombre, servicio y correo, como en el registro)
function agPersona(dni) {
  const doc = soloDni_(dni); if (doc.length < 6 || doc.length > 9) return { ok: false, error: 'Revisá el DNI: escribilo sin puntos.' };
  const P = tabla_('PERSONAS'), r = P.filas.find(x => x[P.i('DNI')] === doc), b = enBase_(doc);
  if (!r && !b) return { ok: true, encontrado: false };
  const p = r ? obj_(P, r) : null;
  const nombre = b ? (b.APELLIDOS + ', ' + b.NOMBRES) : (p.APELLIDOS + ', ' + p.NOMBRES);
  const servicio = b ? sd_(b.SERVICIO) : sd_(p.SERVICIO), est = b ? b.ESTABLECIMIENTO : p.ESTABLECIMIENTO;
  const correo = [p && p.CORREO, b && b.EMAIL].map(x => String(x || '').trim()).find(correoOk_) || '';
  return { ok: true, encontrado: true, nombre: capitalizar_(nombre), detalle: [servicio, vacio_(est) ? '' : est].filter(Boolean).join(' · '), correo: correo };
}
function agAnotarme(d) {
  return conLock_(() => {
    const doc = soloDni_(d.dni), correo = String(d.correo || '').trim();
    if (doc.length < 6 || doc.length > 9) return { ok: false, error: 'Revisá el DNI: escribilo sin puntos.' };
    if (!correoOk_(correo)) return { ok: false, error: 'Escribí tu correo: ahí te llegan la confirmación, los recordatorios y el link para cancelar.' };
    const x = turnoDe_(d.id); if (!x.o || x.o.ESTADO !== 'Clase abierta') return { ok: false, error: 'Esa clase ya no está disponible. Elegí otra.' };
    const t = x.o, ini = inicioDe_(t.FECHA, t.HORA_INICIO); if (ini < new Date()) return { ok: false, error: 'Esa clase ya empezó.' };
    const I = tabla_('INSCRIPCIONES');
    if (inscripcionDe_(I, t.ID_DICTADO, doc) >= 0) return { ok: true, ya: true, mensaje: 'Ya estabas anotada/o en esta clase.' };
    const virtual = /^virtual/i.test(t.MODALIDAD), cupo = num_(t.CUPO);
    if (!virtual && cupo > 0 && cupoUsado_(I, t.ID_DICTADO) >= cupo) return { ok: false, error: 'Se completó el cupo de esta clase. Elegí otra fecha.' };
    // Persona: si no está en PERSONAS se toma de la base de trabajadores; si no está en ningún lado, con los datos que escribió
    const P = tabla_('PERSONAS'), fila = P.filas.findIndex(r => r[P.i('DNI')] === doc), b = enBase_(doc);
    if (fila >= 0) {
      const antes = P.filas[fila][P.i('CORREO')];
      if (antes !== correo) { setCampos_(P, fila, { CORREO: correo, ULTIMA_ACTUALIZACION: ahoraTxt_() }); historial_('Agenda', 'PERSONAS', doc, 'CORREO', antes, correo, 'Actualizado por la persona al anotarse'); }
    } else if (b) {
      agregar_(P, [{ DNI: doc, PAIS_DOCUMENTO: 'Argentina', APELLIDOS: b.APELLIDOS, NOMBRES: b.NOMBRES, PUBLICO: RED_TRELEW.indexOf(b.ESTABLECIMIENTO) >= 0 ? 'Red Trelew' : 'Red Chubut', CORREO: correo, TELEFONO: sd_(b.TELEFONO),
        ESTABLECIMIENTO: b.ESTABLECIMIENTO, SERVICIO: sd_(b.SERVICIO), FUNCION: sd_(b.FUNCION), VINCULO: sd_(b.VINCULO), EMPRESA: b.EMPRESA, PROFESION: sd_(b.FUNCION), CIUDAD: 's/d', PROVINCIA: 'Chubut', PAIS: 'Argentina',
        INSTITUCION: nombreEst_(b.ESTABLECIMIENTO), ORIGEN_DE_DATOS: 'Base de trabajadores', ULTIMA_ACTUALIZACION: ahoraTxt_() }]);
    } else {
      const ape = String(d.apellidos || '').trim(), nom = String(d.nombres || '').trim(), srv = String(d.servicio || '').trim(), lug = String(d.lugar || '').trim();
      if (!ape || !nom) return { ok: false, error: 'No encontramos tu DNI: escribí tu apellido y tu nombre.' };
      if (!srv || !lug) return { ok: false, error: 'Escribí dónde trabajás y en qué servicio o sector.' };
      const e = estCod_(lug);
      agregar_(P, [{ DNI: doc, PAIS_DOCUMENTO: 'Argentina', APELLIDOS: ape, NOMBRES: nom, PUBLICO: RED_TRELEW.indexOf(e) >= 0 ? 'Red Trelew' : 'Profesionales externos', CORREO: correo, TELEFONO: 's/d',
        ESTABLECIMIENTO: RED_TRELEW.indexOf(e) >= 0 ? e : 's/d', SERVICIO: srv, FUNCION: 's/d', VINCULO: 's/d', PROFESION: 's/d', INSTITUCION: lug, CIUDAD: 's/d', PROVINCIA: 's/d', PAIS: 'Argentina',
        ORIGEN_DE_DATOS: 'Agenda', ULTIMA_ACTUALIZACION: ahoraTxt_(), REVISAR: 'Se anotó desde la agenda y no está en la base de trabajadores' }]);
      aviso_('Persona nueva desde la agenda', 'PERSONAS', doc + ' · ' + ape, 'No está en la base de trabajadores. Revisar sus datos.');
    }
    if (b && correo !== String(b.EMAIL || '').trim()) actualizarBase_(b, correo, '');
    const token = tokenAg_();
    agregar_(I, [{ ID_INSCRIPCION: uid_('INS', doc), FECHA: ahoraTxt_(), ID_DICTADO: t.ID_DICTADO, DNI: doc, MODALIDAD_ELEGIDA: virtual ? 'Virtual' : 'Presencial', CONSULTA_PREVIA: 's/d', ESTADO_CONSULTA: 'No aplica',
      ESTADO: 'Inscripta', ASISTIO: '', CANAL: 'Agenda', FECHA_ANULACION: '', ANULADA_POR: '', MOTIVO: '', CORREO: correo, TOKEN_CANCELAR: token, RECORDATORIOS: '', ID_TURNO: t.ID_TURNO }]);
    const cap = capDe_(t.CODIGO) || { NOMBRE: t.CODIGO };
    enviar_(correo, 'Quedaste anotada/o: ' + cap.NOMBRE + ' · ' + diaCorto_(isoDe_(t.FECHA)), mailClase_(cap, t, token, 'confirmacion'), 'Confirmación', t.ID_TURNO, t.ID_DICTADO, t.CODIGO);
    return { ok: true, mensaje: '¡Listo, quedaste anotada/o!', clase: { nombre: cap.NOMBRE, fecha: diaCorto_(isoDe_(t.FECHA)), hora: hhmm_(t.HORA_INICIO), lugar: t.LUGAR } };
  });
}
// «Anoto a mi servicio»: reconoce a la jefatura por DNI y propone qué conviene dictar
function agJefatura(dni) {
  const doc = soloDni_(dni); if (doc.length < 6 || doc.length > 9) return { ok: false, error: 'Revisá el DNI: escribilo sin puntos.' };
  const mias = jefaturas_().filter(j => srvLista_(j).length && dnisJefatura_(j).indexOf(doc) >= 0);
  if (!mias.length) { const b = enBase_(doc); return { ok: true, conocido: false, nombre: b ? capitalizar_(b.NOMBRES + ' ' + b.APELLIDOS) : '' }; }
  const b = enBase_(doc), propia = mias.find(j => soloDni_(j.DNI_RESPONSABLE) === doc && !vacio_(j.RESPONSABLE));
  const nombre = propia ? propia.RESPONSABLE : (b ? capitalizar_(b.APELLIDOS + ', ' + b.NOMBRES) : 's/d');
  return { ok: true, conocido: true, nombre: nombre, servicios: mias.map(j => resumenJefatura_(j)) };
}
function agSugerencias(jefatura) {
  const j = jefaturas_().find(x => x.JEFATURA === jefatura); if (!j) return { ok: false, error: 'Elegí el servicio de la lista.' };
  return { ok: true, servicio: resumenJefatura_(j, true) };
}
function resumenJefatura_(j, sinCorreo) {
  const t = cumplimiento_(false, grupoDeJefatura_(j).grupo), g = t.servicios.find(s => s.servicio === j.JEFATURA);
  const correo = correoAvisos_(j);
  const caps = capsMapa_(), reglas = reglas_(true).filter(r => caps[r.codigo] && /^activ/i.test(caps[r.codigo].estado));
  return { jefatura: j.JEFATURA, personal: g ? g.personal : 0, pct: g ? g.pct : 0, correo: sinCorreo ? '' : correo, tieneCorreo: !!correo,
    incendio: g ? { req: g.fuego.req, ext: g.fuego.ext, seg: g.fuego.seg, eva: g.fuego.eva } : null,
    sugeridas: g ? g.sugeridas.slice(0, 6) : [],
    otras: (g ? g.sugeridas.map(s => s.codigo) : []).length ? [] : reglas.filter(r => r.tipo === 'O').map(r => r.codigo).filter((c, i, a) => a.indexOf(c) === i && SECUENCIA_INCENDIO.indexOf(c) <= 0).map(c => ({ codigo: c, nombre: caps[c].nombre })),
    proxima: g ? g.proxima : null };
}
function agReservar(d) {
  return conLock_(() => {
    const doc = soloDni_(d.dni); if (doc.length < 6 || doc.length > 9) return { ok: false, error: 'Revisá el DNI.' };
    const J = jefaturas_(), j = J.find(x => x.JEFATURA === d.jefatura); if (!j) return { ok: false, error: 'Elegí el servicio.' };
    const conocido = dnisJefatura_(j).indexOf(doc) >= 0;
    const x = turnoDe_(d.id); if (!x.o || x.o.ESTADO !== 'Libre') return { ok: false, error: 'Ese horario ya fue tomado. Elegí otro.' };
    const t = x.o, ini = inicioDe_(t.FECHA, t.HORA_INICIO), ahora = new Date(); if (ini < ahora) return { ok: false, error: 'Ese horario ya pasó.' };
    const cap = capDe_(d.codigo); if (!cap || !/^activ/i.test(cap.ESTADO)) return { ok: false, error: 'Elegí la capacitación.' };
    // La secuencia de incendio va en días distintos
    if (SECUENCIA_INCENDIO.indexOf(cap.CODIGO) >= 0 && turnos_().some(o => o.JEFATURA === j.JEFATURA && ACTIVOS_TURNO.indexOf(o.ESTADO) >= 0 && SECUENCIA_INCENDIO.indexOf(o.CODIGO) >= 0 && isoDe_(o.FECHA) === isoDe_(t.FECHA)))
      return { ok: false, error: 'Ese día el servicio ya tiene otra capacitación de incendio. La secuencia (extintores, seguridad humana, evacuación) va en días distintos.' };
    let correo = correoAvisos_(j); const correoDado = String(d.correo || '').trim();
    if (!correo || !conocido) { if (!correoOk_(correoDado)) return { ok: false, error: 'Escribí un correo para los avisos.' }; }
    if (!conocido) {
      if (vacio_(d.nombre)) return { ok: false, error: 'Escribí tu nombre y apellido.' };
      if (CARGOS_JEFATURA.indexOf(d.cargo) < 0) return { ok: false, error: 'Elegí tu cargo.' };
    }
    const nombre = conocido ? (soloDni_(j.DNI_RESPONSABLE) === doc ? sd_(j.RESPONSABLE) : (vacio_(d.nombre) ? 's/d' : String(d.nombre).trim())) : String(d.nombre).trim();
    const cargo = conocido ? (soloDni_(j.DNI_RESPONSABLE) === doc ? sd_(j.CARGO) : 'Coordinación o A/C') : d.cargo;
    if (!correo && correoOk_(correoDado) && conocido) { const JJ = tabla_('JEFATURAS'); setCampos_(JJ, j._k, { CORREO_RESPONSABLE: correoDado, ACTUALIZADO: Utilities.formatDate(new Date(), ZONA, 'dd/MM/yyyy') + ' · agenda' }); correo = correoDado; }
    const avisos = [correo, conocido ? '' : correoDado].filter(correoOk_).filter((m, i, a) => a.indexOf(m) === i).join(', ');
    const directo = conocido && (ini - ahora) >= HS_CONFIRMA * 3600e3;
    const token = tokenAg_(), cambios = { TIPO_TURNO: 'Horario para servicios', CODIGO: cap.CODIGO, JEFATURA: j.JEFATURA, PEDIDO_POR_DNI: doc, PEDIDO_POR: nombre, CARGO: cargo, CORREO_AVISOS: avisos,
      FECHA_PEDIDO: ahoraTxt_(), TOKEN: token, ESTADO: directo ? 'Reservado' : 'Pendiente', CONFIRMADO_POR: directo ? 'Automático (jefatura registrada, más de ' + HS_CONFIRMA + ' h)' : '',
      OBSERVACIONES: vacio_(d.observaciones) ? t.OBSERVACIONES : String(d.observaciones).slice(0, 300) };
    if (directo) cambios.ID_DICTADO = crearDictadoTurno_(Object.assign({}, t, cambios), cap);
    setCampos_(x.A, x.k, cambios);
    historial_('Agenda (' + doc + ')', 'AGENDA', t.ID_TURNO, 'ESTADO', 'Libre', cambios.ESTADO, cap.CODIGO + ' · ' + j.JEFATURA + (conocido ? '' : ' · pedido por alguien que no está en JEFATURAS'));
    if (!directo) aviso_('Reserva para confirmar', 'AGENDA', t.ID_TURNO, j.JEFATURA + ' · ' + cap.CODIGO + ' · ' + dma_(isoDe_(t.FECHA)) + ' ' + hhmm_(t.HORA_INICIO) + (conocido ? ' · faltan menos de ' + HS_CONFIRMA + ' h' : ' · lo pidió ' + nombre + ' (' + cargo + '), que no está en JEFATURAS'));
    const o = Object.assign({}, t, cambios);
    enviar_(avisos, (directo ? 'Reserva confirmada: ' : 'Recibimos el pedido: ') + cap.NOMBRE + ' · ' + j.JEFATURA, mailReserva_(cap, o, directo ? 'confirmada' : 'pendiente'), directo ? 'Confirmación' : 'Pedido recibido', t.ID_TURNO, cambios.ID_DICTADO || '', cap.CODIGO);
    limpiarCumpl_();
    return { ok: true, estado: cambios.ESTADO, mensaje: directo ? 'Reserva confirmada.' : 'Pedido recibido: Higiene y Seguridad lo confirma y te avisa por correo.',
      reserva: { nombre: cap.NOMBRE, jefatura: j.JEFATURA, fecha: diaCorto_(isoDe_(t.FECHA)), hora: hhmm_(t.HORA_INICIO), horaFin: hhmm_(t.HORA_FIN), lugar: t.LUGAR, avisos: avisos } };
  });
}
// Cancelar con el link del correo
function agCancelarInfo(token) {
  const tk = String(token || '').replace(/[^A-Za-z0-9]/g, ''); if (tk.length < 10) return { ok: false, error: 'El link para cancelar no es válido.' };
  const x = turnos_().find(t => t.TOKEN === tk);
  if (x) return { ok: true, tipo: 'reserva', activo: ACTIVOS_TURNO.indexOf(x.ESTADO) >= 0 && x.inicio > new Date(), estado: x.ESTADO, detalle: nombreCap_(x.CODIGO) + ' · ' + x.JEFATURA + ' · ' + diaCorto_(isoDe_(x.FECHA)) + ' ' + hhmm_(x.HORA_INICIO) };
  const I = tabla_('INSCRIPCIONES'), r = I.filas.find(f => f[I.i('TOKEN_CANCELAR')] === tk);
  if (!r) return { ok: false, error: 'No encontramos esa inscripción.' };
  const o = obj_(I, r), t = turnos_().find(y => y.ID_TURNO === o.ID_TURNO) || {};
  return { ok: true, tipo: 'inscripcion', activo: !/anulad/i.test(o.ESTADO) && t.inicio > new Date(), estado: o.ESTADO, detalle: nombreCap_(t.CODIGO || '') + ' · ' + (t.FECHA ? diaCorto_(isoDe_(t.FECHA)) + ' ' + hhmm_(t.HORA_INICIO) : '') };
}
function agCancelar(d) {
  const tk = String(d.t || '').replace(/[^A-Za-z0-9]/g, ''), motivo = String(d.motivo || '').trim().slice(0, 300);
  if (!motivo) return { ok: false, error: 'Contanos el motivo (queda registrado).' };
  const info = agCancelarInfo(tk); if (!info.ok) return info;
  if (!info.activo) return { ok: false, error: 'Ya no se puede cancelar (estado: ' + info.estado + ').' };
  if (info.tipo === 'inscripcion') {
    const I = tabla_('INSCRIPCIONES'), r = I.filas.find(f => f[I.i('TOKEN_CANCELAR')] === tk);
    return inscAnular_({ id: r[I.i('ID_INSCRIPCION')], motivo: motivo }, 'La persona');
  }
  return conLock_(() => {
    const t = turnos_().find(x => x.TOKEN === tk), A = tabla_('AGENDA');
    setCampos_(A, t._k, { ESTADO: 'Cancelado', MOTIVO: 'Cancelado por el servicio: ' + motivo });
    historial_('Agenda (servicio)', 'AGENDA', t.ID_TURNO, 'ESTADO', t.ESTADO, 'Cancelado', motivo);
    if (t.ID_DICTADO) suspenderDictado_(t.ID_DICTADO, 'Cancelado por el servicio: ' + motivo);
    liberarHorario_(t);
    aviso_('Reserva cancelada por el servicio', 'AGENDA', t.ID_TURNO, t.JEFATURA + ' · ' + motivo);
    limpiarCumpl_();
    return { ok: true, mensaje: 'Listo, cancelamos la reserva y el horario quedó libre. Gracias por avisar.' };
  });
}
// Si quien cancela avisa con tiempo, el horario vuelve a ofrecerse
function liberarHorario_(t) {
  if (t.inicio - new Date() < 3 * 3600e3) return;
  const A = tabla_('AGENDA');
  agregar_(A, [{ ID_TURNO: nuevoIdTurno_(A, isoDe_(t.FECHA), t.HORA_INICIO), FECHA: dma_(isoDe_(t.FECHA)), HORA_INICIO: hhmm_(t.HORA_INICIO), HORA_FIN: hhmm_(t.HORA_FIN), TIPO_TURNO: 'Horario para servicios',
    MODALIDAD: 'Presencial', LUGAR: t.LUGAR, ESTADO: 'Libre', CREADO: ahoraTxt_(), ORIGEN: 'Liberado de ' + t.ID_TURNO }]);
}
function suspenderDictado_(id, motivo) {
  const D = tabla_('DICTADOS'), k = D.filas.findIndex(r => r[D.i('ID_DICTADO')] === id); if (k < 0) return;
  const antes = D.filas[k][D.i('ESTADO')]; setCampos_(D, k, { ESTADO: 'Suspendido', MOTIVO: motivo }); historial_('Agenda', 'DICTADOS', id, 'ESTADO', antes, 'Suspendido', motivo);
}
// Dictado (registro con QR) para un horario reservado o una clase abierta
function crearDictadoTurno_(t, cap, conInscripcion) {
  const D = tabla_('DICTADOS');
  const o = completarDictado_(D, { CODIGO: cap.CODIGO, VERSION: cap.VERSION, ENCUENTRO_N: 1, FECHA: dma_(isoDe_(t.FECHA)), HORA_INICIO: hhmm_(t.HORA_INICIO), HORA_FIN: hhmm_(t.HORA_FIN),
    MODALIDAD: t.MODALIDAD || 'Presencial', LUGAR: vacio_(t.LUGAR) ? 'En el servicio' : t.LUGAR, ESTABLECIMIENTO: 's/d', SERVICIO_DESTINO: t.JEFATURA || 'Todos', ORGANIZADOR: 'Higiene y Seguridad',
    DISERTANTES: 'Belén Pellegrini', LINK_INSCRIPCION: conInscripcion ? 'Sí' : '', CUPO_PRESENCIAL: t.CUPO ? String(t.CUPO) : (conInscripcion ? '' : 'sin cupo'), OBSERVACIONES: 'Desde la agenda · ' + t.ID_TURNO }, cap);
  agregar_(D, [o]);
  historial_('Agenda', 'DICTADOS', o.ID_DICTADO, 'Alta', '', cap.CODIGO + ' · ' + o.FECHA + ' ' + o.HORA_INICIO, 'Dictado creado desde la agenda (' + t.ID_TURNO + ')');
  return o.ID_DICTADO;
}

// ------------------------------------------------------------------ Correos de la agenda (solo estos salen solos)
function puedeEnviar_() {
  try { return GmailApp.getAliases().map(a => String(a).toLowerCase()).indexOf(CORREO_HYS) >= 0; } catch (e) { return false; }
}
function enviar_(para, asunto, html, tipo, idTurno, idDictado, codigo) {
  const lista = String(para || '').split(/[,;]\s*/).map(x => x.trim()).filter(correoOk_);
  const M = tabla_('_MENSAJES'), reg = estado => agregar_(M, [{ ID_MENSAJE: uid_('MSG', ''), FECHA: ahoraTxt_(), TIPO: tipo, CANAL: 'Correo', DESTINATARIOS: lista.join(', ') || 's/d', ID_DICTADO: idDictado || '', CODIGO: codigo || '', ASUNTO: asunto, ESTADO: estado, QUIEN: 'Agenda (automático)', ID_TURNO: idTurno || '', DETALLE: '' }]);
  if (!lista.length) { reg('Sin correo'); return false; }
  if (!puedeEnviar_()) { reg('No enviado: falta «Enviar como» ' + CORREO_HYS); aviso_('Correo de la agenda sin enviar', '_MENSAJES', idTurno || '', 'Falta configurar ' + CORREO_HYS + ' como «Enviar como» en el Gmail de la cuenta del libro.'); return false; }
  try {
    GmailApp.sendEmail(lista.join(','), asunto, html.replace(/<br\s*\/?>/g, '\n').replace(/<[^>]+>/g, '').replace(/\n{3,}/g, '\n\n'), { from: CORREO_HYS, name: REMITENTE, htmlBody: html, replyTo: CORREO_HYS });
    reg('Enviado'); return true;
  } catch (e) { reg('Error: ' + e.message); aviso_('Error al enviar un correo de la agenda', '_MENSAJES', idTurno || '', e.message); return false; }
}
function marcoMail_(titulo, cuerpo) {
  return '<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#3D4F58;font-size:15px;line-height:1.5">' +
    '<div style="background:#0D313F;color:#fff;padding:16px 20px;border-radius:12px 12px 0 0"><div style="font-size:11px;letter-spacing:1px;opacity:.8">HIGIENE Y SEGURIDAD LABORAL · HZT / HMH</div><div style="font-size:19px;font-weight:bold;margin-top:4px">' + titulo + '</div></div>' +
    '<div style="border:1px solid #DCE5E9;border-top:0;padding:18px 20px;border-radius:0 0 12px 12px">' + cuerpo + '</div>' +
    '<div style="text-align:center;padding:14px 0 4px"><img src="' + LOGO_HYSL + '" alt="HySL · Hospitales más seguros para las personas" style="height:38px"></div>' +
    '<div style="text-align:center;font-size:11px;color:#7A8A92">Servicio de Higiene y Seguridad Laboral · ' + CORREO_HYS + '<br>Correo automático de la agenda de capacitaciones.</div></div>';
}
function cajaDato_(filas) { return '<table style="width:100%;border-collapse:collapse;margin:10px 0;background:#F1F6F8;border-radius:10px">' + filas.map(f => '<tr><td style="padding:6px 12px;color:#5894A7;font-size:12px;width:34%">' + f[0] + '</td><td style="padding:6px 12px;font-weight:bold;color:#0D313F">' + f[1] + '</td></tr>').join('') + '</table>'; }
function boton_(txt, url, gris) { return '<a href="' + url + '" style="display:inline-block;margin:6px 6px 0 0;padding:10px 16px;border-radius:999px;text-decoration:none;font-weight:bold;' + (gris ? 'background:#fff;color:#0D313F;border:1px solid #0D313F' : 'background:#5894A7;color:#fff') + '">' + txt + '</a>'; }
function mailClase_(cap, t, token, tipo, dias) {
  const cuando = DIAS_SEMANA[diaSemana_(isoDe_(t.FECHA))] + ' ' + dma_(isoDe_(t.FECHA)) + ' · ' + hhmm_(t.HORA_INICIO) + (t.HORA_FIN ? ' a ' + hhmm_(t.HORA_FIN) : '') + ' h';
  const intro = tipo === 'recordatorio' ? (dias === 1 ? 'Te recordamos que <b>mañana</b> tenés esta capacitación.' : 'Te recordamos que en <b>' + dias + ' días</b> tenés esta capacitación.') :
    tipo === 'suspension' ? 'Te avisamos que esta clase <b>se suspendió</b>. Disculpá las molestias: podés anotarte en otra fecha desde la agenda.' : 'Quedaste anotada/o en esta capacitación.';
  const pie = tipo === 'suspension' ? boton_('Ver otras fechas', AGENDA_WEB) : '<p>El día de la clase registrás tu asistencia con el QR o el link que se muestra en el aula.</p>' + boton_('Ver la agenda', AGENDA_WEB) + boton_('No puedo ir: cancelar', AGENDA_WEB + '?c=' + token, true);
  return marcoMail_(cap.NOMBRE, '<p>' + intro + '</p>' + cajaDato_([['Cuándo', cuando], ['Dónde', sd_(t.LUGAR) + (t.MODALIDAD && !/presencial/i.test(t.MODALIDAD) ? ' · ' + t.MODALIDAD : '')], ['Capacitación', cap.CODIGO + ' · ' + cap.NOMBRE]]) + pie);
}
function mailReserva_(cap, t, tipo, dias) {
  const cuando = DIAS_SEMANA[diaSemana_(isoDe_(t.FECHA))] + ' ' + dma_(isoDe_(t.FECHA)) + ' · ' + hhmm_(t.HORA_INICIO) + (t.HORA_FIN ? ' a ' + hhmm_(t.HORA_FIN) : '') + ' h';
  const intro = {
    confirmada: 'La reserva del horario para el servicio quedó <b>confirmada</b>.',
    pendiente: 'Recibimos el pedido de horario para el servicio. <b>Higiene y Seguridad lo confirma</b> y te avisamos por este medio.',
    recordatorio: dias === 1 ? 'Te recordamos que <b>mañana</b> el servicio tiene esta capacitación.' : 'Te recordamos que en <b>' + dias + ' días</b> el servicio tiene esta capacitación.',
    suspension: 'Te avisamos que Higiene y Seguridad <b>suspendió</b> este horario. Disculpá las molestias: podés reservar otro desde la agenda.',
    rechazada: 'No pudimos confirmar este pedido de horario. Podés elegir otro desde la agenda o responder este correo.'
  }[tipo];
  const fin = /suspension|rechazada/.test(tipo) ? boton_('Elegir otro horario', AGENDA_WEB) :
    '<p>No hace falta enviar la lista de asistentes: el día de la clase cada persona registra su asistencia con el QR. Conviene que esté todo el personal del turno que pueda.</p>' + boton_('Ver la agenda', AGENDA_WEB) + boton_('Cancelar la reserva', AGENDA_WEB + '?c=' + t.TOKEN, true);
  return marcoMail_(cap.NOMBRE, '<p>' + intro + '</p>' + cajaDato_([['Servicio', t.JEFATURA], ['Cuándo', cuando], ['Dónde', sd_(t.LUGAR)], ['Capacitación', cap.CODIGO + ' · ' + cap.NOMBRE], ['Pedido por', sd_(t.PEDIDO_POR) + (vacio_(t.CARGO) ? '' : ' (' + t.CARGO + ')')]]) + fin +
    '<p style="font-size:12px;color:#7A8A92;margin-top:16px">La capacitación del personal en prevención de riesgos es una obligación del establecimiento y un derecho de quienes trabajan (Ley N.º 19.587, art. 9, inc. k; Decreto N.º 351/79, arts. 208 a 214; Res. SRT N.º 905/2015).</p>');
}

// ------------------------------------------------------------------ Recordatorios y cierre de horarios pasados (disparador cada hora)
function agRecordatorios() {
  const lock = LockService.getScriptLock(); if (!lock.tryLock(20000)) return;
  try {
    prepararF7_();
    const ahora = new Date(), hoy = iso_(ahora), hora = Number(Utilities.formatDate(ahora, ZONA, 'H'));
    cerrarPasados_(ahora);
    if (hora < HORA_RECORDATORIO) return;
    const A = tabla_('AGENDA'), I = tabla_('INSCRIPCIONES'), P = tabla_('PERSONAS'), correoDe = {};
    P.filas.forEach(r => { correoDe[r[P.i('DNI')]] = r[P.i('CORREO')]; });
    turnos_().filter(t => (t.ESTADO === 'Reservado' || t.ESTADO === 'Clase abierta') && t.inicio > ahora).forEach(t => {
      const dias = Math.round((fechaHora_(dma_(isoDe_(t.FECHA))) - fechaHora_(dma_(hoy))) / 864e5);
      if (RECORDAR_DIAS.indexOf(dias) < 0) return;
      const marca = dias + 'd', cap = capDe_(t.CODIGO) || { NOMBRE: t.CODIGO, CODIGO: t.CODIGO };
      if (t.ESTADO === 'Reservado') {
        if (String(t.RECORDATORIOS || '').split(/\s*·\s*/).some(x => x.indexOf(marca + ' ') === 0)) return;
        enviar_(t.CORREO_AVISOS, 'Recordatorio: ' + cap.NOMBRE + ' · ' + t.JEFATURA + ' · ' + diaCorto_(isoDe_(t.FECHA)), mailReserva_(cap, t, 'recordatorio', dias), 'Recordatorio ' + dias + ' día(s)', t.ID_TURNO, t.ID_DICTADO, t.CODIGO);
        setCampos_(A, t._k, { RECORDATORIOS: [t.RECORDATORIOS, marca + ' ' + Utilities.formatDate(ahora, ZONA, 'dd/MM HH:mm')].filter(x => !vacio_(x)).join(' · ') });
      } else {
        let n = 0;
        inscriptosTurno_(t, I).forEach(x => {
          if (String(x.RECORDATORIOS || '').split(/\s*·\s*/).some(y => y.indexOf(marca + ' ') === 0)) return;
          const para = correoOk_(x.CORREO) ? x.CORREO : correoDe[x.DNI];
          enviar_(para, 'Recordatorio: ' + cap.NOMBRE + ' · ' + diaCorto_(isoDe_(t.FECHA)), mailClase_(cap, t, x.TOKEN_CANCELAR, 'recordatorio', dias), 'Recordatorio ' + dias + ' día(s)', t.ID_TURNO, t.ID_DICTADO, t.CODIGO);
          setCampos_(I, x._k, { RECORDATORIOS: [x.RECORDATORIOS, marca + ' ' + Utilities.formatDate(ahora, ZONA, 'dd/MM HH:mm')].filter(y => !vacio_(y)).join(' · ') }); n++;
        });
        if (n) setCampos_(A, t._k, { RECORDATORIOS: [t.RECORDATORIOS, marca + ' ' + n + ' persona(s) ' + Utilities.formatDate(ahora, ZONA, 'dd/MM')].filter(x => !vacio_(x)).join(' · ') });
      }
    });
    // Programas con inscripción: recordatorio a los inscriptos antes de CADA encuentro (encuentro 1: 7, 2 y 1 días antes; los demás: 1 día antes)
    programasConInscripcion_().forEach(p => {
      const ins = I.filas.map((r, k) => Object.assign(obj_(I, r), { _k: k })).filter(x => x.ID_DICTADO === p.o1.ID_DICTADO && !/anulad/i.test(x.ESTADO));
      if (!ins.length) return;
      p.encuentros.forEach(o => {
        const n = num_(o.ENCUENTRO_N), f = isoDe_(o.FECHA), dias = Math.round((fechaHora_(dma_(f)) - fechaHora_(dma_(hoy))) / 864e5);
        if (dias < 1 || (n === 1 ? RECORDAR_DIAS.indexOf(dias) < 0 : dias !== 1)) return;
        const marca = 'E' + n + '-' + dias + 'd';
        ins.forEach(x => {
          if (String(x.RECORDATORIOS || '').split(/\s*·\s*/).some(y => y.indexOf(marca + ' ') === 0)) return;
          const para = correoOk_(x.CORREO) ? x.CORREO : correoDe[x.DNI]; if (!correoOk_(para)) return;
          enviar_(para, 'Recordatorio: ' + p.cap.NOMBRE + ' · encuentro ' + n + ' de ' + p.total + ' · ' + diaCorto_(f), mailPrograma_(p.cap, o, n, p.total, dias), 'Recordatorio programa · encuentro ' + n + ' · ' + dias + ' día(s)', '', o.ID_DICTADO, o.CODIGO);
          x.RECORDATORIOS = [x.RECORDATORIOS, marca + ' ' + Utilities.formatDate(ahora, ZONA, 'dd/MM HH:mm')].filter(y => !vacio_(y)).join(' · ');
          setCampos_(I, x._k, { RECORDATORIOS: x.RECORDATORIOS });
        });
      });
    });
  } finally { lock.releaseLock(); }
}
// Libre que pasó: «Sin uso». Reservado o clase abierta que pasó y tuvo asistentes: «Realizado».
function cerrarPasados_(ahora) {
  const A = tabla_('AGENDA'), R = tabla_('REGISTROS'), conAsis = {};
  R.filas.forEach(r => { const id = r[R.i('ID_DICTADO')]; if (id && !/anulad/i.test(r[R.i('ESTADO')])) conAsis[id] = (conAsis[id] || 0) + 1; });
  turnos_().forEach(t => {
    if (t.fin > ahora) return;
    if (t.ESTADO === 'Libre') setCampos_(A, t._k, { ESTADO: 'Sin uso' });
    else if ((t.ESTADO === 'Reservado' || t.ESTADO === 'Clase abierta') && conAsis[t.ID_DICTADO]) setCampos_(A, t._k, { ESTADO: 'Realizado' });
    else if (t.ESTADO === 'Pendiente') { setCampos_(A, t._k, { ESTADO: 'Sin uso', MOTIVO: 'Pedido sin confirmar' }); }
  });
}
function asistentesDe_(idDic, R) { if (!idDic) return 0; R = R || tabla_('REGISTROS'); const v = {}; R.filas.forEach(r => { if (r[R.i('ID_DICTADO')] === idDic && !/anulad/i.test(r[R.i('ESTADO')])) v[r[R.i('DNI')]] = 1; }); return Object.keys(v).length; }

// ------------------------------------------------------------------ Portal (con clave): agenda
function agSemana_(d) {
  prepararF7_();
  const ahora = new Date(), hoy = iso_(ahora);
  let desde = /^\d{4}-\d{2}-\d{2}$/.test(String(d && d.desde || '')) ? d.desde : sumarDias_(hoy, diaSemana_(hoy) === 0 ? 1 : diaSemana_(hoy) === 6 ? 2 : 0);   // sábado y domingo: muestra la semana que viene
  desde = sumarDias_(desde, -((diaSemana_(desde) + 6) % 7));   // lunes
  const hasta = sumarDias_(desde, 6), caps = capsMapa_(), I = tabla_('INSCRIPCIONES'), R = tabla_('REGISTROS'), T = turnos_();
  const semana = T.filter(t => { const f = isoDe_(t.FECHA); return f >= desde && f <= hasta; }).sort((a, b) => a.inicio - b.inicio).map(t => vistaTurno_(t, caps, I, R));
  const prox14 = T.filter(t => t.inicio > ahora && t.inicio < new Date(ahora.getTime() + 14 * 864e5));
  const mes = hoy.slice(0, 7);
  const kpi = { ofrecidos: prox14.filter(t => /servicio/i.test(t.TIPO_TURNO) && t.ESTADO !== 'Anulado').length, reservados: prox14.filter(t => /servicio/i.test(t.TIPO_TURNO) && (t.ESTADO === 'Reservado' || t.ESTADO === 'Pendiente')).length,
    clases: prox14.filter(t => t.ESTADO === 'Clase abierta').length, anotados: prox14.filter(t => t.ESTADO === 'Clase abierta').reduce((a, t) => a + inscriptosTurno_(t, I).length, 0),
    pendientes: T.filter(t => t.ESTADO === 'Pendiente' && t.inicio > ahora).length, ausencias: T.filter(t => t.ESTADO === 'No se presentó' && isoDe_(t.FECHA).slice(0, 7) === mes).length,
    sinMarcar: T.filter(t => (t.ESTADO === 'Reservado' || t.ESTADO === 'Clase abierta') && t.fin < ahora).length };
  const pendientes = T.filter(t => t.ESTADO === 'Pendiente' && t.inicio > ahora).sort((a, b) => a.inicio - b.inicio).map(t => vistaTurno_(t, caps, I, R));
  const sinMarcar = T.filter(t => (t.ESTADO === 'Reservado' || t.ESTADO === 'Clase abierta') && t.fin < ahora).sort((a, b) => a.inicio - b.inicio).map(t => vistaTurno_(t, caps, I, R));
  return { ok: true, desde: desde, hasta: hasta, turnos: semana, kpi: kpi, pendientes: pendientes, sinMarcar: sinMarcar, franjas: franjas_(), franjasTexto: franjasTexto_(), envioOk: puedeEnviar_(),
    disparador: !!ScriptApp.getProjectTriggers().find(x => x.getHandlerFunction() === 'agRecordatorios'), estados: ESTADOS_TURNO,
    capacitaciones: Object.keys(caps).filter(c => /^activ/i.test(caps[c].estado)).map(c => ({ codigo: c, nombre: caps[c].nombre })), lugares: listasAdmin_().lugares };
}
function vistaTurno_(t, caps, I, R) {
  const ins = t.ID_DICTADO ? inscriptosTurno_(t, I).length : 0;
  return { id: t.ID_TURNO, fecha: isoDe_(t.FECHA), dia: diaCorto_(isoDe_(t.FECHA)), hora: hhmm_(t.HORA_INICIO), horaFin: hhmm_(t.HORA_FIN), tipo: t.TIPO_TURNO, codigo: t.CODIGO, nombre: caps[t.CODIGO] ? caps[t.CODIGO].nombre : '',
    corto: caps[t.CODIGO] ? nombreCorto_(caps[t.CODIGO]) : '', modalidad: t.MODALIDAD, lugar: t.LUGAR, cupo: t.CUPO, estado: t.ESTADO, idDictado: t.ID_DICTADO, jefatura: t.JEFATURA, pedidoPor: t.PEDIDO_POR,
    pedidoDni: t.PEDIDO_POR_DNI, cargo: t.CARGO, correo: t.CORREO_AVISOS, fechaPedido: t.FECHA_PEDIDO, confirmadoPor: t.CONFIRMADO_POR, motivo: t.MOTIVO, recordatorios: t.RECORDATORIOS, publicado: t.PUBLICADO,
    observaciones: t.OBSERVACIONES, origen: t.ORIGEN, inscriptos: ins, asistentes: asistentesDe_(t.ID_DICTADO, R), pasado: t.fin < new Date() };
}
// Generar horarios libres dentro de las franjas, entre dos fechas
function agAbrir_(d) {
  return conLock_(() => {
    const desde = d.desde || iso_(new Date()), hasta = d.hasta || sumarDias_(desde, 27), dur = num_(d.duracion) || DURACION_TURNO;
    if (hasta < desde) return { ok: false, error: 'Revisá las fechas.' };
    if (sumarDias_(desde, 92) < hasta) return { ok: false, error: 'Hasta tres meses por vez.' };
    const F = franjas_(); if (!F.length) return { ok: false, error: 'No hay franjas vigentes en la hoja FRANJAS.' };
    const A = tabla_('AGENDA'), T = turnos_(), nuevos = [], ahora = new Date(), feriados = String(d.saltear || '').split(/[,;\s]+/).map(isoDe_).filter(Boolean);
    for (let f = desde; f <= hasta; f = sumarDias_(f, 1)) {
      if (feriados.indexOf(f) >= 0) continue;
      F.filter(x => x.dia === diaSemana_(f)).forEach(x => {
        for (let m = minDe_(x.desde); m + dur <= minDe_(x.hasta); m += dur) {
          const ini = fechaHora_(dma_(f) + ' ' + hhmmDe_(m)); if (ini < ahora) continue;
          const choca = T.concat(nuevos.map(n => ({ FECHA: n.FECHA, inicio: inicioDe_(n.FECHA, n.HORA_INICIO), fin: inicioDe_(n.FECHA, n.HORA_FIN), ESTADO: 'Libre' })))
            .some(t => isoDe_(t.FECHA) === f && ['Anulado', 'Cancelado', 'Suspendido'].indexOf(t.ESTADO) < 0 && t.inicio < new Date(ini.getTime() + dur * 6e4) && t.fin > ini);
          if (choca) continue;
          nuevos.push({ ID_TURNO: '', FECHA: dma_(f), HORA_INICIO: hhmmDe_(m), HORA_FIN: hhmmDe_(m + dur), TIPO_TURNO: 'Horario para servicios', MODALIDAD: 'Presencial', LUGAR: x.lugar, ESTADO: 'Libre', CREADO: ahoraTxt_(), ORIGEN: 'Franja ' + x.diaTxt });
        }
      });
    }
    const usados = usadosTurno_(A);
    nuevos.forEach(n => { n.ID_TURNO = nuevoIdTurno_(A, isoDe_(n.FECHA), n.HORA_INICIO, usados); usados[n.ID_TURNO] = 1; });
    agregar_(A, nuevos);
    if (nuevos.length) historial_('HyS (portal)', 'AGENDA', desde + ' a ' + hasta, 'Alta', '', nuevos.length + ' horario(s)', 'Horarios abiertos dentro de las franjas');
    return { ok: true, cantidad: nuevos.length, mensaje: nuevos.length ? nuevos.length + ' horario(s) nuevos de ' + dur + ' minutos.' : 'No había horarios nuevos para abrir en esas fechas (ya estaban o se superponen).' };
  });
}
// Clase abierta: en un horario libre o en otro día y hora (fuera de franja queda anotado)
function agClase_(d) {
  return conLock_(() => {
    const cap = capDe_(d.codigo); if (!cap || !/^activ/i.test(cap.ESTADO)) return { ok: false, error: 'Elegí una capacitación activa.' };
    const virtual = /^virtual/i.test(d.modalidad || ''), A = tabla_('AGENDA');
    let x = d.id ? turnoDe_(d.id) : null;
    if (x && (!x.o || x.o.ESTADO !== 'Libre')) return { ok: false, error: 'Ese horario ya no está libre.' };
    const fecha = x ? isoDe_(x.o.FECHA) : d.fecha, hora = x ? hhmm_(x.o.HORA_INICIO) : d.hora, horaFin = x ? hhmm_(x.o.HORA_FIN) : (d.horaFin || hhmmDe_(minDe_(d.hora) + DURACION_TURNO));
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(fecha || '')) || !/^\d{1,2}:\d{2}$/.test(String(hora || ''))) return { ok: false, error: 'Falta la fecha o la hora.' };
    if (inicioDe_(dma_(fecha), hora) < new Date()) return { ok: false, error: 'Esa fecha ya pasó.' };
    const lugar = virtual ? 'Virtual' : (vacio_(d.lugar) ? (x ? x.o.LUGAR : '') : d.lugar); if (!virtual && vacio_(lugar)) return { ok: false, error: 'Elegí el lugar.' };
    const cupo = virtual ? '' : String(num_(d.cupo) || num_(capacidad_(lugar)) || '');
    const t = { ID_TURNO: x ? x.o.ID_TURNO : nuevoIdTurno_(A, fecha, hora), FECHA: dma_(fecha), HORA_INICIO: hora, HORA_FIN: horaFin, TIPO_TURNO: 'Clase abierta', CODIGO: cap.CODIGO,
      MODALIDAD: modalidadPorLugar_(d.modalidad || 'Presencial', lugar), LUGAR: lugar, CUPO: cupo, ESTADO: 'Clase abierta', PUBLICADO: d.publicar === false ? 'No' : 'Sí', CONFIRMADO_POR: 'HyS',
      OBSERVACIONES: (x || dentroDeFranja_(fecha, hora, horaFin)) ? sd_(d.observaciones) : 'Fuera de franja: cargada por HyS' + (vacio_(d.observaciones) ? '' : ' · ' + d.observaciones), CREADO: ahoraTxt_(), ORIGEN: 'Portal' };
    t.ID_DICTADO = crearDictadoTurno_(t, cap, true);
    if (x) setCampos_(A, x.k, t); else agregar_(A, [t]);
    historial_('HyS (portal)', 'AGENDA', t.ID_TURNO, 'ESTADO', x ? 'Libre' : '', 'Clase abierta', cap.CODIGO);
    let pub = ''; try { pub = publicarClases_(); } catch (e) { pub = 'No se pudo publicar en el portal público: ' + e.message; }
    return { ok: true, id: t.ID_TURNO, idDictado: t.ID_DICTADO, mensaje: 'Clase abierta creada. ' + pub, whatsapp: textoSemana_() };
  });
}
// Clase abierta a partir de un dictado ya creado (regla: las abiertas híbridas se publican solas): fila en AGENDA vinculada al mismo dictado + publicación
function claseAbiertaDeDictado_(o) {
  const A = tabla_('AGENDA'), fecha = isoDe_(o.FECHA), hora = hhmm_(o.HORA_INICIO);
  if (turnos_().some(t => t.ID_DICTADO === o.ID_DICTADO)) return publicarClases_();
  const t = { ID_TURNO: nuevoIdTurno_(A, fecha, hora), FECHA: dma_(fecha), HORA_INICIO: hora, HORA_FIN: hhmm_(o.HORA_FIN) || '', TIPO_TURNO: 'Clase abierta', CODIGO: o.CODIGO,
    MODALIDAD: o.MODALIDAD, LUGAR: o.LUGAR, CUPO: /^\d+$/.test(String(o.CUPO_PRESENCIAL)) ? String(o.CUPO_PRESENCIAL) : '', ESTADO: 'Clase abierta', ID_DICTADO: o.ID_DICTADO, PUBLICADO: 'Sí', CONFIRMADO_POR: 'HyS',
    OBSERVACIONES: dentroDeFranja_(fecha, hora, hhmm_(o.HORA_FIN)) ? 'Desde el dictado ' + o.ID_DICTADO : 'Fuera de franja: cargada por HyS · desde el dictado ' + o.ID_DICTADO, CREADO: ahoraTxt_(), ORIGEN: 'Portal (dictado)' };
  agregar_(A, [t]);
  historial_('HyS (portal)', 'AGENDA', t.ID_TURNO, 'ESTADO', '', 'Clase abierta', o.CODIGO + ' · desde ' + o.ID_DICTADO + ' (publicación automática)');
  return publicarClases_();
}
// ------------------------------------------------------------------ Programas con inscripción
// REGLA (Belén, 18/10/2026): el programa se publica una sola vez (programa completo), con UNA inscripción (el formulario del encuentro 1)
// y recordatorios por correo antes de cada encuentro. La cohorte son los encuentros 2..N posteriores al encuentro 1 con inscripción.
function programasConInscripcion_() {
  const D = tabla_('DICTADOS'), capsP = {}, todos = D.filas.map(r => obj_(D, r)).filter(o => !/cancel|suspend|anulad/i.test(o.ESTADO) && isoDe_(o.FECHA)), out = [];
  todos.filter(o => num_(o.ENCUENTRO_N) === 1 && /^http/.test(String(o.LINK_INSCRIPCION || ''))).forEach(o1 => {
    const cap = capsP[o1.CODIGO] || (capsP[o1.CODIGO] = capDe_(o1.CODIGO)); if (!cap || num_(cap.ENCUENTROS) <= 1) return;
    const f1 = isoDe_(o1.FECHA), N = num_(cap.ENCUENTROS), enc = [o1];
    for (let n = 2; n <= N; n++) {
      const x = todos.filter(o => o.CODIGO === o1.CODIGO && num_(o.ENCUENTRO_N) === n && isoDe_(o.FECHA) > f1).sort((a, b) => isoDe_(a.FECHA) < isoDe_(b.FECHA) ? -1 : 1)[0];
      if (x) enc.push(x);
    }
    out.push({ o1: o1, cap: cap, encuentros: enc, total: N, cierre: !vacio_(o1.CIERRE_INSCRIPCION) ? fechaHora_(o1.CIERRE_INSCRIPCION) : ventana_(o1).abre });
  });
  return out;
}
function mailPrograma_(cap, o, n, total, dias) {
  const f = isoDe_(o.FECHA), cuando = DIAS_SEMANA[diaSemana_(f)] + ' ' + dma_(f) + ' · ' + hhmm_(o.HORA_INICIO) + (o.HORA_FIN ? ' a ' + hhmm_(o.HORA_FIN) : '') + ' h';
  const intro = n === 1 && dias > 1 ? 'Te recordamos que en <b>' + dias + ' días</b> empieza el programa en el que te inscribiste.' :
    'Te recordamos que <b>mañana</b> tenés el <b>encuentro ' + n + ' de ' + total + '</b> del programa.';
  const zoom = (String(o.OBSERVACIONES || '').match(/https?:\/\/[^\s·]*zoom[^\s·]*/i) || [''])[0];
  return marcoMail_(cap.NOMBRE, '<p>' + intro + '</p>' + cajaDato_([['Cuándo', cuando], ['Dónde', /virtual/i.test(o.LUGAR + ' ' + o.MODALIDAD) && !/h[ií]brida/i.test(o.MODALIDAD) ? 'Virtual' : sd_(o.LUGAR) + (/h[ií]brida/i.test(o.MODALIDAD) ? ' · Híbrida' : '')], ['Encuentro', n + ' de ' + total]]) +
    (zoom ? boton_('Entrar al Zoom', zoom) : '') + '<p>El día del encuentro registrás tu asistencia con este link (se abre a la hora de la clase):</p>' + boton_('Registrar asistencia', 'https://hyslhmh-sudo.github.io/capacitaciones/?d=' + encodeURIComponent(o.ID_DICTADO)));
}
// Cambiar el estado de un horario (siempre con motivo; nunca se borra)
function agEstado_(d) {
  return conLock_(() => {
    const x = turnoDe_(d.id); if (!x.o) return { ok: false, error: 'No existe ese horario.' };
    const t = x.o, nuevo = d.estado; if (ESTADOS_TURNO.indexOf(nuevo) < 0) return { ok: false, error: 'Estado no válido.' };
    const motivo = String(d.motivo || '').trim(); if (!motivo && ['Suspendido', 'Cancelado', 'No se presentó', 'Anulado'].indexOf(nuevo) >= 0) return { ok: false, error: 'Escribí el motivo (queda en el historial).' };
    setCampos_(x.A, x.k, { ESTADO: nuevo, MOTIVO: motivo || t.MOTIVO });
    historial_('HyS (portal)', 'AGENDA', t.ID_TURNO, 'ESTADO', t.ESTADO, nuevo, motivo);
    let avisados = 0;
    if (['Suspendido', 'Anulado', 'Cancelado'].indexOf(nuevo) >= 0 && t.ID_DICTADO) suspenderDictado_(t.ID_DICTADO, nuevo + ': ' + motivo);
    const cap = capDe_(t.CODIGO) || { NOMBRE: t.CODIGO, CODIGO: t.CODIGO }, tt = Object.assign({}, t, { inicio: inicioDe_(t.FECHA, t.HORA_INICIO) });
    if (nuevo === 'Suspendido' && d.avisar !== false && tt.inicio > new Date()) {
      if (t.ESTADO === 'Clase abierta') inscriptosTurno_(t).forEach(i => { if (enviar_(i.CORREO, 'Clase suspendida: ' + cap.NOMBRE + ' · ' + diaCorto_(isoDe_(t.FECHA)), mailClase_(cap, t, i.TOKEN_CANCELAR, 'suspension'), 'Suspensión', t.ID_TURNO, t.ID_DICTADO, t.CODIGO)) avisados++; });
      else if (t.CORREO_AVISOS && enviar_(t.CORREO_AVISOS, 'Horario suspendido: ' + cap.NOMBRE + ' · ' + t.JEFATURA, mailReserva_(cap, t, 'suspension'), 'Suspensión', t.ID_TURNO, t.ID_DICTADO, t.CODIGO)) avisados++;
      if (d.liberar) liberarHorario_(tt);
    }
    if (t.ESTADO === 'Clase abierta' || nuevo === 'Clase abierta') { try { publicarClases_(); } catch (e) { /* se reintenta al crear la próxima */ } }
    limpiarCumpl_();
    return { ok: true, mensaje: 'Horario: ' + nuevo + '.' + (avisados ? ' Se avisó por correo a ' + avisados + '.' : '') };
  });
}
// Pedido pendiente: confirmar o rechazar
function agConfirmar_(d) {
  return conLock_(() => {
    const x = turnoDe_(d.id); if (!x.o || x.o.ESTADO !== 'Pendiente') return { ok: false, error: 'Ese pedido ya no está pendiente.' };
    const t = x.o, cap = capDe_(t.CODIGO);
    if (d.decision === 'rechazar') {
      if (vacio_(d.motivo)) return { ok: false, error: 'Escribí el motivo.' };
      setCampos_(x.A, x.k, { ESTADO: 'Libre', MOTIVO: '', JEFATURA: '', PEDIDO_POR_DNI: '', PEDIDO_POR: '', CARGO: '', CORREO_AVISOS: '', FECHA_PEDIDO: '', TOKEN: '', CODIGO: '',
        OBSERVACIONES: [t.OBSERVACIONES, 'Pedido de ' + t.JEFATURA + ' no confirmado: ' + d.motivo].filter(y => !vacio_(y)).join(' · ') });
      historial_('HyS (portal)', 'AGENDA', t.ID_TURNO, 'ESTADO', 'Pendiente', 'Libre', 'Pedido no confirmado (' + t.JEFATURA + '): ' + d.motivo);
      enviar_(t.CORREO_AVISOS, 'Pedido de horario: ' + (cap ? cap.NOMBRE : t.CODIGO) + ' · ' + t.JEFATURA, mailReserva_(cap || { NOMBRE: t.CODIGO, CODIGO: t.CODIGO }, t, 'rechazada'), 'Pedido no confirmado', t.ID_TURNO, '', t.CODIGO);
      return { ok: true, mensaje: 'Pedido no confirmado; el horario volvió a quedar libre y se avisó por correo.' };
    }
    const cambios = { ESTADO: 'Reservado', CONFIRMADO_POR: 'HyS · ' + ahoraTxt_() };
    cambios.ID_DICTADO = crearDictadoTurno_(Object.assign({}, t, cambios), cap);
    setCampos_(x.A, x.k, cambios);
    historial_('HyS (portal)', 'AGENDA', t.ID_TURNO, 'ESTADO', 'Pendiente', 'Reservado', 'Confirmado por HyS');
    // Si quien pidió no estaba en JEFATURAS, queda como otro DNI habilitado de esa jefatura
    if (d.sumarDni) {
      const J = tabla_('JEFATURAS'), k = J.filas.findIndex(r => r[J.i('JEFATURA')] === t.JEFATURA);
      if (k >= 0) { const o = obj_(J, J.filas[k]), l = String(o.OTROS_DNI || '').split(/[;,\s]+/).filter(Boolean); if (l.indexOf(t.PEDIDO_POR_DNI) < 0 && soloDni_(o.DNI_RESPONSABLE) !== t.PEDIDO_POR_DNI) { l.push(t.PEDIDO_POR_DNI); setCampos_(J, k, { OTROS_DNI: l.join('; '), ACTUALIZADO: Utilities.formatDate(new Date(), ZONA, 'dd/MM/yyyy') + ' · HyS' }); historial_('HyS (portal)', 'JEFATURAS', t.JEFATURA, 'OTROS_DNI', o.OTROS_DNI, l.join('; '), 'Habilitado al confirmar un pedido: ' + t.PEDIDO_POR + ' (' + t.CARGO + ')'); } }
    }
    enviar_(t.CORREO_AVISOS, 'Reserva confirmada: ' + cap.NOMBRE + ' · ' + t.JEFATURA, mailReserva_(cap, Object.assign({}, t, cambios), 'confirmada'), 'Confirmación', t.ID_TURNO, cambios.ID_DICTADO, t.CODIGO);
    limpiarCumpl_();
    return { ok: true, mensaje: 'Reserva confirmada y avisada por correo.' };
  });
}
function agFranjasGuardar_(d) {
  return conLock_(() => {
    const F = tabla_('FRANJAS'), filas = (d.franjas || []).filter(f => f.dia && f.desde && f.hasta);
    for (const f of filas) {
      if (DIAS_SEMANA.indexOf(f.dia) < 0) return { ok: false, error: 'Día no válido: ' + f.dia + '.' };
      if (minDe_(f.hasta) <= minDe_(f.desde)) return { ok: false, error: 'Revisá la franja del ' + f.dia + ': «hasta» tiene que ser después de «desde».' };
    }
    const clave = o => norm_(o.DIA) + '|' + hhmm_(o.DESDE) + '|' + hhmm_(o.HASTA) + '|' + norm_(o.LUGAR || 'En el servicio');
    const nuevas = filas.map(f => ({ DIA: f.dia, DESDE: f.desde, HASTA: f.hasta, LUGAR: f.lugar || 'En el servicio', VIGENTE: 'Sí', OBSERVACIONES: f.observaciones || '' }));
    const claves = nuevas.map(clave), hoy = Utilities.formatDate(new Date(), ZONA, 'dd/MM/yyyy'), vistas = {};
    // No se borra: la que ya no se usa queda con VIGENTE = No; la que vuelve, con VIGENTE = Sí
    F.filas.forEach((r, k) => {
      const o = obj_(F, r); if (!o.DIA) return; const c = clave(o), sigue = claves.indexOf(c) >= 0, vig = !/^no/i.test(o.VIGENTE);
      if (sigue) { vistas[c] = 1; if (!vig) setCampos_(F, k, { VIGENTE: 'Sí' }); }
      else if (vig) setCampos_(F, k, { VIGENTE: 'No', OBSERVACIONES: [o.OBSERVACIONES, 'Dejó de usarse el ' + hoy].filter(x => !vacio_(x)).join(' · ') });
    });
    agregar_(F, nuevas.filter(n => !vistas[clave(n)]));
    historial_('HyS (portal)', 'FRANJAS', '-', 'Franjas', '', nuevas.length + ' vigente(s): ' + franjasTexto_(), 'Franjas actualizadas');
    return { ok: true, franjas: franjas_(), texto: franjasTexto_() };
  });
}
function menuRecordatorios() {
  const ui = SpreadsheetApp.getUi(), ya = ScriptApp.getProjectTriggers().find(t => t.getHandlerFunction() === 'agRecordatorios');
  if (!puedeEnviar_()) { ui.alert('Recordatorios', 'Todavía no se puede enviar como ' + CORREO_HYS + '. En el Gmail de esta cuenta: Configuración › Cuentas › «Enviar como» › agregar ' + CORREO_HYS + ' y confirmarlo. Después volvé a esta opción.', ui.ButtonSet.OK); return; }
  if (ya) { ui.alert('Recordatorios', 'Ya están activos: se revisa la agenda cada hora y salen 7, 2 y 1 día antes (desde las ' + HORA_RECORDATORIO + ' h), desde ' + CORREO_HYS + '. Cada envío queda en _MENSAJES.', ui.ButtonSet.OK); return; }
  ScriptApp.newTrigger('agRecordatorios').timeBased().everyHours(1).create();
  ui.alert('Recordatorios activados', 'Cada hora se revisa la agenda: salen los recordatorios 7, 2 y 1 día antes (desde las ' + HORA_RECORDATORIO + ' h) desde ' + CORREO_HYS + ', y los horarios que pasaron se cierran solos (Sin uso o Realizado). Cada envío queda en _MENSAJES.', ui.ButtonSet.OK);
}
function agRecordatoriosActivar_() {
  if (!puedeEnviar_()) return { ok: false, error: 'Falta configurar ' + CORREO_HYS + ' como «Enviar como» en el Gmail de la cuenta del libro.' };
  if (!ScriptApp.getProjectTriggers().find(t => t.getHandlerFunction() === 'agRecordatorios')) ScriptApp.newTrigger('agRecordatorios').timeBased().everyHours(1).create();
  return { ok: true, mensaje: 'Recordatorios activos.' };
}
function agMensajes_() {
  const M = tabla_('_MENSAJES');
  return { ok: true, lista: M.filas.map(r => obj_(M, r)).filter(o => o.ID_MENSAJE).slice(-60).reverse().map(o => ({ fecha: o.FECHA, tipo: o.TIPO, para: o.DESTINATARIOS, asunto: o.ASUNTO, estado: o.ESTADO, turno: o.ID_TURNO })) };
}

// ------------------------------------------------------------------ Portal: cumplimiento, matriz y jefaturas
function cumplimientoPortal_(d) { prepararF7_(); const t = cumplimiento_(!!(d && d.fresco), d && d.grupo); t.jefaturasSinDatos = jefaturas_().filter(j => srvLista_(j).length && !vacio_(j.RESPONSABLE) && vacio_(j.DNI_RESPONSABLE)).length; return t; }
function cumpServicio_(d) {
  const t = cumplimientoCalc_(d.servicio, d.grupo || grupoDeJefatura_(jefaturas_().find(x => x.JEFATURA === d.servicio) || {}).grupo), g = t.servicios[0]; if (!g) return { ok: false, error: 'No hay personal para ese servicio.' };
  const j = jefaturas_().find(x => x.JEFATURA === d.servicio) || null;
  return { ok: true, servicio: g, jefatura: j ? { jefatura: j.JEFATURA, responsable: j.RESPONSABLE, cargo: j.CARGO, dni: j.DNI_RESPONSABLE, otros: j.OTROS_DNI, correo: j.CORREO_RESPONSABLE, correoServicio: j.CORREO_SERVICIO,
    servicios: j.SERVICIOS, establecimiento: j.ESTABLECIMIENTO, tel: j.TEL_INTERNO, ubicacion: j.UBICACION, ultimoInforme: j.ULTIMO_INFORME, link: j.LINK_INFORME } : null, caps: t.caps, kpi: t.kpi };
}
function matrizLista_() {
  prepararF7_();
  const caps = capsMapa_(), N = nomina_(), reglas = reglas_(false);
  return { ok: true, reglas: reglas.map(r => ({ id: r.id, codigo: r.codigo, nombre: caps[r.codigo] ? caps[r.codigo].nombre : r.codigo, estadoCap: caps[r.codigo] ? caps[r.codigo].estado : 'No está en el catálogo',
    subgrupo: r.subgrupo, funciones: r.funciones, servicios: r.servicios, ambas: r.ambas, tipo: r.tipo, activa: r.activa, observacion: r.observacion, actualizado: r.actualizado,
    personas: r.activa ? N.filter(p => aplica_(r, p)).length : 0 })),
    caps: Object.keys(caps).map(c => ({ codigo: c, nombre: caps[c].nombre, estado: caps[c].estado })),
    funciones: N.map(p => p.funcion).filter((x, i, a) => x && x !== 's/d' && a.indexOf(x) === i).sort(),
    servicios: N.map(p => p.servicio).concat(jefaturas_().map(j => j.JEFATURA)).filter((x, i, a) => x && x !== 's/d' && a.indexOf(x) === i).sort() };
}
function matrizImpacto_(d) {
  const txt = v => Array.isArray(v) ? v.join(';') : v, N = nomina_(), r = { f: lista_(txt(d.funciones)), s: lista_(txt(d.servicios)), ambas: !!d.ambas }, J = jefaturas_().filter(j => srvLista_(j).length);
  const afect = N.filter(p => aplica_(r, p)), srv = {}, porEst = {};
  afect.forEach(p => { const j = jefaturaDe_(p, J); srv[j ? j.JEFATURA : p.servicio + ' · ' + p.est] = 1; porEst[p.est] = (porEst[p.est] || 0) + 1; });
  return { ok: true, personas: afect.length, porEst: porEst, hzt: porEst.HZT || 0, hmh: porEst.HMH || 0, servicios: Object.keys(srv).length };
}
function matrizGuardar_(d) {
  return conLock_(() => {
    const cap = capDe_(d.codigo); if (!cap) return { ok: false, error: 'Elegí la capacitación.' };
    if (vacio_(d.motivo)) return { ok: false, error: 'Escribí el motivo del cambio (queda en el historial).' };
    const M = tabla_('MATRIZ'), hoy = Utilities.formatDate(new Date(), ZONA, 'dd/MM/yyyy');
    const o = { CODIGO: cap.CODIGO, SUBGRUPO: sd_(d.subgrupo), FUNCIONES: (d.funciones || []).join('; '), SERVICIOS: (d.servicios || []).join('; '), SOLO_SI_CUMPLE_AMBAS: d.ambas ? 'Sí' : 'No',
      TIPO: d.tipo === 'R' ? 'R' : 'O', ACTIVA: d.activa === false ? 'No' : 'Sí', OBSERVACION: String(d.observacion || ''), ACTUALIZADO: hoy, MOTIVO: d.motivo };
    if (d.id) {
      const k = M.filas.findIndex(r => r[M.i('ID_REGLA')] === d.id); if (k < 0) return { ok: false, error: 'No existe esa regla.' };
      const antes = obj_(M, M.filas[k]);
      setCampos_(M, k, o);
      historial_('HyS (portal)', 'MATRIZ', d.id, 'Regla', [antes.CODIGO, antes.FUNCIONES, antes.SERVICIOS, antes.TIPO, antes.ACTIVA].join(' | '), [o.CODIGO, o.FUNCIONES, o.SERVICIOS, o.TIPO, o.ACTIVA].join(' | '), d.motivo);
    } else {
      const n = M.filas.reduce((m, r) => Math.max(m, Number(String(r[M.i('ID_REGLA')]).replace(/\D/g, '')) || 0), 0) + 1;
      o.ID_REGLA = 'REG-MAT-' + ('00' + n).slice(-3); agregar_(M, [o]);
      historial_('HyS (portal)', 'MATRIZ', o.ID_REGLA, 'Alta', '', [o.CODIGO, o.FUNCIONES, o.SERVICIOS, o.TIPO].join(' | '), d.motivo);
    }
    limpiarCumpl_();
    return { ok: true, mensaje: 'Regla guardada. El cumplimiento se recalcula con la regla nueva.' };
  });
}
function jefaturasLista_() {
  prepararF7_();
  return { ok: true, cargos: CARGOS_JEFATURA, lista: jefaturas_().map(j => ({ jefatura: j.JEFATURA, servicios: j.SERVICIOS, establecimiento: j.ESTABLECIMIENTO, responsable: j.RESPONSABLE, cargo: j.CARGO, dni: j.DNI_RESPONSABLE,
    otros: j.OTROS_DNI, correo: j.CORREO_RESPONSABLE, correoServicio: j.CORREO_SERVICIO, tel: j.TEL_INTERNO, ubicacion: j.UBICACION, tipo: j.TIPO, dependeDe: j.DEPENDE_DE, prioritaria: j.PRIORITARIA,
    ultimoInforme: j.ULTIMO_INFORME, link: j.LINK_INFORME, actualizado: j.ACTUALIZADO, observaciones: j.OBSERVACIONES })) };
}
function jefaturaGuardar_(d) {
  return conLock_(() => {
    const J = tabla_('JEFATURAS'), nombre = String(d.jefatura || '').trim(); if (!nombre) return { ok: false, error: 'Escribí el nombre de la jefatura o servicio.' };
    for (const c of [d.correo, d.correoServicio]) if (!vacio_(c) && !correoOk_(c)) return { ok: false, error: 'Revisá el correo ' + c + '.' };
    const o = { JEFATURA: nombre, SERVICIOS: sd_(d.servicios || nombre), ESTABLECIMIENTO: d.establecimiento || '', RESPONSABLE: sd_(d.responsable), CARGO: sd_(d.cargo), DNI_RESPONSABLE: soloDni_(d.dni),
      OTROS_DNI: String(d.otros || '').split(/[;,\s]+/).map(soloDni_).filter(Boolean).join('; '), CORREO_RESPONSABLE: String(d.correo || '').trim(), CORREO_SERVICIO: String(d.correoServicio || '').trim(),
      TEL_INTERNO: d.tel || '', UBICACION: d.ubicacion || '', TIPO: d.tipo || 'Servicio', DEPENDE_DE: d.dependeDe || '', PRIORITARIA: d.prioritaria ? 'Sí' : 'No',
      ACTUALIZADO: Utilities.formatDate(new Date(), ZONA, 'dd/MM/yyyy') + ' · HyS (portal)', OBSERVACIONES: d.observaciones || '' };
    const k = J.filas.findIndex(r => r[J.i('JEFATURA')] === (d.original || nombre));
    if (k >= 0) { const antes = obj_(J, J.filas[k]); setCampos_(J, k, o); Object.keys(o).forEach(c => { if (String(antes[c] || '') !== String(o[c]) && c !== 'ACTUALIZADO') historial_('HyS (portal)', 'JEFATURAS', nombre, c, antes[c], o[c], d.motivo || 'Edición desde el portal'); }); }
    else { agregar_(J, [o]); historial_('HyS (portal)', 'JEFATURAS', nombre, 'Alta', '', nombre, d.motivo || 'Alta desde el portal'); }
    limpiarCumpl_();
    return { ok: true, mensaje: 'Jefatura guardada.' };
  });
}

// ------------------------------------------------------------------ Difusión de clases abiertas (portal público + texto de WhatsApp)
// Escribe las clases abiertas próximas en la planilla del portal público (hoja CAPACITACIONES, columna ORIGEN = AGENDA:…).
// Las filas cargadas a mano en esa hoja no se tocan.
function publicarClases_() {
  const lib = SpreadsheetApp.openById(ID_PORTAL_PUBLICO), sh = lib.getSheetByName('CAPACITACIONES'); if (!sh) return 'Falta la hoja CAPACITACIONES en el portal público.';
  let H = sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), 1)).getDisplayValues()[0].map(x => String(x).trim());
  if (H.indexOf('ORIGEN') < 0) { const c = H.filter(Boolean).length + 1; sh.getRange(1, c).setValue('ORIGEN'); H = sh.getRange(1, 1, 1, c).getDisplayValues()[0].map(x => String(x).trim()); }
  const ult = sh.getLastRow(), v = ult > 1 ? sh.getRange(2, 1, ult - 1, H.length).getDisplayValues() : [], io = H.indexOf('ORIGEN');
  const manuales = v.filter(r => !/^(AGENDA|PROGRAMA):/.test(r[io]) && r.some(x => String(x).trim()));
  const caps = capsMapa_(), ahora = new Date();
  const D = tabla_('DICTADOS'), inscDic = {};   // clases híbridas con inscripción previa: se anotan en el formulario del dictado (eligen presencial o virtual y dejan su consulta)
  D.filas.forEach(r => { const l = String(r[D.i('LINK_INSCRIPCION')] || ''); if (/^http/.test(l)) inscDic[r[D.i('ID_DICTADO')]] = 'https://hyslhmh-sudo.github.io/capacitaciones/?i=' + encodeURIComponent(r[D.i('ID_DICTADO')]); });   // página de GitHub (no la dirección de Apps Script)
  const clases = turnos_().filter(t => t.ESTADO === 'Clase abierta' && t.inicio > ahora && !/^no/i.test(t.PUBLICADO)).sort((a, b) => a.inicio - b.inicio).map((t, i) => {
    const c = caps[t.CODIGO] || { nombre: t.CODIGO, destinatarios: '' }, o = {
      VISIBLE: 'Sí', CAPACITACION: c.nombre, INICIO: dma_(isoDe_(t.FECHA)), CIERRE_INSCRIPCION: dma_(isoDe_(t.FECHA)),
      DIAS_Y_HORARIO: diaCorto_(isoDe_(t.FECHA)) + ' · ' + hhmm_(t.HORA_INICIO) + (t.HORA_FIN ? ' a ' + hhmm_(t.HORA_FIN) : '') + ' h', MODALIDAD: t.MODALIDAD + (vacio_(t.LUGAR) || /virtual/i.test(t.LUGAR) ? '' : ' · ' + t.LUGAR),
      DESTINATARIOS: vacio_(c.destinatarios) ? 'Todo el personal' : c.destinatarios, ENLACE_INSCRIPCION: /^h[ií]brida/i.test(t.MODALIDAD || '') && inscDic[t.ID_DICTADO] ? inscDic[t.ID_DICTADO] : AGENDA_WEB + '?t=' + encodeURIComponent(t.ID_TURNO),
      DETALLE: t.CODIGO + ' · clase abierta · anotate con tu DNI' + (num_(t.CUPO) ? ' · cupo ' + num_(t.CUPO) : ''), ORDEN: String(i + 1), ORIGEN: 'AGENDA:' + t.ID_TURNO };
    return H.map(h => o[h] === undefined ? '' : o[h]);
  });
  // Programas con inscripción: UNA publicación por programa (programa completo, una sola inscripción), visible hasta que cierra la inscripción
  const plural = d => /s$/.test(d) ? d : d + 's';
  const progs = programasConInscripcion_().filter(p => p.cierre > ahora).sort((a, b) => a.cierre - b.cierre).map(p => {
    const o1 = p.o1, c = caps[o1.CODIGO] || { nombre: p.cap.NOMBRE, destinatarios: '' }, f = isoDe_(o1.FECHA), o = {
      VISIBLE: 'Sí', CAPACITACION: c.nombre || p.cap.NOMBRE, INICIO: dma_(f), CIERRE_INSCRIPCION: Utilities.formatDate(p.cierre, ZONA, 'dd/MM/yyyy'),
      DIAS_Y_HORARIO: plural(DIAS_SEMANA[diaSemana_(f)]) + ' · ' + hhmm_(o1.HORA_INICIO) + (o1.HORA_FIN ? ' a ' + hhmm_(o1.HORA_FIN) : '') + ' h · ' + p.total + ' encuentros',
      MODALIDAD: o1.MODALIDAD + (vacio_(o1.LUGAR) || /virtual/i.test(o1.LUGAR) ? '' : ' · ' + o1.LUGAR),
      DESTINATARIOS: vacio_(c.destinatarios) ? 'Todo el personal' : c.destinatarios, ENLACE_INSCRIPCION: 'https://hyslhmh-sudo.github.io/capacitaciones/?i=' + encodeURIComponent(o1.ID_DICTADO),
      DETALLE: o1.CODIGO + ' · programa de ' + p.total + ' encuentros · una sola inscripción para todo el programa', ORDEN: String(clases.length + 1), ORIGEN: 'PROGRAMA:' + o1.ID_DICTADO };
    return H.map(h => o[h] === undefined ? '' : o[h]);
  });
  const filas = clases.concat(progs, manuales);
  if (ult > 1) sh.getRange(2, 1, ult - 1, H.length).clearContent();
  if (filas.length) sh.getRange(2, 1, filas.length, H.length).setValues(filas);
  const A = tabla_('AGENDA'); turnos_().filter(t => t.ESTADO === 'Clase abierta').forEach(t => { const pub = t.inicio > ahora && !/^no/i.test(t.PUBLICADO) ? 'Sí' : t.PUBLICADO; if (pub !== t.PUBLICADO) setCampos_(A, t._k, { PUBLICADO: pub }); });
  return clases.length + ' clase(s) abierta(s)' + (progs.length ? ' y ' + progs.length + ' programa(s)' : '') + ' publicada(s) en el portal público.';
}
function textoSemana_(desde) {
  const ahora = new Date(), hasta = new Date(ahora.getTime() + 8 * 864e5), caps = capsMapa_(), I = tabla_('INSCRIPCIONES');
  const cl = turnos_().filter(t => t.ESTADO === 'Clase abierta' && t.inicio > ahora && t.inicio < hasta).sort((a, b) => a.inicio - b.inicio);
  const ic = c => SECUENCIA_INCENDIO.indexOf(c) >= 0 || c === 'CAP-HYS-019' ? '🔥' : /residu/i.test((caps[c] || {}).nombre) ? '♻️' : /bioseg|biol/i.test((caps[c] || {}).nombre) ? '🧤' : '📘';
  const l = ['📅 *Capacitaciones de Higiene y Seguridad* · semana del ' + Utilities.formatDate(ahora, ZONA, 'dd/MM'), ''];
  if (!cl.length) l.push('Esta semana no hay clases abiertas.', '');
  cl.forEach(t => { const cupo = num_(t.CUPO), quedan = cupo ? Math.max(0, cupo - inscriptosTurno_(t, I).length) : null;
    l.push(ic(t.CODIGO) + ' *' + ((caps[t.CODIGO] || {}).nombre || t.CODIGO) + '*', diaCorto_(isoDe_(t.FECHA)) + ' · ' + hhmm_(t.HORA_INICIO) + ' h · ' + sd_(t.LUGAR) + (quedan === null ? '' : quedan ? ' · quedan ' + quedan + ' lugares' : ' · cupo completo'), ''); });
  l.push('Anotate con tu DNI:', AGENDA_WEB, '', 'Jefaturas, coordinaciones y A/C: desde el mismo link pueden reservar un horario para todo el servicio.');
  return l.join('\n');
}

// ------------------------------------------------------------------ Migración (una sola vez, desde el menú)
function menuMigrarF7() {
  const ui = SpreadsheetApp.getUi();
  prepararF7_();
  const c = migrarF7_(true);
  if (c.hecha) { ui.alert('Agenda y cumplimiento', 'Ya se pasaron los datos (AGENDA o JEFATURAS tienen filas). No se repite para no duplicar.', ui.ButtonSet.OK); return; }
  const txt = 'Se van a copiar del libro actual (BASE_PERSONAS), sin modificarlo:\n\n' +
    '• FRANJAS: ' + c.franjas + ' (' + c.franjasTexto + ')\n• AGENDA: ' + c.agenda + ' horarios (' + c.libres + ' libres por venir, ' + c.sinUso + ' sin uso, ' + c.realizados + ' realizados) y ' + c.inscripciones + ' inscripciones\n' +
    '• JEFATURAS: ' + c.jefaturas + ' (' + c.conDni + ' con DNI de quien reserva)\n• SERVICIOS_EQUIV: ' + c.equiv + ' equivalencias (' + c.revisar + ' marcadas para revisar)\n• MATRIZ: ' + c.matriz + ' reglas\n\n¿Seguimos?';
  if (ui.alert('Agenda y cumplimiento: pasar datos', txt, ui.ButtonSet.YES_NO) !== ui.Button.YES) return;
  const r = migrarF7_(false);
  let cu = ''; try { const t = cumplimiento_(true); cu = '\n\nCumplimiento ' + t.grupo + ': ' + t.kpi.pct + ' % de las obligatorias (' + t.kpi.porEst.map(e => e.codigo + ' ' + e.pct + ' %').join(' · ') + '), ' + t.kpi.personal + ' personas, ' + t.servicios.length + ' servicios.'; } catch (e) { cu = '\n\nEl cumplimiento no se pudo calcular todavía: ' + e.message; }
  ui.alert('Listo', 'FRANJAS ' + r.franjas + ' · AGENDA ' + r.agenda + ' · JEFATURAS ' + r.jefaturas + ' · SERVICIOS_EQUIV ' + r.equiv + ' · MATRIZ ' + r.matriz + cu, ui.ButtonSet.OK);
}
function migrarF7_(soloContar) {
  const libP = SpreadsheetApp.openById(ID.personas), ahora = new Date(), hoyTxt = ahoraTxt_();
  const A = tabla_('AGENDA'), J = tabla_('JEFATURAS'), F = tabla_('FRANJAS'), S = tabla_('SERVICIOS_EQUIV'), M = tabla_('MATRIZ');
  const hecha = A.filas.some(r => r[0]) || J.filas.some(r => r[0]);
  const hojaV = n => { const sh = libP.getSheetByName(n); return sh ? sh.getDataRange().getDisplayValues() : []; };
  // --- Agenda anterior (encabezados en la fila 1)
  const ag = hojaV('AGENDA'), AH = (ag[0] || []).map(x => String(x).trim()), a = n => AH.indexOf(n);
  const viejos = ag.slice(1).filter(r => r[a('ID_TURNO')]);
  const ins = hojaV('INSCRIPCIONES'), IH = (ins[0] || []).map(x => String(x).trim()), ii = n => IH.indexOf(n);
  const insV = ins.slice(1).filter(r => r[ii('ID_INSCRIPCION')]);
  const agenda = viejos.map(r => {
    const f = isoDe_(r[a('FECHA')]), ini = hhmm_(r[a('HORA_INICIO')]), fin = hhmm_(r[a('HORA_FIN')]), finD = inicioDe_(dma_(f), fin || ini);
    const est = String(r[a('ESTADO')] || ''), tipo = /abierta/i.test(r[a('TIPO_TURNO')]) ? 'Clase abierta' : 'Horario para servicios';
    const reservas = insV.filter(x => x[ii('ID_TURNO')] === r[a('ID_TURNO')] && !/anulad|cancel/i.test(x[ii('ESTADO')]));
    const srv = reservas.find(x => /servicio/i.test(x[ii('TIPO')]));
    let estado;
    if (/realizad/i.test(est)) estado = 'Realizado';
    else if (/cancel/i.test(est)) estado = 'Cancelado';
    else if (/suspend/i.test(est)) estado = 'Suspendido';
    else if (srv) estado = finD < ahora ? 'Sin uso' : 'Reservado';
    else if (tipo === 'Clase abierta') estado = finD < ahora ? 'Realizado' : 'Clase abierta';
    else estado = finD < ahora ? 'Sin uso' : 'Libre';
    return { ID_TURNO: r[a('ID_TURNO')], FECHA: dma_(f), HORA_INICIO: ini, HORA_FIN: fin, TIPO_TURNO: tipo, CODIGO: r[a('ID_CAPACITACION')] || '', MODALIDAD: r[a('MODALIDAD')] || 'Presencial',
      LUGAR: r[a('LUGAR')] || 'En el servicio', CUPO: r[a('CUPO')] || '', ESTADO: estado, JEFATURA: srv ? srv[ii('JEFATURA')] || srv[ii('SERVICIO')] : '', PEDIDO_POR: srv ? srv[ii('INSCRIPTO_POR')] || srv[ii('PEDIDO_POR')] : '',
      PEDIDO_POR_DNI: srv ? soloDni_(srv[ii('DNI')]) : '', CORREO_AVISOS: srv ? srv[ii('EMAIL_CONTACTO')] : '', FECHA_PEDIDO: srv ? srv[ii('FECHA_HORA')] : '', CONFIRMADO_POR: srv ? srv[ii('CONFIRMADO_POR')] : '',
      TOKEN: srv ? tokenAg_() : '', OBSERVACIONES: r[a('OBSERVACIONES')] || '', CREADO: r[a('CREADO')] || hoyTxt, ORIGEN: 'Agenda anterior', PUBLICADO: tipo === 'Clase abierta' ? 'No' : '' };
  });
  // --- Franjas: el patrón semanal de la agenda anterior (horarios para servicios)
  const fr = {};
  viejos.filter(r => !/abierta/i.test(r[a('TIPO_TURNO')])).forEach(r => {
    const f = isoDe_(r[a('FECHA')]); if (!f) return; const d = diaSemana_(f), ini = minDe_(r[a('HORA_INICIO')]), fin = minDe_(r[a('HORA_FIN')]);
    const lugar = r[a('LUGAR')] || 'En el servicio', k = d + '|' + lugar;
    fr[k] = fr[k] || { d: d, lugar: lugar, desde: 9999, hasta: 0 }; fr[k].desde = Math.min(fr[k].desde, ini); fr[k].hasta = Math.max(fr[k].hasta, fin);
  });
  const franjas = Object.keys(fr).map(k => fr[k]).sort((x, y) => ((x.d + 6) % 7) - ((y.d + 6) % 7)).map(x => ({ DIA: DIAS_SEMANA[x.d], DESDE: hhmmDe_(x.desde), HASTA: hhmmDe_(x.hasta), LUGAR: x.lugar, VIGENTE: 'Sí', OBSERVACIONES: 'De la agenda anterior' }));
  // --- Jefaturas (encabezados en la fila 3)
  const je = hojaV('JEFATURAS'), JH = (je[2] || []).map(x => String(x).trim()), jx = pre => JH.findIndex(h => h.indexOf(pre) === 0);
  const jefs = je.slice(3).filter(r => String(r[jx('JEFATURA')] || '').trim()).map(r => {
    const v = n => String(r[jx(n)] === undefined ? '' : r[jx(n)]).trim();
    return { JEFATURA: v('JEFATURA'), SERVICIOS: v('SERVICIOS INCLUIDOS'), ESTABLECIMIENTO: estCod_(v('ESTABLECIMIENTO')), RESPONSABLE: sd_(v('JEFE/A')), CARGO: sd_(v('CARGO')),
      DNI_RESPONSABLE: soloDni_(v('JEFE_DNI')), OTROS_DNI: soloDni_(v('SUBROGANTE_DNI')), CORREO_RESPONSABLE: v('EMAIL'), CORREO_SERVICIO: v('EMAIL_SERVICIO'), TEL_INTERNO: v('TEL_INTERNO'),
      UBICACION: v('UBICACION'), TIPO: v('TIPO') || 'Servicio', DEPENDE_DE: v('DEPENDE_DE'), PRIORITARIA: v('PRIORITARIA') || 'No', ULTIMO_INFORME: v('ÚLTIMO INFORME'), LINK_INFORME: v('LINK (PDF)'),
      ACTUALIZADO: v('ACTUALIZADO') || hoyTxt, OBSERVACIONES: [v('OBSERVACIONES'), v('PERSONAL APROX.') ? 'Personal aprox. en el sistema anterior: ' + v('PERSONAL APROX.') : ''].filter(Boolean).join(' · ') };
  });
  // --- Equivalencias de servicios
  const ma = hojaV('MAPEO_SERVICIOS'), MH = (ma[0] || []).map(x => String(x).trim()), mx = n => MH.indexOf(n);
  const dudosa = (o, s) => (/neurolog/i.test(o) && /nefrolog/i.test(s)) || (/cocina/i.test(o) && /social/i.test(s));
  const equiv = ma.slice(1).filter(r => String(r[mx('VALOR_ORIGINAL')] || '').trim() && String(r[mx('SERVICIO')] || '').trim()).map(r => {
    const o = String(r[mx('VALOR_ORIGINAL')]).trim(), s = String(r[mx('SERVICIO')]).trim(), dud = dudosa(o, s);
    return { VALOR_EN_BASE: o, SERVICIO: s, REVISAR: dud ? 'Sí' : 'No', NOTA: dud ? 'Equivalencia dudosa del sistema anterior: revisar' : (norm_(o) === norm_(s) ? 'Sin unificar' : '') };
  });
  // --- Matriz (hoja MATRIZ_REGLAS: A a G el texto de la regla; O el código)
  const mr = hojaV('MATRIZ_REGLAS'); let ultimoCod = '';
  const matriz = [];
  mr.slice(1).forEach(r => {
    const cod = String(r[14] || '').trim(); if (!/^CAP-/i.test(cod)) return;
    if (cod === ultimoCod && !String(r[1] || '').trim() && !String(r[2] || '').trim() && !String(r[3] || '').trim()) return;
    ultimoCod = cod;
    const todo = /todo el personal/i.test(r[1]) && !String(r[2]).trim() && !String(r[3]).trim();
    matriz.push({ ID_REGLA: 'REG-MAT-' + ('00' + (matriz.length + 1)).slice(-3), CODIGO: cod, SUBGRUPO: sd_(r[1]), FUNCIONES: todo ? '' : String(r[2] || '').trim(), SERVICIOS: todo ? '' : String(r[3] || '').trim(),
      SOLO_SI_CUMPLE_AMBAS: siNo_(r[4]) ? 'Sí' : 'No', TIPO: /^r/i.test(r[5]) ? 'R' : 'O', ACTIVA: 'Sí', OBSERVACION: String(r[6] || '').trim(), ACTUALIZADO: Utilities.formatDate(ahora, ZONA, 'dd/MM/yyyy'), MOTIVO: 'Pasada de la matriz del catálogo anterior' });
  });
  const cuenta = { hecha: hecha, franjas: franjas.length, franjasTexto: franjas.map(f => f.DIA.toLowerCase() + ' ' + f.DESDE + '–' + f.HASTA).join(', ') || 'ninguna', agenda: agenda.length,
    libres: agenda.filter(x => x.ESTADO === 'Libre').length, sinUso: agenda.filter(x => x.ESTADO === 'Sin uso').length, realizados: agenda.filter(x => x.ESTADO === 'Realizado').length, inscripciones: insV.length,
    jefaturas: jefs.length, conDni: jefs.filter(x => x.DNI_RESPONSABLE).length, equiv: equiv.length, revisar: equiv.filter(x => x.REVISAR === 'Sí').length, matriz: matriz.length };
  if (soloContar || hecha) return cuenta;
  if (!F.filas.some(r => r[0])) agregar_(F, franjas);
  agregar_(A, agenda);
  agregar_(J, jefs);
  if (!S.filas.some(r => r[0])) agregar_(S, equiv);
  if (!M.filas.some(r => r[0])) agregar_(M, matriz);
  historial_('Migración', 'Fase 7', '-', '-', '', 'Franjas ' + franjas.length + ' · agenda ' + agenda.length + ' · jefaturas ' + jefs.length + ' · equivalencias ' + equiv.length + ' · matriz ' + matriz.length, 'Paso de la agenda, jefaturas y matriz del sistema anterior');
  return cuenta;
}
// Menús de respaldo en Sheets
function menuAbrirHorarios() {
  const ui = SpreadsheetApp.getUi(), r = agAbrir_({ desde: iso_(new Date()), hasta: sumarDias_(iso_(new Date()), 27) });
  ui.alert('Agenda', r.ok ? r.mensaje + '\n\nFranjas vigentes: ' + franjasTexto_() : r.error, ui.ButtonSet.OK);
}
function menuCumplimiento() {
  const txt = alcance_().map(g => { const t = cumplimiento_(true, g.grupo); return g.grupo + ': ' + t.kpi.pct + ' % (' + t.kpi.porEst.map(e => e.codigo + ' ' + e.pct + ' %').join(' · ') + ')'; }).join(' — ');
  SpreadsheetApp.getActive().toast('Obligatorias cumplidas · ' + txt + '. Hojas CUMPLIMIENTO y CUMPLIMIENTO_PERSONAS actualizadas.', 'Cumplimiento', 12);
}
// Filas de AGENDA cargadas a mano (Reservado o Clase abierta sin dictado): les crea el dictado, el token y publica
function menuCompletarAgenda() {
  const r = conLock_(() => {
    const A = tabla_('AGENDA'); let n = 0;
    turnos_().forEach(t => {
      if (vacio_(t.ID_TURNO)) return;
      const cambios = {};
      if ((t.ESTADO === 'Reservado' || t.ESTADO === 'Clase abierta') && vacio_(t.ID_DICTADO)) {
        const cap = capDe_(t.CODIGO); if (!cap) { aviso_('Fila de AGENDA sin capacitación válida', 'AGENDA', t.ID_TURNO, 'CODIGO = ' + t.CODIGO); return; }
        cambios.ID_DICTADO = crearDictadoTurno_(t, cap, t.ESTADO === 'Clase abierta');
        if (t.ESTADO === 'Clase abierta') { cambios.TIPO_TURNO = 'Clase abierta'; if (vacio_(t.PUBLICADO)) cambios.PUBLICADO = 'Sí'; }
        if (vacio_(t.CONFIRMADO_POR)) cambios.CONFIRMADO_POR = 'HyS (libro)';
      }
      if (t.ESTADO === 'Reservado' && vacio_(t.TOKEN)) cambios.TOKEN = tokenAg_();
      if (vacio_(t.CREADO)) cambios.CREADO = ahoraTxt_();
      if (Object.keys(cambios).length) { setCampos_(A, t._k, cambios); n++; }
    });
    return n;
  });
  let pub = ''; try { pub = publicarClases_(); } catch (e) { pub = e.message; }
  SpreadsheetApp.getUi().alert('Agenda', r + ' fila(s) completadas. ' + pub, SpreadsheetApp.getUi().ButtonSet.OK);
}

// ------------------------------------------------------------------ Acciones del portal (las llama doPost de Código.gs, con la clave)
const ACCIONES_F7 = {
  c_ag_semana: d => agSemana_(d),
  c_ag_abrir: d => agAbrir_(d),
  c_ag_clase: d => agClase_(d),
  c_ag_estado: d => agEstado_(d),
  c_ag_confirmar: d => agConfirmar_(d),
  c_ag_franjas: d => agFranjasGuardar_(d),
  c_ag_recordatorios: () => agRecordatoriosActivar_(),
  c_ag_mensajes: () => agMensajes_(),
  c_ag_publicar: () => ({ ok: true, mensaje: publicarClases_() }),
  c_ag_whatsapp: () => ({ ok: true, texto: textoSemana_(), link: AGENDA_WEB, qr: qrDe_(AGENDA_WEB) }),
  c_cumplimiento: d => cumplimientoPortal_(d),
  c_cump_servicio: d => cumpServicio_(d),
  c_matriz: () => matrizLista_(),
  c_matriz_impacto: d => matrizImpacto_(d),
  c_matriz_guardar: d => matrizGuardar_(d),
  c_jefaturas: () => jefaturasLista_(),
  c_jefatura_guardar: d => jefaturaGuardar_(d)
};