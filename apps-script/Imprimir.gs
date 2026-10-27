/**
 * SISTEMA HyS · HOJAS PARA IMPRIMIR (Imprimir.gs) · versión 0 (23/10/2026) · formularios: solo el código (sin «v0», sin etiqueta ni fecha de generación) (27/10/2026)
 * Pedido de Belén (23/10/2026): que todas las auditorías, inspecciones y relevamientos se puedan imprimir
 *   1) EN BLANCO, para completarlos en papel (armados según el tipo de establecimiento, sus lugares y sus servicios), y
 *   2) COMPLETADOS, desde «Mi establecimiento» y desde el Portal HyS.
 * La hoja completada en papel vuelve al sistema así: quien la hizo transcribe las respuestas en su pantalla de siempre y,
 * acá, adjunta la foto (hasta 5) o el PDF de la hoja firmada. Queda en BASE COMÚN › HOJAS_FIRMADAS y en la carpeta del
 * establecimiento › «Hojas firmadas» › tema.
 *
 * Temas (cada uno lee lo que ya guarda su módulo; no copia datos ni cambia nada de los módulos):
 *   res_aud     1 · Residuos · auditorías (Auditoria.gs)          módulo de ACCESOS «Auditoría»
 *   res_diag    1 · Residuos · diagnóstico (Diag.gs)              «Diagnóstico»
 *   agua        2 · Agua · diagnóstico (DiagModulos.gs)           «Agua»
 *   plagas      3 · Plagas · diagnóstico (DiagModulos.gs)         «Plagas»
 *   plg_rec     3 · Plagas · recorrida preventiva (F-PLG-04)      «Plagas»   (en blanco: el formulario oficial de la carpeta de formularios)
 *   cocina      4 · Cocinas · relevamiento BPM / HACCP (Modulo6)  «Relevamiento de cocina»
 *   infra       6 · Servicios e infraestructura (planilla M8)     solo Higiene y Seguridad
 *   rgrl        6 · RGRL, Res. SRT 463/09 (Rgrl.gs)               solo Higiene y Seguridad
 *   extintores  7 · Incendio · control mensual de extintores      «Incendio»
 *   inc_rec     7 · Incendio · recorrida de seguridad             «Incendio»
 * Cada hoja lleva: encabezado institucional (HZT/HMH en azules; el resto, con los colores de la Secretaría de Salud), marco
 * normativo, la ayuda y la referencia normativa de cada punto, recuadros de firma y, al pie, el logo de HySL.
 * Se imprime desde el navegador (Imprimir o Guardar como PDF): no crea Docs ni PDF en Drive. No envía correos.
 * Entradas: «Mi establecimiento» › acción m_imprimir (Codigo.gs) · Portal HyS › acciones p_imp_… (Portal.gs, default).
 * Normativa de las competencias de HySL: Ley 19.587, Dto. 351/79 y Res. SRT 905/2015.
 */

const IMP = {
  LOGO_PIE: '1DnztPPclcsCNA23DDlAF-90Uchf6QdzN',       // logo de HySL («Hospitales más seguros para las personas»)
  LOGO_HZT: '1T4r3P94oXwq-JDz6QOg3fSoEm_FMUBzp',       // logo institucional HMH + HZT (encabezado de la red Trelew; 25/10/2026, antes iba el de HySL)
  AZULES: ['HZT', 'HMH'],                               // paleta azul; el resto, naranja (Secretaría de Salud)
  MAX: 40,                                              // completados por tema en la lista (los más nuevos)
  H_FIR: ['ID', 'FECHA', 'ESTABLECIMIENTO', 'TEMA', 'ID_REGISTRO', 'DETALLE', 'ARCHIVO', 'CARGO', 'CARGADO', 'ESTADO', 'OBSERVACIONES'],
  COMPETENCIAS: 'Competencias de Higiene y Seguridad Laboral: Ley 19.587, Dto. 351/79 y Res. SRT 905/2015.'
};
const IMP_TEMAS = [
  { k: 'res_aud', n: '1 · Residuos · Auditorías', mod: 'Auditoría', normas: 'Ley XI N.º 35 (Código Ambiental del Chubut, Título VII) y Ley 24.051 (adhesión, art. 66).' },
  { k: 'res_diag', n: '1 · Residuos · Diagnóstico', mod: 'Diagnóstico', normas: 'Ley XI N.º 35 (Código Ambiental del Chubut, Título VII) y Ley 24.051 (adhesión, art. 66).' },
  { k: 'agua', n: '2 · Agua · Diagnóstico', mod: 'Agua', normas: 'Dto. 351/79, arts. 57 y 58; Res. MTSS 523/95; Ley 18.284 (Código Alimentario Argentino), art. 982.' },
  { k: 'plagas', n: '3 · Plagas · Diagnóstico', mod: 'Plagas', normas: 'Cada punto indica su referencia normativa.' },
  { k: 'plg_rec', n: '3 · Plagas · Recorrida preventiva', mod: 'Plagas', normas: 'Formulario F-PLG-04.' },
  { k: 'cocina', n: '4 · Cocinas · Relevamiento BPM / HACCP', mod: 'Relevamiento de cocina', normas: 'Ley 18.284 (Código Alimentario Argentino) y Res. GMC 80/96 (CAA, capítulo II).' },
  { k: 'rad_form', n: '5 · Radiaciones · Formularios del dosímetro (alta, baja y novedad)', mod: 'Radiaciones', normas: 'Ley 17.557 y Dto. 6320/68; Ley 19.587 y Dto. 351/79.' },   // RadFormularios.gs (25/10/2026)
  { k: 'infra', n: '6 · Servicios e infraestructura · Relevamiento', mod: '', normas: 'Res. SRT 463/09 (RGRL) y Directrices de Organización y Funcionamiento de los Servicios de Salud (planta física, instalaciones y equipamiento de seguridad).' },
  { k: 'rgrl', n: '6 · RGRL · Relevamiento General de Riesgos Laborales', mod: '', normas: 'Res. SRT 463/09, Anexo I (formulario A); Ley 19.587 y Dto. 351/79.' },
  { k: 'extintores', n: '7 · Incendio · Control mensual de extintores', mod: 'Incendio', normas: 'Ley 19.587; Dto. 351/79, cap. 18 (protección contra incendios) y Anexo VII.' },
  { k: 'inc_rec', n: '7 · Incendio · Recorrida de seguridad', mod: 'Incendio', normas: 'Ley 19.587; Dto. 351/79, cap. 18 (medios de escape, señalización, extintores, instalaciones fijas, detección y alarma).' }
];
const impTema_ = k => IMP_TEMAS.find(t => t.k === k) || null;
const impVe_ = (acc, t) => !!t && (!!(acc && acc.maestra) || (!!t.mod && !!acc && (acc.modulos || []).indexOf(t.mod) >= 0));

// ------------------------------------------------------------------ Utilidades
const impE_ = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const impF_ = v => v instanceof Date ? Utilities.formatDate(v, TZ, 'yyyy-MM-dd') : limpio_(v).slice(0, 10);
const impFTxt_ = v => { const s = impF_(v); return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s.slice(8, 10) + '/' + s.slice(5, 7) + '/' + s.slice(0, 4) : (s || ''); };
const impHoy_ = () => Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd');
const impMes_ = ym => { const m = /^(\d{4})-(\d{2})$/.exec(ym || ''); return m ? MESES_TXT[Number(m[2]) - 1] + ' de ' + m[1] : ym; };
function impNombreEst_(cod) { try { const E = est_(cod); if (E && E.nombre) return String(E.nombre); } catch (e) {} try { const f = pEstablecimientos_().filas.find(x => limpio_(x.v[0]) === cod); if (f) return limpio_(f.v[1]); } catch (e) {} return cod; }
// Imagen de Drive como dataURL (se guarda 6 horas en la caché)
function impImg_(id) {
  const k = 'imp_img_' + id, c = typeof cacheGet_ === 'function' ? cacheGet_(k) : null; if (c) return c;
  try { const b = DriveApp.getFileById(id).getBlob(), u = 'data:' + (b.getContentType() || 'image/png') + ';base64,' + Utilities.base64Encode(b.getBytes()); if (typeof cachePut_ === 'function') cachePut_(k, u, 21600); return u; } catch (e) { return ''; }
}

