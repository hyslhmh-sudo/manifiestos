/**
 * SISTEMA DE MANIFIESTOS · RESIDUOS PELIGROSOS
 * Servicio de Higiene y Seguridad Laboral · HZT / HMH
 *
 * Recibe las cargas de la aplicación (manifiestos y certificados) y las escribe
 * en el libro del establecimiento y en el libro general. Guarda las fotos en la
 * carpeta del establecimiento.
 *
 * Dónde está: Libro general › Extensiones › Apps Script.
 * Claves: planilla «CLAVES DE ESTABLECIMIENTOS (solo Belén)».
 */

// ------------------------------------------------------------------ CONFIGURACIÓN
const CFG = {
  GENERAL: '1ydG2somMrg5T2iv8G6DVH9HJawl32VVeMJz_eURrQJ4',
  CLAVES: '10XGA0pgXzCrqTcRRvXYUS_UeKVjs1LY8Tj0JTwcnnvM',
  CARPETA_ESTABLECIMIENTOS: '11EHhKFAJ8cGtRJ68Rk4lFcFboDAJDWmo',   // 02 ESTABLECIMIENTOS
  // Establecimientos del piloto. Los demás se leen de la hoja LIBROS del libro general (los crea crearLibrosFaltantes).
  EST: {
    HZT:  { nombre: 'Hospital Zonal Trelew «Dr. Adolfo Margara»', libro: '1I0wzDhqYsRQIs6f0qM3GghMWShnGIVFsiRQ_L8qGHks', carpeta: '1_m_pqj5cB1-xUN3Zp7ybTPjBc50QYNfB', area: 'Área Programática Trelew' },
    HMH:  { nombre: 'Hospital María Humphreys',                     libro: '17bbgCmj7blDOKfD-eGmAiFnIYYphbF_U7BDNyuUV6sY', carpeta: '1-bduPUeVClz3c033wOqSBrmm6LF9vBeH', area: 'Área Programática Trelew' },
    HSST: { nombre: 'Hospital Subzonal Santa Teresita (Rawson)',    libro: '1YoHJdym2pYl55FvZib69fRxsdaMKYhCnA-xkjiY0-v0', carpeta: '1BQRuiPTcRiQVRMoihpOARf2XnQElZeBP', area: 'Área Programática Trelew' },
  },
  EMPRESAS: ['Impeesa'],
  CORRIENTES: [{ c: 'Y1', n: 'Y1 · Biopatogénicos (bolsa roja)' }, { c: 'Y3', n: 'Y3 · Medicamentos y productos farmacéuticos' }],
};
const TZ = 'America/Argentina/Buenos_Aires';
// Versión del sistema: cambia con cada entrega. Se ve al pie del menú del portal. Si no coincide con la del manual, falta instalar algo.
const VERSION_SISTEMA = '2026-10-14 · 14.61';
function versionSistema() { Logger.log('Sistema HyS · versión ' + VERSION_SISTEMA); }
const FOTO_OBLIGATORIA_DESDE = '2027-01-01';   // certificados: desde esta fecha la foto es obligatoria al cargarlos
// Manifiestos: la foto (o el escaneo en el lote .zip del mes) nunca es obligatoria al cargar, pero tiene que estar antes del día 10 del mes siguiente.
// Desde FOTO_REGLA_DESDE, si un mes queda con manifiestos sin foto pasado ese día, el establecimiento no puede cargar manifiestos nuevos hasta regularizar.
// Antes de esa fecha, solo recordatorios. La clave de Higiene y Seguridad nunca queda bloqueada.
const FOTO_REGLA_DESDE = '2027-01';
const FOTO_DIA_LIMITE = 10;

// ------------------------------------------------------------------ CLAVES
// Las claves están en la planilla «CLAVES DE ESTABLECIMIENTOS (solo Belén)», carpeta 03 SISTEMA.
// Columna B: código del establecimiento · Columna C: clave · Columna E: estado.
// Para cambiar una clave, se cambia en la planilla (el sistema la toma en 5 minutos como máximo).
function clavesMapa_() {
  const cache = CacheService.getScriptCache();
  let mapa = cache.get('claves');
  if (!mapa) {
    const v = SpreadsheetApp.openById(CFG.CLAVES).getSheets()[0].getDataRange().getValues().slice(1);
    const m = {}; v.forEach(r => { if (r[1] && r[2]) m[String(r[1]).trim()] = String(r[2]).trim(); });
    mapa = JSON.stringify(m); cache.put('claves', mapa, 300);
  }
  return JSON.parse(mapa);
}
// Clave maestra de Higiene y Seguridad: fila con código «MAESTRA» en la planilla de claves. Entra a cualquier establecimiento.
function esMaestra_(clave) { const k = clavesMapa_()['MAESTRA']; return !!k && String(clave || '').trim().toLowerCase() === k.toLowerCase(); }
function claveOk_(est, clave) {
  if (esMaestra_(clave)) return true;
  const k = clavesMapa_()[est];
  return !!k && String(clave || '').trim().toLowerCase() === k.toLowerCase();   // no distingue mayúsculas
}

