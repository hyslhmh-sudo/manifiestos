/**
 * SISTEMA HyS · 2 · AGUA · MUESTREOS DE LABORATORIO (28/10/2026, pedido de Belén)
 * aguaLab_()          lee el libro «Agua · Tablero de análisis de laboratorio (v0)» (hojas «Tablero Trelew» y «Tablero Rawson»,
 *                     datos desde la fila 9) y devuelve, por establecimiento: último muestreo, último bacteriológico y físico-químico,
 *                     próximo parcial y completo, qué solicitar, fecha límite, aviso y las canillas del último muestreo.
 * aguaLabAcciones_()  pasa los avisos («Urgente», «Vencido · pedir ya», «Pedir ahora») a las acciones abiertas del tablero.
 * Lo usa p_tablero (Tablero.gs) y lo muestra el portal en 2 · Agua › «Muestreos de laboratorio: qué pedir y cuándo».
 *
 * La regla vive en las fórmulas del libro, así se cambia desde Sheets sin tocar el código:
 *   · Parcial (cada 6 meses, celda B2): solo bacteriológico, en las mismas canillas del último muestreo.
 *   · Completo (cada 12 meses, celda D3): bacteriológico + físico-químico, PREVIA limpieza y desinfección de tanques y cisternas,
 *     en la salida del tanque y la canilla más alejada además de las canillas de siempre.
 *   · Si en el último muestreo hubo una muestra NO APTA (toda la red, 03/11/2026): repetir la limpieza de tanques y cisternas,
 *     limpiar y desinfectar las griferías afectadas y nuevo muestreo completo en 15 días hábiles.
 *   · Avisa 30 días antes del parcial (F3) y 45 antes del completo (H3), para dar tiempo a la limpieza.
 * Normativa: Dto. 351/79 art. 57 (bacteriológico semestral y físico-químico anual); POE DPSB «Toma de muestra y gestión de
 *   resultados» 10.1 (demanda programada cada 6 meses) y 10.7 (15 días hábiles); POE DPSB «Limpieza y desinfección de tanques»
 *   10.4.e (muestra post limpieza); Nota DPSB 34/26 (no se toman muestras sin limpieza previa de tanques y cisternas).
 * Red Trelew y red Rawson van separadas. El grupo «Otros» (fuera de la red de salud) se muestra pero no genera avisos.
 * 02/11/2026 · Pedido al DPSB con el formulario ya completo:
 *   aguaLab_() suma, por establecimiento, las columnas V (Institución), W (Dirección), X (Localidad) e Y (Tipo de agua) del Tablero
 *   de cada red y los datos fijos del remitente de la pestaña «Formulario DPSB» (CUIT, responsable, contacto, correo, quién solicita).
 *   El portal arma con eso el enlace al formulario oficial del DPSB (no se modifica el formulario: solo se abre completo; el envío
 *   lo hace HyS) y llama a aguaLabSolicitar_() (acción p_agl_solicitar), que anota la fecha en la columna U «Solicitado el».
 * 02/11/2026 · Aviso al establecimiento: aguaLabAviso_() (acción p_agl_aviso) deja un BORRADOR en Gmail (no lo envía) para el correo
 *   de la columna Z del Tablero, con copia al Área Externa si es un CAPS de la red Trelew. Asunto, texto, copia y firma se cambian en
 *   la pestaña «Formulario DPSB». Si los tanques del sitio (columna AA) se limpiaron dentro del plazo, {limpieza} agrega la fecha y
 *   quiénes la hicieron (AGUA_LIMPIEZAS › CARGO). Sale desde belenpellegrini.hys@gmail.com si Gmail lo tiene en «Enviar como».
 * 02/11/2026 · Tanques: columna AA del Tablero = sitio de BASE COMÚN › RESERVORIOS. Por establecimiento se informa cuántos
 *   tanques y cisternas en uso hay y cuántos se limpiaron en los últimos N días («Días de validez de la limpieza (completo)»,
 *   pestaña «Formulario DPSB»), para mostrar en el portal «Tanques limpios · listo para pedir el muestreo completo».
 *   El aviso «Solicitado el …» lo calcula la columna R del libro (fórmula) con la columna U.
 * No envía correos.
 */
