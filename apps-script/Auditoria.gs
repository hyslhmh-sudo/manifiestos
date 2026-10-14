/**
 * SISTEMA HyS · AUDITORÍAS DE RESIDUOS (etapa 1: servidor)
 * Vive en el LIBRO DIAGNÓSTICO, junto al diagnóstico y al plan de acción:
 *   AUD_ITEMS        catálogo de puntos (se edita en la planilla; solo se usan los de ESTADO «Aprobado» o «Propuesta»)
 *   AUDITORIAS       una fila por auditoría (plan, estado y resultado)
 *   AUD_RESPUESTAS   una fila por punto y lugar respondido
 *   AUD_HALLAZGOS    una fila por hallazgo; al aprobarlos pasan a PLAN_ACCION
 * Tipos: Documental (trimestral) · De campo (semestral) · Interna (la hace el referente; queda «Para verificar») ·
 *        Verificación HyS · Seguimiento · Extraordinaria.
 * Criterios: Ley XI N.º 35 (Código Ambiental del Chubut, Título VII, arts. 74 a 98) y Ley 24.051 por la adhesión del art. 66.
 * Las planillas son el sistema: todo se puede ver y corregir a mano. No envía correos.
 *
 * Desde la versión 10: auditoría por CATEGORÍA y MÓDULOS.
 *   (11/10/2026) Si un edificio tiene varias filas en SITIOS, se suman los módulos de todas. CIT = citostáticos (no es el CIT de Salud Mental).
 *   Categoría: 1 puesto sanitario · 2 ambulatorio (CAPS y dispositivos) · 3 hospital rural · 4 subzonal · 5 zonal o regional.
 *   Se lee de ESTABLECIMIENTOS › CATEGORIA_AUDITORIA (y SITIOS › CATEGORIA_AUDITORIA para CAPS y dispositivos);
 *   si está vacía, se deduce de la tipología REFES. MODULOS: GEN, INT, QX, LAB, AP, CIT, ODO, RX, DEP, FRIO, TRAS, EXT.
 *   Catálogo: AUD_ITEMS_PROPUESTA (columnas CATEGORIAS, MODULO, CRITICO_EN, RESPUESTA, LISTA_REFERENTE, OBS_PRECARGADA);
 *   si no existe, se usa AUD_ITEMS como antes. Ejecutar una vez instalarAuditoriaPorCategoria().
 */

const AUD_H = ['ID_AUD', 'ESTABLECIMIENTO', 'TIPO', 'ORIGEN', 'LUGARES', 'EJES', 'SOLO_LISTA_CORTA', 'FECHA', 'AUDITOR', 'AUDITADOS', 'ESTADO',
  'ID_AUD_PREVIA', 'PUNTOS', 'RESPONDIDOS', 'CUMPLIMIENTO', 'NC_MAYOR', 'NC_MENOR', 'OBSERVACIONES_N', 'MEJORAS_N', 'RESULTADO', 'CODIGO_INFORME', 'CREADA', 'ACTUALIZADO', 'OBSERVACIONES',
  'CATEGORIA', 'MODALIDAD', 'CRITICOS_OK'];   // las tres últimas: desde la versión 10 (se agregan solas)
const AUD_R_H = ['ID_AUD', 'CODIGO', 'LUGAR', 'RESPUESTA', 'NOTA', 'FOTO', 'FECHA', 'QUIEN'];
const AUD_HA_H = ['ID_HALLAZGO', 'ID_AUD', 'ESTABLECIMIENTO', 'CODIGO', 'LUGAR', 'CLASIFICACION', 'DESCRIPCION', 'CRITERIO', 'EVIDENCIA', 'ACCION', 'RESPONSABLE', 'PLAZO', 'ESTADO', 'EN_PLAN', 'FECHA', 'ACTUALIZADO'];
const AUD_TIPOS = ['Documental', 'De campo', 'Interna', 'Verificación HyS', 'Verificación remota', 'Seguimiento', 'Extraordinaria'];
const AUD_CATS = { 1: 'Puesto sanitario', 2: 'Ambulatorio (CAPS y dispositivos)', 3: 'Hospital rural', 4: 'Hospital subzonal', 5: 'Hospital zonal o regional' };
const AUD_MODS = ['GEN', 'INT', 'QX', 'LAB', 'AP', 'CIT', 'ODO', 'RX', 'DEP', 'FRIO', 'TRAS', 'EXT'];
const AUD_MODS_DEF = { 1: '', 2: '', 3: 'GEN, INT, DEP', 4: 'GEN, INT, DEP, LAB, QX', 5: 'GEN, INT, DEP, LAB, QX, TRAS' };   // si MODULOS está vacío
const AUD_ESTADOS = ['Planificada', 'En curso', 'Para verificar', 'Con hallazgos', 'Cerrada'];
const AUD_RESP = ['C', 'NC', 'Obs', 'NA'];   // Conforme · No conforme · Observación · No aplica
const AUD_CLASES = ['No conformidad mayor', 'No conformidad menor', 'Observación', 'Oportunidad de mejora'];
const AUD_PLAZO = { 'No conformidad mayor': 30, 'No conformidad menor': 90, 'Observación': '', 'Oportunidad de mejora': '' };

