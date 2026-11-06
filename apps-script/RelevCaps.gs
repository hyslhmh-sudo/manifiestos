/**
 * 6 · SERVICIOS E INFRAESTRUCTURA › RELEVAMIENTO DE CAPS (red Trelew) · versión 0 (06/11/2026, pedido de Belén)
 *
 * Qué es: la secretaría de HyS (Melani) recorre cada CAPS y carga desde «Mi establecimiento» (HZT) lo que ve y lo que le
 * cuenta el coordinador: locales y su función, tachos (cantidad, color de bolsa, tapa), cerraduras y vidrios rotos, baños,
 * acceso (escalones, rampa), residuos (bolsas roja y amarilla, libro de actas, depósito, carro, retiro y puerta) y preguntas
 * al coordinador (caloramas y caldera). No es una evaluación técnica: el análisis lo hace HyS después.
 * Todos los CAPS tienen gas natural y una sola planta (Belén, 06/11/2026): no se pregunta.
 *
 * Datos: libro propio «M6 · Relevamiento de CAPS · Sistema HyS» (propiedad CAPS_REL_ID) en la carpeta del módulo 6
 * (RGRL.CARPETA_M8). Se crea solo la primera vez. Hojas:
 *   RELEVAMIENTOS  una fila por relevamiento (datos generales, acceso, residuos, coordinador y resumen automático)
 *   LOCALES        una fila por local de cada relevamiento
 *   CAPS           lista de CAPS (barrio y nombre oficial); se puede agregar o corregir a mano
 *   FUNCIONES      lista de funciones de los locales; se puede agregar o corregir a mano
 * Si falta GitHub, todo se ve y se corrige directo en ese libro. Un relevamiento nuevo del mismo CAPS deja al anterior
 * «Reemplazado» (queda el más nuevo).
 * Fotos: Drive › MÓDULO 8 · SERVICIOS E INFRAESTRUCTURA › Relevamiento de CAPS › <CAPS> › <fecha>, hasta 5 por campo.
 *
 * Acceso: módulo «Relevamiento CAPS» en BASE COMÚN › ACCESOS (solo con DNI y clave personal). Acciones «m_caps_…»,
 * despachadas en Codigo.gs › doPost. Para no tocar Accesos.gs, el módulo se suma a ACC_MODULOS desde acá (abajo).
 * Instalar una vez: ejecutar instalarRelevCaps() (crea el libro y agrega el módulo a la lista desplegable de ACCESOS).
 * Normativa de base: Ley 19.587 y Decreto 351/79; Res. SRT 905/2015 (funciones del Servicio de HyS).
 */
const CAPS_REL = {
  P_LIBRO: 'CAPS_REL_ID', MODULO: 'Relevamiento CAPS', CODIGO: 'F-INF-01', VERSION: '0',
  CAPS: [['Amaya', 'CAPS «Dr. Ramón Carrillo»'], ['Constitución', 'CAPS «Dr. Jorge Morado»'], ['Corradi', ''], ['Don Bosco', 'CAPS «Gwenda Williams»'],
    ['Etchepare', ''], ['La Loma', ''], ['Planta de Gas', ''], ['San Martín', 'CAPS «Ing. Franzzetti»'], ['Sarmiento', ''], ['Tiro Federal', ''], ['Villa Italia', '']],
  FUNCIONES: ['Consultorio de medicina general', 'Consultorio de pediatría', 'Consultorio de gineco-obstetricia', 'Consultorio odontológico', 'Enfermería',
    'Vacunatorio', 'Consultorio de salud mental', 'Trabajo social', 'Nutrición', 'Sala de espera', 'Admisión', 'Farmacia', 'Office o cocina del personal',
    'Baño', 'Depósito', 'Depósito de residuos', 'Depósito de limpieza', 'Lavado o esterilización de material', 'Sala de máquinas', 'Otro'],
  H_REL: ['ID', 'ESTADO', 'CAPS', 'FECHA', 'RELEVO', 'ACOMPANO', 'COORDINADOR', 'COORD_TEL', 'HORARIO',
    'ESCALONES', 'RAMPA', 'RAMPA_BARANDA', 'FOTO_ENTRADA',
    'BOLSA_ROJA', 'BOLSA_AMARILLA', 'LIBRO_ACTAS', 'FOTO_LIBRO', 'DEPOSITO', 'DEPOSITO_COMPARTE', 'DEPOSITO_COMPARTE_CUAL', 'DEPOSITO_DONDE', 'DEPOSITO_LLAVE', 'FOTO_DEPOSITO',
    'CARRO', 'CARRO_ESTADO', 'RETIRO', 'RETIRO_PUERTA', 'RETIRO_PUERTA_CUAL', 'FOTO_PUERTA',
    'COORD_HABLO', 'COORD_MOTIVO', 'CALORAMAS', 'CALORAMAS_QUIEN', 'CALORAMAS_ULTIMA', 'CALDERA', 'CALDERA_QUIEN', 'CALDERA_ULTIMA', 'CALDERA_CONSTANCIA', 'FOTO_CONSTANCIA', 'COORD_OTROS',
    'OBSERVACIONES', 'NO_PUDO_VER',
    'N_LOCALES', 'LOCALES_POR_FUNCION', 'N_BANOS', 'BANOS_ESTADO', 'TACHOS_TOTAL', 'TACHOS_POR_BOLSA', 'TACHOS_SIN_TAPA', 'CERRADURAS_ROTAS', 'VIDRIOS_ROTOS',
    'CARGADO_POR', 'CARGADO_EL', 'REVISADO_HYS'],
  H_LOC: ['ID_RELEV', 'CAPS', 'FECHA', 'N', 'NOMBRE', 'FUNCION', 'FUNCION_OTRA', 'TACHOS_N', 'TACHOS_DETALLE', 'TACHOS_SIN_TAPA',
    'CERRADURA_ROTA', 'CERRADURA_CUAL', 'VIDRIO_ROTO', 'VIDRIO_CUAL', 'ESTADO_GENERAL', 'OBSERVACIONES',
    'BANO_PARA', 'BANO_INODORO', 'BANO_LAVATORIO', 'BANO_JABON', 'BANO_TOALLAS', 'BANO_BARRAS', 'NO_PUDO_VER', 'FOTOS', 'ESTADO'],
};

