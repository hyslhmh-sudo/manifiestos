/**
 * SISTEMA HyS · MODELOS PARA COMPLETAR Y BANDEJA DE ENTRADA
 * 1. El sistema genera el modelo (hoja de cálculo prellenada) → se manda a quien lo completa.
 * 2. Vuelve completo: se sube desde el portal (Documental › Bandeja de entrada) o se deja en Drive › 07 BANDEJA DE ENTRADA.
 * 3. El sistema lo lee, valida y arma una PROPUESTA de cambios. Nada se aplica sin aprobación.
 * 4. Se aprueba desde el portal o desde la hoja BANDEJA del libro general (columna APROBAR = Sí › menú Sistema HyS › Bandeja › Aplicar lo aprobado).
 * Cada modelo lleva una hoja oculta «_SISTEMA» con su tipo, versión, establecimiento y referencia: así se reconoce solo.
 * Tipos preparados para sumar más adelante: RAR + NTE (Res. SRT 37/2010 y 81/2019) y RGRL (Res. SRT 463/09).
 */

const BJ = { SIS: '16AIJZcmxG9EBM3-D-J4vRtvruHK9DVrA', MODELOS: '06 MODELOS PARA COMPLETAR', BANDEJA: '07 BANDEJA DE ENTRADA', VERSION: '1' };
const BJ_H = ['ID', 'FECHA', 'TIPO', 'ESTABLECIMIENTO', 'REFERENCIA', 'ARCHIVO', 'ORIGEN', 'ESTADO', 'RESUMEN', 'ERRORES', 'APROBAR', 'CAMBIOS', 'APLICADO'];

// ------------------------------------------------------------------ Tipos de modelo
const BJ_TIPOS = {
  RESPUESTA_INFORME: { titulo: 'Respuesta de la Dirección al informe', para: 'Dirección del establecimiento', ref: 'informe',
    ayuda: 'Para cada recomendación, completá el responsable (nombre y función) y la fecha prevista. Si querés, agregá observaciones. No cambies la columna N.º.',
    cols: [['N_REC', 'N.º', 0], ['RECOMENDACION', 'Recomendación', 0], ['LUGAR', 'Lugar', 0], ['PRIORIDAD', 'Prioridad', 0], ['PLAZO_TECNICO', 'Plazo técnico', 0], ['RESPONSABLE_DIRECCION', 'Responsable (nombre y función)', 1], ['FECHA_PREVISTA', 'Fecha prevista (dd/mm/aaaa)', 1], ['OBSERVACIONES', 'Observaciones', 1]] },
  CONTACTOS: { titulo: 'Contactos y referentes del establecimiento', para: 'Dirección o referente',
    ayuda: 'Corregí o completá los datos de cada fila. Para agregar una persona, usá una fila vacía al final. En «Referente de residuos» hay una fila por cada lugar: completá quién es en cada uno.',
    cols: [['TIPO', 'Tipo', 1], ['UNIDAD', 'Unidad o lugar', 1], ['CARGO', 'Cargo o función', 1], ['RESPONSABLE', 'Nombre y apellido', 1], ['DNI', 'DNI', 1], ['TELEFONO_FIJO', 'Teléfono fijo', 1], ['INTERNO', 'Interno', 1], ['CELULAR', 'Celular', 1], ['CORREO_INSTITUCIONAL', 'Correo institucional', 1], ['CORREO_PERSONAL', 'Correo personal', 1], ['HORARIO', 'Horario', 1], ['OBSERVACIONES', 'Observaciones', 1]] },
  RED_HYS: { titulo: 'Profesionales, técnicos y referentes de Higiene y Seguridad', para: 'Profesionales y técnicos de HyS',
    ayuda: 'Una fila por persona. Corregí lo que esté mal y completá lo que falta. Para agregar a alguien, usá una fila vacía.',
    cols: [['APELLIDO_Y_NOMBRE', 'Apellido y nombre', 1], ['DNI', 'DNI', 1], ['CUIL', 'CUIL', 1], ['ROL', 'Rol (Profesional · Técnico · Referente)', 1], ['TITULO_O_MATRICULA', 'Título y matrícula', 1], ['CORREO', 'Correo', 1], ['TELEFONO', 'Teléfono', 1], ['HORAS_SEMANALES', 'Horas semanales en el establecimiento', 1], ['DESDE', 'Desde (dd/mm/aaaa)', 1], ['ESTADO', 'Estado (Activo · Baja)', 1], ['OBSERVACIONES', 'Observaciones', 1]] },
  NOMINA_PERSONAL: { titulo: 'Nómina de personal', para: 'Servicio de Personal',
    ayuda: 'Una fila por trabajador del establecimiento (toda la dotación). Completá o corregí CUIL, fecha de ingreso, lugar, servicio o sector, función o puesto y tareas habituales. Si alguien ya no trabaja, poné «Baja» en Estado. Para agregar a alguien, usá una fila vacía al final con su DNI. Estos datos se usan para la Nómina de Trabajadores Expuestos (NTE, Res. SRT 37/2010).',
    cols: [['DNI', 'DNI', 0], ['APELLIDOS', 'Apellidos', 0], ['NOMBRES', 'Nombres', 0], ['CUIL', 'CUIL (sin guiones)', 1], ['FECHA_INGRESO', 'Fecha de ingreso (dd/mm/aaaa)', 1], ['SITIO', 'Lugar (edificio, CAPS o dispositivo)', 1], ['SERVICIO', 'Servicio o sector', 1], ['FUNCION', 'Función o puesto', 1], ['TAREAS', 'Tareas habituales', 1], ['VINCULO', 'Vínculo (planta, contratado, tercerizado…)', 1], ['EMAIL', 'Correo', 1], ['TELEFONO', 'Teléfono', 1], ['ESTADO', 'Estado (Activo · Licencia · Baja)', 1]] },
  DATOS_ESTABLECIMIENTO: { titulo: 'Datos del establecimiento', para: 'Dirección', vertical: true,
    ayuda: 'En la columna «Dato correcto» escribí solo lo que haya que corregir o completar. Dejá vacío lo que está bien.',
    campos: [['DIRECTOR', 'Director/a (nombre y título)'], ['DIRECCION', 'Dirección'], ['LOCALIDAD', 'Localidad'], ['TELEFONOS', 'Teléfonos'], ['EMPRESA_RESIDUOS', 'Empresa de retiro de residuos'], ['SERVICIO_HYS', 'Servicio de Higiene y Seguridad (profesional propio, de la cabecera, referente, ninguno)']] }
};

