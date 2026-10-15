/**
 * SISTEMA HyS · 9 · CAPACITACIONES › CARGA DE LA SECRETARÍA EN «MI ESTABLECIMIENTO» (14.72 · 15/10/2026)
 * Reemplaza al panel de carga viejo (capacitaciones/carga.html, con clave propia). Ahora se entra a Mi establecimiento con DNI y
 * clave personal y el módulo «Capacitaciones» marcado en BASE COMÚN › ACCESOS. Todo se guarda en el libro único
 * «CAPACITACIONES · Sistema HyS» (CG.LIBRO) y queda en su hoja _HISTORIAL con el nombre de quien cargó:
 *   · Correo y teléfono de una persona: se aplican directo (gana el más nuevo).
 *   · Servicio, función, establecimiento, vínculo o empresa: quedan PROPUESTOS (hoja CAMBIOS_PROPUESTOS) hasta que HyS los
 *     aprueba en el portal (9 · Capacitaciones › Para validar).
 *   · Alta de una persona nueva: entra con REVISAR = Sí y un aviso en _AVISOS, para que HyS la valide.
 *   · Jefaturas y servicios: responsable, cargo, DNI, correos, interno y ubicación (no cambia el nombre ni los servicios que abarca).
 *   · Lista de mails: se pega, se revisa y se carga lo marcado (CapGestion.gs).
 * Entrada: Codigo.gs › doPost, acciones q_… (Accesos.gs › accPermite_: módulo «Capacitaciones»).
 */
const QC = {
  PROPUESTAS: 'CAMBIOS_PROPUESTOS',
  H_PROP: ['ID', 'FECHA', 'DNI', 'PERSONA', 'CAMPO', 'VALOR_ACTUAL', 'VALOR_PROPUESTO', 'MOTIVO', 'ESTADO', 'RESUELTO', 'RESUELTO_POR', 'CARGADO_POR'],
  PROPONIBLES: ['SERVICIO', 'FUNCION', 'PROFESION', 'INSTITUCION', 'ESTABLECIMIENTO', 'VINCULO', 'EMPRESA', 'APELLIDOS', 'NOMBRES'],
  JEF_EDITABLES: ['RESPONSABLE', 'CARGO', 'DNI_RESPONSABLE', 'OTROS_DNI', 'CORREO_RESPONSABLE', 'CORREO_SERVICIO', 'TEL_INTERNO', 'UBICACION']
};
const qQuien_ = x => 'Secretaría · ' + (String((x && x.quien) || '').trim() || 's/d');

// Hoja del libro con el formato de la casa (título, explicación, encabezado en la fila 5). Si no existe, se crea.
function qHojaCrear_(nombre, titulo, explicacion, H) {
  const ss = cgLibro_(); let sh = ss.getSheetByName(nombre);
  if (!sh) {
    sh = ss.insertSheet(nombre);
    sh.getRange(1, 1).setValue(titulo).setFontSize(14).setFontWeight('bold').setFontColor('#0D313F');
    sh.getRange(2, 1).setValue(explicacion).setFontColor('#4F616B').setFontStyle('italic');
    sh.getRange(5, 1, 1, H.length).setValues([H]).setFontWeight('bold').setFontColor('#FFFFFF').setBackground('#0D313F');
    sh.setFrozenRows(5);
  }
  return sh;
}
const qProp_ = () => qHojaCrear_(QC.PROPUESTAS, 'CAMBIOS_PROPUESTOS · Lo que propone la secretaría', 'Cambios de datos laborales de una persona cargados desde Mi establecimiento. Quedan Pendiente hasta que HyS los aprueba o rechaza (portal › 9 · Capacitaciones › Para validar).', QC.H_PROP);
function qAviso_(tipo, dni, detalle) {
  try { const T = cgHoja_('_AVISOS'), fila = { ID_AVISO: 'AV-' + Utilities.formatDate(new Date(), TZ, 'yyyyMMdd-HHmmss') + '-' + Math.floor(Math.random() * 90 + 10), FECHA: new Date(), TIPO: tipo, HOJA: 'PERSONAS', REFERENCIA: dni, DETALLE: detalle, ESTADO: 'Pendiente' };
    T.sh.getRange(Math.max(T.sh.getLastRow(), 5) + 1, 1, 1, T.H.length).setValues([T.H.map(h => fila[h] == null ? '' : fila[h])]); } catch (e) { Logger.log('Aviso: ' + e); }
}

