/**
 * SISTEMA HyS · BASES
 * Construye los dos libros de base del sistema, en 01 GENERAL:
 *   1. BASE COMÚN: establecimientos (con código), sitios, áreas, red HyS, comités y áreas, equivalencias de nombres, listas.
 *   2. BASE DE TRABAJADORES: una hoja por establecimiento, cargada con los trabajadores de BASE_PERSONAS_CAPACITACIONES_2026.
 * La base de capacitaciones NO se modifica: solo se lee.
 *
 * Uso (desde el editor, en este orden):
 *   construirBaseComun()          → crea BASE COMÚN
 *   construirBaseTrabajadores()   → crea BASE DE TRABAJADORES (usa las equivalencias de BASE COMÚN)
 *   corregirEnlacesGeneral()      → arregla la columna «Libro» de ESTABLECIMIENTOS en el libro general
 * Si un libro ya fue creado, la función avisa y no crea otro.
 */

const BASES = {
  CARPETA_GENERAL: '1DU3TtUG9OHBDy_t_NMPftzd8sfzdPZ4U',            // SISTEMA HyS › 01 GENERAL
  CAPACITACIONES: '1t3-mjoObnPcl9qNGfAeHVPZEFtSnVrw85302LTbHddA',     // BASE_PERSONAS_CAPACITACIONES_2026 (solo lectura)
  AZUL: '#0D313F', PATAGONIA: '#5894A7', GRIS: '#E4EAED', CLARO: '#F4F7F8',
  CABECERAS: { 'Área Programática Norte': 'HZPM', 'Área Programática Trelew': 'HZT', 'Área Programática Esquel': 'HZE', 'Área Programática Comodoro Rivadavia': 'HRCR' },
};

