// =====================================================================
// CAPACITACIONES · Sistema HyS
// Código del libro «CAPACITACIONES · Sistema HyS» (Extensiones › Apps Script).
// Fase 3: tablero de la sección 7 del Portal HyS (lee los libros actuales, no escribe en ellos).
// Fase 4: registro público con los cuatro públicos, migración de 2026 y carga manual.
// Fase 5: catálogo y alta, banco de preguntas, dictados (48 h, QR, WhatsApp), inscripción previa
//         con anulación, evaluación en línea, encuesta de satisfacción y firmantes.
// Fase 6: certificados y constancias (código CHYS, PDF desde la plantilla de Presentaciones, Mis certificados,
//         verificación por QR, cierre de programas, disertantes, lote por dictado, anular y rehacer).
// Fase 7 (archivo Agenda.gs): agenda pública (me anoto yo / anoto a mi servicio), franjas, jefaturas,
//         matriz editable, cumplimiento por servicio y recordatorios de la agenda.
// Correos: solo los de la agenda (Agenda.gs), desde belenpellegrini.hys@gmail.com. Ningún otro sale solo.
// Si el portal falla, el mismo tablero queda en la hoja TABLERO.
// =====================================================================
const VERSION_CAP = '2026-10-23 · 5.6';
const PORTAL_API = 'https://script.google.com/macros/s/AKfycbwEf6wxSyzMPh0vu2qoeMJnBwZHNu6IRJgCnAG1sykyuu5N4N4JEFUd_Ve_0Zlu5nME/exec';   // portal HyS: valida la clave
const ZONA = 'America/Argentina/Buenos_Aires';
const ID = {
  catalogo: '1rrYVwT83jGfPTYvgIxH9eSaVl1apqmwcoExCvyEDHSw',      // CATALOGO_CAPACITACIONES_2026 (actual)
  personas: '1t3-mjoObnPcl9qNGfAeHVPZEFtSnVrw85302LTbHddA',      // BASE_PERSONAS_CAPACITACIONES_2026 (actual)
  trabajadores: '1DvhQdXy_60KrOkO6gu9sryrJMZHO3dBZvL91FdI2oII'   // BASE DE TRABAJADORES · Sistema HyS
};
const AVISOS_DESDE = '2026-10-01';   // lo cargado antes queda como histórico y no genera avisos
const MIN_CACHE = 15;                // minutos que se guarda el tablero
const MIN_PERSONAS_SEMAFORO = 3;     // servicios con menos personas van aparte (nombres a unificar)

// ------------------------------------------------------------------ Menú del libro
function onOpen() {
  SpreadsheetApp.getUi().createMenu('Capacitaciones HyS')
    .addItem('Actualizar tablero ahora', 'menuActualizar')
    .addItem('Procesar CARGA_MANUAL', 'menuProcesarCarga')
    .addItem('Completar filas cargadas a mano', 'menuCompletar')
    .addItem('Dictados y sus links', 'menuDictados')
    .addItem('Links del registro nuevo', 'menuLinks')
    .addSeparator()
    .addItem('Certificados: dar código a los pendientes', 'menuEmitirPendientes')
    .addItem('Certificados: cerrar un programa', 'menuCerrarPrograma')
    .addItem('Certificados: PDF de la fila seleccionada', 'menuPdfSeleccionado')
    .addItem('Certificados: link y QR de «Mis certificados»', 'menuMisCertificados')
    .addItem('Certificados: rehacer los de 2026 (desde abril)', 'menuReemision2026')
    .addItem('Certificados: armar todos los PDF (segundo plano)', 'menuPdfsSegundoPlano')
    .addSeparator()
    .addItem('Agenda: abrir horarios de las próximas 4 semanas', 'menuAbrirHorarios')
    .addItem('Agenda: completar filas cargadas a mano', 'menuCompletarAgenda')
    .addItem('Agenda: activar recordatorios automáticos', 'menuRecordatorios')
    .addItem('Cumplimiento: recalcular ahora', 'menuCumplimiento')
    .addSeparator()
    .addItem('Migrar datos 2026 (una sola vez)', 'menuMigrar')
    .addItem('Migrar evaluaciones y preguntas (una sola vez)', 'menuMigrarEvaluaciones')
    .addItem('Agenda y cumplimiento: preparar hojas y pasar datos (una sola vez)', 'menuMigrarF7')
    .addSeparator()
    .addItem('Ayuda', 'menuAyuda')
    .addToUi();
}

function menuActualizar() {
  const t = tablero_(true);
  SpreadsheetApp.getActive().toast('Listo: ' + t.kpi.personas + ' personas · ' + t.kpi.registros + ' registros · ' + t.atencion.length + ' aviso(s).', 'Tablero actualizado', 8);
}

function menuAyuda() {
  const html = '<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.5;color:#1B2A31">' +
    '<h3 style="color:#0D313F;margin:0 0 8px">Capacitaciones HyS · ayuda</h3>' +
    '<p><b>Actualizar tablero ahora</b>: recalcula el tablero y lo escribe en la hoja TABLERO. El portal lo guarda ' + MIN_CACHE + ' minutos.</p>' +
    '<p><b>Procesar CARGA_MANUAL</b>: pasa a REGISTROS lo anotado a mano cuando el portal no funcionó.</p>' +
    '<p><b>Completar filas cargadas a mano</b>: si el portal no anda, cargá la capacitación en CATALOGO, las preguntas en PREGUNTAS o el dictado en DICTADOS (código, fecha dd/mm/aaaa, hora, modalidad, lugar; en LINK_INSCRIPCION escribí Sí si lleva inscripción). Esta opción les pone código, links, QR, ventana de 48 h y cupo.</p>' +
    '<p><b>Dictados y sus links</b>: lista los dictados recientes y próximos con el link de registro, el de inscripción y el QR.</p>' +
    '<p><b>Anular una inscripción desde el libro</b>: en INSCRIPCIONES poné ESTADO = Anulada, escribí el MOTIVO y en ANULADA_POR «HyS».</p>' +
    '<p><b>Certificados</b>: cada asistencia o aprobación recibe un código CHYS al registrarse; el PDF se arma la primera vez que alguien lo descarga y queda en la carpeta CERTIFICADOS_HYS. «Dar código a los pendientes» sirve para lo cargado por CARGA_MANUAL. «Cerrar un programa» emite la aprobación (asistencia mínima + evaluación final) o la participación. «PDF de la fila seleccionada»: parate en una fila de la hoja CERTIFICADOS. Para anular: ESTADO = Anulado y el motivo en MOTIVO_ANULACION (nunca borrar la fila).</p>' +
    '<p><b>Agenda</b>: la página pública es ' + AGENDA_WEB + '. Cada persona se anota a una clase abierta con DNI y correo; las jefaturas, coordinaciones y A/C reservan un horario para su servicio con su DNI. Si quien reserva no está en JEFATURAS o faltan menos de ' + HS_CONFIRMA + ' h, queda Pendiente y lo confirmás vos. «Abrir horarios» genera los horarios dentro de las franjas de la hoja FRANJAS. Si cargás a mano una reserva o clase abierta en AGENDA, usá «Completar filas cargadas a mano». Nunca se borra una fila: ESTADO y MOTIVO.</p>' +
    '<p><b>Recordatorios</b>: salen solos 7, 2 y 1 día antes desde ' + CORREO_HYS + ' (también la confirmación y el aviso si suspendés). Cada envío queda en _MENSAJES. Necesitan «Enviar como» configurado en el Gmail de esta cuenta.</p>' +
    '<p><b>Cumplimiento</b>: se calcula con la nómina de HZT y HMH de la base de trabajadores, la MATRIZ y los REGISTROS vigentes. «Recalcular ahora» actualiza las hojas CUMPLIMIENTO y CUMPLIMIENTO_PERSONAS. Los nombres de servicio se agrupan con SERVICIOS_EQUIV y cada servicio se asigna a su jefatura con JEFATURAS.</p>' +
    '<p><b>Links del registro nuevo</b>: abre el registro de cada capacitación para probarlo.</p>' +
    '<p><b>Clave</b>: no hay que configurar nada. El libro le pregunta al portal si la clave con la que entraste es correcta.</p>' +
    '<p><b>Si el portal no funciona</b>: la hoja TABLERO tiene los mismos datos. Las altas, dictados y asistencias se anotan en CATALOGO, DICTADOS y CARGA_MANUAL (ver hoja INICIO).</p>' +
    '<p><b>Avisos</b>: solo sobre lo cargado desde el ' + AVISOS_DESDE.split('-').reverse().join('/') + '. Lo anterior queda como histórico.</p>' +
    '<p style="color:#4F616B">Versión ' + VERSION_CAP + '</p></div>';
  SpreadsheetApp.getUi().showModalDialog(HtmlService.createHtmlOutput(html).setWidth(520).setHeight(520), 'Ayuda');
}

// ------------------------------------------------------------------ Aplicación web (la usa el portal)
function doGet(e) {
  const p = (e && e.parameter) || {};
  if (p.a) return agendaPagina_(p);
  if (p.av) return registroPagina_(p);   // capacitación autoadministrada con video (?av=CODIGO)
  if (p.v || p.m) return certPagina_(p);
  if (p.k || p.c || p.d || p.i) return registroPagina_(p);
  return salida_({ ok: true, sistema: 'Capacitaciones HyS', version: VERSION_CAP });
}

function doPost(e) {
  try {
    const q = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (!claveOk_(q.clave)) return salida_({ ok: false, error: 'clave' });
    const d = q.datos || {};
    preparar_(); try { prepararF7_(); } catch (e) { /* las hojas de la agenda se preparan desde el menú */ }
    const f = ACCIONES[q.accion] || ACCIONES_F7[q.accion];
    if (!f) return salida_({ ok: false, error: 'Acción desconocida: ' + q.accion });
    return salida_(f(d));
  } catch (err) {
    return salida_({ ok: false, error: String((err && err.message) || err) });
  }
}

// Acciones del portal (todas piden la clave del portal)
const ACCIONES = {
  c_ping: () => ({ ok: true, version: VERSION_CAP }),
  c_tablero: d => tablero_(!!d.fresco),
  c_catalogo: () => ({ ok: true, lista: capCatalogo_(), listas: listasAdmin_(), firmantes: firmantes_() }),
  c_cap: d => capFicha_(d.codigo),
  c_cap_guardar: d => capGuardar_(d),
  c_cap_estado: d => capEstado_(d),
  c_banco: d => ({ ok: true, lista: bancoDe_(d.codigo || '') }),
  c_preg_control: d => controlPreguntas_(normPreguntas_(d.preguntas && d.preguntas.length ? d.preguntas : parsePegado_(d.texto)), num_(d.porIntento), d.codigo || ''),
  c_preg_leer: d => ({ ok: true, preguntas: normPreguntas_(parsePegado_(d.texto)) }),
  c_preg_usar: d => preguntaUsar_(d),
  c_eval_guardar: d => evalGuardar_(d),
  c_dictados: d => dictadosLista_(d),
  c_dictado_guardar: d => dictadoGuardar_(d),
  c_dictado_estado: d => dictadoEstado_(d),
  c_inscriptos: d => inscriptos_(d.id),
  c_insc_anular: d => inscAnular_(d, 'HyS'),
  c_insc_consulta: d => inscConsulta_(d),
  c_asistente_agregar: d => asistenteAgregar_(d),
  c_firmantes: () => ({ ok: true, lista: firmantes_() }),
  c_firmante_guardar: d => firmanteGuardar_(d),
  c_certs_dictado: d => certsDictado_(d.id),
  c_cert_pdf: d => ({ ok: true, url: generarPdf_(d.codigo) }),
  c_cert_anular: d => certAnular_(d),
  c_cert_regenerar: d => certRehacer_(d),
  c_programa_preview: d => programaVista_(d.id, d.desde),
  c_programa_cerrar: d => programaCerrar_(d.id, d.desde),
  c_disertante_guardar: d => disertanteGuardar_(d),
  c_disertante_emitir: d => disertanteEmitir_(d),
  c_lote_pdf: d => certLoteDictado_(d),
  c_mis_cert_link: () => ({ ok: true, link: CERT_WEB, qr: qrDe_(CERT_WEB) })
};

function salida_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

// La clave es la misma del Portal HyS: se le pregunta al portal si es correcta (no se guarda en ningún lado).
// Una clave ya confirmada se recuerda 6 horas (solo su huella, no la clave).
function claveOk_(c) {
  c = String(c || ''); if (!c) return false;
  const huella = Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, c));
  const cache = CacheService.getScriptCache();
  if (cache.get('ok_' + huella)) return true;
  try {
    const r = UrlFetchApp.fetch(PORTAL_API, { method: 'post', contentType: 'text/plain', payload: JSON.stringify({ accion: 'p_ping', clave: c, est: '', datos: {} }), muteHttpExceptions: true, followRedirects: true });
    const j = JSON.parse(r.getContentText());
    if (j && j.ok) { cache.put('ok_' + huella, '1', 21600); return true; }
  } catch (e) { /* portal sin respuesta: se rechaza */ }
  return false;
}

// ------------------------------------------------------------------ Tablero
function tablero_(fresco) {
  const cache = CacheService.getScriptCache();
  if (!fresco) { const c = cache.get('tablero'); if (c) return JSON.parse(c); }
  const t = calcular_();
  try { cache.put('tablero', JSON.stringify(t), MIN_CACHE * 60); } catch (e) { /* demasiado grande para la caché: se recalcula */ }
  try { escribirHoja_(t); } catch (e) { t.avisoHoja = 'No se pudo escribir la hoja TABLERO: ' + e.message; }
  return t;
}

// ------------------------------------------------------------------ Tablero desde el libro nuevo (18/10/2026)
// Los indicadores, la participación por capacitación, los registros por mes y lo de cada establecimiento salen de las hojas
// REGISTROS, PERSONAS y CATALOGO de este libro (antes salían del tablero del sistema anterior, que ya no recibe registros).
function libroNuevoTablero_(ciclo, hoy) {
  const R = tabla_('REGISTROS'), P = tabla_('PERSONAS'), C = tabla_('CATALOGO');
  const per = {}; P.filas.forEach(r => { const o = obj_(P, r), d = soloDni_(o.DNI); if (d) per[d] = o; });
  const caps = {}; C.filas.forEach(r => { const o = obj_(C, r); if (o.CODIGO) caps[o.CODIGO] = o; });
  let nom = []; try { nom = nomina_(grupoDe_().ests); } catch (e) { nom = []; }
  const enNom = {}; nom.forEach(p => enNom[p.dni] = 1);
  const dnis = {}, pc = {}, porMes = {}, est = {}, ult = {}; let regs = 0, evals = 0, aprob = 0;
  const hasta60 = iso_(new Date(Date.now() + 60 * 864e5));
  R.filas.forEach(r => {
    const o = obj_(R, r); if (/anulad|reemplaz/i.test(o.ESTADO || '')) return;
    const d = soloDni_(o.DNI), f = isoDe_(o.FECHA), c = String(o.CODIGO || '').trim(); if (!d || !c) return;
    if (f && (f < ciclo.desde || f > ciclo.hasta)) return;
    regs++; dnis[d] = 1; if (f) { const k = f.slice(0, 7); porMes[k] = (porMes[k] || 0) + 1; }
    const p = pc[c] = pc[c] || { registros: 0, personas: {}, aprobados: {}, evals: 0 };
    p.registros++; p.personas[d] = 1;
    const esEval = /^evaluaci/i.test(norm_(o.TIPO)), si = siNo_(o.APROBADO);
    if (esEval && /^(s[ií]|no)$/i.test(String(o.APROBADO || '').trim())) { evals++; if (si) aprob++; p.evals++; }   // evaluaciones con resultado (aprobó o no)
    if (si) p.aprobados[d] = 1;
    const ps = per[d] || {}, e = String(ps.ESTABLECIMIENTO || '').trim(), pub = String(ps.PUBLICO || '').trim();
    const ek = !vacio_(e) ? e : /estudiant/i.test(pub) ? 'Estudiantes' : /extern/i.test(pub) ? 'Profesionales externos' : 'Sin establecimiento';
    const x = est[ek] = est[ek] || { personas: {}, registros: 0, caps: {} }; x.registros++; x.caps[c] = (x.caps[c] || 0) + 1;
    const pp = x.personas[d] = x.personas[d] || { caps: {}, ultima: '' }; pp.caps[c] = (pp.caps[c] || 0) + 1; if (f && f > pp.ultima) pp.ultima = f;
    if (enNom[d]) { const v = /no vence/i.test(o.VENCE || '') ? '9999-12-31' : (isoDe_(o.VENCE) || ''); const k = d + '|' + c; if (v && (!ult[k] || v > ult[k])) ult[k] = v; }
  });
  const pubN = { 'Red Chubut': 0, 'Profesionales externos': 0, 'Estudiantes': 0, 'Red Trelew': 0 };
  Object.keys(dnis).forEach(d => { const pub = String((per[d] || {}).PUBLICO || '').trim(); if (pubN[pub] != null) pubN[pub]++; });
  const conNom = nom.filter(p => dnis[p.dni]).length;
  let venc = 0, v60 = 0; Object.keys(ult).forEach(k => { const v = ult[k]; if (v < hoy) venc++; else if (v <= hasta60) v60++; });
  const nombre = c => caps[c] ? nombreCorto_({ codigo: c, nombre: caps[c].NOMBRE }) + (num_(caps[c].ENCUENTROS) > 1 ? ' (programa)' : '') : c;
  return {
    kpi: { personas: Object.keys(dnis).length, registros: regs, personal: nom.length, personalCon: conNom, cobertura: nom.length ? Math.round(100 * conNom / nom.length) : 0,
      aprobacion: evals ? Math.round(100 * aprob / evals) : 0, redChubut: pubN['Red Chubut'], externos: pubN['Profesionales externos'], estudiantes: pubN['Estudiantes'], redTrelew: pubN['Red Trelew'], vencidos: venc, vencen60: v60 },
    participacion: Object.keys(pc).map(c => ({ nombre: nombre(c), codigo: c, registros: pc[c].registros, personas: Object.keys(pc[c].personas).length, aprobados: (pc[c].evals || Object.keys(pc[c].aprobados).length) ? Object.keys(pc[c].aprobados).length : null })).sort((a, b) => b.registros - a.registros),
    porMes: porMes,
    porEst: Object.keys(est).map(k => ({ nombre: k, nombreLargo: redEst_(k).nombre, red: redEst_(k).red, personas: Object.keys(est[k].personas).length, registros: est[k].registros,
      capacitaciones: Object.keys(est[k].caps).sort((a, b) => est[k].caps[b] - est[k].caps[a]).map(c => ({ codigo: c, nombre: nombre(c), n: est[k].caps[c] })),
      lista: Object.keys(est[k].personas).map(d => { const o = per[d] || {}, pp = est[k].personas[d]; return { dni: d, nombre: o.APELLIDOS ? String(o.APELLIDOS).trim() + ', ' + String(o.NOMBRES || '').trim() : 's/d', servicio: vacio_(o.SERVICIO) ? (vacio_(o.INSTITUCION) ? 's/d' : o.INSTITUCION) : o.SERVICIO, funcion: vacio_(o.FUNCION) ? (vacio_(o.PROFESION) ? 's/d' : o.PROFESION) : o.FUNCION, ultima: pp.ultima, caps: Object.keys(pp.caps).sort() }; }).sort((a, b) => a.nombre.localeCompare(b.nombre)) })).sort((a, b) => b.personas - a.personas)
  };
}
// Red de cada establecimiento (para el tablero por hospital): Red Trelew (HZT, HMH y sus sitios), Red Rawson (HSST y sus CAPS) u otro hospital de Chubut
let RED_EST_ = null;
function redEst_(cod) {
  if (!RED_EST_) { RED_EST_ = {}; try { const l = listasRegistro_(); l.trelew.forEach(e => RED_EST_[e[0]] = { red: 'Red Trelew', nombre: e[1] }); l.chubut.forEach(e => { if (!RED_EST_[e[0]]) RED_EST_[e[0]] = { red: /rawson|santa teresita|hsst/i.test(e[0] + ' ' + e[1]) ? 'Red Rawson' : 'Otro hospital de Chubut', nombre: e[1] }; }); } catch (e) { /* sin listas */ } }
  if (/^(Estudiantes|Profesionales externos|Sin establecimiento)$/.test(cod)) return { red: 'Sin hospital', nombre: cod };
  // 18/10/2026 (Belén): NC = Secretaría de Salud, Nivel Central (Rawson); cuenta dentro de Red Rawson
  if (/^NC$|nivel central/i.test(cod)) return { red: 'Red Rawson', nombre: 'Secretaría de Salud – Nivel Central' };
  return RED_EST_[cod] || { red: RED_TRELEW.indexOf(cod) >= 0 ? 'Red Trelew' : /rawson|hsst/i.test(cod) ? 'Red Rawson' : 'Otro hospital de Chubut', nombre: cod };
}
// Capacitaciones abiertas hoy según el catálogo de este libro (dictado abierto o siempre abierta)
function abiertasNuevas_(participacion) {
  const C = tabla_('CATALOGO'), out = [];
  C.filas.forEach(r => { const o = obj_(C, r); if (!o.CODIGO || !/^activ/i.test(o.ESTADO || '')) return;
    let a; try { a = estadoApertura_(o.CODIGO, o.SIEMPRE_ABIERTA, o.ESTADO); } catch (e) { return; } if (!a || !a.abierta) return;
    const p = participacion.find(x => x.codigo === o.CODIGO);
    out.push({ codigo: o.CODIGO, nombre: o.NOMBRE, estado: o.ESTADO, registro: String(o.REGISTRO || ''), evaluacion: true, carga: o.CARGA_HORARIA || o.HORAS_POR_ENCUENTRO, abierta: true,
      registros: p ? p.registros : 0, link: o.TOKEN ? 'https://hyslhmh-sudo.github.io/capacitaciones/?k=' + o.TOKEN : '', qr: '', encuentros: num_(o.ENCUENTROS) || 1 }); });
  return out.sort((a, b) => b.registros - a.registros);
}

function calcular_() {
  const ahora = new Date(), hoy = iso_(ahora);
  const anio = Number(hoy.slice(0, 4)), mes = Number(hoy.slice(5, 7));
  const c0 = Number(cicloDe_(hoy));   // ciclo 2026: 01/02/2026–31/03/2027 · desde 2027: 01/04–31/03 (el 01/04 empiezan los vencimientos)
  const ciclo = { nombre: String(c0), desde: cicloDesde_(c0), hasta: (c0 + 1) + '-03-31', meta: (c0 + 1) + '-03-31' };

  const libP = SpreadsheetApp.openById(ID.personas), libC = SpreadsheetApp.openById(ID.catalogo);
  const tb = hojaDe_(libP, 'TABLERO').getDataRange().getDisplayValues();
  const cu = hojaDe_(libP, 'CUMPLIMIENTO_SERVICIOS').getDataRange().getDisplayValues();
  const ag = hojaDe_(libP, 'AGENDA').getDataRange().getDisplayValues();
  const ca = hojaDe_(libC, 'CAPACITACIONES').getDataRange().getDisplayValues();

  // --- Indicadores (del tablero actual del libro de personas)
  const n = etiqueta => num_(valorDe_(tb, etiqueta));
  const kpi = {
    personas: n('Personas capacitadas'), registros: n('Registros totales'),
    personal: n('Personal NTEAR (HZT y HMH)'), personalCon: n('Personal NTEAR con al menos'),
    cobertura: n('Cobertura del personal NTEAR'), aprobacion: n('Aprobación en evaluaciones'),
    redChubut: n('Personas de la red de salud'), externos: n('Personas externas'), estudiantes: n('Estudiantes'),
    vencidos: n('Certificados vencidos'), vencen60: n('Vencen en los próximos 60'),
    matriz: num_((String((cu[1] || [])[0] || '').match(/cumplidas:\s*(\d+)/i) || [])[1])
  };
  kpi.redTrelew = Math.max(0, kpi.personas - kpi.redChubut - kpi.externos - kpi.estudiantes);
  let actualizado = (String((tb[1] || []).join(' ')).match(/actualizaci[oó]n:\s*([0-9\/: ]+)/i) || [])[1] || '';

  // --- Bloques del tablero actual
  const equiv = equivalencias_();
  const participacion = bloque_(tb, 'PARTICIPACIÓN POR CAPACITACIÓN').map(r => ({ nombre: r[0], codigo: equiv[norm_(r[0])] || (/^CAP-/i.test(r[0]) ? r[0].toUpperCase() : ''), registros: num_(r[1]), personas: num_(r[2]), aprobados: r[3] === '' ? null : num_(r[3]) }));
  const porMes = {}; bloque_(tb, 'REGISTROS POR MES').forEach(r => { if (/^\d{4}-\d{2}$/.test(r[0])) porMes[r[0]] = num_(r[1]); });
  const meses = []; for (let i = 0; i < 12; i++) { const d = new Date(c0, 1 + i, 1); const k = d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2); meses.push({ mes: k, n: porMes[k] || 0, actual: k === hoy.slice(0, 7), futuro: k > hoy.slice(0, 7), historico: k < AVISOS_DESDE.slice(0, 7) }); }
  // 18/10/2026: indicadores, participación y meses del libro nuevo (REGISTROS y PERSONAS), no del tablero del sistema anterior
  let porEst = [];
  try { const N1 = libroNuevoTablero_(ciclo, hoy); Object.assign(kpi, N1.kpi); participacion.length = 0; N1.participacion.forEach(p => participacion.push(p));
    meses.forEach(x => x.n = N1.porMes[x.mes] || 0); porEst = N1.porEst.map(e => { const c = Object.assign({}, e); delete c.lista; return c; }); actualizado = Utilities.formatDate(ahora, ZONA, 'dd/MM/yyyy HH:mm') + ' (libro CAPACITACIONES)'; }
  catch (e) { kpi.aviso = 'Indicadores del sistema anterior: ' + e.message; }

  // --- Semáforo por servicio (red Trelew; las demás redes se suman con el registro nuevo)
  // Desde la fase 7 el semáforo sale del cumplimiento nuevo (hojas JEFATURAS y MATRIZ del libro); antes, del libro actual
  const prio = prioritarios_();
  let servicios = [], establecimientos = [], f7 = null;
  try { if (tabla_('JEFATURAS').filas.some(r => r[0])) f7 = cumplimiento_(false); } catch (e) { f7 = null; }
  if (f7) {
    servicios = f7.servicios.map(g => ({ servicio: g.servicio, personal: g.personal, obligatorias: g.obligatorias, cumplidas: g.cumplidas, pct: g.pct, alDia: g.alDia, prioritario: g.prioritario || prio.some(p => norm_(g.servicio).indexOf(p) >= 0) }));
    establecimientos = [{ nombre: 'Hospital Zonal Trelew', personal: f7.kpi.personalHZT, pct: f7.kpi.pctHZT }, { nombre: 'Hospital María Humphreys', personal: f7.kpi.personalHMH, pct: f7.kpi.pctHMH }];
    kpi.matriz = f7.kpi.pct;
  } else {
    for (let i = 3; i < cu.length; i++) {
      const r = cu[i]; if (!r[0]) continue;
      const s = { servicio: r[0], personal: num_(r[1]), obligatorias: num_(r[2]), cumplidas: num_(r[3]), pct: num_(r[4]), alDia: num_(r[5]) };
      s.prioritario = prio.some(p => norm_(s.servicio).indexOf(p) >= 0);
      servicios.push(s);
    }
    for (let i = 3; i < cu.length; i++) { const r = cu[i]; if (r[7]) establecimientos.push({ nombre: r[7], personal: num_(r[8]), pct: num_(r[11]) }); }
  }
  servicios.sort((a, b) => (b.prioritario - a.prioritario) || (b.personal - a.personal));

  // --- Catálogo actual: capacitaciones abiertas
  const H = ca[0].map(h => String(h).trim());
  const col = nombre => H.indexOf(nombre);
  const cat = ca.slice(1).filter(r => r[col('ID_CAPACITACION')]).map(r => ({
    codigo: r[col('ID_CAPACITACION')], nombre: r[col('NOMBRE')], estado: r[col('ESTADO')], registro: r[col('REGISTRO')],
    evaluacion: r[col('ID_EVALUACION')], carga: r[col('CARGA_HORARIA_HS')], abierta: /^s[ií]/i.test(r[col('ABIERTA')]),
    registros: num_(r[col('ASISTENTES_2026')]), link: r[col('LINK_PARA_COMPARTIR')] || r[col('LINK_SITIO')] || r[col('LINK')],
    qr: r[col('QR')], encuentros: num_(r[col('ENCUENTROS')])
  }));
  cat.forEach(c => { const p = participacion.find(x => x.codigo === c.codigo); if (p) c.registros = p.registros; });
  const abiertas = cat.filter(c => c.abierta).sort((a, b) => b.registros - a.registros);
  try { const ab2 = abiertasNuevas_(participacion); abiertas.length = 0; ab2.forEach(x => abiertas.push(x)); } catch (e) { /* queda el catálogo anterior */ }

  // --- Próximos dictados: agenda actual + hoja DICTADOS del libro nuevo
  const hasta14 = iso_(new Date(ahora.getTime() + 14 * 864e5));
  const dictados = [];
  let libres = 0;
  if (f7) {
    // Agenda nueva: los dictados reservados o de clases abiertas ya están en DICTADOS; acá solo se cuentan los horarios libres
    try { turnos_().forEach(t => { if (t.ESTADO === 'Libre' && t.inicio > ahora && iso_(t.inicio) <= hasta14) libres++; }); } catch (e) { /* sin agenda nueva */ }
  } else if (ag.length > 1) {
    const A = ag[0].map(h => String(h).trim()), a = nombre => A.indexOf(nombre);
    ag.slice(1).forEach(r => {
      const f = isoDe_(r[a('FECHA')]); if (!f || f < hoy) return;
      const est = String(r[a('ESTADO')] || '');
      if (/cancel|suspend/i.test(est)) return;
      const cap = r[a('CAPACITACION')] || r[a('ID_CAPACITACION')];
      if (!cap) { if (/abiert/i.test(est) && f <= hasta14) libres++; return; }
      dictados.push({ fecha: f, hora: r[a('HORA_INICIO')], codigo: r[a('ID_CAPACITACION')], nombre: r[a('CAPACITACION')] || r[a('ID_CAPACITACION')], lugar: r[a('LUGAR')], modalidad: r[a('MODALIDAD')], estado: est, origen: 'Agenda actual' });
    });
  }
  const dn = hojaDe_(SpreadsheetApp.getActive(), 'DICTADOS').getDataRange().getDisplayValues();
  if (dn.length > 5) {
    const D = dn[4].map(h => String(h).trim()), d = nombre => D.indexOf(nombre);
    dn.slice(5).forEach(r => {
      const f = isoDe_(r[d('FECHA')]); if (!f || f < hoy || /cancel|suspend/i.test(r[d('ESTADO')])) return;
      dictados.push({ fecha: f, hora: r[d('HORA_INICIO')], codigo: r[d('CODIGO')], nombre: r[d('CODIGO')], lugar: r[d('LUGAR')], modalidad: r[d('MODALIDAD')], estado: r[d('ESTADO')] || 'Programado',
        organizador: r[d('ORGANIZADOR')], externa: /^s[ií]/i.test(r[d('EXTERNA')]), cupo: r[d('CUPO_PRESENCIAL')], inscripcion: !!r[d('LINK_INSCRIPCION')], observaciones: r[d('OBSERVACIONES')], origen: 'Libro nuevo' });
    });
  }
  // 18/10/2026: el nombre sale del CATALOGO de este libro (las capacitaciones nuevas, como CAP-HYS-020, no están en el catálogo anterior).
  // El aviso «falta abrirla» queda solo para las del catálogo anterior: en el libro nuevo cada dictado se abre solo (ABRE / CIERRA).
  const catN = {}; try { const CN = tabla_('CATALOGO'); CN.filas.forEach(r => { const o = obj_(CN, r); if (o.CODIGO && !catN[o.CODIGO]) catN[o.CODIGO] = o; }); } catch (e) { /* sin catálogo nuevo */ }
  dictados.forEach(x => { const n = catN[x.codigo]; if (n) { x.nombre = x.codigo + ' · ' + n.NOMBRE; return; }
    const c = cat.find(k => k.codigo && x.codigo && k.codigo === x.codigo); if (c) { x.nombre = c.codigo + ' · ' + c.nombre; x.abierta = c.abierta; } });
  dictados.sort((a, b) => (a.fecha + (a.hora || '')).localeCompare(b.fecha + (b.hora || '')));

  // --- Requiere atención: solo lo que se carga o se dicta desde AVISOS_DESDE
  const at = [];
  abiertas.filter(c => /evaluaci/i.test(c.registro) && !c.evaluacion).forEach(c => at.push(['er', c.codigo + ' abierta sin evaluación', c.nombre + ': se registra con evaluación y no tiene ninguna cargada']));
  abiertas.filter(c => !c.carga).forEach(c => at.push(['wa', c.codigo + ' sin carga horaria', c.nombre + ': el certificado no puede decir las horas']));
  dictados.filter(x => x.fecha <= hasta14 && x.codigo && x.abierta === false).forEach(x => at.push(['wa', x.codigo + ' · dictado el ' + dma_(x.fecha), x.nombre + ': falta abrirla']));
  if (kpi.vencidos) at.push(['er', kpi.vencidos + ' capacitación(es) vencida(s)', 'Personal de la red Trelew']);
  if (kpi.vencen60) at.push(['wa', kpi.vencen60 + ' vencen en los próximos 60 días', 'Personal de la red Trelew']);
  if (!kpi.vencidos && !kpi.vencen60) at.push(['av', 'Sin vencimientos en los próximos 60 días', 'Personal de la red Trelew']);
  const ord = { er: 0, wa: 1, av: 2 }; at.sort((a, b) => ord[a[0]] - ord[b[0]]);

  return {
    ok: true, version: VERSION_CAP, calculado: ahora.toISOString(), actualizadoOrigen: actualizado, ciclo: ciclo, avisosDesde: AVISOS_DESDE,
    kpi: kpi, atencion: at.map(x => ({ nivel: x[0], titulo: x[1], detalle: x[2] })),
    cumplimiento: f7 ? { sinIncendio: f7.kpi.sinIncendio, nunca: f7.kpi.nunca, meta: f7.kpi.meta, diasMeta: f7.kpi.diasMeta, pctHZT: f7.kpi.pctHZT, pctHMH: f7.kpi.pctHMH } : null,
    semaforo: { red: 'Red Trelew', minPersonas: MIN_PERSONAS_SEMAFORO, servicios: servicios, establecimientos: establecimientos, redesSinDatos: ['Red Rawson', 'Otros hospitales de Chubut'], porEstablecimiento: porEst },
    abiertas: abiertas.map(c => ({ codigo: c.codigo, nombre: c.nombre, registros: c.registros, encuentros: c.encuentros, link: c.link, qr: c.qr })),
    dictados: dictados.slice(0, 8), libres14: libres,
    publico: [['Red Trelew', kpi.redTrelew], ['Red Chubut', kpi.redChubut], ['Profesionales externos', kpi.externos], ['Estudiantes', kpi.estudiantes]],
    meses: meses, participacion: participacion.sort((a, b) => b.registros - a.registros)
  };
}

