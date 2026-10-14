// Portal HyS · Módulo 6 · Servicios hospitalarios e infraestructura
// Se carga desde portal.html (<script src>). Para el portal de respaldo de Google, herramientas/armar_respaldo.py lo junta en un solo archivo.
// ------------------------------------------------------------------ Módulo 6 · Servicios hospitalarios e infraestructura (Modulo8.gs, en la planilla del módulo 6)
// Tiene su propia dirección de Apps Script (M8_API_FIJA).
const M8_API_FIJA = 'https://script.google.com/macros/s/AKfycbzatb2E3LkLq0E_tx8KQd0PKglLKJtGuEp_52I0JkN2aYVhk9D9i2XPkItmWlz9w9Md/exec';
const M8_LINKS = {
  planilla: 'https://docs.google.com/spreadsheets/d/1YgClAXgqLHvSRzFLV9AdX5UnGvtdINX__y0QGM7DTPc/edit',
  campo: 'https://docs.google.com/document/d/1cOoofn0GI3VQ82W5q2MXUxSzgrU9y-RMkZ8OjoimhDo/edit',
  modelo: 'https://docs.google.com/document/d/1ckp8CoRYTQpx6WJqKAruvQeHqCMM5FSuuEQ65HaRyN8/edit',
  libro: 'https://docs.google.com/spreadsheets/d/1zJ_7xbnemqMvkhMYrJoN6F0cWUUiA1LrJIlpx9XKeB8/edit',
  carpeta: 'https://drive.google.com/drive/folders/1_2lcPXz9MVwHufCbsRy5KAO-IA5Q0PYW',
  manual: 'https://docs.google.com/document/d/1SAArtXiru7DcfrUHEMqs9Phzma07lIj_7mkT2pYKjuc/edit'
};
let M8 = null, M8F = { estado: 'abiertos', prio: '', serv: '' };
const m8url = () => M8_API_FIJA;
async function m8api(accion, datos, ms) {
  const url = m8url(); if (!url) throw new Error('sin-url');
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), ms || 120000);
  try {
    const r = await fetch(url, { method: 'POST', body: JSON.stringify({ accion: accion, clave: CLAVE, datos: datos || {} }), signal: ctl.signal });
    const j = JSON.parse(await r.text());
    if (j.error === 'clave') { toast('La clave del módulo 6 no coincide: configurala en la planilla, menú Módulo 8 › Configurar clave del portal.'); throw new Error('clave8'); }
    return j;
  } catch (e) { if (e.message !== 'clave8') toast(e.name === 'AbortError' ? 'El módulo 6 tardó demasiado. Probá de nuevo.' : 'No se pudo conectar con el módulo 6.'); throw e; }
  finally { clearTimeout(t); }
}
async function m8cargar(ruta, fresco) {
  if (!M8 || fresco) {
    cargando(ruta, 'Leyendo el módulo 6…');
    try { M8 = await m8api('m8_datos'); } catch (e) { marco(ruta, '<div class="aviso error">No se pudo leer el módulo 6. <button class="link" id="m8re">Reintentar</button></div>'); const b = $('m8re'); if (b) b.onclick = () => m8cargar(ruta, true).then(ok => ok && router()); return false; }
    if (!M8.ok) { marco(ruta, '<div class="aviso error">' + esc(M8.mensaje || 'Error del módulo 6.') + '</div>'); M8 = null; return false; }
  }
  return true;
}
const m8chip = s => s === 'ROJO' ? '<span class="chip er">Rojo</span>' : s === 'AMARILLO' ? '<span class="chip wa">Amarillo</span>' : s === 'VERDE' ? '<span class="chip ok">Verde</span>' : '<span class="chip gr">Sin datos</span>';
const m8prio = p => p === 'Actuar ya' ? '<span class="chip er">Actuar ya</span>' : p === 'Resolver rápido' ? '<span class="chip wa">Resolver rápido</span>' : p === 'Planificar' ? '<span class="chip ok">Planificar</span>' : '<span class="chip gr">' + esc(p || '—') + '</span>';
const m8cab = (t, sub, botones) => '<div class="cab"><div><span class="mu peq">6 · Servicios e infraestructura</span><h1>' + t + '</h1>' + (sub ? '<span class="mu peq">' + sub + '</span>' : '') + '</div><div class="filtros">' + (botones || '') + '<button class="btn sec" id="m8act">Actualizar</button></div></div>';
const m8act = fn => { const b = $('m8act'); if (b) b.onclick = async () => { if (await m8cargar(location.hash.split('/')[0], true)) fn(); }; };

