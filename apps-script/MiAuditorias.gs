/**
 * SISTEMA HyS · «MI ESTABLECIMIENTO» › AUDITORÍAS Y DIAGNÓSTICOS POR TEMA (versión 1, 23/10/2026)
 * Pedido de Belén (23/10/2026): en el perfil de cada establecimiento, todas las auditorías agrupadas por tema.
 * Junta, solo para leer, lo que ya está guardado en cada módulo (no copia datos ni crea hojas):
 *   1 · Residuos                    auditorías (DIAGNÓSTICO › AUDITORIAS y AUD_HALLAZGOS) y diagnóstico (DIAGNÓSTICO › DIAGNOSTICOS)
 *   2 · Agua                        diagnóstico (DIAGNÓSTICO DE AGUA › DIAGNOSTICOS)
 *   3 · Plagas                      diagnóstico (DIAGNÓSTICO DE PLAGAS › DIAGNOSTICOS)
 *   4 · Cocinas                     relevamiento BPM / HACCP (libro del módulo de cocinas › DIAGNOSTICOS)
 *   6 · Servicios e infraestructura relevamientos (M8 › RELEVAMIENTOS e INDICADORES)
 * Versión 1 (23/10/2026): se suma todo lo que la Res. SRT 905/2015 pone a cargo del Servicio de HyS y el sistema ya registra:
 *   2 · Agua                        análisis de agua, apta / NO APTA (BASE COMÚN › AGUA_ANALISIS) · Anexo I, ítem 12
 *   5 · Radiaciones                 controles mensuales de dosimetría y dosis a investigar (RADIACIONES › CONTROLES, INVESTIGACIONES) · Anexo II, ítems 5 y 6
 *   6 · Servicios e infraestructura RGRL (M8 · RGRL y mediciones › RGRL, RGRL_RESPUESTAS) · Anexo I, ítem 2 · Anexo II, ítem 1
 *                                   mediciones (› MEDICIONES: puesta a tierra, iluminación, ruido…) · Anexo II, ítems 5 y 6
 *   7 · Protección contra incendios recorridas de seguridad (› RECORRIDAS) y control mensual de extintores (› CONTROLES, por mes) · Anexo II, ítems 2.2 y 3.2
 *   8 · Personal y RAR              investigaciones de siniestros (LIBRO ACCIDENTES › INVESTIGACIONES y MEDIDAS) · Anexo II, ítem 12
 * Sin datos personales ni de salud: de las dosis y los siniestros solo salen período, número, método, estado y medidas.
 * Plagas no figura en la Res. SRT 905/2015: queda su diagnóstico, sin las recorridas preventivas.
 * Quién ve qué (BASE COMÚN › ACCESOS › MODULOS):
 *   auditorías de residuos → «Auditoría» · diagnóstico de residuos → «Diagnóstico» · agua → «Agua» · plagas → «Plagas» ·
 *   cocinas → «Relevamiento de cocina» · radiaciones → «Radiaciones» · incendio → «Incendio» · investigaciones de siniestros → «Accidentes» ·
 *   infraestructura, RGRL y mediciones → solo la clave de Higiene y Seguridad (no hay módulo en ACCESOS).
 * Los enlaces a los informes (Docs y PDF) los ve solo Higiene y Seguridad; el resto ve el código del informe.
 * Se anula/corrige en cada módulo (portal o planilla), nunca acá. No escribe nada ni envía correos.
 * Si un módulo no está instalado o falla la lectura, ese tema aparece con el aviso y los demás siguen.
 * Acción: m_auditorias (Codigo.gs la atiende con los módulos de quien ingresó; no pide módulo propio en accPermite_).
 */

const MAUD_TEMAS = [
  { k: 'residuos', n: '1 · Residuos' }, { k: 'agua', n: '2 · Agua' }, { k: 'plagas', n: '3 · Plagas' },
  { k: 'cocina', n: '4 · Cocinas' }, { k: 'radiaciones', n: '5 · Radiaciones ionizantes' }, { k: 'infra', n: '6 · Servicios e infraestructura' },
  { k: 'incendio', n: '7 · Protección contra incendios' }, { k: 'personal', n: '8 · Personal y RAR' }
];
const MAUD_CACHE_SEG = 300;   // la respuesta se guarda 5 minutos por establecimiento y permisos; «Actualizar» la lee de nuevo
const MAUD_MAX = 30;   // por tema, los más nuevos