// ------------------------------------------------------------------ Hoja TABLERO (respaldo en Sheets)
function escribirHoja_(t) {
  const lib = SpreadsheetApp.getActive();
  let h = lib.getSheetByName('TABLERO');
  if (!h) { h = lib.insertSheet('TABLERO', 1); h.setTabColor('#5894A7'); }
  h.clear();
  const filas = [];
  const add = (...v) => filas.push(v.concat(['', '', '', '', '']).slice(0, 5));
  add('TABLERO DE CAPACITACIONES · ciclo ' + t.ciclo.nombre + ' (' + dma_(t.ciclo.desde) + ' al ' + dma_(t.ciclo.hasta) + ')');
  add('Lo arma el código del libro (menú Capacitaciones HyS › Actualizar tablero ahora). Es la misma información que muestra el portal. Calculado el ' + Utilities.formatDate(new Date(t.calculado), ZONA, 'dd/MM/yyyy HH:mm') + '. Avisos solo desde el ' + dma_(t.avisosDesde) + '.');
  add(); add();
  add('INDICADOR', 'VALOR', 'DETALLE');
  add('Personas capacitadas', t.kpi.personas, 'personas distintas');
  add('Registros', t.kpi.registros, 'asistencias y evaluaciones');
  add('Aprobación', t.kpi.aprobacion + ' %', 'de las evaluaciones rendidas');
  add('Cobertura personal red Trelew', t.kpi.cobertura + ' %', t.kpi.personalCon + ' de ' + t.kpi.personal + ' con al menos una');
  add('Matriz cumplida', t.kpi.matriz + ' %', 'obligatorias · meta al ' + dma_(t.ciclo.meta));
  add();
  add('REQUIERE ATENCIÓN', 'NIVEL', 'DETALLE');
  t.atencion.forEach(a => add(a.titulo, { er: 'Urgente', wa: 'Pronto', av: 'Aviso' }[a.nivel], a.detalle));
  add();
  add('SEMÁFORO · ' + t.semaforo.red, 'PERSONAL', '% OBLIGATORIAS CUMPLIDAS', 'AL DÍA', 'PRIORITARIO');
  const chicos = t.semaforo.servicios.filter(s => s.personal < MIN_PERSONAS_SEMAFORO);
  t.semaforo.servicios.filter(s => s.personal >= MIN_PERSONAS_SEMAFORO).forEach(s => add(s.servicio, s.personal, s.pct + ' %', s.alDia, s.prioritario ? 'Sí' : ''));
  if (chicos.length) add('Y ' + chicos.length + ' servicios con 1 o 2 personas: nombres a unificar (los lista el portal)');
  add();
  add('CAPACITACIONES ABIERTAS', 'REGISTROS', 'LINK');
  t.abiertas.forEach(c => add(c.codigo + ' · ' + c.nombre, c.registros, c.link || 's/d'));
  add();
  add('PRÓXIMOS DICTADOS', 'FECHA', 'LUGAR', 'ESTADO');
  t.dictados.forEach(d => add(d.nombre || 's/d', dma_(d.fecha) + (d.hora ? ' ' + d.hora : ''), d.lugar || 's/d', d.estado || ''));
  add('Horarios libres para servicios (14 días)', t.libres14);
  h.getRange(1, 1, filas.length, 5).setValues(filas);
  h.getRange(1, 1).setFontSize(14).setFontWeight('bold').setFontColor('#0D313F');
  h.getRange(2, 1).setFontSize(9).setFontStyle('italic').setFontColor('#4F616B');
  filas.forEach((f, i) => { if (/^[A-ZÁÉÍÓÚÑ ·]+$/.test(String(f[0]).split(' · ')[0]) && f[1] !== '' && i > 1) h.getRange(i + 1, 1, 1, 5).setBackground('#0D313F').setFontColor('#FFFFFF').setFontWeight('bold'); });
  h.setColumnWidth(1, 420); h.setColumnWidths(2, 4, 170); h.setFrozenRows(5);
}

// ------------------------------------------------------------------ Utilidades
function hojaDe_(lib, nombre) { const h = lib.getSheetByName(nombre); if (!h) throw new Error('Falta la hoja ' + nombre + ' en ' + lib.getName()); return h; }
function norm_(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim(); }
function num_(v) { const m = String(v == null ? '' : v).replace(/\./g, '').replace(',', '.').match(/-?\d+(\.\d+)?/); return m ? Number(m[0]) : 0; }
function iso_(d) { return Utilities.formatDate(d, ZONA, 'yyyy-MM-dd'); }
function dma_(s) { return s ? String(s).slice(0, 10).split('-').reverse().join('/') : ''; }
function isoDe_(v) {
  const s = String(v || '').trim(); let m;
  if ((m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/))) return m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2);
  if ((m = s.match(/^(\d{4})-(\d{2})-(\d{2})/))) return m[0];
  return '';
}
// Valor a la derecha de la celda cuya etiqueta empieza con el texto dado
function valorDe_(v, etiqueta) {
  const e = norm_(etiqueta);
  for (let i = 0; i < v.length; i++) for (let j = 0; j < v[i].length - 1; j++) if (norm_(v[i][j]).indexOf(e) === 0) return v[i][j + 1];
  return '';
}
// Filas de una tabla que empieza debajo de un título (salta la fila de encabezados; termina en la primera fila vacía)
function bloque_(v, titulo) {
  const t = norm_(titulo);
  for (let i = 0; i < v.length; i++) for (let j = 0; j < v[i].length; j++) if (t && norm_(v[i][j]).indexOf(t) === 0) {
    const out = [];
    for (let k = i + 2; k < v.length && String(v[k][j]).trim() !== ''; k++) out.push(v[k].slice(j, j + 4).map(x => String(x).trim()));
    return out;
  }
  return [];
}
// Servicios prioritarios: hoja _LISTAS, columna SERVICIOS_PRIORITARIOS (se editan ahí)
function prioritarios_() {
  const h = SpreadsheetApp.getActive().getSheetByName('_LISTAS');
  if (h) {
    const v = h.getDataRange().getDisplayValues(), c = (v[4] || []).indexOf('SERVICIOS_PRIORITARIOS');
    if (c >= 0) { const l = v.slice(5).map(r => norm_(r[c])).filter(Boolean); if (l.length) return l; }
  }
  return ['laboratorio', 'citogenetica', 'morgue', 'terapia intensiva', 'clinica medica', 'pediatria'];
}
// Equivalencias entre los nombres del tablero anterior y los códigos: hoja _LISTAS, columnas NOMBRE_EN_TABLERO_ANTERIOR y CODIGO
function equivalencias_() {
  const out = {}, h = SpreadsheetApp.getActive().getSheetByName('_LISTAS'); if (!h) return out;
  const v = h.getDataRange().getDisplayValues(), a = (v[4] || []).indexOf('NOMBRE_EN_TABLERO_ANTERIOR'), b = (v[4] || []).indexOf('CODIGO');
  if (a < 0 || b < 0) return out;
  v.slice(5).forEach(r => { if (r[a] && r[b]) out[norm_(r[a])] = String(r[b]).trim().toUpperCase(); });
  return out;
}

// =====================================================================
// FASE 4 · REGISTRO PÚBLICO, MIGRACIÓN Y CARGA MANUAL
// El registro se abre con la dirección de la aplicación web + ?k=TOKEN (o ?c=CODIGO).
// Mientras no se haga el cambio de sistema, los links y QR de siempre siguen yendo al sistema actual.
// =====================================================================
const REGISTRO_URL = 'https://script.google.com/macros/s/AKfycbxXz2AuN9nx5JkiNVI0LFYpEG-0ciYTXH9pN6QnO3SIaIltljCi8sbRB4PwiDx9Jf4Ugw/exec';   // dirección de la implementación publicada
const RED_TRELEW = ['HZT', 'HMH'];   // la red Trelew: estos establecimientos y sus sitios (CAPS, dispositivos)
const ID_COMUN = '1rjKzrfo3KGTyKgyaCEKV0B15ZSi8b1j0zIAY8wAgYwQ';
const PROVINCIAS = ['Buenos Aires', 'Catamarca', 'Chaco', 'Chubut', 'Ciudad Autónoma de Buenos Aires', 'Córdoba', 'Corrientes', 'Entre Ríos', 'Formosa', 'Jujuy', 'La Pampa', 'La Rioja', 'Mendoza', 'Misiones', 'Neuquén', 'Río Negro', 'Salta', 'San Juan', 'San Luis', 'Santa Cruz', 'Santa Fe', 'Santiago del Estero', 'Tierra del Fuego', 'Tucumán'];
const PAISES = ['Argentina', 'Bolivia', 'Brasil', 'Chile', 'Colombia', 'Costa Rica', 'Cuba', 'Ecuador', 'El Salvador', 'España', 'Guatemala', 'Honduras', 'México', 'Nicaragua', 'Panamá', 'Paraguay', 'Perú', 'República Dominicana', 'Uruguay', 'Venezuela', 'Otro'];
const PUBLICOS = { trelew: 'Red Trelew', chubut: 'Red Chubut', est: 'Estudiantes', ext: 'Profesionales externos' };

function registroPagina_(p) {
  const t = HtmlService.createTemplateFromFile('Registro');
  t.k = String(p.k || '').replace(/[^A-Za-z0-9_-]/g, '');
  t.c = String(p.c || '').replace(/[^A-Za-z0-9_-]/g, '');
  t.d = String(p.d || '').replace(/[^A-Za-z0-9_-]/g, '');
  t.i = String(p.i || '').replace(/[^A-Za-z0-9_-]/g, '');
  t.av = String(p.av || '').replace(/[^A-Za-z0-9_-]/g, '');
  return t.evaluate().setTitle('Capacitaciones HyS · Registro')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ------------------------------------------------------------------ Tablas del libro (encabezados en la fila 5)
// Memoria de lectura: solo durante la generación de PDF en lote (hojas que ese proceso no modifica)
let MEMO_ON = false; const MEMO_ = {}, SOLO_LECTURA = ['CATALOGO', 'PERSONAS', '_FIRMANTES', 'DICTADOS', '_LISTAS', 'TODOS', 'ESTABLECIMIENTOS', 'SITIOS'];
function tabla_(nombre, lib) {
  if (MEMO_ON && SOLO_LECTURA.indexOf(nombre) >= 0) { const k = 'T|' + (lib ? lib.getId() : '') + '|' + nombre; if (!MEMO_[k]) { MEMO_ON = false; try { MEMO_[k] = tabla_(nombre, lib); } finally { MEMO_ON = true; } } return MEMO_[k]; }
  const sh = hojaDe_(lib || SpreadsheetApp.getActive(), nombre);
  const ult = Math.max(sh.getLastRow(), 5), col = Math.max(sh.getLastColumn(), 1);
  const v = sh.getRange(1, 1, ult, col).getDisplayValues();
  const H = v[4].map(x => String(x).trim());
  return { sh: sh, H: H, filas: v.slice(5), i: n => H.indexOf(n) };
}
function filaDe_(T, obj_) { return T.H.map(h => (obj_[h] === undefined || obj_[h] === null) ? '' : obj_[h]); }
function agregar_(T, objs) {
  if (!objs.length) return;
  const desde = Math.max(T.sh.getLastRow(), 5) + 1;
  T.sh.getRange(desde, 1, objs.length, T.H.length).setValues(objs.map(o => filaDe_(T, o)));
}
function ahoraTxt_() { return Utilities.formatDate(new Date(), ZONA, 'dd/MM/yyyy HH:mm:ss'); }
function sd_(v) { v = String(v == null ? '' : v).trim(); return v ? v : 's/d'; }
function vacio_(v) { v = String(v == null ? '' : v).trim(); return !v || v === 's/d'; }
function soloDni_(v) { let d = String(v || '').replace(/\D/g, ''); if (d.length === 11) d = d.slice(2, 10); return d.replace(/^0+/, ''); }
function cicloDe_(iso_) { const y = Number(iso_.slice(0, 4)), m = Number(iso_.slice(5, 7)); if (y <= 2026) return String(m >= 2 ? y : y - 1); return String(m >= 4 ? y : y - 1); }   // hasta 2026: feb–ene · ciclo 2026 extendido al 31/03/2027 · desde 2027: abr–mar
function cicloDesde_(c0) { return Number(c0) <= 2026 ? c0 + '-02-01' : c0 + '-04-01'; }
function masDoce_(iso_) { const d = new Date(Number(iso_.slice(0, 4)), Number(iso_.slice(5, 7)) - 1 + 12, Number(iso_.slice(8, 10))); return iso2_(d); }
function iso2_(d) { return Utilities.formatDate(d, ZONA, 'yyyy-MM-dd'); }
function aviso_(tipo, hoja_, ref, detalle) {
  agregar_(tabla_('_AVISOS'), [{ ID_AVISO: 'AVI-' + Utilities.formatDate(new Date(), ZONA, 'yyyyMMdd-HHmmss') + '-' + Math.floor(Math.random() * 900 + 100), FECHA: ahoraTxt_(), TIPO: tipo, HOJA: hoja_, REFERENCIA: ref, DETALLE: detalle, ESTADO: 'Pendiente' }]);
}
function historial_(quien, hoja_, id, campo, antes, despues, motivo) {
  agregar_(tabla_('_HISTORIAL'), [{ FECHA: ahoraTxt_(), QUIEN: quien, HOJA: hoja_, ID: id, CAMPO: campo, ANTES: antes, DESPUES: despues, MOTIVO: motivo }]);
}
function enmascarar_(m) {
  m = String(m || ''); const a = m.split('@'); if (a.length !== 2 || vacio_(m)) return '';
  const u = a[0], d = a[1];
  return u.slice(0, 1) + '•••' + (u.length > 2 ? u.slice(-1) : '') + '@' + d.slice(0, 1) + '•••' + d.slice(d.lastIndexOf('.'));
}
function correoOk_(m) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(m || '').trim()); }
function listaCol_(T, nombre) { const c = T.i(nombre); return c < 0 ? [] : T.filas.map(r => String(r[c]).trim()).filter(Boolean); }