// Tablero del módulo
async function m8Tablero() {
  if (!(await m8cargar('#m8'))) return;
  const R = M8.relevamientos, Hh = M8.hallazgos, S = M8.servicios;
  const abiertos = Hh.filter(h => !/resuelto|descartado/i.test(h.estado)), hoy = new Date().toISOString().slice(0, 10);
  const vencidos = abiertos.filter(h => h.limite && h.limite < hoy), urgentes = abiertos.filter(h => h.prioridad === 'Actuar ya');
  const ultimo = {}; R.forEach(r => { if (!ultimo[r.servicio] || r.fecha > ultimo[r.servicio].fecha) ultimo[r.servicio] = r; });
  const kpi = (n, t, s) => '<div class="kpi2"><span>' + t + '</span><b>' + n + '</b><small>' + s + '</small></div>';
  marco('#m8', m8cab('Tablero del módulo 6', 'Diagnóstico y auditoría de infraestructura e instalaciones por edificio y servicio.', '<a class="btn pri" href="#m8rel/nuevo">Nuevo relevamiento</a>') +
    '<div class="tb5">' + kpi(Object.keys(ultimo).length + ' de ' + S.length, 'Servicios relevados', 'Edificios y servicios cargados en SERVICIOS') +
    kpi(Object.values(ultimo).filter(r => r.semaforo === 'ROJO').length, 'En rojo', 'Último relevamiento de cada servicio') +
    kpi(urgentes.length, 'Actuar ya', 'Hallazgos abiertos a 30 días') + kpi(vencidos.length, 'Vencidos', 'Hallazgos abiertos con fecha límite pasada') + '</div>' +
    '<section class="card tabla"><h2 style="margin:0 0 8px;font-size:16px">Estado por servicio (último relevamiento)</h2><table><thead><tr><th>Servicio</th><th>Establecimiento</th><th>Criticidad</th><th>Último relevamiento</th><th>Cumplimiento</th><th>Críticos en NC</th><th>Semáforo</th></tr></thead><tbody>' +
    S.map(s => { const u = ultimo[s.id]; return '<tr class="cl" data-h="' + (u ? '#m8rel/' + encodeURIComponent(u.id) : '#m8rel/nuevo?' + encodeURIComponent(s.id)) + '"><td><b>' + esc(s.servicio) + '</b><div class="mu peq">' + esc(s.id) + ' · ' + esc(s.edificio) + '</div></td><td>' + esc(s.est) + '</td><td>' + esc(s.criticidad) + '</td><td>' + (u ? fechaTxt(u.fecha) + ' · ' + esc(u.tipo) : '<span class="mu">Sin relevar</span>') + '</td><td>' + (u && u.pct != null ? Math.round(u.pct * 100) + ' %' : '—') + '</td><td>' + (u ? esc(u.criticosNC) : '—') + '</td><td>' + (u ? m8chip(u.semaforo) : '<span class="chip gr">Sin datos</span>') + '</td></tr>'; }).join('') +
    '</tbody></table></section>' +
    '<section class="card"><h2 style="margin:0 0 6px;font-size:16px">Requiere atención</h2>' + (vencidos.concat(urgentes.filter(h => vencidos.indexOf(h) < 0)).slice(0, 12).map(h => '<a class="at" href="#m8plan"><span><b>' + esc(h.item) + '</b><small>' + esc(h.servicio) + ' · ' + esc(h.prioridad) + ' · límite ' + fechaTxt(h.limite) + (h.limite && h.limite < hoy ? ' (vencido)' : '') + '</small></span></a>').join('') || '<div class="mu">Nada urgente.</div>') + '</section>' +
    '<section class="card" style="display:flex;flex-wrap:wrap;gap:8px"><a class="btn sec" href="' + M8_LINKS.planilla + '" target="_blank" rel="noopener">Planilla del módulo ↗</a><a class="btn sec" href="' + M8_LINKS.campo + '" target="_blank" rel="noopener">Listas de campo ↗</a><a class="btn sec" href="' + M8_LINKS.modelo + '" target="_blank" rel="noopener">Modelo de informe ↗</a><a class="btn sec" href="' + M8_LINKS.carpeta + '" target="_blank" rel="noopener">Carpeta del módulo ↗</a><a class="btn sec" href="' + M8_LINKS.manual + '" target="_blank" rel="noopener">Manual para la red ↗</a></section>' +
    '<p class="mu peq">Datos al ' + new Date(M8.actualizado).toLocaleString('es-AR') + ' · módulo 6 versión ' + esc(M8.version) + '.</p>');
  document.querySelectorAll('tr.cl[data-h]').forEach(tr => tr.onclick = () => location.hash = tr.dataset.h);
  m8act(m8Tablero);
}

