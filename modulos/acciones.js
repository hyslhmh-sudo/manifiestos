// Portal HyS · Acciones de todos los módulos
// Se carga desde portal.html (<script src>). Para el portal de respaldo de Google, herramientas/armar_respaldo.py lo junta en un solo archivo.
// ------------------------------------------------------------------ Acciones de todos los módulos (vista unificada)
// Junta lo abierto de Residuos (diagnóstico y auditorías), Agua, Plagas y Módulo 6. Cada módulo sigue guardando en su planilla.
let ACCF = { cod: '', origen: '', estado: 'abiertas', q: '' };
async function acciones(fresco) {
  if (!TB || TB.vacio || fresco) { cargando('#acciones', 'Juntando las acciones de todos los módulos…');
    try { const r = await api('p_tablero', { fresco: !!fresco }, 240000); if (r && r.ok) { TB = r; LS.set('tab', r); } } catch (e) { return; } }
  if (!RES) { try { RES = await api('p_resumen', {}, 240000); LS.set('res', RES); } catch (e) {} }
  let m8 = [];
  if (m8url()) { try { if (!M8 || fresco) { const d = await m8api('m8_datos'); if (d.ok) M8 = d; }
    if (M8 && M8.ok) { const estDe = {}; M8.relevamientos.forEach(x => estDe[x.id] = x.est || (M8.servicios.find(v => v.id === x.servicio) || {}).est); const hoy = new Date().toISOString().slice(0, 10);
      m8 = M8.hallazgos.filter(h => !/cerr|cumpl|descart|resuelto/i.test(h.estado || '')).map(h => ({ cod: estDe[h.rel] || 's/d', origen: 'Servicios e infraestructura', vencida: !!h.limite && h.limite < hoy,
        estado: h.limite && h.limite < hoy ? 'Vencida' : (h.estado || 'Abierto'), que: (h.item || h.cod) + (h.propuesta ? ' · ' + h.propuesta : ''), donde: h.servicio, prioridad: h.prioridad || '', aCargo: h.responsable || '', limite: h.limite || '', ref: h.id, ir: '#m8plan' })); } } catch (e) {} }
  const nom = c => ((RES && RES.filas.find(f => f.cod === c)) || {}).nombre || c;
  const tiene = (TB.acciones || []).some(a => a.que != null);
  const L = (TB.acciones || []).map(a => Object.assign({ estado: a.vencida ? 'Vencida' : 'Abierta', que: '', donde: '', prioridad: '', aCargo: '', limite: '', ref: '', ir: a.origen === 'Agua' ? '#agua' : a.origen === 'Plagas' ? '#plagas' : '#plan' }, a)).concat(m8);
  const F = ACCF, q = F.q.toLowerCase();
  const vis = L.filter(a => (!F.cod || a.cod === F.cod) && (!F.origen || a.origen === F.origen) && (F.estado !== 'vencidas' || a.vencida) && (!q || (a.que + ' ' + a.donde + ' ' + a.ref).toLowerCase().indexOf(q) >= 0))
    .sort((a, b) => (b.vencida - a.vencida) || String(a.limite || '9999').localeCompare(String(b.limite || '9999')));
  const venc = L.filter(a => a.vencida).length, sem = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10), hoy = new Date().toISOString().slice(0, 10);
  const prox = L.filter(a => !a.vencida && a.limite && a.limite >= hoy && a.limite <= sem).length;
  const cods = Array.from(new Set(L.map(a => a.cod))).sort(), origenes = Array.from(new Set(L.map(a => a.origen)));
  const ch = a => a.vencida ? '<span class="tag er">Vencida</span>' : a.limite && a.limite <= sem ? '<span class="tag wa">Vence pronto</span>' : '<span class="tag ok">En plazo</span>';
  const kpi = (t, v, s, col) => '<div class="kpi2"><span>' + t + '</span><b' + (col ? ' style="color:' + col + '"' : '') + '>' + v + '</b><small>' + s + '</small></div>';
  const porEst = cods.map(c => { const l = L.filter(a => a.cod === c); return [c, l.length, l.filter(a => a.vencida).length]; }).sort((a, b) => b[2] - a[2] || b[1] - a[1]);
  marco('#acciones', '<div class="cab"><div><span class="mu peq">Gestión</span><h1>Acciones de todos los módulos</h1><span class="mu peq">Lo que está abierto en Residuos, Agua, Plagas y Servicios e infraestructura. Cada acción se edita en su módulo: tocá la fila para ir.</span></div>' +
    '<div class="filtros"><button class="btn sec" id="acAct">Actualizar</button></div></div>' +
    (tiene ? '' : '<div class="aviso">El sistema principal todavía no manda el detalle de cada acción (falta publicar la versión 14.3 del Apps Script): por ahora se ve el módulo, el establecimiento y si está vencida.</div>') +
    '<div class="tb5" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr))">' + kpi('Abiertas', L.length, 'en todos los módulos') + kpi('Vencidas', venc, 'pasó la fecha límite', venc ? '#B4361F' : '') + kpi('Vencen en 7 días', prox, 'para seguir esta semana', prox ? '#8A5200' : '') +
      kpi('Establecimientos', cods.length, 'con acciones abiertas') + '</div>' +
    '<section class="card" style="display:flex;flex-direction:column;gap:8px"><h2 style="margin:0;font-size:16px">Por establecimiento</h2><div style="display:flex;flex-wrap:wrap;gap:8px">' +
      porEst.map(x => '<button class="btn sec peq" data-ce="' + esc(x[0]) + '"' + (F.cod === x[0] ? ' style="outline:2px solid var(--az)"' : '') + '><b>' + esc(x[0]) + '</b> · ' + x[1] + (x[2] ? ' <span style="color:#B4361F">(' + x[2] + ' venc.)</span>' : '') + '</button>').join('') + '</div></section>' +
    '<div class="filtros" style="margin:12px 0"><label class="f">Establecimiento<select class="c" id="acE"><option value="">Todos</option>' + cods.map(c => '<option' + (c === F.cod ? ' selected' : '') + ' value="' + esc(c) + '">' + esc(c + ' · ' + nom(c)) + '</option>').join('') + '</select></label>' +
      '<label class="f">Módulo<select class="c" id="acO"><option value="">Todos</option>' + origenes.map(o => '<option' + (o === F.origen ? ' selected' : '') + '>' + esc(o) + '</option>').join('') + '</select></label>' +
      '<label class="f">Mostrar<select class="c" id="acS"><option value="abiertas">Todas las abiertas</option><option value="vencidas"' + (F.estado === 'vencidas' ? ' selected' : '') + '>Solo vencidas</option></select></label>' +
      '<label class="f">Buscar<input class="c" id="acQ" value="' + esc(F.q) + '" placeholder="Palabra, sector o código"></label></div>' +
    '<section class="card tabla"><table><thead><tr><th>Estado</th><th>Establecimiento</th><th>Módulo</th><th>Qué hay que hacer</th><th>Dónde</th><th>Fecha límite</th><th>A cargo</th></tr></thead><tbody>' +
      (vis.length ? vis.map(a => '<tr class="cl" data-ir="' + esc(a.ir) + '"><td>' + ch(a) + '</td><td><b>' + esc(a.cod) + '</b></td><td class="peq">' + esc(a.origen) + (a.ref ? '<div class="mu">' + esc(a.ref) + '</div>' : '') + '</td><td>' + esc(a.que || '—') + (a.prioridad ? '<div class="mu peq">Prioridad: ' + esc(a.prioridad) + '</div>' : '') + '</td><td class="peq">' + esc(a.donde || '—') + '</td><td>' + esc(a.limite ? fechaTxt(a.limite) : 's/d') + '</td><td class="peq">' + esc(a.aCargo || 's/d') + '</td></tr>').join('')
        : '<tr><td colspan="7" class="mu">No hay acciones con estos filtros.</td></tr>') + '</tbody></table></section>' +
    '<p class="mu peq">Fuentes: plan de acción de residuos (diagnósticos y auditorías), agua NO APTA (15 días hábiles), casos de plagas abiertos y hallazgos del módulo 6 (30, 90 o 180 días).</p>');
  const re = () => acciones();
  $('acAct').onclick = () => acciones(true);
  $('acE').onchange = e => { ACCF.cod = e.target.value; re(); }; $('acO').onchange = e => { ACCF.origen = e.target.value; re(); }; $('acS').onchange = e => { ACCF.estado = e.target.value; re(); };
  $('acQ').onchange = e => { ACCF.q = e.target.value.trim(); re(); };
  document.querySelectorAll('[data-ce]').forEach(b => b.onclick = () => { ACCF.cod = ACCF.cod === b.dataset.ce ? '' : b.dataset.ce; re(); });
  document.querySelectorAll('tr.cl[data-ir]').forEach(tr => tr.onclick = () => { location.hash = tr.dataset.ir; });
}
