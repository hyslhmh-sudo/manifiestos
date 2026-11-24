// Portal HyS · 7 · Incendio › Revisión de ubicaciones del HMH (IncendioUbicaciones.gs) · versión 0 (07/11/2026, pedido de Belén)
// Al reponer extintores en el HMH se asignaron ubicaciones que no son las que necesita HyS. Acá se ve cada extintor con su foto
// panorámica, por planta y sector, y se decide: «Queda acá» o «Mover a…». Con los que hay que mover se arma la lista para SOMI o
// Mantenimiento (para imprimir; no se manda por correo). «Ya lo movieron» actualiza el extintor y su etiqueta QR queda pendiente.
// 24/11/2026 · vista en TABLA (pedido de Belén: «es lento; necesito una tabla, ver las fotos si accedo y aceptar de a uno o de varios»):
//   - Una fila por extintor, agrupada por planta y sector. La foto NO se descarga hasta que se toca «📷 Ver» (por eso abre rápido).
//   - Casillas para elegir varios (por fila, por sector o «todos los que se ven») y barra con «✅ Quedan acá», «Ya los movieron» y «Deshacer».
//   - Visor de fotos: foto grande, «✅ Queda acá» pasa solo al siguiente; flechas ← → para recorrer, tecla Q = queda, M = mover, Esc = cerrar.
//   - Lo que se marca se ve al instante y se guarda en segundo plano, en lotes (no vuelve a leer toda la lista después de cada clic).
// Se carga desde portal.html (<script src>). Para el portal de respaldo, herramientas/armar_respaldo.py lo junta en un solo archivo.
let INCU = null, INCUF = 'todos', INCUQ = '';
const INCUSEL = new Set();                 // extintores tildados
const INCUCOLA = { queda: new Set(), borrar: new Set() };   // decisiones esperando guardarse (se mandan juntas)
let INCUENVIO = null, INCUGUARDANDO = 0;   // temporizador del envío y cuántos se están guardando
const INCU_EST = { 'Queda': ['✅ Queda', 'ok'], 'Mover (pendiente)': ['↪️ Para mover', 'wa'], 'Movido': ['Movido', 'pa'] };

// Ayuda de esta pantalla (reemplaza la del portal.html, así queda junto con el código que describe)
if (typeof AYUDA === 'object') AYUDA['#incubic'] = ['7 · Revisión de ubicaciones de extintores · HMH', [
  'Para decidir dónde va cada extintor del HMH antes de pegar las etiquetas QR. Es una tabla: una fila por extintor, agrupada por planta y sector, con el puesto, el tipo, dónde está ahora y cómo quedó.',
  'La foto panorámica se abre solo cuando tocás «📷 Ver» (así la pantalla carga rápido). En el visor: «✅ Queda acá» lo marca y pasa solo al siguiente; «↪️ Mover a…» abre el destino; con las flechas ← → recorrés la lista. En la computadora: Q = queda, M = mover, Esc = cerrar.',
  'De a uno: los botones de cada fila. De a varios: tildá las casillas (la del encabezado de cada sector elige todo el sector; la de arriba, todos los que se ven) y usá la barra «✅ Quedan acá», «Ya los movieron» o «Deshacer».',
  'Lo que marcás se ve al instante y se guarda en segundo plano (arriba dice «Guardando…»). Si algo no se puede guardar, vuelve a como estaba y te avisa.',
  '«↪️ Mover a…»: elegís planta, sector, dónde exactamente y, si cambia, el N.º de puesto nuevo; queda «Para mover». «📋 Lista para SOMI» abre la lista para imprimir o guardar en PDF y entregar a SOMI o Mantenimiento. No se manda por correo.',
  '«Ya lo movieron»: actualiza la ubicación del extintor (queda anotado en CAMBIOS) y su etiqueta QR pasa a pendiente para imprimir. «Deshacer» lo vuelve a «Sin revisar».',
  'Filtros arriba (Sin revisar, Para mover, Quedan, Movidos) y buscador por puesto, sector, ubicación o N.º de inventario.',
  'Sin GitHub: planilla PROTECCIÓN CONTRA INCENDIOS › hoja REVISION_UBIC (columna ESTADO con lista) y menú Sistema HyS › Incendio › «HMH · Lista de extintores para mover» y «HMH · Aplicar los marcados como Movido».']];

