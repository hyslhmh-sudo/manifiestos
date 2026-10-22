/**
 * SISTEMA HyS · MÓDULO 1 · RESIDUOS · NOVEDADES DE RESIDUOS (versión 0, 22/10/2026)
 * Pedido de Belén (22/10/2026): un lugar en «Mi establecimiento» › 1 · Residuos para informar lo que se ve mal en una recorrida
 * (bolsa equivocada, cortopunzante suelto, descartador lleno, depósito abierto, la empresa no retiró, etc.), como
 * «Informar una novedad» de Incendio.
 *  · Lo usan Melani (HZT, red Trelew y HMH) y el referente de residuos del HSST, con su DNI y su clave personal y el módulo
 *    «Residuos» asignado en BASE COMÚN › ACCESOS. Con la clave maestra, Higiene y Seguridad entra a todo.
 *  · Cada novedad queda en el libro de manifiestos de su establecimiento (MÓDULO 1 › Establecimientos), hoja NOVEDADES_RES,
 *    que se crea sola. Si falla la aplicación, se puede cargar a mano en esa hoja desde la fila 6 (el ID lo pone el sistema).
 *  · Foto opcional: carpeta del establecimiento › Novedades de residuos › aaaa-mm.
 *  · ESTADO: Abierta hasta que se marque «Resuelta». La marcan quienes tienen el módulo Residuos en ese establecimiento
 *    y Higiene y Seguridad.
 *  · NO envía correos. Belén las ve en «Mi establecimiento» (Novedades de residuos), en la hoja de cada libro y, cuando se
 *    conecte el portal, en «Requiere atención» (rnovAvisos_ y rnovPortal_ ya quedan listas para eso).
 *  · El foco está en los residuos peligrosos: esas novedades llevan PELIGROSA = Sí y aparecen primero.
 * Normativa: Ley 19.587 y Dto. 351/79 (condiciones de higiene y seguridad); Ley 24.051 y Dto. 831/93 (residuos peligrosos);
 * Ley XI N.º 35, Código Ambiental del Chubut; Res. MSN 134/2016 (Directrices Nacionales GREAS).
 * Instalación: 1) agregar este archivo al proyecto; 2) en Establecimiento.gs › miRed_, la línea que deriva las acciones
 * «m_res_nov…» a resNovRed_; 3) opcional, ejecutar una vez prepararNovedadesResiduos() para crear las hojas.
 */
const RNOV = {
  HOJA: 'NOVEDADES_RES',
  CARPETA: 'Novedades de residuos',
  H: ['ID', 'FECHA', 'HORA', 'ESTABLECIMIENTO', 'SITIO', 'SECTOR', 'TIPO', 'CORRIENTE', 'PELIGROSA', 'DETALLE', 'FOTO', 'QUIEN', 'ESTADO', 'RESUELTO', 'RESUELTO_POR', 'RESOLUCION', 'CARGADO'],
  // Qué se vio (primero lo que tiene que ver con residuos peligrosos)
  TIPOS: [
    'Residuo peligroso en la bolsa equivocada',
    'Cortopunzante fuera del descartador',
    'Bolsa roja o descartador sobrellenado o mal cerrado',
    'Medicamentos, ampollas o químicos mal descartados',
    'Derrame o bolsa rota',
    'Residuos peligrosos acumulados más del tiempo permitido',
    'La empresa no retiró',
    'Depósito de residuos abierto, sucio o con residuos ajenos',
    'Residuo común o reciclable en bolsa roja',
    'Recipiente sin tapa, sin rótulo o sin bolsa',
    'Bolsas fuera del recipiente o en lugar de paso',
    'Carro sucio, roto o con corrientes mezcladas',
    'Faltan bolsas, descartadores o recipientes',
    'Manifiesto con errores o faltante',
    'Otra'
  ],
  // Tipos que siempre se consideran de residuos peligrosos, sea cual sea la corriente elegida
  TIPOS_PELIGROSOS: ['Residuo peligroso en la bolsa equivocada', 'Cortopunzante fuera del descartador', 'Bolsa roja o descartador sobrellenado o mal cerrado',
    'Medicamentos, ampollas o químicos mal descartados', 'Derrame o bolsa rota', 'Residuos peligrosos acumulados más del tiempo permitido', 'La empresa no retiró'],
  // Qué residuo es · [nombre, ¿peligroso?]
  CORRIENTES: [
    ['Biopatogénicos (bolsa roja)', true],
    ['Cortopunzantes', true],
    ['Medicamentos (Y3)', true],
    ['Ampollas y frascos ampolla (Y3)', true],
    ['Químicos peligrosos', true],
    ['Comunes (bolsa negra)', false],
    ['Reciclables o compostables', false],
    ['Especiales (pilas, aceite, RAEE)', false],
    ['Varias o no corresponde', false]
  ]
};

