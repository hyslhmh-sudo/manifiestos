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
    impH2_('Para completar por Higiene y Seguridad') + impDatos_([['N.º de dosímetro asignado', radfV_(o.DOSIMETRO_NRO)], ['Servicio de dosimetría', radfV_(o.PROVEEDOR) || 'MKS'], ['Fecha de alta del dosímetro', radfF_(o.ALTA_DOSIMETRO)]]) +
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
