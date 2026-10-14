/**
 * SISTEMA HyS · MÓDULO 1 · RESIDUOS · CONTRATOS, FRECUENCIAS DE RETIRO Y COSTOS (versión 14.23, 13/10/2026)
 * Hojas nuevas en el libro general de residuos (se crean solas la primera vez; todo se edita a mano, filas desde la 6):
 *   CONTRATOS          un contrato por fila (empresa, expediente, resolución, vigencia, archivo). ESTADO: Vigente · Anterior
 *   CONTRATO_GRUPOS    grupos de precio de cada contrato: servicio, cupo mensual (dm³), precio por dm³ y precio del excedente, con DESDE/HASTA
 *                      (si el precio cambia, se agrega otra fila del mismo grupo con la fecha DESDE nueva)
 *   CONTRATO_ALCANCE   qué establecimiento (y sitio o tipo de sitio) entra en cada grupo y con qué frecuencia de retiro según el contrato
 * Carga inicial: contrato Impeesa S.A. 2026 (Expte. 3466/25 SS, Res. 43/26 SS, desde el 01/07/2026, 6 meses prorrogables).
 * p_res_frecuencias: retiros por establecimiento y sitio (por mes, por año, promedio mensual, días entre retiros) contra la frecuencia del contrato.
 * p_res_costos: costo mensual estimado por grupo desde el inicio del contrato vigente: cupo × precio («saldo según contrato» si no se llega al
 *   cupo, cláusula SÉPTIMA) + excedente × precio del excedente. Volumen facturable: todas las corrientes del manifiesto (Y1 + Y3 y otras) en dm³, como factura Impeesa.
 * Normativa: Ley 24.051 y Dto. 831/93; Ley XI N.º 35 (Código Ambiental del Chubut); contrato y Anexo I.
 */
