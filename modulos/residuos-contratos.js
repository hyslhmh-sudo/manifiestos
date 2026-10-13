// Portal HyS · 1 · Residuos · Frecuencias de retiro y Contrato y costos (versión 14.23, 13/10/2026). Backend: ResiduosContratos.gs
// (p_res_frecuencias, p_res_costos). Los contratos se cargan en el libro general, hojas CONTRATOS, CONTRATO_GRUPOS y CONTRATO_ALCANCE.
let RFQ = null, RFQF = { ver: 'sitios', contrato: '', q: '', desde: '', hasta: '' }, RCO = null, RCOF = { contrato: '' };
const rcPesos = n => n == null ? '—' : '$ ' + Math.round(n).toLocaleString('es-AR');
const rcPrecio = n => n == null ? '—' : '$ ' + Number(n).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const rcNum = n => n == null ? '—' : (Math.round(Number(n) * 10) / 10).toLocaleString('es-AR');
const rcChipPct = p => p == null ? '<span class="chip gr mini">s/d</span>' : '<span class="chip ' + (p >= 90 ? 'ok' : p >= 70 ? 'wa' : 'er') + ' mini">' + p + ' %</span>';

// ------------------------------------------------------------------ Frecuencias de retiro
async function resFrec(fresco) {
  if (!RES) { const g = LS.get('res', null); if (g) { RES = g; refrescarRes(); } }
  const clave = 'resFrec_' + (RFQF.desde || '') + '_' + (RFQF.hasta || '');
  if (!RFQ || fresco || RFQ._clave !== clave) {
    const g = !fresco && LS.get(clave, null);
    if (g) { RFQ = g; api('p_res_frecuencias', { desde: RFQF.desde, hasta: RFQF.hasta }, 180000).then(r => { if (r && r.ok) { r._clave = clave; const cambio = r.huella !== RFQ.huella; RFQ = r; LS.set(clave, r); if (cambio && location.hash === '#resfrec' && $('ov').hidden) resFrec(); } }).catch(() => {}); }
    else { cargando('#resfrec', 'Calculando frecuencias de retiro…'); try { const r = await api('p_res_frecuencias', { desde: RFQF.desde, hasta: RFQF.hasta, fresco: !!fresco }, 180000); if (!r.ok) throw new Error(r.mensaje || 'No se pudo leer.'); r._clave = clave; RFQ = r; LS.set(clave, r); } catch (e) { return marco('#resfrec', '<div class="aviso error">' + esc(e.message) + '</div>'); } }
  }
  const T = RFQ, A = FILTRO.area, M = T.meses, anios = Array.from(new Set(M.map(m => m.slice(0, 4)))), q = sinTildesJs(RFQF.q);
  const ctrOps = Array.from(new Set(T.sitios.map(s => s.contrato ? s.contrato + '|' + s.grupo : '|'))).sort();
  const pasa = s => (!A || s.area === A) && (!RFQF.contrato || (RFQF.contrato === '|' ? !s.contrato : (s.contrato + '|' + s.grupo) === RFQF.contrato)) && (!q || sinTildesJs(s.nombre + ' ' + (s.sitio || '') + ' ' + s.cod).includes(q));
  const S = T.sitios.filter(pasa), E = T.establecimientos.filter(e => (!A || e.area === A) && (!q || sinTildesJs(e.nombre + ' ' + e.cod).includes(q)) && (!RFQF.contrato || S.some(s => s.cod === e.cod)));
  const mini = pm => { const mx = Math.max(1, ...M.map(m => pm[m] || 0)); return '<div style="display:flex;gap:2px;align-items:flex-end;height:24px">' + M.map(m => '<span title="' + RES_MES(m) + ': ' + (pm[m] || 0) + '" style="width:6px;height:' + Math.max(2, Math.round(22 * (pm[m] || 0) / mx)) + 'px;border-radius:2px;background:' + (pm[m] ? 'var(--az)' : 'var(--ln)') + '"></span>').join('') + '</div>'; };
  const bajo = S.filter(s => s.cumplimiento != null && s.cumplimiento < 80), sinFrec = S.filter(s => s.contrato && !s.esperadosMes), sinCtr = S.filter(s => !s.contrato);
  // Comparación entre contratos y grupos
  const comp = {}; S.forEach(s => { const k = s.contrato ? s.contrato + ' · grupo ' + s.grupo : 'Sin contrato cargado', c = comp[k] = comp[k] || { k: k, empresa: s.empresa, sitios: 0, est: {}, total: 0, prom: 0, nProm: 0, cump: [], int: [] };
    c.sitios++; c.est[s.cod] = 1; c.total += s.total; if (s.promedioMes != null) { c.prom += s.promedioMes; c.nProm++; } if (s.cumplimiento != null) c.cump.push(s.cumplimiento); if (s.intervaloProm != null) c.int.push(s.intervaloProm); });
  const prom = l => l.length ? Math.round(l.reduce((a, b) => a + b, 0) / l.length) : null;
  const kpi = (t, v, s, col) => '<div class="kpi2"><span>' + t + '</span><b' + (col ? ' style="color:' + col + '"' : '') + '>' + v + '</b><small>' + s + '</small></div>';
  const mesOps = sel => { const o = []; const d = new Date(); for (let i = 0; i < 37; i++) { const x = new Date(d.getFullYear(), d.getMonth() - i, 1), k = x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0'); o.push('<option value="' + k + '"' + (k === sel ? ' selected' : '') + '>' + RES_MES(k) + '</option>'); } return o.join(''); };
  const areas = Array.from(new Set(T.establecimientos.map(e => e.area).concat(T.sinDatos.map(e => e.area)))).filter(Boolean).sort();
  const cab = s => '<td><b>' + esc(s.nombre) + '</b><div class="mu peq">' + esc(s.cod) + '</div></td>';
  const porAnio = pa => anios.map(a => '<td>' + (pa[a] || '—') + '</td>').join('');
  marco('#resfrec', '<div class="cab"><div><span class="mu peq"><a class="link" href="#res">1 · Residuos</a></span><h1>Frecuencias de retiro</h1><span class="mu peq">Retiros (manifiestos cargados) por establecimiento y sitio de toda la provincia, contra la frecuencia que fija cada contrato. Período: ' + RES_MES(T.desde) + ' a ' + RES_MES(T.hasta) + ' (el mes en curso no entra en el promedio).</span></div>' +
    '<div class="filtros"><a class="link" href="' + esc(T.hojaContratos) + '" target="_blank" rel="noopener">Contratos (planilla) ↗</a><button class="btn sec" id="rfAct">Actualizar</button></div></div>' +
    '<div class="card" style="display:flex;flex-wrap:wrap;gap:10px;align-items:end">' +
      '<label class="f">Ver<select class="c" id="rfVer"><option value="sitios"' + (RFQF.ver === 'sitios' ? ' selected' : '') + '>Por sitio (CAPS, edificios)</option><option value="est"' + (RFQF.ver === 'est' ? ' selected' : '') + '>Por establecimiento</option><option value="comp"' + (RFQF.ver === 'comp' ? ' selected' : '') + '>Comparar contratos</option></select></label>' +
      '<label class="f">Área<select class="c" id="rfA"><option value="">Toda la provincia</option>' + areas.map(a => '<option' + (a === A ? ' selected' : '') + '>' + esc(a) + '</option>').join('') + '</select></label>' +
      '<label class="f">Contrato<select class="c" id="rfC"><option value="">Todos</option>' + ctrOps.map(k => '<option value="' + esc(k) + '"' + (k === RFQF.contrato ? ' selected' : '') + '>' + (k === '|' ? 'Sin contrato cargado' : esc(k.replace('|', ' · grupo '))) + '</option>').join('') + '</select></label>' +
      '<label class="f">Desde<select class="c" id="rfD">' + mesOps(T.desde) + '</select></label><label class="f">Hasta<select class="c" id="rfH">' + mesOps(T.hasta) + '</select></label>' +
      '<label class="f">Buscar<input class="c" id="rfQ" value="' + esc(RFQF.q) + '" placeholder="Establecimiento o sitio"></label></div>' +
    '<div class="tb5">' + kpi('Sitios con retiros', S.length, E.length + ' establecimiento(s)') + kpi('Retiros en el período', S.reduce((a, s) => a + s.total, 0), 'manifiestos cargados') +
      kpi('Por debajo del contrato', bajo.length, 'sitios con menos del 80 % de los retiros pactados', bajo.length ? 'var(--er)' : '') +
      kpi('Contrato sin frecuencia', sinFrec.length, 'sitios con contrato pero sin frecuencia escrita (s/d)', sinFrec.length ? 'var(--wa)' : '') + kpi('Sin contrato cargado', sinCtr.length, 'sitios que no figuran en ningún contrato', sinCtr.length ? 'var(--wa)' : '') +
      kpi('Frecuencia por deducción', S.filter(s => s.deduccion).length, 'sitios cuya frecuencia no está en el contrato: es un supuesto de HyS', S.some(s => s.deduccion) ? 'var(--wa)' : '') + '</div>' +
    (RFQF.ver === 'comp' ? '<section class="card tabla"><div style="padding:14px 18px;border-bottom:1px solid var(--ln)"><h2>Comparación entre contratos y grupos</h2></div><div style="overflow-x:auto"><table><thead><tr><th>Contrato · grupo</th><th>Empresa</th><th>Establecimientos</th><th>Sitios</th><th>Retiros</th><th>Promedio por sitio y mes</th><th>Días entre retiros (prom.)</th><th>Cumplimiento promedio</th></tr></thead><tbody>' +
        Object.keys(comp).sort().map(k => { const c = comp[k]; return '<tr><td><b>' + esc(c.k) + '</b></td><td>' + esc(c.empresa || '—') + '</td><td>' + Object.keys(c.est).length + '</td><td>' + c.sitios + '</td><td>' + c.total + '</td><td>' + (c.nProm ? rcNum(c.prom / c.nProm) : '—') + '</td><td>' + (c.int.length ? rcNum(c.int.reduce((a, b) => a + b, 0) / c.int.length) : '—') + '</td><td>' + rcChipPct(prom(c.cump)) + '</td></tr>'; }).join('') +
        '</tbody></table></div></section>'
      : RFQF.ver === 'est' ? '<section class="card tabla"><div style="overflow-x:auto"><table><thead><tr><th>Establecimiento</th><th>Contrato</th><th>Sitios</th><th>Por mes</th>' + anios.map(a => '<th>' + a + '</th>').join('') + '<th>Promedio / mes</th><th>Y1 (dm³)</th></tr></thead><tbody>' +
        (E.length ? E.map(e => '<tr class="cl" data-cod="' + esc(e.cod) + '">' + cab(e) + '<td class="peq">' + esc(e.contratos.join(', ') || 'Sin contrato cargado') + '</td><td>' + e.sitios + '</td><td>' + mini(e.porMes) + '</td>' + porAnio(e.porAnio) + '<td><b>' + rcNum(e.promedioMes) + '</b></td><td>' + rcNum(e.y1) + '</td></tr>').join('') : '<tr><td colspan="9" class="mu">Sin retiros con este filtro.</td></tr>') + '</tbody></table></div></section>'
      : '<section class="card tabla"><div style="overflow-x:auto"><table><thead><tr><th>Establecimiento</th><th>Sitio</th><th>Contrato y frecuencia</th><th>Por mes</th>' + anios.map(a => '<th>' + a + '</th>').join('') + '<th>Promedio / mes</th><th>Pactado / mes</th><th>Cumplimiento</th><th>Días entre retiros</th><th>Último</th></tr></thead><tbody>' +
        (S.length ? S.map(s => '<tr class="cl" data-cod="' + esc(s.cod) + '">' + cab(s) + '<td><b>' + esc(s.sitio) + '</b><div class="mu peq">' + esc(s.tipo) + '</div></td><td class="peq">' + (s.contrato ? esc(s.contrato + ' · grupo ' + s.grupo) + '<br>' : '') + esc(s.frecuencia) + (s.deduccion ? '<br><span class="chip wa mini" title="' + esc(s.nota) + '">Deducción, no por contrato</span>' : '') + '</td><td>' + mini(s.porMes) + '</td>' + porAnio(s.porAnio) +
          '<td><b>' + rcNum(s.promedioMes) + '</b><div class="mu peq">' + rcNum(s.porSemana) + ' por semana</div></td><td>' + (s.esperadosMes ? rcNum(s.esperadosMes) : '<span class="mu">s/d</span>') + '</td><td>' + rcChipPct(s.cumplimiento) + '</td>' +
          '<td>' + (s.intervaloProm != null ? rcNum(s.intervaloProm) + '<div class="mu peq">máx. ' + s.intervaloMax + '</div>' : '—') + '</td><td>' + fechaTxt(s.ultimo) + '</td></tr>').join('') : '<tr><td colspan="12" class="mu">Sin retiros con este filtro.</td></tr>') + '</tbody></table></div></section>') +
    (T.sinDatos.length ? '<details class="card"><summary><b>En un contrato vigente pero sin manifiestos en el período (' + T.sinDatos.filter(e => !A || e.area === A).length + ')</b></summary><p class="mu peq">Todavía no cargan sus manifiestos: no se puede comparar su frecuencia.</p><div style="display:flex;flex-wrap:wrap;gap:6px">' +
      T.sinDatos.filter(e => !A || e.area === A).map(e => '<span class="chip gr">' + esc(e.nombre) + ' · ' + esc(e.contrato) + ' g' + esc(e.grupo) + (e.deduccion ? ' · deducción' : '') + '</span>').join('') + '</div></details>' : '') +
    '<p class="mu peq">Promedio por mes: retiros de los meses completos desde el primer retiro cargado del sitio. Pactado: diaria (salvo domingos y feriados) = 26 por mes; 3 días por semana = 13; semanal = 4,3; quincenal = 2,2; mensual = 1. Cumplimiento: verde 90 % o más, amarillo 70 a 89 %, rojo menos de 70 %. Si los manifiestos se cargan con atraso, el mes en curso puede aparecer incompleto. La frecuencia de cada contrato se escribe en el libro general, hoja CONTRATO_ALCANCE. «Deducción, no por contrato»: la frecuencia no figura en el contrato (el Anexo I solo la fija dentro del ejido de Trelew) y se tomó por similitud (p. ej., HMH y HSST con la misma frecuencia que el HZT); el cumplimiento de esos sitios es orientativo hasta confirmarla.</p>');
  $('rfAct').onclick = () => resFrec(true);
  $('rfVer').onchange = e => { RFQF.ver = e.target.value; resFrec(); };
  $('rfA').onchange = e => { FILTRO.area = e.target.value; resFrec(); };
  $('rfC').onchange = e => { RFQF.contrato = e.target.value; resFrec(); };
  $('rfQ').onchange = e => { RFQF.q = e.target.value; resFrec(); };
  $('rfD').onchange = e => { RFQF.desde = e.target.value; resFrec(); };
  $('rfH').onchange = e => { RFQF.hasta = e.target.value; resFrec(); };
  document.querySelectorAll('#main tr.cl[data-cod]').forEach(tr => tr.onclick = () => location.hash = '#res/' + encodeURIComponent(tr.dataset.cod));
}
const sinTildesJs = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

// ------------------------------------------------------------------ Contrato y costos (por establecimiento)
// No se suman totales de la red: que un establecimiento no cargue manifiestos no significa que no genere residuos.
// Volumen facturable = dm³ de todas las corrientes del manifiesto (Y1 + Y3; Impeesa factura ambas), valorizado al precio de su grupo.
// En cada establecimiento y mes se marca si su volumen solo ya supera el cupo mensual del grupo. Detalle también en #res/COD.
async function rcoDatos(fresco) {
  const clave = 'resCostos_' + (RCOF.contrato || 'vigente');
  if (RCO && !fresco && RCO._clave === clave) return RCO;
  const g = !fresco && LS.get(clave, null);
  if (g) { RCO = g; api('p_res_costos', { contrato: RCOF.contrato }, 180000).then(r => { if (r && r.ok) { r._clave = clave; const cambio = JSON.stringify(r.establecimientos) !== JSON.stringify(RCO.establecimientos); RCO = r; LS.set(clave, r); if (cambio && $('ov').hidden) { if (location.hash === '#rescosto') resCostos(); else if (/^#res\//.test(location.hash)) resEst(decodeURIComponent(location.hash.split('/')[1])); } } }).catch(() => {}); return RCO; }
  const r = await api('p_res_costos', { contrato: RCOF.contrato }, 180000); if (!r.ok) throw new Error(r.mensaje || 'No se pudo leer el contrato.'); r._clave = clave; RCO = r; LS.set(clave, r); return r;
}
const rcoFila = (T, grupo, mes) => T.filas.find(x => x.grupo === grupo && x.mes === mes) || T.filas.filter(x => x.grupo === grupo).slice(-1)[0] || null;
const rcoPrecio = (T, grupo, mes) => { const f = rcoFila(T, grupo, mes); return f ? f.precio : null; };
const rcoCupo = (T, grupo, mes) => { const f = rcoFila(T, grupo, mes); return f ? f.cupo : null; };
const rcoTot = (e, m) => e.porMes[m] || 0;   // Y1 + Y3 (y otras corrientes) en dm³
const rcoPct = (v, cupo) => cupo ? Math.round(100 * v / cupo) : null;
const rcoChip = (v, cupo) => { const p = rcoPct(v, cupo); if (p === null || !v) return '<span class="mu">—</span>';
  return p > 100 ? '<span class="chip er">Excede · ' + p + ' %</span>' : '<span class="chip ' + (p >= 80 ? 'wa' : 'ok') + '">' + p + ' %</span>'; };
// Tarjeta de contrato y costo de un establecimiento (para la vista del hospital)
function rcoEstTabla(T, cod) {
  const g = T.grupos.find(x => x.miembros.some(m => m.cod === cod)); if (!g) return '<p class="mu peq" style="margin:0">Este establecimiento no figura en el contrato ' + esc(T.contrato.id) + ' (libro general, hoja CONTRATO_ALCANCE).</p>';
  const e = T.establecimientos.find(x => x.cod === cod), f0 = T.filas.filter(x => x.grupo === g.grupo).slice(-1)[0] || {};
  const cab = '<p class="peq" style="margin:0 0 8px">' + esc(T.contrato.empresa) + ' · ' + esc(T.contrato.id) + ' · grupo ' + esc(g.grupo) + ' (' + esc(g.servicio) + ') · ' + rcPrecio(f0.precio) + ' por dm³ · cupo del grupo ' + rcNum(f0.cupo) + ' dm³/mes, compartido con ' + (g.miembros.length - 1) + ' establecimiento(s)</p>';
  if (!e) return cab + '<p class="mu peq" style="margin:0">Sin manifiestos cargados desde ' + RES_MES(T.meses[0]) + '. No se puede calcular su volumen ni su costo; no significa que no genere residuos.</p>';
  const Y1 = e.porMesY1 || {}, Y3 = e.porMesY3 || {}, hoyM = T.hoy.slice(0, 7);
  let tot = 0, sobre = 0, cerrados = 0;
  const filas = T.meses.map(m => { const v = rcoTot(e, m), p = rcoPrecio(T, g.grupo, m), cupo = rcoCupo(T, g.grupo, m), val = v && p ? v * p : 0; tot += val;
    if (m !== hoyM && v) { cerrados++; if (cupo && v > cupo) sobre++; }
    const n = x => x ? rcNum(x) : '<span class="mu">—</span>';
    return '<tr' + (m === hoyM ? ' style="opacity:.6"' : '') + '><td><b>' + RES_MES(m) + '</b>' + (m === hoyM ? ' <span class="mu peq">en curso</span>' : '') + '</td><td>' + n(Y1[m]) + '</td><td>' + n(Y3[m]) + '</td><td>' + (v ? '<b>' + rcNum(v) + ' dm³</b>' : '<span class="mu">sin cargas</span>') + '</td><td>' + rcoChip(v, cupo) + '</td><td>' + rcPrecio(p) + '</td><td>' + (val ? '<b>' + rcPesos(val) + '</b>' : '—') + '</td></tr>'; }).join('');
  const res = cerrados ? '<p class="peq" style="margin:8px 0 0">' + (sobre ? '<span class="chip er">Excede el cupo</span> En ' + sobre + ' de ' + cerrados + ' mes(es) cerrados, este establecimiento solo superó el cupo mensual de todo el grupo (' + rcNum(f0.cupo) + ' dm³).' : '<span class="chip ok">Dentro del cupo</span> Ningún mes cerrado supera, por sí solo, el cupo mensual del grupo. El cupo es compartido: el grupo puede excederse igual si se suman los demás.') + '</p>' : '';
  return cab + '<div style="overflow-x:auto"><table><thead><tr><th>Mes</th><th>Y1 (dm³)</th><th>Y3 (dm³)</th><th>Total facturable</th><th>% del cupo del grupo</th><th>Precio por dm³</th><th>Valor al precio del contrato</th></tr></thead><tbody>' + filas +
    '<tr><td><b>Total</b></td><td>' + rcNum(e.y1) + '</td><td>' + rcNum(e.y3 || 0) + '</td><td><b>' + rcNum(e.tot != null ? e.tot : e.y1) + ' dm³</b></td><td></td><td></td><td><b>' + rcPesos(tot) + '</b></td></tr></tbody></table></div>' + res +
    '<p class="mu peq" style="margin:6px 0 0">Total facturable = Y1 + Y3 (Impeesa factura ambas corrientes por dm³). % del cupo: volumen de este establecimiento sobre el cupo mensual de todo el grupo.</p>';
}
async function resCostos(fresco) {
  let T; try { if (!RCO || fresco) cargando('#rescosto', 'Leyendo el contrato…'); T = await rcoDatos(fresco); } catch (e) { return marco('#rescosto', '<div class="aviso error">' + esc(e.message) + '</div>'); }
  const C = T.contrato, est = cod => T.establecimientos.find(x => x.cod === cod);
  const valor = (cod, gr) => { const e = est(cod); return e ? T.meses.reduce((a, m) => a + rcoTot(e, m) * (rcoPrecio(T, gr, m) || 0), 0) : null; };
  const hoyM = T.hoy.slice(0, 7), sobre = (e, gr) => T.meses.filter(m => m !== hoyM && rcoCupo(T, gr, m) && rcoTot(e, m) > rcoCupo(T, gr, m)).length, cerr = e => T.meses.filter(m => m !== hoyM && rcoTot(e, m)).length;
  const celda = (e, gr, m) => { const v = rcoTot(e, m), c = rcoCupo(T, gr, m); if (!v) return '<td><span class="mu">—</span></td>'; const x = c && v > c; return '<td' + (x ? ' style="color:var(--er,#b42318);font-weight:700" title="Supera el cupo mensual del grupo (' + rcNum(c) + ' dm³)"' : '') + '>' + rcNum(v) + (x ? ' ▲' : '') + '</td>'; };
  marco('#rescosto', '<div class="cab"><div><span class="mu peq"><a class="link" href="#res">1 · Residuos</a></span><h1>Contrato y costos</h1><span class="mu peq">Volumen facturable (Y1 + Y3, en dm³) de cada establecimiento desde el inicio del contrato, valorizado al precio por dm³ de su grupo. ▲ = ese mes el establecimiento solo supera el cupo de todo el grupo. Tocá un establecimiento para ver su detalle mes por mes.</span></div>' +
    '<div class="filtros"><label class="f">Contrato<select class="c" id="rcC">' + T.contratos.map(k => '<option value="' + esc(k.id) + '"' + (k.id === C.id ? ' selected' : '') + '>' + esc(k.empresa + ' · ' + k.id + ' (' + (k.estado || '') + ')') + '</option>').join('') + '</select></label>' +
    '<a class="link" href="' + esc(T.hojaContratos) + '" target="_blank" rel="noopener">Contratos (planilla) ↗</a><button class="btn sec" id="rcAct">Actualizar</button></div></div>' +
    '<section class="card"><h2>' + esc(C.empresa) + ' · ' + esc(C.id) + '</h2><p class="peq" style="margin:4px 0">' + esc(C.objeto) + '</p><p class="mu peq" style="margin:0">Expediente ' + esc(C.expediente || 's/d') + ' · ' + esc(C.resolucion || 's/d') + ' · vigencia ' + fechaTxt(C.desde) + ' a ' + (C.hasta ? fechaTxt(C.hasta) : 's/d') + (C.prorroga ? ' · ' + esc(C.prorroga) : '') + (C.archivo ? ' · <a class="link" href="' + esc(C.archivo) + '" target="_blank" rel="noopener">Contrato (PDF) ↗</a>' : '') + '</p>' +
      (C.observaciones ? '<p class="mu peq" style="margin:6px 0 0">' + esc(C.observaciones) + '</p>' : '') +
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(320px,100%),1fr));gap:10px;margin-top:10px">' + T.grupos.map(g => { const f = T.filas.filter(x => x.grupo === g.grupo).slice(-1)[0] || {};
        return '<div style="border:1px solid var(--ln);border-radius:10px;padding:10px 12px"><b>Grupo ' + esc(g.grupo) + ' · ' + esc(g.servicio) + '</b><div class="peq">' + rcPrecio(f.precio) + '/dm³ · excedente ' + rcPrecio(f.precioExc) + '/dm³ · cupo ' + rcNum(f.cupo) + ' dm³/mes para todo el grupo</div><div class="mu peq">' + g.miembros.length + ' establecimiento(s)</div></div>'; }).join('') + '</div></section>' +
    T.grupos.map(g => '<section class="card tabla"><div style="padding:14px 18px;border-bottom:1px solid var(--ln)"><h2>Grupo ' + esc(g.grupo) + '</h2></div><div style="overflow-x:auto"><table><thead><tr><th>Establecimiento</th>' + T.meses.map(m => '<th>' + RES_MES(m) + '</th>').join('') + '<th>Total (Y1 + Y3)</th><th>Meses sobre el cupo</th><th>Valor al precio</th></tr></thead><tbody>' +
      g.miembros.slice().sort((a, b) => (est(b.cod) ? 1 : 0) - (est(a.cod) ? 1 : 0) || a.nombre.localeCompare(b.nombre)).map(m => { const e = est(m.cod);
        return '<tr class="cl" data-cod="' + esc(m.cod) + '"><td><b>' + esc(m.nombre) + '</b></td>' + (e ? T.meses.map(x => celda(e, g.grupo, x)).join('') + '<td><b>' + rcNum(e.tot != null ? e.tot : e.y1) + ' dm³</b><div class="mu peq">Y1 ' + rcNum(e.y1) + ' · Y3 ' + rcNum(e.y3 || 0) + (e.enKg ? ' · ' + e.enKg + ' retiro(s) cargado(s) en kg, sin volumen' : '') + '</div></td><td>' + (cerr(e) ? (sobre(e, g.grupo) ? '<span class="chip er">Excede · ' + sobre(e, g.grupo) + ' de ' + cerr(e) + '</span>' : '<span class="chip ok">No excede</span>') : '<span class="mu">—</span>') + '</td><td>' + rcPesos(valor(m.cod, g.grupo)) + '</td>'
          : '<td colspan="' + (T.meses.length + 3) + '" class="mu peq">Sin manifiestos cargados en el sistema (no significa que no genere residuos)</td>') + '</tr>'; }).join('') + '</tbody></table></div></section>').join('') +
    '<p class="mu peq">Valor al precio del contrato: dm³ de Y1 + Y3 de los manifiestos cargados (Impeesa factura ambas corrientes) × precio por dm³ del grupo (cláusula TERCERA). «Meses sobre el cupo»: meses cerrados en que ese establecimiento solo superó el cupo mensual de todo el grupo. El cupo y el excedente (cláusula SÉPTIMA) son de todo el grupo y se facturan en conjunto: no se reparten por establecimiento, y no se pueden calcular mientras haya establecimientos que no cargan sus manifiestos. La factura se controla con la Planilla de Control de Residuos (Anexo I). Los precios y cupos se cambian en el libro general, hoja CONTRATO_GRUPOS.</p>');
  $('rcAct').onclick = () => resCostos(true);
  $('rcC').onchange = e => { RCOF.contrato = e.target.value; resCostos(); };
  document.querySelectorAll('#main tr.cl[data-cod]').forEach(tr => tr.onclick = () => location.hash = '#res/' + encodeURIComponent(tr.dataset.cod));
}
