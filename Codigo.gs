/**
 * SISTEMA DE MANIFIESTOS · RESIDUOS PELIGROSOS
 * Servicio de Higiene y Seguridad Laboral · HZT / HMH
 *
 * Recibe las cargas de la aplicación (manifiestos y certificados) y las escribe
 * en el libro del establecimiento y en el libro general. Guarda las fotos en la
 * carpeta del establecimiento.
 *
 * Dónde está: Libro general › Extensiones › Apps Script.
 * Claves: planilla «CLAVES DE ESTABLECIMIENTOS (solo Belén)».
 */

// ------------------------------------------------------------------ CONFIGURACIÓN
const CFG = {
  GENERAL: '1ydG2somMrg5T2iv8G6DVH9HJawl32VVeMJz_eURrQJ4',
  CLAVES: '10XGA0pgXzCrqTcRRvXYUS_UeKVjs1LY8Tj0JTwcnnvM',
  EST: {
    HZT:  { nombre: 'Hospital Zonal Trelew «Dr. Adolfo Margara»', libro: '1I0wzDhqYsRQIs6f0qM3GghMWShnGIVFsiRQ_L8qGHks', carpeta: '1_m_pqj5cB1-xUN3Zp7ybTPjBc50QYNfB', area: 'Área Programática Trelew' },
    HMH:  { nombre: 'Hospital María Humphreys',                     libro: '17bbgCmj7blDOKfD-eGmAiFnIYYphbF_U7BDNyuUV6sY', carpeta: '1-bduPUeVClz3c033wOqSBrmm6LF9vBeH', area: 'Área Programática Trelew' },
    HSST: { nombre: 'Hospital Subzonal Santa Teresita (Rawson)',    libro: '1YoHJdym2pYl55FvZib69fRxsdaMKYhCnA-xkjiY0-v0', carpeta: '1BQRuiPTcRiQVRMoihpOARf2XnQElZeBP', area: 'Área Programática Trelew' },
  },
  EMPRESAS: ['Impeesa'],
  CORRIENTES: [{ c: 'Y1', n: 'Y1 · Biopatogénicos (bolsa roja)' }, { c: 'Y3', n: 'Y3 · Medicamentos y productos farmacéuticos' }],
};
const TZ = 'America/Argentina/Buenos_Aires';
const FOTO_OBLIGATORIA_DESDE = '2027-01-01';   // antes de esta fecha la foto es opcional (puede estar en un lote escaneado)

// ------------------------------------------------------------------ CLAVES
// Las claves están en la planilla «CLAVES DE ESTABLECIMIENTOS (solo Belén)», carpeta 03 SISTEMA.
// Columna B: código del establecimiento · Columna C: clave · Columna E: estado.
// Para cambiar una clave, se cambia en la planilla (el sistema la toma en 5 minutos como máximo).
function claveOk_(est, clave) {
  const cache = CacheService.getScriptCache();
  let mapa = cache.get('claves');
  if (!mapa) {
    const v = SpreadsheetApp.openById(CFG.CLAVES).getSheets()[0].getDataRange().getValues().slice(1);
    const m = {}; v.forEach(r => { if (r[1] && r[2]) m[String(r[1]).trim()] = String(r[2]).trim(); });
    mapa = JSON.stringify(m); cache.put('claves', mapa, 300);
  }
  const k = JSON.parse(mapa)[est];
  return !!k && String(clave || '').trim().toLowerCase() === k.toLowerCase();   // no distingue mayúsculas
}

