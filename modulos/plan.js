// Portal HyS · Plan de acción
// Se carga desde portal.html (<script src>). Para el portal de respaldo de Google, herramientas/armar_respaldo.py lo junta en un solo archivo.
// ------------------------------------------------------------------ Plan de acción (respuesta de la Dirección y seguimiento)
const PL_CHIP = { 'Cumplida': 'ok', 'En curso': 'pa', 'Pendiente': 'gr', 'Vencida': 'er', 'Sin respuesta': 'wa', 'Sin enviar': 'gr', 'Descartada': 'gr' };
const plChip = e => '<span class="chip ' + (PL_CHIP[e] || 'gr') + '">' + esc(e) + '</span>';
const plF = f => f ? String(f).slice(0, 10).split('-').reverse().join('/') : '—';
async function planLista() {
  cargando('#plan', 'Leyendo los planes de acción…');
  let R; try { R = await api('p_plan_listar', {}); } catch (e) { return; }
  const L = R.informes || [];
  marco('#plan', '<div class="cab"><div><span class="mu peq">Residuos · Agua · Plagas</span><h1>Plan de acción</h1><span class="mu">Un plan por informe emitido (diagnósticos y auditorías de residuos, diagnósticos de agua y de plagas). Cargá la fecha de envío, la respuesta de la Dirección y el avance de cada recomendación.</span></div></div>' +
    '<section class="card tabla">' + (L.length ? '<table><thead><tr><th>Establecimiento</th><th>Informe</th><th>Enviado</th><th>Recom.</th><th>Cumplidas</th><th>En curso</th><th>Vencidas</th><th>Sin respuesta</th><th></th></tr></thead><tbody>' +
      L.map(i => '<tr><td><b>' + esc(i.nombre) + '</b></td><td class="peq">' + esc(i.codigo) + '</td><td>' + (i.enviado ? plF(i.enviado) : '<span class="chip gr">Sin enviar</span>') + '</td><td>' + i.total + '</td><td>' + (i.c['Cumplida'] || 0) + '</td><td>' + (i.c['En curso'] || 0) + '</td><td>' + (i.c['Vencida'] ? '<b style="color:#9B2C22">' + i.c['Vencida'] + '</b>' : 0) + '</td><td>' + (i.c['Sin respuesta'] || 0) + '</td><td><a class="link" href="#plan/' + encodeURIComponent(i.codigo) + '">Abrir</a></td></tr>').join('') + '</tbody></table>'
      : '<div class="vacio">Todavía no hay informes emitidos. El plan se crea solo al generar el informe de un diagnóstico cerrado.</div>') + '</section>');
}
let PL = null;
async function planDetalle(codigo) {
  cargando('#plan', 'Abriendo el plan…');
  let R; try { R = await api('p_plan_abrir', { codigo: codigo }); } catch (e) { return; }
  if (!R.ok) return toast(R.mensaje);
  PL = R; planPintar();
}
function planPintar() {
  const R = PL, F = R.filas, c = {}; F.forEach(o => c[o.EFECTIVO] = (c[o.EFECTIVO] || 0) + 1);
  const kpi = (t, v, s, col) => '<div class="kpi2"><span>' + t + '</span><b' + (col ? ' style="color:' + col + '"' : '') + '>' + v + '</b><small>' + s + '</small></div>';
  const env = R.enviado ? 'Enviado el ' + plF(R.enviado) + ' · respuesta hasta el ' + plF(R.limiteRespuesta) : 'Todavía no se marcó como enviado';
  marco('#plan', '<div class="cab"><div><a class="link peq" href="#plan">‹ Todos los planes</a><h1>' + esc(R.nombre) + '</h1><span class="mu">Informe ' + esc(R.codigo) + ' · ' + env + '</span></div>' +
    '<div style="display:flex;gap:8px;flex-wrap:wrap">' + (R.doc ? '<a class="btn" href="' + esc(R.doc) + '" target="_blank" rel="noopener">Documento</a>' : '') + (R.pdf ? '<a class="btn" href="' + esc(R.pdf) + '" target="_blank" rel="noopener">PDF</a>' : '') + '<button class="btn" id="plCorreo">Copiar correo</button></div></div>' +
    '<div class="tb5">' + kpi('Recomendaciones', F.length, (F.filter(o => o.PRIORIDAD === 'Actuar ya').length) + ' actuar ya') + kpi('Cumplidas', c['Cumplida'] || 0, 'con evidencia') + kpi('En curso', c['En curso'] || 0, 'dentro del plazo') +
      kpi('Vencidas', c['Vencida'] || 0, 'pasan a la nota trimestral', c['Vencida'] ? '#9B2C22' : '') + kpi('Sin respuesta', (c['Sin respuesta'] || 0) + (c['Sin enviar'] || 0), R.enviado ? 'día ' + R.diasRespuesta + ' de ' + R.plazoRespuesta : 'falta marcar el envío') + '</div>' +
    '<section class="card" style="display:flex;gap:12px;align-items:flex-end;flex-wrap:wrap"><label class="f">Fecha de envío a la Dirección<input class="c" type="date" id="plEnvio" value="' + esc(R.enviado || '') + '"></label><button class="btn" id="plEnviar">' + (R.enviado ? 'Cambiar fecha de envío' : 'Marcar como enviado') + '</button>' +
      '<label class="f">Fecha de la respuesta de la Dirección<input class="c" type="date" id="plResp"></label><span class="mu peq" style="max-width:420px">La fecha de envío fija los plazos técnicos. Al cargar un responsable o una fecha prevista, se registra la respuesta.</span></section>' +
    '<style>.plr{display:grid;grid-template-columns:minmax(220px,1.6fr) minmax(200px,1fr) minmax(200px,1fr);gap:14px;padding:14px 18px;border-top:1px solid #EEF2F4}.plr:first-child{border-top:0}.plr .c{width:100%;box-sizing:border-box}.plr label{display:block;font-size:12px;color:var(--mu);font-weight:600;margin:0 0 3px}.plr .blq{display:flex;flex-direction:column;gap:8px}@media(max-width:900px){.plr{grid-template-columns:1fr}}</style>' +
    '<div class="filtros" style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><span class="mu peq" style="font-weight:700">Mostrar:</span>' +
      [['', 'Todas'], ['Actuar ya', 'Actuar ya'], ['Vencida', 'Vencidas'], ['Sin respuesta', 'Sin respuesta'], ['Pendiente', 'Pendientes'], ['En curso', 'En curso'], ['Cumplida', 'Cumplidas']].map(([v, t]) => { const n = v === '' ? F.length : F.filter(o => o.EFECTIVO === v || o.PRIORIDAD === v || (v === 'Sin respuesta' && o.EFECTIVO === 'Sin enviar')).length; return '<button class="btn ' + ((PL.filtro || '') === v ? 'pri' : 'sec') + '" data-plf="' + esc(v) + '"' + (n || v === '' ? '' : ' disabled') + '>' + t + ' (' + n + ')</button>'; }).join('') + '</div>' +
    '<section class="card" style="padding:0">' + F.map((o, i) => '<div class="plr" data-n="' + esc(o.N_REC) + '"' + (PL.filtro && !(o.EFECTIVO === PL.filtro || o.PRIORIDAD === PL.filtro || (PL.filtro === 'Sin respuesta' && o.EFECTIVO === 'Sin enviar')) ? ' hidden' : '') + '>' +
      '<div><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><b>' + esc(o.N_REC) + '</b>' + plChip(o.EFECTIVO) + '<span class="chip gr">' + esc(o.PRIORIDAD) + '</span></div>' +
        '<div style="margin-top:6px">' + esc(o.RECOMENDACION) + '</div>' +
        '<div class="mu peq" style="margin-top:4px">' + (o.LUGAR && o.LUGAR !== 'Establecimiento' ? esc(o.LUGAR) + ' · ' : '') + esc(o.A_CARGO) + ' · ' + esc(o.COSTO) + '</div>' +
        '<div class="mu peq">Plazo técnico: ' + esc(o.PLAZO_TECNICO) + (o.FECHA_LIMITE ? ' (hasta ' + plF(o.FECHA_LIMITE) + ')' : '') + '</div></div>' +
      '<div class="blq"><div><label>Responsable (Dirección)</label><input class="c pl-resp" value="' + esc(o.RESPONSABLE_DIRECCION) + '" placeholder="Nombre y función"></div>' +
        '<div><label>Fecha prevista</label><input class="c pl-fecha" type="date" value="' + esc(o.FECHA_PREVISTA) + '"></div></div>' +
      '<div class="blq"><div><label>Estado</label><select class="c pl-est">' + ['Pendiente', 'En curso', 'Cumplida', 'Descartada'].map(e => '<option' + ((o.ESTADO || 'Pendiente') === e ? ' selected' : '') + '>' + e + '</option>').join('') + '</select></div>' +
        '<div><label>Evidencia</label><input type="hidden" class="pl-ev" value="' + esc(o.EVIDENCIA) + '"><div class="peq">' + (o.EVIDENCIA ? o.EVIDENCIA.split(' | ').map((u, j) => '<a href="' + esc(u) + '" target="_blank" rel="noopener">Ver ' + (j + 1) + '</a>').join(' · ') + ' · ' : '') +
          '<label class="link" style="cursor:pointer;display:inline;font-size:13px;color:var(--az)">+ Subir foto o PDF<input type="file" accept="image/*,application/pdf" class="pl-sub" data-i="' + i + '" hidden></label> · <button class="link pl-link" data-i="' + i + '">+ Pegar enlace</button></div></div>' +
        '<div><label>Observaciones</label><input class="c pl-obs" value="' + esc(o.OBSERVACIONES) + '" placeholder="Motivo, avances…"></div></div>' +
    '</div>').join('') + '</section>' +
    '<div style="position:sticky;bottom:0;z-index:5;background:rgba(242,245,246,.96);border-top:1px solid var(--ln);padding:10px 0;display:flex;gap:10px;justify-content:flex-end;align-items:center"><span class="mu peq" id="plSucio"></span><button class="btn sec" id="plArriba">↑ Arriba</button><button class="btn pri" id="plGuardar">Guardar cambios</button></div>' +
    '<section class="card peq mu">«Vencida» y «Sin respuesta» se marcan solas. Cumplida solo con evidencia (foto, documento o remito); descartada con motivo. Las vencidas de «Actuar ya» se incluyen en la nota trimestral a la Secretaría.</section>');
  document.querySelectorAll('[data-plf]').forEach(b => b.onclick = () => { const v = PL.filtro = b.dataset.plf;
    document.querySelectorAll('[data-plf]').forEach(x => x.className = 'btn ' + (x.dataset.plf === v ? 'pri' : 'sec'));
    document.querySelectorAll('#main .plr[data-n]').forEach((row, i) => { const o = F[i]; row.hidden = !!v && !(o.EFECTIVO === v || o.PRIORIDAD === v || (v === 'Sin respuesta' && o.EFECTIVO === 'Sin enviar')); }); });
  $('plArriba').onclick = () => window.scrollTo({ top: 0, behavior: 'smooth' });
  document.querySelectorAll('.pl-resp,.pl-fecha,.pl-est,.pl-obs').forEach(el => el.addEventListener('change', () => { $('plSucio').textContent = 'Hay cambios sin guardar.'; }));
  $('plCorreo').onclick = async () => { try { const r = await api('p_informe_correo', { cod: R.cod, id: R.id }); if (!r.ok) return toast(r.mensaje); copiarCorreo(r.correo); } catch (e) {} };
  $('plEnviar').onclick = async () => { const f = $('plEnvio').value; if (!f) return toast('Elegí la fecha de envío.'); try { const r = await api('p_plan_enviado', { codigo: R.codigo, fecha: f }); if (!r.ok) return toast(r.mensaje); toast('Fecha de envío guardada.'); planDetalle(R.codigo); } catch (e) {} };
  const filaEv = i => document.querySelectorAll('#main .plr[data-n]')[i].querySelector('.pl-ev');
  document.querySelectorAll('.pl-link').forEach(b => b.onclick = () => { const u = prompt('Pegá el enlace de la evidencia (Drive, correo, etc.):'); if (!u) return; const h = filaEv(+b.dataset.i); h.value = h.value ? h.value + ' | ' + u.trim() : u.trim(); toast('Enlace agregado: guardá los cambios.'); });
  document.querySelectorAll('.pl-sub').forEach(inp => inp.onchange = async () => {
    const file = inp.files[0]; if (!file) return; const i = +inp.dataset.i, n = F[i].N_REC;
    toast('Subiendo evidencia…');
    try { const data = /pdf/.test(file.type) ? await new Promise((ok, mal) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = mal; r.readAsDataURL(file); }) : await achicar(file);
      const r = await api('p_plan_evidencia', { cod: R.cod, codigo: R.codigo, n: n, dataUrl: data }, 120000); if (!r.ok) return toast(r.mensaje);
      const h = filaEv(i); h.value = h.value ? h.value + ' | ' + r.url : r.url; toast('Evidencia subida: guardá los cambios.'); } catch (e) { toast('No se pudo subir el archivo.'); }
  });
  $('plGuardar').onclick = async () => {
    const filas = [...document.querySelectorAll('#main .plr[data-n]')].map(tr => ({ n: tr.dataset.n, responsable: tr.querySelector('.pl-resp').value, fechaPrevista: tr.querySelector('.pl-fecha').value, estado: tr.querySelector('.pl-est').value, evidencia: tr.querySelector('.pl-ev').value, obs: tr.querySelector('.pl-obs').value }));
    const b = $('plGuardar'); b.disabled = true; b.textContent = 'Guardando…';
    try { const r = await api('p_plan_guardar', { codigo: R.codigo, filas: filas, fechaRespuesta: $('plResp').value }); b.disabled = false; b.textContent = 'Guardar cambios';
      if (!r.ok) return toast(r.mensaje); toast('Plan de acción guardado.'); planDetalle(R.codigo); } catch (e) { b.disabled = false; b.textContent = 'Guardar cambios'; }
  };
}