// ------------------------------------------------------------------ AUXILIARES DE FORMATO
// Fórmulas: se escriben con «¦» como separador de argumentos. Se prueba con «,» y, si la planilla
// devuelve error (configuración regional con coma decimal), se reescribe con «;».
function setF_(range, f) {
  range.setFormula(f.replace(/¦/g, ','));
  SpreadsheetApp.flush();
  if (/^#(ERROR|NAME)/.test(String(range.getDisplayValue()))) range.setFormula(f.replace(/¦/g, ';'));
}
function encabezar_(sh, titulo, subtitulo, cols, ayudas, grises) {
  sh.clear();
  sh.getRange(1, 1).setValue(titulo).setFontSize(16).setFontWeight('bold').setFontColor(BASES.AZUL);
  sh.getRange(2, 1).setValue(subtitulo).setFontColor('#4F616B').setFontStyle('italic');
  sh.getRange(3, 1, 1, Math.max(cols.length, 1)).setBackground(BASES.PATAGONIA);
  sh.setRowHeight(3, 4);
  const h = sh.getRange(5, 1, 1, cols.length);
  h.setValues([cols]).setFontWeight('bold').setFontColor('#FFFFFF').setBackground(BASES.AZUL).setWrap(true).setVerticalAlignment('middle');
  (grises || []).forEach(i => sh.getRange(5, i + 1).setBackground('#4F616B'));
  if (ayudas) ayudas.forEach((a, i) => { if (a) sh.getRange(5, i + 1).setNote(a); });
  sh.setFrozenRows(5);
  sh.setRowHeight(5, 36);
  return h;
}
function grisCols_(sh, idxs, nFilas) { idxs.forEach(i => sh.getRange(6, i + 1, Math.max(nFilas, 200), 1).setBackground(BASES.GRIS).setFontColor('#4F616B')); }
function proteger_(sh, rangos, desc) {
  rangos.forEach(r => { const p = r.protect().setDescription(desc); p.setWarningOnly(true); });
}
function lista_(sh, col, nFilas, valores) {
  const regla = SpreadsheetApp.newDataValidation().requireValueInList(valores, true).setAllowInvalid(true).build();
  sh.getRange(6, col + 1, Math.max(nFilas, 500), 1).setDataValidation(regla);
}
function nuevoLibro_(nombre, propiedad) {
  const p = PropertiesService.getScriptProperties(), id = p.getProperty(propiedad);
  if (id) { try { const f = DriveApp.getFileById(id); if (!f.isTrashed()) { Logger.log('Ya existe «' + nombre + '»: ' + f.getUrl() + ' . Si querés rehacerlo, mandalo a la papelera y volvé a ejecutar.'); return null; } } catch (e) {} }
  const ss = SpreadsheetApp.create(nombre);
  DriveApp.getFileById(ss.getId()).moveTo(DriveApp.getFolderById(BASES.CARPETA_GENERAL));
  ss.setSpreadsheetTimeZone(TZ);
  ss.setSpreadsheetLocale('es_AR');   // fechas dd/mm/aaaa
  p.setProperty(propiedad, ss.getId());
  return ss;
}
const limpio_ = s => String(s == null ? '' : s).trim();
const sinTildes_ = s => limpio_(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[«»"“”().,]/g, ' ').replace(/\s+/g, ' ').trim();

// ------------------------------------------------------------------ 1. BASE COMÚN
function construirBaseComun() {
  const ss = nuevoLibro_('BASE COMÚN · Sistema HyS', 'BASE_COMUN_ID'); if (!ss) return;
  const g = SpreadsheetApp.openById(CFG.GENERAL);
  const vE = g.getSheetByName('ESTABLECIMIENTOS').getRange(6, 1, g.getSheetByName('ESTABLECIMIENTOS').getLastRow() - 5, 13).getValues().filter(r => r[0]);
  const vD = g.getSheetByName('DATOS').getRange(6, 1, g.getSheetByName('DATOS').getLastRow() - 5, 8).getValues().filter(r => r[0]);
  const vS = g.getSheetByName('SITIOS').getRange(6, 1, Math.max(1, g.getSheetByName('SITIOS').getLastRow() - 5), 7).getValues().filter(r => r[0]);
  const reg = g.getSheetByName('LIBROS'), vL = reg ? reg.getRange(2, 1, reg.getLastRow() - 1, 7).getValues() : [];
  const claves = SpreadsheetApp.openById(CFG.CLAVES).getSheets()[0].getDataRange().getValues().slice(1);
  const estadoDe = cod => { const c = claves.find(r => limpio_(r[1]) === cod); return c ? limpio_(c[4]) : 's/d'; };
  const libroDe = cod => vL.find(r => limpio_(r[0]) === cod) || [];
  const sd = v => (v === '' || v == null) ? 's/d' : v;

  // ESTABLECIMIENTOS
  const sh = ss.getSheets()[0].setName('ESTABLECIMIENTOS');
  const cols = ['CODIGO', 'NOMBRE_OFICIAL', 'NOMBRE_CORTO', 'TIPO', 'AREA_PROGRAMATICA', 'CABECERA_DE_AREA', 'LOCALIDAD', 'DIRECCION', 'TELEFONOS', 'CODIGO_SISA', 'DIRECTOR', 'ESCALA', 'EMPRESA_RESIDUOS', 'SERVICIO_HYS', 'ESTADO_EN_SISTEMA', 'LIBRO_RESIDUOS', 'CARPETA'];
  encabezar_(sh, 'Establecimientos', 'Una fila por establecimiento. El CÓDIGO es el dato que une todos los libros del sistema: no se cambia. Faltantes: s/d.', cols,
    ['Código fijo del establecimiento. Se usa en carpetas, libros y números de registro.', 'Nombre oficial completo.', 'Nombre corto para listas.', '', '', 'Sí: hospital cabecera del área programática.', '', '', '', '', 'Último dato conocido.', 'Básica o Ampliada (libro de residuos).', '', 'Profesional propio / Técnico / Referente no técnico / Sin servicio.', 'Copiado de la planilla de claves al construir. Se actualiza desde allí.', 'Enlace al libro de residuos.', 'Carpeta del establecimiento.'], [14, 15, 16]);
  const filas = vE.map(e => {
    const cod = limpio_(e[1]), d = vD.find(r => limpio_(r[0]) === limpio_(e[0])) || [], l = libroDe(cod);
    return [cod, e[0], cod, sd(e[3]), sd(e[4]), BASES.CABECERAS[e[4]] === cod ? 'Sí' : 'No', sd(d[2]), sd(d[3]), sd(d[4]), sd(e[2] !== 's/d' ? e[2] : d[1]), sd(d[5]), sd(e[6]), sd(e[8]),
      (cod === 'HZT' || cod === 'HMH') ? 'Profesional propio' : ({ HZPM: 1, HZE: 1, HRCR: 1, HACR: 1 }[cod] ? 'Profesional propio' : 's/d'), estadoDe(cod),
      l[3] ? 'https://docs.google.com/spreadsheets/d/' + l[3] : 's/d', l[4] ? 'https://drive.google.com/drive/folders/' + l[4] : 's/d'];
  });
  sh.getRange(6, 1, filas.length, cols.length).setValues(filas);
  grisCols_(sh, [14, 15, 16], filas.length);
  sh.setFrozenColumns(2); sh.setColumnWidth(2, 320);
  proteger_(sh, [sh.getRange('A1:Q5'), sh.getRange(6, 1, 300, 1), sh.getRange(6, 15, 300, 3)], 'Encabezados, códigos y columnas del sistema');

  // ÁREAS
  const ar = ss.insertSheet('AREAS');
  encabezar_(ar, 'Áreas programáticas', 'Una fila por área, con su hospital cabecera.', ['AREA_PROGRAMATICA', 'CODIGO_CABECERA', 'ESTABLECIMIENTOS']);
  const areas = Object.keys(BASES.CABECERAS);
  ar.getRange(6, 1, areas.length, 2).setValues(areas.map(a => [a, BASES.CABECERAS[a]]));
  areas.forEach((a, i) => setF_(ar.getRange(6 + i, 3), '=COUNTIF(ESTABLECIMIENTOS!E6:E¦A' + (6 + i) + ')'));

  // SITIOS
  const si = ss.insertSheet('SITIOS');
  const cS = ['CODIGO', 'SITIO', 'NOMBRE_OFICIAL', 'CODIGO_SISA', 'TIPO', 'EMPRESA', 'FRECUENCIA_PACTADA'];
  encabezar_(si, 'Sitios', 'Edificio principal, CAPS y dispositivos de cada establecimiento. Una fila por sitio.', cS,
    ['Código del establecimiento al que pertenece.', 'Nombre corto del sitio (el mismo que usan los manifiestos).', '', '', 'Edificio / CAPS / Dispositivo.', '', 'Frecuencia de retiro de residuos pactada.']);
  const codDeNombre = {}; vE.forEach(e => codDeNombre[limpio_(e[0])] = limpio_(e[1]));
  const sit = vS.map(r => [codDeNombre[limpio_(r[0])] || 's/d', r[1], sd(r[2]), sd(r[3]), sd(r[4]), sd(r[5]), sd(r[6])]);
  const conSitio = {}; sit.forEach(r => conSitio[r[0]] = 1);
  filas.forEach(f => { if (!conSitio[f[0]]) sit.push([f[0], f[0], f[1], f[9], 'Edificio', f[12], 's/d']); });
  si.getRange(6, 1, sit.length, cS.length).setValues(sit);
  lista_(si, 4, sit.length, ['Edificio', 'CAPS', 'Dispositivo', 'Puesto sanitario']);

  // RED HyS
  const rh = ss.insertSheet('RED_HYS');
  const cR = ['CODIGO', 'APELLIDO_Y_NOMBRE', 'CUIL', 'DNI', 'ROL', 'TITULO_O_MATRICULA', 'CORREO', 'TELEFONO', 'HORAS_SEMANALES', 'DESDE', 'BLOQUES_QUE_REPORTA', 'FRECUENCIA', 'ESTADO', 'OBSERVACIONES'];
  encabezar_(rh, 'Red de Higiene y Seguridad', 'Una fila por persona y establecimiento. Define quién reporta qué libro y cada cuánto.', cR,
    ['', '', '', '', 'Profesional / Técnico / Referente no técnico / Referente de residuos.', '', '', '', '', 'Desde cuándo cumple el rol.', 'Bloques (libros) que se le envían.', 'Mensual / Trimestral / Anual.', 'Activo / A confirmar / Baja.']);
  const red = [['HZT', 'Belén Pellegrini', 's/d', 's/d', 'Profesional', 'Lic. en Higiene, Seguridad y Medio Ambiente del Trabajo · MP LCOHSECH0383', 'belenpellegrini.hys@gmail.com', 's/d', 's/d', 's/d', 'Todos', '—', 'Activo', 'Coordinación'],
    ['HMH', 'Belén Pellegrini', 's/d', 's/d', 'Profesional', 'Lic. en Higiene, Seguridad y Medio Ambiente del Trabajo · MP LCOHSECH0383', 'belenpellegrini.hys@gmail.com', 's/d', 's/d', 's/d', 'Todos', '—', 'Activo', 'Coordinación'],
    ['HZPM', '[a relevar]', '', '', 'Profesional', '', '', '', '', '', '', '', 'A confirmar', ''],
    ['HZE', '[a relevar]', '', '', 'Profesional', '', '', '', '', '', '', '', 'A confirmar', ''],
    ['HRCR', '[a relevar]', '', '', 'Profesional', '', '', '', '', '', '', '', 'A confirmar', ''],
    ['HACR', '[a relevar]', '', '', 'Profesional', '', '', '', '', '', '', '', 'A confirmar', '']];
  rh.getRange(6, 1, red.length, cR.length).setValues(red);
  lista_(rh, 4, 300, ['Profesional', 'Técnico', 'Referente no técnico', 'Referente de residuos']);
  lista_(rh, 11, 300, ['Mensual', 'Trimestral', 'Semestral', 'Anual']);
  lista_(rh, 12, 300, ['Activo', 'A confirmar', 'Baja']);

  // COMITÉS Y ÁREAS
  const co = ss.insertSheet('COMITES');
  const cC = ['CODIGO', 'COMITE_O_AREA', 'RESPONSABLE', 'CORREO', 'TELEFONO', 'FRECUENCIA_REUNIONES', 'ULTIMA_REUNION', 'OBSERVACIONES'];
  encabezar_(co, 'Comités y áreas', 'Comité de Calidad, Comité de Infecciones y Departamento de Personal de cada establecimiento.', cC,
    ['', 'Comité de Calidad / Comité de Infecciones / Departamento de Personal.', 'Coordinador/a o responsable.', '', '', '', 'Fecha de la última reunión registrada.', '']);
  const com = []; filas.forEach(f => ['Comité de Calidad', 'Comité de Infecciones', 'Departamento de Personal'].forEach(c => com.push([f[0], c, 's/d', 's/d', 's/d', 's/d', '', ''])));
  co.getRange(6, 1, com.length, cC.length).setValues(com);
  lista_(co, 1, com.length + 100, ['Comité de Calidad', 'Comité de Infecciones', 'Departamento de Personal', 'Comité Mixto de HyS', 'Otro']);
  const it = ss.insertSheet('INTEGRANTES');
  encabezar_(it, 'Integrantes de comités', 'Una fila por persona y comité. La persona se identifica por DNI.', ['CODIGO', 'COMITE_O_AREA', 'DNI', 'APELLIDO_Y_NOMBRE', 'ROL_EN_EL_COMITE', 'CORREO', 'TELEFONO', 'DESDE', 'ESTADO']);

  // EQUIVALENCIAS (nombres escritos de distinta forma → código)
  const eq = ss.insertSheet('EQUIVALENCIAS');
  encabezar_(eq, 'Equivalencias de nombres', 'Cada forma en que aparece escrito un establecimiento, con su código. Se usa al importar bases y libros.', ['VARIANTE', 'CODIGO', 'SITIO', 'NOTA'],
    ['Nombre tal como aparece en otra base.', 'Código del establecimiento.', 'Sitio o dispositivo dentro del establecimiento, si corresponde.', '']);
  const vEq = equivalencias_(filas);
  eq.getRange(6, 1, vEq.length, 4).setValues(vEq);

  // LISTAS (oculta)
  const li = ss.insertSheet('LISTAS');
  const listas = { AREAS: areas, TIPOS: ['Hospital regional', 'Hospital zonal', 'Hospital subzonal', 'Hospital rural', 'Puesto sanitario'], ESCALA: ['Básica', 'Ampliada'], SERVICIO_HYS: ['Profesional propio', 'Técnico', 'Referente no técnico', 'Sin servicio', 's/d'], VINCULO: ['Planta', 'Contratado', 'Residente', 'Tercerizado', 'Otro'], ESTADO_TRABAJADOR: ['Activo', 'Licencia', 'No figura en la última base', 'Baja', 'Revisar'] };
  Object.keys(listas).forEach((k, i) => { li.getRange(1, i + 1).setValue(k).setFontWeight('bold'); li.getRange(2, i + 1, listas[k].length, 1).setValues(listas[k].map(v => [v])); });
  li.hideSheet();
  lista_(sh, 13, 300, listas.SERVICIO_HYS); lista_(sh, 11, 300, listas.ESCALA); lista_(sh, 3, 300, listas.TIPOS); lista_(sh, 4, 300, areas);

  // INICIO
  const ini = ss.insertSheet('INICIO', 0);
  ini.getRange('A1').setValue('BASE COMÚN · Sistema HyS').setFontSize(18).setFontWeight('bold').setFontColor(BASES.AZUL);
  ini.getRange('A2').setValue('Datos que usan todos los libros del sistema. Construido el ' + Utilities.formatDate(new Date(), TZ, 'dd/MM/yyyy HH:mm') + '.').setFontColor('#4F616B');
  const hojas = [['ESTABLECIMIENTOS', 'Un establecimiento por fila, con su código'], ['AREAS', 'Áreas programáticas y su cabecera'], ['SITIOS', 'Edificios, CAPS y dispositivos'], ['RED_HYS', 'Profesionales, técnicos y referentes'], ['COMITES', 'Calidad, Infecciones y Personal de cada establecimiento'], ['INTEGRANTES', 'Personas de cada comité'], ['EQUIVALENCIAS', 'Nombres escritos de distinta forma → código']];
  ini.getRange(4, 1, 1, 3).setValues([['Hoja', 'Contenido', 'Ir']]).setFontWeight('bold').setFontColor('#FFFFFF').setBackground(BASES.AZUL);
  hojas.forEach((h, i) => { ini.getRange(5 + i, 1, 1, 2).setValues([h]); setF_(ini.getRange(5 + i, 3), '=HYPERLINK("#gid=' + ss.getSheetByName(h[0]).getSheetId() + '"¦"Abrir")'); });
  ini.getRange(5 + hojas.length + 1, 1).setValue('Cómo cargar a mano: escribí solo en celdas blancas desde la fila 6. Las columnas grises y los encabezados están protegidos con aviso. Para un establecimiento nuevo, agregá una fila al final con un código nuevo que no se repita.').setWrap(true);
  ini.setColumnWidth(1, 200); ini.setColumnWidth(2, 420);
  ss.setActiveSheet(ini);
  Logger.log('BASE COMÚN creada: ' + ss.getUrl() + ' · ' + filas.length + ' establecimientos, ' + sit.length + ' sitios, ' + vEq.length + ' equivalencias.');
}

// Equivalencias iniciales: nombres oficiales y cortos + las formas usadas en la base de capacitaciones
function equivalencias_(filas) {
  const out = [], visto = {};
  const add = (v, c, s, n) => { const k = sinTildes_(v); if (!k || visto[k]) return; visto[k] = 1; out.push([v, c, s || '', n || '']); };
  filas.forEach(f => { add(f[1], f[0]); add(f[0], f[0]); });
  filas.forEach(f => { const corto = f[1].replace(/^(Hospital Rural|Hospital Subzonal|Hospital Zonal|Hospital Regional|Puesto Sanitario|Hospital)\s+/i, '').replace(/\s*[«(].*$/, ''); add('Hospital Rural ' + corto, f[0]); add('Hospital ' + corto, f[0]); add('Puesto Sanitario ' + corto, f[0]); });
  const fijos = [
    ['Hospital María Humphreys', 'HMH'], ['Hospital de Alta Complejidad «María Humphreys»', 'HMH'], ['Hospital Zonal Trelew', 'HZT'],
    ['Dpto. Salud Mental y Adicciones', 'HZT', 'Dpto. Salud Mental y Adicciones'], ['Área Externa', 'HZT', 'Área Externa'], ['Pichi Anai', 'HZT', 'Pichi Anai'],
    ['Ex ADOS', 'HZT', 'Sede ex ADOS'], ['PROSATE', 'HZT', 'PROSATE'], ['HZT y HMH', 'HZT', '', 'Trabaja en ambos: revisar'],
    ['CAPS Amaya', 'HZT', 'Amaya'], ['CAPS Don Bosco', 'HZT', 'Don Bosco'], ['CAPS Constitución', 'HZT', 'Constitución'], ['CAPS Etchepare', 'HZT', 'Etchepare'],
    ['CAPS Franzetti', 'HZT', 'Etchepare'], ['CAPS Corradi', 'HZT', 'Corradi'], ['CAPS Tiro Federal', 'HZT', 'Tiro Federal'], ['CAPS Sarmiento', 'HZT', 'Sarmiento'],
    ['CAPS Villa Italia', 'HZT', 'Villa Italia'], ['CAPS La Loma', 'HZT', 'La Loma'], ['CAPS Planta de Gas', 'HZT', 'Planta de Gas'], ['CAPS San Martín', 'HZT', 'San Martín'],
    ['Hospital Santa Teresita', 'HSST'], ['Hospital Subzonal de Rawson', 'HSST'], ['Hospital Rawson', 'HSST', '', 'Rawson, Chubut'],
    ['Hospital Zonal Puerto Madryn (Andrés Isola)', 'HZPM'], ['Hospital Zonal de Puerto Madryn', 'HZPM'], ['Hospital Zonal Esquel', 'HZE'], ['Hospital Zonal de Esquel', 'HZE'],
    ['Hospital Regional Comodoro Rivadavia', 'HRCR'], ['Hospital Regional de Comodoro Rivadavia', 'HRCR'], ['Hospital Zonal Alvear', 'HACR'], ['Hospital Alvear', 'HACR'],
    ['Hospital Sarmiento', 'Sarmiento'], ['Hospital Subzonal de Sarmiento', 'Sarmiento'], ['Hospital Rural Diadema', 'Diadema Argentina'], ['Hospital Subzonal El Maitén', 'El Maitén'],
    ['Hospital Sub Zonal El Maiten', 'El Maitén'], ['Puesto Sanitario del Escorial', 'El Escorial'],
    ['Secretaría de Salud - Nivel Central', 'NC'], ['Subsecretaría de Salud', 'NC'], ['Dirección Provincial Una Salud', 'NC'], ['Ministerio de Salud Pública', 'NC'],
    ['Secretaría de Salud Dpto Provincial Registro Sectorial Bienes Reales', 'NC'], ['Unidad de Gestión Descentralizada Zona Norte', 'NC']];
  fijos.forEach(r => add(r[0], r[1], r[2], r[3] || (r[1] === 'NC' ? 'Nivel central: no es un establecimiento' : '')));
  return out;
}

// ------------------------------------------------------------------ 2. BASE DE TRABAJADORES
const TRAB_COLS = ['CUIL', 'DNI', 'APELLIDOS', 'NOMBRES', 'SITIO', 'FUNCION', 'FUNCION_DETALLE', 'SERVICIO', 'VINCULO', 'EMPRESA', 'CARGO_CONDUCCION', 'EMAIL', 'EMAIL_FECHA', 'TELEFONO', 'EN_NTEAR', 'FUENTES', 'ULTIMA_CONFIRMACION', 'REVISAR', 'MOTIVO_REVISION', 'ESTADO', 'FECHA_ALTA', 'ESTABLECIMIENTO'];
const TRAB_AYUDA = ['CUIL sin guiones o con guiones. Los 8 números del medio deben coincidir con el DNI.', 'DNI sin puntos. Es la clave que une esta base con capacitaciones y los demás módulos.', '', '', 'Edificio, CAPS o dispositivo donde trabaja (lista de SITIOS de la base común).', '', '', 'Servicio o sector.', 'Planta / Contratado / Residente / Tercerizado / Otro.', 'Solo tercerizados: empresa.', 'Jefatura o coordinación, si tiene.', 'Si hay un correo más nuevo, reemplaza al anterior (el anterior queda en HISTORIAL).', 'Fecha del correo.', '', 'Sí / No: figura en la nómina NTEAR.', 'De dónde salió el dato.', 'Última vez que la persona confirmó sus datos.', 'Sí: hay algo para revisar.', '', 'Activo / Licencia / No figura en la última base / Baja / Revisar. Lo actualiza el sistema al importar.', 'Fecha en que entró a esta base.', 'Código del establecimiento. Se completa solo.'];
const TRAB_GRISES = [19, 20, 21];

function construirBaseTrabajadores() {
  const bcId = PropertiesService.getScriptProperties().getProperty('BASE_COMUN_ID');
  if (!bcId) { Logger.log('Primero ejecutá construirBaseComun().'); return; }
  const bc = SpreadsheetApp.openById(bcId);
  const est = bc.getSheetByName('ESTABLECIMIENTOS').getRange(6, 1, bc.getSheetByName('ESTABLECIMIENTOS').getLastRow() - 5, 5).getValues().filter(r => r[0]);
  const eqv = bc.getSheetByName('EQUIVALENCIAS').getRange(6, 1, bc.getSheetByName('EQUIVALENCIAS').getLastRow() - 5, 3).getValues();
  const mapa = {}; eqv.forEach(r => { if (r[0] && r[1]) mapa[sinTildes_(r[0])] = { cod: limpio_(r[1]), sitio: limpio_(r[2]) }; });
  const ss = nuevoLibro_('BASE DE TRABAJADORES · Sistema HyS', 'BASE_TRABAJADORES_ID'); if (!ss) return;

  // Lectura de la base de capacitaciones (solo lectura)
  const cap = SpreadsheetApp.openById(BASES.CAPACITACIONES).getSheetByName('PERSONAS'), v = cap.getDataRange().getValues(), H = v[0];
  const ix = n => H.indexOf(n);
  const I = { DNI: ix('DNI'), AP: ix('APELLIDOS'), NO: ix('NOMBRES'), FU: ix('FUNCION'), FD: ix('FUNCION_DETALLE'), SE: ix('SERVICIO'), ES: ix('ESTABLECIMIENTO'), CAB: ix('HOSPITAL_CABECERA'), EM: ix('EMAIL'), VI: ix('VINCULO'), EMP: ix('EMPRESA'), PU: ix('PUBLICO'), NT: ix('EN_NTEAR'), RE: ix('REVISAR'), MO: ix('MOTIVO_REVISION'), FUE: ix('FUENTES'), UC: ix('ULTIMA_CONFIRMACION'), CC: ix('CARGO_CONDUCCION'), TE: ix('TELEFONO'), EF: ix('EMAIL_FECHA') };
  const hoy = new Date(), porCod = {}, sinAsignar = [];
  let externos = 0;
  v.slice(1).forEach(r => {
    if (!limpio_(r[I.DNI])) return;
    const pub = limpio_(r[I.PU]);
    if (pub !== 'Primario' && pub !== 'Secundario') { externos++; return; }   // estudiantes y externos quedan solo en capacitaciones
    const m = mapa[sinTildes_(r[I.ES])] || mapa[sinTildes_(r[I.CAB])];
    let revisar = limpio_(r[I.RE]), motivo = limpio_(r[I.MO]);
    if (m && sinTildes_(r[I.ES]) === sinTildes_('HZT y HMH')) { revisar = 'Sí'; motivo = (motivo ? motivo + ' · ' : '') + 'Trabaja en HZT y HMH: definir establecimiento'; }
    const fila = ['', limpio_(r[I.DNI]), r[I.AP], r[I.NO], m ? (m.sitio || '') : '', r[I.FU], r[I.FD], r[I.SE], r[I.VI], r[I.EMP], r[I.CC], r[I.EM], r[I.EF], r[I.TE], r[I.NT], limpio_(r[I.FUE]) + (r[I.FUE] ? ' | ' : '') + 'Base capacitaciones', r[I.UC], revisar, motivo, 'Activo', hoy];
    if (m) (porCod[m.cod] = porCod[m.cod] || []).push(fila);
    else { fila[17] = 'Sí'; fila[18] = 'Establecimiento no reconocido: ' + limpio_(r[I.ES]); sinAsignar.push(fila); }
  });

  // Una hoja por establecimiento (orden: área, luego nombre), más NIVEL CENTRAL y SIN ASIGNAR
  const orden = est.slice().sort((a, b) => (a[4] + a[1]).localeCompare(b[4] + b[1]));
  const hojas = orden.map(e => ({ cod: limpio_(e[0]), nombre: e[1], filas: porCod[limpio_(e[0])] || [] }));
  hojas.push({ cod: 'NC', nombre: 'Nivel central (Secretaría de Salud y organismos)', filas: porCod['NC'] || [] });
  hojas.push({ cod: 'SIN_ASIGNAR', nombre: 'Trabajadores sin establecimiento reconocido', filas: sinAsignar });
  const primera = ss.getSheets()[0];
  hojas.forEach(h => hojaTrab_(ss, h.cod, h.nombre, h.filas));
  ss.deleteSheet(primera);

  // TODOS: junta todas las hojas
  const todos = ss.insertSheet('TODOS');
  if (todos.getMaxRows() < 70000) todos.insertRowsAfter(todos.getMaxRows(), 70000 - todos.getMaxRows());
  encabezar_(todos, 'Todos los trabajadores', 'Se arma sola con las hojas de cada establecimiento. No se escribe acá.', TRAB_COLS, TRAB_AYUDA, TRAB_GRISES);
  const refs = hojas.map(h => "'" + h.cod + "'!A6:V1500").join(';');
  setF_(todos.getRange('A6'), '=QUERY({' + refs + '}¦"select * where Col2 is not null"¦0)');
  todos.getRange('A1:V5').protect().setDescription('Hoja automática').setWarningOnly(true);
  todos.setFrozenColumns(4);

  // DUPLICADOS: el mismo DNI en dos hojas
  const du = ss.insertSheet('DUPLICADOS');
  encabezar_(du, 'DNI repetidos', 'El mismo DNI en más de un establecimiento: puede ser un traslado o un error. Decidí y corregí en la hoja que corresponda.', ['DNI', 'ESTABLECIMIENTOS', 'APELLIDOS', 'NOMBRES']);
  setF_(du.getRange('A6'), '=IFERROR(FILTER(UNIQUE(TODOS!B6:B)¦COUNTIF(TODOS!B6:B¦UNIQUE(TODOS!B6:B))>1)¦"Sin repetidos")');
  setF_(du.getRange('B6'), '=BYROW(A6:A¦LAMBDA(d¦IF(OR(d=""¦d="Sin repetidos")¦""¦TEXTJOIN(" · "¦TRUE¦UNIQUE(FILTER(TODOS!V6:V¦TODOS!B6:B=d))))))');
  setF_(du.getRange('C6'), '=BYROW(A6:A¦LAMBDA(d¦IF(OR(d=""¦d="Sin repetidos")¦""¦IFERROR(INDEX(FILTER(TODOS!C6:C¦TODOS!B6:B=d)¦1)¦""))))');
  setF_(du.getRange('D6'), '=BYROW(A6:A¦LAMBDA(d¦IF(OR(d=""¦d="Sin repetidos")¦""¦IFERROR(INDEX(FILTER(TODOS!D6:D¦TODOS!B6:B=d)¦1)¦""))))');

  // IMPORTACIONES e HISTORIAL
  const im = ss.insertSheet('IMPORTACIONES');
  encabezar_(im, 'Importaciones', 'Cada base recibida y qué cambió.', ['FECHA', 'ORIGEN', 'ESTABLECIMIENTO', 'ALTAS', 'CAMBIOS', 'NO_FIGURAN', 'OBSERVACIONES']);
  const log = hojas.filter(h => h.filas.length).map(h => [hoy, 'BASE_PERSONAS_CAPACITACIONES_2026 (carga inicial)', h.cod, h.filas.length, 0, 0, '']);
  if (log.length) im.getRange(6, 1, log.length, 7).setValues(log);
  const hi = ss.insertSheet('HISTORIAL');
  encabezar_(hi, 'Historial de cambios', 'Antes y después de cada cambio hecho por el sistema.', ['FECHA', 'DNI', 'ESTABLECIMIENTO', 'CAMPO', 'VALOR_ANTERIOR', 'VALOR_NUEVO', 'ORIGEN']);

  // INICIO
  const ini = ss.insertSheet('INICIO', 0);
  ini.getRange('A1').setValue('BASE DE TRABAJADORES · Sistema HyS').setFontSize(18).setFontWeight('bold').setFontColor(BASES.AZUL);
  ini.getRange('A2').setValue('Trabajadores de los establecimientos de salud. Fuente principal: bases de Personal. Carga inicial: base de capacitaciones (' + Utilities.formatDate(hoy, TZ, 'dd/MM/yyyy') + '). Estudiantes y externos quedan solo en capacitaciones.').setFontColor('#4F616B').setWrap(true);
  ini.getRange(4, 1, 1, 4).setValues([['Código', 'Establecimiento', 'Trabajadores', 'Ir']]).setFontWeight('bold').setFontColor('#FFFFFF').setBackground(BASES.AZUL);
  hojas.forEach((h, i) => {
    ini.getRange(5 + i, 1, 1, 2).setValues([[h.cod, h.nombre]]);
    setF_(ini.getRange(5 + i, 3), "=COUNTA('" + h.cod + "'!B6:B)");
    setF_(ini.getRange(5 + i, 4), '=HYPERLINK("#gid=' + ss.getSheetByName(h.cod).getSheetId() + '"¦"Abrir")');
  });
  const fin = 5 + hojas.length + 1;
  ini.getRange(fin, 1, 4, 1).setValues([['Hojas automáticas: TODOS (junta todo), DUPLICADOS (DNI repetidos).'], ['Registro: IMPORTACIONES (cada base recibida) e HISTORIAL (cambios).'], ['Cómo cargar a mano: en la hoja del establecimiento, una fila nueva al final, solo celdas blancas.'], ['Nunca borres una fila: si alguien dejó de trabajar, cambiá ESTADO a «Baja».']]);
  ini.setColumnWidth(2, 380);
  ss.setActiveSheet(ini);
  const total = hojas.reduce((a, h) => a + h.filas.length, 0);
  Logger.log('BASE DE TRABAJADORES creada: ' + ss.getUrl() + ' · ' + total + ' trabajadores en ' + hojas.filter(h => h.filas.length).length + ' hojas · ' + sinAsignar.length + ' sin asignar · ' + externos + ' externos/estudiantes no incluidos.');
}

function hojaTrab_(ss, cod, nombre, filas, posicion) {
  const sh = posicion == null ? ss.insertSheet(cod) : ss.insertSheet(cod, posicion);
  if (sh.getMaxRows() < 1505) sh.insertRowsAfter(sh.getMaxRows(), 1505 - sh.getMaxRows());
  encabezar_(sh, nombre + ' (' + cod + ') · Trabajadores', 'Una fila por trabajador. Escribí solo en las celdas blancas. Las columnas grises las completa el sistema. Ayuda: nota en cada encabezado.', TRAB_COLS, TRAB_AYUDA, TRAB_GRISES);
  sh.getRange(6, 1, 1500, 2).setNumberFormat('@');
  if (filas && filas.length) sh.getRange(6, 1, filas.length, 21).setValues(filas);
  sh.getRange(6, 21, Math.max(filas ? filas.length : 0, 1), 1).setNumberFormat('dd/mm/yyyy');
  setF_(sh.getRange('V6'), '=ARRAYFORMULA(IF(B6:B=""¦""¦"' + cod + '"))');
  grisCols_(sh, TRAB_GRISES, (filas ? filas.length : 0) + 300);
  lista_(sh, 8, 1500, ['Planta', 'Contratado', 'Residente', 'Tercerizado', 'Otro']);
  lista_(sh, 19, 1500, ['Activo', 'Licencia', 'No figura en la última base', 'Baja', 'Revisar']);
  lista_(sh, 17, 1500, ['Sí', '']);
  sh.setFrozenColumns(4);
  proteger_(sh, [sh.getRange('A1:V5'), sh.getRange('T6:V1500')], 'Encabezados y columnas del sistema');
  return sh;
}

// ------------------------------------------------------------------ 3. SINCRONIZACIONES (cuando se suman establecimientos o sitios)
const BT_SISTEMA = ['INICIO', 'TODOS', 'DUPLICADOS', 'IMPORTACIONES', 'HISTORIAL', 'LISTAS'];
/**
 * Para cada establecimiento de la BASE COMÚN que no tenga hoja en la BASE DE TRABAJADORES, la crea.
 * Después rehace la fórmula de TODOS y el índice de INICIO con todas las hojas.
 */
function sincronizarEstablecimientos() {
  const p = PropertiesService.getScriptProperties(), bc = SpreadsheetApp.openById(p.getProperty('BASE_COMUN_ID')), bt = SpreadsheetApp.openById(p.getProperty('BASE_TRABAJADORES_ID'));
  const shE = bc.getSheetByName('ESTABLECIMIENTOS'), est = shE.getRange(6, 1, shE.getLastRow() - 5, 5).getValues().filter(r => r[0]);
  const nuevas = [];
  est.forEach(e => { const cod = limpio_(e[0]); if (!bt.getSheetByName(cod)) { hojaTrab_(bt, cod, e[1], [], bt.getSheetByName('NC').getIndex() - 1); nuevas.push(cod); } });
  const hojas = bt.getSheets().map(s => s.getName()).filter(n => BT_SISTEMA.indexOf(n) < 0);
  setF_(bt.getSheetByName('TODOS').getRange('A6'), '=QUERY({' + hojas.map(h => "'" + h + "'!A6:V1500").join(';') + '}¦"select * where Col2 is not null"¦0)');
  const ini = bt.getSheetByName('INICIO'), nombres = {}; est.forEach(e => nombres[limpio_(e[0])] = e[1]);
  nombres.NC = 'Nivel central (Secretaría de Salud y organismos)'; nombres.SIN_ASIGNAR = 'Trabajadores sin establecimiento reconocido';
  ini.getRange(5, 1, Math.max(ini.getLastRow() - 4, 1), 4).clearContent();
  hojas.forEach((h, i) => {
    ini.getRange(5 + i, 1, 1, 2).setValues([[h, nombres[h] || h]]);
    setF_(ini.getRange(5 + i, 3), "=COUNTA('" + h + "'!B6:B)");
    setF_(ini.getRange(5 + i, 4), '=HYPERLINK("#gid=' + bt.getSheetByName(h).getSheetId() + '"¦"Abrir")');
  });
  const fin = 5 + hojas.length + 1;
  ini.getRange(fin, 1, 4, 1).setValues([['Hojas automáticas: TODOS (junta todo), DUPLICADOS (DNI repetidos).'], ['Registro: IMPORTACIONES (cada base recibida) e HISTORIAL (cambios).'], ['Cómo cargar a mano: en la hoja del establecimiento, una fila nueva al final, solo celdas blancas.'], ['Nunca borres una fila: si alguien dejó de trabajar, cambiá ESTADO a «Baja».']]);
  CacheService.getScriptCache().removeAll(['libros', 'p_resumen']);
  Logger.log('Hojas nuevas en la base de trabajadores: ' + (nuevas.join(', ') || 'ninguna') + '. Hojas totales: ' + hojas.length + '.');
}

/**
 * Lleva a los libros de residuos los sitios de la BASE COMÚN donde la empresa retira (RETIRO_DIRECTO «Sí»)
 * y que no son municipales. Así aparecen en la aplicación («Sitio del retiro») y en la hoja CARGA MANUAL.
 * Solo agrega: no borra ni cambia sitios existentes. Si se corta por tiempo, se vuelve a ejecutar.
 */
function sincronizarSitiosLibros() {
  const inicio = Date.now(), bc = SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('BASE_COMUN_ID'));
  const shS = bc.getSheetByName('SITIOS'), v = shS.getRange(6, 1, shS.getLastRow() - 5, 13).getValues();
  const porCod = {};
  v.forEach(r => { const cod = limpio_(r[0]); if (!cod || !r[1] || !/^s[ií]/i.test(limpio_(r[12])) || /municipal/i.test(limpio_(r[9]))) return; (porCod[cod] = porCod[cod] || []).push(r); });
  const libros = librosMapa_(); let agregados = 0, libs = 0;
  for (const cod of Object.keys(porCod)) {
    if (Date.now() - inicio > 4.5 * 60 * 1000) { Logger.log('Se cortó por tiempo: volvé a ejecutar para seguir.'); break; }
    const E = libros[cod]; if (!E || !E.libro) continue;
    const ss = SpreadsheetApp.openById(E.libro), sh = ss.getSheetByName('SITIOS'); if (!sh) continue;
    const n = sh.getLastRow() - 5, ya = n > 0 ? sh.getRange(6, 1, n, 1).getValues().map(x => sinTildes_(x[0])) : [];
    const faltan = porCod[cod].filter(r => ya.indexOf(sinTildes_(r[1])) < 0); if (!faltan.length) continue;
    const ultCol = sh.getLastColumn(); let ult = 5 + n;
    const li = ss.getSheetByName('LISTAS'), lv = li ? li.getRange(1, 1, Math.max(li.getLastRow(), 1), 1).getValues().map(x => sinTildes_(x[0])) : [];
    faltan.forEach(r => {
      if (ult >= 6) sh.getRange(ult, 1, 1, ultCol).copyTo(sh.getRange(ult + 1, 1, 1, ultCol));   // fórmulas y formato de la fila anterior
      sh.getRange(ult + 1, 1, 1, 3).setValues([[r[1], r[2] || r[1], r[3] || 's/d']]); ult++; agregados++;
      if (li && lv.indexOf(sinTildes_(r[1])) < 0) { const k = lv.filter(Boolean).length + 1; li.getRange(k, 1).setValue(r[1]); lv[k - 1] = sinTildes_(r[1]); }
    });
    sh.getRange(3, 1).setValue((ult - 5) + ' sitio(s). Los configura Higiene y Seguridad.');
    libs++;
  }
  Logger.log('Sitios agregados: ' + agregados + ' en ' + libs + ' libro(s).');
}

// ------------------------------------------------------------------ 4. ARREGLO DEL LIBRO GENERAL
// La columna «Libro» de ESTABLECIMIENTOS quedó con error por el separador de fórmulas. Se reescribe.
function corregirEnlacesGeneral() {
  const g = SpreadsheetApp.openById(CFG.GENERAL), sh = g.getSheetByName('ESTABLECIMIENTOS'), reg = g.getSheetByName('LIBROS');
  const vE = sh.getRange(6, 1, sh.getLastRow() - 5, 2).getValues(), vL = reg.getRange(2, 1, reg.getLastRow() - 1, 4).getValues();
  let n = 0;
  vE.forEach((r, i) => { const l = vL.find(x => limpio_(x[0]) === limpio_(r[1])); if (l && l[3]) { setF_(sh.getRange(6 + i, 12), '=HYPERLINK("https://docs.google.com/spreadsheets/d/' + l[3] + '"¦"Abrir libro")'); n++; } });
  Logger.log('Enlaces corregidos: ' + n);
}

// ------------------------------------------------------------------ 5. SINCRONIZACIÓN DESDE CAPACITACIONES (diaria)
/**
 * Trae a la BASE DE TRABAJADORES lo nuevo de la base de capacitaciones (que no se modifica):
 *  - trabajadores (público primario o secundario) que todavía no están: se agregan a su establecimiento o a SIN_ASIGNAR;
 *  - correo más nuevo: reemplaza al anterior (el anterior queda en el HISTORIAL);
 *  - teléfono: solo si en la base estaba vacío.
 * Para que corra sola todos los días, ejecutar una vez instalarSincronizacionDiaria().
 */
function sincronizarDesdeCapacitaciones() {
  const p = PropertiesService.getScriptProperties(), bc = SpreadsheetApp.openById(p.getProperty('BASE_COMUN_ID')), bt = SpreadsheetApp.openById(p.getProperty('BASE_TRABAJADORES_ID'));
  const eqv = {}; const shQ = bc.getSheetByName('EQUIVALENCIAS');
  shQ.getRange(6, 1, shQ.getLastRow() - 5, 3).getValues().forEach(r => { if (r[0] && r[1]) eqv[sinTildes_(r[0])] = { cod: limpio_(r[1]), sitio: limpio_(r[2]) }; });
  const cap = SpreadsheetApp.openById(BASES.CAPACITACIONES).getSheetByName('PERSONAS'), v = cap.getDataRange().getValues(), H = v[0], ix = n => H.indexOf(n);
  const I = { DNI: ix('DNI'), AP: ix('APELLIDOS'), NO: ix('NOMBRES'), FU: ix('FUNCION'), SE: ix('SERVICIO'), ES: ix('ESTABLECIMIENTO'), CAB: ix('HOSPITAL_CABECERA'), EM: ix('EMAIL'), VI: ix('VINCULO'), EMP: ix('EMPRESA'), PU: ix('PUBLICO'), NT: ix('EN_NTEAR'), TE: ix('TELEFONO'), EF: ix('EMAIL_FECHA') };
  const dniN = x => String(x == null ? '' : x).replace(/\D/g, '').replace(/^0+/, '');
  const fechaN = x => { if (x instanceof Date) return x.getTime(); const m = String(x || '').match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/); return m ? new Date(m[3], m[2] - 1, m[1]).getTime() : 0; };
  // Índice de la base de trabajadores
  const hojas = bt.getSheets().map(s => s.getName()).filter(n => BT_SISTEMA.indexOf(n) < 0), datos = {}, idx = {};
  hojas.forEach(h => { const sh = bt.getSheetByName(h), n = sh.getLastRow() - 5; datos[h] = { sh: sh, v: n > 0 ? sh.getRange(6, 1, n, 20).getValues() : [], cambio: {} };
    datos[h].v.forEach((r, i) => { const d = dniN(r[1]); if (d && !/^(Baja|Traslado)/.test(String(r[19]))) idx[d] = { h: h, i: i }; }); });
  const hoy = new Date(), hist = [], altas = {}, origen = 'Base de capacitaciones (sincronización)';
  let nAltas = 0, nMail = 0, nTel = 0;
  v.slice(1).forEach(r => {
    const d = dniN(r[I.DNI]), pub = limpio_(r[I.PU]); if (!/^\d{7,8}$/.test(d) || (pub !== 'Primario' && pub !== 'Secundario')) return;
    const e = idx[d];
    if (e) {
      const fila = datos[e.h].v[e.i], mail = limpio_(r[I.EM]).toLowerCase();
      if (mail && mail !== limpio_(fila[11]).toLowerCase() && (!fila[11] || fechaN(r[I.EF]) > fechaN(fila[12]))) {
        hist.push([hoy, d, e.h, 'EMAIL', fila[11], mail, origen]); fila[11] = mail; fila[12] = Utilities.formatDate(hoy, TZ, 'dd/MM/yyyy'); datos[e.h].cambio[e.i] = 1; nMail++;
      }
      const tel = limpio_(r[I.TE]); if (tel && !limpio_(fila[13])) { hist.push([hoy, d, e.h, 'TELEFONO', '', tel, origen]); fila[13] = tel; datos[e.h].cambio[e.i] = 1; nTel++; }
      return;
    }
    const m = eqv[sinTildes_(r[I.ES])] || eqv[sinTildes_(r[I.CAB])], cod = m && datos[m.cod] ? m.cod : 'SIN_ASIGNAR';
    const nueva = ['', d, r[I.AP], r[I.NO], m ? m.sitio : '', r[I.FU], '', r[I.SE], r[I.VI], r[I.EMP], '', limpio_(r[I.EM]).toLowerCase(), r[I.EF], r[I.TE], r[I.NT], origen,
      '', cod === 'SIN_ASIGNAR' ? 'Sí' : '', cod === 'SIN_ASIGNAR' ? 'Establecimiento no reconocido: ' + limpio_(r[I.ES]) : '', 'Activo', hoy];
    (altas[cod] = altas[cod] || []).push(nueva); idx[d] = { h: cod, i: -1 }; nAltas++;
    hist.push([hoy, d, cod, 'ALTA', '', limpio_(r[I.AP]) + ', ' + limpio_(r[I.NO]), origen]);
  });
  Object.keys(datos).forEach(h => Object.keys(datos[h].cambio).forEach(i => datos[h].sh.getRange(6 + Number(i), 1, 1, 20).setValues([datos[h].v[i]])));
  Object.keys(altas).forEach(h => { const sh = datos[h].sh; let ult = 5; datos[h].v.forEach((r, i) => { if (r[1] !== '') ult = 6 + i; }); sh.getRange(ult + 1, 1, altas[h].length, 21).setValues(altas[h]); });
  const HS = bt.getSheetByName('HISTORIAL'); if (hist.length) HS.getRange(Math.max(HS.getLastRow(), 5) + 1, 1, hist.length, 7).setValues(hist);
  if (nAltas || nMail || nTel) { const IM = bt.getSheetByName('IMPORTACIONES'); IM.getRange(Math.max(IM.getLastRow(), 5) + 1, 1, 1, 7).setValues([[hoy, origen, Object.keys(altas).join(', ') || '—', nAltas, nMail + nTel, 0, nMail + ' correo(s) actualizado(s), ' + nTel + ' teléfono(s) agregado(s)']]); }
  CacheService.getScriptCache().removeAll(['p_resumen', 'caps_dnis']);
  Logger.log('Sincronización: ' + nAltas + ' alta(s), ' + nMail + ' correo(s), ' + nTel + ' teléfono(s).');
}
function instalarSincronizacionDiaria() {
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'sincronizarDesdeCapacitaciones').forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('sincronizarDesdeCapacitaciones').timeBased().everyDays(1).atHour(6).inTimezone(TZ).create();
  Logger.log('Listo: la sincronización con capacitaciones corre todos los días a las 6.');
}

/**
 * Lleva a cada libro de residuos los datos actualizados de la BASE COMÚN (por ejemplo, después de cargar el padrón REFES):
 *   hoja DATOS: Nombre completo, Código SISA, Localidad y Dirección
 *   hoja SITIOS: Nombre oficial y Código SISA de cada sitio
 * Solo escribe donde la BASE COMÚN tiene dato (nunca pone «s/d» encima de un dato). Se puede ejecutar las veces que haga falta.
 */
function actualizarLibrosDesdeBaseComun() {
  const inicio = Date.now(), bc = SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('BASE_COMUN_ID'));
  const shE = bc.getSheetByName('ESTABLECIMIENTOS'), E = shE.getRange(6, 1, shE.getLastRow() - 5, 10).getValues().filter(r => r[0]);
  const shS = bc.getSheetByName('SITIOS'), S = shS.getRange(6, 1, shS.getLastRow() - 5, 4).getValues().filter(r => r[0] && r[1]);
  const dato = v => { const s = limpio_(v); return s && !/^s\/d$/i.test(s) ? s : ''; };
  const libros = librosMapa_(), hechos = [], sinLibro = [];
  for (const e of E) {
    if (Date.now() - inicio > 300000) { Logger.log('Se cortó por tiempo: volvé a ejecutar para terminar.'); break; }
    const cod = limpio_(e[0]), L = libros[cod];
    if (!L || !L.libro || !/^[\w-]{20,}$/.test(String(L.libro).replace(/.*\/d\//, '').replace(/\/.*/, ''))) { sinLibro.push(cod); continue; }
    let ss; try { ss = SpreadsheetApp.openById(String(L.libro).replace(/.*\/d\//, '').replace(/\/.*/, '')); } catch (x) { sinLibro.push(cod); continue; }
    // DATOS
    const d = ss.getSheetByName('DATOS');
    if (d) {
      const n = Math.min(d.getLastRow(), 40), a = d.getRange(1, 1, n, 2).getValues();
      const poner = (etq, val) => { if (!dato(val)) return; const i = a.findIndex(r => sinTildes_(String(r[0])).indexOf(sinTildes_(etq)) === 0); if (i >= 0 && String(a[i][1]) !== dato(val)) d.getRange(i + 1, 2).setValue(dato(val)); };
      poner('Nombre completo', e[1]); poner('Código SISA', e[9]); poner('Localidad', e[6]); poner('Dirección', e[7]);
    }
    // SITIOS
    const s = ss.getSheetByName('SITIOS');
    if (s && s.getLastRow() > 5) {
      const rng = s.getRange(6, 1, s.getLastRow() - 5, 3), v = rng.getValues(); let cambio = false;
      v.forEach(r => { const b = S.find(x => limpio_(x[0]) === cod && sinTildes_(x[1]) === sinTildes_(r[0])); if (!b) return;
        if (dato(b[2]) && r[1] !== dato(b[2])) { r[1] = dato(b[2]); cambio = true; }
        if (dato(b[3]) && String(r[2]) !== dato(b[3])) { r[2] = dato(b[3]); cambio = true; } });
      if (cambio) rng.setValues(v);
    }
    hechos.push(cod);
  }
  CacheService.getScriptCache().removeAll(['libros', 'p_resumen']);
  Logger.log('Libros actualizados: ' + hechos.length + ' (' + hechos.join(', ') + ').' + (sinLibro.length ? ' Sin libro todavía: ' + sinLibro.join(', ') + '.' : ''));
}