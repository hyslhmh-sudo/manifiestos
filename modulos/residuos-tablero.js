// Portal HyS · 1 · Residuos · Tablero general (versión 14.22, 13/10/2026). Lee p_res_tablero (ResiduosTablero.gs): manifiestos y certificados del
// libro general, en el momento (guardado 10 minutos). Además actualiza en la matriz (RES) el último retiro de cada establecimiento.
let REST = null, RESF = { verTodos: false };
const RES_MES = m => { const x = /^(\d{4})-(\d{2})/.exec(m || ''); return x ? ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'][+x[2] - 1] + ' ' + x[1].slice(2) : (m || ''); };
const resNum = n => (Math.round((Number(n) || 0) * 10) / 10).toLocaleString('es-AR');
// Pone en RES (matriz provincial) el último retiro, los retiros Y1 del mes y los días sin retiro que trae el tablero de residuos
function resActualizarRes(T) {
  if (!RES || !T || !T.ok) return false; let cambio = false; const mes = T.hoy.slice(0, 7);
  T.establecimientos.forEach(e => { const f = RES.filas.find(x => x.cod === e.cod); if (!f) return;
    if (f.ultimoRetiro !== e.ultimo || f.diasSinRetiro !== e.dias) { f.ultimoRetiro = e.ultimo; f.diasSinRetiro = e.dias; cambio = true; }
    const rm = e.retiros[mes] || 0; if (f.retirosMes !== rm) { f.retirosMes = rm; cambio = true; } });
  if (cambio) LS.set('res', RES); return cambio;
}
async function resDatos(fresco) {
  if (!RES) { const g = LS.get('res', null); if (g) { RES = g; refrescarRes(); } }
  if (!REST) REST = LS.get('resTab', null);
  if (!REST || fresco) { if (!REST) cargando('#res', 'Leyendo manifiestos y certificados…'); else toast('Actualizando…');
    try { const r = await api('p_res_tablero', { fresco: !!fresco }, 180000); if (!r.ok) throw new Error(r.mensaje || 'No se pudo leer.'); REST = r; LS.set('resTab', r); resActualizarRes(r); }
    catch (e) { if (!REST) { marco('#res', '<div class="aviso error">' + esc(e.message || 'No se pudo leer el tablero de residuos.') + '</div>'); return false; } }
  } else if (!resDatos.pidio) {   // datos guardados en el equipo: se muestran ya y se actualizan por detrás
    resDatos.pidio = true; api('p_res_tablero', {}, 180000).then(r => { if (r && r.ok) { REST = r; LS.set('resTab', r); resActualizarRes(r); if (location.hash.split('/')[0] === '#res' && $('ov').hidden) resTablero(); } }).catch(() => {});
  }
  return true;
}
async function resTablero(fresco) {
  if (!(await resDatos(fresco))) return;
  const T = REST, A = FILTRO.area, hoy = T.hoy, mesAct = hoy.slice(0, 7), M = T.meses;
  const E = T.establecimientos.filter(e => !A || e.area === A), act = E.filter(e => e.activo), sinC = (T.sinCarga || []).filter(e => !A || e.area === A).concat(E.filter(e => !e.activo));
  const areas = Array.from(new Set(T.establecimientos.concat(T.sinCarga || []).map(e => e.area))).filter(Boolean).sort();
  const sum = (l, f) => l.reduce((a, e) => a + f(e), 0);
  const serie = M.map(m => ({ m: m, r: sum(act, e => e.retiros[m] || 0), y1: sum(act, e => e.y1[m] || 0), y3: sum(act, e => e.y3[m] || 0) }));
  const maxR = Math.max(1, ...serie.map(s => s.r));
  const diasChip = d => d == null ? '<span class="chip gr">Sin retiros</span>' : '<span class="chip ' + (d > 30 ? 'er' : d > 10 ? 'wa' : 'ok') + '">' + d + ' día' + (d === 1 ? '' : 's') + '</span>';
  const mini = e => '<div style="display:flex;gap:2px;align-items:flex-end;height:26px" aria-label="Retiros por mes">' + M.map(m => { const v = e.retiros[m] || 0, mx = Math.max(1, ...M.map(x => e.retiros[x] || 0));
    return '<span title="' + RES_MES(m) + ': ' + v + ' retiro(s)' + (e.certs[m] ? ' · certificado ' + esc(e.certs[m]) : v && m < mesAct ? ' · sin certificado' : '') + '" style="width:7px;height:' + Math.max(2, Math.round(24 * v / mx)) + 'px;border-radius:2px;background:' + (!v ? 'var(--ln)' : e.certs[m] || m >= mesAct ? 'var(--az)' : '#C0392B') + '"></span>'; }).join('') + '</div>';
  // Requiere atención
  const at = [];
  act.forEach(e => { const h = '#res/' + encodeURIComponent(e.cod);
    if (e.dias > 30) at.push(['er', e.dias + ' días sin retiro cargado', e.nombre, h]); else if (e.dias > 10) at.push(['wa', e.dias + ' días sin retiro cargado', e.nombre, h]);
    const viejos = e.sinCert.filter(s => s.nivel === 'er'); if (viejos.length) at.push(['er', viejos.length + ' mes(es) con retiros sin certificado de tratamiento', e.nombre + ' · ' + viejos.map(s => RES_MES(s.mes)).join(', '), h]);
    e.sinCert.filter(s => s.nivel === 'wa').forEach(s => at.push(['wa', 'Falta el certificado de ' + RES_MES(s.mes), e.nombre, h]));
    e.fotos.forEach(f => at.push([f.vencida ? 'er' : 'wa', f.n + ' manifiesto(s) sin foto de ' + RES_MES(f.mes), e.nombre + ' · plazo ' + fechaTxt(f.limite), h]));
    const atr = e.sitios.filter(s => s.atrasado); if (atr.length) at.push(['gr', atr.length + ' sitio(s) sin manifiesto según la frecuencia pactada', e.nombre + ' · ' + atr.slice(0, 4).map(s => s.sitio + ' (' + s.dias + ' d)').join(', '), h]); });
  const orden = { er: 0, wa: 1, gr: 2 }; at.sort((a, b) => orden[a[0]] - orden[b[0]]);
  const kpi = (t, v, s, col, h) => '<' + (h ? 'a href="' + h + '"' : 'div') + ' class="kpi2"><span>' + t + '</span><b' + (col ? ' style="color:' + col + '"' : '') + '>' + v + '</b><small>' + s + '</small></' + (h ? 'a' : 'div') + '>';
  const K = { mes: sum(act, e => e.retiros[mesAct] || 0), ant: sum(act, e => e.retiros[M[10]] || 0), m10: act.filter(e => e.dias > 10).length, m30: act.filter(e => e.dias > 30).length,
    sc: sum(act, e => e.sinCert.filter(s => s.nivel === 'er').length), scp: act.filter(e => e.sinCert.some(s => s.nivel === 'wa')).length, fo: sum(act, e => sum(e.fotos, f => f.n)), conDiag: E.concat(T.sinCarga || []).filter(e => (!A || e.area === A) && e.diag).length };
  const total = (T.sinCarga || []).filter(e => !A || e.area === A).length + E.length;
  marco('#res', '<div class="cab"><div><span class="mu peq">1 · Residuos</span><h1>Tablero de residuos peligrosos</h1><span class="mu peq">Manifiestos y certificados de tratamiento cargados por los establecimientos (libro general). Datos al ' + new Date(T.actualizado).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' }) + '.</span></div>' +
    '<div class="filtros"><label class="f">Área<select class="c" id="rsA"><option value="">Toda la provincia</option>' + areas.map(a => '<option' + (a === A ? ' selected' : '') + '>' + esc(a) + '</option>').join('') + '</select></label>' +
    '<a class="link" href="' + esc(T.libro) + '" target="_blank" rel="noopener">Libro general ↗</a><button class="btn sec" id="rsAct">Actualizar</button></div></div>' +
    '<div class="tb5">' + kpi('Con cargas', act.length + ' de ' + total, 'establecimientos con manifiestos en los últimos 12 meses') +
      kpi('Retiros del mes', K.mes, RES_MES(M[10]) + ': ' + K.ant + ' retiro(s)') +
      kpi('Más de 10 días sin retiro', K.m10, K.m30 ? K.m30 + ' con más de 30 días' : 'ninguno con más de 30 días', K.m30 ? 'var(--er)' : K.m10 ? 'var(--wa)' : '') +
      kpi('Certificados faltantes', K.sc, (K.scp ? K.scp + ' establecimiento(s) esperan el del mes pasado · ' : '') + 'meses con retiros sin certificado', K.sc ? 'var(--er)' : '') +
      kpi('Manifiestos sin foto', K.fo, 'de los que cargan con la aplicación (plazo: día 10 del mes siguiente)', K.fo ? 'var(--wa)' : '') +
      kpi('Con diagnóstico', K.conDiag + ' de ' + total, 'diagnóstico de residuos', '', '#diag') + '</div>' +
    '<div class="tb2"><section class="card" style="min-width:0"><h2>Retiros por mes</h2><span class="mu peq">Cantidad de manifiestos (retiros) de los establecimientos con cargas' + (A ? ' del área' : '') + '. Debajo, lo retirado de Y1 y Y3.</span>' +
      '<div style="display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:6px;align-items:end;height:150px;margin-top:14px">' + serie.map(s => '<div style="display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%" title="' + RES_MES(s.m) + ': ' + s.r + ' retiro(s) · Y1 ' + resNum(s.y1) + ' · Y3 ' + resNum(s.y3) + '"><b class="peq">' + (s.r || '') + '</b><span style="width:100%;max-width:34px;height:' + Math.max(2, Math.round(110 * s.r / maxR)) + 'px;background:' + (s.m === mesAct ? 'var(--az2,#5A8DA6)' : 'var(--az)') + ';border-radius:4px 4px 0 0"></span></div>').join('') + '</div>' +
      '<div style="display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:6px;margin-top:4px">' + serie.map(s => '<span class="mu" style="font-size:10.5px;text-align:center">' + RES_MES(s.m).replace(' ', '<br>') + '</span>').join('') + '</div>' +
      [['Y1', 'y1'], ['Y3', 'y3']].map(([t, k]) => '<div style="display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:6px;margin-top:6px;border-top:1px solid var(--ln);padding-top:4px">' + serie.map((s, i) => '<span class="peq" style="text-align:center;font-size:10.5px' + (i ? '' : ';position:relative') + '" title="' + t + ' ' + RES_MES(s.m) + '">' + (i ? '' : '<b class="mu" style="position:absolute;left:-2px;top:-14px;font-size:10px">' + t + '</b>') + (s[k] ? resNum(s[k]) : '—') + '</span>').join('') + '</div>').join('') + '</section>' +
    '<section class="card" style="display:flex;flex-direction:column;gap:6px;min-width:0"><h2>Requiere atención</h2>' + (at.length ? at.slice(0, 16).map(v => '<a class="at" href="' + v[3] + '"><span class="tag ' + v[0] + '">' + (v[0] === 'er' ? 'Urgente' : v[0] === 'wa' ? 'Pronto' : 'Revisar') + '</span><span><b>' + esc(v[1]) + '</b><small>' + esc(v[2]) + '</small></span></a>').join('') + (at.length > 16 ? '<span class="mu peq">Y ' + (at.length - 16) + ' más en la tabla.</span>' : '') : '<p class="mu" style="margin:0">Nada pendiente con lo cargado.</p>') + '</section></div>' +
    '<section class="card tabla"><div style="padding:14px 18px;border-bottom:1px solid var(--ln)"><h2>Por establecimiento</h2><span class="mu peq">Barras: retiros de cada mes (rojo = mes con retiros y sin certificado). Tocá un establecimiento para ver sus sitios y meses.</span></div><div style="overflow-x:auto"><table><thead><tr><th>Establecimiento</th><th>Último retiro</th><th>Últimos 12 meses</th><th>Certificados</th><th>Fotos</th><th>Sitios</th><th>Diagnóstico</th></tr></thead><tbody>' +
      (act.length ? act.map(e => '<tr class="cl" data-cod="' + esc(e.cod) + '"><td><b>' + esc(e.nombre) + '</b><div class="mu peq">' + esc(e.cod) + ' · ' + esc(String(e.area || '').replace('Área Programática ', '')) + '</div></td><td>' + (e.ultimo ? fechaTxt(e.ultimo) + '<br>' : '') + diasChip(e.dias) + '</td><td>' + mini(e) + '</td>' +
        '<td>' + (e.sinCert.length ? e.sinCert.map(s => '<span class="chip ' + s.nivel + ' mini">' + RES_MES(s.mes) + '</span>').join(' ') : '<span class="chip ok mini">Al día</span>') + '</td>' +
        '<td>' + (e.fotos.length ? '<span class="chip ' + (e.fotos.some(f => f.vencida) ? 'er' : 'wa') + ' mini">' + sum(e.fotos, f => f.n) + ' sin foto</span>' : '<span class="mu">—</span>') + '</td>' +
        '<td class="peq">' + e.sitios.length + (e.sitios.some(s => s.atrasado) ? ' <span class="chip gr mini">' + e.sitios.filter(s => s.atrasado).length + ' atrasado(s)</span>' : '') + '</td><td>' + chipDiag(e.diag) + '</td></tr>').join('')
        : '<tr><td colspan="7" class="mu">Ningún establecimiento' + (A ? ' del área' : '') + ' cargó manifiestos en los últimos 12 meses.</td></tr>') + '</tbody></table></div></section>' +
    (sinC.length ? '<details class="card"><summary><b>Sin manifiestos en los últimos 12 meses (' + sinC.length + ')</b></summary><p class="mu peq">Todavía no cargan (o no están habilitados). Tocá uno para abrir su ficha.</p><div style="display:flex;flex-wrap:wrap;gap:6px">' +
      sinC.sort((a, b) => String(a.nombre).localeCompare(String(b.nombre))).map(e => '<a class="btn sec" style="min-height:30px;padding:4px 10px" href="#ficha/' + encodeURIComponent(e.cod) + '">' + esc(e.nombre) + '</a>').join('') + '</div></details>' : '') +
    '<p class="mu peq">Días sin retiro: desde el último manifiesto cargado (verde hasta 10 días, amarillo de 11 a 30, rojo más de 30). Certificado: uno por mes con retiros, del operador (Ley 24.051 y Dto. 831/93); el del mes pasado figura «pendiente» hasta fin de este mes. Frecuencia pactada de cada sitio: BASE COMÚN › SITIOS. Los datos se guardan 10 minutos; «Actualizar» los trae en el momento.</p>');
  $('rsA').onchange = e => { FILTRO.area = e.target.value; resTablero(); };
  $('rsAct').onclick = () => resTablero(true);
  document.querySelectorAll('tr.cl[data-cod]').forEach(tr => tr.onclick = () => location.hash = '#res/' + encodeURIComponent(tr.dataset.cod));
}
// Detalle de un establecimiento: meses (retiros, cantidades, certificado, fotos) y sitios (último manifiesto y frecuencia pactada)
async function resEst(cod) {
  if (!(await resDatos(false))) return;
  const T = REST, e = T.establecimientos.find(x => x.cod === cod), mesAct = T.hoy.slice(0, 7);
  if (!e) return marco('#res', '<div class="cab"><div><span class="mu peq"><a class="link" href="#res">1 · Residuos › Tablero</a></span><h1>' + esc(cod) + '</h1></div></div><div class="card"><p class="mu" style="margin:0">Sin manifiestos cargados en los últimos 12 meses. <a class="link" href="#ficha/' + encodeURIComponent(cod) + '">Abrir la ficha</a></p></div>');
  const fotoDe = m => e.fotos.find(f => f.mes === m);
  marco('#res', '<div class="cab"><div><span class="mu peq"><a class="link" href="#res">1 · Residuos › Tablero</a> › ' + esc(e.cod) + '</span><h1>' + esc(e.nombre) + '</h1><span class="mu peq">Último retiro cargado: ' + (e.ultimo ? fechaTxt(e.ultimo) + ' (' + e.dias + ' días)' : 'ninguno') + '</span></div>' +
    '<div class="filtros"><a class="btn sec" href="#ficha/' + encodeURIComponent(e.cod) + '">Ficha</a><a class="btn sec" href="#diag/' + encodeURIComponent(e.cod) + '">Diagnóstico</a><a class="btn sec" href="#aud">Auditorías</a></div></div>' +
    '<div class="tb2"><section class="card tabla" style="min-width:0"><div style="padding:14px 18px;border-bottom:1px solid var(--ln)"><h2>Mes por mes</h2></div><div style="overflow-x:auto"><table><thead><tr><th>Mes</th><th>Retiros</th><th>Y1</th><th>Y3</th><th>Certificado</th><th>Fotos</th></tr></thead><tbody>' +
      T.meses.slice().reverse().map(m => { const r = e.retiros[m] || 0, f = fotoDe(m), c = e.certs[m], sc = e.sinCert.find(s => s.mes === m);
        return '<tr><td><b>' + RES_MES(m) + '</b></td><td>' + (r || '—') + '</td><td>' + (e.y1[m] ? resNum(e.y1[m]) + ' ' + esc(e.unidadY1) : '—') + '</td><td>' + (e.y3[m] ? resNum(e.y3[m]) + ' ' + esc(e.unidadY3) : '—') + '</td>' +
          '<td>' + (c ? '<span class="chip ok mini">N.º ' + esc(c) + '</span>' : sc ? '<span class="chip ' + sc.nivel + ' mini">' + (sc.nivel === 'wa' ? 'Pendiente' : 'Falta') + '</span>' : m >= mesAct ? '<span class="mu peq">mes en curso</span>' : '<span class="mu">—</span>') + '</td>' +
          '<td>' + (f ? '<span class="chip ' + (f.vencida ? 'er' : 'wa') + ' mini">' + f.n + ' sin foto</span>' : '<span class="mu">—</span>') + '</td></tr>'; }).join('') + '</tbody></table></div></section>' +
    '<section class="card tabla" style="min-width:0"><div style="padding:14px 18px;border-bottom:1px solid var(--ln)"><h2>Sitios</h2><span class="mu peq">Último manifiesto de cada sitio y frecuencia de retiro pactada (BASE COMÚN › SITIOS).</span></div><div style="overflow-x:auto"><table><thead><tr><th>Sitio</th><th>Último</th><th>Frecuencia</th></tr></thead><tbody>' +
      e.sitios.map(s => '<tr><td><b>' + esc(s.sitio) + '</b></td><td>' + fechaTxt(s.ultimo) + '<br><span class="chip ' + (s.atrasado ? (s.dias > 30 ? 'er' : 'wa') : 'ok') + ' mini">' + s.dias + ' días</span></td><td class="peq">' + esc(s.frecuencia) + '<div class="mu">esperable: hasta ' + s.limite + ' días</div></td></tr>').join('') + '</tbody></table></div></section></div>');
}