const AGUA_LAB_ID = '1Bd4K-7mfSEiZTRIHrH02GXqr_WdzuEXr7Yh2BZQddIM';   // Drive › MÓDULO 3 · AGUA › INFORMES DE LABORATORIO · Agua

function aguaLab_() {
  const ss = SpreadsheetApp.openById(AGUA_LAB_ID), out = [], rem = aguaLabRemitente_(ss);
  let RES = []; try { if (typeof miLeer_ === 'function') RES = aguaLabRes_(); } catch (e) {}
  const dias = Number(rem.diasLimpieza) || 30, desde = Utilities.formatDate(new Date(Date.now() - dias * 864e5), TZ, 'yyyy-MM-dd');
  const f = x => x instanceof Date ? Utilities.formatDate(x, TZ, 'yyyy-MM-dd') : String(x == null ? '' : x).trim();
  const REG = aguaLabRegistros_(ss);   // 03/11/2026: resultado de cada muestra (pestañas «Registro Trelew» y «Registro Rawson»)
  [['Tablero Trelew', 'Trelew'], ['Tablero Rawson', 'Rawson']].forEach(([hoja, red]) => {
    const sh = ss.getSheetByName(hoja); if (!sh) return;
    const n = sh.getLastRow() - 8; if (n < 1) return;
    sh.getRange(9, 1, n, Math.min(27, sh.getMaxColumns())).getValues().forEach(r => {
      const lugar = f(r[1]); if (!lugar) return;
      out.push({ red: red, grupo: f(r[0]), lugar: lugar, cod: red === 'Rawson' ? 'HSST' : /^HMH/.test(lugar) ? 'HMH' : 'HZT',
        ultimo: f(r[2]), muestras: Number(r[3]) || 0, noAptas: Number(r[4]) || 0, sinConclusion: Number(r[5]) || 0, estado: f(r[7]),
        bact: f(r[11]), fq: f(r[12]), parcial: f(r[13]), completo: f(r[14]), que: f(r[15]), limite: f(r[16]), aviso: f(r[17]),
        desde: f(r[18]), canillas: f(r[19]), solicitado: aguaLabIso_(r[20]),
        form: { institucion: f(r[21]), direccion: f(r[22]), localidad: f(r[23]), tipoAgua: f(r[24]) }, correo: /@/.test(f(r[25])) ? f(r[25]) : '', rem: rem });
      // tanques y cisternas en uso del sitio (columna AA) y cuántos están limpios dentro del plazo
      { const y = out[out.length - 1], sitio = f(r[26]);
        // 03/11/2026 (Belén: «no me salen los resultados»): si el último muestreo dio NO APTA, solo cuenta como limpio el tanque
        // limpiado DESPUÉS de ese muestreo (una limpieza anterior no corrige el resultado).
        const ultM = aguaLabIso_(r[2]), tras = y.noAptas > 0 ? ultM : '';
        if (sitio) { const T = aguaLabTanques_(RES, y.cod, sitio), fs = T.map(t => String(t.ULTIMA_LIMPIEZA || '').slice(0, 10)).filter(v => /^\d{4}-/.test(v)).sort();
          y.tanques = { n: T.length, limpios: T.filter(t => { const u = String(t.ULTIMA_LIMPIEZA || '').slice(0, 10); return /^\d{4}-/.test(u) && u >= desde && (!tras || u > tras); }).length, ultima: fs.length ? fs[fs.length - 1] : '', primera: fs.length ? fs[0] : '', dias: dias,
            antesNoApta: !!(tras && fs.length && fs[fs.length - 1] <= tras),
            // 10/11/2026: tanques cuya limpieza no hace HyS (p. ej. Internación de Salud Mental: la hace Mantenimiento del lugar)
            ajenos: T.filter(t => AGUA_LAB_AJENO.test(String(t.QUIEN_LIMPIA || ''))).length,
            quien: Array.from(new Set(T.map(t => String(t.QUIEN_LIMPIA || '').trim()).filter(q => q && !/^s\/d/i.test(q)))).join(' · ') }; }
        y.res = (REG[red + '|' + lugar] || []).filter(m => m.fecha === ultM); }
      // 02/11/2026: «Solicitado el» (columna U, la completa HyS al pedir el muestreo). Si es posterior al último muestreo,
      // el pedido ya está hecho: el aviso pasa a «Solicitado el …» y deja de figurar como acción abierta.
      const x = out[out.length - 1], ult = aguaLabIso_(r[2]);
      if (x.solicitado && (!ult || x.solicitado > ult) && /urgente|vencido|pedir/i.test(x.aviso)) x.aviso = 'Solicitado el ' + x.solicitado.split('-').reverse().join('/') + ' · esperando el resultado';
      else if (/^Solicitado el/i.test(x.aviso) && !/esperando/.test(x.aviso)) x.aviso += ' · esperando el resultado';
    });
  });
  return out;
}

