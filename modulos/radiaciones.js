// Portal HyS · 5 · Radiaciones ionizantes (Radiaciones.gs) · versión 0 (13/10/2026) · 0.4 (19/10/2026): pestaña Investigaciones
// Rayos X: radiología, tomografía, arco en C y odontológicos, para toda la red. Personal expuesto y dosímetros (altas, bajas a pedido,
// reactivaciones, extravíos), controles dosimétricos mensuales (PDF), eventos (registros anormales, extravíos, exposición accidental),
// salas y equipos (habilitación, plano de plomado, blindaje, levantamiento radiométrico, control de calidad), documentos y requisitos legales.
// Se carga desde portal.html (<script src>). Para el portal de respaldo, herramientas/armar_respaldo.py lo junta en un solo archivo.
let RADT = null, RADD = {}, RADF = { cod: '', tab: 'sit', ver: 'act', q: '', sitio: '' };
const RAD_TABS = [['sit', 'Sitios'], ['per', 'Personal y dosímetros'], ['con', 'Controles mensuales'], ['dos', 'Dosis por persona'], ['inv', 'Investigaciones'], ['eve', 'Eventos'], ['sal', 'Salas y equipos'], ['doc', 'Documentos'], ['req', 'Requisitos legales'], ['mov', 'Movimientos']];
const RAD_FECHA = { vigente: ['Vigente', 'ok'], porvencer: ['Vence pronto', 'wa'], vencido: ['Vencido', 'er'], sd: ['Sin dato', 'gr'] };
const radChipF = (e, f) => { const x = RAD_FECHA[e] || RAD_FECHA.sd; return '<span class="chip ' + x[1] + '">' + x[0] + '</span>' + (f ? '<div class="mu peq">' + (e === 'vencido' ? 'venció ' : 'vence ') + fechaTxt(f) + '</div>' : ''); };
const radChipD = e => { const c = e === 'Activo' ? 'ok' : e === 'Extraviado' ? 'er' : /^Baja/.test(e) ? 'gr' : 'wa'; return '<span class="chip ' + c + '">' + esc(e || 's/d (revisar)') + '</span>'; };
const radMes = p => { const m = /^(\d{4})-(\d{2})/.exec(p || ''); return m ? ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'][+m[2] - 1] + ' ' + m[1] : (p || ''); };
const radLink = (u, t) => u ? '<a class="link" href="' + esc(u) + '" target="_blank" rel="noopener">' + esc(t || 'Abrir') + ' ↗</a>' : '<span class="mu">—</span>';
const radSitF = D => ['SITIO', 'Sitio (edificio, CAPS, sede)', D.sitios.map(s => s.SITIO)];
const radSitTxt = x => x.SITIO ? '<div class="mu peq">' + esc(x.SITIO) + '</div>' : '';
const radChipRx = v => '<span class="chip ' + (v === 'Sí' ? 'ok' : v === 'No' ? 'gr' : 'wa') + '">' + esc(v || 'A confirmar') + '</span>';
const radNom = c => { const f = (RES && RES.filas || []).find(x => x.cod === c) || (RADT && RADT.establecimientos || []).find(x => x.cod === c); return f ? f.nombre : c; };
function radNoInstalado(hash, r) {
  return marco(hash, '<div class="cab"><div><span class="mu peq">5 · Radiaciones ionizantes</span><h1>Radiaciones ionizantes</h1></div></div><div class="aviso ' + (r && r.instalado === false ? '' : 'error') + '">' + esc((r && (r.mensaje || r.error)) || 'No se pudo leer el módulo.') + '</div>' +
    (r && r.instalado === false ? '<section class="card"><h2>Cómo se instala</h2><ol class="peq"><li>En el editor de Apps Script del «Sistema HyS», elegí la función <b>construirModuloRadiaciones</b> y tocá «Ejecutar» (una sola vez).</li><li>Se crea el libro «RADIACIONES IONIZANTES · Sistema HyS» y la carpeta SISTEMA HyS › MÓDULO 9 · RADIACIONES IONIZANTES.</li><li>Volvé a esta pantalla y tocá «Actualizar».</li></ol></section>' : ''));
}
// ------------------------------------------------------------------ Tablero de la red
const RAD_ALCANCE = '<div class="aviso" style="margin-bottom:14px"><b>Quién va en cada establecimiento.</b> El personal del <b>Servicio de Radiología</b> (no incluye PROSATE, quirófano, traumatología, cirugía ni odontología) rota entre el HZT y el HMH: se gestiona como una sola unidad <b>HZT/HMH</b> y se carga en el HZT. <b>PROSATE</b> es la ex ADOS y depende del HZT. <b>Odontología</b> depende del HZT (CAPS y sede ex ADOS). Quirófano, traumatología y cirugía se cargan en el establecimiento donde trabajan.</div>';
async function radTablero(fresco) {
  if (!RES) { const g = LS.get('res', null); if (g) { RES = g; refrescarRes(); } }
  if (!RADT || fresco) { cargando('#rad', 'Armando el tablero de radiaciones…'); try { RADT = await api('p_rad_tablero', { fresco: !!fresco }, 180000); } catch (e) { return; } }
  if (!RADT.ok) { const r = RADT; RADT = null; return radNoInstalado('#rad', r); }
  const T = RADT.totales, A = FILTRO.area, areas = Array.from(new Set(RADT.establecimientos.map(e => e.area))).filter(Boolean).sort();
  const E = RADT.establecimientos.filter(e => (!A || e.area === A) && (RADF.todos || e.r.personas || e.r.equipos || e.r.sitiosRx)).sort((a, b) => String(a.nombre).localeCompare(String(b.nombre)));
  const kpi = (t, v, s, col) => '<div class="kpi2"><span>' + t + '</span><b' + (col ? ' style="color:' + col + '"' : '') + '>' + v + '</b><small>' + s + '</small></div>';
  const at = [];
  RADT.establecimientos.filter(e => !A || e.area === A).forEach(e => { const r = e.r, h = '#radest/' + encodeURIComponent(e.cod);
    if (r.anormalesAbiertos) at.push(['er', r.anormalesAbiertos + ' registro(s) anormal(es) o exposición accidental abiertos', e.nombre, h + '/eve']);
    if (r.extraviados) at.push(['er', r.extraviados + ' dosímetro(s) extraviado(s)', e.nombre, h + '/per']);
    if (r.habVencidas) at.push(['er', r.habVencidas + ' habilitación(es) de equipo vencida(s)', e.nombre, h + '/sal']);
    if (r.faltanMeses.length) at.push(['wa', 'Falta el control dosimétrico de ' + r.faltanMeses.map(radMes).join(', '), e.nombre, h + '/con']);
    if (r.habPorVencer) at.push(['wa', r.habPorVencer + ' habilitación(es) vencen en 60 días', e.nombre, h + '/sal']);
    if (r.sinAutorizacion) at.push(['wa', r.sinAutorizacion + ' persona(s) con dosímetro sin autorización individual cargada', e.nombre, h + '/per']);
    if (r.habSinDato || r.sinPlano) at.push(['gr', (r.habSinDato ? r.habSinDato + ' equipo(s) sin dato de habilitación' : '') + (r.habSinDato && r.sinPlano ? ' · ' : '') + (r.sinPlano ? r.sinPlano + ' sin plano de plomado' : ''), e.nombre, h + '/sal']); });
  marco('#rad', '<div class="cab"><div><span class="mu peq">5 · Radiaciones ionizantes</span><h1>Radiaciones ionizantes</h1><span class="mu peq">Rayos X (radiología, tomografía, arco en C y odontológicos) en toda la red: personal expuesto y dosímetros, controles mensuales, eventos, salas y equipos.</span></div>' +
    '<div class="filtros"><label class="f">Área<select class="c" id="rdA"><option value="">Toda la provincia</option>' + areas.map(a => '<option' + (a === A ? ' selected' : '') + '>' + esc(a) + '</option>').join('') + '</select></label>' +
    '<label class="f">Abrir un establecimiento<select class="c" id="rdE">' + selectorEst('', false) + '</select></label>' +
    radLink(RADT.libro, 'Planilla del módulo') + ' ' + radLink(RADT.carpeta, 'Carpeta del módulo') + '<button class="btn sec" id="rdAct">Actualizar</button></div></div>' +
    RAD_ALCANCE + '<div class="tb5">' + kpi('Sitios con rayos X', T.sitiosRx || 0, (T.sitiosConfirmar || 0) + ' sitios de la provincia a confirmar') + kpi('Establecimientos', T.establecimientos, 'con sitios, personal o equipos cargados') + kpi('Dosímetros activos', T.activos, 'personas con dosímetro en uso') +
    kpi('Extraviados', T.extraviados, 'dosímetros a reponer', T.extraviados ? 'var(--er)' : '') + kpi('Eventos abiertos', T.eventosAbiertos, T.invAbiertas ? T.invAbiertas + ' investigación(es) de dosis abierta(s)' : 'anormales, extravíos y otros', T.eventosAbiertos || T.invAbiertas ? 'var(--er)' : '') +
    kpi('Equipos', T.equipos, T.habVencidas ? T.habVencidas + ' con habilitación vencida' : 'en uso o fuera de servicio', T.habVencidas ? 'var(--er)' : '') + kpi('Sin controles al día', T.faltanControles, 'establecimientos con meses sin PDF (últimos 3)', T.faltanControles ? 'var(--wa)' : '') + '</div>' +
    '<div class="tb2"><section class="card tabla" style="min-width:0"><div style="padding:14px 18px;border-bottom:1px solid var(--ln);display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;align-items:center"><h2>Por establecimiento</h2><label class="peq"><input type="checkbox" id="rdTodos"' + (RADF.todos ? ' checked' : '') + '> Mostrar también los que no tienen datos</label></div><div style="overflow-x:auto"><table><thead><tr><th>Establecimiento</th><th>Sitios con rayos X</th><th>Dosímetros</th><th>Último control</th><th>Eventos</th><th>Equipos</th><th>Requisitos con documento</th></tr></thead><tbody>' +
    (E.length ? E.map(e => { const r = e.r; return '<tr class="cl" data-cod="' + esc(e.cod) + '"><td><b>' + esc(e.nombre) + '</b><div class="mu peq">' + esc(e.cod) + '</div></td>' +
      '<td>' + (r.sitiosRx ? r.sitiosRx : '<span class="mu">—</span>') + (r.sitiosConfirmar ? ' <span class="chip wa mini">' + r.sitiosConfirmar + ' a confirmar</span>' : '') + '</td>' +
      '<td>' + (r.personas ? r.activos + ' activos' + (r.bajas ? ' <span class="mu peq">· ' + r.bajas + ' de baja</span>' : '') + (r.extraviados ? ' <span class="chip er mini">' + r.extraviados + ' extraviado(s)</span>' : '') : '<span class="mu">—</span>') + '</td>' +
      '<td>' + (r.ultimoControl ? radMes(r.ultimoControl) : '<span class="mu">—</span>') + (r.faltanMeses.length ? '<div class="chip wa mini">faltan ' + r.faltanMeses.length + '</div>' : '') + '</td>' +
      '<td>' + (r.eventosAbiertos ? '<span class="chip er">' + r.eventosAbiertos + ' abierto(s)</span>' : '') + (r.invAbiertas ? ' <span class="chip wa">' + r.invAbiertas + ' a investigar</span>' : '') + (!r.eventosAbiertos && !r.invAbiertas ? '<span class="mu">—</span>' : '') + '</td>' +
      '<td>' + (r.equipos ? r.equipos + (r.habVencidas ? ' <span class="chip er mini">' + r.habVencidas + ' hab. vencida</span>' : r.habSinDato ? ' <span class="chip gr mini">' + r.habSinDato + ' sin dato</span>' : '') : '<span class="mu">—</span>') + '</td>' +
      '<td>' + (r.requisitos ? r.requisitosConDoc + ' de ' + r.requisitos : '—') + '</td></tr>'; }).join('') : '<tr><td colspan="7" class="mu">Todavía no hay datos cargados. Elegí un establecimiento arriba para empezar.</td></tr>') +
    '</tbody></table></div></section>' +
    '<section class="card" style="display:flex;flex-direction:column;gap:6px;min-width:0"><h2>Requiere atención</h2>' + (at.length ? at.slice(0, 16).map(v => '<a class="at" href="' + v[3] + '"><span class="tag ' + v[0] + '">' + (v[0] === 'er' ? 'Urgente' : v[0] === 'wa' ? 'Pronto' : 'Completar') + '</span><span><b>' + esc(v[1]) + '</b><small>' + esc(v[2]) + '</small></span></a>').join('') : '<p class="mu" style="margin:0">Nada pendiente con los datos cargados.</p>') + '</section></div>');
  $('rdA').onchange = e => { FILTRO.area = e.target.value; radTablero(); };
  $('rdE').onchange = e => { if (e.target.value) location.hash = '#radest/' + encodeURIComponent(e.target.value); };
  $('rdTodos').onchange = e => { RADF.todos = e.target.checked; radTablero(); };
  $('rdAct').onclick = () => radTablero(true);
  document.querySelectorAll('tr.cl[data-cod]').forEach(tr => tr.onclick = () => location.hash = '#radest/' + encodeURIComponent(tr.dataset.cod));
}
// ------------------------------------------------------------------ Establecimiento
async function radEst(a, fresco) {
  if (!RES) { const g = LS.get('res', null); if (g) { RES = g; refrescarRes(); } }
  const [cod, tab] = String(a || '').split('/').map(decodeURIComponent);
  if (!cod) { marco('#radest', '<div class="cab"><div><span class="mu peq">5 · Radiaciones ionizantes</span><h1>Elegí un establecimiento</h1></div></div><div class="card"><label class="f">Establecimiento<select class="c" id="rdSel">' + selectorEst('', false) + '</select></label></div>');
    $('rdSel').onchange = e => { if (e.target.value) location.hash = '#radest/' + encodeURIComponent(e.target.value); }; return; }
  if (RADF.cod !== cod) RADF.sitio = ''; RADF.cod = cod; if (tab && RAD_TABS.some(t => t[0] === tab)) RADF.tab = tab;
  if (!RADD[cod] || fresco) { cargando('#radest', 'Abriendo radiaciones de ' + radNom(cod) + '…'); try { RADD[cod] = await api('p_rad_detalle', { cod: cod }, 180000); } catch (e) { return; } }
  const D = RADD[cod]; if (!D.ok) { delete RADD[cod]; return radNoInstalado('#radest', D); }
  const R = D.resumen, sf = RADF.sitio, de = (l, todos) => !sf ? l : l.filter(x => (x.SITIO || '') === sf || (todos && !x.SITIO));
  const Df = Object.assign({}, D, { personal: de(D.personal), eventos: de(D.eventos), salas: de(D.salas), documentos: de(D.documentos, true), controles: de(D.controles, true), dosis: de(D.dosis || [], true), investigaciones: de(D.investigaciones || [], true), movimientos: sf ? D.movimientos.filter(m => D.personal.some(p => p.ID === m.ID_PERSONA && p.SITIO === sf)) : D.movimientos });
  const cuerpo = { sit: radSit, per: radPer, con: radCon, dos: radDos, inv: radInv, eve: radEve, sal: radSal, doc: radDoc, req: radReq, mov: radMov }[RADF.tab](Df);
  marco('#radest', '<div class="cab"><div><span class="mu peq"><a class="link" href="#rad">5 · Radiaciones ionizantes</a> › ' + esc(cod) + '</span><h1>' + esc(radNom(cod)) + '</h1><span class="mu peq">' +
    R.activos + ' dosímetro(s) activo(s) · último control ' + (R.ultimoControl ? radMes(R.ultimoControl) : 'sin cargar') + ' · ' + R.eventosAbiertos + ' evento(s) abierto(s) · ' + (R.invAbiertas ? R.invAbiertas + ' investigación(es) de dosis abierta(s) · ' : '') + R.equipos + ' equipo(s) · ' + R.requisitosConDoc + ' de ' + R.requisitos + ' requisitos con documento · ' + R.sitiosRx + ' sitio(s) con rayos X' + (R.sitiosConfirmar ? ', ' + R.sitiosConfirmar + ' a confirmar' : '') + '</span></div>' +
    '<div class="filtros"><label class="f">Sitio<select class="c" id="rdSit"><option value="">Todos los sitios</option>' + D.sitios.map(x => '<option' + (x.SITIO === sf ? ' selected' : '') + '>' + esc(x.SITIO) + '</option>').join('') + '</select></label><label class="f">Otro establecimiento<select class="c" id="rdOtro">' + selectorEst(cod, false) + '</select></label>' + radLink(D.carpeta, 'Carpeta del establecimiento') + ' ' + radLink(D.carpetaDosimetria, 'Carpeta de dosimetría') + ' ' + radLink(D.libro, 'Planilla') + '<button class="btn sec" id="rdAct">Actualizar</button></div></div>' +
    ((cod === 'HZT' || cod === 'HMH') ? RAD_ALCANCE : '') + '<div class="tabs" style="margin-bottom:14px">' + RAD_TABS.map(t => '<a class="btn ' + (t[0] === RADF.tab ? 'pri' : 'sec') + '" href="#radest/' + encodeURIComponent(cod) + '/' + t[0] + '">' + t[1] + '</a>').join('') + '</div>' + cuerpo);
  $('rdOtro').onchange = e => { if (e.target.value) location.hash = '#radest/' + encodeURIComponent(e.target.value) + '/' + RADF.tab; };
  $('rdAct').onclick = () => radEst(encodeURIComponent(cod) + '/' + RADF.tab, true);
  $('rdSit').onchange = e => { RADF.sitio = e.target.value; radEst(encodeURIComponent(cod) + '/' + RADF.tab); };
  ({ sit: radSitEv, per: radPerEv, con: radConEv, dos: radDosEv, inv: radInvEv, eve: radEveEv, sal: radSalEv, doc: radDocEv, req: radReqEv, mov: () => {} })[RADF.tab](Df);
}
function radRecargar(D, msg) { if (msg) toast(msg); RADT = null; delete RADD[D.cod]; radEst(encodeURIComponent(D.cod) + '/' + RADF.tab); }
// Lee un archivo (PDF ≤ 6 MB o imagen achicada) para mandarlo como dataUrl
async function radLeerArchivo(f) {
  if (f.type === 'application/pdf') { if (f.size > 6 * 1024 * 1024) throw new Error('El PDF pesa más de 6 MB.'); return await new Promise((ok, mal) => { const rd = new FileReader(); rd.onload = () => ok(rd.result); rd.onerror = mal; rd.readAsDataURL(f); }); }
  if (/^image\//.test(f.type)) return await achicar(f);
  throw new Error('Solo PDF o imagen.');
}
function radInputs(arch) {
  document.querySelectorAll('#ov [data-arch]').forEach(inp => inp.onchange = async () => { const f = inp.files[0], k = inp.dataset.arch, msg = $('ra_' + k); if (!f) return;
    try { arch[k] = await radLeerArchivo(f); msg.textContent = 'Listo para guardar: ' + f.name; } catch (e) { delete arch[k]; msg.textContent = e.message || 'No se pudo leer el archivo.'; } });
}
const radSubir = (k, t, ya) => '<label class="f ancho">' + esc(t) + '<input class="c" type="file" accept="application/pdf,image/*" data-arch="' + k + '"><span class="mu peq" id="ra_' + k + '">' + (ya ? 'Ya hay uno cargado; si elegís otro, queda el nuevo (el anterior no se borra de Drive).' : '') + '</span></label>';

// ---------- Sitios
function radSit(D) {
  const L = D.sitios, cuenta = (l, s) => l.filter(x => x.SITIO === s.SITIO).length, Dt = RADD[D.cod];
  return '<section class="card tabla"><div style="padding:14px 18px;border-bottom:1px solid var(--ln);display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;align-items:center"><div><h2>Sitios del establecimiento</h2><span class="mu peq">Edificios, CAPS, sede ex ADOS y dispositivos de BASE COMÚN › SITIOS. Marcá cuáles tienen rayos X y qué equipos.</span></div><button class="btn pri" id="rsNuevoSit">Agregar sitio</button></div><div style="overflow-x:auto"><table><thead><tr><th>Sitio</th><th>Tipo</th><th>Rayos X</th><th>Equipos</th><th>Personas</th><th>Equipos cargados</th><th>Observaciones</th><th></th></tr></thead><tbody>' +
    (L.length ? L.map((x, i) => '<tr><td><b>' + esc(x.SITIO) + '</b>' + (x.NOMBRE_OFICIAL && x.NOMBRE_OFICIAL !== x.SITIO ? '<div class="mu peq">' + esc(x.NOMBRE_OFICIAL) + '</div>' : '') + '</td><td class="peq">' + esc(x.TIPO_SITIO || 's/d') + '</td><td>' + radChipRx(x.RAYOS_X) + '</td><td class="peq">' + esc(x.EQUIPOS || '—') + '</td>' +
      '<td>' + (cuenta(Dt.personal, x) || '—') + '</td><td>' + (cuenta(Dt.salas, x) || '—') + '</td><td class="peq">' + esc(x.OBSERVACIONES || '') + '</td><td style="white-space:nowrap"><button class="btn sec" data-sit="' + i + '">Editar</button> <button class="btn sec" data-ver="' + i + '">Ver</button></td></tr>').join('')
      : '<tr><td colspan="8" class="mu">Este establecimiento no tiene sitios cargados en BASE COMÚN. Agregá el sitio con «Agregar sitio».</td></tr>') + '</tbody></table></div></section>' +
    '<p class="mu peq">«A confirmar»: todavía no se sabe si el sitio tiene equipos de rayos X. «Ver» filtra todas las pestañas por ese sitio. Todo se puede corregir también en la planilla, hoja SITIOS_RX.</p>';
}
function radSitEv(D) {
  $('rsNuevoSit').onclick = () => radSitForm(D, null);
  document.querySelectorAll('[data-sit]').forEach(b => b.onclick = () => radSitForm(D, D.sitios[+b.dataset.sit]));
  document.querySelectorAll('[data-ver]').forEach(b => b.onclick = () => { RADF.sitio = D.sitios[+b.dataset.ver].SITIO; location.hash = '#radest/' + encodeURIComponent(D.cod) + '/per'; });
}
function radSitForm(D, x) {
  modal(x ? 'Sitio · ' + x.SITIO : 'Agregar sitio', [['SITIO', 'Nombre corto del sitio'], ['NOMBRE_OFICIAL', 'Nombre oficial'], ['TIPO_SITIO', 'Tipo', ['Edificio', 'CAPS', 'Dispositivo', 'Puesto sanitario', 'Otro']],
    ['RAYOS_X', '¿Tiene rayos X?', D.listas.rxSitio], ['EQUIPOS', 'Equipos (rayos X, tomografía, arco en C, odontológico…)'], ['OBSERVACIONES', 'Observaciones', null, 1]], Object.assign({ RAYOS_X: 'A confirmar' }, x || {}),
    async out => {
      if (!out.SITIO) return 'Falta el nombre del sitio.'; if (!out.RAYOS_X) return 'Elegí si tiene rayos X.';
      const r = await api('p_rad_sitio_guardar', Object.assign({ ID: x ? x.ID : '', ESTABLECIMIENTO: D.cod }, out), 120000); if (!r.ok) return r.mensaje || 'No se pudo guardar.';
      radRecargar(D, 'Sitio guardado.'); return '';
    }, x && x.ID === '' ? '<p class="mu peq" style="margin:0">Este sitio viene de BASE COMÚN y todavía no está en la planilla del módulo: al guardar se agrega.</p>' : '');
}

// ---------- Personal y dosímetros
function radPer(D) {
  const q = RADF.q.toLowerCase(), L = D.personal.filter(p => (RADF.ver === 'todos' || (RADF.ver === 'act' ? !/^Baja/.test(p.ESTADO_DOSIMETRO) : /^Baja/.test(p.ESTADO_DOSIMETRO))) && (!q || (p.APELLIDO_Y_NOMBRE + ' ' + p.DNI + ' ' + p.DOSIMETRO_NRO).toLowerCase().includes(q)));
  const sug = D.sugeridas || [];
  return '<section class="card tabla" style="min-width:0"><div style="padding:14px 18px;border-bottom:1px solid var(--ln);display:flex;flex-wrap:wrap;gap:10px;align-items:end;justify-content:space-between"><h2>Personal expuesto (' + D.personal.length + ')</h2><div class="filtros">' +
    '<label class="f">Ver<select class="c" id="rpVer"><option value="act"' + (RADF.ver === 'act' ? ' selected' : '') + '>En uso (sin bajas)</option><option value="bajas"' + (RADF.ver === 'bajas' ? ' selected' : '') + '>Dados de baja</option><option value="todos"' + (RADF.ver === 'todos' ? ' selected' : '') + '>Todos</option></select></label>' +
    '<label class="f">Buscar<input class="c" id="rpQ" value="' + esc(RADF.q) + '" placeholder="Nombre, DNI o dosímetro"></label><button class="btn pri" id="rpNuevo">Agregar persona</button></div></div><div style="overflow-x:auto"><table><thead><tr><th>Persona</th><th>Sector</th><th>Dosímetro</th><th>Estado</th><th>Autorización individual</th><th>NTE</th><th></th></tr></thead><tbody>' +
    (L.length ? L.map(p => '<tr><td><b>' + esc(p.APELLIDO_Y_NOMBRE) + '</b><div class="mu peq">DNI ' + esc(p.DNI || 's/d (revisar)') + ' · ' + esc(p.FUNCION || p.SERVICIO || '') + '</div>' + radSitTxt(p) + '</td><td class="peq">' + esc(p.SECTOR_EXPOSICION || 's/d (revisar)') + '</td>' +
      '<td>' + esc(p.DOSIMETRO_NRO || '—') + '<div class="mu peq">' + esc(p.TIPO_DOSIMETRO || '') + (p.ALTA_DOSIMETRO ? ' · alta ' + fechaTxt(p.ALTA_DOSIMETRO) : '') + '</div></td><td>' + radChipD(p.ESTADO_DOSIMETRO) + (p.BAJA_DOSIMETRO ? '<div class="mu peq">baja ' + fechaTxt(p.BAJA_DOSIMETRO) + (p.MOTIVO_BAJA ? ' · ' + esc(p.MOTIVO_BAJA) : '') + '</div>' : '') + '</td>' +
      '<td>' + (p.AUTORIZACION_INDIVIDUAL === 'Sí' ? '<span class="chip ok">Sí</span><div class="mu peq">' + esc(p.AUTORIZACION_NRO || '') + (p.AUTORIZACION_VENCE ? ' · vence ' + fechaTxt(p.AUTORIZACION_VENCE) : '') + '</div>' : '<span class="chip ' + (p.AUTORIZACION_INDIVIDUAL === 'No' ? 'er' : 'gr') + '">' + esc(p.AUTORIZACION_INDIVIDUAL || 's/d') + '</span>') + '</td>' +
      '<td>' + esc(p.EN_NTE || 's/d') + '</td><td style="white-space:nowrap"><button class="btn sec" data-ed="' + esc(p.ID) + '">Editar</button> ' +
      (/^Baja/.test(p.ESTADO_DOSIMETRO) ? '<button class="btn sec" data-re="' + esc(p.ID) + '">Reactivar</button>' : '<button class="btn sec" data-ba="' + esc(p.ID) + '">Dar de baja</button>') + '</td></tr>').join('')
      : '<tr><td colspan="7" class="mu">' + (D.personal.length ? 'Nadie con ese filtro.' : RADF.sitio ? 'Nadie cargado en ' + RADF.sitio + '.' : 'Todavía no hay personal expuesto cargado.') + '</td></tr>') + '</tbody></table></div></section>' +
    radCruceHtml(D) +
    (sug.length ? '<section class="card"><h2>En la base de trabajadores</h2><p class="mu peq" style="margin-top:0">Personas de este establecimiento con función o servicio de imágenes, rayos, tomografía, odontología o hemodinamia que todavía no están en el módulo. Tocá una para agregarla.</p><div style="display:flex;flex-wrap:wrap;gap:6px">' +
      sug.map((s, i) => '<button class="btn sec" data-sug="' + i + '" style="min-height:30px;padding:4px 10px">' + esc(s.nombre) + ' <span class="mu peq" style="margin-left:6px">' + esc(s.funcion || s.servicio) + '</span></button>').join('') + '</div></section>' : '') +
    '<p class="mu peq">Al dar de alta o de baja a alguien con dosímetro, se comunica de inmediato a la autoridad sanitaria (Dto. 6320/68, art. 22): cargá la nota en «Documentos» como «Comunicación de cambio de personal».</p>';
}
// Cruce con la BASE DE TRABAJADORES (Radiaciones.gs › radCruce_)
const RAD_CRUCE = { ok: ['ok', 'En la base, datos iguales'], difiere: ['wa', 'En la base, con datos distintos'], otro_est: ['wa', 'En la base, en otro establecimiento'], baja: ['er', 'En la base, de baja'], no_base: ['er', 'No está en la base'], sin_dni: ['gr', 'Sin DNI cargado'] };
function radCruceHtml(D) {
  const C = (D.cruce || []).filter(c => !RADF.sitio || (D.personal.find(p => p.ID === c.id) || {}).SITIO === RADF.sitio); if (!C.length) return '';
  const cnt = k => C.filter(c => c.estado === k).length, rev = C.filter(c => c.estado !== 'ok');
  const etq = { APELLIDO_Y_NOMBRE: 'Nombre', CUIL: 'CUIL', SERVICIO: 'Servicio', FUNCION: 'Función' };
  return '<section class="card"><h2>Cruce con la base de trabajadores</h2><p class="mu peq" style="margin-top:0">Cada persona expuesta (sin las bajas) buscada por DNI en la BASE DE TRABAJADORES.</p><div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px">' +
    Object.keys(RAD_CRUCE).filter(k => cnt(k)).map(k => '<span class="chip ' + RAD_CRUCE[k][0] + '">' + cnt(k) + ' · ' + RAD_CRUCE[k][1] + '</span>').join('') + '</div>' +
    (rev.length ? '<div style="overflow-x:auto"><table><thead><tr><th>Persona</th><th>Resultado</th><th>En la base</th><th></th></tr></thead><tbody>' + rev.map(c => '<tr><td><b>' + esc(c.nombre) + '</b><div class="mu peq">DNI ' + esc(c.dni || 's/d') + '</div></td><td><span class="chip ' + RAD_CRUCE[c.estado][0] + '">' + RAD_CRUCE[c.estado][1] + '</span>' +
      (c.dif.length ? '<div class="peq" style="margin-top:4px">' + c.dif.map(d => etq[d[0]] + ': <s>' + esc(d[1] || 's/d') + '</s> → <b>' + esc(d[2]) + '</b>').join('<br>') + '</div>' : '') + '</td>' +
      '<td class="peq">' + (c.base ? esc([c.base.est, c.base.estado, c.base.servicio].filter(Boolean).join(' · ')) : '—') + '</td>' +
      '<td style="white-space:nowrap">' + (c.dif.length ? '<button class="btn sec" data-cru="' + esc(c.id) + '">Tomar los datos de la base</button>' : c.estado === 'no_base' || c.estado === 'sin_dni' ? '<button class="btn sec" data-ed="' + esc(c.id) + '">Revisar DNI</button>' : c.estado === 'baja' ? '<button class="btn sec" data-ba="' + esc(c.id) + '">Dar de baja el dosímetro</button>' : '') + '</td></tr>').join('') + '</tbody></table></div>'
      : '<div class="mu peq">Todas las personas expuestas están en la base con los mismos datos.</div>') +
    '<p class="mu peq" style="margin:8px 0 0">«No está en la base»: revisá el DNI o pedí el alta en la base de personal. «De baja» u «otro establecimiento»: confirmá si sigue expuesta acá; si no, dale de baja el dosímetro (y comunicalo a la autoridad, Dto. 6320/68, art. 22).</p></section>';
}
function radPerEv(D) {
  document.querySelectorAll('[data-cru]').forEach(b => b.onclick = async () => { const c = (D.cruce || []).find(x => x.id === b.dataset.cru); if (!c) return;
    const datos = { ID: c.id, ESTABLECIMIENTO: D.cod, movimiento: { tipo: 'Corrección de datos', detalle: 'Datos tomados de la base de trabajadores: ' + c.dif.map(d => d[0]).join(', ') } }; c.dif.forEach(d => datos[d[0]] = d[2]);
    b.disabled = true; b.textContent = 'Guardando…';
    try { const r = await api('p_rad_persona_guardar', datos, 120000); if (!r.ok) { b.disabled = false; b.textContent = 'Tomar los datos de la base'; return toast(r.mensaje || 'No se pudo guardar.'); } radRecargar(D, 'Datos actualizados con la base de trabajadores.'); } catch (e) { b.disabled = false; b.textContent = 'Tomar los datos de la base'; } });
  $('rpVer').onchange = e => { RADF.ver = e.target.value; radEst(encodeURIComponent(D.cod) + '/per'); };
  $('rpQ').onchange = e => { RADF.q = e.target.value; radEst(encodeURIComponent(D.cod) + '/per'); };
  $('rpNuevo').onclick = () => radPersonaForm(D, null);
  const porId = id => D.personal.find(p => p.ID === id);
  document.querySelectorAll('[data-ed]').forEach(b => b.onclick = () => radPersonaForm(D, porId(b.dataset.ed)));
  document.querySelectorAll('[data-ba]').forEach(b => b.onclick = () => radBajaForm(D, porId(b.dataset.ba)));
  document.querySelectorAll('[data-re]').forEach(b => b.onclick = () => radReactivarForm(D, porId(b.dataset.re)));
  document.querySelectorAll('[data-sug]').forEach(b => b.onclick = () => { const s = D.sugeridas[+b.dataset.sug]; radPersonaForm(D, null, { DNI: s.dni, CUIL: s.cuil, APELLIDO_Y_NOMBRE: s.nombre, FUNCION: s.funcion, SERVICIO: s.servicio }); });
}
function radPersonaForm(D, p, base) {
  const L = D.listas, v = Object.assign({ ESTADO_DOSIMETRO: 'Activo', AUTORIZACION_INDIVIDUAL: 's/d', EN_NTE: 's/d', SITIO: RADF.sitio }, base || p || {}), arch = {};
  modal(p ? 'Persona expuesta · ' + p.APELLIDO_Y_NOMBRE : 'Agregar persona expuesta', [
    ['DNI', 'DNI (sin puntos)'], ['APELLIDO_Y_NOMBRE', 'Apellido y nombre'], ['CUIL', 'CUIL'], ['SERVICIO', 'Servicio'], ['FUNCION', 'Función'], radSitF(D), ['SECTOR_EXPOSICION', 'Sector donde se expone', L.sectores],
    ['INICIO_EXPOSICION', 'Inicio de la exposición', 'date'], ['DOSIMETRO_NRO', 'Número de dosímetro'], ['TIPO_DOSIMETRO', 'Tipo de dosímetro', L.tiposDosi], ['PROVEEDOR', 'Servicio de dosimetría'],
    ['ALTA_DOSIMETRO', 'Alta del dosímetro', 'date'], ['ESTADO_DOSIMETRO', 'Estado del dosímetro', L.estadosDosi], ['AUTORIZACION_INDIVIDUAL', 'Autorización individual (autoridad sanitaria)', ['Sí', 'No', 's/d']],
    ['AUTORIZACION_NRO', 'Autorización: número'], ['AUTORIZACION_VENCE', 'Autorización: vencimiento', 'date'], ['EN_NTE', '¿Figura en la NTE / RAR?', ['Sí', 'No', 's/d']], ['OBSERVACIONES', 'Observaciones', null, 1]], v,
    async out => {
      if (!out.APELLIDO_Y_NOMBRE) return 'Falta el apellido y nombre.';
      const datos = Object.assign({ ID: p ? p.ID : '', ESTABLECIMIENTO: D.cod }, out); if (arch.doc) datos.archivo = arch.doc;
      const r = await api('p_rad_persona_guardar', datos, 120000); if (!r.ok) return r.mensaje || 'No se pudo guardar.';
      radRecargar(D, (p ? 'Cambios guardados.' : 'Persona agregada.') + (r.avisoComunicar ? ' ' + r.avisoComunicar : '')); return '';
    }, radSubir('doc', 'Documento (opcional): autorización individual, nota de alta…', false) + '<p class="mu peq" style="margin:0">Al escribir el DNI, si la persona está en la base de trabajadores, se completan los datos. Los cambios de estado o de dosímetro quedan solos en «Movimientos».</p>');
  radInputs(arch);
  const q = k => document.querySelector('#ov [data-k="' + k + '"]'), dni = q('DNI');
  if (dni) dni.onchange = async () => { if (String(dni.value).replace(/\D/g, '').length < 7) return;
    try { const r = await api('p_rad_dni', { dni: dni.value }); if (r.ok && r.persona) { const P = r.persona;
      [['APELLIDO_Y_NOMBRE', P.nombre], ['CUIL', P.cuil], ['SERVICIO', P.servicio], ['FUNCION', P.funcion]].forEach(([k, val]) => { const el = q(k); if (el && !el.value && val) el.value = val; });
      toast('Encontrado en la base de trabajadores: ' + P.nombre + (P.est && P.est !== D.cod ? ' (figura en ' + P.est + ')' : '') + '.'); } } catch (e) {} };
}
function radBajaForm(D, p) {
  const arch = {};
  modal('Baja del dosímetro · ' + p.APELLIDO_Y_NOMBRE, [['TIPO', 'Tipo de baja', ['Baja a pedido del trabajador', 'Baja por fin de exposición']], ['BAJA_DOSIMETRO', 'Fecha de baja', 'date'], ['MOTIVO_BAJA', 'Motivo', null, 1]],
    { TIPO: 'Baja a pedido del trabajador', BAJA_DOSIMETRO: new Date().toISOString().slice(0, 10) },
    async out => {
      if (!out.TIPO || !out.BAJA_DOSIMETRO) return 'Elegí el tipo y la fecha.';
      const datos = { ID: p.ID, ESTABLECIMIENTO: D.cod, APELLIDO_Y_NOMBRE: p.APELLIDO_Y_NOMBRE, DNI: p.DNI, ESTADO_DOSIMETRO: out.TIPO, BAJA_DOSIMETRO: out.BAJA_DOSIMETRO, MOTIVO_BAJA: out.MOTIVO_BAJA, movimiento: { tipo: out.TIPO, detalle: out.MOTIVO_BAJA } };
      if (arch.doc) datos.archivo = arch.doc;
      const r = await api('p_rad_persona_guardar', datos, 120000); if (!r.ok) return r.mensaje || 'No se pudo guardar.';
      radRecargar(D, 'Baja registrada. ' + (r.avisoComunicar || '')); return '';
    }, radSubir('doc', 'Nota o pedido firmado (opcional)', false) + '<p class="mu peq" style="margin:0">La persona no se borra: queda «de baja» y se puede reactivar. El historial queda en «Movimientos».</p>');
  radInputs(arch);
}
function radReactivarForm(D, p) {
  const arch = {};
  modal('Reactivar dosímetro · ' + p.APELLIDO_Y_NOMBRE, [['ALTA_DOSIMETRO', 'Fecha de la nueva alta', 'date'], ['DOSIMETRO_NRO', 'Número de dosímetro'], radSitF(D), ['SECTOR_EXPOSICION', 'Sector donde se expone', D.listas.sectores], ['DETALLE', 'Detalle', null, 1]],
    { ALTA_DOSIMETRO: new Date().toISOString().slice(0, 10), DOSIMETRO_NRO: p.DOSIMETRO_NRO, SECTOR_EXPOSICION: p.SECTOR_EXPOSICION, SITIO: p.SITIO },
    async out => {
      const datos = { ID: p.ID, ESTABLECIMIENTO: D.cod, APELLIDO_Y_NOMBRE: p.APELLIDO_Y_NOMBRE, DNI: p.DNI, ESTADO_DOSIMETRO: 'Activo', ALTA_DOSIMETRO: out.ALTA_DOSIMETRO, DOSIMETRO_NRO: out.DOSIMETRO_NRO, SECTOR_EXPOSICION: out.SECTOR_EXPOSICION, SITIO: out.SITIO,
        BAJA_DOSIMETRO: '', MOTIVO_BAJA: '', movimiento: { tipo: 'Reactivación', detalle: (out.DETALLE || '') + (p.BAJA_DOSIMETRO ? ' (baja anterior ' + fechaTxt(p.BAJA_DOSIMETRO) + ')' : '') } };
      if (arch.doc) datos.archivo = arch.doc;
      const r = await api('p_rad_persona_guardar', datos, 120000); if (!r.ok) return r.mensaje || 'No se pudo guardar.';
      radRecargar(D, 'Dosímetro reactivado. ' + (r.avisoComunicar || '')); return '';
    }, radSubir('doc', 'Nota o pedido (opcional)', false));
  radInputs(arch);
}

// ---------- Controles mensuales
function radCon(D) {
  const por = {}, cub = D.cubiertos || {}; D.controles.filter(c => c.ESTADO !== 'Anulado').forEach(c => por[c.PERIODO] = c);
  return '<section class="card"><div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;align-items:center"><h2>Últimos 12 meses</h2><div class="cpn"><button class="btn pri" id="rcInforme">Cargar informe de dosis (PDF)</button><button class="btn sec" id="rcNuevo">Subir solo el PDF del mes</button>' + radLink(D.carpetaDosimetria, 'Carpeta de dosimetría') + '</div></div>' +
    '<p class="mu peq" style="margin-top:0">«Cargar informe de dosis»: elegís el PDF del servicio de dosimetría (MKS), el sistema lee la tabla y te la muestra para revisar; al guardar, el PDF queda en la carpeta del establecimiento › Dosimetría › año y los valores de cada persona en «Dosis por persona». Un mes figura cubierto si tiene control o dosis informadas.</p>' +
    '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px">' + D.meses.map(m => { const c = por[m];
      const ok = c || cub[m];
      return '<button class="btn sec" data-mes="' + m + '" style="flex-direction:column;align-items:flex-start;min-height:64px;' + (ok ? (c && c.CON_ANORMALES === 'Sí' ? 'border-color:var(--er)' : 'border-color:var(--ok)') : 'border-style:dashed') + '"><b>' + radMes(m) + '</b><span class="peq ' + (ok ? '' : 'mu') + '">' + (c ? (c.CON_ANORMALES === 'Sí' ? 'Con anormales' : 'Cargado') : cub[m] ? 'Cubierto por informe' : 'Falta') + '</span></button>'; }).join('') + '</div></section>' +
    '<section class="card tabla"><div style="overflow-x:auto"><table><thead><tr><th>Mes</th><th>Servicio de dosimetría</th><th>Recibido</th><th>PDF</th><th>Anormales</th><th>Observaciones</th><th></th></tr></thead><tbody>' +
    (D.controles.length ? D.controles.map(c => '<tr' + (c.ESTADO === 'Anulado' ? ' style="opacity:.5"' : '') + '><td><b>' + radMes(c.PERIODO) + '</b>' + radSitTxt(c) + (c.ESTADO === 'Anulado' ? ' <span class="chip gr mini">Anulado</span>' : '') + '</td><td>' + esc(c.PROVEEDOR || '—') + '</td><td>' + fechaTxt(c.FECHA_RECEPCION) + '</td><td>' + radLink(c.ARCHIVO, 'PDF') + '</td><td>' + (c.CON_ANORMALES === 'Sí' ? '<span class="chip er">Sí</span>' : esc(c.CON_ANORMALES || 's/d')) + '</td><td class="peq">' + esc(c.OBSERVACIONES || '') + '</td><td><button class="btn sec" data-con="' + esc(c.ID) + '">Editar</button></td></tr>').join('')
      : '<tr><td colspan="7" class="mu">Todavía no hay controles cargados.</td></tr>') + '</tbody></table></div></section>';
}
function radConEv(D) {
  const ult = (D.controles[0] || {}).PROVEEDOR || '';
  $('rcNuevo').onclick = () => radConForm(D, null, { PERIODO: D.meses[0], PROVEEDOR: ult });
  $('rcInforme').onclick = () => radDosisForm(D);
  document.querySelectorAll('[data-mes]').forEach(b => b.onclick = () => { const c = D.controles.find(x => x.PERIODO === b.dataset.mes && x.ESTADO !== 'Anulado'); radConForm(D, c || null, c ? null : { PERIODO: b.dataset.mes, PROVEEDOR: ult }); });
  document.querySelectorAll('[data-con]').forEach(b => b.onclick = () => radConForm(D, D.controles.find(c => c.ID === b.dataset.con)));
}
function radConForm(D, c, base) {
  const arch = {}, v = Object.assign({ CON_ANORMALES: 'No', SITIO: RADF.sitio, FECHA_RECEPCION: new Date().toISOString().slice(0, 10) }, base || c || {});
  modal(c ? 'Control dosimétrico · ' + radMes(c.PERIODO) : 'Subir control dosimétrico', [['PERIODO', 'Mes del control (aaaa-mm)', D.meses.concat(c && !D.meses.includes(c.PERIODO) ? [c.PERIODO] : [])], ['SITIO', 'Sitio (vacío = todo el establecimiento)', D.sitios.map(s => s.SITIO)], ['PROVEEDOR', 'Servicio de dosimetría'], ['FECHA_RECEPCION', 'Fecha en que llegó', 'date'],
    ['CON_ANORMALES', '¿Trae valores anormales?', ['Sí', 'No', 's/d']], ['ESTADO', 'Estado', ['Vigente', 'Anulado']], ['OBSERVACIONES', 'Observaciones', null, 1]], Object.assign({ ESTADO: 'Vigente' }, v),
    async out => {
      if (!c && !arch.pdf) return 'Elegí el PDF del control.';
      const datos = Object.assign({ ID: c ? c.ID : '', ESTABLECIMIENTO: D.cod }, out); if (arch.pdf) datos.archivo = arch.pdf;
      const r = await api('p_rad_control_guardar', datos, 120000); if (!r.ok) return r.mensaje || 'No se pudo guardar.';
      radRecargar(D, 'Control guardado.' + (r.aviso ? ' ' + r.aviso : '')); return '';
    }, radSubir('pdf', 'PDF del control (máx. 6 MB)', c && c.ARCHIVO));
  radInputs(arch);
}

// ---------- Dosis por persona (19/10/2026): informe del servicio de dosimetría leído del PDF (formato MKS) o cargado a mano
// Lector de informes de dosis MKS (mismo código que va en modulos/radiaciones.js)
function radMksParse(items) {
  const txt = items.map(i => i.s).join(' ').replace(/\s+/g, ' ');
  const g = re => { const m = re.exec(txt); return m ? m[1].trim() : ''; };
  const cab = { PROVEEDOR: /MKS/i.test(txt) ? 'MKS' : '', REPORTE_NRO: g(/Reporte de Dosis\s+(\S+)/i), ID_ENVIO: g(/Id-Envio\s+(\d+)/i),
    SERVICIO_PROVEEDOR: g(/Servicio:\s*(.+?)\s+-?\s*CTA/i), FECHA_EMISION: g(/Fecha de Emisi[oó]n:\s*(\d{4}-\d{2}-\d{2})/i), DEPENDENCIA: g(/Dependencia:\s*(.+?)\s+Direcci[oó]n/i) };
  const COLS = [['U', /^Usuario$/i], ['DOSIMETRO', /^Dos[ií]metro$/i], ['TIPO', /^Tipo$/i], ['INT', /^Intervalo$/i], ['DOSIS_MSV', /^Dosis/i], ['SEGUIMIENTO', /^Seguimiento$/i], ['OBSERVACION', /^Obs/i], ['ANUAL_C', /^Anual-C/i], ['ANUAL_12', /^Anual-12/i]];
  const MES = { ene: 1, feb: 2, mar: 3, abr: 4, may: 5, jun: 6, jul: 7, ago: 8, sep: 9, set: 9, oct: 10, nov: 11, dic: 12 };
  const filas = [];
  [...new Set(items.map(i => i.p))].forEach(pg => {
    const P0 = items.filter(i => i.p === pg), U = P0.find(i => COLS[0][1].test(i.s.trim())); if (!U) return;
    const P = P0.filter(i => Math.abs(i.y - U.y) <= 3 || i.y < U.y - 3), T = P0.filter(i => Math.abs(i.y - U.y) <= 3);   // T: la línea de títulos
    const hd = COLS.map(c => T.find(i => c[1].test(i.s.trim())));
    // títulos pegados en un solo texto (p. ej. «Anual-C* Anual-12*»): se reparten a lo ancho
    COLS.forEach((c, k) => { if (hd[k]) return; const j = T.find(i => i.s.trim().split(/\s+/).some(w => c[1].test(w)) && i.s.trim().split(/\s+/).length > 1);
      if (j) { const w = j.s.trim().split(/\s+/), pos = w.findIndex(x => c[1].test(x)); hd[k] = { x: j.x + j.w * pos / w.length, w: j.w / w.length, y: j.y }; } });
    if (hd.some(h => !h)) return;
    const yH = Math.min(...hd.map(h => h.y)), cen = hd.map(h => h.x + h.w / 2);
    const fin = P.filter(i => i.y < yH - 2 && /^(•|Cálculos|REFERENCIAS)/.test(i.s.trim())).map(i => i.y);
    const yFin = fin.length ? Math.max(...fin) : -1e9;
    const cuerpo = P.filter(i => i.y < yH - 2 && i.y > yFin + 1).sort((a, b) => b.y - a.y || a.x - b.x);
    let fila = null;
    // líneas: ítems con la misma altura (±2)
    const lineas = []; cuerpo.forEach(i => { const l = lineas.find(l => Math.abs(l.y - i.y) <= 2); if (l) l.it.push(i); else lineas.push({ y: i.y, it: [i] }); });
    lineas.forEach(l => {
      const col = i => { const c = i.x + i.w / 2; let k = 0; cen.forEach((x, j) => { if (Math.abs(c - x) < Math.abs(c - cen[k])) k = j; }); return COLS[k][0]; };
      if (l.it.some(i => col(i) === 'DOSIMETRO' && /\d+\/\d+/.test(i.s))) { fila = {}; filas.push(fila); }
      if (!fila) return;
      l.it.sort((a, b) => a.x - b.x).forEach(i => { const k = col(i); fila[k] = ((fila[k] || '') + ' ' + i.s).trim(); });
    });
  });
  const mes = t => { const m = /([a-z]{3})(\d{2})/i.exec(t || ''); return m && MES[m[1].toLowerCase()] ? '20' + m[2] + '-' + ('0' + MES[m[1].toLowerCase()]).slice(-2) : ''; };
  const num = t => { const m = /^\s*(\d+(?:[.,]\d+)?)\s*$/.exec(t || ''); return m ? m[1].replace(',', '.') : ''; };
  return { cab: cab, filas: filas.map(f => { const u = f.U || '', dni = (/DNI-?\s*(\d{6,9})/i.exec(u) || [])[1] || '', iv = String(f.INT || '').split('-').map(s => s.trim()).filter(Boolean);
    return { APELLIDO_Y_NOMBRE: u.replace(/DNI-?\s*\d+/i, '').replace(/\s+/g, ' ').trim(), DNI: dni, DOSIMETRO: (f.DOSIMETRO || '').replace(/\s+/g, ''), TIPO: (f.TIPO || '').trim(),
      PERIODO_DESDE: mes(iv[0]), PERIODO_HASTA: mes(iv[iv.length - 1]), DOSIS_MSV: num(f.DOSIS_MSV),
      // «<NR*» en la columna de dosis (menor al nivel de registro) pasa a la observación
      OBSERVACION: [(f.OBSERVACION || '').trim(), !num(f.DOSIS_MSV) && !/^\s*-*\s*$/.test(f.DOSIS_MSV || '') ? String(f.DOSIS_MSV).replace(/\*/g, '').trim() : ''].filter(Boolean).join(' '), ANUAL_C: num(f.ANUAL_C), ANUAL_12: num(f.ANUAL_12),
      SEGUIMIENTO: (f.SEGUIMIENTO || '').replace(/\s*-\s*$/, '').replace(/\s+/g, ' ').trim() }; }) };
}

// pdf.js (cdnjs) para leer el texto del PDF en el navegador; nada sale del portal hasta tocar «Guardar»
async function radPdfJs() {
  if (window.pdfjsLib) return window.pdfjsLib;
  await new Promise((ok, mal) => { const sc = document.createElement('script'); sc.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'; sc.onload = ok; sc.onerror = () => mal(new Error('No se pudo cargar el lector de PDF.')); document.head.appendChild(sc); });
  window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'; return window.pdfjsLib;
}
async function radPdfItems(dataUrl) {
  const lib = await radPdfJs(), bin = atob(dataUrl.split(',')[1]), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  const pdf = await lib.getDocument({ data: u }).promise, items = [];
  for (let i = 1; i <= pdf.numPages; i++) { const tc = await (await pdf.getPage(i)).getTextContent(); tc.items.forEach(t => { if (t.str && t.str.trim()) items.push({ p: i, x: t.transform[4], y: t.transform[5], w: t.width, s: t.str }); }); }
  return items;
}
const RAD_DOS_COL = [['APELLIDO_Y_NOMBRE', 'Apellido y nombre', 190], ['DNI', 'DNI', 95], ['DOSIMETRO', 'Dosímetro', 120], ['TIPO', 'Tipo', 50], ['PERIODO_DESDE', 'Desde (aaaa-mm)', 90], ['PERIODO_HASTA', 'Hasta (aaaa-mm)', 90],
  ['DOSIS_MSV', 'Dosis (mSv)', 70], ['OBSERVACION', 'Obs.', 60], ['ANUAL_C', 'Anual calendario', 70], ['ANUAL_12', 'Últimos 12 meses', 70], ['SEGUIMIENTO', 'Seguimiento', 170]];
function radDosisForm(D) {
  const arch = {}, F = { filas: [] }, sitProsate = (D.sitios.find(s => /prosate/i.test(s.SITIO)) || {}).SITIO || '';
  const tabla = () => '<div style="overflow-x:auto;margin-top:10px"><table class="peq"><thead><tr>' + RAD_DOS_COL.map(c => '<th>' + c[1] + '</th>').join('') + '<th></th></tr></thead><tbody>' +
    F.filas.map((f, i) => '<tr>' + RAD_DOS_COL.map(c => '<td><input class="c" data-df="' + i + '|' + c[0] + '" value="' + esc(f[c[0]] || '') + '" style="min-width:' + c[2] + 'px;padding:4px 6px;font-size:12.5px"></td>').join('') + '<td><button class="btn sec" data-dq="' + i + '" style="min-height:28px;padding:2px 8px">Quitar</button></td></tr>').join('') +
    '</tbody></table></div><button class="btn sec" id="dfMas" style="margin-top:6px">+ Agregar fila a mano</button>';
  const pintar = () => { const c = $('dfTabla'); if (!c) return; c.innerHTML = tabla();
    c.querySelectorAll('[data-df]').forEach(x => x.oninput = () => { const [i, k] = x.dataset.df.split('|'); F.filas[+i][k] = x.value; });
    c.querySelectorAll('[data-dq]').forEach(x => x.onclick = () => { F.filas.splice(+x.dataset.dq, 1); pintar(); });
    $('dfMas').onclick = () => { F.filas.push({ TIPO: 'CE' }); pintar(); }; };
  modal('Cargar informe de dosis · ' + radNom(D.cod), [['SITIO', 'Sitio (vacío = todo el establecimiento)', D.sitios.map(s => s.SITIO)], ['PROVEEDOR', 'Servicio de dosimetría'], ['REPORTE_NRO', 'N.º de reporte'], ['ID_ENVIO', 'Id. de envío'],
    ['SERVICIO_PROVEEDOR', 'Servicio según el informe'], ['FECHA_EMISION', 'Fecha de emisión', 'date'], ['sumarPersonal', 'Si alguien no está en «Personal y dosímetros», ¿lo agrego?', ['Sí', 'No']]],
    { SITIO: RADF.sitio || '', PROVEEDOR: 'MKS', sumarPersonal: 'Sí' },
    async out => {
      if (!arch.pdf) return 'Elegí el PDF del informe.';
      const filas = F.filas.filter(f => f.APELLIDO_Y_NOMBRE || f.DNI); if (!filas.length) return 'No hay filas: revisá el PDF o agregalas a mano.';
      const malas = filas.filter(f => !/^\d{4}-\d{2}$/.test(f.PERIODO_DESDE || '') || !/^\d{4}-\d{2}$/.test(f.PERIODO_HASTA || '')); if (malas.length) return 'Revisá los períodos (aaaa-mm) de ' + malas.length + ' fila(s).';
      const r = await api('p_rad_dosis_guardar', Object.assign({ ESTABLECIMIENTO: D.cod, archivo: arch.pdf, filas: filas }, out, { sumarPersonal: out.sumarPersonal === 'Sí' }), 180000);
      if (!r.ok) return r.mensaje || 'No se pudo guardar.';
      radRecargar(D, r.filas + ' fila(s) de dosis cargadas' + (r.nuevas ? ', ' + r.nuevas + ' persona(s) nueva(s) en Personal' : '') + ' · control de ' + radMes(r.periodo) + '.' + (r.aviso ? ' ' + r.aviso : '')); return '';
    }, '<label class="f ancho">PDF del informe (máx. 6 MB)<input class="c" type="file" accept="application/pdf" id="dfPdf"><span class="mu peq" id="dfMsg">Al elegirlo, el sistema lee la tabla del informe (formato MKS). Revisá y corregí antes de guardar.</span></label><div id="dfTabla"></div>');
  pintar();
  $('dfPdf').onchange = async e => { const f = e.target.files[0]; if (!f) return; const msg = $('dfMsg');
    try { arch.pdf = await radLeerArchivo(f); msg.textContent = 'Leyendo el PDF…';
      const r = radMksParse(await radPdfItems(arch.pdf)), set = (k, v) => { const el = document.querySelector('#ov [data-k="' + k + '"]'); if (el && v) el.value = v; };
      set('PROVEEDOR', r.cab.PROVEEDOR); set('REPORTE_NRO', r.cab.REPORTE_NRO); set('ID_ENVIO', r.cab.ID_ENVIO); set('SERVICIO_PROVEEDOR', r.cab.SERVICIO_PROVEEDOR); set('FECHA_EMISION', r.cab.FECHA_EMISION);
      if (/prosate/i.test(r.cab.SERVICIO_PROVEEDOR) && sitProsate) set('SITIO', sitProsate);
      F.filas = r.filas; pintar();
      msg.textContent = r.filas.length ? 'Leí ' + r.filas.length + ' fila(s)' + (r.cab.DEPENDENCIA ? ' de «' + r.cab.DEPENDENCIA + '»' : '') + '. Revisá y tocá Guardar.' : 'No pude leer la tabla (¿es de otro servicio de dosimetría?). Podés cargar las filas a mano con «+ Agregar fila».';
    } catch (er) { msg.textContent = (er && er.message) || 'No se pudo leer el PDF.'; } };
}
function radDos(D) {
  const L = D.dosis || [], q = (RADF.q || '').toLowerCase(), F = q ? L.filter(d => (d.APELLIDO_Y_NOMBRE + ' ' + d.DNI).toLowerCase().indexOf(q) >= 0) : L, lim = D.limites || { anual: 50, periodo: 30 };
  const n = v => v === '' || v == null ? '' : String(v), alto = d => (Number(d.DOSIS_MSV) > lim.periodo) || (Number(d.ANUAL_C) > lim.anual) || (Number(d.ANUAL_12) > lim.anual);
  const obs = o => /LIM/i.test(o) ? '<span title="Debajo del límite de medición: se asigna 0,05 mSv">&lt;LIMx</span>' : o === '2' ? '<span title="Dosímetro recibido tarde: se informa en el próximo informe" class="chip wa mini">llegó tarde</span>' : /NR/i.test(o) ? '<span title="Menor al nivel de registro">&lt;NR</span>' : /^[BC\s]+$/i.test(o || '') ? '<a class="chip wa mini" href="#radest/' + encodeURIComponent(D.cod) + '/inv" title="B: dosímetro irradiado en condición estática o por radiación primaria. C: posibilidad de superar 6 mSv/año (ICRP). Se abrió un caso en Investigaciones.">' + esc(o) + ' · a investigar</a>' : esc(o || '');
  return '<section class="card tabla"><div style="padding:14px 18px;border-bottom:1px solid var(--ln);display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;align-items:center"><div><h2>Dosis por persona</h2><span class="mu peq">Del informe periódico del servicio de dosimetría. Límites: ' + lim.periodo + ' mSv por período (trimestre) y ' + lim.anual + ' mSv por año (Res. SS 273/86).</span></div><div class="cpn"><input class="c" id="dsQ" placeholder="Buscar persona o DNI" value="' + esc(RADF.q || '') + '" style="min-width:200px"><button class="btn pri" id="dsNuevo">Cargar informe de dosis (PDF)</button>' + radLink(D.carpetaDosimetria, 'Carpeta de dosimetría') + '</div></div>' +
    '<div style="overflow-x:auto"><table><thead><tr><th>Persona</th><th>Dosímetro</th><th>Período</th><th>Dosis (mSv)</th><th>Obs.</th><th>Anual calendario</th><th>Últimos 12 meses</th><th>Informe</th></tr></thead><tbody>' +
    (F.length ? F.map(d => '<tr' + (alto(d) ? ' style="background:#FDECEA"' : '') + '><td><b>' + esc(d.APELLIDO_Y_NOMBRE) + '</b><div class="mu peq">DNI ' + esc(d.DNI || 's/d') + (d.ID_PERSONA ? '' : ' · <span style="color:var(--wa)">no está en Personal</span>') + '</div>' + radSitTxt(d) + '</td><td class="peq">' + esc(d.DOSIMETRO || '') + '<div class="mu">' + esc(d.TIPO || '') + '</div></td>' +
      '<td>' + radMes(d.PERIODO_DESDE) + (d.PERIODO_HASTA && d.PERIODO_HASTA !== d.PERIODO_DESDE ? ' a ' + radMes(d.PERIODO_HASTA) : '') + '</td><td>' + (n(d.DOSIS_MSV) || '<span class="mu">—</span>') + '</td><td class="peq">' + obs(d.OBSERVACION) + '</td><td>' + n(d.ANUAL_C) + '</td><td>' + n(d.ANUAL_12) + '</td>' +
      '<td class="peq">' + radLink(d.ARCHIVO, (d.PROVEEDOR || 'PDF') + (d.REPORTE_NRO ? ' ' + d.REPORTE_NRO : '')) + (d.FECHA_EMISION ? '<div class="mu">' + fechaTxt(d.FECHA_EMISION) + '</div>' : '') + '</td></tr>').join('')
      : '<tr><td colspan="8" class="mu">Todavía no hay dosis cargadas. Tocá «Cargar informe de dosis (PDF)».</td></tr>') + '</tbody></table></div></section>' +
    '<p class="mu peq">«&lt;LIMx»: exposición debajo del límite de medición (el servicio asigna 0,05 mSv al anual). «Llegó tarde»: el dosímetro llegó después de tiempo y su dosis viene en el próximo informe. «B» o «C»: el servicio marca la dosis para investigar (se abre el caso en «Investigaciones»). En rojo, lo que supera los límites. Si el portal falla: planilla del módulo, hoja DOSIS.</p>';
}
function radDosEv(D) {
  $('dsNuevo').onclick = () => radDosisForm(D);
  const q = $('dsQ'); if (q) q.oninput = () => { RADF.q = q.value; clearTimeout(radDosEv.t); radDosEv.t = setTimeout(() => { radEst(encodeURIComponent(D.cod) + '/dos'); const i = $('dsQ'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }, 300); };
}

// ---------- Investigaciones (0.4): dosis a investigar aunque no superen el límite legal
const RAD_INV_CHIP = e => '<span class="chip ' + (e === 'Cerrado' ? 'ok' : e === 'Anulado' ? 'gr' : e === 'En análisis' ? 'wa' : 'er') + '">' + esc(e || 'Abierto') + '</span>';
function radInv(D) {
  const L = D.investigaciones || [], ab = L.filter(c => /Abierto|análisis/.test(c.ESTADO)).length;
  return '<section class="card tabla"><div style="padding:14px 18px;border-bottom:1px solid var(--ln);display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;align-items:center"><div><h2>Investigaciones de dosis' + (ab ? ' · ' + ab + ' abierta(s)' : '') + '</h2><span class="mu peq">Dosis que el servicio de dosimetría marca para investigar aunque no superen el límite legal (observación B o C). Se abren solas al cargar el informe de dosis.</span></div><div class="cpn"><button class="btn sec" id="riRev">Revisar dosis cargadas</button><button class="btn pri" id="riNuevo">Abrir caso a mano</button></div></div>' +
    '<div style="overflow-x:auto"><table><thead><tr><th>Persona</th><th>Período y dosis</th><th>Motivo</th><th>Causa probable</th><th>Estado</th><th></th></tr></thead><tbody>' +
    (L.length ? L.map(c => '<tr><td><b>' + esc(c.APELLIDO_Y_NOMBRE) + '</b><div class="mu peq">DNI ' + esc(c.DNI || 's/d') + (c.DOSIMETRO ? ' · dosímetro ' + esc(c.DOSIMETRO) : '') + '</div>' + radSitTxt(c) + '</td>' +
      '<td>' + esc(String(c.PERIODO || '').split(' a ').map(radMes).join(' a ')) + '<div class="peq">' + (c.DOSIS_MSV !== '' && c.DOSIS_MSV != null ? '<b>' + esc(c.DOSIS_MSV) + ' mSv</b>' : '—') + (c.OBSERVACION_PROVEEDOR ? ' · obs. ' + esc(c.OBSERVACION_PROVEEDOR) : '') + '</div><div class="mu peq">anual ' + esc(c.ANUAL_C || '—') + ' · 12 meses ' + esc(c.ANUAL_12 || '—') + '</div></td>' +
      '<td class="peq" style="max-width:320px">' + esc(c.MOTIVO) + '</td><td class="peq">' + esc(c.CAUSA_PROBABLE || 's/d') + (c.CONCLUSION ? '<div class="mu">' + esc(String(c.CONCLUSION).slice(0, 120)) + '</div>' : '') + '</td>' +
      '<td>' + RAD_INV_CHIP(c.ESTADO) + '<div class="mu peq">' + (c.FECHA_CIERRE ? 'cerrado ' + fechaTxt(c.FECHA_CIERRE) : 'desde ' + fechaTxt(c.FECHA_DETECCION)) + '</div></td>' +
      '<td style="white-space:nowrap">' + (c.ARCHIVO ? radLink(c.ARCHIVO, 'Archivo') + ' ' : '') + '<button class="btn sec" data-inv="' + esc(c.ID) + '">Seguir caso</button></td></tr>').join('')
      : '<tr><td colspan="6" class="mu">No hay casos. Se abren solos cuando el informe de dosis trae una observación B o C.</td></tr>') + '</tbody></table></div></section>' +
    '<p class="mu peq">B: dosímetro irradiado en condición estática o expuesto a radiación primaria (uso o guardado inadecuado, modalidad de trabajo o radioprotección deficiente). C: la dosis del período indica la posibilidad de superar 6 mSv/año (recomendación ICRP). Pasos sugeridos: entrevistar a la persona (dónde guarda el dosímetro, si lo usó otra persona, tareas del período), revisar la sala, el blindaje y los elementos plomados, y dejar la conclusión y las medidas. Si la dosis supera la norma, además se carga el evento «Registro anormal» y se comunica a la autoridad sanitaria (Dto. 6320/68, art. 20). Si el portal falla: planilla del módulo, hoja INVESTIGACIONES.</p>';
}
function radInvEv(D) {
  $('riNuevo').onclick = () => radInvForm(D, null);
  $('riRev').onclick = async () => { const r = await api('p_rad_inv_revisar', {}, 180000); if (!r.ok) return toast(r.mensaje || 'No se pudo revisar.'); radRecargar(D, r.nuevas ? r.nuevas + ' caso(s) nuevo(s).' : 'No había dosis nuevas para investigar.'); };
  document.querySelectorAll('[data-inv]').forEach(b => b.onclick = () => radInvForm(D, (D.investigaciones || []).find(c => c.ID === b.dataset.inv)));
}
function radInvForm(D, c) {
  const arch = {}, per = D.personal.map(p => p.APELLIDO_Y_NOMBRE + ' · DNI ' + (p.DNI || 's/d'));
  const v = Object.assign({ ESTADO: 'Abierto', CAUSA_PROBABLE: 's/d (en análisis)', SITIO: RADF.sitio }, c || {});
  const pe = c && D.personal.find(p => p.ID === c.ID_PERSONA); if (pe) v.PERSONA = pe.APELLIDO_Y_NOMBRE + ' · DNI ' + (pe.DNI || 's/d');
  const L = D.listas || {}, campos = (c ? [] : [['PERSONA', 'Persona', per], radSitF(D), ['PERIODO', 'Período (aaaa-mm)', D.meses], ['DOSIS_MSV', 'Dosis del período (mSv)'], ['OBSERVACION_PROVEEDOR', 'Observación del servicio de dosimetría'], ['MOTIVO', 'Motivo de la investigación', null, 1]])
    .concat([['ENTREVISTA', 'Entrevista con la persona (dónde guarda el dosímetro, si lo usó otra persona, tareas del período)', null, 1], ['CAUSA_PROBABLE', 'Causa probable', L.causasInv || []], ['MEDIDAS', 'Medidas tomadas o propuestas', null, 1],
      ['COMUNICADO_A', 'Comunicado a (jefatura, Dirección, autoridad…)'], ['FECHA_COMUNICACION', 'Fecha de comunicación', 'date'], ['CONCLUSION', 'Conclusión (obligatoria para cerrar)', null, 1], ['ESTADO', 'Estado', L.estadosInv || ['Abierto', 'En análisis', 'Cerrado', 'Anulado']]]);
  const cab = c ? '<div class="card" style="background:var(--bg2,#F4F7F8);margin-bottom:8px"><b>' + esc(c.APELLIDO_Y_NOMBRE) + '</b> · DNI ' + esc(c.DNI || 's/d') + '<div class="peq">' + esc(String(c.PERIODO || '').split(' a ').map(radMes).join(' a ')) + ' · ' + esc(c.DOSIS_MSV !== '' ? c.DOSIS_MSV + ' mSv' : 's/d') + (c.OBSERVACION_PROVEEDOR ? ' · obs. ' + esc(c.OBSERVACION_PROVEEDOR) : '') + '</div><div class="mu peq">' + esc(c.MOTIVO) + '</div></div>' : '';
  modal(c ? 'Investigación · ' + c.APELLIDO_Y_NOMBRE : 'Abrir caso de investigación', campos, v,
    async out => {
      const datos = Object.assign({ ID: c ? c.ID : '', ESTABLECIMIENTO: D.cod }, out);
      if (!c) { const i = per.indexOf(out.PERSONA), p = i >= 0 ? D.personal[i] : null; delete datos.PERSONA; if (!p) return 'Elegí la persona.'; datos.ID_PERSONA = p.ID; }
      if (datos.ESTADO === 'Cerrado' && !String(datos.CONCLUSION || '').trim()) return 'Para cerrar el caso, escribí la conclusión.';
      if (arch.doc) datos.archivo = arch.doc;
      const r = await api('p_rad_inv_guardar', datos, 120000); if (!r.ok) return r.mensaje || 'No se pudo guardar.';
      radRecargar(D, 'Caso guardado.'); return '';
    }, radSubir('doc', 'Archivo (opcional): acta de entrevista, nota, fotos, informe', c && c.ARCHIVO));
  if (cab) document.querySelector('#ov .campos').insertAdjacentHTML('beforebegin', cab);
  radInputs(arch);
}

// ---------- Eventos
function radEve(D) {
  return '<section class="card tabla"><div style="padding:14px 18px;border-bottom:1px solid var(--ln);display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;align-items:center"><h2>Eventos</h2><button class="btn pri" id="reNuevo">Cargar evento</button></div><div style="overflow-x:auto"><table><thead><tr><th>Fecha</th><th>Tipo</th><th>Persona</th><th>Dosis / período</th><th>Comunicado</th><th>Estado</th><th></th></tr></thead><tbody>' +
    (D.eventos.length ? D.eventos.map(e => '<tr><td>' + fechaTxt(e.FECHA) + '</td><td><b>' + esc(e.TIPO) + '</b><div class="mu peq">' + esc(String(e.DESCRIPCION || '').slice(0, 120)) + '</div>' + radSitTxt(e) + '</td><td>' + esc(e.APELLIDO_Y_NOMBRE || '—') + '</td>' +
      '<td>' + esc(e.DOSIS_MSV ? e.DOSIS_MSV + ' mSv' : '—') + (e.PERIODO ? '<div class="mu peq">' + radMes(e.PERIODO) + '</div>' : '') + '</td><td class="peq">' + (e.FECHA_COMUNICACION ? fechaTxt(e.FECHA_COMUNICACION) + '<div class="mu">' + esc(e.COMUNICADO_A || '') + '</div>' : '<span class="mu">—</span>') + '</td>' +
      '<td><span class="chip ' + (/Cerrado/.test(e.ESTADO) ? 'ok' : /Anulado/.test(e.ESTADO) ? 'gr' : 'er') + '">' + esc(e.ESTADO) + '</span></td><td style="white-space:nowrap">' + (e.ARCHIVO ? radLink(e.ARCHIVO, 'Archivo') + ' ' : '') + '<button class="btn sec" data-eve="' + esc(e.ID) + '">Editar</button></td></tr>').join('')
      : '<tr><td colspan="7" class="mu">Sin eventos cargados.</td></tr>') + '</tbody></table></div></section>' +
    '<p class="mu peq">Una exposición accidental superior a la norma se notifica de inmediato a la autoridad sanitaria (Dto. 6320/68, art. 20). Un extravío nuevo deja el dosímetro de la persona como «Extraviado»; cuando se repone, editá la persona con el nuevo número y estado «Activo».</p>';
}
function radEveEv(D) {
  $('reNuevo').onclick = () => radEveForm(D, null);
  document.querySelectorAll('[data-eve]').forEach(b => b.onclick = () => radEveForm(D, D.eventos.find(e => e.ID === b.dataset.eve)));
}
function radEveForm(D, e) {
  const arch = {}, per = D.personal.map(p => p.APELLIDO_Y_NOMBRE + ' · DNI ' + (p.DNI || 's/d'));
  const v = Object.assign({ FECHA: new Date().toISOString().slice(0, 10), ESTADO: 'Abierto', SITIO: RADF.sitio }, e || {});
  const pe = e && D.personal.find(p => p.ID === e.ID_PERSONA); if (pe) v.PERSONA = pe.APELLIDO_Y_NOMBRE + ' · DNI ' + (pe.DNI || 's/d');
  modal(e ? 'Evento · ' + e.TIPO : 'Cargar evento', [['TIPO', 'Tipo', D.listas.tiposEve], ['FECHA', 'Fecha', 'date'], radSitF(D), ['PERSONA', 'Persona (si corresponde)', per], ['PERIODO', 'Mes del control (aaaa-mm, si corresponde)', D.meses],
    ['DOSIS_MSV', 'Dosis informada (mSv)'], ['DESCRIPCION', 'Qué pasó', null, 1], ['ACCIONES', 'Acciones tomadas', null, 1], ['COMUNICADO_A', 'Comunicado a (autoridad, ART, dirección…)'], ['FECHA_COMUNICACION', 'Fecha de comunicación', 'date'],
    ['ESTADO', 'Estado', ['Abierto', 'En seguimiento', 'Cerrado', 'Anulado']]], v,
    async out => {
      if (!out.TIPO) return 'Elegí el tipo.';
      const i = per.indexOf(out.PERSONA), p = i >= 0 ? D.personal[i] : null; delete out.PERSONA;
      const datos = Object.assign({ ID: e ? e.ID : '', ESTABLECIMIENTO: D.cod, ID_PERSONA: p ? p.ID : '' }, out); if (arch.doc) datos.archivo = arch.doc;
      const r = await api('p_rad_evento_guardar', datos, 120000); if (!r.ok) return r.mensaje || 'No se pudo guardar.';
      radRecargar(D, 'Evento guardado.' + (r.aviso ? ' ' + r.aviso : '')); return '';
    }, radSubir('doc', 'Archivo (opcional): denuncia de extravío, nota, informe', e && e.ARCHIVO));
  radInputs(arch);
}

// ---------- Salas y equipos
function radSal(D) {
  const si = x => x === 'Sí' ? '<span class="chip ok mini">Sí</span>' : x === 'No' ? '<span class="chip er mini">No</span>' : '<span class="chip gr mini">' + esc(x || 's/d') + '</span>';
  const vivos = D.salas.filter(s => s.ESTADO !== 'Baja'), inv = {};
  vivos.forEach(s => { const k = (s.TIPO_EQUIPO || 's/d (revisar)') + '|' + (s.SITIO || '') + (s.SALA ? ' · ' + s.SALA : ''); inv[k] = (inv[k] || 0) + 1; });
  const invHtml = vivos.length ? '<section class="card"><h2>Inventario de equipos (' + vivos.length + ')</h2><div style="display:flex;flex-wrap:wrap;gap:6px">' +
    Object.keys(inv).sort().map(k => { const [t, l] = k.split('|'); return '<span class="chip gr" style="font-size:13px"><b>' + inv[k] + '</b>&nbsp;' + esc(t) + (l ? ' · ' + esc(l.replace(/^ · /, '')) : '') + '</span>'; }).join('') +
    '</div><p class="mu peq" style="margin:8px 0 0">Equipos en uso o fuera de servicio, por tipo y lugar. Para varios iguales (por ejemplo 2 arcos en C en quirófano o 3 portátiles), «Agregar equipos» con la cantidad: queda una fila por equipo para completar su serie y habilitación.</p></section>' : '';
  return invHtml + '<section class="card tabla"><div style="padding:14px 18px;border-bottom:1px solid var(--ln);display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;align-items:center"><h2>Salas y equipos</h2><button class="btn pri" id="rsNuevo">Agregar equipos</button></div><div style="overflow-x:auto"><table><thead><tr><th>Sala y equipo</th><th>Habilitación</th><th>Responsables</th><th>Plano / blindaje</th><th>Levantamiento radiométrico</th><th>Control de calidad</th><th>Señalización · luz · EPP</th><th></th></tr></thead><tbody>' +
    (D.salas.length ? D.salas.map(s => '<tr' + (s.ESTADO === 'Baja' ? ' style="opacity:.5"' : '') + '><td><b>' + esc((s.SITIO ? s.SITIO + ' · ' : '') + (s.SALA || 's/d (revisar)')) + '</b><div class="mu peq">' + esc([s.TIPO_EQUIPO, s.MARCA, s.MODELO, s.SERIE ? 'serie ' + s.SERIE : ''].filter(Boolean).join(' · ')) + '</div>' + (s.ESTADO !== 'En uso' ? '<span class="chip gr mini">' + esc(s.ESTADO) + '</span>' : '') + '</td>' +
      '<td>' + radChipF(s.hab, s.HABILITACION_VENCE) + (s.HABILITACION_NRO ? '<div class="mu peq">N.º ' + esc(s.HABILITACION_NRO) + '</div>' : '') + '</td>' +
      '<td class="peq">Instalación: ' + esc(s.RESPONSABLE_INSTALACION || 's/d') + '<br>Uso: ' + esc(s.RESPONSABLE_USO || 's/d') + '</td>' +
      '<td class="peq">' + radLink(s.PLANO_BLINDAJE, 'Plano') + '<br>' + radLink(s.MEMORIA_BLINDAJE, 'Memoria') + '</td>' +
      '<td>' + (s.LEVANTAMIENTO_FECHA ? '<span class="peq">' + fechaTxt(s.LEVANTAMIENTO_FECHA) + '</span><br>' : '') + radChipF(s.lev, s.LEVANTAMIENTO_PROXIMO) + '</td>' +
      '<td>' + (s.CONTROL_CALIDAD_FECHA ? '<span class="peq">' + fechaTxt(s.CONTROL_CALIDAD_FECHA) + '</span><br>' : '') + radChipF(s.cc, s.CONTROL_CALIDAD_PROXIMO) + '</td>' +
      '<td class="peq">' + si(s.SENALIZACION) + ' ' + si(s.LUZ_ADVERTENCIA) + '<div class="mu">' + esc(s.EPP_PLOMADO || '') + '</div></td><td><button class="btn sec" data-sal="' + esc(s.ID) + '">Editar</button></td></tr>').join('')
      : '<tr><td colspan="8" class="mu">Sin equipos cargados.</td></tr>') + '</tbody></table></div></section>' +
    '<p class="mu peq">Habilitación de la autoridad sanitaria: Ley 17.557, art. 2; Dto. 6320/68, arts. 6 y 10 (plano de ubicación con los ambientes contiguos). Responsables: art. 33 (instalación: el director) y art. 34 (uso: jefe del servicio). La venta, cesión o baja del equipo se comunica dentro de los 30 días (art. 37). Las periodicidades del levantamiento radiométrico y del control de calidad: a confirmar con la autoridad sanitaria.</p>';
}
function radSalEv(D) {
  $('rsNuevo').onclick = () => radSalForm(D, null);
  document.querySelectorAll('[data-sal]').forEach(b => b.onclick = () => radSalForm(D, D.salas.find(s => s.ID === b.dataset.sal)));
}
function radSalForm(D, s) {
  const arch = {}, sn = ['Sí', 'No', 's/d'];
  modal(s ? 'Equipo · ' + (s.SALA || s.TIPO_EQUIPO) : 'Agregar equipos', [radSitF(D), ['SALA', 'Sala o servicio (quirófano, odontología, guardia…)'], ['TIPO_EQUIPO', 'Tipo de equipo', D.listas.equipos]].concat(s ? [] : [['CANTIDAD', 'Cantidad de equipos iguales', ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']]]).concat([ ['MARCA', 'Marca'], ['MODELO', 'Modelo'], ['SERIE', 'N.º de serie'], ['ANIO', 'Año de fabricación'],
    ['HABILITACION_NRO', 'Habilitación: número'], ['HABILITACION_FECHA', 'Habilitación: fecha', 'date'], ['HABILITACION_VENCE', 'Habilitación: vencimiento', 'date'],
    ['RESPONSABLE_INSTALACION', 'Responsable de la instalación (director)'], ['RESPONSABLE_USO', 'Responsable del uso (jefe del servicio)'],
    ['LEVANTAMIENTO_FECHA', 'Levantamiento radiométrico: último', 'date'], ['LEVANTAMIENTO_PROXIMO', 'Levantamiento radiométrico: próximo', 'date'], ['CONTROL_CALIDAD_FECHA', 'Control de calidad: último', 'date'], ['CONTROL_CALIDAD_PROXIMO', 'Control de calidad: próximo', 'date'],
    ['SENALIZACION', 'Señalización de riesgo radiológico', sn], ['LUZ_ADVERTENCIA', 'Luz de advertencia en la puerta', ['Sí', 'No', 's/d', 'No corresponde']], ['EPP_PLOMADO', 'Elementos plomados (delantales, cuellos, anteojos…)'], ['EPP_CONTROL_FECHA', 'Elementos plomados: último control', 'date'],
    ['ESTADO', 'Estado', ['En uso', 'Fuera de servicio', 'Baja']], ['OBSERVACIONES', 'Observaciones', null, 1]]), Object.assign({ ESTADO: 'En uso', SITIO: RADF.sitio, CANTIDAD: '1' }, s || {}),
    async out => {
      const datos = Object.assign({ ID: s ? s.ID : '', ESTABLECIMIENTO: D.cod }, out); if (arch.plano) datos.planoArchivo = arch.plano; if (arch.memo) datos.memoriaArchivo = arch.memo;
      const r = await api('p_rad_sala_guardar', datos, 120000); if (!r.ok) return r.mensaje || 'No se pudo guardar.';
      radRecargar(D, (r.ids && r.ids.length > 1 ? '' : 'Equipo guardado.') + (r.aviso ? ' ' + r.aviso : '')); return '';
    }, radSubir('plano', 'Plano de ubicación y plomado (PDF o imagen)', s && s.PLANO_BLINDAJE) + radSubir('memo', 'Memoria de cálculo de blindaje (PDF)', s && s.MEMORIA_BLINDAJE) +
    '<p class="mu peq" style="margin:0">La habilitación, el levantamiento radiométrico y el control de calidad se cargan además como documento en «Documentos» (con su archivo), para el control de requisitos.</p>');
  radInputs(arch);
}

// ---------- Documentos
function radDoc(D) {
  return '<section class="card tabla"><div style="padding:14px 18px;border-bottom:1px solid var(--ln);display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;align-items:center"><h2>Documentos</h2><button class="btn pri" id="rdNuevo">Cargar documento</button></div><div style="overflow-x:auto"><table><thead><tr><th>Tipo</th><th>Título</th><th>Equipo</th><th>Fecha</th><th>Vence</th><th>Archivo</th><th>Estado</th><th></th></tr></thead><tbody>' +
    (D.documentos.length ? D.documentos.map(d => { const s = D.salas.find(x => x.ID === d.ID_SALA); return '<tr' + (d.ESTADO !== 'Vigente' ? ' style="opacity:.6"' : '') + '><td class="peq"><b>' + esc(d.TIPO) + '</b></td><td>' + esc(d.TITULO || '') + radSitTxt(d) + '</td><td class="peq">' + esc(s ? (s.SALA || s.TIPO_EQUIPO) : '—') + '</td><td>' + fechaTxt(d.FECHA) + '</td><td>' + (d.VENCE ? fechaTxt(d.VENCE) : '—') + '</td><td>' + radLink(d.ARCHIVO, 'Abrir') + '</td><td>' + esc(d.ESTADO) + '</td><td><button class="btn sec" data-doc="' + esc(d.ID) + '">Editar</button></td></tr>'; }).join('')
      : '<tr><td colspan="8" class="mu">Sin documentos cargados.</td></tr>') + '</tbody></table></div></section>';
}
function radDocEv(D) {
  $('rdNuevo').onclick = () => radDocForm(D, null);
  document.querySelectorAll('[data-doc]').forEach(b => b.onclick = () => radDocForm(D, D.documentos.find(d => d.ID === b.dataset.doc)));
}
function radDocForm(D, d, base) {
  const arch = {}, salas = D.salas.map(s => (s.SALA || 's/d') + ' · ' + (s.TIPO_EQUIPO || '') + ' · ' + s.ID), v = Object.assign({ FECHA: new Date().toISOString().slice(0, 10), ESTADO: 'Vigente', SITIO: RADF.sitio }, base || d || {});
  const s0 = d && D.salas.find(s => s.ID === d.ID_SALA); if (s0) v.SALA = salas[D.salas.indexOf(s0)];
  modal(d ? 'Documento · ' + d.TIPO : 'Cargar documento', [['TIPO', 'Tipo de documento', D.listas.tiposDoc], ['TITULO', 'Título o número'], radSitF(D), ['SALA', 'Equipo al que corresponde (si corresponde)', salas], ['FECHA', 'Fecha', 'date'], ['VENCE', 'Vence (si corresponde)', 'date'],
    ['ARCHIVO', 'O pegá el enlace (Drive)'], ['ESTADO', 'Estado', ['Vigente', 'Reemplazado', 'Anulado']], ['OBSERVACIONES', 'Observaciones', null, 1]], v,
    async out => {
      if (!out.TIPO) return 'Elegí el tipo.';
      const i = salas.indexOf(out.SALA); delete out.SALA;
      const datos = Object.assign({ ID: d ? d.ID : '', ESTABLECIMIENTO: D.cod, ID_SALA: i >= 0 ? D.salas[i].ID : '' }, out); if (arch.doc) datos.archivo = arch.doc;
      if (!d && !arch.doc && !out.ARCHIVO) return 'Adjuntá el archivo o pegá el enlace.';
      const r = await api('p_rad_doc_guardar', datos, 120000); if (!r.ok) return r.mensaje || 'No se pudo guardar.';
      radRecargar(D, 'Documento guardado.'); return '';
    }, radSubir('doc', 'Archivo (PDF o imagen, máx. 6 MB)', d && d.ARCHIVO));
  radInputs(arch);
}

// ---------- Requisitos legales
function radReq(D) {
  const grupos = Array.from(new Set(D.requisitos.map(r => r.alcance)));
  return grupos.map(g => '<section class="card tabla"><div style="padding:14px 18px;border-bottom:1px solid var(--ln)"><h2>' + esc(g) + '</h2></div><div style="overflow-x:auto"><table><thead><tr><th>Requisito</th><th>Norma</th><th>Cómo se acredita</th><th>Documento</th></tr></thead><tbody>' +
    D.requisitos.filter(r => r.alcance === g).map(r => '<tr><td>' + esc(r.requisito) + '</td><td class="peq">' + esc(r.norma) + '</td><td class="peq">' + esc(r.como) + '</td><td>' +
      (r.docs === null ? '<span class="mu peq">Se ve en las otras pestañas</span>' : r.docs.length ? r.docs.map(d => radLink(d.archivo, d.titulo || 'Abrir') + (d.vence ? ' <span class="mu peq">vence ' + fechaTxt(d.vence) + '</span>' : '')).join('<br>') : '<button class="btn sec" data-req="' + esc(r.docTipo) + '">Falta · cargar</button>') + '</td></tr>').join('') +
    '</tbody></table></div></section>').join('') +
    '<p class="mu peq">Normativa: Ley 17.557 y Dto. 6320/68 (equipos de rayos X); Ley 19.587 y Dto. 351/79; Res. SRT 37/10, 81/19 y 905/15. Los requisitos se agregan o desactivan en la planilla del módulo, hoja REQUISITOS. La autoridad de aplicación es el área de salud pública de la provincia: sus exigencias específicas (periodicidad del levantamiento radiométrico, control de calidad, renovación de habilitaciones) a confirmar.</p>';
}
function radReqEv(D) { document.querySelectorAll('[data-req]').forEach(b => b.onclick = () => radDocForm(D, null, { TIPO: b.dataset.req })); }

// ---------- Movimientos
function radMov(D) {
  return '<section class="card tabla"><div style="padding:14px 18px;border-bottom:1px solid var(--ln)"><h2>Movimientos del personal expuesto</h2><span class="mu peq">Altas, bajas, reactivaciones, cambios y extravíos. Los últimos 200.</span></div><div style="overflow-x:auto"><table><thead><tr><th>Fecha</th><th>Persona</th><th>Movimiento</th><th>Dosímetro</th><th>Detalle</th><th>Documento</th><th>Cargó</th></tr></thead><tbody>' +
    (D.movimientos.length ? D.movimientos.map(m => '<tr><td>' + fechaTxt(m.FECHA) + '</td><td>' + esc(m.APELLIDO_Y_NOMBRE) + '</td><td><b>' + esc(m.TIPO) + '</b></td><td>' + esc(m.DOSIMETRO_NRO || '—') + '</td><td class="peq">' + esc(m.DETALLE || '') + '</td><td>' + radLink(m.DOCUMENTO, 'Abrir') + '</td><td class="peq">' + esc(m.CARGADO_POR || '') + '</td></tr>').join('')
      : '<tr><td colspan="7" class="mu">Sin movimientos.</td></tr>') + '</tbody></table></div></section>';
}
