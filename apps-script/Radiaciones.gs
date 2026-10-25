/**
 * SISTEMA HyS · MÓDULO 9 · RADIACIONES IONIZANTES (rayos X: radiología, tomografía, arco en C y odontológicos)
 * Versión 0 (13/10/2026); 0.1 (13/10/2026): sitios (edificios, CAPS, sede ex ADOS) con columna SITIO y hoja SITIOS_RX. Para toda la red. Carga: Higiene y Seguridad y secretaría desde el portal; los referentes de
 * radiaciones se habilitan más adelante (BASE COMÚN › HABILITACION / ACCESOS).
 *
 * Libro propio «RADIACIONES IONIZANTES · Sistema HyS» (propiedad RAD_ID). Hojas (todo editable a mano):
 *   PERSONAL_EXPUESTO  una fila por persona expuesta: datos de la BASE DE TRABAJADORES + dosímetro, estado y autorización
 *   MOVIMIENTOS        historial: alta de exposición, alta/baja de dosímetro (a pedido o por fin de exposición), reactivación,
 *                      cambio de dosímetro, extravío. Nada se pisa
 *   CONTROLES          un informe bimestral por fila (PDF del servicio de dosimetría, guardado en Drive; PERIODO = último mes del bimestre). El sistema no lee el PDF
 *   EVENTOS            registros anormales, extravíos, dosímetros dañados o no devueltos, exposiciones accidentales, con seguimiento
 *   SALAS_EQUIPOS      salas y equipos: habilitación, responsables, plano y memoria de blindaje, levantamiento radiométrico,
 *                      control de calidad, señalización y elementos de protección plomados
 *   DOCUMENTOS         habilitaciones, planos de plomado, autorizaciones individuales, designaciones, comunicaciones, etc.
 *   REQUISITOS         lo que pide la norma, con su artículo; se puede agregar o desactivar sin tocar código
 *   LISTAS · AYUDA
 * Archivos: SISTEMA HyS › MÓDULO 9 · RADIACIONES IONIZANTES › Establecimientos › establecimiento › Dosimetría › año ·
 *           Salas y equipos · Documentos · Eventos
 * Normativa: Ley 17.557 (arts. 1, 2 y 9); Dto. 6320/68 (arts. 6, 10, 12, 15, 17, 20, 21, 22, 25 a 27, 29 a 31, 33 a 37);
 * normas de seguridad radiosanitaria de la autoridad de salud (Dto. 6320/68, art. 19); Ley 19.587 y Dto. 351/79;
 * Res. SRT 37/10 (exámenes periódicos según agente), Res. SRT 81/19 (agentes cancerígenos: radiaciones ionizantes),
 * Res. SRT 905/15. No envía correos. «Mi establecimiento» (módulo Radiaciones en ACCESOS): acciones r_… (radRed_). No borra filas: lo que se quita queda «Anulado» o «Baja».
 * 0.2 (14/10/2026): cruce del personal expuesto con la BASE DE TRABAJADORES (radCruce_: en la base, de baja, en otro establecimiento
 *   o con datos distintos) y carga de varios equipos iguales de una vez (CANTIDAD, p. ej. 2 arcos en C en quirófano).
 * 0.3 (19/10/2026): hoja DOSIS (dosis por persona leídas del informe del servicio de dosimetría, p. ej. MKS) y carpeta Dosimetría en el panel.
 * 0.4 (19/10/2026): hoja INVESTIGACIONES · dosis a investigar aunque no superen el límite legal (observaciones B o C del servicio de
 *   dosimetría: dosímetro irradiado en condición estática o por radiación primaria; posibilidad de superar 6 mSv/año según la ICRP).
 *   Se abren solas al cargar el informe de dosis; se siguen y se cierran desde el portal (pestaña «Investigaciones») o en la hoja.
 * Instalación: ejecutar una vez construirModuloRadiaciones().
 */
const RAD = {
  SIS: '16AIJZcmxG9EBM3-D-J4vRtvruHK9DVrA',   // SISTEMA HyS
  CARPETA: 'MÓDULO 9 · RADIACIONES IONIZANTES',
  P_LIBRO: 'RAD_ID', P_CARPETA: 'RAD_CARPETA',
  H_PER: ['ID', 'ESTABLECIMIENTO', 'DNI', 'CUIL', 'APELLIDO_Y_NOMBRE', 'SERVICIO', 'FUNCION', 'SECTOR_EXPOSICION', 'DOSIMETRO_NRO', 'TIPO_DOSIMETRO', 'PROVEEDOR',
    'ESTADO_DOSIMETRO', 'INICIO_EXPOSICION', 'ALTA_DOSIMETRO', 'BAJA_DOSIMETRO', 'MOTIVO_BAJA', 'AUTORIZACION_INDIVIDUAL', 'AUTORIZACION_NRO', 'AUTORIZACION_VENCE',
    'EN_NTE', 'OBSERVACIONES', 'CARGADO_POR', 'ACTUALIZADO', 'SITIO',
    'TELEFONO', 'EMAIL', 'SERVICIOS', 'TITULO', 'MATRICULA', 'FORM_ALTA', 'FORM_BAJA'],   // 25/10/2026: datos de los formularios F-RAD-01 y 02 y enlace al formulario firmado (RadFormularios.gs)
  H_MOV: ['FECHA', 'ID_PERSONA', 'ESTABLECIMIENTO', 'DNI', 'APELLIDO_Y_NOMBRE', 'TIPO', 'DOSIMETRO_NRO', 'DETALLE', 'DOCUMENTO', 'CARGADO_POR', 'CARGADO'],
  H_CON: ['ID', 'ESTABLECIMIENTO', 'PERIODO', 'PROVEEDOR', 'FECHA_RECEPCION', 'ARCHIVO', 'CON_ANORMALES', 'OBSERVACIONES', 'ESTADO', 'CARGADO_POR', 'CARGADO', 'SITIO'],
  H_EVE: ['ID', 'FECHA', 'ESTABLECIMIENTO', 'ID_PERSONA', 'DNI', 'APELLIDO_Y_NOMBRE', 'TIPO', 'PERIODO', 'DOSIS_MSV', 'DESCRIPCION', 'ACCIONES', 'COMUNICADO_A',
    'FECHA_COMUNICACION', 'ESTADO', 'ARCHIVO', 'CARGADO_POR', 'ACTUALIZADO', 'SITIO',
    'FECHA_HECHO', 'NOVEDAD', 'FORM_NOVEDAD'],   // 25/10/2026: fecha en que se cree que ocurrió, qué pasó y F-RAD-03 firmado (RadFormularios.gs)
  H_SAL: ['ID', 'ESTABLECIMIENTO', 'SITIO', 'SALA', 'TIPO_EQUIPO', 'MARCA', 'MODELO', 'SERIE', 'ANIO', 'HABILITACION_NRO', 'HABILITACION_FECHA', 'HABILITACION_VENCE',
    'RESPONSABLE_INSTALACION', 'RESPONSABLE_USO', 'PLANO_BLINDAJE', 'MEMORIA_BLINDAJE', 'LEVANTAMIENTO_FECHA', 'LEVANTAMIENTO_PROXIMO', 'CONTROL_CALIDAD_FECHA',
    'CONTROL_CALIDAD_PROXIMO', 'SENALIZACION', 'LUZ_ADVERTENCIA', 'EPP_PLOMADO', 'EPP_CONTROL_FECHA', 'ESTADO', 'OBSERVACIONES', 'CARGADO_POR', 'ACTUALIZADO'],
  H_DOC: ['ID', 'ESTABLECIMIENTO', 'ID_SALA', 'TIPO', 'TITULO', 'FECHA', 'VENCE', 'ARCHIVO', 'ESTADO', 'OBSERVACIONES', 'CARGADO_POR', 'CARGADO', 'SITIO'],
  H_SIT: ['ID', 'ESTABLECIMIENTO', 'SITIO', 'NOMBRE_OFICIAL', 'TIPO_SITIO', 'RAYOS_X', 'EQUIPOS', 'OBSERVACIONES', 'CARGADO_POR', 'ACTUALIZADO'],
  // 0.3 (19/10/2026): dosis por persona, leídas del informe del servicio de dosimetría (p. ej. MKS) o cargadas a mano
  H_DOS: ['ID', 'ESTABLECIMIENTO', 'SITIO', 'ID_CONTROL', 'PROVEEDOR', 'REPORTE_NRO', 'ID_ENVIO', 'SERVICIO_PROVEEDOR', 'FECHA_EMISION', 'DNI', 'APELLIDO_Y_NOMBRE', 'ID_PERSONA',
    'DOSIMETRO', 'TIPO', 'PERIODO_DESDE', 'PERIODO_HASTA', 'DOSIS_MSV', 'OBSERVACION', 'ANUAL_C', 'ANUAL_12', 'SEGUIMIENTO', 'ARCHIVO', 'ESTADO', 'CARGADO_POR', 'CARGADO'],
  // 0.4 (19/10/2026): casos de dosis a investigar (uno por fila de DOSIS marcada; también se pueden abrir a mano)
  H_INV: ['ID', 'ESTABLECIMIENTO', 'SITIO', 'ID_PERSONA', 'DNI', 'APELLIDO_Y_NOMBRE', 'ID_DOSIS', 'DOSIMETRO', 'PERIODO', 'DOSIS_MSV', 'ANUAL_C', 'ANUAL_12',
    'OBSERVACION_PROVEEDOR', 'MOTIVO', 'FECHA_DETECCION', 'ESTADO', 'ENTREVISTA', 'CAUSA_PROBABLE', 'MEDIDAS', 'COMUNICADO_A', 'FECHA_COMUNICACION', 'CONCLUSION',
    'FECHA_CIERRE', 'ARCHIVO', 'CARGADO_POR', 'ACTUALIZADO'],
  ESTADOS_INV: ['Abierto', 'En análisis', 'Cerrado', 'Anulado'],
  CAUSAS_INV: ['s/d (en análisis)', 'Dosímetro irradiado sin portador (guardado o dejado en la sala, cerca del equipo)', 'Uso inadecuado del dosímetro (fuera del delantal, mal ubicado, prestado)',
    'Exposición real por la modalidad de trabajo', 'Falla de blindaje, señalización o elementos plomados', 'Error o falla del servicio de dosimetría', 'Otra'],
  LIM_ANUAL: 50, LIM_PERIODO: 30,   // Res. SS 273/86: 50 mSv por año y 30 mSv por trimestre (regla RAD-01)
  RX_SITIO: ['Sí', 'No', 'A confirmar'],
  H_REQ: ['ID', 'ALCANCE', 'REQUISITO', 'NORMA', 'COMO_SE_CUMPLE', 'DOC_TIPO', 'ACTIVO'],
  SECTORES: ['Radiología', 'Tomografía', 'Mamografía', 'Quirófano (arco en C)', 'Hemodinamia / intervencionismo', 'Odontología', 'Traumatología', 'Otro'],
  TIPOS_DOSI: ['Cuerpo entero', 'Anillo (extremidades)', 'Cristalino', 'Muñeca', 'Otro'],
  ESTADOS_DOSI: ['Activo', 'Baja a pedido del trabajador', 'Baja por fin de exposición', 'Extraviado', 'Suspendido', 'Sin dosímetro (s/d)'],
  TIPOS_MOV: ['Alta de exposición', 'Alta de dosímetro', 'Baja a pedido del trabajador', 'Baja por fin de exposición', 'Reactivación', 'Cambio de dosímetro', 'Extravío', 'Corrección de datos'],
  TIPOS_EVE: ['Registro anormal', 'Extravío de dosímetro', 'Dosímetro dañado', 'Dosímetro no devuelto', 'Exposición accidental', 'Otro'],
  EQUIPOS: ['Radiología fija', 'Radiología portátil (rodante)', 'Tomógrafo', 'Mamógrafo', 'Arco en C (radioscopia)', 'Odontológico intraoral', 'Odontológico panorámico / cefalométrico', 'Otro'],
  TIPOS_DOC: ['Habilitación de la instalación / equipo', 'Plano de ubicación y plomado', 'Memoria de cálculo de blindaje', 'Levantamiento radiométrico', 'Control de calidad del equipo',
    'Autorización individual (operador)', 'Designación de responsable de la instalación', 'Designación de responsable del uso', 'Nómina de personal con dosímetro (comunicación a la autoridad)',
    'Cartilla / registro individual de dosis', 'Comunicación de cambio de personal', 'Comunicación de exposición accidental', 'Comunicación de venta, cesión o baja de equipo',
    'Procedimiento de trabajo', 'Capacitación en protección radiológica', 'Exámenes médicos periódicos', 'Otro'],
  AVISO_DIAS: 60
};