// El módulo se suma a la lista de módulos de ACCESOS (Accesos.gs) sin modificar ese archivo. Este archivo tiene que quedar
// DESPUÉS de Accesos.gs en el editor (los archivos nuevos quedan al final). Si no, no hace nada y no rompe.
try { if (ACC_MODULOS.indexOf(CAPS_REL.MODULO) < 0) ACC_MODULOS.push(CAPS_REL.MODULO); if (ACC_SOLO_PERSONAL.indexOf(CAPS_REL.MODULO) < 0) ACC_SOLO_PERSONAL.push(CAPS_REL.MODULO); } catch (e) {}

let CAPS_SS_ = null;
const capsTxt_ = v => v instanceof Date ? Utilities.formatDate(v, TZ, 'yyyy-MM-dd') : String(v == null ? '' : v).trim();

// ------------------------------------------------------------------ Libro (se crea solo)
function capsLibro_() {
  if (CAPS_SS_) return CAPS_SS_;
  const p = PropertiesService.getScriptProperties(); let id = p.getProperty(CAPS_REL.P_LIBRO), ss = null;
  if (id) { try { if (!DriveApp.getFileById(id).isTrashed()) ss = SpreadsheetApp.openById(id); } catch (e) {} }
  if (!ss) {
    ss = SpreadsheetApp.create('M6 · Relevamiento de CAPS · Sistema HyS'); ss.setSpreadsheetTimeZone(TZ); ss.setSpreadsheetLocale('es_AR');
    p.setProperty(CAPS_REL.P_LIBRO, ss.getId());
    try { DriveApp.getFileById(ss.getId()).moveTo(DriveApp.getFolderById(RGRL.CARPETA_M8)); } catch (e) {}
  }
  const hoja = (n, titulo, ayuda, H, fn) => {
    if (ss.getSheetByName(n)) return;
    const sh = ss.insertSheet(n);
    sh.getRange(1, 1).setValue(titulo).setFontWeight('bold').setFontSize(13);
    sh.getRange(2, 1).setValue(ayuda).setFontColor('#555555');
    sh.getRange(5, 1, 1, H.length).setValues([H]).setFontWeight('bold').setBackground('#DCEBF0');
    sh.setFrozenRows(5);
    if (fn) fn(sh);
  };
  hoja('RELEVAMIENTOS', 'Relevamiento de CAPS · ' + CAPS_REL.CODIGO + ' (versión ' + CAPS_REL.VERSION + ')',
    'Una fila por relevamiento. Lo carga la secretaría desde «Mi establecimiento». Un relevamiento nuevo del mismo CAPS deja al anterior «Reemplazado». s/d = sin dato (revisar). Las columnas N_ a VIDRIOS_ROTOS se calculan solas al guardar.', CAPS_REL.H_REL);
  hoja('LOCALES', 'Locales relevados', 'Una fila por local (consultorio, baño, depósito…) de cada relevamiento. ID_RELEV = fila de RELEVAMIENTOS.', CAPS_REL.H_LOC);
  hoja('CAPS', 'CAPS de la red Trelew', 'Barrio y nombre oficial. Se puede agregar o corregir. ACTIVO = No lo saca de la lista.', ['BARRIO', 'NOMBRE_OFICIAL', 'ACTIVO'],
    sh => sh.getRange(6, 1, CAPS_REL.CAPS.length, 3).setValues(CAPS_REL.CAPS.map(c => [c[0], c[1] || 's/d', 'Sí'])));
  hoja('FUNCIONES', 'Funciones de los locales', 'Lista que aparece al cargar cada local. Se puede agregar o corregir. «Otro» pide escribir cuál.', ['FUNCION'],
    sh => sh.getRange(6, 1, CAPS_REL.FUNCIONES.length, 1).setValues(CAPS_REL.FUNCIONES.map(f => [f])));
  const s1 = ss.getSheetByName('Hoja 1') || ss.getSheetByName('Sheet1'); if (s1 && ss.getSheets().length > 1) ss.deleteSheet(s1);
  CAPS_SS_ = ss; return ss;
}
function capsLeer_(n) {
  const sh = capsLibro_().getSheetByName(n); if (!sh || sh.getLastRow() < 6) return [];
  const H = sh.getRange(5, 1, 1, sh.getLastColumn()).getValues()[0].map(capsTxt_);
  return sh.getRange(6, 1, sh.getLastRow() - 5, H.length).getValues().map((r, i) => { const o = { _fila: 6 + i }; H.forEach((h, j) => { if (h) o[h] = capsTxt_(r[j]); }); return o; });
}
// Agrega una fila por nombre de columna (si alguien agregó columnas, se respetan; las que faltan se crean al final)
function capsAgregar_(n, filas) {
  if (!filas.length) return;
  const sh = capsLibro_().getSheetByName(n);
  let H = sh.getRange(5, 1, 1, sh.getLastColumn()).getValues()[0].map(capsTxt_);
  const faltan = []; filas.forEach(o => Object.keys(o).forEach(k => { if (H.indexOf(k) < 0 && faltan.indexOf(k) < 0) faltan.push(k); }));
  if (faltan.length) { sh.getRange(5, H.length + 1, 1, faltan.length).setValues([faltan]).setFontWeight('bold').setBackground('#DCEBF0'); H = H.concat(faltan); }
  sh.getRange(sh.getLastRow() + 1, 1, filas.length, H.length).setValues(filas.map(o => H.map(h => o[h] == null ? '' : o[h])));
}
function capsListas_() {
  const caps = capsLeer_('CAPS').filter(c => c.BARRIO && !/^no$/i.test(c.ACTIVO)).map(c => ({ barrio: c.BARRIO, oficial: /^s\/d/i.test(c.NOMBRE_OFICIAL) ? '' : c.NOMBRE_OFICIAL }));
  const fun = capsLeer_('FUNCIONES').map(f => f.FUNCION).filter(Boolean);
  if (fun.indexOf('Otro') < 0) fun.push('Otro');
  return { caps: caps, funciones: fun };
}
const capsNombre_ = c => c.barrio + (c.oficial ? ' · ' + c.oficial : '');