// ------------------------------------------------------------------ ENTRADA
function doGet(e) {
  const accion = (e && e.parameter && e.parameter.accion) || 'estado';
  if (accion === 'lista') return json_({ ok: true, lista: Object.keys(CFG.EST).map(k => ({ id: k, nombre: CFG.EST[k].nombre })) });
  return json_({ ok: true, servicio: 'Manifiestos · residuos peligrosos', hora: new Date().toISOString() });
}
function doPost(e) {
  let d;
  try { d = JSON.parse(e.postData.contents); } catch (err) { return json_({ ok: false, error: 'Pedido mal formado.' }); }
  if (!CFG.EST[d.est]) return json_({ ok: false, error: 'Establecimiento desconocido.' });
  if (!claveOk_(d.est, d.clave)) return json_({ ok: false, error: 'clave', mensaje: 'La clave no es correcta.' });
  try {
    if (d.accion === 'config') return json_(config_(d.est));
    if (d.accion === 'manifiesto') return json_(conLock_(() => guardarManifiesto_(d.est, d.datos)));
    if (d.accion === 'certificado') return json_(conLock_(() => guardarCertificado_(d.est, d.datos)));
    if (d.accion === 'lote') return json_(conLock_(() => guardarLote_(d.est, d.datos)));
    return json_({ ok: false, error: 'Acción desconocida.' });
  } catch (err) {
    registrarError_(d, err);
    return json_({ ok: false, error: 'interno', mensaje: 'No se pudo guardar. Se va a reintentar.' });
  }
}
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function conLock_(fn) { const l = LockService.getScriptLock(); l.waitLock(30000); try { return fn(); } finally { l.releaseLock(); } }

// ------------------------------------------------------------------ CONFIGURACIÓN PARA LA APLICACIÓN
function config_(est) {
  const E = CFG.EST[est], ss = SpreadsheetApp.openById(E.libro);
  // Sitios
  const sh = ss.getSheetByName('SITIOS'), n = Math.max(0, sh.getLastRow() - 5);
  const sitios = n ? sh.getRange(6, 1, n, 3).getValues().filter(r => r[0]).map(r => ({ sitio: r[0], oficial: r[1], sisa: String(r[2]) })) : [];
  // Referente (hoja DATOS)
  const dv = ss.getSheetByName('DATOS').getRange('A1:B40').getValues();
  const dato = lab => { const r = dv.find(x => String(x[0]).indexOf(lab) === 0); return r && r[1] !== 's/d' ? String(r[1]) : ''; };
  // Últimas cargas y avance por mes
  const man = leerManifiestos_(ss), cert = leerCertificados_(ss);
  const avance = {};   // 'aaaa-mm' -> {retiros, cert}
  man.forEach(m => { if (m.corriente !== 'Y1') return; const k = m.fecha.slice(0, 7); (avance[k] = avance[k] || { retiros: 0, cert: 0 }).retiros++; });
  cert.forEach(c => { const k = c.mes; (avance[k] = avance[k] || { retiros: 0, cert: 0 }).cert++; });
  const ultimas = agruparManifiestos_(man.slice(-400)).slice(-60);
  return { ok: true, est: est, nombre: E.nombre, sitios: sitios, empresas: CFG.EMPRESAS, corrientes: CFG.CORRIENTES,
    referente: { nombre: dato('Referente de residuos'), mail: dato('Correo de la referente') },
    ultimas: ultimas, certificados: cert.slice(-24), avance: avance, lotes: leerLotes_(ss), fotoObligatoriaDesde: FOTO_OBLIGATORIA_DESDE, actualizado: new Date().toISOString() };
}
function leerManifiestos_(ss) {
  const sh = ss.getSheetByName('MANIFIESTOS'), n = sh.getLastRow() - 5;
  if (n < 1) return [];
  return sh.getRange(6, 1, n, 13).getValues().filter(r => r[2]).map(r => ({
    sitio: r[1], fecha: Utilities.formatDate(new Date(r[2]), TZ, 'yyyy-MM-dd'), nro: String(r[5]), corriente: r[6],
    cant: r[7], tam: r[8], vol: r[9], uni: r[10] || 'dm³', origen: r[11], obs: r[12] }));
}
function agruparManifiestos_(man) {
  const g = {}, orden = [];
  man.forEach(m => { const k = m.sitio + '|' + m.nro + '|' + m.fecha; if (!g[k]) { g[k] = { sitio: m.sitio, nro: m.nro, fecha: m.fecha, origen: m.origen, res: [] }; orden.push(k); } g[k].res.push({ corriente: m.corriente, cant: m.cant, tam: m.tam, vol: m.vol, uni: m.uni }); });
  return orden.map(k => g[k]);
}
function leerCertificados_(ss) {
  const sh = ss.getSheetByName('CERTIFICADOS'), n = sh.getLastRow() - 5;
  if (n < 1) return [];
  return sh.getRange(6, 1, n, 8).getValues().filter(r => r[3]).map(r => ({ empresa: r[0], mes: r[1] + '-' + String(r[2]).padStart(2, '0'), ncert: String(r[3]),
    ftrat: r[4] ? Utilities.formatDate(new Date(r[4]), TZ, 'yyyy-MM-dd') : '', origen: r[6] }));
}