// ------------------------------------------------------------------ Hojas firmadas (BASE COMÚN › HOJAS_FIRMADAS)
function impHojaFir_() {
  const bc = pBC_(); let sh = bc.getSheetByName('HOJAS_FIRMADAS');
  if (!sh) {
    sh = bc.insertSheet('HOJAS_FIRMADAS');
    encabezar_(sh, 'Hojas firmadas (auditorías, diagnósticos y relevamientos completados en papel)', 'Una fila por hoja firmada que se adjunta desde «Mi establecimiento» o el Portal HyS › Hojas para imprimir. Las respuestas se transcriben en cada módulo; acá queda la foto o el PDF de la hoja. Para anular: ESTADO = Anulada (no borrar filas).', IMP.H_FIR,
      ['Lo pone el sistema.', 'Fecha de carga.', 'Código del establecimiento.', 'Tema (res_aud, res_diag, agua, plagas, plg_rec, cocina, infra, rgrl, extintores, inc_rec).', 'ID de la auditoría, diagnóstico o relevamiento.', 'Qué es.', 'Enlace a la foto, la carpeta de fotos o el PDF.', 'Quién la adjuntó.', 'Lo pone el sistema.', 'Vigente · Anulada', '']);
    lista_(sh, 9, 2000, ['Vigente', 'Anulada']);
  }
  return sh;
}
function impFirmadas_(cod) {
  const sh = pBC_().getSheetByName('HOJAS_FIRMADAS'), m = {}; if (!sh) return m;
  pTabla_(sh, IMP.H_FIR.length).forEach(r => { if (limpio_(r.v[2]) !== cod || /anulad/i.test(limpio_(r.v[9]))) return;
    m[limpio_(r.v[3]) + '|' + limpio_(r.v[4])] = { url: limpio_(r.v[6]), fecha: impF_(r.v[1]), quien: limpio_(r.v[7]) }; });
  return m;
}
function impFirmada_(cod, acc, x, quien) {
  const t = impTema_(x.tema); if (!impVe_(acc, t)) return { ok: false, error: 'permiso', mensaje: 'No tenés asignado este tema.' };
  const id = limpio_(x.id); if (!id) return { ok: false, mensaje: 'Falta la auditoría o el relevamiento.' };
  const a = x.archivo; if (!a || !(a.base64 || a.dataUrl)) return { ok: false, mensaje: 'Falta la foto o el PDF de la hoja firmada.' };
  const o = impOpcTema_(t.k, cod, acc); if (!o || !(o.hechas || []).some(h => h.id === id)) return { ok: false, mensaje: 'No encontré esa auditoría o relevamiento en este establecimiento.' };
  let raiz = null; try { const E0 = est_(cod); if (E0 && E0.carpeta) raiz = DriveApp.getFolderById(E0.carpeta); } catch (e) {}
  raiz = raiz || audCarpetaEst_(cod) || (typeof miGrupo_ === 'function' ? audCarpetaEst_(miGrupo_(cod).dueno) : null); if (!raiz) return { ok: false, mensaje: 'El establecimiento no tiene carpeta en ESTABLECIMIENTOS › CARPETA. Avisá a Higiene y Seguridad.' };
  const dir = carpeta_(carpeta_(raiz, 'Hojas firmadas'), t.n.replace(/[^\w\-.áéíóúñÁÉÍÓÚÑ ·]/g, '_'));
  const url = guardarFotos_(dir, (id + ' - hoja firmada').replace(/[^\w\-.áéíóúñÁÉÍÓÚÑ ]/g, '_'), a); if (!url) return { ok: false, mensaje: 'El archivo no es una foto ni un PDF válido.' };
  return conLock_(() => impFirmadaFila_(cod, t, id, url, x, quien));
}
function impFirmadaFila_(cod, t, id, url, x, quien) {
  const sh = impHojaFir_(), previas = pTabla_(sh, IMP.H_FIR.length).filter(r => limpio_(r.v[2]) === cod && limpio_(r.v[3]) === t.k && limpio_(r.v[4]) === id && !/anulad/i.test(limpio_(r.v[9])));
  previas.forEach(r => sh.getRange(r.fila, 10, 1, 2).setValues([['Anulada', 'Reemplazada por una hoja nueva el ' + impFTxt_(impHoy_())]]));   // la nueva reemplaza a la anterior
  const n = pTabla_(sh, 1).length + 1, fid = 'HF-' + cod + '-' + impHoy_().slice(0, 4) + '-' + ('000' + n).slice(-4);
  sh.getRange(Math.max(sh.getLastRow(), 5) + 1, 1, 1, IMP.H_FIR.length).setValues([[fid, new Date(), cod, t.k, id, t.n + (x.detalle ? ' · ' + limpio_(x.detalle) : ''), url, limpio_(quien) || 's/d', impHoy_(), 'Vigente', limpio_(x.obs)]]);
  return { ok: true, id: fid, url: url, reemplazadas: previas.length };
}

// ------------------------------------------------------------------ Opciones: qué se puede imprimir en blanco y qué hay completado
function impOpciones_(cod, acc) {
  const F = (() => { try { return impFirmadas_(cod); } catch (e) { return {}; } })(), temas = [];
  IMP_TEMAS.filter(t => impVe_(acc, t)).forEach(t => {
    let o = null, error = '';
    try { o = impOpcTema_(t.k, cod, acc); } catch (e) { error = 'No se pudo leer este tema (' + e.message + ').'; }
    if (!o && !error) { temas.push({ k: t.k, nombre: t.n, instalado: false, campos: [], hechas: [] }); return; }
    const hechas = ((o && o.hechas) || []).sort((a, b) => String(b.fecha).localeCompare(String(a.fecha))).slice(0, IMP.MAX).map(h => Object.assign(h, { firmada: F[t.k + '|' + h.id] || null }));
    temas.push({ k: t.k, nombre: t.n, instalado: !error, error: error, campos: (o && o.campos) || [], nota: (o && o.nota) || '', hechas: hechas, total: ((o && o.hechas) || []).length });
  });
  return { ok: true, est: cod, nombre: impNombreEst_(cod), hys: !!(acc && acc.maestra), hoy: impHoy_(), temas: temas };
}
const impOp_ = (v, t) => [String(v), String(t == null ? v : t)];
function impOpcTema_(k, cod, acc) {
  const hys = !!(acc && acc.maestra);
  if (k === 'res_aud') {
    const L = audLugares_(cod), campo = L.filter(l => l !== 'Establecimiento');
    const tipos = hys ? [impOp_('Interna', 'Auditoría interna (la del referente, lista corta)'), impOp_('De campo', 'Auditoría de campo (Higiene y Seguridad)'), impOp_('Documental', 'Auditoría documental (Higiene y Seguridad)')] : [impOp_('Interna', 'Auditoría interna (lista corta)')];
    const shA = pDG_().getSheetByName('AUDITORIAS'), hechas = (shA ? audLeer_(shA, AUD_H) : []).filter(a => a.ESTABLECIMIENTO === cod).map(a => ({ id: a.ID_AUD, t: 'Auditoría ' + (a.TIPO || '').replace(/^\w/, c => c.toLowerCase()) + (a.LUGARES ? ' · ' + a.LUGARES.split(' | ').join(', ') : ''), fecha: a.FECHA || a.CREADA, estado: a.ESTADO || 's/d', pct: a.CUMPLIMIENTO || '' }));
    return { campos: [{ k: 'tipo', t: 'Tipo de auditoría', ops: tipos }, { k: 'lugar', t: 'Lugar', ops: [impOp_('*', 'Todos los lugares (una sección por lugar)')].concat(campo.map(l => impOp_(l))) }],
      nota: 'La documental es una sola, del establecimiento: no depende del lugar.', hechas: hechas };
  }
  if (k === 'res_diag' || k === 'agua' || k === 'plagas' || k === 'cocina') {
    let sitios = [], lista = [];
    if (k === 'res_diag') { if (!PropertiesService.getScriptProperties().getProperty('DIAG_RES_ID')) return null; sitios = impSitiosRes_(cod).map(s => s.sitio);
      lista = pTabla_(pDG_().getSheetByName('DIAGNOSTICOS'), DIAG_H_DIAG.length).map(r => { const o = {}; DIAG_H_DIAG.forEach((h, j) => o[h] = r.v[j] instanceof Date ? pFecha_(r.v[j]) : r.v[j]); return o; }); }
    else if (k === 'cocina') { if (!PropertiesService.getScriptProperties().getProperty('DIAG_COC_ID')) return null; sitios = cocLugares_().map(s => s.sitio); lista = cocDiagLeer_(); }
    else { if (!dgmInstalado_(k)) return null; sitios = dgmLugares_(k, cod).map(s => s.sitio); lista = dgmDiagLeer_(k); }
    const hechas = lista.filter(o => limpio_(o.CODIGO) === cod && o.ESTADO !== 'Anulado').map(o => ({ id: limpio_(o.ID_DIAG), t: (k === 'cocina' ? 'Relevamiento de cocina' : 'Diagnóstico') + (o.MODALIDAD ? ' · ' + limpio_(o.MODALIDAD) : ''), fecha: impF_(o.FECHA), estado: limpio_(o.ESTADO) || 's/d', pct: o.PORCENTAJE === '' || o.PORCENTAJE == null ? '' : String(o.PORCENTAJE).replace('.', ',') + ' %' }));
    return { campos: [{ k: 'lugar', t: 'Qué imprimir', ops: [impOp_('*', 'Todo: establecimiento y todos los lugares'), impOp_('E', 'Solo las preguntas del establecimiento')].concat(sitios.map(s => impOp_(s, 'Establecimiento y ' + s))) }], hechas: hechas };
  }
  if (k === 'rad_form') return typeof radfOpciones_ === 'function' ? radfOpciones_(cod) : null;   // F-RAD-01 a 03 (RadFormularios.gs)
  if (k === 'plg_rec') {
    const hechas = miLeer_('PLAGAS_REGISTROS').filter(r => r.ESTABLECIMIENTO === cod && r.TIPO === 'Recorrida' && (typeof regVivo_ !== 'function' || regVivo_(r))).map(r => ({ id: r.ID, t: 'Recorrida preventiva' + (r.SECTOR ? ' · ' + r.SECTOR : r.SITIO ? ' · ' + r.SITIO : ''), fecha: r.FECHA, estado: 'Cargada', pct: '' }));
    return { campos: [], nota: 'En blanco se imprime el formulario F-PLG-04 (el mismo de «Formularios para imprimir»).', hechas: hechas };
  }
  if (k === 'infra') {
    const M = impM8_(), S = M.servicios.filter(s => s.est === cod);
    const hechas = M.relevamientos.filter(r => r.est === cod).map(r => { const s = S.find(z => z.id === r.servicio) || {}; return { id: r.id, t: (r.tipo || 'Relevamiento') + ' · ' + ([s.servicio, s.edificio].filter(Boolean).join(' · ') || r.servicio), fecha: r.fecha, estado: r.semaforo ? 'Semáforo: ' + r.semaforo : 'Cargado', pct: impPctM8_(r.pct) }; });
    return { campos: [{ k: 'servicio', t: 'Servicio o edificio', ops: S.map(s => impOp_(s.id, [s.servicio, s.edificio && s.edificio !== 's/d' ? s.edificio : '', s.tipo ? '(' + s.tipo + ')' : ''].filter(Boolean).join(' · '))) }],
      nota: S.length ? '' : 'Este establecimiento todavía no tiene servicios cargados en el módulo (planilla M8 › SERVICIOS).', hechas: hechas };
  }
  if (k === 'rgrl') {
    if (!PropertiesService.getScriptProperties().getProperty(RGRL.P_LIBRO)) return null;
    const hechas = rgrlLeer_('RGRL', RGRL.H_REL).filter(r => r.ESTABLECIMIENTO === cod).map(r => ({ id: r.ID, t: 'RGRL · ' + r.LUGAR, fecha: r.FECHA, estado: r.ESTADO || 's/d', pct: '' }));
    return { campos: [{ k: 'lugar', t: 'Lugar', ops: rgrlLugares_(cod).map(l => impOp_(l)) }], hechas: hechas };
  }
  if (k === 'extintores' || k === 'inc_rec') {
    if (!PropertiesService.getScriptProperties().getProperty(INC.P_LIBRO)) return null;
    const sit = incLeer_('SITIOS_INC', INC.H_SIT).filter(s => limpio_(s.ESTABLECIMIENTO) === cod && s.ACTIVO !== 'No').map(s => limpio_(s.SITIO));
    if (k === 'inc_rec') {
      const hechas = incLeer_('RECORRIDAS', INC_SRV.H_REC).filter(r => r.ID).filter(r => limpio_(r.ESTABLECIMIENTO) === cod).map(r => ({ id: r.ID, t: 'Recorrida · ' + r.SECTOR, fecha: incISO_(r.FECHA), estado: r.RESULTADO || 's/d', pct: '' }));
      return { campos: [], hechas: hechas };
    }
    const por = {}; incLeer_('CONTROLES', INC.H_CON).filter(c => limpio_(c.ESTABLECIMIENTO) === cod && c.ESTADO !== 'Anulado' && incISO_(c.FECHA)).forEach(c => {
      const ym = incISO_(c.FECHA).slice(0, 7), s = limpio_(c.SITIO), key = s + '|' + ym, p = por[key] = por[key] || { id: key, t: 'Control de ' + impMes_(ym) + ' · ' + s, fecha: ym + '-01', n: 0, obs: 0 };
      p.n++; if (c.RESULTADO && !/^conforme$/i.test(c.RESULTADO)) p.obs++; });
    const hechas = Object.keys(por).map(k2 => { const p = por[k2]; return { id: p.id, t: p.t, fecha: p.fecha, estado: p.n + ' control(es)' + (p.obs ? ' · ' + p.obs + ' con observaciones' : ''), pct: '' }; });
    return { campos: [{ k: 'sitio', t: 'Lugar', ops: sit.map(s => impOp_(s)) }], nota: sit.length ? '' : 'Este establecimiento todavía no tiene lugares con extintores (PROTECCIÓN CONTRA INCENDIOS › SITIOS_INC).', hechas: hechas };
  }
  return null;
}
// Sitios del diagnóstico de residuos (mismo filtro que Diag.gs › pDiagAbrir_: sin municipales ni los que no generan)
function impSitiosRes_(cod) {
  return pTabla_(pBC_().getSheetByName('SITIOS'), 13).filter(r => limpio_(r.v[0]) === cod && !/municipal/i.test(limpio_(r.v[9])) && !/no genera/i.test(limpio_(r.v[12]))).map(r => ({ sitio: limpio_(r.v[1]), oficial: limpio_(r.v[2]), tipo: limpio_(r.v[4]) }));
}
// Planilla del módulo de servicios e infraestructura (M8), leída directo por su ID (el código del módulo vive en otro proyecto)
function impM8_() {
  const ss = SpreadsheetApp.openById(GES.M8_ID), fil = (n, c) => { const h = ss.getSheetByName(n); return !h || h.getLastRow() < 2 ? [] : h.getRange(2, 1, h.getLastRow() - 1, c).getValues(); };
  const ind = {}; fil('INDICADORES', 12).forEach(r => { if (r[0]) ind[r[0]] = { pct: r[6], criticos: r[7], semaforo: r[11] }; });
  return {
    catalogo: fil('CATALOGO_ITEMS', 15).filter(r => r[0]).map(r => ({ cod: limpio_(r[0]), capa: limpio_(r[1]), aplica: limpio_(r[2]), rubro: limpio_(r[3]), item: limpio_(r[4]), verificar: limpio_(r[5]), fund: limpio_(r[6]), rgrl: limpio_(r[7]), critico: r[8] === 'S' })),
    servicios: fil('SERVICIOS', 10).filter(r => r[0]).map(r => ({ id: limpio_(r[0]), est: limpio_(r[1]), edificio: limpio_(r[2]), servicio: limpio_(r[3]), tipo: limpio_(r[4]), jefatura: limpio_(r[8]) })),
    relevamientos: fil('RELEVAMIENTOS', 10).filter(r => r[0]).map(r => Object.assign({ id: limpio_(r[0]), fecha: impF_(r[1]), tipo: limpio_(r[2]), servicio: limpio_(r[3]), est: limpio_(r[4]), relevo: limpio_(r[6]), acompano: limpio_(r[7]), obs: limpio_(r[8]) }, ind[r[0]] || {})),
    respuestas: id => fil('RESPUESTAS', 5).filter(r => r[0] === id).map(r => ({ cod: limpio_(r[1]), resp: limpio_(r[2]).toUpperCase(), obs: limpio_(r[3]) }))
  };
}
const impPctM8_ = v => { if (v === '' || v == null) return ''; let n = typeof v === 'number' ? v : Number(String(v).replace('%', '').replace(',', '.').trim()); if (!isFinite(n)) return ''; if (typeof v === 'number' && n > 0 && n <= 1) n = n * 100; return String(Math.round(n * 10) / 10).replace('.', ',') + ' %'; };
const IMP_M8_CRITICOS = ['Guardia', 'Quirófano', 'UTI', 'UCIP', 'Neonatología'];   // los mismos de Modulo8.gs › TIPOS_CRITICOS
const impM8Items_ = (cat, tipo) => tipo === 'Edificio' ? cat.filter(i => i.capa === 'A') : cat.filter(i => i.aplica === tipo || (i.aplica === 'Áreas críticas (todas)' && IMP_M8_CRITICOS.indexOf(tipo) >= 0));