function qOpciones_() {
  const P = cgHoja_('PERSONAS'), L = cgListas_(P);
  return { ok: true, listas: Object.assign(L, { vinculos: ['Planta', 'Contrato', 'Tercerizado', 'Cooperativa', 'Residente', 'Estudiante'].concat(L.vinculos.filter(v => !/^(planta|contrato|tercerizad|cooperativa|residente|estudiante)/i.test(v))) }) };
}

// Correo y teléfono: directo
function qContacto_(x) {
  return conLock_(() => {
    const dni = cgDni_(x.dni), P = cgHoja_('PERSONAS'), p = P.filas.find(z => cgDni_(z.o.DNI) === dni);
    if (!p) return { ok: false, mensaje: 'No encontré ese DNI.' };
    const correo = String(x.correo || '').trim().toLowerCase(), tel = String(x.tel || '').replace(/\D/g, '');
    if (correo && !cgMail_(correo)) return { ok: false, mensaje: 'El correo no parece válido.' };
    const ahora = new Date(), hist = [], quien = qQuien_(x);
    [['CORREO', correo], ['TELEFONO', tel]].forEach(([k, v]) => { if (!v) return; const antes = cgTxt_(p.o[k]); if (antes.toLowerCase() === v.toLowerCase()) return;
      cgSet_(P, p.fila, k, v); hist.push({ FECHA: ahora, QUIEN: quien, HOJA: 'PERSONAS', ID: dni, CAMPO: k, ANTES: antes, DESPUES: v, MOTIVO: 'Contacto actualizado desde Mi establecimiento' }); });
    if (hist.length) { cgSet_(P, p.fila, 'ULTIMA_ACTUALIZACION', Utilities.formatDate(ahora, TZ, 'dd/MM/yyyy')); cgHistorial_(hist); }
    return { ok: true, cambios: hist.length, mensaje: hist.length ? 'Datos de contacto guardados.' : 'No había cambios.' };
  });
}

// Datos laborales: quedan propuestos
function qProponer_(x) {
  return conLock_(() => {
    const dni = cgDni_(x.dni), P = cgHoja_('PERSONAS'), p = P.filas.find(z => cgDni_(z.o.DNI) === dni);
    if (!p) return { ok: false, mensaje: 'No encontré ese DNI.' };
    const sh = qProp_(), c = x.campos || {}, ahora = new Date(), quien = qQuien_(x), motivo = String(x.motivo || '').trim(), filas = [];
    QC.PROPONIBLES.forEach(k => { if (c[k] == null) return; const v = String(c[k]).replace(/\s+/g, ' ').trim(), act = cgTxt_(p.o[k]); if (!v || v === act) return;
      filas.push(['PRO-' + Utilities.formatDate(ahora, TZ, 'yyyyMMdd-HHmmss') + '-' + (filas.length + 1), ahora, dni, cgTxt_(p.o.APELLIDOS) + ', ' + cgTxt_(p.o.NOMBRES), k, act, v, motivo, 'Pendiente', '', '', quien]); });
    if (!filas.length) return { ok: false, mensaje: 'No hay cambios para proponer.' };
    sh.getRange(Math.max(sh.getLastRow(), 5) + 1, 1, filas.length, QC.H_PROP.length).setValues(filas);
    return { ok: true, n: filas.length, mensaje: filas.length + ' cambio(s) propuesto(s). Quedan pendientes hasta que Higiene y Seguridad los apruebe.' };
  });
}

