/**
 * SISTEMA HyS · «MI ESTABLECIMIENTO» (servidor)
 * Lo usa la app de los establecimientos (la de manifiestos) con la clave de cada establecimiento: acciones «m_…».
 * Todo vive en la BASE COMÚN, en hojas que se crean solas la primera vez:
 *   RESERVORIOS y PUNTOS_MUESTREO   inventario de tanques, cisternas y canillas (se carga una vez y se edita)
 *   AGUA_LIMPIEZAS · AGUA_ANALISIS  registros con la foto del formulario F-AGU-01 o del informe del laboratorio
 *   PLAGAS_CASOS · PLAGAS_REGISTROS manejo integrado de plagas (aviso, intervención, seguimiento, recorrida)
 *   DOCUMENTOS_EST                  manuales, guías, POE, protocolos y PTS propios de cada establecimiento
 * Accidentes de trabajo (pestaña Personal): se guardan en MÓDULO 4 › LIBRO ACCIDENTES DE TRABAJO (Modulo4.gs).
 * Archivos: carpeta del establecimiento (ESTABLECIMIENTOS › CARPETA) › Plagas; los Documentos propios, en MÓDULO 2 · DOCUMENTOS (Modulo2.gs), y Agua, en MÓDULO 3 · AGUA (Modulo3.gs).
 * Hospitales con dos edificios (HMH → HZT, ESTABLECIMIENTOS › COMITES_COMPARTIDOS) comparten red, tablero y carpeta.
 * Criterios: Dto. 351/79, arts. 57 y 58; procesos provinciales DPSB (limpieza 2026-2031 y toma de muestra 2025-2030);
 * normas locales en AGUA_NORMATIVA. No envía correos.
 * 29/10/2026 (pedido de Belén, red Rawson): relevamiento de estado de tanques cada 3 meses (acción m_inspeccion, hoja AGUA_INSPECCIONES,
 *   la misma que usa la app MIP en la red Trelew), limpieza con los datos del Formulario 1 / F-AGU-01 (agua al 20 %, mL de lavandina 5,5 %,
 *   sin cloro: lo mide el DPSB) y carga del Formulario 2 firmado (personal designado, acción m_form2 → DOCUMENTOS_EST).
 * 22/10/2026: las acciones «m_res_nov…» (novedades de residuos) se derivan a ResiduosNovedades.gs › resNovRed_.
 */

const MI_FORM_CARPETA = '1R5OZ-KlYEhnmDYNGTJeeAk8B2fbP_H3R';
const MI_CONTRATOS_CARPETA = '193FJ2fkLu2kHJjU-zMenUB34cRWwjuXZ';   // Drive › SISTEMA HyS › 08 CONTRATOS Y DOCUMENTACIÓN (compartida) · Propiedades del script: CONTRATOS_CARPETA   // Drive › SISTEMA HyS › Formularios para imprimir (se puede cambiar en Propiedades del script: FORM_CARPETA)
const MI_H = {
  RESERVORIOS: ['CODIGO_TANQUE', 'ESTABLECIMIENTO', 'SITIO', 'UBICACION', 'TIPO', 'USO', 'CAPACIDAD_L', 'MATERIAL', 'TAPA', 'ACCESO', 'QUIEN_LIMPIA', 'FRECUENCIA_LIMPIEZA_MESES', 'ULTIMA_LIMPIEZA', 'PROXIMA_LIMPIEZA', 'ESTADO', 'OBSERVACIONES', 'ACTUALIZADO'],
  PUNTOS_MUESTREO: ['CODIGO_PUNTO', 'ESTABLECIMIENTO', 'SITIO', 'UBICACION', 'TANQUE_ASOCIADO', 'FUENTE', 'USO', 'ULTIMO_BACTERIOLOGICO', 'ULTIMO_FISICOQUIMICO', 'ULTIMO_RESULTADO', 'ESTADO', 'OBSERVACIONES'],
  AGUA_LIMPIEZAS: ['ID', 'FECHA', 'ESTABLECIMIENTO', 'CODIGO_TANQUE', 'PROCEDIMIENTO', 'HORA_CORTE', 'HORA_REHABILITACION', 'HORAS_CERRADO', 'DESINFECTANTE', 'CONCENTRACION_GL', 'VOLUMEN_L', 'CLORO_PPM', 'TURBIDEZ_NTU', 'TAPA', 'MUESTRA_TOMADA', 'ARCHIVO', 'CARGO', 'CARGADO', 'OBSERVACIONES'],
  AGUA_ANALISIS: ['ID', 'FECHA_TOMA', 'ESTABLECIMIENTO', 'CODIGO_PUNTO', 'TIPO', 'MOTIVO', 'LABORATORIO', 'CLORO_PPM', 'RESULTADO', 'FECHA_RESULTADO', 'ARCHIVO', 'CARGO', 'CARGADO', 'ESTADO_ACCION', 'OBSERVACIONES'],
  PLAGAS_CASOS: ['CASO', 'ESTABLECIMIENTO', 'SITIO', 'SECTOR', 'FECHA', 'PLAGA', 'EVIDENCIA', 'CANTIDAD', 'AVISO_DE', 'ESTADO', 'PROXIMA_REVISION', 'ARCHIVO', 'OBSERVACIONES', 'ACTUALIZADO'],
  PLAGAS_REGISTROS: ['ID', 'CASO', 'FECHA', 'TIPO', 'ESTABLECIMIENTO', 'SITIO', 'SECTOR', 'ACCIONES', 'QUIMICO', 'PRODUCTO', 'RESULTADO', 'DECISION', 'PROXIMA_REVISION', 'ARCHIVO', 'CARGO', 'CARGADO', 'OBSERVACIONES'],
  AGUA_INSPECCIONES: ['ID', 'FECHA', 'ESTABLECIMIENTO', 'SITIO', 'CODIGO_TANQUE', 'TAPA', 'FISURAS', 'OXIDO', 'SEDIMENTO', 'OLOR_TURBIDEZ', 'FLOTANTE_OK',
    'VENTILACION_MALLA', 'INSECTOS', 'ACCESO_SEGURO', 'CLORO_MG_L', 'RESULTADO', 'PROXIMA_INSPECCION', 'FOTOS', 'QUIEN', 'CARGADO', 'OBSERVACIONES'],   // mismas columnas que mipyv/Tanques_MIPyV.gs
  DOCUMENTOS_EST: ['ID', 'ESTABLECIMIENTO', 'TEMA', 'TIPO', 'CODIGO', 'TITULO', 'VERSION', 'FECHA_VIGENCIA', 'ARCHIVO', 'CARGO', 'CARGADO', 'ESTADO', 'OBSERVACIONES', 'FECHA_VENCIMIENTO']
};
const MI_AYUDA = {
  AGUA_LIMPIEZAS: 'Una fila por limpieza de tanque o cisterna. La carga la app «Mi establecimiento» con la foto del formulario F-AGU-01 firmado.',
  AGUA_ANALISIS: 'Una fila por análisis de agua (bacteriológico cada 6 meses y físico-químico cada 12, Dto. 351/79). Si da NO APTA: limpieza y nueva muestra en no más de 15 días hábiles (proceso provincial DPSB).',
  AGUA_INSPECCIONES: 'Relevamiento de estado de cada tanque o cisterna cada 3 meses (POE de limpieza: inspección visual trimestral). Lo cargan la app MIP (red Trelew) y «Mi establecimiento».',
  PLAGAS_CASOS: 'Un caso por aparición de plaga. Se cierra con dos revisiones seguidas sin actividad.',
  PLAGAS_REGISTROS: 'Intervenciones, seguimientos de eficacia y recorridas preventivas, con la foto del formulario F-PLG-02, 03 o 04.',
  DOCUMENTOS_EST: 'Manuales, guías, POE, protocolos y PTS propios de cada establecimiento. Para reemplazar uno, cargar la versión nueva: la anterior queda como «Reemplazado».'
};