// ------------------------------------------------------------------ ENTRADA
function doGet(e) {
  // Respaldo sin GitHub: las mismas páginas, servidas desde Google (archivos HTML del proyecto: web_portal, web_diagnostico, web_app)
  const pag = e && e.parameter && e.parameter.p, PAGS = { portal: 'Portal HyS · Gestión (respaldo)', diagnostico: 'Diagnóstico de residuos · Referentes', app: 'Manifiestos · Carga de residuos', mipyv: 'MIPyV · Registro de visita (respaldo)' };
  if (pag && PAGS[pag]) return HtmlService.createHtmlOutputFromFile('web_' + pag).setTitle(PAGS[pag]).addMetaTag('viewport', 'width=device-width, initial-scale=1').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  const accion = (e && e.parameter && e.parameter.accion) || 'estado';
  if (accion === 'lista') return json_({ ok: true, lista: listaActivos_() });
  return json_({ ok: true, servicio: 'Manifiestos · residuos peligrosos', hora: new Date().toISOString() });
}
function doPost(e) {
  let d;
  try { d = JSON.parse(e.postData.contents); } catch (err) { return json_({ ok: false, error: 'Pedido mal formado.' }); }
  // Portal de gestión (solo con la clave maestra)
  if (String(d.accion || '').indexOf('p_') === 0) {
    try { return json_(portal_(d)); } catch (err) { registrarError_(d, err); return json_({ ok: false, error: 'interno', mensaje: 'No se pudo completar. Probá de nuevo.' }); }
  }
  // Lista completa (activos y pendientes) solo con la clave maestra
  if (d.accion === 'listaTodos') {
    if (!esMaestra_(d.clave)) return json_({ ok: false, error: 'clave', mensaje: 'La clave de Higiene y Seguridad no es correcta.' });
    const m = librosMapa_(), act = listaActivos_().map(x => x.id);
    return json_({ ok: true, lista: Object.keys(m).map(k => ({ id: k, nombre: m[k].nombre, activo: act.indexOf(k) >= 0 })) });
  }
  // Lista de establecimientos para la página del diagnóstico (solo nombres, sin datos)
  if (d.accion === 'd_lista') { const m = librosMapa_(); return json_({ ok: true, lista: Object.keys(m).filter(k => k !== 'MAESTRA').map(k => ({ id: k, nombre: m[k].nombre })).sort((a, b) => String(a.nombre).localeCompare(String(b.nombre))) }); }
  if (!est_(d.est)) return json_({ ok: false, error: 'Establecimiento desconocido.' });
  // Ingreso: DNI + clave personal (BASE COMÚN › ACCESOS), clave común del establecimiento (transición) o clave MAESTRA (Accesos.gs)
  const acc = acceso_(d.est, d.clave, d.dni);
  if (!acc.ok) return json_(acc);
  if (!accPermite_(d.accion, acc)) return json_({ ok: false, error: 'permiso', mensaje: 'No tenés asignado este módulo. Consultá con Higiene y Seguridad.' });
  if (!/^(config|m_tablero|m_registros|i_datos|i_novedades|i_persona|r_datos|r_dni|k_personas)$/.test(String(d.accion)) && typeof pcBump_ === 'function') pcBump_();   // una carga desde la aplicación renueva la caché del portal (Portal.gs, 14.50)
  if (acc.nombre && d.datos && typeof d.datos === 'object') {   // con clave personal, cada carga queda a nombre de quien ingresó
    d.datos.quien = acc.nombre; d.datos.persona = Object.assign({}, d.datos.persona || {}, { nombre: acc.nombre, dni: acc.dni, funcion: acc.rol || (d.datos.persona || {}).funcion || '' });
  }
  try {
    if (String(d.accion).indexOf('d_') === 0) return json_(diagRed_(d));   // diagnóstico de residuos (referentes)
    if (String(d.accion).indexOf('a_') === 0) return json_(audRed_(d));   // auditoría interna de residuos (referentes)
    if (String(d.accion).indexOf('k_') === 0) return json_(typeof cocRed_ === 'function' ? cocRed_(d) : { ok: false, mensaje: 'El módulo de cocinas todavía no está instalado.' });   // módulo 6 · cocinas (personas y relevamiento)
    if (String(d.accion).indexOf('r_') === 0) return json_(typeof radRed_ === 'function' ? radRed_(d) : { ok: false, mensaje: 'El módulo de radiaciones todavía no está instalado.' });   // módulo 9 · radiaciones (personal con dosímetro y eventos)
    if (String(d.accion).indexOf('i_') === 0) return json_(typeof incRed_ === 'function' ? incRed_(d, acc) : { ok: false, mensaje: 'El módulo de incendio todavía no está instalado.' });   // módulo 10 · control de extintores (Incendio.gs)
    if (String(d.accion).indexOf('m_') === 0) return json_(miRed_(d));    // «Mi establecimiento»: agua, plagas, documentos y pendientes
    if (d.accion === 'config') return json_(Object.assign(config_(d.est), { acceso: { modulos: acc.modulos, nombre: acc.nombre || '', rol: acc.rol || '', dni: acc.dni || '', maestra: !!acc.maestra, comun: !!acc.comun, servicio: acc.servicio || '' } }));
    // «No se recibieron manifiestos esta semana» (remisión semanal, PROT-RES-003 · ResiduosRemision.gs)
    if (d.accion === 'remision_obs') { if (!acc.maestra && (acc.modulos || []).indexOf('Residuos') < 0) return json_({ ok: false, error: 'permiso', mensaje: 'No tenés asignado el módulo de residuos.' });
      return json_(conLock_(() => remObsGuardar_(d.est, d.datos, acc.nombre || quien_((d.datos || {}).persona)))); }
    // Si trae «reemplaza», es una corrección desde «Mis registros» (Registros.gs): guarda la nueva y anula la anterior
    if (d.accion === 'manifiesto' && !(d.datos && d.datos.reemplaza) && !esMaestra_(d.clave)) { const b = fotosBloqueo_(d.est); if (b) return json_({ ok: false, error: 'bloqueo', mensaje: b }); }
    if (d.accion === 'manifiesto') return json_(conLock_(() => d.datos && d.datos.reemplaza ? regCorregir_(d.est, 'manifiesto', d.datos.reemplaza, esMaestra_(d.clave), quien_(d.datos.persona), () => guardarManifiesto_(d.est, d.datos), d.datos.idLocal) : guardarManifiesto_(d.est, d.datos)));
    if (d.accion === 'certificado') return json_(conLock_(() => d.datos && d.datos.reemplaza ? regCorregir_(d.est, 'certificado', d.datos.reemplaza, esMaestra_(d.clave), quien_(d.datos.persona), () => guardarCertificado_(d.est, d.datos), d.datos.idLocal) : guardarCertificado_(d.est, d.datos)));
    if (d.accion === 'lote') return json_(conLock_(() => guardarLote_(d.est, d.datos)));
    return json_({ ok: false, error: 'Acción desconocida.' });
  } catch (err) {
    registrarError_(d, err);
    return json_({ ok: false, error: 'interno', mensaje: 'No se pudo guardar. Se va a reintentar.' });
  }
}
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function conLock_(fn) { const l = LockService.getScriptLock(); l.waitLock(30000); try { return fn(); } finally { l.releaseLock(); } }