// ------------------------------------------------------------------ Entrada desde Codigo.gs (acciones «m_caps_…», ya con la clave validada)
function capsRelRed_(d, acc) {
  if (!acc.maestra && (acc.modulos || []).indexOf(CAPS_REL.MODULO) < 0) return { ok: false, error: 'permiso', mensaje: 'No tenés asignado el relevamiento de CAPS. Consultá con Higiene y Seguridad.' };
  const x = d.datos || {}, quien = String(x.quien || acc.nombre || '').trim() || 's/d';
  switch (d.accion) {
    case 'm_caps_abrir': return Object.assign({ ok: true, codigo: CAPS_REL.CODIGO, version: CAPS_REL.VERSION }, capsListas_(), { ultimos: capsUltimos_() });
    case 'm_caps_guardar': return conLock_(() => capsGuardar_(x, quien));
    case 'm_caps_ver': return capsVer_(x.id);
  }
  return { ok: false, error: 'Acción desconocida.' };
}

// Último relevamiento vigente de cada CAPS (con su resumen) para la lista de «Mi establecimiento»
function capsUltimos_() {
  const L = capsLeer_('RELEVAMIENTOS').filter(r => r.ID && r.ESTADO === 'Vigente');
  return L.sort((a, b) => b.FECHA.localeCompare(a.FECHA)).map(r => ({ id: r.ID, caps: r.CAPS, fecha: r.FECHA, quien: r.CARGADO_POR, locales: r.N_LOCALES, porFuncion: r.LOCALES_POR_FUNCION,
    banos: r.N_BANOS, banosEstado: r.BANOS_ESTADO, tachos: r.TACHOS_TOTAL, porBolsa: r.TACHOS_POR_BOLSA, sinTapa: r.TACHOS_SIN_TAPA, cerraduras: r.CERRADURAS_ROTAS, vidrios: r.VIDRIOS_ROTOS, revisado: r.REVISADO_HYS }));
}
function capsVer_(id) {
  const r = capsLeer_('RELEVAMIENTOS').find(o => o.ID === String(id || '')); if (!r) return { ok: false, mensaje: 'No encontré ese relevamiento.' };
  delete r._fila;
  return { ok: true, rel: r, locales: capsLeer_('LOCALES').filter(l => l.ID_RELEV === r.ID).map(l => { delete l._fila; return l; }), libro: capsLibro_().getUrl() };
}