// ------------------------------------------------------------------ INSTALACIÓN (una vez; se puede volver a ejecutar sin pisar nada)
function construirModuloRadiaciones() {
  const p = PropertiesService.getScriptProperties();
  const dir = carpeta_(DriveApp.getFolderById(RAD.SIS), RAD.CARPETA); p.setProperty(RAD.P_CARPETA, dir.getId());
  carpeta_(dir, 'Establecimientos'); carpeta_(dir, 'Respaldo');
  let ss = null, id = p.getProperty(RAD.P_LIBRO);
  if (id) { try { const f = DriveApp.getFileById(id); if (!f.isTrashed()) ss = SpreadsheetApp.openById(id); } catch (e) {} }
  if (!ss) { ss = SpreadsheetApp.create('RADIACIONES IONIZANTES · Sistema HyS'); ss.setSpreadsheetTimeZone(TZ); ss.setSpreadsheetLocale('es_AR'); p.setProperty(RAD.P_LIBRO, ss.getId()); DriveApp.getFileById(ss.getId()).moveTo(dir); }
  const hoja = (nombre, fn) => { if (ss.getSheetByName(nombre)) return; const sh = ss.insertSheet(nombre); fn(sh); };
  hoja('PERSONAL_EXPUESTO', sh => {
    encabezar_(sh, 'Personal expuesto a radiaciones ionizantes', 'Una fila por persona. Los datos personales salen de la BASE DE TRABAJADORES (por DNI). Para dar de baja el dosímetro no se borra la fila: ESTADO_DOSIMETRO y BAJA_DOSIMETRO. Fechas dd/mm/aaaa.', RAD.H_PER,
      ['Lo pone el sistema.', 'Código del establecimiento.', 'Sin puntos.', '', '', '', '', 'Dónde se expone.', 'Número del dosímetro asignado.', '', 'Servicio de dosimetría.', 'Activo, baja a pedido, baja por fin de exposición, extraviado…', 'Desde cuándo está expuesto (NTE).', '', '', '', 'Autorización individual de la autoridad sanitaria (Dto. 6320/68, art. 15).', '', '', '¿Figura en la NTE/RAR?', '', '', '']);
    lista_(sh, 7, 1000, RAD.SECTORES); lista_(sh, 9, 1000, RAD.TIPOS_DOSI); lista_(sh, 11, 1000, RAD.ESTADOS_DOSI); lista_(sh, 16, 1000, ['Sí', 'No', 's/d']); lista_(sh, 19, 1000, ['Sí', 'No', 's/d']);
    sh.getRange(6, 13, 1000, 3).setNumberFormat('dd/mm/yyyy'); sh.getRange(6, 19, 1000, 1).setNumberFormat('dd/mm/yyyy'); sh.setFrozenColumns(5); sh.setColumnWidth(5, 220);
  });
  hoja('MOVIMIENTOS', sh => { encabezar_(sh, 'Movimientos del personal expuesto', 'Historial de altas, bajas, reactivaciones, cambios y extravíos. Lo escribe el sistema; también se puede agregar a mano. No se borran filas.', RAD.H_MOV);
    lista_(sh, 5, 2000, RAD.TIPOS_MOV); sh.getRange(6, 1, 2000, 1).setNumberFormat('dd/mm/yyyy'); });
  hoja('CONTROLES', sh => { encabezar_(sh, 'Controles dosimétricos mensuales', 'Un control por establecimiento y por mes: el PDF del servicio de dosimetría queda en Drive (carpeta del establecimiento › Dosimetría › año). Si trae valores anormales, CON_ANORMALES = Sí y se carga el evento en EVENTOS.', RAD.H_CON,
    ['', '', 'aaaa-mm', '', '', 'Enlace al PDF.', 'Sí · No', '', 'Vigente · Anulado', '', '']);
    lista_(sh, 6, 2000, ['Sí', 'No', 's/d']); lista_(sh, 8, 2000, ['Vigente', 'Anulado']); sh.getRange(6, 5, 2000, 1).setNumberFormat('dd/mm/yyyy'); sh.getRange(6, 3, 2000, 1).setNumberFormat('@'); });
  hoja('EVENTOS', sh => { encabezar_(sh, 'Eventos: registros anormales, extravíos y otros', 'Cada evento con su seguimiento hasta cerrarlo. Exposición accidental superior a la norma: se notifica de inmediato a la autoridad (Dto. 6320/68, art. 20).', RAD.H_EVE);
    lista_(sh, 6, 2000, RAD.TIPOS_EVE); lista_(sh, 13, 2000, ['Abierto', 'En seguimiento', 'Cerrado', 'Anulado']); sh.getRange(6, 2, 2000, 1).setNumberFormat('dd/mm/yyyy'); sh.getRange(6, 13, 2000, 1).setNumberFormat('dd/mm/yyyy'); });
  hoja('SALAS_EQUIPOS', sh => { encabezar_(sh, 'Salas y equipos de rayos X', 'Una fila por equipo (con su sala). Habilitación de la autoridad sanitaria (Ley 17.557, art. 2; Dto. 6320/68, arts. 6 y 10). Plano y memoria de blindaje: enlace al archivo.', RAD.H_SAL);
    lista_(sh, 4, 1000, RAD.EQUIPOS); lista_(sh, 20, 1000, ['Sí', 'No', 's/d']); lista_(sh, 21, 1000, ['Sí', 'No', 's/d', 'No corresponde']); lista_(sh, 24, 1000, ['En uso', 'Fuera de servicio', 'Baja']);
    [11, 12, 17, 18, 19, 20, 24].forEach(c => sh.getRange(6, c, 1000, 1).setNumberFormat('dd/mm/yyyy')); });
  hoja('DOCUMENTOS', sh => { encabezar_(sh, 'Documentos del módulo', 'Habilitaciones, planos, autorizaciones, designaciones, comunicaciones a la autoridad y demás. El archivo queda en la carpeta del establecimiento › Documentos. Nada se borra: ESTADO = Reemplazado o Anulado.', RAD.H_DOC);
    lista_(sh, 3, 2000, RAD.TIPOS_DOC); lista_(sh, 8, 2000, ['Vigente', 'Reemplazado', 'Anulado']); sh.getRange(6, 6, 2000, 2).setNumberFormat('dd/mm/yyyy'); });
  hoja('REQUISITOS', sh => { encabezar_(sh, 'Requisitos legales', 'Lo que pide la norma y cómo se acredita en el sistema. DOC_TIPO: el tipo de documento que lo acredita (si lo hay). Se pueden agregar filas o poner ACTIVO = No.', RAD.H_REQ);
    sh.getRange(6, 1, RAD_REQ.length, RAD.H_REQ.length).setValues(RAD_REQ); lista_(sh, 6, 200, ['Sí', 'No']); sh.setColumnWidth(3, 380); sh.setColumnWidth(4, 260); sh.setColumnWidth(5, 300); });
  hoja('SITIOS_RX', sh => { encabezar_(sh, 'Sitios con radiaciones ionizantes', 'Una fila por sitio de cada establecimiento (los sitios salen de BASE COMÚN › SITIOS: edificios, CAPS, sede ex ADOS y dispositivos). RAYOS_X: Sí, No o A confirmar. EQUIPOS: qué hay (rayos X, tomografía, arco en C, odontológico).', RAD.H_SIT,
    ['', 'Código del establecimiento.', 'Nombre corto del sitio (igual que en BASE COMÚN › SITIOS).', '', 'Edificio, CAPS, Dispositivo…', 'Sí · No · A confirmar', '', '', '', '']);
    lista_(sh, 5, 2000, RAD.RX_SITIO); sh.setColumnWidth(3, 200); sh.setColumnWidth(7, 260); });
  // Versión 0.1 (13/10/2026): columna SITIO en las hojas de datos (los encabezados se reescriben; los datos no se tocan)
  [['PERSONAL_EXPUESTO', RAD.H_PER], ['CONTROLES', RAD.H_CON], ['EVENTOS', RAD.H_EVE], ['SALAS_EQUIPOS', RAD.H_SAL], ['DOCUMENTOS', RAD.H_DOC]].forEach(([n, H]) => {
    const sh = ss.getSheetByName(n); sh.getRange(5, 1, 1, H.length).setValues([H]).setFontWeight('bold').setFontColor('#FFFFFF').setBackground(BASES.AZUL).setWrap(true).setVerticalAlignment('middle'); });
  const sembrados = radSembrarSitios_(ss);
  const ay = ss.getSheetByName('AYUDA'); if (ay) { ay.clear(); ay.getRange(1, 1, RAD_AYUDA.length, 2).setValues(RAD_AYUDA); ay.getRange(1, 1).setFontSize(16).setFontWeight('bold'); ay.getRange(1, 1, RAD_AYUDA.length, 2).setWrap(true).setVerticalAlignment('top'); }
  hoja('AYUDA', sh => { sh.getRange(1, 1, RAD_AYUDA.length, 2).setValues(RAD_AYUDA); sh.getRange(1, 1).setFontSize(16).setFontWeight('bold'); sh.setColumnWidth(1, 220); sh.setColumnWidth(2, 720); sh.getRange(1, 1, RAD_AYUDA.length, 2).setWrap(true).setVerticalAlignment('top'); });
  const h1 = ss.getSheetByName('Hoja 1') || ss.getSheetByName('Sheet1'); if (h1 && ss.getSheets().length > 1) ss.deleteSheet(h1);
  Logger.log('Módulo 9 listo (' + sembrados + ' sitios nuevos en SITIOS_RX). Libro: ' + ss.getUrl() + ' · Carpeta: ' + dir.getUrl());
  return { ok: true, libro: ss.getUrl(), carpeta: dir.getUrl() };
}
// Sitios: copia en SITIOS_RX los sitios de BASE COMÚN › SITIOS que todavía no están (no toca los que ya existen).
// Red Trelew (dato de Belén, 13/10/2026): HZT Central (rayos X y tomógrafo), sede ex ADOS y CAPS (odontológicos) y HMH (rayos X digital y quirófano) con rayos X = Sí.
// El resto de la provincia queda «A confirmar». Un establecimiento sin sitios en BASE COMÚN recibe una fila con su nombre.
function radSembrarSitios_(ss) {
  const sh = ss.getSheetByName('SITIOS_RX'), ya = {};
  pTabla_(sh, RAD.H_SIT.length).forEach(r => ya[limpio_(r.v[1]) + '|' + sinTildes_(r.v[2])] = true);
  const S = pTabla_(pBC_().getSheetByName('SITIOS'), 7), E = pEstablecimientos_().filas, filas = [], hoy = new Date();
  const regla = (cod, sitio, tipo) => {
    if (cod === 'HZT' && /central/i.test(sitio)) return ['Sí', 'Rayos X y tomografía', 'Servicio de Radiología: el personal rota entre HZT y HMH (una sola unidad HZT/HMH, se carga acá). No incluye PROSATE, quirófano, traumatología, cirugía ni odontología.'];
    if (cod === 'HZT' && /ados/i.test(sitio)) return ['Sí', 'Odontológico', 'Sede ex ADOS: depende del HZT (Odontología). Confirmar tipo y cantidad de equipos.'];
    if (cod === 'HZT' && /CAPS/i.test(tipo)) return ['Sí', 'Odontológico', 'Odontología depende del HZT. Confirmar tipo de equipo.'];
    if (cod === 'HMH' && /edificio/i.test(tipo)) return ['Sí', 'Rayos X digital; arco en C (quirófano)', 'Radiología HZT/HMH: el personal del Servicio rota y se carga en HZT. Quirófano y traumatología: se cargan acá. Confirmar arco en C.'];
    return ['A confirmar', '', ''];
  };
  let n = 0;
  E.forEach(e => {
    const cod = limpio_(e.v[0]); if (!cod) return;
    let mios = S.filter(r => limpio_(r.v[0]) === cod).map(r => ({ sitio: limpio_(r.v[1]), oficial: limpio_(r.v[2]), tipo: limpio_(r.v[4]) }));
    if (!mios.length) mios = [{ sitio: limpio_(e.v[1]), oficial: limpio_(e.v[1]), tipo: 'Edificio' }];
    mios.forEach(m => { if (!m.sitio || ya[cod + '|' + sinTildes_(m.sitio)]) return; const r = regla(cod, m.sitio, m.tipo); n++;
      filas.push(['RS-' + cod + '-' + ('000' + n).slice(-4), cod, m.sitio, m.oficial, m.tipo || 's/d', r[0], r[1], r[2], 'Sistema (carga inicial)', hoy]); ya[cod + '|' + sinTildes_(m.sitio)] = true; });
  });
  if (filas.length) sh.getRange(Math.max(sh.getLastRow(), 5) + 1, 1, filas.length, RAD.H_SIT.length).setValues(filas);
  return filas.length;
}
// Sitios de un establecimiento: los de SITIOS_RX más los de BASE COMÚN que todavía no están (como «A confirmar»)
function radSitiosEst_(cod, sitRx) {
  const L = sitRx.filter(s => s.ESTABLECIMIENTO === cod), ya = {}; L.forEach(s => ya[sinTildes_(s.SITIO)] = true);
  pTabla_(pBC_().getSheetByName('SITIOS'), 7).filter(r => limpio_(r.v[0]) === cod && !ya[sinTildes_(r.v[1])])
    .forEach(r => L.push({ ID: '', ESTABLECIMIENTO: cod, SITIO: limpio_(r.v[1]), NOMBRE_OFICIAL: limpio_(r.v[2]), TIPO_SITIO: limpio_(r.v[4]), RAYOS_X: 'A confirmar', EQUIPOS: '', OBSERVACIONES: '' }));
  return L;
}
function radSitioGuardar_(x, quien) {
  const cod = limpio_(x.ESTABLECIMIENTO), sitio = limpio_(x.SITIO); if (!cod || !sitio) return { ok: false, mensaje: 'Falta el establecimiento o el nombre del sitio.' };
  if (RAD.RX_SITIO.indexOf(x.RAYOS_X) < 0) return { ok: false, mensaje: 'Elegí si el sitio tiene rayos X: Sí, No o A confirmar.' };
  const L = radLeer_('SITIOS_RX', RAD.H_SIT), antes = x.ID ? L.find(s => s.ID === x.ID) : L.find(s => limpio_(s.ESTABLECIMIENTO) === cod && sinTildes_(s.SITIO) === sinTildes_(sitio));
  const s = {}; RAD.H_SIT.forEach(h => s[h] = x[h] != null ? x[h] : antes ? antes[h] : '');
  s.ID = antes ? antes.ID : radId_('RS', cod); s.ESTABLECIMIENTO = cod; s.SITIO = sitio; s.CARGADO_POR = limpio_(quien) || 'Portal'; s.ACTUALIZADO = new Date();
  if (antes) radActualizar_('SITIOS_RX', RAD.H_SIT, antes.fila, s); else radAgregar_('SITIOS_RX', RAD.H_SIT, s);
  CacheService.getScriptCache().remove('rad_tablero');
  return { ok: true, id: s.ID };
}
const RAD_REQ = [
  ['R01', 'Instalación y equipo', 'Cada equipo e instalación de rayos X habilitado por la autoridad de salud pública de la jurisdicción', 'Ley 17.557, art. 2; Dto. 6320/68, art. 6', 'Habilitación cargada y vigente en SALAS_EQUIPOS', 'Habilitación de la instalación / equipo', 'Sí'],
  ['R02', 'Instalación y equipo', 'Plano de ubicación del equipo con los ambientes contiguos y su uso, características técnicas y régimen de trabajo, presentado con la solicitud', 'Dto. 6320/68, art. 10', 'Plano cargado por sala', 'Plano de ubicación y plomado', 'Sí'],
  ['R03', 'Instalación y equipo', 'Diseño y operabilidad de la instalación según las normas de seguridad de la autoridad (blindajes, barreras, señalización)', 'Dto. 6320/68, art. 19 b', 'Memoria de blindaje y levantamiento radiométrico cargados; señalización y luz de advertencia relevadas', 'Memoria de cálculo de blindaje', 'Sí'],
  ['R04', 'Instalación y equipo', 'Nuevas instalaciones o modificaciones gestionadas ante la autoridad antes de usarse', 'Dto. 6320/68, arts. 10 y 13', 'Habilitación nueva o actualizada cuando se cambia o mueve un equipo', 'Habilitación de la instalación / equipo', 'Sí'],
  ['R05', 'Instalación y equipo', 'Venta, cesión, transferencia o baja de equipos comunicada fehacientemente a la autoridad dentro de los 30 días', 'Dto. 6320/68, art. 37', 'Comunicación cargada al dar de baja un equipo', 'Comunicación de venta, cesión o baja de equipo', 'Sí'],
  ['R06', 'Responsables', 'Responsable de la instalación: en hospitales, el director', 'Dto. 6320/68, art. 33', 'Designación cargada; nombre en SALAS_EQUIPOS', 'Designación de responsable de la instalación', 'Sí'],
  ['R07', 'Responsables', 'Responsable del uso: jefe del servicio o persona autorizada designada; los portátiles, bajo un médico autorizado', 'Dto. 6320/68, arts. 34 y 35', 'Designación cargada; nombre en SALAS_EQUIPOS', 'Designación de responsable del uso', 'Sí'],
  ['R08', 'Responsables', 'El responsable conserva ese carácter hasta que la autoridad toma conocimiento de su relevo', 'Dto. 6320/68, art. 36', 'Comunicar cada cambio de responsable', 'Comunicación de cambio de personal', 'Sí'],
  ['R09', 'Personal', 'Al menos una persona autorizada para manejar la instalación', 'Dto. 6320/68, art. 12', 'Personal con autorización individual cargada', 'Autorización individual (operador)', 'Sí'],
  ['R10', 'Personal', 'Nadie opera sin autorización individual previa de la autoridad de salud pública (con la formación que corresponde a cada uso)', 'Ley 17.557, art. 9 e; Dto. 6320/68, arts. 15 y 17', 'AUTORIZACION_INDIVIDUAL = Sí, con número y vencimiento', 'Autorización individual (operador)', 'Sí'],
  ['R11', 'Dosimetría', 'Quien maneja equipos usa dosímetro personal aprobado por la autoridad', 'Ley 17.557, art. 9 b; Dto. 6320/68, art. 21', 'Persona con ESTADO_DOSIMETRO = Activo y número de dosímetro', '', 'Sí'],
  ['R12', 'Dosimetría', 'El responsable informa a la autoridad quiénes deben usar dosímetro y comunica de inmediato cualquier cambio de ese personal', 'Dto. 6320/68, arts. 22 y 25', 'Nómina y comunicaciones cargadas en cada alta o baja', 'Nómina de personal con dosímetro (comunicación a la autoridad)', 'Sí'],
  ['R13', 'Dosimetría', 'Dosis acumuladas informadas al responsable en períodos no mayores a un trimestre', 'Dto. 6320/68, art. 26', 'Controles mensuales cargados (CONTROLES), sin meses faltantes', '', 'Sí'],
  ['R14', 'Dosimetría', 'Registro de dosis individuales conservado durante 30 años', 'Dto. 6320/68, art. 27', 'Los PDF de cada mes quedan en Drive; no se borran', '', 'Sí'],
  ['R15', 'Dosimetría', 'Cartilla individual de dosis mantenida al día por el responsable', 'Dto. 6320/68, arts. 29 a 31', 'Cartilla o registro individual cargado por persona', 'Cartilla / registro individual de dosis', 'Sí'],
  ['R16', 'Dosimetría', 'Exposición accidental superior a la norma notificada de inmediato a la autoridad', 'Dto. 6320/68, art. 20', 'Evento «Exposición accidental» o «Registro anormal» con fecha de comunicación', 'Comunicación de exposición accidental', 'Sí'],
  ['R17', 'Salud y registro laboral', 'Personal expuesto incluido en la NTE/RAR (agente radiaciones ionizantes, código ESOP 90002 / 90011) y con exámenes periódicos según el agente', 'Res. SRT 37/10; Res. SRT 81/19 (cancerígenos)', 'EN_NTE = Sí; exámenes cargados', 'Exámenes médicos periódicos', 'Sí'],
  ['R18', 'Salud y registro laboral', 'Capacitación del personal en protección radiológica y procedimientos de trabajo escritos', 'Ley 19.587, art. 9 k; Dto. 351/79; Res. SRT 905/15', 'Capacitación y procedimiento cargados', 'Capacitación en protección radiológica', 'Sí']
];
const RAD_AYUDA = [
  ['Ayuda · Módulo 9 · Radiaciones ionizantes', ''],
  ['Qué es', 'El registro de rayos X de toda la red: personal expuesto y sus dosímetros, informes de dosimetría bimestrales (MKS), eventos, salas y equipos, documentos y requisitos legales. Versión 0.'],
  ['Desde dónde se carga', 'Portal HyS › 9 · Radiaciones ionizantes. Todo se puede cargar y corregir también acá, en cada hoja (las filas empiezan en la 6).'],
  ['Alcance: quién va en cada establecimiento', 'El personal del Servicio de Radiología (técnicos y profesionales de diagnóstico por imágenes; no incluye PROSATE, quirófano, traumatología, cirugía ni odontología) rota entre el HZT y el HMH: se gestiona como una sola unidad HZT/HMH y se carga en el HZT (sitio HZT Central), con un único informe de dosimetría. PROSATE es la ex ADOS y depende del HZT. Odontología depende del HZT (consultorios en los CAPS y en la sede ex ADOS). El personal de quirófano, traumatología y cirugía que use rayos X (arco en C) se carga en el establecimiento donde trabaja.'],
  ['SITIOS_RX', 'Un renglón por sitio de cada establecimiento (edificio, CAPS, sede ex ADOS, dispositivos), copiado de BASE COMÚN › SITIOS. RAYOS_X = Sí, No o A confirmar, y qué equipos hay. Red Trelew: HZT Central, sede ex ADOS, CAPS y HMH cargados con Sí; el resto de la provincia, A confirmar. Las personas, los equipos, los eventos y los documentos llevan su SITIO.'],
  ['PERSONAL_EXPUESTO', 'Una fila por persona. Al cargar el DNI, el portal trae nombre, CUIL, servicio y función de la BASE DE TRABAJADORES. La baja del dosímetro no borra la fila: cambia el estado y queda en MOVIMIENTOS. Una persona puede pedir la baja y volver a darse de alta (Reactivación): se usa la misma fila.'],
  ['MOVIMIENTOS', 'Historial automático de cada alta, baja, reactivación, cambio de dosímetro y extravío.'],
  ['CONTROLES', 'Cada mes se sube el PDF del servicio de dosimetría por establecimiento. El sistema no lee el PDF: si trae valores anormales, se marca y se carga el evento.'],
  ['EVENTOS', 'Registro anormal, extravío, dosímetro dañado o no devuelto, exposición accidental. Se sigue hasta cerrarlo. La exposición accidental superior a la norma se notifica de inmediato a la autoridad (Dto. 6320/68, art. 20).'],
  ['SALAS_EQUIPOS', 'Un renglón por equipo: habilitación, responsables (Dto. 6320/68, arts. 33 y 34), plano y memoria de blindaje, levantamiento radiométrico, control de calidad, señalización, luz de advertencia y elementos plomados.'],
  ['DOCUMENTOS', 'Todos los papeles del módulo. Al cargar uno, el archivo va a la carpeta del establecimiento › Documentos.'],
  ['REQUISITOS', 'Lo que pide la norma, con su artículo, y qué documento lo acredita. El portal muestra para cada establecimiento qué requisito tiene documento y cuál falta.'],
  ['Conservación', 'El registro de dosis se conserva 30 años (Dto. 6320/68, art. 27): no borrar los PDF ni las filas.']
];

