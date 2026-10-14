// Portal HyS · 1 · Residuos · Informe de frecuencia de retiro (versión 14.26, 13/10/2026). Backend: ResiduosInforme.gs
// (p_res_inf_opciones, p_res_informe). Belén elige período (mensual, semestral, anual u otro), destinatario y establecimientos/sitios;
// ve una vista previa y genera el informe en Google Docs + PDF (borrador versión 0, numerado en REGISTRO_DOCUMENTOS).
let RINFO = null, RINFP = null;
const RINFF = Object.assign({ tipo: 'Mensual', mes: '', sem: '', anio: '', desde: '', hasta: '', dest: '', cargo: '', detalle: true, sel: [] }, LS.get('rinfF', {}));
const rinfGuardar = () => LS.set('rinfF', RINFF);
const rinfPad = n => String(n).padStart(2, '0');
function rinfPeriodo() {
  const F = RINFF, ult = (y, m) => new Date(y, m, 0).getDate();
  if (F.tipo === 'Mensual' && F.mes) { const y = +F.mes.slice(0, 4), m = +F.mes.slice(5, 7); return { desde: F.mes + '-01', hasta: F.mes + '-' + rinfPad(ult(y, m)) }; }
  if (F.tipo === 'Semestral' && F.sem) { const y = F.sem.slice(0, 4); return F.sem.slice(5) === '1' ? { desde: y + '-01-01', hasta: y + '-06-30' } : { desde: y + '-07-01', hasta: y + '-12-31' }; }
  if (F.tipo === 'Anual' && F.anio) return { desde: F.anio + '-01-01', hasta: F.anio + '-12-31' };
  if (F.tipo === 'Período' && F.desde && F.hasta) return { desde: F.desde, hasta: F.hasta };
  return null;
}
async function resInforme(fresco) {
  if (!RINFO || fresco) {
    const g = !fresco && LS.get('rinfOp', null);
    if (g) { RINFO = g; api('p_res_inf_opciones', {}, 120000).then(r => { if (r && r.ok) { const cambio = JSON.stringify(r.establecimientos) !== JSON.stringify(RINFO.establecimientos); RINFO = r; LS.set('rinfOp', r); if (cambio && location.hash === '#resinf' && $('ov').hidden) resInforme(); } }).catch(() => {}); }
    else { cargando('#resinf', 'Leyendo establecimientos y sitios…'); try { const r = await api('p_res_inf_opciones', {}, 120000); if (!r.ok) throw new Error(r.mensaje || 'No se pudo leer.'); RINFO = r; LS.set('rinfOp', r); } catch (e) { return marco('#resinf', '<div class="aviso error">' + esc(e.message) + '</div>'); } }
  }
  const O = RINFO, F = RINFF, sel = new Set(F.sel), d = new Date();
  if (!F.mes) { const p = new Date(d.getFullYear(), d.getMonth() - 1, 1); F.mes = p.getFullYear() + '-' + rinfPad(p.getMonth() + 1); }
  if (!F.sem) F.sem = d.getMonth() >= 6 ? d.getFullYear() + '-1' : (d.getFullYear() - 1) + '-2';
  if (!F.anio) F.anio = String(d.getMonth() === 11 ? d.getFullYear() : d.getFullYear() - 1);
  const meses = []; for (let i = 0; i < 37; i++) { const x = new Date(d.getFullYear(), d.getMonth() - i, 1); meses.push(x.getFullYear() + '-' + rinfPad(x.getMonth() + 1)); }
  const anios = []; for (let y = d.getFullYear(); y >= d.getFullYear() - 3; y--) anios.push(String(y));
  const op = (v, t, s) => '<option value="' + esc(v) + '"' + (v === s ? ' selected' : '') + '>' + esc(t) + '</option>';
  const clave = (e, s) => e.cod + '|' + s.sitio, esCaps = s => /caps|centro de salud/i.test(s.tipo + ' ' + s.sitio);
  const conD = O.establecimientos.filter(e => e.conDatos), sinD = O.establecimientos.filter(e => !e.conDatos);
  const estHTML = e => { const n = e.sitios.filter(s => sel.has(clave(e, s))).length;
    return '<details class="rinfE"' + (n ? ' open' : '') + '><summary style="cursor:pointer;padding:8px 0;display:flex;gap:8px;align-items:center;flex-wrap:wrap"><b>' + esc(e.nombre) + '</b><span class="mu peq">' + esc(e.cod) + ' · ' + e.sitios.length + ' sitio(s)' + (n ? ' · <b style="color:var(--az)">' + n + ' elegido(s)</b>' : '') + '</span>' +
      '<span style="margin-left:auto;display:flex;gap:4px;flex-wrap:wrap">' + [['todos', 'Todos'], ['caps', 'Solo CAPS'], ['sincaps', 'Sin CAPS'], ['ninguno', 'Ninguno']].map(b => '<button class="btn sec peq rinfB" data-cod="' + esc(e.cod) + '" data-q="' + b[0] + '" style="padding:3px 8px">' + b[1] + '</button>').join('') + '</span></summary>' +
      '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:4px 14px;padding:0 0 10px 6px">' + e.sitios.map(s => '<label style="display:flex;gap:6px;align-items:flex-start;font-size:13.5px"><input type="checkbox" class="rinfS" value="' + esc(clave(e, s)) + '"' + (sel.has(clave(e, s)) ? ' checked' : '') + '><span>' + esc(s.sitio) + '<span class="mu peq"> · ' + esc(s.tipo || 's/d') + (s.ultimo ? ' · último ' + fechaTxt(s.ultimo) : ' · sin manifiestos') + '</span></span></label>').join('') + '</div></details>'; };
  const per = rinfPeriodo();
  marco('#resinf', '<div class="cab"><div><span class="mu peq"><a class="link" href="#res">1 · Residuos</a></span><h1>Informe de retiros</h1><span class="mu peq">Informe de frecuencia de retiro para Jefatura de Área Externa / CAPS, STyC, Direcciones o la Secretaría de Salud: elegí el período, el destinatario y los establecimientos o sitios. Muestra, por sitio, la frecuencia pactada y la real, con las fechas exactas de cada retiro y los números de manifiesto.</span></div>' +
    '<div class="filtros"><button class="btn sec" id="riAct">Actualizar sitios</button></div></div>' +
    '<section class="card"><h2>1. Período</h2><div style="display:flex;flex-wrap:wrap;gap:10px;align-items:end">' +
      '<label class="f">Tipo<select class="c" id="riT">' + ['Mensual', 'Semestral', 'Anual', 'Período'].map(t => op(t, t === 'Período' ? 'Otro período' : t, F.tipo)).join('') + '</select></label>' +
      (F.tipo === 'Mensual' ? '<label class="f">Mes<select class="c" id="riM">' + meses.map(m => op(m, RES_MES(m), F.mes)).join('') + '</select></label>' : '') +
      (F.tipo === 'Semestral' ? '<label class="f">Semestre<select class="c" id="riS">' + anios.flatMap(y => [y + '-2', y + '-1']).map(s => op(s, (s.slice(5) === '1' ? '1.º semestre ' : '2.º semestre ') + s.slice(0, 4), F.sem)).join('') + '</select></label>' : '') +
      (F.tipo === 'Anual' ? '<label class="f">Año<select class="c" id="riA">' + anios.map(y => op(y, y, F.anio)).join('') + '</select></label>' : '') +
      (F.tipo === 'Período' ? '<label class="f">Desde<input class="c" type="date" id="riD" value="' + esc(F.desde) + '"></label><label class="f">Hasta<input class="c" type="date" id="riH" value="' + esc(F.hasta) + '"></label>' : '') +
      '<span class="mu peq" id="riPer">' + (per ? 'Del ' + fechaTxt(per.desde) + ' al ' + fechaTxt(per.hasta) + (per.hasta > O.hoy ? ' (los datos llegan hasta hoy)' : '') : 'Elegí las fechas') + '</span></div></section>' +
    '<section class="card"><h2>2. Destinatario</h2><div style="display:flex;flex-wrap:wrap;gap:10px;align-items:end">' +
      '<label class="f">Destinatario<input class="c" id="riDe" list="riDeL" value="' + esc(F.dest) + '" placeholder="Elegí o escribí" style="min-width:260px"><datalist id="riDeL">' + O.destinos.map(x => '<option value="' + esc(x) + '">').join('') + '</datalist></label>' +
      '<label class="f">Nombre y cargo (opcional)<input class="c" id="riCa" value="' + esc(F.cargo) + '" placeholder="Ej.: Sr. Fernando Funes, Jefe de Área Externa" style="min-width:300px"></label></div></section>' +
    '<section class="card"><h2>3. Establecimientos y sitios</h2><div style="display:flex;flex-wrap:wrap;gap:6px;margin:4px 0 10px">' +
      '<button class="btn sec rinfG" data-g="tw">Red Trelew completa (HZT + HMH con todos sus sitios)</button><button class="btn sec rinfG" data-g="twcaps">Todos los CAPS de la red Trelew</button>' +
      '<button class="btn sec rinfG" data-g="caps">Todos los CAPS (todos los establecimientos)</button><button class="btn sec rinfG" data-g="nada">Limpiar</button>' +
      '<span class="mu peq" style="align-self:center">' + sel.size + ' sitio(s) elegido(s)</span></div>' +
      conD.map(estHTML).join('') +
      (sinD.length ? '<details style="margin-top:8px"><summary class="mu" style="cursor:pointer">Otros establecimientos con sitios cargados pero sin manifiestos (' + sinD.length + ')</summary>' + sinD.map(estHTML).join('') + '</details>' : '') + '</section>' +
    '<section class="card"><h2>4. Generar</h2><label style="display:flex;gap:8px;align-items:center;margin-bottom:10px"><input type="checkbox" id="riDet"' + (F.detalle ? ' checked' : '') + '> Incluir el anexo con el detalle de cada retiro (fecha, día, N.º de manifiesto, volumen y días desde el anterior)</label>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" id="riVer">Vista previa</button><button class="btn sec" id="riGen">Generar informe (Google Docs + PDF)</button></div>' +
      '<p class="mu peq" style="margin:8px 0 0">El informe sale como borrador (versión 0), con número en el registro de documentos, en la carpeta «Informes» del establecimiento (o «Informes de la red» si elegís más de uno). Con HZT/HMH usa la paleta azul y el logo HZT/HMH; con otros establecimientos, los colores de la Secretaría de Salud.</p>' +
      '<div id="riRes">' + rinfUltimo() + '</div></section><div id="riPrev"></div>');
  const set = (k, v) => { RINFF[k] = v; rinfGuardar(); };
  $('riAct').onclick = () => resInforme(true);
  $('riT').onchange = e => { set('tipo', e.target.value); resInforme(); };
  [['riM', 'mes'], ['riS', 'sem'], ['riA', 'anio']].forEach(([id, k]) => { if ($(id)) $(id).onchange = e => { set(k, e.target.value); resInforme(); }; });
  // Fechas libres: se guardan mientras se escriben, sin volver a dibujar la pantalla (si no, el año queda en el primer dígito)
  const rotulo = () => { const p = rinfPeriodo(), ok = p && /^\d{4}-\d{2}-\d{2}$/.test(p.desde) && /^\d{4}-\d{2}-\d{2}$/.test(p.hasta) && p.desde.slice(0, 4) > '1999' && p.hasta.slice(0, 4) > '1999';
    $('riPer').textContent = !ok ? 'Completá las dos fechas (día, mes y año)' : p.desde > p.hasta ? '«Desde» es posterior a «Hasta»' : 'Del ' + fechaTxt(p.desde) + ' al ' + fechaTxt(p.hasta) + (p.hasta > O.hoy ? ' (los datos llegan hasta hoy)' : ''); };
  [['riD', 'desde'], ['riH', 'hasta']].forEach(([id, k]) => { if ($(id)) $(id).oninput = $(id).onchange = e => { RINFF[k] = e.target.value; rinfGuardar(); rotulo(); }; });
  if ($('riD')) rotulo();
  $('riDe').onchange = e => set('dest', e.target.value.trim()); $('riCa').onchange = e => set('cargo', e.target.value.trim()); $('riDet').onchange = e => set('detalle', e.target.checked);
  const marcar = (lista, on) => { const s = new Set(RINFF.sel); lista.forEach(k => on ? s.add(k) : s.delete(k)); set('sel', Array.from(s)); resInforme(); };
  document.querySelectorAll('.rinfS').forEach(c => c.onchange = () => marcar([c.value], c.checked));
  document.querySelectorAll('.rinfB').forEach(b => b.onclick = ev => { ev.preventDefault(); ev.stopPropagation(); const e = O.establecimientos.find(x => x.cod === b.dataset.cod), q = b.dataset.q, todos = e.sitios.map(s => clave(e, s));
    const s = new Set(RINFF.sel); todos.forEach(k => s.delete(k)); e.sitios.forEach(x => { if (q === 'todos' || (q === 'caps' && esCaps(x)) || (q === 'sincaps' && !esCaps(x))) s.add(clave(e, x)); }); set('sel', Array.from(s)); resInforme(); });
  document.querySelectorAll('.rinfG').forEach(b => b.onclick = () => { const g = b.dataset.g, s = new Set(g === 'nada' ? [] : RINFF.sel);
    O.establecimientos.forEach(e => e.sitios.forEach(x => { const tw = ['HZT', 'HMH'].includes(e.cod); if ((g === 'tw' && tw) || (g === 'twcaps' && tw && esCaps(x)) || (g === 'caps' && esCaps(x))) s.add(clave(e, x)); }));
    set('sel', Array.from(s)); resInforme(); });
  const pedir = async generar => {
    const p = rinfPeriodo(); if (!p || !/^\d{4}-\d{2}-\d{2}$/.test(p.desde) || !/^\d{4}-\d{2}-\d{2}$/.test(p.hasta) || p.desde.slice(0, 4) < '2000') return toast('Completá las fechas del período (día, mes y año).'); if (p.desde > p.hasta) return toast('«Desde» es posterior a «Hasta».'); if (!RINFF.sel.length) return toast('Elegí al menos un sitio.');
    if (generar && !RINFF.dest) return toast('Indicá el destinatario.');
    const datos = { desde: p.desde, hasta: p.hasta, sitios: RINFF.sel, tipoPeriodo: RINFF.tipo, destinatario: RINFF.dest, cargo: RINFF.cargo, detalle: RINFF.detalle, generar: generar };
    $('riRes').innerHTML = '<p class="mu" style="margin-top:10px">' + (generar ? 'Generando el informe (puede tardar hasta un minuto)…' : 'Calculando…') + '</p>';
    try { const r = await api('p_res_informe', datos, 300000); if (!r.ok) throw new Error(r.mensaje || 'No se pudo calcular.'); RINFP = r;
      if (r.generado) { const u = LS.get('rinfUlt', []); u.unshift({ codigo: r.codigo, doc: r.doc, pdf: r.pdf, carpeta: r.carpeta, fecha: new Date().toISOString(), periodo: fechaTxt(r.desde) + ' al ' + fechaTxt(r.hastaPedido || r.hasta), notas: r.notasAlPie }); LS.set('rinfUlt', u.slice(0, 10)); }
      $('riRes').innerHTML = rinfUltimo(r.generado);
      rinfVista(r); } catch (e) { $('riRes').innerHTML = '<div class="aviso error" style="margin-top:10px">' + esc(e.message) + '</div>'; }
  };
  $('riVer').onclick = () => pedir(false); $('riGen').onclick = () => pedir(true);
  if (RINFP) rinfVista(RINFP);
}
// Informes generados desde este navegador (los últimos 10), con botones para abrirlos; también están en el registro de documentos
function rinfUltimo(recien) {
  const u = LS.get('rinfUlt', []); if (!u.length) return '';
  const bot = (h, t, pri) => '<a class="btn' + (pri ? '' : ' sec') + '" style="text-decoration:none;display:inline-flex;align-items:center' + (pri ? ';background:#0D313F;color:#fff;border-color:#0D313F' : '') + '" href="' + esc(h) + '" target="_blank" rel="noopener">' + t + '</a>';
  const x = u[0];
  return '<div class="aviso" style="margin-top:12px"><b>' + (recien ? 'Informe generado: ' : 'Último informe generado: ') + esc(x.codigo) + '</b> <span class="mu peq">· ' + esc(x.periodo || '') + '</span>' +
    '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">' + bot(x.doc, 'Abrir en Google Docs', true) + bot(x.pdf, 'Abrir el PDF') + bot(x.carpeta, 'Abrir la carpeta') + '</div>' +
    (x.notas === false ? '<p class="mu peq" style="margin:6px 0 0">Las referencias normativas quedaron al final (no como notas al pie).</p>' : '') +
    (u.length > 1 ? '<details style="margin-top:8px"><summary class="mu peq" style="cursor:pointer">Anteriores (' + (u.length - 1) + ')</summary>' + u.slice(1).map(y => '<div class="peq" style="margin:4px 0">' + esc(y.codigo) + ' · ' + esc(y.periodo || '') + ' · <a class="link" href="' + esc(y.doc) + '" target="_blank" rel="noopener">Docs ↗</a> · <a class="link" href="' + esc(y.pdf) + '" target="_blank" rel="noopener">PDF ↗</a></div>').join('') + '</details>' : '') + '</div>';
}
function rinfVista(R) {
  const T = R.totales, varios = R.establecimientos.length > 1, nm = s => (varios && s.nombre !== s.sitio ? esc(s.nombre) + ' · ' : '') + '<b>' + esc(s.sitio) + '</b>';
  const kpi = (t, v, s, col) => '<div class="kpi2"><span>' + t + '</span><b' + (col ? ' style="color:' + col + '"' : '') + '>' + v + '</b><small>' + s + '</small></div>';
  const F = []; R.sitios.forEach(s => s.fuera.forEach(f => F.push({ s: s, f: f })));
  $('riPrev').innerHTML = '<section class="card"><h2>Vista previa · del ' + fechaTxt(R.desde) + ' al ' + fechaTxt(R.hasta) + '</h2><div class="tb5">' +
      kpi('Retiros', T.retiros, T.manifiestos + ' manifiestos · ' + T.conRetiros + ' de ' + T.sitios + ' sitios') + kpi('Esperados', T.esperados || 's/d', 'según la frecuencia pactada') +
      kpi('Cumplimiento', T.cumplimiento == null ? 's/d' : T.cumplimiento + ' %', 'sitios con frecuencia definida', T.cumplimiento != null && T.cumplimiento < 80 ? 'var(--er)' : '') +
      kpi('Intervalos fuera de término', T.intervalosFuera, 'más días entre retiros que lo admisible', T.intervalosFuera ? 'var(--er)' : '') + kpi('Sitios bajo el 80 %', T.sitiosBajo, 'o sin retiros', T.sitiosBajo ? 'var(--wa)' : '') + '</div></section>' +
    '<section class="card tabla"><div style="padding:14px 18px;border-bottom:1px solid var(--ln)"><h2>Retiros por sitio</h2></div><div style="overflow-x:auto"><table><thead><tr><th>Sitio</th><th>Frecuencia pactada</th><th>Esperados</th><th>Realizados</th><th>Cumplimiento</th><th>Intervalo prom. / máx.</th><th>Último retiro</th></tr></thead><tbody>' +
      R.sitios.map(s => '<tr><td>' + nm(s) + '<div class="mu peq">' + esc(s.tipo) + '</div></td><td>' + esc(s.frecuencia) + '<div class="mu peq">' + esc(s.origen) + ' · admisible ' + s.limite + ' días</div></td><td>' + (s.esperados == null ? 's/d' : rcNum(s.esperados)) + '</td><td>' + s.retiros + '<div class="mu peq">' + s.manifiestos + ' manifiesto(s)</div></td><td>' + rcChipPct(s.cumplimiento) + '</td><td>' + (s.intervaloProm == null ? '—' : rcNum(s.intervaloProm) + ' / ' + s.intervaloMax + ' días') + '</td><td>' + (s.ultimo ? fechaTxt(s.ultimo) : s.noAplica ? '<span class="chip gr mini">No corresponde</span>' : '<span class="chip er mini">Sin retiros</span>') + '</td></tr>').join('') +
      '</tbody></table></div></section>' +
    '<section class="card tabla"><div style="padding:14px 18px;border-bottom:1px solid var(--ln)"><h2>Intervalos mayores que el admisible</h2></div>' + (F.length ? '<div style="overflow-x:auto"><table><thead><tr><th>Sitio</th><th>Retiro anterior</th><th>Retiro siguiente</th><th>Días</th><th>Admisible</th></tr></thead><tbody>' +
      F.map(x => '<tr><td>' + nm(x.s) + '</td><td>' + fechaTxt(x.f.desde) + (x.f.nrosDesde.length ? '<div class="mu peq">N.º ' + esc(x.f.nrosDesde.join(', ')) + '</div>' : '') + '</td><td>' + (x.f.abierto ? 'Sin retiro hasta el ' + fechaTxt(R.hasta) : fechaTxt(x.f.hasta) + (x.f.nrosHasta.length ? '<div class="mu peq">N.º ' + esc(x.f.nrosHasta.join(', ')) + '</div>' : '')) + '</td><td><b style="color:var(--er)">' + x.f.dias + '</b></td><td>' + x.s.limite + '</td></tr>').join('') + '</tbody></table></div>' : '<p class="mu" style="padding:12px 18px;margin:0">No hay intervalos mayores que el admisible.</p>') + '</section>' +
    (() => { const EN = R.sitios.filter(s => s.entrega && s.entrega.con), TT = []; EN.forEach(s => s.entrega.tarde.forEach(t => TT.push({ s: s, t: t })));
      return '<section class="card tabla"><div style="padding:14px 18px;border-bottom:1px solid var(--ln)"><h2>Entrega de los manifiestos a la oficina</h2><span class="mu peq">Días entre el retiro y la llegada del manifiesto a la oficina. Plazo: una semana (' + (T.plazoEntrega || 7) + ' días), PROT-RES-003. Se registra desde el 14/10/2026.</span></div>' +
        (EN.length ? '<div style="overflow-x:auto"><table><thead><tr><th>Sitio</th><th>Con fecha de llegada</th><th>Promedio</th><th>Máximo</th><th>Fuera de plazo</th></tr></thead><tbody>' + EN.map(s => '<tr><td>' + nm(s) + '</td><td>' + s.entrega.con + ' de ' + s.retiros + '</td><td>' + rcNum(s.entrega.prom) + ' días</td><td>' + s.entrega.max + ' días</td><td>' + (s.entrega.tarde.length ? '<span class="chip er mini">' + s.entrega.tarde.length + '</span>' : '<span class="chip ok mini">0</span>') + '</td></tr>').join('') + '</tbody></table></div>' +
          (TT.length ? '<div style="overflow-x:auto"><table><thead><tr><th>Sitio</th><th>Retiro</th><th>N.º de manifiesto</th><th>Llegó a la oficina</th><th>Días</th></tr></thead><tbody>' + TT.map(x => '<tr><td>' + nm(x.s) + '</td><td>' + fechaTxt(x.t.fecha) + '</td><td>' + esc(x.t.nros.join(', ') || 's/d') + '</td><td>' + fechaTxt(x.t.llego) + '</td><td><b style="color:var(--er)">' + x.t.dias + '</b></td></tr>').join('') + '</tbody></table></div>' : '')
          : '<p class="mu" style="padding:12px 18px;margin:0">Ningún manifiesto del período tiene registrado el día de llegada a la oficina.</p>') + '</section>'; })() +
    '<section class="card"><h2>Detalle de retiros (fechas y N.º de manifiesto)</h2>' + R.sitios.map(s => '<details><summary style="cursor:pointer;padding:6px 0">' + nm(s) + ' <span class="mu peq">· ' + s.retiros + ' retiro(s)</span></summary>' +
      (s.detalle.length ? '<div style="overflow-x:auto"><table><thead><tr><th>Fecha</th><th>N.º de manifiesto</th><th>Y1 (dm³)</th><th>Y3 (dm³)</th><th>Días desde el anterior</th><th>Llegó a la oficina</th></tr></thead><tbody>' + s.detalle.map(d => '<tr' + (d.excede ? ' style="color:var(--er);font-weight:700"' : '') + '><td>' + fechaTxt(d.fecha) + '</td><td>' + esc(d.nros.join(', ') || 's/d') + '</td><td>' + (d.y1 ? rcNum(d.y1) : '—') + '</td><td>' + (d.y3 ? rcNum(d.y3) : '—') + '</td><td>' + (d.desdeAnt == null ? '—' : d.desdeAnt) + '</td><td>' + (d.llego ? fechaTxt(d.llego) + ' (' + d.demora + ' d)' + (d.demora > (T.plazoEntrega || 7) ? ' ⚠' : '') : '—') + '</td></tr>').join('') + '</tbody></table></div>' : '<p class="mu peq">Sin retiros cargados en el período.</p>') + '</details>').join('') + '</section>';
}