// ------------------------------------------------------------------ Piezas de la hoja
const impCb_ = (marca, txt) => '<span class="op"><span class="cb' + (marca ? ' x' : '') + '"></span>' + impE_(txt) + '</span>';
const impLinea_ = (v, n) => v ? '<div class="val">' + impE_(v) + '</div>' : Array.from({ length: n || 1 }, () => '<div class="linea"></div>').join('');
const impH2_ = t => '<h2>' + impE_(t) + '</h2>';
const impH3_ = t => '<h3>' + impE_(t) + '</h3>';
const impTabla_ = (cab, filas, cls) => '<table class="q ' + (cls || '') + '"><thead><tr>' + cab.map(c => '<th' + (c[1] ? ' style="width:' + c[1] + '"' : '') + '>' + impE_(c[0]) + '</th>').join('') + '</tr></thead><tbody>' + filas.join('') + '</tbody></table>';
// Fila de pregunta: n · texto (con código, ayuda, condición y referencia) · respuesta (casillas o línea) · observaciones
function impFila_(p) {
  const marc = p.valores || [], ops = p.ops || [];
  const resp = ops.length ? (p.multi ? '<div class="mu8">Marcá todas las que correspondan</div>' : '') + ops.map(o => { const cb = impCb_(marc.indexOf(o[0]) >= 0 || (p.igual && p.igual(o[0], marc)), o[1]); return p.vertical ? '<div class="opv">' + cb + '</div>' : cb; }).join(p.vertical ? '' : ' ')
    : impLinea_(p.texto, p.lineas || 1);
  return '<tr><td class="n">' + impE_(p.n) + (p.cod ? '<div class="cod">' + impE_(p.cod) + '</div>' : '') + '</td>' +
    '<td>' + (p.critico ? '<span class="crit">Crítico</span> ' : '') + '<b>' + impE_(p.q) + '</b>' + (p.cond ? '<div class="cond">' + impE_(p.cond) + '</div>' : '') + (p.ayuda ? '<div class="ayuda">' + impE_(p.ayuda) + '</div>' : '') + (p.ref ? '<div class="ref">Referencia: ' + impE_(p.ref) + '</div>' : '') + '</td>' +
    '<td class="r">' + resp + '</td><td class="o">' + (p.obs || p.pre ? '<div class="val">' + impE_(p.obs || '') + (p.pre && !p.obs ? '<span class="mu8">' + impE_(p.pre) + '</span>' : '') + '</div>' : '<div class="linea"></div><div class="linea"></div>') + (p.extra || '') + '</td></tr>';
}
const IMP_CAB = [['N.º', '9%'], ['Punto a verificar', '45%'], ['Respuesta', '24%'], ['Observaciones', '22%']];
// Recuadros de firma
function impFirmas_(L) {
  return '<div class="firmas">' + L.map(f => '<div class="firma"><div class="ft">' + impE_(f.t) + '</div><div class="fl"><span>Nombre y apellido:</span> ' + (f.nombre ? '<b>' + impE_(f.nombre) + '</b>' : '') + '</div>' +
    (f.cargo !== false ? '<div class="fl"><span>' + impE_(f.cargoTxt || 'Cargo o función') + ':</span> ' + (f.cargo ? '<b>' + impE_(f.cargo) + '</b>' : '') + '</div>' : '') +
    '<div class="fl"><span>Fecha:</span> ' + (f.fecha ? '<b>' + impE_(impFTxt_(f.fecha)) + '</b>' : '') + '</div><div class="fl firmal"><span>Firma:</span></div></div>').join('') + '</div>';
}
// Datos de cabecera de la hoja (cuadro de dos columnas)
const impDatos_ = L => '<table class="datos"><tbody>' + L.filter(Boolean).map(d => '<tr><th>' + impE_(d[0]) + '</th><td>' + (d[1] === '' || d[1] == null ? '<div class="linea"></div>' : impE_(d[1])) + '</td></tr>').join('') + '</tbody></table>';

