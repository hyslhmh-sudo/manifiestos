/**
 * SISTEMA HyS · MÓDULO 10 · PROTECCIÓN CONTRA INCENDIOS · Inventario y control de extintores (versión 0, 14/10/2026)
 * Por ahora: red Trelew (HZT y sus sitios, HMH) y HSST con sus CAPS. Carga: Higiene y Seguridad desde el portal (acciones p_inc_…)
 * y, desde «Mi establecimiento», las personas con el módulo «Incendio» en BASE COMÚN › ACCESOS (acciones i_…: Melani, Javier
 * Tramaleo, SOMI y MAREM en el HMH). Belén puede cargar y corregir todo.
 *
 * Libro propio «PROTECCIÓN CONTRA INCENDIOS · Sistema HyS» (propiedad INC_ID), en Drive › SISTEMA HyS › MÓDULO 10 · PROTECCIÓN CONTRA
 * INCENDIOS (propiedad INC_CARPETA). Hojas (todo editable a mano; las filas empiezan en la 6; no se borran filas):
 *   SITIOS_INC   cada lugar con extintores (edificio, CAPS, dispositivo, ambulancias) y quiénes hacen el control mensual
 *   EXTINTORES   una fila por extintor: ubicación, tipo, agente, capacidad, N.º de inventario, vencimiento de la carga y de la prueba
 *                hidráulica, estado y último control con sus 3 fotos
 *   CONTROLES    un control mensual por extintor: 5 verificaciones, resultado y 3 fotos obligatorias (panorámica con el entorno,
 *                marbete y N.º de inventario)
 *   LISTAS · AYUDA
 * Fotos: MÓDULO 10 › Establecimientos › establecimiento › Controles › año-mes (controles) y › Altas › año-mes (extintores agregados).
 * Aviso por correo (regla de Belén 14/10/2026): si un control marca algo que dificulta o impide usar un extintor (casillas de problemas,
 * una verificación en «No» o estado Sobrecarga, Recargar o Fuera de servicio), queda un problema abierto en la hoja FALLAS. TODOS van
 * juntos en un solo correo por establecimiento a SITIOS_INC › CORREOS_FALLA (HMH: Ing. Erick Velázquez, SOMI, e Ing. Ezequiel Nieto,
 * Mantenimiento HMH), a las 6 h del día siguiente a que aparecen problemas nuevos y, mientras queden abiertos, cada 3 días (activador diario
 * resumenFallasIncendio). El correo lista nuevos, los que siguen sin resolver (con los días) y los resueltos desde el anterior.
 * Instalación de los avisos: ejecutar una vez prepararAvisosIncendio() (permiso de Gmail, hoja FALLAS y activador). Única excepción a «no enviar correos automáticos».
 * Agregar extintores: HyS (portal), Melani, SOMI y MAREM («Mi establecimiento») y Javier Tramaleo (MIPyV); datos y 3 fotos obligatorios.
 * Corregir nombre y ubicación (lugar, planta, sector, ubicación): también desde la aplicación y MIPyV. Lo que viene de la aplicación o de MIPyV queda
 * «Pendiente» en VERIFICACION y el cambio se anota en CAMBIOS; HyS lo verifica desde el portal. HyS edita y carga todo desde el portal.
 * Avisos: carga o prueba hidráulica vencida, y 30 días antes de cada vencimiento (aparecen en los tableros); sin control en los últimos 3 meses (el control es mensual,
 * pero la alarma recién aparece a los 3 meses, pedido de Belén 14/10/2026).
 * Carga inicial: importarExtintoresIncendio() lee la planilla «Inventario de Extintores» de Belén (INC.FUENTE) y no pisa lo ya cargado.
 * Normativa: Ley 19.587; Dto. 351/79, cap. 18 (protección contra incendios) y Anexo VII; Res. SRT 463/09 (RGRL). Solo envía el aviso de extintores con problemas (ver arriba).
 * Instalación: ejecutar una vez construirModuloIncendio() (la primera vez también importa la planilla; importarExtintoresIncendio() se puede volver a ejecutar sin duplicar).
 */
const INC = {
  SIS: '16AIJZcmxG9EBM3-D-J4vRtvruHK9DVrA',   // SISTEMA HyS
  CARPETA: 'MÓDULO 10 · PROTECCIÓN CONTRA INCENDIOS',
  P_LIBRO: 'INC_ID', P_CARPETA: 'INC_CARPETA',
  FUENTE: '1AD5M0mA3JrugyLwBkJj52127BGhKBDcIcO3NTK5EAaU',   // «Inventario de Extintores» (Belén, carga inicial)
  H_SIT: ['ESTABLECIMIENTO', 'SITIO', 'TIPO_SITIO', 'RESPONSABLES_CONTROL', 'ACTIVO', 'OBSERVACIONES', 'ACTUALIZADO', 'CORREOS_FALLA'],   // CORREOS_FALLA: a quién avisar por correo si un extintor queda con problemas
  H_EXT: ['ID', 'ESTABLECIMIENTO', 'SITIO', 'NRO_EXTINTOR', 'NRO_CHAPA', 'PLANTA', 'SECTOR', 'UBICACION', 'TIPO', 'AGENTE', 'CAPACIDAD_KG', 'NRO_INVENTARIO',
    'VTO_CARGA', 'PRUEBA_HIDRAULICA_VENCE', 'ESTADO', 'ULTIMO_CONTROL', 'RESULTADO_CONTROL', 'FOTO_PANORAMICA', 'FOTO_MARBETE', 'FOTO_INVENTARIO', 'OBSERVACIONES', 'ACTUALIZADO',
    'VERIFICACION', 'CAMBIOS'],   // VERIFICACION: «Pendiente» si lo agregó o cambió alguien desde la aplicación o MIPyV; «Verificado …» cuando HyS lo revisa
  H_CON: ['ID', 'FECHA', 'ESTABLECIMIENTO', 'SITIO', 'ID_EXTINTOR', 'EN_LUGAR', 'ACCESO_LIBRE', 'MANOMETRO', 'PRECINTO', 'SENALIZACION', 'RESULTADO',
    'FOTO_PANORAMICA', 'FOTO_MARBETE', 'FOTO_INVENTARIO', 'OBSERVACIONES', 'QUIEN', 'CARGADO', 'ESTADO', 'PROBLEMAS', 'AVISO_CORREO', 'VTO_CARGA', 'PRUEBA_HIDRAULICA_VENCE'],   // vencimientos que se leyeron en el control (marbete)
  CHEQUEOS: [['EN_LUGAR', 'En su lugar y a la vista'], ['ACCESO_LIBRE', 'Acceso libre (sin obstáculos)'], ['MANOMETRO', 'Manómetro en verde (o peso correcto si es CO2)'],
    ['PRECINTO', 'Precinto y seguro colocados'], ['SENALIZACION', 'Señalización completa']],
  FOTOS: [['FOTO_PANORAMICA', 'Panorámica', 'El extintor y su entorno: que se vea dónde está, la señal y el acceso.'],
    ['FOTO_MARBETE', 'Marbete', 'La tarjeta del extintor con la fecha de carga, legible.'],
    ['FOTO_INVENTARIO', 'N.º de inventario', 'La chapa o etiqueta con el número de inventario, legible.']],
  // Problemas que dificultan o impiden el uso del extintor (casillas del control). Si el lugar tiene CORREOS_FALLA, se avisa por correo.
  PROBLEMAS: ['No está (desapareció o lo sacaron)', 'Se usó (descargado total o parcialmente)', 'Poca presión (aguja en la zona roja de la izquierda)', 'Demasiada presión (aguja en la zona roja de la derecha)',
    'Precinto o seguro roto o faltante', 'Manguera, boquilla, válvula o manija dañada', 'Golpeado, oxidado o con pérdida', 'Tapado u obstruido (no se puede agarrar)',
    'Sin cartel o señalización', 'Sin tarjeta (marbete) o ilegible', 'Carga vencida', 'Otro (contalo en observaciones)'],
  REMITENTE: 'belenpellegrini.hys@gmail.com', DIAS_RECORDATORIO: 3, HORA_RESUMEN: 6,   // un solo correo por día con todos los extintores (6 h, pedido de Belén 14/10/2026)
  H_FAL: ['ID', 'FECHA', 'ESTABLECIMIENTO', 'SITIO', 'ID_EXTINTOR', 'PROBLEMAS', 'DETECTO', 'ID_CONTROL', 'ESTADO', 'ULTIMO_AVISO', 'AVISOS', 'RESUELTO', 'RESUELTO_POR', 'RESOLUCION', 'HISTORIAL', 'CIERRE_AVISADO'],
  TIPOS: ['ABC', 'BC', 'K', 'D', 'Otro'],
  AGENTES: ['PQS', 'CO2', 'HCFC 123', 'HCFC-236fa', 'Agua', 'AFFF (espuma)', 'Acetato de potasio', 's/d'],
  ESTADOS: ['Operativo', 'Sobrecarga', 'Recargar', 'Fuera de servicio', 'Baja', 's/d (revisar)'],
  PLANTAS: ['Baja', 'Alta', 'Terraza', 'Subsuelo', 'Única', 'Vehículo'],
  MESES_ALARMA: 3, DIAS_POR_VENCER: 30, INICIO: '2026-10-14',   // los extintores nunca controlados avisan recién a los 3 meses de empezar el módulo
  RESP_TRELEW: 'Belén Pellegrini · Melani · Javier Tramaleo',
  RESP_HMH: 'Belén Pellegrini · Melani · SOMI · MAREM',
  CORREOS_HMH: 'erickvelazquezing@gmail.com, fezequielnieto@gmail.com'   // Ing. Erick Velázquez (representante técnico de SOMI) e Ing. Ezequiel Nieto (Mantenimiento HMH) · pedido de Belén 14/10/2026
};