// Relevamiento: nuevo o existente
async function m8Relev(arg) {
  if (!(await m8cargar('#m8rel'))) return;
  const [idArg, pre] = String(arg || 'nuevo').split('?');
  const nuevo = idArg === 'nuevo', cab0 = nuevo ? null : M8.relevamientos.find(r => r.id === idArg);
  if (!nuevo && !cab0) return marco('#m8rel', '<div class="aviso error">No existe el relevamiento ' + esc(idArg) + '.</div>');
  const S = M8.servicios, hoy = new Date().toISOString().slice(0, 10);
  let sid = cab0 ? cab0.servicio : decodeURIComponent(pre || ''), items = [];
  const pintar = () => {
    const sv = S.find(s => s.id === sid);
    const cont = { C: 0, P: 0, NC: 0, NA: 0, '': 0 }; items.forEach(i => cont[i.resp || '']++);
    marco('#m8rel', m8cab(nuevo ? 'Nuevo relevamiento' : 'Relevamiento ' + esc(idArg), sv ? esc(sv.servicio) + ' · ' + esc(sv.est) + ' · ' + esc(sv.edificio) : 'Elegí el edificio o servicio') +
      '<section class="card"><div class="campos" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px">' +
      '<label class="f">Edificio o servicio<select class="c" id="m8s"' + (nuevo ? '' : ' disabled') + '><option value=""></option>' + S.map(s => '<option value="' + esc(s.id) + '"' + (s.id === sid ? ' selected' : '') + '>' + esc(s.id + ' · ' + s.servicio) + '</option>').join('') + '</select></label>' +
      '<label class="f">ID del relevamiento<input class="c" id="m8id" value="' + esc(cab0 ? cab0.id : (sid ? sid + '-' + hoy.replace(/-/g, '') : '')) + '"' + (nuevo ? '' : ' disabled') + '></label>' +
      '<label class="f">Fecha<input class="c" type="date" id="m8f" value="' + esc(cab0 ? cab0.fecha : hoy) + '"></label>' +
      '<label class="f">Tipo<select class="c" id="m8t"><option' + (!cab0 || cab0.tipo === 'Diagnóstico' ? ' selected' : '') + '>Diagnóstico</option><option' + (cab0 && cab0.tipo === 'Auditoría' ? ' selected' : '') + '>Auditoría</option></select></label>' +
      '<label class="f">Relevó<input class="c" id="m8r" value="' + esc(cab0 ? cab0.relevo : 'Belén Pellegrini') + '"></label>' +
      '<label class="f">Acompañó (nombre y función)<input class="c" id="m8a" value="' + esc(cab0 ? cab0.acompano : '') + '"></label>' +
      '<label class="f" style="grid-column:1/-1">Observaciones generales<input class="c" id="m8o" value="' + esc(cab0 ? cab0.obs : '') + '"></label></div></section>' +
      (items.length ? '<section class="card"><div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;align-items:center"><h2 style="margin:0;font-size:16px">' + items.length + ' puntos a verificar</h2><span class="peq">C ' + cont.C + ' · P ' + cont.P + ' · NC ' + cont.NC + ' · NA ' + cont.NA + ' · sin responder ' + cont[''] + '</span></div>' +
        '<div class="mu peq" style="margin:4px 0 10px">★ = punto crítico: si no cumple, sacá foto y pegá el enlace. Las respuestas se guardan al tocar «Guardar».</div>' +
        items.map((i, n) => '<div style="border-top:1px solid #EEF2F4;padding:10px 0;display:flex;flex-direction:column;gap:6px"><div><b>' + (i.critico ? '★ ' : '') + esc(i.cod.replace('M8-', '')) + '</b> · ' + esc(i.item) + '<div class="mu peq">' + esc(i.verificar) + ' · ' + esc(i.fund) + '</div></div>' +
          '<div style="display:flex;gap:6px;flex-wrap:wrap">' + ['C', 'P', 'NC', 'NA'].map(o => '<button class="btn ' + (i.resp === o ? 'pri' : 'sec') + '" style="min-width:52px" data-r="' + n + '" data-o="' + o + '">' + o + '</button>').join('') + '</div>' +
          '<div style="display:grid;grid-template-columns:2fr 1fr;gap:6px"><input class="c" data-obs="' + n + '" placeholder="Observación: qué, dónde, cuándo" value="' + esc(i.obs) + '"><input class="c" data-foto="' + n + '" placeholder="Enlace de la foto" value="' + esc(i.foto) + '"></div></div>').join('') + '</section>' : '') +
      '<section class="card" style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end">' + (nuevo ? '' : '<button class="btn sec" id="m8h">Generar hallazgos (P y NC)</button>' + (cab0 && cab0.informe ? '<a class="btn sec" href="' + esc(cab0.informe) + '" target="_blank" rel="noopener">Abrir informe ↗</a>' : '') + '<button class="btn sec" id="m8inf">' + (cab0 && cab0.informe ? 'Generar otro borrador' : 'Generar informe a la Dirección') + '</button>') + '<a class="btn sec" href="' + M8_LINKS.modelo + '" target="_blank" rel="noopener">Modelo de informe ↗</a><button class="btn pri" id="m8save"' + (items.length ? '' : ' disabled') + '>Guardar</button></section>');
    const sel = $('m8s'); if (sel && nuevo) sel.onchange = async e => { sid = e.target.value; $('m8id').value = sid ? sid + '-' + hoy.replace(/-/g, '') : ''; await traer(); };
    document.querySelectorAll('[data-r]').forEach(b => b.onclick = () => { leer(); const i = items[Number(b.dataset.r)]; i.resp = i.resp === b.dataset.o ? '' : b.dataset.o; const y = window.scrollY; pintar(); window.scrollTo(0, y); });
    $('m8save').onclick = guardar;
    const bi = $('m8inf'); if (bi) bi.onclick = async () => { bi.disabled = true; bi.textContent = 'Armando el informe…';
      try { const r = await m8api('m8_informe', { id: idArg }, 300000); if (r.ok) { toast('Informe ' + r.nro + ' listo: tocá «Abrir informe».'); M8 = null; return m8Relev(arg); } else toast(r.mensaje); } catch (e) {}
      bi.disabled = false; bi.textContent = 'Generar informe a la Dirección'; };
    const bh = $('m8h'); if (bh) bh.onclick = async () => { bh.disabled = true; try { const r = await m8api('m8_hallazgos_generar', { id: idArg }); toast(r.ok ? r.nuevos + ' hallazgo(s) nuevo(s) en el plan de acción.' : r.mensaje); if (r.ok) { M8 = null; } } catch (e) {} bh.disabled = false; };
    m8act(() => m8Relev(arg));
  };
  const leer = () => { document.querySelectorAll('[data-obs]').forEach(x => items[Number(x.dataset.obs)].obs = x.value); document.querySelectorAll('[data-foto]').forEach(x => items[Number(x.dataset.foto)].foto = x.value); };
  const traer = async () => {
    if (!sid) { items = []; return pintar(); }
    cargando('#m8rel', 'Armando la lista de verificación…');
    try { const r = await m8api('m8_items', { servicio: sid, id: nuevo ? '' : idArg }); if (!r.ok) { toast(r.mensaje); items = []; } else items = r.items; } catch (e) { items = []; }
    pintar();
  };
  const guardar = async () => {
    leer();
    const id = $('m8id').value.trim(); if (!id || !sid) return toast('Elegí el servicio y completá el ID.');
    if (nuevo && M8.relevamientos.some(r => r.id === id)) return toast('Ya existe un relevamiento con ese ID. Cambialo (por ejemplo, agregando -2).');
    const sinFoto = items.filter(i => i.critico && i.resp === 'NC' && !i.foto).length;
    if (sinFoto && !confirm(sinFoto + ' punto(s) crítico(s) en NC no tienen foto. ¿Guardar igual?')) return;
    const b = $('m8save'); b.disabled = true; b.textContent = 'Guardando…';
    try {
      const r = await m8api('m8_guardar', { cabecera: { id: id, fecha: $('m8f').value, tipo: $('m8t').value, servicio: sid, relevo: $('m8r').value, acompano: $('m8a').value, obs: $('m8o').value }, respuestas: items.map(i => ({ cod: i.cod, resp: i.resp, obs: i.obs, foto: i.foto })) });
      if (!r.ok) { toast(r.mensaje); b.disabled = false; b.textContent = 'Guardar'; return; }
      toast('Guardado: ' + r.respuestas + ' respuestas.'); M8 = null;
      if (nuevo) location.hash = '#m8rel/' + encodeURIComponent(id); else { await m8cargar('#m8rel', true); m8Relev(arg); }
    } catch (e) { b.disabled = false; b.textContent = 'Guardar'; }
  };
  if (sid) await traer(); else pintar();
}