// ------------------------------------------------------------------ Carpetas y registro
function bjCarpetas_() {
  const sis = DriveApp.getFolderById(BJ.SIS), b = carpeta_(sis, BJ.BANDEJA);
  return { modelos: carpeta_(sis, BJ.MODELOS), bandeja: b, procesados: carpeta_(b, 'Procesados'), errores: carpeta_(b, 'Con errores') };
}
function bjHoja_() {
  const g = SpreadsheetApp.openById(CFG.GENERAL); let sh = g.getSheetByName('BANDEJA');
  if (!sh) {
    sh = g.insertSheet('BANDEJA');
    sh.getRange(1, 1).setValue('Bandeja de entrada').setFontSize(16).setFontWeight('bold').setFontColor('#0D313F');
    sh.getRange(2, 1).setValue('Cada archivo recibido arma una propuesta de cambios. Para aplicarla desde acá: APROBAR = Sí › menú Sistema HyS › Bandeja › Aplicar lo aprobado. También se aprueba desde el portal.').setFontStyle('italic').setFontColor('#4F616B');
    sh.getRange(5, 1, 1, BJ_H.length).setValues([BJ_H]).setFontWeight('bold').setFontColor('#FFFFFF').setBackground('#0D313F');
    sh.setFrozenRows(5); sh.hideColumns(12);
    sh.getRange(6, 11, 1000, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(['Sí', 'No'], true).build());
  }
  return sh;
}
const bjHoy_ = () => Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd');
const bjVal_ = v => v instanceof Date ? Utilities.formatDate(v, TZ, 'dd/MM/yyyy') : String(v == null ? '' : v).trim();
const bjVacio_ = v => !v || /^s\/d$/i.test(String(v).trim());

function bjCambios_(v) { v = String(v || ''); try { return JSON.parse(v.indexOf('ARCHIVO:') === 0 ? DriveApp.getFileById(v.slice(8)).getBlob().getDataAsString() : (v || '[]')); } catch (e) { return []; } }
function bjHojaTrab_(cod) { const sh = SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('BASE_TRABAJADORES_ID')).getSheetByName(cod); if (!sh) throw new Error('No hay hoja de trabajadores para ' + cod + '.'); return sh; }
function bjCabTrab_(sh) { const h = sh.getRange(5, 1, 1, sh.getLastColumn()).getValues()[0].map(String); while (h.length && !h[h.length - 1]) h.pop(); return h; }

