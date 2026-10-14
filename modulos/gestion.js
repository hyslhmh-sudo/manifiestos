// Portal HyS · 11 · Gestión (fase 3 · 14.64 · 14/10/2026) · servidor: Gestion.gs (acciones p_ges_…)
// Plan de acción único, hallazgos, bandeja de sugeridos, necesidades de inversión y alcance (niveles A y B).
// Los datos viven en la BASE COMÚN (GES_ALCANCE, GES_EMPRESAS, GES_HALLAZGOS, GES_ACCIONES).
// Se carga desde portal.html (<script src>). Para el portal de respaldo, herramientas/armar_respaldo.py lo junta en un solo archivo.
let GESD = null, GESA = null;
const GESF = { cod: '', mod: '', estado: 'abiertas', resp: '', rec: '', q: '', por: 'modulo' };
const GESHF = { cod: '', mod: '', estado: '', origen: '', q: '' };
const gesNom = c => ((GESD && GESD.establecimientos.find(e => e.cod === c)) || {}).nombre || c;
const gesMod = m => String(m || '').replace(/^(\d+) · /, '$1 · ');
const gesCab = (t, s, extra) => '<div class="cab"><div><span class="mu peq">11 · Gestión</span><h1>' + t + '</h1><span class="mu peq">' + s + '</span></div><div class="filtros">' + (extra || '') + '</div></div>';
const gesTabs = act => '<div class="filtros" style="flex-wrap:wrap;gap:6px;margin:0 0 12px">' + [['plan', 'Plan de acción único'], ['hallazgos', 'Hallazgos'], ['bandeja', 'Bandeja de sugeridos'], ['inversion', 'Necesidades de inversión'], ['reglas', 'Reglas'], ['alcance', 'Alcance']]
  .map(([k, t]) => '<a class="btn ' + (k === act ? 'pri' : 'sec') + ' peq" href="#ges/' + k + '">' + t + (k === 'bandeja' && GESD ? ' · ' + GESD.hallazgos.filter(h => h.ESTADO === 'Sugerido').length : '') + '</a>').join('') + '</div>';
const gesKpi = (t, v, s, col) => '<div class="kpi2"><span>' + t + '</span><b' + (col ? ' style="color:' + col + '"' : '') + '>' + v + '</b><small>' + s + '</small></div>';
const gesOpt = (v, t, sel) => '<option value="' + esc(v) + '"' + (String(v) === String(sel) ? ' selected' : '') + '>' + esc(t) + '</option>';
function gesTag(a) {
  if (a.vencida) return '<span class="tag er">Vencida</span>';
  if (a.sinRespuesta) return '<span class="tag wa">Elevada sin respuesta</span>';
  const c = { 'Propuesta': 'gr', 'Elevada': 'av', 'Aprobada': 'av', 'No aprobada': 'wa', 'En curso': 'av', 'Hecha': 'wa', 'Eficaz': 'ok', 'No se realiza': 'gr', 'Pendiente de recursos': 'wa' }[a.ESTADO] || 'gr';
  return '<span class="tag ' + c + '">' + esc(a.ESTADO === 'Hecha' ? 'Hecha · a verificar' : a.ESTADO || 'Propuesta') + '</span>';
}

async function gestion(fresco) {
  const sub = (location.hash.split('/')[1] || 'plan');
  if (sub === 'alcance') return gesAlcance(fresco);
  if (sub === 'reglas') return gesReglas(fresco);
  if (!GESD || fresco) { cargando('#ges', 'Leyendo el plan de acción único…'); try { GESD = await api('p_ges_datos', {}, 180000); } catch (e) { return; } }
  if (!GESD.ok) return marco('#ges', gesCab('Gestión', '') + '<div class="aviso error">' + esc(GESD.mensaje || GESD.error || 'No se pudo leer.') + (/instalar|desconocida/i.test(GESD.mensaje || GESD.error || '') ? ' Falta instalar Gestion.gs en el Sistema HyS.' : '') + '</div>');
  if (sub === 'hallazgos') return gesHallazgos();
  if (sub === 'bandeja') return gesBandeja();
  if (sub === 'inversion') return gesInversion();
  return gesPlan();
}
async function gesTraer() {
  cargando('#ges', 'Trayendo de los módulos (plan de residuos, infraestructura, agua y plagas)…');
  let r; try { r = await api('p_ges_traer', { fresco: true }, 300000); } catch (e) { return; }
  if (!r.ok) { toast(r.mensaje || 'No se pudo traer.'); return gestion(true); }
  toast('Nuevos: ' + r.hallazgos + ' hallazgo(s) y ' + r.acciones + ' acción(es)' + (r.sugeridos ? ' · ' + r.sugeridos + ' a la bandeja' : '') + (r.cerradas ? ' · ' + r.cerradas + ' cerrada(s) en su módulo' : '') + (r.errores && r.errores.length ? ' · ⚠ ' + r.errores.join(' · ') : ''));
  gestion(true);
}