// Plan de acción del módulo
async function m8Plan() {
  if (!(await m8cargar('#m8plan'))) return;
  const Hh = M8.hallazgos, hoy = new Date().toISOString().slice(0, 10);
  const servs = Array.from(new Set(Hh.map(h => h.servicio).filter(Boolean))).sort();
  const vis = Hh.filter(h => (M8F.estado === 'todos' || (M8F.estado === 'abiertos' ? !/resuelto|descartado/i.test(h.estado) : h.estado === M8F.estado)) && (!M8F.prio || h.prioridad === M8F.prio) && (!M8F.serv || h.servicio === M8F.serv))
    .sort((a, b) => (['Actuar ya', 'Resolver rápido', 'Planificar'].indexOf(a.prioridad) - ['Actuar ya', 'Resolver rápido', 'Planificar'].indexOf(b.prioridad)) || String(a.limite).localeCompare(String(b.limite)));
  const opt = (v, l, s) => '<option value="' + esc(v) + '"' + (v === s ? ' selected' : '') + '>' + esc(l) + '</option>';
  marco('#m8plan', m8cab('Plan de acción', 'Hallazgos de los relevamientos. Solo Higiene y Seguridad cambia los estados.',
    '<label class="f">Estado<select class="c" id="pE">' + opt('abiertos', 'Abiertos', M8F.estado) + ['Abierto', 'En curso', 'Sin respuesta', 'Resuelto', 'Descartado'].map(x => opt(x, x, M8F.estado)).join('') + opt('todos', 'Todos', M8F.estado) + '</select></label>' +
    '<label class="f">Prioridad<select class="c" id="pP">' + opt('', 'Todas', M8F.prio) + ['Actuar ya', 'Resolver rápido', 'Planificar'].map(x => opt(x, x, M8F.prio)).join('') + '</select></label>' +
    '<label class="f">Servicio<select class="c" id="pS">' + opt('', 'Todos', M8F.serv) + servs.map(x => opt(x, x, M8F.serv)).join('') + '</select></label>') +
    '<section class="card tabla"><table><thead><tr><th>Prioridad</th><th>Hallazgo</th><th>Servicio</th><th>Propuesta</th><th>Responsable</th><th>Esfuerzo</th><th>Límite</th><th>Estado</th></tr></thead><tbody>' +
    vis.map(h => '<tr class="cl" data-f="' + h.fila + '"><td>' + m8prio(h.prioridad) + '</td><td><b>' + esc(h.item) + '</b><div class="mu peq">' + esc(h.id + ' · ' + h.rel) + (h.desc ? ' · ' + esc(h.desc) : '') + '</div></td><td class="peq">' + esc(h.servicio) + '</td><td class="peq">' + esc(h.propuesta) + '</td><td class="peq">' + esc(h.responsable) + '</td><td class="peq">' + esc(h.esfuerzo) + '</td><td>' + fechaTxt(h.limite) + (h.limite && h.limite < hoy && !/resuelto|descartado/i.test(h.estado) ? ' <span class="chip er">Vencido</span>' : '') + '</td><td>' + esc(h.estado) + '</td></tr>').join('') +
    '</tbody></table>' + (vis.length ? '' : '<div class="vacio">No hay hallazgos con estos filtros.</div>') + '</section>' +
    '<p class="mu peq">Los hallazgos se generan desde cada relevamiento («Generar hallazgos»). Tocá una fila para cargar la respuesta de la Dirección, cambiar el estado o ajustar la propuesta.</p>');
  $('pE').onchange = e => { M8F.estado = e.target.value; m8Plan(); }; $('pP').onchange = e => { M8F.prio = e.target.value; m8Plan(); }; $('pS').onchange = e => { M8F.serv = e.target.value; m8Plan(); };
  document.querySelectorAll('tr.cl[data-f]').forEach(tr => tr.onclick = () => { const h = Hh.find(x => String(x.fila) === tr.dataset.f);
    modal(h.id + ' · ' + h.item, [['estado', 'Estado', ['Abierto', 'En curso', 'Sin respuesta', 'Resuelto', 'Descartado']], ['cierre', 'Fecha de cierre', 'date'], ['propuesta', 'Propuesta de mejora', null, 1], ['responsable', 'Responsable'], ['esfuerzo', 'Esfuerzo', ['Sin costo', 'Bajo costo', 'Requiere compra', 'Requiere obra']], ['respDir', 'Respuesta de la Dirección', null, 1]], h,
      async v => { const r = await m8api('m8_hallazgo_guardar', Object.assign({ fila: h.fila, id: h.id }, v)); if (!r.ok) return r.mensaje || 'No se pudo guardar.'; toast('Hallazgo actualizado.'); await m8cargar('#m8plan', true); m8Plan(); return ''; }); });
  m8act(m8Plan);
}