const incuEst = e => e.rev ? e.rev.ESTADO : '';
const incuPasa = e => {
  const s = incuEst(e);
  const f = INCUF === 'todos' || (INCUF === 'sin' && !e.rev) || (INCUF === 'mover' && s === 'Mover (pendiente)') || (INCUF === 'queda' && s === 'Queda') || (INCUF === 'movido' && s === 'Movido');
  if (!f) return false;
  const q = INCUQ.trim().toLowerCase(); if (!q) return true;
  return [e.NRO, e.PLANTA, e.SECTOR, e.UBICACION, e.INV, e.TIPO, e.AGENTE].join(' ').toLowerCase().indexOf(q) >= 0;
};
// Orden de la tabla: planta (como en el sistema), sector y N.º de puesto
function incuVisibles() {
  const orden = INCU.plantas || [], pi = p => { const i = orden.indexOf(p); return i < 0 ? 99 : i; };
  return INCU.ext.filter(incuPasa).sort((a, b) => pi(a.PLANTA) - pi(b.PLANTA) || String(a.SECTOR || '').localeCompare(String(b.SECTOR || '')) || (Number(a.NRO) || 9999) - (Number(b.NRO) || 9999));
}
function incuResumen() {
  const c = k => INCU.ext.filter(e => incuEst(e) === k).length;
  INCU.resumen = { total: INCU.ext.length, sinRevisar: INCU.ext.filter(e => !e.rev).length, quedan: c('Queda'), mover: c('Mover (pendiente)'), movidos: c('Movido') };
}
const incuFotoGrande = e => e.foto ? e.foto.replace(/sz=w\d+/, 'sz=w1600') : '';
const incuPorId = id => INCU.ext.find(e => e.ID === id);

async function incUbic(fresco) {
  if (!INCU || fresco) {
    if (INCUGUARDANDO || INCUCOLA.queda.size || INCUCOLA.borrar.size) return toast('Esperá a que termine de guardar y volvé a tocar «Actualizar».');
    cargando('#incubic', 'Leyendo los extintores del HMH…');
    try { INCU = await api('p_inc_ubic', {}, 120000); } catch (e) { return; }
    INCUSEL.clear();
  }
  if (!INCU.ok) { const r = INCU; INCU = null; return incNoInstalado('#incubic', r); }
  incuResumen();
  const R = INCU.resumen;
  const filtros = [['todos', 'Todos', R.total], ['sin', 'Sin revisar', R.sinRevisar], ['mover', 'Para mover', R.mover], ['queda', 'Quedan', R.quedan], ['movido', 'Movidos', R.movidos]];
  marco('#incubic', '<div class="cab"><div><span class="mu peq"><a class="link" href="#inc">7 · Protección contra incendios</a></span><h1>Revisión de ubicaciones · HMH</h1><span class="mu peq">Tocá «📷 Ver» para mirar la foto panorámica y decidí si queda o se mueve, de a uno o tildando varios. Las etiquetas QR del HMH conviene imprimirlas cuando esté todo revisado.</span></div>' +
    '<div class="filtros"><a class="link" href="' + esc(INCU.libro) + '" target="_blank" rel="noopener">Planilla REVISION_UBIC ↗</a><button class="btn pri" id="iuLista"' + (R.mover ? '' : ' disabled') + '>📋 Lista para SOMI (' + R.mover + ')</button><button class="btn sec" id="iuAct">Actualizar</button></div></div>' +
    '<div class="filtros" style="margin-bottom:10px">' + filtros.map(f => '<button class="btn ' + (INCUF === f[0] ? 'pri' : 'sec') + '" data-iuf="' + f[0] + '">' + f[1] + ' (' + f[2] + ')</button>').join('') +
    '<input class="c" id="iuQ" type="search" placeholder="Buscar puesto, sector, inventario…" aria-label="Buscar extintor" value="' + esc(INCUQ) + '" style="min-width:220px;flex:1;max-width:320px"></div>' +
    '<div id="iuBarra"></div><div id="iuTabla"></div>');
  $('iuAct').onclick = () => incUbic(true);
  document.querySelectorAll('[data-iuf]').forEach(b => b.onclick = () => { INCUF = b.dataset.iuf; INCUSEL.clear(); incUbic(); });
  $('iuQ').oninput = () => { INCUQ = $('iuQ').value; incuTabla(); };
  $('iuLista').onclick = incuLista;
  incuTabla();
}

