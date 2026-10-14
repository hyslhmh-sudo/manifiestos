// Portal HyS · Estado del establecimiento (ficha): matriz urgencia × gravedad y vistas por tema
// Se carga desde portal.html (<script src>). Para el portal de respaldo de Google, herramientas/armar_respaldo.py lo junta en un solo archivo.
// No pide nada nuevo al servidor: usa los datos del tablero de control (p_tablero), del resumen (p_resumen), de siniestros (p_sin_lista) y del módulo 8 (m8_datos), filtrados por establecimiento.
// Cuadrantes (mismo vocabulario que los plazos técnicos de los informes): Actuar ya (urgente y grave), Resolver rápido (urgente y leve),
// Planificar (no urgente y grave), Vigilar (no urgente y leve). Las reglas están en eeItems().
let EE = { vista: 'matriz' };
const EE_CUAD = [
  { k: 'AY', t: 'Actuar ya', s: 'Urgente y grave', col: '#B4361F', fondo: '#FBEDEA' },
  { k: 'RR', t: 'Resolver rápido', s: 'Urgente y leve', col: '#B7791F', fondo: '#FDF5E6' },
  { k: 'PL', t: 'Planificar', s: 'No urgente y grave', col: '#0D313F', fondo: '#EAF1F4' },
  { k: 'VI', t: 'Vigilar', s: 'No urgente y leve', col: '#5894A7', fondo: '#F2F6F8' }
];
const EE_TEMAS = ['Residuos', 'Agua', 'Plagas', 'Cocina', 'Documentos', 'Personal y RAR', 'Infraestructura'];
// Estilos propios: matriz 2 × 2 (una columna en el celular) y vista por tema con panel lateral
function eeEstilos() { if (document.getElementById('eeCss')) return; const st = document.createElement('style'); st.id = 'eeCss';
  st.textContent = '.ee-m{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.ee-v{display:grid;grid-template-columns:minmax(0,2fr) minmax(0,1fr);gap:12px;align-items:start}@media (max-width:760px){.ee-m{grid-template-columns:1fr}}@media (max-width:1000px){.ee-v{grid-template-columns:1fr}}';
  document.head.appendChild(st); }
const eeCuad = (urg, grave) => urg ? (grave ? 'AY' : 'RR') : (grave ? 'PL' : 'VI');