// ------------------------------------------------------------------ CONFIGURACIÓN PARA LA APLICACIÓN
function config_(est) {
  const E = est_(est), ss = SpreadsheetApp.openById(E.libro);
  // Sitios
  const sh = ss.getSheetByName('SITIOS'), n = Math.max(0, sh.getLastRow() - 5);
  const sitios = n ? sh.getRange(6, 1, n, 3).getValues().filter(r => r[0]).map(r => ({ sitio: r[0], oficial: r[1], sisa: String(r[2]) })) : [];
  // Referente (hoja DATOS)
  const dv = ss.getSheetByName('DATOS').getRange('A1:B40').getValues();
  const dato = lab => { const r = dv.find(x => String(x[0]).indexOf(lab) === 0); return r && r[1] !== 's/d' ? String(r[1]) : ''; };
  // Últimas cargas y avance por mes
  const man = leerManifiestos_(ss), cert = leerCertificados_(ss);
  const avance = {};   // 'aaaa-mm' -> {retiros, cert}
  man.forEach(m => { if (m.corriente !== 'Y1') return; const k = m.fecha.slice(0, 7); (avance[k] = avance[k] || { retiros: 0, cert: 0 }).retiros++; });
  cert.forEach(c => { const k = c.mes; (avance[k] = avance[k] || { retiros: 0, cert: 0 }).cert++; });
  const ultimas = agruparManifiestos_(man.slice(-400)).slice(-60);
  return { ok: true, est: est, nombre: E.nombre, sitios: sitios, empresas: CFG.EMPRESAS, corrientes: CFG.CORRIENTES,
    referente: { nombre: dato('Referente de residuos'), mail: dato('Correo de la referente') },
    ultimas: ultimas, certificados: cert.slice(-24), avance: avance, lotes: leerLotes_(ss), fotoObligatoriaDesde: FOTO_OBLIGATORIA_DESDE, fotosPend: fotosPendientes_(est, ss), bloqueo: fotosBloqueo_(est, ss), diaLimite: FOTO_DIA_LIMITE,
    remision: (() => { try { return typeof remEst_ === 'function' ? remEst_(est) : null; } catch (e) { return null; } })(),   // remisión semanal de manifiestos (ResiduosRemision.gs)
    actualizado: new Date().toISOString() };
}
function leerManifiestos_(ss) {
  const sh = ss.getSheetByName('MANIFIESTOS'), n = sh.getLastRow() - 5;
  if (n < 1) return [];
  return sh.getRange(6, 1, n, 13).getValues().filter(r => r[2]).map(r => ({
    sitio: r[1], fecha: Utilities.formatDate(new Date(r[2]), TZ, 'yyyy-MM-dd'), nro: String(r[5]), corriente: r[6],
    cant: r[7], tam: r[8], vol: r[9], uni: r[10] || 'dm³', origen: r[11], obs: r[12] }));
}
function agruparManifiestos_(man) {
  const g = {}, orden = [];
  man.forEach(m => { const k = m.sitio + '|' + m.nro + '|' + m.fecha; if (!g[k]) { g[k] = { sitio: m.sitio, nro: m.nro, fecha: m.fecha, origen: m.origen, res: [] }; orden.push(k); } g[k].res.push({ corriente: m.corriente, cant: m.cant, tam: m.tam, vol: m.vol, uni: m.uni }); });
  return orden.map(k => g[k]);
}
function leerCertificados_(ss) {
  const sh = ss.getSheetByName('CERTIFICADOS'), n = sh.getLastRow() - 5;
  if (n < 1) return [];
  return sh.getRange(6, 1, n, certAncho_(sh)).getValues().filter(r => r[3]).map(r => ({ empresa: r[0], mes: r[1] + '-' + String(r[2]).padStart(2, '0'), ncert: String(r[3]),
    ftrat: r[4] ? Utilities.formatDate(new Date(r[4]), TZ, 'yyyy-MM-dd') : '', origen: r[6], res: certCantLeer_(r) }));
}

// ------------------------------------------------------------------ CANTIDAD TRATADA EN EL CERTIFICADO (opcional)
// Va después de «Foto» (columna H), en el libro del establecimiento y en el general: un par de columnas por corriente,
// en el orden de CFG.CORRIENTES. Hoy: I «Y1 · cantidad tratada», J «Y1 · unidad», K «Y3 · cantidad tratada», L «Y3 · unidad».
// Si se agrega una corriente nueva, sus columnas se suman a la derecha. Unidad: dm³ (sin balanza) o kg.
// Si falla la aplicación, se puede cargar a mano en esas columnas.
const CERT_FIJAS = 8;
function certCab_() { const c = []; CFG.CORRIENTES.forEach(x => c.push(x.c + ' · cantidad tratada', x.c + ' · unidad')); return c; }
function certAncho_(sh) { return Math.min(sh.getMaxColumns(), CERT_FIJAS + certCab_().length); }
// Escribe los títulos de las columnas de cantidad si faltan (fila 5), con el formato del título «Foto»
function certCantCab_(sh) {
  const cab = certCab_();
  if (sh.getMaxColumns() < CERT_FIJAS + cab.length) sh.insertColumnsAfter(sh.getMaxColumns(), CERT_FIJAS + cab.length - sh.getMaxColumns());
  const r = sh.getRange(5, CERT_FIJAS + 1, 1, cab.length);
  if (r.getValues()[0].every((x, i) => String(x).trim() === cab[i])) return;
  sh.getRange(5, CERT_FIJAS).copyTo(r, SpreadsheetApp.CopyPasteType.PASTE_FORMAT, false);
  r.setValues([cab]);
}
function certCantFila_(res) {
  const o = [];
  CFG.CORRIENTES.forEach(x => { const r = (res || []).find(z => z.corriente === x.c), v = r ? num_(r.vol) : ''; o.push(v, v === '' ? '' : (r.uni === 'kg' ? 'kg' : 'dm³')); });
  return o;
}
function certCantLeer_(fila) {
  const res = [];
  CFG.CORRIENTES.forEach((x, i) => { const v = fila[CERT_FIJAS + 2 * i]; if (v !== '' && v != null) res.push({ corriente: x.c, vol: v, uni: fila[CERT_FIJAS + 2 * i + 1] || 'dm³' }); });
  return res;
}
/** Se ejecuta una vez desde el editor: agrega los títulos de las columnas de cantidad tratada en CERTIFICADOS de todos los libros y del general. */
function prepararCantidadCertificados() {
  const m = librosMapa_(), hechos = [];
  Object.keys(m).forEach(k => { if (k === 'MAESTRA' || !m[k].libro) return; try { certCantCab_(SpreadsheetApp.openById(m[k].libro).getSheetByName('CERTIFICADOS')); hechos.push(k); } catch (e) { Logger.log('No se pudo en ' + k + ': ' + e.message); } });
  certCantCab_(SpreadsheetApp.openById(CFG.GENERAL).getSheetByName('CERTIFICADOS'));
  Logger.log('Columnas de cantidad tratada listas en ' + hechos.length + ' libros y en el libro general.');
}