// ------------------------------------------------------------------ Hojas y utilidades
function miHoja_(nombre) {
  const bc = pBC_(); let sh = bc.getSheetByName(nombre); const H = MI_H[nombre];
  if (!sh) {
    sh = bc.insertSheet(nombre);
    sh.getRange(1, 1).setValue(nombre).setFontSize(14).setFontWeight('bold').setFontColor('#0D313F');
    sh.getRange(2, 1).setValue(MI_AYUDA[nombre] || '').setFontStyle('italic').setFontColor('#4F616B');
    sh.getRange(5, 1, 1, H.length).setValues([H]).setFontWeight('bold').setFontColor('#FFFFFF').setBackground('#0D313F');
    sh.setFrozenRows(5);
  }
  return sh;
}
const miF_ = v => v instanceof Date ? Utilities.formatDate(v, TZ, 'yyyy-MM-dd') : String(v == null ? '' : v).trim();
function miLeer_(nombre) {
  const sh = miHoja_(nombre), H = MI_H[nombre], n = sh.getLastRow() - 5; if (n < 1) return [];
  return sh.getRange(6, 1, n, H.length).getValues().map((r, i) => { const o = { fila: 6 + i }; H.forEach((h, j) => o[h] = miF_(r[j])); return o; }).filter(o => o[H[0]]);
}
function miAgregar_(nombre, o) { const sh = miHoja_(nombre), H = MI_H[nombre]; sh.getRange(Math.max(sh.getLastRow(), 5) + 1, 1, 1, H.length).setValues([H.map(h => o[h] == null ? '' : o[h])]); }
function miCambiar_(nombre, fila, o) { const sh = miHoja_(nombre), H = MI_H[nombre]; Object.keys(o).forEach(k => { const j = H.indexOf(k); if (j >= 0) sh.getRange(fila, j + 1).setValue(o[k]); }); }
const miHoy_ = () => Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd');
const miSumarMeses_ = (f, m) => { if (!f) return ''; const d = new Date(f + 'T12:00:00'); d.setMonth(d.getMonth() + Number(m || 12)); return Utilities.formatDate(d, TZ, 'yyyy-MM-dd'); };
const miDias_ = f => f ? Math.round((new Date(f + 'T12:00:00') - new Date(miHoy_() + 'T12:00:00')) / 864e5) : null;
function miSumarHabiles_(f, n) { const d = new Date(f + 'T12:00:00'); let k = 0; while (k < n) { d.setDate(d.getDate() + 1); if (d.getDay() % 6) k++; } return Utilities.formatDate(d, TZ, 'yyyy-MM-dd'); }
// Agua, plagas, documentos y carpeta son de cada establecimiento (el HMH tiene sus propios tanques, cisternas y red de incendio).
// Solo la Red HyS se comparte entre HZT y HMH (miRedCods_).
function miGrupo_(cod) { return { dueno: cod, cods: [cod] }; }
function miRedCods_(cod) { try { return pComiteGrupo_(pComiteDueno_(cod)); } catch (e) { return [cod]; } }
// Sitios del establecimiento para el inventario y las cargas: edificio, dispositivos y CAPS de la BASE COMÚN (sin los municipales)
function miSitios_(cod) {
  const sh = pBC_().getSheetByName('SITIOS'), H = sh.getRange(5, 1, 1, sh.getLastColumn()).getValues()[0].map(String), ix = c => H.indexOf(c);
  const orden = { Edificio: 0, Dispositivo: 1, CAPS: 2 };
  return pTabla_(sh, H.length).filter(r => limpio_(r.v[0]) === cod && limpio_(r.v[1]) && !(ix('DEPENDENCIA') >= 0 && /municipal/i.test(limpio_(r.v[ix('DEPENDENCIA')]))) && !/\((MCR|MRT)\)/.test(limpio_(r.v[1])) && !(ix('ESTADO') >= 0 && /baja|cerrad/i.test(limpio_(r.v[ix('ESTADO')]))))
    .map(r => ({ s: limpio_(r.v[1]), t: limpio_(r.v[ix('TIPO') >= 0 ? ix('TIPO') : 4]) }))
    .sort((a, b) => (orden[a.t] == null ? 3 : orden[a.t]) - (orden[b.t] == null ? 3 : orden[b.t]) || a.s.localeCompare(b.s, 'es')).map(x => x.s);
}
function miId_(pref, cod, lista, campo) { const anio = miHoy_().slice(0, 4), base = pref + '-' + cod + '-' + anio + '-'; return base + ('00' + (lista.filter(o => String(o[campo]).indexOf(base) === 0).length + 1)).slice(-3); }

// Guarda un archivo (foto o PDF en base64) en la carpeta del establecimiento › tema › subcarpeta
function miArchivo_(cod, tema, sub, a) {
  if (!a || !a.base64) return '';
  // Cada tema va a la carpeta de su módulo: Documentos propios → MÓDULO 2 (Modulo2.gs), Agua → MÓDULO 3 (Modulo3.gs),
  // Plagas → MÓDULO 5 (Modulo5.gs). Si el módulo no está armado, a la carpeta de siempre del establecimiento.
  const dueno = miGrupo_(cod).dueno;
  const enModulo = tema === 'Documentos propios' && typeof docCarpetaEst_ === 'function' ? docCarpetaEst_(dueno)
    : tema === 'Agua' && typeof aguaCarpetaEst_ === 'function' ? aguaCarpetaEst_(dueno)
    : tema === 'Plagas' && typeof plagCarpetaEst_ === 'function' ? plagCarpetaEst_(dueno) : null;
  const raiz = audCarpetaEst_(miGrupo_(cod).dueno) || audCarpetaEst_(cod); if (!raiz && !enModulo) throw new Error('El establecimiento no tiene carpeta en ESTABLECIMIENTOS › CARPETA.');
  let dir = enModulo || carpeta_(raiz, tema); if (sub) dir = carpeta_(dir, sub);
  // Hasta 5 fotos por campo (23/10/2026): con varias, queda una carpeta con todas y se devuelve su enlace (Codigo.gs › guardarFotos_)
  return guardarFotos_(dir, (a.nombre || tema).replace(/[^\w.\- ]+/g, '_').slice(0, 80) + '_' + Date.now(), a);
}

// ------------------------------------------------------------------ Entrada (acciones «m_…», ya con la clave validada)
function miRed_(d) {
  const cod = limpio_(d.est), x = d.datos || {}, quien = String(x.quien || '').trim(), maestra = esMaestra_(d.clave);
  const corr = (tipo, fn) => x.reemplaza ? regCorregir_(cod, tipo, x.reemplaza, maestra, quien, fn) : fn();   // corrección desde «Mis registros» (Registros.gs)
  if (/^m_desv_/.test(String(d.accion))) return typeof dacMiRed_ === 'function' ? dacMiRed_(d) : { ok: false, mensaje: 'Falta instalar DesviosAcciones.gs.' };   // 1 · Residuos › supervisión de desvíos (Star Union, 22/10/2026)
  if (/^m_res_nov/.test(String(d.accion))) return typeof resNovRed_ === 'function' ? resNovRed_(d) : { ok: false, mensaje: 'Falta instalar ResiduosNovedades.gs.' };   // 1 · Residuos › novedades de residuos (ResiduosNovedades.gs, 22/10/2026)
  switch (d.accion) {
    case 'm_tablero': return miTablero_(cod);
    case 'm_reservorio': return conLock_(() => miGuardarInv_(cod, 'RESERVORIOS', 'CODIGO_TANQUE', /cisterna/i.test(x.TIPO) ? 'C' : 'T', x));
    // Los puntos de muestreo (canillas) los asigna Higiene y Seguridad desde la ficha de cada dependencia, no el referente ni Mantenimiento (29/10/2026)
    case 'm_punto': return maestra ? conLock_(() => miGuardarInv_(cod, 'PUNTOS_MUESTREO', 'CODIGO_PUNTO', 'P', x)) : { ok: false, mensaje: 'Los puntos de muestreo (canillas) los asigna Higiene y Seguridad.' };
    case 'm_limpieza': return conLock_(() => corr('limpieza', () => miLimpieza_(cod, x, quien)));
    case 'm_analisis': return conLock_(() => corr('analisis', () => miAnalisis_(cod, x, quien)));
    case 'm_inspeccion': return conLock_(() => miInspeccion_(cod, x, quien));   // relevamiento de estado cada 3 meses (29/10/2026)
    case 'm_relev_dep': return conLock_(() => miRelevDep_(cod, x, quien));   // hoja de relevamiento de una dependencia completa (29/10/2026)
    case 'm_form2': return conLock_(() => miForm2_(cod, x, quien));   // Formulario 2 firmado: personal designado y capacitado (29/10/2026)
    case 'm_plaga_aviso': return conLock_(() => x.CASO_EDITAR ? regEditar_(cod, 'PLAGAS_CASOS', 'CASO', x.CASO_EDITAR, maestra, x, quien) : miPlagaAviso_(cod, x, quien));
    case 'm_plaga_registro': return conLock_(() => corr('plaga', () => miPlagaRegistro_(cod, x, quien)));
    case 'm_accidente': return conLock_(() => typeof accGuardar_ === 'function' ? accGuardar_(cod, x, quien) : { ok: false, mensaje: 'El módulo de accidentes no está instalado.' });   // Modulo4.gs
    case 'm_documento': if (typeof docSoloPdf_ === 'function') { const ep = docSoloPdf_(x.archivo); if (ep) return { ok: false, mensaje: ep }; } return conLock_(() => x.ID_EDITAR ? regEditar_(cod, 'DOCUMENTOS_EST', 'ID', x.ID_EDITAR, maestra, x, quien) : miDocumento_(cod, x, quien));
    case 'm_registros': return regListar_(cod, maestra, Math.min(12, Math.max(1, Number(x.meses) || 1)));
    case 'm_foto_man': return conLock_(() => regFotoMan_(cod, String(x.id || ''), x.archivo, quien));
    case 'm_anular': return conLock_(() => regAnular_(cod, x, maestra));
  }
  return { ok: false, error: 'Acción desconocida.' };
}

