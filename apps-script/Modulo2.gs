/**
 * SISTEMA HyS · MÓDULO 2 · DOCUMENTOS (Fase 5 de la separación en módulos)
 * Arma la carpeta propia del módulo y MUEVE (no copia) lo que es documental. Al mover, los archivos y carpetas conservan
 * su enlace y su ID: la biblioteca, los contratos y los formularios siguen abriendo igual desde el portal y desde
 * «Mi establecimiento».
 *
 *   SISTEMA HyS › MÓDULO 2 · DOCUMENTOS
 *     ├ Biblioteca HyS                      guías, POE, protocolos, PTS y manuales (hoja BASE COMÚN › BIBLIOTECA_HYS)
 *     ├ Contratos y documentación           la carpeta 08 CONTRATOS Y DOCUMENTACIÓN, con sus subcarpetas
 *     ├ Formularios para imprimir           F-AGU, F-PLG y demás formularios
 *     ├ Establecimientos                    una carpeta por establecimiento con sus «Documentos propios»
 *     └ Respaldo
 *
 * Los registros siguen donde están: BIBLIOTECA_HYS y DOCUMENTOS_EST en la BASE COMÚN, y la numeración HYSL en el libro
 * general › REGISTRO_DOCUMENTOS. Solo cambian de lugar las carpetas de Drive.
 * Se puede ejecutar más de una vez: lo que ya se movió no se vuelve a tocar.
 */

const MOD2 = {
  SIS: '16AIJZcmxG9EBM3-D-J4vRtvruHK9DVrA',          // Drive › TRABAJO › SISTEMA HyS
  NOMBRE: 'MÓDULO 2 · DOCUMENTOS',
  SUB: ['Biblioteca HyS', 'Contratos y documentación', 'Formularios para imprimir', 'Establecimientos', 'Respaldo'],
  PROP_EST: 'DOC_EST_CARPETA'                       // Propiedad del script: carpeta «Establecimientos» del módulo
};

// Carpeta «Documentos propios» de un establecimiento dentro del módulo (la crea si hace falta).
// Si el módulo todavía no se armó, devuelve null y «Mi establecimiento» sigue usando la carpeta de siempre.
function docCarpetaEst_(cod) {
  const id = PropertiesService.getScriptProperties().getProperty(MOD2.PROP_EST); if (!id) return null;
  const vieja = audCarpetaEst_(cod); if (!vieja) return null;
  try { return carpeta_(carpeta_(DriveApp.getFolderById(id), vieja.getName()), 'Documentos propios'); } catch (e) { return null; }
}

