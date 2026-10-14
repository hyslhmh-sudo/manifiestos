/**
 * SISTEMA HyS · MÓDULO 1 · RESIDUOS · REMISIÓN SEMANAL DE MANIFIESTOS (versión 14.35, 13/10/2026)
 * Regla de PROT-RES-003 (punto 6, regla 5; punto 10; pasos 24 a 29): los manifiestos se envían a Higiene y Seguridad una vez por
 * semana y no se retienen más de una semana. Rige desde el 14/10/2026 para todos los establecimientos de la provincia.
 *
 * Aviso por sitio: si el último manifiesto cargado de un sitio tiene más de 14 días (dos semanas: una de remisión y una de carga),
 * se avisa en «Mi establecimiento» (aplicación), en la ficha del establecimiento (matriz › «Resolver rápido») y en el Tablero de inicio
 * del portal («Requiere atención»). Para los sitios con retiro quincenal o mensual el plazo es el de su frecuencia (20 o 40 días).
 * No se avisa por los sitios con frecuencia «no corresponde» ni por los que no tienen manifiestos en los últimos 180 días.
 *
 * «No se recibieron manifiestos esta semana» (botón de la aplicación): queda una fila en el libro general › REMISION_OBS con quién y
 * cuándo lo indicó, el sitio y la semana. El aviso de ese sitio se calla 7 días; si sigue sin manifiestos, vuelve. Cada fila aparece en la
 * ficha como «Recordar al CAPS el protocolo de trabajo» con la cantidad de veces del último mes. La hoja se puede revisar a mano.
 *
 * Lee: libro general › MANIFIESTOS (A establecimiento · B sitio · D fecha · G N.º) y BASE COMÚN › SITIOS (G frecuencia).
 * «avisos» trae los sitios atrasados aunque la regla todavía no rija (activa = false): el portal y la aplicación solo avisan con activa = true.
 * Entradas: Codigo.gs › config_ (CFG.remision, aplicación) y doPost › 'remision_obs'; Portal.gs › 'p_tablero' (TB.remision).
 */
const REM = { INICIO: '2026-10-14', PLAZO: 14, SILENCIO: 7, ACTIVO_DIAS: 180, HOJA: 'REMISION_OBS',
  H: ['FECHA_REGISTRO', 'ESTABLECIMIENTO', 'NOMBRE', 'SITIO', 'SEMANA', 'ULTIMO_MANIFIESTO', 'ULTIMO_NRO', 'QUIEN', 'OBSERVACION'],
  TEXTO: 'No se recibieron manifiestos esta semana',
  RECORDAR: 'Recordar al CAPS el protocolo de trabajo: remisión semanal de manifiestos a Higiene y Seguridad (PROT-RES-003).' };

const remHoy_ = () => Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd');
const remDias_ = (desde, hasta) => Math.round((new Date(hasta + 'T12:00:00') - new Date(desde + 'T12:00:00')) / 86400000);
function remSuma_(f, d) { const x = new Date(f + 'T12:00:00'); x.setDate(x.getDate() + d); return Utilities.formatDate(x, TZ, 'yyyy-MM-dd'); }
function remLunes_(f) { const x = new Date(f + 'T12:00:00'), d = (x.getDay() + 6) % 7; return remSuma_(f, -d); }
// Plazo del sitio: 14 días, o el de su frecuencia si es más largo (quincenal 20, mensual 40). null = no corresponde
function remPlazo_(frec) {
  const f = sinTildes_(frec);
  if (/no corresponde|no aplica/.test(f)) return null;
  return /quinc|mensu/.test(f) ? Math.max(REM.PLAZO, resLimiteDias_(frec)) : REM.PLAZO;
}

function remHoja_(crear) {
  const g = SpreadsheetApp.openById(CFG.GENERAL);
  let sh = g.getSheetByName(REM.HOJA);
  if (!sh && crear) {
    sh = g.insertSheet(REM.HOJA);
    encabezar_(sh, 'Remisión semanal de manifiestos · observaciones', 'Una fila cada vez que el establecimiento indica «' + REM.TEXTO + '» (PROT-RES-003). La carga la aplicación; no borrar filas.', REM.H);
  }
  return sh;
}
function remObsLeer_() {
  const sh = remHoja_(false); if (!sh) return [];
  const n = sh.getLastRow() - 5; if (n < 1) return [];
  return sh.getRange(6, 1, n, REM.H.length).getValues().filter(r => r[0] && r[1]).map(r => ({
    fecha: resFecha_(r[0]), cod: limpio_(r[1]), nombre: limpio_(r[2]), sitio: limpio_(r[3]), semana: resFecha_(r[4]),
    ultimo: resFecha_(r[5]), nro: limpio_(r[6]), quien: limpio_(r[7]), obs: limpio_(r[8]) }));
}