// Escribe cambios en la hoja de trabajadores de un establecimiento (crea las columnas que falten). Deja HISTORIAL.
function bjAplicarTrab_(hoja, cambios, origen) {
  const shT = bjHojaTrab_(hoja), H = bjCabTrab_(shT), histT = shT.getParent().getSheetByName('HISTORIAL'), hoy = Utilities.formatDate(new Date(), TZ, 'dd/MM/yyyy'), hist = [], altas = [];
  cambios.forEach(c => { const campos = c.nueva ? Object.keys(c.nueva) : [c.campo]; campos.forEach(k => { if (k && H.indexOf(k) < 0 && /^[A-Z_]+$/.test(k)) { shT.getRange(5, H.length + 1).setValue(k); H.push(k); } }); });
  // La fila se busca por DNI en el momento de aplicar (si se movieron o borraron filas desde la propuesta, no se escribe en la persona equivocada)
  const jd = H.indexOf('DNI'), filaDe = {}; if (jd >= 0 && shT.getLastRow() > 5) shT.getRange(6, jd + 1, shT.getLastRow() - 5, 1).getValues().forEach((r, i) => { const d = String(r[0]).replace(/\D/g, ''); if (d && !filaDe[d]) filaDe[d] = 6 + i; });
  cambios.forEach(c => {
    const dni = (/DNI (\d+)/.exec(c.clave || '') || [])[1] || (c.nueva && c.nueva.DNI) || '';
    if (!c.nueva && dni) { if (!filaDe[dni]) return; c.fila = filaDe[dni]; }   // HISTORIAL: FECHA · DNI · ESTABLECIMIENTO · CAMPO · ANTES · DESPUÉS · ORIGEN
    if (c.nueva) { altas.push(H.map(h => h === 'ESTABLECIMIENTO' ? hoja : h === 'FUENTES' ? origen : h === 'FECHA_ALTA' ? hoy : h === 'ESTADO' ? (c.nueva.ESTADO || 'Activo') : (c.nueva[h] || ''))); hist.push([hoy, dni, hoja, 'ALTA', '', c.despues, origen]); return; }
    const j = H.indexOf(c.campo); if (j < 0 || !c.fila) return; shT.getRange(c.fila, j + 1).setValue(c.despues); hist.push([hoy, dni, hoja, c.campo, c.antes, c.despues, origen]);
  });
  if (altas.length) shT.getRange(Math.max(shT.getLastRow(), 5) + 1, 1, altas.length, H.length).setValues(altas);
  if (histT && hist.length) histT.getRange(histT.getLastRow() + 1, 1, hist.length, 7).setValues(hist);
}

// Guarda una propuesta armada por el sistema (por ejemplo, desde el NTEAR) para revisar en la bandeja
function bjGuardarPropuesta_(tipo, cod, ref, cambios, errores, origen, archivo) {
  const id = 'BJ-' + Utilities.formatDate(new Date(), TZ, 'yyyyMMdd-HHmmss') + '-' + Math.floor(Math.random() * 900 + 100), resumen = cambios.length ? cambios.length + ' cambio(s) propuesto(s)' : 'Sin cambios: los datos ya coinciden.';
  let json = JSON.stringify(cambios); if (json.length > 45000) json = 'ARCHIVO:' + bjCarpetas_().procesados.createFile(id + '.json', json, 'application/json').getId();
  conLock_(() => { const sh = bjHoja_(); sh.getRange(Math.max(sh.getLastRow(), 5) + 1, 1, 1, BJ_H.length).setValues([[id, bjHoy_(), tipo, cod, ref || '', archivo || '', origen, cambios.length ? 'Para revisar' : 'Sin cambios', resumen, String((errores || []).join(' · ')).slice(0, 45000), '', json, '']]); });
  return { id: id, resumen: resumen };
}