// Porcentaje en número de 0 a 100 (diagnósticos: 85; auditorías: «85 %»; M8 puede traer 0,85 → fraccion = true); vacío si no hay dato
function maudPct_(v, fraccion) {
  if (v === '' || v == null) return '';
  let n = typeof v === 'number' ? v : Number(String(v).replace('%', '').replace(',', '.').trim());
  if (!isFinite(n)) return '';
  if (fraccion && n > 0 && n <= 1) n = n * 100;
  return Math.round(n * 10) / 10;
}
const maudF_ = v => v instanceof Date ? Utilities.formatDate(v, TZ, 'yyyy-MM-dd') : limpio_(v).slice(0, 10);
const maudN_ = v => { const n = Number(v); return isFinite(n) && String(v) !== '' ? n : ''; };

// Informes del registro de documentos del establecimiento: por ID del diagnóstico y por código
function maudInformes_(cod) {
  const por = { diag: {}, cod: {} };
  try { (docRegistro_({ est: cod }).filas || []).forEach(f => { if (f.v[14] === 'Anulado') return;
    const o = { codigo: limpio_(f.v[0]), doc: limpio_(f.v[12]), pdf: limpio_(f.v[13]), estado: limpio_(f.v[14]) };
    if (f.v[11]) por.diag[limpio_(f.v[11])] = o; por.cod[o.codigo] = o; }); } catch (e) {}
  return por;
}

// Diagnóstico (residuos, agua, plagas, cocina: todos usan las columnas de DIAG_H_DIAG)
function maudDiag_(o, tipo, inf, abrir) {
  const i = inf.diag[limpio_(o.ID_DIAG)] || null;
  return { id: limpio_(o.ID_DIAG), clase: 'diag', tipo: tipo + (o.MODALIDAD ? ' · ' + limpio_(o.MODALIDAD) : ''), fecha: maudF_(o.FECHA), estado: limpio_(o.ESTADO) || 's/d',
    pct: maudPct_(o.PORCENTAJE), criticos: maudN_(o.CRITICOS_NO_CUMPLE), puntos: maudN_(o.PUNTOS_EVALUADOS), lugar: o.ALCANCE ? limpio_(o.ALCANCE) : '',
    quien: [limpio_(o.RELEVADO_POR), o.ENTREVISTADO ? 'entrevistado: ' + limpio_(o.ENTREVISTADO) : ''].filter(Boolean).join(' · '), obs: limpio_(o.OBSERVACIONES),
    informe: i, abrir: abrir && o.ESTADO === 'Borrador' ? abrir : '' };
}