// Documento completo: encabezado repetido en cada página, cuerpo, firmas y pie con el logo de HySL
function impDoc_(o) {
  const azul = IMP.AZULES.indexOf(o.cod) >= 0, c1 = azul ? '#0D313F' : '#C24E1C', c2 = azul ? '#5894A7' : '#FF682C', cl = azul ? '#EAF3F6' : '#FFF1EA';
  const logo = azul ? impImg_(IMP.LOGO_HZT) : '', pie = impImg_(IMP.LOGO_PIE), t = impTema_(o.tema) || { n: '', normas: '' };
  const est = impNombreEst_(o.cod), ahora = Utilities.formatDate(new Date(), TZ, 'dd/MM/yyyy HH:mm');
  // Formularios (p. ej. dosímetro): sin cuadro de estado/versión en el encabezado ni línea de sistema en el pie
  const sinMeta = o.tema === 'rad_form' || o.sinMeta === true;
  const enc = (logo ? '<div class="logoi"><img class="lg" src="' + logo + '" alt="Hospital María Humphreys · Hospital Zonal de Trelew"></div>' : '') + '<div class="enc">' + (logo ? '' : '<div class="inst">Secretaría de Salud del Chubut<br><b>' + impE_(est) + '</b></div>') +
    '<div class="tit"><div class="k">' + impE_(t.n) + '</div><div class="h">' + impE_(o.titulo) + '</div><div class="s">' + impE_(est) + (o.subtitulo ? ' · ' + impE_(o.subtitulo) : '') + '</div></div>' +
    (sinMeta ? '<div class="cd"><b>' + impE_(String(o.codigo || '').replace(/ · v\d+$/, '')) + '</b></div>' : '<div class="cd"><div>' + (o.etiqueta || (o.completada ? 'Hoja completada' : 'Hoja en blanco')) + '</div><b>' + impE_(String(o.codigo || '—').replace(/^En blanco( · )?/, '') || '—') + '</b></div>') + '</div>';
  const css = '@import url("https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700&display=swap");' +
    '@page{size:A4 ' + (o.apaisada ? 'landscape' : 'portrait') + ';margin:11mm 11mm 13mm 11mm;@bottom-right{content:"Página " counter(page) " de " counter(pages);font:7.5pt "Plus Jakarta Sans",Arial,sans-serif;color:#6B7780}}' +
    ':root{--c1:' + c1 + ';--c2:' + c2 + ';--cl:' + cl + '}*{box-sizing:border-box}html,body{background:#fff}' +
    'body{margin:0;font-family:"Plus Jakarta Sans",Arial,sans-serif;font-size:9pt;color:#343A40;line-height:1.3;-webkit-print-color-adjust:exact;print-color-adjust:exact}' +
    '.bar{position:sticky;top:0;z-index:5;background:#F4F6F7;border-bottom:1px solid #D1D1D1;padding:10px 14px;display:flex;gap:10px;align-items:center;flex-wrap:wrap;font-size:13px}' +
    '.bar button{font:inherit;font-weight:700;background:var(--c1);color:#fff;border:0;border-radius:8px;padding:9px 16px;cursor:pointer}.bar span{color:#5F6B73}' +
    '.hoja{max-width:' + (o.apaisada ? '277mm' : '190mm') + ';margin:0 auto;padding:6mm 0}@media screen{.hoja{padding:16px}}' +
    'table.pag{width:100%;border-collapse:collapse}table.pag>thead>tr>td,table.pag>tfoot>tr>td,table.pag>tbody>tr>td{padding:0;border:0}' +
    '.logoi{margin:0 0 4px}.logoi .lg{height:7.5mm;width:auto;display:block}.enc{display:flex;align-items:center;gap:10px;border-bottom:2.2pt solid var(--c1);padding:0 0 5px;margin-bottom:7px}' +
    '.enc .inst{font-size:7.5pt;color:#5F6B73;line-height:1.25;min-width:34mm}.enc .inst b{color:var(--c1);font-size:8.5pt}' +
    '.enc .tit{flex:1}.enc .k{font-size:7pt;font-weight:700;letter-spacing:.6pt;text-transform:uppercase;color:var(--c2)}.enc .h{font-size:12pt;font-weight:700;color:var(--c1);line-height:1.15}.enc .s{font-size:8pt;color:#5F6B73}' +
    '.enc .cd{text-align:right;font-size:7pt;color:#5F6B73;border-left:1px solid #D1D1D1;padding-left:8px}.enc .cd b{display:block;font-size:8pt;color:#343A40;max-width:46mm;word-break:break-all}' +
    '.pie{border-top:0.8pt solid #D1D1D1;margin-top:6px;padding-top:3px;text-align:center}.pie img{height:9mm;width:auto}.pie .v{font-size:6.5pt;color:#8A969C}' +
    '.norma{font-size:7.5pt;color:#5F6B73;background:var(--cl);border-left:3pt solid var(--c2);padding:4px 7px;margin:0 0 7px}' +
    '.instr{font-size:8pt;margin:0 0 7px}.instr b{color:var(--c1)}' +
    'h2{font-size:10pt;color:#fff;background:var(--c1);padding:3px 7px;margin:9px 0 4px;break-after:avoid;page-break-after:avoid}h3{font-size:9pt;color:var(--c1);border-bottom:1pt solid var(--c2);margin:7px 0 3px;padding-bottom:1px;break-after:avoid;page-break-after:avoid}' +
    'table.q{width:100%;border-collapse:collapse;margin:0 0 6px;table-layout:fixed}table.q td{overflow-wrap:anywhere}table.q th{background:var(--cl);color:var(--c1);font-size:7.5pt;text-align:left;font-weight:700}' +
    'table.q th,table.q td{border:0.6pt solid #B9C3C8;padding:3px 4px;vertical-align:top;text-align:left}table.q tr{break-inside:avoid;page-break-inside:avoid}' +
    'td.n{font-weight:700;color:var(--c1)}.cod{font-size:6.5pt;color:#8A969C;font-weight:400;overflow-wrap:anywhere;word-break:break-all}td.r{font-size:8.5pt}td.o{font-size:8pt}' +
    '.ayuda{font-size:7.5pt;color:#5F6B73;margin-top:1px}.ref{font-size:7pt;color:var(--c2);margin-top:1px}.cond{font-size:7.5pt;color:#8A5200;font-style:italic;margin-top:1px}.mu8{font-size:7pt;color:#8A969C}' +
    '.crit{display:inline-block;font-size:6.5pt;font-weight:700;color:#fff;background:#B4361F;border-radius:3px;padding:0 3px;vertical-align:1px}' +
    '.op{display:inline-block;white-space:nowrap;margin:0 5px 2px 0}.opv{padding-left:4.6mm;text-indent:-4.6mm;margin:0 0 1.5px}.opv .op{display:inline;white-space:normal;margin:0}.cb{display:inline-block;width:3.3mm;height:3.3mm;border:0.8pt solid #343A40;border-radius:0.5mm;vertical-align:-0.7mm;margin-right:1.3mm;position:relative}' +
    '.cb.x::after{content:"✕";position:absolute;left:0;right:0;top:-0.9mm;text-align:center;font-size:8.5pt;font-weight:700;color:#0D313F}' +
    '.linea{border-bottom:0.6pt solid #9AA6AC;height:5.2mm}.val{font-weight:600;color:#0D313F;white-space:pre-wrap}' +
    'table.datos{width:100%;border-collapse:collapse;margin:0 0 7px}table.datos th{width:30%;text-align:left;font-size:7.5pt;color:#5F6B73;font-weight:600;padding:2px 6px 2px 0;vertical-align:bottom}table.datos td{padding:2px 0;border-bottom:0.6pt solid #D1D1D1;font-weight:600;vertical-align:bottom}table.datos td .linea{border:0}' +
    '.firmas{display:grid;grid-template-columns:repeat(' + Math.min(3, (o.firmasN || 2)) + ',1fr);gap:8px;margin-top:10px;break-inside:avoid;page-break-inside:avoid}.firma{border:0.8pt solid #9AA6AC;border-radius:2mm;padding:5px 7px}.firma .ft{font-weight:700;color:var(--c1);font-size:8pt;margin-bottom:3px}' +
    '.fl{font-size:7.5pt;border-bottom:0.6pt solid #B9C3C8;min-height:5.5mm;padding-top:2px}.fl span{color:#5F6B73}.firmal{min-height:13mm;border-bottom:0}' +
    '.res{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 7px}.res div{border:0.8pt solid #B9C3C8;border-radius:2mm;padding:3px 8px;font-size:7.5pt;color:#5F6B73}.res b{display:block;font-size:10pt;color:var(--c1)}' +
    '.nota{font-size:7.5pt;color:#5F6B73;margin:4px 0}' +
    '@media print{.bar{display:none}.hoja{padding:0;max-width:none}}';
  const cuerpo = (o.instrucciones ? '<p class="instr">' + o.instrucciones + '</p>' : '') +
    '<div class="norma"><b>Marco normativo:</b> ' + impE_(o.normas || t.normas) + ' ' + impE_(IMP.COMPETENCIAS) + '</div>' + (o.datos ? impDatos_(o.datos) : '') + (o.resumen || '') + o.cuerpo + (o.firmas ? impFirmas_(o.firmas) : '');
  const html = '<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + impE_(o.titulo + ' · ' + est) + '</title><style>' + css + '.enmarco .bar{display:none}</style><script>if(window.top!==window.self)document.documentElement.classList.add("enmarco")</script></head><body>' +
    '<div class="bar"><button onclick="window.print()">Imprimir o guardar PDF</button><span>En la ventana de impresión elegí la impresora o «Guardar como PDF». Tamaño A4' + (o.apaisada ? ', apaisada' : '') + '.</span></div>' +
    '<div class="hoja"><table class="pag"><thead><tr><td>' + enc + '</td></tr></thead><tbody><tr><td>' + cuerpo + '</td></tr></tbody>' +
    '<tfoot><tr><td><div class="pie">' + (pie ? '<img src="' + pie + '" alt="HySL · Hospitales más seguros para las personas">' : '<b>HySL</b>') + (sinMeta ? '' : '<div class="v">Sistema HyS · Servicio de Higiene y Seguridad Laboral · hoja en versión 0 · generada el ' + ahora + '</div>') + '</div></td></tr></tfoot></table></div></body></html>';
  return { ok: true, titulo: o.titulo + ' · ' + est, html: html };
}