// Alta de una persona nueva (REVISAR = Sí + aviso)
function qAlta_(x) {
  const txt = v => String(v == null ? '' : v).replace(/\s+/g, ' ').trim(), tit = s => txt(s).toLowerCase().replace(/(^|[\s'-])(\S)/g, (m, a, b) => a + b.toUpperCase());
  let dni = String(x.dni || '').replace(/\D/g, ''); if (dni.length === 11) dni = dni.slice(2, 10); dni = dni.replace(/^0+/, '');
  if (dni.length < 6 || dni.length > 9) return { ok: false, mensaje: 'Revisá el DNI (o el CUIL).' };
  if (!txt(x.apellidos) || !txt(x.nombres)) return { ok: false, mensaje: 'Faltan el apellido o el nombre.' };
  if (!txt(x.establecimiento) && !txt(x.institucion)) return { ok: false, mensaje: 'Elegí dónde trabaja.' };
  const correo = txt(x.correo).toLowerCase(); if (correo && !cgMail_(correo)) return { ok: false, mensaje: 'El correo no parece válido.' };
  return conLock_(() => {
    const P = cgHoja_('PERSONAS'), ya = P.filas.find(z => cgDni_(z.o.DNI) === dni);
    if (ya) return { ok: false, mensaje: 'Ese DNI ya está cargado: ' + cgTxt_(ya.o.APELLIDOS) + ', ' + cgTxt_(ya.o.NOMBRES) + '. Buscalo en «Personas» para actualizar sus datos.' };
    const hoy = Utilities.formatDate(new Date(), TZ, 'dd/MM/yyyy'), quien = qQuien_(x), est = txt(x.establecimiento), terc = /tercer/i.test(txt(x.vinculo)) || !!txt(x.empresa);
    const inst = txt(x.institucion) || (est === 'HZT' ? 'Hospital Zonal Trelew' : est === 'HMH' ? 'Hospital María Humphreys' : est);
    const o = { DNI: dni, PAIS_DOCUMENTO: 'Argentina', APELLIDOS: tit(x.apellidos), NOMBRES: tit(x.nombres), PUBLICO: terc ? 'Profesionales externos' : /^(HZT|HMH)$/.test(est) ? 'Red Trelew' : 's/d',
      CORREO: correo || 's/d', TELEFONO: String(x.tel || '').replace(/\D/g, '') || 's/d', CIUDAD: txt(x.ciudad) || 'Trelew', PROVINCIA: 'Chubut', PAIS: 'Argentina',
      PROFESION: [txt(x.funcion), txt(x.servicio)].filter(String).join(' · ') || 's/d', INSTITUCION: inst || 's/d', ESTABLECIMIENTO: est || 's/d', SERVICIO: txt(x.servicio) || 's/d', FUNCION: txt(x.funcion) || 's/d',
      VINCULO: txt(x.vinculo) || 's/d', EMPRESA: txt(x.empresa), CARRERA: '', ORIGEN_DE_DATOS: 'Alta por ' + quien + ' ' + hoy, ULTIMA_ACTUALIZACION: hoy, REVISAR: 'Sí' };
    P.sh.getRange(Math.max(P.sh.getLastRow(), 5) + 1, 1, 1, P.H.length).setValues([P.H.map(h => o[h] == null ? '' : o[h])]);
    cgHistorial_([{ FECHA: new Date(), QUIEN: quien, HOJA: 'PERSONAS', ID: dni, CAMPO: 'ALTA', ANTES: '', DESPUES: o.APELLIDOS + ', ' + o.NOMBRES + ' · ' + [o.FUNCION, o.SERVICIO, o.ESTABLECIMIENTO, o.EMPRESA].filter(v => v && v !== 's/d').join(' · '), MOTIVO: 'Alta desde Mi establecimiento' }]);
    qAviso_('Alta nueva (secretaría)', dni, o.APELLIDOS + ', ' + o.NOMBRES + ' · ' + [o.FUNCION, o.SERVICIO, o.INSTITUCION, o.EMPRESA].filter(v => v && v !== 's/d').join(' · '));
    return { ok: true, mensaje: 'Persona agregada: ' + o.APELLIDOS + ', ' + o.NOMBRES + '. Higiene y Seguridad la va a revisar.' };
  });
}

// Jefaturas y servicios
function qJefaturas_() {
  const J = cgHoja_('JEFATURAS');
  return { ok: true, lista: J.filas.map(j => { const o = { fila: j.fila, JEFATURA: cgTxt_(j.o.JEFATURA), SERVICIOS: cgTxt_(j.o.SERVICIOS), ESTABLECIMIENTO: cgTxt_(j.o.ESTABLECIMIENTO), ACTUALIZADO: cgTxt_(j.o.ACTUALIZADO) };
    QC.JEF_EDITABLES.forEach(k => o[k] = cgVacio_(j.o[k]) ? '' : cgTxt_(j.o[k])); return o; }).sort((a, b) => a.JEFATURA.localeCompare(b.JEFATURA)) };
}
function qJefaturaGuardar_(x) {
  return conLock_(() => {
    const J = cgHoja_('JEFATURAS'), j = J.filas.find(z => cgNorm_(z.o.JEFATURA) === cgNorm_(x.jefatura));
    if (!j) return { ok: false, mensaje: 'No encontré la jefatura.' };
    const d = x.datos || {}, ahora = new Date(), quien = qQuien_(x), hist = [];
    for (const k of QC.JEF_EDITABLES) {
      if (d[k] == null) continue; let v = String(d[k]).replace(/\s+/g, ' ').trim();
      if (/^CORREO/.test(k) && v) { v = v.toLowerCase(); if (!cgMail_(v)) return { ok: false, mensaje: 'Revisá el correo: «' + v + '».' }; }
      if (k === 'DNI_RESPONSABLE') v = v.replace(/\D/g, '');
      const antes = cgVacio_(j.o[k]) ? '' : cgTxt_(j.o[k]); if (v === antes) continue;
      cgSet_(J, j.fila, k, v || 's/d'); hist.push({ FECHA: ahora, QUIEN: quien, HOJA: 'JEFATURAS', ID: cgTxt_(j.o.JEFATURA), CAMPO: k, ANTES: antes, DESPUES: v, MOTIVO: 'Contacto de la jefatura desde Mi establecimiento' });
    }
    if (hist.length) { cgSet_(J, j.fila, 'ACTUALIZADO', Utilities.formatDate(ahora, TZ, 'dd/MM/yyyy HH:mm') + ' · ' + quien); cgHistorial_(hist); }
    return { ok: true, cambios: hist.length, mensaje: hist.length ? 'Datos de la jefatura guardados.' : 'No había cambios.' };
  });
}

function qRed_(d, acc) {
  const x = Object.assign({}, d.datos || {}); x.quien = (acc && acc.nombre) || x.quien || '';
  try {
    switch (String(d.accion)) {
      case 'q_buscar': return cgBuscar_(x);
      case 'q_opciones': return qOpciones_();
      case 'q_contacto': return qContacto_(x);
      case 'q_proponer': return qProponer_(x);
      case 'q_alta': return qAlta_(x);
      case 'q_jefaturas': return qJefaturas_();
      case 'q_jefatura_guardar': return qJefaturaGuardar_(x);
      case 'q_mails_previa': return cgMailsPrevia_(x);
      case 'q_mails_aplicar': return cgMailsAplicar_(Object.assign({}, x, { quien: qQuien_(x), motivo: 'Lista de mails desde Mi establecimiento' }));
    }
    return { ok: false, mensaje: 'Acción desconocida.' };
  } catch (e) { Logger.log('qRed_ ' + d.accion + ': ' + e); return { ok: false, mensaje: 'No se pudo completar: ' + e.message }; }
}
function probarCapCarga() { Logger.log(JSON.stringify(qOpciones_().listas).slice(0, 400)); Logger.log(qJefaturas_().lista.length + ' jefaturas'); }