const RCT = {
  H_CON: ['ID', 'EMPRESA', 'OBJETO', 'EXPEDIENTE', 'RESOLUCION', 'DESDE', 'HASTA', 'PRORROGA', 'CUPO_TOTAL_DM3_MES', 'ARCHIVO', 'ESTADO', 'OBSERVACIONES'],
  H_GRU: ['ID_CONTRATO', 'GRUPO', 'SERVICIO', 'CUPO_DM3_MES', 'PRECIO_DM3', 'PRECIO_EXCEDENTE_DM3', 'DESDE', 'HASTA', 'OBSERVACIONES'],
  H_ALC: ['ID_CONTRATO', 'GRUPO', 'ESTABLECIMIENTO', 'SITIO', 'TIPO_SITIO', 'FRECUENCIA_CONTRATO', 'ORIGEN_FRECUENCIA', 'OBSERVACIONES'],
  ARCHIVO_IMP26: 'https://drive.google.com/file/d/1ncvg3XSE97RqYlWHI1L7vs11aPfwCw8R/view'
};
// Retiros por mes esperables según la frecuencia escrita
function rctEsperados_(frec) {
  const f = sinTildes_(frec);
  if (!f || /^s\/d|a confirmar|no figura/.test(f)) return null;
  if (/diari/.test(f)) return /todos los dias|lun a dom/.test(f) ? 30 : 26;   // diaria salvo domingos (y feriados): unos 26 por mes
  const m = /(\d+) *(dias|veces) *(por|a la|x) *semana/.exec(f); if (m) return Math.round(Number(m[1]) * 4.33 * 10) / 10;
  if (/seman/.test(f)) return 4.3;
  if (/quinc/.test(f)) return 2.2;
  if (/mensu/.test(f)) return 1;
  return null;
}
// Hojas (se crean si faltan) y carga inicial del contrato Impeesa 2026
function rctHojas_(g) {
  const hoja = (n, H, tit, sub) => { let sh = g.getSheetByName(n); if (!sh) { sh = g.insertSheet(n); encabezar_(sh, tit, sub, H); } return sh; };
  const C = hoja('CONTRATOS', RCT.H_CON, 'Contratos de residuos peligrosos', 'Un contrato por fila. ESTADO: Vigente o Anterior. Fechas dd/mm/aaaa. Los precios y cupos van en CONTRATO_GRUPOS; quién entra y con qué frecuencia, en CONTRATO_ALCANCE.');
  const G = hoja('CONTRATO_GRUPOS', RCT.H_GRU, 'Grupos de precio de cada contrato', 'Cupo mensual en dm³, precio por dm³ (IVA incluido) y precio del excedente. Si el precio cambia, agregá otra fila del mismo grupo con la fecha DESDE nueva.');
  const A = hoja('CONTRATO_ALCANCE', RCT.H_ALC, 'Alcance y frecuencia de retiro por contrato', 'Establecimiento (código de la BASE COMÚN). SITIO vacío = todo el establecimiento; TIPO_SITIO (CAPS, Dispositivo, Edificio) = todos los sitios de ese tipo. FRECUENCIA_CONTRATO: Diaria (lun a sáb), 3 días por semana, Semanal, Quincenal, Mensual o s/d. ORIGEN_FRECUENCIA: Contrato (lo dice el contrato) o Deducción (supuesto de Higiene y Seguridad, no figura en el contrato).');
  if (C.getLastRow() < 6) {
    const desde = new Date(2026, 6, 1), hasta = new Date(2026, 11, 31);
    C.getRange(6, 1, 1, RCT.H_CON.length).setValues([['IMP-2026', 'Impeesa S.A.', 'Recolección, tratamiento y disposición final de residuos patogénicos (grupo 1); tratamiento y disposición final (grupo 2)',
      '3466/25 SS', 'Res. 43/26 SS', desde, hasta, 'Prorrogable por igual término (cláusulas SEGUNDA y CUARTA)', 140660, RCT.ARCHIVO_IMP26, 'Vigente',
      'Si el volumen es menor al cupo se factura «saldo según contrato»; el excedente, aparte (cláusula SÉPTIMA). Precio fijo los primeros 3 meses (cláusula CUARTA).']]);
    G.getRange(6, 1, 2, RCT.H_GRU.length).setValues([
      ['IMP-2026', '1', 'Recolección, tratamiento y disposición final', 32000, 807, 766.69, desde, '', 'HZ Trelew, HZ Puerto Madryn, Subzonal Rawson y rurales de Gaiman y Dolavon (cláusula TERCERA)'],
      ['IMP-2026', '2', 'Tratamiento y disposición final', 108660, 864.37, 821.05, desde, '', 'HZ Esquel y establecimientos de las UGD Norte, Noreste, Noroeste y Sur (cláusula TERCERA)']]);
    G.getRange(6, 7, 2, 2).setNumberFormat('dd/mm/yyyy'); C.getRange(6, 6, 1, 2).setNumberFormat('dd/mm/yyyy');
    const DED = 'DEDUCCIÓN, no por contrato: el Anexo I solo fija frecuencias dentro del ejido de Trelew; ';
    const filas = [
      ['IMP-2026', '1', 'HZT', 'HZT Central', '', 'Diaria (lun a sáb)', 'Contrato', 'Anexo I: diaria, salvo domingos y feriados, en el Hospital Zonal de Trelew'],
      ['IMP-2026', '1', 'HZT', '', 'CAPS', '3 días por semana', 'Contrato', 'Anexo I: tres días por semana en los centros de salud del ejido de Trelew'],
      ['IMP-2026', '1', 'HZT', '', '', 's/d (revisar)', '', 'Otros sitios del HZT: no figuran en el Anexo I'],
      ['IMP-2026', '1', 'HMH', '', '', 'Diaria (lun a sáb)', 'Deducción', 'DEDUCCIÓN, no por contrato: el contrato no nombra al HMH; se toma como parte del Hospital Zonal de Trelew (misma Dirección). Cambiar si corresponde'],
      ['IMP-2026', '1', 'HSST', '', '', 'Diaria (lun a sáb)', 'Deducción', DED + 'se asume la misma frecuencia que el Hospital Zonal de Trelew porque el Subzonal Rawson está en el mismo grupo del contrato. Cambiar si corresponde'],
      ['IMP-2026', '1', 'HSST', '', 'CAPS', '3 días por semana', 'Deducción', DED + 'se asume la misma frecuencia que los centros de salud de Trelew. Cambiar si corresponde'],
      ['IMP-2026', '1', 'HZPM', '', '', 's/d (revisar)', '', 'Fuera del ejido de Trelew: el Anexo I no fija frecuencia'],
      ['IMP-2026', '1', 'Gaiman', '', '', 's/d (revisar)', '', 'Fuera del ejido de Trelew: el Anexo I no fija frecuencia'],
      ['IMP-2026', '1', 'Dolavon', '', '', 's/d (revisar)', '', 'Fuera del ejido de Trelew: el Anexo I no fija frecuencia'],
      ['IMP-2026', '2', 'HZE', '', '', 's/d (revisar)', '', 'Solo tratamiento y disposición final']];
    const g1 = { HZT: 1, HMH: 1, HZPM: 1, HSST: 1, Gaiman: 1, Dolavon: 1, HZE: 1 };
    pEstablecimientos_().filas.forEach(f => { const c = limpio_(f.v[0]); if (c && !g1[c]) filas.push(['IMP-2026', '2', c, '', '', 's/d (revisar)', 'Deducción', 'DEDUCCIÓN, no por contrato: UGD Norte, Noreste, Noroeste o Sur: a confirmar si está incluido en el contrato']); });
    A.getRange(6, 1, filas.length, RCT.H_ALC.length).setValues(filas);
  }
  return { C: C, G: G, A: A };
}
function rctLeer_(sh, H) { return pTabla_(sh, H.length).map(r => { const o = { fila: r.fila }; H.forEach((h, i) => o[h] = r.v[i] instanceof Date ? Utilities.formatDate(r.v[i], TZ, 'yyyy-MM-dd') : r.v[i]); return o; }); }
function rctContratos_(g) {
  const S = conLock_(() => rctHojas_(g));
  const C = rctLeer_(S.C, RCT.H_CON).filter(c => limpio_(c.ID)), G = rctLeer_(S.G, RCT.H_GRU).filter(x => limpio_(x.ID_CONTRATO)), A = rctLeer_(S.A, RCT.H_ALC).filter(x => limpio_(x.ID_CONTRATO));
  const fe = v => resFecha_(v);
  C.forEach(c => { c.DESDE = fe(c.DESDE); c.HASTA = fe(c.HASTA); c.grupos = G.filter(x => x.ID_CONTRATO === c.ID).map(x => Object.assign(x, { GRUPO: String(x.GRUPO), DESDE: fe(x.DESDE) || c.DESDE, HASTA: fe(x.HASTA), CUPO_DM3_MES: Number(x.CUPO_DM3_MES) || 0, PRECIO_DM3: Number(x.PRECIO_DM3) || 0, PRECIO_EXCEDENTE_DM3: Number(x.PRECIO_EXCEDENTE_DM3) || 0 }));
    c.alcance = A.filter(x => x.ID_CONTRATO === c.ID).map(x => Object.assign(x, { GRUPO: String(x.GRUPO), ESTABLECIMIENTO: limpio_(x.ESTABLECIMIENTO), SITIO: limpio_(x.SITIO), TIPO_SITIO: limpio_(x.TIPO_SITIO) })); });
  return { contratos: C, url: g.getUrl() + '#gid=' + S.C.getSheetId() };
}
// Contrato, grupo y frecuencia de un sitio en una fecha (mes aaaa-mm)
function rctUbicar_(C, cod, sitio, tipo, mes) {
  const vig = C.filter(c => (!c.DESDE || c.DESDE.slice(0, 7) <= mes) && (!c.HASTA || c.HASTA.slice(0, 7) >= mes || /prorrog/i.test(c.PRORROGA) && c.ESTADO === 'Vigente'));
  for (const c of vig) {
    const A = c.alcance.filter(a => a.ESTABLECIMIENTO === cod); if (!A.length) continue;
    const a = A.find(x => x.SITIO && sinTildes_(x.SITIO) === sinTildes_(sitio)) || A.find(x => !x.SITIO && x.TIPO_SITIO && sinTildes_(x.TIPO_SITIO) === sinTildes_(tipo)) || A.find(x => !x.SITIO && !x.TIPO_SITIO);
    if (a) return { contrato: c.ID, empresa: c.EMPRESA, grupo: a.GRUPO, frecuencia: a.FRECUENCIA_CONTRATO || 's/d (revisar)', esperados: rctEsperados_(a.FRECUENCIA_CONTRATO), deduccion: /deduc/i.test(sinTildes_(a.ORIGEN_FRECUENCIA)), nota: limpio_(a.OBSERVACIONES) };
  }
  return null;
}
// Lectura común de manifiestos: un retiro = un manifiesto (sitio + número + fecha), con Y1 y Y3 en dm³
function rctRetiros_(g, desde) {
  const E = pEstablecimientos_().filas, porNombre = {}, info = {};
  E.forEach(f => { const c = limpio_(f.v[0]); if (!c) return; porNombre[sinTildes_(f.v[1])] = c; info[c] = { cod: c, nombre: limpio_(f.v[1]), tipo: limpio_(f.v[3]), area: limpio_(f.v[4]) }; });
  const tipoSitio = {}; try { pTabla_(pBC_().getSheetByName('SITIOS'), 7).forEach(r => tipoSitio[limpio_(r.v[0]) + '|' + sinTildes_(r.v[1])] = limpio_(r.v[4])); } catch (e) {}
  const gm = g.getSheetByName('MANIFIESTOS'), n = gm.getLastRow() - 5, R = {};
  if (n > 0) gm.getRange(6, 1, n, 13).getValues().forEach(r => {
    const cod = porNombre[sinTildes_(r[0])]; if (!cod) return; const f = resFecha_(r[3]); if (!f || f < desde) return;
    const sitio = limpio_(r[1]) || info[cod].nombre, k = cod + '|' + sitio + '|' + limpio_(r[6]) + '|' + f;
    const x = R[k] = R[k] || { cod: cod, sitio: sitio, tipo: tipoSitio[cod + '|' + sinTildes_(sitio)] || '', fecha: f, nro: limpio_(r[6]), y1: 0, y3: 0, otras: 0, enKg: false };
    let cant = Number(String(r[9]).replace(',', '.')) || 0; const uni = sinTildes_(r[10]);
    if (/kg/.test(uni)) { x.enKg = true; return; }   // Impeesa factura por dm³: lo cargado en kg no se suma al volumen
    const cor = limpio_(r[7]); if (cor === 'Y1') x.y1 += cant; else if (cor === 'Y3') x.y3 += cant; else if (cor) x.otras += cant;
  });
  return { retiros: Object.keys(R).map(k => R[k]), info: info };
}
const rctMeses_ = (desde, hasta) => { const out = []; let y = Number(desde.slice(0, 4)), m = Number(desde.slice(5, 7)); const fin = hasta.slice(0, 7);
  for (let i = 0; i < 120; i++) { const k = y + '-' + ('0' + m).slice(-2); if (k > fin) break; out.push(k); m++; if (m > 12) { m = 1; y++; } } return out; };