// ------------------------------------------------------------------ Datos para la página: capacitación + listas
// k: TOKEN de la capacitación (o de una evaluación, links viejos) · c: CODIGO · d: ID_DICTADO (link del dictado)
function regInicio(k, c, d, av) {
  preparar_();
  if (av) { c = av; k = ''; d = ''; }
  const cat = tabla_('CATALOGO'), i = cat.i;
  let r = null, evTok = '', dic = null;
  if (d) { const D = tabla_('DICTADOS'), x = D.filas.find(f => f[D.i('ID_DICTADO')] === d); if (!x) return { ok: false, error: 'No encontramos este dictado. Revisá el link o el QR.' }; dic = obj_(D, x); c = dic.CODIGO; }
  if (k) {
    r = cat.filas.find(x => x[i('TOKEN')] === k) || null;
    if (!r) { const e = evaluaciones_().find(o => o.TOKEN === k); if (e) { evTok = e.ID_EVALUACION; c = e.CODIGO; } }
  }
  if (!r && c) r = cat.filas.find(x => x[i('CODIGO')] === c);
  if (!r) return { ok: false, error: 'No encontramos esta capacitación. Revisá el link o el QR.' };
  const cap = { codigo: r[i('CODIGO')], nombre: r[i('NOMBRE')], registro: r[i('REGISTRO')], encuentros: num_(r[i('ENCUENTROS')]) || 1, carga: r[i('CARGA_HORARIA')], estado: r[i('ESTADO')], version: r[i('VERSION')], vence: r[i('VENCE')] };
  let ab, videos = null;
  if (av) {   // autoadministrada: abierta siempre que la capacitación esté activa y tenga videos en la hoja VIDEOS del sitio
    videos = videosDe_(cap.codigo);
    if (!videos.length) return { ok: false, error: 'Esta capacitación no tiene videos cargados. Avisale a Higiene y Seguridad.' };
    const hv = horasVideo_(cap.codigo); if (hv) cap.carga = hv;
    ab = /^activ/i.test(cap.estado || '') ? { abierta: true, idDictado: VIDEO_DIC, encuentro: 1, texto: 'Autoadministrada', video: true } : { abierta: false, texto: 'Esta capacitación no está activa.' };
  } else ab = dic ? aperturaDictado_(dic, cap.estado) : estadoApertura_(cap.codigo, r[i('SIEMPRE_ABIERTA')], cap.estado);
  const ev = /evaluaci/i.test(cap.registro) ? evalDe_(cap.codigo, evTok) : null;
  return { ok: true, cap: cap, abierta: ab, evaluacion: ev ? ev.ID_EVALUACION : '', listas: listasRegistro_(), videos: videos ? videos.map(v => ({ id: v.id, titulo: v.titulo })) : null };
}
function estadoApertura_(codigo, siempre, estado) {
  if (!/^activ/i.test(estado || '')) return { abierta: false, texto: 'Esta capacitación no está activa.' };
  const D = tabla_('DICTADOS');
  for (const r of D.filas) {
    const o = obj_(D, r); if (o.CODIGO !== codigo || !isoDe_(o.FECHA)) continue;
    const a = aperturaDictado_(o, estado); if (a.abierta) return a;
  }
  if (siNo_(siempre)) return { abierta: true, idDictado: 'PERMANENTE', encuentro: 1, texto: 'Siempre abierta' };
  try { if (videosDe_(codigo).length) return { abierta: false, texto: 'Esta capacitación se hace en línea con el video. Entrá desde hyslhmh-sudo.github.io/capacitaciones/?av=' + codigo + ' o desde la sección Videos del sitio de HyS.' }; } catch (e) { /* sin videos: mensaje común */ }
  return { abierta: false, texto: 'Esta capacitación no está abierta en este momento.' };
}
function fechaHora_(s) {
  const m = String(s).match(/(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/);
  if (m) return Utilities.parseDate(m[1] + '/' + m[2] + '/' + m[3] + ' ' + (m[4] || '0') + ':' + (m[5] || '00'), ZONA, 'd/M/yyyy H:mm');   // hora de Argentina, sin depender de la zona del proyecto
  const d = new Date(s); return isNaN(d) ? new Date(0) : d;
}
function listasRegistro_() {
  const cache = CacheService.getScriptCache(), g = cache.get('listasReg'); if (g) return JSON.parse(g);
  const L = tabla_('_LISTAS'), libC = SpreadsheetApp.openById(ID_COMUN);
  const E = tabla_('ESTABLECIMIENTOS', libC), S = tabla_('SITIOS', libC);
  const trelew = [];
  RED_TRELEW.forEach(cod => { const e = E.filas.find(r => r[E.i('CODIGO')] === cod); if (e) trelew.push([cod, e[E.i('NOMBRE_CORTO')] || cod]); });
  S.filas.filter(r => RED_TRELEW.indexOf(r[S.i('CODIGO')]) >= 0 && !/^edificio/i.test(r[S.i('TIPO')])).forEach(r => { const n = r[S.i('NOMBRE_OFICIAL')] || r[S.i('SITIO')]; trelew.push([r[S.i('CODIGO')] + '|' + n, n + ' (' + r[S.i('CODIGO')] + ')']); });
  const chubut = E.filas.filter(r => r[E.i('CODIGO')] && RED_TRELEW.indexOf(r[E.i('CODIGO')]) < 0).map(r => [r[E.i('CODIGO')], r[E.i('NOMBRE_OFICIAL')]]).sort((a, b) => a[1].localeCompare(b[1]));
  const out = {
    trelew: trelew, chubut: chubut,
    servicios: listaCol_(L, 'SERVICIOS').filter(x => x !== 'Otra'),
    funciones: listaCol_(L, 'FUNCIONES').filter(x => x !== 'Otra'),
    detalle: { 'Enfermero/a': listaCol_(L, 'DETALLE_ENFERMERO'), 'Profesional de salud no médico': listaCol_(L, 'DETALLE_PROFESIONAL_NO_MEDICO'), 'Técnico/a': listaCol_(L, 'DETALLE_TECNICO'), 'Cocina': listaCol_(L, 'DETALLE_COCINA') },
    vinculos: listaCol_(L, 'VINCULOS'), empresas: ['SOMI', 'MAREM', 'Star Union', 'SI-AL'],
    profesiones: listaCol_(L, 'PROFESIONES').filter(x => x !== 'Otra'), carreras: listaCol_(L, 'CARRERAS').filter(x => x !== 'Otra'),
    provincias: PROVINCIAS, paises: PAISES
  };
  cache.put('listasReg', JSON.stringify(out), 3600);
  return out;
}

// ------------------------------------------------------------------ Buscar a la persona (devuelve datos enmascarados)
function regBuscar(q) {
  const doc = q.pais && q.pais !== 'Argentina' ? String(q.doc || '').replace(/[\s.]/g, '').toUpperCase() : soloDni_(q.doc);
  const pais = q.pais || 'Argentina';
  if (pais === 'Argentina' && (doc.length < 6 || doc.length > 9)) return { ok: false, error: 'Revisá el DNI: escribilo sin puntos.' };
  if (!doc) return { ok: false, error: 'Escribí tu número de documento.' };
  const P = tabla_('PERSONAS'), i = P.i;
  const p = P.filas.find(r => r[i('DNI')] === doc && (r[i('PAIS_DOCUMENTO')] || 'Argentina') === pais);
  const b = pais === 'Argentina' ? enBase_(doc) : null;
  if (!p && !b) return { ok: true, encontrado: false };
  const ficha = [], src = b || {};
  const val = (k, pk) => b ? src[k] : p[i(pk)];
  const publico = b ? (RED_TRELEW.indexOf(b.ESTABLECIMIENTO) >= 0 ? 'Red Trelew' : 'Red Chubut') : p[i('PUBLICO')];
  ficha.push(['Público', sd_(publico)]);
  if (b || /red/i.test(publico)) {
    ficha.push(['Establecimiento', sd_(b ? nombreEst_(b.ESTABLECIMIENTO) : p[i('ESTABLECIMIENTO')])]);
    ficha.push(['Servicio o sector', sd_(val('SERVICIO', 'SERVICIO'))]);
    ficha.push(['Función o puesto', sd_(val('FUNCION', 'FUNCION')) + (b && b.FUNCION_DETALLE ? ' · ' + b.FUNCION_DETALLE : '')]);
  } else if (/estud/i.test(publico)) {
    ficha.push(['Carrera', sd_(p[i('CARRERA')])]); ficha.push(['Institución', sd_(p[i('INSTITUCION')])]);
  } else {
    ficha.push(['Profesión', sd_(p[i('PROFESION')])]); ficha.push(['Institución', sd_(p[i('INSTITUCION')])]);
  }
  const nombre = (b ? b.NOMBRES : p[i('NOMBRES')]) || '', ape = (b ? b.APELLIDOS : p[i('APELLIDOS')]) || '';
  const correo = (p && !vacio_(p[i('CORREO')])) ? p[i('CORREO')] : (b ? b.EMAIL : '');
  return { ok: true, encontrado: true, desdeBase: !!b, saludo: String(nombre).trim().split(/\s+/).slice(0, 2).join(' '), ficha: ficha, correo: correoOk_(correo) ? correo : '', tieneCorreo: correoOk_(correo) };   // el correo se muestra completo para que la persona sepa si tiene que corregirlo
}
function enBase_(dni) {
  const lib = MEMO_ON ? (MEMO_.libT = MEMO_.libT || SpreadsheetApp.openById(ID.trabajadores)) : SpreadsheetApp.openById(ID.trabajadores), T = tabla_('TODOS', lib);
  const r = T.filas.find(x => soloDni_(x[T.i('DNI')]) === dni && !/baja/i.test(x[T.i('ESTADO')]));
  if (!r) return null;
  const o = {}; T.H.forEach((h, k) => o[h] = r[k]); return o;
}
function nombreEst_(cod) {
  const l = listasRegistro_(); const e = l.trelew.concat(l.chubut).find(x => x[0] === cod); return e ? e[1] : cod;
}

// ------------------------------------------------------------------ Guardar a la persona (registro e inscripción)
function guardarPersona_(d) {
  const pais = d.pais || 'Argentina';
  const doc = idDoc_(d);
  if (!doc) return { error: 'Falta el documento.' };
  const correoNuevo = String(d.correo || '').trim();
  if (correoNuevo && !correoOk_(correoNuevo)) return { error: 'Revisá el correo: parece incompleto.' };
  const P = tabla_('PERSONAS'), i = P.i, fila = P.filas.findIndex(r => r[i('DNI')] === doc && (r[i('PAIS_DOCUMENTO')] || 'Argentina') === pais);
  const b = pais === 'Argentina' ? enBase_(doc) : null, hoy = ahoraTxt_();
  let persona;
  if (fila >= 0) {
    // Persona conocida: solo cambian contacto (y público/datos si eligió otro público y no está en la base)
    persona = {}; P.H.forEach((h, k) => persona[h] = P.filas[fila][k]);
    const cambios = {};
    if (correoNuevo && correoNuevo !== persona.CORREO) cambios.CORREO = correoNuevo;
    if (d.telefono && d.telefono !== persona.TELEFONO) cambios.TELEFONO = d.telefono;
    if (d.modo === 'nuevo' && !b) { const cp = camposPublico_(d); if (cp.error) return { error: cp.error }; Object.assign(cambios, cp); }
    if (vacio_(persona.CORREO) && !correoNuevo) return { error: 'Necesitamos tu correo: es el canal para enviarte la constancia y avisos.' };
    Object.keys(cambios).forEach(c => { if (P.i(c) >= 0) { historial_('Registro', 'PERSONAS', doc, c, persona[c], cambios[c], 'Actualizado por la persona'); persona[c] = cambios[c]; } });
    if (Object.keys(cambios).length) { persona.ULTIMA_ACTUALIZACION = hoy; P.sh.getRange(fila + 6, 1, 1, P.H.length).setValues([filaDe_(P, persona)]); }
  } else {
    if (!correoNuevo) return { error: 'Necesitamos tu correo: es el canal para enviarte la constancia y avisos.' };
    persona = { DNI: doc, PAIS_DOCUMENTO: pais, CORREO: correoNuevo, TELEFONO: sd_(d.telefono), ULTIMA_ACTUALIZACION: hoy };
    if (b) Object.assign(persona, { APELLIDOS: b.APELLIDOS, NOMBRES: b.NOMBRES, PUBLICO: RED_TRELEW.indexOf(b.ESTABLECIMIENTO) >= 0 ? 'Red Trelew' : 'Red Chubut', ESTABLECIMIENTO: b.ESTABLECIMIENTO, SERVICIO: sd_(b.SERVICIO), FUNCION: sd_(b.FUNCION + (b.FUNCION_DETALLE ? ' · ' + b.FUNCION_DETALLE : '')), VINCULO: sd_(b.VINCULO), EMPRESA: b.EMPRESA, CIUDAD: 's/d', PROVINCIA: 'Chubut', PAIS: 'Argentina', PROFESION: sd_(b.FUNCION), INSTITUCION: nombreEst_(b.ESTABLECIMIENTO), ORIGEN_DE_DATOS: 'Base de trabajadores' });
    else {
      const c = camposPublico_(d); if (c.error) return { error: c.error };
      Object.assign(persona, c, { ORIGEN_DE_DATOS: 'Registro' });
    }
    agregar_(P, [persona]);
  }
  // Contacto también en la base de trabajadores (el dato más nuevo manda)
  if (b && (correoNuevo || d.telefono)) actualizarBase_(b, correoNuevo, d.telefono);
  if (d.cambio) aviso_('Cambio informado por la persona', b ? 'Base de trabajadores' : 'PERSONAS', doc + ' · ' + (persona.APELLIDOS || ''), String(d.cambio).slice(0, 500));
  ['ESTABLECIMIENTO', 'SERVICIO', 'FUNCION', 'PROFESION', 'CARRERA', 'INSTITUCION'].forEach(c => { if (/^otr[oa]:/i.test(persona[c] || '')) aviso_('Valor fuera de lista', 'PERSONAS', doc, c + ' = ' + persona[c]); });
  return { doc: doc, persona: persona };
}

// ------------------------------------------------------------------ Guardar el registro de asistencia
// Devuelve siguiente: 'listo' | 'evaluacion' | 'cerrada'; y encuesta = true si el dictado tuvo inscripción previa.
function regGuardar(d) {
  const lock = LockService.getScriptLock(); lock.waitLock(25000);
  try {
    const ini = regInicio(d.k, d.c, d.d, d.av); if (!ini.ok) return ini;
    const cap = ini.cap, ab = ini.abierta;
    const per = guardarPersona_(d); if (per.error) return { ok: false, error: per.error };
    const doc = per.doc, encuesta = !!ab.inscripcion;
    const soloEval = /evaluaci/i.test(cap.registro) && !/encuentro/i.test(cap.registro);
    if (!ab.abierta) return { ok: true, siguiente: 'cerrada', mensaje: 'Tus datos quedaron guardados. ' + ab.texto };
    if (ab.video) return { ok: true, siguiente: 'video', mensaje: 'Tus datos quedaron guardados. Seguí con ' + (ini.videos.length > 1 ? 'los videos' : 'el video') + '.' };
    if (soloEval) return { ok: true, siguiente: ini.evaluacion ? 'evaluacion' : 'listo', encuesta: encuesta, mensaje: ini.evaluacion ? 'Tus datos quedaron guardados. Seguí con la evaluación.' : 'Tus datos quedaron guardados. La evaluación todavía no está cargada: avisale a Higiene y Seguridad.' };
    const programa = /encuentro/i.test(cap.registro), ultimo = programa && ab.encuentro >= cap.encuentros && !!ini.evaluacion;
    const R = tabla_('REGISTROS'), j = R.i, hoyIso = iso_(new Date());
    const filaYa = R.filas.find(r => r[j('DNI')] === doc && r[j('CODIGO')] === cap.codigo && r[j('TIPO')] !== 'Evaluación' && !/anulad/i.test(r[j('ESTADO')]) &&
      (ab.idDictado === 'PERMANENTE' ? isoDe_(r[j('FECHA')]) === hoyIso : (r[j('ID_DICTADO')] === ab.idDictado && String(r[j('ENCUENTRO_N')]) === String(programa ? ab.encuentro : r[j('ENCUENTRO_N')]))));
    const ya = !!filaYa; let certificado = ya && !vacio_(filaYa[j('ID_CERTIFICADO')]) ? filaYa[j('ID_CERTIFICADO')] : '';
    if (!ya) {
      const reg = { ID_REGISTRO: uid_('REG', doc), FECHA: Utilities.formatDate(new Date(), ZONA, 'dd/MM/yyyy HH:mm'), DNI: doc, CODIGO: cap.codigo, VERSION: cap.version || '1', ID_DICTADO: ab.idDictado, ENCUENTRO_N: programa ? ab.encuentro : '', TIPO: 'Asistencia', ID_EVALUACION: '', NOTA: '', APROBADO: '', CICLO: cicloDe_(hoyIso), VENCE: /no vence/i.test(cap.vence) ? 'No vence' : dma_(masDoce_(hoyIso)), ORIGEN: d.origen === 'qr' ? 'QR' : 'Link', CARGADO_POR: 'Registro', ESTADO: 'Válido' };
      agregar_(R, [reg]);
      certificado = certAlRegistrar_(reg);
      CacheService.getScriptCache().remove('tablero');
    }
    if (ab.idDictado !== 'PERMANENTE') marcarAsistio_(ab.idDictado, doc);
    const base = ya ? 'Tu asistencia ya estaba registrada.' : programa ? 'Asistencia al encuentro ' + ab.encuentro + ' de ' + cap.encuentros + ' registrada.' : 'Asistencia registrada. ¡Gracias por participar!';
    if (ultimo) return { ok: true, siguiente: 'evaluacion', encuesta: encuesta, certificado: certificado, mensaje: base + ' Es el último encuentro: seguí con la evaluación final.' };
    return { ok: true, siguiente: 'listo', encuesta: encuesta && !ya, certificado: certificado, mensaje: base };
  } finally { lock.releaseLock(); }
}
// Campos propios de cada público, validados
function camposPublico_(d) {
  const pub = PUBLICOS[d.publico]; if (!pub) return { error: 'Elegí desde dónde participás.' };
  const req = (v, t) => { if (vacio_(v)) throw new Error('Falta completar: ' + t + '.'); return String(v).trim(); };
  try {
    const o = { PUBLICO: pub, APELLIDOS: req(d.apellidos, 'apellidos'), NOMBRES: req(d.nombres, 'nombres') };
    if (d.publico === 'trelew' || d.publico === 'chubut') {
      const est = req(d.establecimiento, 'establecimiento').split('|'); o.ESTABLECIMIENTO = est[0]; o.SERVICIO = req(d.servicio, 'servicio o sector');
      o.FUNCION = req(d.funcion, 'función o puesto') + (d.detalle ? ' · ' + d.detalle : ''); o.PROFESION = o.FUNCION;
      o.INSTITUCION = est[1] || nombreEst_(o.ESTABLECIMIENTO); o.PROVINCIA = 'Chubut'; o.PAIS = 'Argentina'; o.CIUDAD = sd_(d.ciudad);
      if (d.publico === 'trelew') { o.VINCULO = req(d.vinculo, 'vínculo'); o.EMPRESA = o.VINCULO === 'Tercerizado' ? req(d.empresa, 'empresa') : ''; }
      if (d.jefatura === 'Sí') o.REVISAR = 'Indica cargo de jefatura o conducción';
    } else if (d.publico === 'est') {
      o.CARRERA = req(d.carrera, 'carrera'); o.INSTITUCION = req(d.institucion, 'institución'); o.PROFESION = 'Estudiante';
      o.CIUDAD = req(d.ciudad, 'ciudad'); o.PAIS = req(d.pais2 || 'Argentina', 'país'); o.PROVINCIA = o.PAIS === 'Argentina' ? req(d.provincia, 'provincia') : 's/d';
    } else {
      o.PROFESION = req(d.profesion, 'profesión u ocupación'); o.INSTITUCION = req(d.institucion, 'institución o lugar de trabajo');
      o.CIUDAD = req(d.ciudad, 'ciudad'); o.PAIS = req(d.pais2, 'país'); o.PROVINCIA = o.PAIS === 'Argentina' ? req(d.provincia, 'provincia') : 's/d';
    }
    ['ESTABLECIMIENTO', 'SERVICIO', 'VINCULO', 'EMPRESA', 'CARRERA'].forEach(c => { if (o[c] === undefined) o[c] = 's/d'; });
    return o;
  } catch (e) { return { error: e.message }; }
}
function actualizarBase_(b, correo, tel) {
  try {
    const lib = SpreadsheetApp.openById(ID.trabajadores), T = tabla_(b.ESTABLECIMIENTO, lib);
    const k = T.filas.findIndex(r => soloDni_(r[T.i('DNI')]) === soloDni_(b.DNI)); if (k < 0) return;
    const fila = k + 6, hoy = Utilities.formatDate(new Date(), ZONA, 'dd/MM/yyyy');
    if (correo && correo !== b.EMAIL && T.i('EMAIL') >= 0) { T.sh.getRange(fila, T.i('EMAIL') + 1).setValue(correo); if (T.i('EMAIL_FECHA') >= 0) T.sh.getRange(fila, T.i('EMAIL_FECHA') + 1).setValue(hoy); historial_('Registro', 'Base de trabajadores · ' + b.ESTABLECIMIENTO, b.DNI, 'EMAIL', b.EMAIL, correo, 'Correo actualizado por la persona al registrarse'); }
    if (tel && tel !== b.TELEFONO && T.i('TELEFONO') >= 0) { T.sh.getRange(fila, T.i('TELEFONO') + 1).setValue(tel); historial_('Registro', 'Base de trabajadores · ' + b.ESTABLECIMIENTO, b.DNI, 'TELEFONO', b.TELEFONO, tel, 'Teléfono actualizado por la persona al registrarse'); }
  } catch (e) { aviso_('No se pudo actualizar la base de trabajadores', 'Base de trabajadores', b.DNI, e.message); }
}

// ------------------------------------------------------------------ Migración (se corre una sola vez, desde el menú)
function menuMigrar() {
  const ui = SpreadsheetApp.getUi();
  if (tabla_('PERSONAS').filas.some(r => r[0])) { ui.alert('La migración ya se hizo: PERSONAS tiene datos. No se repite para no duplicar.'); return; }
  if (ui.alert('Migrar 2026', 'Se copian el catálogo, las personas y los registros de 2026 desde los libros actuales, tal como están. Los libros actuales no se modifican. ¿Seguimos?', ui.ButtonSet.YES_NO) !== ui.Button.YES) return;
  const r = migrar_();
  ui.alert('Migración terminada', 'Catálogo: ' + r.catalogo + '\nPersonas: ' + r.personas + '\nRegistros: ' + r.registros + ' (' + r.sinCodigo + ' sin código: quedan con el tema en CODIGO)\nCertificados: ' + r.certificados + '\nFilas originales guardadas en _ARCHIVO: ' + r.archivo, ui.ButtonSet.OK);
}
function migrar_() {
  const libC = SpreadsheetApp.openById(ID.catalogo), libP = SpreadsheetApp.openById(ID.personas), hoy = ahoraTxt_(), arch = [];
  const guardar = (libro, hoja_, fila, clave, H, r) => { const o = {}; H.forEach((h, k) => { if (h && r[k] !== '') o[h] = r[k]; }); arch.push({ LIBRO_ORIGEN: libro, HOJA_ORIGEN: hoja_, FILA_ORIGEN: fila, CLAVE: clave, DATOS: JSON.stringify(o).slice(0, 49000), FECHA_MIGRACION: hoy }); };
  // Catálogo
  const cv = hojaDe_(libC, 'CAPACITACIONES').getDataRange().getDisplayValues(), CH = cv[0], c = n => CH.indexOf(n);
  const regMap = v => /encuentro/i.test(v) ? 'Encuentros + evaluación' : /evaluaci/i.test(v) ? 'Evaluación' : 'Asistencia';
  const cat = cv.slice(1).filter(r => r[c('ID_CAPACITACION')]).map((r, k) => {
    guardar('CATALOGO_CAPACITACIONES_2026', 'CAPACITACIONES', k + 2, r[c('ID_CAPACITACION')], CH, r);
    const enc = num_(r[c('ENCUENTROS')]), cod = r[c('ID_CAPACITACION')];
    return { CODIGO: cod, VERSION: '1', NOMBRE: r[c('NOMBRE')], TIPO_ACTIVIDAD: enc > 1 ? 'Programa' : 'Capacitación', CATEGORIA: sd_(r[c('TIPO')]),
      ESTADO: /activ/i.test(r[c('ESTADO')]) ? 'Activa' : /prepar/i.test(r[c('ESTADO')]) ? 'Borrador' : sd_(r[c('ESTADO')]),
      SIEMPRE_ABIERTA: (cod === 'CAP-HYS-003' || cod === 'CAP-HYS-007') ? 'Sí' : 'No', INSCRIPCION_PREVIA: 'No', TOKEN: r[c('TOKEN')], LINK_PERMANENTE: sd_(r[c('LINK_PARA_COMPARTIR')] || r[c('LINK')]), QR_PERMANENTE: sd_(r[c('QR')]),
      HABILITADA_DESDE: r[c('HABILITADA_DESDE')], EJE: sd_(r[c('EJE')]), PUBLICOS: 's/d', DESTINATARIOS: sd_(r[c('DESTINATARIOS')]), REGISTRO: regMap(r[c('REGISTRO')]), ENCUENTROS: enc || 1,
      HORAS_POR_ENCUENTRO: r[c('HORAS_POR_ENCUENTRO')], CARGA_HORARIA: sd_(r[c('CARGA_HORARIA_HS')]), ASISTENCIA_MINIMA: r[c('ASISTENCIA_MINIMA')], VENCE: num_(r[c('VIGENCIA_MESES')]) === 0 && /inducci/i.test(r[c('NOMBRE')]) ? 'No vence' : 'Anual',
      FRECUENCIA_SUGERIDA: sd_(r[c('FRECUENCIA_SUGERIDA')]), OBJETIVOS: 's/d', CONTENIDOS: 's/d', REQUISITOS_PREVIOS: 's/d', MATERIALES: 's/d', ICONO: sd_(r[c('ICONO_SUGERIDO')]), FIRMANTES: 'FIR-001',
      BASE_LEGAL: sd_(r[c('BASE_LEGAL')]), RESPONSABLE: 'Belén Pellegrini', CODIGO_ANTERIOR: r[c('CODIGO_ANTERIOR')], OBSERVACIONES: r[c('OBSERVACIONES')] };
  });
  agregar_(tabla_('CATALOGO'), cat);
  const cargaDe = {}; cat.forEach(x => cargaDe[x.CODIGO] = x.CARGA_HORARIA);
  // Equivalencias de establecimientos (BASE COMÚN)
  const libCo = SpreadsheetApp.openById(ID_COMUN), E = tabla_('ESTABLECIMIENTOS', libCo), Q = tabla_('EQUIVALENCIAS', libCo), estDe = {};
  E.filas.forEach(r => ['CODIGO', 'NOMBRE_OFICIAL', 'NOMBRE_CORTO', 'NOMBRE_REFES'].forEach(h => { if (r[E.i(h)]) estDe[norm_(r[E.i(h)])] = r[E.i('CODIGO')]; }));
  Q.filas.forEach(r => { if (r[0] && r[1]) estDe[norm_(r[0])] = r[1]; });
  // Personas
  const pv = hojaDe_(libP, 'PERSONAS').getDataRange().getDisplayValues(), PH = pv[0], p = n => PH.indexOf(n);
  const pubMap = (v, carrera) => /primario/i.test(v) ? 'Red Trelew' : /secundario/i.test(v) ? 'Red Chubut' : /externo/i.test(v) ? (carrera ? 'Estudiantes' : 'Profesionales externos') : 's/d';
  const vistos = {};
  const personas = pv.slice(1).map((r, k) => {
    const dni = soloDni_(r[p('DNI')]); if (!dni || vistos[dni]) return null; vistos[dni] = 1;
    guardar('BASE_PERSONAS_CAPACITACIONES_2026', 'PERSONAS', k + 2, dni, PH, r);
    const pub = pubMap(r[p('PUBLICO')], r[p('CARRERA')]), estTxt = r[p('ESTABLECIMIENTO')];
    const est = estDe[norm_(r[p('ESTABLECIMIENTO_ORIGINAL')])] || estDe[norm_(estTxt)] || estTxt;
    const red = /^Red/.test(pub);
    return { DNI: dni, PAIS_DOCUMENTO: 'Argentina', APELLIDOS: r[p('APELLIDOS')], NOMBRES: r[p('NOMBRES')], PUBLICO: pub, CORREO: sd_(r[p('EMAIL')]), TELEFONO: sd_(r[p('TELEFONO')]),
      CIUDAD: sd_(r[p('CIUDAD')]), PROVINCIA: sd_(r[p('PROVINCIA')]), PAIS: r[p('PROVINCIA')] ? 'Argentina' : 's/d', PROFESION: sd_(r[p('FUNCION')] + (r[p('FUNCION_DETALLE')] && r[p('FUNCION_DETALLE')] !== r[p('FUNCION')] ? ' · ' + r[p('FUNCION_DETALLE')] : '')),
      INSTITUCION: sd_(red ? estTxt : (r[p('LUGAR_PRACTICA')] || estTxt || r[p('HOSPITAL_CABECERA')])), ESTABLECIMIENTO: red ? sd_(est) : 's/d', SERVICIO: red ? sd_(r[p('SERVICIO')]) : 's/d', FUNCION: red ? sd_(r[p('FUNCION')]) : 's/d',
      VINCULO: sd_(r[p('VINCULO')]), EMPRESA: r[p('EMPRESA')], CARRERA: r[p('CARRERA')] || (pub === 'Estudiantes' ? 's/d' : ''), ORIGEN_DE_DATOS: /^s[ií]/i.test(r[p('EN_NTEAR')]) ? 'Migración 2026 · base de trabajadores' : 'Migración 2026 · histórico',
      ULTIMA_ACTUALIZACION: r[p('ULTIMA_CONFIRMACION')] || '', REVISAR: r[p('REVISAR')] };
  }).filter(Boolean);
  agregar_(tabla_('PERSONAS'), personas);
  // Equivalencias de capacitaciones: _LISTAS + tema del libro 2026
  const equiv = equivalencias_(); cv.slice(1).forEach(r => { if (r[c('TEMA_EN_LIBRO_2026')]) equiv[norm_(r[c('TEMA_EN_LIBRO_2026')])] = r[c('ID_CAPACITACION')]; });
  const regs = [], certs = []; let sinCodigo = 0;
  // Registros del sistema 2026 (hoja REGISTROS)
  const rv = hojaDe_(libP, 'REGISTROS').getDataRange().getDisplayValues(), RH = rv[0], g = n => RH.indexOf(n);
  rv.slice(1).forEach((r, k) => {
    if (!r[g('ID_REGISTRO')]) return; guardar('BASE_PERSONAS_CAPACITACIONES_2026', 'REGISTROS', k + 2, r[g('ID_REGISTRO')], RH, r);
    const f = isoDe_(r[g('FECHA_HORA')]) || 's/d', ev = /evaluaci/i.test(r[g('TIPO')]);
    regs.push({ ID_REGISTRO: r[g('ID_REGISTRO')], FECHA: r[g('FECHA_HORA')], DNI: soloDni_(r[g('DNI')]), CODIGO: r[g('ID_CAPACITACION')], VERSION: '1', ID_DICTADO: 's/d', ENCUENTRO_N: r[g('ENCUENTRO')], TIPO: ev ? 'Evaluación' : 'Asistencia',
      ID_EVALUACION: r[g('ID_EVALUACION')], NOTA: r[g('PORCENTAJE')] ? num_(r[g('PORCENTAJE')]) : '', APROBADO: r[g('APROBO')], CICLO: f !== 's/d' ? cicloDe_(f) : 's/d', VENCE: r[g('VENCE')] ? dma_(isoDe_(r[g('VENCE')])) : (f !== 's/d' ? dma_(masDoce_(f)) : 's/d'),
      ORIGEN: 'Migración · sistema 2026', CARGADO_POR: 'Migración', ID_CERTIFICADO: r[g('NRO_CERTIFICADO')], ESTADO: 'Válido', MOTIVO_ANULACION: '' });
    if (r[g('NRO_CERTIFICADO')]) certs.push({ ID_CERTIFICADO: r[g('NRO_CERTIFICADO')], DNI: soloDni_(r[g('DNI')]), CODIGO: r[g('ID_CAPACITACION')], VERSION: '1', TIPO: ev ? 'Aprobación' : 'Asistencia', FECHA: f !== 's/d' ? dma_(f) : 's/d', HORAS: sd_(cargaDe[r[g('ID_CAPACITACION')]]), FIRMANTES: 'FIR-001', LINK_PDF: sd_(r[g('LINK_CERTIFICADO')]), ESTADO: 'Válido' });
  });
  // Libro de registro 2026 (encabezados en la fila 4)
  const hv = hojaDe_(libP, 'HISTORICO_2026_LIBRO').getDataRange().getDisplayValues(), HH = hv[3].map(x => String(x).trim()), h = n => HH.indexOf(n);
  hv.slice(5).forEach((r, k) => {
    const dni = soloDni_(r[h('DNI_CUIL')]); if (!r[h('ID_REGISTRO')] && !dni) return;
    guardar('BASE_PERSONAS_CAPACITACIONES_2026', 'HISTORICO_2026_LIBRO', k + 6, r[h('ID_REGISTRO')], HH, r);
    const f = isoDe_(r[h('FECHA')]) || 's/d', tema = r[h('TEMA_CAPACITACION')], cod = equiv[norm_(tema)] || '';
    if (!cod) sinCodigo++;
    const apr = /^s[ií]/i.test(r[h('APROBO')]) ? 'Sí' : /^no$/i.test(r[h('APROBO')]) ? 'No' : '';
    regs.push({ ID_REGISTRO: 'HIS-' + (r[h('ID_REGISTRO')] || (k + 6)), FECHA: r[h('FECHA')], DNI: dni || 's/d', CODIGO: cod || ('TEMA: ' + sd_(tema)), VERSION: '1', ID_DICTADO: 's/d', ENCUENTRO_N: '', TIPO: apr ? 'Evaluación' : 'Asistencia', ID_EVALUACION: '', NOTA: '', APROBADO: apr,
      CICLO: f !== 's/d' ? cicloDe_(f) : 's/d', VENCE: r[h('FECHA_ VENCIMIENTO')] ? dma_(isoDe_(r[h('FECHA_ VENCIMIENTO')])) || r[h('FECHA_ VENCIMIENTO')] : (f !== 's/d' ? dma_(masDoce_(f)) : 's/d'),
      ORIGEN: 'Migración · libro 2026', CARGADO_POR: 'Migración', ID_CERTIFICADO: '', ESTADO: /anul/i.test(r[h('ESTADO_REGISTRO')]) ? 'Anulado' : 'Válido', MOTIVO_ANULACION: /anul/i.test(r[h('ESTADO_REGISTRO')]) ? sd_(r[h('OBSERVACIONES')]) : '' });
  });
  agregar_(tabla_('REGISTROS'), regs);
  agregar_(tabla_('CERTIFICADOS'), certs);
  // _ARCHIVO en tandas
  const A = tabla_('_ARCHIVO'); for (let k = 0; k < arch.length; k += 2000) agregar_(A, arch.slice(k, k + 2000));
  historial_('Migración', 'Todo el libro', '-', '-', '', 'Catálogo ' + cat.length + ' · personas ' + personas.length + ' · registros ' + regs.length + ' · certificados ' + certs.length, 'Migración inicial desde los libros 2026');
  return { catalogo: cat.length, personas: personas.length, registros: regs.length, sinCodigo: sinCodigo, certificados: certs.length, archivo: arch.length };
}

// ------------------------------------------------------------------ CARGA_MANUAL → REGISTROS (respaldo si el portal falla)
function menuProcesarCarga() {
  const C = tabla_('CARGA_MANUAL'), i = C.i, P = tabla_('PERSONAS'), R = tabla_('REGISTROS');
  const nuevosP = [], nuevosR = [], hoy = ahoraTxt_(); let n = 0, err = 0;
  C.filas.forEach((r, k) => {
    if (!r[i('DNI')] || r[i('PROCESADO')]) return;
    const dni = soloDni_(r[i('DNI')]), f = isoDe_(r[i('FECHA')]) || iso_(new Date()), cod = String(r[i('CODIGO')]).trim();
    if (!dni || !cod) { C.sh.getRange(k + 6, i('PROCESADO') + 1).setValue('Error: falta DNI o CODIGO'); err++; return; }
    if (/^no$/i.test(r[i('ASISTIO')])) { C.sh.getRange(k + 6, i('PROCESADO') + 1).setValue('Sin registro: no asistió'); return; }
    if (!P.filas.some(x => x[P.i('DNI')] === dni) && !nuevosP.some(x => x.DNI === dni))
      nuevosP.push({ DNI: dni, PAIS_DOCUMENTO: 'Argentina', APELLIDOS: sd_(r[i('APELLIDOS')]), NOMBRES: sd_(r[i('NOMBRES')]), CORREO: sd_(r[i('CORREO')]), PUBLICO: sd_(r[i('PUBLICO')]), ORIGEN_DE_DATOS: 'Carga manual', ULTIMA_ACTUALIZACION: hoy, REVISAR: 'Completar datos (carga manual)' });
    const nota = r[i('NOTA')];
    nuevosR.push({ ID_REGISTRO: 'MAN-' + Utilities.formatDate(new Date(), ZONA, 'yyyyMMdd-HHmmss') + '-' + (k + 6), FECHA: dma_(f), DNI: dni, CODIGO: cod, VERSION: '1', ID_DICTADO: sd_(r[i('ID_DICTADO')]), TIPO: nota !== '' ? 'Evaluación' : 'Asistencia', NOTA: nota, APROBADO: '', CICLO: cicloDe_(f), VENCE: dma_(masDoce_(f)), ORIGEN: 'Carga manual', CARGADO_POR: Session.getActiveUser().getEmail() || 'Sheets', ESTADO: 'Válido', MOTIVO_ANULACION: '' });
    C.sh.getRange(k + 6, i('PROCESADO') + 1).setValue('Procesado ' + hoy); n++;
  });
  agregar_(P, nuevosP); agregar_(R, nuevosR);
  SpreadsheetApp.getUi().alert('CARGA_MANUAL', n + ' fila(s) pasadas a REGISTROS' + (nuevosP.length ? ' · ' + nuevosP.length + ' persona(s) nueva(s) para completar en PERSONAS' : '') + (err ? ' · ' + err + ' con error (ver PROCESADO)' : '') + '.', SpreadsheetApp.getUi().ButtonSet.OK);
}

// ------------------------------------------------------------------ Links de prueba del registro nuevo
function menuLinks() {
  const url = REGISTRO_URL, cat = tabla_('CATALOGO');
  if (!url) { SpreadsheetApp.getUi().alert('Primero hay que implementar la aplicación web.'); return; }
  const filas = cat.filas.filter(r => r[cat.i('CODIGO')] && r[cat.i('TOKEN')]).map(r => '<tr><td>' + r[cat.i('CODIGO')] + '</td><td>' + r[cat.i('NOMBRE')] + '</td><td><a target="_blank" href="' + url + '?k=' + r[cat.i('TOKEN')] + '">abrir</a></td></tr>').join('');
  const html = '<div style="font-family:Arial,sans-serif;font-size:13px"><p>Links del <b>registro nuevo</b> (para probar; los QR impresos siguen yendo al sistema actual hasta el cambio).</p><table style="border-collapse:collapse" cellpadding="4">' + (filas || '<tr><td>Todavía no hay capacitaciones en CATALOGO.</td></tr>') + '</table></div>';
  SpreadsheetApp.getUi().showModalDialog(HtmlService.createHtmlOutput(html).setWidth(620).setHeight(460), 'Registro nuevo · links');
}


// =====================================================================
// FASE 5 · CATÁLOGO, EVALUACIONES, DICTADOS, INSCRIPCIONES Y FIRMANTES
// Todo se puede hacer también desde el libro: menú Capacitaciones HyS › Completar filas cargadas a mano.
// Nunca se borra una fila: se cambia el ESTADO y queda el motivo en _HISTORIAL.
// =====================================================================
const HS_VENTANA = 48;                 // horas que queda abierto el registro de un dictado
const INTENTOS_DEFECTO = 0;            // 0 = intentos ilimitados (decisión de Belén, 18/10/2026); un número en EVALUACIONES › INTENTOS_MAXIMOS pone tope
function maxIntentos_(ev) { const n = num_(ev && ev.INTENTOS_MAXIMOS); return n > 0 ? n : INTENTOS_DEFECTO; }   // 0 = sin tope
const NOTA_DEFECTO = 70;               // nota mínima si la evaluación no dice otra cosa
const FIRMA_HYS = 'FIR-001';           // la firma de Belén: va siempre, a la derecha
const MAX_FIRMAS = 4, MAX_DISERTANTES = 3;
const QR_API = 'https://api.qrserver.com/v1/create-qr-code/?size=600x600&margin=12&data=';
const ENCUESTA = 'EVA-ENC-001';

// Columnas que suma la fase 5, al final de cada hoja (no se toca ninguna existente)
const COLUMNAS_F5 = {
  EVALUACIONES: ['NOMBRE', 'EN_USO', 'TOKEN', 'CODIGO_ANTERIOR', 'OBSERVACIONES'],
  PREGUNTAS: ['CODIGO', 'TEMA', 'ID_PREGUNTA_ANTERIOR', 'ALTA'],
  DICTADOS: ['INSTITUCION', 'FIRMANTES', 'CREADO'],
  INSCRIPCIONES: ['FECHA_ANULACION', 'ANULADA_POR', 'MOTIVO']
};
function preparar_() {
  prepararF6_();
  const p = PropertiesService.getScriptProperties();
  if (p.getProperty('columnasF5') === '1') return [];
  const hechas = asegurarColumnas_(); p.setProperty('columnasF5', '1'); return hechas;
}
function asegurarColumnas_() { return asegurarColumnasDe_(COLUMNAS_F5); }

// ------------------------------------------------------------------ Utilidades de la fase 5
function obj_(T, r) { const o = {}; T.H.forEach((h, k) => { if (h) o[h] = r[k]; }); return o; }
function setCampos_(T, k, cambios) { Object.keys(cambios).forEach(c => { const j = T.i(c); if (j >= 0) T.sh.getRange(k + 6, j + 1).setValue(cambios[c]); }); }
function siNo_(v) { return /^s[ií]/i.test(String(v || '').trim()); }
function token12_() { return Utilities.getUuid().replace(/-/g, '').slice(0, 12); }
function linkReg_(q) { return REGISTRO_URL + '?' + q; }
function qrDe_(link) { return QR_API + encodeURIComponent(link); }
// Links que se comparten (WhatsApp, QR, portal): pasan por la página de GitHub, que abre esta aplicación sin el aviso de Google
// y evita el error de Google con varias cuentas abiertas en el teléfono. En la hoja DICTADOS quedan además los links directos (respaldo).
const PUBLICO_URL = 'https://hyslhmh-sudo.github.io/capacitaciones/';
function linkPub_(q) { return PUBLICO_URL + '?' + q; }
function fmt_(d) { return Utilities.formatDate(d, ZONA, 'dd/MM/yyyy HH:mm'); }
function sello_() { return Utilities.formatDate(new Date(), ZONA, 'yyyyMMdd-HHmmss'); }
function uid_(pre, doc) { return pre + '-' + sello_() + '-' + String(doc || '').slice(-3) + Utilities.getUuid().replace(/-/g, '').slice(0, 6); }   // único aunque coincida el segundo
function idDoc_(d) { return (d.pais || 'Argentina') === 'Argentina' ? soloDni_(d.doc) : String(d.doc || '').replace(/[\s.]/g, '').toUpperCase(); }
function mezclar_(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
function conLock_(fn) { const l = LockService.getScriptLock(); l.waitLock(25000); try { return fn(); } finally { l.releaseLock(); } }
function columnaLista_(nombre) { return listaCol_(tabla_('_LISTAS'), nombre); }
// Regla de Belén (18/10/2026): toda capacitación en el HMH (Aula, 60 lugares) es híbrida; cambia solo en la sala del HZT u otros lugares
function modalidadPorLugar_(modalidad, lugar) { return /^virtual/i.test(modalidad || '') ? modalidad : /^HMH/i.test(String(lugar || '').trim()) ? 'Híbrida' : (modalidad || 'Presencial'); }
function capacidad_(lugar) {
  const L = tabla_('_LISTAS'), a = L.i('LUGARES'), b = L.i('CAPACIDAD'); if (a < 0) return 's/d';
  const r = L.filas.find(x => String(x[a]).trim() === String(lugar || '').trim());
  return r ? (String(r[b]).trim() || 's/d') : 's/d';
}
function listasAdmin_() {
  const L = tabla_('_LISTAS'), c = n => listaCol_(L, n);
  const lug = L.i('LUGARES'), cap = L.i('CAPACIDAD');
  return {
    tipos: c('TIPOS_ACTIVIDAD'), categorias: c('CATEGORIAS'), ejes: c('EJES'), modalidades: c('MODALIDADES'), estados: c('ESTADOS_CAPACITACION'),
    estadosDictado: c('ESTADOS_DICTADO'), registro: c('REGISTRO'), tiposEvaluacion: c('TIPOS_EVALUACION'), iconos: c('ICONOS'), publicos: c('PUBLICOS'),
    lugares: L.filas.filter(r => String(r[lug]).trim()).map(r => ({ lugar: String(r[lug]).trim(), capacidad: String(r[cap]).trim() || 's/d' })),
    instituciones: c('INSTITUCIONES_EDUCATIVAS'), servicios: c('SERVICIOS').filter(x => x !== 'Otra')
  };
}
function capDe_(codigo) { const C = tabla_('CATALOGO'); const r = C.filas.find(x => x[C.i('CODIGO')] === codigo); return r ? obj_(C, r) : null; }

// ------------------------------------------------------------------ Evaluación en uso de una capacitación
// Primero la marcada EN_USO = Sí; si no, la última Final activa. Un TOKEN de evaluación (links viejos) la fija.
function evalDe_(codigo, tokenEval, lista) {
  const filas = lista || evaluaciones_();
  if (tokenEval) { const t = filas.find(o => o.TOKEN === tokenEval || o.ID_EVALUACION === tokenEval); if (t) return t; }
  const de = filas.filter(o => o.CODIGO === codigo && !/encuesta|diagn/i.test(o.TIPO) && !/anulad|reemplaz|inactiv/i.test(o.ESTADO));
  return de.find(o => siNo_(o.EN_USO)) || de.filter(o => /activ/i.test(o.ESTADO)).pop() || de.pop() || null;
}
function evaluaciones_() { const E = tabla_('EVALUACIONES'); return E.filas.map(r => obj_(E, r)).filter(o => o.ID_EVALUACION); }
function hhmm_(v) { const m = String(v || '').match(/(\d{1,2}):(\d{2})/); return m ? ('0' + m[1]).slice(-2) + ':' + m[2] : ''; }
function preguntasDe_(idEval, todas) {
  const Q = tabla_('PREGUNTAS');
  return Q.filas.map(r => obj_(Q, r)).filter(o => o.ID_EVALUACION === idEval && (todas || !/^no/i.test(o.USAR))).sort((a, b) => num_(a.NRO) - num_(b.NRO));
}
function temaDe_(p) { return [p.TEMA, p.RIESGO_EVALUADO].find(x => !vacio_(x)) || ''; }

// ------------------------------------------------------------------ Catálogo
function faltantes_(o, ev, nPreg) {
  const f = [];
  if (vacio_(o.NOMBRE)) f.push('nombre');
  if (vacio_(o.REGISTRO)) f.push('cómo se registra');
  if (vacio_(o.CARGA_HORARIA)) f.push('carga horaria (el certificado dice las horas)');
  if (vacio_(o.ICONO)) f.push('ícono');
  if (/evaluaci/i.test(o.REGISTRO)) {
    if (!ev) f.push('evaluación');
    else {
      const n = nPreg[ev.ID_EVALUACION] || 0, pi = num_(ev.PREGUNTAS_POR_INTENTO);
      if (!n) f.push('preguntas de la evaluación');
      else if (pi && n < pi) f.push('preguntas suficientes (' + n + ' de ' + pi + ' por intento)');
    }
  }
  if (/encuentro/i.test(o.REGISTRO) && num_(o.ENCUENTROS) < 2) f.push('cantidad de encuentros');
  return f;
}
function contarPreguntas_() {
  const Q = tabla_('PREGUNTAS'), n = {}, a = Q.i('ID_EVALUACION'), u = Q.i('USAR');
  Q.filas.forEach(r => { if (r[a] && !/^no/i.test(r[u])) n[r[a]] = (n[r[a]] || 0) + 1; });
  return n;
}
function capCatalogo_() {
  const C = tabla_('CATALOGO'), D = tabla_('DICTADOS'), R = tabla_('REGISTROS'), nPreg = contarPreguntas_(), regs = {};
  R.filas.forEach(r => { const c = r[R.i('CODIGO')]; if (c && !/anulad/i.test(r[R.i('ESTADO')])) regs[c] = (regs[c] || 0) + 1; });
  const dics = D.filas.map(r => obj_(D, r)).filter(o => o.ID_DICTADO && !/cancel|suspend/i.test(o.ESTADO));
  const ahora = new Date(), evs = evaluaciones_();
  return C.filas.filter(r => r[C.i('CODIGO')]).map(r => {
    const o = obj_(C, r), ev = /evaluaci/i.test(o.REGISTRO) ? evalDe_(o.CODIGO, '', evs) : null;
    const mios = dics.filter(x => x.CODIGO === o.CODIGO).map(x => ({ x: x, v: ventana_(x) }));
    const abierto = mios.find(m => ahora >= m.v.abre && ahora <= m.v.cierra);
    const proximo = mios.filter(m => m.v.abre > ahora).sort((a, b) => a.v.abre - b.v.abre)[0];
    return {
      codigo: o.CODIGO, version: o.VERSION, nombre: o.NOMBRE, tipo: o.TIPO_ACTIVIDAD, categoria: o.CATEGORIA, estado: o.ESTADO, registro: o.REGISTRO,
      encuentros: num_(o.ENCUENTROS) || 1, carga: o.CARGA_HORARIA, siempre: siNo_(o.SIEMPRE_ABIERTA), inscripcion: siNo_(o.INSCRIPCION_PREVIA), icono: o.ICONO,
      link: vacio_(o.TOKEN) ? '' : linkReg_('k=' + o.TOKEN), qr: vacio_(o.TOKEN) ? '' : qrDe_(linkReg_('k=' + o.TOKEN)),
      evaluacion: !/evaluaci/i.test(o.REGISTRO) ? null : ev ? { id: ev.ID_EVALUACION, preguntas: nPreg[ev.ID_EVALUACION] || 0, porIntento: num_(ev.PREGUNTAS_POR_INTENTO), nota: num_(ev['NOTA_MINIMA_%']) || NOTA_DEFECTO, intentos: maxIntentos_(ev), sorteo: siNo_(ev.SORTEO), estado: ev.ESTADO } : 'falta',
      dictado: abierto ? { estado: 'abierto', id: abierto.x.ID_DICTADO, cierra: fmt_(abierto.v.cierra) } : proximo ? { estado: 'próximo', id: proximo.x.ID_DICTADO, abre: fmt_(proximo.v.abre) } : null,
      registros: regs[o.CODIGO] || 0, faltan: faltantes_(o, ev, nPreg)
    };
  });
}
function capFicha_(codigo) {
  const cap = capDe_(codigo); if (!cap) return { ok: false, error: 'No existe la capacitación ' + codigo + '.' };
  const E = tabla_('EVALUACIONES'), nPreg = contarPreguntas_();
  const evals = E.filas.map(r => obj_(E, r)).filter(o => o.CODIGO === codigo).map(o => ({ id: o.ID_EVALUACION, nombre: o.NOMBRE, tipo: o.TIPO, publico: o.PUBLICO, version: o.VERSION, preguntas: nPreg[o.ID_EVALUACION] || 0, porIntento: num_(o.PREGUNTAS_POR_INTENTO), nota: o['NOTA_MINIMA_%'], intentos: o.INTENTOS_MAXIMOS, sorteo: o.SORTEO, estado: o.ESTADO, enUso: siNo_(o.EN_USO), token: o.TOKEN }));
  const D = tabla_('DICTADOS'), V = tabla_('_VERSIONES');
  return {
    ok: true, cap: cap, evaluaciones: evals, evaluacionEnUso: (evalDe_(codigo) || {}).ID_EVALUACION || '',
    dictados: D.filas.map(r => obj_(D, r)).filter(o => o.CODIGO === codigo).map(resumenDictado_),
    versiones: V.filas.map(r => obj_(V, r)).filter(o => o.CODIGO === codigo),
    faltan: faltantes_(cap, evalDe_(codigo), nPreg), link: vacio_(cap.TOKEN) ? '' : linkReg_('k=' + cap.TOKEN)
  };
}
const NO_EDITABLES = ['CODIGO', 'TOKEN', 'LINK_PERMANENTE', 'QR_PERMANENTE', 'ESTADO', 'VERSION'];
function capGuardar_(d) {
  return conLock_(() => {
    const C = tabla_('CATALOGO'), editables = C.H.filter(h => h && NO_EDITABLES.indexOf(h) < 0), hoy = ahoraTxt_();
    if (!d.CODIGO) {
      if (vacio_(d.NOMBRE)) return { ok: false, error: 'Falta el nombre de la capacitación.' };
      if (C.filas.some(r => norm_(r[C.i('NOMBRE')]) === norm_(d.NOMBRE))) return { ok: false, error: 'Ya hay una capacitación con ese nombre. Abrila desde el catálogo y creá una versión nueva.' };
      const nros = C.filas.map(r => Number((String(r[C.i('CODIGO')]).match(/^CAP-HYS-(\d{3})/) || [])[1] || 0));
      const cod = 'CAP-HYS-' + ('00' + (Math.max.apply(null, nros.concat([0])) + 1)).slice(-3), tok = token12_(), link = linkReg_('k=' + tok);
      const o = { CODIGO: cod, VERSION: '1', ESTADO: 'Borrador', TOKEN: tok, LINK_PERMANENTE: link, QR_PERMANENTE: qrDe_(link), RESPONSABLE: 'Belén Pellegrini', FIRMANTES: FIRMA_HYS, SIEMPRE_ABIERTA: 'No', INSCRIPCION_PREVIA: 'No' };
      editables.forEach(h => { if (d[h] !== undefined && String(d[h]).trim() !== '') o[h] = String(d[h]).trim(); });
      C.H.forEach(h => { if (h && (o[h] === undefined || o[h] === '')) o[h] = 's/d'; });
      agregar_(C, [o]);
      agregar_(tabla_('_VERSIONES'), [{ CODIGO: cod, VERSION: '1', DESDE: hoy, HASTA: '', QUE_CAMBIO: 'Alta', MATERIALES: o.MATERIALES, QUIEN: 'HyS (portal)' }]);
      historial_('HyS (portal)', 'CATALOGO', cod, 'Alta', '', o.NOMBRE, 'Alta de capacitación');
      return { ok: true, codigo: cod, link: link, qr: qrDe_(link), estado: 'Borrador' };
    }
    const k = C.filas.findIndex(r => r[C.i('CODIGO')] === d.CODIGO); if (k < 0) return { ok: false, error: 'No existe ' + d.CODIGO + '.' };
    const antes = obj_(C, C.filas[k]), cambios = {};
    editables.forEach(h => { if (d[h] === undefined) return; const v = String(d[h]).trim() || 's/d'; if (v !== String(antes[h]).trim()) cambios[h] = v; });
    if (d.nuevaVersion) {
      if (vacio_(d.queCambio)) return { ok: false, error: 'Para una versión nueva, contá en una línea qué cambió.' };
      cambios.VERSION = String(num_(antes.VERSION) + 1);
      const V = tabla_('_VERSIONES'), kv = V.filas.map((r, j) => [r, j]).filter(x => x[0][V.i('CODIGO')] === d.CODIGO && !x[0][V.i('HASTA')]).pop();
      if (kv) setCampos_(V, kv[1], { HASTA: hoy });
      agregar_(V, [{ CODIGO: d.CODIGO, VERSION: cambios.VERSION, DESDE: hoy, HASTA: '', QUE_CAMBIO: d.queCambio, MATERIALES: sd_(d.MATERIALES || antes.MATERIALES), QUIEN: 'HyS (portal)' }]);
    }
    if (!Object.keys(cambios).length) return { ok: true, codigo: d.CODIGO, cambios: [] };
    setCampos_(C, k, cambios);
    Object.keys(cambios).forEach(c => historial_('HyS (portal)', 'CATALOGO', d.CODIGO, c, antes[c], cambios[c], d.queCambio || 'Edición desde el portal'));
    return { ok: true, codigo: d.CODIGO, cambios: Object.keys(cambios) };
  });
}
function capEstado_(d) {
  return conLock_(() => {
    const C = tabla_('CATALOGO'), k = C.filas.findIndex(r => r[C.i('CODIGO')] === d.codigo);
    if (k < 0) return { ok: false, error: 'No existe ' + d.codigo + '.' };
    const o = obj_(C, C.filas[k]), estado = String(d.estado || '').trim();
    if (!estado) return { ok: false, error: 'Elegí el estado.' };
    if (/^activ/i.test(estado)) { const f = faltantes_(o, evalDe_(d.codigo), contarPreguntas_()); if (f.length) return { ok: false, error: 'Para activarla falta: ' + f.join(', ') + '.', faltan: f }; }
    else if (vacio_(d.motivo)) return { ok: false, error: 'Escribí el motivo (queda en el historial).' };
    const cambios = { ESTADO: estado }; if (d.siempre !== undefined) cambios.SIEMPRE_ABIERTA = d.siempre ? 'Sí' : 'No';
    setCampos_(C, k, cambios);
    historial_('HyS (portal)', 'CATALOGO', d.codigo, 'ESTADO', o.ESTADO, estado, sd_(d.motivo));
    return { ok: true, codigo: d.codigo, estado: estado };
  });
}

// ------------------------------------------------------------------ Preguntas: lectura, control y banco
// Acepta filas pegadas de Sheets/Excel (con o sin encabezados) o una lista de objetos.
const CAMPOS_PREG = ['PREGUNTA', 'OPCION_A', 'OPCION_B', 'OPCION_C', 'OPCION_D', 'OPCION_E', 'CORRECTA', 'FUNDAMENTO', 'TEMA', 'NIVEL'];
function parsePegado_(texto) {
  const filas = String(texto || '').split(/\r?\n/).map(l => l.split('\t')).filter(r => r.some(c => String(c).trim()));
  if (!filas.length) return [];
  const cab = filas[0].map(c => norm_(c).toUpperCase().replace(/\s+/g, '_'));
  const alias = { ENUNCIADO: 'PREGUNTA', A: 'OPCION_A', B: 'OPCION_B', C: 'OPCION_C', D: 'OPCION_D', E: 'OPCION_E', RESPUESTA_CORRECTA: 'CORRECTA', RIESGO_EVALUADO: 'TEMA' };
  const conCab = cab.some(c => c === 'PREGUNTA' || c === 'ENUNCIADO');
  const mapa = conCab ? cab.map(c => alias[c] || c) : ['PREGUNTA', 'OPCION_A', 'OPCION_B', 'OPCION_C', 'OPCION_D', 'OPCION_E', 'CORRECTA', 'FUNDAMENTO', 'TEMA'];
  const datos = conCab ? filas.slice(1) : filas;
  // Sin encabezados: PREGUNTA, A, B, C, D, (E), CORRECTA, FUNDAMENTO, TEMA. Si la 6.ª columna es una letra sola, no hay E.
  return datos.map(r => {
    const o = {};
    if (!conCab && /^[A-Ea-e]$/.test(String(r[5] || '').trim())) { ['PREGUNTA', 'OPCION_A', 'OPCION_B', 'OPCION_C', 'OPCION_D', 'CORRECTA', 'FUNDAMENTO', 'TEMA'].forEach((h, j) => o[h] = r[j]); }
    else mapa.forEach((h, j) => { if (h) o[h] = r[j]; });
    return o;
  });
}
function normPreguntas_(lista) {
  return (lista || []).map(p => {
    const o = {}; CAMPOS_PREG.forEach(h => o[h] = String(p[h] == null ? '' : p[h]).trim());
    o.CORRECTA = o.CORRECTA.toUpperCase().replace(/[^A-E]/g, '').slice(0, 1);
    if (p.ID_PREGUNTA) o.ID_PREGUNTA = p.ID_PREGUNTA;
    return o;
  });
}
function controlPreguntas_(lista, porIntento, codigo) {
  const err = [], av = [], vistos = {};
  const enBanco = {}; if (codigo) bancoDe_(codigo).forEach(b => enBanco[norm_(b.pregunta)] = b.id);
  let repetidasBanco = 0;
  lista.forEach((p, n) => {
    const nro = 'Pregunta ' + (n + 1);
    if (vacio_(p.PREGUNTA)) { err.push(nro + ': falta el enunciado.'); return; }
    const ops = ['A', 'B', 'C', 'D', 'E'].filter(l => !vacio_(p['OPCION_' + l]));
    if (ops.length < 2) err.push(nro + ': tiene menos de dos opciones.');
    if (!p.CORRECTA) err.push(nro + ': falta la respuesta correcta.');
    else if (ops.indexOf(p.CORRECTA) < 0) err.push(nro + ': la opción correcta «' + p.CORRECTA + '» está vacía.');
    if (vacio_(p.FUNDAMENTO)) av.push(nro + ': no tiene fundamento (lo ve quien aprueba).');
    if (vacio_(p.TEMA)) av.push(nro + ': no tiene tema (es lo que se sugiere repasar a quien no aprueba).');
    const k = norm_(p.PREGUNTA);
    if (vistos[k]) err.push(nro + ': está repetida (igual a la ' + vistos[k] + ').'); else vistos[k] = n + 1;
    if (enBanco[k] && !p.ID_PREGUNTA) repetidasBanco++;
  });
  if (repetidasBanco) av.push(repetidasBanco + ' pregunta(s) ya están en el banco de esta capacitación: se reutilizan y no se duplican.');
  if (porIntento && lista.length < porIntento) err.push('Hay ' + lista.length + ' preguntas y se piden ' + porIntento + ' por intento.');
  return { ok: !err.length, errores: err, avisos: av, total: lista.length };
}
// Banco: preguntas únicas (por texto) de todas las evaluaciones de una capacitación, o de todas si no se indica
function bancoDe_(codigo) {
  const Q = tabla_('PREGUNTAS'), E = tabla_('EVALUACIONES'), codDe = {};
  E.filas.forEach(r => codDe[r[E.i('ID_EVALUACION')]] = r[E.i('CODIGO')]);
  const unicas = {};
  Q.filas.map(r => obj_(Q, r)).filter(o => o.ID_PREGUNTA && o.ID_EVALUACION !== ENCUESTA).forEach(o => {
    const cod = !vacio_(o.CODIGO) ? o.CODIGO : codDe[o.ID_EVALUACION];
    if (codigo && cod !== codigo) return;
    const k = norm_(o.PREGUNTA);
    if (!unicas[k]) unicas[k] = { id: o.ID_PREGUNTA, codigo: cod, pregunta: o.PREGUNTA, opciones: ['A', 'B', 'C', 'D', 'E'].map(l => o['OPCION_' + l]).filter(x => !vacio_(x)), correcta: o.CORRECTA, fundamento: o.FUNDAMENTO, tema: temaDe_(o), nivel: o.NIVEL, evaluaciones: [], usar: !/^no/i.test(o.USAR) };
    unicas[k].evaluaciones.push(o.ID_EVALUACION);
  });
  return Object.keys(unicas).map(k => unicas[k]);
}
function preguntaUsar_(d) {
  const Q = tabla_('PREGUNTAS'), k = Q.filas.findIndex(r => r[Q.i('ID_PREGUNTA')] === d.id);
  if (k < 0) return { ok: false, error: 'No existe la pregunta ' + d.id + '.' };
  const antes = Q.filas[k][Q.i('USAR')], v = d.usar ? 'Sí' : 'No';
  setCampos_(Q, k, { USAR: v }); historial_('HyS (portal)', 'PREGUNTAS', d.id, 'USAR', antes, v, sd_(d.motivo));
  return { ok: true };
}
// Guarda una evaluación nueva (o suma preguntas a una existente). Las preguntas pueden venir del banco, de una planilla o de a una.
function evalGuardar_(d) {
  return conLock_(() => {
    const cap = capDe_(d.codigo); if (!cap) return { ok: false, error: 'No existe la capacitación ' + d.codigo + '.' };
    const E = tabla_('EVALUACIONES'), Q = tabla_('PREGUNTAS'), hoy = ahoraTxt_();
    // Preguntas: las del banco elegidas + las nuevas
    const banco = {}; Q.filas.forEach(r => banco[r[Q.i('ID_PREGUNTA')]] = obj_(Q, r));
    const delBanco = (d.desdeBanco || []).map(id => banco[id]).filter(Boolean).map(o => ({ PREGUNTA: o.PREGUNTA, OPCION_A: o.OPCION_A, OPCION_B: o.OPCION_B, OPCION_C: o.OPCION_C, OPCION_D: o.OPCION_D, OPCION_E: o.OPCION_E, CORRECTA: o.CORRECTA, FUNDAMENTO: o.FUNDAMENTO, TEMA: temaDe_(o), NIVEL: o.NIVEL, ID_PREGUNTA: o.ID_PREGUNTA }));
    const nuevas = normPreguntas_(d.preguntas && d.preguntas.length ? d.preguntas : parsePegado_(d.texto));
    // Si una nueva ya está en el banco, se toma la del banco (no se duplica)
    const idx = {}; bancoDe_(d.codigo).forEach(b => idx[norm_(b.pregunta)] = b.id);
    const lista = normPreguntas_(delBanco).concat(nuevas.map(p => idx[norm_(p.PREGUNTA)] ? Object.assign(p, { ID_PREGUNTA: idx[norm_(p.PREGUNTA)] }) : p));
    let ev = d.idEvaluacion ? E.filas.map(r => obj_(E, r)).find(o => o.ID_EVALUACION === d.idEvaluacion) : null;
    const yaTiene = ev ? preguntasDe_(ev.ID_EVALUACION, true) : [];
    const yaTxt = {}; yaTiene.forEach(p => yaTxt[norm_(p.PREGUNTA)] = 1);
    const aSumar = lista.filter(p => !yaTxt[norm_(p.PREGUNTA)]);
    const porIntento = num_(d.porIntento) || (ev ? num_(ev.PREGUNTAS_POR_INTENTO) : 0) || Math.min(10, yaTiene.length + aSumar.length);
    const ctl = controlPreguntas_(yaTiene.concat(aSumar).map(p => normPreguntas_([p])[0]), porIntento, '');
    if (!ctl.ok && !d.forzar) return { ok: false, error: 'Revisá las preguntas antes de guardar.', control: ctl };
    const tipo = sd_(d.tipo || (ev && ev.TIPO) || 'Final');
    if (!ev) {
      const n = E.filas.filter(r => r[E.i('CODIGO')] === d.codigo).length + 1;
      const id = 'EVA-' + d.codigo.replace(/^CAP-/, '') + '-' + ('0' + n).slice(-2);
      const enUso = /final/i.test(tipo) && (d.reemplazar || !evalDe_(d.codigo));
      if (enUso) E.filas.forEach((r, k) => { if (r[E.i('CODIGO')] === d.codigo && siNo_(r[E.i('EN_USO')])) setCampos_(E, k, { EN_USO: 'No' }); });
      ev = { ID_EVALUACION: id, CODIGO: d.codigo, VERSION: cap.VERSION || '1', TIPO: tipo, PUBLICO: sd_(d.publico || 'Todos'), PREGUNTAS_POR_INTENTO: porIntento, 'NOTA_MINIMA_%': (num_(d.nota) || NOTA_DEFECTO) + '%', INTENTOS_MAXIMOS: num_(d.intentos) || 'Ilimitados', SORTEO: d.sorteo === false ? 'No' : 'Sí', ESTADO: 'Activa', NOMBRE: cap.NOMBRE + ' · ' + tipo.toLowerCase(), EN_USO: enUso ? 'Sí' : 'No', TOKEN: token12_(), CODIGO_ANTERIOR: '', OBSERVACIONES: sd_(d.observaciones) };
      agregar_(E, [ev]);
      historial_('HyS (portal)', 'EVALUACIONES', id, 'Alta', '', ev.NOMBRE, enUso ? 'Evaluación nueva (en uso)' : 'Evaluación nueva');
    } else {
      const k = E.filas.findIndex(r => r[E.i('ID_EVALUACION')] === ev.ID_EVALUACION), cambios = {};
      if (d.porIntento) cambios.PREGUNTAS_POR_INTENTO = num_(d.porIntento);
      if (d.nota) cambios['NOTA_MINIMA_%'] = num_(d.nota) + '%';
      if (d.intentos !== undefined) cambios.INTENTOS_MAXIMOS = num_(d.intentos) || 'Ilimitados';   // vacío = ilimitados
      if (d.sorteo !== undefined) cambios.SORTEO = d.sorteo ? 'Sí' : 'No';
      setCampos_(E, k, cambios);
    }
    let nro = yaTiene.reduce((m, p) => Math.max(m, num_(p.NRO)), 0);
    const filas = aSumar.map(p => {
      nro++;
      return { ID_PREGUNTA: ev.ID_EVALUACION + '-P' + ('0' + nro).slice(-2), ID_EVALUACION: ev.ID_EVALUACION, NRO: nro, TIPO: 'Opción múltiple', PREGUNTA: p.PREGUNTA,
        OPCION_A: sd_(p.OPCION_A), OPCION_B: sd_(p.OPCION_B), OPCION_C: p.OPCION_C || '', OPCION_D: p.OPCION_D || '', OPCION_E: p.OPCION_E || '', CORRECTA: p.CORRECTA,
        FUNDAMENTO: sd_(p.FUNDAMENTO), RIESGO_EVALUADO: sd_(p.TEMA), MEDIDA_EVALUADA: 's/d', NIVEL: sd_(p.NIVEL), USAR: 'Sí', CODIGO: d.codigo, TEMA: sd_(p.TEMA), ID_PREGUNTA_ANTERIOR: p.ID_PREGUNTA || '', ALTA: hoy };
    });
    agregar_(Q, filas);
    return { ok: true, id: ev.ID_EVALUACION, agregadas: filas.length, reutilizadas: filas.filter(f => f.ID_PREGUNTA_ANTERIOR).length, total: yaTiene.length + filas.length, control: ctl };
  });
}

// ------------------------------------------------------------------ Dictados
function ventana_(o) {
  const abre = !vacio_(o.ABRE) ? fechaHora_(o.ABRE) : fechaHora_(dma_(isoDe_(o.FECHA)) + ' ' + (hhmm_(o.HORA_INICIO) || '00:00'));
  const cierra = !vacio_(o.CIERRA) ? fechaHora_(o.CIERRA) : new Date(abre.getTime() + HS_VENTANA * 3600e3);
  return { abre: abre, cierra: cierra };
}
function aperturaDictado_(o, estadoCap) {
  if (!/^activ/i.test(estadoCap || '')) return { abierta: false, texto: 'Esta capacitación no está activa.' };
  if (/cancel|suspend/i.test(o.ESTADO)) return { abierta: false, texto: 'Este dictado fue ' + String(o.ESTADO).toLowerCase() + '.' };
  const v = ventana_(o), ahora = new Date();
  if (ahora < v.abre) return { abierta: false, texto: 'El registro se abre el ' + fmt_(v.abre) + '.' };
  if (ahora > v.cierra) return { abierta: false, texto: 'El registro de este dictado cerró el ' + fmt_(v.cierra) + '. Si participaste, avisale a Higiene y Seguridad.' };
  return { abierta: true, idDictado: o.ID_DICTADO || 's/d', encuentro: num_(o.ENCUENTRO_N) || 1, texto: 'Dictado del ' + dma_(isoDe_(o.FECHA)), inscripcion: !vacio_(o.LINK_INSCRIPCION) };
}
function resumenDictado_(o) {
  const v = ventana_(o);
  return { id: o.ID_DICTADO, codigo: o.CODIGO, encuentro: o.ENCUENTRO_N, fecha: dma_(isoDe_(o.FECHA)), hora: hhmm_(o.HORA_INICIO), horaFin: hhmm_(o.HORA_FIN), modalidad: o.MODALIDAD, lugar: o.LUGAR, servicios: o.SERVICIO_DESTINO,
    organizador: o.ORGANIZADOR, institucion: o.INSTITUCION, disertantes: o.DISERTANTES, firmantes: o.FIRMANTES, abre: fmt_(v.abre), cierra: fmt_(v.cierra), link: linkPub_('d=' + encodeURIComponent(o.ID_DICTADO)), qr: qrDe_(linkPub_('d=' + encodeURIComponent(o.ID_DICTADO))),
    linkInscripcion: vacio_(o.LINK_INSCRIPCION) ? '' : linkPub_('i=' + encodeURIComponent(o.ID_DICTADO)), cierreInscripcion: o.CIERRE_INSCRIPCION, cupo: o.CUPO_PRESENCIAL, estado: o.ESTADO, observaciones: o.OBSERVACIONES };
}
function textoWhatsapp_(cap, o) {
  // Un solo link por mensaje, para que nadie use el equivocado:
  // antes de la clase, si hay inscripción previa abierta, va el de inscripción; si no, el de registro de asistencia.
  const lineas = ['*Capacitación de Higiene y Seguridad*', cap.NOMBRE + (num_(o.ENCUENTRO_N) > 0 && num_(cap.ENCUENTROS) > 1 ? ' · encuentro ' + o.ENCUENTRO_N + ' de ' + cap.ENCUENTROS : ''),
    'Día: ' + dma_(isoDe_(o.FECHA)) + (hhmm_(o.HORA_INICIO) ? ' · ' + hhmm_(o.HORA_INICIO) + ' h' : ''), 'Modalidad: ' + o.MODALIDAD + (vacio_(o.LUGAR) || /virtual/i.test(o.LUGAR) ? '' : ' · ' + o.LUGAR), ''];
  const v = ventana_(o), ahora = new Date(), id = encodeURIComponent(o.ID_DICTADO);
  const cierreIns = !vacio_(o.CIERRE_INSCRIPCION) ? fechaHora_(o.CIERRE_INSCRIPCION) : v.abre;
  if (!vacio_(o.LINK_INSCRIPCION) && ahora < v.abre && ahora < cierreIns) {
    lineas.push('Inscribite acá (cierra el ' + fmt_(cierreIns) + ' o al completarse el cupo):', linkPub_('i=' + id), '', 'El día de la clase comparto el link para registrar la asistencia.');
  } else {
    lineas.push('Registrá tu asistencia acá (se abre el ' + fmt_(v.abre) + ' y cierra el ' + fmt_(v.cierra) + '):', linkPub_('d=' + id));
  }
  lineas.push('', 'Al abrir el link, la página puede tardar entre 10 y 30 segundos en cargar. Es normal: no la cierres.');
  return lineas.join('\n');
}
function firmantesOrden_(lista) {
  const F = tabla_('_FIRMANTES'), existen = {}; F.filas.forEach(r => { if (r[F.i('ID_FIRMANTE')] && !/^no/i.test(r[F.i('VIGENTE')])) existen[r[F.i('ID_FIRMANTE')]] = 1; });
  lista = (lista || []).filter(x => existen[String(x).trim()]);
  const ids = []; (lista || []).forEach(x => { x = String(x).trim(); if (x && x !== FIRMA_HYS && ids.indexOf(x) < 0) ids.push(x); });
  return ids.slice(0, MAX_FIRMAS - 1).concat([FIRMA_HYS]);   // la de HyS siempre última (a la derecha)
}
function nuevoIdDictado_(D, fechaIso) {
  const base = 'DIC-' + fechaIso.replace(/-/g, '') + '-';
  const n = D.filas.filter(r => String(r[D.i('ID_DICTADO')]).indexOf(base) === 0).length + 1;
  return base + ('0' + n).slice(-2);
}
function completarDictado_(D, o, cap) {
  const fIso = isoDe_(o.FECHA);
  if (vacio_(o.ID_DICTADO)) o.ID_DICTADO = nuevoIdDictado_(D, fIso);
  const abre = fechaHora_(dma_(fIso) + ' ' + (hhmm_(o.HORA_INICIO) || '00:00'));
  if (vacio_(o.ABRE)) o.ABRE = fmt_(abre);
  if (vacio_(o.CIERRA)) o.CIERRA = fmt_(new Date(abre.getTime() + HS_VENTANA * 3600e3));
  o.LINK = linkReg_('d=' + o.ID_DICTADO); o.QR = qrDe_(o.LINK); o.LINK_PARA_COMPARTIR = o.LINK;
  if (siNo_(o.LINK_INSCRIPCION) || /^http/.test(String(o.LINK_INSCRIPCION))) { o.LINK_INSCRIPCION = linkReg_('i=' + o.ID_DICTADO); if (vacio_(o.CIERRE_INSCRIPCION)) o.CIERRE_INSCRIPCION = o.ABRE; }
  if (vacio_(o.CUPO_PRESENCIAL)) o.CUPO_PRESENCIAL = /^virtual/i.test(o.MODALIDAD) ? 'sin cupo' : capacidad_(o.LUGAR);
  if (vacio_(o.ESTADO)) o.ESTADO = 'Programado';
  if (vacio_(o.VERSION)) o.VERSION = cap ? cap.VERSION : '1';
  if (vacio_(o.FIRMANTES)) o.FIRMANTES = firmantesOrden_([]).join(', ');
  if (vacio_(o.EXTERNA)) o.EXTERNA = vacio_(o.INSTITUCION) ? 'No' : 'Sí';
  if (vacio_(o.ENCUENTRO_N)) o.ENCUENTRO_N = 1;
  ['HORA_FIN', 'LUGAR', 'ESTABLECIMIENTO', 'SERVICIO_DESTINO', 'ORGANIZADOR', 'DISERTANTES', 'INSTITUCION', 'OBSERVACIONES', 'MOTIVO'].forEach(h => { if (vacio_(o[h])) o[h] = h === 'MOTIVO' ? '' : 's/d'; });
  if (vacio_(o.CREADO)) o.CREADO = ahoraTxt_();
  return o;
}
function dictadoGuardar_(d) {
  return conLock_(() => {
    const cap = capDe_(d.codigo); if (!cap) return { ok: false, error: 'Elegí la capacitación.' };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(d.fecha || ''))) return { ok: false, error: 'Falta la fecha.' };
    if (!/^\d{1,2}:\d{2}$/.test(String(d.hora || ''))) return { ok: false, error: 'Falta la hora de inicio.' };
    if (!d.modalidad) return { ok: false, error: 'Elegí la modalidad.' };
    if (!/^virtual/i.test(d.modalidad) && vacio_(d.lugar)) return { ok: false, error: 'Elegí el lugar.' };
    const dis = (d.disertantes || []).filter(x => x && !vacio_(x.nombre));
    if (dis.length > MAX_DISERTANTES) return { ok: false, error: 'Hasta ' + MAX_DISERTANTES + ' disertantes invitados por dictado.' };
    const enc = num_(cap.ENCUENTROS) > 1 ? (num_(d.encuentro) || 1) : 1;
    if (num_(cap.ENCUENTROS) > 1 && enc > num_(cap.ENCUENTROS)) return { ok: false, error: 'El programa tiene ' + cap.ENCUENTROS + ' encuentros.' };
    const D = tabla_('DICTADOS');
    // REGLA (Belén, 18/10/2026): una clase abierta híbrida (no programa) lleva inscripción previa y se publica sola en la agenda y en los sitios
    const abierta = /^h[ií]brida/i.test(modalidadPorLugar_(d.modalidad, d.lugar)) && num_(cap.ENCUENTROS) <= 1;
    const o = completarDictado_(D, {
      CODIGO: cap.CODIGO, VERSION: cap.VERSION, ENCUENTRO_N: enc, FECHA: dma_(d.fecha), HORA_INICIO: d.hora, HORA_FIN: d.horaFin || '', MODALIDAD: modalidadPorLugar_(d.modalidad, d.lugar),
      LUGAR: /^virtual/i.test(d.modalidad) ? 'Virtual' : d.lugar, ESTABLECIMIENTO: sd_(d.establecimiento), SERVICIO_DESTINO: (d.servicios || []).join(' · ') || 'Todos',
      ORGANIZADOR: sd_(d.organizador || 'Higiene y Seguridad'), INSTITUCION: sd_(d.institucion), DISERTANTES: dis.map(x => x.nombre + (vacio_(x.detalle) ? '' : ' (' + x.detalle + ')')).join(' · ') || 'Belén Pellegrini',
      FIRMANTES: firmantesOrden_(d.firmantes).join(', '), LINK_INSCRIPCION: (abierta || (d.inscripcion === undefined ? siNo_(cap.INSCRIPCION_PREVIA) : d.inscripcion)) ? 'Sí' : '',
      CUPO_PRESENCIAL: d.cupo ? String(d.cupo) : '', OBSERVACIONES: sd_(d.observaciones),
      DISERTANTES_DATOS: dis.length ? JSON.stringify(dis.map(x => ({ nombre: String(x.nombre).trim(), detalle: vacio_(x.detalle) ? '' : String(x.detalle).trim(), dni: soloDni_(x.dni) || String(x.dni || '').trim(), correo: String(x.correo || '').trim(), trato: x.trato || '' }))) : ''
    }, cap);
    agregar_(D, [o]);
    historial_('HyS (portal)', 'DICTADOS', o.ID_DICTADO, 'Alta', '', cap.CODIGO + ' · ' + o.FECHA + ' ' + o.HORA_INICIO, 'Dictado nuevo');
    let publicado = '';
    if (abierta) { try { publicado = claseAbiertaDeDictado_(o); } catch (e) { publicado = 'No se pudo publicar la clase abierta: ' + e.message; } }
    else if (num_(cap.ENCUENTROS) > 1 && enc === 1 && /^http/.test(String(o.LINK_INSCRIPCION || ''))) { try { publicado = publicarClases_(); } catch (e) { publicado = 'No se pudo publicar el programa: ' + e.message; } }   // programa con inscripción: se publica solo
    const r = resumenDictado_(o); r.publicado = publicado; r.ok = true; r.whatsapp = textoWhatsapp_(cap, o); r.qrInscripcion = r.linkInscripcion ? qrDe_(r.linkInscripcion) : '';
    r.aviso = /^activ/i.test(cap.ESTADO) ? '' : 'La capacitación está en «' + cap.ESTADO + '»: el registro no abre hasta que la actives.';
    return r;
  });
}
function dictadosLista_(d) {
  const D = tabla_('DICTADOS'), I = tabla_('INSCRIPCIONES'), R = tabla_('REGISTROS'), C = tabla_('CATALOGO'), nom = {}, caps = {};
  C.filas.forEach(r => { nom[r[C.i('CODIGO')]] = r[C.i('NOMBRE')]; caps[r[C.i('CODIGO')]] = obj_(C, r); });
  const ins = {}, asis = {};
  I.filas.forEach(r => { const id = r[I.i('ID_DICTADO')]; if (id && !/anulad/i.test(r[I.i('ESTADO')])) ins[id] = (ins[id] || 0) + 1; });
  R.filas.forEach(r => { const id = r[R.i('ID_DICTADO')]; if (id && !/anulad/i.test(r[R.i('ESTADO')])) { asis[id] = asis[id] || {}; asis[id][r[R.i('DNI')]] = 1; } });
  const desde = new Date(Date.now() - (num_(d && d.dias) || 30) * 864e5);
  const lista = D.filas.map(r => obj_(D, r)).filter(o => o.ID_DICTADO && ventana_(o).cierra >= desde).map(o => {
    const x = resumenDictado_(o); x.nombre = nom[o.CODIGO] || o.CODIGO; x.inscriptos = ins[o.ID_DICTADO] || 0; x.asistentes = Object.keys(asis[o.ID_DICTADO] || {}).length;
    const v = ventana_(o), ahora = new Date(); x.ahora = /cancel|suspend/i.test(o.ESTADO) ? o.ESTADO : ahora < v.abre ? 'Próximo' : ahora <= v.cierra ? 'Registro abierto' : 'Cerrado';
    x.whatsapp = textoWhatsapp_(caps[o.CODIGO] || { NOMBRE: x.nombre, ENCUENTROS: 1 }, o); return x;
  }).sort((a, b) => fechaHora_(a.abre) - fechaHora_(b.abre));
  return { ok: true, lista: lista };
}
function dictadoEstado_(d) {
  return conLock_(() => {
    const D = tabla_('DICTADOS'), k = D.filas.findIndex(r => r[D.i('ID_DICTADO')] === d.id);
    if (k < 0) return { ok: false, error: 'No existe el dictado ' + d.id + '.' };
    if (vacio_(d.motivo)) return { ok: false, error: 'Escribí el motivo (queda en el historial).' };
    const antes = D.filas[k][D.i('ESTADO')];
    setCampos_(D, k, { ESTADO: d.estado, MOTIVO: d.motivo }); historial_('HyS (portal)', 'DICTADOS', d.id, 'ESTADO', antes, d.estado, d.motivo);
    return { ok: true };
  });
}

