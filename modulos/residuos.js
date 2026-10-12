// Portal HyS · Residuos · auditorías
// Se carga desde portal.html (<script src>). Para el portal de respaldo de Google, herramientas/armar_respaldo.py lo junta en un solo archivo.
// ------------------------------------------------------------------ Auditorías de residuos (Auditoria.gs)
let AU = { cod: LS.get('audCod', 'HZT'), A: null, R: null };
const audChip = e => '<span class="chip ' + (/cerrada|^conforme$/i.test(e) ? 'ok' : /mayor/i.test(e) ? 'er' : /para verificar|hallazgos|menor/i.test(e) ? 'wa' : 'gr') + '">' + esc(e) + '</span>';
const AUD_OP = { C: ['Conforme', '#E3F0F4', '#0D4A63'], NC: ['No conforme', '#FBE3D3', '#8A3B0B'], Obs: ['Observación', '#ECE8F3', '#4A3A73'], NA: ['No aplica', '#EEF1F2', '#4F616B'] };
async function audLista() {
  if (!RES) { const g = LS.get('res', null); if (g) RES = g; else { cargando('#aud'); try { RES = await api('p_resumen', {}, 240000); LS.set('res', RES); } catch (e) { return; } } }
  cargando('#aud', 'Leyendo las auditorías…');
  let R; try { R = await api('p_aud_listar', { cod: AU.cod }); } catch (e) { return; }
  if (!R.ok) return toast(R.mensaje || 'No se pudieron leer las auditorías.');
  const K = R.kpis, L = R.auditorias, kpi = (t, v, s, col) => '<div class="kpi2"><span>' + t + '</span><b' + (col ? ' style="color:' + col + '"' : '') + '>' + v + '</b><small class="mu">' + s + '</small></div>';
  marco('#aud', '<div class="cab"><div><span class="mu peq">1 · Residuos</span><h1>Auditorías de gestión de residuos</h1><span class="mu">Verificación periódica con evidencia. Criterios: Ley XI N.º 35 (Código Ambiental del Chubut) y Ley 24.051 por adhesión.</span></div>' +
    '<div class="filtros"><label class="f">Establecimiento<select class="c" id="auEst">' + selectorEst(AU.cod, false) + '</select></label><a class="btn pri" href="#aud/nueva">Nueva auditoría</a></div></div>' +
    '<div class="tb5">' + kpi('Auditorías del año', K.realizadas + ' / ' + K.programadas, 'realizadas / programadas') + kpi('Cumplimiento', K.cumplimiento || '—', 'última de campo o verificación') +
      kpi('No conformidades abiertas', K.ncAbiertas, K.ncMayores + ' mayores', K.ncMayores ? '#9B2C22' : '') + kpi('Para verificar', K.paraVerificar, 'auditorías internas de referentes') + '</div>' +
    '<section class="card tabla">' + (L.length ? '<table><thead><tr><th>Auditoría</th><th>Tipo</th><th>Fecha</th><th>Lugares</th><th>Avance</th><th>Resultado</th><th>Estado</th><th></th></tr></thead><tbody>' +
      L.map(a => '<tr><td class="peq"><b>' + esc(a.ID_AUD) + '</b><div class="mu">' + esc(a.ORIGEN) + (a.AUDITOR ? ' · ' + esc(a.AUDITOR) : '') + '</div></td><td>' + esc(a.TIPO) + '</td><td>' + fechaTxt(a.FECHA) + '</td><td class="peq" style="max-width:260px">' + esc(a.LUGARES) + '</td>' +
        '<td>' + esc(a.RESPONDIDOS || 0) + ' / ' + esc(a.PUNTOS || 0) + '</td><td class="peq">' + (a.CUMPLIMIENTO ? '<b>' + esc(a.CUMPLIMIENTO) + '</b> · ' : '') + esc(a.RESULTADO) + '</td><td>' + audChip(a.ESTADO) + '</td>' +
        '<td style="white-space:nowrap">' + (/planificada|en curso/i.test(a.ESTADO) ? '<a class="link" href="#aud/' + encodeURIComponent(a.ID_AUD) + '">Continuar</a>' : '<a class="link" href="#audr/' + encodeURIComponent(a.ID_AUD) + '">Ver resultado</a>') + '</td></tr>').join('') + '</tbody></table>'
      : '<div class="vacio">Todavía no hay auditorías de este establecimiento. Empezá con «Nueva auditoría».</div>') + '</section>' +
    '<section class="card" id="auInf"><div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap"><div><b>Informes trimestrales</b><div class="mu peq">Un informe por trimestre con todas las auditorías cerradas: Doc editable y PDF, con gráficos, cinco porqués, Ishikawa, FODA y ciclo de Deming cuando corresponden.</div></div><button class="btn" id="auInfVer">Ver trimestres</button></div><div id="auInfL"></div></section>' +
    '<section class="card peq mu">Auditoría cada tres meses en todas las categorías (1 puesto sanitario · 2 ambulatorio · 3 hospital rural · 4 subzonal · 5 zonal o regional); cambia la lista y la modalidad. Por ahora, presencial solo en el Área Programática Trelew; en las demás áreas, «Verificación remota». El acopio de 24 h (F3, G4) va como observación, con la Res. MSN 134/2016 como criterio estandarizado. El catálogo se edita en el LIBRO DIAGNÓSTICO › AUD_ITEMS_PROPUESTA.</section>');
  $('auEst').onchange = e => { AU.cod = e.target.value; LS.set('audCod', AU.cod); audLista(); };
  $('auInfVer').onclick = audInformes;
}
async function audInformes() {
  $('auInfL').innerHTML = '<p class="mu peq">Buscando trimestres…</p>';
  let T; try { T = await api('p_informe_trim_op', { cod: AU.cod }); } catch (e) { return; }
  if (!T.ok || !T.trimestres.length) { $('auInfL').innerHTML = '<p class="mu peq">' + esc((T && T.mensaje) || 'Todavía no hay auditorías cerradas para armar un informe.') + '</p>'; return; }
  $('auInfL').innerHTML = '<table><thead><tr><th>Trimestre</th><th>Auditorías cerradas</th><th>Informe</th><th></th></tr></thead><tbody>' + T.trimestres.map(t => '<tr><td>' + esc(t.texto) + '</td><td>' + t.auditorias + '</td><td class="peq">' +
    (t.codigo ? esc(t.codigo) + (t.doc ? ' · <a class="link" href="' + esc(t.doc) + '" target="_blank" rel="noopener">Doc</a>' : '') + (t.pdf ? ' · <a class="link" href="' + esc(t.pdf) + '" target="_blank" rel="noopener">PDF</a>' : '') : '<span class="mu">sin informe</span>') +
    '</td><td><button class="btn peq auInfGen" data-k="' + esc(t.clave) + '">' + (t.doc ? 'Nueva revisión' : 'Generar informe') + '</button></td></tr>').join('') + '</tbody></table>';
  document.querySelectorAll('.auInfGen').forEach(btn => btn.onclick = async () => {
    btn.disabled = true; btn.textContent = 'Generando… (hasta 2 minutos)';
    try { const r = await api('p_informe_trim', { cod: AU.cod, trim: btn.dataset.k }, 300000);
      if (!r.ok) { toast(r.mensaje || 'No se pudo generar el informe.'); btn.disabled = false; btn.textContent = 'Generar informe'; return; }
      toast('Informe ' + r.codigo + ' generado.' + (r.notasAlPie ? '' : ' Las referencias quedaron al final (sin notas al pie).')); window.open(r.doc, '_blank'); audInformes();
    } catch (e) { btn.disabled = false; btn.textContent = 'Generar informe'; } });
}
async function audNueva() {
  cargando('#aud', 'Preparando el plan…');
  let O; try { O = await api('p_aud_opciones', { cod: AU.cod }); } catch (e) { return; }
  if (!O.ok) return toast(O.mensaje);
  const hoy = new Date().toISOString().slice(0, 10);
  marco('#aud', '<div class="cab"><div><a class="link peq" href="#aud">‹ Auditorías</a><h1>Planificar una auditoría</h1><span class="mu">' + esc(AU.cod) + ' · El plan fija alcance, criterios y fecha antes de ir al terreno.</span></div></div>' +
    (O.categoriaTxt ? '<div class="aviso">Categoría <b>' + esc(O.categoria + ' · ' + O.categoriaTxt) + '</b> · módulos: ' + esc((O.modulos || []).join(', ') || 'ninguno') +
      '. Los puntos se eligen solos según la categoría y los módulos de cada lugar; se corrigen en la BASE COMÚN (CATEGORIA_AUDITORIA y MODULOS).</div>' : '') +
    '<section class="card" style="display:flex;flex-direction:column;gap:14px"><div class="grid g3">' +
      '<label class="f">Tipo<select class="c" id="anTipo">' + O.tipos.map(t => '<option' + (t === 'De campo' ? ' selected' : '') + '>' + esc(t) + '</option>').join('') + '</select></label>' +
      '<label class="f">Fecha<input class="c" type="date" id="anFecha" value="' + hoy + '"></label>' +
      '<label class="f">Auditor/a<input class="c" id="anAud" value="Belén Pellegrini"></label></div>' +
      '<label class="f">Personas auditadas<input class="c" id="anAudit" placeholder="Coordinación de Servicios Generales, jefaturas, referente de residuos…"></label>' +
      '<fieldset class="card" style="margin:0"><legend class="peq" style="font-weight:700">Lugares</legend><div class="grid g3 peq">' + O.lugares.map(l => { const pf = (O.perfiles || []).find(x => x.lugar === l); return '<label style="display:flex;gap:8px;align-items:center;min-height:32px"><input type="checkbox" class="anLug" value="' + esc(l) + '">' + esc(l) + (pf && l !== 'Establecimiento' ? ' <span class="mu">(cat. ' + pf.cat + ')</span>' : '') + '</label>'; }).join('') + '</div>' +
        '<div class="mu peq">Se crea <b>una auditoría por cada lugar</b> que marques, con la lista de su categoría y su propio resultado. «Establecimiento» es para los puntos documentales (inscripción, DDJJ, manifiestos, registros).</div></fieldset>' +
      '<fieldset class="card" style="margin:0"><legend class="peq" style="font-weight:700">Ejes <button type="button" class="link peq" id="anTodos" style="font-weight:400">· marcar todos</button></legend><div class="grid g3 peq">' + O.ejes.map(e => '<label style="display:flex;gap:8px;align-items:center;min-height:32px"><input type="checkbox" class="anEje" value="' + esc(e.eje) + '">' + esc(e.eje) + ' <span class="mu">(' + e.puntos + ')</span></label>').join('') + '</div></fieldset>' +
      '<label style="display:flex;gap:8px;align-items:center" class="peq"><input type="checkbox" id="anCorta"> Usar solo la lista corta (siempre en la auditoría interna del referente)</label>' +
      '<div style="display:flex;justify-content:flex-end;gap:8px"><a class="btn sec" href="#aud">Cancelar</a><button class="btn pri" id="anOk">Guardar plan y empezar</button></div></section>');
  $('anTodos').onclick = () => { const t = document.querySelectorAll('.anEje'), todos = [...t].every(c => c.checked); t.forEach(c => c.checked = !todos); $('anTodos').textContent = todos ? '· marcar todos' : '· desmarcar todos'; };
  $('anTipo').onchange = () => { if ($('anTipo').value === 'Documental') document.querySelectorAll('.anLug').forEach(c => c.checked = c.value === 'Establecimiento'); };
  $('anOk').onclick = async () => {
    const lug = [...document.querySelectorAll('.anLug:checked')].map(c => c.value), ejes = [...document.querySelectorAll('.anEje:checked')].map(c => c.value);
    if (!lug.length) return toast('Elegí al menos un lugar.');
    if (!ejes.length) return toast('Elegí al menos un eje (o «marcar todos»).');
    if (lug.length > 1 && !confirm('Se van a crear ' + lug.length + ' auditorías, una por lugar. ¿Seguimos?')) return;
    $('anOk').disabled = true; $('anOk').textContent = 'Guardando…';
    const ids = [];
    try { for (const l of lug) {   // una auditoría por lugar: cada una con la lista de su categoría y su propio resultado
        const r = await api('p_aud_crear', { cod: AU.cod, tipo: $('anTipo').value, fecha: $('anFecha').value, auditor: $('anAud').value, auditados: $('anAudit').value, lugares: [l], ejes: ejes, soloCorta: $('anCorta').checked });
        if (!r.ok) { toast(l + ': ' + r.mensaje); break; } ids.push(r.id); }
      if (!ids.length) { $('anOk').disabled = false; $('anOk').textContent = 'Guardar plan y empezar'; return; }
      toast(ids.length === 1 ? 'Plan guardado.' : ids.length + ' auditorías creadas: empezamos por la primera.'); location.hash = '#aud/' + encodeURIComponent(ids[0]); } catch (e) { $('anOk').disabled = false; }
  };
}
async function audEjecutar(id) {
  cargando('#aud', 'Abriendo la lista de verificación…');
  let R; try { R = await api('p_aud_abrir', { id: id }); } catch (e) { return; }
  if (!R.ok) return toast(R.mensaje);
  AU.A = R; AU.cambios = {}; AU.eje = AU.eje && R.puntos.some(p => p.eje === AU.eje) ? AU.eje : (R.puntos[0] || {}).eje; audPintar();
}
function audPintar() {
  const R = AU.A, A = R.auditoria, P = R.puntos, ejes = [...new Set(P.map(p => p.eje))], resp = p => (AU.cambios[p.codigo + '|' + p.lugar] || p.r || {});
  const hechos = P.filter(p => resp(p).respuesta).length;
  marco('#aud', '<div class="cab"><div><a class="link peq" href="#aud">‹ Auditorías</a><h1>' + esc(A.TIPO) + ' · ' + esc(A.ESTABLECIMIENTO) + '</h1><span class="mu">' + esc(A.ID_AUD) + ' · ' + fechaTxt(A.FECHA) + ' · ' + hechos + ' de ' + P.length + ' puntos</span></div>' +
    '<div style="min-width:240px"><div style="height:10px;background:var(--gr);border-radius:999px"><div style="width:' + (P.length ? Math.round(hechos * 100 / P.length) : 0) + '%;height:10px;background:var(--az);border-radius:999px"></div></div></div></div>' +
    '<div style="display:flex;flex-wrap:wrap;gap:16px;align-items:flex-start"><nav class="card" style="flex:1 1 240px;padding:8px;display:flex;flex-direction:column;gap:2px" aria-label="Ejes">' +
      ejes.map(e => { const pe = P.filter(p => p.eje === e), h = pe.filter(p => resp(p).respuesta).length; return '<button class="btn ' + (e === AU.eje ? 'pri' : 'sec') + '" data-eje="' + esc(e) + '" style="justify-content:space-between;display:flex;text-align:left;border:0">' + esc(e) + '<span class="peq">' + h + '/' + pe.length + '</span></button>'; }).join('') + '</nav>' +
    '<section style="flex:999 1 560px;min-width:0;display:flex;flex-direction:column;gap:10px">' +
      P.map((p, i) => p.eje !== AU.eje ? '' : (() => { const r = resp(p), sel = r.respuesta || '';
        return '<article class="card" data-i="' + i + '" style="display:flex;flex-direction:column;gap:8px"><div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap"><b>' + esc(p.codigo) + ' · ' + esc(p.texto) + '</b>' + (p.critico ? '<span class="chip er">Crítico</span>' : '') + '</div>' +
          '<div class="mu peq">' + esc(p.lugar) + (p.criterio ? ' · Criterio: ' + esc(p.criterio) : '') + (p.ayuda ? ' · ' + esc(p.ayuda) : '') + (p.evidencia ? ' · Evidencia: ' + esc(p.evidencia) : '') + '</div>' +
          (p.soloObs ? '<div class="peq" style="color:#4A3A73">Se registra como observación: no suma ni resta en el cumplimiento.</div>' : '') +
          '<div style="display:flex;gap:8px;flex-wrap:wrap">' + (p.opciones || R.opciones).map(k => { const o = AUD_OP[k], on = sel === k; return '<button class="btn au-op" data-i="' + i + '" data-r="' + k + '" aria-pressed="' + on + '" style="min-height:44px;border:1px solid ' + (on ? o[2] : 'var(--ln)') + ';background:' + (on ? o[1] : '#fff') + ';color:' + (on ? o[2] : 'var(--tx)') + '">' + o[0] + '</button>'; }).join('') + '</div>' +
          (sel === 'NC' || sel === 'Obs' || r.nota || r.foto || p.soloObs ? '<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-start"><label class="f" style="flex:1 1 300px">Qué se observó<textarea class="c au-nota" data-i="' + i + '"' + (p.soloObs ? ' rows="4"' : '') + '>' + esc(r.nota || (p.soloObs ? p.precarga || '' : '')) + '</textarea></label>' +
            '<div class="peq">' + (r.foto ? '<a href="' + esc(r.foto) + '" target="_blank" rel="noopener">Ver foto</a> · ' : '') + '<label class="link" style="cursor:pointer">' + (r.foto ? 'Cambiar foto' : '+ Agregar foto') + '<input type="file" accept="image/*" capture="environment" class="au-foto" data-i="' + i + '" hidden></label></div></div>' : '') + '</article>'; })()).join('') +
      '<div style="position:sticky;bottom:0;background:rgba(244,247,248,.96);border-top:1px solid var(--ln);padding:10px 0;display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap;align-items:center"><span class="mu peq" id="auSucio">' + (Object.keys(AU.cambios).length ? 'Hay respuestas sin guardar.' : '') + '</span>' +
        '<button class="btn sec" id="auGuardar">Guardar</button><button class="btn pri" id="auCerrar">Terminar y ver resultado</button></div></section></div>');
  const fija = (i, cambio) => { const p = P[i], k = p.codigo + '|' + p.lugar; AU.cambios[k] = Object.assign({ codigo: p.codigo, lugar: p.lugar }, p.r || {}, AU.cambios[k] || {}, cambio); };
  document.querySelectorAll('[data-eje]').forEach(b => b.onclick = () => { AU.eje = b.dataset.eje; audPintar(); window.scrollTo(0, 0); });
  document.querySelectorAll('.au-op').forEach(b => b.onclick = () => { const y = window.scrollY, i = +b.dataset.i, p = P[i], r = resp(p), c = { respuesta: b.dataset.r };
    if (p.soloObs && b.dataset.r === 'Obs' && !r.nota) { const t = document.querySelector('.au-nota[data-i="' + i + '"]'); c.nota = t ? t.value : (p.precarga || ''); }
    fija(i, c); audPintar(); window.scrollTo(0, y); });
  document.querySelectorAll('.au-nota').forEach(t => t.onchange = () => { fija(+t.dataset.i, { nota: t.value }); $('auSucio').textContent = 'Hay respuestas sin guardar.'; });
  document.querySelectorAll('.au-foto').forEach(inp => inp.onchange = async () => {
    const f = inp.files[0]; if (!f) return; const i = +inp.dataset.i; toast('Subiendo la foto…');
    try { const data = await achicar(f), r = await api('p_aud_foto', { id: AU.A.auditoria.ID_AUD, codigo: P[i].codigo, base64: data }, 120000);
      if (!r.ok) return toast(r.mensaje); const y = window.scrollY; fija(i, { foto: r.url }); audPintar(); window.scrollTo(0, y); toast('Foto agregada: guardá las respuestas.'); } catch (e) { toast('No se pudo subir la foto.'); }
  });
  const guardar = async () => {
    const L = Object.values(AU.cambios).filter(c => c.respuesta).map(c => ({ codigo: c.codigo, lugar: c.lugar, respuesta: c.respuesta, nota: c.nota || '', foto: c.foto || '' }));
    if (!L.length) return true;
    const r = await api('p_aud_responder', { id: AU.A.auditoria.ID_AUD, respuestas: L }, 120000);
    if (!r.ok) { toast(r.mensaje); return false; }
    if (r.faltaEvidencia && r.faltaEvidencia.length) { toast('Faltan nota o foto en: ' + r.faltaEvidencia.join(', ')); return false; }
    AU.cambios = {}; return true;
  };
  $('auGuardar').onclick = async () => { $('auGuardar').disabled = true; try { if (await guardar()) { toast('Respuestas guardadas.'); audEjecutar(AU.A.auditoria.ID_AUD); } } catch (e) {} $('auGuardar').disabled = false; };
  $('auCerrar').onclick = async () => {
    const falt = P.filter(p => !resp(p).respuesta).length;
    if (falt && !confirm('Quedan ' + falt + ' puntos sin responder. ¿Terminar igual? Los que falten no cuentan en el resultado.')) return;
    $('auCerrar').disabled = true; $('auCerrar').textContent = 'Calculando…';
    try { if (!(await guardar())) { $('auCerrar').disabled = false; $('auCerrar').textContent = 'Terminar y ver resultado'; return; }
      const r = await api('p_aud_cerrar', { id: AU.A.auditoria.ID_AUD }, 120000); if (!r.ok) { toast(r.mensaje); $('auCerrar').disabled = false; return; }
      location.hash = '#audr/' + encodeURIComponent(AU.A.auditoria.ID_AUD); } catch (e) { $('auCerrar').disabled = false; }
  };
}
async function audResultado(id) {
  cargando('#aud', 'Calculando el resultado…');
  let R; try { R = await api('p_aud_resultado', { id: id }); } catch (e) { return; }
  if (!R.ok) return toast(R.mensaje);
  const A = R.auditoria, H = R.hallazgos, clases = ['No conformidad mayor', 'No conformidad menor', 'Observación', 'Oportunidad de mejora'];
  const colorClase = c => /mayor/.test(c) ? 'er' : /menor/.test(c) ? 'wa' : /bservaci/.test(c) ? 'pa' : 'gr';
  marco('#aud', '<div class="cab"><div><a class="link peq" href="#aud">‹ Auditorías</a><h1>Resultado · ' + esc(A.TIPO) + ' · ' + esc(A.ESTABLECIMIENTO) + '</h1><span class="mu">' + esc(A.ID_AUD) + ' · ' + fechaTxt(A.FECHA) + ' · ' + esc(A.ORIGEN) + (R.anterior ? ' · comparada con ' + esc(R.anterior) : '') + '</span></div>' +
    '<div style="display:flex;gap:8px;flex-wrap:wrap"><a class="btn sec" href="#aud/' + encodeURIComponent(A.ID_AUD) + '">Ver respuestas</a>' + (A.ESTADO === 'Para verificar' ? '<button class="btn pri" id="arVerif">Verificar (HyS)</button>' : '') + '<button class="btn pri" id="arPlan">Pasar al plan de acción</button></div></div>' +
    '<div class="tb5"><div class="kpi2"><span>Resultado</span><b style="font-size:20px">' + esc(A.RESULTADO || '—') + '</b><small class="mu">' + audChip(A.ESTADO) + '</small></div><div class="kpi2"><span>Cumplimiento</span><b>' + esc(A.CUMPLIMIENTO || '—') + '</b><small class="mu">' + (A.CRITICOS_OK ? 'críticos cumplidos: ' + esc(A.CRITICOS_OK) : 'conformes sobre los que aplican') + (A.CATEGORIA ? ' · cat. ' + esc(String(A.CATEGORIA).split(' ')[0]) : '') + '</small></div>' +
      '<div class="kpi2"><span>No conformidades</span><b' + (+A.NC_MAYOR ? ' style="color:#9B2C22"' : '') + '>' + ((+A.NC_MAYOR || 0) + (+A.NC_MENOR || 0)) + '</b><small class="mu">' + (A.NC_MAYOR || 0) + ' mayores · ' + (A.NC_MENOR || 0) + ' menores</small></div><div class="kpi2"><span>Observaciones</span><b>' + (A.OBSERVACIONES_N || 0) + '</b><small class="mu">' + (A.MEJORAS_N || 0) + ' oportunidades de mejora</small></div></div>' +
    '<section class="card" style="display:flex;flex-direction:column;gap:8px"><h2>Cumplimiento por eje</h2>' + R.ejes.map(e => '<div style="display:grid;grid-template-columns:minmax(160px,240px) minmax(0,1fr) 60px;gap:12px;align-items:center" class="peq"><span>' + esc(e.eje) + '</span>' +
      '<div style="position:relative;height:12px;background:var(--gr);border-radius:999px"><div style="position:absolute;left:0;top:0;height:12px;width:' + e.pct + '%;background:' + (e.pct < 70 ? '#B45309' : 'var(--az)') + ';border-radius:999px"></div>' + (e.anterior != null ? '<div title="Anterior: ' + e.anterior + ' %" style="position:absolute;top:-3px;left:calc(' + e.anterior + '% - 1px);width:2px;height:18px;background:var(--pa)"></div>' : '') + '</div><b style="text-align:right">' + e.pct + ' %</b></div>').join('') +
      '<span class="mu peq">' + (R.anterior ? 'La marca celeste es la auditoría anterior del mismo tipo.' : 'Es la primera auditoría de este tipo: no hay comparación.') + '</span></section>' +
    '<section class="card" style="padding:0"><div style="padding:14px 18px;display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;align-items:center"><h2>Hallazgos</h2><button class="btn sec" id="arNuevo">+ Oportunidad de mejora</button></div>' +
      (H.length ? H.map((h, i) => '<div class="ar-h" data-i="' + i + '" style="border-top:1px solid #EEF2F4;padding:14px 18px;display:grid;grid-template-columns:minmax(240px,1.4fr) minmax(220px,1fr) minmax(200px,1fr);gap:12px">' +
        '<div><div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center"><b>' + esc(h.ID_HALLAZGO) + '</b><span class="chip ' + colorClase(h.CLASIFICACION) + '">' + esc(h.CLASIFICACION) + '</span><span class="chip gr">' + esc(h.ESTADO) + '</span></div>' +
          '<div style="margin-top:6px">' + esc(h.DESCRIPCION) + '</div><div class="mu peq">' + esc(h.LUGAR) + (h.CRITERIO ? ' · ' + esc(h.CRITERIO) : '') + (/^https?:/.test(h.EVIDENCIA) ? ' · <a href="' + esc(h.EVIDENCIA) + '" target="_blank" rel="noopener">evidencia</a>' : '') + '</div></div>' +
        '<div style="display:flex;flex-direction:column;gap:6px"><label class="f">Clasificación<select class="c ar-cl">' + clases.map(c => '<option' + (c === h.CLASIFICACION ? ' selected' : '') + '>' + c + '</option>').join('') + '</select></label><label class="f">Acción propuesta<textarea class="c ar-ac">' + esc(h.ACCION) + '</textarea></label></div>' +
        '<div style="display:flex;flex-direction:column;gap:6px"><label class="f">Responsable<input class="c ar-re" value="' + esc(h.RESPONSABLE) + '"></label><label class="f">Plazo<input class="c ar-pl" value="' + esc(h.PLAZO) + '"></label>' + (h.EN_PLAN === 'Sí' ? '<span class="mu peq">Ya está en el plan de acción.</span>' : '') + '</div></div>').join('')
        : '<div class="vacio">Sin hallazgos: todos los puntos que aplican resultaron conformes.</div>') + '</section>' +
    (H.length ? '<div style="position:sticky;bottom:0;background:rgba(244,247,248,.96);border-top:1px solid var(--ln);padding:10px 0;display:flex;justify-content:flex-end"><button class="btn pri" id="arGuardar">Guardar hallazgos</button></div>' : '') +
    '<section class="card peq mu">Un «No conforme» en un punto crítico es no conformidad mayor (acción en 30 días); en un punto no crítico, menor (90 días). Solo pasan al plan los hallazgos con acción definida; los de auditorías internas, después de la verificación de HyS.</section>');
  const guardarH = async () => { for (const el of document.querySelectorAll('.ar-h')) { const h = H[+el.dataset.i];
      const d = { ID_HALLAZGO: h.ID_HALLAZGO, CLASIFICACION: el.querySelector('.ar-cl').value, ACCION: el.querySelector('.ar-ac').value, RESPONSABLE: el.querySelector('.ar-re').value, PLAZO: el.querySelector('.ar-pl').value };
      if (d.CLASIFICACION !== h.CLASIFICACION || d.ACCION !== h.ACCION || d.RESPONSABLE !== h.RESPONSABLE || d.PLAZO !== h.PLAZO) { const r = await api('p_aud_hallazgo_guardar', { datos: d }); if (!r.ok) { toast(r.mensaje); return false; } } } return true; };
  if ($('arGuardar')) $('arGuardar').onclick = async () => { $('arGuardar').disabled = true; try { if (await guardarH()) { toast('Hallazgos guardados.'); audResultado(id); } } catch (e) {} $('arGuardar').disabled = false; };
  $('arNuevo').onclick = () => modal('Oportunidad de mejora', [['DESCRIPCION', 'Qué se puede mejorar', null, 1], ['LUGAR', 'Lugar'], ['ACCION', 'Acción propuesta', null, 1], ['RESPONSABLE', 'Responsable'], ['PLAZO', 'Plazo']], {}, async v => {
    const r = await api('p_aud_hallazgo_guardar', { id: id, datos: Object.assign({ CLASIFICACION: 'Oportunidad de mejora' }, v) }); if (!r.ok) return r.mensaje || 'No se pudo guardar.'; toast('Agregada.'); audResultado(id); return ''; });
  $('arPlan').onclick = async () => { try { if (H.length && !(await guardarH())) return; const r = await api('p_aud_al_plan', { id: id }); if (!r.ok) return toast(r.mensaje); toast(r.pasados ? r.pasados + ' hallazgo(s) pasados al plan de acción.' : (r.mensaje || 'Nada para pasar.')); if (r.pasados) location.hash = '#plan/' + encodeURIComponent(id); } catch (e) {} };
  if ($('arVerif')) $('arVerif').onclick = async () => { if (!confirm('¿Revisaste las respuestas y la evidencia del referente? Sus hallazgos pasan a «Propuesto».')) return; try { const r = await api('p_aud_verificar', { id: id }); if (!r.ok) return toast(r.mensaje); toast('Auditoría verificada.'); audResultado(id); } catch (e) {} };
}