// Arma la lista de temas a atender de un establecimiento: { tema, cuad, texto, detalle, ir }
// Texto de una observación de remisión semanal: quién la indicó, recordatorio del protocolo y repeticiones del último mes
function remObsTxt(o, rec) {
  const quien = String(o.quien || '').split(/ \(| · /)[0], r = (rec || 'Recordar al CAPS el protocolo de trabajo: remisión semanal de manifiestos a Higiene y Seguridad (PROT-RES-003).');
  return (quien && quien !== 's/d' ? 'Lo indicó ' + quien + ' el ' + fechaTxt(o.fecha).slice(0, 5) + '. ' : '') + (/caps|centro/i.test(o.sitio) ? r : r.replace('al CAPS', 'al sitio')) + (o.veces > 1 ? ' ' + o.veces + '.ª vez en el último mes.' : '');
}
function eeItems(cod, f) {
  const T = TB || {}, hoy = new Date().toISOString().slice(0, 10), sem = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10);
  const L = [], add = (tema, urg, grave, texto, detalle, ir) => L.push({ tema: tema, cuad: eeCuad(urg, grave), texto: texto, detalle: detalle || '', ir: ir || '' });
  const de = l => (l || []).filter(x => x.cod === cod), fc = '#ficha/' + encodeURIComponent(cod);
  // Residuos
  const activo = /^activ/i.test(f.estado || '');
  if (f.diasSinRetiro != null && f.diasSinRetiro > 30) add('Residuos', true, true, f.diasSinRetiro + ' días sin retiro de residuos', 'Último manifiesto ' + fechaTxt(f.ultimoRetiro), fc);
  else if (f.diasSinRetiro != null && f.diasSinRetiro > 10) add('Residuos', true, false, f.diasSinRetiro + ' días sin retiro de residuos', 'Último manifiesto ' + fechaTxt(f.ultimoRetiro), fc);
  else if (activo && f.diasSinRetiro == null) add('Residuos', false, false, 'Sin retiros registrados', 'Habilitado en la aplicación, todavía sin manifiestos', fc);
  const dg = f.diag;
  if (!dg || dg.pct === '' || dg.pct == null) add('Residuos', false, true, 'Sin diagnóstico de residuos', 'Falta la línea de base', '#diag/' + encodeURIComponent(cod));
  else {
    if (dg.estado === 'Enviado') add('Residuos', true, false, 'Diagnóstico enviado por el referente', 'Revisar y cerrar', '#diag/' + encodeURIComponent(cod));
    if (Number(dg.criticos) > 0) add('Residuos', false, true, dg.criticos + ' punto(s) crítico(s) en el diagnóstico', 'Cumplimiento ' + Math.round(dg.pct) + ' %', '#diag/' + encodeURIComponent(cod));
    else if (Number(dg.pct) < 50) add('Residuos', false, true, 'Diagnóstico de residuos con ' + Math.round(dg.pct) + ' % de cumplimiento', 'Menos de la mitad de los requisitos', '#diag/' + encodeURIComponent(cod));
  }
  de((T.auditorias || {}).paraVerificar).forEach(a => add('Residuos', true, false, 'Auditoría interna para verificar', a.id, '#audr/' + encodeURIComponent(a.id)));
  // Remisión semanal de manifiestos (PROT-RES-003 · ResiduosRemision.gs): sitios sin manifiestos de 2 semanas y «no se recibieron»
  const RM = T.remision || {};
  if (RM.activa) { const av = de(RM.avisos).filter(a => !a.silenciado);
    if (av.length) add('Residuos', true, false, av.length + (av.length > 1 ? ' sitios' : ' sitio') + ' sin manifiestos cargados de las últimas 2 semanas',
      av.slice(0, 3).map(a => a.sitio + ' (último ' + fechaTxt(a.ultimo) + (a.nro ? ', N.º ' + a.nro : '') + ')').join(' · ') + (av.length > 3 ? ' · …' : '') + '. Remisión semanal a HyS (PROT-RES-003).', fc); }
  const vistoRM = {};
  de(RM.observaciones).forEach(o => { const k = o.sitio.toLowerCase(); if (vistoRM[k]) return; vistoRM[k] = 1;   // la más reciente de cada sitio
    add('Residuos', true, false, o.sitio + ': no se recibieron manifiestos (semana del ' + fechaTxt(o.semana) + ')', remObsTxt(o, RM.recordar), fc); });
  // Acciones abiertas de todos los módulos, agrupadas por tema y cuadrante
  const temaDe = o => /agua/i.test(o) ? 'Agua' : /plaga/i.test(o) ? 'Plagas' : /infraestr|servicios/i.test(o) ? 'Infraestructura' : 'Residuos';
  const grupos = {};
  de(T.acciones).forEach(a => {
    const ay = /actuar/i.test(a.prioridad || ''), pronto = !a.vencida && a.limite && a.limite <= sem;
    const urg = a.vencida || ay || pronto, grave = a.vencida ? (ay || /resolver/i.test(a.prioridad || '') || !a.prioridad) : (ay || /resolver/i.test(a.prioridad || ''));
    const k = temaDe(a.origen || '') + '|' + eeCuad(urg, grave) + '|' + (a.vencida ? 'v' : pronto ? 'p' : 'a');
    (grupos[k] = grupos[k] || []).push(a);
  });
  Object.keys(grupos).forEach(k => { const [tema, cuad, tipo] = k.split('|'), l = grupos[k];
    L.push({ tema: tema, cuad: cuad, texto: l.length + ' acción(es) ' + (tipo === 'v' ? 'vencida(s)' : tipo === 'p' ? 'que vencen en 7 días' : 'abierta(s)'),
      detalle: l.slice(0, 2).map(a => a.que || a.origen).filter(Boolean).join(' · ') + (l.length > 2 ? ' · …' : ''), ir: '#acciones' }); });
  // Agua
  de(T.noApta).forEach(a => add('Agua', true, true, 'Agua NO APTA en ' + a.punto, 'Limpiar y tomar nueva muestra antes del ' + fechaTxt(a.limite), fc));
  const tq = de(T.tanques), pt = de(T.puntos), n = (l, e) => l.filter(x => x.estado === e).length;
  if (n(tq, 'vencida')) add('Agua', true, true, n(tq, 'vencida') + ' tanque(s) con la limpieza vencida', 'Registrar la limpieza con el F-AGU-01', fc);
  if (n(pt, 'vencida')) add('Agua', true, true, n(pt, 'vencida') + ' canilla(s) con el análisis bacteriológico vencido', 'Tomar muestra según el proceso provincial', fc);
  if (n(tq, 'porvencer') + n(pt, 'porvencer')) add('Agua', false, false, (n(tq, 'porvencer') + n(pt, 'porvencer')) + ' limpieza(s) o análisis por vencer', 'Programar', fc);
  if (n(tq, 'sin') + n(pt, 'sin')) add('Agua', false, true, (n(tq, 'sin') + n(pt, 'sin')) + ' tanque(s) o canilla(s) sin registro', 'Cargar la última limpieza o el último análisis', fc);
  if (activo && !tq.length && !pt.length) add('Agua', false, true, 'Sin inventario de tanques y canillas', 'Cargar desde «Mi establecimiento» o el diagnóstico de agua', '#aguadiag');
  // Plagas
  de(T.plagas).forEach(p => {
    if (p.revision && p.revision < hoy) add('Plagas', true, true, 'Revisión de plagas atrasada', p.caso + ' · ' + p.plaga, '#plagas');
    else if (p.revision === hoy) add('Plagas', true, false, 'Revisión de plagas hoy', p.caso + ' · ' + p.plaga, '#plagas');
    else add('Plagas', false, false, 'Caso de plagas abierto', p.caso + ' · ' + p.plaga + (p.revision ? ' · revisión ' + fechaTxt(p.revision) : ''), '#plagas');
  });
  // Cocina
  de(T.cocina).forEach(c => {
    if (c.vencidos) add('Cocina', true, true, c.vencidos + ' persona(s) de cocina sin carnet o libreta vigente', 'Vencido o faltante', '#cocper/' + encodeURIComponent(cod));
    if (c.porVencer) add('Cocina', false, false, c.porVencer + ' carnet(s) o libreta(s) vencen en 60 días', 'Personas de cocina', '#cocper/' + encodeURIComponent(cod));
  });
  // Documentos propios del establecimiento
  de((T.docsEst || {}).avisos).forEach(d => add('Documentos', d.estado === 'vencido', false, (d.codigo || 'Documento') + (d.estado === 'vencido' ? ' vencido' : ' vence el ' + fechaTxt(d.vence)), d.titulo || '', '#docest/' + encodeURIComponent(cod)));
  // Personal y RAR: siniestros (4 · Personal y RAR › Siniestros, acción p_sin_lista). Se leen aparte: si todavía no llegaron, no suman.
  const hace = d => d ? Math.max(0, Math.floor((Date.now() - new Date(String(d).slice(0, 10) + 'T12:00:00')) / 864e5)) : 0;
  const SL = typeof SINP !== 'undefined' && SINP && SINP.lista ? SINP.lista : [];
  SL.filter(s => s.est === cod || (f.nombre && s.est === f.nombre)).forEach(s => {
    const ir = '#sin/' + encodeURIComponent(s.id);
    if (s.estadoHys === 'Pendiente de análisis') { const d = hace(s.fecha); add('Personal y RAR', d > 15, true, 'Investigación de siniestro pendiente', (s.nro || '') + ' · ' + (s.tipo || '') + ' · hace ' + d + ' días', ir); }
    if ((s.avisos || []).length) add('Personal y RAR', true, false, 'Siniestro con avisos', (s.nro || '') + ' · ' + s.avisos.join(' · '), ir);
    if (s.estado === 'En ILT') add('Personal y RAR', false, false, 'Persona en ILT (con baja)', (s.nro || '') + (s.dias ? ' · ' + s.dias + ' días de baja' : ''), ir);
  });
  // Infraestructura: hallazgos abiertos del módulo 8, con la misma regla que las acciones de los otros módulos
  if (typeof M8 !== 'undefined' && M8 && M8.ok) {
    const estDe = {}; (M8.relevamientos || []).forEach(x => estDe[x.id] = x.est || ((M8.servicios || []).find(v => v.id === x.servicio) || {}).est);
    const g8 = {};
    (M8.hallazgos || []).filter(h => !/cerr|cumpl|descart|resuelto/i.test(h.estado || '') && estDe[h.rel] === cod).forEach(h => {
      const venc = !!h.limite && h.limite < hoy, ay = /actuar/i.test(h.prioridad || ''), pronto = !venc && h.limite && h.limite <= sem;
      const urg = venc || ay || pronto, grave = venc ? (ay || /resolver/i.test(h.prioridad || '') || !h.prioridad) : (ay || /resolver/i.test(h.prioridad || ''));
      const k = eeCuad(urg, grave) + '|' + (venc ? 'v' : pronto ? 'p' : 'a'); (g8[k] = g8[k] || []).push(h);
    });
    Object.keys(g8).forEach(k => { const [cuad, tipo] = k.split('|'), l = g8[k];
      L.push({ tema: 'Infraestructura', cuad: cuad, texto: l.length + ' hallazgo(s) ' + (tipo === 'v' ? 'vencido(s)' : tipo === 'p' ? 'que vencen en 7 días' : 'abierto(s)') + ' del módulo 8',
        detalle: l.slice(0, 2).map(h => [h.servicio, h.item || h.cod].filter(Boolean).join(': ')).join(' · ') + (l.length > 2 ? ' · …' : ''), ir: '#m8plan' }); });
  }
  return L;
}