// ------------------------------------------------------------------ Inscripciones
function cupoUsado_(I, idDic) { return I.filas.filter(r => r[I.i('ID_DICTADO')] === idDic && !/anulad/i.test(r[I.i('ESTADO')]) && !/virtual/i.test(r[I.i('MODALIDAD_ELEGIDA')])).length; }
function inscripcionDe_(I, idDic, doc) { return I.filas.findIndex(r => r[I.i('ID_DICTADO')] === idDic && r[I.i('DNI')] === doc && !/anulad/i.test(r[I.i('ESTADO')])); }
function inscInicio(i) {
  preparar_();
  const D = tabla_('DICTADOS'), r = D.filas.find(x => x[D.i('ID_DICTADO')] === i);
  if (!r) return { ok: false, error: 'No encontramos esta inscripción. Revisá el link.' };
  const o = obj_(D, r), cap = capDe_(o.CODIGO) || {};
  if (vacio_(o.LINK_INSCRIPCION)) return { ok: false, error: 'Este dictado no tiene inscripción previa: el día de la clase vas a poder registrar tu asistencia.' };
  const I = tabla_('INSCRIPCIONES'), cupo = num_(o.CUPO_PRESENCIAL), usado = cupoUsado_(I, o.ID_DICTADO), v = ventana_(o);
  const cierre = !vacio_(o.CIERRE_INSCRIPCION) ? fechaHora_(o.CIERRE_INSCRIPCION) : v.abre;
  const lleno = cupo > 0 && usado >= cupo, hib = /h[ií]brida/i.test(o.MODALIDAD), virt = /^virtual/i.test(o.MODALIDAD);
  let abierta = true, texto = '';
  if (/cancel|suspend/i.test(o.ESTADO)) { abierta = false; texto = 'Este dictado fue ' + String(o.ESTADO).toLowerCase() + '.'; }
  else if (new Date() > cierre) { abierta = false; texto = 'La inscripción cerró el ' + fmt_(cierre) + '.'; }
  else if (lleno && !hib && !virt) { abierta = false; texto = 'Se completó el cupo de ' + cupo + ' lugares.'; }
  const opciones = hib ? (lleno ? ['Virtual'] : ['Presencial', 'Virtual']) : [virt ? 'Virtual' : 'Presencial'];
  const programa = num_(cap.ENCUENTROS) > 1 && num_(o.ENCUENTRO_N) === 1 ? num_(cap.ENCUENTROS) : 0;   // inscripción al encuentro 1 = inscripción a todo el programa
  return { ok: true, abierta: abierta, texto: texto, opciones: opciones, cupoLleno: lleno, programa: programa,
    dictado: { id: o.ID_DICTADO, nombre: cap.NOMBRE || o.CODIGO, programa: programa, encuentro: num_(cap.ENCUENTROS) > 1 ? o.ENCUENTRO_N + ' de ' + cap.ENCUENTROS : '', fecha: dma_(isoDe_(o.FECHA)), hora: hhmm_(o.HORA_INICIO), modalidad: o.MODALIDAD, lugar: o.LUGAR, cierre: fmt_(cierre) },
    listas: listasRegistro_() };
}
function inscBuscar(q) {
  const r = regBuscar(q); if (!r.ok) return r;
  const I = tabla_('INSCRIPCIONES'), k = inscripcionDe_(I, q.i, idDoc_(q));
  r.inscripta = k >= 0; if (k >= 0) r.modalidadElegida = I.filas[k][I.i('MODALIDAD_ELEGIDA')];
  return r;
}
function inscGuardar(d) {
  return conLock_(() => {
    const ini = inscInicio(d.i); if (!ini.ok) return ini;
    if (!ini.abierta) return { ok: false, error: ini.texto };
    const per = guardarPersona_(d); if (per.error) return { ok: false, error: per.error };
    const I = tabla_('INSCRIPCIONES');
    if (inscripcionDe_(I, d.i, per.doc) >= 0) return { ok: true, ya: true, mensaje: 'Ya estabas inscripta/o en este dictado.' };
    const mod = ini.opciones.indexOf(d.modalidad) >= 0 ? d.modalidad : ini.opciones[0];
    if (mod === 'Presencial' && ini.cupoLleno) return { ok: false, error: 'Se completó el cupo presencial.' };
    const consulta = String(d.consulta || '').trim().slice(0, 1500);
    agregar_(I, [{ ID_INSCRIPCION: uid_('INS', per.doc), FECHA: ahoraTxt_(), ID_DICTADO: d.i, DNI: per.doc, MODALIDAD_ELEGIDA: mod, CONSULTA_PREVIA: consulta || 's/d',
      ESTADO_CONSULTA: consulta ? 'Pendiente' : 'No aplica', ESTADO: 'Inscripta', ASISTIO: '', CANAL: d.origen === 'qr' ? 'QR' : 'Link', FECHA_ANULACION: '', ANULADA_POR: '', MOTIVO: '',
      CORREO: String(d.correo || '').trim(), TOKEN_CANCELAR: tokenAg_(), RECORDATORIOS: '' }]);   // correo y token: para los recordatorios y para cancelar
    if (ini.programa) return { ok: true, mensaje: 'Listo, quedaste inscripta/o (' + mod.toLowerCase() + ') en el programa completo: ' + ini.programa + ' encuentros, desde el ' + ini.dictado.fecha + (ini.dictado.hora ? ' a las ' + ini.dictado.hora : '') + '. Antes de cada encuentro te llega un recordatorio por correo; el día de cada clase registrás tu asistencia con el link o el QR.' };
    return { ok: true, mensaje: 'Listo, quedaste inscripta/o (' + mod.toLowerCase() + ') para el ' + ini.dictado.fecha + (ini.dictado.hora ? ' a las ' + ini.dictado.hora : '') + '. El día de la clase registrás tu asistencia con el link o el QR.' };
  });
}
function inscAnular_(d, por) {
  return conLock_(() => {
    const I = tabla_('INSCRIPCIONES');
    let k = d.id ? I.filas.findIndex(r => r[I.i('ID_INSCRIPCION')] === d.id) : inscripcionDe_(I, d.i, idDoc_(d));
    if (k < 0) return { ok: false, error: por === 'HyS' ? 'No existe esa inscripción.' : 'No encontramos una inscripción activa con ese documento.' };
    if (/anulad/i.test(I.filas[k][I.i('ESTADO')])) return { ok: true, mensaje: 'Ya estaba anulada.' };
    const motivo = String(d.motivo || '').trim().slice(0, 300) || (por === 'HyS' ? '' : 'Avisó que no puede asistir');
    if (!motivo) return { ok: false, error: 'Escribí el motivo.' };
    setCampos_(I, k, { ESTADO: 'Anulada', FECHA_ANULACION: ahoraTxt_(), ANULADA_POR: por === 'HyS' ? 'HyS' : 'La persona', MOTIVO: motivo });
    historial_(por === 'HyS' ? 'HyS (portal)' : 'Inscripción', 'INSCRIPCIONES', I.filas[k][I.i('ID_INSCRIPCION')], 'ESTADO', I.filas[k][I.i('ESTADO')], 'Anulada', motivo);
    return { ok: true, mensaje: por === 'HyS' ? 'Inscripción anulada. El lugar quedó libre.' : 'Listo, anulamos tu inscripción y el lugar quedó libre para otra persona. ¡Gracias por avisar!' };
  });
}
function inscAnularPropia(d) { return inscAnular_({ i: d.i, doc: d.doc, pais: d.pais, motivo: d.motivo }, 'La persona'); }
function inscConsulta_(d) {
  const I = tabla_('INSCRIPCIONES'), k = I.filas.findIndex(r => r[I.i('ID_INSCRIPCION')] === d.id);
  if (k < 0) return { ok: false, error: 'No existe esa inscripción.' };
  setCampos_(I, k, { ESTADO_CONSULTA: d.estado || 'Respondida' }); return { ok: true };
}
function inscriptos_(id) {
  const D = tabla_('DICTADOS'), r = D.filas.find(x => x[D.i('ID_DICTADO')] === id); if (!r) return { ok: false, error: 'No existe el dictado.' };
  const o = obj_(D, r), I = tabla_('INSCRIPCIONES'), P = tabla_('PERSONAS'), R = tabla_('REGISTROS'), per = {};
  P.filas.forEach(x => per[x[P.i('DNI')]] = obj_(P, x));
  const vinieron = {}; R.filas.forEach(x => { if (x[R.i('ID_DICTADO')] === id && !/anulad/i.test(x[R.i('ESTADO')])) vinieron[x[R.i('DNI')]] = 1; });
  const desc = p => !p ? 's/d' : /estud/i.test(p.PUBLICO) ? sd_(p.CARRERA) + ' · ' + sd_(p.INSTITUCION) : /red/i.test(p.PUBLICO) ? sd_(p.SERVICIO) + ' · ' + sd_(p.ESTABLECIMIENTO) : sd_(p.PROFESION) + ' · ' + sd_(p.INSTITUCION);
  const lista = I.filas.map(x => obj_(I, x)).filter(x => x.ID_DICTADO === id).map(x => {
    const p = per[x.DNI], anul = /anulad/i.test(x.ESTADO);
    return { id: x.ID_INSCRIPCION, fecha: x.FECHA, doc: x.DNI, nombre: p ? (p.APELLIDOS + ', ' + p.NOMBRES) : 's/d', publico: p ? p.PUBLICO : 's/d', detalle: desc(p), correo: p ? p.CORREO : '',
      modalidad: x.MODALIDAD_ELEGIDA, consulta: vacio_(x.CONSULTA_PREVIA) ? '' : x.CONSULTA_PREVIA, estadoConsulta: x.ESTADO_CONSULTA, estado: x.ESTADO,
      asistencia: anul ? 'Avisó que no asiste' : vinieron[x.DNI] ? 'Vino' : (new Date() > ventana_(o).cierra ? 'No vino' : 'Pendiente'), anuladaPor: x.ANULADA_POR, motivo: x.MOTIVO };
  });
  const inscriptosDni = {}; lista.forEach(x => inscriptosDni[x.doc] = 1);
  const sinInscripcion = Object.keys(vinieron).filter(dni => !inscriptosDni[dni]).map(dni => ({ doc: dni, nombre: per[dni] ? per[dni].APELLIDOS + ', ' + per[dni].NOMBRES : 's/d', detalle: desc(per[dni]) }));
  const activos = lista.filter(x => x.estado !== 'Anulada');
  return { ok: true, dictado: resumenDictado_(o), lista: lista, sinInscripcion: sinInscripcion,
    resumen: { activos: activos.length, anuladas: lista.length - activos.length, cupo: o.CUPO_PRESENCIAL, presenciales: activos.filter(x => !/virtual/i.test(x.modalidad)).length, vinieron: activos.filter(x => x.asistencia === 'Vino').length, consultasPendientes: activos.filter(x => /pendiente/i.test(x.estadoConsulta)).length },
    correos: activos.map(x => x.correo).filter(correoOk_).join(', ') };
}
// Agregar un asistente fuera de la ventana de 48 h (solo la administradora, desde el portal)
function asistenteAgregar_(d) {
  return conLock_(() => {
    const D = tabla_('DICTADOS'), r = D.filas.find(x => x[D.i('ID_DICTADO')] === d.idDictado); if (!r) return { ok: false, error: 'No existe el dictado.' };
    const o = obj_(D, r), cap = capDe_(o.CODIGO), doc = soloDni_(d.doc);
    if (!doc) return { ok: false, error: 'Escribí el DNI.' };
    const P = tabla_('PERSONAS');
    if (!P.filas.some(x => x[P.i('DNI')] === doc)) {
      const b = enBase_(doc); if (!b) return { ok: false, error: 'Esa persona no está en PERSONAS ni en la base de trabajadores. Cargala por CARGA_MANUAL con sus datos.' };
      agregar_(P, [{ DNI: doc, PAIS_DOCUMENTO: 'Argentina', APELLIDOS: b.APELLIDOS, NOMBRES: b.NOMBRES, PUBLICO: RED_TRELEW.indexOf(b.ESTABLECIMIENTO) >= 0 ? 'Red Trelew' : 'Red Chubut', ESTABLECIMIENTO: b.ESTABLECIMIENTO, SERVICIO: sd_(b.SERVICIO), FUNCION: sd_(b.FUNCION), VINCULO: sd_(b.VINCULO), CORREO: sd_(b.EMAIL), TELEFONO: sd_(b.TELEFONO), ORIGEN_DE_DATOS: 'Base de trabajadores', ULTIMA_ACTUALIZACION: ahoraTxt_() }]);
    }
    const R = tabla_('REGISTROS');
    if (R.filas.some(x => x[R.i('DNI')] === doc && x[R.i('ID_DICTADO')] === o.ID_DICTADO && !/anulad/i.test(x[R.i('ESTADO')]))) return { ok: true, mensaje: 'Ya tenía la asistencia registrada.' };
    const f = isoDe_(o.FECHA);
    const reg = { ID_REGISTRO: uid_('REG', doc), FECHA: dma_(f), DNI: doc, CODIGO: o.CODIGO, VERSION: o.VERSION || '1', ID_DICTADO: o.ID_DICTADO, ENCUENTRO_N: num_(cap && cap.ENCUENTROS) > 1 ? o.ENCUENTRO_N : '', TIPO: 'Asistencia', ID_EVALUACION: '', NOTA: '', APROBADO: '',
      CICLO: cicloDe_(f), VENCE: cap && /no vence/i.test(cap.VENCE) ? 'No vence' : dma_(masDoce_(f)), ORIGEN: 'Agregado por HyS', CARGADO_POR: 'Administradora', ESTADO: 'Válido', MOTIVO_ANULACION: '' };
    agregar_(R, [reg]);
    certAlRegistrar_(reg);
    marcarAsistio_(o.ID_DICTADO, doc);
    historial_('HyS (portal)', 'REGISTROS', doc, 'Asistencia', '', o.ID_DICTADO, sd_(d.motivo || 'Agregado fuera de la ventana de 48 h'));
    CacheService.getScriptCache().remove('tablero');
    return { ok: true, mensaje: 'Asistencia agregada.' };
  });
}
function marcarAsistio_(idDic, doc) {
  const I = tabla_('INSCRIPCIONES'), k = inscripcionDe_(I, idDic, doc);
  if (k >= 0 && !siNo_(I.filas[k][I.i('ASISTIO')])) setCampos_(I, k, { ASISTIO: 'Sí' });
}