// ------------------------------------------------------------------ Hoja: entrada
function impHoja_(cod, acc, x) {
  const t = impTema_(x.tema); if (!impVe_(acc, t)) return { ok: false, error: 'permiso', mensaje: 'No tenés asignado este tema.' };
  const id = limpio_(x.id), b = x.blanco || {}, hys = !!(acc && acc.maestra);
  let F = null; if (id) { try { F = impFirmadas_(cod)[t.k + '|' + id] || null; } catch (e) {} }
  switch (t.k) {
    case 'res_aud': return id ? impAudHecha_(cod, id, F) : impAudBlanco_(cod, b, hys);
    case 'res_diag': case 'agua': case 'plagas': case 'cocina': return id ? impDiagHecho_(t.k, cod, id, F) : impDiagBlanco_(t.k, cod, b);
    case 'plg_rec': return id ? impPlgRec_(cod, id, F) : impPlgRecBlanco_();
    case 'infra': return id ? impInfra_(cod, '', id, F) : impInfra_(cod, limpio_(b.servicio), '', null);
    case 'rgrl': return impRgrl_(cod, id ? '' : (limpio_(b.lugar) || cod), id, F);
    case 'extintores': return impExt_(cod, id ? id.split('|')[0] : limpio_(b.sitio), id ? id.split('|')[1] : '', F);
    case 'inc_rec': return impIncRec_(cod, id, F);
    case 'rad_form': return typeof radfHoja_ === 'function' ? radfHoja_(cod, b, x.datos || {}) : { ok: false, mensaje: 'Falta instalar RadFormularios.gs.' };   // con los datos de la pantalla, si vienen
  }
  return { ok: false, mensaje: 'Tema desconocido.' };
}
const impFirmadaTxt_ = F => F ? ['Hoja firmada', 'Adjunta el ' + impFTxt_(F.fecha) + (F.quien ? ' por ' + F.quien : '')] : ['Hoja firmada', 'Todavía no se adjuntó la hoja firmada'];

// ------------------------------------------------------------------ 1 · Residuos · auditorías
const IMP_AUD_OPS = [['C', 'Conforme'], ['NC', 'No conforme'], ['Obs', 'Observación'], ['NA', 'No aplica']];
function impAudPuntos_(pts, simple, resp) {
  // pts: [{ it, lugar, perfil }] (audPuntos_) o puntos de audAbrir_; agrupa por lugar y eje
  const porL = {}, orden = []; pts.forEach(p => { const l = p.lugar; if (!porL[l]) { porL[l] = []; orden.push(l); } porL[l].push(p); });
  let n = 0;
  return orden.map(l => {
    const ejes = {}, oe = []; porL[l].forEach(p => { const e = p.eje || (p.it && p.it.EJE) || 's/d'; if (!ejes[e]) { ejes[e] = []; oe.push(e); } ejes[e].push(p); });
    return impH2_(l === 'Establecimiento' ? 'Establecimiento (documental)' : 'Lugar: ' + l) + oe.map(e => impH3_(e) + impTabla_(IMP_CAB, ejes[e].map(p => {
      n++; const it = p.it || {}, r = resp ? (p.r || null) : null, soloObs = p.soloObs != null ? p.soloObs : audEsObs_(it);
      const q = p.texto || (simple && it.PREGUNTA_REFERENTE && it.PREGUNTA_REFERENTE !== '—' ? it.PREGUNTA_REFERENTE : it.PUNTO), ayuda = simple ? (p.ayuda != null ? p.ayuda : it.AYUDA_REFERENTE) : (p.evidencia != null ? p.evidencia : it.EVIDENCIA);
      return impFila_({ n: n, cod: p.codigo || it.CODIGO, q: q, ayuda: ayuda ? (simple ? '' : 'Qué mirar: ') + ayuda : '', ref: simple ? '' : (p.criterio != null ? p.criterio : it.CRITERIO), critico: p.critico != null ? p.critico : audCritico_(it, (p.perfil || {}).cat),
        ops: soloObs ? IMP_AUD_OPS.filter(o => o[0] === 'Obs' || o[0] === 'NA') : IMP_AUD_OPS, valores: r ? [r.respuesta] : [], obs: r ? r.nota : '', pre: p.precarga != null ? p.precarga : audPrecarga_(it, p.perfil) });
    }))).join('');
  }).join('');
}
function impAudBlanco_(cod, b, hys) {
  const tipo = hys && AUD_TIPOS.indexOf(b.tipo) >= 0 ? b.tipo : 'Interna', L = audLugares_(cod);
  const lugares = tipo === 'Documental' ? ['Establecimiento'] : (b.lugar && b.lugar !== '*' ? [b.lugar] : L.filter(l => l !== 'Establecimiento'));
  const pts = audPuntos_(cod, lugares, [], tipo === 'Interna', tipo), simple = tipo === 'Interna';
  if (!pts.length) return { ok: false, mensaje: 'No hay puntos de auditoría para ese lugar con la categoría del establecimiento.' };
  return impDoc_({ cod: cod, tema: 'res_aud', titulo: 'Auditoría ' + tipo.replace(/^\w/, c => c.toLowerCase()) + ' de gestión de residuos', subtitulo: lugares.length === 1 ? lugares[0] : lugares.length + ' lugares',
    instrucciones: '<b>Cómo completarla:</b> en cada punto marcá una sola casilla (C conforme · NC no conforme · Obs observación · NA no aplica). Cada «No conforme» necesita una nota en Observaciones (o una foto cuando lo cargues). Después, cargá las respuestas en el sistema' + (simple ? ' («Mi establecimiento» › Auditoría interna)' : '') + ' y adjuntá la foto de esta hoja firmada.',
    datos: [['Fecha', ''], ['Auditor', ''], ['Auditados (nombre y función)', ''], ['Lugares', lugares.join(', ')]],
    cuerpo: impAudPuntos_(pts, simple, false) + impH2_('Observaciones generales') + impLinea_('', 4),
    firmas: [{ t: simple ? 'Referente que audita' : 'Auditor (Higiene y Seguridad)' }, { t: 'Auditado (responsable del lugar)' }], firmasN: 2, codigo: 'En blanco · ' + tipo });
}
function impAudHecha_(cod, id, F) {
  const r = audAbrir_({ id: id }); if (!r.ok) return r; const A = r.auditoria; if (A.ESTABLECIMIENTO !== cod) return { ok: false, mensaje: 'Esa auditoría no es de este establecimiento.' };
  const simple = A.ORIGEN === 'Referente', H = audLeer_(audHojaH_(), AUD_HA_H).filter(h => h.ID_AUD === id);
  const res = '<div class="res"><div>Cumplimiento<b>' + impE_(A.CUMPLIMIENTO || 's/d') + '</b></div><div>No conformidades mayores<b>' + impE_(A.NC_MAYOR || 0) + '</b></div><div>No conformidades menores<b>' + impE_(A.NC_MENOR || 0) + '</b></div><div>Observaciones<b>' + impE_(A.OBSERVACIONES_N || 0) + '</b></div><div>Críticos que se cumplen<b>' + impE_(A.CRITICOS_OK || 's/d') + '</b></div><div>Resultado<b>' + impE_(A.RESULTADO || 'Sin cerrar') + '</b></div></div>';
  const hal = H.length ? impH2_('Hallazgos') + impTabla_([['Hallazgo', '12%'], ['Clasificación', '14%'], ['Descripción', '34%'], ['Acción', '24%'], ['Plazo y estado', '16%']],
    H.map(h => '<tr><td>' + impE_(h.ID_HALLAZGO.replace(id + '-', '')) + '<div class="cod">' + impE_(h.CODIGO) + '</div></td><td>' + impE_(h.CLASIFICACION) + '</td><td>' + impE_(h.DESCRIPCION) + (h.LUGAR ? '<div class="ayuda">' + impE_(h.LUGAR) + '</div>' : '') + '</td><td>' + impE_(h.ACCION || '—') + (h.RESPONSABLE ? '<div class="ayuda">Responsable: ' + impE_(h.RESPONSABLE) + '</div>' : '') + '</td><td>' + impE_(h.PLAZO || '—') + '<div class="ayuda">' + impE_(h.ESTADO) + '</div></td></tr>')) : '';
  return impDoc_({ cod: cod, tema: 'res_aud', completada: true, codigo: id, titulo: 'Auditoría ' + String(A.TIPO || '').replace(/^\w/, c => c.toLowerCase()) + ' de gestión de residuos', subtitulo: impFTxt_(A.FECHA),
    datos: [['Fecha', impFTxt_(A.FECHA)], ['Tipo y modalidad', [A.TIPO, A.MODALIDAD].filter(Boolean).join(' · ')], ['Auditor', A.AUDITOR || 's/d'], ['Auditados', A.AUDITADOS || 's/d'], ['Lugares', (A.LUGARES || '').split(' | ').join(', ')], ['Categoría', A.CATEGORIA || 's/d'], ['Estado', A.ESTADO], impFirmadaTxt_(F)],
    resumen: res, cuerpo: impAudPuntos_(r.puntos, simple, true) + hal + (A.OBSERVACIONES ? impH2_('Observaciones generales') + '<p>' + impE_(A.OBSERVACIONES) + '</p>' : ''),
    firmas: [{ t: simple ? 'Referente que auditó' : 'Auditor', nombre: A.AUDITOR, fecha: A.FECHA }, { t: 'Auditado', nombre: A.AUDITADOS }], firmasN: 2 });
}