async function estadoEst(cod) {
  const box = $('fEstado'); if (!box) return;
  if (!TB) TB = LS.get('tab', null);
  if (!TB || TB.vacio) {
    box.innerHTML = '<h2>Estado del establecimiento</h2><div class="mu">Leyendo los datos del tablero…</div>';
    try { const r = await api('p_tablero', {}, 240000); if (r && r.ok) { TB = r; LS.set('tab', r); } } catch (e) {}
    if (!$('fEstado')) return;   // se cambió de pantalla mientras leía
  }
  EE.cod = cod; eeDibujar(cod);
  eeExtras(cod, false);
}
// Siniestros y módulo 8 se leen aparte (no frenan la matriz): al llegar, se redibuja si la ficha sigue abierta
async function eeExtras(cod, fresco) {
  const pedir = [];
  if (fresco || typeof SINP === 'undefined' || !SINP) pedir.push(api('p_sin_lista', {}, 120000).then(r => { if (r && r.ok) SINP = r; }).catch(() => {}));
  if (typeof m8url === 'function' && m8url() && (fresco || typeof M8 === 'undefined' || !M8)) pedir.push(m8api('m8_datos').then(d => { if (d && d.ok) M8 = d; }).catch(() => {}));
  if (!pedir.length) return;
  EE.leyendo = true; await Promise.all(pedir); EE.leyendo = false;
  if ($('fEstado') && EE.cod === cod) eeDibujar(cod);
}