// ------------------------------------------------------------------ HOJA (en el libro de manifiestos del establecimiento)
function rnovLibro_(cod) {
  const E = est_(cod); if (!E || !E.libro) throw new Error('El establecimiento ' + cod + ' no tiene libro de residuos.');
  return SpreadsheetApp.openById(E.libro);
}
function rnovHoja_(cod) {
  const ss = rnovLibro_(cod); let sh = ss.getSheetByName(RNOV.HOJA); if (sh) return sh;
  const H = RNOV.H;
  sh = ss.insertSheet(RNOV.HOJA);
  sh.getRange(1, 1).setValue('Novedades de residuos').setFontSize(14).setFontWeight('bold').setFontColor('#0D313F');
  sh.getRange(2, 1).setValue('Lo que se ve mal en una recorrida. Se carga desde «Mi establecimiento» › 1 · Residuos › «Informar una novedad». No envía correos.').setFontStyle('italic').setFontColor('#4F616B');
  sh.getRange(3, 1).setValue('Si falla la aplicación: cargar desde la fila 6 con FECHA, SITIO, SECTOR, TIPO, CORRIENTE y DETALLE; el ID lo pone el sistema. ESTADO = Abierta hasta que se resuelva.').setFontColor('#4F616B');
  sh.getRange(5, 1, 1, H.length).setValues([H]).setFontWeight('bold').setFontColor('#FFFFFF').setBackground('#0D313F');
  sh.setFrozenRows(5);
  const col = k => H.indexOf(k) + 1, regla = vs => SpreadsheetApp.newDataValidation().requireValueInList(vs, true).setAllowInvalid(false).build();
  sh.getRange(6, col('TIPO'), 2000, 1).setDataValidation(regla(RNOV.TIPOS));
  sh.getRange(6, col('CORRIENTE'), 2000, 1).setDataValidation(regla(RNOV.CORRIENTES.map(c => c[0])));
  sh.getRange(6, col('PELIGROSA'), 2000, 1).setDataValidation(regla(['Sí', 'No']));
  sh.getRange(6, col('ESTADO'), 2000, 1).setDataValidation(regla(['Abierta', 'Resuelta']));
  sh.getRange(6, col('FECHA'), 2000, 1).setNumberFormat('dd/mm/yyyy');
  sh.getRange(6, col('RESUELTO'), 2000, 1).setNumberFormat('dd/mm/yyyy');
  sh.getRange(6, col('HORA'), 2000, 1).setNumberFormat('@');
  return sh;
}
const rnovTxt_ = (h, v) => v instanceof Date ? Utilities.formatDate(v, TZ, h === 'HORA' ? 'HH:mm' : h === 'CARGADO' ? 'yyyy-MM-dd HH:mm' : 'yyyy-MM-dd') : limpio_(v);
const rnovPeligrosa_ = (tipo, corr) => { const c = RNOV.CORRIENTES.find(z => z[0] === corr); return RNOV.TIPOS_PELIGROSOS.indexOf(tipo) >= 0 || !!(c && c[1]); };