// ------------------------------------------------------------------ Plan de acción único
function gesPlan() {
  const F = GESF, A = GESD.acciones, q = F.q.toLowerCase(), H = {}; GESD.hallazgos.forEach(h => H[h.ID] = h);
  const pasa = a => (!F.cod || a.ESTABLECIMIENTO === F.cod) && (!F.mod || a.MODULO === F.mod) && (!F.resp || a.RESPONSABLE === F.resp) && (!F.rec || (a.TIPO_RECURSO || 'Sin definir') === F.rec) &&
    (F.estado === 'todas' || (F.estado === 'abiertas' && a.abierta) || (F.estado === 'vencidas' && a.vencida) || (F.estado === 'verificar' && a.verificar) || (F.estado === 'elevadas' && a.ESTADO === 'Elevada') ||
     (F.estado === 'recursos' && a.ESTADO === 'Pendiente de recursos') || (F.estado === 'cerradas' && !a.abierta) || F.estado === a.ESTADO) &&
    (!q || (a.ID + ' ' + a.ACCION + ' ' + a.SITIO + ' ' + a.RESPONSABLE + ' ' + ((H[a.HALLAZGO] || {}).DESCRIPCION || '')).toLowerCase().indexOf(q) >= 0);
  const vis = A.filter(pasa).sort((a, b) => (b.vencida - a.vencida) || String(a.FECHA_LIMITE || '9999').localeCompare(String(b.FECHA_LIMITE || '9999')));
  const ab = A.filter(a => a.abierta), venc = A.filter(a => a.vencida).length, sinR = A.filter(a => a.sinRespuesta).length, ver = A.filter(a => a.verificar).length, rec = A.filter(a => a.ESTADO === 'Pendiente de recursos').length;
  const ext = a => a.vencida ? '#B4361F' : '';
  const cods = Array.from(new Set(A.map(a => a.ESTABLECIMIENTO))).sort();
  const clave = a => F.por === 'establecimiento' ? gesNom(a.ESTABLECIMIENTO) : F.por === 'responsable' ? (a.RESPONSABLE || 'Sin responsable asignado') : F.por === 'modulo' ? a.MODULO : '';
  const grupos = {}; vis.forEach(a => (grupos[clave(a)] = grupos[clave(a)] || []).push(a));
  const orden = Object.keys(grupos).sort((a, b) => F.por === 'modulo' ? (parseInt(a) || 99) - (parseInt(b) || 99) : a.localeCompare(b));
  const fila = a => { const h = H[a.HALLAZGO] || {};
    return '<tr class="cl" data-ac="' + esc(a.ID) + '"><td>' + gesTag(a) + '<div class="mu peq">' + esc(a.ID) + '</div></td><td><b>' + esc(a.ESTABLECIMIENTO) + '</b></td><td class="peq">' + esc(a.MODULO) + '</td><td>' + esc(a.ACCION) +
      (h.DESCRIPCION && h.DESCRIPCION !== a.ACCION ? '<div class="mu peq">Hallazgo: ' + esc(h.DESCRIPCION) + '</div>' : '') + (a.SITIO ? '<div class="mu peq">' + esc(a.SITIO) + '</div>' : '') + '</td><td class="peq">' + esc(a.RESPONSABLE || '—') + '</td><td class="peq"' + (ext(a) ? ' style="color:' + ext(a) + ';font-weight:700"' : '') + '>' + fechaTxt(a.FECHA_LIMITE) + '</td><td class="peq">' + esc(a.TIPO_RECURSO || '—') + (a.REQUIERE_DIRECCION === 'Sí' ? '<div class="mu">Dirección</div>' : '') + '</td></tr>'; };
  const tabla = orden.length ? orden.map(g => (F.por !== 'ninguno' ? '<tr><td colspan="7" style="background:#EEF2F4;font-weight:800;color:var(--az)">' + esc(g) + ' · ' + grupos[g].length + '</td></tr>' : '') + grupos[g].map(fila).join('')).join('')
    : '<tr><td colspan="7" class="mu">No hay acciones con estos filtros.' + (A.length ? '' : ' Tocá «Traer de los módulos» para pasar los planes que ya existen.') + '</td></tr>';
  marco('#ges', gesCab('Plan de acción único', 'Todas las acciones de los 10 módulos, con responsable, plazo, si requiere Dirección, avance, evidencia y verificación de eficacia.', '<button class="btn sec" id="gTraer">Traer de los módulos</button><button class="btn sec" id="gElevar">Elevar a la Dirección</button><button class="btn pri" id="gNueva">+ Nueva acción</button>') + gesTabs('plan') +
    '<div class="tb5" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr))">' + gesKpi('Abiertas', ab.length, 'en curso o por empezar') + gesKpi('Vencidas', venc, 'gestión e insumos; sin inversión', venc ? '#B4361F' : '') +
      gesKpi('Elevadas sin respuesta', sinR, 'más de 60 días', sinR ? '#8A5200' : '') + gesKpi('A verificar', ver, 'hechas: falta ver si fueron eficaces') + gesKpi('Pendientes de recursos', rec, 'riesgo informado; no cuentan contra HyS') + '</div>' +
    '<div class="filtros" style="margin:12px 0;flex-wrap:wrap">' +
      '<label class="f">Establecimiento<select class="c" id="gE">' + gesOpt('', 'Todos', F.cod) + cods.map(c => gesOpt(c, gesNom(c), F.cod)).join('') + '</select></label>' +
      '<label class="f">Módulo<select class="c" id="gM">' + gesOpt('', 'Todos', F.mod) + GESD.listas.modulos.map(m => gesOpt(m, m, F.mod)).join('') + '</select></label>' +
      '<label class="f">Mostrar<select class="c" id="gS">' + [['abiertas', 'Abiertas'], ['vencidas', 'Vencidas'], ['verificar', 'A verificar eficacia'], ['elevadas', 'Elevadas a la Dirección'], ['recursos', 'Pendientes de recursos'], ['cerradas', 'Cerradas'], ['todas', 'Todas']].map(o => gesOpt(o[0], o[1], F.estado)).join('') + '</select></label>' +
      '<label class="f">Responsable<select class="c" id="gR">' + gesOpt('', 'Todos', F.resp) + GESD.responsables.map(r => gesOpt(r, r, F.resp)).join('') + '</select></label>' +
      '<label class="f">Recurso<select class="c" id="gT">' + gesOpt('', 'Todos', F.rec) + GESD.listas.recursos.concat(['Sin definir']).map(r => gesOpt(r, r, F.rec)).join('') + '</select></label>' +
      '<label class="f">Ver por<select class="c" id="gP">' + [['modulo', 'Módulo'], ['establecimiento', 'Establecimiento'], ['responsable', 'Responsable'], ['ninguno', 'Lista simple']].map(o => gesOpt(o[0], o[1], F.por)).join('') + '</select></label>' +
      '<label class="f">Buscar<input class="c" id="gQ" value="' + esc(F.q) + '" placeholder="Palabra, sector o código"></label></div>' +
    '<section class="card tabla"><table><thead><tr><th>Estado</th><th>Establ.</th><th>Módulo</th><th>Acción</th><th>Responsable</th><th>Fecha límite</th><th>Recurso</th></tr></thead><tbody>' + tabla + '</tbody></table></section>' +
    '<p class="mu peq">' + vis.length + ' de ' + A.length + ' acciones. Datos en BASE COMÚN › GES_ACCIONES (también se editan desde «Datos · editar todo»). Lo nuevo de los módulos entra solo cada mañana; al cerrar una acción, se marca también en su plan de origen.</p>');
  const re = () => gesPlan();
  $('gE').onchange = e => { F.cod = e.target.value; re(); }; $('gM').onchange = e => { F.mod = e.target.value; re(); }; $('gS').onchange = e => { F.estado = e.target.value; re(); };
  $('gR').onchange = e => { F.resp = e.target.value; re(); }; $('gT').onchange = e => { F.rec = e.target.value; re(); }; $('gP').onchange = e => { F.por = e.target.value; re(); }; $('gQ').onchange = e => { F.q = e.target.value.trim(); re(); };
  $('gTraer').onclick = gesTraer; $('gNueva').onclick = () => gesNuevaAccion(); $('gElevar').onclick = () => gesElevar();
  document.querySelectorAll('[data-ac]').forEach(tr => tr.onclick = () => gesAccion(tr.dataset.ac));
}