// Estado de toda la red. Se guarda 10 minutos; si cambia la cantidad de filas de los manifiestos o de las observaciones, se recalcula.
function remRed_(fresco) {
  const cache = CacheService.getScriptCache(), g = SpreadsheetApp.openById(CFG.GENERAL), gm = g.getSheetByName('MANIFIESTOS'), so = g.getSheetByName(REM.HOJA);
  const hoy = remHoy_(), huella = hoy + '|' + gm.getLastRow() + '|' + (so ? so.getLastRow() : 0);
  if (!fresco) { try { const c = JSON.parse(cache.get('rem_red') || 'null'); if (c && c.huella === huella) return c; } catch (e) {} }
  const porNombre = {}, nombreDe = {};
  pEstablecimientos_().filas.forEach(f => { const cod = limpio_(f.v[0]); if (!cod) return; porNombre[sinTildes_(f.v[1])] = cod; nombreDe[cod] = limpio_(f.v[1]); });
  const frec = {}; try { pTabla_(pBC_().getSheetByName('SITIOS'), 7).forEach(r => frec[limpio_(r.v[0]) + '|' + sinTildes_(r.v[1])] = limpio_(r.v[6])); } catch (e) {}
  // Último manifiesto de cada sitio (fecha y N.º)
  const sit = {}, n = gm.getLastRow() - 5;
  if (n > 0) gm.getRange(6, 1, n, 7).getValues().forEach(r => {
    const cod = porNombre[sinTildes_(r[0])]; if (!cod || !r[3]) return;
    const f = resFecha_(r[3]); if (!f || f > hoy) return;
    const sitio = limpio_(r[1]) || nombreDe[cod], k = cod + '|' + sinTildes_(sitio), s = sit[k] = sit[k] || { cod: cod, sitio: sitio, ultimo: '', nro: '' };
    if (f > s.ultimo || (f === s.ultimo && !s.nro)) { s.ultimo = f; s.nro = limpio_(r[6]); }
  });
  const obs = remObsLeer_(), mes = remSuma_(hoy, -30), silencio = remSuma_(hoy, -(REM.SILENCIO - 1));
  const avisos = [];
  Object.keys(sit).forEach(k => {
    const s = sit[k], fr = frec[k] || '', plazo = remPlazo_(fr);
    if (plazo == null || remDias_(s.ultimo, hoy) > REM.ACTIVO_DIAS) return;
    const dias = remDias_(s.ultimo, hoy); if (dias <= plazo) return;
    const o = obs.filter(x => x.cod === s.cod && sinTildes_(x.sitio) === sinTildes_(s.sitio));
    const calla = o.filter(x => x.fecha >= silencio).pop();
    avisos.push({ cod: s.cod, nombre: nombreDe[s.cod] || s.cod, sitio: s.sitio, ultimo: s.ultimo, nro: s.nro, dias: dias, plazo: plazo, frecuencia: fr || 's/d',
      silenciado: !!calla, obsFecha: calla ? calla.fecha : '' });
  });
  avisos.sort((a, b) => b.dias - a.dias);
  // Observaciones del último mes, con la cantidad de veces por sitio
  const ult = obs.filter(x => x.fecha >= mes).map(x => Object.assign({}, x, {
    veces: obs.filter(y => y.cod === x.cod && sinTildes_(y.sitio) === sinTildes_(x.sitio) && y.fecha >= mes && y.fecha <= x.fecha).length }));
  const out = { ok: true, huella: huella, hoy: hoy, inicio: REM.INICIO, activa: hoy >= REM.INICIO, plazo: REM.PLAZO, recordar: REM.RECORDAR,
    avisos: avisos, observaciones: ult.reverse() };
  try { cache.put('rem_red', JSON.stringify(out), 600); } catch (e) {}
  return out;
}
// Para la aplicación (CFG.remision): solo los sitios de este establecimiento que todavía no se callaron
function remEst_(est) {
  const R = remRed_(false);
  return { activa: R.activa, plazo: R.plazo, hoy: R.hoy,
    sitios: R.avisos.filter(a => R.activa && a.cod === est && !a.silenciado).map(a => ({ sitio: a.sitio, ultimo: a.ultimo, nro: a.nro, dias: a.dias, plazo: a.plazo })),
    callados: R.avisos.filter(a => a.cod === est && a.silenciado).map(a => ({ sitio: a.sitio, obsFecha: a.obsFecha })) };
}
// «No se recibieron manifiestos esta semana» (aplicación). Una sola fila por sitio y semana.
function remObsGuardar_(est, datos, quien) {
  const sitio = limpio_(datos && datos.sitio); if (!sitio) return { ok: false, mensaje: 'Falta el sitio.' };
  const hoy = remHoy_(), semana = remLunes_(hoy), E = est_(est) || {};
  const R = remRed_(true), a = R.avisos.find(x => x.cod === est && sinTildes_(x.sitio) === sinTildes_(sitio)) || {};
  const ya = remObsLeer_().find(x => x.cod === est && sinTildes_(x.sitio) === sinTildes_(sitio) && x.semana === semana);
  if (!ya) {
    const sh = remHoja_(true);
    sh.getRange(sh.getLastRow() + 1, 1, 1, REM.H.length).setValues([[new Date(), est, E.nombre || est, sitio, semana, a.ultimo || '', a.nro || '', quien || 's/d', REM.TEXTO]]);
    CacheService.getScriptCache().remove('rem_red');
  }
  return { ok: true, semana: semana, repetida: !!ya, remision: remEst_(est) };
}