// ------------------------------------------------------------------ Resumen (el mismo cálculo que muestra la aplicación antes de guardar)
function capsResumen_(locales) {
  const cuenta = {}, add = (o, k, n) => { o[k] = (o[k] || 0) + (n || 1); };
  const porFun = {}, bolsas = {}, banos = {}, cerr = [], vid = [];
  let tachos = 0, sinTapa = 0;
  locales.forEach(l => {
    const nom = l.NOMBRE || l.FUNCION || 'Local';
    add(porFun, l.FUNCION === 'Otro' ? 'Otro: ' + (l.FUNCION_OTRA || 's/d') : (l.FUNCION || 's/d'));
    (l.tachos || []).forEach(t => { tachos++; add(bolsas, t.BOLSA || 's/d'); if (t.TAPA === 'Sin tapa') sinTapa++; });
    if (l.FUNCION === 'Baño') add(banos, l.ESTADO_GENERAL || 's/d');
    if (l.CERRADURA_ROTA === 'Sí') cerr.push(nom + ': ' + (l.CERRADURA_CUAL || 's/d'));
    if (l.VIDRIO_ROTO === 'Sí') vid.push(nom + ': ' + (l.VIDRIO_CUAL || 's/d'));
  });
  const txt = o => Object.keys(o).map(k => k + ' ' + o[k]).join(' · ') || 'Ninguno';
  return { N_LOCALES: locales.length, LOCALES_POR_FUNCION: txt(porFun), N_BANOS: Object.keys(banos).reduce((a, k) => a + banos[k], 0), BANOS_ESTADO: txt(banos),
    TACHOS_TOTAL: tachos, TACHOS_POR_BOLSA: txt(bolsas), TACHOS_SIN_TAPA: sinTapa, CERRADURAS_ROTAS: cerr.join(' | ') || 'Ninguna', VIDRIOS_ROTOS: vid.join(' | ') || 'Ninguno' };
}

