// Portal HyS · Diagnóstico de 2 · Agua y 3 · Plagas (DiagModulos.gs)
// Se carga desde portal.html (<script src>). Para el portal de respaldo de Google, herramientas/armar_respaldo.py lo junta en un solo archivo.
// Lista de establecimientos con su último relevamiento y el mismo formulario del diagnóstico de residuos (diagForm), con su configuración.
const DGMP = {
  agua: { ruta: '#aguadiag', tab: '#agua', mod: '2 · Agua', h1: 'Diagnóstico de agua', ico: 'water_drop', pal: 'diagnóstico',
    sub: 'Documentación y registros, tanques y cisternas (cada reservorio del inventario es un lugar), seguridad de quien limpia o toma muestras, y puntos de consumo y agua caliente. Los CAPS se relevan dentro del hospital del que dependen.',
    txtLugares: 'Estas preguntas se responden en cada tanque, cisterna o lugar que se recorre. Si un lugar no existe o no se revisó, dejalo sin completar.' },
  plagas: { ruta: '#plgdiag', tab: '#plagas', mod: '3 · Plagas', h1: 'Diagnóstico de plagas', ico: 'pest_control', pal: 'diagnóstico',
    sub: 'Manejo integrado de plagas (MIP) en toda la red: programa y registros, productos y seguridad de quien aplica, condiciones del edificio, residuos y exterior, y situación actual. El registro de intervenciones (MIPyV) sigue solo en Trelew.',
    txtLugares: 'Estas preguntas se responden en cada lugar que se recorre. Si un lugar no existe o no se revisó, dejalo sin completar.' }
};
const DGMT = {};   // tablero de cada módulo (caché de la sesión)
async function dgmDatos(m, fresco) {
  if (!RES) { const g = LS.get('res', null); if (g) { RES = g; refrescarRes(); } }
  if (!DGMT[m] || fresco) { try { DGMT[m] = await api('p_dgm_tablero', { m: m, fresco: !!fresco }, 180000); } catch (e) { return false; } }
  return true;
}
async function dgmLista(m, fresco) {
  const P = DGMP[m];
  if (!DGMT[m] || fresco) cargando(P.ruta, 'Leyendo los diagnósticos…');
  if (!(await dgmDatos(m, fresco))) return;
  const T = DGMT[m], cab = '<div class="cab"><div><span class="mu peq">' + P.mod + '</span><h1>' + P.h1 + '</h1><span class="mu peq">' + esc(P.sub) + '</span></div>' +
    '<div class="filtros"><a class="btn sec" href="' + P.tab + '">Tablero del módulo</a><button class="btn sec" id="dmAct">Actualizar</button>' + (T && T.libro ? '<a class="btn sec" href="' + esc(T.libro) + '" target="_blank" rel="noopener">Planilla del diagnóstico ↗</a>' : '') + '</div></div>';
  if (!T.ok) { marco(P.ruta, cab + '<div class="aviso error">' + esc(T.mensaje || T.error || 'No se pudo leer el diagnóstico.') + '</div>' +
    (/desconocida/i.test(T.error || T.mensaje || '') ? '<section class="card peq">Falta publicar la versión del sistema que trae este diagnóstico.</section>' : '')); $('dmAct').onclick = () => dgmLista(m, true); return; }
  if (!T.instalado) { marco(P.ruta, cab + '<section class="card"><h2>Falta instalar el diagnóstico</h2><p class="peq">El cuestionario ya está revisado. Para empezar a usarlo, en el Apps Script «Sistema HyS» hay que ejecutar una vez <code>construirModulo' + (m === 'agua' ? 'Agua' : 'Plagas') + '</code>: arma la planilla del diagnóstico con las preguntas y los lugares.</p></section>'); $('dmAct').onclick = () => dgmLista(m, true); return; }
  const A = FILTRO.area, areas = Array.from(new Set(T.establecimientos.map(e => e.area))).filter(Boolean).sort(), S = T.totales;
  const E = T.establecimientos.filter(e => !A || e.area === A).sort((a, b) => (a.area + a.nombre).localeCompare(b.area + b.nombre));
  const kpi = (t, v, s, col) => '<div class="kpi2"><span>' + t + '</span><b' + (col ? ' style="color:' + col + '"' : '') + '>' + v + '</b><small>' + s + '</small></div>';
  marco(P.ruta, cab +
    '<div class="tb5">' + kpi('Relevados', S.relevados + ' de ' + S.establecimientos, 'con diagnóstico cerrado') + kpi('Cumplimiento promedio', S.promedio == null ? '—' : String(S.promedio).replace('.', ',') + ' %', 'de los relevados') +
      kpi('Con puntos críticos', S.criticos, 'algún punto crítico en 0', S.criticos ? 'var(--er)' : '') + kpi('En curso', S.borradores + S.enviados, (S.enviados ? S.enviados + ' enviado(s) para revisar · ' : '') + S.borradores + ' borrador(es)') + '</div>' +
    '<div class="filtros" style="margin:12px 0"><label class="f">Área<select class="c" id="dmA"><option value="">Toda la provincia</option>' + areas.map(a => '<option' + (a === A ? ' selected' : '') + '>' + esc(a) + '</option>').join('') + '</select></label></div>' +
    '<section class="card tabla"><table><thead><tr><th>Establecimiento</th><th>Área</th><th>Último diagnóstico</th><th>Resultado</th></tr></thead><tbody>' +
      (E.length ? E.map(e => '<tr class="cl" data-cod="' + esc(e.cod) + '"><td><b>' + esc(e.nombre) + '</b><div class="mu peq">' + esc(e.cod) + (e.tipo ? ' · ' + esc(e.tipo) : '') + '</div></td><td class="peq">' + esc(String(e.area || '').replace('Área Programática ', '')) + '</td>' +
        '<td>' + (e.diag ? fechaTxt(e.diag.fecha) : '—') + '</td><td>' + chipDiag(e.diag) + '</td></tr>').join('') : '<tr><td colspan="4" class="mu">No hay establecimientos en esta área.</td></tr>') +
    '</tbody></table></section><p class="mu peq">Tocá un establecimiento para abrir su diagnóstico o empezar uno. Después del diagnóstico vienen el informe a la Dirección y el plan de acción con propuestas de mejora.</p>');
  $('dmAct').onclick = () => dgmLista(m, true);
  $('dmA').onchange = e => { FILTRO.area = e.target.value; dgmLista(m); };
  document.querySelectorAll('tr.cl[data-cod]').forEach(tr => tr.onclick = () => location.hash = P.ruta + '/' + encodeURIComponent(tr.dataset.cod));
}
const dgmConfig = m => { const P = DGMP[m]; return {
  modo: 'hys', pal: P.pal,
  abrir: (cod, id) => api('p_dgm_abrir', { m: m, cod: cod, id: id }, 120000),
  guardar: p => api('p_dgm_guardar', Object.assign({ m: m }, p), 120000),
  foto: p => api('p_dgm_foto', Object.assign({ m: m }, p)),
  pantalla: html => marco(P.ruta, html),
  volver: '<a href="' + P.ruta + '" class="peq" style="font-weight:700;text-decoration:none">‹ Todos los diagnósticos de ' + (m === 'agua' ? 'agua' : 'plagas') + '</a>',
  titulo: () => P.h1,
  txtLugares: P.txtLugares, txtFaltaLugar: 'Falta relevar al menos un lugar.',
  extra: () => { const I = (DG.D.informes || [])[0]; return informesDiag() + '<section class="card" style="display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between"><div><h2>Plan de acción</h2><span class="mu peq">' +
    (I ? 'Las mejoras del informe ' + esc(I.codigo) + ' están en el plan de acción: ahí se carga el envío a la Dirección, la respuesta, el avance y la evidencia.' : 'Al generar el informe, sus mejoras (punto 6) pasan solas al plan de acción.') + '</span></div>' +
    (I ? '<a class="btn sec" href="#plan/' + encodeURIComponent(I.codigo) + '">Ver el plan de acción</a>' : '') + '</section>'; },
  alPintar: () => activarInformes(), accInforme: 'p_dgm_informe_' + m, accCorreo: 'p_dgm_correo_' + m,
  nombre: cod => ((DGMT[m] && DGMT[m].establecimientos && DGMT[m].establecimientos.find(e => e.cod === cod)) || (RES && RES.filas.find(f => f.cod === cod)) || { nombre: cod }).nombre,
  alGuardar: () => { DGMT[m] = null; }
}; };
const DCFG_AGU = dgmConfig('agua'), DCFG_PLG = dgmConfig('plagas');
function dgmRuta(m, cod) { if (!cod) return dgmLista(m); DCFG = m === 'agua' ? DCFG_AGU : DCFG_PLG; return diagForm(cod, ''); }
