/**
 * SISTEMA HyS · MÓDULO 10 · EMPRESAS DE SERVICIO, RECORRIDA DE SEGURIDAD Y NOVEDADES (versión 0, 14/10/2026)
 * Pedido de Belén (14/10/2026):
 *  1. SOMI (mantenimiento) y MAREM (seguridad) entran a «Mi establecimiento» con una CLAVE POR SERVICIO: en BASE COMÚN › ACCESOS,
 *     una fila por empresa con ROL = Servicio, APELLIDO_Y_NOMBRE = nombre de la empresa (SOMI, MAREM), sin DNI, con su CLAVE
 *     (Accesos.gs › acceso_). Al ingresar se deja el DNI vacío.
 *  2. Cada registro que hace una empresa (control, agregar o corregir extintor, recorrida, novedad, marcar resuelto) pide SIEMPRE
 *     quién lo hace: DNI → se busca en la BASE DE TRABAJADORES (y en PERSONAL_SERVICIOS) → «Confirmar» o «Actualizar datos»
 *     (nombre, apellido, correo). Si la persona no está o cambió algo, se propone el alta o el cambio en la Bandeja
 *     (NÓMINA DE PERSONAL): la BASE DE TRABAJADORES no se escribe directo. Todo queda en la hoja PERSONAL_SERVICIOS del libro
 *     de incendio (ACTIVO = No bloquea a esa persona).
 *  3. Recorrida de seguridad contra incendios (frecuencia libre): 12 puntos Sí/No por sector; cada «No» exige foto y abre una
 *     novedad. Botón «Informar una novedad» (principio de incendio, alarma, olor a quemado, uso de un extintor, etc.).
 *     Las novedades aparecen en el tablero de Belén («Requiere atención» y 7 › Novedades y recorridas) y se avisan por correo SOLO a Belén
 *     (SITIOS_INC › CORREOS_NOVEDADES). Si se usó un extintor, además queda con el problema «Se usó» (circuito de extintores:
 *     correo a SOMI y Mantenimiento y recordatorio cada 3 días).
 *  4. Marcar «resuelto» (extintores y novedades): SOMI, Melani y Belén. MAREM no (INC_SRV.RESUELVEN).
 * Hojas nuevas del libro «PROTECCIÓN CONTRA INCENDIOS · Sistema HyS» (se crean solas): PERSONAL_SERVICIOS, RECORRIDAS, NOVEDADES_INC.
 * Normativa: Ley 19.587; Dto. 351/79, cap. 18 (protección contra incendios: medios de escape, señalización, extintores,
 * instalaciones fijas, detección y alarma). Única excepción a «no enviar correos automáticos»: los avisos de este módulo.
 */
const INC_SRV = {
  RESUELVEN: ['SOMI'],   // empresas que pueden marcar «resuelto» (además de las personas con clave propia y HyS)
  H_PER: ['DNI', 'APELLIDOS', 'NOMBRES', 'EMAIL', 'EMPRESA', 'EN_BASE', 'PROPUESTA_BANDEJA', 'PRIMER_REGISTRO', 'ULTIMO_REGISTRO', 'REGISTROS', 'ACTIVO', 'OBSERVACIONES'],
  H_REC: ['ID', 'FECHA', 'HORA', 'ESTABLECIMIENTO', 'SECTOR', 'RESULTADO', 'PUNTOS_NO', 'OBSERVACIONES', 'QUIEN', 'CARGADO'],
  H_NOV: ['ID', 'FECHA', 'HORA', 'ESTABLECIMIENTO', 'SECTOR', 'ORIGEN', 'TIPO', 'DETALLE', 'FOTO', 'ID_EXTINTOR', 'QUIEN', 'ESTADO', 'AVISO_CORREO', 'RESUELTO', 'RESUELTO_POR', 'RESOLUCION', 'ID_RECORRIDA'],
  PUNTOS: [
    ['SALIDAS', 'Salidas, pasillos y escaleras libres', 'Sin obstáculos; puertas de salida sin cadenas ni trabas.'],
    ['CORTAFUEGO', 'Puertas cortafuego cerradas y funcionando', 'No trabadas abiertas con cuñas u objetos; cierran solas.'],
    ['LUCES', 'Luces de emergencia funcionando', 'Al apretar el botón de prueba, encienden.'],
    ['CARTELES', 'Carteles de salida y de evacuación visibles', 'Se ven, no están tapados ni rotos.'],
    ['BIE', 'Bocas de incendio (hidrantes) accesibles y completas', 'Gabinete sin obstáculos, con manguera y lanza, vidrio sano.'],
    ['ALARMA', 'Central de alarma sin fallas y pulsadores accesibles', 'La pantalla de la central no marca falla; pulsadores a la vista.'],
    ['EXTINTORES', 'Extintores a la vista y accesibles', 'Mirada rápida (no reemplaza el control mensual).'],
    ['COMBUSTIBLE', 'Sin material combustible acumulado', 'Sin cajas, colchones o residuos en pasillos ni junto a tableros.'],
    ['ELECTRICO', 'Tableros cerrados y sin riesgo eléctrico', 'Sin olor a quemado, sin zapatillas en cadena ni estufas no autorizadas.'],
    ['GASES', 'Tubos de gases y garrafas seguros', 'Sujetos con cadena, ordenados y sin pérdidas.'],
    ['FUMAR', 'Nadie fumando en lugares prohibidos', ''],
    ['PLANOS', 'Planos de evacuación colocados', 'A la vista, en su lugar.']
  ],
  TIPOS_NOV: ['Principio de incendio', 'Alarma de incendio activada', 'Olor a quemado o humo', 'Se usó un extintor', 'Salida o pasillo obstruido', 'Instalación contra incendio dañada', 'Otra'],
  CORREO_HYS: 'belenpellegrini.hys@gmail.com'
};

