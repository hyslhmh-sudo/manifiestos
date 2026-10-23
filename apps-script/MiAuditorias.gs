/**
 * SISTEMA HyS · «MI ESTABLECIMIENTO» › AUDITORÍAS Y DIAGNÓSTICOS POR TEMA (versión 0, 23/10/2026)
 * Pedido de Belén (23/10/2026): en el perfil de cada establecimiento, todas las auditorías agrupadas por tema.
 * Junta, solo para leer, lo que ya está guardado en cada módulo (no copia datos ni crea hojas):
 *   1 · Residuos                    auditorías (DIAGNÓSTICO › AUDITORIAS y AUD_HALLAZGOS) y diagnóstico (DIAGNÓSTICO › DIAGNOSTICOS)
 *   2 · Agua                        diagnóstico (DIAGNÓSTICO DE AGUA › DIAGNOSTICOS)
 *   3 · Plagas                      diagnóstico (DIAGNÓSTICO DE PLAGAS › DIAGNOSTICOS)
 *   4 · Cocinas                     relevamiento BPM / HACCP (libro del módulo de cocinas › DIAGNOSTICOS)
 *   6 · Servicios e infraestructura relevamientos (M8 › RELEVAMIENTOS e INDICADORES)
 * Las recorridas (incendio, plagas preventiva) no entran: tienen su propia pantalla en cada módulo.
 * Quién ve qué (BASE COMÚN › ACCESOS › MODULOS):
 *   auditorías de residuos → «Auditoría» · diagnóstico de residuos → «Diagnóstico» · agua → «Agua» · plagas → «Plagas» ·
 *   cocinas → «Relevamiento de cocina» · infraestructura → solo la clave de Higiene y Seguridad (no hay módulo en ACCESOS).
 * Los enlaces a los informes (Docs y PDF) los ve solo Higiene y Seguridad; el resto ve el código del informe.
 * Se anula/corrige en cada módulo (portal o planilla), nunca acá. No escribe nada ni envía correos.
 * Si un módulo no está instalado o falla la lectura, ese tema aparece con el aviso y los demás siguen.
 * Acción: m_auditorias (Codigo.gs la atiende con los módulos de quien ingresó; no pide módulo propio en accPermite_).
 */

const MAUD_TEMAS = [
  { k: 'residuos', n: '1 · Residuos' }, { k: 'agua', n: '2 · Agua' }, { k: 'plagas', n: '3 · Plagas' },
  { k: 'cocina', n: '4 · Cocinas' }, { k: 'infra', n: '6 · Servicios e infraestructura' }
];
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

// Entrada: m_auditorias. acc: resultado de acceso_ (módulos de la persona)
function miAuditorias_(cod, acc) {
  const mods = (acc && acc.modulos) || [], tiene = m => !!(acc && acc.maestra) || mods.indexOf(m) >= 0, hys = !!(acc && acc.maestra);
  const ver = { aud: tiene('Auditoría'), diag: tiene('Diagnóstico'), agua: tiene('Agua'), plagas: tiene('Plagas'), cocina: tiene('Relevamiento de cocina'), infra: hys };
  const inf = maudInformes_(cod), temas = [];
  const leer = (k, fn) => { let L = null, error = ''; try { L = fn(); } catch (e) { error = 'No se pudo leer este tema (' + e.message + ').'; }
    const t = MAUD_TEMAS.find(x => x.k === k), lista = (L || []).sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));
    if (!hys) lista.forEach(i => { if (i.informe) i.informe = { codigo: i.informe.codigo, doc: '', pdf: '', estado: i.informe.estado }; });
    const ult = lista.find(i => i.pct !== '' && !/borrador|planificada|en curso/i.test(i.estado));
    temas.push({ k: k, nombre: t.n, instalado: L !== null || !!error, error: error, total: lista.length, items: lista.slice(0, MAUD_MAX),
      ultimo: ult ? { fecha: ult.fecha, pct: ult.pct, tipo: ult.tipo } : null,
      ncAbiertas: lista.reduce((s, i) => s + (Number(i.ncAbiertas) || 0), 0),
      soloLectura: k === 'agua' || k === 'plagas' || k === 'infra' }); };
  if (ver.aud || ver.diag) leer('residuos', () => maudResiduos_(cod, ver, inf));
  if (ver.agua) leer('agua', () => maudModulo_('agua', cod, inf));
  if (ver.plagas) leer('plagas', () => maudModulo_('plagas', cod, inf));
  if (ver.cocina) leer('cocina', () => maudCocina_(cod, inf));
  if (ver.infra) leer('infra', () => maudInfra_(cod));
  return { ok: true, est: cod, hoy: Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd'), hys: hys, temas: temas };
}

// Prueba desde el editor: muestra en el registro lo que vería Higiene y Seguridad en el HMH
function probarMiAuditorias() { const r = miAuditorias_('HMH', { maestra: true, modulos: ACC_MODULOS.slice() }); Logger.log(JSON.stringify(r.temas.map(t => ({ tema: t.nombre, total: t.total, error: t.error, ultimo: t.ultimo })))); }