// Lee todas las novedades del establecimiento. Las filas cargadas a mano sin ID reciben uno (y ESTADO = Abierta si falta).
function rnovLeer_(cod) {
  const sh = rnovHoja_(cod), H = RNOV.H, n = sh.getLastRow() - 5; if (n < 1) return [];
  const v = sh.getRange(6, 1, n, H.length).getValues(), out = [];
  v.forEach((r, i) => {
    const o = { fila: 6 + i }; H.forEach((h, j) => o[h] = rnovTxt_(h, r[j]));
    if (!o.ID && !o.TIPO && !o.DETALLE) return;
    if (!o.ID) { o.ID = 'RNOV-' + cod + '-M' + o.fila; sh.getRange(o.fila, 1).setValue(o.ID); }
    if (!o.ESTABLECIMIENTO) o.ESTABLECIMIENTO = cod;
    if (!o.ESTADO) { o.ESTADO = 'Abierta'; sh.getRange(o.fila, H.indexOf('ESTADO') + 1).setValue('Abierta'); }
    if (!o.PELIGROSA) o.PELIGROSA = rnovPeligrosa_(o.TIPO, o.CORRIENTE) ? 'Sí' : 'No';
    out.push(o);
  });
  return out;
}

// ------------------------------------------------------------------ GUARDAR, RESOLVER Y LISTAR
// x = { SITIO, SECTOR, TIPO, CORRIENTE, DETALLE, foto (dataURL, opcional) }
function rnovGuardar_(cod, x, quien) {
  const tipo = limpio_(x.TIPO); if (RNOV.TIPOS.indexOf(tipo) < 0) return { ok: false, mensaje: 'Elegí qué viste.' };
  const corr = limpio_(x.CORRIENTE); if (!RNOV.CORRIENTES.some(c => c[0] === corr)) return { ok: false, mensaje: 'Elegí qué residuo es.' };
  const sector = limpio_(x.SECTOR); if (!sector) return { ok: false, mensaje: 'Escribí el sector (dónde lo viste).' };
  const det = limpio_(x.DETALLE); if (det.length < 4) return { ok: false, mensaje: 'Contá brevemente qué viste.' };
  const sh = rnovHoja_(cod), filaNueva = Math.max(sh.getLastRow(), 5) + 1, ahora = new Date(), hora = Utilities.formatDate(ahora, TZ, 'HH:mm');
  const id = 'RNOV-' + cod + '-' + Utilities.formatDate(ahora, TZ, 'yyMMddHHmmss') + '-' + (filaNueva - 5);   // el número de fila evita IDs repetidos en el mismo segundo
  let foto = '';
  if (/^data:image\//.test(String(x.foto || ''))) {
    const E = est_(cod);
    try { foto = E && E.carpeta ? guardarFoto_(E.carpeta, RNOV.CARPETA, Utilities.formatDate(ahora, TZ, 'yyyy-MM'), Utilities.formatDate(ahora, TZ, 'dd.MM.yyyy HH.mm') + ' - ' + tipo.slice(0, 50), x.foto) : ''; }
    catch (e) { foto = ''; }
  }
  const o = { ID: id, FECHA: ahora, HORA: hora, ESTABLECIMIENTO: cod, SITIO: limpio_(x.SITIO) || cod, SECTOR: sector, TIPO: tipo, CORRIENTE: corr,
    PELIGROSA: rnovPeligrosa_(tipo, corr) ? 'Sí' : 'No', DETALLE: det, FOTO: foto, QUIEN: quien, ESTADO: 'Abierta', CARGADO: ahora };
  sh.getRange(filaNueva, 1, 1, RNOV.H.length).setValues([RNOV.H.map(h => o[h] == null ? '' : o[h])]);
  try { CacheService.getScriptCache().remove('rnov_avisos'); } catch (e) {}
  return { ok: true, id: id, peligrosa: o.PELIGROSA === 'Sí', conFoto: !!foto };
}
function rnovResolver_(cod, x, quien) {
  const id = limpio_(x.ID), n = rnovLeer_(cod).find(z => z.ID === id); if (!n) return { ok: false, mensaje: 'No encontré esa novedad.' };
  if (/^resuel/i.test(n.ESTADO)) return { ok: false, mensaje: 'Esa novedad ya estaba resuelta.' };
  const sh = rnovHoja_(cod), H = RNOV.H, set = (k, v) => sh.getRange(n.fila, H.indexOf(k) + 1).setValue(v);
  set('ESTADO', 'Resuelta'); set('RESUELTO', new Date()); set('RESUELTO_POR', quien); set('RESOLUCION', limpio_(x.RESOLUCION));
  try { CacheService.getScriptCache().remove('rnov_avisos'); } catch (e) {}
  return { ok: true };
}
// Abiertas: las de residuos peligrosos primero y, dentro de cada grupo, las más nuevas arriba
function rnovListar_(cod) {
  const N = rnovLeer_(cod).reverse(), limpiar = o => { const c = Object.assign({}, o); delete c.fila; return c; };
  const ab = N.filter(n => !/^resuel/i.test(n.ESTADO)), pel = ab.filter(n => n.PELIGROSA === 'Sí'), resto = ab.filter(n => n.PELIGROSA !== 'Sí');
  return { ok: true, abiertas: pel.concat(resto).map(limpiar), resueltas: N.filter(n => /^resuel/i.test(n.ESTADO)).slice(0, 30).map(limpiar),
    tipos: RNOV.TIPOS, corrientes: RNOV.CORRIENTES.map(c => c[0]) };
}