// ------------------------------------------------------------------ Inventario (alta y edición; el código lo pone el sistema)
function miGuardarInv_(cod, hoja, campoCod, letra, x) {
  const G = miGrupo_(cod), lista = miLeer_(hoja), hoy = miHoy_();
  const estDel = x.ESTABLECIMIENTO && G.cods.indexOf(x.ESTABLECIMIENTO) >= 0 ? x.ESTABLECIMIENTO : cod;
  const editables = hoja === 'RESERVORIOS' ? ['SITIO', 'UBICACION', 'TIPO', 'USO', 'CAPACIDAD_L', 'MATERIAL', 'TAPA', 'ACCESO', 'QUIEN_LIMPIA', 'FRECUENCIA_LIMPIEZA_MESES', 'ESTADO', 'OBSERVACIONES']
    : ['SITIO', 'UBICACION', 'TANQUE_ASOCIADO', 'FUENTE', 'USO', 'ESTADO', 'OBSERVACIONES'];
  const o = {}; editables.forEach(k => { if (k in x) o[k] = String(x[k] == null ? '' : x[k]).trim(); });
  if (x[campoCod]) {   // edición
    const f = lista.find(r => r[campoCod] === x[campoCod] && G.cods.indexOf(r.ESTABLECIMIENTO) >= 0); if (!f) return { ok: false, mensaje: 'No encontré ' + x[campoCod] + '.' };
    if (hoja === 'RESERVORIOS') o.ACTUALIZADO = hoy;
    miCambiar_(hoja, f.fila, o);
    const log = Object.keys(o).filter(k => k !== 'ACTUALIZADO' && String(f[k]) !== o[k]).map(k => [new Date(), hoja, f.ESTABLECIMIENTO, k + ' · ' + x[campoCod], f[k], o[k], 'Mi establecimiento' + (x.quien ? ' (' + x.quien + ')' : '')]);
    if (log.length) pHistorial_(pBC_(), log);
    return { ok: true, codigo: x[campoCod] };
  }
  if (!o.UBICACION) return { ok: false, mensaje: 'Falta la ubicación.' };
  const pref = estDel + '-' + letra, n = lista.filter(r => String(r[campoCod]).indexOf(pref) === 0).length + 1, codigo = pref + ('0' + n).slice(-2);
  const fila = Object.assign({ ESTADO: 'Activo' }, o); fila[campoCod] = codigo; fila.ESTABLECIMIENTO = estDel;
  if (hoja === 'RESERVORIOS') { fila.FRECUENCIA_LIMPIEZA_MESES = fila.FRECUENCIA_LIMPIEZA_MESES || 12; fila.ACTUALIZADO = hoy; }
  miAgregar_(hoja, fila);
  return { ok: true, codigo: codigo };
}