// ------------------------------------------------------------------ Evaluación en línea (sigue al registro, en la misma página)
function intentosDe_(doc, idEval, idDic) {
  const T = tabla_('_INTENTOS'), hoy = iso_(new Date());
  return T.filas.map((r, k) => ({ o: obj_(T, r), k: k })).filter(x => x.o.DNI === doc && x.o.ID_EVALUACION === idEval &&
    (idDic === 'PERMANENTE' ? (x.o.ID_DICTADO === 'PERMANENTE' && isoDe_(x.o.FECHA) === hoy) : idDic === VIDEO_DIC ? (x.o.ID_DICTADO === VIDEO_DIC && cicloDe_(isoDe_(x.o.FECHA) || hoy) === cicloDe_(hoy)) : x.o.ID_DICTADO === idDic));
}
function evalInicio(d) {
  preparar_();
  const ini = regInicio(d.k, d.c, d.d, d.av); if (!ini.ok) return ini;
  if (!ini.evaluacion) return { ok: false, error: 'Esta capacitación todavía no tiene la evaluación cargada. Avisale a Higiene y Seguridad.' };
  if (!ini.abierta.abierta) return { ok: false, error: ini.abierta.texto };
  const doc = idDoc_(d), P = tabla_('PERSONAS');
  if (!P.filas.some(r => r[P.i('DNI')] === doc)) return { ok: false, error: 'Primero completá el registro con tus datos.' };
  if (ini.abierta.video && !estadoVideos_(doc, ini.cap.codigo, videosDe_(ini.cap.codigo)).completos) return { ok: false, error: 'Para rendir la evaluación primero mirá al menos el ' + Math.round(VIDEO_MIN * 100) + ' % de ' + (ini.videos.length > 1 ? 'cada video' : 'el video') + '.' };
  const ev = evalDe_(ini.cap.codigo, ini.evaluacion), idDic = ini.abierta.idDictado;
  return conLock_(() => {
    const prev = intentosDe_(doc, ev.ID_EVALUACION, idDic), max = maxIntentos_(ev);   // 0 = ilimitados
    if (prev.some(x => siNo_(x.o.APROBADO))) return { ok: true, yaAprobada: true, mensaje: 'Ya aprobaste esta evaluación. ¡Bien!' };
    const enCurso = prev.find(x => /curso/i.test(x.o.APROBADO));
    const usados = prev.filter(x => !/curso/i.test(x.o.APROBADO)).length;
    if (!enCurso && max && usados >= max) return { ok: false, agotado: true, error: 'Ya usaste los ' + max + ' intentos de esta evaluación. Comunicate con Higiene y Seguridad para volver a rendirla.' };
    const pool = preguntasDe_(ev.ID_EVALUACION), sortear = !/^no/i.test(ev.SORTEO);
    if (!pool.length) return { ok: false, error: 'La evaluación no tiene preguntas activas. Avisale a Higiene y Seguridad.' };
    const cuantas = Math.min(num_(ev.PREGUNTAS_POR_INTENTO) || pool.length, pool.length);
    let elegidas, orden, idNuevo = '';
    if (enCurso) {   // si recargó la página, sigue el mismo intento
      orden = JSON.parse(enCurso.o.PREGUNTAS || '[]'); const porId = {}; pool.forEach(p => porId[p.ID_PREGUNTA] = p);
      elegidas = orden.map(x => porId[x.id]).filter(Boolean);
    } else {
      elegidas = (sortear ? mezclar_(pool) : pool).slice(0, cuantas);
      orden = elegidas.map(p => { const ls = ['A', 'B', 'C', 'D', 'E'].filter(l => !vacio_(p['OPCION_' + l])); return { id: p.ID_PREGUNTA, ops: sortear ? mezclar_(ls) : ls }; });
      idNuevo = uid_('INT', doc);
      agregar_(tabla_('_INTENTOS'), [{ ID_INTENTO: idNuevo, FECHA: ahoraTxt_(), DNI: doc, ID_EVALUACION: ev.ID_EVALUACION, ID_DICTADO: idDic, INTENTO_N: usados + 1, PREGUNTAS: JSON.stringify(orden), RESPUESTAS: '', CORRECTAS: '', NOTA: '', APROBADO: 'En curso' }]);
    }
    const intento = enCurso ? enCurso.o.ID_INTENTO : idNuevo;
    return { ok: true, idIntento: intento, intento: enCurso ? num_(enCurso.o.INTENTO_N) : usados + 1, maximo: max, nota: num_(ev['NOTA_MINIMA_%']) || NOTA_DEFECTO, nombre: ini.cap.nombre,
      preguntas: elegidas.map((p, n) => ({ id: p.ID_PREGUNTA, n: n + 1, texto: p.PREGUNTA, opciones: orden[n].ops.map(l => ({ k: l, t: p['OPCION_' + l] })) })) };
  });
}
function evalEntregar(d) {
  return conLock_(() => {
    const T = tabla_('_INTENTOS'), k = T.filas.findIndex(r => r[T.i('ID_INTENTO')] === d.idIntento);
    if (k < 0) return { ok: false, error: 'No encontramos este intento. Volvé a abrir el link.' };
    const it = obj_(T, T.filas[k]);
    if (!/curso/i.test(it.APROBADO)) return { ok: false, error: 'Este intento ya fue entregado.' };
    const ev = evaluaciones_().find(o => o.ID_EVALUACION === it.ID_EVALUACION); if (!ev) return { ok: false, error: 'No encontramos la evaluación.' };
    const orden = JSON.parse(it.PREGUNTAS || '[]'), todas = {}; preguntasDe_(it.ID_EVALUACION, true).forEach(p => todas[p.ID_PREGUNTA] = p);
    const resp = d.respuestas || {}; let bien = 0; const detalle = [], temas = [];
    orden.forEach(x => {
      const p = todas[x.id]; if (!p) return;
      const elegida = String(resp[x.id] || '').toUpperCase(), ok = elegida && elegida === String(p.CORRECTA).toUpperCase();
      if (ok) bien++; else { const t = temaDe_(p); if (t && temas.indexOf(t) < 0) temas.push(t); }
      detalle.push({ texto: p.PREGUNTA, elegida: elegida ? p['OPCION_' + elegida] : '(sin responder)', correcta: p['OPCION_' + p.CORRECTA], bien: !!ok, fundamento: vacio_(p.FUNDAMENTO) ? '' : p.FUNDAMENTO });
    });
    const total = orden.length, nota = total ? Math.round(100 * bien / total) : 0, min = num_(ev['NOTA_MINIMA_%']) || NOTA_DEFECTO, aprobado = nota >= min;
    const max = maxIntentos_(ev), restantes = max ? Math.max(0, max - num_(it.INTENTO_N)) : -1;   // -1 = ilimitados (nunca se agotan)
    setCampos_(T, k, { RESPUESTAS: JSON.stringify(resp), CORRECTAS: bien + ' de ' + total, NOTA: nota, APROBADO: aprobado ? 'Sí' : 'No' });
    // Registro: si aprueba, o si no aprueba en el último intento (queda para tu seguimiento)
    const cap = capDe_(ev.CODIGO) || {}, hoyIso = iso_(new Date());
    let encuesta = false, certificado = '';
    if (aprobado || !restantes) {
      const D = tabla_('DICTADOS'), dr = D.filas.find(r => r[D.i('ID_DICTADO')] === it.ID_DICTADO), dic = dr ? obj_(D, dr) : null;
      encuesta = !!(dic && !vacio_(dic.LINK_INSCRIPCION));
      const reg = { ID_REGISTRO: uid_('REG', it.DNI), FECHA: Utilities.formatDate(new Date(), ZONA, 'dd/MM/yyyy HH:mm'), DNI: it.DNI, CODIGO: ev.CODIGO, VERSION: cap.VERSION || '1', ID_DICTADO: it.ID_DICTADO,
        ENCUENTRO_N: dic && num_(cap.ENCUENTROS) > 1 ? dic.ENCUENTRO_N : '', TIPO: 'Evaluación', ID_EVALUACION: ev.ID_EVALUACION, NOTA: nota, APROBADO: aprobado ? 'Sí' : 'No', CICLO: cicloDe_(hoyIso),
        VENCE: /no vence/i.test(cap.VENCE) ? 'No vence' : dma_(masDoce_(hoyIso)), ORIGEN: it.ID_DICTADO === VIDEO_DIC ? 'Video autoadministrado' : 'Evaluación en línea', CARGADO_POR: 'Registro', ESTADO: 'Válido', MOTIVO_ANULACION: '' };
      agregar_(tabla_('REGISTROS'), [reg]);
      if (it.ID_DICTADO === VIDEO_DIC) { const hv = horasVideo_(ev.CODIGO); if (hv) reg.HORAS = hv; }
      if (aprobado) certificado = certAlRegistrar_(reg);
      if (it.ID_DICTADO !== 'PERMANENTE') marcarAsistio_(it.ID_DICTADO, it.DNI);
      CacheService.getScriptCache().remove('tablero');
    }
    if (aprobado) return { ok: true, aprobado: true, nota: nota, correctas: bien, total: total, detalle: detalle, encuesta: encuesta, idDictado: it.ID_DICTADO, certificado: certificado,
      programa: num_(cap.ENCUENTROS) > 1 && !certificado };
    return { ok: true, aprobado: false, temas: temas, restantes: restantes, encuesta: encuesta && !restantes, idDictado: it.ID_DICTADO };   // sin nota ni respuestas
  });
}

// ------------------------------------------------------------------ Encuesta de satisfacción (anónima; solo en dictados con inscripción previa)
function encuestaPreguntas() {
  return preguntasDe_(ENCUESTA).map(p => ({ id: p.ID_PREGUNTA, texto: p.PREGUNTA, tipo: p.TIPO, opciones: ['A', 'B', 'C', 'D', 'E'].map(l => p['OPCION_' + l]).filter(x => !vacio_(x)) }));
}
function encuestaGuardar(d) {
  const D = tabla_('DICTADOS'), r = D.filas.find(x => x[D.i('ID_DICTADO')] === d.idDictado);
  if (!r) return { ok: false, error: 'No encontramos el dictado.' };
  const v = d.respuestas || [], o = obj_(D, r);
  agregar_(tabla_('_ENCUESTAS'), [{ ID_RESPUESTA: 'ENC-' + sello_() + '-' + Math.floor(Math.random() * 900 + 100), FECHA: Utilities.formatDate(new Date(), ZONA, 'dd/MM/yyyy'), CODIGO: o.CODIGO, ID_DICTADO: o.ID_DICTADO,
    UTILIDAD_1_5: sd_(v[0]), CLARIDAD_1_5: sd_(v[1]), DISERTANTE_1_5: sd_(v[2]), DURACION_MODALIDAD: sd_(v[3]), COMENTARIOS: String(v[4] || '').trim().slice(0, 1500) || 's/d' }]);
  return { ok: true, mensaje: '¡Gracias! Tu opinión nos ayuda a mejorar.' };
}

// ------------------------------------------------------------------ Firmantes
function firmantes_() {
  const F = tabla_('_FIRMANTES');
  return F.filas.map(r => obj_(F, r)).filter(o => o.ID_FIRMANTE).map(o => ({ id: o.ID_FIRMANTE, nombre: o.NOMBRE, titulo: o.TITULO, cargo: o.CARGO, organismo: o.ORGANISMO, matricula: o.MATRICULA, tipo: o.TIPO,
    firma: vacio_(o.IMAGEN_FIRMA) ? '' : o.IMAGEN_FIRMA, sello: vacio_(o.IMAGEN_SELLO) ? '' : o.IMAGEN_SELLO, aclaracion: o.ACLARACION, correo: o.CORREO, telefono: o.TELEFONO, vigente: siNo_(o.VIGENTE), observaciones: o.OBSERVACIONES }));
}
function carpetaFirmas_() {
  const lib = DriveApp.getFileById(SpreadsheetApp.getActive().getId()), padres = lib.getParents();
  const base = padres.hasNext() ? padres.next() : DriveApp.getRootFolder(), it = base.getFoldersByName('FIRMAS');
  return it.hasNext() ? it.next() : base.createFolder('FIRMAS');
}
function guardarImagen_(img, nombre) {
  if (!img || !img.b64) return '';
  const tipo = /png/i.test(img.tipo) ? 'image/png' : /jpe?g/i.test(img.tipo) ? 'image/jpeg' : '';
  if (!tipo) throw new Error('La imagen tiene que ser PNG o JPG.');
  const blob = Utilities.newBlob(Utilities.base64Decode(String(img.b64).replace(/^data:[^,]+,/, '')), tipo, nombre + (tipo === 'image/png' ? '.png' : '.jpg'));
  if (blob.getBytes().length > 2 * 1024 * 1024) throw new Error('La imagen pesa más de 2 MB. Achicala y probá de nuevo.');
  return carpetaFirmas_().createFile(blob).getUrl();
}
function firmanteGuardar_(d) {
  return conLock_(() => {
    try {
      const F = tabla_('_FIRMANTES');
      if (vacio_(d.NOMBRE)) return { ok: false, error: 'Falta el nombre.' };
      const acl = String(d.ACLARACION || '').trim();
      if (acl.split(/\n/).length > 3 || acl.length > 150) return { ok: false, error: 'La aclaración del sello tiene que entrar en 3 renglones (hasta 150 letras).' };
      let k = d.ID_FIRMANTE ? F.filas.findIndex(r => r[F.i('ID_FIRMANTE')] === d.ID_FIRMANTE) : -1;
      const id = k >= 0 ? d.ID_FIRMANTE : 'FIR-' + ('00' + (F.filas.reduce((m, r) => Math.max(m, Number((String(r[F.i('ID_FIRMANTE')]).match(/(\d+)$/) || [])[1] || 0)), 0) + 1)).slice(-3);
      const o = { ID_FIRMANTE: id };
      ['NOMBRE', 'TITULO', 'CARGO', 'ORGANISMO', 'MATRICULA', 'TIPO', 'ACLARACION', 'CORREO', 'TELEFONO', 'OBSERVACIONES'].forEach(h => { if (d[h] !== undefined) o[h] = String(d[h]).trim() || 's/d'; });
      if (d.firma) o.IMAGEN_FIRMA = guardarImagen_(d.firma, id + '_firma');
      if (d.sello) o.IMAGEN_SELLO = guardarImagen_(d.sello, id + '_sello');
      o.VIGENTE = d.vigente === false ? 'No' : 'Sí';
      if (k >= 0) {
        const antes = obj_(F, F.filas[k]), cambios = {}; Object.keys(o).forEach(h => { if (String(o[h]) !== String(antes[h])) cambios[h] = o[h]; });
        setCampos_(F, k, cambios); Object.keys(cambios).forEach(h => historial_('HyS (portal)', '_FIRMANTES', id, h, /IMAGEN/.test(h) ? '(imagen)' : antes[h], /IMAGEN/.test(h) ? '(imagen nueva)' : cambios[h], 'Ficha de firmante'));
      } else {
        F.H.forEach(h => { if (h && o[h] === undefined) o[h] = 's/d'; });
        agregar_(F, [o]); historial_('HyS (portal)', '_FIRMANTES', id, 'Alta', '', o.NOMBRE, 'Firmante nuevo');
      }
      return { ok: true, id: id };
    } catch (e) { return { ok: false, error: e.message }; }
  });
}

// ------------------------------------------------------------------ Migración de evaluaciones y preguntas (una sola vez)
function menuMigrarEvaluaciones() {
  const ui = SpreadsheetApp.getUi(); preparar_();
  if (tabla_('EVALUACIONES').filas.some(r => /^EVA-HYS-/.test(r[0]))) { ui.alert('Las evaluaciones ya se migraron. No se repite para no duplicar.'); return; }
  if (ui.alert('Migrar evaluaciones', 'Se copian las evaluaciones y las preguntas del catálogo actual, con su TOKEN (los links siguen sirviendo). El libro actual no se modifica. ¿Seguimos?', ui.ButtonSet.YES_NO) !== ui.Button.YES) return;
  const r = migrarEvaluaciones_();
  ui.alert('Migración terminada', 'Evaluaciones: ' + r.evaluaciones + '\nPreguntas: ' + r.preguntas + '\nEn uso por capacitación: ' + r.enUso + '\nFilas originales en _ARCHIVO: ' + r.archivo + '\n\nIntentos permitidos: ' + (INTENTOS_DEFECTO || 'ilimitados') + ' (se cambia en EVALUACIONES › INTENTOS_MAXIMOS).', ui.ButtonSet.OK);
}
function migrarEvaluaciones_() {
  preparar_();
  const libC = SpreadsheetApp.openById(ID.catalogo), hoy = ahoraTxt_(), arch = [];
  const ev = hojaDe_(libC, 'EVALUACIONES').getDataRange().getDisplayValues(), EH = ev[0].map(x => String(x).trim()), e = n => EH.indexOf(n);
  const pv = hojaDe_(libC, 'PREGUNTAS').getDataRange().getDisplayValues(), PH = pv[0].map(x => String(x).trim()), p = n => PH.indexOf(n);
  const cv = hojaDe_(libC, 'CAPACITACIONES').getDataRange().getDisplayValues(), CH = cv[0].map(x => String(x).trim()), enUso = {};
  cv.slice(1).forEach(r => { if (r[CH.indexOf('ID_EVALUACION')]) enUso[r[CH.indexOf('ID_EVALUACION')]] = 1; });
  const guardar = (hoja_, fila, clave, H, r) => { const o = {}; H.forEach((h, k) => { if (h && r[k] !== '') o[h] = r[k]; }); arch.push({ LIBRO_ORIGEN: 'CATALOGO_CAPACITACIONES_2026', HOJA_ORIGEN: hoja_, FILA_ORIGEN: fila, CLAVE: clave, DATOS: JSON.stringify(o).slice(0, 49000), FECHA_MIGRACION: hoy }); };
  const evals = ev.slice(1).filter(r => r[e('ID_EVALUACION')]).map((r, k) => {
    guardar('EVALUACIONES', k + 2, r[e('ID_EVALUACION')], EH, r);
    const nom = r[e('NOMBRE')], id = r[e('ID_EVALUACION')];
    return { ID_EVALUACION: id, CODIGO: r[e('ID_CAPACITACION')], VERSION: '1', TIPO: /diagn/i.test(nom) ? 'Diagnóstica' : 'Final', PUBLICO: sd_(r[e('PUBLICO')]),
      PREGUNTAS_POR_INTENTO: sd_(r[e('PREGUNTAS_POR_INTENTO')]), 'NOTA_MINIMA_%': sd_(r[e('NOTA_MINIMA_%')]), INTENTOS_MAXIMOS: INTENTOS_DEFECTO || 'Ilimitados', SORTEO: siNo_(r[e('SORTEO')]) ? 'Sí' : 'No',
      ESTADO: sd_(r[e('ESTADO')]), NOMBRE: sd_(nom), EN_USO: enUso[id] ? 'Sí' : 'No', TOKEN: sd_(r[e('TOKEN')]), CODIGO_ANTERIOR: sd_(r[e('CODIGO_ANTERIOR')]), OBSERVACIONES: sd_(r[e('ENFOQUE')]) };
  });
  const preg = pv.slice(1).filter(r => r[p('ID_PREGUNTA')]).map((r, k) => {
    guardar('PREGUNTAS', k + 2, r[p('ID_PREGUNTA')], PH, r);
    return { ID_PREGUNTA: r[p('ID_PREGUNTA')], ID_EVALUACION: r[p('ID_EVALUACION')], NRO: r[p('NRO')], TIPO: sd_(r[p('TIPO_PREGUNTA')]), PREGUNTA: r[p('PREGUNTA')],
      OPCION_A: r[p('OPCION_A')], OPCION_B: r[p('OPCION_B')], OPCION_C: r[p('OPCION_C')], OPCION_D: r[p('OPCION_D')], OPCION_E: r[p('OPCION_E')], CORRECTA: String(r[p('RESPUESTA_CORRECTA')]).trim().toUpperCase(),
      FUNDAMENTO: sd_(r[p('FUNDAMENTO')]), RIESGO_EVALUADO: sd_(r[p('RIESGO_EVALUADO')]), MEDIDA_EVALUADA: sd_(r[p('MEDIDA_PREVENTIVA_EVALUADA')]), NIVEL: sd_(r[p('NIVEL')]),
      USAR: /^no/i.test(r[p('USAR')]) || /inactiv|anulad/i.test(r[p('ESTADO_PREGUNTA')]) ? 'No' : 'Sí', CODIGO: r[p('ID_CAPACITACION')], TEMA: sd_(r[p('RIESGO_EVALUADO')]), ID_PREGUNTA_ANTERIOR: sd_(r[p('ID_PREGUNTA_ANTERIOR')]), ALTA: 'Migración ' + hoy };
  });
  agregar_(tabla_('EVALUACIONES'), evals);
  const Q = tabla_('PREGUNTAS'); for (let k = 0; k < preg.length; k += 1500) agregar_(Q, preg.slice(k, k + 1500));
  const A = tabla_('_ARCHIVO'); for (let k = 0; k < arch.length; k += 2000) agregar_(A, arch.slice(k, k + 2000));
  historial_('Migración', 'EVALUACIONES y PREGUNTAS', '-', '-', '', 'Evaluaciones ' + evals.length + ' · preguntas ' + preg.length, 'Migración desde CATALOGO_CAPACITACIONES_2026');
  return { evaluaciones: evals.length, preguntas: preg.length, enUso: evals.filter(x => x.EN_USO === 'Sí').length, archivo: arch.length };
}