// Edificios y servicios
// Suma a la lista el valor que ya tiene la fila, para no perderlo al editar
const m8con = (op, v) => v && op.indexOf(String(v)) < 0 ? op.concat([String(v)]) : op;
async function m8Servicios() {
  if (!(await m8cargar('#m8serv'))) return;
  const S = M8.servicios, TIPOS = ['Edificio', 'Guardia', 'Quirófano', 'UTI', 'UCIP', 'Neonatología', 'Esterilización', 'Internación', 'Laboratorio', 'Diagnóstico por imágenes', 'Hemoterapia', 'Farmacia', 'Lavadero', 'Salud Mental', 'Anatomía Patológica', 'Hospital de día oncológico', 'Cocina', 'Consultorios'];
  marco('#m8serv', m8cab('Edificios y servicios', 'Cada fila es un edificio (capa A) o un servicio (capa B). El tipo define qué ítems del catálogo se aplican.', '<button class="btn pri" id="sN">Agregar</button>') +
    '<section class="card tabla"><table><thead><tr><th>ID</th><th>Servicio</th><th>Establecimiento</th><th>Edificio</th><th>Tipo</th><th>Criticidad</th><th>Directriz</th></tr></thead><tbody>' +
    S.map((s, n) => '<tr class="cl" data-n="' + n + '"><td><b>' + esc(s.id) + '</b></td><td>' + esc(s.servicio) + '</td><td>' + esc(s.est) + '</td><td>' + esc(s.edificio) + '</td><td>' + esc(s.tipo) + '</td><td>' + esc(s.criticidad) + '</td><td class="peq">' + esc(s.directriz) + '</td></tr>').join('') + '</tbody></table></section>' +
    '<p class="mu peq">Criticidad: 1 baja, 2 media, 3 alta (áreas críticas y edificios que las alojan). Si falta un dato, escribí «s/d».</p>');
  const B = M8.base || { establecimientos: [], sitios: [] };
  const optEst = B.establecimientos.length ? ['s/d'].concat(B.establecimientos.map(e => e.cod)) : null;
  const optEdi = B.sitios.length ? ['s/d (revisar)'].concat(Array.from(new Set(B.sitios.map(x => x.sitio)))) : null;
  const editar = s => modal(s ? 'Editar ' + s.id : 'Agregar edificio o servicio', [['id', 'ID (ej.: HMH-GUA)'], ['servicio', 'Nombre del servicio o edificio'], optEst ? ['est', 'Establecimiento (código de la Base común)', m8con(optEst, s && s.est)] : ['est', 'Establecimiento (código)'], optEdi ? ['edificio', 'Edificio o sede (sitios de la Base común)', m8con(optEdi, s && s.edificio)] : ['edificio', 'Edificio o sede'], ['tipo', 'Tipo', TIPOS], ['criticidad', 'Criticidad', ['1', '2', '3']], ['directriz', 'Directriz aplicable'], ['personas', 'Personas expuestas'], ['jefatura', 'Jefatura'], ['obs', 'Observaciones', null, 1]], s ? Object.assign({}, s, { criticidad: String(s.criticidad) }) : { criticidad: '2' },
    async v => { if (!s && S.some(x => x.id === v.id.trim())) return 'Ya existe ese ID.'; const r = await m8api('m8_servicio_guardar', Object.assign(v, { id: s ? s.id : v.id.trim() })); if (!r.ok) return r.mensaje; toast('Guardado.'); await m8cargar('#m8serv', true); m8Servicios(); return ''; });
  $('sN').onclick = () => editar(null);
  document.querySelectorAll('tr.cl[data-n]').forEach(tr => tr.onclick = () => editar(S[Number(tr.dataset.n)]));
  m8act(m8Servicios);
}