// ------------------------------------------------------------------ ENTRADA DESDE «MI ESTABLECIMIENTO» (acciones «m_res_nov…»)
// La llama Establecimiento.gs › miRed_. Además de la clave, controla que la persona tenga el módulo Residuos en este establecimiento.
function resNovRed_(d) {
  const cod = limpio_(d.est), x = d.datos || {};
  const acc = acceso_(d.est, d.clave, d.dni); if (!acc.ok) return acc;
  if (!acc.maestra && (acc.modulos || []).indexOf('Residuos') < 0) return { ok: false, error: 'permiso', mensaje: 'No tenés asignado el módulo de residuos. Consultá con Higiene y Seguridad.' };
  const quien = limpio_(acc.nombre) || limpio_(x.quien) || (x.persona ? quien_(x.persona) : '') || (acc.maestra ? 'Higiene y Seguridad' : 'Mi establecimiento');
  switch (d.accion) {
    case 'm_res_novedad': return conLock_(() => rnovGuardar_(cod, x, quien));
    case 'm_res_novedades': { const r = rnovListar_(cod); r.puedeResolver = true; return r; }
    case 'm_res_nov_resolver': return conLock_(() => rnovResolver_(cod, x, quien));
  }
  return { ok: false, error: 'Acción desconocida.' };
}

