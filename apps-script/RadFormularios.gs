/**
 * SISTEMA HyS · MÓDULO 5 · RADIACIONES IONIZANTES › FORMULARIOS DEL DOSÍMETRO PERSONAL (RadFormularios.gs) · versión 0 (25/10/2026)
 * Pedido de Belén (25/10/2026). Tres formularios para imprimir, firmar y adjuntar (foto o PDF) en el sistema:
 *   F-RAD-01  Solicitud de alta de dosímetro personal, con el ANEXO · Compromiso de uso del dosímetro personal
 *   F-RAD-02  Solicitud de baja de dosímetro personal
 *   F-RAD-03  Informe de novedad de dosímetro (pérdida, extravío, robo, daño u otra)
 * Datos del trabajador: apellido y nombres, DNI, CUIL, teléfono, correo, servicio o servicios en que se desempeña, función, título y matrícula.
 * Firmas: el trabajador (firma, aclaración y sello si corresponde), el jefe del servicio (firma y sello) y la recepción de Higiene y Seguridad.
 * Se imprimen dos copias en la misma hoja: ORIGINAL para el Servicio de Personal y DUPLICADO para Higiene y Seguridad.
 * Salen en blanco o con los datos ya cargados (de la persona en RADIACIONES › PERSONAL_EXPUESTO y de lo que se está cargando en la pantalla).
 * Se arman con el diseño de las hojas para imprimir (Imprimir.gs › impDoc_): no crean archivos en Drive ni envían correos.
 * Entradas: Imprimir.gs › tema «rad_form» (Mi establecimiento: m_imprimir; portal: p_imp_hoja). Permiso: módulo «Radiaciones» de ACCESOS.
 * Contenido del anexo: lo pedido por Belén y las pautas de uso del curso de protección radiológica de MKS (unidad 5, uso correcto del dosímetro).
 * Normativa: Ley 17.557 y Dto. 6320/68 (vigilancia dosimétrica individual del personal); Ley 19.587 y Dto. 351/79; Res. SRT 905/2015.
 */

const RADF = {
  NORMAS: 'Ley 17.557 y Dto. 6320/68 (vigilancia dosimétrica individual del personal expuesto a radiaciones ionizantes); Ley 19.587 y Dto. 351/79.',
  FORMS: {
    alta: { cod: 'F-RAD-01', t: 'Solicitud de alta de dosímetro personal' },
    baja: { cod: 'F-RAD-02', t: 'Solicitud de baja de dosímetro personal' },
    novedad: { cod: 'F-RAD-03', t: 'Informe de novedad de dosímetro' }
  },
  MOTIVOS_BAJA: ['Fin de la exposición (cambio de servicio o de tareas)', 'Licencia prolongada', 'Renuncia, jubilación o traslado', 'A pedido del trabajador', 'Otro'],
  NOVEDADES: ['Pérdida', 'Extravío', 'Robo', 'Daño o rotura', 'Expuesto a radiación sin estar en uso', 'Otra'],
  COPIAS: ['ORIGINAL · para el Servicio de Personal', 'DUPLICADO · para Higiene y Seguridad'],
  // Anexo del F-RAD-01. Las que dicen MKS salen del curso de protección radiológica del servicio de dosimetría (unidad 5, uso correcto del dosímetro)
  COMPROMISO: [
    'Debe realizar el curso de utilización del dosímetro que brinda MKS, el servicio de dosimetría.',
    'El dosímetro es de uso exclusivamente personal: no lo puede prestar ni usar el de otra persona.',
    'No lo puede irradiar: no debe dejarlo en la sala ni cerca del equipo, ni exponerlo a la radiación cuando no lo tiene puesto.',
    'No lo puede sacar del servicio.',
    'Debe usarlo durante toda la jornada laboral y solo durante la jornada laboral, debajo del delantal plomado, a la altura del pecho.',
    'Cuando no lo usa, debe guardarlo en el lugar asignado del servicio, protegido de la radiación.',
    'No debe usarlo cuando se realiza estudios como paciente.',
    'No debe abrirlo, desarmarlo ni dañarlo.',
    'Debe entregarlo para su lectura en las fechas que se le indiquen.',
    'Ante cualquier eventualidad con el dosímetro, debe notificarla por escrito a Higiene y Seguridad.',
    'En caso de pérdida, extravío, robo, daño u otra novedad, debe completar el formulario F-RAD-03 «Informe de novedad de dosímetro» y entregarlo de inmediato a Higiene y Seguridad.',
    'En caso de embarazo, debe informarlo con certificado médico al responsable del servicio.'
  ]
};