// ------------------------------------------------------------------ ACCESO A DATOS
const pRad_ = () => { const id = PropertiesService.getScriptProperties().getProperty(RAD.P_LIBRO); if (!id) throw new Error('El módulo de radiaciones todavía no está instalado (construirModuloRadiaciones).'); return SpreadsheetApp.openById(id); };
const radISO_ = v => { if (v instanceof Date) return Utilities.formatDate(v, TZ, 'yyyy-MM-dd'); const s = limpio_(v); let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s); if (m) return m[0];
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(s); return m ? m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2) : ''; };
const radFecha_ = v => { const s = radISO_(v); return s ? new Date(s + 'T12:00:00') : ''; };
function radLeer_(hoja, H) {
  const sh = pRad_().getSheetByName(hoja); if (!sh) return [];
  if (sh.getMaxColumns() < H.length) sh.insertColumnsAfter(sh.getMaxColumns(), H.length - sh.getMaxColumns());   // columnas nuevas (25/10/2026): que la hoja tenga lugar
  return pTabla_(sh, H.length).map(r => { const o = { fila: r.fila }; H.forEach((h, i) => o[h] = r.v[i] instanceof Date ? radISO_(r.v[i]) : r.v[i]); return o; });
}
function radCarpetaEst_(cod, sub) {
  const p = PropertiesService.getScriptProperties(), dir = DriveApp.getFolderById(p.getProperty(RAD.P_CARPETA));
  const E = pEstablecimientos_().filas.find(f => limpio_(f.v[0]) === cod), nombre = cod + (E ? ' · ' + limpio_(E.v[1]) : '');
  let d = carpeta_(carpeta_(dir, 'Establecimientos'), nombre); (sub || []).forEach(s => d = carpeta_(d, s)); return d;
}
// Archivo { base64: 'data:…;base64,…', nombre } → carpeta indicada. Devuelve el enlace.
function radArchivo_(cod, a, sub, etiqueta) {
  if (!fotosDe_(a).length) return '';   // hasta 5 fotos o un PDF (23/10/2026; Codigo.gs › guardarFotos_)
  const nombre = (etiqueta + ' - ' + Utilities.formatDate(new Date(), TZ, 'yyyyMMdd-HHmmss')).replace(/[^\w\-.áéíóúñÁÉÍÓÚÑ ,·]/g, '_');
  return guardarFotos_(radCarpetaEst_(cod, sub), nombre, a);
}
// Columnas nuevas (25/10/2026): si la hoja todavía no las tiene en la fila 5, se agregan al final (una vez por hora, sin tocar los datos)
function radCabeceras_(hoja, H) {
  const c = CacheService.getScriptCache(), k = 'rad_cab_' + hoja + '_' + H.length; if (c.get(k)) return;
  try { const sh = pRad_().getSheetByName(hoja); if (!sh) return; const n = sh.getLastColumn(), cab = sh.getRange(5, 1, 1, Math.max(n, H.length)).getValues()[0].map(limpio_);
    H.forEach((h, j) => { if (!cab[j] && cab.indexOf(h) < 0) sh.getRange(5, j + 1).setValue(h).setFontWeight('bold').setFontColor('#FFFFFF').setBackground('#0D313F'); }); c.put(k, '1', 3600); } catch (e) {}
}
function radAgregar_(hoja, H, obj) { const sh = pRad_().getSheetByName(hoja); const v = H.map(h => obj[h] == null ? '' : obj[h]); sh.getRange(Math.max(sh.getLastRow(), 5) + 1, 1, 1, v.length).setValues([v]); }
function radActualizar_(hoja, H, fila, obj) { const sh = pRad_().getSheetByName(hoja); const v = H.map(h => obj[h] == null ? '' : obj[h]); sh.getRange(fila, 1, 1, v.length).setValues([v]); }
const radId_ = (pre, cod) => pre + '-' + String(cod).replace(/\s+/g, '').toUpperCase().slice(0, 6) + '-' + Utilities.formatDate(new Date(), TZ, 'yyMMddHHmmss') + Math.random().toString(36).slice(2, 4).toUpperCase();
function radMov_(p, tipo, detalle, doc, quien) {
  radAgregar_('MOVIMIENTOS', RAD.H_MOV, { FECHA: new Date(), ID_PERSONA: p.ID, ESTABLECIMIENTO: p.ESTABLECIMIENTO, DNI: p.DNI, APELLIDO_Y_NOMBRE: p.APELLIDO_Y_NOMBRE, TIPO: tipo,
    DOSIMETRO_NRO: p.DOSIMETRO_NRO, DETALLE: detalle || '', DOCUMENTO: doc || '', CARGADO_POR: quien || 'Portal', CARGADO: new Date() });
}
// Datos de la BASE DE TRABAJADORES por DNI (hoja TODOS)
// LA BASE DE DATOS ES ÚNICA (regla de todo el sistema, 25/10/2026): los datos personales (nombre, CUIL, correo, teléfono, función, servicio,
// título, matrícula) se leen de la BASE DE TRABAJADORES por DNI y los cambios se escriben ahí, con HISTORIAL (Personas.gs, Bandeja.gs).
// PERSONAL_EXPUESTO guarda solo lo propio de radiaciones (dosímetro, sector, estado, autorización) y el DNI como clave.
let RAD_PIX_ = null;
function radPersIx_() {
  if (RAD_PIX_) return RAD_PIX_; const ix = {};
  persIndice_().forEach(x => { const y = ix[x.dni]; if (!y || (y.hoja === 'SIN_ASIGNAR' && x.hoja !== 'SIN_ASIGNAR')) ix[x.dni] = x; });
  return RAD_PIX_ = ix;
}
function radBaseDe_(x) {
  const v = k => { const t = persVal_(x, k); return bjVacio_(t) ? '' : t; };
  return { dni: x.dni, nombre: [v('APELLIDOS'), v('NOMBRES')].filter(Boolean).join(', '), cuil: v('CUIL'), email: v('EMAIL'), telefono: v('TELEFONO'), funcion: v('FUNCION') || v('FUNCION_DETALLE'),
    servicio: v('SERVICIO'), servicios: v('SERVICIOS'), titulo: v('TITULO'), matricula: v('MATRICULA'), est: x.hoja, estado: v('ESTADO') };
}
// Índice liviano para leer (DNI › datos), en caché 10 minutos: leer todas las hojas de la base en cada pantalla es lento
let RAD_BIX_ = null;
function radBaseIx_() {
  if (RAD_BIX_) return RAD_BIX_; const k = 'rad_base_ix', c = cacheGet_(k); if (c) return RAD_BIX_ = c;
  const ix = {}, P = radPersIx_(); Object.keys(P).forEach(d => { const b = radBaseDe_(P[d]); Object.keys(b).forEach(f => { if (!b[f]) delete b[f]; }); ix[d] = b; });
  cachePut_(k, ix, 600); return RAD_BIX_ = ix;
}
function radBaseOlvidar_() { RAD_PIX_ = null; RAD_BIX_ = null; try { CacheService.getScriptCache().remove('rad_base_ix'); } catch (e) {} }
function radDniBase_(dni) {
  dni = String(dni || '').replace(/\D/g, ''); if (dni.length < 6) return null;
  const b = radBaseIx_()[dni]; return b ? Object.assign({ dni: dni, nombre: '', cuil: '', email: '', telefono: '', funcion: '', servicio: '', servicios: '', titulo: '', matricula: '', est: '', estado: '' }, b) : null;
}
// Pone sobre cada persona expuesta los datos de la base (la base manda; lo de la planilla de radiaciones queda solo si la base no lo tiene)
function radConBase_(per) {
  let ix = {}; try { ix = radBaseIx_(); } catch (e) { return per; }
  return per.map(p => { const b0 = ix[String(p.DNI || '').replace(/\D/g, '')]; if (!b0) return Object.assign({}, p, { EN_BASE: 'No' });
    const b = Object.assign({ nombre: '', cuil: '', email: '', telefono: '', funcion: '', servicio: '', servicios: '', titulo: '', matricula: '', est: '', estado: '' }, b0), o = Object.assign({}, p, { EN_BASE: 'Sí', BASE_ESTADO: b.estado, BASE_EST: b.est });
    [['APELLIDO_Y_NOMBRE', b.nombre], ['CUIL', b.cuil], ['EMAIL', b.email], ['TELEFONO', b.telefono], ['FUNCION', b.funcion], ['SERVICIO', b.servicio], ['SERVICIOS', b.servicios || b.servicio], ['TITULO', b.titulo], ['MATRICULA', b.matricula]]
      .forEach(c => { if (c[1]) o[c[0]] = c[1]; else if (bjVacio_(o[c[0]])) o[c[0]] = ''; });
    return o; });
}
// Escribe en la base los datos personales que llegan desde radiaciones (solo lo que cambia; si la persona no está, la da de alta en su establecimiento)
function radBaseEscribir_(cod, x, dni, nom, quien) {
  if (!dni) return { aviso: 'Sin DNI no se puede vincular con la base de personal.' };
  const norm = (k, v) => /CUIL|TELEFONO/.test(k) ? String(v || '').replace(/\D/g, '') : k === 'EMAIL' ? String(v || '').trim().toLowerCase() : sinTildes_(String(v || ''));
  const val = {}; ['CUIL', 'EMAIL', 'TELEFONO', 'FUNCION', 'SERVICIOS', 'TITULO', 'MATRICULA'].forEach(k => { if (x[k] != null && !bjVacio_(x[k])) val[k] = limpio_(x[k]); });
  const origen = 'Radiaciones (' + (limpio_(quien) || 'Portal') + ')', b = radPersIx_()[dni];
  if (!b) {
    const pz = nom.split(','), nueva = Object.assign({ DNI: dni, APELLIDOS: pz[0].trim(), NOMBRES: pz.slice(1).join(',').trim() }, val);
    if (val.SERVICIOS) nueva.SERVICIO = val.SERVICIOS.split(',')[0].trim();
    bjAplicarTrab_(cod, [{ clave: 'DNI ' + dni, nueva: nueva, despues: nom }], origen); radBaseOlvidar_(); return { alta: true };
  }
  const C = []; Object.keys(val).forEach(k => { const antes = persVal_(b, k); if (norm(k, antes) !== norm(k, val[k])) C.push({ clave: 'DNI ' + dni, campo: k, antes: antes, despues: val[k] }); });
  if (C.length) { bjAplicarTrab_(b.hoja, C, origen); radBaseOlvidar_(); }
  return { cambios: C.length };
}
// Índice de la BASE DE TRABAJADORES (hoja TODOS) por DNI, leído una sola vez
function radBaseIndice_() {
  const T = pBT_().getSheetByName('TODOS'), n = T.getLastRow() - 5, ix = {}; if (n < 1) return ix;
  T.getRange(6, 1, n, 22).getValues().forEach(r => { const d = String(r[1]).replace(/\D/g, ''); if (d) ix[d] = { dni: d, cuil: limpio_(r[0]), nombre: [r[2], r[3]].filter(Boolean).join(', '),
    funcion: limpio_(r[5] || r[6]), servicio: limpio_(r[7]), est: limpio_(r[21]), estado: limpio_(r[19]) }; });
  return ix;
}
// Cruce del personal expuesto con la base: quién no está, quién figura de baja o en otro establecimiento y qué datos difieren
function radCruce_(cod, per) {
  const ix = radBaseIndice_(), norm = t => String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  return per.filter(p => !/^Baja/.test(p.ESTADO_DOSIMETRO)).map(p => {
    const d = String(p.DNI || '').replace(/\D/g, ''), b = d ? ix[d] : null, dif = [];
    let estado = !d ? 'sin_dni' : !b ? 'no_base' : /baja|traslado|renuncia|jubil|fallec/i.test(b.estado) ? 'baja' : b.est && b.est !== cod ? 'otro_est' : 'ok';
    if (b) {
      if (b.nombre && norm(b.nombre) !== norm(p.APELLIDO_Y_NOMBRE)) dif.push(['APELLIDO_Y_NOMBRE', p.APELLIDO_Y_NOMBRE, b.nombre]);
      if (b.cuil && String(b.cuil).replace(/\D/g, '') !== String(p.CUIL || '').replace(/\D/g, '')) dif.push(['CUIL', p.CUIL, b.cuil]);
      if (b.servicio && norm(b.servicio) !== norm(p.SERVICIO)) dif.push(['SERVICIO', p.SERVICIO, b.servicio]);
      if (b.funcion && norm(b.funcion) !== norm(p.FUNCION)) dif.push(['FUNCION', p.FUNCION, b.funcion]);
      if (estado === 'ok' && dif.length) estado = 'difiere';
    }
    return { id: p.ID, nombre: p.APELLIDO_Y_NOMBRE, dni: d, estado: estado, base: b, dif: dif };
  });
}
// Personas de la base que parecen expuestas (imágenes, rayos, tomografía, odontología, hemodinamia), para sumarlas rápido
function radSugeridas_(cod) {
  const T = pBT_().getSheetByName('TODOS'), n = T.getLastRow() - 5; if (n < 1) return [];
  const ya = {}; radLeer_('PERSONAL_EXPUESTO', RAD.H_PER).forEach(p => ya[String(p.DNI).replace(/\D/g, '')] = true);
  return T.getRange(6, 1, n, 22).getValues().filter(r => limpio_(r[21]) === cod && !/baja|traslado/i.test(r[19]) && r[1] !== '' && !ya[String(r[1]).replace(/\D/g, '')] &&
    /radiol|rayos|imagen|bioim|tomogr|mamogr|hemodin|odont|radiof/i.test([r[5], r[6], r[7]].join(' ')))
    .slice(0, 80).map(r => ({ dni: String(r[1]).replace(/\D/g, ''), cuil: limpio_(r[0]), nombre: [r[2], r[3]].filter(Boolean).join(', '), funcion: limpio_(r[5] || r[6]), servicio: limpio_(r[7]) }));
}