function maudResiduos_(cod, ver, inf) {
  const out = [];
  if (ver.aud) {
    const H = {}; audLeer_(audHojaH_(), AUD_HA_H).filter(h => h.ESTABLECIMIENTO === cod).forEach(h => {
      const a = H[h.ID_AUD] = H[h.ID_AUD] || { abiertas: 0, mayores: 0 };
      if (/^no conformidad/i.test(h.CLASIFICACION) && !/cumplid|descartad|cerrad/i.test(h.ESTADO)) { a.abiertas++; if (/mayor/i.test(h.CLASIFICACION)) a.mayores++; } });
    audLeer_(audHojaA_(), AUD_H).filter(a => a.ESTABLECIMIENTO === cod).forEach(a => {
      const h = H[a.ID_AUD] || { abiertas: 0, mayores: 0 }, i = a.CODIGO_INFORME ? inf.cod[a.CODIGO_INFORME] || { codigo: a.CODIGO_INFORME, doc: '', pdf: '', estado: '' } : null;
      const propia = a.ORIGEN === 'Referente' && !/para verificar|cerrada|hallazgos/i.test(a.ESTADO);
      out.push({ id: a.ID_AUD, clase: 'aud', tipo: 'Auditoría ' + (a.TIPO || '').replace(/^\w/, c => c.toLowerCase()) + (a.MODALIDAD ? ' · ' + a.MODALIDAD : ''), fecha: a.FECHA || a.CREADA, estado: a.ESTADO || 's/d',
        pct: maudPct_(a.CUMPLIMIENTO), criticos: maudN_(a.NC_MAYOR), ncMenor: maudN_(a.NC_MENOR), puntos: maudN_(a.PUNTOS), respondidos: maudN_(a.RESPONDIDOS),
        lugar: (a.LUGARES || '').split(' | ').filter(Boolean).join(', '), quien: [a.AUDITOR, a.AUDITADOS ? 'auditados: ' + a.AUDITADOS : ''].filter(Boolean).join(' · '),
        obs: [a.RESULTADO, a.OBSERVACIONES].filter(Boolean).join(' · '), ncAbiertas: h.abiertas, ncMayoresAbiertas: h.mayores, informe: i, abrir: propia ? 'aud' : '' });
    });
  }
  if (ver.diag) pTabla_(pDG_().getSheetByName('DIAGNOSTICOS'), DIAG_H_DIAG.length).forEach(r => {
    const o = {}; DIAG_H_DIAG.forEach((h, j) => o[h] = r.v[j] instanceof Date ? pFecha_(r.v[j]) : r.v[j]);
    if (limpio_(o.CODIGO) === cod && o.ESTADO !== 'Anulado') out.push(maudDiag_(o, 'Diagnóstico', inf, 'diag'));
  });
  return out;
}
function maudModulo_(m, cod, inf) {   // agua y plagas (DiagModulos.gs): los relevamientos los hace Higiene y Seguridad desde el portal
  if (!dgmInstalado_(m)) return null;
  return dgmDiagLeer_(m).filter(o => limpio_(o.CODIGO) === cod && o.ESTADO !== 'Anulado').map(o => maudDiag_(o, 'Diagnóstico', inf, ''));
}
function maudCocina_(cod, inf) {
  if (!PropertiesService.getScriptProperties().getProperty('DIAG_COC_ID')) return null;
  return cocDiagLeer_().filter(o => limpio_(o.CODIGO) === cod && o.ESTADO !== 'Anulado').map(o => maudDiag_(o, 'Relevamiento de cocina', inf, 'cocina'));
}
function maudInfra_(cod) {   // M8: filas desde la 2; RELEVAMIENTOS ID · FECHA · TIPO · SERVICIO · EST · NOMBRE · RELEVO · ACOMPAÑÓ · OBS · INFORME
  const ss = SpreadsheetApp.openById(GES.M8_ID), rv = ss.getSheetByName('RELEVAMIENTOS'), ind = ss.getSheetByName('INDICADORES');
  if (!rv || rv.getLastRow() < 2) return [];
  const I = {}; if (ind && ind.getLastRow() > 1) ind.getRange(2, 1, ind.getLastRow() - 1, 12).getValues().forEach(r => { if (r[0]) I[r[0]] = r; });
  const S = {}; try { const sv = ss.getSheetByName('SERVICIOS'); if (sv && sv.getLastRow() > 1) sv.getRange(2, 1, sv.getLastRow() - 1, 4).getDisplayValues().forEach(r => { if (r[0]) S[r[0]] = [r[3], r[2] && r[2] !== 's/d' ? r[2] : ''].filter(Boolean).join(' · '); }); } catch (e) {}
  return rv.getRange(2, 1, rv.getLastRow() - 1, 10).getValues().filter(r => r[0] && limpio_(r[4]) === cod).map(r => {
    const x = I[r[0]] || [];
    return { id: limpio_(r[0]), clase: 'infra', tipo: limpio_(r[2]) || 'Relevamiento', fecha: maudF_(r[1]), estado: x[11] ? 'Semáforo: ' + limpio_(x[11]) : 'Cargado',
      pct: maudPct_(x[6], true), criticos: maudN_(x[7]), puntos: maudN_(x[5]), lugar: S[r[3]] || limpio_(r[3]), quien: [limpio_(r[6]), r[7] && r[7] !== 's/d' ? 'acompañó: ' + limpio_(r[7]) : ''].filter(Boolean).join(' · '),
      obs: limpio_(r[8]), informe: r[9] ? { codigo: '', doc: limpio_(r[9]), pdf: '', estado: '' } : null, abrir: '' };
  });
}

