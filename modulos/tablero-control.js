// ------------------------------------------------------------------ Tablero de control (inicio) · versión 2 (06/11/2026)
// Pedido de Belén: «no me permite saber de manera rápida qué está pasando, cómo está todo; es difícil de ver; no integra todos los ejes».
// Una sola fuente: cada aviso de los 11 ejes se arma acá como un «hallazgo del tablero» {eje, col, n, t, h, dep, fecha}.
// De esa lista salen la frase del día, los números, el mapa ejes × establecimientos, «Hoy, primero esto» y los próximos 30 días.
// Solo lee lo que ya traen p_tablero, p_res_tablero, p_rad_tablero, p_inc_tablero, p_sin_est y el tablero de capacitaciones (c_tablero).
// No cambia el Apps Script. Lo que el dato no trae por sitio (tanques, canillas, siniestros, radiaciones…) queda en la columna del hospital.

const TC_CAPS = { HZT: 'CAPS red Trelew', HSST: 'CAPS HSST (Rawson)' };   // hospitales cuyos CAPS van en una columna propia
const TC_EJES = [
  ['1', 'Residuos', 'recycling', '#res'], ['2', 'Agua', 'water_drop', '#agua'], ['3', 'Plagas', 'pest_control', '#plagas'],
  ['4', 'Cocinas', 'soup_kitchen', '#coc'], ['5', 'Radiaciones', 'radiology', '#rad'], ['6', 'Infraestructura', 'domain', '#m8'],
  ['7', 'Incendio', 'fire_extinguisher', '#inc'], ['8', 'Personal y RAR', 'personal_injury', '#sin'], ['9', 'Capacitaciones', 'school', '#cap'],
  ['10', 'Documentos', 'folder_open', '#docest'], ['11', 'Plan de acción', 'task_alt', '#ges']];
