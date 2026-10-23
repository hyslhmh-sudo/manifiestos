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
 *
 * CAMBIO 23/10/2026 · Catálogo único (pedido de Belén):
 *  · «¿Qué viste?» sale de la planilla «DESVÍOS RESIDUOS HMH · Registro (v0)» › TIPOS_DESVIO, la misma lista que usan los
 *    operarios de Star Union. Se agrega o se cambia una opción en esa hoja, sin tocar el código.
 *  · Se pueden marcar varias opciones: quedan en TIPO separadas por «; ».
 *  · GRAVEDAD viene precargada por opción (columna GRAVEDAD de TIPOS_DESVIO); con varias, vale la más alta. Solo la cambia HyS.
 *    «Otro» no tiene gravedad: queda «s/d» hasta que HyS la asigne. Columna nueva GRAVEDAD al final de NOVEDADES_RES (se agrega sola).
 *  · Si la planilla del catálogo no se puede leer, se usa la lista anterior (RNOV.TIPOS) para no frenar la carga.
 */
const RNOV = {
  HOJA: 'NOVEDADES_RES',
  CARPETA: 'Novedades de residuos',
  H: ['ID', 'FECHA', 'HORA', 'ESTABLECIMIENTO', 'SITIO', 'SECTOR', 'TIPO', 'CORRIENTE', 'PELIGROSA', 'DETALLE', 'FOTO', 'QUIEN', 'ESTADO', 'RESUELTO', 'RESUELTO_POR', 'RESOLUCION', 'CARGADO', 'GRAVEDAD'],
  GRAV: ['Baja', 'Media', 'Alta', 'Crítica'],
  // Catálogo único: planilla de desvíos › TIPOS_DESVIO (columnas TIPO, CATEGORIA, GRAVEDAD, AYUDA)
  CAT_LIBRO: '14bK84HUpTXXGcBBQ737SUScFWHOykUh9V50VTpiVCXw', CAT_HOJA: 'TIPOS_DESVIO',
  // Opciones que siempre son de residuos peligrosos, sea cual sea la corriente elegida (catálogo desde el 23/10/2026)
  CAT_PELIGROSOS: ['Residuo peligroso en bolsa común o reciclable', 'Cortopunzante fuera del descartador', 'Químico o citostático mezclado con otras corrientes',
    'Descartador lleno, abierto o mal ubicado', 'Acopio por más tiempo del permitido', 'Corrientes mezcladas en el depósito', 'La empresa no retiró el día pactado',
    'Retiro sin entrega de manifiesto', 'Faltan descartadores', 'Derrame de químico o citostático', 'Lesión o exposición de una persona'],
  // Lista anterior (hasta el 22/10/2026): respaldo si no se puede leer el catálogo, y para leer las novedades viejas
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
// ------------------------------------------------------------------ CATÁLOGO ÚNICO (TIPOS_DESVIO)
// Devuelve [{ tipo, categoria, gravedad, ayuda }] en el orden de la hoja. Guarda 10 minutos en caché.
function rnovCatalogo_() {
  const ca = CacheService.getScriptCache(), c = ca.get('rnov_cat'); if (c) return JSON.parse(c);
  let L = [];
  try {
    const v = SpreadsheetApp.openById(RNOV.CAT_LIBRO).getSheetByName(RNOV.CAT_HOJA).getDataRange().getValues(), H = v.shift().map(h => String(h).trim());
    const j = k => H.indexOf(k);
    L = v.filter(r => limpio_(r[j('TIPO')])).map(r => ({ tipo: limpio_(r[j('TIPO')]), categoria: j('CATEGORIA') >= 0 ? limpio_(r[j('CATEGORIA')]) : '',
      gravedad: j('GRAVEDAD') >= 0 && RNOV.GRAV.indexOf(limpio_(r[j('GRAVEDAD')])) >= 0 ? limpio_(r[j('GRAVEDAD')]) : '', ayuda: j('AYUDA') >= 0 ? limpio_(r[j('AYUDA')]) : '' }));
  } catch (e) { L = []; }
  if (!L.length) L = RNOV.TIPOS.map(t => ({ tipo: t, categoria: '', gravedad: '', ayuda: '' }));   // respaldo: lista anterior
  try { ca.put('rnov_cat', JSON.stringify(L), 600); } catch (e) {}
  return L;
}
const rnovTiposDe_ = t => String(t || '').split(';').map(s => s.trim()).filter(Boolean);
// Gravedad precargada: la más alta de las opciones marcadas («s/d» si ninguna tiene, p. ej. «Otro»)
function rnovGravedad_(tipos, cat) {
  cat = cat || rnovCatalogo_(); let g = -1;
  tipos.forEach(t => { const c = cat.find(z => z.tipo === t); if (c && c.gravedad) g = Math.max(g, RNOV.GRAV.indexOf(c.gravedad)); });
  return g >= 0 ? RNOV.GRAV[g] : 's/d';
}

// Hojas creadas antes del 23/10/2026: agrega la columna GRAVEDAD y saca la lista desplegable de TIPO (ahora admite varias opciones)
function rnovActualizarHoja_(sh) {
  const H = RNOV.H, ult = Math.max(sh.getLastColumn(), 1), enc = sh.getRange(5, 1, 1, ult).getValues()[0].map(h => String(h).trim());
  if (enc.indexOf('GRAVEDAD') >= 0) return sh;
  const col = H.indexOf('GRAVEDAD') + 1;
  sh.getRange(5, col).setValue('GRAVEDAD').setFontWeight('bold').setFontColor('#FFFFFF').setBackground('#0D313F');
  sh.getRange(6, H.indexOf('TIPO') + 1, 2000, 1).clearDataValidations();
  sh.getRange(6, col, 2000, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(RNOV.GRAV.concat(['s/d']), true).setAllowInvalid(false).build());
  return sh;
}

function rnovHoja_(cod) {
  const ss = rnovLibro_(cod); let sh = ss.getSheetByName(RNOV.HOJA); if (sh) return rnovActualizarHoja_(sh);
  const H = RNOV.H;
  sh = ss.insertSheet(RNOV.HOJA);
  sh.getRange(1, 1).setValue('Novedades de residuos').setFontSize(14).setFontWeight('bold').setFontColor('#0D313F');
  sh.getRange(2, 1).setValue('Lo que se ve mal en una recorrida. Se carga desde «Mi establecimiento» › 1 · Residuos › «Informar una novedad». No envía correos.').setFontStyle('italic').setFontColor('#4F616B');
  sh.getRange(3, 1).setValue('Si falla la aplicación: cargar desde la fila 6 con FECHA, SITIO, SECTOR, TIPO (una o varias opciones de la planilla de desvíos › TIPOS_DESVIO, separadas por «; »), CORRIENTE y DETALLE; el ID y la GRAVEDAD los pone el sistema. ESTADO = Abierta hasta que se resuelva.').setFontColor('#4F616B');
  sh.getRange(5, 1, 1, H.length).setValues([H]).setFontWeight('bold').setFontColor('#FFFFFF').setBackground('#0D313F');
  sh.setFrozenRows(5);
  const col = k => H.indexOf(k) + 1, regla = vs => SpreadsheetApp.newDataValidation().requireValueInList(vs, true).setAllowInvalid(false).build();
  sh.getRange(6, col('CORRIENTE'), 2000, 1).setDataValidation(regla(RNOV.CORRIENTES.map(c => c[0])));
  sh.getRange(6, col('GRAVEDAD'), 2000, 1).setDataValidation(regla(RNOV.GRAV.concat(['s/d'])));
  sh.getRange(6, col('PELIGROSA'), 2000, 1).setDataValidation(regla(['Sí', 'No']));
  sh.getRange(6, col('ESTADO'), 2000, 1).setDataValidation(regla(['Abierta', 'Resuelta']));
  sh.getRange(6, col('FECHA'), 2000, 1).setNumberFormat('dd/mm/yyyy');
  sh.getRange(6, col('RESUELTO'), 2000, 1).setNumberFormat('dd/mm/yyyy');
  sh.getRange(6, col('HORA'), 2000, 1).setNumberFormat('@');
  return sh;
}
const rnovTxt_ = (h, v) => v instanceof Date ? Utilities.formatDate(v, TZ, h === 'HORA' ? 'HH:mm' : h === 'CARGADO' ? 'yyyy-MM-dd HH:mm' : 'yyyy-MM-dd') : limpio_(v);
// Peligrosa si alguna de las opciones marcadas es de residuos peligrosos (catálogo nuevo o lista anterior) o si la corriente lo es
const rnovPeligrosa_ = (tipo, corr) => { const c = RNOV.CORRIENTES.find(z => z[0] === corr);
  return rnovTiposDe_(tipo).some(t => RNOV.CAT_PELIGROSOS.indexOf(t) >= 0 || RNOV.TIPOS_PELIGROSOS.indexOf(t) >= 0) || !!(c && c[1]); };
// Orden de las listas: primero lo de residuos peligrosos, después la gravedad más alta y, al final, lo más nuevo arriba
const rnovOrden_ = (a, b) => (b.PELIGROSA === 'Sí') - (a.PELIGROSA === 'Sí') || RNOV.GRAV.indexOf(b.GRAVEDAD) - RNOV.GRAV.indexOf(a.GRAVEDAD) ||
  String(b.FECHA + ' ' + b.HORA).localeCompare(String(a.FECHA + ' ' + a.HORA));

// Lee todas las novedades del establecimiento. Las filas cargadas a mano sin ID reciben uno (y ESTADO = Abierta si falta).
function rnovLeer_(cod) {
  const sh = rnovHoja_(cod), H = RNOV.H, n = sh.getLastRow() - 5; if (n < 1) return [];
  const v = sh.getRange(6, 1, n, H.length).getValues(), out = [], cat = rnovCatalogo_();
  v.forEach((r, i) => {
    const o = { fila: 6 + i }; H.forEach((h, j) => o[h] = rnovTxt_(h, r[j]));
    if (!o.ID && !o.TIPO && !o.DETALLE) return;
    if (!o.ID) { o.ID = 'RNOV-' + cod + '-M' + o.fila; sh.getRange(o.fila, 1).setValue(o.ID); }
    if (!o.ESTABLECIMIENTO) o.ESTABLECIMIENTO = cod;
    if (!o.ESTADO) { o.ESTADO = 'Abierta'; sh.getRange(o.fila, H.indexOf('ESTADO') + 1).setValue('Abierta'); }
    if (!o.PELIGROSA) o.PELIGROSA = rnovPeligrosa_(o.TIPO, o.CORRIENTE) ? 'Sí' : 'No';
    if (!o.GRAVEDAD) o.GRAVEDAD = rnovGravedad_(rnovTiposDe_(o.TIPO), cat);   // filas viejas o cargadas a mano: solo se muestra, no se escribe
    out.push(o);
  });
  return out;
}

// ------------------------------------------------------------------ GUARDAR, RESOLVER Y LISTAR
// x = { SITIO, SECTOR, TIPOS (lista; o TIPO de texto, separado por «;»), CORRIENTE, DETALLE, foto (dataURL, opcional) }
function rnovGuardar_(cod, x, quien) {
  const cat = rnovCatalogo_(), tipos = (Array.isArray(x.TIPOS) ? x.TIPOS.map(limpio_) : rnovTiposDe_(x.TIPO)).filter((t, i, a) => t && a.indexOf(t) === i);
  if (!tipos.length) return { ok: false, mensaje: 'Elegí qué viste (podés marcar varias).' };
  // Se aceptan también las opciones de la lista anterior, para que la página vieja siga cargando hasta que se actualice index.html
  const fuera = tipos.filter(t => !cat.some(c => c.tipo === t) && RNOV.TIPOS.indexOf(t) < 0); if (fuera.length) return { ok: false, mensaje: 'Esta opción ya no está en la lista: ' + fuera.join(', ') + '. Actualizá la página y elegí de nuevo.' };
  const tipo = tipos.join('; '), gravedad = rnovGravedad_(tipos, cat);
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
    PELIGROSA: rnovPeligrosa_(tipo, corr) ? 'Sí' : 'No', DETALLE: det, FOTO: foto, QUIEN: quien, ESTADO: 'Abierta', CARGADO: ahora, GRAVEDAD: gravedad };
  sh.getRange(filaNueva, 1, 1, RNOV.H.length).setValues([RNOV.H.map(h => o[h] == null ? '' : o[h])]);
  try { CacheService.getScriptCache().remove('rnov_avisos'); } catch (e) {}
  return { ok: true, id: id, peligrosa: o.PELIGROSA === 'Sí', conFoto: !!foto, gravedad: gravedad, lesion: tipos.indexOf('Lesión o exposición de una persona') >= 0 };
}
function rnovResolver_(cod, x, quien) {
  const id = limpio_(x.ID), n = rnovLeer_(cod).find(z => z.ID === id); if (!n) return { ok: false, mensaje: 'No encontré esa novedad.' };
  if (/^resuel/i.test(n.ESTADO)) return { ok: false, mensaje: 'Esa novedad ya estaba resuelta.' };
  const sh = rnovHoja_(cod), H = RNOV.H, set = (k, v) => sh.getRange(n.fila, H.indexOf(k) + 1).setValue(v);
  set('ESTADO', 'Resuelta'); set('RESUELTO', new Date()); set('RESUELTO_POR', quien); set('RESOLUCION', limpio_(x.RESOLUCION));
  try { CacheService.getScriptCache().remove('rnov_avisos'); } catch (e) {}
  return { ok: true };
}
// Abiertas: primero las de residuos peligrosos, después la gravedad más alta y, dentro de cada grupo, las más nuevas arriba.
// catalogo = [{ tipo, categoria, gravedad, ayuda }] para armar «¿Qué viste?» en la página.
function rnovListar_(cod) {
  const N = rnovLeer_(cod).reverse(), limpiar = o => { const c = Object.assign({}, o); delete c.fila; return c; }, cat = rnovCatalogo_();
  const ab = N.filter(n => !/^resuel/i.test(n.ESTADO)).sort(rnovOrden_);
  return { ok: true, abiertas: ab.map(limpiar), resueltas: N.filter(n => /^resuel/i.test(n.ESTADO)).slice(0, 30).map(limpiar),
    tipos: cat.map(c => c.tipo), catalogo: cat, corrientes: RNOV.CORRIENTES.map(c => c[0]) };
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
    const revisado = /^Cerrado/.test(limpio_(o.ESTADO_GESTION));   // estado de «Desvíos: acciones y seguimiento» (DesviosAcciones.gs)
    const det = [limpio_(o.DESCRIPCION), o.CAUSA ? 'Por qué: ' + limpio_(o.CAUSA) + (o.CONTENEDORES ? ' (' + limpio_(o.CONTENEDORES) + ')' : '') : '',
      o.AISLAMIENTO ? '¿Aislamiento?: ' + limpio_(o.AISLAMIENTO) : '', o.LESION === 'Sí' ? 'LESIÓN: ' + limpio_(o.DETALLE_LESION) : ''].filter(Boolean).join(' · ');
    L.push({ fila: i + 2, ID: limpio_(o.ID), ORIGEN: 'Recorrido Star Union',
      FECHA: fc ? Utilities.formatDate(fc, TZ, 'yyyy-MM-dd') : limpio_(o.FECHA_OBSERVACION), HORA: limpio_(o.HORA),
      ESTABLECIMIENTO: RDESV.EST, SITIO: RDESV.EST,
      SECTOR: [o.PISO, o.SERVICIO, o.UBICACION].map(limpio_).filter(Boolean).join(' · ') + (limpio_(o.DETALLE_UBICACION) && limpio_(o.DETALLE_UBICACION) !== 's/d' ? ' · ' + limpio_(o.DETALLE_UBICACION) : ''),
      TIPO: tipos, CORRIENTE: resid, PELIGROSA: pel ? 'Sí' : 'No', DETALLE: det,
      GRAVEDAD: limpio_(o.GRAVEDAD_HYS) || limpio_(o.GRAVEDAD_REGLA) || (limpio_(o.GRAVEDAD_INFORMANTE) !== 's/d' ? limpio_(o.GRAVEDAD_INFORMANTE) : '') || 's/d',
      FOTO: (String(o.FOTOS || '').match(/https?:\/\/[^,\s]+/) || [''])[0], QUIEN: limpio_(o.OPERARIO) + (o.INFORMANTE ? ' (' + limpio_(o.INFORMANTE) + ')' : ''),
      ESTADO: revisado ? 'Resuelta' : 'Abierta', GESTION: limpio_(o.ESTADO_GESTION) || 'Sin acción', RESUELTO: '', RESUELTO_POR: '',
      RESOLUCION: [limpio_(o.ESTADO_GESTION), limpio_(o.ULTIMO_SEGUIMIENTO)].filter(Boolean).join(' · ') });
  });
  return { sh: sh, H: H, L: L };
}
// «Resuelta» sobre un desvío = verificación de HyS «Corregido» (lo cierra en «Desvíos: acciones y seguimiento»)
function rdesvResolver_(x, quien) {
  if (typeof dacSeguimiento_ !== 'function') return { ok: false, mensaje: 'Falta instalar DesviosAcciones.gs.' };
  return dacSeguimiento_({ ids: [limpio_(x.ID)], resultado: 'Corregido', obs: limpio_(x.RESOLUCION) }, quien, 'HyS');
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
    // Primero lo de residuos peligrosos, después la gravedad más alta y, dentro de cada grupo, lo más nuevo arriba
    abiertas.sort(rnovOrden_); resueltas.sort((a, b) => String(b.RESUELTO || b.FECHA).localeCompare(String(a.RESUELTO || a.FECHA)));
    const cat = rnovCatalogo_();
    return { ok: true, abiertas: abiertas, resueltas: resueltas.slice(0, 60), aviso: errDesv, tipos: cat.map(c => c.tipo), catalogo: cat, corrientes: RNOV.CORRIENTES.map(c => c[0]) };
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