// ------------------------------------------------------------------ HOJAS (se crean la primera vez que se usan)
function incSrvHoja_(nombre) {
  const ss = pInc_(); let sh = ss.getSheetByName(nombre); if (sh) return sh;
  sh = ss.insertSheet(nombre);
  if (nombre === 'PERSONAL_SERVICIOS') {
    encabezar_(sh, 'Personal de las empresas de servicio', 'Se llena solo: cada persona que registra algo desde «Mi establecimiento» con la clave de su empresa (SOMI, MAREM). ACTIVO = No bloquea a esa persona. Las altas y los cambios de datos se proponen en la Bandeja para la BASE DE TRABAJADORES.', INC_SRV.H_PER,
      ['Sin puntos.', '', '', 'Correo de contacto.', 'SOMI · MAREM…', 'Sí · Propuesto en la bandeja', 'ID de la propuesta.', 'Lo pone el sistema.', 'Lo pone el sistema.', 'Cantidad de registros.', 'Sí · No', ''], [5, 6, 7, 8, 9]);
    lista_(sh, 10, 1000, ['Sí', 'No']); sh.getRange(6, 1, 1000, 1).setNumberFormat('@');
  } else if (nombre === 'RECORRIDAS') {
    encabezar_(sh, 'Recorridas de seguridad contra incendios', 'Una fila por recorrida (sector). Los puntos en «No» quedan como novedades en NOVEDADES_INC, con su foto.', INC_SRV.H_REC,
      ['Lo pone el sistema.', '', '', '', 'Sector recorrido.', 'Sin novedades · Con novedades', 'Puntos que dieron «No».', '', 'Quién la hizo (nombre, DNI y empresa).', ''], [0, 9]);
    sh.getRange(6, 2, 2000, 1).setNumberFormat('dd/mm/yyyy');
  } else if (nombre === 'NOVEDADES_INC') {
    encabezar_(sh, 'Novedades de protección contra incendios', 'Lo que informa Seguridad (recorrida o novedad). Se avisa por correo a SITIOS_INC › CORREOS_NOVEDADES. ESTADO = Abierta hasta que se marque resuelta (SOMI, Melani o HyS).', INC_SRV.H_NOV,
      ['Lo pone el sistema.', '', '', '', '', 'Recorrida · Novedad', '', '', 'Foto en Drive.', 'Si tiene que ver con un extintor.', '', 'Abierta · Resuelta', 'Lo pone el sistema.', '', '', 'Qué se hizo.', ''], [0, 12]);
    lista_(sh, 11, 2000, ['Abierta', 'Resuelta']); sh.getRange(6, 2, 2000, 1).setNumberFormat('dd/mm/yyyy'); sh.getRange(6, 14, 2000, 1).setNumberFormat('dd/mm/yyyy');
  }
  return sh;
}
const incSrvLeer_ = (hoja, H) => { incSrvHoja_(hoja); return incLeer_(hoja, H); };
const incSrvAhora_ = () => Utilities.formatDate(new Date(), TZ, 'HH:mm');