// ------------------------------------------------------------------ Diagnósticos (residuos, agua, plagas) y relevamiento de cocina
const IMP_CPN = [['Cumple', 'Cumple'], ['Parcial', 'Parcial'], ['No cumple', 'No cumple'], ['No aplica', 'No aplica']];
function impDiagOps_(it) {
  const ops = String(it.OPCIONES || '').split('|').map(s => s.trim()).filter(Boolean);
  if (ops.length) return ops.map(o => [o, o]);
  if (it.TIPO === 'CPN') return IMP_CPN;
  if (it.TIPO === 'ESCALA') return [0, 1, 2, 3, 4, 5, 6].map(n => [String(n), String(n)]);
  return [];
}
// Condición en palabras (para la hoja en blanco): «Solo si en "…" marcaste: A o B»
function impCond_(it, porId) {
  const c = limpio_(it.CONDICION); if (!c) return '';
  const txt = c.split(';').map(x => {
    if (/^\s*LUGAR/i.test(x)) return '';
    const m = /^\s*([A-Z]{3}\d{2})\s*(~|!=|=)\s*(.+?)\s*$/.exec(x); if (!m) return '';
    const ref = porId[m[1]], q = ref ? '«' + ref.ITEM + '» (' + m[1] + ')' : m[1], v = m[3].split('|').map(s => s.trim()).join(' o ');
    return m[2] === '~' ? 'en ' + q + ' marcaste ' + v : m[2] === '=' ? 'en ' + q + ' respondiste ' + v : 'en ' + q + ' no respondiste ' + v;
  }).filter(Boolean);
  return txt.length ? 'Responder solo si ' + txt.join(' y ') + '.' : '';
}
// ¿Corresponde a este lugar? (solo las condiciones «LUGAR ~ …»; las demás se aclaran en la hoja)
function impLugarOk_(it, sitio) {
  const c = limpio_(it.CONDICION); if (!c || !/LUGAR/i.test(c)) return true;
  const solo = c.split(';').filter(x => /^\s*LUGAR/i.test(x)).join(';'); return diagAplica_({ CONDICION: solo }, [], sitio, {});
}
function impDiagFilas_(items, sitio, porId, R, hecho) {
  // R: respuestas del lugar (sitio vacío = establecimiento); hecho: completado (oculta lo que no aplica)
  let n = 0; const secs = {}, orden = [];
  items.forEach(it => {
    if (sitio && !impLugarOk_(it, sitio)) return;
    if (hecho && !diagAplica_(it, R.todas, sitio, porId)) return;
    const s = limpio_(it.SECCION) || 's/d'; if (!secs[s]) { secs[s] = []; orden.push(s); } secs[s].push(it);
  });
  return orden.map(s => impH3_(s) + impTabla_(IMP_CAB, secs[s].map(it => {
    n++; const r = R.por[it.ID] || null, ops = impDiagOps_(it), val = r ? String(r.valor || r.resp || '') : '';
    const valores = r ? (String(r.resp || '') + '|' + String(r.valor || '')).split('|').map(v => v.trim()).filter(Boolean) : [];
    const escala = it.TIPO === 'ESCALA' ? (o, m) => m.some(v => pNivel_(v) != null && pNivel_(v) === pNivel_(o)) : null;
    const texto = !ops.length && r ? val : '';
    return impFila_({ n: n, cod: it.ID, q: it.ITEM, ayuda: it.AYUDA, ref: it.REFERENCIA, critico: it.CRITICO === 'Sí', cond: hecho ? '' : impCond_(it, porId),
      ops: ops, multi: it.TIPO === 'MULTI' || it.PUNTAJES === 'PROP', vertical: ops.length > 4 || it.TIPO === 'ESCALA' || ops.some(o => o[1].length > 22), valores: valores, igual: escala, texto: texto,
      lineas: it.TIPO === 'TEXTO' ? 2 : 1, obs: r ? r.obs : '' });
  }))).join('');
}
function impDiagFuente_(k, cod) {
  if (k === 'res_diag') return { items: pDiagItems_(), sitios: impSitiosRes_(cod) };
  if (k === 'cocina') { const T = cocTipo_(cod); return { items: cocItems_().filter(i => cocAplicaAlcance_(i, T.alcance)), sitios: cocLugares_(), alcance: T.alcance }; }
  return { items: dgmItems_(k), sitios: dgmLugares_(k, cod) };
}
const IMP_DIAG_TIT = { res_diag: 'Diagnóstico de gestión de residuos', agua: 'Diagnóstico de agua para consumo', plagas: 'Diagnóstico de manejo integrado de plagas', cocina: 'Relevamiento de cocina (BPM / HACCP)' };
function impDiagBlanco_(k, cod, b) {
  const D = impDiagFuente_(k, cod), porId = {}; D.items.forEach(i => porId[i.ID] = i);
  if (!D.items.length) return { ok: false, mensaje: 'El cuestionario de este tema todavía no tiene preguntas activas (hoja ITEMS del módulo).' };
  const E = D.items.filter(i => i.NIVEL !== 'S'), S = D.items.filter(i => i.NIVEL === 'S'), vacio = { por: {}, todas: [] };
  const sitios = b.lugar === 'E' ? [] : b.lugar && b.lugar !== '*' ? D.sitios.filter(s => s.sitio === b.lugar) : D.sitios;
  const cuerpo = impH2_('Establecimiento') + impDiagFilas_(E, '', porId, vacio, false) +
    (S.length ? sitios.map(s => impH2_('Lugar: ' + s.sitio + (s.oficial ? ' · ' + s.oficial : '')) + impDiagFilas_(S, s.sitio, porId, vacio, false)).join('') +
      (b.lugar === 'E' ? '' : impH2_('Otro lugar: ______________________________') + '<p class="nota">Para un lugar que no figura arriba: usá las preguntas de cualquier lugar y escribí el nombre.</p>') : '') +
    impH2_('Observaciones generales') + impLinea_('', 4);
  return impDoc_({ cod: cod, tema: k, titulo: IMP_DIAG_TIT[k], subtitulo: (D.alcance ? D.alcance + ' · ' : '') + (b.lugar === 'E' ? 'Solo establecimiento' : sitios.length === 1 ? sitios[0].sitio : sitios.length + ' lugares'),
    instrucciones: '<b>Cómo completarlo:</b> en las preguntas con casillas, marcá una (o todas las que correspondan cuando lo dice). Las que dicen «Responder solo si…» dependen de otra respuesta. Los puntos marcados <span class="crit">Crítico</span> son los que más pesan. Después, cargá las respuestas en el sistema y adjuntá la foto de esta hoja firmada.',
    datos: [['Fecha', ''], ['Modalidad', 'Visita · Entrevista · Referente (tachá lo que no corresponda)'], ['Relevado por', ''], ['Entrevistado (nombre y función)', '']],
    cuerpo: cuerpo, firmas: [{ t: 'Relevó' }, { t: 'Entrevistado' }], firmasN: 2, codigo: 'En blanco' });
}
function impDiagHecho_(k, cod, id, F) {
  const D = k === 'res_diag' ? pDiagAbrir_(cod, id) : k === 'cocina' ? cocAbrir_(cod, id) : dgmAbrir_(k, cod, id);
  if (!D.ok || !D.actual || D.actual.ID_DIAG !== id) return { ok: false, mensaje: 'No encontré ese relevamiento en este establecimiento.' };
  const A = D.actual, porId = {}; D.items.forEach(i => porId[i.ID] = i);
  const R = D.respuestas.map(r => ({ sitio: limpio_(r.sitio), item: r.item, resp: r.resp, valor: r.valor, obs: r.obs })), del = s => { const por = {}; R.filter(r => r.sitio === s).forEach(r => por[r.item] = r); return { por: por, todas: R }; };
  const E = D.items.filter(i => i.NIVEL !== 'S'), S = D.items.filter(i => i.NIVEL === 'S');
  const conResp = Array.from(new Set(R.map(r => r.sitio).filter(Boolean))), orden = D.sitios.map(s => s.sitio).filter(s => conResp.indexOf(s) >= 0).concat(conResp.filter(s => !D.sitios.some(x => x.sitio === s)));
  const res = '<div class="res"><div>Cumplimiento<b>' + (A.PORCENTAJE === '' || A.PORCENTAJE == null ? 's/d' : impE_(String(A.PORCENTAJE).replace('.', ',')) + ' %') + '</b></div><div>Críticos que no se cumplen<b>' + impE_(A.CRITICOS_NO_CUMPLE === '' ? 's/d' : A.CRITICOS_NO_CUMPLE) + '</b></div><div>Puntos evaluados<b>' + impE_(A.PUNTOS_EVALUADOS || 0) + '</b></div><div>Estado<b>' + impE_(A.ESTADO) + '</b></div></div>';
  const cuerpo = impH2_('Establecimiento') + impDiagFilas_(E, '', porId, del(''), true) + orden.map(s => impH2_('Lugar: ' + s) + impDiagFilas_(S, s, porId, del(s), true)).join('') +
    (A.OBSERVACIONES ? impH2_('Observaciones generales') + '<p>' + impE_(A.OBSERVACIONES) + '</p>' : '') +
    '<p class="nota">Solo se muestran las preguntas que corresponden según las respuestas. Los lugares sin respuestas no se imprimen.</p>';
  return impDoc_({ cod: cod, tema: k, completada: true, codigo: id, titulo: IMP_DIAG_TIT[k], subtitulo: impFTxt_(A.FECHA),
    datos: [['Fecha', impFTxt_(A.FECHA)], ['Modalidad', A.MODALIDAD || 's/d'], ['Relevado por', A.RELEVADO_POR || 's/d'], ['Entrevistado', A.ENTREVISTADO || 's/d'], impFirmadaTxt_(F)],
    resumen: res, cuerpo: cuerpo, firmas: [{ t: 'Relevó', nombre: A.RELEVADO_POR, fecha: A.FECHA }, { t: 'Entrevistado', nombre: A.ENTREVISTADO }], firmasN: 2 });
}

// ------------------------------------------------------------------ 3 · Plagas · recorrida preventiva
function impPlgRecBlanco_() {
  const L = (miFormularios_().lista || []), f = L.find(x => /PLG.?04/i.test(x.nombre)) || L.find(x => /recorrida/i.test(x.nombre) && /plag/i.test(x.nombre));
  return f ? { ok: true, url: f.ver || f.url, titulo: f.nombre } : { ok: false, mensaje: 'No encontré el formulario F-PLG-04 en la carpeta de formularios para imprimir.' };
}
function impPlgRec_(cod, id, F) {
  const r = miLeer_('PLAGAS_REGISTROS').find(o => o.ID === id && o.ESTABLECIMIENTO === cod); if (!r) return { ok: false, mensaje: 'No encontré esa recorrida en este establecimiento.' };
  return impDoc_({ cod: cod, tema: 'plg_rec', completada: true, codigo: id, titulo: 'Recorrida preventiva de plagas', subtitulo: impFTxt_(r.FECHA),
    datos: [['Fecha', impFTxt_(r.FECHA)], ['Lugar', r.SITIO || 's/d'], ['Sector', r.SECTOR || 's/d'], ['Acciones', r.ACCIONES || '—'], ['Uso de productos químicos', r.QUIMICO || 'No'], ['Producto', r.PRODUCTO || '—'], ['Resultado', r.RESULTADO || '—'], ['Observaciones', r.OBSERVACIONES || '—'], ['Cargó', r.CARGO || 's/d'], ['Formulario F-PLG-04 firmado', r.ARCHIVO ? 'Cargado con el registro' : 'Sin archivo'], impFirmadaTxt_(F)],
    cuerpo: '<p class="nota">El detalle de la recorrida está en el formulario F-PLG-04 firmado que se cargó con el registro.</p>', firmas: [{ t: 'Realizó la recorrida', nombre: r.CARGO, fecha: r.FECHA }], firmasN: 2 });
}