// ------------------------------------------------------------------ Hojas (se crean solas la primera vez)
function audHoja_(nombre, H, titulo, ayuda) {
  const dg = pDG_(); let sh = dg.getSheetByName(nombre);
  if (!sh) {
    sh = dg.insertSheet(nombre);
    sh.getRange(1, 1).setValue(titulo).setFontSize(16).setFontWeight('bold').setFontColor('#0D313F');
    sh.getRange(2, 1).setValue(ayuda).setFontStyle('italic').setFontColor('#4F616B');
    sh.getRange(5, 1, 1, H.length).setValues([H]).setFontWeight('bold').setFontColor('#FFFFFF').setBackground('#0D313F').setWrap(true);
    sh.setFrozenRows(5);
  } else {
    const n = sh.getLastColumn(), cab = sh.getRange(5, 1, 1, Math.max(n, 1)).getValues()[0].map(String);
    H.forEach((h, j) => { if (cab[j] !== h && cab.indexOf(h) < 0 && j >= n) sh.getRange(5, j + 1).setValue(h).setFontWeight('bold').setFontColor('#FFFFFF').setBackground('#0D313F'); });
  }
  return sh;
}
const audHojaA_ = () => audHoja_('AUDITORIAS', AUD_H, 'Auditorías de gestión de residuos', 'Una fila por auditoría. Se carga desde el portal (Residuos › Auditorías). Los resultados se calculan al cerrar la auditoría.');
const audHojaR_ = () => audHoja_('AUD_RESPUESTAS', AUD_R_H, 'Respuestas de las auditorías', 'Una fila por punto y lugar. RESPUESTA: C (conforme), NC (no conforme), Obs (observación), NA (no aplica).');
const audHojaH_ = () => audHoja_('AUD_HALLAZGOS', AUD_HA_H, 'Hallazgos de las auditorías', 'Se generan al cerrar la auditoría (un hallazgo por «No conforme» u «Observación»). Al aprobarlos pasan al Plan de acción.');

const audF_ = v => v instanceof Date ? Utilities.formatDate(v, TZ, 'yyyy-MM-dd') : String(v == null ? '' : v).trim();
function audLeer_(sh, H) {
  const n = sh.getLastRow() - 5; if (n < 1) return [];
  return sh.getRange(6, 1, n, H.length).getValues().map((r, i) => { const o = { fila: 6 + i }; H.forEach((h, j) => o[h] = audF_(r[j])); return o; }).filter(o => o[H[0]]);
}
const audHoy_ = () => Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd');