// Resultado de cada muestra, por red y establecimiento: { 'Trelew|CAPS La Loma': [{ nro, fecha, donde, analisis, resultado, detalle, url }] }
function aguaLabRegistros_(ss) {
  const o = {};
  [['Registro Trelew', 'Trelew'], ['Registro Rawson', 'Rawson']].forEach(([hoja, red]) => {
    const sh = ss.getSheetByName(hoja); if (!sh || sh.getLastRow() < 2) return;
    const rg = sh.getRange(2, 1, sh.getLastRow() - 1, Math.min(16, sh.getMaxColumns())), V = rg.getDisplayValues(), F = rg.getFormulas();
    V.forEach((r, i) => { const est = String(r[2]).trim(); if (!est || !String(r[3]).trim()) return;
      const m = /HYPERLINK\("([^"]+)"/i.exec(F[i][12] || '');
      (o[red + '|' + est] = o[red + '|' + est] || []).push({ nro: String(r[3]).trim(), fecha: aguaLabIso_(r[4]), donde: String(r[5]).trim() || 's/d', analisis: String(r[6]).trim() || 's/d',
        resultado: String(r[9]).trim() || 's/d', detalle: String(r[10]).trim(), url: m ? m[1] : '', recibido: aguaLabIso_(r[15]) }); });   // P: «Resultado cargado el»
  });
  return o;
}

// 10/11/2026 (Belén: «separalos»): en la Sede ex ADOS cada lugar tiene sus propios tanques. La columna AA del Tablero acepta
// «SITIO|LUGAR_MIPYV» (ej. «Sede ex ADOS|PROS»): toma solo los tanques de ese sitio con ese LUGAR_MIPYV (columna R de BASE COMÚN ›
// RESERVORIOS). Sin «|» toma todos los tanques del sitio, como antes. Se excluyen los tanques «Fuera de uso» o de «Baja»
// (antes también quedaban afuera los «Fuera del alcance de MIPyV», como los de Internación de Salud Mental; ahora se cuentan y,
// si QUIEN_LIMPIA dice «No corresponde a HySL…», el portal los muestra como limpieza a cargo de otro).
const AGUA_LAB_AJENO = /no corresponde/i;   // ej. «No corresponde a HySL (mantenimiento del lugar)»; «Empresa de mantenimiento» (HMH) sí cuenta como limpieza registrada por HyS
function aguaLabRes_() {
  const RES = miLeer_('RESERVORIOS');
  try {   // LUGAR_MIPYV no está en MI_H (lo agrega la app MIP en la columna R): se lee aparte, por fila
    const sh = miHoja_('RESERVORIOS'), H = sh.getRange(5, 1, 1, sh.getLastColumn()).getValues()[0].map(h => String(h).trim()), j = H.indexOf('LUGAR_MIPYV');
    if (j >= 0 && sh.getLastRow() > 0) { const v = sh.getRange(1, j + 1, sh.getLastRow(), 1).getValues(); RES.forEach(t => { t.LUGAR_MIPYV = String((v[t.fila - 1] || [''])[0] || '').trim(); }); }
  } catch (e) {}
  return RES;
}
function aguaLabTanques_(RES, cod, aa) {
  const p = String(aa || '').split('|').map(x => x.trim()), sitio = p[0], lug = p[1] || '';
  return (RES || []).filter(t => t.ESTABLECIMIENTO === cod && t.SITIO === sitio && (!lug || String(t.LUGAR_MIPYV || '') === lug) && !/fuera de uso|baja/i.test(String(t.ESTADO || '')));
}