function gesAccion(id) {
  const a = GESD.acciones.find(x => x.ID === id); if (!a) return;
  const h = GESD.hallazgos.find(x => x.ID === a.HALLAZGO) || {}, L = GESD.listas;
  const info = '<div class="card peq" style="margin:0 0 10px;background:#F6F9FA"><b>' + esc(a.ID) + ' · ' + esc(gesNom(a.ESTABLECIMIENTO)) + ' · ' + esc(a.MODULO) + '</b>' +
    (h.ID ? '<div>Hallazgo ' + esc(h.ID) + ': ' + esc(h.DESCRIPCION) + '</div><div class="mu">Origen: ' + esc(h.ORIGEN) + (h.REFERENCIA_ORIGEN ? ' · ' + esc(h.REFERENCIA_ORIGEN) : '') + (h.FUENTE ? ' · Fuente: ' + esc(h.FUENTE) : '') + (h.PRIORIDAD ? ' · ' + esc(h.PRIORIDAD) : '') + '</div>' : '') +
    '<div class="mu">Alta: ' + fechaTxt(a.FECHA_ALTA) + ' · Último seguimiento: ' + fechaTxt(a.SEGUIMIENTO) + '</div></div>';
  const hist = a.HISTORIAL ? '<details style="margin-top:10px"><summary class="peq"><b>Historial</b></summary><pre class="peq" style="white-space:pre-wrap;margin:6px 0 0">' + esc(a.HISTORIAL) + '</pre></details>' : '';
  const ayuda = '<p class="mu peq" style="margin:8px 0 0">«Requiere Dirección» solo si hace falta una compra, obra o contratación; un cambio de organización, personal u horarios; una decisión entre servicios o con la Secretaría; o es «Actuar ya» y no se resuelve en el servicio. «Eficaz» pide evidencia; «No eficaz» la devuelve a En curso. Inversión no aprobada pasa a «Pendiente de recursos».</p>';
  const campos = [['ACCION', 'Acción', null, 1], ['SITIO', 'Sitio o sector'], ['RESPONSABLE', 'Responsable (persona, servicio o empresa)'], ['PLAZO_DIAS', 'Plazo (días)', ['30', '90', '180']], ['FECHA_LIMITE', 'Fecha límite', 'date'],
    ['ESTADO', 'Estado', L.estados], ['REQUIERE_DIRECCION', '¿Requiere Dirección?', ['Sí', 'No']], ['TIPO_RECURSO', 'Tipo de recurso', L.recursos], ['COSTO_ESTIMADO', 'Costo estimado'],
    ['FECHA_ELEVADA', 'Fecha en que se elevó', 'date'], ['RESPUESTA_DIRECCION', 'Respuesta de la Dirección'], ['FECHA_RESPUESTA', 'Fecha de la respuesta', 'date'],
    ['AVANCE', 'Avance (lo último que pasó)', null, 1], ['EVIDENCIA', 'Evidencia (enlace o descripción)', null, 1], ['MOTIVO', 'Motivo (si no se realiza o queda pendiente de recursos)', null, 1]];
  const val = Object.assign({}, a, { PLAZO_DIAS: String(a.PLAZO_DIAS || '') });
  if (val.PLAZO_DIAS && ['30', '90', '180'].indexOf(val.PLAZO_DIAS) < 0) campos[3][2] = ['30', '90', '180', val.PLAZO_DIAS];
  modal('Acción ' + a.ID, campos, val, async o => {
    const cambios = {}; Object.keys(o).forEach(k => { if (String(o[k]) !== String(val[k] == null ? '' : val[k])) cambios[k] = o[k]; });
    if (!Object.keys(cambios).length) return '';
    const r = await api('p_ges_accion', { id: a.ID, datos: cambios }, 120000);
    if (!r.ok) return r.mensaje || 'No se pudo guardar.';
    toast('Guardado' + (r.origen ? ' · ' + r.origen : '') + '.'); gestion(true); return '';
  }, info + ayuda + hist);
}
function gesNuevaAccion(pre) {
  const L = GESD.listas;
  modal('Nueva acción', [['ESTABLECIMIENTO', 'Establecimiento', GESD.establecimientos.map(e => e.cod)], ['MODULO', 'Módulo', L.modulos], ['HALLAZGO_DESC', 'Hallazgo (qué incumple)', null, 1], ['ORIGEN', 'Origen', L.origenes],
    ['FUENTE', 'Fuente (norma y artículo, contrato o protocolo)'], ['PRIORIDAD', 'Prioridad', L.prioridades], ['ACCION', 'Acción', null, 1], ['SITIO', 'Sitio o sector'], ['RESPONSABLE', 'Responsable'],
    ['PLAZO_DIAS', 'Plazo (días)', ['30', '90', '180']], ['REQUIERE_DIRECCION', '¿Requiere Dirección?', ['No', 'Sí']], ['TIPO_RECURSO', 'Tipo de recurso', L.recursos]], Object.assign({ REQUIERE_DIRECCION: 'No', ORIGEN: 'Recorrida' }, pre || {}), async o => {
    if (!o.PLAZO_DIAS && o.PRIORIDAD) o.PLAZO_DIAS = { 'Actuar ya': '30', 'Resolver rápido': '90' }[o.PRIORIDAD] || '180';
    const r = await api('p_ges_accion', { datos: o }, 120000);
    if (!r.ok) return r.mensaje || 'No se pudo guardar.';
    toast('Acción ' + r.id + ' creada (con su hallazgo).'); gestion(true); return '';
  });
}