// Datos para el formulario: la persona cargada (si viene el ID) y, encima, lo que se está cargando en la pantalla
function radfDatos_(cod, d) {
  d = d || {}; let p = null;
  if (d.ID) { try { p = radLeer_('PERSONAL_EXPUESTO', RAD.H_PER).find(o => o.ID === d.ID && limpio_(o.ESTABLECIMIENTO) === cod) || null; } catch (e) {} }
  if (p) p = radConBase_([p])[0];   // datos personales: de la base única
  const o = Object.assign({}, p || {}); Object.keys(d).forEach(k => { if (d[k] !== '' && d[k] != null && typeof d[k] !== 'object') o[k] = d[k]; });
  if (o.SERVICIOS == null || o.SERVICIOS === '') o.SERVICIOS = o.SERVICIO || '';
  return o;
}
const radfV_ = v => limpio_(v);
const radfF_ = v => { const s = typeof radISO_ === 'function' ? radISO_(v) : limpio_(v); return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s.split('-').reverse().join('/') : limpio_(v); };

// Bloques comunes
function radfTrabajador_(cod, o) {
  return impH2_('Datos del trabajador') + impDatos_([['Apellido y nombres', radfV_(o.APELLIDO_Y_NOMBRE)], ['DNI', radfV_(o.DNI)], ['CUIL', radfV_(o.CUIL)], ['Teléfono', radfV_(o.TELEFONO)],
    ['Correo electrónico', radfV_(o.EMAIL)], ['Servicio o servicios en que se desempeña', radfV_(o.SERVICIOS)], ['Función', radfV_(o.FUNCION)], ['Título', radfV_(o.TITULO)], ['Matrícula', radfV_(o.MATRICULA)],
    ['Establecimiento', impNombreEst_(cod) + (o.SITIO ? ' · ' + o.SITIO : '')]]);
}
const radfOps_ = (ops, val) => '<p style="margin:2px 0 6px">' + ops.map(x => impCb_(!!val && x === val, x)).join(' ') + '</p>';
function radfFirmas_() {
  return impFirmas_([{ t: 'Trabajador', cargoTxt: 'Firma, aclaración y sello (si corresponde)' }, { t: 'Jefe del servicio', cargoTxt: 'Firma y sello' }, { t: 'Recepción Higiene y Seguridad', cargoTxt: 'Hora de recepción' }]);
}
const radfCopia_ = (txt, i) => '<div class="copia' + (i ? ' salto' : '') + '"><b>' + impE_(txt) + '</b></div>';
const radfSalto_ = () => '<div class="salto"></div>';