// ------------------------------------------------------------------ Agua
function miLimpieza_(cod, x, quien) {
  const G = miGrupo_(cod), R = miLeer_('RESERVORIOS').find(r => r.CODIGO_TANQUE === x.CODIGO_TANQUE && G.cods.indexOf(r.ESTABLECIMIENTO) >= 0);
  if (!R) return { ok: false, mensaje: 'Elegí un tanque o cisterna de la lista.' };
  if (!x.FECHA) return { ok: false, mensaje: 'Falta la fecha.' };
  if (!(x.archivo && x.archivo.base64) && !x.fotoUrl) return { ok: false, mensaje: 'Falta la foto o el PDF del formulario de limpieza firmado.' };
  // Formulario 1 / F-AGU-01 (29/10/2026): agua cargada = 20 % de la capacidad y 2 mL de lavandina 5,5 % por litro (110 ppm); el cloro lo mide el DPSB
  const nuevo = x.LAVANDINA_ML != null && x.LAVANDINA_ML !== '';
  if (nuevo) x = Object.assign({}, x, { DESINFECTANTE: 'Lavandina 5,5 % · ' + x.LAVANDINA_ML + ' mL en el 20 % del tanque (110 ppm)', CONCENTRACION_GL: '55', VOLUMEN_L: x.AGUA_L || 's/d', CLORO_PPM: 'Lo mide el DPSB', TURBIDEZ_NTU: '' });
  const url = x.archivo && x.archivo.base64 ? miArchivo_(cod, 'Agua', x.FECHA.slice(0, 4), Object.assign({ nombre: 'F-AGU-01_' + R.CODIGO_TANQUE + '_' + x.FECHA }, x.archivo)) : x.fotoUrl;
  let poe = '';
  if (x.poe && x.poe.base64) {   // primera vez (o versión nueva) del POE propio: queda como documento del establecimiento
    poe = miArchivo_(cod, 'Documentos propios', 'Agua', Object.assign({ nombre: 'POE_limpieza_tanques' }, x.poe));
    miDocumento_(cod, { TEMA: 'Agua', TIPO: 'POE', CODIGO: x.POE_CODIGO || '', TITULO: 'POE de limpieza y desinfección de tanques y cisternas', VERSION: x.POE_VERSION || '', url: poe }, quien);
  }
  const L = miLeer_('AGUA_LIMPIEZAS');
  miAgregar_('AGUA_LIMPIEZAS', { ID: miId_('LIM', R.ESTABLECIMIENTO, L, 'ID'), FECHA: x.FECHA, ESTABLECIMIENTO: R.ESTABLECIMIENTO, CODIGO_TANQUE: R.CODIGO_TANQUE, PROCEDIMIENTO: x.PROCEDIMIENTO || 'Proceso provincial',
    HORA_CORTE: x.HORA_CORTE || '', HORA_REHABILITACION: x.HORA_REHABILITACION || '', HORAS_CERRADO: x.HORAS_CERRADO || '', DESINFECTANTE: x.DESINFECTANTE || '', CONCENTRACION_GL: x.CONCENTRACION_GL || '',
    VOLUMEN_L: x.VOLUMEN_L || '', CLORO_PPM: x.CLORO_PPM || '', TURBIDEZ_NTU: x.TURBIDEZ_NTU || '', TAPA: x.TAPA || R.TAPA, MUESTRA_TOMADA: x.MUESTRA_TOMADA || '', ARCHIVO: url, CARGO: quien, CARGADO: miHoy_(), OBSERVACIONES: x.OBSERVACIONES || '' });
  const freq = Number(R.FRECUENCIA_LIMPIEZA_MESES) || 12;
  miCambiar_('RESERVORIOS', R.fila, { ULTIMA_LIMPIEZA: x.FECHA, PROXIMA_LIMPIEZA: miSumarMeses_(x.FECHA, freq), TAPA: x.TAPA || R.TAPA, ACTUALIZADO: miHoy_() });
  if (x.POE_CODIGO || poe) { const sh = pBC_().getSheetByName('ESTABLECIMIENTOS'), H = sh.getRange(5, 1, 1, sh.getLastColumn()).getValues()[0].map(String), j = H.indexOf('POE_LIMPIEZA_TANQUES');
    const f = pTabla_(sh, H.length).find(r => limpio_(r.v[0]) === G.dueno); if (j >= 0 && f) sh.getRange(f.fila, j + 1).setValue('Propio: ' + (x.POE_CODIGO || 'POE') + (x.POE_VERSION ? ' v' + x.POE_VERSION : '') + (poe ? ' · ' + poe : '')); }
  return { ok: true, proxima: miSumarMeses_(x.FECHA, freq) };
}
function miAnalisis_(cod, x, quien) {
  const G = miGrupo_(cod), P = miLeer_('PUNTOS_MUESTREO').find(r => r.CODIGO_PUNTO === x.CODIGO_PUNTO && G.cods.indexOf(r.ESTABLECIMIENTO) >= 0);
  if (!P) return { ok: false, mensaje: 'Elegí una canilla (punto de muestreo) de la lista.' };
  if (!x.FECHA_TOMA) return { ok: false, mensaje: 'Falta la fecha de la toma.' };
  const res = x.RESULTADO || 'Pendiente';
  if (res !== 'Pendiente' && !(x.archivo && x.archivo.base64) && !x.fotoUrl) return { ok: false, mensaje: 'Falta la foto o el PDF del informe del laboratorio.' };
  const url = x.archivo && x.archivo.base64 ? miArchivo_(cod, 'Agua', x.FECHA_TOMA.slice(0, 4), Object.assign({ nombre: 'Analisis_' + P.CODIGO_PUNTO + '_' + x.FECHA_TOMA }, x.archivo)) : (x.fotoUrl || '');
  const A = miLeer_('AGUA_ANALISIS');
  if (x.ID) {   // completar el resultado de un análisis que estaba «Pendiente»
    const f = A.find(a => a.ID === x.ID); if (!f) return { ok: false, mensaje: 'No encontré ese análisis.' };
    miCambiar_('AGUA_ANALISIS', f.fila, { RESULTADO: res, FECHA_RESULTADO: x.FECHA_RESULTADO || miHoy_(), ARCHIVO: url || f.ARCHIVO, ESTADO_ACCION: /no apta/i.test(res) ? 'Abierta' : '', OBSERVACIONES: x.OBSERVACIONES || f.OBSERVACIONES });
  } else {
    miAgregar_('AGUA_ANALISIS', { ID: miId_('ANA', P.ESTABLECIMIENTO, A, 'ID'), FECHA_TOMA: x.FECHA_TOMA, ESTABLECIMIENTO: P.ESTABLECIMIENTO, CODIGO_PUNTO: P.CODIGO_PUNTO, TIPO: x.TIPO || 'Bacteriológico', MOTIVO: x.MOTIVO || 'Programado',
      LABORATORIO: x.LABORATORIO || '', CLORO_PPM: x.CLORO_PPM || '', RESULTADO: res, FECHA_RESULTADO: res === 'Pendiente' ? '' : (x.FECHA_RESULTADO || miHoy_()), ARCHIVO: url, CARGO: quien, CARGADO: miHoy_(),
      ESTADO_ACCION: /no apta/i.test(res) ? 'Abierta' : '', OBSERVACIONES: x.OBSERVACIONES || '' });
  }
  // Si este análisis APTO es posterior a un NO APTO abierto del mismo punto, lo cierra
  if (/^apta/i.test(res)) miLeer_('AGUA_ANALISIS').filter(a => a.CODIGO_PUNTO === P.CODIGO_PUNTO && a.ESTADO_ACCION === 'Abierta' && a.FECHA_TOMA <= x.FECHA_TOMA)
    .forEach(a => miCambiar_('AGUA_ANALISIS', a.fila, { ESTADO_ACCION: 'Cerrada (nueva muestra apta del ' + x.FECHA_TOMA + ')' }));
  const tipo = x.TIPO || 'Bacteriológico', cambios = { ULTIMO_RESULTADO: res + ' (' + x.FECHA_TOMA + ')' };
  if (/bacterio|ambos/i.test(tipo)) cambios.ULTIMO_BACTERIOLOGICO = x.FECHA_TOMA;
  if (/f[ií]sico|ambos/i.test(tipo)) cambios.ULTIMO_FISICOQUIMICO = x.FECHA_TOMA;
  miCambiar_('PUNTOS_MUESTREO', P.fila, cambios);
  return { ok: true, aviso: /no apta/i.test(res) ? 'Agua NO APTA: hay que limpiar y desinfectar y tomar una nueva muestra en no más de 15 días hábiles (proceso provincial). Quedó como pendiente.' : '' };
}

// Relevamiento de estado de un tanque o cisterna (cada 3 meses). Mismas preguntas que la app MIP (Tanques_MIPyV.gs) y que el
// punto 7 del Formulario 1, sin cloro (lo mide el DPSB). Resultado: Conforme · Requiere limpieza · Requiere reparación · ambas.
const MI_INSP = [['FISURAS', 'No', 'reparación', 'fisuras o pérdidas'], ['OXIDO', 'No', 'reparación', 'óxido o deterioro'], ['SEDIMENTO', 'No', 'limpieza', 'barro o sedimento'],
  ['OLOR_TURBIDEZ', 'No', 'limpieza', 'olor o turbidez'], ['FLOTANTE_OK', 'Sí', 'reparación', 'flotante o válvulas con fallas'], ['VENTILACION_MALLA', 'Sí', 'reparación', 'ventilación sin malla'],
  ['INSECTOS', 'No', 'limpieza', 'insectos o restos de animales'], ['ACCESO_SEGURO', 'Sí', 'reparación', 'acceso inseguro']];