// ------------------------------------------------------------------ PARA EL PORTAL (se conecta en Portal.gs más adelante)
// Avisos para «Requiere atención»: novedades abiertas por establecimiento activo. Rojo si alguna es de residuos peligrosos.
function rnovAvisos_() {
  const ca = CacheService.getScriptCache(), c = ca.get('rnov_avisos'); if (c) return JSON.parse(c);
  const out = [];
  (listaActivos_() || []).forEach(e => {
    try {
      const ab = rnovLeer_(e.id).filter(n => !/^resuel/i.test(n.ESTADO)); if (!ab.length) return;
      const pel = ab.filter(n => n.PELIGROSA === 'Sí');
      out.push({ nivel: pel.length ? 'er' : 'wa', cod: e.id, sitio: 'Novedades de residuos', h: '#resnov',
        texto: ab.length + (ab.length > 1 ? ' novedades de residuos abiertas' : ' novedad de residuos abierta') + (pel.length ? ' (' + pel.length + ' de residuos peligrosos)' : '') + ': ' +
          ab.slice(0, 3).map(n => n.TIPO + ' · ' + n.SECTOR).join('; ') + (ab.length > 3 ? '…' : '') });
    } catch (err) { /* establecimiento sin libro: se saltea */ }
  });
  try { ca.put('rnov_avisos', JSON.stringify(out), 600); } catch (e) {}
  return out;
}
// ------------------------------------------------------------------ DESVÍOS DEL RECORRIDO (Star Union, HMH)
// Pedido de Belén (22/10/2026): que en «Novedades de residuos» aparezca también lo que registran los operarios de Star Union en el
// recorrido de retiro del HMH (planilla «DESVÍOS RESIDUOS HMH · Registro (v0)», hoja REGISTROS). Se leen desde acá, sin copiarlos.
// Abierto = sin revisar por HyS (REVISADO_POR y FECHA_REVISION vacíos). «Resuelta» escribe REVISADO_POR, FECHA_REVISION y OBS_HYS en esa planilla.
const RDESV = { LIBRO: '14bK84HUpTXXGcBBQ737SUScFWHOykUh9V50VTpiVCXw', HOJA: 'REGISTROS', EST: 'HMH' };
function rdesvLeer_() {
  const sh = SpreadsheetApp.openById(RDESV.LIBRO).getSheetByName(RDESV.HOJA); if (!sh || sh.getLastRow() < 2) return { sh: sh, H: [], L: [] };
  const v = sh.getDataRange().getValues(), H = v.shift().map(h => String(h).trim()), L = [];
  v.forEach((r, i) => {
    const o = {}; H.forEach((h, j) => o[h] = r[j]); if (!o.ID) return;
    const t = h => o[h] instanceof Date ? o[h] : limpio_(o[h]), fc = o.FECHA_CARGA instanceof Date ? o.FECHA_CARGA : null;
    const resid = limpio_(o.TIPO_RESIDUO), tipos = limpio_(o.TIPOS_DESVIO);
    const pel = /biopat|cortopun|químic|quimic|medicam|ampoll/i.test(resid) || /cortopun/i.test(tipos) || o.LESION === 'Sí';
    const revisado = limpio_(o.REVISADO_POR) || (o.FECHA_REVISION instanceof Date || limpio_(o.FECHA_REVISION));
    const det = [limpio_(o.DESCRIPCION), o.CAUSA ? 'Por qué: ' + limpio_(o.CAUSA) + (o.CONTENEDORES ? ' (' + limpio_(o.CONTENEDORES) + ')' : '') : '',
      o.AISLAMIENTO ? '¿Aislamiento?: ' + limpio_(o.AISLAMIENTO) : '', o.LESION === 'Sí' ? 'LESIÓN: ' + limpio_(o.DETALLE_LESION) : ''].filter(Boolean).join(' · ');
    L.push({ fila: i + 2, ID: limpio_(o.ID), ORIGEN: 'Recorrido Star Union',
      FECHA: fc ? Utilities.formatDate(fc, TZ, 'yyyy-MM-dd') : limpio_(o.FECHA_OBSERVACION), HORA: limpio_(o.HORA),
      ESTABLECIMIENTO: RDESV.EST, SITIO: RDESV.EST,
      SECTOR: [o.PISO, o.SERVICIO, o.UBICACION].map(limpio_).filter(Boolean).join(' · ') + (limpio_(o.DETALLE_UBICACION) && limpio_(o.DETALLE_UBICACION) !== 's/d' ? ' · ' + limpio_(o.DETALLE_UBICACION) : ''),
      TIPO: tipos, CORRIENTE: resid, PELIGROSA: pel ? 'Sí' : 'No', DETALLE: det,
      FOTO: (String(o.FOTOS || '').match(/https?:\/\/[^,\s]+/) || [''])[0], QUIEN: limpio_(o.OPERARIO) + (o.INFORMANTE ? ' (' + limpio_(o.INFORMANTE) + ')' : ''),
      ESTADO: revisado ? 'Resuelta' : 'Abierta', RESUELTO: o.FECHA_REVISION instanceof Date ? Utilities.formatDate(o.FECHA_REVISION, TZ, 'yyyy-MM-dd') : limpio_(o.FECHA_REVISION),
      RESUELTO_POR: limpio_(o.REVISADO_POR), RESOLUCION: [limpio_(o.ORIGEN_HYS), limpio_(o.ACCION_INDIVIDUAL), limpio_(o.OBS_HYS)].filter(Boolean).join(' · ') });
  });
  return { sh: sh, H: H, L: L };
}
function rdesvResolver_(x, quien) {
  const D = rdesvLeer_(), n = D.L.find(z => z.ID === limpio_(x.ID)); if (!n) return { ok: false, mensaje: 'No encontré ese desvío.' };
  if (n.ESTADO === 'Resuelta') return { ok: false, mensaje: 'Ese desvío ya estaba revisado.' };
  const set = (k, v) => { const j = D.H.indexOf(k); if (j >= 0) D.sh.getRange(n.fila, j + 1).setValue(v); };
  set('REVISADO_POR', quien); set('FECHA_REVISION', new Date());
  const res = limpio_(x.RESOLUCION); if (res) { const j = D.H.indexOf('OBS_HYS'), prev = j >= 0 ? limpio_(D.sh.getRange(n.fila, j + 1).getValue()) : ''; set('OBS_HYS', prev ? prev + ' · ' + res : res); }
  return { ok: true };
}