// ------------------------------------------------------------------ Hallazgos
function gesHallazgos() {
  const F = GESHF, q = F.q.toLowerCase(), AC = {}; GESD.acciones.forEach(a => (AC[a.HALLAZGO] = AC[a.HALLAZGO] || []).push(a));
  const L = GESD.hallazgos.filter(h => (!F.cod || h.ESTABLECIMIENTO === F.cod) && (!F.mod || h.MODULO === F.mod) && (!F.estado || h.ESTADO === F.estado) && (!F.origen || h.ORIGEN === F.origen) &&
    (!q || (h.ID + ' ' + h.DESCRIPCION + ' ' + h.SITIO + ' ' + h.FUENTE + ' ' + h.REFERENCIA_ORIGEN).toLowerCase().indexOf(q) >= 0)).sort((a, b) => String(b.FECHA).localeCompare(String(a.FECHA)));
  const cods = Array.from(new Set(GESD.hallazgos.map(h => h.ESTABLECIMIENTO))).sort(), cnt = e => GESD.hallazgos.filter(h => h.ESTADO === e).length;
  const tg = e => '<span class="tag ' + ({ Sugerido: 'wa', Confirmado: 'av', Descartado: 'gr', Cerrado: 'ok' }[e] || 'gr') + '">' + esc(e) + '</span>';
  marco('#ges', gesCab('Registro único de hallazgos', 'Cada hallazgo es un incumplimiento con fuente escrita que pide una acción. Lo que está por vencer o falta registrar es un recordatorio del módulo, no un hallazgo.', '<button class="btn pri" id="hNuevo">+ Nuevo hallazgo</button>') + gesTabs('hallazgos') +
    '<div class="tb5" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr))">' + gesKpi('Confirmados', cnt('Confirmado'), 'con su acción') + gesKpi('En la bandeja', cnt('Sugerido'), 'para confirmar o descartar') + gesKpi('Cerrados', cnt('Cerrado'), 'acción eficaz') + gesKpi('Descartados', cnt('Descartado'), 'con motivo') + '</div>' +
    '<div class="filtros" style="margin:12px 0;flex-wrap:wrap">' +
      '<label class="f">Establecimiento<select class="c" id="hE">' + gesOpt('', 'Todos', F.cod) + cods.map(c => gesOpt(c, gesNom(c), F.cod)).join('') + '</select></label>' +
      '<label class="f">Módulo<select class="c" id="hM">' + gesOpt('', 'Todos', F.mod) + GESD.listas.modulos.map(m => gesOpt(m, m, F.mod)).join('') + '</select></label>' +
      '<label class="f">Estado<select class="c" id="hS">' + gesOpt('', 'Todos', F.estado) + GESD.listas.halEstados.map(m => gesOpt(m, m, F.estado)).join('') + '</select></label>' +
      '<label class="f">Origen<select class="c" id="hO">' + gesOpt('', 'Todos', F.origen) + GESD.listas.origenes.map(m => gesOpt(m, m, F.origen)).join('') + '</select></label>' +
      '<label class="f">Buscar<input class="c" id="hQ" value="' + esc(F.q) + '" placeholder="Palabra, norma o código"></label></div>' +
    '<section class="card tabla"><table><thead><tr><th>Estado</th><th>Fecha</th><th>Establ.</th><th>Módulo</th><th>Hallazgo</th><th>Fuente</th><th>Prioridad</th><th>Acción</th></tr></thead><tbody>' +
      (L.length ? L.map(h => '<tr class="cl" data-hz="' + esc(h.ID) + '"><td>' + tg(h.ESTADO) + '<div class="mu peq">' + esc(h.ID) + '</div></td><td class="peq">' + fechaTxt(h.FECHA) + '</td><td><b>' + esc(h.ESTABLECIMIENTO) + '</b></td><td class="peq">' + esc(h.MODULO) + '</td><td>' + esc(h.DESCRIPCION) +
        '<div class="mu peq">' + esc(h.ORIGEN) + (h.REFERENCIA_ORIGEN ? ' · ' + esc(h.REFERENCIA_ORIGEN) : '') + (h.SITIO ? ' · ' + esc(h.SITIO) : '') + '</div></td><td class="peq">' + esc(h.FUENTE || '—') + '</td><td class="peq">' + esc(h.PRIORIDAD || '—') + '</td><td class="peq">' +
        ((AC[h.ID] || []).map(a => '<a href="#ges/plan" data-va="' + esc(a.ID) + '">' + esc(a.ID) + '</a> ' + gesTag(a)).join('<br>') || '—') + '</td></tr>').join('') : '<tr><td colspan="8" class="mu">No hay hallazgos con estos filtros.</td></tr>') +
    '</tbody></table></section><p class="mu peq">' + L.length + ' de ' + GESD.hallazgos.length + '. Datos en BASE COMÚN › GES_HALLAZGOS.</p>');
  const re = () => gesHallazgos();
  $('hE').onchange = e => { F.cod = e.target.value; re(); }; $('hM').onchange = e => { F.mod = e.target.value; re(); }; $('hS').onchange = e => { F.estado = e.target.value; re(); }; $('hO').onchange = e => { F.origen = e.target.value; re(); }; $('hQ').onchange = e => { F.q = e.target.value.trim(); re(); };
  $('hNuevo').onclick = () => gesHallazgo(null);
  document.querySelectorAll('[data-va]').forEach(x => x.onclick = ev => { ev.preventDefault(); ev.stopPropagation(); gesAccion(x.dataset.va); });
  document.querySelectorAll('[data-hz]').forEach(tr => tr.onclick = () => gesHallazgo(tr.dataset.hz));
}
function gesHallazgo(id) {
  const h = id ? GESD.hallazgos.find(x => x.ID === id) : null, L = GESD.listas, nuevo = !h;
  const campos = [['ESTABLECIMIENTO', 'Establecimiento', GESD.establecimientos.map(e => e.cod)], ['MODULO', 'Módulo', L.modulos], ['DESCRIPCION', 'Hallazgo (qué incumple)', null, 1], ['SITIO', 'Sitio o sector'],
    ['ORIGEN', 'Origen', L.origenes], ['REFERENCIA_ORIGEN', 'Referencia del origen (informe, relevamiento, nota)'], ['FUENTE', 'Fuente (norma y artículo, contrato o protocolo)', null, 1], ['GRAVEDAD', 'Gravedad', L.gu], ['URGENCIA', 'Urgencia', L.gu],
    ['PRIORIDAD', 'Prioridad (se calcula con gravedad y urgencia si la dejás vacía)', L.prioridades], ['EVIDENCIA', 'Evidencia (enlace o descripción)', null, 1]].concat(nuevo ? [] : [['ESTADO', 'Estado', L.halEstados], ['MOTIVO', 'Motivo (si se descarta)', null, 1]]);
  const val = h ? Object.assign({}, h) : { ORIGEN: 'Recorrida', FECHA: GESD.hoy };
  modal(nuevo ? 'Nuevo hallazgo' : 'Hallazgo ' + h.ID, campos, val, async o => {
    const d = {}; Object.keys(o).forEach(k => { if (nuevo || String(o[k]) !== String(val[k] == null ? '' : val[k])) d[k] = o[k]; });
    if (!nuevo && !Object.keys(d).length) return '';
    if (nuevo && !d.PRIORIDAD && d.GRAVEDAD && d.URGENCIA) d.PRIORIDAD = '';
    const r = await api('p_ges_hallazgo', { id: h ? h.ID : '', datos: d, conAccion: nuevo }, 120000);
    if (!r.ok) return r.mensaje || 'No se pudo guardar.';
    toast(nuevo ? 'Hallazgo ' + r.id + ' cargado' + (r.accion ? ' con la acción ' + r.accion + ' (completá responsable y plazo en el plan).' : '.') : 'Guardado.'); gestion(true); return '';
  }, nuevo ? '<p class="mu peq" style="margin:8px 0 0">Se crea también su acción en el plan único, con el plazo según la prioridad (Actuar ya 30 días, Resolver rápido 90, Planificar 180).</p>' : '');
}

