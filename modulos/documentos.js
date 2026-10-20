// Portal HyS · 10 · Documentos (registro de informes, documentos de establecimientos, modelos y bandeja)
// Se carga desde portal.html (<script src>). Para el portal de respaldo de Google, herramientas/armar_respaldo.py lo junta en un solo archivo.
// ------------------------------------------------------------------ Registro de informes (numeración HYSL automática; el pedido manual se quitó el 12/10/2026)
let DOCS = { est: '', anio: new Date().getFullYear() };
async function documentos(est) {
  if (est != null) DOCS.est = est;
  if (!RES) { const g = LS.get('res', null); if (g) RES = g; else { try { RES = await api('p_resumen', {}, 240000); LS.set('res', RES); } catch (e) { return; } } }
  cargando('#docs', 'Leyendo el registro…');
  let R; try { R = await api('p_registro', { est: DOCS.est, anio: DOCS.anio }); } catch (e) { return; }
  const ests = estActivos();
  const opEst = (sel, todos) => (todos ? '<option value="">Todos</option>' : '') + '<option value="RED"' + (sel === 'RED' ? ' selected' : '') + '>RED · Toda la red</option>' + optsEst(ests, sel);
  const chipE = e => '<span class="chip ' + ({ Reservado: 'wa', Emitido: 'ok', Anulado: 'gr' }[e] || 'gr') + '">' + esc(e) + '</span>';
  const filas = (R.filas || []);
  marco('#docs', '<div class="cab"><div><span class="mu peq">10 · Documentos</span><h1>Registro de informes</h1><span class="mu">Los informes que genera el sistema toman solos su número HYSL (correlativo por establecimiento y por año). Un número no se borra: se anula con motivo. Las notas las numera el hospital (Mesa de Entradas).</span></div></div>' +
    '<section class="card tabla"><div style="padding:14px 18px;border-bottom:1px solid var(--ln);display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end;justify-content:space-between"><h2>Registro</h2><div class="filtros"><label class="f">Establecimiento<select class="c" id="fEst">' + opEst(DOCS.est, true) + '</select></label><label class="f">Año<select class="c" id="fAn">' + [0, 1, 2].map(i => { const y = new Date().getFullYear() - i; return '<option' + (y === DOCS.anio ? ' selected' : '') + '>' + y + '</option>'; }).join('') + '</select></label></div></div>' +
    (filas.length ? '<table><thead><tr><th>Código</th><th>Fecha</th><th>Asunto</th><th>Origen</th><th>Estado</th><th>Archivo</th><th></th></tr></thead><tbody>' + filas.map(f => { const v = f.v;
      return '<tr><td><b>' + esc(v[0]) + '</b></td><td>' + fechaTxt(v[8]) + '</td><td>' + esc(v[9]) + (v[15] ? '<div class="mu peq">' + esc(v[15]) + '</div>' : '') + '</td><td class="peq">' + esc(v[10]) + '</td><td>' + chipE(v[14]) + '</td><td class="peq">' +
        (v[12] ? '<a href="' + esc(v[12]) + '" target="_blank" rel="noopener">Documento</a>' : '') + (v[13] ? ' · <a href="' + esc(v[13]) + '" target="_blank" rel="noopener">PDF</a>' : '') + (!v[12] && !v[13] ? '<span class="mu">—</span>' : '') + '</td>' +
        '<td style="white-space:nowrap">' + (v[14] !== 'Anulado' ? '<button class="link" data-adj="' + esc(v[0]) + '">Adjuntar enlace</button> · <button class="link" data-anu="' + esc(v[0]) + '">Anular</button>' : '') + '</td></tr>'; }).join('') + '</tbody></table>'
      : '<div class="vacio">No hay documentos registrados con estos filtros.</div>') + '</section>');
  $('fEst').onchange = e => { DOCS.est = e.target.value; documentos(); };
  $('fAn').onchange = e => { DOCS.anio = Number(e.target.value); documentos(); };
  document.querySelectorAll('[data-adj]').forEach(b => b.onclick = async () => {
    const u = prompt('Pegá el enlace del documento (Drive):'); if (!u) return;
    try { const r = await api('p_doc_actualizar', { codigo: b.dataset.adj, documento: u, estado: 'Emitido' }); if (!r.ok) return toast(r.mensaje); toast('Enlace guardado.'); documentos(); } catch (e) {}
  });
  document.querySelectorAll('[data-anu]').forEach(b => b.onclick = async () => {
    const m = prompt('Motivo de la anulación de ' + b.dataset.anu + ':'); if (!m) return;
    try { const r = await api('p_doc_actualizar', { codigo: b.dataset.anu, estado: 'Anulado', motivo: m }); if (!r.ok) return toast(r.mensaje); toast('Número anulado.'); documentos(); } catch (e) {}
  });
}