// F-RAD-01 · Solicitud de alta + anexo
function radfAlta_(cod, o) {
  const sol = radfTrabajador_(cod, o) + impH2_('Dosímetro que se solicita') +
    impDatos_([['Sector donde se expone', radfV_(o.SECTOR_EXPOSICION)], ['Fecha de inicio de la exposición', radfF_(o.INICIO_EXPOSICION)]]) +
    '<p class="nota" style="margin:4px 0 2px">Tipo de dosímetro:</p>' + radfOps_(RAD.TIPOS_DOSI.filter(t => t !== 'Otro').concat(['Otro']), radfV_(o.TIPO_DOSIMETRO)) +
    impH2_('Para completar cuando el servicio de dosimetría asigne el dosímetro') + impDatos_([['N.º de dosímetro asignado por MKS', radfV_(o.DOSIMETRO_NRO)], ['Servicio de dosimetría', radfV_(o.PROVEEDOR) || 'MKS'], ['Fecha de alta del dosímetro', radfF_(o.ALTA_DOSIMETRO)]]) +
    '<p class="nota">El trabajador firma también el anexo «Compromiso de uso del dosímetro personal», que forma parte de esta solicitud.</p>' + radfFirmas_();
  const anexo = '<h2>Anexo · Compromiso de uso del dosímetro personal</h2>' +
    impDatos_([['Trabajador', radfV_(o.APELLIDO_Y_NOMBRE)], ['DNI', radfV_(o.DNI)], ['N.º de dosímetro', radfV_(o.DOSIMETRO_NRO)]]) +
    '<p style="margin:6px 0">El trabajador declara estar al tanto de que:</p><ol class="comp">' + RADF.COMPROMISO.map(t => '<li>' + impE_(t) + '</li>').join('') + '</ol>' +
    '<p style="margin:8px 0">Declaro haber leído estas condiciones, haberlas comprendido y me comprometo a cumplirlas.</p>' +
    impFirmas_([{ t: 'Trabajador', cargoTxt: 'Firma, aclaración y sello (si corresponde)' }, { t: 'Recepción Higiene y Seguridad', cargoTxt: 'Hora de recepción' }]);
  return sol + radfSalto_() + anexo;
}
// F-RAD-02 · Solicitud de baja
function radfBaja_(cod, o) {
  const tb = o.TIPO_BAJA || o.ESTADO_DOSIMETRO || '', mot = radfV_(o.MOTIVO_TIPO) || (/fin/i.test(tb) ? RADF.MOTIVOS_BAJA[0] : /pedido/i.test(tb) ? 'A pedido del trabajador' : '');
  return radfTrabajador_(cod, o) + impH2_('Dosímetro') + impDatos_([['N.º de dosímetro', radfV_(o.DOSIMETRO_NRO)], ['Tipo de dosímetro', radfV_(o.TIPO_DOSIMETRO)], ['Sector donde se expone', radfV_(o.SECTOR_EXPOSICION)]]) +
    impH2_('Baja que se solicita') + '<p class="nota" style="margin:4px 0 2px">Motivo:</p>' + radfOps_(RADF.MOTIVOS_BAJA, mot) +
    impDatos_([['Detalle del motivo', radfV_(o.MOTIVO_BAJA)], ['Fecha a partir de la cual se solicita la baja', radfF_(o.BAJA_DOSIMETRO)]]) +
    '<p class="nota" style="margin:6px 0 2px">¿Entrega el dosímetro a Higiene y Seguridad con esta solicitud?</p>' + radfOps_(['Sí', 'No'], radfV_(o.ENTREGA)) +
    '<p class="nota">Si no lo entrega porque se perdió, se extravió, se lo robaron o está dañado, completar además el F-RAD-03 «Informe de novedad de dosímetro».</p>' + radfFirmas_();
}
// F-RAD-03 · Informe de novedad de dosímetro
function radfNovedad_(cod, o) {
  return radfTrabajador_(cod, o) + impH2_('Dosímetro') + impDatos_([['N.º de dosímetro', radfV_(o.DOSIMETRO_NRO)], ['Tipo de dosímetro', radfV_(o.TIPO_DOSIMETRO)], ['Sector donde se expone', radfV_(o.SECTOR_EXPOSICION)]]) +
    impH2_('Novedad') + '<p class="nota" style="margin:4px 0 2px">Qué pasó:</p>' + radfOps_(RADF.NOVEDADES, radfV_(o.NOVEDAD)) +
    impDatos_([['Fecha (y hora aproximada) en que cree que ocurrió', radfF_(o.FECHA_HECHO) + (o.HORA_HECHO ? ' ' + radfV_(o.HORA_HECHO) : '')], ['Dónde cree que ocurrió', radfV_(o.LUGAR_HECHO)],
      ['Fecha en que completa este formulario', radfF_(o.FECHA_FORM)]]) +
    '<p class="nota" style="margin:4px 0 2px">Descripción: cómo y cuándo se dio cuenta, qué hizo.</p>' + (o.DESCRIPCION ? '<div class="val" style="margin-bottom:4px">' + impE_(o.DESCRIPCION) + '</div>' : impLinea_('', 3)) +
    '<p class="nota" style="margin:4px 0 2px">En caso de robo, ¿hizo la denuncia policial? ' + ['Sí', 'No', 'No corresponde'].map(x => impCb_(radfV_(o.DENUNCIA) === x, x)).join(' ') + '</p>' + impDatos_([['N.º de denuncia y dependencia', radfV_(o.DENUNCIA_NRO)]]) +
    '<p class="nota">Este formulario se entrega de inmediato a Higiene y Seguridad. Higiene y Seguridad informa la novedad al servicio de dosimetría y gestiona el reemplazo del dosímetro.</p>' + radfFirmas_();
}