// ------------------------------------------------------------------ MANIFIESTO
function guardarManifiesto_(est, m) {
  const E = est_(est), ss = SpreadsheetApp.openById(E.libro), sh = ss.getSheetByName('MANIFIESTOS');
  if (!m || !m.nro || !m.fecha || !m.res || !m.res.length) return { ok: false, error: 'datos', mensaje: 'Faltan datos del manifiesto.' };
  // Ya recibido (reintento desde el teléfono): responder OK sin duplicar
  if (m.idLocal && sh.createTextFinder('app:' + m.idLocal).findNext()) return { ok: true, repetido: true };
  // Mismo número, mismo sitio y misma corriente ya cargado
  const prev = leerManifiestos_(ss).filter(x => x.nro === String(m.nro).trim() && x.sitio === m.sitio && !(m.reemplaza && regClaveMan_(x.sitio, x.nro, x.fecha, x.obs) === m.reemplaza));
  const rep = m.res.filter(r => prev.some(x => x.corriente === r.corriente));
  if (rep.length) return { ok: false, error: 'duplicado', mensaje: 'El manifiesto ' + m.nro + ' (' + rep.map(r => r.corriente).join(', ') + ') ya estaba cargado en ' + m.sitio + '.' };

  const f = m.fecha.split('-').map(Number), fecha = new Date(f[0], f[1] - 1, f[2]);
  // Nombre de la foto: fecha (dd.mm.aaaa) - número de manifiesto con 12 dígitos. Ej.: 23.01.2026 - 000023568974
  const foto = m.foto ? guardarFoto_(E.carpeta, 'Fotos manifiestos', String(f[0]), fechaPunto_(m.fecha) + ' - ' + nro12_(m.nro), m.foto) : (m.fotoUrl || '');   // corrección: conserva la foto anterior
  const esc = foto ? '' : escaneoDe_(E.carpeta, m.nro);
  const obs = [
    'Cargó: ' + quien_(m.persona),
    'Firmó transportista: ' + (m.firma || 's/d'), 'Original en el establecimiento: ' + (m.original || 's/d'),
    foto ? 'Foto: ' + foto : esc ? 'Escaneo: ' + esc : m.lote ? 'En lote escaneado: ' + m.lote : 'Sin foto', m.obs ? 'Obs.: ' + m.obs : '', 'app:' + (m.idLocal || Utilities.getUuid())
  ].filter(Boolean).join(' · ');

  // Libro del establecimiento: A est, B sitio, C fecha, D año, E mes, F nro, G corriente, H recipientes, I tamaño, J cantidad, K unidad, L origen, M obs
  const filasE = m.res.map(r => [E.nombre, m.sitio, fecha, '', '', String(m.nro).trim(), r.corriente, num_(r.cant), num_(r.tam), num_(r.vol), r.uni || 'dm³', 'App', obs]);
  agregar_(sh, filasE, [4, 5], ['=YEAR(R[0]C[-1])', '=MONTH(R[0]C[-2])']);
  // Libro general: A est, B sitio, C área, D fecha, E año, F mes, G nro, H corriente, I recipientes, J cantidad, K unidad, L origen, M tamaño, N obs
  const shG = SpreadsheetApp.openById(CFG.GENERAL).getSheetByName('MANIFIESTOS');
  const filasG = m.res.map(r => [E.nombre, m.sitio, E.area, fecha, '', '', String(m.nro).trim(), r.corriente, num_(r.cant), num_(r.vol), r.uni || 'dm³', 'App', num_(r.tam), obs]);
  agregar_(shG, filasG, [5, 6], ['=YEAR(R[0]C[-1])', '=MONTH(R[0]C[-2])']);
  return { ok: true };
}

// ------------------------------------------------------------------ CERTIFICADO
function guardarCertificado_(est, c) {
  const E = est_(est), ss = SpreadsheetApp.openById(E.libro), sh = ss.getSheetByName('CERTIFICADOS');
  if (!c || !c.ncert || !c.mes) return { ok: false, error: 'datos', mensaje: 'Faltan datos del certificado.' };
  if (c.idLocal && sh.createTextFinder('app:' + c.idLocal).findNext()) return { ok: true, repetido: true };
  if (leerCertificados_(ss).some(x => x.ncert === String(c.ncert).trim() && c.reemplaza !== 'cert:' + x.ncert)) return { ok: false, error: 'duplicado', mensaje: 'El certificado ' + c.ncert + ' ya estaba cargado.' };
  const [y, mm] = c.mes.split('-').map(Number);
  const ft = c.ftrat ? c.ftrat.split('-').map(Number) : null, ftrat = ft ? new Date(ft[0], ft[1] - 1, ft[2]) : '';
  // Nombre de la foto: fecha de tratamiento (dd.mm.aaaa) - número de certificado
  const foto = c.foto ? guardarFoto_(E.carpeta, 'Fotos certificados', String(y), (c.ftrat ? fechaPunto_(c.ftrat) : c.mes) + ' - ' + String(c.ncert).trim(), c.foto) : (c.fotoUrl || '');
  const ref = (foto || 'Sin foto') + ' · Cargó: ' + quien_(c.persona) + ' · app:' + (c.idLocal || Utilities.getUuid());
  // Establecimiento: A empresa, B año, C mes, D nro, E fecha trat., F retiros del mes, G origen, H foto, I en adelante cantidad tratada por corriente
  const cant = certCantFila_(c.res), shG = SpreadsheetApp.openById(CFG.GENERAL).getSheetByName('CERTIFICADOS');
  certCantCab_(sh); certCantCab_(shG);
  agregar_(sh, [[c.empresa || 's/d', y, mm, String(c.ncert).trim(), ftrat, '', 'App', ref].concat(cant)], [6],
    ['=COUNTIFS(MANIFIESTOS!C[-2],R[0]C[-4],MANIFIESTOS!C[-1],R[0]C[-3],MANIFIESTOS!C[1],"Y1")']);
  // General: A est, B empresa, C año, D mes, E nro, F fecha trat., G origen, H foto, I en adelante cantidad tratada por corriente
  agregar_(shG, [[E.nombre, c.empresa || 's/d', y, mm, String(c.ncert).trim(), ftrat, 'App', ref].concat(cant)], [], []);
  return { ok: true };
}