// ------------------------------------------------------------------ Catálogo
function audItems_() {
  const sh = pDG_().getSheetByName('AUD_ITEMS_PROPUESTA') || pDG_().getSheetByName('AUD_ITEMS'); if (!sh) return [];
  const H = sh.getRange(5, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
  return pTabla_(sh, H.length).map(r => { const o = {}; H.forEach((h, j) => o[h] = audF_(r.v[j])); return o; })
    .filter(o => o.CODIGO && !/^inactivo/i.test(o.ESTADO))
    .sort((a, b) => a.CODIGO.localeCompare(b.CODIGO, 'es', { numeric: true }));
}
// ------------------------------------------------------------------ Categoría y módulos (perfil)
const audLista_ = v => String(v || '').split(/[,;|]/).map(t => t.trim().toUpperCase()).filter(Boolean);
function audCatDe_(tipo, tipologia) {
  const t = sinTildes_(tipologia || '').toLowerCase(), k = sinTildes_(tipo || '').toLowerCase();
  if (/puesto/.test(k)) return 1;
  if (/alto riesgo/.test(t)) return 5;
  if (/mediano riesgo/.test(t)) return 4;
  if (/bajo riesgo|internacion/.test(t)) return 3;
  if (/regional|zonal/.test(k) && !t) return 5;
  if (/subzonal/.test(k) && !t) return 4;
  return 2;
}
function audTablaBC_(nombre) {
  const sh = pBC_().getSheetByName(nombre); if (!sh) return { H: [], F: [] };
  const H = sh.getRange(5, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
  return { H: H, F: pTabla_(sh, H.length), v: (r, c) => H.indexOf(c) >= 0 ? audF_(r.v[H.indexOf(c)]) : '' };
}
// Perfil de cada establecimiento y de cada lugar (edificio, CAPS o dispositivo) de un grupo
// Caché (14.22): perfiles y lugares cambian poco y calcularlos abre varias hojas. Se renuevan al cerrar un perfil (diagPerfilABase_) o a los 30 minutos.
function audCache_(clave, fn, seg) {
  const c = CacheService.getScriptCache(), k = clave + '_' + (c.get('aud_gen') || '0');
  try { const v = c.get(k); if (v) return JSON.parse(v); } catch (e) {}
  const o = fn(); try { c.put(k, JSON.stringify(o), seg || 1800); } catch (e) {} return o;
}
function audCacheRenovar_() { CacheService.getScriptCache().put('aud_gen', String(Date.now()), 21600); }
function audPerfiles_(cod) { return audCache_('aud_perf_' + limpio_(cod), () => audPerfilesCalc_(cod)); }
function audPerfilesCalc_(cod) {
  const E = audTablaBC_('ESTABLECIMIENTOS'), est = {};
  E.F.forEach(r => { const c = limpio_(r.v[0]); if (!c) return;
    const cat = parseInt(E.v(r, 'CATEGORIA_AUDITORIA'), 10) || audCatDe_(E.v(r, 'TIPO'), E.v(r, 'TIPOLOGIA_REFES'));
    const m = E.v(r, 'MODULOS'); est[c] = { cod: c, cat: cat, mods: /^ninguno/i.test(m) ? [] : audLista_(m || AUD_MODS_DEF[cat]) }; });
  const G = nteGrupo_(cod), S = audTablaBC_('SITIOS'), lug = {};
  S.F.filter(r => G.codigos.indexOf(limpio_(r.v[0])) >= 0).forEach(r => {
    const c = limpio_(r.v[0]), sitio = S.v(r, 'SITIO'), ed = nteEdif_(S.v(r, 'EDIFICIO')) || sitio, tipo = S.v(r, 'TIPO');
    const esSitio = /caps|dispositivo/i.test(tipo), base = est[c] || { cod: c, cat: 2, mods: [] };
    const cat = parseInt(S.v(r, 'CATEGORIA_AUDITORIA'), 10) || (esSitio ? 2 : base.cat), m = S.v(r, 'MODULOS');
    const p = { cod: c, lugar: ed, cat: cat, mods: m ? (/^ninguno/i.test(m) ? [] : audLista_(m)) : (esSitio ? [] : base.mods), frecuencia: S.v(r, 'FRECUENCIA_PACTADA') };
    // Varias filas del mismo edificio (p. ej. Sede ex ADOS: Consultorios Externos, PROSATE, Oncología): se suman sus módulos.
    // Manda la categoría del edificio principal; la frecuencia, la primera conocida.
    const prev = lug[ed];
    if (!prev) lug[ed] = p;
    else {
      const base2 = (!esSitio && prev.cat === 2) ? p : prev, otro = base2 === p ? prev : p;
      base2.mods = Array.from(new Set(base2.mods.concat(otro.mods)));
      if (!base2.frecuencia || /^s\/d/i.test(base2.frecuencia)) base2.frecuencia = otro.frecuencia;
      lug[ed] = base2;
    } });
  const dueno = est[limpio_(cod)] || est[G.duenio] || { cod: cod, cat: 2, mods: [] };
  lug.Establecimiento = Object.assign({ lugar: 'Establecimiento', frecuencia: '' }, dueno);
  return lug;
}
const audPerfilLugar_ = (P, lugar) => P[lugar] || P.Establecimiento;

// ¿El punto corresponde a este lugar? Documentales: solo «Establecimiento». De campo: todo lugar menos «Establecimiento».
// Catálogo nuevo: por CATEGORIAS y MODULO. Catálogo viejo (sin CATEGORIAS): como antes.
const audTipoLugar_ = l => l === 'Establecimiento' ? 'Establecimiento' : /(caps|cit\b|centro de d[ií]a|pichi|viviendas|hilando|prosate|puesto)/i.test(sinTildes_(l)) ? 'Sitio' : 'Hospital';
function audAplica_(it, lugar, perfil) {
  const t = audTipoLugar_(lugar);
  if (it.TIPO === 'Documental') { if (t !== 'Establecimiento') return false; }
  else if (t === 'Establecimiento') return false;
  if ('CATEGORIAS' in it) {
    const p = perfil || { cat: 2, mods: [] };
    if (audLista_(it.CATEGORIAS).indexOf(String(p.cat)) < 0) return false;
    const m = audLista_(it.MODULO); return !m.length || m.some(x => p.mods.indexOf(x) >= 0);
  }
  if (it.TIPO === 'Documental') return true;
  const a = sinTildes_(it.APLICA_A || 'Todos').toLowerCase();
  return /^todos/.test(a) || t === 'Hospital';
}
const audCritico_ = (it, cat) => 'CRITICO_EN' in it ? audLista_(it.CRITICO_EN).indexOf(String(cat)) >= 0 : /^s/i.test(it.CRITICO);
const audCorta_ = (it, cat) => 'LISTA_REFERENTE' in it ? audLista_(it.LISTA_REFERENTE).indexOf(String(cat)) >= 0 : /^s/i.test(it.LISTA_CORTA);
const audEsObs_ = it => /^observ/i.test(it.RESPUESTA || '');
// Texto precargado de la observación (F3, G4), con la frecuencia de retiro del lugar si se conoce
const audPrecarga_ = (it, p) => !it.OBS_PRECARGADA ? '' : it.OBS_PRECARGADA.replace('Frecuencia de retiro: ___.', 'Frecuencia de retiro: ' + (p && p.frecuencia && !/^s\/d/i.test(p.frecuencia) ? p.frecuencia : '___') + '.');

// Lugares del establecimiento (de SITIOS, agrupados por edificio) para elegir el alcance
function audLugares_(cod) { return audCache_('aud_lug_' + limpio_(cod), () => audLugaresCalc_(cod)); }
function audLugaresCalc_(cod) {
  const G = nteGrupo_(cod), L = nteLugares_(G), set = {};
  Object.keys(L.fichas).forEach(ed => { if (ed && !NTE_SIN_LUGAR.test(ed)) set[ed] = 1; });
  return ['Establecimiento'].concat(Object.keys(set).sort((a, b) => a.localeCompare(b, 'es')));
}

// ------------------------------------------------------------------ Portal: lista y programa
function audListar_(x) {
  const cod = limpio_(x && x.cod), A = audLeer_(audHojaA_(), AUD_H).filter(a => !cod || a.ESTABLECIMIENTO === cod)
    .sort((a, b) => (b.FECHA || b.CREADA).localeCompare(a.FECHA || a.CREADA));
  const H = audLeer_(audHojaH_(), AUD_HA_H).filter(h => !cod || h.ESTABLECIMIENTO === cod);
  const anio = audHoy_().slice(0, 4), delAnio = A.filter(a => (a.FECHA || '').slice(0, 4) === anio);
  const ultimaCampo = A.find(a => /campo|verificaci/i.test(a.TIPO) && a.ESTADO !== 'Planificada' && a.CUMPLIMIENTO);
  const abiertas = H.filter(h => /^no conformidad/i.test(h.CLASIFICACION) && !/cumplid|descartad|cerrad/i.test(h.ESTADO));
  return { ok: true, auditorias: A, tipos: AUD_TIPOS, estados: AUD_ESTADOS,
    kpis: { realizadas: delAnio.filter(a => a.ESTADO !== 'Planificada').length, programadas: delAnio.length,
      cumplimiento: ultimaCampo ? ultimaCampo.CUMPLIMIENTO : '', ncAbiertas: abiertas.length,
      ncMayores: abiertas.filter(h => /mayor/i.test(h.CLASIFICACION)).length,
      paraVerificar: A.filter(a => a.ESTADO === 'Para verificar').length } };
}

// ------------------------------------------------------------------ Planificar
function audOpciones_(x) {
  const P = audPerfiles_(x.cod), cat = P.Establecimiento.cat, ejes = {};
  audItems_().filter(i => !('CATEGORIAS' in i) || audLista_(i.CATEGORIAS).indexOf(String(cat)) >= 0).forEach(i => {
    const e = i.EJE || 's/d'; ejes[e] = ejes[e] || { eje: e, puntos: 0, corta: 0, criticos: 0 }; ejes[e].puntos++;
    if (audCorta_(i, cat)) ejes[e].corta++; if (audCritico_(i, cat)) ejes[e].criticos++; });
  const lugares = audLugares_(x.cod);
  return { ok: true, tipos: AUD_TIPOS, lugares: lugares, ejes: Object.keys(ejes).sort().map(k => ejes[k]),
    categoria: cat, categoriaTxt: AUD_CATS[cat], modulos: P.Establecimiento.mods,
    perfiles: lugares.map(l => { const p = audPerfilLugar_(P, l); return { lugar: l, cat: p.cat, categoriaTxt: AUD_CATS[p.cat], modulos: p.mods }; }) };
}
function audCrear_(x) {
  return conLock_(() => {
    const d = x.datos || x, cod = limpio_(d.cod); if (!cod) return { ok: false, mensaje: 'Falta el establecimiento.' };
    if (AUD_TIPOS.indexOf(d.tipo) < 0) return { ok: false, mensaje: 'Tipo de auditoría no válido.' };
    const sh = audHojaA_(), hoy = audHoy_(), A = audLeer_(sh, AUD_H);
    const n = A.filter(a => a.ID_AUD.indexOf('AUD-' + cod + '-' + hoy.slice(0, 4)) === 0).length + 1;
    const id = 'AUD-' + cod + '-' + hoy.slice(0, 4) + '-' + ('00' + n).slice(-3);
    const lugares = (d.lugares || []).filter(Boolean), ejes = (d.ejes || []).filter(Boolean), corta = d.tipo === 'Interna' || !!d.soloCorta;
    const PF = audPerfiles_(cod), puntos = audPuntos_(cod, lugares, ejes, corta, d.tipo).length, cat = (lugares.length === 1 ? audPerfilLugar_(PF, lugares[0]) : PF.Establecimiento).cat;   // categoría del lugar auditado
    const modalidad = d.modalidad || (d.tipo === 'Interna' ? 'Autoevaluación' : d.tipo === 'Verificación remota' ? 'Remota' : d.tipo === 'Documental' ? 'Documental' : 'Presencial');
    const fila = { ID_AUD: id, ESTABLECIMIENTO: cod, TIPO: d.tipo, ORIGEN: d.origen || (d.tipo === 'Interna' ? 'Referente' : 'HyS'), LUGARES: lugares.join(' | '), EJES: ejes.join(' | '),
      SOLO_LISTA_CORTA: corta ? 'Sí' : 'No', FECHA: d.fecha || hoy, AUDITOR: d.auditor || '', AUDITADOS: d.auditados || '', ESTADO: 'Planificada', ID_AUD_PREVIA: d.previa || '',
      PUNTOS: puntos, RESPONDIDOS: 0, CREADA: hoy, ACTUALIZADO: hoy, CATEGORIA: cat + ' · ' + AUD_CATS[cat], MODALIDAD: modalidad };
    sh.getRange(Math.max(sh.getLastRow(), 5) + 1, 1, 1, AUD_H.length).setValues([AUD_H.map(h => fila[h] == null ? '' : fila[h])]);
    return { ok: true, id: id, puntos: puntos };
  });
}
// Puntos que corresponden a un plan: cada punto de campo por cada lugar donde aplica; los documentales una vez («Establecimiento»)
function audPuntos_(cod, lugares, ejes, corta, tipo) {
  const P = audPerfiles_(cod), items = audItems_().filter(i => (!ejes.length || ejes.indexOf(i.EJE) >= 0) && !(tipo === 'Documental' && i.TIPO !== 'Documental'));
  const out = []; lugares.forEach(l => { const p = audPerfilLugar_(P, l);
    items.forEach(i => { if (audAplica_(i, l, p) && (!corta || audCorta_(i, p.cat))) out.push({ it: i, lugar: l, perfil: p }); }); });
  return out;
}

// ------------------------------------------------------------------ Ejecutar
function audAbrir_(x) {
  const A = audLeer_(audHojaA_(), AUD_H).find(a => a.ID_AUD === x.id); if (!A) return { ok: false, mensaje: 'No encontré la auditoría ' + x.id + '.' };
  const lugares = A.LUGARES ? A.LUGARES.split(' | ') : [], ejes = A.EJES ? A.EJES.split(' | ') : [];
  const P = audPuntos_(A.ESTABLECIMIENTO, lugares, ejes, A.SOLO_LISTA_CORTA === 'Sí', A.TIPO), R = {};
  audLeer_(audHojaR_(), AUD_R_H).filter(r => r.ID_AUD === A.ID_AUD).forEach(r => R[r.CODIGO + '|' + r.LUGAR] = { respuesta: r.RESPUESTA, nota: r.NOTA, foto: r.FOTO, fila: r.fila });
  const simple = A.ORIGEN === 'Referente';
  return { ok: true, auditoria: A, opciones: AUD_RESP, puntos: P.map(p => ({ codigo: p.it.CODIGO, eje: p.it.EJE, lugar: p.lugar, critico: audCritico_(p.it, p.perfil.cat),
    soloObs: audEsObs_(p.it), opciones: audEsObs_(p.it) ? ['Obs', 'NA'] : AUD_RESP, precarga: audPrecarga_(p.it, p.perfil),
    texto: simple && p.it.PREGUNTA_REFERENTE && p.it.PREGUNTA_REFERENTE !== '—' ? p.it.PREGUNTA_REFERENTE : p.it.PUNTO,
    ayuda: simple ? (p.it.AYUDA_REFERENTE || '') : '', criterio: simple ? '' : p.it.CRITERIO, evidencia: p.it.EVIDENCIA,
    r: R[p.it.CODIGO + '|' + p.lugar] || null })) };
}
// Guarda un lote de respuestas (las nuevas se agregan; las existentes se corrigen). «NC» sin nota ni foto no se acepta.
function audResponder_(x) {
  return conLock_(() => {
    const shA = audHojaA_(), A = audLeer_(shA, AUD_H).find(a => a.ID_AUD === x.id); if (!A) return { ok: false, mensaje: 'No encontré la auditoría.' };
    if (A.ESTADO === 'Cerrada') return { ok: false, mensaje: 'La auditoría está cerrada.' };
    const sh = audHojaR_(), prev = {}, hoy = audHoy_(), nuevas = [], faltan = [];
    audLeer_(sh, AUD_R_H).filter(r => r.ID_AUD === A.ID_AUD).forEach(r => prev[r.CODIGO + '|' + r.LUGAR] = r);
    const obsSolo = {}; audItems_().forEach(i => { if (audEsObs_(i)) obsSolo[i.CODIGO] = true; });
    (x.respuestas || []).forEach(r => {
      if (AUD_RESP.indexOf(r.respuesta) < 0) return;
      if (obsSolo[r.codigo] && (r.respuesta === 'C' || r.respuesta === 'NC')) r.respuesta = 'Obs';   // F3, G4: siempre observación
      if (r.respuesta === 'NC' && !String(r.nota || '').trim() && !r.foto) { faltan.push(r.codigo + ' · ' + r.lugar); return; }
      const v = [A.ID_AUD, r.codigo, r.lugar, r.respuesta, String(r.nota || '').trim(), r.foto || '', hoy, x.quien || A.AUDITOR];
      const p = prev[r.codigo + '|' + r.lugar];
      if (p) sh.getRange(p.fila, 1, 1, AUD_R_H.length).setValues([v]); else nuevas.push(v);
    });
    if (nuevas.length) sh.getRange(Math.max(sh.getLastRow(), 5) + 1, 1, nuevas.length, AUD_R_H.length).setValues(nuevas);
    const resp = audLeer_(sh, AUD_R_H).filter(r => r.ID_AUD === A.ID_AUD).length;
    audSet_(shA, A.fila, { RESPONDIDOS: resp, ESTADO: A.ESTADO === 'Planificada' ? 'En curso' : A.ESTADO, ACTUALIZADO: hoy });
    return { ok: true, respondidos: resp, faltaEvidencia: faltan };
  });
}
function audSet_(sh, fila, cambios) { Object.keys(cambios).forEach(k => { const j = AUD_H.indexOf(k); if (j >= 0) sh.getRange(fila, j + 1).setValue(cambios[k]); }); }

// Foto de evidencia (base64) → carpeta del establecimiento › Auditorías › ID
function audFoto_(x) {
  const A = audLeer_(audHojaA_(), AUD_H).find(a => a.ID_AUD === x.id); if (!A) return { ok: false, mensaje: 'No encontré la auditoría.' };
  // Las auditorías de residuos van a la carpeta del establecimiento dentro del Módulo 1 · Residuos (hoja LIBROS)
  const E0 = est_(A.ESTABLECIMIENTO); let raiz = null; try { if (E0 && E0.carpeta) raiz = DriveApp.getFolderById(E0.carpeta); } catch (e) {}
  raiz = raiz || audCarpetaEst_(A.ESTABLECIMIENTO); if (!raiz) return { ok: false, mensaje: 'El establecimiento no tiene carpeta en ESTABLECIMIENTOS › CARPETA.' };
  const dir = carpeta_(carpeta_(raiz, 'Auditorías'), A.ID_AUD);
  const blob = Utilities.newBlob(Utilities.base64Decode(String(x.base64).replace(/^data:[^,]+,/, '')), x.tipo || 'image/jpeg', (x.codigo || 'foto') + '_' + Date.now() + '.jpg');
  const f = dir.createFile(blob); return { ok: true, url: f.getUrl() };
}
function audCarpetaEst_(cod) {
  const sh = pBC_().getSheetByName('ESTABLECIMIENTOS'), H = sh.getRange(5, 1, 1, sh.getLastColumn()).getValues()[0].map(String), j = H.indexOf('CARPETA');
  if (j < 0) return null;
  const r = pTabla_(sh, H.length).find(r => limpio_(r.v[0]) === cod), m = r ? String(r.v[j]).match(/[-\w]{25,}/) : null;
  try { return m ? DriveApp.getFolderById(m[0]) : null; } catch (e) { return null; }
}

// ------------------------------------------------------------------ Cerrar: resultado y hallazgos
function audCerrar_(x) {
  return conLock_(() => {
    const shA = audHojaA_(), A = audLeer_(shA, AUD_H).find(a => a.ID_AUD === x.id); if (!A) return { ok: false, mensaje: 'No encontré la auditoría.' };
    const items = {}; audItems_().forEach(i => items[i.CODIGO] = i);
    const R = audLeer_(audHojaR_(), AUD_R_H).filter(r => r.ID_AUD === A.ID_AUD);
    if (!R.length) return { ok: false, mensaje: 'La auditoría no tiene respuestas.' };
    const PF = audPerfiles_(A.ESTABLECIMIENTO), critico = r => audCritico_(items[r.CODIGO] || {}, audPerfilLugar_(PF, r.LUGAR).cat);
    // el cumplimiento cuenta los puntos que se evalúan con Cumple / No cumple; las observaciones (F3, G4) no suman ni restan
    const aplican = R.filter(r => r.RESPUESTA !== 'NA' && !audEsObs_(items[r.CODIGO] || {})), conf = aplican.filter(r => r.RESPUESTA === 'C' || r.RESPUESTA === 'Obs').length;
    const pct = aplican.length ? Math.round(conf * 100 / aplican.length) : '';
    const crit = aplican.filter(critico), critOk = crit.filter(r => r.RESPUESTA !== 'NC').length;
    const shH = audHojaH_(), prev = audLeer_(shH, AUD_HA_H).filter(h => h.ID_AUD === A.ID_AUD), hoy = audHoy_(), nuevos = [];
    let may = 0, men = 0, obs = 0;
    R.filter(r => r.RESPUESTA === 'NC' || r.RESPUESTA === 'Obs').forEach(r => {
      const it = items[r.CODIGO] || {}, clase = r.RESPUESTA === 'Obs' ? 'Observación' : (critico(r) ? 'No conformidad mayor' : 'No conformidad menor');
      if (clase === 'No conformidad mayor') may++; else if (clase === 'No conformidad menor') men++; else obs++;
      if (prev.some(h => h.CODIGO === r.CODIGO && h.LUGAR === r.LUGAR)) return;   // no duplica si se vuelve a cerrar
      const n = prev.length + nuevos.length + 1;
      nuevos.push([A.ID_AUD + '-H' + ('0' + n).slice(-2), A.ID_AUD, A.ESTABLECIMIENTO, r.CODIGO, r.LUGAR, clase, (it.PUNTO || r.CODIGO) + (r.NOTA ? ' · ' + r.NOTA : ''),
        it.CRITERIO || '', r.FOTO || r.NOTA || '', clase === 'Observación' ? '' : (it.ACCION_SUGERIDA || ''), '', AUD_PLAZO[clase] === '' ? 'Próxima auditoría' : AUD_PLAZO[clase] + ' días',   // acción sugerida del catálogo (se revisa antes de pasar al plan)
        A.ORIGEN === 'Referente' ? 'Para verificar' : 'Propuesto', 'No', hoy, hoy]);
    });
    if (nuevos.length) shH.getRange(Math.max(shH.getLastRow(), 5) + 1, 1, nuevos.length, AUD_HA_H.length).setValues(nuevos);
    const mej = audLeer_(shH, AUD_HA_H).filter(h => h.ID_AUD === A.ID_AUD && h.CLASIFICACION === 'Oportunidad de mejora').length;
    const resultado = may ? 'Con no conformidad mayor' : men ? 'Con no conformidades menores' : obs ? 'Conforme con observaciones' : 'Conforme';
    audSet_(shA, A.fila, { CRITICOS_OK: crit.length ? critOk + ' de ' + crit.length : '', CUMPLIMIENTO: pct === '' ? '' : pct + ' %', NC_MAYOR: may, NC_MENOR: men, OBSERVACIONES_N: obs, MEJORAS_N: mej, RESULTADO: resultado,
      ESTADO: A.ORIGEN === 'Referente' ? 'Para verificar' : (may + men + obs ? 'Con hallazgos' : 'Cerrada'), ACTUALIZADO: hoy });
    return { ok: true, cumplimiento: pct, criticos: crit.length ? critOk + ' de ' + crit.length : '', resultado: resultado, hallazgos: may + men + obs };
  });
}

// Cumplimiento por eje (para la pantalla de resultado) y comparación con la auditoría anterior del mismo tipo y establecimiento
function audResultado_(x) {
  const todas = audLeer_(audHojaA_(), AUD_H), A = todas.find(a => a.ID_AUD === x.id); if (!A) return { ok: false, mensaje: 'No encontré la auditoría.' };
  const items = {}; audItems_().forEach(i => items[i.CODIGO] = i); const R = audLeer_(audHojaR_(), AUD_R_H);
  const porEje = id => { const m = {}; R.filter(r => r.ID_AUD === id && r.RESPUESTA !== 'NA' && !audEsObs_(items[r.CODIGO] || {})).forEach(r => { const e = (items[r.CODIGO] || {}).EJE || 's/d'; m[e] = m[e] || { c: 0, t: 0 }; m[e].t++; if (r.RESPUESTA !== 'NC') m[e].c++; }); return m; };
  const ant = todas.filter(a => a.ESTABLECIMIENTO === A.ESTABLECIMIENTO && a.TIPO === A.TIPO && a.ID_AUD !== A.ID_AUD && (a.FECHA || '') < (A.FECHA || '') && a.CUMPLIMIENTO).sort((a, b) => b.FECHA.localeCompare(a.FECHA))[0];
  const E = porEje(A.ID_AUD), P = ant ? porEje(ant.ID_AUD) : {};
  return { ok: true, auditoria: A, anterior: ant ? ant.ID_AUD : '', ejes: Object.keys(E).sort().map(e => ({ eje: e, pct: Math.round(E[e].c * 100 / E[e].t), anterior: P[e] ? Math.round(P[e].c * 100 / P[e].t) : null })),
    hallazgos: audLeer_(audHojaH_(), AUD_HA_H).filter(h => h.ID_AUD === A.ID_AUD) };
}

// ------------------------------------------------------------------ Hallazgos: edición y paso al plan de acción
function audHallazgos_(x) {
  const H = audLeer_(audHojaH_(), AUD_HA_H).filter(h => (!x.id || h.ID_AUD === x.id) && (!x.cod || h.ESTABLECIMIENTO === limpio_(x.cod)));
  return { ok: true, hallazgos: H, clases: AUD_CLASES };
}
function audHallazgoGuardar_(x) {
  return conLock_(() => {
    const sh = audHojaH_(), H = audLeer_(sh, AUD_HA_H), d = x.datos || {}, hoy = audHoy_();
    if (!d.ID_HALLAZGO) {   // nuevo (por ejemplo, una oportunidad de mejora que no sale de un punto)
      const A = audLeer_(audHojaA_(), AUD_H).find(a => a.ID_AUD === x.id); if (!A) return { ok: false, mensaje: 'No encontré la auditoría.' };
      const n = H.filter(h => h.ID_AUD === A.ID_AUD).length + 1, o = Object.assign({ CLASIFICACION: 'Oportunidad de mejora' }, d,
        { ID_HALLAZGO: A.ID_AUD + '-H' + ('0' + n).slice(-2), ID_AUD: A.ID_AUD, ESTABLECIMIENTO: A.ESTABLECIMIENTO, ESTADO: 'Propuesto', EN_PLAN: 'No', FECHA: hoy, ACTUALIZADO: hoy });
      sh.getRange(Math.max(sh.getLastRow(), 5) + 1, 1, 1, AUD_HA_H.length).setValues([AUD_HA_H.map(h => o[h] == null ? '' : o[h])]);
      return { ok: true, id: o.ID_HALLAZGO };
    }
    const h = H.find(o => o.ID_HALLAZGO === d.ID_HALLAZGO); if (!h) return { ok: false, mensaje: 'No encontré el hallazgo.' };
    ['CLASIFICACION', 'DESCRIPCION', 'ACCION', 'RESPONSABLE', 'PLAZO', 'ESTADO'].forEach(k => { if (k in d) sh.getRange(h.fila, AUD_HA_H.indexOf(k) + 1).setValue(d[k]); });
    sh.getRange(h.fila, AUD_HA_H.indexOf('ACTUALIZADO') + 1).setValue(hoy);
    return { ok: true };
  });
}
// Pasa al PLAN_ACCION los hallazgos aprobados de una auditoría (no los de «Para verificar»; no duplica)
function audAlPlan_(x) {
  return conLock_(() => {
    const sh = audHojaH_(), H = audLeer_(sh, AUD_HA_H).filter(h => h.ID_AUD === x.id && h.EN_PLAN !== 'Sí' && h.ESTADO !== 'Para verificar' && h.ACCION);
    if (!H.length) return { ok: true, pasados: 0, mensaje: 'No hay hallazgos con acción definida para pasar al plan.' };
    const ps = planHoja_(), hoy = audHoy_(), filas = H.map((h, k) => {
      const dias = parseInt(h.PLAZO, 10);
      return [x.id, x.id, h.ESTABLECIMIENTO, k + 1, h.CODIGO, h.ACCION, h.LUGAR, 'Auditoría · ' + h.CLASIFICACION, '', h.RESPONSABLE, /mayor/i.test(h.CLASIFICACION) ? 'Alta' : /menor/i.test(h.CLASIFICACION) ? 'Media' : 'Baja',
        isNaN(dias) ? h.PLAZO : dias + ' días', '', '', '', '', '', 'Pendiente', '', 'Hallazgo ' + h.ID_HALLAZGO + ': ' + h.DESCRIPCION, hoy];
    });
    ps.getRange(Math.max(ps.getLastRow(), 5) + 1, 1, filas.length, PLAN_H.length).setValues(filas);
    H.forEach(h => { sh.getRange(h.fila, AUD_HA_H.indexOf('EN_PLAN') + 1).setValue('Sí'); sh.getRange(h.fila, AUD_HA_H.indexOf('ESTADO') + 1).setValue('En el plan'); });
    return { ok: true, pasados: filas.length };
  });
}
// Verificación HyS de una auditoría interna: pasa sus hallazgos a «Propuesto» y la auditoría a «Con hallazgos» o «Cerrada»
function audVerificar_(x) {
  return conLock_(() => {
    const shA = audHojaA_(), A = audLeer_(shA, AUD_H).find(a => a.ID_AUD === x.id); if (!A) return { ok: false, mensaje: 'No encontré la auditoría.' };
    const sh = audHojaH_(), H = audLeer_(sh, AUD_HA_H).filter(h => h.ID_AUD === A.ID_AUD && h.ESTADO === 'Para verificar');
    H.forEach(h => sh.getRange(h.fila, AUD_HA_H.indexOf('ESTADO') + 1).setValue('Propuesto'));
    audSet_(shA, A.fila, { ESTADO: H.length ? 'Con hallazgos' : 'Cerrada', ACTUALIZADO: audHoy_(), OBSERVACIONES: (A.OBSERVACIONES ? A.OBSERVACIONES + ' · ' : '') + 'Verificada por HyS el ' + audHoy_() });
    return { ok: true, verificados: H.length };
  });
}

// ------------------------------------------------------------------ Página para referentes (auditoría interna)
// Acciones «a_…» con la clave del establecimiento (la misma de los manifiestos). Solo ven y editan sus propias auditorías internas.
function audRed_(d) {
  const cod = limpio_(d.est), x = d.datos || {};
  const propia = id => { const A = audLeer_(audHojaA_(), AUD_H).find(a => a.ID_AUD === id); return A && A.ESTABLECIMIENTO === cod && A.ORIGEN === 'Referente' ? A : null; };
  switch (d.accion) {
    case 'a_listar': return { ok: true, auditorias: audLeer_(audHojaA_(), AUD_H).filter(a => a.ESTABLECIMIENTO === cod && a.ORIGEN === 'Referente')
      .sort((a, b) => (b.FECHA || '').localeCompare(a.FECHA || '')).slice(0, 20)
      .map(a => ({ id: a.ID_AUD, fecha: a.FECHA, lugares: a.LUGARES, estado: a.ESTADO, puntos: a.PUNTOS, respondidos: a.RESPONDIDOS, auditor: a.AUDITOR })) };
    case 'a_opciones': return { ok: true, lugares: audLugares_(cod).filter(l => l !== 'Establecimiento') };
    case 'a_crear': {
      if (!(x.lugares || []).length) return { ok: false, mensaje: 'Elegí al menos un lugar.' };
      if (!String(x.auditor || '').trim()) return { ok: false, mensaje: 'Escribí tu nombre.' };
      return audCrear_({ cod: cod, tipo: 'Interna', origen: 'Referente', lugares: x.lugares, ejes: [], soloCorta: true, fecha: audHoy_(), auditor: String(x.auditor).trim(), auditados: '' });
    }
    case 'a_abrir': { const A = propia(x.id); if (!A) return { ok: false, mensaje: 'No encontré esa auditoría.' }; return audAbrir_({ id: A.ID_AUD }); }
    case 'a_responder': { const A = propia(x.id); if (!A) return { ok: false, mensaje: 'No encontré esa auditoría.' };
      if (/para verificar|cerrada|hallazgos/i.test(A.ESTADO)) return { ok: false, mensaje: 'Esta auditoría ya se envió a Higiene y Seguridad.' };
      return audResponder_({ id: A.ID_AUD, respuestas: x.respuestas, quien: A.AUDITOR }); }
    case 'a_foto': { const A = propia(x.id); if (!A) return { ok: false, mensaje: 'No encontré esa auditoría.' }; return audFoto_({ id: A.ID_AUD, codigo: x.codigo, base64: x.base64 }); }
    case 'a_enviar': { const A = propia(x.id); if (!A) return { ok: false, mensaje: 'No encontré esa auditoría.' }; return audCerrar_({ id: A.ID_AUD }); }
  }
  return { ok: false, error: 'Acción desconocida.' };
}


// ------------------------------------------------------------------ Instalación (ejecutar una vez desde el editor)
// Agrega CATEGORIA_AUDITORIA y MODULOS al final de ESTABLECIMIENTOS y de SITIOS, y las completa con lo que deduce
// (tipología REFES y valores por defecto). No pisa lo que ya esté cargado. Después se corrigen a mano en la planilla.
function instalarAuditoriaPorCategoria() {
  const bc = pBC_(), hoy = Utilities.formatDate(new Date(), TZ, 'dd/MM/yyyy'), res = [];
  ['ESTABLECIMIENTOS', 'SITIOS'].forEach(nombre => {
    const sh = bc.getSheetByName(nombre); if (!sh) return;
    let H = sh.getRange(5, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
    ['CATEGORIA_AUDITORIA', 'MODULOS'].forEach(c => { if (H.indexOf(c) < 0) { sh.getRange(5, H.length + 1).setValue(c); H.push(c); } });
    const F = pTabla_(sh, H.length), jc = H.indexOf('CATEGORIA_AUDITORIA'), jm = H.indexOf('MODULOS'), v = (r, c) => H.indexOf(c) >= 0 ? audF_(r.v[H.indexOf(c)]) : '';
    const cats = {}; if (nombre === 'SITIOS') { const E = audTablaBC_('ESTABLECIMIENTOS'); E.F.forEach(r => cats[limpio_(r.v[0])] = parseInt(E.v(r, 'CATEGORIA_AUDITORIA'), 10) || audCatDe_(E.v(r, 'TIPO'), E.v(r, 'TIPOLOGIA_REFES'))); }
    let n = 0;
    F.forEach(r => {
      if (audF_(r.v[jc])) return;
      const cat = nombre === 'ESTABLECIMIENTOS' ? audCatDe_(v(r, 'TIPO'), v(r, 'TIPOLOGIA_REFES')) : (/caps|dispositivo/i.test(v(r, 'TIPO')) ? 2 : (cats[limpio_(r.v[0])] || 2));
      sh.getRange(r.fila, jc + 1).setValue(cat);
      if (!audF_(r.v[jm])) sh.getRange(r.fila, jm + 1).setValue(nombre === 'ESTABLECIMIENTOS' ? (AUD_MODS_DEF[cat] || 'Ninguno') : (cat === 2 ? 'Ninguno' : ''));
      n++; });
    sh.getRange(5, jc + 1).setNote('Categoría para auditoría de residuos: 1 puesto sanitario, 2 ambulatorio, 3 hospital rural, 4 subzonal, 5 zonal o regional. Se completó el ' + hoy + ' desde la tipología REFES; se corrige a mano.');
    sh.getRange(5, jm + 1).setNote('Módulos de auditoría, separados por coma: ' + AUD_MODS.join(', ') + '. «Ninguno» = sin módulos. En SITIOS, vacío = los del establecimiento.');
    res.push(nombre + ': ' + n + ' filas completadas');
  });
  audHojaA_();   // agrega CATEGORIA, MODALIDAD y CRITICOS_OK a AUDITORIAS si faltan
  Logger.log(res.join(' · ')); return res.join(' · ');
}