// Tabla (se redibuja sola, sin volver a pedir datos al sistema)
function incuTabla() {
  const caja = $('iuTabla'); if (!caja) return;
  const L = incuVisibles(), grupos = [];
  L.forEach(e => { const k = (e.PLANTA || 's/d') + ' · ' + (e.SECTOR || 's/d'); let g = grupos[grupos.length - 1]; if (!g || g.k !== k) grupos.push(g = { k: k, l: [] }); g.l.push(e); });
  [...INCUSEL].forEach(id => { if (!L.some(e => e.ID === id)) INCUSEL.delete(id); });   // lo tildado que quedó fuera del filtro se destilda
  const todos = L.length && L.every(e => INCUSEL.has(e.ID));
  const fila = e => { const s = incuEst(e), x = INCU_EST[s], pend = INCUCOLA.queda.has(e.ID) || INCUCOLA.borrar.has(e.ID);
    const dest = s === 'Mover (pendiente)' ? '<div class="peq" style="margin-top:4px;background:var(--wabg);padding:4px 6px;border-radius:6px"><b>Va a:</b> ' + esc(e.rev.A_PLANTA + ' · ' + e.rev.A_SECTOR) + ' — ' + esc(e.rev.A_UBICACION) + (e.rev.A_NRO && e.rev.A_NRO !== e.NRO ? ' · pasa a ser el puesto ' + esc(e.rev.A_NRO) : '') + (e.rev.NOTA ? '<br><i>' + esc(e.rev.NOTA) + '</i>' : '') + '</div>' : '';
    return '<tr id="iu_' + esc(e.ID) + '"' + (INCUSEL.has(e.ID) ? ' style="background:var(--pa1)"' : '') + '>' +
      '<td style="width:34px"><input type="checkbox" data-ius="' + esc(e.ID) + '"' + (INCUSEL.has(e.ID) ? ' checked' : '') + ' aria-label="Elegir el puesto ' + esc(e.NRO || 's/d') + '" style="width:18px;height:18px"></td>' +
      '<td>' + (e.foto ? '<button class="btn sec" data-iu="ver" data-id="' + esc(e.ID) + '" style="padding:6px 10px">📷 Ver</button>' : '<span class="mu peq">Sin foto</span>') + '</td>' +
      '<td><b>' + esc(e.NRO || 's/d') + '</b></td>' +
      '<td>' + esc(e.UBICACION || 's/d') + dest + '</td>' +
      '<td class="peq">' + esc([e.TIPO, e.AGENTE, e.KG ? e.KG + ' kg' : ''].filter(Boolean).join(' · ') || 's/d') + '<br><span class="mu">Inv. ' + esc(e.INV || 's/d') + '</span></td>' +
      '<td>' + (x ? '<span class="chip ' + x[1] + ' mini">' + x[0] + '</span>' : '<span class="chip gr mini">Sin revisar</span>') + (pend ? '<br><span class="mu peq">Guardando…</span>' : '') + '</td>' +
      '<td style="white-space:nowrap">' + (s === 'Movido' ? '<span class="mu peq">Movido el ' + fechaTxt(e.rev.MOVIDO) + '</span>' :
        (s !== 'Queda' ? '<button class="btn ' + (s ? 'sec' : 'pri') + '" data-iu="queda" data-id="' + esc(e.ID) + '" title="Queda acá" style="padding:6px 10px">✅</button> ' : '') +
        '<button class="btn sec" data-iu="form" data-id="' + esc(e.ID) + '" title="' + (s === 'Mover (pendiente)' ? 'Cambiar destino' : 'Mover a…') + '" style="padding:6px 10px">' + (s === 'Mover (pendiente)' ? '✏️' : '↪️') + '</button> ' +
        (s === 'Mover (pendiente)' ? '<button class="btn pri" data-iu="movido" data-id="' + esc(e.ID) + '" style="padding:6px 10px">Ya lo movieron</button> ' : '') +
        (s ? '<button class="link peq" data-iu="borrar" data-id="' + esc(e.ID) + '">Deshacer</button>' : '')) + '</td></tr>'; };
  caja.innerHTML = L.length ? '<section class="card tabla"><table><thead><tr><th><input type="checkbox" id="iuTodos"' + (todos ? ' checked' : '') + ' aria-label="Elegir todos los que se ven" style="width:18px;height:18px"></th><th>Foto</th><th>Puesto</th><th>Dónde está</th><th>Extintor</th><th>Estado</th><th>Decidir</th></tr></thead><tbody>' +
    grupos.map(g => { const gt = g.l.every(e => INCUSEL.has(e.ID));
      return '<tr><td colspan="7" style="background:var(--gr);padding:8px 12px"><label style="display:flex;gap:10px;align-items:center;font-weight:700;cursor:pointer"><input type="checkbox" data-iug="' + esc(g.k) + '"' + (gt ? ' checked' : '') + ' style="width:18px;height:18px"> ' + esc(g.k) + ' <span class="mu peq">(' + g.l.length + ')</span></label></td></tr>' + g.l.map(fila).join(''); }).join('') +
    '</tbody></table></section>' : '<p class="mu">No hay extintores en este filtro.</p>';
  incuBarra();
  if ($('iuTodos')) $('iuTodos').onchange = ev => { L.forEach(e => ev.target.checked ? INCUSEL.add(e.ID) : INCUSEL.delete(e.ID)); incuTabla(); };
  caja.querySelectorAll('[data-iug]').forEach(c => c.onchange = () => { const g = grupos.find(x => x.k === c.dataset.iug); g.l.forEach(e => c.checked ? INCUSEL.add(e.ID) : INCUSEL.delete(e.ID)); incuTabla(); });
  caja.querySelectorAll('[data-ius]').forEach(c => c.onchange = () => { c.checked ? INCUSEL.add(c.dataset.ius) : INCUSEL.delete(c.dataset.ius); incuTabla(); });
  caja.querySelectorAll('[data-iu]').forEach(b => b.onclick = () => incuAccion(b.dataset.iu, b.dataset.id, b));
}

