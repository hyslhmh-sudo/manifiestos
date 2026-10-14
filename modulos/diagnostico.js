// Portal HyS · Diagnóstico (motor común de residuos y cocinas)
// Se carga desde portal.html (<script src>). Para el portal de respaldo de Google, herramientas/armar_respaldo.py lo junta en un solo archivo.
// ------------------------------------------------------------------ Diagnóstico de residuos · portal
const DCFG_RES = {
  modo: 'hys',
  abrir: (cod, id) => api('p_diag_abrir', { cod: cod, id: id }),
  guardar: p => api('p_diag_guardar', p),
  foto: p => api('p_diag_foto', p),
  pantalla: html => marco('#diag', html),
  volver: '<a href="#diag" class="peq" style="font-weight:700;text-decoration:none">‹ Todos los diagnósticos</a>',
  extra: () => informesDiag() + compartirDiag(DG.nombre), alPintar: () => { activarCompartir(DG.nombre); activarInformes(); },
  nombre: cod => ((RES && RES.filas.find(f => f.cod === cod)) || { nombre: cod }).nombre,
  alGuardar: r => { if (RES) { const f = RES.filas.find(x => x.cod === DG.cod); if (f) { f.diag = { pct: r.pct, fecha: DG.cab.FECHA, estado: r.estado, criticos: r.criticos }; LS.set('res', RES); } } }
};
let DCFG = DCFG_RES;   // el módulo 4 (cocinas) usa el mismo formulario con su propia configuración (DCFG_COC)
async function diagLista() {
  if (!RES) { const g = LS.get('res', null); if (g) { RES = g; refrescarRes(); } else { cargando('#diag'); try { RES = await api('p_resumen', {}, 240000); LS.set('res', RES); } catch (e) { return; } } }
  const F = RES.filas.slice().sort((a, b) => (a.area + (a.cabecera ? '0' : '1') + a.nombre).localeCompare(b.area + (b.cabecera ? '0' : '1') + b.nombre));
  const con = F.filter(f => f.diag && f.diag.pct !== '' && f.diag.pct != null);
  const prom = con.length ? Math.round(con.reduce((a, f) => a + Number(f.diag.pct), 0) / con.length) : null;
  const kpi = (n, t, s) => '<div class="kpi2"><span>' + t + '</span><b>' + n + '</b><small>' + s + '</small></div>';
  marco('#diag', '<div class="cab"><div><span class="mu peq">1 · Residuos</span><h1>Diagnóstico de residuos</h1><span class="mu">Todas las corrientes, salvo radiactivos y efluentes. Cumple = 1 · Parcial = 0,5 · No cumple = 0 · No aplica no cuenta.</span></div></div>' +
    '<div class="tb5">' + kpi(con.length + ' de ' + F.length, 'Con diagnóstico', 'Establecimientos evaluados') + kpi(prom == null ? '—' : prom + ' %', 'Cumplimiento promedio', 'De los evaluados') +
    kpi(con.filter(f => Number(f.diag.criticos) > 0).length, 'Con puntos críticos', 'Algún punto crítico «No cumple»') + kpi(F.filter(f => f.diag && f.diag.estado === 'Enviado').length, 'Enviados por referentes', 'Para revisar y cerrar') + '</div>' + compartirDiag('') +
    '<section class="card tabla"><table><thead><tr><th>Establecimiento</th><th>Área</th><th>Último diagnóstico</th><th>Resultado</th><th></th></tr></thead><tbody>' +
    F.map(f => '<tr class="cl" data-cod="' + esc(f.cod) + '"><td><b>' + esc(f.nombre) + '</b>' + (f.cabecera ? ' <span class="chip pa">Cabecera</span>' : '') + '<div class="mu peq">' + esc(f.cod) + '</div></td><td class="peq">' + esc(String(f.area).replace('Área Programática ', '')) + '</td><td>' + (f.diag ? fechaTxt(f.diag.fecha) : '—') + '</td><td>' + chipDiag(f.diag) + '</td><td><span class="link">' + (f.diag ? 'Abrir' : 'Empezar') + '</span></td></tr>').join('') +
    '</tbody></table></section>');
  document.querySelectorAll('tr.cl').forEach(tr => tr.onclick = () => location.hash = '#diag/' + encodeURIComponent(tr.dataset.cod));
  activarCompartir('');
}
// ------------------------------------------------------------------ Diagnóstico de residuos (núcleo común: portal y referentes)
// DCFG lo define cada página: modo ('hys' | 'red'), abrir, guardar, foto, pantalla, volver.
const RESP_CPN = [['Cumple', 'C', 'ok'], ['Parcial', 'P', 'wa'], ['No cumple', 'N', 'er'], ['No aplica', 'NA', 'gr']];
let DG = null;
const hoyISO = () => { const h = new Date(); return h.getFullYear() + '-' + String(h.getMonth() + 1).padStart(2, '0') + '-' + String(h.getDate()).padStart(2, '0'); };
async function diagForm(cod, id) {
  DCFG.pantalla('<div class="cargando">Abriendo el diagnóstico…</div>');
  let D; try { D = await DCFG.abrir(cod, id || ''); } catch (e) { return; }
  if (!D || !D.ok) return DCFG.pantalla('<div class="aviso error">' + esc((D && D.mensaje) || 'No se pudo abrir.') + '</div>');
  const R = {}; (D.respuestas || []).forEach(r => R[(r.sitio || '') + '|' + r.item] = { resp: r.resp, valor: r.valor, obs: r.obs, fotos: r.fotos || [] });
  DG = { cod: cod, nombre: D.nombre || DCFG.nombre(cod), D: D, R: R, id: D.actual ? D.actual.ID_DIAG : '', estado: D.actual ? D.actual.ESTADO : 'Nuevo', tab: '', sucio: false, subiendo: 0,
    cab: D.actual ? { FECHA: String(D.actual.FECHA).slice(0, 10), MODALIDAD: D.actual.MODALIDAD, RELEVADO_POR: D.actual.RELEVADO_POR, ENTREVISTADO: D.actual.ENTREVISTADO, OBSERVACIONES: D.actual.OBSERVACIONES }
      : { FECHA: hoyISO(), MODALIDAD: DCFG.modo === 'red' ? 'Referente (en línea)' : 'Visita', RELEVADO_POR: DCFG.modo === 'red' ? '' : 'Belén Pellegrini', ENTREVISTADO: '', OBSERVACIONES: '' } };
  Object.keys(D.sugerencias || {}).forEach(id => { if (D.sugerencias[id] && !R['|' + id] && D.items.some(i => i.ID === id)) R['|' + id] = { resp: '', valor: D.sugerencias[id], obs: '', fotos: [] }; });   // categoría sugerida (se puede cambiar)
  diagPintar();
}
const diagSoloLectura = () => DCFG.modo === 'red' ? /^(Enviado|Cerrado)$/.test(DG.estado) : DG.estado === 'Cerrado';
// Cruce con el registro de capacitaciones (puntos MAT07 y PER06)
function diagCapInfo(i, ro) {
  const C = DG.D.capacitacion; if (!C || (i.ID !== 'MAT07' && i.ID !== 'PER06') || DG.tab !== '') return '';
  const f = (a, b, p) => b ? a + ' de ' + b + ' (' + p + ' %)' : 'sin personal cargado';
  return '<div class="aviso peq" style="grid-column:1/-1">Según el <b>registro de capacitaciones</b>, en los últimos 12 meses se capacitaron en residuos: ' +
    '<b>' + f(C.capacitados, C.activos, C.pct) + '</b> del personal activo, y <b>' + f(C.limpiezaCap, C.limpieza, C.pctLimpieza) + '</b> del personal de limpieza, maestranza y servicios generales.' +
    (C.alguna > C.capacitados ? ' Otras ' + (C.alguna - C.capacitados) + ' persona(s) se capacitaron hace más de un año.' : '') +
    (i.ID === 'PER06' && C.sugerencia ? ' Sugerencia: <b>' + C.sugerencia + '</b>' + (ro ? '' : ' <button class="link" data-capsug="' + C.sugerencia + '">Usar</button>') : '') +
    '<div class="mu" style="margin-top:4px">Cuenta solo a quienes figuran en la base de trabajadores de este establecimiento. Si alguien se capacitó y no aparece, revisá su DNI en la base.</div></div>';
}