// ------------------------------------------------------------------ FRECUENCIAS DE RETIRO
// x: { desde?: 'aaaa-mm', hasta?: 'aaaa-mm' } (por omisión, los últimos 12 meses completos y el mes en curso)
function resFrecuencias_(x) {
  x = x || {}; const cache = CacheService.getScriptCache(), hoy = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd');
  const d0 = new Date(); d0.setDate(1); d0.setMonth(d0.getMonth() - 12);
  const desde = /^\d{4}-\d{2}$/.test(x.desde || '') ? x.desde : Utilities.formatDate(d0, TZ, 'yyyy-MM'), hasta = /^\d{4}-\d{2}$/.test(x.hasta || '') ? x.hasta : hoy.slice(0, 7);
  const g = SpreadsheetApp.openById(CFG.GENERAL), huella = g.getSheetByName('MANIFIESTOS').getLastRow() + '|' + desde + '|' + hasta, kc = 'res_frec_' + desde + '_' + hasta;
  if (!x.fresco) { try { const c = typeof cacheGet_ === 'function' ? cacheGet_(kc + '_z') : JSON.parse(cache.get(kc) || 'null'); if (c && c.huella === huella) return c; } catch (e) {} }
  const K = rctContratos_(g), C = K.contratos, L = rctRetiros_(g, desde + '-01'), meses = rctMeses_(desde, hasta);
  const S = {};
  L.retiros.filter(r => r.fecha.slice(0, 7) <= hasta).forEach(r => {
    const k = r.cod + '|' + r.sitio, s = S[k] = S[k] || { cod: r.cod, sitio: r.sitio, tipo: r.tipo, fechas: [], porMes: {}, porAnio: {}, y1: 0, y3: 0 };
    s.fechas.push(r.fecha); const m = r.fecha.slice(0, 7); s.porMes[m] = (s.porMes[m] || 0) + 1; s.porAnio[m.slice(0, 4)] = (s.porAnio[m.slice(0, 4)] || 0) + 1; s.y1 += r.y1; s.y3 += r.y3;
  });
  const mesesCompletos = meses.filter(m => m < hoy.slice(0, 7));   // el mes en curso no cuenta para el promedio
  const sitios = Object.keys(S).map(k => {
    const s = S[k], F = Array.from(new Set(s.fechas)).sort(), gaps = [];
    for (let i = 1; i < F.length; i++) gaps.push((new Date(F[i] + 'T12:00:00') - new Date(F[i - 1] + 'T12:00:00')) / 864e5);
    const primero = F[0].slice(0, 7), base = mesesCompletos.filter(m => m >= primero), tot = base.reduce((a, m) => a + (s.porMes[m] || 0), 0);
    const u = rctUbicar_(C, s.cod, s.sitio, s.tipo, hasta) || {};
    const prom = base.length ? Math.round(10 * tot / base.length) / 10 : null;
    return { cod: s.cod, nombre: (L.info[s.cod] || {}).nombre || s.cod, area: (L.info[s.cod] || {}).area || '', sitio: s.sitio, tipo: s.tipo || 's/d', porMes: s.porMes, porAnio: s.porAnio,
      total: F.length, promedioMes: prom, mesesBase: base.length, intervaloProm: gaps.length ? Math.round(10 * gaps.reduce((a, b) => a + b, 0) / gaps.length) / 10 : null,
      intervaloMax: gaps.length ? Math.max(...gaps) : null, porSemana: prom == null ? null : Math.round(10 * prom / 4.33) / 10, ultimo: F[F.length - 1],
      y1: Math.round(s.y1), y3: Math.round(s.y3), contrato: u.contrato || '', empresa: u.empresa || '', grupo: u.grupo || '', frecuencia: u.frecuencia || 'Sin contrato cargado', deduccion: !!u.deduccion, nota: u.nota || '',
      esperadosMes: u.esperados || null, cumplimiento: u.esperados && prom != null ? Math.round(100 * prom / u.esperados) : null };
  }).sort((a, b) => (a.nombre + a.sitio).localeCompare(b.nombre + b.sitio));
  // Por establecimiento
  const est = {};
  sitios.forEach(s => { const e = est[s.cod] = est[s.cod] || { cod: s.cod, nombre: s.nombre, area: s.area, sitios: 0, total: 0, porMes: {}, porAnio: {}, y1: 0, y3: 0, contratos: {} };
    e.sitios++; e.total += s.total; e.y1 += s.y1; e.y3 += s.y3; Object.keys(s.porMes).forEach(m => e.porMes[m] = (e.porMes[m] || 0) + s.porMes[m]); Object.keys(s.porAnio).forEach(a => e.porAnio[a] = (e.porAnio[a] || 0) + s.porAnio[a]);
    if (s.contrato) e.contratos[s.contrato + ' · grupo ' + s.grupo] = 1; });
  const ests = Object.keys(est).map(c => { const e = est[c], base = mesesCompletos.filter(m => Object.keys(e.porMes).some(k => k <= m)), tot = base.reduce((a, m) => a + (e.porMes[m] || 0), 0);
    e.promedioMes = base.length ? Math.round(10 * tot / base.length) / 10 : null; e.contratos = Object.keys(e.contratos); return e; }).sort((a, b) => a.nombre.localeCompare(b.nombre));
  // Sin manifiestos en el período, pero dentro de un contrato
  const conDatos = {}; ests.forEach(e => conDatos[e.cod] = 1);
  const sinDatos = []; C.filter(c => c.ESTADO === 'Vigente').forEach(c => c.alcance.forEach(a => { if (!conDatos[a.ESTABLECIMIENTO] && !sinDatos.some(s => s.cod === a.ESTABLECIMIENTO)) sinDatos.push({ cod: a.ESTABLECIMIENTO, nombre: (L.info[a.ESTABLECIMIENTO] || {}).nombre || a.ESTABLECIMIENTO, area: (L.info[a.ESTABLECIMIENTO] || {}).area || '', contrato: c.ID, grupo: a.GRUPO, frecuencia: a.FRECUENCIA_CONTRATO, deduccion: /deduc/i.test(sinTildes_(a.ORIGEN_FRECUENCIA)) }); }));
  const out = { ok: true, huella: huella, desde: desde, hasta: hasta, meses: meses, hoy: hoy, sitios: sitios, establecimientos: ests, sinDatos: sinDatos,
    contratos: C.map(c => ({ id: c.ID, empresa: c.EMPRESA, desde: c.DESDE, hasta: c.HASTA, estado: c.ESTADO, archivo: c.ARCHIVO })), hojaContratos: K.url, actualizado: new Date().toISOString() };
  if (typeof cachePut_ === 'function') cachePut_(kc + '_z', out, 3600); else try { cache.put(kc, JSON.stringify(out), 600); } catch (e) {}
  return out;
}