// ------------------------------------------------------------------ 6 · Servicios e infraestructura (M8)
const IMP_M8_OPS = [['C', 'Cumple'], ['P', 'Parcial'], ['NC', 'No cumple'], ['NA', 'No aplica']];
function impInfra_(cod, servicio, id, F) {
  const M = impM8_(); let rel = null, sid = servicio;
  if (id) { rel = M.relevamientos.find(r => r.id === id); if (!rel || rel.est !== cod) return { ok: false, mensaje: 'No encontré ese relevamiento en este establecimiento.' }; sid = rel.servicio; }
  const s = M.servicios.find(x => x.id === sid && x.est === cod); if (!s) return { ok: false, mensaje: 'Elegí un servicio cargado en la planilla del módulo (SERVICIOS).' };
  const items = impM8Items_(M.catalogo, s.tipo); if (!items.length) return { ok: false, mensaje: 'No hay puntos del catálogo para el tipo «' + s.tipo + '».' };
  const R = {}; if (rel) M.respuestas(rel.id).forEach(r => R[r.cod] = r);
  const ru = {}, orden = []; items.forEach(i => { const k = i.rubro || 's/d'; if (!ru[k]) { ru[k] = []; orden.push(k); } ru[k].push(i); });
  let n = 0;
  const cuerpo = orden.map(k => impH3_(k) + impTabla_(IMP_CAB, ru[k].map(i => { n++; const r = R[i.cod];
    return impFila_({ n: n, cod: i.cod, q: i.item, ayuda: i.verificar ? 'Qué verificar: ' + i.verificar : '', ref: [i.fund, i.rgrl ? 'RGRL: ' + i.rgrl : ''].filter(Boolean).join(' · '), critico: i.critico, ops: IMP_M8_OPS, valores: r ? [r.resp] : [], obs: r ? r.obs : '' }); }))).join('') +
    (rel ? (rel.obs ? impH2_('Observaciones generales') + '<p>' + impE_(rel.obs) + '</p>' : '') : impH2_('Observaciones generales') + impLinea_('', 4));
  const nom = [s.servicio, s.edificio && s.edificio !== 's/d' ? s.edificio : ''].filter(Boolean).join(' · ');
  const res = rel ? '<div class="res"><div>Cumplimiento<b>' + impE_(impPctM8_(rel.pct) || 's/d') + '</b></div><div>Críticos que no cumplen<b>' + impE_(rel.criticos === '' || rel.criticos == null ? 's/d' : rel.criticos) + '</b></div><div>Semáforo<b>' + impE_(rel.semaforo || 's/d') + '</b></div></div>' : '';
  return impDoc_({ cod: cod, tema: 'infra', completada: !!rel, codigo: rel ? rel.id : 'En blanco · ' + s.id, titulo: 'Relevamiento de servicios e infraestructura', subtitulo: nom + (rel ? ' · ' + impFTxt_(rel.fecha) : ''),
    instrucciones: rel ? '' : '<b>Cómo completarlo:</b> en cada punto marcá una casilla (Cumple · Parcial · No cumple · No aplica). Los críticos en «No cumple» necesitan foto cuando lo cargues en el portal. Después, adjuntá la foto de esta hoja firmada.',
    datos: rel ? [['Fecha', impFTxt_(rel.fecha)], ['Tipo de relevamiento', rel.tipo || 's/d'], ['Servicio', nom + ' (' + s.tipo + ')'], ['Relevó', rel.relevo || 's/d'], ['Acompañó', rel.acompano && rel.acompano !== 's/d' ? rel.acompano : 's/d'], impFirmadaTxt_(F)]
      : [['Fecha', ''], ['Servicio', nom + ' (' + s.tipo + ')'], ['Jefatura', s.jefatura && s.jefatura !== 's/d' ? s.jefatura : ''], ['Relevó', ''], ['Acompañó (nombre y función)', '']],
    resumen: res, cuerpo: cuerpo, firmas: [{ t: 'Relevó (Higiene y Seguridad)', nombre: rel ? rel.relevo : '', fecha: rel ? rel.fecha : '' }, { t: 'Responsable del servicio', nombre: rel && rel.acompano !== 's/d' ? rel.acompano : '' }], firmasN: 2 });
}

// ------------------------------------------------------------------ 6 · RGRL (Res. SRT 463/09, Anexo I)
const IMP_RGRL_DATOS = [['N_ESTABLECIMIENTO', 'N.º de establecimiento'], ['EMPRESA', 'Razón social'], ['CUIT', 'CUIT'], ['ACTIVIDAD_REV3', 'Actividad (CIIU rev. 3)'], ['DOMICILIO', 'Domicilio'], ['CP', 'Código postal'], ['LOCALIDAD', 'Localidad'], ['PROVINCIA', 'Provincia'], ['TRABAJADORES', 'Cantidad de trabajadores'], ['SUPERFICIE_M2', 'Superficie (m²)']];
function impRgrl_(cod, lugar, id, F) {
  let D = null; if (id) { D = rgrlDetalle_(id); if (!D.ok) return D; if (D.rgrl.ESTABLECIMIENTO !== cod) return { ok: false, mensaje: 'Ese RGRL no es de este establecimiento.' }; lugar = D.rgrl.LUGAR; }
  const g = D ? D.rgrl : {}, R = D ? D.respuestas : {}, P = D ? D.planillas : { A: [], B: [], C: [] }, v = k => D ? (g[k] || 's/d') : '';
  const secs = {}; RGRL_ITEMS.forEach(it => (secs[it[1]] = secs[it[1]] || []).push(it));
  const cond = Object.keys(secs).map(k => impH3_((Number(k) + 1) + ' · ' + RGRL_SECCIONES[k]) + impTabla_([['N.º', '6%'], ['Condición a cumplir', '44%'], ['Sí · No · No aplica', '20%'], ['Fecha de regularización', '12%'], ['Normativa vigente', '18%']],
    secs[k].map(it => { const a = R[it[0]] || null; return '<tr><td class="n">' + it[0] + '</td><td>' + impE_(it[2]) + (a && a.o ? '<div class="ayuda">' + impE_(a.o) + '</div>' : '') + '</td><td class="r">' + ['Sí', 'No', 'No aplica'].map(o => impCb_(a && a.r === o, o)).join(' ') + '</td><td>' + (a && a.r === 'No' && a.f ? '<div class="val">' + impE_(impFTxt_(a.f)) + '</div>' : D ? '' : '<div class="linea"></div>') + '</td><td><span class="ref">' + impE_(it[3] || '—') + '</span></td></tr>'; }))).join('');
  const pla = ['A', 'B', 'C'].map(k => { const T = RGRL_PLANILLAS[k], marc = P[k] || [];
    return impH3_(T.titulo) + '<p class="nota">Marcá solo las sustancias o agentes presentes en el establecimiento' + (k === 'C' ? ' en cantidad igual o mayor al umbral (toneladas)' : '') + '.</p>' +
      '<div style="columns:' + (k === 'B' ? 3 : 2) + ';column-gap:6mm;font-size:7.5pt">' + T.lista.map(s => '<div class="opv" style="break-inside:avoid">' + impCb_(marc.indexOf(s[0]) >= 0, s[1] + (s[2] ? ' (umbral ' + s[2] + ' t)' : '')) + ' <span class="cod">' + impE_(s[0]) + '</span></div>').join('') + '</div>'; }).join('');
  const datos = [['Establecimiento · lugar', impNombreEst_(cod) + (lugar && lugar !== cod ? ' · ' + lugar : '')], ['Fecha del relevamiento', D ? impFTxt_(g.FECHA) : '']].concat(IMP_RGRL_DATOS.map(d => [d[1], v(d[0])])).concat(D ? [['Estado', g.ESTADO || 's/d'], ['Vence', impFTxt_(g.VENCE)], impFirmadaTxt_(F)] : []);
  const otros = impH2_('Gremios, contratistas y responsable del formulario') + impDatos_([['Gremios', v('GREMIOS')], ['Contratistas', v('CONTRATISTAS')], ['Responsable', v('RESPONSABLE')], ['CUIL del responsable', v('CUIL_RESPONSABLE')], ['Cargo', v('CARGO_RESPONSABLE')], ['Título y matrícula', v('TITULO_MATRICULA')], ['Observaciones', v('OBSERVACIONES')]]);
  return impDoc_({ cod: cod, tema: 'rgrl', completada: !!D, codigo: D ? g.ID : 'En blanco', titulo: 'RGRL · Relevamiento General de Riesgos Laborales', subtitulo: (lugar || cod) + (D ? ' · ' + impFTxt_(g.FECHA) : ''),
    instrucciones: D ? '' : '<b>Cómo completarlo:</b> en cada condición marcá Sí, No o No aplica; si es «No», escribí la fecha prevista de regularización. Es el formulario A del Anexo I de la Res. SRT 463/09; se carga en el portal (6 · Servicios e infraestructura › RGRL) y se actualiza una vez al año.',
    datos: datos, cuerpo: impH2_('Estado de cumplimiento en el establecimiento (condiciones a cumplir)') + cond + impH2_('Planillas A, B y C') + pla + otros,
    firmas: [{ t: 'Responsable de Higiene y Seguridad', nombre: D ? g.RESPONSABLE : '', cargo: D ? g.TITULO_MATRICULA : '', cargoTxt: 'Título y matrícula', fecha: D ? g.FECHA : '' }, { t: 'Responsable del establecimiento' }], firmasN: 2 });
}

