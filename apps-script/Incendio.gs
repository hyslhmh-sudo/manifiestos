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
 * Fotos: MÓDULO 10 › Establecimientos › establecimiento › Controles › año-mes.
 * Avisos: carga vencida o que vence en 30 días; prueba hidráulica vencida; sin control en los últimos 3 meses (el control es mensual,
 * pero la alarma recién aparece a los 3 meses, pedido de Belén 14/10/2026).
 * Carga inicial: importarExtintoresIncendio() lee la planilla «Inventario de Extintores» de Belén (INC.FUENTE) y no pisa lo ya cargado.
 * Normativa: Ley 19.587; Dto. 351/79, cap. 18 (protección contra incendios) y Anexo VII; Res. SRT 463/09 (RGRL). No envía correos.
 * Instalación: ejecutar una vez construirModuloIncendio() (la primera vez también importa la planilla; importarExtintoresIncendio() se puede volver a ejecutar sin duplicar).
 */
const INC = {
  SIS: '16AIJZcmxG9EBM3-D-J4vRtvruHK9DVrA',   // SISTEMA HyS
  CARPETA: 'MÓDULO 10 · PROTECCIÓN CONTRA INCENDIOS',
  P_LIBRO: 'INC_ID', P_CARPETA: 'INC_CARPETA',
  FUENTE: '1AD5M0mA3JrugyLwBkJj52127BGhKBDcIcO3NTK5EAaU',   // «Inventario de Extintores» (Belén, carga inicial)
  H_SIT: ['ESTABLECIMIENTO', 'SITIO', 'TIPO_SITIO', 'RESPONSABLES_CONTROL', 'ACTIVO', 'OBSERVACIONES', 'ACTUALIZADO'],
  H_EXT: ['ID', 'ESTABLECIMIENTO', 'SITIO', 'NRO_EXTINTOR', 'NRO_CHAPA', 'PLANTA', 'SECTOR', 'UBICACION', 'TIPO', 'AGENTE', 'CAPACIDAD_KG', 'NRO_INVENTARIO',
    'VTO_CARGA', 'PRUEBA_HIDRAULICA_VENCE', 'ESTADO', 'ULTIMO_CONTROL', 'RESULTADO_CONTROL', 'FOTO_PANORAMICA', 'FOTO_MARBETE', 'FOTO_INVENTARIO', 'OBSERVACIONES', 'ACTUALIZADO'],
  H_CON: ['ID', 'FECHA', 'ESTABLECIMIENTO', 'SITIO', 'ID_EXTINTOR', 'EN_LUGAR', 'ACCESO_LIBRE', 'MANOMETRO', 'PRECINTO', 'SENALIZACION', 'RESULTADO',
    'FOTO_PANORAMICA', 'FOTO_MARBETE', 'FOTO_INVENTARIO', 'OBSERVACIONES', 'QUIEN', 'CARGADO', 'ESTADO'],
  CHEQUEOS: [['EN_LUGAR', 'En su lugar y a la vista'], ['ACCESO_LIBRE', 'Acceso libre (sin obstáculos)'], ['MANOMETRO', 'Manómetro en verde (o peso correcto si es CO2)'],
    ['PRECINTO', 'Precinto y seguro colocados'], ['SENALIZACION', 'Señalización completa']],
  FOTOS: [['FOTO_PANORAMICA', 'Panorámica', 'El extintor y su entorno: que se vea dónde está, la señal y el acceso.'],
    ['FOTO_MARBETE', 'Marbete', 'La tarjeta del extintor con la fecha de carga, legible.'],
    ['FOTO_INVENTARIO', 'N.º de inventario', 'La chapa o etiqueta con el número de inventario, legible.']],
  TIPOS: ['ABC', 'BC', 'K', 'D', 'Otro'],
  AGENTES: ['PQS', 'CO2', 'HCFC 123', 'HCFC-236fa', 'Agua', 'AFFF (espuma)', 'Acetato de potasio', 's/d'],
  ESTADOS: ['Operativo', 'Sobrecarga', 'Recargar', 'Fuera de servicio', 'Baja', 's/d (revisar)'],
  PLANTAS: ['Baja', 'Alta', 'Terraza', 'Subsuelo', 'Única', 'Vehículo'],
  MESES_ALARMA: 3, DIAS_POR_VENCER: 30, INICIO: '2026-10-14',   // los extintores nunca controlados avisan recién a los 3 meses de empezar el módulo
  RESP_TRELEW: 'Belén Pellegrini · Melani · Javier Tramaleo',
  RESP_HMH: 'Belén Pellegrini · Melani · SOMI · MAREM'
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
function incFoto_(cod, a, sub, etiqueta) {
  const m = /^data:(image\/[\w.+-]+);base64,(.+)$/.exec(String((a && (a.base64 || a.dataUrl)) || a || '')); if (!m) return '';
  const nombre = (etiqueta + ' - ' + Utilities.formatDate(new Date(), TZ, 'yyyyMMdd-HHmmss')).replace(/[^\w\-.áéíóúñÁÉÍÓÚÑ ,·]/g, '_') + (/png/.test(m[1]) ? '.png' : '.jpg');
  return incCarpetaEst_(cod, sub).createFile(Utilities.newBlob(Utilities.base64Decode(m[2]), m[1], nombre)).getUrl();
}
const incHoy_ = () => Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd');
function incSumarDias_(f, d) { const x = new Date(f + 'T12:00:00'); x.setDate(x.getDate() + d); return Utilities.formatDate(x, TZ, 'yyyy-MM-dd'); }
function incSumarMeses_(f, m) { const x = new Date(f + 'T12:00:00'); x.setMonth(x.getMonth() + m); return Utilities.formatDate(x, TZ, 'yyyy-MM-dd'); }

// Estado de un extintor: carga (vencida · porvencer · aldia · sd), prueba hidráulica (vencida · aldia · sd) y control (sin · atrasado · aldia)
function incEstadoExt_(e, hoy) {
  const vto = incISO_(e.VTO_CARGA), ph = incISO_(e.PRUEBA_HIDRAULICA_VENCE), uc = incISO_(e.ULTIMO_CONTROL);
  const carga = !vto ? 'sd' : vto < hoy ? 'vencida' : vto <= incSumarDias_(hoy, INC.DIAS_POR_VENCER) ? 'porvencer' : 'aldia';
  const prueba = !ph ? 'sd' : ph < hoy ? 'vencida' : 'aldia';
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
  const v = l.filter(e => !/baja/i.test(e.ESTADO)).map(e => incEstadoExt_(e, hoy)), c = k => v.filter(x => x[k[0]] === k[1]).length;
  return { total: v.length, cargaVencida: c(['carga', 'vencida']), porVencer: c(['carga', 'porvencer']), cargaSd: c(['carga', 'sd']), pruebaVencida: c(['prueba', 'vencida']), pruebaSd: c(['prueba', 'sd']),
    sinControl: c(['control', 'sin']), controlAtrasado: c(['control', 'atrasado']), controlAlDia: c(['control', 'aldia']), conObs: v.filter(x => x.conObs).length };
}
function incTablero_(fresco) {
  const ca = CacheService.getScriptCache(); if (!fresco) { const k = ca.get('inc_tablero'); if (k) return JSON.parse(k); }
  const D = incDatos_(), hoy = incHoy_(), nom = {}; pEstablecimientos_().filas.forEach(f => nom[limpio_(f.v[0])] = limpio_(f.v[1]));
  const lugares = D.sit.map(s => { const l = D.ext.filter(e => e.ESTABLECIMIENTO === s.ESTABLECIMIENTO && sinTildes_(e.SITIO) === sinTildes_(s.SITIO));
    const uc = l.map(e => incISO_(e.ULTIMO_CONTROL)).filter(Boolean).sort().pop() || '';
    return { cod: s.ESTABLECIMIENTO, nombreEst: nom[s.ESTABLECIMIENTO] || s.ESTABLECIMIENTO, sitio: s.SITIO, tipo: s.TIPO_SITIO, responsables: s.RESPONSABLES_CONTROL, obs: s.OBSERVACIONES, ultimoControl: uc, r: incResumen_(l, hoy) }; });
  // Avisos para el tablero de inicio: por lugar (carga vencida, prueba vencida, 3 meses sin control)
  const avisos = [];
  lugares.forEach(L => { const r = L.r; if (!r.total) return;
    if (r.cargaVencida) avisos.push({ nivel: 'er', cod: L.cod, sitio: L.sitio, texto: r.cargaVencida + (r.cargaVencida > 1 ? ' extintores con la carga vencida' : ' extintor con la carga vencida') });
    if (r.pruebaVencida) avisos.push({ nivel: 'er', cod: L.cod, sitio: L.sitio, texto: r.pruebaVencida + ' con la prueba hidráulica vencida' });
    const sinC = r.controlAtrasado + (hoy >= incSumarMeses_(INC.INICIO, INC.MESES_ALARMA) ? r.sinControl : 0); if (sinC && (!L.ultimoControl || L.ultimoControl < incSumarMeses_(hoy, -INC.MESES_ALARMA))) avisos.push({ nivel: 'wa', cod: L.cod, sitio: L.sitio, texto: 'Más de 3 meses sin control de extintores' + (L.ultimoControl ? ' (último: ' + L.ultimoControl + ')' : ' (nunca controlado)') });
    if (r.porVencer) avisos.push({ nivel: 'av', cod: L.cod, sitio: L.sitio, texto: r.porVencer + ' con la carga por vencer (30 días)' }); });
  const out = { ok: true, hoy: hoy, lugares: lugares, avisos: avisos, totales: incResumen_(D.ext, hoy), libro: pInc_().getUrl(),
    carpeta: DriveApp.getFolderById(PropertiesService.getScriptProperties().getProperty(INC.P_CARPETA)).getUrl() };
  try { ca.put('inc_tablero', JSON.stringify(out), 600); } catch (e) {}
  return out;
}
// Inventario de un establecimiento (o de un lugar), con el estado de cada extintor y sus últimos controles
function incDetalle_(cod, sitio) {
  cod = limpio_(cod); const D = incDatos_(), hoy = incHoy_();
  const ext = D.ext.filter(e => e.ESTABLECIMIENTO === cod && (!sitio || sinTildes_(e.SITIO) === sinTildes_(sitio))).map(e => Object.assign(e, { est: incEstadoExt_(e, hoy) }));
  const ids = {}; ext.forEach(e => ids[e.ID] = true);
  const con = incLeer_('CONTROLES', INC.H_CON).filter(c => ids[c.ID_EXTINTOR] && c.ESTADO !== 'Anulado').slice(-300).reverse();
  return { ok: true, cod: cod, hoy: hoy, sitios: D.sit.filter(s => s.ESTABLECIMIENTO === cod), extintores: ext, controles: con,
    listas: { tipos: INC.TIPOS, agentes: INC.AGENTES, estados: INC.ESTADOS, plantas: INC.PLANTAS, chequeos: INC.CHEQUEOS, fotos: INC.FOTOS } };
}
// Alta o corrección de un extintor (solo HyS desde el portal)
function incExtGuardar_(x, quien) {
  const cod = limpio_(x.ESTABLECIMIENTO), sitio = limpio_(x.SITIO); if (!cod || !sitio) return { ok: false, mensaje: 'Faltan el establecimiento y el lugar.' };
  const L = incLeer_('EXTINTORES', INC.H_EXT); let e = x.ID ? L.find(o => o.ID === x.ID) : null;
  if (x.ID && !e) return { ok: false, mensaje: 'No encontré ese extintor.' };
  const o = e ? Object.assign({}, e) : { ID: 'EXT-' + cod + '-' + ('00' + (L.filter(z => limpio_(z.ESTABLECIMIENTO) === cod).reduce((m, z) => Math.max(m, Number(String(z.ID).split('-').pop()) || 0), 0) + 1)).slice(-3) };
  ['ESTABLECIMIENTO', 'SITIO', 'NRO_EXTINTOR', 'NRO_CHAPA', 'PLANTA', 'SECTOR', 'UBICACION', 'TIPO', 'AGENTE', 'CAPACIDAD_KG', 'NRO_INVENTARIO', 'ESTADO', 'OBSERVACIONES'].forEach(k => { if (k in x) o[k] = x[k]; });
  ['VTO_CARGA', 'PRUEBA_HIDRAULICA_VENCE'].forEach(k => { if (k in x) o[k] = /^s\/d/i.test(x[k]) ? x[k] : incFecha_(x[k]); });
  ['VTO_CARGA', 'PRUEBA_HIDRAULICA_VENCE', 'ULTIMO_CONTROL'].forEach(k => { if (o[k] && !(o[k] instanceof Date) && /^\d{4}-/.test(o[k])) o[k] = incFecha_(o[k]); });
  o.ACTUALIZADO = new Date(); delete o.fila;
  incEscribir_('EXTINTORES', INC.H_EXT, e ? e.fila : null, o);
  CacheService.getScriptCache().remove('inc_tablero');
  return { ok: true, id: o.ID };
}
// Control mensual de un extintor: 5 verificaciones y 3 fotos obligatorias. Actualiza el último control del extintor.
function incControlGuardar_(x, quien, codPermitido) {
  const L = incLeer_('EXTINTORES', INC.H_EXT), e = L.find(o => o.ID === x.ID_EXTINTOR); if (!e) return { ok: false, mensaje: 'Elegí un extintor de la lista.' };
  if (codPermitido && limpio_(e.ESTABLECIMIENTO) !== codPermitido) return { ok: false, mensaje: 'Ese extintor no es de este establecimiento.' };
  const faltan = INC.CHEQUEOS.filter(c => !/^(Sí|No)$/.test(x[c[0]] || '')).map(c => c[1]); if (faltan.length) return { ok: false, mensaje: 'Falta responder: ' + faltan.join(', ') + '.' };
  const sinFoto = INC.FOTOS.filter(f => !(x.fotos && x.fotos[f[0]])).map(f => f[1]); if (sinFoto.length) return { ok: false, mensaje: 'Faltan las fotos: ' + sinFoto.join(', ') + '. Son obligatorias las 3.' };
  const cod = limpio_(e.ESTABLECIMIENTO), fecha = incISO_(x.FECHA) || incHoy_(), sub = ['Controles', fecha.slice(0, 7)], et = e.ID + (e.NRO_EXTINTOR ? ' n.º ' + e.NRO_EXTINTOR : '') + ' · ' + e.SITIO;
  const fotos = {}; INC.FOTOS.forEach(f => fotos[f[0]] = incFoto_(cod, x.fotos[f[0]], sub, et + ' · ' + f[1]));
  const res = INC.CHEQUEOS.every(c => x[c[0]] === 'Sí') ? 'Conforme' : 'Con observaciones';
  const c = { ID: 'CTL-' + cod + '-' + Utilities.formatDate(new Date(), TZ, 'yyMMddHHmmss') + Math.random().toString(36).slice(2, 4).toUpperCase(), FECHA: incFecha_(fecha), ESTABLECIMIENTO: cod, SITIO: e.SITIO,
    ID_EXTINTOR: e.ID, RESULTADO: res, OBSERVACIONES: limpio_(x.OBSERVACIONES), QUIEN: quien, CARGADO: new Date(), ESTADO: 'Vigente' };
  INC.CHEQUEOS.forEach(k => c[k[0]] = x[k[0]]); Object.assign(c, fotos);
  incEscribir_('CONTROLES', INC.H_CON, null, c);
  const o = Object.assign({}, e); delete o.fila;
  if (!o.ULTIMO_CONTROL || incISO_(o.ULTIMO_CONTROL) <= fecha) Object.assign(o, { ULTIMO_CONTROL: incFecha_(fecha), RESULTADO_CONTROL: res + (c.OBSERVACIONES ? ': ' + c.OBSERVACIONES : '') }, fotos);
  if (x.ESTADO && INC.ESTADOS.indexOf(x.ESTADO) >= 0) o.ESTADO = x.ESTADO;
  if (x.VTO_CARGA) o.VTO_CARGA = incFecha_(x.VTO_CARGA);
  ['VTO_CARGA', 'PRUEBA_HIDRAULICA_VENCE'].forEach(k => { if (o[k] && /^\d{4}-/.test(o[k])) o[k] = incFecha_(o[k]); });
  o.ACTUALIZADO = new Date(); incEscribir_('EXTINTORES', INC.H_EXT, e.fila, o);
  CacheService.getScriptCache().remove('inc_tablero');
  return { ok: true, id: c.ID, resultado: res };
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
  }
  return { ok: false, error: 'Acción desconocida.' };
}

// ------------------------------------------------------------------ «MI ESTABLECIMIENTO» (DNI y clave personal, módulo «Incendio» en ACCESOS): acciones «i_…»
// Desde Código.gs › doPost, después de validar acceso y módulo: ver los extintores del establecimiento y cargar el control mensual.
function incRed_(d) {
  if (!PropertiesService.getScriptProperties().getProperty(INC.P_LIBRO)) return { ok: false, mensaje: 'El módulo de incendio todavía no está habilitado.' };
  const x = d.datos || {}, cod = limpio_(d.est), quien = x.quien || 'Mi establecimiento';
  switch (d.accion) {
    case 'i_datos': { const r = incDetalle_(cod); r.controles = r.controles.slice(0, 40); return r; }
    case 'i_control': return conLock_(() => incControlGuardar_(x, quien, cod));
  }
  return { ok: false, error: 'Acción desconocida.' };
}
