/**
 * SISTEMA HyS · MÓDULO 9 · RADIACIONES IONIZANTES (rayos X: radiología, tomografía, arco en C y odontológicos)
 * Versión 0 (13/10/2026); 0.1 (13/10/2026): sitios (edificios, CAPS, sede ex ADOS) con columna SITIO y hoja SITIOS_RX. Para toda la red. Carga: Higiene y Seguridad y secretaría desde el portal; los referentes de
 * radiaciones se habilitan más adelante (BASE COMÚN › HABILITACION / ACCESOS).
 *
 * Libro propio «RADIACIONES IONIZANTES · Sistema HyS» (propiedad RAD_ID). Hojas (todo editable a mano):
 *   PERSONAL_EXPUESTO  una fila por persona expuesta: datos de la BASE DE TRABAJADORES + dosímetro, estado y autorización
 *   MOVIMIENTOS        historial: alta de exposición, alta/baja de dosímetro (a pedido o por fin de exposición), reactivación,
 *                      cambio de dosímetro, extravío. Nada se pisa
 *   CONTROLES          un control mensual por fila (PDF del servicio de dosimetría, guardado en Drive). El sistema no lee el PDF
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
 * Instalación: ejecutar una vez construirModuloRadiaciones().
 */
const RAD = {
  SIS: '16AIJZcmxG9EBM3-D-J4vRtvruHK9DVrA',   // SISTEMA HyS
  CARPETA: 'MÓDULO 9 · RADIACIONES IONIZANTES',
  P_LIBRO: 'RAD_ID', P_CARPETA: 'RAD_CARPETA',
  H_PER: ['ID', 'ESTABLECIMIENTO', 'DNI', 'CUIL', 'APELLIDO_Y_NOMBRE', 'SERVICIO', 'FUNCION', 'SECTOR_EXPOSICION', 'DOSIMETRO_NRO', 'TIPO_DOSIMETRO', 'PROVEEDOR',
    'ESTADO_DOSIMETRO', 'INICIO_EXPOSICION', 'ALTA_DOSIMETRO', 'BAJA_DOSIMETRO', 'MOTIVO_BAJA', 'AUTORIZACION_INDIVIDUAL', 'AUTORIZACION_NRO', 'AUTORIZACION_VENCE',
    'EN_NTE', 'OBSERVACIONES', 'CARGADO_POR', 'ACTUALIZADO', 'SITIO'],
  H_MOV: ['FECHA', 'ID_PERSONA', 'ESTABLECIMIENTO', 'DNI', 'APELLIDO_Y_NOMBRE', 'TIPO', 'DOSIMETRO_NRO', 'DETALLE', 'DOCUMENTO', 'CARGADO_POR', 'CARGADO'],
  H_CON: ['ID', 'ESTABLECIMIENTO', 'PERIODO', 'PROVEEDOR', 'FECHA_RECEPCION', 'ARCHIVO', 'CON_ANORMALES', 'OBSERVACIONES', 'ESTADO', 'CARGADO_POR', 'CARGADO', 'SITIO'],
  H_EVE: ['ID', 'FECHA', 'ESTABLECIMIENTO', 'ID_PERSONA', 'DNI', 'APELLIDO_Y_NOMBRE', 'TIPO', 'PERIODO', 'DOSIS_MSV', 'DESCRIPCION', 'ACCIONES', 'COMUNICADO_A',
    'FECHA_COMUNICACION', 'ESTADO', 'ARCHIVO', 'CARGADO_POR', 'ACTUALIZADO', 'SITIO'],
  H_SAL: ['ID', 'ESTABLECIMIENTO', 'SITIO', 'SALA', 'TIPO_EQUIPO', 'MARCA', 'MODELO', 'SERIE', 'ANIO', 'HABILITACION_NRO', 'HABILITACION_FECHA', 'HABILITACION_VENCE',
    'RESPONSABLE_INSTALACION', 'RESPONSABLE_USO', 'PLANO_BLINDAJE', 'MEMORIA_BLINDAJE', 'LEVANTAMIENTO_FECHA', 'LEVANTAMIENTO_PROXIMO', 'CONTROL_CALIDAD_FECHA',
    'CONTROL_CALIDAD_PROXIMO', 'SENALIZACION', 'LUZ_ADVERTENCIA', 'EPP_PLOMADO', 'EPP_CONTROL_FECHA', 'ESTADO', 'OBSERVACIONES', 'CARGADO_POR', 'ACTUALIZADO'],
  H_DOC: ['ID', 'ESTABLECIMIENTO', 'ID_SALA', 'TIPO', 'TITULO', 'FECHA', 'VENCE', 'ARCHIVO', 'ESTADO', 'OBSERVACIONES', 'CARGADO_POR', 'CARGADO', 'SITIO'],
  H_SIT: ['ID', 'ESTABLECIMIENTO', 'SITIO', 'NOMBRE_OFICIAL', 'TIPO_SITIO', 'RAYOS_X', 'EQUIPOS', 'OBSERVACIONES', 'CARGADO_POR', 'ACTUALIZADO'],
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
    if (cod === 'HZT' && /central/i.test(sitio)) return ['Sí', 'Rayos X y tomografía', ''];
    if (cod === 'HZT' && /ados/i.test(sitio)) return ['Sí', 'Odontológico', 'Confirmar tipo y cantidad de equipos.'];
    if (cod === 'HZT' && /CAPS/i.test(tipo)) return ['Sí', 'Odontológico', 'Confirmar tipo de equipo.'];
    if (cod === 'HMH' && /edificio/i.test(tipo)) return ['Sí', 'Rayos X digital; arco en C (quirófano)', 'Confirmar arco en C.'];
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
  ['Qué es', 'El registro de rayos X de toda la red: personal expuesto y sus dosímetros, controles mensuales, eventos, salas y equipos, documentos y requisitos legales. Versión 0.'],
  ['Desde dónde se carga', 'Portal HyS › 9 · Radiaciones ionizantes. Todo se puede cargar y corregir también acá, en cada hoja (las filas empiezan en la 6).'],
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
  return pTabla_(sh, H.length).map(r => { const o = { fila: r.fila }; H.forEach((h, i) => o[h] = r.v[i] instanceof Date ? radISO_(r.v[i]) : r.v[i]); return o; });
}
function radCarpetaEst_(cod, sub) {
  const p = PropertiesService.getScriptProperties(), dir = DriveApp.getFolderById(p.getProperty(RAD.P_CARPETA));
  const E = pEstablecimientos_().filas.find(f => limpio_(f.v[0]) === cod), nombre = cod + (E ? ' · ' + limpio_(E.v[1]) : '');
  let d = carpeta_(carpeta_(dir, 'Establecimientos'), nombre); (sub || []).forEach(s => d = carpeta_(d, s)); return d;
}
// Archivo { base64: 'data:…;base64,…', nombre } → carpeta indicada. Devuelve el enlace.
function radArchivo_(cod, a, sub, etiqueta) {
  const src = a && (a.base64 || a.dataUrl || a); const m = /^data:([\w/.+-]+);base64,(.+)$/.exec(String(src || '')); if (!m) return '';
  const ext = /pdf/.test(m[1]) ? '.pdf' : /png/.test(m[1]) ? '.png' : '.jpg';
  const nombre = (etiqueta + ' - ' + Utilities.formatDate(new Date(), TZ, 'yyyyMMdd-HHmmss')).replace(/[^\w\-.áéíóúñÁÉÍÓÚÑ ,·]/g, '_') + ext;
  return radCarpetaEst_(cod, sub).createFile(Utilities.newBlob(Utilities.base64Decode(m[2]), m[1], nombre)).getUrl();
}
function radAgregar_(hoja, H, obj) { const sh = pRad_().getSheetByName(hoja); const v = H.map(h => obj[h] == null ? '' : obj[h]); sh.getRange(Math.max(sh.getLastRow(), 5) + 1, 1, 1, v.length).setValues([v]); }
function radActualizar_(hoja, H, fila, obj) { const sh = pRad_().getSheetByName(hoja); const v = H.map(h => obj[h] == null ? '' : obj[h]); sh.getRange(fila, 1, 1, v.length).setValues([v]); }
const radId_ = (pre, cod) => pre + '-' + String(cod).replace(/\s+/g, '').toUpperCase().slice(0, 6) + '-' + Utilities.formatDate(new Date(), TZ, 'yyMMddHHmmss') + Math.random().toString(36).slice(2, 4).toUpperCase();
function radMov_(p, tipo, detalle, doc, quien) {
  radAgregar_('MOVIMIENTOS', RAD.H_MOV, { FECHA: new Date(), ID_PERSONA: p.ID, ESTABLECIMIENTO: p.ESTABLECIMIENTO, DNI: p.DNI, APELLIDO_Y_NOMBRE: p.APELLIDO_Y_NOMBRE, TIPO: tipo,
    DOSIMETRO_NRO: p.DOSIMETRO_NRO, DETALLE: detalle || '', DOCUMENTO: doc || '', CARGADO_POR: quien || 'Portal', CARGADO: new Date() });
}
// Datos de la BASE DE TRABAJADORES por DNI (hoja TODOS)
function radDniBase_(dni) {
  dni = String(dni || '').replace(/\D/g, ''); if (dni.length < 6) return null;
  const T = pBT_().getSheetByName('TODOS'), n = T.getLastRow() - 5; if (n < 1) return null;
  const r = T.getRange(6, 1, n, 22).getValues().find(x => String(x[1]).replace(/\D/g, '') === dni);
  return r ? { dni: dni, cuil: limpio_(r[0]), nombre: [r[2], r[3]].filter(Boolean).join(', '), funcion: limpio_(r[5] || r[6]), servicio: limpio_(r[7]), est: limpio_(r[21]), estado: limpio_(r[19]) } : null;
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
  const dni = String(x.DNI || '').replace(/\D/g, ''), nom = limpio_(x.APELLIDO_Y_NOMBRE);
  if (!nom) return { ok: false, mensaje: 'Falta el apellido y nombre.' };
  if (dni && (dni.length < 7 || dni.length > 8)) return { ok: false, mensaje: 'El DNI tiene que tener 7 u 8 números.' };
  const L = radLeer_('PERSONAL_EXPUESTO', RAD.H_PER); let antes = null;
  if (x.ID) { antes = L.find(p => p.ID === x.ID); if (!antes) return { ok: false, mensaje: 'No se encontró la persona: actualizá la lista.' }; }
  else if (dni && L.some(p => String(p.DNI).replace(/\D/g, '') === dni && limpio_(p.ESTABLECIMIENTO) === cod)) return { ok: false, mensaje: 'Esa persona ya está cargada en este establecimiento: abrila y usá «Reactivar» si había pedido la baja.' };
  const hoy = new Date(), p = {};
  RAD.H_PER.forEach(h => p[h] = x[h] != null ? x[h] : antes ? antes[h] : '');
  p.ID = antes ? antes.ID : radId_('RX', cod); p.ESTABLECIMIENTO = cod; p.DNI = dni; p.APELLIDO_Y_NOMBRE = nom;
  ['INICIO_EXPOSICION', 'ALTA_DOSIMETRO', 'BAJA_DOSIMETRO', 'AUTORIZACION_VENCE'].forEach(k => p[k] = radFecha_(p[k]));
  if (!p.ESTADO_DOSIMETRO) p.ESTADO_DOSIMETRO = p.DOSIMETRO_NRO ? 'Activo' : 'Sin dosímetro (s/d)';
  ['AUTORIZACION_INDIVIDUAL', 'EN_NTE'].forEach(k => { if (!/^(Sí|No)$/.test(p[k])) p[k] = 's/d'; });
  p.CARGADO_POR = limpio_(quien) || 'Portal'; p.ACTUALIZADO = hoy;
  const doc = x.archivo ? radArchivo_(cod, x.archivo, ['Documentos'], (x.movimiento && x.movimiento.tipo || 'Personal') + ' ' + nom) : '';
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
  return { ok: true, id: p.ID, avisoComunicar: movs.length ? 'Recordá comunicar el cambio de personal con dosímetro a la autoridad sanitaria (Dto. 6320/68, art. 22).' : '' };
}