// ------------------------------------------------------------------ Bandeja de sugeridos
function gesBandeja() {
  const L = GESD.hallazgos.filter(h => h.ESTADO === 'Sugerido').sort((a, b) => String(a.FECHA).localeCompare(String(b.FECHA)));
  marco('#ges', gesCab('Bandeja de sugeridos', 'Hallazgos que generó el sistema y esperan tu decisión: confirmar (se crea la acción) o descartar (con motivo). En nivel B todo entra por acá.', '<button class="btn sec" id="bTraer">Traer de los módulos</button>') + gesTabs('bandeja') +
    (L.length ? '<div style="display:flex;flex-direction:column;gap:10px">' + L.map(h => '<section class="card" style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:center"><div style="flex:1;min-width:240px"><b>' + esc(h.DESCRIPCION) + '</b>' +
      '<div class="mu peq">' + esc(h.ID) + ' · ' + fechaTxt(h.FECHA) + ' · <b>' + esc(gesNom(h.ESTABLECIMIENTO)) + '</b> · ' + esc(h.MODULO) + (h.SITIO ? ' · ' + esc(h.SITIO) : '') + '</div><div class="mu peq">' + esc(h.ORIGEN) + (h.REFERENCIA_ORIGEN ? ' · ' + esc(h.REFERENCIA_ORIGEN) : '') + (h.FUENTE ? ' · Fuente: ' + esc(h.FUENTE) : ' · Sin fuente cargada') + (h.PRIORIDAD ? ' · ' + esc(h.PRIORIDAD) : '') + '</div></div>' +
      '<div style="display:flex;gap:8px"><button class="btn sec" data-bd="' + esc(h.ID) + '">Descartar</button><button class="btn pri" data-bc="' + esc(h.ID) + '">Confirmar</button></div></section>').join('') + '</div>'
      : '<section class="card mu">La bandeja está vacía. Los hallazgos sugeridos aparecen cuando el sistema detecta algo en un establecimiento de nivel B, o en los casos que la regla marca como sugeridos.</section>'));
  $('bTraer').onclick = gesTraer;
  document.querySelectorAll('[data-bc]').forEach(b => b.onclick = async () => { b.disabled = true; b.textContent = 'Confirmando…';
    try { const r = await api('p_ges_bandeja', { id: b.dataset.bc, decision: 'confirmar' }, 120000); if (!r.ok) { toast(r.mensaje || 'No se pudo.'); b.disabled = false; b.textContent = 'Confirmar'; return; }
      toast('Confirmado' + (r.accion ? ': acción ' + r.accion + ' en el plan.' : '.')); gestion(true); } catch (e) { b.disabled = false; b.textContent = 'Confirmar'; } });
  document.querySelectorAll('[data-bd]').forEach(b => b.onclick = () => modal('Descartar ' + b.dataset.bd, [['motivo', 'Motivo del descarte', null, 1]], {}, async o => {
    if (!o.motivo.trim()) return 'Escribí el motivo.';
    const r = await api('p_ges_bandeja', { id: b.dataset.bd, decision: 'descartar', motivo: o.motivo.trim() }, 120000);
    if (!r.ok) return r.mensaje || 'No se pudo.'; toast('Descartado.'); gestion(true); return ''; }));
}

// ------------------------------------------------------------------ Necesidades de inversión
function gesInversion() {
  const H = {}; GESD.hallazgos.forEach(h => H[h.ID] = h);
  const L = GESD.acciones.filter(a => a.TIPO_RECURSO === 'Inversión').sort((a, b) => (b.abierta - a.abierta) || String(a.FECHA_ELEVADA || a.FECHA_ALTA).localeCompare(String(b.FECHA_ELEVADA || b.FECHA_ALTA)));
  const dias = f => f ? Math.floor((Date.now() - new Date(String(f).slice(0, 10) + 'T12:00:00')) / 864e5) : '';
  const elev = L.filter(a => a.FECHA_ELEVADA), aprob = L.filter(a => /Aprobada|En curso|Hecha|Eficaz/.test(a.ESTADO)), sinR = L.filter(a => a.sinRespuesta), pend = L.filter(a => a.ESTADO === 'Pendiente de recursos');
  marco('#ges', gesCab('Necesidades de inversión', 'Obras, equipamiento y contratos que hacen falta para cumplir. No cuentan contra Higiene y Seguridad: se miden como respuesta institucional y se recuerdan en cada informe.', '<button class="btn pri" id="iNueva">+ Nueva necesidad</button>') + gesTabs('inversion') +
    '<div class="tb5" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr))">' + gesKpi('Necesidades', L.length, 'cargadas') + gesKpi('Elevadas', elev.length, 'a la Dirección o la Secretaría') + gesKpi('Aprobadas o en ejecución', aprob.length, elev.length ? Math.round(100 * aprob.length / elev.length) + ' % de las elevadas' : '—') +
      gesKpi('Sin respuesta', sinR.length, 'más de 60 días', sinR.length ? '#8A5200' : '') + gesKpi('Pendientes de recursos', pend.length, 'riesgo informado') + '</div>' +
    '<section class="card tabla" style="margin-top:12px"><table><thead><tr><th>Estado</th><th>Establ.</th><th>Qué se necesita</th><th>Por qué norma</th><th>Prioridad</th><th>Costo estimado</th><th>Elevada</th><th>Respuesta</th></tr></thead><tbody>' +
      (L.length ? L.map(a => { const h = H[a.HALLAZGO] || {}; return '<tr class="cl" data-ac="' + esc(a.ID) + '"><td>' + gesTag(a) + '<div class="mu peq">' + esc(a.ID) + '</div></td><td><b>' + esc(a.ESTABLECIMIENTO) + '</b><div class="mu peq">' + esc(a.MODULO) + '</div></td><td>' + esc(a.ACCION) + (a.SITIO ? '<div class="mu peq">' + esc(a.SITIO) + '</div>' : '') + '</td><td class="peq">' + esc(h.FUENTE || '—') + '</td><td class="peq">' + esc(h.PRIORIDAD || '—') + '</td><td class="peq">' + esc(a.COSTO_ESTIMADO || '—') + '</td><td class="peq">' + (a.FECHA_ELEVADA ? fechaTxt(a.FECHA_ELEVADA) + '<div class="mu">hace ' + dias(a.FECHA_ELEVADA) + ' días</div>' : '<span class="mu">Sin elevar</span>') + '</td><td class="peq">' + esc(a.RESPUESTA_DIRECCION || '—') + (a.MOTIVO ? '<div class="mu">' + esc(a.MOTIVO) + '</div>' : '') + '</td></tr>'; }).join('')
        : '<tr><td colspan="8" class="mu">No hay acciones de inversión. Se cargan desde el plan, con «Tipo de recurso: Inversión».</td></tr>') + '</tbody></table></section>');
  $('iNueva').onclick = () => gesNuevaAccion({ TIPO_RECURSO: 'Inversión', REQUIERE_DIRECCION: 'Sí' });
  document.querySelectorAll('[data-ac]').forEach(tr => tr.onclick = () => gesAccion(tr.dataset.ac));
}