function rnovPortal_(accion, x, quien) {
  if (accion === 'p_resnov_listar') {
    const cods = x.cod ? [limpio_(x.cod)] : (listaActivos_() || []).map(e => e.id), abiertas = [], resueltas = [];
    cods.forEach(c => { try { const r = rnovListar_(c); r.abiertas.forEach(n => abiertas.push(n)); r.resueltas.forEach(n => resueltas.push(n)); } catch (e) {} });
    let errDesv = '';
    if (cods.indexOf(RDESV.EST) >= 0) {
      try { const L = rdesvLeer_().L.reverse().map(n => { const c = Object.assign({}, n); delete c.fila; return c; });
        L.filter(n => n.ESTADO !== 'Resuelta').forEach(n => abiertas.push(n)); L.filter(n => n.ESTADO === 'Resuelta').slice(0, 30).forEach(n => resueltas.push(n)); }
      catch (e) { errDesv = 'No se pudieron leer los desvíos del recorrido: ' + (e.message || e); }
    }
    // Primero lo de residuos peligrosos y, dentro de cada grupo, lo más nuevo arriba
    const orden = (a, b) => (b.PELIGROSA === 'Sí') - (a.PELIGROSA === 'Sí') || String(b.FECHA + ' ' + b.HORA).localeCompare(String(a.FECHA + ' ' + a.HORA));
    abiertas.sort(orden); resueltas.sort((a, b) => String(b.RESUELTO || b.FECHA).localeCompare(String(a.RESUELTO || a.FECHA)));
    return { ok: true, abiertas: abiertas, resueltas: resueltas.slice(0, 60), aviso: errDesv, tipos: RNOV.TIPOS, corrientes: RNOV.CORRIENTES.map(c => c[0]) };
  }
  if (accion === 'p_resnov_resolver') {
    if (/^DR-/.test(limpio_(x.ID))) return conLock_(() => rdesvResolver_(x, quien || 'Belén Pellegrini (portal)'));
    return conLock_(() => rnovResolver_(limpio_(x.cod), x, quien || 'Belén Pellegrini (portal)'));
  }
  return null;
}

// ------------------------------------------------------------------ INSTALACIÓN (ejecutar una vez desde el editor; no envía nada)
function prepararNovedadesResiduos() {
  const hechos = [], fallas = [];
  (listaActivos_() || []).forEach(e => { try { rnovHoja_(e.id); hechos.push(e.id); } catch (err) { fallas.push(e.id + ': ' + (err.message || err)); } });
  Logger.log('Hoja ' + RNOV.HOJA + ' lista en: ' + (hechos.join(', ') || 'ninguno') + (fallas.length ? '\nNo se pudo en: ' + fallas.join(' · ') : ''));
}