function miInspeccion_(cod, x, quien) {
  const G = miGrupo_(cod), R = miLeer_('RESERVORIOS').find(r => r.CODIGO_TANQUE === x.CODIGO_TANQUE && G.cods.indexOf(r.ESTABLECIMIENTO) >= 0);
  if (!R) return { ok: false, mensaje: 'Elegí un tanque o cisterna de la lista.' };
  const fecha = /^\d{4}-\d{2}-\d{2}/.test(x.FECHA || '') ? x.FECHA.slice(0, 10) : miHoy_();
  if (!/^(Sí, en condiciones|Deficiente|No tiene)$/.test(x.TAPA || '')) return { ok: false, mensaje: 'Falta responder cómo está la tapa.' };
  const falta = MI_INSP.filter(q => !/^(Sí|No|No corresponde)$/.test(x[q[0]] || ''));   // 30/10/2026: «No corresponde» (p. ej. malla en tanques sin ventilación) if (falta.length) return { ok: false, mensaje: 'Faltan ' + falta.length + ' respuesta(s) del relevamiento.' };
  let limpiar = false, reparar = x.TAPA !== 'Sí, en condiciones'; const prob = reparar ? ['tapa ' + x.TAPA.toLowerCase()] : [];
  MI_INSP.forEach(q => { if (x[q[0]] !== q[1] && x[q[0]] !== 'No corresponde') { prob.push(q[3]); if (q[2] === 'limpieza') limpiar = true; else reparar = true; } });
  const resultado = limpiar && reparar ? 'Requiere limpieza y reparación' : limpiar ? 'Requiere limpieza' : reparar ? 'Requiere reparación' : 'Conforme';
  // 30/10/2026: si ya hay un relevamiento de ese tanque con esa fecha (por ejemplo, un reenvío), se reemplaza en vez de duplicarlo
  const L = miLeer_('AGUA_INSPECCIONES'), prev = L.find(i => i.CODIGO_TANQUE === R.CODIGO_TANQUE && String(i.FECHA).slice(0, 10) === fecha), id = prev ? prev.ID : miId_('INS', R.ESTABLECIMIENTO, L, 'ID');
  const fotos = x.archivo && x.archivo.base64 ? miArchivo_(cod, 'Agua', fecha.slice(0, 4), Object.assign({ nombre: 'Relevamiento_' + R.CODIGO_TANQUE + '_' + fecha }, x.archivo)) : (x.fotoUrl || '');
  const o = { ID: id, FECHA: fecha, ESTABLECIMIENTO: R.ESTABLECIMIENTO, SITIO: R.SITIO, CODIGO_TANQUE: R.CODIGO_TANQUE, TAPA: x.TAPA, CLORO_MG_L: 'Lo mide el DPSB', RESULTADO: resultado,
    PROXIMA_INSPECCION: miSumarMeses_(fecha, 3), FOTOS: fotos, QUIEN: quien + ' · Mi establecimiento', CARGADO: miHoy_(),
    OBSERVACIONES: [prob.length ? 'Problemas: ' + prob.join('; ') + '.' : '', String(x.OBSERVACIONES || '').trim()].filter(Boolean).join(' ') };
  MI_INSP.forEach(q => o[q[0]] = x[q[0]]);
  if (prev) miCambiar_('AGUA_INSPECCIONES', prev.fila, o); else miAgregar_('AGUA_INSPECCIONES', o);
  miCambiar_('RESERVORIOS', R.fila, { TAPA: x.TAPA, ACTUALIZADO: miHoy_() });
  return { ok: true, id: id, resultado: resultado, aviso: resultado === 'Conforme' ? '' : resultado + ': ' + prob.join(', ') + '.' };
}
// Hoja de relevamiento de una dependencia (Formulario 3 / F-AGU-02, versión 0): mapeo y estado de todos sus tanques y cisternas en una sola carga.
// Primero valida todo; después actualiza o da de alta cada tanque (RESERVORIOS) y registra su relevamiento (AGUA_INSPECCIONES) con la hoja firmada.
function miRelevDep_(cod, x, quien) {
  const L = Array.isArray(x.tanques) ? x.tanques : [], G = miGrupo_(cod), R = miLeer_('RESERVORIOS');
  if (!L.length) return { ok: false, mensaje: 'No hay tanques en la hoja.' };
  // 30/10/2026 (Belén): la foto o el PDF de la hoja firmada es opcional
  const fecha = /^\d{4}-\d{2}-\d{2}/.test(x.FECHA || '') ? x.FECHA.slice(0, 10) : miHoy_();
  for (let i = 0; i < L.length; i++) {
    const t = L[i], n = 'Columna ' + (i + 1);
    if (t.CODIGO_TANQUE && !R.some(r => r.CODIGO_TANQUE === t.CODIGO_TANQUE && G.cods.indexOf(r.ESTABLECIMIENTO) >= 0)) return { ok: false, mensaje: n + ': no encontré ' + t.CODIGO_TANQUE + '.' };
    if (!String(t.UBICACION || '').trim()) return { ok: false, mensaje: n + ': falta la ubicación.' };
    if (t.ESTADO !== 'Fuera de uso') { if (!/^(Sí, en condiciones|Deficiente|No tiene)$/.test(t.TAPA || '')) return { ok: false, mensaje: n + ': falta la tapa.' };
      if (MI_INSP.some(q => !/^(Sí|No|No corresponde)$/.test(t[q[0]] || ''))) return { ok: false, mensaje: n + ': faltan respuestas del estado.' }; }
  }
  const url = x.archivo && x.archivo.base64 ? miArchivo_(cod, 'Agua', fecha.slice(0, 4), Object.assign({ nombre: 'Relevamiento_' + String(x.SITIO || 'dependencia').replace(/\s+/g, '_') + '_' + fecha }, x.archivo)) : '';
  const quien2 = quien + (x.RELEVO ? ' (relevó: ' + x.RELEVO + ')' : ''), res = [];
  L.forEach(t => {
    const inv = { SITIO: x.SITIO || '', UBICACION: t.UBICACION, TIPO: t.TIPO || '', USO: t.USO || '', CAPACIDAD_L: t.CAPACIDAD_L || '', MATERIAL: t.MATERIAL || '', ACCESO: t.ACCESO || '', ESTADO: t.ESTADO || 'Activo', quien: quien2 };
    if (t.OBSERVACIONES) inv.OBSERVACIONES = t.OBSERVACIONES;
    if (t.CODIGO_TANQUE) inv.CODIGO_TANQUE = t.CODIGO_TANQUE;
    const g = miGuardarInv_(cod, 'RESERVORIOS', 'CODIGO_TANQUE', /cisterna/i.test(t.TIPO) ? 'C' : 'T', inv); if (!g.ok) throw new Error(g.mensaje);
    if (t.ESTADO === 'Fuera de uso') { res.push(g.codigo + ': fuera de uso'); return; }
    const r = miInspeccion_(cod, Object.assign({}, t, { CODIGO_TANQUE: g.codigo, FECHA: fecha, fotoUrl: url, archivo: null }), quien2); if (!r.ok) throw new Error(r.mensaje);
    res.push(g.codigo + ': ' + r.resultado);
  });
  return { ok: true, aviso: res.join(' · ') };
}
// Formulario 2 firmado (registro de personal designado y capacitado para la limpieza de tanques): queda como documento propio del
// establecimiento (DOCUMENTOS_EST, tema Agua); el que se carga después reemplaza al anterior. Hasta 5 fotos o un PDF.
function miForm2_(cod, x, quien) {
  if (!(x.archivo && x.archivo.base64)) return { ok: false, mensaje: 'Falta la foto o el PDF del Formulario 2 firmado.' };
  return miDocumento_(cod, { TEMA: 'Agua', TIPO: 'Registro', CODIGO: 'Formulario 2', TITULO: 'Registro de personal designado y capacitado (Formulario 2 · limpieza de tanques)',
    FECHA_VIGENCIA: x.FECHA || miHoy_(), archivo: Object.assign({ nombre: 'Formulario_2_personal_designado_' + (x.FECHA || miHoy_()) }, x.archivo), OBSERVACIONES: x.OBSERVACIONES || '' }, quien);
}