// ------------------------------------------------------------------ INSTALACIÓN (se puede volver a ejecutar sin pisar nada)
function construirModuloIncendio() {
  const p = PropertiesService.getScriptProperties();
  const dir = carpeta_(DriveApp.getFolderById(INC.SIS), INC.CARPETA); p.setProperty(INC.P_CARPETA, dir.getId());
  carpeta_(dir, 'Establecimientos'); carpeta_(dir, 'Respaldo');
  let ss = null, id = p.getProperty(INC.P_LIBRO);
  if (id) { try { const f = DriveApp.getFileById(id); if (!f.isTrashed()) ss = SpreadsheetApp.openById(id); } catch (e) {} }
  if (!ss) { ss = SpreadsheetApp.create('PROTECCIÓN CONTRA INCENDIOS · Sistema HyS'); ss.setSpreadsheetTimeZone(TZ); ss.setSpreadsheetLocale('es_AR'); p.setProperty(INC.P_LIBRO, ss.getId()); DriveApp.getFileById(ss.getId()).moveTo(dir); }
  const hoja = (nombre, fn) => { if (ss.getSheetByName(nombre)) return; const sh = ss.insertSheet(nombre); fn(sh); };
  hoja('SITIOS_INC', sh => {
    encabezar_(sh, 'Lugares con extintores y responsables del control', 'Un renglón por lugar (edificio, CAPS, dispositivo, ambulancias). RESPONSABLES_CONTROL: quiénes hacen el control mensual. ACTIVO = No deja de mostrarlo (no borrar filas).', INC.H_SIT,
      ['Código del establecimiento (BASE COMÚN › ESTABLECIMIENTOS).', 'Nombre del lugar (como en BASE COMÚN › SITIOS).', 'Edificio · CAPS · Dispositivo · Ambulancias', 'Separados por «·».', 'Sí · No', '', 'Lo pone el sistema.']);
    lista_(sh, 2, 300, ['Edificio', 'CAPS', 'Dispositivo', 'Ambulancias']); lista_(sh, 4, 300, ['Sí', 'No']); sh.setColumnWidth(2, 200); sh.setColumnWidth(4, 300);
    incSembrarSitios_(sh);
  });
  hoja('EXTINTORES', sh => {
    encabezar_(sh, 'Inventario de extintores', 'Una fila por extintor. Fechas dd/mm/aaaa. VTO_CARGA: vencimiento de la carga (marbete). PRUEBA_HIDRAULICA_VENCE: si no se sabe, s/d (revisar). Para sacar uno: ESTADO = Baja (no borrar la fila). Las columnas del último control las completa el sistema.', INC.H_EXT,
      ['Lo pone el sistema.', 'Código del establecimiento.', 'Como en SITIOS_INC.', 'Número del extintor en el lugar.', 'Número de chapa.', 'Baja · Alta · Terraza…', 'Servicio o sector.', 'Detalle de la ubicación.', 'ABC · BC · K…', 'PQS · CO2 · HCFC…', 'Kilos.', 'Número de inventario patrimonial.', 'dd/mm/aaaa', 'dd/mm/aaaa o s/d (revisar)', 'Operativo · Sobrecarga · Recargar · Fuera de servicio · Baja', 'Lo pone el sistema.', 'Lo pone el sistema.', 'Enlace a la foto.', 'Enlace a la foto.', 'Enlace a la foto.', '', 'Lo pone el sistema.'],
      [0, 15, 16, 17, 18, 19, 21]);
    lista_(sh, 5, 2000, INC.PLANTAS); lista_(sh, 8, 2000, INC.TIPOS); lista_(sh, 9, 2000, INC.AGENTES); lista_(sh, 14, 2000, INC.ESTADOS);
    sh.getRange(6, 13, 2000, 2).setNumberFormat('dd/mm/yyyy'); sh.getRange(6, 16, 2000, 1).setNumberFormat('dd/mm/yyyy'); sh.getRange(6, 12, 2000, 1).setNumberFormat('@');
    sh.setFrozenColumns(3); sh.setColumnWidth(8, 260); sh.setColumnWidth(21, 280);
  });
  hoja('CONTROLES', sh => {
    encabezar_(sh, 'Controles mensuales de extintores', 'Un control por extintor y por fecha, con 5 verificaciones (Sí · No) y 3 fotos obligatorias: panorámica con el entorno, marbete y N.º de inventario. RESULTADO = Conforme si las 5 dan Sí. Para anular: ESTADO = Anulado (no borrar).', INC.H_CON);
    [5, 6, 7, 8, 9].forEach(c => lista_(sh, c, 5000, ['Sí', 'No'])); lista_(sh, 10, 5000, ['Conforme', 'Con observaciones']); lista_(sh, 17, 5000, ['Vigente', 'Anulado']);
    sh.getRange(6, 2, 5000, 1).setNumberFormat('dd/mm/yyyy'); sh.getRange(6, 17, 5000, 1).setNumberFormat('dd/mm/yyyy');
  });
  hoja('AYUDA', sh => { sh.getRange(1, 1, INC_AYUDA.length, 2).setValues(INC_AYUDA); sh.getRange(1, 1).setFontSize(16).setFontWeight('bold').setFontColor('#0D313F');
    sh.getRange(2, 1, INC_AYUDA.length - 1, 1).setFontWeight('bold').setFontColor('#0D313F'); sh.setColumnWidth(1, 220); sh.setColumnWidth(2, 760); sh.getRange(1, 2, INC_AYUDA.length, 1).setWrap(true); });
  const s1 = ss.getSheetByName('Hoja 1') || ss.getSheetByName('Sheet1'); if (s1 && ss.getSheets().length > 1) ss.deleteSheet(s1);
  try { ss.getSheets().forEach(sh => sh.getDataRange().setFontFamily('Plus Jakarta Sans')); } catch (e) {}
  if (ss.getSheetByName('EXTINTORES').getLastRow() < 6) { try { importarExtintoresIncendio(); } catch (e) { Logger.log('No se pudo importar: ' + e.message); } }   // la primera vez trae la planilla de Belén
  Logger.log('Módulo 10 listo: ' + ss.getUrl() + ' · carpeta ' + dir.getUrl());
  return { ok: true, libro: ss.getUrl(), carpeta: dir.getUrl() };
}
const INC_AYUDA = [
  ['Ayuda · Módulo 10 · Protección contra incendios', ''],
  ['Qué es', 'El inventario de extintores de la red y su control mensual. Versión 0: red Trelew (HZT y sus sitios, HMH) y HSST con sus CAPS.'],
  ['Desde dónde se carga', 'Portal HyS › 10 · Incendio (Higiene y Seguridad: todo). Aplicación «Mi establecimiento» › Incendio (las personas con el módulo Incendio en BASE COMÚN › ACCESOS). También se puede cargar y corregir acá, en cada hoja.'],
  ['SITIOS_INC', 'Cada lugar con extintores y quiénes hacen el control: HMH (Belén, Melani, SOMI y MAREM); HZT, sede ex ADOS (con Adolescencia, PROSATE, Consultorios Externos e Internación de Salud Mental), CAPS, dispositivos y ambulancias de la red Trelew (Belén, Melani y Javier Tramaleo); HSST y sus CAPS (a definir).'],
  ['EXTINTORES', 'Una fila por extintor. La carga inicial salió de la planilla «Inventario de Extintores»; lo que había que revisar quedó escrito en OBSERVACIONES (números de inventario incompletos o repetidos, fechas corregidas, datos faltantes).'],
  ['CONTROLES', 'Control mensual de cada extintor: en su lugar, acceso libre, manómetro, precinto y señalización, más 3 fotos obligatorias (panorámica con el entorno, marbete y N.º de inventario). Cada control actualiza el último control del extintor.'],
  ['Avisos', 'Carga vencida o que vence en 30 días; prueba hidráulica vencida; sin control en los últimos 3 meses (el control es mensual, pero la alarma aparece recién a los 3 meses). Se ven en el portal (10 · Incendio y «Requiere atención»).'],
  ['Fotos', 'Drive › SISTEMA HyS › MÓDULO 10 · PROTECCIÓN CONTRA INCENDIOS › Establecimientos › establecimiento › Controles › año-mes.'],
  ['Normativa', 'Ley 19.587; Dto. 351/79, capítulo 18 (protección contra incendios) y Anexo VII; Res. SRT 463/09 (RGRL).']
];
function incSembrarSitios_(sh) {
  const filas = [['HMH', 'HMH', 'Edificio', INC.RESP_HMH, 'Sí', '', new Date()]];
  const T = (s, t) => filas.push(['HZT', s, t, INC.RESP_TRELEW, 'Sí', '', new Date()]);
  T('HZT Central', 'Edificio'); T('Sede ex ADOS', 'Dispositivo'); T('Centro de Día', 'Dispositivo');
  ['CIT', 'Casa de convivencia', 'Hilando Caminos', 'Pichi Anai'].forEach(s => T(s, 'Dispositivo')); T('Ambulancias', 'Ambulancias');
  try { pTabla_(pBC_().getSheetByName('SITIOS'), 5).forEach(r => { const c = limpio_(r.v[0]), s = limpio_(r.v[1]), t = limpio_(r.v[4]);
    if (c === 'HZT' && t === 'CAPS') T(s, 'CAPS');
    if (c === 'HSST') filas.push(['HSST', s, t === 'CAPS' ? 'CAPS' : 'Edificio', 's/d (a definir)', 'Sí', '', new Date()]); }); } catch (e) {}
  const obs = { 'Sede ex ADOS': 'Incluye Adolescencia, PROSATE, Consultorios Externos e Internación de Salud Mental.' };
  filas.forEach(f => { if (obs[f[1]]) f[5] = obs[f[1]]; });
  filas.forEach(f => { while (f.length < INC.H_SIT.length) f.push(''); if (f[0] === 'HMH') f[7] = INC.CORREOS_HMH; });
  sh.getRange(6, 1, filas.length, INC.H_SIT.length).setValues(filas);
}

// ------------------------------------------------------------------ CARGA INICIAL desde «Inventario de Extintores»
// Cada pestaña de la planilla de Belén va a un lugar. Las filas vacías (solo número) se saltean. No pisa extintores ya importados
// (busca por establecimiento + N.º de inventario + ubicación).
const INC_PESTANAS = { 'HMH': ['HMH', 'HMH'], 'HZT': ['HZT', 'HZT Central'], 'AMBULANCIAS': ['HZT', 'Ambulancias'], 'EX ADOS': ['HZT', 'Sede ex ADOS'],
  'ADOLECENCIA': ['HZT', 'Sede ex ADOS', 'Adolescencia'], 'ADOLESCENCIA': ['HZT', 'Sede ex ADOS', 'Adolescencia'], 'PICHI ANAI': ['HZT', 'Pichi Anai'],
  'CASA DE CONVIVENCIA': ['HZT', 'Casa de convivencia'], 'CIT': ['HZT', 'CIT'], 'HILANDO CAMINOS': ['HZT', 'Hilando Caminos'], 'CENTRO DE DIA': ['HZT', 'Centro de Día'], 'CAPS': ['HZT', '*'] };
const INC_CAPS = { amaya: 'Amaya', corradi: 'Corradi', constitucion: 'Constitución', 'la loma': 'La Loma', sarmiento: 'Sarmiento', echepare: 'Etchepare', etchepare: 'Etchepare',
  'villa italia': 'Villa Italia', 'planta de gas': 'Planta de Gas', 'don bosco': 'Don Bosco', 'tiro federal': 'Tiro Federal', franzetti: 'San Martín', 'san martin': 'San Martín' };