// ------------------------------------------------------------------ 7 · Incendio · control mensual de extintores
function impExt_(cod, sitio, ym, F) {
  if (!sitio) return { ok: false, mensaje: 'Elegí el lugar.' };
  const E = incLeer_('EXTINTORES', INC.H_EXT).filter(e => limpio_(e.ESTABLECIMIENTO) === cod && sinTildes_(e.SITIO) === sinTildes_(sitio) && !/baja/i.test(e.ESTADO))
    .sort((a, b) => String(a.NRO_EXTINTOR).localeCompare(String(b.NRO_EXTINTOR), 'es', { numeric: true }));
  let C = {}; if (ym) { incLeer_('CONTROLES', INC.H_CON).filter(c => limpio_(c.ESTABLECIMIENTO) === cod && sinTildes_(c.SITIO) === sinTildes_(sitio) && c.ESTADO !== 'Anulado' && incISO_(c.FECHA).slice(0, 7) === ym)
    .forEach(c => { const p = C[c.ID_EXTINTOR]; if (!p || incISO_(c.FECHA) >= incISO_(p.FECHA)) C[c.ID_EXTINTOR] = c; }); if (!Object.keys(C).length) return { ok: false, mensaje: 'No hay controles de ese mes en ese lugar.' }; }
  if (!E.length && !ym) return { ok: false, mensaje: 'Ese lugar no tiene extintores cargados en el inventario.' };
  const cab = [['Puesto / N.º', '8%'], ['Ubicación', '17%'], ['Tipo · agente · kg', '10%'], ['Vence la carga', '8%']].concat(INC.CHEQUEOS.map(c => [c[1], '8%'])).concat([['Problemas y observaciones', '17%']]);
  const sn = (c, k) => ['Sí', 'No'].map(o => impCb_(!!c && c[k] === o, o)).join('<br>');
  const filas = E.map(e => { const c = C[e.ID] || null;
    return '<tr><td class="n">' + impE_(e.NRO_EXTINTOR || '—') + '<div class="cod">' + impE_(e.ID) + '</div></td><td>' + impE_([e.PLANTA, e.SECTOR, e.UBICACION].filter(Boolean).join(' · ')) + '</td><td>' + impE_([e.TIPO, e.AGENTE, e.CAPACIDAD_KG ? e.CAPACIDAD_KG + ' kg' : ''].filter(Boolean).join(' · ')) + '</td><td>' + impE_(impFTxt_(c && c.VTO_CARGA ? c.VTO_CARGA : e.VTO_CARGA) || 's/d') + '</td>' +
      INC.CHEQUEOS.map(k => '<td class="r">' + (ym && !c ? '<span class="mu8">Sin control este mes</span>' : sn(c, k[0])) + '</td>').join('') +
      '<td class="o">' + (c ? '<div class="val">' + impE_([c.RESULTADO, c.PROBLEMAS, c.OBSERVACIONES].filter(Boolean).join(' · ')) + '</div><div class="mu8">' + impE_(impFTxt_(c.FECHA) + (c.QUIEN ? ' · ' + c.QUIEN : '')) + '</div>' : '<div class="linea"></div><div class="linea"></div>') + '</td></tr>'; });
  if (!ym) for (let i = 0; i < 4; i++) filas.push('<tr><td><div class="linea"></div></td><td><div class="linea"></div></td><td><div class="linea"></div></td><td><div class="linea"></div></td>' + INC.CHEQUEOS.map(() => '<td class="r">' + sn(null, '') + '</td>').join('') + '<td><div class="linea"></div></td></tr>');
  const problemas = '<h3>Problemas que dificultan o impiden usar el extintor (anotá el número en la columna de observaciones)</h3><div style="columns:2;column-gap:6mm;font-size:7.5pt">' + INC.PROBLEMAS.map((p, i) => '<div>' + (i + 1) + '. ' + impE_(p) + '</div>').join('') + '</div>' +
    '<p class="nota">Si un extintor tiene un problema, cargalo como «irregular» con observaciones y foto: se avisa a quien lo tiene que resolver. Al cargar el control en el sistema van las 3 fotos (panorámica, marbete y N.º de inventario) cuando se piden.</p>';
  const quien = ym ? Array.from(new Set(Object.keys(C).map(k => C[k].QUIEN).filter(Boolean))).join(' · ') : '';
  return impDoc_({ cod: cod, tema: 'extintores', completada: !!ym, apaisada: true, codigo: ym ? sitio + ' · ' + ym : 'En blanco · ' + sitio, titulo: 'Control mensual de extintores', subtitulo: sitio + (ym ? ' · ' + impMes_(ym) : ''),
    instrucciones: ym ? '' : '<b>Cómo completarlo:</b> por cada extintor marcá Sí o No en las 5 verificaciones. Si todo da Sí, en el sistema alcanza con «Todo OK». Los extintores que no figuran (nuevos o cambiados de lugar) anotalos en las filas vacías y agregalos en el sistema.',
    datos: ym ? [['Lugar', sitio], ['Mes', impMes_(ym)], ['Extintores controlados', Object.keys(C).length + ' de ' + E.length], ['Controló', quien || 's/d'], impFirmadaTxt_(F)] : [['Lugar', sitio], ['Fecha del control', ''], ['Controló (nombre, DNI y empresa si corresponde)', '']],
    cuerpo: impTabla_(cab, filas) + problemas, firmas: [{ t: 'Controló', nombre: quien }, { t: 'Higiene y Seguridad (verificación)', cargo: false }], firmasN: 2 });
}

// ------------------------------------------------------------------ 7 · Incendio · recorrida de seguridad
function impIncRec_(cod, id, F) {
  let r = null, det = {};
  if (id) { r = incLeer_('RECORRIDAS', INC_SRV.H_REC).find(x => x.ID === id && limpio_(x.ESTABLECIMIENTO) === cod); if (!r) return { ok: false, mensaje: 'No encontré esa recorrida en este establecimiento.' };
    incLeer_('NOVEDADES_INC', INC_SRV.H_NOV).filter(n => n.ID_RECORRIDA === id).forEach(n => det[String(n.TIPO).replace(/: no$/, '')] = n); }
  const no = r ? String(r.PUNTOS_NO || '').split(' · ').map(s => s.trim()).filter(Boolean) : [];
  const filas = INC_SRV.PUNTOS.map((p, i) => { const esNo = no.indexOf(p[1]) >= 0, n = det[p[1]];
    return impFila_({ n: i + 1, cod: p[0], q: p[1], ayuda: p[2], ops: [['Sí', 'Sí'], ['No', 'No']], valores: r ? [esNo ? 'No' : 'Sí'] : [], obs: n ? [n.DETALLE, n.ESTADO ? 'Novedad ' + n.ESTADO.toLowerCase() : ''].filter(Boolean).join(' · ') : '' }); });
  return impDoc_({ cod: cod, tema: 'inc_rec', completada: !!r, codigo: r ? r.ID : 'En blanco', titulo: 'Recorrida de seguridad contra incendios', subtitulo: r ? r.SECTOR + ' · ' + impFTxt_(r.FECHA) : '',
    instrucciones: r ? '' : '<b>Cómo completarla:</b> recorré el sector y marcá Sí o No en cada punto. Cada «No» necesita una foto cuando lo cargues en el sistema y queda como novedad para resolver.',
    datos: r ? [['Fecha y hora', impFTxt_(r.FECHA) + ' ' + (r.HORA || '')], ['Sector', r.SECTOR], ['Resultado', r.RESULTADO], ['Quién', r.QUIEN || 's/d'], ['Observaciones', r.OBSERVACIONES || '—'], impFirmadaTxt_(F)] : [['Fecha y hora', ''], ['Sector recorrido', ''], ['Quién (nombre, DNI y empresa si corresponde)', '']],
    cuerpo: impTabla_(IMP_CAB, filas) + (r ? '' : impH2_('Observaciones') + impLinea_('', 3)), firmas: [{ t: 'Realizó la recorrida', nombre: r ? r.QUIEN : '', fecha: r ? incISO_(r.FECHA) : '' }], firmasN: 2 });
}

// ------------------------------------------------------------------ Entradas
// «Mi establecimiento» (Codigo.gs › m_imprimir): acc = acceso de quien ingresó. datos.op: opciones · hoja · firmada
function impRed_(d, acc) {
  const cod = limpio_(d.est), x = d.datos || {};
  try {
    if (x.op === 'hoja') return impHoja_(cod, acc, x);
    if (x.op === 'firmada') return (impFirmada_(cod, acc, x, (acc && acc.nombre) || x.quien || (x.persona && x.persona.nombre) || ''));
    return impOpciones_(cod, acc);
  } catch (e) { registrarError_(d, e); return { ok: false, error: 'interno', mensaje: 'No se pudo armar la hoja (' + e.message + ').' }; }
}
// Portal HyS (Portal.gs › default): p_imp_opciones · p_imp_hoja · p_imp_firmada, con datos.cod
function impPortal_(accion, x) {
  const cod = limpio_(x.cod); if (!cod) return { ok: false, mensaje: 'Elegí el establecimiento.' };
  const acc = { maestra: true, modulos: ACC_MODULOS.slice(), nombre: x.quien || 'Higiene y Seguridad (portal)' };
  if (accion === 'p_imp_opciones') return impOpciones_(cod, acc);
  if (accion === 'p_imp_hoja') return impHoja_(cod, acc, x);
  if (accion === 'p_imp_firmada') return impFirmada_(cod, acc, x, acc.nombre);
  return { ok: false, error: 'Acción desconocida.' };
}

// ------------------------------------------------------------------ Prueba desde el editor (solo lee; no crea hojas ni libros): arma una hoja de cada tema del HMH y muestra el tamaño
function probarImprimir() {
  const acc = { maestra: true, modulos: ACC_MODULOS.slice() }, o = impOpciones_('HMH', acc), out = [];
  o.temas.forEach(t => { const b = {}; (t.campos || []).forEach(c => { if (c.ops && c.ops.length) b[c.k] = c.ops[0][0]; });
    let r1 = null, r2 = null; try { r1 = impHoja_('HMH', acc, { tema: t.k, blanco: b }); } catch (e) { r1 = { ok: false, mensaje: e.message }; }
    if (t.hechas && t.hechas[0]) try { r2 = impHoja_('HMH', acc, { tema: t.k, id: t.hechas[0].id }); } catch (e) { r2 = { ok: false, mensaje: e.message }; }
    out.push(t.nombre + ' · en blanco: ' + (r1 && r1.ok ? (r1.html ? Math.round(r1.html.length / 1024) + ' KB' : 'formulario ' + r1.url) : (r1 && r1.mensaje) || 'sin datos') + ' · completada: ' + (r2 ? (r2.ok ? Math.round(r2.html.length / 1024) + ' KB' : r2.mensaje) : 'no hay') + (t.error ? ' · ' + t.error : '')); });
  Logger.log(out.join('\n'));
}