// ------------------------------------------------------------------ 10 · Documentos de los establecimientos (toda la red; misma hoja y carpeta que «Mi establecimiento»)
let DE = { L: null, est: '', tema: '', estado: 'vivos', q: '' };
const DE_ESTADO = { vigente: ['ok', 'Vigente'], sinvenc: ['gr', 'Sin vencimiento'], porvencer: ['wa', 'Por vencer'], vencido: ['er', 'Vencido'], reemplazado: ['gr', 'Reemplazado'], anulado: ['gr', 'Anulado'] };
const deVivo = d => /^(vigente|sinvenc|porvencer|vencido)$/.test(d.estado);
async function docEst(cod, fresco) {
  if (cod) { DE.est = cod; DE.tema = ''; }
  if (!DE.L || fresco) { cargando('#docest', 'Leyendo los documentos de los establecimientos…'); try { DE.L = await api('p_docest_lista', {}, 120000); } catch (e) { return; } }
  const R = DE.L; if (!R.ok) return marco('#docest', '<div class="aviso error">' + esc(R.mensaje || R.error || 'No se pudo leer.') + '</div>');
  const ests = R.establecimientos.slice().sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')), nom = c => (R.establecimientos.find(e => e.cod === c) || {}).nombre || c;
  const vivos = R.documentos.filter(deVivo), venc = vivos.filter(d => d.estado === 'vencido').length, porV = vivos.filter(d => d.estado === 'porvencer').length;
  const chip = e => '<span class="chip ' + (DE_ESTADO[e] || ['gr'])[0] + '">' + esc((DE_ESTADO[e] || ['', e])[1]) + '</span>';
  // Cuadro: documentos vigentes de cada establecimiento por tema (el color avisa si alguno venció o está por vencer)
  const celda = (cod, t) => { const l = vivos.filter(d => d.cod === cod && d.tema === t); if (!l.length) return '<td class="mu" style="text-align:center">—</td>';
    const c = l.some(d => d.estado === 'vencido') ? 'er' : l.some(d => d.estado === 'porvencer') ? 'wa' : 'ok';
    return '<td style="text-align:center"><button class="chip ' + c + '" style="border:0;cursor:pointer" data-cel="' + esc(cod) + '|' + esc(t) + '" title="Ver los documentos">' + l.length + '</button></td>'; };
  const conDocs = ests.filter(e => vivos.some(d => d.cod === e.cod)), sinDocs = ests.length - conDocs.length;
  const cuadro = '<div style="overflow-x:auto"><table class="peq"><thead><tr><th>Establecimiento</th>' + R.temas.map(t => '<th style="text-align:center">' + esc(t) + '</th>').join('') + '<th style="text-align:center">Total</th></tr></thead><tbody>' +
    (DE.todos ? ests : conDocs).map(e => '<tr><td><button class="link" data-cel="' + esc(e.cod) + '|" style="font-weight:700;text-align:left">' + esc(e.cod) + '</button><div class="mu" style="font-size:12px">' + esc(e.nombre) + '</div></td>' + R.temas.map(t => celda(e.cod, t)).join('') +
      '<td style="text-align:center"><b>' + vivos.filter(d => d.cod === e.cod).length + '</b></td></tr>').join('') + '</tbody></table></div>' +
    '<div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center;justify-content:space-between;margin-top:8px"><span class="mu peq">' + (DE.todos ? 'Todos los establecimientos.' : conDocs.length + ' establecimiento(s) con documentos cargados; ' + sinDocs + ' sin ninguno.') +
    ' Verde: al día · amarillo: alguno vence en ' + R.avisoDias + ' días · rojo: alguno vencido.</span><button class="link" id="deTodos">' + (DE.todos ? 'Ver solo los que tienen documentos' : 'Ver también los que no tienen documentos') + '</button></div>';
  // Lista con filtros
  const q = DE.q.toLowerCase();
  const L = R.documentos.filter(d => (!DE.est || d.cod === DE.est) && (!DE.tema || d.tema === DE.tema) &&
    (DE.estado === 'todos' || (DE.estado === 'avisos' ? /vencido|porvencer/.test(d.estado) : deVivo(d))) &&
    (!q || [d.codigo, d.titulo, d.tipo, d.cod, nom(d.cod)].join(' ').toLowerCase().indexOf(q) >= 0))
    .sort((a, b) => nom(a.cod).localeCompare(nom(b.cod), 'es') || a.tema.localeCompare(b.tema, 'es') || String(a.codigo || a.titulo).localeCompare(String(b.codigo || b.titulo), 'es'));
  const opc = (lista, sel, todos) => '<option value="">' + todos + '</option>' + lista.map(o => '<option value="' + esc(o[0]) + '"' + (o[0] === sel ? ' selected' : '') + '>' + esc(o[1]) + '</option>').join('');
  marco('#docest', '<div class="cab"><div><span class="mu peq">10 · Documentos</span><h1>Documentos de los establecimientos</h1><span class="mu">Manuales, guías, POE, protocolos y PTS propios de cada establecimiento. Los cargan los referentes desde «Mi establecimiento» o vos desde acá.</span></div>' +
    '<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn sec" id="deAct">Actualizar</button><button class="btn pri" id="deNuevo">+ Cargar documento</button></div></div>' +
    '<div class="tb5" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr))">' +
      '<div class="kpi2"><span>Documentos vigentes</span><b>' + vivos.length + '</b><small>en ' + conDocs.length + ' establecimiento(s)</small></div>' +
      '<div class="kpi2"><span>Vencidos</span><b' + (venc ? ' style="color:#B4361F"' : '') + '>' + venc + '</b><small>hay que cargar la versión nueva</small></div>' +
      '<div class="kpi2"><span>Por vencer</span><b' + (porV ? ' style="color:#8A5200"' : '') + '>' + porV + '</b><small>en los próximos ' + R.avisoDias + ' días</small></div>' +
      '<div class="kpi2"><span>Sin documentos</span><b>' + sinDocs + '</b><small>establecimientos sin ninguno cargado</small></div></div>' +
    '<section class="card"><h2>Por establecimiento y tema</h2>' + cuadro + '</section>' +
    '<section class="card tabla" id="deLista"><div style="padding:14px 18px;border-bottom:1px solid var(--ln);display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end;justify-content:space-between"><h2>Documentos</h2><div class="filtros">' +
      '<label class="f">Establecimiento<select class="c" id="deE">' + opc(ests.map(e => [e.cod, e.nombre]), DE.est, 'Todos') + '</select></label>' +
      '<label class="f">Tema<select class="c" id="deT">' + opc(R.temas.map(t => [t, t]), DE.tema, 'Todos') + '</select></label>' +
      '<label class="f">Estado<select class="c" id="deS">' + [['vivos', 'Vigentes'], ['avisos', 'Vencidos y por vencer'], ['todos', 'Todos (con reemplazados y anulados)']].map(o => '<option value="' + o[0] + '"' + (o[0] === DE.estado ? ' selected' : '') + '>' + o[1] + '</option>').join('') + '</select></label>' +
      '<label class="f">Buscar<input class="c" id="deQ" value="' + esc(DE.q) + '" placeholder="Código o nombre"></label></div></div>' +
    (L.length ? '<div style="overflow-x:auto"><table><thead><tr><th>Establecimiento</th><th>Tema</th><th>Tipo</th><th>Código</th><th>Nombre completo</th><th>Versión</th><th>Vigencia</th><th>Vence</th><th>Estado</th><th></th></tr></thead><tbody>' +
      L.map(d => '<tr><td><b>' + esc(d.cod) + '</b><div class="mu" style="font-size:12px">' + esc(nom(d.cod)) + '</div></td><td>' + esc(d.tema) + '</td><td>' + esc(d.tipo) + '</td><td>' + esc(d.codigo || 's/d') + '</td><td>' + esc(d.titulo) +
        (d.obs ? '<div class="mu peq">' + esc(d.obs) + '</div>' : '') + '<div class="mu" style="font-size:12px">Cargó ' + esc(d.cargo || 's/d') + ' · ' + fechaTxt(d.cargado) + '</div></td><td>' + esc(d.version || 's/d') + '</td><td>' + (d.vigencia ? fechaTxt(d.vigencia) : 's/d') + '</td><td>' + (d.vence ? fechaTxt(d.vence) : '—') + '</td><td>' + chip(d.estado) + '</td>' +
        '<td style="white-space:nowrap">' + (d.url ? '<a href="' + esc(d.url) + '" target="_blank" rel="noopener">Abrir</a>' : '') + (deVivo(d) ? ' · <button class="link" data-ed="' + esc(d.id) + '">Editar</button> · <button class="link" data-an="' + esc(d.id) + '">Anular</button>' : '') + '</td></tr>').join('') + '</tbody></table></div>'
      : '<div class="vacio">No hay documentos con estos filtros.' + (DE.est ? ' Podés cargar uno con «+ Cargar documento».' : '') + '</div>') + '</section>' +
    '<section class="card peq mu">Cada carga queda en la BASE COMÚN › DOCUMENTOS_EST (una fila por documento) y el archivo en Drive › SISTEMA HyS › MÓDULO 2 · DOCUMENTOS › Establecimientos › carpeta del establecimiento › Documentos propios. Si cargás un documento con el mismo código o el mismo nombre que uno vigente, el anterior queda «Reemplazado». Nada se borra: anular pide motivo.</section>');
  $('deAct').onclick = () => docEst('', true);
  $('deNuevo').onclick = () => docEstForm(null);
  $('deTodos').onclick = () => { DE.todos = !DE.todos; docEst(); };
  $('deE').onchange = e => { DE.est = e.target.value; docEst(); };
  $('deT').onchange = e => { DE.tema = e.target.value; docEst(); };
  $('deS').onchange = e => { DE.estado = e.target.value; docEst(); };
  let tq; $('deQ').oninput = e => { clearTimeout(tq); tq = setTimeout(() => { DE.q = e.target.value; docEst(); const i = $('deQ'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }, 350); };
  document.querySelectorAll('[data-cel]').forEach(b => b.onclick = () => { const [c, t] = b.dataset.cel.split('|'); DE.est = c; DE.tema = t || ''; DE.estado = 'vivos'; docEst(); setTimeout(() => { const s = $('deLista'); if (s) s.scrollIntoView({ behavior: 'smooth' }); }, 50); });
  document.querySelectorAll('[data-ed]').forEach(b => b.onclick = () => docEstForm(R.documentos.find(d => d.id === b.dataset.ed)));
  document.querySelectorAll('[data-an]').forEach(b => b.onclick = () => { const d = R.documentos.find(x => x.id === b.dataset.an);
    modal('Anular · ' + (d.codigo || d.titulo), [['MOTIVO', 'Motivo (queda registrado)', null, 1]], {}, async v => {
      if (!v.MOTIVO.trim()) return 'Escribí el motivo.';
      const r = await api('p_docest_anular', { cod: d.cod, id: d.id, motivo: v.MOTIVO }); if (!r.ok) return r.mensaje || 'No se pudo anular.';
      toast('Documento anulado.'); TB = null; docEst('', true); return ''; }, '<p class="mu peq" style="margin:0">No se borra: queda en la hoja marcado como anulado, con el motivo, y deja de contar.</p>'); });
}
// Alta (con archivo) o corrección de un documento de cualquier establecimiento
function docEstForm(d) {
  const R = DE.L, ests = R.establecimientos.slice().sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')), op = e => e.cod + ' · ' + e.nombre;
  const v = d ? { TEMA: d.tema, TIPO: d.tipo, CODIGO: d.codigo, TITULO: d.titulo, VERSION: d.version, FECHA_VIGENCIA: d.vigencia, FECHA_VENCIMIENTO: d.vence, OBSERVACIONES: d.obs }
    : { EST: DE.est ? op(ests.find(e => e.cod === DE.est) || { cod: DE.est, nombre: '' }) : '', TEMA: DE.tema || 'Residuos', TIPO: 'Manual' };
  let arch = null;
  modal(d ? 'Editar · ' + d.cod + ' · ' + (d.codigo || d.titulo) : 'Cargar documento', (d ? [] : [['EST', 'Establecimiento', ests.map(op)]]).concat([
    ['TEMA', 'Tema', R.temas], ['TIPO', 'Tipo de documento', R.tipos], ['CODIGO', 'Código o número (si tiene)'], ['TITULO', 'Nombre completo'], ['VERSION', 'Versión (si tiene)'],
    ['FECHA_VIGENCIA', 'Vigente desde (si figura)', 'date'], ['FECHA_VENCIMIENTO', 'Vence (si tiene vencimiento)', 'date'], ['OBSERVACIONES', 'Observaciones', null, 1]]), v,
    async out => {
      const cod = d ? d.cod : String(out.EST || '').split(' · ')[0]; if (!cod) return 'Elegí el establecimiento.';
      if (!out.TITULO.trim()) return 'Falta el nombre completo.'; if (!d && !arch) return 'Falta el archivo (PDF o foto).';
      const datos = Object.assign({ cod: cod }, out); delete datos.EST; if (d) datos.ID_EDITAR = d.id; if (arch) datos.archivo = arch;
      const r = await api('p_docest_guardar', datos, 180000); if (!r.ok) return r.mensaje || 'No se pudo guardar.';
      toast(d ? 'Cambios guardados.' : 'Documento cargado.'); TB = null; DE.est = cod; docEst('', true); return '';
    }, '<label class="f">' + (d ? 'Reemplazar el archivo (opcional)' : 'Archivo (PDF o foto, hasta 6 MB)') + '<input class="c" type="file" id="deArch" accept="application/pdf,image/*"></label><div class="mu peq" id="deArchN"></div>' +
      '<p class="mu peq" style="margin:0">Con vencimiento cargado, el tablero avisa ' + R.avisoDias + ' días antes y cuando vence. Sin vencimiento, no avisa.</p>');
  $('deArch').onchange = async () => { const f = $('deArch').files[0], m = $('deArchN'); arch = null; if (!f) { m.textContent = ''; return; }
    try { if (/pdf/.test(f.type)) { if (f.size > 6 * 1024 * 1024) { m.textContent = 'El PDF pesa más de 6 MB.'; return; } arch = { base64: await new Promise((ok, mal) => { const rd = new FileReader(); rd.onload = () => ok(rd.result); rd.onerror = mal; rd.readAsDataURL(f); }), tipo: 'application/pdf', nombre: f.name.replace(/\.pdf$/i, '') }; }
      else arch = { base64: await achicar(f), tipo: 'image/jpeg', nombre: f.name.replace(/\.\w+$/, '') };
      m.textContent = 'Listo para guardar: ' + f.name; } catch (e) { m.textContent = 'No se pudo leer el archivo.'; } };
}

// ------------------------------------------------------------------ Modelos para completar y bandeja de entrada
const BJ_TIPOS_UI = {
  RESPUESTA_INFORME: { t: 'Respuesta de la Dirección a un informe', d: 'Las recomendaciones del informe, para que la Dirección complete responsable y fecha prevista. Al volver, actualiza el plan de acción.', para: 'Dirección' },
  CONTACTOS: { t: 'Contactos y referentes', d: 'Dirección, servicios y un referente de residuos por cada lugar, con teléfonos y correos. Al volver, actualiza la agenda (CONTACTOS).', para: 'Dirección o referente' },
  RED_HYS: { t: 'Profesionales y técnicos de HyS', d: 'Quiénes trabajan en Higiene y Seguridad en el establecimiento: matrícula, horas y contacto. Al volver, actualiza la red de HyS.', para: 'Profesionales y técnicos' },
  NOMINA_PERSONAL: { t: 'Nómina de personal', d: 'Todo el personal del establecimiento con CUIL, fecha de ingreso, lugar, servicio, puesto y tareas. Al volver, actualiza la base de trabajadores (datos para la NTE).', para: 'Servicio de Personal' },
  DATOS_ESTABLECIMIENTO: { t: 'Datos del establecimiento', d: 'Director, dirección, teléfonos, empresa de residuos y servicio de HyS. Al volver, actualiza la BASE COMÚN.', para: 'Dirección' }
};
const BJ_CAMPOS = { FECHA_INGRESO: 'Fecha de ingreso', SITIO: 'Lugar', FUNCION: 'Función o puesto',  RESPONSABLE_DIRECCION: 'Responsable', FECHA_PREVISTA: 'Fecha prevista', OBSERVACIONES: 'Observaciones', RESPONSABLE: 'Nombre', TELEFONO_FIJO: 'Teléfono fijo', CORREO_INSTITUCIONAL: 'Correo institucional', CORREO_PERSONAL: 'Correo personal', APELLIDO_Y_NOMBRE: 'Apellido y nombre', TITULO_O_MATRICULA: 'Título y matrícula', HORAS_SEMANALES: 'Horas semanales', EMPRESA_RESIDUOS: 'Empresa de residuos', SERVICIO_HYS: 'Servicio de HyS' };
const bjCampo = c => BJ_CAMPOS[c] || (c.charAt(0) + c.slice(1).toLowerCase()).replace(/_/g, ' ');
let MOD = { tipo: 'RESPUESTA_INFORME', cod: '' };
async function modelos() {
  if (!RES) { try { RES = await api('p_resumen', {}, 240000); } catch (e) { return; } }
  let planes = []; try { planes = (await api('p_plan_listar', {})).informes || []; } catch (e) {}
  const ests = estActivos(MOD.cod);
  const T = BJ_TIPOS_UI[MOD.tipo], infs = planes.filter(p => !MOD.cod || p.cod === MOD.cod);
  marco('#modelos', '<div class="cab"><div><span class="mu peq">10 · Documentos</span><h1>Modelos para completar</h1><span class="mu">Generá la planilla prellenada, mandala y, cuando vuelva completa, subila en <a class="link" href="#bandeja">Bandeja de entrada</a>. Siempre es una hoja de cálculo.</span></div></div>' +
    '<section class="card"><h2>1. ¿Qué modelo?</h2><div class="grid g2" style="margin-top:10px">' + Object.keys(BJ_TIPOS_UI).map(k => '<button class="card" data-mt="' + k + '" style="text-align:left;cursor:pointer;border:2px solid ' + (k === MOD.tipo ? 'var(--az)' : 'var(--ln)') + '"><b>' + esc(BJ_TIPOS_UI[k].t) + '</b><div class="mu peq" style="margin-top:4px">' + esc(BJ_TIPOS_UI[k].d) + '</div><div class="peq" style="margin-top:6px">Para: ' + esc(BJ_TIPOS_UI[k].para) + '</div></button>').join('') +
      '<div class="card" style="opacity:.6"><b>RAR y NTE · RGRL</b><div class="mu peq" style="margin-top:4px">Formatos de la SRT, en hoja de cálculo. Próximamente, con el eje Riesgos.</div></div></div></section>' +
    '<section class="card"><h2>2. ¿Para qué establecimiento?</h2><div class="grid g3" style="margin-top:10px"><label class="f">Establecimiento<select class="c" id="mEst"><option value="">Elegí…</option>' + optsEst(ests, MOD.cod) + '</select></label>' +
      (MOD.tipo === 'RESPUESTA_INFORME' ? '<label class="f">Informe<select class="c" id="mRef">' + (infs.length ? infs.map(p => '<option value="' + esc(p.codigo) + '">' + esc(p.codigo) + '</option>').join('') : '<option value="">No hay informes emitidos' + (MOD.cod ? ' de este establecimiento' : '') + '</option>') + '</select></label>' : '') +
      '</div><div style="margin-top:14px"><button class="btn pri" id="mGen">Generar el modelo</button></div><div id="mRes" style="margin-top:14px"></div></section>');
  document.querySelectorAll('[data-mt]').forEach(b => b.onclick = () => { MOD.tipo = b.dataset.mt; modelos(); });
  $('mEst').onchange = e => { MOD.cod = e.target.value; if (MOD.tipo === 'RESPUESTA_INFORME') modelos(); };
  $('mGen').onclick = async () => {
    const cod = $('mEst').value, ref = $('mRef') ? $('mRef').value : ''; if (!cod) return toast('Elegí el establecimiento.'); if (MOD.tipo === 'RESPUESTA_INFORME' && !ref) return toast('Ese establecimiento todavía no tiene informes emitidos.');
    const b = $('mGen'); b.disabled = true; b.textContent = 'Generando…';
    let r; try { r = await api('p_bj_generar', { tipo: MOD.tipo, cod: cod, ref: ref }, 120000); } catch (e) { b.disabled = false; b.textContent = 'Generar el modelo'; return; }
    b.disabled = false; b.textContent = 'Generar el modelo'; if (!r.ok) return toast(r.mensaje);
    const msj = 'Hola. Te envío la planilla «' + BJ_TIPOS_UI[MOD.tipo].t + '» para completar. Las celdas grises no se modifican. Cuando la termines, devolvémela por este medio. Cualquier duda, quedo a disposición.';
    $('mRes').innerHTML = '<div class="aviso"><b>' + esc(r.nombre) + '</b><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px"><a class="btn" href="' + esc(r.url) + '" target="_blank" rel="noopener">Abrir en Google Sheets</a><a class="btn" href="' + esc(r.xlsx) + '" target="_blank" rel="noopener">Descargar Excel (.xlsx)</a><button class="btn" id="mMsj">Copiar mensaje para enviar</button></div><div class="mu peq" style="margin-top:8px">Quedó guardado en Drive › SISTEMA HyS › 06 MODELOS PARA COMPLETAR.</div></div>';
    $('mMsj').onclick = async () => { try { await navigator.clipboard.writeText(msj); toast('Mensaje copiado.'); } catch (e) { prompt('Copiá el mensaje:', msj); } };
  };
}
let XLSX_OK = null;
function cargarXlsx() { return XLSX_OK || (XLSX_OK = new Promise((ok, mal) => { if (window.XLSX) return ok(); const sc = document.createElement('script'); sc.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'; sc.onload = ok; sc.onerror = () => { XLSX_OK = null; mal(new Error('No se pudo cargar el lector de planillas.')); }; document.head.appendChild(sc); })); }
async function bandeja(propuesta) {
  cargando('#bandeja', 'Leyendo la bandeja…');
  let R; try { R = await api('p_bj_listar', {}); } catch (e) { return; }
  const L = R.filas || [], rev = L.filter(o => /Para revisar/.test(o.ESTADO)), resto = L.filter(o => !/Para revisar/.test(o.ESTADO)).slice(0, 30);
  const tarjeta = o => '<section class="card" data-bj="' + esc(o.ID) + '"><div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap"><div><b>' + esc(o.TITULO) + '</b> · ' + esc(o.ESTABLECIMIENTO) + (o.REFERENCIA ? ' · ' + esc(o.REFERENCIA) : '') + '<div class="mu peq">' + esc(fechaTxt(o.FECHA)) + ' · desde ' + esc(o.ORIGEN) + (o.ARCHIVO && /^http/.test(o.ARCHIVO) ? ' · <a href="' + esc(o.ARCHIVO) + '" target="_blank" rel="noopener">ver archivo recibido</a>' : '') + '</div></div><span class="chip wa">Para revisar</span></div>' +
    (o.ERRORES ? '<div class="aviso peq" style="margin-top:10px;border-color:#E9B8B3;background:#FBECEA">Revisar: ' + esc(o.ERRORES) + '</div>' : '') +
    (o.CAMBIOS.length > 150 ? (() => { const g = {}; o.CAMBIOS.forEach(c => g[c.campo] = (g[c.campo] || 0) + 1);
      return '<div class="aviso peq" style="margin-top:10px">Son <b>' + o.CAMBIOS.length + '</b> cambios. Resumen: ' + Object.keys(g).map(k => esc(bjCampo(k)) + ' (' + g[k] + ')').join(' · ') + '. Abajo, los primeros 40 como muestra. «Aplicar lo marcado» aplica <b>todos</b>.</div>' +
        '<table style="margin-top:10px"><thead><tr><th>Qué</th><th>Dato</th><th>Ahora</th><th>Queda</th></tr></thead><tbody>' + o.CAMBIOS.slice(0, 40).map(c => '<tr><td>' + esc(c.clave) + '</td><td>' + esc(bjCampo(c.campo)) + '</td><td class="mu">' + esc(c.antes || '—') + '</td><td><b>' + esc(c.despues) + '</b></td></tr>').join('') + '</tbody></table><input type="hidden" data-todo-grande>'; })() :
    '<table style="margin-top:10px"><thead><tr><th style="width:30px"><input type="checkbox" checked data-todos></th><th>Qué</th><th>Dato</th><th>Ahora</th><th>Queda</th></tr></thead><tbody>' +
    o.CAMBIOS.map((c, j) => '<tr><td><input type="checkbox" checked data-j="' + j + '"></td><td>' + esc(c.clave) + '</td><td>' + esc(bjCampo(c.campo)) + '</td><td class="mu">' + esc(c.antes || '—') + '</td><td><b>' + esc(c.despues) + '</b></td></tr>').join('') + '</tbody></table>') +
    '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:10px"><button class="btn sec" data-rech>Rechazar</button><button class="btn pri" data-apl>Aplicar lo marcado</button></div></section>';
  marco('#bandeja', '<div class="cab"><div><span class="mu peq">10 · Documentos</span><h1>Bandeja de entrada</h1><span class="mu">Subí la planilla completa. El sistema muestra qué cambiaría y vos elegís qué aplicar: nada se cambia sin tu aprobación.</span></div><a class="btn" href="#modelos">Generar un modelo</a></div>' +
    '<section class="card" style="display:flex;gap:14px;align-items:center;flex-wrap:wrap"><label class="btn pri" style="cursor:pointer">Subir planilla completa (.xlsx)<input type="file" id="bjFile" accept=".xlsx,.xls,.ods" hidden></label><button class="btn sec" id="bjDrive">Revisar la carpeta de Drive</button><span class="mu peq">También podés dejar los archivos en Drive › SISTEMA HyS › 07 BANDEJA DE ENTRADA.</span></section>' +
    (rev.length ? '<h2 style="margin:6px 0 0">Para revisar (' + rev.length + ')</h2>' + rev.map(tarjeta).join('') : '<section class="card"><div class="vacio">No hay nada para revisar.</div></section>') +
    (resto.length ? '<section class="card tabla"><h2 style="padding:14px 18px 0">Recibidos anteriormente</h2><table><thead><tr><th>Fecha</th><th>Modelo</th><th>Establecimiento</th><th>Estado</th><th>Resultado</th></tr></thead><tbody>' + resto.map(o => '<tr><td>' + esc(fechaTxt(o.FECHA)) + '</td><td>' + esc(o.TITULO) + (o.REFERENCIA ? '<div class="mu peq">' + esc(o.REFERENCIA) + '</div>' : '') + '</td><td>' + esc(o.ESTABLECIMIENTO) + '</td><td><span class="chip ' + (/Aplicado/.test(o.ESTADO) ? 'ok' : 'gr') + '">' + esc(o.ESTADO) + '</span></td><td class="peq">' + esc(o.APLICADO || o.RESUMEN) + '</td></tr>').join('') + '</tbody></table></section>' : ''));
  $('bjFile').onchange = async e => {
    const file = e.target.files[0]; if (!file) return; toast('Leyendo la planilla…');
    try {
      await cargarXlsx(); const buf = await file.arrayBuffer(), wb = XLSX.read(buf, { type: 'array', cellDates: true });
      const ws = wb.Sheets['_SISTEMA'], wc = wb.Sheets['COMPLETAR']; if (!ws || !wc) return toast('Esta planilla no es un modelo del sistema. Generá uno en «Modelos para completar».');
      const meta = {}; XLSX.utils.sheet_to_json(ws, { header: 1, raw: false }).forEach(r => { if (r[0]) meta[r[0]] = r[1] || ''; });
      const filas = XLSX.utils.sheet_to_json(wc, { header: 1, range: 4, raw: false, dateNF: 'dd/mm/yyyy', defval: '' }).filter(r => r.some(c => String(c).trim()));
      const dataUrl = await new Promise((ok, mal) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = mal; r.readAsDataURL(file); });
      const r = await api('p_bj_subir', { meta: meta, filas: filas, nombre: file.name, dataUrl: dataUrl }, 120000);
      if (!r.ok) return toast(r.mensaje); toast(r.resumen); bandeja();
    } catch (err) { toast('No se pudo leer el archivo: ' + (err.message || err)); }
  };
  $('bjDrive').onclick = async () => { const b = $('bjDrive'); b.disabled = true; b.textContent = 'Revisando…';
    try { const r = await api('p_bj_carpeta', {}, 300000); toast(r.procesados.length ? r.procesados.length + ' archivo(s) leído(s).' : 'La carpeta está vacía.'); bandeja(); } catch (e) { b.disabled = false; b.textContent = 'Revisar la carpeta de Drive'; } };
  document.querySelectorAll('[data-bj]').forEach(sec => {
    const id = sec.dataset.bj;
    const todos = sec.querySelector('[data-todos]'); if (todos) todos.onchange = e => sec.querySelectorAll('[data-j]').forEach(c => c.checked = e.target.checked);
    sec.querySelector('[data-rech]').onclick = async () => { if (!confirm('¿Rechazar esta propuesta? No se aplica ningún cambio.')) return; try { await api('p_bj_aplicar', { id: id, rechazar: true }); toast('Propuesta rechazada.'); bandeja(); } catch (e) {} };
    sec.querySelector('[data-apl]').onclick = async () => { const grande = !!sec.querySelector('[data-todo-grande]'), idx = grande ? undefined : [...sec.querySelectorAll('[data-j]')].filter(c => c.checked).map(c => Number(c.dataset.j)); if (!grande && !idx.length) return toast('Marcá al menos un cambio.');
      try { const r = await api('p_bj_aplicar', { id: id, indices: idx }, 120000); if (!r.ok) return toast(r.mensaje); toast(r.aplicados + ' cambio(s) aplicado(s).'); bandeja(); } catch (e) {} };
  });
}


// ------------------------------------------------------------------ 10 · Documentos › Notas enviadas y recibidas (solo lectura; 12/10/2026)
// Lee el libro DOCUMENTOS · Sistema HyS (hojas REGISTRO y RECIBIDAS) con la acción p_notas (Notas_portal.gs).
// Cargar, registrar envío y respuesta o anular se sigue haciendo en la aplicación de notas o en la planilla.
let NT = { R: null, tab: 'env', sitio: '', alerta: '', anio: 0, q: '' };
const NT_ALERTA = { sin_enviar: ['gr', 'Sin enviar'], esperando: ['wa', 'Esperando respuesta'], por_vencer: ['wa', 'Vence en 7 días o menos'], vencida: ['er', 'Respuesta vencida'],
  respondida: ['ok', 'Respondida'], pendiente: ['wa', 'Pendiente de respuesta'], '': ['gr', '—'] };
async function notas(tab, fresco) {
  if (tab === 'env' || tab === 'rec') NT.tab = tab;
  if (!NT.R || fresco) {
    cargando('#notas', 'Leyendo las notas…');
    try { NT.R = await api('p_notas', { anio: NT.anio }, 120000); } catch (e) { return; }
    if (!NT.R.ok) return marco('#notas', '<div class="cab"><div><span class="mu peq">10 · Documentos</span><h1>Notas</h1></div></div><section class="card"><p>' + esc(NT.R.mensaje || NT.R.error || 'No se pudieron leer las notas.') + '</p></section>');
  }
  const R = NT.R, S = R.resumen || {}, env = NT.tab === 'env', H = R.hojas || {};
  const kpi = (t, v, s, col) => '<div class="kpi2"><span>' + t + '</span><b' + (col ? ' style="color:' + col + '"' : '') + '>' + v + '</b><small>' + s + '</small></div>';
  const chip = a => { const c = NT_ALERTA[a] || NT_ALERTA['']; return '<span class="chip ' + c[0] + '">' + esc(c[1]) + '</span>'; };
  const q = NT.q.toLowerCase();
  const L = (env ? R.enviadas : R.recibidas).filter(n => (!NT.sitio || n.sitio === NT.sitio) && (!NT.alerta || n.alerta === NT.alerta) &&
    (!q || [n.codigo, n.asunto, n.destinatario, n.remitente, n.problematica, n.ref].join(' ').toLowerCase().indexOf(q) >= 0));
  const alertasTab = env ? ['sin_enviar', 'esperando', 'por_vencer', 'vencida', 'respondida'] : ['pendiente', 'por_vencer', 'vencida', 'respondida'];
  const link = (u, t) => u ? '<a href="' + esc(u) + '" target="_blank" rel="noopener">' + t + '</a>' : '';
  const filaEnv = n => '<tr><td><b>' + esc(n.codigo || '—') + '</b><div class="mu peq">' + esc(n.tipo) + '</div></td><td>' + esc(n.fecha || '—') + '</td><td>' + esc(n.asunto || 's/d') +
    '<div class="mu peq">' + esc([n.destinatario, n.problematica].filter(Boolean).join(' · ')) + '</div>' + (n.respuesta ? '<div class="peq"><b>Respuesta:</b> ' + esc(n.respuesta) + '</div>' : '') + '</td><td class="peq">' + esc(n.sitio || '—') + '</td>' +
    '<td class="peq">' + (n.envio ? esc(n.envio) + (n.medio ? '<div class="mu">' + esc(n.medio) + '</div>' : '') : '<span class="mu">—</span>') + '</td><td class="peq">' + esc(n.vence || '—') + '</td>' +
    '<td>' + chip(n.alerta) + '<div class="mu peq">' + esc(n.estado) + '</div></td><td class="peq">' + ([link(n.archivo, 'Documento'), link(n.adjuntos, 'Adjuntos')].filter(Boolean).join(' · ') || '<span class="mu">—</span>') + '</td></tr>';
  const filaRec = n => '<tr><td><b>' + esc(n.codigo || '—') + '</b>' + (n.ref ? '<div class="mu peq">Ref. ' + esc(n.ref) + '</div>' : '') + '</td><td>' + esc(n.fecha || '—') + '</td><td>' + esc(n.asunto || 's/d') +
    '<div class="mu peq">' + esc([n.remitente, n.firmante, n.problematica].filter(Boolean).join(' · ')) + '</div>' + (n.respondeA ? '<div class="peq">Responde a ' + esc(n.respondeA) + '</div>' : '') + '</td><td class="peq">' + esc(n.sitio || '—') + '</td>' +
    '<td class="peq">' + (n.requiere ? 'Sí' : 'No') + '</td><td class="peq">' + esc(n.vence || '—') + '</td><td>' + chip(n.alerta) + '<div class="mu peq">' + esc(n.estado) + '</div></td><td class="peq">' + (link(n.archivo, 'Escaneo') || '<span class="mu">—</span>') + '</td></tr>';
  const vacio = env ? 'No hay notas enviadas con estos filtros. Las notas se crean en «Nueva nota» y quedan en la hoja REGISTRO.' : 'No hay notas recibidas con estos filtros. Se cargan en «Nota recibida» y quedan en la hoja RECIBIDAS.';
  marco('#notas', '<div class="cab"><div><span class="mu peq">10 · Documentos</span><h1>Notas enviadas y recibidas</h1><span class="mu">Lo que está en el libro DOCUMENTOS · Sistema HyS. Para cargar o cambiar algo, usá los botones de la derecha o la planilla.</span></div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap"><a class="btn pri" href="' + NOTA_URL + '" target="_blank" rel="noopener">Nueva nota ↗</a><a class="btn sec" href="' + SEG_URL + '" target="_blank" rel="noopener">Envío y respuesta ↗</a><a class="btn sec" href="' + REC_URL + '" target="_blank" rel="noopener">Nota recibida ↗</a><button class="btn sec" id="ntAct">Actualizar</button></div></div>' +
    (R.avisos || []).map(a => '<section class="card" style="border-left:4px solid #8A5200">' + esc(a) + '</section>').join('') +
    '<div class="tb5">' + kpi('Enviadas', S.enviadas || 0, (S.sinEnviar || 0) + ' sin enviar') + kpi('Esperando respuesta', S.esperando || 0, 'enviadas, dentro del plazo') + kpi('Enviadas vencidas', S.vencidasEnv || 0, 'sin respuesta y con plazo cumplido', S.vencidasEnv ? '#9B2C22' : '') +
      kpi('Recibidas', S.recibidas || 0, (S.pendientes || 0) + ' pendientes de respuesta') + kpi('Recibidas vencidas', S.vencidasRec || 0, 'requieren respuesta nuestra', S.vencidasRec ? '#9B2C22' : '') + '</div>' +
    '<div class="tabs"><button class="btn ' + (env ? 'pri' : 'sec') + '" data-nt="env">Enviadas (' + (R.enviadas || []).length + ')</button><button class="btn ' + (!env ? 'pri' : 'sec') + '" data-nt="rec">Recibidas (' + (R.recibidas || []).length + ')</button></div>' +
    '<section class="card tabla"><div style="padding:14px 18px;border-bottom:1px solid var(--ln);display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end"><div class="filtros">' +
      '<label class="f">Buscar<input class="c" id="ntQ" type="search" placeholder="Asunto, código, servicio…" value="' + esc(NT.q) + '"></label>' +
      '<label class="f">Sitio<select class="c" id="ntSit"><option value="">Todos</option>' + (R.sitios || []).map(s => '<option' + (s === NT.sitio ? ' selected' : '') + '>' + esc(s) + '</option>').join('') + '</select></label>' +
      '<label class="f">Situación<select class="c" id="ntAl"><option value="">Todas</option>' + alertasTab.map(a => '<option value="' + a + '"' + (a === NT.alerta ? ' selected' : '') + '>' + esc(NT_ALERTA[a][1]) + '</option>').join('') + '</select></label>' +
      '<label class="f">Año<select class="c" id="ntAn"><option value="0">Todos</option>' + (R.anios || []).map(y => '<option' + (y === NT.anio ? ' selected' : '') + '>' + y + '</option>').join('') + '</select></label></div></div>' +
    (L.length ? '<table><thead><tr><th>Código</th><th>' + (env ? 'Fecha' : 'Recibida') + '</th><th>Asunto</th><th>Sitio</th><th>' + (env ? 'Envío' : '¿Requiere respuesta?') + '</th><th>Vence</th><th>Situación</th><th>Archivo</th></tr></thead><tbody>' +
      L.map(env ? filaEnv : filaRec).join('') + '</tbody></table>' : '<div class="vacio">' + vacio + '</div>') + '</section>' +
    '<section class="card peq mu">Planilla: <a href="' + esc(env ? H.registro : H.recibidas) + '" target="_blank" rel="noopener">DOCUMENTOS · Sistema HyS › ' + (env ? 'REGISTRO' : 'RECIBIDAS') + '</a>. «Vence en 7 días o menos» y «vencida» se calculan con la fecha de «Vence».</section>');
  document.querySelectorAll('[data-nt]').forEach(b => b.onclick = () => { NT.alerta = ''; location.hash = '#notas/' + b.dataset.nt; });
  $('ntAct').onclick = () => notas(NT.tab, true);
  $('ntSit').onchange = e => { NT.sitio = e.target.value; notas(); };
  $('ntAl').onchange = e => { NT.alerta = e.target.value; notas(); };
  $('ntAn').onchange = e => { NT.anio = Number(e.target.value) || 0; notas(NT.tab, true); };
  $('ntQ').onchange = e => { NT.q = e.target.value.trim(); notas(); };
}