// ------------------------------------------------------------------ Guardar
function capsGuardar_(x, quien) {
  const caps = String(x.CAPS || '').trim(), fecha = /^\d{4}-\d{2}-\d{2}/.test(x.FECHA || '') ? x.FECHA.slice(0, 10) : '';
  if (!caps) return { ok: false, mensaje: 'Falta el CAPS.' };
  if (!fecha) return { ok: false, mensaje: 'Falta la fecha del relevamiento.' };
  const locales = Array.isArray(x.locales) ? x.locales : [];
  if (!locales.length) return { ok: false, mensaje: 'No hay locales cargados.' };
  if (x.idLocal && capsLeer_('RELEVAMIENTOS').some(r => r.ID_LOCAL === x.idLocal)) return { ok: true, aviso: 'Ya estaba guardado.' };   // reintento de la cola: no duplica

  // Fotos: una carpeta por CAPS y fecha
  let dir = null;
  const dirDe = () => { if (dir) return dir; let raiz; try { raiz = DriveApp.getFolderById(RGRL.CARPETA_M8); } catch (e) { raiz = DriveApp.getRootFolder(); }
    dir = carpeta_(carpeta_(carpeta_(raiz, 'Relevamiento de CAPS'), caps.split(' · ')[0]), fecha); return dir; };
  const foto = (v, nombre) => v && (v.base64 || v.dataUrl) ? guardarFotos_(dirDe(), (caps.split(' · ')[0] + ' - ' + nombre).replace(/[^\w.\- áéíóúñÁÉÍÓÚÑ]+/g, '_').slice(0, 80) + '_' + Date.now(), v) : '';

  const id = 'CAPS-' + Utilities.formatDate(new Date(), TZ, 'yyyyMMdd-HHmmss');
  const g = k => String(x[k] == null ? '' : x[k]).trim();
  const rel = { ID: id, ESTADO: 'Vigente', CAPS: caps, FECHA: fecha, RELEVO: quien, CARGADO_POR: quien, CARGADO_EL: Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm'), REVISADO_HYS: '', ID_LOCAL: x.idLocal || '' };
  CAPS_REL.H_REL.forEach(h => { if (rel[h] == null && !/^FOTO_|^N_|_POR_|^TACHOS_|^CERRADURAS|^VIDRIOS|^BANOS_/.test(h)) rel[h] = g(h); });
  rel.HORARIO = rel.HORARIO || 's/d'; rel.COORDINADOR = rel.COORDINADOR || 's/d'; rel.COORD_TEL = rel.COORD_TEL || 's/d';
  rel.FOTO_ENTRADA = foto(x.fotoEntrada, 'Entrada'); rel.FOTO_LIBRO = foto(x.fotoLibro, 'Libro de actas'); rel.FOTO_DEPOSITO = foto(x.fotoDeposito, 'Depósito de residuos');
  rel.FOTO_PUERTA = foto(x.fotoPuerta, 'Puerta de salida de residuos'); rel.FOTO_CONSTANCIA = foto(x.fotoConstancia, 'Constancia caldera');

  const filasLoc = locales.map((l, i) => {
    const t = Array.isArray(l.tachos) ? l.tachos : [], s = k => String(l[k] == null ? '' : l[k]).trim();
    return { ID_RELEV: id, CAPS: caps, FECHA: fecha, N: i + 1, NOMBRE: s('NOMBRE') || s('FUNCION'), FUNCION: s('FUNCION') || 's/d', FUNCION_OTRA: s('FUNCION_OTRA'),
      TACHOS_N: t.length, TACHOS_DETALLE: t.map((o, j) => (j + 1) + ': bolsa ' + (o.BOLSA || 's/d').toLowerCase() + ', ' + (o.TAPA || 's/d').toLowerCase()).join(' | ') || 'Sin tachos',
      TACHOS_SIN_TAPA: t.filter(o => o.TAPA === 'Sin tapa').length,
      CERRADURA_ROTA: s('CERRADURA_ROTA') || 's/d', CERRADURA_CUAL: s('CERRADURA_CUAL'), VIDRIO_ROTO: s('VIDRIO_ROTO') || 's/d', VIDRIO_CUAL: s('VIDRIO_CUAL'),
      ESTADO_GENERAL: s('ESTADO_GENERAL') || 's/d', OBSERVACIONES: s('OBSERVACIONES'),
      BANO_PARA: s('BANO_PARA'), BANO_INODORO: s('BANO_INODORO'), BANO_LAVATORIO: s('BANO_LAVATORIO'), BANO_JABON: s('BANO_JABON'), BANO_TOALLAS: s('BANO_TOALLAS'), BANO_BARRAS: s('BANO_BARRAS'),
      NO_PUDO_VER: s('NO_PUDO_VER'), FOTOS: foto(l.foto, 'Local ' + (i + 1) + ' ' + (s('NOMBRE') || s('FUNCION'))), ESTADO: 'Vigente' };
  });
  Object.assign(rel, capsResumen_(locales));

  // Queda el más nuevo: el relevamiento anterior del mismo CAPS pasa a «Reemplazado»
  const sh = capsLibro_().getSheetByName('RELEVAMIENTOS'), H = sh.getRange(5, 1, 1, sh.getLastColumn()).getValues()[0].map(capsTxt_), jE = H.indexOf('ESTADO');
  capsLeer_('RELEVAMIENTOS').filter(r => r.CAPS === caps && r.ESTADO === 'Vigente').forEach(r => { if (r.FECHA <= fecha) sh.getRange(r._fila, jE + 1).setValue('Reemplazado'); else rel.ESTADO = 'Anterior (hay uno más nuevo)'; });

  capsAgregar_('RELEVAMIENTOS', [rel]);
  capsAgregar_('LOCALES', filasLoc);
  if (typeof pcBump_ === 'function') pcBump_();
  return { ok: true, id: id, aviso: caps + ': ' + rel.N_LOCALES + ' locales, ' + rel.N_BANOS + ' baños, ' + rel.TACHOS_TOTAL + ' tachos.' };
}

// ------------------------------------------------------------------ Instalación (ejecutar una vez desde el editor)
function instalarRelevCaps() {
  const ss = capsLibro_();
  // Lista desplegable de ACCESOS › MODULOS (BASE COMÚN › LISTAS, columna ACCESOS_MODULOS): agrega «Relevamiento CAPS» si falta
  let lista = 'no encontré la columna ACCESOS_MODULOS en BASE COMÚN › LISTAS: agregá «' + CAPS_REL.MODULO + '» a mano';
  try {
    const sh = pBC_().getSheetByName('LISTAS'), V = sh.getDataRange().getValues();
    for (let i = 0; i < V.length; i++) { const j = V[i].map(capsTxt_).indexOf('ACCESOS_MODULOS'); if (j < 0) continue;
      const col = V.slice(i + 1).map(r => capsTxt_(r[j])); let k = col.indexOf(CAPS_REL.MODULO);
      if (k >= 0) { lista = 'ya estaba en LISTAS'; break; }
      k = col.indexOf(''); const fila = i + 2 + (k < 0 ? col.length : k); sh.getRange(fila, j + 1).setValue(CAPS_REL.MODULO); lista = 'agregado a LISTAS (fila ' + fila + ')'; break; }
  } catch (e) {}
  CacheService.getScriptCache().remove('accesos');
  Logger.log('Relevamiento de CAPS listo.\nLibro: ' + ss.getUrl() + '\nMódulo «' + CAPS_REL.MODULO + '»: ' + lista + '.\nEn ACCESOS › MODULOS, sumale «' + CAPS_REL.MODULO + '» a quien lo va a cargar (por ejemplo, la secretaría). Tarda hasta 5 minutos en verse.');
}

// ------------------------------------------------------------------ Portal HyS › 6 · Relevamiento de CAPS (pantalla #rcaps, 06/11/2026)
// Acciones «p_rcaps…», despachadas desde el default de Portal.gs (solo con la clave MAESTRA). No usar «p_caps»: ya es de capacitaciones.
function capsPortal_(accion, x) {
  if (accion === 'p_rcaps') return capsPortalDatos_();
  if (accion === 'p_rcaps_revisar') return conLock_(() => capsRevisar_(x));
  return { ok: false, mensaje: 'Acción desconocida: ' + accion };
}
function capsPortalDatos_() {
  const L = capsListas_(), rels = capsLeer_('RELEVAMIENTOS').filter(r => r.ID), loc = capsLeer_('LOCALES').filter(l => l.ID_RELEV);
  rels.forEach(r => { r.locales = loc.filter(l => l.ID_RELEV === r.ID).map(l => { delete l._fila; return l; }); delete r._fila; });
  rels.sort((a, b) => (b.FECHA + b.CARGADO_EL).localeCompare(a.FECHA + a.CARGADO_EL));
  let carpeta = '';
  try { const it = DriveApp.getFolderById(RGRL.CARPETA_M8).getFoldersByName('Relevamiento de CAPS'); if (it.hasNext()) carpeta = it.next().getUrl(); } catch (e) {}
  return { ok: true, caps: L.caps.map(capsNombre_), rels: rels, libro: capsLibro_().getUrl(), carpeta: carpeta };
}
function capsRevisar_(x) {
  const id = String(x.id || ''), sh = capsLibro_().getSheetByName('RELEVAMIENTOS'), H = sh.getRange(5, 1, 1, sh.getLastColumn()).getValues()[0].map(capsTxt_), j = H.indexOf('REVISADO_HYS');
  const r = capsLeer_('RELEVAMIENTOS').find(o => o.ID === id); if (!r || j < 0) return { ok: false, mensaje: 'No encontré ese relevamiento.' };
  const nota = String(x.nota || '').trim();
  sh.getRange(r._fila, j + 1).setValue('Revisado ' + Utilities.formatDate(new Date(), TZ, 'dd/MM/yyyy') + (nota ? ' · ' + nota : ''));
  return { ok: true };
}