// ------------------------------------------------------------------ Respaldo en Sheets: completar lo cargado a mano
function menuCompletar() {
  preparar_();
  const r = completarFilas_();
  SpreadsheetApp.getUi().alert('Filas completadas', 'Capacitaciones: ' + r.cap + '\nEvaluaciones: ' + r.eva + '\nPreguntas: ' + r.preg + '\nDictados: ' + r.dic + (r.avisos.length ? '\n\nRevisar:\n' + r.avisos.join('\n') : ''), SpreadsheetApp.getUi().ButtonSet.OK);
}
function completarFilas_() {
  return conLock_(() => {
    const out = { cap: 0, eva: 0, preg: 0, dic: 0, avisos: [] };
    const C = tabla_('CATALOGO');
    C.filas.forEach((r, k) => {
      const o = obj_(C, r); if (vacio_(o.NOMBRE)) return; const c = {};
      if (vacio_(o.CODIGO)) { const nros = C.filas.map(x => Number((String(x[C.i('CODIGO')]).match(/^CAP-HYS-(\d{3})/) || [])[1] || 0)); c.CODIGO = 'CAP-HYS-' + ('00' + (Math.max.apply(null, nros.concat([0])) + 1)).slice(-3); C.filas[k][C.i('CODIGO')] = c.CODIGO; }
      if (vacio_(o.TOKEN)) { c.TOKEN = token12_(); c.LINK_PERMANENTE = linkReg_('k=' + c.TOKEN); c.QR_PERMANENTE = qrDe_(c.LINK_PERMANENTE); }
      if (vacio_(o.VERSION)) c.VERSION = '1'; if (vacio_(o.ESTADO)) c.ESTADO = 'Borrador';
      if (Object.keys(c).length) { setCampos_(C, k, c); out.cap++; }
    });
    const E = tabla_('EVALUACIONES');
    E.filas.forEach((r, k) => { const o = obj_(E, r); if (!o.ID_EVALUACION || o.ID_EVALUACION === ENCUESTA) return; if (vacio_(o.TOKEN)) { setCampos_(E, k, { TOKEN: token12_() }); out.eva++; } });
    const Q = tabla_('PREGUNTAS'), nros = {};
    Q.filas.forEach(r => { const id = r[Q.i('ID_EVALUACION')]; nros[id] = Math.max(nros[id] || 0, num_(r[Q.i('NRO')])); });
    Q.filas.forEach((r, k) => {
      const o = obj_(Q, r); if (vacio_(o.PREGUNTA) || !vacio_(o.ID_PREGUNTA)) return;
      if (vacio_(o.ID_EVALUACION)) { out.avisos.push('PREGUNTAS fila ' + (k + 6) + ': falta ID_EVALUACION'); return; }
      const n = num_(o.NRO) || (nros[o.ID_EVALUACION] = (nros[o.ID_EVALUACION] || 0) + 1);
      setCampos_(Q, k, { ID_PREGUNTA: o.ID_EVALUACION + '-P' + ('0' + n).slice(-2), NRO: n, USAR: vacio_(o.USAR) ? 'Sí' : o.USAR, CORRECTA: String(o.CORRECTA).trim().toUpperCase(), ALTA: ahoraTxt_() }); out.preg++;
    });
    const D = tabla_('DICTADOS');
    D.filas.forEach((r, k) => {
      const o = obj_(D, r); if (vacio_(o.CODIGO) || vacio_(o.FECHA) || (!vacio_(o.ID_DICTADO) && !vacio_(o.LINK))) return;
      const cap = capDe_(o.CODIGO); if (!cap) { out.avisos.push('DICTADOS fila ' + (k + 6) + ': no existe ' + o.CODIGO); return; }
      if (!isoDe_(o.FECHA)) { out.avisos.push('DICTADOS fila ' + (k + 6) + ': la fecha va como dd/mm/aaaa'); return; }
      const orig = Object.assign({}, o), n = completarDictado_(D, o, cap), c = {};
      D.H.forEach(h => { if (h && String(n[h]) !== String(orig[h])) c[h] = n[h]; });
      setCampos_(D, k, c); D.filas[k][D.i('ID_DICTADO')] = n.ID_DICTADO; out.dic++;
    });
    return out;
  });
}
function menuDictados() {
  const l = dictadosLista_({ dias: 30 }).lista;
  const filas = l.map(x => '<tr><td>' + x.fecha + ' ' + (x.hora || '') + '</td><td>' + x.codigo + ' · ' + x.nombre + '</td><td>' + x.ahora + '</td><td><a target="_blank" href="' + x.link + '">registro</a>' + (x.linkInscripcion ? ' · <a target="_blank" href="' + x.linkInscripcion + '">inscripción</a>' : '') + ' · <a target="_blank" href="' + x.qr + '">QR</a></td><td>' + x.inscriptos + ' / ' + x.asistentes + '</td></tr>').join('');
  const html = '<div style="font-family:Arial,sans-serif;font-size:13px"><p>Dictados de los últimos 30 días y próximos. Inscriptos / asistentes.</p><table style="border-collapse:collapse" cellpadding="4">' + (filas || '<tr><td>No hay dictados.</td></tr>') + '</table></div>';
  SpreadsheetApp.getUi().showModalDialog(HtmlService.createHtmlOutput(html).setWidth(760).setHeight(480), 'Dictados · links');
}

// =====================================================================
// FASE 6 · CERTIFICADOS
// El código de verificación se asigna al registrar (asistencia o aprobación); el PDF se arma la primera vez que
// alguien lo descarga, con la plantilla PLANTILLA_CERTIFICADO_HYS_2026 (Presentaciones) y los íconos de ICONOS_CERTIFICADO,
// y queda en Drive › CAPACITACIONES › CERTIFICADOS › año › capacitación. Nunca se borra: se anula con motivo.
// =====================================================================
const PLANTILLA_NOMBRE = 'PLANTILLA_CERTIFICADO_HYS_2026';
const CARPETA_ICONOS = 'ICONOS_CERTIFICADO';
const CARPETA_CERT = 'CERTIFICADOS_HYS';          // los nuevos (CHYS); «CERTIFICADOS» sigue siendo del sistema actual
const CERT_WEB = 'https://hyslhmh-sudo.github.io/capacitaciones/certificados.html';   // «Mis certificados» y verificación, sin el aviso de Google (abre esta aplicación adentro)
const PREFIJO_CERT = 'CHYS';                       // CHYS-2026-00001: distinto de CERT-/CONST- del sistema actual, que sigue emitiendo hasta el cambio
const COLUMNAS_F6 = {
  CERTIFICADOS: ['NOMBRE', 'CORREO', 'ID_REGISTRO', 'ID_DICTADO', 'ENCUENTRO_N', 'NOTA', 'VENCE', 'EMITIDO', 'ARCHIVO_ID', 'MOTIVO_ANULACION', 'DETALLE'],
  DICTADOS: ['DISERTANTES_DATOS', 'PROGRAMA_CERRADO']
};
const TIPO_CERT = { apr: 'Aprobación', asi: 'Asistencia', prog: 'Aprobación de programa', part: 'Participación', dis: 'Disertante' };
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const NORMA_PERSONAL = ['La capacitación en prevención de riesgos laborales es un derecho de las personas que trabajan y una obligación del establecimiento', ' (Ley N.º 19.587 de Higiene y Seguridad en el Trabajo, art. 9, inc. k; Decreto N.º 351/79, art. 208; Res. SRT N.º 905/2015).'];
const NORMA_ESTUDIANTES = ['La capacitación en riesgos hospitalarios protege a los estudiantes en formación, a los equipos de trabajo y a los pacientes', ' (Ley N.º 19.587 de Higiene y Seguridad en el Trabajo, arts. 2 y 4; Res. SRT N.º 905/2015).'];

function prepararF6_() {
  const p = PropertiesService.getScriptProperties();
  if (p.getProperty('columnasF6') === '1') return [];
  const out = asegurarColumnasDe_(COLUMNAS_F6); p.setProperty('columnasF6', '1'); return out;
}
function asegurarColumnasDe_(mapa) {
  const lib = SpreadsheetApp.getActive(), out = [];
  Object.keys(mapa).forEach(n => {
    const sh = hojaDe_(lib, n), H = sh.getRange(5, 1, 1, Math.max(sh.getLastColumn(), 1)).getDisplayValues()[0].map(x => String(x).trim());
    let ult = H.length; while (ult > 0 && !H[ult - 1]) ult--;
    const faltan = mapa[n].filter(c => H.indexOf(c) < 0); if (!faltan.length) return;
    if (sh.getMaxColumns() < ult + faltan.length) sh.insertColumnsAfter(sh.getMaxColumns(), ult + faltan.length - sh.getMaxColumns());
    sh.getRange(5, ult + 1, 1, faltan.length).setValues([faltan]);
    if (ult > 0) sh.getRange(5, ult).copyFormatToRange(sh, ult + 1, ult + faltan.length, 5, 5);
    out.push(n + ': ' + faltan.join(', '));
  });
  return out;
}

// ------------------------------------------------------------------ Datos auxiliares
function nuevoCodigoCert_(C) {
  const anio = Utilities.formatDate(new Date(), ZONA, 'yyyy'), base = PREFIJO_CERT + '-' + anio + '-';
  const max = C.filas.reduce((m, r) => { const c = String(r[C.i('ID_CERTIFICADO')]); return c.indexOf(base) === 0 ? Math.max(m, Number(c.slice(base.length)) || 0) : m; }, 0);
  return base + ('0000' + (max + 1)).slice(-5);
}
function capitalizar_(s) { return String(s || '').toLowerCase().replace(/(^|[\s'-])(\S)/g, (m, a, b) => a + b.toUpperCase()).replace(/\s+/g, ' ').trim(); }
function dniTxt_(dni, pais) { const d = String(dni || ''); return (!pais || pais === 'Argentina') && /^\d{7,8}$/.test(d) ? 'DNI ' + d.replace(/\B(?=(\d{3})+(?!\d))/g, '.') : 'Documento ' + (pais && pais !== 'Argentina' ? '(' + pais + ') ' : '') + d; }
function fechaLarga_(f) { const i = isoDe_(f) || iso_(new Date()); return Number(i.slice(8, 10)) + ' de ' + MESES[Number(i.slice(5, 7)) - 1] + ' de ' + i.slice(0, 4); }
function horasTxt_(h) { const n = num_(h); return n ? String(n).replace('.', ',') + (n === 1 ? ' hora' : ' horas') : ''; }
// Datos de una persona: PERSONAS del libro, si no la base de trabajadores, si no el libro 2026 actual
function personaPara_(dni) {
  const P = tabla_('PERSONAS'), r = P.filas.find(x => x[P.i('DNI')] === String(dni));
  if (r) return obj_(P, r);
  const b = /^\d+$/.test(String(dni)) ? enBase_(String(dni)) : null;
  if (b) return { DNI: dni, APELLIDOS: b.APELLIDOS, NOMBRES: b.NOMBRES, PUBLICO: RED_TRELEW.indexOf(b.ESTABLECIMIENTO) >= 0 ? 'Red Trelew' : 'Red Chubut', ESTABLECIMIENTO: b.ESTABLECIMIENTO, SERVICIO: b.SERVICIO, CORREO: b.EMAIL };
  try {
    const v = hojaDe_(SpreadsheetApp.openById(ID.personas), 'PERSONAS').getDataRange().getDisplayValues(), H = v[0], h = n => H.indexOf(n);
    const x = v.find(f => soloDni_(f[h('DNI')]) === String(dni));
    if (x) return { DNI: dni, APELLIDOS: x[h('APELLIDOS')], NOMBRES: x[h('NOMBRES')], PUBLICO: /externo/i.test(x[h('PUBLICO')]) ? (x[h('CARRERA')] ? 'Estudiantes' : 'Profesionales externos') : 'Red Trelew', CARRERA: x[h('CARRERA')], INSTITUCION: x[h('LUGAR_PRACTICA')] || x[h('ESTABLECIMIENTO')], SERVICIO: x[h('SERVICIO')], ESTABLECIMIENTO: x[h('ESTABLECIMIENTO')], CORREO: x[h('EMAIL')] };
  } catch (e) { /* sin acceso al libro anterior */ }
  return null;
}
function nombrePersona_(p) { return p ? capitalizar_((p.NOMBRES || '') + ' ' + (p.APELLIDOS || '')) : 's/d'; }
function lugarPersona_(p) {
  if (!p) return '';
  if (/estud/i.test(p.PUBLICO)) return 'Estudiante' + (vacio_(p.CARRERA) ? '' : ' de ' + p.CARRERA) + (vacio_(p.INSTITUCION) ? '' : ' · ' + p.INSTITUCION);
  if (/red/i.test(p.PUBLICO)) return [p.SERVICIO, vacio_(p.ESTABLECIMIENTO) ? '' : nombreEst_(p.ESTABLECIMIENTO)].filter(x => !vacio_(x)).join(' · ');
  return [p.PROFESION, p.INSTITUCION].filter(x => !vacio_(x)).join(' · ');
}

// ------------------------------------------------------------------ Alta del certificado (sin PDF todavía)
// tipo: clave de TIPO_CERT. reg: objeto con DNI, CODIGO, VERSION, ID_REGISTRO, ID_DICTADO, ENCUENTRO_N, NOTA, FECHA, VENCE, HORAS
function crearCertificado_(tipo, reg, extra) {
  prepararF6_();
  const C = tabla_('CERTIFICADOS');
  if (reg.ID_REGISTRO && C.filas.some(r => r[C.i('ID_REGISTRO')] === reg.ID_REGISTRO && !/anulad/i.test(r[C.i('ESTADO')]))) return C.filas.find(r => r[C.i('ID_REGISTRO')] === reg.ID_REGISTRO)[C.i('ID_CERTIFICADO')];
  const cap = capDe_(reg.CODIGO) || {}, p = extra && extra.persona !== undefined ? extra.persona : personaPara_(reg.DNI);
  const cod = nuevoCodigoCert_(C);
  let firm = cap.FIRMANTES;
  if (reg.ID_DICTADO && reg.ID_DICTADO !== 'PERMANENTE') { const D = tabla_('DICTADOS'), d = D.filas.find(x => x[D.i('ID_DICTADO')] === reg.ID_DICTADO); if (d && !vacio_(d[D.i('FIRMANTES')])) firm = d[D.i('FIRMANTES')]; }
  const horas = reg.HORAS !== undefined ? reg.HORAS : (num_(reg.ENCUENTRO_N) && num_(cap.ENCUENTROS) > 1 ? horasEncuentro_(cap) : cap.CARGA_HORARIA);
  agregar_(C, [{ ID_CERTIFICADO: cod, DNI: reg.DNI, CODIGO: reg.CODIGO, VERSION: reg.VERSION || cap.VERSION || '1', TIPO: TIPO_CERT[tipo], FECHA: dma_(isoDe_(reg.FECHA) || iso_(new Date())), HORAS: sd_(String(horas === undefined || horas === null ? '' : horas).replace('.', ',')),
    FIRMANTES: firmantesOrden_(String(firm || '').split(/[,;]\s*/)).join(', '), LINK_PDF: '', ESTADO: 'Válido', NOMBRE: (extra && extra.nombre) || nombrePersona_(p), CORREO: (extra && extra.correo) || (p && correoOk_(p.CORREO) ? p.CORREO : ''),
    ID_REGISTRO: reg.ID_REGISTRO || '', ID_DICTADO: reg.ID_DICTADO || '', ENCUENTRO_N: reg.ENCUENTRO_N || '', NOTA: reg.NOTA === undefined ? '' : reg.NOTA, VENCE: !vacio_(reg.VENCE) ? reg.VENCE : (/no vence/i.test(cap.VENCE) || tipo === 'dis' ? 'No vence' : dma_(masDoce_(isoDe_(reg.FECHA) || iso_(new Date())))),
    EMITIDO: ahoraTxt_(), ARCHIVO_ID: '', MOTIVO_ANULACION: '', DETALLE: (extra && extra.detalle) || '' }]);
  if (reg.ID_REGISTRO) { const R = tabla_('REGISTROS'), k = R.filas.findIndex(r => r[R.i('ID_REGISTRO')] === reg.ID_REGISTRO); if (k >= 0) setCampos_(R, k, { ID_CERTIFICADO: cod }); }
  return cod;
}
function horasEncuentro_(cap) { const h = num_(cap.HORAS_POR_ENCUENTRO); if (h) return h; const t = num_(cap.CARGA_HORARIA), n = num_(cap.ENCUENTROS) || 1; return t ? Math.round(10 * t / n) / 10 : ''; }

// Qué corresponde a cada registro: programa → constancia por encuentro; un encuentro con evaluación → solo la aprobación;
// sin evaluación → constancia de asistencia. La aprobación de un programa sale al cerrar (o al aprobar la final con la asistencia mínima).
function tipoCertDe_(cap, reg) {
  const programa = num_(cap.ENCUENTROS) > 1;
  // Autoadministrada con video (19/10/2026): aprobación si tiene evaluación y es de un encuentro; asistencia si no tiene evaluación o es un programa
  if (reg.ID_DICTADO === VIDEO_DIC) return reg.TIPO === 'Evaluación' ? (siNo_(reg.APROBADO) ? (programa ? 'asi' : 'apr') : '') : 'asi';
  if (reg.TIPO === 'Evaluación') return siNo_(reg.APROBADO) && !programa ? 'apr' : '';
  if (programa) return 'asi';
  return /evaluaci/i.test(cap.REGISTRO) ? '' : 'asi';
}
// Se llama al guardar un registro nuevo (registro público, evaluación o agregado por HyS). Devuelve el código o ''.
function certAlRegistrar_(reg) {
  try {
    if ((isoDe_(reg.FECHA) || iso_(new Date())) < AVISOS_DESDE) return '';
    const cap = capDe_(reg.CODIGO); if (!cap) return '';
    const tipo = tipoCertDe_(cap, reg);
    if (tipo) return crearCertificado_(tipo, reg);
    if (reg.TIPO === 'Evaluación' && siNo_(reg.APROBADO) && num_(cap.ENCUENTROS) > 1 && reg.ID_DICTADO && reg.ID_DICTADO !== 'PERMANENTE') {
      const c = cohortePrograma_(reg.ID_DICTADO), yo = c.lista.find(x => x.dni === reg.DNI);
      if (yo && yo.resultado === 'prog' && !yo.yaEmitido) {
        const persona = personaPara_(reg.DNI);
        return crearCertificado_('prog', { DNI: reg.DNI, CODIGO: reg.CODIGO, ID_DICTADO: reg.ID_DICTADO, FECHA: dma_(c.hasta), NOTA: yo.nota, HORAS: cap.CARGA_HORARIA },
          { persona: persona, nombre: nombrePersona_(persona), detalle: JSON.stringify({ asistidos: yo.asistidos, total: c.total, desde: c.inicio, hasta: c.hasta }) });
      }
    }
  } catch (e) { aviso_('Certificado no emitido', 'REGISTROS', reg.ID_REGISTRO || reg.DNI, String(e.message || e)); }
  return '';
}

// ------------------------------------------------------------------ Programas: cohorte, asistencia y cierre
// La cohorte va desde el último encuentro 1 del programa (o HABILITADA_DESDE) hasta el dictado que cierra.
// Suma la asistencia registrada en el libro nuevo y la del sistema actual (programas que empezaron con él).
function cohortePrograma_(idDic, desdeManual) {
  const D = tabla_('DICTADOS'), dr = D.filas.find(x => x[D.i('ID_DICTADO')] === idDic); if (!dr) throw new Error('No existe el dictado.');
  const d = obj_(D, dr), cap = capDe_(d.CODIGO); if (!cap || num_(cap.ENCUENTROS) < 2) throw new Error('Este dictado no es de un programa de varios encuentros.');
  const fin = isoDe_(d.FECHA);
  const unos = D.filas.map(r => obj_(D, r)).filter(o => o.CODIGO === d.CODIGO && num_(o.ENCUENTRO_N) === 1 && isoDe_(o.FECHA) && isoDe_(o.FECHA) <= fin).map(o => isoDe_(o.FECHA)).sort();
  const desde = isoDe_(desdeManual) || (unos.length ? unos.pop() : (isoDe_(cap.HABILITADA_DESDE) || iso2_(new Date(new Date(fin).getTime() - 150 * 864e5))));
  const hasta = iso2_(new Date(new Date(fin).getTime() + 3 * 864e5));
  let primera = '';
  const visto = f => { if (!primera || f < primera) primera = f; };
  const gente = {}, alta = dni => gente[dni] = gente[dni] || { dni: dni, enc: {}, nota: null, nombre: '', idsReg: [] };
  const R = tabla_('REGISTROS');
  R.filas.map(r => obj_(R, r)).filter(o => o.CODIGO === d.CODIGO && !/anulad/i.test(o.ESTADO)).forEach(o => {
    const f = isoDe_(o.FECHA); if (!f || f < desde || f > hasta) return;
    const g = alta(o.DNI);
    if (o.TIPO === 'Evaluación') { if (siNo_(o.APROBADO)) g.nota = Math.max(g.nota || 0, num_(o.NOTA)); }
    else if (num_(o.ENCUENTRO_N)) { g.enc[num_(o.ENCUENTRO_N)] = 1; visto(f); }
  });
  try {   // sistema actual (libro BASE_PERSONAS_CAPACITACIONES_2026)
    const v = hojaDe_(SpreadsheetApp.openById(ID.personas), 'REGISTROS').getDataRange().getDisplayValues(), H = v[0], h = n => H.indexOf(n);
    v.slice(1).forEach(r => {
      if (r[h('ID_CAPACITACION')] !== d.CODIGO) return; const f = isoDe_(r[h('FECHA_HORA')]); if (!f || f < desde || f > hasta) return;
      const g = alta(soloDni_(r[h('DNI')])); if (!g.nombre) g.nombre = capitalizar_(r[h('NOMBRES')] + ' ' + r[h('APELLIDOS')]);
      if (/evaluaci/i.test(r[h('TIPO')])) { if (siNo_(r[h('APROBO')])) g.nota = Math.max(g.nota || 0, num_(r[h('PORCENTAJE')])); }
      else if (num_(r[h('ENCUENTRO')])) { g.enc[num_(r[h('ENCUENTRO')])] = 1; visto(f); }
    });
  } catch (e) { /* sin acceso al sistema actual: solo el libro nuevo */ }
  const total = num_(cap.ENCUENTROS), min = num_(cap.ASISTENCIA_MINIMA) || Math.ceil(total * 0.75);
  const C = tabla_('CERTIFICADOS'), ya = {};
  C.filas.map(r => obj_(C, r)).filter(o => o.CODIGO === d.CODIGO && o.ID_DICTADO === idDic && /programa|participaci/i.test(o.TIPO) && !/anulad/i.test(o.ESTADO)).forEach(o => ya[o.DNI] = o.ID_CERTIFICADO);
  const lista = Object.keys(gente).filter(Boolean).map(k => { const g = gente[k], n = Object.keys(g.enc).length; return { dni: k, nombre: g.nombre, asistidos: n, nota: g.nota, resultado: n >= min && g.nota !== null ? 'prog' : n > 0 ? 'part' : 'nada', yaEmitido: ya[k] || '' }; });
  return { dictado: d, cap: cap, desde: desde, inicio: primera || desde, hasta: fin, total: total, minimo: min, minimoEstimado: !num_(cap.ASISTENCIA_MINIMA), lista: lista };
}
function programaVista_(idDic, desde) {
  const c = cohortePrograma_(idDic, desde);
  c.lista.forEach(x => { if (!x.nombre) { const p = personaPara_(x.dni); x.nombre = nombrePersona_(p); } });
  return { ok: true, desdeIso: c.desde, desde: dma_(c.desde), hasta: dma_(c.hasta), total: c.total, minimo: c.minimo, minimoEstimado: c.minimoEstimado,
    aprobacion: c.lista.filter(x => x.resultado === 'prog' && !x.yaEmitido).length, participacion: c.lista.filter(x => x.resultado === 'part' && !x.yaEmitido).length,
    yaEmitidos: c.lista.filter(x => x.yaEmitido).length, lista: c.lista.sort((a, b) => a.nombre.localeCompare(b.nombre)) };
}
function programaCerrar_(idDic, desde) {
  return conLock_(() => {
    const c = cohortePrograma_(idDic, desde), hs = horasEncuentro_(c.cap); let a = 0, p = 0;
    c.lista.forEach(x => {
      if (x.yaEmitido || x.resultado === 'nada') return;
      const persona = personaPara_(x.dni), extra = { persona: persona, nombre: persona ? nombrePersona_(persona) : x.nombre, detalle: JSON.stringify({ asistidos: x.asistidos, total: c.total, desde: c.inicio, hasta: c.hasta }) };
      const reg = { DNI: x.dni, CODIGO: c.cap.CODIGO, ID_DICTADO: idDic, FECHA: dma_(c.hasta), NOTA: x.resultado === 'prog' ? x.nota : '', HORAS: x.resultado === 'prog' ? c.cap.CARGA_HORARIA : (hs ? Math.round(10 * hs * x.asistidos) / 10 : c.cap.CARGA_HORARIA) };
      crearCertificado_(x.resultado, reg, extra); if (x.resultado === 'prog') a++; else p++;
    });
    const D = tabla_('DICTADOS'), k = D.filas.findIndex(r => r[D.i('ID_DICTADO')] === idDic); if (k >= 0) setCampos_(D, k, { PROGRAMA_CERRADO: ahoraTxt_() });
    historial_('HyS (portal)', 'CERTIFICADOS', idDic, 'Cierre de programa', '', a + ' aprobación · ' + p + ' participación', 'Cerrar programa');
    return { ok: true, aprobacion: a, participacion: p };
  });
}

// ------------------------------------------------------------------ Disertantes
function disertantesDe_(D, k) {
  const o = obj_(D, D.filas[k]); let l = [];
  try { l = JSON.parse(o.DISERTANTES_DATOS || '[]'); } catch (e) { l = []; }
  if (!l.length && !vacio_(o.DISERTANTES) && o.DISERTANTES !== 'Belén Pellegrini') l = String(o.DISERTANTES).split(/\s·\s(?![^(]*\))/).map(t => { const m = t.match(/^(.*?)\s*(?:\((.*)\))?$/); return { nombre: m[1], detalle: m[2] || '', dni: '', correo: '' }; });
  return l;
}
function disertanteGuardar_(d) {
  return conLock_(() => {
    prepararF6_();
    const D = tabla_('DICTADOS'), k = D.filas.findIndex(r => r[D.i('ID_DICTADO')] === d.id); if (k < 0) return { ok: false, error: 'No existe el dictado.' };
    const l = disertantesDe_(D, k), j = num_(d.idx);
    if (d.nuevo) { if (l.length >= MAX_DISERTANTES) return { ok: false, error: 'Hasta ' + MAX_DISERTANTES + ' disertantes.' }; l.push({ nombre: '', detalle: '', dni: '', correo: '' }); }
    const x = d.nuevo ? l[l.length - 1] : l[j]; if (!x) return { ok: false, error: 'No existe ese disertante.' };
    ['nombre', 'detalle', 'correo', 'trato'].forEach(c => { if (d[c] !== undefined) x[c] = String(d[c]).trim(); });
    if (d.dni !== undefined) x.dni = soloDni_(d.dni) || String(d.dni).trim();
    if (!x.nombre) return { ok: false, error: 'Falta el nombre.' };
    setCampos_(D, k, { DISERTANTES_DATOS: JSON.stringify(l), DISERTANTES: l.map(y => y.nombre + (y.detalle ? ' (' + y.detalle + ')' : '')).join(' · ') });
    return { ok: true, lista: l };
  });
}
function disertanteEmitir_(d) {
  return conLock_(() => {
    prepararF6_();
    const D = tabla_('DICTADOS'), k = D.filas.findIndex(r => r[D.i('ID_DICTADO')] === d.id); if (k < 0) return { ok: false, error: 'No existe el dictado.' };
    const o = obj_(D, D.filas[k]), l = disertantesDe_(D, k), x = l[num_(d.idx)]; if (!x) return { ok: false, error: 'No existe ese disertante.' };
    if (!x.dni) return { ok: false, error: 'Falta el DNI de ' + x.nombre + ': va en la constancia.' };
    const C = tabla_('CERTIFICADOS'), ya = C.filas.find(r => r[C.i('ID_DICTADO')] === d.id && r[C.i('DNI')] === x.dni && r[C.i('TIPO')] === TIPO_CERT.dis && !/anulad/i.test(r[C.i('ESTADO')]));
    if (ya) return { ok: true, codigo: ya[C.i('ID_CERTIFICADO')], ya: true };
    const otros = ['Belén Pellegrini'].concat(l.filter(y => y !== x).map(y => y.nombre));
    const cod = crearCertificado_('dis', { DNI: x.dni, CODIGO: o.CODIGO, ID_DICTADO: d.id, FECHA: o.FECHA, VENCE: 'No vence' }, { persona: null, nombre: x.nombre, correo: x.correo, detalle: JSON.stringify({ detalle: x.detalle, trato: x.trato || '', junto: otros }) });
    return { ok: true, codigo: cod };
  });
}

// ------------------------------------------------------------------ Armado del PDF
function recursos_() {
  if (MEMO_ON && MEMO_.recursos) return MEMO_.recursos;
  const r = recursosLeer_(); if (MEMO_ON) MEMO_.recursos = r; return r;
}
function recursosLeer_() {
  const lib = DriveApp.getFileById(SpreadsheetApp.getActive().getId()), pad = lib.getParents(), base = pad.hasNext() ? pad.next() : DriveApp.getRootFolder();
  const fs = base.getFilesByType(MimeType.GOOGLE_SLIDES); let plantilla = null;   // «PLANTILLA_CERTIFICADO_HYS_2026» (acepta «… .pptx» si quedó así al convertirla)
  while (fs.hasNext()) { const f = fs.next(); if (f.getName().indexOf(PLANTILLA_NOMBRE) === 0 && !f.isTrashed()) { plantilla = f; break; } }
  if (!plantilla) throw new Error('Falta la plantilla «' + PLANTILLA_NOMBRE + '» (Presentaciones de Google) en la carpeta del libro.');
  const it = base.getFoldersByName(CARPETA_ICONOS); if (!it.hasNext()) throw new Error('Falta la carpeta «' + CARPETA_ICONOS + '» en la carpeta del libro.');
  const ic = base.getFoldersByName(CARPETA_CERT), certs = ic.hasNext() ? ic.next() : base.createFolder(CARPETA_CERT);
  return { plantilla: plantilla, iconos: it.next(), certs: certs };
}
// Modelo propio de una capacitación (23/10/2026): CATALOGO › PLANTILLA_CERT con el link o el ID de una Presentación de Google.
// Vacío o s/d → la plantilla general. Ej.: CAP-HYS-020 (laboratorio) usa el modelo con la Secretaría de Salud y la Abg. Laura Pizzi.
function refPlantilla_(cap, c) {   // 23/10: PLANTILLA_CERT (dictado) y PLANTILLA_CERT_VIDEO (autoadministrada, si está)
  const ok = v => { v = String(v || '').trim(); return v && !/^s\/d/i.test(v) ? v : ''; };
  const vid = ok(cap && cap.PLANTILLA_CERT_VIDEO);
  return (c && c.ID_DICTADO === VIDEO_DIC && vid) ? vid : ok(cap && cap.PLANTILLA_CERT);
}
function plantillaDe_(cap, R, c) {
  const v = refPlantilla_(cap, c);
  if (!v) return R.plantilla;
  const id = idDeLink_(v) || v;
  try { const f = DriveApp.getFileById(id); if (!f.isTrashed()) return f; } catch (e) { /* abajo */ }
  throw new Error('No se puede abrir el modelo de certificado de ' + cap.CODIGO + ' (CATALOGO › PLANTILLA_CERT).');
}
function modeloPropio_(cap) { return !!refPlantilla_(cap, null) || !!refPlantilla_(cap, { ID_DICTADO: VIDEO_DIC }); }
// Texto del modelo propio (laboratorio): empieza en minúscula porque sigue al nombre («Certificado de Nombre Apellido»)
function textoModeloPropio_(c, cap, dic, h) {
  const nom = '«' + String(cap.NOMBRE).trim() + '»', bold = [nom];
  if (h) bold.push(h);
  if (c.ID_DICTADO === VIDEO_DIC)
    return { texto: 'ha completado con éxito la capacitación ' + nom + ', en modalidad autoadministrada, aprobada el ' + fechaLarga_(c.FECHA) + (h ? ', con una duración de ' + h : '') + '.', negritas: bold.concat(['modalidad autoadministrada']) };
  const mod = dic ? String(dic.MODALIDAD || '') : '', modal = /presencial/i.test(mod) && !/h[ií]brid/i.test(mod) ? 'presencial' : 'virtual sincrónica';
  const lugar = dic ? String(dic.LUGAR || '') + ' ' + String(dic.ESTABLECIMIENTO || '') : '';
  const sede = /HZT|Zonal/i.test(lugar) ? 'en el Hospital Zonal Trelew «Dr. Adolfo Margara», Trelew, Provincia del Chubut' : /HMH|Humphreys/i.test(lugar) ? 'en el Hospital María Humphreys, Trelew, Provincia del Chubut' : 'Trelew, Provincia del Chubut';
  const verbo = c.TIPO === TIPO_CERT.asi ? 'ha asistido a la capacitación ' : 'ha completado con éxito la capacitación ';
  return { texto: verbo + nom + ', impartida el ' + fechaLarga_(dic ? dic.FECHA : c.FECHA) + ', en modalidad ' + modal + (h ? ', con una duración de ' + h : '') + ', ' + sede + '.', negritas: bold };
}
function subcarpeta_(padre, nombre) { const it = padre.getFoldersByName(nombre); return it.hasNext() ? it.next() : padre.createFolder(nombre); }
function iconoBlob_(R, nombre) {
  for (const n of [nombre, 'health_and_safety']) { const it = R.iconos.getFilesByName((n || '') + '.png'); if (it.hasNext()) return it.next().getBlob(); }
  return null;
}
function qrBlob_(texto) {
  for (const u of [QR_API.replace('600x600', '500x500') + encodeURIComponent(texto), 'https://quickchart.io/qr?size=500&margin=1&text=' + encodeURIComponent(texto)]) {
    try { const r = UrlFetchApp.fetch(u, { muteHttpExceptions: true }); if (r.getResponseCode() === 200) return r.getBlob().setName('qr.png'); } catch (e) { /* probar el siguiente */ }
  }
  return null;
}
function idDeLink_(u) { const m = String(u || '').match(/[-\w]{25,}/); return m ? m[0] : ''; }
// Todo lo que va en un certificado, en texto
function datosCert_(c) {
  const cap = capDe_(c.CODIGO) || { NOMBRE: c.CODIGO }, p = c.TIPO === TIPO_CERT.dis ? null : personaPara_(c.DNI);
  let dic = null; if (c.ID_DICTADO && c.ID_DICTADO !== 'PERMANENTE' && c.ID_DICTADO !== 's/d') { const D = tabla_('DICTADOS'), r = D.filas.find(x => x[D.i('ID_DICTADO')] === c.ID_DICTADO); if (r) dic = obj_(D, r); }
  let det = {}; try { det = JSON.parse(c.DETALLE || '{}'); } catch (e) { det = {}; }
  const nom = '«' + String(cap.NOMBRE).trim() + '»', h = horasTxt_(c.HORAS), inst = dic && !vacio_(dic.INSTITUCION) ? dic.INSTITUCION : '';
  const junto = inst ? ', organizada junto con ' + (/^(el|la|los|las)\s/i.test(inst) ? '' : (/^(universidad|escuela|facultad|tecnicatura)/i.test(inst) ? 'la ' : 'el ')) + inst + ' para sus estudiantes' : '';
  const video = c.ID_DICTADO === VIDEO_DIC;
  const mod = dic ? dic.MODALIDAD : det.modalidad, modal = video ? ', realizada en modalidad autoadministrada' : !vacio_(mod) ? ', dictada en modalidad ' + String(mod).toLowerCase() : c.ID_DICTADO === 'PERMANENTE' ? ', realizada en línea' : '';
  const bold = [nom]; let titulo, texto;
  const enc = num_(c.ENCUENTRO_N), tot = num_(cap.ENCUENTROS);
  if (video) bold.push('modalidad autoadministrada');
  if (video && c.TIPO === TIPO_CERT.asi) {
    titulo = 'Certificado de asistencia';
    texto = 'Completó en modalidad autoadministrada la capacitación ' + nom + (h ? ', con una carga horaria de ' + h : '') + '.';
    if (h) bold.push(h);
  } else if (c.TIPO === TIPO_CERT.apr) {
    titulo = 'Certificado de aprobación';
    texto = 'Aprobó la capacitación ' + nom + junto + modal + (h ? ', con una carga horaria de ' + h : '') + (c.NOTA !== '' ? (h ? ' y una calificación de ' : ', con una calificación de ') + num_(c.NOTA) + ' %' : '') + '.';
    if (h) bold.push(h); if (c.NOTA !== '') bold.push(num_(c.NOTA) + ' %');
  } else if (c.TIPO === TIPO_CERT.asi && enc && tot > 1) {
    titulo = 'Constancia de asistencia';
    texto = 'Asistió al encuentro ' + enc + ' de ' + tot + ' del programa ' + nom + junto + (h ? ', con una carga horaria de ' + h : '') + '.';
    bold.push('encuentro ' + enc + ' de ' + tot); if (h) bold.push(h);
  } else if (c.TIPO === TIPO_CERT.asi) {
    titulo = 'Constancia de asistencia';
    texto = 'Asistió a la capacitación ' + nom + junto + modal + (h ? ', con una carga horaria de ' + h : '') + '.';
    if (h) bold.push(h);
  } else if (c.TIPO === TIPO_CERT.prog || c.TIPO === TIPO_CERT.part) {
    const a = det.asistidos || '', periodo = det.desde ? ', desarrollado entre el ' + fechaLarga_(dma_(det.desde)).replace(/ de \d{4}$/, '') + ' y el ' + fechaLarga_(dma_(det.hasta)) : '';
    if (c.TIPO === TIPO_CERT.prog) { titulo = 'Certificado de aprobación'; const fin = c.NOTA !== '' ? 'evaluación final de ' + num_(c.NOTA) + ' %' : 'evaluación final aprobada'; texto = 'Aprobó el programa ' + nom + junto + periodo + ', con asistencia a ' + a + ' de ' + tot + ' encuentros, ' + fin + (h ? ' y ' + h + ' en total' : '') + '.'; bold.push(c.NOTA !== '' ? num_(c.NOTA) + ' %' : 'evaluación final aprobada'); }
    else { titulo = 'Constancia de participación'; texto = 'Participó del programa ' + nom + junto + periodo + ', con asistencia a ' + a + ' de ' + tot + ' encuentros' + (h ? ' y ' + h + ' en total' : '') + '.'; }
    bold.push(a + ' de ' + tot + ' encuentros'); if (h) bold.push(h);
  } else {
    titulo = 'Constancia de disertante';
    const otros = (det.junto || ['Belén Pellegrini']), rol = 'disertante ' + (det.trato === 'o' ? 'invitado' : det.trato === 'a' ? 'invitada' : 'invitada/o');
    texto = 'Participó como ' + rol + ' en la capacitación ' + nom + ', junto con ' + (otros.length > 1 ? otros.slice(0, -1).join(', ') + ' y ' + otros.slice(-1) : otros[0]) + (h ? ', con una carga horaria de ' + h : '') + '.';
    bold.push(rol); if (h) bold.push(h);
  }
  if (inst) bold.push(inst);
  if (modeloPropio_(cap) && c.TIPO !== TIPO_CERT.dis) { const m = textoModeloPropio_(c, cap, dic, h); texto = m.texto; bold.length = 0; m.negritas.forEach(b => bold.push(b)); }
  const est = (p && /estud/i.test(p.PUBLICO)) || !!inst, norma = est ? NORMA_ESTUDIANTES : NORMA_PERSONAL;
  const aval = !vacio_(cap.AVAL_ORGANISMO) ? 'Con el aval de ' + cap.AVAL_ORGANISMO + (vacio_(cap.AVAL_NUMERO) ? '' : ' (' + cap.AVAL_NUMERO + ')') : '';
  const pais = p ? p.PAIS_DOCUMENTO : 'Argentina';
  return { titulo: titulo, nombre: c.NOMBRE && c.NOMBRE !== 's/d' ? c.NOMBRE : nombrePersona_(p), dni: modeloPropio_(cap) ? dniTxt_(c.DNI, pais).replace(/^DNI\s+/, '') : dniTxt_(c.DNI, pais), lugar: c.TIPO === TIPO_CERT.dis ? (det.detalle || '') : lugarPersona_(p),
    texto: texto, negritas: bold, aval: aval, fecha: 'Trelew, ' + fechaLarga_(c.FECHA), mes: (f => MESES[Number(f.slice(5, 7)) - 1].replace(/^./, l => l.toUpperCase()) + ' ' + f.slice(0, 4))(isoDe_(c.FECHA) || iso_(new Date())), norma: norma, codigo: c.ID_CERTIFICADO,
    vig: /no vence/i.test(c.VENCE) ? 'Sin vencimiento' : 'Vigente hasta el ' + c.VENCE, icono: vacio_(cap.ICONO) ? 'health_and_safety' : cap.ICONO,
    firmantes: firmantesOrden_(String(c.FIRMANTES || FIRMA_HYS).split(/[,;]\s*/)), verificar: CERT_WEB + '?v=' + c.ID_CERTIFICADO };
}
// Completa una diapositiva (copia de la plantilla) con los datos
function llenarDiapositiva_(s, x, R) {
  const PT = 2.83465, porToken = t => s.getShapes().find(sh => { try { return sh.getText().asString().trim() === t; } catch (e) { return false; } });
  const rep = { '{{MES}}': x.mes || ' ', '{{TITULO}}': x.titulo, '{{NOMBRE}}': x.nombre, '{{DNI}}': x.dni, '{{LUGAR}}': x.lugar || ' ', '{{TEXTO}}': x.texto, '{{AVAL}}': x.aval || ' ', '{{FECHA}}': x.fecha, '{{NORMA}}': x.norma[0] + x.norma[1], '{{COD}}': x.codigo, '{{VIG}}': x.vig };
  const sh = {}; Object.keys(rep).forEach(k => { sh[k] = porToken(k) || s.getShapes().find(z => { try { return z.getText().asString().indexOf(k) >= 0; } catch (e) { return false; } }); });
  Object.keys(rep).forEach(k => s.replaceAllText(k, rep[k]));
  const negrita = (shape, t) => { if (!shape || !t) return; shape.getText().find(t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).forEach(r => r.getTextStyle().setBold(true)); };
  x.negritas.forEach(t => negrita(sh['{{TEXTO}}'], t)); negrita(sh['{{NORMA}}'], x.norma[0]);
  const imagen = (token, blob) => { const b = porToken(token); if (!b) return; if (blob) { const L = b.getLeft(), T = b.getTop(), W = b.getWidth(), H = b.getHeight(); const im = s.insertImage(blob); const k = Math.min(W / im.getWidth(), H / im.getHeight()); im.setWidth(im.getWidth() * k).setHeight(im.getHeight() * k); im.setLeft(L + (W - im.getWidth()) / 2).setTop(T + (H - im.getHeight()) / 2); } b.remove(); };
  imagen('{{ICONO}}', iconoBlob_(R, x.icono)); imagen('{{QR}}', qrBlob_(x.verificar));
  // Firmas: la de HyS siempre en el último lugar, a la derecha; las demás repartidas a lo ancho
  const F = tabla_('_FIRMANTES'), fil = {}; F.filas.forEach(r => fil[r[F.i('ID_FIRMANTE')]] = obj_(F, r));
  const lista = x.firmantes.map(id => fil[id]).filter(Boolean), n = lista.length;
  const L = 14.3 * PT, Rr = 217 * PT, Wd = 45.7 * PT;
  const pos = n === 1 ? [Rr - Wd] : n === 2 ? [L, Rr - Wd] : n === 3 ? [L, (L + Rr - Wd) / 2, Rr - Wd] : [0, 1, 2, 3].map(i => L + i * (Rr - L - Wd) / 3);
  for (let k = 1; k <= 4; k++) {
    const partes = ['IMG', 'LIN', 'NOM', 'ACL'].map(t => porToken('{{F' + k + '_' + t + '}}'));
    if (k > n) { partes.forEach(z => z && z.remove()); continue; }
    const f = lista[k - 1], base = partes[1] ? partes[1].getLeft() : 0, dx = pos[k - 1] - base;
    partes.forEach(z => z && z.setLeft(z.getLeft() + dx));
    if (partes[1]) partes[1].getText().setText('');
    if (partes[2]) partes[2].getText().setText(f.NOMBRE);
    if (partes[3]) partes[3].getText().setText(String(vacio_(f.ACLARACION) ? [f.TITULO, f.MATRICULA].filter(v => !vacio_(v)).join(' · ') : f.ACLARACION).replace(/\bMP\s+/g, 'MP\u00A0'));
    let blob = null; try { const id = idDeLink_(f.IMAGEN_FIRMA); if (id) blob = DriveApp.getFileById(id).getBlob(); } catch (e) { blob = null; }
    imagen('{{F' + k + '_IMG}}', blob);
  }
}
function nombreArchivoCert_(c) { return (String(c.NOMBRE || 's-d').replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñü0-9]+/g, '_') + '_' + c.DNI + '_' + c.ID_CERTIFICADO + '.pdf').slice(0, 150); }
function generarPdf_(codigo, rehacer) {
  prepararF6_();
  const C = tabla_('CERTIFICADOS'), k = C.filas.findIndex(r => r[C.i('ID_CERTIFICADO')] === codigo); if (k < 0) throw new Error('No existe el certificado ' + codigo + '.');
  const c = obj_(C, C.filas[k]);
  if (/anulad/i.test(c.ESTADO)) throw new Error('El certificado ' + codigo + ' está anulado.');
  const capC = capDe_(c.CODIGO) || {}, rp = refPlantilla_(capC, c), propio = rp ? 'modelo:' + (idDeLink_(rp) || rp) : '';
  if (!rehacer) {
    const id = c.ARCHIVO_ID || (/^CHYS-/.test(codigo) ? '' : idDeLink_(c.LINK_PDF));
    // Con modelo propio: si el PDF guardado se armó con otro modelo, se rehace solo (el anterior queda como «ANTERIOR_»)
    if (id) { try { const f = DriveApp.getFileById(id); if (!f.isTrashed()) { if (!propio || f.getDescription() === propio) return f.getUrl(); rehacer = true; } } catch (e) { /* se arma de nuevo */ } }
    if (!/^CHYS-/.test(codigo) && !vacio_(c.LINK_PDF)) return c.LINK_PDF;   // certificados del sistema actual
  }
  const R = recursos_(), x = datosCert_(c);
  const copia = plantillaDe_(capDe_(c.CODIGO), R, c).makeCopy('tmp_' + codigo, R.certs), pres = SlidesApp.openById(copia.getId());
  try { llenarDiapositiva_(pres.getSlides()[0], x, R); pres.saveAndClose(); }
  catch (e) { copia.setTrashed(true); throw e; }
  const anio = isoDe_(c.FECHA).slice(0, 4) || Utilities.formatDate(new Date(), ZONA, 'yyyy'), cap = capDe_(c.CODIGO) || {};
  const dest = subcarpeta_(subcarpeta_(R.certs, anio), c.CODIGO + ' · ' + String(cap.NOMBRE || '').slice(0, 60));
  const f = dest.createFile(copia.getAs('application/pdf').setName(nombreArchivoCert_(c)));
  if (propio) f.setDescription(propio);
  copia.setTrashed(true);
  f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  // El PDF anterior no se borra: queda en la misma carpeta con «ANTERIOR_» adelante (23/10/2026)
  if (rehacer && c.ARCHIVO_ID && c.ARCHIVO_ID !== f.getId()) { try { const v = DriveApp.getFileById(c.ARCHIVO_ID); if (v.getName().indexOf('ANTERIOR_') !== 0) v.setName('ANTERIOR_' + v.getName()); } catch (e) { /* ya no estaba */ } }
  setCampos_(C, k, { ARCHIVO_ID: f.getId(), LINK_PDF: f.getUrl() });
  return f.getUrl();
}
// Varios certificados en un solo PDF (una página cada uno)
function pdfLote_(codigos, nombre) {
  const C = tabla_('CERTIFICADOS'), R = recursos_(), filas = codigos.map(cd => C.filas.find(r => r[C.i('ID_CERTIFICADO')] === cd)).filter(Boolean).map(r => obj_(C, r)).filter(c => !/anulad/i.test(c.ESTADO) && /^CHYS-/.test(c.ID_CERTIFICADO));
  if (!filas.length) throw new Error('No hay certificados para juntar.');
  if (filas.length > 60) throw new Error('Son más de 60: por ahora descargá cada uno con «PDF».');
  const pls = filas.map(c => plantillaDe_(capDe_(c.CODIGO), R, c)), ids = pls.map(f => f.getId()).filter((v, i, a) => a.indexOf(v) === i);
  if (ids.length > 1) throw new Error('Hay certificados con modelos distintos: armá un PDF por capacitación.');
  const copia = pls[0].makeCopy('tmp_lote', R.certs), pres = SlidesApp.openById(copia.getId()), base = pres.getSlides()[0];
  try {
    for (let i = 1; i < filas.length; i++) base.duplicate();
    const slides = pres.getSlides();
    filas.forEach((c, i) => llenarDiapositiva_(slides[i], datosCert_(c), R));
    pres.saveAndClose();
  } catch (e) { copia.setTrashed(true); throw e; }
  const dest = subcarpeta_(R.certs, 'Lotes'), f = dest.createFile(copia.getAs('application/pdf').setName(nombre + '.pdf'));
  copia.setTrashed(true); f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return f.getUrl();
}

// Rehace los PDF de una capacitación con su modelo actual (p. ej. después de cargar PLANTILLA_CERT). Los PDF anteriores quedan como «ANTERIOR_».
// Se corre desde el editor: rehacerPdfsLaboratorio(). Procesa de a 20 por vez para no pasar el límite de tiempo; correrla hasta que diga «0 pendientes».
function rehacerPdfsCapacitacion_(codigo, desde, tanda) {
  MEMO_ON = true;
  const C = tabla_('CERTIFICADOS'), P = PropertiesService.getScriptProperties(), clave = 'rehacer_' + codigo + '_' + (desde || '') + (tanda || '');
  const hechos = JSON.parse(P.getProperty(clave) || '{}');
  const lista = C.filas.map(r => obj_(C, r)).filter(c => c.CODIGO === codigo && /^CHYS-/.test(c.ID_CERTIFICADO) && !/anulad/i.test(c.ESTADO) && (!desde || (isoDe_(c.FECHA) || '') >= desde) && !hechos[c.ID_CERTIFICADO]);
  let n = 0;
  for (const c of lista.slice(0, 20)) { generarPdf_(c.ID_CERTIFICADO, true); hechos[c.ID_CERTIFICADO] = 1; n++; }
  P.setProperty(clave, JSON.stringify(hechos));
  if (n) historial_('Sistema', 'CERTIFICADOS', codigo, 'PDF rehechos con el modelo de la capacitación', '', String(n), 'Modelo propio (PLANTILLA_CERT)');
  const msj = n + ' PDF rehechos · ' + (lista.length - n) + ' pendientes';
  Logger.log(msj); return msj;
}
// Convierte un .pptx (modelo armado con datos de ejemplo) en Presentación de Google y lo deja listo para el sistema:
// cambia el nombre, el DNI y el texto de ejemplo por los campos {{NOMBRE}}, {{DNI}} ({{LUGAR}}), {{TEXTO}} y {{MES}}, y agrega
// abajo a la derecha el código de verificación y el QR. El .pptx original no se toca.
function modeloDesdePptx_(idPptx, nombre) {
  const orig = DriveApp.getFileById(idPptx), carpeta = orig.getParents().next();
  const r = UrlFetchApp.fetch('https://www.googleapis.com/drive/v3/files/' + idPptx + '/copy', { method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }, payload: JSON.stringify({ name: nombre, mimeType: 'application/vnd.google-apps.presentation', parents: [carpeta.getId()] }) });
  if (r.getResponseCode() !== 200) throw new Error('No se pudo convertir ' + orig.getName() + ': ' + r.getContentText().slice(0, 200));
  const id = JSON.parse(r.getContentText()).id, pres = SlidesApp.openById(id), s = pres.getSlides()[0];
  const hechos = [];
  s.getShapes().forEach(sh => {
    let t = ''; try { t = sh.getText().asString().trim(); } catch (e) { return; }
    if (/^[A-ZÁÉÍÓÚ][a-záéíóú]+ \d{4}$/.test(t)) { sh.getText().setText('{{MES}}'); hechos.push('MES'); }
    else if (t === 'Carlos Méndez') { sh.getText().setText('{{NOMBRE}}'); hechos.push('NOMBRE'); }
    else if (/^DNI:/.test(t)) { sh.getText().setText('DNI: {{DNI}} ({{LUGAR}})'); hechos.push('DNI'); }
    else if (/completado con éxito/.test(t)) { sh.getText().setText('{{TEXTO}}'); hechos.push('TEXTO'); }
  });
  const W = pres.getPageWidth(), H = pres.getPageHeight(), q = 54;
  const qr = s.insertShape(SlidesApp.ShapeType.RECTANGLE, W - q - 14, H - q - 14, q, q); qr.getText().setText('{{QR}}'); qr.getFill().setTransparent(); qr.getBorder().setTransparent();
  const cod = s.insertTextBox('Código de verificación {{COD}} · {{VIG}}', W - q - 14 - 300, H - 14 - 14, 296, 14);
  cod.getText().getTextStyle().setFontSize(6).setForegroundColor('#6B7B82'); cod.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.END);
  pres.saveAndClose();
  Logger.log(nombre + ': ' + hechos.join(', ') + ' · ' + id);
  return { id: id, campos: hechos };
}
function prepararModelosLaboratorio() {
  const a = modeloDesdePptx_('1g-7gH7l0T65oEdTYBegf3I-tmBzHK2qs', 'MODELO_CERT_LAB_SINCRONICA (sistema)');
  const b = modeloDesdePptx_('1xujkTenn07Bi341L1EkjbnViCeKym5Ow', 'MODELO_CERT_LAB_AUTOADMINISTRADA (sistema)');
  const C = tabla_('CATALOGO'), k = C.filas.findIndex(r => r[C.i('CODIGO')] === 'CAP-HYS-020');
  setCampos_(C, k, { PLANTILLA_CERT: 'https://docs.google.com/presentation/d/' + a.id + '/edit', PLANTILLA_CERT_VIDEO: 'https://docs.google.com/presentation/d/' + b.id + '/edit' });
  historial_('Sistema', 'CATALOGO', 'CAP-HYS-020', 'PLANTILLA_CERT', '', a.id + ' / ' + b.id, 'Modelos de laboratorio (sincrónica y autoadministrada)');
  return [a, b];
}
function rehacerPdfsLaboratorio() { return rehacerPdfsCapacitacion_('CAP-HYS-020', '2026-10-23', 'v3'); }