// ------------------------------------------------------------------ IDENTIFICACIÓN DE QUIEN REGISTRA (sesiones de empresa)
// Busca a la persona por DNI: BASE DE TRABAJADORES (accPersona_) y, si no, PERSONAL_SERVICIOS
function incSrvBuscar_(dni, est) {
  dni = String(dni || '').replace(/\D/g, ''); if (!/^\d{7,8}$/.test(dni)) return { ok: false, mensaje: 'Escribí el DNI sin puntos (7 u 8 números).' };
  const P = incSrvLeer_('PERSONAL_SERVICIOS', INC_SRV.H_PER).find(p => String(p.DNI).replace(/\D/g, '') === dni);
  if (P && /^no/i.test(P.ACTIVO || '')) return { ok: false, mensaje: 'Ese DNI no está habilitado para registrar. Consultá con Higiene y Seguridad.' };
  let b = null; try { const r = typeof accPersona_ === 'function' ? accPersona_(dni, est) : null; if (r) { const g = k => { const j = r.H.indexOf(k); return j >= 0 ? limpio_(r.v[j]) : ''; }; b = { apellido: g('APELLIDOS'), nombre: g('NOMBRES'), mail: g('EMAIL'), empresa: g('EMPRESA') }; } } catch (e) {}
  if (b) return { ok: true, encontrado: true, fuente: 'base', dni: dni, apellido: b.apellido, nombre: b.nombre, mail: P && P.EMAIL ? P.EMAIL : b.mail };
  if (P) return { ok: true, encontrado: true, fuente: 'servicios', dni: dni, apellido: P.APELLIDOS, nombre: P.NOMBRES, mail: P.EMAIL };
  return { ok: true, encontrado: false, dni: dni };
}
// Valida la identidad que manda la aplicación, la registra en PERSONAL_SERVICIOS y propone en la Bandeja el alta o el cambio de datos.
// Devuelve { ok, quien } con el texto que queda en cada registro: «Apellido, Nombre · DNI 12345678 · SOMI».
function incSrvIdentidad_(id, acc, est) {
  id = id || {}; const dni = String(id.dni || '').replace(/\D/g, ''), ap = limpio_(id.apellido), no = limpio_(id.nombre), mail = limpio_(id.mail).toLowerCase(), emp = acc.servicio;
  if (!/^\d{7,8}$/.test(dni)) return { ok: false, mensaje: 'Falta quién hace el registro: DNI sin puntos (7 u 8 números).' };
  if (ap.length < 2 || no.length < 2) return { ok: false, mensaje: 'Falta el nombre y el apellido de quien hace el registro.' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) return { ok: false, mensaje: 'Falta un correo válido de quien hace el registro.' };
  const sh = incSrvHoja_('PERSONAL_SERVICIOS'), L = incLeer_('PERSONAL_SERVICIOS', INC_SRV.H_PER), p = L.find(x => String(x.DNI).replace(/\D/g, '') === dni);
  if (p && /^no/i.test(p.ACTIVO || '')) return { ok: false, mensaje: 'Ese DNI no está habilitado para registrar. Consultá con Higiene y Seguridad.' };
  const hoy = incHoy_(), o = p ? Object.assign({}, p) : { DNI: dni, PRIMER_REGISTRO: hoy, REGISTROS: 0, ACTIVO: 'Sí' }; delete o.fila;
  const cambio = !p || sinTildes_(p.APELLIDOS) !== sinTildes_(ap) || sinTildes_(p.NOMBRES) !== sinTildes_(no) || String(p.EMAIL || '').toLowerCase() !== mail || limpio_(p.EMPRESA) !== emp;
  Object.assign(o, { APELLIDOS: ap, NOMBRES: no, EMAIL: mail, EMPRESA: emp, ULTIMO_REGISTRO: hoy, REGISTROS: (Number(o.REGISTROS) || 0) + 1 });
  if (cambio) {   // la BASE DE TRABAJADORES no se escribe directo: va como propuesta a la Bandeja (NÓMINA DE PERSONAL)
    try {
      const enBase = typeof persIndice_ === 'function' ? persBuscar_(persIndice_(), '', dni, est).p : null, clave = ap + ', ' + no + ' · DNI ' + dni, C = [];
      if (enBase) {
        const val = k => { const j = enBase.H.indexOf(k); return j >= 0 ? limpio_(enBase.v[j]) : ''; };
        [['APELLIDOS', ap], ['NOMBRES', no], ['EMAIL', mail], ['EMPRESA', emp]].forEach(([k, v]) => { const a = val(k); if (sinTildes_(a) !== sinTildes_(v) && !(k === 'EMPRESA' && a)) C.push({ hoja: enBase.hoja, clave: clave, campo: k, antes: a, despues: v }); });
        o.EN_BASE = 'Sí';
      } else {
        C.push({ hoja: est, clave: clave, campo: '(fila nueva)', antes: '', despues: [emp, 'Tercerizado', mail].join(' · '), nueva: { DNI: dni, APELLIDOS: ap, NOMBRES: no, EMAIL: mail, EMPRESA: emp, VINCULO: 'Tercerizado', SERVICIO: emp, ESTADO: 'Activo' } });
        o.EN_BASE = 'Propuesto en la bandeja';
      }
      if (C.length && typeof bjGuardarPropuesta_ === 'function') o.PROPUESTA_BANDEJA = bjGuardarPropuesta_('NOMINA_PERSONAL', est, '', C, [], 'Mi establecimiento · ' + emp + ' (personal de la empresa)').id;
    } catch (e) { o.OBSERVACIONES = ('No se pudo proponer en la bandeja: ' + (e.message || e)).slice(0, 300); }
  }
  incEscribir_('PERSONAL_SERVICIOS', INC_SRV.H_PER, p ? p.fila : null, o);
  return { ok: true, quien: ap + ', ' + no + ' · DNI ' + dni + ' · ' + emp };
}
const incSrvPuedeResolver_ = acc => !acc || !acc.servicio || INC_SRV.RESUELVEN.some(s => new RegExp('^' + s + '$', 'i').test(acc.servicio));

