/**
 * SISTEMA HyS · ACCESOS POR PERSONA (núcleo)
 * Cada persona entra a «Mi establecimiento» (y a la página de diagnóstico) con su DNI y su clave personal, y ve solo
 * los módulos que tiene asignados. Todo se maneja desde BASE COMÚN › ACCESOS (fila 5 = encabezados):
 *   DNI · APELLIDO_Y_NOMBRE · CORREO · ROL · ESTABLECIMIENTOS · MODULOS · CLAVE · ESTADO · DESDE · OBSERVACIONES
 *   ESTABLECIMIENTOS: códigos separados por coma (HZT, HMH) o «Toda la red».
 *   MODULOS: Residuos, Agua, Plagas, Documentos, Accidentes, Cocina, Notas, Radiaciones, Incendio, Diagnóstico, Auditoría, separados por coma, o «Todos».
 *   Diagnóstico y Auditoría (14.69): el diagnóstico y la auditoría interna de residuos se tildan aparte; Residuos solo da manifiestos y certificados.
 *   Relevamiento de cocina (14.70): aparte de Cocina (que da las personas de cocina).
 *   ESTADO: Activo (entra) · Pendiente · Baja (no entra).
 *   ROL = Servicio (sin DNI, APELLIDO_Y_NOMBRE = empresa: SOMI, MAREM): clave por servicio; se entra sin DNI y cada registro pide quién lo hace.
 * Claves: generarClavesAccesos() pone una clave nueva a cada persona activa con DNI que todavía no la tiene.
 * Transición POR MÓDULO: la clave común del establecimiento sigue funcionando, pero pierde los módulos que ya tienen
 * en ese establecimiento al menos una persona activa con clave propia. Ej.: si Melani tiene Accidentes en el HZT con su
 * clave, la clave común del HZT deja de ver Accidentes y sigue viendo Residuos, Agua, Plagas y Documentos.
 * Las personas con «Toda la red» no cuentan para esta regla. La clave MAESTRA (Higiene y Seguridad) entra siempre a todo.
 */

const ACC_MODULOS = ['Residuos', 'Agua', 'Plagas', 'Documentos', 'Accidentes', 'Cocina', 'Notas', 'Radiaciones', 'Incendio', 'Diagnóstico', 'Auditoría', 'Relevamiento de cocina', 'Capacitaciones', 'Desvíos'];   // 22/10/2026: Desvíos = supervisión de los desvíos del recorrido (supervisor de Star Union)   // 14.70: el relevamiento de cocina se habilita aparte de Cocina (personas de cocina)   // 14.69: Diagnóstico y Auditoría (interna de residuos) se habilitan aparte de Residuos   // Incendio: módulo 10, control de extintores (Incendio.gs, acciones i_…)
const ACC_SOLO_PERSONAL = ['Notas', 'Radiaciones', 'Incendio', 'Capacitaciones', 'Desvíos'];   // módulos que nunca se ven con la clave común del establecimiento (solo con DNI y clave propia)
// Listas desplegables de ACCESOS (ROL, ESTABLECIMIENTOS, MODULOS, ESTADO): BASE COMÚN › LISTAS, columnas ACCESOS_…; con «Permitir varias selecciones» quedan separados por coma.
// Qué módulo hace falta para cada acción («d_» y «a_», diagnóstico y auditoría interna de residuos; «s_», siniestros)
const ACC_PERMISO = { manifiesto: 'Residuos', certificado: 'Residuos', lote: 'Residuos', m_foto_man: 'Residuos', m_reservorio: 'Agua', m_punto: 'Agua', m_limpieza: 'Agua',
  m_analisis: 'Agua', m_plaga_aviso: 'Plagas', m_plaga_registro: 'Plagas', m_documento: 'Documentos', m_accidente: 'Accidentes' };

