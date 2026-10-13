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

// ------------------------------------------------------------------ Contrato y costos
async function resCostos(fresco) {
  const clave = 'resCostos_' + (RCOF.contrato || 'vigente');
  if (!RCO || fresco || RCO._clave !== clave) {
    const g = !fresco && LS.get(clave, null);
    if (g) { RCO = g; api('p_res_costos', { contrato: RCOF.contrato }, 180000).then(r => { if (r && r.ok) { r._clave = clave; const cambio = JSON.stringify(r.filas) !== JSON.stringify(RCO.filas); RCO = r; LS.set(clave, r); if (cambio && location.hash === '#rescosto' && $('ov').hidden) resCostos(); } }).catch(() => {}); }
    else { cargando('#rescosto', 'Calculando costos del contrato…'); try { const r = await api('p_res_costos', { contrato: RCOF.contrato }, 180000); if (!r.ok) throw new Error(r.mensaje || 'No se pudo leer.'); r._clave = clave; RCO = r; LS.set(clave, r); } catch (e) { return marco('#rescosto', '<div class="aviso error">' + esc(e.message) + '</div>'); } }
  }
  const T = RCO, C = T.contrato, F = T.filas, cerr = F.filter(f => !f.enCurso), sum = (l, k) => l.reduce((a, f) => a + (f[k] || 0), 0);
  const ultimo = cerr.length ? cerr.map(f => f.mes).sort().pop() : '';
  const kpi = (t, v, s, col) => '<div class="kpi2"><span>' + t + '</span><b' + (col ? ' style="color:' + col + '"' : '') + '>' + v + '</b><small>' + s + '</small></div>';
  const volCerr = sum(cerr, 'volumen'), cupoCerr = sum(cerr, 'cupo'), costoCerr = sum(cerr, 'costo');
  const cobertura = T.grupos.map(g => { const fl = F.filter(f => f.grupo === g.grupo); return fl.length ? Math.max(...fl.map(f => f.cargan)) + ' de ' + g.miembros.length : '0 de ' + g.miembros.length; });
  marco('#rescosto', '<div class="cab"><div><span class="mu peq"><a class="link" href="#res">1 · Residuos</a></span><h1>Contrato y costos</h1><span class="mu peq">Costo mensual estimado del contrato con lo que cargan los establecimientos, desde el inicio del contrato.</span></div>' +
    '<div class="filtros"><label class="f">Contrato<select class="c" id="rcC">' + T.contratos.map(k => '<option value="' + esc(k.id) + '"' + (k.id === C.id ? ' selected' : '') + '>' + esc(k.empresa + ' · ' + k.id + ' (' + (k.estado || '') + ')') + '</option>').join('') + '</select></label>' +
    '<a class="link" href="' + esc(T.hojaContratos) + '" target="_blank" rel="noopener">Contratos (planilla) ↗</a><button class="btn sec" id="rcAct">Actualizar</button></div></div>' +
    '<section class="card"><h2>' + esc(C.empresa) + ' · ' + esc(C.id) + '</h2><p class="peq" style="margin:4px 0">' + esc(C.objeto) + '</p><p class="mu peq" style="margin:0">Expediente ' + esc(C.expediente || 's/d') + ' · ' + esc(C.resolucion || 's/d') + ' · vigencia ' + fechaTxt(C.desde) + ' a ' + (C.hasta ? fechaTxt(C.hasta) : 's/d') + (C.prorroga ? ' · ' + esc(C.prorroga) : '') + (C.archivo ? ' · <a class="link" href="' + esc(C.archivo) + '" target="_blank" rel="noopener">Contrato (PDF) ↗</a>' : '') + '</p>' +
      (C.observaciones ? '<p class="mu peq" style="margin:6px 0 0">' + esc(C.observaciones) + '</p>' : '') +
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(320px,100%),1fr));gap:10px;margin-top:10px">' + T.grupos.map((g, i) => { const f = F.filter(x => x.grupo === g.grupo).slice(-1)[0] || {};
        return '<div style="border:1px solid var(--ln);border-radius:10px;padding:10px 12px"><b>Grupo ' + esc(g.grupo) + ' · ' + esc(g.servicio) + '</b><div class="peq">Cupo ' + rcNum(f.cupo) + ' dm³/mes · ' + rcPrecio(f.precio) + '/dm³ · excedente ' + rcPrecio(f.precioExc) + '/dm³</div><div class="mu peq">' + g.miembros.length + ' establecimiento(s); cargan manifiestos: ' + cobertura[i] + '</div></div>'; }).join('') + '</div></section>' +
    '<div class="tb5">' + kpi('Costo estimado', rcPesos(costoCerr), 'meses completos desde ' + RES_MES(T.meses[0]) + (ultimo ? ' a ' + RES_MES(ultimo) : '')) +
      kpi('Volumen registrado', rcNum(volCerr) + ' dm³', 'de ' + rcNum(cupoCerr) + ' dm³ de cupo (' + (cupoCerr ? Math.round(100 * volCerr / cupoCerr) : 0) + ' %)') +
      kpi('Cupo pagado sin uso', rcPesos(sum(cerr, 'sinUso')), 'volumen que no llega al cupo («saldo según contrato»)', sum(cerr, 'sinUso') ? 'var(--wa)' : '') +
      kpi('Costo por dm³ real', volCerr ? rcPesos(costoCerr / volCerr) : '—', 'costo estimado ÷ volumen registrado') + '</div>' +
    T.grupos.map(g => { const L = F.filter(f => f.grupo === g.grupo);
      return '<section class="card tabla"><div style="padding:14px 18px;border-bottom:1px solid var(--ln)"><h2>Grupo ' + esc(g.grupo) + ' · mes por mes</h2><span class="mu peq">' + esc(g.miembros.map(m => m.nombre).slice(0, 8).join(', ')) + (g.miembros.length > 8 ? ' y ' + (g.miembros.length - 8) + ' más' : '') + '</span></div><div style="overflow-x:auto"><table><thead><tr><th>Mes</th><th>Volumen Y1</th><th>Cupo</th><th>Uso del cupo</th><th>Excedente</th><th>Costo estimado</th><th>Cupo sin uso</th><th>$ por dm³ real</th><th>Cargan</th><th>Y3 (aparte)</th></tr></thead><tbody>' +
        L.map(f => '<tr' + (f.enCurso ? ' style="opacity:.6"' : '') + '><td><b>' + RES_MES(f.mes) + '</b>' + (f.enCurso ? '<div class="mu peq">en curso</div>' : '') + '</td><td>' + rcNum(f.volumen) + ' dm³' + (f.enKg ? '<div class="mu peq">' + f.enKg + ' retiro(s) cargado(s) en kg, sin volumen</div>' : '') + '</td><td>' + rcNum(f.cupo) + '</td><td>' + (f.usoCupo == null ? '—' : '<div style="width:90px;height:8px;background:var(--ln);border-radius:4px;overflow:hidden"><div style="height:100%;width:' + Math.min(100, f.usoCupo) + '%;background:' + (f.usoCupo > 100 ? '#C0392B' : 'var(--az)') + '"></div></div><span class="peq">' + rcNum(f.usoCupo) + ' %</span>') + '</td>' +
          '<td>' + (f.excedente ? rcNum(f.excedente) + ' dm³' : '—') + '</td><td><b>' + rcPesos(f.costo) + '</b></td><td>' + (f.sinUso ? rcPesos(f.sinUso) : '—') + '</td><td>' + (f.costoDm3Real ? rcPesos(f.costoDm3Real) : '—') + '</td><td>' + f.cargan + ' de ' + f.miembros + '</td><td>' + (f.y3 ? rcNum(f.y3) + ' dm³' : '—') + '</td></tr>').join('') +
        '</tbody></table></div></section>'; }).join('') +
    '<section class="card tabla"><div style="padding:14px 18px;border-bottom:1px solid var(--ln)"><h2>Por establecimiento</h2><span class="mu peq">Volumen Y1 registrado desde el inicio del contrato y su valor al precio por dm³ del grupo (sin el saldo del cupo).</span></div><div style="overflow-x:auto"><table><thead><tr><th>Establecimiento</th><th>Grupo</th>' + T.meses.map(m => '<th>' + RES_MES(m) + '</th>').join('') + '<th>Total Y1</th><th>Valor al precio</th></tr></thead><tbody>' +
      (T.establecimientos.length ? T.establecimientos.map(e => '<tr><td><b>' + esc(e.nombre) + '</b></td><td>' + esc(e.grupo) + '</td>' + T.meses.map(m => '<td>' + (e.porMes[m] ? rcNum(e.porMes[m]) : '—') + '</td>').join('') + '<td><b>' + rcNum(e.y1) + '</b></td><td>' + rcPesos(e.valorPrecio) + '</td></tr>').join('') : '<tr><td colspan="9" class="mu">Ningún establecimiento del contrato cargó manifiestos desde su inicio.</td></tr>') + '</tbody></table></div></section>' +
    '<p class="mu peq">Cómo se calcula (cláusulas TERCERA y SÉPTIMA del contrato): por cada grupo y mes, cupo × precio por dm³ —si el volumen no llega al cupo se factura igual («saldo según contrato»)— más el excedente × el precio del excedente. Volumen: dm³ de Y1 de los manifiestos cargados en el sistema; incluye solo a los establecimientos que cargan, y la factura se controla con la Planilla de Control de Residuos (Anexo I). Y3 (medicamentos) se muestra aparte porque el contrato es de residuos patogénicos. Los precios y cupos se cambian en el libro general, hoja CONTRATO_GRUPOS (con su fecha DESDE si hay actualización de precio).</p>');
  $('rcAct').onclick = () => resCostos(true);
  $('rcC').onchange = e => { RCOF.contrato = e.target.value; resCostos(); };
}