// ------------------------------------------------------------------ MANIFIESTO
function guardarManifiesto_(est, m) {
  const E = CFG.EST[est], ss = SpreadsheetApp.openById(E.libro), sh = ss.getSheetByName('MANIFIESTOS');
  if (!m || !m.nro || !m.fecha || !m.res || !m.res.length) return { ok: false, error: 'datos', mensaje: 'Faltan datos del manifiesto.' };
  if (!m.foto && m.fecha >= FOTO_OBLIGATORIA_DESDE) return { ok: false, error: 'datos', mensaje: 'Desde 2027 la foto o el escaneo del manifiesto es obligatorio.' };
  // Ya recibido (reintento desde el teléfono): responder OK sin duplicar
  if (m.idLocal && sh.createTextFinder('app:' + m.idLocal).findNext()) return { ok: true, repetido: true };
  // Mismo número, mismo sitio y misma corriente ya cargado
  const prev = leerManifiestos_(ss).filter(x => x.nro === String(m.nro).trim() && x.sitio === m.sitio);
  const rep = m.res.filter(r => prev.some(x => x.corriente === r.corriente));
  if (rep.length) return { ok: false, error: 'duplicado', mensaje: 'El manifiesto ' + m.nro + ' (' + rep.map(r => r.corriente).join(', ') + ') ya estaba cargado en ' + m.sitio + '.' };

  const f = m.fecha.split('-').map(Number), fecha = new Date(f[0], f[1] - 1, f[2]);
  // Nombre de la foto: fecha (dd.mm.aaaa) - número de manifiesto con 12 dígitos. Ej.: 23.01.2026 - 000023568974
  const foto = m.foto ? guardarFoto_(E.carpeta, 'Fotos manifiestos', String(f[0]), fechaPunto_(m.fecha) + ' - ' + nro12_(m.nro), m.foto) : '';
  const esc = foto ? '' : escaneoDe_(E.carpeta, m.nro);
  const obs = [
    'Cargó: ' + (m.persona && m.persona.nombre || 's/d') + (m.persona && m.persona.funcion ? ' (' + m.persona.funcion + ')' : ''),
    'Firmó transportista: ' + (m.firma || 's/d'), 'Original en el establecimiento: ' + (m.original || 's/d'),
    foto ? 'Foto: ' + foto : esc ? 'Escaneo: ' + esc : m.lote ? 'En lote escaneado: ' + m.lote : 'Sin foto', m.obs ? 'Obs.: ' + m.obs : '', 'app:' + (m.idLocal || Utilities.getUuid())
  ].filter(Boolean).join(' · ');

  // Libro del establecimiento: A est, B sitio, C fecha, D año, E mes, F nro, G corriente, H recipientes, I tamaño, J cantidad, K unidad, L origen, M obs
  const filasE = m.res.map(r => [E.nombre, m.sitio, fecha, '', '', String(m.nro).trim(), r.corriente, num_(r.cant), num_(r.tam), num_(r.vol), r.uni || 'dm³', 'App', obs]);
  agregar_(sh, filasE, [4, 5], ['=YEAR(R[0]C[-1])', '=MONTH(R[0]C[-2])']);
  // Libro general: A est, B sitio, C área, D fecha, E año, F mes, G nro, H corriente, I recipientes, J cantidad, K unidad, L origen, M tamaño, N obs
  const shG = SpreadsheetApp.openById(CFG.GENERAL).getSheetByName('MANIFIESTOS');
  const filasG = m.res.map(r => [E.nombre, m.sitio, E.area, fecha, '', '', String(m.nro).trim(), r.corriente, num_(r.cant), num_(r.vol), r.uni || 'dm³', 'App', num_(r.tam), obs]);
  agregar_(shG, filasG, [5, 6], ['=YEAR(R[0]C[-1])', '=MONTH(R[0]C[-2])']);
  return { ok: true };
}