const accTxt_ = v => String(v == null ? '' : v).trim();
// Módulos escritos en ACCESOS › MODULOS: cada uno por su nombre (sin importar tildes ni mayúsculas) o por sus primeras 5 letras (14.70: «Relevamiento de cocina» no da «Cocina»)
const accNorm_ = s => accTxt_(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
function accModulosDe_(txt) {
  const out = []; String(txt || '').split(/[,;·]+/).map(accNorm_).filter(Boolean).forEach(it => {
    const m = ACC_MODULOS.find(x => accNorm_(x) === it) || ACC_MODULOS.find(x => it.indexOf(accNorm_(x).slice(0, 5)) === 0); if (m && out.indexOf(m) < 0) out.push(m); });
  return ACC_MODULOS.filter(m => out.indexOf(m) >= 0);
}
const accDni_ = v => String(v == null ? '' : v).replace(/\D/g, '');
const accClaveReal_ = c => !!c && !/^(usa |por ahora|s\/d)/i.test(c);   // textos de aviso que no son claves
// Claves personales protegidas (22/10/2026): la clave real se guarda en las propiedades del script, que no se ven al abrir
// el libro. En ACCESOS › CLAVE queda «(guardada)». Una clave escrita a mano en la celda sigue sirviendo hasta que se corra
// protegerClavesAccesos() (menú o portal › Accesos), que la pasa a las propiedades y deja «(guardada)».
const ACC_GUARDADA = '(guardada)';
const accClaveKey_ = (dni, nombre) => { const d = accDni_(dni); return d ? 'ACC_CLAVE_DNI_' + d : 'ACC_CLAVE_SRV_' + String(nombre || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ''); };
function accClaveDe_(celda, dni, nombre, P) { const c = accTxt_(celda); if (c !== ACC_GUARDADA) return c; P = P || PropertiesService.getScriptProperties().getProperties(); return accTxt_(P[accClaveKey_(dni, nombre)] || ''); }
function accClaveGuardar_(sh, fila, jC, dni, nombre, clave) { PropertiesService.getScriptProperties().setProperty(accClaveKey_(dni, nombre), clave); sh.getRange(fila, jC + 1).setValue(ACC_GUARDADA); }

// Filas de ACCESOS (se guardan 5 minutos en memoria: un cambio en la planilla tarda hasta 5 minutos en verse)
function accesosLeer_() {
  const c = CacheService.getScriptCache(), k = c.get('accesos'); if (k) return JSON.parse(k);
  const sh = pBC_().getSheetByName('ACCESOS'); if (!sh || sh.getLastRow() < 6) return [];
  const H = sh.getRange(5, 1, 1, sh.getLastColumn()).getValues()[0].map(accTxt_);
  const P = PropertiesService.getScriptProperties().getProperties();
  const L = sh.getRange(6, 1, sh.getLastRow() - 5, H.length).getDisplayValues().map((r, i) => { const o = { fila: 6 + i }; H.forEach((h, j) => o[h] = accTxt_(r[j])); o.CLAVE = accClaveDe_(o.CLAVE, o.DNI, o.APELLIDO_Y_NOMBRE, P); return o; })
    .filter(o => o.APELLIDO_Y_NOMBRE || o.DNI).map(o => {
      const ests = /toda|todos/i.test(o.ESTABLECIMIENTOS) ? ['*'] : o.ESTABLECIMIENTOS.split(/[,;·]+/).map(accTxt_).filter(Boolean);   // separados por coma (lista desplegable con varias selecciones); hay códigos con espacios: «Gan Gan»
      const mods = /(^|[,;·])\s*todos\s*($|[,;·])/i.test(o.MODULOS) ? ACC_MODULOS.slice() : accModulosDe_(o.MODULOS);
      return { fila: o.fila, dni: accDni_(o.DNI), nombre: o.APELLIDO_Y_NOMBRE, rol: o.ROL, ests: ests, modulos: mods, clave: o.CLAVE, activo: /^activ/i.test(o.ESTADO) };
    });
  try { c.put('accesos', JSON.stringify(L), 300); } catch (e) {}
  return L;
}
const accDueno_ = est => (typeof miGrupo_ === 'function' ? (miGrupo_(est) || {}).dueno : '') || '';
const accEstOk_ = (p, est) => p.ests.indexOf('*') >= 0 || p.ests.indexOf(est) >= 0 || (!!accDueno_(est) && p.ests.indexOf(accDueno_(est)) >= 0);

// Módulos que en este establecimiento ya pasaron a claves personales (alguien activo, con clave propia, nombrado para ese código)
function accModulosPersonales_(est) {
  const out = {}, d = accDueno_(est);
  accesosLeer_().forEach(p => {
    if (!p.activo || !accClaveReal_(p.clave) || p.ests.indexOf('*') >= 0 || /servicio/i.test(p.rol)) return;   // las claves por servicio (SOMI, MAREM) no cuentan
    if (p.ests.indexOf(est) < 0 && !(d && p.ests.indexOf(d) >= 0)) return;
    p.modulos.forEach(m => out[m] = true);
  });
  return out;
}
// Compatibilidad: ¿el establecimiento ya usa claves personales en TODOS los módulos?
function accUsaPersonales_(est) { const m = accModulosPersonales_(est); return ACC_MODULOS.filter(x => ACC_SOLO_PERSONAL.indexOf(x) < 0).every(x => m[x]); }

// ------------------------------------------------------------------ Habilitación progresiva (12/10/2026)
// BASE COMÚN › HABILITACION (fila 5 = encabezados): MODULO · HABILITADO_DESDE · OBSERVACIONES.
// La clave común del establecimiento ve un módulo solo desde su fecha (vacía o futura = todavía no). Lo marcado por persona
// en ACCESOS › MODULOS se respeta siempre (excepciones). Sin la hoja, todo queda habilitado como antes. Caché de 5 minutos.
function accHabilitacion_() {
  const c = CacheService.getScriptCache(), k = c.get('acc_hab'); if (k) return JSON.parse(k);
  const sh = pBC_().getSheetByName('HABILITACION'); let L = null;
  if (sh && sh.getLastRow() >= 6) {
    L = sh.getRange(6, 1, sh.getLastRow() - 5, 3).getValues().filter(r => accTxt_(r[0])).map(r => {
      let d = r[1]; if (!(d instanceof Date) && accTxt_(d)) { const p = accTxt_(d).split(/[\/\-.]/); d = p.length === 3 ? (p[0].length === 4 ? new Date(+p[0], p[1] - 1, +p[2]) : new Date(+p[2], p[1] - 1, +p[0])) : null; }
      return { modulo: accModulosDe_(r[0])[0] || accTxt_(r[0]), desde: d instanceof Date && !isNaN(d) ? Utilities.formatDate(d, TZ, 'yyyy-MM-dd') : '', obs: accTxt_(r[2]) };
    });
  }
  try { c.put('acc_hab', JSON.stringify(L), 300); } catch (e) {}
  return L;
}
// Módulos que la clave común ya puede ver hoy (sin la hoja: todos)
function accHabilitados_() {
  const L = accHabilitacion_(), hoy = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd'), out = {};
  ACC_MODULOS.forEach(m => { const h = L ? L.find(o => o.modulo === m) : null; out[m] = !L || (!!h && !!h.desde && h.desde <= hoy); });
  return out;
}

// Prueba: muestra qué módulos ve hoy la clave común (y qué dice la hoja)
function probarHabilitacion() { CacheService.getScriptCache().remove('acc_hab'); Logger.log(JSON.stringify({ hoja: accHabilitacion_(), hoy: accHabilitados_() })); }

// ------------------------------------------------------------------ Habilitación por establecimiento (20/10/2026)
// BASE COMÚN › HABILITACION_EST (fila 5 = encabezados): CODIGO, NOMBRE_OFICIAL y una columna por módulo con Sí / No.
// Un módulo en «No» no se ve en ese establecimiento (ni con clave personal ni con la común); la clave MAESTRA ve todo siempre.
// Sin la hoja, sin la fila del establecimiento o con la celda vacía o «s/d»: no se restringe. Caché de 5 minutos.
// El interruptor general del establecimiento sigue siendo ESTABLECIMIENTOS › ESTADO_EN_SISTEMA (lista desplegable).
function accHabEst_() {
  const c = CacheService.getScriptCache(), k = c.get('acc_hab_est'); if (k) return JSON.parse(k);
  let H = null;
  try {
    const sh = pBC_().getSheetByName('HABILITACION_EST');
    if (sh && sh.getLastRow() >= 6) {
      const enc = sh.getRange(5, 1, 1, sh.getLastColumn()).getValues()[0].map(accTxt_), v = sh.getRange(6, 1, sh.getLastRow() - 5, sh.getLastColumn()).getValues();
      H = {};
      v.forEach(r => { const cod = accTxt_(r[0]); if (!cod) return; H[cod] = {}; enc.forEach((m, j) => { if (j > 1 && ACC_MODULOS.indexOf(m) >= 0) H[cod][m] = !/^no/i.test(accTxt_(r[j])); }); });
    }
  } catch (e) { H = null; }
  try { c.put('acc_hab_est', JSON.stringify(H), 300); } catch (e) {}
  return H;
}
function accFiltrarEst_(est, mods) { const H = accHabEst_(); return H && H[est] ? mods.filter(m => H[est][m] !== false) : mods; }
function probarHabilitacionEst() { CacheService.getScriptCache().remove('acc_hab_est'); const H = accHabEst_(); Logger.log(JSON.stringify({ HMH: H && H.HMH, Telsen: H && H.Telsen, ejemploFiltro: accFiltrarEst_('Telsen', ACC_MODULOS) })); }

// Verifica el ingreso. Devuelve { ok, modulos, nombre, rol, dni, maestra, comun } o { ok:false, error, mensaje }
function acceso_(est, clave, dni) {
  clave = accTxt_(clave); dni = accDni_(dni);
  if (esMaestra_(clave)) return { ok: true, maestra: true, modulos: ACC_MODULOS.slice(), nombre: '' };
  if (dni) {
    const p = accesosLeer_().find(x => x.dni === dni);
    if (!p) return { ok: false, error: 'clave', mensaje: 'Tu DNI no tiene acceso. Pedíselo a Higiene y Seguridad.' };
    if (!p.activo) return { ok: false, error: 'clave', mensaje: 'Tu acceso todavía no está activo. Consultá con Higiene y Seguridad.' };
    if (!accClaveReal_(p.clave) || p.clave.toLowerCase() !== clave.toLowerCase()) return { ok: false, error: 'clave', mensaje: 'La clave no es correcta. Revisala (no importan las mayúsculas) o pedila a Higiene y Seguridad.' };
    if (!accEstOk_(p, est)) return { ok: false, error: 'clave', mensaje: 'Tu acceso no incluye este establecimiento.' };
    if (!p.modulos.length) return { ok: false, error: 'clave', mensaje: 'Todavía no tenés módulos asignados. Consultá con Higiene y Seguridad.' };
    const mp = accFiltrarEst_(est, p.modulos);
    if (!mp.length) return { ok: false, error: 'clave', mensaje: 'Todavía no están habilitados para este establecimiento los módulos de tu acceso. Consultá con Higiene y Seguridad.' };
    return { ok: true, modulos: mp, nombre: p.nombre, rol: p.rol, dni: p.dni };
  }
  // Clave por SERVICIO (empresas: SOMI, MAREM): fila de ACCESOS con ROL = Servicio, sin DNI. Se entra sin DNI y cada registro pide
  // quién lo hace (DNI, nombre y correo, cruzados con la base de personal: IncendioServicios.gs). 14/10/2026.
  const sv = accesosLeer_().find(p => /servicio/i.test(p.rol) && p.activo && accClaveReal_(p.clave) && p.clave.toLowerCase() === clave.toLowerCase() && accEstOk_(p, est));
  if (sv) { const ms = accFiltrarEst_(est, sv.modulos); return ms.length ? { ok: true, servicio: sv.nombre, modulos: ms, nombre: '', rol: 'Servicio · ' + sv.nombre } : { ok: false, error: 'clave', mensaje: sv.modulos.length ? 'Todavía no están habilitados para este establecimiento los módulos de esta clave. Consultá con Higiene y Seguridad.' : 'Esta clave todavía no tiene módulos asignados.' }; }
  if (!claveOk_(est, clave)) return { ok: false, error: 'clave', mensaje: 'La clave no es correcta.' };
  const pers = accModulosPersonales_(est), hab = accHabilitados_(), mods = accFiltrarEst_(est, ACC_MODULOS.filter(m => !pers[m] && ACC_SOLO_PERSONAL.indexOf(m) < 0 && hab[m]));
  if (!mods.length) return { ok: false, error: 'clave', mensaje: ACC_MODULOS.some(m => !pers[m] && ACC_SOLO_PERSONAL.indexOf(m) < 0 && !hab[m]) ? 'Todavía no hay módulos habilitados para esta clave. Consultá con Higiene y Seguridad.' : 'Este establecimiento ya usa claves personales: ingresá con tu DNI y tu clave.' };
  return { ok: true, comun: true, modulos: mods, nombre: '' };
}
// ¿Puede hacer esta acción? (las de consulta, como config, tablero o registros, no piden módulo)
function accPermite_(accion, acc) {
  const a = String(accion || ''), m = a === 'd_abrir' || a === 'd_lista' ? '' : /^d_/.test(a) ? 'Diagnóstico' : /^a_/.test(a) ? 'Auditoría' : /^s_/.test(a) ? 'Accidentes' : /^q_/.test(a) ? 'Capacitaciones' : /^k_(abrir|guardar|foto)$/.test(a) ? 'Relevamiento de cocina' : /^k_/.test(a) ? 'Cocina' : /^r_/.test(a) ? 'Radiaciones' : /^i_/.test(a) ? 'Incendio' : ACC_PERMISO[a];
  return !m || acc.modulos.indexOf(m) >= 0;
}

// ------------------------------------------------------------------ Claves personales (ejecutar desde el editor o el menú)
// Pone una clave nueva a cada persona ACTIVA con DNI que todavía no tiene clave propia. No toca las claves que ya existen.
function generarClavesAccesos() {
  const sh = pBC_().getSheetByName('ACCESOS'), H = sh.getRange(5, 1, 1, sh.getLastColumn()).getValues()[0].map(accTxt_);
  const jD = H.indexOf('DNI'), jC = H.indexOf('CLAVE'), jE = H.indexOf('ESTADO'), jN = H.indexOf('APELLIDO_Y_NOMBRE'), n = sh.getLastRow() - 5;
  if (n < 1) return Logger.log('No hay personas en ACCESOS.');
  const v = sh.getRange(6, 1, n, H.length).getValues(), letras = 'abcdefghjkmnpqrstuvwxyz', hechas = [];
  const nueva = () => Array.from({ length: 3 }, () => letras[Math.floor(Math.random() * letras.length)]).join('') + '-' + String(1000 + Math.floor(Math.random() * 9000));
  v.forEach((r, i) => {
    const dni = accDni_(r[jD]), clave = accTxt_(r[jC]);
    if (!dni || !/^activ/i.test(accTxt_(r[jE])) || accClaveReal_(clave) || /maestra/i.test(clave)) return;
    const k = nueva(); accClaveGuardar_(sh, 6 + i, jC, dni, accTxt_(r[jN]), k); hechas.push(accTxt_(r[jN]) + ' (DNI ' + dni + '): ' + k);
  });
  CacheService.getScriptCache().remove('accesos');
  Logger.log(hechas.length ? 'Claves nuevas (pasáselas a cada persona; quedaron guardadas en el sistema y se ven en el portal › Accesos):\n' + hechas.join('\n') : 'No había personas activas con DNI y sin clave.');
}
// Ordena la hoja: lista de ESTADO y ayuda de MODULOS (ejecutar una vez, o de nuevo si cambia la regla)
function prepararHojaAccesos() {
  const sh = pBC_().getSheetByName('ACCESOS'), H = sh.getRange(5, 1, 1, sh.getLastColumn()).getValues()[0].map(accTxt_);
  sh.getRange(6, H.indexOf('ESTADO') + 1, 500, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(['Activo', 'Pendiente', 'Baja'], true).build());
  sh.getRange(5, H.indexOf('MODULOS') + 1).setNote('Uno o varios, separados por coma: ' + ACC_MODULOS.join(', ') + '. O «Todos».');
  sh.getRange(5, H.indexOf('ESTABLECIMIENTOS') + 1).setNote('Códigos separados por coma (HZT, HMH) o «Toda la red».');
  sh.getRange(5, H.indexOf('CLAVE') + 1).setNote('La pone el sistema: Sistema HyS › generarClavesAccesos. Se puede cambiar a mano.');
  sh.getRange(2, 1).setValue('Una fila por persona: DNI, establecimientos y módulos que puede cargar (' + ACC_MODULOS.join(', ') + ' o Todos). Cada persona entra a «Mi establecimiento» con su DNI y su CLAVE y ve solo sus módulos. ' +
    'La clave común del establecimiento sigue sirviendo para los módulos que todavía no tienen a nadie activo con clave propia; un módulo que ya lo tiene, solo se usa con clave personal. Para quitar un acceso: ESTADO = Baja.');
  CacheService.getScriptCache().remove('accesos');
  Logger.log('Hoja ACCESOS preparada.');
}

// ------------------------------------------------------------------ Portal › Accesos (pantalla «Accesos» del portal de gestión)
// Solo con la clave MAESTRA (entra por Portal.gs › portalAccion_, acciones p_acc_…). Lee y escribe BASE COMÚN › ACCESOS,
// la misma hoja de siempre: todo se puede seguir haciendo a mano en la planilla.
function accPortal_(accion, x) {
  const bc = pBC_(), sh = bc.getSheetByName('ACCESOS');
  if (!sh) return { ok: false, mensaje: 'No está la hoja ACCESOS en BASE COMÚN.' };
  const H = sh.getRange(5, 1, 1, sh.getLastColumn()).getValues()[0].map(accTxt_), col = h => H.indexOf(h);
  const CAMPOS = ['DNI', 'APELLIDO_Y_NOMBRE', 'CORREO', 'ROL', 'ESTABLECIMIENTOS', 'MODULOS', 'ESTADO', 'OBSERVACIONES'];
  const filas = () => {
    const n = sh.getLastRow() - 5; if (n < 1) return [];
    return sh.getRange(6, 1, n, H.length).getDisplayValues().map((r, i) => { const o = { fila: 6 + i }; H.forEach((h, j) => { if (h) o[h] = accTxt_(r[j]); }); return o; })
      .filter(o => o.APELLIDO_Y_NOMBRE || o.DNI);
  };
  const limpiar = () => CacheService.getScriptCache().remove('accesos');
  const letras = 'abcdefghjkmnpqrstuvwxyz';
  const nueva = () => Array.from({ length: 3 }, () => letras[Math.floor(Math.random() * letras.length)]).join('') + '-' + String(1000 + Math.floor(Math.random() * 9000));

  if (accion === 'p_acc_listar') {
    const L = bc.getSheetByName('LISTAS'), listas = {};
    if (L) { const v = L.getDataRange().getDisplayValues(), h = v[0].map(accTxt_);
      ['ESTABLECIMIENTOS', 'MODULOS', 'ROL', 'ESTADO'].forEach(k => { const j = h.indexOf('ACCESOS_' + k); listas[k] = j < 0 ? [] : v.slice(1).map(r => accTxt_(r[j])).filter(Boolean); }); }
    const P = PropertiesService.getScriptProperties().getProperties();
    const F = filas().map(o => { const c = accClaveDe_(o.CLAVE, o.DNI, o.APELLIDO_Y_NOMBRE, P) || '';
      o.CLAVE = esMaestra_(c) || /maestra/i.test(c) ? '(clave maestra)' : accClaveReal_(c) ? c : ''; return o; });
    const shH = bc.getSheetByName('HABILITACION');
    return { ok: true, filas: F, listas: listas, modulos: ACC_MODULOS, soloPersonal: ACC_SOLO_PERSONAL,
      hoja: bc.getUrl() + '#gid=' + sh.getSheetId(), habilitacion: accHabilitacion_(), habilitados: accHabilitados_(), hojaHab: shH ? bc.getUrl() + '#gid=' + shH.getSheetId() : '' };
  }

  if (accion === 'p_acc_guardar') return conLock_(() => {
    const d = x.datos || {}, dni = accDni_(d.DNI), fila = Number(x.fila) || 0;
    if (!accTxt_(d.APELLIDO_Y_NOMBRE)) return { ok: false, mensaje: 'Falta el apellido y nombre.' };
    if (fila && (fila < 6 || fila > sh.getLastRow())) return { ok: false, mensaje: 'No encontré esa fila en ACCESOS. Actualizá la pantalla.' };
    if (dni) { const otra = filas().find(o => accDni_(o.DNI) === dni && o.fila !== fila);
      if (otra) return { ok: false, mensaje: 'Ese DNI ya está cargado (fila ' + otra.fila + ': ' + otra.APELLIDO_Y_NOMBRE + ').' }; }
    if (/^activ/i.test(accTxt_(d.ESTADO)) && !dni) return { ok: false, mensaje: 'Para dejarla Activa hace falta el DNI (con el DNI y su clave entra).' };
    const f = fila || Math.max(sh.getLastRow() + 1, 6);
    CAMPOS.forEach(k => {
      const j = col(k); if (j < 0 || !(k in d)) return;
      let v = k === 'DNI' ? dni : accTxt_(d[k]);
      if (!v && k !== 'OBSERVACIONES') v = 's/d (revisar)';
      sh.getRange(f, j + 1).setValue(v);
    });
    if (!fila && col('DESDE') >= 0) sh.getRange(f, col('DESDE') + 1).setValue(Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd'));
    limpiar();
    return { ok: true, fila: f };
  });

  if (accion === 'p_acc_clave') return conLock_(() => {
    const fila = Number(x.fila), jC = col('CLAVE');
    if (jC < 0) return { ok: false, mensaje: 'Falta la columna CLAVE en ACCESOS.' };
    if (!(fila >= 6 && fila <= sh.getLastRow())) return { ok: false, mensaje: 'No encontré esa fila en ACCESOS. Actualizá la pantalla.' };
    const actual = accTxt_(sh.getRange(fila, jC + 1).getDisplayValue());
    if (esMaestra_(actual) || /maestra/i.test(actual)) return { ok: false, mensaje: 'Esa persona usa la clave maestra: no se cambia desde acá.' };
    const dniF = col('DNI') >= 0 ? sh.getRange(fila, col('DNI') + 1).getDisplayValue() : '', nomF = col('APELLIDO_Y_NOMBRE') >= 0 ? sh.getRange(fila, col('APELLIDO_Y_NOMBRE') + 1).getDisplayValue() : '';
    const k = nueva(); accClaveGuardar_(sh, fila, jC, dniF, nomF, k); limpiar();
    return { ok: true, clave: k };
  });

  if (accion === 'p_acc_proteger') return conLock_(() => { const n = protegerClavesAccesos(); limpiar(); return { ok: true, protegidas: n }; });

  return { ok: false, mensaje: 'Acción desconocida.' };
}

// Pasa a las propiedades del script toda clave personal que esté escrita en ACCESOS › CLAVE y deja «(guardada)».
// No toca la clave maestra ni los textos de aviso. Devuelve cuántas protegió. Se puede correr las veces que haga falta.
function protegerClavesAccesos() {
  const sh = pBC_().getSheetByName('ACCESOS'); if (!sh || sh.getLastRow() < 6) return 0;
  const H = sh.getRange(5, 1, 1, sh.getLastColumn()).getValues()[0].map(accTxt_), jC = H.indexOf('CLAVE'), jD = H.indexOf('DNI'), jN = H.indexOf('APELLIDO_Y_NOMBRE');
  if (jC < 0) return 0;
  const v = sh.getRange(6, 1, sh.getLastRow() - 5, H.length).getDisplayValues(); let n = 0;
  v.forEach((r, i) => {
    const c = accTxt_(r[jC]); if (!c || c === ACC_GUARDADA || !accClaveReal_(c) || /maestra/i.test(c) || esMaestra_(c)) return;
    if (!accDni_(r[jD]) && !accTxt_(r[jN])) return;
    accClaveGuardar_(sh, 6 + i, jC, r[jD], r[jN], c); n++;
  });
  CacheService.getScriptCache().remove('accesos');
  Logger.log(n + ' clave(s) protegida(s).');
  return n;
}