function incFechaFuente_(v) {   // fecha de la planilla de origen → { iso, nota }
  if (v instanceof Date) return { iso: Utilities.formatDate(v, TZ, 'yyyy-MM-dd'), nota: '' };
  const s = limpio_(v); if (!s) return { iso: '', nota: '' };
  let m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s); if (m) return { iso: m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2), nota: '' };
  m = /^(\d{1,2})\/(\d{2})1(20\d\d)$/.exec(s); if (m) return { iso: m[3] + '-' + m[2] + '-' + ('0' + m[1]).slice(-2), nota: 'Vencimiento corregido (en la planilla decía «' + s + '»).' };
  return { iso: '', nota: 'Vencimiento ilegible en la planilla («' + s + '»): revisar.' };
}
const incCap_ = s => { const t = limpio_(s); return t ? t.charAt(0).toUpperCase() + t.slice(1).toLowerCase() : ''; };
function importarExtintoresIncendio() {
  const ss = pInc_(), sh = ss.getSheetByName('EXTINTORES'), ya = incLeer_('EXTINTORES', INC.H_EXT), src = SpreadsheetApp.openById(INC.FUENTE);
  const cuenta = {}; ya.forEach(e => { const n = Number(String(e.ID).split('-').pop()); cuenta[e.ESTABLECIMIENTO] = Math.max(cuenta[e.ESTABLECIMIENTO] || 0, n || 0); });
  const clave = (cod, inv, ubi) => cod + '|' + limpio_(inv) + '|' + sinTildes_(ubi);
  const existe = {}; ya.forEach(e => existe[clave(e.ESTABLECIMIENTO, e.NRO_INVENTARIO, e.UBICACION)] = true);
  const nuevas = [], log = {};
  src.getSheets().forEach(hs => {
    const dest = INC_PESTANAS[limpio_(hs.getName()).toUpperCase()]; if (!dest) { log[hs.getName()] = 'sin destino'; return; }
    const v = hs.getDataRange().getValues(); let n = 0;
    v.slice(1).forEach(r => {
      const planta = limpio_(r[2]), sector = limpio_(r[3]), ubi = limpio_(r[4]), tipo = limpio_(r[5]), agente = limpio_(r[6]), cap = limpio_(r[7]), inv = limpio_(r[8]);
      if (!planta && !sector && !ubi && !tipo && !inv) return;   // renglones vacíos o solo con el número
      const cod = dest[0]; let sitio = dest[1], sec = sector, ub = ubi;
      if (sitio === '*') { sitio = INC_CAPS[sinTildes_(ubi)] || ubi; sec = 'CAPS'; ub = ''; }
      if (dest[2]) sec = dest[2] + (sector ? ' · ' + sector : '');
      const f = incFechaFuente_(r[9]), notas = [];
      if (f.nota) notas.push(f.nota);
      if (limpio_(r[11])) notas.push(/falta/i.test(r[11]) ? 'N.º de inventario incompleto («' + limpio_(r[11]).toLowerCase() + '»): revisar.' : limpio_(r[11]));
      if (!tipo) notas.push('Faltan datos en la planilla de origen: completar.');
      if (!f.iso && !f.nota) notas.push('Sin vencimiento de carga en la planilla de origen.');
      if (existe[clave(cod, inv, ub)]) return;
      cuenta[cod] = (cuenta[cod] || 0) + 1; n++;
      const estado = /operativ/i.test(r[10]) ? 'Operativo' : /sobrecarg/i.test(r[10]) ? 'Sobrecarga' : /recarg/i.test(r[10]) ? 'Recargar' : limpio_(r[10]) ? incCap_(r[10]) : 's/d (revisar)';
      nuevas.push({ ID: 'EXT-' + cod + '-' + ('00' + cuenta[cod]).slice(-3), ESTABLECIMIENTO: cod, SITIO: sitio, NRO_EXTINTOR: limpio_(r[0]), NRO_CHAPA: limpio_(r[1]), PLANTA: incCap_(planta),
        SECTOR: sec, UBICACION: ub, TIPO: tipo, AGENTE: agente || (tipo ? 's/d' : ''), CAPACIDAD_KG: Number(String(cap).replace(/kg/i, '').replace(',', '.').trim()) || cap, NRO_INVENTARIO: inv,
        VTO_CARGA: f.iso ? new Date(f.iso + 'T12:00:00') : '', PRUEBA_HIDRAULICA_VENCE: 's/d (revisar)', ESTADO: estado, OBSERVACIONES: notas.join(' '), ACTUALIZADO: new Date() });
    });
    log[hs.getName()] = n;
  });
  // Números de inventario repetidos dentro del mismo establecimiento
  const todos = ya.concat(nuevas), porInv = {};
  todos.forEach(e => { if (!e.NRO_INVENTARIO) return; const k = e.ESTABLECIMIENTO + '|' + e.NRO_INVENTARIO; (porInv[k] = porInv[k] || []).push(e); });
  Object.keys(porInv).forEach(k => { const l = porInv[k]; if (l.length < 2) return;
    l.forEach(e => { if (nuevas.indexOf(e) < 0) return; e.OBSERVACIONES = (e.OBSERVACIONES ? e.OBSERVACIONES + ' ' : '') + 'N.º de inventario repetido con ' + l.filter(o => o !== e).map(o => o.ID + (o.NRO_EXTINTOR ? ' (n.º ' + o.NRO_EXTINTOR + ')' : '')).join(', ') + ': revisar.'; }); });
  if (nuevas.length) sh.getRange(Math.max(sh.getLastRow(), 5) + 1, 1, nuevas.length, INC.H_EXT.length).setValues(nuevas.map(o => INC.H_EXT.map(h => o[h] == null ? '' : o[h])));
  CacheService.getScriptCache().remove('inc_tablero');
  Logger.log('Importados: ' + nuevas.length + ' · ' + JSON.stringify(log));
  return { ok: true, importados: nuevas.length, porPestana: log };
}

