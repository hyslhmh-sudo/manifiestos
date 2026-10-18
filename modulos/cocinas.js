// Portal HyS · 4 · Cocinas hospitalarias
// Se carga desde portal.html (<script src>). Para el portal de respaldo de Google, herramientas/armar_respaldo.py lo junta en un solo archivo.
// ------------------------------------------------------------------ Módulo 4 · Cocinas hospitalarias (Modulo6.gs)
// Tablero, personas de cocina (carnet de manipulador y libreta sanitaria) y relevamiento BPM / HACCP con el mismo formulario del diagnóstico.
let COCT = null, COCP = { cod: '*', filtro: '', L: null, cargado: '' };
const COC_EST = { vigente: ['Vigente', 'ok'], porvencer: ['Vence pronto', 'wa'], vencido: ['Vencido', 'er'], no: ['No tiene', 'er'], sd: ['Sin dato', 'gr'], opcional: ['Opcional', 'gr'] };
const cocChip = (e, vence) => { const x = COC_EST[e] || COC_EST.sd; return '<span class="chip ' + x[1] + '">' + x[0] + '</span>' + (vence && e !== 'no' ? '<div class="mu peq">' + (e === 'vencido' ? 'venció ' : 'vence ') + fechaTxt(vence) + '</div>' : ''); };
const cocFrac = (a, b) => b ? a + ' de ' + b : '—';
async function cocDatos(fresco) {
  if (!RES) { const g = LS.get('res', null); if (g) { RES = g; refrescarRes(); } }
  if (!COCT || fresco) { try { COCT = await api('p_coc_tablero', { fresco: !!fresco }, 180000); } catch (e) { return false; } }
  if (!COCT.ok) { marco('#coc', '<div class="aviso error">' + esc(COCT.mensaje || 'No se pudo leer el módulo de cocinas.') + '</div>'); return false; }
  return true;
}
async function cocTablero(fresco) {
  if (!COCT || fresco) cargando('#coc', 'Armando el tablero de cocinas…');
  if (!(await cocDatos(fresco))) return;
  const T = COCT.totales, A = FILTRO.area, areas = Array.from(new Set(COCT.establecimientos.map(e => e.area))).filter(Boolean).sort();
  const E = COCT.establecimientos.filter(e => !A || e.area === A).sort((a, b) => (a.area + (a.rural ? '1' : '0') + a.nombre).localeCompare(b.area + (b.rural ? '1' : '0') + b.nombre));
  const avisos = COCT.avisos.filter(v => !A || E.some(e => e.cod === v.cod));
  const nom = c => (COCT.establecimientos.find(e => e.cod === c) || { nombre: c }).nombre;
  const kpi = (h, t, v, s, col) => '<a class="kpi2" href="' + h + '"><span>' + t + '</span><b' + (col ? ' style="color:' + col + '"' : '') + '>' + v + '</b><small>' + s + '</small></a>';
  marco('#coc', '<div class="cab"><div><span class="mu peq">4 · Cocinas</span><h1>Cocinas hospitalarias</h1><span class="mu peq">Buenas prácticas de manufactura (BPM) en todos los establecimientos y sistema HACCP en los no rurales · personas que manipulan alimentos.</span></div>' +
    '<div class="filtros"><label class="f">Área<select class="c" id="ccA"><option value="">Toda la provincia</option>' + areas.map(a => '<option' + (a === A ? ' selected' : '') + '>' + esc(a) + '</option>').join('') + '</select></label><button class="btn sec" id="ccAct">Actualizar</button></div></div>' +
    '<div class="tb5">' + kpi('#cocdiag', 'Relevados', cocFrac(T.relevados, T.establecimientos), 'establecimientos con relevamiento cerrado') + kpi('#cocdiag', 'Cumplimiento promedio', T.promedio == null ? '—' : T.promedio + ' %', 'de los relevados') +
    kpi('#cocdiag', 'Con puntos críticos', T.criticos, T.enviados ? T.enviados + ' enviado(s) por referentes para revisar' : 'algún punto crítico en 0', T.criticos ? 'var(--er)' : '') +
    kpi('#cocper', 'Carnet vigente', cocFrac(T.carnetVigente, T.manipuladores != null ? T.manipuladores : T.personas), T.personas ? 'carnet de manipulador · personas de cocina cargadas' : 'todavía no hay personas de cocina cargadas') +
    kpi('#cocper', 'Libreta vigente', cocFrac(T.libretaVigente, T.manipuladores != null ? T.manipuladores : T.personas), 'libreta sanitaria') + kpi('#cocper', 'Vencidos o sin documento', T.vencidos, (T.porVencer ? T.porVencer + ' vencen en 60 días · ' : '') + (T.sinDato ? T.sinDato + ' sin dato' : 'carnet o libreta'), T.vencidos ? 'var(--er)' : '') + '</div>' +
    '<div class="tb2"><section class="card tabla" style="min-width:0"><div style="padding:14px 18px;border-bottom:1px solid var(--ln)"><h2>Por establecimiento</h2></div><div style="overflow-x:auto"><table><thead><tr><th>Establecimiento</th><th>Alcance</th><th>Relevamiento</th><th>Personas</th><th>Carnet</th><th>Libreta</th></tr></thead><tbody>' +
    E.map(e => { const p = e.personas; return '<tr class="cl" data-cod="' + esc(e.cod) + '"><td><b>' + esc(e.nombre) + '</b><div class="mu peq">' + esc(e.cod) + ' · ' + esc(e.tipo) + '</div></td><td class="peq">' + esc(e.alcance) + '</td><td>' + chipDiag(e.diag) + '</td>' +
      '<td>' + (p.total ? p.total + (p.empresa ? ' <span class="mu peq">(' + p.empresa + ' de empresa)</span>' : '') : '<span class="mu">—</span>') + '</td><td>' + (p.total ? chipCap(p.carnetVigente, p.total) : '<span class="chip gr">—</span>') + '</td><td>' + (p.total ? chipCap(p.libretaVigente, p.total) : '<span class="chip gr">—</span>') + '</td></tr>'; }).join('') +
    '</tbody></table></div></section>' +
    '<section class="card" style="display:flex;flex-direction:column;gap:6px;min-width:0"><h2>Requiere atención</h2>' + (avisos.length ? avisos.slice(0, 14).map(v => '<a class="at" href="#cocper/' + encodeURIComponent(v.cod) + '"><span class="tag ' + (COC_EST[v.estado] || COC_EST.sd)[1] + '">' + (COC_EST[v.estado] || COC_EST.sd)[0] + '</span><span><b>' + esc(v.nombre) + '</b><small>' + esc(nom(v.cod)) + ' · carnet: ' + (COC_EST[v.carnet] || COC_EST.sd)[0].toLowerCase() + ' · libreta: ' + (COC_EST[v.libreta] || COC_EST.sd)[0].toLowerCase() + '</small></span></a>').join('') +
      (avisos.length > 14 ? '<a class="link peq" href="#cocper">Ver los ' + avisos.length + '</a>' : '') : '<p class="mu" style="margin:0">' + (T.personas ? 'Todos los carnets y libretas cargados están vigentes.' : 'Todavía no hay personas de cocina cargadas.') + '</p>') + '</section></div>' +
    compartirDiag(''));
  $('ccA').onchange = e => { FILTRO.area = e.target.value; cocTablero(); };
  $('ccAct').onclick = () => cocTablero(true);
  document.querySelectorAll('tr.cl[data-cod]').forEach(tr => tr.onclick = () => location.hash = '#cocdiag/' + encodeURIComponent(tr.dataset.cod));
  activarCompartir('');
}
// Lista de relevamientos (para elegir el establecimiento)
async function cocLista() {
  if (!COCT) cargando('#cocdiag', 'Leyendo los relevamientos…');
  if (!(await cocDatos())) return;
  const E = COCT.establecimientos.slice().sort((a, b) => (a.area + (a.rural ? '1' : '0') + a.nombre).localeCompare(b.area + (b.rural ? '1' : '0') + b.nombre));
  marco('#cocdiag', '<div class="cab"><div><span class="mu peq">4 · Cocinas</span><h1>Relevamiento BPM / HACCP</h1><span class="mu peq">Hospitales rurales: BPM. Zonales, subzonales y regional: BPM y HACCP. Puestos sanitarios: solo si tienen servicio de alimentación. Línea de base: el informe propone mejoras (punto 6) que pasan al plan de acción.</span></div></div>' +
    '<section class="card tabla"><table><thead><tr><th>Establecimiento</th><th>Área</th><th>Alcance</th><th>Último relevamiento</th><th>Resultado</th><th></th></tr></thead><tbody>' +
    E.map(e => '<tr class="cl" data-cod="' + esc(e.cod) + '"><td><b>' + esc(e.nombre) + '</b><div class="mu peq">' + esc(e.cod) + '</div></td><td class="peq">' + esc(String(e.area).replace('Área Programática ', '')) + '</td><td class="peq">' + esc(e.alcance) + '</td><td>' + (e.diag ? fechaTxt(e.diag.fecha) : '—') + '</td><td>' + chipDiag(e.diag) + '</td><td><span class="link">' + (e.diag ? 'Abrir' : 'Empezar') + '</span></td></tr>').join('') +
    '</tbody></table></section>');
  document.querySelectorAll('tr.cl').forEach(tr => tr.onclick = () => location.hash = '#cocdiag/' + encodeURIComponent(tr.dataset.cod));
}
// Relevamiento: el mismo formulario del diagnóstico de residuos, con la configuración de cocinas
const DCFG_COC = {
  modo: 'hys', pal: 'relevamiento',
  abrir: (cod, id) => api('p_coc_abrir', { cod: cod, id: id }, 120000),
  guardar: p => api('p_coc_guardar', p, 120000),
  foto: p => api('p_coc_foto', p),
  pantalla: html => marco('#cocdiag', html),
  volver: '<a href="#cocdiag" class="peq" style="font-weight:700;text-decoration:none">‹ Todos los relevamientos de cocina</a>',
  titulo: () => 'Relevamiento de cocina · ' + (DG.D.alcance === 'Rural (BPM)' ? 'BPM' : 'BPM y HACCP'),
  txtLugares: 'Estas preguntas se responden en cada lugar que se recorre. Si un lugar no existe o no se revisó, dejalo sin completar.',
  txtFaltaLugar: 'Falta relevar al menos un lugar (por ejemplo, la cocina).',
  sinLugares: () => (DG.R['|COC01'] || {}).valor === 'No hay servicio de alimentación',   // sin servicio de alimentación se cierra solo con la primera pregunta
  extra: () => { const P = DG.D.personas; return '<section class="card" style="display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between"><div><h2>Personas de cocina</h2><span class="mu peq">' +
    (P && P.total ? P.total + ' cargada(s): carnet vigente ' + P.carnetVigente + ', libreta vigente ' + P.libretaVigente + (P.vencidos ? ', ' + P.vencidos + ' vencida(s) o sin documento' : '') + '. Las preguntas de carnet y libreta se sugieren con estos datos.' : 'Todavía no hay personas cargadas: conviene cargarlas antes, así las preguntas de carnet y libreta se completan solas.') +
    '</span></div><a class="btn sec" href="#cocper/' + encodeURIComponent(DG.cod) + '">Ver personas de cocina</a></section>' + informesDiag() + cocPlanCard(); },
  alPintar: () => activarInformes(), accInforme: 'p_coc_informe', accCorreo: 'p_coc_informe_correo',
  nombre: cod => ((COCT && COCT.establecimientos.find(e => e.cod === cod)) || (RES && RES.filas.find(f => f.cod === cod)) || { nombre: cod }).nombre,
  alGuardar: () => { COCT = null; }
};
function cocForm(cod, id) { DCFG = DCFG_COC; diagForm(cod, id); }