// ------------------------------------------------------------------ CERTIFICADO
function guardarCertificado_(est, c) {
  const E = CFG.EST[est], ss = SpreadsheetApp.openById(E.libro), sh = ss.getSheetByName('CERTIFICADOS');
  if (!c || !c.ncert || !c.mes) return { ok: false, error: 'datos', mensaje: 'Faltan datos del certificado.' };
  if (c.idLocal && sh.createTextFinder('app:' + c.idLocal).findNext()) return { ok: true, repetido: true };
  if (leerCertificados_(ss).some(x => x.ncert === String(c.ncert).trim())) return { ok: false, error: 'duplicado', mensaje: 'El certificado ' + c.ncert + ' ya estaba cargado.' };
  const [y, mm] = c.mes.split('-').map(Number);
  const ft = c.ftrat ? c.ftrat.split('-').map(Number) : null, ftrat = ft ? new Date(ft[0], ft[1] - 1, ft[2]) : '';
  // Nombre de la foto: fecha de tratamiento (dd.mm.aaaa) - número de certificado
  const foto = c.foto ? guardarFoto_(E.carpeta, 'Fotos certificados', String(y), (c.ftrat ? fechaPunto_(c.ftrat) : c.mes) + ' - ' + String(c.ncert).trim(), c.foto) : '';
  const ref = (foto || 'Sin foto') + ' · app:' + (c.idLocal || Utilities.getUuid());
  // Establecimiento: A empresa, B año, C mes, D nro, E fecha trat., F retiros del mes, G origen, H foto
  agregar_(sh, [[c.empresa || 's/d', y, mm, String(c.ncert).trim(), ftrat, '', 'App', ref]], [6],
    ['=COUNTIFS(MANIFIESTOS!C[-2],R[0]C[-4],MANIFIESTOS!C[-1],R[0]C[-3],MANIFIESTOS!C[1],"Y1")']);
  // General: A est, B empresa, C año, D mes, E nro, F fecha trat., G origen, H foto
  agregar_(SpreadsheetApp.openById(CFG.GENERAL).getSheetByName('CERTIFICADOS'), [[E.nombre, c.empresa || 's/d', y, mm, String(c.ncert).trim(), ftrat, 'App', ref]], [], []);
  return { ok: true };
}