function moverAModuloDocumentos() {
  const t0 = Date.now(), p = PropertiesService.getScriptProperties();
  const raiz = carpeta_(DriveApp.getFolderById(MOD2.SIS), MOD2.NOMBRE), sub = {};
  ['Establecimientos', 'Respaldo'].forEach(n => sub[n] = carpeta_(raiz, n));
  p.setProperty(MOD2.PROP_EST, sub['Establecimientos'].getId());
  const enCarpeta = (f, c) => { const it = f.getParents(); while (it.hasNext()) if (it.next().getId() === c.getId()) return true; return false; };
  // Pasa el contenido de «origen» a «destino» (para no dejar dos carpetas con el mismo nombre); la vacía va a la papelera
  const volcar = (origen, destino) => {
    const fs = origen.getFiles(); while (fs.hasNext()) fs.next().moveTo(destino);
    const ds = origen.getFolders(); while (ds.hasNext()) { const d = ds.next(), ya = destino.getFoldersByName(d.getName()); if (ya.hasNext()) volcar(d, ya.next()); else d.moveTo(destino); }
    if (!origen.getFiles().hasNext() && !origen.getFolders().hasNext()) origen.setTrashed(true);
  };
  const log = [];

  // 1. Carpetas generales: se mueve la carpeta entera (conserva su ID y su enlace) y se le pone el nombre del módulo.
  const generales = [
    ['Biblioteca HyS', p.getProperty('BIBLIOTECA_CARPETA')],
    ['Contratos y documentación', p.getProperty('CONTRATOS_CARPETA') || MI_CONTRATOS_CARPETA],
    ['Formularios para imprimir', p.getProperty('FORM_CARPETA') || MI_FORM_CARPETA]
  ];
  generales.forEach(([nombre, id]) => {
    if (!id) {   // la biblioteca todavía no tenía carpeta: se crea dentro del módulo y queda registrada para el portal
      if (nombre !== 'Biblioteca HyS') { log.push(nombre + ': no tiene carpeta'); return; }
      const nueva = carpeta_(raiz, nombre); p.setProperty('BIBLIOTECA_CARPETA', nueva.getId()); log.push(nombre + ': creada en el módulo'); return;
    }
    try {
      const f = DriveApp.getFolderById(id);
      if (enCarpeta(f, raiz)) { log.push(nombre + ': ya estaba'); return; }
      const antes = f.getName(); f.moveTo(raiz); if (antes !== nombre) f.setName(nombre);
      log.push(nombre + ': movida' + (antes !== nombre ? ' (antes «' + antes + '»)' : ''));
    } catch (e) { log.push(nombre + ': no se pudo mover (' + e.message + ')'); }
  });

  // 2. «Documentos propios» de cada establecimiento
  const sh = pBC_().getSheetByName('ESTABLECIMIENTOS'), H = sh.getRange(5, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
  const cods = pTabla_(sh, H.length).map(r => limpio_(r.v[0])).filter(Boolean);
  let movidos = 0, sinCarpeta = 0, cortado = false;
  for (let i = 0; i < cods.length; i++) {
    if (Date.now() - t0 > 4.5 * 60 * 1000) { cortado = true; break; }
    const vieja = audCarpetaEst_(cods[i]); if (!vieja) continue;
    const it = vieja.getFoldersByName('Documentos propios'); if (!it.hasNext()) { sinCarpeta++; continue; }
    const destino = carpeta_(carpeta_(sub['Establecimientos'], vieja.getName()), 'Documentos propios');
    while (it.hasNext()) volcar(it.next(), destino);
    movidos++;
  }
  CacheService.getScriptCache().removeAll(['p_resumen', 'p_tablero', 'cfg_inf']);
  Logger.log((cortado ? 'Se cortó por tiempo: volvé a ejecutar para seguir. ' : 'Listo. ') + log.join(' · ') +
    ' · Documentos propios movidos: ' + movidos + ' establecimientos (sin documentos: ' + sinCarpeta + '). Carpeta del módulo: ' + raiz.getUrl());
}

// ------------------------------------------------------------------ Documentos de los establecimientos (portal, clave de HyS)
// Vista de toda la red, carga y corrección desde el portal (misma hoja DOCUMENTOS_EST y misma carpeta que «Mi establecimiento»),
// y avisos de vencimiento para el tablero. El vencimiento es un dato que se carga (FECHA_VENCIMIENTO); si no tiene, no avisa.
const DOCEST_TEMAS = ['Residuos', 'Agua', 'Plagas', 'Seguridad', 'Cocina', 'Otro'];
const DOCEST_TIPOS = ['Manual', 'Guía', 'POE', 'Protocolo', 'PTS', 'Plan', 'Instructivo', 'Otro'];
const DOCEST_AVISO_DIAS = 60;
function docEstEstado_(d, hoy) {
  if (!regVivo_(d)) return 'anulado';
  if (d.ESTADO === 'Reemplazado') return 'reemplazado';
  const v = d.FECHA_VENCIMIENTO; if (!v) return 'sinvenc';
  if (v < hoy) return 'vencido';
  const lim = new Date(hoy + 'T12:00:00'); lim.setDate(lim.getDate() + DOCEST_AVISO_DIAS);
  return v <= Utilities.formatDate(lim, TZ, 'yyyy-MM-dd') ? 'porvencer' : 'vigente';
}
function docEstLista_() {
  const hoy = miHoy_(), E = pEstablecimientos_().filas.map(f => ({ cod: limpio_(f.v[0]), nombre: limpio_(f.v[1]), tipo: limpio_(f.v[3]), area: limpio_(f.v[4]) })).filter(e => e.cod);
  const docs = miLeer_('DOCUMENTOS_EST').map(d => ({ id: d.ID, cod: d.ESTABLECIMIENTO, tema: d.TEMA, tipo: d.TIPO, codigo: d.CODIGO, titulo: d.TITULO, version: d.VERSION, vigencia: d.FECHA_VIGENCIA,
    vence: d.FECHA_VENCIMIENTO || '', url: d.ARCHIVO, cargo: d.CARGO, cargado: d.CARGADO, obs: d.OBSERVACIONES, estado: docEstEstado_(d, hoy) }));
  return { ok: true, hoy: hoy, documentos: docs, establecimientos: E, temas: DOCEST_TEMAS, tipos: DOCEST_TIPOS, avisoDias: DOCEST_AVISO_DIAS };
}
// Alta (con archivo) o corrección (ID_EDITAR) de cualquier establecimiento
function docEstGuardar_(x) {
  const cod = limpio_(x.cod), quien = 'Higiene y Seguridad (portal)'; if (!cod || !est_(cod)) return { ok: false, mensaje: 'Elegí el establecimiento.' };
  if (!limpio_(x.TITULO)) return { ok: false, mensaje: 'Falta el nombre completo del documento.' };
  const ep = docSoloPdf_(x.archivo); if (ep) return { ok: false, mensaje: ep };
  if (x.FECHA_VIGENCIA && x.FECHA_VENCIMIENTO && x.FECHA_VENCIMIENTO < x.FECHA_VIGENCIA) return { ok: false, mensaje: 'El vencimiento es anterior a la vigencia: revisá las fechas.' };
  const r = x.ID_EDITAR ? regEditar_(cod, 'DOCUMENTOS_EST', 'ID', x.ID_EDITAR, true, x, quien) : miDocumento_(cod, x, quien);
  CacheService.getScriptCache().remove('p_tablero');
  return r;
}
// Documentos propios: solo PDF (también si el teléfono no informa el tipo: se reconoce por el contenido)
function docSoloPdf_(a) {
  if (!a || !a.base64) return '';
  const b = String(a.base64).replace(/^data:[^,]+,/, '');
  if (!/pdf/i.test(a.tipo || '') && !/^JVBER/.test(b)) return 'Solo se aceptan archivos PDF. Si el documento está en papel, escanealo como PDF.';
  a.tipo = 'application/pdf'; return '';
}
function docEstAnular_(x) {
  const cod = limpio_(x.cod), motivo = limpio_(x.motivo); if (!motivo) return { ok: false, mensaje: 'Escribí el motivo.' };
  if (!regMarcar_('DOCUMENTOS_EST', 'ID', x.id, cod, 'Higiene y Seguridad (portal)', motivo)) return { ok: false, mensaje: 'No encontré ese documento.' };
  CacheService.getScriptCache().remove('p_tablero');
  return { ok: true };
}
// Para el tablero general: cantidades y documentos vencidos o por vencer
function docEstResumen_() {
  const hoy = miHoy_(), D = miLeer_('DOCUMENTOS_EST').map(d => Object.assign(d, { est: docEstEstado_(d, hoy) })).filter(d => /vigente|sinvenc|porvencer|vencido/.test(d.est));
  return { total: D.length, establecimientos: Array.from(new Set(D.map(d => d.ESTABLECIMIENTO))).length,
    avisos: D.filter(d => d.est === 'vencido' || d.est === 'porvencer').map(d => ({ cod: d.ESTABLECIMIENTO, id: d.ID, codigo: d.CODIGO, titulo: d.TITULO, vence: d.FECHA_VENCIMIENTO, estado: d.est }))
      .sort((a, b) => String(a.vence).localeCompare(String(b.vence))) };
}
function docEstPortal_(accion, x) {
  switch (accion) {
    case 'p_docest_lista': return docEstLista_();
    case 'p_docest_guardar': return conLock_(() => docEstGuardar_(x));
    case 'p_docest_anular': return conLock_(() => docEstAnular_(x));
  }
  return { ok: false, error: 'Acción desconocida.' };
}