// Hoja completa: dos copias (original para Personal, duplicado para HyS)
function radfHoja_(cod, b, datos) {
  const tipo = RADF.FORMS[b.form] ? b.form : '', F = RADF.FORMS[tipo]; if (!F) return { ok: false, mensaje: 'Elegí el formulario.' };
  const o = radfDatos_(cod, Object.assign({}, datos || {}, b.persona && b.persona !== '*' ? { ID: b.persona } : {}));
  const cuerpo = tipo === 'alta' ? radfAlta_(cod, o) : tipo === 'baja' ? radfBaja_(cod, o) : radfNovedad_(cod, o);
  const lleno = !!(o.APELLIDO_Y_NOMBRE || o.DNI);
  const css = '<style>.copia{border:1pt solid var(--c1);color:var(--c1);text-align:center;font-size:8pt;letter-spacing:.4pt;padding:2px;margin:0 0 6px}.salto{break-before:page;page-break-before:always}' +
    'ol.comp{margin:4px 0 0 0;padding-left:24px}table.datos th,table.datos td{padding-top:1px;padding-bottom:1px}table.datos td .linea{height:4.6mm}h2{margin-top:7px}ol.comp li{margin:0 0 3px;line-height:1.35}</style>';
  const html = RADF.COPIAS.map((c, i) => radfCopia_(c, i) + cuerpo).join('');
  return impDoc_({ cod: cod, tema: 'rad_form', titulo: F.cod + ' · ' + F.t, subtitulo: lleno ? radfV_(o.APELLIDO_Y_NOMBRE) : 'para completar', codigo: F.cod + ' · v0', etiqueta: lleno ? 'Formulario con datos' : 'Formulario en blanco',
    normas: RADF.NORMAS, instrucciones: '<b>Se completa en dos copias</b> (original para el Servicio de Personal y duplicado para Higiene y Seguridad), con las firmas del trabajador y del jefe del servicio. Higiene y Seguridad registra la recepción y adjunta la foto o el PDF del formulario firmado en el sistema.',
    cuerpo: css + html, firmasN: 3 });
}
// Opciones para «Hojas para imprimir»: formulario y persona (en blanco o con los datos de alguien cargado)
function radfOpciones_(cod) {
  if (!PropertiesService.getScriptProperties().getProperty(RAD.P_LIBRO)) return null;
  const P = radLeer_('PERSONAL_EXPUESTO', RAD.H_PER).filter(p => limpio_(p.ESTABLECIMIENTO) === cod).sort((a, b) => String(a.APELLIDO_Y_NOMBRE).localeCompare(String(b.APELLIDO_Y_NOMBRE), 'es'));
  return { campos: [{ k: 'form', t: 'Formulario', ops: Object.keys(RADF.FORMS).map(k => [k, RADF.FORMS[k].cod + ' · ' + RADF.FORMS[k].t]) },
    { k: 'persona', t: 'Trabajador', ops: [['*', 'En blanco (para completar a mano)']].concat(P.map(p => [p.ID, p.APELLIDO_Y_NOMBRE + (p.DOSIMETRO_NRO ? ' · ' + p.DOSIMETRO_NRO : '') + (/^Baja/.test(p.ESTADO_DOSIMETRO) ? ' (de baja)' : '')])) }],
    nota: 'Con un trabajador elegido, el formulario sale con sus datos ya cargados. Se imprimen dos copias: original para Personal y duplicado para Higiene y Seguridad.', hechas: [] };
}