// ------------------------------------------------------------------ PERSONAL Y DOSÍMETROS
// x: { ID?, ESTABLECIMIENTO, DNI, …, movimiento?: { tipo, detalle }, archivo? }
function radPersonaGuardar_(x, quien) {
  const cod = limpio_(x.ESTABLECIMIENTO); if (!cod) return { ok: false, mensaje: 'Falta el establecimiento.' };
  radCabeceras_('PERSONAL_EXPUESTO', RAD.H_PER); radCabeceras_('EVENTOS', RAD.H_EVE);
  if (x.EMAIL && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(limpio_(x.EMAIL))) return { ok: false, mensaje: 'El correo no parece válido.' };
  const L = radLeer_('PERSONAL_EXPUESTO', RAD.H_PER); let antes = null;
  if (x.ID) { antes = L.find(p => p.ID === x.ID); if (!antes) return { ok: false, mensaje: 'No se encontró la persona: actualizá la lista.' }; }
  // 25/10/2026: si una corrección no trae nombre o DNI (p. ej. «Tomar los datos de la base»), se conservan los que ya tenía
  const dni = String(x.DNI != null && x.DNI !== '' ? x.DNI : antes ? antes.DNI : '').replace(/\D/g, ''), nom = limpio_(x.APELLIDO_Y_NOMBRE) || (antes ? limpio_(antes.APELLIDO_Y_NOMBRE) : '');
  if (!nom) return { ok: false, mensaje: 'Falta el apellido y nombre.' };
  if (dni && (dni.length < 7 || dni.length > 8)) return { ok: false, mensaje: 'El DNI tiene que tener 7 u 8 números.' };
  else if (dni && L.some(p => String(p.DNI).replace(/\D/g, '') === dni && limpio_(p.ESTABLECIMIENTO) === cod)) return { ok: false, mensaje: 'Esa persona ya está cargada en este establecimiento: abrila y usá «Reactivar» si había pedido la baja.' };
  const hoy = new Date(), p = {};
  RAD.H_PER.forEach(h => p[h] = x[h] != null ? x[h] : antes ? antes[h] : '');
  p.ID = antes ? antes.ID : radId_('RX', cod); p.ESTABLECIMIENTO = cod; p.DNI = dni; p.APELLIDO_Y_NOMBRE = nom;
  ['INICIO_EXPOSICION', 'ALTA_DOSIMETRO', 'BAJA_DOSIMETRO', 'AUTORIZACION_VENCE'].forEach(k => p[k] = radFecha_(p[k]));
  if (!p.ESTADO_DOSIMETRO) p.ESTADO_DOSIMETRO = p.DOSIMETRO_NRO ? 'Activo' : 'Sin dosímetro (s/d)';
  ['AUTORIZACION_INDIVIDUAL', 'EN_NTE'].forEach(k => { if (!/^(Sí|No)$/.test(p[k])) p[k] = 's/d'; });
  p.CARGADO_POR = limpio_(quien) || 'Portal'; p.ACTUALIZADO = hoy;
  const fk = x.FORM === 'alta' || x.FORM === 'baja' ? x.FORM : '';   // formulario F-RAD-01 o 02 firmado (25/10/2026)
  const doc = x.archivo ? radArchivo_(cod, x.archivo, fk ? ['Formularios'] : ['Documentos'], (fk ? (fk === 'alta' ? 'F-RAD-01 alta' : 'F-RAD-02 baja') : (x.movimiento && x.movimiento.tipo || 'Personal')) + ' ' + nom) : '';
  if (fk && doc) p[fk === 'alta' ? 'FORM_ALTA' : 'FORM_BAJA'] = doc;
  // Datos personales: a la BASE DE TRABAJADORES (base única); en PERSONAL_EXPUESTO no se guardan copias de correo, teléfono, servicios, título ni matrícula
  let base = null; try { base = radBaseEscribir_(cod, x, dni, nom, quien); ['EMAIL', 'TELEFONO', 'SERVICIOS', 'TITULO', 'MATRICULA'].forEach(k => p[k] = ''); }
  catch (e) { base = { aviso: 'No se pudo actualizar la base de personal (' + e.message + '): los datos quedaron solo en radiaciones.' }; }
  if (antes) radActualizar_('PERSONAL_EXPUESTO', RAD.H_PER, antes.fila, p); else radAgregar_('PERSONAL_EXPUESTO', RAD.H_PER, p);
  // Movimientos: los que pide el portal y los que surgen del cambio de estado o de dosímetro
  const movs = [];
  if (!antes) movs.push(['Alta de exposición', 'Alta en el módulo' + (p.SECTOR_EXPOSICION ? ' · ' + p.SECTOR_EXPOSICION : '')]);
  if (x.movimiento && x.movimiento.tipo) movs.push([x.movimiento.tipo, x.movimiento.detalle || '']);
  else if (antes) {
    if (limpio_(antes.DOSIMETRO_NRO) && limpio_(antes.DOSIMETRO_NRO) !== limpio_(p.DOSIMETRO_NRO)) movs.push(['Cambio de dosímetro', antes.DOSIMETRO_NRO + ' → ' + p.DOSIMETRO_NRO]);
    if (antes.ESTADO_DOSIMETRO !== p.ESTADO_DOSIMETRO) movs.push([/^Activo$/.test(p.ESTADO_DOSIMETRO) ? (/^Baja/.test(antes.ESTADO_DOSIMETRO) ? 'Reactivación' : 'Alta de dosímetro') : /pedido/.test(p.ESTADO_DOSIMETRO) ? 'Baja a pedido del trabajador' : /fin/.test(p.ESTADO_DOSIMETRO) ? 'Baja por fin de exposición' : /Extrav/.test(p.ESTADO_DOSIMETRO) ? 'Extravío' : 'Corrección de datos', antes.ESTADO_DOSIMETRO + ' → ' + p.ESTADO_DOSIMETRO]);
  } else if (p.DOSIMETRO_NRO) movs.push(['Alta de dosímetro', 'Dosímetro ' + p.DOSIMETRO_NRO]);
  movs.forEach(m => radMov_(p, m[0], m[1], doc, quien));
  CacheService.getScriptCache().remove('rad_tablero');
  return { ok: true, id: p.ID, base: base, avisoComunicar: movs.length ? 'Recordá comunicar el cambio de personal con dosímetro a la autoridad sanitaria (Dto. 6320/68, art. 22).' : '' };
}