// ------------------------------------------------------------------ LOTES DE ESCANEADOS
// El establecimiento envía una carpeta comprimida (.zip) o PDFs con manifiestos/certificados ya escaneados,
// indicando el período. Se guarda en: carpeta del establecimiento › Escaneados › «aaaa-mm a aaaa-mm».
function guardarLote_(est, d) {
  const E = est_(est);
  if (!d || !d.archivo || !d.desde || !d.hasta) return { ok: false, error: 'datos', mensaje: 'Faltan datos del envío.' };
  const ss = SpreadsheetApp.openById(E.libro), sh = hojaLotes_(ss);
  if (d.idLocal && sh.createTextFinder('app:' + d.idLocal).findNext()) return { ok: true, repetido: true };
  const m = /^data:([\w.+-]+\/[\w.+-]+)?;base64,(.+)$/.exec(d.archivo); if (!m) return { ok: false, error: 'datos', mensaje: 'El archivo no se pudo leer.' };
  if (!/\.zip$/i.test(d.nombre || '') && !/zip/.test(m[1] || '')) return { ok: false, error: 'datos', mensaje: 'Solo se aceptan carpetas comprimidas (.zip). Las fotos sueltas se suben en cada manifiesto o desde «Mis registros».' };
  const periodo = d.desde + ' a ' + d.hasta;
  const dest = carpeta_(carpeta_(carpeta_(DriveApp.getFolderById(E.carpeta), 'Escaneados'), d.tipo === 'certificados' ? 'Certificados' : 'Manifiestos'), periodo);
  const blob = Utilities.newBlob(Utilities.base64Decode(m[2]), m[1] || 'application/octet-stream', d.nombre || 'envio');
  let cant = 1, enlazados = 0;
  if (/\.zip$/i.test(d.nombre || '') || /zip/.test(m[1] || '')) {
    const sub = dest.createFolder((d.nombre || 'envio').replace(/\.zip$/i, '') + ' · ' + Utilities.formatDate(new Date(), TZ, 'dd.MM.yyyy HH.mm'));
    const archivos = Utilities.unzip(blob.setContentType('application/zip')).filter(b => b.getName() && !/\/$/.test(b.getName()) && !/^__MACOSX/.test(b.getName()));
    archivos.forEach(b => { b.setName(b.getName().split('/').pop()); sub.createFile(b); });
    cant = archivos.length;
    if (d.tipo !== 'certificados') enlazados = enlazarEscaneos_(ss, archivos.map(b => b.getName()), sub, d.desde, d.hasta);
  } else {
    const f = dest.createFile(blob);
    if (d.tipo !== 'certificados') enlazados = enlazarEscaneos_(ss, [f.getName()], dest, d.desde, d.hasta);
  }
  const fila = [new Date(), d.tipo || 'manifiestos', "'" + d.desde, "'" + d.hasta, d.parte || '', cant, enlazados, quien_(d.persona), d.nota || '', dest.getUrl(), 'app:' + (d.idLocal || Utilities.getUuid())];
  sh.appendRow(fila);
  const g = SpreadsheetApp.openById(CFG.GENERAL);
  hojaLotes_(g, true).appendRow([E.nombre].concat(fila));
  alerta_(g, 'Escaneados recibidos', E.nombre, '—', (d.tipo || 'manifiestos') + ' · ' + periodo + ' · ' + cant + ' archivo(s)' + (enlazados ? ' · ' + enlazados + ' enlazado(s) a su manifiesto' : '') + (d.parte ? ' · ' + d.parte : ''));
  return { ok: true, archivos: cant, enlazados: enlazados };
}
function hojaLotes_(ss, general) {
  let sh = ss.getSheetByName('ESCANEADOS');
  if (!sh) {
    sh = ss.insertSheet('ESCANEADOS');
    const h = ['Recibido', 'Tipo', 'Desde', 'Hasta', 'Parte', 'Archivos', 'Enlazados a su manifiesto', 'Envió', 'Nota', 'Carpeta', 'Control'];
    sh.appendRow(general ? ['Establecimiento'].concat(h) : h);
    sh.getRange(1, 1, 1, h.length + (general ? 1 : 0)).setFontWeight('bold').setBackground('#343A40').setFontColor('#FFFFFF');
    sh.setFrozenRows(1);
  }
  return sh;
}
function leerLotes_(ss) {
  const sh = ss.getSheetByName('ESCANEADOS'); if (!sh || sh.getLastRow() < 2) return [];
  const per = v => v instanceof Date ? Utilities.formatDate(v, TZ, 'yyyy-MM') : String(v).replace(/^'/, '');
  return sh.getRange(2, 1, sh.getLastRow() - 1, 6).getValues().map(r => ({ tipo: r[1], desde: per(r[2]), hasta: per(r[3]), archivos: r[5] }));
}
// Busca el número de manifiesto en el nombre de cada archivo y agrega el enlace en la fila del manifiesto
function enlazarEscaneos_(ss, nombres, carpeta, desde, hasta) {
  const sh = ss.getSheetByName('MANIFIESTOS'), n = sh.getLastRow() - 5; if (n < 1) return 0;
  const v = sh.getRange(6, 1, n, 13).getValues(); let cant = 0;
  nombres.forEach(nom => {
    const nums = (nom.match(/\d{5,}/g) || []).map(x => String(Number(x)));
    if (!nums.length) return;
    const it = carpeta.getFilesByName(nom); if (!it.hasNext()) return; const url = it.next().getUrl();
    v.forEach((r, i) => {
      if (nums.indexOf(String(r[5]).replace(/^0+/, '')) < 0) return;
      const obs = String(r[12] || ''); if (obs.indexOf(url) >= 0) return;
      sh.getRange(6 + i, 13).setValue((obs ? obs + ' · ' : '') + 'Escaneo: ' + url); cant++;
    });
  });
  return cant;
}
function escaneoDe_(carpetaId, nro) {
  // Busca un archivo con el número de manifiesto dentro de «Escaneados › Manifiestos» del establecimiento
  const num = String(nro).replace(/\D/g, ''); if (num.length < 5) return '';
  try {
    const r = DriveApp.getFolderById(carpetaId).getFoldersByName('Escaneados'); if (!r.hasNext()) return '';
    const m = r.next().getFoldersByName('Manifiestos'); if (!m.hasNext()) return '';
    const pila = [m.next()];
    while (pila.length) {
      const f = pila.pop(), it = f.searchFiles('title contains "' + num + '"');
      if (it.hasNext()) return it.next().getUrl();
      const subs = f.getFolders(); while (subs.hasNext()) pila.push(subs.next());
    }
  } catch (e) {}
  return '';
}
// Agrega una alerta en el libro general (las fórmulas se copian de la fila anterior)
function alerta_(g, tipo, est, sitio, detalle) {
  try {
    const sh = g.getSheetByName('ALERTAS'), r = sh.getLastRow(), n = r + 1;
    const h = new Date(), hoy = new Date(h.getFullYear(), h.getMonth(), h.getDate());   // solo la fecha, sin hora
    sh.getRange(n, 1, 1, 6).setValues([[r - 4, tipo, est, sitio, detalle, hoy]]);
    sh.getRange(n, 9).setValue('Pendiente');
    [7, 8, 11, 12].forEach(c => sh.getRange(r, c).copyTo(sh.getRange(n, c), SpreadsheetApp.CopyPasteType.PASTE_FORMULA, false));
    sh.getRange(r, 1, 1, 13).copyTo(sh.getRange(n, 1, 1, 13), SpreadsheetApp.CopyPasteType.PASTE_FORMAT, false);
    const rg = g.getSheetByName('REGLAS');
    if (!rg.createTextFinder(tipo).matchEntireCell(true).findNext()) { rg.insertRowAfter(5); rg.getRange(6, 1, 1, 5).setValues([[tipo, 3, 3, 0, 'Agregada por el sistema']]); }
  } catch (e) {}
}

// ------------------------------------------------------------------ REGISTRO DE LIBROS (todos los establecimientos)
// Hoja LIBROS del libro general: Código · Establecimiento · Área · Libro (ID) · Carpeta (ID) · Creado
function librosMapa_() {
  const c = CacheService.getScriptCache(), v = c.get('libros');
  if (v) return JSON.parse(v);
  const m = {};
  Object.keys(CFG.EST).forEach(k => { m[k] = CFG.EST[k]; });
  const sh = SpreadsheetApp.openById(CFG.GENERAL).getSheetByName('LIBROS');
  if (sh && sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, 5).getValues().forEach(r => { if (r[0] && r[3]) m[String(r[0]).trim()] = { nombre: r[1], area: r[2], libro: r[3], carpeta: r[4] }; });
  c.put('libros', JSON.stringify(m), 600);
  return m;
}
function est_(codigo) { return librosMapa_()[String(codigo || '').trim()] || null; }
// Establecimientos que aparecen en la aplicación: los que tienen libro y estado «Activa…» en la planilla de claves
function listaActivos_() {
  const m = librosMapa_(), v = SpreadsheetApp.openById(CFG.CLAVES).getSheets()[0].getDataRange().getValues().slice(1);
  return v.filter(r => m[String(r[1]).trim()] && /^activ/i.test(String(r[4]))).map(r => ({ id: String(r[1]).trim(), nombre: m[String(r[1]).trim()].nombre }));
}

/**
 * Crea el libro de cada establecimiento que todavía no tiene: carpeta propia, copia del libro modelo
 * (el del HMH, vaciado), datos del establecimiento y un sitio (el edificio).
 * Se ejecuta desde el editor. Si se corta por tiempo, se vuelve a ejecutar y sigue donde quedó.
 */
function crearLibrosFaltantes() {
  const inicio = Date.now(), g = SpreadsheetApp.openById(CFG.GENERAL);
  let reg = g.getSheetByName('LIBROS');
  if (!reg) { reg = g.insertSheet('LIBROS'); reg.appendRow(['Código', 'Establecimiento', 'Área programática', 'Libro (ID)', 'Carpeta (ID)', 'Creado', 'Enlace']);
    reg.getRange(1, 1, 1, 7).setFontWeight('bold').setBackground('#343A40').setFontColor('#FFFFFF'); reg.setFrozenRows(1); }
  const ya = reg.getLastRow() > 1 ? reg.getRange(2, 1, reg.getLastRow() - 1, 1).getValues().map(r => String(r[0]).trim()) : [];
  Object.keys(CFG.EST).forEach(k => { if (ya.indexOf(k) < 0) { const E = CFG.EST[k]; reg.appendRow([k, E.nombre, E.area, E.libro, E.carpeta, 'piloto', 'https://docs.google.com/spreadsheets/d/' + E.libro]); ya.push(k); } });
  // Datos de base del libro general
  const shE = g.getSheetByName('ESTABLECIMIENTOS'), vE = shE.getRange(6, 1, shE.getLastRow() - 5, 6).getValues();
  const shD = g.getSheetByName('DATOS'), vD = shD.getRange(6, 1, shD.getLastRow() - 5, 6).getValues();
  const claves = SpreadsheetApp.openById(CFG.CLAVES).getSheets()[0].getDataRange().getValues().slice(1);
  const plantilla = DriveApp.getFileById(CFG.EST.HMH.libro), raiz = DriveApp.getFolderById(CFG.CARPETA_ESTABLECIMIENTOS);
  let creados = 0;
  for (const c of claves) {
    const cod = String(c[1]).trim(), nombre = String(c[0]).trim();
    if (!cod || ya.indexOf(cod) >= 0 || cod === 'MAESTRA' || cod === 'NC') continue;   // la clave maestra no es un establecimiento
    if (Date.now() - inicio > 4.5 * 60 * 1000) { Logger.log('Se cortó por tiempo. Volvé a ejecutar crearLibrosFaltantes para seguir.'); break; }
    const e = vE.find(r => String(r[0]).trim() === nombre) || [], d = vD.find(r => String(r[0]).trim() === nombre) || [];
    const area = e[4] || 's/d', sisa = e[2] && e[2] !== 's/d' ? String(e[2]) : (d[1] || 's/d'), corto = cod;
    const carpeta = raiz.createFolder(cod + ' · ' + nombre);
    const archivo = plantilla.makeCopy('Libro_' + cod.replace(/\s+/g, '_') + '_Manifiestos', carpeta);
    const ss = SpreadsheetApp.openById(archivo.getId());
    ss.setSpreadsheetTimeZone(TZ);
    vaciar_(ss.getSheetByName('MANIFIESTOS')); vaciar_(ss.getSheetByName('CERTIFICADOS'));
    const esc = ss.getSheetByName('ESCANEADOS'); if (esc) ss.deleteSheet(esc);
    const st = ss.getSheetByName('SITIOS'); st.getRange(6, 1, 1, 3).setValues([[corto, nombre, sisa]]); st.getRange(3, 1).setValue('1 sitio(s). Los configura Higiene y Seguridad.');
    if (st.getLastRow() > 6) st.deleteRows(7, st.getLastRow() - 6);
    ss.getSheetByName('AVANCE').getRange('A7').setValue(corto); ss.getSheetByName('AVANCE').getRange('B4').setValue(new Date().getFullYear());
    const li = ss.getSheetByName('LISTAS'); li.getRange('A1').setValue(corto); li.getRange('I2').setValue(corto);
    ss.getSheetByName('INDICADORES').getRange('C5').setValue(new Date().getFullYear());
    // Hoja DATOS
    const dt = ss.getSheetByName('DATOS'), lab = dt.getRange(1, 1, 45, 1).getValues();
    const poner = (t, v) => { const i = lab.findIndex(r => String(r[0]).indexOf(t) === 0); if (i >= 0) dt.getRange(i + 1, 2).setValue(v === '' || v == null ? 's/d' : v); };
    dt.getRange('A3').setValue('Libro de ' + nombre + '. La referente actualiza los contactos; el resto lo configura Higiene y Seguridad. Faltantes: s/d.');
    poner('Nombre completo', nombre); poner('Nombre corto', corto); poner('Código SISA', sisa); poner('Localidad', d[2]); poner('Área programática', area);
    poner('Dirección', d[3]); poner('Teléfonos', d[4]); poner('Director/a', d[5]); poner('Referente de residuos', 's/d'); poner('Correo de la referente', 's/d');
    poner('Correo de Dirección', 's/d'); poner('Administración', 's/d'); poner('Calidad', 's/d');
    const emp = ['HSST', 'Gaiman', 'Dolavon'].indexOf(cod) >= 0 ? 'Impeesa' : 's/d';
    poner('Empresa', emp); poner('Modalidad', emp === 'Impeesa' ? 'Recolección, tratamiento y disposición final' : 's/d'); poner('Contrato', emp === 'Impeesa' ? 'Expte. 3466/25 SS · Res. 243/26 SS · vigente hasta 31/12/2026' : 's/d');
    const url = ss.getUrl();
    reg.appendRow([cod, nombre, area, archivo.getId(), carpeta.getId(), new Date(), url]); ya.push(cod);
    // Enlace en la hoja ESTABLECIMIENTOS del libro general (columna L)
    const fe = vE.findIndex(r => String(r[0]).trim() === nombre); if (fe >= 0) shE.getRange(6 + fe, 12).setFormula('=HYPERLINK("' + url + '","Abrir libro")');
    creados++; SpreadsheetApp.flush();
  }
  CacheService.getScriptCache().remove('libros');
  Logger.log('Libros creados en esta ejecución: ' + creados + '. Total registrados: ' + ya.length + '.');
}
// Deja la hoja sin datos (conserva la fila 6 vacía con su formato: no se pueden borrar todas las filas no inmovilizadas)
// Arreglo único: la primera versión escribió el subtítulo en la fila 2 (la franja de color) de DATOS y SITIOS.
// Borra ese texto y deja el subtítulo correcto en la fila 3. Ejecutar una vez desde el editor.
function corregirEncabezados() {
  const reg = SpreadsheetApp.openById(CFG.GENERAL).getSheetByName('LIBROS'), v = reg.getRange(2, 1, reg.getLastRow() - 1, 4).getValues();
  let n = 0;
  v.forEach(r => {
    if (CFG.EST[r[0]] || !r[3]) return;   // los libros del piloto están bien
    const ss = SpreadsheetApp.openById(r[3]);
    const dt = ss.getSheetByName('DATOS'), st = ss.getSheetByName('SITIOS');
    if (dt.getRange('A2').getValue()) { dt.getRange('A3').setValue(dt.getRange('A2').getValue()); dt.getRange('A2').clearContent(); }
    if (st.getRange('A2').getValue()) { st.getRange('A3').setValue(st.getRange('A2').getValue()); st.getRange('A2').clearContent(); }
    n++;
  });
  Logger.log('Libros corregidos: ' + n);
}
function vaciar_(sh) { if (!sh || sh.getLastRow() < 6) return; if (sh.getLastRow() > 6) sh.deleteRows(7, sh.getLastRow() - 6); sh.getRange(6, 1, 1, sh.getMaxColumns()).clearContent(); }

// ------------------------------------------------------------------ AUXILIARES
// Quién cargó: nombre (función) · DNI · correo
function quien_(p) { if (!p || !p.nombre) return 's/d'; return p.nombre + (p.funcion ? ' (' + p.funcion + ')' : '') + (p.dni ? ' · DNI ' + p.dni : '') + (p.mail ? ' · ' + p.mail : ''); }
function fechaPunto_(iso) { const p = String(iso).split('-'); return p.length === 3 ? p[2] + '.' + p[1] + '.' + p[0] : String(iso); }
function nro12_(n) { const d = String(n).replace(/\D/g, ''); return d ? d.padStart(12, '0') : String(n).trim(); }
function num_(v) { const n = Number(String(v).replace(',', '.')); return isNaN(n) || v === '' ? '' : n; }
function agregar_(sh, filas, colsFormula, formulasR1C1) {
  if (!filas.length) return;
  const r0 = sh.getLastRow() + 1;
  sh.getRange(r0, 1, filas.length, filas[0].length).setValues(filas);
  colsFormula.forEach((c, i) => {
    const rg = sh.getRange(r0, c, filas.length, 1);
    rg.setFormulaR1C1(formulasR1C1[i]);
    // Configuración regional con coma decimal: los argumentos se separan con «;»
    if (formulasR1C1[i].indexOf(',') >= 0) { SpreadsheetApp.flush(); if (/^#(ERROR|NAME)/.test(String(rg.getCell(1, 1).getDisplayValue()))) rg.setFormulaR1C1(formulasR1C1[i].replace(/,/g, ';')); }
  });
  // Copia el formato de la fila anterior (colores, fechas, bordes)
  if (r0 > 6) sh.getRange(r0 - 1, 1, 1, filas[0].length).copyTo(sh.getRange(r0, 1, filas.length, filas[0].length), SpreadsheetApp.CopyPasteType.PASTE_FORMAT, false);
}
function carpeta_(padre, nombre) { const it = padre.getFoldersByName(nombre); return it.hasNext() ? it.next() : padre.createFolder(nombre); }
function guardarFoto_(carpetaId, tipo, anio, nombre, dataUrl) {
  const m = /^data:([\w.+-]+\/[\w.+-]+);base64,(.+)$/.exec(dataUrl); if (!m) return '';
  const ext = m[1] === 'application/pdf' ? '.pdf' : m[1] === 'image/png' ? '.png' : '.jpg';
  const dest = carpeta_(carpeta_(DriveApp.getFolderById(carpetaId), tipo), anio);
  const blob = Utilities.newBlob(Utilities.base64Decode(m[2]), m[1], nombre.replace(/[^\w\-.áéíóúñÁÉÍÓÚÑ ]/g, '_') + ext);
  return dest.createFile(blob).getUrl();
}
function registrarError_(d, err) {
  try {
    const ss = SpreadsheetApp.openById(CFG.GENERAL);
    const sh = ss.getSheetByName('ERRORES_SISTEMA') || ss.insertSheet('ERRORES_SISTEMA');
    sh.appendRow([new Date(), d.est || '', d.accion || '', String(err && err.stack || err)]);
  } catch (e) { /* sin registro */ }
}

// ------------------------------------------------------------------ FOTOS DE LOS MANIFIESTOS: pendientes por mes y bloqueo (desde 2027)
// Cuenta los manifiestos cargados por la aplicación (origen «App») que no tienen foto ni escaneo enlazado.
// Un mes con lote escaneado (.zip) enviado cuenta como completo.
const MESES_TXT = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const mesNombre_ = m => MESES_TXT[Number(m.slice(5, 7)) - 1] + ' ' + m.slice(0, 4);
function mesLimiteFoto_(m) { const y = Number(m.slice(0, 4)), n = Number(m.slice(5, 7)); const d = new Date(n === 12 ? y + 1 : y, n === 12 ? 0 : n, FOTO_DIA_LIMITE); return Utilities.formatDate(d, TZ, 'yyyy-MM-dd'); }
function fotosPendientes_(est, ss) {
  try {
    ss = ss || SpreadsheetApp.openById(est_(est).libro);
    const lotes = leerLotes_(ss).filter(l => l.tipo !== 'certificados'), desde = Utilities.formatDate(new Date(Date.now() - 400 * 864e5), TZ, 'yyyy-MM');
    const g = {};
    leerManifiestos_(ss).forEach(x => {
      if (x.origen !== 'App') return; const mes = x.fecha.slice(0, 7); if (mes < desde) return;
      if (/(Foto|Escaneo): *https?:/.test(String(x.obs || ''))) return;
      if (lotes.some(l => mes >= l.desde && mes <= l.hasta)) return;
      const k = x.sitio + '|' + x.nro + '|' + x.fecha; (g[mes] = g[mes] || {})[k] = x.nro;
    });
    return Object.keys(g).sort().map(m => ({ mes: m, nombre: mesNombre_(m), n: Object.keys(g[m]).length, nros: Object.values(g[m]).slice(0, 30), limite: mesLimiteFoto_(m) }));
  } catch (e) { return []; }
}
// Mensaje de bloqueo (o vacío): meses desde FOTO_REGLA_DESDE con manifiestos sin foto, pasado el día límite
function fotosBloqueo_(est, ss) {
  const hoy = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd');
  const v = fotosPendientes_(est, ss).filter(p => p.mes >= FOTO_REGLA_DESDE && hoy > p.limite);
  if (!v.length) return '';
  return 'No se pueden cargar manifiestos nuevos: faltan las fotos de ' + v.map(p => p.n + ' manifiesto(s) de ' + p.nombre).join(' y ') +
    '. Subilas desde «Mis registros» (botón «Subir foto») o enviá el lote .zip del mes. Si hay un motivo, avisá a Higiene y Seguridad.';
}

// ------------------------------------------------------------------ PRUEBA DESDE EL EDITOR
function probarConfig() { Logger.log('Clave HMH correcta: ' + claveOk_('HMH', 'Houssay1887')); Logger.log(JSON.stringify(config_('HMH')).slice(0, 2000)); }