const TC = { ver: '', dep: '', todos: false, sin: null, sinPidio: false, inc: false, cap: false, rad: false, hist: null, histPidio: false, guardado: '', t0: Date.now() };
const TC_NIV = { er: 0, wa: 1, av: 2 };
const tcEsCaps = t => /(^|[^a-z])caps([^a-z]|$)/i.test(String(t || ''));
const tcCol = (cod, lugar, tipo) => TC_CAPS[cod] && (tcEsCaps(lugar) || /^caps$/i.test(String(tipo || ''))) ? cod + '·CAPS' : cod;
const tcDias = f => { if (!f) return null; const d = new Date(String(f).slice(0, 10) + 'T12:00:00'); return isNaN(d) ? null : Math.round((d - new Date(new Date().toISOString().slice(0, 10) + 'T12:00:00')) / 864e5); };
const tcEsPlagas = a => a.origen === 'Plagas' || a.origen === 'Plagas (MIPyV)';
const tcEsPlan = a => !tcEsPlagas(a) && a.origen !== 'Agua';   // agua NO APTA y muestreos van en 2 · Agua
const tcMesTxt = m => { const n = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']; return m ? n[Number(String(m).slice(5, 7)) - 1] + ' ' + String(m).slice(0, 4) : ''; };

function tcEstilos() {
  if (document.getElementById('tcCss')) return;
  const s = document.createElement('style'); s.id = 'tcCss';
  s.textContent = '.tcFrase{display:flex;gap:14px;align-items:center;flex-wrap:wrap}.tcFrase .ms{font-size:34px}.tcFrase p{margin:0}' +
    '.tcCols{display:flex;gap:6px;flex-wrap:wrap}.tcCols button{font:inherit;font-size:13.5px;font-weight:700;border-radius:999px;padding:8px 14px;border:1px solid var(--ln);background:#fff;color:var(--az);cursor:pointer;min-height:40px}.tcCols button.on{background:var(--az);border-color:var(--az);color:#fff}' +
    '.tcGrid{display:flex;gap:16px;flex-wrap:wrap;align-items:flex-start;margin-top:14px}.tcMain{flex:999 1 620px;min-width:0}.tcSide{flex:1 1 320px;min-width:0;display:flex;flex-direction:column;gap:16px}' +
    '.tcMapa{overflow-x:auto}.tcMapa table{border-collapse:separate;border-spacing:5px;width:100%;min-width:900px}.tcMapa th{font-size:11.5px;letter-spacing:.6px;text-transform:uppercase;color:var(--mu);text-align:left;padding:2px 4px;font-weight:800}' +
    '.tcMapa th a{color:var(--mu);text-decoration:none}.tcMapa th a:hover{color:var(--az);text-decoration:underline}.tcMapa th.sel,.tcMapa th.sel a{color:var(--az)}' +
    '.tcMapa td.eje{position:sticky;left:0;background:#fff;z-index:1;min-width:170px;padding:2px 4px}.tcMapa td.eje a{display:flex;gap:8px;align-items:center;text-decoration:none;color:var(--az);font-weight:700;font-size:14px}.tcMapa td.eje .ms{color:var(--pa);font-size:20px}.tcMapa td.eje small{display:block;font-size:11.5px;font-weight:700}' +
    '.tcCel{display:flex;gap:6px;align-items:center;border-radius:8px;padding:8px 10px;font-size:13px;font-weight:600;text-decoration:none;min-height:30px;line-height:1.25}.tcCel .ms{font-size:16px;flex:none}' +
    '.tcCel.er{background:#F8E3DE;color:#8E2A17}.tcCel.wa{background:#FBF0DC;color:#7A4800}.tcCel.av{background:#E7F0F3;color:#2E5E70}.tcCel.ok{background:#E3F1E8;color:#185A37}.tcCel.gr{background:#EEF2F4;color:#55656D}.tcCel:hover{outline:2px solid var(--pa)}' +
    'td.dim .tcCel{opacity:.45}.tcLey{display:flex;gap:14px;flex-wrap:wrap;font-size:12.5px;color:var(--mu)}.tcLey span{display:flex;gap:4px;align-items:center}.tcLey .ms{font-size:16px}' +
    '.tcHoy a.fila{display:flex;gap:10px;align-items:flex-start;padding:10px 0;border-top:1px solid #EEF2F4;text-decoration:none;color:inherit}.tcHoy a.fila>.ms{font-size:22px;flex:none}.tcHoy a.fila b{display:block;font-size:14px;color:var(--az)}.tcHoy a.fila small{display:block;font-size:12.5px;color:var(--mu)}.tcHoy a.fila i{display:block;font-style:normal;font-size:11.5px;font-weight:800;margin-top:2px}' +
    '.tcAg{display:flex;gap:12px;align-items:center;padding:7px 0;border-top:1px solid #EEF2F4;text-decoration:none;color:inherit}.tcAg>span:first-child{display:flex;flex-direction:column;align-items:center;width:46px;flex:none;background:#EAF2F5;border-radius:8px;padding:4px 0;color:var(--az)}.tcAg>span:first-child b{font-size:17px}.tcAg>span:first-child small{font-size:11px;text-transform:uppercase}.tcAg b{color:var(--az);font-size:13.5px}.tcAg small{display:block;color:var(--mu);font-size:12.5px}' +
    '.tcBar{display:flex;gap:8px;align-items:flex-end;height:110px}.tcBar>div{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:3px;height:100%;min-width:0}.tcBar>div span{font-size:11px;font-weight:700}.tcBar>div i{display:block;width:100%;border-radius:4px 4px 0 0}.tcBarL{display:flex;gap:8px;font-size:11px;color:var(--mu)}.tcBarL span{flex:1;text-align:center;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
    '.tcPie{display:flex;justify-content:center;margin:22px 0 8px}.tcPie img{width:75%;max-width:620px;height:auto}';
  document.head.appendChild(s);
}

// Pide (una sola vez por sesión, sin bloquear) lo que el tablero necesita además de p_tablero; al llegar, redibuja si se sigue en el inicio
function tcPedirExtras() {
  if (!REST) REST = LS.get('resTab', null);
  const otra = () => { if (/^#?(inicio)?$/.test(location.hash) && $('ov').hidden) inicio(); };
  if (!TC.rad) { TC.rad = true; api('p_rad_tablero', {}, 180000).then(r => { if (r && r.ok) { RADT = r; otra(); } }).catch(() => {}); }
  if (!TC.inc) { TC.inc = true; api('p_inc_tablero', {}, 180000).then(r => { if (r && r.ok !== false && r.lugares) { INCT = r; otra(); } }).catch(() => {}); }
  if (!TC.sinPidio) { TC.sinPidio = true; const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 5);
    api('p_sin_est', { desde: d.toISOString().slice(0, 10), hasta: new Date().toISOString().slice(0, 10), est: '' }, 180000).then(r => { if (r && r.ok) { TC.sin = r; otra(); } }).catch(() => {}); }
  if (!TC.histPidio) { TC.histPidio = true; api('p_tc_hist', {}, 60000).then(r => { if (r && r.ok) TC.hist = r.filas || []; else { TC.hist = []; TC.histFalta = true; } otra(); }).catch(() => { TC.hist = []; TC.histFalta = true; }); }
  if (!TC.cap && typeof capApi === 'function') { TC.cap = true; if (!CAPT) CAPT = LS.get('capt', null);
    if (!CAPT || !CAPT.calculado || Date.now() - Date.parse(CAPT.calculado) > 3600000) capApi('c_tablero', {}, 180000).then(r => { if (r) { CAPT = r; LS.set('capt', r); otra(); } }).catch(() => {}); }
}

// Arma la lista única de hallazgos del tablero (eje × columna)
function tcHallazgos(ctx) {
  const { TB, cols } = ctx, H = [], has = {}, okT = {}, enCol = {}; cols.forEach(c => enCol[c.k] = true);
  const add = (eje, col, n, t, h, dep, fecha) => H.push({ eje: eje, col: col, n: n, t: t, h: h || TC_EJES.find(e => e[0] === eje)[3], dep: dep, fecha: fecha || '' });
  const hay = (eje, col, txt) => { (has[eje] = has[eje] || {})[col] = true; if (txt != null) (okT[eje] = okT[eje] || {})[col] = txt; };
  const ficha = (cod, t) => '#ficha/' + encodeURIComponent(cod) + (t ? '/' + t : '');
  const hoy = new Date().toISOString().slice(0, 10);

  // 1 · Residuos: sitios con retiros atrasados (tablero de residuos), certificados, remisión semanal, novedades y desvíos
  const minD = {};
  if (REST && REST.ok) (REST.establecimientos || []).forEach(e => {
    (e.sitios || []).forEach(s => { const k = tcCol(e.cod, s.sitio); hay('1', k); if (s.dias != null) minD[k] = Math.min(minD[k] == null ? 1e9 : minD[k], s.dias);
      if (s.atrasado) add('1', k, s.dias > 30 ? 'er' : 'wa', (s.sitio === e.cod ? '' : s.sitio + ': ') + s.dias + ' días sin retiro', ficha(e.cod), 'inst'); });
    (e.sinCert || []).forEach(c => add('1', e.cod, c.nivel, 'Falta el certificado de tratamiento de ' + tcMesTxt(c.mes), '#res', 'inst'));
  });
  else (RES.filas || []).filter(f => f.diasSinRetiro != null).forEach(f => { hay('1', f.cod); minD[f.cod] = f.diasSinRetiro; if (f.diasSinRetiro > 10) add('1', f.cod, f.diasSinRetiro > 30 ? 'er' : 'wa', f.diasSinRetiro + ' días sin retiro', ficha(f.cod), 'inst'); });
  Object.keys(minD).forEach(k => hay('1', k, 'Al día · último retiro hace ' + minD[k] + ' días'));
  const RM = TB.remision || {};
  if (RM.activa) (RM.avisos || []).filter(x => !x.silenciado).forEach(x => add('1', tcCol(x.cod, x.sitio), 'wa', x.sitio + ': sin manifiestos cargados de las últimas 2 semanas', ficha(x.cod), 'inst', ''));
  (RM.observaciones || []).filter(o => o.fecha >= new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10)).forEach(o => add('1', tcCol(o.cod, o.sitio), 'av', o.sitio + ': no se recibieron manifiestos (semana del ' + fechaTxt(o.semana) + ')', ficha(o.cod), 'inst'));
  (TB.resnov || []).forEach(x => add('1', x.cod, x.nivel, x.texto, '#resnov', 'inst'));
  (TB.desvacc || []).forEach(x => add('1', x.cod, x.nivel, x.texto, '#desvacc', 'inst'));

  // 2 · Agua: muestreos del laboratorio (por lugar), tanques y canillas (por establecimiento), sin inventario
  (TB.lab || []).filter(y => y.grupo !== 'Otros').forEach(y => { const k = tcCol(y.cod, y.lugar); hay('2', k);
    if (/urgente|vencido/i.test(y.aviso)) add('2', k, 'er', (/^URGENTE/.test(y.que) ? 'Agua NO APTA · ' : 'Muestreo vencido · ') + y.lugar, '#agua', 'hys', y.limite);
    else if (/pedir/i.test(y.aviso)) add('2', k, 'wa', 'Pedir muestreo ' + (/COMPLETO/.test(y.que) ? 'completo' : 'parcial') + ' · ' + y.lugar, '#agua', 'hys', y.limite); });
  const tq = TB.tanques || [], pt = TB.puntos || [];
  // 08/11/2026: tanques y canillas traen el SITIO (Tablero.gs), así los de los CAPS van en su columna
  const colAg = t => tcCol(t.cod, t.sitio), kAg = Array.from(new Set(tq.concat(pt).map(colAg)));
  kAg.forEach(k => { hay('2', k); const cod = k.split('·')[0], deK = l => l.filter(t => colAg(t) === k && t.estado === 'vencida');
    const tv = deK(tq), pv = deK(pt), lug = l => Array.from(new Set(l.map(t => t.sitio).filter(x => x && x !== cod))).join(', ');
    if (tv.length) add('2', k, 'er', tv.length + (tv.length > 1 ? ' limpiezas de tanque vencidas' : ' limpieza de tanque vencida') + (lug(tv) ? ' · ' + lug(tv) : ''), ficha(cod, 'agua'), 'hys');
    if (pv.length) add('2', k, 'er', pv.length + (pv.length > 1 ? ' canillas con el análisis vencido' : ' canilla con el análisis vencido') + (lug(pv) ? ' · ' + lug(pv) : ''), ficha(cod, 'agua'), 'hys'); });
  if (!(TB.lab || []).length) (TB.noApta || []).forEach(a => add('2', tcCol(a.cod, a.sitio), 'er', 'Agua NO APTA en ' + a.punto + (a.sitio && a.sitio !== a.cod ? ' · ' + a.sitio : ''), ficha(a.cod), 'hys', a.limite));
  if (!TB.vacio) cols.filter(c => !c.caps).forEach(c => { if (!kAg.some(k => k === c.k)) add('2', c.k, 'er', 'Sin inventario de tanques y canillas', ficha(c.cod, 'agua'), 'hys'); });
  cols.forEach(c => { if (has['2'] && has['2'][c.k]) hay('2', c.k, 'Tanques y análisis al día'); });

  // 3 · Plagas: casos abiertos y revisiones (plan único, origen Plagas)
  (TB.acciones || []).filter(tcEsPlagas).forEach(a => add('3', tcCol(a.cod, a.donde), a.vencida ? 'er' : 'wa', String(a.que || 'Caso de plagas').replace(/^Caso abierto: /, 'Caso abierto · ') + (a.donde && a.donde !== a.cod ? ' · ' + a.donde : ''), '#plagas', 'hys', a.limite));
  cols.forEach(c => hay('3', c.k, 'Sin casos abiertos'));

  // 4 · Cocinas: carnets y libretas (los CAPS no tienen cocina)
  (TB.cocina || []).forEach(c => { if (c.vencidos) add('4', c.cod, 'er', c.vencidos + (c.vencidos > 1 ? ' personas' : ' persona') + ' sin carnet o libreta vigente', '#cocper/' + encodeURIComponent(c.cod), 'inst');
    if (c.porVencer) add('4', c.cod, 'wa', c.porVencer + (c.porVencer > 1 ? ' carnets o libretas vencen' : ' carnet o libreta vence') + ' en 60 días', '#cocper/' + encodeURIComponent(c.cod), 'inst'); });
  cols.filter(c => !c.caps).forEach(c => hay('4', c.k, 'Sin vencimientos'));

  // 5 · Radiaciones
  if (RADT && RADT.ok) RADT.establecimientos.filter(e => enCol[e.cod]).forEach(e => { const r = e.r, h = '#radest/' + encodeURIComponent(e.cod); if (!(r.personas || r.equipos)) return;
    hay('5', e.cod, (r.activos || 0) + ' con dosímetro · al día');
    if (r.anormalesAbiertos) add('5', e.cod, 'er', r.anormalesAbiertos + ' registro(s) anormal(es) de dosimetría', h + '/eve', 'hys');
    if (r.extraviados) add('5', e.cod, 'er', r.extraviados + ' dosímetro(s) extraviado(s)', h + '/per', 'inst');
    if (r.habVencidas) add('5', e.cod, 'er', r.habVencidas + ' habilitación(es) de rayos X vencida(s)', h + '/sal', 'inst');
    if (r.invAbiertas) add('5', e.cod, 'wa', r.invAbiertas + ' investigación(es) de dosis abierta(s)', h + '/inv', 'hys');
    if ((r.faltanMeses || []).length) add('5', e.cod, 'wa', 'Falta el informe de dosimetría ' + r.faltanMeses.map(m => typeof radBim === 'function' ? radBim(m) : m).join(', '), h + '/con', 'hys'); });

  // 6 · Infraestructura: mediciones con vencimiento y RGRL
  (TB.mediciones || []).forEach(m => { const k = tcCol(m.cod, m.lugar); hay('6', k);
    if (m.estado === 'vencida') add('6', k, 'er', m.tipo + ' vencida' + (m.lugar && m.lugar !== m.cod ? ' · ' + m.lugar : ''), '#medic', 'inst', m.vence);
    else if (m.estado === 'porvencer') add('6', k, 'wa', m.tipo + ' vence el ' + fechaTxt(m.vence), '#medic', 'inst', m.vence); });
  (TB.rgrl || []).forEach(r => { const k = tcCol(r.cod, r.lugar), h = '#rgrl/' + encodeURIComponent(r.id); hay('6', k);
    if (r.estadoVto === 'vencida') add('6', k, 'wa', 'RGRL vencido' + (r.lugar && r.lugar !== r.cod ? ' · ' + r.lugar : ''), h, 'hys', r.vence);
    else if (r.vence) add('6', k, null, 'RGRL vence' + (r.lugar && r.lugar !== r.cod ? ' · ' + r.lugar : ''), h, 'hys', r.vence);   // solo para «Próximos 30 días»
    if (r.noVencidas) add('6', k, 'er', r.noVencidas + ' condición(es) del RGRL sin regularizar en fecha', h, 'inst'); });
  cols.forEach(c => { if (has['6'] && has['6'][c.k]) hay('6', c.k, 'RGRL y mediciones al día'); });

  // 7 · Incendio: extintores por lugar
  if (INCT && INCT.lugares) INCT.lugares.forEach(L => { if (L.r && L.r.total) hay('7', tcCol(L.cod, L.sitio, L.tipo), 'Extintores al día'); });
  ((TB.incendio || {}).avisos || []).forEach(x => { const k = tcCol(x.cod, x.sitio); hay('7', k, 'Extintores al día');
    if (x.nivel === 'er' || x.nivel === 'wa' || x.nivel === 'av') add('7', k, x.nivel, (x.sitio === x.cod ? '' : x.sitio + ': ') + String(x.texto).split(' (')[0], x.h || '#incest/' + encodeURIComponent(x.cod) + '/' + encodeURIComponent(x.sitio), /control|verificar/i.test(x.texto) ? 'hys' : 'inst'); });

  // 8 · Personal y RAR: siniestros de los últimos 6 meses (investigaciones e ILT) y altas propuestas para la base
  if (TC.sin && TC.sin.ok) { const pend = {}, ilt = {};
    (TC.sin.lista || []).forEach(s => { if (!enCol[s.est]) return; hay('8', s.est, 'Sin pendientes');
      if (['Rechazado', 'Inculpable'].indexOf(s.estado) < 0 && s.inv === 'Sin investigar') { const d = -tcDias(s.fecha); (pend[s.est] = pend[s.est] || { n: 0, viejas: 0 }).n++; if (d > 15) pend[s.est].viejas++; }
      if (s.estado === 'En ILT') ilt[s.est] = (ilt[s.est] || 0) + 1; });
    Object.keys(pend).forEach(c => { const p = pend[c]; add('8', c, p.viejas ? 'er' : 'wa', p.n + (p.n > 1 ? ' investigaciones de siniestro pendientes' : ' investigación de siniestro pendiente') + (p.viejas ? ' (' + p.viejas + ' con más de 15 días)' : ''), '#sin', 'hys'); });
    Object.keys(ilt).forEach(c => add('8', c, 'av', ilt[c] + (ilt[c] > 1 ? ' personas en ILT' : ' persona en ILT'), '#sin', 'inst'));
    cols.filter(c => !c.caps).forEach(c => hay('8', c.k, (has['8'] && has['8'][c.k]) ? 'Sin pendientes' : 'Sin siniestros en 6 meses')); }
  const P = (TB.modulos || {}).personal || {}, altas = P.altasPersonas != null ? P.altasPersonas : (P.bandeja || 0);
  if (altas) add('8', '', 'av', altas + ' alta(s) propuesta(s) para la base de trabajadores', '#bandeja', 'hys');

  // 9 · Capacitaciones: personas capacitadas en el ciclo, por establecimiento
  if (CAPT && CAPT.semaforo) (CAPT.semaforo.porEstablecimiento || []).forEach(e => { const f = RES.filas.find(x => x.cod === e.cod || sinTil(x.nombre) === sinTil(e.nombre)); const cod = f ? f.cod : e.cod;
    if (cod && enCol[cod]) hay('9', cod, (e.personas || 0) + ' personas capacitadas en el ciclo'); });
  (((TB.modulos || {}).capacitaciones || {}).lista || []).forEach(t => add('9', '', null, 'Capacitación: ' + t.cap + (t.hora ? ' · ' + t.hora : ''), '#capag', 'hys', t.fecha));

  // 10 · Documentos: de los establecimientos y de HyS (biblioteca)
  ((TB.docsEst || {}).avisos || []).forEach(d => add('10', d.cod, d.estado === 'vencido' ? 'er' : 'wa', (d.codigo || 'Documento') + (d.estado === 'vencido' ? ' vencido' : ' vence el ' + fechaTxt(d.vence)), '#docest/' + encodeURIComponent(d.cod), 'inst', d.vence));
  (TB.docsRevisar || []).forEach(d => add('10', '', d.dias < 0 ? 'er' : 'wa', d.codigo + (d.dias < 0 ? ': revisión vencida' : ': llega a su revisión'), '#bib', 'hys', d.revision));
  cols.filter(c => !c.caps).forEach(c => hay('10', c.k, 'Sin vencimientos'));

  // 11 · Plan de acción: acciones del plan (sin agua ni plagas, que ya están en su eje) y auditorías para verificar
  const plan = (TB.acciones || []).filter(tcEsPlan);
  const pc = {}; plan.forEach(a => { const k = tcCol(a.cod, a.donde), d = tcDias(a.limite), x = pc[k] = pc[k] || { v: 0, p: 0, t: 0, hys: 0 }; x.t++; if (/hys|higiene/i.test(a.aCargo || '')) x.hys++;
    if (a.vencida) x.v++; else if (d != null && d <= 7) x.p++; if (!a.vencida && d != null && d >= 0) add('11', k, null, 'Vence una acción del plan: ' + String(a.que || '').slice(0, 70), '#ges', /hys|higiene/i.test(a.aCargo || '') ? 'hys' : 'inst', a.limite); });
  Object.keys(pc).forEach(k => { const x = pc[k]; hay('11', k, x.t + ' en plazo');
    if (x.v) add('11', k, 'er', x.v + (x.v > 1 ? ' acciones vencidas' : ' acción vencida') + ' de ' + x.t, '#ges', x.hys >= x.t / 2 ? 'hys' : 'inst');
    if (x.p) add('11', k, 'wa', x.p + (x.p > 1 ? ' acciones vencen' : ' acción vence') + ' esta semana', '#ges', x.hys >= x.t / 2 ? 'hys' : 'inst'); });
  ((TB.auditorias || {}).paraVerificar || []).forEach(a => add('11', a.cod, 'wa', 'Auditoría interna para verificar · ' + a.id, '#audr/' + encodeURIComponent(a.id), 'hys'));
  cols.forEach(c => { if (!(has['11'] && has['11'][c.k])) hay('11', c.k, 'Sin acciones abiertas'); });

  // Lo que no tiene columna propia (otro establecimiento) se cuenta en la red, no en el mapa
  H.forEach(x => { if (x.col && !enCol[x.col]) x.col = ''; });
  return { H: H, has: has, okT: okT };
}

// Casilla del mapa: lo peor de la casilla y una frase corta
function tcCelda(eje, c, X) {
  const L = X.H.filter(x => x.eje === eje && x.col === c.k && x.n), e = TC_EJES.find(z => z[0] === eje);
  const icon = { er: 'error', wa: 'schedule', av: 'info', ok: 'check_circle', gr: 'remove' };
  const conHosp = ['5', '8', '9', '10'].indexOf(eje) >= 0 && c.caps;   // dato solo por establecimiento
  let n, t, h = e[3], tip = '';
  if (L.length) { L.sort((a, b) => TC_NIV[a.n] - TC_NIV[b.n]); n = L[0].n; const er = L.filter(x => x.n === 'er').length, wa = L.filter(x => x.n === 'wa').length, av = L.filter(x => x.n === 'av').length;
    t = L[0].t + (L.length > 1 ? ' (y ' + (L.length - 1) + ' más)' : '');
    h = L[0].h; tip = L.map(x => '• ' + x.t).join('\n'); }
  else if (conHosp) { n = 'gr'; t = 'Incluido en ' + c.cod; }
  else if (eje === '4' && c.caps) { n = 'gr'; t = 'No corresponde'; }
  else if (X.has[eje] && X.has[eje][c.k]) { n = 'ok'; t = (X.okT[eje] || {})[c.k] || 'Al día'; }
  else { n = 'gr'; t = eje === '5' && !RADT ? 'Cargando…' : eje === '7' && !INCT ? 'Sin avisos' : eje === '8' && !TC.sin ? 'Cargando…' : eje === '9' && !CAPT ? 'Cargando…' : 's/d'; }
  if (!L.length && !c.caps) h = ({ '1': '#ficha/' + encodeURIComponent(c.cod), '2': '#ficha/' + encodeURIComponent(c.cod) + '/agua', '4': '#cocper/' + encodeURIComponent(c.cod), '5': '#radest/' + encodeURIComponent(c.cod), '7': '#incest/' + encodeURIComponent(c.cod), '10': '#docest/' + encodeURIComponent(c.cod) })[eje] || h;
  return '<td' + (TC.ver && TC.ver !== c.k ? ' class="dim"' : '') + '><a class="tcCel ' + n + '" href="' + h + '"' + (tip ? ' title="' + esc(tip) + '"' : '') + '><span class="ms" aria-hidden="true">' + icon[n] + '</span><span>' + esc(t) + '</span></a></td>';
}

// Historial (TableroHistorial.gs › TC_HISTORIAL): una foto por día de toda la red, cuando ya llegaron todos los datos
function tcGuardarDia(TB, conNivel) {
  const hoy = new Date().toISOString().slice(0, 10); if (TB.vacio || TC.guardado === hoy || TC.histFalta) return;   // sin la versión nueva del Apps Script (p_tc_hist) no se intenta guardar
  const listo = RADT && INCT && TC.sin && CAPT && REST; if (!listo && Date.now() - TC.t0 < 90000) { if (!TC.espera) TC.espera = setTimeout(() => { TC.espera = null; if (/^#?(inicio)?$/.test(location.hash) && $('ov').hidden) inicio(); }, 95000); return; }
  TC.guardado = hoy; const ejes = {}; TC_EJES.forEach(e => ejes[e[0]] = conNivel.filter(x => x.eje === e[0] && (x.n === 'er' || x.n === 'wa')).length);
  const foto = { fecha: hoy, er: conNivel.filter(x => x.n === 'er').length, wa: conNivel.filter(x => x.n === 'wa').length, av: conNivel.filter(x => x.n === 'av').length, ejes: ejes };
  api('p_tc_hist', { guardar: foto }, 60000).then(r => { if (r && r.ok) TC.hist = r.filas || []; }).catch(() => { TC.guardado = ''; });
}

function tcBarras(vals, etiquetas, color, aria) {
  const max = Math.max(1, ...vals.filter(v => v != null));
  return '<div class="tcBar" role="img" aria-label="' + esc(aria) + '">' + vals.map(v => v == null ? '<div><span class="mu">s/d</span></div>' : '<div><span>' + v + '</span><i style="height:' + Math.max(3, Math.round(80 * v / max)) + 'px;background:' + color + '"></i></div>').join('') + '</div>' +
    '<div class="tcBarL" aria-hidden="true">' + etiquetas.map(e => '<span>' + esc(e) + '</span>').join('') + '</div>';
}

function tcPintar(ctx) {
  tcEstilos(); tcPedirExtras();
  const { TB } = ctx;
  const cols = []; estActivos().forEach(f => cols.push({ k: f.cod, t: f.cod, nombre: f.nombre, cod: f.cod }));
  Object.keys(TC_CAPS).forEach(cod => { if (cols.some(c => c.cod === cod)) cols.push({ k: cod + '·CAPS', t: TC_CAPS[cod], nombre: TC_CAPS[cod], cod: cod, caps: true }); });
  if (TC.ver && !cols.some(c => c.k === TC.ver)) TC.ver = '';
  const X = tcHallazgos({ TB: TB, cols: cols }), conNivel = X.H.filter(x => x.n);
  tcGuardarDia(TB, conNivel);
  const enVer = x => !TC.ver || x.col === TC.ver;
  const V = conNivel.filter(enVer), nEr = V.filter(x => x.n === 'er').length, nWa = V.filter(x => x.n === 'wa').length;
  const estEje = eje => { const L = conNivel.filter(x => x.eje === eje && enVer(x)); return L.some(x => x.n === 'er') ? 'er' : L.some(x => x.n === 'wa') ? 'wa' : 'ok'; };
  const ejesEr = TC_EJES.filter(e => estEje(e[0]) === 'er'), alDia = TC_EJES.filter(e => estEje(e[0]) === 'ok').length;
  const urg = V.filter(x => x.n === 'er' || x.n === 'wa'), dHys = urg.filter(x => x.dep === 'hys').length, dInst = urg.length - dHys;
  const plan = (TB.acciones || []).filter(a => tcEsPlan(a) && (!TC.ver || tcCol(a.cod, a.donde) === TC.ver)), planV = plan.filter(a => a.vencida).length;
  const colTxt = TC.ver ? (cols.find(c => c.k === TC.ver) || {}).nombre : '';

  // 1) La frase del día
  const frase = '<section class="card tcFrase" style="margin-top:14px"><span class="ms" aria-hidden="true" style="color:' + (nEr ? '#B4361F' : nWa ? '#8A5200' : '#1E6B42') + '">' + (nEr ? 'report' : nWa ? 'schedule' : 'verified') + '</span><div style="flex:1 1 420px">' +
    '<p style="font-size:18px;font-weight:700;color:var(--az)">' + (TB.vacio ? 'Armando el tablero…' : nEr ? (colTxt ? colTxt + ': ' : 'Hoy hay ') + nEr + (nEr > 1 ? ' temas urgentes' : ' tema urgente') + ' en ' + ejesEr.length + (ejesEr.length > 1 ? ' ejes: ' : ' eje: ') + ejesEr.map(e => e[1]).join(', ') + '.' : nWa ? (colTxt ? colTxt + ': ' : '') + 'Nada urgente. Hay ' + nWa + ' tema(s) para atender pronto.' : (colTxt ? colTxt + ': ' : '') + 'Todo al día con los datos cargados.') + '</p>' +
    '<p class="mu" style="font-size:14px;margin-top:4px">' + (urg.length ? dHys + ' de lo urgente y próximo depende de HyS y ' + dInst + ' de recursos institucionales. ' : '') + alDia + ' de 11 ejes al día.</p></div></section>';
  // 2) Números clave
  const kpi = (h, t, v, s, col, uf) => '<a class="kpi2" href="' + h + '"' + (uf ? ' data-tcdep="' + uf + '"' : '') + '><span>' + t + '</span><b' + (col ? ' style="color:' + col + '"' : '') + '>' + v + '</b><small>' + s + '</small></a>';
  const nums = '<div class="tb5" style="grid-template-columns:repeat(auto-fit,minmax(170px,1fr));margin-top:14px">' +
    kpi('#tcHoy', 'URGENTE', nEr, 'vencido o con riesgo: resolver primero', nEr ? '#B4361F' : '') + kpi('#tcHoy', 'PRONTO', nWa, 'vence en 30 días o hay que verificar', nWa ? '#8A5200' : '') +
    kpi('#tcMapa', 'EJES AL DÍA', alDia + ' / 11', 'sin nada urgente ni próximo', '#1E6B42') + kpi('#ges', 'PLAN DE ACCIÓN', planV + ' / ' + plan.length, 'acciones vencidas de las abiertas', planV ? '#B4361F' : '') +
    kpi('#tcHoy', 'DEPENDE DE HyS', dHys, 'de lo urgente y próximo · el resto, de la institución', '', 'hys') + '</div>';
  // 3) Mapa ejes × establecimientos
  const mapa = '<section class="card" id="tcMapa" style="display:flex;flex-direction:column;gap:10px"><div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;align-items:baseline"><h2 style="font-size:17px">Mapa de la gestión · 11 ejes × establecimientos</h2><span class="mu peq">Cada casilla dice qué pasa · tocala para ir al detalle</span></div>' +
    '<div class="tcMapa"><table><thead><tr><th>Eje</th>' + cols.map(c => '<th' + (TC.ver === c.k ? ' class="sel"' : '') + ' title="' + esc(c.nombre) + '">' + (c.caps ? esc(c.t) : '<a href="#ficha/' + encodeURIComponent(c.cod) + '">' + esc(c.t) + '</a>') + '</th>').join('') + '</tr></thead><tbody>' +
    TC_EJES.map(e => { const s = estEje(e[0]); return '<tr><td class="eje"><a href="' + e[3] + '"><span class="ms" aria-hidden="true">' + e[2] + '</span><span>' + e[0] + ' · ' + esc(e[1]) + '<small style="color:' + ({ er: '#B4361F', wa: '#8A5200', ok: '#1E6B42' }[s]) + '">' + ({ er: 'Urgente', wa: 'Pronto', ok: 'Al día' }[s]) + '</small></span></a></td>' + cols.map(c => tcCelda(e[0], c, X)).join('') + '</tr>'; }).join('') +
    '</tbody></table></div><div class="tcLey"><span><span class="ms" aria-hidden="true" style="color:#B4361F">error</span>Urgente: vencido o con riesgo</span><span><span class="ms" aria-hidden="true" style="color:#8A5200">schedule</span>Pronto: vence en 30 días o a verificar</span><span><span class="ms" aria-hidden="true" style="color:#2E5E70">info</span>Aviso</span><span><span class="ms" aria-hidden="true" style="color:#1E6B42">check_circle</span>Al día</span><span><span class="ms" aria-hidden="true" style="color:#5B6B73">remove</span>s/d, no corresponde o se ve en el hospital</span></div></section>';
  // 4) Hoy, primero esto
  const ejeN = k => (TC_EJES.find(e => e[0] === k) || [k, ''])[1], colN = k => { const c = cols.find(z => z.k === k); return c ? (c.caps ? c.t : c.cod) : 'Red'; };
  let lista = urg.concat(V.filter(x => x.n === 'av')).sort((a, b) => TC_NIV[a.n] - TC_NIV[b.n] || (a.fecha || '9').localeCompare(b.fecha || '9'));
  const cuentaDep = { '': lista.length, hys: lista.filter(x => x.dep === 'hys').length, inst: lista.filter(x => x.dep !== 'hys').length };
  if (TC.dep) lista = lista.filter(x => TC.dep === 'hys' ? x.dep === 'hys' : x.dep !== 'hys');
  const verN = TC.todos ? lista.length : 6;
  const hoyHtml = '<section class="card tcHoy" id="tcHoy" style="display:flex;flex-direction:column;gap:8px"><div style="display:flex;justify-content:space-between;gap:8px;align-items:baseline"><h2 style="font-size:17px">Hoy, primero esto</h2>' + (lista.length > 6 ? '<button class="link" id="tcTodos">' + (TC.todos ? 'Ver menos' : 'Ver las ' + lista.length) + '</button>' : '') + '</div>' +
    '<div class="tcCols" role="group" aria-label="Filtrar por de quién depende">' + [['', 'Todo'], ['hys', 'Depende de HyS'], ['inst', 'Institución']].map(d => '<button data-tcd="' + d[0] + '" class="' + (TC.dep === d[0] ? 'on' : '') + '" aria-pressed="' + (TC.dep === d[0]) + '">' + d[1] + ' (' + cuentaDep[d[0]] + ')</button>').join('') + '</div>' +
    (lista.length ? lista.slice(0, verN).map(x => '<a class="fila" href="' + x.h + '"><span class="ms" aria-hidden="true" style="color:' + ({ er: '#B4361F', wa: '#8A5200', av: '#2E5E70' }[x.n]) + '">' + (TC_EJES.find(e => e[0] === x.eje) || [])[2] + '</span><span style="flex:1;min-width:0"><b>' + esc(colN(x.col)) + ' · ' + esc(x.t) + '</b><small>' + ({ er: 'Urgente', wa: 'Pronto', av: 'Aviso' }[x.n]) + ' · ' + x.eje + ' · ' + esc(ejeN(x.eje)) + (x.fecha ? ' · ' + fechaTxt(x.fecha) : '') + '</small><i style="color:' + (x.dep === 'hys' ? 'var(--az)' : 'var(--pa)') + '">' + (x.dep === 'hys' ? 'Depende de HyS' : 'Depende de la institución') + '</i></span><span class="ms" aria-hidden="true" style="color:var(--pa)">chevron_right</span></a>').join('')
      : '<div class="mu">Nada pendiente con los datos cargados.</div>') + '</section>';
  // 5) Próximos 30 días
  const hoyS = new Date().toISOString().slice(0, 10), lim = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);
  const ag = X.H.filter(x => x.fecha && /^\d{4}-\d{2}-\d{2}/.test(x.fecha) && x.fecha.slice(0, 10) >= hoyS && x.fecha.slice(0, 10) <= lim && enVer(x)).sort((a, b) => a.fecha.localeCompare(b.fecha));
  const vistos = {}, ag2 = ag.filter(x => { const k = x.eje + x.col + x.t + x.fecha; if (vistos[k]) return false; vistos[k] = 1; return true; }).slice(0, 8);
  const mesC = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const agHtml = '<section class="card" style="display:flex;flex-direction:column;gap:4px"><h2 style="font-size:17px;margin-bottom:4px">Próximos 30 días</h2>' +
    (ag2.length ? ag2.map(x => '<a class="tcAg" href="' + x.h + '"><span><b>' + x.fecha.slice(8, 10) + '</b><small>' + mesC[Number(x.fecha.slice(5, 7)) - 1] + '</small></span><span><b>' + esc(x.t || ejeN(x.eje) + ': vencimiento') + '</b><small>' + x.eje + ' · ' + esc(ejeN(x.eje)) + (x.col ? ' · ' + esc(colN(x.col)) : '') + '</small></span></a>').join('')
      : '<div class="mu peq">No hay fechas cargadas para los próximos 30 días.</div>') + '</section>';
  // 6) Cómo viene · últimos 6 meses
  const m6 = (TB.meses || []).slice(-6), mE = m6.map(m => mesC[Number(m.slice(5, 7)) - 1]);
  const ret = m6.map(m => Object.keys(TB.retiros || {}).reduce((s, a) => s + (((TB.retiros[a] || {})[m] || {}).Y1 || 0) + (((TB.retiros[a] || {})[m] || {}).Y3 || 0), 0));
  const sinM = {}; ((TC.sin && TC.sin.por && TC.sin.por.mes) || []).forEach(p => sinM[p[0]] = p[1]);
  const capM = {}; ((CAPT && CAPT.meses) || []).forEach(p => capM[p.mes] = p.n);
  const porEje = TC_EJES.map(e => conNivel.filter(x => x.eje === e[0] && (x.n === 'er' || x.n === 'wa') && enVer(x)).length);
  const tarj = (t, cuerpo, s, link) => '<section class="card" style="display:flex;flex-direction:column;gap:8px;min-width:0"><div style="display:flex;justify-content:space-between;gap:8px;align-items:baseline"><b style="color:var(--az);font-size:14.5px">' + t + '</b>' + (link ? '<a class="peq" style="font-weight:700" href="' + link + '">Ver</a>' : '') + '</div>' + cuerpo + '<span class="mu peq">' + s + '</span></section>';
  const tend = '<h2 style="margin:18px 0 8px;font-size:17px">Cómo viene · últimos 6 meses</h2><div class="tb3" style="grid-template-columns:repeat(auto-fit,minmax(280px,1fr))">' +
    tarj('Urgente y pronto, mes a mes', (() => { const H = TC.hist || [], ult = {}; H.forEach(f => { ult[f.fecha.slice(0, 7)] = f; });
      if (!TC.hist) return '<div class="mu peq">Cargando…</div>'; if (TC.histFalta) return '<div class="mu peq">Falta publicar la versión nueva del Apps Script «Sistema HyS» (Tablero.gs con el historial). Mientras tanto no se guarda.</div>'; if (!H.length) return '<div class="mu peq">Empieza a guardarse hoy: cada día que abras el portal queda una foto de toda la red.</div>';
      return tcBarras(m6.map(m => ult[m] ? (ult[m].er || 0) + (ult[m].wa || 0) : null), mE, '#B4361F', 'Urgente y pronto por mes'); })(),
      'Toda la red · el último día guardado de cada mes (TC_HISTORIAL, desde el 08/11/2026). «s/d»: ese mes no hay foto.', '#tcMapa') +
    tarj('Urgente y próximo, por eje (hoy)', tcBarras(porEje, TC_EJES.map(e => e[0]), '#B4361F', 'Temas urgentes y próximos por eje'), 'Número de eje (1 Residuos … 11 Plan de acción): dónde se concentra lo pendiente hoy.', '#tcMapa') +
    tarj('Retiros de residuos (manifiestos Y1 + Y3)', m6.length ? tcBarras(ret, mE, '#0D313F', 'Retiros por mes: ' + ret.join(', ')) : '<div class="mu peq">Cargando…</div>', 'Toda la red, por mes. Que baje puede ser falta de carga, no de retiro.', '#res') +
    tarj('Siniestros laborales', TC.sin ? tcBarras(m6.map(m => sinM[m] || 0), mE, '#0D313F', 'Siniestros por mes') : '<div class="mu peq">Cargando…</div>', 'Casos del período (sin rechazados ni inculpables) · los carga el Servicio de Personal.', '#sinest') +
    tarj('Registros de capacitación', CAPT ? tcBarras(m6.map(m => capM[m] || 0), mE, '#5894A7', 'Registros de capacitación por mes') : '<div class="mu peq">Cargando…</div>', 'Asistencias y evaluaciones registradas en el mes.', '#cap') + '</div>';
  // Accesos rápidos de documentos (antes, tarjeta «Documentos» del tablero)
  const acc = '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:16px"><a class="btn sec" href="' + NOTA_URL + '" target="_blank" rel="noopener">Nueva nota ↗</a><a class="btn sec" href="' + SEG_URL + '" target="_blank" rel="noopener">Envío y respuesta ↗</a><a class="btn sec" href="' + REC_URL + '" target="_blank" rel="noopener">Nota recibida ↗</a><a class="btn sec" href="#notas">Notas enviadas y recibidas</a></div>';
  const pie = '<div class="tcPie"><img src="https://hyslhmh-sudo.github.io/manifiestos/desvios/logo-hysl.png" alt="Higiene y Seguridad Laboral · Hospitales más seguros para las personas"></div>';

  marco('#inicio', '<div class="cab"><div><span class="mu peq">Inicio</span><h1>Tablero de control</h1><span class="mu peq">' + new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) + (TB.vacio ? ' · cargando datos…' : ' · datos al ' + new Date(TB.actualizado).toLocaleString('es-AR')) + '</span></div>' +
    '<div class="filtros" style="align-items:center"><div class="tcCols" role="group" aria-label="Ver un establecimiento">' + [{ k: '', t: 'Toda la red' }].concat(cols).map(c => '<button data-tcv="' + esc(c.k) + '" class="' + (TC.ver === c.k ? 'on' : '') + '" aria-pressed="' + (TC.ver === c.k) + '">' + esc(c.caps ? c.t.replace(' (Rawson)', '') : c.t) + '</button>').join('') + '</div><button class="btn sec" id="tbAct">Actualizar</button></div></div>' +
    frase + nums + '<div class="tcGrid"><div class="tcMain">' + mapa + '</div><div class="tcSide">' + hoyHtml + agHtml + '</div></div>' + tend + acc + pie);
  document.querySelectorAll('[data-tcv]').forEach(b => b.onclick = () => { TC.ver = b.dataset.tcv; inicio(); });
  document.querySelectorAll('[data-tcd]').forEach(b => b.onclick = () => { TC.dep = b.dataset.tcd; inicio(); });
  document.querySelectorAll('[data-tcdep]').forEach(a => a.onclick = e => { e.preventDefault(); TC.dep = a.dataset.tcdep; inicio(); setTimeout(() => { const l = $('tcHoy'); if (l) l.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 50); });
  document.querySelectorAll('a[href="#tcHoy"],a[href="#tcMapa"]').forEach(a => a.onclick = e => { e.preventDefault(); const l = $(a.getAttribute('href').slice(1)); if (l) l.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
  if ($('tcTodos')) $('tcTodos').onclick = () => { TC.todos = !TC.todos; inicio(); };
  $('tbAct').onclick = () => { CAMBIO_RES = true; refrescarRes(); TC.rad = TC.inc = TC.sinPidio = TC.cap = false; if (CAPT) CAPT.calculado = ''; inicio(true); };
}
const sinTil = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