// ------------------------------------------------------------------ ACCESO A DATOS
const pInc_ = () => { const id = PropertiesService.getScriptProperties().getProperty(INC.P_LIBRO); if (!id) throw new Error('El módulo 10 todavía no está instalado (construirModuloIncendio).'); return SpreadsheetApp.openById(id); };
const incISO_ = v => { if (v instanceof Date) return Utilities.formatDate(v, TZ, 'yyyy-MM-dd'); const s = limpio_(v); let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s); if (m) return m[0];
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(s); return m ? m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2) : ''; };
const incFecha_ = v => { const s = incISO_(v); return s ? new Date(s + 'T12:00:00') : ''; };
function incLeer_(hoja, H) {
  const sh = pInc_().getSheetByName(hoja); if (!sh) return [];
  return pTabla_(sh, H.length).map(r => { const o = { fila: r.fila }; H.forEach((h, i) => o[h] = r.v[i] instanceof Date ? incISO_(r.v[i]) : (typeof r.v[i] === 'string' ? r.v[i].trim() : r.v[i])); return o; });
}
function incEscribir_(hoja, H, fila, obj) { const sh = pInc_().getSheetByName(hoja); const v = H.map(h => obj[h] == null ? '' : obj[h]); if (fila) sh.getRange(fila, 1, 1, v.length).setValues([v]); else sh.getRange(Math.max(sh.getLastRow(), 5) + 1, 1, 1, v.length).setValues([v]); }
function incCarpetaEst_(cod, sub) {
  const dir = DriveApp.getFolderById(PropertiesService.getScriptProperties().getProperty(INC.P_CARPETA));
  const E = pEstablecimientos_().filas.find(f => limpio_(f.v[0]) === cod), nombre = cod + (E ? ' · ' + limpio_(E.v[1]) : '');
  let d = carpeta_(carpeta_(dir, 'Establecimientos'), nombre); (sub || []).forEach(s => d = carpeta_(d, s)); return d;
}
// Una foto o varias (hasta 5 por campo desde el 23/10/2026; con varias, una carpeta con todas: Codigo.gs › guardarFotos_). Solo imágenes.
function incFoto_(cod, a, sub, etiqueta) {
  const L = fotosDe_(a).filter(f => /^image\//.test(f.mime)); if (!L.length) return '';
  const nombre = (etiqueta + ' - ' + Utilities.formatDate(new Date(), TZ, 'yyyyMMdd-HHmmss')).replace(/[^\w\-.áéíóúñÁÉÍÓÚÑ ,·]/g, '_');
  return guardarFotos_(incCarpetaEst_(cod, sub), nombre, L.map(f => 'data:' + f.mime + ';base64,' + f.b64));
}
const incHoy_ = () => Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd');
const incTxt_ = iso => iso ? iso.slice(8, 10) + '/' + iso.slice(5, 7) + '/' + iso.slice(0, 4) : '';
function incSumarDias_(f, d) { const x = new Date(f + 'T12:00:00'); x.setDate(x.getDate() + d); return Utilities.formatDate(x, TZ, 'yyyy-MM-dd'); }
function incSumarMeses_(f, m) { const x = new Date(f + 'T12:00:00'); x.setMonth(x.getMonth() + m); return Utilities.formatDate(x, TZ, 'yyyy-MM-dd'); }

// Estado de un extintor: carga y prueba hidráulica (vencida · porvencer: 30 días antes · aldia · sd) y control (sin · atrasado · aldia)
function incEstadoExt_(e, hoy) {
  const vto = incISO_(e.VTO_CARGA), ph = incISO_(e.PRUEBA_HIDRAULICA_VENCE), uc = incISO_(e.ULTIMO_CONTROL);
  const carga = !vto ? 'sd' : vto < hoy ? 'vencida' : vto <= incSumarDias_(hoy, INC.DIAS_POR_VENCER) ? 'porvencer' : 'aldia';
  const prueba = !ph ? 'sd' : ph < hoy ? 'vencida' : ph <= incSumarDias_(hoy, INC.DIAS_POR_VENCER) ? 'porvencer' : 'aldia';
  const control = !uc ? 'sin' : uc < incSumarMeses_(hoy, -INC.MESES_ALARMA) ? 'atrasado' : 'aldia';
  const fuera = /baja/i.test(e.ESTADO), obs = /sobrecarg|recarg|fuera/i.test(e.ESTADO);
  return { carga: carga, prueba: prueba, control: control, baja: fuera, conObs: obs };
}
function incDatos_() {
  const sit = incLeer_('SITIOS_INC', INC.H_SIT).filter(s => s.ACTIVO !== 'No').map(s => Object.assign(s, { ESTABLECIMIENTO: limpio_(s.ESTABLECIMIENTO), SITIO: limpio_(s.SITIO) }));
  const ext = incLeer_('EXTINTORES', INC.H_EXT).map(e => Object.assign(e, { ESTABLECIMIENTO: limpio_(e.ESTABLECIMIENTO), SITIO: limpio_(e.SITIO) }));
  return { sit: sit, ext: ext };
}
function incResumen_(l, hoy) {
  const u = l.filter(e => !/baja/i.test(e.ESTADO)), v = u.map(e => incEstadoExt_(e, hoy)), c = k => v.filter(x => x[k[0]] === k[1]).length;
  const fechas = (campo, k, est) => u.filter((e, i) => v[i][k] === est).map(e => incISO_(e[campo])).filter(Boolean).sort();
  return { total: v.length, paraVerificar: u.filter(e => /^pendiente/i.test(e.VERIFICACION)).length, cargaVencida: c(['carga', 'vencida']), porVencer: c(['carga', 'porvencer']), cargaSd: c(['carga', 'sd']), pruebaVencida: c(['prueba', 'vencida']), pruebaPorVencer: c(['prueba', 'porvencer']), pruebaSd: c(['prueba', 'sd']),
    vencidaDesde: fechas('VTO_CARGA', 'carga', 'vencida')[0] || '', proximoVto: fechas('VTO_CARGA', 'carga', 'porvencer')[0] || '', proximaPrueba: fechas('PRUEBA_HIDRAULICA_VENCE', 'prueba', 'porvencer')[0] || '',
    sinControl: c(['control', 'sin']), controlAtrasado: c(['control', 'atrasado']), controlAlDia: c(['control', 'aldia']), conObs: v.filter(x => x.conObs).length };
}
function incTablero_(fresco) {
  const ca = CacheService.getScriptCache(); if (!fresco) { const k = ca.get('inc_tablero'); if (k) return JSON.parse(k); }
  const D = incDatos_(), hoy = incHoy_(), nom = {}; pEstablecimientos_().filas.forEach(f => nom[limpio_(f.v[0])] = limpio_(f.v[1]));
  const lugares = D.sit.map(s => { const l = D.ext.filter(e => e.ESTABLECIMIENTO === s.ESTABLECIMIENTO && sinTildes_(e.SITIO) === sinTildes_(s.SITIO));
    const uc = l.map(e => incISO_(e.ULTIMO_CONTROL)).filter(Boolean).sort().pop() || '';
    return { cod: s.ESTABLECIMIENTO, nombreEst: nom[s.ESTABLECIMIENTO] || s.ESTABLECIMIENTO, sitio: s.SITIO, tipo: s.TIPO_SITIO, responsables: s.RESPONSABLES_CONTROL, obs: s.OBSERVACIONES, ultimoControl: uc, r: incResumen_(l, hoy) }; });
  // Avisos para el tablero de inicio: por lugar (carga vencida, prueba vencida, 3 meses sin control)
  const avisos = [], fa = incFallasAbiertas_();
  lugares.forEach(L => { const r = L.r; if (!r.total) return;
    const fl = fa.filter(f => limpio_(f.ESTABLECIMIENTO) === L.cod && sinTildes_(f.SITIO) === sinTildes_(L.sitio));
    if (fl.length) avisos.push({ nivel: 'er', cod: L.cod, sitio: L.sitio, texto: fl.length + (fl.length > 1 ? ' extintores con problemas sin resolver' : ' extintor con un problema sin resolver') + ' (desde el ' + incTxt_(fl.map(f => incISO_(f.FECHA)).sort()[0]) + '; van en el correo a SOMI y Mantenimiento: el día que aparecen y cada ' + INC.DIAS_RECORDATORIO + ' días)' });
    if (r.cargaVencida) avisos.push({ nivel: 'er', cod: L.cod, sitio: L.sitio, texto: r.cargaVencida + (r.cargaVencida > 1 ? ' extintores con la carga vencida' : ' extintor con la carga vencida') + (r.vencidaDesde ? ' (desde el ' + incTxt_(r.vencidaDesde) + ')' : '') });
    if (r.pruebaVencida) avisos.push({ nivel: 'er', cod: L.cod, sitio: L.sitio, texto: r.pruebaVencida + ' con la prueba hidráulica vencida' });
    const sinC = r.controlAtrasado + (hoy >= incSumarMeses_(INC.INICIO, INC.MESES_ALARMA) ? r.sinControl : 0); if (sinC && (!L.ultimoControl || L.ultimoControl < incSumarMeses_(hoy, -INC.MESES_ALARMA))) avisos.push({ nivel: 'wa', cod: L.cod, sitio: L.sitio, texto: 'Más de 3 meses sin control de extintores' + (L.ultimoControl ? ' (último: ' + L.ultimoControl + ')' : ' (nunca controlado)') });
    if (r.paraVerificar) avisos.push({ nivel: 'av', cod: L.cod, sitio: L.sitio, texto: r.paraVerificar + (r.paraVerificar > 1 ? ' extintores agregados o cambiados' : ' extintor agregado o cambiado') + ' desde la aplicación: falta verificar' });
    // 30 días antes del vencimiento (pedido de Belén 14/10/2026): carga y prueba hidráulica
    if (r.porVencer) avisos.push({ nivel: 'wa', cod: L.cod, sitio: L.sitio, texto: r.porVencer + (r.porVencer > 1 ? ' extintores con la carga por vencer' : ' extintor con la carga por vencer') + ': vence el ' + incTxt_(r.proximoVto) + ' (aviso 30 días antes)' });
    if (r.pruebaPorVencer) avisos.push({ nivel: 'wa', cod: L.cod, sitio: L.sitio, texto: r.pruebaPorVencer + ' con la prueba hidráulica por vencer: vence el ' + incTxt_(r.proximaPrueba) + ' (aviso 30 días antes)' }); });
  if (typeof incSrvAvisos_ === 'function') incSrvAvisos_().forEach(a => avisos.unshift(a));   // novedades de la recorrida de seguridad (IncendioServicios.gs)
  const out = { ok: true, hoy: hoy, lugares: lugares, avisos: avisos, totales: incResumen_(D.ext, hoy), libro: pInc_().getUrl(),
    carpeta: DriveApp.getFolderById(PropertiesService.getScriptProperties().getProperty(INC.P_CARPETA)).getUrl() };
  try { ca.put('inc_tablero', JSON.stringify(out), 600); } catch (e) {}
  return out;
}
// Inventario de un establecimiento (o de un lugar), con el estado de cada extintor y sus últimos controles
function incDetalle_(cod, sitio) {
  cod = limpio_(cod); const D = incDatos_(), hoy = incHoy_();
  const fa = incFallasAbiertas_();
  const ext = D.ext.filter(e => e.ESTABLECIMIENTO === cod && (!sitio || sinTildes_(e.SITIO) === sinTildes_(sitio))).map(e => { const f = fa.find(z => z.ID_EXTINTOR === e.ID);
    return Object.assign(e, { est: incEstadoExt_(e, hoy), falla: f ? { ID: f.ID, FECHA: incISO_(f.FECHA), PROBLEMAS: f.PROBLEMAS, AVISOS: f.AVISOS, ULTIMO_AVISO: incISO_(f.ULTIMO_AVISO), DETECTO: f.DETECTO } : null }); });
  const ids = {}; ext.forEach(e => ids[e.ID] = true);
  const con = incLeer_('CONTROLES', INC.H_CON).filter(c => ids[c.ID_EXTINTOR] && c.ESTADO !== 'Anulado').slice(-300).reverse();
  return { ok: true, cod: cod, hoy: hoy, sitios: D.sit.filter(s => s.ESTABLECIMIENTO === cod), extintores: ext, controles: con,
    listas: { problemas: INC.PROBLEMAS, requeridos: INC_REQ_ALTA, tipos: INC.TIPOS, agentes: INC.AGENTES, estados: INC.ESTADOS, plantas: INC.PLANTAS, chequeos: INC.CHEQUEOS, fotos: INC.FOTOS } };
}
// Alta o corrección de un extintor. Alta: desde el portal (HyS), desde «Mi establecimiento» (i_ext_alta: Melani, SOMI, MAREM…) y desde
// MIPyV (Javier Tramaleo). En el alta los datos y las 3 fotos son obligatorios (pedido de Belén 14/10/2026). La corrección (con ID) es solo del portal.
const INC_REQ_ALTA = [['SITIO', 'el lugar'], ['PLANTA', 'la planta'], ['SECTOR', 'el sector o servicio'], ['UBICACION', 'dónde está exactamente'], ['TIPO', 'el tipo'],
  ['AGENTE', 'el agente extintor'], ['CAPACIDAD_KG', 'la capacidad (kg)'], ['NRO_INVENTARIO', 'el N.º de inventario (si no tiene, «s/d»)'], ['VTO_CARGA', 'el vencimiento de la carga (está en la tarjeta)']];
// Desde la aplicación (codPermitido) también se puede corregir el nombre (N.º del extintor) y la ubicación (lugar, planta, sector,
// ubicación): queda «Pendiente» de verificar por HyS, con el cambio anotado en CAMBIOS. Lo que carga o corrige HyS desde el portal queda verificado.
const INC_EDIT_APP = [['NRO_EXTINTOR', 'Nombre o N.º'], ['SITIO', 'Lugar'], ['PLANTA', 'Planta'], ['SECTOR', 'Sector'], ['UBICACION', 'Ubicación']];
const INC_NOMBRES = { NRO_EXTINTOR: 'Nombre o N.º', NRO_CHAPA: 'N.º de chapa', SITIO: 'Lugar', PLANTA: 'Planta', SECTOR: 'Sector', UBICACION: 'Ubicación', TIPO: 'Tipo', AGENTE: 'Agente',
  CAPACIDAD_KG: 'Capacidad', NRO_INVENTARIO: 'N.º de inventario', VTO_CARGA: 'Vencimiento de la carga', PRUEBA_HIDRAULICA_VENCE: 'Prueba hidráulica', ESTADO: 'Estado', OBSERVACIONES: 'Observaciones' };
// Anota los cambios (lo más nuevo primero) en la columna CAMBIOS
function incAnotarCambio_(o, antes, quien, extra) {
  const dif = !antes ? [] : Object.keys(INC_NOMBRES).filter(k => k !== 'OBSERVACIONES' && String(incISO_(antes[k]) || limpio_(antes[k])) !== String(incISO_(o[k]) || limpio_(o[k])))
    .map(k => INC_NOMBRES[k] + ': «' + (incISO_(antes[k]) || limpio_(antes[k]) || '—') + '» → «' + (incISO_(o[k]) || limpio_(o[k]) || '—') + '»');
  const txt = [dif.join('; '), extra].filter(Boolean).join(' · '); if (!txt) return false;
  o.CAMBIOS = (Utilities.formatDate(new Date(), TZ, 'dd/MM/yyyy') + ' · ' + quien + ': ' + txt + (o.CAMBIOS ? '\n' + o.CAMBIOS : '')).slice(0, 2000);
  return true;
}
function incExtGuardar_(x, quien, codPermitido) {
  const cod = limpio_(x.ESTABLECIMIENTO), L = incLeer_('EXTINTORES', INC.H_EXT); let e = x.ID ? L.find(o => o.ID === x.ID) : null;
  if (x.ID && !e) return { ok: false, mensaje: 'No encontré ese extintor.' };
  if (codPermitido && e) {   // corrección desde la aplicación: solo nombre y ubicación, de este establecimiento
    if (limpio_(e.ESTABLECIMIENTO) !== codPermitido) return { ok: false, mensaje: 'Ese extintor no es de este establecimiento.' };
    const y = { ID: e.ID, ESTABLECIMIENTO: codPermitido }; INC_EDIT_APP.forEach(c => { if (c[0] in x) y[c[0]] = x[c[0]]; });
    if (!limpio_(y.SITIO || e.SITIO) || ('SECTOR' in y && !limpio_(y.SECTOR)) || ('UBICACION' in y && !limpio_(y.UBICACION))) return { ok: false, mensaje: 'El lugar, el sector y la ubicación no pueden quedar vacíos.' };
    if (y.SITIO && !incDatos_().sit.some(s => s.ESTABLECIMIENTO === codPermitido && sinTildes_(s.SITIO) === sinTildes_(y.SITIO))) return { ok: false, mensaje: 'Ese lugar no está en la lista del establecimiento.' };
    x = y;
  }
  const sitio = limpio_(x.SITIO || (e && e.SITIO)); if (!cod || !sitio) return { ok: false, mensaje: 'Faltan el establecimiento y el lugar.' };
  if (codPermitido && cod !== codPermitido) return { ok: false, mensaje: 'Desde la aplicación solo se pueden agregar extintores de este establecimiento.' };
  const fotos = x.fotos || {};
  if (!e) {   // alta: todo obligatorio
    if (!incDatos_().sit.some(s => s.ESTABLECIMIENTO === cod && sinTildes_(s.SITIO) === sinTildes_(sitio))) return { ok: false, mensaje: 'Ese lugar no está en la lista del establecimiento. Avisale a Higiene y Seguridad.' };
    const faltan = INC_REQ_ALTA.filter(r => !limpio_(x[r[0]])).map(r => r[1]); if (faltan.length) return { ok: false, mensaje: 'Falta completar: ' + faltan.join(', ') + '.' };
    if (!/^s\/d/i.test(x.VTO_CARGA) && !incISO_(x.VTO_CARGA)) return { ok: false, mensaje: 'El vencimiento de la carga tiene que ser una fecha.' };
    const sinFoto = INC.FOTOS.filter(f => !/^data:image\//.test(String(fotos[f[0]] || ''))).map(f => f[1]); if (sinFoto.length) return { ok: false, mensaje: 'Faltan las fotos: ' + sinFoto.join(', ') + '. Son obligatorias las 3.' };
    const inv = sinTildes_(x.NRO_INVENTARIO).replace(/\s+/g, '');
    const rep = /^s\/?d/.test(inv) ? null : L.find(z => limpio_(z.ESTABLECIMIENTO) === cod && !/baja/i.test(z.ESTADO) && sinTildes_(z.NRO_INVENTARIO).replace(/\s+/g, '') === inv);
    if (rep) return { ok: false, mensaje: 'Ese N.º de inventario ya está cargado: ' + rep.ID + ' (' + [rep.SITIO, rep.SECTOR, rep.UBICACION].filter(Boolean).join(' · ') + '). Si es el mismo extintor, buscalo en la lista; si se mudó, avisale a Higiene y Seguridad.' };
  }
  const o = e ? Object.assign({}, e) : { ID: 'EXT-' + cod + '-' + ('00' + (L.filter(z => limpio_(z.ESTABLECIMIENTO) === cod).reduce((m, z) => Math.max(m, Number(String(z.ID).split('-').pop()) || 0), 0) + 1)).slice(-3), ESTADO: 'Operativo' };
  ['ESTABLECIMIENTO', 'SITIO', 'NRO_EXTINTOR', 'NRO_CHAPA', 'PLANTA', 'SECTOR', 'UBICACION', 'TIPO', 'AGENTE', 'CAPACIDAD_KG', 'NRO_INVENTARIO', 'ESTADO', 'OBSERVACIONES'].forEach(k => { if (k in x && (e || x[k] !== '')) o[k] = limpio_(x[k]); });
  ['VTO_CARGA', 'PRUEBA_HIDRAULICA_VENCE'].forEach(k => { if (k in x) o[k] = /^s\/d/i.test(x[k]) ? x[k] : incFecha_(x[k]); });
  if (!e && !o.PRUEBA_HIDRAULICA_VENCE) o.PRUEBA_HIDRAULICA_VENCE = 's/d (revisar)';
  ['VTO_CARGA', 'PRUEBA_HIDRAULICA_VENCE', 'ULTIMO_CONTROL'].forEach(k => { if (o[k] && !(o[k] instanceof Date) && /^\d{4}-/.test(o[k])) o[k] = incFecha_(o[k]); });
  const et = o.ID + (o.NRO_EXTINTOR ? ' n.º ' + o.NRO_EXTINTOR : '') + ' · ' + o.SITIO, sub = ['Altas', incHoy_().slice(0, 7)];
  INC.FOTOS.forEach(f => { if (/^data:image\//.test(String(fotos[f[0]] || ''))) o[f[0]] = incFoto_(cod, fotos[f[0]], sub, et + ' · ' + f[1]); });
  if (!e) o.OBSERVACIONES = 'Alta ' + incHoy_() + ' · ' + quien + '.' + (o.OBSERVACIONES ? ' ' + o.OBSERVACIONES : '');
  const cambio = e ? incAnotarCambio_(o, e, quien, INC.FOTOS.some(f => fotos[f[0]]) ? 'fotos nuevas' : '') : incAnotarCambio_(o, null, quien, 'Alta');
  if (e && codPermitido && !cambio) return { ok: false, mensaje: 'No cambiaste nada.' };
  o.VERIFICACION = codPermitido ? 'Pendiente' : 'Verificado ' + incTxt_(incHoy_()) + ' · ' + quien;   // lo que carga HyS desde el portal ya está verificado
  o.ACTUALIZADO = new Date(); delete o.fila; delete o.est;
  incEscribir_('EXTINTORES', INC.H_EXT, e ? e.fila : null, o);
  CacheService.getScriptCache().remove('inc_tablero');
  let aviso = '';   // si el estado pasó a uno que impide o dificulta el uso, se avisa por correo
  if (e && INC_ESTADO_FALLA.test(o.ESTADO) && !INC_ESTADO_FALLA.test(e.ESTADO || '')) aviso = incRegistrarFalla_(o, ['Estado: ' + o.ESTADO], { quien: quien, fecha: incHoy_(), obs: limpio_(x.OBSERVACIONES), fotos: {}, id: o.ID });
  return { ok: true, id: o.ID, aviso: aviso };
}
// ------------------------------------------------------------------ AVISO POR CORREO DE EXTINTORES CON PROBLEMAS (regla de Belén, 14/10/2026)
// Para los lugares con CORREOS_FALLA en SITIOS_INC (por ahora HMH: Ing. Erick Velázquez, SOMI, e Ing. Ezequiel Nieto, Mantenimiento).
// Se manda cuando un control marca algo que dificulta o impide usar el extintor (casillas de problemas, alguna verificación en «No»
// o estado Sobrecarga, Recargar o Fuera de servicio), o cuando HyS cambia el estado a uno de esos. Sale desde belenpellegrini.hys@gmail.com
// si está en Gmail › «Enviar correo como» de la cuenta dueña del sistema; si no, sale desde esa cuenta con respuesta a esa dirección.
const INC_ESTADO_FALLA = /sobrecarg|recarg|fuera de servicio/i;
const INC_NO_FALLA = { EN_LUGAR: 'No está en su lugar o no se ve', ACCESO_LIBRE: 'Acceso obstruido', MANOMETRO: 'Presión fuera de rango (manómetro fuera del verde)', PRECINTO: 'Sin precinto o seguro', SENALIZACION: 'Sin señalización' };
function incFallas_(x, probs, estado) {
  const l = probs.slice(); Object.keys(INC_NO_FALLA).forEach(k => { if (x[k] === 'No') l.push(INC_NO_FALLA[k]); });
  if (estado && INC_ESTADO_FALLA.test(estado)) l.push('Estado: ' + estado);
  return l.filter((v, i) => l.indexOf(v) === i);
}
function incCorreosFalla_(cod, sitio) {
  const S = incLeer_('SITIOS_INC', INC.H_SIT).filter(s => limpio_(s.ESTABLECIMIENTO) === cod && s.ACTIVO !== 'No');
  const s = S.find(z => sinTildes_(z.SITIO) === sinTildes_(sitio)) || S.find(z => limpio_(z.CORREOS_FALLA));
  return String((s && s.CORREOS_FALLA) || '').split(/[,;\s]+/).map(m => m.trim()).filter(m => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(m));
}
// Problemas abiertos: hoja FALLAS (una fila por problema de un extintor). Los avisos van TODOS JUNTOS (pedido de Belén 14/10/2026):
// un solo correo por establecimiento, a las 6 h (activador diario resumenFallasIncendio), el día siguiente a que hay problemas nuevos o
// cerrados y, mientras queden abiertos, cada 3 días. Lista: nuevos, los que siguen sin resolver (con los días) y los resueltos.
function incHojaFallas_() {
  const ss = pInc_(); let sh = ss.getSheetByName('FALLAS'); if (sh) return sh;
  sh = ss.insertSheet('FALLAS');
  encabezar_(sh, 'Extintores con problemas (avisos por correo)', 'Una fila por problema detectado en un extintor. Todos los problemas van juntos en un solo correo a SITIOS_INC › CORREOS_FALLA: a las 6 h del día siguiente a que aparecen y, mientras ESTADO = Abierta, cada 3 días. Para cerrarla: «Marcar resuelto» en el portal o en la aplicación (o ESTADO = Resuelta acá, con la fecha en RESUELTO).', INC.H_FAL,
    ['Lo pone el sistema.', 'Día que se detectó.', 'Código del establecimiento.', 'Lugar.', 'Extintor (EXTINTORES › ID).', 'Lo que se marcó.', 'Quién lo detectó.', 'Control que lo detectó.', 'Abierta · Resuelta', 'Último correo en que fue.', 'Cantidad de correos.', 'Día que se resolvió.', 'Quién lo marcó resuelto.', 'Qué se hizo.', 'Lo pone el sistema.', 'Día en que se avisó el cierre.'], [0, 9, 10, 14, 15]);
  lista_(sh, 8, 2000, ['Abierta', 'Resuelta']); [2, 10, 12, 16].forEach(c => sh.getRange(6, c, 2000, 1).setNumberFormat('dd/mm/yyyy'));
  sh.setColumnWidth(6, 320); sh.setColumnWidth(15, 320);
  return sh;
}
const incFallasTodas_ = () => { try { return incLeer_('FALLAS', INC.H_FAL).filter(f => f.ID); } catch (x) { return []; } };
const incFallasAbiertas_ = () => incFallasTodas_().filter(f => !/^resuel/i.test(f.ESTADO || ''));
function incFechasFalla_(o) { ['FECHA', 'ULTIMO_AVISO', 'RESUELTO', 'CIERRE_AVISADO'].forEach(k => { if (o[k] && !(o[k] instanceof Date) && /^\d{4}-|\/\d{4}/.test(o[k])) o[k] = incFecha_(o[k]); }); return o; }
// Registra el problema (o lo suma al que ya está abierto). No manda correo: va en el resumen del día. Devuelve el texto para CONTROLES › AVISO_CORREO.
function incRegistrarFalla_(e, fallas, d) {
  const cod = limpio_(e.ESTABLECIMIENTO), para = incCorreosFalla_(cod, e.SITIO); if (!para.length) return '';
  const hoy = incHoy_(), ab = (incHojaFallas_(), incFallasAbiertas_()).find(f => f.ID_EXTINTOR === e.ID);
  const linea = incTxt_(incISO_(d.fecha) || hoy) + ' · ' + d.quien + ': ' + fallas.join('; ') + (d.obs ? ' (' + d.obs + ')' : '');
  const va = 'Va en el próximo correo (' + INC.HORA_RESUMEN + ' h) a ' + para.join(', ') + ', junto con los demás extintores con problemas.';
  if (ab) {
    const previos = String(ab.PROBLEMAS || '').split(' · '), nuevos = fallas.filter(f => previos.indexOf(f) < 0);
    const o = Object.assign({}, ab); delete o.fila; o.HISTORIAL = (linea + (o.HISTORIAL ? '\n' + o.HISTORIAL : '')).slice(0, 3000);
    if (nuevos.length) { o.PROBLEMAS = previos.concat(nuevos).filter(Boolean).join(' · '); o.ULTIMO_AVISO = ''; }   // problemas nuevos: vuelve a ir como novedad en el próximo correo
    incEscribir_('FALLAS', INC.H_FAL, ab.fila, incFechasFalla_(o));
    return nuevos.length ? va : 'Ya tenía un problema abierto desde el ' + incTxt_(incISO_(ab.FECHA)) + ': sigue en el correo cada ' + INC.DIAS_RECORDATORIO + ' días hasta que se marque resuelto.';
  }
  incEscribir_('FALLAS', INC.H_FAL, null, incFechasFalla_({ ID: 'FAL-' + cod + '-' + Utilities.formatDate(new Date(), TZ, 'yyMMddHHmmss') + '-' + e.ID.split('-').pop(), FECHA: incISO_(d.fecha) || hoy, ESTABLECIMIENTO: cod, SITIO: e.SITIO, ID_EXTINTOR: e.ID,
    PROBLEMAS: fallas.join(' · '), DETECTO: d.quien, ID_CONTROL: d.id, ESTADO: 'Abierta', AVISOS: 0, HISTORIAL: linea }));
  CacheService.getScriptCache().remove('inc_tablero');
  return va;
}
// Problemas que surgen del INVENTARIO (sin esperar el control): carga vencida, prueba hidráulica vencida y estado Sobrecarga, Recargar
// o Fuera de servicio. Solo en los establecimientos con CORREOS_FALLA (HMH). Abre o completa el problema del extintor en FALLAS. (14/10/2026)
function incFallasInventario_() {
  const hoy = incHoy_(), E = incLeer_('EXTINTORES', INC.H_EXT).filter(e => !/baja/i.test(e.ESTADO || '')), ab = incFallasAbiertas_(), con = {}; let n = 0;
  E.forEach(e => {
    const cod = limpio_(e.ESTABLECIMIENTO); if (!(cod in con)) con[cod] = incCorreosFalla_(cod, e.SITIO).length > 0; if (!con[cod]) return;
    const vto = incISO_(e.VTO_CARGA), ph = incISO_(e.PRUEBA_HIDRAULICA_VENCE), probs = [];
    if (vto && vto < hoy) probs.push('Carga vencida');
    if (!vto) probs.push('Sin dato del vencimiento de la carga (revisar la tarjeta)');
    if (ph && ph < hoy) probs.push('Prueba hidráulica vencida');
    if (INC_ESTADO_FALLA.test(e.ESTADO || '')) probs.push('Estado: ' + e.ESTADO);
    if (!probs.length) return;
    const f = ab.find(z => z.ID_EXTINTOR === e.ID), previos = f ? String(f.PROBLEMAS || '').split(' · ') : [];
    if (probs.every(p => previos.indexOf(p) >= 0)) return;
    incRegistrarFalla_(e, probs, { quien: 'Inventario (vencimiento o estado)', fecha: hoy, obs: '', fotos: {}, id: 'INVENTARIO' }); n++;
  });
  return n;
}
// Extintores que vencen en los próximos 30 días (carga o prueba hidráulica), para el correo
function incPorVencer_(cod, E) {
  const hoy = incHoy_(), lim = incSumarDias_(hoy, INC.DIAS_POR_VENCER);
  return E.filter(e => limpio_(e.ESTABLECIMIENTO) === cod && !/baja/i.test(e.ESTADO || '')).map(e => {
    const v = incISO_(e.VTO_CARGA), p = incISO_(e.PRUEBA_HIDRAULICA_VENCE), q = [];
    if (v && v >= hoy && v <= lim) q.push('Carga vence el ' + incTxt_(v)); if (p && p >= hoy && p <= lim) q.push('Prueba hidráulica vence el ' + incTxt_(p));
    return q.length ? { e: e, txt: q.join(' · '), fecha: [v, p].filter(x => x && x >= hoy && x <= lim).sort()[0] } : null; }).filter(Boolean).sort((a, b) => a.fecha.localeCompare(b.fecha));
}
// Correo único de un establecimiento con todos los extintores con problemas
function incMailResumen_(cod, para, nuevos, siguen, resueltos, E, porVencer) {
  porVencer = porVencer || [];
  const nom = (pEstablecimientos_().filas.find(r => limpio_(r.v[0]) === cod) || { v: [cod, cod] }).v[1], hoy = incHoy_();
  const esc_ = t => String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const ext = id => E.find(x => x.ID === id) || { ID: id }, dias = f => Math.round((new Date(hoy + 'T12:00:00') - new Date((incISO_(f.FECHA) || hoy) + 'T12:00:00')) / 864e5);
  const nombre = e => (e.NRO_EXTINTOR ? 'N.º ' + e.NRO_EXTINTOR + ' · ' : '') + e.ID, ubic = e => [e.PLANTA ? 'Planta ' + String(e.PLANTA).toLowerCase() : '', e.SECTOR, e.UBICACION].filter(Boolean).join(' · ') || 's/d';
  const venc = e => 'Carga: ' + (incISO_(e.VTO_CARGA) ? (incISO_(e.VTO_CARGA) < hoy ? 'vencida el ' : 'hasta ') + incTxt_(incISO_(e.VTO_CARGA)) : 'sin dato') + ' · Prueba hidráulica: ' + (incISO_(e.PRUEBA_HIDRAULICA_VENCE) ? (incISO_(e.PRUEBA_HIDRAULICA_VENCE) < hoy ? 'vencida el ' : 'hasta ') + incTxt_(incISO_(e.PRUEBA_HIDRAULICA_VENCE)) : 'sin dato');
  const fotos = e => INC.FOTOS.filter(f => /^http/.test(String(e[f[0]] || ''))).map(f => '<a href="' + e[f[0]] + '">' + f[1] + '</a>').join(' · ');
  const th = 'style="text-align:left;padding:6px 8px;background:#EEF4F6;color:#4F616B;font-size:12px"', td = 'style="padding:6px 8px;border-top:1px solid #E4EBEE;vertical-align:top;font-size:13px"';
  const tabla = (L, extra) => '<table style="border-collapse:collapse;width:100%;margin:4px 0 14px"><tr><th ' + th + '>Extintor</th><th ' + th + '>Ubicación</th><th ' + th + '>Problemas</th><th ' + th + '>' + extra[0] + '</th></tr>' +
    L.map(f => { const e = ext(f.ID_EXTINTOR); return '<tr><td ' + td + '><b>' + esc_(nombre(e)) + '</b><br><span style="color:#4F616B">' + esc_([e.TIPO, e.AGENTE, e.CAPACIDAD_KG ? e.CAPACIDAD_KG + ' kg' : ''].filter(Boolean).join(' · ')) + (e.NRO_INVENTARIO ? ' · inv. ' + esc_(e.NRO_INVENTARIO) : '') + '</span></td>' +
      '<td ' + td + '>' + esc_(ubic(e)) + '</td><td ' + td + '><b>' + esc_(String(f.PROBLEMAS || '').split(' · ').join(', ')) + '</b><br><span style="font-size:12px;color:#4F616B">' + esc_(venc(e)) + '</span>' + (fotos(e) ? '<br><span style="font-size:12px">' + fotos(e) + '</span>' : '') + '</td><td ' + td + '>' + extra[1](f) + '</td></tr>'; }).join('') + '</table>';
  const tot = nuevos.length + siguen.length;   // (porVencer va aparte: todavía no son problemas)
  const asunto = cod + ' · Extintores con problemas: ' + (tot ? tot + ' sin resolver' + (nuevos.length ? ' (' + nuevos.length + (nuevos.length > 1 ? ' nuevos)' : ' nuevo)') : '') : 'todos resueltos') + (resueltos.length ? ' · ' + resueltos.length + ' resuelto' + (resueltos.length > 1 ? 's' : '') : '');
  // Texto del correo (pedido de Belén 14/10/2026): saludo, motivo, detalle y cierre; tono cordial, sin la frase de cada cuántos días llega
  const saludo = 'Buenos días:';
  const motivo = nuevos.length ? 'Les escribo para informarles cuáles son los extintores del ' + nom + ' que presentan problemas que dificultan o impiden su uso.'
    : siguen.length ? 'Les escribo para recordarles cuáles son los extintores del ' + nom + ' que siguen con problemas que dificultan o impiden su uso.'
    : 'Les escribo para informarles que los siguientes extintores del ' + nom + ' quedaron resueltos.';
  const detalle = tot ? 'Abajo va el detalle de cada uno' + (nuevos.length && siguen.length ? ', separados entre los nuevos y los que siguen pendientes' : '') + (resueltos.length ? ', y también los que ya quedaron resueltos' : '') + '. La información surge de los vencimientos del inventario (carga y prueba hidráulica) y de lo registrado en los controles.'
    : 'Abajo va el detalle.';
  const pedido = tot ? 'Les pido, por favor, su revisión y la reposición, recarga o reparación que corresponda, y que me avisen cuando cada uno quede resuelto.' : 'Muchas gracias por la gestión.';
  const cierre = 'Quedo a disposición por cualquier consulta.', saludoFinal = 'Saludos cordiales,';
  const intro = [motivo, detalle, pedido].join(' ');
  const norma = 'Los extintores deben mantenerse en condiciones de uso, a la vista y con acceso libre (Ley 19.587; Dto. 351/79, cap. 18).';
  const html = '<div style="font-family:Arial,sans-serif;font-size:14px;color:#33434C;max-width:760px"><p>' + esc_(saludo) + '</p><p>' + esc_(motivo) + '</p><p>' + esc_(detalle) + '</p><p>' + esc_(pedido) + '</p>' +
    (nuevos.length ? '<p style="margin:14px 0 4px"><b>Nuevos (' + nuevos.length + ')</b></p>' + tabla(nuevos, ['Detectado', f => esc_(incTxt_(incISO_(f.FECHA)))]) : '') +
    (siguen.length ? '<p style="margin:14px 0 4px"><b>Siguen sin resolver (' + siguen.length + ')</b></p>' + tabla(siguen.sort((a, b) => dias(b) - dias(a)), ['Hace', f => '<b>' + dias(f) + (dias(f) === 1 ? ' día' : ' días') + '</b><br><span style="color:#4F616B">desde el ' + esc_(incTxt_(incISO_(f.FECHA))) + '</span>']) : '') +
    (porVencer.length ? '<p style="margin:14px 0 4px"><b>Vencen en los próximos ' + INC.DIAS_POR_VENCER + ' días (' + porVencer.length + ')</b></p><table style="border-collapse:collapse;width:100%;margin:4px 0 14px"><tr><th ' + th + '>Extintor</th><th ' + th + '>Ubicación</th><th ' + th + '>Vencimiento</th></tr>' +
      porVencer.map(x => '<tr><td ' + td + '><b>' + esc_(nombre(x.e)) + '</b></td><td ' + td + '>' + esc_(ubic(x.e)) + '</td><td ' + td + '>' + esc_(x.txt) + '</td></tr>').join('') + '</table>' : '') +
    (resueltos.length ? '<p style="margin:14px 0 4px"><b>Resueltos (' + resueltos.length + ')</b></p>' + tabla(resueltos, ['Resuelto', f => esc_(incTxt_(incISO_(f.RESUELTO))) + (f.RESOLUCION ? '<br><span style="color:#4F616B">' + esc_(f.RESOLUCION) + '</span>' : '')]) : '') +
    '<p>' + esc_(cierre) + '</p><p>' + esc_(saludoFinal) + '<br>Servicio de Higiene y Seguridad Laboral · HZT / HMH</p><p style="color:#4F616B;font-size:12px">' + esc_(norma) + '</p>' +
    '<p><img src="cid:logo" alt="HySL · Hospitales más seguros para las personas" style="width:220px"></p></div>';
  const lin = f => { const e = ext(f.ID_EXTINTOR); return '- ' + nombre(e) + ' · ' + ubic(e) + ': ' + String(f.PROBLEMAS || '').split(' · ').join(', ') + ' (' + venc(e) + ')'; };
  const texto = saludo + '\n\n' + motivo + '\n\n' + detalle + '\n\n' + pedido + (nuevos.length ? '\n\nNuevos:\n' + nuevos.map(lin).join('\n') : '') + (siguen.length ? '\n\nSiguen sin resolver:\n' + siguen.map(f => lin(f) + ' (hace ' + dias(f) + ' días)').join('\n') : '') +
    (porVencer.length ? '\n\nVencen en los próximos ' + INC.DIAS_POR_VENCER + ' días:\n' + porVencer.map(x => '- ' + nombre(x.e) + ' · ' + ubic(x.e) + ': ' + x.txt).join('\n') : '') +
    (resueltos.length ? '\n\nResueltos:\n' + resueltos.map(lin).join('\n') : '') + '\n\n' + cierre + '\n\n' + saludoFinal + '\nServicio de Higiene y Seguridad Laboral · HZT / HMH\n\n' + norma;
  try {
    const op = { htmlBody: html, name: 'Higiene y Seguridad Laboral · HZT / HMH' };
    try { op.inlineImages = { logo: DriveApp.getFileById(DGM_LOGO_PIE).getBlob() }; } catch (x) { op.htmlBody = html.replace(/<p><img[^>]*><\/p>/, ''); }
    const propia = String(Session.getEffectiveUser().getEmail()).toLowerCase();
    if (INC.REMITENTE.toLowerCase() !== propia) { if (GmailApp.getAliases().map(a => a.toLowerCase()).indexOf(INC.REMITENTE.toLowerCase()) >= 0) op.from = INC.REMITENTE; else op.replyTo = INC.REMITENTE; }
    GmailApp.sendEmail(para.join(','), asunto, texto, op);
    return 'Enviado ' + Utilities.formatDate(new Date(), TZ, 'dd/MM/yyyy HH:mm') + ' a ' + para.join(', ');
  } catch (err) { return 'No se pudo enviar: ' + (err.message || err); }
}
// Activador diario (6 h): arma y manda el correo único de cada establecimiento. fuerza = true lo manda aunque no toque (botón del portal).
function resumenFallasIncendio(fuerza) {
  if (!PropertiesService.getScriptProperties().getProperty(INC.P_LIBRO)) return { ok: false, mensaje: 'Módulo no instalado.' };
  incHojaFallas_(); try { incFallasInventario_(); } catch (e) { Logger.log('Inventario: ' + e.message); }   // vencidos y estados del inventario, sin esperar el control
  const hoy = incHoy_(), lim = incSumarDias_(hoy, -INC.DIAS_RECORDATORIO), E = incLeer_('EXTINTORES', INC.H_EXT), F = incFallasTodas_(), props = PropertiesService.getScriptProperties(), out = [];
  const cods = F.map(f => limpio_(f.ESTABLECIMIENTO)).concat(E.map(e => limpio_(e.ESTABLECIMIENTO))).filter((c, i, a) => c && a.indexOf(c) === i && incCorreosFalla_(c, '').length);
  cods.forEach(cod => {
    const mias = F.filter(f => limpio_(f.ESTABLECIMIENTO) === cod), abiertas = mias.filter(f => !/^resuel/i.test(f.ESTADO || ''));
    const nuevos = abiertas.filter(f => !incISO_(f.ULTIMO_AVISO)), siguen = abiertas.filter(f => incISO_(f.ULTIMO_AVISO)), resueltos = mias.filter(f => /^resuel/i.test(f.ESTADO || '') && !incISO_(f.CIERRE_AVISADO) && incISO_(f.ULTIMO_AVISO));
    const ult = props.getProperty('INC_RESUMEN_' + cod) || '', pv = incPorVencer_(cod, E), pvYa = JSON.parse(props.getProperty('INC_PV_' + cod) || '[]'), pvNuevos = pv.filter(x => pvYa.indexOf(x.e.ID + '|' + x.txt) < 0);
    const toca = nuevos.length || resueltos.length || pvNuevos.length || (abiertas.length && (!ult || ult <= lim)) || (fuerza === true && (abiertas.length || resueltos.length || pv.length));
    if (!toca) return;
    const para = incCorreosFalla_(cod, (abiertas[0] || resueltos[0] || {}).SITIO); if (!para.length) return;
    const r = incMailResumen_(cod, para, nuevos, siguen, resueltos, E, pv); out.push(cod + ': ' + r);
    if (!/^Enviado/.test(r)) return;
    props.setProperty('INC_RESUMEN_' + cod, hoy); props.setProperty('INC_PV_' + cod, JSON.stringify(pv.map(x => x.e.ID + '|' + x.txt)));
    abiertas.forEach(f => { const o = Object.assign({}, f); delete o.fila; o.ULTIMO_AVISO = hoy; o.AVISOS = (Number(o.AVISOS) || 0) + 1; incEscribir_('FALLAS', INC.H_FAL, f.fila, incFechasFalla_(o)); });
    resueltos.forEach(f => { const o = Object.assign({}, f); delete o.fila; o.CIERRE_AVISADO = hoy; incEscribir_('FALLAS', INC.H_FAL, f.fila, incFechasFalla_(o)); });
  });
  Logger.log(out.length ? out.join('\n') : 'Hoy no tocaba mandar el correo de extintores.');
  return { ok: true, enviados: out };
}
function recordarFallasIncendio() { return resumenFallasIncendio(); }   // nombre anterior del activador
// Marcar resuelto (portal: HyS; aplicación: SOMI, Melani). El cierre va en el próximo correo (sección «Resueltos»).
function incResolverFalla_(x, quien, codPermitido) {
  const f = incFallasAbiertas_().find(z => z.ID === x.ID || z.ID_EXTINTOR === x.ID_EXTINTOR); if (!f) return { ok: false, mensaje: 'Ese extintor no tiene problemas abiertos.' };
  if (codPermitido && limpio_(f.ESTABLECIMIENTO) !== codPermitido) return { ok: false, mensaje: 'Ese extintor no es de este establecimiento.' };
  const o = Object.assign({}, f); delete o.fila;
  Object.assign(o, { ESTADO: 'Resuelta', RESUELTO: incHoy_(), RESUELTO_POR: quien, RESOLUCION: limpio_(x.RESOLUCION) });
  if (!incISO_(f.ULTIMO_AVISO)) o.CIERRE_AVISADO = incHoy_();   // nunca se había avisado: no hace falta avisar el cierre
  o.HISTORIAL = (incTxt_(incHoy_()) + ' · Resuelto por ' + quien + (o.RESOLUCION ? ': ' + o.RESOLUCION : '') + (o.HISTORIAL ? '\n' + o.HISTORIAL : '')).slice(0, 3000);
  incEscribir_('FALLAS', INC.H_FAL, f.fila, incFechasFalla_(o)); CacheService.getScriptCache().remove('inc_tablero');
  return { ok: true, aviso: incISO_(f.ULTIMO_AVISO) ? 'El cierre va en el próximo correo (' + INC.HORA_RESUMEN + ' h).' : '' };
}
// Ejecutar una vez desde el editor: da el permiso de Gmail, crea la hoja FALLAS y el activador diario del correo (6 h). No envía nada.
function prepararAvisosIncendio() {
  incHojaFallas_();
  ScriptApp.getProjectTriggers().filter(t => ['recordarFallasIncendio', 'resumenFallasIncendio'].indexOf(t.getHandlerFunction()) >= 0).forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('resumenFallasIncendio').timeBased().everyDays(1).atHour(INC.HORA_RESUMEN).create();
  const propia = Session.getEffectiveUser().getEmail(), alias = GmailApp.getAliases();
  const ok = INC.REMITENTE.toLowerCase() === String(propia).toLowerCase() || alias.map(a => a.toLowerCase()).indexOf(INC.REMITENTE.toLowerCase()) >= 0;
  const t = 'Listo: hoja FALLAS y correo diario de extintores con problemas (' + INC.HORA_RESUMEN + ' h, todos juntos). ' + (ok ? 'Sale desde ' + INC.REMITENTE + '.' : 'Va a salir desde ' + propia + ' con respuesta a ' + INC.REMITENTE + ' (no está en Gmail › «Enviar correo como»). Habilitadas: ' + (alias.join(', ') || 'ninguna'));
  Logger.log(t); return t;
}

// HyS verifica lo que agregaron o cambiaron desde la aplicación o MIPyV (ids: lista de ID de extintores)
function incVerificar_(ids, quien) {
  const L = incLeer_('EXTINTORES', INC.H_EXT), sh = pInc_().getSheetByName('EXTINTORES'), col = INC.H_EXT.indexOf('VERIFICACION') + 1; let n = 0;
  (ids || []).forEach(id => { const e = L.find(o => o.ID === id); if (e && /^pendiente/i.test(e.VERIFICACION)) { sh.getRange(e.fila, col).setValue('Verificado ' + incTxt_(incHoy_()) + ' · ' + quien); n++; } });
  CacheService.getScriptCache().remove('inc_tablero');
  return { ok: true, verificados: n };
}
// Control mensual de un extintor: 5 verificaciones y 3 fotos obligatorias. Actualiza el último control del extintor.
function incControlGuardar_(x, quien, codPermitido) {
  const L = incLeer_('EXTINTORES', INC.H_EXT), e = L.find(o => o.ID === x.ID_EXTINTOR); if (!e) return { ok: false, mensaje: 'Elegí un extintor de la lista.' };
  if (codPermitido && limpio_(e.ESTABLECIMIENTO) !== codPermitido) return { ok: false, mensaje: 'Ese extintor no es de este establecimiento.' };
  // «Todo OK» (19/10/2026): control rápido de un solo toque, sin fotos. Las 5 verificaciones son «Sí», sin problemas, y se conservan los vencimientos cargados.
  // No se acepta si la carga está vencida: ese caso va por el control completo (vencimiento, problemas y fotos).
  const todoOk = x.todoOk === true || x.todoOk === 'true';
  if (todoOk) { INC.CHEQUEOS.forEach(c => x[c[0]] = 'Sí'); x.PROBLEMAS = []; x.VTO_CARGA = incISO_(e.VTO_CARGA) || ''; x.PRUEBA_HIDRAULICA_VENCE = incISO_(e.PRUEBA_HIDRAULICA_VENCE) || 's/d (revisar)';
    const f0 = incISO_(x.FECHA) || incHoy_(); if (!x.VTO_CARGA || x.VTO_CARGA < f0) return { ok: false, mensaje: 'La carga está vencida o sin fecha: hacé el control completo (con vencimiento, problemas y fotos).' }; }
  const faltan = INC.CHEQUEOS.filter(c => !/^(Sí|No)$/.test(x[c[0]] || '')).map(c => c[1]); if (faltan.length) return { ok: false, mensaje: 'Falta responder: ' + faltan.join(', ') + '.' };
  const sinFoto = todoOk ? [] : INC.FOTOS.filter(f => !(x.fotos && x.fotos[f[0]])).map(f => f[1]); if (sinFoto.length) return { ok: false, mensaje: 'Faltan las fotos: ' + sinFoto.join(', ') + '. Son obligatorias las 3.' };
  const cod = limpio_(e.ESTABLECIMIENTO), fecha = incISO_(x.FECHA) || incHoy_(), sub = ['Controles', fecha.slice(0, 7)], et = e.ID + (e.NRO_EXTINTOR ? ' n.º ' + e.NRO_EXTINTOR : '') + ' · ' + e.SITIO;
  const fotos = {}; if (!todoOk) INC.FOTOS.forEach(f => fotos[f[0]] = incFoto_(cod, x.fotos[f[0]], sub, et + ' · ' + f[1]));   // «Todo OK»: sin fotos, quedan las del último control
  // Vencimientos leídos en el control (pedido de Belén 14/10/2026): carga obligatoria (de la tarjeta), prueba hidráulica si figura
  const vto = /^s\/d/i.test(x.VTO_CARGA || '') ? '' : incISO_(x.VTO_CARGA) || '', ph = /^s\/d/i.test(x.PRUEBA_HIDRAULICA_VENCE || '') ? 's/d (revisar)' : incISO_(x.PRUEBA_HIDRAULICA_VENCE) || '';
  if (!vto && !/^s\/d/i.test(x.VTO_CARGA || '')) return { ok: false, mensaje: 'Falta el vencimiento de la carga (está en la tarjeta del extintor). Si no se lee, marcá «No se lee».' };
  const probs = (Array.isArray(x.PROBLEMAS) ? x.PROBLEMAS : String(x.PROBLEMAS || '').split(' · ')).map(limpio_).filter(p => INC.PROBLEMAS.indexOf(p) >= 0);
  if (vto && vto < fecha && probs.indexOf('Carga vencida') < 0) probs.push('Carga vencida');
  if (!vto && probs.indexOf('Sin tarjeta (marbete) o ilegible') < 0) probs.push('Sin tarjeta (marbete) o ilegible');
  const res = INC.CHEQUEOS.every(c => x[c[0]] === 'Sí') && !probs.length ? 'Conforme' : 'Con observaciones';
  const c = { ID: 'CTL-' + cod + '-' + Utilities.formatDate(new Date(), TZ, 'yyMMddHHmmss') + Math.random().toString(36).slice(2, 4).toUpperCase(), FECHA: incFecha_(fecha), ESTABLECIMIENTO: cod, SITIO: e.SITIO,
    ID_EXTINTOR: e.ID, RESULTADO: res, OBSERVACIONES: limpio_(x.OBSERVACIONES) || (todoOk ? 'Todo OK (control rápido, sin fotos)' : ''), QUIEN: quien, CARGADO: new Date(), ESTADO: 'Vigente', PROBLEMAS: probs.join(' · '),
    VTO_CARGA: vto ? incFecha_(vto) : 's/d (no se lee)', PRUEBA_HIDRAULICA_VENCE: ph && ph !== 's/d (revisar)' ? incFecha_(ph) : ph };
  INC.CHEQUEOS.forEach(k => c[k[0]] = x[k[0]]); Object.assign(c, fotos);
  // Aviso por correo si el extintor quedó con algo que dificulta o impide su uso (por ahora, HMH: SOMI y Mantenimiento)
  const fallas = incFallas_(x, probs, x.ESTADO && INC.ESTADOS.indexOf(x.ESTADO) >= 0 ? x.ESTADO : '');
  if (fallas.length) c.AVISO_CORREO = incRegistrarFalla_(Object.assign({}, e, x.ESTADO ? { ESTADO: x.ESTADO } : {}), fallas, { quien: quien, fecha: fecha, obs: c.OBSERVACIONES, fotos: fotos, id: c.ID });
  incEscribir_('CONTROLES', INC.H_CON, null, c);
  const o = Object.assign({}, e); delete o.fila;
  if (!o.ULTIMO_CONTROL || incISO_(o.ULTIMO_CONTROL) <= fecha) Object.assign(o, { ULTIMO_CONTROL: incFecha_(fecha), RESULTADO_CONTROL: res + (c.OBSERVACIONES ? ': ' + c.OBSERVACIONES : '') }, fotos);
  if (x.ESTADO && INC.ESTADOS.indexOf(x.ESTADO) >= 0) o.ESTADO = x.ESTADO;
  if (vto) o.VTO_CARGA = vto;
  if (ph) o.PRUEBA_HIDRAULICA_VENCE = ph;
  incAnotarCambio_(o, e, quien + ' (control)', '');   // si el control cambió el vencimiento, queda en CAMBIOS
  ['VTO_CARGA', 'PRUEBA_HIDRAULICA_VENCE'].forEach(k => { if (o[k] && /^\d{4}-/.test(o[k])) o[k] = incFecha_(o[k]); });
  o.ACTUALIZADO = new Date(); incEscribir_('EXTINTORES', INC.H_EXT, e.fila, o);
  CacheService.getScriptCache().remove('inc_tablero');
  return { ok: true, id: c.ID, resultado: res, aviso: c.AVISO_CORREO || '' };
}

// ------------------------------------------------------------------ ENTRADA DEL PORTAL (clave de Higiene y Seguridad): acciones «p_inc_…»
function incPortal_(accion, x) {
  if (!PropertiesService.getScriptProperties().getProperty(INC.P_LIBRO)) return { ok: false, instalado: false, mensaje: 'El módulo 10 todavía no está instalado: en el editor de Apps Script, ejecutá una vez construirModuloIncendio() y después importarExtintoresIncendio().' };
  const quien = x.quien || 'Belén Pellegrini (portal)';
  switch (accion) {
    case 'p_inc_tablero': return incTablero_(x.fresco);
    case 'p_inc_detalle': return incDetalle_(x.cod, x.sitio);
    case 'p_inc_ext_guardar': return conLock_(() => incExtGuardar_(x, quien));
    case 'p_inc_control': return conLock_(() => incControlGuardar_(x, quien));
    case 'p_inc_verificar': return conLock_(() => incVerificar_(x.ids, quien));
    case 'p_inc_resolver': return conLock_(() => incResolverFalla_(x, quien));
    case 'p_inc_resumen': return conLock_(() => resumenFallasIncendio(true));   // botón «Mandar el correo ahora»
  }
  const r = typeof incSrvPortal_ === 'function' ? incSrvPortal_(accion, x, quien) : null; if (r) return r;
  return { ok: false, error: 'Acción desconocida.' };
}

// ------------------------------------------------------------------ «MI ESTABLECIMIENTO» (DNI y clave personal, módulo «Incendio» en ACCESOS): acciones «i_…»
// Desde Código.gs › doPost, después de validar acceso y módulo: ver los extintores del establecimiento, cargar el control mensual
// y agregar un extintor que no está en la lista (con todos sus datos y las 3 fotos).
function incRed_(d, acc) {
  if (!PropertiesService.getScriptProperties().getProperty(INC.P_LIBRO)) return { ok: false, mensaje: 'El módulo de incendio todavía no está habilitado.' };
  const x = d.datos || {}, cod = limpio_(d.est);
  // Empresas de servicio (SOMI, MAREM): cada registro lleva quién lo hizo (DNI cruzado con la base de personal) · IncendioServicios.gs
  if (acc && acc.servicio && /^i_(control|ext_alta|ext_editar|resolver|recorrida|novedad|nov_resolver)$/.test(d.accion)) {
    const idn = incSrvIdentidad_(x.identidad, acc, cod); if (!idn.ok) return idn; x.quien = idn.quien;
  }
  const quien = x.quien || 'Mi establecimiento';
  switch (d.accion) {
    case 'i_datos': { const r = incDetalle_(cod); r.controles = r.controles.slice(0, 40); r.puedeResolver = incSrvPuedeResolver_(acc); return r; }
    case 'i_control': return conLock_(() => incControlGuardar_(x, quien, cod));
    case 'i_resolver': if (!incSrvPuedeResolver_(acc)) return { ok: false, mensaje: 'Marcar como resuelto lo hacen SOMI, Melani o Higiene y Seguridad.' };
      return conLock_(() => incResolverFalla_(x, quien, cod));
    case 'i_ext_editar': return conLock_(() => incExtGuardar_(Object.assign({}, x, { ESTABLECIMIENTO: cod }), quien, cod));
    case 'i_ext_alta': return conLock_(() => incExtGuardar_(Object.assign({}, x, { ID: '', ESTABLECIMIENTO: cod }), quien, cod));
  }
  const r = typeof incSrvRed_ === 'function' ? incSrvRed_(d, acc, cod, x, quien) : null; if (r) return r;
  return { ok: false, error: 'Acción desconocida.' };
}