// ------------------------------------------------------------------ Reglas del diagnóstico (las mismas que en el sistema: hoja ITEMS › CONDICION y PREVIO)
function diagAplica(it, sitio) {
  const cond = String(it && it.CONDICION || '').trim(); if (!cond) return true;
  const porId = DG.porId || (DG.porId = Object.fromEntries(DG.D.items.map(i => [i.ID, i])));
  return cond.split(';').every(c => {
    // «LUGAR ~ Tanque|Cisterna»: solo en los lugares con alguna palabra que empiece así («LUGAR !~ …»: en los demás)
    const L = /^\s*LUGAR\s*(!~|~)\s*(.+?)\s*$/i.exec(c);
    if (L) { const pal = String(sitio || '').toLowerCase().split(/[^a-z0-9áéíóúüñ]+/), hit = L[2].split('|').some(o => { o = o.trim().toLowerCase(); return o && pal.some(w => w.indexOf(o) === 0); }); return L[1] === '~' ? hit : !hit; }
    const m = /^\s*([A-Z]{3}\d{2})\s*(~|!=|=)\s*(.+?)\s*$/.exec(c); if (!m) return true;
    const ref = porId[m[1]], s = ref && ref.NIVEL === 'S' ? (sitio || '') : '', r = DG.R[s + '|' + m[1]] || {}, v = String(r.valor || r.resp || '');
    if (m[2] === '~') return m[3].split('|').some(o => v.split('|').indexOf(o.trim()) >= 0);
    if (m[2] === '=') return v === m[3];
    return v !== m[3];
  });
}
const diagTiene = (s, id) => { const r = DG.R[s + '|' + id]; return !!(r && (r.resp || r.valor)); };
function diagPrevioFalta() { return DG.D.items.filter(i => i.PREVIO === 'Sí' && i.NIVEL !== 'S' && !diagTiene('', i.ID)); }
function diagFaltaCerrar() {
  const est = DG.D.items.filter(i => i.NIVEL !== 'S' && (/^(CPN|ESCALA|LISTA)$/.test(i.TIPO) || i.PREVIO === 'Sí') && diagAplica(i, '') && !diagTiene('', i.ID));
  const sitios = DG.D.sitios.filter(s => DG.D.items.some(i => i.NIVEL === 'S' && diagTiene(s.sitio, i.ID))).length;
  return { est: est, sitios: sitios, requiere: DG.D.items.some(i => i.NIVEL === 'S') };   // si no hay puntos por lugar activos, alcanza con Establecimiento
}
// Puntaje por opción (hoja ITEMS › PUNTAJES): «1|0.5|0|-» alineado con OPCIONES («-» no puntúa) · PROP: proporción de lo marcado
function diagPts(it, val) {
const ops = String(it.OPCIONES || '').split('|'); val = String(val || ''); if (!val) return null;
if (it.PUNTAJES === 'PROP') { const sel = val.split('|').filter(Boolean); if (sel.indexOf('No se sabe') >= 0) return null; const base = ops.filter(o => !/^(Ninguno|No se sabe)$/.test(o)); return base.length ? sel.filter(s => base.indexOf(s) >= 0).length / base.length : null; }
const k = ops.indexOf(val), p = k < 0 ? '' : String(it.PUNTAJES).split('|')[k], n = Number(String(p).replace(',', '.'));
return p === '' || p === '-' || isNaN(n) ? null : n;
}
function diagCalc() {
  const porId = {}; DG.D.items.forEach(i => porId[i.ID] = i);
  let suma = 0, pesos = 0, crit = 0, n = 0, msn = 0, nm = 0;
  Object.keys(DG.R).forEach(k => { const it = porId[k.split('|')[1]], r = DG.R[k]; if (!it || !diagAplica(it, k.split('|')[0])) return;
    let v = null;
    if (it.TIPO === 'CPN') v = { 'Cumple': 1, 'Parcial': 0.5, 'No cumple': 0 }[r.resp];
    else if (it.TIPO === 'ESCALA') { const m = /^\s*(\d)/.exec(String(r.valor || '')); if (m) { v = Number(m[1]) / 6; msn += Number(m[1]); nm++; } }
else if (it.PUNTAJES) v = diagPts(it, r.valor || r.resp);
    if (v == null) return; const w = Number(it.PESO) || 1; suma += w * v; pesos += w; n++; if (it.CRITICO === 'Sí' && v <= 1 / 3) crit++; });
  return { pct: pesos ? Math.round(1000 * suma / pesos) / 10 : null, crit: crit, n: n, msn: nm ? Math.round(10 * msn / nm) / 10 : null };
}
function diagAvance(sitio) {
  const its = DG.D.items.filter(i => (sitio === '' ? i.NIVEL !== 'S' : i.NIVEL === 'S') && diagAplica(i, sitio));
  const hechos = its.filter(i => { const r = DG.R[sitio + '|' + i.ID]; return r && (r.resp || r.valor); }).length;
  return [hechos, its.length];
}
function diagPintar() {
  const D = DG.D, c = diagCalc(), tabs = [''].concat(D.sitios.map(s => s.sitio).filter(s => D.items.some(i => i.NIVEL === 'S' && diagAplica(i, s)))), ro = diagSoloLectura(), red = DCFG.modo === 'red';
  const tabTxt = t => { const [h, n] = diagAvance(t); return (t === '' ? 'Establecimiento' : t) + ' · ' + h + '/' + n; };
  DG.porId = null; const falta = diagPrevioFalta(), bloqueo = DG.tab !== '' && falta.length > 0;
  const its = bloqueo ? [] : D.items.filter(i => (DG.tab === '' ? i.NIVEL !== 'S' : i.NIVEL === 'S') && diagAplica(i, DG.tab));
  const secciones = Array.from(new Set(its.map(i => i.SECCION)));
  const ctl = i => { const k = DG.tab + '|' + i.ID, r = DG.R[k] || {};
    if (i.TIPO === 'CPN') return '<div class="cpn">' + RESP_CPN.map(([v, l, cl]) => '<button class="btn ' + (r.resp === v ? 'chip ' + cl + ' sel' : 'sec') + '" data-k="' + esc(k) + '" data-v="' + v + '"' + (ro ? ' disabled' : '') + ' title="' + v + '">' + l + '</button>').join('') + '</div>';
    if (i.TIPO === 'ESCALA') { const m = /^\s*(\d)/.exec(String(r.valor || '')), nv = m ? Number(m[1]) : null;
      return '<div class="escala"><select class="c" data-kv="' + esc(k) + '"' + (ro ? ' disabled' : '') + '><option value="">Elegí el nivel…</option>' + String(i.OPCIONES).split('|').map(o => '<option' + (r.valor === o ? ' selected' : '') + '>' + esc(o) + '</option>').join('') + '</select>' +
        (nv == null ? '' : '<span class="chip ' + (nv >= 5 ? 'ok' : nv >= 3 ? 'wa' : 'er') + '">' + nv + ' / 6</span>') + '</div>'; }
    if (i.TIPO === 'LISTA') return '<select class="c" data-kv="' + esc(k) + '"' + (ro ? ' disabled' : '') + '><option value=""></option>' + String(i.OPCIONES).split('|').map(o => '<option' + (r.valor === o ? ' selected' : '') + '>' + esc(o) + '</option>').join('') + '</select>';
    if (i.TIPO === 'MULTI') { const sel = String(r.valor || '').split('|'); return '<div class="multi">' + String(i.OPCIONES).split('|').map(o => '<label><input type="checkbox" data-km="' + esc(k) + '" value="' + esc(o) + '"' + (sel.indexOf(o) >= 0 ? ' checked' : '') + (ro ? ' disabled' : '') + '>' + esc(o) + '</label>').join('') + '</div>'; }
    return '<input class="c ancho" data-kv="' + esc(k) + '" value="' + esc(r.valor || '') + '"' + (i.TIPO === 'NUMERO' ? ' type="number"' : '') + (ro ? ' disabled' : '') + '>';
  };
  const fotos = i => { if (i.FOTO !== 'Sí') return ''; const k = DG.tab + '|' + i.ID, L = (DG.R[k] && DG.R[k].fotos) || [];
    return '<div class="fotos">' + L.map((u, n) => '<a href="' + esc(u) + '" target="_blank" rel="noopener">Foto ' + (n + 1) + '</a>' + (ro ? '' : '<button class="link quitar" data-fq="' + esc(k) + '" data-fn="' + n + '" title="Quitar de la lista">×</button>')).join('') +
      (ro ? '' : '<label class="btn sec foto">📷 Agregar foto<input type="file" accept="image/*" multiple hidden data-ff="' + esc(k) + '"></label>') + '</div>'; };
  const estadoTxt = { Nuevo: 'nuevo', Borrador: 'borrador', Enviado: red ? 'enviado a Higiene y Seguridad' : 'enviado por el referente: revisar', Cerrado: 'cerrado' }[DG.estado] || DG.estado;
  const hist = !red && (D.historial || []).length ? '<div class="peq" style="margin-top:4px">Anteriores: ' + D.historial.map(h => '<button class="link" data-hist="' + esc(h.id) + '">' + esc(fechaTxt(h.fecha)) + ' · ' + (h.pct === '' ? '—' : h.pct + ' %') + ' · ' + esc(h.estado) + '</button>').join(' · ') + '</div>' : '';
  let botones = '';
  if (red) botones = ro ? '<span class="mu">Ya se envió a Higiene y Seguridad. Si hay que corregir algo, Higiene y Seguridad lo devuelve.</span>' : '<button class="btn sec" id="dgGuardar">Guardar y seguir después</button><button class="btn pri" id="dgEnviar">Enviar a Higiene y Seguridad</button>';
  else if (ro) botones = '<button class="btn sec" id="dgNuevo">Empezar un ' + (DCFG.pal || 'diagnóstico') + ' nuevo</button>';
  else botones = '<button class="btn sec" id="dgGuardar">Guardar borrador</button>' + (DG.estado === 'Enviado' ? '<button class="btn sec" id="dgDevolver">Devolver al referente</button>' : '') + '<button class="btn pri" id="dgCerrar">Cerrar ' + (DCFG.pal || 'diagnóstico') + '</button>';
  DCFG.pantalla('<div class="cab"><div>' + DCFG.volver + '<h1>' + esc(DG.nombre) + '</h1><span class="mu">' + esc(DCFG.titulo ? DCFG.titulo() : 'Diagnóstico de residuos') + ' · ' + esc(estadoTxt) + (ro && !red ? ' (solo lectura)' : '') + '</span>' + hist + '</div>' +
    '<div class="card kpi resultado"><span>Resultado</span><b>' + (c.pct == null ? '—' : c.pct + ' %') + '</b><small>' + (c.msn == null ? '' : 'Matriz nacional: ' + c.msn + ' / 6 · ') + c.n + ' punto(s) evaluado(s)' + (c.crit ? ' · <span style="color:var(--er);font-weight:700">' + c.crit + ' crítico(s)</span>' : '') + '</small></div></div>' +
    (red && !ro ? '<div class="aviso peq">Podés completarlo de a partes: tocá <b>Guardar y seguir después</b> y volvé cuando quieras con la misma clave. Cuando termines, tocá <b>Enviar a Higiene y Seguridad</b>. Las fotos ayudan mucho: agregá las que puedas.</div>' : '') +
    (DCFG.extra ? DCFG.extra() : '') +
    '<section class="card"><div class="grid g4">' +
      '<label class="f">Fecha<input class="c" type="date" data-cab="FECHA" value="' + esc(DG.cab.FECHA) + '"' + (ro ? ' disabled' : '') + '></label>' +
      (red ? '' : '<label class="f">Modalidad<select class="c" data-cab="MODALIDAD"' + (ro ? ' disabled' : '') + '>' + ['Visita', 'Entrevista', 'Referente (en línea)', 'Libro de la red'].map(o => '<option' + (DG.cab.MODALIDAD === o ? ' selected' : '') + '>' + o + '</option>').join('') + '</select></label>') +
      '<label class="f">' + (red ? 'Quién lo completa (nombre y función)' : 'Relevado por') + '<input class="c" data-cab="RELEVADO_POR" value="' + esc(DG.cab.RELEVADO_POR) + '"' + (ro ? ' disabled' : '') + '></label>' +
      '<label class="f">' + (red ? 'Otras personas que participaron' : 'Persona entrevistada') + '<input class="c" data-cab="ENTREVISTADO" value="' + esc(DG.cab.ENTREVISTADO) + '"' + (ro ? ' disabled' : '') + '></label></div>' +
      '<label class="f" style="margin-top:12px">Observaciones generales<textarea class="c" data-cab="OBSERVACIONES"' + (ro ? ' disabled' : '') + '>' + esc(DG.cab.OBSERVACIONES) + '</textarea></label></section>' +
    '<div class="tabs"><span class="mu peq" style="font-weight:700">Completar:</span>' + tabs.map(t => '<button class="btn ' + (t === DG.tab ? 'pri' : 'sec') + '" data-tab="' + esc(t) + '"' + (t !== '' && falta.length ? ' title="Primero completá los datos del establecimiento" style="opacity:.55"' : '') + '>' + (t !== '' && falta.length ? '🔒 ' : '') + esc(tabTxt(t)) + '</button>').join('') + '</div>' +
    (DG.tab !== '' ? '<p class="mu peq" style="margin:0">' + (DCFG.txtLugares || 'Estos puntos se completan para cada lugar: edificio, CAPS o dispositivo. Si un lugar no se revisó, dejalo sin completar.') + (!ro && D.sitios.length > 1 ? ' <button class="link" id="dgCopiar">Copiar las respuestas de otro lugar</button>' : '') + '</p>' : '') +
    (!ro && !red && D.previo && (D.respuestasPrevio || []).length ? '<div class="aviso peq">Hay un ' + (DCFG.pal || 'diagnóstico') + ' anterior (' + esc(fechaTxt(D.previo.FECHA)) + ', ' + esc(D.previo.PORCENTAJE) + ' %). <button class="link" id="dgPrevio">Traer sus respuestas como punto de partida</button></div>' : '') +
    (bloqueo ? '<section class="card"><h2>Primero, los datos del establecimiento</h2><p class="mu">Para relevar cada lugar hace falta completar antes, en la pestaña <b>Establecimiento</b>: ' + falta.map(i => '<b>' + esc(i.ITEM) + '</b>').join(', ') + '. Esas respuestas definen qué se pregunta en cada lugar.</p><button class="btn pri" data-tab="">Ir a Establecimiento</button></section>' : '') +
    (DG.tab === '' && falta.length ? '<div class="aviso peq">Empezá por los puntos marcados como <b>Primero</b>: definen qué se pregunta en cada lugar.</div>' : '') +
    secciones.map(sec => '<section class="card seccion"><div class="sec-tit"><h2>' + esc(sec) + '</h2></div>' +
      its.filter(i => i.SECCION === sec).map(i => { const r = DG.R[DG.tab + '|' + i.ID] || {}, ancho = i.TIPO === 'MULTI' || i.TIPO === 'TEXTO' || i.TIPO === 'ESCALA';
        return '<div class="punto' + (ancho ? ' ancho' : '') + '"><div>' + (i.PREVIO === 'Sí' && DG.tab === '' ? '<span class="chip pa mini">Primero</span> ' : '') + '<b>' + esc(i.ITEM) + '</b>' + (i.CRITICO === 'Sí' ? ' <span class="chip er mini">Crítico</span>' : '') + (i.AYUDA ? '<div class="mu peq">' + esc(i.AYUDA) + '</div>' : '') + (i.REFERENCIA && !red ? '<div class="mu ref">Ref.: ' + esc(i.REFERENCIA) + '</div>' : '') + '</div>' +
          '<div class="ctl">' + ctl(i) + '</div>' +
          diagCapInfo(i, ro) +
          (i.TIPO === 'CPN' ? '<input class="c obs" placeholder="Observación (opcional)" data-ko="' + esc(DG.tab + '|' + i.ID) + '" value="' + esc(r.obs || '') + '"' + (ro ? ' disabled' : '') + '>' : '') + fotos(i) + '</div>'; }).join('') + '</section>').join('') +
    '<div class="barra">' + botones + '<span class="mu peq" id="dgEstado">' + (DG.subiendo ? 'Subiendo fotos…' : DG.sucio ? 'Hay cambios sin guardar.' : '') + '</span></div>');
  q2('[data-capsug]').forEach(x => x.onclick = () => { const r = DG.R['|PER06'] = DG.R['|PER06'] || {}; r.resp = x.dataset.capsug; r.obs = r.obs || 'Según el registro de capacitaciones'; DG.sucio = true; const y = window.scrollY; diagPintar(); window.scrollTo(0, y); });
  if (DCFG.alPintar) DCFG.alPintar();
  const marcar = () => { DG.sucio = true; const e = $('dgEstado'); if (e) e.textContent = 'Hay cambios sin guardar.'; };
  const q = s => document.querySelectorAll(s);
  q('[data-k]').forEach(b => b.onclick = () => { const k = b.dataset.k, r = DG.R[k] = DG.R[k] || {}; r.resp = r.resp === b.dataset.v ? '' : b.dataset.v; DG.sucio = true; const y = window.scrollY; diagPintar(); window.scrollTo(0, y); });
  q('[data-kv]').forEach(el => el.onchange = () => { (DG.R[el.dataset.kv] = DG.R[el.dataset.kv] || {}).valor = el.value; marcar(); if (el.closest('.escala') || el.tagName === 'SELECT') { const y = window.scrollY; diagPintar(); window.scrollTo(0, y); } });
  q('[data-km]').forEach(el => el.onchange = () => { const k = el.dataset.km; (DG.R[k] = DG.R[k] || {}).valor = [...q('[data-km]')].filter(x => x.dataset.km === k && x.checked).map(x => x.value).join('|'); marcar(); const y = window.scrollY; diagPintar(); window.scrollTo(0, y); });
  q('[data-ko]').forEach(el => el.onchange = () => { (DG.R[el.dataset.ko] = DG.R[el.dataset.ko] || {}).obs = el.value; marcar(); });
  q('[data-cab]').forEach(el => el.onchange = () => { DG.cab[el.dataset.cab] = el.value; marcar(); });
  q('[data-tab]').forEach(b => b.onclick = () => { DG.tab = b.dataset.tab; diagPintar(); window.scrollTo(0, 0); });
  q('[data-hist]').forEach(b => b.onclick = () => { if (DG.sucio && !confirm('Hay cambios sin guardar. ¿Salir igual?')) return; diagForm(DG.cod, b.dataset.hist); });
  q('[data-fq]').forEach(b => b.onclick = () => { const r = DG.R[b.dataset.fq]; r.fotos.splice(Number(b.dataset.fn), 1); DG.sucio = true; diagPintar(); });
  q('[data-ff]').forEach(inp => inp.onchange = () => diagSubirFotos(inp.dataset.ff, [...inp.files]));
  if ($('dgPrevio')) $('dgPrevio').onclick = () => { DG.D.respuestasPrevio.forEach(r => { const k = (r.sitio || '') + '|' + r.item; if (!DG.R[k] || !(DG.R[k].resp || DG.R[k].valor)) DG.R[k] = { resp: r.resp, valor: r.valor, obs: r.obs, fotos: [] }; }); DG.sucio = true; toast('Se trajeron las respuestas anteriores: revisalas una por una.'); diagPintar(); };
  if ($('dgCopiar')) $('dgCopiar').onclick = () => {
    const otros = DG.D.sitios.map(x => x.sitio).filter(x => x !== DG.tab && diagAvance(x)[0] > 0);
    if (!otros.length) return toast('Todavía no hay otro lugar con respuestas.');
    const o = prompt('¿De qué lugar copio las respuestas? (las fotos no se copian)\n' + otros.join(' · '), otros[0]); if (!o || otros.indexOf(o) < 0) return;
    Object.keys(DG.R).filter(k => k.indexOf(o + '|') === 0).forEach(k => { const r = DG.R[k]; DG.R[DG.tab + '|' + k.slice(o.length + 1)] = { resp: r.resp, valor: r.valor, obs: r.obs, fotos: [] }; }); DG.sucio = true; diagPintar(); };
  if ($('dgGuardar')) $('dgGuardar').onclick = () => diagGuardar(DG.estado === 'Enviado' ? 'Enviado' : 'Borrador');
  const diagPuedeCerrar = () => { const f = diagFaltaCerrar();
    if (f.est.length) { toast('Falta completar en Establecimiento ' + f.est.length + ' punto(s): ' + f.est.slice(0, 3).map(i => i.ITEM).join(' · ') + (f.est.length > 3 ? '…' : '')); DG.tab = ''; diagPintar(); window.scrollTo(0, 0); return false; }
    if (f.requiere && !f.sitios && !(DCFG.sinLugares && DCFG.sinLugares())) { toast(DCFG.txtFaltaLugar || 'Falta relevar al menos un lugar (el edificio, un CAPS o un dispositivo).'); return false; }
    return true; };
  if ($('dgCerrar')) $('dgCerrar').onclick = () => diagPuedeCerrar() && confirm('¿Cerrar el ' + (DCFG.pal || 'diagnóstico') + '? Queda como resultado del establecimiento y ya no se puede editar (se puede empezar otro).') && diagGuardar('Cerrado');
  if ($('dgEnviar')) $('dgEnviar').onclick = () => diagPuedeCerrar() && confirm('¿Enviar el ' + (DCFG.pal || 'diagnóstico') + ' a Higiene y Seguridad? Después ya no se puede modificar, salvo que te lo devuelvan.') && diagGuardar('Enviado');
  if ($('dgDevolver')) $('dgDevolver').onclick = () => confirm('¿Devolver el ' + (DCFG.pal || 'diagnóstico') + ' al referente para que lo complete o corrija?') && diagGuardar('Borrador');
  if ($('dgNuevo')) $('dgNuevo').onclick = () => { DG.D.previo = DG.D.actual || DG.D.previo; DG.D.respuestasPrevio = (DG.D.respuestas || []).length ? DG.D.respuestas : DG.D.respuestasPrevio; DG.D.actual = null; DG.D.respuestas = [];
    DG.id = ''; DG.estado = 'Nuevo'; DG.R = {}; DG.cab.FECHA = hoyISO(); DG.sucio = true; diagPintar(); };
}
function diagPayload(estado) {
  q2('[data-cab]').forEach(el => DG.cab[el.dataset.cab] = el.value);
  const respuestas = Object.keys(DG.R).map(k => { const i = k.indexOf('|'), r = DG.R[k]; return { sitio: k.slice(0, i), item: k.slice(i + 1), resp: r.resp || '', valor: r.valor || '', obs: r.obs || '', fotos: r.fotos || [] }; })
    .filter(r => r.resp || r.valor || r.obs || r.fotos.length);
  return { cod: DG.cod, id: DG.id, cabecera: DG.cab, respuestas: respuestas, estado: estado };
}
const q2 = s => document.querySelectorAll(s);
async function diagGuardar(estado, silencioso) {
  if (DG.subiendo) { toast('Esperá a que terminen de subir las fotos.'); return false; }
  const btn = q2('.barra .btn'); btn.forEach(b => b.disabled = true);
  let r; try { r = await DCFG.guardar(diagPayload(estado)); } catch (e) { btn.forEach(b => b.disabled = false); return false; }
  btn.forEach(b => b.disabled = false);
  if (!r || !r.ok) { toast((r && r.mensaje) || 'No se pudo guardar.'); return false; }
  DG.id = r.id; DG.estado = r.estado; DG.sucio = false;
  if (DCFG.alGuardar) DCFG.alGuardar(r);
  if (r.perfil && r.perfil.aviso) alert(r.perfil.aviso);
  if (r.estado === 'Cerrado' && r.perfil && r.perfil.categoria && DCFG.modo !== 'red') {
    if (confirm('Perfil guardado en la BASE COMÚN: categoría ' + r.perfil.categoria + ' · módulos ' + r.perfil.modulos + '.\n\n¿Creás ahora el relevamiento inicial (la auditoría de campo de la categoría)?')) {
      try { let a = await api('p_diag_relevamiento', { cod: DG.cod, idDiag: r.id }, 120000); for (let k = 0; a && a.ok && a.pendientes > 0 && k < 5; k++) { toast('Relevamiento: faltan ' + a.pendientes + ' lugares, sigo…'); a = await api('p_diag_relevamiento', { cod: DG.cod, idDiag: r.id }, 120000); } if (a && a.ok) { if (a.mensaje) toast(a.mensaje); AU.cod = DG.cod; location.hash = '#aud/' + encodeURIComponent(a.id); return true; } toast((a && a.mensaje) || 'No se pudo crear el relevamiento.'); } catch (e) {} } }
  if (!silencioso) { toast({ Cerrado: (DCFG.pal ? 'Relevamiento' : 'Diagnóstico') + ' cerrado: ', Enviado: DCFG.modo === 'red' ? 'Enviado a Higiene y Seguridad. ¡Gracias! Resultado: ' : 'Guardado: ', Borrador: 'Guardado: ' }[r.estado] + (r.pct === '' ? '—' : r.pct + ' %')); diagPintar(); }
  return true;
}
// Fotos: se achican en el teléfono (máx. 1600 px) y se suben de a una
function achicar(file) {
  return new Promise((ok, mal) => { const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => { const m = 1600, f = Math.min(1, m / Math.max(img.width, img.height)), cv = document.createElement('canvas'); cv.width = Math.round(img.width * f); cv.height = Math.round(img.height * f);
      cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height); URL.revokeObjectURL(url); ok(cv.toDataURL('image/jpeg', 0.75)); };
    img.onerror = () => mal(new Error('No se pudo leer la imagen.')); img.src = url; });
}
async function diagSubirFotos(k, files) {
  if (!files.length) return;
  if (!DG.id) { const ok = await diagGuardar(DG.estado === 'Nuevo' ? 'Borrador' : DG.estado, true); if (!ok) return; }
  const i = k.indexOf('|'), r = DG.R[k] = DG.R[k] || {}; r.fotos = r.fotos || [];
  DG.subiendo += files.length; diagPintar();
  for (const f of files) {
    try { const data = await achicar(f), res = await DCFG.foto({ cod: DG.cod, id: DG.id, sitio: k.slice(0, i), item: k.slice(i + 1), dataUrl: data });
      if (res && res.ok) { r.fotos.push(res.url); DG.sucio = true; } else toast((res && res.mensaje) || 'No se pudo subir la foto.'); }
    catch (e) { toast(e.message || 'No se pudo subir la foto.'); }
    DG.subiendo--; diagPintar();
  }
  await diagGuardar(DG.estado === 'Nuevo' ? 'Borrador' : DG.estado, true); diagPintar();
}
window.addEventListener('beforeunload', e => { if (DG && (DG.sucio || DG.subiendo)) { e.preventDefault(); e.returnValue = ''; } });