// Libros para la red
async function m8Libros() {
  if (!(await m8cargar('#m8libros'))) return;
  const S = M8.servicios, B = M8.base || { establecimientos: [] }, nom = {}; B.establecimientos.forEach(e => nom[e.cod] = e.nombre);
  const ests = Array.from(new Set(S.map(s => s.est).filter(e => e && e !== 's/d'))).sort();
  marco('#m8libros', m8cab('Libros para la red', 'Cada establecimiento recibe un libro con sus ítems, lo completa y Higiene y Seguridad lo importa.') +
    '<div class="tb3"><section class="card" style="display:flex;flex-direction:column;gap:10px"><h2 style="margin:0;font-size:16px">1 · Generar un libro</h2>' +
    '<label class="f">Establecimiento (código)<select class="c" id="lE"><option value=""></option>' + ests.map(e => '<option>' + esc(e) + '</option>').join('') + '</select></label>' +
    '<label class="f">Nombre del establecimiento<input class="c" id="lN" placeholder="Ej.: Hospital María Humphreys"></label>' +
    '<div id="lS" class="peq mu">Elegí el establecimiento para ver sus edificios y servicios.</div>' +
    '<button class="btn pri" id="lG">Generar libro</button><div class="mu peq">El libro queda en la carpeta del módulo › LIBROS DE LA RED. Compartilo vos con el referente como editor (el sistema no comparte ni envía correos).</div><div id="lR"></div></section>' +
    '<section class="card" style="display:flex;flex-direction:column;gap:10px"><h2 style="margin:0;font-size:16px">2 · Importar un libro completo</h2>' +
    '<label class="f">Enlace del libro<input class="c" id="lU" placeholder="https://docs.google.com/spreadsheets/d/…"></label>' +
    '<label style="display:flex;gap:8px;align-items:center;font-size:14px"><input type="checkbox" id="lH" checked> Generar los hallazgos (P y NC) al importar</label>' +
    '<button class="btn pri" id="lI">Importar</button><div id="lIR"></div>' +
    '<div class="mu peq">Crea un relevamiento por cada servicio con respuestas. Si se importa dos veces, se crea otro relevamiento con el sufijo -2.</div></section>' +
    '<section class="card" style="display:flex;flex-direction:column;gap:8px"><h2 style="margin:0;font-size:16px">Modelo</h2><a class="btn sec" href="' + M8_LINKS.libro + '" target="_blank" rel="noopener">Ver el libro modelo ↗</a><a class="btn sec" href="' + M8_LINKS.carpeta + '" target="_blank" rel="noopener">Carpeta del módulo ↗</a></section></div>');
  $('lE').onchange = e => { const L = S.filter(s => s.est === e.target.value); if (nom[e.target.value]) $('lN').value = nom[e.target.value];
    $('lS').innerHTML = L.length ? L.map(s => '<label style="display:flex;gap:8px;align-items:center;font-size:14px;color:var(--tx)"><input type="checkbox" data-sv="' + esc(s.id) + '" checked> ' + esc(s.id + ' · ' + s.servicio + ' (' + s.tipo + ')') + '</label>').join('') : 'Este establecimiento no tiene servicios cargados: agregalos en «Edificios y servicios».'; };
  $('lG').onclick = async () => {
    const ids = Array.from(document.querySelectorAll('[data-sv]:checked')).map(x => x.dataset.sv); if (!ids.length) return toast('Elegí al menos un edificio o servicio.');
    const b = $('lG'); b.disabled = true; b.textContent = 'Generando…';
    try { const r = await m8api('m8_libro_generar', { cod: $('lE').value, est: $('lN').value || $('lE').value, servicios: ids }, 180000);
      $('lR').innerHTML = r.ok ? '<div class="aviso">Libro generado con ' + r.filas + ' ítems: <a href="' + esc(r.url) + '" target="_blank" rel="noopener">' + esc(r.nombre) + ' ↗</a></div>' : '<div class="aviso error">' + esc(r.mensaje) + '</div>'; } catch (e) {}
    b.disabled = false; b.textContent = 'Generar libro';
  };
  $('lI').onclick = async () => {
    const u = $('lU').value.trim(); if (!/docs\.google\.com\/spreadsheets/.test(u)) return toast('Pegá el enlace de una planilla de Google.');
    const b = $('lI'); b.disabled = true; b.textContent = 'Importando…';
    try { const r = await m8api('m8_libro_importar', { url: u, generarHallazgos: $('lH').checked }, 240000);
      $('lIR').innerHTML = r.ok ? '<div class="aviso">' + r.relevamientos.map(x => '<div><a href="#m8rel/' + encodeURIComponent(x.id) + '">' + esc(x.id) + '</a>: ' + x.respuestas + ' respuestas · ' + x.hallazgos + ' hallazgos</div>').join('') + '</div>' : '<div class="aviso error">' + esc(r.mensaje) + '</div>';
      if (r.ok) M8 = null; } catch (e) {}
    b.disabled = false; b.textContent = 'Importar';
  };
}