// Barra de «varios a la vez» y estado del guardado
function incuBarra() {
  const caja = $('iuBarra'); if (!caja) return;
  const sel = [...INCUSEL].map(incuPorId).filter(Boolean), n = sel.length;
  const pendQ = sel.filter(e => !['Queda', 'Movido'].includes(incuEst(e))).length, pendM = sel.filter(e => incuEst(e) === 'Mover (pendiente)').length, pendB = sel.filter(e => e.rev && incuEst(e) !== 'Movido').length;
  const cola = INCUCOLA.queda.size + INCUCOLA.borrar.size + INCUGUARDANDO;
  const sinRev = incuVisibles().filter(e => !e.rev).length;
  caja.innerHTML = '<div class="card" style="position:sticky;top:0;z-index:5;padding:10px 14px;margin-bottom:10px;display:flex;gap:8px;align-items:center;flex-wrap:wrap">' +
    (n ? '<b>' + n + (n === 1 ? ' elegido' : ' elegidos') + '</b>' +
      '<button class="btn pri" id="iuBQ"' + (pendQ ? '' : ' disabled') + '>✅ Quedan acá (' + pendQ + ')</button>' +
      '<button class="btn sec" id="iuBM"' + (pendM ? '' : ' disabled') + '>Ya los movieron (' + pendM + ')</button>' +
      '<button class="btn sec" id="iuBB"' + (pendB ? '' : ' disabled') + '>Deshacer (' + pendB + ')</button>' +
      '<button class="link peq" id="iuBX">Quitar la selección</button>'
      : '<span class="mu peq">Tildá uno o varios para decidir juntos.</span>' + (sinRev ? '<button class="btn sec" id="iuBS">Elegir los sin revisar que se ven (' + sinRev + ')</button>' : '') +
        (incuVisibles().some(e => e.foto) ? '<button class="btn sec" id="iuBV">📷 Revisar con fotos, uno por uno</button>' : '')) +
    '<span class="peq" style="margin-left:auto" aria-live="polite">' + (cola ? '⏳ Guardando ' + cola + '…' : '<span class="mu">Todo guardado</span>') + '</span></div>';
  const on = (id, f) => { if ($(id)) $(id).onclick = f; };
  on('iuBX', () => { INCUSEL.clear(); incuTabla(); });
  on('iuBS', () => { incuVisibles().filter(e => !e.rev).forEach(e => INCUSEL.add(e.ID)); incuTabla(); });
  on('iuBV', () => { const L = incuVisibles().filter(e => e.foto), i = L.findIndex(e => !e.rev); incuVisor((L[i < 0 ? 0 : i] || {}).ID); });
  on('iuBQ', () => { const ids = sel.filter(e => !['Queda', 'Movido'].includes(incuEst(e))).map(e => e.ID); ids.forEach(id => incuMarcar(id, 'queda')); INCUSEL.clear(); incuRefrescar(); toast(ids.length + (ids.length === 1 ? ' queda donde está.' : ' quedan donde están.')); });
  on('iuBB', () => { const ids = sel.filter(e => e.rev && incuEst(e) !== 'Movido').map(e => e.ID); if (!confirm('¿Volver ' + ids.length + ' a «Sin revisar»?')) return; ids.forEach(id => incuMarcar(id, 'borrar')); INCUSEL.clear(); incuRefrescar(); });
  on('iuBM', async () => { const ids = sel.filter(e => incuEst(e) === 'Mover (pendiente)').map(e => e.ID);
    if (!confirm('¿Ya movieron ' + ids.length + (ids.length === 1 ? ' extintor' : ' extintores') + '? Se actualiza su ubicación y sus etiquetas QR quedan pendientes.')) return;
    await incuMovidos(ids, $('iuBM')); });
}

