// Portal HyS · Estado del establecimiento (ficha): matriz urgencia × gravedad y vistas por tema
// Se carga desde portal.html (<script src>). Para el portal de respaldo de Google, herramientas/armar_respaldo.py lo junta en un solo archivo.
// No pide nada nuevo al servidor: usa los datos del tablero de control (p_tablero) y del resumen (p_resumen), filtrados por establecimiento.
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
  eeDibujar(cod);
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
      'Personal y RAR': ['<dl class="datos">' + dato('Personal en la base', f.trabajadores == null ? 's/d' : String(f.trabajadores)) + dato('Capacitados / activos', f.activos ? (f.capacitados || 0) + ' de ' + f.activos : 's/d') + '</dl>',
        btn('#trab/' + ce, 'Personas') + btn('#sin', 'Siniestros') + btn('#nte', 'NTE · nómina de expuestos')],
      'Infraestructura': ['', btn('#m8', 'Servicios e infraestructura')]
    }[V] || ['', ''];
    const sinReglas = V === 'Personal y RAR' || V === 'Infraestructura' ? '<p class="mu peq">Este tema todavía no suma avisos a la matriz: se consulta en su pantalla.</p>' : '';
    cuerpo = '<div class="ee-v"><div>' + matriz(lt) + sinReglas + '</div>' +
      '<section class="card" style="display:flex;flex-direction:column;gap:10px"><h3 style="margin:0">' + esc(V) + '</h3>' + extra[0] + '<div style="display:flex;flex-wrap:wrap;gap:8px">' + extra[1] + '</div></section></div>';
  }
  box.innerHTML = '<div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:flex-end"><div><h2 style="margin:0">Estado del establecimiento</h2>' +
      '<span class="mu peq">Urgencia × gravedad con los datos del tablero' + (TB && TB.actualizado ? ' al ' + esc(new Date(TB.actualizado).toLocaleString('es-AR')) : '') + ' · ' + cuenta('AY') + ' para actuar ya · ' + cuenta('RR') + ' para resolver rápido</span></div>' +
      '<div class="filtros"><label class="f">Otro establecimiento<select class="c" id="eeSel">' + selectorEst(cod, false) + '</select></label><button class="btn sec" id="eeAct">Actualizar</button></div></div>' +
    tabs + cuerpo;
  box.querySelectorAll('[data-ee]').forEach(b => b.onclick = () => { EE.vista = b.dataset.ee; eeDibujar(cod); });
  $('eeSel').onchange = e => { if (e.target.value && e.target.value !== cod) location.hash = '#ficha/' + encodeURIComponent(e.target.value); };
  $('eeAct').onclick = async () => { box.querySelector('h2').textContent = 'Actualizando…'; try { const r = await api('p_tablero', { fresco: true }, 240000); if (r && r.ok) { TB = r; LS.set('tab', r); } } catch (e) {} eeDibujar(cod); };
  if ($('eeReg')) $('eeReg').onclick = () => { const s = $('fReg'); if (s) { fichaReg(cod); s.scrollIntoView({ block: 'start' }); } };
  if ($('eeMi')) $('eeMi').onclick = () => { const s = $('fMi'); if (s) { fichaMi(cod); s.scrollIntoView({ block: 'start' }); } };
}