// ------------------------------------------------------------------ Públicas: descargar al terminar, Mis certificados y verificar
function certDeDoc_(codigo, d) {
  const C = tabla_('CERTIFICADOS'), r = C.filas.find(x => x[C.i('ID_CERTIFICADO')] === String(codigo || '').trim().toUpperCase());
  if (!r) return null; const c = obj_(C, r);
  return c.DNI === idDoc_(d) ? c : null;
}
function certDescargarAhora(d) {
  try { const c = certDeDoc_(d.codigo, d); if (!c) return { ok: false, error: 'No encontramos ese certificado con tu documento.' }; return { ok: true, url: generarPdf_(c.ID_CERTIFICADO) }; }
  catch (e) { return { ok: false, error: 'No se pudo armar el PDF ahora. Probá en un rato desde «Mis certificados». (' + e.message + ')' }; }
}
function certAcceso_(d) { return !!idDoc_(d); }   // alcanza con el documento (decisión de HyS: los datos del certificado no son reservados)
function certMios(d) {
  prepararF6_();
  if (!certAcceso_(d)) return { ok: false, error: 'Escribí tu documento.' };
  const doc = idDoc_(d), C = tabla_('CERTIFICADOS'), cat = {}, Ct = tabla_('CATALOGO'), hoy = iso_(new Date());
  Ct.filas.forEach(r => cat[r[Ct.i('CODIGO')]] = obj_(Ct, r));
  const lista = C.filas.map(r => obj_(C, r)).filter(c => c.DNI === doc && !/anulad|reemplaz/i.test(c.ESTADO)).map(c => {
    const k = cat[c.CODIGO] || {}, v = isoDe_(c.VENCE), estado = /no vence/i.test(c.VENCE) || !v ? 'No vence' : v < hoy ? 'Vencido' : v <= iso2_(new Date(Date.now() + 60 * 864e5)) ? 'Vence pronto' : 'Vigente';
    return { codigo: c.ID_CERTIFICADO, capacitacion: k.NOMBRE || c.CODIGO, icono: vacio_(k.ICONO) ? 'health_and_safety' : k.ICONO, tipo: c.TIPO + (num_(c.ENCUENTRO_N) ? ' · encuentro ' + c.ENCUENTRO_N + (num_(k.ENCUENTROS) ? ' de ' + k.ENCUENTROS : '') : ''),
      fecha: c.FECHA, nota: c.TIPO === TIPO_CERT.apr || c.TIPO === TIPO_CERT.prog ? c.NOTA : '', vence: c.VENCE, estado: estado,
      renovar: estado === 'Vencido' || estado === 'Vence pronto' ? (siNo_(k.SIEMPRE_ABIERTA) && /^activ/i.test(k.ESTADO) && !vacio_(k.TOKEN) ? linkReg_('k=' + k.TOKEN) : 'consultar') : '' };
  }).sort((a, b) => (isoDe_(b.fecha) || '').localeCompare(isoDe_(a.fecha) || ''));
  const P = personaPara_(doc);
  return { ok: true, saludo: P ? String(P.NOMBRES || '').trim().split(/\s+/).slice(0, 2).join(' ') : '', lista: lista };
}
function certDescargarMio(d) {
  if (!certAcceso_(d)) return { ok: false, error: 'Escribí tu documento.' };
  try { const c = certDeDoc_(d.codigo, d); if (!c) return { ok: false, error: 'Ese certificado no es tuyo.' }; return { ok: true, url: generarPdf_(c.ID_CERTIFICADO) }; }
  catch (e) { return { ok: false, error: 'No se pudo armar el PDF. Probá de nuevo en un rato. (' + e.message + ')' }; }
}
function certVerificar(codigo) {
  prepararF6_();
  const cod = String(codigo || '').trim().toUpperCase(); if (!cod) return { ok: false, error: 'Escribí el código del certificado.' };
  const C = tabla_('CERTIFICADOS'), r = C.filas.find(x => String(x[C.i('ID_CERTIFICADO')]).toUpperCase() === cod);
  if (!r) return { ok: true, estado: 'No existe', codigo: cod };
  const c = obj_(C, r), cap = capDe_(c.CODIGO) || {}, nom = (c.NOMBRE && c.NOMBRE !== 's/d') ? c.NOMBRE : nombrePersona_(personaPara_(c.DNI));
  const ini = String(nom || '').split(/\s+/).filter(Boolean).map((w, i) => i === 0 ? w : w[0] + '.').join(' ');
  const v = isoDe_(c.VENCE), estado = /anulad/i.test(c.ESTADO) ? 'Anulado' : v && v < iso_(new Date()) ? 'Vencido' : 'Válido';
  return { ok: true, estado: estado, codigo: cod, persona: ini, dni: '••••' + String(c.DNI).slice(-4), tipo: c.TIPO + (num_(c.ENCUENTRO_N) ? ' · encuentro ' + c.ENCUENTRO_N : '') + (/reemplaz/i.test(c.ESTADO) ? ' · reemplazado por ' + String(c.MOTIVO_ANULACION || '').replace(/^.*?(CHYS-\d{4}-\d+).*$/, '$1') + ' (mismo curso, modelo nuevo)' : ''), capacitacion: cap.NOMBRE || c.CODIGO,
    fecha: c.FECHA, horas: horasTxt_(c.HORAS), vigencia: /no vence/i.test(c.VENCE) ? 'Sin vencimiento' : 'Hasta el ' + c.VENCE, emisor: 'Servicio de Higiene y Seguridad Laboral · HZT / HMH' };
}
function certPagina_(p) {
  const t = HtmlService.createTemplateFromFile('Certificados');
  t.modo = p.v ? 'v' : 'm'; t.v = String(p.v || '').replace(/[^A-Za-z0-9-]/g, '');
  return t.evaluate().setTitle('Capacitaciones HyS · Certificados').addMetaTag('viewport', 'width=device-width, initial-scale=1').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ------------------------------------------------------------------ Portal (con clave)
function certsDictado_(id) {
  prepararF6_();
  const D = tabla_('DICTADOS'), k = D.filas.findIndex(r => r[D.i('ID_DICTADO')] === id); if (k < 0) return { ok: false, error: 'No existe el dictado.' };
  const o = obj_(D, D.filas[k]), cap = capDe_(o.CODIGO) || {}, C = tabla_('CERTIFICADOS');
  const lista = C.filas.map(r => obj_(C, r)).filter(c => c.ID_DICTADO === id).map(c => ({ codigo: c.ID_CERTIFICADO, nombre: c.NOMBRE, dni: c.DNI, tipo: c.TIPO + (num_(c.ENCUENTRO_N) ? ' · enc. ' + c.ENCUENTRO_N : ''), estado: c.ESTADO, motivo: c.MOTIVO_ANULACION, pdf: c.LINK_PDF }));
  const dis = disertantesDe_(D, k).map((x, j) => { const c = lista.find(y => y.dni === x.dni && /disertante/i.test(y.tipo) && !/anulad/i.test(y.estado)); return Object.assign({ idx: j, codigo: c ? c.codigo : '' }, x); });
  const programa = num_(cap.ENCUENTROS) > 1, ultimo = programa && num_(o.ENCUENTRO_N) >= num_(cap.ENCUENTROS);
  return { ok: true, lista: lista, disertantes: dis, programa: programa, ultimo: ultimo, cerrado: o.PROGRAMA_CERRADO || '', institucion: vacio_(o.INSTITUCION) ? '' : o.INSTITUCION };
}
function certAnular_(d) {
  return conLock_(() => {
    const C = tabla_('CERTIFICADOS'), k = C.filas.findIndex(r => r[C.i('ID_CERTIFICADO')] === d.codigo); if (k < 0) return { ok: false, error: 'No existe el certificado.' };
    if (vacio_(d.motivo)) return { ok: false, error: 'Escribí el motivo.' };
    const antes = C.filas[k][C.i('ESTADO')]; setCampos_(C, k, { ESTADO: 'Anulado', MOTIVO_ANULACION: d.motivo });
    historial_('HyS (portal)', 'CERTIFICADOS', d.codigo, 'ESTADO', antes, 'Anulado', d.motivo);
    return { ok: true };
  });
}
function certRehacer_(d) {
  const C = tabla_('CERTIFICADOS'), k = C.filas.findIndex(r => r[C.i('ID_CERTIFICADO')] === d.codigo); if (k < 0) return { ok: false, error: 'No existe el certificado.' };
  const c = obj_(C, C.filas[k]);
  if (c.TIPO !== TIPO_CERT.dis) { const p = personaPara_(c.DNI); if (p) setCampos_(C, k, { NOMBRE: nombrePersona_(p) }); }   // toma los datos corregidos
  return { ok: true, url: generarPdf_(d.codigo, true) };
}
function certLoteDictado_(d) {
  const r = certsDictado_(d.id); if (!r.ok) return r;
  const cods = r.lista.filter(c => !/anulad/i.test(c.estado) && (!d.tipo || c.tipo.indexOf(d.tipo) === 0)).map(c => c.codigo);
  return { ok: true, url: pdfLote_(cods, 'Certificados_' + d.id + (d.tipo ? '_' + d.tipo : '')), cantidad: cods.length };
}

// ------------------------------------------------------------------ Respaldo en Sheets
function menuEmitirPendientes() {
  const r = emitirPendientes_();
  SpreadsheetApp.getUi().alert('Certificados', r + ' certificado(s) nuevos con código. El PDF se arma cuando alguien lo descarga.', SpreadsheetApp.getUi().ButtonSet.OK);
}
// Registros desde el 1/10/2026 que corresponden a certificado y no lo tienen (por ejemplo, cargados por CARGA_MANUAL)
function emitirPendientes_() {
  return conLock_(() => {
    const R = tabla_('REGISTROS'); let n = 0;
    R.filas.map((r, k) => ({ o: obj_(R, r), k: k })).forEach(x => {
      const o = x.o, f = isoDe_(o.FECHA); if (!f || f < AVISOS_DESDE || !vacio_(o.ID_CERTIFICADO) || /anulad/i.test(o.ESTADO) || /^TEMA:/.test(o.CODIGO)) return;
      const cap = capDe_(o.CODIGO); if (!cap) return;
      const tipo = tipoCertDe_(cap, o); if (!tipo) return;
      crearCertificado_(tipo, o); n++;
    });
    return n;
  });
}
function menuCerrarPrograma() {
  const ui = SpreadsheetApp.getUi(), r = ui.prompt('Cerrar programa', 'ID del dictado del último encuentro (hoja DICTADOS, columna ID_DICTADO):', ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  try { const v = programaVista_(r.getResponseText().trim()); if (ui.alert('Cerrar programa', 'Se emiten ' + v.aprobacion + ' certificado(s) de aprobación y ' + v.participacion + ' constancia(s) de participación (asistencia mínima ' + v.minimo + ' de ' + v.total + '). ¿Seguimos?', ui.ButtonSet.YES_NO) !== ui.Button.YES) return; const x = programaCerrar_(r.getResponseText().trim()); ui.alert('Listo: ' + x.aprobacion + ' aprobación · ' + x.participacion + ' participación.'); }
  catch (e) { ui.alert(e.message); }
}
function menuPdfSeleccionado() {
  const sh = SpreadsheetApp.getActiveSheet(), ui = SpreadsheetApp.getUi();
  if (sh.getName() !== 'CERTIFICADOS') return ui.alert('Parate en una fila de la hoja CERTIFICADOS.');
  const cod = sh.getRange(sh.getActiveRange().getRow(), 1).getDisplayValue();
  try { const u = generarPdf_(cod); ui.showModalDialog(HtmlService.createHtmlOutput('<p style="font-family:Arial">PDF de ' + cod + ': <a target="_blank" href="' + u + '">abrir</a></p>').setWidth(380).setHeight(120), 'Certificado'); }
  catch (e) { ui.alert(e.message); }
}
function menuMisCertificados() {
  const u = CERT_WEB, q = qrDe_(u);
  SpreadsheetApp.getUi().showModalDialog(HtmlService.createHtmlOutput('<div style="font-family:Arial;font-size:13px"><p>Link de «Mis certificados» (para el portal del personal y la cartelera):</p><p><a target="_blank" href="' + u + '">' + u + '</a></p><p><a target="_blank" href="' + q + '">QR para descargar</a></p></div>').setWidth(560).setHeight(220), 'Mis certificados');
}

// =====================================================================
// CERTIFICADOS 2026 (desde el 1/4/2026): se rehacen con el modelo nuevo
// Pedido de HyS (10/10/2026). Una sola vez; se puede repetir sin duplicar (cada certificado se ata a su registro).
// - Capacitaciones de un encuentro: aprobó la evaluación → certificado de aprobación; si no → constancia de asistencia.
// - Programas: constancia por cada encuentro y, al final, aprobación (evaluación final aprobada) o participación.
//   Lavanderías (CAP-HYS-008): encuentros de la hoja HISTORICO_LAVANDERIA del libro 2026 + REGISTROS.
//   Bienes y RAEE (CAP-HYS-009) y los demás: encuentro según la fecha (hoja DICTADOS del libro 2026).
// - Si la persona ya tenía certificado del sistema actual (CERT/CONST), ese queda «Reemplazado» con el código nuevo.
// =====================================================================
const REEMISION_DESDE = '2026-04-01';
const PROGRAMAS_EVAL_ALCANZA = ['CAP-HYS-008', 'CAP-HYS-009'];   // decisión de HyS: la evaluación final aprobada alcanza para aprobar

function reemision2026_(soloContar) {
  prepararF6_();
  const Ct = tabla_('CATALOGO'), cat = {}; Ct.filas.forEach(r => { if (r[Ct.i('CODIGO')]) cat[r[Ct.i('CODIGO')]] = obj_(Ct, r); });
  const R = tabla_('REGISTROS'), C = tabla_('CERTIFICADOS');
  const yaPorReg = {}; C.filas.forEach(r => { const o = obj_(C, r); if (o.ID_REGISTRO && /^CHYS-/.test(o.ID_CERTIFICADO) && !/anulad/i.test(o.ESTADO)) yaPorReg[o.ID_REGISTRO] = o.ID_CERTIFICADO; });
  // Libro 2026 (sistema actual): dictados con encuentro y modalidad, lavandería por persona, modalidad de cada fila del libro
  const encDe = {}, modDe = {}, fechaEnc = {}, lav = {}, modLibro = {};
  try {
    const lib = SpreadsheetApp.openById(ID.personas);
    const dv = hojaDe_(lib, 'DICTADOS').getDataRange().getDisplayValues(), dh = n => dv[0].indexOf(n);
    dv.slice(1).forEach(r => { const cod = r[dh('ID_CAPACITACION')], f = isoDe_(r[dh('FECHA')]); if (!cod || !f) return;
      modDe[cod + '|' + f] = r[dh('MODALIDAD')]; if (num_(r[dh('ENCUENTRO')])) { encDe[cod + '|' + f] = num_(r[dh('ENCUENTRO')]); fechaEnc[cod + '|' + num_(r[dh('ENCUENTRO')])] = f; } });
    const lv = hojaDe_(lib, 'HISTORICO_LAVANDERIA').getDataRange().getDisplayValues();
    lv.slice(1).forEach(r => { const d = soloDni_(r[0]); if (!d || !num_(r[1])) return; lav[d] = lav[d] || { enc: {}, apr: false }; lav[d].enc[num_(r[1])] = 1; if (siNo_(r[2])) lav[d].apr = true; });
    const hv = hojaDe_(lib, 'HISTORICO_2026_LIBRO').getDataRange().getDisplayValues(), HH = hv[3].map(x => String(x).trim()), hh = n => HH.indexOf(n);
    hv.slice(5).forEach(r => { if (r[hh('ID_REGISTRO')]) modLibro['HIS-' + r[hh('ID_REGISTRO')]] = r[hh('MODALIDAD')]; });
  } catch (e) { throw new Error('No se pudo leer el libro 2026 (BASE_PERSONAS_CAPACITACIONES_2026): ' + e.message); }
  // Lavandería: los días de los encuentros que no están en DICTADOS (13/08 = 5, 20/08 = 6, 27/08 y 28/08 = 7)
  [['2026-07-16', 1], ['2026-07-23', 2], ['2026-07-30', 3], ['2026-08-06', 4], ['2026-08-13', 5], ['2026-08-20', 6], ['2026-08-27', 7], ['2026-08-28', 7]].forEach(x => { const k = 'CAP-HYS-008|' + x[0]; if (!encDe[k]) encDe[k] = x[1]; if (!fechaEnc['CAP-HYS-008|' + x[1]]) fechaEnc['CAP-HYS-008|' + x[1]] = x[0]; });
  ['2026-08-29', '2026-08-31'].forEach(f => { if (!encDe['CAP-HYS-009|' + f]) encDe['CAP-HYS-009|' + f] = 0; });   // evaluaciones tardías: no suman encuentro

  const unidades = [], progs = {};   // progs[cod][dni] = { enc:{}, apr:bool, nota, regs:[], modalidad, ultima }
  const prog = (cod, dni) => { progs[cod] = progs[cod] || {}; return progs[cod][dni] = progs[cod][dni] || { enc: {}, apr: false, nota: '', mods: {}, regsViejos: [] }; };
  R.filas.forEach((r, k) => {
    const o = obj_(R, r), f = isoDe_(o.FECHA); if (!f || f < REEMISION_DESDE || (f >= AVISOS_DESDE && !/^migraci/i.test(o.ORIGEN)) || /anulad/i.test(o.ESTADO)) return;   // desde octubre, solo lo que vino del sistema actual
    const dni = soloDni_(o.DNI); if (!dni || !/^\d{6,9}$/.test(dni)) return;
    const cap = cat[o.CODIGO]; if (!cap) return;
    const mod = modLibro[o.ID_REGISTRO] || modDe[o.CODIGO + '|' + f] || '', viejo = /^(CERT|CONST)-/.test(o.ID_CERTIFICADO) ? o.ID_CERTIFICADO : '';
    if (num_(cap.ENCUENTROS) > 1) {
      const g = prog(o.CODIGO, dni);
      let n = num_(o.ENCUENTRO_N) || encDe[o.CODIGO + '|' + f];
      if (o.TIPO === 'Evaluación') { if (siNo_(o.APROBADO)) { g.apr = true; if (o.NOTA !== '') g.nota = o.NOTA; } if (n === undefined) n = 0; }
      if (n) { g.enc[n] = g.enc[n] || { f: fechaEnc[o.CODIGO + '|' + n] || f, reg: o.ID_REGISTRO, fila: k, mod: mod }; }
      if (viejo) g.regsViejos.push({ fila: k, viejo: viejo, reg: o.ID_REGISTRO });
      if (mod) g.mods[mod] = 1;
      return;
    }
    if (yaPorReg[o.ID_REGISTRO]) return;
    const tipo = o.TIPO === 'Evaluación' && siNo_(o.APROBADO) ? 'apr' : 'asi';
    unidades.push({ tipo: tipo, reg: { ID_REGISTRO: o.ID_REGISTRO, DNI: dni, CODIGO: o.CODIGO, VERSION: o.VERSION || '1', ID_DICTADO: o.ID_DICTADO, FECHA: dma_(f), NOTA: tipo === 'apr' ? o.NOTA : '', VENCE: o.VENCE, HORAS: cap.CARGA_HORARIA },
      detalle: { modalidad: mod, reemision: true }, fila: k, viejo: viejo });
  });
  Object.keys(lav).forEach(dni => { const g = prog('CAP-HYS-008', dni); Object.keys(lav[dni].enc).forEach(n => { if (!g.enc[n]) g.enc[n] = { f: fechaEnc['CAP-HYS-008|' + n] || '', reg: '', fila: -1, mod: 'Virtual' }; }); if (lav[dni].apr) g.apr = true; });
  Object.keys(progs).forEach(cod => {
    const cap = cat[cod], total = num_(cap.ENCUENTROS), hs = horasEncuentro_(cap), evalAlcanza = PROGRAMAS_EVAL_ALCANZA.indexOf(cod) >= 0;
    const min = num_(cap.ASISTENCIA_MINIMA) || Math.ceil(total * 0.75);
    const fechas = []; Object.keys(progs[cod]).forEach(d => Object.keys(progs[cod][d].enc).forEach(n => { if (progs[cod][d].enc[n].f) fechas.push(progs[cod][d].enc[n].f); }));
    fechas.sort(); const desde = fechas[0] || '', hasta = fechas[fechas.length - 1] || '';
    Object.keys(progs[cod]).forEach(dni => {
      const g = progs[cod][dni], ns = Object.keys(g.enc).map(Number).sort((a, b) => a - b), mod = Object.keys(g.mods)[0] || (g.enc[ns[0]] || {}).mod || '';
      ns.forEach(n => { const e = g.enc[n], idr = e.reg || ('LAV-' + dni + '-E' + n); if (yaPorReg[idr]) return;
        unidades.push({ tipo: 'asi', reg: { ID_REGISTRO: idr, DNI: dni, CODIGO: cod, VERSION: cap.VERSION || '1', ID_DICTADO: 's/d', ENCUENTRO_N: n, FECHA: dma_(e.f || hasta), HORAS: hs }, detalle: { modalidad: e.mod || mod, reemision: true }, fila: e.fila, viejo: '' }); });
      const ok = g.apr && (evalAlcanza || ns.length >= min), idf = 'FIN-' + cod + '-' + dni;
      if (hasta && hasta < AVISOS_DESDE && (ok || ns.length) && !yaPorReg[idf]) unidades.push(   // solo programas terminados antes de octubre; los que siguen se cierran desde el portal
        { tipo: ok ? 'prog' : 'part', reg: { ID_REGISTRO: idf, DNI: dni, CODIGO: cod, VERSION: cap.VERSION || '1', ID_DICTADO: 's/d', FECHA: dma_(hasta), NOTA: ok ? g.nota : '', HORAS: ok ? cap.CARGA_HORARIA : (hs ? Math.round(10 * hs * ns.length) / 10 : cap.CARGA_HORARIA) },
        detalle: { modalidad: mod, asistidos: ns.length, total: total, desde: desde, hasta: hasta, reemision: true }, fila: -1, viejo: '' });
      g.regsViejos.forEach(v => { const u = unidades.find(x => x.reg.ID_REGISTRO === v.reg); if (u) u.viejo = v.viejo; });
    });
  });
  const cuenta = {}; unidades.forEach(u => { const t = TIPO_CERT[u.tipo] + (u.reg.ENCUENTRO_N ? ' (encuentro)' : ''); cuenta[t] = (cuenta[t] || 0) + 1; });
  const reemplazos = unidades.filter(u => u.viejo).length;
  if (soloContar) return { total: unidades.length, cuenta: cuenta, reemplazos: reemplazos, personas: Object.keys(unidades.reduce((m, u) => (m[u.reg.DNI] = 1, m), {})).length };

  // Personas (una sola lectura de cada base)
  const P = tabla_('PERSONAS'), pers = {}; P.filas.forEach(r => { pers[r[P.i('DNI')]] = obj_(P, r); });
  let base = {}; try { const T = tabla_('TODOS', SpreadsheetApp.openById(ID.trabajadores)); T.filas.forEach(r => { const d = soloDni_(r[T.i('DNI')]); if (d && !base[d]) base[d] = obj_(T, r); }); } catch (e) { base = {}; }
  let viejos = {}; try { const v = hojaDe_(SpreadsheetApp.openById(ID.personas), 'PERSONAS').getDataRange().getDisplayValues(), h = n => v[0].indexOf(n); v.slice(1).forEach(x => { const d = soloDni_(x[h('DNI')]); if (d) viejos[d] = { NOMBRES: x[h('NOMBRES')], APELLIDOS: x[h('APELLIDOS')], CORREO: x[h('EMAIL')] }; }); } catch (e) { viejos = {}; }
  const quien = d => pers[d] || base[d] || viejos[d] || null;
  MEMO_ON = true;   // firmantes y catálogo: una sola lectura
  try {
  const anio = Utilities.formatDate(new Date(), ZONA, 'yyyy'), pre = PREFIJO_CERT + '-' + anio + '-';
  let n = C.filas.reduce((m, r) => { const c = String(r[C.i('ID_CERTIFICADO')]); return c.indexOf(pre) === 0 ? Math.max(m, Number(c.slice(pre.length)) || 0) : m; }, 0);
  const hoy = ahoraTxt_(), filas = [], regCod = {}, viejoCod = {}, firmDe = {};
  unidades.forEach(u => {
    const cap = cat[u.reg.CODIGO], p = quien(u.reg.DNI), cod = pre + ('0000' + (++n)).slice(-5), f = isoDe_(u.reg.FECHA);
    const correo = p ? (p.CORREO || p.EMAIL || '') : '';
    filas.push({ ID_CERTIFICADO: cod, DNI: u.reg.DNI, CODIGO: u.reg.CODIGO, VERSION: u.reg.VERSION, TIPO: TIPO_CERT[u.tipo], FECHA: u.reg.FECHA, HORAS: sd_(String(u.reg.HORAS == null ? '' : u.reg.HORAS).replace('.', ',')),
      FIRMANTES: firmDe[u.reg.CODIGO] = firmDe[u.reg.CODIGO] || firmantesOrden_(String(cap.FIRMANTES || FIRMA_HYS).split(/[,;]\s*/)).join(', '), LINK_PDF: '', ESTADO: 'Válido', NOMBRE: p ? nombrePersona_(p) : 's/d', CORREO: correoOk_(correo) ? correo : '',
      ID_REGISTRO: u.reg.ID_REGISTRO, ID_DICTADO: u.reg.ID_DICTADO || 's/d', ENCUENTRO_N: u.reg.ENCUENTRO_N || '', NOTA: u.reg.NOTA === undefined ? '' : u.reg.NOTA,
      VENCE: venceDe_(cap, f), EMITIDO: hoy, ARCHIVO_ID: '', MOTIVO_ANULACION: '', DETALLE: JSON.stringify(u.detalle) });
    if (u.fila >= 0 && u.reg.ID_REGISTRO) regCod[u.fila] = cod;
    if (u.viejo) viejoCod[u.viejo] = cod;
  });
  conLock_(() => {
    agregar_(C, filas);
    // REGISTROS migrados: vencimiento recalculado (12 meses desde la fecha; la inducción no vence). En el libro 2026 había fechas en formato mes/día.
    const jv = R.i('VENCE'); if (jv >= 0) { const col = R.filas.map(r => { const o = obj_(R, r), f = isoDe_(o.FECHA), cap = cat[o.CODIGO]; return [/^migraci/i.test(o.ORIGEN) && f && cap ? venceDe_(cap, f) : r[jv]]; }); R.sh.getRange(6, jv + 1, col.length, 1).setValues(col); }
    // REGISTROS: el código nuevo en ID_CERTIFICADO (una sola escritura de la columna)
    const j = R.i('ID_CERTIFICADO'); if (j >= 0 && Object.keys(regCod).length) { const col = R.filas.map((r, k) => [regCod[k] || r[j]]); R.sh.getRange(6, j + 1, col.length, 1).setValues(col); }
    // Certificados del sistema actual: quedan «Reemplazado» con el código nuevo
    if (Object.keys(viejoCod).length) {
      const C2 = tabla_('CERTIFICADOS'), je = C2.i('ESTADO'), jm = C2.i('MOTIVO_ANULACION');
      const est = C2.filas.map(r => [viejoCod[r[C2.i('ID_CERTIFICADO')]] ? 'Reemplazado' : r[je]]), mot = C2.filas.map(r => [viejoCod[r[C2.i('ID_CERTIFICADO')]] ? 'Reemplazado por ' + viejoCod[r[C2.i('ID_CERTIFICADO')]] + ' (modelo nuevo, ' + hoy.slice(0, 10) + ')' : r[jm]]);
      C2.sh.getRange(6, je + 1, est.length, 1).setValues(est); C2.sh.getRange(6, jm + 1, mot.length, 1).setValues(mot);
    }
    historial_('HyS', 'CERTIFICADOS', 'Reemisión 2026', 'Alta', '', filas.length + ' certificados', 'Certificados desde el 01/04/2026 con el modelo nuevo');
  });
  return { ok: true, total: filas.length, reemplazos: Object.keys(viejoCod).length };
  } finally { MEMO_ON = false; }
}
// Dos pasos separados (Google corta a los 6 minutos y cuenta el tiempo que el aviso queda abierto):
// primero muestra los números; si se confirma, deja la creación programada para dentro de un minuto.
function menuReemision2026() {
  const ui = SpreadsheetApp.getUi();
  try {
    const c = reemision2026_(true);
    if (!c.total) return ui.alert('Certificados 2026', 'No hay certificados pendientes: ya están todos hechos con el modelo nuevo.', ui.ButtonSet.OK);
    const txt = Object.keys(c.cuenta).map(k => '· ' + k + ': ' + c.cuenta[k]).join('\n');
    if (ui.alert('Certificados 2026 (desde el 1/4)', 'Se crean ' + c.total + ' certificados para ' + c.personas + ' personas:\n' + txt + '\n\n' + c.reemplazos + ' del sistema actual quedan «Reemplazado» por el nuevo.\nLos PDF se arman cuando cada persona los descarga. ¿Seguimos?', ui.ButtonSet.YES_NO) !== ui.Button.YES) return;
    ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'reemision2026EnSegundoPlano').forEach(t => ScriptApp.deleteTrigger(t));
    ScriptApp.newTrigger('reemision2026EnSegundoPlano').timeBased().after(60 * 1000).create();
    ui.alert('Certificados 2026', 'Listo para crear. Empieza en 1 minuto y tarda 1 o 2 minutos más; podés cerrar el libro.\nPara ver el resultado, volvé a abrir esta opción del menú: si ya están creados, dice «No hay certificados pendientes».', ui.ButtonSet.OK);
  } catch (e) { ui.alert(e.message); }
}
function reemision2026EnSegundoPlano() {
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'reemision2026EnSegundoPlano').forEach(t => ScriptApp.deleteTrigger(t));
  try { const r = reemision2026_(false); PropertiesService.getScriptProperties().setProperty('reemision2026', JSON.stringify({ fecha: ahoraTxt_(), total: r.total, reemplazos: r.reemplazos })); }
  catch (e) { aviso_('Certificados 2026 no creados', 'CERTIFICADOS', 'Reemisión 2026', String(e.message || e)); }
}