// ------------------------------------------------------------------ Plagas
function miPlagaAviso_(cod, x, quien) {
  if (!x.SECTOR) return { ok: false, mensaje: 'Falta el sector.' };
  const C = miLeer_('PLAGAS_CASOS'), est = x.ESTABLECIMIENTO && miGrupo_(cod).cods.indexOf(x.ESTABLECIMIENTO) >= 0 ? x.ESTABLECIMIENTO : cod, caso = miId_('PLG', est, C, 'CASO');
  const url = miArchivo_(cod, 'Plagas', caso, Object.assign({ nombre: 'Aviso_' + caso }, x.archivo || {}));
  miAgregar_('PLAGAS_CASOS', { CASO: caso, ESTABLECIMIENTO: est, SITIO: x.SITIO || '', SECTOR: x.SECTOR, FECHA: x.FECHA || miHoy_(), PLAGA: x.PLAGA || 's/d (revisar)', EVIDENCIA: x.EVIDENCIA || '', CANTIDAD: x.CANTIDAD || '',
    AVISO_DE: quien, ESTADO: 'Abierto', PROXIMA_REVISION: '', ARCHIVO: url, OBSERVACIONES: x.OBSERVACIONES || '', ACTUALIZADO: miHoy_() });
  return { ok: true, caso: caso };
}
// Intervención, seguimiento de eficacia o recorrida preventiva (la recorrida no necesita caso)
// Desde el 12/10/2026 no hay «aviso de aparición»: la primera intervención (CASO = NUEVO) abre el caso.
function miPlagaRegistro_(cod, x, quien) {
  const G = miGrupo_(cod);
  if (x.TIPO === 'Intervención' && (!x.CASO || x.CASO === 'NUEVO')) {
    if (!x.SECTOR || !x.PLAGA) return { ok: false, mensaje: 'Para el caso nuevo faltan el sector y la plaga.' };
    const C0 = miLeer_('PLAGAS_CASOS'), estN = x.ESTABLECIMIENTO && G.cods.indexOf(x.ESTABLECIMIENTO) >= 0 ? x.ESTABLECIMIENTO : cod, nuevo = miId_('PLG', estN, C0, 'CASO');
    miAgregar_('PLAGAS_CASOS', { CASO: nuevo, ESTABLECIMIENTO: estN, SITIO: x.SITIO || '', SECTOR: x.SECTOR, FECHA: x.FECHA || miHoy_(), PLAGA: x.PLAGA, EVIDENCIA: '', CANTIDAD: '',
      AVISO_DE: quien, ESTADO: 'Abierto', PROXIMA_REVISION: '', ARCHIVO: '', OBSERVACIONES: 'Caso abierto con la primera intervención', ACTUALIZADO: miHoy_() });
    x = Object.assign({}, x, { CASO: nuevo });
  }
  const C = miLeer_('PLAGAS_CASOS'), caso = x.CASO ? C.find(c => c.CASO === x.CASO && G.cods.indexOf(c.ESTABLECIMIENTO) >= 0) : null;
  if (x.TIPO !== 'Recorrida' && !caso) return { ok: false, mensaje: 'Elegí el caso.' };
  if (!(x.archivo && x.archivo.base64) && !x.fotoUrl) return { ok: false, mensaje: 'Falta la foto del formulario firmado.' };
  const R = miLeer_('PLAGAS_REGISTROS'), est = caso ? caso.ESTABLECIMIENTO : (x.ESTABLECIMIENTO && G.cods.indexOf(x.ESTABLECIMIENTO) >= 0 ? x.ESTABLECIMIENTO : cod), id = miId_('REG', est, R, 'ID');
  const url = x.archivo && x.archivo.base64 ? miArchivo_(cod, 'Plagas', caso ? caso.CASO : 'Recorridas', Object.assign({ nombre: x.TIPO + '_' + id }, x.archivo)) : x.fotoUrl;
  const prox = x.PROXIMA_REVISION || (x.TIPO === 'Intervención' ? Utilities.formatDate(new Date(Date.now() + 7 * 864e5), TZ, 'yyyy-MM-dd') : '');
  miAgregar_('PLAGAS_REGISTROS', { ID: id, CASO: caso ? caso.CASO : '', FECHA: x.FECHA || miHoy_(), TIPO: x.TIPO, ESTABLECIMIENTO: est, SITIO: x.SITIO || (caso ? caso.SITIO : ''), SECTOR: x.SECTOR || (caso ? caso.SECTOR : ''),
    ACCIONES: x.ACCIONES || '', QUIMICO: x.QUIMICO || 'No', PRODUCTO: x.PRODUCTO || '', RESULTADO: x.RESULTADO || '', DECISION: x.DECISION || '', PROXIMA_REVISION: prox, ARCHIVO: url, CARGO: quien, CARGADO: miHoy_(), OBSERVACIONES: x.OBSERVACIONES || '' });
  if (caso) {
    let estado = 'En seguimiento';
    if (x.TIPO === 'Seguimiento' && /cerrar/i.test(x.DECISION || '')) {
      const previo = R.filter(r => r.CASO === caso.CASO && r.TIPO === 'Seguimiento' && regVivo_(r)).pop();   // lo anulado no cuenta
      estado = /sin actividad/i.test(x.RESULTADO || '') && previo && /sin actividad/i.test(previo.RESULTADO) ? 'Cerrado' : 'En seguimiento';
    }
    miCambiar_('PLAGAS_CASOS', caso.fila, { ESTADO: estado, PROXIMA_REVISION: estado === 'Cerrado' ? '' : prox, ACTUALIZADO: miHoy_() });
    return { ok: true, id: id, estado: estado, aviso: /cerrar/i.test(x.DECISION || '') && estado !== 'Cerrado' ? 'El caso se cierra con dos revisiones seguidas «sin actividad»; queda en seguimiento.' : '' };
  }
  return { ok: true, id: id };
}

// ------------------------------------------------------------------ Documentos propios (manuales, guías, POE, protocolos, PTS)
function miDocumento_(cod, x, quien) {
  if (!x.TITULO) return { ok: false, mensaje: 'Falta el título.' };
  const url = x.url || miArchivo_(cod, 'Documentos propios', x.TEMA || 'Otro', Object.assign({ nombre: (x.CODIGO || x.TIPO || 'Documento') }, x.archivo || {}));
  if (!url) return { ok: false, mensaje: 'Falta el archivo (PDF o foto).' };
  const G = miGrupo_(cod), D = miLeer_('DOCUMENTOS_EST');
  // Si hay uno vigente con el mismo código o el mismo título, queda reemplazado
  D.filter(d => G.cods.indexOf(d.ESTABLECIMIENTO) >= 0 && d.ESTADO === 'Vigente' && ((x.CODIGO && d.CODIGO === x.CODIGO) || d.TITULO === x.TITULO))
    .forEach(d => miCambiar_('DOCUMENTOS_EST', d.fila, { ESTADO: 'Reemplazado' }));
  const id = miId_('DOC', G.dueno, D, 'ID');
  miAgregar_('DOCUMENTOS_EST', { ID: id, ESTABLECIMIENTO: G.dueno, TEMA: x.TEMA || 'Otro', TIPO: x.TIPO || 'Otro', CODIGO: x.CODIGO || '', TITULO: x.TITULO, VERSION: x.VERSION || '', FECHA_VIGENCIA: x.FECHA_VIGENCIA || '',
    ARCHIVO: url, CARGO: quien, CARGADO: miHoy_(), ESTADO: 'Vigente', OBSERVACIONES: x.OBSERVACIONES || '', FECHA_VENCIMIENTO: x.FECHA_VENCIMIENTO || '' });
  CacheService.getScriptCache().remove('p_tablero');
  return { ok: true, id: id, url: url };
}
// Formularios y contratos: se leen de Drive una vez cada tanto y se guardan en caché (más rápido, 14.50)
function miCacheJson_(k, seg, fn) { const c = CacheService.getScriptCache(); try { const g = c.get(k); if (g) return JSON.parse(g); } catch (e) {} const v = fn(); try { if (!v.error) c.put(k, JSON.stringify(v), seg); } catch (e) {} return v; }
function miFormularios_() { return miCacheJson_('mi_formularios', 21600, miFormularios0_); }
function miFormularios0_() {
  const id = PropertiesService.getScriptProperties().getProperty('FORM_CARPETA') || MI_FORM_CARPETA, out = [];
  try { const it = DriveApp.getFolderById(id).getFiles(); while (it.hasNext()) { const f = it.next(); out.push({ nombre: f.getName().replace(/\.pdf$/i, '').replace(/_/g, ' '), url: 'https://drive.google.com/uc?export=download&id=' + f.getId(), ver: f.getUrl() }); } }
  catch (e) { return { error: 'No se pudo leer la carpeta de formularios.', lista: [] }; }
  out.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')); return { lista: out };
}

// Contratos y documentación compartida: archivos de la carpeta 08 y de sus subcarpetas (la subcarpeta es el grupo).
// Cada archivo queda visible para quien tenga el enlace (solo lectura), así lo pueden abrir los referentes desde la aplicación.
function miContratos_() { return miCacheJson_('mi_contratos', 3600, miContratos0_); }
function miContratos0_() {
  const id = PropertiesService.getScriptProperties().getProperty('CONTRATOS_CARPETA') || MI_CONTRATOS_CARPETA, out = [];
  const leer = (dir, grupo) => {
    const it = dir.getFiles();
    while (it.hasNext()) { const f = it.next();
      try { if (f.getSharingAccess() !== DriveApp.Access.ANYONE_WITH_LINK) f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) {}
      out.push({ grupo: grupo, nombre: f.getName().replace(/\.pdf$/i, '').replace(/_/g, ' '), url: 'https://drive.google.com/uc?export=download&id=' + f.getId(), ver: f.getUrl(), fecha: Utilities.formatDate(f.getLastUpdated(), TZ, 'yyyy-MM-dd') }); }
    const sub = dir.getFolders(); while (sub.hasNext()) { const d = sub.next(); leer(d, d.getName()); }
  };
  try { leer(DriveApp.getFolderById(id), 'General'); } catch (e) { return { error: 'No se pudo leer la carpeta de contratos y documentación.', lista: [] }; }
  out.sort((a, b) => a.grupo.localeCompare(b.grupo, 'es') || a.nombre.localeCompare(b.nombre, 'es')); return { lista: out };
}