function aguaLabIso_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, TZ, 'yyyy-MM-dd');
  const s = String(v == null ? '' : v).trim(), m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(s);
  return m ? m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2) : /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : '';
}
function aguaLabAcciones_(lab) {
  return (lab || []).filter(x => x.grupo !== 'Otros' && /urgente|vencido|pedir/i.test(x.aviso)).map(x => ({
    cod: x.cod, origen: 'Agua', vencida: /urgente|vencido/i.test(x.aviso), estado: x.aviso,
    // 03/11/2026 (Belén): con agua NO APTA, en toda la red: repetir la limpieza de tanques y limpiar las griferías afectadas
    que: (/^URGENTE/.test(x.que) ? 'Agua NO APTA: repetir la limpieza y desinfección de tanques y cisternas, limpiar y desinfectar las griferías afectadas' + ((x.res || []).filter(m => /no apta/i.test(m.resultado)).length ? ' (' + x.res.filter(m => /no apta/i.test(m.resultado)).map(m => m.donde).join(', ') + ')' : '') + ' y pedir muestreo COMPLETO'
      : /COMPLETO/.test(x.que) ? 'Pedir muestreo COMPLETO (bacteriológico + físico-químico), antes limpiar tanques y cisternas'
      : /PARCIAL/.test(x.que) ? 'Pedir muestreo PARCIAL de 6 meses (solo bacteriológico)' : x.que),
    donde: x.lugar + ' · red ' + x.red, prioridad: /urgente/i.test(x.aviso) ? 'Alta' : '',
    aCargo: 'HyS (limpieza de tanques y solicitud al DPSB)', limite: /^\d{4}-/.test(x.limite) ? x.limite : '',
    ref: 'Muestreo de agua', ir: '#agua' }));
}

// Datos fijos del remitente (pestaña «Formulario DPSB», columnas A «Dato» y B «Valor»). Se cambian desde la planilla.
function aguaLabRemitente_(ss) {
  const o = { cuit: '', responsable: '', contacto: '', correo: '', quien: 'Secretaría de Salud', comentarios: '' };
  const K = { 'Días de validez de la limpieza (completo)': 'diasLimpieza', 'CUIT / CUIL': 'cuit', 'Responsable': 'responsable', 'Contacto': 'contacto', 'Correo': 'correo', 'Quién solicita': 'quien', 'Comentarios': 'comentarios' };
  const sh = ss.getSheetByName('Formulario DPSB'); if (!sh || sh.getLastRow() < 1) return o;
  sh.getRange(1, 1, sh.getLastRow(), 2).getDisplayValues().forEach(r => { const k = K[String(r[0]).trim()]; if (k) o[k] = String(r[1]).trim(); });
  return o;
}

// Acción p_agl_solicitar: anota en la columna U («Solicitado el») la fecha del pedido al DPSB. Datos: { red, lugar, fecha (aaaa-mm-dd) }.
function aguaLabSolicitar_(x) {
  const red = String(x.red || ''), lugar = String(x.lugar || '').trim(), m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(x.fecha || ''));
  if (!/^(Trelew|Rawson)$/.test(red) || !lugar || !m) return { ok: false, mensaje: 'Faltan la red, el establecimiento o la fecha.' };
  const sh = SpreadsheetApp.openById(AGUA_LAB_ID).getSheetByName('Tablero ' + red); if (!sh) return { ok: false, mensaje: 'No está la pestaña Tablero ' + red + '.' };
  const n = sh.getLastRow() - 8; if (n < 1) return { ok: false, mensaje: 'El tablero está vacío.' };
  const i = sh.getRange(9, 2, n, 1).getDisplayValues().findIndex(r => String(r[0]).trim() === lugar);
  if (i < 0) return { ok: false, mensaje: 'No encontré «' + lugar + '» en el Tablero ' + red + '.' };
  sh.getRange(9 + i, 21).setValue(new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))).setNumberFormat('dd/mm/yyyy');
  try { CacheService.getScriptCache().remove('p_tablero'); } catch (e) {}
  return { ok: true, fecha: m[3] + '/' + m[2] + '/' + m[1] };
}