// ------------------------------------------------------------------ CORREO A MKS (25/10/2026, pedido de Belén)
// Arma un BORRADOR en Gmail (no lo envía: se revisa y se envía desde Gmail) con texto formal y el formulario en PDF adjunto
// (y, si ya está cargado, el formulario firmado). Sale de belenpellegrini.hys@gmail.com si Gmail tiene ese «Enviar como».
const RADM = { REMITENTE: 'belenpellegrini.hys@gmail.com', NOMBRE: 'Belén Pellegrini · Higiene y Seguridad Laboral', P_PARA: 'RAD_MKS_CORREO', CC_FIJO: 'personal_hzt@hotmail.com' };   // altas, bajas y novedades siempre con copia a Personal (dato de Belén, 25/10/2026)
function radMksCorreo_() { return PropertiesService.getScriptProperties().getProperty(RADM.P_PARA) || 'dosimetria@mksargentina.com'; }   // dirección de MKS para altas, bajas y novedades (dato de Belén, 25/10/2026)
function radMailMks_(x, quien) {
  const cod = limpio_(x.cod), tipo = x.form, F = RADF.FORMS[tipo]; if (!cod || !F) return { ok: false, mensaje: 'Elegí el formulario.' };
  const para = limpio_(x.para || radMksCorreo_()); if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(para)) return { ok: false, mensaje: 'Escribí el correo de MKS.' };
  const persona = x.persona && x.persona !== '*' ? x.persona : '';
  const o = radfDatos_(cod, Object.assign({}, x.datos || {}, persona ? { ID: persona } : {}));
  if (!o.APELLIDO_Y_NOMBRE || !o.DNI) return { ok: false, mensaje: 'Faltan el apellido y nombre o el DNI del trabajador.' };
  const H = radfHoja_(cod, { form: tipo, persona: persona || '*' }, x.datos || {}); if (!H.ok) return H;
  const nom = radfV_(o.APELLIDO_Y_NOMBRE), est = impNombreEst_(cod), archivoNom = F.cod + ' ' + nom.replace(/[\\/:*?"<>|]/g, '') + '.pdf';
  const pdf = HtmlService.createHtmlOutput(H.html).getBlob().getAs('application/pdf').setName(archivoNom);
  if (x.prueba) return { ok: true, prueba: true, pdf: Utilities.base64Encode(pdf.getBytes()), asunto: radMksAsunto_(tipo, o, est), texto: radMksTexto_(tipo, o, est) };
  const adj = [pdf]; let firmado = '';
  const fid = u => (/[-\w]{25,}/.exec(String(u || '')) || [])[0];
  try { const url = tipo === 'alta' ? o.FORM_ALTA : tipo === 'baja' ? o.FORM_BAJA : (x.evento ? (radLeer_('EVENTOS', RAD.H_EVE).find(e => e.ID === x.evento) || {}).FORM_NOVEDAD : '');
    if (fid(url)) { const f = DriveApp.getFileById(fid(url)); adj.push(f.getBlob().setName(F.cod + ' firmado ' + nom + (/\.\w+$/.exec(f.getName()) || [''])[0])); firmado = f.getName(); } } catch (e) {}
  const asunto = radMksAsunto_(tipo, o, est), html = radMksTexto_(tipo, o, est, !!firmado);
  let desde = ''; try { const al = GmailApp.getAliases().map(a => a.toLowerCase()); if (al.indexOf(RADM.REMITENTE) >= 0 || Session.getEffectiveUser().getEmail().toLowerCase() === RADM.REMITENTE) desde = RADM.REMITENTE; } catch (e) {}
  const op = { htmlBody: html, name: RADM.NOMBRE, attachments: adj }; if (desde) op.from = desde; else op.replyTo = RADM.REMITENTE;
  op.cc = [RADM.CC_FIJO].concat(String(x.cc || '').split(/[,;\s]+/).filter(c => /@/.test(c) && c.toLowerCase() !== RADM.CC_FIJO)).join(', ');
  const texto = html.replace(/<br\s*\/?>/g, '\n').replace(/<\/(p|li|tr)>/g, '\n').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/\n{3,}/g, '\n\n');
  const dr = GmailApp.createDraft(para, asunto, texto, op);
  if (x.para) PropertiesService.getScriptProperties().setProperty(RADM.P_PARA, para);   // se recuerda para la próxima
  if (persona) try { const p = radLeer_('PERSONAL_EXPUESTO', RAD.H_PER).find(r => r.ID === persona); if (p) radMov_(p, 'Comunicación a MKS', 'Borrador de correo a ' + para + ': ' + asunto, '', quien); } catch (e) {}
  const yo = Session.getEffectiveUser().getEmail();
  return { ok: true, asunto: asunto, para: para, cc: op.cc, desde: desde || yo, firmado: firmado, url: 'https://mail.google.com/mail/?authuser=' + encodeURIComponent(yo) + '#drafts?compose=' + dr.getMessage().getId(),
    aviso: desde ? '' : 'Gmail no tiene configurado «Enviar como» ' + RADM.REMITENTE + ': el borrador sale de ' + yo + ', con respuesta a ' + RADM.REMITENTE + '.' };
}
function radMksAsunto_(tipo, o, est) {
  return (tipo === 'alta' ? 'Solicitud de alta de dosímetro personal' : tipo === 'baja' ? 'Solicitud de baja de dosímetro personal' : 'Informe de novedad de dosímetro personal' + (o.NOVEDAD ? ' (' + String(o.NOVEDAD).toLowerCase() + ')' : '')) +
    ' · ' + radfV_(o.APELLIDO_Y_NOMBRE) + ' · DNI ' + radfV_(o.DNI) + (tipo !== 'alta' && o.DOSIMETRO_NRO ? ' · Dosímetro ' + radfV_(o.DOSIMETRO_NRO) : '') + ' · ' + est;
}
function radMksTexto_(tipo, o, est, firmado) {
  const e = impE_, v = k => radfV_(o[k]), f = k => radfF_(o[k]);
  const fila = (l, val) => val ? '<tr><td style="padding:2px 12px 2px 0;color:#555">' + e(l) + '</td><td style="padding:2px 0"><b>' + e(val) + '</b></td></tr>' : '';
  const trab = '<table style="border-collapse:collapse;margin:8px 0 12px">' + fila('Apellido y nombres', v('APELLIDO_Y_NOMBRE')) + fila('DNI', v('DNI')) + fila('CUIL', v('CUIL')) +
    fila('Establecimiento', est + (o.SITIO ? ' · ' + v('SITIO') : '')) + fila('Servicio(s)', v('SERVICIOS') || v('SERVICIO')) + fila('Función', v('FUNCION')) + fila('Sector donde se expone', v('SECTOR_EXPOSICION')) +
    (tipo === 'alta' ? fila('Tipo de dosímetro solicitado', v('TIPO_DOSIMETRO') || 'Cuerpo entero') + fila('Fecha de inicio de la exposición', f('INICIO_EXPOSICION'))
      : fila('N.º de dosímetro', v('DOSIMETRO_NRO')) + fila('Tipo de dosímetro', v('TIPO_DOSIMETRO'))) +
    (tipo === 'baja' ? fila('Baja a partir del', f('BAJA_DOSIMETRO')) + fila('Motivo', [v('MOTIVO_TIPO'), v('MOTIVO_BAJA')].filter(Boolean).join(' · ')) + fila('Entrega del dosímetro', o.ENTREGA === 'Sí' ? 'Se devuelve el dosímetro' : o.ENTREGA === 'No' ? 'No se devuelve el dosímetro' : '') : '') +
    (tipo === 'novedad' ? fila('Novedad', v('NOVEDAD')) + fila('Fecha en que se estima que ocurrió', f('FECHA_HECHO') + (o.HORA_HECHO ? ' ' + v('HORA_HECHO') : '')) + fila('Lugar', v('LUGAR_HECHO')) + fila('Descripción', v('DESCRIPCION')) +
      (o.DENUNCIA ? fila('Denuncia policial', v('DENUNCIA') + (o.DENUNCIA_NRO ? ' · ' + v('DENUNCIA_NRO') : '')) : '') : '') + '</table>';
  const intro = tipo === 'alta' ? 'el alta en el servicio de dosimetría personal del siguiente trabajador expuesto a radiaciones ionizantes:'
    : tipo === 'baja' ? 'la baja del dosímetro personal asignado al siguiente trabajador:' : 'la siguiente novedad del dosímetro personal asignado al trabajador que se detalla:';
  const pedido = tipo === 'alta' ? 'Se solicita asignar el dosímetro e informar su número a este Servicio, junto con la fecha a partir de la cual queda habilitado.'
    : tipo === 'baja' ? 'Se solicita confirmar la baja y, si corresponde, indicar el procedimiento para la devolución del dosímetro y la emisión de la última lectura.'
    : 'Se solicita registrar la novedad, indicar si corresponde una lectura o estimación de dosis para el período y gestionar el reemplazo del dosímetro.';
  return '<div style="font-family:Arial,sans-serif;font-size:14px;color:#222;line-height:1.5">' +
    '<p>Estimados:</p><p>El Servicio de Higiene y Seguridad Laboral del ' + e(est) + ' ' + (tipo === 'novedad' ? 'informa' : 'solicita') + ' ' + intro + '</p>' + trab +
    '<p>' + e(pedido) + '</p><p>Se adjunta el formulario ' + e(RADF.FORMS[tipo].cod) + ' «' + e(RADF.FORMS[tipo].t) + '»' + (firmado ? ', junto con la copia firmada' : '') + '.</p>' +
    '<p style="color:#555;font-size:12px">' + (tipo === 'novedad' ? 'La comunicación' : 'La solicitud') + ' se realiza en el marco de la vigilancia dosimétrica individual del personal expuesto a radiaciones ionizantes (Ley 17.557 y Dto. 6320/68) y de las competencias del Servicio de Higiene y Seguridad Laboral (Ley 19.587, Dto. 351/79 y Res. SRT 905/2015).</p>' +
    '<p>Quedo a disposición por cualquier consulta.</p><p>Saludos cordiales,</p><p>Belén Pellegrini<br>Servicio de Higiene y Seguridad Laboral<br>Hospital Zonal Trelew «Dr. Adolfo Margara» · Hospital María Humphreys<br>' + RADM.REMITENTE + '</p></div>';
}