// Marca al instante y deja la decisión en la cola (se manda junta, en segundo plano)
function incuMarcar(id, decision) {
  const e = incuPorId(id); if (!e) return;
  e._antes = e._antes === undefined ? e.rev : e._antes;   // para volver atrás si no se puede guardar
  INCUCOLA.queda.delete(id); INCUCOLA.borrar.delete(id);
  INCUCOLA[decision].add(id);
  e.rev = decision === 'queda' ? { ESTADO: 'Queda', A_NRO: '', A_PLANTA: '', A_SECTOR: '', A_UBICACION: '', NOTA: (e.rev && e.rev.NOTA) || '', DECIDIDO: new Date().toISOString().slice(0, 10), MOVIDO: '' } : null;
  clearTimeout(INCUENVIO); INCUENVIO = setTimeout(incuEnviar, 1200);
}
async function incuEnviar() {
  if (INCUGUARDANDO) { clearTimeout(INCUENVIO); INCUENVIO = setTimeout(incuEnviar, 800); return; }   // una tanda por vez
  for (const decision of ['borrar', 'queda']) {
    const ids = [...INCUCOLA[decision]]; if (!ids.length) continue;
    INCUCOLA[decision].clear(); INCUGUARDANDO = ids.length; incuRefrescar();
    try {
      const r = await api('p_inc_ubic_guardar', { ids: ids, decision: decision }, 180000);
      if (!r || !r.ok) throw new Error((r && r.mensaje) || 'No se pudo guardar.');
      ids.forEach(id => { const e = incuPorId(id); if (!e) return; if (id in (r.rev || {})) { if (!INCUCOLA.queda.has(id) && !INCUCOLA.borrar.has(id)) e.rev = r.rev[id]; delete e._antes; } else { e.rev = e._antes === undefined ? e.rev : e._antes; delete e._antes; } });
      if (r.errores && r.errores.length) toast('No se pudo con ' + r.errores.length + ': ' + r.errores.slice(0, 3).join(' · '));
      INCQT = null;
    } catch (err) {
      ids.forEach(id => { const e = incuPorId(id); if (e && e._antes !== undefined && !INCUCOLA.queda.has(id) && !INCUCOLA.borrar.has(id)) { e.rev = e._antes; delete e._antes; } });
      toast((err.message || 'No se pudo guardar.') + ' Volvió a como estaba.');
    }
    INCUGUARDANDO = 0;
  }
  incuRefrescar();
}
// Redibuja filtros (números), tabla y visor si está abierto, sin pedir datos
function incuRefrescar() {
  if (!$('iuTabla')) return;
  incuResumen(); const R = INCU.resumen, n = { todos: R.total, sin: R.sinRevisar, mover: R.mover, queda: R.quedan, movido: R.movidos };
  document.querySelectorAll('[data-iuf]').forEach(b => b.textContent = b.textContent.replace(/\(\d+\)$/, '(' + n[b.dataset.iuf] + ')'));
  if ($('iuLista')) { $('iuLista').textContent = '📋 Lista para SOMI (' + R.mover + ')'; $('iuLista').disabled = !R.mover; }
  incuTabla();
}