// ------------------------------------------------------------------ CONTROLES MENSUALES (PDF)
function radControlGuardar_(x, quien) {
  const cod = limpio_(x.ESTABLECIMIENTO), per = radBimDe_(x.PERIODO);   // informes bimestrales: se guarda el último mes del bimestre
  if (!cod) return { ok: false, mensaje: 'Falta el establecimiento.' };
  if (!/^\d{4}-\d{2}$/.test(per)) return { ok: false, mensaje: 'Elegí el bimestre del control.' };
  if (!x.archivo && !x.ID) return { ok: false, mensaje: 'Falta el PDF del control.' };
  const L = radLeer_('CONTROLES', RAD.H_CON); let antes = x.ID ? L.find(c => c.ID === x.ID) : null;
  const sit = limpio_(x.SITIO);
  if (!antes && L.some(c => limpio_(c.ESTABLECIMIENTO) === cod && limpio_(c.PERIODO) === per && limpio_(c.SITIO) === sit && c.ESTADO !== 'Anulado')) return { ok: false, mensaje: 'Ya hay un control cargado para ' + per + (sit ? ' en ' + sit : '') + '. Abrilo para reemplazar el PDF o corregirlo.' };
  const url = x.archivo ? radArchivo_(cod, x.archivo, ['Dosimetría', per.slice(0, 4)], 'Control dosimétrico ' + cod + (sit ? ' ' + sit : '') + ' ' + per) : (antes ? antes.ARCHIVO : '');
  const c = { ID: antes ? antes.ID : radId_('DC', cod), ESTABLECIMIENTO: cod, PERIODO: per, PROVEEDOR: limpio_(x.PROVEEDOR), FECHA_RECEPCION: radFecha_(x.FECHA_RECEPCION) || new Date(),
    ARCHIVO: url, CON_ANORMALES: /^(Sí|No)$/.test(x.CON_ANORMALES) ? x.CON_ANORMALES : 's/d', OBSERVACIONES: limpio_(x.OBSERVACIONES), ESTADO: x.ESTADO === 'Anulado' ? 'Anulado' : 'Vigente', CARGADO_POR: limpio_(quien) || 'Portal', CARGADO: new Date(), SITIO: sit };
  if (antes) radActualizar_('CONTROLES', RAD.H_CON, antes.fila, c); else radAgregar_('CONTROLES', RAD.H_CON, c);
  CacheService.getScriptCache().remove('rad_tablero');
  return { ok: true, id: c.ID, archivo: url, aviso: c.CON_ANORMALES === 'Sí' ? 'Marcaste valores anormales: cargá el evento de cada persona en «Eventos».' : '' };
}

// ------------------------------------------------------------------ DOSIS POR PERSONA (0.3 · 19/10/2026)
// Pedido de Belén: guardar el informe periódico de dosis (PDF) en la carpeta del establecimiento › Dosimetría › año y cargar
// los valores de cada persona. El portal lee el PDF (formato MKS: Usuario, Dosímetro, Tipo, Intervalo, Dosis, Seguimiento, Obs,
// Anual-C, Anual-12), muestra la tabla para revisar y corregir, y manda todo junto. Hoja DOSIS: una fila por persona y período.
// El informe queda además como control en CONTROLES (mes = fin del último período medido). Se puede cargar a mano en la hoja.
function radHojaDosis_() {
  const ss = pRad_(); let sh = ss.getSheetByName('DOSIS');
  if (!sh) {
    sh = ss.insertSheet('DOSIS');
    encabezar_(sh, 'Dosis por persona', 'Una fila por persona y período del informe del servicio de dosimetría. DOSIS_MSV vacío = sin dosis informada en ese período (ver OBSERVACION: <LIMx debajo del límite de medición, 2 dosímetro recibido tarde, <NR menor al nivel de registro). Períodos aaaa-mm. Nada se borra: ESTADO = Anulado.', RAD.H_DOS);
    sh.getRange(6, 15, 3000, 2).setNumberFormat('@'); sh.getRange(6, 9, 3000, 1).setNumberFormat('dd/mm/yyyy'); lista_(sh, 22, 3000, ['Vigente', 'Anulado']); sh.setFrozenColumns(11); sh.setColumnWidth(11, 220);
  }
  return sh;
}
const radNum_ = v => { const t = String(v == null ? '' : v).replace(',', '.').trim(); return /^\d+(\.\d+)?$/.test(t) ? Number(t) : null; };
function radDosisLeer_() { return pRad_().getSheetByName('DOSIS') ? radLeer_('DOSIS', RAD.H_DOS).map(d => Object.assign(d, { ESTABLECIMIENTO: limpio_(d.ESTABLECIMIENTO), DNI: String(d.DNI || '').replace(/\D/g, '') })) : []; }
// ¿Supera los límites? (dosis del período o acumulados anuales)
function radDosisAnormal_(f) { const d = radNum_(f.DOSIS_MSV), c = radNum_(f.ANUAL_C), a = radNum_(f.ANUAL_12);
  return (d != null && d > RAD.LIM_PERIODO) || (c != null && c > RAD.LIM_ANUAL) || (a != null && a > RAD.LIM_ANUAL); }