// ------------------------------------------------------------------ 1. GENERAR MODELOS
function bjGenerar_(x) {
  const tipo = BJ_TIPOS[x.tipo]; if (!tipo) return { ok: false, mensaje: 'Tipo de modelo desconocido.' };
  const cod = limpio_(x.cod), E = est_(cod); if (!E) return { ok: false, mensaje: 'Elegí el establecimiento.' };
  let filas = [], ref = '';
  if (x.tipo === 'RESPUESTA_INFORME') {
    const P = planAbrir_({ codigo: x.ref }); if (!P.ok) return P; ref = x.ref;
    filas = P.filas.map(o => tipo.cols.map(c => c[0] === 'FECHA_PREVISTA' ? (o.FECHA_PREVISTA ? o.FECHA_PREVISTA.split('-').reverse().join('/') : '') : o[c[0]] || ''));
  } else if (x.tipo === 'CONTACTOS') {
    const sh = pBC_().getSheetByName('CONTACTOS'), H = sh.getRange(5, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
    filas = pTabla_(sh, H.length).filter(r => limpio_(r.v[0]) === cod).map(r => tipo.cols.map(c => bjVal_(r.v[H.indexOf(c[0])])));
    try { persDeBase_(cod).forEach(p => { if (!filas.some(r => r[3] && sinTildes_(r[3]) === sinTildes_(p.nombre))) filas.push(tipo.cols.map(c => ({ TIPO: p.tipo, UNIDAD: p.unidad, CARGO: p.cargo, RESPONSABLE: p.nombre, DNI: p.dni, CELULAR: p.tel, CORREO_PERSONAL: p.email })[c[0]] || '')); }); } catch (e) {}
    const guia = [['Dirección', 'Dirección', 'Director/a'], ['Dirección', 'Dirección Asociada Administrativa', 'Director/a Asociado/a Administrativo/a'], ['Dirección', 'Dirección Asociada Médica', 'Director/a Asociado/a Médico/a'],
      ['Servicio', 'Calidad', 'Responsable de Calidad'], ['Servicio', 'Personal', 'Jefe/a de Personal'], ['Servicio', 'Administración', 'Jefe/a de Administración'], ['Servicio', 'Mantenimiento', 'Jefe/a de Mantenimiento'],
      ['Servicio', 'Servicios Generales', 'Coordinador/a de Servicios Generales'], ['Servicio', 'Enfermería', 'Jefe/a de Enfermería'], ['Servicio', 'Control de Infecciones', 'Referente de Control de Infecciones'],
      ['Servicio', 'Farmacia', 'Jefe/a de Farmacia'], ['Servicio', 'Higiene y Seguridad', 'Profesional o técnico de HyS']];
    const ya = (u, c) => filas.some(f => sinTildes_(f[1]) === sinTildes_(u) || sinTildes_(f[2]) === sinTildes_(c));
    guia.forEach(g => { if (!ya(g[1], g[2])) filas.push(tipo.cols.map(c => c[0] === 'TIPO' ? g[0] : c[0] === 'UNIDAD' ? g[1] : c[0] === 'CARGO' ? g[2] : '')); });
    const sitios = pTabla_(pBC_().getSheetByName('SITIOS'), 13).filter(r => limpio_(r.v[0]) === cod && !/municipal/i.test(limpio_(r.v[9])));
    sitios.forEach(s => { if (!filas.some(f => /referente de residuos/i.test(f[0]) && f[1] === s.v[1])) filas.push(tipo.cols.map(c => c[0] === 'TIPO' ? 'Referente de residuos' : c[0] === 'UNIDAD' ? s.v[1] : c[0] === 'CARGO' ? 'Referente de residuos' : '')); });
  } else if (x.tipo === 'RED_HYS') {
    const sh = pBC_().getSheetByName('RED_HYS'), H = sh.getRange(5, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
    filas = pTabla_(sh, H.length).filter(r => limpio_(r.v[0]) === cod).map(r => tipo.cols.map(c => bjVal_(r.v[H.indexOf(c[0])])));
  } else if (x.tipo === 'NOMINA_PERSONAL') {
    const sh = bjHojaTrab_(cod), H = bjCabTrab_(sh);
    filas = pTabla_(sh, H.length).filter(r => String(r.v[H.indexOf('ESTADO')]) !== 'Baja').map(r => tipo.cols.map(c => H.indexOf(c[0]) >= 0 ? bjVal_(r.v[H.indexOf(c[0])]) : ''))
      .sort((a, b) => String(a[1]).localeCompare(String(b[1])));
  } else if (x.tipo === 'DATOS_ESTABLECIMIENTO') {
    const sh = pBC_().getSheetByName('ESTABLECIMIENTOS'), H = sh.getRange(5, 1, 1, sh.getLastColumn()).getValues()[0].map(String), r = pTabla_(sh, H.length).find(r => limpio_(r.v[0]) === cod);
    filas = tipo.campos.map(c => [c[1], r ? bjVal_(r.v[H.indexOf(c[0])]) : '', '']);
  }
  const ss = SpreadsheetApp.create(tipo.titulo + ' · ' + (E.nombre || cod) + (ref ? ' · ' + ref : '') + ' · ' + Utilities.formatDate(new Date(), TZ, 'dd-MM-yyyy'));
  const sh = ss.getSheets()[0].setName('COMPLETAR'), AZ = '#0D313F', GR = '#EEF2F4';
  sh.getRange(1, 1).setValue(tipo.titulo + ' · ' + (E.nombre || cod)).setFontSize(14).setFontWeight('bold').setFontColor(AZ);
  sh.getRange(2, 1).setValue(tipo.ayuda + ' Las celdas grises no se modifican. Al terminar, devolvé el archivo a Higiene y Seguridad.').setFontStyle('italic').setFontColor('#4F616B');
  if (tipo.vertical) {
    sh.getRange(4, 1, 1, 3).setValues([['Dato', 'Dato que figura hoy', 'Dato correcto (solo si hay que cambiarlo)']]).setFontWeight('bold').setFontColor('#FFFFFF').setBackground(AZ);
    sh.getRange(5, 1, filas.length, 3).setValues(filas); sh.getRange(5, 1, filas.length, 2).setBackground(GR);
    sh.setColumnWidth(1, 260); sh.setColumnWidth(2, 300); sh.setColumnWidth(3, 320);
  } else {
    sh.getRange(4, 1, 1, tipo.cols.length).setValues([tipo.cols.map(c => c[1])]).setFontWeight('bold').setFontColor('#FFFFFF').setBackground(AZ).setWrap(true);
    const extra = x.tipo === 'RESPUESTA_INFORME' ? 0 : x.tipo === 'NOMINA_PERSONAL' ? 30 : 10, n = filas.length + extra;
    if (filas.length) sh.getRange(5, 1, filas.length, tipo.cols.length).setValues(filas);
    tipo.cols.forEach((c, j) => { if (!c[2] && filas.length) sh.getRange(5, j + 1, filas.length, 1).setBackground(GR); sh.setColumnWidth(j + 1, /RECOMENDACION|OBSERV|TAREAS/.test(c[0]) ? 300 : 160); });
    if (n) sh.getRange(5, 1, n, tipo.cols.length).setWrap(true).setVerticalAlignment('top');
  }
  sh.setFrozenRows(4);
  const meta = ss.insertSheet('_SISTEMA'); meta.getRange(1, 1, 4, 2).setValues([['TIPO', x.tipo], ['VERSION', BJ.VERSION], ['ESTABLECIMIENTO', cod], ['REFERENCIA', ref]]); meta.hideSheet();
  DriveApp.getFileById(ss.getId()).moveTo(carpeta_(bjCarpetas_().modelos, E.nombre || cod));
  return { ok: true, url: ss.getUrl(), xlsx: 'https://docs.google.com/spreadsheets/d/' + ss.getId() + '/export?format=xlsx', nombre: ss.getName() };
}

// ------------------------------------------------------------------ 2. LEER (portal: filas ya leídas del Excel · Drive: Google Sheets o Excel)
function bjLeerSheet_(ss) {
  const m = ss.getSheetByName('_SISTEMA'), c = ss.getSheetByName('COMPLETAR'); if (!m || !c) return null;
  const meta = {}; m.getRange(1, 1, 4, 2).getValues().forEach(r => meta[String(r[0])] = String(r[1]));
  const n = c.getLastRow() - 4, w = c.getLastColumn();
  return { meta: meta, filas: n > 0 ? c.getRange(5, 1, n, w).getValues().map(r => r.map(bjVal_)) : [] };
}
function bjSubir_(x) {   // desde el portal
  const meta = x.meta || {}; let url = '';
  try { if (x.dataUrl) { const m = /^data:([^;]*);base64,(.+)$/.exec(x.dataUrl); if (m) url = bjCarpetas_().procesados.createFile(Utilities.newBlob(Utilities.base64Decode(m[2]), m[1] || 'application/octet-stream', x.nombre || 'archivo')).getUrl(); } } catch (e) {}
  return bjProponer_(meta, (x.filas || []).map(r => r.map(bjVal_)), 'Portal', url || x.nombre || '');
}
function bjCarpeta_() {   // revisa la carpeta de Drive
  const C = bjCarpetas_(), it = C.bandeja.getFiles(), hechos = [];
  while (it.hasNext()) {
    const f = it.next(); let ss = null, temp = null;
    try {
      if (f.getMimeType() === MimeType.GOOGLE_SHEETS) ss = SpreadsheetApp.openById(f.getId());
      else if (/spreadsheetml|ms-excel|opendocument\.spreadsheet/.test(f.getMimeType())) {
        const r = UrlFetchApp.fetch('https://www.googleapis.com/drive/v3/files/' + f.getId() + '/copy', { method: 'post', contentType: 'application/json', payload: JSON.stringify({ mimeType: MimeType.GOOGLE_SHEETS, name: 'temp · ' + f.getName() }), headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() } });
        temp = JSON.parse(r.getContentText()).id; ss = SpreadsheetApp.openById(temp);
      }
      const L = ss && bjLeerSheet_(ss);
      if (!L) { f.moveTo(C.errores); hechos.push({ archivo: f.getName(), ok: false, mensaje: 'No es un modelo del sistema.' }); continue; }
      const p = bjProponer_(L.meta, L.filas, 'Drive', f.getUrl()); f.moveTo(C.procesados); hechos.push(Object.assign({ archivo: f.getName() }, p));
    } catch (e) { hechos.push({ archivo: f.getName(), ok: false, mensaje: String(e.message || e) }); }
    finally { if (temp) try { DriveApp.getFileById(temp).setTrashed(true); } catch (e) {} }
  }
  return { ok: true, procesados: hechos };
}

// ------------------------------------------------------------------ 3. PROPUESTA DE CAMBIOS (no aplica nada)
function bjProponer_(meta, filas, origen, archivo) {
  const T = BJ_TIPOS[meta.TIPO]; if (!T) return { ok: false, mensaje: 'El archivo no es un modelo del sistema (falta la hoja _SISTEMA).' };
  const cod = limpio_(meta.ESTABLECIMIENTO), cambios = [], errores = [];
  const add = (clave, campo, antes, despues, extra) => { if (String(antes || '') !== String(despues || '')) cambios.push(Object.assign({ clave: clave, campo: campo, antes: antes || '', despues: despues }, extra || {})); };
  if (meta.TIPO === 'RESPUESTA_INFORME') {
    const P = planAbrir_({ codigo: meta.REFERENCIA }); if (!P.ok) return P;
    filas.forEach(f => { const o = P.filas.find(x => x.N_REC === f[0]); if (!o) { if (f[0]) errores.push('No existe la recomendación ' + f[0] + '.'); return; }
      const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(f[6] || ''), fecha = f[6] ? (iso ? [f[6], iso[3], iso[2], iso[1]] : (/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(String(f[6]).trim()) || [])) : null;
      if (f[6] && !fecha.length) { errores.push(f[0] + ': la fecha «' + f[6] + '» no tiene el formato dd/mm/aaaa.'); }
      if (f[5]) add(f[0], 'RESPONSABLE_DIRECCION', o.RESPONSABLE_DIRECCION, f[5]);
      if (fecha && fecha.length) add(f[0], 'FECHA_PREVISTA', o.FECHA_PREVISTA, fecha[3] + '-' + ('0' + fecha[2]).slice(-2) + '-' + ('0' + fecha[1]).slice(-2));
      if (f[7]) add(f[0], 'OBSERVACIONES', o.OBSERVACIONES, f[7]); });
  } else if (meta.TIPO === 'CONTACTOS' || meta.TIPO === 'RED_HYS') {
    const hoja = meta.TIPO, sh = pBC_().getSheetByName(hoja), H = sh.getRange(5, 1, 1, sh.getLastColumn()).getValues()[0].map(String), ex = pTabla_(sh, H.length).filter(r => limpio_(r.v[0]) === cod);
    const claveDe = (o) => hoja === 'RED_HYS' ? (o.DNI && !bjVacio_(o.DNI) ? 'DNI ' + o.DNI : o.APELLIDO_Y_NOMBRE) : [o.TIPO, o.UNIDAD, o.CARGO].join(' · ');
    filas.forEach(f => {
      const o = {}; T.cols.forEach((c, j) => o[c[0]] = f[j] || ''); if (!T.cols.some(c => o[c[0]])) return;
      if (hoja === 'RED_HYS' && !o.APELLIDO_Y_NOMBRE) { errores.push('Hay una fila sin nombre.'); return; }
      if (o.CORREO && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(o.CORREO) || o.CORREO_INSTITUCIONAL && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(o.CORREO_INSTITUCIONAL)) errores.push(claveDe(o) + ': revisar el correo.');
      const k = claveDe(o), r = ex.find(e => { const eo = {}; H.forEach((h, j) => eo[h] = bjVal_(e.v[j])); return claveDe(eo) === k || (hoja === 'RED_HYS' && eo.APELLIDO_Y_NOMBRE.toLowerCase() === String(o.APELLIDO_Y_NOMBRE).toLowerCase()); });
      if (!r) { if (o.RESPONSABLE || o.APELLIDO_Y_NOMBRE) cambios.push({ clave: k, campo: '(fila nueva)', antes: '', despues: T.cols.map(c => o[c[0]]).filter(Boolean).join(' · '), nueva: o }); return; }
      T.cols.forEach(c => { const viejo = bjVal_(r.v[H.indexOf(c[0])]); if (o[c[0]] && !bjVacio_(o[c[0]]) && o[c[0]] !== viejo) add(k, c[0], viejo, o[c[0]], { fila: r.fila }); });
    });
  } else if (meta.TIPO === 'NOMINA_PERSONAL') {
    const sh = bjHojaTrab_(cod), H = bjCabTrab_(sh), ex = pTabla_(sh, H.length), porDni = {};
    ex.forEach(r => { const d = String(r.v[H.indexOf('DNI')]).replace(/\D/g, ''); if (d) porDni[d] = r; });
    filas.forEach(f => {
      const o = {}; T.cols.forEach((c, j) => o[c[0]] = String(f[j] || '').trim()); const dni = o.DNI.replace(/\D/g, '');
      if (!T.cols.some(c => o[c[0]])) return;
      if (!dni) { errores.push('Hay una fila sin DNI (' + (o.APELLIDOS || o.NOMBRES || 'sin nombre') + ').'); return; }
      const quien = ((o.APELLIDOS || '') + ' ' + (o.NOMBRES || '')).trim() + ' (DNI ' + dni + ')';
      if (o.CUIL) { const c = o.CUIL.replace(/\D/g, ''); if (c.length !== 11 || c.slice(2, 10).replace(/^0+/, '') !== dni.replace(/^0+/, '')) errores.push(quien + ': el CUIL no coincide con el DNI.'); else o.CUIL = c; }
      if (o.FECHA_INGRESO) { const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(o.FECHA_INGRESO), dm = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(o.FECHA_INGRESO);
        if (iso) o.FECHA_INGRESO = ('0' + iso[3]).slice(-2) + '/' + ('0' + iso[2]).slice(-2) + '/' + iso[1]; else if (!dm) errores.push(quien + ': la fecha de ingreso «' + o.FECHA_INGRESO + '» no tiene el formato dd/mm/aaaa.'); }
      const r = porDni[dni];
      if (!r) { cambios.push({ clave: quien, campo: '(fila nueva)', antes: '', despues: [o.CUIL, o.SERVICIO, o.FUNCION].filter(Boolean).join(' · ') || 'alta', nueva: Object.assign({}, o, { DNI: dni }) }); return; }
      T.cols.forEach(c => { if (!c[2]) return; const j = H.indexOf(c[0]), viejo = j >= 0 ? bjVal_(r.v[j]) : ''; if (o[c[0]] && !bjVacio_(o[c[0]]) && o[c[0]] !== viejo) add(quien, c[0], viejo, o[c[0]], { fila: r.fila }); });
    });
  } else if (meta.TIPO === 'DATOS_ESTABLECIMIENTO') {
    const sh = pBC_().getSheetByName('ESTABLECIMIENTOS'), H = sh.getRange(5, 1, 1, sh.getLastColumn()).getValues()[0].map(String), r = pTabla_(sh, H.length).find(r => limpio_(r.v[0]) === cod);
    if (!r) return { ok: false, mensaje: 'El establecimiento no está en la BASE COMÚN.' };
    T.campos.forEach((c, i) => { const nuevo = filas[i] && filas[i][2]; if (nuevo && !bjVacio_(nuevo)) add(cod, c[0], bjVal_(r.v[H.indexOf(c[0])]), nuevo, { fila: r.fila }); });
  }
  const id = 'BJ-' + Utilities.formatDate(new Date(), TZ, 'yyyyMMdd-HHmmss') + '-' + Math.floor(Math.random() * 900 + 100);
  const resumen = cambios.length ? cambios.length + ' cambio(s) propuesto(s)' : 'Sin cambios: los datos ya coinciden.';
  let json = JSON.stringify(cambios); if (json.length > 45000) json = 'ARCHIVO:' + bjCarpetas_().procesados.createFile(id + '.json', json, 'application/json').getId();
  conLock_(() => { const sh = bjHoja_(); sh.getRange(Math.max(sh.getLastRow(), 5) + 1, 1, 1, BJ_H.length).setValues([[id, bjHoy_(), meta.TIPO, cod, meta.REFERENCIA || '', archivo, origen, cambios.length ? 'Para revisar' : 'Sin cambios', resumen, String(errores.join(' · ')).slice(0, 45000), '', json, '']]); });
  return { ok: true, id: id, tipo: meta.TIPO, titulo: T.titulo, cod: cod, ref: meta.REFERENCIA || '', cambios: cambios, errores: errores, resumen: resumen };
}

// ------------------------------------------------------------------ 4. LISTAR Y APLICAR (solo lo aprobado)
function bjListar_() {
  const sh = bjHoja_(), n = sh.getLastRow() - 5; if (n < 1) return { ok: true, filas: [] };
  return { ok: true, filas: sh.getRange(6, 1, n, BJ_H.length).getValues().map(r => { const o = {}; BJ_H.forEach((h, j) => o[h] = h === 'CAMBIOS' ? bjCambios_(r[j]) : bjVal_(r[j])); o.TITULO = (BJ_TIPOS[o.TIPO] || {}).titulo || o.TIPO; return o; }).reverse() };
}
function bjAplicar_(x) {
  return conLock_(() => {
    const sh = bjHoja_(), n = sh.getLastRow() - 5, ids = sh.getRange(6, 1, n, 1).getValues().map(r => String(r[0])), i = ids.indexOf(String(x.id));
    if (i < 0) return { ok: false, mensaje: 'No se encontró la propuesta.' };
    const f = 6 + i, row = sh.getRange(f, 1, 1, BJ_H.length).getValues()[0]; if (row[7] === 'Aplicado') return { ok: false, mensaje: 'Esa propuesta ya se aplicó.' };
    if (x.rechazar) { sh.getRange(f, 8).setValue('Rechazado'); return { ok: true }; }
    const tipo = row[2], cod = limpio_(row[3]), ref = row[4], todos = bjCambios_(row[11]), sel = Array.isArray(x.indices) ? x.indices : todos.map((_, j) => j), C = todos.filter((_, j) => sel.indexOf(j) >= 0);
    const hist = (hoja, clave, campo, a, d) => pBC_().getSheetByName('HISTORIAL').appendRow([Utilities.formatDate(new Date(), TZ, 'd/M/yyyy'), hoja, cod + ' · ' + clave, campo, a, d, 'Bandeja ' + row[0]]);
    if (tipo === 'RESPUESTA_INFORME') {
      const filas = {}; C.forEach(c => { (filas[c.clave] = filas[c.clave] || { n: c.clave })[c.campo] = c.despues; });
      const P = planAbrir_({ codigo: ref });
      const r = planGuardar_({ codigo: ref, fechaRespuesta: bjHoy_(), filas: Object.values(filas).map(o => { const v = P.filas.find(p => p.N_REC === o.n) || {}; return { n: o.n, responsable: o.RESPONSABLE_DIRECCION || v.RESPONSABLE_DIRECCION, fechaPrevista: o.FECHA_PREVISTA || v.FECHA_PREVISTA, estado: v.ESTADO || 'Pendiente', evidencia: v.EVIDENCIA, obs: o.OBSERVACIONES || v.OBSERVACIONES }; }) });
      if (!r.ok) return r;
    } else if (tipo === 'NOMINA_PERSONAL') {
      const porHoja = {}; C.forEach(c => (porHoja[c.hoja || cod] = porHoja[c.hoja || cod] || []).push(c));
      Object.keys(porHoja).forEach(h => bjAplicarTrab_(h, porHoja[h], 'Bandeja ' + row[0]));
    } else {
      const hoja = tipo === 'DATOS_ESTABLECIMIENTO' ? 'ESTABLECIMIENTOS' : tipo, shB = pBC_().getSheetByName(hoja), H = shB.getRange(5, 1, 1, shB.getLastColumn()).getValues()[0].map(String);
      C.forEach(c => {
        if (c.nueva) { const v = H.map(h => h === 'CODIGO' ? cod : h === 'FUENTE' ? 'Bandeja' : h === 'ACTUALIZADO' ? bjHoy_() : (c.nueva[h] || (h === 'ESTADO' && hoja === 'RED_HYS' ? 'A confirmar' : ''))); shB.getRange(Math.max(shB.getLastRow(), 5) + 1, 1, 1, v.length).setValues([v]); hist(hoja, c.clave, 'ALTA', '', c.despues); return; }
        const j = H.indexOf(c.campo); if (j < 0 || !c.fila) return;
        shB.getRange(c.fila, j + 1).setValue(c.despues); hist(hoja, c.clave, c.campo, c.antes, c.despues);
        if (H.indexOf('ACTUALIZADO') >= 0) shB.getRange(c.fila, H.indexOf('ACTUALIZADO') + 1).setValue(bjHoy_());
      });
    }
    sh.getRange(f, 8).setValue(C.length === todos.length ? 'Aplicado' : 'Aplicado en parte'); sh.getRange(f, 13).setValue(bjHoy_() + ' · ' + C.length + ' de ' + todos.length);
    CacheService.getScriptCache().removeAll(['libros', 'p_resumen']);
    return { ok: true, aplicados: C.length };
  });
}
// Desde la planilla (sin portal): aplica todas las propuestas con APROBAR = Sí
function bandejaAplicarAprobados() {
  const L = bjListar_().filas.filter(o => o.APROBAR === 'Sí' && /Para revisar/.test(o.ESTADO)), res = L.map(o => o.ID + ': ' + (bjAplicar_({ id: o.ID }).ok ? 'aplicado' : 'no se pudo'));
  SpreadsheetApp.getUi().alert(res.length ? res.join('\n') : 'No hay propuestas con APROBAR = Sí para aplicar.');
}
function bandejaRevisarCarpeta() {
  const r = bjCarpeta_(); SpreadsheetApp.getUi().alert(r.procesados.length ? r.procesados.map(p => p.archivo + ': ' + (p.ok ? p.resumen : p.mensaje)).join('\n') + '\n\nRevisalos en el portal (Documental › Bandeja de entrada) o en la hoja BANDEJA.' : 'La carpeta 07 BANDEJA DE ENTRADA está vacía.');
}

// Instalación (una vez): crea las carpetas 06 y 07 y la hoja BANDEJA, y pide el permiso para leer archivos de Excel
function instalarBandeja() {
  UrlFetchApp.fetch('https://www.googleapis.com/discovery/v1/apis/drive/v3/rest', { muteHttpExceptions: true });
  const C = bjCarpetas_(); bjHoja_();
  Logger.log('Listo: carpetas «' + BJ.MODELOS + '» y «' + BJ.BANDEJA + '» en SISTEMA HyS, y hoja BANDEJA en el libro general. ' + C.bandeja.getUrl());
}