// ------------------------------------------------------------------ Tablero: pendientes y datos de cada módulo
function miTablero_(cod, op) { // op.portal: la ficha del portal no necesita formularios, contratos ni biblioteca (más rápido, 14.49)
  const G = miGrupo_(cod), de = l => l.filter(r => G.cods.indexOf(r.ESTABLECIMIENTO) >= 0 && regVivo_(r)), hoy = miHoy_(), P = [];
  const pend = (nivel, tema, texto, detalle, ir) => P.push({ nivel: nivel, tema: tema, texto: texto, detalle: detalle, ir: ir });
  // Red HyS (para «¿Quién sos?»)
  const RC = miRedCods_(cod), red = pTabla_(pBC_().getSheetByName('RED_HYS'), P_RED_COLS.length).filter(r => RC.indexOf(limpio_(r.v[0])) >= 0 && !/baja|inactiv/i.test(String(r.v[12])))
    .map(r => ({ nombre: limpio_(r.v[1]), rol: limpio_(r.v[4]), telefono: limpio_(r.v[7]) })).filter(p => p.nombre);
  // Agua: tanques
  const T = de(miLeer_('RESERVORIOS')).filter(t => !/fuera/i.test(t.ESTADO)), Pm = de(miLeer_('PUNTOS_MUESTREO')).filter(p => !/fuera/i.test(p.ESTADO));
  if (!T.length) pend('wa', 'agua', 'Cargá tus tanques y cisternas', 'Con la hoja de relevamiento por dependencia que completa Mantenimiento: se carga una dependencia por vez y quedan el mapeo y el estado.', 'agua_alta');
  // Relevamiento de estado cada 3 meses (AGUA_INSPECCIONES, también lo carga la app MIP en la red Trelew)
  const sinRel = [], sinLim = [];
  const INS = {}; de(miLeer_('AGUA_INSPECCIONES')).forEach(i => { if (!INS[i.CODIGO_TANQUE] || i.FECHA > INS[i.CODIGO_TANQUE].FECHA) INS[i.CODIGO_TANQUE] = i; });
  const tanques = T.map(t => { const prox = t.PROXIMA_LIMPIEZA || (t.ULTIMA_LIMPIEZA ? miSumarMeses_(t.ULTIMA_LIMPIEZA, t.FRECUENCIA_LIMPIEZA_MESES || 12) : ''), d = miDias_(prox);
    const ui = INS[t.CODIGO_TANQUE], pi = ui ? (ui.PROXIMA_INSPECCION || miSumarMeses_(ui.FECHA, 3)) : '', di = miDias_(pi), insp = ui ? { fecha: ui.FECHA, resultado: ui.RESULTADO, proxima: pi } : null;
    if (!/fuera/i.test(t.ESTADO)) { if (!ui || di < 0) sinRel.push(t.CODIGO_TANQUE + (t.SITIO ? ' (' + t.SITIO + ')' : ''));   // se agrupan en un solo pendiente
      if (ui && /limpieza/i.test(ui.RESULTADO) && (!t.ULTIMA_LIMPIEZA || t.ULTIMA_LIMPIEZA < ui.FECHA)) pend('er', 'agua', t.CODIGO_TANQUE + ': el relevamiento pide limpiarlo', ui.FECHA + ' · ' + ui.RESULTADO, 'agua_limpieza');
      if (ui && /reparaci/i.test(ui.RESULTADO)) pend('wa', 'agua', t.CODIGO_TANQUE + ': necesita una reparación', ui.FECHA + ' · ' + String(ui.OBSERVACIONES || '').slice(0, 120), 'agua_insp'); }
    const riego = /riego/i.test(t.USO), est = riego ? 'riego' : !t.ULTIMA_LIMPIEZA ? 'sin' : d < 0 ? 'vencida' : d <= 30 ? 'porvencer' : 'aldia';
    { if (est === 'vencida') pend('er', 'agua', t.CODIGO_TANQUE + ': limpieza vencida', 'Vencía el ' + prox, 'agua_limpieza'); else if (est === 'porvencer') pend('wa', 'agua', t.CODIGO_TANQUE + ': la limpieza vence en ' + d + ' días', t.UBICACION, 'agua_limpieza'); else if (est === 'sin') sinLim.push(t.CODIGO_TANQUE); }
    return { codigo: t.CODIGO_TANQUE, est: t.ESTABLECIMIENTO, sitio: t.SITIO, ubicacion: t.UBICACION, tipo: t.TIPO, uso: t.USO, capacidad: t.CAPACIDAD_L, material: t.MATERIAL, inv: t.ESTADO, tapa: t.TAPA, acceso: t.ACCESO, quienLimpia: t.QUIEN_LIMPIA,
      frecuencia: t.FRECUENCIA_LIMPIEZA_MESES, ultima: t.ULTIMA_LIMPIEZA, proxima: prox, estado: est, obs: t.OBSERVACIONES, insp: insp }; });
  if (sinRel.length) pend('wa', 'agua', sinRel.length === 1 ? sinRel[0] + ': falta el relevamiento de estado' : sinRel.length + ' tanques o cisternas sin relevamiento de estado al día', (sinRel.length > 1 ? sinRel.join(', ') + ' · ' : '') + 'Se hace cada 3 meses con la hoja de relevamiento por dependencia', 'agua_insp');
  if (sinLim.length) pend('wa', 'agua', sinLim.length === 1 ? sinLim[0] + ': sin limpieza registrada' : sinLim.length + ' tanques o cisternas sin limpieza registrada', (sinLim.length > 1 ? sinLim.join(', ') + ' · ' : '') + 'Cargá la última que se hizo, con el formulario firmado', 'agua_limpieza');
  // Agua: canillas y análisis
  const A = de(miLeer_('AGUA_ANALISIS'));
  A.filter(a => a.ESTADO_ACCION === 'Abierta').forEach(a => { const lim = miSumarHabiles_(a.FECHA_RESULTADO || a.FECHA_TOMA, 15);
    pend('er', 'agua', a.CODIGO_PUNTO + ': agua NO APTA', 'Limpiar, desinfectar y tomar nueva muestra antes del ' + lim, 'agua_analisis'); });
  A.filter(a => a.RESULTADO === 'Pendiente').forEach(a => pend('ok', 'agua', a.CODIGO_PUNTO + ': resultado pendiente', 'Muestra del ' + a.FECHA_TOMA + ' · cargá el informe cuando llegue', 'agua_analisis'));
  // Puntos de equipos (ESTADO «Equipo (solo físico-químico)», p. ej. autoclaves o agua de equipos de laboratorio): no llevan bacteriológico;
  // se controla el físico-químico cada 12 meses (versión 14.37)
  // «Muestra única» (ESTADO): análisis que se hizo una sola vez (p. ej. prueba de un equipo): no vence ni genera pendientes (14.49)
  const puntos = Pm.map(p => { const un = /[uú]nica/i.test(p.ESTADO), eq = !un && /equipo|solo f[ií]sico/i.test(p.ESTADO), vb = !eq && p.ULTIMO_BACTERIOLOGICO ? miSumarMeses_(p.ULTIMO_BACTERIOLOGICO, 6) : '', vf = p.ULTIMO_FISICOQUIMICO ? miSumarMeses_(p.ULTIMO_FISICOQUIMICO, 12) : '';
    const db = miDias_(vb), df = miDias_(vf);
    if (un) { /* muestra única: sin vencimientos */ }
    else if (eq) { if (!vf) pend('wa', 'agua', p.CODIGO_PUNTO + ': sin análisis físico-químico registrado', p.UBICACION, 'agua_analisis'); else if (df < 0) pend('wa', 'agua', p.CODIGO_PUNTO + ': análisis físico-químico vencido', 'Vencía el ' + vf + ' (cada 12 meses)', 'agua_analisis'); else if (df <= 30) pend('wa', 'agua', p.CODIGO_PUNTO + ': el físico-químico vence en ' + df + ' días', p.UBICACION, 'agua_analisis'); }
    else if (!vb) pend('wa', 'agua', p.CODIGO_PUNTO + ': sin análisis bacteriológico registrado', p.UBICACION, 'agua_analisis');
    else if (db < 0) pend('er', 'agua', p.CODIGO_PUNTO + ': análisis bacteriológico vencido', 'Vencía el ' + vb + ' (cada 6 meses)', 'agua_analisis');
    else if (db <= 30) pend('wa', 'agua', p.CODIGO_PUNTO + ': el bacteriológico vence en ' + db + ' días', p.UBICACION, 'agua_analisis');
    if (!un && !eq && vf && df < 0) pend('wa', 'agua', p.CODIGO_PUNTO + ': análisis físico-químico vencido', 'Vencía el ' + vf + ' (cada 12 meses)', 'agua_analisis');
    return { codigo: p.CODIGO_PUNTO, est: p.ESTABLECIMIENTO, sitio: p.SITIO, ubicacion: p.UBICACION, tanque: p.TANQUE_ASOCIADO, fuente: p.FUENTE, uso: p.USO, bact: p.ULTIMO_BACTERIOLOGICO, venceBact: vb, fq: p.ULTIMO_FISICOQUIMICO, venceFq: vf,
      ultimo: p.ULTIMO_RESULTADO, equipo: eq, unica: un, inv: p.ESTADO, estado: un ? 'unica' : eq ? (!vf ? 'sin' : df < 0 ? 'vencida' : df <= 30 ? 'porvencer' : 'aldia') : !vb ? 'sin' : db < 0 ? 'vencida' : db <= 30 ? 'porvencer' : 'aldia', noApta: A.some(a => a.CODIGO_PUNTO === p.CODIGO_PUNTO && a.ESTADO_ACCION === 'Abierta') }; });
  // Plagas
  const C = de(miLeer_('PLAGAS_CASOS')).filter(c => c.ESTADO !== 'Cerrado');
  C.forEach(c => { const d = miDias_(c.PROXIMA_REVISION);
    if (!c.PROXIMA_REVISION) pend('wa', 'plagas', c.CASO + ': falta la intervención', c.PLAGA + ' · ' + c.SECTOR, 'plagas_intervencion');
    else if (d <= 0) pend(d < 0 ? 'er' : 'wa', 'plagas', c.CASO + ': revisión de eficacia ' + (d < 0 ? 'atrasada' : 'hoy'), c.PLAGA + ' · ' + c.SECTOR, 'plagas_seguimiento'); });
  // Residuos: auditoría interna del trimestre (Auditoria.gs)
  try { const q = Math.floor((Number(hoy.slice(5, 7)) - 1) / 3), ini = hoy.slice(0, 4) + '-' + ('0' + (q * 3 + 1)).slice(-2) + '-01';
    const hecha = audLeer_(audHojaA_(), AUD_H).some(a => G.cods.indexOf(a.ESTABLECIMIENTO) >= 0 && a.TIPO === 'Interna' && a.FECHA >= ini && !/planificada/i.test(a.ESTADO));
    if (!hecha) pend('wa', 'residuos', 'Auditoría interna del trimestre sin hacer', 'Recorrida corta de residuos', 'auditoria'); } catch (e) {}
  // Residuos: manifiestos sin foto (recordatorio; desde 2027 bloquea la carga pasado el día límite)
  try { const mesHoy = hoy.slice(0, 7);
    fotosPendientes_(cod).forEach(p => { const vencido = hoy > p.limite, regla = p.mes >= FOTO_REGLA_DESDE;
      pend(vencido ? 'er' : p.mes < mesHoy ? 'wa' : 'ok', 'residuos', p.n + ' manifiesto(s) de ' + p.nombre + ' sin foto',
        (vencido ? (regla ? 'Venció el ' + p.limite.split('-').reverse().join('/') + ': no se pueden cargar manifiestos nuevos hasta subirlas' : 'Venció el ' + p.limite.split('-').reverse().join('/')) : 'Subilas antes del ' + p.limite.split('-').reverse().join('/')) +
        ' · desde «Mis registros» o con el lote .zip del mes', 'fotos'); }); } catch (e) {}
  // Documentos propios con vencimiento cargado: vencidos y por vencer (60 días)
  de(miLeer_('DOCUMENTOS_EST')).filter(d => d.ESTADO === 'Vigente' && d.FECHA_VENCIMIENTO).forEach(d => { const dd = miDias_(d.FECHA_VENCIMIENTO), n = (d.CODIGO ? d.CODIGO + ' · ' : '') + d.TITULO;
    if (dd < 0) pend('er', 'documentos', n + ': vencido', 'Venció el ' + d.FECHA_VENCIMIENTO.split('-').reverse().join('/') + ' · cargá la versión nueva', 'documentos');
    else if (dd <= 60) pend('wa', 'documentos', n + ': vence en ' + dd + ' días', 'Revisalo y cargá la versión nueva cuando esté lista', 'documentos'); });
  const orden = { er: 0, wa: 1, ok: 2 }; P.sort((a, b) => orden[a.nivel] - orden[b.nivel]);
  const docs = de(miLeer_('DOCUMENTOS_EST')).filter(d => d.ESTADO === 'Vigente').map(d => ({ id: d.ID, tema: d.TEMA, tipo: d.TIPO, codigo: d.CODIGO, titulo: d.TITULO, version: d.VERSION, vigencia: d.FECHA_VIGENCIA, vence: d.FECHA_VENCIMIENTO, url: d.ARCHIVO, cargado: d.CARGADO }));
  const E = pBC_().getSheetByName('ESTABLECIMIENTOS'), EH = E.getRange(5, 1, 1, E.getLastColumn()).getValues()[0].map(String), ef = pTabla_(E, EH.length).find(r => limpio_(r.v[0]) === G.dueno), ev = c => ef && EH.indexOf(c) >= 0 ? limpio_(ef.v[EH.indexOf(c)]) : '';
  const carpeta = ev('CARPETA'), rapido = !!(op && op.portal), F = rapido ? { lista: [] } : miFormularios_(), CT = rapido ? { lista: [] } : miContratos_();
  return { ok: true, est: cod, dueno: G.dueno, grupo: G.cods, red: red, pendientes: P, tanques: tanques, puntos: puntos, casos: C.map(c => ({ caso: c.CASO, est: c.ESTABLECIMIENTO, sitio: c.SITIO, sector: c.SECTOR, fecha: c.FECHA, plaga: c.PLAGA, estado: c.ESTADO, proxima: c.PROXIMA_REVISION })),
    documentos: docs, biblioteca: !rapido && typeof bibPara_ === 'function' ? bibPara_(G.dueno) : [], formularios: F.lista, formulariosError: F.error || '', contratos: CT.lista, contratosError: CT.error || '', carpeta: /^https?:/.test(carpeta) ? carpeta : (carpeta ? 'https://drive.google.com/drive/folders/' + carpeta : ''),
    accidentes: typeof accActivo_ === 'function' ? accActivo_(cod) : false,   // pestaña Personal (Modulo4.gs)
    poe: { limpieza: ev('POE_LIMPIEZA_TANQUES') || 'Provincial (DPSB)', muestra: ev('POE_TOMA_MUESTRA') || 'Provincial (DPSB)' }, sitios: miSitios_(cod), hoy: hoy,
    form2: (docs.filter(d => d.codigo === 'Formulario 2' && d.tema === 'Agua').pop() || null) };
}