// Acción p_agl_aviso: borrador en Gmail avisando al establecimiento (y al Área Externa si es CAPS Trelew) que se pidió el muestreo.
// Datos: { red, lugar }. No envía nada: el borrador queda en Gmail para revisarlo y enviarlo.
const AGUA_LAB_LOGO = '1DnztPPclcsCNA23DDlAF-90Uchf6QdzN';   // logo de HySL («Hospitales más seguros para las personas»)
const AGUA_LAB_REMITENTE = 'belenpellegrini.hys@gmail.com';
function aguaLabAviso_(x) {
  const red = String(x.red || ''), lugar = String(x.lugar || '').trim();
  if (!/^(Trelew|Rawson)$/.test(red) || !lugar) return { ok: false, mensaje: 'Faltan la red o el establecimiento.' };
  const ss = SpreadsheetApp.openById(AGUA_LAB_ID), sh = ss.getSheetByName('Tablero ' + red); if (!sh) return { ok: false, mensaje: 'No está la pestaña Tablero ' + red + '.' };
  const n = sh.getLastRow() - 8; if (n < 1) return { ok: false, mensaje: 'El tablero está vacío.' };
  const V = sh.getRange(9, 1, n, Math.min(27, sh.getMaxColumns())).getDisplayValues(), r = V.find(z => String(z[1]).trim() === lugar);
  if (!r) return { ok: false, mensaje: 'No encontré «' + lugar + '» en el Tablero ' + red + '.' };
  // Plantilla (pestaña «Formulario DPSB», columnas A y B)
  const T = {}, fd = ss.getSheetByName('Formulario DPSB');
  if (fd && fd.getLastRow()) fd.getRange(1, 1, fd.getLastRow(), 2).getDisplayValues().forEach(z => { T[String(z[0]).trim()] = String(z[1]); });
  const g = (k, d) => (T[k] != null && String(T[k]).trim() !== '' ? T[k] : d);
  const comp = /COMPLETO|URGENTE/i.test(r[15]), tipo = comp ? 'completo' : 'parcial';
  const sol = aguaLabIso_(r[20]), fecha = (sol || Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd')).split('-').reverse().join('/');
  let can = String(r[19] || '').split(' · ').map(c => c.trim()).filter(c => c && !/^s\/d/i.test(c));
  if (comp) ['salida del tanque', 'canilla más alejada'].forEach(c => { if (!can.some(k => k.toLowerCase().indexOf(c) >= 0)) can.push(c); });
  // 02/11/2026: limpieza reciente de los tanques del sitio (columna AA): fecha y quiénes la hicieron, para el texto {limpieza}
  let limpieza = '';
  try {
    const cod = red === 'Rawson' ? 'HSST' : /^HMH/.test(lugar) ? 'HMH' : 'HZT', sitio = String(r[26] || '').trim(), dias = Number(g('Días de validez de la limpieza (completo)', 30)) || 30;
    const desde = Utilities.formatDate(new Date(Date.now() - dias * 864e5), TZ, 'yyyy-MM-dd');
    if (sitio && typeof miLeer_ === 'function') {
      const tq = aguaLabTanques_(aguaLabRes_(), cod, sitio).map(t => t.CODIGO_TANQUE);
      const L = miLeer_('AGUA_LIMPIEZAS').filter(l => tq.indexOf(l.CODIGO_TANQUE) >= 0 && String(l.FECHA).slice(0, 10) >= desde);
      if (L.length) {
        const fechas = Array.from(new Set(L.map(l => String(l.FECHA).slice(0, 10)))).sort().map(v => v.split('-').reverse().join('/'));
        const nom = c => String(c || '').replace(/\s*·.*$/, '').replace(/\s*\(con ([^)]+)\)/, ' y $1').replace(/\s*\([^)]*\)/g, '').trim();
        const quienes = Array.from(new Set(L.map(l => nom(l.CARGO)).join(' y ').split(/\s+y\s+|,\s*/).map(x => x.trim()).filter(x => x && !/^s\/d/i.test(x))));
        const lista = a => a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' y ' + a[a.length - 1];
        limpieza = String(g('Texto {limpieza}', 'Los tanques y cisternas de agua se limpiaron y desinfectaron el {fecha_limpieza}{quienes}.\n\n'))
          .replace(/\{fecha_limpieza\}/g, lista(fechas)).replace(/\{quienes\}/g, quienes.length ? ' (' + lista(quienes) + ', Servicio de Higiene y Seguridad Laboral)' : '')
          .replace(/\{cantidad\}/g, String(new Set(L.map(l => l.CODIGO_TANQUE)).size));
        limpieza = limpieza.replace(/\s+$/, '') + '\n\n';
      }
    }
  } catch (e) {}
  const rep = t => String(t).replace(/\{limpieza\}/g, limpieza).replace(/\{fecha\}/g, fecha).replace(/\{tipo\}/g, tipo).replace(/\{lugar\}/g, lugar).replace(/\{canillas\}/g, can.length ? can.join(', ') : 's/d')
    .replace(/\{analisis\}/g, g(comp ? 'Texto {analisis} · completo' : 'Texto {analisis} · parcial', ''))
    .replace(/\{antes\}/g, comp ? g('Texto {antes} · completo', '') : '');
  const asunto = rep(g('Asunto del aviso', 'Muestreo de agua {tipo} · {lugar} · solicitado el {fecha}'));
  const texto = rep(g('Texto del aviso', 'Les informo que el {fecha} solicité al DPSB el muestreo {tipo} de agua de {lugar}.')).replace(/\n{3,}/g, '\n\n').trim();
  const firma = g('Firma', 'Belén Pellegrini\nServicio de Higiene y Seguridad Laboral · HZT / HMH\n' + AGUA_LAB_REMITENTE);
  const para = /@/.test(r[25]) ? String(r[25]).trim() : '';
  const cc = String(/^CAPS/i.test(r[0]) && red === 'Trelew' ? g('Copia a (CAPS Trelew)', '') : g('Copia a (otros)', '')).trim();
  const esc = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
  let logo = null; try { logo = DriveApp.getFileById(AGUA_LAB_LOGO).getBlob().setName('logo'); } catch (e) {}
  const html = '<div style="font-family:Arial,sans-serif;font-size:14px;color:#222;line-height:1.5">' + esc(texto) + '<br><br>' + esc(firma) +
    (logo ? '<br><br><img src="cid:logo" alt="HySL · Hospitales más seguros para las personas" style="width:220px">' : '') + '</div>';
  const op = { htmlBody: html, name: 'Belén Pellegrini · Higiene y Seguridad Laboral' };
  let desde = ''; try { const propia = Session.getEffectiveUser().getEmail().toLowerCase(); desde = propia === AGUA_LAB_REMITENTE || GmailApp.getAliases().map(a => a.toLowerCase()).indexOf(AGUA_LAB_REMITENTE) >= 0 ? AGUA_LAB_REMITENTE : ''; } catch (e) {}
  if (desde) op.from = desde; else op.replyTo = AGUA_LAB_REMITENTE;
  if (cc) op.cc = cc; if (logo) op.inlineImages = { logo: logo };
  const dr = GmailApp.createDraft(para, asunto, texto + '\n\n' + firma, op);
  let url = 'https://mail.google.com/mail/'; try { url += '?authuser=' + encodeURIComponent(Session.getEffectiveUser().getEmail()); } catch (e) {}
  url += '#drafts'; try { url += '?compose=' + dr.getMessage().getId(); } catch (e) {}
  return { ok: true, url: url, para: para, cc: cc, asunto: asunto,
    aviso: (para ? '' : 'No hay correo cargado para «' + lugar + '» (Tablero ' + red + ', columna Z): completá el destinatario en el borrador. ') + (desde ? '' : 'Gmail no tiene «Enviar como» ' + AGUA_LAB_REMITENTE + ': revisá el remitente.') };
}