// Guardado inmediato (mover, ya lo movieron): espera la respuesta y actualiza solo esos extintores
async function incuGuardarYa(datos, b, ok) {
  const t0 = b ? b.textContent : ''; if (b) { b.disabled = true; b.textContent = 'Guardando…'; }
  try { const r = await api('p_inc_ubic_guardar', datos, 180000); if (!r || !r.ok) throw new Error((r && r.mensaje) || 'No se pudo guardar.');
    Object.keys(r.rev || {}).forEach(id => { const e = incuPorId(id); if (e) e.rev = r.rev[id]; });
    if (r.errores && r.errores.length) toast('No se pudo con ' + r.errores.length + ': ' + r.errores.slice(0, 3).join(' · ')); else toast(ok);
    INCQT = null; return r; }
  catch (e) { toast(e.message || 'No se pudo guardar.'); return null; }
  finally { if (b && document.body.contains(b)) { b.disabled = false; b.textContent = t0; } }
}
async function incuMovidos(ids, b) {
  if (INCUGUARDANDO || INCUCOLA.queda.size || INCUCOLA.borrar.size) return toast('Esperá a que termine de guardar lo anterior.');
  INCUGUARDANDO = ids.length; incuBarra();
  const r = await incuGuardarYa({ ids: ids, decision: 'movido' }, b, ids.length === 1 ? 'Extintor actualizado.' : ids.length + ' extintores actualizados.');
  INCUGUARDANDO = 0; if (r) INCUSEL.clear(); incuRefrescar();
}

function incuAccion(a, id, b) {
  if (a === 'ver') return incuVisor(id);
  if (a === 'form') return incuForm(id);
  if (a === 'queda') { incuMarcar(id, 'queda'); return incuRefrescar(); }
  if (a === 'borrar') { incuMarcar(id, 'borrar'); return incuRefrescar(); }
  if (a === 'movido') { if (!confirm('¿Ya lo movieron? Se actualiza la ubicación del extintor y su etiqueta QR queda pendiente.')) return; return incuMovidos([id], b); }
}