// ------------------------------------------------------------------ CONTROLES MENSUALES (PDF)
function radControlGuardar_(x, quien) {
  const cod = limpio_(x.ESTABLECIMIENTO), per = limpio_(x.PERIODO);
  if (!cod) return { ok: false, mensaje: 'Falta el establecimiento.' };
  if (!/^\d{4}-\d{2}$/.test(per)) return { ok: false, mensaje: 'Elegí el mes del control.' };
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

// ------------------------------------------------------------------ EVENTOS
function radEventoGuardar_(x, quien) {
  const cod = limpio_(x.ESTABLECIMIENTO); if (!cod) return { ok: false, mensaje: 'Falta el establecimiento.' };
  if (!limpio_(x.TIPO)) return { ok: false, mensaje: 'Elegí el tipo de evento.' };
  const L = radLeer_('EVENTOS', RAD.H_EVE), antes = x.ID ? L.find(e => e.ID === x.ID) : null;
  if (x.ID && !antes) return { ok: false, mensaje: 'No se encontró el evento: actualizá la lista.' };
  const per = x.ID_PERSONA ? radLeer_('PERSONAL_EXPUESTO', RAD.H_PER).find(p => p.ID === x.ID_PERSONA) : null;
  const e = {}; RAD.H_EVE.forEach(h => e[h] = x[h] != null ? x[h] : antes ? antes[h] : '');
  e.ID = antes ? antes.ID : radId_('EV', cod); e.ESTABLECIMIENTO = cod; e.FECHA = radFecha_(e.FECHA) || new Date(); e.FECHA_COMUNICACION = radFecha_(e.FECHA_COMUNICACION);
  if (per) { e.DNI = per.DNI; e.APELLIDO_Y_NOMBRE = per.APELLIDO_Y_NOMBRE; }
  if (!e.ESTADO) e.ESTADO = 'Abierto';
  if (x.archivo) e.ARCHIVO = radArchivo_(cod, x.archivo, ['Eventos'], e.TIPO + ' ' + (e.APELLIDO_Y_NOMBRE || ''));
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
function radMeses_(n) { const out = [], d = new Date(); d.setDate(1); for (let i = 1; i <= n; i++) { const x = new Date(d.getFullYear(), d.getMonth() - i, 1); out.push(Utilities.formatDate(x, TZ, 'yyyy-MM')); } return out; }
function radResumenEst_(cod, D, hoy) {
  const per = D.per.filter(p => p.ESTABLECIMIENTO === cod), act = per.filter(p => p.ESTADO_DOSIMETRO === 'Activo');
  const con = D.con.filter(c => c.ESTABLECIMIENTO === cod && c.ESTADO !== 'Anulado'), meses = radMeses_(3);
  const faltan = act.length ? meses.filter(m => !con.some(c => c.PERIODO === m)) : [];
  const eve = D.eve.filter(e => e.ESTABLECIMIENTO === cod && !/Cerrado|Anulado/.test(e.ESTADO));
  const sal = D.sal.filter(s => s.ESTABLECIMIENTO === cod && s.ESTADO !== 'Baja');
  const hab = sal.map(s => radEstadoFecha_(s.HABILITACION_VENCE, hoy));
  const docs = D.doc.filter(d => d.ESTABLECIMIENTO === cod && d.ESTADO === 'Vigente');
  const req = D.req.filter(r => r.ACTIVO !== 'No' && r.DOC_TIPO), cumplidos = req.filter(r => docs.some(d => d.TIPO === r.DOC_TIPO));
  const sit = D.sit.filter(s => s.ESTABLECIMIENTO === cod);
  return { sitiosRx: sit.filter(s => s.RAYOS_X === 'Sí').length, sitiosConfirmar: sit.filter(s => s.RAYOS_X === 'A confirmar').length, personas: per.length, activos: act.length, bajas: per.filter(p => /^Baja/.test(p.ESTADO_DOSIMETRO)).length, extraviados: per.filter(p => p.ESTADO_DOSIMETRO === 'Extraviado').length,
    sinAutorizacion: act.filter(p => p.AUTORIZACION_INDIVIDUAL !== 'Sí').length, ultimoControl: con.map(c => c.PERIODO).sort().pop() || '', faltanMeses: faltan,
    eventosAbiertos: eve.length, anormalesAbiertos: eve.filter(e => /anormal|accidental/i.test(e.TIPO)).length, equipos: sal.length,
    habVencidas: hab.filter(h => h === 'vencido').length, habSinDato: hab.filter(h => h === 'sd').length, habPorVencer: hab.filter(h => h === 'porvencer').length,
    sinPlano: sal.filter(s => !limpio_(s.PLANO_BLINDAJE)).length, requisitos: req.length, requisitosConDoc: cumplidos.length };
}
function radDatos_() {
  return { per: radLeer_('PERSONAL_EXPUESTO', RAD.H_PER).map(p => Object.assign(p, { ESTABLECIMIENTO: limpio_(p.ESTABLECIMIENTO), DNI: String(p.DNI || '').replace(/\D/g, '') })),
    con: radLeer_('CONTROLES', RAD.H_CON).map(c => Object.assign(c, { ESTABLECIMIENTO: limpio_(c.ESTABLECIMIENTO), PERIODO: limpio_(c.PERIODO) })),
    eve: radLeer_('EVENTOS', RAD.H_EVE).map(e => Object.assign(e, { ESTABLECIMIENTO: limpio_(e.ESTABLECIMIENTO) })),
    sal: radLeer_('SALAS_EQUIPOS', RAD.H_SAL).map(s => Object.assign(s, { ESTABLECIMIENTO: limpio_(s.ESTABLECIMIENTO) })),
    doc: radLeer_('DOCUMENTOS', RAD.H_DOC).map(d => Object.assign(d, { ESTABLECIMIENTO: limpio_(d.ESTABLECIMIENTO) })),
    req: radLeer_('REQUISITOS', RAD.H_REQ),
    sit: (pRad_().getSheetByName('SITIOS_RX') ? radLeer_('SITIOS_RX', RAD.H_SIT) : []).map(s => Object.assign(s, { ESTABLECIMIENTO: limpio_(s.ESTABLECIMIENTO) })) };
}
function radTablero_(fresco) {
  const c = CacheService.getScriptCache(); if (!fresco) { const k = c.get('rad_tablero'); if (k) return JSON.parse(k); }
  const D = radDatos_(), hoy = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd'), E = pEstablecimientos_();
  const est = E.filas.map(f => { const cod = limpio_(f.v[0]); return { cod: cod, nombre: f.v[1], tipo: limpio_(f.v[3]), area: f.v[4], r: radResumenEst_(cod, D, hoy) }; });
  const conDatos = est.filter(e => e.r.personas || e.r.equipos || e.r.sitiosRx);
  const out = { ok: true, hoy: hoy, establecimientos: est, libro: pRad_().getUrl(), carpeta: DriveApp.getFolderById(PropertiesService.getScriptProperties().getProperty(RAD.P_CARPETA)).getUrl(),
    totales: { establecimientos: conDatos.length, activos: D.per.filter(p => p.ESTADO_DOSIMETRO === 'Activo').length, extraviados: D.per.filter(p => p.ESTADO_DOSIMETRO === 'Extraviado').length,
      eventosAbiertos: D.eve.filter(e => !/Cerrado|Anulado/.test(e.ESTADO)).length, equipos: D.sal.filter(s => s.ESTADO !== 'Baja').length,
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
  return { ok: true, cod: cod, hoy: hoy, resumen: radResumenEst_(cod, D, hoy), personal: de(D.per), movimientos: mov,
    controles: de(D.con).sort((a, b) => String(b.PERIODO).localeCompare(String(a.PERIODO))), meses: radMeses_(12),
    eventos: de(D.eve).reverse(), salas: de(D.sal).map(s => Object.assign(s, { hab: radEstadoFecha_(s.HABILITACION_VENCE, hoy), lev: radEstadoFecha_(s.LEVANTAMIENTO_PROXIMO, hoy), cc: radEstadoFecha_(s.CONTROL_CALIDAD_PROXIMO, hoy) })),
    documentos: docs.reverse(), requisitos: req, sugeridas: radSugeridas_(cod), cruce: radCruce_(cod, de(D.per)), sitios: radSitiosEst_(cod, D.sit),
    listas: { rxSitio: RAD.RX_SITIO, sectores: RAD.SECTORES, tiposDosi: RAD.TIPOS_DOSI, estadosDosi: RAD.ESTADOS_DOSI, tiposEve: RAD.TIPOS_EVE, equipos: RAD.EQUIPOS, tiposDoc: RAD.TIPOS_DOC },
    carpeta: radCarpetaEst_(cod).getUrl(), libro: pRad_().getUrl() };
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
      return { ok: true, personal: de(D.per), eventos: de(D.eve).reverse().slice(0, 60), sitios: radSitiosEst_(cod, D.sit).filter(s => s.RAYOS_X !== 'No').map(s => s.SITIO),
        sugeridas: radSugeridas_(cod), listas: { sectores: RAD.SECTORES, tiposDosi: RAD.TIPOS_DOSI, tiposEve: RAD.TIPOS_EVE } };
    }
    case 'r_dni': return { ok: true, persona: radDniBase_(x.dni) };
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
    case 'p_rad_control_guardar': return conLock_(() => radControlGuardar_(x, quien));
    case 'p_rad_evento_guardar': return conLock_(() => radEventoGuardar_(x, quien));
    case 'p_rad_sala_guardar': return conLock_(() => radSalaGuardar_(x, quien));
    case 'p_rad_doc_guardar': return conLock_(() => radDocGuardar_(x, quien));
    case 'p_rad_sitio_guardar': return conLock_(() => radSitioGuardar_(x, quien));
  }
  return { ok: false, error: 'Acción desconocida.' };
}