// ------------------------------------------------------------------ Alcance
async function gesAlcance(fresco) {
  if (!GESA || fresco) { cargando('#ges', 'Leyendo el alcance…'); try { GESA = await api('p_ges_alcance', {}, 120000); } catch (e) { return; } }
  if (!GESA.ok) return marco('#ges', gesCab('Alcance', '') + '<div class="aviso error">' + esc(GESA.mensaje || GESA.error || 'No se pudo leer.') + '</div>');
  const M = GESA.modulos, C = {}; GESA.celdas.forEach(c => C[c.ESTABLECIMIENTO + '|' + c.MODULO] = c);
  const nivel = (e, m) => (C[e + '|' + m] || {}).NIVEL || 'Sin habilitar';
  const peso = e => M.reduce((s, m) => s + ({ A: 2, B: 1 }[nivel(e.cod, m)] || 0), 0);
  const areas = Array.from(new Set(GESA.establecimientos.map(e => e.area))).sort();
  const E = GESA.establecimientos.filter(e => !gesAlcance.area || e.area === gesAlcance.area).sort((a, b) => peso(b) - peso(a) || a.area.localeCompare(b.area) || a.nombre.localeCompare(b.nombre));
  const celda = (e, m) => { const n = nivel(e.cod, m), c = C[e.cod + '|' + m];
    return '<td style="text-align:center;cursor:pointer" data-cel="' + esc(e.cod) + '|' + esc(m) + '" title="' + esc(m + ' · ' + n + (c && c.DESDE ? ' desde ' + fechaTxt(c.DESDE) : '')) + '">' + (n === 'A' ? '<span class="tag ok">A</span>' : n === 'B' ? '<span class="tag av">B</span>' : '<span class="mu">—</span>') + '</td>'; };
  const cuenta = n => GESA.celdas.filter(c => c.NIVEL === n).length;
  marco('#ges', gesCab('Alcance por establecimiento', 'Cada cruce establecimiento × módulo tiene su nivel: A (programa de seguridad), B (lineamientos provinciales) o sin habilitar. Escalar a la provincia es cambiar una celda.', '') + gesTabs('alcance') +
    '<div class="tb5" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr))">' + gesKpi('Nivel A', new Set(GESA.celdas.filter(c => c.NIVEL === 'A').map(c => c.ESTABLECIMIENTO)).size, 'establecimientos · ' + cuenta('A') + ' módulos') + gesKpi('Nivel B', new Set(GESA.celdas.filter(c => c.NIVEL === 'B').map(c => c.ESTABLECIMIENTO)).size, 'establecimientos · ' + cuenta('B') + ' módulos') + '</div>' +
    '<div class="filtros" style="margin:12px 0"><label class="f">Área programática<select class="c" id="alA">' + gesOpt('', 'Todas', gesAlcance.area || '') + areas.map(a => gesOpt(a, a, gesAlcance.area || '')).join('') + '</select></label></div>' +
    '<section class="card tabla" style="overflow-x:auto"><table><thead><tr><th>Establecimiento</th>' + M.map(m => '<th class="peq" style="text-align:center" title="' + esc(m) + '">' + esc(m.split(' · ')[0]) + '<div class="mu" style="font-weight:400;font-size:10px">' + esc(m.split(' · ')[1].split(' ')[0]) + '</div></th>').join('') + '</tr></thead><tbody>' +
      E.map(e => '<tr><td><b>' + esc(e.nombre) + '</b><div class="mu peq">' + esc(e.cod) + ' · ' + esc(e.area.replace('Área Programática ', 'AP ')) + '</div></td>' + M.map(m => celda(e, m)).join('') + '</tr>').join('') + '</tbody></table></section>' +
    '<section class="card tabla" style="margin-top:12px"><div style="padding:14px 18px;border-bottom:1px solid var(--ln);display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap"><h2 style="margin:0">Empresas contratistas</h2><a class="btn sec peq" href="#datos">Editar en «Datos · editar todo» › BASE COMÚN › GES_EMPRESAS</a></div><table><thead><tr><th>Establ.</th><th>Empresa</th><th>Módulo</th><th>Qué le toca</th><th>Referencia</th></tr></thead><tbody>' +
      (GESA.empresas.length ? GESA.empresas.map(x => '<tr><td><b>' + esc(x.ESTABLECIMIENTO) + '</b></td><td>' + esc(x.EMPRESA) + '</td><td class="peq">' + esc(x.MODULO) + '</td><td class="peq">' + esc(x.QUE_LE_TOCA) + '</td><td class="peq">' + esc(x.REFERENCIA_CONTRATO) + '</td></tr>').join('') : '<tr><td colspan="5" class="mu">Sin empresas cargadas.</td></tr>') + '</tbody></table></section>' +
    '<p class="mu peq">Tocá una celda para cambiar el nivel. Datos en BASE COMÚN › GES_ALCANCE; cada cambio queda en el historial.</p>');
  $('alA').onchange = e => { gesAlcance.area = e.target.value; gesAlcance(); };
  document.querySelectorAll('[data-cel]').forEach(td => td.onclick = () => { const [cod, m] = td.dataset.cel.split('|'), c = C[cod + '|' + m] || {};
    modal(gesNomA(cod) + ' · ' + m, [['nivel', 'Nivel', GESA.niveles], ['desde', 'Desde', 'date'], ['obs', 'Observaciones', null, 1]], { nivel: c.NIVEL || 'Sin habilitar', desde: c.DESDE || '', obs: c.OBSERVACIONES || '' }, async o => {
      if (!o.nivel) return 'Elegí el nivel.';
      const r = await api('p_ges_alcance_guardar', { cod: cod, modulo: m, nivel: o.nivel, desde: o.desde, obs: o.obs }, 90000);
      if (!r.ok) return r.mensaje || 'No se pudo guardar.'; toast('Guardado.'); gesAlcance(true); return ''; }); });
}
const gesNomA = c => ((GESA && GESA.establecimientos.find(e => e.cod === c)) || {}).nombre || c;

// ------------------------------------------------------------------ Elevar a la Dirección (14.63)
// Elige establecimiento y acciones, las marca «Elevada» con la fecha y copia el correo para pegar. El sistema no envía nada.
async function gesElevar(cod) {
  if (!cod) { toast('Trayendo las recomendaciones de los informes nuevos…'); try { await api('p_ges_traer', { solo: 'plan' }, 180000); GESD = await api('p_ges_datos', {}, 180000); } catch (e) { return; } }
  const H = {}; GESD.hallazgos.forEach(h => H[h.ID] = h);
  const cand = GESD.acciones.filter(a => a.abierta && !a.FECHA_ELEVADA && a.ESTADO !== 'Pendiente de recursos');
  const cods = Array.from(new Set(cand.map(a => a.ESTABLECIMIENTO))).sort();
  if (!cods.length) return toast('No hay acciones abiertas sin elevar.');
  cod = cod && cods.indexOf(cod) >= 0 ? cod : (GESF.cod && cods.indexOf(GESF.cod) >= 0 ? GESF.cod : cods[0]);
  const L = cand.filter(a => a.ESTABLECIMIENTO === cod), hoy = new Date().toISOString().slice(0, 10);
  $('ov').innerHTML = '<div class="modal" role="dialog" aria-modal="true" aria-label="Elevar a la Dirección"><h2>Elevar a la Dirección</h2><div class="aviso error" id="mErr" hidden></div>' +
    '<p class="mu peq" style="margin:0 0 10px">Marcá las acciones que necesitan una decisión o recursos de la Dirección. Quedan «Elevada» con la fecha, se registra el envío en su informe de origen y se copia el correo para que lo pegues y lo mandes vos.</p>' +
    '<div class="campos"><label class="f">Establecimiento<select class="c" id="evE">' + cods.map(c => gesOpt(c, gesNom(c) + ' · ' + cand.filter(a => a.ESTABLECIMIENTO === c).length, cod)).join('') + '</select></label>' +
    '<label class="f">Fecha de elevación<input class="c" type="date" id="evF" value="' + hoy + '"></label></div>' +
    '<div style="display:flex;flex-direction:column;gap:6px;max-height:46vh;overflow:auto;margin-top:8px">' + L.map(a => { const h = H[a.HALLAZGO] || {};
      return '<label style="display:flex;gap:10px;align-items:flex-start;border:1px solid var(--ln);border-radius:10px;padding:8px 10px;cursor:pointer"><input type="checkbox" data-ev="' + esc(a.ID) + '"' + (a.REQUIERE_DIRECCION === 'Sí' ? ' checked' : '') + ' style="margin-top:3px">' +
        '<span><b>' + esc(a.ACCION) + '</b><span class="mu peq" style="display:block">' + esc(a.ID) + ' · ' + esc(a.MODULO) + (h.PRIORIDAD ? ' · ' + esc(h.PRIORIDAD) : '') + ' · ' + esc(a.TIPO_RECURSO || 'recurso s/d') + (a.REQUIERE_DIRECCION === 'Sí' ? ' · requiere Dirección' : '') + '</span>' +
        (h.FUENTE ? '<span class="mu peq" style="display:block">Fuente: ' + esc(h.FUENTE) + '</span>' : '<span class="peq" style="display:block;color:#8A5200">Sin fuente cargada: completala en Hallazgos antes de elevar</span>') + '</span></label>'; }).join('') + '</div>' +
    '<div class="acciones"><div></div><div style="display:flex;gap:8px"><button class="btn sec" id="mCan">Cancelar</button><button class="btn pri" id="mOk">Elevar y copiar el correo</button></div></div></div>';
  $('ov').hidden = false;
  const cerrar = () => { $('ov').hidden = true; $('ov').innerHTML = ''; };
  $('mCan').onclick = cerrar; $('evE').onchange = e => gesElevar(e.target.value);
  $('mOk').onclick = async () => {
    const ids = Array.from(document.querySelectorAll('#ov [data-ev]:checked')).map(x => x.dataset.ev), b = $('mOk');
    if (!ids.length) { $('mErr').textContent = 'Marcá al menos una acción.'; $('mErr').hidden = false; return; }
    b.disabled = true; b.textContent = 'Elevando…';
    try { const r = await api('p_ges_elevar', { ids: ids, fecha: $('evF').value }, 120000);
      if (!r.ok) { b.disabled = false; b.textContent = 'Elevar y copiar el correo'; $('mErr').textContent = r.mensaje || 'No se pudo.'; $('mErr').hidden = false; return; }
      cerrar(); await copiarCorreo(r.correo); toast(r.elevadas + ' acción(es) elevadas. El correo quedó copiado: pegalo, revisalo y mandalo desde tu correo.'); gestion(true);
    } catch (e) { b.disabled = false; b.textContent = 'Elevar y copiar el correo'; }
  };
}

