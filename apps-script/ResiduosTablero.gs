/**
 * SISTEMA HyS · MÓDULO 1 · RESIDUOS · TABLERO GENERAL (versión 14.22, 13/10/2026)
 * Lee solo el libro general (MANIFIESTOS y CERTIFICADOS) y BASE COMÚN › SITIOS. No escribe nada.
 * Por establecimiento: último retiro y días sin retiro, retiros y cantidades por mes (Y1 y Y3), certificados de tratamiento por mes y meses
 * con retiros sin certificado, manifiestos sin foto (los establecimientos que cargan con la aplicación) y sitios atrasados según la
 * frecuencia pactada (BASE COMÚN › SITIOS › FRECUENCIA_PACTADA). Se guarda 10 minutos; si cambia la cantidad de filas de los manifiestos
 * o de los certificados, se recalcula en el momento.
 * Normativa: Ley 24.051 y Dto. 831/93 (manifiesto y certificado de tratamiento); Ley XI N.º 35 (Código Ambiental del Chubut).
 * Entrada: Portal.gs › case 'p_res_tablero'.
 */
const RES_TAB_DIAS = { diaria: 3, '3 días': 5, '2 días': 6, semanal: 10, quincenal: 20, mensual: 40, sd: 30 };
function resLimiteDias_(frec) {
  const f = sinTildes_(frec);
  if (!f || /^s\/d/.test(f)) return RES_TAB_DIAS.sd;
  if (/diari/.test(f)) return RES_TAB_DIAS.diaria;
  if (/3 dias/.test(f)) return RES_TAB_DIAS['3 días'];
  if (/2 dias/.test(f)) return RES_TAB_DIAS['2 días'];
  if (/seman/.test(f)) return RES_TAB_DIAS.semanal;
  if (/quinc/.test(f)) return RES_TAB_DIAS.quincenal;
  if (/mensu/.test(f)) return RES_TAB_DIAS.mensual;
  return RES_TAB_DIAS.sd;
}
function resFecha_(v) {   // Date o texto dd/mm/aaaa o aaaa-mm-dd → aaaa-mm-dd
  if (v instanceof Date) return Utilities.formatDate(v, TZ, 'yyyy-MM-dd');
  const t = limpio_(v); let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(t); if (m) return m[0];
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(t); return m ? m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2) : '';
}
function resTablero_(fresco) {
  const cache = CacheService.getScriptCache(), g = SpreadsheetApp.openById(CFG.GENERAL);
  const gm = g.getSheetByName('MANIFIESTOS'), gc = g.getSheetByName('CERTIFICADOS'), huella = gm.getLastRow() + '|' + (gc ? gc.getLastRow() : 0);
  if (!fresco) { try { const c = typeof cacheGet_ === 'function' ? cacheGet_('res_tablero2') : JSON.parse(cache.get('res_tablero') || 'null'); if (c && c.huella === huella) return c; } catch (e) {} }
  const hoy = new Date(), hoyISO = Utilities.formatDate(hoy, TZ, 'yyyy-MM-dd'), mesAct = hoyISO.slice(0, 7);
  const meses = []; for (let i = 11; i >= 0; i--) meses.push(Utilities.formatDate(new Date(hoy.getFullYear(), hoy.getMonth() - i, 1), TZ, 'yyyy-MM'));
  const desde = meses[0], dias = f => Math.floor((hoy - new Date(f + 'T12:00:00')) / 86400000);
  const E = pEstablecimientos_().filas, porNombre = {}, info = {};
  E.forEach(f => { const cod = limpio_(f.v[0]); if (!cod) return; porNombre[sinTildes_(f.v[1])] = cod; info[cod] = { cod: cod, nombre: limpio_(f.v[1]), tipo: limpio_(f.v[3]), area: limpio_(f.v[4]) }; });
  const codDe = nom => porNombre[sinTildes_(nom)] || '';
  const est = {}, nuevo = cod => est[cod] = est[cod] || Object.assign({ ultimo: '', retiros: {}, y1: {}, y3: {}, unidadY1: '', unidadY3: '', certs: {}, sitios: {}, origenApp: false }, info[cod]);
  // Manifiestos: Establecimiento · Sitio · Área · Fecha · Año · Mes · N.º · Corriente · Recipientes · Cantidad · Unidad · Origen
  const n = gm.getLastRow() - 5, vistos = {};
  if (n > 0) gm.getRange(6, 1, n, 12).getValues().forEach(r => {
    const cod = codDe(r[0]); if (!cod || !r[3]) return;
    const f = resFecha_(r[3]); if (!f) return;
    const e = nuevo(cod), sitio = limpio_(r[1]) || e.nombre, mes = f.slice(0, 7), cor = limpio_(r[7]);
    if (f > e.ultimo) e.ultimo = f;
    const s = e.sitios[sitio] = e.sitios[sitio] || { sitio: sitio, ultimo: '' }; if (f > s.ultimo) s.ultimo = f;
    if (mes < desde) return;
    if (/^app$/i.test(limpio_(r[11]))) e.origenApp = true;
    const k = cod + '|' + sitio + '|' + limpio_(r[6]) + '|' + f; if (!vistos[k]) { vistos[k] = 1; e.retiros[mes] = (e.retiros[mes] || 0) + 1; }
    const cant = Number(String(r[9]).replace(',', '.')) || 0, uni = limpio_(r[10]);
    if (cor === 'Y1') { e.y1[mes] = (e.y1[mes] || 0) + cant; if (uni) e.unidadY1 = uni; }
    if (cor === 'Y3') { e.y3[mes] = (e.y3[mes] || 0) + cant; if (uni) e.unidadY3 = uni; }
  });
  // Certificados: Establecimiento · Empresa · Año · Mes · N.º · Fecha de tratamiento
  const nc = gc ? gc.getLastRow() - 5 : 0;
  if (nc > 0) gc.getRange(6, 1, nc, 6).getValues().forEach(r => {
    const cod = codDe(r[0]), y = Number(r[2]), m = Number(r[3]); if (!cod || !y || !m) return;
    const mes = y + '-' + ('0' + m).slice(-2); if (mes < desde) return;
    nuevo(cod).certs[mes] = limpio_(r[4]) || 's/d';
  });
  // Frecuencia pactada por sitio (BASE COMÚN › SITIOS: CODIGO · SITIO · NOMBRE_OFICIAL · SISA · TIPO · EMPRESA · FRECUENCIA)
  const frec = {}; try { pTabla_(pBC_().getSheetByName('SITIOS'), 7).forEach(r => frec[limpio_(r.v[0]) + '|' + sinTildes_(r.v[1])] = limpio_(r.v[6])); } catch (e) {}
  let diag = {}; try { if (PropertiesService.getScriptProperties().getProperty('DIAG_RES_ID')) diag = pDiagLista_(); } catch (e) {}
  const L = Object.keys(est).map(cod => {
    const e = est[cod], ret = meses.filter(m => e.retiros[m]);
    e.dias = e.ultimo ? dias(e.ultimo) : null;
    e.sinCert = ret.filter(m => m < mesAct && !e.certs[m]).map(m => ({ mes: m, nivel: m === meses[10] ? 'wa' : 'er' }));
    e.sitios = Object.keys(e.sitios).map(k => { const s = e.sitios[k], fr = frec[cod + '|' + sinTildes_(s.sitio)] || '', lim = resLimiteDias_(fr), d = dias(s.ultimo);
      return { sitio: s.sitio, ultimo: s.ultimo, dias: d, frecuencia: fr || 's/d (revisar)', limite: lim, atrasado: d > lim }; }).sort((a, b) => b.dias - a.dias);
    e.activo = ret.length > 0;
    e.fotos = [];
    if (e.origenApp && typeof fotosPendientes_ === 'function') { try { e.fotos = fotosPendientes_(cod).filter(p => p.mes >= desde).map(p => ({ mes: p.mes, n: p.n, limite: p.limite, vencida: hoyISO > p.limite })); } catch (x) {} }
    const d = diag[cod]; e.diag = d ? { pct: d.PORCENTAJE, fecha: d.FECHA, estado: d.ESTADO, criticos: d.CRITICOS_NO_CUMPLE } : null;
    delete e.origenApp; return e;
  });
  // Establecimientos sin ninguna carga (para la lista completa)
  const sinCarga = Object.keys(info).filter(c => !est[c]).map(c => Object.assign({ diag: diag[c] ? { pct: diag[c].PORCENTAJE, fecha: diag[c].FECHA, estado: diag[c].ESTADO, criticos: diag[c].CRITICOS_NO_CUMPLE } : null }, info[c]));
  const act = L.filter(e => e.activo);
  const out = { ok: true, huella: huella, hoy: hoyISO, meses: meses, establecimientos: L.sort((a, b) => String(a.nombre).localeCompare(String(b.nombre))), sinCarga: sinCarga, libro: g.getUrl(),
    totales: { conCarga: act.length, total: Object.keys(info).length,
      retirosMes: act.reduce((a, e) => a + (e.retiros[mesAct] || 0), 0), retirosMesAnt: act.reduce((a, e) => a + (e.retiros[meses[10]] || 0), 0),
      mas10: act.filter(e => e.dias > 10).length, mas30: act.filter(e => e.dias > 30).length,
      sinCert: act.reduce((a, e) => a + e.sinCert.filter(s => s.nivel === 'er').length, 0), certPend: act.filter(e => e.sinCert.some(s => s.nivel === 'wa')).length,
      fotos: act.reduce((a, e) => a + e.fotos.reduce((b, f) => b + f.n, 0), 0), sitiosAtrasados: act.reduce((a, e) => a + e.sitios.filter(s => s.atrasado).length, 0),
      conDiag: Object.keys(diag).length },
    actualizado: new Date().toISOString() };
  if (typeof cachePut_ === 'function') cachePut_('res_tablero2', out, 3600); else try { cache.put('res_tablero', JSON.stringify(out), 600); } catch (e) {}   // comprimido y en trozos: el tablero pasa de 100 KB (14.50)
  return out;
}