// ------------------------------------------------------------------ INVESTIGACIONES (0.4): dosis a investigar aunque no superen el límite
// Observaciones del servicio de dosimetría (referencias MKS): B = dosímetro irradiado en condición estática o expuesto a radiación primaria
// (posible uso o guardado inadecuado, modalidad de trabajo o radioprotección deficiente); C = la dosis del período indica la posibilidad de
// superar 6 mSv/año (recomendación ICRP). No son «<LIMx» ni «<NR». Base: Dto. 6320/68 (registro individual de dosis y medidas de protección),
// Ley 19.587 y Dto. 351/79 (investigar y corregir las condiciones de exposición).
function radHojaInv_() {
  const ss = pRad_(); let sh = ss.getSheetByName('INVESTIGACIONES');
  if (!sh) {
    sh = ss.insertSheet('INVESTIGACIONES');
    encabezar_(sh, 'Investigaciones de dosis', 'Un caso por dosis a investigar aunque no supere el límite legal (observación B o C del servicio de dosimetría, o abierto a mano). Se abre solo al cargar el informe de dosis. Completá entrevista, causa probable, medidas y conclusión; ESTADO: Abierto / En análisis / Cerrado / Anulado. Nada se borra.', RAD.H_INV);
    lista_(sh, 15, 1000, RAD.ESTADOS_INV); lista_(sh, 17, 1000, RAD.CAUSAS_INV);
    [15, 21, 23].forEach(c => sh.getRange(6, c, 1000, 1).setNumberFormat('dd/mm/yyyy')); sh.getRange(6, 9, 1000, 1).setNumberFormat('@');
    sh.setFrozenColumns(6); [14, 17, 19, 22].forEach(c => sh.setColumnWidth(c, 280));
  }
  return sh;
}
// Motivo de investigación de una fila de dosis ('' = nada para investigar)
function radInvMotivo_(f) {
  const t = String(f.OBSERVACION || '').replace(/<\s*(LIMx?|NR)\*?/gi, ' ').toUpperCase().split(/[^A-Z]+/).filter(w => /^[BC]+$/.test(w)).join('');
  const m = [];
  if (t.indexOf('B') >= 0) m.push('B · dosímetro irradiado en condición estática o expuesto a radiación primaria: posible uso o guardado inadecuado del dosímetro, modalidad de trabajo inadecuada o radioprotección deficiente');
  if (t.indexOf('C') >= 0) m.push('C · la dosis del período indica la posibilidad de superar 6 mSv/año (recomendación ICRP)');
  return m.join(' · ');
}
function radInvLeer_() { return pRad_().getSheetByName('INVESTIGACIONES') ? radLeer_('INVESTIGACIONES', RAD.H_INV).map(c => Object.assign(c, { ESTABLECIMIENTO: limpio_(c.ESTABLECIMIENTO) })) : []; }
// Abre un caso por cada fila de dosis marcada que todavía no tenga caso (filas: objetos con los campos de DOSIS, incluido ID)
function radInvAbrir_(filas, quien) {
  const marcadas = filas.filter(f => f.ID && f.ESTADO !== 'Anulado' && radInvMotivo_(f)); if (!marcadas.length) return 0;
  radHojaInv_(); const ya = {}; radInvLeer_().forEach(c => { if (c.ID_DOSIS) ya[c.ID_DOSIS] = true; });
  const nuevas = marcadas.filter(f => !ya[f.ID]); if (!nuevas.length) return 0;
  const ahora = new Date(), sh = pRad_().getSheetByName('INVESTIGACIONES');
  const v = nuevas.map(f => { const cod = limpio_(f.ESTABLECIMIENTO), o = { ID: radId_('IN', cod), ESTABLECIMIENTO: cod, SITIO: f.SITIO || '', ID_PERSONA: f.ID_PERSONA || '', DNI: String(f.DNI || '').replace(/\D/g, ''),
    APELLIDO_Y_NOMBRE: f.APELLIDO_Y_NOMBRE, ID_DOSIS: f.ID, DOSIMETRO: f.DOSIMETRO || '', PERIODO: (f.PERIODO_DESDE && f.PERIODO_DESDE !== f.PERIODO_HASTA ? f.PERIODO_DESDE + ' a ' : '') + (f.PERIODO_HASTA || ''),
    DOSIS_MSV: f.DOSIS_MSV, ANUAL_C: f.ANUAL_C, ANUAL_12: f.ANUAL_12, OBSERVACION_PROVEEDOR: f.OBSERVACION, MOTIVO: radInvMotivo_(f), FECHA_DETECCION: ahora, ESTADO: 'Abierto',
    CAUSA_PROBABLE: 's/d (en análisis)', ARCHIVO: f.ARCHIVO || '', CARGADO_POR: limpio_(quien) || 'Sistema (informe de dosis)', ACTUALIZADO: ahora };
    return RAD.H_INV.map(h => o[h] == null ? '' : o[h]); });
  sh.getRange(Math.max(sh.getLastRow(), 5) + 1, 1, v.length, RAD.H_INV.length).setValues(v);
  return v.length;
}
// Revisa toda la hoja DOSIS y abre los casos que falten (para informes cargados antes de la 0.4 o a mano en la hoja)
function radInvRevisar_(quien) { const n = radInvAbrir_(radDosisLeer_(), quien || 'Sistema (revisión de DOSIS)'); CacheService.getScriptCache().remove('rad_tablero'); return { ok: true, nuevas: n }; }
function radInvGuardar_(x, quien) {
  const cod = limpio_(x.ESTABLECIMIENTO); if (!cod) return { ok: false, mensaje: 'Falta el establecimiento.' };
  radHojaInv_(); const L = radInvLeer_(), antes = x.ID ? L.find(c => c.ID === x.ID) : null;
  if (x.ID && !antes) return { ok: false, mensaje: 'No se encontró el caso: actualizá la lista.' };
  const per = x.ID_PERSONA ? radLeer_('PERSONAL_EXPUESTO', RAD.H_PER).find(p => p.ID === x.ID_PERSONA) : null;
  const c = {}; RAD.H_INV.forEach(h => c[h] = x[h] != null ? x[h] : antes ? antes[h] : '');
  if (per) { c.DNI = per.DNI; c.APELLIDO_Y_NOMBRE = per.APELLIDO_Y_NOMBRE; if (!c.SITIO) c.SITIO = per.SITIO || ''; }
  if (!limpio_(c.APELLIDO_Y_NOMBRE)) return { ok: false, mensaje: 'Elegí la persona.' };
  if (!limpio_(c.MOTIVO)) return { ok: false, mensaje: 'Escribí el motivo de la investigación.' };
  c.ID = antes ? antes.ID : radId_('IN', cod); c.ESTABLECIMIENTO = cod; c.ESTADO = limpio_(c.ESTADO) || 'Abierto'; c.CAUSA_PROBABLE = limpio_(c.CAUSA_PROBABLE) || 's/d (en análisis)';
  if (c.ESTADO === 'Cerrado' && !limpio_(c.CONCLUSION)) return { ok: false, mensaje: 'Para cerrar el caso, escribí la conclusión.' };
  c.FECHA_DETECCION = radFecha_(c.FECHA_DETECCION) || new Date(); c.FECHA_COMUNICACION = radFecha_(c.FECHA_COMUNICACION);
  c.FECHA_CIERRE = c.ESTADO === 'Cerrado' ? (radFecha_(c.FECHA_CIERRE) || new Date()) : '';
  if (x.archivo) c.ARCHIVO = radArchivo_(cod, x.archivo, ['Investigaciones'], 'Investigación ' + c.APELLIDO_Y_NOMBRE);
  c.CARGADO_POR = limpio_(quien) || 'Portal'; c.ACTUALIZADO = new Date();
  const sh = pRad_().getSheetByName('INVESTIGACIONES'), v = RAD.H_INV.map(h => c[h] == null ? '' : c[h]);
  if (antes) sh.getRange(antes.fila, 1, 1, v.length).setValues([v]); else sh.getRange(Math.max(sh.getLastRow(), 5) + 1, 1, 1, v.length).setValues([v]);
  CacheService.getScriptCache().remove('rad_tablero');
  return { ok: true, id: c.ID };
}
// x: { ESTABLECIMIENTO, SITIO, PROVEEDOR, REPORTE_NRO, ID_ENVIO, SERVICIO_PROVEEDOR, FECHA_EMISION, archivo | ARCHIVO, filas: [...], sumarPersonal }
function radDosisGuardar_(x, quien) {
  const cod = limpio_(x.ESTABLECIMIENTO), sit = limpio_(x.SITIO), filas = (x.filas || []).filter(f => limpio_(f.APELLIDO_Y_NOMBRE) || String(f.DNI || '').replace(/\D/g, ''));
  if (!cod) return { ok: false, mensaje: 'Falta el establecimiento.' };
  if (!filas.length) return { ok: false, mensaje: 'No hay personas para cargar.' };
  if (!x.archivo && !limpio_(x.ARCHIVO)) return { ok: false, mensaje: 'Falta el PDF del informe.' };
  const rep = limpio_(x.REPORTE_NRO); radHojaDosis_();
  const prev = radDosisLeer_();
  if (rep && prev.some(d => d.ESTABLECIMIENTO === cod && limpio_(d.REPORTE_NRO) === rep && d.ESTADO !== 'Anulado')) return { ok: false, mensaje: 'El informe ' + rep + ' ya está cargado en ' + cod + '. Si querés reemplazarlo, anulá sus filas en la hoja DOSIS.' };
  const bien = filas.map(f => { const o = {}; RAD.H_DOS.forEach(h => o[h] = f[h] != null ? f[h] : ''); o.DNI = String(o.DNI || '').replace(/\D/g, ''); o.APELLIDO_Y_NOMBRE = limpio_(o.APELLIDO_Y_NOMBRE);
    ['PERIODO_DESDE', 'PERIODO_HASTA'].forEach(k => o[k] = /^\d{4}-\d{2}$/.test(limpio_(o[k])) ? limpio_(o[k]) : ''); ['DOSIS_MSV', 'ANUAL_C', 'ANUAL_12'].forEach(k => { const n = radNum_(o[k]); o[k] = n == null ? '' : n; }); return o; });
  const medidos = bien.filter(f => f.PERIODO_HASTA && (f.DOSIS_MSV !== '' || /LIM|NR/i.test(f.OBSERVACION)));
  const per = radBimDe_((medidos.length ? medidos : bien).map(f => f.PERIODO_HASTA).filter(Boolean).sort().pop() || Utilities.formatDate(radFecha_(x.FECHA_EMISION) || new Date(), TZ, 'yyyy-MM'));   // bimestre
  const anormales = bien.filter(radDosisAnormal_);
  // Archivo: carpeta del establecimiento › Dosimetría › año
  const url = x.archivo ? radArchivo_(cod, x.archivo, ['Dosimetría', per.slice(0, 4)], 'Informe de dosis ' + (limpio_(x.PROVEEDOR) || '') + ' ' + (rep || '') + ' ' + cod + (sit ? ' ' + sit : '') + ' ' + per) : limpio_(x.ARCHIVO);
  // Control del mes (si ya había uno para ese mes y sitio, se usa ese)
  const C = radLeer_('CONTROLES', RAD.H_CON), ya = C.find(c => limpio_(c.ESTABLECIMIENTO) === cod && limpio_(c.PERIODO) === per && limpio_(c.SITIO) === sit && c.ESTADO !== 'Anulado');
  const rango = (() => { const d = bien.map(f => f.PERIODO_DESDE).filter(Boolean).sort()[0], h = bien.map(f => f.PERIODO_HASTA).filter(Boolean).sort().pop(); return d && h ? d + ' a ' + h : ''; })();
  const obs = ['Informe de dosis' + (rep ? ' ' + rep : '') + (x.ID_ENVIO ? ' · envío ' + x.ID_ENVIO : ''), rango ? 'períodos ' + rango : '', bien.length + ' fila(s) en DOSIS', limpio_(x.SERVICIO_PROVEEDOR)].filter(Boolean).join(' · ');
  let idc;
  if (ya) { idc = ya.ID; if (anormales.length && ya.CON_ANORMALES !== 'Sí') { const c = Object.assign({}, ya); c.CON_ANORMALES = 'Sí'; c.FECHA_RECEPCION = radFecha_(c.FECHA_RECEPCION); c.CARGADO = radFecha_(c.CARGADO); radActualizar_('CONTROLES', RAD.H_CON, ya.fila, c); } }
  else { const c = { ID: radId_('DC', cod), ESTABLECIMIENTO: cod, PERIODO: per, PROVEEDOR: limpio_(x.PROVEEDOR), FECHA_RECEPCION: radFecha_(x.FECHA_EMISION) || new Date(), ARCHIVO: url,
    CON_ANORMALES: anormales.length ? 'Sí' : 'No', OBSERVACIONES: obs, ESTADO: 'Vigente', CARGADO_POR: limpio_(quien) || 'Portal', CARGADO: new Date(), SITIO: sit }; radAgregar_('CONTROLES', RAD.H_CON, c); idc = c.ID; }
  // Personas: se vinculan por DNI con PERSONAL_EXPUESTO; si no están y se pidió, se agregan (dosímetro activo)
  let P = radLeer_('PERSONAL_EXPUESTO', RAD.H_PER); const nuevas = [], ahora = new Date(), filasSh = [], guardadas = [];
  bien.forEach(f => {
    let p = f.DNI ? P.find(z => String(z.DNI).replace(/\D/g, '') === f.DNI && limpio_(z.ESTABLECIMIENTO) === cod) : null;
    if (!p && x.sumarPersonal && f.DNI && nuevas.indexOf(f.DNI) < 0) {
      const b = radDniBase_(f.DNI), r = radPersonaGuardar_({ ESTABLECIMIENTO: cod, DNI: f.DNI, APELLIDO_Y_NOMBRE: b && b.nombre || f.APELLIDO_Y_NOMBRE, CUIL: b ? b.cuil : '', SERVICIO: b ? b.servicio : '', FUNCION: b ? b.funcion : '',
        DOSIMETRO_NRO: f.DOSIMETRO, TIPO_DOSIMETRO: /^CE$/i.test(f.TIPO) ? 'Cuerpo entero' : '', PROVEEDOR: limpio_(x.PROVEEDOR), ESTADO_DOSIMETRO: 'Activo', SITIO: sit,
        OBSERVACIONES: 'Alta desde el informe de dosis ' + (rep || '') }, quien);
      if (r.ok) { nuevas.push(f.DNI); P = radLeer_('PERSONAL_EXPUESTO', RAD.H_PER); p = P.find(z => z.ID === r.id); }
    }
    const base = { ID: radId_('DS', cod), ESTABLECIMIENTO: cod, SITIO: sit, ID_CONTROL: idc, PROVEEDOR: limpio_(x.PROVEEDOR), REPORTE_NRO: rep, ID_ENVIO: limpio_(x.ID_ENVIO),
      SERVICIO_PROVEEDOR: limpio_(x.SERVICIO_PROVEEDOR), FECHA_EMISION: radFecha_(x.FECHA_EMISION), ID_PERSONA: p ? p.ID : '', ARCHIVO: url, ESTADO: 'Vigente', CARGADO_POR: limpio_(quien) || 'Portal', CARGADO: ahora };
    filasSh.push(RAD.H_DOS.map(h => h in base ? base[h] : (f[h] == null ? '' : f[h])));
    guardadas.push(Object.assign({}, f, base));
  });
  const sh = radHojaDosis_(); sh.getRange(Math.max(sh.getLastRow(), 5) + 1, 1, filasSh.length, RAD.H_DOS.length).setValues(filasSh);
  // 0.4: observaciones B o C del servicio de dosimetría → caso en INVESTIGACIONES
  const invNuevas = radInvAbrir_(guardadas, quien);
  // Dosis por encima de los límites: evento «Registro anormal» por persona (Dto. 6320/68, art. 20)
  anormales.forEach(f => { const p = P.find(z => String(z.DNI).replace(/\D/g, '') === f.DNI && limpio_(z.ESTABLECIMIENTO) === cod);
    radEventoGuardar_({ ESTABLECIMIENTO: cod, ID_PERSONA: p ? p.ID : '', DNI: f.DNI, APELLIDO_Y_NOMBRE: f.APELLIDO_Y_NOMBRE, TIPO: 'Registro anormal', PERIODO: f.PERIODO_HASTA, DOSIS_MSV: f.DOSIS_MSV || f.ANUAL_12 || f.ANUAL_C,
      DESCRIPCION: 'Informe ' + (rep || '') + ': dosis ' + (f.DOSIS_MSV === '' ? 's/d' : f.DOSIS_MSV) + ' mSv (' + f.PERIODO_DESDE + ' a ' + f.PERIODO_HASTA + '), anual calendario ' + f.ANUAL_C + ', últimos 12 meses ' + f.ANUAL_12 + '.', SITIO: sit, ARCHIVO: url }, quien); });
  CacheService.getScriptCache().remove('rad_tablero');
  return { ok: true, control: idc, periodo: per, filas: filasSh.length, nuevas: nuevas.length, anormales: anormales.length, investigaciones: invNuevas, archivo: url, carpeta: radCarpetaEst_(cod, ['Dosimetría', per.slice(0, 4)]).getUrl(),
    aviso: [anormales.length ? anormales.length + ' persona(s) con dosis por encima de los límites (Res. SS 273/86): se cargó el evento «Registro anormal»; se notifica de inmediato a la autoridad sanitaria (Dto. 6320/68, art. 20).' : '',
      invNuevas ? invNuevas + ' dosis con observación B o C del servicio de dosimetría: se abrió el caso en «Investigaciones».' : ''].filter(Boolean).join(' ') };
}
// Meses cubiertos por los informes de dosis (desde–hasta de cada fila con dosis o resultado), por establecimiento
function radMesesCubiertos_(dos, cod) {
  const m = {}; dos.filter(d => d.ESTABLECIMIENTO === cod && d.ESTADO !== 'Anulado' && d.PERIODO_DESDE && d.PERIODO_HASTA && (d.DOSIS_MSV !== '' || /LIM|NR/i.test(d.OBSERVACION))).forEach(d => {
    let [y, mm] = String(d.PERIODO_DESDE).split('-').map(Number); const fin = String(d.PERIODO_HASTA);
    for (let i = 0; i < 24; i++) { const k = y + '-' + ('0' + mm).slice(-2); m[k] = true; if (k >= fin) break; mm++; if (mm > 12) { mm = 1; y++; } } });
  return m;
}