// ------------------------------------------------------------------ RECORRIDA Y NOVEDADES
function incSrvCorreosNov_(cod) {
  const S = incLeer_('SITIOS_INC', INC.H_SIT.concat(['CORREOS_NOVEDADES'])).filter(s => limpio_(s.ESTABLECIMIENTO) === cod && s.ACTIVO !== 'No');
  const t = (S.find(s => limpio_(s.CORREOS_NOVEDADES)) || {}).CORREOS_NOVEDADES || '';
  return String(t).split(/[,;\s]+/).filter(m => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(m));
}
// Correo a Belén con las novedades (una o varias de una misma recorrida)
function incSrvMail_(cod, titulo, filas, novs) {
  const para = incSrvCorreosNov_(cod); if (!para.length) return '';
  const nom = (pEstablecimientos_().filas.find(r => limpio_(r.v[0]) === cod) || { v: [cod, cod] }).v[1];
  const esc_ = t => String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const html = '<div style="font-family:Arial,sans-serif;font-size:14px;color:#33434C;max-width:640px"><p><b>' + esc_(titulo) + '</b> · ' + esc_(nom) + '</p>' +
    '<table style="border-collapse:collapse;font-size:14px">' + filas.map(r => '<tr><td style="padding:4px 12px 4px 0;color:#4F616B;vertical-align:top">' + esc_(r[0]) + '</td><td style="padding:4px 0">' + esc_(r[1]) + '</td></tr>').join('') + '</table>' +
    '<p style="margin:12px 0 6px"><b>Novedades</b></p><ul style="margin:0 0 12px">' + novs.map(n => '<li><b>' + esc_(n.TIPO) + '</b>' + (n.DETALLE ? ': ' + esc_(n.DETALLE) : '') + (n.FOTO ? ' · <a href="' + n.FOTO + '">foto</a>' : '') + '</li>').join('') + '</ul>' +
    '<p style="color:#4F616B;font-size:12px">Protección contra incendios: medios de escape, señalización, extintores, instalaciones fijas, detección y alarma (Ley 19.587; Dto. 351/79, cap. 18). Se ven y se marcan resueltas en el portal (7 · Protección contra incendios › Novedades y recorridas).</p>' +
    '<p>Servicio de Higiene y Seguridad Laboral · HZT / HMH<br><span style="color:#4F616B;font-size:12px">Registro: ' + esc_(novs.map(n => n.ID).join(', ')) + '.</span></p><p><img src="cid:logo" alt="HySL" style="width:220px"></p></div>';
  const texto = titulo + ' · ' + nom + '\n\n' + filas.map(r => r[0] + ': ' + r[1]).join('\n') + '\n\nNovedades:\n- ' + novs.map(n => n.TIPO + (n.DETALLE ? ': ' + n.DETALLE : '') + (n.FOTO ? ' (foto: ' + n.FOTO + ')' : '')).join('\n- ');
  try {
    const op = { htmlBody: html, name: 'Sistema HyS · Protección contra incendios' };
    try { op.inlineImages = { logo: DriveApp.getFileById(DGM_LOGO_PIE).getBlob() }; } catch (x) { op.htmlBody = html.replace(/<p><img[^>]*><\/p>/, ''); }
    const propia = String(Session.getEffectiveUser().getEmail()).toLowerCase();
    if (INC.REMITENTE.toLowerCase() !== propia && GmailApp.getAliases().map(a => a.toLowerCase()).indexOf(INC.REMITENTE.toLowerCase()) >= 0) op.from = INC.REMITENTE;
    GmailApp.sendEmail(para.join(','), cod + ' · ' + titulo + ': ' + novs.map(n => n.TIPO).join(', ').slice(0, 120), texto, op);
    return 'Enviado ' + Utilities.formatDate(new Date(), TZ, 'dd/MM/yyyy HH:mm') + ' a ' + para.join(', ');
  } catch (err) { return 'No se pudo enviar: ' + (err.message || err); }
}
// Recorrida: x = { SECTOR, OBSERVACIONES, puntos: { CLAVE: 'Sí'|'No' }, detalles: { CLAVE: texto }, fotos: { CLAVE: dataUrl } }
function incSrvRecorrida_(x, quien, cod) {
  const sector = limpio_(x.SECTOR); if (!sector) return { ok: false, mensaje: 'Escribí el sector que recorriste.' };
  const P = x.puntos || {}, falta = INC_SRV.PUNTOS.filter(p => !/^(Sí|No)$/.test(P[p[0]] || '')).map(p => p[1]); if (falta.length) return { ok: false, mensaje: 'Falta responder: ' + falta.join(', ') + '.' };
  const nos = INC_SRV.PUNTOS.filter(p => P[p[0]] === 'No'), sinF = nos.filter(p => !/^data:image\//.test(String((x.fotos || {})[p[0]] || ''))).map(p => p[1]);
  if (sinF.length) return { ok: false, mensaje: 'Cada punto en «No» necesita una foto. Falta: ' + sinF.join(', ') + '.' };
  const hoy = incHoy_(), id = 'REC-' + cod + '-' + Utilities.formatDate(new Date(), TZ, 'yyMMddHHmmss');
  incSrvHoja_('RECORRIDAS'); incSrvHoja_('NOVEDADES_INC');
  const novs = nos.map((p, i) => ({ ID: 'NOV-' + cod + '-' + Utilities.formatDate(new Date(), TZ, 'yyMMddHHmmss') + '-' + (i + 1), FECHA: incFecha_(hoy), HORA: incSrvAhora_(), ESTABLECIMIENTO: cod, SECTOR: sector, ORIGEN: 'Recorrida',
    TIPO: p[1] + ': no', DETALLE: limpio_((x.detalles || {})[p[0]]), FOTO: incFoto_(cod, x.fotos[p[0]], ['Novedades', hoy.slice(0, 7)], id + ' · ' + p[1]), QUIEN: quien, ESTADO: 'Abierta', ID_RECORRIDA: id }));
  const aviso = novs.length ? incSrvMail_(cod, 'Recorrida de seguridad con novedades', [['Sector', sector], ['Fecha', incTxt_(hoy) + ' ' + incSrvAhora_()], ['Quién', quien], ['Observaciones', limpio_(x.OBSERVACIONES) || '—']], novs) : '';
  novs.forEach(n => { n.AVISO_CORREO = aviso; incEscribir_('NOVEDADES_INC', INC_SRV.H_NOV, null, n); });
  incEscribir_('RECORRIDAS', INC_SRV.H_REC, null, { ID: id, FECHA: incFecha_(hoy), HORA: incSrvAhora_(), ESTABLECIMIENTO: cod, SECTOR: sector, RESULTADO: novs.length ? 'Con novedades' : 'Sin novedades',
    PUNTOS_NO: nos.map(p => p[1]).join(' · '), OBSERVACIONES: limpio_(x.OBSERVACIONES), QUIEN: quien, CARGADO: new Date() });
  CacheService.getScriptCache().remove('inc_tablero');
  return { ok: true, id: id, novedades: novs.length, aviso: aviso };
}
// Novedad: x = { TIPO, SECTOR, DETALLE, foto, extintores: [ID] }
function incSrvNovedad_(x, quien, cod) {
  const tipo = limpio_(x.TIPO); if (INC_SRV.TIPOS_NOV.indexOf(tipo) < 0) return { ok: false, mensaje: 'Elegí qué pasó.' };
  const sector = limpio_(x.SECTOR); if (!sector) return { ok: false, mensaje: 'Escribí dónde pasó (sector).' };
  const det = limpio_(x.DETALLE); if (det.length < 4) return { ok: false, mensaje: 'Contá brevemente qué pasó.' };
  const ext = (Array.isArray(x.extintores) ? x.extintores : []).map(limpio_).filter(Boolean);
  if (tipo === 'Se usó un extintor' && !ext.length) return { ok: false, mensaje: 'Elegí el extintor (o los extintores) que se usaron.' };
  const hoy = incHoy_(), id = 'NOV-' + cod + '-' + Utilities.formatDate(new Date(), TZ, 'yyMMddHHmmss');
  incSrvHoja_('NOVEDADES_INC');
  const n = { ID: id, FECHA: incFecha_(hoy), HORA: incSrvAhora_(), ESTABLECIMIENTO: cod, SECTOR: sector, ORIGEN: 'Novedad', TIPO: tipo, DETALLE: det,
    FOTO: /^data:image\//.test(String(x.foto || '')) ? incFoto_(cod, x.foto, ['Novedades', hoy.slice(0, 7)], id + ' · ' + tipo) : '', ID_EXTINTOR: ext.join(', '), QUIEN: quien, ESTADO: 'Abierta' };
  n.AVISO_CORREO = incSrvMail_(cod, 'Novedad de protección contra incendios', [['Sector', sector], ['Fecha', incTxt_(hoy) + ' ' + n.HORA], ['Quién', quien]].concat(ext.length ? [['Extintores', ext.join(', ')]] : []), [n]);
  incEscribir_('NOVEDADES_INC', INC_SRV.H_NOV, null, n);
  // Si se usó un extintor, queda con el problema «Se usó» (aviso a SOMI y Mantenimiento y recordatorio cada 3 días)
  const E = ext.length ? incLeer_('EXTINTORES', INC.H_EXT) : [], avExt = [];
  ext.forEach(eid => { const e = E.find(z => z.ID === eid && limpio_(z.ESTABLECIMIENTO) === cod); if (e) avExt.push(eid + ': ' + (incRegistrarFalla_(e, ['Se usó (descargado total o parcialmente)'], { quien: quien, fecha: hoy, obs: det, fotos: {}, id: id }) || 'sin correo configurado')); });
  CacheService.getScriptCache().remove('inc_tablero');
  return { ok: true, id: id, aviso: n.AVISO_CORREO, avisoExtintores: avExt };
}
function incSrvResolverNov_(x, quien, cod) {
  const L = incSrvLeer_('NOVEDADES_INC', INC_SRV.H_NOV), n = L.find(z => z.ID === x.ID); if (!n) return { ok: false, mensaje: 'No encontré esa novedad.' };
  if (cod && limpio_(n.ESTABLECIMIENTO) !== cod) return { ok: false, mensaje: 'Esa novedad no es de este establecimiento.' };
  if (/^resuel/i.test(n.ESTADO)) return { ok: false, mensaje: 'Esa novedad ya estaba resuelta.' };
  const o = Object.assign({}, n); delete o.fila; Object.assign(o, { ESTADO: 'Resuelta', RESUELTO: incFecha_(incHoy_()), RESUELTO_POR: quien, RESOLUCION: limpio_(x.RESOLUCION), FECHA: incFecha_(n.FECHA) });
  incEscribir_('NOVEDADES_INC', INC_SRV.H_NOV, n.fila, o); CacheService.getScriptCache().remove('inc_tablero');
  return { ok: true };
}
// Novedades y recorridas (portal: todas; aplicación: las de su establecimiento)
function incSrvListar_(cod) {
  const N = incSrvLeer_('NOVEDADES_INC', INC_SRV.H_NOV).filter(n => !cod || limpio_(n.ESTABLECIMIENTO) === cod).reverse();
  const R = incSrvLeer_('RECORRIDAS', INC_SRV.H_REC).filter(r => !cod || limpio_(r.ESTABLECIMIENTO) === cod).reverse().slice(0, 60);
  return { ok: true, abiertas: N.filter(n => !/^resuel/i.test(n.ESTADO)), resueltas: N.filter(n => /^resuel/i.test(n.ESTADO)).slice(0, 60), recorridas: R,
    puntos: INC_SRV.PUNTOS, tipos: INC_SRV.TIPOS_NOV, libro: pInc_().getUrl() };
}
// Avisos para el tablero (novedades abiertas por establecimiento)
function incSrvAvisos_() {
  try {
    const por = {}; incLeer_('NOVEDADES_INC', INC_SRV.H_NOV).filter(n => n.ID && !/^resuel/i.test(n.ESTADO)).forEach(n => { const c = limpio_(n.ESTABLECIMIENTO); (por[c] = por[c] || []).push(n); });
    return Object.keys(por).map(c => { const l = por[c], inc = l.some(n => /principio|alarma|humo/i.test(n.TIPO));
      return { nivel: inc ? 'er' : 'wa', cod: c, sitio: 'Novedades', h: '#incnov', texto: l.length + (l.length > 1 ? ' novedades abiertas' : ' novedad abierta') + ' de protección contra incendios (recorrida de seguridad o aviso): ' + l.slice(0, 3).map(n => n.TIPO + ' · ' + n.SECTOR).join('; ') + (l.length > 3 ? '…' : '') }; });
  } catch (e) { return []; }
}

// ------------------------------------------------------------------ ENTRADAS (las llama Incendio.gs › incRed_ / incPortal_)
function incSrvRed_(d, acc, cod, x, quien) {
  switch (d.accion) {
    case 'i_persona': return incSrvBuscar_(x.dni, cod);
    case 'i_recorrida': return conLock_(() => incSrvRecorrida_(x, quien, cod));
    case 'i_novedad': return conLock_(() => incSrvNovedad_(x, quien, cod));
    case 'i_novedades': { const r = incSrvListar_(cod); r.puedeResolver = incSrvPuedeResolver_(acc); r.resueltas = r.resueltas.slice(0, 20); r.recorridas = r.recorridas.slice(0, 20); return r; }
    case 'i_nov_resolver': if (!incSrvPuedeResolver_(acc)) return { ok: false, mensaje: 'Marcar como resuelto lo hacen SOMI, Melani o Higiene y Seguridad.' };
      return conLock_(() => incSrvResolverNov_(x, quien, cod));
  }
  return null;
}
function incSrvPortal_(accion, x, quien) {
  if (accion === 'p_inc_novedades') return incSrvListar_('');
  if (accion === 'p_inc_nov_resolver') return conLock_(() => incSrvResolverNov_(x, quien, ''));
  if (accion === 'p_inc_recorrida') return conLock_(() => incSrvRecorrida_(x, quien, limpio_(x.cod) || 'HMH'));
  if (accion === 'p_inc_novedad') return conLock_(() => incSrvNovedad_(x, quien, limpio_(x.cod) || 'HMH'));
  return null;
}
// Ejecutar una vez desde el editor: crea las hojas y la columna CORREOS_NOVEDADES (HMH: belenpellegrini.hys@gmail.com). No envía nada.
function prepararServiciosIncendio() {
  ['PERSONAL_SERVICIOS', 'RECORRIDAS', 'NOVEDADES_INC'].forEach(incSrvHoja_);
  const sh = pInc_().getSheetByName('SITIOS_INC'), H = sh.getRange(5, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
  let j = H.indexOf('CORREOS_NOVEDADES'); if (j < 0) { j = H.length; sh.getRange(5, j + 1).setValue('CORREOS_NOVEDADES'); }
  const L = incLeer_('SITIOS_INC', INC.H_SIT); L.filter(s => limpio_(s.ESTABLECIMIENTO) === 'HMH').forEach(s => { if (!limpio_(sh.getRange(s.fila, j + 1).getValue())) sh.getRange(s.fila, j + 1).setValue(INC_SRV.CORREO_HYS); });
  Logger.log('Listo: hojas PERSONAL_SERVICIOS, RECORRIDAS y NOVEDADES_INC; avisos de novedades del HMH a ' + INC_SRV.CORREO_HYS + '.');
}