// ------------------------------------------------------------------ Acciones abiertas en cada módulo y en la ficha (14.63)
// Al abrir el tablero de un módulo o la ficha de un establecimiento, se agrega abajo un recuadro con sus acciones del plan único.
const GES_MOD_RUTA = { '#res': '1 · Residuos', '#agua': '2 · Agua', '#plagas': '3 · Plagas', '#coc': '4 · Cocinas hospitalarias', '#rad': '5 · Radiaciones ionizantes', '#radest': '5 · Radiaciones ionizantes',
  '#m8': '6 · Servicios e infraestructura', '#inc': '7 · Protección contra incendios', '#sinest': '8 · Personal y RAR', '#cap': '9 · Capacitaciones', '#docest': '10 · Documentos', '#ficha': '' };
let GES_T = 0;
async function gesInyectar(activo) {
  const base = String(activo || '').split('/')[0]; if (!(base in GES_MOD_RUTA)) return;
  const h0 = location.hash, partes = h0.replace(/^#/, '').split('/'), cod = partes[1] ? decodeURIComponent(partes[1]) : '', mod = GES_MOD_RUTA[base];
  if (base === '#ficha' && !cod) return;
  const m = $('main'); if (!m || m.querySelector('.cargando')) return;
  if (!GESD || Date.now() - GES_T > 300000) { try { const r = await api('p_ges_datos', {}, 180000); if (r && r.ok) { GESD = r; GES_T = Date.now(); } } catch (e) { return; } }
  if (!GESD || !GESD.ok || location.hash !== h0) return;
  const mm = $('main'); if (!mm || mm.querySelector('#gesCaja')) return;
  const L = GESD.acciones.filter(a => a.abierta && (!mod || a.MODULO === mod) && (!cod || a.ESTABLECIMIENTO === cod))
    .sort((a, b) => (b.vencida - a.vencida) || String(a.FECHA_LIMITE || '9999').localeCompare(String(b.FECHA_LIMITE || '9999')));
  const venc = L.filter(a => a.vencida).length, ver = L.filter(a => a.verificar).length;
  const caja = document.createElement('section'); caja.className = 'card'; caja.id = 'gesCaja'; caja.style.marginTop = '14px';
  caja.innerHTML = '<div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;align-items:baseline"><h2 style="margin:0;font-size:16px">Acciones abiertas · plan de acción único</h2><a href="#ges" id="gesCajaIr" class="peq" style="font-weight:700">Ver en el plan</a></div>' +
    '<span class="mu peq">' + (mod ? esc(mod) : esc(gesNom(cod))) + (cod && mod ? ' · ' + esc(gesNom(cod)) : '') + ' · ' + L.length + ' abierta(s)' + (venc ? ' · <b style="color:#B4361F">' + venc + ' vencida(s)</b>' : '') + (ver ? ' · ' + ver + ' a verificar' : '') + '</span>' +
    (L.length ? '<div style="display:flex;flex-direction:column;margin-top:8px">' + L.slice(0, 6).map(a => '<a class="at" href="#ges" data-gca="' + esc(a.ID) + '">' + gesTag(a) + '<span><b>' + esc(a.ACCION) + '</b><small>' + esc((cod ? a.MODULO : a.ESTABLECIMIENTO) + (a.RESPONSABLE ? ' · ' + a.RESPONSABLE : ' · sin responsable') + ' · ' + fechaTxt(a.FECHA_LIMITE)) + '</small></span></a>').join('') + '</div>' + (L.length > 6 ? '<span class="mu peq">Y ' + (L.length - 6) + ' más.</span>' : '')
      : '<div class="mu peq" style="margin-top:6px">No hay acciones abiertas.</div>');
  mm.appendChild(caja);
  $('gesCajaIr').onclick = () => { GESF.mod = mod; GESF.cod = cod; GESF.estado = 'abiertas'; };
  caja.querySelectorAll('[data-gca]').forEach(x => x.onclick = ev => { ev.preventDefault(); gesAccion(x.dataset.gca); });
}

// ------------------------------------------------------------------ Reglas automáticas (fase 3 · 14.64)
// La tabla de reglas con su fuente (BASE COMÚN › GES_REGLAS). Se edita acá o en la hoja; el motor corre con «Traer de los módulos» y cada mañana.
let GESR = null; const GESRF = { mod: '', ver: 'todas' };
async function gesReglas(fresco) {
  if (!GESR || fresco) { cargando('#ges', 'Leyendo las reglas…'); try { GESR = await api('p_ges_reglas', {}, 120000); } catch (e) { return; } }
  if (!GESR.ok) return marco('#ges', gesCab('Reglas automáticas', '') + '<div class="aviso error">' + esc(GESR.mensaje || 'No se pudo leer.') + (/desconocida/i.test(GESR.mensaje || '') ? ' Falta instalar Reglas.gs en el Sistema HyS.' : '') + '</div>');
  const R = GESR.reglas, F = GESRF, prog = R.filter(r => r.MOTOR === 'Programada'), act = prog.filter(r => r.ACTIVA === 'Sí');
  const L = R.filter(r => (!F.mod || r.MODULO === F.mod) && (F.ver === 'todas' || (F.ver === 'activas' ? r.ACTIVA === 'Sí' : F.ver === 'programar' ? r.MOTOR !== 'Programada' : r.ACTIVA !== 'Sí' && r.MOTOR === 'Programada')));
  const estado = r => r.MOTOR !== 'Programada' ? '<span class="tag gr">Por programar</span>' : r.ACTIVA === 'Sí' ? '<span class="tag ok">Activa</span>' : '<span class="tag wa">Apagada</span>';
  const mods = Array.from(new Set(R.map(r => r.MODULO)));
  marco('#ges', gesCab('Reglas automáticas', 'Qué condición de cada módulo es un hallazgo, si entra directo al plan o a la bandeja, con qué prioridad, plazo y fuente. En nivel B todo entra sugerido; sin habilitar, no entra.', '<button class="btn sec" id="rTraer">Aplicar ahora</button>') + gesTabs('reglas') +
    '<div class="tb5" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr))">' + gesKpi('Activas', act.length, 'de ' + prog.length + ' programadas') + gesKpi('Por programar', R.length - prog.length, 'figuran con su fuente') +
      gesKpi('Hallazgos abiertos', R.reduce((a, r) => a + (r.abiertos || 0), 0), 'con acción en curso') + gesKpi('En la bandeja', R.reduce((a, r) => a + (r.sugeridos || 0), 0), 'esperan tu decisión') + '</div>' +
    '<div class="filtros" style="margin:12px 0"><label class="f">Módulo<select class="c" id="rM">' + gesOpt('', 'Todos', F.mod) + mods.map(m => gesOpt(m, m, F.mod)).join('') + '</select></label>' +
      '<label class="f">Ver<select class="c" id="rV">' + [['todas', 'Todas'], ['activas', 'Activas'], ['apagadas', 'Apagadas'], ['programar', 'Por programar']].map(o => gesOpt(o[0], o[1], F.ver)).join('') + '</select></label></div>' +
    '<section class="card tabla" style="overflow-x:auto"><table><thead><tr><th>Regla</th><th>Entra</th><th>Prioridad · plazo</th><th>Fuente</th><th>Estado</th><th>Última revisión</th></tr></thead><tbody>' +
      (L.length ? L.map(r => '<tr style="cursor:pointer" data-rg="' + esc(r.ID) + '"><td><b>' + esc(r.REGLA) + '</b><div class="mu peq">' + esc(r.ID) + ' · ' + esc(r.MODULO) + '</div><div class="mu peq">' + esc(r.COMO_SE_DETECTA) + '</div></td>' +
        '<td>' + (r.ENTRA === 'Directo' ? '<span class="tag er">Directo</span>' : '<span class="tag av">Sugerido</span>') + (r.REQUIERE_DIRECCION === 'Sí' ? '<div class="mu peq">requiere Dirección</div>' : '') + '</td>' +
        '<td class="peq">' + esc(r.PRIORIDAD) + '<div class="mu">' + esc(r.PLAZO_DIAS) + ' días</div></td><td class="peq" style="min-width:220px">' + esc(r.FUENTE) + '</td><td>' + estado(r) + '</td>' +
        '<td class="peq">' + (r.ULTIMA_REVISION ? esc(String(r.ULTIMA_REVISION).slice(0, 16).replace(/^(\d{4})-(\d{2})-(\d{2})/, '$3/$2/$1')) + '<div class="mu">' + (r.DETECTADOS || 0) + ' detectado(s) · ' + (r.abiertos || 0) + ' abierto(s)' + (r.sugeridos ? ' · ' + r.sugeridos + ' en la bandeja' : '') + '</div>' : '<span class="mu">—</span>') + '</td></tr>').join('')
        : '<tr><td colspan="6" class="mu">No hay reglas con ese filtro.</td></tr>') + '</tbody></table></section>' +
    '<p class="mu peq">Tocá una regla para cambiar cómo entra, la prioridad, el plazo, la acción, la fuente o para apagarla. Datos en BASE COMÚN › GES_REGLAS (también se editan desde «Datos · editar todo»); cada cambio queda en el historial. Las reglas se aplican con «Traer de los módulos» y cada mañana.</p>');
  $('rM').onchange = e => { F.mod = e.target.value; gesReglas(); }; $('rV').onchange = e => { F.ver = e.target.value; gesReglas(); };
  $('rTraer').onclick = async () => { cargando('#ges', 'Aplicando las reglas a los datos de los módulos…'); let r; try { r = await api('p_ges_traer', { fresco: true }, 300000); } catch (e) { return gesReglas(); }
    toast(r.ok ? 'Nuevos: ' + r.hallazgos + ' hallazgo(s)' + (r.sugeridos ? ', ' + r.sugeridos + ' a la bandeja' : '') + (r.cerradas ? ' · ' + r.cerradas + ' resuelta(s) en su módulo' : '') + (r.errores && r.errores.length ? ' · ⚠ ' + r.errores.join(' · ') : '') : (r.mensaje || 'No se pudo.')); GESD = null; gesReglas(true); };
  document.querySelectorAll('[data-rg]').forEach(tr => tr.onclick = () => { const r = R.find(x => x.ID === tr.dataset.rg);
    const nota = '<p class="mu peq" style="margin:8px 0 0">' + esc(r.ID + ' · ' + r.MODULO) + (r.MOTOR !== 'Programada' ? ' · todavía no la aplica el sistema: queda registrada con su fuente.' : '') + ' Parámetros: clave=valor separados por «;».</p>';
    modal('Regla ' + r.ID, [['REGLA', 'Regla', null, 1], ['COMO_SE_DETECTA', 'Cómo se detecta', null, 1], ['ENTRA', 'Entra', GESR.listas.entra], ['PRIORIDAD', 'Prioridad', GESR.listas.prioridades], ['PLAZO_DIAS', 'Plazo (días)'], ['REQUIERE_DIRECCION', '¿Requiere Dirección?', ['Sí', 'No']],
      ['ACTIVA', 'Activa', ['Sí', 'No']], ['ACCION', 'Acción que propone', null, 1], ['FUENTE', 'Fuente (norma y artículo)', null, 1], ['PARAMETROS', 'Parámetros', null, 1]], r, async o => {
      if (!String(o.FUENTE || '').trim()) return 'Toda regla necesita su fuente.';
      if (o.PLAZO_DIAS && !/^\d+$/.test(String(o.PLAZO_DIAS).trim())) return 'El plazo va en días (un número).';
      const x = await api('p_ges_regla', { id: r.ID, datos: o }, 90000); if (!x.ok) return x.mensaje || 'No se pudo guardar.';
      toast(x.cambios ? 'Regla guardada. Se aplica en la próxima revisión (o tocá «Aplicar ahora»).' : 'Sin cambios.'); gesReglas(true); return ''; }, nota); });
}