// ------------------------------------------------------------------ EVENTOS
function radEventoGuardar_(x, quien) {
  const cod = limpio_(x.ESTABLECIMIENTO); if (!cod) return { ok: false, mensaje: 'Falta el establecimiento.' };
  if (!limpio_(x.TIPO)) return { ok: false, mensaje: 'Elegí el tipo de evento.' };
  radCabeceras_('EVENTOS', RAD.H_EVE);
  const L = radLeer_('EVENTOS', RAD.H_EVE), antes = x.ID ? L.find(e => e.ID === x.ID) : null;
  if (x.ID && !antes) return { ok: false, mensaje: 'No se encontró el evento: actualizá la lista.' };
  const per = x.ID_PERSONA ? radLeer_('PERSONAL_EXPUESTO', RAD.H_PER).find(p => p.ID === x.ID_PERSONA) : null;
  const e = {}; RAD.H_EVE.forEach(h => e[h] = x[h] != null ? x[h] : antes ? antes[h] : '');
  e.ID = antes ? antes.ID : radId_('EV', cod); e.ESTABLECIMIENTO = cod; e.FECHA = radFecha_(e.FECHA) || new Date(); e.FECHA_COMUNICACION = radFecha_(e.FECHA_COMUNICACION);
  if (per) { e.DNI = per.DNI; e.APELLIDO_Y_NOMBRE = per.APELLIDO_Y_NOMBRE; }
  if (!e.ESTADO) e.ESTADO = 'Abierto';
  e.FECHA_HECHO = radFecha_(e.FECHA_HECHO);
  if (x.archivo) e.ARCHIVO = radArchivo_(cod, x.archivo, ['Eventos'], (x.FORM === 'novedad' ? 'F-RAD-03 ' : '') + e.TIPO + ' ' + (e.APELLIDO_Y_NOMBRE || ''));
  if (x.FORM === 'novedad' && x.archivo && e.ARCHIVO) e.FORM_NOVEDAD = e.ARCHIVO;   // F-RAD-03 firmado (25/10/2026)
  e.CARGADO_POR = limpio_(quien) || 'Portal'; e.ACTUALIZADO = new Date();
  if (antes) radActualizar_('EVENTOS', RAD.H_EVE, antes.fila, e); else radAgregar_('EVENTOS', RAD.H_EVE, e);
  // Un extravío nuevo deja el dosímetro de la persona como «Extraviado» y lo anota en MOVIMIENTOS
  if (!antes && per && /Extrav/.test(e.TIPO) && per.ESTADO_DOSIMETRO !== 'Extraviado') {
    const p = Object.assign({}, per); RAD.H_PER.forEach(h => { if (/INICIO|ALTA_|BAJA_|VENCE/.test(h)) p[h] = radFecha_(p[h]); });
    p.ESTADO_DOSIMETRO = 'Extraviado'; p.ACTUALIZADO = new Date(); radActualizar_('PERSONAL_EXPUESTO', RAD.H_PER, per.fila, p); radMov_(p, 'Extravío', 'Evento ' + e.ID, e.ARCHIVO, quien);
  }
  CacheService.getScriptCache().remove('rad_tablero');
  return { ok: true, id: e.ID, aviso: /accidental|anormal/i.test(e.TIPO) && !e.FECHA_COMUNICACION ? 'Si la dosis supera la norma, se notifica de inmediato a la autoridad sanitaria (Dto. 6320/68, art. 20): cargá la fecha de comunicación.' : '' };
}

// ------------------------------------------------------------------ SALAS Y EQUIPOS · DOCUMENTOS
function radSalaGuardar_(x, quien) {
  const cod = limpio_(x.ESTABLECIMIENTO); if (!cod) return { ok: false, mensaje: 'Falta el establecimiento.' };
  if (!limpio_(x.SALA) && !limpio_(x.TIPO_EQUIPO)) return { ok: false, mensaje: 'Completá al menos la sala o el tipo de equipo.' };
  const L = radLeer_('SALAS_EQUIPOS', RAD.H_SAL), antes = x.ID ? L.find(s => s.ID === x.ID) : null;
  if (x.ID && !antes) return { ok: false, mensaje: 'No se encontró el equipo: actualizá la lista.' };
  // Varios equipos iguales de una vez (solo al agregar): una fila por equipo, con «N.º k de N» en las observaciones
  const cant = antes ? 1 : Math.min(20, Math.max(1, parseInt(x.CANTIDAD, 10) || 1));
  if (cant > 1) {
    const ids = [];
    for (let k = 1; k <= cant; k++) { const r = radSalaGuardar_(Object.assign({}, x, { CANTIDAD: 1, ID: '', OBSERVACIONES: ['Equipo ' + k + ' de ' + cant, limpio_(x.OBSERVACIONES)].filter(Boolean).join(' · '),
      planoArchivo: k === 1 ? x.planoArchivo : null, memoriaArchivo: k === 1 ? x.memoriaArchivo : null }), quien); if (!r.ok) return r; ids.push(r.id); }
    return { ok: true, id: ids[0], ids: ids, aviso: cant + ' equipos cargados: completá la marca, el modelo y el N.º de serie de cada uno con «Editar».' };
  }
  const s = {}; RAD.H_SAL.forEach(h => s[h] = x[h] != null ? x[h] : antes ? antes[h] : '');
  s.ID = antes ? antes.ID : radId_('EQ', cod); s.ESTABLECIMIENTO = cod;
  ['HABILITACION_FECHA', 'HABILITACION_VENCE', 'LEVANTAMIENTO_FECHA', 'LEVANTAMIENTO_PROXIMO', 'CONTROL_CALIDAD_FECHA', 'CONTROL_CALIDAD_PROXIMO', 'EPP_CONTROL_FECHA'].forEach(k => s[k] = radFecha_(s[k]));
  ['SENALIZACION', 'LUZ_ADVERTENCIA'].forEach(k => { if (!s[k]) s[k] = 's/d'; }); if (!s.ESTADO) s.ESTADO = 'En uso';
  const etiqueta = [s.TIPO_EQUIPO, s.SITIO, s.SALA].filter(Boolean).join(' ');
  if (x.planoArchivo) s.PLANO_BLINDAJE = radArchivo_(cod, x.planoArchivo, ['Salas y equipos'], 'Plano ' + etiqueta);
  if (x.memoriaArchivo) s.MEMORIA_BLINDAJE = radArchivo_(cod, x.memoriaArchivo, ['Salas y equipos'], 'Memoria de blindaje ' + etiqueta);
  s.CARGADO_POR = limpio_(quien) || 'Portal'; s.ACTUALIZADO = new Date();
  if (antes) radActualizar_('SALAS_EQUIPOS', RAD.H_SAL, antes.fila, s); else radAgregar_('SALAS_EQUIPOS', RAD.H_SAL, s);
  // Plano y memoria también quedan en DOCUMENTOS, para el control de requisitos
  if (x.planoArchivo) radAgregar_('DOCUMENTOS', RAD.H_DOC, { ID: radId_('RD', cod), ESTABLECIMIENTO: cod, ID_SALA: s.ID, TIPO: 'Plano de ubicación y plomado', TITULO: 'Plano ' + etiqueta, FECHA: new Date(), ARCHIVO: s.PLANO_BLINDAJE, ESTADO: 'Vigente', CARGADO_POR: s.CARGADO_POR, CARGADO: new Date(), SITIO: s.SITIO });
  if (x.memoriaArchivo) radAgregar_('DOCUMENTOS', RAD.H_DOC, { ID: radId_('RD', cod), ESTABLECIMIENTO: cod, ID_SALA: s.ID, TIPO: 'Memoria de cálculo de blindaje', TITULO: 'Memoria de blindaje ' + etiqueta, FECHA: new Date(), ARCHIVO: s.MEMORIA_BLINDAJE, ESTADO: 'Vigente', CARGADO_POR: s.CARGADO_POR, CARGADO: new Date(), SITIO: s.SITIO });
  CacheService.getScriptCache().remove('rad_tablero');
  return { ok: true, id: s.ID, aviso: antes && antes.ESTADO !== 'Baja' && s.ESTADO === 'Baja' ? 'La baja, venta o cesión del equipo se comunica a la autoridad dentro de los 30 días (Dto. 6320/68, art. 37): cargá la comunicación en Documentos.' : '' };
}
function radDocGuardar_(x, quien) {
  const cod = limpio_(x.ESTABLECIMIENTO); if (!cod) return { ok: false, mensaje: 'Falta el establecimiento.' };
  if (!limpio_(x.TIPO)) return { ok: false, mensaje: 'Elegí el tipo de documento.' };
  const L = radLeer_('DOCUMENTOS', RAD.H_DOC), antes = x.ID ? L.find(d => d.ID === x.ID) : null;
  if (x.ID && !antes) return { ok: false, mensaje: 'No se encontró el documento: actualizá la lista.' };
  if (!antes && !x.archivo && !limpio_(x.ARCHIVO)) return { ok: false, mensaje: 'Adjuntá el archivo o pegá el enlace.' };
  const d = {}; RAD.H_DOC.forEach(h => d[h] = x[h] != null ? x[h] : antes ? antes[h] : '');
  d.ID = antes ? antes.ID : radId_('RD', cod); d.ESTABLECIMIENTO = cod; d.FECHA = radFecha_(d.FECHA) || new Date(); d.VENCE = radFecha_(d.VENCE);
  if (x.archivo) d.ARCHIVO = radArchivo_(cod, x.archivo, ['Documentos'], d.TIPO + ' ' + (d.TITULO || ''));
  if (!d.ESTADO) d.ESTADO = 'Vigente'; d.CARGADO_POR = limpio_(quien) || 'Portal'; d.CARGADO = new Date();
  if (antes) radActualizar_('DOCUMENTOS', RAD.H_DOC, antes.fila, d); else radAgregar_('DOCUMENTOS', RAD.H_DOC, d);
  CacheService.getScriptCache().remove('rad_tablero');
  return { ok: true, id: d.ID };
}

// ------------------------------------------------------------------ TABLERO Y DETALLE
function radEstadoFecha_(vence, hoyISO) { if (!vence) return 'sd'; if (vence < hoyISO) return 'vencido'; const l = new Date(hoyISO + 'T12:00:00'); l.setDate(l.getDate() + RAD.AVISO_DIAS); return vence <= Utilities.formatDate(l, TZ, 'yyyy-MM-dd') ? 'porvencer' : 'vigente'; }
// Los informes de MKS son BIMESTRALES (ene-feb, mar-abr, may-jun, jul-ago, sep-oct, nov-dic; dato de Belén, 25/10/2026).
// Un bimestre se identifica por su último mes (aaaa-02, -04, -06, -08, -10, -12), como ya figuraba en CONTROLES.
function radBimDe_(p) { const m = /^(\d{4})-(\d{2})/.exec(limpio_(p));   // acepta «2026-08 · jul–ago 2026»
  if (!m) return limpio_(p); const mm = +m[2]; return m[1] + '-' + String(mm % 2 ? mm + 1 : mm).padStart(2, '0'); }