// ------------------------------------------------------------------ COSTOS DEL CONTRATO
// x: { contrato?: ID } (por omisión, el vigente). Mes a mes desde el inicio del contrato hasta el mes en curso.
function resCostos_(x) {
  x = x || {}; const g = SpreadsheetApp.openById(CFG.GENERAL), K = rctContratos_(g), hoy = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd');
  const C = K.contratos, c = C.find(k => k.ID === x.contrato) || C.find(k => k.ESTADO === 'Vigente') || C[0];
  if (!c) return { ok: false, mensaje: 'No hay contratos cargados en el libro general (hoja CONTRATOS).' };
  const desde = c.DESDE || hoy.slice(0, 8) + '01', hastaC = c.HASTA && c.HASTA < hoy ? c.HASTA : hoy, meses = rctMeses_(desde, hastaC);
  const L = rctRetiros_(g, desde), grupos = Array.from(new Set(c.grupos.map(x => x.GRUPO))).sort();
  const precioDe = (gr, mes) => c.grupos.filter(x => x.GRUPO === gr && (!x.DESDE || x.DESDE.slice(0, 7) <= mes) && (!x.HASTA || x.HASTA.slice(0, 7) >= mes)).sort((a, b) => String(b.DESDE).localeCompare(String(a.DESDE)))[0] || null;
  const miembros = {}; grupos.forEach(gr => miembros[gr] = Array.from(new Set(c.alcance.filter(a => a.GRUPO === gr).map(a => a.ESTABLECIMIENTO))));
  const vol = {}, porEst = {};
  L.retiros.forEach(r => { const m = r.fecha.slice(0, 7); if (m > hastaC.slice(0, 7)) return; const u = rctUbicar_([c], r.cod, r.sitio, r.tipo, m); if (!u) return;
    const k = u.grupo + '|' + m, v = vol[k] = vol[k] || { tot: 0, y1: 0, y3: 0, retiros: 0, enKg: 0, ests: {} }; const tt = r.y1 + r.y3 + r.otras; v.tot += tt; v.y1 += r.y1; v.y3 += r.y3; v.retiros++; if (r.enKg) v.enKg++; v.ests[r.cod] = 1;
    const e = porEst[r.cod] = porEst[r.cod] || { cod: r.cod, nombre: (L.info[r.cod] || {}).nombre || r.cod, grupo: u.grupo, porMes: {}, porMesY1: {}, porMesY3: {}, tot: 0, y1: 0, y3: 0 }; e.porMes[m] = (e.porMes[m] || 0) + tt; e.porMesY1[m] = (e.porMesY1[m] || 0) + r.y1; e.porMesY3[m] = (e.porMesY3[m] || 0) + r.y3; e.tot += tt; e.y1 += r.y1; e.y3 += r.y3; if (r.enKg) e.enKg = (e.enKg || 0) + 1; });
  const filas = [];
  grupos.forEach(gr => meses.forEach(m => {
    const p = precioDe(gr, m), v = vol[gr + '|' + m] || { tot: 0, y1: 0, y3: 0, retiros: 0, ests: {} }; if (!p) return;
    const cupo = p.CUPO_DM3_MES, exc = Math.max(0, v.tot - cupo), costo = cupo * p.PRECIO_DM3 + exc * p.PRECIO_EXCEDENTE_DM3;
    filas.push({ grupo: gr, mes: m, enCurso: m === hoy.slice(0, 7), servicio: p.SERVICIO, cupo: cupo, precio: p.PRECIO_DM3, precioExc: p.PRECIO_EXCEDENTE_DM3, volumen: Math.round(v.tot), y1: Math.round(v.y1), y3: Math.round(v.y3), retiros: v.retiros,
      usoCupo: cupo ? Math.round(1000 * v.tot / cupo) / 10 : null, excedente: Math.round(exc), costo: Math.round(costo), costoVolumen: Math.round(Math.min(v.tot, cupo) * p.PRECIO_DM3 + exc * p.PRECIO_EXCEDENTE_DM3),
      sinUso: Math.round(Math.max(0, cupo - v.tot) * p.PRECIO_DM3), costoDm3Real: v.tot ? Math.round(costo / v.tot) : null, cargan: Object.keys(v.ests).length, miembros: miembros[gr].length, enKg: v.enKg || 0 });
  }));
  const ests = Object.keys(porEst).map(k => { const e = porEst[k], p = precioDe(e.grupo, hastaC.slice(0, 7)); e.y1 = Math.round(e.y1); e.y3 = Math.round(e.y3); e.tot = Math.round(e.tot); e.valorPrecio = p ? Math.round(e.tot * p.PRECIO_DM3) : null; return e; }).sort((a, b) => b.tot - a.tot);
  return { ok: true, hoy: hoy, contrato: { id: c.ID, empresa: c.EMPRESA, objeto: c.OBJETO, expediente: c.EXPEDIENTE, resolucion: c.RESOLUCION, desde: c.DESDE, hasta: c.HASTA, prorroga: c.PRORROGA, archivo: c.ARCHIVO, estado: c.ESTADO, observaciones: c.OBSERVACIONES },
    contratos: C.map(k => ({ id: k.ID, empresa: k.EMPRESA, desde: k.DESDE, hasta: k.HASTA, estado: k.ESTADO })), grupos: grupos.map(gr => ({ grupo: gr, servicio: (precioDe(gr, hastaC.slice(0, 7)) || {}).SERVICIO || '', miembros: miembros[gr].map(cd => ({ cod: cd, nombre: (L.info[cd] || {}).nombre || cd })) })),
    meses: meses, filas: filas, establecimientos: ests, hojaContratos: K.url, actualizado: new Date().toISOString() };
}