// =====================================================================
// PDF EN SEGUNDO PLANO: arma los PDF que faltan, de a tandas, cada 10 minutos, para que la descarga sea inmediata.
// Respeta el tope diario de Google (unos 90 min de ejecución por día en cuentas personales): 1.600 PDF tardan 2 o 3 días.
// Si alguien descarga uno que todavía no está, se arma en el momento como siempre.
// =====================================================================
const PDF_TANDA_MS = 4.5 * 60 * 1000;
function pdfsEnSegundoPlano() {
  const t0 = Date.now(), C = tabla_('CERTIFICADOS');
  const pend = C.filas.map(r => obj_(C, r)).filter(c => /^CHYS-/.test(c.ID_CERTIFICADO) && !/anulad|reemplaz/i.test(c.ESTADO) && vacio_(c.ARCHIVO_ID)).map(c => c.ID_CERTIFICADO);
  let hechos = 0, errores = 0;
  MEMO_ON = true;
  try {
    for (const cod of pend) {
      if (Date.now() - t0 > PDF_TANDA_MS) break;
      try { generarPdf_(cod); hechos++; } catch (e) { errores++; if (errores <= 3) aviso_('PDF no generado', 'CERTIFICADOS', cod, String(e.message || e)); if (errores > 10) break; }
    }
  } finally { MEMO_ON = false; }
  PropertiesService.getScriptProperties().setProperty('pdfEstado', JSON.stringify({ fecha: ahoraTxt_(), hechos: hechos, faltan: pend.length - hechos, errores: errores }));
  return { hechos: hechos, faltan: pend.length - hechos, errores: errores };
}
function pdfDisparador_() { return ScriptApp.getProjectTriggers().find(t => t.getHandlerFunction() === 'pdfsEnSegundoPlano') || null; }
function menuPdfsSegundoPlano() {
  const ui = SpreadsheetApp.getUi(), C = tabla_('CERTIFICADOS');
  const faltan = C.filas.map(r => obj_(C, r)).filter(c => /^CHYS-/.test(c.ID_CERTIFICADO) && !/anulad|reemplaz/i.test(c.ESTADO) && vacio_(c.ARCHIVO_ID)).length;
  let est = {}; try { est = JSON.parse(PropertiesService.getScriptProperties().getProperty('pdfEstado') || '{}'); } catch (e) { est = {}; }
  const ultima = est.fecha ? '\nÚltima tanda: ' + est.fecha + ' · ' + est.hechos + ' PDF' + (est.errores ? ' · ' + est.errores + ' con error (ver _AVISOS)' : '') : '';
  if (pdfDisparador_()) {
    if (ui.alert('PDF en segundo plano', 'Está ACTIVADO. Faltan ' + faltan + ' PDF.' + ultima + '\n\n¿Lo desactivo?', ui.ButtonSet.YES_NO) === ui.Button.YES) { ScriptApp.deleteTrigger(pdfDisparador_()); ui.alert('Desactivado. Los PDF que falten se arman cuando alguien los descarga.'); }
    return;
  }
  if (ui.alert('PDF en segundo plano', 'Faltan ' + faltan + ' PDF. Se arman solos cada 10 minutos (unos 40 por vez) y después siguen con los certificados nuevos.' + ultima + '\n\n¿Lo activo?', ui.ButtonSet.YES_NO) !== ui.Button.YES) return;
  ScriptApp.newTrigger('pdfsEnSegundoPlano').timeBased().everyMinutes(10).create();
  ui.alert('Activado. Podés seguir el avance volviendo a esta opción del menú.');
}
// Vencimiento: 12 meses desde la fecha; solo la inducción (VENCE = «No vence» en el catálogo) no vence
function venceDe_(cap, fIso) { return cap && /no vence/i.test(cap.VENCE) ? 'No vence' : dma_(masDoce_(fIso)); }
// Prueba desde el editor (solo lee): arma la página de registro de un dictado y muestra el comienzo
function probarRegistroGet() { const o = doGet({ parameter: { d: 'DIC-20261015-01' } }); const t = o.getContent ? o.getContent() : String(o); Logger.log(t.length + ' caracteres · ' + t.replace(/\s+/g, ' ').slice(0, 300)); }

// Personas capacitadas de un establecimiento (tablero › semáforo por hospital), con lo que hicieron en el ciclo
ACCIONES.c_est_personas = d => { const hoy = iso_(new Date()), anio = Number(hoy.slice(0, 4)), mes = Number(hoy.slice(5, 7)), c0 = Number(cicloDe_(hoy));
  const N = libroNuevoTablero_({ desde: cicloDesde_(c0), hasta: (c0 + 1) + '-03-31' }, hoy), e = N.porEst.find(x => x.nombre === d.est);
  return e ? { ok: true, est: e.nombre, nombre: e.nombreLargo, red: e.red, lista: e.lista, capacitaciones: e.capacitaciones } : { ok: false, error: 'No hay registros de ' + d.est + '.' }; };
// Diagnóstico (18/10/2026): arma la página de registro de un dictado y devuelve su tamaño y comienzo (pide la clave del portal)
ACCIONES.c_prueba_registro = d => { try { const o = doGet({ parameter: d.p || { d: 'DIC-20261015-01' } }); const t = o.getContent ? o.getContent() : String(o); return { ok: true, largo: t.length, inicio: t.replace(/\s+/g, ' ').slice(0, 400) }; } catch (e) { return { ok: false, error: String(e && e.stack || e) }; } };

// =====================================================================
// Capacitaciones autoadministradas con video (decisión de Belén, 19/10/2026)
// Los videos salen de la hoja VIDEOS del sitio público (columna CODIGO = la capacitación). Link: …/capacitaciones/?av=CODIGO
// La página cuenta los tramos de 5 segundos que se reprodujeron (adelantar no suma) y los guarda en _VIDEOS_VISTOS
// por persona, video y ciclo. Con el 80 % de cada video: si la capacitación tiene evaluación, se habilita; si no, se registra
// la asistencia y sale el certificado. Certificado: aprobación (evaluación, un encuentro) o asistencia (sin evaluación o programa).
// =====================================================================
const VIDEO_DIC = 'VIDEO';         // ID_DICTADO de lo hecho con video (en REGISTROS, _INTENTOS y CERTIFICADOS)
const VIDEO_MIN = 0.8;             // parte de cada video que hay que mirar
const VIDEO_TRAMO = 5;             // segundos por tramo
const VISTOS_H = ['FECHA', 'ACTUALIZADO', 'DNI', 'CODIGO', 'VIDEO_ID', 'TITULO', 'CICLO', 'DURACION_SEG', 'TRAMOS', 'PORCENTAJE', 'COMPLETO'];
function idYT_(u) { const m = String(u || '').match(/(?:youtu\.be\/|[?&]v=|embed\/|shorts\/|live\/)([\w-]{11})/); return m ? m[1] : ''; }
function videosDe_(codigo) {
  const ck = 'videos|' + codigo, cache = CacheService.getScriptCache(), guardado = cache.get(ck);
  if (guardado) return JSON.parse(guardado);
  const sh = SpreadsheetApp.openById(ID_PORTAL_PUBLICO).getSheetByName('VIDEOS'); if (!sh) return [];
  const v = sh.getDataRange().getDisplayValues(), H = v[0].map(x => String(x).trim()), c = n => H.indexOf(n);
  if (c('CODIGO') < 0) return [];
  const out = v.slice(1).filter(r => String(r[c('CODIGO')]).trim().toUpperCase() === String(codigo).toUpperCase() && !/^no/i.test(String(r[c('VISIBLE')]).trim()))
    .map(r => ({ id: idYT_(r[c('ENLACE')]), titulo: String(r[c('TITULO')]).trim(), orden: num_(r[c('ORDEN')]), horas: c('HORAS') < 0 ? 0 : Number(String(r[c('HORAS')]).replace(',', '.')) || 0 })).filter(x => x.id).sort((a, b) => a.orden - b.orden);
  cache.put(ck, JSON.stringify(out), 600);
  return out;
}
// Carga horaria del certificado hecho con video: suma de la columna HORAS de la hoja VIDEOS; vacía = la del catálogo
function horasVideo_(codigo) { const h = videosDe_(codigo).reduce((t, v) => t + (v.horas || 0), 0); return h ? String(Math.round(h * 10) / 10).replace('.', ',') : undefined; }
function vistos_() {
  const lib = SpreadsheetApp.getActive();
  if (!lib.getSheetByName('_VIDEOS_VISTOS')) {
    const sh = lib.insertSheet('_VIDEOS_VISTOS');
    sh.getRange(1, 1).setValue('VIDEOS VISTOS · Capacitaciones autoadministradas').setFontWeight('bold').setFontSize(13);
    sh.getRange(2, 1).setValue('Una fila por persona, video y ciclo. La llena sola la página de registro (?av=CODIGO): cuenta los tramos de ' + VIDEO_TRAMO + ' segundos que se reprodujeron (adelantar no suma). Con el ' + Math.round(VIDEO_MIN * 100) + ' % de cada video se habilita la evaluación o sale la constancia. TRAMOS: x = visto, . = no visto. No se borra.');
    sh.getRange(5, 1, 1, VISTOS_H.length).setValues([VISTOS_H]).setFontWeight('bold').setBackground('#E7F0F3');
    sh.setFrozenRows(5);
  }
  return tabla_('_VIDEOS_VISTOS');
}
const tramosDe_ = t => String(t || '').split('').map(x => x === 'x' || x === '1');
const porcDe_ = (b, n) => n ? b.slice(0, n).filter(Boolean).length / n : 0;
// Estado de los videos de una persona en el ciclo actual
function estadoVideos_(doc, codigo, videos, T) {
  T = T || vistos_(); const ciclo = cicloDe_(iso_(new Date())), i = T.i;
  const lista = videos.map(v => {
    const r = T.filas.find(x => x[i('DNI')] === doc && x[i('CODIGO')] === codigo && x[i('VIDEO_ID')] === v.id && x[i('CICLO')] === ciclo);
    const n = r ? Math.ceil(num_(r[i('DURACION_SEG')]) / VIDEO_TRAMO) : 0, b = r ? tramosDe_(r[i('TRAMOS')]) : [];
    return { id: v.id, titulo: v.titulo, tramos: b.slice(0, n).map(x => x ? '1' : '0').join(''), porc: Math.floor(100 * porcDe_(b, n)) };
  });
  return { videos: lista, completos: lista.every(x => x.porc >= VIDEO_MIN * 100) };
}
function datosVideo_(d) {
  const ini = regInicio('', '', '', d.av); if (!ini.ok) return ini;
  if (!ini.abierta.abierta) return { ok: false, error: ini.abierta.texto };
  const doc = idDoc_(d); if (!doc) return { ok: false, error: 'Falta tu documento.' };
  return { ok: true, ini: ini, doc: doc, videos: videosDe_(ini.cap.codigo) };
}
// Lo llama la página al terminar los datos, y cada vez que vuelve
function videoEstado(d) {
  const x = datosVideo_(d); if (!x.ok) return x;
  return conLock_(() => respuestaVideos_(x, estadoVideos_(x.doc, x.ini.cap.codigo, x.videos)));
}
// Guarda lo visto (se suma a lo anterior: nunca se pierde un tramo)
function videoAvance(d) {
  const x = datosVideo_(d); if (!x.ok) return x;
  const v = x.videos.find(o => o.id === d.vid); if (!v) return { ok: false, error: 'Video desconocido.' };
  const dur = Math.max(0, Math.round(Number(d.dur) || 0)); if (!dur) return { ok: false, error: 'Sin duración.' };
  const n = Math.ceil(dur / VIDEO_TRAMO), nuevo = String(d.tramos || '').replace(/[^01]/g, '').split('').map(c => c === '1');
  return conLock_(() => {
    const T = vistos_(), i = T.i, ciclo = cicloDe_(iso_(new Date())), cod = x.ini.cap.codigo;
    const k = T.filas.findIndex(r => r[i('DNI')] === x.doc && r[i('CODIGO')] === cod && r[i('VIDEO_ID')] === v.id && r[i('CICLO')] === ciclo);
    const antes = k >= 0 ? tramosDe_(T.filas[k][i('TRAMOS')]) : [];
    const b = []; for (let j = 0; j < n; j++) b.push(!!(antes[j] || nuevo[j]));
    const porc = Math.floor(100 * porcDe_(b, n)), txt = b.map(y => y ? 'x' : '.').join(''), completo = porc >= VIDEO_MIN * 100;
    if (k < 0) agregar_(T, [{ FECHA: ahoraTxt_(), ACTUALIZADO: ahoraTxt_(), DNI: x.doc, CODIGO: cod, VIDEO_ID: v.id, TITULO: v.titulo, CICLO: ciclo, DURACION_SEG: dur, TRAMOS: txt, PORCENTAJE: porc, COMPLETO: completo ? ahoraTxt_() : '' }]);
    else { const ya = T.filas[k][i('COMPLETO')]; setCampos_(T, k, { ACTUALIZADO: ahoraTxt_(), DURACION_SEG: dur, TRAMOS: txt, PORCENTAJE: porc, COMPLETO: ya || (completo ? ahoraTxt_() : '') }); }
    return respuestaVideos_(x, estadoVideos_(x.doc, cod, x.videos, vistos_()));
  });
}
// Con todo visto: si no hay evaluación, registra la asistencia (una vez por ciclo) y emite el certificado
function respuestaVideos_(x, est) {
  const cap = x.ini.cap, r = { ok: true, videos: est.videos, completos: est.completos, minimo: Math.round(VIDEO_MIN * 100), evaluacion: !!x.ini.evaluacion, certificado: '' };
  if (!est.completos || x.ini.evaluacion) return r;
  const R = tabla_('REGISTROS'), j = R.i, hoyIso = iso_(new Date()), ciclo = cicloDe_(hoyIso);
  const ya = R.filas.find(f => f[j('DNI')] === x.doc && f[j('CODIGO')] === cap.codigo && f[j('ID_DICTADO')] === VIDEO_DIC && f[j('CICLO')] === ciclo && !/anulad/i.test(f[j('ESTADO')]));
  if (ya) { r.certificado = vacio_(ya[j('ID_CERTIFICADO')]) ? '' : ya[j('ID_CERTIFICADO')]; r.yaEstaba = true; return r; }
  const reg = { ID_REGISTRO: uid_('REG', x.doc), FECHA: Utilities.formatDate(new Date(), ZONA, 'dd/MM/yyyy HH:mm'), DNI: x.doc, CODIGO: cap.codigo, VERSION: cap.version || '1', ID_DICTADO: VIDEO_DIC, ENCUENTRO_N: '', TIPO: 'Asistencia', ID_EVALUACION: '', NOTA: '', APROBADO: '', CICLO: ciclo,
    VENCE: /no vence/i.test(cap.vence) ? 'No vence' : dma_(masDoce_(hoyIso)), ORIGEN: 'Video autoadministrado', CARGADO_POR: 'Registro', ESTADO: 'Válido' };
  agregar_(R, [reg]);
  const hv = horasVideo_(cap.codigo); if (hv) reg.HORAS = hv;
  r.certificado = certAlRegistrar_(reg);
  CacheService.getScriptCache().remove('tablero');
  return r;
}