// ------------------------------------------------------------------ LOTES DE ESCANEADOS
// El establecimiento envía una carpeta comprimida (.zip) o PDFs con manifiestos/certificados ya escaneados,
// indicando el período. Se guarda en: carpeta del establecimiento › Escaneados › «aaaa-mm a aaaa-mm».
function guardarLote_(est, d) {
  const E = CFG.EST[est];
  if (!d || !d.archivo || !d.desde || !d.hasta) return { ok: false, error: 'datos', mensaje: 'Faltan datos del envío.' };
  const ss = SpreadsheetApp.openById(E.libro), sh = hojaLotes_(ss);
  if (d.idLocal && sh.createTextFinder('app:' + d.idLocal).findNext()) return { ok: true, repetido: true };
  const m = /^data:([\w.+-]+\/[\w.+-]+)?;base64,(.+)$/.exec(d.archivo); if (!m) return { ok: false, error: 'datos', mensaje: 'El archivo no se pudo leer.' };
  const periodo = d.desde + ' a ' + d.hasta;
  const dest = carpeta_(carpeta_(carpeta_(DriveApp.getFolderById(E.carpeta), 'Escaneados'), d.tipo === 'certificados' ? 'Certificados' : 'Manifiestos'), periodo);
  const blob = Utilities.newBlob(Utilities.base64Decode(m[2]), m[1] || 'application/octet-stream', d.nombre || 'envio');
  let cant = 1, enlazados = 0;
  if (/\.zip$/i.test(d.nombre || '') || /zip/.test(m[1] || '')) {
    const sub = dest.createFolder((d.nombre || 'envio').replace(/\.zip$/i, '') + ' · ' + Utilities.formatDate(new Date(), TZ, 'dd.MM.yyyy HH.mm'));
    const archivos = Utilities.unzip(blob.setContentType('application/zip')).filter(b => b.getName() && !/\/$/.test(b.getName()) && !/^__MACOSX/.test(b.getName()));
    archivos.forEach(b => { b.setName(b.getName().split('/').pop()); sub.createFile(b); });
    cant = archivos.length;
    if (d.tipo !== 'certificados') enlazados = enlazarEscaneos_(ss, archivos.map(b => b.getName()), sub, d.desde, d.hasta);
  } else {
    const f = dest.createFile(blob);
    if (d.tipo !== 'certificados') enlazados = enlazarEscaneos_(ss, [f.getName()], dest, d.desde, d.hasta);
  }
  const fila = [new Date(), d.tipo || 'manifiestos', d.desde, d.hasta, d.parte || '', cant, enlazados, d.persona && d.persona.nombre || 's/d', d.nota || '', dest.getUrl(), 'app:' + (d.idLocal || Utilities.getUuid())];
  sh.appendRow(fila);
  const g = SpreadsheetApp.openById(CFG.GENERAL);
  hojaLotes_(g, true).appendRow([E.nombre].concat(fila));
  alerta_(g, 'Escaneados recibidos', E.nombre, '—', (d.tipo || 'manifiestos') + ' · ' + periodo + ' · ' + cant + ' archivo(s)' + (enlazados ? ' · ' + enlazados + ' enlazado(s) a su manifiesto' : '') + (d.parte ? ' · ' + d.parte : ''));
  return { ok: true, archivos: cant, enlazados: enlazados };
}
function hojaLotes_(ss, general) {
  let sh = ss.getSheetByName('ESCANEADOS');
  if (!sh) {
    sh = ss.insertSheet('ESCANEADOS');
    const h = ['Recibido', 'Tipo', 'Desde', 'Hasta', 'Parte', 'Archivos', 'Enlazados a su manifiesto', 'Envió', 'Nota', 'Carpeta', 'Control'];
    sh.appendRow(general ? ['Establecimiento'].concat(h) : h);
    sh.getRange(1, 1, 1, h.length + (general ? 1 : 0)).setFontWeight('bold').setBackground('#343A40').setFontColor('#FFFFFF');
    sh.setFrozenRows(1);
  }
  return sh;
}
function leerLotes_(ss) {
  const sh = ss.getSheetByName('ESCANEADOS'); if (!sh || sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, 6).getValues().map(r => ({ tipo: r[1], desde: String(r[2]), hasta: String(r[3]), archivos: r[5] }));
}
// Busca el número de manifiesto en el nombre de cada archivo y agrega el enlace en la fila del manifiesto
function enlazarEscaneos_(ss, nombres, carpeta, desde, hasta) {
  const sh = ss.getSheetByName('MANIFIESTOS'), n = sh.getLastRow() - 5; if (n < 1) return 0;
  const v = sh.getRange(6, 1, n, 13).getValues(); let cant = 0;
  nombres.forEach(nom => {
    const nums = (nom.match(/\d{5,}/g) || []).map(x => String(Number(x)));
    if (!nums.length) return;
    const it = carpeta.getFilesByName(nom); if (!it.hasNext()) return; const url = it.next().getUrl();
    v.forEach((r, i) => {
      if (nums.indexOf(String(r[5]).replace(/^0+/, '')) < 0) return;
      const obs = String(r[12] || ''); if (obs.indexOf(url) >= 0) return;
      sh.getRange(6 + i, 13).setValue((obs ? obs + ' · ' : '') + 'Escaneo: ' + url); cant++;
    });
  });
  return cant;
}
function escaneoDe_(carpetaId, nro) {
  // Busca un archivo con el número de manifiesto dentro de «Escaneados › Manifiestos» del establecimiento
  const num = String(nro).replace(/\D/g, ''); if (num.length < 5) return '';
  try {
    const r = DriveApp.getFolderById(carpetaId).getFoldersByName('Escaneados'); if (!r.hasNext()) return '';
    const m = r.next().getFoldersByName('Manifiestos'); if (!m.hasNext()) return '';
    const pila = [m.next()];
    while (pila.length) {
      const f = pila.pop(), it = f.searchFiles('title contains "' + num + '"');
      if (it.hasNext()) return it.next().getUrl();
      const subs = f.getFolders(); while (subs.hasNext()) pila.push(subs.next());
    }
  } catch (e) {}
  return '';
}
// Agrega una alerta en el libro general (las fórmulas se copian de la fila anterior)
function alerta_(g, tipo, est, sitio, detalle) {
  try {
    const sh = g.getSheetByName('ALERTAS'), r = sh.getLastRow(), n = r + 1;
    sh.getRange(n, 1, 1, 6).setValues([[r - 4, tipo, est, sitio, detalle, new Date()]]);
    sh.getRange(n, 9).setValue('Pendiente');
    [7, 8, 11, 12].forEach(c => sh.getRange(r, c).copyTo(sh.getRange(n, c), SpreadsheetApp.CopyPasteType.PASTE_FORMULA, false));
    sh.getRange(r, 1, 1, 13).copyTo(sh.getRange(n, 1, 1, 13), SpreadsheetApp.CopyPasteType.PASTE_FORMAT, false);
    const rg = g.getSheetByName('REGLAS');
    if (!rg.createTextFinder(tipo).matchEntireCell(true).findNext()) { rg.insertRowAfter(5); rg.getRange(6, 1, 1, 5).setValues([[tipo, 3, 3, 0, 'Agregada por el sistema']]); }
  } catch (e) {}
}