// Visor de fotos: foto grande, decidir y pasar al siguiente
function incuVisor(id) {
  const L = incuVisibles().filter(e => e.foto); let i = L.findIndex(e => e.ID === id); if (i < 0) return;
  const cerrar = () => { document.removeEventListener('keydown', teclas); $('ov').hidden = true; $('ov').innerHTML = ''; incuRefrescar(); };
  const teclas = ev => { if ($('ov').hidden) return document.removeEventListener('keydown', teclas);
    if (/^(INPUT|TEXTAREA|SELECT)$/.test((document.activeElement || {}).tagName || '')) return;
    if (ev.key === 'Escape') cerrar(); else if (ev.key === 'ArrowRight') ir(1); else if (ev.key === 'ArrowLeft') ir(-1);
    else if (/^q$/i.test(ev.key)) quedar(); else if (/^m$/i.test(ev.key)) mover(); };
  const ir = d => { const j = i + d; if (j < 0 || j >= L.length) return toast(d > 0 ? 'Era el último de la lista.' : 'Es el primero de la lista.'); i = j; pintar(); };
  const quedar = () => { const e = L[i]; if (incuEst(e) === 'Movido') return toast('Ya figura como movido.'); incuMarcar(e.ID, 'queda'); incuRefrescar(); toast('Puesto ' + (e.NRO || 's/d') + ': queda.'); if (i < L.length - 1) { i++; pintar(); } else pintar(); };
  const mover = () => { if (incuEst(L[i]) === 'Movido') return; document.removeEventListener('keydown', teclas);
    incuForm(L[i].ID, guardo => { if (guardo && i < L.length - 1) i++; $('ov').hidden = false; document.addEventListener('keydown', teclas); pintar(); }); };   // al guardar pasa al siguiente
  const pintar = () => { const e = L[i], s = incuEst(e), x = INCU_EST[s], sig = L[i + 1];
    if (sig) { const im = new Image(); im.src = incuFotoGrande(sig); }   // la siguiente ya queda descargada
    $('ov').innerHTML = '<div class="modal" role="dialog" aria-modal="true" aria-label="Foto del puesto ' + esc(e.NRO || 's/d') + '" style="width:min(980px,100%);gap:10px">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap"><h2 style="margin:0">Puesto ' + esc(e.NRO || 's/d') + ' <span class="mu peq">(' + (i + 1) + ' de ' + L.length + ')</span></h2>' +
      (x ? '<span class="chip ' + x[1] + '">' + x[0] + '</span>' : '<span class="chip gr">Sin revisar</span>') + '<button class="btn sec" id="ivCer">Cerrar</button></div>' +
      '<a href="' + esc(e.fotoUrl) + '" target="_blank" rel="noopener" title="Abrir la foto original en Drive" style="display:block;background:#111;border-radius:10px;text-align:center"><img src="' + esc(incuFotoGrande(e)) + '" alt="Foto panorámica del puesto ' + esc(e.NRO || 's/d') + '" style="max-width:100%;max-height:62vh;object-fit:contain;display:block;margin:auto" onerror="this.outerHTML=\'<div style=&quot;color:#fff;padding:40px&quot;>Foto no disponible</div>\'"></a>' +
      '<div class="peq"><b>Está en:</b> ' + esc((e.PLANTA || 's/d') + ' · ' + (e.SECTOR || 's/d')) + ' — ' + esc(e.UBICACION || 's/d') + '<br>' + esc([e.TIPO, e.AGENTE, e.KG ? e.KG + ' kg' : ''].filter(Boolean).join(' · ')) + ' · inv. ' + esc(e.INV || 's/d') +
      (s === 'Mover (pendiente)' ? '<br><b>Va a:</b> ' + esc(e.rev.A_PLANTA + ' · ' + e.rev.A_SECTOR) + ' — ' + esc(e.rev.A_UBICACION) : '') + '</div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><button class="btn sec" id="ivAnt"' + (i ? '' : ' disabled') + '>◀ Anterior</button>' +
      (s === 'Movido' ? '<span class="mu peq">Movido el ' + fechaTxt(e.rev.MOVIDO) + '</span>' : '<button class="btn pri" id="ivQ">✅ Queda acá</button><button class="btn sec" id="ivM">' + (s === 'Mover (pendiente)' ? '✏️ Cambiar destino' : '↪️ Mover a…') + '</button>' + (s ? '<button class="link peq" id="ivB">Deshacer</button>' : '')) +
      '<button class="btn sec" id="ivSig" style="margin-left:auto"' + (sig ? '' : ' disabled') + '>Siguiente ▶</button></div>' +
      '<span class="mu peq">En la computadora: ← → para recorrer, Q = queda, M = mover, Esc = cerrar.</span></div>';
    $('ivCer').onclick = cerrar; $('ivAnt').onclick = () => ir(-1); $('ivSig').onclick = () => ir(1);
    if ($('ivQ')) $('ivQ').onclick = quedar; if ($('ivM')) $('ivM').onclick = mover;
    if ($('ivB')) $('ivB').onclick = () => { incuMarcar(e.ID, 'borrar'); incuRefrescar(); pintar(); }; };
  $('ov').hidden = false; pintar(); document.addEventListener('keydown', teclas);
}
// «Mover a…»: destino del extintor (ventana sobre la tabla o el visor)
function incuForm(id, alVolver) {
  const e = incuPorId(id); if (!e) return;
  const r = e.rev && e.rev.ESTADO === 'Mover (pendiente)' ? e.rev : {}, orden = INCU.plantas || [];
  const opc = (l, v) => l.map(x => '<option' + (x === v ? ' selected' : '') + '>' + esc(x) + '</option>').join('');
  const sectores = [...new Set(INCU.ext.map(z => z.SECTOR).filter(Boolean))].sort();
  const volver = guardo => { if (alVolver) return alVolver(guardo); $('ov').hidden = true; $('ov').innerHTML = ''; incuRefrescar(); };
  $('ov').innerHTML = '<div class="modal" role="dialog" aria-modal="true" aria-label="Mover el puesto ' + esc(e.NRO || 's/d') + '">' +
    '<h2>↪️ Mover el puesto ' + esc(e.NRO || 's/d') + '</h2><div class="peq"><b>Hoy está en:</b> ' + esc((e.PLANTA || 's/d') + ' · ' + (e.SECTOR || 's/d')) + ' — ' + esc(e.UBICACION || 's/d') + '</div>' +
    '<div class="campos"><label class="f">Planta<select class="c" id="ifP">' + opc(orden, r.A_PLANTA || e.PLANTA) + '</select></label>' +
    '<label class="f">Sector<input class="c" id="ifS" list="ifSL" value="' + esc(r.A_SECTOR || '') + '" placeholder="Ej.: Guardia"><datalist id="ifSL">' + sectores.map(x => '<option value="' + esc(x) + '">').join('') + '</datalist></label>' +
    '<label class="f ancho">Dónde exactamente<input class="c" id="ifU" value="' + esc(r.A_UBICACION || '') + '" placeholder="Ej.: pasillo, al lado de la puerta del office"></label>' +
    '<label class="f">N.º de puesto nuevo (vacío = sigue el ' + esc(e.NRO || 's/d') + ')<input class="c" id="ifN" inputmode="numeric" maxlength="3" value="' + esc(r.A_NRO || '') + '"></label>' +
    '<label class="f">Nota para quien lo mueve (opcional)<input class="c" id="ifO" value="' + esc(r.NOTA || '') + '"></label></div>' +
    '<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn pri" id="ifG">Guardar «Mover»</button><button class="btn sec" id="ifC">Cancelar</button></div></div>';
  $('ov').hidden = false; $('ifS').focus();
  $('ifC').onclick = () => volver(false);
  $('ifG').onclick = async () => { const v = k => $(k).value.trim();
    if (!v('ifS') || !v('ifU')) return toast('Completá el sector y dónde exactamente.');
    if (v('ifN') && !/^\d{1,3}$/.test(v('ifN'))) return toast('El N.º de puesto nuevo lleva solo números (hasta 3).');
    if (INCUCOLA.queda.has(id) || INCUCOLA.borrar.has(id)) { INCUCOLA.queda.delete(id); INCUCOLA.borrar.delete(id); }
    const ok = await incuGuardarYa({ id: id, decision: 'mover', a_planta: $('ifP').value, a_sector: v('ifS'), a_ubic: v('ifU'), a_nro: v('ifN'), nota: v('ifO') }, $('ifG'), 'Guardado: va en la lista para SOMI.');
    if (ok) { delete e._antes; volver(true); } };
}

async function incuLista() {
  const w = window.open('', '_blank'); if (!w) return toast('El navegador bloqueó la ventana nueva: permití las ventanas emergentes para este sitio.');
  w.document.write('<p style="font-family:Arial;padding:20px">Armando la lista…</p>');
  try { const r = await api('p_inc_ubic_lista', {}, 120000); if (!r.ok) throw new Error(r.mensaje || 'No se pudo armar la lista.'); w.document.open(); w.document.write(r.html); w.document.close(); }
  catch (e) { w.close(); toast(e.message || 'No se pudo armar la lista.'); }
}
