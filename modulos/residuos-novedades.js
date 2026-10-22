// ------------------------------------------------------------------ 1 · Residuos › Novedades de residuos (ResiduosNovedades.gs, versión 0, 22/10/2026)
// Lo que se vio mal en las recorridas y se informó desde «Mi establecimiento» (Melani en la red Trelew, el referente del HSST).
// Todas juntas (HZT, HMH, HSST): primero las abiertas de residuos peligrosos. HyS las marca resueltas desde acá. No envía correos.
let RNP = null;
async function resNovPortal(fresco) {
  if (!RNP || fresco) { cargando('#resnov', 'Leyendo las novedades de residuos…'); try { RNP = await api('p_resnov_listar', {}, 120000); } catch (e) { return; } }
  if (!RNP.ok) { const r = RNP; RNP = null;
    return marco('#resnov', '<div class="cab"><div><span class="mu peq"><a class="link" href="#res">1 · Residuos</a></span><h1>Novedades de residuos</h1></div></div><div class="aviso error">' + esc((r && (r.mensaje || r.error)) || 'No se pudo leer.') + '</div>'); }
  const lk = (u, t) => u ? '<a class="link" href="' + esc(u) + '" target="_blank" rel="noopener">' + esc(t) + ' ↗</a>' : '';
  const ests = Array.from(new Set(RNP.abiertas.concat(RNP.resueltas).map(n => n.ESTABLECIMIENTO).filter(Boolean))).sort(), filtro = RNP._est || '';
  const ver = L => L.filter(n => !filtro || n.ESTABLECIMIENTO === filtro);
  const ab = ver(RNP.abiertas), pel = ab.filter(n => n.PELIGROSA === 'Sí').length;
  const fila = (n, abierta) => '<tr><td style="white-space:nowrap">' + fechaTxt(n.FECHA) + (n.HORA ? '<div class="mu peq">' + esc(n.HORA) + '</div>' : '') + '</td>' +
    '<td><b>' + esc(n.TIPO) + '</b>' + (n.PELIGROSA === 'Sí' ? ' <span class="chip er">Peligroso</span>' : '') + (n.ORIGEN ? ' <span class="chip">' + esc(n.ORIGEN) + ' · ' + esc(n.ID) + '</span>' : '') + '<div class="mu peq">' + esc(n.CORRIENTE || '') + '</div></td>' +
    '<td>' + esc(n.ESTABLECIMIENTO) + (n.SITIO && n.SITIO !== n.ESTABLECIMIENTO ? ' · ' + esc(n.SITIO) : '') + '<div class="mu peq">' + esc(n.SECTOR || '') + '</div></td>' +
    '<td class="peq" style="max-width:280px">' + esc(n.DETALLE || '') + (n.FOTO ? '<div>' + lk(n.FOTO, 'Foto') + '</div>' : '') + '</td><td class="peq">' + esc(n.QUIEN || '') + '</td>' +
    '<td>' + (abierta ? '<button class="btn pri" data-rnres="' + esc(n.ID) + '">Resuelta</button>' : '<span class="chip ok">Resuelta</span><div class="mu peq">' + fechaTxt(n.RESUELTO) + (n.RESOLUCION ? ' · ' + esc(n.RESOLUCION) : '') + (n.RESUELTO_POR ? ' · ' + esc(n.RESUELTO_POR) : '') + '</div>') + '</td></tr>';
  const tabla = (L, abierta) => '<div style="overflow-x:auto"><table><thead><tr><th>Fecha</th><th>Qué</th><th>Dónde</th><th>Detalle</th><th>Quién</th><th></th></tr></thead><tbody>' + L.map(n => fila(n, abierta)).join('') + '</tbody></table></div>';
  marco('#resnov', '<div class="cab"><div><span class="mu peq"><a class="link" href="#res">1 · Residuos</a></span><h1>Novedades de residuos</h1>' +
    '<span class="mu peq">Lo que se vio mal en las recorridas: lo informado desde «Mi establecimiento» y los desvíos que registran los operarios de Star Union en el HMH. Primero, lo de residuos peligrosos. No se envían correos.</span></div>' +
    '<div class="filtros">' + (ests.length > 1 ? '<select id="rnEst"><option value="">Todos los establecimientos</option>' + ests.map(c => '<option value="' + esc(c) + '"' + (c === filtro ? ' selected' : '') + '>' + esc(c) + '</option>').join('') + '</select>' : '') +
    '<button class="btn sec" id="rnAct">Actualizar</button></div></div>' +
    '<section class="card tabla"><div style="padding:14px 18px;border-bottom:1px solid var(--ln)"><h2>Abiertas (' + ab.length + ')' + (pel ? ' · ' + pel + ' de residuos peligrosos' : '') + '</h2></div>' +
      (RNP.aviso ? '<div class="aviso error" style="margin:14px 18px">' + esc(RNP.aviso) + '</div>' : '') + (ab.length ? tabla(ab, true) : '<p class="mu" style="padding:14px 18px">No hay novedades abiertas.</p>') + '</section>' +
    (ver(RNP.resueltas).length ? '<section class="card tabla"><div style="padding:14px 18px;border-bottom:1px solid var(--ln)"><h2>Resueltas</h2></div>' + tabla(ver(RNP.resueltas), false) + '</section>' : '') +
    '<p class="mu peq">Cada novedad queda también en el libro de manifiestos de su establecimiento, hoja NOVEDADES_RES (ahí se puede cargar a mano si falla la aplicación). Los desvíos del recorrido (DR-…) están en la planilla «DESVÍOS RESIDUOS HMH · Registro (v0)»: «Resuelta» los marca como revisados por HyS (REVISADO_POR, FECHA_REVISION y OBS_HYS).</p>');
  $('rnAct').onclick = () => { const e = RNP && RNP._est; RNP = null; resNovPortal(true).then(() => { if (RNP && e) { RNP._est = e; resNovPortal(); } }); };
  const sel = $('rnEst'); if (sel) sel.onchange = () => { RNP._est = sel.value; resNovPortal(); };
  document.querySelectorAll('[data-rnres]').forEach(b => b.onclick = () => { const n = RNP.abiertas.find(x => x.ID === b.dataset.rnres); if (!n) return;
    modal('Novedad resuelta · ' + n.TIPO, [['RESOLUCION', 'Qué se hizo (opcional)', null, 1]], {}, async out => {
      const r = await api('p_resnov_resolver', { cod: n.ESTABLECIMIENTO, ID: n.ID, RESOLUCION: out.RESOLUCION || '' }, 120000); if (!r.ok) return r.mensaje || 'No se pudo guardar.';
      const e = RNP && RNP._est; RNP = null; TB = null; toast('Novedad marcada como resuelta.'); await resNovPortal(true); if (RNP && e) { RNP._est = e; resNovPortal(); } return ''; },
      '<p class="mu peq" style="margin:0">' + esc(n.ESTABLECIMIENTO + ' · ' + (n.SECTOR || '') + ' · ' + (n.DETALLE || '')) + '</p>'); });
}