// ------------------------------------------------------------------ AUXILIARES
function fechaPunto_(iso) { const p = String(iso).split('-'); return p.length === 3 ? p[2] + '.' + p[1] + '.' + p[0] : String(iso); }
function nro12_(n) { const d = String(n).replace(/\D/g, ''); return d ? d.padStart(12, '0') : String(n).trim(); }
function num_(v) { const n = Number(String(v).replace(',', '.')); return isNaN(n) || v === '' ? '' : n; }
function agregar_(sh, filas, colsFormula, formulasR1C1) {
  if (!filas.length) return;
  const r0 = sh.getLastRow() + 1;
  sh.getRange(r0, 1, filas.length, filas[0].length).setValues(filas);
  colsFormula.forEach((c, i) => sh.getRange(r0, c, filas.length, 1).setFormulaR1C1(formulasR1C1[i]));
  // Copia el formato de la fila anterior (colores, fechas, bordes)
  if (r0 > 6) sh.getRange(r0 - 1, 1, 1, filas[0].length).copyTo(sh.getRange(r0, 1, filas.length, filas[0].length), SpreadsheetApp.CopyPasteType.PASTE_FORMAT, false);
}
function carpeta_(padre, nombre) { const it = padre.getFoldersByName(nombre); return it.hasNext() ? it.next() : padre.createFolder(nombre); }
function guardarFoto_(carpetaId, tipo, anio, nombre, dataUrl) {
  const m = /^data:([\w.+-]+\/[\w.+-]+);base64,(.+)$/.exec(dataUrl); if (!m) return '';
  const ext = m[1] === 'application/pdf' ? '.pdf' : m[1] === 'image/png' ? '.png' : '.jpg';
  const dest = carpeta_(carpeta_(DriveApp.getFolderById(carpetaId), tipo), anio);
  const blob = Utilities.newBlob(Utilities.base64Decode(m[2]), m[1], nombre.replace(/[^\w\-.áéíóúñÁÉÍÓÚÑ ]/g, '_') + ext);
  return dest.createFile(blob).getUrl();
}
function registrarError_(d, err) {
  try {
    const ss = SpreadsheetApp.openById(CFG.GENERAL);
    const sh = ss.getSheetByName('ERRORES_SISTEMA') || ss.insertSheet('ERRORES_SISTEMA');
    sh.appendRow([new Date(), d.est || '', d.accion || '', String(err && err.stack || err)]);
  } catch (e) { /* sin registro */ }
}

// ------------------------------------------------------------------ PRUEBA DESDE EL EDITOR
function probarConfig() { Logger.log('Clave HMH correcta: ' + claveOk_('HMH', 'Houssay1887')); Logger.log(JSON.stringify(config_('HMH')).slice(0, 2000)); }
