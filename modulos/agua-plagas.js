// Portal HyS · 2 · Agua y 3 · Plagas
// Se carga desde portal.html (<script src>). Para el portal de respaldo de Google, herramientas/armar_respaldo.py lo junta en un solo archivo.
// ------------------------------------------------------------------ Módulo 2 · Agua y módulo 3 · Plagas (toda la red; la misma lectura, dos pantallas)
async function agua(modo) {
  if (modo === 'plagas') return plagas();
  modo = 'agua'; const R = '#' + modo;
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
// ------------------------------------------------------------------ 3 · Plagas (26/10/2026: tablero con gráficos, fechas y horarios claros)
// Lee el registro MIPyV (Modulo5.gs › p_mipyv): lo cargan los operarios desde su app; acá se ve, se revisa y se cierran casos.
function plagas() {
  marco('#plagas', '<div class="cab"><div><span class="mu peq">3 · Plagas</span><h1>Plagas en la red Trelew</h1><span class="mu peq">Lo que cargan Javier y Paulo en la app MIPyV: visitas, casos, saneamiento y pedidos. Fechas en hora de Argentina.</span></div>' +
    '<div class="filtros"><button class="btn sec" id="mpAct">Actualizar</button><a class="btn sec" id="mpLib" href="#" target="_blank" rel="noopener" hidden>Libro MIPyV ↗</a></div></div>' +
    '<div id="mipyvBox"><section class="card"><div class="mu">Leyendo el registro MIPyV…</div></section></div>' +
    '<style>#mipyvBox .filtros select{max-width:100%}@media (max-width:760px){.mpT thead{display:none}.mpT,.mpT tbody,.mpT tr,.mpT td{display:block;width:100%}.mpT tr{border-top:1px solid var(--ln);padding:10px 0}.mpT td{border:0!important;padding:2px 0!important}.mpT td:empty{display:none}.mpT td[data-l]::before{content:attr(data-l) ": ";color:var(--mu);font-weight:600}#mipyvBox .filtros,#mipyvBox .filtros label.f{width:100%}#mipyvBox .filtros select{width:100%}}</style>');
  $('mpAct').onclick = () => mipyv(true);
  mipyv();
}
let MIPYV = null, MPF = { lugar: '', plaga: '', sinRev: false };
const MP_DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
// Fecha legible: acepta 2026-10-21, 2026-10-21T14:05 (hora local) o 2026-10-21T17:05:00.000Z (hora universal → Argentina)
function mpF(s, conHora) {
  const t = String(s || '').trim(); if (!t) return '—';
  let d;
  if (/Z$/.test(t)) d = new Date(t);
  else { const m = t.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/); if (!m) return esc(t); d = new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0)); if (!m[4]) conHora = false; }
  if (isNaN(d)) return esc(t);
  const dd = String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
  return MP_DIAS[d.getDay()] + ' ' + dd + (conHora ? ' · ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') + ' h' : '');
}
// «8:00 a 14:15» → «08:00 a 14:15 · 6,25 h»
function mpHorario(h) {
  const m = String(h || '').match(/(\d{1,2})[:.](\d{2}).*?(\d{1,2})[:.](\d{2})/); if (!m) return '';
  const a = +m[1] * 60 + +m[2], b = +m[3] * 60 + +m[4], hs = (b - a) / 60, p = n => String(n).padStart(2, '0');
  return p(m[1]) + ':' + m[2] + ' a ' + p(m[3]) + ':' + m[4] + (hs > 0 ? ' · ' + String(Math.round(hs * 100) / 100).replace('.', ',') + ' h' : '');
}
const mpRes = r => /^resuelto/i.test(r || '') ? '<span class="chip ok mini">Resuelto</span>' : /otra visita/i.test(r || '') ? '<span class="chip wa mini">Pide otra visita</span>' : r ? '<span class="chip gr mini">' + esc(r) + '</span>' : '';
const mpRev = r => /^revisad/i.test(String(r || '')) ? '<span class="chip ok mini" title="' + esc(r) + '">Revisada</span>' : '<span class="chip er mini">Sin revisar</span>';
// Barras verticales por semana (lunes a domingo), apiladas por resultado
function mpSemanas(visitas) {
  const lunes = d => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };
  const hoy = lunes(new Date()), N = 12, sem = [];
  for (let i = N - 1; i >= 0; i--) { const d = new Date(hoy); d.setDate(d.getDate() - 7 * i); sem.push({ d: d, r: 0, o: 0, x: 0 }); }
  visitas.forEach(v => { const m = String(v.fecha || '').match(/^(\d{4})-(\d{2})-(\d{2})/); if (!m) return; const l = lunes(new Date(+m[1], +m[2] - 1, +m[3])).getTime(), s = sem.find(z => z.d.getTime() === l); if (!s) return;
    if (/^resuelto/i.test(v.resultado || '')) s.r++; else if (/otra visita/i.test(v.resultado || '')) s.o++; else s.x++; });
  const W = 460, H = 210, x0 = 26, b = 172, max = Math.max(4, ...sem.map(s => s.r + s.o + s.x)), k = 150 / max, paso = (W - x0 - 8) / N, bw = Math.min(30, paso - 12);
  let g = ''; [0, .5, 1].forEach(f => { const v = Math.round(max * f), y = b - v * k; g += '<line x1="' + x0 + '" y1="' + y + '" x2="' + W + '" y2="' + y + '" stroke="#D6DEE2"/><text x="' + (x0 - 6) + '" y="' + (y + 4) + '" font-size="11" fill="#5B6B73" text-anchor="end">' + v + '</text>'; });
  sem.forEach((s, i) => { const x = x0 + 8 + i * paso, t = s.r + s.o + s.x, et = String(s.d.getDate()).padStart(2, '0') + '/' + String(s.d.getMonth() + 1).padStart(2, '0');
    let y = b; const rect = (n, c) => { if (!n) return ''; y -= n * k; return '<rect x="' + x + '" y="' + y + '" width="' + bw + '" height="' + n * k + '" fill="' + c + '"/>'; };
    g += '<g><title>Semana del ' + et + ': ' + t + ' visita(s) · ' + s.r + ' resueltas · ' + s.o + ' piden otra visita' + (s.x ? ' · ' + s.x + ' otras' : '') + '</title>' + rect(s.r, '#5894A7') + rect(s.o, '#0D313F') + rect(s.x, '#B9C7CD') + '</g>' +
      (t ? '<text x="' + (x + bw / 2) + '" y="' + (y - 5) + '" font-size="11" font-weight="700" fill="#33424A" text-anchor="middle">' + t + '</text>' : '') +
      '<text x="' + (x + bw / 2) + '" y="' + (b + 16) + '" font-size="10.5" fill="#5B6B73" text-anchor="middle">' + et + '</text>'; });
  return '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" role="img" aria-label="Visitas por semana">' + g + '</svg>';
}
const mpTop = (arr, n) => { const c = {}; arr.forEach(x => { if (x) c[x] = (c[x] || 0) + 1; }); return Object.keys(c).map(k => [k, c[k]]).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'es')).slice(0, n); };
async function mipyv(fresco) {
  const box = $('mipyvBox'); if (!box) return;
  if (!MIPYV || fresco) { if (fresco) box.insertAdjacentHTML('afterbegin', '<div class="aviso" id="mpLeyendo" style="margin-bottom:12px">Actualizando…</div>');
    try { MIPYV = await api('p_mipyv', { fresco: !!fresco }, 120000); } catch (e) { box.innerHTML = '<section class="card"><div class="aviso error">No se pudo leer el registro MIPyV.</div></section>'; return; } }
  const R = MIPYV; if (!R.ok) { box.innerHTML = '<section class="card"><div class="aviso error">' + esc(R.mensaje || 'Error') + '</div></section>'; return; }
  const lib = $('mpLib'); if (lib && R.libro) { lib.href = R.libro.replace(/#.*$/, '') + '#gid=900001'; lib.hidden = false; }
  const C = Array.isArray(R.casos) ? R.casos.slice().sort((a, b) => a.dias - b.dias) : null, S = R.solicitudes || [], V = R.visitas || [];
  const lugarDe = o => o.lugar || o.establecimiento || (o.cod ? o.cod + (o.sitio ? ' · ' + o.sitio : '') : '');
  const vencidos = C ? C.filter(c => c.dias < 0).length : R.vencidos.length, porVencer = C ? C.filter(c => c.dias >= 0 && c.urgente).length : 0;
  const pend = S.filter(x => x.estado === 'Pendiente').length, sinRev = V.filter(v => !/^revisad/i.test(String(v.revisado))).length;
  const kp = (href, n, t, sub, alerta) => '<a class="kpi2" href="' + href + '"' + (alerta && n ? ' style="background:var(--erbg)"' : '') + '><span>' + t + '</span><b' + (alerta && n ? ' style="color:var(--er)"' : '') + '>' + n + '</b><small>' + sub + '</small></a>';
  const kpis = '<div class="tb5" style="margin-bottom:16px">' +
    kp('#mpCasos', vencidos, 'Casos vencidos', vencidos ? 'pasó la fecha de la 2.ª visita' : 'ninguno vencido', true) +
    kp('#mpCasos', porVencer, 'Casos por vencer', 'vencen en 3 días o menos', false) +
    kp('#mpCasos', C ? C.length : R.abiertas.length, 'Casos abiertos', 'piden otra visita', false) +
    kp('#mpSol', pend, 'Pedidos sin responder', 'biocidas, EPP, herramientas', true) +
    kp('#mpVis', sinRev, 'Visitas sin revisar', 'de los últimos 90 días', false) +
    kp('#mpSan', R.saneamiento.length, 'Saneamiento en curso', 'trabajos sin cerrar', false) + '</div>';
  const graf = (t, sub, cuerpo) => '<section class="card"><h2 style="margin:0 0 2px;font-size:16px">' + t + '</h2><div class="mu peq" style="margin-bottom:10px">' + sub + '</div>' + cuerpo + '</section>';
  const pl = mpTop(V.map(v => v.plaga && !/no corresponde/i.test(v.plaga) ? v.plaga : ''), 8), lu = mpTop(V.map(v => v.lugar), 8);
  const graficos = '<div class="tb3" style="margin-bottom:16px">' +
    graf('Visitas por semana', 'Últimas 12 semanas (cada barra empieza el lunes)', V.length ? mpSemanas(V) + leyenda([['Resueltas', '#5894A7'], ['Piden otra visita', '#0D313F'], ['Otras', '#B9C7CD']]) : '<div class="mu">Sin visitas en los últimos 90 días.</div>') +
    graf('Plagas atendidas', 'Visitas de los últimos 90 días', pl.length ? grHoriz(pl.map(x => [x[0].length > 24 ? x[0].slice(0, 23) + '…' : x[0], x[1], '#0D313F']), pl[0][1]) : '<div class="mu">Sin datos.</div>') +
    graf('Lugares con más visitas', 'Últimos 90 días', lu.length ? grHoriz(lu.map(x => [x[0].length > 24 ? x[0].slice(0, 23) + '…' : x[0], x[1], '#5894A7']), lu[0][1]) : '<div class="mu">Sin datos.</div>') + '</div>';
  const aviso = (R.sinLugar.length ? '<div class="aviso" style="margin-bottom:12px">Lugares de MIPyV sin cruzar con el sistema (completar codigo_sistema en la hoja establecimientos del libro MIPyV): ' + R.sinLugar.map(esc).join(', ') + '.</div>' : '') +
    (R.apiError ? '<div class="aviso" style="margin-bottom:12px">' + esc(R.apiError) + ' Se muestran los datos de las hojas del libro.</div>' : '');
  // Casos abiertos: tabla con semáforo
  const casos = C ? '<section class="card" id="mpCasos" style="margin-bottom:16px"><h2 style="margin:0 0 2px;font-size:16px">Casos abiertos (' + C.length + ')</h2><div class="mu peq" style="margin-bottom:8px">Un caso es una intervención cuya última visita pidió otra visita. Desde 3 días antes de vencer, la app les pide a los operarios que indiquen el cierre.</div>' +
    (C.length ? '<div style="overflow-x:auto"><table class="sinTab mpT" style="width:100%;border-collapse:collapse"><thead><tr><th>Vence</th><th>Lugar · plaga</th><th>Desde</th><th>Última visita</th><th>Visitas</th><th>Protocolo</th><th></th></tr></thead><tbody>' +
      C.map((c, i) => '<tr><td>' + mpChip(c) + '</td><td><b>' + esc(lugarDe(c)) + '</b><div class="peq">' + esc(c.tipo_plaga || '') + '</div>' + (c.resumen ? '<div class="mu peq">' + esc(String(c.resumen).slice(0, 160)) + '</div>' : '') + '</td><td class="peq" data-l="Desde">' + mpF(c.fecha_primera) + '</td><td class="peq" data-l="Última visita">' + mpF(c.fecha_ultima) + '<div class="mu">' + esc(c.operario || '') + '</div></td><td data-l="Visitas">' + (c.visitas || []).length + '</td><td class="peq" data-l="Protocolo">' + (/^PENDIENTE/.test(c.protocolo) ? '<span style="color:var(--er)">Sin n.º</span>' : esc(c.protocolo)) + '</td>' +
        '<td><span style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end"><button class="btn sec" data-mpp="' + i + '">N.º de protocolo</button><button class="btn pri" data-mpc="' + i + '">Cerrar caso</button></span></td></tr>').join('') + '</tbody></table></div>' : '<div class="mu">No hay casos abiertos.</div>') + '</section>'
    : '<section class="card" id="mpCasos" style="margin-bottom:16px"><h2 style="margin:0 0 6px;font-size:16px">Intervenciones abiertas (' + R.abiertas.length + ')</h2>' + (R.abiertas.length ? R.abiertas.map(a => '<div class="at"><span><b>' + esc(lugarDe(a)) + ' · ' + esc(a.plaga) + '</b><small>Protocolo ' + esc(a.protocolo) + ' · desde ' + mpF(a.desde) + ' · ' + esc(a.operario) + '</small></span></div>').join('') : '<div class="mu">Ninguna.</div>') +
      (R.vencidos.length ? '<h3 style="margin:12px 0 6px;font-size:14px">Seguimientos vencidos</h3>' + R.vencidos.map(v => '<div class="at"><span><b>' + esc(v.lugar) + ' · ' + esc(v.plaga) + '</b><small>Protocolo ' + esc(v.protocolo) + ' · última visita ' + mpF(v.fecha) + ' · venció ' + mpF(v.vencia) + ' (' + esc(v.dias) + ' días) · ' + esc(v.operario) + '</small></span></div>').join('') : '') + '</section>';
  // Visitas: filtros + tabla
  const lugares = Array.from(new Set(V.map(v => v.lugar).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'es')), plagasL = Array.from(new Set(V.map(v => v.plaga).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'es'));
  const opt = (arr, sel) => arr.map(x => '<option' + (x === sel ? ' selected' : '') + '>' + esc(x) + '</option>').join('');
  const visitas = '<section class="card" id="mpVis" style="margin-bottom:16px"><div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:flex-end;margin-bottom:8px"><div><h2 style="margin:0 0 2px;font-size:16px">Visitas de los últimos 90 días</h2><div class="mu peq">La más nueva arriba. Tocá una para ver el detalle y las fotos, y marcarla como revisada.</div></div>' +
    '<div class="filtros"><label class="f">Lugar<select class="c" id="mpFL"><option value="">Todos</option>' + opt(lugares, MPF.lugar) + '</select></label><label class="f">Plaga<select class="c" id="mpFP"><option value="">Todas</option>' + opt(plagasL, MPF.plaga) + '</select></label><label style="display:flex;gap:6px;align-items:center;font-size:14px;padding-bottom:8px"><input type="checkbox" id="mpFR"' + (MPF.sinRev ? ' checked' : '') + '> Solo sin revisar</label></div></div><div id="mpTabla"></div></section>';
  const san = R.saneamiento.length ? '<section class="card" id="mpSan" style="margin-bottom:16px"><h2 style="margin:0 0 6px;font-size:16px">Saneamiento en curso (' + R.saneamiento.length + ')</h2>' + R.saneamiento.map(t => '<div class="at"><span><b>' + esc(lugarDe(t)) + '</b><small>Desde ' + mpF(t.desde) + ' · ' + esc(t.operario) + '</small></span></div>').join('') + '</section>' : '<div id="mpSan"></div>';
  box.innerHTML = aviso + kpis + graficos + casos + (C ? '<section class="card" id="mpSol" style="margin-bottom:16px">' + mpSolHtml(S).replace('margin:14px 0 6px', 'margin:0 0 6px') + mpCierresHtml(R.cierres || []) + '</section>' : '') + visitas + san +
    '<div class="mu peq">Datos al ' + esc(R.actualizado) + '. Las horas de cada operario por día y por mes están en el libro MIPyV › HORAS (para leer) y en su Tablero.</div>';
  const pintar = () => {
    const F = V.filter(v => (!MPF.lugar || v.lugar === MPF.lugar) && (!MPF.plaga || v.plaga === MPF.plaga) && (!MPF.sinRev || !/^revisad/i.test(String(v.revisado))));
    $('mpTabla').innerHTML = F.length ? '<div style="overflow-x:auto"><table class="sinTab mpT" style="width:100%;border-collapse:collapse"><thead><tr><th>Fecha y horario</th><th>Lugar</th><th>Qué se hizo</th><th>Operarios</th><th>Resultado</th><th>HyS</th></tr></thead><tbody>' +
      F.map(v => '<tr class="cl" data-v="' + V.indexOf(v) + '"><td style="white-space:nowrap"><b>' + mpF(v.fecha) + '</b>' + (v.horario ? '<div class="mu peq">' + esc(mpHorario(v.horario) || v.horario) + '</div>' : '<div class="mu peq">sin horario</div>') + (v.protocolo ? '<div class="mu peq">Prot. ' + esc(v.protocolo) + '</div>' : '') + '</td>' +
        '<td><b>' + esc(v.lugar || '') + '</b>' + (v.cod ? '<div class="mu peq">' + esc(v.cod) + '</div>' : '') + '</td><td>' + esc(v.plaga || '—') + '<div class="mu peq">' + esc(String(v.sector || v.motivo || '').slice(0, 110)) + '</div><div class="mu peq">' + esc(v.producto || '') + '</div></td>' +
        '<td class="peq">' + esc(v.operario || '') + (v.acompanante ? '<div class="mu">con ' + esc(v.acompanante) + '</div>' : '') + '</td><td>' + mpRes(v.resultado) + (v.segunda ? '<div class="mu peq">2.ª: ' + mpF(v.segunda) + '</div>' : '') + '</td><td>' + mpRev(v.revisado) + '</td></tr>').join('') + '</tbody></table></div>'
      : '<div class="mu">' + (V.length ? 'Ninguna visita con esos filtros.' : 'Sin visitas en los últimos 90 días.') + '</div>';
    document.querySelectorAll('#mpTabla tr[data-v]').forEach(tr => tr.onclick = () => mipyvVer(V[Number(tr.dataset.v)]));
  };
  pintar();
  $('mpFL').onchange = e => { MPF.lugar = e.target.value; pintar(); };
  $('mpFP').onchange = e => { MPF.plaga = e.target.value; pintar(); };
  $('mpFR').onchange = e => { MPF.sinRev = e.target.checked; pintar(); };
  box.querySelectorAll('[data-mpc]').forEach(b => b.onclick = () => mpCerrar(C[Number(b.dataset.mpc)]));
  box.querySelectorAll('[data-mpp]').forEach(b => b.onclick = () => mpProtocolo(C[Number(b.dataset.mpp)], V));
  box.querySelectorAll('[data-mps]').forEach(b => b.onclick = () => mpResponder(S.find(x => x.id === b.dataset.mps)));
}
// ---------- Casos, solicitudes y cierres de MIPyV (25/10/2026): los mismos casos que ven Javier y Paulo en la app
const mpChip = c => c.dias < 0 ? '<span class="chip er mini">venció hace ' + (-c.dias) + ' día(s)</span>' : c.dias === 0 ? '<span class="chip er mini">vence hoy</span>' : c.urgente ? '<span class="chip wa mini">vence en ' + c.dias + ' día(s)</span>' : '<span class="chip ok mini">vence ' + mpF(c.vence) + '</span>';
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
    '<small style="display:block">' + mpF(x.fecha, true) + ' · ' + esc(x.operario || '') + (x.establecimiento ? ' · ' + esc(x.establecimiento) : '') + '</small>' + (x.detalle ? '<small style="display:block">' + (x.tipo === 'Herramientas' ? '<b>Para qué:</b> ' : '') + esc(x.detalle) + '</small>' : '') +
    (x.fotos && x.fotos.length ? '<small style="display:block">' + x.fotos.map(mpLink).join(' · ') + '</small>' : '') + (x.respuesta ? '<small class="mu" style="display:block">Nota de gestión: ' + esc(x.respuesta) + '</small>' : '') + '</span><button class="btn sec" style="flex:0 0 auto" data-mps="' + esc(x.id) + '">Responder</button></div>';
  return '<h3 style="margin:14px 0 6px;font-size:14px">Solicitudes de los operarios' + (pend.length ? ' (' + pend.length + ' pendiente' + (pend.length > 1 ? 's' : '') + ')' : '') + '</h3>' +
    (S.length ? pend.map(fila).join('') + (resto.length ? '<details style="margin-top:4px"><summary class="mu peq">Ver las ya respondidas (' + resto.length + ')</summary>' + resto.map(fila).join('') + '</details>' : '') : '<div class="mu">Todavía no mandaron solicitudes desde la app.</div>');
}
function mpCierresHtml(K) {
  if (!K.length) return '';
  return '<details style="margin-top:12px"><summary style="font-weight:700;font-size:14px;cursor:pointer">Cierres de casos de los últimos 60 días (' + K.length + ' · ' + K.filter(c => c.resultado === 'No resuelto').length + ' no resueltos)</summary>' +
    K.map(c => '<div class="at"><span><b>' + esc(c.establecimiento || '') + ' · ' + esc(c.tipo_plaga || '') + '</b> <span class="chip ' + (c.resultado === 'Resuelto' ? 'ok' : 'er') + ' mini">' + esc(c.resultado) + '</span>' +
      '<small style="display:block">' + mpF(c.fecha, true) + ' · ' + esc(c.operario || '') + (c.motivo ? ' · ' + esc(c.motivo) : '') + (/^PENDIENTE/.test(c.protocolo) ? '' : ' · protocolo ' + esc(c.protocolo)) + '</small>' + (c.detalle ? '<small style="display:block">' + esc(c.detalle) + '</small>' : '') +
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
  mpModal('Cerrar caso · ' + c.establecimiento + ' · ' + (c.tipo_plaga || ''), '<p class="mu peq" style="margin-top:0">' + (/^PENDIENTE/.test(c.protocolo) ? 'Sin n.º de protocolo' : 'Protocolo ' + esc(c.protocolo)) + ' · última visita ' + mpF(c.fecha_ultima) + ' · ' + esc(c.operario || '') + '. Queda registrado en el libro MIPyV (hoja cierres_casos) a tu nombre; si después se carga otra visita del caso, se vuelve a abrir.</p>' +
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
    '<div style="max-height:46vh;overflow:auto;border:1px solid var(--line,#D1D1D1);border-radius:10px;padding:6px 10px">' + del.map(v => '<label style="display:flex;gap:8px;align-items:flex-start;padding:5px 0;border-bottom:1px solid #EEE"><input type="checkbox" data-id="' + esc(v.id) + '"' + (ya.indexOf(v.id) >= 0 ? ' checked' : '') + '><span><b>' + mpF(v.fecha) + ' · ' + esc(v.plaga || '—') + '</b> <span class="mu peq">' + esc(v.resultado || '') + (v.protocolo ? ' · ' + esc(v.protocolo) : '') + '</span><br><span class="mu peq">' + esc(String(v.obs || v.sector || '').slice(0, 140)) + '</span></span></label>').join('') + '</div>',
    'Guardar', () => api('p_mipyv_protocolo', { protocolo: $('mpProt').value.trim(), ids: Array.from(document.querySelectorAll('#ov [data-id]:checked')).map(x => x.dataset.id) }, 120000));
}
function mpResponder(x) {
  if (!x) return;
  mpModal('Solicitud · ' + x.tipo, '<p style="margin-top:0"><b>' + esc([x.que, x.cantidad].filter(Boolean).join(' · ') || x.tipo) + '</b><br><span class="mu peq">' + mpF(x.fecha, true) + ' · ' + esc(x.operario || '') + (x.establecimiento ? ' · ' + esc(x.establecimiento) : '') + '</span></p>' + (x.detalle ? '<p>' + esc(x.detalle) + '</p>' : '') +
    (x.fotos && x.fotos.length ? '<p class="peq">' + x.fotos.map(mpLink).join(' · ') + '</p>' : '') +
    '<label class="f">Estado<select class="c" id="mpEst">' + ['Pendiente', 'En gestión', 'Atendida', 'No corresponde'].map(e => '<option' + (e === (x.estado === 'Pendiente' ? 'En gestión' : x.estado) ? ' selected' : '') + '>' + e + '</option>').join('') + '</select></label>' +
    '<label class="f">Nota de gestión (solo la ve HyS; los operarios no la ven)<textarea class="c" id="mpResp" rows="3" placeholder="Ej.: pedido a Compras, llega el lunes">' + esc(x.respuesta || '') + '</textarea></label>', 'Guardar',
    () => api('p_mipyv_solicitud', { id: x.id, estado: $('mpEst').value, respuesta: $('mpResp').value }, 120000));
}
function mipyvVer(v) {
  const dd = (t, x) => x ? '<dt>' + t + '</dt><dd>' + x + '</dd>' : '';
  $('ov').innerHTML = '<div class="modal" role="dialog" aria-modal="true" aria-label="Visita MIPyV"><h2>Visita del ' + mpF(v.fecha) + ' · ' + esc(v.lugar) + '</h2><dl class="dl">' +
    dd('Protocolo', esc(v.protocolo)) + dd('Lugar', esc(v.lugar) + (v.sector ? ' · ' + esc(v.sector) : '')) + dd('Operarios', esc(v.operario) + (v.acompanante ? ' y ' + esc(v.acompanante) : '') + (v.horario ? ' · ' + esc(mpHorario(v.horario) || v.horario) : '')) +
    dd('Qué se hizo', esc(v.motivo)) + dd('Plaga', esc(v.plaga)) + dd('Producto · dosis', esc(v.producto) + (v.dosis ? ' · ' + esc(v.dosis) : '')) + dd('EPP', esc(v.epp)) + dd('Resultado', esc(v.resultado) + (v.segunda ? ' · 2.ª intervención ' + mpF(v.segunda) : '')) +
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