// ------------------------------------------------------------------ Versión 1: lo demás que la Res. SRT 905/2015 pone a cargo de HyS
const maudProp_ = k => !!PropertiesService.getScriptProperties().getProperty(k);
const maudMes_ = iso => { const m = /^(\d{4})-(\d{2})/.exec(iso || ''); return m ? ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'][Number(m[2]) - 1] + ' ' + m[1] : iso; };
const maudItem_ = o => Object.assign({ id: '', clase: 'reg', tipo: '', fecha: '', estado: 's/d', pct: '', criticos: '', puntos: '', lugar: '', quien: '', obs: '', informe: null, abrir: '', res: null, extra: [] }, o);

// 2 · Agua: cada análisis con su resultado (los evalúa HyS: Res. SRT 905/2015, Anexo I, ítem 12)
function maudAguaAnalisis_(cod) {
  return miLeer_('AGUA_ANALISIS').filter(a => limpio_(a.ESTABLECIMIENTO) === cod && regVivo_(a)).map(a => {
    const r = limpio_(a.RESULTADO), no = /no apta/i.test(r), pend = !r || /pendiente/i.test(r);
    return maudItem_({ id: limpio_(a.ID), tipo: 'Análisis de agua · ' + (limpio_(a.TIPO) || 's/d'), fecha: maudF_(a.FECHA_TOMA), estado: pend ? 'Resultado pendiente' : no ? (a.ESTADO_ACCION === 'Abierta' ? 'NO APTA · acción abierta' : 'NO APTA · acción cerrada') : 'Cerrado',
      res: { t: pend ? 'Pendiente' : no ? 'NO APTA' : r || 'Apta', n: pend ? 'wa' : no ? 'er' : 'ok' }, lugar: limpio_(a.CODIGO_PUNTO), quien: limpio_(a.LABORATORIO), obs: limpio_(a.OBSERVACIONES),
      extra: [['Motivo', limpio_(a.MOTIVO)], ['Cloro (ppm)', limpio_(a.CLORO_PPM)], ['Fecha del resultado', maudF_(a.FECHA_RESULTADO)]] });
  });
}
// 5 · Radiaciones: controles mensuales y dosis a investigar, sin nombres ni DNI (Anexo II, ítems 5 y 6)
function maudRadiaciones_(cod) {
  if (!maudProp_(RAD.P_LIBRO)) return null;
  const C = radLeer_('CONTROLES', RAD.H_CON).filter(c => limpio_(c.ESTABLECIMIENTO) === cod && c.ESTADO !== 'Anulado').map(c => {
    const an = c.CON_ANORMALES === 'Sí', per = limpio_(c.PERIODO);
    return maudItem_({ id: limpio_(c.ID), tipo: 'Control mensual de dosimetría', fecha: /^\d{4}-\d{2}$/.test(per) ? per + '-01' : maudF_(c.FECHA_RECEPCION), estado: limpio_(c.ESTADO) || 'Vigente',
      res: { t: an ? 'Valores anormales' : 'Sin anormales', n: an ? 'er' : 'ok' }, lugar: limpio_(c.SITIO), quien: limpio_(c.PROVEEDOR), obs: limpio_(c.OBSERVACIONES), extra: [['Período', per]] });
  });
  let I = []; try { I = radInvLeer_(); } catch (e) {}
  I.filter(i => i.ESTABLECIMIENTO === cod && i.ESTADO !== 'Anulado').forEach(i => C.push(maudItem_({ id: limpio_(i.ID), tipo: 'Dosis a investigar', fecha: maudF_(i.FECHA_DETECCION), estado: limpio_(i.ESTADO) || 'Abierto',
    res: { t: limpio_(i.ESTADO) || 'Abierto', n: /cerrad/i.test(i.ESTADO) ? 'ok' : 'wa' }, lugar: limpio_(i.SITIO), obs: limpio_(i.CONCLUSION),
    extra: [['Período', limpio_(i.PERIODO)], ['Motivo', limpio_(i.MOTIVO) || limpio_(i.OBSERVACION_PROVEEDOR)], ['Causa probable', limpio_(i.CAUSA_PROBABLE)], ['Medidas', limpio_(i.MEDIDAS)], ['Fecha de cierre', maudF_(i.FECHA_CIERRE)]] })));
  return C;
}
// 6 · RGRL (Anexo I, ítem 2) y mediciones (Anexo II, ítems 5 y 6). El libro se lee solo si ya existe (rgrlLibro_ lo crearía)
function maudRgrl_(cod) {
  if (!maudProp_(RGRL.P_LIBRO)) return [];
  const R = {}; rgrlLeer_('RGRL_RESPUESTAS', RGRL.H_RESP).filter(o => o.ESTABLECIMIENTO === cod && o.RESPUESTA).forEach(o => (R[o.ID_RGRL] = R[o.ID_RGRL] || []).push(o));
  const out = rgrlLeer_('RGRL', RGRL.H_REL).filter(r => r.ESTABLECIMIENTO === cod).map(r => {
    const L = R[r.ID] || [], si = L.filter(o => o.RESPUESTA === 'Sí').length, no = L.filter(o => o.RESPUESTA === 'No').length, d = rgrlDias_(r.VENCE);
    return maudItem_({ id: r.ID, clase: 'rgrl', tipo: 'RGRL (Res. SRT 463/09)', fecha: r.FECHA, estado: (r.ESTADO || 's/d') + (d != null && d < 0 ? ' · vencido' : ''), pct: si + no ? maudPct_(100 * si / (si + no)) : '',
      criticos: no, puntos: L.length, lugar: r.LUGAR, quien: r.RESPONSABLE, obs: r.OBSERVACIONES, informe: r.ARCHIVO ? { codigo: '', doc: r.ARCHIVO, pdf: '', estado: '' } : null,
      extra: [['Vence', r.VENCE], ['Condiciones en «No» con fecha de regularización vencida', String(L.filter(o => o.RESPUESTA === 'No' && o.FECHA_REGULARIZACION && o.FECHA_REGULARIZACION < rgrlHoy_()).length)]] });
  });
  rgrlLeer_('MEDICIONES', RGRL.H_MED).filter(m => m.ESTABLECIMIENTO === cod && m.ESTADO !== 'Anulada').forEach(m => {
    const v = m.ESTADO === 'Vigente' ? rgrlEstadoVto_(m.VENCE) : '', nc = /no cumple/i.test(m.RESULTADO);
    out.push(maudItem_({ id: m.ID, clase: 'med', tipo: 'Medición · ' + (m.TIPO || 's/d'), fecha: m.FECHA_MEDICION, estado: (m.ESTADO || 's/d') + (v === 'vencida' ? ' · vencida' : v === 'porvencer' ? ' · vence pronto' : ''),
      res: { t: v === 'vencida' ? 'Vencida' : m.RESULTADO || 's/d', n: nc || v === 'vencida' ? 'er' : /observ/i.test(m.RESULTADO) || v === 'porvencer' ? 'wa' : /cumple/i.test(m.RESULTADO) ? 'ok' : 'gr' },
      lugar: m.LUGAR, quien: m.PROFESIONAL, obs: m.OBSERVACIONES, informe: m.ARCHIVO ? { codigo: '', doc: m.ARCHIVO, pdf: '', estado: '' } : null, extra: [['Norma', m.NORMA], ['Vence', m.VENCE]] }));
  });
  return out;
}
// 7 · Recorridas de seguridad y control mensual de extintores (Anexo II, ítems 2.2 y 3.2)
function maudIncendio_(cod) {
  if (!maudProp_(INC.P_LIBRO)) return null;
  const out = incSrvLeer_('RECORRIDAS', INC_SRV.H_REC).filter(r => limpio_(r.ESTABLECIMIENTO) === cod).map(r => {
    const con = /con novedad/i.test(r.RESULTADO);
    return maudItem_({ id: limpio_(r.ID), tipo: 'Recorrida de seguridad', fecha: maudF_(r.FECHA), estado: limpio_(r.RESULTADO) || 's/d', res: { t: con ? 'Con novedades' : 'Sin novedades', n: con ? 'wa' : 'ok' },
      lugar: limpio_(r.SECTOR), quien: limpio_(r.QUIEN), obs: limpio_(r.OBSERVACIONES), extra: [['Puntos en «No»', limpio_(r.PUNTOS_NO)]] });
  });
  const E = incLeer_('EXTINTORES', INC.H_EXT).filter(e => limpio_(e.ESTABLECIMIENTO) === cod && !/baja/i.test(e.ESTADO || '')), activos = E.length, M = {};
  incLeer_('CONTROLES', INC.H_CON).filter(c => limpio_(c.ESTABLECIMIENTO) === cod && c.ESTADO !== 'Anulado' && /^\d{4}-\d{2}/.test(maudF_(c.FECHA))).forEach(c => {
    const k = maudF_(c.FECHA).slice(0, 7), m = M[k] = M[k] || { ext: {}, prob: {}, quien: {} };
    m.ext[c.ID_EXTINTOR] = true; if (limpio_(c.PROBLEMAS) || /problema|no ok|falla/i.test(c.RESULTADO || '')) m.prob[c.ID_EXTINTOR] = true; if (c.QUIEN) m.quien[limpio_(c.QUIEN)] = true; });
  Object.keys(M).forEach(k => { const m = M[k], n = Object.keys(m.ext).length, p = Object.keys(m.prob).length;
    out.push(maudItem_({ id: 'EXT-' + cod + '-' + k, clase: 'ext', tipo: 'Control mensual de extintores', fecha: k + '-01', estado: maudMes_(k) + ' · ' + n + ' de ' + activos + ' controlados',
      pct: activos ? maudPct_(Math.min(100, 100 * n / activos)) : '', criticos: p, puntos: n, quien: Object.keys(m.quien).join(', '), lugar: activos + ' extintores activos hoy' })); });
  return out;
}
// 8 · Investigaciones de siniestros (Anexo II, ítem 12): número, método, estado y medidas; sin datos de salud ni de la persona
function maudInvestigaciones_(cod) {
  const ss = typeof accLibro_ === 'function' ? accLibro_() : null; if (!ss || !ss.getSheetByName(INV.HOJA)) return null;
  const Md = {}; accLeer_(ss.getSheetByName(INV.MEDIDAS)).filter(m => m.ESTADO !== 'Anulada').forEach(m => { const x = Md[m.ID_INV] = Md[m.ID_INV] || { n: 0, ver: 0 }; x.n++; if (limpio_(m.VERIFICADA) || /verificad|eficaz/i.test(m.ESTADO)) x.ver++; });
  return accLeer_(ss.getSheetByName(INV.HOJA)).filter(i => limpio_(i.ESTABLECIMIENTO) === cod && i.ESTADO !== 'Anulada').map(i => {
    const x = Md[i.ID] || { n: 0, ver: 0 }, cerr = /cerrad/i.test(i.ESTADO);
    return maudItem_({ id: limpio_(i.ID), clase: 'inv', tipo: 'Investigación de siniestro · ' + (limpio_(i.METODO) || 's/d'), fecha: maudF_(i.FECHA_INICIO), estado: limpio_(i.ESTADO) || 'En curso',
      res: { t: cerr ? 'Cerrada' : 'En curso', n: cerr ? 'ok' : 'wa' }, pct: x.n ? maudPct_(100 * x.ver / x.n) : '', puntos: x.n, quien: limpio_(i.INVESTIGO),
      extra: [['Siniestro N.º', limpio_(i.NRO_SINIESTRO)], ['Motivo del método', limpio_(i.MOTIVO)], ['Medidas verificadas', x.ver + ' de ' + x.n], ['Fecha de cierre', maudF_(i.FECHA_CIERRE)], ['Nota a la Dirección', limpio_(i.NOTA_CODIGO)]] });
  });
}

// Entrada: m_auditorias. acc: resultado de acceso_ (módulos de la persona)
function miAuditorias_(cod, acc, fresco) {
  const mods = (acc && acc.modulos) || [], tiene = m => !!(acc && acc.maestra) || mods.indexOf(m) >= 0, hys = !!(acc && acc.maestra);
  const ver = { aud: tiene('Auditoría'), diag: tiene('Diagnóstico'), agua: tiene('Agua'), plagas: tiene('Plagas'), cocina: tiene('Relevamiento de cocina'),
    radiaciones: tiene('Radiaciones'), infra: hys, incendio: tiene('Incendio'), personal: tiene('Accidentes') };
  const ck = 'maud|' + cod + '|' + Object.keys(ver).filter(k => ver[k]).join(',') + '|' + (hys ? 'h' : '');
  if (!fresco) try { const c = CacheService.getScriptCache().get(ck); if (c) return JSON.parse(c); } catch (e) {}
  const inf = maudInformes_(cod), temas = [];
  const leer = (k, fn) => { let L = null, error = ''; try { L = fn(); } catch (e) { error = 'No se pudo leer este tema (' + e.message + ').'; }
    const t = MAUD_TEMAS.find(x => x.k === k), lista = (L || []).sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));
    if (!hys) lista.forEach(i => { if (i.informe) i.informe = { codigo: i.informe.codigo, doc: '', pdf: '', estado: i.informe.estado }; });
    const ult = lista.find(i => i.pct !== '' && !/borrador|planificada|en curso/i.test(i.estado));
    temas.push({ k: k, nombre: t.n, instalado: L !== null || !!error, error: error, total: lista.length, items: lista.slice(0, MAUD_MAX),
      ultimo: ult ? { fecha: ult.fecha, pct: ult.pct, tipo: ult.tipo } : null,
      ncAbiertas: lista.reduce((s, i) => s + (Number(i.ncAbiertas) || 0), 0),
      soloLectura: ['agua', 'plagas', 'radiaciones', 'infra', 'personal'].indexOf(k) >= 0 }); };
  const junta = (...fs) => { let algo = false; const out = []; fs.forEach(f => { const L = f(); if (L) { algo = true; L.forEach(x => out.push(x)); } }); return algo ? out : null; };
  if (ver.aud || ver.diag) leer('residuos', () => maudResiduos_(cod, ver, inf));
  if (ver.agua) leer('agua', () => junta(() => maudModulo_('agua', cod, inf), () => maudAguaAnalisis_(cod)));
  if (ver.plagas) leer('plagas', () => maudModulo_('plagas', cod, inf));
  if (ver.cocina) leer('cocina', () => maudCocina_(cod, inf));
  if (ver.radiaciones) leer('radiaciones', () => maudRadiaciones_(cod));
  if (ver.infra) leer('infra', () => maudInfra_(cod).concat(maudRgrl_(cod)));
  if (ver.incendio) leer('incendio', () => maudIncendio_(cod));
  if (ver.personal) leer('personal', () => maudInvestigaciones_(cod));
  const r = { ok: true, est: cod, hoy: Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd'), hys: hys, temas: temas };
  try { const j = JSON.stringify(r); if (j.length < 95000) CacheService.getScriptCache().put(ck, j, MAUD_CACHE_SEG); } catch (e) {}
  return r;
}

// Prueba desde el editor: muestra en el registro lo que vería Higiene y Seguridad en el HMH
function probarMiAuditorias() { const r = miAuditorias_('HMH', { maestra: true, modulos: ACC_MODULOS.slice() }, true); Logger.log(JSON.stringify(r.temas.map(t => ({ tema: t.nombre, total: t.total, error: t.error, ultimo: t.ultimo })))); }