// Personas de cocina
async function cocPersonas(cod) {
  cod = cod || COCP.cod || '*'; COCP.cod = cod;
  if (!RES) { const g = LS.get('res', null); if (g) { RES = g; refrescarRes(); } }
  if (!COCP.L || COCP.cargado !== cod) {
    cargando('#cocper', 'Leyendo las personas de cocina…');
    let r; try { r = await api('p_coc_personas', { cod: cod }, 120000); } catch (e) { return; }
    if (!r.ok) return marco('#cocper', '<div class="aviso error">' + esc(r.mensaje || 'No se pudo leer.') + '</div>');
    COCP.L = r; COCP.cargado = cod;
  }
  const R = COCP.L, f = COCP.filtro, nom = c => ((RES && RES.filas.find(x => x.cod === c)) || { nombre: c }).nombre;
  const L = R.personas.filter(p => p.ACTIVO !== 'No' || f === 'baja').filter(p => !f || (f === 'atencion' ? p.estado !== 'vigente' : f === 'empresa' ? p.ORIGEN === 'Empresa' : f === 'baja' ? p.ACTIVO === 'No' : true))
    .sort((a, b) => (a.ESTABLECIMIENTO + a.APELLIDO_Y_NOMBRE).localeCompare(b.ESTABLECIMIENTO + b.APELLIDO_Y_NOMBRE));
  const S = R.resumen, chipF = (v, t) => '<button class="fchip' + (f === v ? ' on' : '') + '" data-cf="' + v + '">' + t + '</button>';
  marco('#cocper', '<div class="cab"><div><span class="mu peq">4 · Cocinas</span><h1>Personas de cocina</h1><span class="mu peq">Carnet de manipulador de alimentos (vigencia 3 años) y libreta sanitaria (1 año). Si solo se carga la fecha de emisión, el vencimiento se calcula solo.</span></div>' +
    '<div class="filtros"><label class="f">Establecimiento<select class="c" id="cpE">' + selectorEst(cod, false, true) + '</select></label>' + (cod !== '*' ? '<button class="btn pri" id="cpNuevo">+ Agregar persona</button>' : '') + '</div></div>' +
    '<div class="tb5">' + [['Personas', S.total, S.empresa ? S.empresa + ' de empresa' : 'activas'], ['Carnet vigente', cocFrac(S.carnetVigente, S.manipuladores != null ? S.manipuladores : S.total), 'manipulador de alimentos' + (S.profesionales ? ' (sin nutricionistas)' : '')], ['Libreta vigente', cocFrac(S.libretaVigente, S.manipuladores != null ? S.manipuladores : S.total), 'libreta sanitaria'], ['Vencidos o sin documento', S.vencidos, S.porVencer ? S.porVencer + ' vencen en 60 días' : 'carnet o libreta'], ['Sin dato', S.sinDato, 'falta la fecha o el documento']]
      .map(k => '<div class="kpi2"><span>' + k[0] + '</span><b>' + k[1] + '</b><small>' + k[2] + '</small></div>').join('') + '</div>' +
    ((R.sugeridas || []).length ? '<section class="card"><div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;align-items:center"><h2>En la base de trabajadores</h2><span class="mu peq">' + R.sugeridas.length + ' persona(s) de ' + esc(nom(cod)) + ' con función o servicio de cocina, alimentación o nutrición que todavía no están en esta lista.</span></div>' +
      '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px">' + R.sugeridas.slice(0, 40).map((s, i) => '<button class="btn sec" data-sug="' + i + '" title="' + esc(s.funcion + ' · ' + s.servicio) + '">+ ' + esc(s.nombre) + '</button>').join('') + '</div></section>' : '') +
    '<div style="display:flex;gap:8px;flex-wrap:wrap">' + chipF('', 'Todas') + chipF('atencion', 'Requieren atención') + chipF('empresa', 'De empresa') + chipF('baja', 'Dadas de baja') + '</div>' +
    '<section class="card tabla"><div style="overflow-x:auto"><table><thead><tr><th>Persona</th>' + (cod === '*' ? '<th>Establecimiento</th>' : '') + '<th>Función</th><th>Carnet de manipulador</th><th>Libreta sanitaria</th><th></th></tr></thead><tbody>' +
    L.map(p => '<tr><td><b>' + esc(p.APELLIDO_Y_NOMBRE) + '</b><div class="mu peq">' + (p.DNI ? 'DNI ' + esc(p.DNI) : 'DNI s/d') + ' · ' + esc(p.ORIGEN === 'Empresa' ? 'Empresa' + (p.EMPRESA ? ' ' + p.EMPRESA : '') : 'Planta') + (p.ACTIVO === 'No' ? ' · <b>de baja</b>' : '') + '</div></td>' +
      (cod === '*' ? '<td class="peq">' + esc(nom(p.ESTABLECIMIENTO)) + '</td>' : '') + '<td class="peq">' + esc(p.FUNCION_COCINA || 's/d') + (p.profesional ? '<div>Matrícula: ' + cocChip(p.matricula, p.MATRICULA_VENCE) + (p.MATRICULA_NUMERO ? ' <span class="mu">' + esc(p.MATRICULA_NUMERO) + '</span>' : '') + (p.MATRICULA_FOTO ? ' <a class="link" href="' + esc(p.MATRICULA_FOTO) + '" target="_blank" rel="noopener">Ver</a>' : '') + '</div>' : '') + '</td>' +
      '<td>' + cocChip(p.carnet, p.carnetVence) + (p.CARNET_FOTO ? '<a class="link peq" href="' + esc(p.CARNET_FOTO) + '" target="_blank" rel="noopener">Ver foto</a>' : '') + '</td>' +
      '<td>' + cocChip(p.libreta, p.libretaVence) + (p.LIBRETA_FOTO ? '<a class="link peq" href="' + esc(p.LIBRETA_FOTO) + '" target="_blank" rel="noopener">Ver foto</a>' : '') + '</td>' +
      '<td><button class="link" data-cp="' + esc(p.ID) + '">Editar</button></td></tr>').join('') + '</tbody></table></div>' +
    (L.length ? '' : '<div class="vacio">' + (cod === '*' ? 'No hay personas con este filtro. Elegí un establecimiento para cargar.' : 'No hay personas cargadas con este filtro. Tocá «+ Agregar persona» o sumá las sugeridas de la base de trabajadores.') + '</div>') + '</section>' +
    '<p class="mu peq">También se puede cargar y corregir en la planilla: BASE COMÚN › COCINA_PERSONAS. Los referentes cargan desde «Mi establecimiento» › Cocina.</p>');
  $('cpE').onchange = e => location.hash = '#cocper/' + encodeURIComponent(e.target.value);
  document.querySelectorAll('[data-cf]').forEach(b => b.onclick = () => { COCP.filtro = b.dataset.cf; cocPersonas(cod); });
  if ($('cpNuevo')) $('cpNuevo').onclick = () => cocPersonaForm(null, { ESTABLECIMIENTO: cod, ORIGEN: 'Planta', CARNET_TIENE: 's/d', LIBRETA_TIENE: 's/d', ACTIVO: 'Sí' });
  document.querySelectorAll('[data-sug]').forEach(b => b.onclick = () => { const s = R.sugeridas[b.dataset.sug];
    cocPersonaForm(null, { ESTABLECIMIENTO: cod, ORIGEN: s.empresa ? 'Empresa' : 'Planta', EMPRESA: s.empresa, DNI: s.dni, APELLIDO_Y_NOMBRE: s.nombre, FUNCION_COCINA: '', CARNET_TIENE: 's/d', LIBRETA_TIENE: 's/d', ACTIVO: 'Sí', OBSERVACIONES: [s.funcion, s.servicio].filter(Boolean).join(' · ') }); });
  document.querySelectorAll('[data-cp]').forEach(b => b.onclick = () => cocPersonaForm(R.personas.find(p => p.ID === b.dataset.cp)));
}
// Alta o cambio: el modal genérico más la carga de fotos del carnet y la libreta
function cocPersonaForm(p, base) {
  const v = Object.assign({}, base || p || {}), F = COCP.L.funciones || [];
  ['CARNET_EMISION', 'CARNET_VENCE', 'LIBRETA_EMISION', 'LIBRETA_VENCE', 'CAPACITACION_BPM', 'MATRICULA_VENCE', 'MATRICULA_NUMERO'].forEach(k => v[k] = v[k] || '');
  const arch = {};
  const subir = k => '<label class="f ancho">' + ({ carnet: 'Foto del carnet', libreta: 'Foto de la libreta', matricula: 'Matrícula provincial (solo nutricionistas): foto o PDF' }[k]) + ' (opcional)<input class="c" type="file" accept="image/*,application/pdf" data-arch="' + k + '"><span class="mu peq" id="ar_' + k + '">' + (p && p[{ carnet: 'CARNET_FOTO', libreta: 'LIBRETA_FOTO', matricula: 'MATRICULA_FOTO' }[k]] ? 'Ya hay una cargada; si elegís otra, se reemplaza.' : '') + '</span></label>';
  const m = modal(p ? 'Persona de cocina · ' + p.APELLIDO_Y_NOMBRE : 'Agregar persona de cocina', [
    ['APELLIDO_Y_NOMBRE', 'Apellido y nombre'], ['DNI', 'DNI (sin puntos)'], ['ORIGEN', 'Personal', ['Planta', 'Empresa']], ['EMPRESA', 'Empresa (si es de empresa)'], ['FUNCION_COCINA', 'Función en la cocina', F],
    ['MATRICULA_NUMERO', 'Nutricionistas: matrícula provincial (Chubut)'], ['MATRICULA_VENCE', 'Matrícula: vencimiento (si figura)', 'date'],
    ['CARNET_TIENE', '¿Tiene carnet de manipulador? (opcional para nutricionistas)', ['Sí', 'No', 's/d']], ['CARNET_EMISOR', 'Carnet: quién lo emitió (municipio)'], ['CARNET_EMISION', 'Carnet: fecha de emisión', 'date'], ['CARNET_VENCE', 'Carnet: vencimiento (si figura)', 'date'],
    ['LIBRETA_TIENE', '¿Tiene libreta sanitaria? (opcional para nutricionistas)', ['Sí', 'No', 's/d']], ['LIBRETA_EMISOR', 'Libreta: quién la emitió'], ['LIBRETA_EMISION', 'Libreta: fecha de emisión', 'date'], ['LIBRETA_VENCE', 'Libreta: vencimiento (si figura)', 'date'],
    ['CAPACITACION_BPM', 'Última capacitación interna en BPM', 'date'], ['ACTIVO', 'Activo', ['Sí', 'No']], ['OBSERVACIONES', 'Observaciones', null, 1]], v,
    async out => {
      const datos = Object.assign({ ID: p ? p.ID : '', ESTABLECIMIENTO: v.ESTABLECIMIENTO || COCP.cod }, out);
      if (arch.carnet) datos.carnetArchivo = arch.carnet; if (arch.libreta) datos.libretaArchivo = arch.libreta; if (arch.matricula) datos.matriculaArchivo = arch.matricula;
      const r = await api('p_coc_persona_guardar', datos, 120000);
      if (!r.ok) return r.mensaje || 'No se pudo guardar.';
      toast(p ? 'Cambios guardados.' : 'Persona agregada.'); COCP.cargado = ''; COCT = null; cocPersonas(COCP.cod); return '';
    }, subir('matricula') + subir('carnet') + subir('libreta') + '<p class="mu peq" style="margin:0">Si no figura el vencimiento, se calcula: carnet 3 años y libreta 1 año desde la emisión. Nutricionistas: cuenta la matrícula provincial; el carnet y la libreta son opcionales.</p>');
  document.querySelectorAll('#ov [data-arch]').forEach(inp => inp.onchange = async () => { const f = inp.files[0], k = inp.dataset.arch, msg = $('ar_' + k); if (!f) return;
    try {
      if (f.type === 'application/pdf') { if (f.size > 6 * 1024 * 1024) { msg.textContent = 'El PDF pesa más de 6 MB.'; return; } arch[k] = await new Promise((ok, mal) => { const rd = new FileReader(); rd.onload = () => ok(rd.result); rd.onerror = mal; rd.readAsDataURL(f); }); }
      else arch[k] = await achicar(f);
      msg.textContent = 'Lista para guardar: ' + f.name;
    } catch (e) { msg.textContent = 'No se pudo leer el archivo.'; } });
  // DNI: si está en la base de trabajadores, completa el nombre
  const dni = document.querySelector('#ov [data-k="DNI"]'), nomI = document.querySelector('#ov [data-k="APELLIDO_Y_NOMBRE"]');
  if (dni && nomI) dni.onchange = async () => { if (nomI.value || String(dni.value).replace(/\D/g, '').length < 7) return;
    try { const r = await api('p_coc_dni', { dni: dni.value }); if (r.ok && r.persona) { nomI.value = r.persona.nombre; toast('Encontrado en la base de trabajadores: ' + r.persona.nombre + (r.persona.est ? ' (' + r.persona.est + ')' : '') + '.'); } } catch (e) {} };
  return m;
}
// Tarjeta del plan de acción (12/10/2026): las mejoras del informe (punto 6) pasan solas al plan
function cocPlanCard() { const I = (DG.D.informes || [])[0]; return '<section class="card" style="display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between"><div><h2>Plan de acción</h2><span class="mu peq">' +
  (I ? 'Las mejoras del informe ' + esc(I.codigo) + ' están en el plan de acción: ahí se carga el envío a la Dirección, la respuesta, el avance y la evidencia.' : 'Al generar el informe, sus mejoras (punto 6) pasan solas al plan de acción.') + '</span></div>' +
  (I ? '<a class="btn sec" href="#plan/' + encodeURIComponent(I.codigo) + '">Ver el plan de acción</a>' : '') + '</section>'; }
