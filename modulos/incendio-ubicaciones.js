// Portal HyS · 7 · Incendio › Revisión de ubicaciones del HMH (IncendioUbicaciones.gs) · versión 0 (07/11/2026, pedido de Belén)
// Al reponer extintores en el HMH se asignaron ubicaciones que no son las que necesita HyS. Acá se ve cada extintor con su foto
// panorámica, por planta y sector, y se decide: «Queda acá» o «Mover a…». Con los que hay que mover se arma la lista para SOMI o
// Mantenimiento (para imprimir; no se manda por correo). «Ya lo movieron» actualiza el extintor y su etiqueta QR queda pendiente.
// Se carga desde portal.html (<script src>). Para el portal de respaldo, herramientas/armar_respaldo.py lo junta en un solo archivo.
let INCU = null, INCUF = 'todos', INCUED = '';
const INCU_EST = { 'Queda': ['✅ Queda', 'ok'], 'Mover (pendiente)': ['↪️ Mover', 'wa'], 'Movido': ['Movido', 'ok'] };

async function incUbic(fresco) {
  if (!INCU || fresco) { cargando('#incubic', 'Leyendo los extintores del HMH…'); try { INCU = await api('p_inc_ubic', {}, 120000); } catch (e) { return; } }
  if (!INCU.ok) { const r = INCU; INCU = null; return incNoInstalado('#incubic', r); }
  const R = INCU.resumen, est = e => e.rev ? e.rev.ESTADO : '';
  const filtros = [['todos', 'Todos', R.total], ['sin', 'Sin revisar', R.sinRevisar], ['mover', 'Para mover', R.mover], ['queda', 'Quedan', R.quedan], ['movido', 'Movidos', R.movidos]];
  const pasa = e => INCUF === 'todos' || (INCUF === 'sin' && !e.rev) || (INCUF === 'mover' && est(e) === 'Mover (pendiente)') || (INCUF === 'queda' && est(e) === 'Queda') || (INCUF === 'movido' && est(e) === 'Movido');
  const L = INCU.ext.filter(pasa), grupos = {};
  L.forEach(e => { const k = (e.PLANTA || 's/d') + ' · ' + (e.SECTOR || 's/d'); (grupos[k] = grupos[k] || []).push(e); });
  const orden = INCU.plantas || [], kO = k => { const i = orden.indexOf(k.split(' · ')[0]); return (i < 0 ? 99 : i) + k; };
  const opc = (l, v) => l.map(x => '<option' + (x === v ? ' selected' : '') + '>' + esc(x) + '</option>').join('');
  const form = e => { const r = e.rev && e.rev.ESTADO === 'Mover (pendiente)' ? e.rev : {};
    return '<div class="iuForm" style="display:grid;gap:6px;margin-top:8px;padding:10px;border:1px solid var(--ln);border-radius:8px;background:var(--pa1)">' +
      '<b class="peq">¿A dónde va?</b><label class="f">Planta<select class="c" data-iuc="planta">' + opc(orden, r.A_PLANTA || e.PLANTA) + '</select></label>' +
      '<label class="f">Sector<input class="c" data-iuc="sector" value="' + esc(r.A_SECTOR || '') + '" placeholder="Ej.: Guardia"></label>' +
      '<label class="f">Dónde exactamente<input class="c" data-iuc="ubic" value="' + esc(r.A_UBICACION || '') + '" placeholder="Ej.: pasillo, al lado de la puerta del office"></label>' +
      '<label class="f">N.º de puesto nuevo (vacío = sigue el ' + esc(e.NRO || 's/d') + ')<input class="c" data-iuc="nro" inputmode="numeric" maxlength="3" value="' + esc(r.A_NRO || '') + '"></label>' +
      '<label class="f">Nota para quien lo mueve (opcional)<input class="c" data-iuc="nota" value="' + esc(r.NOTA || '') + '"></label>' +
      '<span style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn pri" data-iu="mover" data-id="' + esc(e.ID) + '">Guardar «Mover»</button><button class="btn sec" data-iu="cerrar">Cancelar</button></span></div>'; };
  const tarjeta = e => { const s = est(e), x = INCU_EST[s];
    return '<div class="card" style="padding:12px;display:flex;flex-direction:column;gap:6px;min-width:0" id="iu_' + esc(e.ID) + '">' +
      (e.foto ? '<a href="' + esc(e.fotoUrl) + '" target="_blank" rel="noopener" title="Abrir la foto"><img src="' + esc(e.foto) + '" loading="lazy" alt="Foto panorámica" style="width:100%;height:170px;object-fit:cover;border-radius:8px;background:#eee" onerror="this.parentNode.outerHTML=\'<div class=&quot;mu peq&quot;>Foto no disponible</div>\'"></a>' : '<div class="mu peq">Sin foto panorámica</div>') +
      '<div style="display:flex;justify-content:space-between;gap:6px;align-items:flex-start"><b>Puesto ' + esc(e.NRO || 's/d') + '</b>' + (x ? '<span class="chip ' + x[1] + ' mini">' + x[0] + '</span>' : '<span class="chip gr mini">Sin revisar</span>') + '</div>' +
      '<div class="peq">' + esc([e.TIPO, e.AGENTE, e.KG ? e.KG + ' kg' : ''].filter(Boolean).join(' · ')) + ' · inv. ' + esc(e.INV || 's/d') + '</div>' +
      '<div class="peq"><b>Está en:</b> ' + esc(e.PLANTA + ' · ' + e.SECTOR) + '<br>' + esc(e.UBICACION || '') + '</div>' +
      (s === 'Mover (pendiente)' ? '<div class="peq" style="background:var(--wabg,#FFF4D6);padding:6px 8px;border-radius:6px"><b>Va a:</b> ' + esc(e.rev.A_PLANTA + ' · ' + e.rev.A_SECTOR) + '<br>' + esc(e.rev.A_UBICACION) + (e.rev.A_NRO && e.rev.A_NRO !== e.NRO ? '<br>Pasa a ser el puesto ' + esc(e.rev.A_NRO) : '') + (e.rev.NOTA ? '<br><i>' + esc(e.rev.NOTA) + '</i>' : '') + '</div>' : '') +
      (s === 'Movido' ? '<div class="mu peq">Movido el ' + fechaTxt(e.rev.MOVIDO) + '. Su etiqueta QR quedó pendiente para imprimir.</div>' :
        '<span style="display:flex;gap:6px;flex-wrap:wrap">' + (s !== 'Queda' ? '<button class="btn ' + (s ? 'sec' : 'pri') + '" data-iu="queda" data-id="' + esc(e.ID) + '">✅ Queda acá</button>' : '') +
        '<button class="btn sec" data-iu="form" data-id="' + esc(e.ID) + '">' + (s === 'Mover (pendiente)' ? '✏️ Cambiar destino' : '↪️ Mover a…') + '</button>' +
        (s === 'Mover (pendiente)' ? '<button class="btn pri" data-iu="movido" data-id="' + esc(e.ID) + '">Ya lo movieron</button>' : '') +
        (s ? '<button class="link peq" data-iu="borrar" data-id="' + esc(e.ID) + '">Deshacer</button>' : '') + '</span>') +
      (INCUED === e.ID ? form(e) : '') + '</div>'; };
  marco('#incubic', '<div class="cab"><div><span class="mu peq"><a class="link" href="#inc">7 · Protección contra incendios</a></span><h1>Revisión de ubicaciones · HMH</h1><span class="mu peq">Mirá dónde quedó cada extintor (foto panorámica) y decidí si queda o se mueve. Las etiquetas QR del HMH conviene imprimirlas cuando esté todo revisado.</span></div>' +
    '<div class="filtros"><a class="link" href="' + esc(INCU.libro) + '" target="_blank" rel="noopener">Planilla REVISION_UBIC ↗</a><button class="btn pri" id="iuLista"' + (R.mover ? '' : ' disabled') + '>📋 Lista para SOMI (' + R.mover + ')</button><button class="btn sec" id="iuAct">Actualizar</button></div></div>' +
    '<div class="filtros" style="margin-bottom:12px">' + filtros.map(f => '<button class="btn ' + (INCUF === f[0] ? 'pri' : 'sec') + '" data-iuf="' + f[0] + '">' + f[1] + ' (' + f[2] + ')</button>').join('') + '</div>' +
    (L.length ? Object.keys(grupos).sort((a, b) => kO(a).localeCompare(kO(b))).map(k => '<h2 style="margin:16px 0 8px">' + esc(k) + ' <span class="mu peq">(' + grupos[k].length + ')</span></h2><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px">' + grupos[k].map(tarjeta).join('') + '</div>').join('')
      : '<p class="mu">No hay extintores en este filtro.</p>'));
  $('iuAct').onclick = () => incUbic(true);
  document.querySelectorAll('[data-iuf]').forEach(b => b.onclick = () => { INCUF = b.dataset.iuf; incUbic(); });
  $('iuLista').onclick = async () => { const w = window.open('', '_blank'); if (!w) return toast('El navegador bloqueó la ventana nueva: permití las ventanas emergentes para este sitio.');
    w.document.write('<p style="font-family:Arial;padding:20px">Armando la lista…</p>');
    try { const r = await api('p_inc_ubic_lista', {}, 120000); if (!r.ok) throw new Error(r.mensaje || 'No se pudo armar la lista.'); w.document.open(); w.document.write(r.html); w.document.close(); }
    catch (e) { w.close(); toast(e.message || 'No se pudo armar la lista.'); } };
  const enviar = async (accion, d, b, ok) => { const t0 = b.textContent; b.disabled = true; b.textContent = 'Guardando…';
    try { const r = await api(accion, d, 120000); if (!r.ok) throw new Error(r.mensaje || 'No se pudo guardar.'); INCUED = ''; toast(ok); INCQT = null; await incUbic(true); }
    catch (e) { b.disabled = false; b.textContent = t0; toast(e.message || 'No se pudo guardar.'); } };
  document.querySelectorAll('[data-iu]').forEach(b => b.onclick = () => { const a = b.dataset.iu, id = b.dataset.id;
    if (a === 'form') { INCUED = id; return incUbic(); }
    if (a === 'cerrar') { INCUED = ''; return incUbic(); }
    if (a === 'queda') return enviar('p_inc_ubic_guardar', { id: id, decision: 'queda' }, b, 'Listo: queda donde está.');
    if (a === 'borrar') return enviar('p_inc_ubic_guardar', { id: id, decision: 'borrar' }, b, 'Vuelve a «Sin revisar».');
    if (a === 'movido') { if (!confirm('¿Ya lo movieron? Se actualiza la ubicación del extintor y su etiqueta QR queda pendiente.')) return; return enviar('p_inc_ubic_movido', { id: id }, b, 'Extintor actualizado.'); }
    if (a === 'mover') { const f = b.closest('.iuForm'), v = k => (f.querySelector('[data-iuc="' + k + '"]') || {}).value || '';
      if (!v('sector').trim() || !v('ubic').trim()) return toast('Completá el sector y dónde exactamente.');
      return enviar('p_inc_ubic_guardar', { id: id, decision: 'mover', a_planta: v('planta'), a_sector: v('sector'), a_ubic: v('ubic'), a_nro: v('nro'), nota: v('nota') }, b, 'Guardado: va en la lista para SOMI.'); } });
}