function eeDibujar(cod) {
  const box = $('fEstado'); if (!box) return; eeEstilos();
  const f = (RES && RES.filas.find(x => x.cod === cod)) || {}, L = eeItems(cod, f), V = EE.vista;
  const item = x => '<a class="at" href="' + esc(x.ir || '#') + '" style="display:block;padding:6px 0;border-bottom:1px solid var(--ln);text-decoration:none;color:inherit"><b class="peq">' + esc(x.texto) + '</b>' +
    '<div class="mu peq">' + esc((V === 'matriz' ? x.tema + (x.detalle ? ' · ' : '') : '') + x.detalle) + '</div></a>';
  const cuenta = k => L.filter(x => x.cuad === k).length;
  const matriz = lista => '<div class="ee-m">' + EE_CUAD.map(c => { const l = lista.filter(x => x.cuad === c.k);
    return '<div style="border:1px solid var(--ln);border-top:4px solid ' + c.col + ';border-radius:12px;padding:12px 14px;background:' + c.fondo + ';min-height:120px">' +
      '<div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px"><b style="color:' + c.col + '">' + c.t + '</b><b style="font-size:20px;color:' + c.col + '">' + l.length + '</b></div>' +
      '<div class="mu peq" style="margin-bottom:6px">' + c.s + '</div>' + (l.length ? l.map(item).join('') : '<div class="mu peq">Nada en este cuadrante.</div>') + '</div>'; }).join('') + '</div>';
  const nTema = t => L.filter(x => x.tema === t && (x.cuad === 'AY' || x.cuad === 'RR')).length;
  const tabs = '<div class="tabs" style="margin:12px 0"><button class="btn ' + (V === 'matriz' ? 'pri' : 'sec') + '" data-ee="matriz">Todos los temas</button>' +
    EE_TEMAS.map(t => '<button class="btn ' + (V === t ? 'pri' : 'sec') + '" data-ee="' + esc(t) + '">' + esc(t) + (nTema(t) ? ' <span class="chip er">' + nTema(t) + '</span>' : '') + '</button>').join('') + '</div>';
  const btn = (h, t) => '<a class="btn sec" href="' + esc(h) + '">' + t + '</a>';
  const ce = encodeURIComponent(cod);
  const dato = (k, v) => '<dt>' + k + '</dt><dd>' + v + '</dd>';
  const sinE = typeof SINP !== 'undefined' && SINP && SINP.lista ? SINP.lista.filter(x => x.est === cod || (f.nombre && x.est === f.nombre)) : null;
  let m8E = null; if (typeof M8 !== 'undefined' && M8 && M8.ok) { const estDe = {}; (M8.relevamientos || []).forEach(x => estDe[x.id] = x.est || ((M8.servicios || []).find(v => v.id === x.servicio) || {}).est);
    m8E = (M8.hallazgos || []).filter(h => !/cerr|cumpl|descart|resuelto/i.test(h.estado || '') && estDe[h.rel] === cod); }
  let cuerpo;
  if (V === 'matriz') cuerpo = matriz(L) + (L.length ? '' : '<p class="mu peq" style="margin-top:8px">Sin temas pendientes con los datos cargados. Si el establecimiento todavía no carga datos en el sistema, los cuadrantes quedan vacíos aunque haya problemas: revisá cada tema.</p>');
  else {
    const lt = L.filter(x => x.tema === V);
    const extra = {
      'Residuos': ['<dl class="datos">' + dato('Último retiro', fechaTxt(f.ultimoRetiro)) + dato('Días sin retiro', f.diasSinRetiro == null ? 's/d' : String(f.diasSinRetiro)) + dato('Retiros este mes', f.retirosMes == null ? 's/d' : String(f.retirosMes)) + dato('Diagnóstico', chipDiag(f.diag)) + '</dl>',
        btn('#diag/' + ce, 'Diagnóstico') + btn('#aud', 'Auditorías') + btn('#plan', 'Plan de acción') + '<button class="btn sec" id="eeReg">Registros cargados</button>'],
      'Agua': ['<dl class="datos">' + dato('Tanques y cisternas', String((TB.tanques || []).filter(x => x.cod === cod).length)) + dato('Canillas (bacteriológico)', String((TB.puntos || []).filter(x => x.cod === cod).length)) + dato('NO APTA', String((TB.noApta || []).filter(x => x.cod === cod).length)) + '</dl>',
        '<button class="btn sec" id="eeMi">Ver tanques, canillas y análisis</button>' + btn('#agua', 'Tablero de agua') + btn('#aguadiag', 'Diagnóstico de agua')],
      'Plagas': ['<dl class="datos">' + dato('Casos abiertos', String((TB.plagas || []).filter(x => x.cod === cod).length)) + '</dl>',
        '<button class="btn sec" id="eeMi">Ver casos de plagas</button>' + btn('#plagas', 'Tablero de plagas') + btn('#plgdiag', 'Diagnóstico de plagas')],
      'Cocina': ['', btn('#cocper/' + ce, 'Personas de cocina') + btn('#cocdiag/' + ce, 'Relevamiento BPM / HACCP')],
      'Documentos': ['', btn('#docest/' + ce, 'Documentos propios') + btn('#notas', 'Notas enviadas y recibidas')],
      'Personal y RAR': ['<dl class="datos">' + (sinE ? dato('Siniestros abiertos', String(sinE.filter(x => x.abierto).length)) + dato('En ILT hoy', String(sinE.filter(x => x.estado === 'En ILT').length)) + dato('Investigación pendiente', String(sinE.filter(x => x.estadoHys === 'Pendiente de análisis').length)) : dato('Siniestros', EE.leyendo ? 'leyendo…' : 's/d')) + dato('Personal en la base', f.trabajadores == null ? 's/d' : String(f.trabajadores)) + dato('Capacitados / activos', f.activos ? (f.capacitados || 0) + ' de ' + f.activos : 's/d') + '</dl>',
        btn('#trab/' + ce, 'Personas') + btn('#sin', 'Siniestros') + btn('#nte', 'NTE · nómina de expuestos')],
      'Infraestructura': [m8E ? '<dl class="datos">' + dato('Hallazgos abiertos', String(m8E.length)) + dato('Vencidos', String(m8E.filter(h => h.limite && h.limite < new Date().toISOString().slice(0, 10)).length)) + '</dl>' : '<p class="mu peq">' + (EE.leyendo ? 'Leyendo el módulo 8…' : 'Sin datos del módulo 8.') + '</p>', btn('#m8', 'Servicios e infraestructura') + btn('#m8plan', 'Hallazgos y plan')]
    }[V] || ['', ''];
    const sinReglas = EE.leyendo && (V === 'Personal y RAR' || V === 'Infraestructura') ? '<p class="mu peq">Leyendo siniestros y hallazgos del módulo 8…</p>' : '';
    cuerpo = '<div class="ee-v"><div>' + matriz(lt) + sinReglas + '</div>' +
      '<section class="card" style="display:flex;flex-direction:column;gap:10px"><h3 style="margin:0">' + esc(V) + '</h3>' + extra[0] + '<div style="display:flex;flex-wrap:wrap;gap:8px">' + extra[1] + '</div></section></div>';
  }
  box.innerHTML = '<div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:flex-end"><div><h2 style="margin:0">Estado del establecimiento</h2>' +
      '<span class="mu peq">Urgencia × gravedad con los datos del tablero' + (TB && TB.actualizado ? ' al ' + esc(new Date(TB.actualizado).toLocaleString('es-AR')) : '') + ' · ' + cuenta('AY') + ' para actuar ya · ' + cuenta('RR') + ' para resolver rápido</span></div>' +
      '<div class="filtros"><label class="f">Otro establecimiento<select class="c" id="eeSel">' + selectorEst(cod, false) + '</select></label><button class="btn sec" id="eeAct">Actualizar</button></div></div>' +
    tabs + cuerpo;
  box.querySelectorAll('[data-ee]').forEach(b => b.onclick = () => { EE.vista = b.dataset.ee; eeDibujar(cod); });
  $('eeSel').onchange = e => { if (e.target.value && e.target.value !== cod) location.hash = '#ficha/' + encodeURIComponent(e.target.value); };
  $('eeAct').onclick = async () => { box.querySelector('h2').textContent = 'Actualizando…'; try { const r = await api('p_tablero', { fresco: true }, 240000); if (r && r.ok) { TB = r; LS.set('tab', r); } } catch (e) {} eeDibujar(cod); eeExtras(cod, true); };
  if ($('eeReg')) $('eeReg').onclick = () => { const s = $('fReg'); if (s) { fichaReg(cod); s.scrollIntoView({ block: 'start' }); } };
  if ($('eeMi')) $('eeMi').onclick = () => { const s = $('fMi'); if (s) { fichaMi(cod); s.scrollIntoView({ block: 'start' }); } };
}
