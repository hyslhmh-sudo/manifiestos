// Portal HyS · 2 · Agua y 3 · Plagas
// Se carga desde portal.html (<script src>). Para el portal de respaldo de Google, herramientas/armar_respaldo.py lo junta en un solo archivo.
// ------------------------------------------------------------------ Módulo 2 · Agua y módulo 3 · Plagas (toda la red; la misma lectura, dos pantallas)
async function agua(modo) {
  modo = modo === 'plagas' ? 'plagas' : 'agua'; const R = '#' + modo;
  if (!RES) { const g = LS.get('res', null); if (g) { RES = g; refrescarRes(); } else { cargando(R, 'Leyendo establecimientos…'); try { RES = await api('p_resumen', {}, 240000); LS.set('res', RES); } catch (e) { return; } } }
  if (!TB) TB = LS.get('tab', null);
  if (!TB || TB.vacio) { cargando(R, 'Leyendo…'); try { TB = await api('p_tablero', {}, 240000); LS.set('tab', TB); } catch (e) { return; } }
  const nom = c => ((RES && RES.filas.find(f => f.cod === c)) || {}).nombre || c, hoy = new Date().toISOString().slice(0, 10);
  const porEst = {}; TB.tanques.forEach(t => { const x = porEst[t.cod] = porEst[t.cod] || { t: 0, ok: 0 }; x.t++; if (t.aldia) x.ok++; });
  const A = FILTRO.area, todos = RES ? RES.filas.filter(f => !A || f.area === A) : [], areas = RES ? Array.from(new Set(RES.filas.map(f => f.area))).filter(Boolean).sort() : [];
  const enA = c => !A || (RES && (RES.filas.find(f => f.cod === c) || {}).area === A);
  const listaT = todos.map(f => f.cod).concat(Object.keys(porEst).filter(c => !RES || !RES.filas.some(f => f.cod === c))).sort((a, b) => (porEst[b] ? 1 : 0) - (porEst[a] ? 1 : 0) || nom(a).localeCompare(nom(b), 'es'));
  const conInv = listaT.filter(c => porEst[c]).length;
  const fila = (a, b, c) => '<a class="at" href="' + c + '"><span><b>' + a + '</b><small>' + b + '</small></span></a>';
  const noApta = TB.noApta.filter(a => enA(a.cod)), plagas = TB.plagas.filter(p => enA(p.cod));
  const pe = {}; (TB.puntos || []).filter(p => enA(p.cod)).forEach(p => { const x = pe[p.cod] = pe[p.cod] || { t: 0, aldia: 0, porvencer: 0, vencida: 0, sin: 0, unica: 0 }; x.t++; x[p.estado in x ? p.estado : 'sin']++; });
  const ptoEst = Object.keys(pe).sort((a, b) => nom(a).localeCompare(nom(b), 'es')).map(c => [c, pe[c]]);
  const cuerpo = modo === 'agua'
    ? '<section class="card"><h2 style="margin:0 0 6px;font-size:16px">Agua NO APTA abierta</h2>' + (noApta.length ? noApta.map(a => fila(esc(nom(a.cod)) + ' · ' + esc(a.punto), 'Nueva muestra antes del ' + fechaTxt(a.limite), '#ficha/' + encodeURIComponent(a.cod) + '/agua')).join('') : '<div class="mu">Ninguna.</div>') + '</section>' +
      '<section class="card"><h2 style="margin:0 0 6px;font-size:16px">Tanques por establecimiento</h2><span class="mu peq" style="display:block;margin-bottom:6px">' + conInv + ' de ' + listaT.length + ' con inventario cargado' + (A ? ' en ' + esc(A) : '') + '.</span><div style="max-height:560px;overflow-y:auto">' + listaT.map(c => fila(esc(nom(c)), porEst[c] ? porEst[c].ok + ' de ' + porEst[c].t + ' con limpieza al día' : 'Sin inventario cargado', '#ficha/' + encodeURIComponent(c) + '/agua')).join('') + '</div><span class="mu peq" style="display:block;margin-top:8px">Todos los establecimientos; primero los que ya cargaron tanques. Cada uno tiene su propio inventario, por sitio (edificio, dispositivos y CAPS). Los que no están habilitados en la aplicación todavía no pueden cargar.</span></section>' +
      // Canillas (puntos de muestreo) y su último análisis bacteriológico (cada 6 meses, Dto. 351/79): TB.puntos (Tablero.gs)
      '<section class="card"><h2 style="margin:0 0 6px;font-size:16px">Canillas y análisis por establecimiento</h2>' + (ptoEst.length ? '<span class="mu peq" style="display:block;margin-bottom:6px">Puntos de muestreo con su análisis bacteriológico (cada 6 meses) y físico-químico (cada 12). Detalle, resultados e informes en la ficha › Agua.</span>' +
        ptoEst.map(([c, x]) => fila(esc(nom(c)), x.t + (x.t > 1 ? ' canillas' : ' canilla') + ' · ' + [[x.aldia, 'al día'], [x.porvencer, 'por vencer'], [x.vencida, 'vencidas'], [x.sin, 'sin análisis'], [x.unica, 'muestra única']].filter(y => y[0]).map(y => y[0] + ' ' + y[1]).join(' · '), '#ficha/' + encodeURIComponent(c) + '/agua')).join('')
        : '<div class="mu">Ningún establecimiento cargó todavía sus canillas (puntos de muestreo).</div>') + '</section>'
    : '<section class="card" id="mipyvBox" style="grid-column:1/-1"><h2 style="margin:0 0 6px;font-size:16px">Registro MIPyV (operarios de la red Trelew)</h2><div class="mu">Leyendo…</div></section>' +
      '<section class="card"><h2 style="margin:0 0 6px;font-size:16px">Avisos de los establecimientos (casos abiertos)</h2>' + (plagas.length ? plagas.map(p => fila(esc(nom(p.cod)) + ' · ' + esc(p.plaga), esc(p.caso) + (p.revision ? ' · revisión ' + fechaTxt(p.revision) + (p.revision < hoy ? ' (atrasada)' : '') : ' · sin intervención'), '#ficha/' + encodeURIComponent(p.cod) + '/plagas')).join('') : '<div class="mu">Ninguno.</div>') + '</section>';
  marco(R, '<div class="cab"><div><span class="mu peq">' + (modo === 'agua' ? '2 · Agua' : '3 · Plagas') + '</span><h1>' + (modo === 'agua' ? 'Agua en la red' : 'Plagas en la red') + '</h1><span class="mu peq">' + (modo === 'agua' ? 'Lo cargan los establecimientos desde «Mi establecimiento». Detalle en la ficha de cada uno.' : 'Lo cargan los operarios desde la app MIPyV y los establecimientos desde «Mi establecimiento» (avisos).') + '</span></div>' +
    '<div class="filtros"><label class="f">Área<select class="c" id="agA"><option value="">Toda la provincia</option>' + areas.map(a => '<option' + (a === A ? ' selected' : '') + '>' + esc(a) + '</option>').join('') + '</select></label></div></div>' +
    '<div class="tb3">' + cuerpo + '</div>');
  $('agA').onchange = e => { FILTRO.area = e.target.value; agua(modo); };
  if (modo === 'plagas') mipyv();
}
// Registro MIPyV (Modulo5.gs): lo cargan los operarios desde su app; acá se ve y se marca «revisado»
let MIPYV = null;
async function mipyv(fresco) {
  const box = $('mipyvBox'); if (!box) return;
  if (!MIPYV || fresco) { try { MIPYV = await api('p_mipyv', { fresco: !!fresco }, 120000); } catch (e) { box.innerHTML = '<h2 style="margin:0 0 6px;font-size:16px">Registro MIPyV</h2><div class="mu">No se pudo leer.</div>'; return; } }
  const R = MIPYV; if (!R.ok) { box.innerHTML = '<h2 style="margin:0 0 6px;font-size:16px">Registro MIPyV</h2><div class="aviso error">' + esc(R.mensaje || 'Error') + '</div>'; return; }
  const k = (t, n, sub) => '<div><span class="mu peq">' + t + '</span><div style="font-size:24px;font-weight:700;color:var(--az)">' + n + '</div><span class="mu peq">' + sub + '</span></div>';
  const lugar = o => esc(o.cod ? o.cod + (o.sitio ? ' · ' + o.sitio : '') : o.lugar);
  box.innerHTML = '<div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;align-items:center"><h2 style="margin:0;font-size:16px">Registro MIPyV (operarios de la red Trelew)</h2><div class="filtros"><button class="btn sec" id="mpAct">Actualizar</button><a class="btn sec" href="' + esc(R.libro) + '" target="_blank" rel="noopener">Libro MIPyV ↗</a></div></div>' +
    '<div class="tb3" style="margin:12px 0">' + k('Intervenciones abiertas', R.abiertas.length, 'protocolos sin cerrar') + k('Saneamiento en curso', R.saneamiento.length, 'trabajos sin cerrar') + k('Seguimientos vencidos', R.vencidos.length, 'pidieron otra visita y pasó el plazo') + k('Visitas sin revisar', R.sinRevisar, 'últimos 90 días') + '</div>' +
    (R.sinLugar.length ? '<div class="aviso" style="margin-bottom:10px">Lugares de MIPyV sin cruzar con el sistema (completar codigo_sistema en la hoja establecimientos del libro MIPyV): ' + R.sinLugar.map(esc).join(', ') + '.</div>' : '') +
    (R.vencidos.length ? '<h3 style="margin:10px 0 6px;font-size:14px">Seguimientos vencidos</h3>' + R.vencidos.map(v => '<div class="at"><span><b>' + esc(v.lugar) + ' · ' + esc(v.plaga) + '</b><small>Protocolo ' + esc(v.protocolo) + ' · última visita ' + fechaTxt(v.fecha) + ' · venció ' + fechaTxt(v.vencia) + ' (' + esc(v.dias) + ' días) · ' + esc(v.operario) + '</small></span></div>').join('') : '') +
    (R.abiertas.length ? '<h3 style="margin:14px 0 6px;font-size:14px">Intervenciones abiertas</h3>' + R.abiertas.map(a => '<div class="at"><span><b>' + lugar(a) + ' · ' + esc(a.plaga) + '</b><small>Protocolo ' + esc(a.protocolo) + ' · desde ' + fechaTxt(a.desde) + ' · ' + esc(a.estado) + ' · ' + esc(a.operario) + '</small></span></div>').join('') : '') +
    (R.saneamiento.length ? '<h3 style="margin:14px 0 6px;font-size:14px">Saneamiento en curso</h3>' + R.saneamiento.map(t => '<div class="at"><span><b>' + lugar(t) + '</b><small>Desde ' + fechaTxt(t.desde) + ' · ' + esc(t.estado) + ' · ' + esc(t.operario) + '</small></span></div>').join('') : '') +
    '<h3 style="margin:14px 0 6px;font-size:14px">Visitas de los últimos 90 días (' + R.visitas.length + ')</h3>' +
    (R.visitas.length ? '<div style="overflow-x:auto"><table class="sinTab" style="width:100%;border-collapse:collapse"><thead><tr><th>Fecha</th><th>Lugar</th><th>Plaga · producto</th><th>Operarios</th><th>Resultado</th><th>HyS</th></tr></thead><tbody>' +
      R.visitas.map((v, i) => '<tr class="cl" data-v="' + i + '"><td>' + fechaTxt(v.fecha) + '<div class="mu peq">' + esc(v.protocolo || '') + '</div></td><td>' + lugar(v) + (v.sector ? '<div class="mu peq">' + esc(v.sector) + '</div>' : '') + '</td><td>' + esc(v.plaga || '—') + '<div class="mu peq">' + esc(v.producto || '') + (v.dosis ? ' · ' + esc(v.dosis) : '') + '</div></td><td class="peq">' + esc(v.operario || '') + (v.acompanante ? ' y ' + esc(v.acompanante) : '') + (v.horario ? '<div class="mu">' + esc(v.horario) + '</div>' : '') + '</td><td class="peq">' + esc(v.resultado || '') + (v.segunda ? '<div class="mu">2.ª: ' + fechaTxt(v.segunda) + '</div>' : '') + '</td><td class="peq">' + (/^revisad/i.test(String(v.revisado)) ? '<span class="chip ok">' + esc(v.revisado) + '</span>' : '<span class="chip wa">Sin revisar</span>') + '</td></tr>').join('') + '</tbody></table></div>' : '<div class="mu">Sin visitas en los últimos 90 días.</div>') +
    '<div class="mu peq" style="margin-top:8px">Datos al ' + esc(R.actualizado) + '. Tocá una visita para ver el detalle, las fotos y marcarla como revisada.</div>';
  $('mpAct').onclick = () => mipyv(true);
  box.querySelectorAll('tr[data-v]').forEach(tr => tr.onclick = () => mipyvVer(R.visitas[Number(tr.dataset.v)]));
}
function mipyvVer(v) {
  const dd = (t, x) => x ? '<dt>' + t + '</dt><dd>' + x + '</dd>' : '';
  $('ov').innerHTML = '<div class="modal" role="dialog" aria-modal="true" aria-label="Visita MIPyV"><h2>Visita del ' + fechaTxt(v.fecha) + ' · ' + esc(v.lugar) + '</h2><dl class="dl">' +
    dd('Protocolo', esc(v.protocolo)) + dd('Lugar', esc(v.lugar) + (v.sector ? ' · ' + esc(v.sector) : '')) + dd('Operarios', esc(v.operario) + (v.acompanante ? ' y ' + esc(v.acompanante) : '') + (v.horario ? ' · ' + esc(v.horario) : '')) +
    dd('Qué se hizo', esc(v.motivo)) + dd('Plaga', esc(v.plaga)) + dd('Producto · dosis', esc(v.producto) + (v.dosis ? ' · ' + esc(v.dosis) : '')) + dd('EPP', esc(v.epp)) + dd('Resultado', esc(v.resultado) + (v.segunda ? ' · 2.ª intervención ' + fechaTxt(v.segunda) : '')) +
    dd('Observaciones', esc(v.obs).replace(/\n/g, '<br>')) + dd('Fotos', v.fotos.map((u, i) => '<a href="' + esc(u) + '" target="_blank" rel="noopener">Foto ' + (i + 1) + ' ↗</a>').join(' · ')) + dd('Revisión HyS', esc(v.revisado || 'Sin revisar')) + '</dl>' +
    '<label class="f" style="margin-top:12px">Nota de revisión (opcional)<input class="c" id="mpNota" placeholder="Ej.: horas extras aprobadas"></label>' +
    '<div class="acciones"><div></div><div style="display:flex;gap:8px"><button class="btn sec" id="mpCer">Cerrar</button><button class="btn pri" id="mpRev">Marcar como revisada</button></div></div></div>';
  $('ov').hidden = false;
  const cerrar = () => { $('ov').hidden = true; $('ov').innerHTML = ''; };
  $('mpCer').onclick = cerrar;
  $('mpRev').onclick = async () => { $('mpRev').disabled = true; $('mpRev').textContent = 'Guardando…';
    try { const r = await api('p_mipyv_revisar', { id: v.id, nota: $('mpNota').value }); if (!r.ok) throw new Error(r.mensaje); toast('Visita marcada como revisada.'); cerrar(); mipyv(true); }
    catch (e) { $('mpRev').disabled = false; $('mpRev').textContent = 'Marcar como revisada'; toast(e.message || 'No se pudo guardar.'); } };
}
