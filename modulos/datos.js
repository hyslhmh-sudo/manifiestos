// Portal HyS · Datos (editor general) · versión 14.53 (14/10/2026) · servidor: Datos.gs (acciones p_dat_…)
// Regla del sistema: Higiene y Seguridad agrega, cambia y elimina cualquier dato de cualquier libro desde el portal.
// Cada cambio queda en BASE COMÚN › HISTORIAL; cada fila eliminada, en BASE COMÚN › PAPELERA (se puede restaurar).
// Se carga desde portal.html (<script src>). Para el portal de respaldo, herramientas/armar_respaldo.py lo junta en un solo archivo.
let DATL = null, DATH = null, DATD = null;
const DATS = { id: '', hoja: '', q: '', desde: 0, orden: 'nuevas', enc: 0, vista: 'hoja' };
const datCab = (extra) => '<div class="cab"><div><span class="mu peq">Gestión</span><h1>Datos · editar todo</h1><span class="mu peq">Cualquier dato de cualquier libro del sistema: buscar, cambiar, agregar o eliminar filas. Cada cambio queda en el historial y lo eliminado va a la papelera.</span></div><div class="filtros">' + (extra || '') + '</div></div>';
function datRuta() {
  const p = location.hash.replace(/^#datos\/?/, '').split('/').map(x => { try { return decodeURIComponent(x); } catch (e) { return x; } });
  if (p[0] === 'papelera' || p[0] === 'historial' || p[0] === 'config') { DATS.vista = p[0]; return; }
  DATS.vista = 'hoja'; if (p[0] && p[0] !== DATS.id) { DATS.id = p[0]; DATS.hoja = ''; DATH = null; DATS.desde = 0; DATS.q = ''; DATS.enc = 0; }
  if (p[1] !== undefined && p[1] !== DATS.hoja) { DATS.hoja = p[1]; DATS.desde = 0; DATS.q = ''; DATS.enc = 0; }
}
const datIr = () => { const h = '#datos/' + encodeURIComponent(DATS.id) + (DATS.hoja ? '/' + encodeURIComponent(DATS.hoja) : ''); if (location.hash !== h) location.hash = h; else datos(); };

async function datos(fresco) {
  datRuta();
  if (!DATL || fresco === 'libros') { cargando('#datos', 'Buscando los libros del sistema…'); try { DATL = await api('p_dat_libros', { fresco: fresco === 'libros' }, 180000); } catch (e) { return; } }
  if (!DATL.ok) return marco('#datos', datCab() + '<div class="aviso error">' + esc(DATL.mensaje || DATL.error || 'No se pudo leer.') + (/instalar|desconocida/i.test(DATL.mensaje || DATL.error || '') ? ' Falta instalar Datos.gs en el Sistema HyS.' : '') + '</div>');
  if (DATS.vista === 'papelera') return datPapelera();
  if (DATS.vista === 'historial') return datHistorial();
  if (DATS.vista === 'config') return datConfig();
  const grupos = {}; DATL.libros.forEach(l => (grupos[l.grupo] = grupos[l.grupo] || []).push(l));
  const otro = DATS.id && !DATL.libros.some(l => l.id === DATS.id);
  const selLibro = '<select class="c" id="dtLib"><option value="">Elegí un libro…</option>' + Object.keys(grupos).map(g => '<optgroup label="' + esc(g) + '">' + grupos[g].map(l => '<option value="' + esc(l.id) + '"' + (l.id === DATS.id ? ' selected' : '') + '>' + esc(l.nombre) + '</option>').join('') + '</optgroup>').join('') + (otro ? '<option value="' + esc(DATS.id) + '" selected>Planilla por enlace</option>' : '') + '</select>';
  let cuerpo = '';
  if (DATS.id) {
    if (!DATH || DATH.id !== DATS.id || fresco === 'hojas') { cargando('#datos', 'Abriendo el libro…'); try { DATH = await api('p_dat_hojas', { id: DATS.id }, 120000); } catch (e) { return; } if (!DATH.ok) { const m = DATH.mensaje || DATH.error; DATH = null; return marco('#datos', datCab() + '<div class="aviso error">' + esc(m || 'No se pudo abrir el libro.') + '</div>'); } }
    if (!DATS.hoja) { const v = DATH.hojas.find(h => !h.oculta && h.filas > 1) || DATH.hojas[0]; DATS.hoja = v ? v.nombre : ''; }
    const hojas = '<div class="filtros" style="flex-wrap:wrap;gap:6px;margin:10px 0">' + DATH.hojas.map(h => '<button class="btn ' + (h.nombre === DATS.hoja ? 'pri' : 'sec') + ' peq" data-hoja="' + esc(h.nombre) + '">' + esc(h.nombre) + (h.oculta ? ' (oculta)' : '') + ' <span class="mu">' + Math.max(0, h.filas) + '</span></button>').join('') + '</div>';
    cuerpo = '<section class="card"><div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;align-items:center"><h2>' + esc(DATH.nombre) + '</h2><a class="btn sec peq" href="' + esc(DATH.url) + '" target="_blank" rel="noopener">Abrir la planilla ↗</a></div>' + hojas + '<div id="dtHoja"><div class="cargando">Leyendo la hoja…</div></div></section>';
  } else cuerpo = '<section class="card peq">Elegí un libro de la lista o pegá el enlace de cualquier otra planilla de Google. Los libros salen de la configuración del sistema: si falta alguno, sumalo con la propiedad del script DATOS_LIBROS_EXTRA o pegá su enlace.</section>';
  marco('#datos', datCab('<button class="btn sec" id="dtPap">Papelera</button><button class="btn sec" id="dtHis">Historial de cambios</button><button class="btn sec" id="dtCfg">Configuración</button><button class="btn sec" id="dtAct">Actualizar lista</button>') +
    '<section class="card"><div class="filtros" style="align-items:flex-end"><label class="f" style="flex:2;min-width:240px">Libro' + selLibro + '</label><label class="f" style="flex:2;min-width:240px">…o enlace de otra planilla<input class="c" id="dtUrl" placeholder="https://docs.google.com/spreadsheets/d/…"></label><button class="btn sec" id="dtUrlOk">Abrir</button></div></section>' + cuerpo);
  $('dtLib').onchange = e => { DATS.id = e.target.value; DATS.hoja = ''; DATH = null; DATS.desde = 0; DATS.q = ''; DATS.enc = 0; if (DATS.id) datIr(); else location.hash = '#datos'; };
  $('dtUrlOk').onclick = () => { const m = ($('dtUrl').value.match(/[-\w]{25,}/) || [])[0]; if (!m) return toast('Pegá el enlace completo de la planilla.'); DATS.id = m; DATS.hoja = ''; DATH = null; datIr(); };
  $('dtAct').onclick = () => datos('libros'); $('dtPap').onclick = () => location.hash = '#datos/papelera'; $('dtHis').onclick = () => location.hash = '#datos/historial'; $('dtCfg').onclick = () => location.hash = '#datos/config';
  document.querySelectorAll('[data-hoja]').forEach(b => b.onclick = () => { DATS.hoja = b.dataset.hoja; DATS.desde = 0; DATS.q = ''; DATS.enc = 0; datIr(); });
  if (DATS.id && DATS.hoja) datLeerHoja();
}

async function datLeerHoja() {
  const box = $('dtHoja'); if (!box) return;
  box.innerHTML = '<div class="cargando">Leyendo la hoja…</div>';
  const pedido = { id: DATS.id, hoja: DATS.hoja, q: DATS.q, desde: DATS.desde, orden: DATS.orden, enc: DATS.enc || undefined };
  let D; try { D = await api('p_dat_hoja', pedido, 120000); } catch (e) { box.innerHTML = '<div class="aviso error">No se pudo leer. <button class="link" id="dtRe">Reintentar</button></div>'; $('dtRe').onclick = datLeerHoja; return; }
  if (!$('dtHoja') || pedido.hoja !== DATS.hoja || pedido.id !== DATS.id) return;
  if (!D.ok) { box.innerHTML = '<div class="aviso error">' + esc(D.mensaje || D.error || 'No se pudo leer.') + '</div>'; return; }
  DATD = D; DATS.enc = D.enc;
  const vis = D.cab.map((c, j) => j).slice(0, 7), pag = D.porPagina || 100;
  const celda = (f, j) => { const v = String(f.v[j] == null ? '' : f.v[j]); return '<td' + (f.f && f.f.indexOf(j) >= 0 ? ' title="Fórmula: se calcula sola"' : '') + '>' + esc(v.length > 80 ? v.slice(0, 80) + '…' : v) + '</td>'; };
  box.innerHTML = '<div class="filtros" style="align-items:flex-end;margin-bottom:10px"><label class="f" style="flex:2;min-width:200px">Buscar en la hoja<input class="c" id="dtQ" type="search" value="' + esc(DATS.q) + '" placeholder="Palabras, código, DNI, fecha…"></label>' +
    '<label class="f">Orden<select class="c" id="dtOrd"><option value="nuevas"' + (DATS.orden === 'nuevas' ? ' selected' : '') + '>Últimas filas primero</option><option value="planilla"' + (DATS.orden !== 'nuevas' ? ' selected' : '') + '>Como en la planilla</option></select></label>' +
    '<label class="f" style="width:130px">Encabezados en la fila<input class="c" id="dtEnc" type="number" min="1" value="' + D.enc + '"></label><button class="btn pri" id="dtNueva">+ Agregar fila</button></div>' +
    '<div class="mu peq" style="margin-bottom:6px">' + D.total + ' fila(s)' + (DATS.q ? ' con «' + esc(DATS.q) + '»' : '') + '. Tocá una fila para ver y cambiar todas sus columnas (' + D.cab.length + ').' + (D.total > pag ? ' Se muestran de a ' + pag + '.' : '') + '</div>' +
    (D.filas.length ? '<div style="overflow-x:auto"><table><thead><tr><th>Fila</th>' + vis.map(j => '<th>' + esc(D.cab[j]) + '</th>').join('') + (D.cab.length > vis.length ? '<th>…</th>' : '') + '</tr></thead><tbody>' +
      D.filas.map((f, i) => '<tr class="cl" data-i="' + i + '" style="cursor:pointer"><td class="mu">' + f.fila + '</td>' + vis.map(j => celda(f, j)).join('') + (D.cab.length > vis.length ? '<td class="mu">+' + (D.cab.length - vis.length) + '</td>' : '') + '</tr>').join('') + '</tbody></table></div>' : '<div class="mu peq">Sin filas' + (DATS.q ? ' que coincidan' : '') + '.</div>') +
    (D.total > pag ? '<div class="filtros" style="margin-top:10px;justify-content:center"><button class="btn sec peq" id="dtAnt"' + (D.desde <= 0 ? ' disabled' : '') + '>← Anteriores</button><span class="mu peq">' + (D.desde + 1) + '–' + Math.min(D.desde + pag, D.total) + ' de ' + D.total + '</span><button class="btn sec peq" id="dtSig"' + (D.desde + pag >= D.total ? ' disabled' : '') + '>Siguientes →</button></div>' : '');
  let tq; $('dtQ').oninput = e => { clearTimeout(tq); tq = setTimeout(() => { DATS.q = e.target.value.trim(); DATS.desde = 0; datLeerHoja(); }, 450); };
  $('dtOrd').onchange = e => { DATS.orden = e.target.value; DATS.desde = 0; datLeerHoja(); };
  $('dtEnc').onchange = e => { DATS.enc = Number(e.target.value) || 0; DATS.desde = 0; datLeerHoja(); };
  $('dtNueva').onclick = () => datFila(null);
  if ($('dtAnt')) $('dtAnt').onclick = () => { DATS.desde = Math.max(0, D.desde - pag); datLeerHoja(); };
  if ($('dtSig')) $('dtSig').onclick = () => { DATS.desde = D.desde + pag; datLeerHoja(); };
  box.querySelectorAll('tr[data-i]').forEach(tr => tr.onclick = () => datFila(D.filas[Number(tr.dataset.i)]));
}

// Ver, cambiar, duplicar o eliminar una fila (o agregar una nueva)
function datFila(f) {
  const D = DATD, nueva = !f, fo = f && f.f || [];
  const campo = (c, j) => { const v = nueva ? '' : String(f.v[j] == null ? '' : f.v[j]), ro = fo.indexOf(j) >= 0, op = D.listas && D.listas[j];
    const ctl = ro ? '<input class="c" value="' + esc(v) + '" disabled title="Tiene fórmula: se calcula sola">'
      : op ? '<select class="c" data-j="' + j + '"><option value=""></option>' + op.concat(v && op.indexOf(v) < 0 ? [v] : []).map(o => '<option' + (o === v ? ' selected' : '') + '>' + esc(o) + '</option>').join('') + '</select>'
      : v.length > 60 || /\n/.test(v) ? '<textarea class="c" data-j="' + j + '">' + esc(v) + '</textarea>' : '<input class="c" data-j="' + j + '" value="' + esc(v) + '">';
    return '<label class="f' + (v.length > 60 ? ' ancho' : '') + '">' + esc(c) + (ro ? ' <span class="mu peq">(fórmula)</span>' : '') + ctl + '</label>'; };
  $('ov').innerHTML = '<div class="modal" role="dialog" aria-modal="true" aria-label="Fila"><h2>' + (nueva ? 'Agregar fila · ' : 'Fila ' + f.fila + ' · ') + esc(DATS.hoja) + '</h2><div class="aviso error" id="mErr" hidden></div>' +
    '<div class="mu peq" style="margin-bottom:8px">Fechas como dd/mm/aaaa. Lo que dejes igual no se toca. ' + (nueva ? 'Las columnas con fórmula se completan solas.' : 'Cada cambio queda en BASE COMÚN › HISTORIAL.') + '</div>' +
    '<div class="campos">' + D.cab.map(campo).join('') + '</div>' +
    '<div class="acciones"><div style="display:flex;gap:8px;flex-wrap:wrap">' + (nueva ? '' : '<button class="btn sec" id="mDup">Duplicar como fila nueva</button><button class="btn sec" id="mDel" style="color:var(--er)">Eliminar fila</button>') + '</div><div style="display:flex;gap:8px"><button class="btn sec" id="mCan">Cancelar</button><button class="btn pri" id="mOk">' + (nueva ? 'Agregar' : 'Guardar') + '</button></div></div></div>';
  $('ov').hidden = false;
  const cerrar = () => { $('ov').hidden = true; $('ov').innerHTML = ''; };
  const err = m => { $('mErr').textContent = m; $('mErr').hidden = false; };
  const leer = () => { const o = {}; document.querySelectorAll('#ov [data-j]').forEach(el => o[el.dataset.j] = el.value); return o; };
  const ocupado = (b, t) => { b.disabled = true; b.textContent = t; };
  $('mCan').onclick = cerrar;
  $('mOk').onclick = async () => {
    const o = leer(), b = $('mOk');
    if (nueva) { if (!Object.keys(o).some(k => String(o[k]).trim())) return err('Completá al menos un dato.'); ocupado(b, 'Agregando…');
      try { const r = await api('p_dat_agregar', { id: DATS.id, hoja: DATS.hoja, enc: D.enc, valores: o }, 90000); if (!r.ok) { b.disabled = false; b.textContent = 'Agregar'; return err(r.mensaje || 'No se pudo agregar.'); } toast('Agregada en la fila ' + r.fila + '.'); cerrar(); datLeerHoja(); } catch (e) { b.disabled = false; b.textContent = 'Agregar'; } return; }
    const cambios = {}, antes = {}; Object.keys(o).forEach(j => { const v0 = String(f.v[j] == null ? '' : f.v[j]); if (o[j] !== v0) { cambios[j] = o[j]; antes[j] = v0; } });
    if (!Object.keys(cambios).length) return cerrar();
    ocupado(b, 'Guardando…');
    try { const r = await api('p_dat_guardar', { id: DATS.id, hoja: DATS.hoja, enc: D.enc, fila: f.fila, cambios: cambios, antes: antes }, 90000);
      if (!r.ok) { b.disabled = false; b.textContent = 'Guardar'; return err(r.mensaje || 'No se pudo guardar.'); }
      toast('Guardado: ' + r.cambios + ' cambio(s).'); cerrar(); datLeerHoja(); } catch (e) { b.disabled = false; b.textContent = 'Guardar'; }
  };
  if (!nueva) {
    $('mDup').onclick = () => { const o = leer(); cerrar(); datFila(null); Object.keys(o).forEach(j => { const el = document.querySelector('#ov [data-j="' + j + '"]'); if (el) el.value = o[j]; }); };
    $('mDel').onclick = async () => { const b = $('mDel');
      if (!b.dataset.ok) { b.dataset.ok = '1'; b.textContent = '¿Seguro? Tocá de nuevo para eliminar'; return; }
      ocupado(b, 'Eliminando…');
      try { const r = await api('p_dat_eliminar', { id: DATS.id, hoja: DATS.hoja, enc: D.enc, fila: f.fila, antes: f.v }, 90000);
        if (!r.ok) { b.disabled = false; b.textContent = 'Eliminar fila'; delete b.dataset.ok; return err(r.mensaje || 'No se pudo eliminar.'); }
        toast('Fila eliminada. Queda en la papelera por si hay que restaurarla.'); cerrar(); datLeerHoja(); } catch (e) { b.disabled = false; b.textContent = 'Eliminar fila'; } };
  }
}

async function datPapelera() {
  cargando('#datos', 'Leyendo la papelera…');
  let P; try { P = await api('p_dat_papelera', {}, 90000); } catch (e) { return; }
  marco('#datos', datCab('<button class="btn sec" id="dtVol">← Volver a los libros</button><button class="btn sec" id="dtHis">Historial de cambios</button>') +
    '<section class="card tabla"><div style="padding:14px 18px;border-bottom:1px solid var(--ln)"><h2>Papelera (' + (P.lista || []).length + ')</h2><span class="mu peq">Filas eliminadas desde esta pantalla. «Restaurar» la vuelve a poner al final de su hoja. También están en BASE COMÚN › PAPELERA.</span></div>' +
    ((P.lista || []).length ? '<div style="overflow-x:auto"><table><thead><tr><th>Fecha</th><th>Libro › hoja</th><th>Fila</th><th>Datos</th><th>Estado</th><th></th></tr></thead><tbody>' + P.lista.map(r => '<tr><td>' + esc(r.fecha) + '</td><td><b>' + esc(r.libro) + '</b><div class="mu peq">' + esc(r.hoja) + '</div></td><td>' + esc(r.fila) + '</td><td class="peq">' + esc((r.valores || []).filter(v => v !== '' && v != null).slice(0, 6).join(' · ').slice(0, 200)) + '</td><td class="peq">' + esc(r.estado) + '</td><td>' + (r.estado === 'Eliminada' ? '<button class="btn sec peq" data-res="' + r.n + '">Restaurar</button>' : '') + '</td></tr>').join('') + '</tbody></table></div>' : '<div class="mu peq" style="padding:14px 18px">La papelera está vacía.</div>') + '</section>');
  $('dtVol').onclick = () => location.hash = '#datos' + (DATS.id ? '/' + encodeURIComponent(DATS.id) + (DATS.hoja ? '/' + encodeURIComponent(DATS.hoja) : '') : '');
  $('dtHis').onclick = () => location.hash = '#datos/historial';
  document.querySelectorAll('[data-res]').forEach(b => b.onclick = async () => { b.disabled = true; b.textContent = 'Restaurando…';
    try { const r = await api('p_dat_restaurar', { n: Number(b.dataset.res) }, 90000); if (!r.ok) { toast(r.mensaje || 'No se pudo restaurar.'); b.disabled = false; b.textContent = 'Restaurar'; return; } toast('Restaurada en ' + r.libro + ' › ' + r.hoja + ', fila ' + r.fila + '.'); datPapelera(); } catch (e) { b.disabled = false; b.textContent = 'Restaurar'; } });
}

async function datHistorial(q) {
  cargando('#datos', 'Leyendo el historial…');
  let H; try { H = await api('p_dat_historial', { q: q || '' }, 90000); } catch (e) { return; }
  marco('#datos', datCab('<button class="btn sec" id="dtVol">← Volver a los libros</button><button class="btn sec" id="dtPap">Papelera</button>') +
    '<section class="card tabla"><div style="padding:14px 18px;border-bottom:1px solid var(--ln)"><h2>Historial de cambios</h2><span class="mu peq">Los últimos cambios hechos desde el portal (esta pantalla y las de cada módulo). Completo en BASE COMÚN › HISTORIAL.</span>' +
    '<div class="filtros" style="margin-top:8px"><input class="c" id="dtHq" type="search" placeholder="Buscar (hoja, código, campo, valor…)" value="' + esc(q || '') + '"><button class="btn sec" id="dtHok">Buscar</button></div></div>' +
    ((H.lista || []).length ? '<div style="overflow-x:auto"><table><thead><tr><th>Fecha</th><th>Hoja</th><th>Fila o código</th><th>Campo</th><th>Antes</th><th>Después</th><th>Origen</th></tr></thead><tbody>' + H.lista.map(r => '<tr>' + r.map((c, i) => '<td' + (i >= 4 && i <= 5 ? ' class="peq"' : '') + '>' + esc(String(c).slice(0, 160)) + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>' : '<div class="mu peq" style="padding:14px 18px">Sin cambios registrados' + (q ? ' con esa búsqueda' : '') + '.</div>') + '</section>');
  $('dtVol').onclick = () => location.hash = '#datos' + (DATS.id ? '/' + encodeURIComponent(DATS.id) + (DATS.hoja ? '/' + encodeURIComponent(DATS.hoja) : '') : '');
  $('dtPap').onclick = () => location.hash = '#datos/papelera';
  $('dtHok').onclick = () => datHistorial($('dtHq').value.trim()); $('dtHq').onkeydown = e => { if (e.key === 'Enter') datHistorial($('dtHq').value.trim()); };
}

// Configuración del sistema: propiedades del script (IDs de libros y carpetas, PRECALENTAR_EST, DATOS_LIBROS_EXTRA…)
async function datConfig() {
  cargando('#datos', 'Leyendo la configuración…');
  let C; try { C = await api('p_dat_props', {}, 60000); } catch (e) { return; }
  if (!C.ok) return marco('#datos', datCab() + '<div class="aviso error">' + esc(C.mensaje || C.error || 'No se pudo leer.') + '</div>');
  marco('#datos', datCab('<button class="btn sec" id="dtVol">← Volver a los libros</button><button class="btn pri" id="cfNueva">+ Agregar valor</button>') +
    '<section class="card tabla"><div style="padding:14px 18px;border-bottom:1px solid var(--ln)"><h2>Configuración del sistema</h2><span class="mu peq">Propiedades del script «Sistema HyS» (también en el editor: Configuración del proyecto › Propiedades del script). Son los ID de los libros y carpetas de cada módulo y algunos ajustes, como PRECALENTAR_EST (establecimientos que se dejan calculados a las 7 y 13 h) o DATOS_LIBROS_EXTRA (planillas que aparecen en Datos). Cambiar un ID hace que el sistema use otro libro: hacelo solo si sabés cuál es el nuevo. Cada cambio queda en el historial.</span></div>' +
    '<div style="overflow-x:auto"><table><thead><tr><th>Nombre</th><th>Valor</th><th></th></tr></thead><tbody>' + C.props.map(p => '<tr><td><b>' + esc(p.k) + '</b></td><td class="peq" style="word-break:break-all">' + (p.oculta ? '<span class="mu">(oculto)</span>' : esc(p.v)) + '</td><td style="white-space:nowrap"><button class="btn sec peq" data-cf="' + esc(p.k) + '">Cambiar</button></td></tr>').join('') + '</tbody></table></div></section>');
  $('dtVol').onclick = () => location.hash = '#datos';
  const editar = p => { const m = modal(p ? 'Cambiar ' + p.k : 'Agregar valor', (p ? [] : [['K', 'Nombre (MAYÚSCULAS_Y_GUIONES)']]).concat([['V', 'Valor', null, 1]]), { K: '', V: p && !p.oculta ? p.v : '' }, async o => {
      const r = await api('p_dat_prop', { k: p ? p.k : o.K, v: o.V }, 60000); if (!r.ok) return r.mensaje || 'No se pudo guardar.'; toast('Guardado.'); datConfig(); return ''; });
    if (p) { const b = document.createElement('button'); b.className = 'btn sec'; b.style.color = 'var(--er)'; b.textContent = 'Borrar'; b.onclick = async () => { if (!b.dataset.ok) { b.dataset.ok = '1'; b.textContent = '¿Seguro? Tocá de nuevo'; return; } const r = await api('p_dat_prop', { k: p.k, borrar: true }, 60000); if (!r.ok) return toast(r.mensaje || 'No se pudo borrar.'); m.cerrar(); toast('Borrado.'); datConfig(); }; m.extra.appendChild(b); } };
  $('cfNueva').onclick = () => editar(null);
  document.querySelectorAll('[data-cf]').forEach(b => b.onclick = () => editar(C.props.find(p => p.k === b.dataset.cf)));
}
