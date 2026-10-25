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
  const A = FILTRO.area, todos = RES ? RES.filas.filter(f => /^activ/i.test(f.estado) && (!A || f.area === A)) : [], areas = RES ? Array.from(new Set(RES.filas.map(f => f.area))).filter(Boolean).sort() : [];
  const enA = c => !A || (RES && (RES.filas.find(f => f.cod === c) || {}).area === A);
  const listaT = todos.map(f => f.cod).concat(Object.keys(porEst).filter(c => !RES || !RES.filas.some(f => f.cod === c))).sort((a, b) => (porEst[b] ? 1 : 0) - (porEst[a] ? 1 : 0) || nom(a).localeCompare(nom(b), 'es'));
  const conInv = listaT.filter(c => porEst[c]).length;
  const fila = (a, b, c) => '<a class="at" href="' + c + '"><span><b>' + a + '</b><small>' + b + '</small></span></a>';
  const noApta = TB.noApta.filter(a => enA(a.cod)), plagas = TB.plagas.filter(p => enA(p.cod));
  const pe = {}; (TB.puntos || []).filter(p => enA(p.cod)).forEach(p => { const x = pe[p.cod] = pe[p.cod] || { t: 0, aldia: 0, porvencer: 0, vencida: 0, sin: 0, unica: 0 }; x.t++; x[p.estado in x ? p.estado : 'sin']++; });
  const ptoEst = Object.keys(pe).sort((a, b) => nom(a).localeCompare(nom(b), 'es')).map(c => [c, pe[c]]);
  const cuerpo = modo === 'agua'
    ? '<section class="card"><h2 style="margin:0 0 6px;font-size:16px">Agua NO APTA abierta</h2>' + (noApta.length ? noApta.map(a => fila(esc(nom(a.cod)) + ' · ' + esc(a.punto), 'Nueva muestra antes del ' + fechaTxt(a.limite), '#ficha/' + encodeURIComponent(a.cod) + '/agua')).join('') : '<div class="mu">Ninguna.</div>') + '</section>' +
      '<section class="card"><h2 style="margin:0 0 6px;font-size:16px">Tanques por establecimiento</h2><span class="mu peq" style="display:block;margin-bottom:6px">' + conInv + ' de ' + listaT.length + ' habilitados con inventario cargado' + (A ? ' en ' + esc(A) : '') + '.</span><div style="max-height:560px;overflow-y:auto">' + listaT.map(c => fila(esc(nom(c)), porEst[c] ? porEst[c].ok + ' de ' + porEst[c].t + ' con limpieza al día' : '<span style="color:#B4361F;font-weight:700">Sin inventario de tanques cargado · pendiente</span>', '#ficha/' + encodeURIComponent(c) + '/agua')).join('') + '</div><span class="mu peq" style="display:block;margin-top:8px">Solo los establecimientos habilitados en la aplicación; primero los que ya cargaron tanques. Cada uno tiene su propio inventario, por sitio (edificio, dispositivos y CAPS).</span></section>' +
      // Canillas (puntos de muestreo) y su último análisis bacteriológico (cada 6 meses, Dto. 351/79): TB.puntos (Tablero.gs)
      '<section class="card"><h2 style="margin:0 0 6px;font-size:16px">Canillas y análisis por establecimiento</h2>' + ((ptoEst.length || todos.length) ? '<span class="mu peq" style="display:block;margin-bottom:6px">Puntos de muestreo con su análisis bacteriológico (cada 6 meses) y físico-químico (cada 12). Detalle, resultados e informes en la ficha › Agua.</span>' +
        todos.filter(f => !pe[f.cod]).map(f => fila(esc(nom(f.cod)), '<span style="color:#B4361F;font-weight:700">Sin canillas (puntos de muestreo) cargadas · pendiente</span>', '#ficha/' + encodeURIComponent(f.cod) + '/agua')).join('') +
        ptoEst.map(([c, x]) => fila(esc(nom(c)), x.t + (x.t > 1 ? ' canillas' : ' canilla') + ' · ' + [[x.aldia, 'al día'], [x.porvencer, 'por vencer'], [x.vencida, 'vencidas'], [x.sin, 'sin análisis'], [x.unica, 'muestra única']].filter(y => y[0]).map(y => y[0] + ' ' + y[1]).join(' · '), '#ficha/' + encodeURIComponent(c) + '/agua')).join('')
        : '<div class="mu">Ningún establecimiento cargó todavía sus canillas (puntos de muestreo).</div>') + '<a class="btn sec" href="#modelos" id="invModelo" style="margin-top:10px;display:inline-block">Modelo para relevar el inventario de agua</a><a class="btn sec" href="https://drive.google.com/file/d/1dnesnwjfMgHOgayv_NqGjm96-SZ144qf/view" target="_blank" rel="noopener" style="margin:10px 0 0 8px;display:inline-block">Formulario F-AGU-01 de limpieza de tanques</a><span class="mu peq" style="display:block;margin-top:6px">Planilla para completar los tanques, cisternas y canillas de cualquier establecimiento. Al volver se carga desde «Bandeja de entrada». El formulario F-AGU-01 se imprime, se firma y se sube la foto en la ficha del establecimiento › Agua.</span></section>'
    : '<section class="card" id="mipyvBox" style="grid-column:1/-1"><h2 style="margin:0 0 6px;font-size:16px">Registro MIPyV (operarios de la red Trelew)</h2><div class="mu">Leyendo…</div></section>' +
      '<section class="card"><h2 style="margin:0 0 6px;font-size:16px">Avisos de los establecimientos (casos abiertos)</h2>' + (plagas.length ? plagas.map(p => fila(esc(nom(p.cod)) + ' · ' + esc(p.plaga), esc(p.caso) + (p.revision ? ' · revisión ' + fechaTxt(p.revision) + (p.revision < hoy ? ' (atrasada)' : '') : ' · sin intervención'), '#ficha/' + encodeURIComponent(p.cod) + '/plagas')).join('') : '<div class="mu">Ninguno.</div>') + '</section>';
  marco(R, '<div class="cab"><div><span class="mu peq">' + (modo === 'agua' ? '2 · Agua' : '3 · Plagas') + '</span><h1>' + (modo === 'agua' ? 'Agua en la red' : 'Plagas en la red') + '</h1><span class="mu peq">' + (modo === 'agua' ? 'Lo cargan los establecimientos desde «Mi establecimiento». Detalle en la ficha de cada uno.' : 'Lo cargan los operarios desde la app MIPyV y los establecimientos desde «Mi establecimiento» (avisos).') + '</span></div>' +
    '<div class="filtros"><label class="f">Área<select class="c" id="agA"><option value="">Toda la provincia</option>' + areas.map(a => '<option' + (a === A ? ' selected' : '') + '>' + esc(a) + '</option>').join('') + '</select></label></div></div>' +
    '<div class="tb3">' + cuerpo + '</div>');
  $('agA').onchange = e => { FILTRO.area = e.target.value; agua(modo); };
  if ($('invModelo')) $('invModelo').onclick = () => { MOD.tipo = 'INVENTARIO_AGUA'; };
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
  const C = Array.isArray(R.casos) ? R.casos : null, S = R.solicitudes || [];
  box.innerHTML = '<div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;align-items:center"><h2 style="margin:0;font-size:16px">Registro MIPyV (operarios de la red Trelew)</h2><div class="filtros"><button class="btn sec" id="mpAct">Actualizar</button><a class="btn sec" href="' + esc(R.libro) + '" target="_blank" rel="noopener">Libro MIPyV ↗</a></div></div>' +
    (C ? '<div class="tb3" style="margin:12px 0">' + k('Casos abiertos', C.length, C.filter(c => c.dias < 0).length + ' vencido(s) · ' + C.filter(c => c.dias >= 0 && c.urgente).length + ' por vencer') + k('Solicitudes pendientes', S.filter(x => x.estado === 'Pendiente').length, 'de los operarios') + k('Saneamiento en curso', R.saneamiento.length, 'trabajos sin cerrar') + k('Visitas sin revisar', R.sinRevisar, 'últimos 90 días') + '</div>'
      : '<div class="tb3" style="margin:12px 0">' + k('Intervenciones abiertas', R.abiertas.length, 'protocolos sin cerrar') + k('Saneamiento en curso', R.saneamiento.length, 'trabajos sin cerrar') + k('Seguimientos vencidos', R.vencidos.length, 'pidieron otra visita y pasó el plazo') + k('Visitas sin revisar', R.sinRevisar, 'últimos 90 días') + '</div>' + (R.apiError ? '<div class="aviso" style="margin-bottom:10px">' + esc(R.apiError) + ' Se muestran los datos de las hojas del libro.</div>' : '')) +
    (R.sinLugar.length ? '<div class="aviso" style="margin-bottom:10px">Lugares de MIPyV sin cruzar con el sistema (completar codigo_sistema en la hoja establecimientos del libro MIPyV): ' + R.sinLugar.map(esc).join(', ') + '.</div>' : '') +
    (C ? mpCasosHtml(C) + mpSolHtml(S) + mpCierresHtml(R.cierres || []) : '') +
    (!C && R.vencidos.length ? '<h3 style="margin:10px 0 6px;font-size:14px">Seguimientos vencidos</h3>' + R.vencidos.map(v => '<div class="at"><span><b>' + esc(v.lugar) + ' · ' + esc(v.plaga) + '</b><small>Protocolo ' + esc(v.protocolo) + ' · última visita ' + fechaTxt(v.fecha) + ' · venció ' + fechaTxt(v.vencia) + ' (' + esc(v.dias) + ' días) · ' + esc(v.operario) + '</small></span></div>').join('') : '') +
    (!C && R.abiertas.length ? '<h3 style="margin:14px 0 6px;font-size:14px">Intervenciones abiertas</h3>' + R.abiertas.map(a => '<div class="at"><span><b>' + lugar(a) + ' · ' + esc(a.plaga) + '</b><small>Protocolo ' + esc(a.protocolo) + ' · desde ' + fechaTxt(a.desde) + ' · ' + esc(a.estado) + ' · ' + esc(a.operario) + '</small></span></div>').join('') : '') +
    (R.saneamiento.length ? '<h3 style="margin:14px 0 6px;font-size:14px">Saneamiento en curso</h3>' + R.saneamiento.map(t => '<div class="at"><span><b>' + lugar(t) + '</b><small>Desde ' + fechaTxt(t.desde) + ' · ' + esc(t.estado) + ' · ' + esc(t.operario) + '</small></span></div>').join('') : '') +
    '<h3 style="margin:14px 0 6px;font-size:14px">Visitas de los últimos 90 días (' + R.visitas.length + ')</h3>' +
    (R.visitas.length ? '<div style="overflow-x:auto"><table class="sinTab" style="width:100%;border-collapse:collapse"><thead><tr><th>Fecha</th><th>Lugar</th><th>Plaga · producto</th><th>Operarios</th><th>Resultado</th><th>HyS</th></tr></thead><tbody>' +
      R.visitas.map((v, i) => '<tr class="cl" data-v="' + i + '"><td>' + fechaTxt(v.fecha) + '<div class="mu peq">' + esc(v.protocolo || '') + '</div></td><td>' + lugar(v) + (v.sector ? '<div class="mu peq">' + esc(v.sector) + '</div>' : '') + '</td><td>' + esc(v.plaga || '—') + '<div class="mu peq">' + esc(v.producto || '') + (v.dosis ? ' · ' + esc(v.dosis) : '') + '</div></td><td class="peq">' + esc(v.operario || '') + (v.acompanante ? ' y ' + esc(v.acompanante) : '') + (v.horario ? '<div class="mu">' + esc(v.horario) + '</div>' : '') + '</td><td class="peq">' + esc(v.resultado || '') + (v.segunda ? '<div class="mu">2.ª: ' + fechaTxt(v.segunda) + '</div>' : '') + '</td><td class="peq">' + (/^revisad/i.test(String(v.revisado)) ? '<span class="chip ok">' + esc(v.revisado) + '</span>' : '<span class="chip wa">Sin revisar</span>') + '</td></tr>').join('') + '</tbody></table></div>' : '<div class="mu">Sin visitas en los últimos 90 días.</div>') +
    '<div class="mu peq" style="margin-top:8px">Datos al ' + esc(R.actualizado) + '. Tocá una visita para ver el detalle, las fotos y marcarla como revisada.</div>';
  $('mpAct').onclick = () => mipyv(true);
  box.querySelectorAll('tr[data-v]').forEach(tr => tr.onclick = () => mipyvVer(R.visitas[Number(tr.dataset.v)]));
  box.querySelectorAll('[data-mpc]').forEach(b => b.onclick = () => mpCerrar(C[Number(b.dataset.mpc)]));
  box.querySelectorAll('[data-mpp]').forEach(b => b.onclick = () => mpProtocolo(C[Number(b.dataset.mpp)], R.visitas));
  box.querySelectorAll('[data-mps]').forEach(b => b.onclick = () => mpResponder(S.find(x => x.id === b.dataset.mps)));
}
// ---------- Casos, solicitudes y cierres de MIPyV (25/10/2026): los mismos casos que ven Javier y Paulo en la app
const mpChip = c => c.dias < 0 ? '<span class="chip er mini">venció hace ' + (-c.dias) + ' día(s)</span>' : c.dias === 0 ? '<span class="chip er mini">vence hoy</span>' : c.urgente ? '<span class="chip wa mini">vence en ' + c.dias + ' día(s)</span>' : '<span class="chip ok mini">vence ' + fechaTxt(c.vence) + '</span>';
const mpLink = (u, i) => '<a href="' + esc(u) + '" target="_blank" rel="noopener">Foto ' + (i + 1) + ' ↗</a>';
function mpCasosHtml(C) {
  return '<h3 style="margin:10px 0 6px;font-size:14px">Casos abiertos (' + C.length + ')</h3><div class="mu peq" style="margin:-2px 0 6px">Un caso es una intervención cuya última visita pidió otra visita. Desde 3 días antes de vencer, la app les pide a los operarios que indiquen el cierre (Resuelto / No resuelto y por qué).</div>' +
    (C.length ? C.map((c, i) => '<div class="at" style="align-items:flex-start"><span><b>' + esc(c.cod ? c.cod + (c.sitio ? ' · ' + c.sitio : '') : c.establecimiento) + ' · ' + esc(c.tipo_plaga || '') + '</b> ' + mpChip(c) +
      '<small style="display:block">' + (/^PENDIENTE/.test(c.protocolo) ? '<span style="color:#B4361F">Sin n.º de protocolo</span>' : 'Protocolo ' + esc(c.protocolo)) + ' · desde ' + fechaTxt(c.fecha_primera) + ' · última visita ' + fechaTxt(c.fecha_ultima) + ' · ' + (c.visitas || []).length + ' visita(s) · ' + esc(c.operario || '') + '</small>' +
      (c.resumen ? '<small class="mu" style="display:block">' + esc(c.resumen) + '</small>' : '') + '</span><span style="display:flex;gap:6px;flex-wrap:wrap;flex:0 0 auto"><button class="btn sec" data-mpp="' + i + '">N.º de protocolo</button><button class="btn pri" data-mpc="' + i + '">Cerrar caso</button></span></div>').join('')
      : '<div class="mu">No hay casos abiertos.</div>');
}
function mpSolHtml(S) {
  const pend = S.filter(x => x.estado === 'Pendiente' || x.estado === 'En gestión'), resto = S.filter(x => pend.indexOf(x) < 0).slice(0, 10);
  const fila = x => '<div class="at" style="align-items:flex-start"><span><b>' + esc(x.tipo) + (x.que ? ' · ' + esc(x.que) : '') + (x.cantidad ? ' · ' + esc(x.cantidad) : '') + '</b> <span class="chip ' + (x.estado === 'Pendiente' ? 'er' : x.estado === 'En gestión' ? 'wa' : 'ok') + ' mini">' + esc(x.estado) + '</span>' +
    '<small style="display:block">' + fechaTxt(String(x.fecha || '').slice(0, 10)) + ' · ' + esc(x.operario || '') + (x.establecimiento ? ' · ' + esc(x.establecimiento) : '') + '</small>' + (x.detalle ? '<small style="display:block">' + esc(x.detalle) + '</small>' : '') +
    (x.fotos && x.fotos.length ? '<small style="display:block">' + x.fotos.map(mpLink).join(' · ') + '</small>' : '') + (x.respuesta ? '<small class="mu" style="display:block">Respuesta: ' + esc(x.respuesta) + '</small>' : '') + '</span><button class="btn sec" style="flex:0 0 auto" data-mps="' + esc(x.id) + '">Responder</button></div>';
  return '<h3 style="margin:14px 0 6px;font-size:14px">Solicitudes de los operarios' + (pend.length ? ' (' + pend.length + ' pendiente' + (pend.length > 1 ? 's' : '') + ')' : '') + '</h3>' +
    (S.length ? pend.map(fila).join('') + (resto.length ? '<details style="margin-top:4px"><summary class="mu peq">Ver las ya respondidas (' + resto.length + ')</summary>' + resto.map(fila).join('') + '</details>' : '') : '<div class="mu">Todavía no mandaron solicitudes desde la app.</div>');
}
function mpCierresHtml(K) {
  if (!K.length) return '';
  return '<details style="margin-top:12px"><summary style="font-weight:700;font-size:14px;cursor:pointer">Cierres de casos de los últimos 60 días (' + K.length + ' · ' + K.filter(c => c.resultado === 'No resuelto').length + ' no resueltos)</summary>' +
    K.map(c => '<div class="at"><span><b>' + esc(c.establecimiento || '') + ' · ' + esc(c.tipo_plaga || '') + '</b> <span class="chip ' + (c.resultado === 'Resuelto' ? 'ok' : 'er') + ' mini">' + esc(c.resultado) + '</span>' +
      '<small style="display:block">' + fechaTxt(String(c.fecha || '').slice(0, 10)) + ' · ' + esc(c.operario || '') + (c.motivo ? ' · ' + esc(c.motivo) : '') + (/^PENDIENTE/.test(c.protocolo) ? '' : ' · protocolo ' + esc(c.protocolo)) + '</small>' + (c.detalle ? '<small style="display:block">' + esc(c.detalle) + '</small>' : '') +
      (c.fotos && c.fotos.length ? '<small style="display:block">' + c.fotos.map(mpLink).join(' · ') + '</small>' : '') + '</span></div>').join('') + '</details>';
}
function mpModal(titulo, cuerpo, okTxt, guardar) {
  $('ov').innerHTML = '<div class="modal" role="dialog" aria-modal="true" aria-label="' + esc(titulo) + '"><h2>' + esc(titulo) + '</h2>' + cuerpo + '<div class="aviso error" id="mpErr" hidden></div><div class="acciones"><div></div><div style="display:flex;gap:8px"><button class="btn sec" id="mpX">Cancelar</button><button class="btn pri" id="mpOk">' + esc(okTxt) + '</button></div></div></div>';
  $('ov').hidden = false;
  const cerrar = () => { $('ov').hidden = true; $('ov').innerHTML = ''; };
  $('mpX').onclick = cerrar;
  $('mpOk').onclick = async () => { const b = $('mpOk'), e = $('mpErr'); b.disabled = true; b.textContent = 'Guardando…'; e.hidden = true;
    try { const r = await guardar(); if (!r || !r.ok) throw new Error(r && (r.mensaje || r.error) || 'No se pudo guardar.'); cerrar(); toast('Guardado.'); mipyv(true); }
    catch (err) { b.disabled = false; b.textContent = okTxt; e.textContent = err.message; e.hidden = false; } };
}
function mpCerrar(c) {
  mpModal('Cerrar caso · ' + c.establecimiento + ' · ' + (c.tipo_plaga || ''), '<p class="mu peq" style="margin-top:0">' + (/^PENDIENTE/.test(c.protocolo) ? 'Sin n.º de protocolo' : 'Protocolo ' + esc(c.protocolo)) + ' · última visita ' + fechaTxt(c.fecha_ultima) + ' · ' + esc(c.operario || '') + '. Queda registrado en el libro MIPyV (hoja cierres_casos) a tu nombre; si después se carga otra visita del caso, se vuelve a abrir.</p>' +
    '<label class="f">¿Cómo quedó?<select class="c" id="mpRes"><option value="">Elegí…</option><option>Resuelto</option><option>No resuelto</option></select></label>' +
    '<label class="f" id="mpMotL" hidden>Motivo<select class="c" id="mpMot"><option value="">Elegí…</option><option>El biocida no hizo efecto</option><option>Falta de herramientas o insumos (biocidas)</option><option>Otro</option></select></label>' +
    '<label class="f">Detalle<textarea class="c" id="mpDet" rows="3" placeholder="Obligatorio si el motivo es «Otro»"></textarea></label>', 'Cerrar caso',
    () => api('p_mipyv_cerrar', { protocolo: c.protocolo, alias: c.alias, id_ultima_visita: c.id_ultima_visita, establecimiento: c.establecimiento, tipo_plaga: c.tipo_plaga, resultado_cierre: $('mpRes').value, motivo: $('mpMot').value, detalle: $('mpDet').value }, 120000));
  $('mpRes').onchange = () => { $('mpMotL').hidden = $('mpRes').value !== 'No resuelto'; };
}
function mpProtocolo(c, visitas) {
  const del = visitas.filter(v => v.lugar === c.establecimiento).slice(0, 40), ya = c.visitas || [];
  mpModal('Número de protocolo · ' + c.establecimiento, '<p class="mu peq" style="margin-top:0">Las visitas con el mismo número forman un solo caso: así el sistema sabe que una visita es la continuación de otra. Marcá las visitas que van juntas (aparecen las del mismo lugar de los últimos 90 días).</p>' +
    '<label class="f">N.º de protocolo<input class="c" id="mpProt" value="' + esc(/^PENDIENTE/.test(c.protocolo) ? '' : c.protocolo) + '" placeholder="Ej.: 141/2026"></label>' +
    '<div style="max-height:46vh;overflow:auto;border:1px solid var(--line,#D1D1D1);border-radius:10px;padding:6px 10px">' + del.map(v => '<label style="display:flex;gap:8px;align-items:flex-start;padding:5px 0;border-bottom:1px solid #EEE"><input type="checkbox" data-id="' + esc(v.id) + '"' + (ya.indexOf(v.id) >= 0 ? ' checked' : '') + '><span><b>' + fechaTxt(v.fecha) + ' · ' + esc(v.plaga || '—') + '</b> <span class="mu peq">' + esc(v.resultado || '') + (v.protocolo ? ' · ' + esc(v.protocolo) : '') + '</span><br><span class="mu peq">' + esc(String(v.obs || v.sector || '').slice(0, 140)) + '</span></span></label>').join('') + '</div>',
    'Guardar', () => api('p_mipyv_protocolo', { protocolo: $('mpProt').value.trim(), ids: Array.from(document.querySelectorAll('#ov [data-id]:checked')).map(x => x.dataset.id) }, 120000));
}
function mpResponder(x) {
  if (!x) return;
  mpModal('Solicitud · ' + x.tipo, '<p style="margin-top:0"><b>' + esc([x.que, x.cantidad].filter(Boolean).join(' · ') || x.tipo) + '</b><br><span class="mu peq">' + fechaTxt(String(x.fecha || '').slice(0, 10)) + ' · ' + esc(x.operario || '') + (x.establecimiento ? ' · ' + esc(x.establecimiento) : '') + '</span></p>' + (x.detalle ? '<p>' + esc(x.detalle) + '</p>' : '') +
    (x.fotos && x.fotos.length ? '<p class="peq">' + x.fotos.map(mpLink).join(' · ') + '</p>' : '') +
    '<label class="f">Estado<select class="c" id="mpEst">' + ['Pendiente', 'En gestión', 'Atendida', 'No corresponde'].map(e => '<option' + (e === (x.estado === 'Pendiente' ? 'En gestión' : x.estado) ? ' selected' : '') + '>' + e + '</option>').join('') + '</select></label>' +
    '<label class="f">Respuesta para los operarios (la ven en la app)<textarea class="c" id="mpResp" rows="3" placeholder="Ej.: pedido a Compras, llega el lunes">' + esc(x.respuesta || '') + '</textarea></label>', 'Guardar',
    () => api('p_mipyv_solicitud', { id: x.id, estado: $('mpEst').value, respuesta: $('mpResp').value }, 120000));
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