// Últimos n bimestres terminados; «atraso» = meses que se dan para que llegue el informe (2: el de jul-ago se espera desde octubre)
function radBims_(n, atraso) {
  const d = new Date(); let y = d.getFullYear(), m = d.getMonth() + 1 - (atraso || 0); while (m < 1) { m += 12; y--; } if (m % 2) m--; if (m < 1) { m += 12; y--; }
  const out = []; for (let i = 0; i < n; i++) { out.push(y + '-' + String(m).padStart(2, '0')); m -= 2; if (m < 1) { m += 12; y--; } } return out;
}
const radBimTxt_ = p => { const b = radBimDe_(p), m = /^(\d{4})-(\d{2})$/.exec(b); if (!m) return b; const M = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']; return M[+m[2] - 2] + '–' + M[+m[2] - 1] + ' ' + m[1]; };
const radBimAnt_ = b => { const [y, m] = b.split('-').map(Number); return m === 1 ? (y - 1) + '-12' : y + '-' + String(m - 1).padStart(2, '0'); };
function radMeses_(n) { const out = [], d = new Date(); d.setDate(1); for (let i = 1; i <= n; i++) { const x = new Date(d.getFullYear(), d.getMonth() - i, 1); out.push(Utilities.formatDate(x, TZ, 'yyyy-MM')); } return out; }
function radResumenEst_(cod, D, hoy) {
  const per = D.per.filter(p => p.ESTABLECIMIENTO === cod), act = per.filter(p => p.ESTADO_DOSIMETRO === 'Activo');
  const con = D.con.filter(c => c.ESTABLECIMIENTO === cod && c.ESTADO !== 'Anulado'), meses = radBims_(2, 2);   // últimos 2 bimestres que ya deberían estar informados
  const cub = radMesesCubiertos_(D.dos || [], cod), faltan = act.length ? meses.filter(m => !con.some(c => c.PERIODO === m) && !cub[m] && !cub[radBimAnt_(m)]) : [];
  const eve = D.eve.filter(e => e.ESTABLECIMIENTO === cod && !/Cerrado|Anulado/.test(e.ESTADO));
  const sal = D.sal.filter(s => s.ESTABLECIMIENTO === cod && s.ESTADO !== 'Baja');
  const hab = sal.map(s => radEstadoFecha_(s.HABILITACION_VENCE, hoy));
  const docs = D.doc.filter(d => d.ESTABLECIMIENTO === cod && d.ESTADO === 'Vigente');
  const req = D.req.filter(r => r.ACTIVO !== 'No' && r.DOC_TIPO), cumplidos = req.filter(r => docs.some(d => d.TIPO === r.DOC_TIPO));
  const sit = D.sit.filter(s => s.ESTABLECIMIENTO === cod), inv = (D.inv || []).filter(c => c.ESTABLECIMIENTO === cod && /Abierto|análisis/.test(c.ESTADO));
  return { invAbiertas: inv.length, sitiosRx: sit.filter(s => s.RAYOS_X === 'Sí').length, sitiosConfirmar: sit.filter(s => s.RAYOS_X === 'A confirmar').length, personas: per.length, activos: act.length, bajas: per.filter(p => /^Baja/.test(p.ESTADO_DOSIMETRO)).length, extraviados: per.filter(p => p.ESTADO_DOSIMETRO === 'Extraviado').length,
    sinAutorizacion: act.filter(p => p.AUTORIZACION_INDIVIDUAL !== 'Sí').length, ultimoControl: con.map(c => c.PERIODO).sort().pop() || '', faltanMeses: faltan,
    eventosAbiertos: eve.length, anormalesAbiertos: eve.filter(e => /anormal|accidental/i.test(e.TIPO)).length, equipos: sal.length,
    habVencidas: hab.filter(h => h === 'vencido').length, habSinDato: hab.filter(h => h === 'sd').length, habPorVencer: hab.filter(h => h === 'porvencer').length,
    sinPlano: sal.filter(s => !limpio_(s.PLANO_BLINDAJE)).length, requisitos: req.length, requisitosConDoc: cumplidos.length };
}
function radDatos_() {
  return { per: radLeer_('PERSONAL_EXPUESTO', RAD.H_PER).map(p => Object.assign(p, { ESTABLECIMIENTO: limpio_(p.ESTABLECIMIENTO), DNI: String(p.DNI || '').replace(/\D/g, '') })),
    con: radLeer_('CONTROLES', RAD.H_CON).map(c => Object.assign(c, { ESTABLECIMIENTO: limpio_(c.ESTABLECIMIENTO), PERIODO: radBimDe_(c.PERIODO) })),
    eve: radLeer_('EVENTOS', RAD.H_EVE).map(e => Object.assign(e, { ESTABLECIMIENTO: limpio_(e.ESTABLECIMIENTO) })),
    sal: radLeer_('SALAS_EQUIPOS', RAD.H_SAL).map(s => Object.assign(s, { ESTABLECIMIENTO: limpio_(s.ESTABLECIMIENTO) })),
    doc: radLeer_('DOCUMENTOS', RAD.H_DOC).map(d => Object.assign(d, { ESTABLECIMIENTO: limpio_(d.ESTABLECIMIENTO) })),
    req: radLeer_('REQUISITOS', RAD.H_REQ),
    sit: (pRad_().getSheetByName('SITIOS_RX') ? radLeer_('SITIOS_RX', RAD.H_SIT) : []).map(s => Object.assign(s, { ESTABLECIMIENTO: limpio_(s.ESTABLECIMIENTO) })),
    dos: radDosisLeer_(), inv: radInvLeer_() };
}
function radTablero_(fresco) {
  const c = CacheService.getScriptCache(); if (!fresco) { const k = c.get('rad_tablero'); if (k) return JSON.parse(k); }
  const D = radDatos_(), hoy = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd'), E = pEstablecimientos_();
  const est = E.filas.map(f => { const cod = limpio_(f.v[0]); return { cod: cod, nombre: f.v[1], tipo: limpio_(f.v[3]), area: f.v[4], r: radResumenEst_(cod, D, hoy) }; });
  const conDatos = est.filter(e => e.r.personas || e.r.equipos || e.r.sitiosRx);
  const out = { ok: true, hoy: hoy, establecimientos: est, libro: pRad_().getUrl(), carpeta: DriveApp.getFolderById(PropertiesService.getScriptProperties().getProperty(RAD.P_CARPETA)).getUrl(),
    totales: { establecimientos: conDatos.length, activos: D.per.filter(p => p.ESTADO_DOSIMETRO === 'Activo').length, extraviados: D.per.filter(p => p.ESTADO_DOSIMETRO === 'Extraviado').length,
      eventosAbiertos: D.eve.filter(e => !/Cerrado|Anulado/.test(e.ESTADO)).length, invAbiertas: (D.inv || []).filter(c => /Abierto|análisis/.test(c.ESTADO)).length, equipos: D.sal.filter(s => s.ESTADO !== 'Baja').length,
      habVencidas: est.reduce((a, e) => a + e.r.habVencidas, 0), faltanControles: est.filter(e => e.r.faltanMeses.length).length,
      sitiosRx: D.sit.filter(s => s.RAYOS_X === 'Sí').length, sitiosConfirmar: D.sit.filter(s => s.RAYOS_X === 'A confirmar').length } };
  try { c.put('rad_tablero', JSON.stringify(out), 600); } catch (e) {}
  return out;
}
function radDetalle_(cod) {
  cod = limpio_(cod); const D = radDatos_(), hoy = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd');
  const de = l => l.filter(x => x.ESTABLECIMIENTO === cod);
  const docs = de(D.doc).filter(d => d.ESTADO !== 'Anulado');
  const req = D.req.filter(r => r.ACTIVO !== 'No').map(r => ({ id: r.ID, alcance: r.ALCANCE, requisito: r.REQUISITO, norma: r.NORMA, como: r.COMO_SE_CUMPLE, docTipo: r.DOC_TIPO,
    docs: r.DOC_TIPO ? docs.filter(d => d.TIPO === r.DOC_TIPO && d.ESTADO === 'Vigente').map(d => ({ titulo: d.TITULO, archivo: d.ARCHIVO, vence: d.VENCE })) : null }));
  const mov = radLeer_('MOVIMIENTOS', RAD.H_MOV).filter(m => limpio_(m.ESTABLECIMIENTO) === cod).slice(-200).reverse();
  return { ok: true, cod: cod, hoy: hoy, resumen: radResumenEst_(cod, D, hoy), personal: radConBase_(de(D.per)), movimientos: mov,
    controles: de(D.con).sort((a, b) => String(b.PERIODO).localeCompare(String(a.PERIODO))), meses: radBims_(6, 1),   // últimos 6 bimestres (un año)
    eventos: de(D.eve).reverse(), salas: de(D.sal).map(s => Object.assign(s, { hab: radEstadoFecha_(s.HABILITACION_VENCE, hoy), lev: radEstadoFecha_(s.LEVANTAMIENTO_PROXIMO, hoy), cc: radEstadoFecha_(s.CONTROL_CALIDAD_PROXIMO, hoy) })),
    documentos: docs.reverse(), requisitos: req, sugeridas: radSugeridas_(cod), cruce: radCruce_(cod, de(D.per)), sitios: radSitiosEst_(cod, D.sit),
    listas: { rxSitio: RAD.RX_SITIO, sectores: RAD.SECTORES, tiposDosi: RAD.TIPOS_DOSI, estadosDosi: RAD.ESTADOS_DOSI, tiposEve: RAD.TIPOS_EVE, equipos: RAD.EQUIPOS, tiposDoc: RAD.TIPOS_DOC, estadosInv: RAD.ESTADOS_INV, causasInv: RAD.CAUSAS_INV },
    investigaciones: de(D.inv).reverse(),
    dosis: de(D.dos).filter(d => d.ESTADO !== 'Anulado').sort((a, b) => String(b.PERIODO_HASTA).localeCompare(String(a.PERIODO_HASTA)) || String(a.APELLIDO_Y_NOMBRE).localeCompare(String(b.APELLIDO_Y_NOMBRE))),
    cubiertos: radMesesCubiertos_(D.dos, cod), limites: { anual: RAD.LIM_ANUAL, periodo: RAD.LIM_PERIODO },
    mksCorreo: typeof radMksCorreo_ === 'function' ? radMksCorreo_() : '', carpeta: radCarpetaEst_(cod).getUrl(), carpetaDosimetria: radCarpetaEst_(cod, ['Dosimetría']).getUrl(), libro: pRad_().getUrl() };
}

// ------------------------------------------------------------------ «MI ESTABLECIMIENTO» (DNI y clave personal, módulo «Radiaciones» en ACCESOS): acciones «r_…»
// Desde Código.gs › doPost (después de validar acceso y módulo). Carga de la secretaría y, más adelante, de los referentes:
// personal con dosímetro (altas, bajas a pedido o por fin de exposición, reactivaciones) y eventos. Controles mensuales y
// documentos los carga Higiene y Seguridad desde el portal.
function radRed_(d) {
  if (!PropertiesService.getScriptProperties().getProperty(RAD.P_LIBRO)) return { ok: false, mensaje: 'El módulo de radiaciones todavía no está habilitado.' };
  const x = d.datos || {}, cod = limpio_(d.est), quien = x.quien || 'Mi establecimiento';
  switch (d.accion) {
    case 'r_datos': {
      const D = radDatos_(), de = l => l.filter(o => o.ESTABLECIMIENTO === cod);
      return { ok: true, personal: radConBase_(de(D.per)), eventos: de(D.eve).reverse().slice(0, 60), sitios: radSitiosEst_(cod, D.sit).filter(s => s.RAYOS_X !== 'No').map(s => s.SITIO),
        sugeridas: radSugeridas_(cod), listas: { sectores: RAD.SECTORES, tiposDosi: RAD.TIPOS_DOSI, tiposEve: RAD.TIPOS_EVE },
        // «Formularios del dosímetro» (25/10/2026): el personal de Radiología rota entre el HZT y el HMH y se carga en el HZT, así que desde cualquiera de los dos se elige entre ambos
        personalUnidad: (cod === 'HZT' || cod === 'HMH') ? radConBase_(D.per.filter(o => o.ESTABLECIMIENTO === 'HZT' || o.ESTABLECIMIENTO === 'HMH')) : null };
    }
    case 'r_dni': return { ok: true, persona: radDniBase_(x.dni) };
    case 'r_mail_mks': return radMailMks_(Object.assign({}, x, { cod: cod }), quien);   // borrador en el Gmail de HyS (no se envía solo)
    case 'r_persona_guardar': {
      if (x.ID) { const p = radLeer_('PERSONAL_EXPUESTO', RAD.H_PER).find(o => o.ID === x.ID); if (!p || limpio_(p.ESTABLECIMIENTO) !== cod) return { ok: false, mensaje: 'Esa persona no es de este establecimiento.' }; }
      x.ESTABLECIMIENTO = cod; return conLock_(() => radPersonaGuardar_(x, quien));
    }
    case 'r_evento_guardar': {
      if (x.ID) { const e = radLeer_('EVENTOS', RAD.H_EVE).find(o => o.ID === x.ID); if (!e || limpio_(e.ESTABLECIMIENTO) !== cod) return { ok: false, mensaje: 'Ese evento no es de este establecimiento.' }; }
      x.ESTABLECIMIENTO = cod; return conLock_(() => radEventoGuardar_(x, quien));
    }
  }
  return { ok: false, error: 'Acción desconocida.' };
}

// ------------------------------------------------------------------ ENTRADA DEL PORTAL (clave de Higiene y Seguridad): acciones «p_rad_…»
function radPortal_(accion, x) {
  if (!PropertiesService.getScriptProperties().getProperty(RAD.P_LIBRO)) return { ok: false, instalado: false, mensaje: 'El módulo 9 todavía no está instalado: en el editor de Apps Script, ejecutá una vez construirModuloRadiaciones().' };
  const quien = x.quien || 'Higiene y Seguridad (portal)';
  switch (accion) {
    case 'p_rad_tablero': return radTablero_(x.fresco);
    case 'p_rad_detalle': return radDetalle_(x.cod);
    case 'p_rad_dni': return { ok: true, persona: radDniBase_(x.dni) };
    case 'p_rad_persona_guardar': return conLock_(() => radPersonaGuardar_(x, quien));
    case 'p_rad_mail_mks': return radMailMks_(x, quien);   // borrador de correo a MKS con el formulario adjunto (RadFormularios.gs)
    case 'p_rad_control_guardar': return conLock_(() => radControlGuardar_(x, quien));
    case 'p_rad_dosis_guardar': return conLock_(() => radDosisGuardar_(x, quien));
    case 'p_rad_inv_guardar': return conLock_(() => radInvGuardar_(x, quien));
    case 'p_rad_inv_revisar': return conLock_(() => radInvRevisar_(quien));
    case 'p_rad_evento_guardar': return conLock_(() => radEventoGuardar_(x, quien));
    case 'p_rad_sala_guardar': return conLock_(() => radSalaGuardar_(x, quien));
    case 'p_rad_doc_guardar': return conLock_(() => radDocGuardar_(x, quien));
    case 'p_rad_sitio_guardar': return conLock_(() => radSitioGuardar_(x, quien));
  }
  return { ok: false, error: 'Acción desconocida.' };
}
